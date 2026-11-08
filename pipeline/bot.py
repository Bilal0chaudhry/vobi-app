import asyncio
import os
import re
import subprocess
import sys
import time
import socket
import ctypes

# Prefer IPv4 when dual-stack DNS returns unreachable IPv6 (AAAA) records first
_orig_getaddrinfo = socket.getaddrinfo


def _ipv4_first_getaddrinfo(*args, **kwargs):
    res = _orig_getaddrinfo(*args, **kwargs)
    v4 = [r for r in res if r[0] == socket.AF_INET]
    return v4 if v4 else res


socket.getaddrinfo = _ipv4_first_getaddrinfo

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

# Suppress ALSA/Jack noise before any audio imports (keep reference so GC doesn't free C callback)
try:
    asound = ctypes.cdll.LoadLibrary("libasound.so.2")
    _err_handler_t = ctypes.CFUNCTYPE(None, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p)
    _alsa_err_handler = _err_handler_t(lambda *_: None)
    asound.snd_lib_error_set_handler(_alsa_err_handler)
except OSError:
    pass

os.environ["JACK_NO_START_SERVER"] = "1"

import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from pipecat.audio.turn.smart_turn.base_smart_turn import SmartTurnParams
from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineWorker
from pipecat.workers.runner import WorkerRunner
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import Frame, StartFrame, TranscriptionFrame, InterimTranscriptionFrame, TextFrame, EndFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair, LLMUserAggregatorParams
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.fish.tts import FishAudioTTSService
from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams
from pipecat.turns.user_stop import TurnAnalyzerUserTurnStopStrategy
from pipecat.turns.user_turn_strategies import UserTurnStrategies

from prompts import VOBI_SYSTEM_PROMPT
from services.ledger import BenefitLedger
from services.extractor import update_ledger_from_turns

FISH_VOICE_ID = os.getenv("FISH_AUDIO_VOICE_ID", "")
VOICE_MODEL = os.getenv("VOICE_MODEL", "gpt-5.4-mini")
MAX_CALL_DURATION_SECS = int(os.getenv("MAX_CALL_DURATION_SECS", "900"))
MAX_HOLD_SECS = int(os.getenv("MAX_HOLD_SECS", "180"))

_END_CALL_RE = re.compile(r"\[\s*END\s*_?\s*CALL\s*\]", re.IGNORECASE)
_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def speak_id(s: str | None) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", s or "")
    if not cleaned:
        return "not provided"
    return ", ".join(" ".join(cleaned[i:i + 3]) for i in range(0, len(cleaned), 3))


def speak_phone(p: str | None) -> str:
    d = "".join(c for c in (p or "") if c.isdigit())
    if len(d) == 10:
        return f"{' '.join(d[:3])}, {' '.join(d[3:6])}, {' '.join(d[6:])}"
    if not d:
        return "not provided"
    return speak_id(d)


def speak_date(d: str | None, fallback: str = "not provided") -> str:
    if not d or not d.strip():
        return fallback
    try:
        parts = d.strip().split("-")
        if len(parts) == 3:
            year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
            suffix = "th" if 11 <= (day % 100) <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
            return f"{_MONTHS[month - 1]} {day}{suffix}, {year}"
    except Exception:
        pass
    return d.strip()


def speak_dx(dx: str | None) -> str:
    if not dx or not dx.strip():
        return "not provided"
    cleaned = dx.strip().upper()
    parts = cleaned.split(".")
    if len(parts) == 2:
        return f"{' '.join(parts[0])} point {' '.join(parts[1])}"
    return " ".join(cleaned)


def speak_cpt_codes(codes: list[str] | None) -> str:
    if not codes:
        return "none provided"
    return ", ".join(" ".join(c.strip().upper()) for c in codes if c and c.strip())


class EventLoggerProcessor(FrameProcessor):
    def __init__(
        self,
        event_queue,
        source_type: str,
        activity_ref: list[float] | None = None,
        shared_turns: list[dict[str, str]] | None = None,
        ledger: BenefitLedger | None = None,
        ready_event: asyncio.Event | None = None,
    ):
        super().__init__()
        self.event_queue = event_queue
        self.source_type = source_type
        self.activity_ref = activity_ref
        self.shared_turns = shared_turns
        self.ledger = ledger
        self.ready_event = ready_event
        self._tag_buf = ""

    def _append_turn_text(self, source: str, text: str):
        if self.shared_turns is None or not text:
            return
        if self.shared_turns and self.shared_turns[-1]["source"] == source:
            if source == "REP":
                self.shared_turns[-1]["message"] = f"{self.shared_turns[-1]['message']} {text.strip()}".strip()
            else:
                self.shared_turns[-1]["message"] += text
        else:
            self.shared_turns.append({"source": source, "message": text.strip() if source == "REP" else text})

    async def _extract_ledger_bg(self):
        if self.ledger is None or not self.shared_turns:
            return
        summary_dict = await update_ledger_from_turns(
            self.ledger,
            list(self.shared_turns[-10:]),
            is_final=False,
        )
        if self.event_queue is not None:
            await self.event_queue.put({
                "type": "ledger",
                "source": "SYSTEM",
                "message": "",
                "summary": summary_dict,
                "checklist": self.ledger.to_checklist(),
            })

    async def _emit_vobi_text(self, text: str, direction: FrameDirection):
        had_end_call = bool(_END_CALL_RE.search(text))
        if had_end_call:
            text = _END_CALL_RE.sub("", text)
            if self.event_queue is not None:
                await self.event_queue.put({"type": "control", "message": "end_pending"})

        # Preserve standalone whitespace tokens from the LLM (e.g. " " before digits)
        # while suppressing empty strings left behind after stripping [END_CALL].
        if text and (not had_end_call or text.strip()):
            self._append_turn_text("VOBI", text)
            if self.event_queue is not None:
                await self.event_queue.put({
                    "type": "ai",
                    "source": "VOBI",
                    "message": text,
                })
            await self.push_frame(TextFrame(text=text), direction)

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, StartFrame) and self.ready_event is not None:
            self.ready_event.set()

        if self.source_type == "REP":
            if isinstance(frame, TranscriptionFrame) and frame.text.strip():
                if self.activity_ref is not None:
                    self.activity_ref[0] = time.monotonic()
                self._append_turn_text("REP", frame.text)
                if self.event_queue is not None:
                    await self.event_queue.put({
                        "type": "rep",
                        "source": "REP",
                        "message": frame.text,
                        "interim": False,
                    })
                if self.ledger is not None:
                    asyncio.create_task(self._extract_ledger_bg())
            elif isinstance(frame, InterimTranscriptionFrame) and frame.text.strip():
                if self.activity_ref is not None:
                    self.activity_ref[0] = time.monotonic()
                if self.event_queue is not None:
                    await self.event_queue.put({
                        "type": "rep",
                        "source": "REP",
                        "message": frame.text,
                        "interim": True,
                    })
            await self.push_frame(frame, direction)
            return

        if (
            self.source_type == "VOBI"
            and isinstance(frame, TextFrame)
            and not isinstance(frame, (TranscriptionFrame, InterimTranscriptionFrame))
        ):
            if self.activity_ref is not None:
                self.activity_ref[0] = time.monotonic()
            chunk = frame.text
            # Buffer bracketed control tags (e.g. [END_CALL] split across streamed tokens)
            # so Fish Audio TTS never speaks "[END_CALL]" out loud.
            if self._tag_buf or "[" in chunk:
                self._tag_buf += chunk
                if "[" in self._tag_buf and "]" not in self._tag_buf and len(self._tag_buf) < 24:
                    before, bracket_tail = self._tag_buf.split("[", 1)
                    if before:
                        await self._emit_vobi_text(before, direction)
                    self._tag_buf = "[" + bracket_tail
                    return
                buf = self._tag_buf
                self._tag_buf = ""
                await self._emit_vobi_text(buf, direction)
                return

            await self._emit_vobi_text(chunk, direction)
            return

        if self._tag_buf and isinstance(frame, EndFrame):
            buf = self._tag_buf
            self._tag_buf = ""
            await self._emit_vobi_text(buf, direction)

        await self.push_frame(frame, direction)


def build_prompt_values(patient_data: dict | None) -> dict[str, str]:
    d = patient_data or {}
    practice_name = (d.get("providerOrgName") or "").strip() or "our provider"
    provider_name = (d.get("providerName") or "").strip() or practice_name
    return {
        "practice_name": practice_name,
        "provider_name": provider_name,
        "patient_first_name": (d.get("patientFirstName") or "").strip() or "the patient",
        "patient_last_name": (d.get("patientLastName") or "").strip(),
        "dob_spoken": speak_date(d.get("dob"), fallback="not provided"),
        "member_id_spoken": speak_id(d.get("memberId")),
        "npi_spoken": speak_id(d.get("npi")),
        "tin_spoken": speak_id(d.get("taxId")),
        "callback_spoken": speak_phone(d.get("callbackNumber")),
        "dos_spoken": speak_date(d.get("dos"), fallback="not yet scheduled"),
        "dx_code_spoken": speak_dx(d.get("dxCode")),
        "cpt_codes": speak_cpt_codes(d.get("cptCodes")),
    }


def build_system_prompt(patient_data: dict | None) -> str:
    return VOBI_SYSTEM_PROMPT.format(**build_prompt_values(patient_data))


def _ensure_valid_pipewire_mic() -> None:
    """Ensure PipeWire has an active microphone source selected.

    When a Bluetooth headset (e.g. WiWU Ai305) is in A2DP output-only profile,
    PipeWire's configured default Audio/Source can point to an inactive bluez_input
    node, causing ALSA/PyAudio to attach its capture stream to the headphone
    speaker monitor (monitor_FL/FR = silence) instead of the hardware microphone.
    """
    try:
        out = subprocess.run(
            ["wpctl", "status"],
            capture_output=True,
            text=True,
            timeout=1.5,
            check=False,
        ).stdout
        in_audio = False
        in_sources = False
        has_default = False
        first_source_id = None
        for line in out.splitlines():
            if line.startswith("Audio"):
                in_audio = True
                continue
            if line.startswith(("Video", "Settings")):
                break
            if not in_audio:
                continue
            if "Sources:" in line:
                in_sources = True
                continue
            if in_sources:
                if any(h in line for h in ("├─", "└─")):
                    break
                m = re.search(r"(\*)?\s*(\d+)\.\s+(.+)", line)
                if m:
                    if m.group(1) == "*":
                        has_default = True
                    if first_source_id is None:
                        first_source_id = m.group(2)
        if not has_default and first_source_id is not None:
            subprocess.run(
                ["wpctl", "set-default", first_source_id],
                capture_output=True,
                timeout=1.5,
                check=False,
            )
    except Exception:
        pass


async def start_bot(
    patient_data: dict = None,
    event_queue=None,
    stop_event: asyncio.Event = None,
    ledger: BenefitLedger = None,
    shared_turns: list[dict[str, str]] = None,
    ready_event: asyncio.Event = None,
):
    if ledger is None:
        ledger = BenefitLedger.from_patient_data(patient_data or {})
    if shared_turns is None:
        shared_turns = []

    _ensure_valid_pipewire_mic()

    transport = LocalAudioTransport(
        LocalAudioTransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(confidence=0.7, start_secs=0.2, stop_secs=0.2)
            ),
            vad_audio_passthrough=True,
        )
    )

    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        settings=DeepgramSTTService.Settings(
            model="nova-3",
            interim_results=True,
            smart_format=False,
            numerals=True,
            punctuate=True,
        ),
    )

    llm_extra = {"reasoning_effort": "none"} if VOICE_MODEL.startswith(("gpt-5", "gpt-6")) else {}
    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        settings=OpenAILLMService.Settings(
            model=VOICE_MODEL,
            system_instruction=build_system_prompt(patient_data),
            temperature=0.3,
            extra=llm_extra,
        ),
    )

    tts = FishAudioTTSService(
        api_key=os.getenv("FISH_AUDIO_API_KEY"),
        settings=FishAudioTTSService.Settings(
            model="s2.1-pro-free",
            voice=FISH_VOICE_ID if FISH_VOICE_ID else None,
        ),
    )

    context = LLMContext()
    # SmartTurnParams(stop_secs=1.0) overrides Pipecat's 3.0s fallback silence wait
    # when the ONNX turn model is uncertain on 1-word answers ("Yes", "HMO", "No"),
    # while still giving a 1s pause window if the rep pauses mid-sentence to read numbers.
    context_aggregator = LLMContextAggregatorPair(
        context=context,
        user_params=LLMUserAggregatorParams(
            user_turn_strategies=UserTurnStrategies(
                stop=[
                    TurnAnalyzerUserTurnStopStrategy(
                        turn_analyzer=LocalSmartTurnAnalyzerV3(
                            params=SmartTurnParams(stop_secs=1.0)
                        )
                    )
                ]
            )
        ),
    )

    activity_ref = [time.monotonic()]

    pipeline = Pipeline([
        transport.input(),
        stt,
        EventLoggerProcessor(event_queue, "REP", activity_ref, shared_turns, ledger),
        context_aggregator.user(),
        llm,
        EventLoggerProcessor(event_queue, "VOBI", activity_ref, shared_turns, ledger, ready_event),
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    worker = PipelineWorker(pipeline)
    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)

    call_start_ts = time.monotonic()

    async def call_watchdog():
        while True:
            await asyncio.sleep(5)
            if stop_event and stop_event.is_set():
                return
            now = time.monotonic()
            elapsed = now - call_start_ts
            idle = now - activity_ref[0]
            if elapsed >= MAX_CALL_DURATION_SECS or idle >= MAX_HOLD_SECS:
                if event_queue is not None:
                    await event_queue.put({"type": "control", "message": "end_pending"})
                await runner.cancel("call timeout")
                return

    watchdog_task = asyncio.create_task(call_watchdog())

    if stop_event:
        async def wait_for_stop():
            await stop_event.wait()
            await runner.cancel("call ended by user")
        stop_task = asyncio.create_task(wait_for_stop())
    else:
        stop_task = None

    try:
        await runner.run()
    except asyncio.CancelledError:
        try:
            await runner.cancel("task cancelled")
        except Exception:
            pass
    finally:
        watchdog_task.cancel()
        if stop_task is not None:
            stop_task.cancel()


if __name__ == "__main__":
    dummy_data = {
        "patientFirstName": "John",
        "patientLastName": "Doe",
        "dob": "1990-01-01",
        "memberId": "W2749183021",
        "npi": "1487624930",
        "cptCodes": ["99214", "90837"],
    }
    try:
        asyncio.run(start_bot(dummy_data))
    except KeyboardInterrupt:
        print("\nVobi agent stopped.")
        sys.exit(0)

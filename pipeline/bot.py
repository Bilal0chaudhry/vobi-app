import asyncio
import os
import sys

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from loguru import logger
logger.remove()
logger.add(sys.stderr, level="WARNING")

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineWorker
from pipecat.workers.runner import WorkerRunner
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import Frame, TranscriptionFrame, TextFrame, EndFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.fish.tts import FishAudioTTSService
from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams

from prompts import VOBI_SYSTEM_PROMPT, VOBI_GREETING

FISH_VOICE_ID = os.getenv("FISH_AUDIO_VOICE_ID", "")


class EventLoggerProcessor(FrameProcessor):
    def __init__(self, event_queue, source_type: str):
        super().__init__()
        self.event_queue = event_queue
        self.source_type = source_type

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if self.event_queue is None:
            await self.push_frame(frame, direction)
            return

        if self.source_type == "REP" and isinstance(frame, TranscriptionFrame):
            await self.event_queue.put({
                "type": "rep",
                "source": "REP",
                "message": frame.text,
            })
        elif self.source_type == "VOBI" and isinstance(frame, TextFrame):
            text = frame.text
            if "[END_CALL]" in text:
                text = text.replace("[END_CALL]", "")
                await self.event_queue.put({"type": "control", "message": "end_pending"})

            if text.strip():
                await self.event_queue.put({
                    "type": "ai",
                    "source": "VOBI",
                    "message": text,
                })

        await self.push_frame(frame, direction)


def build_system_prompt(patient_data: dict | None) -> str:
    defaults = {
        "patient_first_name": "[Patient First Name]",
        "patient_last_name": "[Patient Last Name]",
        "dob": "[DOB]",
        "member_id": "[Member ID]",
        "npi": "[NPI]",
        "cpt_codes": "[CPT Codes]",
    }
    if patient_data:
        defaults.update({
            "patient_first_name": patient_data.get("patientFirstName", ""),
            "patient_last_name": patient_data.get("patientLastName", ""),
            "dob": patient_data.get("dob", ""),
            "member_id": patient_data.get("memberId", ""),
            "npi": patient_data.get("npi", ""),
            "cpt_codes": ", ".join(patient_data.get("cptCodes", [])),
        })
    return VOBI_SYSTEM_PROMPT.format(**defaults)


async def start_bot(patient_data: dict = None, event_queue=None, stop_event: asyncio.Event = None):
    transport = LocalAudioTransport(
        LocalAudioTransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(confidence=0.7, start_secs=0.5, stop_secs=1.0)
            ),
            vad_audio_passthrough=True,
        )
    )

    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        model="nova-3",
        language="en",
    )

    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        settings=OpenAILLMService.Settings(model="gpt-4o-mini"),
    )

    tts = FishAudioTTSService(
        api_key=os.getenv("FISH_AUDIO_API_KEY"),
        settings=FishAudioTTSService.Settings(
            model="s2.1-pro-free",
            voice=FISH_VOICE_ID if FISH_VOICE_ID else None,
        ),
    )

    context = LLMContext(messages=[
        {"role": "system", "content": build_system_prompt(patient_data)},
        {"role": "assistant", "content": VOBI_GREETING},
    ])
    context_aggregator = LLMContextAggregatorPair(context=context)

    pipeline = Pipeline([
        transport.input(),
        stt,
        EventLoggerProcessor(event_queue, "REP"),
        context_aggregator.user(),
        llm,
        EventLoggerProcessor(event_queue, "VOBI"),
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    worker = PipelineWorker(pipeline)
    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)

    if stop_event:
        async def wait_for_stop():
            await stop_event.wait()
            await pipeline.queue_frame(EndFrame())
        asyncio.create_task(wait_for_stop())

    await runner.run()


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

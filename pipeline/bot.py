import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.fish.tts import FishTTSService
from pipecat.transports.local.audio import LocalAudioTransport
from pipecat.transports.base_transport import TransportParams

from prompts import VOBI_SYSTEM_PROMPT, VOBI_GREETING

# ──────────────────────────────────────────────
# Fish Audio: pick a female voice
# Browse voices at https://fish.audio and copy the ID from the URL
# Example: https://fish.audio/m/MODEL_ID_HERE
# Then paste it below or set FISH_AUDIO_VOICE_ID in .env
# ──────────────────────────────────────────────
FISH_VOICE_ID = os.getenv("FISH_AUDIO_VOICE_ID", "")


async def main():
    # ── Transport: local mic/speaker ──
    transport = LocalAudioTransport(
        TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(
                    confidence=0.7,
                    start_secs=0.2,
                    stop_secs=0.2,
                )
            ),
            vad_audio_passthrough=True,
        )
    )

    # ── STT: Deepgram ──
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        model="nova-3",
        language="en",
    )

    # ── LLM: OpenAI GPT ──
    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-mini",
    )

    # ── TTS: Fish Audio (female voice) ──
    tts = FishTTSService(
        api_key=os.getenv("FISH_AUDIO_API_KEY"),
        model="speech-1.5",
        reference_id=FISH_VOICE_ID if FISH_VOICE_ID else None,
    )

    # ── Context + Smart Turn Detection ──
    messages = [
        {"role": "system", "content": VOBI_SYSTEM_PROMPT},
        {"role": "assistant", "content": VOBI_GREETING},
    ]

    context = OpenAILLMContext(messages=messages)
    context_aggregator = llm.create_context_aggregator(
        context,
        assistant_expect_stripped_words=False,
    )

    # ── Pipeline ──
    pipeline = Pipeline([
        transport.input(),
        stt,
        context_aggregator.user(),
        llm,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
        ),
    )

    runner = PipelineRunner()

    print("=" * 50)
    print("  VOBI Voice Agent — Local Audio Mode")
    print("  Speak into your microphone to begin.")
    print("  Press Ctrl+C to stop.")
    print("=" * 50)

    await runner.run(task)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nVobi agent stopped.")
        sys.exit(0)

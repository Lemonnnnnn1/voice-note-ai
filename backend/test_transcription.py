"""
Test script for VoiceNote AI transcription services.
Run this to verify both Faster Whisper and OpenAI Whisper are working.
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from services.transcription import TranscriptionService


async def test_faster_whisper():
    """Test Faster Whisper local transcription."""
    print("=" * 50)
    print("Testing Faster Whisper (Local)")
    print("=" * 50)

    service = TranscriptionService()

    try:
        # Check if model is available
        model = service.faster_whisper_model
        print(f"✓ Faster Whisper model loaded: {model}")
        print("✓ Faster Whisper is ready for transcription")
        return True
    except Exception as e:
        print(f"✗ Faster Whisper error: {e}")
        return False


async def test_openai_whisper():
    """Test OpenAI Whisper API."""
    print("\n" + "=" * 50)
    print("Testing OpenAI Whisper (Cloud)")
    print("=" * 50)

    from core.config import settings

    if not settings.OPENAI_API_KEY and not settings.OPENAI_ANALYSIS_KEY:
        print("✗ OpenAI API key not configured")
        print("  Please set OPENAI_API_KEY in .env file")
        print("  Get your key from: https://platform.openai.com/api-keys")
        return False

    print("✓ OpenAI API key configured")
    return True


async def main():
    print("\nVoiceNote AI - Transcription Service Test")
    print("=" * 50)

    # Test Faster Whisper
    faster_ok = await test_faster_whisper()

    # Test OpenAI Whisper
    openai_ok = await test_openai_whisper()

    # Summary
    print("\n" + "=" * 50)
    print("Summary")
    print("=" * 50)
    print(f"Faster Whisper (Local): {'✓ Ready' if faster_ok else '✗ Not Available'}")
    print(f"OpenAI Whisper (Cloud): {'✓ Configured' if openai_ok else '✗ Not Configured'}")

    if faster_ok:
        print("\nYou can now use VoiceNote AI to transcribe audio files!")
        print("To test with an audio file, run:")
        print("  curl -X POST http://localhost:8000/api/transcribe -F 'file=@your_audio.mp3' -F 'model=faster-whisper'")
    else:
        print("\nPlease install faster-whisper: pip install faster-whisper")

    if openai_ok:
        print("\nTo use OpenAI Whisper, set the model in the UI to 'OpenAI Whisper'")

    print()


if __name__ == "__main__":
    asyncio.run(main())

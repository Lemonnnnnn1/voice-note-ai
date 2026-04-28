"""Speaker diarization service using AssemblyAI API."""
import asyncio
import requests
from typing import List, Dict, Any, Optional


class SpeakerDiarizationService:
    """Service for speaker diarization using AssemblyAI API."""

    def __init__(self):
        self._api_key = None
        self._base_url = "https://api.assemblyai.com"

    @property
    def api_key(self):
        """Lazy load the API key."""
        if self._api_key is None:
            from core.config import settings
            self._api_key = getattr(settings, 'ASSEMBLYAI_API_KEY', None)
            if not self._api_key:
                print("[WARNING] ASSEMBLYAI_API_KEY is not configured. Speaker diarization will be skipped.")
        return self._api_key

    def is_available(self) -> bool:
        """Check if speaker diarization is available."""
        return bool(self.api_key)

    def _upload_file(self, audio_path: str) -> Optional[str]:
        """Upload audio file to AssemblyAI and return upload URL."""
        print(f"[DEBUG] Uploading {audio_path} to AssemblyAI...")

        with open(audio_path, "rb") as f:
            response = requests.post(
                f"{self._base_url}/v2/upload",
                headers={"authorization": self.api_key},
                data=f,
                timeout=60
            )

        if response.status_code != 200:
            print(f"[ERROR] Upload failed: {response.status_code} {response.text}")
            return None

        return response.json().get("upload_url")

    def _start_transcription(self, audio_url: str) -> Optional[str]:
        """Start transcription with speaker diarization."""
        print(f"[DEBUG] Starting AssemblyAI transcription...")

        response = requests.post(
            f"{self._base_url}/v2/transcript",
            headers={
                "authorization": self.api_key,
                "content-type": "application/json"
            },
            json={
                "audio_url": audio_url,
                "speaker_labels": True,
                "speakers_expected": 2
            },
            timeout=30
        )

        if response.status_code != 200:
            print(f"[ERROR] Start transcription failed: {response.status_code} {response.text}")
            return None

        transcript_id = response.json().get("id")
        print(f"[DEBUG] Transcription started, ID: {transcript_id}")
        return transcript_id

    def _poll_transcription(self, transcript_id: str, timeout: int = 300) -> Optional[Dict]:
        """Poll for transcription completion."""
        print(f"[DEBUG] Polling for transcription completion...")

        import time
        start_time = time.time()

        while time.time() - start_time < timeout:
            response = requests.get(
                f"{self._base_url}/v2/transcript/{transcript_id}",
                headers={"authorization": self.api_key},
                timeout=30
            )

            if response.status_code != 200:
                print(f"[ERROR] Poll failed: {response.status_code} {response.text}")
                return None

            result = response.json()
            status = result.get("status")

            if status == "completed":
                print(f"[DEBUG] Transcription completed!")
                return result
            elif status == "error":
                print(f"[ERROR] Transcription error: {result.get('error')}")
                return None

            print(f"[DEBUG] Transcription status: {status}, waiting...")
            time.sleep(3)

        print(f"[ERROR] Transcription timeout after {timeout} seconds")
        return None

    async def diarize(self, audio_path: str) -> List[Dict[str, Any]]:
        """
        Perform speaker diarization on an audio file using AssemblyAI.

        Args:
            audio_path: Path to the audio file

        Returns:
            List of speaker segments with timing information
        """
        if not self.is_available():
            print("[DEBUG] AssemblyAI not available, returning empty segments")
            return []

        print(f"[DEBUG] Starting AssemblyAI diarization for: {audio_path}")

        try:
            # Upload file
            audio_url = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self._upload_file(audio_path)
            )
            if not audio_url:
                return []

            # Start transcription
            transcript_id = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self._start_transcription(audio_url)
            )
            if not transcript_id:
                return []

            # Poll for completion
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self._poll_transcription(transcript_id)
            )
            if not result:
                return []

            # Process results
            segments = []
            utterances = result.get("utterances", [])

            print(f"[DEBUG] AssemblyAI returned {len(utterances)} utterances")

            for utt in utterances:
                segments.append({
                    "start": utt.get("start", 0) / 1000,  # Convert ms to seconds
                    "end": utt.get("end", 0) / 1000,
                    "speaker": utt.get("speaker", "UNKNOWN"),
                    "text": utt.get("text", "")
                })

            # Also get word-level timestamps if available
            words = result.get("words", [])
            if words:
                print(f"[DEBUG] AssemblyAI returned {len(words)} word-level timestamps")

            unique_speakers = set(seg["speaker"] for seg in segments)
            print(f"[DEBUG] Diarization found {len(segments)} segments, {len(unique_speakers)} unique speakers: {unique_speakers}")

            return segments

        except Exception as e:
            print(f"[ERROR] AssemblyAI diarization failed: {e}")
            import traceback
            traceback.print_exc()
            return []

    def merge_segments(self, segments: List[Dict[str, Any]], gap: float = 0.5) -> List[Dict[str, Any]]:
        """
        Merge consecutive segments from the same speaker.

        Args:
            segments: List of diarization segments
            gap: Maximum gap (seconds) between segments to merge

        Returns:
            Merged segments list
        """
        if not segments:
            return []

        merged = []
        current = segments[0].copy()

        for seg in segments[1:]:
            if (seg["start"] - current["end"] <= gap and
                seg["speaker"] == current["speaker"]):
                current["end"] = seg["end"]
            else:
                merged.append(current)
                current = seg.copy()

        merged.append(current)
        return merged

    def assign_speaker_names(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Assign human-readable names to speakers.

        Args:
            segments: List of speaker segments

        Returns:
            Segments with named speakers
        """
        # Get unique speakers
        unique_speakers = sorted(set(seg["speaker"] for seg in segments))

        # Create name mapping (Speaker 1, Speaker 2, etc.)
        name_mapping = {
            spk: f"Speaker {i+1}"
            for i, spk in enumerate(unique_speakers)
        }

        # Assign names
        for seg in segments:
            seg["speaker_name"] = name_mapping.get(seg["speaker"], seg["speaker"])

        return segments


# Singleton instance
diarization_service = SpeakerDiarizationService()
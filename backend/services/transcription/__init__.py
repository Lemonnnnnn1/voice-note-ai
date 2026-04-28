"""Transcription service using faster-whisper."""
import asyncio
import uuid
import json
import re
from typing import Optional, Dict, Any, List
from dataclasses import dataclass


def to_simplified_chinese(text: str) -> str:
    """
    Convert text to Simplified Chinese.
    Uses a character-based approach for common Traditional->Simplified conversions.
    """
    # Dictionary for common Traditional -> Simplified conversions
    char_map = {
        '為': '为', '與': '与', '過': '过', '來': '来', '說': '说',
        '時': '时', '們': '们', '個': '个', '學': '学', '國': '国',
        '會': '会', '對': '对', '麼': '么', '這': '这', '那': '那',
        '裡': '里', '麼': '么', '麼': '么', '還': '还', '後': '后',
        '認': '认', '識': '识', '開': '开', '關': '关', '東': '东',
        '車': '车', '魚': '鱼', '鳥': '鸟', '書': '书', '見': '见',
        '間': '间', '題': '题', '長': '长', '短': '短', '新': '新',
        '老': '老', '師': '师', '生': '生', '員': '员', '線': '线',
        '網': '网', '錢': '钱', '電': '电', '話': '话', '區': '区',
        '市': '市', '別': '别', '動': '动', '變': '变', '點': '点',
        '面': '面', '部': '部', '分': '分', '將': '将', '軍': '军',
        '場': '场', '常': '常', '樣': '样', '業': '业', '務': '务',
        '經': '经', '濟': '济', '結': '结', '果': '果', '論': '论',
        '無': '无', '處': '处', '聽': '听', '寫': '写', '號': '号',
        '錯': '错', '請': '请', '謝': '谢', '讓': '让', '語': '语',
        '親': '亲', '視': '视', '覺': '觉', '幾': '几', '處': '处',
        '術': '术', '準': '准', '備': '备', '質': '质', '題': '题',
        '檢': '检', '建': '建', '設': '设', '總': '总', '數': '数',
        '義': '义', '達': '达', '運': '运', '遠': '远', '連': '连',
        '週': '周', '進': '进', '迎': '迎', '返': '返', '還': '还',
        '邏': '逻', '輯': '辑', '協': '协', '歐': '欧', '產': '产',
        '廣': '广', '療': '疗', '環': '环', '護': '护', '誇': '夸',
        '獎': '奖', '嬰': '婴', '態': '态', '懸': '悬', '擾': '扰',
        '敵': '敌', '顯': '显', '風': '风', '飛': '飞', '養': '养',
        '餘': '余', '餓': '饿', '館': '馆', '馬': '马', '高興': '高兴',
        '什麼': '什么', '怎麼': '怎么', '為什麼': '为什么', '沒有': '没有',
        '這個': '这个', '那個': '那个', '現在': '现在', '這樣': '这样',
        '說話': '说话', '認識': '认识', '問題': '问题', '應該': '应该',
        '因為': '因为', '雖然': '虽然', '已經': '已经', '比較': '比较',
        '時間': '时间', '別人': '别人', '覺得': '觉得', '辦法': '办法',
        '話': '话', '樣': '样', '類': '类', '織': '织', '導': '导',
        '據': '据', '廣': '广', '庫': '库', '鐵': '铁', '門': '门',
        '電源': '电源', '離開': '离开', '通知': '通知', '領導': '领导',
        '決策': '决策', '沒錯': '没错', '确实': '确实', '會議': '会议',
        '內容': '内容', '情況': '情况', '應該': '应该', '聯繫': '联系',
        '影響': '影响', '解釋': '解释', '複雜': '复杂', '關係': '关系',
        '考慮': '考虑', '發展': '发展', '要求': '要求', '希望': '希望',
        '機會': '机会', '功能': '功能', '方法': '方法', '原因': '原因',
        '原則': '原则', '條件': '条件', '方式': '方式', '態度': '态度',
        '程度': '程度', '因素': '因素', '過程': '过程', '作用': '作用',
        '資料': '资料', '理論': '理论', '分析': '分析', '決定': '决定',
        '證據': '证据', '計劃': '计划', '時間': '时间', '程度': '程度',
    }

    # Apply character-by-character replacement
    result = []
    i = 0
    while i < len(text):
        # Check for 2-char replacements first
        if i < len(text) - 1:
            two_char = text[i:i+2]
            if two_char in char_map:
                result.append(char_map[two_char])
                i += 2
                continue

        # Single char replacement
        char = text[i]
        result.append(char_map.get(char, char))
        i += 1

    return ''.join(result)


def deduplicate_segments(segments: List[Dict[str, Any]], similarity_threshold: float = 0.8) -> List[Dict[str, Any]]:
    """
    Remove duplicate segments based on text similarity and time overlap.
    """
    if not segments:
        return []

    deduplicated = []
    last_text = ""

    for seg in segments:
        text = seg["text"].strip()

        # Skip empty segments
        if not text:
            continue

        # Skip if too similar to previous segment (repeated content)
        if last_text and (text in last_text or last_text in text):
            # Check if it's a genuine repeat
            if len(text) < len(last_text) * 0.5:
                continue  # Skip this segment as it's a subset of previous

        # Skip if segment is exactly the same as previous
        if text == last_text:
            continue

        deduplicated.append(seg)
        last_text = text

    return deduplicated


@dataclass
class TranscriptionResult:
    """Transcription result data class."""
    id: str
    text: str
    language: str
    segments: List[Dict[str, Any]]
    duration: Optional[float] = None
    speakers: Optional[List[Dict[str, Any]]] = None


class TranscriptionService:
    """Service for audio transcription using faster-whisper."""

    def __init__(self):
        self._faster_whisper_model = None
        self._diarization_service = None

    @property
    def faster_whisper_model(self):
        """Lazy load the Faster Whisper model."""
        if self._faster_whisper_model is None:
            try:
                from faster_whisper import WhisperModel
                from core.config import settings
                self._faster_whisper_model = WhisperModel(
                    settings.WHISPER_MODEL,
                    device=settings.WHISPER_DEVICE,
                    compute_type="int8",
                )
                print(f"Faster Whisper model loaded: {settings.WHISPER_MODEL}")
            except ImportError:
                print("faster-whisper not installed. Run: pip install faster-whisper")
                raise
        return self._faster_whisper_model

    @property
    def diarization_service(self):
        """Lazy load the diarization service."""
        if self._diarization_service is None:
            from services.diarization import diarization_service
            self._diarization_service = diarization_service
        return self._diarization_service

    async def transcribe_with_faster_whisper(
        self,
        audio_path: str,
        enable_speaker_recognition: bool = False
    ) -> TranscriptionResult:
        """
        Transcribe audio using Faster Whisper (local).

        Args:
            audio_path: Path to the audio file
            enable_speaker_recognition: Whether to enable speaker diarization

        Returns:
            TranscriptionResult object
        """
        loop = asyncio.get_event_loop()

        # Run transcription in thread pool to avoid blocking
        segments_gen, info = await loop.run_in_executor(
            None,
            lambda: self.faster_whisper_model.transcribe(
                audio_path,
                language=None,  # Auto-detect
                beam_size=5,
                vad_filter=False,  # Disable VAD to reduce repetition
            )
        )

        # Process segments
        segment_list = []
        prev_end = 0.0

        for segment in segments_gen:
            # Skip if segment overlaps too much with previous (avoid repetition)
            if segment.start < prev_end:
                # Adjust start to avoid overlap
                segment.start = prev_end

            if segment.end <= segment.start:
                continue  # Skip invalid segments

            segment_list.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "speaker": None,
            })
            prev_end = segment.end

        # Deduplicate segments
        segment_list = deduplicate_segments(segment_list)

        # Convert to Simplified Chinese and build formatted text
        formatted_lines = []
        full_text_parts = []

        for seg in segment_list:
            # Convert to Simplified Chinese
            simplified_text = to_simplified_chinese(seg["text"])
            seg["text"] = simplified_text
            full_text_parts.append(simplified_text)

        result = TranscriptionResult(
            id=str(uuid.uuid4()),
            text=" ".join(full_text_parts),
            language="zh" if info.language and "zh" in info.language else info.language,
            segments=segment_list,
            duration=info.duration,
        )

        # Perform speaker diarization if enabled
        # IMPORTANT: Use a fallback mechanism - if speaker recognition fails, continue without it
        if enable_speaker_recognition:
            try:
                result = await self._add_speaker_diarization(result, audio_path)
            except Exception as e:
                print(f"[WARNING] Speaker diarization failed, continuing without it: {e}")
                # Mark all speakers as unknown but don't fail the transcription
                for seg in result.segments:
                    seg["speaker"] = "未知说话人"
                result.speakers = []

            # Rebuild formatted text with speaker labels if we have speaker info
            if result.speakers and len(result.segments) > 0 and any(seg.get("speaker") for seg in result.segments):
                formatted_lines = []
                current_speaker = None
                current_text_parts = []

                for seg in result.segments:
                    speaker = seg.get("speaker") or "未知说话人"
                    text = seg["text"]

                    if speaker != current_speaker:
                        # Save previous speaker's text
                        if current_text_parts:
                            formatted_lines.append(f"{current_speaker}：{''.join(current_text_parts)}")
                        current_speaker = speaker
                        current_text_parts = [text]
                    else:
                        # Continue with same speaker
                        current_text_parts.append(text)

                # Don't forget the last speaker
                if current_text_parts and current_speaker:
                    formatted_lines.append(f"{current_speaker}：{''.join(current_text_parts)}")

                # Update result text with formatted output
                result.text = "\n".join(formatted_lines)

        return result

    async def _add_speaker_diarization(self, result: TranscriptionResult, audio_path: str) -> TranscriptionResult:
        """
        Add speaker diarization to transcription result.

        Args:
            result: The transcription result
            audio_path: Path to the audio file

        Returns:
            Updated transcription result with speakers assigned
        """
        print(f"[DEBUG] Starting speaker diarization for {len(result.segments)} segments")

        # Check if diarization service is available
        diarization_available = self.diarization_service.is_available()
        print(f"[DEBUG] Diarization service available: {diarization_available}")

        if not diarization_available:
            print("[DEBUG] Diarization service not available, skipping speaker assignment")
            return result

        try:
            diarization_segments = await self.diarization_service.diarize(audio_path)
            print(f"[DEBUG] Got {len(diarization_segments)} diarization segments")
            if diarization_segments:
                print(f"[DEBUG] First few diarization segments: {diarization_segments[:3]}")

            # Handle empty diarization result
            if not diarization_segments:
                print("[DEBUG] No diarization segments found, skipping speaker assignment")
                return result

            merged_segments = self.diarization_service.merge_segments(diarization_segments, gap=1.0)
            print(f"[DEBUG] Merged to {len(merged_segments)} segments")
            named_segments = self.diarization_service.assign_speaker_names(merged_segments)

            # Get unique speakers
            speakers_dict = {}
            for seg in named_segments:
                speaker_id = seg["speaker"]
                if speaker_id not in speakers_dict:
                    speakers_dict[speaker_id] = {
                        "id": speaker_id,
                        "name": seg["speaker_name"],
                        "color": self._get_speaker_color(len(speakers_dict))
                    }

            # Assign speakers to transcription segments based on time overlap
            for trans_seg in result.segments:
                best_overlap = 0
                best_speaker = None

                for diar_seg in named_segments:
                    # Calculate overlap
                    overlap_start = max(trans_seg["start"], diar_seg["start"])
                    overlap_end = min(trans_seg["end"], diar_seg["end"])

                    if overlap_end > overlap_start:
                        overlap_duration = overlap_end - overlap_start
                        seg_duration = trans_seg["end"] - trans_seg["start"]

                        if seg_duration > 0:
                            overlap_ratio = overlap_duration / seg_duration

                            if overlap_ratio > best_overlap and overlap_ratio >= 0.5:
                                best_overlap = overlap_ratio
                                best_speaker = diar_seg["speaker_name"]

                if best_speaker:
                    trans_seg["speaker"] = best_speaker

            result.speakers = list(speakers_dict.values())

        except Exception as e:
            print(f"Speaker diarization failed: {e}")
            # Continue without speaker recognition if it fails

        return result

    def _get_speaker_color(self, index: int) -> str:
        """Get a color for a speaker based on index."""
        colors = [
            "#6165f7",  # primary
            "#10b981",  # green
            "#f59e0b",  # amber
            "#ec4899",  # pink
            "#8b5cf6",  # purple
            "#06b6d4",  # cyan
            "#f97316",  # orange
            "#6366f1",  # indigo
        ]
        return colors[index % len(colors)]

    async def transcribe_with_assemblyai(
        self,
        audio_path: str
    ) -> TranscriptionResult:
        """
        Transcribe audio using AssemblyAI API (with built-in speaker diarization).

        Args:
            audio_path: Path to the audio file

        Returns:
            TranscriptionResult object with speakers
        """
        import requests
        from core.config import settings

        api_key = settings.ASSEMBLYAI_API_KEY
        if not api_key:
            raise ValueError("ASSEMBLYAI_API_KEY not configured")

        base_url = "https://api.assemblyai.com"

        print(f"[DEBUG] Starting AssemblyAI transcription for: {audio_path}")

        # Step 1: Upload file
        with open(audio_path, "rb") as f:
            upload_response = requests.post(
                f"{base_url}/v2/upload",
                headers={"authorization": api_key},
                data=f,
                timeout=60
            )

        if upload_response.status_code != 200:
            raise Exception(f"Upload failed: {upload_response.status_code} {upload_response.text}")

        audio_url = upload_response.json().get("upload_url")
        print(f"[DEBUG] Audio uploaded, URL: {audio_url}")

        # Step 2: Start transcription with speaker labels
        transcript_response = requests.post(
            f"{base_url}/v2/transcript",
            headers={
                "authorization": api_key,
                "content-type": "application/json"
            },
            json={
                "audio_url": audio_url,
                "speaker_labels": True,
                "auto_chapters": True,
                "sentiment_analysis": True,
                "speech_models": ["universal-2"],
            },
            timeout=30
        )

        if transcript_response.status_code != 200:
            raise Exception(f"Transcription start failed: {transcript_response.status_code} {transcript_response.text}")

        transcript_id = transcript_response.json().get("id")
        print(f"[DEBUG] Transcription started, ID: {transcript_id}")

        # Step 3: Poll for completion
        import time
        max_polls = 300  # 5 minutes timeout
        poll_count = 0

        while poll_count < max_polls:
            status_response = requests.get(
                f"{base_url}/v2/transcript/{transcript_id}",
                headers={"authorization": api_key},
                timeout=30
            )

            if status_response.status_code != 200:
                raise Exception(f"Status check failed: {status_response.status_code}")

            status_data = status_response.json()
            status = status_data.get("status")

            if status == "completed":
                print(f"[DEBUG] Transcription completed!")
                break
            elif status == "error":
                raise Exception(f"Transcription error: {status_data.get('error')}")
            else:
                print(f"[DEBUG] Transcription status: {status}, waiting...")
                time.sleep(3)
                poll_count += 1
        else:
            raise Exception("Transcription timeout")

        # Step 4: Process results
        result = status_data

        # Build segments from utterances
        segments = []
        utterances = result.get("utterances", [])
        text_parts = []

        for utt in utterances:
            start_ms = utt.get("start", 0)
            end_ms = utt.get("end", 0)
            speaker = utt.get("speaker", "UNKNOWN")
            text = utt.get("text", "")

            segments.append({
                "start": start_ms / 1000,  # Convert to seconds
                "end": end_ms / 1000,
                "text": text,
                "speaker": speaker
            })
            text_parts.append(text)

        # Build speakers list
        speakers_dict = {}
        for utt in utterances:
            speaker_id = utt.get("speaker")
            if speaker_id and speaker_id not in speakers_dict:
                idx = len(speakers_dict)
                speakers_dict[speaker_id] = {
                    "id": speaker_id,
                    "name": f"Speaker {idx + 1}",
                    "color": self._get_speaker_color(idx)
                }

        # Get duration
        duration = result.get("audio_duration", 0)

        print(f"[DEBUG] AssemblyAI result: {len(segments)} segments, {len(speakers_dict)} speakers")

        return TranscriptionResult(
            id=transcript_id,
            text=" ".join(text_parts),
            language="zh",
            segments=segments,
            duration=duration,
            speakers=list(speakers_dict.values())
        )
"""Analysis service using AI."""
import asyncio
import json
import uuid
from typing import Dict, Any, Optional, List


class AnalysisService:
    """Service for AI-powered analysis of transcriptions."""

    def __init__(self):
        self._deepseek_client = None

    @property
    def deepseek_client(self):
        """Lazy load the DeepSeek client (OpenAI-compatible API)."""
        if self._deepseek_client is None:
            try:
                from openai import OpenAI
                from core.config import settings
                api_key = settings.DEEPSEEK_API_KEY
                if not api_key:
                    raise ValueError("DeepSeek API key not configured for analysis")
                # DeepSeek uses OpenAI-compatible API
                self._deepseek_client = OpenAI(
                    api_key=api_key,
                    base_url="https://api.deepseek.com"
                )
            except ImportError:
                print("openai not installed. Run: pip install openai")
                raise
        return self._deepseek_client

    async def analyze(
        self,
        transcription_text: str,
        transcription_segments: List[Dict[str, Any]] = None,
        language: str = "zh"
    ) -> Dict[str, Any]:
        """
        Analyze transcription text and generate insights.

        Args:
            transcription_text: The transcribed text
            transcription_segments: List of segments with start/end times
            language: Language code (zh/en)

        Returns:
            Analysis result dictionary
        """
        loop = asyncio.get_event_loop()

        # Run analysis in thread pool
        result = await loop.run_in_executor(
            None,
            lambda: self._generate_analysis_sync(transcription_text, transcription_segments, language)
        )

        return result

    def _generate_analysis_sync(self, transcription_text: str, transcription_segments: List[Dict[str, Any]] = None, language: str = "zh") -> Dict[str, Any]:
        """Generate analysis using DeepSeek API (synchronous)."""
        from core.config import settings

        print(f"[DEBUG] Starting analysis with language={language}, text_length={len(transcription_text)}")

        # Format segments with timestamps for the prompt
        formatted_segments = ""
        if transcription_segments:
            for i, seg in enumerate(transcription_segments):
                start = seg.get("start", 0)
                end = seg.get("end", 0)
                text = seg.get("text", "")
                speaker = seg.get("speaker", "")
                speaker_info = f" [{speaker}]" if speaker else ""
                formatted_segments += f"[{int(start)}s-{int(end)}s]{speaker_info} {text}\n"
            print(f"[DEBUG] Formatted {len(transcription_segments)} segments with timestamps")
        else:
            # Fallback if no segments provided
            formatted_segments = transcription_text
            print(f"[DEBUG] No segments provided, using plain text")

        # Limit transcription text to avoid token limit issues
        max_text_length = 10000
        if len(formatted_segments) > max_text_length:
            formatted_segments = formatted_segments[:max_text_length] + "...[内容已截断]"
            print(f"[DEBUG] Text truncated to {max_text_length} characters")

        prompt = f"""你是一个专业的会议分析助手。请分析以下会议录音转写内容，提取关键信息。

转写内容（带时间戳）：
{formatted_segments}

请以JSON格式返回以下分析结果：
{{
    "speakers": [
        {{"id": "1", "name": "说话人1姓名", "color": "#6165f7"}},
        {{"id": "2", "name": "说话人2姓名", "color": "#10b981"}}
    ],
    "chapters": [
        {{"id": "1", "title": "章节标题", "start_time": 0, "end_time": 300, "content": "章节内容概述"}}
    ],
    "summary": "会议总结",
    "mind_map": {{
        "id": "root",
        "text": "会议主题",
        "children": []
    }},
    "keywords": ["关键词1", "关键词2"],
    "sentiment": "中性",
    "key_decisions": ["决策1"],
    "action_items": [
        {{"task": "任务描述", "person": "负责人", "deadline": "截止日期"}}
    ],
    "risk_points": ["风险点1"]
}}

重要提醒：
1. 章节的start_time和end_time必须使用转写内容中提供的时间戳
2. 每个章节的end_time必须小于下一个章节的start_time
3. 只返回JSON，不要包含其他内容。"""

        try:
            response = self.deepseek_client.chat.completions.create(
                model=settings.DEEPSEEK_ANALYSIS_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个专业的会议分析助手。你必须只返回有效的JSON格式，不要包含任何其他文字。"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=4000,
            )

            content = response.choices[0].message.content.strip()

            # DEBUG: Print raw response
            print(f"[DEBUG] DeepSeek raw response length: {len(content)}")
            print(f"[DEBUG] DeepSeek response preview: {content[:500]}")

            # Remove markdown code blocks if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            # Remove any text before first { and after last }
            first_brace = content.find('{')
            last_brace = content.rfind('}')
            if first_brace != -1 and last_brace != -1:
                content = content[first_brace:last_brace+1]

            print(f"[DEBUG] Parsed JSON content length: {len(content)}")

            result = json.loads(content)
            print(f"[DEBUG] Analysis result keys: {list(result.keys())}")
            return result

        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Response content: {content[:500] if 'content' in dir() else 'N/A'}")
            # Return a minimal valid response
            return {
                "speakers": [],
                "chapters": [],
                "summary": "分析失败，请稍后重试",
                "mind_map": {"id": "root", "text": "会议", "children": []},
                "keywords": [],
                "sentiment": "中性",
                "key_decisions": [],
                "action_items": [],
                "risk_points": []
            }
        except Exception as e:
            print(f"Analysis error: {e}")
            raise


# Singleton instance
analysis_service = AnalysisService()

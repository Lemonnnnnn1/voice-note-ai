"""Transcription routes - handles Faster Whisper transcription."""
import os
import uuid
import json
import sqlite3
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form, Header
from typing import Optional
import asyncio

from core.config import settings
from services.transcription import TranscriptionService
from database import get_db, DATABASE_PATH
from auth import get_user_id_from_token
from datetime import datetime

router = APIRouter(prefix="/api", tags=["Transcription"])

# Singleton transcription service
transcription_service = TranscriptionService()

# In-memory storage for transcription results (in production, use database)
transcription_results = {}
analysis_results = {}


def update_usage_stats(user_id: str, duration: float, language: str = "zh", file_size: int = 0):
    """Update usage statistics for a user after transcription."""
    print(f"[DEBUG] update_usage_stats called: user_id={user_id}, duration={duration}, lang={language}, file_size={file_size}")

    if not user_id:
        print(f"[DEBUG] update_usage_stats - no user_id, skipping")
        return

    try:
        today = datetime.utcnow().strftime('%Y-%m-%d')
        now = datetime.utcnow().isoformat()

        # Use a fresh connection for this operation to avoid locking issues
        conn = sqlite3.connect(DATABASE_PATH, timeout=30)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()

            # First try to UPDATE existing record
            cursor.execute(
                """UPDATE usage_stats
                   SET total_duration = total_duration + ?,
                       files_analyzed = files_analyzed + 1,
                       storage_used = storage_used + ?,
                       last_updated = ?
                   WHERE user_id = ?""",
                (duration, file_size, now, user_id)
            )
            print(f"[DEBUG] update_usage_stats - UPDATE rowcount: {cursor.rowcount}")

            # If no rows updated, INSERT new record
            if cursor.rowcount == 0:
                print(f"[DEBUG] update_usage_stats - inserting new record")
                cursor.execute(
                    """INSERT INTO usage_stats (id, user_id, total_duration, files_analyzed, languages_used, storage_used, last_updated)
                       VALUES (?, ?, ?, 1, ?, ?, ?)""",
                    (str(uuid.uuid4()), user_id, duration, json.dumps([language]), file_size, now)
                )

            # Update or insert usage_trend (daily stats)
            cursor.execute(
                """INSERT INTO usage_trend (id, user_id, date, duration, files_count)
                   VALUES (?, ?, ?, ?, 1)
                   ON CONFLICT(user_id, date) DO UPDATE SET
                   duration = duration + ?,
                   files_count = files_count + 1""",
                (str(uuid.uuid4()), user_id, today, duration, duration)
            )

            conn.commit()
            print(f"[DEBUG] Updated usage stats for user {user_id}: duration={duration}, lang={language}, file_size={file_size}")
        finally:
            conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to update usage stats: {e}")
        import traceback
        traceback.print_exc()


@router.post("/transcribe")
async def transcribe_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model: Optional[str] = Form("faster-whisper"),
    enable_speaker_recognition: Optional[str] = Form("false"),
    auto_analyze: Optional[str] = Form("false"),
    project_id: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
):
    """
    Transcribe an audio file using specified model.

    Args:
        file: Audio file (MP3, WAV, M4A, etc.)
        model: Transcription model to use ("faster-whisper")
        enable_speaker_recognition: Whether to enable speaker diarization ("true" or "false")
        auto_analyze: Whether to automatically run analysis after transcription ("true" or "false")
        project_id: Optional project ID to associate the file with
        authorization: Optional JWT token for user authentication

    Returns:
        Transcription result with text, segments, and metadata
    """
    print(f"[DEBUG] transcribe_audio called, model={model}, file={file.filename}")
    # Validate file type
    allowed_types = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm", "audio/x-m4a", "audio/aac"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: MP3, WAV, M4A, OGG, WEBM"
        )

    # Create upload directory if not exists
    upload_dir = os.path.join(settings.UPLOAD_DIR, "temp")
    os.makedirs(upload_dir, exist_ok=True)

    # Save uploaded file
    file_id = str(uuid.uuid4())
    # Map content type to file extension
    content_type_to_ext = {
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/mp4": ".m4a",
        "audio/ogg": ".ogg",
        "audio/webm": ".webm",
        "audio/x-m4a": ".m4a",
        "audio/aac": ".aac",
    }
    file_ext = content_type_to_ext.get(file.content_type, ".webm")
    file_path = os.path.join(upload_dir, f"{file_id}{file_ext}")

    async with aiofiles.open(file_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    # Get file size for storage tracking
    file_size = len(content)
    print(f"[DEBUG] transcribe_audio - file_size: {file_size} bytes")

    # Parse settings
    enable_speaker = enable_speaker_recognition.lower() == "true"
    should_auto_analyze = auto_analyze.lower() == "true"

    # Get user_id from token if provided
    user_id = None
    file_name = file.filename or "audio_file"
    print(f"[DEBUG] transcribe_audio - authorization header present: {bool(authorization)}")
    if authorization:
        parts = authorization.split()
        print(f"[DEBUG] transcribe_audio - parts: {parts}")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            user_id = get_user_id_from_token(parts[1])
            print(f"[DEBUG] transcribe_audio - extracted user_id: {user_id}")
        else:
            print(f"[DEBUG] transcribe_audio - invalid authorization format")
    else:
        print(f"[DEBUG] transcribe_audio - no authorization header")

    # Start transcription in background
    background_tasks.add_task(
        run_transcription,
        file_id=file_id,
        file_path=file_path,
        model=model,
        enable_speaker_recognition=enable_speaker,
        auto_analyze=should_auto_analyze,
        user_id=user_id,
        project_id=project_id,
        file_name=file_name,
        file_size=file_size
    )

    return {
        "success": True,
        "data": {
            "file_id": file_id,
            "status": "processing",
            "message": "Transcription started. Use GET /api/transcribe/{file_id}/status to check progress."
        }
    }


async def run_transcription(file_id: str, file_path: str, model: str, enable_speaker_recognition: bool = False, auto_analyze: bool = False, user_id: str = None, project_id: str = None, file_name: str = "audio_file", file_size: int = 0):
    """Background task to run transcription."""
    print(f"[DEBUG] run_transcription started: file_id={file_id}, user_id={user_id}, file_size={file_size}, model={model}, enable_speaker_recognition={enable_speaker_recognition}, auto_analyze={auto_analyze}")
    try:
        # Use Deepgram for cloud transcription (default for deployment)
        if model == "deepgram" or model == "faster-whisper":
            print(f"[DEBUG] Using Deepgram for transcription")
            result = await transcription_service.transcribe_with_deepgram(
                file_path,
                enable_speaker_recognition=enable_speaker_recognition
            )
        elif model == "faster-whisper":
            print(f"[DEBUG] Using Faster Whisper (local)")
            result = await transcription_service.transcribe_with_faster_whisper(
                file_path,
                enable_speaker_recognition=False
            )
        else:
            # Default to Deepgram
            print(f"[DEBUG] Using Deepgram (default) for transcription")
            result = await transcription_service.transcribe_with_deepgram(
                file_path,
                enable_speaker_recognition=enable_speaker_recognition
            )

        print(f"[DEBUG] Transcription completed: id={result.id}, duration={result.duration}, speakers={result.speakers}")

        # Build transcription result
        transcription_data = {
            "id": result.id,
            "text": result.text,
            "language": result.language,
            "segments": result.segments,
            "duration": result.duration,
            "speakers": result.speakers if result.speakers else [],
            "status": "completed"
        }

        # Store in memory
        transcription_results[file_id] = transcription_data
        print(f"[DEBUG] Stored transcription result for file_id={file_id}")

        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)

        # Save to database if user is authenticated
        if user_id:
            try:
                with get_db() as conn:
                    cursor = conn.cursor()

                    # Check if file record exists
                    cursor.execute("SELECT id FROM audio_files WHERE id = ?", (file_id,))
                    exists = cursor.fetchone()

                    transcription_json = json.dumps({
                        "id": result.id,
                        "text": result.text,
                        "language": result.language,
                        "segments": result.segments,
                        "duration": result.duration,
                        "speakers": result.speakers if result.speakers else []
                    }, ensure_ascii=False)

                    if exists:
                        # Update existing record
                        cursor.execute(
                            """UPDATE audio_files
                               SET transcription_text = ?, transcription_json = ?, duration = ?, language = ?
                               WHERE id = ?""",
                            (result.text, transcription_json, result.duration, result.language, file_id)
                        )
                    else:
                        # Create new record
                        now = datetime.utcnow().isoformat()
                        cursor.execute(
                            """INSERT INTO audio_files (id, user_id, project_id, name, type, duration, language, file_size, transcription_text, transcription_json, created_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                            (file_id, user_id, project_id, file_name, "uploaded", result.duration, result.language, file_size, result.text, transcription_json, now)
                        )
                    print(f"[DEBUG] Saved transcription to database for user_id={user_id}, file_size={file_size}")
            except Exception as db_e:
                print(f"Database save error for {file_id}: {db_e}")

            # Update usage stats OUTSIDE the get_db() block to avoid connection conflicts
            try:
                update_usage_stats(user_id, result.duration, result.language, file_size)
            except Exception as stats_e:
                print(f"[ERROR] update_usage_stats error: {stats_e}")

        # Auto-analyze if enabled
        if auto_analyze:
            print(f"[DEBUG] Auto-analyze enabled, calling analysis service for file_id={file_id}")
            from services.analysis import analysis_service
            try:
                analysis_result = await analysis_service.analyze(
                    transcription_text=result.text,
                    transcription_segments=result.segments,
                    language=result.language
                )
                print(f"[DEBUG] Analysis completed: {list(analysis_result.keys())}")
                analysis_results[file_id] = {
                    **analysis_result,
                    "status": "completed"
                }
                print(f"[DEBUG] Stored analysis result for file_id={file_id}")

                # If diarization failed but we have AI analysis speakers, use them
                if not transcription_data.get("speakers") and analysis_result.get("speakers"):
                    print(f"[DEBUG] Using AI analysis speakers for transcription")
                    transcription_data["speakers"] = analysis_result["speakers"]

                    # Assign speakers to segments using time-based grouping
                    # Each speaker speaks for ~30 seconds before switching
                    speakers = analysis_result["speakers"]
                    segments = transcription_data["segments"]
                    if speakers and len(speakers) > 0 and segments and len(segments) > 0:
                        SPEAKER_BLOCK_DURATION = 30  # seconds per speaker block
                        current_speaker_idx = 0
                        current_block_end = 0

                        for seg in segments:
                            if seg["start"] >= current_block_end:
                                current_speaker_idx = (current_speaker_idx + 1) % len(speakers)
                                current_block_end = seg["start"] + SPEAKER_BLOCK_DURATION
                            seg["speaker"] = speakers[current_speaker_idx]["name"]
                        print(f"[DEBUG] Assigned speakers to {len(segments)} segments using time-based grouping")

                        # Update stored transcription result
                        transcription_results[file_id] = transcription_data
                        print(f"[DEBUG] Updated transcription result with AI speakers")

                # Save analysis to database if user is authenticated
                if user_id:
                    try:
                        with get_db() as conn:
                            cursor = conn.cursor()
                            analysis_json = json.dumps(analysis_result, ensure_ascii=False)
                            cursor.execute(
                                "UPDATE audio_files SET analysis_json = ? WHERE id = ?",
                                (analysis_json, file_id)
                            )
                            print(f"[DEBUG] Saved analysis to database for file_id={file_id}")
                    except Exception as db_e:
                        print(f"Database save analysis error for {file_id}: {db_e}")
            except Exception as e:
                print(f"Auto-analysis error for {file_id}: {e}")
                import traceback
                traceback.print_exc()

    except Exception as e:
        transcription_results[file_id] = {
            "status": "error",
            "error": str(e)
        }
        print(f"Transcription error for {file_id}: {e}")
        import traceback
        traceback.print_exc()


@router.get("/transcribe/{file_id}/status")
async def get_transcription_status(file_id: str):
    """Get transcription status and result."""
    if file_id not in transcription_results:
        return {
            "file_id": file_id,
            "status": "not_found",
            "message": "Transcription not found"
        }

    result = transcription_results[file_id]
    return {
        "file_id": file_id,
        "status": result.get("status", "unknown"),
        "result": result if result.get("status") == "completed" else None
    }


@router.get("/transcribe/{file_id}/result")
async def get_transcription_result(file_id: str):
    """Get transcription result."""
    if file_id not in transcription_results:
        raise HTTPException(status_code=404, detail="Transcription not found")

    result = transcription_results[file_id]
    if result.get("status") != "completed":
        raise HTTPException(status_code=400, detail=f"Transcription not completed. Status: {result.get('status')}")

    return {
        "success": True,
        "data": result
    }


@router.post("/analyze")
async def analyze_transcription(
    background_tasks: BackgroundTasks,
    file_id: str = Form(...),
    authorization: Optional[str] = Header(None),
):
    """
    Analyze a transcribed audio file using AI.

    Args:
        file_id: The ID of the transcription result to analyze

    Returns:
        Analysis result with speakers, chapters, summary, mind map, etc.
    """
    if file_id not in transcription_results:
        raise HTTPException(status_code=404, detail="Transcription not found")

    transcription = transcription_results[file_id]
    if transcription.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Transcription not completed")

    # Get user_id from token if provided
    user_id = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            user_id = get_user_id_from_token(parts[1])

    # Start analysis in background
    background_tasks.add_task(
        run_analysis,
        file_id=file_id,
        transcription_text=transcription["text"],
        transcription_segments=transcription.get("segments", []),
        language=transcription.get("language", "zh"),
        user_id=user_id
    )

    return {
        "success": True,
        "data": {
            "file_id": file_id,
            "status": "processing",
            "message": "Analysis started. Use GET /api/analyze/{file_id}/status to check progress."
        }
    }


async def run_analysis(file_id: str, transcription_text: str, transcription_segments: list, language: str, user_id: str = None):
    """Background task to run analysis."""
    from services.analysis import analysis_service

    try:
        result = await analysis_service.analyze(transcription_text, transcription_segments, language)
        analysis_results[file_id] = {
            **result,
            "status": "completed"
        }

        # If transcription doesn't have speakers but we have AI analysis speakers, use them
        if file_id in transcription_results:
            transcription_data = transcription_results[file_id]
            if not transcription_data.get("speakers") and result.get("speakers"):
                print(f"[DEBUG] Using AI analysis speakers for transcription in run_analysis")
                transcription_data["speakers"] = result["speakers"]

                # Assign speakers to segments using time-based grouping
                # Each speaker speaks for ~30 seconds before switching
                speakers = result["speakers"]
                segments = transcription_data["segments"]
                if speakers and len(speakers) > 0 and segments and len(segments) > 0:
                    SPEAKER_BLOCK_DURATION = 30  # seconds per speaker block
                    current_speaker_idx = 0
                    current_block_end = 0

                    for seg in segments:
                        # Check if it's time to switch speaker
                        if seg["start"] >= current_block_end:
                            current_speaker_idx = (current_speaker_idx + 1) % len(speakers)
                            current_block_end = seg["start"] + SPEAKER_BLOCK_DURATION
                        seg["speaker"] = speakers[current_speaker_idx]["name"]

                    print(f"[DEBUG] Assigned speakers to {len(segments)} segments using time-based grouping")
                    transcription_results[file_id] = transcription_data

                    # Debug: verify speakers are stored
                    print(f"[DEBUG] Verified transcription speakers: {transcription_results[file_id].get('speakers')}")
                    print(f"[DEBUG] Verified first 5 segments speakers: {[s.get('speaker') for s in transcription_results[file_id].get('segments', [])[:5]]}")

        # Save analysis to database if user is authenticated
        if user_id:
            try:
                with get_db() as conn:
                    cursor = conn.cursor()
                    analysis_json = json.dumps(result, ensure_ascii=False)
                    cursor.execute(
                        "UPDATE audio_files SET analysis_json = ? WHERE id = ?",
                        (analysis_json, file_id)
                    )
            except Exception as db_e:
                print(f"Database save analysis error for {file_id}: {db_e}")
    except Exception as e:
        analysis_results[file_id] = {
            "status": "error",
            "error": str(e)
        }
        print(f"Analysis error for {file_id}: {e}")
        import traceback
        traceback.print_exc()


@router.get("/analyze/{file_id}/status")
async def get_analysis_status(file_id: str):
    """Get analysis status and result."""
    if file_id not in analysis_results:
        return {
            "file_id": file_id,
            "status": "not_found",
            "message": "Analysis not found"
        }

    result = analysis_results[file_id]
    return {
        "file_id": file_id,
        "status": result.get("status", "unknown"),
        "result": result if result.get("status") == "completed" else None
    }


@router.get("/analyze/{file_id}/result")
async def get_analysis_result(file_id: str):
    """Get analysis result."""
    if file_id not in analysis_results:
        raise HTTPException(status_code=404, detail="Analysis not found")

    result = analysis_results[file_id]
    if result.get("status") != "completed":
        raise HTTPException(status_code=400, detail=f"Analysis not completed. Status: {result.get('status')}")

    return {
        "success": True,
        "data": result
    }

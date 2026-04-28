"""Files management routes - handles user files with transcription and analysis results."""
import os
import uuid
import json
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from database import get_db
from auth import get_user_id_from_token

router = APIRouter(prefix="/api/files", tags=["Files"])


def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract user_id from Authorization header."""
    if not authorization:
        return None

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1]
    return get_user_id_from_token(token)


@router.get("", response_model=dict)
async def get_user_files(authorization: Optional[str] = Header(None)):
    """Get all files for the current user with their transcription/analysis status."""
    user_id = get_current_user_id(authorization)

    # Return empty list if not authenticated
    if not user_id:
        return {"success": True, "data": {"files": []}}

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get user's files from database
            cursor.execute(
                """SELECT id, name, type, duration, language, created_at, project_id,
                          transcription_text, transcription_json, analysis_json
                   FROM audio_files
                   WHERE user_id = ?
                   ORDER BY created_at DESC""",
                (user_id,)
            )
            rows = cursor.fetchall()

            files = []
            for row in rows:
                transcription_text = row["transcription_text"]
                analysis_json = row["analysis_json"]

                files.append({
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["type"],
                    "duration": row["duration"],
                    "language": row["language"],
                    "created_at": row["created_at"],
                    "project_id": row["project_id"],
                    "has_transcription": bool(transcription_text),
                    "has_analysis": bool(analysis_json)
                })

            return {"success": True, "data": {"files": files}}

    except Exception as e:
        return {"success": False, "error": {"code": "GET_FILES_FAILED", "message": str(e)}}


@router.get("/{file_id}/transcription", response_model=dict)
async def get_file_transcription(
    file_id: str,
    authorization: Optional[str] = Header(None)
):
    """Get transcription result for a file."""
    user_id = get_current_user_id(authorization)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT transcription_text, transcription_json FROM audio_files
                   WHERE id = ? AND user_id = ?""",
                (file_id, user_id)
            )
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="File not found")

            if not row["transcription_text"]:
                raise HTTPException(status_code=404, detail="Transcription not found")

            # Parse transcription JSON if exists
            if row["transcription_json"]:
                transcription = json.loads(row["transcription_json"])
            else:
                # Fallback to text-only format
                transcription = {
                    "id": file_id,
                    "text": row["transcription_text"],
                    "language": "unknown",
                    "segments": [],
                    "speakers": []
                }

            return {"success": True, "data": transcription}

    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": {"code": "GET_TRANSCRIPTION_FAILED", "message": str(e)}}


@router.get("/{file_id}/analysis", response_model=dict)
async def get_file_analysis(
    file_id: str,
    authorization: Optional[str] = Header(None)
):
    """Get analysis result for a file."""
    user_id = get_current_user_id(authorization)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT analysis_json FROM audio_files
                   WHERE id = ? AND user_id = ?""",
                (file_id, user_id)
            )
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="File not found")

            if not row["analysis_json"]:
                raise HTTPException(status_code=404, detail="Analysis not found")

            analysis = json.loads(row["analysis_json"])
            return {"success": True, "data": analysis}

    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": {"code": "GET_ANALYSIS_FAILED", "message": str(e)}}


@router.delete("/{file_id}", response_model=dict)
async def delete_file(
    file_id: str,
    authorization: Optional[str] = Header(None)
):
    """Delete a file."""
    user_id = get_current_user_id(authorization)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check if file exists and belongs to user
            cursor.execute(
                "SELECT id FROM audio_files WHERE id = ? AND user_id = ?",
                (file_id, user_id)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="File not found")

            # Delete file
            cursor.execute("DELETE FROM audio_files WHERE id = ?", (file_id,))

            return {"success": True, "data": {"message": "File deleted"}}

    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": {"code": "DELETE_FILE_FAILED", "message": str(e)}}


@router.put("/{file_id}", response_model=dict)
async def update_file(
    file_id: str,
    authorization: Optional[str] = Header(None),
    name: Optional[str] = None
):
    """Update a file (e.g., rename)."""
    user_id = get_current_user_id(authorization)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check if file exists and belongs to user
            cursor.execute(
                "SELECT id FROM audio_files WHERE id = ? AND user_id = ?",
                (file_id, user_id)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="File not found")

            # Update file name
            cursor.execute(
                "UPDATE audio_files SET name = ? WHERE id = ?",
                (name, file_id)
            )

            return {"success": True, "data": {"message": "File updated", "name": name}}

    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": {"code": "UPDATE_FILE_FAILED", "message": str(e)}}

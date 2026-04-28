"""User statistics API routes."""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from database import get_db
from auth import get_user_id_from_token

router = APIRouter(prefix="/api/users", tags=["users"])


class UsageStatsResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[dict] = None


class UsageTrendResponse(BaseModel):
    success: bool
    data: Optional[List[dict]] = None
    error: Optional[dict] = None


def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract user_id from Authorization header."""
    if not authorization:
        return None

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1]
    return get_user_id_from_token(token)


@router.get("/stats", response_model=UsageStatsResponse)
async def get_stats(authorization: Optional[str] = Header(None)):
    """Get usage statistics for the current user."""
    user_id = get_current_user_id(authorization)

    if not user_id:
        return UsageStatsResponse(success=False, error={
            "code": "NOT_AUTHENTICATED",
            "message": "Not logged in"
        })

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Calculate stats directly from audio_files table (more accurate)
            cursor.execute(
                """SELECT
                      COALESCE(SUM(duration), 0) as total_duration,
                      COUNT(*) as files_analyzed,
                      COALESCE(SUM(file_size), 0) as storage_used
                   FROM audio_files
                   WHERE user_id = ? AND transcription_text IS NOT NULL""",
                (user_id,)
            )
            stats = cursor.fetchone()

            # For languages, we'll return a fixed list since we support zh and en
            languages = ["简体中文", "English"]

            return UsageStatsResponse(success=True, data={
                "total_duration": stats["total_duration"] or 0,
                "files_analyzed": stats["files_analyzed"] or 0,
                "languages_used": languages,
                "storage_used": stats["storage_used"] or 0
            })

    except Exception as e:
        return UsageStatsResponse(success=False, error={
            "code": "GET_STATS_FAILED",
            "message": str(e)
        })


@router.get("/usage-trend", response_model=UsageTrendResponse)
async def get_usage_trend(
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """Get usage trend (daily stats) for the current user."""
    user_id = get_current_user_id(authorization)

    if not user_id:
        return UsageTrendResponse(success=False, error={
            "code": "NOT_AUTHENTICATED",
            "message": "Not logged in"
        })

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get daily stats for the last N days
            cursor.execute(
                """SELECT date, duration, files_count
                   FROM usage_trend
                   WHERE user_id = ?
                   ORDER BY date DESC
                   LIMIT ?""",
                (user_id, days)
            )
            rows = cursor.fetchall()

            # If no data, generate mock data for the last N days
            if not rows:
                today = datetime.now()
                mock_data = []
                for i in range(days):
                    date = (today - timedelta(days=i)).strftime('%Y-%m-%d')
                    mock_data.append({
                        "date": date,
                        "duration": 0,
                        "files_count": 0
                    })
                return UsageTrendResponse(success=True, data=mock_data)

            data = [
                {
                    "date": row["date"],
                    "duration": row["duration"],
                    "files_count": row["files_count"]
                }
                for row in rows
            ]

            return UsageTrendResponse(success=True, data=data)

    except Exception as e:
        return UsageTrendResponse(success=False, error={
            "code": "GET_TREND_FAILED",
            "message": str(e)
        })
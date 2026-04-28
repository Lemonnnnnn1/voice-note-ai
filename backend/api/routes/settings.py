"""Storage and settings API routes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
import os

from core.config import settings
from services.cleanup import cleanup_service

router = APIRouter(prefix="/api/settings", tags=["settings"])


class StorageSettings(BaseModel):
    storage_type: Literal["local", "cloud"]
    storage_path: Optional[str] = None


class CleanupSettings(BaseModel):
    enabled: bool
    days: int


class SettingsResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[dict] = None


@router.get("/storage", response_model=SettingsResponse)
async def get_storage_settings():
    """Get current storage settings."""
    return SettingsResponse(success=True, data={
        "storage_type": settings.STORAGE_PATH if settings.STORAGE_PATH else "local",
        "storage_path": settings.STORAGE_PATH or os.path.join(os.path.dirname(__file__), "..", "..", "uploads"),
        "auto_cleanup_enabled": settings.AUTO_CLEANUP_ENABLED,
        "auto_cleanup_days": settings.AUTO_CLEANUP_DAYS
    })


@router.post("/storage", response_model=SettingsResponse)
async def update_storage_settings(storage_settings: StorageSettings):
    """Update storage settings."""
    try:
        if storage_settings.storage_type == "local":
            if storage_settings.storage_path:
                # Validate path exists and is writable
                if not os.path.exists(storage_settings.storage_path):
                    raise HTTPException(status_code=400, detail="Storage path does not exist")
                if not os.access(storage_settings.storage_path, os.W_OK):
                    raise HTTPException(status_code=400, detail="Storage path is not writable")

                settings.STORAGE_PATH = storage_settings.storage_path
                os.makedirs(settings.STORAGE_PATH, exist_ok=True)

                return SettingsResponse(success=True, data={
                    "storage_type": "local",
                    "storage_path": settings.STORAGE_PATH
                })
            else:
                # Use default upload directory
                default_path = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
                settings.STORAGE_PATH = default_path
                os.makedirs(default_path, exist_ok=True)

                return SettingsResponse(success=True, data={
                    "storage_type": "local",
                    "storage_path": default_path
                })
        else:
            # Cloud storage - not implemented yet
            return SettingsResponse(success=True, data={
                "storage_type": "cloud",
                "storage_path": None,
                "message": "Cloud storage not implemented yet"
            })
    except HTTPException:
        raise
    except Exception as e:
        return SettingsResponse(success=False, error={
            "code": "STORAGE_UPDATE_FAILED",
            "message": str(e)
        })


@router.get("/cleanup", response_model=SettingsResponse)
async def get_cleanup_settings():
    """Get auto cleanup settings."""
    return SettingsResponse(success=True, data={
        "enabled": settings.AUTO_CLEANUP_ENABLED,
        "days": settings.AUTO_CLEANUP_DAYS
    })


@router.post("/cleanup", response_model=SettingsResponse)
async def update_cleanup_settings(cleanup_settings: CleanupSettings):
    """Update auto cleanup settings."""
    try:
        settings.AUTO_CLEANUP_ENABLED = cleanup_settings.enabled
        settings.AUTO_CLEANUP_DAYS = cleanup_settings.days

        # Get storage path
        storage_path = settings.STORAGE_PATH
        if not storage_path:
            storage_path = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")

        # Update cleanup service
        cleanup_service.update_cleanup_settings(
            storage_path=storage_path,
            days=cleanup_settings.days,
            enabled=cleanup_settings.enabled
        )

        return SettingsResponse(success=True, data={
            "enabled": settings.AUTO_CLEANUP_ENABLED,
            "days": settings.AUTO_CLEANUP_DAYS
        })
    except Exception as e:
        return SettingsResponse(success=False, error={
            "code": "CLEANUP_UPDATE_FAILED",
            "message": str(e)
        })


@router.post("/cleanup/test", response_model=SettingsResponse)
async def test_cleanup():
    """Test cleanup by running it once."""
    try:
        storage_path = settings.STORAGE_PATH
        if not storage_path:
            storage_path = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")

        # Run cleanup manually
        import asyncio
        loop = asyncio.new_event_loop()
        loop.run_until_complete(
            cleanup_service._cleanup_old_files(storage_path, settings.AUTO_CLEANUP_DAYS)
        )
        loop.close()

        return SettingsResponse(success=True, data={
            "message": "Cleanup test completed"
        })
    except Exception as e:
        return SettingsResponse(success=False, error={
            "code": "CLEANUP_TEST_FAILED",
            "message": str(e)
        })
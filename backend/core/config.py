"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    APP_NAME: str = "VoiceNote AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB

    # Storage Path (for audio files)
    STORAGE_PATH: Optional[str] = None

    # Auto Cleanup
    AUTO_CLEANUP_ENABLED: bool = False
    AUTO_CLEANUP_DAYS: int = 30  # 7, 30, or custom

    # Whisper - Faster Whisper (Local)
    WHISPER_MODEL: str = "medium"
    WHISPER_DEVICE: str = "cpu"

    # DeepSeek AI (for analysis)
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_ANALYSIS_MODEL: str = "deepseek-chat"

    # HuggingFace Token (for pyannote speaker diarization)
    HF_TOKEN: Optional[str] = None

    # HuggingFace Mirror Endpoint (for China/HF access)
    HF_ENDPOINT: Optional[str] = None

    # AssemblyAI API Key (for speaker diarization)
    ASSEMBLYAI_API_KEY: Optional[str] = None

    # Deepgram API Key (for cloud transcription)
    DEEPGRAM_API_KEY: Optional[str] = None

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "https://*.vercel.app"]


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

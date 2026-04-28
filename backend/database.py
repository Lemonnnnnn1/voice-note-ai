"""Database setup and session management."""
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Generator
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "voicenote.db")

def get_db_path():
    """Get database path, create data directory if not exists."""
    db_path = DATABASE_PATH
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return db_path


def get_connection() -> sqlite3.Connection:
    """Get a database connection."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database connections."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database tables."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                username TEXT,
                phone TEXT,
                token_version INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # Usage stats table (per user)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS usage_stats (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                total_duration REAL DEFAULT 0,
                files_analyzed INTEGER DEFAULT 0,
                languages_used TEXT DEFAULT '[]',
                storage_used INTEGER DEFAULT 0,
                last_updated TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Usage trend table (daily stats per user)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS usage_trend (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date TEXT NOT NULL,
                duration REAL DEFAULT 0,
                files_count INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, date)
            )
        """)

        # Projects table (per user)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Audio files table (per user)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audio_files (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                project_id TEXT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                duration REAL,
                language TEXT,
                file_path TEXT,
                file_size INTEGER DEFAULT 0,
                transcription_text TEXT,
                transcription_json TEXT,
                analysis_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )
        """)

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_usage_stats_user ON usage_stats(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_usage_trend_user_date ON usage_trend(user_id, date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audio_files_user ON audio_files(user_id)")

        conn.commit()
        print("Database initialized successfully")


if __name__ == "__main__":
    init_db()
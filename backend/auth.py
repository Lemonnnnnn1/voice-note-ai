"""Authentication utilities."""
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional
import os

# Secret key for JWT - in production, load from environment
JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = "voicenote_salt"  # In production, use random salt per user
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return hash_password(password) == password_hash


def create_access_token(user_id: str, token_version: int = 1) -> str:
    """Create a JWT access token."""
    import jwt

    payload = {
        "user_id": user_id,
        "token_version": token_version,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    import jwt

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_user_id_from_token(token: str) -> Optional[str]:
    """Extract user_id from a JWT token."""
    payload = decode_access_token(token)
    if payload:
        return payload.get("user_id")
    return None

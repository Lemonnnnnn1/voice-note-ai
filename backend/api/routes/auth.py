"""Authentication API routes."""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime

from database import get_db
from auth import hash_password, verify_password, create_access_token, get_user_id_from_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
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


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user."""
    # Validate password strength
    if len(request.password) < 6:
        return AuthResponse(success=False, error={
            "code": "WEAK_PASSWORD",
            "message": "Password must be at least 6 characters"
        })

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    password_hash = hash_password(request.password)

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Check if email already exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (request.email,))
            if cursor.fetchone():
                return AuthResponse(success=False, error={
                    "code": "EMAIL_EXISTS",
                    "message": "Email already registered"
                })

            # Create user
            cursor.execute(
                """INSERT INTO users (id, email, password_hash, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (user_id, request.email, password_hash, now, now)
            )

            # Create initial usage stats record
            cursor.execute(
                """INSERT INTO usage_stats (id, user_id, total_duration, files_analyzed, languages_used, storage_used, last_updated)
                   VALUES (?, ?, 0, 0, '[]', 0, ?)""",
                (str(uuid.uuid4()), user_id, now)
            )

            # Create default project
            project_id = str(uuid.uuid4())
            cursor.execute(
                """INSERT INTO projects (id, user_id, name, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (project_id, user_id, "我的项目", now, now)
            )

        # Generate token
        token = create_access_token(user_id)

        return AuthResponse(success=True, data={
            "user_id": user_id,
            "email": request.email,
            "token": token,
            "project_id": project_id
        })

    except Exception as e:
        return AuthResponse(success=False, error={
            "code": "REGISTRATION_FAILED",
            "message": str(e)
        })


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login a user."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Find user by email
            cursor.execute(
                "SELECT id, email, password_hash FROM users WHERE email = ?",
                (request.email,)
            )
            user = cursor.fetchone()

            if not user:
                return AuthResponse(success=False, error={
                    "code": "USER_NOT_FOUND",
                    "message": "Email not registered"
                })

            # Verify password
            if not verify_password(request.password, user["password_hash"]):
                return AuthResponse(success=False, error={
                    "code": "INVALID_PASSWORD",
                    "message": "Incorrect password"
                })

            # Get user's default project
            cursor.execute(
                "SELECT id FROM projects WHERE user_id = ? ORDER BY created_at LIMIT 1",
                (user["id"],)
            )
            project = cursor.fetchone()

            # Generate token
            token = create_access_token(user["id"])

            return AuthResponse(success=True, data={
                "user_id": user["id"],
                "email": user["email"],
                "token": token,
                "project_id": project["id"] if project else None
            })

    except Exception as e:
        return AuthResponse(success=False, error={
            "code": "LOGIN_FAILED",
            "message": str(e)
        })


@router.get("/me", response_model=AuthResponse)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current logged in user info."""
    user_id = get_current_user_id(authorization)

    if not user_id:
        return AuthResponse(success=False, error={
            "code": "NOT_AUTHENTICATED",
            "message": "Not logged in"
        })

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, email, created_at FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()

            if not user:
                return AuthResponse(success=False, error={
                    "code": "USER_NOT_FOUND",
                    "message": "User not found"
                })

            return AuthResponse(success=True, data={
                "user_id": user["id"],
                "email": user["email"],
                "username": user.get("username"),
                "phone": user.get("phone"),
                "created_at": user["created_at"]
            })

    except Exception as e:
        return AuthResponse(success=False, error={
            "code": "GET_USER_FAILED",
            "message": str(e)
        })


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    phone: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.put("/profile", response_model=AuthResponse)
async def update_profile(
    request: UpdateProfileRequest,
    authorization: Optional[str] = Header(None)
):
    """Update user profile (username, phone, password)."""
    user_id = get_current_user_id(authorization)

    if not user_id:
        return AuthResponse(success=False, error={
            "code": "NOT_AUTHENTICATED",
            "message": "Not logged in"
        })

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Get current user
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()

            if not user:
                return AuthResponse(success=False, error={
                    "code": "USER_NOT_FOUND",
                    "message": "User not found"
                })

            # If changing password, verify current password
            if request.new_password:
                if not request.current_password:
                    return AuthResponse(success=False, error={
                        "code": "CURRENT_PASSWORD_REQUIRED",
                        "message": "Current password is required"
                    })

                if not verify_password(request.current_password, user["password_hash"]):
                    return AuthResponse(success=False, error={
                        "code": "INVALID_PASSWORD",
                        "message": "Current password is incorrect"
                    })

                if len(request.new_password) < 6:
                    return AuthResponse(success=False, error={
                        "code": "WEAK_PASSWORD",
                        "message": "New password must be at least 6 characters"
                    })

            # Build update query
            updates = []
            params = []

            if request.username is not None:
                updates.append("username = ?")
                params.append(request.username)

            if request.phone is not None:
                updates.append("phone = ?")
                params.append(request.phone)

            if request.new_password:
                updates.append("password_hash = ?")
                params.append(hash_password(request.new_password))
                # Increment token_version to invalidate old tokens
                updates.append("token_version = ?")
                try:
                    token_version = user["token_version"]
                except (KeyError, TypeError):
                    token_version = 0
                params.append(token_version + 1)

            if updates:
                from datetime import datetime
                updates.append("updated_at = ?")
                params.append(datetime.utcnow().isoformat())
                params.append(user_id)

                query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
                cursor.execute(query, params)

            password_changed = request.new_password is not None

            return AuthResponse(success=True, data={
                "user_id": user_id,
                "message": "Profile updated successfully",
                "password_changed": password_changed
            })

    except Exception as e:
        return AuthResponse(success=False, error={
            "code": "UPDATE_PROFILE_FAILED",
            "message": str(e)
        })
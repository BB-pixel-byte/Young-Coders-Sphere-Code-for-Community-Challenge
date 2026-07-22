import hashlib

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from ..models.database import get_db
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db

router = APIRouter()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    password: str = ""


class UserLogin(BaseModel):
    email: str
    password: str


@router.post("/register")
def register_user(user: UserCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check for duplicate email
        existing = cursor.execute(
            "SELECT id FROM users WHERE email = ?", (user.email,)
        ).fetchone()
        if existing:
            return {"error": "Email already registered"}

        cursor.execute(
            "INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)",
            (user.name, user.email, user.role, hash_password(user.password)),
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {"message": "User registered!", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/login")
def login_user(user: UserLogin):
    conn = get_db()
    cursor = conn.cursor()
    try:
        result = cursor.execute(
            "SELECT * FROM users WHERE email = ? AND password = ?",
            (user.email, hash_password(user.password)),
        ).fetchone()
        if not result:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        u = dict(result)
        return {
            "message": "Login successful!",
            "user_id": u["id"],
            "role": u["role"],
            "name": u["name"],
        }
    finally:
        conn.close()


@router.get("/{user_id}/stats")
def get_user_stats(user_id: int):
    """Return points and completed chore count for a user."""
    conn = get_db()
    cursor = conn.cursor()
    user = cursor.execute(
        "SELECT id, name, points FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    completed = cursor.execute(
        "SELECT COUNT(*) as count FROM chores WHERE volunteer_id = ? AND status = 'done'",
        (user_id,),
    ).fetchone()
    conn.close()
    return {
        "user_id": user["id"],
        "name": user["name"],
        "points": user["points"],
        "completed_chores": completed["count"],
    }


@router.get("/{user_id}")
def get_user(user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    user = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not user:
        return {"error": "User not found"}
    return dict(user)

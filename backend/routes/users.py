import hashlib
import hmac
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

try:
    from ..models.database import get_db
    from ..security import issue_session, legacy_test_mode, require_identity, require_user
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db
    from security import issue_session, legacy_test_mode, require_identity, require_user

router = APIRouter()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 260_000)
    return f"pbkdf2_sha256$260000${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("pbkdf2_sha256$"):
        try:
            _, rounds, salt, expected = stored.split("$", 3)
            digest = hashlib.pbkdf2_hmac(
                "sha256", password.encode(), bytes.fromhex(salt), int(rounds)
            )
            return hmac.compare_digest(digest, bytes.fromhex(expected))
        except (ValueError, TypeError):
            return False
    # Upgrade accounts created by the earlier prototype after a successful login.
    return hmac.compare_digest(hashlib.sha256(password.encode()).hexdigest(), stored or "")


class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    password: str = ""
    invite_code: str = ""


class UserLogin(BaseModel):
    email: str
    password: str


@router.post("/register")
def register_user(user: UserCreate):
    name, email = user.name.strip(), user.email.strip().lower()
    if not legacy_test_mode():
        expected = os.environ.get("PILOT_INVITE_CODE")
        if not expected:
            raise HTTPException(status_code=503, detail="Pilot registration is not open yet.")
        db_path = os.path.abspath(
            os.environ.get("CHORE4MORE_DB_PATH") or os.environ.get("CHOREMAP_DB_PATH")
            or "chore4more.db"
        )
        if db_path == "/tmp/chore4more.db":
            raise HTTPException(status_code=503, detail="Pilot storage is not ready yet.")
        if not hmac.compare_digest(user.invite_code, expected):
            raise HTTPException(status_code=403, detail="Invalid pilot invitation code.")
        if user.role not in {"senior", "volunteer"}:
            raise HTTPException(status_code=400, detail="Choose a senior or volunteer account.")
        if not name or len(name) > 100 or "@" not in email or len(email) > 254:
            raise HTTPException(status_code=400, detail="Please enter a name and valid email.")
        if len(user.password) < 10:
            raise HTTPException(status_code=400, detail="Use a password with at least 10 characters.")
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check for duplicate email
        existing = cursor.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        ).fetchone()
        if existing:
            if legacy_test_mode():
                return {"error": "Email already registered"}
            raise HTTPException(status_code=409, detail="Email already registered")

        cursor.execute(
            "INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)",
            (name, email, user.role, hash_password(user.password)),
        )
        conn.commit()
        user_id = cursor.lastrowid
        token = issue_session(conn, user_id)
        return {"message": "User registered!", "user_id": user_id,
                "name": name, "role": user.role, "token": token}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Registration failed.") from e
    finally:
        conn.close()


@router.post("/login")
def login_user(user: UserLogin):
    conn = get_db()
    cursor = conn.cursor()
    try:
        result = cursor.execute("SELECT * FROM users WHERE email = ?", (user.email.strip().lower(),)).fetchone()
        if not result or not verify_password(user.password, result["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not result["password"].startswith("pbkdf2_sha256$"):
            cursor.execute("UPDATE users SET password = ? WHERE id = ?",
                           (hash_password(user.password), result["id"]))
            conn.commit()
        token = issue_session(conn, result["id"])
        u = dict(result)
        return {
            "message": "Login successful!",
            "user_id": u["id"],
            "role": u["role"],
            "name": u["name"],
            "token": token,
        }
    finally:
        conn.close()


@router.get("/{user_id}/stats")
def get_user_stats(user_id: int, actor=Depends(require_user)):
    """Return points and completed chore count for a user."""
    require_identity(actor, user_id)
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
def get_user(user_id: int, actor=Depends(require_user)):
    require_identity(actor, user_id)
    conn = get_db()
    cursor = conn.cursor()
    user = cursor.execute(
        "SELECT id, name, email, role, points, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if not user:
        return {"error": "User not found"}
    return dict(user)

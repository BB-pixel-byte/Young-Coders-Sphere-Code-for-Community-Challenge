"""Opaque sessions for the small, invitation-only pilot."""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Header, HTTPException

try:
    from .models.database import get_db
except ImportError:  # pragma: no cover - direct backend execution
    from models.database import get_db


def legacy_test_mode() -> bool:
    """Keep the original API tests isolated from the production pilot API."""
    return os.environ.get("CHORE4MORE_TEST_MODE") == "1"


def issue_session(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    conn.execute(
        "INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        (hashlib.sha256(token.encode()).hexdigest(), user_id, expires),
    )
    conn.commit()
    return token


def require_user(authorization: str | None = Header(default=None)):
    if legacy_test_mode():
        return None
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please sign in again.")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    conn = get_db()
    try:
        row = conn.execute(
            """SELECT users.id, users.role FROM user_sessions
               JOIN users ON users.id = user_sessions.user_id
               WHERE token_hash = ? AND expires_at > ?""",
            (hashlib.sha256(token.encode()).hexdigest(), datetime.now(timezone.utc).isoformat()),
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    return dict(row)


def require_identity(actor, user_id: int, role: str | None = None):
    if actor is None and legacy_test_mode():
        return
    if actor is None or actor["id"] != user_id or (role and actor["role"] != role):
        raise HTTPException(status_code=403, detail="This action is not available to your account.")


def require_role(actor, role: str):
    if actor is None and legacy_test_mode():
        return
    if actor is None or actor["role"] != role:
        raise HTTPException(status_code=403, detail="This action is not available to your account.")

from fastapi import APIRouter

try:
    from ..models.database import get_db
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db

router = APIRouter()


@router.get("")
def get_rewards():
    conn = get_db()
    cursor = conn.cursor()
    rewards = cursor.execute(
        "SELECT id, title, points_needed, business_name, description FROM rewards ORDER BY points_needed ASC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rewards]

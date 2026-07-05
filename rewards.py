
import secrets

from fastapi import APIRouter, HTTPException
from models.database import gefrom fastapi import APIRouter

try:
    from ..models.database import get_db
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db

router = APIRouter()


def _new_redemption_code(cursor):
    for _ in range(8):
        code = f"CHORE-{secrets.token_hex(3).upper()}"
        existing = cursor.execute(
            "SELECT id FROM reward_redemptions WHERE redemption_code = ?", (code,)
        ).fetchone()
        if not existing:
            return code
    raise HTTPException(status_code=500, detail="Could not generate redemption code")


@router.get("")
def get_rewards():
    conn = get_db()
    cursor = conn.cursor()
    rewards = cursor.execute(
        "SELECT id, title, points_needed, business_name, description FROM rewards ORDER BY points_needed ASC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rewards]


@router.post("/{reward_id}/redeem")
def redeem_reward(reward_id: int, volunteer_id: int):
    conn = get_db()
    cursor = conn.cursor()

    volunteer = cursor.execute(
        "SELECT id, role, points FROM users WHERE id = ?", (volunteer_id,)
    ).fetchone()
    if not volunteer:
        conn.close()
        raise HTTPException(status_code=404, detail="Volunteer not found")
    if volunteer["role"] != "volunteer":
        conn.close()
        raise HTTPException(status_code=400, detail="Only volunteers can redeem rewards")

    reward = cursor.execute(
        "SELECT id, title, points_needed, business_name FROM rewards WHERE id = ?",
        (reward_id,)
    ).fetchone()
    if not reward:
        conn.close()
        raise HTTPException(status_code=404, detail="Reward not found")
    if volunteer["points"] < reward["points_needed"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Not enough points to redeem this reward")

    redemption_code = _new_redemption_code(cursor)
    new_points = volunteer["points"] - reward["points_needed"]
    cursor.execute("UPDATE users SET points = ? WHERE id = ?", (new_points, volunteer_id))
    cursor.execute(
        """
        INSERT INTO reward_redemptions
        (reward_id, volunteer_id, redemption_code, points_spent, status)
        VALUES (?, ?, ?, ?, 'active')
        """,
        (reward_id, volunteer_id, redemption_code, reward["points_needed"])
    )
    conn.commit()
    conn.close()

    return {
        "message": "Reward redeemed successfully",
        "reward_title": reward["title"],
        "business_name": reward["business_name"],
        "points_spent": reward["points_needed"],
        "remaining_points": new_points,
        "redemption_code": redemption_code,
        "instructions": f"Show code {redemption_code} at {reward['business_name']} to claim {reward['title']}."
    }


@router.get("/redemptions/{redemption_code}")
def verify_redemption(redemption_code: str):
    conn = get_db()
    cursor = conn.cursor()
    redemption = cursor.execute(
        """
        SELECT rr.redemption_code, rr.points_spent, rr.status, rr.created_at, rr.redeemed_at,
               r.title AS reward_title, r.business_name, u.name AS volunteer_name
        FROM reward_redemptions rr
        JOIN rewards r ON r.id = rr.reward_id
        JOIN users u ON u.id = rr.volunteer_id
        WHERE UPPER(rr.redemption_code) = UPPER(?)
        """,
        (redemption_code.strip(),)
    ).fetchone()
    conn.close()
    if not redemption:
        raise HTTPException(status_code=404, detail="Redemption code not found")
    return dict(redemption)


@router.post("/redemptions/{redemption_code}/use")
def use_redemption(redemption_code: str):
    conn = get_db()
    cursor = conn.cursor()
    redemption = cursor.execute(
        "SELECT id, status FROM reward_redemptions WHERE UPPER(redemption_code) = UPPER(?)",
        (redemption_code.strip(),)
    ).fetchone()
    if not redemption:
        conn.close()
        raise HTTPException(status_code=404, detail="Redemption code not found")
    if redemption["status"] != "active":
        conn.close()
        raise HTTPException(status_code=400, detail="This redemption code was already used")

    cursor.execute(
        "UPDATE reward_redemptions SET status = 'used', redeemed_at = CURRENT_TIMESTAMP WHERE id = ?",
        (redemption["id"],)
    )
    conn.commit()
    conn.close()
    return {"message": "Redemption marked as used"}

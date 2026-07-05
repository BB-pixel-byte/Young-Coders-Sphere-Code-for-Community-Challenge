from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

try:
    from ..models.database import get_db
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db

router = APIRouter()


class CommunityProfile(BaseModel):
    user_id: int
    skill_ids: List[int] = []
    organizations: List[str] = []
    teaching_skill_ids: List[int] = []
    learning_goal_ids: List[int] = []
    availability_horizon: str


def _clear_and_insert_many(conn, cursor, table: str, user_id: int, items: list, col: str):
    cursor.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
    for item in items:
        cursor.execute(
            f"INSERT OR IGNORE INTO {table} (user_id, {col}) VALUES (?, ?)",
            (user_id, item)
        )


def _validate_skill_ids(cursor, skill_ids: list, label: str):
    if not skill_ids:
        return
    unique_ids = list(set(skill_ids))
    placeholders = ",".join("?" for _ in unique_ids)
    found = cursor.execute(
        f"SELECT COUNT(*) FROM skills WHERE id IN ({placeholders})",
        unique_ids
    ).fetchone()[0]
    if found != len(unique_ids):
        raise HTTPException(
            status_code=400,
            detail=f"One or more {label} IDs are invalid"
        )


@router.post("/community")
def submit_community_profile(profile: CommunityProfile):
    conn = get_db()
    cursor = conn.cursor()
    try:
        valid_horizons = {"1_year", "1_to_3", "3_to_5", "5_plus"}
        if profile.availability_horizon not in valid_horizons:
            raise HTTPException(
                status_code=400,
                detail=f"availability_horizon must be one of {', '.join(sorted(valid_horizons))}"
            )

        user = cursor.execute(
            "SELECT id, role FROM users WHERE id = ?", (profile.user_id,)
        ).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        _validate_skill_ids(cursor, profile.skill_ids, "skill")
        _validate_skill_ids(cursor, profile.teaching_skill_ids, "teaching_skill")
        _validate_skill_ids(cursor, profile.learning_goal_ids, "learning_goal")

        _clear_and_insert_many(conn, cursor, "user_skills", profile.user_id, profile.skill_ids, "skill_id")
        _clear_and_insert_many(conn, cursor, "user_teaching", profile.user_id, profile.teaching_skill_ids, "skill_id")
        _clear_and_insert_many(conn, cursor, "user_learning_goals", profile.user_id, profile.learning_goal_ids, "skill_id")

        cursor.execute("DELETE FROM user_organizations WHERE user_id = ?", (profile.user_id,))
        for org in profile.organizations:
            cursor.execute(
                "INSERT OR IGNORE INTO user_organizations (user_id, organization_name) VALUES (?, ?)",
                (profile.user_id, org)
            )

        cursor.execute(
            "INSERT OR REPLACE INTO user_availability_horizon (user_id, horizon_bucket) VALUES (?, ?)",
            (profile.user_id, profile.availability_horizon)
        )

        conn.commit()
        return {"message": "Community profile saved!", "user_id": profile.user_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{user_id}")
def get_community_profile(user_id: int):
    conn = get_db()
    cursor = conn.cursor()

    user = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    skills_rows = cursor.execute("""
        SELECT s.id, s.name, s.category
        FROM skills s
        JOIN user_skills us ON s.id = us.skill_id
        WHERE us.user_id = ?
    """, (user_id,)).fetchall()

    orgs_rows = cursor.execute(
        "SELECT organization_name FROM user_organizations WHERE user_id = ?", (user_id,)
    ).fetchall()

    teaching_rows = cursor.execute("""
        SELECT s.id, s.name, s.category
        FROM skills s
        JOIN user_teaching ut ON s.id = ut.skill_id
        WHERE ut.user_id = ?
    """, (user_id,)).fetchall()

    learning_rows = cursor.execute("""
        SELECT s.id, s.name, s.category
        FROM skills s
        JOIN user_learning_goals ul ON s.id = ul.skill_id
        WHERE ul.user_id = ?
    """, (user_id,)).fetchall()

    horizon_row = cursor.execute(
        "SELECT horizon_bucket FROM user_availability_horizon WHERE user_id = ?", (user_id,)
    ).fetchone()

    conn.close()

    return {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "points": user["points"],
        },
        "skills": [{"id": r["id"], "name": r["name"], "category": r["category"]} for r in skills_rows],
        "organizations": [r["organization_name"] for r in orgs_rows],
        "teaching": [{"id": r["id"], "name": r["name"], "category": r["category"]} for r in teaching_rows],
        "learning_goals": [{"id": r["id"], "name": r["name"], "category": r["category"]} for r in learning_rows],
        "availability_horizon": horizon_row["horizon_bucket"] if horizon_row else None,
    }

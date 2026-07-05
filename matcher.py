"""Volunteer matching logic for the scoring engine."""

import json
import sqlite3

try:
    from ..models.database import get_db
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db

HORIZON_WEIGHTS = {
    "1_year": 1,
    "1_to_3": 2,
    "3_to_5": 3,
    "5_plus": 4,
}

def _normalize_skill(name: str) -> str:
    return " ".join(name.strip().lower().split())

def get_leaderboard():
    """Return top volunteers by points."""
    conn = get_db()
    cursor = conn.cursor()
    volunteers = cursor.execute("""
        SELECT name, points FROM users
        WHERE role = 'volunteer'
        ORDER BY points DESC LIMIT 10
    """).fetchall()
    conn.close()
    return [dict(v) for v in volunteers]

def match_volunteers_for_chore(chore_id: int):
    """Score and rank volunteers for a chore based on skill overlap and availability."""
    conn = get_db()
    cursor = conn.cursor()

    chore = cursor.execute(
        "SELECT ai_skills_needed FROM chores WHERE id = ?", (chore_id,)
    ).fetchone()
    if not chore:
        conn.close()
        return None, None

    try:
        skills_needed = (
            json.loads(chore["ai_skills_needed"]) if chore["ai_skills_needed"] else []
        )
    except (json.JSONDecodeError, TypeError):
        skills_needed = []

    volunteers = cursor.execute("""
        SELECT u.id, u.name, u.points
        FROM users u
        WHERE u.role = 'volunteer'
    """).fetchall()

    matches = []
    for v in volunteers:
        v_id = v["id"]

        volunteer_skills_rows = cursor.execute(
            """
            SELECT s.name FROM skills s
            JOIN user_skills us ON s.id = us.skill_id
            WHERE us.user_id = ?
        """,
            (v_id,),
        ).fetchall()
        volunteer_skill_names = {r["name"] for r in volunteer_skills_rows}
        normalized_volunteer_skills = {
            _normalize_skill(n) for n in volunteer_skill_names
        }

        matching_skills = [
            s
            for s in skills_needed
            if _normalize_skill(s) in normalized_volunteer_skills
        ]

        horizon_row = cursor.execute(
            "SELECT horizon_bucket FROM user_availability_horizon WHERE user_id = ?",
            (v_id,),
        ).fetchone()
        horizon = horizon_row["horizon_bucket"] if horizon_row else "1_year"
        horizon_weight = HORIZON_WEIGHTS.get(horizon, 0)

        overlap_count = len(matching_skills)
        match_score = (
            overlap_count * 100 + horizon_weight * 10 + min(v["points"] // 10, 9)
        )

        horizon_label = {
            "1_year": "within 1 year",
            "1_to_3": "1-3 years",
            "3_to_5": "3-5 years",
            "5_plus": "5+ years",
        }.get(horizon, horizon)

        matches.append(
            {
                "volunteer_id": v_id,
                "volunteer_name": v["name"],
                "matching_skills": matching_skills,
                "matching_skill_count": overlap_count,
                "total_skills": len(volunteer_skill_names),
                "availability_horizon": horizon,
                "points": v["points"],
                "match_score": match_score,
                "match_explanation": (
                    f"{v['name']} has {overlap_count} matching skill"
                    f"{'s' if overlap_count != 1 else ''}"
                    f" and {horizon_label} availability"
                    if overlap_count > 0
                    else f"{v['name']} has no matching skills but {horizon_label} availability"
                ),
            }
        )

    matches.sort(key=lambda m: m["match_score"], reverse=True)
    conn.close()

    return skills_needed, matches[:5]
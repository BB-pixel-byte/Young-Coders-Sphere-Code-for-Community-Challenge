from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

try:
    from ..models.database import get_db
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db

router = APIRouter()

class SkillSubmit(BaseModel):
    volunteer_id: int
    skill_ids: List[int]

@router.get("/quiz")
def get_quiz():
    conn = get_db()
    cursor = conn.cursor()
    skills = cursor.execute(
        "SELECT * FROM skills ORDER BY category"
    ).fetchall()
    conn.close()
    
    # Group by category
    quiz = {}
    for skill in skills:
        category = skill["category"]
        if category not in quiz:
            quiz[category] = []
        quiz[category].append({
            "id": skill["id"],
            "name": skill["name"]
        })
    
    return {"quiz": quiz}

@router.post("/submit")
def submit_skills(data: SkillSubmit):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Remove old skills first
        cursor.execute(
            "DELETE FROM user_skills WHERE user_id = ?",
            (data.volunteer_id,)
        )
        # Add new skills
        for skill_id in data.skill_ids:
            cursor.execute(
                "INSERT INTO user_skills (user_id, skill_id) VALUES (?, ?)",
                (data.volunteer_id, skill_id)
            )
        conn.commit()
        return {"message": "Skills saved successfully!"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@router.get("/volunteer/{volunteer_id}")
def get_volunteer_skills(volunteer_id: int):
    conn = get_db()
    cursor = conn.cursor()
    skills = cursor.execute("""
        SELECT s.name, s.category 
        FROM skills s
        JOIN user_skills us ON s.id = us.skill_id
        WHERE us.user_id = ?
    """, (volunteer_id,)).fetchall()
    conn.close()
    return {"skills": [dict(s) for s in skills]}
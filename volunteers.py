from fastapi import APIRouter, HTTPException

try:
    from ..services.matcher import get_leaderboard, match_volunteers_for_chore
except ImportError:  # pragma: no cover - fallback for direct script execution
    from services.matcher import get_leaderboard, match_volunteers_for_chore

router = APIRouter()


@router.get("/leaderboard")
def leaderboard():
    return get_leaderboard()


@router.get("/match/{chore_id}")
def match_volunteer(chore_id: int):
    skills_needed, matches = match_volunteers_for_chore(chore_id)
    if skills_needed is None:
        raise HTTPException(status_code=404, detail="Chore not found")
    return {
        "chore_id": chore_id,
        "skills_needed": skills_needed,
        "matches": matches,
    }

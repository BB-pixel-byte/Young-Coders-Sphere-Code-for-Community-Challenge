import json
import os
import shutil
import uuid
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

try:
    from ..models.database import get_db
    from ..services.ai_analyzer import analyze_chore_images
except ImportError:  # pragma: no cover - direct backend execution
    from models.database import get_db
    from services.ai_analyzer import analyze_chore_images

router = APIRouter()


def _parse_ai_json(value):
    if not value:
        return []
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []


def _chore_response(chore_row, media_rows):
    chore = dict(chore_row)
    for field in ("ai_tools", "ai_steps", "ai_skills_needed"):
        chore[field] = _parse_ai_json(chore.get(field))
    chore["media"] = [dict(media) for media in media_rows]
    return chore


def _media_for(cursor, chore_id):
    return cursor.execute(
        "SELECT id, file_path, media_type FROM chore_media WHERE chore_id = ?",
        (chore_id,),
    ).fetchall()


@router.post("/analyze")
async def analyze_chore(
    description: str = Form(""),
    image: UploadFile = File(...),
):
    image_bytes = await image.read()
    analysis = analyze_chore_images(
        image_bytes=image_bytes,
        media_type=image.content_type or "image/jpeg",
        description=description,
    )
    return {"analysis": analysis}


@router.post("/post")
async def post_chore(
    senior_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("other"),
    urgency: str = Form("flexible"),
    location: str = Form(""),
    ai_tools: str = Form(""),
    ai_steps: str = Form(""),
    ai_skills_needed: str = Form(""),
    ai_difficulty: str = Form(""),
    ai_estimated_time: str = Form(""),
    ai_safety_notes: str = Form(""),
    images: Optional[List[UploadFile]] = File(None),
    video: Optional[UploadFile] = File(None),
):
    image_paths = []
    image_bytes = None
    image_media_type = "image/jpeg"

    if images and len(images) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 photos allowed")

    os.makedirs("uploads", exist_ok=True)
    for image in images or []:
        if not image.filename:
            continue
        content = await image.read()
        if image_bytes is None:
            image_bytes = content
            image_media_type = image.content_type or "image/jpeg"
        safe_name = os.path.basename(image.filename)
        path = f"uploads/{uuid.uuid4().hex}_{safe_name}"
        with open(path, "wb") as saved:
            saved.write(content)
        image_paths.append(path)

    video_path = None
    if video and video.filename:
        safe_name = os.path.basename(video.filename)
        video_path = f"uploads/{uuid.uuid4().hex}_{safe_name}"
        with open(video_path, "wb") as saved:
            shutil.copyfileobj(video.file, saved)

    analysis = None
    if image_bytes is not None:
        analysis = analyze_chore_images(
            image_bytes=image_bytes,
            media_type=image_media_type,
            description=description,
        )
        if not ai_tools:
            ai_tools = json.dumps(analysis.get("tools_needed", []))
        if not ai_steps:
            ai_steps = json.dumps(analysis.get("steps", []))
        if not ai_skills_needed:
            ai_skills_needed = json.dumps(analysis.get("skills_needed", []))
        ai_difficulty = ai_difficulty or analysis.get("difficulty", "")
        ai_estimated_time = ai_estimated_time or analysis.get("estimated_time", "")
        ai_safety_notes = ai_safety_notes or analysis.get("safety_notes", "")

    conn = get_db()
    cursor = conn.cursor()
    try:
        user = cursor.execute(
            "SELECT id, role FROM users WHERE id = ?", (senior_id,)
        ).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Senior user not found")
        if user["role"] != "senior":
            raise HTTPException(status_code=400, detail="Only seniors can post chores")

        cursor.execute(
            """
            INSERT INTO chores
            (senior_id, title, description, category, urgency, location,
             ai_tools, ai_steps, ai_skills_needed, ai_difficulty,
             ai_estimated_time, ai_safety_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                senior_id, title, description, category, urgency, location,
                ai_tools, ai_steps, ai_skills_needed, ai_difficulty,
                ai_estimated_time, ai_safety_notes,
            ),
        )
        chore_id = cursor.lastrowid

        for path in image_paths:
            cursor.execute(
                "INSERT INTO chore_media (chore_id, file_path, media_type) VALUES (?, ?, 'photo')",
                (chore_id, path),
            )
        if video_path:
            cursor.execute(
                "INSERT INTO chore_media (chore_id, file_path, media_type) VALUES (?, ?, 'video')",
                (chore_id, video_path),
            )
        conn.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    finally:
        conn.close()

    return {
        "chore_id": chore_id,
        "message": "Chore posted successfully!",
        "ai_analysis": analysis,
    }


@router.get("/all")
def get_all_chores():
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute(
        "SELECT * FROM chores WHERE status = 'open' ORDER BY created_at DESC, id DESC"
    ).fetchall()
    result = [_chore_response(row, _media_for(cursor, row["id"])) for row in rows]
    conn.close()
    return result


@router.get("/senior/{senior_id}")
def get_senior_chores(senior_id: int):
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute(
        "SELECT * FROM chores WHERE senior_id = ? ORDER BY created_at DESC, id DESC",
        (senior_id,),
    ).fetchall()
    result = [_chore_response(row, _media_for(cursor, row["id"])) for row in rows]
    conn.close()
    return result


@router.get("/volunteer/{volunteer_id}")
def get_volunteer_chores(volunteer_id: int):
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute(
        "SELECT * FROM chores WHERE volunteer_id = ? ORDER BY created_at DESC, id DESC",
        (volunteer_id,),
    ).fetchall()
    result = [_chore_response(row, _media_for(cursor, row["id"])) for row in rows]
    conn.close()
    return result


@router.get("/{chore_id}")
def get_chore(chore_id: int):
    conn = get_db()
    cursor = conn.cursor()
    chore = cursor.execute("SELECT * FROM chores WHERE id = ?", (chore_id,)).fetchone()
    if not chore:
        conn.close()
        raise HTTPException(status_code=404, detail="Chore not found")
    result = _chore_response(chore, _media_for(cursor, chore_id))
    conn.close()
    return result


@router.post("/{chore_id}/claim")
def claim_chore(chore_id: int, volunteer_id: int):
    conn = get_db()
    cursor = conn.cursor()
    chore = cursor.execute("SELECT id FROM chores WHERE id = ?", (chore_id,)).fetchone()
    if not chore:
        conn.close()
        raise HTTPException(status_code=404, detail="Chore not found")
    volunteer = cursor.execute(
        "SELECT id, role FROM users WHERE id = ?", (volunteer_id,)
    ).fetchone()
    if not volunteer:
        conn.close()
        raise HTTPException(status_code=404, detail="Volunteer not found")
    if volunteer["role"] != "volunteer":
        conn.close()
        raise HTTPException(status_code=400, detail="Only volunteers can claim chores")

    cursor.execute(
        """UPDATE chores
           SET status = 'claimed', volunteer_id = ?, claimed_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'open'""",
        (volunteer_id, chore_id),
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Chore not available for claiming")
    conn.commit()
    conn.close()
    return {"message": "Chore claimed successfully!"}


@router.post("/{chore_id}/complete")
def complete_chore(chore_id: int, volunteer_id: int = None):
    conn = get_db()
    cursor = conn.cursor()
    chore = cursor.execute(
        "SELECT id, status, volunteer_id FROM chores WHERE id = ?", (chore_id,)
    ).fetchone()
    if not chore:
        conn.close()
        raise HTTPException(status_code=404, detail="Chore not found")
    if chore["status"] != "claimed":
        conn.close()
        raise HTTPException(status_code=400, detail="Chore must be claimed before completing")
    if chore["volunteer_id"] is None:
        conn.close()
        raise HTTPException(status_code=400, detail="Chore has no claiming volunteer")
    if volunteer_id is not None and chore["volunteer_id"] != volunteer_id:
        conn.close()
        raise HTTPException(status_code=400, detail="Only the claiming volunteer can complete this chore")

    effective_volunteer = volunteer_id or chore["volunteer_id"]
    cursor.execute(
        """UPDATE chores
           SET status = 'done', completed_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'claimed'""",
        (chore_id,),
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Chore status changed; completion race lost")
    cursor.execute(
        "UPDATE users SET points = points + 50 WHERE id = ?",
        (effective_volunteer,),
    )
    conn.commit()
    conn.close()
    return {"message": "Chore completed! 50 points awarded!"}

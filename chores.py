import base64
import json
import os
import shutil
import tempfile
import uuid
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

try:
    from ..models.database import get_db
    from ..services.ai_analyzer import analyze_chore_images
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db
    from services.ai_analyzer import analyze_chore_images

router = APIRouter()
MAX_PHOTOS = 3
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


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
    media = []
    for m in media_rows:
        m = dict(m)
        m.pop("chore_id", None)
        media.append(m)
    chore["media"] = media
    return chore


async def _save_photo_upload(upload: UploadFile, folder: str = "uploads") -> str:
    if not upload or not upload.filename:
        raise HTTPException(status_code=400, detail="Photo upload is missing a filename")
    if upload.content_type and upload.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    contents = await upload.read()
    if len(contents) > MAX_PHOTO_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Each photo must be smaller than 5MB")

    os.makedirs(folder, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{os.path.basename(upload.filename)}"
    path = os.path.join(folder, unique_name)
    with open(path, "wb") as f:
        f.write(contents)
    return path


# ─── AI ANALYZE ENDPOINT ────────────────────────────────
class AnalyzeRequest(BaseModel):
    image_base64: str
    description: str = ""

@router.post("/post")
async def create_chore(
    title: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    file: UploadFile = File(None)  # This captures the optional uploaded image file
):
    ai_analysis = None
    
    # If the user uploaded an image, read its bytes and analyze it!
    if file:
        file_bytes = await file.read()
        media_type = file.content_type or "image/jpeg"
        
        # Call your updated AI function
        ai_analysis = analyze_chore_images(
            image_bytes=file_bytes, 
            media_type=media_type, 
            description=description
        )
        
    # TODO: Save to your SQLite database here 
    # (e.g., include ai_analysis in your DB model if you want to store it)
    
    return {
        "message": "Chore posted successfully!",
        "ai_suggestions": ai_analysis
    }


# ─── POST CHORE ─────────────────────────────────────────
@router.post("/post")
async def post_chore(
    senior_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("other"),
    urgency: str = Form("flexible"),
    location: str = Form(""),
    scheduled_time: str = Form(""),
    ai_tools: str = Form(""),
    ai_steps: str = Form(""),
    ai_skills_needed: str = Form(""),
    ai_difficulty: str = Form(""),
    ai_estimated_time: str = Form(""),
    ai_safety_notes: str = Form(""),
    images: Optional[List[UploadFile]] = File(None),
    video: Optional[UploadFile] = File(None),
):
    os.makedirs("uploads", exist_ok=True)
    image_paths = []

    if images:
        if len(images) > MAX_PHOTOS:
            raise HTTPException(status_code=400, detail=f"Maximum {MAX_PHOTOS} photos allowed")
        for img in images:
            if img.filename:
                image_paths.append(await _save_photo_upload(img))

    video_path = None
    if video and video.filename:
        unique_name = f"{uuid.uuid4().hex}_{video.filename}"
        video_path = f"uploads/{unique_name}"
        with open(video_path, "wb") as f:
            shutil.copyfileobj(video.file, f)

    conn = get_db()
    cursor = conn.cursor()
    try:
        user = cursor.execute(
            "SELECT id FROM users WHERE id = ?", (senior_id,)
        ).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Senior user not found")

        cursor.execute(
            """
            INSERT INTO chores
<<<<<<< HEAD
            (senior_id, title, description, location, scheduled_time,
             ai_tools, ai_steps, ai_skills_needed,
             ai_difficulty, ai_estimated_time, ai_safety_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            senior_id, title, description, location, scheduled_time,
            ai_tools, ai_steps, ai_skills_needed,
            ai_difficulty, ai_estimated_time, ai_safety_notes,
        )
            (senior_id, title, description, category, urgency, location,
             ai_tools, ai_steps, ai_skills_needed,
             ai_difficulty, ai_estimated_time, ai_safety_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                senior_id,
                title,
                description,
                category,
                urgency,
                location,
                ai_tools,
                ai_steps,
                ai_skills_needed,
                ai_difficulty,
                ai_estimated_time,
                ai_safety_notes,
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    return {"chore_id": chore_id, "message": "Chore posted successfully!"}


@router.get("/all")
def get_all_chores():
    conn = get_db()
    cursor = conn.cursor()
    chores = cursor.execute("SELECT * FROM chores WHERE status = 'open'").fetchall()
    result = []
    for chore in chores:
        media = cursor.execute(
            "SELECT id, file_path, media_type FROM chore_media WHERE chore_id = ?",
            (chore["id"],),
        ).fetchall()
        result.append(_chore_response(chore, media))
    conn.close()
    return result


@router.get("/senior/{senior_id}")
def get_senior_chores(senior_id: int):
    conn = get_db()
    cursor = conn.cursor()
    chores = cursor.execute("""
        SELECT chores.*, users.name AS volunteer_name
        FROM chores
        LEFT JOIN users ON users.id = chores.volunteer_id
        WHERE chores.senior_id = ?
        ORDER BY chores.created_at DESC
    """, (senior_id,)).fetchall()
    result = []
    for chore in chores:
        media = cursor.execute(
            "SELECT id, file_path, media_type FROM chore_media WHERE chore_id = ?",
            (chore["id"],)
        ).fetchall()
        result.append(_chore_response(chore, media))
    conn.close()
    return result


@router.get("/volunteer/{volunteer_id}")
def get_volunteer_chores(volunteer_id: int):
    conn = get_db()
    cursor = conn.cursor()
    chores = cursor.execute("""
        SELECT chores.*, users.name AS volunteer_name
        FROM chores
        LEFT JOIN users ON users.id = chores.volunteer_id
        WHERE chores.volunteer_id = ?
        ORDER BY chores.created_at DESC
    """, (volunteer_id,)).fetchall()
    result = []
    for chore in chores:
        media = cursor.execute(
            "SELECT id, file_path, media_type FROM chore_media WHERE chore_id = ?",
            (chore["id"],)
        ).fetchall()
        result.append(_chore_response(chore, media))
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
    media = cursor.execute(
        "SELECT id, file_path, media_type FROM chore_media WHERE chore_id = ?",
        (chore_id,),
    ).fetchall()
    conn.close()
    return _chore_response(chore, media)


@router.post("/{chore_id}/claim")
def claim_chore(chore_id: int, volunteer_id: int):
    conn = get_db()
    cursor = conn.cursor()

    chore = cursor.execute(
        "SELECT id, status FROM chores WHERE id = ?", (chore_id,)
    ).fetchone()
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
        """
        UPDATE chores SET status = 'claimed', volunteer_id = ?
        WHERE id = ? AND status = 'open'
    """,
        (volunteer_id, chore_id),
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Chore not available for claiming")

    conn.commit()
    conn.close()
    return {"message": "Chore claimed successfully!"}


@router.post("/{chore_id}/submit-completion")
async def submit_completion(
    chore_id: int,
    volunteer_id: int,
    completion_note: str = Form(""),
    completion_proof: str = Form(""),
    completion_proof_file: Optional[UploadFile] = File(None),
):
    conn = get_db()
    cursor = conn.cursor()

    chore = cursor.execute(
        "SELECT id, status, volunteer_id, senior_id FROM chores WHERE id = ?",
        (chore_id,)
    ).fetchone()
    if not chore:
        conn.close()
        raise HTTPException(status_code=404, detail="Chore not found")
    if chore["status"] not in ("claimed", "rejected"):
        conn.close()
        raise HTTPException(status_code=400, detail="Chore must be claimed before submitting completion")
    if chore["volunteer_id"] != volunteer_id:
        conn.close()
        raise HTTPException(status_code=400, detail="Only the claiming volunteer can submit completion")

    proof_value = completion_proof
    if completion_proof_file and completion_proof_file.filename:
        proof_value = await _save_photo_upload(completion_proof_file, folder="uploads/completion_proofs")

    cursor.execute(
        "UPDATE chores SET status = 'pending_review', completion_note = ?, completion_proof = ?, completion_status = 'pending_review' WHERE id = ?",
        (completion_note, proof_value, chore_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Completion submitted for senior review"}


@router.post("/{chore_id}/review")
def review_completion(chore_id: int, senior_id: int, approved: bool, review_text: str = Form(""), review_rating: int = Form(5)):
    conn = get_db()
    cursor = conn.cursor()

    chore = cursor.execute(
        "SELECT id, senior_id, volunteer_id, status FROM chores WHERE id = ?",
        (chore_id,)
    ).fetchone()
    if not chore:
        conn.close()
        raise HTTPException(status_code=404, detail="Chore not found")
    if chore["senior_id"] != senior_id:
        conn.close()
        raise HTTPException(status_code=400, detail="Only the chore owner can review completion")
    if chore["status"] != "pending_review":
        conn.close()
        raise HTTPException(status_code=400, detail="Only chores pending review can be approved or rejected")

    if approved:
        cursor.execute(
            "UPDATE chores SET status = 'done', review_text = ?, review_rating = ?, completion_status = 'approved' WHERE id = ?",
            (review_text, review_rating, chore_id)
        )
        if chore["volunteer_id"] is not None:
            cursor.execute(
                "UPDATE users SET points = points + 50 WHERE id = ?",
                (chore["volunteer_id"],)
            )
    else:
        cursor.execute(
            "UPDATE chores SET status = 'rejected', review_text = ?, review_rating = ?, completion_status = 'rejected' WHERE id = ?",
            (review_text, review_rating, chore_id)
        )

    conn.commit()
    conn.close()
    return {"message": "Review submitted successfully"}


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
        raise HTTPException(
            status_code=400, detail="Chore must be claimed before completing"
        )
    if chore["volunteer_id"] is None:
        conn.close()
        raise HTTPException(status_code=400, detail="Chore has no claiming volunteer")

    effective_volunteer = volunteer_id or chore["volunteer_id"]
    if volunteer_id is not None and chore["volunteer_id"] != volunteer_id:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Only the claiming volunteer can complete this chore",
        )


        "UPDATE chores SET status = 'pending_review', completion_status = 'pending_review' WHERE id = ? AND status = 'claimed'",
        (chore_id,)
        "UPDATE chores SET status = 'done' WHERE id = ? AND status = 'claimed'",
        (chore_id,),
    )
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(
            status_code=400, detail="Chore status changed; completion race lost"
        )

    conn.commit()
    conn.close()
    return {"message": "Chore marked ready for senior review"}
    cursor.execute(
        "UPDATE users SET points = points + 50 WHERE id = ?", (effective_volunteer,)
    )
    conn.commit()
    conn.close()
    return {"message": "Chore completed! 50 points awarded!"}

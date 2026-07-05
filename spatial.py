import os
import sqlite3
from shutil import copyfileobj
from fastapi import APIRouter, File, HTTPException, UploadFile

try:
    from ..models.database import get_db
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db

router = APIRouter(prefix="/api/spatial", tags=["Spatial Pipeline"])

# Path where your files will be stored safely
UPLOAD_DIR = os.path.join("backend", "static", "spatial_scans")


@router.post("/upload/{chore_id}")
async def upload_spatial_scan(chore_id: int, file: UploadFile = File(...)):
    """Receives ARKit / Polycam files from the iOS app and saves them locally."""
    # Read the incoming file extension (.usdz, .zip, etc.)
    file_extension = os.path.splitext(file.filename)[1]

    # Generate a standard name format for this chore scan
    saved_filename = f"spatial_chore_{chore_id}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    try:
        # Stream the uploaded file contents directly onto the MacBook hard drive
        with open(file_path, "wb") as buffer:
            copyfileobj(file.file, buffer)

        # Save the file reference string to our chore database
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE chores SET spatial_asset_path = ? WHERE id = ?",
            (file_path, chore_id),
        )
        conn.commit()
        conn.close()

        return {
            "status": "success",
            "message": f"Spatial file successfully linked to chore #{chore_id}",
            "saved_path": file_path,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save spatial asset: {str(e)}"
        )
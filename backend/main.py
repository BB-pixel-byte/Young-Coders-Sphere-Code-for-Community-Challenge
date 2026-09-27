from dotenv import load_dotenv
load_dotenv()

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

try:
    from .models.database import init_db
    from .security import legacy_test_mode
    from .routes import analytics, users, chores, volunteers, skills, profiles, rewards, spatial
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import init_db
    from security import legacy_test_mode
    from routes import analytics, users, chores, volunteers, skills, profiles, rewards, spatial


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Chore4More API", lifespan=lifespan)

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(chores.router, prefix="/chores", tags=["Chores"])
app.include_router(analytics.router, prefix="/analytics", tags=["Private analytics"])

# Earlier experimental endpoints use untrusted numeric IDs. Keep them available
# only to the legacy test suite until they receive account-level authorization.
if legacy_test_mode():
    app.include_router(volunteers.router, prefix="/volunteers", tags=["Volunteers"])
    app.include_router(skills.router, prefix="/skills", tags=["Skills"])
    app.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])
    app.include_router(rewards.router, prefix="/rewards", tags=["Rewards"])
    app.include_router(spatial.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Chore4More"}


PROJECT_ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = PROJECT_ROOT / "uploads"
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

if legacy_test_mode():
    UPLOAD_DIR.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        requested = FRONTEND_DIST / full_path
        if full_path and requested.is_file():
            return FileResponse(requested)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/", include_in_schema=False)
    def root():
        return {
            "message": "Chore4More API is running.",
            "setup": "Build the frontend to serve the website from this address.",
        }

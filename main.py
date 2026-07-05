from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from contextlib import asynccontextmanager

try:
    from .models.database import init_db
    from .routes import users, chores, volunteers, skills, profiles, rewards, spatial
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import init_db
    from routes import users, chores, volunteers, skills, profiles, rewards, spatial


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="ChoreMap API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(chores.router, prefix="/chores", tags=["Chores"])
app.include_router(volunteers.router, prefix="/volunteers", tags=["Volunteers"])
app.include_router(skills.router, prefix="/skills", tags=["Skills"])
app.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])
app.include_router(rewards.router, prefix="/rewards", tags=["Rewards"])
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.include_router(spatial.router)

@app.get("/")
def root():
    return {
        "message": "ChoreMap API is running! ",
        "docs": "Visit /docs to test all endpoints"
    }

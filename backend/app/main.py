from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator
import logging
import os

from app.database import init_db, get_session
from app.models import User
from app.routers import wardrobe, users, admin
from app.services.ai_service import get_daily_suggestions, chat_with_stylist
from app.auth import get_current_user

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class WeatherRequest(BaseModel):
    temperature: float
    description: str
    ville: str = "Paris"


class ChatRequest(BaseModel):
    message: str
    history: list = []

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le message ne peut pas être vide")
        if len(v) > 1000:
            raise ValueError("Message trop long (max 1000 caractères)")
        return v

    @field_validator("history")
    @classmethod
    def history_limit(cls, v: list) -> list:
        return v[-20:]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    admin_key = os.getenv("ADMIN_KEY")
    if not admin_key:
        logger.warning("ADMIN_KEY non définie — endpoints admin non protégés")
    elif len(admin_key) < 16:
        raise RuntimeError("ADMIN_KEY trop courte (minimum 16 caractères)")
    await init_db()
    logger.info("Digital Stylist API démarrée")
    yield

app = FastAPI(title="Digital Stylist API", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Global exception handler — catch-all for unhandled errors
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Let HTTPException pass through to FastAPI's default handler
    if isinstance(exc, HTTPException):
        raise exc
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur"},
    )


# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://digital-stylist-mvp.vercel.app",
    "https://digital-stylist-mvp.onrender.com",
]

origin_regex = r"https://digital-stylist-mvp.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers
app.include_router(wardrobe.router)
app.include_router(users.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Digital Stylist API"}

@app.post("/suggestions/{user_id}")
async def daily_suggestions(
    user_id: int,
    weather_data: WeatherRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    profile = {
        "prenom": current_user.prenom,
        "genre": current_user.genre,
        "age": current_user.age,
        "morphologie": current_user.morphologie,
    }
    result = await get_daily_suggestions(profile, weather_data.model_dump())
    return result


@app.post("/chat/{user_id}")
async def chat_endpoint(
    user_id: int,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    profile = {
        "prenom": current_user.prenom,
        "genre": current_user.genre,
        "age": current_user.age,
        "morphologie": current_user.morphologie,
    }
    result = await chat_with_stylist(profile, body.message, body.history)
    return result

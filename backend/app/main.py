from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
import os
import re

from app.database import init_db, get_session
from app.models import User
from app.routers import wardrobe, users, admin
from app.services.ai_service import get_daily_suggestions, chat_with_stylist

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Digital Stylist API", lifespan=lifespan)

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
    weather_data: dict,
    session: AsyncSession = Depends(get_session),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = {
        "prenom": user.prenom,
        "genre": user.genre,
        "age": user.age,
        "morphologie": user.morphologie,
    }
    result = await get_daily_suggestions(profile, weather_data)
    return result


@app.post("/chat/{user_id}")
async def chat_endpoint(
    user_id: int,
    body: dict,
    session: AsyncSession = Depends(get_session),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    message = body.get("message", "")
    history = body.get("history", [])

    if not message.strip():
        return {"reply": "Dis-moi ce que tu recherches ! 😊", "products": []}

    profile = {
        "prenom": user.prenom,
        "genre": user.genre,
        "age": user.age,
        "morphologie": user.morphologie,
    }
    result = await chat_with_stylist(profile, message, history)
    return result

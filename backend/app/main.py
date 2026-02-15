from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import init_db
from app.routers import wardrobe, users, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create DB tables
    await init_db()
    yield
    # Shutdown logic if needed

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

# Also allow any Vercel preview URLs
import re
origin_regex = r"https://digital-stylist-mvp.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

# Mount uploads directory to serve images statically
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers
app.include_router(wardrobe.router)
app.include_router(users.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Digital Stylist API"}

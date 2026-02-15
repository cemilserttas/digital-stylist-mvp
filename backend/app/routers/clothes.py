import shutil
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models import ClothingItem, User
from app.services import ai_service

router = APIRouter(prefix="/clothes", tags=["clothes"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=ClothingItem)
async def upload_clothing_item(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session)
):
    # 1. Save file locally
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # 2. Read file for AI analysis
    # We need to read the file bytes. Since we just saved it, we can read it back or read from the UploadFile if simpler.
    # UploadFile.file is a SpooledTemporaryFile.
    await file.seek(0)
    content = await file.read()
    
    # 3. Analyze with AI
    analysis = await ai_service.analyze_image(content, mime_type=file.content_type or "image/jpeg")
    
    if "error" in analysis:
        # We might want to handle this gracefully, but for now let's proceed with defaults or raise
        # For MVP, let's just log it and proceed with what we have
        print(f"AI Analysis failed: {analysis['error']}")

    # 4. Create DB Entry
    # NOTE: user_id is hardcoded to 1 for this MVP step as we don't have auth/user management yet.
    # We might need to create a default user first if foreign key constraints are enforced and no user exists.
    # For now, let's assume user_id=1.
    
    # Check if a user exists, if not create a default one for the MVP to work
    # (In a real app, this would be handled differently)
    result = await session.execute(select(User).where(User.id == 1))
    user = result.scalars().first()
    if not user:
        default_user = User(id=1, prenom="Default", morphologie="OVALE") # Default values
        session.add(default_user)
        await session.commit()
    
    new_item = ClothingItem(
        user_id=1,
        type=analysis.get("type", "Unknown"),
        couleur=analysis.get("couleur_dominante", "Unknown"),
        saison=analysis.get("saison", "Toutes"),
        tags_ia=f"Style: {analysis.get('style', 'Unknown')}, Coupe: {analysis.get('coupe', 'Unknown')}",
        image_path=file_location
    )
    
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    
    return new_item

@router.get("/wardrobe", response_model=List[ClothingItem])
async def get_wardrobe(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ClothingItem))
    items = result.scalars().all()
    return items

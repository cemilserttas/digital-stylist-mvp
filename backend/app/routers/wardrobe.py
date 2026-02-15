import shutil
import uuid
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models import ClothingItem, User, ClothingItemRead
from app.services import ai_service

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=ClothingItemRead)
async def upload_clothing_item(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    session: AsyncSession = Depends(get_session)
):
    # Verify user exists
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    if not file_extension:
        file_extension = ".jpg" # Default to jpg if no extension
        
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Analyze with AI
    # Reset file pointer for reading
    await file.seek(0)
    content = await file.read()
    
    # Call AI service
    analysis = await ai_service.analyze_clothing_image(content, mime_type=file.content_type or "image/jpeg")

    # Create DB Entry
    # ai_service.analyze_clothing_image already normalises all keys
    new_item = ClothingItem(
        user_id=user_id,
        type=analysis.get("type", "Vêtement"),
        couleur=analysis.get("couleur_dominante", "Multicolore"),
        saison=analysis.get("saison", "Toutes"),
        tags_ia=analysis.get("tags_ia", "Style: Casual, Coupe: Regular"),
        image_path=file_location.replace("\\", "/")
    )
    
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    
    return new_item

@router.get("/{user_id}", response_model=List[ClothingItemRead])
async def get_user_wardrobe(
    user_id: int,
    session: AsyncSession = Depends(get_session)
):
    statement = select(ClothingItem).where(ClothingItem.user_id == user_id)
    result = await session.execute(statement)
    items = result.scalars().all()
    return items

@router.delete("/item/{item_id}")
async def delete_clothing_item(
    item_id: int,
    session: AsyncSession = Depends(get_session)
):
    item = await session.get(ClothingItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete image file from disk
    if item.image_path and os.path.exists(item.image_path):
        try:
            os.remove(item.image_path)
        except Exception as e:
            print(f"Warning: Could not delete image file: {e}")
    
    await session.delete(item)
    await session.commit()
    return {"message": "Item deleted successfully", "id": item_id}

@router.put("/item/{item_id}", response_model=ClothingItemRead)
async def update_clothing_item(
    item_id: int,
    type: str = Form(...),
    couleur: str = Form(...),
    saison: str = Form(...),
    session: AsyncSession = Depends(get_session)
):
    item = await session.get(ClothingItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item.type = type
    item.couleur = couleur
    item.saison = saison
    
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item

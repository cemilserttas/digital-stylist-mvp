import uuid
import os
import logging
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models import ClothingItem, User, ClothingItemRead
from app.services import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])

UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MIME_TO_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=ClothingItemRead)
async def upload_clothing_item(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    category: str = Form("wardrobe"),
    session: AsyncSession = Depends(get_session)
):
    # Verify user exists
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Validate category
    if category not in ("wardrobe", "wishlist"):
        category = "wardrobe"

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Format non supporté. Formats acceptés : JPEG, PNG, WebP"
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="Fichier trop volumineux (max 10 Mo)")

    # Generate UUID filename from validated MIME type (never use original filename)
    ext = MIME_TO_EXT[file.content_type]
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_location = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    try:
        with open(file_location, "wb") as file_object:
            file_object.write(content)
    except Exception as e:
        logger.error("Could not save uploaded file: %s", e)
        raise HTTPException(status_code=500, detail="Impossible de sauvegarder le fichier")
    
    analysis = await ai_service.analyze_clothing_image(content, mime_type=file.content_type or "image/jpeg")

    # Create DB Entry
    new_item = ClothingItem(
        user_id=user_id,
        type=analysis.get("type", "Vêtement"),
        couleur=analysis.get("couleur_dominante", "Multicolore"),
        saison=analysis.get("saison", "Toutes"),
        tags_ia=analysis.get("tags_ia", ""),
        category=category,
        image_path=file_location.replace("\\", "/")
    )
    
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    
    return new_item

@router.get("/{user_id}", response_model=List[ClothingItemRead])
async def get_user_wardrobe(
    user_id: int,
    category: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session)
):
    statement = select(ClothingItem).where(ClothingItem.user_id == user_id)
    if category:
        statement = statement.where(ClothingItem.category == category)
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
    
    if item.image_path and os.path.exists(item.image_path):
        try:
            os.remove(item.image_path)
        except Exception as e:
            logger.warning("Could not delete image file: %s", e)
    
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

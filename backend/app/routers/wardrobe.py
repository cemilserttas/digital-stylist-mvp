import uuid
import os
import json
import logging
from collections import Counter
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models import ClothingItem, User, ClothingItemRead
from app.services import ai_service
from app.auth import get_current_user

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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

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
    logger.info("User %d uploaded item '%s' in '%s'", user_id, new_item.type, category)
    return new_item


@router.get("/{user_id}", response_model=List[ClothingItemRead])
async def get_user_wardrobe(
    user_id: int,
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    statement = select(ClothingItem).where(ClothingItem.user_id == user_id)
    if category:
        statement = statement.where(ClothingItem.category == category)
    result = await session.execute(statement)
    return result.scalars().all()


@router.delete("/item/{item_id}")
async def delete_clothing_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    item = await session.get(ClothingItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vêtement introuvable")
    if item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    if item.image_path and os.path.exists(item.image_path):
        try:
            os.remove(item.image_path)
        except Exception as e:
            logger.warning("Could not delete image file: %s", e)

    await session.delete(item)
    await session.commit()
    logger.info("User %d deleted item %d", current_user.id, item_id)
    return {"message": "Vêtement supprimé", "id": item_id}


@router.put("/item/{item_id}", response_model=ClothingItemRead)
async def update_clothing_item(
    item_id: int,
    type: str = Form(...),
    couleur: str = Form(...),
    saison: str = Form(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    item = await session.get(ClothingItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vêtement introuvable")
    if item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    item.type = type
    item.couleur = couleur
    item.saison = saison

    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.get("/{user_id}/analytics")
async def get_wardrobe_analytics(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return color palette, style breakdown, season distribution, and outfit count estimate."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    result = await session.execute(
        select(ClothingItem).where(
            ClothingItem.user_id == user_id,
            ClothingItem.category == "wardrobe",
        )
    )
    items = result.scalars().all()

    if not items:
        return {
            "total": 0,
            "colors": [],
            "styles": [],
            "seasons": [],
            "types": [],
            "avg_look_score": None,
            "estimated_outfit_count": 0,
            "wardrobe_value_eur": {"budget": 0, "moyen": 0, "premium": 0},
        }

    colors = Counter(i.couleur for i in items if i.couleur)
    seasons = Counter(i.saison for i in items if i.saison)
    types = Counter(i.type for i in items if i.type)

    styles: Counter = Counter()
    look_scores: list[float] = []
    total_budget_min = total_moyen_min = total_premium_min = 0.0

    for item in items:
        if not item.tags_ia:
            continue
        try:
            data = json.loads(item.tags_ia)
        except (json.JSONDecodeError, TypeError):
            continue

        # Style breakdown from first detected item
        item_list = data.get("items", [])
        if item_list:
            style = item_list[0].get("style")
            if style:
                styles[style] += 1

        # Look score
        evaluation = data.get("evaluation", {})
        note = evaluation.get("note")
        if isinstance(note, (int, float)) and note > 0:
            look_scores.append(float(note))

        # Wardrobe value
        prix = evaluation.get("prix_total_look", {})
        budget = prix.get("budget", {})
        moyen = prix.get("moyen", {})
        premium = prix.get("premium", {})
        total_budget_min += budget.get("min", 0) or 0
        total_moyen_min += moyen.get("min", 0) or 0
        total_premium_min += premium.get("min", 0) or 0

    # Rough outfit count: combinations of tops × bottoms
    top_types = {"T-shirt", "Chemise", "Pull", "Sweat", "Veste", "Manteau", "Haut", "Blazer"}
    bottom_types = {"Jean", "Pantalon", "Short", "Jupe", "Chino"}
    tops = sum(1 for i in items if any(t in i.type for t in top_types))
    bottoms = sum(1 for i in items if any(b in i.type for b in bottom_types))
    estimated_outfits = tops * bottoms if tops and bottoms else len(items)

    return {
        "total": len(items),
        "colors": [{"name": c, "count": n} for c, n in colors.most_common(8)],
        "styles": [{"name": s, "count": n} for s, n in styles.most_common(6)],
        "seasons": [{"name": s, "count": n} for s, n in seasons.most_common(4)],
        "types": [{"name": t, "count": n} for t, n in types.most_common(10)],
        "avg_look_score": round(sum(look_scores) / len(look_scores), 1) if look_scores else None,
        "estimated_outfit_count": estimated_outfits,
        "wardrobe_value_eur": {
            "budget": round(total_budget_min),
            "moyen": round(total_moyen_min),
            "premium": round(total_premium_min),
        },
    }

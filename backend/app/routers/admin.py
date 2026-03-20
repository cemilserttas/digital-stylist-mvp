from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from dotenv import load_dotenv
import logging
import os

load_dotenv()

from app.database import get_session
from app.models import User, ClothingItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# Admin key — aucune valeur par défaut (doit être défini dans les variables d'environnement)
ADMIN_KEY = os.getenv("ADMIN_KEY")

async def verify_admin(request: Request, x_admin_key: str = Header(...)):
    """Verify admin access via X-Admin-Key header."""
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        logger.warning("Tentative d'accès admin échouée depuis %s", request.client.host if request.client else "unknown")
        raise HTTPException(status_code=403, detail="Accès refusé – clé admin invalide")
    return True


@router.get("/users")
async def list_all_users(
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session)
):
    """List all users with their clothing item count (single JOIN query)."""
    stmt = (
        select(User, func.count(ClothingItem.id).label("clothing_count"))
        .outerjoin(ClothingItem, User.id == ClothingItem.user_id)
        .group_by(User.id)
    )
    result = await session.execute(stmt)
    rows = result.all()

    users_data = [
        {
            "id": user.id,
            "prenom": user.prenom,
            "morphologie": user.morphologie.value if user.morphologie else "N/A",
            "style_prefere": user.style_prefere,
            "created_at": str(user.created_at),
            "clothing_count": clothing_count,
        }
        for user, clothing_count in rows
    ]

    return {"users": users_data, "total": len(users_data)}


@router.delete("/users/{user_id}")
async def delete_user_cascade(
    user_id: int,
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session)
):
    """Delete a user and ALL their clothing items + image files."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Get all clothing items
    items_result = await session.execute(
        select(ClothingItem).where(ClothingItem.user_id == user_id)
    )
    items = items_result.scalars().all()
    
    # Delete image files from disk
    deleted_files = 0
    for item in items:
        if item.image_path and os.path.exists(item.image_path):
            try:
                os.remove(item.image_path)
                deleted_files += 1
            except Exception as e:
                logger.warning("Could not delete file %s: %s", item.image_path, e)
        # Delete item from DB
        await session.delete(item)
    
    # Delete user
    await session.delete(user)
    await session.commit()
    
    return {
        "message": f"Utilisateur '{user.prenom}' supprimé avec succès",
        "deleted_items": len(items),
        "deleted_files": deleted_files,
    }


@router.get("/stats")
async def get_stats(
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get overall platform statistics."""
    users_result = await session.execute(select(User))
    users = users_result.scalars().all()
    
    items_result = await session.execute(select(ClothingItem))
    items = items_result.scalars().all()
    
    return {
        "total_users": len(users),
        "total_items": len(items),
    }

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import os

from app.database import get_session
from app.models import User, UserRead, ClothingItem

router = APIRouter(prefix="/admin", tags=["admin"])

# Simple admin key-based auth
ADMIN_KEY = os.getenv("ADMIN_KEY", "digital-stylist-admin-2024")

async def verify_admin(x_admin_key: str = Header(...)):
    """Verify admin access via X-Admin-Key header."""
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Accès refusé – clé admin invalide")
    return True


@router.get("/users")
async def list_all_users(
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session)
):
    """List all users with their clothing item count."""
    result = await session.execute(select(User))
    users = result.scalars().all()
    
    users_data = []
    for user in users:
        # Count clothing items
        items_result = await session.execute(
            select(ClothingItem).where(ClothingItem.user_id == user.id)
        )
        items = items_result.scalars().all()
        
        users_data.append({
            "id": user.id,
            "prenom": user.prenom,
            "morphologie": user.morphologie.value if user.morphologie else "N/A",
            "style_prefere": user.style_prefere,
            "created_at": str(user.created_at),
            "clothing_count": len(items),
        })
    
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
                print(f"⚠️ Could not delete file {item.image_path}: {e}")
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

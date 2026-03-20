from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from dotenv import load_dotenv
from datetime import datetime, timedelta
import logging
import os

load_dotenv()

from app.database import get_session
from app.models import User, ClothingItem, LinkClick

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
    session: AsyncSession = Depends(get_session),
):
    """Get comprehensive platform analytics."""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    # Aggregated counts
    total_users = (await session.execute(select(func.count(User.id)))).scalar_one()
    total_items = (await session.execute(select(func.count(ClothingItem.id)))).scalar_one()
    total_clicks = (await session.execute(select(func.count(LinkClick.id)))).scalar_one()

    # New users last 7 / 30 days
    new_users_7d = (await session.execute(
        select(func.count(User.id)).where(User.created_at >= seven_days_ago)
    )).scalar_one()
    new_users_30d = (await session.execute(
        select(func.count(User.id)).where(User.created_at >= thirty_days_ago)
    )).scalar_one()

    # Items per category
    wardrobe_count = (await session.execute(
        select(func.count(ClothingItem.id)).where(ClothingItem.category == "wardrobe")
    )).scalar_one()
    wishlist_count = (await session.execute(
        select(func.count(ClothingItem.id)).where(ClothingItem.category == "wishlist")
    )).scalar_one()

    # Top clicked brands
    brand_clicks_result = await session.execute(
        select(LinkClick.marque, func.count(LinkClick.id).label("count"))
        .group_by(LinkClick.marque)
        .order_by(func.count(LinkClick.id).desc())
        .limit(5)
    )
    top_brands = [
        {"marque": row.marque, "clicks": row.count}
        for row in brand_clicks_result.all()
    ]

    # Revenue estimate (5% commission avg €30 cart)
    estimated_revenue_eur = round(total_clicks * 30 * 0.05, 2)

    # Daily signups last 14 days
    signups_by_day = []
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        count = (await session.execute(
            select(func.count(User.id))
            .where(User.created_at >= day_start)
            .where(User.created_at < day_end)
        )).scalar_one()
        signups_by_day.append({"date": day.isoformat(), "count": count})

    return {
        "users": {
            "total": total_users,
            "new_7d": new_users_7d,
            "new_30d": new_users_30d,
            "signups_by_day": signups_by_day,
        },
        "wardrobe": {
            "total_items": total_items,
            "wardrobe": wardrobe_count,
            "wishlist": wishlist_count,
            "avg_per_user": round(total_items / total_users, 1) if total_users else 0,
        },
        "monetization": {
            "total_clicks": total_clicks,
            "top_brands": top_brands,
            "estimated_revenue_eur": estimated_revenue_eur,
        },
    }

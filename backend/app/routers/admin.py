from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import logging
import os

load_dotenv()

from app.database import get_session
from app.models import User, ClothingItem, LinkClick, AIRequest
from app.services import storage_service
from app.services.ai_base import (
    AVAILABLE_MODELS,
    get_active_model,
    set_active_model,
    get_model_info,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_KEY = os.getenv("ADMIN_KEY")


async def verify_admin(request: Request, x_admin_key: str = Header(...)):
    """Verify admin access via X-Admin-Key header."""
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        logger.warning("Tentative d'accès admin échouée depuis %s", request.client.host if request.client else "unknown")
        raise HTTPException(status_code=403, detail="Accès refusé – clé admin invalide")
    return True


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@router.get("/users")
async def list_all_users(
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session)
):
    """List all users with clothing count + AI usage."""
    stmt = (
        select(User, func.count(ClothingItem.id).label("clothing_count"))
        .outerjoin(ClothingItem, User.id == ClothingItem.user_id)
        .group_by(User.id)
    )
    result = await session.execute(stmt)
    rows = result.all()

    # AI requests per user
    ai_stmt = (
        select(AIRequest.user_id, func.count(AIRequest.id).label("ai_count"))
        .where(AIRequest.user_id.isnot(None))  # type: ignore[union-attr]
        .group_by(AIRequest.user_id)
    )
    ai_result = await session.execute(ai_stmt)
    ai_by_user = {row.user_id: row.ai_count for row in ai_result.all()}

    users_data = [
        {
            "id": user.id,
            "prenom": user.prenom,
            "email": user.email,
            "morphologie": user.morphologie.value if user.morphologie else "N/A",
            "genre": user.genre,
            "age": user.age,
            "style_prefere": user.style_prefere,
            "created_at": str(user.created_at),
            "clothing_count": clothing_count,
            "is_premium": user.is_premium,
            "premium_until": str(user.premium_until) if user.premium_until else None,
            "streak_current": user.streak_current,
            "streak_max": user.streak_max,
            "referral_count": user.referral_count,
            "suggestions_count_today": user.suggestions_count_today,
            "chat_count_today": user.chat_count_today,
            "ai_requests_total": ai_by_user.get(user.id, 0),
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
    """Delete a user and ALL their data (items + images + AI logs)."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    items_result = await session.execute(
        select(ClothingItem).where(ClothingItem.user_id == user_id)
    )
    items = items_result.scalars().all()

    deleted_files = 0
    for item in items:
        if item.image_path:
            await storage_service.delete_image(item.image_path)
            deleted_files += 1
        await session.delete(item)

    # Delete AI request logs
    ai_result = await session.execute(
        select(AIRequest).where(AIRequest.user_id == user_id)
    )
    for ai_req in ai_result.scalars().all():
        await session.delete(ai_req)

    await session.delete(user)
    await session.commit()

    return {
        "message": f"Utilisateur '{user.prenom}' supprimé avec succès",
        "deleted_items": len(items),
        "deleted_files": deleted_files,
    }


# ---------------------------------------------------------------------------
# Platform Stats (enhanced)
# ---------------------------------------------------------------------------
@router.get("/stats")
async def get_stats(
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session),
):
    """Get comprehensive platform analytics."""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    total_users = (await session.execute(select(func.count(User.id)))).scalar_one()
    total_items = (await session.execute(select(func.count(ClothingItem.id)))).scalar_one()
    total_clicks = (await session.execute(select(func.count(LinkClick.id)))).scalar_one()
    premium_users = (await session.execute(
        select(func.count(User.id)).where(User.is_premium == True)
    )).scalar_one()
    new_users_7d = (await session.execute(
        select(func.count(User.id)).where(User.created_at >= seven_days_ago)
    )).scalar_one()
    new_users_30d = (await session.execute(
        select(func.count(User.id)).where(User.created_at >= thirty_days_ago)
    )).scalar_one()

    wardrobe_count = (await session.execute(
        select(func.count(ClothingItem.id)).where(ClothingItem.category == "wardrobe")
    )).scalar_one()
    wishlist_count = (await session.execute(
        select(func.count(ClothingItem.id)).where(ClothingItem.category == "wishlist")
    )).scalar_one()

    brand_clicks_result = await session.execute(
        select(LinkClick.marque, func.count(LinkClick.id).label("count"))
        .group_by(LinkClick.marque)
        .order_by(func.count(LinkClick.id).desc())
        .limit(10)
    )
    top_brands = [
        {"marque": row.marque, "clicks": row.count}
        for row in brand_clicks_result.all()
    ]

    estimated_revenue_eur = round(total_clicks * 30 * 0.05, 2)
    mrr_estimate = round(premium_users * 2.99, 2)

    # Active users (streak in last 7d)
    active_7d = (await session.execute(
        select(func.count(User.id)).where(
            User.streak_last_activity >= (now - timedelta(days=7)).date()
        )
    )).scalar_one()

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
            "premium": premium_users,
            "active_7d": active_7d,
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
            "mrr_premium": mrr_estimate,
        },
    }


# ---------------------------------------------------------------------------
# AI Stats & Model Management
# ---------------------------------------------------------------------------
@router.get("/ai/stats")
async def get_ai_stats(
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session),
):
    """Comprehensive AI usage analytics."""
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    today_start = datetime.combine(now.date(), datetime.min.time())

    total_requests = (await session.execute(
        select(func.count(AIRequest.id))
    )).scalar_one()

    requests_today = (await session.execute(
        select(func.count(AIRequest.id)).where(AIRequest.created_at >= today_start)
    )).scalar_one()

    requests_7d = (await session.execute(
        select(func.count(AIRequest.id)).where(AIRequest.created_at >= seven_days_ago)
    )).scalar_one()
    requests_30d = (await session.execute(
        select(func.count(AIRequest.id)).where(AIRequest.created_at >= thirty_days_ago)
    )).scalar_one()

    token_result = await session.execute(
        select(
            func.sum(AIRequest.input_tokens).label("total_input"),
            func.sum(AIRequest.output_tokens).label("total_output"),
        )
    )
    token_row = token_result.one()
    total_input_tokens = token_row.total_input or 0
    total_output_tokens = token_row.total_output or 0

    # By request type
    type_result = await session.execute(
        select(
            AIRequest.request_type,
            func.count(AIRequest.id).label("count"),
            func.sum(AIRequest.input_tokens).label("input_tokens"),
            func.sum(AIRequest.output_tokens).label("output_tokens"),
            func.avg(AIRequest.duration_ms).label("avg_duration_ms"),
        )
        .group_by(AIRequest.request_type)
        .order_by(func.count(AIRequest.id).desc())
    )
    by_type = [
        {
            "type": row.request_type,
            "count": row.count,
            "input_tokens": row.input_tokens or 0,
            "output_tokens": row.output_tokens or 0,
            "avg_duration_ms": round(row.avg_duration_ms or 0),
        }
        for row in type_result.all()
    ]

    # By model
    model_result = await session.execute(
        select(
            AIRequest.model,
            func.count(AIRequest.id).label("count"),
            func.sum(AIRequest.input_tokens).label("input_tokens"),
            func.sum(AIRequest.output_tokens).label("output_tokens"),
        )
        .group_by(AIRequest.model)
        .order_by(func.count(AIRequest.id).desc())
    )
    by_model = [
        {
            "model": row.model,
            "count": row.count,
            "input_tokens": row.input_tokens or 0,
            "output_tokens": row.output_tokens or 0,
        }
        for row in model_result.all()
    ]

    # Error rate
    error_count = (await session.execute(
        select(func.count(AIRequest.id)).where(AIRequest.status != "success")
    )).scalar_one()

    by_status = {}
    status_result = await session.execute(
        select(AIRequest.status, func.count(AIRequest.id).label("count"))
        .group_by(AIRequest.status)
    )
    for row in status_result.all():
        by_status[row.status] = row.count

    # Top users by AI usage
    top_users_result = await session.execute(
        select(
            AIRequest.user_id,
            User.prenom,
            func.count(AIRequest.id).label("count"),
            func.sum(AIRequest.input_tokens).label("total_tokens"),
        )
        .join(User, AIRequest.user_id == User.id)
        .where(AIRequest.user_id.isnot(None))  # type: ignore[union-attr]
        .group_by(AIRequest.user_id, User.prenom)
        .order_by(func.count(AIRequest.id).desc())
        .limit(10)
    )
    top_users = [
        {
            "user_id": row.user_id,
            "prenom": row.prenom,
            "requests": row.count,
            "total_tokens": row.total_tokens or 0,
        }
        for row in top_users_result.all()
    ]

    # Daily AI requests (last 14 days)
    requests_by_day = []
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        count = (await session.execute(
            select(func.count(AIRequest.id))
            .where(AIRequest.created_at >= day_start)
            .where(AIRequest.created_at < day_end)
        )).scalar_one()
        requests_by_day.append({"date": day.isoformat(), "count": count})

    # Cost estimate
    active_model = get_active_model()
    model_info = AVAILABLE_MODELS.get(active_model, {})
    input_price = model_info.get("input_price_per_m", 0.10)
    output_price = model_info.get("output_price_per_m", 0.40)
    estimated_cost = round(
        (total_input_tokens / 1_000_000 * input_price)
        + (total_output_tokens / 1_000_000 * output_price),
        4,
    )

    return {
        "overview": {
            "total_requests": total_requests,
            "requests_today": requests_today,
            "requests_7d": requests_7d,
            "requests_30d": requests_30d,
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "total_tokens": total_input_tokens + total_output_tokens,
            "estimated_cost_usd": estimated_cost,
            "error_rate": round(error_count / total_requests * 100, 1) if total_requests else 0,
        },
        "by_type": by_type,
        "by_model": by_model,
        "by_status": by_status,
        "top_users": top_users,
        "requests_by_day": requests_by_day,
        "active_model": active_model,
    }


@router.get("/ai/models")
async def list_ai_models(
    admin: bool = Depends(verify_admin),
):
    """List all available Gemini models with pricing and limits."""
    active = get_active_model()
    models = []
    for model_id, info in AVAILABLE_MODELS.items():
        models.append({
            "model_id": model_id,
            "is_active": model_id == active,
            **info,
        })
    return {"models": models, "active_model": active}


class ModelChangeRequest(BaseModel):
    model_id: str


@router.put("/ai/model")
async def change_ai_model(
    body: ModelChangeRequest,
    admin: bool = Depends(verify_admin),
):
    """Change the active Gemini model at runtime."""
    if body.model_id not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Modèle inconnu. Modèles disponibles : {list(AVAILABLE_MODELS.keys())}",
        )
    set_active_model(body.model_id)
    return {
        "message": f"Modèle actif changé en {body.model_id}",
        "active_model": body.model_id,
        "model_info": get_model_info(body.model_id),
    }


@router.get("/ai/limits")
async def get_ai_limits(
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session),
):
    """Show current rate limits, usage vs limits for the active model."""
    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), datetime.min.time())
    one_minute_ago = now - timedelta(minutes=1)

    active = get_active_model()
    info = AVAILABLE_MODELS.get(active, {})

    requests_today = (await session.execute(
        select(func.count(AIRequest.id)).where(AIRequest.created_at >= today_start)
    )).scalar_one()

    requests_last_min = (await session.execute(
        select(func.count(AIRequest.id)).where(AIRequest.created_at >= one_minute_ago)
    )).scalar_one()

    one_hour_ago = now - timedelta(hours=1)
    token_result = await session.execute(
        select(
            func.sum(AIRequest.input_tokens).label("input"),
            func.sum(AIRequest.output_tokens).label("output"),
        ).where(AIRequest.created_at >= one_hour_ago)
    )
    token_row = token_result.one()
    tokens_last_hour = (token_row.input or 0) + (token_row.output or 0)

    rpd_limit = info.get("rpd_free", 1500)
    rpm_limit = info.get("rpm_free", 15)
    tpm_limit = info.get("tpm_free", 1_000_000)

    return {
        "active_model": active,
        "model_name": info.get("name", active),
        "tier": info.get("tier", "unknown"),
        "limits": {
            "rpd": rpd_limit,
            "rpm": rpm_limit,
            "tpm": tpm_limit,
        },
        "usage": {
            "requests_today": requests_today,
            "requests_last_minute": requests_last_min,
            "tokens_last_hour": tokens_last_hour,
        },
        "utilization": {
            "rpd_percent": round(requests_today / rpd_limit * 100, 1) if rpd_limit else 0,
            "rpm_percent": round(requests_last_min / rpm_limit * 100, 1) if rpm_limit else 0,
            "tpm_percent": round(tokens_last_hour / tpm_limit * 100, 1) if tpm_limit else 0,
        },
        "pricing": {
            "input_per_m_tokens": info.get("input_price_per_m", 0),
            "output_per_m_tokens": info.get("output_price_per_m", 0),
        },
    }


# ---------------------------------------------------------------------------
# Products & Affiliations
# ---------------------------------------------------------------------------
@router.get("/products/top")
async def get_top_products(
    admin: bool = Depends(verify_admin),
    session: AsyncSession = Depends(get_session),
):
    """Top clicked products with revenue estimates."""
    products_result = await session.execute(
        select(
            LinkClick.product_name,
            LinkClick.marque,
            func.count(LinkClick.id).label("clicks"),
            func.avg(LinkClick.prix).label("avg_prix"),
        )
        .group_by(LinkClick.product_name, LinkClick.marque)
        .order_by(func.count(LinkClick.id).desc())
        .limit(20)
    )
    top_products = [
        {
            "product_name": row.product_name,
            "marque": row.marque,
            "clicks": row.clicks,
            "avg_prix": round(row.avg_prix or 0, 2),
            "estimated_revenue": round(row.clicks * (row.avg_prix or 30) * 0.05, 2),
        }
        for row in products_result.all()
    ]

    # Clicks by day (last 14 days)
    now = datetime.now(timezone.utc)
    clicks_by_day = []
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        count = (await session.execute(
            select(func.count(LinkClick.id))
            .where(LinkClick.clicked_at >= day_start)
            .where(LinkClick.clicked_at < day_end)
        )).scalar_one()
        clicks_by_day.append({"date": day.isoformat(), "count": count})

    # Top brands with commissions
    brands_result = await session.execute(
        select(
            LinkClick.marque,
            func.count(LinkClick.id).label("clicks"),
            func.sum(LinkClick.prix).label("total_value"),
        )
        .group_by(LinkClick.marque)
        .order_by(func.count(LinkClick.id).desc())
        .limit(10)
    )
    top_brands = [
        {
            "marque": row.marque,
            "clicks": row.clicks,
            "total_value": round(row.total_value or 0, 2),
            "estimated_commission": round((row.total_value or 0) * 0.05, 2),
        }
        for row in brands_result.all()
    ]

    return {
        "top_products": top_products,
        "top_brands": top_brands,
        "clicks_by_day": clicks_by_day,
    }

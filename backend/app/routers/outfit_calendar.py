import json
import logging
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models import OutfitPlan, OutfitPlanCreate, User
from app.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/outfit-calendar", tags=["outfit-calendar"])


@router.get("/{user_id}")
async def get_plans(
    user_id: int,
    start: str = None,
    end: str = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get outfit plans for a date range (default: next 7 days)."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    if not start:
        start = date.today().isoformat()
    if not end:
        end = (date.today() + timedelta(days=6)).isoformat()

    stmt = (
        select(OutfitPlan)
        .where(OutfitPlan.user_id == user_id)
        .where(OutfitPlan.date >= start)
        .where(OutfitPlan.date <= end)
        .order_by(OutfitPlan.date)
    )
    result = await session.execute(stmt)
    plans = result.scalars().all()

    return {
        "plans": [
            {
                "id": p.id,
                "date": p.date,
                "occasion": p.occasion,
                "notes": p.notes,
                "item_ids": json.loads(p.item_ids or "[]"),
                "created_at": str(p.created_at),
            }
            for p in plans
        ]
    }


@router.post("/{user_id}")
async def create_plan(
    user_id: int,
    body: OutfitPlanCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create or replace an outfit plan for a given date."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    # Upsert: delete existing plan for same date if any
    existing_stmt = select(OutfitPlan).where(
        OutfitPlan.user_id == user_id,
        OutfitPlan.date == body.date,
    )
    existing_result = await session.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()
    if existing:
        await session.delete(existing)

    plan = OutfitPlan(
        user_id=user_id,
        date=body.date,
        occasion=body.occasion,
        notes=body.notes,
        item_ids=json.dumps(body.item_ids),
    )
    session.add(plan)
    await session.commit()
    await session.refresh(plan)

    logger.info("Outfit plan created for user %d on %s", user_id, body.date)
    return {
        "id": plan.id,
        "date": plan.date,
        "occasion": plan.occasion,
        "notes": plan.notes,
        "item_ids": body.item_ids,
    }


@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete an outfit plan."""
    plan = await session.get(OutfitPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan introuvable")
    if plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    await session.delete(plan)
    await session.commit()
    return {"message": "Plan supprimé"}

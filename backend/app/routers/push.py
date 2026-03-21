"""
Push notification endpoints.

PUT /push/{user_id}/token   — register or update FCM token
DELETE /push/{user_id}/token — unsubscribe (clear token)
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push", tags=["push"])


class FcmTokenRequest(BaseModel):
    fcm_token: str
    city: Optional[str] = None  # city for morning weather (falls back to "Paris")


@router.put("/{user_id}/token")
async def register_fcm_token(
    user_id: int,
    body: FcmTokenRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Store FCM token and enable push notifications for this user."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    current_user.fcm_token = body.fcm_token
    current_user.push_notifications_enabled = True
    if body.city:
        current_user.push_city = body.city
    session.add(current_user)
    await session.commit()

    logger.info("FCM token registered for user %d (city=%s)", user_id, body.city)
    return {"message": "Notifications push activées", "push_enabled": True}


@router.delete("/{user_id}/token")
async def unregister_fcm_token(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Clear FCM token and disable push notifications."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    current_user.fcm_token = None
    current_user.push_notifications_enabled = False
    session.add(current_user)
    await session.commit()

    logger.info("FCM token cleared for user %d", user_id)
    return {"message": "Notifications push désactivées", "push_enabled": False}

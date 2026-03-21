"""
Stripe billing endpoints.

POST /billing/{user_id}/checkout  — create a Stripe Checkout session (monthly or yearly)
POST /billing/webhook              — Stripe webhook handler (checkout.session.completed,
                                     customer.subscription.deleted, invoice.payment_failed)

Required env vars:
  STRIPE_SECRET_KEY       — sk_live_… or sk_test_…
  STRIPE_WEBHOOK_SECRET   — whsec_… (from `stripe listen` or Stripe Dashboard)
  STRIPE_PRICE_MONTHLY    — price_… for €2.99/month
  STRIPE_PRICE_YEARLY     — price_… for €24.99/year (optional)
  FRONTEND_URL            — https://yourdomain.vercel.app (for success/cancel redirect)
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth import get_current_user
from app.database import get_session
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])

_STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY")
_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
_PRICE_MONTHLY = os.getenv("STRIPE_PRICE_MONTHLY")
_PRICE_YEARLY = os.getenv("STRIPE_PRICE_YEARLY")
_FRONTEND_URL = os.getenv("FRONTEND_URL", "https://digital-stylist-mvp.vercel.app")

_stripe_available = False
if _STRIPE_SECRET:
    try:
        import stripe as _stripe_lib
        _stripe_lib.api_key = _STRIPE_SECRET
        _stripe_available = True
        logger.info("Stripe billing initialised")
    except ImportError:
        logger.warning("stripe package not installed — billing disabled")
else:
    logger.info("Stripe billing disabled — set STRIPE_SECRET_KEY to enable")


class CheckoutRequest(BaseModel):
    plan: str = "monthly"  # "monthly" or "yearly"


@router.post("/{user_id}/checkout")
async def create_checkout_session(
    user_id: int,
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a Stripe Checkout session and return the URL to redirect to."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    if not _stripe_available:
        raise HTTPException(
            status_code=503,
            detail="Paiement indisponible — contactez le support"
        )

    if current_user.is_premium and current_user.premium_until:
        now = datetime.now(timezone.utc)
        if current_user.premium_until.tzinfo is None:
            current_user.premium_until = current_user.premium_until.replace(tzinfo=timezone.utc)
        if current_user.premium_until > now:
            raise HTTPException(
                status_code=400,
                detail="Vous êtes déjà Premium"
            )

    price_id = _PRICE_YEARLY if body.plan == "yearly" else _PRICE_MONTHLY
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail="Tarif non configuré — contactez le support"
        )

    import stripe as _stripe_lib

    try:
        checkout_session = _stripe_lib.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{_FRONTEND_URL}/?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{_FRONTEND_URL}/?payment=cancelled",
            metadata={"user_id": str(user_id)},
            customer_email=None,  # no email collected — frictionless
            allow_promotion_codes=True,
            subscription_data={
                "metadata": {"user_id": str(user_id)},
            },
        )
        logger.info("Checkout session created for user %d (plan=%s)", user_id, body.plan)
        return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}

    except _stripe_lib.StripeError as e:
        logger.error("Stripe error for user %d: %s", user_id, e)
        raise HTTPException(status_code=502, detail="Erreur lors de la création du paiement")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    session: AsyncSession = Depends(get_session),
):
    """Handle Stripe webhook events — verifies signature before processing."""
    if not _stripe_available or not _WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook non configuré")

    payload = await request.body()

    import stripe as _stripe_lib

    try:
        event = _stripe_lib.Webhook.construct_event(
            payload, stripe_signature, _WEBHOOK_SECRET
        )
    except _stripe_lib.SignatureVerificationError:
        logger.warning("Invalid Stripe webhook signature")
        raise HTTPException(status_code=400, detail="Signature invalide")
    except Exception as e:
        logger.error("Webhook payload error: %s", e)
        raise HTTPException(status_code=400, detail="Payload invalide")

    event_type = event["type"]
    logger.info("Stripe webhook: %s", event_type)

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(event["data"]["object"], session)

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        await _handle_subscription_cancelled(event["data"]["object"], session)

    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(event["data"]["object"], session)

    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(event["data"]["object"], session)

    return {"received": True}


# ── Internal handlers ────────────────────────────────────────────────────────

async def _get_user_from_metadata(metadata: dict, session: AsyncSession) -> Optional[User]:
    user_id_str = metadata.get("user_id")
    if not user_id_str:
        return None
    try:
        return await session.get(User, int(user_id_str))
    except (ValueError, Exception):
        return None


async def _grant_premium(user: User, months: int, session: AsyncSession) -> None:
    now = datetime.now(timezone.utc)
    if user.premium_until and user.premium_until.tzinfo is None:
        user.premium_until = user.premium_until.replace(tzinfo=timezone.utc)
    base = user.premium_until if (user.premium_until and user.premium_until > now) else now
    user.premium_until = base + timedelta(days=30 * months)
    user.is_premium = True
    session.add(user)
    await session.commit()
    logger.info("Premium granted to user %d until %s", user.id, user.premium_until)


async def _handle_checkout_completed(checkout_obj: dict, session: AsyncSession) -> None:
    metadata = checkout_obj.get("metadata", {})
    user = await _get_user_from_metadata(metadata, session)
    if not user:
        logger.warning("checkout.session.completed: user_id not found in metadata")
        return

    # Determine duration from the subscription interval
    months = 1
    import stripe as _stripe_lib

    sub_id = checkout_obj.get("subscription")
    if sub_id:
        try:
            sub = _stripe_lib.Subscription.retrieve(sub_id)
            interval = sub["items"]["data"][0]["price"]["recurring"]["interval"]
            interval_count = sub["items"]["data"][0]["price"]["recurring"]["interval_count"]
            if interval == "year":
                months = 12 * interval_count
            elif interval == "month":
                months = interval_count
        except Exception as e:
            logger.warning("Could not retrieve subscription interval: %s", e)

    await _grant_premium(user, months, session)


async def _handle_subscription_updated(sub_obj: dict, session: AsyncSession) -> None:
    """Handle renewal — extend premium_until on each successful renewal."""
    metadata = sub_obj.get("metadata", {})
    user = await _get_user_from_metadata(metadata, session)
    if not user:
        return

    status = sub_obj.get("status")
    if status == "active":
        interval = sub_obj.get("plan", {}).get("interval", "month")
        months = 12 if interval == "year" else 1
        await _grant_premium(user, months, session)


async def _handle_subscription_cancelled(sub_obj: dict, session: AsyncSession) -> None:
    metadata = sub_obj.get("metadata", {})
    user = await _get_user_from_metadata(metadata, session)
    if not user:
        return

    user.is_premium = False
    # Keep premium_until as-is so they retain access until the period ends
    session.add(user)
    await session.commit()
    logger.info("Subscription cancelled for user %d — access until %s", user.id, user.premium_until)


async def _handle_payment_failed(invoice_obj: dict, session: AsyncSession) -> None:
    # On payment failure, we do nothing immediately — Stripe retries automatically.
    # If all retries fail, subscription.deleted will fire.
    sub_id = invoice_obj.get("subscription")
    logger.warning("Payment failed for subscription %s", sub_id)

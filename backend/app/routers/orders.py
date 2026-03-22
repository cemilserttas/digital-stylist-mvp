"""
Marketplace order endpoints — checkout, order management, shipping.

POST /orders/checkout/{listing_id}   — initiate purchase (Stripe checkout)
POST /orders/confirm/{order_id}      — confirm payment (after Stripe redirect)
GET  /orders/my-purchases            — buyer's order history
GET  /orders/my-sales                — seller's order history
GET  /orders/{order_id}              — order detail
PUT  /orders/{order_id}/ship         — seller marks as shipped
PUT  /orders/{order_id}/delivered    — buyer confirms receipt
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth import get_current_user
from app.database import get_session
from app.models import (
    User, MarketplaceListing, MarketplaceOrder,
    ShippingAddress, OrderRead,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])

SHIPPING_FLAT_CENTS = 499  # €4.99
COMMISSION_RATE = 0.10     # 10% platform fee

_STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY")
_FRONTEND_URL = os.getenv("FRONTEND_URL", "https://digital-stylist-mvp.vercel.app")
_WEBHOOK_SECRET = os.getenv("STRIPE_MARKETPLACE_WEBHOOK_SECRET") or os.getenv("STRIPE_WEBHOOK_SECRET")

_stripe_available = False
if _STRIPE_SECRET:
    try:
        import stripe as _stripe_lib
        _stripe_lib.api_key = _STRIPE_SECRET
        _stripe_available = True
    except ImportError:
        logger.warning("stripe not installed — marketplace payments disabled")


class ShipRequest(BaseModel):
    tracking_number: str
    tracking_carrier: str = "Colissimo"


def _order_to_read(
    order: MarketplaceOrder,
    listing_title: Optional[str] = None,
    listing_image: Optional[str] = None,
    buyer_prenom: Optional[str] = None,
    seller_prenom: Optional[str] = None,
) -> dict:
    return {
        "id": order.id,
        "listing_id": order.listing_id,
        "buyer_id": order.buyer_id,
        "seller_id": order.seller_id,
        "amount_cents": order.amount_cents,
        "commission_cents": order.commission_cents,
        "seller_payout_cents": order.seller_payout_cents,
        "status": order.status,
        "tracking_number": order.tracking_number,
        "tracking_carrier": order.tracking_carrier,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "shipped_at": order.shipped_at.isoformat() if order.shipped_at else None,
        "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
        "created_at": order.created_at.isoformat(),
        "listing_title": listing_title,
        "listing_image": listing_image,
        "buyer_prenom": buyer_prenom,
        "seller_prenom": seller_prenom,
    }


@router.post("/checkout/{listing_id}")
async def checkout(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Initiate purchase of a listing. Creates Stripe Checkout Session."""
    listing = await session.get(MarketplaceListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if listing.status != "active":
        raise HTTPException(status_code=400, detail="Cette annonce n'est plus disponible")
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas acheter votre propre article")

    # Check buyer has at least one shipping address
    addr_query = select(ShippingAddress).where(
        ShippingAddress.user_id == current_user.id
    ).limit(1)
    addr_result = await session.exec(addr_query)
    address = addr_result.first()
    if not address:
        raise HTTPException(
            status_code=400,
            detail="Ajoutez une adresse de livraison avant d'acheter"
        )

    # Calculate amounts
    item_cents = listing.price_cents
    commission_cents = int(item_cents * COMMISSION_RATE)
    seller_payout = item_cents - commission_cents
    total_cents = item_cents + SHIPPING_FLAT_CENTS

    # Create order in pending state
    order = MarketplaceOrder(
        listing_id=listing.id,
        buyer_id=current_user.id,
        seller_id=listing.seller_id,
        shipping_address_id=address.id,
        amount_cents=total_cents,
        commission_cents=commission_cents,
        seller_payout_cents=seller_payout,
        status="pending",
    )
    session.add(order)
    await session.flush()  # get order.id

    if not _stripe_available:
        # Dev mode — auto-confirm without Stripe
        order.paid_at = datetime.now(timezone.utc)
        listing.status = "sold"
        session.add(listing)
        await session.commit()
        logger.info("Order %d created (dev mode, no Stripe)", order.id)
        return {"order_id": order.id, "checkout_url": None, "dev_mode": True}

    import stripe as _stripe_lib

    try:
        checkout_session = _stripe_lib.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "unit_amount": total_cents,
                    "product_data": {
                        "name": listing.title,
                        "description": f"Frais de port inclus ({SHIPPING_FLAT_CENTS / 100:.2f} €)",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{_FRONTEND_URL}/?shop_payment=success&order_id={order.id}",
            cancel_url=f"{_FRONTEND_URL}/?shop_payment=cancelled",
            metadata={
                "order_id": str(order.id),
                "listing_id": str(listing.id),
                "buyer_id": str(current_user.id),
                "seller_id": str(listing.seller_id),
                "type": "marketplace",
            },
        )
        order.stripe_payment_intent_id = checkout_session.id
        await session.commit()
        logger.info("Marketplace checkout session created for order %d", order.id)
        return {"order_id": order.id, "checkout_url": checkout_session.url}

    except _stripe_lib.StripeError as e:
        logger.error("Stripe error for marketplace order: %s", e)
        raise HTTPException(status_code=502, detail="Erreur lors de la création du paiement")


@router.post("/webhook")
async def marketplace_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    session: AsyncSession = Depends(get_session),
):
    """Handle Stripe webhook for marketplace payments."""
    if not _stripe_available or not _WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook non configuré")

    payload = await request.body()
    import stripe as _stripe_lib

    try:
        event = _stripe_lib.Webhook.construct_event(
            payload, stripe_signature, _WEBHOOK_SECRET
        )
    except _stripe_lib.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Signature invalide")

    if event["type"] == "checkout.session.completed":
        metadata = event["data"]["object"].get("metadata", {})
        if metadata.get("type") != "marketplace":
            return {"received": True}  # not a marketplace event

        order_id = int(metadata.get("order_id", 0))
        order = await session.get(MarketplaceOrder, order_id)
        if order:
            order.paid_at = datetime.now(timezone.utc)
            order.status = "pending"
            session.add(order)

            listing = await session.get(MarketplaceListing, order.listing_id)
            if listing:
                listing.status = "sold"
                session.add(listing)

            await session.commit()
            logger.info("Marketplace order %d paid via webhook", order_id)

    return {"received": True}


# ── Order management ────────────────────────────────────────────────────────

@router.get("/my-purchases")
async def my_purchases(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get buyer's order history."""
    query = (
        select(MarketplaceOrder, MarketplaceListing.title, MarketplaceListing.image_urls)
        .join(MarketplaceListing, MarketplaceOrder.listing_id == MarketplaceListing.id)
        .where(MarketplaceOrder.buyer_id == current_user.id)
        .order_by(MarketplaceOrder.created_at.desc())
    )
    result = await session.exec(query)
    rows = result.all()

    orders = []
    for order, title, image_urls in rows:
        import json
        first_image = None
        try:
            imgs = json.loads(image_urls) if isinstance(image_urls, str) else image_urls
            first_image = imgs[0] if imgs else None
        except (json.JSONDecodeError, IndexError, TypeError):
            pass
        orders.append(_order_to_read(order, listing_title=title, listing_image=first_image))
    return orders


@router.get("/my-sales")
async def my_sales(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get seller's order history."""
    query = (
        select(MarketplaceOrder, MarketplaceListing.title, MarketplaceListing.image_urls, User.prenom)
        .join(MarketplaceListing, MarketplaceOrder.listing_id == MarketplaceListing.id)
        .join(User, MarketplaceOrder.buyer_id == User.id)
        .where(MarketplaceOrder.seller_id == current_user.id)
        .order_by(MarketplaceOrder.created_at.desc())
    )
    result = await session.exec(query)
    rows = result.all()

    orders = []
    for order, title, image_urls, buyer_name in rows:
        import json
        first_image = None
        try:
            imgs = json.loads(image_urls) if isinstance(image_urls, str) else image_urls
            first_image = imgs[0] if imgs else None
        except (json.JSONDecodeError, IndexError, TypeError):
            pass
        orders.append(_order_to_read(order, listing_title=title, listing_image=first_image, buyer_prenom=buyer_name))
    return orders


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get order detail. Only buyer or seller can view."""
    order = await session.get(MarketplaceOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    if order.buyer_id != current_user.id and order.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    listing = await session.get(MarketplaceListing, order.listing_id)
    title = listing.title if listing else None
    import json
    first_image = None
    if listing:
        try:
            imgs = json.loads(listing.image_urls) if isinstance(listing.image_urls, str) else listing.image_urls
            first_image = imgs[0] if imgs else None
        except (json.JSONDecodeError, IndexError, TypeError):
            pass

    buyer = await session.get(User, order.buyer_id)
    seller = await session.get(User, order.seller_id)

    return _order_to_read(
        order,
        listing_title=title,
        listing_image=first_image,
        buyer_prenom=buyer.prenom if buyer else None,
        seller_prenom=seller.prenom if seller else None,
    )


@router.put("/{order_id}/ship")
async def ship_order(
    order_id: int,
    body: ShipRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Seller marks order as shipped with tracking info."""
    order = await session.get(MarketplaceOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    if order.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul le vendeur peut expédier")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Cette commande ne peut pas être expédiée")

    order.tracking_number = body.tracking_number
    order.tracking_carrier = body.tracking_carrier
    order.status = "shipped"
    order.shipped_at = datetime.now(timezone.utc)
    session.add(order)
    await session.commit()
    logger.info("Order %d shipped by seller %d", order_id, current_user.id)
    return {"ok": True, "status": "shipped"}


@router.put("/{order_id}/delivered")
async def confirm_delivery(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Buyer confirms receipt. Marks order as delivered."""
    order = await session.get(MarketplaceOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Seul l'acheteur peut confirmer la réception")
    if order.status != "shipped":
        raise HTTPException(status_code=400, detail="La commande n'a pas encore été expédiée")

    order.status = "delivered"
    order.delivered_at = datetime.now(timezone.utc)
    session.add(order)
    await session.commit()
    logger.info("Order %d delivered, confirmed by buyer %d", order_id, current_user.id)
    return {"ok": True, "status": "delivered"}

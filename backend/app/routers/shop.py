"""
Marketplace shop endpoints — browse, create, and manage listings.

GET  /shop/listings                  — browse listings (public, no auth)
GET  /shop/listings/{listing_id}     — listing detail (public)
GET  /shop/search                    — text search (public)
GET  /shop/my-listings               — seller's own listings (auth)
POST /shop/listings                  — create listing (auth)
POST /shop/listings/from-wardrobe/{item_id} — create from wardrobe item (auth)
PUT  /shop/listings/{listing_id}     — update listing (auth, owner only)
DELETE /shop/listings/{listing_id}   — cancel listing (auth, owner only)
POST /shop/listings/{listing_id}/ai-price — AI price suggestion (auth)
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth import get_current_user
from app.database import get_session
from app.models import (
    User, ClothingItem, MarketplaceListing,
    ListingCreate, ListingUpdate, ListingRead,
    AIRequest,
)
from app.services.ai_pricing import suggest_listing_price
from app.services.ai_base import drain_pending_requests

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shop", tags=["marketplace"])

SHIPPING_FLAT_CENTS = 499  # €4.99 flat shipping


def _listing_to_read(listing: MarketplaceListing, seller_prenom: Optional[str] = None) -> dict:
    """Convert a MarketplaceListing to a ListingRead-compatible dict."""
    image_urls = listing.image_urls
    if isinstance(image_urls, str):
        try:
            image_urls = json.loads(image_urls)
        except (json.JSONDecodeError, TypeError):
            image_urls = []

    return {
        "id": listing.id,
        "seller_id": listing.seller_id,
        "clothing_item_id": listing.clothing_item_id,
        "title": listing.title,
        "description": listing.description,
        "price_cents": listing.price_cents,
        "condition": listing.condition,
        "size": listing.size,
        "brand": listing.brand,
        "category_type": listing.category_type,
        "color": listing.color,
        "season": listing.season,
        "image_urls": image_urls,
        "status": listing.status,
        "views_count": listing.views_count,
        "created_at": listing.created_at.isoformat(),
        "seller_prenom": seller_prenom,
    }


# ── Public browsing ─────────────────────────────────────────────────────────

@router.get("/listings")
async def browse_listings(
    session: AsyncSession = Depends(get_session),
    category_type: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    season: Optional[str] = Query(None),
    size: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    price_min: Optional[int] = Query(None, description="Min price in cents"),
    price_max: Optional[int] = Query(None, description="Max price in cents"),
    sort: str = Query("recent", pattern="^(recent|price_asc|price_desc|popular)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Browse active listings. No auth required."""
    query = select(MarketplaceListing, User.prenom).join(
        User, MarketplaceListing.seller_id == User.id
    ).where(MarketplaceListing.status == "active")

    if category_type:
        query = query.where(MarketplaceListing.category_type == category_type)
    if color:
        query = query.where(MarketplaceListing.color == color)
    if season:
        query = query.where(MarketplaceListing.season == season)
    if size:
        query = query.where(MarketplaceListing.size == size)
    if brand:
        query = query.where(func.lower(MarketplaceListing.brand) == brand.lower())
    if condition:
        query = query.where(MarketplaceListing.condition == condition)
    if price_min is not None:
        query = query.where(MarketplaceListing.price_cents >= price_min)
    if price_max is not None:
        query = query.where(MarketplaceListing.price_cents <= price_max)

    if sort == "price_asc":
        query = query.order_by(MarketplaceListing.price_cents.asc())
    elif sort == "price_desc":
        query = query.order_by(MarketplaceListing.price_cents.desc())
    elif sort == "popular":
        query = query.order_by(MarketplaceListing.views_count.desc())
    else:
        query = query.order_by(MarketplaceListing.created_at.desc())

    query = query.offset(offset).limit(limit)
    result = await session.exec(query)
    rows = result.all()

    return [_listing_to_read(listing, prenom) for listing, prenom in rows]


@router.get("/listings/{listing_id}")
async def get_listing(
    listing_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Get a single listing detail. Increments view count."""
    query = select(MarketplaceListing, User.prenom).join(
        User, MarketplaceListing.seller_id == User.id
    ).where(MarketplaceListing.id == listing_id)

    result = await session.exec(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    listing, prenom = row
    listing.views_count += 1
    session.add(listing)
    await session.commit()

    return _listing_to_read(listing, prenom)


@router.get("/search")
async def search_listings(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """Text search across title, description, brand."""
    pattern = f"%{q}%"
    query = select(MarketplaceListing, User.prenom).join(
        User, MarketplaceListing.seller_id == User.id
    ).where(
        MarketplaceListing.status == "active",
        (
            MarketplaceListing.title.ilike(pattern)
            | MarketplaceListing.description.ilike(pattern)
            | MarketplaceListing.brand.ilike(pattern)
            | MarketplaceListing.category_type.ilike(pattern)
        ),
    ).order_by(MarketplaceListing.created_at.desc()).limit(limit)

    result = await session.exec(query)
    rows = result.all()
    return [_listing_to_read(listing, prenom) for listing, prenom in rows]


# ── Seller endpoints ────────────────────────────────────────────────────────

@router.get("/my-listings")
async def my_listings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get current user's listings (all statuses)."""
    query = select(MarketplaceListing).where(
        MarketplaceListing.seller_id == current_user.id
    ).order_by(MarketplaceListing.created_at.desc())

    result = await session.exec(query)
    listings = result.all()
    return [_listing_to_read(l, current_user.prenom) for l in listings]


@router.post("/listings")
async def create_listing(
    body: ListingCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new listing."""
    if body.price_cents < 100:
        raise HTTPException(status_code=400, detail="Prix minimum : 1,00 €")
    if body.price_cents > 100_000:
        raise HTTPException(status_code=400, detail="Prix maximum : 1 000,00 €")

    listing = MarketplaceListing(
        seller_id=current_user.id,
        clothing_item_id=body.clothing_item_id,
        title=body.title,
        description=body.description,
        price_cents=body.price_cents,
        condition=body.condition,
        size=body.size,
        brand=body.brand,
        category_type=body.category_type,
        color=body.color,
        season=body.season,
        image_urls=json.dumps(body.image_urls),
        status="active",
    )
    session.add(listing)
    await session.commit()
    await session.refresh(listing)
    logger.info("Listing %d created by user %d", listing.id, current_user.id)
    return _listing_to_read(listing, current_user.prenom)


@router.post("/listings/from-wardrobe/{item_id}")
async def create_listing_from_wardrobe(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Pre-fill a listing from a wardrobe item. Returns pre-filled data for review."""
    item = await session.get(ClothingItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vêtement introuvable")
    if item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ce vêtement ne vous appartient pas")

    # Parse tags_ia for brand/style
    brand = ""
    try:
        tags = json.loads(item.tags_ia) if item.tags_ia else {}
        brand = tags.get("marque", "") or tags.get("brand", "")
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "clothing_item_id": item.id,
        "title": item.type,
        "description": "",
        "price_cents": 0,
        "condition": "Bon état",
        "size": None,
        "brand": brand,
        "category_type": item.type,
        "color": item.couleur,
        "season": item.saison,
        "image_urls": [item.image_path],
    }


@router.put("/listings/{listing_id}")
async def update_listing(
    listing_id: int,
    body: ListingUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update a listing. Only owner, only if active or draft."""
    listing = await session.get(MarketplaceListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if listing.status not in ("active", "draft"):
        raise HTTPException(status_code=400, detail="Cette annonce ne peut plus être modifiée")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(listing, key, value)

    session.add(listing)
    await session.commit()
    await session.refresh(listing)
    return _listing_to_read(listing, current_user.prenom)


@router.delete("/listings/{listing_id}")
async def cancel_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Cancel/remove a listing."""
    listing = await session.get(MarketplaceListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if listing.status == "sold":
        raise HTTPException(status_code=400, detail="Impossible de supprimer une annonce vendue")

    listing.status = "cancelled"
    session.add(listing)
    await session.commit()
    logger.info("Listing %d cancelled by user %d", listing_id, current_user.id)
    return {"ok": True}


@router.post("/listings/{listing_id}/ai-price")
async def ai_price_suggestion(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get AI price suggestion for a listing."""
    listing = await session.get(MarketplaceListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    result = await suggest_listing_price(
        {
            "type": listing.category_type or listing.title,
            "brand": listing.brand or "",
            "condition": listing.condition,
            "season": listing.season,
            "color": listing.color,
            "tags_ia": "",
        },
        user_id=current_user.id,
    )

    # Flush AI request logs
    for entry in drain_pending_requests():
        session.add(AIRequest(**entry))
    await session.commit()

    return result

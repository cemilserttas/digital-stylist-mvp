"""
Shipping address endpoints.

GET    /addresses/{user_id}          — list user's addresses
POST   /addresses/{user_id}          — create new address
PUT    /addresses/{address_id}       — update address
DELETE /addresses/{address_id}       — delete address
PUT    /addresses/{address_id}/default — set as default
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth import get_current_user
from app.database import get_session
from app.models import User, ShippingAddress, ShippingAddressCreate, ShippingAddressRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/addresses", tags=["addresses"])


@router.get("/{user_id}")
async def list_addresses(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    query = select(ShippingAddress).where(
        ShippingAddress.user_id == user_id
    ).order_by(ShippingAddress.is_default.desc(), ShippingAddress.created_at.desc())
    result = await session.exec(query)
    return result.all()


@router.post("/{user_id}")
async def create_address(
    user_id: int,
    body: ShippingAddressCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    # If this is the first address or marked as default, unset other defaults
    if body.is_default:
        existing = await session.exec(
            select(ShippingAddress).where(
                ShippingAddress.user_id == user_id,
                ShippingAddress.is_default == True,
            )
        )
        for addr in existing.all():
            addr.is_default = False
            session.add(addr)

    # If no addresses exist, make this the default
    count_result = await session.exec(
        select(ShippingAddress).where(ShippingAddress.user_id == user_id).limit(1)
    )
    is_first = count_result.first() is None

    address = ShippingAddress(
        user_id=user_id,
        label=body.label,
        full_name=body.full_name,
        line1=body.line1,
        line2=body.line2,
        postal_code=body.postal_code,
        city=body.city,
        country=body.country,
        phone=body.phone,
        is_default=body.is_default or is_first,
    )
    session.add(address)
    await session.commit()
    await session.refresh(address)
    logger.info("Address %d created for user %d", address.id, user_id)
    return address


@router.put("/{address_id}")
async def update_address(
    address_id: int,
    body: ShippingAddressCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    address = await session.get(ShippingAddress, address_id)
    if not address:
        raise HTTPException(status_code=404, detail="Adresse introuvable")
    if address.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(address, key, value)

    session.add(address)
    await session.commit()
    await session.refresh(address)
    return address


@router.delete("/{address_id}")
async def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    address = await session.get(ShippingAddress, address_id)
    if not address:
        raise HTTPException(status_code=404, detail="Adresse introuvable")
    if address.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    await session.delete(address)
    await session.commit()
    logger.info("Address %d deleted", address_id)
    return {"ok": True}


@router.put("/{address_id}/default")
async def set_default_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    address = await session.get(ShippingAddress, address_id)
    if not address:
        raise HTTPException(status_code=404, detail="Adresse introuvable")
    if address.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    # Unset all other defaults
    existing = await session.exec(
        select(ShippingAddress).where(
            ShippingAddress.user_id == current_user.id,
            ShippingAddress.is_default == True,
        )
    )
    for addr in existing.all():
        addr.is_default = False
        session.add(addr)

    address.is_default = True
    session.add(address)
    await session.commit()
    return {"ok": True}

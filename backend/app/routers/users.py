from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List

from app.database import get_session
from app.models import User, UserRead, UserCreate, LinkClick, LinkClickCreate, LinkClickRead, ClothingItem

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/create", response_model=UserRead)
async def create_user(
    user_create: UserCreate,
    session: AsyncSession = Depends(get_session)
):
    user = User.from_orm(user_create)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/login", response_model=UserRead)
async def login_user(
    data: dict,
    session: AsyncSession = Depends(get_session)
):
    prenom = data.get("prenom", "").strip()
    if not prenom:
        raise HTTPException(status_code=400, detail="Le prénom est requis")

    result = await session.execute(
        select(User).where(User.prenom.ilike(prenom))
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail=f"Aucun compte trouvé pour '{prenom}'")

    return user


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    data: dict,
    session: AsyncSession = Depends(get_session)
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    allowed_fields = ["prenom", "morphologie", "genre", "age", "style_prefere"]
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_session)
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Delete link clicks
    result = await session.execute(select(LinkClick).where(LinkClick.user_id == user_id))
    for click in result.scalars().all():
        await session.delete(click)

    # Delete clothing items
    result = await session.execute(select(ClothingItem).where(ClothingItem.user_id == user_id))
    for item in result.scalars().all():
        await session.delete(item)

    await session.delete(user)
    await session.commit()
    return {"message": "Compte supprimé avec succès"}


# --- Link Click History ---

@router.post("/{user_id}/clicks", response_model=LinkClickRead)
async def save_click(
    user_id: int,
    click_data: LinkClickCreate,
    session: AsyncSession = Depends(get_session)
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    click = LinkClick(
        product_name=click_data.product_name,
        marque=click_data.marque,
        prix=click_data.prix,
        url=click_data.url,
        user_id=user_id,
    )
    session.add(click)
    await session.commit()
    await session.refresh(click)
    return click


@router.get("/{user_id}/clicks", response_model=List[LinkClickRead])
async def get_clicks(
    user_id: int,
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(LinkClick)
        .where(LinkClick.user_id == user_id)
        .order_by(LinkClick.clicked_at.desc())
    )
    return result.scalars().all()


@router.delete("/{user_id}/clicks")
async def clear_clicks(
    user_id: int,
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(LinkClick).where(LinkClick.user_id == user_id))
    for click in result.scalars().all():
        await session.delete(click)
    await session.commit()
    return {"message": "Historique effacé"}

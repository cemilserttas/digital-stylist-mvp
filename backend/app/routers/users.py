import logging

from fastapi import APIRouter, Depends, HTTPException
from passlib.hash import bcrypt
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List

from app.database import get_session
from app.models import User, UserRead, UserCreate, LinkClick, LinkClickCreate, LinkClickRead, ClothingItem
from app.auth import create_access_token, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


class LoginRequest(BaseModel):
    prenom: str
    password: str


@router.post("/create")
async def create_user(
    user_create: UserCreate,
    session: AsyncSession = Depends(get_session)
):
    if len(user_create.password) < 4:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 4 caractères")

    user_data = user_create.model_dump(exclude={"password"})
    user = User(**user_data, password_hash=bcrypt.hash(user_create.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    token = create_access_token(user.id)
    logger.info("User created: id=%d prenom=%s", user.id, user.prenom)
    return {"user": UserRead.model_validate(user).model_dump(), "token": token}


@router.post("/login")
async def login_user(
    data: LoginRequest,
    session: AsyncSession = Depends(get_session)
):
    prenom = data.prenom.strip()
    if not prenom:
        raise HTTPException(status_code=400, detail="Le prénom est requis")

    result = await session.execute(
        select(User).where(User.prenom.ilike(prenom))
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail=f"Aucun compte trouvé pour '{prenom}'")

    # Existing users without password_hash: allow login by name (backward compat)
    if user.password_hash is None:
        logger.warning("User %d logged in without password (legacy account)", user.id)
    elif not bcrypt.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    token = create_access_token(user.id)
    logger.info("User logged in: id=%d prenom=%s", user.id, user.prenom)
    return {"user": UserRead.model_validate(user).model_dump(), "token": token}


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    result = await session.execute(
        select(LinkClick)
        .where(LinkClick.user_id == user_id)
        .order_by(LinkClick.clicked_at.desc())
    )
    return result.scalars().all()


@router.delete("/{user_id}/clicks")
async def clear_clicks(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    result = await session.execute(select(LinkClick).where(LinkClick.user_id == user_id))
    for click in result.scalars().all():
        await session.delete(click)
    await session.commit()
    return {"message": "Historique effacé"}

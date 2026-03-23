import logging
import re
import secrets
import string
from datetime import timedelta, timezone, datetime, date

import bcrypt as _bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List, Optional

from app.database import get_session
from app.models import User, UserRead, UserCreate, LinkClick, LinkClickCreate, LinkClickRead, ClothingItem
from app.auth import create_access_token, get_current_user
from app.services.email_service import send_welcome_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

REFERRAL_PREMIUM_THRESHOLD = 3  # referrals needed to earn 1 free month of premium

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def update_streak(user: User) -> bool:
    """
    Increment streak if user is active today. Returns True if streak milestone hit.
    Call this on any meaningful user action (upload, suggestion viewed).
    """
    today = date.today()
    last = user.streak_last_activity

    if last == today:
        return False  # already counted today

    if last == today - timedelta(days=1):
        user.streak_current += 1
    else:
        # Gap > 1 day → reset streak
        user.streak_current = 1

    user.streak_last_activity = today
    if user.streak_current > user.streak_max:
        user.streak_max = user.streak_current

    milestone = user.streak_current in (3, 7, 14, 30)
    logger.info("Streak updated user=%d streak=%d milestone=%s", user.id, user.streak_current, milestone)
    return milestone


def _generate_referral_code(prenom: str) -> str:
    """REF_PRENOM_XXXX — 4 random uppercase alphanumeric chars."""
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"REF_{prenom.upper()[:8]}_{suffix}"


class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = True


class UpdateUserRequest(BaseModel):
    prenom: Optional[str] = None
    morphologie: Optional[str] = None
    genre: Optional[str] = None
    age: Optional[int] = None
    style_prefere: Optional[str] = None
    email: Optional[str] = None


@router.post("/create")
async def create_user(
    user_create: UserCreate,
    session: AsyncSession = Depends(get_session)
):
    # Validate email format
    email = user_create.email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Adresse email invalide")

    # Check email uniqueness
    existing = await session.execute(select(User).where(User.email == email))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Un compte existe déjà avec cet email")

    if len(user_create.password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")

    # Resolve referrer if a referral code was provided
    referrer: Optional[User] = None
    if user_create.referral_code:
        result = await session.execute(
            select(User).where(User.referral_code == user_create.referral_code)
        )
        referrer = result.scalars().first()
        if not referrer:
            raise HTTPException(status_code=400, detail="Code de parrainage invalide")

    user_data = user_create.model_dump(exclude={"password", "referral_code", "email"})
    pw = _bcrypt.hashpw(user_create.password.encode(), _bcrypt.gensalt()).decode()

    # Generate unique referral code for the new user
    for _ in range(5):
        candidate = _generate_referral_code(user_create.prenom)
        existing_ref = await session.execute(select(User).where(User.referral_code == candidate))
        if not existing_ref.scalars().first():
            break
    else:
        candidate = None  # extremely unlikely collision fallback

    user = User(
        **user_data,
        email=email,
        password_hash=pw,
        referral_code=candidate,
        referred_by_id=referrer.id if referrer else None,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Credit the referrer
    if referrer:
        referrer.referral_count += 1
        # Every REFERRAL_PREMIUM_THRESHOLD referrals → grant 1 month premium
        if referrer.referral_count % REFERRAL_PREMIUM_THRESHOLD == 0:
            now = datetime.now(timezone.utc)
            base = referrer.premium_until if (referrer.premium_until and referrer.premium_until > now) else now
            referrer.premium_until = base + timedelta(days=30)
            referrer.is_premium = True
            logger.info(
                "Referrer %d earned premium until %s (referral #%d)",
                referrer.id, referrer.premium_until, referrer.referral_count,
            )
        session.add(referrer)
        await session.commit()

    token = create_access_token(user.id, remember_me=True)
    logger.info("User created: id=%d email=%s referred_by=%s", user.id, email, referrer.id if referrer else None)

    # Fire-and-forget welcome email
    if email:
        import asyncio
        asyncio.create_task(send_welcome_email(to=email, prenom=user.prenom))

    return {"user": UserRead.model_validate(user).model_dump(), "token": token}


@router.post("/login")
async def login_user(
    data: LoginRequest,
    session: AsyncSession = Depends(get_session)
):
    email = data.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="L'email est requis")

    result = await session.execute(
        select(User).where(User.email == email)
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec cet email")

    if user.password_hash is None:
        raise HTTPException(status_code=401, detail="Ce compte nécessite une réinitialisation du mot de passe")
    elif not _bcrypt.checkpw(data.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    token = create_access_token(user.id, remember_me=data.remember_me)
    logger.info("User logged in: id=%d email=%s remember=%s", user.id, email, data.remember_me)
    return {"user": UserRead.model_validate(user).model_dump(), "token": token}


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Fetch current user data — useful after Stripe payment to refresh premium status."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return UserRead.model_validate(user)


@router.get("/{user_id}/referral")
async def get_referral_info(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    next_threshold = REFERRAL_PREMIUM_THRESHOLD - (user.referral_count % REFERRAL_PREMIUM_THRESHOLD)
    if next_threshold == REFERRAL_PREMIUM_THRESHOLD:
        next_threshold = 0  # just earned a reward, counter reset cycle

    return {
        "referral_code": user.referral_code,
        "referral_count": user.referral_count,
        "referrals_until_next_reward": next_threshold,
        "reward_description": f"Parraine {REFERRAL_PREMIUM_THRESHOLD} ami(e)s → 1 mois Premium offert",
    }


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    data: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    update_data = data.model_dump(exclude_none=True)

    # If updating email, validate and check uniqueness
    if "email" in update_data:
        new_email = update_data["email"].strip().lower()
        if not _EMAIL_RE.match(new_email):
            raise HTTPException(status_code=400, detail="Adresse email invalide")
        existing = await session.execute(
            select(User).where(User.email == new_email, User.id != user_id)
        )
        if existing.scalars().first():
            raise HTTPException(status_code=409, detail="Cet email est déjà utilisé")
        update_data["email"] = new_email

    for field, value in update_data.items():
        setattr(user, field, value)

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

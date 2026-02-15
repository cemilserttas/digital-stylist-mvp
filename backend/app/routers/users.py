from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models import User, UserRead, UserCreate

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

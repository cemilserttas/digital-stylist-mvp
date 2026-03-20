from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
import os

sqlite_file_name = "stylist.db"
sqlite_url = f"sqlite+aiosqlite:///{sqlite_file_name}"

# echo activé uniquement si DB_ECHO=true (développement uniquement, jamais en prod)
_db_echo = os.getenv("DB_ECHO", "false").lower() == "true"
engine = create_async_engine(sqlite_url, echo=_db_echo, future=True)

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all) # Uncomment to reset DB
        await conn.run_sync(SQLModel.metadata.create_all)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

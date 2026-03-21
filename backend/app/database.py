from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
import os

# echo activé uniquement si DB_ECHO=true (développement uniquement, jamais en prod)
_db_echo = os.getenv("DB_ECHO", "false").lower() == "true"

_database_url = os.getenv("DATABASE_URL")
if _database_url:
    # Render / Heroku provide postgres:// — asyncpg requires postgresql+asyncpg://
    if _database_url.startswith("postgres://"):
        _database_url = _database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif _database_url.startswith("postgresql://"):
        _database_url = _database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(_database_url, echo=_db_echo, future=True)
else:
    sqlite_file_name = "stylist.db"
    sqlite_url = f"sqlite+aiosqlite:///{sqlite_file_name}"
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

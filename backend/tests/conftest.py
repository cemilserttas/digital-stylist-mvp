"""
Shared fixtures for Digital Stylist backend tests.
- In-memory SQLite database
- httpx AsyncClient wired to the FastAPI app
- Factory helpers for User and ClothingItem
- JWT auth helpers
"""
import os
import logging

# Override env vars BEFORE any app import
os.environ["GEMINI_API_KEY"] = "test-fake-key"
os.environ["ADMIN_KEY"] = "test-admin-key-1234567890"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-for-unit-tests-only"

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.database import get_session
from app.main import app
from app.models import User, Morphology, ClothingItem

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory SQLite engine (fresh per test session)
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite+aiosqlite://"

engine_test = create_async_engine(TEST_DB_URL, echo=False, future=True)
async_session_test = sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)


async def _override_get_session():
    async with async_session_test() as session:
        yield session


app.dependency_overrides[get_session] = _override_get_session


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test; drop after."""
    async with engine_test.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture
async def session():
    """Provide a raw AsyncSession for direct DB assertions."""
    async with async_session_test() as s:
        yield s


@pytest.fixture
async def client():
    """httpx AsyncClient wired to the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Factory helpers
# ---------------------------------------------------------------------------
@pytest.fixture
def make_user():
    """Return a factory coroutine to insert a User via API.
       Returns dict with keys: user (dict) and token (str).
    """

    async def _create(
        ac: AsyncClient,
        prenom: str = "TestUser",
        morphologie: str = "RECTANGLE",
        genre: str = "Homme",
        age: int = 25,
        password: str = "TestPass1",
    ) -> dict:
        resp = await ac.post(
            "/users/create",
            json={
                "prenom": prenom,
                "morphologie": morphologie,
                "genre": genre,
                "age": age,
                "password": password,
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        # Response is now {"user": {...}, "token": "..."}
        assert "user" in body
        assert "token" in body
        return body

    return _create


@pytest.fixture
def auth_headers():
    """Return Authorization headers dict from a token string."""

    def _headers(token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    return _headers


@pytest.fixture
def make_clothing_item():
    """Return a factory coroutine to insert a ClothingItem directly in DB."""

    async def _create(
        session_: AsyncSession,
        user_id: int,
        type_: str = "T-shirt",
        couleur: str = "Noir",
        saison: str = "Toutes saisons",
        category: str = "wardrobe",
    ) -> ClothingItem:
        item = ClothingItem(
            user_id=user_id,
            type=type_,
            couleur=couleur,
            saison=saison,
            tags_ia="",
            image_path="uploads/fake.jpg",
            category=category,
        )
        session_.add(item)
        await session_.commit()
        await session_.refresh(item)
        return item

    return _create

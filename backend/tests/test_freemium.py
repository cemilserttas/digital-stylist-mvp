"""
Tests for freemium daily usage gates on /suggestions and /chat endpoints.

Covers:
- Free user within limit → 200
- Free user over suggestions limit (1/day) → 429
- Free user over chat limit (5/day) → 429
- Premium user ignores limits → 200
- Counter resets when date changes
- Counter increments correctly across calls
"""
import logging
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User

logger = logging.getLogger(__name__)

WEATHER_PAYLOAD = {"temperature": 18.0, "description": "ensoleillé", "ville": "Paris"}
CHAT_PAYLOAD = {"message": "Que porter aujourd'hui ?", "history": []}

FAKE_SUGGESTION = {"suggestion": "Portez un jean et un t-shirt blanc.", "items": []}
FAKE_CHAT = {"response": "Je recommande un look casual.", "shops": []}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_user(client: AsyncClient, make_user, prenom: str = "FreemUser") -> dict:
    return await make_user(client, prenom=prenom)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# /suggestions gate
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_suggestions_free_first_call_allowed(
    client: AsyncClient, make_user, session: AsyncSession
):
    """First suggestion of the day is allowed for free users."""
    data = await _create_user(client, make_user, "SugFree1")
    user_id = data["user"]["id"]
    token = data["token"]

    with patch(
        "app.services.ai_suggestions.get_daily_suggestions",
        new=AsyncMock(return_value=FAKE_SUGGESTION),
    ):
        resp = await client.post(
            f"/suggestions/{user_id}",
            json=WEATHER_PAYLOAD,
            headers=_auth(token),
        )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_suggestions_free_second_call_blocked(
    client: AsyncClient, make_user, session: AsyncSession
):
    """Second suggestion on the same day is rejected with 429 for free users."""
    data = await _create_user(client, make_user, "SugFree2")
    user_id = data["user"]["id"]
    token = data["token"]

    # Seed the DB: user already used their 1 suggestion today
    user = await session.get(User, user_id)
    user.suggestions_date = date.today()
    user.suggestions_count_today = 1
    session.add(user)
    await session.commit()

    resp = await client.post(
        f"/suggestions/{user_id}",
        json=WEATHER_PAYLOAD,
        headers=_auth(token),
    )
    assert resp.status_code == 429
    assert "Premium" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_suggestions_premium_ignores_limit(
    client: AsyncClient, make_user, session: AsyncSession
):
    """Premium users bypass the daily suggestion limit."""
    data = await _create_user(client, make_user, "SugPremium")
    user_id = data["user"]["id"]
    token = data["token"]

    # Mark user as premium and already at the free limit
    user = await session.get(User, user_id)
    user.is_premium = True
    user.suggestions_date = date.today()
    user.suggestions_count_today = 99
    session.add(user)
    await session.commit()

    with patch(
        "app.services.ai_suggestions.get_daily_suggestions",
        new=AsyncMock(return_value=FAKE_SUGGESTION),
    ):
        resp = await client.post(
            f"/suggestions/{user_id}",
            json=WEATHER_PAYLOAD,
            headers=_auth(token),
        )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_suggestions_counter_resets_next_day(
    client: AsyncClient, make_user, session: AsyncSession
):
    """A free user who used suggestions yesterday can use one today."""
    data = await _create_user(client, make_user, "SugReset")
    user_id = data["user"]["id"]
    token = data["token"]

    # Seed: limit hit, but yesterday
    yesterday = date.today() - timedelta(days=1)
    user = await session.get(User, user_id)
    user.suggestions_date = yesterday
    user.suggestions_count_today = 1
    session.add(user)
    await session.commit()

    with patch(
        "app.services.ai_suggestions.get_daily_suggestions",
        new=AsyncMock(return_value=FAKE_SUGGESTION),
    ):
        resp = await client.post(
            f"/suggestions/{user_id}",
            json=WEATHER_PAYLOAD,
            headers=_auth(token),
        )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_suggestions_counter_increments(
    client: AsyncClient, make_user, session: AsyncSession
):
    """Counter is incremented to 1 after a successful first call."""
    data = await _create_user(client, make_user, "SugCount")
    user_id = data["user"]["id"]
    token = data["token"]

    with patch(
        "app.services.ai_suggestions.get_daily_suggestions",
        new=AsyncMock(return_value=FAKE_SUGGESTION),
    ):
        resp = await client.post(
            f"/suggestions/{user_id}",
            json=WEATHER_PAYLOAD,
            headers=_auth(token),
        )
    assert resp.status_code == 200

    await session.refresh(await session.get(User, user_id))
    user = await session.get(User, user_id)
    assert user.suggestions_count_today == 1
    assert user.suggestions_date == date.today()


# ---------------------------------------------------------------------------
# /chat gate
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_chat_free_within_limit_allowed(
    client: AsyncClient, make_user, session: AsyncSession
):
    """4th chat message (still under limit of 5) is allowed."""
    data = await _create_user(client, make_user, "ChatFree1")
    user_id = data["user"]["id"]
    token = data["token"]

    user = await session.get(User, user_id)
    user.chat_date = date.today()
    user.chat_count_today = 4
    session.add(user)
    await session.commit()

    with patch(
        "app.services.ai_service.chat_with_stylist",
        new=AsyncMock(return_value=FAKE_CHAT),
    ):
        resp = await client.post(
            f"/chat/{user_id}",
            json=CHAT_PAYLOAD,
            headers=_auth(token),
        )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_chat_free_over_limit_blocked(
    client: AsyncClient, make_user, session: AsyncSession
):
    """6th chat message exceeds daily limit of 5 → 429."""
    data = await _create_user(client, make_user, "ChatFree2")
    user_id = data["user"]["id"]
    token = data["token"]

    user = await session.get(User, user_id)
    user.chat_date = date.today()
    user.chat_count_today = 5
    session.add(user)
    await session.commit()

    resp = await client.post(
        f"/chat/{user_id}",
        json=CHAT_PAYLOAD,
        headers=_auth(token),
    )
    assert resp.status_code == 429
    assert "Premium" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_chat_premium_ignores_limit(
    client: AsyncClient, make_user, session: AsyncSession
):
    """Premium users bypass the daily chat limit."""
    data = await _create_user(client, make_user, "ChatPremium")
    user_id = data["user"]["id"]
    token = data["token"]

    user = await session.get(User, user_id)
    user.is_premium = True
    user.chat_date = date.today()
    user.chat_count_today = 99
    session.add(user)
    await session.commit()

    with patch(
        "app.services.ai_service.chat_with_stylist",
        new=AsyncMock(return_value=FAKE_CHAT),
    ):
        resp = await client.post(
            f"/chat/{user_id}",
            json=CHAT_PAYLOAD,
            headers=_auth(token),
        )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_chat_counter_resets_next_day(
    client: AsyncClient, make_user, session: AsyncSession
):
    """Chat limit resets the day after it was hit."""
    data = await _create_user(client, make_user, "ChatReset")
    user_id = data["user"]["id"]
    token = data["token"]

    yesterday = date.today() - timedelta(days=1)
    user = await session.get(User, user_id)
    user.chat_date = yesterday
    user.chat_count_today = 5
    session.add(user)
    await session.commit()

    with patch(
        "app.services.ai_service.chat_with_stylist",
        new=AsyncMock(return_value=FAKE_CHAT),
    ):
        resp = await client.post(
            f"/chat/{user_id}",
            json=CHAT_PAYLOAD,
            headers=_auth(token),
        )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_chat_cross_user_blocked(
    client: AsyncClient, make_user, session: AsyncSession
):
    """User A cannot send chat messages as user B."""
    data_a = await _create_user(client, make_user, "ChatUserA")
    data_b = await _create_user(client, make_user, "ChatUserB")

    resp = await client.post(
        f"/chat/{data_b['user']['id']}",
        json=CHAT_PAYLOAD,
        headers=_auth(data_a["token"]),
    )
    assert resp.status_code == 403

"""
Tests for /admin endpoints:
- valid admin key → 200
- invalid admin key → 403
- missing header → 422
"""
import logging

import pytest
from httpx import AsyncClient

logger = logging.getLogger(__name__)

VALID_ADMIN_KEY = "test-admin-key-1234567890"  # matches conftest.py env override


# ---------------------------------------------------------------------------
# Valid key → success
# ---------------------------------------------------------------------------
async def test_admin_users_valid_key(client: AsyncClient, make_user):
    await make_user(client, prenom="Admin1")
    resp = await client.get(
        "/admin/users",
        headers={"X-Admin-Key": VALID_ADMIN_KEY},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "users" in body
    assert body["total"] >= 1


async def test_admin_stats_valid_key(client: AsyncClient, make_user):
    await make_user(client, prenom="StatUser")
    resp = await client.get(
        "/admin/stats",
        headers={"X-Admin-Key": VALID_ADMIN_KEY},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "users" in body
    assert "wardrobe" in body
    assert "monetization" in body
    assert body["users"]["total"] >= 1


# ---------------------------------------------------------------------------
# Invalid key → 403
# ---------------------------------------------------------------------------
async def test_admin_users_invalid_key(client: AsyncClient):
    resp = await client.get(
        "/admin/users",
        headers={"X-Admin-Key": "wrong-key"},
    )
    assert resp.status_code == 403


async def test_admin_stats_invalid_key(client: AsyncClient):
    resp = await client.get(
        "/admin/stats",
        headers={"X-Admin-Key": "wrong-key"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Missing header → 422
# ---------------------------------------------------------------------------
async def test_admin_users_no_header(client: AsyncClient):
    resp = await client.get("/admin/users")
    assert resp.status_code == 422


async def test_admin_stats_no_header(client: AsyncClient):
    resp = await client.get("/admin/stats")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Admin user list includes clothing count (JOIN query)
# ---------------------------------------------------------------------------
async def test_admin_users_clothing_count(client: AsyncClient, make_user, session, make_clothing_item):
    user_data = await make_user(client, prenom="CountUser")
    user_id = user_data["user"]["id"]

    # Add 3 clothing items via DB
    for i in range(3):
        await make_clothing_item(session, user_id=user_id, type_=f"Item{i}")

    resp = await client.get(
        "/admin/users",
        headers={"X-Admin-Key": VALID_ADMIN_KEY},
    )
    assert resp.status_code == 200
    body = resp.json()

    target = next(u for u in body["users"] if u["id"] == user_id)
    assert target["clothing_count"] == 3

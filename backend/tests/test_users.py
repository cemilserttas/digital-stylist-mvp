"""
Tests for /users endpoints:
- create (returns user + token), login (returns user + token)
- update (requires JWT), delete (requires JWT)
- edge cases: user inexistant, empty prénom, unauthorized access
"""
import logging

import pytest
from httpx import AsyncClient

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------
async def test_create_user(client: AsyncClient, make_user):
    data = await make_user(client, prenom="Alice", morphologie="SABLIER", genre="Femme", age=30)
    user = data["user"]
    assert user["prenom"] == "Alice"
    assert user["morphologie"] == "SABLIER"
    assert user["genre"] == "Femme"
    assert user["age"] == 30
    assert "id" in user
    assert "token" in data
    assert len(data["token"]) > 20  # JWT is a long string


# ---------------------------------------------------------------------------
# Login (by prénom)
# ---------------------------------------------------------------------------
async def test_login_existing_user(client: AsyncClient, make_user):
    created = await make_user(client, prenom="Bob", password="MyPass1")
    resp = await client.post("/users/login", json={"prenom": "Bob", "password": "MyPass1"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["id"] == created["user"]["id"]
    assert "token" in body


async def test_login_wrong_password(client: AsyncClient, make_user):
    await make_user(client, prenom="WrongPwd", password="CorrectPass")
    resp = await client.post("/users/login", json={"prenom": "WrongPwd", "password": "WrongPass"})
    assert resp.status_code == 401


async def test_login_case_insensitive(client: AsyncClient, make_user):
    await make_user(client, prenom="Charlie", password="TestPass1")
    resp = await client.post("/users/login", json={"prenom": "charlie", "password": "TestPass1"})
    assert resp.status_code == 200
    assert resp.json()["user"]["prenom"] == "Charlie"


async def test_login_unknown_user(client: AsyncClient):
    resp = await client.post("/users/login", json={"prenom": "Inconnu", "password": "any"})
    assert resp.status_code == 404


async def test_login_empty_prenom(client: AsyncClient):
    resp = await client.post("/users/login", json={"prenom": "", "password": "any"})
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Update (requires JWT)
# ---------------------------------------------------------------------------
async def test_update_user(client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="Dave")
    user_id = created["user"]["id"]
    token = created["token"]

    resp = await client.put(
        f"/users/{user_id}",
        json={"prenom": "David", "age": 35},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["prenom"] == "David"
    assert body["age"] == 35


async def test_update_user_no_auth(client: AsyncClient, make_user):
    """Update without JWT → 403 (missing Bearer header)."""
    created = await make_user(client, prenom="NoAuth")
    user_id = created["user"]["id"]
    resp = await client.put(f"/users/{user_id}", json={"prenom": "Hacker"})
    assert resp.status_code == 401


async def test_update_other_user(client: AsyncClient, make_user, auth_headers):
    """A user cannot update another user's profile."""
    user_a = await make_user(client, prenom="UserA")
    user_b = await make_user(client, prenom="UserB")
    resp = await client.put(
        f"/users/{user_b['user']['id']}",
        json={"prenom": "Hacked"},
        headers=auth_headers(user_a["token"]),
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Delete (requires JWT)
# ---------------------------------------------------------------------------
async def test_delete_user(client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="Eve")
    user_id = created["user"]["id"]
    token = created["token"]

    resp = await client.delete(f"/users/{user_id}", headers=auth_headers(token))
    assert resp.status_code == 200

    # Verify user is gone
    resp2 = await client.post("/users/login", json={"prenom": "Eve", "password": "TestPass1"})
    assert resp2.status_code == 404


async def test_delete_user_no_auth(client: AsyncClient, make_user):
    """Delete without JWT → 403."""
    created = await make_user(client, prenom="NoAuthDel")
    user_id = created["user"]["id"]
    resp = await client.delete(f"/users/{user_id}")
    assert resp.status_code == 401

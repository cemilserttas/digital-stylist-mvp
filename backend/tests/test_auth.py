"""
Tests for JWT authentication:
- valid token → access granted
- expired token → 401
- invalid token → 401
- missing token → 403 (HTTPBearer returns 403 when no header)
- token for deleted user → 401
"""
import logging
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt

logger = logging.getLogger(__name__)

JWT_SECRET = "test-jwt-secret-key-for-unit-tests-only"  # matches conftest.py


# ---------------------------------------------------------------------------
# Token returned on create
# ---------------------------------------------------------------------------
async def test_create_returns_token(client: AsyncClient, make_user):
    data = await make_user(client, prenom="TokenUser")
    token = data["token"]
    # Decode and verify payload
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    assert payload["sub"] == str(data["user"]["id"])
    assert "exp" in payload


# ---------------------------------------------------------------------------
# Token returned on login
# ---------------------------------------------------------------------------
async def test_login_returns_token(client: AsyncClient, make_user):
    created = await make_user(client, prenom="LoginToken", password="TestPass1", email="logintoken@test.com")
    resp = await client.post("/users/login", json={"email": "logintoken@test.com", "password": "TestPass1"})
    assert resp.status_code == 200
    body = resp.json()
    assert "token" in body
    payload = jwt.decode(body["token"], JWT_SECRET, algorithms=["HS256"])
    assert payload["sub"] == str(created["user"]["id"])


# ---------------------------------------------------------------------------
# Valid token → access to protected endpoint
# ---------------------------------------------------------------------------
async def test_update_with_valid_token(client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="ValidJWT")
    user_id = created["user"]["id"]
    token = created["token"]
    resp = await client.put(
        f"/users/{user_id}",
        json={"age": 99},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    assert resp.json()["age"] == 99


# ---------------------------------------------------------------------------
# Expired token → 401
# ---------------------------------------------------------------------------
async def test_expired_token(client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="ExpiredJWT")
    user_id = created["user"]["id"]

    # Forge an expired token
    expired_payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired_token = jwt.encode(expired_payload, JWT_SECRET, algorithm="HS256")

    resp = await client.put(
        f"/users/{user_id}",
        json={"age": 99},
        headers=auth_headers(expired_token),
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Garbage token → 401
# ---------------------------------------------------------------------------
async def test_invalid_token(client: AsyncClient, auth_headers):
    resp = await client.put(
        "/users/1",
        json={"age": 99},
        headers=auth_headers("this.is.not.a.jwt"),
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# No Authorization header → 403 (HTTPBearer behavior)
# ---------------------------------------------------------------------------
async def test_no_auth_header(client: AsyncClient, make_user):
    created = await make_user(client, prenom="NoHeader")
    user_id = created["user"]["id"]
    resp = await client.put(f"/users/{user_id}", json={"age": 99})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Token for deleted user → 401
# ---------------------------------------------------------------------------
async def test_token_for_deleted_user(client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="DeletedUser")
    user_id = created["user"]["id"]
    token = created["token"]

    # Delete the user first
    resp = await client.delete(f"/users/{user_id}", headers=auth_headers(token))
    assert resp.status_code == 200

    # Now try to use the token → user no longer exists → 401
    resp2 = await client.put(
        f"/users/{user_id}",
        json={"age": 99},
        headers=auth_headers(token),
    )
    assert resp2.status_code == 401


# ---------------------------------------------------------------------------
# Cross-user access → 403
# ---------------------------------------------------------------------------
async def test_cross_user_access(client: AsyncClient, make_user, auth_headers):
    user_a = await make_user(client, prenom="CrossA")
    user_b = await make_user(client, prenom="CrossB")

    # User A tries to delete User B
    resp = await client.delete(
        f"/users/{user_b['user']['id']}",
        headers=auth_headers(user_a["token"]),
    )
    assert resp.status_code == 403

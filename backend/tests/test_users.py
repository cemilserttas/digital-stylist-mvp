"""
Tests for /users endpoints:
- create (returns user + token), login by email (returns user + token)
- update (requires JWT), delete (requires JWT)
- edge cases: user inexistant, empty email, unauthorized access
"""
import logging

import pytest
from httpx import AsyncClient

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------
async def test_create_user(client: AsyncClient, make_user):
    data = await make_user(client, prenom="Alice", morphologie="SABLIER", genre="Femme", age=30, email="alice@test.com")
    user = data["user"]
    assert user["prenom"] == "Alice"
    assert user["morphologie"] == "SABLIER"
    assert user["genre"] == "Femme"
    assert user["age"] == 30
    assert "id" in user
    assert "token" in data
    assert len(data["token"]) > 20  # JWT is a long string


# ---------------------------------------------------------------------------
# Login (by email)
# ---------------------------------------------------------------------------
async def test_login_existing_user(client: AsyncClient, make_user):
    created = await make_user(client, prenom="Bob", password="MyPass1", email="bob@test.com")
    resp = await client.post("/users/login", json={"email": "bob@test.com", "password": "MyPass1"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["id"] == created["user"]["id"]
    assert "token" in body


async def test_login_wrong_password(client: AsyncClient, make_user):
    await make_user(client, prenom="WrongPwd", password="CorrectPass", email="wrongpwd@test.com")
    resp = await client.post("/users/login", json={"email": "wrongpwd@test.com", "password": "WrongPass"})
    assert resp.status_code == 401


async def test_login_case_insensitive(client: AsyncClient, make_user):
    await make_user(client, prenom="Charlie", password="TestPass1", email="Charlie@Test.com")
    resp = await client.post("/users/login", json={"email": "charlie@test.com", "password": "TestPass1"})
    assert resp.status_code == 200
    assert resp.json()["user"]["prenom"] == "Charlie"


async def test_login_unknown_user(client: AsyncClient):
    resp = await client.post("/users/login", json={"email": "unknown@test.com", "password": "any123"})
    assert resp.status_code == 404


async def test_login_empty_email(client: AsyncClient):
    resp = await client.post("/users/login", json={"email": "", "password": "any123"})
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
    """Update without JWT → 401."""
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
    created = await make_user(client, prenom="Eve", email="eve@test.com")
    user_id = created["user"]["id"]
    token = created["token"]

    resp = await client.delete(f"/users/{user_id}", headers=auth_headers(token))
    assert resp.status_code == 200

    # Verify user is gone
    resp2 = await client.post("/users/login", json={"email": "eve@test.com", "password": "TestPass1"})
    assert resp2.status_code == 404


async def test_delete_user_no_auth(client: AsyncClient, make_user):
    """Delete without JWT → 401."""
    created = await make_user(client, prenom="NoAuthDel")
    user_id = created["user"]["id"]
    resp = await client.delete(f"/users/{user_id}")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Referral program
# ---------------------------------------------------------------------------
async def test_create_user_has_referral_code(client: AsyncClient, make_user):
    """New users automatically get a unique referral code."""
    data = await make_user(client, prenom="RefUser")
    user = data["user"]
    assert user["referral_code"] is not None
    assert user["referral_code"].startswith("REF_")


async def test_referral_signup(client: AsyncClient, make_user, auth_headers):
    """Signing up with a valid referral code increments referrer's count."""
    referrer = await make_user(client, prenom="Referrer")
    ref_code = referrer["user"]["referral_code"]
    assert ref_code is not None

    # New user signs up using the referral code
    resp = await client.post("/users/create", json={
        "email": "referee@test.com",
        "prenom": "Referee",
        "morphologie": "RECTANGLE",
        "genre": "Homme",
        "age": 25,
        "password": "TestPass1",
        "referral_code": ref_code,
    })
    assert resp.status_code == 200

    # Check referrer's count increased
    ref_resp = await client.get(
        f"/users/{referrer['user']['id']}/referral",
        headers=auth_headers(referrer["token"]),
    )
    assert ref_resp.status_code == 200
    info = ref_resp.json()
    assert info["referral_count"] == 1
    assert info["referrals_until_next_reward"] == 2  # 3 - 1 = 2 more needed


async def test_referral_invalid_code(client: AsyncClient):
    """Using a non-existent referral code → 400."""
    resp = await client.post("/users/create", json={
        "email": "badref@test.com",
        "prenom": "BadRef",
        "morphologie": "RECTANGLE",
        "genre": "Homme",
        "age": 25,
        "password": "TestPass1",
        "referral_code": "REF_INVALID_9999",
    })
    assert resp.status_code == 400


async def test_referral_premium_reward(client: AsyncClient, make_user):
    """After 3 referrals, referrer gets 1 month premium."""
    referrer = await make_user(client, prenom="BigRef", email="bigref@test.com")
    ref_code = referrer["user"]["referral_code"]

    for i in range(3):
        resp = await client.post("/users/create", json={
            "email": f"friend{i}@test.com",
            "prenom": f"Friend{i}",
            "morphologie": "RECTANGLE",
            "genre": "Homme",
            "age": 25,
            "password": "TestPass1",
            "referral_code": ref_code,
        })
        assert resp.status_code == 200

    # Referrer should now be premium
    login_resp = await client.post("/users/login", json={"email": "bigref@test.com", "password": "TestPass1"})
    assert login_resp.json()["user"]["is_premium"] is True
    assert login_resp.json()["user"]["premium_until"] is not None


async def test_referral_info_requires_auth(client: AsyncClient, make_user):
    """GET /users/{id}/referral without JWT → 401."""
    created = await make_user(client, prenom="NoAuthRef")
    resp = await client.get(f"/users/{created['user']['id']}/referral")
    assert resp.status_code == 401

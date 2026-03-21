"""
Tests for /wardrobe endpoints:
- upload valid JPEG (with JWT auth)
- invalid MIME type → 422
- file too large (>10MB) → 422
- delete item
"""
import io
import logging
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

logger = logging.getLogger(__name__)


def _tiny_jpeg() -> bytes:
    """Minimal valid JPEG (2x2 white pixels)."""
    return (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
        b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
        b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342'
        b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00'
        b'\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00'
        b'\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b'
        b'\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04'
        b'\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"q'
        b'\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16'
        b'\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZ'
        b'cdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93'
        b'\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa'
        b'\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8'
        b'\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5'
        b'\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa'
        b'\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd2\x8a+\xff\xd9'
    )


# Mock AI analysis to avoid real API calls
MOCK_AI_RESULT = {
    "type": "T-shirt col rond",
    "genre": "Homme",
    "textile": "Jersey de coton",
    "couleur_dominante": "Noir",
    "style": "Casual",
    "saison": "Toutes saisons",
    "coupe": "Regular",
    "description": "T-shirt basique noir.",
    "conseils_combinaison": "",
    "produits_recommandes": [],
    "tags_ia": '{"items": [], "evaluation": {}}',
}


# ---------------------------------------------------------------------------
# Upload valid JPEG
# ---------------------------------------------------------------------------
@patch("app.services.ai_service.analyze_clothing_image", new_callable=AsyncMock, return_value=MOCK_AI_RESULT)
async def test_upload_valid_jpeg(mock_ai, client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="UploadTest")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    jpeg_bytes = _tiny_jpeg()
    files = {"file": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    data = {"user_id": str(user_id), "category": "wardrobe"}

    resp = await client.post("/wardrobe/upload", files=files, data=data, headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["type"] == "T-shirt col rond"
    assert body["user_id"] == user_id
    assert "id" in body


# ---------------------------------------------------------------------------
# Invalid MIME type → 422
# ---------------------------------------------------------------------------
async def test_upload_invalid_mime(client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="MimeTest")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    files = {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")}
    data = {"user_id": str(user_id)}

    resp = await client.post("/wardrobe/upload", files=files, data=data, headers=headers)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# File too large (>10MB) → 422
# ---------------------------------------------------------------------------
@patch("app.services.ai_service.analyze_clothing_image", new_callable=AsyncMock, return_value=MOCK_AI_RESULT)
async def test_upload_too_large(mock_ai, client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="BigFile")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    big_content = b"\xff" * (10 * 1024 * 1024 + 1)
    files = {"file": ("big.jpg", io.BytesIO(big_content), "image/jpeg")}
    data = {"user_id": str(user_id)}

    resp = await client.post("/wardrobe/upload", files=files, data=data, headers=headers)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Delete item
# ---------------------------------------------------------------------------
@patch("app.services.ai_service.analyze_clothing_image", new_callable=AsyncMock, return_value=MOCK_AI_RESULT)
async def test_delete_clothing_item(mock_ai, client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="DeleteTest")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    # Upload first
    jpeg_bytes = _tiny_jpeg()
    files = {"file": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    data = {"user_id": str(user_id), "category": "wardrobe"}
    upload_resp = await client.post("/wardrobe/upload", files=files, data=data, headers=headers)
    assert upload_resp.status_code == 200, upload_resp.text
    item_id = upload_resp.json()["id"]

    # Delete
    resp = await client.delete(f"/wardrobe/item/{item_id}", headers=headers)
    assert resp.status_code == 200

    # Verify it's gone
    wardrobe_resp = await client.get(f"/wardrobe/{user_id}", headers=headers)
    items = wardrobe_resp.json()
    assert all(i["id"] != item_id for i in items)


# ---------------------------------------------------------------------------
# Freemium limit: free users blocked at 20 items
# ---------------------------------------------------------------------------
@patch("app.services.ai_service.analyze_clothing_image", new_callable=AsyncMock, return_value=MOCK_AI_RESULT)
async def test_freemium_upload_limit(_mock_ai, client: AsyncClient, make_user, auth_headers, session, make_clothing_item):
    created = await make_user(client, prenom="FreemiumTest")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    # Insert 20 items directly in DB to hit the limit
    for i in range(20):
        await make_clothing_item(session, user_id=user_id, type_=f"Item{i}")

    # 21st upload should be blocked
    jpeg_bytes = _tiny_jpeg()
    files = {"file": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    data = {"user_id": str(user_id), "category": "wardrobe"}
    resp = await client.post("/wardrobe/upload", files=files, data=data, headers=headers)
    assert resp.status_code == 403
    assert "Limite" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Wardrobe analytics
# ---------------------------------------------------------------------------
async def test_wardrobe_analytics(client: AsyncClient, make_user, auth_headers, session, make_clothing_item):
    created = await make_user(client, prenom="AnalyticsTest")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    await make_clothing_item(session, user_id=user_id, type_="T-shirt", couleur="Noir")
    await make_clothing_item(session, user_id=user_id, type_="Jean", couleur="Bleu")

    resp = await client.get(f"/wardrobe/{user_id}/analytics", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert "colors" in body
    assert "types" in body
    assert "estimated_outfit_count" in body


async def test_wardrobe_analytics_empty(client: AsyncClient, make_user, auth_headers):
    created = await make_user(client, prenom="EmptyAnalytics")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    resp = await client.get(f"/wardrobe/{user_id}/analytics", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["estimated_outfit_count"] == 0


async def test_wardrobe_analytics_access_denied(client: AsyncClient, make_user, auth_headers):
    """User A cannot access User B's analytics."""
    user_a = await make_user(client, prenom="UserA")
    user_b = await make_user(client, prenom="UserB")
    headers_a = auth_headers(user_a["token"])

    resp = await client.get(f"/wardrobe/{user_b['user']['id']}/analytics", headers=headers_a)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Wardrobe score (AI)
# ---------------------------------------------------------------------------
async def test_wardrobe_score_too_few_items(client: AsyncClient, make_user, auth_headers, session, make_clothing_item):
    created = await make_user(client, prenom="ScoreTest")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    # Only 2 items — need at least 3
    await make_clothing_item(session, user_id=user_id, type_="T-shirt")
    await make_clothing_item(session, user_id=user_id, type_="Jean")

    resp = await client.get(f"/wardrobe/{user_id}/score", headers=headers)
    assert resp.status_code == 422
    assert "3" in resp.json()["detail"]


MOCK_SCORE_RESULT = {
    "score": 3.5,
    "style_dna": "Urban Casual",
    "resume": "Garde-robe équilibrée.",
    "forces": ["Bonne palette de neutres"],
    "axes_amelioration": ["Manque de pièces habillées"],
    "capsule_manquante": [],
    "top_combos": [],
}


@patch("app.services.ai_service.score_wardrobe", new_callable=AsyncMock, return_value=MOCK_SCORE_RESULT)
async def test_wardrobe_score_success(mock_score, client: AsyncClient, make_user, auth_headers, session, make_clothing_item):
    created = await make_user(client, prenom="ScoreOK")
    user_id = created["user"]["id"]
    headers = auth_headers(created["token"])

    for type_ in ("T-shirt", "Jean", "Veste"):
        await make_clothing_item(session, user_id=user_id, type_=type_)

    resp = await client.get(f"/wardrobe/{user_id}/score", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["score"] == 3.5
    assert body["style_dna"] == "Urban Casual"
    mock_score.assert_called_once()


async def test_wardrobe_score_access_denied(client: AsyncClient, make_user, auth_headers):
    user_a = await make_user(client, prenom="ScoreA")
    user_b = await make_user(client, prenom="ScoreB")
    headers_a = auth_headers(user_a["token"])

    resp = await client.get(f"/wardrobe/{user_b['user']['id']}/score", headers=headers_a)
    assert resp.status_code == 403

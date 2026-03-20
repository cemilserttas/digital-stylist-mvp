"""
Tests for /wardrobe endpoints:
- upload valid JPEG
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
async def test_upload_valid_jpeg(mock_ai, client: AsyncClient, make_user):
    created = await make_user(client, prenom="UploadTest")
    user_id = created["user"]["id"]

    jpeg_bytes = _tiny_jpeg()
    files = {"file": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    data = {"user_id": str(user_id), "category": "wardrobe"}

    resp = await client.post("/wardrobe/upload", files=files, data=data)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["type"] == "T-shirt col rond"
    assert body["user_id"] == user_id
    assert "id" in body


# ---------------------------------------------------------------------------
# Invalid MIME type → 422
# ---------------------------------------------------------------------------
async def test_upload_invalid_mime(client: AsyncClient, make_user):
    created = await make_user(client, prenom="MimeTest")
    user_id = created["user"]["id"]

    files = {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")}
    data = {"user_id": str(user_id)}

    resp = await client.post("/wardrobe/upload", files=files, data=data)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# File too large (>10MB) → 422
# ---------------------------------------------------------------------------
@patch("app.services.ai_service.analyze_clothing_image", new_callable=AsyncMock, return_value=MOCK_AI_RESULT)
async def test_upload_too_large(mock_ai, client: AsyncClient, make_user):
    created = await make_user(client, prenom="BigFile")
    user_id = created["user"]["id"]

    # Create content > 10MB
    big_content = b"\xff" * (10 * 1024 * 1024 + 1)
    files = {"file": ("big.jpg", io.BytesIO(big_content), "image/jpeg")}
    data = {"user_id": str(user_id)}

    resp = await client.post("/wardrobe/upload", files=files, data=data)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Delete item
# ---------------------------------------------------------------------------
@patch("app.services.ai_service.analyze_clothing_image", new_callable=AsyncMock, return_value=MOCK_AI_RESULT)
async def test_delete_clothing_item(mock_ai, client: AsyncClient, make_user):
    created = await make_user(client, prenom="DeleteTest")
    user_id = created["user"]["id"]

    # Upload first
    jpeg_bytes = _tiny_jpeg()
    files = {"file": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    data = {"user_id": str(user_id), "category": "wardrobe"}
    upload_resp = await client.post("/wardrobe/upload", files=files, data=data)
    item_id = upload_resp.json()["id"]

    # Delete
    resp = await client.delete(f"/wardrobe/item/{item_id}")
    assert resp.status_code == 200

    # Verify it's gone
    wardrobe_resp = await client.get(f"/wardrobe/{user_id}")
    items = wardrobe_resp.json()
    assert all(i["id"] != item_id for i in items)

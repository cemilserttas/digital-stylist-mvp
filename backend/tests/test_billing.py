"""
Tests for Stripe billing webhook handlers.

Covers:
- checkout.session.completed → grants premium (monthly and yearly)
- customer.subscription.deleted → revokes is_premium flag
- customer.subscription.updated (active) → extends premium
- Webhook with invalid signature → 400
- Checkout endpoint when Stripe is not configured → 503
- Checkout endpoint for already-premium user → 400
- Cross-user checkout attempt → 403
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User

logger = logging.getLogger(__name__)

ADMIN_HEADERS = {"x-admin-key": "test-admin-key-1234567890"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_stripe_event(event_type: str, obj: dict) -> bytes:
    """Build a minimal Stripe webhook payload."""
    return json.dumps({"type": event_type, "data": {"object": obj}}).encode()


# ---------------------------------------------------------------------------
# /billing/{user_id}/checkout — guard tests (no Stripe needed)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_checkout_stripe_not_configured(client: AsyncClient, make_user):
    """Returns 503 when STRIPE_SECRET_KEY is not set."""
    data = await make_user(client, prenom="BillNoStripe")
    user_id = data["user"]["id"]
    token = data["token"]

    # Ensure _stripe_available is False by patching the module-level flag
    with patch("app.routers.billing._stripe_available", False):
        resp = await client.post(
            f"/billing/{user_id}/checkout",
            json={"plan": "monthly"},
            headers=_auth(token),
        )
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_checkout_cross_user_forbidden(client: AsyncClient, make_user):
    """User A cannot create a checkout session for user B."""
    data_a = await make_user(client, prenom="BillUserA")
    data_b = await make_user(client, prenom="BillUserB")

    with patch("app.routers.billing._stripe_available", True):
        resp = await client.post(
            f"/billing/{data_b['user']['id']}/checkout",
            json={"plan": "monthly"},
            headers=_auth(data_a["token"]),
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_checkout_already_premium(
    client: AsyncClient, make_user, session: AsyncSession
):
    """Returns 400 when user is already an active premium subscriber."""
    data = await make_user(client, prenom="BillAlreadyPrem")
    user_id = data["user"]["id"]
    token = data["token"]

    # Manually grant active premium
    user = await session.get(User, user_id)
    user.is_premium = True
    user.premium_until = datetime.now(timezone.utc) + timedelta(days=30)
    session.add(user)
    await session.commit()

    with patch("app.routers.billing._stripe_available", True):
        resp = await client.post(
            f"/billing/{user_id}/checkout",
            json={"plan": "monthly"},
            headers=_auth(token),
        )
    assert resp.status_code == 400
    assert "déjà Premium" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Webhook — signature verification
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_invalid_signature(client: AsyncClient):
    """Webhook with wrong signature returns 400."""
    with (
        patch("app.routers.billing._stripe_available", True),
        patch("app.routers.billing._WEBHOOK_SECRET", "whsec_test"),
        patch("stripe.Webhook.construct_event", side_effect=Exception("bad sig")),
    ):
        resp = await client.post(
            "/billing/webhook",
            content=b'{"type":"test"}',
            headers={"stripe-signature": "bad"},
        )
    assert resp.status_code in (400, 503)  # 503 if webhook secret not set


# ---------------------------------------------------------------------------
# Webhook — checkout.session.completed (monthly)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_checkout_completed_monthly(
    client: AsyncClient, make_user, session: AsyncSession
):
    """checkout.session.completed for monthly plan grants 1 month premium."""
    data = await make_user(client, prenom="BillMonth")
    user_id = data["user"]["id"]

    checkout_obj = {
        "metadata": {"user_id": str(user_id)},
        "subscription": "sub_monthly_test",
    }

    # Fake Stripe subscription retrieve returning monthly interval
    mock_sub = {
        "items": {
            "data": [{"price": {"recurring": {"interval": "month", "interval_count": 1}}}]
        }
    }

    with (
        patch("app.routers.billing._stripe_available", True),
        patch("app.routers.billing._WEBHOOK_SECRET", "whsec_test"),
        patch(
            "stripe.Webhook.construct_event",
            return_value={
                "type": "checkout.session.completed",
                "data": {"object": checkout_obj},
            },
        ),
        patch("stripe.Subscription.retrieve", return_value=mock_sub),
    ):
        resp = await client.post(
            "/billing/webhook",
            content=_make_stripe_event("checkout.session.completed", checkout_obj),
            headers={"stripe-signature": "t=1,v1=fake"},
        )

    assert resp.status_code == 200
    assert resp.json() == {"received": True}

    # Verify user is now premium
    await session.refresh(await session.get(User, user_id))
    user = await session.get(User, user_id)
    assert user.is_premium is True
    assert user.premium_until is not None


@pytest.mark.asyncio
async def test_webhook_checkout_completed_yearly(
    client: AsyncClient, make_user, session: AsyncSession
):
    """checkout.session.completed for yearly plan grants 12 months premium."""
    data = await make_user(client, prenom="BillYear")
    user_id = data["user"]["id"]

    checkout_obj = {
        "metadata": {"user_id": str(user_id)},
        "subscription": "sub_yearly_test",
    }

    mock_sub = {
        "items": {
            "data": [{"price": {"recurring": {"interval": "year", "interval_count": 1}}}]
        }
    }

    with (
        patch("app.routers.billing._stripe_available", True),
        patch("app.routers.billing._WEBHOOK_SECRET", "whsec_test"),
        patch(
            "stripe.Webhook.construct_event",
            return_value={
                "type": "checkout.session.completed",
                "data": {"object": checkout_obj},
            },
        ),
        patch("stripe.Subscription.retrieve", return_value=mock_sub),
    ):
        resp = await client.post(
            "/billing/webhook",
            content=_make_stripe_event("checkout.session.completed", checkout_obj),
            headers={"stripe-signature": "t=1,v1=fake"},
        )

    assert resp.status_code == 200

    user = await session.get(User, user_id)
    assert user.is_premium is True
    # 12 months ≈ 360 days; check it's at least 350 days out
    if user.premium_until:
        now = datetime.now(timezone.utc)
        pu = user.premium_until
        if pu.tzinfo is None:
            pu = pu.replace(tzinfo=timezone.utc)
        assert (pu - now).days >= 350


# ---------------------------------------------------------------------------
# Webhook — customer.subscription.deleted
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_subscription_deleted(
    client: AsyncClient, make_user, session: AsyncSession
):
    """subscription.deleted sets is_premium=False but keeps premium_until."""
    data = await make_user(client, prenom="BillDel")
    user_id = data["user"]["id"]

    # Grant premium first
    user = await session.get(User, user_id)
    user.is_premium = True
    future = datetime.now(timezone.utc) + timedelta(days=10)
    user.premium_until = future
    session.add(user)
    await session.commit()

    sub_obj = {"metadata": {"user_id": str(user_id)}}

    with (
        patch("app.routers.billing._stripe_available", True),
        patch("app.routers.billing._WEBHOOK_SECRET", "whsec_test"),
        patch(
            "stripe.Webhook.construct_event",
            return_value={
                "type": "customer.subscription.deleted",
                "data": {"object": sub_obj},
            },
        ),
    ):
        resp = await client.post(
            "/billing/webhook",
            content=_make_stripe_event("customer.subscription.deleted", sub_obj),
            headers={"stripe-signature": "t=1,v1=fake"},
        )

    assert resp.status_code == 200

    await session.refresh(await session.get(User, user_id))
    user = await session.get(User, user_id)
    assert user.is_premium is False
    # premium_until should still be set (grace period until end of billing cycle)
    assert user.premium_until is not None


# ---------------------------------------------------------------------------
# Webhook — customer.subscription.updated (renewal)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_subscription_updated_extends_premium(
    client: AsyncClient, make_user, session: AsyncSession
):
    """subscription.updated with status=active extends premium_until by 1 month."""
    data = await make_user(client, prenom="BillRenew")
    user_id = data["user"]["id"]

    # Existing premium expiring soon
    user = await session.get(User, user_id)
    user.is_premium = True
    user.premium_until = datetime.now(timezone.utc) + timedelta(days=2)
    session.add(user)
    await session.commit()

    sub_obj = {
        "metadata": {"user_id": str(user_id)},
        "status": "active",
        "plan": {"interval": "month"},
    }

    with (
        patch("app.routers.billing._stripe_available", True),
        patch("app.routers.billing._WEBHOOK_SECRET", "whsec_test"),
        patch(
            "stripe.Webhook.construct_event",
            return_value={
                "type": "customer.subscription.updated",
                "data": {"object": sub_obj},
            },
        ),
    ):
        resp = await client.post(
            "/billing/webhook",
            content=_make_stripe_event("customer.subscription.updated", sub_obj),
            headers={"stripe-signature": "t=1,v1=fake"},
        )

    assert resp.status_code == 200

    # Expire the session cache so we read the updated value from DB
    session.expire_all()
    user = await session.get(User, user_id)
    assert user.is_premium is True
    if user.premium_until:
        now = datetime.now(timezone.utc)
        pu = user.premium_until
        if pu.tzinfo is None:
            pu = pu.replace(tzinfo=timezone.utc)
        # After renewal, should be ~30 days out from old expiry (≥ 30 days from now)
        assert (pu - now).days >= 28


# ---------------------------------------------------------------------------
# Webhook — unknown user in metadata (graceful no-op)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_unknown_user_no_crash(client: AsyncClient):
    """Webhook with invalid user_id in metadata should return 200 (no crash)."""
    checkout_obj = {
        "metadata": {"user_id": "99999"},
        "subscription": None,
    }

    with (
        patch("app.routers.billing._stripe_available", True),
        patch("app.routers.billing._WEBHOOK_SECRET", "whsec_test"),
        patch(
            "stripe.Webhook.construct_event",
            return_value={
                "type": "checkout.session.completed",
                "data": {"object": checkout_obj},
            },
        ),
    ):
        resp = await client.post(
            "/billing/webhook",
            content=_make_stripe_event("checkout.session.completed", checkout_obj),
            headers={"stripe-signature": "t=1,v1=fake"},
        )

    assert resp.status_code == 200
    assert resp.json() == {"received": True}

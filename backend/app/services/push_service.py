"""
Firebase Cloud Messaging push notification service.

Activated when FIREBASE_CREDENTIALS_JSON env var is set to the contents of
the Firebase service account JSON (or FIREBASE_CREDENTIALS_PATH for a file path).

When neither is set, send_push() is a no-op and logs a warning once.
"""
import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_app = None
_init_attempted = False


def _get_app():
    global _app, _init_attempted
    if _init_attempted:
        return _app
    _init_attempted = True

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
        elif cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            logger.info(
                "Push notifications disabled — set FIREBASE_CREDENTIALS_JSON or "
                "FIREBASE_CREDENTIALS_PATH to enable"
            )
            return None

        _app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialised — push notifications enabled")
        return _app

    except ImportError:
        logger.warning("firebase-admin not installed — push notifications disabled")
        return None
    except Exception as exc:
        logger.error("Firebase init failed: %s", exc)
        return None


async def send_push(
    fcm_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """Send a push notification to a single FCM token.

    Returns True on success, False on failure (caller should clear invalid tokens).
    """
    app = _get_app()
    if app is None:
        return False

    import asyncio

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=fcm_token,
            android=messaging.AndroidConfig(priority="high"),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", badge=1)
                )
            ),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon="/icon-192.png",
                    badge="/icon-192.png",
                    vibrate=[200, 100, 200],
                )
            ),
        )

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: messaging.send(message))
        logger.info("Push sent to token …%s", fcm_token[-6:])
        return True

    except Exception as exc:
        err_str = str(exc)
        if "registration-token-not-registered" in err_str or "invalid-registration-token" in err_str:
            logger.warning("Invalid FCM token …%s — should be cleared", fcm_token[-6:])
        else:
            logger.error("Push send failed: %s", exc)
        return False

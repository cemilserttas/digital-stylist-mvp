"""
Morning push notification cron job.

Runs daily at 07:30 local server time (configurable via PUSH_CRON_HOUR / PUSH_CRON_MINUTE).
For each user with push_notifications_enabled + fcm_token:
  1. Fetch current weather for their city (Open-Meteo geocoding + forecast API)
  2. Generate a brief outfit suggestion via Gemini
  3. Send Firebase push notification

Requires APScheduler: pip install apscheduler
"""
import logging
import os
from datetime import date
from typing import Optional

import httpx

from app.database import async_session
from app.models import User
from app.services import ai_service, push_service

logger = logging.getLogger(__name__)

PUSH_CRON_HOUR = int(os.getenv("PUSH_CRON_HOUR", "7"))
PUSH_CRON_MINUTE = int(os.getenv("PUSH_CRON_MINUTE", "30"))

# WMO weather interpretation codes → French description
_WMO_CODES = {
    0: "ensoleillé", 1: "principalement dégagé", 2: "partiellement nuageux", 3: "couvert",
    45: "brouillard", 48: "brouillard givrant",
    51: "bruine légère", 53: "bruine modérée", 55: "bruine dense",
    61: "pluie légère", 63: "pluie modérée", 65: "pluie forte",
    71: "neige légère", 73: "neige modérée", 75: "neige forte",
    80: "averses légères", 81: "averses modérées", 82: "averses violentes",
    95: "orage", 96: "orage avec grêle",
}


async def _geocode_city(city: str) -> Optional[tuple[float, float]]:
    """Returns (latitude, longitude) for a city name, or None."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": city, "count": 1, "language": "fr", "format": "json"},
            )
            data = resp.json()
            results = data.get("results", [])
            if results:
                return results[0]["latitude"], results[0]["longitude"]
    except Exception as exc:
        logger.warning("Geocoding failed for city '%s': %s", city, exc)
    return None


async def _fetch_weather(lat: float, lon: float) -> Optional[dict]:
    """Fetch current temperature + weather code from Open-Meteo."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,weathercode",
                    "timezone": "auto",
                },
            )
            data = resp.json()
            current = data.get("current", {})
            temp = current.get("temperature_2m")
            code = current.get("weathercode", 0)
            description = _WMO_CODES.get(int(code), "variable")
            return {"temperature": temp, "description": description}
    except Exception as exc:
        logger.warning("Weather fetch failed (%.4f, %.4f): %s", lat, lon, exc)
    return None


async def _send_morning_push_for_user(user: User) -> None:
    """Fetch weather, generate suggestion summary, send push — for a single user."""
    if not user.fcm_token:
        return

    city = user.push_city or "Paris"

    coords = await _geocode_city(city)
    if not coords:
        coords = (48.8566, 2.3522)  # Paris fallback
    lat, lon = coords

    weather = await _fetch_weather(lat, lon)
    if not weather:
        weather = {"temperature": 18, "description": "variable"}

    profile = {
        "prenom": user.prenom,
        "genre": user.genre,
        "age": user.age,
        "morphologie": user.morphologie.value if user.morphologie else "RECTANGLE",
    }

    try:
        result = await ai_service.get_daily_suggestions(profile, {**weather, "ville": city})
        suggestions = result.get("suggestions", [])
        if suggestions:
            first = suggestions[0]
            title = f"☀️ Look du jour — {weather['temperature']}°C à {city}"
            body = f"{first.get('titre', 'Suggestion')} · {first.get('occasion', '')}"
        else:
            title = f"☀️ Bonjour {user.prenom} !"
            body = f"{weather['temperature']}°C, {weather['description']} — ouvre l'app pour ton look du jour 👗"
    except Exception as exc:
        logger.warning("AI suggestion failed for user %d: %s", user.id, exc)
        title = f"☀️ Bonjour {user.prenom} !"
        body = f"{weather['temperature']}°C et {weather['description']} aujourd'hui — check ton look du jour !"

    success = await push_service.send_push(
        fcm_token=user.fcm_token,
        title=title,
        body=body,
        data={"type": "morning_suggestion", "date": date.today().isoformat()},
    )

    if not success:
        # Token invalid — disable push for this user
        async with async_session() as session:
            db_user = await session.get(User, user.id)
            if db_user:
                db_user.push_notifications_enabled = False
                db_user.fcm_token = None
                session.add(db_user)
                await session.commit()
                logger.info("Cleared invalid FCM token for user %d", user.id)


async def run_morning_push() -> None:
    """Main cron task: iterate all push-enabled users and send morning notifications."""
    logger.info("Morning push cron started")
    from sqlmodel import select

    async with async_session() as session:
        result = await session.execute(
            select(User).where(
                User.push_notifications_enabled == True,  # noqa: E712
                User.fcm_token != None,  # noqa: E711
            )
        )
        users = result.scalars().all()

    logger.info("Sending morning push to %d users", len(users))
    for user in users:
        try:
            await _send_morning_push_for_user(user)
        except Exception as exc:
            logger.error("Morning push failed for user %d: %s", user.id, exc)

    logger.info("Morning push cron finished")


def start_scheduler(app) -> None:
    """Start APScheduler background scheduler attached to the FastAPI app."""
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler

        scheduler = AsyncIOScheduler()
        scheduler.add_job(
            run_morning_push,
            trigger="cron",
            hour=PUSH_CRON_HOUR,
            minute=PUSH_CRON_MINUTE,
            id="morning_push",
            replace_existing=True,
        )
        scheduler.start()
        app.state.scheduler = scheduler
        logger.info(
            "APScheduler started — morning push at %02d:%02d daily",
            PUSH_CRON_HOUR,
            PUSH_CRON_MINUTE,
        )
    except ImportError:
        logger.warning("apscheduler not installed — morning push cron disabled")
    except Exception as exc:
        logger.error("Failed to start scheduler: %s", exc)


def stop_scheduler(app) -> None:
    scheduler = getattr(app.state, "scheduler", None)
    if scheduler:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")

"""
Shared Gemini client, model configuration, and AI request tracking.
All ai_*.py modules import from here.
"""
import json
import logging
import os
import re
import time
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

load_dotenv()

_api_key = os.getenv("GEMINI_API_KEY")
if not _api_key:
    logger.warning("GEMINI_API_KEY not found – AI features will fail")
    client = None
else:
    client = genai.Client(api_key=_api_key)
    logger.info("Gemini API client created")


# ---------------------------------------------------------------------------
# Available Gemini models — can be selected at runtime via admin API
# ---------------------------------------------------------------------------
AVAILABLE_MODELS = {
    "gemini-2.5-flash": {
        "name": "Gemini 2.5 Flash",
        "description": "Dernier modèle rapide — meilleur rapport qualité/prix",
        "tier": "standard",
        "input_price_per_m": 0.15,   # $/1M tokens (< 200k context)
        "output_price_per_m": 0.60,
        "rpm_free": 10,
        "rpd_free": 500,
        "tpm_free": 250_000,
    },
    "gemini-2.5-pro": {
        "name": "Gemini 2.5 Pro",
        "description": "Plus puissant — raisonnement avancé, meilleur qualité",
        "tier": "premium",
        "input_price_per_m": 1.25,
        "output_price_per_m": 10.00,
        "rpm_free": 5,
        "rpd_free": 250,
        "tpm_free": 100_000,
    },
    "gemini-2.0-flash": {
        "name": "Gemini 2.0 Flash",
        "description": "Modèle actuel — stable et éprouvé",
        "tier": "standard",
        "input_price_per_m": 0.10,
        "output_price_per_m": 0.40,
        "rpm_free": 15,
        "rpd_free": 1500,
        "tpm_free": 1_000_000,
    },
    "gemini-2.0-flash-lite": {
        "name": "Gemini 2.0 Flash Lite",
        "description": "Le moins cher — idéal pour le volume",
        "tier": "budget",
        "input_price_per_m": 0.075,
        "output_price_per_m": 0.30,
        "rpm_free": 30,
        "rpd_free": 1500,
        "tpm_free": 1_000_000,
    },
    "gemini-1.5-flash": {
        "name": "Gemini 1.5 Flash",
        "description": "Ancien modèle rapide — legacy",
        "tier": "legacy",
        "input_price_per_m": 0.075,
        "output_price_per_m": 0.30,
        "rpm_free": 15,
        "rpd_free": 1500,
        "tpm_free": 1_000_000,
    },
    "gemini-1.5-pro": {
        "name": "Gemini 1.5 Pro",
        "description": "Ancien modèle premium — legacy",
        "tier": "legacy",
        "input_price_per_m": 1.25,
        "output_price_per_m": 5.00,
        "rpm_free": 2,
        "rpd_free": 50,
        "tpm_free": 100_000,
    },
}

# Active model — defaults to env var or "gemini-2.0-flash"
_active_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def get_active_model() -> str:
    """Return the currently active Gemini model ID."""
    return _active_model


def set_active_model(model_id: str) -> bool:
    """Change the active model. Returns True if valid."""
    global _active_model
    if model_id not in AVAILABLE_MODELS:
        return False
    _active_model = model_id
    logger.info("Active Gemini model changed to: %s", model_id)
    return True


def get_model_info(model_id: Optional[str] = None) -> dict:
    """Get pricing/limits info for a model."""
    mid = model_id or _active_model
    info = AVAILABLE_MODELS.get(mid, {})
    return {**info, "model_id": mid, "is_active": mid == _active_model}


# ---------------------------------------------------------------------------
# AI request tracking — async DB logging
# ---------------------------------------------------------------------------
# We store requests in a buffer and flush asynchronously to avoid
# blocking AI calls with DB writes. The admin endpoints read from DB.
_pending_requests: list[dict] = []


def log_ai_request(
    request_type: str,
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    duration_ms: int = 0,
    status: str = "success",
    error_message: Optional[str] = None,
    user_id: Optional[int] = None,
):
    """Buffer an AI request log entry for async DB flush."""
    _pending_requests.append({
        "user_id": user_id,
        "request_type": request_type,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "duration_ms": duration_ms,
        "status": status,
        "error_message": error_message,
    })


def drain_pending_requests() -> list[dict]:
    """Pop all buffered requests for DB insertion."""
    entries = _pending_requests.copy()
    _pending_requests.clear()
    return entries


def tracked_generate(
    request_type: str,
    contents,
    config: types.GenerateContentConfig,
    user_id: Optional[int] = None,
    model_override: Optional[str] = None,
):
    """
    Call Gemini generate_content with automatic tracking.
    Returns the response object.
    Raises on error (caller handles fallback).
    """
    if not client:
        log_ai_request(request_type, _active_model, status="error",
                       error_message="Client not initialized", user_id=user_id)
        raise RuntimeError("Gemini client not initialized")

    model = model_override or _active_model
    start = time.monotonic()

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
        elapsed = int((time.monotonic() - start) * 1000)

        # Extract token counts from response metadata
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            input_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0) or 0
            output_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0) or 0

        # Check for blocked response
        status = "success"
        try:
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                status = "blocked"
        except Exception:
            pass

        log_ai_request(
            request_type=request_type,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            duration_ms=elapsed,
            status=status,
            user_id=user_id,
        )
        return response

    except Exception as e:
        elapsed = int((time.monotonic() - start) * 1000)
        log_ai_request(
            request_type=request_type,
            model=model,
            duration_ms=elapsed,
            status="error",
            error_message=str(e)[:500],
            user_id=user_id,
        )
        raise


# ---------------------------------------------------------------------------
# JSON extraction (unchanged)
# ---------------------------------------------------------------------------
def extract_json(text: str):
    """Extracts JSON (object or array) from text, handles markdown fences."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    obj_match = re.search(r'\{.*\}', text, re.DOTALL)
    if obj_match:
        try:
            result = json.loads(obj_match.group(0))
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

    arr_match = re.search(r'\[.*\]', text, re.DOTALL)
    if arr_match:
        try:
            result = json.loads(arr_match.group(0))
            if isinstance(result, list) and len(result) > 0:
                return result
        except json.JSONDecodeError:
            pass

    return None

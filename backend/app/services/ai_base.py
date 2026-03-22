"""
Shared Gemini client + JSON extraction utility.
All ai_*.py modules import from here.
"""
import json
import logging
import os
import re

from dotenv import load_dotenv
from google import genai

logger = logging.getLogger(__name__)

load_dotenv()

_api_key = os.getenv("GEMINI_API_KEY")
if not _api_key:
    logger.warning("GEMINI_API_KEY not found – AI features will fail")
    client = None
else:
    client = genai.Client(api_key=_api_key)
    logger.info("Gemini API client created")


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

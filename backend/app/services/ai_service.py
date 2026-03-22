"""
ai_service.py — backward-compatible re-export facade.

The implementation has been split into focused modules:
  ai_base.py        — Gemini client + extract_json (~60 lines)
  ai_image.py       — analyze_clothing_image (~130 lines)
  ai_suggestions.py — get_daily_suggestions (~110 lines)
  ai_wardrobe.py    — score_wardrobe (~100 lines)
  ai_chat.py        — chat_with_stylist (~80 lines)

All existing imports of this module continue to work unchanged.
"""
from app.services.ai_base import client, extract_json
from app.services.ai_image import analyze_clothing_image
from app.services.ai_suggestions import get_daily_suggestions
from app.services.ai_wardrobe import score_wardrobe
from app.services.ai_chat import chat_with_stylist

__all__ = [
    "client",
    "extract_json",
    "analyze_clothing_image",
    "get_daily_suggestions",
    "score_wardrobe",
    "chat_with_stylist",
]

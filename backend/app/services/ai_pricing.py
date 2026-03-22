"""
AI service — pricing suggestions for marketplace listings.
Uses Gemini to estimate fair resale prices based on item data.
"""
import logging
from typing import Optional

from google.genai import types

from app.services.ai_base import client, extract_json, tracked_generate

logger = logging.getLogger(__name__)


async def suggest_listing_price(
    item_data: dict,
    user_id: Optional[int] = None,
) -> dict:
    """Suggest a fair resale price for a clothing item.

    Returns {"price_min": 15, "price_max": 25, "suggested": 20, "reasoning": "..."}
    """
    if not client:
        logger.error("Gemini client not initialized (missing API key)")
        return {"price_min": 5, "price_max": 15, "suggested": 10,
                "reasoning": "Estimation par défaut (IA indisponible)"}

    item_type = item_data.get("type", "vêtement")
    brand = item_data.get("brand", "marque inconnue")
    condition = item_data.get("condition", "Bon état")
    season = item_data.get("season", "Toutes saisons")
    color = item_data.get("color", "")
    tags = item_data.get("tags_ia", "")

    prompt = f"""Tu es un expert en revente de vêtements d'occasion sur le marché français.
Analyse cet article et suggère un prix de revente juste.

ARTICLE :
- Type : {item_type}
- Marque : {brand}
- État : {condition}
- Saison : {season}
- Couleur : {color}
- Tags IA : {tags}

INSTRUCTIONS :
- Donne un prix minimum, maximum et suggéré en euros (nombres entiers).
- Base-toi sur les prix de Vinted, Le Bon Coin, et les boutiques de seconde main.
- Prends en compte : marque, état, saisonnalité, demande.
- Explique ton raisonnement en 1-2 phrases en français.

Réponds UNIQUEMENT avec un JSON valide :
{{
  "price_min": 10,
  "price_max": 25,
  "suggested": 18,
  "reasoning": "Explication courte ici"
}}
"""

    try:
        response = tracked_generate(
            request_type="pricing",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=512,
                http_options=types.HttpOptions(timeout=30000),
            ),
            user_id=user_id,
        )
        parsed = extract_json(response.text)
        if isinstance(parsed, dict) and "suggested" in parsed:
            return parsed
        return {"price_min": 5, "price_max": 15, "suggested": 10,
                "reasoning": "Estimation par défaut"}
    except Exception as e:
        logger.error("Exception during price suggestion: %s", e)
        return {"price_min": 5, "price_max": 15, "suggested": 10,
                "reasoning": "Estimation par défaut (erreur IA)"}

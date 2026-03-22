"""
AI service — wardrobe scoring.
Analyses the full wardrobe and returns a stylist report with score, strengths, gaps, and top combos.
"""
import logging
from typing import Optional

from google.genai import types

from app.services.ai_base import client, extract_json, tracked_generate

logger = logging.getLogger(__name__)

_FALLBACK = {
    "score": None,
    "style_dna": "Analyse impossible",
    "forces": [],
    "axes_amelioration": [],
    "capsule_manquante": [],
    "top_combos": [],
}


async def score_wardrobe(
    user_profile: dict,
    items: list[dict],
    user_id: Optional[int] = None,
) -> dict:
    if not client:
        logger.error("Gemini client not initialized (missing API key)")
        return _FALLBACK

    prenom = user_profile.get("prenom", "Utilisateur")
    genre = user_profile.get("genre", "Homme")
    morphologie = user_profile.get("morphologie", "RECTANGLE")
    style_prefere = user_profile.get("style_prefere", "")

    item_lines = "\n".join(
        f"- {i['type']} | {i.get('couleur', '?')} | {i.get('saison', '?')} | {i.get('style', '?')}"
        for i in items[:40]
    )

    prompt = f"""Tu es un styliste expert qui analyse une garde-robe complete.

PROFIL :
- Prenom : {prenom}
- Genre : {genre}
- Morphologie : {morphologie}
{f"- Style voulu : {style_prefere}" if style_prefere else ""}

GARDE-ROBE ACTUELLE ({len(items)} pieces) :
{item_lines}

MISSION : Fais un bilan complet et actionnable de cette garde-robe.

Reponds UNIQUEMENT avec un JSON valide :

{{
  "score": 3.8,
  "style_dna": "2-3 mots qui definissent le style dominant (ex: Urban Casual Minimaliste)",
  "resume": "1-2 phrases bienveillantes sur la garde-robe actuelle",
  "forces": ["Point fort concret", "Deuxieme force"],
  "axes_amelioration": ["Axe d'amelioration concret", "Deuxieme axe"],
  "capsule_manquante": [
    {{"type": "Piece precise manquante", "pourquoi": "Raison concrete", "marque": "Marque accessible", "prix_estime": "40-70 euros", "recherche": "mots-cles e-shop"}},
    {{"type": "Deuxieme piece", "pourquoi": "Raison", "marque": "Marque", "prix_estime": "fourchette", "recherche": "mots-cles"}},
    {{"type": "Troisieme piece", "pourquoi": "Raison", "marque": "Marque", "prix_estime": "fourchette", "recherche": "mots-cles"}}
  ],
  "top_combos": [
    {{"titre": "Nom du combo", "pieces": ["Piece 1", "Piece 2", "Piece 3"], "conseil": "1 phrase de styliste"}},
    {{"titre": "Deuxieme combo", "pieces": ["Piece A", "Piece B"], "conseil": "Conseil"}}
  ]
}}

REGLES :
- "score" : note sur 5 (ex: 3.8). Base-toi sur variete, coherence, polyvalence, adaptation morphologie.
- "forces" : 2-3 points concrets, pas generiques.
- "axes_amelioration" : 2-3 axes actionables.
- "capsule_manquante" : 3 pieces qui transformeraient cette garde-robe. Prix realistes.
- "top_combos" : 2 combos realises avec les pieces EXISTANTES.
- Adapte tout au genre ({genre}) et a la morphologie ({morphologie}).
- Sois bienveillant mais honnete.
"""

    try:
        response = tracked_generate(
            request_type="score",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.5,
                max_output_tokens=2048,
                http_options=types.HttpOptions(timeout=30000),
            ),
            user_id=user_id,
        )
        parsed = extract_json(response.text)
        if isinstance(parsed, dict):
            logger.info("Wardrobe score for %s: %s/5", prenom, parsed.get("score"))
            return parsed
        return _FALLBACK
    except Exception as e:
        logger.error("Exception during wardrobe scoring: %s", e)
        return _FALLBACK

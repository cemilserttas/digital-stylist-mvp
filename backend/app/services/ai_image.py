"""
AI service — clothing image analysis.
Detects all visible clothing items and evaluates the overall look.
"""
import json
import logging
from typing import Optional

from google.genai import types

from app.services.ai_base import client, extract_json, tracked_generate

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompts & fallbacks
# ---------------------------------------------------------------------------
_ANALYZE_PROMPT = """
Tu es un directeur artistique et styliste de mode de renommee mondiale,
avec 20 ans d'experience dans les plus grandes maisons (Dior, Balenciaga, Saint Laurent).
Tu as l'oeil absolu pour les details, les matieres, les proportions et l'harmonie des couleurs.

MISSION : Analyse cette photo avec ton expertise, identifie chaque piece, et EVALUE LE LOOK GLOBAL.

REGLES D'ANALYSE :
1. Identifie CHAQUE vetement, chaussure et accessoire visible.
2. Le vetement le plus visible/central doit etre en PREMIER.
3. Sois ultra-precis : "T-shirt col rond", "Chino slim", "Derby en cuir", jamais "Vetement".
4. Couleurs precises : "Bleu Nuit", "Vert Sapin", "Beige Sable", jamais juste "Bleu".
5. Matieres precises : jersey, denim brut, cuir graine, popeline, flanelle, etc.

EVALUATION DU LOOK :
- Note le look global sur 5 etoiles selon : harmonie des couleurs, coherence du style, qualite percue, proportions, accessoirisation.
- 5/5 = look parfait. 4/5 = tres bon mais un detail ameliorable. 3/5 = bon general mais ameliorations possibles.
- 2/5 = look desequilibre. 1/5 = look a revoir entierement.
- Si la note est inferieure a 5, propose les pieces manquantes pour atteindre 5/5.

Reponds UNIQUEMENT avec un objet JSON valide. Pas de markdown, pas de texte autour.

{
  "items": [
    {
      "type": "Type ultra-precis (T-shirt col V, Chemise Oxford, Jean slim taille haute...)",
      "genre": "Homme | Femme | Unisexe",
      "textile": "Matiere precise",
      "couleur_dominante": "Couleur nuancee (Bleu Nuit, Terracotta, Ecru...)",
      "style": "Smart Casual | Casual Chic | Sportswear Premium | Streetwear | Business Casual | Minimaliste | Preppy",
      "saison": "Ete | Hiver | Mi-saison | Toutes saisons",
      "coupe": "Slim fit | Regular | Oversize | Cropped | Cintree | Droite | Tapered",
      "description": "3-4 phrases d'expert : fiche produit haut de gamme avec finitions, qualite tissu, tombe, coupe.",
      "conseils_combinaison": "4-5 phrases de styliste PRO : theorie des couleurs, combinaisons precises.",
      "produits_recommandes": [
        {"nom": "Nom precis", "marque": "Marque REELLE", "prix_estime": "Fourchette", "recherche": "Mots-cles e-shop"},
        {"nom": "Piece complementaire", "marque": "Marque reelle", "prix_estime": "Fourchette", "recherche": "Mots-cles"},
        {"nom": "Accessoire ou chaussure", "marque": "Marque reelle", "prix_estime": "Fourchette", "recherche": "Mots-cles"}
      ]
    }
  ],
  "evaluation": {
    "note": 4,
    "commentaire": "2-3 phrases d'evaluation globale du look.",
    "points_forts": "Ce qui est reussi dans ce look.",
    "prix_total_look": {
      "budget": {"min": 80, "max": 120, "marques": "H&M, UNIQLO, Primark"},
      "moyen": {"min": 150, "max": 250, "marques": "Zara, COS, Mango"},
      "premium": {"min": 300, "max": 500, "marques": "Massimo Dutti, Ralph Lauren"}
    },
    "pieces_manquantes": [
      {"nom": "Piece precise", "marque": "Marque REELLE", "prix_estime": "Fourchette", "raison": "Pourquoi", "recherche": "Mots-cles"}
    ]
  }
}

REGLES STRICTES :
- Les 3 produits recommandes par piece doivent former une TENUE COMPLETE.
- Si la note est 5/5, "pieces_manquantes" doit etre un tableau VIDE [].
- Les marques doivent etre REELLES et dans la meme gamme de prix.
- JAMAIS de reponse generique. Tout doit etre SPECIFIQUE a cette photo.
- Detecte 1 a 4 pieces maximum.
"""

_SINGLE_FALLBACK = {
    "type": "Vêtement",
    "genre": "Unisexe",
    "textile": "Non déterminé",
    "couleur_dominante": "Non déterminée",
    "style": "Casual",
    "saison": "Toutes saisons",
    "coupe": "Regular",
    "description": "L'analyse n'a pas pu être effectuée. Essayez avec une photo plus nette.",
    "conseils_combinaison": "",
    "produits_recommandes": [],
}

_FALLBACK_EVALUATION = {
    "note": 0,
    "commentaire": "L'évaluation n'a pas pu être effectuée.",
    "points_forts": "",
    "pieces_manquantes": [],
}


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------
async def analyze_clothing_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    user_id: Optional[int] = None,
) -> dict:
    """
    Detects ALL clothing items + evaluates the overall look.
    Returns a dict for the PRIMARY item, with all data in tags_ia JSON.
    """
    fallback_tags = json.dumps({"items": [_SINGLE_FALLBACK], "evaluation": _FALLBACK_EVALUATION}, ensure_ascii=False)
    fallback_result = {**_SINGLE_FALLBACK, "tags_ia": fallback_tags}

    if not client:
        logger.error("Gemini client not initialized (missing API key)")
        return fallback_result

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    try:
        logger.info("Sending image to Gemini for analysis")
        response = tracked_generate(
            request_type="analyze",
            contents=[_ANALYZE_PROMPT, image_part],
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=8192,
                http_options=types.HttpOptions(timeout=45000),
            ),
            user_id=user_id,
        )

        try:
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                logger.warning("Gemini blocked response: %s", response.prompt_feedback)
                return fallback_result
        except Exception:
            pass

        raw = response.text
        logger.debug("Raw AI response (first 300 chars): %s", raw[:300])
        parsed = extract_json(raw)

        if parsed is None:
            logger.error("Could not extract JSON from Gemini response")
            return fallback_result

        items_list = []
        evaluation = _FALLBACK_EVALUATION

        if isinstance(parsed, dict):
            items_list = parsed.get("items", [])
            evaluation = parsed.get("evaluation", _FALLBACK_EVALUATION)
            if not items_list and not parsed.get("evaluation"):
                items_list = [parsed]
        elif isinstance(parsed, list):
            items_list = parsed

        if len(items_list) == 0:
            logger.error("No items found in Gemini response")
            return fallback_result

        logger.info("Detected %d item(s), look score: %s/5", len(items_list), evaluation.get('note', '?'))

        for item in items_list:
            if "couleur_dominante" not in item and "couleur" in item:
                item["couleur_dominante"] = item["couleur"]
            for key, default in _SINGLE_FALLBACK.items():
                item.setdefault(key, default)

        primary = items_list[0]
        primary["tags_ia"] = json.dumps({"items": items_list, "evaluation": evaluation}, ensure_ascii=False)
        return primary

    except Exception as e:
        logger.error("Exception during image analysis: %s", e)
        logger.exception("Traceback for image analysis failure:")
        return fallback_result

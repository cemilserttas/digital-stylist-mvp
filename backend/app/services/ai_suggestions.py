"""
AI service — daily outfit suggestions.
Wardrobe-first: composes outfits from the user's own clothes,
then suggests complementary pieces from the marketplace.
"""
import logging
from typing import Optional

from google.genai import types

from app.services.ai_base import client, extract_json, tracked_generate

logger = logging.getLogger(__name__)


def _format_wardrobe(items: list[dict]) -> str:
    """Format wardrobe items for the AI prompt."""
    if not items:
        return "GARDE-ROBE VIDE — l'utilisateur n'a pas encore ajouté de vêtements."
    lines = []
    for it in items:
        tags = it.get("tags_ia", "") or ""
        lines.append(
            f"  - ID:{it['id']} | {it['type']} | couleur:{it['couleur']} | saison:{it['saison']}"
            + (f" | détails:{tags}" if tags else "")
        )
    return "\n".join(lines)


def _format_marketplace(listings: list[dict]) -> str:
    """Format marketplace listings for the AI prompt."""
    if not listings:
        return "AUCUN ARTICLE en vente sur la marketplace pour le moment."
    lines = []
    for ls in listings:
        price_eur = ls["price_cents"] / 100
        lines.append(
            f"  - LISTING_ID:{ls['id']} | {ls['title']} | marque:{ls.get('brand', '?')} "
            f"| {price_eur:.2f}€ | état:{ls['condition']} | type:{ls['category_type']} "
            f"| couleur:{ls['color']} | saison:{ls['season']} | taille:{ls.get('size', '?')}"
        )
    return "\n".join(lines)


async def get_daily_suggestions(
    user_profile: dict,
    weather_data: dict,
    wardrobe_items: list[dict],
    marketplace_listings: list[dict],
    user_id: Optional[int] = None,
) -> dict:
    """Generate personalized style suggestions from wardrobe + marketplace."""
    if not client:
        logger.error("Gemini client not initialized (missing API key)")
        return {"suggestions": []}

    prenom = user_profile.get("prenom", "Utilisateur")
    genre = user_profile.get("genre", "Homme")
    age = user_profile.get("age", 25)
    morphologie = user_profile.get("morphologie", "RECTANGLE")
    temp = weather_data.get("temperature", 20)
    weather_desc = weather_data.get("description", "Ensoleillé")
    ville = weather_data.get("ville", "Paris")

    wardrobe_text = _format_wardrobe(wardrobe_items)
    marketplace_text = _format_marketplace(marketplace_listings)

    prompt = f"""
Tu es un STYLISTE PERSONNEL expert. Tu connais la garde-robe de {prenom} et tu composes des tenues avec SES vêtements.

PROFIL :
- Prenom : {prenom}
- Genre : {genre}
- Age : {age} ans
- Morphologie : {morphologie}

METEO ACTUELLE :
- Temperature : {temp} degres C
- Conditions : {weather_desc}
- Ville : {ville}

═══ GARDE-ROBE DE {prenom.upper()} ═══
{wardrobe_text}

═══ ARTICLES EN VENTE SUR LA MARKETPLACE ═══
{marketplace_text}

MISSION : Compose 3 tenues COMPLETES et STYLEES.

REGLES DE COMPOSITION :
1. PRIORITE ABSOLUE : utilise les vetements de la garde-robe de {prenom} (source: "wardrobe").
2. Si une piece MANQUE pour completer la tenue (ex: pas de chaussures, pas de veste), cherche dans la marketplace (source: "marketplace").
3. Si ni la garde-robe ni la marketplace n'ont la piece, suggere un achat general (source: "suggestion") avec un type et une fourchette de prix.
4. Chaque tenue doit etre ADAPTEE a la meteo ({temp}°C, {weather_desc}).
5. Les 3 tenues doivent etre DIFFERENTES (casual, habille, sport/streetwear par exemple).

Reponds UNIQUEMENT avec un objet JSON valide :

{{
  "greeting": "Salutation chaleureuse pour {prenom}, mentionne la meteo de {ville} et donne un conseil mode du jour",
  "suggestions": [
    {{
      "titre": "Nom du look",
      "description": "2-3 phrases expliquant pourquoi cette combinaison fonctionne bien ensemble et est adaptee a la meteo",
      "pieces": [
        {{
          "type": "Description de la piece (ex: T-shirt blanc col rond)",
          "source": "wardrobe",
          "item_id": 42,
          "couleur": "blanc",
          "marque": null
        }},
        {{
          "type": "Jean slim bleu fonce",
          "source": "wardrobe",
          "item_id": 15,
          "couleur": "bleu",
          "marque": null
        }},
        {{
          "type": "Veste en jean vintage",
          "source": "marketplace",
          "listing_id": 7,
          "prix": 25.00,
          "marque": "Levi's",
          "couleur": "bleu"
        }},
        {{
          "type": "Sneakers blanches",
          "source": "suggestion",
          "prix_estime": 45.00,
          "conseil": "Des baskets blanches minimalistes completeraient parfaitement cette tenue"
        }}
      ],
      "occasion": "Journee decontractee"
    }}
  ]
}}

REGLES STRICTES :
- Pour source "wardrobe" : TOUJOURS inclure "item_id" correspondant a un ID existant dans la garde-robe ci-dessus.
- Pour source "marketplace" : TOUJOURS inclure "listing_id" correspondant a un LISTING_ID existant dans la marketplace ci-dessus.
- Pour source "suggestion" : inclure "prix_estime" (nombre) et "conseil" (texte court).
- "type" = description claire de la piece vestimentaire.
- NE PAS inventer des item_id ou listing_id qui n'existent pas dans les listes ci-dessus.
- Privilegie les pieces de la garde-robe — c'est ce que l'utilisateur POSSEDE deja.
- Adapte les combinaisons a la meteo, au genre, a l'age et a la morphologie.
- Assure-toi que les couleurs et styles se combinent harmonieusement.
- NE PAS inclure "prix_total", il sera calcule automatiquement.
"""

    try:
        response = tracked_generate(
            request_type="suggest",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=4096,
                http_options=types.HttpOptions(timeout=30000),
            ),
            user_id=user_id,
        )
        parsed = extract_json(response.text)
        if isinstance(parsed, dict):
            # Validate item_id and listing_id references
            wardrobe_ids = {it["id"] for it in wardrobe_items}
            listing_ids = {ls["id"] for ls in marketplace_listings}
            for sug in parsed.get("suggestions", []):
                for piece in sug.get("pieces", []):
                    src = piece.get("source", "")
                    if src == "wardrobe" and piece.get("item_id") not in wardrobe_ids:
                        piece["source"] = "suggestion"
                        piece.pop("item_id", None)
                    elif src == "marketplace" and piece.get("listing_id") not in listing_ids:
                        piece["source"] = "suggestion"
                        piece.pop("listing_id", None)
            return parsed
        return {"suggestions": [], "greeting": f"Bonjour {prenom} !"}
    except Exception as e:
        logger.error("Exception during suggestions: %s", e)
        return {"suggestions": [], "greeting": f"Bonjour {prenom} !"}

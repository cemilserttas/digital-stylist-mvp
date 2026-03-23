"""
AI service — daily outfit suggestions.
Generates 3 personalized looks based on user profile + current weather.
Uses Google Search grounding to find real products with direct URLs.
"""
import logging
from typing import Optional

from google.genai import types

from app.services.ai_base import client, extract_json, tracked_generate

logger = logging.getLogger(__name__)


async def get_daily_suggestions(
    user_profile: dict,
    weather_data: dict,
    user_id: Optional[int] = None,
) -> dict:
    """Generate personalized style suggestions based on profile + weather."""
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

    prompt = f"""
Tu es un personal shopper EXPERT. Tu trouves des VRAIS produits disponibles a l'achat sur des sites e-commerce.
Utilise Google Search pour trouver chaque produit REEL avec son URL DIRECTE vers la page produit.

PROFIL :
- Prenom : {prenom}
- Genre : {genre}
- Age : {age} ans
- Morphologie : {morphologie}

METEO ACTUELLE :
- Temperature : {temp} degres C
- Conditions : {weather_desc}
- Ville : {ville}

MISSION : 3 tenues COMPLETES avec des produits REELS trouvables en ligne. Budget 50-150 euros par tenue.

IMPORTANT : Pour chaque piece, cherche le produit EXACT sur un site e-commerce (amazon.fr, zalando.fr, asos.com, hm.com, zara.com, uniqlo.com, bershka.com, pullandbear.com, etc.) et donne l'URL DIRECTE vers la PAGE PRODUIT (PAS une page de recherche, PAS une page categorie).

Reponds UNIQUEMENT avec un objet JSON valide :

{{
  "greeting": "Salutation personnalisee pour {prenom} avec un conseil mode du jour lie a la meteo de {ville}",
  "suggestions": [
    {{
      "titre": "Nom accrocheur du look",
      "description": "2-3 phrases decrivant le look",
      "pieces": [
        {{
          "type": "Nom EXACT du produit tel qu'il apparait sur le site",
          "marque": "H&M",
          "prix": 9.99,
          "url_produit": "https://www2.hm.com/fr_fr/productpage.XXXXXXX.html",
          "shop": "H&M"
        }},
        {{
          "type": "Nom exact du bas",
          "marque": "Levi's",
          "prix": 49.99,
          "url_produit": "https://www.amazon.fr/dp/XXXXXXXXXX",
          "shop": "Amazon"
        }},
        {{
          "type": "Nom exact chaussures",
          "marque": "Vans",
          "prix": 39.99,
          "url_produit": "https://www.zalando.fr/vans-old-skool-XXXXXX.html",
          "shop": "Zalando"
        }},
        {{
          "type": "Nom exact accessoire",
          "marque": "New Era",
          "prix": 15.00,
          "url_produit": "https://www.asos.com/fr/new-era/XXXXXX",
          "shop": "ASOS"
        }}
      ],
      "occasion": "Journee decontractee, Week-end, etc."
    }},
    {{
      "titre": "Deuxieme look (style different)",
      "description": "Description du look",
      "pieces": [
        {{"type": "Produit reel", "marque": "Marque", "prix": 12.99, "url_produit": "URL directe", "shop": "Nom du site"}},
        {{"type": "Produit reel", "marque": "Marque", "prix": 19.99, "url_produit": "URL directe", "shop": "Nom du site"}},
        {{"type": "Produit reel", "marque": "Marque", "prix": 29.99, "url_produit": "URL directe", "shop": "Nom du site"}},
        {{"type": "Produit reel", "marque": "Marque", "prix": 9.99, "url_produit": "URL directe", "shop": "Nom du site"}}
      ],
      "occasion": "..."
    }},
    {{
      "titre": "Troisieme look (style different)",
      "description": "Description du look",
      "pieces": [
        {{"type": "Produit reel", "marque": "Marque", "prix": 14.99, "url_produit": "URL directe", "shop": "Nom du site"}},
        {{"type": "Produit reel", "marque": "Marque", "prix": 25.99, "url_produit": "URL directe", "shop": "Nom du site"}},
        {{"type": "Produit reel", "marque": "Marque", "prix": 34.99, "url_produit": "URL directe", "shop": "Nom du site"}},
        {{"type": "Produit reel", "marque": "Marque", "prix": 7.99, "url_produit": "URL directe", "shop": "Nom du site"}}
      ],
      "occasion": "..."
    }}
  ]
}}

REGLES STRICTES :
- PRODUITS REELS : Chaque piece DOIT etre un vrai produit trouve via Google Search. URL DIRECTE vers la page produit.
- "url_produit" = URL COMPLETE vers la page produit specifique (ex: https://www.zalando.fr/nike-air-max-90-baskets-ni112o0bt-a11.html). JAMAIS une URL de recherche ou categorie.
- "shop" = nom du site e-commerce (ex: "Zalando", "Amazon", "H&M", "ASOS", "Zara", "Uniqlo").
- "prix" doit etre un NOMBRE (ex: 9.99). Le VRAI prix affiche sur le site. PAS une chaine. PAS de fourchette.
- "type" = le nom EXACT du produit tel qu'il apparait sur le site.
- BUDGET : Total par tenue entre 50 et 150 euros. Pas de piece a plus de 60 euros.
- SITES PREFERES : Zalando, Amazon.fr, H&M, ASOS, Zara, Uniqlo, Bershka, Pull&Bear, Kiabi, Decathlon, C&A.
- Les 3 suggestions doivent etre DIFFERENTES (casual, habille, sport/streetwear).
- Adapte au genre ({genre}), age ({age} ans), morphologie ({morphologie}), meteo ({temp} degres, {weather_desc}).
- NE PAS inclure "prix_total", il sera calcule automatiquement.
- Si tu ne trouves pas l'URL exacte d'un produit, mets "lien_recherche" avec une requete de recherche en fallback.
"""

    try:
        response = tracked_generate(
            request_type="suggest",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=4096,
                tools=[types.Tool(google_search=types.GoogleSearch())],
                http_options=types.HttpOptions(timeout=45000),
            ),
            user_id=user_id,
        )
        parsed = extract_json(response.text)
        if isinstance(parsed, dict):
            return parsed
        return {"suggestions": [], "greeting": f"Bonjour {prenom} !"}
    except Exception as e:
        logger.error("Exception during suggestions: %s", e)
        return {"suggestions": [], "greeting": f"Bonjour {prenom} !"}

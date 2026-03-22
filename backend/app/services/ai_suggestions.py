"""
AI service — daily outfit suggestions.
Generates 3 personalized looks based on user profile + current weather.
"""
import logging

from google.genai import types

from app.services.ai_base import client, extract_json

logger = logging.getLogger(__name__)


async def get_daily_suggestions(user_profile: dict, weather_data: dict) -> dict:
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
Tu es un personal shopper MALIN specialise dans les BONS PLANS mode. Tu trouves des looks stylés a PETIT PRIX.
Tu privilegies les PROMOS, SOLDES, et le meilleur rapport qualite-prix.

PROFIL :
- Prenom : {prenom}
- Genre : {genre}
- Age : {age} ans
- Morphologie : {morphologie}

METEO ACTUELLE :
- Temperature : {temp} degres C
- Conditions : {weather_desc}
- Ville : {ville}

OBJECTIF : 3 tenues COMPLETES et STYLEES pour MOINS de 100-150 euros chacune au total.

Reponds UNIQUEMENT avec un objet JSON valide :

{{
  "greeting": "Salutation personnalisee pour {prenom} avec un conseil mode du jour lie a la meteo de {ville}",
  "suggestions": [
    {{
      "titre": "Nom accrocheur du look",
      "description": "2-3 phrases decrivant le look et pourquoi c'est un bon plan",
      "pieces": [
        {{"type": "Nom EXACT du produit", "marque": "H&M", "prix": 9.99, "lien_recherche": "H&M t-shirt col rond regular fit {genre.lower()}"}},
        {{"type": "Nom exact du bas", "marque": "Levi's", "prix": 49.99, "lien_recherche": "Levi's 511 slim fit {genre.lower()}"}},
        {{"type": "Nom exact chaussures", "marque": "Vans", "prix": 39.99, "lien_recherche": "Vans Old Skool noir blanc {genre.lower()}"}},
        {{"type": "Nom exact accessoire", "marque": "New Era", "prix": 15.00, "lien_recherche": "New Era casquette baseball coton {genre.lower()}"}}
      ],
      "occasion": "Journee decontractee, Week-end, etc."
    }},
    {{
      "titre": "Deuxieme look different",
      "description": "Description du bon plan",
      "pieces": [
        {{"type": "Produit precis", "marque": "Marque", "prix": 12.99, "lien_recherche": "requete precise"}},
        {{"type": "Produit precis", "marque": "Marque", "prix": 19.99, "lien_recherche": "requete precise"}},
        {{"type": "Produit precis", "marque": "Marque", "prix": 29.99, "lien_recherche": "requete precise"}},
        {{"type": "Produit precis", "marque": "Marque", "prix": 9.99, "lien_recherche": "requete precise"}}
      ],
      "occasion": "..."
    }},
    {{
      "titre": "Troisieme look different",
      "description": "Description du bon plan",
      "pieces": [
        {{"type": "Produit precis", "marque": "Marque", "prix": 14.99, "lien_recherche": "requete precise"}},
        {{"type": "Produit precis", "marque": "Marque", "prix": 25.99, "lien_recherche": "requete precise"}},
        {{"type": "Produit precis", "marque": "Marque", "prix": 34.99, "lien_recherche": "requete precise"}},
        {{"type": "Produit precis", "marque": "Marque", "prix": 7.99, "lien_recherche": "requete precise"}}
      ],
      "occasion": "..."
    }}
  ]
}}

REGLES STRICTES :
- BUDGET : Le total de chaque tenue doit etre entre 50 et 150 euros MAXIMUM. Pas de piece a plus de 60 euros.
- PROMOS : Privilegie : H&M, UNIQLO, Primark, Zara, Bershka, Pull&Bear, ASOS, Kiabi, Decathlon, C&A.
- "prix" doit etre un NOMBRE (ex: 9.99). PAS une chaine. PAS de fourchette.
- "type" = le nom EXACT du produit tel qu'il apparait sur le site de la marque.
- "lien_recherche" = requete pour TROUVER ce produit exact. Format : "[marque] [nom exact] [homme/femme]".
- Les 3 suggestions doivent etre DIFFERENTES (casual, habille, sport/streetwear).
- Adapte au genre ({genre}), age ({age} ans), morphologie ({morphologie}), meteo ({temp} degres, {weather_desc}).
- NE PAS inclure "prix_total", il sera calcule automatiquement.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=4096,
                http_options=types.HttpOptions(timeout=30000),
            ),
        )
        parsed = extract_json(response.text)
        if isinstance(parsed, dict):
            return parsed
        return {"suggestions": [], "greeting": f"Bonjour {prenom} !"}
    except Exception as e:
        logger.error("Exception during suggestions: %s", e)
        return {"suggestions": [], "greeting": f"Bonjour {prenom} !"}

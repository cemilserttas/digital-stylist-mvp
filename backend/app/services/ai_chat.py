"""
AI service — chat with the stylist.
Conversational AI stylist with product recommendations.
"""
import logging

from google.genai import types

from app.services.ai_base import client, extract_json

logger = logging.getLogger(__name__)


async def chat_with_stylist(user_profile: dict, message: str, history: list[dict] = None) -> dict:
    """Chat with the AI stylist. Returns a text response + optional product links."""
    if not client:
        logger.error("Gemini client not initialized (missing API key)")
        return {"reply": "Désolé, je suis indisponible pour le moment.", "products": []}

    prenom = user_profile.get("prenom", "Utilisateur")
    genre = user_profile.get("genre", "Homme")
    age = user_profile.get("age", 25)
    morphologie = user_profile.get("morphologie", "RECTANGLE")

    history_text = ""
    if history:
        for msg in history[-6:]:
            role = "Utilisateur" if msg.get("role") == "user" else "Styliste"
            history_text += f"{role}: {msg.get('content', '')}\n"

    prompt = f"""Tu es un styliste personnel et personal shopper sympathique. Tu t'appelles DigitalStylist.
Tu parles en francais de maniere chaleureuse et tu tutoies l'utilisateur.

PROFIL DE L'UTILISATEUR :
- Prenom : {prenom}
- Genre : {genre}
- Age : {age} ans
- Morphologie : {morphologie}

{f"HISTORIQUE DE CONVERSATION :{chr(10)}{history_text}" if history_text else ""}

MESSAGE DE L'UTILISATEUR : {message}

INSTRUCTIONS :
- Reponds de maniere conversationnelle et amicale, en 2-4 phrases maximum.
- Si l'utilisateur demande des recommandations de vetements, looks, ou style :
  Inclus des produits PRECIS avec marque, prix, et mots-cles de recherche.
  Privilegie les marques accessibles (H&M, Zara, UNIQLO, Nike, etc.) et les prix abordables.
- Si c'est juste une question ou une conversation, reponds sans produits.

Reponds UNIQUEMENT avec un JSON valide :
{{
  "reply": "Ta reponse conversationnelle ici",
  "products": [
    {{
      "name": "Nom exact du produit",
      "marque": "Marque",
      "prix": 14.99,
      "recherche": "UNIQLO t-shirt col rond dry-ex {genre.lower()}"
    }}
  ]
}}

REGLES :
- "products" peut etre un tableau VIDE [] si pas de recommandation.
- "prix" = NOMBRE, pas de texte. Prix realiste.
- "recherche" = termes Google pour trouver ce produit exact.
- Maximum 4 produits par reponse.
- Adapte tes recommandations au genre ({genre}), age ({age}), morphologie ({morphologie}).
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.8,
                max_output_tokens=2048,
                http_options=types.HttpOptions(timeout=30000),
            ),
        )
        parsed = extract_json(response.text)
        if isinstance(parsed, dict):
            return parsed
        return {"reply": response.text.strip(), "products": []}
    except Exception as e:
        logger.error("Exception during chat: %s", e)
        return {"reply": "Désolé, j'ai eu un souci. Réessaie dans un instant !", "products": []}

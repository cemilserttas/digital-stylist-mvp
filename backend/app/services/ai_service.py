import os
import json
import re
import traceback
import google.generativeai as genai
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Init
# ---------------------------------------------------------------------------
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("⚠️  WARNING: GEMINI_API_KEY not found in .env – AI features will fail.")
else:
    genai.configure(api_key=api_key)
    print("✅ Gemini API configured successfully.")

# ---------------------------------------------------------------------------
# Utility – extract JSON array or object from text
# ---------------------------------------------------------------------------
def extract_json(text: str):
    """Extracts a JSON array or object from text, handles markdown fences."""
    cleaned = text.strip()
    
    # Remove markdown fences
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    # Try direct parse first (cleanest path)
    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            return [result]
    except json.JSONDecodeError:
        pass
    
    # Fallback: regex for array
    arr_match = re.search(r'\[.*\]', text, re.DOTALL)
    if arr_match:
        try:
            result = json.loads(arr_match.group(0))
            if isinstance(result, list) and len(result) > 0:
                return result
        except json.JSONDecodeError:
            pass
    
    # Fallback: regex for object
    obj_match = re.search(r'\{.*\}', text, re.DOTALL)
    if obj_match:
        try:
            result = json.loads(obj_match.group(0))
            if isinstance(result, dict):
                return [result]
        except json.JSONDecodeError:
            pass
    
    return None

# ---------------------------------------------------------------------------
# 1. Analyse d'image – MULTI-VÊTEMENTS
# ---------------------------------------------------------------------------
ANALYZE_PROMPT = """
Tu es un styliste professionnel expert en mode. Analyse cette photo en détail.

RÈGLE : Identifie CHAQUE vêtement, chaussure et accessoire visible.
Le plus visible en premier (élément principal de la photo).

Réponds avec un tableau JSON valide. Un objet par pièce détectée.

[
  {
    "type": "Type PRÉCIS en français (T-shirt, Chemise, Jean slim, Sneakers, Montre, Veste en cuir...)",
    "genre": "Homme ou Femme ou Unisexe",
    "textile": "Matière (Coton, Denim, Cuir, Laine, Polyester, Acier, Toile...)",
    "couleur_dominante": "Couleur PRÉCISE (Bleu Marine, Gris Clair, Blanc Cassé, Noir...)",
    "style": "Décontracté, Chic, Sportswear, Streetwear, Classique, Bohème...",
    "saison": "Été, Hiver, Mi-saison, ou Toutes saisons",
    "coupe": "Slim, Regular, Oversize, Cintrée, Droite...",
    "description": "2-3 phrases décrivant cette pièce : forme, détails, logo, finitions visibles.",
    "conseils_combinaison": "2-3 phrases : avec quoi porter cette pièce, couleurs idéales, marques qui iraient bien.",
    "produits_recommandes": [
      {"nom": "Produit complémentaire 1", "marque": "Marque", "prix_estime": "XX€", "recherche": "mots-clés recherche e-shop"},
      {"nom": "Produit complémentaire 2", "marque": "Marque", "prix_estime": "XX€", "recherche": "mots-clés recherche e-shop"},
      {"nom": "Produit complémentaire 3", "marque": "Marque", "prix_estime": "XX€", "recherche": "mots-clés recherche e-shop"}
    ]
  }
]

IMPORTANT :
- Sois PRÉCIS sur le type : "T-shirt" pas "Vêtement", "Jean slim" pas "Pantalon".
- Détecte 1 à 5 pièces maximum.
- Les produits recommandés doivent être des pièces DIFFÉRENTES qui s'accordent bien avec la pièce analysée.
"""

SINGLE_FALLBACK = {
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


async def analyze_clothing_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Detects ALL clothing items in an image using Gemini 2.0 Flash.
    Returns a dict for the PRIMARY item, with all items stored in tags_ia JSON.
    """
    fallback_result = {**SINGLE_FALLBACK, "tags_ia": json.dumps({"items": [SINGLE_FALLBACK]}, ensure_ascii=False)}
    
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={"temperature": 0.3, "max_output_tokens": 4096},
        )
    except Exception as e:
        print(f"❌ Failed to create Gemini model: {e}")
        traceback.print_exc()
        return fallback_result

    image_part = {"mime_type": mime_type, "data": image_bytes}

    try:
        print("🔄 Sending image to Gemini 2.0 Flash for analysis...")
        response = model.generate_content([ANALYZE_PROMPT, image_part])

        # Check for blocked responses
        try:
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                print(f"❌ Gemini BLOCKED: {response.prompt_feedback}")
                return fallback_result
        except Exception:
            pass

        raw = response.text
        print(f"🤖 RAW AI RESPONSE:\n{raw[:500]}")

        items_list = extract_json(raw)

        if items_list is None or len(items_list) == 0:
            print(f"❌ Could not extract JSON items. Full response:\n{raw}")
            return fallback_result

        print(f"✅ Detected {len(items_list)} item(s): {[it.get('type', '?') for it in items_list]}")

        # Normalize each item
        for item in items_list:
            if "couleur_dominante" not in item and "couleur" in item:
                item["couleur_dominante"] = item["couleur"]
            for key, default in SINGLE_FALLBACK.items():
                item.setdefault(key, default)

        # Primary item = first (most visible)
        primary = items_list[0]

        # Store ALL items in tags_ia for the frontend detail modal
        primary["tags_ia"] = json.dumps({"items": items_list}, ensure_ascii=False)

        return primary

    except Exception as e:
        print(f"❌ Exception during image analysis: {e}")
        traceback.print_exc()
        return fallback_result


# ---------------------------------------------------------------------------
# 2. Suggestion de tenue
# ---------------------------------------------------------------------------
async def suggest_outfit(user_profile: dict, weather: str, wardrobe: list) -> dict:
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
    except Exception as e:
        print(f"❌ Failed to create model for outfit suggestion: {e}")
        return {"suggestion": "Erreur de configuration du modèle IA."}

    prompt = f"""
    Tu es un styliste personnel expert "Digital Stylist".

    PROFIL :
    - Prénom : {user_profile.get("prenom", "Utilisateur")}
    - Morphologie : {user_profile.get("morphologie", "Non spécifiée")}

    MÉTÉO : {weather}

    GARDE-ROBE :
    {json.dumps(wardrobe, default=str, ensure_ascii=False)}

    Propose une tenue complète, explique pourquoi et sois motivant.
    """

    try:
        response = model.generate_content(prompt)
        return {"suggestion": response.text}
    except Exception as e:
        print(f"❌ Exception during outfit suggestion: {e}")
        return {"suggestion": "Désolé, impossible de générer une suggestion. Réessayez !"}

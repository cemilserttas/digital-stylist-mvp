import os
import json
import re
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Init
# ---------------------------------------------------------------------------
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning("GEMINI_API_KEY not found – AI features will fail")
    client = None
else:
    client = genai.Client(api_key=api_key)
    logger.info("Gemini API client created")

# ---------------------------------------------------------------------------
# Utility – extract JSON from text
# ---------------------------------------------------------------------------
def extract_json(text: str):
    """Extracts JSON (object or array) from text, handles markdown fences."""
    cleaned = text.strip()

    # Remove markdown fences
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Fallback: regex for object (our new format)
    obj_match = re.search(r'\{.*\}', text, re.DOTALL)
    if obj_match:
        try:
            result = json.loads(obj_match.group(0))
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

    # Fallback: regex for array (old format compat)
    arr_match = re.search(r'\[.*\]', text, re.DOTALL)
    if arr_match:
        try:
            result = json.loads(arr_match.group(0))
            if isinstance(result, list) and len(result) > 0:
                return result
        except json.JSONDecodeError:
            pass

    return None

# ---------------------------------------------------------------------------
# 1. Analyse d'image – MULTI-VÊTEMENTS + ÉVALUATION DU LOOK
# ---------------------------------------------------------------------------
ANALYZE_PROMPT = """
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
- 5/5 = look parfait, rien a ajouter. Tout est harmonieux et stylé.
- 4/5 = tres bon look mais un detail pourrait l'ameliorer (ex: un accessoire manquant).
- 3/5 = bon look general mais des ameliorations claires sont possibles.
- 2/5 = look desequilibre, plusieurs pieces manquent ou ne vont pas ensemble.
- 1/5 = look a revoir entierement.
- Si la note est inferieure a 5, tu DOIS proposer les pieces manquantes pour atteindre 5/5.

Reponds UNIQUEMENT avec un objet JSON valide. Pas de markdown, pas de texte autour.

{
  "items": [
    {
      "type": "Type ultra-precis (T-shirt col V, Chemise Oxford, Jean slim taille haute...)",
      "genre": "Homme | Femme | Unisexe",
      "textile": "Matiere precise (Jersey de coton, Denim brut selvedge, Cuir pleine fleur...)",
      "couleur_dominante": "Couleur nuancee (Bleu Nuit, Terracotta, Ecru, Gris Anthracite...)",
      "style": "Smart Casual | Casual Chic | Sportswear Premium | Streetwear | Business Casual | Minimaliste | Preppy",
      "saison": "Ete | Hiver | Mi-saison | Toutes saisons",
      "coupe": "Slim fit | Regular | Oversize | Cropped | Cintree | Droite | Tapered",
      "description": "3-4 phrases d'expert : fiche produit haut de gamme avec finitions, qualite tissu, tombe, coupe, logo visible.",
      "conseils_combinaison": "4-5 phrases de styliste PRO : theorie des couleurs, combinaisons precises, option casual + habillee, couleurs a eviter.",
      "produits_recommandes": [
        {
          "nom": "Nom precis (ex: Chino slim stretch beige sable)",
          "marque": "Marque REELLE (Zara, COS, Massimo Dutti, Levi's, Nike, Ralph Lauren, UNIQLO...)",
          "prix_estime": "Fourchette realiste (ex: 45-60 euros)",
          "recherche": "Mots-cles e-shop (ex: chino slim homme beige coton stretch)"
        },
        {
          "nom": "Piece complementaire",
          "marque": "Marque reelle",
          "prix_estime": "Fourchette",
          "recherche": "Mots-cles recherche"
        },
        {
          "nom": "Accessoire ou chaussure",
          "marque": "Marque reelle",
          "prix_estime": "Fourchette",
          "recherche": "Mots-cles recherche"
        }
      ]
    }
  ],
  "evaluation": {
    "note": 4,
    "commentaire": "2-3 phrases d'evaluation globale du look : ce qui fonctionne bien (harmonie des couleurs, proportions, style) et ce qui pourrait etre ameliore. Sois constructif et bienveillant comme un vrai styliste.",
    "points_forts": "Ce qui est reussi dans ce look (ex: bel accord de couleurs, bonne coupe...)",
    "prix_total_look": {
      "budget": {"min": 80, "max": 120, "marques": "H&M, UNIQLO, Primark"},
      "moyen": {"min": 150, "max": 250, "marques": "Zara, COS, Mango"},
      "premium": {"min": 300, "max": 500, "marques": "Massimo Dutti, Ralph Lauren, Tommy Hilfiger"}
    },
    "pieces_manquantes": [
      {
        "nom": "Piece precise qui manque pour un look 5/5 (ex: Ceinture tressee en cuir cognac)",
        "marque": "Marque REELLE",
        "prix_estime": "Fourchette realiste",
        "raison": "Pourquoi cette piece ameliorerait le look (ex: apporterait une touche structuree et un point focal a la taille)",
        "recherche": "Mots-cles e-shop precis"
      }
    ]
  }
}

REGLES STRICTES :
- Les 3 produits recommandes par piece doivent former une TENUE COMPLETE.
- Si la note est 5/5, "pieces_manquantes" doit etre un tableau VIDE [].
- Si la note est < 5/5, propose 1 a 3 pieces manquantes CONCRETES avec marques et prix REELS.
- Les marques doivent etre REELLES et dans la meme gamme de prix.
- JAMAIS de reponse generique. Tout doit etre SPECIFIQUE a cette photo.
- Detecte 1 a 4 pieces maximum.
- prix_total_look : estime le cout TOTAL pour reproduire ce look complet (toutes les pieces visibles ensemble), avec 3 gammes de prix REALISTES.
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

FALLBACK_EVALUATION = {
    "note": 0,
    "commentaire": "L'évaluation n'a pas pu être effectuée.",
    "points_forts": "",
    "pieces_manquantes": [],
}


async def analyze_clothing_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Detects ALL clothing items + evaluates the overall look.
    Returns a dict for the PRIMARY item, with all data in tags_ia JSON.
    """
    fallback_tags = json.dumps({
        "items": [SINGLE_FALLBACK],
        "evaluation": FALLBACK_EVALUATION,
    }, ensure_ascii=False)
    fallback_result = {**SINGLE_FALLBACK, "tags_ia": fallback_tags}

    if not client:
        logger.error("Gemini client not initialized (missing API key)")
        return fallback_result

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    try:
        logger.info("Sending image to Gemini for analysis")
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[ANALYZE_PROMPT, image_part],
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=8192,
            ),
        )

        # Check for blocked responses
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

        # Handle both response formats
        items_list = []
        evaluation = FALLBACK_EVALUATION

        if isinstance(parsed, dict):
            # New format: { items: [...], evaluation: {...} }
            items_list = parsed.get("items", [])
            evaluation = parsed.get("evaluation", FALLBACK_EVALUATION)
            if not items_list and not parsed.get("evaluation"):
                # It's a single item object
                items_list = [parsed]
        elif isinstance(parsed, list):
            # Old format: [item1, item2, ...]
            items_list = parsed

        if len(items_list) == 0:
            logger.error("No items found in Gemini response")
            return fallback_result

        logger.info("Detected %d item(s), look score: %s/5", len(items_list), evaluation.get('note', '?'))

        # Normalize each item
        for item in items_list:
            if "couleur_dominante" not in item and "couleur" in item:
                item["couleur_dominante"] = item["couleur"]
            for key, default in SINGLE_FALLBACK.items():
                item.setdefault(key, default)

        # Primary item = first (most visible)
        primary = items_list[0]

        # Store ALL data in tags_ia for the frontend
        primary["tags_ia"] = json.dumps({
            "items": items_list,
            "evaluation": evaluation,
        }, ensure_ascii=False)

        return primary

    except Exception as e:
        logger.error("Exception during image analysis: %s", e)
        logger.exception("Traceback for image analysis failure:")
        return fallback_result


# ---------------------------------------------------------------------------
# 2. Suggestions personnalisées (homepage)
# ---------------------------------------------------------------------------
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
      "titre": "Nom accrocheur du look (ex: Urban Casual a petit prix)",
      "description": "2-3 phrases decrivant le look et pourquoi c'est un bon plan",
      "pieces": [
        {{
          "type": "Nom EXACT du produit tel qu'il apparait sur le site de la marque (ex: T-shirt col rond Regular Fit)",
          "marque": "H&M",
          "prix": 9.99,
          "lien_recherche": "H&M t-shirt col rond regular fit {genre.lower()}"
        }},
        {{
          "type": "Nom exact du bas (ex: Jean slim 511)",
          "marque": "Levi's",
          "prix": 49.99,
          "lien_recherche": "Levi's 511 slim fit {genre.lower()}"
        }},
        {{
          "type": "Nom exact chaussures (ex: Old Skool noir/blanc)",
          "marque": "Vans",
          "prix": 39.99,
          "lien_recherche": "Vans Old Skool noir blanc {genre.lower()}"
        }},
        {{
          "type": "Nom exact accessoire (ex: Casquette baseball coton)",
          "marque": "New Era",
          "prix": 15.00,
          "lien_recherche": "New Era casquette baseball coton {genre.lower()}"
        }}
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
- PROMOS : Privilegie les marques accessibles : H&M, UNIQLO, Primark, Zara, Bershka, Pull&Bear, ASOS, Kiabi, Decathlon, Pimkie, Stradivarius, C&A, New Yorker.
- "prix" doit etre un NOMBRE (ex: 9.99). PAS une chaine. PAS de fourchette.
- "type" = le nom EXACT du produit tel qu'il apparait sur le site de la marque. Pas "Pantalon" mais "Jean Skinny Taille Haute noir".
- "lien_recherche" = requete pour TROUVER ce produit exact sur Google. Format : "[marque] [nom exact produit] [homme/femme]".
  Exemples : "H&M jean skinny taille haute femme", "UNIQLO t-shirt airism col rond homme", "Adidas Gazelle noir homme".
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
            ),
        )
        raw = response.text
        parsed = extract_json(raw)
        if isinstance(parsed, dict):
            return parsed
        return {"suggestions": [], "greeting": f"Bonjour {prenom} !"}
    except Exception as e:
        logger.error("Exception during suggestions: %s", e)
        return {"suggestions": [], "greeting": f"Bonjour {prenom} !"}


# ---------------------------------------------------------------------------
# 3. Wardrobe scoring — full wardrobe AI analysis
# ---------------------------------------------------------------------------
async def score_wardrobe(user_profile: dict, items: list[dict]) -> dict:
    """
    Analyse la garde-robe complète et retourne un bilan styliste.
    items: list of {type, couleur, saison, style (from tags_ia)}
    """
    fallback = {
        "score": None,
        "style_dna": "Analyse impossible",
        "forces": [],
        "axes_amelioration": [],
        "capsule_manquante": [],
        "top_combos": [],
    }

    if not client:
        logger.error("Gemini client not initialized (missing API key)")
        return fallback

    prenom = user_profile.get("prenom", "Utilisateur")
    genre = user_profile.get("genre", "Homme")
    morphologie = user_profile.get("morphologie", "RECTANGLE")
    style_prefere = user_profile.get("style_prefere", "")

    # Build wardrobe summary (max 40 items to keep prompt manageable)
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
  "forces": [
    "Point fort concret (ex: Belle base de neutres qui se melangent bien)",
    "Deuxieme force"
  ],
  "axes_amelioration": [
    "Axe d'amelioration concret (ex: Manque de pieces structurees pour les occasions)",
    "Deuxieme axe"
  ],
  "capsule_manquante": [
    {{
      "type": "Piece precise manquante (ex: Blazer oversize en lin)",
      "pourquoi": "Raison concrete (ex: Permettrait de smartifier n'importe quel look en 30 secondes)",
      "marque": "Marque accessible (ex: Zara)",
      "prix_estime": "40-70 euros",
      "recherche": "mots-cles e-shop"
    }},
    {{
      "type": "Deuxieme piece manquante",
      "pourquoi": "Raison",
      "marque": "Marque",
      "prix_estime": "fourchette",
      "recherche": "mots-cles"
    }},
    {{
      "type": "Troisieme piece manquante",
      "pourquoi": "Raison",
      "marque": "Marque",
      "prix_estime": "fourchette",
      "recherche": "mots-cles"
    }}
  ],
  "top_combos": [
    {{
      "titre": "Nom du combo (ex: Look Bureau Decontracte)",
      "pieces": ["Piece 1 de la garde-robe", "Piece 2", "Piece 3"],
      "conseil": "1 phrase de styliste sur ce combo"
    }},
    {{
      "titre": "Deuxieme combo",
      "pieces": ["Piece A", "Piece B"],
      "conseil": "Conseil"
    }}
  ]
}}

REGLES :
- "score" : note sur 5 (ex: 3.8). Base-toi sur variete, coherence, polyvalence, adaptation a la morphologie.
- "forces" : 2-3 points. Concrets, pas generiques.
- "axes_amelioration" : 2-3 axes. Actionables.
- "capsule_manquante" : 3 pieces qui transformeraient cette garde-robe. Prix realistes.
- "top_combos" : 2 combos realises avec les pieces EXISTANTES dans la garde-robe.
- Adapte tout au genre ({genre}) et a la morphologie ({morphologie}).
- Sois bienveillant mais honnete. Ne surnom pas les notes.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.5,
                max_output_tokens=2048,
            ),
        )
        raw = response.text
        parsed = extract_json(raw)
        if isinstance(parsed, dict):
            logger.info("Wardrobe score for %s: %s/5", prenom, parsed.get("score"))
            return parsed
        return fallback
    except Exception as e:
        logger.error("Exception during wardrobe scoring: %s", e)
        return fallback


# ---------------------------------------------------------------------------
# 4. Chatbot styliste
# ---------------------------------------------------------------------------
async def chat_with_stylist(user_profile: dict, message: str, history: list[dict] = None) -> dict:
    """Chat with the AI stylist. Returns a text response + optional product links."""
    if not client:
        logger.error("Gemini client not initialized (missing API key)")
        return {"reply": "Désolé, je suis indisponible pour le moment.", "products": []}

    prenom = user_profile.get("prenom", "Utilisateur")
    genre = user_profile.get("genre", "Homme")
    age = user_profile.get("age", 25)
    morphologie = user_profile.get("morphologie", "RECTANGLE")

    # Build conversation history context
    history_text = ""
    if history:
        for msg in history[-6:]:  # Keep last 6 messages for context
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
      "name": "Nom exact du produit (ex: T-shirt col rond Dry-EX)",
      "marque": "Marque (ex: UNIQLO)",
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
            ),
        )
        raw = response.text
        parsed = extract_json(raw)
        if isinstance(parsed, dict):
            return parsed
        return {"reply": raw.strip(), "products": []}
    except Exception as e:
        logger.error("Exception during chat: %s", e)
        return {"reply": "Désolé, j'ai eu un souci. Réessaie dans un instant !", "products": []}

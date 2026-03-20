# /security-fix — Correction des Vulnérabilités

Lis `CLAUDE.md` section "Problèmes connus P0/P1" avant de commencer.
Chaque fix est **atomique** : lisible, vérifiable, committable séparément.
Travailler dans l'ordre P0 → P1. Ne pas combiner plusieurs fixes dans un seul commit.

---

## Fix 1 — Clé Admin : supprimer la valeur par défaut (admin.py)

**Problème :** `ADMIN_KEY = os.getenv("ADMIN_KEY", "digital-stylist-admin-2024")` — fallback codé en dur.

**Correction :**
1. Supprimer la valeur par défaut : `ADMIN_KEY = os.getenv("ADMIN_KEY")`
2. Ajouter une validation au démarrage dans `app/main.py` (dans le lifespan) :
   ```python
   admin_key = os.getenv("ADMIN_KEY")
   if not admin_key or len(admin_key) < 16:
       raise RuntimeError("ADMIN_KEY env var manquante ou trop courte (min 16 chars)")
   ```
3. Logger les tentatives d'auth admin échouées :
   ```python
   logger.warning("Tentative admin échouée - IP: %s", request.client.host)
   ```
4. S'assurer que `ADMIN_KEY` est dans `.env.example` avec une note

**Vérification :** `cd backend && python -c "from app.main import app; print('OK')"`

---

## Fix 2 — Validation Upload Fichier (wardrobe.py)

**Problème :** Pas de vérification de taille ni de type MIME réel — n'importe quel fichier est accepté.

**Correction :**
```python
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/upload")
async def upload_clothing(file: UploadFile, ...):
    # Vérification MIME
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Format non supporté. Formats acceptés : JPEG, PNG, WebP"
        )
    # Vérification taille
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="Fichier trop volumineux (max 10 Mo)")
    await file.seek(0)  # Rembobiner pour la suite
```

**Vérification :** Tester avec un fichier .txt → doit retourner 422

---

## Fix 3 — Logs SQL en Production (database.py)

**Problème :** `echo=True` → toutes les requêtes SQL (avec données) loguées en prod.

**Correction :**
```python
# Avant
engine = create_async_engine(sqlite_url, echo=True)

# Après
DB_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"
engine = create_async_engine(sqlite_url, echo=DB_ECHO)
```

Ajouter `DB_ECHO=true` dans `.env.example` avec le commentaire `# Mettre true en dev seulement`.

**Vérification :** En prod, aucune requête SQL ne doit apparaître dans les logs Render.

---

## Fix 4 — Clé Gemini : supprimer l'affichage au démarrage (ai_service.py)

**Problème :** `print()` au chargement du module expose la présence/format de la clé API.

**Correction :**
```python
import logging
logger = logging.getLogger(__name__)

# Remplacer tous les print() de configuration par :
logger.info("Service Gemini initialisé")

# NE JAMAIS logger la valeur de la clé
# Validation du format uniquement (les clés Gemini commencent par "AIza")
api_key = os.getenv("GEMINI_API_KEY")
if not api_key or not api_key.startswith("AIza"):
    logger.error("GEMINI_API_KEY manquante ou au mauvais format")
    raise RuntimeError("GEMINI_API_KEY invalide")
```

**Vérification :** Démarrer le backend — aucune mention de clé dans les logs.

---

## Fix 5 — Validation des endpoints /chat et /suggestions (main.py + models.py)

**Problème :** Ces endpoints acceptent `body: dict` et `weather_data: dict` sans validation.

**Correction — ajouter dans `models.py` :**
```python
from pydantic import field_validator

class ChatRequest(SQLModel):
    message: str
    history: list[dict] = []

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Le message ne peut pas être vide")
        if len(v) > 1000:
            raise ValueError("Message trop long (max 1000 caractères)")
        return v.strip()

    @field_validator("history")
    @classmethod
    def history_limit(cls, v: list) -> list:
        return v[-20:]  # Garder seulement les 20 derniers messages

class WeatherRequest(SQLModel):
    temperature: float
    description: str
    ville: str = "Paris"
```

**Correction — mettre à jour `main.py` :**
```python
from app.models import ChatRequest, WeatherRequest

@app.post("/chat/{user_id}")
async def chat(user_id: int, body: ChatRequest, ...):
    ...

@app.post("/suggestions/{user_id}")
async def suggestions(user_id: int, weather_data: WeatherRequest, ...):
    ...
```

**Vérification :** Envoyer un message vide → doit retourner 422.

---

## Fix 6 — Clé Admin côté Frontend (admin/page.tsx)

**Problème :** La clé admin est stockée dans le state React et envoyée directement en header — visible dans DevTools et les logs réseau.

**Correction :** Créer une route API Next.js qui proxy les appels admin côté serveur.

```typescript
// Créer : frontend/app/api/admin/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
const ADMIN_KEY = process.env.ADMIN_KEY  // Variable serveur (sans NEXT_PUBLIC_)

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const res = await fetch(`${BACKEND_URL}/admin/${path}`, {
    headers: { 'x-admin-key': ADMIN_KEY || '' }
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const res = await fetch(`${BACKEND_URL}/admin/${path}`, {
    method: 'DELETE',
    headers: { 'x-admin-key': ADMIN_KEY || '' }
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

Mettre à jour `lib/api.ts` : les appels admin pointent vers `/api/admin/...` au lieu de `/admin/...`.

Ajouter dans `.env.example` :
```
ADMIN_KEY=         # Clé admin (serveur seulement, jamais NEXT_PUBLIC_)
BACKEND_URL=http://localhost:8000
```

**Vérification :** Dans le Network tab du navigateur → aucun header `x-admin-key` visible côté client.

---

## Après chaque fix

1. Vérifier que l'app démarre : `python -c "from app.main import app"` ou `npm run build`
2. Committer le fix seul avec un message clair : `fix(security): [description du fix]`
3. Mettre à jour `WORK_LOG.md` avec le fix appliqué

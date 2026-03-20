# /backend — Développement Backend

Lis `CLAUDE.md` entièrement avant de commencer. Toutes les conventions définies là sont non négociables.

---

## Avant d'écrire le moindre code

1. Identifier dans quel router la feature appartient (`users.py`, `wardrobe.py`, `admin.py`, ou nouveau)
2. Définir les Pydantic models nécessaires dans `models.py` (request + response)
3. Vérifier si une colonne/table DB est requise → noter qu'une migration Alembic sera nécessaire
4. Identifier quelle fonction de `ai_service.py` est impliquée (si applicable)
5. Vérifier `API_CHANGES.md` — y a-t-il un contrat existant à respecter ?

---

## Checklist — Tout nouvel endpoint doit respecter

```python
# ✅ Request body = Pydantic model (jamais bare dict)
@router.post("/exemple")
async def mon_endpoint(body: MonRequestModel, session: AsyncSession = Depends(get_session)):

# ✅ Response model déclaré
@router.get("/exemple/{id}", response_model=MonResponseModel)

# ✅ Vérification ownership (l'user ne peut accéder qu'à ses propres données)
item = await session.get(ClothingItem, item_id)
if not item:
    raise HTTPException(status_code=404, detail="Élément introuvable")
if item.user_id != current_user_id:
    raise HTTPException(status_code=403, detail="Accès non autorisé")

# ✅ Structured logging (jamais print())
import logging
logger = logging.getLogger(__name__)
logger.info("User %s uploaded item", user_id)
logger.warning("Upload validation failed: %s", reason)

# ✅ HTTPException avec message French (user-facing) + log English
logger.error("Gemini API failed for user %s: %s", user_id, str(e))
raise HTTPException(status_code=503, detail="Le service d'analyse est temporairement indisponible")

# ✅ Status codes appropriés
# 200 OK, 201 Created, 204 No Content
# 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable

# ✅ Async/await correct
result = await session.execute(select(User).where(User.id == user_id))
user = result.scalars().first()
```

---

## Modèles de données

**Ajouter dans `models.py` uniquement — jamais dans les routers.**

```python
# Pattern standard pour un nouveau modèle
class MonItemBase(SQLModel):
    nom: str
    description: Optional[str] = None

class MonItem(MonItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)  # index=True sur les FKs !
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MonItemCreate(MonItemBase):
    user_id: int

class MonItemRead(MonItemBase):
    id: int
    user_id: int
    created_at: datetime
```

**Règles models.py :**
- Toujours `index=True` sur les clés étrangères
- Utiliser `datetime.now(timezone.utc)` (pas `datetime.utcnow()` déprécié)
- Séparer les classes `Base`, `table=True`, `Create`, `Read` pour éviter la confusion

---

## Règles Upload de Fichiers (wardrobe.py)

```python
from uuid import uuid4

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

async def validate_and_save_upload(file: UploadFile, upload_dir: str) -> str:
    # 1. Valider MIME depuis content_type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(422, "Format non supporté (JPEG, PNG, WebP uniquement)")

    # 2. Lire et vérifier la taille
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(422, "Fichier trop volumineux (max 10 Mo)")
    await file.seek(0)

    # 3. UUID filename (jamais utiliser file.filename en prod)
    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type]
    filename = f"{uuid4()}{ext}"
    file_path = os.path.join(upload_dir, filename)

    # 4. Sauvegarder (path relatif stocké en DB)
    with open(file_path, "wb") as f:
        f.write(content)

    return f"uploads/{filename}"  # Path relatif
```

---

## Règles Service IA (ai_service.py)

```python
# Toujours envelopper les appels Gemini dans try/except
try:
    response = model.generate_content(prompt)
    result = extract_json(response.text)
    if result is None:
        raise ValueError("JSON invalide dans la réponse")
    return result
except Exception as e:
    logger.error("Gemini API error: %s", str(e))
    return default_fallback_value  # Toujours retourner un fallback

# Températures calibrées par usage
# - analyze_clothing_image : 0.3 (factuel, précis)
# - get_daily_suggestions  : 0.7 (créatif, varié)
# - chat_with_stylist       : 0.8 (conversationnel)
```

---

## Règles Base de Données

```python
# ✅ Lookup simple
user = await session.get(User, user_id)

# ✅ Requête filtrée
result = await session.execute(
    select(ClothingItem)
    .where(ClothingItem.user_id == user_id)
    .where(ClothingItem.category == category)
    .order_by(ClothingItem.created_at.desc())
    .limit(50)  # Toujours limiter les listes !
)
items = result.scalars().all()

# ✅ Créer + récupérer l'ID généré
session.add(new_item)
await session.commit()
await session.refresh(new_item)  # Charge l'ID et created_at
return new_item

# ❌ Ne JAMAIS créer de session manuellement dans une route
# Toujours utiliser : session: AsyncSession = Depends(get_session)
```

---

## Après l'implémentation

1. Lancer : `cd backend && python -c "from app.main import app; print('Import OK')"`
2. Tester manuellement sur `http://localhost:8000/docs` (Swagger UI)
3. Écrire au moins un test dans `backend/tests/` (happy path minimum)
4. Si le contrat API a changé (nouveau endpoint, champ modifié) → mettre à jour `API_CHANGES.md`
5. Committer avec : `feat(backend): [description]` ou `fix(backend): [description]`
6. Mettre à jour `WORK_LOG.md`

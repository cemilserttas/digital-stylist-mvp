# API Changes — Digital Stylist MVP

Contrat inter-agents : tout changement de contrat API doit être documenté ici **avant** d'être implémenté.

Format :
```
## YYYY-MM-DD — Titre du changement
- Endpoint modifié / ajouté / supprimé
- Schéma request/response (diff)
- Impact frontend
- Impact backend
```

---

## 2026-03-21 — Pagination GET /wardrobe/{user_id}

**Endpoint** : `GET /wardrobe/{user_id}`

**Nouveaux query params** :
```
limit  int   default=100  min=1  max=500   — nombre max de résultats
offset int   default=0    min=0            — décalage (pour page suivante)
```

**Response** : inchangée (array de `ClothingItemRead`)

**Tri** : résultats triés par `created_at DESC` (le plus récent en premier)

**Impact frontend** : aucun — les valeurs par défaut maintiennent la compatibilité ascendante. Pour charger la page 2 : `?limit=100&offset=100`.

---

## 2026-03-21 — Affiliate links enrichis (frontend only)

**Fichier** : `frontend/lib/utils.ts` — `buildShopUrl()`

**Changement** : nouvelles marques mappées (New Balance, Puma, Massimo Dutti, Bershka, etc.), nouveau partenaire Veepee, support `NEXT_PUBLIC_ZALANDO_PARTNER_ID`.

**Nouvelles env vars Vercel** :
```
NEXT_PUBLIC_AMAZON_TAG          — Amazon Associates tag
NEXT_PUBLIC_ASOS_AFF_ID         — ASOS affiliate ID
NEXT_PUBLIC_ZALANDO_PARTNER_ID  — Zalando Partner Program ID
```

**Impact backend** : aucun.

---

## 2026-03-21 — Index DB sur user_id (ClothingItem, LinkClick, OutfitPlan)

**Migration** : `h9i0j1k2l3m4_add_user_id_indexes`

**Changement** : ajout d'index B-tree sur `user_id` dans les 3 tables.

**Impact API** : aucun (transparent, amélioration performance uniquement).

**Appliquer** : `cd backend && alembic upgrade head`

---

## 2026-03-21 — Gemini API timeout (backend only)

**Fichier** : `backend/app/services/ai_service.py`

**Changement** : ajout de `http_options=types.HttpOptions(timeout=Xms)` sur tous les appels `generate_content` :
- `analyze_clothing_image` : 45 000 ms (image upload plus lourd)
- `get_daily_suggestions`, `score_wardrobe`, `chat_with_stylist` : 30 000 ms

**Impact** : évite les blocages infinis en prod si Gemini ne répond pas.

---

## Pending changes (à documenter avant implémentation)

- [ ] Redis cache — `GET /suggestions/{user_id}` mise en cache 6h par user+météo
- [ ] WeatherAPI — remplacement Open-Meteo par WeatherAPI.com (prévisions 7j)
- [ ] Celery queue — `POST /wardrobe/upload` → réponse immédiate + job async

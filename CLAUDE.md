# Digital Stylist MVP — Project Brain

## Identité du projet

Styliste personnel IA francophone. Vision : **Assistant Proactif** qui parle à l'utilisateur le matin selon la météo, en connaissant déjà sa garde-robe.

- **Backend** : Render (FastAPI)
- **Frontend** : Vercel (Next.js)
- **Business** : Freemium + Affiliation 5-10% + Native Ads (ref: feedback.md §5)
- **Différenciation** : Pas un organisateur de vêtements — un assistant proactif contextuel

## Map du repo

```
backend/app/
  main.py           — FastAPI app, CORS, lifespan, /suggestions et /chat endpoints
  database.py       — AsyncEngine, sessionmaker, init_db()
  models.py         — User, ClothingItem, LinkClick (SQLModel) + Enums
  routers/
    users.py        — CRUD + login (prénom seulement, PAS de JWT encore)
    wardrobe.py     — upload image + analyse IA, CRUD garde-robe
    admin.py        — auth clé statique (ADMIN_KEY), gestion utilisateurs
    clothes.py      — DÉPRÉCIÉ, non inclus dans main.py, à supprimer
  services/
    ai_service.py   — Gemini 2.0 Flash : analyze_clothing_image, get_daily_suggestions, chat_with_stylist

frontend/
  app/page.tsx            — Page principale (635 lignes — DÉCOMPOSITION REQUISE)
  app/admin/page.tsx      — Panel admin
  components/             — ChatBot, ClothingDetail, StylePreferences, UploadSection,
                            UserForm, UserSettings, WardrobeGallery, WeatherAnimation
  lib/api.ts              — Source unique pour tous les appels Axios
  lib/types.ts            — Types TypeScript partagés (créer si absent)
  lib/utils.ts            — Utilitaires partagés (buildShopUrl, etc.) (créer si absent)
  hooks/useSoundEffects.ts
```

## Stack & versions

| Couche | Technologie |
|--------|-------------|
| Backend | FastAPI + SQLModel + SQLite + Gemini 2.0 Flash |
| Frontend | Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion + Axios |
| Déploiement | Render (backend) + Vercel (frontend) |

## Règles d'architecture (non négociables)

**Backend**
- Tous les nouveaux endpoints → Pydantic request model (jamais `body: dict`)
- Tous les nouveaux modèles → `models.py` uniquement
- Sessions DB → `Depends(get_session)` exclusivement, jamais manuellement
- Logs → `import logging; logger = logging.getLogger(__name__)` — zéro `print()`
- Upload → valider MIME (`content_type`) + extension + taille max 10MB + UUID filename

**Frontend**
- Tous les appels API → `lib/api.ts` uniquement (jamais axios direct dans les composants)
- Types partagés → `lib/types.ts` (créer si absent, importer partout)
- Utilitaires partagés → `lib/utils.ts` (ex: `buildShopUrl`)
- Composants : cible 150 lignes, split obligatoire si > 200 lignes
- Error boundaries obligatoires sur chaque section majeure (garde-robe, chatbot, suggestions)

## Conventions Backend

```python
import logging
logger = logging.getLogger(__name__)

# HTTPException : message French (user-facing) + log English
logger.warning("User %s not found", user_id)
raise HTTPException(status_code=404, detail="Utilisateur introuvable")

# Températures IA
# - analyze_clothing_image : 0.3
# - get_daily_suggestions  : 0.7
# - chat_with_stylist       : 0.8
```

## Conventions Frontend

```typescript
// Props interface exportée, au-dessus du composant
export interface MonComposantProps { userId: number; onDone: () => void }

// API call pattern
const [loading, setLoading] = useState(false)
try {
  setLoading(true)
  const data = await monAppelApi()
} catch (err) {
  console.error(err)
  // afficher message d'erreur en français à l'utilisateur
} finally {
  setLoading(false)
}
```

## Problèmes connus — Ordre de priorité

**P0 — SÉCURITÉ (bloque le déploiement propre)**
1. Pas de JWT — login par prénom seulement (`users.py /login`)
2. `ADMIN_KEY` default `"digital-stylist-admin-2024"` codé en dur (`admin.py:15`)
3. Pas de validation upload — type/taille (`wardrobe.py`)
4. `GEMINI_API_KEY` affiché en console au démarrage (`ai_service.py:16-18`)
5. `database.py` `echo=True` → logue toutes les requêtes SQL en prod

**P1 — STABILITÉ**
6. Pas de middleware d'erreur → stack traces exposées en HTTP 500
7. Pas d'error boundaries frontend
8. `/chat` et `/suggestions` acceptent `dict` brut (pas de validation Pydantic)
9. `buildShopUrl()` dupliqué dans `page.tsx` ET `ChatBot.tsx`

**P2 — MAINTENABILITÉ**
10. Aucun test (backend ou frontend)
11. Pas de migrations Alembic (schema créé via `create_all` au démarrage)
12. `page.tsx` fait 635 lignes — décomposition requise
13. `requirements.txt` sans versions épinglées

**P3 — INFRASTRUCTURE**
14. Pas de Docker / docker-compose
15. Pas de CI/CD pipeline
16. SQLite non adapté à la prod multi-instances

## Protocole de coordination multi-agents

Quand plusieurs agents travaillent en parallèle :
- **Agent Backend** : travaille uniquement dans `backend/` — jamais `frontend/`
- **Agent Frontend** : travaille uniquement dans `frontend/` — jamais `backend/`
- **Changement de contrat API** → documenter dans `API_CHANGES.md` AVANT d'implémenter
- **Travail complété** → chaque agent appende dans `WORK_LOG.md` (créer si absent)
- **Jamais** modifier `models.py` sans mettre à jour `frontend/lib/types.ts`

## Skills disponibles (slash commands)

| Commande | Rôle |
|----------|------|
| `/pm` | **Chef d'orchestre** — lit l'état, score le projet, dit quoi faire maintenant |
| `/audit` | Audit complet sécurité + qualité + performance |
| `/security-fix` | Traiter les vulnérabilités P0/P1 de façon atomique |
| `/refactor` | Décomposer les gros fichiers, éliminer la duplication |
| `/gen-tests` | Générer tests pytest (backend) + vitest (frontend) |
| `/backend` | Développer une feature backend selon les conventions |
| `/frontend` | Développer une feature frontend selon les conventions |
| `/new-feature` | Planifier + scaffolder une feature full-stack |
| `/pre-deploy` | Checklist pré-déploiement Render + Vercel |

> **Commencer toujours par `/pm`** pour savoir quoi faire en priorité.

## Commandes rapides

```bash
# Backend
cd backend && uvicorn app.main:app --reload
cd backend && python -m pytest
cd backend && python -c "from app.main import app; print('Import OK')"

# Frontend
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npx vitest
```

## Roadmap features (ref: feedback.md)

1. **Suppression de fond auto** — rembg ou remove.bg (réduire friction upload)
2. **Liens d'affiliation** — Amazon Associates / Awin (monétisation)
3. **Auth JWT** — python-jose + passlib (sécurité réelle)
4. **Push notifications** — Firebase Cloud Messaging + cron job météo matin
5. **PWA / Mobile** — manifest.json + service worker (Capacitor ou React Native Expo)

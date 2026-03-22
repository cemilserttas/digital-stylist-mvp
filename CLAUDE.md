# Digital Stylist MVP — Project Brain

> **Toute session Claude commence ici.** Ce fichier est la source de vérité absolue.
> Lis-le intégralement avant toute action. Il te donne le contexte, les règles, et la direction.

---

## 0 — Démarrage de Session (Rituel Obligatoire)

Avant de coder, répondre à ces 4 questions en lisant les fichiers indiqués :

```
1. OÙ EN EST LE PROJET ?    → Lire section "État actuel" ci-dessous
2. QU'EST-CE QUI A ÉTÉ FAIT ? → git log --oneline -10 + WORK_LOG.md (dernières 30 lignes)
3. QU'EST-CE QUI BLOQUE ?    → WORK_LOG.md section "Bloqueurs" + API_CHANGES.md
4. QUELLE EST LA PRIORITÉ ?  → Lancer /pm pour obtenir le plan d'action
```

**Règle d'or :** Ne jamais démarrer du code sans avoir répondu à ces 4 questions.
Si la réponse à l'une d'elles est inconnue, chercher avant d'agir.

---

## 1 — Identité & Vision

**Digital Stylist** — Styliste personnel IA francophone.
Vision : **Assistant Proactif** qui parle à l'utilisateur le matin selon la météo, en connaissant déjà sa garde-robe.

```
Ce que c'est  : Un assistant mode contextuel et proactif
Ce que ce n'est PAS : Un organisateur de vêtements passif

Utilisateur cible : 20-35 ans, actif, manque de temps, francophone (FR/BE/CH)
Promesse produit  : "Fini le stress du matin — ton look parfait en 30 secondes"
Différenciation   : Proactivité + météo + vrai styliste IA (pas des règles statiques)
```

**Stack déploiement :**
- Backend : Render (FastAPI + PostgreSQL)
- Frontend : Vercel (Next.js 16 + PWA installable)
- Business : Freemium €2.99/mois + Affiliation Amazon/Zalando/ASOS + Stripe

---

## 2 — Phase de Vie du Projet

```
PHASE ACTUELLE : PRÉ-LANCEMENT COMMERCIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Infrastructure : ✅ Complète (9/10)
Beta users     : ❓ (quelques testeurs, pas de croissance active)
MRR            : ❓ (à remplir)
Prochaine étape : Lancement public + acquisition premiers 500 users
```

**Ce que ça implique pour les priorités :**
- La dette technique est RÉSOLUE — ne pas y retourner sans raison
- Les features de rétention (streaks, emails) > les refactors techniques
- Lancer vite > construire parfait
- Chaque décision doit répondre à : "est-ce que ça aide à acquérir ou retenir des users ?"

**Prochaines phases prévues :**
```
LANCEMENT    → 0-500 users   → focus : activation (AHA moment < 5min) + ProductHunt
TRACTION     → 500-2K users  → focus : rétention D7 + conversion freemium→premium
CROISSANCE   → 2K-10K users  → focus : MRR €500+ + canaux acquisition + referral K>0.3
SCALE        → 10K+ users    → focus : Redis, Celery, B2B, mobile natif
```

---

## 3 — État Actuel — Score 9/10

**Infrastructure complète.** Tous les P0/P1/P2 résolus. Prêt pour le lancement.

### En prod (✅ implémenté)
| Catégorie | Ce qui tourne |
|-----------|--------------|
| Auth | JWT (python-jose + bcrypt) — Bearer tokens 30 jours |
| Base de données | PostgreSQL + Alembic (8 migrations) |
| Stockage | CDN S3/R2 via boto3 — images persistées |
| Business model | Freemium gates : 20 pièces / 1 sugg/j / 5 chats/j |
| Paiement | Stripe checkout + webhook + renouvellement auto |
| Push | Firebase FCM — cron 7h30 météo + Gemini + notification |
| Photos | rembg background removal automatique |
| Croissance | Referral REF_PRENOM_XXXX (3 parrainages = 1 mois Premium) |
| Social | Canvas 2D 1080×1920 partage Stories |
| Produit | Analytics garde-robe + AI score Gemini + OutfitCalendar 7j |
| Mobile | PWA installable + safe area iPhone + push browser |
| DevOps | Sentry + rate limiting + CORS restreint + Gemini timeout |
| Qualité | DB indexes + pagination + global error handler + 52 tests |
| CI/CD | GitHub Actions (backend pytest + frontend tsc + vitest + build) |

### Backlog priorisé (❌ pas encore fait)

**Priorité 1 — Rétention (avant toute acquisition)**
```
❌ Streak system + badges gamification   → D7 +5-10 pts estimé
❌ Emails transactionnels (Resend)       → welcome + D7 winback + upsell
❌ Analytics (PostHog)                  → sans data, on aveugle
```

**Priorité 2 — Activation (réduire Time-to-AHA)**
```
❌ Onboarding AHA immédiat               → suggestion AVANT upload (météo + profil)
❌ Empty states avec guidance            → réduire abandon post-inscription
```

**Priorité 3 — Revenue (optimiser conversion)**
```
❌ Export look PDF (gate Premium)        → valeur tangible + différenciation
❌ Occasion-based suggestions            → "entretien demain" → look Business Confident
❌ CTA paywall optimisés (A/B)           → "€0.10/jour" vs "Passer à Premium"
```

**Priorité 4 — Scale (quand > 2K users)**
```
❌ Redis cache suggestions (6h)          → -60% coûts Gemini
❌ Celery queue upload async             → réponse <200ms (vs 3-8s actuel)
❌ WeatherAPI 7j                         → prévisions détaillées + UV index
```

---

## 4 — Métriques Vivantes (à mettre à jour)

> Ces métriques guident toutes les décisions de priorité. Mets-les à jour à chaque session.

```
Date de dernière mise à jour : 2026-03-22

ACQUISITION
  Utilisateurs total        : ___
  Inscriptions/semaine      : ___
  Source principale         : ___

ACTIVATION
  % inscrits → 1er upload   : ___%  (cible : >70%)
  Time-to-AHA               : ___min (cible : <15min)

RÉTENTION
  D1                        : ___%  (cible : >40%)
  D7                        : ___%  (cible : >20%)
  D30                       : ___%  (cible : >10%)

REVENU
  MRR                       : €___
  Users premium             : ___  (taux conversion : __%)
  Revenue affiliation/mois  : €___

SANTÉ TECHNIQUE
  Tests backend passent     : ___/52
  Erreurs Sentry (7j)       : ___
  Score CI dernière run     : ✅/⚠️/❌
```

---

## 5 — Map du Repo

```
backend/app/
  main.py              — FastAPI app, CORS, rate limiting, /suggestions, /chat, error handler global
  database.py          — AsyncEngine (PostgreSQL prod / SQLite dev), sessionmaker, init_db()
  models.py            — User, ClothingItem, LinkClick, OutfitPlan (SQLModel) + Enums
  auth.py              — JWT create_access_token + get_current_user (Bearer)
  routers/
    users.py           — CRUD + login/create (bcrypt), referral, clicks history
    wardrobe.py        — upload (rembg + storage_service) + CRUD, analytics, AI score, pagination
    admin.py           — auth X-Admin-Key, users list (JOIN), stats analytics avancés
    outfit_calendar.py — CRUD planning tenues (OutfitPlan)
    push.py            — PUT/DELETE /push/{user_id}/token (FCM)
    billing.py         — Stripe checkout + webhook (checkout.completed, sub.deleted, renewal)
  services/
    ai_service.py      — Gemini 2.0 Flash : analyze_clothing, suggestions, score_wardrobe, chat
    storage_service.py — S3/R2 via boto3 (fallback disk local), UUID filenames
    push_service.py    — Firebase Admin SDK wrapper (graceful no-op sans creds)
    weather_cron.py    — APScheduler cron 7h30 : geocode → météo → Gemini → FCM
  alembic/versions/    — 8 migrations (initial → user_id indexes)
  tests/               — 52 tests pytest (users, wardrobe, auth, freemium, admin, billing)

frontend/
  app/
    page.tsx           — Page principale (~310 lignes) avec onglets Home/Wardrobe/Calendar/Settings
    layout.tsx         — SEO + OpenGraph + PWA manifest + viewport safe area + Sentry
    admin/page.tsx     — Panel admin : KPI, sparklines 14j, top marques, table users
  components/
    HomeTab.tsx        — Onglet accueil (suggestions météo + greeting Gemini)
    WardrobeTab.tsx    — Onglet garde-robe + wishlist
    ChatBot.tsx        — Chat styliste IA flottant (FAB + modal full-screen mobile)
    OutfitCalendar.tsx — Planning tenues 7 jours
    WardrobeScore.tsx  — Score IA garde-robe
    WardrobeStats.tsx  — Analytics couleurs/styles/saisons
    UpgradeModal.tsx   — Modal Stripe checkout monthly/yearly
    ErrorBoundary.tsx  — Error boundary React avec label prop
    UploadSection.tsx  — Upload image + capture caméra mobile
    UserForm.tsx       — Onboarding multi-étapes (prenom+mdp+morpho+genre+âge)
    UserSettings.tsx   — Paramètres + referral + push + logout
    PushNotificationSetup.tsx — Toggle FCM avec permission browser
    PWAInstallPrompt.tsx      — Bannière "Ajouter à l'écran d'accueil"
    StylePreferences.tsx      — Sélection style préféré post-onboarding
    ClothingDetail.tsx        — Modal détail vêtement + recommandations IA
    BottomNav.tsx             — Navigation bas de page mobile avec badges
    SuggestionsSection.tsx    — Cartes de tenues + share button
    WeatherAnimation.tsx      — Icône météo animée
  lib/
    api.ts             — Axios instance + JWT interceptor + 401 handler + toutes les fonctions API
    types.ts           — Types TypeScript partagés (User, ClothingItem, Suggestion, etc.)
    utils.ts           — buildShopUrl() routing affilié par marque (Amazon/Zalando/ASOS/Veepee)
    firebase.ts        — Firebase JS SDK init + requestPushToken()
    shareCard.ts       — Canvas 2D 1080×1920 pour partage Stories Instagram/TikTok
  hooks/
    useWeather.ts      — Géolocalisation + Open-Meteo + persist city localStorage
    useSoundEffects.ts — Sons UI (pop, chime)
  public/
    sw.js                    — Service worker PWA + push event handler
    firebase-messaging-sw.js — SW FCM background messages
    manifest.json            — PWA manifest (nom, icônes, display standalone)
```

---

## 6 — Stack & Versions

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend runtime | FastAPI + Uvicorn | 0.128 / 0.40 |
| ORM | SQLModel + SQLAlchemy async | 0.0.32 / 2.0 |
| DB prod | PostgreSQL + asyncpg | — / 0.30 |
| DB dev | SQLite + aiosqlite | — / 0.22 |
| Migrations | Alembic | 1.18 |
| Auth | python-jose (JWT HS256) + bcrypt | 3.5 / 4.3 |
| IA | Google Gemini 2.0 Flash (google-genai) | 1.68 |
| Stockage | boto3 (S3/R2) + rembg + onnxruntime | 1.38 / 2.0.65 |
| Paiement | Stripe | 11.4 |
| Push | Firebase Admin SDK | 6.7 |
| Monitoring | Sentry SDK [fastapi] | 2.27 |
| Rate limiting | slowapi | 0.1.9 |
| Scheduler | APScheduler | 3.10 |
| Frontend | Next.js + TypeScript + Tailwind CSS v4 | 16 / 5 / 4 |
| Animations | Framer Motion | — |
| HTTP client | Axios | — |
| Tests backend | pytest + pytest-asyncio | 9.0 / 1.3 |
| Tests frontend | Vitest + Playwright | — |
| CI/CD | GitHub Actions | — |
| Déploiement | Render (backend) + Vercel (frontend) | — |

---

## 7 — Règles d'Architecture (Non Négociables)

### Backend
- Tous les nouveaux endpoints → Pydantic request model (jamais `body: dict`)
- Tous les nouveaux modèles → `models.py` uniquement
- Sessions DB → `Depends(get_session)` exclusivement, jamais manuellement
- Auth → `Depends(get_current_user)` sur tout endpoint privé + vérifier `current_user.id == user_id`
- Logs → `import logging; logger = logging.getLogger(__name__)` — zéro `print()`
- Upload → valider MIME (`content_type`) + extension + taille max 10MB via `wardrobe.py`
- Fichiers → toujours passer par `storage_service.save_image()` (jamais écriture disque directe)
- Messages erreur HTTP : français (user-facing) + log anglais (debug)
- Nouveaux modèles SQLModel → créer migration Alembic (`alembic revision --autogenerate -m "description"`)

### Frontend
- Tous les appels API → `lib/api.ts` uniquement (jamais axios direct dans les composants)
- Types → `lib/types.ts` (importer partout, jamais redéfinir inline)
- Utilitaires partagés → `lib/utils.ts` (buildShopUrl, etc.)
- Composants : cible 150 lignes, split obligatoire si > 200 lignes
- Error boundaries sur chaque section majeure (utiliser `ErrorBoundary.tsx` existant)
- JWT → stocké dans `localStorage` clé `stylist_token`, appliqué par l'intercepteur Axios

### Multi-agents (sessions parallèles)
- Agent Backend : `backend/` uniquement — jamais `frontend/`
- Agent Frontend : `frontend/` uniquement — jamais `backend/`
- Changement contrat API → documenter dans `API_CHANGES.md` AVANT d'implémenter
- Travail complété → appender dans `WORK_LOG.md`
- Modifier `models.py` → mettre à jour `frontend/lib/types.ts` en même temps

---

## 8 — Conventions de Code

### Backend Python
```python
import logging
logger = logging.getLogger(__name__)

# Erreur HTTP : message FR user-facing + log EN debug
logger.warning("User %s not found", user_id)
raise HTTPException(status_code=404, detail="Utilisateur introuvable")

# Températures Gemini (respecter strictement)
# analyze_clothing_image : 0.3  (précision maximale)
# get_daily_suggestions  : 0.7  (créativité modérée)
# score_wardrobe         : 0.5  (équilibré)
# chat_with_stylist      : 0.8  (naturel, conversationnel)

# Timeout Gemini — OBLIGATOIRE sur tous les appels
# http_options=types.HttpOptions(timeout=45000)  # image (lourd)
# http_options=types.HttpOptions(timeout=30000)  # autres
```

### Frontend TypeScript
```typescript
// Props interface exportée, au-dessus du composant
export interface MonComposantProps { userId: number; onDone: () => void }

// API call pattern standard
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
try {
  setLoading(true); setError(null)
  const data = await monAppelApi()
} catch (err) {
  console.error(err)
  setError("Une erreur est survenue. Veuillez réessayer.")
} finally { setLoading(false) }

// Design system tokens (ne jamais coder les couleurs en dur)
// Fond principal      : bg-gray-950
// Cartes              : bg-white/5 border border-white/10 rounded-2xl
// Accent primaire     : purple-400 / pink-400
// Premium             : amber-400 / amber-500
// Glassmorphism       : backdrop-blur-xl bg-white/10 border border-white/20
// Gradient texte      : bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text
// Animations          : Framer Motion, duration 0.2-0.3, easeOut
```

### Conventions Git
```
Format commit : type(scope): description courte en français

Types : feat | fix | refactor | test | chore | docs | style | perf
Scope  : backend | frontend | auth | billing | push | ci | design

Exemples :
  feat(retention): ajouter système de streaks quotidiens
  fix(upload): corriger timeout rembg sur images > 5MB
  perf(db): ajouter index user_id sur LinkClick et OutfitPlan
  chore(ci): mettre à jour actions/setup-python@v5

Règles :
  - Maximum 72 caractères pour la ligne de sujet
  - Corps du commit si nécessaire (pourquoi, pas quoi)
  - Ne jamais commiter sans avoir vérifié : npm run build + pytest
```

---

## 9 — Antipatterns (Ne Jamais Faire)

```
❌ Coder sans avoir lu CLAUDE.md + WORK_LOG.md au démarrage
❌ Créer un nouveau fichier si on peut modifier un existant
❌ Utiliser print() dans le backend (→ logging)
❌ Écrire une couleur en dur dans un composant (→ tokens Tailwind)
❌ Modifier models.py sans créer une migration Alembic
❌ Modifier models.py sans mettre à jour lib/types.ts
❌ Appeler axios directement dans un composant (→ lib/api.ts)
❌ Redéfinir un type déjà dans lib/types.ts
❌ Commiter un build cassé (vérifier avant)
❌ Ajouter une feature de scale (Redis, Celery) avant d'avoir > 1K users
❌ Refactorer du code qui fonctionne sans raison business claire
❌ Optimiser prématurément (mesurer d'abord, optimiser ensuite)
❌ Déployer sans passer /pre-deploy
```

---

## 10 — Variables d'Environnement

### Backend (Render)
```env
GEMINI_API_KEY=...
ADMIN_KEY=...                      # min 16 chars
JWT_SECRET_KEY=...                 # min 32 chars aléatoires
DATABASE_URL=postgresql+asyncpg://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
FRONTEND_URL=https://digital-stylist-mvp.vercel.app
FIREBASE_CREDENTIALS_JSON=...      # JSON stringifié du service account Firebase
S3_ENDPOINT_URL=...                # R2 : https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_KEY=...
S3_BUCKET=digital-stylist-images
CDN_BASE_URL=https://cdn.digitalstylist.app
SENTRY_DSN=...
LOG_LEVEL=INFO
DB_ECHO=false
PUSH_CRON_HOUR=7
PUSH_CRON_MINUTE=30
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-app.onrender.com
NEXT_PUBLIC_AMAZON_TAG=digitalstylist-21
NEXT_PUBLIC_ASOS_AFF_ID=...
NEXT_PUBLIC_ZALANDO_PARTNER_ID=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
```

---

## 11 — Modèle Économique

| Flux | Mécanique | LTV estimé | Priorité action |
|------|-----------|------------|----------------|
| **Premium mensuel** | €2.99/mois Stripe | €35/an | Stripe price IDs configurés |
| **Premium annuel** | €24.99/an Stripe | €25/an (engagement fort) | Idem |
| **Amazon Associates** | `?tag=digitalstylist-21` | €3-8/user actif | Rejoindre Associates FR |
| **Zalando Partner** | `?pid=PARTNER_ID` | €5-12/user actif | Rejoindre Zalando Partner |
| **ASOS Affiliate** | `?affid=AFF_ID` | €4-10/user actif | Rejoindre ASOS Affiliate |
| **Referral** | 3 parrainages = 1 mois offert | Acquisition gratuite | ✅ En prod |

**Unit economics cible :**
```
LTV total (premium + affil)  : ~€60-90 par user premium
CAC max rentable (LTV/3)     : ~€20-30
Churn mensuel cible          : < 5% (durée vie > 20 mois)
Conversion free→premium cible: 5-8%
```

---

## 12 — Skills Disponibles (Slash Commands)

### Développement
| Commande | Rôle | Quand utiliser |
|----------|------|---------------|
| `/pm` | **Chef d'orchestre** — score 10 axes, plan priorisé, risques | Toujours en premier |
| `/audit` | Sécurité + qualité + performance + infra | Score < 7/10 ou avant déploiement |
| `/security-fix` | Vulnérabilités P0/P1 de façon atomique | Score Sécurité < 1.5/2 |
| `/refactor` | Décomposer gros fichiers, éliminer duplication | Fichier > 200 lignes |
| `/gen-tests` | Tests pytest (backend) + vitest (frontend) | Score Stabilité < 1/2 |
| `/backend` | Feature backend selon les conventions | Nouveau endpoint/service |
| `/frontend` | Feature frontend selon les conventions | Nouveau composant/page |
| `/new-feature` | Planifier + scaffolder feature full-stack | Roadmap produit |
| `/pre-deploy` | Checklist pré-déploiement Render + Vercel | Avant chaque push prod |

### Croissance & Business
| Commande | Rôle | Quand utiliser |
|----------|------|---------------|
| `/growth` | Stratégie AARRR : acquisition → revenu | Score ≥ 7/10, prêt à grandir |
| `/marketing` | Social media, SEO, ProductHunt, copy | Avant lancement public |
| `/business` | Freemium, affiliés, pricing, partenariats | Optimiser MRR / affiliation |

### Design & Expérience
| Commande | Rôle | Quand utiliser |
|----------|------|---------------|
| `/design` | Design system, brand, innovation produit | Incohérence visuelle détectée |
| `/ux` | Audit UX, friction points, A/B tests | Activation < 60% ou abandon élevé |
| `/retention` | Habit loops, push, streaks, anti-churn | D7 < 20% ou engagement faible |

> **Règle :** Toujours commencer par `/pm`. Il lit l'état, calcule le score, et prescrit le bon skill.

---

## 13 — Commandes Rapides

```bash
# Backend (depuis la racine du projet)
cd backend && uvicorn app.main:app --reload
cd backend && python -m pytest --ignore=tests/test_billing.py -v
cd backend && python -c "from app.main import app; print('Import OK')"
cd backend && alembic upgrade head
cd backend && alembic revision --autogenerate -m "description"

# Frontend
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npx tsc --noEmit
cd frontend && npm test
cd frontend && npm run test:e2e

# Vérifications de santé
grep -rn "print(" backend/app/   # → doit être vide
grep -rn ": any" frontend/src/  # → à réduire
git log --oneline -10            # → contexte récent
```

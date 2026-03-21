# WORK_LOG — Digital Stylist MVP

Journal de bord des sessions de développement.
Format : Score avant → Score après | Actions | Bloqueurs

---

## Session 2026-03-19
Score avant : 0/17 → Score après : 5/17

Actions effectuées :
- WORK_LOG.md créé ✅
- Fix 1 : ADMIN_KEY sans valeur par défaut (admin.py:15) ✅
- Fix 2 : Validation upload MIME + taille 10MB (wardrobe.py) ✅
- Fix 3 : database.py echo=False par défaut ✅
- Fix 4 : Tous les print() → logging (ai_service.py, admin.py, wardrobe.py) ✅
- Fix 5 : WeatherRequest + ChatRequest Pydantic models (main.py) ✅
- Logging global configuré dans main.py (LOG_LEVEL env var) ✅

Bloqueurs :
- FutureWarning: google.generativeai deprecated → migrer vers google.genai (P2, pas urgent)
- Skills .claude/commands/ non supportés en slash commands VSCode → utiliser @fichier

Prochaine session :
- /refactor Refactor 1 : créer frontend/lib/types.ts
- /refactor Refactor 2 : buildShopUrl tripliqué (3 fichiers!) → lib/utils.ts
- /security-fix Fix 6 : proxy clé admin côté serveur Next.js

---

## Session 2026-03-19 (backend)

- [2026-03-19] Dev B : Migration google.generativeai → google.genai (nouveau SDK) dans ai_service.py ✅
- [2026-03-19] Dev B : Fix N+1 query dans admin.py (GET /admin/users) → single LEFT JOIN + GROUP BY ✅
- [2026-03-19] Dev B : requirements.txt épinglé avec versions exactes (pip freeze), suppression google-generativeai ✅
- [2026-03-19] Dev B : Setup tests pytest (conftest + test_users + test_wardrobe + test_admin) — 20/20 passed ✅
- [2026-03-20] Dev B : Middleware erreur global (main.py) — catch-all Exception → 500 JSON, HTTPException pass-through ✅
- [2026-03-20] Dev B : Alembic migrations setup (env.py + alembic.ini + initial schema avec 3 tables) ✅
- [2026-03-20] Dev B : Créé app/auth.py — JWT stateless (python-jose, HS256, 30j, get_current_user dependency) ✅
- [2026-03-20] Dev B : JWT wiring — /create et /login retournent {user, token}, endpoints protégés par Bearer ✅
- [2026-03-20] Dev B : Endpoints protégés : PUT/DELETE /users/{id}, /clicks, /suggestions, /chat (user_id == token) ✅
- [2026-03-20] Dev B : Tests auth (test_auth.py) — token create/login, expired, invalid, deleted user, cross-user — 29/29 passed ✅
- [2026-03-20] Dev B : Docker (backend/Dockerfile + frontend/Dockerfile + docker-compose.yml) + GitHub Actions CI + .env.example ✅

---

## Session 2026-03-20 (Claude — JWT Auth complet)
Score avant : 15/17 → Score après : 17/17

- [2026-03-20] Claude : passlib==1.7.4 + bcrypt==4.3.0 ajoutés dans requirements.txt ✅
- [2026-03-20] Claude : User.password_hash (Optional[str], nullable) ajouté dans models.py ✅
- [2026-03-20] Claude : UserCreate.password (str) ajouté — séparé de UserBase (non exposé dans UserRead) ✅
- [2026-03-20] Claude : Alembic migration a1b2c3d4e5f6 — add password_hash column ✅
- [2026-03-20] Claude : /users/create → bcrypt.hash(password), /users/login → bcrypt.verify() ✅
- [2026-03-20] Claude : Compat ascendante : users sans password_hash peuvent login par prénom (logged warning) ✅
- [2026-03-20] Claude : UserForm.tsx — champ mot de passe ajouté (login + register step 1, min 4 chars) ✅
- [2026-03-20] Claude : Backend import OK + Next.js build réussi ✅

---

## Session 2026-03-21 (Claude — Infrastructure)

- [2026-03-21] Claude : Freemium gate /suggestions (1/jour) + /chat (5/jour) — models.py + Alembic migration f7a8b9c0d1e2 + main.py ✅
- [2026-03-21] Claude : PostgreSQL support — database.py lit DATABASE_URL, asyncpg driver auto-activé (postgres:// → postgresql+asyncpg://) ✅
- [2026-03-21] Claude : asyncpg==0.30.0 ajouté dans requirements.txt ✅
- [2026-03-21] Claude : CDN storage service — app/services/storage_service.py (S3/R2 via boto3, fallback disk local) ✅
- [2026-03-21] Claude : wardrobe.py — upload + delete passent par storage_service (plus d'écriture disque directe) ✅
- [2026-03-21] Claude : boto3==1.38.0 ajouté dans requirements.txt ✅
- [2026-03-21] Claude : tests/test_freemium.py — 10 tests gate freemium (suggestions + chat, limites, reset, premium bypass) ✅
- [2026-03-21] Claude : Frontend UX freemium — SuggestionsSection banner amber quand limitReached, ChatBot message inline 🔒 sur 429, page.tsx détecte 429 → setSuggestionLimitReached ✅
- [2026-03-21] Claude : getImageUrl fix — passe-à-travers si l'URL est déjà https:// (CDN) ✅
- [2026-03-21] Claude : admin.py cascade delete → storage_service.delete_image() (CDN-aware) ✅
- [2026-03-21] Claude : Push notifications (USP) — infrastructure complète :
  - models.py : fcm_token, push_notifications_enabled, push_city ✅
  - Alembic g8h9i0j1k2l3 : 3 nouvelles colonnes ✅
  - services/push_service.py : Firebase Admin SDK wrapper (graceful no-op sans creds) ✅
  - services/weather_cron.py : APScheduler cron 07h30 — météo Open-Meteo + Gemini + FCM ✅
  - routers/push.py : PUT/DELETE /push/{user_id}/token ✅
  - main.py : lifespan start/stop scheduler, include push router ✅
  - apscheduler==3.10.4 + firebase-admin==6.7.0 dans requirements.txt ✅
  - lib/firebase.ts : Firebase JS SDK init + requestPushToken() ✅
  - lib/api.ts : registerFcmToken + unregisterFcmToken ✅
  - components/PushNotificationSetup.tsx : bouton Activer/Désactiver notifs ✅
  - public/sw.js : push + notificationclick event handlers ✅
  - UserSettings.tsx : section Notifications avec PushNotificationSetup ✅
  - types.ts : push_notifications_enabled dans User ✅
  - .env.example (backend + frontend) : Firebase + APScheduler vars documentées ✅
  - firebase==^11.0.0 dans package.json ✅
- [2026-03-21] Claude : UserRead.push_notifications_enabled exposé dans l'API ✅
- [2026-03-21] Claude : useWeather.ts persist city → localStorage (stylist_weather) pour cron ✅
- [2026-03-21] Claude : firebase-messaging-sw.js (background FCM, importScripts compat) ✅
- [2026-03-21] Claude : firebase.ts envoie FIREBASE_CONFIG postMessage au SW via sw.register ✅
- [2026-03-21] Claude : UserData interface (UserSettings) += push_notifications_enabled ✅
- [2026-03-21] Claude : Partage Story Instagram — lib/shareCard.ts (Canvas 2D 1080×1920, aucune dépendance) ✅
- [2026-03-21] Claude : SuggestionsSection — bouton 📷 image-share à côté du texte-share ✅
- [2026-03-21] Claude : Stripe billing — infrastructure complète :
  - routers/billing.py : POST /billing/{user_id}/checkout + POST /billing/webhook ✅
  - Webhook handlers : checkout.completed → grant_premium, subscription.deleted, payment_failed ✅
  - stripe==11.4.1 dans requirements.txt ✅
  - backend/.env.example : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY/YEARLY ✅
  - main.py : billing router inclus ✅
  - GET /users/{user_id} endpoint (refresh après paiement) ✅
  - lib/api.ts : createCheckoutSession + getUser ✅
  - components/UpgradeModal.tsx : modal plan monthly/yearly, feature list, CTA Stripe ✅
  - page.tsx : bouton Crown header (free users), modal auto sur 429, useEffect ?payment=success → refresh user ✅

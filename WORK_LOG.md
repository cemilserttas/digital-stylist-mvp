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

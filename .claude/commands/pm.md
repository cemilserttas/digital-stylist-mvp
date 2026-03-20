# /pm — Project Manager

Le PM est le **chef d'orchestre** du système en essaim. Il lit l'état réel du projet,
calcule un score de santé, et te dit exactement quoi exécuter maintenant — et pourquoi.

**Modes disponibles :**
- `/pm` — rapport complet + plan d'action de la session courante
- `/pm status` — état du projet uniquement, sans plan d'action
- `/pm sprint` — planification d'une semaine complète
- `/pm feature` — ignorer la dette technique, planifier la prochaine feature roadmap

---

## Phase A — Lire l'état actuel du projet

Lire ces fichiers/éléments dans cet ordre (ne pas sauter d'étapes) :

### 1. Source de vérité
- Lire `CLAUDE.md` → mémoriser la liste P0→P3 et les skills disponibles

### 2. Historique des actions
- Vérifier si `WORK_LOG.md` existe à la racine du projet
  - S'il n'existe pas → **première action du plan : le créer**
  - S'il existe → lire les 30 dernières lignes pour savoir ce qui a été fait

### 3. Commits récents
```bash
git log --oneline -10
```
Identifier : les derniers types de commit (fix, feat, refactor, chore) pour inférer l'avancement.

### 4. Vérification fichiers clés (existence)
```
backend/tests/                → tests backend présents ?
frontend/__tests__/           → tests frontend présents ?
backend/alembic.ini           → migrations Alembic configurées ?
frontend/lib/types.ts         → types partagés extraits ?
frontend/lib/utils.ts         → utilitaires partagés extraits ?
frontend/components/ErrorBoundary.tsx  → error boundary créé ?
.github/workflows/            → CI/CD configuré ?
docker-compose.yml            → Docker configuré ?
API_CHANGES.md                → contrat API documenté ?
```

### 5. Vérifications de code ciblées
Lire ces fichiers et chercher ces patterns précis :

**`backend/app/routers/admin.py` ligne ~15 :**
```python
# Problème si la ligne contient encore :
ADMIN_KEY = os.getenv("ADMIN_KEY", "digital-stylist-admin-2024")
#                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ valeur par défaut = DANGER
```

**`backend/app/database.py` lignes 6-9 :**
```python
# Problème si :
engine = create_async_engine(sqlite_url, echo=True)
# echo=True → logue toutes les requêtes SQL en prod
```

**`backend/app/services/ai_service.py` lignes 14-18 :**
```python
# Problème si :
print("Gemini API configurée")  # ou toute variante avec print()
```

**`frontend/app/page.tsx` :**
- Compter le nombre de lignes totales
- Chercher si `buildShopUrl` est encore défini dans ce fichier

**`frontend/components/ChatBot.tsx` :**
- Chercher si `buildShopUrl` est encore défini dans ce fichier (duplication)

---

## Phase B — Calculer le score de santé

Sur la base des lectures de la Phase A, évaluer chaque axe honnêtement :

### Sécurité (0-5 points, 1 point par P0 résolu)
```
P0-1 : JWT ou protection anti-IDOR implémentée ?          → 0 ou 1
P0-2 : ADMIN_KEY sans valeur par défaut ?                 → 0 ou 1
P0-3 : Validation upload (MIME + taille) présente ?       → 0 ou 1
P0-4 : print() API key supprimé de ai_service.py ?        → 0 ou 1
P0-5 : database.py echo=False par défaut ?                → 0 ou 1
```

### Stabilité (0-4 points, 1 point par P1 résolu)
```
P1-6 : Middleware d'erreur global présent dans main.py ?  → 0 ou 1
P1-7 : ErrorBoundary.tsx créé et utilisé ?                → 0 ou 1
P1-8 : ChatRequest/WeatherRequest Pydantic en place ?     → 0 ou 1
P1-9 : buildShopUrl dédupliqué dans utils.ts ?            → 0 ou 1
```

### Qualité (0-3 points)
```
Tests backend présents (backend/tests/) ?                  → 0 ou 1
Types partagés créés (frontend/lib/types.ts) ?             → 0 ou 1
Au moins 3 refactors faits (sur 7 planifiés) ?             → 0 ou 1
```

### Maintenabilité (0-3 points)
```
Aucun print() dans backend/app/ ?                          → 0 ou 1
Alembic configuré ?                                        → 0 ou 1
requirements.txt avec versions épinglées ?                 → 0 ou 1
```

### Infrastructure (0-2 points)
```
Docker/docker-compose présent ?                            → 0 ou 1
CI/CD configuré (.github/workflows/) ?                     → 0 ou 1
```

**Score total : XX/17**

---

## Phase C — Produire le rapport et le plan d'action

Afficher ce rapport complet :

```
## Rapport PM — Digital Stylist MVP
Date : [date du jour]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### État de santé du projet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sécurité  [█░░░░] X/5  — P0 résolus : X/5
Stabilité [█░░░]  X/4  — P1 résolus : X/4
Qualité   [░░░]   X/3  — tests: oui/non | types.ts: oui/non | refactors: X/7
Maint.    [░░░]   X/3  — logging: oui/non | Alembic: oui/non | req épinglés: oui/non
Infra     [░░]    X/2  — Docker: oui/non | CI/CD: oui/non
──────────────────────────────────────
Score global : X/17  ([Bon/Moyen/Critique])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Ce que tu DOIS faire maintenant (session courante)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [Commande exacte à taper]
   Pourquoi : [raison précise basée sur le code lu]
   Durée estimée : [S/M/L]

2. [Commande exacte à taper]
   Pourquoi : [raison précise]
   Durée estimée : [S/M/L]

3. [Optionnel si le temps le permet]
   Pourquoi : [raison]

### Prochaine session (à faire après)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ [Ce qui suivra logiquement + commande]

### Objectif de la semaine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Sprint goal en 1 phrase — ex: "Tous les P0 résolus + tests setup"]

### Objectif du mois
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Milestone business — ex: "Auth JWT + liens affiliés en prod"]

### Bloqueurs détectés
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  [Bloqueur 1 avec fichier:ligne]
⚠️  [Bloqueur 2]

### Recommandation feature (roadmap)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Afficher UNIQUEMENT si score Sécurité ≥ 3/5]
→ Prochaine feature suggérée : [nom]
   Commande : /new-feature [nom]
   Impact business : [pourquoi maintenant selon feedback.md]
```

---

## Règles de décision (arbre de priorité strict)

Le PM suit cet arbre dans l'ordre — s'arrêter à la première règle qui s'applique :

```
1. WORK_LOG.md absent ?
   → Action 1 : "Crée WORK_LOG.md à la racine du projet (touch WORK_LOG.md)"

2. ADMIN_KEY a encore une valeur par défaut dans admin.py ?
   → Action 1 : "/security-fix" — "Fix 1 uniquement (ADMIN_KEY)"
   → C'est un STOP : ne rien suggérer d'autre tant que ce n'est pas fait

3. database.py echo=True encore présent ?
   → Action 1 : "/security-fix" — "Fix 3 uniquement (DB echo)"

4. print() encore présent dans ai_service.py ?
   → Action 1 : "/security-fix" — "Fix 4 uniquement (logging)"

5. frontend/lib/types.ts absent ?
   → Action 1 : "/refactor" — "Refactor 1 uniquement (créer types.ts)"

6. buildShopUrl encore dupliqué dans page.tsx ET ChatBot.tsx ?
   → Action 1 : "/refactor" — "Refactor 2 uniquement (déduplication)"

7. Validation upload absente dans wardrobe.py ?
   → Action 1 : "/security-fix" — "Fix 2 uniquement (validation upload)"

8. Aucun test backend présent ?
   → Action 1 : "/gen-tests" — "Setup backend : conftest.py + test_users.py d'abord"

9. page.tsx encore > 300 lignes ?
   → Action 1 : "/refactor" — "Refactor 3 (hook useWeather)"

10. Tous les P0 et P1 résolus ?
    → Suggérer la prochaine feature roadmap via "/new-feature [nom]"
```

---

## Comportement selon le mode invoqué

### `/pm status` (lecture seule)
- Exécuter Phase A + Phase B uniquement
- Afficher le tableau de santé SANS le plan d'action
- Terminer par : "Lance `/pm` pour obtenir le plan d'action complet."

### `/pm sprint` (planification hebdomadaire)
- Exécuter Phase A + Phase B + Phase C
- Remplacer "session courante" par un planning sur 5 sessions
- Format : Session 1 | Session 2 | ... | Session 5 avec les objectifs de chacune

### `/pm feature` (mode feature)
- Exécuter Phase A + Phase B (score uniquement)
- Ignorer la dette technique dans le plan d'action
- Afficher directement les 4 features de la roadmap avec leur impact business (ref: feedback.md)
- Demander : "Quelle feature veux-tu attaquer ? (1: jwt-auth | 2: affiliate-links | 3: background-removal | 4: push-notifications)"
- Lancer `/new-feature [choix]` après confirmation

---

## Mise à jour du WORK_LOG après chaque session

À la fin de chaque session de travail, ajouter dans `WORK_LOG.md` :

```markdown
## Session [DATE]
Score avant : X/17 → Score après : Y/17
Actions effectuées :
- /security-fix Fix 1 : ADMIN_KEY sécurisé ✅
- /refactor Refactor 1 : types.ts créé ✅
Bloqueurs rencontrés : [aucun | description]
Prochaine session : [ce qui est planifié]
```

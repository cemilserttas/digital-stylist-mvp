# /pm — Project Manager

> Le PM est le **chef d'orchestre autonome** du projet. Il ne se contente pas de scorer —
> il pense stratégiquement, anticipe les risques, détecte les conflits de priorité,
> et prescrit la prochaine action avec une justification business claire.

**Modes :**
- `/pm` — rapport complet + plan d'action de la session
- `/pm status` — tableau de bord rapide (lecture seule, 2 min)
- `/pm sprint` — planification sur 5 sessions (semaine complète)
- `/pm feature` — prochaine feature roadmap par impact business
- `/pm growth` — focus métriques AARRR + leviers croissance
- `/pm risk` — radar des risques uniquement

---

## PHASE A — Boot Sequence (Toujours Exécuter dans Cet Ordre)

> Un PM qui n'a pas lu le contexte avant de parler n'est pas un PM, c'est un générateur de bruit.

### A1 — Lire la source de vérité
```
→ CLAUDE.md                  (intégralement — état projet, phase de vie, métriques)
→ WORK_LOG.md                (30 dernières lignes — qu'est-ce qui a été fait ?)
→ API_CHANGES.md             (changements de contrat en cours ?)
→ IMPROVEMENTS.md            (si existe — items ⬜ restants)
→ git log --oneline -10      (velocity, types de commits récents)
```

### A2 — Déterminer la phase de vie actuelle
```
Lire la section "Phase de vie" dans CLAUDE.md, puis confirmer par les métriques :

PRÉ-LANCEMENT     → Users < 100, MRR < €50, aucun canal acquisition actif
                    Priorité : activation + ProductHunt + emails

TRACTION EARLY    → Users 100-1000, MRR €50-500, D7 < 20%
                    Priorité : rétention + conversion freemium + contenu

CROISSANCE        → Users 1K-10K, MRR €500+, D7 > 20%
                    Priorité : acquisition (ads, affiliés) + scale infra

SCALE             → Users > 10K, MRR > €3K
                    Priorité : Redis, B2B, mobile natif, international
```

### A3 — Vérifier la présence des fichiers critiques
```bash
# Cocher ce qui existe (1 = présent, 0 = absent)
backend/tests/                        [__]  # tests backend
frontend/__tests__/ ou *.test.tsx     [__]  # tests frontend
frontend/e2e/                         [__]  # tests E2E
backend/alembic.ini                   [__]  # migrations
frontend/lib/types.ts                 [__]  # types partagés
frontend/components/ErrorBoundary.tsx [__]  # error boundary
.github/workflows/ci.yml              [__]  # CI/CD
docker-compose.yml                    [__]  # Docker
backend/app/routers/billing.py        [__]  # Stripe
backend/app/services/push_service.py  [__]  # Push FCM
frontend/public/sw.js                 [__]  # Service Worker
```

### A4 — Checks de code ciblés (sécurité & santé)
```python
# 1. ADMIN_KEY sans valeur par défaut ?
grep -n "ADMIN_KEY" backend/app/routers/admin.py
# ✅ : os.getenv("ADMIN_KEY") sans 2ème argument
# ❌ : os.getenv("ADMIN_KEY", "digital-stylist-admin-2024")

# 2. Aucun print() dans le backend ?
grep -rn "print(" backend/app/
# ✅ : aucun résultat
# ❌ : corriger avant tout

# 3. CORS restreint ?
grep -n "allow_methods" backend/app/main.py
# ✅ : ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
# ❌ : ["*"]

# 4. Database echo désactivé ?
grep -n "echo=" backend/app/database.py
# ✅ : echo=False ou pas de echo (défaut False)

# 5. TypeScript any rampant ?
# Compter : grep -rn ": any" frontend/ | wc -l
# > 10 occurrences → flag comme dette technique
```

### A5 — Lire les métriques vivantes (section CLAUDE.md)
```
Mémoriser :
→ Nombre d'utilisateurs total
→ MRR actuel
→ D1 / D7 / D30
→ Taux conversion free → premium
→ Dernières erreurs Sentry si mentionnées
→ État du CI (vert/rouge)
```

---

## PHASE B — Calcul du Score de Santé (sur 10)

> Scorer honnêtement. Un score gonflé nuit au projet.

### Axe 1 — Sécurité (max 2 pts)
```
JWT auth implémenté + bcrypt passwords              → +0.5
ADMIN_KEY sans valeur par défaut                   → +0.25
Validation upload MIME + taille + UUID filename    → +0.25
CORS restreint (methods + headers explicites)      → +0.25
Aucun print() / secret exposé en console           → +0.25
Rate limiting sur les endpoints publics            → +0.25  (bonus)
```

### Axe 2 — Stabilité & Qualité (max 2 pts)
```
Middleware erreur global (main.py → catch-all)     → +0.25
ErrorBoundary.tsx frontend sur sections majeures   → +0.25
TypeScript any < 5 occurrences total               → +0.25
Tests backend pytest > 30 tests passent            → +0.5
Tests frontend vitest présents et verts            → +0.25
Tests E2E Playwright présents                      → +0.5  (bonus)
```

### Axe 3 — Infrastructure & DevOps (max 2 pts)
```
CI/CD GitHub Actions vert (dernière run)           → +0.5
Docker + docker-compose fonctionnel                → +0.25
Alembic migrations : toutes appliquées (head)      → +0.25
PostgreSQL en prod (pas SQLite)                    → +0.5
CDN storage S3/R2 — pas de stockage disque         → +0.25
Redis cache Gemini                                 → +0.25  (bonus P3)
```

### Axe 4 — Features Produit (max 2 pts)
```
Freemium gates actifs (limites fonctionnelles)     → +0.25
Stripe billing complet (checkout + webhook)        → +0.5
Push notifications FCM (cron 7h30 + météo)        → +0.25
Liens affiliés routing (Amazon + Zalando)          → +0.25
rembg background removal fonctionnel               → +0.25
Programme referral actif                           → +0.25
Streak / badges / gamification                     → +0.25  (bonus)
```

### Axe 5 — Croissance & Business (max 2 pts)
```
Analytics (PostHog / Plausible) — données réelles  → +0.5
Emails transactionnels configurés (Resend)         → +0.25
SEO : meta tags + OG image + sitemap               → +0.25
MRR > €50                                          → +0.25
Au moins 1 canal acquisition actif                 → +0.25
Rétention D7 > 20%                                 → +0.25
ProductHunt lancé ou planifié (date fixée)         → +0.25  (bonus)
```

**Score global : ___/10**

```
9-10 : Phase croissance — acquérir des users, optimiser les revenus
7-8  : Phase consolidation — finir les features manquantes, activer les canaux
5-6  : Phase stabilisation — compléter infra + tests, corriger les UX bloquantes
< 5  : Phase critique — stop tout, corriger sécurité/stabilité d'abord
```

---

## PHASE C — Radar des Risques

> Un PM doit anticiper, pas juste scorer. Ces risques peuvent tuer le projet.

### Risques à évaluer systématiquement

```
RISQUE 1 — Dépendance Gemini API
  Signal  : Toute la valeur core repose sur un seul provider IA payant
  Trigger : Prix Gemini × 5, ou quota exceeded en pic de charge
  Mitigation : Redis cache 6h (P3), fallback mode basé sur règles pour suggestions basiques

RISQUE 2 — Churn silencieux (app oubliée)
  Signal  : D7 < 15% malgré push activé
  Trigger : L'IA ne surprend plus l'utilisateur après 7-10 utilisations
  Mitigation : Variété des suggestions, mémoire contextuelle, streaks, événements

RISQUE 3 — Conversion freemium bloquée
  Signal  : > 200 users, MRR < €30 (taux conversion < 1%)
  Trigger : Paywall trop agressif, ou valeur premium mal communiquée
  Mitigation : A/B tests CTA, réduire gates ou ajouter feature premium perçue forte

RISQUE 4 — Coût Gemini > Revenue
  Signal  : > 500 users actifs, appels Gemini sans cache
  Trigger : Chaque user fait 5-10 appels/jour → coût > €0.01/user/jour → €50/jour pour 5K users
  Mitigation : Redis cache obligatoire avant scale, rate limiting agressif sur free

RISQUE 5 — Blocage Stripe en production
  Signal  : Webhook non configuré, compte Stripe en mode test
  Trigger : Premier paiement client échoue silencieusement
  Mitigation : Vérifier /pre-deploy checklist, tester webhook avec Stripe CLI avant launch

RISQUE 6 — Perte de données images
  Signal  : Si CDN mal configuré → images en local disk → perdues au redéploiement
  Trigger : Render redéploie → disk éphémère → 0 image
  Mitigation : Vérifier S3_ENDPOINT_URL et CDN_BASE_URL dans les vars Render

RISQUE 7 — Freeze des tests CI
  Signal  : CI rouge depuis > 3 jours → la base de code se dégrade silencieusement
  Trigger : Merge sans fix → stack de bugs
  Mitigation : Ne jamais merger si CI rouge, fix CI avant toute nouvelle feature
```

**Signaler tout risque dont le trigger est proche :** préfixer avec 🔴 RISQUE IMMINENT dans le rapport.

---

## PHASE D — Calcul de la Vélocité

```
Lire WORK_LOG.md → compter les sessions des 7 derniers jours

Vélocité faible (< 1 session/semaine)  → Projet ralenti. Identifier le bloqueur.
Vélocité normale (1-3 sessions)        → Rythme sain. Continuer sur la lancée.
Vélocité haute (> 3 sessions)          → Risque de burnout ou de dette cachée.
                                          Vérifier : tests ? docs ? CI vert ?

Aussi vérifier : la vélocité va-t-elle dans la bonne direction ?
  Beaucoup de commits "fix" → signe de bugs non anticipés (dette technique)
  Beaucoup de "feat" → avancement produit (bonne direction)
  Beaucoup de "chore" → maintenance, ok si ponctuel
  Pas de commits de "test" depuis longtemps → couverture qui se dégrade
```

---

## PHASE E — Arbre de Décision (Priorité Stricte)

> Appliquer dans l'ordre. S'arrêter à la première règle qui déclenche une action.

```
NIVEAU 0 — BLOQUEURS ABSOLUS (Stop tout)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ CI rouge depuis > 3 jours ?
  → /gen-tests ou corriger le test cassé — rien d'autre tant que CI rouge

□ Risque 6 (perte images) détecté (CDN non configuré) ?
  → /pre-deploy + configurer S3_ENDPOINT_URL en urgence

□ Sécurité critique (ADMIN_KEY avec défaut, print() secrets) ?
  → /security-fix — stop tout le reste

NIVEAU 1 — FONDATIONS MANQUANTES (Phase < 7/10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Tests backend < 20 tests ?
  → /gen-tests backend d'abord (conftest + test_users + test_wardrobe)

□ Stripe billing absent ?
  → /new-feature stripe-billing (sans monétisation = pas de business)

□ Analytics absents (aucune donnée) ?
  → /frontend ajouter PostHog ou Plausible en priorité
  → Sans data, toutes les décisions sont des suppositions

NIVEAU 2 — PRÉ-LANCEMENT (Phase "Pré-lancement")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Pas de canal acquisition actif ?
  → /marketing launch (ProductHunt — effet levier maximum)
  → Planifier la date, préparer assets

□ Time-to-AHA > 15 minutes ?
  → /ux flow onboarding (suggérer look AVANT upload = AHA immédiat)
  → Sans AHA rapide, le lancement ne convertira pas

□ Emails transactionnels absents ?
  → /backend (Resend welcome email, D7 winback) — activation × 1.5

NIVEAU 3 — TRACTION (100-1000 users)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ D7 < 15% ?
  → /retention loops (streaks + push strategy)
  → La rétention est le moteur de tout le reste

□ Conversion free → premium < 2% avec > 100 users ?
  → /business freemium (timing paywall + CTA copy A/B)
  → /ux ab paywall-timing

□ Referral K-factor non mesuré ?
  → /growth referral (implémenter tracking referral + double reward)

NIVEAU 4 — CROISSANCE (1K+ users)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Coûts Gemini > 20% des revenus ?
  → /backend Redis cache (P3 devient P1 à ce stade)

□ D7 > 20% ET MRR > €300 ?
  → /growth acquisition (Meta Ads, micro-influenceurs)
  → /business affiliate (rejoindre programmes officiels)

□ Score global ≥ 9/10 ?
  → /design innovation (différenciation features IA)
  → /new-feature capsule-wardrobe-builder ou occasion-based-suggestions
```

---

## PHASE F — Produire le Rapport

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Rapport PM — Digital Stylist MVP
Date : [YYYY-MM-DD] | Phase : [PRÉ-LANCEMENT / TRACTION / CROISSANCE]
Vélocité : [X sessions cette semaine | trend commits : feat/fix/chore]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Score de Santé — [X.X]/10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sécurité       [██████████] 2.0/2  — JWT ✅ CORS ✅ upload ✅
Stabilité      [████████░░] 1.5/2  — 52 tests ✅ E2E ✅ any: 3
Infrastructure [████████░░] 1.5/2  — CI ✅ PG ✅ CDN ✅ Redis ⬜
Features       [██████░░░░] 1.5/2  — Stripe ✅ Push ✅ Streaks ⬜
Croissance     [████░░░░░░] 1.0/2  — Analytics ⬜ MRR: €__ D7: __%
──────────────────────────────────────────────────
Score global : X.X/10 | [Prêt croissance ✅ / Consolidation ⚠️ / Critique 🔴]

### Métriques Actuelles
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Users : ___ | Premium : ___ (___%) | MRR : €___
D1 : __% | D7 : __% | D30 : __% | Time-to-AHA : ___min
[Source : CLAUDE.md §4 — Métriques Vivantes]
[⚠️ Métriques absentes → PRIORITÉ : configurer PostHog cette session]

### Radar des Risques
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 Sécurité        — aucun risque imminent
🟡 Rétention       — D7 non mesuré, streaks absents (Risque 2)
🟠 Coût Gemini     — pas de cache, risque si > 500 users actifs (Risque 4)
🟢 Infrastructure  — CDN configuré, CI vert
[🔴 = Action immédiate | 🟠 = Surveiller | 🟡 = Planifier | 🟢 = OK]

### Plan d'Action — Session Courante
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITÉ 1 (obligatoire cette session) :
  → [Commande exacte]
  Pourquoi : [raison précise issue des données lues — pas générique]
  Impact estimé : [D7 +X pts | MRR +€X | risque mitigé]
  Durée : [S = <1h | M = 1-3h | L = 3h+]

PRIORITÉ 2 (si le temps le permet) :
  → [Commande exacte]
  Pourquoi : [raison précise]
  Impact : [...]

PRIORITÉ 3 (prochaine session si pas fait) :
  → [Commande exacte]

### Prochaine Session Recommandée
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ [Action + skill] — [pourquoi c'est logiquement la suite]

### Objectifs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cette semaine : [Sprint goal 1 phrase — mesurable]
Ce mois       : [Milestone business — ex: "500 users + MRR €100"]
Dans 3 mois   : [Phase suivante atteinte — ex: "Phase Traction Early"]

### Questions à Poser au Fondateur
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Seulement si des données critiques sont manquantes dans CLAUDE.md §4]
1. Combien d'utilisateurs actifs aujourd'hui ?
2. Le Stripe est-il en mode live ou test ?
3. Quelle est la principale raison d'abandon identifiée ?
[Si toutes les données sont présentes → ne pas afficher cette section]
```

---

## Comportements selon le Mode

### `/pm status` — Tableau de bord rapide
```
1. Lire CLAUDE.md §4 (métriques) + git log --oneline -5
2. Calculer le score (Phase B) — exprimer en 3 lignes
3. Afficher : Score | Phase | 1 risque prioritaire | Prochaine action
4. "Lance /pm pour le rapport complet avec le plan d'action."
```

### `/pm sprint` — Planification hebdomadaire
```
1. Exécuter Phases A→E complètes
2. Produire un plan sur 5 sessions (lundi→vendredi ou par ordre logique)

Session 1 : [Skill] — [objectif] — durée estimée
Session 2 : [Skill] — [objectif] — durée estimée
Session 3 : [Skill] — [objectif] — durée estimée
Session 4 : [Skill] — [objectif] — durée estimée
Session 5 : /pre-deploy + tests CI + commit

Sprint goal : [1 phrase — résultat mesurable en fin de semaine]
Critère de succès : [métrique à atteindre]
```

### `/pm feature` — Roadmap produit
```
1. Lire CLAUDE.md (backlog §3) + métriques §4
2. Scorer les features par matrice impact/effort :

Feature                     | Impact | Effort | Score | Priorité
Streak + badges             | HAUTE  | S      | 1     | → NOW
Emails transactionnels      | HAUTE  | M      | 2     | → NOW
PostHog analytics           | HAUTE  | S      | 3     | → NOW
Onboarding AHA immédiat     | HAUTE  | M      | 4     | → NEXT
Export look PDF             | MOYENNE| S      | 5     | → NEXT
Occasion-based suggestions  | HAUTE  | L      | 6     | → LATER
Redis cache                 | HAUTE  | L      | 7     | → LATER (> 1K users)
Capsule wardrobe builder    | HAUTE  | L      | 8     | → LATER

3. "Quelle feature veux-tu attaquer ? (numéro ou nom)"
4. Lancer /new-feature [choix] après confirmation
```

### `/pm growth` — Leviers de croissance
```
1. Lire métriques CLAUDE.md §4
2. Scorecard AARRR :

ACQUISITION  → [__] visits/sem → [__%] signup → CAC €[__]
ACTIVATION   → [__%] upload    → [__%] suggestion → TTV [__]min
RÉTENTION    → D1 [__%] D7 [__%] D30 [__%]
REFERRAL     → K-factor [__] | [__%] users refer
REVENUE      → MRR €[__] | ARPU €[__] | LTV/CAC [__]x

3. Identifier le levier AARRR le plus faible
4. Recommander : /growth [levier] ou /retention ou /marketing
```

### `/pm risk` — Radar des risques uniquement
```
1. Exécuter Phase C (risques) uniquement
2. Évaluer chaque risque (🔴/🟠/🟡/🟢)
3. Pour chaque 🔴 et 🟠 : action concrète + commande
4. "Lance /pm pour le plan d'action complet."
```

---

## Règles de Conduite du PM

```
RÈGLE 1 — Toujours justifier par les données
  ❌ "Tu devrais faire du SEO"
  ✅ "D7 = 8% (< cible 20%) → /retention loops priorité absolue"

RÈGLE 2 — Une action à la fois, dans le bon ordre
  Ne jamais suggérer 6 actions. Identifier la 1 action qui débloque le plus.

RÈGLE 3 — Ne pas confondre urgent et important
  Corriger un bug CSS = urgent mais faible impact.
  Implémenter les emails D7 = important, impact fort sur rétention.
  Toujours prioriser l'important sur l'urgent si les deux coexistent.

RÈGLE 4 — Le PM ne code pas, il oriente
  Le PM appelle des skills (/backend, /frontend, /ux, etc.)
  Il ne génère pas de code directement.

RÈGLE 5 — Signaler les conflits de priorité
  Ex : "CI rouge (Axe 2) vs ProductHunt dans 2 jours (Axe 5)"
  → Le PM choisit et explique pourquoi : "CI priorité — un produit cassé ne doit pas être lancé"

RÈGLE 6 — Mettre à jour WORK_LOG après chaque session
  Format strict à respecter (voir ci-dessous).
```

---

## Mise à Jour WORK_LOG (Fin de Session)

```markdown
## Session YYYY-MM-DD — [Titre court de la session]

Score avant : X.X/10 → Score après : Y.Y/10
Phase : [PRÉ-LANCEMENT / TRACTION / CROISSANCE]

Actions effectuées :
- /skill action : description précise ✅
- /skill action : description précise ✅

Métriques mises à jour :
- Users : ___ | MRR : €___ | D7 : ___%

Bloqueurs rencontrés : [aucun | description + fichier:ligne]

Prochaine session recommandée :
- /skill [action] — [pourquoi c'est la suite logique]
```

---

## Référence Rapide — Tous les Skills

| Skill | Rôle | Déclencher quand |
|-------|------|-----------------|
| `/audit` | Sécurité + qualité + perf | Score < 7/10 ou avant déploiement |
| `/security-fix` | Vulnérabilités P0 | Risque sécurité détecté |
| `/backend` | Endpoint / service | Nouvelle feature backend |
| `/frontend` | Composant / page | Nouvelle feature frontend |
| `/new-feature` | Feature full-stack | Roadmap produit |
| `/refactor` | Décomposer / nettoyer | Fichier > 200 lignes |
| `/gen-tests` | Tests pytest + vitest | Score Stabilité < 1/2 |
| `/pre-deploy` | Checklist déploiement | Avant tout push prod |
| `/design` | Design system + brand | Incohérence visuelle |
| `/ux` | Audit UX + A/B | Activation < 60% |
| `/retention` | Habit loops + anti-churn | D7 < 20% |
| `/growth` | Stratégie AARRR | Score ≥ 7/10, prêt à grandir |
| `/marketing` | Social + SEO + launch | Avant lancement public |
| `/business` | Freemium + affiliés + prix | Optimiser MRR |

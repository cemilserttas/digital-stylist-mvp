# /new-feature [nom] — Planifier une Feature Full-Stack

Usage : `/new-feature jwt-auth` | `/new-feature affiliate-links` | `/new-feature background-removal`

Lis `CLAUDE.md` (vision, roadmap features) et `feedback.md` (contexte business) avant de commencer.
**Ce skill produit un plan et demande confirmation AVANT d'implémenter quoi que ce soit.**

---

## Étape 1 — Clarification (poser ces questions si non précisé)

1. Quel est le problème utilisateur que cette feature résout ?
2. Est-ce une nouvelle page, un nouvel endpoint, ou une amélioration d'existant ?
3. Nécessite-t-elle une nouvelle table ou colonne DB ?
4. Implique-t-elle Google Gemini ?
5. Y a-t-il un angle de monétisation ? (ref: feedback.md §3 et §5)

---

## Étape 2 — Analyse d'impact

**Backend :**
- Nouveaux modèles dans `models.py` ?
- Nouveau router ou ajout dans un existant ?
- Le contrat API change-t-il ? (breaking change ?)
- Nouvelles dépendances dans `requirements.txt` ?

**Frontend :**
- Nouvelle page (`app/nouveau/page.tsx`) ou nouveau composant ?
- Nouveaux types dans `lib/types.ts` ?
- Nouvelles fonctions dans `lib/api.ts` ?
- Impact sur `page.tsx` ? (si oui → extraction recommandée via `/refactor`)

**Base de données :**
- Nouvelle table → migration Alembic obligatoire
- Nouvelle colonne → migration Alembic obligatoire
- Pas de changement schema → noter explicitement

---

## Étape 3 — Plan structuré

Présenter le plan dans ce format :

```
### Feature : [nom]
Complexité estimée : S / M / L / XL
Breaking changes : Oui / Non — [détail si oui]

#### Fichiers à créer
- backend/app/routers/nouveau.py  — [rôle]
- frontend/components/NouveauComp.tsx  — [rôle]

#### Fichiers à modifier
- backend/app/models.py  — [ce qui change]
- frontend/lib/api.ts  — [ce qui change]
- frontend/lib/types.ts  — [nouveaux types]

#### Ordre d'implémentation
1. Modèles Pydantic/SQLModel dans models.py
2. Endpoint(s) backend
3. Types TypeScript dans lib/types.ts
4. Fonctions API dans lib/api.ts
5. Composant(s) frontend
6. Intégration dans page.tsx si nécessaire
7. Tests (au minimum happy path)

#### Risques & dépendances
- [Risque 1]
- [Dépend de : X à faire avant]
```

---

## ÉTAPE 4 — GATE DE CONFIRMATION

**Après avoir présenté le plan, dire :**

> "Voici le plan complet. Veux-tu que je commence l'implémentation ? (oui/non)"

**Ne pas écrire une seule ligne de code avant que l'utilisateur confirme.**

---

## Étape 5 — Scaffold (après confirmation uniquement)

1. Implémenter le backend en suivant toutes les conventions de `/backend`
2. Implémenter le frontend en suivant toutes les conventions de `/frontend`
3. Vérifier `python -c "from app.main import app"` + `npm run build`
4. Écrire au moins un test par nouvel endpoint
5. Mettre à jour `API_CHANGES.md` si le contrat a changé
6. Mettre à jour `WORK_LOG.md`
7. Commit : `feat: [description de la feature]`

---

## Templates de Features Pré-analysées

### `/new-feature jwt-auth`

**Contexte :** P0 — Login par prénom uniquement est une faille de sécurité majeure.

**Backend :**
```
Nouvelles dépendances : python-jose[cryptography], passlib[bcrypt]
Nouveau champ : User.password_hash: Optional[str] (migration Alembic)
Nouveau endpoint : POST /auth/token → retourne JWT
Nouveau dependency : verify_token(token: str = Depends(oauth2_scheme))
Protéger tous les endpoints users/ et wardrobe/ avec ce dependency
Garder /users/create et /auth/token sans auth (endpoints publics)
```

**Frontend :**
```
Stocker le JWT dans httpOnly cookie (jamais localStorage)
Ajouter header Authorization: Bearer <token> dans lib/api.ts via intercepteur Axios
Gérer les 401 → redirection vers le login
```

---

### `/new-feature affiliate-links`

**Contexte :** feedback.md §3 — Remplacer les liens Google "I'm feeling lucky" par des liens d'affiliation (5-10% commission).

**Backend :**
```
Nouvelle config dans .env : AFFILIATE_ID_AMAZON, AFFILIATE_ID_AWIN
ai_service.py : modifier les prompts pour retourner des marques/catégories structurées
Nouveau endpoint ou modification de /suggestions : enrichir les liens avec les IDs affilié
```

**Frontend :**
```
lib/utils.ts : mettre à jour buildShopUrl() pour utiliser les liens affiliés
Ajouter tracking des clics (déjà partiellement implémenté via /users/{id}/clicks)
```

---

### `/new-feature background-removal`

**Contexte :** feedback.md §1 — Réduire la friction upload : les photos doivent être propres automatiquement.

**Backend :**
```
Option A (gratuite) : pip install rembg — traitement local
Option B (payante) : remove.bg API — REMOVE_BG_API_KEY dans .env
Étape ajoutée dans wardrobe.py entre la sauvegarde du fichier et l'analyse Gemini
Stocker l'image originale ET l'image sans fond (deux champs image_path)
```

**Frontend :**
```
UploadSection.tsx : afficher un avant/après pendant le traitement
Nouvel état : isRemovingBackground (loading state dédié)
```

---

### `/new-feature push-notifications`

**Contexte :** feedback.md §4 — Notifier l'utilisateur le matin avec la tenue suggérée.

**Backend :**
```
Nouvelles dépendances : firebase-admin
Nouveau modèle : UserDevice (user_id, device_token, platform)
Nouveau endpoint : POST /users/{id}/device — enregistrer le token FCM
Nouveau script : backend/scripts/morning_push.py (cron job Render)
```

**Frontend / Mobile :**
```
PWA avec manifest.json + service worker (étape 1)
Demander permission notifications dans useEffect au login
Envoyer le device_token via l'API
Capacitor pour wrapper en app native (étape 2)
```

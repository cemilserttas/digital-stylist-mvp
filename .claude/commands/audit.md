# /audit — Audit Complet du Projet

Lis `CLAUDE.md` en premier pour le contexte du projet et la liste P0 des problèmes connus.
Cet audit produit un rapport priorisé : sécurité, qualité de code, performance, infrastructure.

---

## Phase 1 : Audit Sécurité

Examine ces fichiers en cherchant les vulnérabilités ci-dessous :

**`backend/app/routers/admin.py`**
- Clé admin par défaut codée en dur (cherche la valeur par défaut dans `os.getenv`)
- Absence de rate limiting sur les endpoints `/admin/*`
- Logging des tentatives d'auth échouées

**`backend/app/routers/users.py`**
- Mécanisme d'auth : login par prénom uniquement (IDOR possible)
- Vérification ownership : un user peut-il accéder aux données d'un autre ?
- Absence de validation sur les champs de création

**`backend/app/routers/wardrobe.py`**
- Validation upload : taille max, MIME type depuis `content_type`, extension
- Path traversal : le filename est-il sanitisé ? UUID utilisé ?

**`backend/app/main.py`**
- Configuration CORS : `allow_methods=["*"]` et `allow_headers=["*"]` ?
- Origins hardcodées vs variables d'environnement

**`backend/app/database.py`**
- `echo=True` → logue toutes les requêtes SQL (données sensibles en prod)

**`backend/app/services/ai_service.py`**
- Affichage de la clé API ou confirmation en console (`print()`)
- Vecteurs d'injection de prompt dans les entrées utilisateur

**`frontend/app/admin/page.tsx`**
- Clé admin stockée dans le state React (visible dans DevTools)
- Clé envoyée en header plain text côté client

Pour chaque vulnérabilité trouvée, reporter :
- Nom de la vulnérabilité
- **Sévérité** : CRITIQUE / ÉLEVÉE / MOYENNE / FAIBLE
- Localisation exacte : `fichier:ligne`
- Correction recommandée (1-2 phrases)

---

## Phase 2 : Audit Qualité de Code

**Backend**
```bash
# Chercher les print() restants
grep -rn "print(" backend/app/

# Chercher les bare dict params dans les routes
grep -n "dict\b" backend/app/routers/

# Vérifier les fonctions sans type hints
grep -n "^async def\|^def " backend/app/routers/
```

Vérifier manuellement :
- Composants / fichiers dépassant 200 lignes (compter les lignes)
- Code dupliqué entre fichiers (ex: `buildShopUrl` dans `page.tsx` et `ChatBot.tsx`)
- Utilisation de `any` en TypeScript (`grep -rn ": any\b" frontend/`)
- Fonctions Python sans type hints dans les routes

**Frontend**
- Lire `frontend/app/page.tsx` → signaler si > 200 lignes et identifier les blocs extractibles
- Lire `frontend/components/*.tsx` → signaler tous ceux dépassant 200 lignes
- Chercher les `console.log()` oubliés en prod

---

## Phase 3 : Audit Performance

- **N+1 queries** : `admin.py` — list_all_users() fait-elle une sous-requête par user pour compter ses items ?
- **Index manquants** : `models.py` — les clés étrangères (`user_id`) ont-elles `index=True` ?
- **I/O synchrone** dans routes async : `wardrobe.py` — `shutil.copyfileobj()` bloque-t-il l'event loop ?
- **Timeout absent** : les appels `model.generate_content()` dans `ai_service.py` ont-ils un timeout ?
- **Pagination absente** : les endpoints retournant des listes ont-ils un `limit/offset` ?

---

## Phase 4 : Audit Infrastructure

Vérifier la présence/absence de chaque élément :

```
[ ] backend/Dockerfile
[ ] docker-compose.yml (à la racine)
[ ] .github/workflows/ (CI/CD)
[ ] backend/alembic.ini + backend/alembic/ (migrations)
[ ] backend/pyproject.toml avec config pytest
[ ] frontend/vitest.config.ts
[ ] requirements.txt avec versions épinglées (ex: fastapi==0.115.0)
[ ] frontend/lib/types.ts (types partagés)
[ ] frontend/lib/utils.ts (utilitaires partagés)
[ ] API_CHANGES.md
[ ] WORK_LOG.md
```

---

## Format du rapport de sortie

```
## RAPPORT D'AUDIT — Digital Stylist MVP
Date : [aujourd'hui]

### CRITIQUE (bloque le déploiement)
- [FICHIER:LIGNE] Nom du problème → correction recommandée

### ÉLEVÉE (à corriger sous 1 semaine)
- ...

### MOYENNE (à corriger sous 1 mois)
- ...

### FAIBLE (améliorations souhaitables)
- ...

### Infrastructure — Éléments manquants
- [ ] ...

### Ordre de correction recommandé
1. ...
```

Croiser avec la section "Problèmes connus" de `CLAUDE.md` pour confirmer que tous les P0 sont couverts.

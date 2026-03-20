# /pre-deploy — Checklist Pré-Déploiement

À exécuter avant **chaque** déploiement sur Render (backend) ou Vercel (frontend).
Cette checklist est binaire : **PASS ou FAIL**. Ne pas déployer si un item CRITIQUE est FAIL.

---

## BLOQUANTS — Ne pas déployer si un seul de ces items est FAIL

### Sécurité
- [ ] `ADMIN_KEY` configuré dans les variables d'environnement Render (pas la valeur par défaut)
  - Vérifier : `echo $ADMIN_KEY` sur Render → doit être ≠ `"digital-stylist-admin-2024"`
- [ ] `GEMINI_API_KEY` dans les env vars Render — PAS dans un fichier commité
  - Vérifier : `git log --all -- backend/.env` → doit être vide (jamais commité)
- [ ] `backend/.env` absent du dépôt git
  - Vérifier : `git ls-files backend/.env` → aucune sortie
- [ ] `database.py` : `echo=False` par défaut en production
  - Vérifier dans le code : `os.getenv("DB_ECHO", "false")` sans valeur par défaut `True`
- [ ] Validation upload présente (taille + MIME) dans `wardrobe.py`
  - Vérifier : chercher `content_type` et `MAX_FILE_SIZE` dans le code
- [ ] Aucun secret avec le préfixe `NEXT_PUBLIC_` sur Vercel (ces variables sont exposées au navigateur)

### Build
- [ ] `cd backend && python -c "from app.main import app; print('Import OK')"` → exit 0
- [ ] `cd frontend && npm run build` → exit 0, aucune erreur TypeScript
- [ ] `cd frontend && npm run lint` → 0 erreurs (warnings acceptables)

### URLs
- [ ] `NEXT_PUBLIC_API_URL` sur Vercel pointe vers le backend Render (pas `localhost`)
- [ ] Les CORS origins dans `main.py` incluent le domaine Vercel de production

### Base de données
- [ ] `stylist.db` absent du dépôt git : `git ls-files backend/stylist.db` → vide
- [ ] `uploads/` absent du dépôt git : `git ls-files backend/uploads/` → vide
- [ ] Sur Render : **disque persistant** configuré pour `/opt/render/project/src/backend/uploads/`
  - Sans disque persistant, les uploads sont perdus à chaque déploiement !

---

## IMPORTANTS — Traiter avant la prochaine release si FAIL

- [ ] `cd backend && python -m pytest` → 0 tests échoués (ou noter que les tests n'existent pas encore)
- [ ] Aucun `console.log()` laissé dans les composants frontend
  - Vérifier : `grep -rn "console.log" frontend/app/ frontend/components/`
- [ ] Aucun `TODO(security)` ou `FIXME(auth)` dans le code à déployer
- [ ] `requirements.txt` avec versions épinglées (éviter les surprises de build)
- [ ] `API_CHANGES.md` à jour si le contrat API a changé dans ce déploiement

---

## Vérification post-déploiement — 5 smoke tests manuels

Exécuter ces tests après chaque déploiement pour confirmer que tout fonctionne en production.

**Setup :** Ouvrir l'URL Vercel de production dans un onglet privé.

| # | Test | Résultat attendu |
|---|------|-----------------|
| 1 | Créer un utilisateur "TestDeploy" | L'utilisateur apparaît dans le panel admin |
| 2 | Uploader une photo de vêtement (JPEG < 1Mo) | Analyse IA retourne type + couleur + suggestions |
| 3 | Accéder aux suggestions météo | 3 tenues suggérées avec la météo locale |
| 4 | Envoyer un message dans le chatbot | Réponse textuelle + éventuellement des produits |
| 5 | Supprimer l'utilisateur "TestDeploy" depuis l'admin | Suppression en cascade OK, plus visible dans la liste |

**Si un test échoue** → rollback immédiat (voir section ci-dessous).

---

## Rollback

**Backend (Render) :**
1. Dashboard Render → Service → "Deploys"
2. Cliquer sur le déploiement précédent → "Rollback to this deploy"
3. Durée estimée : ~2-3 minutes

**Frontend (Vercel) :**
```bash
vercel rollback [deployment-url]
# ou via le Dashboard Vercel : Deployments → "..." → "Promote to Production"
```

**Base de données :**
Si le schema a changé (Alembic migration) et que le rollback est nécessaire :
- Exécuter la migration de downgrade : `alembic downgrade -1`
- Si pas d'Alembic encore : restaurer manuellement la sauvegarde SQLite

---

## Notes de déploiement à consigner

Après chaque déploiement réussi, ajouter une ligne dans `WORK_LOG.md` :

```
## Déploiement [DATE]
- Version : [numéro de commit ou tag]
- Features déployées : [liste]
- Migrations DB : oui / non
- Tous les smoke tests : ✅ PASS
- Durée downtime : ~X minutes
```

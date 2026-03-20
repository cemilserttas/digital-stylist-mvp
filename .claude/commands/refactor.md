# /refactor — Refactoring et Décomposition

Lis `CLAUDE.md` avant de commencer. Règle absolue : **chaque refactor = un commit séparé**.
Ne jamais mélanger refactor et ajout de feature dans le même commit.
Après chaque refactor : vérifier que le build passe.

---

## Refactor 1 — Créer `frontend/lib/types.ts` (priorité haute)

**Problème :** Les interfaces TypeScript (`User`, `ClothingItem`, `WeatherData`, `Suggestion`, etc.)
sont définies dans `page.tsx` et redéfinies ou implicites dans les composants.

**Action :**
1. Lire `frontend/app/page.tsx` et identifier toutes les interfaces/types
2. Créer `frontend/lib/types.ts` avec toutes ces interfaces exportées
3. Dans `page.tsx` et tous les composants : remplacer les définitions locales par des imports

```typescript
// frontend/lib/types.ts
export interface User {
  id: number
  prenom: string
  morphologie: string
  genre: string
  age: number
  style_prefere?: string
}

export interface ClothingItem {
  id: number
  user_id: number
  type: string
  couleur: string
  saison: string
  tags_ia: string  // JSON stringifié
  image_path: string
  category: string
}

export interface WeatherData {
  temperature: number
  description: string
  ville: string
  icon: string
}

export interface SuggestionPiece {
  type: string
  description: string
  couleur?: string
  lien?: string
  prix?: string
}

export interface Suggestion {
  titre: string
  description: string
  pieces: SuggestionPiece[]
}

// Ajouter tous les autres types trouvés dans page.tsx
```

**Vérification :** `cd frontend && npm run build` — aucune erreur de type.

---

## Refactor 2 — Déduplication de `buildShopUrl` (priorité haute)

**Problème :** `buildShopUrl()` existe en double dans `page.tsx` (ligne ~73) et `ChatBot.tsx` (ligne ~27).

**Action :**
1. Créer (ou compléter) `frontend/lib/utils.ts` :
```typescript
// frontend/lib/utils.ts
export function buildShopUrl(searchTerms: string): string {
  return `https://www.google.com/search?btnI=1&q=${encodeURIComponent(searchTerms + ' acheter')}`
}
```
2. Supprimer la fonction des deux fichiers sources
3. Importer depuis `lib/utils.ts` dans les deux fichiers

**Vérification :** `npm run build` + tester un clic sur un lien produit en dev.

---

## Refactor 3 — Extraire le hook `useWeather` (priorité moyenne)

**Problème :** La logique météo (géolocalisation + fallback IP + fetch Open-Meteo) est noyée dans `page.tsx`,
rendant le composant difficile à tester et comprendre.

**Action :**
Créer `frontend/hooks/useWeather.ts` :

```typescript
// frontend/hooks/useWeather.ts
import { useState, useEffect } from 'react'
import { WeatherData } from '@/lib/types'

export function useWeather() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  // Déplacer ici : toute la logique de géolocalisation,
  // fetch Nominatim, fetch Open-Meteo, fallback ipapi.co
  // La logique est extraite telle quelle de page.tsx — pas de réécriture

  return { weatherData, weatherLoading, weatherError }
}
```

Dans `page.tsx` remplacer par :
```typescript
const { weatherData, weatherLoading } = useWeather()
```

**Vérification :** `npm run build` + vérifier que la météo s'affiche toujours.

---

## Refactor 4 — Extraire `SuggestionsSection` (priorité moyenne)

**Problème :** Le rendu des cartes de suggestions (~80-100 lignes de JSX) est dans `page.tsx`,
mélangé avec la logique de fetch et les autres sections.

**Action :**
Créer `frontend/components/SuggestionsSection.tsx` :

```typescript
// Props à identifier en lisant le JSX des suggestions dans page.tsx
export interface SuggestionsSectionProps {
  suggestions: Suggestion[]
  greeting: string
  loading: boolean
  onRefresh: () => void
  onSaveClick: (url: string, productName: string, marque: string, prix: number) => void
}

export default function SuggestionsSection({ ... }: SuggestionsSectionProps) {
  // Copier le JSX des suggestions depuis page.tsx
}
```

Laisser dans `page.tsx` : l'état des suggestions, la logique de fetch, et importer `<SuggestionsSection>`.

**Vérification :** `npm run build` + vérifier que les suggestions s'affichent et que "I'm feeling lucky" fonctionne.

---

## Refactor 5 — Corriger le N+1 dans `admin.py` (priorité moyenne)

**Problème :** `list_all_users()` exécute une requête par user pour compter ses items → O(N) queries.

**Action :**
```python
# Avant (N+1)
users = result.scalars().all()
for user in users:
    count_result = await session.execute(
        select(func.count(ClothingItem.id)).where(ClothingItem.user_id == user.id)
    )
    # ...

# Après (1 seule requête JOIN)
from sqlalchemy import func, outerjoin

stmt = (
    select(User, func.count(ClothingItem.id).label("clothing_count"))
    .outerjoin(ClothingItem, ClothingItem.user_id == User.id)
    .group_by(User.id)
    .order_by(User.created_at.desc())
)
result = await session.execute(stmt)
rows = result.all()

return [
    {**user.dict(), "clothing_count": count}
    for user, count in rows
]
```

**Vérification :** Panel admin charge correctement + vérifier dans les logs qu'une seule requête SQL est émise.

---

## Refactor 6 — Remplacer tous les `print()` par `logging` (backend)

**Problème :** `print()` utilisé partout dans `ai_service.py` et `admin.py` au lieu du module logging.

**Action :**
1. Pour chaque fichier dans `backend/app/` :
   ```python
   import logging
   logger = logging.getLogger(__name__)
   ```
2. Remplacements :
   - `print(f"✅ ...")` → `logger.info(...)`
   - `print(f"❌ ...")` → `logger.error(...)`
   - `print(f"⚠️ ...")` → `logger.warning(...)`
   - Supprimer les emojis des messages de log (incompatibles avec certains agrégateurs)
3. Ajouter la config logging dans `main.py` (lifespan) :
   ```python
   import logging
   logging.basicConfig(
       level=os.getenv("LOG_LEVEL", "INFO"),
       format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
   )
   ```

**Vérification :** `grep -rn "print(" backend/app/` → aucun résultat.

---

## Refactor 7 — Supprimer `clothes.py` déprécié

**Problème :** `backend/app/routers/clothes.py` n'est pas inclus dans `main.py` mais existe encore,
source de confusion et de `user_id=1` hardcodé.

**Action :**
1. Confirmer que `clothes.py` n'est importé nulle part : `grep -rn "clothes" backend/app/main.py`
2. Si absent → supprimer le fichier
3. Committer avec : `chore: remove deprecated clothes.py router`

**Vérification :** `python -c "from app.main import app"` — toujours OK.

---

## Checklist post-refactor

Après chaque refactor :
- [ ] `cd backend && python -c "from app.main import app"` → OK
- [ ] `cd frontend && npm run build` → 0 erreurs TypeScript
- [ ] Comportement visible dans le navigateur inchangé
- [ ] Commit séparé avec message `refactor: [description]`
- [ ] Mettre à jour `CLAUDE.md` "Map du repo" si de nouveaux fichiers ont été créés

# /frontend — Développement Frontend

Lis `CLAUDE.md` entièrement avant de commencer. Toutes les conventions définies là sont non négociables.

---

## Avant d'écrire le moindre code

1. **Types partagés** → `lib/types.ts` (créer si absent, importer dans tous les composants)
2. **Appels API** → `lib/api.ts` uniquement (jamais `axios.post()` directement dans un composant)
3. **Utilitaires** → `lib/utils.ts` (ex: `buildShopUrl`, formatters)
4. **Nouveau composant ou modification ?** → Si modification de `page.tsx`, vérifier si ça justifie une extraction
5. **Vérifier `API_CHANGES.md`** → Le contrat API a-t-il changé côté backend ?

---

## Checklist — Tout nouveau composant doit respecter

```typescript
// ✅ Interface des props définie et exportée, au-dessus du composant
export interface MonComposantProps {
  userId: number
  onDone: (result: ClothingItem) => void
  loading?: boolean
}

// ✅ Nommage : PascalCase pour les composants, camelCase pour les fonctions
export default function MonComposant({ userId, onDone, loading = false }: MonComposantProps) {

// ✅ Loading + error states pour tout appel API
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleAction = async () => {
  try {
    setIsLoading(true)
    setError(null)
    const result = await monAppelApi(userId)
    onDone(result)
  } catch (err) {
    console.error(err)
    setError("Une erreur est survenue. Veuillez réessayer.")
  } finally {
    setIsLoading(false)
  }
}

// ✅ Messages d'erreur en français à l'utilisateur
// ✅ Jamais de console.error() sans afficher un retour à l'utilisateur

// ✅ Taille max 150 lignes cible, split obligatoire si > 200 lignes
```

---

## Règles de State Management

```typescript
// État UI local (modal ouvert, editing, loading) → dans le composant
const [isModalOpen, setIsModalOpen] = useState(false)

// État partagé entre siblings → remonter dans page.tsx
// (Ne pas créer de Context global pour l'instant — l'architecture actuelle est intentionnelle pour le MVP)

// Données utilisateur → vivent dans page.tsx, passées en props
// Ne jamais dupliquer l'état user dans un composant enfant

// localStorage → uniquement pour le cache de session (suggestions, user connecté)
// Jamais comme source de vérité pour les données de la DB
```

---

## Pattern API Call

```typescript
// Tout appel API passe par lib/api.ts
// Exemple d'ajout dans lib/api.ts :

export async function monNouvelAppel(userId: number, data: MonType): Promise<MonRetourType> {
  const response = await api.post<MonRetourType>(`/mon-endpoint/${userId}`, data)
  return response.data
}

// Dans le composant :
import { monNouvelAppel } from '@/lib/api'
import type { MonType, MonRetourType } from '@/lib/types'
```

---

## Styling (Tailwind CSS v4)

```typescript
// Pattern glassmorphism standard du projet
className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl"

// Gradients de fond du projet
className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"

// Texte sur fond sombre
className="text-white/90"    // principal
className="text-white/60"    // secondaire
className="text-white/40"    // placeholder

// États hover
className="hover:bg-white/20 transition-colors duration-200"

// Animations : Framer Motion pour les transitions significatives (modales, onglets, cartes)
import { motion, AnimatePresence } from 'framer-motion'

// Responsive : mobile-first (tester à 375px ET 1280px)
className="flex flex-col md:flex-row"
```

---

## Error Boundaries

Toute section majeure qui fait des appels API doit être enveloppée dans une Error Boundary.

```typescript
// frontend/components/ErrorBoundary.tsx (créer si absent)
'use client'
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 text-red-400 text-sm">
          Une erreur est survenue. Rechargez la page.
        </div>
      )
    }
    return this.props.children
  }
}

// Usage dans page.tsx
<ErrorBoundary fallback={<div>Erreur garde-robe</div>}>
  <WardrobeGallery ... />
</ErrorBoundary>
```

---

## Cibles de décomposition de `page.tsx` (635 lignes)

Si tu travailles sur `page.tsx`, voici les extractions à prioriser :

| Extraction | Type | Contenu |
|------------|------|---------|
| `useWeather` | Hook | Géolocalisation + fetch météo + fallback IP |
| `useSuggestions` | Hook | Fetch suggestions + cache localStorage |
| `SuggestionsSection` | Composant | Cartes de tenues + "I'm feeling lucky" |
| `WeatherDisplay` | Composant | Affichage de la météo courante |
| `TabNavigation` | Composant | Barre d'onglets garde-robe/wishlist/accueil |

**Règle :** Extraire un seul élément à la fois. Vérifier que tout compile après chaque extraction.

---

## Après l'implémentation

1. `cd frontend && npm run build` → 0 erreur TypeScript
2. `cd frontend && npm run lint` → 0 erreur ESLint
3. Vérifier qu'aucun `any` n'a été introduit : `grep -rn ": any" frontend/`
4. Vérifier que le composant reste sous 200 lignes
5. Tester sur mobile (375px) et desktop (1280px) dans le navigateur
6. Committer avec : `feat(frontend): [description]` ou `fix(frontend): [description]`
7. Mettre à jour `WORK_LOG.md`

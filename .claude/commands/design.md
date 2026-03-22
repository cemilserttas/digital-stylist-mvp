# /design — Design System, Brand & Innovation Produit

Lis `CLAUDE.md` (conventions frontend + design system) avant de commencer.
Digital Stylist a un design sombre premium avec des accents violets/roses. Toute création respecte ce système.

**Modes disponibles :**
- `/design` — audit design complet + recommandations
- `/design system` — générer/mettre à jour le design system (tokens, composants)
- `/design brand` — guidelines de marque (logo, couleurs, typographie, voix)
- `/design screen [nom]` — designer un nouvel écran ou composant
- `/design innovation` — brainstorming features innovantes basées sur les tendances IA/mode
- `/design onboarding` — optimiser le flow d'onboarding

---

## Phase 1 — Audit Design Actuel

### Cohérence visuelle
```
[ ] Toutes les cartes utilisent bg-white/5 border border-white/10 rounded-2xl ?
[ ] Les accents violets (purple-400) et roses (pink-400) sont cohérents ?
[ ] L'amber-400 est réservé uniquement au Premium ?
[ ] Les animations Framer Motion sont consistantes (duration 0.2-0.3, easeOut) ?
[ ] Le glassmorphism (backdrop-blur) est utilisé de façon consistante ?
[ ] Mobile-first respecté partout (tester à 375px) ?
[ ] Safe area iPhone (env(safe-area-inset-*)) appliqué dans les zones critiques ?
[ ] Les états de loading sont visuellement cohérents (spinner, skeleton) ?
[ ] Les messages d'erreur sont stylisés de façon uniforme ?
```

### Accessibilité
```
[ ] Contraste texte suffisant (WCAG AA — ratio ≥ 4.5:1) ?
[ ] Toutes les images ont un alt text descriptif ?
[ ] Les boutons ont des labels aria explicites ?
[ ] Navigation clavier fonctionnelle (focus visible) ?
[ ] Taille de touch target ≥ 44×44px sur mobile ?
[ ] Pas de texte trop petit (< 14px) ?
```

---

## Phase 2 — Design System Complet

### Tokens de couleur

```typescript
// À documenter dans un fichier design-tokens.ts ou dans globals.css
// JAMAIS coder des couleurs en dur dans les composants

// Fonds
--color-bg-primary:    #030712   // gray-950
--color-bg-secondary:  #111827   // gray-900
--color-surface:       rgba(255,255,255,0.05)   // white/5
--color-surface-hover: rgba(255,255,255,0.10)   // white/10

// Bordures
--color-border:        rgba(255,255,255,0.10)   // white/10
--color-border-strong: rgba(255,255,255,0.20)   // white/20

// Texte
--color-text-primary:  rgba(255,255,255,0.95)   // white/95
--color-text-secondary:rgba(255,255,255,0.60)   // white/60
--color-text-muted:    rgba(255,255,255,0.40)   // white/40

// Accents — USAGE STRICT
--color-accent-primary: #c084fc   // purple-400 (features IA, highlights)
--color-accent-secondary:#f472b6  // pink-400 (second accent, gradients)
--color-accent-premium: #fbbf24   // amber-400 (UNIQUEMENT éléments Premium)
--color-accent-success: #34d399   // emerald-400 (confirmations, succès)
--color-accent-error:   #f87171   // red-400 (erreurs)
--color-accent-warning: #fb923c   // orange-400 (avertissements)

// Gradients signature
--gradient-brand: linear-gradient(to right, #c084fc, #f472b6)
--gradient-premium: linear-gradient(to right, #fbbf24, #f97316)
--gradient-bg: linear-gradient(to bottom right, #1e1b4b, #312e81, #1e1b4b)
```

### Tokens de typographie

```typescript
// Hiérarchie typographique
--font-family: 'system-ui, -apple-system, sans-serif'  // native, rapide

// Tailles
--text-xs:   0.75rem   // 12px — labels, badges
--text-sm:   0.875rem  // 14px — métadonnées, secondaire
--text-base: 1rem      // 16px — corps, boutons
--text-lg:   1.125rem  // 18px — sous-titres
--text-xl:   1.25rem   // 20px — titres de section
--text-2xl:  1.5rem    // 24px — titres de page
--text-3xl:  1.875rem  // 30px — hero titles
--text-4xl:  2.25rem   // 36px — display

// Poids
--font-normal: 400
--font-semibold: 600
--font-bold: 700
--font-black: 900   // pour le logo DIGITALSTYLIST
```

### Tokens d'espacement (8px grid)

```
4px  — gap interne micro (icône + texte)
8px  — padding compact, gap xs
12px — padding sm
16px — padding base, gap sm
20px — gap md
24px — padding lg, gap lg
32px — padding xl, gap xl
48px — section spacing
```

### Composants de base (patterns réutilisables)

```typescript
// Carte standard
"bg-white/5 border border-white/10 rounded-2xl p-5"

// Carte interactive (hover)
"bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-200 cursor-pointer"

// Bouton primaire
"bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"

// Bouton secondaire
"bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-xl border border-white/20 transition-colors"

// Bouton premium
"bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold px-6 py-3 rounded-xl transition-all"

// Bouton danger
"bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold px-4 py-2 rounded-xl transition-colors"

// Input
"bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"

// Badge
"bg-purple-500/20 text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full"

// Badge premium
"bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full"
```

### Animations standard

```typescript
// Entrée de carte
{ initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.2, ease: 'easeOut' } }

// Transition d'onglets
{ initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  transition: { duration: 0.15 } }

// Modal
{ initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
  transition: { duration: 0.2, ease: 'easeOut' } }

// Stagger list items
{ variants: { container: { transition: { staggerChildren: 0.05 } },
              item: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } } } }
```

---

## Phase 3 — Guidelines de Marque

### Logo & Identité
```
Nom : DIGITAL STYLIST (majuscules, font-black, tracking-tight)
Stylisation : DIGITAL en blanc + STYLIST en dégradé purple→pink
Icône : Sparkles (lucide-react) en purple-400
Tagline : "Ton styliste IA personnel"
```

### Voix de marque (tone of voice)
```
✅ Chaleureuse : "Bonjour [Prénom] !"
✅ Experte mais accessible : "Ce chino slim en beige sable va parfaitement avec..."
✅ Directe : "Voilà ta tenue du jour"
✅ Bienveillante : "Ce look a beaucoup de potentiel !"
✅ Française naturelle : pas de calques anglais
❌ Pas froide : "Analyse terminée. Score : 7.2/10"
❌ Pas trop familière : "Waouh trop stylé !!"
❌ Pas technique : "L'algorithme de vision par ordinateur a détecté..."
```

### Iconographie
```
Source : lucide-react (cohérence totale)
Style : strokeWidth={1.5} (doux, premium)
Couleurs : toujours en accord avec le token de couleur du contexte
Taille : w-4 h-4 (small), w-5 h-5 (medium), w-6 h-6 (large), w-8 h-8 (hero)
```

---

## Phase 4 — Innovation Produit

### Ideas de features différenciantes (IA + Mode)

**Court terme (1-2 sprints)**

```
1. MOOD BOARD IA
   Concept : l'utilisateur décrit son humeur ("je veux me sentir puissante aujourd'hui")
   → Gemini génère 3 looks adaptés à cette énergie + météo
   Impact : différenciation émotionnelle vs fonctionnelle

2. VIRTUAL TRY-ON (mockup)
   Concept : superposer un vêtement de la garde-robe sur une silhouette générique
   Tech : Canvas 2D (déjà maîtrisé via shareCard.ts) + silhouette SVG par morphologie
   Impact : visualisation avant/après instantanée

3. OUTFIT STREAK
   Concept : tracker les jours consécutifs où l'utilisateur utilise l'app
   UI : flame 🔥 dans le header avec compteur
   Impact : habit loop puissant (comme Duolingo)

4. STYLE QUIZ DYNAMIQUE
   Concept : onboarding visuel (swipe left/right sur des looks)
   → Profil style auto-généré + suggestions immédiatement personnalisées
   Impact : activation plus rapide (AHA moment en 2min)
```

**Moyen terme (1-2 mois)**

```
5. GARDE-ROBE CAPSULE BUILDER
   Concept : Gemini analyse la garde-robe et propose un plan d'acquisition minimal
   "Avec ces 3 achats (total €89), tu as 40 nouvelles tenues possibles"
   Impact : monétisation affiliée × 10

6. OCCASION-BASED SUGGESTIONS
   "J'ai un entretien demain" → look "Business Confident"
   "Date night vendredi" → look "Soirée Chic Décontracté"
   "Week-end à la campagne" → look "Country Chic"
   Intégration calendrier (Google Calendar API) = killer feature

7. AI PERSONAL SHOPPER PRO
   L'IA scanne les soldes en temps réel (Zalando API, ASOS API)
   et recommande des achats selon les gaps de la garde-robe
   Impact : affiliation ciblée, CTR × 3

8. BODY POSITIVE STYLING
   Options non-binaires, toutes morphologies, toutes tailles
   Partenariats marques inclusives (Asos Curve, H&M+, etc.)
```

---

## Phase 5 — Optimisation Onboarding

### Flow actuel vs optimisé

**Actuel :**
```
Prénom → Morphologie → Genre → Âge → [App]
```

**Optimisé :**
```
Étape 1 — Accroche visuelle (3s)
  "Découvre ton style en 2 minutes"
  [Voir comment ça marche] (video loop 15s)

Étape 2 — Style Quiz (30s)
  5 images de looks → swipe gauche (pas mon style) / droit (oui)
  → Gemini génère "Ton ADN de style : Casual Chic Minimaliste"

Étape 3 — Infos de base (20s)
  Prénom + Genre + Morphologie (avec illustrations)

Étape 4 — AHA moment immédiat
  Sans upload : "Voilà un look pour aujourd'hui à [ville] ([temp]°C)"
  Suggestion basée sur le style quiz + météo
  → L'utilisateur voit la valeur AVANT d'uploader

Étape 5 — Invite à uploader
  "Maintenant, montre-moi ta vraie garde-robe pour des looks personnalisés"
  [Uploader mon premier vêtement →]
```

---

## Format du rapport de sortie

```
## RAPPORT DESIGN — Digital Stylist
Date : [aujourd'hui]

### Score Design
Cohérence  [████░] — 4/5 : [problème identifié si < 5]
Accessib.  [███░░] — 3/5 : [contraste, labels aria manquants]
Mobile UX  [████░] — 4/5 : [points d'amélioration]
Innovation [██░░░] — 2/5 : [features manquantes à prioriser]

### Problèmes de cohérence identifiés
- [FICHIER:LIGNE] Description + correction recommandée

### 3 Innovations à implémenter maintenant
1. [Feature + impact + complexité]
2. ...
3. ...

### Optimisation onboarding recommandée
[Étapes concrètes avec fichiers à modifier]
```

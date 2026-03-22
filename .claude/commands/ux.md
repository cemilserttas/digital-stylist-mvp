# /ux — Optimisation UX & Expérience Utilisateur

Lis `CLAUDE.md` (map du repo + conventions) avant de commencer.
Digital Stylist est une app mobile-first. L'UX doit être **fluide, sans friction, avec une valeur perçue immédiate**.

**Modes disponibles :**
- `/ux` — audit UX complet (friction, conversion, accessibilité)
- `/ux flow [nom]` — analyser un flow spécifique (onboarding, upload, suggestions, chat, premium)
- `/ux ab [feature]` — concevoir un plan A/B test pour une feature
- `/ux mobile` — audit spécifique mobile (touch, safe area, performance perçue)
- `/ux copy` — audit des microtextes (CTA, messages d'erreur, labels, empty states)

---

## Phase 1 — Audit UX Complet

### Carte des frictions par flow

#### Flow 1 — Onboarding (new user)
```
Étape                    | Friction actuelle         | Priorité fix
-------------------------|---------------------------|-------------
Écran accueil            | Pas de social proof       | HAUTE
Formulaire prénom        | Seul champ visible        | BASSE
Sélection morphologie    | Illustrations absentes ?  | HAUTE
Sélection genre          | Options binaires seulement?| MOYENNE
Premier contact app      | Pas de tuto contextuel    | HAUTE
```

**Questions à vérifier dans `frontend/app/onboarding/` ou `components/UserForm.tsx` :**
- [ ] Y a-t-il un progress indicator (étape X/Y) ?
- [ ] L'utilisateur voit-il la valeur AVANT de donner des infos personnelles ?
- [ ] Les illustrations de morphologie sont-elles présentes ?
- [ ] Le CTA du dernier écran mène directement à un AHA moment ?

#### Flow 2 — Upload vêtement
```
Étape                    | Friction actuelle         | Priorité fix
-------------------------|---------------------------|-------------
Bouton upload            | Trouvable facilement ?    | HAUTE
Sélection image          | Photo directe mobile ?    | HAUTE
Attente analyse IA       | Feedback visuel présent ? | HAUTE
Résultat analyse         | Éditable si erreur IA ?   | MOYENNE
Confirmation ajout       | Toast visible assez long? | BASSE
```

**À vérifier dans `components/UploadSection.tsx` :**
- [ ] `capture="environment"` sur l'input (caméra arrière par défaut) ?
- [ ] Skeleton loader pendant l'analyse IA ?
- [ ] Message d'erreur si analyse échoue (timeout 45s) ?
- [ ] L'utilisateur peut corriger catégorie/couleur si l'IA se trompe ?

#### Flow 3 — Découverte suggestions
```
Étape                    | Friction actuelle         | Priorité fix
-------------------------|---------------------------|-------------
Première suggestion      | Contexte météo visible ?  | HAUTE
Liens shopping           | CTAs clairs ?             | MOYENNE
Partage look             | One-tap share ?           | BASSE
Limite freemium          | Message trop brutal ?     | HAUTE
Paywall                  | Timing optimal ?          | HAUTE
```

#### Flow 4 — Chat styliste
```
Étape                    | Friction actuelle         | Priorité fix
-------------------------|---------------------------|-------------
Démarrer conversation    | FAB trouvable ?           | MOYENNE
Envoyer message          | Keyboard overlap ?        | HAUTE (mobile)
Limite 5 messages        | Compteur visible ?        | HAUTE
Réponse IA               | Délai trop long ?         | MOYENNE
```

#### Flow 5 — Upgrade Premium
```
Étape                    | Friction actuelle         | Priorité fix
-------------------------|---------------------------|-------------
Découverte paywall       | Trop tôt / trop tard ?    | HAUTE
Modal upgrade            | Bénéfices clairs ?        | HAUTE
Choix mensuel/annuel     | Économie annuelle visible?| HAUTE
Paiement Stripe          | Retour app fluide ?       | MOYENNE
Confirmation premium     | Célébration / feedback ?  | BASSE
```

---

## Phase 2 — Métriques UX à mesurer

### Funnel d'activation
```
100% inscription
 ↓ [__]% upload 1er vêtement  (cible: >70%)
 ↓ [__]% reçoit 1 suggestion  (cible: >60%)
 ↓ [__]% utilise le chat      (cible: >40%)
 ↓ [__]% revient J+3          (cible: >30%)
 ↓ [__]% upgrade premium      (cible: >5%)
```

### Temps à la valeur (Time-to-Value)
```
Cible idéale :
- Onboarding complet      < 2 minutes
- 1er vêtement uploadé    < 5 minutes depuis inscription
- 1ère suggestion vue     < 10 minutes depuis inscription
- AHA moment              < 15 minutes
```

### Signaux d'abandon à détecter
```
- Quitter pendant l'onboarding (étape ?)
- Upload sans résultat (erreur silencieuse ?)
- Chat sans réponse (timeout ?)
- Paywall → exit (message trop agressif ?)
```

---

## Phase 3 — A/B Tests Recommandés

### Test 1 — Onboarding first screen
```
Variante A (actuel) : Formulaire prénom immédiat
Variante B          : "Voilà un look pour [ville] aujourd'hui" → puis formulaire
Métrique            : % qui complètent l'onboarding
Durée               : 2 semaines / 200 users
```

### Test 2 — Timing du paywall
```
Variante A : Paywall au 1er refus (limite atteinte)
Variante B : Paywall au 3ème refus (plus d'engagement)
Variante C : Paywall après 7 jours (valeur habitude prouvée)
Métrique   : % upgrade dans les 30 jours
```

### Test 3 — CTA Premium
```
Variante A : "Passer à Premium" (actuel)
Variante B : "Débloquer les suggestions illimitées — €2.99/mois"
Variante C : "Plus que 2 suggestions ce mois → continuer à €0.10/jour"
Métrique   : CTR sur le bouton upgrade
```

### Test 4 — Empty state garde-robe vide
```
Variante A : "Ta garde-robe est vide — ajoute ton premier vêtement"
Variante B : "Commence par ta pièce préférée du moment 👗"
Variante C : Illustration + "L'IA a besoin de voir ta garde-robe pour travailler !"
Métrique   : % qui uploadent leur 1er vêtement dans les 24h
```

---

## Phase 4 — Audit Microtextes (UX Writing)

### Principes Digital Stylist
```
✅ Chaud & personnel   : "Bonjour Sarah !" > "Bienvenue"
✅ Orienté bénéfice    : "Suggestions illimitées" > "Feature Premium"
✅ Honnête             : "Il reste 1 suggestion aujourd'hui" > rien
✅ Actionnable         : "Ajouter un vêtement" > "+"
❌ Pas d'erreurs froids: "Erreur 429" → "Tu as utilisé tes suggestions du jour"
❌ Pas de jargon IA    : "Le modèle a analysé" → "Voilà ce que je pense de ta tenue"
```

### Textes à auditer (fichiers concernés)
```
components/SuggestionsSection.tsx — banner freemium, CTA, messages vides
components/ChatBot.tsx            — placeholder input, messages limite, erreurs
components/UploadSection.tsx      — labels, messages d'erreur upload, confirmations
components/UpgradeModal.tsx       — headline, feature list, CTA, prix affichés
app/onboarding/page.tsx           — progress, labels, boutons étapes
```

### Empty States — template
```typescript
// Mauvais
"Aucun vêtement"

// Bien
{
  icon: <Shirt className="w-12 h-12 text-purple-400/40" />,
  title: "Ta garde-robe t'attend",
  subtitle: "Ajoute ton premier vêtement pour que je puisse te conseiller",
  cta: "Ajouter mon premier look →"
}
```

---

## Phase 5 — Accessibilité Mobile

### Checklist touch targets
```
[ ] Tous les boutons ≥ 44×44px (recommandation Apple HIG)
[ ] Espacement entre boutons ≥ 8px (pas de "fat finger")
[ ] FAB ChatBot : position fixe, pas masqué par la nav bar
[ ] Input chat : décalage vers le haut quand keyboard apparaît
[ ] Pull-to-refresh sur la liste garde-robe ?
[ ] Swipe gestures documentées si présentes
```

### Checklist performance perçue
```
[ ] Skeleton loaders pendant les appels API (pas de page blanche)
[ ] Optimistic UI sur les actions courantes (like, ajout vêtement)
[ ] Transitions < 300ms (Framer Motion duration 0.2-0.3)
[ ] Images lazy-loaded avec placeholder
[ ] Pas de layout shift (CLS) sur le scroll
```

---

## Format du rapport de sortie

```
## RAPPORT UX — Digital Stylist
Date : [aujourd'hui]

### Score UX par flow
Onboarding    [████░] — 4/5 : [problème principal]
Upload        [███░░] — 3/5 : [friction identifiée]
Suggestions   [████░] — 4/5 : [amélioration]
Chat          [███░░] — 3/5 : [problème mobile]
Premium flow  [██░░░] — 2/5 : [CTA, timing]

### Top 5 frictions à éliminer (impact/effort)
1. [Friction] — Fichier: [composant:ligne] — Fix: [description] — Impact: HAUTE
2. ...

### Plan A/B (priorité)
Test 1 : [Hypothèse] | Métrique | Durée | Implémentation dans [fichier]

### Microtextes à mettre à jour
- [composant:ligne] Actuel: "..." → Recommandé: "..."
```

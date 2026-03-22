# /business — Stratégie Business & Monétisation

Lis `CLAUDE.md` (modèle économique) et `IMPROVEMENTS.md` (projections financières) avant de commencer.

**Modes disponibles :**
- `/business` — audit complet du modèle économique + plan d'action
- `/business pricing` — optimisation de la stratégie de prix
- `/business affiliate` — setup et optimisation des réseaux affiliés
- `/business freemium` — optimisation des gates freemium (conversion free→paid)
- `/business partners` — stratégie de partenariats B2B
- `/business unit-economics` — calculer CAC, LTV, churn, MRR projection

---

## Phase 1 — Audit du Modèle Économique Actuel

### Flux de revenus actifs

```
✅ Premium mensuel   — €2.99/mois (Stripe configuré ?)
✅ Premium annuel    — €24.99/an (Stripe configuré ?)
✅ Amazon Associates — tag=digitalstylist-21 (compte créé ?)
⬜ Zalando Partner   — pid= (programme rejoint ?)
⬜ ASOS Affiliate    — affid= (programme rejoint ?)
⬜ Awin              — marques FR (H&M, Mango, Zara) (compte créé ?)
⬜ Emails            — welcome series, premium upsell (configuré ?)
```

### Indicateurs à mesurer
```
MRR actuel       : €___
Utilisateurs free: ___
Utilisateurs prem: ___
Taux conversion  : ___% (cible: 5-8%)
Churn mensuel    : ___% (cible: <5%)
Clics affiliés/j : ___
Revenue affilié/j: €___
CAC              : €___ (coût acquisition client)
LTV              : €___ (valeur vie client)
LTV/CAC ratio    : ___ (cible: >3)
```

---

## Phase 2 — Optimisation Freemium (Conversion Free→Paid)

### Gates actuels vs recommandés

| Feature | État Free | Valeur Perçue | Recommandation |
|---------|-----------|---------------|----------------|
| Pièces garde-robe | 20 max | HAUTE — frustrant | ✅ Garder |
| Suggestions IA | 1/jour | HAUTE | ✅ Garder, afficher compteur visible |
| Chat styliste | 5/jour | HAUTE | ✅ Garder, afficher "X restants" |
| Planning tenues | 7 jours | MOYENNE | Passer à 3j free / 30j premium |
| Background removal | ✅ Tous | FAIBLE | ❌ Gater (premium only) |
| Analytics garde-robe | ✅ Tous | HAUTE | ❌ Gater (premium only) |
| Score IA | ✅ Tous | TRÈS HAUTE | ❌ Gater (1 analyse/mois free) |
| Export PDF look | ❌ absent | HAUTE | Créer et gater premium |
| Historique clics | ✅ Tous | FAIBLE | OK en free |

### Psychologie du passage à Premium

**Moment idéal de présentation du paywall :**
1. Après la 1ère suggestion vue (engagement prouvé)
2. Quand le free limit est atteint (frustration → motivation)
3. Après upload du 15ème vêtement (proche de la limite)
4. Après utilisation du chat (valeur prouvée)

**Texte CTA à optimiser :**
```
❌ Actuel (vague) : "Passer à Premium"
✅ Meilleur : "Débloquer les suggestions illimitées — €2.99/mois"
✅ Encore mieux : "Plus que 2 suggestions ce mois — continuer à €0.10/jour"
✅ Urgence : "Offre de lancement — 50% les 3 premiers mois"
```

---

## Phase 3 — Stratégie Affiliation

### Réseaux à rejoindre par ordre de priorité

**1. Amazon Associates (FR)**
- URL : https://partenaires.amazon.fr/
- Tag actuel dans le code : `digitalstylist-21` (placeholder → remplacer)
- Commission : 3-5% selon catégorie
- Marques couvertes : Nike, Adidas, Levi's, UNIQLO, Lacoste, Vans, New Balance
- Action : Créer le compte, obtenir le vrai tag, remplacer dans Vercel env vars

**2. Zalando Partner Program**
- URL : https://www.zalando.fr/partenaires/
- Variable : `NEXT_PUBLIC_ZALANDO_PARTNER_ID`
- Commission : 5-8%
- Marques : Zara, H&M, Mango, COS, Sandro, Maje, Massimo Dutti, Bershka
- Cookie duration : 30 jours

**3. Awin (anciennement Zanox)**
- URL : https://www.awin.com/fr
- Marques FR disponibles : H&M, La Redoute, Kiabi, Spartoo, Galeries Lafayette
- Commission : 5-10%
- Intégration : deeplinks par produit (plus puissant que search links)

**4. ASOS Affiliate**
- URL : https://www.asos.com/discover/affiliates/
- Variable : `NEXT_PUBLIC_ASOS_AFF_ID`
- Commission : 5-8%, cookie 30 jours
- Marques : ASOS, Topshop, Weekday, Monki

### Amélioration du tracking

```typescript
// Amélioration proposée dans lib/api.ts
// Tracker aussi le réseau affilié dans LinkClick
export const saveClick = async (userId: number, data: {
  product_name: string
  marque: string
  prix: number
  url: string
  reseau: 'amazon' | 'zalando' | 'asos' | 'awin' | 'google'  // NOUVEAU
}) => { ... }
```

### Métriques affiliées à surveiller
```
CTR (click-through rate)     : clics / suggestions vues (cible: >3%)
Conversion affilié           : achats / clics (cible: 1-3%)
Panier moyen                 : €___ (estimation Gemini: €45-80)
Revenue par clic             : €___ (panier × commission)
Top marques cliquées         : [voir admin/stats]
Revenue mensuel affilié      : €___
```

---

## Phase 4 — Stratégie de Prix

### Analyse comparative
| App | Prix | Features | Audience |
|-----|------|----------|----------|
| Stylebook | €2.99/mois | Organisateur de garde-robe | Mode passionné |
| Cladwell | €7.99/mois | Capsule wardrobe | Minimaliste |
| Smart Closet | €3.99/mois | Organisateur + looks | Grand public |
| **DigitalStylist** | **€2.99/mois** | **IA + proactif + météo** | **Tous** |

### Tests de prix recommandés (A/B)
```
Test A (actuel) : €2.99/mois — €24.99/an
Test B          : €3.99/mois — €29.99/an (+33% revenus si même conversion)
Test C          : Free limité + €1.99/mois lite + €4.99/mois full
```

### Offre de lancement (recommandé)
```
"Offre fondateurs — 50% pendant 3 mois"
Prix affiché : €1.49/mois les 3 premiers mois, puis €2.99/mois
Stripe : coupon FONDATEUR50 (50% off, 3 months, first 500 customers)
Urgence : compteur de places restantes visible sur l'UpgradeModal
```

---

## Phase 5 — Partenariats B2B

### Partenariats distribution (reach)

**Écoles de mode**
- IFM Paris, ESMOD, Studio Berçot, LISAA, MOD'ART
- Offre : Comptes Premium illimités pour étudiants
- Retour : Légitimité + 500-2000 jeunes utilisateurs captifs

**Marques mode (co-marketing)**
- Cibles : Jacquemus, Rouje, Sézane, A.P.C. (marques françaises premium)
- Offre : Intégration catalogue dans les suggestions IA (liens directs)
- Retour : % sur ventes trackées

**Stylistes / Personal shoppers**
- Offre : Compte "Pro" (€9.99/mois) avec accès multi-clients
- Fonctions : Gérer plusieurs gardes-robes clients
- Potentiel : B2B2C avec 50-200 stylistes × 10-20 clients chacun

**Applications complementaires**
- Météo apps (intégration)
- Apps fitness (What to wear après le sport)
- Apps agenda (suggérer look selon l'événement du calendrier)

---

## Phase 6 — Unit Economics

### Calcul LTV/CAC
```python
# Exemple de calcul à personnaliser
prix_mensuel = 2.99
churn_mensuel = 0.05        # 5% = durée vie 20 mois
ltv = prix_mensuel / churn_mensuel  # = €59.80

commission_affiliation_par_user = 1.50  # €1.50/mois par user premium
ltv_total = ltv + commission_affiliation_par_user * (1/churn_mensuel)  # = €89.80

cac_max_rentable = ltv_total / 3  # €29.93 — ne pas dépasser
```

### Projections MRR (ref: IMPROVEMENTS.md)
```
M3  : 500 users × 5% premium  = 25 × €2.99 = €74.75/mois + affilié ~€150 = €225
M6  : 2000 users × 8% premium = 160 × €2.99 = €478/mois + affilié ~€800 = €1,278
M12 : 10K users × 10% premium = 1000 × €2.99 = €2,990/mois + affilié ~€5K = €7,990
```

---

## Format du rapport de sortie

```
## RAPPORT BUSINESS — Digital Stylist
Date : [aujourd'hui]

### État des flux de revenus
Premium  [██░░░] — configuré: oui/non | MRR actuel: €___
Amazon   [░░░░░] — compte: oui/non | revenue/mois: €___
Zalando  [░░░░░] — compte: oui/non | revenue/mois: €___
ASOS     [░░░░░] — compte: oui/non | revenue/mois: €___
Awin     [░░░░░] — compte: oui/non | revenue/mois: €___

### Top 3 opportunités immédiates
1. [Opportunité + action concrète + impact estimé]
2. ...
3. ...

### Objectif MRR à 3 mois : €___
### Objectif MRR à 6 mois : €___
```

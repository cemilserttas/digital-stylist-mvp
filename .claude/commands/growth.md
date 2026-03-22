# /growth — Stratégie de Croissance (AARRR)

Lis `CLAUDE.md` (positionnement) + `IMPROVEMENTS.md` (projections MRR) avant de commencer.
Le framework AARRR : Acquisition → Activation → Rétention → Referral → Revenu.
Chaque levier est interdépendant — optimiser dans cet ordre précis.

**Modes disponibles :**
- `/growth` — diagnostic AARRR complet + plan de croissance
- `/growth acquisition` — canaux et stratégies d'acquisition
- `/growth activation` — optimiser le temps-à-la-valeur (AHA moment)
- `/growth referral` — concevoir et implémenter le programme referral
- `/growth revenue` — optimisation des revenus (prix, upsell, expansion)
- `/growth metrics` — définir et tracker les North Star Metrics

---

## Phase 1 — Diagnostic AARRR

### North Star Metric
```
North Star : Utilisateurs ayant reçu ≥3 suggestions cette semaine

Pourquoi ce NSM ?
- Prouve que l'utilisateur revient (rétention)
- Prouve qu'il a uploadé des vêtements (activation)
- Corrèle avec la conversion premium
- Mesure la valeur core de l'app (suggestions proactives)
```

### Scorecard actuelle (à remplir)
```
ACQUISITION
  Visites/semaine (organique)  : [__]
  Taux inscription/visite      : [__]%  cible: >5%
  CAC (coût acquisition)       : €[__] cible: <€10 (organique = €0)

ACTIVATION
  % inscrits → 1er upload      : [__]%  cible: >70%
  % inscrits → 1ère suggestion : [__]%  cible: >60%
  Time-to-AHA                  : [__]min cible: <15min

RÉTENTION
  D1  : [__]%  cible: >40%
  D7  : [__]%  cible: >20%
  D30 : [__]%  cible: >10%

REFERRAL
  Coefficient viralité (K)     : [__]  cible: >0.3
  % users qui invitent qqn     : [__]%  cible: >10%
  Referral → inscription       : [__]%

REVENUE
  MRR                          : €[__]
  ARPU (average revenue/user)  : €[__]
  LTV                          : €[__]  cible: >€50
  LTV/CAC ratio                : [__]  cible: >3
```

---

## Phase 2 — Acquisition

### Canaux organiques (0€)

**1. SEO — Contenu de longue traîne**
```
Mots-clés prioritaires (faible concurrence, haute intention) :
- "garde-robe capsule IA"
- "styliste IA personnel gratuit"
- "comment s'habiller selon morphologie application"
- "app mode française IA"
- "tenue selon météo automatique"

Articles à écrire (voir /marketing seo) :
1. "Comment créer une garde-robe capsule avec l'IA en 2026"
2. "Styliste IA vs styliste humain — lequel choisir ?"
3. "7 jours de tenues générées par l'IA — mon expérience"
```

**2. TikTok / Reels — Viral Loop**
```
Format qui performe : "J'ai laissé une IA choisir mes tenues 7 jours"
Cible : 100K vues sur 1 vidéo = ~500-2000 inscriptions (conversion 0.5-2%)
Investissement : 0€ + 2-3h/semaine contenu

Contenu de croissance organique :
- Before/after garde-robe analysée
- Live upload + analyse en temps réel
- Réaction au score de la garde-robe
- Look du jour IA vs look choisi seul
```

**3. Product Hunt — Launch spike**
```
Timing optimal : Mardi minuit PST (jeudi matin FR)
Objectif : Top 5 du jour (≥ 500 upvotes)
Impact estimé : 2000-10000 visites + 500-2000 inscriptions en 24h
Préparation : voir /marketing launch
```

**4. Reddit — Communautés mode**
```
r/femalefashionadvice (4.5M membres)
r/malefashionadvice (2M membres)
r/frugalfashion (1.3M membres)

Type de post qui marche :
"J'ai analysé 50 gardes-robes avec une IA — voici les 5 patterns de couleurs communs"
→ éducatif, pas promotionnel, lien dans commentaire si demandé
```

**5. Micro-influenceurs mode (gifting)**
```
Cible : 5K-100K abonnés, FR/BE/CH, mode/lifestyle
Offre : Compte premium 3 mois (valeur €9)
ROI attendu : 1 post / story = 200-1000 clics = 20-100 inscriptions
Budget : €0 (gifting = accès premium)
```

### Canaux payants (si budget > €500/mois)
```
Meta Ads (Instagram/Facebook)
  Cible : Femmes 20-35 ans, intérêts mode, France
  Format : Reel 15s "L'IA qui connaît ta garde-robe"
  Budget test : €5/j pendant 2 semaines
  CAC cible : <€3

TikTok Ads (Spark Ads sur vidéo organique qui marche)
  Amplifier la vidéo organique qui dépasse 50K vues
  Budget : €200-500 one-shot
```

---

## Phase 3 — Activation

### Optimisation du Time-to-AHA

**AHA moment de Digital Stylist :**
> "J'ai vu une suggestion personnalisée basée sur MA garde-robe + météo actuelle"

**Chemin actuel vers l'AHA :**
```
Inscription → Formulaire → [Onboarding] → Upload vêtement → Suggestion
     1min          2min          ?              5-10min         +2min
Total : ~15 minutes (trop long)
```

**Chemin optimisé (cible < 5min) :**
```
Landing avec suggestion exemple (0 friction) → Inscription prénom seul →
Suggestion météo sans garde-robe (AHA précoce) → Invitation upload →
1er upload → Suggestion personnalisée (AHA complet)
```

**Implémentation :**
```typescript
// Étape 1 — Avant inscription : montrer une démo interactive
// Page landing / avec une suggestion basée sur géoloc + météo (sans compte)
// "Voilà un look pour Paris aujourd'hui (18°C ☁️) — gratuit avec ta garde-robe"

// Étape 2 — Onboarding minimal : prénom + genre (2 champs max)
// Morphologie : optionnelle en step 2, pas bloquante

// Étape 3 — AHA immédiat
// Suggestion basée sur profil style + météo AVANT upload
// "C'est mieux avec ta vraie garde-robe → ajoute ton premier vêtement"
```

### Activation checklist (admin/page.tsx — stats à surveiller)
```
[ ] % users qui finissent l'onboarding
[ ] % users qui uploadent dans les 24h
[ ] % users qui reçoivent leur 1ère suggestion dans les 48h
[ ] % users qui reviennent à J+1
```

---

## Phase 4 — Programme Referral

### Design du programme

**Mécanique : Double-sided reward**
```
Parrain reçoit : 1 mois premium gratuit (si le filleul s'inscrit et uploade 1 vêtement)
Filleul reçoit : 2 semaines premium gratuites à l'inscription
Condition      : filleul doit uploader ≥1 vêtement (évite les faux comptes)
```

**Implémentation backend**
```python
# backend/app/models.py — à ajouter
class User(UserBase, table=True):
    referral_code: str = Field(default_factory=lambda: generate_referral_code())
    referred_by: Optional[int] = Field(None, foreign_key="user.id")
    referral_count: int = Field(default=0)
    referral_premium_granted: bool = Field(default=False)

# Endpoint
POST /referral/validate
{
    "referral_code": "SARAH123",
    "new_user_id": 456
}
# → Valider code, lier referred_by, programmer la récompense différée
```

**Implémentation frontend**
```typescript
// components/ReferralCard.tsx — dans UserSettings
// Afficher le code de referral personnalisé
// Bouton copier le lien
// Compteur de filleuls + status des récompenses
```

**Intégration onboarding**
```
Landing avec code referral en URL :
digitalstylist.app/?ref=SARAH123

→ Pré-remplir le code dans l'onboarding
→ Afficher "Sarah t'invite — 2 semaines premium offertes !"
→ Renforce la motivation à s'inscrire
```

### Métriques referral
```
K-factor = invitations envoyées × taux conversion invitation
Cible K > 0.3 → croissance virale partielle
Cible K > 1.0 → croissance virale pure (rare, ambitieux)

Tracking : ref_clicks / ref_signups / ref_activations dans admin/stats
```

---

## Phase 5 — Optimisation Revenus

### Expansion Revenue (upsell dans le temps)

**Chemin de valeur utilisateur**
```
Free (0€) → Premium mensuel (€2.99) → Premium annuel (€24.99) → Pro Styliste (€9.99)
   ↑                ↑                         ↑                        ↑
Essai          AHA moment              3 mois d'usage            usage intensif
```

**Upsell timing optimal**
```
J+0  : Inscription → Free (0€)
J+3  : Premier dépassement limite → Premier prompt upgrade
J+7  : Email "Découvre ce que tu rates en premium"
J+14 : Offre fondateurs -50% (si pas encore premium)
J+30 : Upgrade annuel si déjà premium mensuel ("économise 30%")
M+6  : Offre Pro Styliste si usage intensif (>100 items, >50 chats)
```

**Feature flags pour tests prix**
```typescript
// Tester différents prix sans redéploiement
// Configurable depuis admin/page.tsx
const PRICING = {
  monthly: process.env.NEXT_PUBLIC_PRICE_MONTHLY ?? '2.99',
  annual: process.env.NEXT_PUBLIC_PRICE_ANNUAL ?? '24.99',
  trial_days: process.env.NEXT_PUBLIC_TRIAL_DAYS ?? '7',
}
```

### Expansion Affiliation (LTV boosté)
```
Revenue par user actif = premium + affiliation
Premium  : €2.99/mois × 12 = €35.88/an
Affili.  : 3 clics/semaine × 52 × 3% × €50 panier = ~€23/an
LTV total estimé : ~€59/an

Levier : augmenter la pertinence des liens affiliés
→ Liens basés sur les items manquants de la garde-robe
→ Liens dans les suggestions (pas seulement dans le chat)
→ "Collection suggérée" basée sur les analyses couleurs
```

---

## Phase 6 — Roadmap Croissance 6 Mois

### Sprints de croissance
```
M1 — Base (avant lancement)
  → SEO fondations (meta tags, sitemap, 2 articles blog)
  → Onboarding optimisé (AHA < 5 min)
  → Referral program implémenté
  → Tracking analytics complet (PostHog ou Plausible)

M2 — Lancement
  → ProductHunt launch (mardi)
  → 5-10 micro-influenceurs contactés
  → 3 posts Reddit éducatifs
  → First 1000 users

M3 — Optimisation
  → A/B tests (paywall timing, CTA copy)
  → Email sequences (welcome, D7, D30)
  → Streak system + badges implémentés
  → Push notifications optimisées

M4-M5 — Accélération
  → Content marketing (1 article/semaine)
  → TikTok content régulier (3/semaine)
  → Partenariats écoles de mode
  → Instagram Reels Before/After

M6 — Scale
  → Meta Ads si CAC < €5
  → Affiliés spécifiques par marque
  → Programme Pro Styliste B2B
  → Analytics avancés (funnel détaillé)
```

### Projections MRR révisées
```
M1  (post-lancement)  : 200  users → 10 premium = €30  + affil €50   = €80
M2  (launch spike)    : 800  users → 40 premium = €120 + affil €150  = €270
M3  (organique)       : 2000 users → 100 premium= €299 + affil €400  = €699
M6  (contenu actif)   : 5000 users → 300 premium= €897 + affil €1200 = €2097
M12 (référents actifs): 15K  users → 1000 prem.= €2990+ affil €5000 = €7990
```

---

## Format du rapport de sortie

```
## RAPPORT GROWTH — Digital Stylist
Date : [aujourd'hui]

### Scorecard AARRR
Acquisition : [__] visits/sem → [__]% signup → CAC €[__]
Activation  : [__]% → 1er upload | [__]% → 1ère suggestion | TTV [__]min
Rétention   : D1 [__]% | D7 [__]% | D30 [__]%
Referral    : K=[__] | [__]% users refer | [__] ref/mois
Revenue     : MRR €[__] | ARPU €[__] | LTV €[__] | LTV/CAC [__]x

### Levier prioritaire du mois
[AARRR étape la plus faible] → Actions concrètes → Impact estimé

### Plan 30 jours
Semaine 1 : [Actions]
Semaine 2 : [Actions]
Semaine 3 : [Actions]
Semaine 4 : [Actions]

### MRR objectif dans 3 mois : €[__]
```

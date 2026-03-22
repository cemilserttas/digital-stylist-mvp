# /marketing — Stratégie Marketing Digital

Lis `CLAUDE.md` pour comprendre le positionnement produit avant de commencer.
Digital Stylist est un **assistant proactif IA de mode**, pas un simple organisateur.
Le marketing doit vendre la transformation, pas la technologie.

**Modes disponibles :**
- `/marketing` — audit marketing complet + plan d'action
- `/marketing content` — calendrier contenu social media (1 mois)
- `/marketing launch` — plan de lancement ProductHunt complet
- `/marketing seo` — stratégie SEO + brief articles de blog
- `/marketing copy` — rédiger les textes de l'app (onboarding, emails, push)

---

## Phase 1 — Audit Marketing Actuel

Vérifier l'état actuel :

```
[ ] Meta title + description optimisés dans app/layout.tsx ?
[ ] OpenGraph image (og:image) pointant vers une vraie image ?
[ ] Manifest.json avec short_name, description, icons 192/512 ?
[ ] Page de landing (/ non connecté) ou juste l'onboarding ?
[ ] Textes onboarding : clairs sur la valeur ajoutée ?
[ ] Emails transactionnels configurés (bienvenue, premium, referral) ?
[ ] Analytics configurés (PostHog / Plausible / GA4) ?
[ ] Tracking des clics affiliés fonctionnel ?
```

---

## Phase 2 — Positionnement & Messaging

### Proposition de valeur principale
> "Chaque matin, tu reçois ta tenue du jour — adaptée à la météo, à ton agenda, et à ta garde-robe."

### Contre-positionnement
| Concurrent | Leur pitch | Notre différence |
|---|---|---|
| Pinterest | Inspiration externe | Ta vraie garde-robe |
| Instagram | Influenceurs | Conseil personnalisé |
| Stylebook | Organisateur | Proactif + météo |
| ChatGPT | Généraliste | Spécialisé mode, connaît tes vêtements |

### Messages clés par audience
**25-35 ans, actifs, manque de temps :**
> "Fini le stress du matin — l'IA s'occupe de ton look pendant que tu bois ton café."

**Fashion-conscious, budget maîtrisé :**
> "Des looks stylés avec ce que tu as déjà — plus besoin d'acheter pour être bien habillé(e)."

**Parents / personnes surchargées :**
> "Une décision de moins chaque matin. Ton cerveau te remerciera."

---

## Phase 3 — Stratégie Social Media

### TikTok / Instagram Reels (priorité #1)
**Format gagnant : Before/After**
```
Concept 1 : "J'ai laissé une IA choisir mes tenues pendant 7 jours"
  - Jour 1-7 : screenshot du look suggéré par le chatbot
  - Réaction surprise + look réel porté
  - CTA : "Lien en bio pour essayer gratuitement"

Concept 2 : "Analyse de ma garde-robe par une IA"
  - Upload des photos de ses vêtements en live
  - Réaction au score IA et aux recommandations
  - CTA : "Résultat choquant 👀"

Concept 3 : "L'IA styliste de mode teste ma garde-robe capsule"
  - Montrer les analytics couleurs
  - Révéler les pièces manquantes suggérées
  - Liens affiliés pour acheter

Concept 4 : "Météo 5°C + réunion importante = look parfait en 30 secondes"
  - Screen recording de l'app en action
  - Tenue physique portée
  - "L'IA savait avant moi"
```

**Fréquence cible :** 3-5 vidéos/semaine pendant le lancement
**Hashtags :** #AIFashion #StyleIA #OOTDwithAI #DigitalStylist #GardeRobeIA #TenueIA

### Instagram Feed (cohérence de marque)
```
Palette visuelle :
- Fond sombre (gris anthracite / noir)
- Accents violets et roses (couleurs de l'app)
- Photos vêtements propres sur fond blanc/neutre
- Mockups téléphone avec l'interface de l'app

Types de posts :
- Avant/après garde-robe analysée (carousel)
- Citation style du jour
- Tenue générée par l'IA (screenshot stylisé)
- Derrière les coulisses (développement, stats d'utilisation)
- Témoignages utilisateurs
```

### Pinterest
```
Tableaux à créer :
- "Looks générés par DigitalStylist IA"
- "Garde-robe capsule [saison]"
- "Mode budget — moins de 100€"
- "Analyses couleurs garde-robe"
Chaque pin → lien vers l'app
```

---

## Phase 4 — SEO & Contenu Blog

### Articles prioritaires (haute intention d'achat)

**#1 — "Comment créer une garde-robe capsule avec l'IA en 2026"**
- Mot-clé : "garde-robe capsule IA" (faible concurrence, haute intention)
- 1500 mots, guide pratique avec screenshots de l'app
- CTA : "Essaye DigitalStylist gratuitement"

**#2 — "Les 5 morphologies et comment s'habiller selon la sienne"**
- Mot-clé : "comment s'habiller morphologie [triangle/rectangle/etc]"
- Très recherché, fort SEO
- Intégrer l'analyse morphologique de l'app

**#3 — "Palettes de couleurs tendance Printemps-Été 2026"**
- Mot-clé saisonnier, bon pour le trafic organique
- Lier aux analytics couleurs de l'app

**#4 — "Je teste [X] jours avec un styliste IA"**
- Format expérience personnelle, fort engagement
- Screenshots réels de l'app

**#5 — "Comment économiser 50% en mode avec une IA"**
- Angle budget (éviter les achats inutiles, maximiser ce qu'on a)
- Liens affiliés naturels dans le contenu

### Meta tags optimisés pour l'app

```html
<!-- À vérifier/mettre à jour dans app/layout.tsx -->
<title>DigitalStylist — Ton Styliste IA Personnel | Tenue du Jour Automatique</title>
<meta name="description" content="DigitalStylist analyse ta garde-robe et te suggère ta tenue parfaite chaque matin selon la météo. Gratuit, IA francophone, sans effort." />
<meta property="og:title" content="DigitalStylist — Styliste IA Personnel Gratuit" />
<meta property="og:description" content="Reçois ta tenue du jour par IA chaque matin, adaptée à la météo et ta vraie garde-robe." />
```

---

## Phase 5 — ProductHunt Launch

### Checklist pré-lancement (J-14)
```
[ ] Créer compte ProductHunt + lier à tous les assets
[ ] Hunter identifié (influenceur tech ou mode qui submit le produit)
[ ] Vidéo démo 60s enregistrée (screen recording + voix off)
[ ] Screenshots × 5 : onboarding, suggestions, garde-robe, chat, analyse
[ ] Tagline finale : "Ton styliste IA personnel — look parfait chaque matin"
[ ] Description longue (500 mots max, bénéfices > features)
[ ] Makers bien remplis avec photos et bios
[ ] Notification à la communauté Discord / Slack / Twitter prête
[ ] Réponses templates pour les 20 premières questions prévisibles
```

### Jour du lancement (mardi recommandé, minuit PST)
```
00h01 PST : Produit publié
00h15 : Notification à tous les beta users — voter maintenant
08h00 : Post LinkedIn + Twitter personnels
09h00 : Post dans r/SideProject, r/startups, r/femalefashionadvice
10h00 : Email list (si existante)
Toute la journée : Répondre à chaque commentaire dans les 30 minutes
```

### Message de lancement type (communauté)
```
"On vient de lancer DigitalStylist sur ProductHunt 🚀

C'est un styliste IA personnel qui :
📱 Analyse ta garde-robe par photo
☀️ Te suggère une tenue chaque matin selon la météo
💬 Répond à tes questions mode comme un vrai styliste

100% gratuit pour commencer — 100% en français

[lien ProductHunt] ← Un upvote ça compte énormément 🙏"
```

---

## Phase 6 — Acquisition Organique

### Micro-influenceurs mode (0€ ou gifting)
```
Cible : 5K-50K abonnés, mode/lifestyle, FR/BE/CH
Approche : DM personnalisé avec accès Premium 3 mois
Message type :
  "Bonjour [Prénom], j'adore ton feed sur [sujet].
   J'ai créé DigitalStylist, un styliste IA qui analyse les gardes-robes.
   Je t'offre 3 mois Premium (valeur €9) pour que tu le testes.
   Si tu aimes, un post/story serait super — mais 0 obligation.
   Tu veux essayer ?"
```

### Partenariats écoles de mode
```
Cibles : IFM Paris, ESMOD, Studio Berçot, LISAA
Offre : Comptes Premium illimités pour étudiants (usage éducatif)
Pitch : "Outil pédagogique IA pour analyser et composer des looks"
Bénéfice : Légitimité + bouche-à-oreille captive
```

### Reddit / Forums
```
Subreddits :
- r/frugalmalefashion (FR équivalent)
- r/femalefashionadvice
- r/malefashionadvice
- r/france (lifestyle)

Type de post qui fonctionne :
  "J'ai analysé 100 gardes-robes avec une IA — voici ce que j'ai appris sur les couleurs"
  (contenu éducatif pur, pas de pub, lien dans les commentaires si demandé)
```

---

## Format du rapport de sortie

```
## RAPPORT MARKETING — Digital Stylist
Date : [aujourd'hui]

### Score Marketing Actuel
SEO         [██░░░] — Meta/OG : OK/NON | Blog : 0 articles
Social      [░░░░░] — TikTok : 0 vidéos | Instagram : 0 posts
Acquisition [░░░░░] — Influenceurs : 0 | ProductHunt : non lancé
Conversion  [███░░] — Onboarding : OK | Emails : NON

### Actions Immédiates (cette semaine)
1. [Action concrète avec fichier à modifier]
2. [Action concrète]
3. [Action concrète]

### Plan Contenu 30 Jours
[Calendrier semaine par semaine]

### KPIs à mesurer
- Visites organiques / semaine
- Taux conversion visite → inscription
- Taux conversion free → premium
- Clics affiliés / suggestion vue
```

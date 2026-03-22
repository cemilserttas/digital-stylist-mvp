# /retention — Valeur Ajoutée & Rétention Utilisateur

Lis `CLAUDE.md` (modèle économique + différenciation) avant de commencer.
Digital Stylist doit devenir une **habitude quotidienne** — pas une app qu'on oublie après 3 jours.
La rétention est le moteur de toute la monétisation. Sans rétention, pas de premium, pas d'affiliation.

**Modes disponibles :**
- `/retention` — audit complet rétention + plan d'action
- `/retention loops` — analyser et renforcer les habit loops de l'app
- `/retention push` — stratégie notifications push (contenu, timing, fréquence)
- `/retention churn` — diagnostiquer et traiter le churn (abandons)
- `/retention loyalty` — système de récompenses et fidélisation
- `/retention scoring` — calculer l'engagement score utilisateur

---

## Phase 1 — Audit Rétention Actuelle

### Métriques de rétention à mesurer
```
D1  (rétention J+1)  : [__]%  cible: >40%
D7  (rétention J+7)  : [__]%  cible: >20%
D30 (rétention J+30) : [__]%  cible: >10%
DAU/MAU ratio        : [__]%  cible: >15% (app santé)

Sessions par utilisateur/semaine : [__]  cible: >3
Durée session moyenne            : [__]min
Retour après 1er abandon         : [__]%
```

### Signaux de rétention forte (indicateurs à implémenter)
```typescript
// Définition utilisateur "engagé" (à adapter selon données réelles)
const isEngaged = (user: User) => ({
  uploads_last_7_days: user.items_count > 5,        // A uploadé
  suggestions_viewed: user.suggestion_clicks > 3,    // A utilisé les suggestions
  chat_used: user.chat_messages > 5,                 // A utilisé le chat
  returned_after_3_days: true,                       // Est revenu
  // → score engagement = somme des true (0-4)
})
```

---

## Phase 2 — Habit Loops (Boucles d'Habitude)

### Modèle Nir Eyal — The Hook

```
TRIGGER → ACTION → REWARD → INVESTMENT
```

**Loop principal Digital Stylist**
```
TRIGGER   : Notification 7h30 "Voilà ton look pour Paris 18°C ☀️"
ACTION    : Ouvrir l'app → voir la suggestion
REWARD    : Look personnel adapté à la météo, immédiat, sans effort
INVESTMENT: Uploader plus de vêtements → suggestions encore meilleures
```

**Loops secondaires à activer**
```
Loop 2 — Score social
  TRIGGER  : "Tu as reçu un ❤️ sur ton look partagé"
  ACTION   : Ouvrir l'app
  REWARD   : Validation sociale
  INVEST.  : Partager plus

Loop 3 — Streak
  TRIGGER  : Fin de journée "Ta streak est à 5 jours 🔥"
  ACTION   : Ouvrir l'app pour maintenir la streak
  REWARD   : Badge streak + sentiment d'accomplissement
  INVEST.  : Continuer chaque jour

Loop 4 — Amélioration progressive
  TRIGGER  : "Ta garde-robe a grandi ! Nouvel aperçu disponible 👀"
  ACTION   : Voir les nouvelles analytics (couleurs, occasions, score)
  REWARD   : Insight sur son propre style
  INVEST.  : Uploader plus
```

---

## Phase 3 — Stratégie Push Notifications

### Règles d'or
```
✅ Personnalisée : "Sarah, voilà ton look pour Bordeaux 22°C"
✅ Utile d'abord : valeur avant promotion
✅ Bien timée : 7h00-8h30 pour le look du jour
✅ Peu fréquente : max 1/jour (sauf événement important)
❌ Jamais générique : "Nouvelles suggestions disponibles !"
❌ Jamais la nuit : respecter 22h-7h00
❌ Jamais promotionnelle seule : premium push uniquement si inactif >7j
```

### Calendrier push (fichier: `backend/app/services/weather_cron.py`)

```python
# Mapping des types de notifications à implémenter
PUSH_SCHEDULE = {
    "morning_look": {
        "time": "07:30",
        "condition": "user.push_notifications_enabled AND user.push_city",
        "template": "Bonjour {prenom} ! Aujourd'hui à {ville} : {temp}°C {emoji}. Voilà ton look →",
        "frequency": "daily",
        "ab_test": True  # Tester 7h00 vs 7h30 vs 8h00
    },
    "streak_reminder": {
        "time": "20:00",
        "condition": "user.streak > 3 AND NOT opened_today",
        "template": "Ta streak de {streak} jours est en jeu 🔥 — un look vite fait ?",
        "frequency": "daily_if_inactive"
    },
    "new_insight": {
        "time": "18:00",
        "condition": "user.items_count changed (new upload milestone)",
        "template": "Ta garde-robe a {count} pièces ! Voilà ton profil couleurs mis à jour 🎨",
        "frequency": "on_event"
    },
    "winback_day7": {
        "time": "10:00",
        "condition": "last_seen > 7 days AND NOT premium",
        "template": "{prenom}, ça fait une semaine ! La météo à {ville} change — ton look aussi 👀",
        "frequency": "once_per_week_max"
    },
    "winback_day30": {
        "time": "10:00",
        "condition": "last_seen > 30 days",
        "template": "On a manqué ta garde-robe, {prenom} ! On t'offre 7 suggestions gratuites pour ton retour 🎁",
        "frequency": "once"
    }
}
```

### A/B test timing push
```
Test A : 7h00 — pour les lève-tôt / actifs
Test B : 7h30 — timing actuel
Test C : 8h00 — pour les plus tardifs
Métrique : open rate + retention D7
```

---

## Phase 4 — Système de Loyalty & Gamification

### Streaks (Implémentation recommandée)

```python
# backend/app/models.py — champs à ajouter
class User(UserBase, table=True):
    # ... champs existants ...
    streak_current: int = Field(default=0)           # Jours consécutifs
    streak_max: int = Field(default=0)               # Record personnel
    streak_last_activity: Optional[date] = None      # Dernière activité

# Logique à ajouter dans wardrobe.py et main.py
# Incrémenter streak quand user utilise l'app (upload ou suggestion vue)
```

```typescript
// frontend — composant StreakBadge
// Afficher dans le header si streak > 0
{user.streak_current > 0 && (
  <div className="flex items-center gap-1 bg-orange-500/15 text-orange-400
                  border border-orange-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
    🔥 {user.streak_current}j
  </div>
)}
```

### Milestones & Badges
```
Badges à implémenter (progression visible dans UserSettings ou profil) :

🌱 Newbie       — 1er vêtement uploadé
👗 Stylé        — 10 vêtements dans la garde-robe
🎨 Coloriste    — 5 couleurs différentes dans la garde-robe
💬 Bavard       — 20 messages envoyés au styliste
🔥 Accroché     — Streak de 7 jours
💎 Premium      — Membre Premium (badge permanent)
🌟 Trendsetter  — A partagé 5 looks

// Implémenter en table badge_earned(user_id, badge_id, earned_at)
// Notification toast au déclenchement de chaque badge
```

### Points & Récompenses
```
Système de points Digital Style Score (DSS) :

+10 pts — Upload vêtement
+5  pts — Suggestion vue
+3  pts — Message chat
+20 pts — Look partagé
+50 pts — Ami invité (referral)

Paliers et récompenses :
Bronze  (0-99 pts)   — statut de base
Silver  (100-499 pts) — accès early features (nouveaux themes de l'app)
Gold    (500-999 pts) — 1 mois premium offert
Diamond (1000+ pts)   — badge exclusif + mention dans l'app
```

---

## Phase 5 — Anti-Churn (Récupération des Utilisateurs Perdus)

### Segmentation utilisateurs inactifs
```python
# Segments à identifier en base
segments = {
    "at_risk":     "last_seen entre 4 et 7 jours",     # Intervention légère
    "churning":    "last_seen entre 8 et 30 jours",    # Intervention forte
    "churned":     "last_seen > 30 jours",             # Winback campaign
    "zombie":      "inscrit mais jamais revenu après J1", # Onboarding failed
}
```

### Actions par segment
```
AT_RISK (4-7j inactif)
→ Push notification personnalisée météo
→ Email "Tu nous manques + look du moment"
→ Aucun discount (trop tôt)

CHURNING (8-30j)
→ Push "Ton look pour cette semaine t'attend"
→ Email avec recap des nouvelles tenues possibles
→ Offre : "7 suggestions gratuites offertes"

CHURNED (30j+)
→ Email "Nouvelle version de l'app — viens voir"
→ Offre : "1 mois premium gratuit pour ton retour"
→ Si pas de réaction : sortir de la liste (ne pas spammer)

ZOMBIE (jamais revu après J1)
→ Email J+2 : "As-tu eu un problème ?"
→ Email J+7 : "On t'offre un accès guidé — 15 minutes pour découvrir"
→ Push J+3 si activé : "Ta garde-robe t'attend !"
```

---

## Phase 6 — Valeur Ajoutée (Différenciation Long Terme)

### Features de rétention haute valeur

**Mémoire contextuelle** (Q3 priorité)
```
"La dernière fois que tu portais ce chino, c'était pour ton entretien.
Comment s'est-il passé ?"
→ Le styliste IA se souvient → lien émotionnel fort
```

**Évolution du style dans le temps**
```
"En 6 mois, ton style a évolué :
tu portes 40% moins de vêtements formels
et 60% plus de casual. Voilà tes 3 nouvelles pièces phares."
→ Rapport mensuel personnalisé (email + in-app)
```

**Recommandations saisonnières proactives**
```
Automne approche → "Voilà les 3 achats clés pour ta transition automne,
basés sur ce que tu as déjà"
→ Affiliation ciblée × pertinence élevée = CTR élevé
```

**Contexte occasion**
```
"Tu as un event dans 3 jours" (intégration calendrier)
→ Préparation look en avance
→ Réduction du stress = valeur émotionnelle
```

---

## Format du rapport de sortie

```
## RAPPORT RÉTENTION — Digital Stylist
Date : [aujourd'hui]

### Métriques actuelles vs cibles
D1  : [__]% (cible 40%) → [OK / ⚠️ SOUS-PERFORMANT]
D7  : [__]% (cible 20%) → [...]
D30 : [__]% (cible 10%) → [...]

### Habit loops actifs vs manquants
✅ Morning push (météo + look) — configuré
⬜ Streak system — non implémenté → PRIORITÉ HAUTE
⬜ Badges/milestones — absent
⬜ Winback email J7/J30 — absent

### Plan d'action rétention (3 semaines)
Semaine 1 : [Actions concrètes + fichiers à modifier]
Semaine 2 : [...]
Semaine 3 : [...]

### Impact estimé sur D30
Avant : [__]%
Après (estimé) : [__]% (+[__] pts)
```

# Digital Stylist — Roadmap Production & Growth

> Score actuel : **7.5/10** — MVP solide. Ce document décrit les leviers pour atteindre 9.5/10 et un lancement commercial sérieux.

---

## ✅ Implémenté dans cette session

| Fonctionnalité | Impact |
|---|---|
| **Planning tenues 7 jours** (OutfitCalendar) | Rétention +40% — les utilisateurs reviennent chaque matin |
| **Rate limiting** (slowapi, 10/h suggestions, 30/h chat) | Sécurité prod, protection coûts Gemini |
| **Admin analytics avancé** (signups/jour, top marques, CA estimé) | Business intelligence pour piloter la croissance |
| **PWA manifest** (installable sur mobile) | Adoption mobile sans app store |
| **SEO + OpenGraph + Twitter Cards** | Partage social viral, référencement naturel |
| **OutfitPlan model + API** (CRUD complet, JWT protégé) | Infrastructure pour nouvelles features |

---

## 🔴 P0 — Blockers Production (à faire avant launch)

### 1. Remplacer SQLite par PostgreSQL
SQLite ne supporte pas les connexions concurrentes en prod multi-instances (Render scale-out).
```python
# DATABASE_URL = "postgresql+asyncpg://user:pass@host/db"
# pip install asyncpg psycopg2-binary
```
**Migration Alembic** : `alembic revision --autogenerate -m "migrate_to_postgres"`

### 2. Stockage images sur CDN (Cloudflare R2 ou AWS S3)
Actuellement les images sont sur le disque du serveur Render — elles sont **perdues** à chaque redéploiement.
```python
# services/storage_service.py
# upload_to_r2(file_bytes, filename) → public_url
```
Coût estimé R2 : ~$0.015/GB/mois. Pour 10K users avec 50 images × 500KB = ~$3.75/mois.

### 3. Variables d'environnement Render/Vercel
S'assurer que ces variables sont définies :
```
# Backend (Render)
GEMINI_API_KEY=...
ADMIN_KEY=...  # min 32 chars
JWT_SECRET_KEY=...  # min 64 chars, random
DATABASE_URL=postgresql+asyncpg://...
LOG_LEVEL=INFO

# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://your-app.onrender.com
```

### 4. Auth sur l'upload wardrobe
`POST /wardrobe/upload` accepte actuellement des uploads sans JWT. À corriger :
```python
# wardrobe.py — ajouter le paramètre
current_user: User = Depends(get_current_user)
```

---

## 🟠 P1 — Fonctionnalités Différenciantes (Sprint 1 — 2 semaines)

### 5. Suppression de fond automatique (rembg)
Réduit la friction à l'upload : les photos deviennent des fiches produit propres.
```python
# pip install rembg
from rembg import remove
clean_image = remove(image_bytes)
```
Alternative SaaS : remove.bg API (~$0.02/image, intégrer via `requests`).

### 6. Liens d'affiliation réels
Remplacer les redirections Google Shopping par des liens d'affiliation trackés.

| Réseau | Marques | Commission |
|---|---|---|
| **Amazon Associates** | Levi's, Nike, Adidas, UNIQLO | 3-5% |
| **Awin** | Zara, ASOS, Mango, COS | 5-8% |
| **Rakuten** | Ralph Lauren, Tommy Hilfiger | 4-7% |
| **Effiliation** | H&M, La Redoute (FR) | 5-10% |

```python
# Modèle de lien affilié
AFFILIATE_LINKS = {
    "Amazon": "https://www.amazon.fr/s?k={query}&tag=YOUR_TAG",
    "ASOS": "https://www.asos.com/search/?q={query}&affid=YOUR_ID",
}
```

### 7. Notifications push matinales (Firebase Cloud Messaging)
L'USP principale du projet : recevoir sa suggestion de tenue chaque matin selon la météo.
```
Architecture :
1. User autorise les notifications → save FCM token dans DB
2. Cron job 7h00 → récupère météo par ville → appelle Gemini → envoie notification
3. Notification contient le résumé du look du jour
```
Stack : Firebase Admin SDK + APScheduler ou Render Cron Jobs.

### 8. Partage social (Instagram / TikTok Story)
Génère une carte visuelle partageable de l'outfit du jour.
```typescript
// Utilise html2canvas pour capturer l'OutfitCalendar card
// Génère une image 1080x1920 avec branding Digital Stylist
// Bouton "Partager sur Instagram" → navigator.share() API
```
**Potentiel viral énorme** : chaque partage = publicité gratuite.

---

## 🟡 P2 — Croissance & Monétisation (Sprint 2 — 1 mois)

### 9. Modèle Freemium (gate les features premium)

| Feature | Free | Premium (€2.99/mois) |
|---|---|---|
| Garde-robe | 20 pièces | Illimité |
| Suggestions IA | 1/jour | Illimité |
| Chat styliste | 5 messages/jour | Illimité |
| Planning | 7 jours | 30 jours |
| Suppression fond | ❌ | ✅ |
| Export look (PDF) | ❌ | ✅ |

Implementation : ajouter `is_premium: bool` + `premium_until: datetime` au modèle User.

### 10. Programme de parrainage
```
Parraine 3 amis → 1 mois Premium offert
```
- Génère un code de parrainage unique par user (`REF_PRENOM_XXXX`)
- Track les conversions en DB
- Envoie un email de remerciement

### 11. Analyse couleurs garde-robe
Endpoint qui analyse les couleurs dominantes de tous les vêtements et retourne :
- Palette de couleurs de la garde-robe
- Couleurs manquantes pour une garde-robe capsule
- Score de polyvalence (combien de tenues possibles)

```python
# GET /wardrobe/{user_id}/analytics
{
  "palette": ["#2C3E50", "#E8D5C4", "#8E44AD"],
  "polyvalence_score": 7.2,
  "missing_colors": ["Blanc cassé", "Beige"],
  "total_outfits_possible": 42
}
```

### 12. Score de garde-robe IA
Gemini analyse l'ensemble de la garde-robe et donne :
- Score global de style (1-10)
- Répartition casual/habillé/sport
- Top 3 tenues recommandées avec les pièces existantes
- Liste des "quick wins" (1 achat qui débloquerait 10 nouvelles tenues)

### 13. Intégration météo plus riche
Remplacer Open-Meteo par une API avec :
- Prévisions 7 jours (pour le planning tenues)
- Index UV (protection solaire)
- Indice de confort vestimentaire
Recommandation : **WeatherAPI** (gratuit jusqu'à 1M appels/mois).

---

## 🟢 P3 — Scale & Infrastructure (Sprint 3 — 3 mois)

### 14. Cache Redis (réduire les coûts Gemini)
```python
# Cacher les suggestions 6 heures par user+météo
CACHE_KEY = f"suggestions:{user_id}:{temp}:{weather_code}"
# redis-py ou upstash (serverless Redis)
```
Économie estimée : -60% de requêtes Gemini = -60% de coûts IA.

### 15. Queue de jobs asynchrones (Celery + Redis)
Pour les tâches longues (analyse d'image, génération suggestions) :
```python
# tasks.py
@celery_app.task
def analyze_clothing_async(image_path, user_id):
    result = analyze_clothing_image(...)
    # Notifie le frontend via WebSocket
```
Avantage : l'upload répond en <200ms au lieu de 3-8s.

### 16. Monitoring & Observabilité
```python
# pip install sentry-sdk
import sentry_sdk
sentry_sdk.init(dsn="...", traces_sample_rate=0.1)
```
- **Sentry** : error tracking en temps réel
- **PostHog** (self-hosted) : analytics comportementaux
- **UptimeRobot** : monitoring uptime gratuit

### 17. Tests E2E avec Playwright
```typescript
// tests/e2e/upload-flow.spec.ts
test('upload vêtement et voir analyse IA', async ({ page }) => {
  await page.goto('/');
  // login → upload photo → vérifier analyse IA → vérifier garde-robe
});
```

### 18. CI/CD amélioré
Le GitHub Actions existant couvre les tests unitaires. Ajouter :
- Staging environment (branch `develop` → Render staging)
- Test de performance (k6 ou Artillery)
- Review apps automatiques pour les PRs

---

## 📱 P4 — Mobile Natif (6 mois)

### Option A — Capacitor (recommandé, 2 semaines de travail)
Convertit le Next.js existant en app iOS/Android native.
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Digital Stylist" "com.digitalstylist.app"
npx cap add ios android
```
Avantage : réutilise 100% du code existant.

### Option B — React Native Expo (recommandé pour app store)
App mobile native complète avec caméra intégrée, haptic feedback, push notifications natives.

---

## 🎯 Marketing & Acquisition

### Canaux gratuits (0-3 mois)
1. **TikTok "Outfit of the Day" Challenge** : filmer le chatbot en action, montrer la transformation garde-robe
2. **ProductHunt Launch** : préparer les assets (video démo 60s, screenshots), lancer un lundi
3. **Reddit r/femalefashionadvice, r/malefashionadvice** : posts éducatifs sur l'analyse IA
4. **Instagram Reels** : before/after de garde-robes analysées par l'IA

### SEO (contenu)
Blog articles :
- "Comment créer une garde-robe capsule avec l'IA" (high intent)
- "Les 5 morphologies et comment s'habiller selon la sienne"
- "Palettes de couleurs tendance printemps 2026"

### Partenariats
- **Micro-influenceurs mode** (10K-100K abonnés) : gifting de comptes Premium
- **Écoles de mode** (IFM, ESMOD) : offre étudiante -50%
- **Marques partenaires** (UNIQLO, Sandro, Maje) : contenu co-brandé

---

## 💰 Projections Financières

| Métrique | M3 | M6 | M12 |
|---|---|---|---|
| Utilisateurs actifs | 500 | 2,000 | 10,000 |
| Taux conversion Premium | 5% | 8% | 10% |
| Revenue Premium (€2.99/mois) | €75/mois | €478/mois | €2,990/mois |
| Revenue affiliation (est.) | €150/mois | €800/mois | €5,000/mois |
| **Total MRR** | **€225** | **€1,278** | **€7,990** |

> Ces chiffres sont conservateurs. Un lancement viral TikTok peut multiplier par 10 en 48h.

---

## 🔧 Commandes utiles

```bash
# Installer les nouvelles dépendances backend
cd backend && pip install slowapi==0.1.9

# Créer la migration Alembic pour OutfitPlan
cd backend && alembic revision --autogenerate -m "add_outfit_plan"
cd backend && alembic upgrade head

# Build frontend production
cd frontend && npm run build

# Vérifier que tout compile
cd backend && python -c "from app.main import app; print('OK')"
cd frontend && npm run build 2>&1 | tail -5
```

# Digital Stylist MVP 👗🤖

Application de styliste personnel propulsée par l'IA (Google Gemini). Uploadez vos vêtements, obtenez une analyse détaillée et des conseils de combinaison avec des liens e-shop.

## 🚀 Fonctionnalités

- **Analyse IA multi-vêtements** : Détecte tous les vêtements sur une photo (type, couleur, textile, style, coupe)
- **Conseils de style** : L'IA suggère comment porter chaque pièce
- **Recommandations shopping** : Produits complémentaires avec liens vers Zalando, Amazon, ASOS
- **Gestion de garde-robe** : Upload, modification, suppression de vêtements
- **Profil utilisateur** : Morphologie et préférences de style

## 🛠️ Stack technique

### Backend
- **FastAPI** (Python) — API REST asynchrone
- **SQLModel** + **SQLite** — ORM et base de données
- **Google Gemini 2.0 Flash** — Analyse d'image IA

### Frontend
- **Next.js 16** (TypeScript) — Framework React
- **Tailwind CSS** — Styling
- **Lucide Icons** — Icônes

## 📦 Installation

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Éditez .env et ajoutez votre clé GEMINI_API_KEY
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application sera disponible sur :
- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- API Docs : http://localhost:8000/docs

## 🔑 Configuration

Créez un fichier `backend/.env` avec :
```
GEMINI_API_KEY=votre_clé_api_gemini
```

Obtenez une clé sur [Google AI Studio](https://aistudio.google.com/app/apikey).

## 📸 Utilisation

1. Créez votre profil (prénom + morphologie)
2. Uploadez une photo de vêtement
3. L'IA analyse automatiquement tous les vêtements visibles
4. Cliquez sur **Détails** pour voir l'analyse complète
5. Naviguez entre les pièces détectées avec les onglets
6. Découvrez les produits recommandés avec liens d'achat

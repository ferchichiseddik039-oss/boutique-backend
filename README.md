# 🚀 Backend API - Boutique Vêtements

## 📋 Description
Backend API pour la boutique de vêtements AYNEXT, déployé sur Render.com.

## 🛠️ Technologies
- **Node.js** + **Express.js**
- **MongoDB** (Atlas)
- **JWT** pour l'authentification
- **CORS** pour la communication frontend
- **Multer** pour l'upload d'images

## 🔧 Configuration

### Variables d'Environnement Requises
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/boutique
JWT_SECRET=your-super-secret-jwt-key-2024-change-this
NODE_ENV=production
CORS_ORIGIN=https://frontend-vercel-1m52v3e0y-seddik-s-projects-c94a56ab.vercel.app
```

## 🚀 Déploiement sur Render.com

### 1. Créer un Web Service
- Aller sur [Render.com](https://render.com)
- Cliquer sur "New +" > "Web Service"
- Connecter le repository GitHub

### 2. Configuration
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: `Node`

### 3. Variables d'Environnement
Ajouter toutes les variables dans Render Dashboard.

## 📱 API Endpoints

### Santé
- `GET /api/health` - Vérification de santé

### Test
- `GET /api/test` - Test de fonctionnement

## 🔗 Frontend
Frontend déployé sur Vercel : https://frontend-vercel-1m52v3e0y-seddik-s-projects-c94a56ab.vercel.app

## 📞 Support
Contact : ferchichiseddik039@gmail.com


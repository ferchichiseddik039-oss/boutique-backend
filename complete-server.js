const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://frontend-vercel-a1r2xvt24-seddik-s-projects-c94a56ab.vercel.app',
    'https://frontend-vercel-1m52v3e0y-seddik-s-projects-c94a56ab.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend Render fonctionne !',
    timestamp: new Date().toISOString()
  });
});

// Settings endpoint
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    settings: {
      informationsGenerales: {
        nomBoutique: "AYNEXT",
        email: "contact@aynext.com",
        telephone: "+216 XX XXX XXX",
        adresse: {
          rue: "123 Rue de la Mode",
          ville: "Paris",
          codePostal: "75001"
        }
      },
      paiement: {
        stripe: {
          active: false,
          clePublique: "",
          cleSecrete: ""
        },
        paypal: {
          active: false,
          clientId: "",
          clientSecret: ""
        }
      },
      livraison: {
        fraisFixes: 10,
        livraisonGratuite: 50,
        delais: {
          standard: "3-5 jours",
          express: "1-2 jours"
        }
      },
      boutique: {
        devise: "TND",
        langue: "fr",
        maintenance: false
      }
    }
  });
});

// Products endpoints
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    products: [],
    message: "Produits non disponibles - Backend en cours de configuration"
  });
});

app.get('/api/products/categories', (req, res) => {
  res.json({
    success: true,
    categories: ["Hoodies", "T-shirts", "Pantalons"]
  });
});

// Auth endpoints
app.post('/api/auth/connexion', (req, res) => {
  res.json({
    success: true,
    message: "Authentification non configurée - Backend en cours de configuration"
  });
});

app.get('/api/auth/check', (req, res) => {
  res.json({
    success: false,
    message: "Authentification non configurée"
  });
});

// Cart endpoint
app.get('/api/cart', (req, res) => {
  res.json({
    success: true,
    cart: {
      articles: [],
      total: 0
    }
  });
});

// Orders endpoint
app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    orders: [],
    message: "Commandes non disponibles - Backend en cours de configuration"
  });
});

// Users endpoint
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    user: {
      id: "demo-user",
      email: "demo@aynext.com",
      role: "user"
    }
  });
});

// Upload endpoint
app.post('/api/upload/product-images', (req, res) => {
  res.json({
    success: true,
    message: "Upload non configuré - Backend en cours de configuration",
    images: []
  });
});

// Admin endpoints
app.get('/api/admin/check', (req, res) => {
  res.json({
    success: false,
    message: "Admin non configuré"
  });
});

// Static files
app.use('/uploads', express.static('uploads'));
app.use('/images', express.static('public/images'));

// Serve manifest.json
app.get('/manifest.json', (req, res) => {
  res.json({
    "short_name": "Boutique Vêtements",
    "name": "Boutique de Vêtements en Ligne",
    "icons": [
      {
        "src": "favicon.ico",
        "sizes": "64x64 32x32 24x24 16x16",
        "type": "image/x-icon"
      }
    ],
    "start_url": ".",
    "display": "standalone",
    "theme_color": "#000000",
    "background_color": "#ffffff"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Serveur complet démarré sur le port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`⚙️ Settings: http://localhost:${PORT}/api/settings`);
});

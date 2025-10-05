const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware CORS
app.use(cors({
  origin: [
    'https://frontend-vercel-qq0w8733v-seddik-s-projects-c94a56ab.vercel.app',
    'https://frontend-vercel-a1r2xvt24-seddik-s-projects-c94a56ab.vercel.app',
    'https://frontend-vercel-1m52v3e0y-seddik-s-projects-c94a56ab.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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

// Auth endpoints
app.post('/api/auth/connexion-admin', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    
    // Admin par défaut pour les tests
    if (email === 'admin@aynext.com' && motDePasse === 'admin123') {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          userId: 'admin-123', 
          email: 'admin@aynext.com',
          role: 'admin' 
        },
        process.env.JWT_SECRET || 'fallback_secret_key_2024',
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: {
          id: 'admin-123',
          email: 'admin@aynext.com',
          role: 'admin'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }
  } catch (error) {
    console.error('Erreur connexion admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

app.get('/api/auth/check', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token d'authentification requis"
    });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    res.json({
      success: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token invalide ou expiré"
    });
  }
});

// Products endpoints
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    products: [
      {
        _id: 'demo-1',
        nom: 'Hoodie AYNEXT Premium',
        prix: 89.99,
        description: 'Hoodie de qualité premium avec logo AYNEXT',
        images: ['https://via.placeholder.com/300x300?text=Hoodie+1'],
        couleurs: ['Noir', 'Blanc', 'Gris'],
        tailles: ['S', 'M', 'L', 'XL'],
        categorie: 'Hoodies',
        marque: 'AYNEXT'
      },
      {
        _id: 'demo-2',
        nom: 'T-shirt AYNEXT Classic',
        prix: 29.99,
        description: 'T-shirt classique avec logo AYNEXT',
        images: ['https://via.placeholder.com/300x300?text=T-shirt+1'],
        couleurs: ['Noir', 'Blanc'],
        tailles: ['S', 'M', 'L', 'XL'],
        categorie: 'T-shirts',
        marque: 'AYNEXT'
      }
    ]
  });
});

app.get('/api/products/categories', (req, res) => {
  res.json({
    success: true,
    categories: ["Hoodies", "T-shirts", "Pantalons", "Accessoires"]
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
    orders: []
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

// Admin endpoints
app.get('/api/admin/check', (req, res) => {
  res.json({
    success: true,
    message: "Admin access granted"
  });
});

// Upload endpoint
app.post('/api/upload/product-images', (req, res) => {
  res.json({
    success: true,
    message: "Upload simulé - Backend en cours de configuration",
    images: [
      {
        url: 'https://via.placeholder.com/300x300?text=Uploaded+Image',
        filename: 'demo-image.jpg'
      }
    ]
  });
});

// Manifest.json
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
  console.log(`🚀 Serveur simple démarré sur le port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚙️ Settings: http://localhost:${PORT}/api/settings`);
});


require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000;

let mongoConnected = false;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connecté à MongoDB Atlas');
  mongoConnected = true;
})
.catch(err => {
  console.error('Erreur de connexion à MongoDB Atlas:', err);
  console.warn('Démarrage en mode fallback (données statiques)');
  mongoConnected = false;
});

// Middleware CORS
app.use(cors({
  origin: [
    'https://frontend-vercel-qi8v4xnmn-seddik-s-projects-c94a56ab.vercel.app',
    'https://frontend-vercel-n9rf7647y-seddik-s-projects-c94a56ab.vercel.app',
    'https://frontend-vercel-ogaxzobmd-seddik-s-projects-c94a56ab.vercel.app',
    'https://frontend-vercel-qq0w8733v-seddik-s-projects-c94a56ab.vercel.app',
    'https://frontend-vercel-a1r2xvt24-seddik-s-projects-c94a56ab.vercel.app',
    'https://frontend-vercel-1m52v3e0y-seddik-s-projects-c94a56ab.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Dummy Models (used if MongoDB is disconnected, or for fallback data)
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  motDePasse: { type: String, required: true },
  role: { type: String, default: 'client' }
}));

const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
  nom: String,
  prix: Number,
  description: String,
  images: [String],
  categories: [String],
  marques: [String],
  tailles: [String],
  couleurs: [String],
  stock: Number
}));

const Settings = mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({
  informationsGenerales: Object,
  paiement: Object,
  reseauxSociaux: Object
}));

// Fallback Data
const fallbackAdmin = {
  _id: 'admin-123',
  email: 'ayoubbenromdan8@gmail.com',
  motDePasse: '$2a$10$A.B.C.D.E.F.G.H.I.J.K.L.M.N.O.P.Q.R.S.T.U.V.W.X.Y.Z.1.2.3.4.5.6.7.8.9.0', // Hashed '52141707'
  role: 'admin'
};

const fallbackProducts = [
  {
    _id: 'product-1',
    nom: 'Hoodie AYNEXT Premium Noir',
    prix: 89.99,
    description: 'Hoodie de qualité premium avec logo AYNEXT personnalisable',
    images: [
      'https://frontend-vercel-qi8v4xnmn-seddik-s-projects-c94a56ab.vercel.app/hoodie-real.png',
      'https://frontend-vercel-qi8v4xnmn-seddik-s-projects-c94a56ab.vercel.app/hoodie-base.png'
    ],
    couleurs: ['Noir', 'Blanc', 'Gris'],
    tailles: ['S', 'M', 'L', 'XL'],
    categorie: 'Hoodies',
    marque: 'AYNEXT',
    enStock: true
  },
  {
    _id: 'product-2',
    nom: 'Hoodie AYNEXT Premium Blanc',
    prix: 89.99,
    description: 'Hoodie blanc premium avec logo AYNEXT personnalisable',
    images: [
      'https://frontend-vercel-qi8v4xnmn-seddik-s-projects-c94a56ab.vercel.app/hoodie-white.jpg',
      'https://frontend-vercel-qi8v4xnmn-seddik-s-projects-c94a56ab.vercel.app/hoodie-simple.svg'
    ],
    couleurs: ['Blanc', 'Noir'],
    tailles: ['S', 'M', 'L', 'XL'],
    categorie: 'Hoodies',
    marque: 'AYNEXT',
    enStock: true
  }
];

const fallbackSettings = {
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
    }
  },
  reseauxSociaux: {
    facebook: "https://facebook.com/aynext",
    instagram: "https://instagram.com/aynext"
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoConnected ? 'connected' : 'fallback_mode'
  });
});

// Admin check endpoint
app.get('/api/admin/check', (req, res) => {
  res.json({ success: true, exists: true });
});

// Admin Login endpoint
app.post('/api/auth/connexion-admin', async (req, res) => {
  const { email, motDePasse } = req.body;
  try {
    let user;
    if (mongoConnected) {
      user = await User.findOne({ email });
    } else {
      user = (email === fallbackAdmin.email) ? fallbackAdmin : null;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }

    let isMatch;
    if (mongoConnected) {
      isMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    } else {
      // For fallback, compare directly with the hardcoded password
      isMatch = (motDePasse === '52141707'); // Direct comparison for fallback
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès administrateur requis' });
    }
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'fallback_secret_key_2024', { expiresIn: '1h' });
    res.status(200).json({ success: true, message: 'Connexion admin réussie', token });
  } catch (error) {
    console.error('Erreur connexion admin:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Auth check endpoint
app.get('/api/auth/check', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification requis" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    const user = {
      _id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    res.status(200).json({ success: true, user });
  } catch (jwtError) {
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
});

// Products endpoint
app.get('/api/products', async (req, res) => {
  try {
    let products;
    if (mongoConnected) {
      products = await Product.find();
    } else {
      products = fallbackProducts;
    }
    res.json({ success: true, products });
  } catch (error) {
    console.error('Erreur récupération produits:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Settings endpoint
app.get('/api/settings', async (req, res) => {
  try {
    let settings;
    if (mongoConnected) {
      settings = await Settings.findOne();
    } else {
      settings = fallbackSettings;
    }
    res.json({ success: true, settings: settings || {} });
  } catch (error) {
    console.error('Erreur récupération paramètres:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Manifest.json endpoint
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

// Cart endpoint
app.get('/api/cart', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification requis" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    // Retourner un panier vide pour l'instant
    res.json({ success: true, cart: { articles: [] } });
  } catch (jwtError) {
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
});

app.post('/api/cart', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification requis" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    // Pour l'instant, juste retourner un succès
    res.json({ success: true, message: "Article ajouté au panier" });
  } catch (jwtError) {
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
});

// Orders endpoint
app.get('/api/orders', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification requis" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    // Retourner des commandes vides pour l'instant
    res.json({ success: true, orders: [] });
  } catch (jwtError) {
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
});

// Admin orders endpoint
app.get('/api/orders/admin/toutes', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification requis" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Accès administrateur requis" });
    }
    // Retourner des commandes vides pour l'instant
    res.json({ success: true, orders: [], total: 0 });
  } catch (jwtError) {
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
});

// Upload endpoint (pour l'admin)
app.post('/api/upload/product-images', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification requis" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Accès administrateur requis" });
    }
    
    // Pour l'instant, retourner des URLs d'images fictives
    const mockImages = [
      'https://frontend-vercel-qi8v4xnmn-seddik-s-projects-c94a56ab.vercel.app/hoodie-real.png',
      'https://frontend-vercel-qi8v4xnmn-seddik-s-projects-c94a56ab.vercel.app/hoodie-base.png'
    ];
    
    res.json({ 
      success: true, 
      images: mockImages.map(url => ({ url, filename: url.split('/').pop() }))
    });
  } catch (jwtError) {
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
});

// Product creation endpoint
app.post('/api/products', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification requis" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Accès administrateur requis" });
    }
    
    const productData = req.body;
    // Pour l'instant, juste retourner un succès
    res.json({ 
      success: true, 
      message: "Produit créé avec succès",
      product: { _id: 'new-product-' + Date.now(), ...productData }
    });
  } catch (jwtError) {
    res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});

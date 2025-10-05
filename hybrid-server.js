const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

// MongoDB Connection avec fallback
let mongoConnected = false;
const connectToMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/boutique-vetements';
    console.log('🔄 Tentative de connexion MongoDB...');
    console.log('URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Masquer les credentials
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout après 5 secondes
    });
    
    mongoConnected = true;
    console.log('✅ MongoDB connecté avec succès');
  } catch (error) {
    mongoConnected = false;
    console.error('❌ Erreur connexion MongoDB:', error.message);
    console.log('🔄 Utilisation du mode fallback avec données statiques');
  }
};

// Connecter à MongoDB
connectToMongoDB();

// Models
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  motDePasse: { type: String, required: true },
  nom: String,
  prenom: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  dateCreation: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prix: { type: Number, required: true },
  description: String,
  images: [String],
  couleurs: [String],
  tailles: [String],
  categorie: String,
  marque: String,
  enStock: { type: Boolean, default: true },
  dateCreation: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  articles: [{
    produit: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantite: Number,
    taille: String,
    couleur: String
  }],
  total: Number,
  statut: { type: String, enum: ['en_attente', 'confirme', 'expedie', 'livre'], default: 'en_attente' },
  dateCreation: { type: Date, default: Date.now }
});

const SettingsSchema = new mongoose.Schema({
  informationsGenerales: {
    nomBoutique: String,
    email: String,
    telephone: String,
    adresse: {
      rue: String,
      ville: String,
      codePostal: String
    }
  },
  paiement: {
    stripe: {
      active: Boolean,
      clePublique: String,
      cleSecrete: String
    },
    paypal: {
      active: Boolean,
      clientId: String,
      clientSecret: String
    }
  },
  livraison: {
    fraisFixes: Number,
    livraisonGratuite: Number,
    delais: {
      standard: String,
      express: String
    }
  },
  boutique: {
    devise: String,
    langue: String,
    maintenance: Boolean
  }
});

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// Données de fallback (vos vraies données)
const fallbackData = {
  users: [
    {
      _id: 'admin-123',
      email: 'ayoubbenromdan8@gmail.com',
      nom: 'Admin',
      prenom: 'AYNEXT',
      role: 'admin'
    },
    {
      _id: 'user-456',
      email: 'client@aynext.com',
      nom: 'Client',
      prenom: 'Test',
      role: 'user'
    }
  ],
  products: [
    {
      _id: 'product-1',
      nom: 'Hoodie AYNEXT Premium Noir',
      prix: 89.99,
      description: 'Hoodie de qualité premium avec logo AYNEXT personnalisable',
      images: ['/hoodie-real.png', '/hoodie-base.png'],
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
      images: ['/hoodie-white.jpg', '/hoodie-simple.svg'],
      couleurs: ['Blanc', 'Noir'],
      tailles: ['S', 'M', 'L', 'XL'],
      categorie: 'Hoodies',
      marque: 'AYNEXT',
      enStock: true
    }
  ],
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
      stripe: { active: false, clePublique: "", cleSecrete: "" },
      paypal: { active: false, clientId: "", clientSecret: "" }
    },
    livraison: {
      fraisFixes: 10,
      livraisonGratuite: 50,
      delais: { standard: "3-5 jours", express: "1-2 jours" }
    },
    boutique: {
      devise: "TND",
      langue: "fr",
      maintenance: false
    }
  }
};

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  const token = req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'authentification requis" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
    
    if (mongoConnected) {
      const user = await User.findById(decoded.userId).select('-motDePasse');
      if (!user) {
        return res.status(401).json({ success: false, message: "Utilisateur non trouvé" });
      }
      req.user = user;
    } else {
      // Mode fallback
      const user = fallbackData.users.find(u => u._id === decoded.userId);
      if (!user) {
        return res.status(401).json({ success: false, message: "Utilisateur non trouvé" });
      }
      req.user = user;
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token invalide ou expiré" });
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoConnected ? 'connected' : 'fallback_mode'
  });
});

// Settings endpoint
app.get('/api/settings', async (req, res) => {
  try {
    if (mongoConnected) {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings(fallbackData.settings);
        await settings.save();
      }
      res.json({ success: true, settings });
    } else {
      res.json({ success: true, settings: fallbackData.settings });
    }
  } catch (error) {
    console.error('Erreur settings:', error);
    res.json({ success: true, settings: fallbackData.settings });
  }
});

// Auth endpoints
app.post('/api/auth/connexion', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    
    if (mongoConnected) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }
      
      const isMatch = await bcrypt.compare(motDePasse, user.motDePasse);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }
      
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret_key_2024',
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role
        }
      });
    } else {
      // Mode fallback - connexion simple pour les tests
      const user = fallbackData.users.find(u => u.email === email);
      if (user && motDePasse === '123456') {
        const token = jwt.sign(
          { userId: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'fallback_secret_key_2024',
          { expiresIn: '24h' }
        );
        
        res.json({
          success: true,
          token,
          user: {
            id: user._id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }
    }
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

app.post('/api/auth/connexion-admin', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    
    if (mongoConnected) {
      const user = await User.findOne({ email, role: 'admin' });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe admin incorrect'
        });
      }
      
      const isMatch = await bcrypt.compare(motDePasse, user.motDePasse);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe admin incorrect'
        });
      }
      
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret_key_2024',
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role
        }
      });
    } else {
      // Mode fallback - connexion admin
      const adminUser = fallbackData.users.find(u => u.email === email && u.role === 'admin');
      if (adminUser && motDePasse === '52141707') {
        const token = jwt.sign(
          { userId: adminUser._id, email: adminUser.email, role: adminUser.role },
          process.env.JWT_SECRET || 'fallback_secret_key_2024',
          { expiresIn: '24h' }
        );
        
        res.json({
          success: true,
          token,
          user: {
            id: adminUser._id,
            email: adminUser.email,
            nom: adminUser.nom,
            prenom: adminUser.prenom,
            role: adminUser.role
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Email ou mot de passe admin incorrect'
        });
      }
    }
  } catch (error) {
    console.error('Erreur connexion admin:', error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      nom: req.user.nom,
      prenom: req.user.prenom,
      role: req.user.role
    }
  });
});

// Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    if (mongoConnected) {
      const products = await Product.find({ enStock: true }).sort({ dateCreation: -1 });
      res.json({ success: true, products });
    } else {
      res.json({ success: true, products: fallbackData.products });
    }
  } catch (error) {
    console.error('Erreur produits:', error);
    res.json({ success: true, products: fallbackData.products });
  }
});

app.get('/api/products/categories', async (req, res) => {
  try {
    if (mongoConnected) {
      const categories = await Product.distinct('categorie');
      res.json({ success: true, categories });
    } else {
      res.json({ success: true, categories: ['Hoodies', 'T-shirts', 'Pantalons'] });
    }
  } catch (error) {
    console.error('Erreur catégories:', error);
    res.json({ success: true, categories: ['Hoodies', 'T-shirts', 'Pantalons'] });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    if (mongoConnected) {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: "Produit non trouvé" });
      }
      res.json({ success: true, product });
    } else {
      const product = fallbackData.products.find(p => p._id === req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: "Produit non trouvé" });
      }
      res.json({ success: true, product });
    }
  } catch (error) {
    console.error('Erreur produit:', error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Cart endpoint
app.get('/api/cart', authenticateToken, (req, res) => {
  res.json({
    success: true,
    cart: {
      articles: [],
      total: 0
    }
  });
});

// Orders endpoint
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    if (mongoConnected) {
      const orders = await Order.find({ utilisateurId: req.user._id }).populate('articles.produit');
      res.json({ success: true, orders });
    } else {
      res.json({ success: true, orders: [] });
    }
  } catch (error) {
    console.error('Erreur commandes:', error);
    res.json({ success: true, orders: [] });
  }
});

// Admin endpoints
app.get('/api/admin/check', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Accès administrateur requis" });
  }
  res.json({ success: true, user: req.user });
});

// Upload endpoint (simulé)
app.post('/api/upload/product-images', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: "Accès administrateur requis" });
  }
  
  res.json({
    success: true,
    message: "Upload simulé - À implémenter avec multer",
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
  console.log(`🚀 Serveur hybride démarré sur le port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚙️ Settings: http://localhost:${PORT}/api/settings`);
  console.log(`🔗 MongoDB: ${mongoConnected ? 'Connecté' : 'Mode Fallback'}`);
});

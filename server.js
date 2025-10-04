require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const passport = require('./src/config/passport');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuration de session et Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'aynext_session_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes API
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/upload', require('./src/routes/upload'));

// Serve static files from uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch all handler: send back React's index.html file if no route matches
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connecté:', socket.id);
  
  // Rejoindre la room admin pour les mises à jour en temps réel
  socket.on('join-admin', () => {
    socket.join('admin');
    console.log('Client rejoint la room admin:', socket.id);
    
    // Émettre immédiatement les statistiques mises à jour
    if (global.emitStatsUpdate) {
      console.log('📊 Émission des statistiques initiales pour le nouvel admin');
      global.emitStatsUpdate(io);
    }
  });

  // Quitter la room admin
  socket.on('leave-admin', () => {
    socket.leave('admin');
    console.log('Client quitte la room admin:', socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('Client déconnecté:', socket.id);
  });
});

// Fonction pour émettre les statistiques mises à jour
const emitStatsUpdate = async (io) => {
  try {
    const User = require('./src/lib/User');
    const Product = require('./src/lib/Product');
    const Order = require('./src/lib/Order');
    
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      recentOrders
    ] = await Promise.all([
      User.countDocuments({ role: 'client' }),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.find().sort({ dateCreation: -1 }).limit(5).populate('utilisateur', 'nom prenom email')
    ]);

    // Calculer le chiffre d'affaires (seulement les commandes confirmées)
    const confirmedOrders = await Order.find({ statut: 'confirmee' }, 'total');
    const chiffreAffaires = confirmedOrders.reduce((total, order) => total + (order.total || 0), 0);

    const stats = {
      totalUsers,
      totalProducts,
      totalOrders,
      chiffreAffaires,
      recentOrders
    };

    // Émettre les statistiques mises à jour à tous les admins connectés
    console.log('📊 Émission des statistiques WebSocket:', stats);
    io.to('admin').emit('stats-updated', stats);
    console.log('✅ Statistiques mises à jour émises via WebSocket');
  } catch (error) {
    console.error('Erreur lors de l\'émission des statistiques:', error);
  }
};

// Rendre la fonction accessible globalement
global.emitStatsUpdate = emitStatsUpdate;

// Rendre io accessible aux routes
app.set('io', io);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boutique-vetements', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connecté à MongoDB');
  server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
})
.catch(err => {
  console.error('Erreur de connexion MongoDB:', err);
  // Démarrer le serveur quand même pour les tests
  console.log('Démarrage du serveur sans MongoDB pour les tests...');
  server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT} (sans MongoDB)`);
  });
});

module.exports = app;

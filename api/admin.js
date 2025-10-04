const connectDB = require('./lib/mongodb.js');
const User = require('./lib/User.js');
const Product = require('./lib/Product.js');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Auth-Token'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Route based on the request
    if (pathname === '/api/admin/check' && req.method === 'GET') {
      // Check if admin exists (public endpoint)
      const adminCount = await User.countDocuments({ role: 'admin' });
      
      return res.status(200).json({
        success: true,
        exists: adminCount > 0,
        count: adminCount
      });
    }

    if (pathname === '/api/admin/setup' && req.method === 'POST') {
      // Create first admin
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        return res.status(400).json({ 
          success: false,
          message: 'Un compte administrateur existe déjà. Un seul compte admin est autorisé.' 
        });
      }

      const { email, motDePasse, nom, prenom } = req.body;

      if (!email || !motDePasse || !nom || !prenom) {
        return res.status(400).json({
          success: false,
          message: "Email, mot de passe, nom et prénom sont requis"
        });
      }

      const adminData = {
        email: email.toLowerCase(),
        motDePasse,
        nom,
        prenom,
        role: 'admin'
      };

      const admin = new User(adminData);
      await admin.save();

      return res.status(201).json({ 
        success: true,
        message: 'Compte administrateur créé avec succès',
        user: admin.toPublicJSON()
      });
    }

    if (pathname === '/api/admin/stats' && req.method === 'GET') {
      // Get admin stats (requires auth)
      const token = req.headers['x-auth-token'];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
      
      if (decoded.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Accès administrateur requis"
        });
      }

      // Get stats
      const totalUsers = await User.countDocuments({ role: 'client' });
      const totalProducts = await Product.countDocuments();
      
      const stats = {
        totalUsers,
        totalProducts,
        totalOrders: 0, // You can add Order model if needed
        chiffreAffaires: 0
      };

      return res.status(200).json({
        success: true,
        stats
      });
    }

    if (pathname === '/api/admin/verify' && req.method === 'GET') {
      // Verify admin token
      const token = req.headers['x-auth-token'];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
      
      if (decoded.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Accès administrateur requis"
        });
      }

      return res.status(200).json({
        success: true,
        role: "admin",
        message: "Admin connecté",
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        }
      });
    }

    return res.status(404).json({
      success: false,
      message: "Endpoint non trouvé"
    });

  } catch (error) {
    console.error('Erreur admin:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

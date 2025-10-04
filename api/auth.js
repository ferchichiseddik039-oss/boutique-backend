const connectDB = require('./lib/mongodb.js');
const User = require('./lib/User.js');
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
    if (pathname === '/api/auth/check' && req.method === 'GET') {
      // Check authentication
      const token = req.headers['x-auth-token'];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        const user = await User.findById(decoded.user?.id || decoded.userId).select('-motDePasse');
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Utilisateur non trouvé"
          });
        }

        return res.status(200).json({
          success: true,
          user: user.toPublicJSON()
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    if (pathname === '/api/auth/connexion' && req.method === 'POST') {
      // Client login
      const { email, motDePasse } = req.body;

      if (!email || !motDePasse) {
        return res.status(400).json({ 
          success: false, 
          message: "Email et mot de passe requis" 
        });
      }

      const user = await User.findOne({ 
        email: email.toLowerCase(),
        role: 'client'
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Identifiants invalides" 
        });
      }

      const isPasswordValid = await user.comparerMotDePasse(motDePasse);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: "Identifiants invalides" 
        });
      }

      if (!user.actif) {
        return res.status(401).json({ 
          success: false, 
          message: "Compte désactivé" 
        });
      }

      user.lastLogin = new Date();
      await user.save();

      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback_secret_key_2024',
        { expiresIn: '7d' }
      );

      return res.status(200).json({ 
        success: true, 
        token,
        user: user.toPublicJSON()
      });
    }

    if (pathname === '/api/auth/connexion-admin' && req.method === 'POST') {
      // Admin login
      const { email, motDePasse } = req.body;

      if (!email || !motDePasse) {
        return res.status(400).json({ 
          success: false, 
          message: "Email et mot de passe requis" 
        });
      }

      const admin = await User.findOne({ 
        email: email.toLowerCase(),
        role: 'admin'
      });
      
      if (!admin) {
        return res.status(401).json({ 
          success: false, 
          message: "Accès administrateur refusé" 
        });
      }

      const isPasswordValid = await admin.comparerMotDePasse(motDePasse);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: "Identifiants administrateur invalides" 
        });
      }

      if (!admin.actif) {
        return res.status(401).json({ 
          success: false, 
          message: "Compte administrateur désactivé" 
        });
      }

      admin.lastLogin = new Date();
      await admin.save();

      const token = jwt.sign(
        { 
          userId: admin._id, 
          email: admin.email, 
          role: 'admin' 
        },
        process.env.JWT_SECRET || 'fallback_secret_key_2024',
        { expiresIn: '8h' }
      );

      return res.status(200).json({ 
        success: true, 
        token,
        user: admin.toPublicJSON()
      });
    }

    if (pathname === '/api/auth/inscription' && req.method === 'POST') {
      // Client registration
      const { email, motDePasse, nom, prenom, telephone, adresse } = req.body;

      if (!email || !motDePasse || !nom || !prenom) {
        return res.status(400).json({ 
          success: false, 
          message: "Email, mot de passe, nom et prénom sont requis" 
        });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "Un utilisateur avec cet email existe déjà" 
        });
      }

      const userData = {
        email: email.toLowerCase(),
        motDePasse,
        nom,
        prenom,
        telephone,
        adresse,
        role: 'client'
      };

      const user = new User(userData);
      await user.save();

      const token = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback_secret_key_2024',
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        token,
        user: user.toPublicJSON()
      });
    }

    if (pathname === '/api/auth/utilisateur' && req.method === 'GET') {
      // Get user info
      const token = req.headers['x-auth-token'];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        const user = await User.findById(decoded.user?.id || decoded.userId).select('-motDePasse');
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "Utilisateur non trouvé"
          });
        }

        return res.status(200).json({
          success: true,
          user: user.toPublicJSON()
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: "Endpoint non trouvé"
    });

  } catch (error) {
    console.error('Erreur auth:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

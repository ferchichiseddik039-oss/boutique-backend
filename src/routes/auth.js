const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const User = require('../lib/User');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// @route   POST /api/auth/inscription
// @desc    Inscription d'un nouvel utilisateur
// @access  Public
router.post('/inscription', [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('prenom').notEmpty().withMessage('Le prénom est requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('motDePasse').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, prenom, email, motDePasse, telephone, adresse } = req.body;

    // Vérifier si l'utilisateur existe déjà
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    // Créer le nouvel utilisateur
    user = new User({
      nom,
      prenom,
      email,
      motDePasse,
      telephone,
      adresse
    });

    await user.save();

    // Émettre un événement WebSocket pour les statistiques mises à jour
    const io = req.app.get('io');
    if (io && global.emitStatsUpdate) {
      global.emitStatsUpdate(io);
    }

    // Créer le token JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'aynext_jwt_secret_key_2024_very_secure',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: user.toPublicJSON()
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   POST /api/auth/connexion
// @desc    Connexion d'un utilisateur (clients uniquement)
// @access  Public
router.post('/connexion', [
  body('email').isEmail().withMessage('Email invalide'),
  body('motDePasse').notEmpty().withMessage('Le mot de passe est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, motDePasse } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    // Vérifier que l'utilisateur n'est pas un admin
    if (user.role === 'admin') {
      return res.status(403).json({ 
        message: 'Les administrateurs doivent utiliser la page de connexion admin' 
      });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparerMotDePasse(motDePasse);
    if (!isMatch) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Créer le token JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'aynext_jwt_secret_key_2024_very_secure',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: user.toPublicJSON()
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   POST /api/auth/connexion-admin
// @desc    Connexion d'un administrateur
// @access  Public
router.post('/connexion-admin', [
  body('email').isEmail().withMessage('Email invalide'),
  body('motDePasse').notEmpty().withMessage('Le mot de passe est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, motDePasse } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    // Vérifier que l'utilisateur est un admin
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Accès réservé aux administrateurs' 
      });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparerMotDePasse(motDePasse);
    if (!isMatch) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Créer le token JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'aynext_jwt_secret_key_2024_very_secure',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: user.toPublicJSON()
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   POST /api/auth/check-user-role
// @desc    Vérifier le rôle d'un utilisateur par son email
// @access  Public
router.post('/check-user-role', [
  body('email').isEmail().withMessage('Email invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email }).select('role');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ role: user.role });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/auth/utilisateur
// @desc    Obtenir les informations de l'utilisateur connecté
// @access  Private
router.get('/utilisateur', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-motDePasse');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Routes OAuth Google
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: 'Google OAuth non configuré. Veuillez configurer les variables d\'environnement GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.' 
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // L'utilisateur est maintenant dans req.user grâce à Passport
      const user = req.user;
      
      console.log('🔄 Traitement callback Google OAuth pour utilisateur:', {
        id: user._id,
        email: user.email,
        nom: user.prenom + ' ' + user.nom,
        isOAuth: user.isOAuth
      });
      
      // Mettre à jour la dernière connexion
      user.lastLogin = new Date();
      await user.save();
      console.log('✅ Dernière connexion mise à jour');

      // Envoyer un email de bienvenue (seulement pour les nouveaux utilisateurs OAuth)
      if (user.isOAuth && user.googleId) {
        try {
          console.log('📧 Tentative d\'envoi de l\'email de bienvenue...');
          const emailResult = await emailService.sendWelcomeEmail(user);
          if (emailResult.success) {
            console.log('✅ Email de bienvenue envoyé avec succès à:', user.email);
          } else {
            console.log('⚠️ Email de bienvenue non envoyé:', emailResult.error);
            console.log('ℹ️ La connexion OAuth continue normalement');
          }
        } catch (emailError) {
          console.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue:', emailError.message);
          console.log('ℹ️ La connexion OAuth continue normalement');
          // Ne pas bloquer la connexion si l'email échoue
        }
      }

      // Créer le token JWT
      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'aynext_jwt_secret_key_2024_very_secure',
        { expiresIn: '7d' }
      );

      console.log('✅ Token JWT créé, redirection vers le frontend');
      // Rediriger vers le frontend avec le token
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/oauth-success?token=${token}`);
    } catch (error) {
      console.error('❌ Erreur lors de la connexion Google callback:', error);
      console.error('📋 Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_error`);
    }
  }
);

// Routes OAuth Facebook
router.get('/facebook', (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.status(503).json({ 
      message: 'Facebook OAuth non configuré. Veuillez configurer les variables d\'environnement FACEBOOK_APP_ID et FACEBOOK_APP_SECRET.' 
    });
  }
  passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // L'utilisateur est maintenant dans req.user grâce à Passport
      const user = req.user;
      
      // Mettre à jour la dernière connexion
      user.lastLogin = new Date();
      await user.save();

      // Créer le token JWT
      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'aynext_jwt_secret_key_2024_very_secure',
        { expiresIn: '7d' }
      );

      // Rediriger vers le frontend avec le token
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/oauth-success?token=${token}`);
    } catch (error) {
      console.error('Erreur lors de la connexion Facebook:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_error`);
    }
  }
);

module.exports = router;

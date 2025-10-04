const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../lib/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Obtenir le profil de l'utilisateur connecté
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-motDePasse');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   PUT /api/users/profile
// @desc    Mettre à jour le profil de l'utilisateur
// @access  Private
router.put('/profile', [auth, [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('prenom').notEmpty().withMessage('Le prénom est requis'),
  body('email').isEmail().withMessage('Email invalide')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, prenom, email, telephone, adresse } = req.body;

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { nom, prenom, email, telephone, adresse },
      { new: true, runValidators: true }
    ).select('-motDePasse');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   PUT /api/users/password
// @desc    Changer le mot de passe
// @access  Private
router.put('/password', [auth, [
  body('motDePasseActuel').notEmpty().withMessage('Mot de passe actuel requis'),
  body('nouveauMotDePasse').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { motDePasseActuel, nouveauMotDePasse } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier le mot de passe actuel
    const isMatch = await user.comparerMotDePasse(motDePasseActuel);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Mettre à jour le mot de passe
    user.motDePasse = nouveauMotDePasse;
    await user.save();

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/users/admin/tous
// @desc    Obtenir tous les utilisateurs (Admin)
// @access  Private (Admin)
router.get('/admin/tous', [auth, admin], async (req, res) => {
  try {
    const { page = 1, limit = 20, role, recherche } = req.query;
    
    const filtres = {};
    if (role) filtres.role = role;
    if (recherche) {
      filtres.$or = [
        { nom: { $regex: recherche, $options: 'i' } },
        { prenom: { $regex: recherche, $options: 'i' } },
        { email: { $regex: recherche, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(filtres)
      .select('-motDePasse')
      .sort({ dateCreation: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filtres);

    res.json({
      utilisateurs: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/users/admin/:id
// @desc    Obtenir un utilisateur par ID (Admin)
// @access  Private (Admin)
router.get('/admin/:id', [auth, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-motDePasse');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/users/admin/:id/stats
// @desc    Obtenir les statistiques d'un utilisateur (Admin)
// @access  Private (Admin)
router.get('/admin/:id/stats', [auth, admin], async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Vérifier que l'utilisateur existe
    const user = await User.findById(userId).select('-motDePasse');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Récupérer les commandes de l'utilisateur
    const Order = require('../lib/Order');
    const orders = await Order.find({ utilisateur: userId });
    
    // Calculer les statistiques
    const nombreCommandes = orders.length;
    const totalDepense = orders.reduce((total, order) => {
      // Ne compter que les commandes livrées ou confirmées
      if (order.statut === 'livree' || order.statut === 'confirmee' || order.statut === 'expediee') {
        return total + order.total;
      }
      return total;
    }, 0);

    res.json({
      utilisateur: user,
      statistiques: {
        nombreCommandes,
        totalDepense,
        commandes: orders
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   PUT /api/users/admin/:id
// @desc    Mettre à jour un utilisateur (Admin)
// @access  Private (Admin)
router.put('/admin/:id', [auth, admin], [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('prenom').notEmpty().withMessage('Le prénom est requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('role').isIn(['client', 'admin']).withMessage('Rôle invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, prenom, email, role, telephone, adresse, estActif } = req.body;

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { nom, prenom, email, role, telephone, adresse, estActif },
      { new: true, runValidators: true }
    ).select('-motDePasse');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   DELETE /api/users/admin/:id
// @desc    Supprimer un utilisateur (Admin)
// @access  Private (Admin)
router.delete('/admin/:id', [auth, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Empêcher la suppression de son propre compte
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;

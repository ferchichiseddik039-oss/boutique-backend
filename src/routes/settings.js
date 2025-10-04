const express = require('express');
const { body, validationResult } = require('express-validator');
const Settings = require('../lib/Settings');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Route de test simple
router.put('/test', (req, res) => {
  console.log('🧪 Route de test appelée');
  console.log('📦 Body:', req.body);
  res.json({ message: 'Test OK', body: req.body });
});

// @route   GET /api/settings
// @desc    Récupérer les paramètres de la boutique
// @access  Public (pour les clients) / Private (pour les admins)
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Si l'utilisateur n'est pas admin, ne pas exposer certaines informations sensibles
    if (!req.user || req.user.role !== 'admin') {
      // Masquer les informations sensibles pour les clients
      const publicSettings = {
        informationsGenerales: {
          nomBoutique: settings.informationsGenerales.nomBoutique,
          description: settings.informationsGenerales.description,
          email: settings.informationsGenerales.email,
          telephone: settings.informationsGenerales.telephone,
          adresse: settings.informationsGenerales.adresse,
          logo: settings.informationsGenerales.logo
        },
        livraison: {
          fraisLivraison: settings.livraison.fraisLivraison,
          fraisLivraisonGratuite: settings.livraison.fraisLivraisonGratuite,
          delaiLivraison: settings.livraison.delaiLivraison,
          zonesLivraison: settings.livraison.zonesLivraison,
          livraisonGratuite: settings.livraison.livraisonGratuite
        },
        paiement: {
          methodesActives: settings.paiement.methodesActives,
          informationsPaiement: settings.paiement.informationsPaiement
        },
        general: {
          devise: settings.general.devise,
          langue: settings.general.langue,
          maintenance: settings.general.maintenance
        }
      };
      
      return res.json(publicSettings);
    }
    
    // Pour les admins, retourner tous les paramètres
    res.json(settings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des paramètres' });
  }
});

// @route   PUT /api/settings
// @desc    Mettre à jour les paramètres de la boutique
// @access  Private (Admin seulement)
router.put('/', [auth, admin, [
  body('informationsGenerales.nomBoutique').optional().isString().trim(),
  body('informationsGenerales.description').optional().isString().trim(),
  body('informationsGenerales.email').optional().isEmail(),
  body('informationsGenerales.telephone').optional().isString().trim(),
  body('livraison.fraisLivraison').optional().isFloat({ min: 0 }),
  body('livraison.fraisLivraisonGratuite').optional().isFloat({ min: 0 }),
  body('livraison.delaiLivraison').optional().isString().trim(),
  body('paiement.methodesActives').optional().isArray(),
  body('general.devise').optional().isIn(['TND', 'EUR', 'USD']),
  body('general.langue').optional().isIn(['fr', 'en', 'ar'])
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Données invalides', 
        errors: errors.array() 
      });
    }

    const settings = await Settings.getSettings();
    const updatedSettings = await settings.updateSettings(req.body, req.user.id);

    // Émettre une mise à jour via WebSocket pour les admins connectés
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('settings-updated', {
        type: 'settings_updated',
        data: updatedSettings,
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Paramètres mis à jour avec succès',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des paramètres' });
  }
});

// @route   PUT /api/settings/livraison
// @desc    Mettre à jour spécifiquement les paramètres de livraison
// @access  Private (Admin seulement)
router.put('/livraison', [
  (req, res, next) => {
    console.log('🚀 Route /livraison appelée');
    console.log('📦 Body:', req.body);
    console.log('👤 User:', req.user);
    console.log('🔍 URL:', req.url);
    console.log('🔍 Method:', req.method);
    next();
  },
  auth, 
  admin, 
  [
    body('fraisLivraison').optional().isNumeric().isFloat({ min: 0 }),
    body('fraisLivraisonGratuite').optional().isNumeric().isFloat({ min: 0 }),
    body('delaiLivraison').optional().isString().trim(),
    body('zonesLivraison').optional().isArray(),
    body('livraisonGratuite').optional().isBoolean()
  ]
], async (req, res) => {
  try {
    console.log('📦 Données reçues pour livraison:', req.body);
    console.log('👤 Utilisateur:', req.user ? `${req.user.email} (${req.user.role})` : 'Non authentifié');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Erreurs de validation:', errors.array());
      return res.status(400).json({ 
        message: 'Données invalides', 
        errors: errors.array() 
      });
    }

    const settings = await Settings.getSettings();
    const updatedSettings = await settings.updateSettings({
      livraison: { ...settings.livraison, ...req.body }
    }, req.user.id);

    // Émettre une mise à jour via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('settings-updated', {
        type: 'delivery_updated',
        data: updatedSettings.livraison,
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Paramètres de livraison mis à jour avec succès',
      livraison: updatedSettings.livraison
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres de livraison:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des paramètres de livraison' });
  }
});

// @route   PUT /api/settings/paiement
// @desc    Mettre à jour spécifiquement les paramètres de paiement
// @access  Private (Admin seulement)
router.put('/paiement', [auth, admin, [
  body('methodesActives').optional().isArray(),
  body('informationsPaiement').optional().isObject()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Données invalides', 
        errors: errors.array() 
      });
    }

    const settings = await Settings.getSettings();
    const updatedSettings = await settings.updateSettings({
      paiement: { ...settings.paiement, ...req.body }
    }, req.user.id);

    // Émettre une mise à jour via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('settings-updated', {
        type: 'payment_updated',
        data: updatedSettings.paiement,
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Paramètres de paiement mis à jour avec succès',
      paiement: updatedSettings.paiement
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres de paiement:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des paramètres de paiement' });
  }
});


// @route   PUT /api/settings/general
// @desc    Mettre à jour les paramètres généraux
// @access  Private (Admin seulement)
router.put('/general', [auth, admin, [
  body('devise').optional().isIn(['TND', 'EUR', 'USD']),
  body('langue').optional().isIn(['fr', 'en', 'ar']),
  body('maintenance.active').optional().isBoolean(),
  body('maintenance.message').optional().isString().trim()
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Données invalides', 
        errors: errors.array() 
      });
    }

    const settings = await Settings.getSettings();
    const updatedSettings = await settings.updateSettings({
      general: { ...settings.general, ...req.body }
    }, req.user.id);

    // Émettre une mise à jour via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('settings-updated', {
        type: 'general_updated',
        data: updatedSettings.general,
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Paramètres généraux mis à jour avec succès',
      general: updatedSettings.general
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres généraux:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des paramètres généraux' });
  }
});

// @route   POST /api/settings/reset
// @desc    Réinitialiser les paramètres aux valeurs par défaut
// @access  Private (Admin seulement)
router.post('/reset', [auth, admin], async (req, res) => {
  try {
    // Supprimer les paramètres existants
    await Settings.deleteMany({});
    
    // Créer de nouveaux paramètres avec les valeurs par défaut
    const newSettings = new Settings();
    await newSettings.save();

    // Émettre une mise à jour via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('settings-updated', {
        type: 'settings_reset',
        data: newSettings,
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Paramètres réinitialisés avec succès',
      settings: newSettings
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des paramètres:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation des paramètres' });
  }
});

module.exports = router;

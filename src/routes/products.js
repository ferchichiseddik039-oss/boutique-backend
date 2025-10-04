const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../lib/Product');
const User = require('../lib/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const emailService = require('../services/emailService');

const router = express.Router();

// @route   GET /api/products
// @desc    Obtenir tous les produits avec filtres
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      categorie,
      genre,
      marque,
      prixMin,
      prixMax,
      recherche,
      tri = 'dateAjout',
      ordre = 'desc'
    } = req.query;

    // Construire les filtres
    const filtres = {};
    
    if (categorie) filtres.categorie = categorie;
    if (genre) filtres.genre = genre;
    if (marque) filtres.marque = { $regex: marque, $options: 'i' };
    if (prixMin || prixMax) {
      filtres.prix = {};
      if (prixMin) filtres.prix.$gte = parseFloat(prixMin);
      if (prixMax) filtres.prix.$lte = parseFloat(prixMax);
    }
    if (recherche) {
      filtres.$text = { $search: recherche };
    }

    // Construire le tri
    const triOptions = {};
    triOptions[tri] = ordre === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const produits = await Product.find(filtres)
      .sort(triOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('categorie', 'nom');

    const total = await Product.countDocuments(filtres);

    res.json({
      produits,
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

// @route   GET /api/products/categories/liste
// @desc    Obtenir la liste des catégories disponibles
// @access  Public
router.get('/categories/liste', async (req, res) => {
  try {
    // Retourner les catégories définies dans le schéma
    const categories = ['hoodie', 'pull'];
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/products/:id/options-personnalisation
// @desc    Obtenir les options de personnalisation d'un produit
// @access  Public
router.get('/:id/options-personnalisation', async (req, res) => {
  try {
    const produit = await Product.findById(req.params.id);
    
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    if (!produit.estPersonnalise) {
      return res.status(400).json({ message: 'Ce produit n\'est pas personnalisable' });
    }

    res.json({
      couleursDisponibles: produit.optionsPersonnalisation.couleursDisponibles,
      logosDisponibles: produit.optionsPersonnalisation.logosDisponibles,
      positionsLogo: produit.optionsPersonnalisation.positionsLogo
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   POST /api/products/:id/preview-personnalise
// @desc    Générer un aperçu du produit personnalisé
// @access  Public
router.post('/:id/preview-personnalise', async (req, res) => {
  try {
    const { couleur, logo, position } = req.body;
    const produit = await Product.findById(req.params.id);
    
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    if (!produit.estPersonnalise) {
      return res.status(400).json({ message: 'Ce produit n\'est pas personnalisable' });
    }

    // Ici, vous pourriez intégrer un service de génération d'aperçu
    // Pour l'instant, on retourne les options sélectionnées
    const preview = {
      produitId: produit._id,
      couleur: couleur,
      logo: logo,
      position: position,
      prix: produit.prix,
      // URL de l'aperçu généré (à implémenter avec un service d'image)
      previewUrl: `/api/products/${produit._id}/preview?couleur=${couleur}&logo=${logo}&position=${position}`
    };

    res.json(preview);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/products/:id
// @desc    Obtenir un produit par ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const produit = await Product.findById(req.params.id);
    
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    res.json(produit);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   POST /api/products
// @desc    Créer un nouveau produit
// @access  Private (Admin)
router.post('/', [auth, admin], [
  body('nom').notEmpty().withMessage('Le nom est requis'),
  body('description').notEmpty().withMessage('La description est requise'),
  body('prix').isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  body('categorie').isIn(['hoodie', 'pull']).withMessage('Catégorie invalide'),
  body('genre').isIn(['homme', 'femme', 'enfant', 'sport']).withMessage('Genre invalide'),
  body('marque').notEmpty().withMessage('La marque est requise')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const produit = new Product(req.body);
    await produit.save();

    console.log('✅ Nouveau produit créé:', produit.nom);

    // Émettre un événement WebSocket pour notifier tous les clients admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('product-added', {
        product: produit,
        addedBy: req.user.nom || req.user.email
      });
      console.log('📡 Événement WebSocket émis: product-added');
      
      // Émettre les statistiques mises à jour
      if (global.emitStatsUpdate) {
        global.emitStatsUpdate(io);
      }
    }

    // Envoyer un email à tous les clients pour le nouveau produit
    try {
      console.log('📧 Récupération des clients pour notification email...');
      const clients = await User.find({ role: 'client', estActif: true });
      console.log(`📧 ${clients.length} client(s) trouvé(s)`);
      
      if (clients.length > 0) {
        // Envoyer les emails de manière asynchrone (ne pas bloquer la réponse)
        emailService.sendNewProductEmail(clients, produit)
          .then(result => {
            if (result.success) {
              console.log(`✅ Emails de nouveau produit envoyés: ${result.sent} succès, ${result.failed} échecs`);
            } else {
              console.log('⚠️ Erreur lors de l\'envoi des emails:', result.error);
            }
          })
          .catch(error => {
            console.error('❌ Erreur lors de l\'envoi des emails:', error.message);
          });
      }
    } catch (emailError) {
      console.error('❌ Erreur lors de la récupération des clients:', emailError.message);
      // Ne pas bloquer la création du produit si l'email échoue
    }

    res.status(201).json(produit);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   PUT /api/products/:id
// @desc    Mettre à jour un produit
// @access  Private (Admin)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const produit = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Émettre un événement WebSocket pour notifier tous les clients admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('product-updated', {
        product: produit,
        updatedBy: req.user.nom || req.user.email
      });
      console.log('Événement WebSocket émis: product-updated');
      
      // Émettre les statistiques mises à jour
      if (global.emitStatsUpdate) {
        global.emitStatsUpdate(io);
      }
    }

    res.json(produit);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   DELETE /api/products/:id
// @desc    Supprimer un produit
// @access  Private (Admin)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    console.log('Tentative de suppression du produit:', req.params.id);
    console.log('Utilisateur:', req.user);
    
    const produit = await Product.findByIdAndDelete(req.params.id);

    if (!produit) {
      console.log('Produit non trouvé:', req.params.id);
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    console.log('Produit supprimé avec succès:', produit.nom);
    
    // Émettre un événement WebSocket pour notifier tous les clients admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('product-deleted', {
        productId: req.params.id,
        productName: produit.nom,
        deletedBy: req.user.nom || req.user.email
      });
      console.log('Événement WebSocket émis: product-deleted');
      
      // Émettre les statistiques mises à jour
      if (global.emitStatsUpdate) {
        global.emitStatsUpdate(io);
      }
    }
    
    res.json({ message: 'Produit supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/products/categories/liste
// @desc    Obtenir la liste des catégories
// @access  Public
router.get('/categories/liste', async (req, res) => {
  try {
    const categories = await Product.distinct('categorie');
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/products/marques/liste
// @desc    Obtenir la liste des marques
// @access  Public
router.get('/marques/liste', async (req, res) => {
  try {
    const marques = await Product.distinct('marque');
    res.json(marques);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/products/personnalises
// @desc    Obtenir tous les produits personnalisés
// @access  Public
router.get('/personnalises', async (req, res) => {
  try {
    const produits = await Product.find({ estPersonnalise: true });
    res.json(produits);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;

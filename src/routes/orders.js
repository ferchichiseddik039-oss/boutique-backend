const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../lib/Order');
const Cart = require('../lib/Cart');
const Product = require('../lib/Product');
const Settings = require('../lib/Settings');
const User = require('../lib/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const emailService = require('../services/emailService');

const router = express.Router();

// @route   POST /api/orders
// @desc    Créer une nouvelle commande
// @access  Private
router.post('/', [auth, [
  body('adresseLivraison.nom').notEmpty().withMessage('Nom de livraison requis'),
  body('adresseLivraison.prenom').notEmpty().withMessage('Prénom de livraison requis'),
  body('adresseLivraison.rue').notEmpty().withMessage('Rue de livraison requise'),
  body('adresseLivraison.ville').notEmpty().withMessage('Ville de livraison requise'),
  body('adresseLivraison.codePostal').notEmpty().withMessage('Code postal de livraison requis'),
  body('adresseLivraison.pays').notEmpty().withMessage('Pays de livraison requis'),
  body('adresseLivraison.telephone').notEmpty().withMessage('Téléphone de livraison requis'),
  body('methodePaiement').custom(async (value) => {
    const settings = await Settings.getSettings();
    const validMethods = settings.paiement.methodesActives;
    if (!validMethods.includes(value)) {
      throw new Error('Méthode de paiement invalide');
    }
    return true;
  })
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { adresseLivraison, adresseFacturation, methodePaiement, notes } = req.body;

    // Récupérer le panier de l'utilisateur
    const cart = await Cart.findOne({ utilisateur: req.user.id })
      .populate('articles.produit', 'nom prix prixReduit');

    if (!cart || cart.articles.length === 0) {
      return res.status(400).json({ message: 'Panier vide' });
    }

    // Préparer les articles de la commande
    const articlesCommande = cart.articles.map(article => ({
      produit: article.produit._id,
      nom: article.produit.nom,
      quantite: article.quantite,
      taille: article.taille,
      couleur: article.couleur,
      prixUnitaire: article.prixUnitaire,
      prixTotal: article.prixUnitaire * article.quantite
    }));

    // Calculer les totaux
    const sousTotal = articlesCommande.reduce((total, article) => total + article.prixTotal, 0);
    
    // Récupérer les paramètres de livraison
    const settings = await Settings.getSettings();
    const { fraisLivraison: fraisLivraisonBase, fraisLivraisonGratuite, livraisonGratuite } = settings.livraison;
    
    // Calculer les frais de livraison selon les paramètres
    const fraisLivraison = (livraisonGratuite && sousTotal >= fraisLivraisonGratuite) ? 0 : fraisLivraisonBase;
    const total = sousTotal + fraisLivraison;

    // Créer la commande
    const order = new Order({
      utilisateur: req.user.id,
      articles: articlesCommande,
      adresseLivraison,
      adresseFacturation: adresseFacturation || adresseLivraison,
      methodePaiement,
      sousTotal,
      fraisLivraison,
      total,
      notes
    });

    await order.save();

    // Émettre un événement WebSocket pour les statistiques mises à jour
    const io = req.app.get('io');
    if (io && global.emitStatsUpdate) {
      global.emitStatsUpdate(io);
    }

    // Mettre à jour le stock des produits
    for (const article of cart.articles) {
      await Product.findByIdAndUpdate(article.produit._id, {
        $inc: { 'tailles.$[taille].stock': -article.quantite }
      }, {
        arrayFilters: [{ 'taille.nom': article.taille }]
      });
    }

    // Vider le panier
    await cart.viderPanier();

    res.status(201).json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/orders
// @desc    Obtenir les commandes de l'utilisateur
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log(`📤 Récupération des commandes pour l'utilisateur: ${req.user.id}`);
    
    // Timeout de sécurité côté serveur
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout serveur (10 secondes)')), 10000);
    });

    // Optimisation: limiter les champs et ajouter un timeout
    const ordersPromise = Order.find({ utilisateur: req.user.id })
      .select('_id statut total dateCommande articles adresseLivraison methodePaiement')
      .sort({ dateCommande: -1 })
      .limit(50) // Limiter à 50 commandes pour éviter les problèmes de performance
      .lean(); // Utiliser lean() pour de meilleures performances

    const orders = await Promise.race([ordersPromise, timeoutPromise]);

    console.log(`✅ ${orders.length} commande(s) trouvée(s) pour l'utilisateur`);
    res.json(orders);
  } catch (err) {
    console.error('❌ Erreur lors de la récupération des commandes:', err.message);
    if (err.message.includes('Timeout')) {
      res.status(408).json({ message: 'Timeout: La requête prend trop de temps' });
    } else {
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes' });
    }
  }
});

// @route   GET /api/orders/:id
// @desc    Obtenir une commande par ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('articles.produit', 'nom images marque')
      .populate('utilisateur', 'nom prenom email');

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Vérifier que l'utilisateur peut accéder à cette commande
    if (order.utilisateur._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   PUT /api/orders/:id/statut
// @desc    Mettre à jour le statut d'une commande (Admin)
// @access  Private (Admin)
router.put('/:id/statut', [auth, admin], [
  body('statut').isIn(['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee']).withMessage('Statut invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { statut, numeroSuivi } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('utilisateur', 'nom prenom email')
      .populate('articles.produit', 'nom');
    
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    const oldStatus = order.statut;
    order.statut = statut;
    if (numeroSuivi) order.numeroSuivi = numeroSuivi;

    await order.mettreAJourStatut(statut);

    console.log(`✅ Statut de commande mis à jour: ${oldStatus} → ${statut} (Commande #${order.numeroCommande})`);

    // Émettre un événement WebSocket pour les statistiques mises à jour
    const io = req.app.get('io');
    if (io && global.emitStatsUpdate) {
      global.emitStatsUpdate(io);
    }

    // Envoyer un email au client pour le nouveau statut
    try {
      if (order.utilisateur && order.utilisateur.email) {
        console.log(`📧 Envoi d'email de notification de statut au client: ${order.utilisateur.email}`);
        
        // Envoyer l'email de manière asynchrone (ne pas bloquer la réponse)
        emailService.sendOrderStatusEmail(order.utilisateur, order, statut)
          .then(result => {
            if (result.success) {
              console.log(`✅ Email de statut envoyé avec succès à ${order.utilisateur.email}`);
            } else {
              console.log(`⚠️ Erreur lors de l'envoi de l'email: ${result.error}`);
            }
          })
          .catch(error => {
            console.error(`❌ Erreur lors de l'envoi de l'email de statut:`, error.message);
          });
      } else {
        console.log('⚠️ Pas d\'email utilisateur disponible pour la notification');
      }
    } catch (emailError) {
      console.error('❌ Erreur lors de la préparation de l\'email:', emailError.message);
      // Ne pas bloquer la mise à jour du statut si l'email échoue
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    res.status(500).send('Erreur serveur');
  }
});

// @route   POST /api/orders/custom-hoodie
// @desc    Créer une commande de hoodie personnalisé
// @access  Private
router.post('/custom-hoodie', [auth, [
  body('couleur').notEmpty().withMessage('Couleur requise'),
  body('couleurNom').notEmpty().withMessage('Nom de couleur requis'),
  body('logo').notEmpty().withMessage('Logo requis'),
  body('logoPosition').notEmpty().withMessage('Position du logo requise'),
  body('prix').isNumeric().withMessage('Prix invalide'),
  body('quantite').isInt({ min: 1 }).withMessage('Quantité invalide'),
  body('taille').notEmpty().withMessage('Taille requise')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      couleur, 
      couleurNom, 
      logo, 
      logoPosition, 
      logoSize, 
      prix, 
      quantite, 
      taille, 
      notes 
    } = req.body;

    // Log pour débogage
    console.log('=== DONNÉES REÇUES POUR COMMANDE PERSONNALISÉE ===');
    console.log('Couleur:', couleur);
    console.log('Couleur nom:', couleurNom);
    console.log('Logo (premiers 100 caractères):', logo ? logo.substring(0, 100) + '...' : 'AUCUN LOGO');
    console.log('Position logo:', logoPosition);
    console.log('Taille logo:', logoSize);
    console.log('Prix:', prix);
    console.log('Quantité:', quantite);
    console.log('Taille:', taille);
    console.log('Notes:', notes);
    console.log('================================================');

    // Créer l'article de commande personnalisé
    const customHoodieArticle = {
      type: 'custom_hoodie',
      nom: `Hoodie personnalisé - ${couleurNom}`,
      quantite: parseInt(quantite),
      taille: taille,
      couleur: couleurNom,
      prixUnitaire: parseFloat(prix),
      prixTotal: parseFloat(prix) * parseInt(quantite),
      customData: {
        logo: logo,
        logoPosition: logoPosition,
        logoSize: logoSize || 80,
        couleurCode: couleur,
        couleurNom: couleurNom
      }
    };

    // Calculer les totaux
    const sousTotal = customHoodieArticle.prixTotal;
    const fraisLivraison = sousTotal > 50 ? 0 : 5.99; // Livraison gratuite au-dessus de 50 TND
    const total = sousTotal + fraisLivraison;

    // Créer la commande
    const order = new Order({
      utilisateur: req.user.id,
      articles: [customHoodieArticle],
      adresseLivraison: {
        nom: req.user.nom || 'Non spécifié',
        prenom: req.user.prenom || 'Non spécifié',
        rue: 'À définir',
        ville: 'À définir',
        codePostal: 'À définir',
        pays: 'France',
        telephone: req.user.telephone || 'Non spécifié'
      },
      adresseFacturation: {
        nom: req.user.nom || 'Non spécifié',
        prenom: req.user.prenom || 'Non spécifié',
        rue: 'À définir',
        ville: 'À définir',
        codePostal: 'À définir',
        pays: 'France'
      },
      methodePaiement: 'especes', // Par défaut
      sousTotal,
      fraisLivraison,
      total,
      notes: notes || `Commande de hoodie personnalisé - Couleur: ${couleurNom}, Position logo: ${logoPosition}`,
      statut: 'en_attente'
    });

    await order.save();

    // Émettre un événement WebSocket pour les statistiques mises à jour
    const io = req.app.get('io');
    if (io && global.emitStatsUpdate) {
      global.emitStatsUpdate(io);
    }

    // Log pour vérifier la sauvegarde
    console.log('=== COMMANDE SAUVEGARDÉE ===');
    console.log('ID Commande:', order._id);
    console.log('Logo sauvegardé (premiers 100 caractères):', order.articles[0].customData.logo ? order.articles[0].customData.logo.substring(0, 100) + '...' : 'AUCUN LOGO');
    console.log('Taille du logo:', order.articles[0].customData.logoSize);
    console.log('Position du logo:', order.articles[0].customData.logoPosition);
    console.log('============================');

    // Populer les données utilisateur pour la réponse
    await order.populate('utilisateur', 'nom prenom email');

    res.status(201).json({
      message: 'Commande de hoodie personnalisé créée avec succès',
      order: order
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @route   GET /api/orders/admin/toutes
// @desc    Obtenir toutes les commandes (Admin)
// @access  Private (Admin)
router.get('/admin/toutes', [auth, admin], async (req, res) => {
  try {
    const { page = 1, limit = 20, statut } = req.query;
    
    const filtres = {};
    if (statut) filtres.statut = statut;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await Order.find(filtres)
      .sort({ dateCommande: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('utilisateur', 'nom prenom email');

    const total = await Order.countDocuments(filtres);

    res.json({
      commandes: orders,
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

module.exports = router;

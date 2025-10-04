const express = require('express');
const { body, validationResult } = require('express-validator');
const Cart = require('../lib/Cart');
const Product = require('../lib/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/cart
// @desc    Obtenir le panier de l'utilisateur
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ utilisateur: req.user.id })
      .populate('articles.produit', 'nom prix prixReduit images marque');

    if (!cart) {
      cart = new Cart({ utilisateur: req.user.id, articles: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   POST /api/cart/ajouter
// @desc    Ajouter un article au panier
// @access  Private
router.post('/ajouter', [auth, [
  body('produitId').notEmpty().withMessage('ID du produit requis'),
  body('quantite').isInt({ min: 1 }).withMessage('Quantité doit être un nombre positif'),
  body('taille').notEmpty().withMessage('Taille requise'),
  body('couleur').notEmpty().withMessage('Couleur requise')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { produitId, quantite, taille, couleur } = req.body;

    // Vérifier que le produit existe
    const produit = await Product.findById(produitId);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Vérifier la disponibilité
    const tailleDisponible = produit.tailles.find(t => t.nom === taille);
    if (!tailleDisponible || tailleDisponible.stock < quantite) {
      return res.status(400).json({ message: 'Stock insuffisant pour cette taille' });
    }

    // Trouver ou créer le panier
    let cart = await Cart.findOne({ utilisateur: req.user.id });
    if (!cart) {
      cart = new Cart({ utilisateur: req.user.id, articles: [] });
    }

    // Ajouter l'article
    await cart.ajouterArticle(produitId, quantite, taille, couleur, produit.getPrixFinal());

    // Récupérer le panier mis à jour avec les détails des produits
    cart = await Cart.findById(cart._id)
      .populate('articles.produit', 'nom prix prixReduit images marque');

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   PUT /api/cart/modifier/:articleId
// @desc    Modifier la quantité d'un article
// @access  Private
router.put('/modifier/:articleId', [auth, [
  body('quantite').isInt({ min: 1 }).withMessage('Quantité doit être un nombre positif')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { quantite } = req.body;
    const { articleId } = req.params;

    const cart = await Cart.findOne({ utilisateur: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Panier non trouvé' });
    }

    const article = cart.articles.id(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    // Vérifier la disponibilité
    const produit = await Product.findById(article.produit);
    const tailleDisponible = produit.tailles.find(t => t.nom === article.taille);
    if (!tailleDisponible || tailleDisponible.stock < quantite) {
      return res.status(400).json({ message: 'Stock insuffisant' });
    }

    article.quantite = quantite;
    cart.dateModification = new Date();
    await cart.save();

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   DELETE /api/cart/supprimer/:articleId
// @desc    Supprimer un article du panier
// @access  Private
router.delete('/supprimer/:articleId', auth, async (req, res) => {
  try {
    const { articleId } = req.params;

    const cart = await Cart.findOne({ utilisateur: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Panier non trouvé' });
    }

    await cart.supprimerArticle(articleId);

    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   DELETE /api/cart/vider
// @desc    Vider le panier
// @access  Private
router.delete('/vider', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ utilisateur: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Panier non trouvé' });
    }

    await cart.viderPanier();

    res.json({ message: 'Panier vidé avec succès' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// @route   GET /api/cart/nombre-articles
// @desc    Obtenir le nombre d'articles dans le panier
// @access  Private
router.get('/nombre-articles', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ utilisateur: req.user.id });
    if (!cart) {
      return res.json({ nombreArticles: 0 });
    }

    const nombreArticles = cart.articles.reduce((total, article) => total + article.quantite, 0);
    res.json({ nombreArticles });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;

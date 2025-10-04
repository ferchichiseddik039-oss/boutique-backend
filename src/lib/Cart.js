const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  produit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantite: {
    type: Number,
    required: true,
    min: 1
  },
  taille: {
    type: String,
    required: true
  },
  couleur: {
    type: String,
    required: true
  },
  prixUnitaire: {
    type: Number,
    required: true
  }
});

const cartSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  articles: [cartItemSchema],
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateModification: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Méthode pour calculer le total du panier
cartSchema.methods.calculerTotal = function() {
  return this.articles.reduce((total, article) => {
    return total + (article.prixUnitaire * article.quantite);
  }, 0);
};

// Méthode pour ajouter un article
cartSchema.methods.ajouterArticle = function(produitId, quantite, taille, couleur, prix) {
  const articleExistant = this.articles.find(article => 
    article.produit.toString() === produitId.toString() &&
    article.taille === taille &&
    article.couleur === couleur
  );

  if (articleExistant) {
    articleExistant.quantite += quantite;
  } else {
    this.articles.push({
      produit: produitId,
      quantite,
      taille,
      couleur,
      prixUnitaire: prix
    });
  }

  this.dateModification = new Date();
  return this.save();
};

// Méthode pour supprimer un article
cartSchema.methods.supprimerArticle = function(articleId) {
  this.articles = this.articles.filter(article => 
    article._id.toString() !== articleId.toString()
  );
  this.dateModification = new Date();
  return this.save();
};

// Méthode pour vider le panier
cartSchema.methods.viderPanier = function() {
  this.articles = [];
  this.dateModification = new Date();
  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);

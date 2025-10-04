const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  produit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false // Pas requis pour les commandes personnalisées
  },
  nom: String,
  quantite: {
    type: Number,
    required: true,
    min: 1
  },
  taille: String,
  couleur: String,
  prixUnitaire: {
    type: Number,
    required: true
  },
  prixTotal: {
    type: Number,
    required: true
  },
  // Champs pour les commandes personnalisées
  type: {
    type: String,
    enum: ['standard', 'custom_hoodie'],
    default: 'standard'
  },
  customData: {
    logo: String, // URL ou base64 du logo
    logoPosition: String,
    logoSize: Number,
    couleurCode: String,
    couleurNom: String
  }
});

const orderSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  articles: [orderItemSchema],
  adresseLivraison: {
    nom: String,
    prenom: String,
    rue: String,
    ville: String,
    codePostal: String,
    pays: String,
    telephone: String
  },
  adresseFacturation: {
    nom: String,
    prenom: String,
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  methodePaiement: {
    type: String,
    required: true,
    enum: ['carte', 'paypal', 'virement', 'especes']
  },
  statut: {
    type: String,
    required: true,
    enum: ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee'],
    default: 'en_attente'
  },
  sousTotal: {
    type: Number,
    required: true
  },
  fraisLivraison: {
    type: Number,
    default: 0
  },
  reduction: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  numeroSuivi: String,
  notes: String,
  dateCommande: {
    type: Date,
    default: Date.now
  },
  dateLivraison: Date
}, {
  timestamps: true
});

// Index pour la recherche
orderSchema.index({ utilisateur: 1, dateCommande: -1 });
orderSchema.index({ statut: 1, dateCommande: -1 });

// Méthode pour calculer le total
orderSchema.methods.calculerTotal = function() {
  this.total = this.sousTotal + this.fraisLivraison - this.reduction;
  return this.total;
};

// Méthode pour mettre à jour le statut
orderSchema.methods.mettreAJourStatut = function(nouveauStatut) {
  this.statut = nouveauStatut;
  if (nouveauStatut === 'livree') {
    this.dateLivraison = new Date();
  }
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);

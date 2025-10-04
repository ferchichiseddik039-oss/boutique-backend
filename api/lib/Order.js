const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  numero: {
    type: String,
    unique: true,
    default: function() {
      return 'CMD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  produits: [{
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
    prix: {
      type: Number,
      required: true
    },
    taille: String,
    couleur: String,
    personnalisation: {
      logo: String,
      position: String,
      texte: String
    }
  }],
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
    enum: ['carte', 'paypal', 'virement', 'cheque'],
    default: 'carte'
  },
  statut: {
    type: String,
    enum: ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee'],
    default: 'en_attente'
  },
  total: {
    type: Number,
    required: true
  },
  fraisLivraison: {
    type: Number,
    default: 0
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateLivraison: Date,
  notes: String,
  tracking: {
    numero: String,
    transporteur: String
  }
});

// Index pour les recherches
orderSchema.index({ utilisateur: 1, dateCreation: -1 });
orderSchema.index({ numero: 1 });
orderSchema.index({ statut: 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
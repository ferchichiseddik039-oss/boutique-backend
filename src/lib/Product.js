const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  prix: {
    type: Number,
    required: true,
    min: 0
  },
  prixReduit: {
    type: Number,
    min: 0
  },
  categorie: {
    type: String,
    required: true,
    enum: ['hoodie', 'pull']
  },
  genre: {
    type: String,
    required: true,
    enum: ['homme', 'femme', 'enfant', 'sport']
  },
  sousCategorie: {
    type: String,
    trim: true
  },
  marque: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    url: String,
    alt: String
  }],
  tailles: [{
    nom: String,
    stock: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  couleurs: [{
    nom: String,
    code: String
  }],
  materiau: String,
  entretien: String,
  note: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  nombreAvis: {
    type: Number,
    default: 0
  },
  estEnPromotion: {
    type: Boolean,
    default: false
  },
  estNouveau: {
    type: Boolean,
    default: false
  },
  estPopulaire: {
    type: Boolean,
    default: false
  },
  tags: [String],
  dateAjout: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour la recherche
productSchema.index({ nom: 'text', description: 'text', marque: 'text' });
productSchema.index({ categorie: 1, prix: 1 });
productSchema.index({ estEnPromotion: 1, estNouveau: 1, estPopulaire: 1 });

// Méthode pour calculer le prix final
productSchema.methods.getPrixFinal = function() {
  return this.prixReduit || this.prix;
};

// Méthode pour vérifier la disponibilité
productSchema.methods.estDisponible = function() {
  return this.tailles.some(taille => taille.stock > 0);
};

module.exports = mongoose.model('Product', productSchema);

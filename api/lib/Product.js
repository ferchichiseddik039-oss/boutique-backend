const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
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
  prixPromo: {
    type: Number,
    min: 0
  },
  image: {
    type: String,
    required: true
  },
  images: [String],
  categorie: {
    type: String,
    required: true
  },
  marque: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    enum: ['homme', 'femme', 'enfant', 'sport'],
    required: true
  },
  tailles: [String],
  couleurs: [String],
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  actif: {
    type: Boolean,
    default: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateAjout: {
    type: Date,
    default: Date.now
  },
  estPersonnalise: {
    type: Boolean,
    default: false
  },
  optionsPersonnalisation: {
    couleursDisponibles: [String],
    logosDisponibles: [String],
    positionsLogo: [String]
  },
  avis: [{
    utilisateur: String,
    note: {
      type: Number,
      min: 1,
      max: 5
    },
    commentaire: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  noteMoyenne: {
    type: Number,
    default: 0
  }
});

// Index pour la recherche textuelle
productSchema.index({ nom: 'text', description: 'text', marque: 'text' });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);

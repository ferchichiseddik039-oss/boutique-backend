const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Informations générales de la boutique
  informationsGenerales: {
    nomBoutique: {
      type: String,
      default: 'AYNEXT'
    },
    description: {
      type: String,
      default: 'Boutique de vêtements tendance'
    },
    email: {
      type: String,
      default: 'contact@aynext.com'
    },
    telephone: {
      type: String,
      default: '+216 XX XXX XXX'
    },
    adresse: {
      rue: {
        type: String,
        default: 'Rue de la Mode'
      },
      ville: {
        type: String,
        default: 'Tunis'
      },
      codePostal: {
        type: String,
        default: '1000'
      },
      pays: {
        type: String,
        default: 'Tunisie'
      }
    },
    logo: {
      type: String,
      default: ''
    }
  },

  // Paramètres de livraison
  livraison: {
    fraisLivraison: {
      type: Number,
      default: 5.9,
      min: 0
    },
    fraisLivraisonGratuite: {
      type: Number,
      default: 100,
      min: 0
    },
    delaiLivraison: {
      type: String,
      default: '3-5 jours ouvrables'
    },
    zonesLivraison: [{
      nom: {
        type: String,
        required: true
      },
      frais: {
        type: Number,
        required: true,
        min: 0
      },
      delai: {
        type: String,
        required: true
      }
    }],
    livraisonGratuite: {
      type: Boolean,
      default: true
    }
  },

  // Méthodes de paiement
  paiement: {
    methodesAcceptees: [{
      type: String,
      enum: ['carte', 'paypal', 'virement', 'especes'],
      default: ['carte', 'paypal', 'virement', 'especes']
    }],
    methodesActives: [{
      type: String,
      enum: ['carte', 'paypal', 'virement', 'especes'],
      default: ['carte', 'paypal', 'virement', 'especes']
    }],
    paiementSecurise: {
      type: Boolean,
      default: true
    },
    informationsPaiement: {
      carte: {
        active: {
          type: Boolean,
          default: true
        },
        nom: {
          type: String,
          default: 'Carte bancaire'
        },
        description: {
          type: String,
          default: 'Visa, Mastercard, American Express'
        }
      },
      paypal: {
        active: {
          type: Boolean,
          default: true
        },
        nom: {
          type: String,
          default: 'PayPal'
        },
        description: {
          type: String,
          default: 'Paiement sécurisé via PayPal'
        }
      },
      virement: {
        active: {
          type: Boolean,
          default: true
        },
        nom: {
          type: String,
          default: 'Virement bancaire'
        },
        description: {
          type: String,
          default: 'Virement bancaire direct'
        }
      },
      especes: {
        active: {
          type: Boolean,
          default: true
        },
        nom: {
          type: String,
          default: 'Espèces à la livraison'
        },
        description: {
          type: String,
          default: 'Paiement en espèces lors de la livraison'
        }
      }
    }
  },


  // Paramètres généraux
  general: {
    devise: {
      type: String,
      default: 'TND',
      enum: ['TND', 'EUR', 'USD']
    },
    langue: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'ar']
    },
    fuseauHoraire: {
      type: String,
      default: 'Africa/Tunis'
    },
    maintenance: {
      active: {
        type: Boolean,
        default: false
      },
      message: {
        type: String,
        default: 'Site en maintenance. Revenez bientôt !'
      }
    }
  },

  // Métadonnées
  version: {
    type: Number,
    default: 1
  },
  derniereModification: {
    type: Date,
    default: Date.now
  },
  modifiePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index pour s'assurer qu'il n'y a qu'un seul document de paramètres
settingsSchema.index({}, { unique: true });

// Méthode statique pour obtenir les paramètres (crée un document par défaut si nécessaire)
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = new this();
    await settings.save();
  }
  
  return settings;
};

// Méthode pour mettre à jour les paramètres
settingsSchema.methods.updateSettings = async function(updates, userId) {
  // Mettre à jour les champs fournis
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      this[key] = updates[key];
    }
  });
  
  this.derniereModification = new Date();
  this.modifiePar = userId;
  this.version += 1;
  
  return await this.save();
};

module.exports = mongoose.model('Settings', settingsSchema);

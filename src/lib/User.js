const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  prenom: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  motDePasse: {
    type: String,
    required: function() {
      return !this.isOAuth;
    },
    minlength: 6
  },
  // Champs OAuth
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  facebookId: {
    type: String,
    sparse: true,
    unique: true
  },
  isOAuth: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['client', 'admin'],
    default: 'client'
  },
  adresse: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  telephone: String,
  dateCreation: {
    type: Date,
    default: Date.now
  },
  estActif: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash du mot de passe avant sauvegarde (seulement pour les utilisateurs non-OAuth)
userSchema.pre('save', async function(next) {
  if (!this.isModified('motDePasse') || this.isOAuth) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Vérification qu'il n'y a qu'un seul admin
userSchema.pre('save', async function(next) {
  if (this.role === 'admin' && this.isNew) {
    try {
      const existingAdmin = await this.constructor.findOne({ role: 'admin' });
      if (existingAdmin) {
        const error = new Error('Un compte administrateur existe déjà. Un seul compte admin est autorisé.');
        error.name = 'ValidationError';
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparerMotDePasse = async function(motDePasseSaisi) {
  // Pour les utilisateurs OAuth, on ne peut pas comparer de mot de passe
  if (this.isOAuth) {
    return false;
  }
  return await bcrypt.compare(motDePasseSaisi, this.motDePasse);
};

// Méthode pour obtenir les informations publiques de l'utilisateur
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  delete userObject.motDePasse;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

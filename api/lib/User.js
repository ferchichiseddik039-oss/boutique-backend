const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  motDePasse: {
    type: String,
    required: true
  },
  nom: {
    type: String,
    required: true
  },
  prenom: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['client', 'admin'],
    default: 'client'
  },
  telephone: String,
  adresse: {
    rue: String,
    ville: String,
    codePostal: String,
    pays: String
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  actif: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('motDePasse')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparerMotDePasse = async function(motDePasse) {
  return await bcrypt.compare(motDePasse, this.motDePasse);
};

// Méthode pour retourner les données publiques de l'utilisateur
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    email: this.email,
    nom: this.nom,
    prenom: this.prenom,
    role: this.role,
    telephone: this.telephone,
    adresse: this.adresse,
    dateCreation: this.dateCreation,
    actif: this.actif,
    lastLogin: this.lastLogin
  };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../lib/User');

// -------------------- GOOGLE OAUTH --------------------
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5001/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({
        $or: [
          { email: profile.emails[0].value },
          { googleId: profile.id }
        ]
      });

      if (user) {
        // Ajouter googleId si inexistant
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
        return done(null, user);
      }

      // Nouvel utilisateur OAuth (sans mot de passe)
      user = new User({
        googleId: profile.id,
        nom: profile.name.familyName,
        prenom: profile.name.givenName,
        email: profile.emails[0].value,
        role: 'client',
        isOAuth: true
        // motDePasse n'est PAS défini pour les utilisateurs OAuth
      });

      console.log('🆕 Création nouvel utilisateur Google OAuth:', {
        googleId: profile.id,
        email: profile.emails[0].value,
        nom: profile.name.familyName,
        prenom: profile.name.givenName
      });

      await user.save();
      console.log('✅ Utilisateur Google OAuth créé avec succès:', user._id);
      return done(null, user);

    } catch (error) {
      console.error('❌ Erreur lors de la création/utilisation utilisateur Google OAuth:', error);
      console.error('📋 Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });
      return done(error, null);
    }
  }));
  console.log('✅ Google OAuth configuré');
} else {
  console.log('⚠️ Google OAuth non configuré - variables manquantes');
}

// -------------------- FACEBOOK OAUTH --------------------
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:5001/api/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({
        $or: [
          { email: profile.emails[0].value },
          { facebookId: profile.id }
        ]
      });

      if (user) {
        // Ajouter facebookId si inexistant
        if (!user.facebookId) {
          user.facebookId = profile.id;
          await user.save();
        }
        return done(null, user);
      }

      // Nouvel utilisateur OAuth (sans mot de passe)
      user = new User({
        facebookId: profile.id,
        nom: profile.name.familyName,
        prenom: profile.name.givenName,
        email: profile.emails[0].value,
        role: 'client',
        isOAuth: true
        // motDePasse n'est PAS défini pour les utilisateurs OAuth
      });

      console.log('🆕 Création nouvel utilisateur Facebook OAuth:', {
        facebookId: profile.id,
        email: profile.emails[0].value,
        nom: profile.name.familyName,
        prenom: profile.name.givenName
      });

      await user.save();
      console.log('✅ Utilisateur Facebook OAuth créé avec succès:', user._id);
      return done(null, user);

    } catch (error) {
      console.error('❌ Erreur lors de la création/utilisation utilisateur Facebook OAuth:', error);
      console.error('📋 Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });
      return done(error, null);
    }
  }));
  console.log('✅ Facebook OAuth configuré');
} else {
  console.log('⚠️ Facebook OAuth non configuré - variables manquantes');
}

// -------------------- SÉRIALISATION --------------------
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

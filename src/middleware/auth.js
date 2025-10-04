const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Obtenir le token depuis le header
  const token = req.header('x-auth-token');

  // Vérifier s'il n'y a pas de token
  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Aucun token fourni.' });
  }

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aynext_jwt_secret_key_2024_very_secure');
    
    // Ajouter l'utilisateur à la requête
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

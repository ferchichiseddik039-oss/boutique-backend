const express = require('express');
const router = express.Router();
const User = require('../lib/User');
const Product = require('../lib/Product');
const Order = require('../lib/Order');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Vérifier si un admin existe déjà
router.get('/check', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    res.json({ exists: adminCount > 0 });
  } catch (error) {
    console.error('Erreur lors de la vérification admin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer le premier compte admin
router.post('/setup', async (req, res) => {
  try {
    // Vérifier qu'aucun admin n'existe déjà
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ 
        message: 'Un compte administrateur existe déjà. Un seul compte admin est autorisé.' 
      });
    }

    // Créer le compte admin
    const adminData = {
      ...req.body,
      role: 'admin'
    };

    const admin = new User(adminData);
    await admin.save();

    res.status(201).json({ 
      message: 'Compte administrateur créé avec succès',
      user: admin.toPublicJSON()
    });
  } catch (error) {
    console.error('Erreur lors de la création admin:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: error.message 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Cette adresse email est déjà utilisée' 
      });
    }
    
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les informations de l'admin (pour le footer)
router.get('/info', async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Aucun admin trouvé' });
    }

    // Formater l'adresse si elle existe
    let adresseFormatee = '123 Rue de la Mode, 75001 Paris'; // Valeur par défaut
    if (admin.adresse && admin.adresse.rue && admin.adresse.ville && admin.adresse.codePostal) {
      adresseFormatee = `${admin.adresse.rue}, ${admin.adresse.codePostal} ${admin.adresse.ville}`;
      if (admin.adresse.pays) {
        adresseFormatee += `, ${admin.adresse.pays}`;
      }
    }

    res.json({
      email: admin.email,
      telephone: admin.telephone || '+33 1 23 45 67 89',
      adresse: adresseFormatee
    });
  } catch (error) {
    console.error('Erreur lors du chargement des infos admin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour obtenir les statistiques du dashboard admin
router.get('/stats', auth, admin, async (req, res) => {
  try {
    console.log('📊 Récupération des statistiques admin...');
    
    // Compter les utilisateurs
    const totalUsers = await User.countDocuments({ role: 'client' });
    console.log('👥 Total utilisateurs:', totalUsers);
    
    // Compter les produits
    const totalProducts = await Product.countDocuments();
    console.log('📦 Total produits:', totalProducts);
    
    // Compter les commandes
    const totalOrders = await Order.countDocuments();
    console.log('🛒 Total commandes:', totalOrders);
    
    // Calculer le chiffre d'affaires (seulement les commandes confirmées)
    const confirmedOrders = await Order.find({ statut: 'confirmee' }, 'total').lean();
    const chiffreAffaires = confirmedOrders.reduce((total, order) => total + (order.total || 0), 0);
    console.log('💰 Chiffre d\'affaires (commandes confirmées):', chiffreAffaires);
    
    // Statistiques par statut de commande
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const stats = {
      totalUsers,
      totalProducts,
      totalOrders,
      chiffreAffaires: Math.round(chiffreAffaires * 100) / 100, // Arrondir à 2 décimales
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
    
    console.log('✅ Statistiques calculées:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

module.exports = router;

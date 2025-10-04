const connectDB = require('../lib/mongodb.js');
const Product = require('../lib/Product.js');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectDB();
      
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID du produit requis"
        });
      }

      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produit non trouvé"
        });
      }

      return res.status(200).json({
        success: true,
        product
      });

    } catch (error) {
      console.error('Erreur récupération produit:', error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la récupération du produit"
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      await connectDB();
      
      // Vérifier l'authentification admin
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      const { id } = req.query;
      const updateData = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID du produit requis"
        });
      }

      const product = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produit non trouvé"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Produit mis à jour avec succès",
        product
      });

    } catch (error) {
      console.error('Erreur mise à jour produit:', error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la mise à jour du produit"
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await connectDB();
      
      // Vérifier l'authentification admin
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID du produit requis"
        });
      }

      const product = await Product.findByIdAndDelete(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Produit non trouvé"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Produit supprimé avec succès"
      });

    } catch (error) {
      console.error('Erreur suppression produit:', error);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la suppression du produit"
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: "Méthode non autorisée"
  });
};

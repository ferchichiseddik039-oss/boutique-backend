const connectDB = require('../lib/mongodb.js');
const Product = require('../lib/Product.js');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Auth-Token'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Route based on the request
    if (pathname === '/api/products' && req.method === 'GET') {
      // Get all products
      const { category, brand, limit, page = 1 } = req.query;

      let filter = {};
      
      if (category) {
        filter.categorie = category;
      }
      
      if (brand) {
        filter.marque = brand;
      }

      const limitNum = parseInt(limit) || 20;
      const skip = (parseInt(page) - 1) * limitNum;

      const products = await Product.find(filter)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Product.countDocuments(filter);

      return res.status(200).json({
        success: true,
        products,
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    }

    if (pathname === '/api/products/categories' && req.method === 'GET') {
      // Get categories
      const categories = ['hoodie', 'pull'];
      return res.status(200).json({
        success: true,
        categories
      });
    }

    if (pathname === '/api/products/marques' && req.method === 'GET') {
      // Get brands
      try {
        const marques = await Product.distinct('marque');
        return res.status(200).json({
          success: true,
          marques: marques.length > 0 ? marques : ['AYNEXT']
        });
      } catch (error) {
        console.error('Erreur récupération marques:', error);
        return res.status(200).json({
          success: true,
          marques: ['AYNEXT']
        });
      }
    }

    if (pathname === '/api/products' && req.method === 'POST') {
      // Create product (admin only)
      try {
        const token = req.headers['x-auth-token'];
        if (!token) {
          return res.status(401).json({ 
            success: false, 
            message: "Token d'authentification requis" 
          });
        }

        // Vérifier le token admin
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
          if (decoded.role !== 'admin') {
            return res.status(403).json({
              success: false,
              message: "Accès administrateur requis"
            });
          }
        } catch (jwtError) {
          return res.status(401).json({
            success: false,
            message: "Token invalide ou expiré"
          });
        }

        const productData = req.body;
        
        // Validation des données requises
        if (!productData.nom || !productData.prix || !productData.categorie) {
          return res.status(400).json({
            success: false,
            message: "Nom, prix et catégorie sont requis"
          });
        }

        // Ajouter des valeurs par défaut
        const newProduct = {
          nom: productData.nom,
          description: productData.description || '',
          prix: parseFloat(productData.prix),
          prixPromo: productData.prixPromo ? parseFloat(productData.prixPromo) : undefined,
          image: productData.image || '/uploads/default-product.jpg',
          images: productData.images || [],
          categorie: productData.categorie,
          marque: productData.marque || 'AYNEXT',
          genre: productData.genre || 'homme',
          tailles: productData.tailles || ['S', 'M', 'L', 'XL'],
          couleurs: productData.couleurs || ['Noir', 'Blanc'],
          stock: parseInt(productData.stock) || 0,
          actif: productData.actif !== false,
          estPersonnalise: productData.estPersonnalise || false,
          optionsPersonnalisation: productData.optionsPersonnalisation || {
            couleursDisponibles: ['Noir', 'Blanc'],
            logosDisponibles: [],
            positionsLogo: ['Cœur', 'Poche']
          }
        };

        const product = new Product(newProduct);
        await product.save();

        return res.status(201).json({
          success: true,
          message: "Produit créé avec succès",
          product
        });

      } catch (error) {
        console.error('Erreur création produit:', error);
        return res.status(500).json({
          success: false,
          message: "Erreur serveur lors de la création du produit",
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: "Endpoint non trouvé"
    });

  } catch (error) {
    console.error('Erreur produits:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

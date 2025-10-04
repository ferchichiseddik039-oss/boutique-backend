const connectDB = require('./lib/mongodb.js');
const User = require('./lib/User.js');
const Product = require('./lib/Product.js');
const Order = require('./lib/Order.js');
const jwt = require('jsonwebtoken');

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

    // ===== USERS ENDPOINTS =====
    if (pathname === '/api/users/admin/tous' && req.method === 'GET') {
      // Get all users (admin only)
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

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

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const users = await User.find({ role: 'client' })
        .select('-motDePasse')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await User.countDocuments({ role: 'client' });

      return res.status(200).json({
        success: true,
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    if (pathname === '/api/users' && req.method === 'GET') {
      // Get user profile
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        const user = await User.findById(decoded.userId || decoded.user?.id).select('-motDePasse');
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "Utilisateur non trouvé"
          });
        }

        return res.status(200).json({
          success: true,
          user: user.toPublicJSON()
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    if (pathname === '/api/users' && req.method === 'PUT') {
      // Update user profile
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        const user = await User.findById(decoded.userId || decoded.user?.id);
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "Utilisateur non trouvé"
          });
        }

        const updateData = req.body;
        delete updateData.motDePasse;
        delete updateData.role;

        Object.assign(user, updateData);
        await user.save();

        return res.status(200).json({
          success: true,
          message: "Profil mis à jour avec succès",
          user: user.toPublicJSON()
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    // ===== ORDERS ENDPOINTS =====
    if (pathname === '/api/orders' && req.method === 'GET') {
      // Get orders
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        
        if (decoded.role === 'admin') {
          const orders = await Order.find()
            .populate('utilisateur', 'nom prenom email')
            .sort({ dateCreation: -1 });
          
          return res.status(200).json({
            success: true,
            orders
          });
        } else {
          const orders = await Order.find({ utilisateur: decoded.userId || decoded.user?.id })
            .sort({ dateCreation: -1 });
          
          return res.status(200).json({
            success: true,
            orders
          });
        }
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    if (pathname === '/api/orders/admin/toutes' && req.method === 'GET') {
      // Get all orders for admin with pagination
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

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

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const orders = await Order.find()
        .populate('utilisateur', 'nom prenom email')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Order.countDocuments();

      return res.status(200).json({
        success: true,
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    if (pathname === '/api/orders' && req.method === 'POST') {
      // Create order
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        const orderData = req.body;

        if (!orderData.produits || !Array.isArray(orderData.produits) || orderData.produits.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Aucun produit dans la commande"
          });
        }

        const order = new Order({
          ...orderData,
          utilisateur: decoded.userId || decoded.user?.id,
          dateCreation: new Date(),
          statut: 'en_attente'
        });

        await order.save();

        return res.status(201).json({
          success: true,
          message: "Commande créée avec succès",
          order
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    // ===== CART ENDPOINTS =====
    if (pathname === '/api/cart' && req.method === 'GET') {
      // Get cart
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        
        // Pour l'instant, retourner un panier vide
        // En production, vous pourriez sauvegarder le panier en base
        return res.status(200).json({
          success: true,
          cart: [],
          message: "Panier récupéré avec succès"
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    if (pathname === '/api/cart' && req.method === 'POST') {
      // Add to cart
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        
        const { produit, quantite, taille, couleur, personnalisation } = req.body;

        if (!produit || !quantite) {
          return res.status(400).json({
            success: false,
            message: "Produit et quantité requis"
          });
        }

        return res.status(200).json({
          success: true,
          message: "Produit ajouté au panier"
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    if (pathname === '/api/cart' && req.method === 'DELETE') {
      // Remove from cart
      return res.status(200).json({
        success: true,
        message: "Produit retiré du panier"
      });
    }

    // ===== UPLOAD ENDPOINTS =====
    if (pathname === '/api/upload/product-images' && req.method === 'POST') {
      // Upload product images
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

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

      const { images } = req.body;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Aucune image fournie"
        });
      }

      // Simuler les URLs d'images uploadées
      const uploadedImages = images.map((image, index) => {
        return {
          id: `img_${Date.now()}_${index}`,
          url: image.url || `/uploads/products/${Date.now()}_${index}.jpg`,
          filename: image.filename || `product_${Date.now()}_${index}.jpg`,
          size: image.size || 0,
          type: image.type || 'image/jpeg'
        };
      });

      return res.status(200).json({
        success: true,
        message: "Images uploadées avec succès",
        images: uploadedImages
      });
    }

    // ===== SETTINGS ENDPOINTS =====
    if (pathname === '/api/settings' && req.method === 'GET') {
      // Get settings
      return res.status(200).json({
        success: true,
        settings: {
          siteName: "AYNEXT",
          currency: "TND",
          language: "fr"
        }
      });
    }

    if (pathname === '/api/settings' && req.method === 'PUT') {
      // Update settings (admin only)
      const token = req.headers['x-auth-token'];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token d'authentification requis"
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_2024');
        if (decoded.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: "Accès administrateur requis"
          });
        }

        return res.status(200).json({
          success: true,
          message: "Paramètres mis à jour avec succès"
        });
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: "Token invalide ou expiré"
        });
      }
    }

    return res.status(404).json({
      success: false,
      message: "Endpoint non trouvé"
    });

  } catch (error) {
    console.error('Erreur app:', error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

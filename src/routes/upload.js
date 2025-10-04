const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Configuration de multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/products');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${extension}`);
  }
});

// Filtre pour accepter seulement les images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont acceptées'), false);
  }
};

// Configuration de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// @route   POST /api/upload/product-image
// @desc    Upload une image de produit
// @access  Private (Admin)
router.post('/product-image', [auth, admin], upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    // Retourner l'URL de l'image uploadée
    const imageUrl = `/uploads/products/${req.file.filename}`;
    
    res.json({
      message: 'Image uploadée avec succès',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Erreur upload image:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload de l\'image' });
  }
});

// @route   POST /api/upload/product-images
// @desc    Upload plusieurs images de produit
// @access  Private (Admin)
router.post('/product-images', [auth, admin], upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    // Retourner les URLs des images uploadées
    const imageUrls = req.files.map(file => ({
      url: `/uploads/products/${file.filename}`,
      filename: file.filename
    }));
    
    res.json({
      message: 'Images uploadées avec succès',
      images: imageUrls
    });
  } catch (error) {
    console.error('Erreur upload images:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload des images' });
  }
});

// @route   DELETE /api/upload/product-image/:filename
// @desc    Supprimer une image de produit
// @access  Private (Admin)
router.delete('/product-image/:filename', [auth, admin], (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads/products', filename);
    
    // Vérifier si le fichier existe
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Image supprimée avec succès' });
    } else {
      res.status(404).json({ message: 'Image non trouvée' });
    }
  } catch (error) {
    console.error('Erreur suppression image:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'image' });
  }
});

module.exports = router;

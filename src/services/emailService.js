const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  initializeTransporter() {
    if (this.initialized && this.transporter) {
      return this.transporter;
    }

    // Vérifier que les variables d'environnement sont disponibles
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Service email non configuré. EMAIL_USER ou EMAIL_PASSWORD manquant.');
      return null;
    }

    // Configuration pour Gmail avec les paramètres qui fonctionnent
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true pour port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      }
    });

    this.initialized = true;
    console.log('✅ Service email initialisé avec succès');
    return this.transporter;
  }

  async sendWelcomeEmail(user) {
    try {
      // Initialiser le transporter de manière paresseuse
      const transporter = this.initializeTransporter();
      if (!transporter) {
        console.log('⚠️ Service email non configuré - Email de bienvenue ignoré');
        return { success: false, error: 'Service email non configuré' };
      }

      const mailOptions = {
        from: `"AYNEXT Boutique" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '🎉 Bienvenue chez AYNEXT !',
        html: this.generateWelcomeEmailHTML(user),
        text: this.generateWelcomeEmailText(user)
      };

      console.log('📧 Tentative d\'envoi d\'email de bienvenue à:', user.email);
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email de bienvenue envoyé avec succès à:', user.email);
      console.log('📧 Message ID:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue:', error.message);
      console.log('⚠️ La connexion OAuth continue malgré l\'erreur email');
      return { success: false, error: error.message };
    }
  }

  generateWelcomeEmailHTML(user) {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue chez AYNEXT</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                background: linear-gradient(135deg, #000 0%, #ef4444 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 2.5em;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .welcome-text {
                font-size: 1.2em;
                margin-bottom: 20px;
            }
            .user-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #ef4444;
            }
            .features {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 20px 0;
            }
            .feature {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #000 0%, #ef4444 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                margin: 20px 0;
                transition: transform 0.3s ease;
            }
            .cta-button:hover {
                transform: translateY(-2px);
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 0.9em;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                display: inline-block;
                margin: 0 10px;
                color: #ef4444;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">AYNEXT</div>
                <div class="welcome-text">Bienvenue dans notre famille !</div>
            </div>

            <h2>Bonjour ${user.prenom} ${user.nom} ! 👋</h2>
            
            <p>Nous sommes ravis de vous accueillir chez <strong>AYNEXT</strong>, votre boutique de vêtements tendance !</p>

            <div class="user-info">
                <h3>📧 Votre compte a été créé avec succès</h3>
                <p><strong>Email :</strong> ${user.email}</p>
                <p><strong>Date d'inscription :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>

            <h3>🎉 Ce qui vous attend chez AYNEXT :</h3>
            
            <div class="features">
                <div class="feature">
                    <h4>🛍️ Vêtements Tendances</h4>
                    <p>Plus de 15 000 références</p>
                </div>
                <div class="feature">
                    <h4>💳 Paiement Sécurisé</h4>
                    <p>À partir de 0 TND</p>
                </div>
                <div class="feature">
                    <h4>🚚 Livraison Rapide</h4>
                    <p>Partout en Tunisie</p>
                </div>
                <div class="feature">
                    <h4>🎨 Personnalisation</h4>
                    <p>Capuches sur mesure</p>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/products" class="cta-button">
                    🛒 Découvrir nos produits
                </a>
            </div>

            <h3>📱 Restez connecté avec nous :</h3>
            <div class="social-links">
                <a href="#">Facebook</a>
                <a href="#">Instagram</a>
                <a href="#">Twitter</a>
                <a href="#">LinkedIn</a>
            </div>

            <div class="footer">
                <p><strong>AYNEXT</strong> - Boutique de vêtements tendance</p>
                <p>📍 rue ddddd, 1000 masra | 📞 55100867 | ✉️ ayoubbenromdan8@gmail.com</p>
                <p>© 2025 AYNEXT. Tous droits réservés.</p>
                <p>Site créé avec ❤️ pour votre style</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateWelcomeEmailText(user) {
    return `
Bienvenue chez AYNEXT !

Bonjour ${user.prenom} ${user.nom} !

Nous sommes ravis de vous accueillir chez AYNEXT, votre boutique de vêtements tendance !

Votre compte a été créé avec succès :
- Email : ${user.email}
- Date d'inscription : ${new Date().toLocaleDateString('fr-FR')}

Ce qui vous attend chez AYNEXT :
🛍️ Plus de 15 000 références de vêtements tendances
💳 Paiement sécurisé à partir de 0 TND
🚚 Livraison rapide partout en Tunisie
🎨 Personnalisation de capuches sur mesure

Découvrez nos produits : ${process.env.CLIENT_URL || 'http://localhost:3000'}/products

Restez connecté avec nous sur nos réseaux sociaux !

AYNEXT - Boutique de vêtements tendance
📍 rue ddddd, 1000 masra | 📞 55100867 | ✉️ ayoubbenromdan8@gmail.com
© 2025 AYNEXT. Tous droits réservés.
Site créé avec ❤️ pour votre style
    `;
  }

  async sendNewProductEmail(clients, product) {
    try {
      // Initialiser le transporter de manière paresseuse
      const transporter = this.initializeTransporter();
      if (!transporter) {
        console.log('⚠️ Service email non configuré - Email de nouveau produit ignoré');
        return { success: false, error: 'Service email non configuré' };
      }

      if (!clients || clients.length === 0) {
        console.log('⚠️ Aucun client à notifier');
        return { success: false, error: 'Aucun client' };
      }

      console.log(`📧 Envoi d'email de nouveau produit à ${clients.length} client(s)...`);

      const emailPromises = clients.map(client => {
        const mailOptions = {
          from: `"AYNEXT Boutique" <${process.env.EMAIL_USER}>`,
          to: client.email,
          subject: `🎉 Nouveau produit : ${product.nom}`,
          html: this.generateNewProductEmailHTML(client, product),
          text: this.generateNewProductEmailText(client, product)
        };

        return transporter.sendMail(mailOptions)
          .then(result => {
            console.log(`✅ Email envoyé à ${client.email}`);
            return { success: true, email: client.email, messageId: result.messageId };
          })
          .catch(error => {
            console.error(`❌ Erreur envoi email à ${client.email}:`, error.message);
            return { success: false, email: client.email, error: error.message };
          });
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`✅ Emails envoyés: ${successCount} succès, ${failCount} échecs`);
      
      return { 
        success: true, 
        sent: successCount, 
        failed: failCount,
        results 
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des emails de nouveau produit:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateNewProductEmailHTML(client, product) {
    const productUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/product/${product._id}`;
    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : '';
    const prix = product.prixReduit || product.prix;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouveau Produit - AYNEXT</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                background: linear-gradient(135deg, #000 0%, #ef4444 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 2.5em;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .badge {
                display: inline-block;
                background-color: #fbbf24;
                color: #000;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 0.9em;
                margin: 10px 0;
            }
            .product-container {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .product-image {
                width: 100%;
                height: auto;
                border-radius: 10px;
                margin-bottom: 20px;
            }
            .product-name {
                font-size: 1.8em;
                font-weight: bold;
                color: #000;
                margin: 15px 0;
                text-align: center;
            }
            .product-description {
                color: #666;
                margin: 15px 0;
                line-height: 1.8;
            }
            .price-container {
                text-align: center;
                margin: 20px 0;
            }
            .price {
                font-size: 2em;
                font-weight: bold;
                color: #ef4444;
            }
            .old-price {
                font-size: 1.2em;
                color: #999;
                text-decoration: line-through;
                margin-right: 10px;
            }
            .product-details {
                background-color: white;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .detail-label {
                font-weight: bold;
                color: #666;
            }
            .detail-value {
                color: #000;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #000 0%, #ef4444 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                font-size: 1.1em;
                margin: 20px 0;
                transition: transform 0.3s ease;
                text-align: center;
            }
            .cta-container {
                text-align: center;
                margin: 30px 0;
            }
            .features {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin: 20px 0;
            }
            .feature {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                border: 2px solid #ef4444;
            }
            .feature-icon {
                font-size: 2em;
                margin-bottom: 10px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 0.9em;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎯 AYNEXT</div>
                <div class="badge">✨ NOUVEAU PRODUIT ✨</div>
            </div>

            <p style="font-size: 1.1em; color: #333;">
                Bonjour <strong>${client.prenom}</strong>,
            </p>

            <p style="color: #666; font-size: 1em;">
                Nous avons le plaisir de vous présenter notre <strong>tout nouveau produit</strong> qui vient d'arriver dans notre boutique !
            </p>

            <div class="product-container">
                ${imageUrl ? `<img src="${imageUrl}" alt="${product.nom}" class="product-image" />` : ''}
                
                <div class="product-name">${product.nom}</div>

                <div class="product-description">
                    ${product.description || 'Découvrez ce produit exceptionnel dans notre boutique.'}
                </div>

                <div class="product-details">
                    <div class="detail-row">
                        <span class="detail-label">Marque</span>
                        <span class="detail-value">${product.marque || 'AYNEXT'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Catégorie</span>
                        <span class="detail-value">${product.categorie === 'hoodie' ? 'Hoodie' : 'Pull'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Genre</span>
                        <span class="detail-value">${product.genre.charAt(0).toUpperCase() + product.genre.slice(1)}</span>
                    </div>
                </div>

                <div class="price-container">
                    ${product.prixReduit ? `<span class="old-price">${product.prix} TND</span>` : ''}
                    <div class="price">${prix} TND</div>
                </div>
            </div>

            <div class="features">
                <div class="feature">
                    <div class="feature-icon">🚚</div>
                    <div><strong>Livraison rapide</strong></div>
                </div>
                <div class="feature">
                    <div class="feature-icon">✅</div>
                    <div><strong>Stock disponible</strong></div>
                </div>
            </div>

            <div class="cta-container">
                <a href="${productUrl}" class="cta-button">
                    🛍️ Voir le produit
                </a>
            </div>

            <p style="color: #666; text-align: center; margin: 20px 0;">
                Ne manquez pas cette opportunité ! Commandez dès maintenant avant rupture de stock.
            </p>

            <div class="footer">
                <p><strong>AYNEXT</strong> - Boutique de vêtements tendance</p>
                <p>Style, Qualité, Innovation</p>
                <p style="font-size: 0.8em; color: #999; margin-top: 15px;">
                    Vous recevez cet email car vous êtes inscrit à notre boutique.<br>
                    Pour ne plus recevoir ces notifications, contactez-nous.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateNewProductEmailText(client, product) {
    const productUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/product/${product._id}`;
    const prix = product.prixReduit || product.prix;

    return `
NOUVEAU PRODUIT CHEZ AYNEXT !

Bonjour ${client.prenom},

Nous avons le plaisir de vous présenter notre tout nouveau produit :

${product.nom}
${product.marque || 'AYNEXT'}

${product.description || 'Découvrez ce produit exceptionnel dans notre boutique.'}

Prix : ${prix} TND ${product.prixReduit ? `(au lieu de ${product.prix} TND)` : ''}

Catégorie : ${product.categorie === 'hoodie' ? 'Hoodie' : 'Pull'}
Genre : ${product.genre.charAt(0).toUpperCase() + product.genre.slice(1)}

✓ Livraison rapide
✓ Stock disponible
✓ Paiement sécurisé

Voir le produit : ${productUrl}

Ne manquez pas cette opportunité ! Commandez dès maintenant.

L'équipe AYNEXT
Boutique de vêtements tendance
    `;
  }

  async sendOrderStatusEmail(user, order, newStatus) {
    try {
      // Initialiser le transporter de manière paresseuse
      const transporter = this.initializeTransporter();
      if (!transporter) {
        console.log('⚠️ Service email non configuré - Email de statut de commande ignoré');
        return { success: false, error: 'Service email non configuré' };
      }

      const statusInfo = this.getStatusInfo(newStatus);
      
      const mailOptions = {
        from: `"AYNEXT Boutique" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `${statusInfo.emoji} ${statusInfo.subject} - Commande #${order.numeroCommande}`,
        html: this.generateOrderStatusEmailHTML(user, order, newStatus, statusInfo),
        text: this.generateOrderStatusEmailText(user, order, newStatus, statusInfo)
      };

      console.log(`📧 Envoi d'email de statut de commande à ${user.email} (${newStatus})`);
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email de statut envoyé avec succès à: ${user.email}`);
      console.log('📧 Message ID:', result.messageId);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email de statut:', error.message);
      return { success: false, error: error.message };
    }
  }

  getStatusInfo(status) {
    const statusMap = {
      'confirmee': {
        emoji: '✅',
        title: 'Commande Confirmée',
        subject: 'Votre commande est confirmée',
        message: 'Nous avons bien reçu et confirmé votre commande. Notre équipe va bientôt la préparer.',
        color: '#10b981',
        icon: '✅'
      },
      'en_preparation': {
        emoji: '🔧',
        title: 'En Préparation',
        subject: 'Votre commande est en préparation',
        message: 'Votre commande est actuellement en cours de préparation dans nos entrepôts.',
        color: '#f59e0b',
        icon: '🔧'
      },
      'expediee': {
        emoji: '🚚',
        title: 'Commande Expédiée',
        subject: 'Votre commande a été expédiée',
        message: 'Bonne nouvelle ! Votre commande a été expédiée et est en route vers vous.',
        color: '#3b82f6',
        icon: '🚚'
      },
      'livree': {
        emoji: '📦',
        title: 'Commande Livrée',
        subject: 'Votre commande a été livrée',
        message: 'Votre commande a été livrée avec succès. Nous espérons que vous apprécierez vos produits !',
        color: '#10b981',
        icon: '📦'
      },
      'annulee': {
        emoji: '❌',
        title: 'Commande Annulée',
        subject: 'Votre commande a été annulée',
        message: 'Votre commande a été annulée. Si vous avez des questions, n\'hésitez pas à nous contacter.',
        color: '#ef4444',
        icon: '❌'
      }
    };

    return statusMap[status] || {
      emoji: 'ℹ️',
      title: 'Mise à jour de commande',
      subject: 'Mise à jour de votre commande',
      message: 'Le statut de votre commande a été mis à jour.',
      color: '#6b7280',
      icon: 'ℹ️'
    };
  }

  generateOrderStatusEmailHTML(user, order, newStatus, statusInfo) {
    const orderUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/orders`;
    const trackingUrl = order.numeroSuivi ? `${process.env.CLIENT_URL || 'http://localhost:3000'}/tracking/${order.numeroSuivi}` : null;

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusInfo.title} - AYNEXT</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                background: linear-gradient(135deg, #000 0%, ${statusInfo.color} 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 2.5em;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .status-badge {
                display: inline-block;
                background-color: ${statusInfo.color};
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 1.1em;
                margin: 15px 0;
            }
            .status-icon {
                font-size: 3em;
                margin: 20px 0;
            }
            .order-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                border-left: 4px solid ${statusInfo.color};
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .info-label {
                font-weight: bold;
                color: #666;
            }
            .info-value {
                color: #000;
                font-weight: 600;
            }
            .message-box {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: center;
                border: 2px solid ${statusInfo.color};
            }
            .products-list {
                margin: 20px 0;
            }
            .product-item {
                display: flex;
                justify-content: space-between;
                padding: 15px;
                background-color: #f8f9fa;
                margin: 10px 0;
                border-radius: 8px;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #000 0%, ${statusInfo.color} 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                font-size: 1.1em;
                margin: 20px 0;
                transition: transform 0.3s ease;
            }
            .cta-container {
                text-align: center;
                margin: 30px 0;
            }
            .timeline {
                margin: 30px 0;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 10px;
            }
            .timeline-item {
                display: flex;
                align-items: center;
                padding: 10px 0;
                position: relative;
            }
            .timeline-dot {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background-color: #d1d5db;
                margin-right: 15px;
                flex-shrink: 0;
            }
            .timeline-dot.active {
                background-color: ${statusInfo.color};
                box-shadow: 0 0 0 4px ${statusInfo.color}33;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 0.9em;
            }
            .contact-info {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎯 AYNEXT</div>
                <div class="status-icon">${statusInfo.icon}</div>
                <div class="status-badge">${statusInfo.title}</div>
            </div>

            <p style="font-size: 1.2em; color: #333;">
                Bonjour <strong>${user.prenom} ${user.nom}</strong>,
            </p>

            <div class="message-box">
                <p style="font-size: 1.1em; margin: 0; color: #333;">
                    ${statusInfo.message}
                </p>
            </div>

            <div class="order-info">
                <h3 style="margin-top: 0; color: ${statusInfo.color};">📋 Détails de la commande</h3>
                <div class="info-row">
                    <span class="info-label">Numéro de commande</span>
                    <span class="info-value">#${order.numeroCommande}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date</span>
                    <span class="info-value">${new Date(order.dateCommande).toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Total</span>
                    <span class="info-value">${order.total.toFixed(2)} TND</span>
                </div>
                ${order.numeroSuivi ? `
                <div class="info-row">
                    <span class="info-label">Numéro de suivi</span>
                    <span class="info-value">${order.numeroSuivi}</span>
                </div>
                ` : ''}
            </div>

            ${order.articles && order.articles.length > 0 ? `
            <div class="products-list">
                <h3 style="color: #333;">🛍️ Articles commandés</h3>
                ${order.articles.map(article => `
                    <div class="product-item">
                        <span>${article.quantite}x ${article.produit?.nom || 'Produit'}</span>
                        <span style="font-weight: bold;">${(article.prixUnitaire * article.quantite).toFixed(2)} TND</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <div class="timeline">
                <h3 style="margin-top: 0; color: #333;">📍 Suivi de commande</h3>
                <div class="timeline-item">
                    <div class="timeline-dot ${['confirmee', 'en_preparation', 'expediee', 'livree'].includes(newStatus) ? 'active' : ''}"></div>
                    <span>Confirmée</span>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot ${['en_preparation', 'expediee', 'livree'].includes(newStatus) ? 'active' : ''}"></div>
                    <span>En préparation</span>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot ${['expediee', 'livree'].includes(newStatus) ? 'active' : ''}"></div>
                    <span>Expédiée</span>
                </div>
                <div class="timeline-item">
                    <div class="timeline-dot ${newStatus === 'livree' ? 'active' : ''}"></div>
                    <span>Livrée</span>
                </div>
            </div>

            <div class="cta-container">
                <a href="${orderUrl}" class="cta-button">
                    📦 Voir mes commandes
                </a>
            </div>

            ${trackingUrl ? `
            <div class="cta-container">
                <a href="${trackingUrl}" class="cta-button" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                    🔍 Suivre ma commande
                </a>
            </div>
            ` : ''}

            <div class="contact-info">
                <p style="margin: 5px 0;"><strong>Une question ?</strong></p>
                <p style="margin: 5px 0;">📞 55100867</p>
                <p style="margin: 5px 0;">✉️ ayoubbenromdan8@gmail.com</p>
            </div>

            <div class="footer">
                <p><strong>AYNEXT</strong> - Boutique de vêtements tendance</p>
                <p>Style, Qualité, Innovation</p>
                <p style="font-size: 0.8em; color: #999; margin-top: 15px;">
                    Vous recevez cet email concernant votre commande #${order.numeroCommande}<br>
                    Merci de votre confiance !
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateOrderStatusEmailText(user, order, newStatus, statusInfo) {
    const orderUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/orders`;
    const trackingUrl = order.numeroSuivi ? `${process.env.CLIENT_URL || 'http://localhost:3000'}/tracking/${order.numeroSuivi}` : null;

    return `
${statusInfo.emoji} ${statusInfo.title.toUpperCase()}

Bonjour ${user.prenom} ${user.nom},

${statusInfo.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DÉTAILS DE LA COMMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Numéro de commande : #${order.numeroCommande}
Date : ${new Date(order.dateCommande).toLocaleDateString('fr-FR')}
Total : ${order.total.toFixed(2)} TND
${order.numeroSuivi ? `Numéro de suivi : ${order.numeroSuivi}` : ''}

${order.articles && order.articles.length > 0 ? `
🛍️ ARTICLES COMMANDÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${order.articles.map(article => 
  `${article.quantite}x ${article.produit?.nom || 'Produit'} - ${(article.prixUnitaire * article.quantite).toFixed(2)} TND`
).join('\n')}
` : ''}

📍 SUIVI DE COMMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${['confirmee', 'en_preparation', 'expediee', 'livree'].includes(newStatus) ? '✅' : '○'} Confirmée
${['en_preparation', 'expediee', 'livree'].includes(newStatus) ? '✅' : '○'} En préparation
${['expediee', 'livree'].includes(newStatus) ? '✅' : '○'} Expédiée
${newStatus === 'livree' ? '✅' : '○'} Livrée

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Voir mes commandes : ${orderUrl}
${trackingUrl ? `🔍 Suivre ma commande : ${trackingUrl}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNE QUESTION ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 55100867
✉️ ayoubbenromdan8@gmail.com

AYNEXT - Boutique de vêtements tendance
Style, Qualité, Innovation

Vous recevez cet email concernant votre commande #${order.numeroCommande}
Merci de votre confiance !
    `;
  }
}

module.exports = new EmailService();

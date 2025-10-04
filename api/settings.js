export default function handler(req, res) {
  if (req.method === 'GET') {
    const settings = {
      nomBoutique: "Boutique Vêtements",
      description: "Boutique de vêtements en ligne - Découvrez notre collection de vêtements tendance, hoodies personnalisés, t-shirts et accessoires de mode.",
      email: "contact@boutique-vetements.com",
      telephone: "+33 1 23 45 67 89",
      adresse: {
        rue: "123 Rue de la Mode",
        ville: "Paris",
        codePostal: "75001",
        pays: "France"
      },
      reseauxSociaux: {
        facebook: "https://facebook.com/boutique-vetements",
        instagram: "https://instagram.com/boutique-vetements",
        twitter: "https://twitter.com/boutique-vetements"
      },
      paiement: {
        stripe: {
          enabled: true,
          publicKey: "pk_test_..."
        },
        paypal: {
          enabled: true,
          clientId: "paypal_client_id"
        }
      },
      livraison: {
        frais: 4.99,
        gratuitA_partir: 50,
        delais: "2-5 jours ouvrés"
      },
      seo: {
        title: "Boutique Vêtements - Mode & Style | Vêtements Tendance en Ligne",
        description: "Découvrez notre collection de vêtements tendance, hoodies personnalisés et accessoires de mode. Livraison rapide et prix compétitifs.",
        keywords: "boutique vêtements, mode, hoodie, t-shirt, vêtements en ligne, e-commerce, style, tendance, personnalisation"
      },
      maintenance: false,
      version: "1.0.0"
    };

    return res.status(200).json({
      success: true,
      settings
    });
  }

  if (req.method === 'PUT') {
    const token = req.headers['x-auth-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token d'authentification requis"
      });
    }

    const updatedSettings = req.body;

    return res.status(200).json({
      success: true,
      message: "Paramètres mis à jour avec succès",
      settings: updatedSettings
    });
  }

  return res.status(405).json({
    success: false,
    message: "Méthode non autorisée"
  });
}

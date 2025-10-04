export default function handler(req, res) {
  if (req.method === 'GET') {
    const manifest = {
      "short_name": "Boutique Vêtements",
      "name": "Boutique de Vêtements en Ligne",
      "icons": [
        {
          "src": "favicon.ico",
          "sizes": "64x64 32x32 24x24 16x16",
          "type": "image/x-icon"
        }
      ],
      "start_url": ".",
      "display": "standalone",
      "theme_color": "#000000",
      "background_color": "#ffffff"
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.status(200).json(manifest);
  }

  return res.status(405).json({
    success: false,
    message: "Méthode non autorisée"
  });
}

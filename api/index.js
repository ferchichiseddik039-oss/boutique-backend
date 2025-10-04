const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
  try {
    // Servir le fichier index.html pour toutes les routes SPA
    const indexPath = path.join(__dirname, '../client/build/index.html');
    
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } else {
      // Fallback si le build n'existe pas
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>AYNEXT - Boutique de Vêtements</title>
          </head>
          <body>
            <div id="root">
              <h1>AYNEXT Boutique</h1>
              <p>Site en cours de déploiement...</p>
            </div>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).send('Erreur serveur');
  }
};

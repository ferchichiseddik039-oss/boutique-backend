@echo off
echo ========================================
echo 🚀 DÉPLOIEMENT SUR RAILWAY
echo ========================================
echo.

echo 📋 Vérification des fichiers...
if not exist "server.js" (
    echo ❌ server.js manquant
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ❌ package.json manquant
    pause
    exit /b 1
)

if not exist "railway.json" (
    echo ❌ railway.json manquant
    pause
    exit /b 1
)

echo ✅ Tous les fichiers présents

echo.
echo 🌐 Installation Railway CLI...
npm install -g @railway/cli
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur installation Railway CLI
    pause
    exit /b 1
)

echo.
echo 🔐 Connexion à Railway...
railway login
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur connexion Railway
    pause
    exit /b 1
)

echo.
echo 🚀 Déploiement sur Railway...
railway up
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur déploiement
    pause
    exit /b 1
)

echo.
echo ========================================
echo 🎉 DÉPLOIEMENT TERMINÉ !
echo ========================================
echo.
echo ✅ Backend déployé sur Railway
echo ✅ URL générée automatiquement
echo.
echo 📋 Prochaines étapes :
echo 1. Configurer les variables d'environnement
echo 2. Tester l'API
echo 3. Mettre à jour le frontend Vercel
echo.
pause

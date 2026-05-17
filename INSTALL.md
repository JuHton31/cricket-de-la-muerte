# 🚀 Installation de Cricket de la Muerte

## Déploiement Express (3 étapes)

### Option 1 : GitHub + Netlify (Recommandé)

```bash
# 1. Initialiser Git et pusher sur GitHub
git init
git add .
git commit -m "🎯 Cricket de la Muerte - Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/cricket-de-la-muerte.git
git push -u origin main
```

```
# 2. Sur netlify.com
- "Add new site" > "Import an existing project"
- Connecter GitHub
- Sélectionner le repo
- Deploy (le netlify.toml configure tout automatiquement)
```

```
# 3. C'est en ligne ! 🎉
https://VOTRE-SITE.netlify.app
```

---

### Option 2 : Déploiement Direct (1 étape)

1. Glissez-déposez le dossier complet sur [app.netlify.com/drop](https://app.netlify.com/drop)
2. C'est en ligne en 30 secondes ! 🚀

---

## Test Local

Si vous voulez tester localement avant de déployer :

```bash
# Avec Python
python -m http.server 8000

# Ou avec Node.js
npx serve

# Puis ouvrir http://localhost:8000
```

**⚠️ Important** : Le Service Worker nécessite HTTPS en production. En local, `localhost` est considéré comme sécurisé.

---

## Installation sur Mobile

### 📱 iOS (Safari)
1. Ouvrir l'app dans Safari
2. Bouton "Partager" (carré avec flèche)
3. "Sur l'écran d'accueil"
4. L'icône apparaît avec le nom "Cricket †"

### 🤖 Android (Chrome)
1. Ouvrir l'app dans Chrome
2. Prompt d'installation automatique
3. Ou Menu > "Installer l'application"
4. L'icône apparaît dans le tiroir d'apps

---

## Vérification PWA

Pour vérifier que votre PWA est correctement configurée :

1. **DevTools** > **Lighthouse**
2. Cocher **"Progressive Web App"**
3. Cliquer sur **"Generate report"**
4. Score attendu : **100/100** ✅

---

## Domaine Personnalisé (Optionnel)

Sur Netlify, allez dans **Domain settings** pour :
- Ajouter un domaine personnalisé
- Activer HTTPS automatique (Let's Encrypt)
- Configurer les DNS

---

**C'est tout ! Bonne chance, amigo ! 🎯🔫💀**

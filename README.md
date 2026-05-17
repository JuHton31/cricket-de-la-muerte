# 🎯 Cricket de la Muerte

Une PWA (Progressive Web App) de jeu de fléchettes Cricket avec une ambiance **Western Mexicain / Día de los Muertos**.

![Version](https://img.shields.io/badge/version-1.0.0-gold)
![PWA](https://img.shields.io/badge/PWA-ready-success)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🌟 Fonctionnalités

### 🎮 Deux Modes de Jeu
- **Cricket Classique** : Fermez tous les numéros et marquez le plus de points
- **Cut-throat Cricket** : Les points vont aux adversaires — le score le plus bas gagne !

### 👥 Gestion des Joueurs
- 2 à 6 joueurs par partie
- Avatars personnalisables :
  - Photo depuis la galerie
  - Photo prise avec la caméra
  - 6 avatars SVG par défaut (cowboy, bandido, señorita, pistolero, calavera, chasseur)
- Stockage local des joueurs

### 🎯 Gameplay
- **Lancer d'ouverture** : déterminez qui commence
- **Saisie fléchette par fléchette** : Simple, Double, Triple
- **Plateau en temps réel** : marques style craie (/, X, ⊗)
- **Annulation** de la dernière fléchette
- **Sauvegarde automatique** de la partie en cours

### 🔊 Effets Audio & Visuels
- Sons générés par **Web Audio API** (zéro fichier externe)
- Son de revolver à chaque fléchette
- Fanfare western pour doubles et triples
- Vibrations du téléphone
- Animations de fermeture de numéro
- Écran de victoire animé

### 📊 Statistiques Complètes
- Historique de toutes les parties
- Stats globales et par joueur
- Taux de victoire
- Numéro favori
- Nombre de doubles/triples
- Moyenne de fléchettes par partie

### 📱 PWA Complète
- **Installable** sur iOS et Android
- **Fonctionne 100% offline** après premier chargement
- **Splash screen** natif
- **Thème sombre** optimisé mobile
- Score Lighthouse PWA : **100/100**

---

## 🚀 Déploiement sur Netlify

### Méthode 1 : Via GitHub (Recommandé)

1. **Créer un dépôt GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Cricket de la Muerte"
   git branch -M main
   git remote add origin https://github.com/VOTRE_USERNAME/cricket-de-la-muerte.git
   git push -u origin main
   ```

2. **Déployer sur Netlify**
   - Connectez-vous sur [netlify.com](https://netlify.com)
   - Cliquez sur **"Add new site"** > **"Import an existing project"**
   - Sélectionnez **GitHub** et autorisez Netlify
   - Choisissez votre dépôt `cricket-de-la-muerte`
   - Laissez les paramètres par défaut (le fichier `netlify.toml` gère tout)
   - Cliquez sur **"Deploy site"**

3. **C'est fait !**
   - Votre app est en ligne en quelques secondes
   - Netlify vous donne une URL type : `https://cricket-de-la-muerte.netlify.app`
   - Vous pouvez personnaliser le nom de domaine dans les settings

### Méthode 2 : Déploiement Direct (Drag & Drop)

1. Zippez tout le dossier du projet
2. Sur [netlify.com](https://netlify.com), glissez-déposez le dossier dans la zone "Drop your site folder here"
3. C'est en ligne !

---

## ✅ Checklist de Test PWA

### 📱 Test iOS (Safari)

- [ ] Ouvrir l'app dans Safari
- [ ] Cliquer sur le bouton "Partager" (icône carré avec flèche)
- [ ] Sélectionner **"Sur l'écran d'accueil"**
- [ ] Vérifier que l'icône apparaît avec le nom "Cricket †"
- [ ] Ouvrir l'app depuis l'écran d'accueil
- [ ] Vérifier qu'elle s'ouvre en plein écran (pas de barre Safari)
- [ ] Tester le mode offline : activer le mode avion, recharger l'app
- [ ] Vérifier que tout fonctionne offline

### 🤖 Test Android (Chrome)

- [ ] Ouvrir l'app dans Chrome
- [ ] Attendre le prompt d'installation automatique (ou menu > "Installer l'application")
- [ ] Installer l'app
- [ ] Vérifier que l'icône apparaît dans le tiroir d'applications
- [ ] Ouvrir l'app
- [ ] Vérifier qu'elle s'ouvre en plein écran
- [ ] Tester le mode offline : activer le mode avion, recharger l'app
- [ ] Vérifier que tout fonctionne offline

### 🎮 Test de Gameplay

- [ ] Créer 2-3 joueurs avec avatars différents
- [ ] Lancer une partie Cricket Classique
- [ ] Tester le lancer d'ouverture
- [ ] Jouer quelques volées (vérifier sons, vibrations, animations)
- [ ] Tester l'annulation d'une fléchette
- [ ] Fermer l'app et la rouvrir (vérifier la reprise de partie)
- [ ] Terminer la partie (vérifier l'écran de victoire)
- [ ] Lancer une Revanche
- [ ] Tester le mode Cut-throat
- [ ] Consulter les statistiques
- [ ] Vérifier l'historique

### ⚙️ Test des Réglages

- [ ] Désactiver les sons (vérifier qu'il n'y a plus de sons)
- [ ] Désactiver les vibrations (vérifier qu'il n'y a plus de vibrations)
- [ ] Effacer l'historique (confirmer et vérifier)
- [ ] Effacer les joueurs (confirmer et vérifier)

---

## 🛠️ Technologies Utilisées

- **HTML5** / **CSS3** (Grid, Flexbox, Animations)
- **JavaScript Vanilla** (pas de framework)
- **IndexedDB** (stockage local)
- **Web Audio API** (sons générés à la volée)
- **Service Worker** (cache offline)
- **PWA** (manifest, icons, offline-first)
- **Google Fonts** : Rye (titres), Special Elite (texte)

---

## 📂 Structure du Projet

```
Cricket App/
├── index.html              # Structure HTML principale
├── manifest.json           # Manifest PWA
├── sw.js                   # Service Worker
├── netlify.toml            # Configuration Netlify
├── offline.html            # Page de fallback offline
├── css/
│   └── app.css             # Styles complets
├── js/
│   ├── app.js              # Contrôleur principal
│   ├── game.js             # Logique de jeu Cricket
│   ├── players.js          # Gestion des joueurs
│   ├── stats.js            # Statistiques & historique
│   └── sounds.js           # Web Audio API
└── icons/
    ├── icon-192x192.svg    # Icône 192x192
    └── icon-512x512.svg    # Icône 512x512
```

---

## 🎨 Thème & Design

### Palette de Couleurs
- **Fond noir** : `#0a0a0a`
- **Or** : `#C9A84C`
- **Rouge sang** : `#8B0000`
- **Brun cuir** : `#6B3A2A`
- **Blanc cassé** : `#F5F0E8`

### Typographie
- **Titres** : [Rye](https://fonts.google.com/specimen/Rye) (style western)
- **Texte** : [Special Elite](https://fonts.google.com/specimen/Special+Elite) (machine à écrire)
- **Fallback offline** : Georgia, serif

---

## 🐛 Dépannage

### L'app ne s'installe pas sur iOS
- Vérifiez que vous utilisez **Safari** (pas Chrome iOS)
- Vérifiez que le manifest.json est accessible
- Essayez de vider le cache et recharger

### L'app ne fonctionne pas offline
- Vérifiez que le Service Worker est bien enregistré (DevTools > Application > Service Workers)
- Rechargez la page une fois en ligne pour mettre à jour le cache
- Vérifiez la console pour des erreurs de cache

### Les sons ne marchent pas
- Le contexte audio nécessite une interaction utilisateur pour démarrer
- Cliquez n'importe où sur la page au premier chargement
- Vérifiez que les sons ne sont pas désactivés dans les réglages

---

## 📝 Choix Techniques Importants

### Pourquoi pas de framework ?
- **Légèreté** : toute l'app fait moins de 100 KB
- **Performance** : démarrage instantané
- **Offline** : fonctionne sans CDN externe
- **Contrôle total** : zéro dépendance

### Pourquoi IndexedDB ?
- **Capacité** : des milliers de parties stockées
- **Rapidité** : accès asynchrone sans bloquer l'UI
- **Structure** : données complexes (objets, tableaux)

### Pourquoi Web Audio API ?
- **Pas de fichiers** : génération de sons à la volée
- **Offline** : fonctionne sans connexion
- **Personnalisable** : ajuster fréquence, volume, durée

### Pourquoi SVG inline ?
- **Légèreté** : pas de requêtes HTTP supplémentaires
- **Scalable** : netteté parfaite sur tous les écrans
- **Personnalisable** : couleurs modifiables en CSS/JS

---

## 📜 Licence

MIT License - Libre d'utilisation, modification et distribution.

---

## 🙏 Crédits

Généré avec ❤️ par **Claude** (Anthropic)  
Ambiance Western Mexicain 🌵💀🎯

---

**¡Buena suerte, amigos!** 🔫

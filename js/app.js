/**
 * CRICKET DE LA MUERTE — Contrôleur Principal
 * Gère la navigation, l'initialisation, la reprise de partie
 * Enregistrement du Service Worker
 */

const App = (() => {
    let deferredPrompt = null;
    let selectedGameMode = 'classic';
    let selectedPlayers = [];
    let selectedNumber = null;

    /**
     * Initialiser l'application
     */
    async function init() {
        console.log('🎯 Cricket de la Muerte - Initialisation...');

        // Initialiser la base de données
        await PlayersManager.initDB();

        // Charger les paramètres audio
        const settings = SoundsManager.loadSettings();
        document.getElementById('setting-sounds').checked = settings.soundsEnabled;
        document.getElementById('setting-vibrations').checked = settings.vibrationsEnabled;

        // Initialiser les écrans
        PlayersManager.initPlayersScreen();
        StatsManager.initStatsScreen();
        initNavigationEvents();
        initGameSetupEvents();
        initOpeningThrowEvents();
        initInGameEvents();
        initGameOverEvents();
        initSettingsEvents();

        // Charger les joueurs existants
        await PlayersManager.renderPlayersList();

        // Vérifier s'il y a une partie en cours
        const hasGame = await GameManager.hasCurrentGame();
        if (hasGame) {
            document.getElementById('resume-game-btn').classList.remove('hidden');
        }

        // Gérer le prompt d'installation
        handleInstallPrompt();

        // Enregistrer le Service Worker
        registerServiceWorker();

        console.log('✅ Application prête !');
    }

    /**
     * Navigation entre les écrans
     */
    function initNavigationEvents() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const screens = document.querySelectorAll('.screen');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const screenName = btn.dataset.screen;

                // Désactiver tous les boutons et écrans
                navButtons.forEach(b => b.classList.remove('active'));
                screens.forEach(s => s.classList.remove('active'));

                // Activer le bouton et l'écran correspondant
                btn.classList.add('active');
                const targetScreen = document.getElementById(`screen-${screenName}`);
                if (targetScreen) {
                    targetScreen.classList.add('active');
                }

                // Rafraîchir les données si nécessaire
                if (screenName === 'players') {
                    PlayersManager.renderPlayersList();
                } else if (screenName === 'stats') {
                    // Les stats se rafraîchissent automatiquement via les onglets
                }
            });
        });
    }

    /**
     * Événements de l'écran d'accueil
     */
    function initGameSetupEvents() {
        // Bouton Nouvelle Partie
        document.getElementById('new-game-btn').addEventListener('click', () => {
            navigateToScreen('screen-game-setup');
            loadPlayersForSetup();
        });

        // Bouton Reprendre la Partie
        document.getElementById('resume-game-btn').addEventListener('click', async () => {
            const loaded = await GameManager.loadCurrentGame();
            if (loaded) {
                navigateToScreen('screen-in-game');
                GameManager.renderScoreboard();
                GameManager.updateCurrentPlayerInfo();
                attachScoreboardTapEvents(); // Attacher les événements de tap
            }
        });

        // Sélection du mode de jeu
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedGameMode = btn.dataset.mode;
            });
        });

        // Bouton Lancer d'Ouverture
        document.getElementById('start-opening-throw-btn').addEventListener('click', () => {
            if (selectedPlayers.length < 2) {
                alert('Sélectionnez au moins 2 joueurs.');
                return;
            }
            navigateToScreen('screen-opening-throw');
            setupOpeningThrow();
        });

        // Bouton Annuler Setup
        document.getElementById('cancel-setup-btn').addEventListener('click', () => {
            navigateToScreen('screen-play');
        });
    }

    /**
     * Charger les joueurs disponibles pour la configuration
     */
    async function loadPlayersForSetup() {
        const players = await PlayersManager.getAllPlayers();
        const container = document.getElementById('player-selection');

        if (players.length === 0) {
            container.innerHTML = `
                <div class="stats-empty" style="grid-column: 1/-1;">
                    <p>Aucun joueur disponible.</p>
                    <p>Ajoutez des joueurs depuis l'onglet "Joueurs".</p>
                </div>
            `;
            return;
        }

        container.innerHTML = players.map(player => `
            <div class="player-card" data-player-id="${player.id}">
                <img class="player-avatar" src="${player.avatar}" alt="${player.name}">
                <div class="player-card-name">${player.name}</div>
            </div>
        `).join('');

        // Événements de sélection
        selectedPlayers = [];
        container.querySelectorAll('.player-card').forEach(card => {
            card.addEventListener('click', () => {
                const playerId = parseInt(card.dataset.playerId);
                const player = players.find(p => p.id === playerId);

                if (card.classList.contains('selected')) {
                    // Désélectionner
                    card.classList.remove('selected');
                    selectedPlayers = selectedPlayers.filter(p => p.id !== playerId);
                } else {
                    // Sélectionner (max 6)
                    if (selectedPlayers.length >= 6) {
                        alert('Maximum 6 joueurs par partie.');
                        return;
                    }
                    card.classList.add('selected');
                    selectedPlayers.push(player);
                }

                // Activer/désactiver le bouton de démarrage
                document.getElementById('start-opening-throw-btn').disabled =
                    selectedPlayers.length < 2;
            });
        });
    }

    /**
     * Événements du lancer d'ouverture
     */
    function initOpeningThrowEvents() {
        // Bouton Valider le Gagnant
        document.getElementById('validate-opening-throw-btn').addEventListener('click', async () => {
            const checkedBoxes = document.querySelectorAll('#opening-throw-list input[type="checkbox"]:checked');

            if (checkedBoxes.length === 0) {
                alert('Sélectionnez le joueur qui a le meilleur lancer.');
                return;
            }

            if (checkedBoxes.length > 1) {
                // Égalité : afficher le bouton relancer
                alert('Plusieurs joueurs sont à égalité. Cliquez sur "Relancer (Égalité)" pour départager.');
                document.getElementById('retry-opening-throw-btn').classList.remove('hidden');
                return;
            }

            // Un seul gagnant
            const winnerId = parseInt(checkedBoxes[0].dataset.playerId);
            const orderedPlayers = reorderPlayersByOpening(winnerId);

            // Démarrer la partie
            await GameManager.startNewGame(selectedGameMode, orderedPlayers);
            navigateToScreen('screen-in-game');
            GameManager.renderScoreboard();
            GameManager.updateCurrentPlayerInfo();
            attachScoreboardTapEvents(); // Attacher les événements de tap
        });

        // Bouton Relancer (Égalité)
        document.getElementById('retry-opening-throw-btn').addEventListener('click', () => {
            // Filtrer les joueurs à égalité
            const checkedBoxes = document.querySelectorAll('#opening-throw-list input[type="checkbox"]:checked');
            const tiedPlayers = Array.from(checkedBoxes).map(checkbox => {
                const playerId = parseInt(checkbox.dataset.playerId);
                return selectedPlayers.find(p => p.id === playerId);
            });

            selectedPlayers = tiedPlayers;
            setupOpeningThrow();
            document.getElementById('retry-opening-throw-btn').classList.add('hidden');
        });

        // Bouton Annuler
        document.getElementById('cancel-opening-throw-btn').addEventListener('click', () => {
            navigateToScreen('screen-game-setup');
        });
    }

    /**
     * Configurer le lancer d'ouverture
     */
    function setupOpeningThrow() {
        const container = document.getElementById('opening-throw-list');

        container.innerHTML = selectedPlayers.map(player => `
            <div class="opening-throw-item">
                <input type="checkbox" data-player-id="${player.id}">
                <img class="player-avatar" src="${player.avatar}" alt="${player.name}">
                <div class="player-name">${player.name}</div>
            </div>
        `).join('');

        // Événements des cases à cocher
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const item = checkbox.closest('.opening-throw-item');
                if (checkbox.checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }

                // Activer le bouton de validation
                const anyChecked = container.querySelectorAll('input[type="checkbox"]:checked').length > 0;
                document.getElementById('validate-opening-throw-btn').disabled = !anyChecked;
            });
        });

        document.getElementById('validate-opening-throw-btn').disabled = true;
    }

    /**
     * Réordonner les joueurs en mettant le gagnant du lancer en premier
     */
    function reorderPlayersByOpening(winnerId) {
        const winner = selectedPlayers.find(p => p.id === winnerId);
        const others = selectedPlayers.filter(p => p.id !== winnerId);
        return [winner, ...others];
    }

    /**
     * Événements pendant le jeu
     */
    function initInGameEvents() {
        // Bouton Raté
        document.getElementById('miss-btn').addEventListener('click', async () => {
            await handleDartMiss();
        });

        // Bouton Annuler
        document.getElementById('undo-dart-btn').addEventListener('click', async () => {
            const success = await GameManager.undoLastDart();
            if (success) {
                GameManager.renderScoreboard();
                GameManager.updateCurrentPlayerInfo();
                attachScoreboardTapEvents(); // Réattacher les événements après re-render
            } else {
                alert('Impossible d\'annuler cette fléchette.');
            }
        });

        // Bouton Quitter la Partie
        document.getElementById('quit-game-btn').addEventListener('click', async () => {
            const quit = await GameManager.quitGame();
            if (quit) {
                navigateToScreen('screen-play');
                document.getElementById('resume-game-btn').classList.add('hidden');
            }
        });
    }

    /**
     * État des taps (persistant entre les renders)
     */
    const tapState = {};
    const TAP_TIMEOUT = 500; // 500ms entre les taps

    /**
     * Attacher les événements de tap sur les cellules du scoreboard
     * Appelé après chaque render du scoreboard
     */
    function attachScoreboardTapEvents() {
        // Utiliser la délégation d'événements sur le scoreboard
        const scoreboard = document.getElementById('scoreboard');

        // Retirer l'ancien listener s'il existe
        if (scoreboard._clickHandler) {
            scoreboard.removeEventListener('click', scoreboard._clickHandler);
        }

        // Créer un nouveau handler
        scoreboard._clickHandler = (event) => {
            const cell = event.target.closest('.clickable-cell');
            if (!cell) return;

            const number = parseInt(cell.dataset.number);
            const playerIndex = parseInt(cell.dataset.playerIndex);
            const key = `${playerIndex}-${number}`;

            if (!tapState[key]) {
                tapState[key] = { count: 0, timer: null };
            }

            const state = tapState[key];

            // Incrémenter le compteur de taps
            state.count++;

            // Limiter à 3 taps maximum
            if (state.count > 3) state.count = 1;

            // Animation de pulse
            cell.classList.add('tapping');
            setTimeout(() => cell.classList.remove('tapping'), 200);

            // Afficher l'indicateur de taps
            const indicator = cell.querySelector('.tap-indicator');
            indicator.textContent = `${state.count}x`;

            // Annuler le timer précédent
            if (state.timer) clearTimeout(state.timer);

            // Démarrer un nouveau timer
            state.timer = setTimeout(async () => {
                const multiplier = state.count;

                // Enregistrer la fléchette
                await handleDartInput(number, multiplier);

                // Réinitialiser l'état
                state.count = 0;
                indicator.textContent = '';
            }, TAP_TIMEOUT);
        };

        // Attacher le listener
        scoreboard.addEventListener('click', scoreboard._clickHandler);
    }

    /**
     * Gérer l'entrée d'une fléchette
     */
    async function handleDartInput(number, multiplier) {
        const result = await GameManager.recordDart(number, multiplier);

        GameManager.renderScoreboard();
        GameManager.updateCurrentPlayerInfo();
        attachScoreboardTapEvents(); // Réattacher les événements après re-render

        if (result.gameOver) {
            // Fin de partie
            GameManager.renderGameOver();
            navigateToScreen('screen-game-over');
            document.getElementById('resume-game-btn').classList.add('hidden');
        }
    }

    /**
     * Gérer une fléchette ratée
     */
    async function handleDartMiss() {
        const result = await GameManager.recordMiss();

        GameManager.renderScoreboard();
        GameManager.updateCurrentPlayerInfo();
        attachScoreboardTapEvents(); // Réattacher les événements après re-render

        if (result.gameOver) {
            GameManager.renderGameOver();
            navigateToScreen('screen-game-over');
            document.getElementById('resume-game-btn').classList.add('hidden');
        }
    }

    /**
     * Événements de fin de partie
     */
    function initGameOverEvents() {
        // Bouton Revanche
        document.getElementById('rematch-btn').addEventListener('click', async () => {
            // Relancer une partie avec les mêmes joueurs et le même mode
            const game = GameManager.getCurrentGameState();
            if (game) {
                const players = game.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar
                }));
                selectedPlayers = players;
                selectedGameMode = game.mode;

                // Nettoyer la partie terminée
                await GameManager.clearFinishedGame();

                // Lancer directement une nouvelle partie avec le même ordre de joueurs
                await GameManager.startNewGame(selectedGameMode, players);
                navigateToScreen('screen-in-game');
                GameManager.renderScoreboard();
                GameManager.updateCurrentPlayerInfo();
                attachScoreboardTapEvents();
            }
        });

        // Bouton Menu Principal
        document.getElementById('back-to-menu-btn').addEventListener('click', async () => {
            // Nettoyer la partie terminée
            await GameManager.clearFinishedGame();
            navigateToScreen('screen-play');
        });

        // Bouton Tester un autre GIF
        document.getElementById('test-gif-btn').addEventListener('click', () => {
            GameManager.renderGameOver(); // Recharger avec un nouveau GIF aléatoire
        });
    }

    /**
     * Événements des réglages
     */
    function initSettingsEvents() {
        // Sons
        document.getElementById('setting-sounds').addEventListener('change', (e) => {
            SoundsManager.toggleSounds(e.target.checked);
        });

        // Vibrations
        document.getElementById('setting-vibrations').addEventListener('change', (e) => {
            SoundsManager.toggleVibrations(e.target.checked);
        });

        // Effacer l'historique
        document.getElementById('clear-history-btn').addEventListener('click', () => {
            StatsManager.confirmClearHistory();
        });

        // Effacer les joueurs (déjà géré dans players.js)
    }

    /**
     * Naviguer vers un écran
     */
    function navigateToScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');

        // Désactiver tous les boutons de navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    }

    /**
     * Gérer le prompt d'installation PWA
     */
    function handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('install-prompt').classList.remove('hidden');
        });

        document.getElementById('install-button').addEventListener('click', async () => {
            if (!deferredPrompt) return;

            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('✅ PWA installée');
            }

            deferredPrompt = null;
            document.getElementById('install-prompt').classList.add('hidden');
        });

        document.getElementById('install-dismiss').addEventListener('click', () => {
            document.getElementById('install-prompt').classList.add('hidden');
        });

        // Détecter si l'app est déjà installée
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA installée avec succès');
            document.getElementById('install-prompt').classList.add('hidden');
        });
    }

    /**
     * Enregistrer le Service Worker
     */
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker enregistré:', registration.scope);

                // Vérifier les mises à jour
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 Nouvelle version disponible');
                            // Optionnel : afficher une notification de mise à jour
                        }
                    });
                });
            } catch (error) {
                console.error('❌ Erreur Service Worker:', error);
            }
        }
    }

    // Initialiser au chargement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API publique
    return {
        init,
        navigateToScreen
    };
})();

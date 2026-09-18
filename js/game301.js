/**
 * CRICKET DE LA MUERTE — Mode 301
 * Logique du jeu 301 : atteindre exactement 301 points
 * Double-out ou Triple-out obligatoire
 * Bust classique (annule la volée)
 */

const GameManager301 = (() => {
    // Configuration
    const TARGET_SCORE = 301;
    const CHECKOUT_THRESHOLD = 170; // Afficher suggestions dès ≤170

    // État de la partie en cours
    let currentGame = null;
    let db = null;
    let selectedNumber = null; // Nombre sélectionné en attente de validation
    let selectedMultiplier = 1; // Multiplicateur actif (1, 2 ou 3)

    /**
     * Structure d'une partie 301 :
     * {
     *   id: timestamp,
     *   mode: '301',
     *   players: [{
     *     id, name, avatar,
     *     score: 0,
     *     remaining: 301,
     *     dartsThrown: 0,
     *     currentRound: [],
     *     lastRound: [],  // Garde les fléchettes du dernier tour complet pour affichage
     *     roundsHistory: [],
     *     avgPerRound: 0
     *   }],
     *   currentPlayerIndex: 0,
     *   currentDart: 1,
     *   dartsHistory: [],
     *   startedAt, finishedAt
     * }
     */

    /**
     * Obtenir la base de données
     */
    function getDB() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open('CricketDeLaMuerte', 1);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Sauvegarder la partie en cours
     */
    async function saveCurrentGame() {
        if (!currentGame) return;

        const database = await getDB();
        const transaction = database.transaction(['currentGame'], 'readwrite');
        const store = transaction.objectStore('currentGame');

        await store.put({ id: 'current', game: currentGame });
    }

    /**
     * Charger la partie en cours
     */
    async function loadCurrentGame() {
        const database = await getDB();
        const transaction = database.transaction(['currentGame'], 'readonly');
        const store = transaction.objectStore('currentGame');

        return new Promise((resolve) => {
            const request = store.get('current');
            request.onsuccess = () => {
                if (request.result && request.result.game) {
                    currentGame = request.result.game;
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
            request.onerror = () => resolve(false);
        });
    }

    /**
     * Supprimer la partie en cours
     */
    async function clearCurrentGame() {
        const database = await getDB();
        const transaction = database.transaction(['currentGame'], 'readwrite');
        const store = transaction.objectStore('currentGame');

        await store.delete('current');
        currentGame = null;
    }

    /**
     * Initialiser une nouvelle partie 301
     */
    async function startNewGame301(selectedPlayers) {
        const players = selectedPlayers.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            score: 0,
            remaining: TARGET_SCORE,
            dartsThrown: 0,
            currentRound: [],
            lastRound: [],
            roundsHistory: [],
            avgPerRound: 0
        }));

        currentGame = {
            id: Date.now(),
            mode: '301',
            players,
            currentPlayerIndex: 0,
            currentDart: 1,
            dartsHistory: [],
            startedAt: Date.now(),
            finishedAt: null
        };

        await saveCurrentGame();
    }

    /**
     * Définir l'ordre des joueurs (après opening throw)
     */
    async function setPlayerOrder(orderedPlayers) {
        if (!currentGame) return;

        // Réordonner les joueurs existants selon l'ordre donné
        const reorderedPlayers = orderedPlayers.map(p => {
            const existing = currentGame.players.find(pl => pl.id === p.id);
            if (!existing) {
                // Si le joueur n'existe pas encore, l'initialiser (ne devrait pas arriver)
                return {
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    score: 0,
                    remaining: TARGET_SCORE,
                    dartsThrown: 0,
                    currentRound: [],
                    lastRound: [],
                    roundsHistory: [],
                    avgPerRound: 0
                };
            }
            return existing;
        });

        currentGame.players = reorderedPlayers;
        currentGame.currentPlayerIndex = 0;
        await saveCurrentGame();
    }

    /**
     * Obtenir le joueur actif
     */
    function getCurrentPlayer() {
        if (!currentGame) return null;
        return currentGame.players[currentGame.currentPlayerIndex];
    }

    /**
     * Enregistrer une fléchette
     */
    async function recordDart301(number, multiplier) {
        if (!currentGame) return;

        const player = getCurrentPlayer();
        const points = number * multiplier;

        // Si c'est la première fléchette du tour, vider lastRound pour afficher "Fléchette 1/3"
        if (currentGame.currentDart === 1 && player.currentRound.length === 0) {
            player.lastRound = [];
        }

        // Sauvegarder dans l'historique avant modification
        const roundStartScore = player.score;

        // Ajouter à la volée en cours
        player.currentRound.push({ number, multiplier, points });
        player.dartsThrown++;

        // Calculer le nouveau score
        const newScore = player.score + points;

        // Vérifier le bust
        const isBust = checkBust(player, newScore, multiplier);

        if (isBust) {
            // BUST ! Annuler toute la volée
            SoundsManager.playDartMiss();
            await handleBust(player, roundStartScore);
            return { gameOver: false, bust: true };
        }

        // Mise à jour du score
        player.score = newScore;
        player.remaining = TARGET_SCORE - newScore;

        // Ajouter à l'historique global
        currentGame.dartsHistory.push({
            playerIndex: currentGame.currentPlayerIndex,
            number,
            multiplier,
            points,
            timestamp: Date.now()
        });

        // Effets sonores
        SoundsManager.playDartHit(multiplier);

        // Vérifier la victoire
        if (newScore === TARGET_SCORE) {
            await endGame(player);
            return { gameOver: true, winner: player };
        }

        // Passer à la fléchette suivante
        currentGame.currentDart++;

        if (currentGame.currentDart > 3) {
            // Fin de volée : sauvegarder la volée et calculer moyenne
            finishRound(player);

            // Passer au joueur suivant
            currentGame.currentDart = 1;
            currentGame.currentPlayerIndex = (currentGame.currentPlayerIndex + 1) % currentGame.players.length;
        }

        await saveCurrentGame();
        render301Interface();

        return { gameOver: false, bust: false };
    }

    /**
     * Enregistrer un MISS
     */
    async function recordMiss() {
        return await recordDart301(0, 0);
    }

    /**
     * Vérifier si c'est un bust
     */
    function checkBust(player, newScore, multiplier) {
        // Dépassement de 301
        if (newScore > TARGET_SCORE) {
            return true;
        }

        // Score exact de 301 mais pas avec double/triple
        if (newScore === TARGET_SCORE && multiplier === 1) {
            return true;
        }

        const remaining = TARGET_SCORE - newScore;

        // Score de 1 point restant (impossible de sortir)
        if (remaining === 1) {
            return true;
        }

        return false;
    }

    /**
     * Gérer un bust
     */
    async function handleBust(player, roundStartScore) {
        // Annuler toute la volée
        player.score = roundStartScore;
        player.remaining = TARGET_SCORE - roundStartScore;

        // Compter les fléchettes mais ne pas compter les points
        const dartsInRound = player.currentRound.length;

        // Sauvegarder les fléchettes pour affichage (même si c'est un bust)
        player.lastRound = [...player.currentRound];

        // Vider la volée en cours
        player.currentRound = [];

        // Ajouter une entrée dans l'historique marquée comme BUST
        player.roundsHistory.push({
            darts: [],
            totalPoints: 0,
            bust: true,
            dartsThrown: dartsInRound
        });

        // Passer au joueur suivant
        currentGame.currentDart = 1;
        currentGame.currentPlayerIndex = (currentGame.currentPlayerIndex + 1) % currentGame.players.length;

        await saveCurrentGame();
        render301Interface();

        // Afficher un message BUST
        showBustMessage();
    }

    /**
     * Afficher le message BUST
     */
    function showBustMessage() {
        // TODO: Ajouter une animation/modal pour indiquer le BUST
        console.log('🚫 BUST !');
    }

    /**
     * Terminer une volée
     */
    function finishRound(player) {
        const roundTotal = player.currentRound.reduce((sum, dart) => sum + dart.points, 0);

        player.roundsHistory.push({
            darts: [...player.currentRound],
            totalPoints: roundTotal,
            bust: false
        });

        // Calculer la moyenne par volée
        const totalRounds = player.roundsHistory.filter(r => !r.bust).length;
        if (totalRounds > 0) {
            player.avgPerRound = player.score / totalRounds;
        }

        // Sauvegarder les fléchettes pour affichage continu
        player.lastRound = [...player.currentRound];

        // Vider la volée en cours
        player.currentRound = [];
    }

    /**
     * Annuler la dernière fléchette
     */
    async function undoLastDart() {
        if (!currentGame || currentGame.dartsHistory.length === 0) {
            return false; // Aucune fléchette dans l'historique
        }

        const currentPlayer = getCurrentPlayer();

        // Cas 1 : Le joueur actif a des fléchettes dans sa volée en cours
        if (currentPlayer.currentRound.length > 0) {
            // Annuler la dernière fléchette du joueur actif
            const lastDart = currentPlayer.currentRound.pop();

            currentPlayer.score -= lastDart.points;
            currentPlayer.remaining = TARGET_SCORE - currentPlayer.score;
            currentPlayer.dartsThrown--;

            currentGame.dartsHistory.pop();
            currentGame.currentDart--;

            await saveCurrentGame();
            render301Interface();
            return true;
        }

        // Cas 2 : Le joueur actif n'a pas encore lancé (currentDart === 1)
        // On doit annuler la dernière fléchette du joueur précédent (sa 3ème fléchette)
        if (currentGame.currentDart === 1 && currentGame.dartsHistory.length > 0) {
            // Trouver le joueur précédent
            const previousPlayerIndex = (currentGame.currentPlayerIndex - 1 + currentGame.players.length) % currentGame.players.length;
            const previousPlayer = currentGame.players[previousPlayerIndex];

            // La volée du joueur précédent a été terminée et enregistrée dans lastRound
            if (previousPlayer.lastRound && previousPlayer.lastRound.length === 3) {
                // Restaurer les 3 fléchettes dans currentRound
                previousPlayer.currentRound = [...previousPlayer.lastRound];

                // Retirer la dernière fléchette (la 3ème)
                const lastDart = previousPlayer.currentRound.pop();

                // Recalculer le score
                previousPlayer.score -= lastDart.points;
                previousPlayer.remaining = TARGET_SCORE - previousPlayer.score;
                previousPlayer.dartsThrown--;

                // Retirer de l'historique global
                currentGame.dartsHistory.pop();

                // Annuler la volée terminée dans roundsHistory
                if (previousPlayer.roundsHistory && previousPlayer.roundsHistory.length > 0) {
                    const lastRound = previousPlayer.roundsHistory[previousPlayer.roundsHistory.length - 1];
                    // Vérifier que c'est bien la bonne volée (pas un bust)
                    if (!lastRound.bust) {
                        previousPlayer.roundsHistory.pop();

                        // Recalculer la moyenne
                        const validRounds = previousPlayer.roundsHistory.filter(r => !r.bust);
                        if (validRounds.length > 0) {
                            previousPlayer.avgPerRound = previousPlayer.score / validRounds.length;
                        } else {
                            previousPlayer.avgPerRound = 0;
                        }
                    }
                }

                // Vider lastRound
                previousPlayer.lastRound = [];

                // Revenir au joueur précédent avec currentDart = 3
                currentGame.currentPlayerIndex = previousPlayerIndex;
                currentGame.currentDart = 3;

                await saveCurrentGame();
                render301Interface();
                return true;
            }
        }

        return false;
    }

    /**
     * Terminer la partie
     */
    async function endGame(winner) {
        if (!currentGame) return;

        currentGame.finishedAt = Date.now();
        currentGame.winner = winner;

        // Sauvegarder dans l'historique
        await StatsManager.saveGameToHistory(currentGame);

        // Effets de victoire
        SoundsManager.playGameVictory();

        // Afficher l'écran de victoire
        App.navigateToScreen('screen-game-over');
        GameManager.renderGameOver();
    }

    /**
     * Abandonner la partie
     */
    async function quitGame() {
        if (!currentGame) return;

        if (confirm('Voulez-vous vraiment abandonner cette partie ?\n\nLa partie sera perdue et ne sera pas enregistrée dans l\'historique.')) {
            await clearCurrentGame();
            return true;
        }

        return false;
    }

    /**
     * Calculer les suggestions de sortie (checkouts)
     */
    function calculateCheckouts(remaining) {
        if (remaining > CHECKOUT_THRESHOLD || remaining <= 1) {
            return [];
        }

        const checkouts = [];

        // Tables de valeurs possibles
        const doubles = [];
        const triples = [];
        const singles = [];

        for (let i = 1; i <= 20; i++) {
            singles.push({ value: i, mult: 1, display: `${i}` });
            doubles.push({ value: i * 2, mult: 2, num: i, display: `D${i}` });
            triples.push({ value: i * 3, mult: 3, num: i, display: `T${i}` });
        }
        singles.push({ value: 25, mult: 1, display: 'Bull' });
        doubles.push({ value: 50, mult: 2, num: 25, display: 'Bull' });

        // 1. Checkout en 1 fléchette
        doubles.forEach(d => {
            if (d.value === remaining) {
                checkouts.push([d.display]);
            }
        });
        triples.forEach(t => {
            if (t.value === remaining) {
                checkouts.push([t.display]);
            }
        });

        // 2. Checkout en 2 fléchettes
        [...singles, ...doubles, ...triples].forEach(first => {
            const rem = remaining - first.value;

            doubles.forEach(d => {
                if (d.value === rem) {
                    checkouts.push([first.display, d.display]);
                }
            });

            triples.forEach(t => {
                if (t.value === rem) {
                    checkouts.push([first.display, t.display]);
                }
            });
        });

        // 3. Checkout en 3 fléchettes
        [...singles, ...doubles, ...triples].forEach(first => {
            [...singles, ...doubles, ...triples].forEach(second => {
                const rem = remaining - first.value - second.value;

                doubles.forEach(d => {
                    if (d.value === rem && checkouts.length < 10) {
                        checkouts.push([first.display, second.display, d.display]);
                    }
                });

                triples.forEach(t => {
                    if (t.value === rem && checkouts.length < 10) {
                        checkouts.push([first.display, second.display, t.display]);
                    }
                });
            });
        });

        // Limiter à 2 suggestions seulement
        return checkouts.slice(0, 2);
    }

    /**
     * Rendre l'interface 301
     */
    function render301Interface() {
        if (!currentGame) return;

        const playersList = document.getElementById('players-301-list');
        const checkoutContainer = document.getElementById('checkout-suggestions');
        const checkoutList = document.getElementById('checkout-list');

        // Générer les cartes des joueurs
        let playersHTML = '';

        currentGame.players.forEach((player, index) => {
            const isActive = index === currentGame.currentPlayerIndex;
            const progress = (player.score / TARGET_SCORE) * 100;

            // Historique des 3 dernières fléchettes
            // Pour le joueur actif : afficher currentRound (fléchettes en cours)
            // Pour les autres : afficher lastRound (dernier tour complet)
            let dartsHTML = '';
            const dartsToShow = isActive ? player.currentRound : (player.lastRound || []);

            dartsToShow.forEach(dart => {
                const dartText = dart.multiplier === 0 ? 'MISS' :
                               dart.multiplier === 1 ? `${dart.number}` :
                               dart.multiplier === 2 ? `D${dart.number}` :
                               `T${dart.number}`;
                dartsHTML += `<div class="dart-chip-301">${dartText}</div>`;
            });

            // Suggestions de sortie pour le joueur actif uniquement (max 2)
            let suggestionsHTML = '';
            if (isActive && player.remaining <= CHECKOUT_THRESHOLD && player.remaining > 1) {
                const suggestions = calculateCheckouts(player.remaining);
                if (suggestions.length > 0) {
                    // Prendre les 2 premières suggestions
                    const topSuggestions = suggestions.slice(0, 2);
                    suggestionsHTML = `
                        <div class="checkout-suggestions-top">
                            ${topSuggestions.map(s => `<div class="checkout-line">💡 ${s.join('→')}</div>`).join('')}
                        </div>
                    `;
                }
            }

            playersHTML += `
                <div class="player-301-card ${isActive ? 'active' : ''}" data-player-index="${index}">
                    <div class="player-301-header">
                        <img src="${player.avatar}" alt="${player.name}" class="player-avatar-301">
                        <div class="player-301-score">
                            <div class="player-301-name">${player.name}</div>
                            <div class="remaining-display-301">${player.remaining}</div>
                            <div class="avg-display-301">Moy/volée: ${player.avgPerRound.toFixed(1)}</div>
                        </div>
                        ${suggestionsHTML}
                    </div>
                    <div class="progress-bar-301">
                        <div class="progress-fill-301" style="width: ${progress}%"></div>
                    </div>
                    <div class="round-darts-301">
                        ${dartsHTML}
                        ${isActive ? `<span style="opacity: 0.5;">Fléchette ${currentGame.currentDart}/3</span>` : ''}
                    </div>
                </div>
            `;
        });

        playersList.innerHTML = playersHTML;

        // Auto-scroll vers le joueur actif
        setTimeout(() => {
            const activeCard = playersList.querySelector('.player-301-card.active');
            if (activeCard) {
                activeCard.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        }, 100);

        // Cacher l'ancien bloc de suggestions (maintenant intégré dans les cartes)
        if (checkoutContainer) {
            checkoutContainer.classList.add('hidden');
        }

        // Activer/désactiver le bouton Annuler
        const undoBtn = document.getElementById('undo-301-btn');
        if (undoBtn) {
            // Le bouton est actif si :
            // - Le joueur actif a des fléchettes dans sa volée, OU
            // - Il y a des fléchettes dans l'historique global (on peut annuler celle du joueur précédent)
            const canUndo = currentGame.players[currentGame.currentPlayerIndex].currentRound.length > 0
                         || currentGame.dartsHistory.length > 0;
            undoBtn.disabled = !canUndo;
        }

        // Réinitialiser la sélection
        selectedNumber = null;
        selectedMultiplier = 1;
        updateMultiplierButtons();
    }

    /**
     * Mettre à jour les boutons multiplicateurs
     */
    function updateMultiplierButtons() {
        document.getElementById('x2-301-btn')?.classList.toggle('active', selectedMultiplier === 2);
        document.getElementById('x3-301-btn')?.classList.toggle('active', selectedMultiplier === 3);
    }

    /**
     * Initialiser les event listeners
     */
    function initEventListeners() {
        // Boutons nombres
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedNumber = parseInt(btn.dataset.number);
                validateDart();
            });
        });

        // Bouton MISS
        document.getElementById('miss-301-btn')?.addEventListener('click', async () => {
            await recordMiss();
        });

        // Boutons multiplicateurs
        document.getElementById('x2-301-btn')?.addEventListener('click', () => {
            selectedMultiplier = selectedMultiplier === 2 ? 1 : 2;
            updateMultiplierButtons();
        });

        document.getElementById('x3-301-btn')?.addEventListener('click', () => {
            selectedMultiplier = selectedMultiplier === 3 ? 1 : 3;
            updateMultiplierButtons();
        });

        // Bouton Valider (pour futur : validation différée)
        document.getElementById('validate-301-btn')?.addEventListener('click', () => {
            if (selectedNumber !== null) {
                validateDart();
            }
        });

        // Bouton Annuler
        document.getElementById('undo-301-btn')?.addEventListener('click', async () => {
            await undoLastDart();
        });

        // Bouton Abandonner
        document.getElementById('quit-301-btn')?.addEventListener('click', async () => {
            const quit = await quitGame();
            if (quit) {
                App.navigateToScreen('screen-play');
                // Cacher le bouton "Reprendre la partie" s'il existe
                document.getElementById('resume-game-btn')?.classList.add('hidden');
            }
        });
    }

    /**
     * Valider une fléchette
     */
    async function validateDart() {
        if (selectedNumber === null) return;

        await recordDart301(selectedNumber, selectedMultiplier);

        // Réinitialiser
        selectedNumber = null;
        selectedMultiplier = 1;
        updateMultiplierButtons();
    }

    /**
     * Obtenir l'état actuel de la partie
     */
    function getCurrentGameState() {
        return currentGame;
    }

    // API publique
    return {
        startNewGame301,
        setPlayerOrder,
        getCurrentPlayer,
        recordDart301,
        recordMiss,
        undoLastDart,
        quitGame,
        getCurrentGameState,
        render301Interface,
        initEventListeners,
        loadCurrentGame,
        clearCurrentGame
    };
})();

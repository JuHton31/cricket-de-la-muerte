/**
 * CRICKET DE LA MUERTE — Logique de Jeu
 * Gère les règles du Cricket (Classique et Cut-throat)
 * Saisie fléchette par fléchette, lancer d'ouverture, animations
 */

const GameManager = (() => {
    // Configuration du jeu
    const CRICKET_NUMBERS = [15, 16, 17, 18, 19, 20, 25]; // 25 = Bull
    const MAX_MARKS = 3; // Nombre de marques pour fermer un numéro

    // État de la partie en cours
    let currentGame = null;
    let db = null;

    /**
     * Structure d'une partie :
     * {
     *   id: timestamp,
     *   mode: 'classic' | 'cutthroat',
     *   players: [{ id, name, avatar, marks: {15:0, 16:0, ...}, score: 0 }],
     *   currentPlayerIndex: 0,
     *   currentDart: 1,
     *   dartsHistory: [],
     *   startedAt: timestamp,
     *   finishedAt: null
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
     * Sauvegarder la partie en cours dans IndexedDB
     */
    async function saveCurrentGame() {
        if (!currentGame) return;

        const database = await getDB();
        const transaction = database.transaction(['currentGame'], 'readwrite');
        const store = transaction.objectStore('currentGame');

        await store.put({ id: 'current', game: currentGame });
    }

    /**
     * Charger la partie en cours depuis IndexedDB
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
     * Vérifier s'il y a une partie en cours
     */
    async function hasCurrentGame() {
        return await loadCurrentGame();
    }

    /**
     * Initialiser une nouvelle partie
     */
    async function startNewGame(mode, selectedPlayers) {
        const players = selectedPlayers.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            marks: CRICKET_NUMBERS.reduce((acc, num) => ({ ...acc, [num]: 0 }), {}),
            score: 0
        }));

        currentGame = {
            id: Date.now(),
            mode, // 'classic' ou 'cutthroat'
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
     * Définir l'ordre des joueurs après le lancer d'ouverture
     */
    async function setPlayerOrder(orderedPlayers) {
        if (!currentGame) return;

        currentGame.players = orderedPlayers.map(p => {
            const existing = currentGame.players.find(pl => pl.id === p.id);
            return existing || p;
        });

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
    async function recordDart(number, multiplier) {
        if (!currentGame) return;

        const player = getCurrentPlayer();
        const dart = {
            playerIndex: currentGame.currentPlayerIndex,
            number,
            multiplier,
            timestamp: Date.now()
        };

        // Ajouter à l'historique
        currentGame.dartsHistory.push(dart);

        // Mettre à jour les marques et le score
        updateMarksAndScore(player, number, multiplier);

        // Effets sonores et visuels
        if (multiplier > 0) {
            SoundsManager.playDartHit(multiplier);
        }

        // Passer à la fléchette suivante
        currentGame.currentDart++;

        if (currentGame.currentDart > 3) {
            // Fin de la volée, passer au joueur suivant
            currentGame.currentDart = 1;
            currentGame.currentPlayerIndex = (currentGame.currentPlayerIndex + 1) % currentGame.players.length;
        }

        await saveCurrentGame();

        // Vérifier la victoire
        const winner = checkVictory();
        if (winner) {
            await endGame(winner);
            return { gameOver: true, winner };
        }

        return { gameOver: false };
    }

    /**
     * Enregistrer une fléchette ratée
     */
    async function recordMiss() {
        if (!currentGame) return;

        const dart = {
            playerIndex: currentGame.currentPlayerIndex,
            number: null,
            multiplier: 0,
            timestamp: Date.now()
        };

        currentGame.dartsHistory.push(dart);
        SoundsManager.playDartMiss();

        // Passer à la fléchette suivante
        currentGame.currentDart++;

        if (currentGame.currentDart > 3) {
            currentGame.currentDart = 1;
            currentGame.currentPlayerIndex = (currentGame.currentPlayerIndex + 1) % currentGame.players.length;
        }

        await saveCurrentGame();

        return { gameOver: false };
    }

    /**
     * Annuler la dernière fléchette de la volée en cours
     */
    async function undoLastDart() {
        if (!currentGame || currentGame.dartsHistory.length === 0) return false;

        // Vérifier que la dernière fléchette appartient à la volée en cours
        const lastDart = currentGame.dartsHistory[currentGame.dartsHistory.length - 1];

        if (lastDart.playerIndex !== currentGame.currentPlayerIndex && currentGame.currentDart !== 1) {
            // La dernière fléchette n'est pas de ce joueur, impossible d'annuler
            return false;
        }

        // Si currentDart est 1, on ne peut annuler que si la dernière fléchette est du joueur précédent
        // dans la même volée (impossible), donc on ne peut pas annuler
        if (currentGame.currentDart === 1) {
            return false;
        }

        // Retirer la dernière fléchette
        const removedDart = currentGame.dartsHistory.pop();

        // Annuler les effets sur les marques et le score
        if (removedDart.number && removedDart.multiplier > 0) {
            const player = currentGame.players[removedDart.playerIndex];
            undoMarksAndScore(player, removedDart.number, removedDart.multiplier);
        }

        // Revenir à la fléchette précédente
        currentGame.currentDart--;

        await saveCurrentGame();
        return true;
    }

    /**
     * Mettre à jour les marques et le score après une fléchette
     */
    function updateMarksAndScore(player, number, multiplier) {
        const previousMarks = player.marks[number];
        const newMarks = Math.min(previousMarks + multiplier, MAX_MARKS);
        const overflow = (previousMarks + multiplier) - newMarks;

        player.marks[number] = newMarks;

        // Vérifier si le numéro vient d'être fermé
        if (previousMarks < MAX_MARKS && newMarks === MAX_MARKS) {
            SoundsManager.playNumberClosed();
        }

        // Calculer les points selon le mode
        if (overflow > 0) {
            if (currentGame.mode === 'classic') {
                // Cricket Classique : points pour soi si le numéro est fermé
                // et pas encore fermé par tous les adversaires
                if (isNumberOpenForOpponents(player, number)) {
                    player.score += number * overflow;
                }
            } else if (currentGame.mode === 'cutthroat') {
                // Cut-throat : points aux adversaires qui n'ont pas fermé
                givePointsToOpponents(player, number, overflow);
            }
        }
    }

    /**
     * Annuler les effets d'une fléchette
     */
    function undoMarksAndScore(player, number, multiplier) {
        const currentMarks = player.marks[number];
        const previousMarks = Math.max(currentMarks - multiplier, 0);
        const wasOverflow = currentMarks === MAX_MARKS && (currentMarks - multiplier < MAX_MARKS);

        player.marks[number] = previousMarks;

        // Recalculer le score en rejouant tout l'historique
        // (simplifié : on recalcule à partir de zéro)
        recalculateScores();
    }

    /**
     * Recalculer tous les scores à partir de l'historique
     */
    function recalculateScores() {
        // Réinitialiser tous les scores et marques
        currentGame.players.forEach(p => {
            p.score = 0;
            CRICKET_NUMBERS.forEach(num => {
                p.marks[num] = 0;
            });
        });

        // Rejouer toutes les fléchettes
        currentGame.dartsHistory.forEach(dart => {
            if (dart.number && dart.multiplier > 0) {
                const player = currentGame.players[dart.playerIndex];

                const previousMarks = player.marks[dart.number];
                const newMarks = Math.min(previousMarks + dart.multiplier, MAX_MARKS);
                const overflow = (previousMarks + dart.multiplier) - newMarks;

                player.marks[dart.number] = newMarks;

                if (overflow > 0) {
                    if (currentGame.mode === 'classic') {
                        if (isNumberOpenForOpponents(player, dart.number)) {
                            player.score += dart.number * overflow;
                        }
                    } else if (currentGame.mode === 'cutthroat') {
                        givePointsToOpponents(player, dart.number, overflow);
                    }
                }
            }
        });
    }

    /**
     * Vérifier si un numéro est encore ouvert pour au moins un adversaire
     */
    function isNumberOpenForOpponents(player, number) {
        return currentGame.players.some(p =>
            p.id !== player.id && p.marks[number] < MAX_MARKS
        );
    }

    /**
     * Donner des points aux adversaires (mode Cut-throat)
     */
    function givePointsToOpponents(player, number, points) {
        currentGame.players.forEach(p => {
            if (p.id !== player.id && p.marks[number] < MAX_MARKS) {
                p.score += number * points;
            }
        });
    }

    /**
     * Vérifier les conditions de victoire
     */
    function checkVictory() {
        // Un joueur gagne s'il a fermé tous les numéros
        const playersWithAllClosed = currentGame.players.filter(p => {
            return CRICKET_NUMBERS.every(num => p.marks[num] === MAX_MARKS);
        });

        if (playersWithAllClosed.length === 0) {
            return null; // Personne n'a encore fermé tous les numéros
        }

        if (currentGame.mode === 'classic') {
            // Cricket Classique : le plus de points parmi ceux qui ont tout fermé
            return playersWithAllClosed.reduce((winner, player) => {
                return player.score > winner.score ? player : winner;
            });
        } else {
            // Cut-throat : le moins de points parmi ceux qui ont tout fermé
            return playersWithAllClosed.reduce((winner, player) => {
                return player.score < winner.score ? player : winner;
            });
        }
    }

    /**
     * Terminer la partie
     */
    async function endGame(winner) {
        if (!currentGame) return;

        currentGame.finishedAt = Date.now();
        currentGame.winner = winner;

        // Sauvegarder la partie dans l'historique
        await StatsManager.saveGameToHistory(currentGame);

        // NOTE: Ne pas supprimer currentGame ici car renderGameOver() en a besoin
        // currentGame sera supprimé quand l'utilisateur quitte l'écran de game over

        // Effets de victoire
        SoundsManager.playGameVictory();
    }

    /**
     * Abandonner la partie en cours
     */
    async function quitGame() {
        if (!currentGame) return;

        if (confirm('Voulez-vous vraiment quitter cette partie ?\n\nLa partie sera perdue et ne sera pas enregistrée dans l\'historique.')) {
            await clearCurrentGame();
            return true;
        }

        return false;
    }

    /**
     * Obtenir le classement final
     */
    function getFinalRanking() {
        if (!currentGame) return [];

        const players = [...currentGame.players];

        if (currentGame.mode === 'classic') {
            // Trier par score décroissant
            players.sort((a, b) => b.score - a.score);
        } else {
            // Cut-throat : trier par score croissant
            players.sort((a, b) => a.score - b.score);
        }

        return players;
    }

    /**
     * Obtenir l'état actuel de la partie
     */
    function getCurrentGameState() {
        return currentGame;
    }

    /**
     * Afficher le plateau de jeu
     */
    function renderScoreboard() {
        if (!currentGame) return;

        const container = document.getElementById('scoreboard');
        const players = currentGame.players;

        // Créer le tableau
        let html = '<table><thead><tr><th>N°</th>';

        players.forEach((player, index) => {
            const isActive = index === currentGame.currentPlayerIndex;
            html += `<th class="player-col ${isActive ? 'active-player' : ''}">${player.name}</th>`;
        });

        html += '</tr></thead><tbody>';

        // Lignes pour chaque numéro
        CRICKET_NUMBERS.forEach(num => {
            html += `<tr><td><strong>${num === 25 ? 'Bull' : num}</strong></td>`;

            players.forEach((player, playerIndex) => {
                const marks = player.marks[num];
                const isActive = playerIndex === currentGame.currentPlayerIndex;
                let emoji = '';

                if (marks === 1) {
                    emoji = '👍'; // 1 marque : pouce en l'air
                } else if (marks === 2) {
                    emoji = '✌️'; // 2 marques : doigts en V
                } else if (marks === 3) {
                    // Case ouverte ou fermée ?
                    const allClosed = players.every(p => p.marks[num] >= 3);
                    emoji = allClosed ? '🚫' : '🎰'; // Fermée : sens interdit, Ouverte : machine à sous
                }

                // Rendre la cellule cliquable uniquement pour le joueur actif
                const clickableClass = isActive ? 'clickable-cell' : '';
                const dataAttrs = isActive ? `data-number="${num}" data-player-index="${playerIndex}"` : '';

                html += `<td class="${clickableClass}" ${dataAttrs}>
                    <span class="cell-emoji">${emoji}</span>
                    <span class="tap-indicator"></span>
                </td>`;
            });

            html += '</tr>';
        });

        // Ligne des scores
        html += '<tr class="score-row"><td><strong>Score</strong></td>';
        players.forEach(player => {
            html += `<td>${player.score}</td>`;
        });
        html += '</tr>';

        html += '</tbody></table>';

        container.innerHTML = html;
    }

    /**
     * Mettre à jour les informations du joueur actif
     */
    function updateCurrentPlayerInfo() {
        if (!currentGame) return;

        const player = getCurrentPlayer();
        document.getElementById('current-player-avatar').src = player.avatar;
        document.getElementById('current-player-name').textContent = player.name;
        document.getElementById('current-dart').textContent = currentGame.currentDart;

        // Activer/désactiver le bouton Annuler
        const undoBtn = document.getElementById('undo-dart-btn');
        undoBtn.disabled = currentGame.currentDart === 1;
    }

    /**
     * Afficher l'écran de fin de partie
     */
    function renderGameOver() {
        if (!currentGame || !currentGame.winner) return;

        // Liste des GIFs western
        const westernGifs = [
            '/gifs/1.gif',
            '/gifs/2.gif',
            '/gifs/3.gif',
            '/gifs/4.gif',
            '/gifs/5.gif',
            '/gifs/6.gif',
            '/gifs/7.gif',
            '/gifs/8.gif'
        ];

        // Choisir un GIF random
        const randomGif = westernGifs[Math.floor(Math.random() * westernGifs.length)];

        // Afficher le GIF
        const gifElement = document.getElementById('western-gif');
        if (gifElement) {
            gifElement.src = randomGif;
            gifElement.alt = 'Western celebration';
            // Fallback si le GIF ne charge pas
            gifElement.onerror = () => {
                gifElement.style.display = 'none';
                console.warn('GIF non trouvé:', randomGif);
            };
        }

        const winnerInfo = document.getElementById('winner-info');
        const winner = currentGame.winner;

        if (winnerInfo && winner) {
            winnerInfo.innerHTML = `
                <img class="player-avatar" src="${winner.avatar}" alt="${winner.name}">
                <div>
                    <div class="winner-name">${winner.name}</div>
                    <div class="winner-score">Score: ${winner.score}</div>
                </div>
            `;
        }
    }

    /**
     * Nettoyer une partie terminée (appelé depuis l'écran de game over)
     */
    async function clearFinishedGame() {
        await clearCurrentGame();
    }

    // API publique
    return {
        hasCurrentGame,
        loadCurrentGame,
        startNewGame,
        setPlayerOrder,
        getCurrentPlayer,
        recordDart,
        recordMiss,
        undoLastDart,
        quitGame,
        getCurrentGameState,
        getFinalRanking,
        renderScoreboard,
        updateCurrentPlayerInfo,
        renderGameOver,
        clearFinishedGame,
        CRICKET_NUMBERS
    };
})();

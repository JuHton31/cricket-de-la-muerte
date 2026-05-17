/**
 * CRICKET DE LA MUERTE — Statistiques et Historique
 * Gère l'historique des parties et les statistiques par joueur
 * Stockage dans IndexedDB, graphiques SVG inline
 */

const StatsManager = (() => {
    let db = null;

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
     * Sauvegarder une partie dans l'historique
     */
    async function saveGameToHistory(game) {
        const database = await getDB();
        const transaction = database.transaction(['games'], 'readwrite');
        const store = transaction.objectStore('games');

        // Calculer les statistiques détaillées de la partie
        const gameStats = calculateGameStats(game);

        await store.add(gameStats);
    }

    /**
     * Calculer les statistiques détaillées d'une partie
     */
    function calculateGameStats(game) {
        const stats = {
            id: game.id,
            mode: game.mode,
            startedAt: game.startedAt,
            finishedAt: game.finishedAt,
            winnerId: game.winner.id,
            winnerName: game.winner.name,
            players: game.players.map(player => {
                const playerDarts = game.dartsHistory.filter(d => d.playerIndex === game.players.indexOf(player));
                const validDarts = playerDarts.filter(d => d.number && d.multiplier > 0);
                const totalDarts = playerDarts.length;

                // Numéros fermés et ordre de fermeture
                const closedNumbers = [];
                const closingOrder = {};
                let marks = { 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 25: 0 };

                playerDarts.forEach((dart, index) => {
                    if (dart.number && dart.multiplier > 0) {
                        marks[dart.number] = Math.min(marks[dart.number] + dart.multiplier, 3);
                        if (marks[dart.number] === 3 && !closedNumbers.includes(dart.number)) {
                            closedNumbers.push(dart.number);
                            closingOrder[dart.number] = index + 1;
                        }
                    }
                });

                // Numéro favori (le plus touché)
                const numberCounts = {};
                validDarts.forEach(d => {
                    numberCounts[d.number] = (numberCounts[d.number] || 0) + 1;
                });
                const favoriteNumber = Object.keys(numberCounts).length > 0
                    ? parseInt(Object.keys(numberCounts).reduce((a, b) => numberCounts[a] > numberCounts[b] ? a : b))
                    : null;

                // Nombre de doubles et triples
                const doubles = validDarts.filter(d => d.multiplier === 2).length;
                const triples = validDarts.filter(d => d.multiplier === 3).length;

                return {
                    id: player.id,
                    name: player.name,
                    score: player.score,
                    closedNumbers,
                    closingOrder,
                    closureRate: closedNumbers.length / 7,
                    favoriteNumber,
                    totalDarts,
                    validDarts: validDarts.length,
                    doubles,
                    triples,
                    avgPointsPerRound: totalDarts > 0 ? player.score / Math.ceil(totalDarts / 3) : 0
                };
            })
        };

        return stats;
    }

    /**
     * Obtenir toutes les parties de l'historique
     */
    async function getAllGames() {
        const database = await getDB();
        const transaction = database.transaction(['games'], 'readonly');
        const store = transaction.objectStore('games');

        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    }

    /**
     * Effacer tout l'historique
     */
    async function clearHistory() {
        const database = await getDB();
        const transaction = database.transaction(['games'], 'readwrite');
        const store = transaction.objectStore('games');

        return new Promise((resolve) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        });
    }

    /**
     * Calculer les statistiques globales de tous les joueurs
     */
    async function getGlobalStats() {
        const games = await getAllGames();

        if (games.length === 0) {
            return { totalGames: 0, players: [] };
        }

        const playerStats = {};

        games.forEach(game => {
            game.players.forEach(playerData => {
                if (!playerStats[playerData.id]) {
                    playerStats[playerData.id] = {
                        id: playerData.id,
                        name: playerData.name,
                        gamesPlayed: 0,
                        gamesWon: 0,
                        totalScore: 0,
                        totalDarts: 0,
                        totalDoubles: 0,
                        totalTriples: 0,
                        favoriteNumbers: {},
                        closedNumbers: []
                    };
                }

                const stats = playerStats[playerData.id];
                stats.gamesPlayed++;
                stats.totalScore += playerData.score;
                stats.totalDarts += playerData.totalDarts;
                stats.totalDoubles += playerData.doubles;
                stats.totalTriples += playerData.triples;

                if (game.winnerId === playerData.id) {
                    stats.gamesWon++;
                }

                if (playerData.favoriteNumber) {
                    stats.favoriteNumbers[playerData.favoriteNumber] =
                        (stats.favoriteNumbers[playerData.favoriteNumber] || 0) + 1;
                }

                stats.closedNumbers.push(...playerData.closedNumbers);
            });
        });

        // Calculer les statistiques dérivées
        const playersArray = Object.values(playerStats).map(stats => {
            const winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed * 100) : 0;
            const avgScore = stats.gamesPlayed > 0 ? stats.totalScore / stats.gamesPlayed : 0;
            const avgDartsPerGame = stats.gamesPlayed > 0 ? stats.totalDarts / stats.gamesPlayed : 0;

            // Numéro de prédilection
            const mostFavoriteNumber = Object.keys(stats.favoriteNumbers).length > 0
                ? parseInt(Object.keys(stats.favoriteNumbers).reduce((a, b) =>
                    stats.favoriteNumbers[a] > stats.favoriteNumbers[b] ? a : b
                ))
                : null;

            return {
                ...stats,
                winRate,
                avgScore,
                avgDartsPerGame,
                mostFavoriteNumber
            };
        });

        return {
            totalGames: games.length,
            players: playersArray
        };
    }

    /**
     * Obtenir les statistiques d'un joueur spécifique
     */
    async function getPlayerStats(playerId) {
        const globalStats = await getGlobalStats();
        return globalStats.players.find(p => p.id === playerId) || null;
    }

    /**
     * Afficher la vue globale des stats
     */
    async function renderGlobalStats() {
        const container = document.getElementById('stats-content');
        const stats = await getGlobalStats();

        if (stats.totalGames === 0) {
            container.innerHTML = `
                <div class="stats-empty">
                    <p>Aucune partie jouée pour le moment.</p>
                    <p>Commencez votre première partie pour voir vos statistiques !</p>
                </div>
            `;
            return;
        }

        // Trier les joueurs par nombre de victoires
        const topPlayers = [...stats.players].sort((a, b) => b.gamesWon - a.gamesWon).slice(0, 5);

        let html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalGames}</div>
                    <div class="stat-label">Parties jouées</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.players.length}</div>
                    <div class="stat-label">Joueurs actifs</div>
                </div>
            </div>

            <h3 style="color: var(--gold); margin: 2rem 0 1rem;">🏆 Top Joueurs</h3>
            <div class="stats-grid">
        `;

        topPlayers.forEach(player => {
            html += `
                <div class="stat-card">
                    <div class="stat-value">${player.gamesWon}</div>
                    <div class="stat-label">${player.name}</div>
                    <div class="stat-label" style="font-size: 0.75rem; opacity: 0.6;">
                        ${player.winRate.toFixed(0)}% victoires
                    </div>
                </div>
            `;
        });

        html += '</div>';

        container.innerHTML = html;
    }

    /**
     * Afficher les stats par joueur
     */
    async function renderPlayerStats() {
        const container = document.getElementById('stats-content');
        const stats = await getGlobalStats();

        if (stats.players.length === 0) {
            container.innerHTML = `
                <div class="stats-empty">
                    <p>Aucune donnée disponible.</p>
                </div>
            `;
            return;
        }

        // Sélecteur de joueur
        let html = `
            <div class="form-group">
                <label>Sélectionner un joueur :</label>
                <select id="player-stats-selector" class="btn btn-secondary" style="width: 100%; text-align: left;">
                    ${stats.players.map(p => `
                        <option value="${p.id}">${p.name}</option>
                    `).join('')}
                </select>
            </div>
            <div id="player-stats-detail"></div>
        `;

        container.innerHTML = html;

        // Afficher les stats du premier joueur par défaut
        const selector = document.getElementById('player-stats-selector');
        if (stats.players.length > 0) {
            renderPlayerStatsDetail(stats.players[0]);
        }

        selector.addEventListener('change', () => {
            const playerId = parseInt(selector.value);
            const player = stats.players.find(p => p.id === playerId);
            if (player) {
                renderPlayerStatsDetail(player);
            }
        });
    }

    /**
     * Afficher le détail des stats d'un joueur
     */
    function renderPlayerStatsDetail(player) {
        const detailContainer = document.getElementById('player-stats-detail');

        const html = `
            <div class="stats-grid" style="margin-top: 1.5rem;">
                <div class="stat-card">
                    <div class="stat-value">${player.gamesPlayed}</div>
                    <div class="stat-label">Parties jouées</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.gamesWon}</div>
                    <div class="stat-label">Victoires</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.winRate.toFixed(0)}%</div>
                    <div class="stat-label">Taux de victoire</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.avgScore.toFixed(0)}</div>
                    <div class="stat-label">Score moyen</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.avgDartsPerGame.toFixed(0)}</div>
                    <div class="stat-label">Fléchettes / partie</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.mostFavoriteNumber || '-'}</div>
                    <div class="stat-label">Numéro favori</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.totalDoubles}</div>
                    <div class="stat-label">Doubles réalisés</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${player.totalTriples}</div>
                    <div class="stat-label">Triples réalisés</div>
                </div>
            </div>
        `;

        detailContainer.innerHTML = html;
    }

    /**
     * Afficher l'historique des parties
     */
    async function renderHistory() {
        const container = document.getElementById('stats-content');
        const games = await getAllGames();

        if (games.length === 0) {
            container.innerHTML = `
                <div class="stats-empty">
                    <p>Aucune partie dans l'historique.</p>
                </div>
            `;
            return;
        }

        // Trier par date décroissante
        games.sort((a, b) => b.finishedAt - a.finishedAt);

        const html = `
            <div class="history-list">
                ${games.map(game => {
                    const date = new Date(game.finishedAt);
                    const duration = Math.round((game.finishedAt - game.startedAt) / 60000);
                    const modeLabel = game.mode === 'classic' ? 'Classique' : 'Cut-throat';

                    return `
                        <div class="history-item">
                            <div class="history-header">
                                <div class="history-date">
                                    ${date.toLocaleDateString()} à ${date.toLocaleTimeString()}
                                </div>
                                <div class="history-mode">${modeLabel} • ${duration} min</div>
                            </div>
                            <div class="history-players">
                                🏆 <strong>${game.winnerName}</strong> a gagné<br>
                                ${game.players.map(p =>
                                    `${p.name}: ${p.score} pts (${p.closedNumbers.length}/7 fermés)`
                                ).join(' • ')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Initialiser l'écran de statistiques
     */
    function initStatsScreen() {
        const tabs = document.querySelectorAll('.stats-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                // Activer l'onglet
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Afficher le contenu correspondant
                const tabType = tab.dataset.tab;

                if (tabType === 'global') {
                    await renderGlobalStats();
                } else if (tabType === 'player') {
                    await renderPlayerStats();
                } else if (tabType === 'history') {
                    await renderHistory();
                }
            });
        });

        // Afficher la vue globale par défaut
        renderGlobalStats();
    }

    /**
     * Confirmer l'effacement de l'historique
     */
    async function confirmClearHistory() {
        if (confirm('⚠️ ATTENTION : Supprimer tout l\'historique des parties ?\n\nCette action est irréversible !')) {
            if (confirm('Dernière confirmation : êtes-vous VRAIMENT sûr ?')) {
                await clearHistory();

                // Rafraîchir l'affichage si on est sur l'écran stats
                const activeScreen = document.querySelector('.screen.active');
                if (activeScreen && activeScreen.id === 'screen-stats') {
                    const activeTab = document.querySelector('.stats-tab.active');
                    if (activeTab) {
                        const tabType = activeTab.dataset.tab;
                        if (tabType === 'global') {
                            await renderGlobalStats();
                        } else if (tabType === 'player') {
                            await renderPlayerStats();
                        } else if (tabType === 'history') {
                            await renderHistory();
                        }
                    }
                }

                alert('Historique effacé avec succès.');
            }
        }
    }

    // API publique
    return {
        saveGameToHistory,
        getAllGames,
        clearHistory,
        getGlobalStats,
        getPlayerStats,
        initStatsScreen,
        confirmClearHistory
    };
})();

/**
 * CRICKET DE LA MUERTE — Gestion des Joueurs
 * Gère l'ajout, l'édition, la suppression de joueurs
 * Stockage des avatars (photo, caméra, SVG par défaut) dans IndexedDB
 */

const PlayersManager = (() => {
    // Base de données IndexedDB
    let db = null;
    const DB_NAME = 'CricketDeLaMuerte';
    const DB_VERSION = 1;
    const STORE_PLAYERS = 'players';

    // Avatars SVG par défaut (style western mexicain)
    const DEFAULT_AVATARS = [
        {
            id: 'cowboy',
            name: 'Cowboy',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#6B3A2A"/><circle cx="50" cy="50" r="40" fill="#C9A84C"/><path d="M30 35 Q50 20 70 35" stroke="#0a0a0a" stroke-width="3" fill="none"/><circle cx="38" cy="50" r="4" fill="#0a0a0a"/><circle cx="62" cy="50" r="4" fill="#0a0a0a"/><path d="M40 65 Q50 70 60 65" stroke="#0a0a0a" stroke-width="3" fill="none"/></svg>'
        },
        {
            id: 'bandido',
            name: 'Bandido',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#8B0000"/><circle cx="50" cy="50" r="40" fill="#C9A84C"/><rect x="30" y="45" width="40" height="8" fill="#0a0a0a"/><circle cx="38" cy="40" r="4" fill="#0a0a0a"/><circle cx="62" cy="40" r="4" fill="#0a0a0a"/><path d="M35 65 L45 60 L55 60 L65 65" stroke="#0a0a0a" stroke-width="3" fill="none"/></svg>'
        },
        {
            id: 'senorita',
            name: 'Señorita',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#8B0000"/><circle cx="50" cy="50" r="40" fill="#F5F0E8"/><path d="M35 30 Q50 20 65 30" fill="#0a0a0a"/><circle cx="40" cy="50" r="3" fill="#0a0a0a"/><circle cx="60" cy="50" r="3" fill="#0a0a0a"/><path d="M40 65 Q50 68 60 65" stroke="#8B0000" stroke-width="2" fill="none"/><circle cx="30" cy="60" r="8" fill="#8B0000" opacity="0.3"/><circle cx="70" cy="60" r="8" fill="#8B0000" opacity="0.3"/></svg>'
        },
        {
            id: 'pistolero',
            name: 'Pistolero',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#0a0a0a"/><circle cx="50" cy="50" r="40" fill="#6B3A2A"/><path d="M25 35 L35 40 L65 40 L75 35 L65 45 L35 45 Z" fill="#0a0a0a"/><circle cx="38" cy="55" r="4" fill="#C9A84C"/><circle cx="62" cy="55" r="4" fill="#C9A84C"/><rect x="35" y="65" width="30" height="4" fill="#0a0a0a"/></svg>'
        },
        {
            id: 'skull',
            name: 'Calavera',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#F5F0E8"/><circle cx="50" cy="45" r="35" fill="#F5F0E8"/><path d="M25 30 Q50 20 75 30" fill="#C9A84C"/><circle cx="38" cy="50" r="8" fill="#0a0a0a"/><circle cx="62" cy="50" r="8" fill="#0a0a0a"/><path d="M45 65 L48 70 L52 70 L55 65" fill="#0a0a0a"/><circle cx="35" cy="65" r="3" fill="#8B0000"/><circle cx="50" cy="68" r="3" fill="#8B0000"/><circle cx="65" cy="65" r="3" fill="#8B0000"/></svg>'
        },
        {
            id: 'hunter',
            name: 'Chasseur',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#6B3A2A"/><circle cx="50" cy="50" r="40" fill="#C9A84C"/><path d="M20 40 L30 35 L70 35 L80 40 L75 50 L25 50 Z" fill="#0a0a0a"/><circle cx="35" cy="55" r="4" fill="#0a0a0a"/><circle cx="65" cy="55" r="4" fill="#0a0a0a"/><path d="M38 68 L50 70 L62 68" stroke="#0a0a0a" stroke-width="3" fill="none"/><path d="M45 75 L50 72 L55 75" fill="#6B3A2A"/></svg>'
        }
    ];

    /**
     * Initialise la base de données IndexedDB
     */
    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Store des joueurs
                if (!database.objectStoreNames.contains(STORE_PLAYERS)) {
                    const playersStore = database.createObjectStore(STORE_PLAYERS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    playersStore.createIndex('name', 'name', { unique: false });
                }

                // Store pour les parties (sera utilisé par game.js et stats.js)
                if (!database.objectStoreNames.contains('games')) {
                    database.createObjectStore('games', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }

                // Store pour la partie en cours
                if (!database.objectStoreNames.contains('currentGame')) {
                    database.createObjectStore('currentGame', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Obtenir tous les joueurs
     */
    async function getAllPlayers() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PLAYERS], 'readonly');
            const store = transaction.objectStore(STORE_PLAYERS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtenir un joueur par ID
     */
    async function getPlayer(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PLAYERS], 'readonly');
            const store = transaction.objectStore(STORE_PLAYERS);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Ajouter ou mettre à jour un joueur
     */
    async function savePlayer(player) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PLAYERS], 'readwrite');
            const store = transaction.objectStore(STORE_PLAYERS);
            const request = player.id ? store.put(player) : store.add(player);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Supprimer un joueur
     */
    async function deletePlayer(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PLAYERS], 'readwrite');
            const store = transaction.objectStore(STORE_PLAYERS);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Supprimer tous les joueurs
     */
    async function deleteAllPlayers() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PLAYERS], 'readwrite');
            const store = transaction.objectStore(STORE_PLAYERS);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Convertir une image en base64
     */
    function imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Obtenir un avatar SVG par défaut
     */
    function getDefaultAvatarSVG(avatarId) {
        const avatar = DEFAULT_AVATARS.find(a => a.id === avatarId);
        if (!avatar) return DEFAULT_AVATARS[0].svg;
        return avatar.svg;
    }

    /**
     * Convertir un SVG en data URI
     */
    function svgToDataUri(svgString) {
        const encoded = encodeURIComponent(svgString)
            .replace(/'/g, '%27')
            .replace(/"/g, '%22');
        return `data:image/svg+xml,${encoded}`;
    }

    /**
     * Obtenir la liste des avatars par défaut
     */
    function getDefaultAvatars() {
        return DEFAULT_AVATARS.map(avatar => ({
            ...avatar,
            dataUri: svgToDataUri(avatar.svg)
        }));
    }

    /**
     * Afficher la liste des joueurs
     */
    async function renderPlayersList() {
        const players = await getAllPlayers();
        const container = document.getElementById('players-list');

        if (players.length === 0) {
            container.innerHTML = `
                <div class="stats-empty">
                    <p>Aucun joueur enregistré.</p>
                    <p>Ajoutez votre premier joueur pour commencer !</p>
                </div>
            `;
            return;
        }

        container.innerHTML = players.map(player => `
            <div class="player-item" data-player-id="${player.id}">
                <img class="player-avatar" src="${player.avatar}" alt="${player.name}">
                <div class="player-item-info">
                    <div class="player-item-name">${player.name}</div>
                    <div class="player-item-stats">Ajouté le ${new Date(player.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="player-item-actions">
                    <button class="btn btn-small btn-secondary edit-player-btn" data-player-id="${player.id}">✏️</button>
                    <button class="btn btn-small btn-danger delete-player-btn" data-player-id="${player.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        // Ajouter les événements
        container.querySelectorAll('.edit-player-btn').forEach(btn => {
            btn.addEventListener('click', () => openPlayerModal(parseInt(btn.dataset.playerId)));
        });

        container.querySelectorAll('.delete-player-btn').forEach(btn => {
            btn.addEventListener('click', () => confirmDeletePlayer(parseInt(btn.dataset.playerId)));
        });
    }

    /**
     * Ouvrir le modal d'ajout/édition de joueur
     */
    async function openPlayerModal(playerId = null) {
        const modal = document.getElementById('player-modal');
        const title = document.getElementById('player-modal-title');
        const nameInput = document.getElementById('player-name-input');
        const preview = document.getElementById('current-avatar-preview');
        const defaultAvatarsGrid = document.getElementById('default-avatars-grid');

        // Réinitialiser
        nameInput.value = '';
        preview.innerHTML = '';
        defaultAvatarsGrid.classList.add('hidden');
        modal.dataset.editingId = playerId || '';
        modal.dataset.currentAvatar = '';

        if (playerId) {
            // Mode édition
            const player = await getPlayer(playerId);
            title.textContent = 'Éditer le Joueur';
            nameInput.value = player.name;
            preview.innerHTML = `<img src="${player.avatar}" alt="Avatar">`;
            modal.dataset.currentAvatar = player.avatar;
        } else {
            // Mode ajout
            title.textContent = 'Nouveau Joueur';
            // Avatar par défaut
            const defaultAvatar = svgToDataUri(DEFAULT_AVATARS[0].svg);
            preview.innerHTML = `<img src="${defaultAvatar}" alt="Avatar">`;
            modal.dataset.currentAvatar = defaultAvatar;
        }

        modal.classList.remove('hidden');
    }

    /**
     * Fermer le modal
     */
    function closePlayerModal() {
        document.getElementById('player-modal').classList.add('hidden');
    }

    /**
     * Afficher la grille des avatars par défaut
     */
    function showDefaultAvatarsGrid() {
        const grid = document.getElementById('default-avatars-grid');
        const avatars = getDefaultAvatars();

        grid.innerHTML = avatars.map(avatar => `
            <div class="default-avatar-option" data-avatar="${avatar.dataUri}">
                <img src="${avatar.dataUri}" alt="${avatar.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        `).join('');

        grid.querySelectorAll('.default-avatar-option').forEach(option => {
            option.addEventListener('click', () => {
                const avatarUri = option.dataset.avatar;
                const modal = document.getElementById('player-modal');
                const preview = document.getElementById('current-avatar-preview');

                // Mettre à jour l'aperçu
                preview.innerHTML = `<img src="${avatarUri}" alt="Avatar">`;
                modal.dataset.currentAvatar = avatarUri;

                // Marquer comme sélectionné
                grid.querySelectorAll('.default-avatar-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        grid.classList.remove('hidden');
    }

    /**
     * Sauvegarder le joueur
     */
    async function savePlayerFromModal() {
        const modal = document.getElementById('player-modal');
        const nameInput = document.getElementById('player-name-input');
        const name = nameInput.value.trim();

        if (!name) {
            alert('Veuillez entrer un nom pour le joueur.');
            return;
        }

        const avatar = modal.dataset.currentAvatar;
        const editingId = modal.dataset.editingId;

        const player = {
            name,
            avatar,
            createdAt: editingId ? undefined : Date.now(),
            updatedAt: Date.now()
        };

        if (editingId) {
            player.id = parseInt(editingId);
        }

        await savePlayer(player);
        closePlayerModal();
        await renderPlayersList();
    }

    /**
     * Confirmer la suppression d'un joueur
     */
    async function confirmDeletePlayer(playerId) {
        const player = await getPlayer(playerId);
        if (confirm(`Êtes-vous sûr de vouloir supprimer ${player.name} ?`)) {
            await deletePlayer(playerId);
            await renderPlayersList();
        }
    }

    /**
     * Confirmer la suppression de tous les joueurs
     */
    async function confirmDeleteAllPlayers() {
        if (confirm('⚠️ ATTENTION : Supprimer tous les joueurs ?\n\nCette action est irréversible !')) {
            if (confirm('Dernière confirmation : êtes-vous VRAIMENT sûr ?')) {
                await deleteAllPlayers();
                await renderPlayersList();
            }
        }
    }

    /**
     * Initialiser les événements de la page Joueurs
     */
    function initPlayersScreen() {
        // Bouton ajouter un joueur
        document.getElementById('add-player-btn').addEventListener('click', () => {
            openPlayerModal();
        });

        // Boutons du modal
        document.getElementById('save-player-btn').addEventListener('click', savePlayerFromModal);
        document.getElementById('cancel-player-btn').addEventListener('click', closePlayerModal);

        // Boutons avatar
        document.getElementById('avatar-default-btn').addEventListener('click', showDefaultAvatarsGrid);

        document.getElementById('avatar-gallery-btn').addEventListener('click', () => {
            document.getElementById('avatar-file-input').click();
        });

        document.getElementById('avatar-camera-btn').addEventListener('click', () => {
            document.getElementById('avatar-camera-input').click();
        });

        // Input de fichier (galerie)
        document.getElementById('avatar-file-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const base64 = await imageToBase64(file);
                const modal = document.getElementById('player-modal');
                const preview = document.getElementById('current-avatar-preview');
                preview.innerHTML = `<img src="${base64}" alt="Avatar">`;
                modal.dataset.currentAvatar = base64;
            }
        });

        // Input de caméra
        document.getElementById('avatar-camera-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const base64 = await imageToBase64(file);
                const modal = document.getElementById('player-modal');
                const preview = document.getElementById('current-avatar-preview');
                preview.innerHTML = `<img src="${base64}" alt="Avatar">`;
                modal.dataset.currentAvatar = base64;
            }
        });

        // Supprimer tous les joueurs (depuis les réglages)
        document.getElementById('clear-players-btn').addEventListener('click', confirmDeleteAllPlayers);
    }

    // API publique
    return {
        initDB,
        getAllPlayers,
        getPlayer,
        savePlayer,
        deletePlayer,
        deleteAllPlayers,
        renderPlayersList,
        initPlayersScreen,
        getDefaultAvatars,
        svgToDataUri
    };
})();

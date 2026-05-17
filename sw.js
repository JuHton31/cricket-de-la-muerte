/**
 * CRICKET DE LA MUERTE — Service Worker
 * Cache First pour assets statiques
 * Network First pour données dynamiques
 * Fallback offline
 */

const CACHE_VERSION = 'CRICKET_MUERTE_V11';
const CACHE_STATIC = `${CACHE_VERSION}_static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}_dynamic`;

// Fichiers à mettre en cache lors de l'installation
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/css/fonts.css',
    '/css/app.css',
    '/js/app.js',
    '/js/game.js',
    '/js/players.js',
    '/js/stats.js',
    '/js/sounds.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    // Fonts locales
    '/fonts/rye.ttf',
    '/fonts/special-elite.ttf',
    // Fichiers audio
    '/sounds/SF-ricochet-4.mp3',
    '/sounds/sf_pet_10.mp3',
    // GIFs western (noms simplifiés)
    '/gifs/1.gif',
    '/gifs/2.gif',
    '/gifs/3.gif',
    '/gifs/4.gif',
    '/gifs/5.gif',
    '/gifs/6.gif',
    '/gifs/7.gif',
    '/gifs/8.gif'
];

/**
 * Installation du Service Worker
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installation en cours...');

    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => {
                console.log('[SW] Mise en cache des assets statiques');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Installation terminée');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Erreur lors de l\'installation:', error);
            })
    );
});

/**
 * Activation du Service Worker
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation en cours...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Supprimer les anciens caches
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!cacheName.startsWith(CACHE_VERSION)) {
                            console.log('[SW] Suppression ancien cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation terminée');
                return self.clients.claim();
            })
    );
});

/**
 * Interception des requêtes
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-HTTP/HTTPS
    if (!request.url.startsWith('http')) {
        return;
    }

    // Ignorer les requêtes vers les APIs externes
    if (url.origin !== self.location.origin) {
        return;
    }

    // Stratégie Cache First pour les assets statiques
    if (isStaticAsset(request)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Stratégie Network First pour le reste (HTML, données dynamiques)
    event.respondWith(networkFirst(request));
});

/**
 * Vérifier si une requête est un asset statique
 */
function isStaticAsset(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    return (
        pathname.endsWith('.css') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.jpeg') ||
        pathname.endsWith('.gif') ||
        pathname.endsWith('.mp3') ||
        pathname.endsWith('.ttf') ||
        pathname.endsWith('.woff') ||
        pathname.endsWith('.woff2')
    );
}

/**
 * Stratégie Cache First
 * Cherche d'abord dans le cache, sinon réseau
 */
async function cacheFirst(request) {
    try {
        // Chercher dans le cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Sinon, aller sur le réseau
        const networkResponse = await fetch(request);

        // Mettre en cache pour les prochaines fois
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_STATIC);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Erreur Cache First:', error);

        // Si offline et pas dans le cache, retourner la page offline
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Pour les pages HTML, retourner offline.html
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
        }

        return new Response('Offline', { status: 503 });
    }
}

/**
 * Stratégie Network First
 * Essaie d'abord le réseau, sinon cache
 */
async function networkFirst(request) {
    try {
        // Essayer le réseau d'abord
        const networkResponse = await fetch(request);

        // Mettre en cache si succès
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network First échoué, utilisation du cache');

        // Si échec réseau, utiliser le cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Si pas dans le cache et que c'est une page HTML, retourner offline.html
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
        }

        return new Response('Offline', { status: 503 });
    }
}

/**
 * Synchronisation en arrière-plan (optionnel)
 * Pour sauvegarder les parties en cours même hors ligne
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-game') {
        event.waitUntil(syncGameData());
    }
});

/**
 * Synchroniser les données de jeu
 */
async function syncGameData() {
    // Ici on pourrait synchroniser les données de jeu avec un serveur
    // Pour l'instant, tout est stocké localement dans IndexedDB
    console.log('[SW] Synchronisation des données de jeu');
}

/**
 * Gestion des messages du client
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker chargé');

// Nom du cache pour la version actuelle de l'application
const CACHE_NAME = 'TraducteurMorsePro_v1';

// Liste des fichiers à mettre en cache lors de l'installation
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://placehold.co/192x192/4f46e5/ffffff?text=PWA' // Icône
];

// 1. Installation du Service Worker et mise en cache des ressources
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installation...');
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('[Service Worker] Fichiers mis en cache');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting(); // Force le nouveau service worker à s'activer immédiatement
});

// 2. Stratégie de mise en cache "Cache, puis Réseau" pour les requêtes
self.addEventListener('fetch', (event) => {
    // Si la requête correspond à un fichier mis en cache, le servir à partir du cache
    event.respondWith(
        caches.match(event.request)
        .then((response) => {
            // Cache hit - retourner la réponse du cache
            if (response) {
                console.log(`[Service Worker] Servie depuis le cache: ${event.request.url}`);
                return response;
            }

            // Cache miss - effectuer la requête réseau
            console.log(`[Service Worker] Fetching depuis le réseau: ${event.request.url}`);
            return fetch(event.request);
        })
        .catch((error) => {
            // Gérer les erreurs de réseau ou de fetch
            console.error('[Service Worker] Erreur de Fetch:', error);
            // Ici, on pourrait retourner une page hors-ligne par défaut
        })
    );
});

// 3. Nettoyage des anciens caches lors de l'activation
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activation et nettoyage des anciens caches.');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(`[Service Worker] Suppression du vieux cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

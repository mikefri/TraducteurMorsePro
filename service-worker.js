// Nom du cache pour la version actuelle de l'application
const CACHE_NAME = 'TraducteurMorsePro_v1';

// Liste des fichiers à mettre en cache lors de l'installation (chemins absolus pour GitHub Pages)
const urlsToCache = [
    '/TraducteurMorsePro/',
    '/TraducteurMorsePro/index.html',
    '/TraducteurMorsePro/manifest.json',
    '/TraducteurMorsePro/icon-192x192.png', // AJOUT DE L'ICÔNE 192
    '/TraducteurMorsePro/icon-512x512.png', // AJOUT DE L'ICÔNE 512
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css' // Ajout de Font Awesome si utilisé
];

// 1. Installation du Service Worker et mise en cache des ressources
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installation...');
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('[Service Worker] Fichiers mis en cache');
            return cache.addAll(urlsToCache).catch((error) => {
                console.error('Erreur lors de la mise en cache d\'une URL:', error);
            });
        })
    );
    self.skipWaiting(); 
});

// 2. Stratégie de mise en cache "Cache, puis Réseau" pour les requêtes
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
        .then((response) => {
            if (response) {
                console.log(`[Service Worker] Servie depuis le cache: ${event.request.url}`);
                return response;
            }

            console.log(`[Service Worker] Fetching depuis le réseau: ${event.request.url}`);
            return fetch(event.request);
        })
        .catch((error) => {
            console.error('[Service Worker] Erreur de Fetch:', error);
            // Retourner une réponse d'erreur ou une page hors-ligne si vous en avez une
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

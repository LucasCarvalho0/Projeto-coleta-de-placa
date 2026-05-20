// Service Worker minimalista para habilitar a instalação PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through: não armazena em cache agressivamente para não quebrar rotas dinâmicas do Next.js
  event.respondWith(fetch(event.request));
});

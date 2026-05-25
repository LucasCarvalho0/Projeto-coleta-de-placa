const CACHE_NAME = 'nissan-scan-v1';

// Assets estáticos para cache offline
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/icon.png',
  '/manifest.json',
];

// Instalação: pre-cache de assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first para APIs e páginas, Cache-first para assets estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que não são GET
  if (request.method !== 'GET') return;

  // Ignorar requests do chrome-extension, etc
  if (!url.protocol.startsWith('http')) return;

  // Para APIs: sempre network (não cachear dados dinâmicos)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Para assets estáticos (_next/static, imagens, fontes): Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      }).catch(() => {
        // Offline fallback para assets
        return new Response('', { status: 503 });
      })
    );
    return;
  }

  // Para navegação (páginas HTML): Network-first com fallback de cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Página offline genérica
            return new Response(
              `<!DOCTYPE html>
              <html lang="pt-BR">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Nissan Scan - Offline</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    min-height: 100vh; display: flex; align-items: center; justify-content: center;
                    background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif;
                    padding: 2rem;
                  }
                  .container { text-align: center; max-width: 400px; }
                  .icon { font-size: 4rem; margin-bottom: 1rem; }
                  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #f8fafc; }
                  p { color: #94a3b8; line-height: 1.6; margin-bottom: 1.5rem; }
                  button {
                    background: #3b82f6; color: white; border: none; padding: 0.75rem 2rem;
                    border-radius: 0.75rem; font-size: 1rem; font-weight: 600; cursor: pointer;
                  }
                  button:hover { background: #2563eb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">📡</div>
                  <h1>Sem conexão</h1>
                  <p>Você está offline. Verifique sua conexão com a internet e tente novamente.</p>
                  <button onclick="location.reload()">Tentar novamente</button>
                </div>
              </body>
              </html>`,
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          });
        })
    );
    return;
  }
});

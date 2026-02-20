/**
 * Service Worker — 命理分析系统
 * 静态资源 cache-first，API 请求 network-first
 */

const CACHE_NAME = 'destiny-v1';

const STATIC_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf', '.svg', '.png', '.ico'];

function isStaticAsset(url) {
  return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api');
}

// Install: cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.add('/').catch(() => {}) // cache app shell; static assets cached on first fetch
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API: network-first (no cache)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ success: false, error: '网络不可用，请检查连接' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation: network-first with offline fallback to cached index
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match('/').then((cached) => cached || new Response('离线模式', { status: 503 }))
    )
  );
});

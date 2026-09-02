// Service worker de Phonoplayer.
// Incrementar CACHE_NAME en cada despliegue para forzar actualizacion de assets.
const CACHE_NAME = 'phonoplayer-v1';

const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

// Dominios que NUNCA se cachean: el reproductor necesita red en vivo.
const NEVER_CACHE = ['youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com', 'ggpht.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Nunca interceptar YouTube ni sus CDNs.
  if (NEVER_CACHE.some((host) => url.hostname === host || url.hostname.endsWith('.' + host))) return;

  // Solo cacheamos nuestro propio origen.
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, cache como respaldo offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    );
    return;
  }

  // Assets del shell: cache primero.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());
    })
  );
});

const CACHE_NAME = 'filehub-v3';
const STATIC_CACHE = 'filehub-static-v3';

// ============================================
// OPTIMIZACIÓN 12: PRECACHE INTELIGENTE
// Solo cachear lo crítico para first load
// ============================================
const PRE_CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Hosts que se cachean con cache-first (inmutables)
const IMMUTABLE_HOSTS = ['fonts.gstatic.com'];
// Hosts que se cachean con stale-while-revalidate
const CACHEABLE_HOSTS = ['fonts.googleapis.com'];
// Hosts que NUNCA se cachean
const BYPASS_HOSTS = ['generativelanguage.googleapis.com', 'supabase.co', 'supabase.io'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRE_CACHE_RESOURCES);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map(name => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // BYPASS: API calls (Supabase, Gemini) - siempre network
  if (BYPASS_HOSTS.some(host => url.hostname.includes(host))) return;

  // CACHE-FIRST: Fuentes (inmutables, nunca cambian)
  if (IMMUTABLE_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // CACHE-FIRST para assets hasheados (JS/CSS con hash en nombre)
  if (url.pathname.match(/\/assets\/.*-[a-f0-9]{8}\./)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // NETWORK-FIRST para HTML y navegación (siempre fresco)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // STALE-WHILE-REVALIDATE para el resto
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

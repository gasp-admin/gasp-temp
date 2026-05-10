const CACHE_NAME = 'gasp-temp-v2'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Instalar: cachear assets estáticos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activar: limpiar caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: Network-first para API/Supabase, Cache-first para estáticos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // No interceptar peticiones a Supabase, API o servicios externos
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.protocol !== 'https:'
  ) {
    return
  }

  // Para el resto: Network-first con fallback a cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear respuestas exitosas de recursos estáticos
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback a cache si no hay red
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // Fallback final: página principal desde cache
          if (event.request.destination === 'document') {
            return caches.match('/')
          }
        })
      })
  )
})

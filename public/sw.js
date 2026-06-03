const CACHE = 'stormgrid-v1'

const SKIP_HOSTS = [
  'api.getstormgrid.com',
  'api.mapbox.com',
  'events.mapbox.com',
  'ulnentpnmfzswbrsznot.supabase.co',
]

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/']))
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  if (request.method !== 'GET') return

  let url
  try { url = new URL(request.url) } catch { return }

  if (SKIP_HOSTS.some(h => url.hostname.includes(h))) return
  if (url.hostname.endsWith('.mapbox.com')) return
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return

  // Cache-first for hashed assets, network-first for HTML/API
  const isAsset = url.pathname.startsWith('/assets/')
  if (isAsset) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()))
        return res
      }))
    )
  } else {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok && res.type !== 'opaque') {
            caches.open(CACHE).then(c => c.put(request, res.clone()))
          }
          return res
        })
        .catch(() => caches.match(request))
    )
  }
})

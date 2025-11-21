// Detect if we're in local development
const isLocalhost = self.location.hostname === 'localhost' || 
                    self.location.hostname === '127.0.0.1' ||
                    self.location.hostname === '';

// If localhost, unregister this service worker immediately
if (isLocalhost) {
  self.addEventListener('install', event => {
    // Unregister on localhost
    self.registration.unregister();
  });
  
  // Don't intercept any fetches on localhost
  self.addEventListener('fetch', event => {
    // Do nothing - let browser handle normally
    return;
  });
  
  // Skip waiting and activate immediately to unregister
  self.skipWaiting();
  self.addEventListener('activate', event => {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UNREGISTERED' });
        });
        return self.clients.claim();
      }).then(() => {
        return self.registration.unregister();
      })
    );
  });
} else {
  // Production service worker code
  const CACHE_NAME = 'gigmap-v1';
  const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './fonts/RobotoCondensed-VariableFont_wght.ttf',
    './fonts/RobotoCondensed-Italic-VariableFont_wght.ttf',
    './fonts/Archivo-VariableFont_wdth,wght.ttf',
    './fonts/Archivo-Italic-VariableFont_wdth,wght.ttf'
  ];

  // Files that should bypass cache (dynamic data)
  const bypassCache = [
    'merged_venues_events.geojson',
    'lexington_events_time_imperial_modified.csv',
    '/ws', // WebSocket connections
    'chrome-extension' // Browser extensions
  ];

  // Install event
  self.addEventListener('install', event => {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => {
          // Use addAll with error handling
          return cache.addAll(urlsToCache).catch(() => {
            // Continue even if some files fail
            return Promise.resolve();
          });
        })
    );
    // Skip waiting to activate new service worker immediately
    self.skipWaiting();
  });

  // Fetch event
  self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
      return;
    }
    
    // Skip WebSocket and extension requests
    if (url.protocol === 'ws:' || url.protocol === 'wss:' || 
        bypassCache.some(pattern => url.pathname.includes(pattern))) {
      return; // Let browser handle normally
    }
    
    // Skip external requests (CDN, APIs, etc.)
    if (url.origin !== location.origin) {
      return; // Let browser handle normally
    }
    
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Return cached version if available
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Otherwise, fetch from network
          return fetch(event.request)
            .then(response => {
              // Only cache successful responses for HTML, CSS, JS
              if (response && response.status === 200) {
                const contentType = response.headers.get('content-type');
                if (contentType && (
                  contentType.includes('text/html') ||
                  contentType.includes('text/css') ||
                  contentType.includes('application/javascript') ||
                  contentType.includes('font')
                )) {
                  const responseToCache = response.clone();
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      cache.put(event.request, responseToCache);
                    });
                }
              }
              return response;
            })
            .catch(() => {
              // Return a basic error response instead of failing silently
              return new Response('Network error', {
                status: 408,
                statusText: 'Request Timeout'
              });
            });
        })
    );
  });
  
  // Activate event
  self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  });
}

// Activate event (duplicate removed - already handled above)

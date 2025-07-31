// Service Worker for Meghan Hair Studio PWA
const CACHE_NAME = 'meghan-hair-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  '/',
  '/enhanced-index.html',
  '/enhanced-styles.css',
  '/enhanced-scripts.js',
  '/manifest.json',
  '/offline.html',
  // Images - will be cached dynamically
  'folder/bio_meg.png',
  'folder/meg3.jpg',
  'folder/meg4.jpg',
  'folder/meg5.jpg',
  'folder/meg6.jpg',
  'folder/meg7.jpg',
  'folder/meg8.jpg',
  'folder/meg9.jpg'
];

// External resources to cache
const EXTERNAL_CACHE_FILES = [
  'https://cdn.tailwindcss.com',
  'https://js.stripe.com/v3/'
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => {
        console.log('Caching static files...');
        return cache.addAll(STATIC_CACHE_FILES.map(url => new Request(url, {
          cache: 'reload'
        })));
      }),
      caches.open(CACHE_NAME + '-external').then(cache => {
        console.log('Caching external resources...');
        return Promise.allSettled(
          EXTERNAL_CACHE_FILES.map(url => 
            cache.add(new Request(url, { mode: 'cors' }))
              .catch(err => console.log(`Failed to cache ${url}:`, err))
          )
        );
      })
    ]).then(() => {
      console.log('Service Worker installed successfully');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== CACHE_NAME + '-external') {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests that aren't in our cache
  if (url.origin !== location.origin && !EXTERNAL_CACHE_FILES.includes(request.url)) {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Handle API requests (booking, payments)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle all other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// Handle API requests with offline support
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // If it's a booking request, store it for later sync
    if (request.url.includes('/bookings')) {
      return handleOfflineBooking(request);
    }
    
    // Return a custom offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This feature requires an internet connection'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle offline booking requests
async function handleOfflineBooking(request) {
  try {
    const bookingData = await request.json();
    
    // Store booking in IndexedDB for later sync
    await storeOfflineBooking(bookingData);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking saved offline. Will sync when connection is restored.',
        bookingId: 'OFFLINE_' + Date.now()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to save offline booking',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(request);
    
    // Cache successful image responses
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Return a placeholder image for failed requests
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f3f4f6"/><text x="150" y="100" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="14">Image unavailable offline</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

// Store offline booking in IndexedDB
async function storeOfflineBooking(bookingData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MeghanHairOffline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['bookings'], 'readwrite');
      const store = transaction.objectStore('bookings');
      
      const booking = {
        ...bookingData,
        timestamp: Date.now(),
        synced: false
      };
      
      store.add(booking);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore('bookings', { 
        keyPath: 'timestamp' 
      });
      store.createIndex('synced', 'synced', { unique: false });
    };
  });
}

// Background sync for offline bookings
self.addEventListener('sync', event => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncOfflineBookings());
  }
});

// Sync offline bookings when connection is restored
async function syncOfflineBookings() {
  try {
    const bookings = await getOfflineBookings();
    
    for (const booking of bookings) {
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking)
        });
        
        if (response.ok) {
          await markBookingAsSynced(booking.timestamp);
          console.log('Synced offline booking:', booking.timestamp);
        }
      } catch (error) {
        console.error('Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('Failed to sync offline bookings:', error);
  }
}

// Get unsynced offline bookings
async function getOfflineBookings() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MeghanHairOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['bookings'], 'readonly');
      const store = transaction.objectStore('bookings');
      const index = store.index('synced');
      const getRequest = index.getAll(false);
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Mark booking as synced
async function markBookingAsSynced(timestamp) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MeghanHairOffline', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['bookings'], 'readwrite');
      const store = transaction.objectStore('bookings');
      const getRequest = store.get(timestamp);
      
      getRequest.onsuccess = () => {
        const booking = getRequest.result;
        if (booking) {
          booking.synced = true;
          const putRequest = store.put(booking);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        }
      };
    };
  });
}

// Push notification handling
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/icon-192x192.png',
    badge: '/assets/badge-72x72.png',
    image: data.image,
    data: data.data,
    actions: [
      {
        action: 'confirm',
        title: 'Confirm Appointment',
        icon: '/assets/action-confirm.png'
      },
      {
        action: 'reschedule',
        title: 'Reschedule',
        icon: '/assets/action-reschedule.png'
      }
    ],
    tag: data.tag || 'appointment-reminder',
    renotify: true,
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  let url = '/';
  
  if (action === 'confirm') {
    url = `/#booking?confirm=${data.bookingId}`;
  } else if (action === 'reschedule') {
    url = `/#booking?reschedule=${data.bookingId}`;
  } else if (data && data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'SYNC_BOOKINGS':
      syncOfflineBookings();
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

console.log('Service Worker loaded successfully');
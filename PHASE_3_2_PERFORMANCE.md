PHASE 3.2: PERFORMANCE IMPLEMENTATION
=====================================

## BACKEND OPTIMIZATION

### 1. Redis Caching Layer
File: backend/apps/core/cache.py

```python
from django.core.cache import cache
from functools import wraps
import hashlib

def cache_response(timeout=300):
    """Decorator to cache API responses"""
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            cache_key = f"{func.__name__}:{request.user.id}:{hashlib.md5(str(args).encode()).hexdigest()}"
            cached = cache.get(cache_key)
            if cached:
                return cached
            response = func(request, *args, **kwargs)
            cache.set(cache_key, response, timeout)
            return response
        return wrapper
    return decorator

def invalidate_cache(pattern):
    """Invalidate cache by pattern"""
    from django.core.cache import cache
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern(pattern)
```

### 2. Query Optimization
- Use select_related() for ForeignKey relationships
- Use prefetch_related() for ManyToMany relationships
- Add database indexes on frequently filtered fields
- Implement pagination (limit 50 items per page)

### 3. Batch Operations
```python
# Bulk create/update
Conversation.objects.bulk_create(conversations, batch_size=100)
Conversation.objects.bulk_update(conversations, fields=['status'], batch_size=100)
```

---

## FRONTEND OPTIMIZATION

### 1. Service Worker (offline support)
File: frontend/public/service-worker.js

```javascript
const CACHE_NAME = 'recall-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(response => {
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clonedResponse);
        });
        return response;
      });
    }).catch(() => {
      return caches.match('/offline.html');
    })
  );
});
```

### 2. IndexedDB Caching
File: frontend/src/utils/indexedDB.js

```javascript
const DB_NAME = 'RecallDB';
const DB_VERSION = 1;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('conversations', { keyPath: 'id' });
      db.createObjectStore('decisions', { keyPath: 'id' });
      db.createObjectStore('replies', { keyPath: 'id' });
    };
  });
};

export const saveToCache = async (storeName, data) => {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(data);
  return tx.complete;
};

export const getFromCache = async (storeName, id) => {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(storeName).get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};
```

### 3. Lazy Loading & Code Splitting
File: frontend/src/App.js (updated)

```javascript
import React, { Suspense, lazy } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Conversations = lazy(() => import('./pages/Conversations'));
const Decisions = lazy(() => import('./pages/Decisions'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/decisions" element={<Decisions />} />
      </Routes>
    </Suspense>
  );
}
```

### 4. Image Optimization
```javascript
// Use responsive images
<img 
  src={image} 
  srcSet={`${image}?w=400 400w, ${image}?w=800 800w`}
  sizes="(max-width: 600px) 400px, 800px"
  alt="description"
/>

// Or use next-gen formats
<picture>
  <source srcSet={image + '.webp'} type="image/webp" />
  <img src={image + '.jpg'} alt="description" />
</picture>
```

---

## IMPLEMENTATION CHECKLIST

### Backend
- [ ] Install Redis: `pip install django-redis`
- [ ] Configure Redis in settings.py
- [ ] Add cache_response decorator to API views
- [ ] Optimize queries with select_related/prefetch_related
- [ ] Add pagination to list endpoints
- [ ] Implement batch operations

### Frontend
- [ ] Register service worker in index.js
- [ ] Create offline.html fallback page
- [ ] Implement IndexedDB caching utility
- [ ] Add lazy loading to routes
- [ ] Optimize images with srcSet
- [ ] Implement request deduplication

---

## EXPECTED PERFORMANCE GAINS

- API Response Time: 50% reduction (with caching)
- Page Load Time: 30% faster (with code splitting)
- Offline Functionality: 100% (with service worker)
- Network Requests: 40% reduction (with caching)
- Bundle Size: 25% smaller (with code splitting)

---

## MONITORING

Add performance monitoring:
```javascript
// Track API response times
const startTime = performance.now();
const response = await api.get('/endpoint');
const duration = performance.now() - startTime;
console.log(`API call took ${duration}ms`);

// Track page load time
window.addEventListener('load', () => {
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  console.log(`Page load time: ${pageLoadTime}ms`);
});
```

---

## NEXT STEPS

1. Install and configure Redis
2. Add cache_response decorator to high-traffic endpoints
3. Register service worker
4. Implement IndexedDB caching
5. Add lazy loading to routes
6. Monitor performance metrics
7. Optimize images
8. Test offline functionality

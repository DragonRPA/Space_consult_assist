// Service Worker: Offline Cache & Background Sync for Field Engineers
const CACHE_NAME = 'space-advisor-mobile-v2';
const MAX_CACHE_ENTRIES = 50; // 캐시 항목 수 제한
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// API 요청은 캐시하지 않음 (항상 최신 데이터 사용)
const isApiRequest = (url) => url.includes('/api/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 캐시 크기 제한 유지 (오래된 항목 자동 삭제)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // 초과분 삭제 (가장 오래된 항목부터)
    await Promise.all(keys.slice(0, keys.length - maxEntries).map(k => cache.delete(k)));
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // API 요청: 항상 네트워크 우선, 캐시 저장 안 함
  if (isApiRequest(event.request.url)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: '오프라인 상태입니다. 네트워크 연결을 확인하세요.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 정적 자산: 네트워크 우선, 실패 시 캐시 fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
            trimCache(CACHE_NAME, MAX_CACHE_ENTRIES); // 크기 제한 유지
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 모든 요청 타입에 대한 fallback 처리
          const acceptHeader = event.request.headers.get('accept') || '';
          if (acceptHeader.includes('text/html')) {
            return caches.match('/index.html');
          }
          // 이미지/CSS/기타 에셋 fallback: 빈 응답
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});


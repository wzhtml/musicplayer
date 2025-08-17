const CACHE_NAME = 'music-player-v1';
const ASSETS_TO_CACHE = [
  '.',
  'index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css',
  'musicplayer-180x180.png'  // 新增图标到缓存列表
];

// 安装Service Worker时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截网络请求，实现缓存优先策略
self.addEventListener('fetch', (event) => {
  // 对于音频文件，使用网络优先策略
  if (event.request.url.includes('blob:') || event.request.headers.get('Accept').includes('audio/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({ error: 'No internet connection' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 其他资源使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存中有则返回缓存，同时更新缓存
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
        
        return response || fetchPromise;
      })
  );
});
    
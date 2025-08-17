const CACHE_NAME = 'music-player-ios12-v1';
// 仅缓存核心资源，避免iOS 12缓存空间不足
const ASSETS_TO_CACHE = [
  '.',
  'index.html',
  'manifest.json',
  'musicplayer-180x180.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css'
];

// 1. 安装：仅缓存核心资源，避免iOS 12安装失败
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // iOS 12 需逐个缓存，避免批量添加失败
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(err => {
              console.log(`缓存${url}失败:`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 2. 激活：清理旧缓存，避免iOS 12缓存冲突
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. fetch拦截：简化策略，避免iOS 12对blob请求的异常
self.addEventListener('fetch', (event) => {
  // 音频文件：仅走网络，避免iOS 12缓存blob异常
  if (event.request.url.includes('blob:') || event.request.headers.get('Accept')?.includes('audio/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({ error: '无网络连接' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 其他资源：缓存优先，确保离线可用
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        const fetchPromise = fetch(event.request)
          .then(networkRes => {
            // 更新缓存（iOS 12需手动clone）
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkRes.clone());
            });
            return networkRes;
          })
          .catch(() => response); // 网络失败时用缓存
        
        return response || fetchPromise;
      })
  );
});
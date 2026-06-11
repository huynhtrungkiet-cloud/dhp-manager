/* DHP Manager — Service Worker
   Cho phép mở app offline + cài ra màn hình chính điện thoại.
   Chiến lược: cache app shell, ưu tiên mạng cho dữ liệu Google Sheets. */
const CACHE = 'dhp-manager-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', e=>{
  const url = e.request.url;
  // KHÔNG cache lời gọi Google Apps Script (dữ liệu phải luôn mới nhất)
  if(url.includes('script.google.com') || url.includes('script.googleusercontent.com')){
    return; // để trình duyệt gọi mạng trực tiếp
  }
  // App shell: cache-first, fallback mạng
  e.respondWith(
    caches.match(e.request).then(cached=> cached || fetch(e.request).then(res=>{
      if(e.request.method==='GET' && res.ok){
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
      }
      return res;
    }).catch(()=>cached))
  );
});

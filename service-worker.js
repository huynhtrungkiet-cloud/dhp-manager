/* DHP Manager — Service Worker (v4 — KHÔNG cache để luôn lấy bản mới nhất)
   Lý do: trước đây cache giữ bản cũ gây trắng trang / không cập nhật.
   SW này chỉ "đi thẳng ra mạng" (network-only) + tự thay thế bản SW cũ. */
const VERSION = 'dhp-v4-nocache';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Xóa sạch mọi cache cũ (bản v1/v2/v3 cache-first đã gây kẹt)
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  // Luôn lấy từ mạng; nếu offline mới báo lỗi (không phục vụ bản cache cũ)
  e.respondWith(fetch(e.request).catch(() => new Response(
    'Mất kết nối mạng. Vui lòng kết nối lại rồi tải lại trang.',
    { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  )));
});

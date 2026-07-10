// 昼餉缶詰肉 迷惑行為ずかん — Service Worker
// 役目: 通知を出せる状態を用意し、通知クリック時に紐づいた URL を開く。

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var url = data.url;
  if (!url) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function () {
      return self.clients.openWindow(url);
    })
  );
});

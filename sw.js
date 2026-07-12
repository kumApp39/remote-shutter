// リモートシャッター Service Worker
// index.html はネットワーク優先(古いビルドが残り続ける事故を防ぐ)、その他はキャッシュ優先
const CACHE = "remote-shutter-v3";
const ASSETS = ["./", "./index.html", "./peerjs.min.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // PeerJSのシグナリング等は素通し

  const isHTML = e.request.mode === "navigate" || url.pathname.endsWith("index.html");
  if (isHTML) {
    // ネットワーク優先: 更新を確実に取り込み、オフライン時のみキャッシュ
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }))
    );
  }
});

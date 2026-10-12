/* Calm Calendar service worker. Caches the app so it opens fast and works offline. */
const CACHE = "calmcal-v1";
const FILES = ["./", "index.html", "styles.css", "fullcalendar.js", "logic.js", "app.js", "manifest.webmanifest", "icon.svg"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) { e.respondWith(caches.match(e.request).then(function (hit) { return hit || fetch(e.request); })); });

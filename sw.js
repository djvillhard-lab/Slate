/* Slate: opens instantly from the phone's copy of the app, then updates in the background.
   A link with ?v=<build> (what the update check opens) always comes from the network. */
var SHELL = "slate-shell-v12";
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(["./", "supabase.js", "icon.png"]); }).catch(function () {}));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== SHELL; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function fresh(req, key) {
  // a plain URL fetch: some browsers refuse to copy a page navigation into a new request
  return fetch(req.mode === "navigate" ? req.url : req, { cache: "no-store", credentials: "same-origin" }).then(function (r) {
    if (r && r.ok) { var copy = r.clone(); caches.open(SHELL).then(function (c) { c.put(key, copy); }); }
    return r;
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;           // Supabase, ESPN: straight to the network
  if (/version\.json$/.test(url.pathname) || /sw\.js$/.test(url.pathname)) return;    // the update check is never cached
  if (req.mode === "navigate") {
    if (url.searchParams.has("v")) {                                                   // the update check asked for this build
      e.respondWith(fresh(req, "./").catch(function () { return caches.match("./"); }));
      return;
    }
    e.respondWith(caches.match("./").then(function (hit) {
      var net = fresh(req, "./").catch(function () { return hit; });
      return hit || net;
    }));
    return;
  }
  if (/(supabase\.js|icon\.png)$/.test(url.pathname)) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fresh(req, req); }));
  }
});

// game alerts: sent by Slate's 10-minute job as push notifications
self.addEventListener("push", function (e) {
  var m = {}; try { m = e.data ? e.data.json() : {}; } catch (x) { m = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(typeof m.title === "string" ? m.title : "Slate", { body: m.body || "", tag: m.tag || undefined, icon: "icon.png", badge: "icon.png" }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ("focus" in cs[i]) return cs[i].focus(); }
    return self.clients.openWindow("./");
  }));
});

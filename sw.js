/* Slate: opens instantly from the phone's copy of the app, then updates in the background.
   A link with ?v=<build> (what the update check opens) always comes from the network. */
var SHELL = "slate-shell-v13", LOGOS = "slate-logos-v1";
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(["./", "supabase.js", "icon.png"]); }).catch(function () {}));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== SHELL && k !== LOGOS; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function fresh(req, key) {
  // a plain URL fetch: some browsers refuse to copy a page navigation into a new request
  return fetch(req.mode === "navigate" ? req.url : req, { cache: "no-store", credentials: "same-origin" }).then(function (r) {
    if (r && r.ok) { var copy = r.clone(); caches.open(SHELL).then(function (c) { c.put(key, copy); }); }
    return r;
  });
}
// 3.178.4: the phone's copy of the app is only downloaded again when the server has a different build. Every open used
// to pull the whole page (about 850 KB) in the background; now it reads version.json (a few bytes) and stops there
// unless the build changed. The server sends the page without a tag a browser could use to ask "same as before?", so the
// build stamp does that job. The stamp is read before the page, so the saved stamp is never newer than the saved page.
var BUILD_KEY = "slate-build";
function liveBuild() { return fetch("version.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return (j && j.build) || ""; }, function () { return ""; }); }
function keptBuild() { return caches.open(SHELL).then(function (c) { return c.match(BUILD_KEY); }).then(function (r) { return r ? r.text() : ""; }).catch(function () { return ""; }); }
function refresh(req) {
  return Promise.all([liveBuild(), keptBuild()]).then(function (b) {
    if (b[0] && b[0] === b[1]) return null;
    return fresh(req, "./").then(function (r) {
      if (r && r.ok && b[0]) return caches.open(SHELL).then(function (c) { return c.put(BUILD_KEY, new Response(b[0])); });
    });
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  // team logos (ESPN's small resized copies): kept on the phone, so each logo downloads once
  if (req.method === "GET" && url.hostname === "a.espncdn.com" && /^\/combiner\/i/.test(url.pathname) && url.search.indexOf("/teamlogos/") !== -1) {
    e.respondWith(caches.open(LOGOS).then(function (c) { return c.match(req).then(function (hit) {
      return hit || fetch(req).then(function (r) { if (r && r.ok) c.put(req, r.clone()); return r; });
    }); }));
    return;
  }
  if (req.method !== "GET" || url.origin !== self.location.origin) return;           // Supabase, ESPN: straight to the network
  if (/version\.json$/.test(url.pathname) || /sw\.js$/.test(url.pathname)) return;    // the update check is never cached
  // only the app itself is the cached shell; other pages (like app-preview.html) load straight from the network
  if (req.mode === "navigate" && !/^\/(index\.html)?$/.test(url.pathname)) return;
  if (req.mode === "navigate") {
    if (url.searchParams.has("v")) {                                                   // the update check asked for this build
      e.respondWith(fresh(req, "./").catch(function () { return caches.match("./"); }));
      return;
    }
    var kept = caches.match("./");
    e.respondWith(kept.then(function (hit) { return hit || fresh(req, "./"); }));
    e.waitUntil(kept.then(function (hit) { return hit ? refresh(req) : null; }).catch(function () {}));
    return;
  }
  if (/(supabase\.js|icon\.png|\/fonts\/[\w-]+\.woff2)$/.test(url.pathname)) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fresh(req, req); }));
  }
});

// game alerts: sent by Slate's server every minute (worker/alerts.js) as push notifications.
// An alert about a game carries its id; tapping it opens that game's matchup.
self.addEventListener("push", function (e) {
  var m = {}; try { m = e.data ? e.data.json() : {}; } catch (x) { m = { body: e.data ? e.data.text() : "" }; }
  var game = typeof m.game === "string" && /^[\w.-]{1,40}$/.test(m.game) ? m.game : "";
  e.waitUntil(self.registration.showNotification(typeof m.title === "string" ? m.title : "Slate", { body: m.body || "", tag: m.tag || undefined, icon: "icon.png", badge: "icon.png", data: { game: game } }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var game = (e.notification.data && e.notification.data.game) || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      if (!("focus" in cs[i])) continue;
      if (game) cs[i].postMessage({ slate: "open-game", id: game });  // Slate is already open: it switches to the game
      return cs[i].focus();
    }
    return self.clients.openWindow(game ? "./?game=" + encodeURIComponent(game) : "./");
  }));
});

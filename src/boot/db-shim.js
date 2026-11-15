/* Slate self-hosted: stands in for the Claude artifact database, backed by Supabase (same paths). */
(function () {
  var C = window.SLATE_SELF;
  var sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: false } });
  try { var m = /[#&]pass=([^&]+)/.exec(location.hash); if (m) { localStorage.setItem("slate-pass", decodeURIComponent(m[1])); history.replaceState(null, "", location.pathname + location.search); } } catch (e) {}
  function pass() { try { return localStorage.getItem("slate-pass") || ""; } catch (e) { return ""; } }
  // Home Screen apps on iPhone keep their own storage, so ask here when there's no passcode yet.
  // Cancel = view only (asked again only after "Enter passcode" in the footer).
  try {
    if (!pass() && !localStorage.getItem("slate-view-only")) {
      var typed = window.prompt("Enter your Slate passcode so your changes save.\n\nTap Cancel to just view.");
      if (typed && typed.trim()) localStorage.setItem("slate-pass", typed.trim()); else localStorage.setItem("slate-view-only", "1");
    }
  } catch (e) {}
  // a change on a phone with no passcode (view only): ask for it right then, once, instead of failing quietly
  var asked = false;
  function askPassNow() {
    if (asked) return; asked = true;
    setTimeout(function () {
      var t = window.prompt("This phone isn't signed in, so changes can't save.\n\nEnter your Slate passcode:");
      if (t && t.trim()) { try { localStorage.setItem("slate-pass", t.trim()); localStorage.removeItem("slate-view-only"); localStorage.removeItem("slate-user"); } catch (e) {} location.reload(); }
    }, 50);
  }
  window.slateAskPass = function () { try { localStorage.removeItem("slate-view-only"); localStorage.removeItem("slate-pass"); } catch (e) {} location.reload(); };
  // who this phone belongs to: "dj" (the main passcode) or another person's id from users/registry, found by the worker
  function who() { try { return localStorage.getItem("slate-user") || "dj"; } catch (e) { return "dj"; } }
  function mapPath(p) {
    var m = /^data\/users\/[^/]+\/(.+)$/.exec(p); if (m) p = "mine/user-" + m[1];
    var u = who(); if (u !== "dj" && /^(mine|prefs)\//.test(p)) p = "u/" + u + "/" + p;
    return p;
  }
  function whoami() {
    return fetch("/api/whoami", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pass: pass() }) })
      .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; });
  }
  // keep the last copy of each document on the phone so the app opens instantly, then catch up from the network
  var CK = "slate-doc:";
  function cacheGet(path) { try { var v = localStorage.getItem(CK + path); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function cachePut(path, row) {
    var v = JSON.stringify(row ? { data: row.data, updated_at: row.updated_at } : { none: true });
    try { localStorage.setItem(CK + path, v); }
    catch (e) {  // full: drop the cached documents of other days and try once more
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(CK) === 0 && k !== CK + path) localStorage.removeItem(k); }); localStorage.setItem(CK + path, v); } catch (e2) {}
    }
  }
  function snap(row) { var d = row ? row.data : undefined; return { exists: !!row, data: function () { return d === undefined ? undefined : JSON.parse(JSON.stringify(d)); }, metadata: { fromCache: false } }; }
  function fetchRow(path) {
    return sb.from("docs").select("data,updated_at").eq("path", path).maybeSingle().then(function (r) {
      if (r.error) { var e = new Error(r.error.message); e.code = "unavailable"; throw e; }
      cachePut(path, r.data); return r.data;
    });
  }
  var subs = {}, healing = false; // path -> [{cb, err}]
  function notify(path) {
    var list = subs[path]; if (!list || !list.length) return;
    fetchRow(path).then(function (row) { (subs[path] || []).slice().forEach(function (s) { try { s.cb(snap(row)); } catch (e) { console.error(e); } }); }, function () {});
  }
  sb.channel("docs-all").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, function (p) {
    var path = (p.new && p.new.path) || (p.old && p.old.path); if (path) notify(path);
  }).subscribe();
  // phones drop the live connection in the background: catch up when the page comes back
  document.addEventListener("visibilitychange", function () { if (!document.hidden) Object.keys(subs).forEach(notify); });
  setInterval(function () { if (!document.hidden) Object.keys(subs).forEach(notify); }, 5 * 60000);
  function doc(p) {
    var path = mapPath(p);
    return {
      get: function () {
        // the network copy when it's quick; the phone's copy when the network is slow or down
        var c = cacheGet(path), net = fetchRow(path).then(snap);
        if (!c) return net;
        var local = snap(c.none ? null : c);
        return new Promise(function (res) {
          var done = false, t = setTimeout(function () { if (!done) { done = true; res(local); } }, 1200);
          net.then(function (s2) { if (!done) { done = true; clearTimeout(t); res(s2); } }, function () { if (!done) { done = true; clearTimeout(t); res(local); } });
        });
      },
      set: function (data) {
        if (!pass()) { askPassNow(); var e0 = new Error("No passcode on this device"); e0.code = "permission-denied"; return Promise.reject(e0); }
        if (who() !== "dj") return fetch("/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pass: pass(), path: path, data: data }) }).then(function (r) {
          if (!r.ok) { var e = new Error("save " + r.status); e.code = r.status === 403 ? "permission-denied" : "unavailable"; throw e; }
          notify(path);
        }, function () { var e = new Error("offline"); e.code = "unavailable"; throw e; });
        return sb.rpc("save_doc", { p_path: path, p_data: data, p_pass: pass(), p_merge: false }).then(function (r) {
          if (r.error) {
            // this phone forgot whose it is (someone else's passcode, treated as DJ's): ask the server, then reopen as them
            if (/not allowed/.test(r.error.message) && !healing) { healing = true; whoami().then(function (w) { if (w && w.id && w.id !== "dj") { try { localStorage.setItem("slate-user", w.id); localStorage.setItem("slate-user-name", w.name || ""); } catch (x) {} location.reload(); } else healing = false; }); }
            var e = new Error(r.error.message); e.code = /not allowed/.test(r.error.message) ? "permission-denied" : "unavailable"; throw e;
          }
          notify(path);
        });
      },
      onSnapshot: function (cb, err) {
        var s = { cb: cb, err: err }; (subs[path] = subs[path] || []).push(s);
        var c = cacheGet(path), shown = null;
        if (c) { shown = c.none ? "none" : c.updated_at; Promise.resolve().then(function () { if ((subs[path] || []).indexOf(s) !== -1) cb(snap(c.none ? null : c)); }); }
        fetchRow(path).then(function (row) {
          if ((subs[path] || []).indexOf(s) === -1) return;
          if (shown !== null && shown === (row ? row.updated_at : "none")) return;  // the cached copy was already current
          cb(snap(row));
        }, function (e) { if (!c && err) err(e); });
        return function () { var l = subs[path] || []; var i = l.indexOf(s); if (i !== -1) l.splice(i, 1); };
      }
    };
  }
  // check the passcode once; a new phone waits for the answer so it never shows someone else's slate
  var known = (function () { try { return localStorage.getItem("slate-user"); } catch (e) { return null; } })();
  var ready = Promise.resolve();
  if (pass()) {
    var check = whoami().then(function (w) {
      if (w && w.id) { var was = known; try { localStorage.setItem("slate-user", w.id); localStorage.setItem("slate-user-name", w.name || ""); } catch (e) {} if (was && was !== w.id) location.reload(); return; }
      // no answer: wrong passcode or offline; Supabase tells the two apart
      return sb.rpc("save_doc", { p_path: "prefs/passcheck", p_data: { at: new Date().toISOString() }, p_pass: pass(), p_merge: false }).then(function (r) {
        if (r.error && /not allowed/.test(r.error.message)) { try { localStorage.removeItem("slate-pass"); localStorage.removeItem("slate-user"); } catch (e) {} alert("That passcode didn't work. Try again."); location.reload(); }
        else if (!r.error) { try { localStorage.setItem("slate-user", "dj"); } catch (e) {} }
      });
    });
    if (!known) ready = Promise.race([check, new Promise(function (res) { setTimeout(res, 6000); })]);
  } else { try { localStorage.removeItem("slate-user"); } catch (e) {} }
  var db = { doc: doc, collection: function (c) { return { doc: function (id) { return doc(c + "/" + id); } }; } };
  var user = { id: function () { return Promise.resolve("dj"); }, isOwner: function () { return Promise.resolve(!!pass()); } };
  window.claude = { use: function (k) { return ready.then(function () { return k === "db" ? db : k === "user" ? user : null; }); } };
})();

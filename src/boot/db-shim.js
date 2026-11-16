/* Slate self-hosted: stands in for the Claude artifact database, backed by Supabase (same paths). */
(function () {
  var C = window.SLATE_SELF;
  var sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: false } });
  try { var m = /[#&]pass=([^&]+)/.exec(location.hash); if (m) { localStorage.setItem("slate-pass", decodeURIComponent(m[1])); history.replaceState(null, "", location.pathname + location.search); } } catch (e) {}
  function pass() { try { return localStorage.getItem("slate-pass") || ""; } catch (e) { return ""; } }
  // ---- the log-in and sign-up page (3.55.0): a real page instead of the old pop-up prompt ----
  // Log in with a passcode, sign up with an invite (a link from DJ: /#invite=CODE, or the code typed in), or just look around.
  // Styles: src/styles/085-welcome.css.
  var inviteCode = "";
  try {
    var mi = /[#&]invite=([A-Za-z0-9-]{6,40})/.exec(location.hash);
    if (mi) { inviteCode = mi[1]; history.replaceState(null, "", location.pathname + location.search); }
  } catch (e) {}
  function post(path, body) {
    return fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { j = j || {}; j.status = r.status; return j; }, function () { return { status: r.status, error: "Something went wrong. Try again." }; }); },
        function () { return { status: 0, error: "No connection. Check your signal and try again." }; });
  }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function signedIn(passcode, id, name, fresh) {
    try {
      localStorage.setItem("slate-pass", passcode); localStorage.setItem("slate-user", id); localStorage.setItem("slate-user-name", name || "");
      localStorage.removeItem("slate-view-only"); if (fresh) localStorage.setItem("slate-welcome", "1");
    } catch (e) {}
    location.reload();
  }
  function gate(mode, msg, preview) {
    var old = document.getElementById("gate"); if (old) old.remove();
    var g = mk("div", "gate"); g.id = "gate"; g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true");
    var box = mk("form", "gate-in"); box.setAttribute("novalidate", ""); g.appendChild(box);
    box.appendChild(mk("div", "gate-mark", "Slate"));
    var err = mk("p", "gate-err"); err.setAttribute("role", "alert"); err.hidden = !msg; err.textContent = msg || "";
    function field(label, type, auto, ph) {
      var l = mk("label", "gate-f"); l.appendChild(mk("span", null, label));
      var i = mk("input", "field"); i.type = type; i.setAttribute("autocomplete", auto); i.setAttribute("autocapitalize", type === "password" ? "off" : "words"); i.setAttribute("autocorrect", "off"); i.spellcheck = false; if (ph) i.placeholder = ph;
      l.appendChild(i); box.appendChild(l); return i;
    }
    function showBox(inputs) {
      var l = mk("label", "gate-show"), c = mk("input"); c.type = "checkbox";
      c.addEventListener("change", function () { inputs.forEach(function (i) { i.type = c.checked ? "text" : "password"; }); });
      l.appendChild(c); l.appendChild(mk("span", null, "Show passcode")); box.appendChild(l);
    }
    function link(text, fn) { var b = mk("button", "gate-link", text); b.type = "button"; b.addEventListener("click", fn); return b; }
    var go = mk("button", "solid gate-go"); go.type = "submit";
    var busy = false;
    function run(label, promise, done) {
      if (busy) return; busy = true; var was = go.textContent; go.textContent = label; go.disabled = true; err.hidden = true;
      promise.then(function (j) { busy = false; go.textContent = was; go.disabled = false; var m = done(j); if (m) { err.textContent = m; err.hidden = false; } });
    }
    var links = mk("div", "gate-links");
    if (mode === "login") {
      box.appendChild(mk("h1", null, "Log in"));
      box.appendChild(mk("p", "gate-p", "Your teams, your slate rules and your alerts are saved under your passcode."));
      var pw = field("Passcode", "password", "current-password");
      showBox([pw]); box.appendChild(err);
      go.textContent = "Log in"; box.appendChild(go);
      box.addEventListener("submit", function (e) {
        e.preventDefault(); var v = pw.value.trim(); if (!v) { pw.focus(); return; }
        run("Logging in…", post("/api/whoami", { pass: v }), function (j) {
          if (j.id) { signedIn(v, j.id, j.name, false); return ""; }
          return j.status === 403 ? "That passcode didn't work. Check it and try again." : j.status === 0 ? j.error : "Couldn't check that just now. Try again.";
        });
      });
      links.appendChild(link("I have an invite", function () { gate("code"); }));
      links.appendChild(link("Just look around", function () { try { localStorage.setItem("slate-view-only", "1"); } catch (e) {} g.remove(); }));
    } else if (mode === "code") {
      box.appendChild(mk("h1", null, "Use an invite"));
      box.appendChild(mk("p", "gate-p", "Slate is invite only. Open the link DJ sent you, or type the code from the end of it."));
      var cd = field("Invite code", "text", "off"); cd.setAttribute("autocapitalize", "characters");
      box.appendChild(err);
      go.textContent = "Continue"; box.appendChild(go);
      box.addEventListener("submit", function (e) {
        e.preventDefault(); var v = cd.value.trim().replace(/^.*invite=/i, ""); if (!v) { cd.focus(); return; }
        run("Checking…", post("/api/invite-check", { code: v }), function (j) { if (j.ok) { inviteCode = v; gate("signup"); return ""; } return j.error || "Couldn't check that just now. Try again."; });
      });
      links.appendChild(link("I already have a passcode", function () { gate("login"); }));
    } else {
      box.appendChild(mk("h1", null, "Set up your Slate"));
      box.appendChild(mk("p", "gate-p", "Pick a name and a passcode. You'll use the passcode to log in on any phone, so make it one you'll remember."));
      var nm = field("First name", "text", "given-name");
      var p1 = field("Passcode (8 or more characters)", "password", "new-password"), p2 = field("Passcode again", "password", "new-password");
      showBox([p1, p2]); box.appendChild(err);
      go.textContent = "Create my Slate"; box.appendChild(go);
      box.addEventListener("submit", function (e) {
        e.preventDefault();
        var n = nm.value.trim(), a = p1.value.trim(), b2 = p2.value.trim(), m = "";
        if (n.length < 2) { m = "Type your first name."; nm.focus(); }
        else if (a.length < 8) { m = "Your passcode needs at least 8 characters."; p1.focus(); }
        else if (a !== b2) { m = "The two passcodes don't match."; p2.focus(); }
        if (m) { err.textContent = m; err.hidden = false; return; }
        if (preview) { g.remove(); preview(n); return; }  // DJ trying the new user setup: nothing is sent or saved
        run("Setting up…", post("/api/signup", { code: inviteCode, name: n, pass: a }), function (j) {
          if (j.ok && j.id) { signedIn(a, j.id, j.name, true); return ""; }
          return j.error || "Couldn't set that up just now. Try again.";
        });
      });
      if (preview) { box.insertBefore(mk("p", "gate-pv", "Preview: this is what someone sees when they open your invite link. Type any name and passcode; nothing is saved."), box.children[1]); links.appendChild(link("Close preview", function () { g.remove(); })); }
      else links.appendChild(link("I already have a passcode", function () { gate("login"); }));
    }
    box.appendChild(links);
    document.body.appendChild(g);
    var first = box.querySelector("input.field"); if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 100);
  }
  function whenBody(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }
  // no passcode on this phone yet: show the page (an invite link goes straight to sign-up, after a quick check of the code)
  try {
    var gmsg = ""; try { gmsg = sessionStorage.getItem("slate-gate-msg") || ""; sessionStorage.removeItem("slate-gate-msg"); } catch (e) {}
    if (inviteCode && !pass()) whenBody(function () {
      post("/api/invite-check", { code: inviteCode }).then(function (j) { if (j.ok) gate("signup"); else { var m = j.error || ""; inviteCode = ""; gate("code", m); } });
    });
    else if (!pass() && (gmsg || !localStorage.getItem("slate-view-only"))) whenBody(function () { gate("login", gmsg); });
  } catch (e) {}
  // a change on a phone with no passcode (view only): show the log-in page right then, once, instead of failing quietly
  var asked = false;
  function askPassNow() {
    if (asked) return; asked = true;
    setTimeout(function () { gate("login", "This phone isn't logged in, so changes can't save."); }, 50);
  }
  // Settings > Account > Try the new user setup (DJ): the sign-up page as a preview, then done(name)
  window.slatePreviewSignup = function (done) { gate("signup", "", done); };
  window.slateAskPass = function () { asked = false; gate("login"); };
  // Settings > Log out: this phone forgets the passcode and its saved copies, then shows the log-in page
  window.slateLogOut = function () {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("slate-doc:") === 0) localStorage.removeItem(k); }); ["slate-pass", "slate-user", "slate-user-name", "slate-view-only", "slate-welcome"].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    location.reload();
  };
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
        if (r.error && /not allowed/.test(r.error.message)) { try { localStorage.removeItem("slate-pass"); localStorage.removeItem("slate-user"); } catch (e) {} try { sessionStorage.setItem("slate-gate-msg", "That passcode didn't work. Check it and try again."); } catch (e) {} location.reload(); }
        else if (!r.error) { try { localStorage.setItem("slate-user", "dj"); } catch (e) {} }
      });
    });
    if (!known) ready = Promise.race([check, new Promise(function (res) { setTimeout(res, 6000); })]);
  } else { try { localStorage.removeItem("slate-user"); } catch (e) {} }
  var db = { doc: doc, collection: function (c) { return { doc: function (id) { return doc(c + "/" + id); } }; } };
  var user = { id: function () { return Promise.resolve("dj"); }, isOwner: function () { return Promise.resolve(!!pass()); } };
  window.claude = { use: function (k) { return ready.then(function () { return k === "db" ? db : k === "user" ? user : null; }); } };
})();

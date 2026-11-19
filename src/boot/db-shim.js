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
  // ---- Sign in with Google (3.95.0, worker/google.js, google.html) ----
  // Google can't sign in inside the iPhone app, so Slate gets a one-time ticket and opens google.html in Safari; this
  // phone then checks every few seconds until the browser is done. On the website the same tab goes there and back.
  // kind "link": tie Google to the profile this phone is logged in as. "signin": log this phone in as the profile tied to
  // the Google account. done(answer) gets {ok, kind, email} or {error}; a sign-in reloads the page as that profile.
  function nativeHost() {
    var w = window;
    try { while (w.parent && w.parent !== w && !(w.webkit && w.webkit.messageHandlers && w.webkit.messageHandlers.slate)) w = w.parent; } catch (e) {}
    try { return w.webkit && w.webkit.messageHandlers && w.webkit.messageHandlers.slate ? w.webkit.messageHandlers.slate : null; } catch (e) { return null; }
  }
  var gPoll = null;
  function topWin() { try { return window.top || window; } catch (e) { return window; } }
  // the app build can show Google in Apple's sign-in sheet and do Sign in with Apple (3.114.0; older builds can't)
  function canSheet() { try { var n = topWin().SLATE_NATIVE; return !!(n && n.auth && nativeHost()); } catch (e) { return false; } }
  window.slateCanApple = canSheet;
  // Sign in with Apple (the app only): kind "link" or "signin", like slateGoogle; the answer comes straight back
  window.slateApple = function (kind, done) {
    done = done || function () {};
    var host = nativeHost(); if (!host || !canSheet()) { done({ error: "Sign in with Apple needs the newest Slate app." }); return; }
    topWin().__slateAppleCb = function (token, nonce, e) {
      if (!token) { done({ error: e || "Sign in with Apple didn't finish. Try again." }); return; }
      var body = { kind: kind, token: token, nonce: nonce }; if (kind === "link") body.pass = pass();
      post("/api/google/apple", body).then(function (r) {
        if (r.ok && r.kind === "signin" && r.pass) { signedIn(r.pass, r.id, r.name, false, r.admin); return; }
        done(r);
      });
    };
    host.postMessage({ t: "apple" });
  };
  window.slateGoogle = function (kind, done) {
    done = done || function () {};
    var body = { kind: kind }; if (kind === "link") body.pass = pass();
    return post("/api/google/start", body).then(function (j) {
      if (!j.t) { done({ error: j.error || "Couldn't start. Try again." }); return; }
      var url = location.origin + "/google.html#t=" + j.t, host = nativeHost();
      if (!host) {  // the website: this tab goes to Google and comes back (google.html finishes with the second half)
        try { sessionStorage.setItem("slate-gs", j.s); sessionStorage.setItem("slate-gt", j.t); } catch (e) {}
        location.href = url; return;
      }
      var sheet = canSheet();
      if (sheet) host.postMessage({ t: "auth", url: url + "&app=1" }); else host.postMessage({ t: "open", url: url });
      if (gPoll) clearInterval(gPoll);
      var until = Date.now() + 15 * 60000, busy = false;
      function check() {
        if (busy || document.visibilityState === "hidden") return;
        if (Date.now() > until) { clearInterval(gPoll); gPoll = null; done({ error: "That took too long. Try again." }); return; }
        busy = true;
        post("/api/google/poll", { t: j.t, s: j.s }).then(function (r) {
          busy = false; if (r.wait || r.status === 0) return;
          clearInterval(gPoll); gPoll = null; document.removeEventListener("visibilitychange", check);
          if (r.ok && r.kind === "signin" && r.pass) { signedIn(r.pass, r.id, r.name, false, r.admin); return; }
          done(r);
        });
      }
      gPoll = setInterval(check, 3000); document.addEventListener("visibilitychange", check);
      // the app's sign-in sheet closed: finished (check now) or closed early (one last check, then stop)
      if (sheet) topWin().__slateAuthCb = function (ok) {
        busy = false; check();
        if (!ok) setTimeout(function () { if (!gPoll) return; clearInterval(gPoll); gPoll = null; document.removeEventListener("visibilitychange", check); done({ error: "cancel" }); }, 2500);
      };
      done({ opened: true, sheet: sheet });
    });
  };
  // Google sent the browser back to the home page instead of google.html: hand the answer to google.html
  try { if (/[?&](code|error)=/.test(location.search) && sessionStorage.getItem("slate-gt")) location.replace("/google.html" + location.search); } catch (e) {}
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function signedIn(passcode, id, name, fresh, admin) {
    try {
      if (typeof admin === "boolean") localStorage.setItem("slate-admin", admin ? "1" : ""); else localStorage.removeItem("slate-admin");
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
          if (j.id) { signedIn(v, j.id, j.name, false, j.admin); return ""; }
          return j.status === 403 ? "That passcode didn't work. Check it and try again." : j.status === 0 ? j.error : "Couldn't check that just now. Try again.";
        });
      });
      var gg = mk("button", "outline gate-google"); gg.type = "button";
      gg.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.5 2.2-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg><span>Sign in with Google</span>';
      gg.addEventListener("click", function () {
        if (busy) return; busy = true; err.hidden = true; gg.disabled = true;
        window.slateGoogle("signin", function (r) {
          busy = false; gg.disabled = false;
          if (r.opened) { if (!r.sheet) { err.textContent = "Finish in Safari, then come back here. Slate opens by itself."; err.className = "gate-p gate-note"; err.hidden = false; } return; }
          if (r.error === "cancel") return;
          err.className = "gate-err"; err.textContent = r.error || "Couldn't sign in. Try again."; err.hidden = false;
        });
      });
      box.appendChild(mk("div", "gate-or", "or"));
      if (canSheet()) {  // Apple asks apps that offer Google sign-in to offer Sign in with Apple too
        var ga = mk("button", "gate-apple"); ga.type = "button";
        ga.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 1.4c0 1.1-.5 2.3-1.2 3.1-.7.9-2 1.6-3 1.6-.1 0-.2 0-.3-.1V5.7c0-1.1.6-2.3 1.2-3 .8-.9 2.1-1.6 3.2-1.7.1.1.1.3.1.4zm4.5 15.7c0 .1-.5 1.6-1.5 3.1-.9 1.3-1.9 2.7-3.4 2.7s-1.9-.9-3.6-.9c-1.7 0-2.3.9-3.7.9-1.4 0-2.3-1.3-3.4-2.8-1.3-1.8-2.3-4.6-2.3-7.3 0-4.3 2.8-6.5 5.6-6.5 1.4 0 2.7.9 3.6.9.9 0 2.2-1 3.9-1 .6 0 2.9.1 4.4 2.2-.1.1-2.4 1.4-2.4 4.2 0 3.3 2.8 4.4 2.8 4.5z"/></svg><span>Sign in with Apple</span>';
        ga.addEventListener("click", function () {
          if (busy) return; busy = true; err.hidden = true; ga.disabled = true;
          window.slateApple("signin", function (r) {
            busy = false; ga.disabled = false; if (r.error === "cancel") return;
            err.className = "gate-err"; err.textContent = r.error || "Couldn't sign in. Try again."; err.hidden = false;
          });
        });
        box.appendChild(ga);
      }
      box.appendChild(gg);
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
  // Is this phone logged in as an admin? The server says so at each start (whoami) and checks again on every admin
  // action, so this only decides which rows to show. Until the first answer, the owner's own phone counts.
  window.slateIsAdmin = function () { try { var a = localStorage.getItem("slate-admin"); return !!pass() && (a === "1" || (a === null && who() === "dj")); } catch (e) { return false; } };
  window.slateAskPass = function () { asked = false; gate("login"); };
  // Settings > Log out: this phone forgets the passcode and its saved copies, then shows the log-in page
  window.slateLogOut = function () {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("slate-doc:") === 0) localStorage.removeItem(k); }); ["slate-pass", "slate-user", "slate-user-name", "slate-view-only", "slate-welcome", "slate-admin"].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
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
  // Shared documents (slates, scores, previews, team pages, news...) come straight from Supabase with the public key.
  // A person's own documents (settings, alerts, their News page) come from the server with their passcode, so nobody can
  // read anyone else's (security review, 3.82.0). Asks made at the same moment go in one request.
  var SHARED = /^(slates|scores|previews|teams|standouts|live|box|moments|mfacts|newsdeep|newsbrief|events)\/|^news\/(athletic|newsletters)$|^code\/teamids$/;
  function isShared(path) { return SHARED.test(path); }
  var pq = null;
  function fetchPrivate(path) {
    if (!pass()) return Promise.resolve(null);  // looking around without a passcode: nothing personal to read
    if (!pq) {
      pq = { paths: {}, p: null };
      var q = pq;
      q.p = new Promise(function (res) { setTimeout(res, 30); }).then(function () {
        pq = null;
        return fetch("/api/docs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pass: pass(), paths: Object.keys(q.paths) }) })
          .then(function (r) { if (!r.ok) { var e = new Error("read " + r.status); e.code = "unavailable"; throw e; } return r.json(); },
            function () { var e = new Error("offline"); e.code = "unavailable"; throw e; })
          .then(function (j) { var m = {}; (j.rows || []).forEach(function (x) { m[x.path] = { data: x.data, updated_at: x.updated_at }; }); return m; });
      });
    }
    pq.paths[path] = 1;
    return pq.p.then(function (m) { return m[path] || null; });
  }
  function fetchRow(path) {
    if (!isShared(path)) return fetchPrivate(path).then(function (row) { cachePut(path, row); return row; });
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
  // a person's own documents don't arrive over the live connection: look for changes every 15 seconds while the app is
  // on screen, and pass on only the ones that changed
  setInterval(function () {
    if (document.hidden || !pass()) return;
    Object.keys(subs).forEach(function (path) {
      if (isShared(path) || !(subs[path] || []).length) return;
      var was = cacheGet(path), wasAt = was ? (was.none ? "none" : was.updated_at) : null;
      fetchPrivate(path).then(function (row) {
        if ((row ? row.updated_at : "none") === wasAt) return;
        cachePut(path, row);
        (subs[path] || []).slice().forEach(function (s) { try { s.cb(snap(row)); } catch (e) { console.error(e); } });
      }, function () {});
    });
  }, 15000);
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
      if (w && w.id) { var was = known; try { localStorage.setItem("slate-user", w.id); localStorage.setItem("slate-user-name", w.name || ""); if (typeof w.admin === "boolean") localStorage.setItem("slate-admin", w.admin ? "1" : ""); } catch (e) {} if (was && was !== w.id) location.reload(); return; }
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

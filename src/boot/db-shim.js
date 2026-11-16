/* Slate self-hosted: stands in for the Claude artifact database, backed by Supabase (same paths). */
(function () {
  var C = window.SLATE_SELF;
  var sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: false } });
  try { var m = /[#&]pass=([^&]+)/.exec(location.hash); if (m) { localStorage.setItem("slate-pass", decodeURIComponent(m[1])); history.replaceState(null, "", location.pathname + location.search); } } catch (e) {}
  function pass() { try { return localStorage.getItem("slate-pass") || ""; } catch (e) { return ""; } }
  // ---- the log-in and sign-up page (3.55.0): a real page instead of the old pop-up prompt ----
  // Log in with a passcode, sign up with an invite (a link from DJ: /#invite=CODE, or the code typed in), or just look around.
  // Their styles travel with this file (src/shell.html was held by another thread when this was built; they can move to
  // a stylesheet in src/styles/ later). On the folded Duo both pages stop short of the side column (--strip-w); on the
  // open Duo they take the right pane, so the slate stays on the left. Colors are the theme's variables.
  var GATE_CSS = [
    ".gate, .wl { position: fixed; inset: 0; z-index: 40; background: var(--bg, #121821); color: var(--ink, #ECF1F7); overflow-y: auto; -webkit-overflow-scrolling: touch; padding: calc(env(safe-area-inset-top, 0px) + 16px) calc(16px + var(--strip-w, 0px) / var(--z, 1)) calc(env(safe-area-inset-bottom, 0px) + 16px) 16px; box-sizing: border-box; }",
    ".gate { z-index: 60; }",
    "html.duo .gate, html.duo .wl { left: calc(50% + var(--hinge) / 2 + var(--fold-shift)); }",
    "html.wl-on nav.dock, html.wl-on #menu-fab { display: none !important; }",
    "html.wl-on:not(.duo), html.wl-on:not(.duo) body { overflow: hidden; }",
    "html.wl-on .toast { z-index: 45; }",
    ".gate-in { max-width: 420px; margin: 0 auto; display: grid; gap: 12px; }",
    ".gate-mark, .wl-mark { font-weight: 800; font-stretch: 116%; font-size: 18px; letter-spacing: .01em; color: var(--accent); }",
    ".gate h1, .wl h1 { margin: 8px 0 0; font-size: 28px; font-weight: 800; font-stretch: 112%; line-height: 1.15; color: var(--ink); }",
    ".gate-p, .wl-p, .inv-p { margin: 0; font-size: 16px; line-height: 1.4; color: var(--muted); }",
    ".wl-p.dim, .inv-p.dim { font-size: 13px; color: var(--dim); }",
    ".gate-f { display: grid; gap: 4px; }",
    ".gate-f > span { font-size: 13px; font-weight: 700; color: var(--muted); }",
    ".gate .field { width: 100%; box-sizing: border-box; height: 48px; font-size: 16px; color: var(--ink); }",
    ".gate .field:focus, .wl .field:focus, .inv .field:focus { outline: none; border-color: var(--accent-fill); }",
    ".gate-show { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 15px; font-weight: 700; color: var(--muted); }",
    ".gate-show input { width: 20px; height: 20px; accent-color: var(--accent-fill); }",
    ".gate-err { margin: 0; padding: 12px; border-radius: 8px; font-size: 15px; font-weight: 700; color: var(--ink); background: color-mix(in srgb, var(--live) 16%, var(--card)); }",
    ".gate-go { width: 100%; height: 48px; }",
    ".gate-go:disabled, .inv .solid:disabled { opacity: .6; }",
    ".gate-links { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }",
    ".gate-link, .wl-skip { min-height: 44px; padding: 0 4px; font-size: 15px; font-weight: 700; color: var(--muted); text-decoration: underline; text-underline-offset: 3px; }",
    ".wl { display: flex; flex-direction: column; overflow: hidden; }",
    ".wl-top { flex: none; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--hair); }",
    ".wl-n { font-size: 13px; font-weight: 700; color: var(--dim); }",
    ".wl-body { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; display: grid; grid-auto-rows: max-content; align-content: start; gap: 12px; padding: 8px 0 24px; }",
    ".wl-body > * { min-width: 0; }",
    ".wl-body .sec { margin-top: 8px; }",
    ".wl-foot { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 12px; border-top: 1px solid var(--hair); }",
    ".wl-foot .wl-next { min-width: 150px; height: 48px; margin-left: auto; }",
    ".wl-foot .wl-back { height: 48px; padding: 0 20px; }",
    ".wl h1.wl-big { font-size: 32px; }",
    ".wl-pts { display: grid; gap: 0; }",
    ".wl-pt { display: grid; grid-template-columns: 28px 1fr; gap: 12px; padding: 12px 0; border-top: 1px solid var(--hair); }",
    ".wl-pt:last-child { border-bottom: 1px solid var(--hair); }",
    ".wl-pt i { font-style: normal; font-weight: 800; font-size: 22px; font-stretch: 66%; color: var(--accent); line-height: 1.1; }",
    ".wl-pt b { display: block; font-size: 16px; font-weight: 800; }",
    ".wl-pt span { display: block; margin-top: 2px; font-size: 15px; line-height: 1.35; color: var(--muted); }",
    ".wl .field { width: 100%; box-sizing: border-box; height: 48px; font-size: 16px; color: var(--ink); }",
    ".wl-res { margin-top: 0; }",
    ".wl-teams { border-top: 1px solid var(--hair); }",
    ".wl-team { display: grid; grid-template-columns: 42px 1fr 44px; gap: 12px; align-items: center; min-height: 52px; border-bottom: 1px solid var(--hair); }",
    ".wl-team-n { font-size: 16px; font-weight: 800; min-width: 0; }",
    ".wl-team-n i { display: block; font-style: normal; font-size: 13px; font-weight: 700; color: var(--muted); }",
    ".wl-x { width: 44px; height: 44px; display: grid; place-items: center; color: var(--muted); }",
    ".wl-x svg { width: 16px; height: 16px; }",
    ".wl-lgs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }",
    ".wl-lg, .wl-opt { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 52px; padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--card); text-align: left; font-size: 15px; font-weight: 800; color: var(--ink); }",
    ".wl-lg[aria-pressed=\"true\"], .wl-opt[aria-checked=\"true\"] { border-color: var(--accent-fill); background: color-mix(in srgb, var(--accent) 10%, var(--card)); }",
    ".wl-opt-c { flex: none; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 4px; border: 1.5px solid var(--line); }",
    ".wl-opt-c svg { width: 14px; height: 14px; }",
    "[aria-pressed=\"true\"] > .wl-opt-c, [aria-checked=\"true\"] > .wl-opt-c { border-color: var(--accent-fill); background: var(--accent-fill); color: var(--on-accent); }",
    ".wl-opts { display: grid; gap: 8px; }",
    ".wl-opt { padding: 12px; }",
    ".wl-opt-t b { display: block; font-size: 16px; font-weight: 800; }",
    ".wl-opt-t span { display: block; margin-top: 2px; font-size: 15px; font-weight: 700; line-height: 1.35; color: var(--muted); }",
    ".wl-rows .optrow.col { gap: 8px; }",
    ".wl-rows .optrow > div:first-child { min-width: 0; }",
    ".wl-seg { width: 100%; box-sizing: border-box; }",
    ".wl-seg button { font-size: 15px; padding: 0 4px; }",
    ".wl-phone { display: grid; gap: 12px; padding-top: 12px; border-top: 1px solid var(--hair); }",
    ".wl-phone-b { width: 100%; height: 48px; justify-content: center; border-color: var(--accent-fill); }",
    ".wl-sum { margin: 0; }",
    ".acct .optrow .outline { flex: none; }",
    ".inv .field { height: 48px; font-size: 16px; color: var(--ink); }",
    ".inv .solid { width: 100%; }",
    ".inv-link { padding: 12px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--raise); font-size: 15px; font-weight: 700; word-break: break-all; -webkit-user-select: all; user-select: all; }",
    ".inv-acts { display: grid; grid-template-columns: 1fr auto; gap: 8px; }",
    ".inv-list { border-top: 1px solid var(--hair); }",
    ".inv-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; border-bottom: 1px solid var(--hair); }",
    ".inv-row b { display: block; font-size: 16px; font-weight: 800; }",
    ".inv-row span { display: block; font-size: 13px; font-weight: 700; color: var(--muted); }",
    ".inv-done { width: 100%; justify-content: center; }",
    "html.side-col:not(.duo) .sheet.inv { padding-right: calc(16px + var(--strip-w, 0px) / var(--z, 1)); }"
  ].join("\n");
  // added once the page has loaded, so they come after the app's own styles
  whenBody(function () { try { var gst = document.createElement("style"); gst.id = "welcome-css"; gst.textContent = GATE_CSS; document.head.appendChild(gst); } catch (e) {} });
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
  function gate(mode, msg) {
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
        run("Setting up…", post("/api/signup", { code: inviteCode, name: n, pass: a }), function (j) {
          if (j.ok && j.id) { signedIn(a, j.id, j.name, true); return ""; }
          return j.error || "Couldn't set that up just now. Try again.";
        });
      });
      links.appendChild(link("I already have a passcode", function () { gate("login"); }));
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

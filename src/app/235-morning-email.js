  // ---------- Settings: Morning email (3.55.0) ----------
  // Each person can get their own slate by email every morning, sent from DJ's Gmail by the server's minute job
  // (worker/morning-email.js). Everything is saved on the server through /api/morning-email with the passcode; the
  // address is kept encrypted there, never in the public data.
  var meInfo = { loaded: false, busy: false, p: null };
  function meTzName(tz) { try { var x = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(new Date()).filter(function (q) { return q.type === "timeZoneName"; })[0]; return x ? x.value : tz; } catch (e) { return tz; } }
  function meTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago"; } catch (e) { return "America/Chicago"; } }
  function meClock(t) { var h = Number(t.slice(0, 2)), m = t.slice(3); return (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM"); }
  // the email is drawn in this phone's theme and accent: its colors go along with every save and test
  function meLook() {
    var cs = getComputedStyle(document.documentElement), v = function (n) { return String(cs.getPropertyValue(n) || "").trim(); }, th = THEMES[state.look];
    return { bg: v("--bg"), card: v("--card"), raise: v("--raise"), line: v("--line"), hair: v("--hair"), ink: v("--ink"), muted: v("--muted"), dim: v("--dim"),
      head: v("--head"), accent: v("--accent"), fill: v("--accent-fill"), on: v("--on-accent"), live: v("--live"), dark: !th || th[1] !== "light" };
  }
  function meCall(body) {
    var pass = slatePass(); if (!pass) return Promise.reject(new Error("Sign in with your passcode first."));
    body.pass = pass;
    return fetch("/api/morning-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { error: "Couldn't reach Slate's server." }; }); })
      .then(function (j) { if (!j || j.error) throw new Error((j && j.error) || "Something went wrong."); return j; });
  }
  function meDraw() {
    var p = meInfo.p || { on: false, time: "07:00", lines: false, email: "", tz: meTz() }, sum = $("me-sum");
    $("me-on").setAttribute("aria-checked", p.on ? "true" : "false");
    $("me-lines").setAttribute("aria-checked", p.lines ? "true" : "false");
    if (document.activeElement !== $("me-email")) $("me-email").value = p.email || "";
    $("me-time").value = p.time || "07:00";
    $("me-tz").textContent = meTzName(p.tz || meTz());
    var t = "Every morning: today's games, where to watch, and last night's results.";
    if (!slatePass()) t = "Sign in with your passcode to use this.";
    else if (!meInfo.loaded) t = "Loading…";
    else if (p.on && !p.ready) t = "On. Emails start once DJ connects his Gmail.";
    else if (p.on && p.err) t = "On, but the last one didn't send: " + p.err;
    else if (p.on) t = "On: every day at " + meClock(p.time || "07:00") + (p.last === todayInHome() && p.sentAt ? ". Today's went out at " + new Date(p.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + "." : ". No email on days with no games and no results.");
    sum.textContent = t;
    ["me-on", "me-lines", "me-email", "me-time", "me-test"].forEach(function (id) { $(id).disabled = !slatePass() || !meInfo.loaded; });
    if (typeof setPagesDraw === "function" && $("view-settings")) setPagesDraw();  // the Morning email row on the Settings main page says on or off
  }
  function meSave(patch, okMsg) {
    if (meInfo.busy) return; meInfo.busy = true;
    patch.action = "save"; patch.tz = meTz(); patch.look = meLook();
    meCall(patch).then(function (j) { meInfo.busy = false; meInfo.p = j.prefs; meDraw(); if (okMsg) toast(okMsg); },
      function (e) { meInfo.busy = false; meDraw(); toast(e.message); });
  }
  function meLoad() {
    if (!slatePass()) { meDraw(); return; }
    meCall({ action: "get" }).then(function (j) { meInfo.loaded = true; meInfo.p = j.prefs; meDraw(); }, function () { meInfo.loaded = true; meDraw(); });
    if (state.isOwner) meCall({ action: "family" }).then(function (j) { meFamily(j.people || []); }, function () {});
  }
  // DJ only (3.67.2): turn the morning email on for Drew or Doug. It's saved in their own settings, so what they change in
  // their Settings wins from then on.
  function meFamily(list) {
    var box = $("me-fam"); if (!box) { box = el("div"); box.id = "me-fam"; $("me-set").appendChild(box); }
    box.textContent = ""; if (!list.length) return;
    var hd = el("div", "optrow col"); var hw = el("div"); hw.appendChild(el("b", null, "Family")); hw.appendChild(el("span", null, "Turn it on for someone else. It goes in their own Settings, so they can change it.")); hd.appendChild(hw); box.appendChild(hd);
    list.forEach(function (u) {
      var save = function (patch, msg) {
        patch.action = "save"; patch.for = u.id; if (!u.tz) patch.tz = "America/Chicago";
        meCall(patch).then(function (j) { var q = j.prefs || {}; u.on = q.on; u.email = q.email; u.time = q.time; u.tz = q.tz; draw(); if (msg) toast(msg); }, function (e) { draw(); toast(e.message); });
      };
      var row = el("div", "optrow"), tx = el("div"), nm = el("b", null, u.name), st = el("span"); tx.appendChild(nm); tx.appendChild(st); row.appendChild(tx);
      var sw = el("button", "switch"); sw.type = "button"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-label", "Morning email for " + u.name); sw.appendChild(el("span", "knob")); row.appendChild(sw);
      var er = el("div", "optrow col"), inp = el("input", "field"); inp.type = "email"; inp.setAttribute("inputmode", "email"); inp.setAttribute("autocapitalize", "off"); inp.spellcheck = false;
      inp.placeholder = u.name + "'s email"; inp.setAttribute("aria-label", u.name + "'s email address"); inp.style.cssText = "width:100%;box-sizing:border-box;margin-top:0"; er.appendChild(inp);
      var tr = el("div", "optrow"), tl = el("div"); tl.appendChild(el("b", null, "Arrives at")); tr.appendChild(tl);
      var sel = el("select", "sel"); sel.setAttribute("aria-label", u.name + "'s email time");
      for (var m = 4 * 60; m <= 12 * 60; m += 30) { var v = ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + m % 60).slice(-2), o = el("option", "", meClock(v)); o.value = v; sel.appendChild(o); }
      tr.appendChild(sel);
      function draw() {
        sw.setAttribute("aria-checked", u.on ? "true" : "false");
        if (document.activeElement !== inp) inp.value = u.email || "";
        sel.value = u.time || "06:00";
        st.textContent = u.on ? "On: every day at " + meClock(u.time || "06:00") + (u.tz ? ", " + meTzName(u.tz) : "") : "Off";
      }
      sw.addEventListener("click", function () {
        var on = sw.getAttribute("aria-checked") !== "true", em = inp.value.trim();
        if (on && !em) { toast("Add " + u.name + "'s email address first."); inp.focus(); return; }
        var patch = { on: on, time: sel.value }; if (em !== (u.email || "")) patch.email = em;
        save(patch, on ? "Morning email on for " + u.name : "Morning email off for " + u.name);
      });
      inp.addEventListener("change", function () { var em = inp.value.trim(); if (em !== (u.email || "")) save({ email: em }, em ? "Saved " + u.name + "'s email" : "Morning email off for " + u.name); });
      sel.addEventListener("change", function () { save({ time: sel.value }, u.name + "'s arrives at " + meClock(sel.value)); });
      box.appendChild(row); box.appendChild(er); box.appendChild(tr); draw();
    });
  }
  (function () {
    var sel = $("me-time"); if (!sel) return;
    for (var m = 4 * 60; m <= 12 * 60; m += 30) { var v = ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + m % 60).slice(-2), o = el("option", "", meClock(v)); o.value = v; sel.appendChild(o); }
    $("me-on").addEventListener("click", function () {
      var on = $("me-on").getAttribute("aria-checked") !== "true", em = $("me-email").value.trim();
      if (on && !em) { toast("Add your email address first."); $("me-email").focus(); return; }
      var patch = { on: on, time: $("me-time").value }; if (em !== ((meInfo.p || {}).email || "")) patch.email = em;
      meSave(patch, on ? "Morning email on" : "Morning email off");
    });
    $("me-lines").addEventListener("click", function () { meSave({ lines: $("me-lines").getAttribute("aria-checked") !== "true" }); });
    $("me-time").addEventListener("change", function () { meSave({ time: $("me-time").value }, "Arrives at " + meClock($("me-time").value)); });
    $("me-email").addEventListener("change", function () {
      var em = $("me-email").value.trim(); if (em === ((meInfo.p || {}).email || "")) return;
      meSave({ email: em }, em ? "Email saved" : "Morning email off");
    });
    $("me-test").addEventListener("click", function () {
      var b = $("me-test"); if (b.disabled) return;
      if (!((meInfo.p || {}).email)) { toast("Add your email address first."); $("me-email").focus(); return; }
      b.disabled = true; b.textContent = "Sending…";
      meCall({ action: "test", look: meLook() }).then(function () { b.textContent = "Send"; b.disabled = false; toast("On its way. It takes a minute or two while Claude writes yesterday's recaps."); },
        function (e) { b.textContent = "Send"; b.disabled = false; toast(e.message); });
    });
    // DJ's set-up link for someone else (3.62.1): #mail-for=<id>&email=<address>&at=06:00. It's kept for this tab until
    // a passcode is in (the log-in page may come first), then saved once on the server under that person's own settings.
    try {
      var mh = /[#&]mail-for=([a-z0-9-]{2,40})&email=([^&]+)&at=(\d\d:\d\d)/.exec(location.hash);
      if (mh) { sessionStorage.setItem("slate-mail-for", JSON.stringify({ id: mh[1], email: decodeURIComponent(mh[2]), at: mh[3] })); history.replaceState(null, "", location.pathname + location.search); }
    } catch (e) {}
    var mfTries = 0, mfT = setInterval(function () {
      var job = null; try { job = JSON.parse(sessionStorage.getItem("slate-mail-for") || "null"); } catch (e) {}
      if (!job || ++mfTries > 300) { clearInterval(mfT); return; }
      if (!slatePass()) return;
      clearInterval(mfT); try { sessionStorage.removeItem("slate-mail-for"); } catch (e) {}
      meCall({ action: "save", for: job.id, email: job.email, on: true, time: job.at, tz: "America/Chicago" })
        .then(function (j) { toast("Morning email is on for " + (j.prefs && j.prefs.email ? j.prefs.email : job.id) + " at " + meClock(job.at)); }, function (e) { toast(e.message); });
    }, 2000);
    // load when Settings opens
    var view = $("view-settings"), seen = false;
    var check = function () { if (view.hidden) { seen = false; return; } if (!seen) { seen = true; meLoad(); } };
    new MutationObserver(check).observe(view, { attributes: true, attributeFilter: ["hidden"] });
    meDraw(); setTimeout(check, 0);
  })();

  // ---------- notifications ----------
  function notifySummary() {
    var n = state.notify;
    if (!n.enabled) return "Off";
    var parts = [];
    if (n.brief.on) parts.push("Brief " + fmtHour(n.brief.hour));
    var r = []; if (n.reminders.lineup) r.push("my slate"); if (n.reminders.myTeams) r.push("my teams");
    if (r.length) parts.push("game alerts for " + r.join(" & "));
    if (n.quiet.on) parts.push("quiet " + fmtHour(n.quiet.start) + "–" + fmtHour(n.quiet.end));
    return parts.length ? parts.join(" · ") : "On, nothing selected";
  }
  // Alerts and email (3.175.0): the Settings row's line covers both the alerts and the morning email
  function alertsSummary() {
    var a = state.notifyLoaded ? notifySummary() : "Loading…";
    var mp = (typeof meInfo === "object" && meInfo.p) || null;
    return mp && mp.on ? a + " · email " + meClock(mp.time || "07:00") : a;
  }
  // the long lists fold away one level down; each folded row says what's picked
  var NT_OPEN = {};
  function ntFolds() {
    var n = state.notify, who = function (o) { var r = []; if (o && o.lineup) r.push("my slate"); if (o && o.myTeams) r.push("my teams"); return r; };
    var kinds = [["reminders", "starts"], ["close", "close finishes"], ["ot", "overtime"], ["finals", "finals"], ["goals", "goals"], ["lineups", "soccer lineups"], ["live", "hourly scores"]]
      .filter(function (k) { return who(n[k[0]]).length; }).map(function (k) { return k[1]; });
    var sum = {
      alerts: kinds.length ? kinds.join(", ").replace(/^./, function (c) { return c.toUpperCase(); }) + (n.upsets && n.upsets.on ? " · upset watch" : "") : n.upsets && n.upsets.on ? "Upset watch only" : "None",
      follow: [n.follow && n.follow.start && "game starting", n.follow && n.follow.final && "their final line"].filter(Boolean).join(", ").replace(/^./, function (c) { return c.toUpperCase(); }) || "Off",
      lock: who(n.liveAct).length ? who(n.liveAct).join(" & ").replace(/^./, function (c) { return c.toUpperCase(); }) : "Off",
      quiet: n.quiet.on ? fmtHour(n.quiet.start) + " to " + fmtHour(n.quiet.end) + (n.days.length === 7 ? ", every day" : n.days.length ? ", " + n.days.length + " days a week" : ", no days") : "Off" + (n.days.length < 7 ? " · " + n.days.length + " days a week" : "")
    };
    Array.prototype.forEach.call(document.querySelectorAll("#view-notify [data-fold]"), function (b) {
      var k = b.getAttribute("data-fold"), box = $("nt-f-" + k), s2 = $("nt-sum-" + k);
      if (s2) s2.textContent = sum[k] || "";
      if (box) box.hidden = !NT_OPEN[k]; b.setAttribute("aria-expanded", NT_OPEN[k] ? "true" : "false");
      if (!b.dataset.on) { b.dataset.on = "1"; b.addEventListener("click", function () { NT_OPEN[k] = !NT_OPEN[k]; ntFolds(); }); }
    });
  }
  // the morning email now lives on this page: load it when the page opens (it also loads with Settings)
  (function () {
    var v = $("view-notify"), seen = false; if (!v) return;
    new MutationObserver(function () { if (v.hidden) { seen = false; NT_OPEN = {}; return; } if (!seen) { seen = true; if (typeof meLoad === "function") meLoad(); } }).observe(v, { attributes: true, attributeFilter: ["hidden"] });
  })();
  function fillHours(sel, from, to) {
    if (sel.options.length) return;
    for (var h = from; h <= to; h++) { var o = document.createElement("option"); o.value = String(h); o.textContent = fmtHour(h); sel.appendChild(o); }
  }
  function renderNotify() {
    $("open-notify").hidden = !state.isOwner;
    $("nt-summary").textContent = alertsSummary();
    ntFolds();
    fillHours($("nt-brief-hour"), 7, 22); fillHours($("nt-quiet-start"), 0, 23); fillHours($("nt-quiet-end"), 0, 23);
    Array.prototype.forEach.call(document.querySelectorAll("#view-notify .seg[data-pref]"), function (sg) {
      var v = !!getPref(sg.getAttribute("data-pref"));
      Array.prototype.forEach.call(sg.children, function (b) { b.setAttribute("aria-pressed", (b.getAttribute("data-v") === "on") === v ? "true" : "false"); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#view-notify select[data-pref]"), function (sl) { sl.value = String(getPref(sl.getAttribute("data-pref"))); });
    Array.prototype.forEach.call(document.querySelectorAll("#view-notify [data-chip]"), function (b) { b.setAttribute("aria-pressed", getPref(b.getAttribute("data-chip")) ? "true" : "false"); });
    var dc = $("nt-days"); dc.textContent = "";
    ["S", "M", "T", "W", "T", "F", "S"].forEach(function (lbl, i) {
      var on = state.notify.days.indexOf(i) !== -1;
      var b = el("button", "daychip", lbl); b.type = "button";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]);
      b.addEventListener("click", function () {
        var d = state.notify.days.slice(), k = d.indexOf(i);
        if (k === -1) d.push(i); else d.splice(k, 1);
        state.notify.days = d.sort(); saveNotify(); render();
      });
      dc.appendChild(b);
    });
    $("nt-body").classList.toggle("off", !state.notify.enabled); $("nt-body2").classList.toggle("off", !state.notify.enabled);
    $("nt-quiet-row").hidden = !state.notify.quiet.on;
    var fw = (state.players || []).map(function (x) { return x.name; }).filter(Boolean);
    $("nt-follow-who").textContent = fw.length ? "You follow " + (fw.length > 4 ? fw.slice(0, 4).join(", ") + " and " + (fw.length - 4) + " more" : fw.length > 1 ? fw.slice(0, -1).join(", ") + " and " + fw[fw.length - 1] : fw[0]) + ". Follow or stop following on a player's page (tap their picture)."
      : "Follow a player from their page (tap their picture anywhere in Slate) to get these.";
    $("nt-spoiler").textContent = state.showScores ? "Score alerts include the score. Hide scores in Settings > My slate to get spoiler-free alerts." : "Spoiler-free: scores are hidden in Settings > My slate, so alerts only say when a game ends.";
    $("nt-state").textContent = state.notify.enabled ? "Alerts arrive as notifications." : "You won't get any game notifications.";
    pushState();
  }
  // ---- phone alerts: this phone's push subscription, saved to prefs/push (the server's minute job sends the alerts) ----
  // a tapped alert opens its game: sw.js tells an open Slate, or opens a new one at ?game=<id>
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", function (e) {
    var d = e.data || {}; if (d.slate === "open-game" && d.id && window.SlateApp) window.SlateApp.openGame(String(d.id));
  });
  (function () {
    var m = /[?&]game=([\w.-]{1,40})(?:&|$)/.exec(location.search); if (!m) return;
    try { history.replaceState(null, "", location.pathname + location.search.replace(/[?&]game=[^&]*/, "").replace(/^&/, "?") + location.hash); } catch (e) {}
    setTimeout(function () { if (window.SlateApp) window.SlateApp.openGame(m[1]); }, 0);  // after the rest of the page's code has loaded
  })();
  var PUSH_KEY = "BGOiSg4w33W5Lui867BMvNq2fDnRLjdoOADhr5Vx_C2gOaibYV8joMK8K6ibx9o8sZFByk_K107NupNiJNORWNY";
  var pushInfo = { checked: false, on: false, busy: false };
  function pushOk() { return isNativeApp() || ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window); }
  function isNativeApp() { return !!(window.SLATE_NATIVE && window.SLATE_NATIVE.platform === "ios"); }
  function pushKeyBytes() { var b = PUSH_KEY.replace(/-/g, "+").replace(/_/g, "/"); b += "===".slice((b.length + 3) % 4); var r = atob(b), u = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; }
  function pushState() {
    var st = $("nt-phone-state"), bt = $("nt-phone-btn"); if (!st) return;
    if (!pushOk()) { st.textContent = "Open Slate from your Home Screen icon to turn on alerts for this phone."; bt.hidden = true; return; }
    if (isNativeApp()) {  // the app: Apple's push service, asked through the shell
      if (!pushInfo.checked && !pushInfo.busy) { pushInfo.busy = true; nativePost({ t: "push-status" }); }
      if (pushInfo.native === "denied") { st.textContent = "Notifications are blocked for Slate. Turn them on in iPhone Settings > Notifications > Slate."; bt.hidden = true; return; }
      st.textContent = pushInfo.on ? "Alerts are on for this phone." : "Alerts aren't on for this phone yet.";
      bt.hidden = pushInfo.on || !pushInfo.checked; bt.textContent = pushInfo.busy ? "Turning on…" : "Turn on"; return;
    }
    if (!pushInfo.checked && !pushInfo.busy) {
      pushInfo.busy = true;
      navigator.serviceWorker.ready.then(function (r) { return r.pushManager.getSubscription(); }).then(function (sub) {
        pushInfo.on = !!sub && Notification.permission === "granted"; pushInfo.checked = true; pushInfo.busy = false;
        if (sub && pushInfo.on) pushSave(sub, true); pushState();
      }, function () { pushInfo.checked = true; pushInfo.busy = false; pushState(); });
    }
    if (Notification.permission === "denied") { st.textContent = "Notifications are blocked for Slate. Turn them on in iPhone Settings > Notifications > Slate."; bt.hidden = true; return; }
    st.textContent = pushInfo.on ? "Alerts are on for this phone." : "Alerts aren't on for this phone yet.";
    bt.hidden = pushInfo.on || !pushInfo.checked; bt.textContent = pushInfo.busy ? "Turning on…" : "Turn on";
  }
  function pushSave(sub, quiet) {
    var j = sub.toJSON ? sub.toJSON() : sub;
    return db.doc("prefs/push").get().then(function (sn) {
      var subs = ((sn.exists ? sn.data() : {}) || {}).subs || [];
      if (subs.some(function (x) { return x.endpoint === j.endpoint; })) return;
      subs = subs.filter(function (x) { return x && x.endpoint; }).slice(-3);
      subs.push(j.apns ? { endpoint: j.endpoint, apns: j.apns, env: j.env, at: new Date().toISOString(), welcomed: false } : { endpoint: j.endpoint, keys: j.keys, at: new Date().toISOString(), welcomed: false });
      return db.doc("prefs/push").set({ subs: subs });
    }).then(function () { if (!quiet) toast("Alerts are on. A test alert arrives within 10 minutes."); }, function () { if (!quiet) toast("Couldn't save this phone. Try again."); });
  }
  function pushTurnOn() {
    if (!pushOk() || pushInfo.busy) return;
    if (isNativeApp()) { pushInfo.busy = true; pushInfo.asked = true; pushState(); nativePost({ t: "push-request" }); return; }
    pushInfo.busy = true; pushState();
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") throw new Error("denied");
      return navigator.serviceWorker.ready.then(function (r) { return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushKeyBytes() }); }); });
    }).then(function (sub) { pushInfo.on = true; pushInfo.busy = false; pushState(); return pushSave(sub, false); },
      function () { pushInfo.busy = false; pushState(); toast("Notifications weren't allowed."); });
  }


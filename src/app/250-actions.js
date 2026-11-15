  // ---------- actions ----------
  // iOS can leave a fixed element where it was when a page swaps for a shorter one and the scroll jumps
  // (All games → back to the slate): take the dock out and put it back so it re-pins to the screen corner,
  // and keep it on the visible screen if the visible area and the layout disagree
  // where the menu must sit: the bottom right of what's actually visible. iOS 26 sometimes slides the visible area
  // (visualViewport) away from where it pins "fixed" items while scrolling, so follow the visible area itself.
  function dockShift() {
    var vv = window.visualViewport;
    var g = typeof SHORT_GAP === "number" && SHORT_GAP ? Math.max(0, SHORT_BEST - window.innerHeight) : 0;  // the stretched short screen
    if (g) return "translateY(" + g + "px)";
    if (isDuo) return "";
    if (!vv || document.hidden || Math.abs(vv.scale - 1) > 0.02) return "";
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY < 0 || window.scrollY > maxY + 1) return "";  // a rubber-band pull past the top or bottom isn't a toolbar or keyboard
    var t = vv.offsetTop + vv.height - window.innerHeight;  // >0: visible area slid down; <0: keyboard covers the bottom
    // right after a fold, unfold or turn, Safari's two size readings disagree for a moment; trusting them then
    // parked the menu in the middle of the screen. So: no shift while the screen is settling, and only lift the
    // menu (a negative shift) when the keyboard is really up, i.e. a text box has focus.
    if (Date.now() - sizeChangedAt < 1500) return "";
    if (t < 0) { var ae = document.activeElement; if (!ae || !/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return ""; }
    return Math.abs(t) >= 1 && Math.abs(t) < 400 ? "translateY(" + Math.round(t) + "px)" : "";
  }
  var sizeChangedAt = 0, sizeW = window.innerWidth, sizeH = window.innerHeight;
  function sizeSettle() {
    if (Math.abs(window.innerWidth - sizeW) < 2 && Math.abs(window.innerHeight - sizeH) < 120) return;
    sizeW = window.innerWidth; sizeH = window.innerHeight; sizeChangedAt = Date.now();
    var d = document.querySelector("nav.dock"); if (d) d.style.transform = "";
    [300, 900, 1700, 3000].forEach(function (ms) { setTimeout(repinDock, ms); });
  }
  window.addEventListener("resize", sizeSettle); window.addEventListener("orientationchange", sizeSettle);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener("change", sizeSettle);
  var dockRaf = 0;
  function followDock() { if (dockRaf) return; dockRaf = requestAnimationFrame(function () { dockRaf = 0; var d = document.querySelector("nav.dock"); if (d) { var t = dockShift(); if (d.style.transform !== t) d.style.transform = t; } }); }
  if (window.visualViewport) { window.visualViewport.addEventListener("scroll", followDock); window.visualViewport.addEventListener("resize", followDock); }
  window.addEventListener("scroll", followDock, { passive: true });
  function repinDock() {
    var d = document.querySelector("nav.dock"); if (!d) return;
    requestAnimationFrame(function () {
      d.style.display = "none"; void d.offsetHeight; d.style.display = "";
      d.style.transform = dockShift();
    });
  }
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", repinDock); }
  // watchdog: if the menu button has drifted from the bottom of the screen (it should never scroll with the page),
  // put it back, and note what the screen reported once so the cause can be found
  var dockNoted = false, dockChk = 0;
  window.addEventListener("scroll", function () {
    if (Date.now() - dockChk < 400) return; dockChk = Date.now();
    var d = document.querySelector("nav.dock"); if (!d || isDuo) return;
    var r = d.getBoundingClientRect(), vv = window.visualViewport, vh = vv ? vv.height + vv.offsetTop : window.innerHeight;
    if (r.height && (r.bottom > vh + 2 || vh - r.bottom > 90)) {
      if (!dockNoted && db) { dockNoted = true; try { db.doc("prefs/dockdiag").set({ at: new Date().toISOString(), ua: navigator.userAgent.slice(0, 120), ih: window.innerHeight, iw: window.innerWidth, vvh: vv ? vv.height : 0, vvt: vv ? vv.offsetTop : 0, vvs: vv ? vv.scale : 0, sy: window.scrollY, bottom: Math.round(r.bottom), tf: d.style.transform || "", cls: document.documentElement.className, ver: SLATE_VERSION }).then(null, function () {}); } catch (e) {} }
      d.style.position = "absolute"; void d.offsetHeight; d.style.position = ""; repinDock();
    }
  }, { passive: true });
  window.addEventListener("pageshow", repinDock);
  document.addEventListener("visibilitychange", function () {
    var d = document.querySelector("nav.dock"); if (!d) return;
    d.style.display = ""; d.style.transform = "";   // start clean every time the app comes back
    if (!document.hidden) { repinDock(); setTimeout(repinDock, 400); }
  });
  var repinT = null; window.addEventListener("scroll", function () { clearTimeout(repinT); repinT = setTimeout(repinDock, 120); }, { passive: true });
  function setView(v) { if (v === "best" && state.view !== "best") rk.picked = false; state.backTo = null; if (isDuo && v === "lineup") v = "games"; if (v === "rules" && state.view !== "rules") state.rulesMain = null; state.view = v; state.menuOpen = false; render(); repinDock(); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0);  topAgain(v); }
  // a newly opened page starts at the top. iPhone Safari sometimes keeps the old page's scroll (toolbar animation,
  // a late redraw), so check again over the next half second, unless you've started scrolling it yourself
  var viewTok = 0;
  function topAgain(v) {
    var tok = ++viewTok, t0 = Date.now(); if (v === "lineup") return;
    [16, 120, 300, 600].forEach(function (ms) { setTimeout(function () {
      if (tok !== viewTok || lastTouch > t0 || state.view !== v) return;
      if (isDuo) { var pr = $("pane-r"); if (pr && pr.scrollTop) pr.scrollTop = 0; } else if (window.scrollY) window.scrollTo(0, 0);
    }, ms); });
  }
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
  document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  var slideDir = "";
  // long titles ("Yesterday's Slate") shrink to stay on one line
  function fitTitle(t) {
    if (!t) return; t.style.fontSize = "";
    var go = function () { var fs = parseFloat(getComputedStyle(t).fontSize) || 28, n = 0; while (t.scrollWidth > t.clientWidth + 1 && fs > 17 && n++ < 14) { fs -= 1; t.style.fontSize = fs + "px"; } };
    go(); requestAnimationFrame(go);
  }
  // swipes move only what changes: pickers, day switchers, Live buttons and the ticker stay put
  var SW_STATIC = ".mm-strip, .mm-when, .rk-strip, .rk-sub, .rk-day, .lo-row, .ticker, .strip, .substrip, .tb-pills";
  function slideKids(body) { return body ? Array.prototype.filter.call(body.children, function (c) { return !(c.matches && c.matches(SW_STATIC)); }) : []; }
  function slideIn(body, dir) {
    if (!body || REDUCED) return;
    slideKids(body).forEach(function (c) { c.classList.remove("sl-l", "sl-r"); void c.offsetWidth; c.classList.add(dir === "l" ? "sl-l" : "sl-r"); });
  }
  function setDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso === state.date) { slideDir = ""; return; }
    var dir = slideDir || (iso > state.date ? "l" : "r"); slideDir = "";
    state.date = iso; state.openId = null; if (db) subscribe(); else render();
    if (isDuo) $("pane-l").scrollTop = 0; else if (state.view === "lineup") window.scrollTo(0, 0);
    slideIn($("lineup-body"), dir);
  }
  function isPastDay() { return state.date < todayInHome(); }
  function toggle(id) {
    if (!state.lineupLoaded) { toast("Loading your slate…"); return; }
    if (!inLineup(id) && isPastDay()) { toast("That day is over, so its slate is closed"); return; }
    var L = state.lineup, before = { added: L.added.slice(), removed: L.removed.slice() };
    function undo() { L.added = before.added; L.removed = before.removed; computeSlate(); render(); saveLineup(); }
    var gx = games().filter(function (x) { return x.id === id; })[0];
    if (inLineup(id)) {
      L.added = L.added.filter(function (x) { return x !== id; });
      if (state.ruleMatch[id] && L.removed.indexOf(id) === -1) { L.removed.push(id); logAct("remove", gx); }
      computeSlate(); toast("Removed from slate", undo);
    } else {
      L.removed = L.removed.filter(function (x) { return x !== id; });
      computeSlate();
      if (!inLineup(id)) { L.added.push(id); computeSlate(); logAct("add", gx); }
      toast("Added to slate");
    }
    render(); saveLineup();
  }
  function removeGame(g) {
    if (g.custom) {
      var before = (state.lineup.custom || []).slice();
      state.lineup.custom = before.filter(function (c) { return c.id !== g.id; });
      toast("Removed from slate", function () { state.lineup.custom = before; render(); saveLineup(); });
      render(); saveLineup();
    } else toggle(g.id);
  }
  function toggleFav(name, lg) {
    var before = state.teams.slice(), col = !!COL_SPORT[lg];
    if (isFav(name, lg)) {
      var out = [];
      state.teams.forEach(function (t) {
        if (!teamMatch(name, t, lg)) { out.push(t); return; }
        var p = parseTeam(t);
        // an all-sports college pick loses just this sport and keeps the others
        if (col && !p.lg) COL_KEYS.forEach(function (k) { if (k !== lg) out.push(colEntry(p.name, k)); });
      });
      state.teams = out;
      toast(col ? "Removed " + name + " " + COL_SPORT[lg].toLowerCase() : "Removed from my teams", function () { state.teams = before; saveSettings(); render(); });
    } else { state.teams.push(col ? colEntry(name, lg) : name); toast("★ Added " + (col ? name + " " + COL_SPORT[lg].toLowerCase() : "to my teams")); }
    saveSettings(); render();
  }
  function lineupText() {
    var lines = [(state.date === todayInHome() ? "Tonight" : fmtDate(state.date, { weekday: "short", month: "short", day: "numeric" })) + "'s slate:"];
    lineupGames().forEach(function (g) {
      function nm(s) { return (g[s + "Rank"] ? "#" + g[s + "Rank"] + " " : "") + g[s]; }
      lines.push(timeText(g.start) + " · " + (g.custom ? g.home : nm(sideOrder(g)[0]) + sep(g) + nm(sideOrder(g)[1])) + ((g.tv && g.tv.length) ? " · " + g.tv.join(" / ") : ""));
    });
    return lines.join("\n");
  }
  function copyLineup() {
    if (!lineupGames().length) { toast("Your slate is empty"); return; }
    var text = lineupText();
    function fallback() { $("copybox").value = text; $("sheet-copy").classList.add("open"); $("copybox").select(); }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast("Slate copied"); }, fallback); else fallback(); } catch (e) { fallback(); }
  }
  // Rebuild the slate from the rules alone: hand-made adds and removals are cleared (Undo restores them).
  function buildSlate() {
    if (!state.lineupLoaded) { toast("Loading your slate…"); return; }
    var L = state.lineup, before = { added: L.added.slice(), removed: L.removed.slice() };
    L.added = []; L.removed = []; state.openId = null;
    computeSlate(); saveLineup();
    if (!isDuo) setView("lineup"); else render();
    var n = lineupGames().length;
    toast("Slate reset to your rules", function () { L.added = before.added; L.removed = before.removed; computeSlate(); render(); saveLineup(); toast("Edits restored"); }, 7000);
  }
  function slateEdits() {
    var L = state.lineup, set = state.ruleMatch || {}, map = {};
    games().forEach(function (g) { map[g.id] = true; });
    var added = (L.added || []).filter(function (id) { return map[id] && !set[id]; }).length, removed = (L.removed || []).filter(function (id) { return set[id]; }).length;
    return { added: added, removed: removed, any: added + removed > 0 };
  }
  function editsText(e) {
    var p = [];
    if (e.added) p.push(e.added + (e.added === 1 ? " game" : " games") + " added");
    if (e.removed) p.push(e.removed + " removed");
    return "You've edited this slate: " + p.join(", ") + ".";
  }
  function resetButton() {
    var b = el("button", "reset"); b.type = "button";
    var NS = "http://www.w3.org/2000/svg", sv = document.createElementNS(NS, "svg"), pa = document.createElementNS(NS, "path");
    sv.setAttribute("viewBox", "0 0 24 24"); sv.setAttribute("fill", "none"); sv.setAttribute("stroke", "currentColor"); sv.setAttribute("stroke-width", "2.2"); sv.setAttribute("stroke-linecap", "round"); sv.setAttribute("stroke-linejoin", "round"); sv.setAttribute("aria-hidden", "true");
    pa.setAttribute("d", "M4 5v5h5M4.6 14a8 8 0 1 0 1.9-8.2L4 10"); sv.appendChild(pa); b.appendChild(sv);
    b.appendChild(document.createTextNode("Back to default slate"));
    b.addEventListener("click", buildSlate); return b;
  }
  function clearLineup() {
    var L = state.lineup, before = { added: L.added.slice(), removed: L.removed.slice(), custom: (L.custom || []).slice() };
    state.slateIds.forEach(function (id) { if (state.ruleMatch[id] && L.removed.indexOf(id) === -1) L.removed.push(id); });
    L.added = []; L.custom = [];
    toast("Slate cleared", function () { L.added = before.added; L.removed = before.removed; L.custom = before.custom; computeSlate(); render(); saveLineup(); });
    computeSlate(); render(); saveLineup();
  }


  // ---------- two panes on the unfolded Duo (3.80.0, DJ Nov 17, 2026) ----------
  // Open and sideways, the screen is split at the fold into two panes. Each pane is this same page in a frame
  // (?pane=a / ?pane=b), so each side has its own page, Back, menu, scroll and live updates, and any page works on
  // either side: two Live feeds at once, the slate beside Box Office, and so on. The copy of the page around them
  // (the "host") waits behind, laid out like the folded phone, and comes back when the phone is folded.
  // One menu (DJ, Nov 17): the menu and Back always work the right side, and a game, Live feed or team tapped on the
  // left opens on the right; the left side stays put. The grip on the fold: drag it either way (or tap it) and the
  // two sides swap places. Drag it right for the other way round. Each side's page is remembered while the
  // app is open, so a quick fold and unfold puts both back.
  var PN = { on: false, el: null, frames: {}, left: "a", drag: null, routes: {} };
  var PN_KEY = "slate-panes";
  var PN_PAGES = [["lineup", "Tonight's Slate"], ["games", "All games"], ["moments", "Box Office"], ["tv", "On TV"], ["news", "News"], ["teams", "Teams"], ["settings", "Settings"]];
  // the settings both sides share: when one side saves, the other side (and the host) take the same values,
  // so neither one later saves an old copy over the change
  var PN_SET_KEYS = ["teams", "look", "accent", "textSize", "textSizeWide", "device", "navPos", "watchVia", "foldNudge", "rules", "tickerLeague", "showScores", "hiddenLeagues", "gamesOrder", "players", "teamOrder", "pvStyle", "slateSort", "slateLgOrder", "slateFold", "walRules", "newsletters", "notify"];
  function panesOn() { return PN.on; }
  function panesOK() {
    if (PANE || /[?&]panes=off\b/.test(location.search)) return false;
    if (document.getElementById("gate") || document.getElementById("wl")) return false;
    try { if (localStorage.getItem("slate-welcome")) return false; return !!(localStorage.getItem("slate-pass") || localStorage.getItem("slate-view-only")); } catch (e) { return false; }
  }
  function pnOther(id) { return id === "a" ? "b" : "a"; }
  function pnWin(id) { var f = PN.frames[id]; try { return f && f.contentWindow && f.contentWindow.SlateApp ? f.contentWindow : null; } catch (e) { return null; } }
  function pnSave() { try { sessionStorage.setItem(PN_KEY, JSON.stringify({ left: PN.left, routes: PN.routes, lock: !!PN.lock })); } catch (e) {} }
  function pnLoad() { try { return JSON.parse(sessionStorage.getItem(PN_KEY) || "null") || {}; } catch (e) { return {}; } }

  // ---- the host: builds the two frames and the grip ----
  function enterPanes() {
    if (PN.on) return;
    var sv = pnLoad(); PN.on = true; PN.lock = !!sv.lock;
    PN.left = sv.left === "b" ? "b" : "a";
    PN.routes = sv.routes && typeof sv.routes === "object" ? sv.routes : {};
    if (!PN.routes[PN.left]) PN.routes[PN.left] = "lineup";
    if (!PN.routes[pnOther(PN.left)]) PN.routes[pnOther(PN.left)] = "games";
    state.menuOpen = false;
    document.documentElement.classList.add("panes");
    var box = el("div", "pn"); box.id = "panes";
    ["a", "b"].forEach(function (id) {
      var f = document.createElement("iframe"); f.className = "pn-frame"; f.id = "pn-" + id;
      f.src = location.pathname + "?pane=" + id + "#go=" + encodeURIComponent(PN.routes[id] || "lineup");
      f.addEventListener("load", function () { pnMark(); setTimeout(pnMark, 500); });
      PN.frames[id] = f; box.appendChild(f);
    });
    var hinge = el("div", "pn-hinge");
    var grip = el("button", "pn-grip"); grip.type = "button";
    grip.setAttribute("aria-label", "Swap the two sides");
    grip.appendChild(el("i"));
    // the lock (hold the bar): both sides work on their own
    var lk = document.createElementNS("http://www.w3.org/2000/svg", "svg"); lk.setAttribute("viewBox", "0 0 24 24"); lk.setAttribute("class", "pn-lock"); lk.setAttribute("aria-hidden", "true");
    lk.innerHTML = '<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';
    grip.appendChild(lk);
    hinge.appendChild(el("div", "pn-tip"));
    hinge.appendChild(grip); box.appendChild(hinge);
    box.appendChild(el("div", "pn-shield"));
    document.body.appendChild(box); PN.el = box;
    pnPlace(); pnGrip(grip); if (PN.lock) box.classList.add("pn-locked");
    if (typeof nativeSync === "function") setTimeout(nativeSync, 0);
  }
  function exitPanes() {
    if (!PN.on) return;
    PN.on = false; PN.drag = null; pnSave();
    if (PN.el) PN.el.remove(); PN.el = null; PN.frames = {};
    document.documentElement.classList.remove("panes");
    // folding the phone always lands on the slate
    state.view = "lineup"; state.menuOpen = false; state.backTo = null; window.scrollTo(0, 0);
  }
  function pnPlace() {
    if (!PN.on) return;
    ["a", "b"].forEach(function (id) {
      var f = PN.frames[id], left = PN.left === id;
      f.style.gridColumn = left ? "1" : "3";
      f.title = left ? "Left side" : "Right side";
    });
    pnMark();
  }
  // DJ (Nov 17): one menu. The menu and Back (the app's own capsule, or the right side's buttons in a browser) always
  // work the right side; the left side keeps no menu or Back of its own and stays put until a page is slid over.
  function pnRight() { return pnOther(PN.left); }
  function pnMark() {
    if (!PN.on) return;
    var nm = !!(NATIVE && (NATIVE.float || NATIVE.strip));
    ["a", "b"].forEach(function (id) {
      var f = PN.frames[id], d; try { d = f.contentDocument && f.contentDocument.documentElement; } catch (e) { d = null; }
      if (!d) return;
      var left = PN.left === id;
      // locked: the left side keeps its own menu and Back and opens things on its own side
      d.classList.toggle("pn-left", left && !PN.lock); d.classList.toggle("pn-right", !left);
      // the app draws the menu capsule over the right side: that side hides its own, like the app's floating menu does
      if (!left && nm) d.setAttribute("data-float", ""); else d.removeAttribute("data-float");
      var w = pnWin(id); if (left && w && w.SlateApp.paneMenu) w.SlateApp.paneMenu(false);
    });
  }
  // the grip on the fold: drag a page across, or tap to bring the right page left
  function pnGrip(grip) {
    function frames() { var L = PN.frames[PN.left], R = PN.frames[pnOther(PN.left)]; return { L: L, R: R, span: R.getBoundingClientRect().left - L.getBoundingClientRect().left }; }
    function reset(anim) {
      var fs = frames();
      [fs.L, fs.R].forEach(function (f) { f.style.transition = anim && !REDUCED ? "transform .2s ease, opacity .2s ease" : "none"; f.style.transform = ""; f.classList.remove("pn-moving", "pn-dim"); });
      PN.el.classList.remove("pn-dragging");
    }
    grip.addEventListener("pointerdown", function (e) {
      if (!PN.on || PN.drag) return;
      PN.drag = { x: e.clientX, dx: 0, moved: false, id: e.pointerId, held: false };
      var d0 = PN.drag;
      d0.t = setTimeout(function () { if (PN.drag === d0 && !d0.moved) { d0.held = true; pnLock(!PN.lock); } }, 550);
      try { grip.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    });
    // DJ (Nov 17): no dragging, the bar only takes a tap (swap) or a hold (lock). A finger that wanders off just cancels.
    grip.addEventListener("pointermove", function (e) {
      var d = PN.drag; if (!d || e.pointerId !== d.id || d.held) return;
      if (Math.abs(e.clientX - d.x) > 24) d.moved = true;
    });
    // holding the bar must not select text, show a callout or the iPhone's magnifier
    grip.addEventListener("touchstart", function (e) { e.preventDefault(); }, { passive: false });
    ["contextmenu", "selectstart", "dragstart"].forEach(function (t) { PN.el.addEventListener(t, function (e) { e.preventDefault(); }); });
    function end(e, cancel) {
      var d = PN.drag; if (!d || e.pointerId !== d.id) return;
      PN.drag = null;
      var fs = frames();
      if (cancel) { reset(true); return; }
      clearTimeout(d.t);
      if (d.held) { reset(false); return; }
      reset(false); if (!d.moved) pnMove(-1);
    }
    grip.addEventListener("pointerup", function (e) { end(e, false); });
    grip.addEventListener("pointercancel", function (e) { end(e, true); });
    grip.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); pnMove(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); pnMove(-1); } });
    grip.addEventListener("click", function (e) { if (e.detail === 0) pnMove(-1); });  // keyboard / VoiceOver activation
  }
  // DJ (Nov 17): hold the bar to lock or unlock. Locked, the two sides are fully separate: each has its own menu and
  // Back (the app's menu still works the right side), and a game or Live feed tapped on the left opens on the left.
  function pnLock(on) {
    PN.lock = !!on; pnSave(); pnMark();
    PN.el.classList.toggle("pn-locked", PN.lock);
    var tip = PN.el.querySelector(".pn-tip");
    if (tip) { tip.textContent = PN.lock ? "Sides locked: each works on its own" : "Unlocked: the left opens things on the right"; tip.classList.add("on"); clearTimeout(tip._t); tip._t = setTimeout(function () { tip.classList.remove("on"); }, 2200); }
    var g = PN.el.querySelector(".pn-grip"); if (g) g.setAttribute("aria-label", "Swap the two sides" + (PN.lock ? ". Sides locked: hold to unlock" : ". Hold to lock the sides apart"));
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
  }
  // DJ (Nov 17): the grip swaps the two sides: the right page goes left and the left page goes right (no picker).
  // The menu then sets the new right side.
  function pnMove(dir) {
    if (!PN.on) return;
    var L = PN.frames[PN.left], R = PN.frames[pnOther(PN.left)], span = R.getBoundingClientRect().left - L.getBoundingClientRect().left;
    var mover = dir < 0 ? R : L, stay = mover === R ? L : R;
    mover.classList.add("pn-moving");
    var fin = function () {
      [L, R].forEach(function (f) { f.style.transition = "none"; f.style.transform = ""; f.classList.remove("pn-moving", "pn-dim"); });
      PN.el.classList.remove("pn-dragging");
      PN.left = pnOther(PN.left);
      pnPlace(); pnSave();
      if (typeof nativeSync === "function") nativeSync();
    };
    if (REDUCED) { fin(); return; }
    [mover, stay].forEach(function (f) { f.style.transition = "transform .22s ease"; });
    void mover.offsetWidth;
    mover.style.transform = "translateX(" + (mover === R ? -span : span) + "px)";
    stay.style.transform = "translateX(" + (stay === R ? -span : span) + "px)";
    setTimeout(fin, 230);
  }
  // what the active side reports to the iPhone app's strip (its Back and menu work that side)
  function paneSyncMsg() {
    var w = pnWin(pnRight()); if (!w || !w.SlateApp.paneState) return null;
    try { var m = JSON.parse(w.SlateApp.paneState()); m.duo = true; return m; } catch (e) { return null; }
  }
  window.slatePaneSync = function (id) {
    if (!PN.on) return;
    var w = pnWin(id);
    if (w && w.SlateApp.paneRoute) { var r = w.SlateApp.paneRoute(); if (r !== PN.routes[id]) { PN.routes[id] = r; pnSave(); } }
    pnMark();
    if (id === pnRight() && typeof nativeSync === "function") nativeSync();
  };
  // the left side opened a game, Live feed or team from its list: it opens on the right side instead
  window.slatePaneOpen = function (route) {
    var w = PN.on ? pnWin(pnRight()) : null; if (w && w.SlateApp.paneGo) w.SlateApp.paneGo(route);
  };
  window.slatePaneNudge = function (n) { state.foldNudge = Number(n) || 0; applyLayout(true); };
  // one side saved its settings: the other side and this copy take the same values
  window.slatePaneSaved = function (id, json) {
    pnTakeSettings(json);
    var w = pnWin(pnOther(id)); if (w && w.SlateApp.paneSettings) w.SlateApp.paneSettings(json);
  };
  function pnTakeSettings(json) {
    var d; try { d = JSON.parse(json); } catch (e) { return; }
    PN_SET_KEYS.forEach(function (k) { if (k in d) state[k] = d[k]; });
    applyLook();
  }
  // the iPhone app's menu and Back reach the right side
  ["go", "today", "back", "openGame", "day", "toggleMenu", "watch"].forEach(function (k) {
    var f0 = window.SlateApp[k];
    window.SlateApp[k] = function () {
      var w = PN.on ? pnWin(pnRight()) : null;
      if (w) return w.SlateApp[k].apply(w.SlateApp, arguments);
      return f0.apply(window.SlateApp, arguments);
    };
  });
  // the app's floating menu or side-column menu turning on or off: the right side hides or shows its own
  ["setFloat", "setStrip"].forEach(function (k) {
    var f0 = window.SlateApp[k];
    window.SlateApp[k] = function () { var r = f0.apply(window.SlateApp, arguments); pnMark(); return r; };
  });
  ["liveShowing", "liveGone"].forEach(function (k) {
    var f0 = window.SlateApp[k];
    window.SlateApp[k] = function () {
      var r = f0.apply(window.SlateApp, arguments), args = arguments;
      if (PN.on) ["a", "b"].forEach(function (id) { var w = pnWin(id); if (w && w.SlateApp[k]) try { w.SlateApp[k].apply(w.SlateApp, args); } catch (e) {} });
      return r;
    };
  });
  // signing in or closing the welcome happens after the layout was chosen: switch to the two panes then
  if (!PANE) setInterval(function () { if (!PN.on && isDuo && panesOK()) applyLayout(true); }, 1500);
  // the host's own page waits behind the panes: don't spend the phone's time drawing it
  var pnRender0 = render;
  render = function () { if (PN.on) return; pnRender0(); };

  // ---- a pane: report its page and follow the other side's settings ----
  if (PANE) {
    document.documentElement.classList.add("in-pane");
    var pnRoute = function () {
      var v = state.view;
      if (v === "feed" && state.feedId) return "feed:" + state.feedId;
      if (v === "game" && state.gameId) return "game:" + state.gameId;
      if (v === "best" || PN_PAGES.some(function (p) { return p[0] === v; })) return v;
      return "lineup";
    };
    window.SlateApp.paneRoute = function () {
      var r = pnRoute();
      try { var h = "#go=" + encodeURIComponent(r); if (location.hash !== h) history.replaceState(null, "", location.pathname + location.search + h); } catch (e) {}
      return r;
    };
    window.SlateApp.paneState = function () {
      return JSON.stringify({ t: "state", view: state.view, date: state.date, today: todayInHome(), look: document.documentElement.getAttribute("data-look") || "dark", menuOpen: !!state.menuOpen, device: deviceMode(), back: backKind() });
    };
    window.SlateApp.paneMenu = function (on) { if (!!state.menuOpen === !!on) return; state.menuOpen = !!on; renderTop(); };
    window.SlateApp.paneSettings = function (json) {
      var d; try { d = JSON.parse(json); } catch (e) { return; }
      PN_SET_KEYS.forEach(function (k) { if (k in d) state[k] = d[k]; });
      applyLook(); if (typeof maybeAutoAdd === "function" && state.settingsLoaded) maybeAutoAdd(); render();
    };
    var pnSnap = function () { var d = {}; PN_SET_KEYS.forEach(function (k) { if (state[k] !== undefined) d[k] = state[k]; }); return JSON.stringify(d); };
    var pnSaveSet0 = saveSettings, pnSaveNt0 = saveNotify;
    saveSettings = function () { pnSaveSet0.apply(null, arguments); try { window.parent.slatePaneSaved(PANE, pnSnap()); } catch (e) {} };
    saveNotify = function () { pnSaveNt0.apply(null, arguments); try { window.parent.slatePaneSaved(PANE, pnSnap()); } catch (e) {} };
    // on the left side, a game, Live feed or team tapped in a list opens on the right side (the left stays put).
    // Inside a matchup or Live feed that was slid over to the left, switching games stays on the left.
    var pnLeft = function () { return document.documentElement.classList.contains("pn-left") && state.view !== "feed" && state.view !== "game" && state.view !== "team"; };
    var pnToRight = function (r) { try { window.parent.slatePaneOpen(r); return true; } catch (e) { return false; } };
    var pnOpenM0 = openMatchup, pnOpenF0 = openFeed, pnOpenT0 = openTeam;
    openMatchup = function (g) { if (g && pnLeft() && pnToRight("game:" + g.id)) return; return pnOpenM0.apply(null, arguments); };
    openFeed = function (g) { if (g && pnLeft() && pnToRight("feed:" + g.id)) return; return pnOpenF0.apply(null, arguments); };
    openTeam = function (name, lg) { if (pnLeft() && pnToRight("team:" + JSON.stringify([name, lg || ""]))) return; return pnOpenT0.apply(null, arguments); };
    // open the page this side had (#go=feed:<game>, game:<game>, or a menu page)
    var pnGo = function (r) {
      var t = /^team:(.+)$/.exec(r || "");
      if (t) { try { var tt = JSON.parse(t[1]); pnOpenT0(tt[0], tt[1] || ""); } catch (e) {} return; }
      var m = /^(feed|game):(.+)$/.exec(r || ""), tries = 0;
      if (m) {
        (function look() {
          var g = games().filter(function (x) { return String(x.id) === m[2]; })[0];
          if (g) { if (m[1] === "feed" && feedOk(g)) pnOpenF0(g); else pnOpenM0(g); window.scrollTo(0, 0); return; }
          if (++tries < 30) setTimeout(look, 500);
        })();
        return;
      }
      if (r === "best") { menuGo("best"); return; }
      if (r && r !== "lineup" && PN_PAGES.some(function (p) { return p[0] === r; })) window.SlateApp.go(r);
    };
    window.SlateApp.paneGo = pnGo;
    var pnStart = /[#&]go=([^&]+)/.exec(location.hash);
    if (pnStart) setTimeout(function () { pnGo(decodeURIComponent(pnStart[1])); }, 0);

  }

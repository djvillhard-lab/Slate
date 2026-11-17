  // ---------- two panes on the unfolded Duo (3.80.0, DJ Nov 17, 2026) ----------
  // Open and sideways, the screen is split at the fold into two panes. Each pane is this same page in a frame
  // (?pane=a / ?pane=b), so each side has its own page, Back, menu, scroll and live updates, and any page works on
  // either side: two Live feeds at once, the slate beside Box Office, and so on. The copy of the page around them
  // (the "host") waits behind, laid out like the folded phone, and comes back when the phone is folded.
  // The grip on the fold: drag it left (or tap it) and the right page slides over to the left side, and the right side
  // asks which page to show next. Drag it right for the other way round. Each side's page is remembered while the
  // app is open, so a quick fold and unfold puts both back.
  var PN = { on: false, el: null, frames: {}, left: "a", active: "b", drag: null, routes: {} };
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
  function pnSave() { try { sessionStorage.setItem(PN_KEY, JSON.stringify({ left: PN.left, active: PN.active, routes: PN.routes })); } catch (e) {} }
  function pnLoad() { try { return JSON.parse(sessionStorage.getItem(PN_KEY) || "null") || {}; } catch (e) { return {}; } }

  // ---- the host: builds the two frames and the grip ----
  function enterPanes() {
    if (PN.on) return;
    var sv = pnLoad(); PN.on = true;
    PN.left = sv.left === "b" ? "b" : "a"; PN.active = sv.active === "a" || sv.active === "b" ? sv.active : pnOther(PN.left);
    PN.routes = sv.routes && typeof sv.routes === "object" ? sv.routes : {};
    if (!PN.routes[PN.left]) PN.routes[PN.left] = "lineup";
    if (!PN.routes[pnOther(PN.left)]) PN.routes[pnOther(PN.left)] = "games";
    state.menuOpen = false;
    document.documentElement.classList.add("panes");
    var box = el("div", "pn"); box.id = "panes";
    ["a", "b"].forEach(function (id) {
      var f = document.createElement("iframe"); f.className = "pn-frame"; f.id = "pn-" + id;
      f.src = location.pathname + "?pane=" + id + "#go=" + encodeURIComponent(PN.routes[id] || "lineup");
      PN.frames[id] = f; box.appendChild(f);
    });
    var hinge = el("div", "pn-hinge");
    var grip = el("button", "pn-grip"); grip.type = "button";
    grip.setAttribute("aria-label", "Move the right page to the left side, then pick a page for the right side");
    grip.appendChild(el("i"));
    hinge.appendChild(grip); box.appendChild(hinge);
    box.appendChild(el("div", "pn-shield"));
    document.body.appendChild(box); PN.el = box;
    pnPlace(); pnGrip(grip);
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
      f.classList.toggle("pn-act", PN.active === id);
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
      PN.drag = { x: e.clientX, dx: 0, moved: false, id: e.pointerId };
      try { grip.setPointerCapture(e.pointerId); } catch (er) {}
      PN.el.classList.add("pn-dragging");
      var fs = frames(); [fs.L, fs.R].forEach(function (f) { f.style.transition = "none"; });
      e.preventDefault();
    });
    grip.addEventListener("pointermove", function (e) {
      var d = PN.drag; if (!d || e.pointerId !== d.id) return;
      d.dx = e.clientX - d.x; if (Math.abs(d.dx) > 8) d.moved = true;
      var fs = frames(), dx = Math.max(-fs.span, Math.min(fs.span, d.dx));
      var mover = dx < 0 ? fs.R : fs.L, stay = mover === fs.R ? fs.L : fs.R;
      mover.classList.add("pn-moving"); stay.classList.remove("pn-moving");
      mover.style.transform = dx ? "translateX(" + dx + "px)" : ""; stay.style.transform = "";
      mover.classList.remove("pn-dim"); stay.classList.toggle("pn-dim", Math.abs(dx) > fs.span * 0.3);
    });
    function end(e, cancel) {
      var d = PN.drag; if (!d || e.pointerId !== d.id) return;
      PN.drag = null;
      var fs = frames();
      if (cancel) { reset(true); return; }
      if (!d.moved) { reset(false); pnMove(-1); return; }
      if (Math.abs(d.dx) > fs.span * 0.3) pnMove(d.dx < 0 ? -1 : 1); else reset(true);
    }
    grip.addEventListener("pointerup", function (e) { end(e, false); });
    grip.addEventListener("pointercancel", function (e) { end(e, true); });
    grip.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); pnMove(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); pnMove(-1); } });
    grip.addEventListener("click", function (e) { if (e.detail === 0) pnMove(-1); });  // keyboard / VoiceOver activation
  }
  // dir -1: the right page slides over to the left side; dir 1: the left page slides to the right side.
  // The side it left asks which page to show next (it can keep the page it has).
  function pnMove(dir) {
    if (!PN.on) return;
    var L = PN.frames[PN.left], R = PN.frames[pnOther(PN.left)], span = R.getBoundingClientRect().left - L.getBoundingClientRect().left;
    var mover = dir < 0 ? R : L, stay = mover === R ? L : R, moverId = mover === PN.frames.a ? "a" : "b";
    mover.classList.add("pn-moving"); stay.classList.add("pn-dim");
    var fin = function () {
      [L, R].forEach(function (f) { f.style.transition = "none"; f.style.transform = ""; f.classList.remove("pn-moving", "pn-dim"); });
      PN.el.classList.remove("pn-dragging");
      PN.left = dir < 0 ? moverId : pnOther(moverId);
      PN.active = pnOther(moverId);
      pnPlace(); pnSave();
      var w = pnWin(PN.active); if (w && w.SlateApp.panePick) w.SlateApp.panePick(dir < 0 ? "right" : "left");
      if (typeof nativeSync === "function") nativeSync();
    };
    if (REDUCED) { fin(); return; }
    mover.style.transition = "transform .22s ease"; stay.style.transition = "opacity .22s ease";
    void mover.offsetWidth;
    mover.style.transform = "translateX(" + (dir < 0 ? -span : span) + "px)";
    setTimeout(fin, 230);
  }
  // what the active side reports to the iPhone app's strip (its Back and menu work that side)
  function paneSyncMsg() {
    var w = pnWin(PN.active); if (!w || !w.SlateApp.paneState) return null;
    try { var m = JSON.parse(w.SlateApp.paneState()); m.duo = true; return m; } catch (e) { return null; }
  }
  window.slatePaneSync = function (id) {
    if (!PN.on) return;
    var w = pnWin(id);
    if (w && w.SlateApp.paneRoute) { var r = w.SlateApp.paneRoute(); if (r !== PN.routes[id]) { PN.routes[id] = r; pnSave(); } }
    if (id === PN.active && typeof nativeSync === "function") nativeSync();
  };
  window.slatePaneTouch = function (id) {
    if (!PN.on || PN.active === id) return;
    var w0 = pnWin(PN.active); if (w0 && w0.SlateApp.paneMenu) w0.SlateApp.paneMenu(false);
    PN.active = id; pnPlace(); pnSave(); if (typeof nativeSync === "function") nativeSync();
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
  // the iPhone app's strip buttons reach whichever side was touched last
  ["go", "today", "back", "openGame", "day", "toggleMenu", "watch"].forEach(function (k) {
    var f0 = window.SlateApp[k];
    window.SlateApp[k] = function () {
      var w = PN.on ? pnWin(PN.active) : null;
      if (w) return w.SlateApp[k].apply(w.SlateApp, arguments);
      return f0.apply(window.SlateApp, arguments);
    };
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

  // ---- a pane: report its page, follow the other side's settings, and the page picker ----
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
    // touching a side makes it the one the iPhone app's strip buttons work
    window.addEventListener("pointerdown", function () { try { window.parent.slatePaneTouch(PANE); } catch (e) {} }, { capture: true, passive: true });
    window.addEventListener("focus", function () { try { window.parent.slatePaneTouch(PANE); } catch (e) {} });
    // open the page this side had (#go=feed:<game>, game:<game>, or a menu page)
    var pnGo = function (r) {
      var m = /^(feed|game):(.+)$/.exec(r || ""), tries = 0;
      if (m) {
        (function look() {
          var g = games().filter(function (x) { return String(x.id) === m[2]; })[0];
          if (g) { if (m[1] === "feed" && feedOk(g)) openFeed(g); else openMatchup(g); window.scrollTo(0, 0); return; }
          if (++tries < 30) setTimeout(look, 500);
        })();
        return;
      }
      if (r === "best") { menuGo("best"); return; }
      if (r && r !== "lineup" && PN_PAGES.some(function (p) { return p[0] === r; })) window.SlateApp.go(r);
    };
    var pnStart = /[#&]go=([^&]+)/.exec(location.hash);
    if (pnStart) setTimeout(function () { pnGo(decodeURIComponent(pnStart[1])); }, 0);

    // the page picker: shown on the side a page just left
    var pnPickClose = function () { var o = $("pn-pick"); if (o) o.remove(); document.documentElement.classList.remove("pn-picking"); };
    var pnPickName = function () {
      var v = state.view, g = v === "feed" ? feedGame() : v === "game" ? games().filter(function (x) { return x.id === state.gameId; })[0] : null;
      if (g && !g.custom) return (v === "feed" ? "the Live feed" : "the matchup") + ", " + abbr(g, "away") + " at " + abbr(g, "home");
      var p = PN_PAGES.filter(function (x) { return x[0] === v; })[0];
      return p ? p[1] : v === "best" ? "Player rankings" : "this page";
    };
    window.SlateApp.panePick = function (side) {
      pnPickClose(); state.menuOpen = false; renderTop();
      var o = el("div", "pn-pick"); o.id = "pn-pick"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "Pick a page for this side");
      var inr = el("div", "pn-pk-in");
      var hd = el("div", "pn-pk-head");
      hd.appendChild(el("h2", null, "Pick a page"));
      hd.appendChild(el("p", null, "For the " + (side || "right") + " side of the screen."));
      inr.appendChild(hd);
      // live games first: the quickest way to a second Live feed
      var live = games().filter(function (g) { return !g.custom && status(g).kind === "live"; }).sort(function (a, b) { return (inLineup(b.id) ? 1 : 0) - (inLineup(a.id) ? 1 : 0) || new Date(a.start) - new Date(b.start); });
      if (live.length) {
        var sh = el("div", "sec"); sh.appendChild(el("h2", null, "Live now")); sh.appendChild(el("span", "count", String(live.length))); inr.appendChild(sh);
        var gl = el("div", "pn-pk-games");
        live.slice(0, 12).forEach(function (g) {
          var fd = feedOk(g), b = el("button", "pn-pk-game"); b.type = "button";
          var tms = el("span", "pn-pk-tms"); sideOrder(g).forEach(function (s2) { tms.appendChild(teamLine(g, s2)); }); b.appendChild(tms);
          var sc = scoreOf(g), sd = el("span", "pn-pk-st");
          sd.appendChild(el("span", "bug live", sc && sc.detail ? sc.detail : "Live"));
          sd.appendChild(el("em", null, fd ? "Live feed" : "Matchup"));
          b.appendChild(sd);
          b.setAttribute("aria-label", (fd ? "Live feed: " : "Matchup: ") + g.away + " at " + g.home);
          b.addEventListener("click", function () { pnPickClose(); if (fd) openFeed(g); else openMatchup(g); window.scrollTo(0, 0); });
          gl.appendChild(b);
        });
        inr.appendChild(gl);
      }
      var ph = el("div", "sec"); ph.appendChild(el("h2", null, "Pages")); inr.appendChild(ph);
      var grid = el("div", "pn-pk-pages");
      PN_PAGES.forEach(function (p) {
        var b = el("button", "pn-pk-page"); b.type = "button";
        var src = $("nav-" + (p[0] === "settings" ? "settings2" : p[0])), svg = src && src.querySelector("svg");
        if (svg) b.appendChild(svg.cloneNode(true));
        b.appendChild(el("span", null, p[1]));
        if (state.view === p[0]) b.setAttribute("aria-current", "page");
        b.addEventListener("click", function () {
          pnPickClose();
          if (p[0] === "lineup") { state.menuOpen = false; state.backTo = null; if (state.view !== "lineup") setView("lineup"); if (state.date !== todayInHome()) setDate(todayInHome()); renderBack(); }
          else window.SlateApp.go(p[0]);
          window.scrollTo(0, 0);
        });
        grid.appendChild(b);
      });
      inr.appendChild(grid);
      var keep = el("button", "pn-pk-keep"); keep.type = "button";
      keep.appendChild(el("span", null, "Keep " + pnPickName()));
      keep.addEventListener("click", pnPickClose);
      inr.appendChild(keep);
      o.appendChild(inr);
      document.body.appendChild(o); document.documentElement.classList.add("pn-picking");
      if (!REDUCED) { o.classList.add("pn-in"); setTimeout(function () { o.classList.remove("pn-in"); }, 260); }
      o.tabIndex = -1; try { o.focus({ preventScroll: true }); } catch (e) {}
    };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("pn-pick")) { e.stopPropagation(); pnPickClose(); } }, true);
  }

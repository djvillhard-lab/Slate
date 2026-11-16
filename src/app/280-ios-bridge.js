  // ---- the iPhone app: a native shell (ios/ in the repo) that loads this same page ----
  // The shell sets window.SLATE_NATIVE before the page runs. On iPhone Duo its own controls sit in Apple's
  // right-side strip ("strip" mode), so the page hides its floating menu button there. ?native=strip fakes the
  // shell for the in-browser preview (app-preview.html), which talks to the page the same way the app does.
  var NATIVE = window.SLATE_NATIVE || (/[?&]native=strip\b/.test(location.search) ? { platform: "preview", strip: true } : null);
  function nativePost(m) {
    try { if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.slate) { window.webkit.messageHandlers.slate.postMessage(m); return; } } catch (e) {}
    try { if (NATIVE && NATIVE.platform === "preview" && window.parent !== window) window.parent.postMessage({ slate: m }, location.origin); } catch (e) {}
  }
  function nativeApply() {
    var h = document.documentElement;
    if (NATIVE) h.setAttribute("data-native", NATIVE.platform || "ios"); else h.removeAttribute("data-native");
    if (NATIVE && NATIVE.strip) h.setAttribute("data-strip", ""); else h.removeAttribute("data-strip");
    if (NATIVE && NATIVE.backBtn) h.setAttribute("data-nback", ""); else h.removeAttribute("data-nback");
    if (NATIVE && NATIVE.float) h.setAttribute("data-float", ""); else h.removeAttribute("data-float");
  }
  var nativeLast = "";
  // the Back button's state for the app's strip: "" (not needed), "back", or "fwd" (to today from a past day)
  function backKind() { var bt = $("dock-back"); if (!bt || !NATIVE) return ""; var offDay = state.date && state.date !== todayInHome() && (state.view === "lineup" || isDuo); if (!(state.view !== homeView() || offDay)) return ""; return offDay && (state.view === "lineup" || state.view === homeView()) && state.date < todayInHome() ? "fwd" : "back"; }
  function nativeSync() {
    if (!NATIVE) return;
    var look = document.documentElement.getAttribute("data-look") || "dark";
    var m = { t: "state", view: state.view, date: state.date, today: todayInHome(), look: look, menuOpen: !!state.menuOpen, duo: !!isDuo, device: deviceMode(), back: backKind() };
    var k = JSON.stringify(m); if (k === nativeLast) return; nativeLast = k; nativePost(m);
  }
  // the folded Duo: iOS's clock and Wi-Fi sit at the top of the right column and reach about 162 points down the screen,
  // past the bottom of the top bar. The page starts (and the Live feed pins its score bar) below them; it stays full width (3.36.2)
  var SC_BOTTOM = 162;
  function scFit() {
    var h = document.documentElement, hd = document.querySelector("#pane-r > header.top");
    var on = h.hasAttribute("data-native") && h.classList.contains("side-col") && !h.classList.contains("duo");
    var gap = on && hd ? Math.max(0, Math.round(SC_BOTTOM - hd.getBoundingClientRect().height)) : 0;
    if (h.style.getPropertyValue("--sc-gap") !== gap + "px") { h.style.setProperty("--sc-gap", gap + "px"); if (state.view === "feed" && typeof renderFeed === "function") renderFeed(true); }
  }
  if (typeof ResizeObserver === "function") { var scHd = document.querySelector("#pane-r > header.top"); if (scHd) new ResizeObserver(scFit).observe(scHd); }
  window.addEventListener("resize", scFit);
  window.SlateApp = {
    version: SLATE_VERSION,
    // the strip's buttons: the same things the menu does
    go: function (v) {
      if (state.menuOpen) state.menuOpen = false;
      if (v === "lineup") setView("lineup");
      else if (v === "games") { state.gamesLive = false; menuGo("games"); }
      else if (v === "moments") { mm.date = null; mm.picked = false; menuGo("moments"); }
      else if (v === "teams" || v === "tv" || v === "news") menuGo(v);
      else if (v === "settings") { openSub("settings"); showCost(); }
      renderTop(); nativeSync();
    },
    today: function () { goBack(); nativeSync(); },
    // the strip's Back button (newer app builds draw it themselves, above the menu button)
    back: function () { state.menuOpen = false; goBack(); renderTop(); nativeSync(); },
    // a tapped live notification (Lock Screen or Dynamic Island): open that game's matchup. On a cold launch the
    // day's games may still be loading, so it keeps looking for a few seconds (on today's slate).
    openGame: function (id) {
      id = String(id || ""); if (!id) return;
      var tries = 0;
      (function look() {
        var g = games().filter(function (x) { return String(x.id) === id; })[0];
        if (g) {
          state.menuOpen = false;
          if (state.view === "game") { state.gameId = g.id; render(); } else openMatchup(g);
          renderTop(); nativeSync(); return;
        }
        if (state.date !== todayInHome()) setDate(todayInHome());
        if (++tries < 24) setTimeout(look, 500);
      })();
    },
    // the Lock Screen's Watch button: the channel's app, like the slate's channel buttons (YouTube TV for TV channels;
    // NBC and ESPN's channels ask which app). A channel with nowhere to watch opens the game instead.
    watch: function (n, id) {
      n = String(n || ""); var opts = watchOptions(n);
      if (opts.length === 1) { if (NATIVE) nativePost({ t: "open", url: opts[0][1] }); else window.open(opts[0][1], "_blank"); }
      else if (opts.length > 1) openWatch(n, opts);
      else if (id) window.SlateApp.openGame(id);
    },
    day: function (n) {
      var v = state.view, today = todayInHome(), step = n > 0 ? 1 : -1;
      if (v === "moments") mmSetDate(shiftDate(mm.date || today, step));
      else if (v === "best") rkSetDate(shiftDate(rk.date || today, step));
      else { slideDir = step > 0 ? "l" : "r"; setDate(shiftDate(state.date, step)); }
      nativeSync();
    },
    // the app's floating menu (wherever iOS has no side column): the page hides its own menu button and Back
    setFloat: function (on) { if (!NATIVE) return; NATIVE.float = !!on; if (on) state.menuOpen = false; nativeApply(); renderTop(); repinDock(); },
    setStrip: function (on) { if (!NATIVE) return; NATIVE.strip = !!on; state.menuOpen = false; nativeApply(); renderTop(); repinDock(); },
    // where the fold is, in page points from the left (the middle of the physical screen); lines up the two panes
    setFold: function (x) { var v = Number(x) || 0; if (v > 0 && v !== nativeFoldX) { nativeFoldX = v; applyLayout(true); } },
    // the app's list of live notifications on the phone right now (3.28.1)
    liveShowing: function (ids, board) {
      var m = {}; (ids || []).forEach(function (i) { m[String(i)] = 1; });
      var was = JSON.stringify([state.liveShowing || null, state.boardShowing]); state.liveShowing = m; state.boardShowing = !!board;
      if (JSON.stringify([m, !!board]) !== was) { render(); try { if ($("sheet-board").classList.contains("open")) renderBoard(); } catch (e) {} }
    },
    // a live notification swiped away on the phone: its switch goes off here too (the app has told the server already)
    liveGone: function (id) {
      if (!state.notifyLoaded) return;
      if (id === "board") { var b = boardPrefs(); b.on = false; }
      else perGame("live")[String(id)] = 0;
      render(); try { if ($("sheet-board").classList.contains("open")) renderBoard(); } catch (e) {}
    },
    // the strip's menu button: open or close the page buttons stacked above it
    toggleMenu: function () { state.menuOpen = !state.menuOpen; renderTop(); nativeSync(); },
    // where the strip's menu button is (screen points): the page buttons stack just above it, centred on it
    setMenuAnchor: function (x, y, w, h) {
      var r = document.documentElement.style, cx = Number(x) + Number(w) / 2;
      if (!(w > 0) || !(y > 0)) return;
      r.setProperty("--ma-r", Math.max(0, Math.round(window.innerWidth - cx - 26)) + "px");
      r.setProperty("--ma-b", Math.max(0, Math.round(window.innerHeight - Number(y) + 12)) + "px");
    },
    setInset: function (px) { var w = Math.max(0, Math.round(Number(px) || 0)); document.documentElement.style.setProperty("--strip-w", w + "px"); document.documentElement.classList.toggle("side-col", w > 0); applyLook(); fitTitle($("title-t")); repinDock(); scFit(); },
    // push alerts through Apple's push service (the app), saved alongside web push subscriptions
    onPushStatus: function (st) { pushInfo.native = st; pushInfo.checked = true; pushInfo.busy = false; pushInfo.on = st === "granted" && !!pushInfo.token; pushState(); },
    onPushToken: function (tok, env) {
      if (!tok) return; pushInfo.token = tok; pushInfo.native = "granted"; pushInfo.on = true; pushInfo.busy = false; pushInfo.checked = true; pushState();
      pushSave({ endpoint: "apns:" + tok, apns: tok, env: env || "production" }, !pushInfo.asked);
    },
    onPushError: function () { pushInfo.busy = false; pushInfo.checked = true; pushState(); if (pushInfo.asked) toast("Notifications weren't allowed."); }
  };
  nativeApply();
  // A newer app build in TestFlight than the one running: the release notes' latest "TestFlight: 3.0 (N)" line,
  // once ~35 minutes have passed since that release went out (time for Xcode Cloud and Apple to finish it).
  (function () {
    var box = $("app-upd"); if (!box) return;
    function check() {
      var have = NATIVE && Number(NATIVE.build) || 0, m = /TestFlight:\s*([\d.]+)\s*\((\d+)\)/.exec(window.SLATE_CHANGES || ""), want = m ? Number(m[2]) : 0;
      var b = window.SLATE_BUILD || "", at = b ? new Date(b.slice(0, 4) + "-" + b.slice(4, 6) + "-" + b.slice(6, 8) + "T" + b.slice(8, 10) + ":" + b.slice(10, 12) + ":00").getTime() : 0;
      var hid = ""; try { hid = localStorage.getItem("slate-upd-hide") || ""; } catch (e) {}
      var show = !!(have && want > have && at && Date.now() - at > 35 * 60000 && hid !== String(want));
      box.hidden = !show; if (show) $("au-t").textContent = "New app version " + m[1] + " (" + want + ") is ready";
    }
    $("au-go").addEventListener("click", function () { location.href = "itms-beta://"; });
    $("au-x").addEventListener("click", function () { var m = /TestFlight:\s*[\d.]+\s*\((\d+)\)/.exec(window.SLATE_CHANGES || ""); try { localStorage.setItem("slate-upd-hide", m ? m[1] : ""); } catch (e) {} box.hidden = true; });
    check(); setInterval(check, 5 * 60000); document.addEventListener("visibilitychange", function () { if (!document.hidden) check(); });
  })();
  if (NATIVE) { nativePost({ t: "ready", version: SLATE_VERSION }); nativePost({ t: "pass", pass: slatePass() }); setTimeout(nativeSync, 0); }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (state.menuOpen) { state.menuOpen = false; renderTop(); $("menu-fab").focus(); return; }
    if (!document.querySelector(".sheet-backdrop.open") && !(e.target && e.target.closest && e.target.closest("input, select, textarea"))) goBack();
  });
  $("search").addEventListener("input", function (e) { state.q = e.target.value; renderGames(); });
  $("day-prev").addEventListener("click", function () { slideDir = "r"; setDate(shiftDate(state.date, -1)); });
  ["day-input", "l-day-input"].forEach(function (id) { $(id).addEventListener("change", function () { if (this.value) setDate(this.value); }); });
  ["day-today", "l-day-today"].forEach(function (id) { $(id).addEventListener("click", function () { var t = todayInHome(); slideDir = state.date > t ? "r" : "l"; setDate(t); }); });
  // swipe the slate sideways for the next or previous day — anywhere on the slate page, including the blank space
  // under a short or empty day (not from the screen edge, which iOS uses for Back). On a page with a Back button
  // (a matchup, Alerts, Rules opened from the slate), a swipe either way goes back instead.
  (function () {
    var x0 = null, y0 = 0, t0 = 0;
    var mode = null, scroller = null, sx0 = 0;
    function belowStrip(id, t) { var s2 = document.querySelector(id); if (!s2 || !t) return false; var r = s2.getBoundingClientRect(); return r.height > 0 && t.clientY > r.bottom; }
    function swipeMode(target, t) {
      if (!target || !target.closest || state.menuOpen) return null;
      if (target.closest(".ticker, input, select, textarea, .sheet-backdrop, .menu-pop, nav.dock, .strip, .dates, .substrip, .bs-pills")) return null;
      if (isDuo && target.closest("#pane-l")) return "day";
      if (state.view === "games" && !target.closest(".tray, nav.dock, .menu-pop") && (belowStrip("#strip", t) || target.closest("#view-games"))) return "league";
      if (state.view === "best" && !target.closest(".rk-day, nav.dock, .menu-pop") && (belowStrip(".rk-strip", t) || target.closest("#view-best"))) return "rk";
      if (state.view === "moments" && !target.closest("nav.dock, .menu-pop") && (belowStrip(".mm-strip", t) || target.closest("#view-moments"))) return "mm";
      if (state.view === "tv" && !target.closest(".tray, nav.dock, .menu-pop") && (belowStrip("#substrip", t) || target.closest("#view-tv"))) return "tv";
      if (state.view === "feed") return "feed";  // left: next live game; right: the game before, or back from the first one
      if (state.view !== homeView() && state.view !== "lineup") return "back";
      return !isDuo && state.view === "lineup" ? "day" : null;
    }
    document.addEventListener("touchstart", function (e) {
      x0 = null; if (e.touches.length !== 1) return;
      var t = e.touches[0];
      if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
      mode = swipeMode(e.target, t); if (!mode) return;
      // a wide box score scrolls sideways first; the swipe only counts if the table didn't move (it was already at its edge)
      scroller = e.target.closest(".bxp-sc, .bx-scroll, .bxp-cells, .tm-tbl-w, #strip, #substrip, .rk-strip, .rk-sub, .mm-strip, .fd-strip"); sx0 = scroller ? scroller.scrollLeft : 0;
      // inside a box score or stats table that scrolls sideways, the finger scrolls the table, never the page
      var wide = e.target.closest(".bxp-sc, .bx-scroll, .bxp-cells, .tm-tbl-w, .bx-ts, .bxp, .bx");
      if (wide || e.target.closest(".bx-pl, .gv-box")) { x0 = null; return; }  // never change pages from inside a box score
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
    }, { passive: true });
    // the page follows the finger, then slides out and the next one slides in
    var drag = null, locked = false;
    function dragTarget() {
      if (mode === "day") return slideKids($("lineup-body"));
      if (mode === "league") return slideKids($("games-body"));
      if (mode === "rk") return slideKids($("best-body"));
      if (mode === "mm") return slideKids($("mm-body"));
      if (mode === "tv") return slideKids($("tv-body"));
      if (mode === "feed") return fdKids();
      if (mode === "back") { var v = $("view-" + state.view); return v ? [v] : []; }
      return [];
    }
    function each(list, fn) { (list || []).forEach(fn); }
    function clearDrag(list) { each(list, function (el2) { el2.style.transition = ""; el2.style.transform = ""; el2.style.opacity = ""; el2.style.willChange = ""; }); }
    function snapBack(list) {
      if (!list) return;
      each(list, function (el2) { el2.style.transition = "transform .18s cubic-bezier(.2,.8,.2,1), opacity .18s"; el2.style.transform = ""; el2.style.opacity = ""; });
      setTimeout(function () { clearDrag(list); }, 200);
    }
    function where() { return [state.view, state.date, state.league, state.bestLeague, state.tvFilter, mm.lg, mm.date, state.feedId].join("|"); }
    document.addEventListener("touchmove", function (e) {
      if (x0 === null || REDUCED) return;
      var t = e.touches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (!locked) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { x0 = null; return; }
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
        if (scroller && Math.abs(scroller.scrollLeft - sx0) > 2) { x0 = null; return; }
        locked = true; if (mode === "feed") FD.drag = true; drag = dragTarget(); each(drag, function (el2) { el2.style.transition = "none"; el2.style.willChange = "transform, opacity"; });
      }
      if (scroller && Math.abs(scroller.scrollLeft - sx0) > 2) { snapBack(drag); drag = null; x0 = null; locked = false; return; }
      if (mode === "back" && dx < 0) dx = 0;  // pages you open only swipe back (to the right)
      var m = mode === "feed" ? dx : dx * 0.7, op = String(1 - Math.min(Math.abs(dx) / (mode === "feed" ? 900 : 700), mode === "feed" ? 0.2 : 0.3));  // the live feed follows the finger one to one
      each(drag, function (el2) { el2.style.transform = "translate3d(" + m + "px,0,0)"; el2.style.opacity = op; });
    }, { passive: true });
    // once a live feed swipe is going sideways, the page doesn't also scroll up and down under the finger
    document.addEventListener("touchmove", function (e) { if (locked && mode === "feed" && e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener("touchend", function (e) {
      FD.drag = false;
      if (x0 === null) { if (drag) snapBack(drag); drag = null; locked = false; return; }
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0, ms = Date.now() - t0; x0 = null;
      var d = drag; drag = null; locked = false;
      var fast = Math.abs(dx) >= 35 && Math.abs(dx) / Math.max(ms, 1) > 0.45;
      if ((Math.abs(dx) < 60 && !fast) || Math.abs(dy) > Math.abs(dx) * 0.7 || ms > 1200 || (scroller && Math.abs(scroller.scrollLeft - sx0) > 2)) { snapBack(d); return; }
      if (mode === "back" && dx < 0) { snapBack(d); return; }
      var dir = dx < 0 ? "l" : "r", before = where();
      function act() {
        if (mode === "back") goBack();
        else if (mode === "league") swipeFilter(dx < 0 ? 1 : -1);
        else if (mode === "rk") rkSwipe(dx < 0 ? 1 : -1);
        else if (mode === "mm") mmSwipe(dx < 0 ? 1 : -1);
        else if (mode === "tv") tvSwipe(dx < 0 ? 1 : -1);
        else if (mode === "feed") { if (!fdSwipe(dx < 0 ? 1 : -1) && dx > 0) goBack(); }
        else { slideDir = dir; setDate(shiftDate(state.date, dx < 0 ? 1 : -1)); }
      }
      if (!d || !d.length || REDUCED) { act(); return; }
      if (mode === "feed") {  // carry on from where the finger let go, off the side, then the next game comes in from the other side
        var vw = window.innerWidth, going = !(dx > 0 && (state.feedId && fdAtFirst()));
        each(d, function (el2) { el2.style.transition = "transform .16s cubic-bezier(.3,.6,.4,1), opacity .16s"; el2.style.transform = "translate3d(" + (dx < 0 ? -vw : vw) + "px,0,0)"; el2.style.opacity = going ? "0.2" : "0"; });
        setTimeout(function () { var before2 = where(); act(); if (where() === before2) { clearDrag(d); each(d, function (el2) { el2.classList.remove("sl-l", "sl-r"); void el2.offsetWidth; el2.classList.add(dir === "l" ? "sl-r" : "sl-l"); }); return; } clearDrag(d);
          if (state.view !== "feed") { var nv2 = $("view-" + state.view); if (nv2) { nv2.classList.remove("sl-l", "sl-r"); void nv2.offsetWidth; nv2.classList.add("sl-r"); setTimeout(function () { nv2.classList.remove("sl-r"); }, 300); } } }, 160);
        return;
      }
      each(d, function (el2) { el2.style.transition = "transform .11s cubic-bezier(.4,0,1,1), opacity .11s"; el2.style.transform = "translate3d(" + (dx < 0 ? -40 : 40) + "%,0,0)"; el2.style.opacity = "0"; });
      setTimeout(function () {
        var stay = where() === before; act();
        if (where() === before) { clearDrag(d); each(d, function (el2) { el2.classList.remove("sl-l", "sl-r"); void el2.offsetWidth; el2.classList.add(dir === "l" ? "sl-r" : "sl-l"); }); return; }   // nothing further that way: come back
        clearDrag(d);
        if (mode === "back" || (mode === "feed" && state.view !== "feed")) { var nv = $("view-" + state.view); if (nv) { nv.classList.remove("sl-l", "sl-r"); void nv.offsetWidth; nv.classList.add("sl-r"); setTimeout(function () { nv.classList.remove("sl-r"); }, 300); } }
      }, 110);
    }, { passive: true });
    document.addEventListener("touchcancel", function () { FD.drag = false; x0 = null; if (drag) snapBack(drag); drag = null; locked = false; }, { passive: true });
  })();
  $("day-next").addEventListener("click", function () { slideDir = "l"; setDate(shiftDate(state.date, 1)); });
  $("btn-copy").addEventListener("click", copyLineup);
  $("btn-add").addEventListener("click", function () { if (isPastDay()) { toast("That day is over, so its slate is closed"); return; } if (!db) { toast("Sign in to Claude to save games"); return; } $("sheet-add").classList.add("open"); setTimeout(function () { $("c-title").focus(); }, 50); });
  $("btn-close-add").addEventListener("click", function () { $("sheet-add").classList.remove("open"); });
  $("sheet-add").addEventListener("click", function (e) { if (e.target === this) this.classList.remove("open"); });
  $("btn-close-watch").addEventListener("click", function () { $("sheet-watch").classList.remove("open"); });
  $("btn-close-board").addEventListener("click", function () { $("sheet-board").classList.remove("open"); });
  $("sheet-board").addEventListener("click", function (e) { if (e.target === this) this.classList.remove("open"); });
  $("btn-board-on").addEventListener("click", function () {
    if (!state.notifyLoaded) { toast("Loading your notifications…"); return; }
    var b = boardPrefs(), gs = boardGames(), n = b.ids.filter(function (id) { return gs.some(function (g) { return g.id === id; }); }).length;
    if (!n) return;
    var on = !boardIsOn();
    b.on = on; b.at = Date.now(); saveNotify(); renderBoard(); keepScroll(renderLineup);
    var live = gs.some(function (g) { return b.ids.indexOf(g.id) !== -1 && status(g).kind !== "upcoming"; });
    laBoardNow();
    toast(on ? (live ? (NATIVE.liveNow ? "Your scoreboard is on your Lock Screen" : "Your scoreboard shows on your Lock Screen within a minute") : "Your scoreboard shows on your Lock Screen 15 minutes before the first game") : "Scoreboard off" + (NATIVE.liveNow ? "" : ": it leaves your Lock Screen within a minute"));
    if (on) $("sheet-board").classList.remove("open");
  });
  $("sheet-watch").addEventListener("click", function (e) { if (e.target === this) this.classList.remove("open"); });
  $("btn-close-copy").addEventListener("click", function () { $("sheet-copy").classList.remove("open"); });
  $("sheet-copy").addEventListener("click", function (e) { if (e.target === this) this.classList.remove("open"); });
  $("toast-undo").addEventListener("click", function () { var f = undoFn; undoFn = null; $("toast").classList.remove("show"); if (f) f(); });
  [].forEach.call([], function (b) {
    b.addEventListener("click", function () {});
  });
  $("custom-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var title = $("c-title").value.trim(), time = $("c-time").value, tv = $("c-tv").value.trim();
    if (!title || !time) return;
    if (isPastDay()) { $("sheet-add").classList.remove("open"); toast("That day is over, so its slate is closed"); return; }
    state.lineup.custom = (state.lineup.custom || []).concat([{ id: "c-" + Date.now().toString(36), title: title, time: time, tv: tv }]);
    $("c-title").value = ""; $("c-time").value = ""; $("c-tv").value = "";
    $("sheet-add").classList.remove("open");
    toast("Added to slate"); state.view = "lineup"; render(); saveLineup();
  });

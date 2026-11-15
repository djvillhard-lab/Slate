  // ---------- layout: open sideways = two panes with the menu along the bottom of the right pane;
  //            everything else (cover screen, open and upright) = compact menu in the bottom-right corner ----------
  var mqSplit = window.matchMedia("(min-width: 700px) and (min-height: 480px) and (orientation: landscape)");
  var mqLand = window.matchMedia("(orientation: landscape)");
  var mqBig = window.matchMedia("(min-width: 600px) and (min-height: 480px)");
  // iOS keeps its own status column on the right edge of the open Duo, so the page is narrower than the screen
  // and the fold sits right of the page's centre. Shift the split so its gap lands on the fold.
  // Measured on DJ's iPhone Duo: iOS's strip takes ~8.9% of the open screen, so the crease sits 4.87% of the
  // page width right of the page's centre. Use the screen size when the browser reports it; otherwise that ratio.
  var FOLD_FRAC = 0.0487;
  var nativeFoldX = null;  // set by the iPhone app (SlateApp.setFold)
  function foldShift() {
    var iw = window.innerWidth, ih = window.innerHeight, base = 0;
    if (!(iw > ih)) return 0;
    // the iPhone app knows exactly where the screen's middle (the fold) falls on the page: use that
    if (typeof nativeFoldX === "number" && nativeFoldX > 0) return Math.round(nativeFoldX - iw / 2 + (Number(state.foldNudge) || 0));
    var sw = Math.max(screen.width || 0, screen.height || 0);
    if (sw && Math.abs(sw - iw) <= 2) base = 0;
    else if (sw > iw && sw < iw * 1.3) base = sw / 2 - iw / 2;
    else if (/iPhone/.test(navigator.userAgent)) base = iw * FOLD_FRAC;
    return Math.round(base + (Number(state.foldNudge) || 0));
  }
  function applyLayout(force) {
    var root = document.documentElement, split = deviceMode() === "duo" && mqSplit.matches, big = mqBig.matches, corner = !split;
    root.style.setProperty("--fold-shift", (split ? foldShift() : 0) + "px");
    if (!force && split === isDuo && corner === isCorner && big === isBig && root.classList.contains("iphone") === (deviceMode() !== "duo") && root.classList.contains("duo") === split && root.classList.contains("corner") === corner) return;
    var folded = split !== isDuo;
    isDuo = split; isCorner = corner; isBig = big;
    // folding or unfolding: iPhone can keep the old zoom, which un-pins the menu (it then scrolls with the page)
    if (folded && !force) setTimeout(refit, 0);
    root.classList.toggle("duo", split); root.classList.toggle("corner", corner); root.classList.toggle("roomy", corner && big); root.classList.remove("rail");
    $("pane-l").hidden = !split;
    var sec = $("view-lineup");
    if (split && sec.parentNode !== $("pbody-l")) { $("pbody-l").appendChild(sec); if (state.view === "lineup") state.view = "games"; }
    // folding the phone always lands on the slate
    if (!split && sec.parentNode !== $("main-wrap")) { $("main-wrap").insertBefore(sec, $("main-wrap").firstChild); state.view = "lineup"; state.menuOpen = false; state.backTo = null; window.scrollTo(0, 0); }
    applyLook(); render(); setTimeout(repinDock, 50); setTimeout(repinDock, 400);
  }
  [mqSplit, mqLand, mqBig].forEach(function (mq) { if (mq.addEventListener) mq.addEventListener("change", function () { applyLayout(); }); else if (mq.addListener) mq.addListener(function () { applyLayout(); }); });
  document.documentElement.style.setProperty("--app-h", window.innerHeight + "px");
  var lastW = window.innerWidth;
  window.addEventListener("resize", function () { if (Math.abs(window.innerWidth - lastW) > 60) { lastW = window.innerWidth; refit(); } });
  // a zoomed-in page (left over from a fold or turn) makes the menu ride along with the scroll: reset the zoom
  var zoomFixAt = 0;
  if (window.visualViewport) window.visualViewport.addEventListener("resize", function () { var vv = window.visualViewport; if (vv.scale > 1.02 && Date.now() - zoomFixAt > 1500) { zoomFixAt = Date.now(); fitWidth(); } });
  window.addEventListener("resize", function () { if (!SHORT_GAP) document.documentElement.style.setProperty("--app-h", window.innerHeight + "px"); repinDock(); applyLayout(); alignSides($("lineup-body")); alignSides($("games-body")); });
  function fitWidth() {
    var vp = document.querySelector('meta[name="viewport"]'); if (!vp) return;
    setTimeout(repinDock, 400);
    var base = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
    document.documentElement.style.setProperty("--app-h", window.innerHeight + "px");
    var bd = document.body, y0 = window.scrollY; bd.style.minHeight = "calc(100vh + 2px)"; window.scrollTo(0, y0 + 1);
    setTimeout(function () { window.scrollTo(0, y0); bd.style.minHeight = ""; }, 30);
    vp.setAttribute("content", base + ", minimum-scale=1"); setTimeout(function () { if (!SHORT_GAP) document.documentElement.style.setProperty("--app-h", window.innerHeight + "px"); vp.setAttribute("content", base); window.scrollTo(0, window.scrollY); applyLayout(true); alignSides($("lineup-body")); alignSides($("games-body")); repinDock(); }, 60);
  }
  // iPhone sometimes keeps the old width after a turn, a fold, or coming back to the app: re-fit a few times as it settles
  function refit() { [80, 400, 1000].forEach(function (ms) { setTimeout(fitWidth, ms); }); [300, 1600].forEach(function (ms) { setTimeout(checkShort, ms); }); }
  // iPhone's Home Screen apps sometimes keep a too-short screen after a turn; when the visible area is clearly
  // smaller than the screen and re-fitting didn't help, a quick reload puts it right (at most once a minute)
  // self-calibrating: remember the tallest the screen has been at this width. If iPhone later hands the app a
  // shorter window (it does after some turns), stretch the layout to the known height instead of leaving a gap.
  var SHORT_GAP = 0, SHORT_KEY = "", SHORT_BEST = 0;
  function checkShort() {
    if (document.hidden) return;
    var w = window.innerWidth, h = window.innerHeight, key = "slate-maxh-" + (w > h ? "L" : "P") + "-" + Math.round(w / 20);
    var best = 0; try { best = Number(localStorage.getItem(key)) || 0; } catch (e) {}
    if (h > best) { try { localStorage.setItem(key, String(h)); } catch (e) {} best = h; }
    var gap = h < best - 40 && best - h < 400 ? best - h : 0;
    // once the stretch is on, it stays on for this width and orientation: taking it off is what made the
    // window shrink again and flicker. Only a turn of the phone (a new width) resets it.
    if (SHORT_GAP && SHORT_KEY === key) return;
    if (!gap && !SHORT_GAP) return;
    SHORT_KEY = gap ? key : "";
    SHORT_GAP = gap; SHORT_BEST = best;
    var root = document.documentElement;
    root.classList.toggle("short-fix", !!gap);
    root.style.setProperty("--app-h", (gap ? best : h) + "px");
    root.style.setProperty("--short-gap", gap + "px");
    repinDock();
  }
  setInterval(checkShort, 3000);
  window.addEventListener("orientationchange", refit);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refit(); });
  window.addEventListener("pageshow", refit);
  window.addEventListener("focus", refit);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener("change", refit);
  function nudgeFold(d) { state.foldNudge = d === 0 ? 0 : (Number(state.foldNudge) || 0) + d; saveSettings(); applyLayout(true); toast(isDuo ? "Split moved" : "Applies when the phone is open and sideways"); }
  $("fold-left").addEventListener("click", function () { nudgeFold(-4); });
  $("fold-right").addEventListener("click", function () { nudgeFold(4); });
  $("fold-auto").addEventListener("click", function () { nudgeFold(0); });
  $("l-day-prev").addEventListener("click", function () { slideDir = "r"; setDate(shiftDate(state.date, -1)); });
  $("l-day-next").addEventListener("click", function () { slideDir = "l"; setDate(shiftDate(state.date, 1)); });
  $("l-btn-copy").addEventListener("click", function () { $("btn-copy").click(); });
  $("l-btn-add").addEventListener("click", function () { openSub("rules"); });

  setInterval(render, 60000);
  // The page listens for changes live; every 30 minutes on screen (and when you come back to it) it also re-reads
  // the day's listings, scores and previews, in case a live connection went quiet while the phone slept.
  var lastPull = Date.now();
  function pullFresh() {
    if (!db || document.hidden) return;
    lastPull = Date.now();
    var forDate = state.date;
    db.doc("slates/" + forDate).get().then(function (snap) { if (forDate === state.date && snap.exists) { state.slate = snap.data(); state.slateStatus = "ready"; render(); } }, function () {});
    SLATE_PARTS.forEach(function (k) { db.doc("slates/" + forDate + "-" + k).get().then(function (snap) { if (forDate === state.date) { state.slateParts = state.slateParts || {}; state.slateParts[k] = snap.exists ? snap.data() : null; render(); } }, function () {}); });
    db.doc("scores/" + forDate).get().then(function (snap) { if (forDate !== state.date) return; var d = snap.exists ? snap.data() : null; state.scores = d && d.games ? d.games : {}; state.scoresAt = d ? d.updatedAt : null; render(); }, function () {});
    db.doc("box/" + forDate).get().then(function (snap) { if (forDate !== state.date) return; var d = snap.exists ? snap.data() : null; state.box = d && d.games ? d.games : {}; state.boxAt = d ? d.updatedAt : null; if (state.view === "game") keepScroll(renderGame); if (document.querySelector("#lineup-body .tray")) keepScroll(renderLineup); }, function () {});
    db.doc("previews/" + forDate).get().then(function (snap) { if (forDate !== state.date) return; var d = snap.exists ? snap.data() : null; state.previews = d && d.games ? d.games : {}; state.previewsAt = d ? (d.refreshedAt || d.updatedAt) : null; renderFoot(); if (document.querySelector("#lineup-body .tray")) keepScroll(renderLineup); }, function () {});
  }
  setInterval(function () { if (Date.now() - lastPull >= 30 * 60000) pullFresh(); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && Date.now() - lastPull >= 5 * 60000) pullFresh(); });
  applyLayout(true);


  // ---------- chrome ----------
  function dayLabel(iso) {
    var t = todayInHome();
    if (iso === t) return "today"; if (iso === shiftDate(t, -1)) return "yesterday"; if (iso === shiftDate(t, 1)) return "tomorrow";
    var diff = Math.round((new Date(iso + "T12:00:00") - new Date(t + "T12:00:00")) / 86400000);
    return Math.abs(diff) < 7 ? fmtDate(iso, { weekday: "long" }) : "";
  }
  function slateName(iso) { var w = dayLabel(iso); return w ? w + "'s slate" : "the slate for " + fmtDate(iso, { month: "short", day: "numeric" }); }
  function gamesName(iso) { var w = dayLabel(iso); return w ? w.charAt(0).toUpperCase() + w.slice(1) + "'s games" : "Games for " + fmtDate(iso, { month: "short", day: "numeric" }); }
  function loadState(iso) {
    var L = state.loadReq || {};
    if ((L.loading || []).indexOf(iso) !== -1) return Date.now() - new Date(L.firedAt || 0).getTime() < 45 * 60000 ? "loading" : "failed";
    if ((L.dates || []).indexOf(iso) !== -1) return "queued";
    return "";
  }
  function requestBuild(iso) {
    if (!db || !state.isOwner) return;
    var L = state.loadReq || {};
    var body = clone(L);
    body.dates = (L.dates || []).filter(function (d) { return d !== iso; }).concat([iso]).slice(-7);
    body.loading = (L.loading || []).filter(function (d) { return d !== iso; }); body.firedAt = L.firedAt || null; body.requestedAt = new Date().toISOString();
    state.loadReq = body; render();
    db.doc("prefs/load").set(body).then(function () { toast("Building " + slateName(iso)); }, function () { state.loadReq = L; render(); toast("Couldn't ask for that day's games. Try again."); });
  }
  function emptyDay(parent) {
    var iso = state.date, past = iso < todayInHome();
    if (state.slateStatus !== "empty" || !state.isOwner || !db) { parent.appendChild(el("div", "notice", noticeText() || "No games found for this day.")); return; }
    var ls = loadState(iso), box = el("div", "notice emptyday");
    box.appendChild(el("p", null,
      ls === "queued" ? "Building " + slateName(iso) + ". The games" + (past ? " and final scores" : "") + " arrive within the hour, and this page fills in on its own." :
      ls === "loading" ? "Loading " + gamesName(iso).toLowerCase().replace(/^today/, "today") + (past ? " and final scores" : "") + " now. This page fills in on its own." :
      ls === "failed" ? gamesName(iso) + " didn't load. Try again." :
      gamesName(iso) + (past ? " and final scores" : "") + " aren't loaded yet."));
    if (!ls || ls === "failed") {
      var b = el("button", "build"); b.type = "button"; b.appendChild(icon("plus")); b.appendChild(document.createTextNode("Build " + slateName(iso)));
      b.addEventListener("click", function () { requestBuild(iso); });
      box.appendChild(b);
    } else box.appendChild(el("span", "ed-wait", ls === "queued" ? "Requested" : "Loading…"));
    parent.appendChild(box);
  }
  function noticeText() {
    var s = state.slateStatus, today = todayInHome();
    if (s === "loading") return "Loading games…";
    if (s === "timeout") return "Can't reach your games yet. Check your connection; this updates by itself.";
    if (s === "error") return "Couldn't load games. Tap Reset at the top to try again.";
    if (s === "nodb") return "Couldn't load games. Tap Reset at the top to try again.";
    if (s === "empty") return gamesName(state.date) + " aren't loaded yet." + (isDuo && state.isOwner ? " Build the slate on the left to load them." : "");
    return "";
  }
  // In the app's strip mode the menu opens from the strip's button, so it can't live inside the page's dock
  // (which moves with the toolbar): it sits on the page itself. Anywhere else it goes back in the dock.
  function placeMenuPop() {
    var mp = $("menu-pop"), fab = $("menu-fab"), strip = !!(NATIVE && NATIVE.strip);
    if (strip && mp.parentNode !== document.body) document.body.appendChild(mp);
    else if (!strip && mp.parentNode !== fab.parentNode) fab.parentNode.insertBefore(mp, fab);
  }
  function renderTop() {
    if (isDuo && state.view === "lineup") state.view = "games";
    renderBack();
    var v = state.view, today = todayInHome();
    // title (lineup + settings)
    // every page gets the same header: the Slate mark and the page's name (the slate adds its date and two buttons)
    $("title").hidden = false;
    document.documentElement.setAttribute("data-view", v);
    // Today, yesterday and tomorrow get a name; any other day is titled with its date
    var dl = dayLabel(state.date), named = /^(today|yesterday|tomorrow)$/.test(dl);
    var shortDate = fmtDate(state.date, { weekday: "short" }) + ", " + fmtDate(state.date, { month: "short", day: "numeric" });
    // today reads "Today's Slate" until 5 PM, then "Tonight's Slate" (the page re-renders every minute, so it flips on its own)
    var slateTitle = state.date === today ? (new Date().getHours() < 17 ? "Today's Slate" : "Tonight's Slate") : named ? dl.charAt(0).toUpperCase() + dl.slice(1) + "'s Slate" : shortDate;
    $("title-t").textContent = v === "news" ? "News" : v === "settings" ? setTitle() : v === "notify" ? "Notifications" : v === "tv" ? "On TV" : v === "games" ? "All games" : v === "rules" ? "Slate rules" : v === "game" ? "Matchup" : v === "feed" ? "Live feed" : v === "best" ? "Player rankings" : v === "moments" ? "Box Office" : v === "teams" ? "Teams" : v === "team" ? "Team" : v === "tabs" ? "Edit tabs" : slateTitle;
    $("l-title-t").textContent = slateTitle;
    var tl = $("title"); if (tl) tl.classList.add("has-brand");
    $("btn-rules").hidden = v !== "lineup"; $("btn-copy").hidden = v !== "lineup"; $("btn-find").hidden = !$("view-" + v);  // 3.119.0: Search on every page
    $("btn-refresh").hidden = true; $("btn-settings").hidden = true;
    $("toprow-r").classList.toggle("lineup-top", v === "lineup");
    fitTitle($("title-t")); fitTitle($("l-title-t"));
    var pg = $("btn-copy").parentNode; pg.hidden = $("btn-find").hidden; if (v !== "games") { $("btn-rules").hidden = true; $("btn-copy").hidden = true; } $("btn-more").hidden = true;
    ["l-btn-settings", "l-btn-more", "l-btn-refresh"].forEach(function (id) { var x = $(id); if (x) x.hidden = true; });
    $("title-d").hidden = isDuo || v !== "lineup";
    // every page's header has the same second line (3.31.0): the slate's date picker, the day for a page that shows
    // one day (All games, On TV, Box Office), blank elsewhere, so the mark, the name and the line under the header
    // sit in the same spots on every page and side by side on the open Duo
    var sub = $("title-sub");
    if (sub) {
      var subOn = $("title-d").hidden; sub.hidden = !subOn;
      var dd0 = v === "moments" && typeof mm !== "undefined" && mm.date ? mm.date : state.date;
      var hasDay = subOn && (v === "games" || v === "tv" || v === "moments");
      sub.textContent = hasDay ? fmtDate(dd0, { weekday: "short" }) + ", " + fmtDate(dd0, { month: "short", day: "numeric" }) : "";
      // a page without a second line gets a one-line header: the mark sized to the name and level with it, no blank row (3.44.0)
      sub.hidden = !hasDay; if (tl) tl.classList.toggle("one-line", !hasDay && $("title-d").hidden);
    }
    var away = Math.round((new Date(state.date + "T12:00:00") - new Date(today + "T12:00:00")) / 86400000);
    var dayText = named ? shortDate : away > 0 ? "In " + away + " days" : -away + " days ago";
    $("day-label").textContent = dayText; $("l-day-label").textContent = dayText;
    $("day-input").value = state.date; $("l-day-input").value = state.date;
    $("day-today").hidden = true; $("l-day-today").hidden = true;  // no Today pill in the header (the back button in the bottom corner returns to today)
    $("nav-lineup").hidden = isDuo;

    // league strip (games)
    var sp = $("strip");
    var gs = visibleGames(), present = {};
    gs.forEach(function (g) { present[g.league] = true; });
    // every league is always there to pick: ones playing today first, the rest dimmed
    var opts = filterOpts(gs);
    // until DJ picks one, the filter follows the default (My teams when any play, otherwise the first league)
    // a league you picked stays picked when you change the day, even on a day it has no games (or while the day loads)
    if (state.leagueAuto !== false || !opts.some(function (o) { return o[0] === state.league; })) { state.league = firstOpt(opts); state.leagueAuto = true; }
    // 3.97.2 (DJ's phone log: taps on the league tabs lost): the tabs are only rebuilt when they actually change, so a
    // score update never swaps a tab out from under a finger
    var spSig = JSON.stringify([opts, state.league]);
    if (sp._sig !== spSig) { sp._sig = spSig; sp.textContent = "";
    opts.forEach(function (o) {
      var b = el("button", "lg-tab" + (o[2] ? " none" : ""), o[1]); b.type = "button";
      if (o[0] === "fav") b.setAttribute("aria-label", "My teams");
      else if (o[2]) b.setAttribute("aria-label", LEAGUES[o[0]].name + ", no games");
      b.setAttribute("aria-pressed", state.league === o[0] ? "true" : "false");
      b.addEventListener("click", function () { pickFilter(o[0]); });
      sp.appendChild(b);
    });
    var eb = el("button", "lg-tab lg-edit"); eb.type = "button"; eb.setAttribute("aria-label", "Edit tabs: order and which leagues show");
    eb.appendChild(icon("sliders")); eb.addEventListener("click", function () { openSub("tabs"); }); sp.appendChild(eb); }
    sp.hidden = v !== "games" || !gs.length;

    // conference sub-strip (college leagues)
    var ssR = $("substrip"), ssX = ssR.scrollLeft, ss = document.createElement("div");  // built aside, swapped in only if it changed (3.97.2)
    var showConf = v === "games" && !!LEAGUES[state.league];
    if (v === "games" && state.league === "all") {
      if (["all", "best", "nat"].indexOf(state.conf) === -1) state.conf = "all";
      [["all", "All"], ["best", "Best of each league"], ["nat", "National TV"]].forEach(function (o) {
        var b = el("button", "cf-tab", o[1]); b.type = "button";
        b.setAttribute("aria-pressed", state.conf === o[0] ? "true" : "false");
        b.addEventListener("click", function () { state.conf = o[0]; render(); });
        ss.appendChild(b);
      });
    }
    if (showConf) {
      var lgGames = gs.filter(function (g) { return g.league === state.league; });
      var counts = {};
      if (LEAGUES[state.league].college) lgGames.forEach(function (g) { [confOf(g, "away"), confOf(g, "home")].forEach(function (c) { if (c) counts[c] = (counts[c] || 0) + 1; }); });
      var confs = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
      var copts = subOpts(state.league, lgGames);
      confs.forEach(function (c) { copts.push([c, c]); });
      if (copts.length < 2) copts = [];
      if (!copts.some(function (o) { return o[0] === state.conf; })) state.conf = "all";
      // filters with no games today go last (dimmed), after every one that has games, conferences included
      var emptyF = function (o) { return String(o[0]).indexOf("r:") === 0 && !lgGames.some(function (g) { return subHit(g, o[0]); }); };
      copts = copts.filter(function (o) { return !emptyF(o); }).concat(copts.filter(emptyF));
      copts.forEach(function (o) {
        var none0 = emptyF(o);
        var b = el("button", "cf-tab" + (none0 ? " cf-empty" : ""), o[1]); b.type = "button";
        b.setAttribute("aria-pressed", state.conf === o[0] ? "true" : "false");
        b.addEventListener("click", function () { state.conf = o[0]; render(); });
        ss.appendChild(b);
      });
    }
    if (v === "tv") {
      [["setups", "My TVs"], ["channels", "Channels"]].forEach(function (o) {
        var b = el("button", "cf-tab", o[1]); b.type = "button";
        b.setAttribute("aria-pressed", state.tvFilter === o[0] ? "true" : "false");
        b.addEventListener("click", function () { tvPick(o[0]); });
        ss.appendChild(b);
      });
    }
    var ssNew = ss.innerHTML !== ssR.innerHTML;
    if (ssNew) { ssR.textContent = ""; while (ss.firstChild) ssR.appendChild(ss.firstChild); }
    ss = ssR;
    ss.hidden = !(showConf || v === "tv" || (v === "games" && state.league === "all")) || !ss.childNodes.length;
    // a redraw used to snap the row back to its start, hiding the filter you'd just picked: keep the row where it was,
    // then make sure the picked one is in view (3.52.9)
    if (!ss.hidden && ssNew) { ss.scrollLeft = ssX; var ssOn = ss.querySelector('[aria-pressed="true"]'); if (ssOn) try { ssOn.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {} }

    // date strip (games)
    var ds = $("dates"); ds.textContent = "";
    var lo = -1, offset = Math.round((new Date(state.date + "T12:00:00") - new Date(today + "T12:00:00")) / 86400000);
    if (offset < -1 || offset > 3) lo = offset - 2;
    if (lo !== -1) { var tb = el("button", "day"); tb.type = "button"; tb.appendChild(el("div", "d", fmtDate(today, { month: "short", day: "numeric" }))); tb.appendChild(el("div", "w", "Today")); tb.addEventListener("click", function () { setDate(today); }); ds.appendChild(tb); }
    for (var i = lo; i <= lo + 4; i++) {
      (function (iso) {
        var b = el("button", "day"); b.type = "button";
        b.appendChild(el("div", "d", fmtDate(iso, { month: "short", day: "numeric" })));
        b.appendChild(el("div", "w", iso === today ? "Today" : fmtDate(iso, { weekday: "short" })));
        b.setAttribute("aria-pressed", iso === state.date ? "true" : "false");
        b.addEventListener("click", function () { setDate(iso); });
        ds.appendChild(b);
      })(shiftDate(today, i));
    }
    var cal = el("label", "day cal"); cal.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5h16V20H4zM4 10.5h16M8.5 4v4M15.5 4v4"/></svg>';
    var ci = document.createElement("input"); ci.type = "date"; ci.value = state.date; ci.setAttribute("aria-label", "Pick a date"); ci.className = "cal-in";
    ci.addEventListener("change", function () { if (ci.value) setDate(ci.value); });
    cal.appendChild(ci); cal.classList.add("dpick"); ds.appendChild(cal);
    ds.hidden = v !== "games" && v !== "tv";

    $("view-news").hidden = v !== "news";
    var ns2 = $("nav-settings2"); if (ns2) { if (v === "settings" || v === "notify" || v === "rules") ns2.setAttribute("aria-current", "page"); else ns2.removeAttribute("aria-current"); }
    ["lineup", "rules", "games", "best", "moments", "teams", "tv", "news"].forEach(function (k) { var b = $("nav-" + k); if (!b) return; if (v === k || (k === "teams" && v === "team")) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    placeMenuPop(); $("menu-pop").hidden = !state.menuOpen; $("menu-scrim").hidden = !state.menuOpen; $("menu-fab").setAttribute("aria-expanded", state.menuOpen ? "true" : "false");
    $("view-rules").hidden = v !== "rules"; $("view-game").hidden = v !== "game"; $("view-feed").hidden = v !== "feed"; $("view-best").hidden = v !== "best"; $("view-moments").hidden = v !== "moments"; $("view-teams").hidden = v !== "teams"; $("view-tabs").hidden = v !== "tabs"; $("view-team").hidden = v !== "team";
    var cnt = lineupGames().length, nc = $("nav-count"); nc.textContent = String(cnt); nc.hidden = !cnt;
    $("view-lineup").hidden = !isDuo && v !== "lineup"; $("view-games").hidden = v !== "games"; $("view-tv").hidden = v !== "tv"; $("view-settings").hidden = v !== "settings"; $("view-notify").hidden = v !== "notify";
  }
  function renderFoot() {
    // the newest of the listings, scores and previews: when the page's data last changed hands
    var last = 0;
    [state.slate && state.slate.updatedAt, state.scoresAt, state.previewsAt].forEach(function (v) { var d = new Date(v || 0).getTime(); if (!isNaN(d) && d > last) last = d; });
    var t = "Times shown in your phone's time zone.";
    if (last) {
      var d = new Date(last), sameDay = new Intl.DateTimeFormat("en-CA", { timeZone: HOME_TZ }).format(d) === new Intl.DateTimeFormat("en-CA", { timeZone: HOME_TZ }).format(new Date());
      t = "Last refresh " + (sameDay ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", ") + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " · " + t;
    }
    if (window.SLATE_SELF) t = "Live scores update every 10 seconds while the app is open. Times shown in your phone's time zone.";
    var f = $("foot"); f.textContent = "";
    f.appendChild(el("span", null, t + " "));
    if (window.SLATE_SELF && (state.view === "lineup" || isDuo)) { var up = el("span", "lo-upd"); up.id = "lo-upd"; f.appendChild(up); freshness(); }  // "Updated 12:30 PM" lives down here

    if (window.SLATE_SELF && !state.isOwner && window.slateAskPass) { var pb = el("button", "foot-refresh", "Enter passcode"); pb.type = "button"; pb.addEventListener("click", window.slateAskPass); f.appendChild(pb); }
  }
  // Reload the page: picks up the newest version of the app and the latest games, scores and previews.
  // Refresh in place: the page stays where it is and everything on it catches up in the background
  // the top refresh button resets the app: clears the phone's saved copy and reloads the newest version with fresh data
  function resetApp() {
    var btns = [$("btn-refresh"), $("l-btn-refresh")].filter(Boolean); btns.forEach(function (b) { b.classList.add("spin"); });
    toast("Resetting Slate…");
    setTimeout(function () { if (window.slateForceUpdate) window.slateForceUpdate(); else location.reload(); }, 250);
  }
  // Rebuilding a view empties it for a moment, which lets the browser snap the page to the top. Hold the scroll spot.
  function keepScroll(fn) {
    var se = document.scrollingElement || document.documentElement, pl = $("pane-l"), pr = $("pane-r");
    var wy = se.scrollTop, ly = pl ? pl.scrollTop : 0, ry = pr ? pr.scrollTop : 0;
    var main = $("main-wrap"), h = main ? main.offsetHeight : 0;
    if (main) main.style.minHeight = h + "px";
    fn();
    if (main) main.style.minHeight = "";
    if (se.scrollTop !== wy) se.scrollTop = wy;
    if (pl && pl.scrollTop !== ly) pl.scrollTop = ly;
    if (pr && pr.scrollTop !== ry) pr.scrollTop = ry;
  }
  // every card in a list gets the same right column (the widest status or channel, up to about a quarter of the row;
  // a longer channel name wraps to a second line),
  // so the scores, which sit just left of it, line up from card to card
  // slate cards: scores sit mid-card, or just right of the longest team name when that would reach them
  // the widest a column has needed for this page, day, tab and width; a filter that shows fewer cards keeps it
  var COL_KEEP = {};
  function colKeep(box, what, v) {
    var k = what + "|" + box.id;
    var key = [state.date, box.id === "games-body" ? [state.league, state.conf || "", typeof state.gamesFilter === "string" ? state.gamesFilter : "", state.q || ""].join("~") : "", box.clientWidth, getComputedStyle(box).fontSize].join("|");
    var m = COL_KEEP[k];
    if (!m || m.key !== key) m = COL_KEEP[k] = { key: key, v: 0 };
    m.v = Math.max(m.v, v);
    return m.v;
  }
  function fitScores(box) {
    if (!box) return;
    // one score column for the whole slate (3.31.0): just past the longest team name (with its rank and record) on the
    // page, the same spot on every card; names only shorten when the card is too narrow for that
    var ps = box.querySelectorAll(".g.panel"), col = 1e9, need = 0, walP = []; box.style.removeProperty("--tmw");
    if (box.id === "lineup-body") slateUnfitNames(box);
    Array.prototype.forEach.call(ps, function (p) {
      p.style.removeProperty("--tmw");
      var rows = p.querySelectorAll(".tm"); if (!rows.length) return;
      // 3.68.2: a card inside a folded time group isn't drawn (width 0); measuring it set the score column to 0
      // and the scores printed over the records on every card
      var cw = rows[0].parentElement.clientWidth; if (!cw) return;
      // 3.68.3: the Worth a look card is narrower (its box and the +), so it doesn't set the column for the slate's
      // own cards; its teams still fill the room it has
      if (p.closest(".wal-item")) walP.push([p, cw]); else col = Math.min(col, cw);
      Array.prototype.forEach.call(rows, function (r) {
        var w = r.querySelector(".nmw"), sc = r.querySelector(".sc"); if (!w || !sc) return;
        var gap = parseFloat(getComputedStyle(w).columnGap) || 4, rg = parseFloat(getComputedStyle(r).columnGap) || 8, nw = 0, n = 0;
        // (an SVG, like the team star, has no offsetWidth: measure its box instead)
        Array.prototype.forEach.call(w.children, function (c) { nw += c.classList.contains("nm") ? c.scrollWidth : (c.getBoundingClientRect().width || 0); n++; });
        nw += gap * Math.max(0, n - 1);
        var lead = 0; for (var c0 = r.firstElementChild; c0 && c0 !== w; c0 = c0.nextElementSibling) lead += (c0.getBoundingClientRect().width || 0) + rg;
        var nd = lead + nw + rg + 16 + Math.max(sc.offsetWidth || 0, 30); if (isFinite(nd)) need = Math.max(need, nd);
      });
    });
    // 3.134.3 (DJ: "Hitting the live button shifts the scores on the matchup cards"): the column was sized from the cards
    // showing, so Live (fewer cards, shorter names) moved every score. It now never gets narrower for the same day and
    // page width (colKeep), so the cards look the same with Live on or off
    if (need) need = colKeep(box, "tmw", need);
    if (need && col < 1e9) box.style.setProperty("--tmw", Math.ceil(Math.min(col, need)) + "px");
    if (need) walP.forEach(function (x) { x[0].style.setProperty("--tmw", Math.ceil(Math.min(x[1], need)) + "px"); });
    if (box.id === "lineup-body") slateFitNames(box);  // 3.68.8: names that still don't fit lose records, then shorten (170-slate-page.js)
  }
  // live score updates redraw the slate on their own: refit the scores each time
  var renderLineup0 = renderLineup; renderLineup = function () { renderLineup0.apply(this, arguments); try { fitScores($("lineup-body")); } catch (e) {} };
  function alignSides(box) {
    if (!box) return;
    var sides = box.querySelectorAll(".g > .g-side"); box.style.removeProperty("--side-w");
    if (!sides.length) return;
    // measure what each column needs (a clipped channel name reports its full width in scrollWidth)
    var max = 0; Array.prototype.forEach.call(sides, function (x) { var w = x.getBoundingClientRect().width; Array.prototype.forEach.call(x.querySelectorAll(".net, .s-cd, .s-live, .s-final"), function (n) { w = Math.max(w, n.scrollWidth + (n.offsetLeft - x.offsetLeft > 0 ? 0 : 0) + 18); }); max = Math.max(max, w); });
    if (!max) return;
    max = colKeep(box, "side", max);  // 3.134.3: the right column doesn't get narrower when Live shows fewer cards
    box.style.setProperty("--side-w", Math.ceil(Math.min(max, Math.max(108, box.clientWidth * 0.32))) + "px");
  }
  // 3.97.2: an iPhone drops a tap when the page changes under the finger (DJ's phone log). A redraw that isn't the tap's
  // own waits from touch until 0.4s after lifting (agBusy and agTapping live in 160-all-games.js), then runs once.
  var rdPending = false;
  function renderHeld() {
    if (typeof agBusy !== "function" || agTapping || !agBusy()) return false;
    if (!rdPending) { rdPending = true; (function wait() { setTimeout(function () { if (agBusy()) wait(); else { rdPending = false; render(); } }, 150); })(); }
    return true;
  }
  function render() { if (renderHeld()) return; keepScroll(function () { if (!state.rules) state.rules = normRules(); computeSlate(); updateTeamAccent(); renderTop();
    // 3.95.1 (speed): renderTop has just shown the page on screen and hidden the rest. Only pages on screen are redrawn;
    // a hidden page is redrawn when it's opened (every way of opening a page calls render). Before, each live score
    // update rebuilt all fourteen pages, which froze taps for a moment on a phone with 20 live games.
    var on = function (v) { var sc = $("view-" + v); return !sc || !sc.hidden; };
    if (on("lineup")) renderLineup(); if (on("rules")) renderRules(); if (on("game")) renderGame(); if (on("feed")) renderFeed(); if (on("best")) renderBest(); if (on("moments")) renderMoments(); if (on("teams")) renderTeams(); if (on("team")) renderTeam(); if (on("tabs")) renderTabs(); if (on("games")) renderGames(); if (on("tv")) renderTV(); if (on("news")) renderNews(); if (on("settings")) renderSettings(); if (on("notify") || on("settings")) renderNotify();  // its Settings row lives on Settings
    renderFoot(); renderBack(); if (on("lineup")) { alignSides($("lineup-body")); fitScores($("lineup-body")); } }); }


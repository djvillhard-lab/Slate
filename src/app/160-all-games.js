  var TICK = { t0: 0, dur: 0 };
  function crawl(items) {
    var box = el("div", "crawl" + (state.crawlPaused ? " paused" : "")), track = el("div", "crawl-track");
    box.setAttribute("role", "marquee"); box.setAttribute("aria-label", "Every game today, by league. Tap to pause.");
    for (var k = 0; k < 2; k++) items.forEach(function (it) { var c = k ? it.cloneNode(true) : it; if (k) c.setAttribute("aria-hidden", "true"); track.appendChild(c); });
    box.appendChild(track);
    box.addEventListener("click", function () { state.crawlPaused = !state.crawlPaused; box.classList.toggle("paused", state.crawlPaused); });
    // the page redraws often (new scores, previews…): pick the crawl up exactly where the last one was, at a steady reading speed
    function place(dur) { var now = performance.now(); track.style.setProperty("--dur", dur + "s"); track.style.animationDelay = (-(((now - TICK.t0) / 1000) % dur)) + "s"; }
    if (TICK.dur) place(TICK.dur); else track.style.visibility = "hidden";
    requestAnimationFrame(function () {
      var w = track.scrollWidth / 2; if (!w) return;
      var dur = Math.max(20, Math.round(w / 38)), now = performance.now();
      if (!TICK.dur) TICK.t0 = now;
      else if (Math.abs(dur - TICK.dur) >= 1) { var frac = (((now - TICK.t0) / 1000) % TICK.dur) / TICK.dur; TICK.t0 = now - frac * dur * 1000; }
      TICK.dur = dur; place(dur); track.style.visibility = "";
    });
    return box;
  }


  // All games filters: my teams, then the leagues playing today, then the quiet ones, then All, in DJ's order when he set one
  function filterOpts(gs) {
    var present = {}; gs.forEach(function (g) { present[g.league] = true; });
    var hid = state.hiddenLeagues || [];
    var keys = ORDER.filter(function (k) { return present[k]; });
    Object.keys(present).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
    var quiet = ORDER.filter(function (k) { return !present[k] && hid.indexOf(k) === -1; });
    var opts = [];
    if (gs.some(hasFav)) opts.push(["fav", "★"]);
    opts.push(["all", "ALL"]);
    keys.forEach(function (k) { var g0 = gs.filter(function (x) { return x.league === k; })[0]; opts.push([k, info(g0).tag]); });
    quiet.forEach(function (k) { opts.push([k, LEAGUES[k].tag, true]); });
    var ord = state.gamesOrder || [];
    if (ord.length) {
      opts = opts.map(function (o, i) { var j = ord.indexOf(o[0]); return [o[2] ? 2e3 + i : j === -1 ? 1e3 + i : j, o]; })
        .sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
    }
    return opts;
  }
  function firstOpt(opts) { var o = opts.filter(function (x) { return !x[2]; })[0]; return o ? o[0] : "all"; }
  function pickFilter(k, dir) {
    if (state.league === k) return;
    state.league = k; state.conf = "all"; state.leagueAuto = false;
    if (dir) slideIn($("games-body"), dir);
    render();
    var on = document.querySelector("#strip [aria-pressed=true]"); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center", behavior: REDUCED ? "auto" : "smooth" });
    window.scrollTo(0, 0);
  }
  function swipeFilter(step) {
    var opts = filterOpts(visibleGames()).filter(function (o) { return !o[2]; }), i = -1;
    opts.forEach(function (o, j) { if (o[0] === state.league) i = j; });
    var n = opts[i + step]; if (n) pickFilter(n[0], step > 0 ? "l" : "r");
  }
  // filters inside a league: the same choices as that league's slate rules (Settings > Slate rules), in the same order,
  // always all of them (an empty one says so). Ids look like "r:ranked:both".
  function subOpts(lg, lgGames) {
    var o = [["all", "All"]];
    (LG_OPTS[lg] || []).forEach(function (key) {
      if (key === "all" || !MATCH[key]) return;
      (CHOICES[key] || [true]).forEach(function (v) {
        o.push(["r:" + key + ":" + v, optShort(lg, key, v)]);  // always listed, so the men's and women's college hoops strips match
      });
    });
    return o;
  }
  function subHit(g, id) { var p = String(id).split(":"), v = p[2] === "true" ? true : p[2]; return !!(MATCH[p[1]] && MATCH[p[1]](g, v)); }
  // "Best of each league": a few standout games per league (your teams, ranked matchups, national TV, top teams, winning teams)
  function bestScore(g) {
    var sc = 0;
    if (hasFav(g)) sc += 100;
    if (g.awayRank && g.homeRank) sc += 30 + (50 - g.awayRank - g.homeRank) / 5; else if (g.awayRank || g.homeRank) sc += 12;
    if (natFor(g)) sc += 15;
    if (!info(g).college && MATCH.top && MATCH.top(g)) sc += 15;
    if (winRec(g, "away") && winRec(g, "home")) sc += 8;
    if (g.note && /final|semifinal|championship|cup|derby|rivalry/i.test(g.note)) sc += 10;
    return sc;
  }
  function bestOfEach(gs) {
    var by = {}, keep = {};
    gs.forEach(function (g) { (by[g.league] = by[g.league] || []).push(g); });
    Object.keys(by).forEach(function (k) {
      var l = by[k].map(function (g) { return [bestScore(g), g]; }).sort(function (a, b) { return b[0] - a[0]; });
      var top = l.filter(function (x) { return x[0] > 0; }).slice(0, 3); if (!top.length) top = l.slice(0, 1);
      top.forEach(function (x) { keep[x[1].id] = 1; });
      l.forEach(function (x) { if (x[0] >= 100) keep[x[1].id] = 1; });  // your teams always make it
    });
    return keep;
  }
  function gamesFiltered() {
    if (!state.league) state.league = firstOpt(filterOpts(visibleGames()));
    var q = state.q.trim().toLowerCase(), best = state.league === "all" && state.conf === "best" ? bestOfEach(visibleGames()) : null;
    return visibleGames().filter(function (g) {
      if (best && !best[g.id]) return false;
      if (state.league === "all" && state.conf === "nat" && !natFor(g)) return false;
      if (state.league === "fav" && !hasFav(g)) return false;
      if (state.league === "live" && status(g).kind !== "live") return false;
      if (state.league !== "all" && state.league !== "fav" && state.league !== "live" && g.league !== state.league) return false;
      if (state.league === g.league && state.conf !== "all") {
        if (String(state.conf).indexOf("r:") === 0) { if (!subHit(g, state.conf)) return false; }
        else if (info(g).college && confOf(g, "away") !== state.conf && confOf(g, "home") !== state.conf) return false;  // a conference
      }
      if (q) {
        var hay = [g.away, g.home, g.awayShort, g.homeShort, abbr(g, "away"), abbr(g, "home"), confOf(g, "away"), confOf(g, "home"), info(g).name, (g.tv || []).join(" "), g.note].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return (agRank(a) - agRank(b)) || byStart(a, b); });
  }
  // live games first, then the ones still to come, then the finished ones (the slate's order, 3.42.0)
  function agRank(g) { var k = status(g).kind; return k === "live" ? 0 : k === "over" ? 2 : 1; }
  // the slate's corner tags on every game: a slate game keeps its own reasons; any other game gets the tags your rules would give it,
  // checked against every test for its league (so an off-slate game still shows Ranked, Prime time, National TV…)
  function agTags(g) {
    if (inLineup(g.id)) return state.why[g.id] || [];
    var hits = [];
    if (hasFav(g)) hits.push(["Your team", 100]);
    (LG_OPTS[g.league] || []).forEach(function (key) {
      if (key === "all" || !MATCH[key]) return;
      var m = null; try { m = MATCH[key](g, "both") || MATCH[key](g, "top10") || MATCH[key](g, "any"); } catch (e) {}
      if (m) hits.push(m);
    });
    if (eventOn(g)) hits.push(["Event", 60]);
    hits.sort(function (a, c) { return c[1] - a[1]; });
    var seen = {}, why = []; hits.forEach(function (h) { if (!seen[h[0]]) { seen[h[0]] = 1; why.push(h[0]); } });
    return why;
  }
  // ---- One-liners on All games (3.39.0): the slate's own lines, from what's already on the phone ----
  // a missing or stale line is fetched only once its card has been on screen for a moment, so a long list costs nothing until you look at it
  var agIO = null, agFn = new WeakMap(), agT = null;
  function agSeen(row, fn) {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    if (!agIO) agIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var r = e.target; clearTimeout(r._agT);
        if (e.isIntersecting) r._agT = setTimeout(function () { var f = agFn.get(r); if (f && r.isConnected) { agIO.unobserve(r); agFn.delete(r); f(); } }, 300);
      });
    }, { rootMargin: "120px 0px" });
    agFn.set(row, fn); agIO.observe(row);
  }
  function agLine(g, kind, row) {
    var n = null;
    if (kind === "live" || kind === "over") {
      n = hlNode(g);
      if (n) { if (kind === "live") { n.classList.add("hl-live"); hlTeamInk(g, n); } return n; }  // 3.71.2: in the team's color, like the slate (3.71.0)
      if (!(kind === "over" && HLC[g.id])) agSeen(row, function () { bxNeed(g); });
      // live with a score but no line yet: the game's standout so far, from the scoreboard
      var ll = kind === "live" ? liveLeadLine(g) : "";
      if (ll) { var lk = hlLine(g, ll, teamOfText(g, ll), "hl hl-live"); if (lk) hlTeamInk(g, lk); return lk; }
      var pv0 = PV[g.id]; if (kind === "live" && pv0 && !pv0.busy && Date.now() - pv0.at > 30 * 60000) agSeen(row, function () { pvNeed(g); });  // an old preview (3.71.3: last week's rank) gets redone
      return kind === "live" && PV[g.id] && PV[g.id].text ? hlLine(g, PV[g.id].text, PV[g.id].tm, "hl hl-pre") : null;
    }
    if (kind === "upcoming") {
      var p = PV[g.id];
      if (!p || (!p.busy && Date.now() - p.at > 30 * 60000)) agSeen(row, function () { pvNeed(g); });
      if (p && p.text) n = hlLine(g, p.text, p.tm, "hl hl-pre");
    }
    return n;
  }
  // a new line arrived: redraw All games once, a moment later (several lines landing together make one redraw)
  function agRedraw() { if (state.view !== "games" && !isDuo) return; clearTimeout(agT); agT = setTimeout(function () { if ($("games-body") && $("games-body").offsetParent) keepScroll(renderGames); }, 400); }
  function renderGames() {
    var body = $("games-body"); body.textContent = "";
    if (agIO) agIO.disconnect();
    $("search").hidden = !state.showSearch && !state.q;
    if (!games().length) { if (isDuo) body.appendChild(el("div", "notice", noticeText() || "No games found for this day.")); else emptyDay(body); return; }
    var list = gamesFiltered();
    if (state.date === todayInHome()) {
      var gl = !!state.gamesLive;  // starts off every time All games opens; tap Live to narrow for now
      state.gamesLive = gl;
      var nLv = list.filter(function (g) { return status(g).kind === "live"; }).length;
      var lo = el("div", "lo-row gm-live"), lb = el("button", "lo-btn" + (gl ? " on" : "")); lb.type = "button";
      lb.setAttribute("aria-pressed", gl ? "true" : "false"); lb.setAttribute("aria-label", "Show only live games");
      lb.appendChild(el("i", "lo-dot")); lb.appendChild(el("span", null, "Live")); lb.appendChild(el("b", null, String(nLv)));
      lb.addEventListener("click", function () { state.gamesLive = !state.gamesLive; keepScroll(renderGames); });
      lo.appendChild(lb); body.appendChild(lo);
      if (gl) {
        var before = list.length; list = list.filter(function (g) { return status(g).kind === "live"; });
        if (!list.length && before) {
          var nl = el("div", "notice lo-none"); nl.appendChild(el("span", null, before === 1 ? "This game isn't live right now." : "None of these " + before + " games are live right now."));
          var sa = el("button", "pv-get", "Show all"); sa.type = "button"; sa.addEventListener("click", function () { state.gamesLive = false; keepScroll(renderGames); });
          nl.appendChild(sa); body.appendChild(nl); return;
        }
      }
    }
    if (!list.length) {
      var lgName = LEAGUES[state.league] ? LEAGUES[state.league].name : "";
      var none = lgName && !state.q && !games().some(function (g) { return g.league === state.league; });
      var dw = dayLabel(state.date), when = /^(today|yesterday|tomorrow)$/.test(dw) ? dw : dw ? "on " + dw : "on " + fmtDate(state.date, { month: "short", day: "numeric" });
      body.appendChild(el("div", "notice", none ? "No " + lgName + " games " + when + ". Pick another day above." : "No games match."));
      return;
    }
    var favs = list.filter(hasFav);
    if (favs.length && state.league !== "fav") section(body, "My teams", favs);
    var groups = {}; list.forEach(function (g) { (groups[g.league] = groups[g.league] || []).push(g); });
    // sections follow your All games tab order (else the app's usual order)
    var tabOrd = (state.gamesOrder || []).length ? state.gamesOrder.concat(ORDER) : ORDER;
    var order = tabOrd.filter(function (k, i) { return groups[k] && tabOrd.indexOf(k) === i; });
    Object.keys(groups).forEach(function (k) { if (order.indexOf(k) === -1) order.push(k); });
    order.forEach(function (k) { section(body, info(groups[k][0]).name, groups[k]); });
  }
  // league sections open and close (remembered on this phone); a single-league view is always open
  // how many cards each section shows (3.96.0); starts over for a new day, tab or filter
  var AG_SHOW = {}, AG_SHOW_FOR = "";
  function agShowKey(title) { return title; }
  function agCap(title, many) {
    var k = [state.date, state.league, state.gamesLive ? 1 : 0, state.q || ""].join("|") + "|" + (typeof state.gamesFilter === "string" ? state.gamesFilter : "");
    if (k !== AG_SHOW_FOR) { AG_SHOW = {}; AG_SHOW_FOR = k; }
    if (state.q) return 1e9;  // a search shows every match
    return AG_SHOW[agShowKey(title)] || (title === "My teams" ? 12 : many ? 6 : 20);
  }
  var COLLAPSED = (function () { try { return JSON.parse(localStorage.getItem("slate-collapsed") || "{}") || {}; } catch (e) { return {}; } })();
  function section(body, title, list) {
    var many = state.league === "all" || state.league === "live" || (state.league !== "fav" && title === "My teams");
    var shut = many && !!COLLAPSED[title];
    var sec = el(many ? "button" : "div", "sec" + (many ? " sec-tg" : "") + (shut ? " shut" : ""));
    if (many) { sec.type = "button"; sec.setAttribute("aria-expanded", shut ? "false" : "true"); }
    sec.appendChild(el("h2", null, title));
    var nLive = list.filter(function (g) { return status(g).kind === "live"; }).length;
    if (nLive) { var lv = el("span", "ch-live sec-live"); lv.appendChild(el("i")); lv.appendChild(document.createTextNode(nLive > 1 ? nLive + " live" : "Live")); sec.appendChild(lv); }
    sec.appendChild(el("span", "count", list.length + (list.length === 1 ? " game" : " games")));
    if (many) sec.appendChild(icon("more"));
    body.appendChild(sec);
    var box = el("div", "glist");
    // 3.96.0 (DJ: too many games froze the page): a section shows its first few cards (live games first, then your
    // slate's, then the rest in the usual order) and a "Show more" button adds the next batch, so the page never
    // holds more than a few dozen cards unless you ask for them
    var cap = agCap(title, many);
    var shown = list;
    if (!shut && list.length > cap) {
      var rank = function (g) { var k = status(g).kind; return k === "live" ? 0 : inLineup(g.id) ? 1 : k === "upcoming" ? 2 : 3; };
      shown = list.map(function (g, i) { return { g: g, i: i }; }).sort(function (a, b) { return rank(a.g) - rank(b.g) || a.i - b.i; }).slice(0, cap)
        .sort(function (a, b) { return a.i - b.i; }).map(function (x) { return x.g; });
    }
    if (!shut) shown.forEach(function (g) { agQ.push({ box: box, g: g, mine: title === "My teams" }); });  // 3.95.2: drawn in batches (agDraw)
    body.appendChild(box);
    if (!shut && shown.length < list.length) {
      var left = list.length - shown.length, step = many ? 10 : 20;
      var mr = el("div", "lo-none ag-more"); mr.style.margin = "4px 0 8px";
      var mb = el("button", "pv-get", "Show " + Math.min(step, left) + " more " + (left === 1 ? "game" : "games") + (left > step ? " (" + left + " left)" : ""));
      mb.type = "button";
      mb.addEventListener("click", function () { AG_SHOW[agShowKey(title)] = cap + step; keepScroll(renderGames); });
      mr.appendChild(mb); body.appendChild(mr);
    }
    if (many) sec.addEventListener("click", function () {
      if (COLLAPSED[title]) delete COLLAPSED[title]; else COLLAPSED[title] = 1;
      try { localStorage.setItem("slate-collapsed", JSON.stringify(COLLAPSED)); } catch (e) {}
      keepScroll(renderGames);
    });
  }

  // smooth open and close for anything that drops down (respects Reduce Motion)
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function slideOpen(node) {
    if (REDUCED || !node) return;
    var h = node.scrollHeight; node.style.overflow = "hidden"; node.style.height = "0px"; node.style.opacity = "0";
    node.getBoundingClientRect();
    node.style.transition = "height .24s cubic-bezier(.2,.8,.2,1), opacity .2s ease"; node.style.height = h + "px"; node.style.opacity = "1";
    setTimeout(function () { node.style.height = ""; node.style.overflow = ""; node.style.transition = ""; node.style.opacity = ""; }, 260);
  }
  function slideClose(node, done) {
    if (REDUCED || !node) { done(); return; }
    node.style.overflow = "hidden"; node.style.height = node.scrollHeight + "px"; node.getBoundingClientRect();
    node.style.transition = "height .2s cubic-bezier(.4,0,.2,1), opacity .15s ease"; node.style.height = "0px"; node.style.opacity = "0";
    setTimeout(done, 210);
  }
  function liveOnly() { if (state.liveOnly == null) { try { state.liveOnly = localStorage.getItem("slate-live-only") === "1"; } catch (e) { state.liveOnly = false; } } return !!state.liveOnly; }
  function setLiveOnly(v) { state.liveOnly = !!v; try { localStorage.setItem("slate-live-only", v ? "1" : "0"); } catch (e) {} }
  // the slate's games under time headings (the default view, and inside each league in the league view)
  // the slate opens at the top of the page; each time slot folds shut with a tap on its time, remembered for that day
  try { history.scrollRestoration = "manual"; } catch (e) {}
  var lastTouch = 0;
  ["touchstart", "wheel", "keydown"].forEach(function (ev) { window.addEventListener(ev, function () { lastTouch = Date.now(); }, { passive: true, capture: true }); });
  // ---- team names never cut short (3.68.7) ----
  // In a narrow card (the open Duo's right pane) a name like "Chargers" was cut to "Char…". After each draw, a card whose name doesn't fit
  // drops both teams' records first, and if a name still doesn't fit, both rows show the team's abbreviation instead (the record stays hidden).
  function agFitNames(only) {
    var box = $("games-body"); if (!box || !box.offsetParent) return;
    // 3.95.1 (speed): every card is reset first, then all are measured, then changed, so the phone lays the page out
    // three times in all instead of two or three times per card (143 cards froze taps for a moment)
    var cards = Array.prototype.map.call(only || box.querySelectorAll(".g.panel"), function (p) {
      var rows = Array.prototype.slice.call(p.querySelectorAll(".tm"));
      return { rows: rows, nms: rows.map(function (r) { return r.querySelector(".nm"); }).filter(Boolean), recs: rows.map(function (r) { return r.querySelector(".rec"); }).filter(Boolean) };
    }).filter(function (c) { return c.rows.length; });
    var cut = function (c) { return c.nms.some(function (n) { return n.clientWidth && n.scrollWidth > n.clientWidth; }); };  // 3.80.1: even a 1px clip shows the ellipsis
    cards.forEach(function (c) { c.recs.forEach(function (rc) { rc.style.display = ""; }); c.nms.forEach(function (n) { if (n.dataset.full) { n.textContent = n.dataset.full; delete n.dataset.full; } }); });
    var tight = cards.filter(cut);
    tight.forEach(function (c) { c.recs.forEach(function (rc) { rc.style.display = "none"; }); });
    var still = tight.filter(cut);
    still.forEach(function (c) {
      c.rows.forEach(function (r) {
        var n = r.querySelector(".nm"), b = r.querySelector(".badge"), t = b && Array.prototype.filter.call(b.childNodes, function (x) { return x.nodeType === 3 && x.nodeValue.trim(); })[0];
        if (n && t) { n.dataset.full = n.textContent; n.textContent = t.nodeValue.trim(); n.setAttribute("title", n.dataset.full); }
      });
    });
  }
  var renderGames0 = renderGames;
  // 3.95.2 (speed, DJ: All games still froze): the cards are drawn in small batches. The ones on screen (and down to
  // where you've scrolled) come first, then the rest about 12 at a time with gaps between, so a tap or a swipe is
  // never stuck behind 143 cards. A card that looks exactly the same as before is kept as it is instead of being
  // replaced, so a score update only lays out the cards that changed. The right column only widens between full
  // redraws (a new day, league or filter starts it over).
  var agQ = [], agGen = 0, agOld = {}, agBatchT = null;
  function agDraw(n) {
    var made = [];
    while (agQ.length && n-- > 0) {
      var j = agQ.shift(), row = gameRow(j.g, "games", { league: j.mine }), id = j.g.id + (j.mine ? ":mine" : ""), html = row.outerHTML;
      var old = agOld[id];
      if (old && old._agHtml === html && !row.querySelector(".tray") && !old.querySelector(".tray")) {
        if (agFn.has(row)) { agFn.set(old, agFn.get(row)); agFn.delete(row); if (agIO) agIO.observe(old); }
        if (agIO) agIO.unobserve(row);
        row = old;
      } else { row._agHtml = html; row.dataset.gid = id; made.push(row); }
      delete agOld[id];
      j.box.appendChild(row);
    }
    return made;
  }
  function agWiden(rows) {  // measure only these cards' right column; widen the page's column if one needs more
    var box = $("games-body"), sides = rows.map(function (r) { return r.querySelector(".g-side"); }).filter(function (x) { return x && x.parentNode.classList.contains("g"); });
    if (!sides.length || !box.offsetParent) return false;
    var cur = parseFloat(box.style.getPropertyValue("--side-w")) || 0;
    sides.forEach(function (x) { x.style.width = "auto"; });
    var max = 0; sides.forEach(function (x) { var w = x.getBoundingClientRect().width; Array.prototype.forEach.call(x.querySelectorAll(".net, .s-cd, .s-live, .s-final"), function (n) { w = Math.max(w, n.scrollWidth + 18); }); max = Math.max(max, w); });
    sides.forEach(function (x) { x.style.width = ""; });
    var v = max ? Math.ceil(Math.min(max, Math.max(108, box.clientWidth * 0.32))) : 0;
    if (v > cur) { box.style.setProperty("--side-w", v + "px"); return true; }
    return false;
  }
  // 3.96.0: never redraw under a finger. A redraw replaces the Live button, the headers and changed cards; if that
  // happens between touching one and letting go, the tap is lost (DJ: "can't select games or hit the live button").
  // A redraw asked for while a finger is down waits until it lifts.
  var agDown = false, agPending = false;
  ["pointerdown", "touchstart"].forEach(function (t) { window.addEventListener(t, function () { agDown = true; }, { capture: true, passive: true }); });
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach(function (t) { window.addEventListener(t, function () {
    agDown = false;
    if (agPending) setTimeout(function () { if (agDown || !agPending) return; agPending = false; if ($("games-body") && $("games-body").offsetParent) keepScroll(renderGames); }, 60);
  }, { capture: true, passive: true }); });
  renderGames = function () {
    if (agDown && $("games-body") && $("games-body").childNodes.length) { agPending = true; return; }
    agPending = false;
    var body = $("games-body"), gen = ++agGen; clearTimeout(agBatchT);
    agOld = {}; if (body) Array.prototype.forEach.call(body.querySelectorAll(".g.panel[data-gid]"), function (r) { agOld[r.dataset.gid] = r; });
    var had = Object.keys(agOld).length;
    agQ = [];
    renderGames0.apply(this, arguments);
    var y = window.scrollY || 0, made = agDraw(Math.max(16, Math.ceil((y + 2 * (window.innerHeight || 800)) / 90)));
    var kept = body ? body.querySelectorAll(".g.panel").length - made.length : 0;
    try {
      if (!had || !kept) { alignSides(body); agFitNames(); }  // a fresh page: size the column from what's drawn
      else if (agWiden(made)) agFitNames(); else agFitNames(made);
    } catch (e) {}
    var more = function () {
      if (gen !== agGen) return;
      var m = agDraw(12);
      try { if (agWiden(m)) agFitNames(); else agFitNames(m); } catch (e) {}
      if (agQ.length) agBatchT = setTimeout(more, 24);
    };
    if (agQ.length) agBatchT = setTimeout(more, 24);
    if (!had) agFitLater();  // the late re-fit is only for a fresh page (fonts and watch links settling)
  };
  // and once more after the page settles (3.80.1: the watch links and the fonts can widen the right column after the first fit)
  var agFitT2 = null;
  function agFitLater() { clearTimeout(agFitT2); agFitT2 = setTimeout(function () { try { agFitNames(); } catch (e) {} }, 120); }
  try { document.fonts && document.fonts.ready.then(agFitLater); } catch (e) {}
  var agFitT = null;
  window.addEventListener("resize", function () { clearTimeout(agFitT); agFitT = setTimeout(function () { try { agFitNames(); } catch (e) {} }, 300); });

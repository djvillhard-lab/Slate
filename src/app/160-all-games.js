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
    }).sort(byStart);
  }
  function renderGames() {
    var body = $("games-body"); body.textContent = "";
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
    if (!shut) list.forEach(function (g) { box.appendChild(gameRow(g, "games", { league: title === "My teams" })); });
    body.appendChild(box);
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

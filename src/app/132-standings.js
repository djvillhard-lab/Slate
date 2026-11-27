  // Standings and playoff picture (3.102.0): on All games since 3.174.0 (DJ: "Standings shouldn't be in teams page"); the
  // Standings button in the row with Live flips the page from games to standings. It was a tab on the Teams page. Every number is ESPN's own standings feed;
  // nothing is worked out here except the order (ESPN's seed or rank) and where the playoff line falls.
  var SDG = { cache: {}, lg: "", div: {}, conf: {} };
  var SDG_LGS = ["nfl", "nba", "nhl", "mlb", "ncaaf", "ncaam", "ncaaw", "epl", "mls", "wnba", "laliga", "seriea", "bundesliga", "ligue1"];
  var SDG_DIV = { nfl: 1, nba: 1, nhl: 1, mlb: 1 };  // leagues with divisions inside each conference
  // how many teams per conference reach the playoffs (league rules, not a stat): [after seed, label]
  var SDG_LINES = { nfl: [[7, "Playoff line"]], nba: [[6, "Playoff line"], [10, "Play-in line"]], wnba: [[8, "Playoff line"]], nhl: [[8, "Playoff line"]], mlb: [[6, "Playoff line"]] };
  var SDG_CSS = "" +
    ".sdg-lgs { margin-bottom: 4px; } #games-body .lo-row .sdg-btn { margin-right: auto; } #games-body .lo-row .ag2-btn:has(+ .sdg-btn) { margin-right: 8px; } .lo-btn.sdg-btn svg { flex: none; } #games-body .lo-btn.sdg-btn.on { border-color: var(--accent) !important; color: var(--accent) !important; background: none !important; }" +
    ".sdg-grp { margin: 16px 0 0; }" +
    ".sdg-grp h3 { font-size: 15px; font-weight: 800; color: var(--head); margin: 0 0 6px; }" +
    ".sdg-row { display: grid; grid-template-columns: 22px minmax(0, 1fr) repeat(var(--sdg-n, 3), minmax(38px, auto)); gap: 8px; align-items: center; width: 100%; min-height: 44px; padding: 4px 8px; border: 0; border-radius: 8px; background: none; color: var(--head); font: inherit; font-size: 13px; font-variant-numeric: tabular-nums; text-align: left; }" +
    ".sdg-row + .sdg-row { border-top: 1px solid var(--hair); border-radius: 0; }" +
    ".sdg-row.on { background: color-mix(in srgb, var(--accent-fill) 16%, transparent); color: var(--ink); border-radius: 8px; border-top-color: transparent; }" +
    ".sdg-row.on + .sdg-row { border-top-color: transparent; }" +
    ".sdg-hd { min-height: 0; padding-top: 0; padding-bottom: 4px; color: var(--dim); font-size: 11px; font-weight: 700; }" +
    ".sdg-rk { color: var(--dim); font-weight: 700; }" +
    ".sdg-tm { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 15px; font-weight: 700; color: var(--ink); }" +
    ".sdg-tm .n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }" +
    ".sdg-c { text-align: right; white-space: nowrap; }" +
    ".sdg-c.b { font-weight: 800; color: var(--ink); }" +
    ".sdg-line { display: flex; align-items: center; gap: 8px; margin: 2px 0; font-size: 11px; font-weight: 700; color: var(--dim); }" +
    ".sdg-line::before, .sdg-line::after { content: ''; flex: 1; border-top: 1px dashed var(--line); }" +
    ".sdg-zone { margin: 8px 0 2px 8px; font-size: 11px; font-weight: 700; color: var(--dim); }" +
    ".tm-stl { display: block; text-align: left; padding: 4px 0; min-height: 28px; }" +
    ".sdg-src { margin: 16px 0 0; font-size: 12px; color: var(--dim); }";
  (function () { var st = document.createElement("style"); st.id = "sdg-css"; st.textContent = SDG_CSS; document.head.appendChild(st); })();

  function sdgUrl(lg, div) { return "https://site.api.espn.com/apis/v2/sports/" + bxBase(lg) + "/standings" + (div ? "?level=3" : ""); }
  function sdgLoad(lg, div) {
    var key = lg + (div ? "|d" : ""), c = SDG.cache[key];
    if (c && (c.data || c.busy) && Date.now() - c.at < 600000) return c;
    c = SDG.cache[key] = { at: Date.now(), busy: true, data: c ? c.data : null };
    fetch(sdgUrl(lg, div)).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
      c.busy = false; c.at = Date.now(); if (d) c.data = sdgParse(d); else c.failed = !c.data;
      if (sdgShowing()) keepScroll(renderGames);
    });
    return c;
  }
  function sdgParse(d) {
    var groups = [];
    (function walk(n, up) {
      (n.children || []).forEach(function (c) { walk(c, n.name && n !== d ? n.name : ""); });
      var es = (n.standings || {}).entries; if (!es || !es.length) return;
      var rows = es.map(function (e) {
        var st = {}; (e.stats || []).forEach(function (x) { if (x && x.name && !(x.name in st)) st[x.name] = x.displayValue != null ? String(x.displayValue) : ""; });
        var t = e.team || {};
        return { name: t.displayName || t.name || "", short: t.shortDisplayName || t.displayName || "", abbr: t.abbreviation || "", st: st, note: (e.note || {}).description || "" };
      });
      var num = function (r, k) { var v = parseFloat(r.st[k]); return isFinite(v) && v > 0 ? v : null; };
      var key = rows.every(function (r) { return num(r, "rank") != null; }) ? "rank" : rows.every(function (r) { return num(r, "playoffSeed") != null; }) ? "playoffSeed" : "";
      if (key) rows.sort(function (a, b) { return num(a, key) - num(b, key); });
      groups.push({ name: String(n.name || "").replace(/^\d{4}(-\d{2})? /, ""), seeded: key === "playoffSeed", rows: rows });
    })(d, "");
    return groups;
  }
  // the columns each sport's table shows: [label, value(row), bold]
  function sdgCols(lg) {
    var sp = BX_SPORT[lg], S = function (k) { return function (r) { return r.st[k] || ""; }; };
    var rec = function (r) { var o = (r.st.overall || "").split(",")[0]; return o || (r.st.wins != null && r.st.losses != null ? r.st.wins + "-" + r.st.losses : ""); };
    if (sp === "soccer") return [["W-D-L", rec], ["GD", S("pointDifferential")], ["Pts", S("points"), 1]];  // no games-played column: W-D-L adds up to it, and it cut club names short on a phone
    if (sp === "hockey") return [["GP", S("gamesPlayed")], ["W-L-OTL", rec], ["Pts", S("points"), 1], ["Strk", S("streak")]];
    if ((LEAGUES[lg] || {}).college) return [["Overall", rec, 1], ["Conf", S("vs. Conf.")], ["Strk", S("streak")]];
    if (sp === "football") return [["W-L", rec, 1], ["Diff", S("pointDifferential")], ["Strk", S("streak")]];
    return [["W-L", rec, 1], ["GB", S("gamesBehind")], ["Strk", S("streak")]];
  }
  function sdgZone(s) { return String(s || "").replace(/^Qualifies for /, "").replace(/ Best-of-\d+ series$/i, "").replace(/ Matches$/, "").replace(" - ", ": "); }
  function sdgDefaultLg() {
    var mine = myTeamList().map(function (t) { return t.lg; }).filter(function (l) { return SDG_LGS.indexOf(l) !== -1; });
    var today = {}; games().forEach(function (g) { today[g.league] = 1; });
    return mine.filter(function (l) { return today[l]; })[0] || mine[0] || SDG_LGS.filter(function (l) { return today[l]; })[0] || "nfl";
  }
  function openStandings(lg) {
    if (lg && SDG_LGS.indexOf(lg) !== -1) SDG.lg = lg;
    state.agStand = true; SDG.agLg = state.league;
    if (state.view === "games") keepScroll(renderGames); else openSub("games");
    if (isDuo) { var pr = $("pane-r"); if (pr) pr.scrollTop = 0; } else window.scrollTo(0, 0);
  }
  // is All games showing standings right now? (not on a golf or F1 tab, which have none)
  function sdgShowing() { return state.view === "games" && !!state.agStand && !(typeof EV_SPORTS !== "undefined" && EV_SPORTS[state.league]); }
  // the Standings button in All games' Live row: flips the page between games and standings
  function sdgBtn() {
    var on = !!state.agStand, b = el("button", "lo-btn sdg-btn" + (on ? " on" : "")); b.type = "button";
    b.setAttribute("aria-pressed", on ? "true" : "false"); b.setAttribute("aria-label", on ? "Back to games" : "Show standings");
    b.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 3.5h1.5M2 8h1.5M2 12.5h1.5M6 3.5h8M6 8h6M6 12.5h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    b.appendChild(el("span", null, "Standings"));
    b.addEventListener("click", function () { state.agStand = !state.agStand; if (state.agStand) SDG.agLg = ""; keepScroll(renderGames); });
    return b;
  }
  // All games in standings mode: the Standings button (lit) to go back, then the league's tables
  function sdgGames(body) {
    // follow the league picked on All games, when it has standings, each time that pick changes
    if (SDG.agLg !== state.league) { SDG.agLg = state.league; if (SDG_LGS.indexOf(state.league) !== -1) SDG.lg = state.league; }
    var lo = el("div", "lo-row gm-live"); lo.appendChild(sdgBtn()); body.appendChild(lo);
    sdgRender(body);
  }
  function sdgRender(body) {
    var lg = SDG.lg && SDG_LGS.indexOf(SDG.lg) !== -1 ? SDG.lg : (SDG.lg = sdgDefaultLg());
    var tabs = el("div", "substrip sdg-lgs");
    SDG_LGS.forEach(function (k) {
      var b = el("button", "cf-tab", LEAGUES[k].tag); b.type = "button"; b.setAttribute("aria-pressed", k === lg ? "true" : "false"); b.setAttribute("aria-label", LEAGUES[k].name + " standings");
      b.addEventListener("click", function () { SDG.lg = k; keepScroll(renderGames); });
      tabs.appendChild(b);
    });
    body.appendChild(tabs);
    setTimeout(function () { var on = tabs.querySelector('[aria-pressed="true"]'); if (!on) return; var a = on.getBoundingClientRect(), b = tabs.getBoundingClientRect(); if (a.right > b.right - 24 || a.left < b.left) tabs.scrollLeft += a.left - b.left - 16; }, 0);
    if (brkSeg(body, lg)) return;  // a league with playoffs going gets Table / Bracket (133-brackets.js)
    var hasDiv = !!SDG_DIV[lg], div = hasDiv && !!SDG.div[lg];
    if (hasDiv) {
      var sg = el("div", "seg segw2");
      [[0, "Playoff picture"], [1, "Divisions"]].forEach(function (o) {
        var b = el("button", null, o[1]); b.type = "button"; b.setAttribute("aria-pressed", !!o[0] === div ? "true" : "false");
        b.addEventListener("click", function () { SDG.div[lg] = !!o[0]; keepScroll(renderGames); });
        sg.appendChild(b);
      });
      body.appendChild(sg);
    }
    var c = sdgLoad(lg, div), groups = c.data;
    if (!groups) { body.appendChild(el("p", "notice", c.failed ? "Standings didn't load. Check the connection and tap Standings again." : "Loading standings…")); return; }
    if (!groups.length) { body.appendChild(el("p", "notice", "ESPN has no " + LEAGUES[lg].name + " standings right now.")); return; }
    var mine = myTeamList().filter(function (t) { return t.lg === lg; });
    var isMine = function (r) { return mine.some(function (t) { return teamMatch(r.name, t.name, lg) || teamMatch(r.short, t.name, lg); }); };
    // college: one conference at a time, the person's conferences first
    if ((LEAGUES[lg] || {}).college && groups.length > 1) {
      var ord = groups.map(function (g, i) { return [g.rows.some(isMine) ? 0 : 1, i, g]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; });
      var pick = ord.filter(function (g) { return g.name === SDG.conf[lg]; })[0] || ord[0];
      var cs = el("div", "substrip");
      ord.forEach(function (g) {
        var b = el("button", "cf-tab", g.name.replace(/ Conference$/, "")); b.type = "button"; b.setAttribute("aria-pressed", g === pick ? "true" : "false");
        b.addEventListener("click", function () { SDG.conf[lg] = g.name; keepScroll(renderGames); });
        cs.appendChild(b);
      });
      body.appendChild(cs);
      groups = [pick];
    }
    var cols = sdgCols(lg), lines = !div && SDG_LINES[lg] || [];
    groups.forEach(function (gr) {
      var box = el("div", "sdg-grp"); box.style.setProperty("--sdg-n", String(cols.length));
      box.appendChild(el("h3", null, gr.name));
      var hd = el("div", "sdg-row sdg-hd"); hd.appendChild(el("span")); hd.appendChild(el("span"));
      cols.forEach(function (cdef) { hd.appendChild(el("span", "sdg-c", cdef[0])); });
      box.appendChild(hd);
      var zone = "";
      gr.rows.forEach(function (r, i) {
        if (r.note !== zone) { zone = r.note; if (zone) box.appendChild(el("div", "sdg-zone", sdgZone(zone))); }
        var row = el("button", "sdg-row" + (isMine(r) ? " on" : "")); row.type = "button"; row.setAttribute("aria-label", r.name + ", " + (i + 1));
        row.appendChild(el("span", "sdg-rk", String(i + 1)));
        var tm = el("span", "sdg-tm"); tm.appendChild(badgeFor(r.abbr, r.name)); tm.appendChild(el("span", "n", r.short)); row.appendChild(tm);
        cols.forEach(function (cdef) { row.appendChild(el("span", "sdg-c" + (cdef[2] ? " b" : ""), cdef[1](r) || "–")); });
        row.addEventListener("click", function () { openTeam(r.name, lg); });
        box.appendChild(row);
        if (gr.seeded) lines.forEach(function (ln) { if (i + 1 === ln[0] && gr.rows.length > ln[0]) box.appendChild(el("div", "sdg-line", ln[1])); });
      });
      body.appendChild(box);
    });
    body.appendChild(el("p", "sdg-src", "Standings from ESPN. Tap a team for its page."));
  }

  // Playoff brackets (3.114.0): a Bracket view beside the table in Teams → Standings. MLS first (DJ, Nov 19, 2026).
  // Every team, game and result is ESPN's own playoff schedule (the league scoreboard, month by month); seeds are
  // ESPN's standings rank. The only thing worked out here is where a series sits in the tree, which is the league's
  // fixed bracket (1/8 and 4/5 meet, 2/7 and 3/6 meet, no reseeding), and who has already won a series.
  var BRK = { cache: {}, view: {}, sel: {} };
  var BRK_LGS = {
    mls: {
      cup: "MLS Cup",
      confs: [["E", "Eastern Conference"], ["W", "Western Conference"]],
      // round from ESPN's season slug: 0 wild card, 1 round one, 2 conference semifinal, 3 conference final, 4 MLS Cup
      round: function (slug) { return /wild-?card/.test(slug) ? 0 : /round-one/.test(slug) ? 1 : /semi/.test(slug) ? 2 : /eastern|western/.test(slug) && /final/.test(slug) ? 3 : /cup|final/.test(slug) ? 4 : -1; },
      conf: function (slug) { return /^eastern/.test(slug) ? "E" : /^western/.test(slug) ? "W" : ""; },
      rounds: ["Wild card", "Round one", "Conference semifinals", "Conference final", "MLS Cup"],
      best: [1, 3, 1, 1, 1],           // round one is a best-of-3 series (ESPN's standings note says so too)
      slot1: { 1: 0, 8: 0, 4: 1, 5: 1, 2: 2, 7: 2, 3: 3, 6: 3 },  // seed → round-one slot, top to bottom
      wildFor: 1                       // the wild-card winner plays this seed
    }
  };
  var BRK_CSS = "" +
    ".brk-conf { margin: 18px 0 0; }" +
    ".brk-conf > h3 { font-size: 15px; font-weight: 800; color: var(--head); margin: 0 0 4px; }" +
    ".brk-rh { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 14px; margin: 0 0 4px; font-size: 11px; font-weight: 700; color: var(--dim); }" +
    ".brk-tree { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(4, auto); gap: 8px 14px; }" +
    ".brk-cell { position: relative; display: flex; align-items: center; min-width: 0; }" +
    ".brk-cell.c2::before, .brk-cell.c3::before { content: ''; position: absolute; left: -14px; width: 7px; top: 25%; bottom: 25%; border: 1px solid var(--line); border-left: 0; }" +
    ".brk-cell.c2::after, .brk-cell.c3::after { content: ''; position: absolute; left: -7px; width: 7px; top: 50%; border-top: 1px solid var(--line); }" +
    ".brk-m { position: relative; display: block; height: auto; width: 100%; min-width: 0; padding: 3px 4px; border: 1px solid var(--hair); border-radius: 8px; background: var(--card); color: var(--ink); font: inherit; text-align: left; }" +
    ".brk-m.brk-on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }" +
    ".brk-t { display: flex; align-items: center; gap: 4px; min-height: 28px; min-width: 0; }" +
    ".brk-t + .brk-t { border-top: 1px solid var(--hair); }" +
    ".brk-t .badge { flex: none; }" +
    ".brk-sd { flex: none; width: 10px; font-size: 11px; font-weight: 700; color: var(--dim); text-align: right; }" +
    ".brk-ab { flex: 1; min-width: 0; overflow: hidden; text-overflow: clip; white-space: nowrap; font-size: 13px; font-weight: 800; font-stretch: 78%; }" +
    ".brk-w { flex: none; font-size: 15px; font-weight: 800; font-stretch: 66%; }" +
    ".brk-t.mine { background: color-mix(in srgb, var(--accent-fill) 16%, transparent); border-radius: 4px; }" +
    ".brk-t.out { opacity: 0.55; } .brk-t.out .brk-ab, .brk-t.out .brk-w { color: var(--muted); }" +
    ".brk-t.tbd .brk-ab { color: var(--dim); font-weight: 700; }" +
    ".brk-live { position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--live); }" +
    ".brk-wc { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: center; margin: 0 0 10px; }" +
    ".brk-wc p { grid-column: span 2; margin: 0; font-size: 12px; color: var(--dim); }" +
    ".brk-cup { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: center; }" +
    ".brk-cup p { grid-column: span 2; margin: 0; font-size: 12px; color: var(--dim); }" +
    ".brk-det { margin: 12px 0 0; padding: 8px 0 0; border-top: 1px solid var(--hair); }" +
    ".brk-det h4 { margin: 0 0 2px; font-size: 15px; font-weight: 800; color: var(--head); }" +
    ".brk-det .st { margin: 0 0 4px; font-size: 13px; color: var(--muted); }" +
    ".brk-tm { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px; padding: 0; border: 0; background: none; color: var(--ink); font: inherit; font-size: 16px; font-weight: 800; text-align: left; }" +
    ".brk-tm .n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }" +
    ".brk-tm .sd { font-size: 12px; font-weight: 700; color: var(--dim); }" +
    ".brk-g { display: grid; grid-template-columns: 62px minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 40px; border-top: 1px solid var(--hair); font-size: 13px; }" +
    ".brk-g .gn { font-weight: 800; color: var(--ink); }" +
    ".brk-g .gd { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }" +
    ".brk-g .gr { text-align: right; font-weight: 700; color: var(--ink); white-space: nowrap; }" +
    ".brk-g .gr.live { color: var(--live); }";
  (function () { var st = document.createElement("style"); st.id = "brk-css"; st.textContent = BRK_CSS; document.head.appendChild(st); })();

  function brkMonths() {
    var d = new Date(), out = [];
    [-1, 0, 1].forEach(function (k) { var x = new Date(d.getFullYear(), d.getMonth() + k, 1); out.push(x.getFullYear() + String(x.getMonth() + 1).padStart(2, "0")); });
    return out;
  }
  // the league's playoff games: ESPN's scoreboard for last month, this month and next (ESPN takes a whole month at once for soccer)
  function brkLoad(lg) {
    var c = BRK.cache[lg], ttl = c && c.live ? 60000 : 600000;
    if (c && (c.busy || (c.events && Date.now() - c.at < ttl))) return c;
    c = BRK.cache[lg] = { at: Date.now(), busy: true, events: c ? c.events : null, live: c && c.live };
    Promise.all(brkMonths().map(function (m) { return rkFetch(bxApi(lg, "scoreboard?dates=" + m + "&limit=300")); })).then(function (rs) {
      var cfg = BRK_LGS[lg], seen = {}, evs = [];
      rs.forEach(function (j) { ((j || {}).events || []).forEach(function (e) {
        var slug = String((e.season || {}).slug || "");
        if (seen[e.id] || !/playoff|cup|final/.test(slug) || cfg.round(slug) < 0) return;
        if (/CANCEL|POSTPONED/.test(((((e.competitions || [])[0] || {}).status || {}).type || {}).name || "")) return;  // a game 3 that wasn't needed
        seen[e.id] = 1; evs.push(e);
      }); });
      var yr = Math.max.apply(null, evs.map(function (e) { return (e.season || {}).year || 0; }).concat([0]));
      evs = evs.filter(function (e) { return ((e.season || {}).year || 0) === yr; }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      c.busy = false; c.at = Date.now(); c.failed = rs.every(function (j) { return !j; }) && !c.events; c.events = evs;
      c.live = evs.some(function (e) { return brkState(e) === "in"; });
      if (state.view === "teams" && state.teamsTab === "standings" && SDG.lg === lg) keepScroll(renderTeams);
    });
    return c;
  }
  function brkState(e) { return ((((e.competitions || [])[0] || {}).status || {}).type || {}).state || ""; }
  function brkTbd(t) { return !t || /^TBD/i.test(t.displayName || t.name || ""); }
  // series (one per pairing per round) built from the games, with the seeds from the standings
  function brkBuild(lg, events, groups) {
    var cfg = BRK_LGS[lg], seed = {}, confOf = {};
    (groups || []).forEach(function (g) {
      var cf = /east/i.test(g.name) ? "E" : /west/i.test(g.name) ? "W" : "";
      g.rows.forEach(function (r) { var k = parseInt(r.st.rank, 10); if (r.abbr) { if (k > 0) seed[r.abbr] = k; confOf[r.abbr] = cf; } });
    });
    var series = [];
    events.forEach(function (e) {
      var slug = String((e.season || {}).slug || ""), rd = cfg.round(slug), typ = String((e.season || {}).type || slug);
      var cs = ((e.competitions || [])[0] || {}).competitors || [], real = cs.filter(function (x) { return !brkTbd(x.team); });
      var ids = real.map(function (x) { return String(x.team.id); });
      // a game joins the series of the same round type that already has one of its teams
      var s = series.filter(function (s2) { return s2.typ === typ && ids.some(function (id) { return s2.teams[id]; }); })[0];
      if (!s && rd >= 1 && ids.length < 2) s = series.filter(function (s2) { return s2.typ === typ; })[0];  // ESPN gives each round-one series its own type
      if (!s) { s = { typ: typ, rd: rd, conf: cfg.conf(slug), teams: {}, order: [], games: [] }; series.push(s); }
      real.forEach(function (x) {
        var id = String(x.team.id), t = x.team;
        if (!s.teams[id]) { s.teams[id] = { id: id, name: t.displayName || t.name || "", short: t.shortDisplayName || t.displayName || "", abbr: t.abbreviation || "", seed: seed[t.abbreviation] || 0, wins: 0 }; s.order.push(id); }
      });
      s.games.push(e);
    });
    series.forEach(function (s) {
      if (!s.conf) { var a = s.order.map(function (id) { return confOf[s.teams[id].abbr]; }).filter(Boolean); s.conf = s.rd === 4 ? "" : a[0] || ""; }
      s.games.forEach(function (e) { if (brkState(e) !== "post") return; (((e.competitions || [])[0] || {}).competitors || []).forEach(function (x) { var t = s.teams[String((x.team || {}).id)]; if (t && x.winner) t.wins++; }); });
      s.best = cfg.best[s.rd] || 1; s.need = Math.ceil(s.best / 2) || 1;
      s.winner = s.order.filter(function (id) { return s.teams[id].wins >= s.need; })[0] || "";
      s.live = s.games.some(function (e) { return brkState(e) === "in"; });
      s.key = s.rd + "|" + s.typ + "|" + s.order.slice().sort().join("-");
      // higher seed on top
      s.order.sort(function (a, b) { return (s.teams[a].seed || 99) - (s.teams[b].seed || 99); });
    });
    return series;
  }
  function brkTop(s) { return s.order.length ? Math.min.apply(null, s.order.map(function (id) { return s.teams[id].seed || 99; })) : 99; }
  // the two teams in a series slot, as [team or null, ...]; a slot with no games yet takes the winners that feed it
  function brkSide(s) { return s ? s.order.map(function (id) { return s.teams[id]; }) : []; }
  function brkWinnerOf(s) { return s && s.winner ? s.teams[s.winner] : null; }
  function brkBox(lg, s, teams, label, mine) {
    var cfg = BRK_LGS[lg], b = el("button", "brk-m"), key = s ? s.key : "", show = state.showScores;
    b.type = "button";
    if (key && BRK.sel[lg] === key) b.classList.add("brk-on");
    var names = [];
    for (var i = 0; i < 2; i++) {
      var t = teams[i], r = el("span", "brk-t");
      if (t) {
        names.push(t.short);
        if (mine(t)) r.classList.add("mine");
        if (show && s && s.winner && s.winner !== t.id) r.classList.add("out");
        r.appendChild(el("span", "brk-sd", t.seed ? String(t.seed) : ""));
        r.appendChild(badgeFor(t.abbr, t.name));
        r.appendChild(el("span", "brk-ab", t.abbr));
        if (show && s && s.games.some(function (e) { return brkState(e) === "post"; })) r.appendChild(el("span", "brk-w", String(t.wins)));
      } else {
        r.classList.add("tbd"); r.appendChild(el("span", "brk-sd", "")); r.appendChild(el("span", "brk-ab", label && label[i] || "TBD"));
      }
      b.appendChild(r);
    }
    if (s && s.live) b.appendChild(el("span", "brk-live"));
    b.setAttribute("aria-label", (names.length ? names.join(" vs ") : "To be decided") + (s ? ", " + cfg.rounds[s.rd] : ""));
    if (s) b.addEventListener("click", function () { BRK.sel[lg] = BRK.sel[lg] === key ? "none" : key; keepScroll(renderTeams); });
    else b.disabled = true;
    return b;
  }
  function brkGameRow(e, i, s) {
    var c = (e.competitions || [])[0] || {}, cs = c.competitors || [], st = brkState(e), r = el("div", "brk-g");
    var d = new Date(e.date);
    r.appendChild(el("span", "gn", s.best > 1 ? "Game " + (i + 1) : "Match"));
    var home = cs.filter(function (x) { return x.homeAway === "home"; })[0] || {}, away = cs.filter(function (x) { return x.homeAway === "away"; })[0] || {};
    var at = brkTbd(home.team) ? "" : " · at " + ((home.team || {}).shortDisplayName || (home.team || {}).abbreviation || "");
    r.appendChild(el("span", "gd", d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + at));
    var sv = function (x) { return x.score && typeof x.score === "object" ? x.score.displayValue : x.score; };
    if (st === "post") {
      var txt = "Final";
      if (state.showScores) {
        var a = (away.team || {}).abbreviation || "", h = (home.team || {}).abbreviation || "";
        txt = a + " " + sv(away) + "-" + sv(home) + " " + h;
        if (away.shootoutScore != null && home.shootoutScore != null) txt += " (" + away.shootoutScore + "-" + home.shootoutScore + " pens)";
      }
      r.appendChild(el("span", "gr", txt));
    } else if (st === "in") {
      r.appendChild(el("span", "gr live", "Live" + (state.showScores ? " · " + ((home.team || {}).abbreviation || "") + " " + sv(home) + "-" + sv(away) + " " + ((away.team || {}).abbreviation || "") : "")));
    } else {
      var tv = []; (c.broadcasts || []).forEach(function (b) { var n = (b.media || {}).shortName || ((b.names || [])[0]); if (n && tv.indexOf(n) === -1) tv.push(n); });
      var detail = ((c.status || {}).type || {}).detail || "";
      r.appendChild(el("span", "gr", /TBD|TBA/i.test(detail) ? "Time TBD" : timeText(e.date) + (tv.length ? " · " + tv[0] : "")));
    }
    return r;
  }
  // the chosen series under its tree: the two teams (tap for the team page) and every game
  function brkDetail(lg, s, mine) {
    var cfg = BRK_LGS[lg], box = el("div", "brk-det"), show = state.showScores;
    box.appendChild(el("h4", null, cfg.rounds[s.rd] + (s.best > 1 ? " · best of " + s.best : "")));
    var ts = brkSide(s), st = "";
    if (show && ts.length === 2 && s.games.some(function (e) { return brkState(e) === "post"; })) {
      var a = ts[0], b = ts[1];
      if (s.winner) st = s.teams[s.winner].short + (s.best > 1 ? " won the series " + Math.max(a.wins, b.wins) + "-" + Math.min(a.wins, b.wins) : s.rd === 4 ? " won " + cfg.cup : " advanced");
      else if (s.best > 1) st = a.wins === b.wins ? "Series tied " + a.wins + "-" + b.wins : (a.wins > b.wins ? a : b).short + " leads " + Math.max(a.wins, b.wins) + "-" + Math.min(a.wins, b.wins);
    }
    if (st) box.appendChild(el("p", "st", st));
    ts.forEach(function (t) {
      var r = el("button", "brk-tm"); r.type = "button"; r.setAttribute("aria-label", "Open the " + t.name + " team page");
      r.appendChild(badgeFor(t.abbr, t.name)); r.appendChild(el("span", "n", t.name)); if (t.seed) r.appendChild(el("span", "sd", "Seed " + t.seed));
      r.addEventListener("click", function () { openTeam(t.name, lg); });
      box.appendChild(r);
    });
    s.games.forEach(function (e, i) { box.appendChild(brkGameRow(e, i, s)); });
    return box;
  }
  // the Table / Bracket choice for a league with a bracket going; returns true when it drew the bracket
  function brkSeg(body, lg) {
    if (!BRK_LGS[lg]) return false;
    var c = brkLoad(lg);
    if (!c.events || !c.events.length) return false;
    var on = BRK.view[lg] !== "table";
    var sg = el("div", "seg segw2");
    [["table", "Table"], ["bracket", "Bracket"]].forEach(function (o) {
      var b = el("button", null, o[1]); b.type = "button"; b.setAttribute("aria-pressed", (o[0] === "bracket") === on ? "true" : "false");
      b.addEventListener("click", function () { BRK.view[lg] = o[0]; keepScroll(renderTeams); });
      sg.appendChild(b);
    });
    body.appendChild(sg);
    if (!on) return false;
    brkRender(body, lg, c.events);
    return true;
  }
  function brkRender(body, lg, events) {
    var cfg = BRK_LGS[lg], sd = sdgLoad(lg, false);
    if (!sd.data) { body.appendChild(el("p", "notice", sd.failed ? "The bracket didn't load. Check the connection and open this tab again." : "Loading the bracket…")); return; }
    var series = brkBuild(lg, events, sd.data);
    var my = myTeamList().filter(function (t) { return t.lg === lg; });
    var mine = function (t) { return my.some(function (m) { return teamMatch(t.name, m.name, lg) || teamMatch(t.short, m.name, lg); }); };
    // pick a series to open: the one of yours that's live or next, else the next one anyone plays
    if (!BRK.sel[lg]) {
      var now = Date.now(), cand = series.filter(function (s) { return s.games.some(function (e) { return brkState(e) !== "post" || now - new Date(e.date) < 86400000; }); });
      var nextAt = function (s) { var g = s.games.filter(function (e) { return brkState(e) !== "post"; })[0]; return g ? new Date(g.date).getTime() : 9e15; };
      cand.sort(function (a, b) { return (a.live ? 0 : 1) - (b.live ? 0 : 1) || nextAt(a) - nextAt(b); });
      var pick = cand.filter(function (s) { return brkSide(s).some(mine); })[0] || cand[0] || series[series.length - 1];
      BRK.sel[lg] = pick ? pick.key : "none";
    }
    var sel = series.filter(function (s) { return s.key === BRK.sel[lg]; })[0];
    var champs = {};
    cfg.confs.forEach(function (cf) {
      var inConf = series.filter(function (s) { return s.conf === cf[0]; });
      var wrap = el("div", "brk-conf"); wrap.appendChild(el("h3", null, cf[1]));
      // wild card: one match, its winner plays the top seed
      var wc = inConf.filter(function (s) { return s.rd === 0; })[0];
      var r1 = [null, null, null, null];
      inConf.filter(function (s) { return s.rd === 1; }).forEach(function (s) { var k = cfg.slot1[brkTop(s)]; if (k != null && !r1[k]) r1[k] = s; });
      if (wc) {
        var w = el("div", "brk-wc");
        w.appendChild(brkBox(lg, wc, brkSide(wc), null, mine));
        var opp = r1[0] && brkSide(r1[0]).filter(function (t) { return t.seed === cfg.wildFor; })[0];
        w.appendChild(el("p", null, cfg.rounds[0] + (opp ? ": the winner plays " + opp.short + " in round one" : "")));
        wrap.appendChild(w);
      }
      // feed the wild-card winner into the top seed's series while ESPN still lists "TBD"
      var wcWin = brkWinnerOf(wc);
      var semi = [null, null];
      inConf.filter(function (s) { return s.rd === 2; }).forEach(function (s) { var k = cfg.slot1[brkTop(s)]; k = k == null ? -1 : k < 2 ? 0 : 1; if (k >= 0 && !semi[k]) semi[k] = s; });
      var fin = inConf.filter(function (s) { return s.rd === 3; })[0] || null;
      var rh = el("div", "brk-rh"); [cfg.rounds[1], "Semifinals", "Final"].forEach(function (x) { rh.appendChild(el("span", null, x)); }); wrap.appendChild(rh);
      var tree = el("div", "brk-tree");
      var cell = function (cls, col, row, span, node) { var c2 = el("div", "brk-cell " + cls); c2.style.gridColumn = String(col); c2.style.gridRow = row + " / span " + span; c2.appendChild(node); tree.appendChild(c2); };
      r1.forEach(function (s, i) {
        var ts = brkSide(s);
        if (s && ts.length === 1 && i === 0 && wcWin) ts = ts.concat([wcWin]);
        cell("c1", 1, i + 1, 1, brkBox(lg, s, ts, i === 0 ? ["", "Wild card"] : null, mine));
      });
      semi.forEach(function (s, i) {
        var ts = s ? brkSide(s) : [brkWinnerOf(r1[i * 2]), brkWinnerOf(r1[i * 2 + 1])].filter(Boolean);
        if (!s && !state.showScores) ts = [];
        cell("c2", 2, i * 2 + 1, 2, brkBox(lg, s, ts, null, mine));
      });
      var fts = fin ? brkSide(fin) : [brkWinnerOf(semi[0]), brkWinnerOf(semi[1])].filter(Boolean);
      if (!fin && !state.showScores) fts = [];
      cell("c3", 3, 1, 4, brkBox(lg, fin, fts, null, mine));
      wrap.appendChild(tree);
      champs[cf[0]] = brkWinnerOf(fin);
      if (sel && sel.conf === cf[0]) wrap.appendChild(brkDetail(lg, sel, mine));
      body.appendChild(wrap);
    });
    // the final between the two conference champions
    var cup = series.filter(function (s) { return s.rd === 4; })[0] || null;
    var cw = el("div", "brk-conf"); cw.appendChild(el("h3", null, cfg.cup));
    var row = el("div", "brk-cup");
    var cts = cup ? brkSide(cup) : state.showScores ? [champs.E, champs.W].filter(Boolean) : [];
    row.appendChild(brkBox(lg, cup, cts, ["East champion", "West champion"], mine));
    var cg = cup && cup.games[0];
    row.appendChild(el("p", null, cg ? new Date(cg.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Eastern champion against Western champion"));
    cw.appendChild(row);
    if (sel && sel.rd === 4) cw.appendChild(brkDetail(lg, sel, mine));
    body.appendChild(cw);
    body.appendChild(el("p", "sdg-src", "Playoff games and seeds from ESPN. Tap a matchup for its games, and a team for its page."));
  }

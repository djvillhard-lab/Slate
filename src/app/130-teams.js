  // ---------- team pages: schedule, player stats, news, and Claude's take ----------
  var TEAM_LGKEY = { "NFL": "nfl", "NBA": "nba", "MLB": "mlb", "NHL": "nhl", "Premier League": "epl", "MLS": "mls", "WNBA": "wnba", "La Liga": "laliga", "Serie A": "seriea", "Bundesliga": "bundesliga", "Ligue 1": "ligue1" };
  var tm = { idx: {}, data: {}, docs: {}, subs: {} };
  function lgOfKnown(known, lg) { return lg || (known ? (TEAM_LGKEY[known.lg] || (known.lg === "College" ? "ncaam" : "")) : ""); }
  function myTeamList() {
    var out = [], seen = {};
    state.teams.forEach(function (t) {
      var p = parseTeam(t), known = teamByName(p.name), lg = lgOfKnown(known, p.lg);
      if (!lg) return; var k = lg + "|" + p.name.toLowerCase(); if (seen[k]) return; seen[k] = 1;
      out.push({ name: p.name, lg: lg, known: known });
    });
    return out;
  }
  function openTeam(name, lg) { state.team = { name: name, lg: lg }; tmLoad(state.team); openSub("team"); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0); }
  function tmKey(t) { return t.lg + "|" + String(t.name).toLowerCase(); }
  // ESPN team ids, kept in Supabase by the GitHub script (ESPN's own team list doesn't allow web pages to read it)
  var tmIds = null;
  function tmKeyName(x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function tmIndex(lg) {
    var p = tmIds ? Promise.resolve(tmIds) : db ? db.doc("code/teamids").get().then(function (s2) { tmIds = s2.exists ? s2.data() : {}; return tmIds; }) : Promise.resolve({});
    return p.then(function (all) { return all[lg] || {}; });
  }
  function tmLoad(t, force) {
    if (!t || !BX_SPORT[t.lg]) return;
    var k = tmKey(t), cur = tm.data[k];
    if (cur && (cur.busy || (!force && Date.now() - cur.at < 5 * 60000))) return;
    cur = tm.data[k] = { busy: true, at: Date.now(), d: cur && cur.d };
    tmIndex(t.lg).then(function (m) {
      var hit = m[tmKeyName(t.name)]; if (!hit) throw new Error("not found");
      var e = { id: hit[0], abbr: hit[1] };
      cur.espn = e; tmWatch(t.lg + "-" + String(e.abbr || "").toLowerCase());
      // soccer schedules list results and upcoming fixtures separately
      var sch = rkFetch(bxApi(t.lg, "teams/" + e.id + "/schedule"));
      if (BX_SPORT[t.lg] === "soccer") sch = Promise.all([sch, rkFetch(bxApi(t.lg, "teams/" + e.id + "/schedule?fixture=true"))]).then(function (two) {
        var a = two[0] || two[1]; if (!a) return null; var seen = {}, evs = [];
        [two[0], two[1]].forEach(function (x) { ((x || {}).events || []).forEach(function (ev) { if (!seen[ev.id]) { seen[ev.id] = 1; evs.push(ev); } }); });
        return leagueGames(t.lg, e.id).then(function (more) { more.forEach(function (ev) { if (!seen[ev.id]) { seen[ev.id] = 1; evs.push(ev); } }); return { team: (two[0] || {}).team || (two[1] || {}).team, events: evs }; });
      });
      return Promise.all([Promise.resolve(null), sch, seasonFetch(t.lg, e.id), rkFetch(bxApi(t.lg, "news?team=" + e.id + "&limit=8"))]);
    }).then(function (r) {
      if (!r[1]) throw new Error("no data");
      r[0] = { team: (r[1] || {}).team || {} };
      var sched = ((r[1] || {}).events || []).slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      cur.busy = false; cur.err = false; cur.at = Date.now(); cur.d = { info: (r[0] || {}).team || {}, sched: sched, stats: (r[2] || {}).results || [], news: (r[3] || {}).articles || [] };
      fillRecord(t.lg, cur.d.info).then(function () { if (state.view === "team") keepScroll(renderTeam); });
      if (state.view === "team") keepScroll(renderTeam);
    }, function () { cur.busy = false; cur.err = true; if (state.view === "team") keepScroll(renderTeam); });
  }
  // Claude's summaries live in teams/<league>-<abbr>
  function tmWatch(skey) {
    if (tm.subs[skey] || !db) return;
    tm.subs[skey] = db.doc("teams/" + skey).onSnapshot(function (snap) { tm.docs[skey] = snap.exists ? snap.data() : null; if (state.view === "team") keepScroll(renderTeam); }, function () {});
  }
  // ---- Teams list: your teams as cards (what's on today, last result, next game, Claude's first line), then browse any league ----
  tm.lite = {};
  // some leagues (MLS) leave the record out of the schedule feed: fill it from the league standings
  var STAND = {};
  function ordinal(n) { n = Number(n); var s2 = ["th", "st", "nd", "rd"], v = n % 100; return n + (s2[(v - 20) % 10] || s2[v] || s2[0]); }
  function fillRecord(lg, team) {
    if (!team || !team.id || (team.recordSummary && team.standingSummary)) return Promise.resolve(team);
    var base = bxBase(lg); if (!base) return Promise.resolve(team);
    var p = STAND[lg] || (STAND[lg] = fetch("https://site.api.espn.com/apis/v2/sports/" + base + "/standings").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }));
    return p.then(function (d) {
      if (!d) return team;
      (function walk(n, grp) {
        (n.children || []).forEach(function (c) { walk(c, c.name || grp); });
        (((n.standings || {}).entries) || []).forEach(function (e) {
          if (String((e.team || {}).id) !== String(team.id)) return;
          var st = {}; (e.stats || []).forEach(function (x) { st[x.name] = x; });
          if (!team.recordSummary && st.overall) team.recordSummary = st.overall.summary || st.overall.displayValue;
          var rank = st.rank ? st.rank.displayValue : (e.note || {}).rank; if (!team.standingSummary && rank) team.standingSummary = ordinal(rank) + (grp ? " in " + grp : "");
        });
      })(d, d.name || "");
      return team;
    });
  }
  // knockout games (MLS playoffs, cups) are on the league scoreboard but not in the team's schedule: add this month's and next month's
  function leagueGames(lg, teamId) {
    if (BX_SPORT[lg] !== "soccer") return Promise.resolve([]);
    var d = new Date(), m1 = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0"), d2 = new Date(d.getFullYear(), d.getMonth() + 1, 1), m2 = d2.getFullYear() + String(d2.getMonth() + 1).padStart(2, "0");
    return Promise.all([m1, m2].map(function (m) { return rkFetch(bxApi(lg, "scoreboard?dates=" + m)); })).then(function (rs) {
      var out = []; rs.forEach(function (j) { ((j || {}).events || []).forEach(function (e) { var cs = ((e.competitions || [])[0] || {}).competitors || []; if (cs.some(function (c) { return String((c.team || {}).id) === String(teamId); })) out.push(e); }); });
      return out;
    }, function () { return []; });
  }
  function tmLite(t) {
    var k = tmKey(t), cur = tm.lite[k];
    if (cur && (cur.busy || Date.now() - cur.at < 10 * 60000)) return cur;
    cur = tm.lite[k] = { busy: true, at: Date.now(), d: cur && cur.d };
    tmIndex(t.lg).then(function (m) {
      var hit = m[tmKeyName(t.name)]; if (!hit) throw new Error("not found");
      cur.espn = { id: hit[0], abbr: hit[1] }; tmWatch(t.lg + "-" + String(hit[1] || "").toLowerCase());
      var u = bxApi(t.lg, "teams/" + hit[0] + "/schedule"), ps = [rkFetch(u)];
      if (BX_SPORT[t.lg] === "soccer") { ps.push(rkFetch(u + "?fixture=true")); ps.push(leagueGames(t.lg, hit[0]).then(function (evs) { return { events: evs }; })); }
      return Promise.all(ps);
    }).then(function (rs) {
      var team = ((rs[0] || rs[1] || {}).team) || {}, evs = [], seen = {};
      rs.forEach(function (x) { ((x || {}).events || []).forEach(function (e) { if (!seen[e.id]) { seen[e.id] = 1; evs.push(e); } }); });
      evs.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      var last = null, next = null;
      evs.forEach(function (e) { var st = ((((e.competitions || [])[0] || {}).status || {}).type || {}).state; if (st === "post") last = e; else if (!next && st !== "post") next = e; });
      cur.d = { team: team, last: last, next: next }; cur.busy = false; cur.at = Date.now();
      if (state.view === "teams") keepScroll(renderTeams);
      fillRecord(t.lg, team).then(function () { if (state.view === "teams") keepScroll(renderTeams); });
    }, function () { cur.busy = false; cur.err = true; });
    return cur;
  }
  function tmGameLine(e, id, past) {
    if (!e) return null;
    var c = (e.competitions || [])[0] || {}, me = null, op = null;
    (c.competitors || []).forEach(function (x) { if (String((x.team || {}).id) === String(id)) me = x; else op = x; });
    if (!me || !op) return null;
    var opn = (op.team || {}).shortDisplayName || (op.team || {}).displayName || "";
    if (!past && opn.length > 8 && (op.team || {}).abbreviation) opn = op.team.abbreviation;  // keeps the tile's next-game line to one line
    var vs = (me.homeAway === "home" ? "vs " : "@ ") + opn;
    var sv = function (x) { return x.score && typeof x.score === "object" ? x.score.displayValue : x.score; };
    if (past) { var w = me.winner ? "W" : op.winner ? "L" : "T"; return { k: w, t: state.showScores ? w + " " + sv(me) + "-" + sv(op) + " " + vs : "Final " + vs }; }
    var d = new Date(e.date), today = new Date(), days = Math.round((new Date(d.toDateString()) - new Date(today.toDateString())) / 864e5);
    var when = days === 0 ? "Today" : days === 1 ? "Tmrw" : days < 7 && days > 0 ? d.toLocaleDateString("en-US", { weekday: "short" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    var tv = []; (c.broadcasts || []).forEach(function (bc) { var n = (bc.media || {}).shortName || ((bc.names || [])[0]); if (n && tv.indexOf(n) === -1) tv.push(n); });
    // short enough for one line on a team tile: "Nov 22 10:30a @ Liverpool" (the channel is on the game itself)
    return { k: "next", t: when + " " + String(timeText(e.date)).replace(/:00(?=\s?[AP]M$)/i, "").replace(/\s?([AP])M$/i, function (z, ap) { return ap.toLowerCase(); }) + " " + vs };
  }
  function relLum(hex) { var n = parseInt(String(hex).replace("#", ""), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrastRatio(a, b) { var x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function teamCard(t) {
    var lite = tmLite(t), d = lite.d, e = lite.espn, skey = e ? t.lg + "-" + String(e.abbr || "").toLowerCase() : null, doc = skey ? tm.docs[skey] : null;
    var today = games().filter(function (g) { return g.league === t.lg && (isFav(g.away, g.league) && teamMatch(g.away, t.name, t.lg) || isFav(g.home, g.league) && teamMatch(g.home, t.name, t.lg)); })[0];
    var c = el("button", "tcard" + (today && status(today).kind === "live" ? " live" : today ? " on" : "")); c.type = "button";
    var tcol = (t.known && t.known.c1) || "";
    if (/^#[0-9a-f]{6}$/i.test(tcol) && contrastRatio(tcol, "#1A2230") < 1.6 && t.known && /^#[0-9a-f]{6}$/i.test(t.known.c2 || "")) tcol = t.known.c2;  // black or navy would vanish on the card
    if (/^#[0-9a-f]{6}$/i.test(tcol)) c.style.setProperty("--tc", tcol);
    var top = el("div", "tc-top");
    top.appendChild(t.known ? teamBadge(t.known) : badgeFor(t.name.slice(0, 3).toUpperCase(), t.name));
    var nm = el("div", "tc-nm"); nm.appendChild(el("b", null, t.name));
    var team = (d && d.team) || {}, sub = [(LEAGUES[t.lg] || {}).tag || ""];
    if (team.recordSummary) sub.push(team.recordSummary);
    var subl = el("span", "tc-lg"), sic = sportIcon(t.lg); if (sic) subl.appendChild(sic);  // the sport at a glance, same icons as the slate
    subl.appendChild(document.createTextNode(sub.filter(Boolean).join(" · "))); nm.appendChild(subl);
    nm.appendChild(el("span", "tc-st", team.standingSummary ? team.standingSummary.replace(/ (Division|Conference)$/, "").replace("English Premier League", "Premier League") : "\u00a0"));
    top.appendChild(nm);
    c.appendChild(top);
    // two fixed rows on every tile: what's next (or today's game), then the last result
    var lines = el("div", "tc-lines"), r1 = el("div", "tc-line tc-r1"), r2 = el("div", "tc-line tc-r2");
    if (today) {
      var st = status(today), sc = state.showScores ? scoreOf(today) : null, side = today.away && teamMatch(today.away, t.name, t.lg) ? "away" : "home", other = side === "away" ? "home" : "away";
      r1.classList.add("tc-today");
      // one line on the tile: my score first, then a short opponent name ("Final L 78-85 vs GTWN")
      var opn = short(today, other); if (opn.length > 8) opn = abbr(today, other) || opn;
      var vsTxt = (side === "away" ? "@ " : "vs ") + opn, mine2 = side === "away" ? sc && sc.a : sc && sc.h, theirs = side === "away" ? sc && sc.h : sc && sc.a;
      if (st.kind === "live" && sc) { r1.appendChild(el("i", "rk-dot")); r1.appendChild(el("span", null, mine2 + "-" + theirs + " " + vsTxt + (sc.detail ? " · " + sc.detail : ""))); }
      else if (st.kind === "over" && sc) r1.appendChild(el("span", null, "Final " + (mine2 > theirs ? "W " : mine2 < theirs ? "L " : "T ") + mine2 + "-" + theirs + " " + vsTxt));
      else r1.appendChild(el("span", null, "Today " + String(timeText(today.moved || today.start)).replace(/:00(?=\s?[AP]M$)/i, "").replace(/\s?([AP])M$/i, function (z, ap) { return ap.toLowerCase(); }) + " " + vsTxt));  // one line: "Today 2:30p vs BC"
    } else if (d && e) {
      var nx = tmGameLine(d.next, e.id, false);
      r1.appendChild(el("span", nx ? null : "tc-dim", nx ? nx.t : "No games scheduled"));
    } else r1.appendChild(el("span", "tc-dim", lite.err ? "Schedule unavailable" : "Loading…"));
    var ls = d && e ? tmGameLine(d.last, e.id, true) : null;
    if (ls) { r2.appendChild(el("b", "rk-wl " + ls.k.toLowerCase(), ls.k)); r2.appendChild(el("span", null, ls.t.replace(/^[WLT] /, ""))); }
    else r2.appendChild(el("span", "tc-dim", "\u00a0"));
    lines.appendChild(r1); lines.appendChild(r2);
    c.appendChild(lines);
    c.addEventListener("click", function () { openTeam(t.name, t.lg); });
    return c;
  }
  var BROWSE = [["NFL", "NFL"], ["NBA", "NBA"], ["MLB", "MLB"], ["NHL", "NHL"], ["Premier League", "EPL"], ["MLS", "MLS"], ["College", "College"], ["WNBA", "WNBA"], ["La Liga", "LIGA"], ["Serie A", "SA"], ["Bundesliga", "BUN"], ["Ligue 1", "L1"]];
  // All games tabs: their order, and which leagues show at all (hidden ones also drop out of On TV)
  function tabName(k) { return k === "fav" ? "My teams" : k === "all" ? "All games" : LEAGUES[k].name; }
  function renderTabs() {
    var body = $("tabs-body"); if (!body) return; body.textContent = "";
    if (state.view !== "tabs") return;
    var hid = state.hiddenLeagues || [], ord = state.gamesOrder || [];
    var keys = ["fav", "all"].concat(ORDER);
    keys = keys.map(function (k, i) { var j = ord.indexOf(k); return [j === -1 ? 1e3 + i : j, k]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
    body.appendChild(el("p", "hint tabs-hint", "Arrange the tabs across the top of All games. Switch a league off to hide it there and in On TV; games your teams play always show."));
    var list = el("div", "tabs-list");
    keys.forEach(function (k, i) {
      var off = hid.indexOf(k) !== -1, r = el("div", "tabrow" + (off ? " off" : ""));
      var tx = el("span", "tn"); tx.appendChild(el("b", null, tabName(k)));
      if (LEAGUES[k] && LEAGUES[k].tag !== LEAGUES[k].name) tx.appendChild(el("span", "tg", LEAGUES[k].tag));
      r.appendChild(tx);
      if (LEAGUES[k]) {
        var sw = el("button", "switch"); sw.type = "button"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-checked", off ? "false" : "true");
        sw.setAttribute("aria-label", "Show " + tabName(k)); sw.appendChild(el("span", "knob"));
        sw.addEventListener("click", function () { var h = (state.hiddenLeagues || []).slice(), j = h.indexOf(k); if (j === -1) h.push(k); else h.splice(j, 1); state.hiddenLeagues = h; saveSettings(); keepScroll(render); });
        r.appendChild(sw);
      } else r.appendChild(el("span"));
      [["up", -1], ["down", 1]].forEach(function (m) {
        var b = el("button", "tab-mv tab-" + m[0]); b.type = "button"; b.appendChild(icon("more"));
        b.setAttribute("aria-label", "Move " + tabName(k) + " " + m[0]);
        b.disabled = (m[1] < 0 && i === 0) || (m[1] > 0 && i === keys.length - 1);
        b.addEventListener("click", function () { var nk = keys.slice(), j = i + m[1], t = nk[i]; nk[i] = nk[j]; nk[j] = t; state.gamesOrder = nk; saveSettings(); keepScroll(render); });
        r.appendChild(b);
      });
      list.appendChild(r);
    });
    body.appendChild(list);
    if (ord.length || hid.length) {
      var rs = el("button", "rlink", "Reset to the default order"); rs.type = "button";
      rs.addEventListener("click", function () { state.gamesOrder = []; saveSettings(); keepScroll(render); });
      if (ord.length) body.appendChild(rs);
    }
  }
  function renderTeams() {
    var body = $("teams-body"); if (!body) return; body.textContent = "";
    if (state.view !== "teams") return;
    var mine = myTeamList();
    var playing = {}; games().forEach(function (g) { mine.forEach(function (t) { if (g.league === t.lg && (teamMatch(g.away, t.name, t.lg) || teamMatch(g.home, t.name, t.lg))) playing[tmKey(t)] = new Date(g.moved || g.start).getTime(); }); });
    // your own order when you've set one; otherwise teams playing today first
    var ord = state.teamOrder || [];
    mine = mine.map(function (t, i) { var j = ord.indexOf(tmKey(t)); return [ord.length ? (j === -1 ? 1e3 + i : j) : (playing[tmKey(t)] || 9e15 + i), t]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
    var h = el("div", "sec"); h.appendChild(el("h2", null, "My teams"));
    if (mine.length > 1) { var eb = el("button", "rlink", state.teamEdit ? "Done" : "Edit order"); eb.type = "button"; eb.addEventListener("click", function () { state.teamEdit = !state.teamEdit; keepScroll(renderTeams); }); h.appendChild(eb); }
    body.appendChild(h);
    if (!mine.length) body.appendChild(el("p", "hint", "Star a team on any game, or find one below. Each gets a page with its schedule, stats, stories and Claude's take."));
    if (state.teamEdit) {
      var box = el("div", "tord");
      mine.forEach(function (t, i) {
        var r = el("div", "trow"); r.appendChild(t.known ? teamBadge(t.known) : badgeFor(t.name.slice(0, 3).toUpperCase(), t.name));
        var tx = el("span", "tx"); tx.appendChild(el("span", "n", t.name)); tx.appendChild(el("span", "lg", (LEAGUES[t.lg] || {}).name || "")); r.appendChild(tx);
        [["up", -1, "‹"], ["down", 1, "›"]].forEach(function (m) {
          var b = el("button", "x ford-b ford-" + m[0], m[2]); b.type = "button"; b.setAttribute("aria-label", "Move " + t.name + " " + m[0]);
          b.disabled = (m[1] < 0 && i === 0) || (m[1] > 0 && i === mine.length - 1);
          b.addEventListener("click", function () { var keys = mine.map(tmKey), j = i + m[1], x = keys[i]; keys[i] = keys[j]; keys[j] = x; state.teamOrder = keys; saveSettings(); keepScroll(renderTeams); });
          r.appendChild(b);
        });
        box.appendChild(r);
      });
      if ((state.teamOrder || []).length) { var rs = el("button", "rlink", "Reset: teams playing today first"); rs.type = "button"; rs.addEventListener("click", function () { state.teamOrder = []; saveSettings(); keepScroll(renderTeams); }); box.appendChild(rs); }
      body.appendChild(box);
    } else {
      var grid = el("div", "tcards"); mine.forEach(function (t) { grid.appendChild(teamCard(t)); }); body.appendChild(grid);
    }
    // find any team: search, or browse a league
    var h2 = el("div", "sec"); h2.appendChild(el("h2", null, "Find a team")); body.appendChild(h2);
    var f = el("input", "field"); f.type = "search"; f.placeholder = "Search, e.g. Chiefs or Kansas"; f.value = state.teamQ || ""; f.setAttribute("aria-label", "Search a team");
    body.appendChild(f);
    var pills = el("div", "substrip tb-pills");
    BROWSE.forEach(function (o) { var b = el("button", "cf-tab", o[1]); b.type = "button"; b.setAttribute("aria-pressed", state.teamBrowse === o[0] && !state.teamQ ? "true" : "false"); b.addEventListener("click", function () { state.teamBrowse = state.teamBrowse === o[0] ? "" : o[0]; state.teamQ = ""; keepScroll(renderTeams); }); pills.appendChild(b); });
    body.appendChild(pills);
    var res = el("div", "rows tb-res");
    function row(t) {
      var lg = lgOfKnown(t), col = t.lg === "College", r = el("div", "trow tm-pick");
      var go = el("button", "tm-go"); go.type = "button"; go.setAttribute("aria-label", "Open " + t.name);
      go.appendChild(teamBadge(t)); var tx = el("span", "tx"); tx.appendChild(el("span", "n", t.name));
      if (!col) tx.appendChild(el("span", "lg", t.lg));
      else {
        var chips = el("span", "csp");
        COL_KEYS.forEach(function (k) {
          var on = isFav(t.name, k), c = el("button", "csp-c" + (on ? " on" : "")); c.type = "button";
          c.setAttribute("aria-pressed", on ? "true" : "false"); c.setAttribute("aria-label", (on ? "Unstar " : "Star ") + t.name + " " + COL_SPORT[k]);
          c.appendChild(starIcon(on)); c.appendChild(document.createTextNode({ ncaam: "Men's hoops", ncaaw: "Women's hoops", ncaaf: "Football" }[k]));
          c.addEventListener("click", function (e) { e.stopPropagation(); toggleFav(t.name, k); });
          chips.appendChild(c);
        });
        tx.appendChild(chips);
      }
      go.appendChild(tx);
      go.addEventListener("click", function () { if (lg) openTeam(t.name, lg); });
      r.appendChild(go);
      if (!col && lg) {
        var on = isFav(t.name, lg), sb = el("button", "tm-fav" + (on ? " on" : "")); sb.type = "button";
        sb.setAttribute("aria-pressed", on ? "true" : "false"); sb.setAttribute("aria-label", (on ? "Remove " : "Add ") + t.name + (on ? " from" : " to") + " my teams");
        sb.appendChild(starIcon(on)); sb.addEventListener("click", function (e) { e.stopPropagation(); toggleFav(t.name, lg); });
        r.appendChild(sb);
      }
      return r;
    }
    function list() {
      res.textContent = ""; state.teamQ = f.value;
      var q = f.value.trim();
      var items = q ? teamSearch(q) : state.teamBrowse ? teamIndex().filter(function (t) { return t.lg === state.teamBrowse; }).sort(function (a, b) { return a.name.localeCompare(b.name); }) : [];
      items.forEach(function (t) { res.appendChild(row(t)); });
      if (q && !items.length) res.appendChild(el("p", "hint", "No team matches “" + q + "”."));
    }
    f.addEventListener("input", function () { list(); Array.prototype.forEach.call(pills.children, function (b) { b.setAttribute("aria-pressed", "false"); }); });
    body.appendChild(res); list();
  }
  function tmSchedRow(e, id) {
    var c = (e.competitions || [])[0] || {}, cs = c.competitors || [], me = null, op = null;
    cs.forEach(function (x) { if (String((x.team || {}).id) === String(id)) me = x; else op = x; });
    if (!me || !op) return null;
    var st = ((c.status || {}).type || {}).state, sv = function (x) { return x.score && typeof x.score === "object" ? x.score.displayValue : x.score; };
    var r = el("div", "tm-row"), d = new Date(e.date);
    r.appendChild(el("span", "tm-d", d.toLocaleDateString("en-US", { month: "short", day: "numeric" })));
    r.appendChild(el("span", "tm-o", (me.homeAway === "home" ? "vs " : "@ ") + (((op.team || {}).shortDisplayName) || (op.team || {}).displayName || "")));
    if (st === "post") {
      var w = me.winner ? "W" : op.winner ? "L" : "T";
      var rs = el("span", "tm-r " + (w === "W" ? "fw" : w === "L" ? "fl" : "")); rs.textContent = state.showScores ? w + " " + sv(me) + "-" + sv(op) : "Final"; r.appendChild(rs);
    } else if (st === "in") r.appendChild(el("span", "tm-r", "Live"));
    else {
      var tv = []; (c.broadcasts || []).forEach(function (b) { var n = (b.media || {}).shortName || ((b.names || [])[0]); if (n && tv.indexOf(n) === -1) tv.push(n); });
      r.appendChild(el("span", "tm-r", timeText(e.date) + (tv.length ? " · " + tv[0] : "")));
    }
    return r;
  }
  function tmStats(lg, results, teamInfo) {
    var spec = BX_SEASON[BX_SPORT[lg]]; if (!spec) return null;
    var wrap = el("div");
    (results || []).forEach(function (grp) {
      var sp = spec[grp.name]; if (!sp) return;
      var rows = (grp.leaders || []).slice(0, 10); if (!rows.length) return;
      var sc = el("div", "tm-tbl-w"), tb = el("table", "tm-tbl"), hr = el("tr");
      hr.appendChild(el("th", null, "")); sp.forEach(function (c2) { hr.appendChild(el("th", null, c2[1])); }); tb.appendChild(hr);
      rows.forEach(function (a) {
        var m = {}, ath = a.athlete || {};
        (a.statistics || []).forEach(function (cat) { (cat.stats || []).forEach(function (x) { if (!(x.name in m)) m[x.name] = x.displayValue; }); });
        var tr = el("tr"), nth = el("th"); if (ath.id && teamInfo) nth.appendChild(playerStar({ id: ath.id, name: ath.displayName || bxName(ath), lg: lg, team: teamInfo.abbr, teamName: teamInfo.name }));
        nth.appendChild(document.createTextNode(bxName(ath))); tr.appendChild(nth);
        sp.forEach(function (c2) { var ks = c2[0].split("|"), v = "–"; for (var i = 0; i < ks.length; i++) if (m[ks[i]] != null) { v = m[ks[i]]; break; } tr.appendChild(el("td", null, String(v))); });
        tb.appendChild(tr);
      });
      sc.appendChild(tb); wrap.appendChild(sc);
    });
    return wrap.childNodes.length ? wrap : null;
  }
  function renderTeam() {
    var body = $("team-body"); if (!body) return; body.textContent = "";
    if (state.view !== "team" || !state.team) return;
    var t = state.team, k = tmKey(t), cur = tm.data[k] || {}, d = cur.d, e = cur.espn, known = teamByName(t.name);
    if (!cur.at) tmLoad(t);
    var hd = el("div", "gv-head tm-head"), top = el("div", "tm-top");
    top.appendChild(known ? teamBadge(known) : badgeFor((e && e.abbr) || t.name.slice(0, 3).toUpperCase(), t.name));
    var nm = el("div", "tm-nm"); nm.appendChild(el("b", null, t.name));
    var sub = [(LEAGUES[t.lg] || {}).name]; if (d && d.info) { var rec = d.info.recordSummary || (((d.info.record || {}).items || [])[0] || {}).summary; if (rec) sub.push(rec); if (d.info.standingSummary) sub.push(String(d.info.standingSummary).replace(/ in (English )?Premier League$/, "").replace(new RegExp(" in " + String((LEAGUES[t.lg] || {}).name || "~").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"), "")); }
    nm.appendChild(el("span", null, sub.filter(Boolean).join(" · "))); top.appendChild(nm);
    var fav = isFav(t.name, t.lg), st = el("button", "star" + (fav ? " on" : "")); st.type = "button"; st.appendChild(icon(fav ? "star" : "star-o"));
    st.setAttribute("aria-label", fav ? "Remove from my teams" : "Add to my teams"); st.addEventListener("click", function () { toggleFav(t.name, t.lg); });
    top.appendChild(st); hd.appendChild(top);
    if (known && known.lg === "College") {
      var sw = el("div", "csp");
      COL_KEYS.forEach(function (lk) { var b = el("button", "csp-c" + (lk === t.lg ? " on" : ""), { ncaam: "Men's hoops", ncaaw: "Women's hoops", ncaaf: "Football" }[lk]); b.type = "button"; b.addEventListener("click", function () { state.team = { name: t.name, lg: lk }; tmLoad(state.team); render(); }); sw.appendChild(b); });
      hd.appendChild(sw);
    }
    body.appendChild(hd);
    // Claude's take
    var skey = e ? t.lg + "-" + String(e.abbr || "").toLowerCase() : null, doc = skey ? tm.docs[skey] : null;
    var cc = gvCard("Claude's take", "tm-claude");
    if (doc && doc.summary) {
      withSwitch(cc);
      cc.appendChild(readNode(doc.summary, doc.bullets, "gv-sum"));
      var tl = Array.isArray(doc.long) ? doc.long.filter(Boolean) : [];
      if (tl.length) {
        var lrOpen = false; try { lrOpen = localStorage.getItem("slate-longread") === "1"; } catch (e) {}
        var dh = el("button", "tm-dd" + (lrOpen ? "" : " shut")); dh.type = "button"; dh.setAttribute("aria-expanded", lrOpen ? "true" : "false");
        dh.appendChild(el("span", null, "The longer read")); dh.appendChild(el("em", null, lrOpen ? "Hide" : tl.length + " paragraphs")); dh.appendChild(icon("more"));
        dh.addEventListener("click", function () { try { localStorage.setItem("slate-longread", lrOpen ? "0" : "1"); } catch (e) {} keepScroll(renderTeam); });
        cc.appendChild(dh);
        if (lrOpen) tl.forEach(function (para) { cc.appendChild(el("p", "gv-p", para)); });
      }
      if (doc.at) cc.appendChild(el("p", "pv-at", "Written " + new Date(doc.at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })));
    } else cc.appendChild(el("p", "pv-none", "No Claude summary for this team yet."));
    if (skey && window.SLATE_SELF) {
      var tf = function () {
        var o = { name: t.name, league: (LEAGUES[t.lg] || {}).name || t.lg };
        if (d && d.info) { o.record = d.info.recordSummary; o.standing = d.info.standingSummary; }
        if (d && d.sched) {
          var now = Date.now(), done = [], up = [];
          d.sched.forEach(function (ev) { var c = (ev.competitions || [])[0] || {}, st = ((c.status || {}).type || {}).state, me = null, op = null; (c.competitors || []).forEach(function (x) { if (String((x.team || {}).id) === String(e.id)) me = x; else op = x; }); if (!me || !op) return; var sv = function (x) { return x.score && typeof x.score === "object" ? x.score.displayValue : x.score; }; var row = { date: ev.date, opp: (op.team || {}).displayName, home: me.homeAway === "home" }; if (st === "post") { row.score = sv(me) + "-" + sv(op); row.result = me.winner ? "W" : op.winner ? "L" : "T"; done.push(row); } else if (new Date(ev.date).getTime() > now - 6 * 3600000) up.push(row); });
          o.recent = done.slice(-6); o.upcoming = up.slice(0, 3);
        }
        if (d && d.news) o.espnNews = d.news.slice(0, 5).map(function (a) { return a.headline; });
        return o;
      };
      cc.appendChild(claudeCtl("team", doc, !!(doc && doc.summary), { k: "t:" + skey, go: function () { claudeAsk("team", null, { key: skey, facts: tf() }); } }, "Write Claude's take"));
    }
    body.appendChild(cc);
    if (!d) {
      var nb = el("div", "notice", cur.err ? "Couldn't load this team from ESPN." : "Loading the schedule, stats and news…");
      if (cur.err || (cur.at && Date.now() - cur.at > 12000)) { var rt = el("button", "pv-get", "Try again"); rt.type = "button"; rt.addEventListener("click", function () { tm.data[k] = null; tmIds = null; tmLoad(t, true); keepScroll(renderTeam); }); nb.appendChild(el("br")); nb.appendChild(rt); }
      else setTimeout(function () { if (state.view === "team" && !(tm.data[k] || {}).d) keepScroll(renderTeam); }, 12500);
      body.appendChild(nb); return;
    }
    // schedule
    var done = [], next = [];
    d.sched.forEach(function (ev) { var st2 = ((((ev.competitions || [])[0] || {}).status || {}).type || {}).state; (st2 === "pre" ? next : done).push(ev); });
    var sc = gvCard("Schedule", "tm-sched");
    if (next.length) { sc.appendChild(el("b", "pv-h", "Next")); next.slice(0, 4).forEach(function (ev) { var r = tmSchedRow(ev, e.id); if (r) sc.appendChild(r); }); }
    if (done.length) { sc.appendChild(el("b", "pv-h", "Recent")); done.slice(-5).reverse().forEach(function (ev) { var r = tmSchedRow(ev, e.id); if (r) sc.appendChild(r); }); }
    if (!next.length && !done.length) sc.appendChild(el("p", "pv-none", "No games on the schedule right now."));
    body.appendChild(sc);
    // player stats
    var ps = tmStats(t.lg, d.stats, { abbr: (e && e.abbr) || "", name: (d.info && d.info.displayName) || t.name });
    if (ps) { var pc = gvCard("Player stats", "tm-stats"); pc.appendChild(ps); pc.appendChild(el("p", "pv-at", "This season, per game where it applies")); body.appendChild(pc); }
    // news
    var news = d.news.map(function (a) { return { title: a.headline, url: ((a.links || {}).web || {}).href || "", source: "ESPN" }; }).filter(function (h) { return h.title && /^https:\/\//.test(h.url); });
    var nick = (d.info && (d.info.name || d.info.shortDisplayName)) || t.name.split(" ").slice(-1)[0];
    var loc = d.info && d.info.location, words = LEAGUES[t.lg] && LEAGUES[t.lg].college ? [loc || t.name.split(" ")[0]] : [nick];
    var ath = athFor(t.lg, words, true);
    if (ath.length) body.appendChild(linkList("From The Athletic", ath.slice(0, 6)));

  }
  // The Athletic's newsletters: each edition is also posted on its site; the GitHub script finds them in the public feeds
  var NL_LIST = [["pulse", "The Pulse", "The day in sports"], ["bounce", "The Bounce", "NBA"], ["windup", "The Windup", "MLB"], ["moneycall", "Money Call", "Sports business"],
    ["peak", "Peak", "The mental side of sports"], ["primetire", "Prime Tire", "F1"], ["fulltime", "Full Time", "Women's soccer"], ["nooffseason", "No Offseason", "Women's basketball"],
    ["fc", "The Athletic FC", "Soccer, from your email", "mine"]];
  // newsletters that only come by email (The Athletic FC): your own Gmail sends the link, so only you see them
  function nlList() { return NL_LIST.filter(function (n) { return !n[3] || state.isOwner; }); }
  var NLE = null;
  var NLD = null;
  function nlWatch() {
    if (NLD || !db) return; NLD = { items: {} };
    db.doc("news/newsletters").onSnapshot(function (snap) { NLD = snap.exists ? snap.data() : { items: {} }; if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, function () {});
    if (state.isOwner) { NLE = { items: {} }; db.doc("news/email-dj").onSnapshot(function (snap) { NLE = snap.exists ? snap.data() : { items: {} }; if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, function () {}); }
  }
  // editions you've opened, grayed out like a finished game (kept on this phone for a week)
  function nlRead() {
    var m = {}; try { m = JSON.parse(localStorage.getItem("slate-nl-read") || "{}") || {}; } catch (e) {}
    var cut = shiftDate(todayInHome(), -15); Object.keys(m).forEach(function (k) { if (m[k] < cut) delete m[k]; });  // as long as editions are kept
    return m;
  }
  // under the slate: the latest edition of each picked newsletter from the last three days, newest first
  function newsletterBlock() {
    // each day's slate links the editions published that day (Central time), so you can go back and open an earlier one
    var pick = state.newsletters || []; if (!pick.length || state.date > todayInHome()) return null;
    nlWatch(); if (!NLD) return null;
    var rows = [], day = state.date;
    var dayOf = function (t) { return new Intl.DateTimeFormat("en-CA", { timeZone: HOME_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t)); };
    nlList().forEach(function (n) {
      if (pick.indexOf(n[0]) === -1) return;
      (((n[3] ? NLE : NLD) || {}).items || {})[n[0]] && (((n[3] ? NLE : NLD) || {}).items || {})[n[0]].forEach(function (it) {
        if (!it || !it.url) return; var t = Date.parse(it.at); if (isNaN(t) || dayOf(t) !== day) return;
        if (!rows.some(function (r) { return r.n[0] === n[0]; })) rows.push({ n: n, it: it, t: t });
      });
    });
    if (!rows.length) return null;
    rows.sort(function (a, b) { return b.t - a.t; });
    var w = el("div", "nl-box"), h = el("div", "sec"); h.appendChild(el("h2", null, "The Athletic Newsletters")); w.appendChild(h);
    rows.forEach(function (r) {
      var read = !!nlRead()[r.it.url], a = el("a", "nl-row" + (read ? " read" : "")); a.href = safeUrl(r.it.url); a.target = "_blank"; a.rel = "noopener";
      a.addEventListener("click", function () { var m = nlRead(); m[r.it.url] = todayInHome(); try { localStorage.setItem("slate-nl-read", JSON.stringify(m)); } catch (e) {} a.classList.add("read"); });
      var top = el("div", "nl-top"); top.appendChild(el("b", null, r.n[1]));
      top.appendChild(el("span", null, new Date(r.t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: HOME_TZ })));
      a.appendChild(top); a.appendChild(el("span", "nl-t", r.it.title)); w.appendChild(a);
    });
    return w;
  }
  // The Athletic's headlines, kept by the GitHub script from its public league feeds
  var ATH = null;
  function athWatch() {
    if (ATH || !db) return; ATH = { leagues: {} };
    db.doc("news/athletic").onSnapshot(function (snap) { ATH = snap.exists ? snap.data() : { leagues: {} }; if (state.view === "game" || state.view === "team") keepScroll(render); }, function () {});
  }
  var ATH_SOCCER = { ucl: 1, uel: 1, facup: 1, laliga: 1, seriea: 1, bundesliga: 1, ligue1: 1, intl: 1 };
  function athFor(lg, words, onlyMatches) {
    athWatch(); if (!ATH) return [];
    var L = ATH.leagues || {}, list = L[lg] || (ATH_SOCCER[lg] || SOCCER[lg] ? L.soccer : null) || [];
    // names match as written (capitalized), so "Blues" the team doesn't match "the blues"
    var ws = words.filter(Boolean).map(function (w) { return new RegExp("(^|[^A-Za-z])" + String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z])"); });
    var scored = list.map(function (it) { var t = (it.title || "") + " " + (it.desc || ""), n = ws.filter(function (r) { return r.test(t); }).length, inTitle = ws.some(function (r) { return r.test(it.title || ""); }); return [n * 2 + (inTitle ? 1 : 0), it]; })
      .filter(function (x) { return x[0] > 0; });
    // a matchup: stories about both teams first, then either; a team: only stories about it
    scored.sort(function (a, b) { return b[0] - a[0]; });
    return scored.map(function (x) { return x[1]; });
  }

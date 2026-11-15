  // ---------- box scores, team stats and season stats (ESPN) ----------
  // On claude.ai the hourly run saves each slate game's box (or, before it starts, season stats) to box/<date>;
  // the self-hosted page reads ESPN directly and refreshes a live box every 30 seconds while it's on screen.
  var BX_SPORT = { nba: "bball", wnba: "bball", ncaam: "bball", ncaaw: "bball", nhl: "hockey", nfl: "football", ncaaf: "football", mlb: "baseball", mls: "soccer", epl: "soccer", ucl: "soccer", uel: "soccer", laliga: "soccer", seriea: "soccer", bundesliga: "soccer", ligue1: "soccer", facup: "soccer" , intl: "soccer"};
  var BX_STAT_SKIP = { teamTurnovers: 1, totalTechnicalFouls: 1, avgTeamTurnovers: 1, shootoutGoals: 1, shotPct: 1, passPct: 1, crossPct: 1, longballPct: 1, tacklePct: 1, effectiveClearance: 1 };
  var BX_SOCCER = [["totalGoals", "G"], ["goalAssists", "A"], ["totalShots", "SH"], ["shotsOnTarget", "SOG"], ["foulsCommitted", "FC"], ["yellowCards", "YC"], ["redCards", "RC"]];
  var BX_SEASON = {
    bball: { game: [["gamesPlayed", "GP"], ["avgMinutes", "MIN"], ["avgPoints", "PTS"], ["avgRebounds", "REB"], ["avgAssists", "AST"], ["fieldGoalPct", "FG%"], ["threePointFieldGoalPct|threePointPct", "3P%"], ["freeThrowPct", "FT%"], ["avgSteals", "STL"], ["avgBlocks", "BLK"], ["avgTurnovers", "TO"]] },
    hockey: { team: [["games", "GP"], ["goals", "G"], ["assists", "A"], ["points", "PTS"], ["plusMinus", "+/-"], ["shotsTotal", "S"], ["powerPlayGoals", "PPG"], ["timeOnIcePerGame", "TOI/G"], ["penaltyMinutes", "PIM"]],
              goalkeeping: [["games", "GP"], ["wins", "W"], ["losses", "L"], ["overtimeLosses", "OTL"], ["avgGoalsAgainst", "GAA"], ["savePct", "SV%"], ["saves", "SV"]] },
    football: { passing: [["completions", "CMP"], ["passingAttempts", "ATT"], ["passingYards", "YDS"], ["passingTouchdowns", "TD"], ["interceptions", "INT"], ["QBRating", "RTG"]],
                rushing: [["rushingAttempts", "CAR"], ["rushingYards", "YDS"], ["yardsPerRushAttempt", "AVG"], ["rushingTouchdowns", "TD"]],
                receiving: [["receptions", "REC"], ["receivingYards", "YDS"], ["yardsPerReception", "AVG"], ["receivingTouchdowns", "TD"]],
                defensive: [["totalTackles", "TOT"], ["sacks", "SACK"], ["tacklesForLoss", "TFL"], ["passesDefended", "PD"], ["interceptions", "INT"]] },
    baseball: { batting: [["gamesPlayed", "GP"], ["avg", "AVG"], ["homeRuns", "HR"], ["RBIs", "RBI"], ["runs", "R"], ["OPS", "OPS"], ["stolenBases", "SB"]],
                pitching: [["gamesPlayed", "GP"], ["wins", "W"], ["losses", "L"], ["ERA", "ERA"], ["innings", "IP"], ["strikeouts", "K"], ["WHIP", "WHIP"], ["saves", "SV"]] }
  };
  var BX_SEASON_MAX = 15;
  BX_SEASON.soccer = { outfield: [["appearances", "APP"], ["totalGoals", "G"], ["goalAssists", "A"], ["totalShots", "SH"], ["shotsOnTarget", "SOT"], ["foulsSuffered", "FS"], ["yellowCards", "YC"], ["redCards", "RC"]],
                       keepers: [["appearances", "APP"], ["saves", "SV"], ["goalsConceded", "GA"], ["yellowCards", "YC"]] };
  // ESPN has no season stats endpoint for soccer, but its squad list carries each player's season numbers: reshape it like the others
  function soccerSeason(roster) {
    var out = [], gk = [];
    ((roster || {}).athletes || []).forEach(function (a) {
      var st = []; (((a.statistics || {}).splits || {}).categories || []).forEach(function (c) { (c.stats || []).forEach(function (x) { st.push({ name: x.name, displayValue: x.displayValue, value: x.value }); }); });
      var v = {}; st.forEach(function (x) { v[x.name] = Number(x.value) || 0; });
      if (!v.appearances) return;
      var row = { athlete: a, statistics: [{ stats: st }], _s: (v.totalGoals || 0) * 3 + (v.goalAssists || 0) * 2 + (v.appearances || 0) * 0.1 };
      ((a.position || {}).abbreviation === "G" ? gk : out).push(row);
    });
    out.sort(function (x, y) { return y._s - x._s; }); gk.sort(function (x, y) { return y._s - x._s; });
    return { results: [{ name: "outfield", leaders: out }, { name: "keepers", leaders: gk }] };
  }
  function seasonFetch(lg, id) {
    // during the MLS playoffs ESPN's roster defaults to the (empty) playoff stats: ask for the season by year when that happens
    var hasStats = function (r) { return !!r && (r.athletes || []).some(function (a) { return a.statistics && a.statistics.splits; }); };
    return BX_SPORT[lg] === "soccer" ? rkFetch(bxApi(lg, "teams/" + id + "/roster")).then(function (r) {
      if (hasStats(r)) return soccerSeason(r);
      var y = new Date().getFullYear();
      return rkFetch(bxApi(lg, "teams/" + id + "/roster?season=" + y)).then(function (r2) { return hasStats(r2) ? r2 : rkFetch(bxApi(lg, "teams/" + id + "/roster?season=" + (y - 1))); }).then(function (r3) { return r3 ? soccerSeason(r3) : (r ? soccerSeason(r) : null); });
    })
      : rkFetch(bxApi(lg, "teams/" + id + "/athletes/statistics"));
  }
  function bxName(a) { a = a || {}; return a.shortName || a.displayName || ""; }
  function bxLabel(x) { var l = x.label || x.displayName || x.abbreviation || x.name || ""; if (/^[A-Z][A-Z ]{3,}$/.test(l)) l = l.charAt(0) + l.slice(1).toLowerCase(); return l; }
  // ESPN's game summary (plus, before the start, each team's season stats) → the small shape saved in box/<date>.
  // The hourly run has a Python twin of this function: keep the two in step.
  function bxNorm(lg, sum, seasons) {
    var sport = BX_SPORT[lg] || "", head = sum.header || {}, comp = (head.competitions || [])[0] || {}, st = (comp.status || {}).type || {};
    var out = { v: 1, ev: String(head.id || ""), state: st.state || "", detail: st.shortDetail || st.detail || "", teams: [] };
    var pk = (sum.pickcenter || [])[0];
    if (pk) out.odds = { provider: (pk.provider || {}).name || "", spread: pk.details || "", total: pk.overUnder != null ? pk.overUnder : "", ml: { away: (pk.awayTeamOdds || {}).moneyLine, home: (pk.homeTeamOdds || {}).moneyLine } };
    var wpl = sum.winprobability || []; if (wpl.length && wpl[wpl.length - 1].homeWinPercentage != null) out.wp = Number(wpl[wpl.length - 1].homeWinPercentage);
    var box = sum.boxscore || {};
    var cs = (comp.competitors || []).slice().sort(function (a, b) { return (a.homeAway === "home" ? 1 : 0) - (b.homeAway === "home" ? 1 : 0); });
    cs.forEach(function (c) {
      var tm = c.team || {}, id = String(tm.id || "");
      var t = { side: c.homeAway === "home" ? "home" : "away", id: id, abbr: tm.abbreviation || "", name: tm.displayName || "", stats: [], groups: [] };
      var ij = (sum.injuries || []).filter(function (x) { return String((x.team || {}).id) === id; })[0];
      t.inj = ((ij && ij.injuries) || []).map(function (i) { var d = i.details || {}; return { n: bxName(i.athlete), why: String(d.type || d.detail || "").toLowerCase(), s: String(i.status || "").toLowerCase() }; }).filter(function (i) { return i.n; });
      var bt = (box.teams || []).filter(function (x) { return String((x.team || {}).id) === id; })[0], seen = {};
      ((bt && bt.statistics) || []).forEach(function (x) {
        var k = x.name || x.label || "";
        if (!k || BX_STAT_SKIP[k] || seen[k] || x.displayValue == null || x.displayValue === "") return;
        seen[k] = 1; t.stats.push([k, bxLabel(x), String(x.displayValue)]);
      });
      if (sport === "soccer") {
        var xs = t.stats.filter(function (q) { return q[0] === "expectedGoals"; })[0]; if (xs) { xs[0] = "xG"; xs[1] = "xG"; }  // real xG only, when ESPN sends it
        var ro = (sum.rosters || []).filter(function (x) { return String((x.team || {}).id) === id; })[0], rows = [];
        // lineups: the starting XI in its formation, and the bench (out about an hour before kickoff)
        var ln = function (a) { a = a || {}; var nm = a.lastName || String(a.shortName || a.displayName || "").replace(/^[A-Z]\.\s*/, ""); return nm; };
        var roster = (ro && ro.roster) || [];
        if (roster.some(function (p) { return p.starter; })) {
          t.form = (ro && ro.formation) || "";
          t.xi = roster.filter(function (p) { return p.starter; }).map(function (p) { return { n: ln(p.athlete), id: String((p.athlete || {}).id || ""), num: String(p.jersey || ""), p: (p.position || {}).abbreviation || "", fp: Number(p.formationPlace) || 0, off: p.subbedOut ? 1 : 0 }; });
          t.bench = roster.filter(function (p) { return !p.starter; }).map(function (p) { return { n: ln(p.athlete), id: String((p.athlete || {}).id || ""), num: String(p.jersey || ""), on: p.subbedIn ? 1 : 0 }; });
        }
        ((ro && ro.roster) || []).forEach(function (p) {
          if (!p.starter && !p.subbedIn) return;
          var m = {}; (p.stats || []).forEach(function (s) { m[s.name] = s.displayValue; });
          rows.push({ n: bxName(p.athlete), id: String((p.athlete || {}).id || ""), p: (p.position || {}).abbreviation || "", st: p.starter ? 1 : 0, s: BX_SOCCER.map(function (c2) { return m[c2[0]] != null ? String(m[c2[0]]) : "0"; }) });
        });
        // (no per-player stat table during or after a match: the pitch and timeline carry it)
      } else if (out.state === "in" || out.state === "post") {
        var bp = (box.players || []).filter(function (x) { return String((x.team || {}).id) === id; })[0];
        ((bp && bp.statistics) || []).forEach(function (grp) {
          var rows2 = (grp.athletes || []).map(function (a) {
            var ath = a.athlete || {}, ss = (a.stats || []).map(function (v) { return String(v); });
            var r = { n: bxName(ath), id: String(ath.id || ""), p: (ath.position || {}).abbreviation || "", st: a.starter ? 1 : 0, s: ss };
            if (a.didNotPlay) r.dnp = a.reason || "DNP"; else if (!ss.length) r.dnp = "";
            return r;
          });
          if (!rows2.length) return;
          var g2 = { k: grp.name || "", cols: (grp.labels || []).slice(), rows: rows2 };
          if ((grp.totals || []).some(function (v) { return v !== "" && v != null; })) g2.tot = grp.totals.map(function (v) { return String(v); });
          t.groups.push(g2);
        });
      }
      if (out.state === "pre" && seasons && seasons[id] && BX_SEASON[sport]) {
        out.season = true;
        (seasons[id].results || []).forEach(function (grp) {
          var spec = BX_SEASON[sport][grp.name]; if (!spec) return;
          var rows3 = (grp.leaders || []).slice(0, BX_SEASON_MAX).map(function (a) {
            var m = {}, ath = a.athlete || {};
            (a.statistics || []).forEach(function (cat) { (cat.stats || []).forEach(function (s) { if (!(s.name in m)) m[s.name] = s.displayValue; }); });
            return { n: bxName(ath), id: String(ath.id || ""), p: (ath.position || {}).abbreviation || "", s: spec.map(function (c2) { var ks = c2[0].split("|"); for (var i = 0; i < ks.length; i++) if (m[ks[i]] != null) return String(m[ks[i]]); return "–"; }) };
          });
          if (rows3.length) t.groups.push({ k: grp.name, cols: spec.map(function (c2) { return c2[1]; }), rows: rows3 });
        });
      }
      out.teams.push(t);
    });
    if (sport === "soccer") {  // the match timeline: goals, cards and substitutions
      var KT = function (tx) { tx = String(tx || "").toLowerCase(); return /own goal/.test(tx) ? "og" : /penalty - scored/.test(tx) ? "pen" : /^goal/.test(tx) ? "goal" : /red card|second yellow/.test(tx) ? "rc" : /yellow card/.test(tx) ? "yc" : /substitution/.test(tx) ? "sub" : ""; };
      var lnm = function (p) { var a = (p && p.athlete) || {}; return a.lastName || String(a.shortName || a.displayName || "").replace(/^[A-Z]\.\s*/, ""); };
      out.ev = (sum.keyEvents || []).map(function (k) {
        var kk = KT((k.type || {}).text); if (!kk) return null;
        var ps = k.participants || [];
        var aid = function (p) { return String(((p && p.athlete) || {}).id || ""); };
        return { m: String((k.clock || {}).displayValue || "").replace(/'$/, "").replace(/'\+/, "+"), k: kk, tid: String((k.team || {}).id || ""), a: lnm(ps[0]), b: ps[1] ? lnm(ps[1]) : "", ai: aid(ps[0]), bi: aid(ps[1]), sv: (k.clock || {}).value || 0 };
      }).filter(Boolean);
      var tmap = {}; (out.teams || []).forEach(function (t) { tmap[t.id] = { name: t.name, abbr: t.abbr }; });
      socPens(sum, tmap).forEach(function (p) { out.ev.push({ m: p.m, k: p.k, tid: p.tid, a: p.a, b: p.b || "", x: p.x || "", sv: p.sv - 0.5 }); });
      out.ev.sort(function (x, y) { return x.sv - y.sv; });
    }
    return out;
  }
  // penalties from the commentary: awarded (who won it, who gave it away) and missed or saved
  function socPens(sum, teams) {
    var norm = function (x) { return String(x || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, ""); }, byName = {};
    Object.keys(teams || {}).forEach(function (i) { var t = teams[i]; [t.name, t.full, t.abbr].forEach(function (n) { if (n) byName[norm(n)] = i; }); });
    (((sum.header || {}).competitions || [])[0] || {}).competitors && sum.header.competitions[0].competitors.forEach(function (c) { var tm = c.team || {}; [tm.displayName, tm.shortDisplayName, tm.name, tm.location].forEach(function (n) { if (n) byName[norm(n)] = String(tm.id); }); });
    var ids = Object.keys(teams || {}), other = function (i) { return ids.filter(function (x) { return x !== i; })[0]; };
    var find = function (n) { n = norm(n); if (byName[n]) return byName[n]; for (var k in byName) if (k && (n.indexOf(k) >= 0 || k.indexOf(n) >= 0)) return byName[k]; return ""; };
    var lastN = function (p) { var a = (p && p.athlete) || {}; var d = String(a.displayName || ""); return a.lastName || d.split(" ").slice(1).join(" ") || d; };
    var seen = {}, out = [];
    (sum.commentary || []).forEach(function (c) {
      var pl = c.play || {}, tx = String(c.text || ""), pt = String((pl.type || {}).text || ""), id = String(pl.id || c.sequence), ps = pl.participants || [];
      var mi = parseInt(String((c.time || {}).displayValue || "0"), 10) || 0, m = String((c.time || {}).displayValue || "").replace(/'$/, "").replace(/'\+/, "+"), sv = (c.time || {}).value || 0;
      if (/^penalty conceded by|^penalty .*draws a foul/i.test(tx) || (/foul/i.test(pt) && /penalty area/i.test(String(pl.text || "")) && /^penalty/i.test(String(pl.text || "")))) {
        if (seen["a" + id]) return; seen["a" + id] = 1; var gave = find((pl.team || {}).displayName); if (!gave) return;
        out.push({ k: "pa", m: m, mi: mi, sv: sv, tid: other(gave), a: lastN(ps[1]), b: lastN(ps[0]) });
      } else if (/penalty - (missed|saved)/i.test(pt) || /^penalty (missed|saved)!/i.test(tx)) {
        if (seen["m" + id]) return; seen["m" + id] = 1; var t0 = find((pl.team || {}).displayName); if (!t0) { var mm = /\(([^)]+)\)/.exec(tx); t0 = mm ? find(mm[1]) : ""; } if (!t0) return;
        out.push({ k: "pm", m: m, mi: mi, sv: sv, tid: t0, a: lastN(ps[0]) || ((/(?:by|!) ([^(]+) \(/.exec(tx) || [])[1] || "").trim(), x: /saved/i.test(pt + tx) ? "saved" : "missed" });
      }
    });
    return out.sort(function (x, y) { return x.sv - y.sv; });
  }
  // ---- soccer: lineups on a little pitch, and the match timeline ----
  var SOC_DEPTH = function (p) { p = String(p || "").toUpperCase(); return p === "G" || p === "GK" ? 0 : /^(CD|CB|RB|LB|D|WB|RWB|LWB|SW)/.test(p) ? 1 : /^DM/.test(p) ? 2 : /^AM/.test(p) ? 4 : /^(F|CF|ST|S|LW|RW|W)/.test(p) ? 5 : 3; };
  var SOC_SIDE = function (p) { p = String(p || "").toUpperCase(); return /-L$|^L/.test(p) ? 0 : /-R$|^R/.test(p) ? 2 : 1; };
  function socTeamColor(g, t) { var sd = t.side || "away", c = badgeColor(g, sd); return c || "var(--raise)"; }
  function socInk(c) { var m = /^#?([0-9a-f]{6})$/i.exec(String(c || "").trim()); if (!m) return "#fff"; var n = parseInt(m[1], 16), r = n >> 16, g2 = n >> 8 & 255, b2 = n & 255; return (0.299 * r + 0.587 * g2 + 0.114 * b2) > 170 ? "#111820" : "#fff"; }
  function socLineup(g, t, b) {
    if (!t || !t.xi || !t.xi.length) return null;
    var wrap = el("div", "soc-lu"), hd = el("div", "soc-lu-h");
    hd.appendChild(el("b", null, b && b.state === "pre" ? "Starting lineup" : "Lineup")); if (t.form) hd.appendChild(el("span", "soc-form", t.form));
    wrap.appendChild(hd);
    // marks from the timeline: goals, cards, subbed off
    var marks = {}, mk0 = function (k) { return marks[k] = marks[k] || { g: 0, a: 0, yc: 0, rc: 0, off: "", on: "" }; };
    ((b && b.ev) || []).forEach(function (e) {
      if (e.tid !== t.id) return; var A = e.ai || e.a, B = e.bi || e.b;
      if (e.k === "goal" || e.k === "pen") { mk0(A).g++; if (B) mk0(B).a++; }
      else if (e.k === "yc") mk0(A).yc++; else if (e.k === "rc") mk0(A).rc++;
      else if (e.k === "sub") { mk0(A).on = e.m; if (B) mk0(B).off = e.m; }
    });
    var markOf = function (p) { return marks[p.id] || marks[p.n] || {}; };
    var gk = t.xi.filter(function (p) { return SOC_DEPTH(p.p) === 0; }), out = t.xi.filter(function (p) { return SOC_DEPTH(p.p) !== 0; });
    out.sort(function (a, b2) { return SOC_DEPTH(a.p) - SOC_DEPTH(b2.p) || a.fp - b2.fp; });
    var shape = String(t.form || "").split("-").map(Number).filter(function (n) { return n > 0; }), lines = [], i = 0;
    if (shape.reduce(function (a, n) { return a + n; }, 0) !== out.length) { shape = []; var byD = {}; out.forEach(function (p) { var d = SOC_DEPTH(p.p); (byD[d] = byD[d] || []).push(p); }); Object.keys(byD).sort().forEach(function (d) { lines.push(byD[d]); }); }
    else shape.forEach(function (n) { lines.push(out.slice(i, i + n)); i += n; });
    lines.unshift(gk);
    var pitch = el("div", "soc-pitch"), col = socTeamColor(g, t);
    lines.slice().reverse().forEach(function (ln) {  // attack at the top, keeper at the bottom
      var row = el("div", "soc-line");
      ln.slice().sort(function (a, b2) { return SOC_SIDE(a.p) - SOC_SIDE(b2.p); }).forEach(function (p) {
        var c = el("div", "soc-p" + (p.off ? " off" : "")), dot = el("span", "soc-n", p.num || "");
        dot.style.background = col; dot.style.color = socInk(col); c.appendChild(dot);
        var mk = markOf(p), tags = el("span", "soc-tags");
        for (var k = 0; k < (mk.g || 0); k++) tags.appendChild(el("i", "soc-ball", "⚽"));
        for (var k2 = 0; k2 < (mk.a || 0); k2++) tags.appendChild(el("i", "soc-ast", "A"));
        if (mk.yc) tags.appendChild(el("i", "soc-card y")); if (mk.rc) tags.appendChild(el("i", "soc-card r"));
        if (tags.childNodes.length) c.appendChild(tags);
        c.appendChild(el("span", "soc-nm", p.n)); if (mk.off) c.appendChild(el("span", "soc-sub", "↓ " + mk.off + "'"));
        row.appendChild(c);
      });
      pitch.appendChild(row);
    });
    wrap.appendChild(pitch);
    if ((t.bench || []).length) {
      var bn = el("p", "soc-bench"), on = t.bench.filter(function (p) { return p.on; }), rest = t.bench.filter(function (p) { return !p.on; });
      bn.appendChild(el("b", null, "Bench "));
      on.concat(rest).forEach(function (p, j) { var sp = el("span", p.on ? "on" : null, p.n + (p.on && markOf(p).on ? " ↑" + markOf(p).on + "'" : p.on ? " ↑" : "")); if (j) bn.appendChild(document.createTextNode(" · ")); bn.appendChild(sp); });
      wrap.appendChild(bn);
    }
    return wrap;
  }
  // the match in a few bullet points: goals with the running score, penalties, red cards, half-time and full-time,
  // then bookings and substitutions summed up per team (compact: goals, penalties and red cards only)
  function socTimeline(g, b, compact) {
    var ev = (b && b.ev) || []; if (!ev.length && !(b && (b.state === "in" || b.state === "post"))) return null;
    var teams = b.teams || [], byId = {}; teams.forEach(function (t) { byId[t.id] = t; });
    var ids = teams.map(function (t) { return t.id; }), other = function (id) { return ids[0] === id ? ids[1] : ids[0]; };
    var nm = function (id) { var t = byId[id] || {}; return t.name || t.abbr || ""; };
    var base = function (m) { return parseInt(String(m), 10) || 0; };
    var half = function (m) { var n = base(m); return n > 90 && !/^90\+/.test(String(m)) ? 3 : n > 45 && !/^45\+/.test(String(m)) ? 2 : 1; };
    var sc = {}; ids.forEach(function (id) { sc[id] = 0; });
    var scoreText = function () { var a = sc[ids[0]] || 0, z = sc[ids[1]] || 0; if (a === z) return "level at " + a + "–" + z; var up = a > z ? ids[0] : ids[1]; return nm(up) + " lead " + Math.max(a, z) + "–" + Math.min(a, z); };
    var items = [], books = {}, subs = {}, lastHalf = 1, done = b.state === "post";
    var HALF = { 2: "Half-time", 3: "Full time, on to extra time" };
    ev.forEach(function (e) {
      var h = half(e.m);
      if (h > lastHalf) { for (var q = lastHalf + 1; q <= h; q++) items.push({ k: "mark", t: HALF[q] + ": " + scoreText() }); lastHalf = h; }
      var tm = nm(e.tid), mn = e.m + "'";
      if (e.k === "goal" || e.k === "pen" || e.k === "og") {
        var by = e.tid; if (by in sc) sc[by]++;   // ESPN files an own goal under the team it counts for
        // goals in short: the scorer, then the assist (or penalty / own goal) in brackets; the score follows
        var t = e.k === "og" ? (e.a ? e.a + " (own goal)" : "Own goal")
          : (e.a || "Goal") + (e.k === "pen" ? " (penalty)" : e.b ? " (" + e.b + ")" : "");
        var a0 = sc[ids[0]] || 0, z0 = sc[ids[1]] || 0, ab = function (id) { return (byId[id] || {}).abbr || nm(id); };
        items.push({ k: "goal", m: mn, t: t, pill: (function () { var hi = (byId[ids[1]] || {}).side === "home" || !(byId[ids[0]] || {}).side ? 1 : 0, oi = 1 - hi; return ab(ids[hi]) + " " + sc[ids[hi]] + "–" + sc[ids[oi]] + " " + ab(ids[oi]); })(), who: e.k === "og" ? "" : e.a });
      } else if (e.k === "pa") items.push({ k: "pa", m: mn, t: "Penalty to " + tm + (e.a ? ", " + e.a + " was brought down" : "") + (e.b ? " by " + e.b : "") });
      else if (e.k === "pm") items.push({ k: "pm", m: mn, t: (e.a || "A player") + (e.x === "saved" ? " had a penalty saved" : " missed a penalty") + " for " + tm });
      else if (e.k === "rc") items.push({ k: "rc", m: mn, t: (e.a || "A player") + " was sent off; " + tm + " down to 10" });
      else if (e.k === "yc") (books[e.tid] = books[e.tid] || []).push((e.a || "?") + " " + mn);
      else if (e.k === "sub") (subs[e.tid] = subs[e.tid] || []).push((e.a || "?") + (e.b ? " for " + e.b : "") + " " + mn);
    });
    if (done) items.push({ k: "mark", t: "Full time: " + (function () { var a = sc[ids[0]] || 0, z = sc[ids[1]] || 0; if (a === z) return "drawn " + a + "–" + z; var w = a > z ? ids[0] : ids[1]; return nm(w) + " win " + Math.max(a, z) + "–" + Math.min(a, z); })() });
    {
      var per = function (map, label) { var bits = ids.filter(function (id) { return map[id]; }).map(function (id) { return nm(id) + ": " + map[id].join(", "); }); if (bits.length) items.push({ k: "list", t: label + " " + bits.join(". ") }); };
      per(books, "Booked.");
    }
    // nothing big yet (no goals, penalties or red cards): say so, so the summary is there from kickoff (3.29.2)
    if (!items.some(function (x) { return x.k !== "mark" && x.k !== "list"; })) items.unshift({ k: "mark", t: done ? "No goals" : "No goals yet" });
    var w = el("div", "soc-tl soc-sum"); w.appendChild(el("b", "pv-h", "Match summary"));
    var ul = el("ul", "soc-bul");
    items.forEach(function (x) {
      var li = el("li", "soc-li soc-" + x.k);
      if (x.k === "goal") li.appendChild(el("span", "soc-gl", "⚽"));
      if (x.m) li.appendChild(el("span", "soc-min", x.m));
      li.appendChild(el("span", "soc-tx", x.t));
      if (x.pill) li.appendChild(el("span", "soc-score", x.pill));
      ul.appendChild(li);
    });
    w.appendChild(ul);
    return w;
  }


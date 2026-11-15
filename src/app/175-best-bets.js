  // ---- Best bets (3.31.0): stat-based props for the games on the slate, from ESPN game logs ----
  // A player's last six games this season (or both teams' last five for a game total), counted straight from the logs: no projections, no estimates.
  // Players: the teams' season leaders, plus the depth chart's starters on offense in football. Hurt players (out or doubtful) are left out.
  var BET_LG = { nfl: 1, ncaaf: 1, nba: 1, wnba: 1, ncaam: 1, ncaaw: 1, nhl: 1 };
  var BET_DEF = {
    football: [
      { k: "td", lab: "Anytime TD", any: 1, has: ["rushingTouchdowns", "receivingTouchdowns"], val: function (v) { return betN(v.rushingTouchdowns) + betN(v.receivingTouchdowns); }, rungs: [1] },
      { k: "ptd", lab: "+ pass TDs", has: ["passingTouchdowns"], val: function (v) { return betN(v.passingTouchdowns); }, rungs: [2, 3] },
      { k: "pyd", lab: "+ pass yds", has: ["passingYards"], val: function (v) { return betN(v.passingYards); }, rungs: [200, 250, 300] },
      { k: "ryd", lab: "+ rush yds", has: ["rushingYards"], val: function (v) { return betN(v.rushingYards); }, rungs: [50, 75, 100] },
      { k: "rec", lab: "+ catches", has: ["receptions"], val: function (v) { return betN(v.receptions); }, rungs: [4, 5, 6, 8] },
      { k: "cyd", lab: "+ rec yds", has: ["receivingYards"], val: function (v) { return betN(v.receivingYards); }, rungs: [50, 75, 100] }
    ],
    bball: [
      { k: "pts", lab: "+ points", has: ["points"], val: function (v) { return betN(v.points); }, rungs: [10, 15, 20, 25, 30, 35] },
      { k: "reb", lab: "+ rebounds", has: ["totalRebounds"], val: function (v) { return betN(v.totalRebounds); }, rungs: [6, 8, 10, 12, 15] },
      { k: "ast", lab: "+ assists", has: ["assists"], val: function (v) { return betN(v.assists); }, rungs: [4, 6, 8, 10, 12] },
      { k: "3pm", lab: "+ threes", has: ["threePointFieldGoalsMade-threePointFieldGoalsAttempted"], val: function (v) { return betN(v["threePointFieldGoalsMade-threePointFieldGoalsAttempted"]); }, rungs: [2, 3, 4, 5] }
    ],
    hockey: [
      { k: "g", lab: "Anytime goal", any: 1, has: ["goals"], val: function (v) { return betN(v.goals); }, rungs: [1] },
      { k: "pt", lab: "+ points", has: ["points"], val: function (v) { return betN(v.points); }, rungs: [1, 2] },
      { k: "sog", lab: "+ shots", has: ["shotsTotal"], val: function (v) { return betN(v.shotsTotal); }, rungs: [3, 4, 5] }
    ]
  };
  function betN(x) { var n = parseFloat(x); return isNaN(n) ? 0 : n; }
  var BETS = (function () { try { return JSON.parse(localStorage.getItem("slate-bets") || "{}"); } catch (e) { return {}; } })(), betQ = [], betRun = 0, betT = null, GLOG = {};
  function betSave() { try { var keep = {}, cut = Date.now() - 2 * 864e5; Object.keys(BETS).forEach(function (k) { if (BETS[k].at > cut && BETS[k].list) keep[k] = { at: BETS[k].at, list: BETS[k].list }; }); localStorage.setItem("slate-bets", JSON.stringify(keep)); } catch (e) {} }
  // a player's games this season, newest first: [{ at, v: { statName: value } }] (an old season's log counts as nothing)
  function glGames(gl, before) {
    if (!gl) return [];
    var names = gl.names || [], st = (gl.seasonTypes || []).filter(function (x) { return !/pre|post|bowl|playoff/i.test(x.displayName || ""); })[0], out = [], seen = {};
    if (!st) return [];
    (st.categories || []).forEach(function (c) { (c.events || []).forEach(function (e) {
      var id = String(e.eventId || ""); if (!id || seen[id]) return; seen[id] = 1;
      var info = (gl.events || {})[id] || {}, at = Date.parse(info.gameDate || "") || 0; if (!at || (before && at >= before - 3600e3)) return;
      var v = {}; names.forEach(function (n, i) { v[n] = (e.stats || [])[i]; }); out.push({ at: at, v: v }); }); });
    out.sort(function (a, b) { return b.at - a.at; });
    return out.length && Date.now() - out[0].at < 75 * 864e5 ? out : [];
  }
  function glFetch(lg, id) { var k = lg + "|" + id; return GLOG[k] || (GLOG[k] = rkFetch("https://site.api.espn.com/apis/common/v3/sports/" + bxBase(lg) + "/athletes/" + id + "/gamelog")); }
  // the best prop a player's last six games support: the highest milestone hit in 5 of 6 (4 of 5), or a TD or goal in 4 of 6
  function betEval(sport, gl, before) {
    var games = glGames(gl, before).slice(0, 6), n = games.length, names = (gl && gl.names) || [], best = null;
    if (n < 4) return null;
    (BET_DEF[sport] || []).forEach(function (d) {
      if (!d.has.some(function (h) { return names.indexOf(h) !== -1; })) return;
      var vals = games.map(function (x) { return d.val(x.v); }).reverse();  // oldest first
      for (var ri = d.rungs.length - 1; ri >= 0; ri--) {
        var r = d.rungs[ri], hits = vals.filter(function (x) { return x >= r; }).length, rate = hits / n;
        if (d.any ? (rate >= 0.6 && hits >= 3) : rate >= 0.8) {
          var sc = rate * 100 + ri * 4 + (d.any ? 20 : 0) + (n >= 6 ? 2 : 0);  // a TD or goal in 4 of 6 is rarer than a milestone in 5 of 6
          if (!best || sc > best.sc) best = { k: d.k, lab: d.any ? d.lab : (d.k === "pt" && r === 1 ? "1+ point" : r + d.lab), h: hits, n: n, vals: vals, hit: vals.map(function (x) { return x >= r ? 1 : 0; }), sc: sc };
          break;
        }
      }
    });
    return best;
  }
  function betNeed(g) {
    var b = BETS[g.id];
    if (b && (b.busy || b.queued || Date.now() - b.at < 3 * 3600e3)) return;
    b = BETS[g.id] = b || { at: 0, list: null }; b.queued = true; betQ.push(g); betPump();
  }
  function betPump() {
    while (betRun < 1 && betQ.length) (function (g) {
      var b = BETS[g.id]; b.queued = false; b.busy = true; betRun++;
      var cur = bx.live[g.id] || (bx.live[g.id] = {}), lg = g.league, sport = BX_SPORT[lg], start = Date.parse(g.start) || Date.now();
      (cur.sum && Date.now() - (cur.sumAt || 0) < 30 * 60000 ? Promise.resolve(cur.sum) : (cur.ev ? Promise.resolve(cur.ev) : bxFindEvent(g)).then(function (ev) { if (!ev) return null; cur.ev = ev; return rkFetch(bxSummaryUrl(lg, ev)); })).then(function (sum) {
        if (!sum) return null; cur.sum = cur.sum || sum;
        var comp = ((sum.header || {}).competitions || [])[0] || {}, side = {}, hurt = {}, ppl = {}, out = [];
        (comp.competitors || []).forEach(function (k) { side[String((k.team || {}).id || "")] = k.homeAway === "home" ? "home" : "away"; });
        (sum.injuries || []).forEach(function (t) { (t.injuries || []).forEach(function (x) { if (/out|reserve|suspen|doubt/i.test(String(x.status || ""))) hurt[String((x.athlete || {}).id || "")] = 1; }); });
        var want = function (a, tid, pos) { var id = String((a && a.id) || ""); if (!id || hurt[id] || ppl[id] || !side[tid]) return; ppl[id] = { id: id, name: a.displayName || a.name || "", pos: pos || ((a.position || {}).abbreviation) || "", tid: tid }; };
        (sum.leaders || []).forEach(function (L) { var tid = String((L.team || {}).id || ""); (L.leaders || []).forEach(function (cat) { if (/tackle|sack|intercept|save|plusMinus|rating/i.test(cat.name || "")) return; ((cat.leaders || [])[0] || {}).athlete && want(cat.leaders[0].athlete, tid); }); });
        var deps = sport === "football" ? Object.keys(side).map(function (tid) { return depthOf(lg, tid).then(function (o) { if (o) ["qb", "rb", "wr1", "wr2", "te"].forEach(function (k) { if (o[k]) want(o[k], tid, o[k].pos); }); }); }) : [];
        return Promise.all(deps).then(function () {
          return Promise.all(Object.keys(ppl).map(function (id) { var P = ppl[id]; return glFetch(lg, id).then(function (gl) {
            var r = betEval(sport, gl, start); if (!r) return;
            r.p = P.name; r.pos = P.pos; r.sd = side[P.tid]; out.push(r); }); }));
        }).then(function () {
          // the game total: both teams' last five games against tonight's over/under
          var pk = (sum.pickcenter || [])[0] || {}, ou = parseFloat(pk.overUnder), tot = [], seenEv = {};
          if (!isNaN(ou)) (sum.lastFiveGames || []).forEach(function (t) { (t.events || []).forEach(function (e) { if (seenEv[e.id]) return; seenEv[e.id] = 1; var a = parseFloat(e.homeTeamScore), h = parseFloat(e.awayTeamScore); if (!isNaN(a) && !isNaN(h)) tot.push({ at: Date.parse(e.gameDate) || 0, v: a + h }); }); });
          if (tot.length >= 8) {
            tot.sort(function (a, b) { return a.at - b.at; }); var vals = tot.map(function (x) { return x.v; }), n = vals.length;
            var ov = vals.filter(function (x) { return x > ou; }).length, un = vals.filter(function (x) { return x < ou; }).length, over = ov >= un, h = over ? ov : un;
            if (h / n >= 0.7) out.push({ k: over ? "over" : "under", game: 1, lab: (over ? "Over " : "Under ") + ou, h: h, n: n, vals: vals, hit: vals.map(function (x) { return (over ? x > ou : x < ou) ? 1 : 0; }), sc: h / n * 100 - 4 });
          }
          out.sort(function (a, b) { return b.sc - a.sc; });
          return out;
        });
      }).then(function (list) {
        b.at = Date.now(); if (list) { b.list = list; betSave(); clearTimeout(betT); betT = setTimeout(function () { if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, 300); }
      }, function () { b.at = Date.now() - 2.5 * 3600e3; }).then(function () { b.busy = false; betRun--; betPump(); });
    })(betQ.shift());
  }
  // the section at the bottom of the slate: strongest trends first, three a game at most; "Show all" opens the rest
  function betsBlock(games) {
    var gs = games.filter(function (g) { return BET_LG[g.league] && !g.custom && status(g).kind !== "over"; });
    if (!gs.length) return null;
    gs.forEach(betNeed);
    var all = [], perG = {}, waiting = gs.some(function (g) { return !(BETS[g.id] || {}).list; });
    gs.forEach(function (g) { ((BETS[g.id] || {}).list || []).forEach(function (x) { all.push({ g: g, b: x }); }); });
    // games still to come first (live ones after: the trend was a pre-game read), strongest first
    all.sort(function (x, y) { return ((status(x.g).kind === "live") - (status(y.g).kind === "live")) || (y.b.sc - x.b.sc) || byStart(x.g, y.g); });
    all = all.filter(function (x) { perG[x.g.id] = (perG[x.g.id] || 0) + 1; return perG[x.g.id] <= 3; });
    // the first six mix it up: two of any one kind of bet (points, catches, game totals…) before the rest
    var top = [], kinds = {}, rest = [];
    all.forEach(function (x) { var k = x.b.game ? "total" : x.b.k; if (top.length < 6 && (kinds[k] || 0) < 2) { kinds[k] = (kinds[k] || 0) + 1; top.push(x); } else rest.push(x); });
    all = top.concat(rest);
    var shut = !!(state.slateFold || {}).__bets, sec = el("section", "sl-sec sl-bets" + (shut ? " shut" : ""));
    var hb = el("button", "sl-h"); hb.type = "button"; hb.setAttribute("aria-expanded", shut ? "false" : "true");
    hb.appendChild(el("b", null, "Best bets")); if (all.length) hb.appendChild(el("span", "count", String(all.length))); hb.appendChild(icon("more"));
    hb.addEventListener("click", function () { var f = Object.assign({}, state.slateFold || {}); if (f.__bets) delete f.__bets; else f.__bets = 1; state.slateFold = f; saveSettings(); keepScroll(renderLineup); });
    sec.appendChild(hb);
    if (shut) return sec;
    if (!all.length) { sec.appendChild(el("p", "bets-none", waiting ? "Checking recent game logs…" : "No strong player or game trends for the games on your slate.")); return sec; }
    sec.appendChild(el("p", "bets-sub", "From each player's last six games this season, and each team's last five for game totals."));
    var list = el("div", "bets"), max = state.betsAll ? all.length : 6;
    all.slice(0, max).forEach(function (x) { list.appendChild(betRow(x.g, x.b)); });
    sec.appendChild(list);
    if (all.length > 6) { var mb = el("button", "bets-more", state.betsAll ? "Show fewer" : "Show all " + all.length); mb.type = "button"; mb.addEventListener("click", function () { state.betsAll = !state.betsAll; keepScroll(renderLineup); }); sec.appendChild(mb); }
    return sec;
  }
  function betRow(g, b) {
    var r = el("div", "bet"), m = el("div", "bet-m"), rt = el("div", "bet-r"), lv = status(g).kind === "live";
    var vs = b.game ? abbr(g, "away") + " at " + abbr(g, "home") : (b.sd === "away" ? "at " + abbr(g, "home") : "vs " + abbr(g, "away"));
    if (b.game) { var ou = el("span", "badge bet-ou", b.k === "over" ? "O" : "U"); ou.setAttribute("aria-hidden", "true"); r.appendChild(ou); }
    else r.appendChild(badgeFor(abbr(g, b.sd), g[b.sd], g[b.sd + "Color"], g[b.sd + "Alt"]));
    var p = el("b", "bet-p", b.game ? vs : b.p); if (!b.game && b.pos) p.appendChild(el("i", null, b.pos)); m.appendChild(p);
    var l = el("span", "bet-l", b.lab); l.appendChild(el("span", null, " · " + (b.game ? "game total" : vs) + (lv ? "" : " · " + timeText(g.start)))); if (lv) l.appendChild(el("em", "bet-lv", "Live")); m.appendChild(l);
    r.appendChild(m);
    rt.appendChild(el("b", null, b.h + "/" + b.n)); rt.appendChild(el("i", null, "last " + b.n)); r.appendChild(rt);
    var v = el("div", "bet-v"); b.vals.forEach(function (x, i) { v.appendChild(el("span", b.hit[i] ? "y" : "", String(x))); }); r.appendChild(v);
    r.setAttribute("aria-label", (b.game ? vs + ", " : b.p + ", ") + b.lab + ": hit in " + b.h + " of the last " + b.n + " games, oldest to newest " + b.vals.join(", "));
    return r;
  }

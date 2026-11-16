  // ---- Best bets (3.31.0; 3.40.0: seven picks that follow the slate and settle live): stat-based props for the games on the slate, from ESPN game logs ----
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
  var BET_SEASON_TOP = { bball: { game: 5 }, hockey: { team: 6 }, football: { passing: 1, rushing: 2, receiving: 3 } };  // season leaders to check per team, by ESPN stat group
  function betN(x) { var n = parseFloat(x); return isNaN(n) ? 0 : n; }
  var BETS = (function () { try { return JSON.parse(localStorage.getItem("slate-bets2") || "{}"); } catch (e) { return {}; } })(), betQ = [], betRun = 0, betT = null, GLOG = {};
  function betSave() { try { var keep = {}, cut = Date.now() - 2 * 864e5; Object.keys(BETS).forEach(function (k) { if (BETS[k].at > cut && BETS[k].list) keep[k] = { at: BETS[k].at, list: BETS[k].list }; }); localStorage.setItem("slate-bets2", JSON.stringify(keep)); } catch (e) {} }
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
          if (!best || sc > best.sc) best = { k: d.k, r: r, lab: d.any ? d.lab : (d.k === "pt" && r === 1 ? "1+ point" : r + d.lab), h: hits, n: n, vals: vals, hit: vals.map(function (x) { return x >= r ? 1 : 0; }), sc: sc };
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
        // before the game, the summary's leaders are the season leaders; once it starts they're tonight's, which would pick players who already did it.
        // So a game that has started (or ended) takes the teams' season leaders instead.
        var stt = ((comp.status || {}).type || {}).state || "pre";
        if (stt === "pre") (sum.leaders || []).forEach(function (L) { var tid = String((L.team || {}).id || ""); (L.leaders || []).forEach(function (cat) { if (/tackle|sack|intercept|save|plusMinus|rating/i.test(cat.name || "")) return; ((cat.leaders || [])[0] || {}).athlete && want(cat.leaders[0].athlete, tid); }); });
        var deps = sport === "football" ? Object.keys(side).map(function (tid) { return depthOf(lg, tid).then(function (o) { if (o) ["qb", "rb", "wr1", "wr2", "te"].forEach(function (k) { if (o[k]) want(o[k], tid, o[k].pos); }); }); }) : [];
        if (stt !== "pre") deps = deps.concat(Object.keys(side).map(function (tid) { return seasonFetch(lg, tid).then(function (S) {
          ((S && S.results) || []).forEach(function (grp) { var n = (BET_SEASON_TOP[sport] || {})[grp.name]; if (n) (grp.leaders || []).slice(0, n).forEach(function (a) { want(a.athlete, tid); }); });
        }, function () {}); }));
        return Promise.all(deps).then(function () {
          return Promise.all(Object.keys(ppl).map(function (id) { var P = ppl[id]; return glFetch(lg, id).then(function (gl) {
            var r = betEval(sport, gl, start); if (!r) return;
            r.pid = P.id; r.p = P.name; r.pos = P.pos; r.sd = side[P.tid]; out.push(r); }); }));
        }).then(function () {
          // the game total: both teams' last five games against tonight's over/under
          var pk = (sum.pickcenter || [])[0] || {}, ou = parseFloat(pk.overUnder), tot = [], seenEv = {};
          if (!isNaN(ou)) (sum.lastFiveGames || []).forEach(function (t) { (t.events || []).forEach(function (e) { if (seenEv[e.id]) return; seenEv[e.id] = 1; var a = parseFloat(e.homeTeamScore), h = parseFloat(e.awayTeamScore); if (!isNaN(a) && !isNaN(h)) tot.push({ at: Date.parse(e.gameDate) || 0, v: a + h }); }); });
          if (tot.length >= 8) {
            tot.sort(function (a, b) { return a.at - b.at; }); var vals = tot.map(function (x) { return x.v; }), n = vals.length;
            var ov = vals.filter(function (x) { return x > ou; }).length, un = vals.filter(function (x) { return x < ou; }).length, over = ov >= un, h = over ? ov : un;
            if (h / n >= 0.7) out.push({ k: over ? "over" : "under", game: 1, ou: ou, lab: (over ? "Over " : "Under ") + ou, h: h, n: n, vals: vals, hit: vals.map(function (x) { return (over ? x > ou : x < ou) ? 1 : 0; }), sc: h / n * 100 - 4 });
          }
          out.sort(function (a, b) { return b.sc - a.sc; });
          return out;
        });
      }).then(function (list) {
        b.at = Date.now(); if (list) { b.list = list; betSave(); clearTimeout(betT); betT = setTimeout(function () { if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, 300); }
      }, function () { b.at = Date.now() - 2.5 * 3600e3; }).then(function () { b.busy = false; betRun--; betPump(); });
    })(betQ.shift());
  }
  // ---- the picks (3.40.0; five since 3.47.0) ----
  // Once every game on the slate is over the picks freeze (3.47.0): results stay, nothing new is picked, not even after a remove.
  // Picks are kept per slate day. A pick stays until its game leaves the slate; a settled pick stays too, showing hit or miss.
  // An open spot is filled from upcoming games first, then live games, then finished ones (a finished game's pick still only uses the games before it).
  var BET_MAX = 5, BET_SIG = {};
  var PICKS = (function () { try { return JSON.parse(localStorage.getItem("slate-picks") || "{}"); } catch (e) { return {}; } })();
  function picksSave() { try { var keep = {}; Object.keys(PICKS).sort().slice(-3).forEach(function (d) { keep[d] = PICKS[d]; }); PICKS = keep; localStorage.setItem("slate-picks", JSON.stringify(keep)); } catch (e) {} }
  function betTier(g) { var k = status(g).kind; return k === "live" ? 1 : k === "over" ? 2 : 0; }
  function betDone(g) { var b = BETS[g.id]; return !!b && (!!b.list || (b.at > 0 && !b.busy && !b.queued)); }
  function betKind(b) { return b.game ? "total" : b.k; }
  function betPick(g, b) { var o = {}; Object.keys(b).forEach(function (k) { o[k] = b[k]; }); o.gid = g.id; o.uid = g.id + "|" + (b.game ? "total" : b.pid || b.p); o.lg = g.league; delete o.res; return o; }
  function betPicks(gs) {
    var day = state.date, P = PICKS[day] || (PICKS[day] = { list: [] }), on = {}, n0 = P.list.length, loading = false, gone = P.gone || {};
    gs.forEach(function (g) { on[g.id] = g; });
    P.list = P.list.filter(function (pk) { return on[pk.gid] && (pk.game || pk.pid); });  // a game taken off the slate takes its picks with it
    var changed = P.list.length !== n0, taken = {}, perG = {}, kinds = {};
    Object.keys(gone).forEach(function (u) { taken[u] = 1; });  // picks you removed don't come back
    P.list.forEach(function (pk) { taken[pk.uid] = 1; if (pk.pid) taken["p|" + pk.pid] = 1; perG[pk.gid] = (perG[pk.gid] || 0) + 1; kinds[betKind(pk)] = (kinds[betKind(pk)] || 0) + 1; });
    var cands = function (list) { var out = []; list.forEach(function (g) { ((BETS[g.id] || {}).list || []).forEach(function (b) { if ((b.game || b.pid) && !taken[g.id + "|" + (b.game ? "total" : b.pid)] && !(b.pid && taken["p|" + b.pid]) && !betSat(g, b)) out.push({ g: g, b: b }); }); }); out.sort(function (x, y) { return (y.b.sc - x.b.sc) || byStart(x.g, y.g); }); return out; };
    var fill = function (list, perMax, kindMax) {
      cands(list).forEach(function (x) {
        if (P.list.length >= BET_MAX) return;
        var k = betKind(x.b), uid = x.g.id + "|" + (x.b.game ? "total" : x.b.pid);
        if (taken[uid] || (x.b.pid && taken["p|" + x.b.pid]) || (perG[x.g.id] || 0) >= perMax || (kinds[k] || 0) >= kindMax) return;
        P.list.push(betPick(x.g, x.b)); taken[uid] = 1; if (x.b.pid) taken["p|" + x.b.pid] = 1; perG[x.g.id] = (perG[x.g.id] || 0) + 1; kinds[k] = (kinds[k] || 0) + 1; changed = true;
      });
    };
    if (P.list.length > BET_MAX) { P.list = P.list.slice(0, BET_MAX); changed = true; }  // seven-pick days from before 3.47.0 keep their best five
    var frozen = gs.every(function (g) { return status(g).kind === "over"; });
    if (frozen) { if (changed) picksSave(); return { list: P.list, loading: false, frozen: true }; }
    var tiers = [[], [], []], ready = [];
    gs.forEach(function (g) { tiers[betTier(g)].push(g); });
    for (var t = 0; t < 3 && P.list.length < BET_MAX; t++) {
      tiers[t].forEach(betNeed);  // finished games' logs are only fetched when upcoming and live games can't fill the five
      if (!tiers[t].every(betDone)) { loading = true; break; }
      ready = ready.concat(tiers[t]);
      fill(tiers[t], 3, 2); fill(tiers[t], 3, BET_MAX);  // three a game, two of any one kind (points, catches, totals…) when there's enough to choose from
    }
    if (!loading && P.list.length < BET_MAX) fill(ready, BET_MAX, BET_MAX);
    if (changed) picksSave();
    return { list: P.list, loading: loading };
  }
  // a game that already started: skip a player its box score shows sitting out (or, once it's over, not playing at all)
  function betSat(g, b) {
    var sum = !b.game && status(g).kind !== "upcoming" && (bx.live[g.id] || {}).sum; if (!sum) return false;
    var st = ((((sum.header || {}).competitions || [])[0] || {}).status || {}).type || {}, sport = BX_SPORT[g.league], line = betBoxLine(sum, b.pid, sport);
    return !!(line && line.dnp) || (!line && st.state === "post");  // over and not in the box: he didn't play for this team tonight (a stale depth chart or a traded season leader)
  }
  // removing a pick (3.41.0): it's remembered for the day so it isn't picked again, and the next best one takes its place on the redraw
  var BET_UNDO = null;
  function betRemove(pk) {
    var P = PICKS[state.date]; if (!P) return;
    var i = P.list.indexOf(pk); if (i === -1) return;
    P.list.splice(i, 1); P.gone = P.gone || {}; P.gone[pk.uid] = 1;
    BET_UNDO = { day: state.date, pk: pk, i: i, n: P.list.length };  // anything past n afterwards is the replacement
    picksSave(); keepScroll(renderLineup);
  }
  function betUndo() {
    var u = BET_UNDO, P = u && PICKS[u.day]; BET_UNDO = null; if (!P) return;
    delete (P.gone || {})[u.pk.uid];
    P.list = P.list.slice(0, u.n); P.list.splice(Math.min(u.i, P.list.length), 0, u.pk);
    picksSave(); keepScroll(renderLineup);
  }
  // the player's line in a game's box score, keyed like the game logs
  function betBoxLine(sum, pid, sport) {
    var hit = null, dnp = false;
    ((sum.boxscore || {}).players || []).forEach(function (tp) { (tp.statistics || []).forEach(function (grp) {
      var keys = grp.keys || grp.names || [];
      (grp.athletes || []).forEach(function (a) {
        if (String((a.athlete || {}).id || "") !== String(pid)) return;
        if (a.didNotPlay || !(a.stats || []).length) { dnp = dnp || !!a.didNotPlay; return; }
        hit = hit || {}; keys.forEach(function (k, i) { if (!(k in hit)) hit[k] = a.stats[i]; });
      });
    }); });
    if (!hit) return dnp ? { dnp: 1 } : null;
    if (hit.totalRebounds == null && hit.rebounds != null) hit.totalRebounds = hit.rebounds;
    if (sport === "hockey" && hit.points == null) hit.points = betN(hit.goals) + betN(hit.assists);
    return hit;
  }
  // where a pick stands: s is "pre", "live", "hit", "miss" or "void"; now is tonight's number so far
  function betResult(g, pk) {
    var kind = status(g).kind, sc = scoreRaw(g.id) || {}, cur = bx.live[g.id] || {}, sum = cur.sum, out = null;
    if (pk.game) {
      var tot = parseFloat(sc.a) + parseFloat(sc.h), fin = sc.state === "post";
      if (kind === "upcoming" || kind === "tbd" || isNaN(tot) || !(fin || sc.state === "in")) out = pk.res || { s: "pre" };
      else {
        var over = pk.k === "over", past = tot > pk.ou;
        out = { now: tot, s: over ? (past ? "hit" : !fin ? "live" : tot < pk.ou ? "miss" : "void") : (past ? "miss" : !fin ? "live" : tot < pk.ou ? "hit" : "void") };  // landing right on the line is a push
        if (fin) betKeep(pk, out);
      }
      return out;
    }
    var st = sum && ((((sum.header || {}).competitions || [])[0] || {}).status || {}).type || {};
    if (!sum || st.state === "pre" || !st.state) return pk.res || { s: kind === "live" ? "live" : "pre" };
    var sport = BX_SPORT[pk.lg || g.league], line = betBoxLine(sum, pk.pid, sport), done = st.state === "post";
    var def = (BET_DEF[sport] || []).filter(function (d) { return d.k === pk.k; })[0];
    if (!def || !pk.r) return { s: done ? "void" : "live" };
    if (!line || line.dnp) out = done ? { s: "void", why: (line && line.dnp) || sport !== "football" ? "Didn't play" : "No stats" } : { s: "live", now: 0 };
    else { var v = def.val(line); out = { now: v, s: v >= pk.r ? "hit" : done ? "miss" : "live" }; }
    if (done) betKeep(pk, out);
    return out;
  }
  function betKeep(pk, out) { var o = pk.res || {}; if (o.s !== out.s || o.now !== out.now || o.why !== out.why) { pk.res = out; picksSave(); } }
  // a live box score came in: redraw the slate only if one of this game's picks moved
  function betTouch(g) {
    var P = PICKS[state.date]; if (!P) return false;
    var sig = P.list.filter(function (pk) { return pk.gid === g.id; }).map(function (pk) { var r = betResult(g, pk); return r.s + ":" + r.now; }).join(",");
    if (!sig || BET_SIG[g.id] === sig) return false;
    BET_SIG[g.id] = sig; return true;
  }
  // the section at the bottom of the slate: always five picks (fewer only when the slate can't supply them)
  function betsBlock(games) {
    var gs = games.filter(function (g) { return BET_LG[g.league] && !g.custom; });
    if (!gs.length) return null;
    var pk = betPicks(gs), on = {}, rows = [];
    gs.forEach(function (g) { on[g.id] = g; });
    pk.list.forEach(function (p) {
      var g = on[p.gid], r = betResult(g, p), k = status(g).kind; rows.push({ g: g, p: p, r: r });
      if (!p.game && (k === "live" || (k === "over" && !p.res))) bxNeed(g);  // the box score for tonight's numbers (it keeps its own pace)
    });
    // live first, then the games still to come, then the settled ones
    var rank = function (x) { return x.r.s === "live" ? 0 : x.r.s === "pre" ? 1 : status(x.g).kind === "live" ? 2 : 3; };
    rows.sort(function (x, y) { return (rank(x) - rank(y)) || byStart(x.g, y.g) || (y.p.sc - x.p.sc); });
    var nHit = rows.filter(function (x) { return x.r.s === "hit"; }).length, nMiss = rows.filter(function (x) { return x.r.s === "miss"; }).length;
    var shut = !!(state.slateFold || {}).__bets, sec = el("section", "sl-sec sl-bets" + (shut ? " shut" : ""));
    var hb = el("button", "sl-h"); hb.type = "button"; hb.setAttribute("aria-expanded", shut ? "false" : "true");
    hb.appendChild(el("b", null, "Best bets")); if (rows.length) hb.appendChild(el("span", "count", String(rows.length))); hb.appendChild(icon("more"));
    hb.addEventListener("click", function () { var f = Object.assign({}, state.slateFold || {}); if (f.__bets) delete f.__bets; else f.__bets = 1; state.slateFold = f; saveSettings(); keepScroll(renderLineup); });
    sec.appendChild(hb);
    if (shut) return sec;
    if (!rows.length) { sec.appendChild(el("p", "bets-none", pk.loading ? "Checking recent game logs…" : pk.frozen ? "Every game on your slate is over. New picks come with the next slate." : "No strong player or game trends for the games on your slate.")); return sec; }
    var nLive = rows.filter(function (x) { return x.r.s === "live"; }).length;
    if (nHit + nMiss + nLive) {
      var ty = el("p", "bets-tally");
      [[nLive, " live", "lv"], [nHit, " hit", "hit"], [nMiss, " missed", "miss"]].forEach(function (t) { if (!t[0]) return; if (ty.childNodes.length) ty.appendChild(document.createTextNode(" · ")); ty.appendChild(el("span", "bt-" + t[2], t[0] + t[1])); });
      sec.appendChild(ty);
    }
    if (BET_UNDO && BET_UNDO.day === state.date) {
      var un = el("p", "bets-undo", "Removed " + (BET_UNDO.pk.game ? "a game total" : BET_UNDO.pk.p) + ". "), ub = el("button", null, "Undo"); ub.type = "button";
      ub.addEventListener("click", betUndo); un.appendChild(ub); sec.appendChild(un);
    }
    sec.appendChild(el("p", "bets-sub", "Picked from each player's last six games this season, and each team's last five for game totals. Tonight's numbers come from the live box score. Tap × to swap a pick for the next best one."));
    var list = el("div", "bets");
    rows.forEach(function (x) { list.appendChild(betRow(x.g, x.p, x.r)); });
    sec.appendChild(list);
    if (pk.frozen) sec.appendChild(el("p", "bets-sub", "Every game on your slate is over, so these picks are final. No new ones until the next slate."));
    else if (rows.length < BET_MAX) sec.appendChild(el("p", "bets-sub", pk.loading ? "Checking more games for the rest of the five…" : "Only " + rows.length + " picks meet the bar on your slate right now. Add games to get more."));
    return sec;
  }
  // ---- why a pick is a good bet, in plain words, from the same game logs (3.43.0) ----
  var BET_NOUN = { pts: "points", reb: "rebounds", ast: "assists", "3pm": "threes", pt: "points", sog: "shots on goal", ptd: "passing TDs", pyd: "passing yards", ryd: "rushing yards", rec: "catches", cyd: "receiving yards" };
  var BET_NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  function betNum(n) { return BET_NUM[n] || String(n); }
  function betAvg(x, big) { return big ? String(Math.round(x)) : String(Math.round(x * 10) / 10); }
  function betLast(name) { var w = String(name || "").split(" ").filter(function (x) { return !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(x); }); return w.length > 1 ? w.slice(1).join(" ") : w[0] || ""; }
  function betWhy(g, b) {
    var vals = b.vals || [], n = vals.length, hit = b.hit || [], sum = 0, run = 0;
    vals.forEach(function (x) { sum += x; });
    for (var i = hit.length - 1; i >= 0 && hit[i]; i--) run++;  // the current streak, newest game last
    var avg = n ? sum / n : 0, miss = vals.filter(function (x, i2) { return !hit[i2]; });
    var streak = run >= 3 && run < n ? " Hit in each of the last " + betNum(run) + "." : "";
    if (b.game) {
      var over = b.k === "over";
      return "In both teams' last five games, " + betNum(b.h) + " of " + betNum(n) + " went " + (over ? "over " : "under ") + b.ou + " total points, averaging " + betAvg(avg) + " combined" + (over ? ", " + betAvg(avg - b.ou) + " above" : ", " + betAvg(b.ou - avg) + " below") + " tonight's line." + streak;
    }
    var who = betLast(b.p) || b.p, of = b.h === n ? "every one of the last " + betNum(n) + " games" : betNum(b.h) + " of the last " + betNum(n) + " games";
    if (b.k === "td" || b.k === "g") {
      var word = b.k === "td" ? "touchdown" : "goal";
      return who + " has scored a " + word + " in " + of + ", " + sum + " " + word + (sum === 1 ? "" : "s") + " in all." + streak;
    }
    if (b.k === "pt" && b.r === 1) return who + " has a point in " + of + ", " + sum + " points in all." + streak;
    var noun = BET_NOUN[b.k] || "", big = /yards/.test(noun), r = b.r;
    var out = who + " has had " + r + " or more " + noun + " in " + of + ", averaging " + betAvg(avg, big) + ", " + betAvg(avg - r, big) + " above the line.";
    if (streak) out += streak;
    else if (miss.length === 1) out += " The one miss was " + miss[0] + ".";
    return out;
  }
  function betRow(g, b, res) {
    var kind = status(g).kind, s = res.s, lv = kind === "live", sc = scoreRaw(g.id) || {}, fin = kind === "over";
    var r = el("div", "bet" + (s === "hit" ? " won" : s === "miss" ? " lost" : lv ? " on" : "")), m = el("div", "bet-m"), rt = el("div", "bet-r");
    var vs = b.game ? abbr(g, "away") + " at " + abbr(g, "home") : (b.sd === "away" ? "at " + abbr(g, "home") : "vs " + abbr(g, "away"));
    // top line: where the game is (start time, Live with the clock, Final), the result, and remove
    var top = el("div", "bet-top"), gst = el("span", "bet-st" + (lv ? " lv" : fin ? " fin" : ""));
    if (lv) { gst.appendChild(el("i")); gst.appendChild(document.createTextNode("Live" + (sc.detail ? " · " + sc.detail : ""))); }
    else gst.textContent = fin ? "Final" + (sc.detail && !/^final$/i.test(sc.detail) ? " · " + sc.detail.replace(/^final\/?/i, "").trim() : "") : "Starts " + timeText(g.start);
    top.appendChild(gst);
    if (s === "hit" || s === "miss" || s === "void") top.appendChild(el("span", "bet-tag " + s, s === "hit" ? "✓ Hit" : s === "miss" ? "✗ Miss" : res.why || "Push"));
    var x = el("button", "bet-x"); x.type = "button"; x.appendChild(icon("x")); x.setAttribute("aria-label", "Remove " + (b.game ? "this game total" : b.p) + " and add the next best pick");
    x.addEventListener("click", function (e) { e.stopPropagation(); betRemove(b); });
    top.appendChild(x); r.appendChild(top);
    if (b.game) {  // a game total: both teams' badges, away over home, like a matchup card (3.52.11; it was a gray "O" box)
      var pr = el("span", "bet-pair"); pr.setAttribute("aria-hidden", "true");
      ["away", "home"].forEach(function (sd) { pr.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"])); });
      r.appendChild(pr);
    }
    else r.appendChild(badgeFor(abbr(g, b.sd), g[b.sd], g[b.sd + "Color"], g[b.sd + "Alt"]));
    var p = el("b", "bet-p", b.game ? vs : b.p); if (!b.game && b.pos) p.appendChild(el("i", null, b.pos)); m.appendChild(p);
    var l = el("span", "bet-l", b.lab); l.appendChild(el("span", null, " · " + (b.game ? "game total" : vs))); m.appendChild(l);
    r.appendChild(m);
    // right side: the trend before the game, then tonight's number against the line
    var have = res.now != null ? String(res.now) : "0", need = b.game ? "line " + b.ou : b.r === 1 ? "need 1" : "of " + b.r, say;
    if (s === "pre") { rt.appendChild(el("b", null, b.h + "/" + b.n)); rt.appendChild(el("i", null, "last " + b.n)); say = "starts " + timeText(g.start) + ", hit in " + b.h + " of the last " + b.n + " games"; }
    else if (s === "void") { rt.appendChild(el("b", null, "–")); rt.appendChild(el("i", null, need)); say = res.why || "push"; }
    else { rt.appendChild(el("b", null, have)); rt.appendChild(el("i", null, need)); say = (s === "live" ? "live, " : (s === "hit" ? "hit, " : "missed, ") + (fin ? "final, " : "")) + have + (b.game ? " total, line " + b.ou : ", needs " + b.r); }
    r.appendChild(rt);
    r.appendChild(el("p", "bet-why", betWhy(g, b)));  // why it's a good bet, in words (3.43.0; it was six little boxes)
    r.setAttribute("aria-label", (b.game ? vs + ", " : b.p + ", ") + b.lab + ": " + say + ". " + betWhy(g, b));
    return r;
  }

  // ---- Betting lines (3.31.0 as Best bets; 3.40.0 picks that follow the slate; 3.53.0 real lines, a case both ways) ----
  // The lines are the sportsbook's own, from ESPN's free odds feed (DraftKings): player props for NFL, NBA, WNBA and NHL, and the game total for every league here.
  // Nothing is recommended. Each card shows the posted line and what the player's last six games (or both teams' last five) say for the over and for the under.
  // College games have no player lines in the feed, so they only get game totals. Hurt players (out or doubtful) are left out.
  var BET_LG = { nfl: 1, ncaaf: 1, nba: 1, wnba: 1, ncaam: 1, ncaaw: 1, nhl: 1 };
  var BET_PROPS = { nfl: 1, nba: 1, wnba: 1, nhl: 1 };  // leagues whose player lines the feed carries
  var BET_DEF = {
    football: [
      { k: "pyd", re: /^Total Passing Yards/, noun: "passing yards", has: ["passingYards"], val: function (v) { return betN(v.passingYards); } },
      { k: "ptd", re: /^Total Passing Touchdowns/, noun: "passing TDs", has: ["passingTouchdowns"], val: function (v) { return betN(v.passingTouchdowns); } },
      { k: "ryd", re: /^Total Rushing Yards/, noun: "rushing yards", has: ["rushingYards"], val: function (v) { return betN(v.rushingYards); } },
      { k: "cyd", re: /^Total Receiving Yards/, noun: "receiving yards", has: ["receivingYards"], val: function (v) { return betN(v.receivingYards); } },
      { k: "rec", re: /^Total Receptions/, noun: "catches", has: ["receptions"], val: function (v) { return betN(v.receptions); } }
    ],
    bball: [
      { k: "pts", re: /^Total Points$/, noun: "points", has: ["points"], val: function (v) { return betN(v.points); } },
      { k: "reb", re: /^Total Rebounds$/, noun: "rebounds", has: ["totalRebounds"], val: function (v) { return betN(v.totalRebounds); } },
      { k: "ast", re: /^Total Assists$/, noun: "assists", has: ["assists"], val: function (v) { return betN(v.assists); } },
      { k: "3pm", re: /^Total 3-Point Field Goals$/, noun: "threes", has: ["threePointFieldGoalsMade-threePointFieldGoalsAttempted"], val: function (v) { return betN(v["threePointFieldGoalsMade-threePointFieldGoalsAttempted"]); } }
    ],
    hockey: [
      { k: "pt", re: /^Total Points$/, noun: "points", has: ["points"], val: function (v) { return betN(v.points); } },
      { k: "hast", re: /^Total Assists$/, noun: "assists", has: ["assists"], val: function (v) { return betN(v.assists); } },
      { k: "sog", re: /^Total Shots on Goal$/, noun: "shots on goal", has: ["shotsTotal"], val: function (v) { return betN(v.shotsTotal); } }
    ]
  };
  var BET_W = { pts: 20, pyd: 20, pt: 18, ryd: 16, cyd: 16, sog: 14, reb: 10, ast: 10, rec: 10, ptd: 10, "3pm": 6, hast: 6 };  // how much of a headline each kind of line is
  var BET_TOT = { football: "points", bball: "points", hockey: "goals" };
  function betN(x) { var n = parseFloat(x); return isNaN(n) ? 0 : n; }
  var BETS = (function () { try { return JSON.parse(localStorage.getItem("slate-bets4") || "{}"); } catch (e) { return {}; } })(), betQ = [], betRun = 0, betT = null, GLOG = {};
  function betSave() { try { var keep = {}, cut = Date.now() - 2 * 864e5; Object.keys(BETS).forEach(function (k) { if (BETS[k].at > cut && BETS[k].list) keep[k] = { at: BETS[k].at, list: BETS[k].list, short: BETS[k].short }; }); localStorage.setItem("slate-bets4", JSON.stringify(keep)); } catch (e) {} }
  // a player's games this season, newest first: [{ at, v: { statName: value } }] (an old season's log counts as nothing)
  function glGames(gl, before) {
    if (!gl) return [];
    var names = gl.names || [], st = (gl.seasonTypes || []).filter(function (x) { return !/pre|post|bowl|playoff/i.test(x.displayName || ""); })[0], out = [], seen = {};
    if (!st) return [];
    (st.categories || []).forEach(function (c) { (c.events || []).forEach(function (e) {
      var id = String(e.eventId || ""); if (!id || seen[id]) return; seen[id] = 1;
      var info = (gl.events || {})[id] || {}, at = Date.parse(info.gameDate || "") || 0; if (!at || (before && at >= before - 3600e3)) return;
      var v = {}; names.forEach(function (n, i) { v[n] = (e.stats || [])[i]; }); out.push({ at: at, v: v, away: info.atVs === "@", opp: String((info.opponent || {}).id || "") }); }); });
    out.sort(function (a, b) { return b.at - a.at; });
    return out.length && Date.now() - out[0].at < 75 * 864e5 ? out : [];
  }
  function glFetch(lg, id) { var k = lg + "|" + id; return GLOG[k] || (GLOG[k] = rkFetch("https://site.api.espn.com/apis/common/v3/sports/" + bxBase(lg) + "/athletes/" + id + "/gamelog")); }
  function betHttps(u) { return String(u || "").replace(/^http:/, "https:"); }
  // the posted player lines for one game: [{ aid, k, line, open, ref }] plus the sportsbook's name (DraftKings when it's there)
  function betLines(lg, ev) {
    var pp = bxBase(lg).split("/"), base = "https://sports.core.api.espn.com/v2/sports/" + pp[0] + "/leagues/" + pp[1] + "/events/" + ev + "/competitions/" + ev + "/odds";
    return rkFetch(base).then(function (o) {
      var its = ((o && o.items) || []).filter(function (x) { return x.propBets && x.propBets.$ref; });
      var it = its.filter(function (x) { return String((x.provider || {}).id) === "100"; })[0] || its[0];
      if (!it) return null;
      var url = betHttps(it.propBets.$ref).split("?")[0] + "?limit=1000";
      return rkFetch(url + "&page=1").then(function (p1) {
        if (!p1) return null;
        var more = []; for (var i = 2; i <= Math.min(p1.pageCount || 1, 4); i++) more.push(rkFetch(url + "&page=" + i));
        return Promise.all(more).then(function (rest) {
          var items = (p1.items || []).concat.apply(p1.items || [], rest.map(function (r) { return (r && r.items) || []; })), seen = {}, out = [], defs = BET_DEF[BX_SPORT[lg]] || [];
          items.forEach(function (x) {
            var nm = (x.type || {}).name || "", d = defs.filter(function (d) { return d.re.test(nm); })[0], ref = (x.athlete || {}).$ref || "", m = /athletes\/(\d+)/.exec(ref);
            var line = parseFloat((((x.current || {}).target) || {}).value), open = parseFloat((((x.open || {}).target) || {}).value);
            if (!d || !m || isNaN(line) || seen[m[1] + "|" + d.k]) return;
            seen[m[1] + "|" + d.k] = 1;  // each line comes twice, once for the over and once for the under
            out.push({ aid: m[1], k: d.k, line: line, open: isNaN(open) ? null : open, ref: betHttps(ref) });
          });
          return { src: (it.provider || {}).name || "DraftKings", list: out };
        });
      });
    });
  }
  // how hard a stretch of games leans to one side of a line (it orders the cards; it isn't a pick)
  // the stats' own lean: + toward the over, - toward the under (how many went each way, and how far the average sits from the line)
  function betLean(vals, line) {
    var n = vals.length, o = 0, u = 0, sum = 0;
    vals.forEach(function (x) { sum += x; if (x > line) o++; else if (x < line) u++; });
    return (o - u) / n + Math.max(-1, Math.min(1, (sum / n - line) / Math.max(line, 1) * 3));
  }
  // ---- context beyond the player's own numbers (3.54.0) ----
  // Each fact is [words, +1 for the over or -1 for the under, weight]. Every one comes from ESPN data for this game; nothing is guessed.
  var BET_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var BET_PACE = { pts: 1, "3pm": 1, ast: 1, pyd: 1, cyd: 1, rec: 1, pt: 1, sog: 1 };  // lines that rise and fall with how much scoring is expected
  function betDay(at) { var d = new Date(at); return BET_MON[d.getMonth()] + " " + d.getDate(); }
  function betSurname(name) { var w = String(name || "").split(" ").filter(function (x) { return !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(x); }); return w.length > 1 ? w.slice(1).join(" ") : w[0] || ""; }
  function betFacts(c, x, d, all) {
    var f = [], sport = c.sport, L = x.line, big = L >= 40, k = x.k, fmt = function (v) { return betAvg(v, big); };
    var mean = function (list) { var t = 0; list.forEach(function (gm) { t += d.val(gm.v); }); return list.length ? t / list.length : 0; };
    // rest: the second night of a back-to-back, or a few days off (basketball and hockey)
    if (all[0] && (sport === "bball" || sport === "hockey")) {
      var hrs = (c.start - all[0].at) / 3600e3, days = Math.floor(hrs / 24);
      if (hrs < 30) f.push(["Second night of a back-to-back: played last night.", -1, 0.5]);
      else if (days >= 3 && days <= 6) f.push([betNum(days).replace(/^./, function (m) { return m.toUpperCase(); }) + " days of rest since the last game.", 1, 0.25]);
    }
    // a key teammate is out
    (c.out[c.tid] || []).forEach(function (o) {
      if (o.id === x.pid) return;
      // 3.66.3: a starter at the same position is out, so this player's minutes and role go up (DJ: Garza with Queta out)
      var samePos = c.pos && o.pos && o.pos.charAt(0) === c.pos.charAt(0);
      if (sport === "bball" && o.grp === "scoring" && samePos && (/^(pts|reb)$/.test(k) || (k === "ast" && c.pos.charAt(0) === "G"))) {
        var mins = 0; all.slice(0, 6).forEach(function (gm) { mins += betN(gm.v.minutes); }); mins = Math.round(mins / Math.max(1, Math.min(6, all.length)));
        f.push([betSurname(o.name) + " (" + o.pos + ", " + o.val + " points a game) is out tonight, so more minutes at " + ({ C: "center", F: "forward", G: "guard" }[o.pos.charAt(0)] || o.pos) + (mins ? " than the " + mins + " a game lately." : "."), 1, 0.7]);
        f.damp = true;  // the recent games came in a smaller role, so they count for less tonight (the posted line already moved for the news)
      }
      else if (sport === "bball" && o.grp === "scoring" && o.rank < 3 && /^(pts|3pm|ast)$/.test(k)) f.push([betSurname(o.name) + " is out (" + o.val + " points a game), so more shots go to the rest.", 1, 0.6]);
      else if (sport === "football" && o.grp === "passing" && /^(rec|cyd)$/.test(k)) f.push(["Starting QB " + betSurname(o.name) + " is out, so a backup is throwing.", -1, 0.6]);
      else if (sport === "football" && o.grp === "rushing" && k === "ryd") f.push([betSurname(o.name) + ", the top rusher, is out: more carries to go around.", 1, 0.6]);
      else if (sport === "football" && o.grp === "receiving" && /^(rec|cyd)$/.test(k)) f.push([betSurname(o.name) + ", a top target, is out: more passes to go around.", 1, 0.5]);
      else if (sport === "hockey" && o.grp === "scoring" && /^(pt|sog|hast)$/.test(k)) f.push([betSurname(o.name) + " is out (" + o.val + " points), leaving more chances for the rest.", 1, 0.5]);
    });
    if (c.q) f.push(["Listed as questionable tonight.", -1, 0.3]);
    // minutes trend (basketball)
    if (sport === "bball" && all.length >= 6) {
      var m3 = 0, p3 = 0; all.slice(0, 3).forEach(function (gm) { m3 += betN(gm.v.minutes); }); all.slice(3, 6).forEach(function (gm) { p3 += betN(gm.v.minutes); }); m3 /= 3; p3 /= 3;
      if (Math.abs(m3 - p3) >= 4) f.push(["Minutes " + (m3 > p3 ? "up" : "down") + ": " + Math.round(m3) + " a game the last three, from " + Math.round(p3) + " before.", m3 > p3 ? 1 : -1, 0.4]);
    }
    // home and road this season
    var home = all.filter(function (gm) { return !gm.away; }), road = all.filter(function (gm) { return gm.away; });
    if (home.length >= 3 && road.length >= 3) {
      var hA = mean(home), rA = mean(road), away = c.sd === "away", here = away ? rA : hA, there = away ? hA : rA;
      if (Math.abs(here - there) >= Math.max(big ? 10 : 1, 0.15 * Math.max(here, there)) && (here > L) === (here > there))
        f.push([fmt(hA) + " a game at home, " + fmt(rA) + " on the road. Tonight is " + (away ? "on the road." : "at home."), here > L ? 1 : -1, 0.35]);
    }
    // the last time against tonight's opponent this season
    var vs = all.filter(function (gm) { return gm.opp && gm.opp === c.oppTid; })[0];
    if (vs) { var vv = d.val(vs.v); if (vv !== L) f.push(["Had " + vv + " against " + c.oppAb + " on " + betDay(vs.at) + ".", vv > L ? 1 : -1, 0.25]); }
    // how much scoring tonight's game total expects, against these teams' recent games
    if (BET_PACE[k] && c.ou && c.recTot) {
      var ratio = c.ou / c.recTot;
      if (ratio >= 1.04) f.push(["The game total (" + c.ou + ") is above these teams' recent " + Math.round(c.recTot) + ": more scoring expected.", 1, 0.4]);
      else if (ratio <= 0.96) f.push(["The game total (" + c.ou + ") is below these teams' recent " + Math.round(c.recTot) + ": less scoring expected.", -1, 0.4]);
    }
    // a big spread: starters can sit late in a blowout
    if (c.spread && ((sport === "bball" && c.spread >= 12) || (sport === "football" && c.spread >= 14))) f.push(["A " + c.spread + "-point spread: in a blowout, starters sit late.", -1, 0.3]);
    // the line moved since it opened
    if (x.open != null && Math.abs(L - x.open) >= Math.max(1, L * 0.04)) f.push(["The line moved " + (L > x.open ? "up" : "down") + " from " + x.open + " since it opened.", L > x.open ? 1 : -1, 0.3]);
    // weather at an outdoor football game
    if (sport === "football" && c.wx) {
      if (betN(c.wx.gust) >= 20 && /^(pyd|cyd|rec)$/.test(k)) f.push(["Wind gusts up to " + c.wx.gust + " mph at kickoff.", -1, 0.5]);
      if (c.wx.temperature != null && betN(c.wx.temperature) <= 25 && k === "pyd") f.push([c.wx.temperature + "° at kickoff.", -1, 0.3]);
    }
    return f;
  }
  // the lean: the stats plus the facts. Too close to call returns null (the line isn't shown).
  function betJudge(vals, line, facts) {
    var t = betLean(vals, line) * (facts.damp ? 0.3 : 1); facts.forEach(function (x) { t += x[1] * x[2]; });
    if (Math.abs(t) < 0.4) return null;
    var side = t > 0 ? 1 : -1;
    return { lean: side, edge: Math.abs(t), facts: facts.filter(function (x) { return x[1] === side; }).sort(function (a, c) { return c[2] - a[2]; }).slice(0, 3).map(function (x) { return x[0]; }) };
  }
  function betNeed(g) {
    var b = BETS[g.id];
    var soon = status(g).kind === "upcoming" && (Date.parse(g.start) || 0) - Date.now() < 12 * 3600e3;  // 3.66.3: injury news lands in the last hours before a game
    if (b && (b.busy || b.queued || Date.now() - b.at < (b.short ? 30 * 60000 : soon ? 20 * 60000 : 3 * 3600e3))) return;
    b = BETS[g.id] = b || { at: 0, list: null }; b.queued = true; betQ.push(g); betPump();
  }
  function betPump() {
    while (betRun < 1 && betQ.length) (function (g) {
      var b = BETS[g.id]; b.queued = false; b.busy = true; betRun++;
      var cur = bx.live[g.id] || (bx.live[g.id] = {}), lg = g.league, sport = BX_SPORT[lg], start = Date.parse(g.start) || Date.now(), short = false, src = "";
      (cur.sum && Date.now() - (cur.sumAt || 0) < 30 * 60000 ? Promise.resolve(cur.sum) : (cur.ev ? Promise.resolve(cur.ev) : bxFindEvent(g)).then(function (ev) { if (!ev) return null; cur.ev = ev; return rkFetch(bxSummaryUrl(lg, ev)); })).then(function (sum) {
        if (!sum) return null; cur.sum = cur.sum || sum;
        var comp = ((sum.header || {}).competitions || [])[0] || {}, side = {}, hurt = {}, hurtBy = {}, qst = {}, out = [], ev = String(comp.id || (sum.header || {}).id || cur.ev || "");
        var stt = ((comp.status || {}).type || {}).state || "pre";
        (comp.competitors || []).forEach(function (k) { side[String((k.team || {}).id || "")] = k.homeAway === "home" ? "home" : "away"; });
        (sum.injuries || []).forEach(function (t) { var tid = String((t.team || {}).id || ""); (t.injuries || []).forEach(function (x) { var id = String((x.athlete || {}).id || ""), stx = String(x.status || ""); if (/question/i.test(stx)) qst[id] = 1; if (/out|reserve|suspen|doubt/i.test(stx)) { hurt[id] = 1; (hurtBy[tid] = hurtBy[tid] || {})[id] = (((x.athlete || {}).position || {}).abbreviation) || "?"; } }); });
        // the game's own context: the spread, the total against both teams' recent games, the weather, and who's out
        var pk = (sum.pickcenter || [])[0] || {}, ou = parseFloat(pk.overUnder), tot = [], seenEv = {}, lastAt = {};
        (sum.lastFiveGames || []).forEach(function (t) { var tid = String((t.team || {}).id || ""); l5Season(t.events, comp.date).forEach(function (e) {
          var at = Date.parse(e.gameDate) || 0; if (at && at < start - 3600e3 && at > (lastAt[tid] || 0)) lastAt[tid] = at;
          if (seenEv[e.id]) return; seenEv[e.id] = 1; var a = parseFloat(e.homeTeamScore), h = parseFloat(e.awayTeamScore); if (!isNaN(a) && !isNaN(h)) tot.push({ at: at, v: a + h }); }); });
        var recTot = 0; tot.forEach(function (x) { recTot += x.v; }); recTot = tot.length >= 6 ? recTot / tot.length : 0;
        var wx = (sum.gameInfo || {}).weather || null, spread = Math.abs(parseFloat(pk.spread)) || 0, keyOut = {};
        var outs = Object.keys(side).filter(function (tid) { return hurtBy[tid]; }).map(function (tid) {
          return seasonFetch(lg, tid).then(function (S) {
            var grp = { game: ["scoring", sport === "bball" ? 6 : 3], passing: ["passing", 1], rushing: ["rushing", 1], receiving: ["receiving", 2] };
            ((S && S.results) || []).forEach(function (r, ri) {
              var gp = grp[r.name] || (sport === "hockey" && ri === 0 ? ["scoring", 3] : null); if (!gp) return;
              (r.leaders || []).slice(0, gp[1]).forEach(function (L, li) { var id = String((L.athlete || {}).id || ""); if (hurtBy[tid][id]) (keyOut[tid] = keyOut[tid] || []).push({ id: id, name: (L.athlete || {}).displayName || "", grp: gp[0], val: L.displayValue || "", rank: li, pos: hurtBy[tid][id] }); });
            });
          }, function () {});
        });
        var props = BET_PROPS[lg] && ev ? betLines(lg, ev) : Promise.resolve(null);
        return Promise.all(outs).then(function () { return props; }).then(function (L) {
          var lines = (L && L.list) || [];
          if (BET_PROPS[lg] && !lines.length && stt === "pre" && start - Date.now() > 2 * 3600e3) short = true;  // lines usually go up the day of the game: look again in half an hour
          src = (L && L.src) || "";
          // the players with the most lines first (the starters), then the biggest scoring line; at most twelve a game
          var by = {}; lines.forEach(function (x) { if (hurt[x.aid]) return; (by[x.aid] = by[x.aid] || []).push(x); });
          var top = function (a) { return Math.max.apply(null, by[a].map(function (x) { return /^(pts|pt|pyd|ryd|cyd)$/.test(x.k) ? x.line : 0; })); };
          var ids = Object.keys(by).sort(function (a, c) { return (by[c].length - by[a].length) || (top(c) - top(a)); }).slice(0, 12);
          return Promise.all(ids.map(function (aid) {
            return Promise.all([glFetch(lg, aid), rkFetch(by[aid][0].ref)]).then(function (r) {
              var gl = r[0], a = r[1] || {}, tm = /teams\/(\d+)/.exec(((a.team || {}).$ref) || ""), tid = tm ? tm[1] : "";
              if (!side[tid]) return;
              var all = glGames(gl, start), games = all.slice(0, 6), names = (gl && gl.names) || [];
              if (games.length < 4) return;
              var sd = side[tid], oSd = sd === "home" ? "away" : "home", oppTid = Object.keys(side).filter(function (t) { return t !== tid; })[0] || "";
              var c = { pos: ((a.position || {}).abbreviation) || "", q: !!qst[aid], sport: sport, start: start, sd: sd, tid: tid, oppTid: oppTid, oppAb: abbr(g, oSd), ou: isNaN(ou) ? 0 : ou, recTot: recTot, spread: spread, wx: wx, out: keyOut };
              by[aid].forEach(function (x) {
                var d = (BET_DEF[sport] || []).filter(function (d) { return d.k === x.k; })[0];
                if (!d || !d.has.some(function (h) { return names.indexOf(h) !== -1; })) return;
                var vals = games.map(function (gm) { return d.val(gm.v); }).reverse();  // oldest first
                var j = betJudge(vals, x.line, betFacts(c, x, d, all)); if (!j) return;
                out.push({ k: x.k, line: x.line, open: x.open, src: src, vals: vals, lean: j.lean, edge: j.edge, facts: j.facts, pid: aid, p: a.displayName || a.fullName || "", pos: ((a.position || {}).abbreviation) || "", sd: sd });
              });
            }, function () {});
          }));
        }, function () {}).then(function () {
          // the order: the strongest lean first, with the headline lines (points, passing and rushing yards…) and the stars a little ahead
          var rk = {}; out.forEach(function (x) { (rk[x.k] = rk[x.k] || []).push(x.line); }); Object.keys(rk).forEach(function (k) { rk[k].sort(function (a, c) { return c - a; }); });
          out.forEach(function (x) { x.sc = Math.min(3, x.edge) * 20 + ((BET_W[x.k] || 5) + Math.max(0, 30 - rk[x.k].indexOf(x.line) * 6)) * 0.3; });
          // the game total: tonight's posted over/under against both teams' last five games, plus rest and weather
          if (!isNaN(ou) && tot.length >= 6) {
            tot.sort(function (a, c) { return a.at - c.at; }); var vals = tot.map(function (x) { return x.v; }), f = [];
            if (sport === "bball" || sport === "hockey") Object.keys(lastAt).forEach(function (tid) { if (side[tid] && start - lastAt[tid] < 30 * 3600e3) f.push([abbr(g, side[tid]) + " played last night: tired legs.", -1, 0.35]); });
            Object.keys(keyOut).forEach(function (tid) { keyOut[tid].forEach(function (o) { if ((o.grp === "scoring" && o.rank < 3) || o.grp === "passing") f.push([betSurname(o.name) + " is out for " + abbr(g, side[tid]) + ".", -1, 0.3]); }); });
            if (sport === "football" && wx && betN(wx.gust) >= 20) f.push(["Wind gusts up to " + wx.gust + " mph at kickoff.", -1, 0.5]);
            var j = betJudge(vals, ou, f);
            if (j) out.push({ k: "total", game: 1, line: ou, src: ((pk.provider || {}).name) || src || "", vals: vals, lean: j.lean, edge: j.edge, facts: j.facts, sc: Math.min(3, j.edge) * 20 + 12 });
          }
          out.sort(function (a, c) { return c.sc - a.sc; });
          return out;
        });
      }).then(function (list) {
        b.at = Date.now(); b.short = short;
        if (list) { b.list = list; betSave(); clearTimeout(betT); betT = setTimeout(function () { if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, 300); }
      }, function () { b.at = Date.now() - 2.5 * 3600e3; }).then(function () { b.busy = false; betRun--; betPump(); });
    })(betQ.shift());
  }
  // ---- the five lines on show (3.40.0; five since 3.47.0) ----
  // Once every game on the slate is over the list freezes (3.47.0): results stay, nothing new is added, not even after a remove.
  // Kept per slate day. A line stays until its game leaves the slate; a settled one stays too, showing which way it went.
  // An open spot is filled from upcoming games first, then live games, then finished ones (a finished game's line still only uses the games before it).
  var BET_MAX = 5, BET_SIG = {};
  var PICKS = (function () { try { return JSON.parse(localStorage.getItem("slate-picks3") || "{}"); } catch (e) { return {}; } })();
  // 3.72.2 (DJ: "save completed betting lines for a day"): each day's lines and how they did are kept for 60 days, on this phone and in
  // the person's account (data/users/<uid>/betlines), so going back to a day on any phone shows them with their results.
  var BET_DAYS = 60, BETL = { loaded: false, busy: false, timer: null };
  function picksTrim() { var keep = {}; Object.keys(PICKS).sort().slice(-BET_DAYS).forEach(function (d) { if (PICKS[d] && (PICKS[d].list || []).length) keep[d] = PICKS[d]; }); return keep; }
  function picksSave() { try { PICKS = picksTrim(); localStorage.setItem("slate-picks3", JSON.stringify(PICKS)); } catch (e) {} betSync(); }
  function betSync() {
    clearTimeout(BETL.timer);
    BETL.timer = setTimeout(function () {
      if (typeof db === "undefined" || !db || !uid || !BETL.loaded) return;
      var days = {}, cut = shiftDate(todayInHome(), -45);  // the account keeps 45 days (a save is capped at 400 KB)
      Object.keys(PICKS).forEach(function (d) { if (d >= cut && PICKS[d] && (PICKS[d].list || []).length) days[d] = { list: PICKS[d].list, gone: PICKS[d].gone || {} }; });
      db.collection("data/users/" + uid).doc("betlines").set({ v: 1, days: days }).then(null, function () {});
    }, 2000);
  }
  // a settled line counts for more than an open one when the phone and the account disagree about a day
  function betDayScore(P) { return ((P && P.list) || []).reduce(function (n, pk) { return n + 1 + (pk.res && pk.res.s !== "live" && pk.res.s !== "pre" ? 2 : 0); }, 0); }
  function betLoad() {
    if (BETL.loaded || BETL.busy || typeof db === "undefined" || !db || !uid) return;
    BETL.busy = true;
    db.collection("data/users/" + uid).doc("betlines").get().then(function (sn) {
      var d = sn.exists ? sn.data() : null, days = (d && d.days) || {}, moved = false;
      Object.keys(days).forEach(function (k) { if (betDayScore(days[k]) > betDayScore(PICKS[k])) { PICKS[k] = days[k]; moved = true; } });
      BETL.loaded = true; BETL.busy = false;
      try { PICKS = picksTrim(); localStorage.setItem("slate-picks3", JSON.stringify(PICKS)); } catch (e) {}
      betSync();
      if (moved && (state.view === "lineup" || isDuo)) keepScroll(renderLineup);
    }, function () { BETL.busy = false; BETL.loaded = true; });
  }
  function betTier(g) { var k = status(g).kind; return k === "live" ? 1 : k === "over" ? 2 : 0; }
  function betDone(g) { var b = BETS[g.id]; return !!b && (!!b.list || (b.at > 0 && !b.busy && !b.queued)); }
  function betKind(b) { return b.game ? "total" : b.k; }
  function betPick(g, b) { var o = {}; Object.keys(b).forEach(function (k) { o[k] = b[k]; }); o.gid = g.id; o.uid = g.id + "|" + (b.game ? "total" : b.pid); o.lg = g.league; o.at = Date.now(); delete o.res; return o; }
  function betPicks(gs) {
    var day = state.date, P = PICKS[day] || (PICKS[day] = { list: [] }), on = {}, n0 = P.list.length, loading = false, gone = P.gone || {};
    gs.forEach(function (g) { on[g.id] = g; });
    P.list = P.list.filter(function (pk) { return on[pk.gid] && (pk.game || pk.pid); });  // a game taken off the slate takes its lines with it
    var changed = P.list.length !== n0, taken = {}, perG = {}, kinds = {};
    // 3.66.3: a line chosen earlier is judged again whenever its game's data is refreshed (injury report, line, lean) until the game starts.
    // If the player is now out or the lean is too close to call, it's dropped and the next one fills in.
    P.list = P.list.filter(function (pk) {
      var g = on[pk.gid], B = BETS[pk.gid]; if (status(g).kind !== "upcoming" || !B || !B.list || !(B.at > (pk.at || 0))) return true;
      var nb = B.list.filter(function (b) { return pk.gid + "|" + (b.game ? "total" : b.pid) === pk.uid; })[0];
      if (!nb) { changed = true; return false; }
      ["k", "line", "open", "src", "vals", "lean", "edge", "facts", "sc", "pos", "sd"].forEach(function (f) { if (nb[f] !== undefined) pk[f] = nb[f]; });
      pk.at = Date.now(); changed = true; return true;
    });
    Object.keys(gone).forEach(function (u) { taken[u] = 1; });  // lines you removed don't come back
    P.list.forEach(function (pk) { taken[pk.uid] = 1; if (pk.pid) taken["p|" + pk.pid] = 1; perG[pk.gid] = (perG[pk.gid] || 0) + 1; kinds[betKind(pk)] = (kinds[betKind(pk)] || 0) + 1; });
    var cands = function (list) { var out = []; list.forEach(function (g) { ((BETS[g.id] || {}).list || []).forEach(function (b) { if ((b.game || b.pid) && !taken[g.id + "|" + (b.game ? "total" : b.pid)] && !(b.pid && taken["p|" + b.pid]) && !betSat(g, b)) out.push({ g: g, b: b }); }); }); out.sort(function (x, y) { return (y.b.sc - x.b.sc) || byStart(x.g, y.g); }); return out; };
    var fill = function (list, perMax, kindMax) {
      cands(list).forEach(function (x) {
        if (P.list.length >= BET_MAX) return;
        var k = betKind(x.b), uid = x.g.id + "|" + (x.b.game ? "total" : x.b.pid);
        if (taken[uid] || (x.b.pid && taken["p|" + x.b.pid]) || (perG[x.g.id] || 0) >= perMax || (kinds[k] || 0) >= kindMax) return;
        if (kindMax > 2 && x.b.game && (BETS[x.g.id] || {}).short) return;  // player lines aren't up for this game yet: leave room for them
        P.list.push(betPick(x.g, x.b)); taken[uid] = 1; if (x.b.pid) taken["p|" + x.b.pid] = 1; perG[x.g.id] = (perG[x.g.id] || 0) + 1; kinds[k] = (kinds[k] || 0) + 1; changed = true;
      });
    };
    if (P.list.length > BET_MAX) { P.list = P.list.slice(0, BET_MAX); changed = true; }
    var frozen = gs.every(function (g) { return status(g).kind === "over"; });
    if (frozen) { if (changed) picksSave(); return { list: P.list, loading: false, frozen: true }; }
    var tiers = [[], [], []], ready = [];
    gs.forEach(function (g) { tiers[betTier(g)].push(g); });
    tiers[0].forEach(betNeed);  // upcoming games keep refreshing even when the five are full
    for (var t = 0; t < 3 && P.list.length < BET_MAX; t++) {
      tiers[t].forEach(betNeed);  // finished games are only looked at when upcoming and live games can't fill the five
      if (!tiers[t].every(betDone)) { loading = true; break; }
      ready = ready.concat(tiers[t]);
      fill(tiers[t], 2, 2); fill(tiers[t], 3, BET_MAX);  // two a game (three if needed), two of any one kind (points, catches, totals…) when there's enough to choose from
    }
    if (!loading && P.list.length < BET_MAX) fill(ready, BET_MAX, BET_MAX);
    if (changed) picksSave();
    var waiting = gs.some(function (g) { return status(g).kind === "upcoming" && (BETS[g.id] || {}).short; });
    return { list: P.list, loading: loading, waiting: waiting };
  }
  // a game that already started: skip a player its box score shows sitting out (or, once it's over, not playing at all)
  function betSat(g, b) {
    var sum = !b.game && status(g).kind !== "upcoming" && (bx.live[g.id] || {}).sum; if (!sum) return false;
    var st = ((((sum.header || {}).competitions || [])[0] || {}).status || {}).type || {}, sport = BX_SPORT[g.league], line = betBoxLine(sum, b.pid, sport);
    return !!(line && line.dnp) || (!line && st.state === "post");
  }
  // removing a line (3.41.0): it's remembered for the day so it doesn't come back, and the next one takes its place on the redraw
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
  // where a line stands: s is "pre", "live", "over", "under" or "void"; now is tonight's number so far.
  // Counting stats only go up, so passing the line settles it as over even mid-game; under needs the final.
  function betSide(v, line, fin) { return v > line ? "over" : !fin ? "live" : v < line ? "under" : "void"; }
  function betResult(g, pk) {
    var kind = status(g).kind, sc = scoreRaw(g.id) || {}, cur = bx.live[g.id] || {}, sum = cur.sum, out = null;
    if (pk.game) {
      var tot = parseFloat(sc.a) + parseFloat(sc.h), fin = sc.state === "post";
      if (kind === "upcoming" || kind === "tbd" || isNaN(tot) || !(fin || sc.state === "in")) return pk.res || { s: "pre" };
      out = { now: tot, s: betSide(tot, pk.line, fin) };
      if (fin) betKeep(pk, out);
      return out;
    }
    var st = sum && ((((sum.header || {}).competitions || [])[0] || {}).status || {}).type || {};
    if (!sum || st.state === "pre" || !st.state) return pk.res || { s: kind === "live" ? "live" : "pre" };
    var sport = BX_SPORT[pk.lg || g.league], line = betBoxLine(sum, pk.pid, sport), done = st.state === "post";
    var def = (BET_DEF[sport] || []).filter(function (d) { return d.k === pk.k; })[0];
    if (!def) return { s: done ? "void" : "live" };
    if (!line || line.dnp) out = done ? { s: "void", why: (line && line.dnp) || sport !== "football" ? "Didn't play" : "No stats" } : { s: "live", now: 0 };
    else { var v = def.val(line); out = { now: v, s: betSide(v, pk.line, done) }; }
    if (done) betKeep(pk, out);
    return out;
  }
  function betRight(pk, r) { return r.s === "over" ? pk.lean > 0 : r.s === "under" ? pk.lean < 0 : null; }  // did the lean call it
  function betKeep(pk, out) { var o = pk.res || {}; if (o.s !== out.s || o.now !== out.now || o.why !== out.why) { pk.res = out; picksSave(); } }
  // a live box score came in: redraw the slate only if one of this game's lines moved
  function betTouch(g) {
    var P = PICKS[state.date]; if (!P) return false;
    var sig = P.list.filter(function (pk) { return pk.gid === g.id; }).map(function (pk) { var r = betResult(g, pk); return r.s + ":" + r.now; }).join(",");
    if (!sig || BET_SIG[g.id] === sig) return false;
    BET_SIG[g.id] = sig; return true;
  }
  // the section at the bottom of the slate: five lines (fewer only when the slate can't supply them)
  function betsBlock(games) {
    betLoad();
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
    var cnt = function (s) { return rows.filter(function (x) { return x.r.s === s; }).length; };
    // closed until the person opens it; then it stays open for them (saved with their settings) until they close it (DJ, 3.65.3)
    var shut = !(state.slateFold || {}).__betsOpen, sec = el("section", "sl-sec sl-bets" + (shut ? " shut" : ""));
    var hb = el("button", "sl-h"); hb.type = "button"; hb.setAttribute("aria-expanded", shut ? "false" : "true");
    hb.appendChild(el("b", null, "Betting lines")); if (rows.length) hb.appendChild(el("span", "count", String(rows.length))); hb.appendChild(icon("more"));
    hb.addEventListener("click", function () { var f = Object.assign({}, state.slateFold || {}); delete f.__bets; if (f.__betsOpen) delete f.__betsOpen; else f.__betsOpen = 1; state.slateFold = f; saveSettings(); keepScroll(renderLineup); });
    sec.appendChild(hb);
    if (shut) return sec;
    if (!rows.length) { sec.appendChild(el("p", "bets-none", pk.loading ? "Getting tonight's lines and recent game logs…" : pk.frozen ? (state.date < todayInHome() ? "No betting lines were saved for this day." : "Every game on your slate is over. New lines come with the next slate.") : pk.waiting ? "Player lines aren't posted yet for your slate. They usually go up the day of the game." : "No lines posted for the games on your slate yet.")); return sec; }
    var nLive = cnt("live"), nRight = rows.filter(function (x) { return betRight(x.p, x.r) === true; }).length, nWrong = rows.filter(function (x) { return betRight(x.p, x.r) === false; }).length;
    if (nLive + nRight + nWrong) {
      var ty = el("p", "bets-tally");
      [[nLive, " live", "lv"], [nRight, " leaned right", "hit"], [nWrong, " leaned wrong", "miss"]].forEach(function (t) { if (!t[0]) return; if (ty.childNodes.length) ty.appendChild(document.createTextNode(" · ")); ty.appendChild(el("span", "bt-" + t[2], t[0] + t[1])); });
      sec.appendChild(ty);
    }
    if (BET_UNDO && BET_UNDO.day === state.date) {
      var un = el("p", "bets-undo", "Removed " + (BET_UNDO.pk.game ? "a game total" : BET_UNDO.pk.p) + ". "), ub = el("button", null, "Undo"); ub.type = "button";
      ub.addEventListener("click", betUndo); un.appendChild(ub); sec.appendChild(un);
    }
    sec.appendChild(el("p", "bets-sub", "The sportsbook's posted lines, and which way the numbers lean: each player's last six games (both teams' last five for a game total), plus rest, injuries, matchups, the spread and the weather. The strongest lean comes first. Tap × to swap one for the next."));
    var list = el("div", "bets");
    rows.forEach(function (x) { list.appendChild(betRow(x.g, x.p, x.r)); });
    sec.appendChild(list);
    if (pk.frozen) sec.appendChild(el("p", "bets-sub", state.date < todayInHome() ? "Saved from this day, with how each one finished." : "Every game on your slate is over, so these are final. No new ones until the next slate."));
    else if (rows.length < BET_MAX) sec.appendChild(el("p", "bets-sub", pk.loading ? "Checking more games for the rest of the five…" : pk.waiting ? "Player lines for some games aren't posted yet. More show up once they are." : "Only " + rows.length + " lines are posted for your slate right now. Add games to get more."));
    return sec;
  }
  // ---- the case for each side, in plain words, from the same game logs (3.53.0; 3.43.0 wrote why a pick was good) ----
  var BET_NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  function betNum(n) { return BET_NUM[n] || String(n); }
  function betAvg(x, big) { return big ? String(Math.round(x)) : String(Math.round(x * 10) / 10); }
  function betNoun(b) { if (b.game) return "total " + (BET_TOT[BX_SPORT[b.lg]] || "points"); var d = (BET_DEF[BX_SPORT[b.lg]] || []).filter(function (d) { return d.k === b.k; })[0]; return d ? d.noun : ""; }
  // over: true for the over's case. Each case is the count on that side, then the average, the last three, or the high (low) that backs it.
  function betCase(b, over) {
    var vals = b.vals || [], n = vals.length, L = b.line, big = L >= 40, sum = 0, s3 = 0, l3 = vals.slice(-3);
    vals.forEach(function (x) { sum += x; }); l3.forEach(function (x) { s3 += x; });
    var avg = n ? sum / n : 0, a3 = l3.length ? s3 / l3.length : 0, c = vals.filter(function (x) { return over ? x > L : x < L; }).length;
    var of = b.game ? "both teams' last " + betNum(n) + " games" : "the last " + betNum(n);
    var s1 = c === 0 ? "None of " + of + " went " + (over ? "over" : "under") : c === n ? (over ? "Over" : "Under") + " in all of " + of : (over ? "Over" : "Under") + " in " + betNum(c) + " of " + of;
    var good = function (x) { return over ? x > L : x < L; }, ext = over ? Math.max.apply(null, vals) : Math.min.apply(null, vals);
    var s2 = good(avg) ? "averaging " + betAvg(avg, big) + (b.game ? " combined" : "")
      : good(a3) && l3.length === 3 ? betAvg(a3, big) + " a game over the last three"
      : (over ? "high of " : "low of ") + ext;
    return s1 + ", " + s2 + ".";
  }
  function betRow(g, b, res) {
    var kind = status(g).kind, s = res.s, lv = kind === "live", sc = scoreRaw(g.id) || {}, fin = kind === "over", over = b.lean > 0, ok = betRight(b, res);
    var r = el("div", "bet" + (ok === true ? " won" : ok === false ? " lost" : lv && s === "live" ? " on" : "")), m = el("div", "bet-m");
    var vs = b.game ? abbr(g, "away") + " at " + abbr(g, "home") : (b.sd === "away" ? "at " + abbr(g, "home") : "vs " + abbr(g, "away"));
    var noun = betNoun(b), lineTxt = (over ? "Over " : "Under ") + b.line + " " + noun;
    // top line: where the game is (start time, Live with the clock, Final), the lean or how it went, and remove
    var top = el("div", "bet-top"), gst = el("span", "bet-st" + (lv ? " lv" : fin ? " fin" : ""));
    if (lv) { gst.appendChild(el("i")); gst.appendChild(document.createTextNode("Live" + (sc.detail ? " · " + sc.detail : ""))); }
    else gst.textContent = fin ? "Final" + (sc.detail && !/^final$/i.test(sc.detail) ? " · " + sc.detail.replace(/^final\/?/i, "").trim() : "") : "Starts " + timeText(g.start);
    top.appendChild(gst);
    var tg = null;
    if (ok === true || ok === false) tg = el("span", "bet-tag " + (ok ? "hit" : "miss"), (ok ? "✓ Went " : "✗ Went ") + s);
    else if (s === "void") tg = el("span", "bet-tag void", res.why || "Push");
    else tg = el("span", "bet-tag lean", (over ? "▲ Leans over" : "▼ Leans under"));
    top.insertBefore(tg, gst);  // the tag leads, on the left: the card's right edge can sit under the folded Duo's clock or the menu button
    var x = el("button", "bet-x"); x.type = "button"; x.appendChild(icon("x")); x.setAttribute("aria-label", "Remove " + (b.game ? "this game total" : b.p) + " and show the next line");
    x.addEventListener("click", function (e) { e.stopPropagation(); betRemove(b); });
    top.appendChild(x); r.appendChild(top);
    if (b.game) teamStripe(r, g, ".bet-pair > .badge"); else teamStripe1(r, g, b.sd);   // 3.91.0: team colors down the left edge
    if (b.game) {  // a game total: both teams' badges, away over home, like a matchup card (3.52.11)
      var pr = el("span", "bet-pair"); pr.setAttribute("aria-hidden", "true");
      ["away", "home"].forEach(function (sd) { pr.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"])); });
      r.appendChild(pr);
    }
    else r.appendChild(badgeFor(abbr(g, b.sd), g[b.sd], g[b.sd + "Color"], g[b.sd + "Alt"]));
    var p = el("b", "bet-p", b.game ? vs : b.p); if (!b.game && b.pos) p.appendChild(el("i", null, b.pos)); m.appendChild(p);
    var l = el("span", "bet-l", lineTxt); if (!b.game) l.appendChild(el("span", null, " · " + vs)); m.appendChild(l);
    r.appendChild(m);
    // tonight's number against the line, once the game starts (3.54.1: it was a column on the right; before the game the stats line has the average)
    var say;
    if (s === "pre") say = "starts " + timeText(g.start);
    else if (s === "void") say = res.why || "push";
    else { var have = res.now != null ? String(res.now) : "0"; r.appendChild(el("p", "bet-now", (fin ? "Final: " : "Tonight so far: ") + have + " " + noun + ", line " + b.line)); say = (s === "live" ? "live, " : "went " + s + (ok ? ", the lean was right, " : ", the lean was wrong, ")) + have + " so far"; }
    // the case: the numbers first, then up to three things beyond them that point the same way
    var why = el("div", "bet-why"), cs = betCase(b, over);
    why.appendChild(el("p", null, cs));
    (b.facts || []).forEach(function (t) { why.appendChild(el("p", "bet-fx", t)); });
    r.appendChild(why);
    var srcTxt = (b.src ? b.src + " line" : "Posted line") + (b.open != null && b.open !== b.line ? ", opened at " + b.open : "");
    r.appendChild(el("p", "bet-src", srcTxt));
    r.setAttribute("aria-label", (b.game ? vs + ", " : b.p + ", ") + "leans " + lineTxt + ": " + say + ". " + cs + " " + (b.facts || []).join(" ") + " " + srcTxt + ".");
    return r;
  }

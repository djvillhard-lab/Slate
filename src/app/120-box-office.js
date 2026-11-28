  // ---------- player rankings: individual performances by league and day (ESPN box scores) ----------
  var BEST_ORDER = ["nba", "nhl", "nfl", "ncaam", "ncaaw", "ncaaf", "mlb", "wnba"];
  var RK_TOP = 25, RK_TOP_COLLEGE = 80;  // college keeps more players, so Power conferences only still fills a top 20
  var RK_PATH = { nba: "basketball/nba", wnba: "basketball/wnba", ncaam: "basketball/mens-college-basketball&groups=50&limit=500", ncaaw: "basketball/womens-college-basketball&groups=50&limit=500", nhl: "hockey/nhl", nfl: "football/nfl", ncaaf: "football/college-football&groups=80&limit=500", mlb: "baseball/mlb" };
  var RK_KIND = { nba: "bball", wnba: "bball", ncaam: "bball", ncaaw: "bball", nhl: "hockey", nfl: "football", ncaaf: "football", mlb: "baseball" };
  var rk = { date: null, doc: null, docDate: null, unsub: null, live: {}, sum: {}, timer: null, busy: false, busyK: {}, fav: {}, sb: {} };
  // favorite players: starred from the rankings or a team page, saved with the settings
  function isFavPlayer(id, lg) { return !!id && (state.players || []).some(function (p) { return String(p.id) === String(id) && p.lg === lg; }); }
  function playerStar(p) { return el("span", "pstar-off"); }
  function rkUrl(lg, kind, q) { var p = RK_PATH[lg].split("&"); return "https://site.api.espn.com/apis/site/v2/sports/" + p[0] + "/" + kind + "?" + q + (kind === "scoreboard" && p.length > 1 ? "&" + p.slice(1).join("&") : ""); }
  function rkCentral(ms) { return new Intl.DateTimeFormat("en-CA", { timeZone: HOME_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms)); }
  function rkNum(x) { var n = parseFloat(String(x == null ? "" : x).replace("+", "")); return isNaN(n) ? 0 : n; }
  function rkMade(x) { var p = String(x || "").split("-"); return p.length === 2 ? [rkNum(p[0]), rkNum(p[1])] : [0, 0]; }
  function rkF(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }
  function rkZip(labels, stats) { var o = {}; (labels || []).forEach(function (l, i) { o[l] = (stats || [])[i]; }); return o; }
  function rkBball(s) {
    var pts = rkNum(s.PTS), reb = rkNum(s.REB), ast = rkNum(s.AST), stl = rkNum(s.STL), blk = rkNum(s.BLK), to = rkNum(s.TO), pf = rkNum(s.PF);
    var fg = rkMade(s.FG), ft = rkMade(s.FT), tp = rkMade(s["3PT"]);
    var sc = pts + 0.4 * fg[0] - 0.7 * fg[1] - 0.4 * (ft[1] - ft[0]) + 0.7 * rkNum(s.OREB) + 0.3 * rkNum(s.DREB) + stl + 0.7 * ast + 0.7 * blk - 0.4 * pf - to;
    var parts = [rkF(pts) + " PTS", rkF(reb) + " REB", rkF(ast) + " AST"];
    // 4th and 5th: whatever stood out most that night (steals, blocks, threes, efficient shooting), with field goals as the fallback
    var ex = [];
    if (fg[1]) ex.push([0.6 + (fg[1] >= 10 && fg[0] / fg[1] >= 0.6 ? 1 : 0), rkF(fg[0]) + "-" + rkF(fg[1]) + " FG"]);
    if (tp[0]) ex.push([tp[0] / 3, rkF(tp[0]) + " 3PM"]);
    if (stl) ex.push([stl / 2, rkF(stl) + " STL"]);
    if (blk) ex.push([blk / 2, rkF(blk) + " BLK"]);
    ex.sort(function (a, b) { return b[0] - a[0]; }).slice(0, 2).forEach(function (x) { parts.push(x[1]); });
    return [sc, parts.join(" · ")];
  }
  function rkHockey(group, s, final) {
    if (group === "goalies") {
      var sv = rkNum(s.SV), ga = rkNum(s.GA); if (sv + ga < 10) return null;
      var pct = s["SV%"] || (sv + ga ? (sv / (sv + ga)).toFixed(3) : "");
      return [2 + 0.2 * sv - 1.5 * ga + (ga === 0 && final ? 3 : 0), rkF(sv) + " SV · " + rkF(ga) + " GA" + (pct ? " · " + String(pct).replace(/^0/, "") + " SV%" : "") + (ga === 0 && final ? " · Shutout" : "")];
    }
    var g = rkNum(s.G), a = rkNum(s.A), pm = rkNum(s["+/-"]), sog = rkNum(s.S);
    var parts = [rkF(g) + " G", rkF(a) + " A", rkF(sog) + " SOG", (pm > 0 ? "+" : "") + rkF(pm) + " +/-"];
    // 5th: hits, blocked shots or faceoffs when they stood out, otherwise ice time
    var ht = rkNum(s.HT), bs = rkNum(s.BS), fw = rkNum(s.FW), fl = rkNum(s.FL), ex = [];
    if (ht >= 4) ex.push([ht / 4, rkF(ht) + " HIT"]);
    if (bs >= 3) ex.push([bs / 3, rkF(bs) + " BLK"]);
    if (fw + fl >= 10 && fw / (fw + fl) >= 0.6) ex.push([1.1, rkF(fw) + "-" + rkF(fl) + " FO"]);
    if (s.TOI) ex.push([0.9, s.TOI + " TOI"]);
    ex.sort(function (x, y) { return y[0] - x[0]; }); if (ex.length) parts.push(ex[0][1]);
    return [3 * g + 2 * a + 0.5 * pm + 0.3 * sog + 0.1 * (rkNum(s.HT) + rkNum(s.BS)), parts.join(" · ")];
  }
  // a football player's line (3.43.3): each part (passing, rushing, receiving, defense) carries its own weight, and the
  // biggest leads, whatever the position: a back with 161 receiving yards and 62 rushing leads with the receiving
  function rkFootball(gr) {
    var sc = 0, parts = [], p = gr.passing, r = gr.rushing, w = gr.receiving, d = gr.defensive, it = gr.interceptions, add = function (v, t) { sc += v; parts.push([v, t]); };
    if (p) { var ca = String(p["C/ATT"] || "0/0"), y = rkNum(p.YDS), td = rkNum(p.TD), i = rkNum(p.INT), v1 = 0.04 * y + 4 * td - 2 * i; if (y >= 100 || td) add(v1, rkF(y) + " pass yds · " + rkF(td) + " TD" + (i ? " · " + rkF(i) + " INT" : "") + " · " + ca + " cmp" + (rkNum(p.RTG) ? " · " + p.RTG + " RTG" : "")); else sc += v1; }
    if (r) { var ry = rkNum(r.YDS), rt = rkNum(r.TD), rc = rkNum(r.CAR), v2 = 0.1 * ry + 6 * rt; if (ry >= 40 || rt) add(v2, rkF(ry) + " rush yds" + (rt ? " · " + rkF(rt) + " TD" : "") + (rc ? " · " + rkF(rc) + " car" : "") + (rc >= 5 ? " · " + (ry / rc).toFixed(1) + " ypc" : "")); else sc += v2; }
    if (w) { var n = rkNum(w.REC), wy = rkNum(w.YDS), wt = rkNum(w.TD), tg = rkNum(w.TGTS), lo = rkNum(w.LONG), v3 = 0.5 * n + 0.1 * wy + 6 * wt; if (wy >= 40 || wt) add(v3, rkF(wy) + " rec yds" + (wt ? " · " + rkF(wt) + " TD" : "") + " · " + rkF(n) + " rec" + (tg ? " · " + rkF(tg) + " tgt" : "") + (lo ? " · " + rkF(lo) + " long" : "")); else sc += v3; }
    if (d) { var tk = rkNum(d.TOT), sk = rkNum(d.SACKS), tfl = rkNum(d.TFL), pd = rkNum(d.PD), qh = rkNum(d["QB HTS"]), v4 = 0.3 * tk + 2 * sk; if (sk || tk >= 8) add(v4, rkF(tk) + " TKL" + (sk ? " · " + rkF(sk) + " sacks" : "") + (tfl ? " · " + rkF(tfl) + " TFL" : "") + (qh ? " · " + rkF(qh) + " QB hits" : "") + (pd ? " · " + rkF(pd) + " PD" : "")); else sc += v4; }
    if (it) { var ni = rkNum(it.INT); if (ni) add(3 * ni, rkF(ni) + " INT"); }
    parts.sort(function (a, b) { return b[0] - a[0]; });
    // more than one of passing, rushing and receiving: each TD says which kind ("2 rec TD · 1 rush TD", 3.43.4)
    var yp = parts.filter(function (x) { return / (pass|rush|rec) yds/.test(x[1]); });
    if (yp.length > 1) yp.forEach(function (x) { var k = / (pass|rush|rec) yds/.exec(x[1])[1]; x[1] = x[1].replace(/^([^·]+· \d+) TD/, "$1 " + k + " TD"); });
    // the headline numbers first: each part's yards (and TD), biggest part first, then the details
    var head = [], tail = [];
    parts.forEach(function (x) { var t = x[1].split(" · "), k = /TD$/.test(t[1] || "") ? 2 : 1; head = head.concat(t.slice(0, k)); tail = tail.concat(t.slice(k)); });
    return parts.length ? [sc, head.concat(tail).join(" · ")] : null;
  }
  function rkBaseball(group, s) {
    if (group === "pitching") { var ip = rkNum(s.IP); if (ip < 3) return null; var k = rkNum(s.K), er = rkNum(s.ER); return [1.5 * ip + k - 2 * er - 0.5 * (rkNum(s.H) + rkNum(s.BB)), s.IP + " IP · " + rkF(k) + " K · " + rkF(er) + " ER · " + rkF(rkNum(s.H)) + " H · " + rkF(rkNum(s.BB)) + " BB"]; }
    var h = rkNum(s.H), hr = rkNum(s.HR), rbi = rkNum(s.RBI), rr = rkNum(s.R), bb = rkNum(s.BB); if (!h && !bb) return null;
    var parts = [rkF(h) + "-" + (s.AB || "0")]; if (hr) parts.push(rkF(hr) + " HR"); if (rbi) parts.push(rkF(rbi) + " RBI"); if (rr) parts.push(rkF(rr) + " R"); if (bb) parts.push(rkF(bb) + " BB"); if (rkNum(s.SB)) parts.push(rkF(rkNum(s.SB)) + " SB");
    return [h + 3 * hr + rbi + rr + 1.5 * rkNum(s.SB) + 0.5 * bb, parts.join(" · ")];
  }
  // ESPN sometimes leaves a decided game "in progress" at "End of 4th" (college football especially) for a long while: that's a final
  function rkOver(ev) {
    var c = (ev.competitions || [])[0] || {}, t = ((c.status || ev.status || {}).type) || {}, cs = c.competitors || [];
    if (t.state !== "in" || cs.length !== 2 || Number(cs[0].score) === Number(cs[1].score)) return false;
    return /^End of (4th|Regulation|2nd Half|3rd Period)/i.test(t.shortDetail || t.detail || "") || /^End of 4th Quarter/i.test(t.description || "");
  }
  // the stat map a card's tags read: ESPN's box score labels and values, nothing else (football: each group's keys prefixed, e.g. "passing.YDS")
  function rkStatMap(s) { var o = {}; Object.keys(s || {}).forEach(function (k) { if (s[k] != null && s[k] !== "" && s[k] !== "--") o[k] = String(s[k]); }); return o; }
  function rkFbStats(gs) { var o = {}; Object.keys(gs || {}).forEach(function (gn) { var m = rkStatMap(gs[gn]); Object.keys(m).forEach(function (k) { o[gn + "." + k] = m[k]; }); }); return o; }
  function rkGameRows(lg, ev, sum) {
    var kind = RK_KIND[lg], comp = ev.competitions[0], st = (comp.status || ev.status || {}).type || {}, live = st.state === "in" && !rkOver(ev), teams = {}, rows = [];
    (comp.competitors || []).forEach(function (c) { teams[c.team.id] = c; });
    function result(tid) {
      var me = teams[tid], opp = null; Object.keys(teams).forEach(function (k) { if (k !== tid) opp = teams[k]; });
      if (!me || !opp) return ["", ""];
      var a = rkNum(me.score), b = rkNum(opp.score);
      return [opp.team.abbreviation || "", live ? rkF(a) + "-" + rkF(b) : (a > b ? "W" : a < b ? "L" : "T") + " " + rkF(a) + "-" + rkF(b)];
    }
    ((sum.boxscore || {}).players || []).forEach(function (team) {
      var t = team.team || {}, tid = t.id, me = teams[tid];
      if (/^ncaa/.test(lg) && !(me && me.team && me.team.conferenceId)) return;
      var rs = result(tid);
      var base = { tid: String(tid || ""), team: t.abbreviation || "", teamName: t.displayName || "", color: t.color ? "#" + t.color : "", opp: rs[0], result: rs[1], ev: ev.id, home: !!(me && me.homeAway === "home") };
      if (live) { base.live = true; base.detail = st.shortDetail || ""; }
      function push(nm, pos, r, id, jer, st) { if (!r) return; var o = {}; Object.keys(base).forEach(function (k) { o[k] = base[k]; }); o.name = nm; o.pos = pos; o.id = id || ""; o.score = Math.round(r[0] * 10) / 10; o.line = r[1]; if (jer) o.jer = String(jer); if (st) o.st = st; rows.push(o); }
      if (kind === "football") {
        var per = {};
        (team.statistics || []).forEach(function (grp) { (grp.athletes || []).forEach(function (a) { var nm = a.athlete.displayName; per[nm] = per[nm] || { pos: (a.athlete.position || {}).abbreviation || "", id: a.athlete.id, jer: a.athlete.jersey || "", g: {} }; per[nm].g[grp.name] = rkZip(grp.labels, a.stats); }); });
        Object.keys(per).forEach(function (nm) { push(nm, per[nm].pos, rkFootball(per[nm].g), per[nm].id, per[nm].jer, rkFbStats(per[nm].g)); });
        return;
      }
      var seen = {};
      (team.statistics || []).forEach(function (grp) {
        (grp.athletes || []).forEach(function (a) {
          if (!a.stats || !a.stats.length || a.didNotPlay) return;
          var key = a.athlete.id + "|" + (grp.name === "goalies"); if (seen[key]) return; seen[key] = 1;
          var s = rkZip(grp.labels, a.stats), r = null;
          try { r = kind === "bball" ? rkBball(s) : kind === "hockey" ? rkHockey(grp.name, s, !live) : rkBaseball(grp.name, s); } catch (e) { r = null; }
          push(a.athlete.displayName, (a.athlete.position || {}).abbreviation || "", r, a.athlete.id, a.athlete.jersey, rkStatMap(s));
        });
      });
    });
    return rows;
  }
  function rkFetch(url) { return fetch(url, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }); }
  function rkEtDay(iso, add) { return shiftDate(iso, add).replace(/-/g, ""); }
  // self-hosted page only: rebuild the chosen day's rankings straight from ESPN (finished games come from the saved list when it has them)
  function rkPoll(force) {
    if (!window.SLATE_SELF || state.view !== "best" || document.hidden) return;
    var lg = state.bestLeague;
    if (lg === "fav") return rkFavPoll(force);
    if (lg === "all") { rkLeagues(rk.date).forEach(function (k) { rkPollL(k, force); }); return; }
    rkPollL(lg, force);
  }
  function rkPollL(lg, force) {
    if (!window.SLATE_SELF || document.hidden) return;
    var day = rk.date; if (!day || !lg || !RK_PATH[lg]) return;
    if (!rk.loaded || rk.docDate !== day) return;
    if (rk.doc && rk.doc.final && day < todayInHome() && rk.doc.events) return;
    var key = day + "|" + lg, cur = rk.live[key];
    if (rk.busyK[key]) return;
    if (!force && cur && (cur.final || Date.now() - cur.at < 55000)) return;
    rk.busyK[key] = true;
    Promise.all([rkFetch(rkUrl(lg, "scoreboard", "dates=" + rkEtDay(day, 0))), rkFetch(rkUrl(lg, "scoreboard", "dates=" + rkEtDay(day, 1)))]).then(function (sbs) {
      var evs = {};
      sbs.forEach(function (j) { ((j && j.events) || []).forEach(function (e) { var s = (e.status || {}).type || {}; if ((s.state === "in" || s.state === "post") && rkCentral(new Date(e.date).getTime()) === day) evs[e.id] = e;
        (((e.competitions || [])[0] || {}).competitors || []).forEach(function (c) { var tm = c.team || {}; if (tm.logo && tm.displayName) logoNote(tm.displayName, tm.logo, tm.color, tm.alternateColor); mmLogoNote(lg, tm); }); }); });
      var doc = rk.docDate === day ? rk.doc : null, savedFinal = {}, saved = [];
      if (doc && doc.events && doc.events[lg] && doc.leagues && doc.leagues[lg]) {
        doc.events[lg].forEach(function (id) { savedFinal[id] = 1; });
        saved = doc.leagues[lg].filter(function (r) { return r.ev && savedFinal[r.ev] && evs[r.ev]; });
      }
      var need = Object.keys(evs).filter(function (id) { return !savedFinal[id]; });
      var out = saved.slice(), i = 0;
      function next() {
        if (i >= need.length) return Promise.resolve();
        var id = need[i++], e = evs[id], post = ((e.status || {}).type || {}).state === "post";
        var cached = post && rk.sum[lg + id];
        var p = cached ? Promise.resolve(cached) : rkFetch(rkUrl(lg, "summary", "event=" + id)).then(function (s) { if (s && post) rk.sum[lg + id] = s; return s; });
        return p.then(function (s) { if (s) out = out.concat(rkGameRows(lg, e, s)); return next(); });
      }
      return Promise.all([next(), next(), next(), next(), next(), next()]).then(function () {
        out.sort(function (a, b) { return b.score - a.score; });
        var nLive = Object.keys(evs).filter(function (id) { return ((evs[id].status || {}).type || {}).state === "in" && !rkOver(evs[id]); }).length;
        rk.live[key] = { rows: out.slice(0, /^ncaa/.test(lg) ? RK_TOP_COLLEGE : RK_TOP), games: Object.keys(evs).length, live: nLive, final: !nLive && day < todayInHome(), at: Date.now() };
      });
    }).then(function () { rk.busyK[key] = false; if (state.view === "best") keepScroll(renderBest); if (state.view === "moments") keepScroll(renderMoments); }, function () { rk.busyK[key] = false; });
  }
  // how DJ's starred players did: only the games their teams played, every player line (not just the top 25)
  function rkFavPoll(force, dayX) {
    var day = dayX || rk.date, favs = state.players || []; if (!day || !favs.length) return;
    var cur = rk.fav[day];
    if (rk.busyK["fav|" + day]) return;
    if (!force && cur && (cur.final || Date.now() - cur.at < 55000)) return;
    rk.busyK["fav|" + day] = true;
    var lgs = {}; favs.forEach(function (p) { if (RK_PATH[p.lg]) (lgs[p.lg] = lgs[p.lg] || []).push(p); });
    var rows = [], status = {}, nexts = {}, anyLive = false;
    Promise.all(Object.keys(lgs).map(function (lg) {
      return Promise.all([rkFetch(rkUrl(lg, "scoreboard", "dates=" + rkEtDay(day, 0))), rkFetch(rkUrl(lg, "scoreboard", "dates=" + rkEtDay(day, 1))),
        rkFetch(rkUrl(lg, "scoreboard", "limit=500&dates=" + rkEtDay(day, 1) + "-" + rkEtDay(day, 21)))]).then(function (sbs) {
        var evs = [], ahead = sbs.pop();
        // the next game for each player after this day, so a night off still says when they play next
        lgs[lg].forEach(function (p) {
          var best = null;
          ((ahead && ahead.events) || []).forEach(function (e) {
            if (rkCentral(new Date(e.date).getTime()) <= day) return;
            var cs = ((e.competitions || [])[0] || {}).competitors || [], me = null, op = null;
            cs.forEach(function (c) { var t = c.team || {}; if (t.displayName === p.teamName || t.abbreviation === p.team) me = c; else op = c; });
            if (!me || (best && Date.parse(best.start) <= Date.parse(e.date))) return;
            best = { start: e.date, home: me.homeAway === "home", opp: op ? (op.team || {}).abbreviation || (op.team || {}).shortDisplayName || "" : "" };
          });
          if (best) nexts[p.lg + "|" + p.id] = best;
        });
        sbs.forEach(function (j) { ((j && j.events) || []).forEach(function (e) { if (rkCentral(new Date(e.date).getTime()) !== day) return; var names = ((e.competitions || [])[0] || {}).competitors || [];
          var mine = lgs[lg].filter(function (p) { return names.some(function (c) { var t = c.team || {}; return t.displayName === p.teamName || t.abbreviation === p.team; }); });
          if (mine.length && !evs.some(function (x) { return x.e.id === e.id; })) evs.push({ e: e, mine: mine }); }); });
        return Promise.all(evs.map(function (x) {
          var st = ((x.e.status || {}).type || {}).state; x.mine.forEach(function (p) { status[p.lg + "|" + p.id] = { state: st, start: x.e.date }; });
          if (st === "in") anyLive = true;
          if (st !== "in" && st !== "post") return null;
          var cached = st === "post" && rk.sum[lg + x.e.id];
          return (cached ? Promise.resolve(cached) : rkFetch(rkUrl(lg, "summary", "event=" + x.e.id)).then(function (s) { if (s && st === "post") rk.sum[lg + x.e.id] = s; return s; })).then(function (s) {
            if (!s) return; var ids = {}; x.mine.forEach(function (p) { ids[String(p.id)] = 1; });
            rkGameRows(lg, x.e, s).forEach(function (r) { if (ids[String(r.id)]) { r.lg = lg; rows.push(r); } });
          });
        }));
      });
    })).then(function () {
      rows.sort(function (a, b) { return b.score - a.score; });
      rk.fav[day] = { rows: rows, status: status, next: nexts, at: Date.now(), final: !anyLive && day < todayInHome() };
      rk.busyK["fav|" + day] = false; if (state.view === "best") keepScroll(renderBest); if (state.view === "moments") keepScroll(renderMoments);
    }, function () { rk.busyK["fav|" + day] = false; });
  }
  if (window.SLATE_SELF) {
    setInterval(function () { rkPoll(false); if (state.view === "moments" && mm.date === todayInHome() && !document.hidden) rkPollL(mm.lg, false); }, 15000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) rkPoll(false); });
  }
  function rkSub() {
    if (!db || !rk.date) return;
    if (rk.docDate === rk.date && rk.unsub) return;
    if (rk.unsub) { try { rk.unsub(); } catch (e) {} }
    var day = rk.date; rk.doc = null; rk.docDate = day; rk.loaded = false;
    rk.unsub = db.doc("standouts/" + day).onSnapshot(function (snap) {
      if (rk.docDate !== day) return;
      rk.doc = snap.exists ? snap.data() : null; rk.loaded = true;
      if (state.view === "best") { keepScroll(renderBest); rkPoll(true); }
      if (state.view === "moments") { if (mm.date === day) rkPollL(mm.lg, true); keepScroll(renderMoments); }
    }, function () { rk.loaded = true; if (state.view === "moments") keepScroll(renderMoments); });
  }
  function rkDefaultDate() {
    var today = todayInHome(), now = Date.now();
    // "started" means a real score exists (live or final) in a league Box Office ranks, not just a start time that passed
    var started = state.date === today && games().some(function (g) { var sc = scoreRaw(g.id), t = new Date(g.start).getTime(); return RK_KIND[g.league] && t <= now && sc && (sc.state === "in" || sc.state === "post") && !/postpon|cancel|suspend/i.test(sc.detail || ""); });
    return started ? today : shiftDate(today, -1);
  }
  function rkSetDate(iso) {
    var today = todayInHome();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
    if (iso > today) iso = today;
    rk.date = iso; rk.picked = true; rkSub(); keepScroll(renderBest); rkPoll(true);
  }
  function rkData(lgx) {
    var lg = lgx || state.bestLeague, live = rk.live[rk.date + "|" + lg];
    if (window.SLATE_SELF && live) return { rows: live.rows, games: live.games, live: live.live, at: live.at, src: "live" };
    var d = rk.docDate === rk.date ? rk.doc : null;
    if (d && d.leagues && d.leagues[lg]) return { rows: d.leagues[lg], games: (d.games || {})[lg], live: (d.live || {})[lg] || 0, at: new Date(d.updatedAt).getTime(), src: "saved" };
    return null;
  }
  // a ranked performance, drawn like the Real app: face with team mark, big numbers with small units, where and when
  function rkStats(line) {
    var w = el("div", "rk-stats"), extra = [], n = 0;
    String(line || "").split(" · ").forEach(function (tok, i) {
      var m = /^([+\-]?\.?\d[\d.,:\/-]*)\s*(.*)$/.exec(tok.trim());
      if (m && n < 5) {
        // the first three numbers make line one; in a narrow pane or at large text the rest drop to a quieter second line
        // on every row alike, so rows no longer break wherever they run out of room (3.51.0)
        if (n === 3) w.appendChild(el("span", "rk-br"));
        var c = el("span", "rk-st" + (n >= 3 ? " rk-st2" : "")); c.appendChild(el("b", null, m[1])); if (m[2]) c.appendChild(el("i", null, m[2].toLowerCase())); w.appendChild(c); n++;
      }
      else extra.push(tok);
    });
    if (extra.length) w.appendChild(el("span", "rk-more", extra.join(" · ")));
    return w;
  }
  function fpWhen(iso, day) {
    var d = rkCentral(Date.parse(iso)), t = timeText(iso);
    if (d === day) return t;
    if (d === shiftDate(day, 1)) return "Tomorrow " + t;
    var f = new Intl.DateTimeFormat("en-US", { timeZone: HOME_TZ, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
    return f + " · " + t;
  }
  // a starred player without a line tonight: small face, name, and when they play next
  function favIdleRow(p, fd, day) {
    var k = p.lg + "|" + p.id, st = fd.status[k], nx = (fd.next || {})[k];
    var row = el("div", "fp-row"), face = el("span", "fp-face"), tc = typeof teamByName === "function" ? teamByName(p.teamName) : null;
    face.style.background = (tc && tc.c1) || "#2a3442";
    var ini = String(p.name || "").split(" "); face.appendChild(el("i", null, ((ini[0] || "")[0] || "") + ((ini[ini.length - 1] || "")[0] || "")));
    var dir = BX_HEAD[p.lg];
    if (dir) { var im = document.createElement("img"); im.alt = ""; im.loading = "lazy"; im.src = "https://a.espncdn.com/combiner/i?img=/i/headshots/" + dir + "/players/full/" + p.id + ".png&w=96&h=70"; im.onerror = function () { im.remove(); }; face.appendChild(im); }
    row.appendChild(face);
    var mid = el("div", "fp-mid"), nm = el("div", "fp-nm");
    nm.appendChild(el("b", null, p.name)); nm.appendChild(el("span", null, p.team || (LEAGUES[p.lg] || {}).tag || ""));
    mid.appendChild(nm);
    var when;
    if (st && st.state === "pre") when = "Tonight " + timeText(st.start);
    else if (st) when = "Sat out" + (nx ? " · next " + fpWhen(nx.start, day) + " " + (nx.home ? "vs " : "@ ") + nx.opp : "");
    else if (nx) when = "Next: " + fpWhen(nx.start, day) + " " + (nx.home ? "vs " : "@ ") + nx.opp;
    else when = "No game in the next 3 weeks";
    mid.appendChild(el("div", "fp-next", when));
    row.appendChild(mid);
    row.appendChild(playerStar(p));
    return row;
  }
  // football box scores don't say a player's position: look it up on the team roster once (kept on the phone), and guess from the line meanwhile
  var FPOS = (function () { try { return JSON.parse(localStorage.getItem("slate-fpos") || "{}"); } catch (e) { return {}; } })(), FPOS_ASK = {};
  function footPos(r, lg) {
    if (r.pos) return r.pos;
    if (r.id && FPOS[r.id]) return FPOS[r.id];
    if (r.tid && r.id && !FPOS_ASK[lg + r.tid] && RK_PATH[lg]) {
      FPOS_ASK[lg + r.tid] = 1;
      rkFetch(rkUrl(lg, "teams/" + r.tid + "/roster", "")).then(function (j) {
        ((j && j.athletes) || []).forEach(function (grp) { (grp.items || []).forEach(function (a) { var p = (a.position || {}).abbreviation; if (a.id && p) FPOS[a.id] = p; }); });
        try { localStorage.setItem("slate-fpos", JSON.stringify(FPOS)); } catch (e) {}
        if (state.view === "moments") keepScroll(renderMoments); else if (state.view === "best") keepScroll(renderBest);
      });
    }
    var l = String(r.line || "");
    return /pass yds/.test(l) ? "QB" : /^\S+ rush/.test(l) ? "RB" : /^\S+ rec/.test(l) ? "WR/TE" : /TKL|sacks|INT/.test(l) ? "DEF" : "";
  }
  // which games were on your slate that day (today's from memory, other days read once from your saved slate)
  var SLATE_DAYS = {};
  function slateIdsFor(day) {
    if (!day) return null;
    if (day === state.date && state.slateIds) return state.slateIds;
    var c = SLATE_DAYS[day]; if (c) return c.ids;
    SLATE_DAYS[day] = { ids: null };
    if (uid && db) lineupRef(day).get().then(function (d) { var x = d && d.exists ? d.data() : null; SLATE_DAYS[day].ids = (x && x.ids) || []; if (state.view === "moments") keepScroll(renderMoments); else if (state.view === "best") keepScroll(renderBest); }, function () {});
    return null;
  }
  function onSlateRow(r, lg) {
    var day = state.view === "moments" ? mm.date : rk.date, ids = slateIdsFor(day); if (!ids || !ids.length || !r.team || !r.opp) return false;
    var a = String(r.team).toUpperCase(), b = String(r.opp).toUpperCase();
    // the day the app has loaded: the slate's own games, matched by both teams (3.100.4: a game's id isn't always league-away-home)
    if (day === state.date && state.slateSet) {
      var hit = games().some(function (g) { if (g.league !== lg || !state.slateSet[g.id]) return false; var x = String(abbr(g, "away") || "").toUpperCase(), y = String(abbr(g, "home") || "").toUpperCase(); return (x === a && y === b) || (x === b && y === a); });
      if (hit) return true;
    }
    var al = a.toLowerCase(), bl = b.toLowerCase(), base = function (id) { return String(id).replace(/-\d+$/, ""); };
    return ids.some(function (id) { var k = base(id); return k === lg + "-" + al + "-" + bl || k === lg + "-" + bl + "-" + al; });
  }
  // a player's ESPN headshot in a circle of his team's color, initials underneath until it loads, the team badge at the corner.
  // Shared: Box Office's cards and Player rankings use it, and any page can (p = { id, name, team, teamName, color }, lg = the league key).
  // team logos from the scoreboards Box Office reads, by league and team (abbreviation, or "#" + ESPN id): the logo file's segment
  var MM_LOGO = {};
  function mmLogoNote(lg, tm) { var sg = logoSeg(tm && tm.logo); if (!sg) return; if (tm.abbreviation) MM_LOGO[lg + "|" + tm.abbreviation] = sg; if (tm.id) MM_LOGO[lg + "|#" + tm.id] = sg; }
  function mmLogoFor(lg, p) { return (p.tid && MM_LOGO[lg + "|#" + p.tid]) || (p.team && MM_LOGO[lg + "|" + p.team]) || ""; }
  function playerFace(p, lg) {
    var face = el("span", "rk-face"), tc = typeof teamByName === "function" ? teamByName(p.teamName) : null;
    face.style.background = (hexOk(p.color) ? p.color : (tc && tc.c1) || "#2a3442");
    var ini = String(p.name || "").split(" "); face.appendChild(el("i", null, ((ini[0] || "")[0] || "") + ((ini[ini.length - 1] || "")[0] || "")));
    var dir = BX_HEAD[lg];
    if (p.id && dir) { var im = document.createElement("img"); im.alt = ""; im.loading = "lazy"; im.src = "https://a.espncdn.com/combiner/i?img=/i/headshots/" + dir + "/players/full/" + p.id + ".png&w=140&h=102"; im.onerror = function () { im.remove(); }; face.appendChild(im); }
    var wrapF = el("span", "rk-fw"); wrapF.appendChild(face);
    // the team's logo straight from that night's ESPN scoreboard when Box Office has it (DJ, 3.90.1: on his phone most college
    // badges stayed letters through the shared logo lookup); the lettered chip only if there's no logo or it fails to load
    var seg = lg && mmLogoFor(lg, p), mark = badgeFor(p.team || "", seg ? "" : (p.teamName || ""), p.color);
    mark.classList.add("rk-mark");
    if (seg) {
      var lim = document.createElement("img"); lim.className = "badge-logo"; lim.alt = ""; lim.decoding = "async"; lim.draggable = false;
      lim.onload = function () { mark.classList.add("lg"); };
      lim.onerror = function () { lim.remove(); if (p.teamName) addLogo(mark, p.teamName); };
      lim.src = logoUrl(seg, false); mark.appendChild(lim);
    }
    wrapF.appendChild(mark);
    return wrapF;
  }
  function bestRow(r, rank, lgx) {
    var lg = lgx || r.lg || state.bestLeague;
    var row = el("div", "rk-row" + (isFav(r.teamName, lg) || isFavPlayer(r.id, lg) ? " fav" : ""));
    var wrapF = playerFace(r, lg);
    row.appendChild(wrapF);
    var mid = el("div", "rk-mid");
    var top = el("div", "rk-top"), nm = el("span", "rk-nm");
    var parts = String(r.name || "").split(" "), shortN = parts.length > 1 ? parts[0][0] + ". " + parts.slice(1).join(" ") : r.name;
    var posT = RK_KIND[lg] === "football" ? footPos(r, lg) : r.pos;
    nm.appendChild(el("b", null, shortN)); if (posT) nm.appendChild(el("span", "rk-pos", " · " + posT));
    if (onSlateRow(r, lg)) { var sm = el("span", "rk-slate", "Slate"); sm.title = "From a game on your slate"; nm.appendChild(sm); }
    top.appendChild(nm);
    // rank sits in its own narrow column on the left; the star on the right edge
    row.insertBefore(el("span", "rk-rank" + (rank && rank <= 3 ? " top" : ""), rank ? String(rank) : (lgx === undefined && r.lg ? (LEAGUES[r.lg] || {}).tag || "" : "")), row.firstChild);
    if (r.team) nm.appendChild(el("span", "rk-tm", " · " + r.team));
    mid.appendChild(top);
    mid.appendChild(rkStats(r.line));
    var ft = el("div", "rk-foot");
    if (r.live) { ft.appendChild(el("i", "rk-dot")); ft.appendChild(el("span", "rk-live", r.detail || "Live")); }
    if (r.opp) { if (r.live) ft.appendChild(el("span", "rk-sep", " · ")); ft.appendChild(el("span", "rk-opp", (r.home ? "vs " : "@ ") + r.opp)); }
    if (r.result) {
      var wl = /^[WLT] /.test(r.result) ? r.result.charAt(0) : "", sc = wl ? r.result.slice(2) : r.result;
      if (wl) ft.appendChild(el("b", "rk-wl " + wl.toLowerCase(), wl));
      ft.appendChild(el("span", "rk-sc", sc));
    }
    mid.appendChild(ft);
    row.appendChild(mid);
    if (r.id) row.appendChild(playerStar({ id: r.id, name: r.name, lg: lg, team: r.team, teamName: r.teamName })); else row.appendChild(el("span"));
    return row;
  }
  function rkLeagues(day) {
    var d = rk.docDate === day ? rk.doc : null, have = d && d.leagues || {};
    var ks = BEST_ORDER.filter(function (k) { return (Array.isArray(have[k]) && have[k].length) || (rk.live[day + "|" + k] && rk.live[day + "|" + k].games); });
    if (window.SLATE_SELF) {
      var playing = {}; if (day === state.date) games().forEach(function (g) { if (RK_KIND[g.league]) playing[g.league] = 1; });
      BEST_ORDER.forEach(function (k) { if (playing[k] && ks.indexOf(k) === -1) ks.push(k); });
      ks.sort(function (a, b) { return BEST_ORDER.indexOf(a) - BEST_ORDER.indexOf(b); });
    }
    return ks;
  }
  function rkOpts(ks) {
    var opts = [];
    if ((state.players || []).length) opts.push(["fav", "★"]);
    ks.forEach(function (k) { opts.push([k, (LEAGUES[k] || {}).tag || k.toUpperCase()]); });
    if (ks.length > 1) opts.push(["all", "ALL"]);
    var ord = state.gamesOrder || [];
    if (ord.length) opts = opts.map(function (o, i) { var j = ord.indexOf(o[0]); return [j === -1 ? 1e3 + i : j, o]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
    return opts;
  }
  // how many games each league has on a Box Office day ("NBA 9" on its tab). The day the app has loaded counts the games
  // All games shows; any other day asks ESPN's scoreboard once (free) and keeps the answer. Postponed and canceled games don't count.
  var GC_PATH = { epl: "soccer/eng.1", ucl: "soccer/uefa.champions" }, gc = {};
  var GC_OFF = /postpon|cancel|suspend|forfeit/i;
  // the power conferences by ESPN conference id (DJ, 3.79.0): basketball ACC 2, Big East 4, Big Ten 7, Big 12 8, SEC 23;
  // football ACC 1, Big 12 4, Big Ten 5, SEC 8
  var MM_POWER = { ncaam: { 2: 1, 4: 1, 7: 1, 8: 1, 23: 1 }, ncaaw: { 2: 1, 4: 1, 7: 1, 8: 1, 23: 1 }, ncaaf: { 1: 1, 4: 1, 5: 1, 8: 1 } };
  // ESPN's scoreboard for one league and day, kept: { n: games, p: games with a power-conference team, conf: { team abbreviation or id: conference id } }
  function gcBoard(day, lg) {
    var key = day + "|" + lg; if (key in gc) return gc[key];
    var path = RK_PATH[lg] || GC_PATH[lg]; if (!path) return null;
    gc[key] = null;
    var url = function (add) { var p = path.split("&"); return "https://site.api.espn.com/apis/site/v2/sports/" + p[0] + "/scoreboard?dates=" + rkEtDay(day, add) + (p.length > 1 ? "&" + p.slice(1).join("&") : ""); };
    Promise.all([rkFetch(url(0)), rkFetch(url(1))]).then(function (sbs) {
      if (!sbs[0] && !sbs[1]) { delete gc[key]; return; }
      var seen = {}, pw = {}, conf = {}, P = MM_POWER[lg] || {};
      sbs.forEach(function (j) { ((j && j.events) || []).forEach(function (e) {
        var t = (e.status || {}).type || {}; if (GC_OFF.test((t.name || "") + " " + (t.description || ""))) return; if (rkCentral(new Date(e.date).getTime()) !== day) return;
        seen[e.id] = 1;
        (((e.competitions || [])[0] || {}).competitors || []).forEach(function (c) { var tm = c.team || {}, ci = tm.conferenceId;
          // every team that played that day hands its logo to the logo helper (DJ, 3.89.4: Box Office had no logos for last night's
          // college teams when the phone's team list didn't have them; the slate's own games only cover the day the app has loaded)
          if (tm.logo && tm.displayName) logoNote(tm.displayName, tm.logo, tm.color, tm.alternateColor);
          mmLogoNote(lg, tm);
          if (!ci) return; if (tm.abbreviation) conf[tm.abbreviation] = ci; if (tm.id) conf["#" + tm.id] = ci; if (P[ci]) pw[e.id] = 1; });
      }); });
      gc[key] = { n: Object.keys(seen).length, p: Object.keys(pw).length, conf: conf };
      if (state.view === "moments") keepScroll(renderMoments); else if (state.view === "best") keepScroll(renderBest);
    });
    return null;
  }
  // how many games a league has on a Box Office day; power = only games with a power-conference team. The day the app has
  // loaded counts the games All games shows; other days (and the power count) come from ESPN's scoreboard. Postponed and canceled don't count.
  function lgGameCount(day, lg, power) {
    if (lg === "all") return null;
    if (!power && day === state.date && (state.slateStatus === "ready" || state.slateStatus === "empty")) {
      var n = 0; games().forEach(function (g) { if (g.league !== lg) return; var sc0 = scoreRaw(g.id); if (sc0 && GC_OFF.test(sc0.detail || "")) return; n++; });
      return n;
    }
    var b = gcBoard(day, lg); return b ? (power ? b.p : b.n) : null;
  }
  // Power conferences only (college tabs): on or off, remembered on this phone
  function mmPowerOn(lg) { if (!MM_POWER[lg]) return false; try { return localStorage.getItem("slate-bo-power") === "1"; } catch (e) { return false; } }
  function mmPowerSet(on) { try { localStorage.setItem("slate-bo-power", on ? "1" : "0"); } catch (e) {} }
  // is this player's team in a power conference? null while the day's conferences are still loading
  function mmIsPower(r, day, lg) {
    var P = MM_POWER[lg], b = gcBoard(day, lg); if (!P) return true; if (!b) return null;
    var ci = (r.tid && b.conf["#" + r.tid]) || b.conf[r.team]; return !!(ci && P[ci]);
  }
  function mmPowerOnly(rows, day, lg) { if (!mmPowerOn(lg)) return rows; return rows.filter(function (r) { return mmIsPower(r, day, lg) === true; }); }
  function mmPowerBar(lg) {
    if (!MM_POWER[lg]) return null;
    var on = mmPowerOn(lg), sub = el("div", "substrip mm-pw");
    [["all", "All"], ["power", "Power conferences"]].forEach(function (o) {
      var b = el("button", "cf-tab", o[1]); b.type = "button"; b.setAttribute("aria-pressed", (o[0] === "power") === on ? "true" : "false");
      b.addEventListener("click", function () { mmPowerSet(o[0] === "power"); mm.pick = null; keepScroll(renderMoments); });
      sub.appendChild(b);
    });
    return sub;
  }
  // the game count in a section heading: "8 games", "8 games · 1 live"
  function gamesLine(day, lg, live) { var pw = mmPowerOn(lg), n = lgGameCount(day, lg, pw); if (pw) live = 0;  // the live count is the whole league's
    return (n ? n + (n === 1 ? " game" : " games") : "") + (live ? (n ? " · " : "") + live + " live" : ""); }
  function rkPick(k, dir) {
    if (state.bestLeague === k) return;
    state.bestLeague = k; state.bestAuto = false; state.bestConf = "all";
    if (dir) slideIn($("best-body"), dir);
    renderBest(); rkPoll(true); window.scrollTo(0, 0);
    var on = document.querySelector(".rk-strip [aria-pressed=true]"); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center" });
  }
  function rkSwipe(step) {
    var opts = rkOpts(rkLeagues(rk.date)), i = -1;
    opts.forEach(function (o, j) { if (o[0] === state.bestLeague) i = j; });
    var n = opts[i + step]; if (n) rkPick(n[0], step > 0 ? "l" : "r");
  }
  // ---- Moments: the night before in four leagues: top performers, over- and underachievers, wild finishes.
  // moments/<night>: the free tick job adds the rule-picked finishes each morning ("auto"); Claude's take is written only when someone taps Write. Top performers come from standouts/<night>.
  var MM_LGS = [["nfl", "NFL"], ["nba", "NBA"], ["ncaam", "CBB"], ["ncaaf", "CFB"], ["epl", "Premier League"], ["nhl", "NHL"], ["ncaaw", "WCBB"], ["ucl", "Champions League"], ["mlb", "MLB"], ["wnba", "WNBA"]];
  var MM_SOON = [];
  var MM_SOCCER = { epl: 1, ucl: 1 };
  // leagues out of season for the night being viewed stay off the strip (month 1-12)
  var MM_SEASON = { mlb: [3, 11], wnba: [5, 10] };
  // same league order as All games (your tab order there, else the app's default)
  // today's Box Office only offers leagues with a game underway or finished (soccer has no live rankings);
  // null while today's games are still loading or the app is showing another day
  function mmTodayLgs() {
    var today = todayInHome(); if (state.date !== today || (state.slateStatus !== "ready" && state.slateStatus !== "empty")) return null;
    // a postponed or canceled game comes back as "over" with no score: it doesn't count as played
    var on = {}; games().forEach(function (g) { var k = status(g).kind, sc0 = scoreRaw(g.id); if (sc0 && /postpon|cancel|suspend|forfeit/i.test(sc0.detail || "")) return; if ((k === "live" || k === "over") && !MM_SOCCER[g.league]) on[g.league] = 1; });
    MM_LGS.forEach(function (o) { var d = rkData(o[0]); if (d && d.rows && d.rows.length && !MM_SOCCER[o[0]]) on[o[0]] = 1; });
    return on;
  }
  function mmLgs() {
    var ord = (state.gamesOrder || []).length ? state.gamesOrder : ORDER;
    var on = (mm.date || todayInHome()) === todayInHome() ? mmTodayLgs() : null;
    // a past night: hide leagues that had no games (marked when the night was filed)
    var dd = (mm.date || todayInHome()) !== todayInHome() ? mm.docs["moments/" + mm.date] : null, LL = dd && dd.leagues;
    if (LL) { var played = function (k) { var x = LL[k]; return !(x && (x.see || x.none)); };
      var keep = MM_LGS.filter(function (o) { var r = MM_SEASON[o[0]], mo2 = Number(String(mm.date).slice(5, 7)); return played(o[0]) && (!r || (mo2 >= r[0] && mo2 <= r[1]) || (LL[o[0]] && !LL[o[0]].see && !LL[o[0]].none)); });
      if (keep.length) return keep.sort(function (a, b) { var i = ord.indexOf(a[0]), j = ord.indexOf(b[0]); return (i === -1 ? 999 + ORDER.indexOf(a[0]) : i) - (j === -1 ? 999 + ORDER.indexOf(b[0]) : j); }); }
    if (on && Object.keys(on).length) return MM_LGS.filter(function (o) { return on[o[0]]; }).sort(function (a, b) { var i = ord.indexOf(a[0]), j = ord.indexOf(b[0]); return (i === -1 ? 999 + ORDER.indexOf(a[0]) : i) - (j === -1 ? 999 + ORDER.indexOf(b[0]) : j); });
    var at = function (k) { var i = ord.indexOf(k); return i === -1 ? 999 + ORDER.indexOf(k) : i; };
    var mo = Number(String(mm.date || todayInHome()).slice(5, 7));
    return MM_LGS.filter(function (o) { var r = MM_SEASON[o[0]]; return !r || (mo >= r[0] && mo <= r[1]) || mm.lg === o[0]; }).sort(function (a, b) { return at(a[0]) - at(b[0]); });
  }
  var mm = { date: null, lg: "nba", docs: {}, subs: {}, more: {} };
  function mmWatch(path) {
    if (!db || mm.subs[path]) return;
    mm.subs[path] = db.doc(path).onSnapshot(function (sn) { mm.docs[path] = sn.exists ? sn.data() : null; if (state.view === "moments") keepScroll(renderMoments); }, function () { mm.docs[path] = null; });
  }
  function mmSetDate(iso) { var last = todayInHome(); if (iso > last) iso = last; mm.date = iso; mm.auto = false; mm.picked = true; keepScroll(renderMoments); window.scrollTo(0, 0); }
  function mmPick(k, dir) { if (mm.lg === k) return; mm.lg = k; mm.auto = false; if (dir) slideIn($("mm-body"), dir); renderMoments(); window.scrollTo(0, 0);
 }
  function mmSwipe(step) { var L2 = mmLgs(), i = -1; L2.forEach(function (o, j) { if (o[0] === mm.lg) i = j; }); var n = L2[i + step]; if (n) mmPick(n[0], step > 0 ? "l" : "r"); }
  function mmSec(title, sub) { var h = el("div", "sec mm-sec"); h.appendChild(el("h2", null, title)); if (sub) h.appendChild(el("span", "count", sub)); return h; }
  // over/underachievers in the same row as the rankings, with Claude's reason underneath
  function mmRow(r, kind) {
    var line = String(r.line || "").replace(/\s*,\s*/g, " · ");
    var row = bestRow({ id: r.id || "", name: r.name, team: r.team, teamName: r.teamName || "", line: line, opp: r.opp || "", result: r.result || "" }, kind === "over" ? "▲" : "▼", mm.lg);
    row.classList.add("mm-" + kind);
    var mid = row.querySelector(".rk-mid"); if (mid && r.why) mid.appendChild(el("div", "mm-why", r.why));
    return row;
  }
  // ---- Box Office player cards, in the slate's Top performers look (DJ, 3.75.0: "the same design for box office") ----
  // team color down the left edge, the jersey with the number (football and basketball use the Live feed's jerseys), name, position
  // and team, the stat line under the name, a rare night-leader tag under that, and the game on the right. The card styles are the slate's tp- rules.
  var MM_SPORT = { bball: "bball", hockey: "hockey", football: "football", baseball: "baseball" };
  function mmSport(lg) { return MM_SOCCER[lg] ? "soccer" : MM_SPORT[RK_KIND[lg]] || ""; }
  // a player's team details (full name, color, jersey) from the night's rankings, for Claude's rows that only carry the team's abbreviation
  function mmLookup(lg, day) {
    var out = { id: {}, team: {} }, add = function (r) { if (!r) return; if (r.id) out.id[r.id] = r; if (r.team && !out.team[r.team]) out.team[r.team] = r; };
    (((mm.docs["standouts/" + day] || {}).leagues || {})[lg] || []).forEach(add);
    var lv = rk.live[day + "|" + lg]; ((lv && lv.rows) || []).forEach(add);
    return out;
  }
  // the night's leaders in the list (DJ, 3.77.3): one tag per category, given only to the leader. A tie of three or more gets no tag.
  // Every number comes from the box score row (st). Football reads "group.LABEL" keys.
  var MM_LEAD = {
    bball: [["🪣 Top scorer", "PTS"], ["🧲 Most boards", "REB"], ["🪄 Most assists", "AST"], ["🎯 Most threes", "3PT"], ["🔒 Most steals + blocks", ["STL", "BLK"]]],
    football: [["🎯 Most passing yds", "passing.YDS"], ["💨 Most rushing yds", "rushing.YDS"], ["🙌 Most receiving yds", "receiving.YDS"], ["🏈 Most TDs", ["rushing.TD", "receiving.TD"]]],
    hockey: [["🚨 Most goals", "G"], ["🍎 Most points", ["G", "A"]], ["🧱 Most saves", "SV"]],
    baseball: [["🔥 Most hits", "H"], ["💣 Most homers", "HR"], ["🏃 Most RBI", "RBI"], ["⚡ Most strikeouts", "K", "IP"]]
  };
  function mmLeaders(rows, sport) {
    var out = {}, defs = MM_LEAD[sport]; if (!defs) return out;
    var num = function (st, k) { var m = /^(\d+)-\d+$/.exec(String(st[k] || "")); var x = m ? Number(m[1]) : parseFloat(String(st[k] == null ? "" : st[k])); return isNaN(x) ? 0 : x; };
    defs.forEach(function (d) {
      var best = 0, who = [];
      rows.forEach(function (r) {
        var st = r.st; if (!st) return; if (d[2] && st[d[2]] == null) return;   // pitchers only for strikeouts
        if (d[1] === "K" && sport === "baseball" && st.IP == null) return;
        var v = [].concat(d[1]).reduce(function (t, k) { return t + num(st, k); }, 0);
        if (v > best) { best = v; who = [r]; } else if (v === best && v > 0) who.push(r);
      });
      if (best > 0 && who.length && who.length <= 2) who.forEach(function (r) { var k = r.id || r.name; (out[k] = out[k] || []).push(d[0]); });
    });
    return out;
  }
  // ---- the rarest tags (DJ, 3.78.0): 👑 Triple-double, 📈 Season high, 🏆 Game-winner. They go first on a card, before the leader tags.
  // Triple-double: from the box score row. Season high (basketball points): the player's ESPN game log this season, at least five earlier
  // games and 20+ points (15+ in college), final games only, and only the night's biggest jump past an old high. Game-winner (basketball, football): the scoring play that put the winner ahead
  // for good, in the last 30 seconds (basketball) or 2 minutes (football) of regulation or overtime, from ESPN's play-by-play; only close finals are checked.
  var MM_HI = {}, MM_GW = {}, MM_BUSY = {};
  var MM_BB_PATH = { nba: "basketball/nba", wnba: "basketball/wnba", ncaam: "basketball/mens-college-basketball", ncaaw: "basketball/womens-college-basketball" };
  function mmRerender() { if (state.view === "moments") keepScroll(renderMoments); }
  function mmFinal(r) { return /^[WLT] /.test(r.result || "") && !r.live; }
  function mmMargin(r) { var m = /^[WLT] (\d+)-(\d+)/.exec(r.result || ""); return m ? Math.abs(Number(m[1]) - Number(m[2])) : 99; }
  function mmSecs(c) { if (!c) return 9999; if (typeof c.value === "number") return c.value; var d = String(c.displayValue || ""), m = /^(\d+):(\d+)/.exec(d); return m ? Number(m[1]) * 60 + Number(m[2]) : parseFloat(d) || 0; }
  function mmSeasonHigh(lg, day, r) {
    var path = MM_BB_PATH[lg]; if (!path || !r.id || !r.ev || !r.st || !mmFinal(r)) return false;
    var pts = parseFloat(r.st.PTS) || 0; if (pts < (lg === "nba" || lg === "wnba" ? 20 : 15)) return false;
    var key = lg + "|" + r.id + "|" + day, log = MM_HI[key];
    if (log === undefined) {
      if (MM_BUSY[key]) return false; MM_BUSY[key] = 1;
      rkFetch("https://site.api.espn.com/apis/common/v3/sports/" + path + "/athletes/" + r.id + "/gamelog").then(function (j) {
        var out = [], ix = j && (j.labels || []).indexOf("PTS"), evs = (j && j.events) || {};
        if (j && ix >= 0) (j.seasonTypes || []).forEach(function (t) { if (/preseason/i.test(t.displayName || "")) return; (t.categories || []).forEach(function (c) { (c.events || []).forEach(function (e) { out.push({ id: String(e.eventId), d: String((evs[e.eventId] || {}).gameDate || ""), p: parseFloat((e.stats || [])[ix]) || 0 }); }); }); });
        MM_HI[key] = j ? out : null; mmRerender();
      });
      return false;
    }
    if (!log) return false;
    var me = log.filter(function (e) { return e.id === String(r.ev); })[0], before = log.filter(function (e) { return e.id !== String(r.ev) && (!me || !me.d || e.d < me.d); });
    if (!me && day < todayInHome()) before = before.filter(function (e) { return e.d.slice(0, 10) < day; });
    if (before.length < 5) return false;
    var prev = Math.max.apply(null, before.map(function (e) { return e.p; }));
    return pts > prev ? pts - prev : false;   // how far past his old high
  }
  // the player who scored the go-ahead points for good late: { key: athlete id (basketball) or name (football) } for one game
  function mmGameWinner(lg, ev, sport) {
    var key = lg + "|" + ev; if (MM_GW[key] !== undefined) return MM_GW[key];
    if (MM_BUSY["gw" + key]) return null; MM_BUSY["gw" + key] = 1;
    var cached = rk.sum[lg + ev];
    (cached ? Promise.resolve(cached) : rkFetch(rkUrl(lg, "summary", "event=" + ev))).then(function (sm) {
      MM_GW[key] = sm ? mmGwFind(sm, lg, sport) : null; if (sm) rk.sum[lg + ev] = sm; mmRerender();
    });
    return null;
  }
  function mmGwFind(sm, lg, sport) {
    var plays = sport === "football" ? (sm.scoringPlays || []) : (sm.plays || []).filter(function (p) { return p.scoringPlay; }); if (!plays.length) return "";
    var last = plays[plays.length - 1], winH = last.homeScore > last.awayScore; if (last.homeScore === last.awayScore) return "";
    var reg = sport === "football" ? 4 : lg === "ncaam" ? 2 : 4, go = null, lead = 0;
    plays.forEach(function (p) { var now = p.homeScore > p.awayScore ? 1 : p.homeScore < p.awayScore ? -1 : 0, w = winH ? 1 : -1; if (now === w && lead !== w) go = p; lead = now; });
    if (!go || (go.period || {}).number < reg || mmSecs(go.clock) > (sport === "football" ? 120 : 30)) return "";
    if (sport === "football") { var t = String(go.text || ""); return t ? { name: t } : ""; }
    var a = ((go.participants || [])[0] || {}).athlete; return a && a.id ? { id: String(a.id) } : "";
  }
  function mmRare(rows, lg, day) {
    var sport = mmSport(lg), out = {}, hi = [], add = function (r, t) { var k = r.id || r.name; (out[k] = out[k] || []).push(t); };
    rows.forEach(function (r) {
      var st = r.st || {};
      if (sport === "bball" && ["PTS", "REB", "AST", "STL", "BLK"].filter(function (k) { return (parseFloat(st[k]) || 0) >= 10; }).length >= 3) add(r, "👑 Triple-double");
      var jump = sport === "bball" ? mmSeasonHigh(lg, day, r) : false; if (jump) hi.push([r, jump]);
    });
    // early in a season lots of players set season highs, so only the night's biggest jump past an old high gets the tag
    var top = Math.max.apply(null, hi.map(function (x) { return x[1]; }).concat([0]));
    hi.forEach(function (x) { if (x[1] === top) add(x[0], "📈 Season-high " + (parseFloat(x[0].st.PTS) || 0)); });
    if (sport === "bball" || sport === "football") {
      var evs = {}; rows.forEach(function (r) { if (r.ev && mmFinal(r) && mmMargin(r) <= (sport === "football" ? 8 : 3)) evs[r.ev] = 1; });
      Object.keys(evs).forEach(function (ev) {
        var gw = mmGameWinner(lg, ev, sport); if (!gw) return;
        var hit = rows.filter(function (r) { return String(r.ev) === ev && (gw.id ? String(r.id) === gw.id : gw.name.indexOf(r.name + " ") === 0); })[0];
        if (hit) add(hit, "🏆 Game-winner");
      });
    }
    return out;
  }
  // the rare tags first, then the leader tags; a card shows two at most
  function mmTags(rows, shown, lg, day) {
    var rare = mmRare(shown, lg, day), lead = mmLeaders(rows, mmSport(lg)), out = {};
    [rare, lead].forEach(function (m) { Object.keys(m).forEach(function (k) { out[k] = (out[k] || []).concat(m[k]); }); });
    return out;
  }
  function mmCard(r, mark, kind, look, lead) {
    var lg = mm.lg, sport = mmSport(lg), byId = (look && r.id && look.id[r.id]) || {}, byTm = (look && r.team && look.team[r.team]) || {};
    var teamName = r.teamName || byId.teamName || byTm.teamName || "", color = r.color || byId.color || byTm.color || "", jer = String(r.jer || byId.jer || "");
    // a one-team stand-in for a game, so the slate's jersey and color helpers work here
    var g = { league: lg, away: teamName, awayColor: hexOk(color) ? color : "", home: "", homeColor: "" };
    var c = el("div", "tp mm-card" + (kind ? " mm-" + kind : "") + (isFav(teamName, lg) || isFavPlayer(r.id, lg) ? " fav" : ""));
    var tc = ""; try { tc = hlInk(badgeColor(g, "away") || ""); } catch (e) {} if (hexOk(tc)) c.style.setProperty("--tp-team", tc);
    if (mark) c.appendChild(el("span", "mm-rank" + (typeof mark === "number" && mark <= 3 ? " top" : ""), String(mark)));
    // the player's headshot (DJ, 3.76.1: liked these more than the jerseys)
    var jj = playerFace({ id: r.id, name: r.name, team: r.team, tid: r.tid || byId.tid, teamName: teamName, color: color }, lg);
    c.appendChild(jj);
    var m = el("div", "tp-m"), top = el("div", "tp-top"), nm = String(r.name || ""), parts = nm.split(" ");
    top.appendChild(el("b", "tp-n", parts.length > 1 ? parts[0].charAt(0) + ". " + parts.slice(1).join(" ") : nm));
    var pos = r.pos || byId.pos || ""; if (pos) top.appendChild(el("em", "fd-pos", pos));
    if (r.team) top.appendChild(el("span", "tp-t", r.team));
    // "Slate" when his game was on your slate that day (back in 3.100.4: the 3.76.0 cards had dropped it)
    var slr = { team: r.team, opp: r.opp || byId.opp }; if (onSlateRow(slr, lg)) { var sm = el("span", "rk-slate", "Slate"); sm.title = "From a game on your slate"; top.appendChild(sm); }
    m.appendChild(top);
    // each stat stays whole when the line wraps ("3 STL", never "3" then "STL")
    if (r.line) { var ln = el("div", "tp-l mm-l"); String(r.line).replace(/\s*,\s*/g, " · ").split(" · ").forEach(function (x, i) { if (i) ln.appendChild(document.createTextNode(" · ")); ln.appendChild(el("span", null, x)); }); m.appendChild(ln); }
    if (r.why) m.appendChild(el("div", "mm-why", r.why));
    // a night-leader tag under the stats (DJ, 3.77.3: rare, only the night's leaders; most cards have none)
    var lt = lead && lead[r.id || r.name];
    if (lt && lt.length) { var tg = el("div", "mm-lead"); lt.slice(0, 2).forEach(function (t) { tg.appendChild(el("span", "fd-tag hot", t)); }); m.appendChild(tg); }
    c.appendChild(m);
    // the game on the right, as before 3.76.0: W/L and the score (or the live clock in red), the opponent under it
    var res = r.result || byId.result || "", opp = r.opp || byId.opp || "", home = r.opp ? r.home : byId.home, gm = el("div", "mm-res");
    if (r.live) { var lv = el("div", "mm-r1"); lv.appendChild(el("i", "rk-dot")); lv.appendChild(el("span", "rk-live", r.detail || "Live")); gm.appendChild(lv); }
    var wl = /^[WLT] /.test(res) ? res.charAt(0) : "";
    if (res) { var r1 = el("div", "mm-r1"); if (wl) r1.appendChild(el("b", "rk-wl " + wl.toLowerCase(), wl)); r1.appendChild(el("span", "rk-sc", wl ? res.slice(2) : res)); gm.appendChild(r1); }
    if (opp) gm.appendChild(el("div", "mm-r2", (home ? "vs " : "@ ") + opp));
    c.appendChild(gm);
    plrTap(jj, { id: r.id, lg: lg, name: r.name });   // 3.112.2 (DJ): only the player's picture opens his page; the rest of the card keeps its own tap
    return c;
  }
  function mmPerson(r, kind, i) {
    var row = el("div", "mm-p " + kind);
    row.appendChild(el("span", "mm-mark", kind === "over" ? "▲" : kind === "under" ? "▼" : String(i + 1)));
    var mid = el("div", "mm-mid"), nm = el("div", "mm-nm");
    nm.appendChild(el("b", null, r.name || "")); if (r.team) nm.appendChild(el("span", null, r.team));
    mid.appendChild(nm);
    if (r.line) mid.appendChild(el("div", "mm-line", r.line));
    if (r.why) mid.appendChild(el("div", "mm-why", r.why));
    row.appendChild(mid);
    return row;
  }
  // one line under the rankings on how players are ordered
  function mmHow(lg) {
    var k = RK_KIND[lg];
    return el("p", "mm-how", k === "bball" ? "How they're ranked: Game Score, a one-number grade for a night's box score. Points, plus credit for rebounds, assists, steals and blocks, minus missed shots, turnovers and fouls."
      : k === "football" ? "How they're ranked: total production. Yards, touchdowns and catches add up and interceptions count against; defenders earn credit for tackles, sacks and picks."
      : MM_SOCCER[lg] ? "How they're picked: Claude weighs goals, assists and the key moments of each match."
      : "How they're ranked: a one-number grade built from the box score.");
  }
  // 3.100.6: never rebuild Box Office under a finger. A redraw while a finger is down (or within 0.4 s of lifting) waits
  // for the finger, and a redraw that would draw exactly the same page is skipped, so score ticks and late data no longer
  // swap the cards out mid-tap (DJ lost taps and saw an 11.8 s freeze). The page is built off screen, then swapped in.
  var mmHoldT = 0, mmSig = "";
  function renderMoments() {
    var body = $("mm-body"); if (!body) return;
    if (state.view !== "moments") { body.textContent = ""; mmSig = ""; return; }
    if (typeof agBusy === "function" && !agTapping && agBusy() && body.firstChild) {
      if (!mmHoldT) (function wait() { mmHoldT = setTimeout(function () { if (agBusy()) wait(); else { mmHoldT = 0; if (state.view === "moments") keepScroll(renderMoments); } }, 150); })();
      return;
    }
    var nb = document.createElement("div"); mmDraw(nb);
    var sig = nb.innerHTML;
    if (sig === mmSig && body.firstChild) return;  // nothing changed: leave the cards (and any tap on them) alone
    mmSig = sig; body.textContent = ""; while (nb.firstChild) body.appendChild(nb.firstChild);
    // keep the picked league in view (centered), without moving the page
    var strip = body.querySelector(".mm-strip"), onT = strip && strip.querySelector("[aria-pressed=true]");
    if (onT) { var want = Math.max(0, onT.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft - (strip.clientWidth - onT.offsetWidth) / 2); strip.scrollLeft = mm.stripX != null && mm.stripLg === mm.lg ? mm.stripX : want; mm.stripLg = mm.lg; mm.stripX = strip.scrollLeft; }
  }
  function mmDraw(body) {
    var today = todayInHome(); if (!mm.date) mm.date = today;
    if (mm.auto && !mm.picked && mm.date === shiftDate(today, -1)) mm.date = today;  // fell back to last night before today's scores loaded: look again
    if (mm.date === today && !mm.picked) {  // opening Box Office: nothing underway today means yesterday's (but you can still pick today with the date picker)
      var on0 = mmTodayLgs();
      if (on0 && !Object.keys(on0).length) { mm.date = shiftDate(today, -1); mm.auto = true; }
      else if (on0 && !on0[mm.lg]) { var l0 = mmLgs()[0]; if (l0) mm.lg = l0[0]; else { mm.date = shiftDate(today, -1); mm.auto = true; } }
    }
    renderDockDay();
    if (!MM_SOCCER[mm.lg] || GC_PATH[mm.lg]) gcBoard(mm.date, mm.lg);   // that day's teams and their logos (fetched once per day and league)
    var strip = el("div", "strip mm-strip");
    mmLgs().forEach(function (o) {
      var b = el("button", "lg-tab", o[1]); b.type = "button"; b.setAttribute("aria-pressed", mm.lg === o[0] ? "true" : "false");
      b.addEventListener("click", function () { mmPick(o[0]); }); strip.appendChild(b);
    });
    MM_SOON.forEach(function (n) { var b = el("span", "lg-tab mm-soon"); b.appendChild(document.createTextNode(n)); b.appendChild(el("i", null, "Soon")); strip.appendChild(b); });
    body.appendChild(strip);
    strip.addEventListener("scroll", function () { mm.stripX = strip.scrollLeft; }, { passive: true });
    var day = mm.date, path = "moments/" + day;
    var nm0 = MM_LGS.filter(function (o) { return o[0] === mm.lg; })[0][1];
    if (day === today) {
      // tonight: the live top performers, straight from the box scores; the rest is written tomorrow morning
      body.appendChild(el("p", "mm-when", "Today, " + fmtDate(day, { weekday: "long", month: "short", day: "numeric" })));
      rk.date = day; rkSub();  // safe to repeat: it only subscribes once per day, and retries if the database wasn't ready yet
      if (MM_SOCCER[mm.lg]) { body.appendChild(el("div", "notice", "Live player rankings aren't available for soccer. Tonight's finishes show up tomorrow morning.")); return; }
      rkPollL(mm.lg, false);
      var dk = rkData(mm.lg), rows = mmPowerOnly(dk ? dk.rows : [], day, mm.lg);
      var pwT = mmPowerBar(mm.lg); if (pwT) body.appendChild(pwT);
      // until this league's live numbers arrive (or 8 seconds pass), it's loading, not empty
      var wk = mm.lg + "|" + day; mm.wait = mm.wait || {};
      // loading until this league's live check has come back (the saved copy can be an empty list from earlier)
      var lkey = day + "|" + mm.lg, checked = !!rk.live[lkey];
      if (!checked && !mm.wait[wk]) { mm.wait[wk] = Date.now(); setTimeout(function () { if (state.view === "moments") keepScroll(renderMoments); }, 15100); }
      var stillLoading = !rk.loaded || (!checked && (rk.busyK[lkey] || Date.now() - (mm.wait[wk] || 0) < 15000));
      if (!rows.length && mmPowerOn(mm.lg) && dk && dk.rows.length) { body.appendChild(el("div", "notice", gcBoard(day, mm.lg) ? "No players from the power conferences yet today. Tap All for everyone." : "Loading…")); return; }
      if (!rows.length) { body.appendChild(el("div", "notice", stillLoading ? "Loading…" : "No " + nm0 + " games have started yet today. Top performers show up here live once they do.")); return; }
      var topT = rows.slice(0, 20);
      body.appendChild(mmSec("Top performers", gamesLine(day, mm.lg, dk.live) || "Top " + topT.length));
      var tlT = el("div", "bs-list mm-top mm-cards"); var ldT = mmTags(rows, topT, mm.lg, day); topT.forEach(function (r, i) { mmPlayer(tlT, mmCard(r, i + 1, "", null, ldT), r); }); tlT.style.setProperty("--rows", Math.ceil(topT.length / 2)); body.appendChild(tlT);
      body.appendChild(mmHow(mm.lg));
      body.appendChild(el("p", "pv-at", "Live from ESPN box scores. Wild finishes show up tomorrow morning, and Claude can pick the over and underachievers when you ask."));
      return;
    }
    mmWatch(path);
    var doc = mm.docs[path], L = doc && doc.leagues && doc.leagues[mm.lg], name = MM_LGS.filter(function (o) { return o[0] === mm.lg; })[0][1];
    if (doc && doc.leagues && L && (L.see || L.none)) {  // never sit on a league with no games that night: open one that played
      var alt = mmLgs().filter(function (o) { var x = doc.leagues[o[0]]; return !(x && (x.see || x.none)); })[0];
      mm.auto = false; if (alt && alt[0] !== mm.lg) { mm.lg = alt[0]; body.textContent = ""; return mmDraw(body); }
    }
    var night = day, when = el("p", "mm-when");
    if (L && L.see) {
      // no games that night: say so, and offer a jump to the league's latest night instead of repeating it here
      when.textContent = fmtDate(day, { weekday: "long", month: "short", day: "numeric" }); body.appendChild(when);
      var nn = el("div", "notice mm-none"); nn.appendChild(el("span", null, "No " + name + " games " + (day === shiftDate(today, -1) ? "last night" : "that night") + ". "));
      var jb = el("button", "pv-get", "Go to " + fmtDate(L.see, { weekday: "short", month: "short", day: "numeric" })); jb.type = "button";
      var to = L.see; jb.addEventListener("click", function () { slideIn($("mm-body"), "r"); mmSetDate(to); });
      nn.appendChild(jb); body.appendChild(nn); return;
    }
    else when.textContent = (day === shiftDate(today, -1) ? "Last night, " : "") + fmtDate(day, { weekday: "long", month: "short", day: "numeric" });
    body.appendChild(when);
    if (doc === undefined) { body.appendChild(el("div", "notice", "Loading…")); return; }
    if (L && L.none) { body.appendChild(el("div", "notice", "No " + name + " games in the week before this night.")); return; }
    // 1. top performers: the night's ranking from the box scores (free). EPL's come from Claude's write-up.
    var sp = "standouts/" + night; if (!MM_SOCCER[mm.lg]) mmWatch(sp);
    var pwN = mmPowerBar(mm.lg); if (pwN) body.appendChild(pwN);
    var all = mmPowerOnly(MM_SOCCER[mm.lg] ? ((L && L.top) || []) : (((mm.docs[sp] || {}).leagues || {})[mm.lg] || []), night, mm.lg), top = all.slice(0, 20);
    if (!top.length && mmPowerOn(mm.lg) && !MM_SOCCER[mm.lg] && (((mm.docs[sp] || {}).leagues || {})[mm.lg] || []).length) body.appendChild(el("div", "notice", gcBoard(night, mm.lg) ? "No top performers from the power conferences this night. Tap All for everyone." : "Loading…"));
    if (top.length) {
      body.appendChild(mmSec("Top performers", gamesLine(night, mm.lg, 0) || "Top " + top.length));
      var tl = el("div", "bs-list mm-top mm-cards"), lk0 = MM_SOCCER[mm.lg] ? mmLookup(mm.lg, night) : null, ld0 = mmTags(all, top, mm.lg, night);
      top.forEach(function (r, i) { if (MM_SOCCER[mm.lg]) tl.appendChild(mmCard(r, i + 1, "", lk0)); else mmPlayer(tl, mmCard(r, i + 1, "", null, ld0), r); });
      tl.style.setProperty("--rows", Math.ceil(top.length / 2)); body.appendChild(tl);
      body.appendChild(mmHow(mm.lg));
    }
    // 2. Claude's take (over/underachievers, and its pick of the finishes): only when someone taps Write
    var wrote = !!(L && L.at);
    if (!wrote) {
      if (!L || !L.ready) {
        // not put together yet (an older night, or a league added later): build it on request, free
        var bk = day + "|" + mm.lg, req = mmBuildReq(day, mm.lg);
        var nb = el("div", "cl-ctl mm-cl");
        if (req || (MM_BUILD[bk] && Date.now() - MM_BUILD[bk] < 60000)) { var bs = el("span", "cl-busy"); bs.appendChild(el("i", "cl-dot")); bs.appendChild(el("span", null, "Building this night's Box Office… usually within 10 minutes")); nb.appendChild(bs); }
        else {
          var bb = el("button", "cl-go"); bb.type = "button"; var ri = el("span", "mm-bi"); ri.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>'; bb.appendChild(ri); bb.appendChild(el("span", "cl-l", "Build this night's Box Office")); bb.appendChild(el("span", "cl-t", "free"));
          var bd = day, blg = mm.lg; bb.addEventListener("click", function () { mmBuild(bd, blg); }); nb.appendChild(bb);
        }
        body.appendChild(nb);
      }
      else {
        var w = L.writing, box = el("div", "cl-ctl mm-cl"), busy = (w && !w.error && Date.now() - Date.parse(w.at) < 10 * 60000) || MM_ASK[path + mm.lg];
        if (busy) { var spn = el("span", "cl-busy"); spn.appendChild(el("i", "cl-dot")); spn.appendChild(el("span", null, "Claude is picking the over and underachievers… about a minute")); box.appendChild(spn); }
        else {
          if (w && w.error) box.appendChild(el("p", "pv-none cl-err", clErr(w.error)));
          var lgK = mm.lg; box.appendChild(clGoBtn("Generate over & underachievers", function () { mmAsk(day, lgK); }));
        }
        body.appendChild(box);
      }
    }
    var lk = wrote ? mmLookup(mm.lg, night) : null;
    if (wrote) { var mst = clStamp(L.at, "mm-at"); if (mst) body.appendChild(mst); }
    if (wrote && mmPowerOnly(L.over || [], night, mm.lg).length) { body.appendChild(mmSec("Overachievers", "Beat their norm")); var ol = el("div", "bs-list mm-list mm-cards"); mmPowerOnly(L.over, night, mm.lg).forEach(function (r) { ol.appendChild(mmCard(r, "▲", "over", lk)); }); ol.style.setProperty("--rows", Math.ceil(L.over.length / 2)); body.appendChild(ol); }
    if (wrote && mmPowerOnly(L.under || [], night, mm.lg).length) { body.appendChild(mmSec("Underachievers", "Off nights")); var ul = el("div", "bs-list mm-list mm-cards"); mmPowerOnly(L.under, night, mm.lg).forEach(function (r) { ul.appendChild(mmCard(r, "▼", "under", lk)); }); ul.style.setProperty("--rows", Math.ceil(L.under.length / 2)); body.appendChild(ul); }
    var fins = wrote && (L.games || []).length ? L.games : ((L && L.auto && L.auto.games) || []);
    if (fins.length) {
      body.appendChild(mmSec("Wild finishes", "Upsets and close calls"));
      var gl = el("div", "mm-list");
      fins.forEach(function (g) {
        var c = el("div", "mm-g"), top2 = el("div", "mm-gtop");
        if (g.tag) top2.appendChild(el("span", "mm-tag t-" + String(g.tag).toLowerCase(), g.tag));
        top2.appendChild(el("b", null, g.score || ((g.away || "") + " @ " + (g.home || ""))));
        c.appendChild(top2); if (g.why) c.appendChild(el("p", null, g.why)); gl.appendChild(c);
      });
      gl.style.setProperty("--rows", Math.ceil(fins.length / 2));
      body.appendChild(gl);
    }
    if (wrote) body.appendChild(el("p", "pv-at", "Over and underachievers picked by Claude from ESPN box scores. Finishes come straight from the box scores."));
    else if (fins.length) body.appendChild(el("p", "pv-at", "Top performers and finishes from ESPN box scores."));
  }
  var MM_ASK = {}, MM_BUILD = {};
  // tap a player: his game opens beneath, with the same quick look as on the slate (box score, recap or preview)
  function mmPlayer(list, row, r) {
    var k = mm.date + "|" + mm.lg + "|" + (r.id || r.name) + "|" + (r.ev || r.team + "-" + r.opp), open = mm.pick === k;
    row.classList.add("mm-tap"); if (open) row.classList.add("mm-open");
    row.addEventListener("click", function () {
      mm.pick = open ? null : k;
      if (!open) { state.openId = null; if (state.date !== mm.date) { slideDir = ""; setDate(mm.date); } }
      keepScroll(renderMoments);
    });
    list.appendChild(row);
    if (!open) return;
    var box = el("div", "mm-game");
    if (state.date !== mm.date || !games().length) { box.appendChild(el("p", "pv-none", "Loading the game…")); list.appendChild(box); return; }
    var T = String(r.team || "").toUpperCase(), O = String(r.opp || "").toUpperCase();
    var g = games().filter(function (x) { if (x.league !== mm.lg) return false; var a = abbr(x, "away").toUpperCase(), h = abbr(x, "home").toUpperCase(); return (a === T && h === O) || (a === O && h === T); })[0];
    if (!g) { box.appendChild(el("p", "pv-none", "Couldn't find this game on " + fmtDate(mm.date, { month: "short", day: "numeric" }) + "'s list.")); list.appendChild(box); return; }
    state.openId = g.id;
    box.appendChild(gameRow(g, "games"));
    list.appendChild(box);
  }
  // build requests ride in prefs/load "box" (the 10-minute job picks them up)
  function mmBuildReq(day, lg) { var r = (state.loadReq || {}).box || []; return r.some(function (x) { return x && x.date === day && x.lg === lg; }); }
  function mmBuild(day, lg) {
    if (!db) return;
    MM_BUILD[day + "|" + lg] = Date.now(); keepScroll(renderMoments);
    db.doc("prefs/load").get().then(function (sn) {
      var d = (sn.exists ? sn.data() : {}) || {}, box = (d.box || []).filter(function (x) { return x && !(x.date === day && x.lg === lg); }).slice(-20);
      box.push({ date: day, lg: lg, at: new Date().toISOString() }); d.box = box; state.loadReq = d;
      return db.doc("prefs/load").set(d);
    }).then(function () { toast("Building it now. Usually within 10 minutes."); }, function () { delete MM_BUILD[day + "|" + lg]; keepScroll(renderMoments); toast("Couldn't ask for it. Try again."); });
  }
  function mmAsk(day, lg) {
    var pass = slatePass(); if (!pass) { toast("Enter your passcode first (bottom of the page)"); return; }
    var k = "moments/" + day + lg; MM_ASK[k] = 1; keepScroll(renderMoments);
    fetch("/api/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pass: pass, kind: "moments", key: lg, date: day }) })
      .then(function (r) { return r.json().then(function (j) { return [r.status, j]; }, function () { return [r.status, {}]; }); })
      .then(function (res) { if (res[0] >= 300) { delete MM_ASK[k]; keepScroll(renderMoments); toast((res[1] && res[1].error) || "Couldn't start Claude. Try again."); } else if (res[1] && res[1].done) { delete MM_ASK[k]; keepScroll(renderMoments); toast("Claude wrote this a moment ago, so here it is"); } else setTimeout(function () { delete MM_ASK[k]; }, 15000); },
            function () { delete MM_ASK[k]; keepScroll(renderMoments); toast("Couldn't reach Slate's server. Try again."); });
  }
  function renderBest() {
    var body = $("best-body"); if (!body) return; body.textContent = "";
    if (state.view !== "best") return;
    // opens on a day with results: today once a game has a score, otherwise yesterday (unless you picked a day here)
    if (!rk.date || !rk.picked) { var dd = rkDefaultDate(); rk.picked = !!(state.scores && Object.keys(state.scores).length) || LIVE_DATE === todayInHome(); if (dd !== rk.date) { rk.date = dd; rkSub(); } }  // settles once scores are in
    var today = todayInHome(), day = rk.date;
    renderDockDay();
    var ks = rkLeagues(day), favs = state.players || [];
    if (!ks.length && !favs.length) {
      body.appendChild(el("div", "notice", !rk.loaded ? "Loading rankings…" : day === today ? "No rankings yet today. They fill in once games start." : "No rankings saved for this day."));
      return;
    }
    // the same filters as All games: your players, the leagues, then All, in your order; swipe between them
    var opts = rkOpts(ks);
    if (state.bestAuto !== false || !opts.some(function (o) { return o[0] === state.bestLeague; })) { state.bestLeague = opts[0][0]; state.bestAuto = true; }
    var strip = el("div", "strip rk-strip");
    opts.forEach(function (o) {
      var b2 = el("button", "lg-tab", o[1]); b2.type = "button"; b2.setAttribute("aria-pressed", state.bestLeague === o[0] ? "true" : "false");
      if (o[0] === "fav") b2.setAttribute("aria-label", "My players");
      b2.addEventListener("click", function () { rkPick(o[0]); });
      strip.appendChild(b2);
    });
    body.appendChild(strip);
    var lgSel = state.bestLeague;
    // inside a college league: ranked teams only
    var ranks = {};
    games().forEach(function (g) { if (g.awayRank) ranks[g.away] = g.awayRank; if (g.homeRank) ranks[g.home] = g.homeRank; });
    if (LEAGUES[lgSel] && LEAGUES[lgSel].college && day === state.date && Object.keys(ranks).length) {
      var sub = el("div", "substrip rk-sub");
      [["all", "All"], ["t25", "Ranked teams"]].forEach(function (o) {
        var b3 = el("button", "cf-tab", o[1]); b3.type = "button"; b3.setAttribute("aria-pressed", (state.bestConf || "all") === o[0] ? "true" : "false");
        b3.addEventListener("click", function () { state.bestConf = o[0]; keepScroll(renderBest); });
        sub.appendChild(b3);
      });
      body.appendChild(sub);
    } else state.bestConf = "all";
    var lv = false;
    function keep(r) { if (lv && !r.live) return false; if (state.bestConf === "t25" && !ranks[r.teamName]) return false; return true; }
    var list, data = null;
    if (lgSel === "fav") {
      var fd = rk.fav[day];
      if (!favs.length) { body.appendChild(el("div", "notice", "Star a player in the rankings or on a team page and their night shows up here.")); return; }
      if (!fd) { body.appendChild(el("div", "notice", "Finding your players' games…")); rkFavPoll(true); return; }
      list = el("div", "bs-list");
      var rows = fd.rows.filter(keep), shown = {};
      rows.forEach(function (r) { shown[r.lg + "|" + r.id] = 1; list.appendChild(bestRow(r, 0)); });
      if (!rows.length) list.appendChild(el("p", "pv-none", "None of your players " + (day === today ? "have played yet today." : "played that day.")));
      body.appendChild(list);
      var idle = lv ? [] : favs.filter(function (p) { return !shown[p.lg + "|" + p.id]; });
      if (idle.length) {
        var tonight = idle.filter(function (p) { var st = fd.status[p.lg + "|" + p.id]; return st && st.state === "pre"; });
        var off = idle.filter(function (p) { return tonight.indexOf(p) === -1; });
        [[tonight, day === today ? "Playing later" : "Later that day"], [off, day === today ? "Off today" : "Off that day"]].forEach(function (grp) {
          if (!grp[0].length) return;
          var h = el("div", "sec fp-h"); h.appendChild(el("h2", null, grp[1])); h.appendChild(el("span", "count", String(grp[0].length))); body.appendChild(h);
          var ul = el("div", "fp-list");
          grp[0].forEach(function (p) { ul.appendChild(favIdleRow(p, fd, day)); });
          body.appendChild(ul);
        });
      }
    } else if (lgSel === "all") {
      ks.forEach(function (k) {
        var dk = rkData(k), name = (LEAGUES[k] || {}).name || k, ck = "rk:" + name, shut = !!COLLAPSED[ck];
        var rs = dk ? dk.rows.filter(keep).slice(0, 10) : [];
        var sec = el("button", "sec sec-tg" + (shut ? " shut" : "")); sec.type = "button"; sec.setAttribute("aria-expanded", shut ? "false" : "true");
        sec.appendChild(el("h2", null, name)); sec.appendChild(el("span", "count", dk ? (dk.live ? dk.live + " live" : dk.games + (dk.games === 1 ? " game" : " games")) : "Loading…")); sec.appendChild(icon("more"));
        sec.addEventListener("click", function () { if (COLLAPSED[ck]) delete COLLAPSED[ck]; else COLLAPSED[ck] = 1; try { localStorage.setItem("slate-collapsed", JSON.stringify(COLLAPSED)); } catch (e) {} keepScroll(renderBest); });
        body.appendChild(sec);
        var bl = el("div", "glist bs-list");
        if (!shut) { if (rs.length) rs.forEach(function (r, i) { bl.appendChild(bestRow(r, i + 1, k)); }); else bl.appendChild(el("p", "pv-none", dk ? (lv ? "No one live right now." : "No ranked players.") : "Pulling box scores…")); }
        body.appendChild(bl);
      });
    } else {
      data = rkData();
      var rows2 = data ? data.rows.filter(keep) : [];
      if (!rows2.length) {
        var busy = window.SLATE_SELF && !rk.live[day + "|" + lgSel];
        body.appendChild(el("div", "notice", lv ? "No one is playing live in this league right now." : busy ? "Pulling box scores…" : day === today ? "No " + ((LEAGUES[lgSel] || {}).name || "") + " games have started yet." : "No " + ((LEAGUES[lgSel] || {}).name || "") + " games that day."));
        return;
      }
      list = el("div", "bs-list");
      rows2.slice(0, RK_TOP).forEach(function (r, i) { list.appendChild(bestRow(r, i + 1, lgSel)); });
      body.appendChild(list);
    }
    if (!data) { body.appendChild(el("p", "bs-foot", "Star any player to follow them under ★. Ranked by box score: basketball Game Score, hockey points, shots and goalie saves, football yards and touchdowns, baseball hits and pitching.")); return; }
    var bits = [];
    if (data.games) bits.push("From " + data.games + " " + (data.games === 1 ? "game" : "games") + (data.live ? ", " + data.live + " still going" : ""));
    if (data.src === "live" && data.live) bits.push("Updates every minute");
    else if (data.at && day === today) bits.push("Updated " + new Date(data.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    bits.push("Ranked by box score: basketball Game Score, hockey points, shots and goalie saves, football yards and touchdowns, baseball hits and pitching");
    body.appendChild(el("p", "bs-foot", bits.join(". ") + "."));
  }


  // ---------- live scores (self-hosted page only: it can reach ESPN directly) ----------
  var LIVE = {}, LIVE_DATE = null, LIVE_START = {}, LIVE_FLIP = {};
  // ESPN's home team is always shown as home. When ESPN lists a neutral-site game the other way round from
  // the loaded slate, the game is turned round (and its live scores come in ESPN's order).
  function flipKnown(id) { var k = state.date + "|" + id; if (k in LIVE_FLIP) return LIVE_FLIP[k]; var s = state.scores && state.scores[id]; return !!(s && s.flip); }
  function flipGame(g) {
    var c = {}; Object.keys(g).forEach(function (k) { if (!/^(away|home)/.test(k)) c[k] = g[k]; });
    ["away", "home"].forEach(function (s) { if (!g[s + "Abbr"]) g = Object.assign({}, g, (function () { var o = {}; o[s + "Abbr"] = abbr(g, s); return o; })()); });
    Object.keys(g).forEach(function (k) { var m = /^(away|home)(.*)$/.exec(k); if (m) c[(m[1] === "away" ? "home" : "away") + m[2]] = g[k]; });
    c._flip = true; return c;
  }
  function noteFlip(g, swapped) { var k = state.date + "|" + g.id, want = swapped ? !g._flip : !!g._flip; if (LIVE_FLIP[k] === want) return false; LIVE_FLIP[k] = want; return true; }
  // 3.130.5 (DJ: "Soccer home team should be on top or left side"): soccer lists the home side first, on top or on the left,
  // with "vs" between ("Man City vs Fulham"), the way soccer is written everywhere. Every other sport is away first, "@" before
  // the home team (3.121.12 had put soccer away first too). "vs" also marks a neutral ground in the US sports.
  // homeFirst(g) is the same rule for code that draws the two sides itself (the Lock Screen, widgets and the Board).
  function homeFirst(g) { return !!(g && SOCCER[g.league]); }
  function sideOrder(g) { return homeFirst(g) ? ["home", "away"] : ["away", "home"]; }
  function sep(g) { return homeFirst(g) || g.neutral ? " vs " : " @ "; }
  // the two sides in the order they're shown, joined: pairText(g, function (sd) { return short(g, sd); }) -> "Man City vs Fulham" /
  // "Bulls @ Knicks"; the joiner can be passed ("–", " at "): a soccer game always gets " vs " in place of " at "
  function pairText(g, f, j) { var o = sideOrder(g); j = j == null ? sep(g) : homeFirst(g) && / at | @ /.test(j) ? " vs " : j; return f(o[0]) + j + f(o[1]); }
  var LIVE_PRE = {};  // games ESPN still lists as pre-game, by id: when it was last seen that way
  function scoreRaw(id) { if (LIVE_DATE === state.date && LIVE[id]) return LIVE[id]; return state.scores && state.scores[id]; }
  var ESPN_URLS = {
    nfl: ["football/nfl"], ncaaf: ["football/college-football&groups=80&limit=500", "football/college-football&groups=81&limit=500"],
    nba: ["basketball/nba"], wnba: ["basketball/wnba"], ncaam: ["basketball/mens-college-basketball&groups=50&limit=500"],
    ncaaw: ["basketball/womens-college-basketball&groups=50&limit=500"], nhl: ["hockey/nhl"], mlb: ["baseball/mlb"],
    mls: ["soccer/usa.1"], epl: ["soccer/eng.1"], ucl: ["soccer/uefa.champions"], uel: ["soccer/uefa.europa"], laliga: ["soccer/esp.1"],
    seriea: ["soccer/ita.1"], bundesliga: ["soccer/ger.1"], ligue1: ["soccer/fra.1"], facup: ["soccer/eng.fa"],
    intl: ["soccer/fifa.friendly", "soccer/uefa.nations", "soccer/concacaf.nations.league", "soccer/uefa.euroq", "soccer/fifa.worldq.uefa", "soccer/fifa.worldq.conmebol", "soccer/fifa.worldq.concacaf", "soccer/concacaf.gold", "soccer/conmebol.america", "soccer/fifa.world"]
  };
  function etHour(ms) { return +new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(new Date(ms)) || 0; }
  function etDate(ms) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms)).replace(/-/g, ""); }
  var livePolling = false;
  var LIVE_AT = {};
  // "Updated 7:24 PM" beside the Live button; "Scores delayed" once a minute passes with no new scores
  function freshness() {
    var u = $("lo-upd"); if (!u) return;
    var t = state.liveAt ? new Date(state.liveAt) : null, late = !t || Date.now() - t.getTime() > 60000;
    u.textContent = !t ? "" : late ? "Scores delayed." : "Scores updated " + t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + ".";
    u.classList.toggle("late", !!t && late);
  }
  setInterval(freshness, 15000);
  // football: which side has the ball ("away"/"home"), for the football on the game cards (3.194.0). Not at halftime or between
  // quarters' breaks when ESPN still names a team, and not once the game is over
  function livePos(c, A, H, st) {
    var x = c.situation; if (!x || !x.possession) return "";
    if (st.state !== "in" || /half|end of/i.test(String(st.shortDetail || st.detail || ""))) return "";
    var p = String(x.possession);
    return String((A.team || {}).id) === p ? "away" : String((H.team || {}).id) === p ? "home" : "";
  }
  // the game's stat leaders from the scoreboard (points, goals, yards), for "someone's having a night" suggestions
  // football: who has the ball and where ("UCLA ball, 3rd & 4 at ILL 35"), from ESPN's scoreboard
  function liveSit(c) {
    var x = c.situation; if (!x || !x.possession) return "";
    var tm = ""; (c.competitors || []).forEach(function (k) { if (String((k.team || {}).id) === String(x.possession)) tm = (k.team || {}).abbreviation || ""; });
    var where = x.downDistanceText || x.possessionText || "", other = "";
    (c.competitors || []).forEach(function (k) { if (String((k.team || {}).id) !== String(x.possession)) other = (k.team || {}).abbreviation || ""; });
    if (!where && x.yardLine > 0 && x.yardLine < 100) {  // during a timeout ESPN drops the text: work it out (yardLine counts from the home team's goal line)
      var hab = "", aab = ""; (c.competitors || []).forEach(function (k) { if (k.homeAway === "home") hab = (k.team || {}).abbreviation || ""; else aab = (k.team || {}).abbreviation || ""; });
      var y = Number(x.yardLine), spot = y === 50 ? "midfield" : y < 50 ? hab + " " + y : aab + " " + (100 - y);
      var ordn = ["", "1st", "2nd", "3rd", "4th"][x.down] || "";
      where = (ordn && x.distance ? ordn + " & " + x.distance + " at " : "at ") + spot;
    }
    if (!tm) return "";
    return tm + " ball" + (where ? ", " + where : "") + (x.isRedZone ? " (red zone)" : "");
  }
  // basketball: the game's top scorer ("SGA 35 pts")
  function liveTopScorer(v) {
    var best = null; (v.ld || []).forEach(function (L) { if (L.c === "points") { var pts = L.v || Number(L.d) || 0; if (!best || pts > best.p) best = { n: L.n, p: pts }; } });
    return best && best.p ? best.n + " " + best.p + " pts" : "";
  }
  // a finished game in Worth a look: what you'd want at a glance. Top scorers right away; a game-winner once the plays load.
  var WAL_FIN = {};
  function walFinalLine(g) {
    var v = scoreRaw(g.id) || {}, sp = BX_SPORT[g.league], ld = v.ld || [], f = WAL_FIN[g.id];
    if (f && f.gw) return f.gw;
    if (!f && bxBase(g.league)) {
      WAL_FIN[g.id] = { busy: 1 };
      bxFindEvent(g).then(function (ev) { return ev ? rkFetch(bxSummaryUrl(g.league, ev)) : null; }).then(function (sum) {
        var gw = sum ? gameWinner(sum, g, v) : ""; WAL_FIN[g.id] = { gw: gw }; if (gw && state.view === "lineup") keepScroll(renderLineup);
      }, function () { WAL_FIN[g.id] = { gw: "" }; });
    }
    var pick = function (rx, n) { return ld.filter(function (L) { return rx.test(L.c); }).sort(function (a, b) { return (b.v || 0) - (a.v || 0); }).slice(0, n); };
    if (sp === "bball") { var t = pick(/^points$/, 2); if (t.length) return "Top scorers: " + t.map(function (L) { return (L.full || L.n) + " " + (L.v || L.d); }).join(", "); }
    if (sp === "football") { var q = pick(/^(passingYards|rushingYards|receivingYards)$/, 2); if (q.length) return q.map(function (L) { var y = (/(\d+) YDS/.exec(L.d) || [])[1] || L.v, td = (/(\d+) TD/.exec(L.d) || [])[1]; return (L.full || L.n) + " " + y + (L.c === "passingYards" ? " passing" : L.c === "rushingYards" ? " rushing" : " receiving") + " yds" + (td ? ", " + td + " TD" : ""); }).join("; "); }
    if (sp === "hockey" || sp === "soccer") { var gl = pick(/^goals$/, 2).filter(function (L) { return (L.v || Number(L.d)) > 0; }); if (gl.length) return "Goals: " + gl.map(function (L) { return (L.full || L.n) + (Number(L.v || L.d) > 1 ? " " + (L.v || L.d) : ""); }).join(", "); }
    return "";
  }
  // the play that put the winner ahead for good, if it came at the very end (or in overtime)
  function gameWinner(sum, g, v) {
    var sp = BX_SPORT[g.league], list = (sum.scoringPlays || []).length ? sum.scoringPlays : (sum.plays || []).filter(function (p) { return p.scoringPlay; });
    if (!list.length || v.a === v.h) return "";
    var aWin = v.a > v.h, lead = function (p) { return aWin ? Number(p.awayScore) > Number(p.homeScore) : Number(p.homeScore) > Number(p.awayScore); };
    var go = null, prevLead = false;
    list.forEach(function (p) { var l = lead(p); if (l && !prevLead) go = p; prevLead = l; });
    if (!go || !prevLead) return "";
    var per = Number((go.period || {}).number) || 0, clk = Number((go.clock || {}).value), cdv = String((go.clock || {}).displayValue || ""), mins = parseInt(String((go.clock || {}).displayValue || ""), 10) || 0;
    if (!isFinite(clk)) { var cm = /^(\d+):(\d+)/.exec(cdv); clk = cm ? Number(cm[1]) * 60 + Number(cm[2]) : /^\d+(\.\d+)?$/.test(cdv) ? Number(cdv) : NaN; }
    var coll = (LEAGUES[g.league] || {}).college && g.league !== "ncaaw", reg = sp === "bball" ? (coll ? 2 : 4) : sp === "football" ? 4 : sp === "hockey" ? 3 : 2;
    var late = sp === "bball" ? per >= reg && clk <= 15 : per > reg || (per === reg && (sp === "bball" ? clk <= 15 : sp === "football" ? clk <= 120 : sp === "hockey" ? clk <= 120 : mins >= 85));
    if (!late) return "";
    var tx = String(go.text || "").replace(/\s*\(.*?\)\s*$/, "").trim(); if (!tx) return "";
    return "Game-winner: " + (tx.length > 90 ? tx.slice(0, 88) + "…" : tx) + (per > reg ? " (OT)" : "");
  }
  // a live game's standout so far, from the scoreboard's leaders ("A. Flora 126 rush yds, 3 TD"); only once someone has scored
  function liveLeadLine(g) {
    var v = scoreRaw(g.id); if (!v || v.state !== "in" || !state.showScores || ((v.a || 0) + (v.h || 0)) === 0) return "";
    var sp = BX_SPORT[g.league], ld = v.ld || [], top = function (rx) { return ld.filter(function (L) { return rx.test(L.c); }).sort(function (a, b) { return (b.v || 0) - (a.v || 0); })[0]; };
    if (sp === "bball") { var t = top(/^points$/); return t ? (t.full || t.n) + " has " + (t.v || t.d) + " points" : ""; }
    if (sp === "football") {
      var cand = ld.filter(function (L) { return /^(passing|rushing|receiving)Yards$/.test(L.c); }).map(function (L) { var y = Number((/(\d+) YDS/.exec(L.d) || [])[1]) || L.v || 0, td = Number((/(\d+) TD/.exec(L.d) || [])[1]) || 0; return { L: L, y: y, td: td, w: y * (L.c === "passingYards" ? 0.5 : 1) + td * 25 }; }).sort(function (a, b) { return b.w - a.w; })[0];
      return cand && cand.y ? (cand.L.full || cand.L.n) + " " + cand.y + (cand.L.c === "passingYards" ? " passing" : cand.L.c === "rushingYards" ? " rushing" : " receiving") + " yds" + (cand.td ? ", " + cand.td + " TD" : "") : "";
    }
    // hockey and soccer: never "Own Goal scored" (3.60.2): an own goal is no one's standout
    if (sp === "hockey" || sp === "soccer") { ld = ld.filter(function (L) { return (L.full || L.n) && !/own goal/i.test(L.full || L.n); }); var gl = top(/^goals$/); return gl && Number(gl.v || gl.d) > 0 ? (gl.full || gl.n) + (Number(gl.v || gl.d) > 1 ? " has " + (gl.v || gl.d) + " goals" : " scored") : ""; }
    return "";
  }
  function liveLeaders(c) {
    var tAb = {}; (c.competitors || []).forEach(function (k) { var t0 = k.team || {}; tAb[String(t0.id)] = t0.abbreviation || ""; });
    var out = [], take = function (L, tm) { var x = (L.leaders || [])[0]; if (!x || !x.athlete) return; tm = tm || tAb[String((x.team || {}).id || ((x.athlete.team || {}).id) || "")] || ""; out.push({ c: L.name, n: x.athlete.shortName || x.athlete.displayName || "", full: x.athlete.displayName || "", d: String(x.displayValue || ""), v: Number(x.value) || 0, t: tm }); };
    (c.leaders || []).forEach(function (L) { take(L, ""); });
    (c.competitors || []).forEach(function (k) { var tm = (k.team || {}).abbreviation || ""; (k.leaders || []).forEach(function (L) { if (/^(points|goals|rating)$/.test(L.name)) take(L, tm); }); });
    return out.slice(0, 8);
  }
  // 3.120.x: team records stay current inside the app. ESPN's scoreboard carries each team's record as of now, so every
  // scoreboard the app reads (live scores, plus one light check per league and day) updates the cards' records.
  // Keyed by league and team, so a record learned from Wednesday's final also fixes Saturday's card.
  var REC_NOW = {}, REC_AT = {};
  function recKey(lg, name) { return lg + "|" + String(name || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function recLearn(lg, evs) {
    var changed = false;
    (evs || []).forEach(function (e) { ((e.competitions && e.competitions[0] || {}).competitors || []).forEach(function (k) {
      var tm = k.team || {}, r = ((k.records || [])[0] || {}).summary;   // the same record the slate is built from (slates.py)
      if (!tm.displayName || !r || !/^\d+(-\d+)+$/.test(r)) return;
      var key = recKey(lg, tm.displayName); if (REC_NOW[key] !== r) { REC_NOW[key] = r; changed = true; }
    }); });
    return changed;
  }
  // put the newest records on a game (games() calls this for every game it hands out)
  function recApply(g) {
    ["away", "home"].forEach(function (sd) { var r = REC_NOW[recKey(g.league, g[sd])]; if (r && g[sd + "Record"] !== r) g[sd + "Record"] = r; });
  }
  // one scoreboard per league and day shown, at most every 30 minutes, never retried on failure; the page redraws
  // only if a record actually changed, and that redraw waits for the finger to lift (liveRender)
  var recSweeping = false;
  function recSweep() {
    if (recSweeping || document.hidden || !state.date) return;
    var now = Date.now(), want = {};
    games().forEach(function (g) {
      if (g.custom || !ESPN_URLS[g.league]) return; var t = new Date(g.moved || g.start).getTime(); if (isNaN(t)) return;
      var k = g.league + "|" + etDate(t); if (now - (REC_AT[k] || 0) > 30 * 60000) want[k] = 1;
    });
    var reqs = []; Object.keys(want).slice(0, 6).forEach(function (k) {
      REC_AT[k] = now; var lg = k.split("|")[0], d = k.split("|")[1];
      ESPN_URLS[lg].forEach(function (u) { var parts = u.split("&"); reqs.push({ lg: lg, url: "https://site.api.espn.com/apis/site/v2/sports/" + parts[0] + "/scoreboard?dates=" + d + (parts.length > 1 ? "&" + parts.slice(1).join("&") : "") }); });
    });
    if (!reqs.length) return;
    recSweeping = true;
    Promise.all(reqs.map(function (r) { return fetch(r.url).then(function (x) { return x.ok ? x.json() : null; }).then(function (j) { return { lg: r.lg, j: j }; }, function () { return { lg: r.lg, j: null }; }); })).then(function (res) {
      recSweeping = false; var changed = false;
      res.forEach(function (r) { if (r.j && recLearn(r.lg, r.j.events)) changed = true; });
      if (changed) liveRender();
    }, function () { recSweeping = false; });
  }
  function livePoll() {
    try { laSlateWidget(); } catch (e) {}
    try { laBetsShare(); } catch (e) {}
    try { laLogos(); } catch (e) {}  // 3.113.0: also unfolded, so the widget and live notifications always have the slate's logos
    if (panesOn()) return;  // 3.80.0: unfolded, the two panes each keep their own scores; the page behind them rests
    if (window.SLATE_SELF) { try { recSweep(); } catch (e) {} }
    if (!window.SLATE_SELF || livePolling || document.hidden || !state.date) return;
    if (LIVE_DATE !== state.date) LIVE_AT = {};
    // how often each league is checked: every 10 seconds while a slate game is live or about to start,
    // every minute while any other game is live, every 5 minutes otherwise (start-time changes)
    var now = Date.now(), need = {}, list = games(), every = {}, slate = state.slateSet || {};
    list.forEach(function (g) {
      var t = new Date(g.moved || g.start).getTime(); if (isNaN(t) || !ESPN_URLS[g.league]) return;
      var s = scoreRaw(g.id);
      // a game we last saw in progress keeps being checked until ESPN calls it final (a late game left open overnight
      // used to stay "4th quarter" forever once it was 8 hours past its start)
      var stale = s && s.state === "in" && now < t + 36 * 3600000;
      if ((t <= now + 3 * 3600000 && now < t + 8 * 3600000 || stale) && !(s && s.state === "post")) {
        var live = (s && s.state === "in") || (t <= now && now < t + 4 * 3600000);
        var gap = (slate[g.id] || hasFav(g)) && (live || t - now < 10 * 60000) ? 10000 : live ? 60000 : 300000;
        every[g.league] = Math.min(every[g.league] || 1e9, gap);
        need[g.league] = need[g.league] || {}; need[g.league][etDate(t)] = 1;
        if (etHour(t) < 6) need[g.league][etDate(t - 86400000)] = 1;  // 3.141.3: a game after midnight Eastern sits on ESPN's list for the evening before
      }
    });
    Object.keys(need).forEach(function (lg) { if (now - (LIVE_AT[lg] || 0) < every[lg] - 2000) delete need[lg]; else LIVE_AT[lg] = now; });
    var reqs = [];
    Object.keys(need).forEach(function (lg) { Object.keys(need[lg]).forEach(function (d) { ESPN_URLS[lg].forEach(function (u) {
      var parts = u.split("&"), url = "https://site.api.espn.com/apis/site/v2/sports/" + parts[0] + "/scoreboard?dates=" + d + (parts.length > 1 ? "&" + parts.slice(1).join("&") : "");
      reqs.push({ lg: lg, url: url });
    }); }); });
    if (!reqs.length) return;
    livePolling = true; var forDate = state.date;
    Promise.all(reqs.map(function (r) { return fetch(r.url, { cache: "no-store" }).then(function (x) { return x.ok ? x.json() : null; }).then(function (j) { return { lg: r.lg, j: j }; }, function () { return { lg: r.lg, j: null }; }); })).then(function (res) {
      livePolling = false; if (forDate !== state.date) return;
      if (LIVE_DATE !== forDate) { LIVE = {}; LIVE_START = {}; LIVE_DATE = forDate; }
      var changed = false, norm = function (x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
      res.forEach(function (r) {
        var evs = r.j && r.j.events || [];
        if (recLearn(r.lg, evs)) changed = true;
        evs.forEach(function (e) { ((e.competitions && e.competitions[0] || {}).competitors || []).forEach(function (k) { var tm = k.team || {}; if (logoNote(tm.displayName, tm.logo, tm.color, tm.alternateColor)) changed = true; }); });   // team logos ride along with the scores
        list.forEach(function (g) {
          if (g.league !== r.lg) return;
          var t = new Date(g.start).getTime();
          for (var i = 0; i < evs.length; i++) {
            var e = evs[i], c = e.competitions && e.competitions[0]; if (!c) continue;
            if (Math.abs(new Date(e.date).getTime() - new Date(g.moved || g.start).getTime()) > 3 * 3600000) continue;
            var A = null, H = null; (c.competitors || []).forEach(function (k) { if (k.homeAway === "home") H = k; else A = k; });
            if (!A || !H) continue;
            var ok = function (k, side) { var tm = k.team || {}; return norm(tm.displayName) === norm(g[side]) || (!!g[side + "Abbr"] && norm(tm.abbreviation) === norm(g[side + "Abbr"])); };
            // neutral sites: ESPN sometimes lists the two teams the other way round; ESPN's order wins
            if (ok(A, "away") && ok(H, "home")) { if (noteFlip(g, false)) changed = true; }
            else if (ok(H, "away") && ok(A, "home")) { if (noteFlip(g, true)) changed = true; }
            else continue;
            var st = (c.status || e.status || {}).type || {};
            var es = new Date(e.date).toISOString().replace(".000Z", "Z");
            if (st.state === "pre") { if (!LIVE_PRE[g.id]) changed = true; LIVE_PRE[g.id] = Date.now(); if (Math.abs(new Date(e.date) - new Date(g.moved || g.start)) >= 60000) { if (LIVE_START[g.id] !== es) { LIVE_START[g.id] = es; changed = true; } } else if (LIVE_START[g.id]) { delete LIVE_START[g.id]; changed = true; } break; }
            if (LIVE_PRE[g.id]) { delete LIVE_PRE[g.id]; changed = true; }
            if (st.state !== "in" && st.state !== "post") break;
            var v = { a: Number(A.score), h: Number(H.score), state: st.state, detail: st.shortDetail || st.detail || "", live: true, p: Number((c.status || e.status || {}).period) || 0, ck: Number((c.status || e.status || {}).clock) || 0, ld: liveLeaders(c), sit: liveSit(c), pos: livePos(c, A, H, st) };
            var old = LIVE[g.id];
            if (v.state === "post" && (!old || old.state !== "post")) REC_AT[g.league + "|" + etDate(new Date(e.date).getTime())] = Date.now() - 25 * 60000;   // records once ESPN has counted it
            if (!old || old.a !== v.a || old.h !== v.h || old.state !== v.state || old.detail !== v.detail || old.sit !== v.sit || old.pos !== v.pos) { LIVE[g.id] = v; changed = true; }
            break;
          }
        });
      });
      state.liveAt = new Date().toISOString();
      if (changed) liveRender(); else freshness();
    }, function () { livePolling = false; });
  }
  // 3.95.1 (speed): a score update waits while a finger is on the screen or the page is still moving, so a redraw
  // never lands in the middle of a tap or a swipe; it goes through within 1.5s of letting go (at most 20s late)
  var liveTouchAt = 0, liveRenderT = null, liveWaitFrom = 0;
  ["pointerdown", "touchstart", "touchmove", "wheel", "scroll"].forEach(function (t) { window.addEventListener(t, function () { liveTouchAt = Date.now(); }, { capture: true, passive: true }); });
  function liveRender() {
    clearTimeout(liveRenderT); if (!liveWaitFrom) liveWaitFrom = Date.now();
    var quiet = Date.now() - liveTouchAt;
    if (quiet < 1500 && Date.now() - liveWaitFrom < 20000) { liveRenderT = setTimeout(liveRender, 1500 - quiet + 50); return; }
    liveWaitFrom = 0; render();
  }
  if (window.SLATE_SELF) {
    setInterval(livePoll, 10000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { LIVE_AT = {}; livePoll(); } });
  }
  function scoreOf(g) { var s = scoreRaw(g.id); return s && (s.state === "in" || s.state === "post") ? s : null; }
  function status(g) {
    var sc = scoreRaw(g.id);
    if (sc && sc.state === "post") return { kind: "over", final: true };
    if (sc && sc.state === "in") return { kind: "live" };
    var start = new Date(g.start).getTime(); if (isNaN(start)) return { kind: "tbd" };
    var now = Date.now();
    if (now < start) return { kind: "upcoming", ms: start - now };
    // 3.71.4: past its start time but ESPN still has it pre-game (a late tip, a delay): not live yet (it used to say Live with no score)
    if (LIVE_PRE[g.id] && now - LIVE_PRE[g.id] < 6 * 60000 && now < start + 3 * 3600000) return { kind: "upcoming", ms: 0, late: true };
    if (now < start + info(g).hrs * 3600000) return { kind: "live" };
    return { kind: "over" };
  }
  function until(ms) { var m = Math.max(1, Math.round(ms / 60000)); return { h: Math.floor(m / 60), m: m % 60 }; }
  // college favorites are per sport: "Dayton Flyers (Men's basketball)". A bare college name still means every sport.
  var COL_SPORT = { ncaam: "Men's basketball", ncaaw: "Women's basketball", ncaaf: "Football" };
  var COL_KEYS = ["ncaam", "ncaaw", "ncaaf"];
  function parseTeam(t) {
    var m = /^(.*?)\s*\((Men's basketball|Women's basketball|Football)\)$/.exec(String(t || "").trim());
    if (!m) return { name: String(t || "").trim(), lg: "" };
    var lg = ""; COL_KEYS.forEach(function (k) { if (COL_SPORT[k] === m[2]) lg = k; });
    return { name: m[1], lg: lg };
  }
  function colEntry(name, lg) { return COL_SPORT[lg] ? name + " (" + COL_SPORT[lg] + ")" : name; }
  function teamMatch(name, t, lg) {
    var p = parseTeam(t); name = (name || "").toLowerCase(); var tn = p.name.toLowerCase();
    if (!tn || !(name === tn || name.indexOf(tn) !== -1)) return false;
    return !(p.lg && lg && p.lg !== lg);
  }
  function isFav(name, lg) { return !!name && state.teams.some(function (t) { return teamMatch(name, t, lg); }); }
  function hasFav(g) { return isFav(g.away, g.league) || isFav(g.home, g.league); }
  // A game's notifications, one game at a time (3.21.0; two switches since 3.23.0). Settings > Notifications decides by default
  // (your slate, your teams); a game's tray has two switches that set it for that game alone:
  //   Live notification: liveAct.games[id] = 1 or 0. Its score on the Lock Screen and in the Dynamic Island (a finished game: its final)
  //   Game alerts:       alerts.games[id] = 1 or 0. Game starting, Close finish, Overtime, Final, Goals
  // The small gray bell on a slate card means at least one is on; tapping it turns both off for that game. The server reads both.
  function liveDefault(g) { if (status(g).kind === "over") return false; var la = state.notify.liveAct || {}; return !!((la.lineup && inLineup(g.id)) || (la.myTeams && hasFav(g))); }
  function alertsDefault(g) {
    var n = state.notify, sl = inLineup(g.id), fv = hasFav(g);
    if (n.enabled === false || status(g).kind === "over") return false;
    function pick(o) { return !!o && !!((o.lineup && sl) || (o.myTeams && fv)); }
    return pick(n.reminders) || pick(n.close) || pick(n.ot) || pick(n.finals) || (fv && !!((n.goals || {}).myTeams || (n.live || {}).myTeams));
  }
  function perGame(kind) {
    var n = state.notify, o = kind === "live" ? (n.liveAct = n.liveAct || {}) : (n.alerts = n.alerts || {});
    if (!o.games || typeof o.games !== "object") o.games = {};
    return o.games;
  }
  // in the iPhone app, a game that's on or over shows its switch exactly as the phone does: on only while its live
  // notification is actually on the Lock Screen (the app reports which ones are). Upcoming games show the setting.
  function liveOn(g) {
    var k = status(g).kind;
    if (state.liveShowing && (k === "live" || k === "over")) return !!state.liveShowing[g.id];
    var v = perGame("live")[g.id]; return v === 1 ? true : v === 0 ? false : liveDefault(g);
  }
  function alertsOn(g) { var v = perGame("alerts")[g.id]; return v === 1 ? true : v === 0 ? false : alertsDefault(g); }
  function notifyAny(g) { return liveOn(g) || alertsOn(g); }
  // only in the iPhone app (live notifications need it) and for your own profile
  function liveCtl(g) { return !!NATIVE && state.isOwner && state.notifyLoaded; }
  function setPer(kind, g, on) {
    var m = perGame(kind), def = kind === "live" ? liveDefault(g) : alertsDefault(g);
    // back to the default: the settings decide again. A finished game's live notification switched off stays written, so its final comes down.
    if (on === def && !(kind === "live" && !on && status(g).kind === "over")) delete m[g.id]; else m[g.id] = on ? 1 : 0;
    var ks = Object.keys(m); if (ks.length > 80) ks.sort().slice(0, ks.length - 80).forEach(function (k) { delete m[k]; });  // oldest games go
  }
  function undoPer(g) {
    var l = perGame("live")[g.id], al = perGame("alerts")[g.id];
    return function () {
      var ml = perGame("live"), ma = perGame("alerts");
      if (l === undefined) delete ml[g.id]; else ml[g.id] = l;
      if (al === undefined) delete ma[g.id]; else ma[g.id] = al;
      saveNotify(); render();
    };
  }
  // ---- live notifications started and ended right on the phone (3.23.2) ----
  // Switching one on asks the app to put it on the Lock Screen at once (the server takes it over and keeps it current
  // within a minute); switching it off takes it down at once. The same for the live scoreboard.
  // 3.68.0 (DJ): the live notification's header, "Slate • CBB", with short league codes
  var LA_LG = { nfl: "NFL", ncaaf: "CFB", nba: "NBA", wnba: "WNBA", ncaam: "CBB", ncaaw: "WCBB", nhl: "NHL", mlb: "MLB", mls: "MLS",
    epl: "EPL", ucl: "UCL", uel: "UEL", laliga: "LaLiga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1", facup: "FA Cup", intl: "Intl" };
  function laHex(c) { var m = /^#?([0-9a-f]{6})$/i.exec(String(c || "").trim()); return m ? "#" + m[1].toUpperCase() : ""; }
  // 3.130.5 (DJ): the iPhone draws the "away" fields first (left, or on top), so soccer goes out with the two sides swapped: the home
  // team in the away fields, with its score, logo, colors and the bet's side. Slate's server does the same (worker/alerts.js laFlip).
  var LA_PAIRS = [["away", "home"], ["awayAbbr", "homeAbbr"], ["awayColor", "homeColor"], ["awayAlt", "homeAlt"], ["awayRank", "homeRank"], ["awayLogo", "homeLogo"], ["a", "h"], ["ap", "hp"], ["at", "ht"]];
  function laFlip(o) {
    var out = {}, sw = { away: "home", home: "away" }; Object.keys(o).forEach(function (k) { out[k] = o[k]; });
    LA_PAIRS.forEach(function (pr) { delete out[pr[0]]; delete out[pr[1]]; if (o[pr[1]] !== undefined) out[pr[0]] = o[pr[1]]; if (o[pr[0]] !== undefined) out[pr[1]] = o[pr[0]]; });
    if (sw[o.poss]) out.poss = sw[o.poss];
    if (o.bet && sw[o.bet.sd]) { out.bet = {}; Object.keys(o.bet).forEach(function (k) { out.bet[k] = o.bet[k]; }); out.bet.sd = sw[o.bet.sd]; }
    return out;
  }
  function laAttrsOf(g) { var at = laAttrs0(g); return homeFirst(g) ? laFlip(at) : at; }
  function laAttrs0(g) {
    var at = { gameId: g.id, league: "Slate • " + (LA_LG[g.league] || info(g).name), away: short(g, "away") || g.away || "", home: short(g, "home") || g.home || "",
      awayAbbr: abbr(g, "away"), homeAbbr: abbr(g, "home"), awayColor: laHex(g.awayColor), homeColor: laHex(g.homeColor),
      awayAlt: laHex(g.awayAlt), homeAlt: laHex(g.homeAlt), channel: String((g.tv || [])[0] || "") };
    ["away", "home"].forEach(function (sd) { var r = Number(g[sd + "Rank"]); if ((LEAGUES[g.league] || {}).college && Number.isInteger(r) && r > 0 && r < 26) at[sd + "Rank"] = r; });
    // 3.67.0: the team's ESPN logo ("nba/bos.png"), drawn in place of the chip once the app has saved it
    ["away", "home"].forEach(function (sd) { var lg = laLogo(g, sd); if (lg) at[sd + "Logo"] = lg; });
    // 3.112.0: your bet on this game (My bets), shown on the live card with how it's doing; builds before 3.112.0 ignore it
    var bt = laBetOf(g); if (bt) at.bet = bt;
    return at;
  }
  // the first of today's bets on the game, small enough for a live notification: the label ("DUKE -3.5", "Over 145.5")
  // and what the iPhone needs to work out "covering by 2.5" from the score (props show the label only)
  function laBetOf(g) {
    try {
      if (typeof mybFor !== "function") return null;
      var b = mybFor(g)[0]; if (!b) return null;
      var out = { l: String(mybLabel(b, g) || "").slice(0, 40), k: String(b.kind || "") };
      if (!out.l) return null;
      if (b.sd) out.sd = String(b.sd); if (b.ou) out.ou = String(b.ou);
      var ln = Number(b.line); if (b.line != null && b.line !== "" && isFinite(ln)) out.ln = ln;
      if (b.kind === "ml" && typeof SOCCER !== "undefined" && SOCCER[b.lg || g.league]) out.d3 = true;
      return out;
    } catch (e) { return null; }
  }
  // 3.112.0: today's bets by game, shared with Slate's server (prefs/livebets) so a live notification it starts by
  // itself shows the bet too. Sent once per change.
  var laBetsSent = "";
  function laBetsShare() {
    if (!db || !uid || !state.isOwner || state.date !== todayInHome()) return;
    var bets = {}; games().forEach(function (g) { var bt = laBetOf(g); if (bt) bets[g.id] = bt; });
    var k = state.date + JSON.stringify(bets); if (k === laBetsSent || (!laBetsSent && !Object.keys(bets).length)) return;
    laBetsSent = k;
    db.doc("prefs/livebets").set({ date: state.date, bets: bets, updatedAt: new Date().toISOString() }).then(null, function () { laBetsSent = ""; });
  }
  // 3.112.0: the Tonight's slate widget on the iPhone home screen. The app saves this list for the widget, which shows
  // the next games that haven't finished, plus finals from the last 30 minutes (3.113.0).
  // Sent once per change; builds before 3.112.0 ignore it.
  var laSlateSent = "", laEnds = null;
  // 3.113.0 (DJ): a finished game stays on the widget 30 minutes after it ends. ESPN gives no end time, so the app notes
  // when it sees a game it had seen live go final (kept for the day, so a restart doesn't reset it). A game that was
  // already final when the app first saw it has no end time and is left off.
  function laEndOf(g, st, now) {
    if (!laEnds || laEnds.date !== state.date) {
      laEnds = null; try { laEnds = JSON.parse(localStorage.getItem("slate.widgetEnds") || "null"); } catch (e) {}
      if (!laEnds || laEnds.date !== state.date) laEnds = { date: state.date, live: {}, end: {} };
    }
    var id = String(g.id), ch = false;
    if (st === "in" && !laEnds.live[id]) { laEnds.live[id] = 1; ch = true; }
    if (st === "post" && laEnds.live[id] && !laEnds.end[id]) { laEnds.end[id] = now; ch = true; }
    if (ch) try { localStorage.setItem("slate.widgetEnds", JSON.stringify(laEnds)); } catch (e) {}
    return st === "post" ? laEnds.end[id] || 0 : 0;
  }
  function laSlateWidget() {
    if (!NATIVE || state.date !== todayInHome() || !state.slateIds) return;
    var byId = {}; games().forEach(function (g) { byId[g.id] = g; });
    var now = Math.floor(Date.now() / 1000);
    var list = state.slateIds.map(function (id) { return byId[id]; }).filter(Boolean).map(function (g) {
      var at = laAttrsOf(g), s = laStateOf(g), kick = new Date(g.moved || g.start).getTime(), end = laEndOf(g, String(s.state), now);
      var o = { id: String(g.id), aa: String(at.awayAbbr || ""), ha: String(at.homeAbbr || ""), ac: String(at.awayColor || ""), hc: String(at.homeColor || ""), ax: String(at.awayAlt || ""), hx: String(at.homeAlt || ""),
        a: Math.round(Number(s.a)) || 0, h: Math.round(Number(s.h)) || 0, d: String(s.detail || "").slice(0, 24), s: String(s.state) };
      if (at.awayLogo) o.al = at.awayLogo; if (at.homeLogo) o.hl = at.homeLogo;
      if (kick > 0) o.t = Math.floor(kick / 1000); if (at.channel) o.tv = String(at.channel).slice(0, 16);
      if (end) o.e = end;
      o.r = state.slateIds.indexOf(g.id);   // the slate's own order (your teams and the best games first): which live game leads
      // 3.120.0, for the Apple Watch app: the league, the standout line, your bet, and the ESPN scoreboard the Watch
      // refreshes the score from by itself (builds before 3.120.0 ignore these)
      o.lg = String(at.league || "").replace(/^Slate • /, "").slice(0, 20);
      if (s.line) o.st = String(s.line).slice(0, 60);
      var bt = laBetOf(g); if (bt && bt.l) o.bl = bt.l;
      var eu = (ESPN_URLS[g.league] || [])[0]; if (eu && kick > 0) { var ep = eu.split("&");
        o.u = ("https://site.api.espn.com/apis/site/v2/sports/" + ep[0] + "/scoreboard?dates=" + etDate(kick) + (ep.length > 1 ? "&" + ep.slice(1).join("&") : "")).slice(0, 240); }
      return o;
      // finals more than 30 minutes old leave the list, so the twelve sent are the ones the widget can still show
    }).filter(function (o) { return o.s !== "post" || (o.e && now - o.e < 1800); })
      .sort(function (p, q) { return (p.t || 0) - (q.t || 0); }).slice(0, 12);
    var k = JSON.stringify(list); if (k === laSlateSent) return;
    laSlateSent = k; nativePost({ t: "slate", date: state.date, at: Math.floor(Date.now() / 1000), games: list });
  }
  // the game's own logo first (national teams and anyone ESPN's team lists miss), then the team lookup
  function laLogo(g, sd) { try { var own = logoSeg(g[sd + "Logo"]); if (own) return own; var t = teamLook(g[sd]); return t && t[0] ? String(t[0]) : ""; } catch (e) { return ""; } }
  // 3.67.0: tell the iPhone app which logos today's games use, so it can save them for live notifications
  // (a live notification can't download a picture itself). Sent once per change; builds before 3.67.0 ignore it.
  // DJ (Nov 26): the Dynamic Island sometimes showed the old color chips instead of logos. The app saves at most 300
  // logos per message, picked in no order, so on a big day (every college game) some of the games you follow never got
  // theirs, and a logo that failed to download waited for the next change. Now: your slate's games first, then the rest
  // of the day, in batches of 200; the whole list again every 30 minutes (the app skips logos it saved this week).
  var laLogosSent = "", laLogosAt = 0;
  function laLogos() {
    if (!NATIVE || state.date !== todayInHome()) return;
    var mine = {}; (state.slateIds || []).forEach(function (id) { mine[String(id)] = 1; });
    var gs = games().slice().sort(function (p, q) { return (mine[String(q.id)] ? 1 : 0) - (mine[String(p.id)] ? 1 : 0) || byStart(p, q); });
    var segs = {}, list = [];
    gs.forEach(function (g) { ["away", "home"].forEach(function (sd) { var lg = laLogo(g, sd); if (lg && !segs[lg]) { segs[lg] = 1; list.push(lg); } }); });
    var k = list.slice().sort().join(","), now = Date.now();
    if (!list.length || (k === laLogosSent && now - laLogosAt < 30 * 60000)) return;
    laLogosSent = k; laLogosAt = now;
    for (var i = 0; i < list.length; i += 200) (function (part, wait) { setTimeout(function () { nativePost({ t: "logos", segs: part }); }, wait); })(list.slice(i, i + 200), (i / 200) * 3000);
  }
  function laStateOf(g) { var st = laState0(g); return homeFirst(g) ? laFlip(st) : st; }
  function laState0(g) {
    var v = scoreRaw(g.id) || {}, k = status(g).kind, st = k === "over" ? "post" : k === "live" ? "in" : "pre";
    var out = { a: Number(v.a) || 0, h: Number(v.h) || 0, detail: st === "post" ? (v.detail || "Final") : st === "pre" ? timeText(g.start) : (v.detail || ""), state: st };
    var x = (v.ld || []).slice().sort(function (p, q) { return (q.v || 0) - (p.v || 0); })[0]; if (x && x.n && x.d) out.line = (x.n + " " + x.d).slice(0, 60);
    // live football: "MIN ball · 3rd & 4 at GB 35", and which side has it (the server keeps both current after this)
    if (st === "in" && v.sit) { var sm = /^(\S+) ball(?:, (.*))?$/.exec(String(v.sit)); out.sit = sm ? (sm[1] + " ball" + (sm[2] ? " · " + sm[2] : "")).slice(0, 44) : String(v.sit).slice(0, 44);
      if (sm) { var ow = sm[1].toUpperCase(); if (ow === abbr(g, "away")) out.poss = "away"; else if (ow === abbr(g, "home")) out.poss = "home"; } }
    return out;
  }
  function laBoardOf(ids) {
    return ids.map(function (id) { var g = games().filter(function (q) { return q.id === id; })[0]; if (!g) return null;
      var at = laAttrsOf(g), s = laStateOf(g);
      var out = { id: g.id, aa: at.awayAbbr, ha: at.homeAbbr, ac: at.awayColor, hc: at.homeColor, ax: at.awayAlt, hx: at.homeAlt, a: s.a, h: s.h, d: String(s.detail).slice(0, 24), s: s.state };
      if (at.awayLogo) out.al = at.awayLogo; if (at.homeLogo) out.hl = at.homeLogo;
      // 3.30.0, before kickoff: the start (seconds), the channel, and c once it's within the hour (the Dynamic Island counts down)
      var kick = new Date(g.start).getTime();
      if (s.state === "pre" && kick > 0) { out.t = Math.floor(kick / 1000); if (at.channel) out.tv = String(at.channel).slice(0, 16); if (kick - Date.now() <= 3600000) out.c = true; }
      return out; }).filter(Boolean);
  }
  function laNow(g, on) {
    if (!NATIVE) return;
    if (!on) { nativePost({ t: "live", op: "end", kind: "game", id: g.id }); return; }
    var k = status(g).kind, soon = k === "upcoming" && new Date(g.start).getTime() - Date.now() < 15 * 60000;
    if (k === "live" || k === "over" || soon) nativePost({ t: "live", op: "start", kind: "game", id: g.id, attrs: laAttrsOf(g), state: laStateOf(g) });
  }
  function laBoardNow() {
    if (!NATIVE) return;
    var b = boardPrefs(), ids = boardIds();
    if (!b.on || !ids.length) { nativePost({ t: "live", op: "end", kind: "board" }); return; }
    var list = laBoardOf(ids), go = list.some(function (x) { return x.s !== "pre"; }) || ids.some(function (id) { var g = games().filter(function (q) { return q.id === id; })[0]; return g && new Date(g.start).getTime() - Date.now() < 15 * 60000; });
    if (go) nativePost({ t: "live", op: "start", kind: "board", games: list, lead: Math.max(0, list.findIndex(function (x) { return x.s === "in"; })) });
  }
  function flipGameNotify(g, kind) {
    if (!state.notifyLoaded) { toast("Loading your notifications…"); return; }
    var undo = undoPer(g), on = !(kind === "live" ? liveOn(g) : alertsOn(g)), st = status(g).kind;
    setPer(kind, g, on); saveNotify(); render();
    if (kind === "live") laNow(g, on);
    toast(kind === "live"
      ? (on ? (st === "over" ? "Live notification on: the final score " + (NATIVE.liveNow ? "is on your Lock Screen" : "shows on your Lock Screen within a minute") : st === "live" ? "Live notification on: the score " + (NATIVE.liveNow ? "is on your Lock Screen" : "shows on your Lock Screen within a minute") : "Live notification on: the score shows on your Lock Screen when the game starts")
        : "Live notification off for this game" + (st !== "upcoming" && !NATIVE.liveNow ? ": it leaves your Lock Screen within a minute" : ""))
      : (on ? "Game alerts on for this game" : "Game alerts off for this game"), undo);
  }
  // ---------- the live scoreboard (3.23.0): up to 4 games from today's slate in one live notification ----------
  // prefs/notify liveAct.board = { on, ids (start order), at: when it was last switched on or its picks changed }; the server
  // starts it 15 minutes before the first pick (right away if one is on), keeps it current and ends it after the last final.
  function boardPrefs() {
    var la = state.notify.liveAct = state.notify.liveAct || {}, b = la.board;
    if (!b || typeof b !== "object") b = la.board = { on: false, ids: [], at: 0 };
    if (!Array.isArray(b.ids)) b.ids = [];
    // all day is the way it works unless you've picked games yourself (it's saved with the next change)
    if (typeof b.auto !== "boolean") b.auto = true;
    return b;
  }
  // DJ (Nov 26): "Your slate, all day" (auto): the first four games on your slate still to come or on, in start order; a
  // final stays 15 minutes, then the next game takes its place. The server does the same every minute (boardRoll in
  // worker/alerts.js); this is for the sheet, the Board button and the moment it's switched on.
  function boardRoll() {
    var now = Math.floor(Date.now() / 1000), slate = (state.slateIds || []).map(String);
    return boardGames().filter(function (g) { return slate.indexOf(String(g.id)) !== -1; }).sort(byStart).filter(function (g) {
      if (status(g).kind !== "over") return true;
      var end = laEndOf(g, "post", now); return end > 0 && now - end < 900;
    }).slice(0, 4).map(function (g) { return g.id; });
  }
  function boardIds() {
    var b = boardPrefs(); if (b.auto) return boardRoll();
    var gs = boardGames(); return b.ids.filter(function (id) { return gs.some(function (g) { return g.id === id; }); }).slice(0, 4);
  }
  function boardCtl() { return !!NATIVE && state.isOwner && state.notifyLoaded && state.date === todayInHome(); }
  function boardGames() {
    var rank = { live: 0, upcoming: 1, tbd: 1, over: 2 };
    return lineupGames().filter(function (g) { return !g.custom; }).sort(function (x, y) { return (rank[status(x).kind] - rank[status(y).kind]) || byStart(x, y); });
  }
  function boardStatus(g) {
    var st = status(g), sc = state.showScores ? scoreOf(g) : null, scs = sc && sc.a != null ? sc.a + "-" + sc.h + "  " : "";
    if (st.kind === "live") return scs + (sc && sc.detail ? sc.detail : "Live");
    if (st.kind === "over") return scs + "Final";
    return timeText(g.start);
  }
  // is the scoreboard on? In the iPhone app, once any pick is on (or within 15 minutes of starting) it's whether the
  // scoreboard is actually on the Lock Screen (the app reports it, 3.28.2); before that, the setting (it's scheduled)
  function boardIsOn() {
    var b = boardPrefs(), gs = boardGames(), ids = boardIds(), picks = gs.filter(function (g) { return ids.indexOf(g.id) !== -1; });
    if (!picks.length) return false;
    var due = picks.some(function (g) { var k = status(g).kind; return k === "live" || k === "over" || new Date(g.start).getTime() - Date.now() < 15 * 60000; });
    if (due && typeof state.boardShowing === "boolean" && state.liveShowing) return state.boardShowing;
    return !!b.on;
  }
  function openBoard() { boardWire(); renderBoard(); $("board-list").scrollTop = 0; $("sheet-board").classList.add("open"); }
  function closeBoard() { var s = $("sheet-board"), sh = s.querySelector(".sheet"); s.classList.remove("open"); sh.style.transform = ""; sh.style.transition = ""; }
  // DJ (Nov 26): the sheet closes with its X, Done, a tap outside, or a swipe down on its top (the games list scrolls by itself)
  var boardWired = false;
  function boardWire() {
    if (boardWired) return; boardWired = true;
    var s = $("sheet-board"), sh = s.querySelector(".sheet"), x = $("btn-x-board"), y0 = null, dy = 0;
    x.appendChild(icon("x")); x.addEventListener("click", closeBoard);
    sh.addEventListener("touchstart", function (e) {
      var lst = $("board-list"), inList = lst.contains(e.target);
      y0 = e.touches.length === 1 && (!inList || lst.scrollTop <= 0) ? e.touches[0].clientY : null; dy = 0;
    }, { passive: true });
    sh.addEventListener("touchmove", function (e) {
      if (y0 === null) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0) { if (dy < -8) y0 = null; sh.style.transform = ""; return; }
      if (dy > 8) { sh.style.transition = "none"; sh.style.transform = "translateY(" + dy + "px)"; }
    }, { passive: true });
    sh.addEventListener("touchend", function () {
      if (y0 === null) return; y0 = null;
      if (dy > 90) { closeBoard(); return; }
      sh.style.transition = "transform .18s cubic-bezier(.2,.8,.2,1)"; sh.style.transform = "";
    }, { passive: true });
  }
  function renderBoard() {
    var b = boardPrefs(), list = $("board-list"), gs = boardGames();
    var picked = boardIds();
    list.textContent = "";
    if (!gs.length) list.appendChild(el("p", "board-none", "Nothing on today's slate yet."));
    // the all-day choice on top; switching it off goes back to picking up to 4 yourself
    if (gs.length) {
      var au = el("button", "board-row board-auto" + (b.auto ? " on" : "")); au.type = "button";
      au.setAttribute("aria-pressed", b.auto ? "true" : "false");
      var ack = el("span", "board-ck"); if (b.auto) ack.appendChild(icon("check")); au.appendChild(ack);
      var an = el("span", "board-nm", "Your slate, all day"); an.appendChild(el("small", null, "The next 4 games. A final stays 15 minutes, then the next game takes its place."));
      au.appendChild(an);
      au.addEventListener("click", function () {
        b.auto = !b.auto; b.at = Date.now(); if (!b.auto && !b.ids.length) b.on = false;
        saveNotify(); renderBoard(); keepScroll(renderLineup);
        if (b.on) laBoardNow();
      });
      list.appendChild(au);
    }
    gs.forEach(function (g) {
      var on = picked.indexOf(g.id) !== -1, full = !on && picked.length >= 4, st = status(g).kind;
      var r = el("button", "board-row" + (on ? " on" : "")); r.type = "button"; r.disabled = full && !b.auto;
      r.setAttribute("aria-pressed", on ? "true" : "false");
      var ck = el("span", "board-ck"); if (on) ck.appendChild(icon("check")); r.appendChild(ck);
      var tm = el("span", "board-tm");
      var bo = sideOrder(g);
      tm.appendChild(badgeFor(abbr(g, bo[0]), g[bo[0]], g[bo[0] + "Color"], g[bo[0] + "Alt"]));
      tm.appendChild(el("span", "board-at", sep(g).trim()));
      tm.appendChild(badgeFor(abbr(g, bo[1]), g[bo[1]], g[bo[1] + "Color"], g[bo[1] + "Alt"]));
      r.appendChild(tm);
      r.appendChild(el("span", "board-st" + (st === "live" ? " live" : ""), boardStatus(g)));
      r.setAttribute("aria-label", short(g, bo[0]) + sep(g) + short(g, bo[1]) + ", " + boardStatus(g) + (on ? (b.auto ? ", on the scoreboard now" : ", picked") : full ? ", 4 already picked" : ""));
      r.addEventListener("click", function () {
        if (b.auto) { toast("Turn off Your slate, all day to pick games yourself"); return; }
        var ids = picked.slice(), i = ids.indexOf(g.id);
        if (i >= 0) ids.splice(i, 1); else if (ids.length < 4) ids.push(g.id); else return;
        // in start order, so the live notification reads top to bottom like your slate
        ids.sort(function (x, y) { var gx = gs.filter(function (q) { return q.id === x; })[0], gy = gs.filter(function (q) { return q.id === y; })[0]; return byStart(gx, gy); });
        b.ids = ids; b.at = Date.now(); if (!ids.length) b.on = false;
        saveNotify(); renderBoard(); keepScroll(renderLineup);
        if (b.on || !ids.length) laBoardNow();
      });
      list.appendChild(r);
    });
    $("board-sub").textContent = b.auto ? "Your slate's games, 4 at a time, roll through one live notification on your Lock Screen and in the Dynamic Island all day. Once it's on, it comes back by itself every day, 15 minutes before your first game. Swipe it away to hide it for the rest of that day; it's back the next day. Turn it off here to stop it."
      : "Pick up to 4 games from your slate (" + picked.length + " of 4). They show together in one live notification on your Lock Screen and in the Dynamic Island.";
    var ob = $("btn-board-on");
    var bon = boardIsOn();
    ob.textContent = bon ? "Turn off" : "Show on Lock Screen";
    ob.className = bon ? "outline" : "solid";
    ob.disabled = !picked.length;
  }
  // a tray switch: its icon and name, lit while it's on (like the team stars)
  function notifyBtn(g, kind) {
    var on = kind === "live" ? liveOn(g) : alertsOn(g), b = el("button", "ta-nt" + (on ? " on" : "")); b.type = "button";
    b.appendChild(icon(kind === "live" ? (on ? "card" : "card-off") : (on ? "bell-on" : "bell-off")));
    b.appendChild(document.createTextNode(kind === "live" ? "Live notification" : "Game alerts"));
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("aria-label", (kind === "live" ? "Live notification, the score on your Lock Screen," : "Game alerts") + " for this game: " + (on ? "on" : "off"));
    b.addEventListener("click", function (e) { e.stopPropagation(); flipGameNotify(g, kind); });
    return b;
  }

  // a day's games: the main document plus the big college leagues, which load as their own documents (slates/D-ncaam etc.)
  var SLATE_PARTS = ["ncaam", "ncaaw", "ncaaf"];
  function games() {
    var out = [], seen = {};
    function take(list) { (Array.isArray(list) ? list : []).forEach(function (g) { if (!g || !g.id || !g.home) return; var k2 = (g.league + "|" + g.away + "|" + g.home + "|" + String(g.start).slice(0, 13)).toLowerCase(); if (seen[g.id] || seen[k2]) return; seen[g.id] = 1; seen[k2] = 1; out.push(g); }); }
    if (state.slate) take(state.slate.games);
    SLATE_PARTS.forEach(function (k) { var p = (state.slateParts || {})[k]; if (p) take(p.games); });
    // start times move (a delay, an earlier game running long): ESPN's current time wins over the loaded one
    return out.map(function (g) {
      recApply(g);
      if (flipKnown(g.id)) g = flipGame(g);
      var fix = (LIVE_DATE === state.date && LIVE_START[g.id]) || (state.scores && state.scores[g.id] && state.scores[g.id].start);
      if (!fix || fix === g.start || isNaN(new Date(fix))) return g;
      var c = {}; Object.keys(g).forEach(function (k) { c[k] = g[k]; }); c.start = fix; c.moved = g.start; return c;
    });
  }
  function byStart(a, b) { return (new Date(a.start) - new Date(b.start)) || String(a.id).localeCompare(String(b.id)); }
  function inLineup(id) { return !!state.slateSet[id]; }
  function abbr(g, side) {
    var a = g[side + "Abbr"];
    if (!a) { var parts = String(g.id).split("-"); a = (side === "away" ? parts[1] : parts[2]) || ""; }
    if (!a) a = (g[side] || "?").replace(/[^A-Za-z]/g, "").slice(0, 3);
    return a.toUpperCase().slice(0, 4);
  }
  function short(g, side) { var s = g[side + "Short"]; if (s) return s; var n = g[side] || "", p = n.split(" "); return p.length > 1 ? p[p.length - 1] : n; }
  function colors(name) { var k = (name || "").toLowerCase(); if (TEAM_COLORS[k]) return TEAM_COLORS[k]; var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; }
  function hexOk(h) { return typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h); }
  function lum(h) { var n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255; return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function badgeFor(text, name, fill, ring) {
    var c = colors(name);
    if (!hexOk(fill)) { var kt = typeof teamByName === "function" ? teamByName(name) : null; if (kt && kt.c1) { fill = kt.c1; ring = kt.c2 || ring; } }
    if (!hexOk(fill)) { var tl = teamLook(name); if (tl && hexOk(tl[1])) { fill = tl[1]; ring = tl[2] || ring; } }   // ESPN's colors (college teams had none before)
    if (hexOk(fill)) {
      var f = fill, r = hexOk(ring) ? ring : "#ffffff";
      if (lum(f) > 0.72 && hexOk(ring) && lum(ring) < 0.72) { f = ring; r = fill; }   // keep white text readable
      if (r.toLowerCase() === f.toLowerCase()) r = "#ffffff";
      c = [f, r];
    }
    var b = el("span", "badge" + (text.length > 3 ? " sm" : ""), text);
    b.style.background = c[0]; b.style.setProperty("--ring", c[1]);
    if (lum(c[0]) > 0.72) b.style.color = "#111";
    else if (contrastRatio(c[0], "#ffffff") < 4.5 && contrastRatio(c[0], "#0C1117") > contrastRatio(c[0], "#ffffff")) b.style.color = "#0C1117";  // light golds and oranges: white text was under 4.5 to 1 (3.48.0)
    b.setAttribute("aria-hidden", "true");
    if (name && name !== "custom") addLogo(b, name);
    return b;
  }
  function isStreaming(n) { n = String(n).toLowerCase(); return STREAMING.some(function (s) { return n === s || n.indexOf(s) === 0; }); }
  function customToGame(c) {
    var p = state.date.split("-").map(Number), hm = (c.time || "00:00").split(":").map(Number);
    return { id: c.id, league: "custom", leagueLabel: "Added by you", start: new Date(p[0], p[1] - 1, p[2], hm[0] || 0, hm[1] || 0).toISOString(), home: c.title, tv: c.tv ? [c.tv] : [], custom: true };
  }

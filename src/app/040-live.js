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
  // soccer is shown home team first ("Arsenal vs Chelsea"); everything else away @ home
  function sideOrder(g) { return SOCCER[g.league] ? ["home", "away"] : ["away", "home"]; }
  function sep(g) { return SOCCER[g.league] || g.neutral ? " vs " : " @ "; }
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
  function livePoll() {
    try { laSlateWidget(); } catch (e) {}
    try { laBetsShare(); } catch (e) {}
    try { laLogos(); } catch (e) {}  // 3.113.0: also unfolded, so the widget and live notifications always have the slate's logos
    if (panesOn()) return;  // 3.80.0: unfolded, the two panes each keep their own scores; the page behind them rests
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
            var v = { a: Number(A.score), h: Number(H.score), state: st.state, detail: st.shortDetail || st.detail || "", live: true, p: Number((c.status || e.status || {}).period) || 0, ck: Number((c.status || e.status || {}).clock) || 0, ld: liveLeaders(c), sit: liveSit(c) };
            var old = LIVE[g.id];
            if (!old || old.a !== v.a || old.h !== v.h || old.state !== v.state || old.detail !== v.detail || old.sit !== v.sit) { LIVE[g.id] = v; changed = true; }
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
  function laAttrsOf(g) {
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
  // the next three games that haven't finished (start time and channel, or the score while it's on).
  // Sent once per change; builds before 3.112.0 ignore it.
  var laSlateSent = "";
  function laSlateWidget() {
    if (!NATIVE || state.date !== todayInHome() || !state.slateIds) return;
    var byId = {}; games().forEach(function (g) { byId[g.id] = g; });
    var list = state.slateIds.map(function (id) { return byId[id]; }).filter(Boolean).map(function (g) {
      var at = laAttrsOf(g), s = laStateOf(g), kick = new Date(g.moved || g.start).getTime();
      var o = { id: String(g.id), aa: String(at.awayAbbr || ""), ha: String(at.homeAbbr || ""), ac: String(at.awayColor || ""), hc: String(at.homeColor || ""), ax: String(at.awayAlt || ""), hx: String(at.homeAlt || ""),
        a: Math.round(Number(s.a)) || 0, h: Math.round(Number(s.h)) || 0, d: String(s.detail || "").slice(0, 24), s: String(s.state) };
      if (at.awayLogo) o.al = at.awayLogo; if (at.homeLogo) o.hl = at.homeLogo;
      if (kick > 0) o.t = Math.floor(kick / 1000); if (at.channel) o.tv = String(at.channel).slice(0, 16);
      return o;
    }).sort(function (p, q) { return (p.t || 0) - (q.t || 0); }).slice(0, 12);
    var k = JSON.stringify(list); if (k === laSlateSent) return;
    laSlateSent = k; nativePost({ t: "slate", date: state.date, at: Math.floor(Date.now() / 1000), games: list });
  }
  // the game's own logo first (national teams and anyone ESPN's team lists miss), then the team lookup
  function laLogo(g, sd) { try { var own = logoSeg(g[sd + "Logo"]); if (own) return own; var t = teamLook(g[sd]); return t && t[0] ? String(t[0]) : ""; } catch (e) { return ""; } }
  // 3.67.0: tell the iPhone app which logos today's games use, so it can save them for live notifications
  // (a live notification can't download a picture itself). Sent once per change; builds before 3.67.0 ignore it.
  var laLogosSent = "";
  function laLogos() {
    if (!NATIVE || state.date !== todayInHome()) return;
    var segs = {}; games().forEach(function (g) { ["away", "home"].forEach(function (sd) { var lg = laLogo(g, sd); if (lg) segs[lg] = 1; }); });
    var list = Object.keys(segs).sort(), k = list.join(","); if (!list.length || k === laLogosSent) return;
    laLogosSent = k; nativePost({ t: "logos", segs: list });
  }
  function laStateOf(g) {
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
    var b = boardPrefs(), ids = (b.ids || []).slice(0, 4);
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
    return b;
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
    var b = boardPrefs(), gs = boardGames(), picks = gs.filter(function (g) { return b.ids.indexOf(g.id) !== -1; });
    if (!picks.length) return false;
    var due = picks.some(function (g) { var k = status(g).kind; return k === "live" || k === "over" || new Date(g.start).getTime() - Date.now() < 15 * 60000; });
    if (due && typeof state.boardShowing === "boolean" && state.liveShowing) return state.boardShowing;
    return !!b.on;
  }
  function openBoard() { renderBoard(); $("sheet-board").classList.add("open"); }
  function renderBoard() {
    var b = boardPrefs(), list = $("board-list"), gs = boardGames();
    var picked = b.ids.filter(function (id) { return gs.some(function (g) { return g.id === id; }); });
    list.textContent = "";
    if (!gs.length) list.appendChild(el("p", "board-none", "Nothing on today's slate yet."));
    gs.forEach(function (g) {
      var on = picked.indexOf(g.id) !== -1, full = !on && picked.length >= 4, st = status(g).kind;
      var r = el("button", "board-row" + (on ? " on" : "")); r.type = "button"; r.disabled = full;
      r.setAttribute("aria-pressed", on ? "true" : "false");
      var ck = el("span", "board-ck"); if (on) ck.appendChild(icon("check")); r.appendChild(ck);
      var tm = el("span", "board-tm");
      tm.appendChild(badgeFor(abbr(g, "away"), g.away, g.awayColor, g.awayAlt));
      tm.appendChild(el("span", "board-at", SOCCER[g.league] || g.neutral ? "vs" : "@"));
      tm.appendChild(badgeFor(abbr(g, "home"), g.home, g.homeColor, g.homeAlt));
      r.appendChild(tm);
      r.appendChild(el("span", "board-st" + (st === "live" ? " live" : ""), boardStatus(g)));
      r.setAttribute("aria-label", short(g, "away") + sep(g) + short(g, "home") + ", " + boardStatus(g) + (on ? ", picked" : full ? ", 4 already picked" : ""));
      r.addEventListener("click", function () {
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
    $("board-sub").textContent = "Pick up to 4 games from your slate (" + picked.length + " of 4). They show together in one live notification on your Lock Screen and in the Dynamic Island.";
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

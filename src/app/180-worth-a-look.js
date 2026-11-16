  // ---------- learning: a private log of what DJ adds, removes and checks, and suggestions from it ----------
  var ACT = { log: [], loaded: false, timer: null, pending: [] };
  var ACT_KEYS = ["id", "league", "start", "away", "home", "awayRank", "homeRank", "awayRecord", "homeRecord", "awayStanding", "homeStanding", "awayConf", "homeConf", "awayAbbr", "homeAbbr", "tv", "note", "stage", "comp", "neutral"];
  function actLoad() {
    if (!db || !uid || ACT.loaded) return;
    fbLoad();  // thumbs up and down (185-thumbs.js)
    db.collection("data/users/" + uid).doc("activity").get().then(function (sn) {
      var d = sn.exists ? sn.data() : null; ACT.log = ((d && d.log) || []).concat(ACT.pending); ACT.pending = []; ACT.loaded = true; keepScroll(render);
    }, function () { ACT.loaded = true; });
  }
  function actSave() {
    clearTimeout(ACT.timer);
    ACT.timer = setTimeout(function () {
      if (!db || !uid || !ACT.loaded) return;
      var cut = Date.now() - 120 * 86400000;
      ACT.log = ACT.log.filter(function (e) { return Date.parse(e.t) > cut; }).slice(-400);
      db.collection("data/users/" + uid).doc("activity").set({ v: 1, log: ACT.log }).then(null, function () {});
    }, 2500);
  }
  // a small note at the top center of the page with an Undo, gone after 5 seconds or once used
  var TU_T = null;
  function topUndo(text, fn) {
    var n = $("top-undo"); if (!n) { n = el("div", "top-undo"); n.id = "top-undo"; n.setAttribute("role", "status"); document.body.appendChild(n); }
    n.textContent = ""; n.appendChild(el("span", null, text));
    var b = el("button", null, "Undo"); b.type = "button";
    b.addEventListener("click", function (e) { e.stopPropagation(); clearTimeout(TU_T); n.classList.remove("on"); fn(); });
    n.appendChild(b); n.classList.add("on");
    clearTimeout(TU_T); TU_T = setTimeout(function () { n.classList.remove("on"); }, 5000);
  }
  function logAct(a, g, extra) {
    if (!g || g.custom || !uid) return;
    var e = { a: a, t: new Date().toISOString(), d: state.date };
    ACT_KEYS.forEach(function (k) { if (g[k] != null && g[k] !== "") e[k] = Array.isArray(g[k]) ? g[k].slice(0, 3) : g[k]; });
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    (ACT.loaded ? ACT.log : ACT.pending).push(e); actSave();
  }
  function actRecent(days) { var cut = Date.now() - days * 86400000; return ACT.log.filter(function (e) { return Date.parse(e.t) > cut; }); }
  function uniq(list) { var seen = {}; return list.filter(function (e) { var k = e.d + "|" + e.id; if (seen[k]) return false; seen[k] = 1; return true; }); }
  // ---------- suggestions: games worth adding, each with its reason ----------
  // Two kinds. Coming up: big games the rules didn't pick (rivalries, top-of-table and ranked clashes, special events,
  // national spotlights, two winning teams), weighted by what DJ adds, opens and follows. Live now: a close finish or
  // a big individual night in the leagues DJ watches most. Being on League Pass (or any one channel) is never a reason.
  var RIVALS = {
    nba: [["lakers", "celtics"], ["celtics", "76ers"], ["celtics", "knicks"], ["knicks", "nets"], ["lakers", "clippers"], ["bulls", "pistons"], ["lakers", "warriors"], ["knicks", "heat"], ["celtics", "heat"], ["mavericks", "spurs"], ["suns", "lakers"], ["nuggets", "timberwolves"]],
    nhl: [["blues", "blackhawks"], ["bruins", "canadiens"], ["rangers", "islanders"], ["penguins", "flyers"], ["maple leafs", "canadiens"], ["oilers", "flames"], ["avalanche", "red wings"], ["maple leafs", "bruins"], ["capitals", "penguins"], ["kings", "ducks"], ["blues", "predators"]],
    nfl: [["bears", "packers"], ["cowboys", "eagles"], ["cowboys", "commanders"], ["eagles", "giants"], ["steelers", "ravens"], ["chiefs", "raiders"], ["patriots", "jets"], ["49ers", "seahawks"], ["49ers", "cowboys"], ["packers", "vikings"], ["bills", "dolphins"], ["chiefs", "broncos"], ["steelers", "browns"]],
    mlb: [["yankees", "red sox"], ["cardinals", "cubs"], ["dodgers", "giants"], ["mets", "phillies"], ["yankees", "mets"], ["cubs", "white sox"]],
    college: [["michigan wolverines", "ohio state buckeyes"], ["alabama crimson tide", "auburn tigers"], ["duke blue devils", "north carolina tar heels"], ["kentucky wildcats", "louisville cardinals"], ["army black knights", "navy midshipmen"], ["texas longhorns", "oklahoma sooners"], ["usc trojans", "ucla bruins"], ["florida gators", "georgia bulldogs"], ["clemson tigers", "south carolina gamecocks"], ["indiana hoosiers", "purdue boilermakers"], ["iowa hawkeyes", "iowa state cyclones"], ["kansas jayhawks", "missouri tigers"], ["oregon ducks", "washington huskies"], ["notre dame fighting irish", "usc trojans"], ["kansas jayhawks", "kentucky wildcats"], ["illinois fighting illini", "missouri tigers"], ["michigan wolverines", "michigan state spartans"], ["texas longhorns", "texas a&m aggies"], ["ole miss rebels", "mississippi state bulldogs"]],
    soccer: [["manchester united", "manchester city"], ["manchester united", "liverpool"], ["liverpool", "everton"], ["arsenal", "tottenham"], ["arsenal", "chelsea"], ["chelsea", "tottenham"], ["manchester united", "leeds"], ["real madrid", "barcelona"], ["real madrid", "atlético"], ["real madrid", "atletico"], ["barcelona", "espanyol"], ["inter", "ac milan"], ["roma", "lazio"], ["juventus", "inter"], ["juventus", "torino"], ["dortmund", "bayern"], ["dortmund", "schalke"], ["paris saint-germain", "marseille"], ["celtic", "rangers"], ["benfica", "porto"], ["ajax", "feyenoord"], ["la galaxy", "lafc"], ["portland timbers", "seattle sounders"], ["new york red bulls", "new york city"]]
  };
  function rivalOf(g) {
    var lg = g.league, key = SOCCER[lg] ? "soccer" : (LEAGUES[lg] || {}).college ? "college" : lg, a = String(g.away || "").toLowerCase(), h = String(g.home || "").toLowerCase();
    var hit = function (n, x) { return n.indexOf(x) !== -1 && !(x === "inter" && /internacional|inter miami/.test(n)) && !(x === "rangers" && /new york|texas/.test(n)); };
    return (RIVALS[key] || []).some(function (r) { return (hit(a, r[0]) && hit(h, r[1])) || (hit(a, r[1]) && hit(h, r[0])); });
  }
  function recPct(g, s) { var p = String(g[s + "Record"] || "").split("-").map(Number); if (p.length < 2 || p.some(isNaN)) return -1; var n = p.reduce(function (x, y) { return x + y; }, 0); return n >= 5 ? p[0] / n : -1; }
  function ordN(n) { var v = n % 100; return n + (v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"); }
  // how much DJ follows each league: hand adds, opens, rules switched on, his teams and players
  function leagueAffinity() {
    var aff = {}, rec = actRecent(60), bump = function (lg, n) { if (lg) aff[lg] = (aff[lg] || 0) + n; };
    rec.forEach(function (e) { if (e.a === "add") bump(e.league, 2); else if (e.a === "open") bump(e.league, 1); else if (e.a === "remove") bump(e.league, -1); });
    Object.keys(LEAGUES).forEach(function (lg) { var b = lgRules(lg); if (Object.keys(b).some(function (k) { return b[k]; })) bump(lg, 3); });
    (state.teams || []).forEach(function (t) { if (t && t.lg) bump(t.lg, 4); });
    (state.players || []).forEach(function (pl) { if (pl && pl.lg) bump(pl.lg, 2); });
    return aff;
  }
  function suggestSkipped() { var sk = {}; actRecent(3).forEach(function (e) { if (e.a === "skip") sk[e.d + "|" + e.id] = 1; }); return sk; }
  // live now: a close finish, or someone having a big night
  // "Worth a look right now" rules (Settings): on/off, close finishes, big nights, which leagues
  function walRules() { var r = state.walRules || {}; return { on: r.on !== false, close: r.close !== false, upset: r.upset !== false, big: r.big !== false, nat: !!r.nat, ranked: !!r.ranked, leagues: Array.isArray(r.leagues) ? r.leagues : walDefaultLgs() }; }
  // Worth a look's leagues until you pick your own: the leagues in your slate rules plus your teams' leagues
  function walDefaultLgs() {
    var on = {}; Object.keys(((state.rules || {}).by) || {}).forEach(function (k) { on[k] = 1; });
    games().forEach(function (g) { if (hasFav(g)) on[g.league] = 1; });
    return ORDER.filter(function (k) { return on[k]; });
  }
  // games you added from Worth a look stay in it for the day, ticked, so one more tap takes them back off
  function walKeep() { var m = {}; try { m = JSON.parse(localStorage.getItem("slate-wal-keep") || "{}") || {}; } catch (e) {} var t = todayInHome(); Object.keys(m).forEach(function (k) { if (k.slice(0, 10) !== t) delete m[k]; }); return m; }
  function walSeen() { var m = {}; try { m = JSON.parse(localStorage.getItem("slate-wal-seen") || "{}") || {}; } catch (e) {} var t = todayInHome(); Object.keys(m).forEach(function (k) { if (k.slice(0, 10) !== t) delete m[k]; }); return m; }
  function walSeenSet(m) { try { localStorage.setItem("slate-wal-seen", JSON.stringify(m)); } catch (e) {} }
  function walKeepSet(m) { try { localStorage.setItem("slate-wal-keep", JSON.stringify(m)); } catch (e) {} }
  // a ranked college team trailing a lower-ranked or unranked one late: "No. 6 Texas trails No. 21 LSU", or ""
  function walUpset(g, v) {
    if (!(LEAGUES[g.league] || {}).college || !v || v.state !== "in") return "";
    var p = v.p || 0, dd = String(v.detail || ""), ra = Number(g.awayRank) || 99, rh = Number(g.homeRank) || 99, aS = v.a || 0, hS = v.h || 0;
    var late = g.league === "ncaaf" || g.league === "ncaaw" ? p >= 3 : p >= 2 || /\bOT\b/.test(dd), need = g.league === "ncaaf" ? 8 : 7;
    var fav = aS < hS && ra < rh && hS - aS >= need ? "away" : hS < aS && rh < ra && aS - hS >= need ? "home" : "";
    if (!late || !fav || (ra === 99 && rh === 99)) return "";
    var oth = fav === "away" ? "home" : "away";
    return "No. " + g[fav + "Rank"] + " " + short(g, fav) + " trails " + (g[oth + "Rank"] ? "No. " + g[oth + "Rank"] + " " : "") + short(g, oth);
  }
  // one live game against the Worth a look rules: the best reason it's worth a look ({score, tag, why}), or null
  function walEval(g, v, wr, aff) {
    if (!v || v.state !== "in") return null;
    var sport = BX_SPORT[g.league], m = Math.abs((v.a || 0) - (v.h || 0)), p = v.p || 0, ck = v.ck || 0, d = String(v.detail || ""), follow = (aff[g.league] || 0) >= 3, best = null;
    var pick = function (sc, tag, why) { if (!best || sc > best.score) best = { g: g, score: sc, tag: tag, why: why, live: true }; };
    var ot = /OT|SO|ET/.test(d), coll = (LEAGUES[g.league] || {}).college;
    // close and late
    var late = sport === "bball" ? (coll && g.league !== "ncaaw" ? p >= 2 && ck <= 480 : p >= 4 && ck <= 480) || p > (coll && g.league !== "ncaaw" ? 2 : 4)
      : sport === "football" ? p > 4 || (p === 4 && ck <= 480) : sport === "hockey" ? p > 3 || (p === 3 && ck <= 480) : sport === "soccer" ? p >= 2 && /^(7[5-9]|8\d|9\d|1[01]\d)/.test(d) : sport === "baseball" ? p >= 7 : false;
    var tight = sport === "bball" ? m <= 6 : sport === "football" ? m <= 8 : sport === "baseball" ? m <= 2 : m <= 1;
    if (late && tight && wr.close) {
      var what = m === 0 ? "Tied" : (sport === "bball" || sport === "football" ? (/^(8|11|18)$/.test(String(m)) ? "An " : "A ") + m + "-point game" : sport === "baseball" ? "A " + m + "-run game" : "A one-goal game");
      pick((follow ? 95 : 70) + (ot ? 6 : 0) - m, "Close finish", ot ? what.replace(/^Tied$/, "All square") + " in OT" : what + " late");  // the clock is on the game row right below
    }
    // upset watch: a ranked college team trailing a lower-ranked or unranked one late (like the phone alert);
    var up0 = wr.upset ? walUpset(g, v) : "";
    if (up0) pick((follow ? 88 : 66) + Math.max(0, 25 - (Number(g.awayRank) || Number(g.homeRank) || 25)), "Upset watch", up0);
    // a big individual night (game stats from the scoreboard)
    // ESPN lists season leaders until a game is well underway: only judge big nights once both sides have played a while
    ((wr.big && (v.a || 0) + (v.h || 0) > 0 && p >= 2) ? v.ld || [] : []).forEach(function (L) {
      var n = L.full || L.n, num = function (rx) { var mm = rx.exec(L.d); return mm ? Number(mm[1]) : 0; };
      if (sport === "bball" && L.c === "points") { var pts = L.v || Number(L.d) || 0, big = g.league === "nba" ? 35 : g.league === "wnba" ? 30 : 30;
        if (pts >= big) pick((follow ? 85 : 60) + (pts - big), "Big night", n + " has " + pts + " points" + (p <= (coll ? 1 : 3) ? " and there's still time left" : "")); }
      if (sport === "football") { var yds = num(/(\d+) YDS/), td = num(/(\d+) TD/);
        if (L.c === "passingYards" && (yds >= 300 || td >= 4)) pick((follow ? 80 : 55) + td * 2, "Big night", n + " " + yds + " passing yds, " + td + " TD");
        if ((L.c === "rushingYards" || L.c === "receivingYards") && (yds >= 130 || td >= 3)) pick((follow ? 80 : 55) + td * 2, "Big night", n + " " + yds + (L.c === "rushingYards" ? " rushing" : " receiving") + " yds" + (td ? ", " + td + " TD" : "")); }
      if (sport === "hockey" && L.c === "goals" && (L.v || Number(L.d)) >= 2) { var gl2 = L.v || Number(L.d); pick((follow ? 82 : 58) + gl2 * 4, "Big night", n + (gl2 >= 3 ? " has a hat trick" : " has two goals, hat trick watch")); }
    });
    return best;
  }
  // the Worth a look tag for a live game already on your slate (it gets the tag on its card instead of a second copy above)
  function walSlateTag(g) {
    if (!ACT.loaded || g.custom || state.date !== todayInHome()) return null;
    var wr = walRules(); if (!wr.on) return null;
    try { return walEval(g, scoreRaw(g.id), wr, leagueAffinity()); } catch (e) { return null; }
  }
  function liveSuggestions() {
    if (!ACT.loaded || state.date !== todayInHome()) return [];
    var wr = walRules(); if (!wr.on) return [];
    // X'd out today: gone from here for good.
    var keep = walKeep(), kept = [], sk = suggestSkipped();
    Object.keys(keep).forEach(function (k) { var id = k.slice(11), g = games().filter(function (x) { return x.id === id; })[0]; if (g && !sk[state.date + "|" + g.id] && inLineup(g.id) && status(g).kind === "live") kept.push({ g: g, score: 999, tag: keep[k].tag, why: keep[k].why, live: true, kept: true }); });
    kept = [];  // added from here: it's on your slate now, where its card carries the tag while it still qualifies
    var keptIds = {}; kept.forEach(function (k) { keptIds[k.g.id] = 1; });
    var aff = leagueAffinity(), removed = {}, out = [];
    (state.lineup.removed || []).forEach(function (id) { removed[id] = 1; });
    games().forEach(function (g) {
      if (g.custom || keptIds[g.id] || removed[g.id] || sk[state.date + "|" + g.id]) return;
      var v = scoreRaw(g.id); if (!v || v.state !== "in") return;
      if (inLineup(g.id)) return;  // on your slate: its card carries the tag instead
      var best = walEval(g, v, wr, aff), coll = (LEAGUES[g.league] || {}).college;
      // it must be in your Worth a look leagues and pass its filters
      var okLg = wr.leagues.indexOf(g.league) !== -1 && (!wr.nat || natFor(g)) && (!wr.ranked || !coll || g.awayRank || g.homeRank);
      if (!best || !okLg) return;
      // your thumbs move it up or down; a strong thumbs down on this kind of game keeps it out
      var fa = fbAdj(g, best.tag); if (fa.veto || fa.adj <= -20) return;
      best.score += fa.adj; out.push(best);
    });
    out.sort(function (a, b) { return b.score - a.score; });
    var shown = kept.concat(out.slice(0, 5));
    // games that finish while shown here stay for 10 minutes, marked final
    var seen = walSeen(), now = Date.now(), t0 = todayInHome(), ids = {};
    shown.forEach(function (x) { ids[x.g.id] = 1; seen[t0 + "|" + x.g.id] = { tag: x.tag, why: x.why }; });
    Object.keys(seen).forEach(function (k) {
      var id = k.slice(11), sv = seen[k]; if (ids[id] || sk[state.date + "|" + id]) return;
      var g = games().filter(function (x) { return x.id === id; })[0]; if (!g) return;
      if (status(g).kind !== "over") return;
      if (!sv.end) sv.end = now;
      if (now - sv.end < 10 * 60000) shown.push({ g: g, score: 0, tag: sv.tag, why: sv.why, live: false, done: true, kept: !!keep[k] });
    });
    walSeenSet(seen);
    return shown;
  }
  // coming up: the big games of the day the rules didn't pick, and the ones DJ's habits point to
  function gameSuggestions() {
    if (!ACT.loaded || isPastDay()) return [];
    var rec = actRecent(60), adds = uniq(rec.filter(function (e) { return e.a === "add"; })), opens = rec.filter(function (e) { return e.a === "open"; });
    var rems = uniq(rec.filter(function (e) { return e.a === "remove"; })), sk = suggestSkipped(), aff = leagueAffinity();
    var removed = {}; (state.lineup.removed || []).forEach(function (id) { removed[id] = 1; });
    var out = [];
    games().forEach(function (g) {
      if (g.custom || inLineup(g.id) || removed[g.id] || sk[state.date + "|" + g.id]) return;
      if (status(g).kind !== "upcoming") return;
      var why = [], veto = false, tag = info(g).tag, nm = function (sd) { return short(g, sd); };
      var add = function (sc, label, text) { why.push({ sc: sc, tag: label, text: text }); };
      // from the media: what makes this a big game
      var friendly = /friendl/i.test(String(g.comp || "") + " " + String(g.note || "") + " " + String(g.leagueLabel || ""));
      if (isEvent(g)) { var big = /final|championship|playoff|bowl|derby|rivalry|world series|super bowl|cup/i.test(g.note || "") && !/preseason|exhibition/i.test(g.note || "");
        add(big ? 62 : 28, big ? "Big game" : "Event", (big ? "" : "Part of the ") + eventKey(g)); }
      if (rivalOf(g)) add(60, "Rivalry", nm("away") + " and " + nm("home") + " is one of the big rivalries in " + (SOCCER[g.league] ? "football" : (LEAGUES[g.league] || {}).name || tag));
      var ra = Number(g.awayRank) || 0, rh = Number(g.homeRank) || 0;
      if (ra && rh) add(50 + Math.max(0, 25 - (ra + rh) / 2), "Ranked", "No. " + ra + " " + nm("away") + " vs No. " + rh + " " + nm("home"));
      var sa = standNo(g, "away"), sh = standNo(g, "home"), tn = TOP_N[g.league] || 4;
      if (TOP_N[g.league] && sa && sh && sa <= tn && sh <= tn) add(56 - Math.abs(sa - sh), "Top clash", (function () { var f = sa <= sh ? "away" : "home", l = f === "away" ? "home" : "away"; return nm(f) + " (" + (g[f + "Standing"] || ordN(standNo(g, f))) + ") vs " + nm(l) + " (" + (g[l + "Standing"] || ordN(standNo(g, l))) + ")"; })());
      if (isKnockout(g) && !friendly) add(48, "Knockout", "A knockout tie, so it counts");
      var pa = recPct(g, "away"), ph = recPct(g, "home");
      if (pa >= 0.62 && ph >= 0.62 && !(LEAGUES[g.league] || {}).college) add(40 + Math.round((pa + ph) * 10), "Good teams", "Two of the better teams: " + nm("away") + " (" + g.awayRecord + ") and " + nm("home") + " (" + g.homeRecord + ")");
      if (MATCH.bigclubs(g, "both") || MATCH.bigsix(g, "both")) add(46, "Big clubs", nm("away") + " vs " + nm("home") + ", two of the biggest clubs around");
      if (MATCH.bignations(g, "both")) add(46, "Heavyweights", nm("away") + " vs " + nm("home"));
      if (natFor(g) && (g.league === "nba" || g.league === "nhl" || (LEAGUES[g.league] || {}).college)) { var tvn = (g.tv || []).filter(function (n) { return NATIONAL_TV.indexOf(n) !== -1; })[0]; if (tvn) add(26, "Spotlight", "Picked for national TV on " + (NET_SHORT[tvn] || tvn)); }
      // from how DJ uses the app
      ["away", "home"].forEach(function (sd) {
        var t = g[sd]; if (!t) return;
        var has = function (e) { return e.league === g.league && (e.away === t || e.home === t); };
        var nA = adds.filter(has).length, nO = opens.filter(has).length, nR = rems.filter(has).length;
        if (nR >= 2 && nR >= nA) veto = true;
        if (nA >= 2) add(30 + 4 * nA, "For you", "You've added " + nm(sd) + " games " + nA + " times");
        else if (nO >= 3) add(24 + 2 * nO, "For you", "You keep opening " + nm(sd) + " games");
        (state.players || []).forEach(function (pl) { if (pl.lg === g.league && pl.team && String(pl.team).toUpperCase() === String(abbr(g, sd)).toUpperCase()) add(52, "Your player", pl.name + " plays for " + nm(sd)); });
      });
      // a team you gave thumbs up to
      var lk = fbLikedTeam(g); if (lk) add(40 + Math.min(8, Math.round(lk.w * 2)), "For you", "You gave " + nm(lk.side) + " a thumbs up");
      if (friendly) why = why.filter(function (x) { return x.tag === "For you" || x.tag === "Your player"; });
      if (veto || !why.length) return;
      why.sort(function (a, b) { return b.sc - a.sc; });
      // a league DJ watches a lot lifts its big games; late starts he usually drops sink
      var score = why[0].sc + (why[1] ? why[1].sc / 3 : 0) + Math.min(12, (aff[g.league] || 0));
      var late = hourCT(g.start) >= 21, nLate = rems.filter(function (e) { return e.league === g.league && hourCT(e.start) >= 21; }).length;
      if (late && nLate >= 3) score -= 10;
      if ((aff[g.league] || 0) <= 0 && why[0].tag === "Spotlight") return;
      // your thumbs: liked teams, leagues and kinds of games rise (at most +15), disliked ones sink (down to -40)
      var fa = fbAdj(g, why[0].tag); if (fa.veto) return;
      score += fa.adj;
      if (score < 45) return;
      // the best reason, plus the personal one (or the media one) when both kinds apply
      var mine = function (x) { return x.tag === "For you" || x.tag === "Your player"; }, other = why.filter(function (x) { return mine(x) !== mine(why[0]); })[0];
      var fw = fa.adj >= 6 && !other && !mine(why[0]) ? fbTopWords(fa.top) : "";
      var text = why[0].text + (other ? " · " + other.text : fw ? " · " + fw : "");
      out.push({ g: g, score: score, tag: why[0].tag, why: text });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    // some variety: at most two from one league while others qualify
    var pick = [], perLg = {};
    out.forEach(function (s2) { if (pick.length < 3 && (perLg[s2.g.league] || 0) < 2) { pick.push(s2); perLg[s2.g.league] = (perLg[s2.g.league] || 0) + 1; } });
    out.forEach(function (s2) { if (pick.length < 3 && pick.indexOf(s2) === -1) pick.push(s2); });
    return pick;
  }
  // a rule that would have picked most of the games DJ keeps adding by hand
  function ruleSuggestions() {
    if (!ACT.loaded) return [];
    var rec = actRecent(30), adds = uniq(rec.filter(function (e) { return e.a === "add"; })), skipped = {};
    rec.concat(actRecent(365).filter(function (e) { return e.a === "skiprule"; })).forEach(function (e) { if (e.a === "skiprule") skipped[e.k] = 1; });
    var by = {}; adds.forEach(function (e) { (by[e.league] = by[e.league] || []).push(e); });
    var out = [];
    Object.keys(by).forEach(function (lg) {
      var list = by[lg], b = lgRules(lg); if (list.length < 3 || b.all) return;
      var best = null;
      (LG_OPTS[lg] || []).forEach(function (key) {
        if (key === "all" || b[key]) return;
        (CHOICES[key] || [true]).forEach(function (v) {
          if (skipped[lg + ":" + key]) return;
          var n = list.filter(function (e) { try { return !!MATCH[key](e, v); } catch (x) { return false; } }).length;
          if (n >= 3 && n / list.length >= 0.6 && (!best || n > best.n)) best = { lg: lg, key: key, v: v, n: n, m: list.length };
        });
      });
      if (best) out.push(best);
    });
    return out.map(function (s2) {
      s2.title = "Add " + (LEAGUES[s2.lg] || {}).name + ": " + optShort(s2.lg, s2.key, s2.v);
      s2.why = s2.n + " of the " + s2.m + " " + ((LEAGUES[s2.lg] || {}).tag || "") + " games you added by hand were " + (optPhrase(s2.lg, s2.key, s2.v) || "this kind") + ".";
      return s2;
    });
  }
  function walBlock() {
    var gs = liveSuggestions(); if (!gs.length) return null;
    // always open at the top of today's slate while there's something to show (it goes away when there isn't)
    var sec = el("section", "sl-sec wal"), hb = el("div", "sl-h wal-head");
    hb.appendChild(el("b", null, "Worth a look"));
    var lv = el("span", "sl-live"); lv.appendChild(el("i")); var nLive = gs.filter(function (x) { return !x.done; }).length;
    lv.appendChild(document.createTextNode(nLive + " live")); if (nLive) hb.appendChild(lv);
    sec.appendChild(hb);
    var list = el("div", "wal-list");
    gs.forEach(function (s2) {
      var c = el("div", "wal-item");
      var wy = el("div", "wal-why"), lgl = el("span", "sugg-lg"), lic = sportIcon(s2.g.league); if (lic) lgl.appendChild(lic); lgl.appendChild(document.createTextNode(info(s2.g).tag || ""));
      wy.appendChild(lgl); wy.appendChild(el("span", "sugg-tag" + (s2.done ? " done" : " live"), s2.done ? (s2.tag ? s2.tag + " · Final" : "Final") : s2.tag)); var v2 = s2.done ? null : scoreRaw(s2.g.id), sp2 = BX_SPORT[s2.g.league], ext = "";
      if (v2 && sp2 === "bball" && s2.tag !== "Big night") ext = liveTopScorer(v2);
      // the reason sits under the matchup like the slate's one-liners: red while live, plain once it's final
      // a close game's margin and clock are already on the row, so its line says something the row doesn't:
      // who's leading the way (the standout so far); with nothing to add, no line
      var whyTx; if (s2.done) { var fl = ""; try { fl = walFinalLine(s2.g); } catch (e) {} whyTx = fl || (s2.tag === "Close finish" ? "" : s2.why); }
      else if (s2.tag === "Close finish") { var ll = ""; try { ll = liveLeadLine(s2.g); } catch (e) {} whyTx = ll; }
      else whyTx = s2.why + (ext ? ". " + ext : "");
      wy.appendChild(el("span", "wal-tx"));
      // 👍 / 👎 (3.57.0): thumbs down hides it, like the old ✕, and both teach what you want here
      wy.appendChild(thumbPair(s2.g, "wal", s2.tag, function () { var m = walKeep(); delete m[todayInHome() + "|" + s2.g.id]; walKeepSet(m); }));
      c.appendChild(wy);
      // the game row keeps its own + / ✓ like All games; remember the reason when you add it so it stays here, ticked
      c.addEventListener("click", function (e) {
        if (!e.target.closest || !e.target.closest(".add")) return;
        var k = todayInHome() + "|" + s2.g.id, m = walKeep();
        if (!inLineup(s2.g.id)) { m[k] = { tag: s2.tag, why: s2.why }; logAct("accept", s2.g, { why: s2.tag }); } else delete m[k];
        walKeepSet(m);
      }, true);
      var gr0 = gameRow(s2.g, "games"), wl = whyTx ? hlLine(s2.g, whyTx, teamOfText(s2.g, whyTx), "hl " + (s2.done ? "hl-pre" : "hl-live")) : null;
      if (wl) [].slice.call(gr0.querySelectorAll(":scope > .hl")).forEach(function (h) { h.remove(); });  // one line per card: Worth a look's own reason replaces the card's usual line (3.39.2)
      if (wl) { var trayEl = gr0.querySelector(".tray"); if (trayEl) gr0.insertBefore(wl, trayEl); else gr0.appendChild(wl); }
      c.appendChild(gr0);
      list.appendChild(c);
    });
    sec.appendChild(list);
    return sec;
  }
  function suggestionBlock(where) {
    if (where === "live") return walBlock();
    var gs = where === "slate" ? gameSuggestions() : [], rs = ruleSuggestions();
    if (!gs.length && !rs.length) return null;
    var w = el("div", "sugg" + (where === "live" ? " sugg-live" : ""));
    var h = el("div", "sec"); h.appendChild(el("h2", null, where === "live" ? "Worth a look right now" : where === "slate" ? "Suggested for you" : "Suggested rules")); w.appendChild(h);
    gs.forEach(function (s2) {
      var c = el("div", "sugg-g");
      var wy = el("div", "sugg-why"), lgl = el("span", "sugg-lg"); var lic = sportIcon(s2.g.league); if (lic) lgl.appendChild(lic); lgl.appendChild(document.createTextNode(info(s2.g).tag || ((LEAGUES[s2.g.league] || {}).name) || ""));
      var hd = el("div", "sugg-hd"); hd.appendChild(lgl); hd.appendChild(el("span", "sugg-tag" + (s2.live ? " live" : ""), s2.tag)); c.appendChild(hd);
      wy.appendChild(el("span", "sugg-tx", s2.why)); c.appendChild(wy);
      c.appendChild(gameRow(s2.g, "games"));
      var bt = el("div", "sugg-bt");
      var yes = el("button", "sugg-on", "Add to slate"); yes.type = "button";
      yes.addEventListener("click", function () { logAct("accept", s2.g, { why: s2.tag }); toggle(s2.g.id); });
      bt.appendChild(thumbPair(s2.g, "sugg", s2.tag)); bt.appendChild(yes); c.appendChild(bt); w.appendChild(c);
    });
    rs.forEach(function (s2) {
      var c = el("div", "sugg-r");
      var tx = el("div", "sugg-rt"); tx.appendChild(el("b", null, s2.title)); var wy = el("span", "sugg-why"); wy.appendChild(icon("sparkle")); wy.appendChild(el("span", null, s2.why)); tx.appendChild(wy); c.appendChild(tx);
      var bt = el("div", "sugg-bt");
      var on = el("button", "sugg-on", "Turn on"); on.type = "button"; on.addEventListener("click", function () { setLg(s2.lg, s2.key, s2.v); toast("Rule on: " + s2.title.replace(/^Add /, "")); });
      var no = el("button", "sugg-x", "No thanks"); no.type = "button"; no.addEventListener("click", function () { ACT.log.push({ a: "skiprule", k: s2.lg + ":" + s2.key, t: new Date().toISOString() }); actSave(); keepScroll(render); });
      bt.appendChild(on); bt.appendChild(no); c.appendChild(bt); w.appendChild(c);
    });
    return w;
  }

  function rulesChanged() { saveSettings(); maybeAutoAdd(); render(); }
  function svgIcon(d, fill) {
    var NS = "http://www.w3.org/2000/svg", sv = document.createElementNS(NS, "svg"), pa = document.createElementNS(NS, "path");
    sv.setAttribute("viewBox", "0 0 24 24"); sv.setAttribute("aria-hidden", "true");
    if (fill) sv.setAttribute("fill", "currentColor"); else { sv.setAttribute("fill", "none"); sv.setAttribute("stroke", "currentColor"); sv.setAttribute("stroke-width", "1.9"); sv.setAttribute("stroke-linecap", "round"); sv.setAttribute("stroke-linejoin", "round"); }
    pa.setAttribute("d", d); sv.appendChild(pa); return sv;
  }
  var RULE_ICONS = {
    favorites: ["m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8z", true],
    events: ["M12 3c.5 3 3 4.5 3 8a3 3 0 0 1-6 0c0-1.5.6-2.4 1.3-3.2C11.2 6.6 12 5 12 3zM7.5 13.5A4.5 4.5 0 0 0 12 21a6 6 0 0 0 6-6c0-2.2-1-3.8-2-5", false]
  };
  function countMatching(fn) { return games().filter(fn).length; }
  function joinList(a, w) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " " + (w || "and") + " " + a[a.length - 1]; }
  // per-league option wording
  function optInfo(k, key) {
    var L = LEAGUES[k] || {}, n = TOP_N[k] || 4, soc = SOCCER[k];
    switch (key) {
      case "ranked": return { t: "Ranked matchups", p: "AP Top 25 teams.", c: [["both", "Both teams ranked"], ["top10", "A top-10 team"], ["any", "Any ranked team"]] };
      case "bigsix": return { t: "Big Six", p: k === "epl" ? "Arsenal, Chelsea, Liverpool, Man City, Man United and Spurs." : "Premier League Big Six clubs: Arsenal, Chelsea, Liverpool, Man City, Man United, Spurs.", c: [["both", "Big Six clash"], ["any", "Any Big Six club"]] };
      case "bigclubs": return { t: "Europe's giants", p: "Real Madrid, Barcelona, Bayern, PSG, Man City, Liverpool, Arsenal, Inter, Juventus and the like.", c: [["both", "Giants meet"], ["any", "Any giant"]] };
      case "english": return { t: "English clubs", p: "Any game with a Premier League club." };
      case "knockout": return { t: "Knockout rounds", p: "Playoffs, round of 16, quarterfinals, semifinals and the final." };
      case "usa": return { t: "USA", p: "Every U.S. national team game." };
      case "bignations": return { t: "Big nations", p: "Argentina, Brazil, France, England, Spain, Germany, Portugal and other heavyweights.", c: [["both", "Heavyweight clash"], ["any", "Any big nation"]] };
      case "competitive": return { t: "Games that count", p: "World Cup and qualifiers, Nations League, Gold Cup, Copa América and the Euros. No friendlies." };
      case "top": return { t: soc ? "Top of the table" : "Top teams", p: soc ? "Both clubs in the top " + n + " of the table." : "Both teams in the top " + n + " of their conference." };
      case "cup": return { t: "NBA Cup", p: "Every NBA Cup game: group play, the knockout rounds and the final." };
      case "prime": return { t: "Prime time", p: "Kickoff at 7 PM or later: Thursday, Sunday and Monday night." };
      case "division": return { t: "Division games", p: "Both teams from the same division." };
      case "winning": return { t: "Winning teams", p: "Both teams have winning records." };
      case "national": return { t: "On national TV", p: k === "nba" ? "ABC, ESPN, NBC, Peacock, Prime Video and NBA TV." : k === "nhl" ? "ABC, ESPN, TNT and NHL Network, not ESPN+ or Hulu." : k === "epl" ? "NBC, USA and CNBC picks, not Peacock-only games." : SOCCER[k] ? "On a TV channel, not a streaming app." : L.college ? "ESPN, ABC, FOX, CBS, NBC and the conference networks." : "A national channel, not local TV or an app." };
      case "all": return { t: "Every game", p: "Every " + (L.name || k) + " game, all day." };
    }
    return { t: key, p: "" };
  }
  function optShort(k, key, v) {
    if (key === "ranked") return v === "both" ? "Both ranked" : v === "top10" ? "Top-10 team" : "Any ranked team";
    if (key === "bigsix") return v === "both" ? "Big Six clash" : "Any Big Six club";
    if (key === "bigclubs") return v === "both" ? "Giants meet" : "Any giant";
    if (key === "bignations") return v === "both" ? "Heavyweight clash" : "Any big nation";
    if (key === "top") return SOCCER[k] ? "Top of the table" : "Top " + (TOP_N[k] || 4) + " teams";
    return { cup: "NBA Cup", prime: "Prime time", division: "Division games", winning: "Winning teams", national: "National TV", all: "Every game", english: "English clubs", knockout: "Knockouts", usa: "USA", competitive: "Games that count" }[key] || key;
  }
  function optPhrase(k, key, v) {
    if (key === "ranked") return v === "both" ? "with two ranked teams" : v === "top10" ? "with a top-10 team" : "with a ranked team";
    if (key === "bigsix") return v === "both" ? "between Big Six clubs" : "with a Big Six club";
    if (key === "bigclubs") return v === "both" ? "between Europe's giants" : "with one of Europe's giants";
    if (key === "bignations") return v === "both" ? "between big nations" : "with a big nation";
    if (key === "top") return SOCCER[k] ? "between top-" + (TOP_N[k] || 4) + " clubs" : "between top-" + (TOP_N[k] || 4) + " teams";
    return { cup: "in the NBA Cup", prime: "in prime time", division: "between division rivals", winning: "between winning teams", national: "on national TV", english: "with an English club", knockout: "in the knockout rounds", usa: "with the USA", competitive: "that count" }[key] || "";
  }
  function rulesSentence() {
    var r = state.rules, parts = [], groups = {}, order = [];
    if (r.favorites) parts.push("your teams");
    if (r.events) parts.push("the big events you picked");
    var every = [];
    ORDER.forEach(function (k) {
      var b = (r.by || {})[k]; if (!b) return;
      var tag = (LEAGUES[k] || {}).tag || k.toUpperCase();
      if (b.all) { every.push(tag); return; }
      var ph = (LG_OPTS[k] || []).filter(function (key) { return b[key]; }).map(function (key) { return optPhrase(k, key, b[key]); });
      if (!ph.length) return;
      var key = joinList(ph, "or"); if (!groups[key]) { groups[key] = []; order.push(key); } groups[key].push(tag);
    });
    order.forEach(function (key) { parts.push(joinList(groups[key]) + " games " + key); });
    if (every.length) parts.push("every " + joinList(every) + " game");
    if (!parts.length) return "No rules are on yet. Turn one on below, or add games by hand.";
    var lim = [];
    if (r.after) lim.push("starting at " + fmtHour(r.after) + " or later");
    if (r.max) lim.push("up to " + r.max + " games");
    return "Your slate picks " + joinList(parts) + (lim.length ? ", " + lim.join(", ") : "") + ".";
  }
  function switchEl(on, label, onChange) {
    var b = el("button", "switch"); b.type = "button"; b.setAttribute("role", "switch"); b.setAttribute("aria-checked", on ? "true" : "false"); b.setAttribute("aria-label", label);
    b.appendChild(el("span", "knob"));
    b.addEventListener("click", function () { onChange(!on); });
    return b;
  }
  function pillSelect(label, value, opts, onChange) {
    var w = el("label", "pillsel"), cur = opts.filter(function (o) { return String(o[0]) === String(value); })[0] || opts[0];
    w.appendChild(el("span", null, cur[1])); var ch = el("i", null, "▾"); ch.setAttribute("aria-hidden", "true"); w.appendChild(ch);
    var sl = document.createElement("select"); sl.setAttribute("aria-label", label);
    opts.forEach(function (o) { var op = document.createElement("option"); op.value = String(o[0]); op.textContent = o[2] || o[1]; if (o === cur) op.selected = true; sl.appendChild(op); });
    sl.addEventListener("change", function () { var o = opts.filter(function (x) { return String(x[0]) === sl.value; })[0]; onChange(o[0]); });
    w.appendChild(sl); if (String(cur[0]) !== "0" && cur[0] !== "off") w.classList.add("on");
    return w;
  }
  function ruleRow(key, title, sub, on, count, onToggle, extra) {
    var row = el("div", "rrow" + (on ? " on" : ""));
    var ic = el("span", "ricon"); ic.appendChild(svgIcon(RULE_ICONS[key][0], RULE_ICONS[key][1])); row.appendChild(ic);
    var t = el("div", "rtext");
    var tl = el("div", "rtitle"); tl.appendChild(el("b", null, title));
    if (count) tl.appendChild(el("span", "rcount", count + " " + whenWord()));
    t.appendChild(tl); t.appendChild(el("p", null, sub));
    if (on && extra) t.appendChild(extra);
    row.appendChild(t);
    row.appendChild(switchEl(on, title, onToggle));
    return row;
  }
  function whenWord() { return state.date === todayInHome() ? "tonight" : "that day"; }
  function setLg(k, key, v) {
    var r = state.rules; r.by = r.by || {};
    var b = r.by[k] = r.by[k] || {};
    if (v) b[key] = v; else delete b[key];
    if (!Object.keys(b).length) delete r.by[k];
    rulesChanged();
  }
  function lgCard(k, cnt, when) {
    var b = lgRules(k), opts = LG_OPTS[k] || [], on = opts.filter(function (key) { return b[key]; }), c = cnt[k] || 0;
    var open = !!(state.lgOpen && state.lgOpen[k]);
    var card = el("section", "lgcard" + (on.length ? " on" : "") + (open ? " open" : ""));
    var head = el("button", "lg-head"); head.type = "button"; head.setAttribute("aria-expanded", open ? "true" : "false");
    var ic = sportIcon(k); if (ic) { ic.classList.add("sp"); head.appendChild(ic); } else head.appendChild(el("span"));
    var tx = el("span", "lg-tx"); tx.appendChild(el("b", null, LEAGUES[k].name));
    var picked = on.length ? countMatching(function (g) { return g.league === k && !!lgHit(g); }) : 0;
    var sum = on.length ? (b.all ? "Every game" : on.map(function (key) { return optShort(k, key, b[key]); }).join(", ")) : "Off";
    var sm = el("span", "lg-sum", sum);
    tx.appendChild(sm); head.appendChild(tx);
    head.appendChild(el("span", "lg-n" + (on.length && !picked ? " zero" : ""), on.length ? (picked ? picked + " " + when : "None " + when) : c ? c + (c === 1 ? " game" : " games") : ""));
    var NS = "http://www.w3.org/2000/svg", chev = document.createElementNS(NS, "svg"), cp = document.createElementNS(NS, "path");
    chev.setAttribute("viewBox", "0 0 24 24"); chev.setAttribute("fill", "none"); chev.setAttribute("stroke", "currentColor"); chev.setAttribute("stroke-width", "2.2"); chev.setAttribute("stroke-linecap", "round"); chev.setAttribute("stroke-linejoin", "round"); chev.setAttribute("aria-hidden", "true"); chev.setAttribute("class", "lg-chev");
    cp.setAttribute("d", "m6 9 6 6 6-6"); chev.appendChild(cp); head.appendChild(chev);
    head.addEventListener("click", function () { state.lgOpen = state.lgOpen || {}; state.lgOpen[k] = !open; renderRules(); });
    card.appendChild(head);
    if (!open) return card;
    var body = el("div", "lg-body");
    var list = b.all ? ["all"] : opts;
    list.forEach(function (key) {
      var oi = optInfo(k, key), val = b[key], isOn = !!val;
      var row = el("div", "lopt" + (isOn ? " on" : ""));
      var t = el("div", "rtext"), tl = el("div", "rtitle"); tl.appendChild(el("b", null, oi.t));
      var probe = isOn ? val : oi.c ? oi.c[0][0] : true;
      var n = key === "all" ? c : countMatching(function (g) { return g.league === k && !!MATCH[key](g, probe); });
      if (n) tl.appendChild(el("span", "rcount", n + " " + when));
      t.appendChild(tl); t.appendChild(el("p", null, oi.p));
      if (isOn && oi.c) {
        var ch = el("div", "rchoice");
        oi.c.forEach(function (o) {
          var bt = el("button", null, o[1]); bt.type = "button"; bt.setAttribute("aria-pressed", val === o[0] ? "true" : "false");
          var cc = countMatching(function (g) { return g.league === k && !!MATCH[key](g, o[0]); }); if (cc) bt.appendChild(el("i", null, String(cc)));
          bt.addEventListener("click", function () { setLg(k, key, o[0]); });
          ch.appendChild(bt);
        });
        t.appendChild(ch);
      }
      row.appendChild(t);
      row.appendChild(switchEl(isOn, oi.t + ", " + LEAGUES[k].name, function (v) { setLg(k, key, v ? (oi.c ? oi.c[0][0] : true) : null); }));
      body.appendChild(row);
    });
    if (b.all) body.appendChild(el("p", "lg-note", "Every game is in, so the other " + LEAGUES[k].name + " rules are hidden. Turn this off to pick by rule."));
    card.appendChild(body);
    return card;
  }
  // Big events: every event, or only the ones DJ picks from the full list of upcoming events (built daily by the script)
  var EVCAT = null, evCatAsked = false;
  function loadEvCat() {
    if (evCatAsked || !db) return; evCatAsked = true;
    try { db.doc("events/catalog").get().then(function (sn) { EVCAT = sn.exists ? (sn.data() || {}).events || {} : {}; if (state.view === "rules") keepScroll(renderRules); }, function () { EVCAT = {}; }); } catch (e) { EVCAT = {}; }
  }
  function eventList() {
    var today = todayInHome(), out = {}, add = function (name, lg, first, n) {
      var k = name.toLowerCase(), e = out[k] || (out[k] = { name: name, lg: [], first: first, n: 0 });
      lg.forEach(function (l) { if (e.lg.indexOf(l) === -1) e.lg.push(l); }); if (first < e.first) e.first = first; e.n = Math.max(e.n, n);
    };
    Object.keys(EVCAT || {}).forEach(function (k) { var e = EVCAT[k]; if ((e.first || "") >= today || (e.dates || []).some(function (d) { return d >= today; })) add(e.name, e.lg || [], e.first || today, e.n || 0); });
    var day = {}; games().forEach(function (g) { if (isEvent(g)) { var k = eventKey(g); (day[k] = day[k] || []).push(g); } });
    Object.keys(day).forEach(function (k) { add(k, [day[k][0].league], state.date, day[k].length); });
    return Object.keys(out).map(function (k) { return out[k]; }).sort(function (a, b) { return a.first < b.first ? -1 : a.first > b.first ? 1 : a.name.localeCompare(b.name); });
  }
  function eventPicker() {
    loadEvCat();
    var r = state.rules, box = el("div", "evpick");
    var all = EVCAT ? eventList() : [];
    // one row per group (by sport), each with its events inside
    var groups = {}, order = [];
    all.forEach(function (e) { e.lg.forEach(function (l) { var gid = evGroup(e.name, l); if (!groups[gid]) { groups[gid] = []; order.push(gid); } if (groups[gid].indexOf(e) === -1) groups[gid].push(e); }); });
    var SP = ["ncaaf", "ncaam", "ncaaw", "nfl", "nba", "nhl", "mlb", "wnba", "soccer", "other"];
    order.sort(function (a2, b2) { var sa = SP.indexOf(a2.split(":")[0]), sb = SP.indexOf(b2.split(":")[0]); return sa - sb || (groups[a2][0].first < groups[b2][0].first ? -1 : 1); });
    box.appendChild(el("p", "ev-hint", EVCAT ? "Switch on the kinds of events you want. New ones in that group join your slate automatically; open a group to include or skip single events." : "Loading upcoming events…"));
    var lastSp = "";
    order.forEach(function (gid) {
      var sp = gid.split(":")[0];
      if (sp !== lastSp) {
        lastSp = sp;
        var mine = order.filter(function (x) { return x.split(":")[0] === sp; }), nOnG = mine.filter(evGroupOn).length, sOpen = !!(state.evSportOpen && state.evSportOpen[sp]);
        var sh = el("button", "ev-sport" + (sOpen ? " open" : "")); sh.type = "button"; sh.setAttribute("aria-expanded", sOpen ? "true" : "false");
        sh.appendChild(el("b", null, EV_SPORT[sp] || "Other"));
        sh.appendChild(el("span", null, mine.length === 1 ? (nOnG ? "On" : "Off") : nOnG === mine.length ? "All " + mine.length + " groups on" : nOnG ? nOnG + " of " + mine.length + " groups on" : "All off"));
        sh.appendChild(icon("more"));
        sh.addEventListener("click", function () { state.evSportOpen = state.evSportOpen || {}; state.evSportOpen[sp] = !sOpen; keepScroll(renderRules); });
        box.appendChild(sh);
      }
      if (!(state.evSportOpen && state.evSportOpen[sp])) return;
      var list = groups[gid], on = evGroupOn(gid), nOn = list.filter(function (e) { return evNameOn(e.name, gid); }).length;
      var open = !!(state.evOpenG && state.evOpenG[gid]);
      var row = el("div", "ev-grp" + (open ? " open" : ""));
      var hd = el("button", "ev-gh"); hd.type = "button"; hd.setAttribute("aria-expanded", open ? "true" : "false");
      var tx = el("span", "ev-tx"); tx.appendChild(el("b", null, EV_CAT[gid] || "Other events"));
      var nx = list[0], when = nx.first === todayInHome() ? "today" : fmtDate(nx.first, { month: "short", day: "numeric" });
      tx.appendChild(el("span", null, list.length + (list.length === 1 ? " event" : " events") + (nOn && nOn < list.length ? " · " + nOn + " on" : "") + " · next " + when));
      hd.appendChild(tx); hd.appendChild(icon("more"));
      hd.addEventListener("click", function () { state.evOpenG = state.evOpenG || {}; state.evOpenG[gid] = !open; keepScroll(renderRules); });
      row.appendChild(hd);
      row.appendChild(switchEl(on, EV_CAT[gid] || "Other events", function (v) {
        r.eventGroups = r.eventGroups || {}; r.eventGroups[gid] = v;
        var names = list.map(function (e) { return e.name.toLowerCase(); });
        r.eventsOn = (r.eventsOn || []).filter(function (x) { return names.indexOf(x.toLowerCase()) === -1; });
        r.eventsOff = (r.eventsOff || []).filter(function (x) { return names.indexOf(x.toLowerCase()) === -1; });
        rulesChanged();
      }));
      if (open) {
        var inner = el("div", "ev-list");
        list.forEach(function (e) {
          var eo = evNameOn(e.name, gid), b = el("button", "ev" + (eo ? " on" : "")); b.type = "button"; b.setAttribute("aria-pressed", eo ? "true" : "false");
          b.appendChild(icon(eo ? "check" : "plus"));
          var t2 = el("span", "ev-tx"); t2.appendChild(el("b", null, e.name));
          t2.appendChild(el("span", null, (e.first === todayInHome() ? "Today" : fmtDate(e.first, { month: "short", day: "numeric" })) + (e.n ? " · " + e.n + (e.n === 1 ? " game" : " games") : ""))); b.appendChild(t2);
          b.addEventListener("click", function () {
            var lk = e.name.toLowerCase();
            r.eventsOn = (r.eventsOn || []).filter(function (x) { return x.toLowerCase() !== lk; });
            r.eventsOff = (r.eventsOff || []).filter(function (x) { return x.toLowerCase() !== lk; });
            var want = !eo; if (want !== evGroupOn(gid)) (want ? r.eventsOn : r.eventsOff).push(e.name);
            rulesChanged();
          });
          inner.appendChild(b);
        });
        row.appendChild(inner);
      }
      box.appendChild(row);
    });
    return box;
  }

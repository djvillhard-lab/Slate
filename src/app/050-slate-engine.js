  // ---------- the slate engine: rules pick the games; manual adds and removals stick ----------
  // Rules v2: two global rules (your teams, big events), then per-league rules that fit each sport.
  var RULE_DEFAULTS = { v: 2, favorites: true, events: true, after: 0, max: 0, by: { ncaaf: { ranked: "both" }, ncaam: { ranked: "both" } } };
  var EVENT_RX = /(classic|tournament|invitational|showcase|challenge|rivalry|cup|bowl|final|playoff|championship|derby|world series|battle|clash|tip-off|tipoff|opener)/i;
  function isEvent(g) { return !!(g.note && EVENT_RX.test(g.note) && !/group (play|stage)/i.test(g.note)); }
  // which events count: every one (minus any switched off), or only the ones DJ picked
  function eventKey(g) { return String(g.note || "").split(" - ")[0].trim(); }
  // events sorted into groups you can switch on whole (Bowl games, Conference championships…), with single events overridable
  var CONF_RX = /\b(acc|sec|big ten|big 12|big east|pac-12|a-10|atlantic 10|aac|american athletic|mountain west|wcc|west coast|mvc|missouri valley|mac|sun belt|c-usa|conference usa|horizon|summit|big sky|big west|caa|coastal athletic|colonial|ivy|patriot|swac|meac|ohio valley|asun|southland|southern|northeast|america east|maac|wac)\b.*\b(tournament|championship)/i;
  var EV_SPORT = { ncaaf: "College football", ncaam: "Men's college hoops", ncaaw: "Women's college hoops", nfl: "NFL", nba: "NBA", nhl: "NHL", mlb: "MLB", wnba: "WNBA", soccer: "Soccer" };
  var EV_CAT = {
    "ncaaf:cfp": "College Football Playoff", "ncaaf:bowls": "Bowl games", "ncaaf:confchamp": "Conference championships", "ncaaf:classics": "Rivalries and classics",
    "ncaam:ncaa": "NCAA Tournament and postseason", "ncaam:conftourn": "Conference tournaments", "ncaam:challenges": "Conference challenges", "ncaam:mte": "Holiday tournaments and classics",
    "ncaaw:ncaa": "NCAA Tournament and postseason", "ncaaw:conftourn": "Conference tournaments", "ncaaw:challenges": "Conference challenges", "ncaaw:mte": "Holiday tournaments and classics",
    "nfl:sb": "Super Bowl", "nfl:playoffs": "Playoffs", "nfl:other": "Special games", "nba:cup": "NBA Cup", "nba:playoffs": "Play-in and playoffs", "nba:other": "Special games",
    "nhl:outdoor": "Outdoor and special games", "nhl:playoffs": "Playoffs", "nhl:other": "Special games", "mlb:playoffs": "Postseason", "mlb:other": "Special games",
    "wnba:playoffs": "Playoffs", "wnba:other": "Special games", "soccer:finals": "Finals", "soccer:cups": "Cup ties and derbies"
  };
  function evSport(lg) { return SOCCER[lg] ? "soccer" : EV_SPORT[lg] ? lg : "other"; }
  function evGroup(name, lg) {
    var n = String(name || "").toLowerCase(), sp = evSport(lg), c = "other";
    if (sp === "ncaaf") c = /playoff|national championship/.test(n) ? "cfp" : /bowl/.test(n) ? "bowls" : /championship/.test(n) ? "confchamp" : "classics";
    else if (sp === "ncaam" || sp === "ncaaw") c = /ncaa|march madness|final four|basketball championship|\bnit\b|crown/.test(n) ? "ncaa" : CONF_RX.test(n) ? "conftourn" : /challenge|battle|series|showdown/.test(n) && /(acc|sec|big|pac|east|ten|12|american|mountain|west)/.test(n) ? "challenges" : "mte";
    else if (sp === "nfl") c = /super bowl/.test(n) ? "sb" : /playoff|wild card|divisional|championship/.test(n) ? "playoffs" : "other";
    else if (sp === "nba") c = /cup/.test(n) ? "cup" : /play-in|playoff|finals|conference/.test(n) ? "playoffs" : "other";
    else if (sp === "nhl") c = /winter classic|stadium series|heritage|global series|outdoor/.test(n) ? "outdoor" : /playoff|stanley cup|final/.test(n) ? "playoffs" : "other";
    else if (sp === "mlb" || sp === "wnba") c = /world series|playoff|wild card|division series|championship series|finals/.test(n) ? "playoffs" : "other";
    else if (sp === "soccer") c = /final/.test(n) ? "finals" : "cups";
    return sp + ":" + c;
  }
  function evGroupOn(gid) { var r = state.rules || RULE_DEFAULTS, m = r.eventGroups || {}; return gid in m ? !!m[gid] : r.eventMode !== "pick"; }
  function evNameOn(name, gid) {
    var r = state.rules || RULE_DEFAULTS, k = String(name).toLowerCase();
    if ((r.eventsOn || []).some(function (x) { return x.toLowerCase() === k; })) return true;
    if ((r.eventsOff || []).some(function (x) { return x.toLowerCase() === k; })) return false;
    return evGroupOn(gid);
  }
  function eventOn(g) { return isEvent(g) && evNameOn(eventKey(g), evGroup(eventKey(g), g.league)); }
  var SOCCER = { mls: 1, epl: 1, ucl: 1, uel: 1, facup: 1, laliga: 1, seriea: 1, bundesliga: 1, ligue1: 1, intl: 1 };
  var LG_OPTS = {
    ncaaf: ["ranked", "national", "all"], ncaam: ["ranked", "national", "all"], ncaaw: ["ranked", "national", "all"],
    nfl: ["prime", "division", "winning", "all"],
    nba: ["national", "top", "winning", "cup", "all"], nhl: ["national", "top", "winning", "all"], wnba: ["national", "top", "winning", "all"],
    mlb: ["national", "winning", "all"],
    epl: ["bigsix", "top", "national", "all"],
    ucl: ["bigclubs", "english", "knockout", "bigsix", "national", "all"], uel: ["bigclubs", "english", "knockout", "bigsix", "national", "all"], facup: ["bigsix", "national", "all"],
    mls: ["top", "national", "all"], laliga: ["top", "national", "all"], seriea: ["top", "national", "all"], bundesliga: ["top", "national", "all"], ligue1: ["top", "national", "all"],
    intl: ["usa", "bignations", "competitive", "national", "all"]
  };
  var CHOICES = { ranked: ["both", "top10", "any"], bigsix: ["both", "any"], bigclubs: ["both", "any"], bignations: ["both", "any"] };
  // Europe's giants, English clubs and the big footballing nations (matched on ESPN's full names)
  var BIG_CLUBS = ["real madrid", "barcelona", "atletico madrid", "atlético madrid", "bayern", "dortmund", "paris saint-germain", "manchester city", "manchester united", "liverpool", "arsenal", "chelsea", "tottenham", "internazionale", "inter milan", "ac milan", "juventus", "napoli"];
  var ENGLISH = ["arsenal", "aston villa", "bournemouth", "brentford", "brighton", "burnley", "chelsea", "crystal palace", "everton", "fulham", "ipswich", "leeds", "leicester", "liverpool", "manchester city", "manchester united", "newcastle", "nottingham forest", "southampton", "sunderland", "tottenham", "west ham", "wolverhampton"];
  var BIG_NATIONS = ["argentina", "brazil", "france", "england", "spain", "germany", "portugal", "netherlands", "italy", "belgium", "croatia", "uruguay", "united states", "mexico"];
  function inList(list, name) { name = String(name || "").toLowerCase(); return list.some(function (c) { return name.indexOf(c) !== -1; }); }
  function isUSA(name) { return /^(united states|usa)\b/i.test(String(name || "").trim()); }
  function isKnockout(g) { var st = String(g.stage || ""), n = String(g.note || ""); return (st && !/league|group|regular/i.test(st)) || /\bleg\b|round of|quarter|semi|final|playoff|knockout/i.test(n); }
  function isCompetitive(g) { var c = String(g.comp || g.leagueLabel || "") + " " + String(g.note || ""); return !!c.trim() && !/friendl/i.test(c) && /world cup|qualif|nations league|gold cup|copa|euro|afcon|asian cup|olympic/i.test(c); }
  var TOP_N = { nba: 4, nhl: 4, wnba: 4, epl: 6, mls: 4, laliga: 4, seriea: 4, bundesliga: 4, ligue1: 4 };
  // channels that are national for a league even though they stream (Prime Video NBA, Peacock NBA, CNBC Premier League…)
  var NAT_EXTRA = { nba: ["prime video", "peacock"], wnba: ["prime video", "ion"], mlb: ["apple tv", "netflix", "peacock"], epl: ["cnbc"], ncaam: ["peacock"], ncaaf: ["peacock", "prime video"] };
  var BIG_SIX = ["arsenal", "chelsea", "liverpool", "manchester city", "manchester united", "tottenham"];
  var NFL_DIV = {};
  [["BUF", "MIA", "NE", "NYJ"], ["BAL", "CIN", "CLE", "PIT"], ["HOU", "IND", "JAX", "JAC", "TEN"], ["DEN", "KC", "LV", "LAC"],
   ["DAL", "NYG", "PHI", "WSH", "WAS"], ["CHI", "DET", "GB", "MIN"], ["ATL", "CAR", "NO", "TB"], ["ARI", "LAR", "LA", "SF", "SEA"]].forEach(function (d, i) { d.forEach(function (t) { NFL_DIV[t] = i + 1; }); });
  function normLg(k, b) {
    var ok = LG_OPTS[k], o = {}, any = false; if (!ok || !b || typeof b !== "object") return null;
    ok.forEach(function (key) {
      var v = b[key];
      if (CHOICES[key]) { if (CHOICES[key].indexOf(v) !== -1) { o[key] = v; any = true; } }
      else if (v === true) { o[key] = true; any = true; }
    });
    return any ? o : null;
  }
  function normRules(r) {
    r = r || {};
    var o = { v: 2, favorites: true, events: true, after: 0, max: 0, by: {} };
    if (typeof r.favorites === "boolean") o.favorites = r.favorites;
    if (typeof r.events === "boolean") o.events = r.events;
    o.eventMode = r.eventMode === "pick" ? "pick" : "all";
    o.eventGroups = {}; if (r.eventGroups && typeof r.eventGroups === "object") Object.keys(r.eventGroups).forEach(function (k) { o.eventGroups[k] = !!r.eventGroups[k]; });
    o.eventsOn = Array.isArray(r.eventsOn) ? r.eventsOn.filter(function (x) { return typeof x === "string"; }).slice(0, 200) : [];
    o.eventsOff = Array.isArray(r.eventsOff) ? r.eventsOff.filter(function (x) { return typeof x === "string"; }).slice(0, 200) : [];
    if ([0, 17, 18, 19, 20].indexOf(Number(r.after)) !== -1) o.after = Number(r.after);
    if ([0, 4, 6, 8, 10].indexOf(Number(r.max)) !== -1) o.max = Number(r.max);
    // golf and F1 (3.119.1): off unless turned on in Slate rules; options in EV_RULES (165-events.js)
    o.sports = {}; if (r.sports && typeof r.sports === "object" && EV_RULES) Object.keys(EV_RULES).forEach(function (k) {
      var b = r.sports[k], ok = {}, any = false; if (!b || typeof b !== "object") return;
      EV_RULES[k].forEach(function (x) { if (b[x[0]] === true) { ok[x[0]] = true; any = true; } });
      if (any) o.sports[k] = ok;
    });
    function put(k, key, v) { if (!LG_OPTS[k] || LG_OPTS[k].indexOf(key) === -1) return; (o.by[k] = o.by[k] || {})[key] = v; }
    if (r.v === 2) {
      if (r.by && typeof r.by === "object") Object.keys(r.by).forEach(function (k) { var b = normLg(k, r.by[k]); if (b) o.by[k] = b; });
    } else if ("ranked" in r || "leagues" in r || "natLeagues" in r || "national" in r) {
      // v1 → v2: one global ranked rule becomes College Football + College Hoops; league picks carry over
      if (CHOICES.ranked.indexOf(r.ranked) !== -1) { put("ncaaf", "ranked", r.ranked); put("ncaam", "ranked", r.ranked); }
      (Array.isArray(r.natLeagues) ? r.natLeagues : []).forEach(function (k) { put(k, "national", true); });
      (Array.isArray(r.leagues) ? r.leagues : []).forEach(function (k) { put(k, "all", true); });
      if (r.national === true) ORDER.forEach(function (k) { put(k, "national", true); });
    } else o.by = clone(RULE_DEFAULTS.by);
    return o;
  }
  function normLineup(d) {
    d = d || {}; var v2 = d.v === 2, ids = Array.isArray(d.ids) ? d.ids.slice() : [];
    return { ids: ids, added: v2 ? (Array.isArray(d.added) ? d.added.slice() : []) : ids.slice(), removed: v2 && Array.isArray(d.removed) ? d.removed.slice() : [], custom: Array.isArray(d.custom) ? d.custom.slice() : [] };
  }
  function natFor(g) {
    var x = NAT_EXTRA[g.league] || [];
    return (g.tv || []).some(function (n) { if (NATIONAL_TV.indexOf(n) !== -1) return true; var l = String(n).toLowerCase(); return x.some(function (e) { return l === e || l.indexOf(e + " ") === 0; }); });
  }
  function hourCT(iso) { var h = Number(new Intl.DateTimeFormat("en-US", { timeZone: HOME_TZ, hour: "numeric", hourCycle: "h23" }).format(new Date(iso))); return h < 4 ? h + 24 : h; }
  function winRec(g, s) {
    var p = String(g[s + "Record"] || "").split("-").map(Number); if (p.length < 2 || p.some(isNaN)) return false;
    return g.league === "nhl" ? p[0] > p[1] + (p[2] || 0) : p[0] > p[1];   // NHL: wins beat losses + OT losses
  }
  function standNo(g, s) { var m = /^(\d+)/.exec(String(g[s + "Standing"] || "")); return m ? Number(m[1]) : 0; }
  function bigSix(name) { name = String(name || "").toLowerCase(); return BIG_SIX.some(function (c) { return name.indexOf(c) !== -1; }); }
  function topLabel(k) { return SOCCER[k] ? "Top of table" : "Top teams"; }
  // each test returns [corner label, priority] or null
  var MATCH = {
    ranked: function (g, v) {
      var ra = Number(g.awayRank) || 0, rh = Number(g.homeRank) || 0, both = ra && rh;
      var ok = v === "both" ? both : v === "top10" ? (ra && ra <= 10) || (rh && rh <= 10) : v === "any" ? ra || rh : false;
      if (!ok) return null;
      return both ? ["Ranked", 80 - (ra + rh) / 4] : v === "top10" ? ["Top 10", 62] : ["Ranked", 35];
    },
    bigsix: function (g, v) { var a = bigSix(g.away), h = bigSix(g.home); return v === "both" ? (a && h ? ["Big Six", 76] : null) : v === "any" && (a || h) ? ["Big Six", 46] : null; },
    bigclubs: function (g, v) { var a = inList(BIG_CLUBS, g.away), h = inList(BIG_CLUBS, g.home); return v === "both" ? (a && h ? ["Giants", 78] : null) : v === "any" && (a || h) ? ["Big club", 48] : null; },
    english: function (g) { return inList(ENGLISH, g.away) || inList(ENGLISH, g.home) ? ["English club", 50] : null; },
    knockout: function (g) { return isKnockout(g) ? ["Knockout", 68] : null; },
    usa: function (g) { return isUSA(g.away) || isUSA(g.home) ? ["USA", 72] : null; },
    bignations: function (g, v) { var a = inList(BIG_NATIONS, g.away), h = inList(BIG_NATIONS, g.home); return v === "both" ? (a && h ? ["Heavyweights", 74] : null) : v === "any" && (a || h) ? ["Big nation", 47] : null; },
    competitive: function (g) { return isCompetitive(g) ? ["Competitive", 58] : null; },
    top: function (g) { var n = TOP_N[g.league] || 4, a = standNo(g, "away"), h = standNo(g, "home"); return a && h && a <= n && h <= n ? [topLabel(g.league), 70] : null; },
    prime: function (g) { return hourCT(g.start) >= 19 ? ["Prime time", 66] : null; },
    division: function (g) { var a = NFL_DIV[abbr(g, "away")], h = NFL_DIV[abbr(g, "home")]; return a && a === h ? ["Division", 56] : null; },
    national: function (g) { return natFor(g) ? ["National TV", 55] : null; },
    winning: function (g) { return winRec(g, "away") && winRec(g, "home") ? ["Winning teams", 52] : null; },
    cup: function (g) { return /nba cup/i.test(String(g.note || "") + " " + String(g.comp || "")) ? ["NBA Cup", 54] : null; },
    all: function (g) { return ["All " + info(g).tag, 40]; }
  };
  function lgRules(k) { var r = state.rules || RULE_DEFAULTS; return (r.by || {})[k] || {}; }
  function lgHit(g) {
    var b = lgRules(g.league), best = null;
    (LG_OPTS[g.league] || []).forEach(function (key) { if (!b[key]) return; var m = MATCH[key](g, b[key]); if (m && (!best || m[1] > best[1])) best = m; });
    return best;
  }
  function ruleHits(g) {
    var r = state.rules || RULE_DEFAULTS, hits = [], fav = !!(r.favorites && hasFav(g));
    if (fav) hits.push(["Your team", 100]);
    var b = lgRules(g.league);
    (LG_OPTS[g.league] || []).forEach(function (key) { if (!b[key]) return; var m = MATCH[key](g, b[key]); if (m) hits.push(m); });
    if (r.events && eventOn(g)) hits.push(["Event", 60]);
    hits.sort(function (a, c) { return c[1] - a[1]; });
    var seen = {}, why = [];
    hits.forEach(function (h) { if (!seen[h[0]]) { seen[h[0]] = 1; why.push(h[0]); } });
    return { why: why, score: hits.length ? hits[0][1] : 0, fav: fav };
  }
  function computeSlate() {
    var r = state.rules || RULE_DEFAULTS, L = state.lineup, removed = {}, cands = [], match = {};
    (L.removed || []).forEach(function (id) { removed[id] = true; });
    games().forEach(function (g) {
      var h = ruleHits(g); if (!h.why.length) return;
      match[g.id] = true;
      if (removed[g.id]) return;
      if (!h.fav && r.after && hourCT(g.start) < r.after) return;
      cands.push({ g: g, why: h.why, score: h.score, fav: h.fav });
    });
    cands.sort(function (a, b) { return b.score - a.score || byStart(a.g, b.g); });
    if (r.max) { var favs = cands.filter(function (c) { return c.fav; }), rest = cands.filter(function (c) { return !c.fav; }); cands = favs.concat(rest.slice(0, Math.max(0, r.max - favs.length))); }
    var ids = [], set = {}, why = {};
    cands.forEach(function (c) { ids.push(c.g.id); set[c.g.id] = true; why[c.g.id] = c.why; });
    state.autoCount = ids.length;
    (L.added || []).forEach(function (id) { if (!set[id] && !removed[id]) { ids.push(id); set[id] = true; why[id] = ["Added"]; } });
    state.slateIds = ids; state.slateSet = set; state.ruleMatch = match; state.why = why;
  }
  function lineupGames() {
    var map = {}; games().forEach(function (g) { map[g.id] = g; });
    var out = state.slateIds.map(function (id) { return map[id]; }).filter(Boolean);
    (state.lineup.custom || []).forEach(function (c) { out.push(customToGame(c)); });
    return out.sort(byStart);
  }
  function confOf(g, side) { return g[side + "Conf"] || ""; }
  var toastTimer = null, undoFn = null;
  function toast(msg, undo, ms) {
    $("toast-msg").textContent = msg; undoFn = undo || null; $("toast-undo").hidden = !undo;
    $("toast").classList.add("show"); clearTimeout(toastTimer);
    // longer notes stay up longer (about 60 ms per character), tap to dismiss
    var t = ms || Math.max(undo ? 4000 : 2200, Math.min(7000, String(msg).length * 60));
    var tb = $("toast"); tb.classList.remove("pop"); void tb.offsetWidth; tb.classList.add("pop");
    tb.onclick = function (e) { if (e.target.id === "toast-undo") return; tb.classList.remove("show"); };
    toastTimer = setTimeout(function () { $("toast").classList.remove("show"); undoFn = null; }, t);
  }


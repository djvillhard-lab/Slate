  "use strict";
  // Slate's version, shown in Settings. Every change DJ asks for bumps it: fixes and tweaks 2.0.1, new features 2.1.0.
  // It must match the newest entry in CHANGELOG.md (build.py checks), and the iPhone app's builds read it from index.html.
  var SLATE_VERSION = "3.116.0";

  var HOME_TZ = "America/Chicago";
  var DEFAULT_TEAMS = ["St. Louis Blues", "St. Louis Cardinals", "Manchester United", "St. Louis City SC"];
  var LEAGUES = {
    nfl: { tag: "NFL", name: "NFL", hrs: 3.5 }, nba: { tag: "NBA", name: "NBA", hrs: 2.5 }, nhl: { tag: "NHL", name: "NHL", hrs: 2.75 },
    mlb: { tag: "MLB", name: "MLB", hrs: 3 }, mls: { tag: "MLS", name: "MLS", hrs: 2 }, epl: { tag: "EPL", name: "Premier League", hrs: 2 },
    ucl: { tag: "UCL", name: "Champions League", hrs: 2 }, uel: { tag: "UEL", name: "Europa League", hrs: 2 }, facup: { tag: "FA", name: "FA Cup", hrs: 2 },
    laliga: { tag: "LIGA", name: "La Liga", hrs: 2 }, seriea: { tag: "SA", name: "Serie A", hrs: 2 }, bundesliga: { tag: "BUN", name: "Bundesliga", hrs: 2 },
    ligue1: { tag: "L1", name: "Ligue 1", hrs: 2 }, intl: { tag: "INTL", name: "International", hrs: 2 },
    ncaaf: { tag: "CFB", name: "College Football", hrs: 3.5, college: true }, ncaam: { tag: "CBB", name: "College Hoops", hrs: 2.25, college: true },
    ncaaw: { tag: "WCBB", name: "Women's Hoops", hrs: 2.25, college: true }, wnba: { tag: "WNBA", name: "WNBA", hrs: 2.25 }
  };
  var ORDER = ["nfl", "ncaaf", "nba", "mlb", "nhl", "ncaam", "mls", "epl", "ucl", "uel", "facup", "laliga", "seriea", "bundesliga", "ligue1", "intl", "ncaaw", "wnba"];
  var STREAMING = ["espn+", "peacock", "hbo max", "max", "hulu", "disney+", "prime video", "amazon", "amzn", "apple tv", "netflix", "paramount+", "nba league pass", "mlb.tv", "nhl center ice", "youtube", "fubo", "dazn", "espn app", "fox one"];
  var TEAM_COLORS = { "st. louis blues": ["#002F87", "#FCB514"], "st. louis cardinals": ["#C41E3A", "#0C2340"], "manchester united": ["#C70101", "#FBE122"], "st. louis city sc": ["#B8123F", "#0B1F4B"] };
  var PALETTE = [["#5E1A26", "#D9A441"], ["#16295A", "#C8102E"], ["#1C4A30", "#D7D7D7"], ["#38276A", "#F2B632"], ["#0E3A58", "#8FCDEB"], ["#5A2D0C", "#F28C28"], ["#262626", "#C9A227"], ["#6E1B1B", "#EDEDED"], ["#113B37", "#57C1B0"], ["#33336E", "#E04E39"]];
  var ACCENTS = {
    green: { name: "Green", text: "#45A85E", fill: "#3E9E5A", deep: "#24603A", on: "#0C0C0C" },
    teal: { name: "Teal", text: "#3CCFBE", fill: "#26B3A3", deep: "#156A60", on: "#06201C" },
    sky: { name: "Sky", text: "#5CB8F5", fill: "#3AA2E8", deep: "#1C5F8F", on: "#06192A" },
    coral: { name: "Coral", text: "#FF8A70", fill: "#F2704F", deep: "#93402A", on: "#1E0C06" },
    gold: { name: "Gold", text: "#E9B949", fill: "#DCA72E", deep: "#7A5A12", on: "#1A1203" },
    silver: { name: "Silver", text: "#C9D3DF", fill: "#B8C3D1", deep: "#4F5B6B", on: "#11161D" },
    navy: { name: "Navy", text: "#8FA8FF", fill: "#2A4BA8", deep: "#1F3A8A", on: "#FFFFFF" }
  };
  // Whole-page themes, all built off Midnight: background, panels, text and a matching accent. [name, base look, accent, vars]
  // vars: bg, card, raise, line, hair, ink, muted, dim, head, nav-sel, glass, glass-line
  var THEMES = {
    dark: ["Midnight", "dark", "green", ["#121821", "#1A2230", "#232D3C", "#2B3647", "rgba(148,163,184,.13)", "#ECF1F7", "#A0ACBD", "#8794A8", "#CAD3DF", "#232D3C", "rgba(26,34,48,.88)", "rgba(255,255,255,.10)"]],
    // Sunday Paper (3.52.0): the one light theme. Warm cream, dark ink, navy accent.
    paper: ["Sunday Paper", "light", "navy", ["#F1EBDD", "#FBF7EE", "#EAE2D0", "#D6CCB6", "rgba(60,50,30,.16)", "#1D1B16", "#5A5447", "#6A6456", "#3A362D", "#EAE2D0", "rgba(251,247,238,.92)", "rgba(0,0,0,.10)"]]
  };
  var THEME_VARS = ["--bg", "--card", "--raise", "--line", "--hair", "--ink", "--muted", "--dim", "--head", "--nav-sel", "--glass", "--glass-line"];

  var NATIONAL_TV = ["ABC", "CBS", "NBC", "FOX", "ESPN", "ESPN2", "ESPNU", "ESPNEWS", "TNT", "TBS", "truTV", "NBCSN", "FS1", "FS2", "CBSSN", "USA", "NBA TV", "NHL Network", "MLB Network", "NFL Network", "BTN", "SEC Network", "ACC Network", "CW", "Golf Channel", "Tennis Channel", "beIN SPORTS", "Telemundo", "Universo", "Univision", "TUDN", "UniMás", "ESPN Deportes", "Fox Deportes"];
  var STREAM_ORDER = ["Peacock", "Prime Video", "Apple TV", "Netflix", "Paramount+", "ESPN+", "HBO Max", "Hulu", "Disney+", "NBA League Pass", "MLB.TV", "YouTube"];
  // Text sizes. Each one is capped so the page never lays out narrower than SIZE_MIN_W (the width the game cards,
  // headers and tabs are built to fit), so a big size on a narrow screen grows as far as it can without breaking.
  var SIZES = { xs: 0.85, s: 0.92, m: 1, l: 1.08, xl: 1.16 }, SIZE_MIN_W = 340;
  // Claude's page viewer only opens web links, and iOS hands a web link to an app only when the app claims that
  // exact address (its apple-app-site-association file). Every address below is claimed by its app; bare home
  // pages often aren't (YouTube TV excludes "/"), which is why the first links stayed in Safari.
  var YTTV = "https://tv.youtube.com/live";
  var APPS = {
    espn: ["ESPN", "https://www.espn.com/espn/apps/espn"], peacock: ["Peacock", "https://www.peacocktv.com/watch/sports"],
    paramount: ["Paramount+", "https://www.paramountplus.com/"], hbomax: ["HBO Max", "https://play.hbomax.com/"],
    foxone: ["FOX One", "https://www.fox.com/live"], nba: ["NBA", "https://www.nba.com/watch/featured"],
    nbatv: ["NBA", "https://www.nba.com/watch/nba-tv"], prime: ["Prime Video", "https://www.primevideo.com/"],
    appletv: ["Apple TV", "https://tv.apple.com/"], netflix: ["Netflix", "https://www.netflix.com/browse"],
    hulu: ["Hulu", "https://www.hulu.com/hub/home"], disney: ["Disney+", "https://www.disneyplus.com/"],
    mlb: ["MLB", "https://www.mlb.com/tv"], youtube: ["YouTube", "https://www.youtube.com/"]
  };
  // streaming services always open their own app
  var STREAM_APP = { "ESPN+": "espn", "Peacock": "peacock", "HBO Max": "hbomax", "Max": "hbomax", "Prime Video": "prime",
    "Apple TV": "appletv", "Netflix": "netflix", "Hulu": "hulu", "Paramount+": "paramount", "Disney+": "disney",
    "NBA League Pass": "nba", "MLB.TV": "mlb", "YouTube": "youtube" };
  // TV channels open YouTube TV. ESPN's channels and NBC also offer their own app, so tapping them asks which.
  var ALSO_APP = { "ESPN": "espn", "ESPN2": "espn", "ESPNU": "espn", "ESPNEWS": "espn", "SEC Network": "espn", "ACC Network": "espn",
    "ESPN Deportes": "espn", "ABC": "espn", "NBC": "peacock", "Telemundo": "peacock" };
  function watchOptions(n) {
    if (STREAM_APP[n]) return [APPS[STREAM_APP[n]]];
    var opts = [];
    if (NATIONAL_TV.indexOf(n) !== -1) opts.push(["YouTube TV", YTTV]);
    if (ALSO_APP[n]) opts.push(APPS[ALSO_APP[n]]);
    return opts;
  }
  // A link the viewer opens outside the page; with two choices, a button that opens the chooser sheet.
  // card labels short enough to stay on one line next to the play arrow
  var NET_SHORT = { "NBA League Pass": "League Pass", "NHL Network": "NHL Net", "MLB Network": "MLB Net", "NFL Network": "NFL Net", "SEC Network": "SECN", "ACC Network": "ACCN", "Prime Video": "Prime", "Golf Channel": "Golf", "ESPN Deportes": "ESPN Dep." };
  function watchLink(n, cls, label) {
    var opts = watchOptions(n);
    if (!opts.length) return null;
    var a;
    if (opts.length === 1) {
      a = el("a", cls); a.href = opts[0][1]; a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("aria-label", "Watch " + n + " in " + opts[0][0]);
    } else {
      a = el("button", cls); a.type = "button";
      a.setAttribute("aria-label", "Watch " + n + ": choose " + opts.map(function (o) { return o[0]; }).join(" or "));
      a.addEventListener("click", function (e) { e.preventDefault(); openWatch(n, opts); });
    }
    if (label) a.textContent = typeof label === "function" ? label(opts) : label;
    return a;
  }
  function openWatch(n, opts) {
    $("watch-title").textContent = "Watch " + n;
    var box = $("watch-opts"); box.textContent = "";
    opts.forEach(function (o) {
      var a = el("a", (o[0] === "YouTube TV" || opts.length === 1 ? "solid" : "outline") + " watchopt", "Open " + o[0]); a.href = o[1]; a.target = "_blank"; a.rel = "noopener";
      a.addEventListener("click", function () { setTimeout(function () { $("sheet-watch").classList.remove("open"); }, 300); });
      box.appendChild(a);
    });
    $("sheet-watch").classList.add("open");
  }
  var NOTIFY_DEFAULTS = { enabled: true, brief: { on: true, hour: 9, myTeams: true, lineup: true, topGames: true }, reminders: { lineup: true, myTeams: true },
    finals: { myTeams: true, lineup: false }, live: { myTeams: false }, upsets: { on: false }, quiet: { on: true, start: 23, end: 8 }, days: [0, 1, 2, 3, 4, 5, 6],
    close: { lineup: true, myTeams: true }, ot: { lineup: true, myTeams: true }, goals: { myTeams: false }, lead: 0, liveAct: { on: true, lineup: true, myTeams: false, games: {}, board: { on: false, ids: [], at: 0 } }, alerts: { games: {} } };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function mergeDefaults(d, src) { var out = clone(d); if (src && typeof src === "object") Object.keys(d).forEach(function (k) { if (!(k in src)) return; if (d[k] && typeof d[k] === "object" && !Array.isArray(d[k])) { Object.keys(d[k]).forEach(function (j) { if (src[k] && j in src[k] && typeof src[k][j] === typeof d[k][j]) out[k][j] = src[k][j]; }); } else if (Array.isArray(d[k]) ? Array.isArray(src[k]) : typeof src[k] === typeof d[k]) out[k] = clone(src[k]); }); return out; }
  function getPref(path) { return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, state.notify); }
  function setPref(path, v) { var ks = path.split("."), o = state.notify; for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }
  function fmtHour(h) { h = Number(h); return (h % 12 === 0 ? 12 : h % 12) + " " + (h < 12 ? "AM" : "PM"); }
  var state = {
    date: todayInHome(), view: "lineup", openId: null, crawlPaused: false, tickerLeague: "", league: "", conf: "all", gamesOrder: [], pvStyle: "para", players: [], bestConf: "all", q: "", showSearch: false, textSize: "m", textSizeWide: "", device: "", navPos: "auto", watchVia: "apps", foldNudge: 0, tvFilter: "all",
    notify: clone(NOTIFY_DEFAULTS), notifyLoaded: false,
    autoAdd: true, showScores: true, newsletters: [], hiddenLeagues: [], scores: {}, scoresAt: null, lineupAutoDone: false,
    slate: null, slateStatus: "loading", lineup: { ids: [], added: [], removed: [], custom: [] }, lineupLoaded: false,
    rules: null, slateIds: [], slateSet: {}, ruleMatch: {}, why: {}, autoCount: 0, menuOpen: false,
    teams: DEFAULT_TEAMS.slice(), look: "dark", accent: "green", settingsLoaded: false
  };
  var unsubPreviews = null, unsubBox = null;
  var db = null, uid = null, unsubSlate = null, unsubLineup = null, unsubScores = null, slateTimer = null, lineupFromServer = false;
  var writer = { busy: false, next: null, curDate: null };
  var setWriter = { busy: false, dirty: false };
  // Shared viewers: alerts (prefs/, mine/) are the owner's only. Viewers the page can't identify keep their picks on this device.
  state.isOwner = true;
  function localGet() { try { return JSON.parse(localStorage.getItem("lineup.local") || "{}") || {}; } catch (e) { return {}; } }
  function localPut(o) { try { localStorage.setItem("lineup.local", JSON.stringify(o)); } catch (e) {} }
  var ntWriter = { busy: false, dirty: false };
  var mirrored = {};


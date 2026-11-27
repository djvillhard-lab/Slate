  // ---------- welcome walkthrough, slate rules built from a few answers, invites, the Account rows in Settings (3.55.0) ----------
  // New people (signed up with an invite, or added by DJ and logging in for the first time) get the walkthrough once.
  // Everyone else can run it from Settings > Account. Its answers build the slate rules (wlRules); nothing here is a new
  // kind of rule, so Settings > Slate rules can change every part of it afterwards.
  var wl = { open: false, step: 0, fresh: false, a: null, q: "", tick: null };
  var WL_LEAGUES = [["nfl", "NFL"], ["ncaaf", "College football"], ["nba", "NBA"], ["ncaam", "Men's college hoops"], ["mlb", "MLB"], ["nhl", "NHL"],
    ["epl", "Premier League"], ["ucl", "Champions League"], ["mls", "MLS"], ["ncaaw", "Women's college hoops"], ["wnba", "WNBA"], ["intl", "International soccer"], ["eu", "More European soccer"]];
  var WL_EU = ["uel", "facup", "laliga", "seriea", "bundesliga", "ligue1"];
  var WL_TEAM_LG = { "NFL": "nfl", "NBA": "nba", "MLB": "mlb", "NHL": "nhl", "Premier League": "epl", "MLS": "mls", "WNBA": "wnba", "La Liga": "eu", "Serie A": "eu", "Bundesliga": "eu", "Ligue 1": "eu" };
  // how big a slate: what each league's rules start as, and the most games a night
  var WL_SIZE = {
    big: { max: 4, ranked: "both", national: false, events: "mine", line: "Up to 4 games a night: ranked showdowns, prime time and the top teams.",
      by: { nfl: { prime: true }, nba: { top: true }, nhl: { top: true }, wnba: { top: true }, mlb: { national: true }, epl: { bigsix: "both" }, ucl: { bigclubs: "both" }, uel: { bigclubs: "both" }, facup: { bigsix: "both" },
        mls: { top: true }, laliga: { top: true }, seriea: { top: true }, bundesliga: { top: true }, ligue1: { top: true }, intl: { usa: true } } },
    mix: { max: 8, ranked: "top10", national: true, events: "all", line: "Up to 8: adds top-10 college teams, division games and the top of each league.",
      by: { nfl: { prime: true, division: true }, nba: { top: true }, nhl: { top: true }, wnba: { top: true }, mlb: { winning: true }, epl: { bigsix: "any", top: true }, ucl: { bigclubs: "any", knockout: true }, uel: { bigclubs: "any" }, facup: { bigsix: "any" },
        mls: { top: true }, laliga: { top: true }, seriea: { top: true }, bundesliga: { top: true }, ligue1: { top: true }, intl: { usa: true, bignations: "both" } } },
    lots: { max: 0, ranked: "any", national: true, events: "all", line: "No limit: any ranked college team, every NFL game, winning teams everywhere.",
      by: { nfl: { all: true }, nba: { top: true, winning: true, cup: true }, nhl: { top: true, winning: true }, wnba: { top: true, winning: true }, mlb: { winning: true }, epl: { all: true }, ucl: { all: true }, uel: { bigclubs: "any", english: true, knockout: true }, facup: { bigsix: "any" },
        mls: { top: true }, laliga: { top: true }, seriea: { top: true }, bundesliga: { top: true }, ligue1: { top: true }, intl: { usa: true, bignations: "any", competitive: true } } }
  };
  function wlLeagueKeys(a) { var out = []; a.leagues.forEach(function (k) { if (k === "eu") out = out.concat(WL_EU); else out.push(k); }); return out; }
  // the answers → slate rules
  function wlRules(a) {
    var S = WL_SIZE[a.size] || WL_SIZE.mix, keys = wlLeagueKeys(a), by = {};
    keys.forEach(function (k) {
      var b = (LEAGUES[k] || {}).college ? { ranked: a.ranked } : clone(S.by[k] || {});
      if (a.national && !b.all && (LG_OPTS[k] || []).indexOf("national") !== -1) b.national = true;
      if (!a.national) delete b.national;
      if (!Object.keys(b).length) b = clone(WL_SIZE.big.by[k] || {});
      by[k] = b;
    });
    var r = { v: 2, tvg: 1, favorites: true, events: a.events !== "none", eventMode: a.events === "mine" ? "pick" : "all", eventGroups: {}, eventsOn: [], eventsOff: [], after: a.after, max: S.max, by: by };
    // every event: only from the sports they follow (no Winter Classic for someone who didn't pick hockey)
    if (a.events === "all") {
      var sports = {}; keys.forEach(function (k) { sports[evSport(k)] = 1; });
      state.teams.forEach(function (t) {
        var p = parseTeam(t), tm = teamByName(p.name); if (!tm) return;
        if (tm.lg === "College") (p.lg ? [p.lg] : COL_KEYS).forEach(function (k) { sports[k] = 1; });
        else { var lk = WL_TEAM_LG[tm.lg]; if (lk) sports[lk === "eu" ? "soccer" : evSport(lk)] = 1; }
      });
      Object.keys(EV_CAT).forEach(function (gid) { if (!sports[gid.split(":")[0]]) r.eventGroups[gid] = false; });
    }
    return normRules(r);
  }
  function wlTeamLeagues() {
    var on = {};
    state.teams.forEach(function (t) {
      var p = parseTeam(t), tm = teamByName(p.name); if (!tm) return;
      if (tm.lg === "College") { if (p.lg) on[p.lg] = 1; else { on.ncaaf = 1; on.ncaam = 1; } }
      else if (WL_TEAM_LG[tm.lg]) on[WL_TEAM_LG[tm.lg]] = 1;
    });
    return WL_LEAGUES.map(function (x) { return x[0]; }).filter(function (k) { return on[k]; });
  }
  function wlSetSize(a, size) { var S = WL_SIZE[size]; a.size = size; a.ranked = S.ranked; a.national = S.national; a.events = S.events; }
  // preview (DJ, Settings > Account > Try the new user setup): the same walkthrough a new person gets, starting blank,
  // with every save switched off (the wrappers below) and DJ's own teams put back when it closes
  function wlStart(fresh, preview, name) {
    wl.preview = !!preview; wl.name = name || ""; wl.keep = preview ? { teams: state.teams.slice() } : null;
    var a = { leagues: [], size: "mix", ranked: "top10", national: true, events: "all", after: 0, leaguesTouched: false, notify: { teams: true, slate: true, brief: true } };
    if (fresh) state.teams = [];  // a new person starts with no teams, not DJ's
    else {
      // running it again: start from what they have now
      var r = state.rules || normRules(), by = r.by || {};
      a.leagues = WL_LEAGUES.map(function (x) { return x[0]; }).filter(function (k) { return k === "eu" ? WL_EU.some(function (e) { return by[e]; }) : by[k]; });
      a.leaguesTouched = a.leagues.length > 0;
      wlSetSize(a, r.max === 4 ? "big" : r.max === 0 && (by.nfl || {}).all ? "lots" : "mix");
      var rk = ((by.ncaaf || by.ncaam || by.ncaaw || {}).ranked); if (rk) a.ranked = rk;
      a.events = !r.events ? "none" : r.eventMode === "pick" ? "mine" : "all"; a.after = [0, 17, 18, 19].indexOf(r.after) !== -1 ? r.after : 19;
      a.national = Object.keys(by).some(function (k) { return by[k].national; });
var mp = (typeof meInfo === "object" && meInfo.p) || {};
      var n = state.notify; a.notify = { email: !!mp.on, emailWas: !!mp.on, addr: mp.email || "", teams: !!(n.enabled && n.reminders.myTeams), slate: !!(n.enabled && n.reminders.lineup), brief: !!(n.enabled && n.brief.on) };
    }
    wl.a = a; wl.fresh = !!fresh; wl.step = 0; wl.q = ""; wl.open = true; state.menuOpen = false;
    document.documentElement.classList.add("wl-on");
    wlRender();
  }
  function wlClose() {
    wl.open = false; clearInterval(wl.tick); wl.tick = null;
    document.documentElement.classList.remove("wl-on");
    var o = $("wl"); if (o) o.remove();
    if (wl.preview) { state.teams = wl.keep.teams; wl.keep = null; wl.preview = false; computeSlate(); return; }
    try { localStorage.removeItem("slate-welcome"); } catch (e) {}
  }
  function wlMarkDone(extra) {
    if (!db || !uid || !slatePass()) return;
    var body = Object.assign({ done: new Date().toISOString(), v: SLATE_VERSION }, extra || {});
    db.collection("data/users/" + uid).doc("welcome").set(body).then(function () {}, function () {});
  }
  // leave without finishing: a new person keeps the starting rules and no teams, and isn't asked again
  function wlSkip() {
    var fresh = wl.fresh, pv = wl.preview; wlClose();
    if (pv) { render(); toast("Preview closed. Nothing was saved."); return; }
    if (fresh) { if (!state.rules) state.rules = normRules(); saveSettings(); wlMarkDone({ skipped: true }); toast("Skipped. Settings has the welcome walkthrough when you want it.", null, 5000); }
    render();
  }
  function wlFinish() {
    var a = wl.a;
    if (wl.preview) { wlClose(); render(); toast("That's the new user setup. Nothing was saved, and your own slate is unchanged.", null, 6000); return; }
    state.rules = wlRules(a);
    if (state.notifyLoaded) {
      var n = state.notify, t = a.notify.teams, s = a.notify.slate;
      n.reminders.myTeams = t; n.finals.myTeams = t; n.close.myTeams = t; n.ot.myTeams = t;
      n.reminders.lineup = s; n.close.lineup = s; n.ot.lineup = s; n.brief.on = a.notify.brief;
      if (t || s || a.notify.brief) n.enabled = true;
    }
    wlFavEvents(true);
    saveSettings(); saveNotify(); maybeAutoAdd();
    if (typeof meCall === "function" && (a.notify.email || a.notify.emailWas)) {
      var patch = a.notify.email ? { action: "save", on: true, email: String(a.notify.addr || "").trim(), tz: meTz() } : { action: "save", on: false, tz: meTz() };
      if (a.notify.email && !a.notify.emailWas) patch.time = "07:00";
      meCall(patch).then(function (j) { meInfo.loaded = true; meInfo.p = j.prefs; meDraw(); }, function (e) { toast("Morning email wasn't saved: " + e.message, null, 6000); });
    }
    var wantsAlerts = a.notify.teams || a.notify.slate || a.notify.brief;
    wlMarkDone({ answers: { leagues: a.leagues.slice(), size: a.size, ranked: a.ranked, national: a.national, events: a.events, after: a.after }, askPush: !!(wantsAlerts && window.slateWantsApp && window.slateWantsApp()) });
    wlClose();
    if (!isDuo) setView("lineup"); else render();
    toast("Your slate is set. Change any of it in Settings > Slate rules.", null, 6000);
  }
  // what the answers would put on today's slate, without changing anything yet
  function wlPreview(a) {
    var keep = state.rules, out = { n: 0, text: "" };
    try { state.rules = wlRules(a); computeSlate(); out.n = state.autoCount || 0; out.text = rulesSentence(); } catch (e) {}
    state.rules = keep; computeSlate();
    return out;
  }
  var WL_STEPS = ["intro", "teams", "leagues", "size", "tune", "notify", "done"];
  function wlGo(d) {
    var a = wl.a, s = WL_STEPS[wl.step];
    // leaving the teams step: their teams' leagues start switched on (until they change the leagues themselves)
    if (s === "teams" && d > 0 && !a.leaguesTouched) a.leagues = wlTeamLeagues();
    if (s === "notify" && d > 0 && a.notify.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(a.notify.addr || "").trim())) { toast("Type your email address, or turn Morning email off."); var f = document.querySelector("#wl .wl-email"); if (f) f.focus(); return; }
    wl.step = Math.max(0, Math.min(WL_STEPS.length - 1, wl.step + d)); wl.q = "";
    wlRender(); var b = document.querySelector("#wl .wl-body"); if (b) b.scrollTop = 0;
  }
  function wlOpt(title, line, on, fn) {
    var b = el("button", "wl-opt"); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", on ? "true" : "false");
    var t = el("span", "wl-opt-t"); t.appendChild(el("b", null, title)); if (line) t.appendChild(el("span", null, line)); b.appendChild(t);
    var c = el("i", "wl-opt-c"); if (on) c.appendChild(icon("check")); b.appendChild(c);
    b.addEventListener("click", fn); return b;
  }
  function wlRow(title, line, ctl, col) {
    var r = el("div", "optrow" + (col ? " col" : "")), t = el("div"); t.appendChild(el("b", null, title)); if (line) t.appendChild(el("span", null, line));
    r.appendChild(t); r.appendChild(ctl); return r;
  }
  function wlSeg(label, value, opts, fn) {
    var sg = el("div", "seg wl-seg"); sg.setAttribute("role", "group"); sg.setAttribute("aria-label", label); sg.style.gridTemplateColumns = "repeat(" + opts.length + ", 1fr)";
    opts.forEach(function (o) { var b = el("button", null, o[1]); b.type = "button"; b.setAttribute("aria-pressed", value === o[0] ? "true" : "false"); b.addEventListener("click", function () { fn(o[0]); }); sg.appendChild(b); });
    return sg;
  }
  function wlTeamsStep(body) {
    body.appendChild(el("h1", null, "Pick your teams"));
    body.appendChild(el("p", "wl-p", "Every game your teams play goes on your slate, at any hour. Search by city or nickname."));
    var inp = el("input", "field wl-search"); inp.type = "search"; inp.placeholder = "Search teams"; inp.value = wl.q; inp.setAttribute("autocomplete", "off"); inp.setAttribute("autocorrect", "off"); inp.setAttribute("aria-label", "Search teams");
    body.appendChild(inp);
    var res = el("div", "tres wl-res"); res.setAttribute("role", "list"); body.appendChild(res);
    var mine = el("div", "wl-mine"); body.appendChild(mine);
    function drawMine() {
      mine.textContent = "";
      var seen = {}, names = [];
      state.teams.forEach(function (t) { var n = parseTeam(t).name; if (!seen[n.toLowerCase()]) { seen[n.toLowerCase()] = 1; names.push(n); } });
      var h = el("div", "sec"); h.appendChild(el("h2", null, "Your teams")); h.appendChild(el("span", "count", names.length ? String(names.length) : "None yet")); mine.appendChild(h);
      if (!names.length) { mine.appendChild(el("p", "notice", "No teams yet. You can skip this and add them later in Teams.")); return; }
      var list = el("div", "wl-teams");
      names.forEach(function (n) {
        var tm = teamByName(n), row = el("div", "wl-team");
        if (tm) row.appendChild(teamBadge(tm));
        var tx = el("span", "wl-team-n", n);
        if (tm && tm.lg === "College") { var on = colSports(n), sp = COL_KEYS.filter(function (k) { return on[k]; }).map(function (k) { return { ncaam: "men's hoops", ncaaw: "women's hoops", ncaaf: "football" }[k]; }); tx.appendChild(el("i", null, sp.join(", "))); }
        else if (tm) tx.appendChild(el("i", null, tm.lg));
        row.appendChild(tx);
        var x = el("button", "wl-x"); x.type = "button"; x.setAttribute("aria-label", "Remove " + n); x.appendChild(icon("x"));
        x.addEventListener("click", function () { var k = n.toLowerCase(); state.teams = state.teams.filter(function (q) { return parseTeam(q).name.toLowerCase() !== k; }); saveSettings(); drawMine(); drawRes(); });
        row.appendChild(x); list.appendChild(row);
      });
      mine.appendChild(list);
    }
    function drawRes() {
      res.textContent = ""; var q = inp.value; wl.q = q;
      if (!normT(q)) { res.hidden = true; return; }
      res.hidden = false;
      var hits = teamSearch(q);
      if (!hits.length) { res.appendChild(el("p", "tres-none", "No team matches “" + q.trim() + "”. Try the city or the nickname.")); return; }
      hits.forEach(function (t) {
        if (t.lg === "College") { res.appendChild(colPickRow(t, true)); return; }
        var on = hasTeam(t.name), b = el("button", "tres-row" + (on ? " on" : "")); b.type = "button"; b.setAttribute("role", "listitem");
        b.setAttribute("aria-label", t.name + ", " + t.lg + (on ? ". In your teams. Tap to remove" : ". Tap to add"));
        b.appendChild(teamBadge(t));
        var tx = el("span", "tx"); tx.appendChild(el("span", "n", t.name)); tx.appendChild(el("span", "lg", t.lg)); b.appendChild(tx);
        b.appendChild(starIcon(on));
        b.addEventListener("click", function () {
          if (hasTeam(t.name)) state.teams = state.teams.filter(function (x) { return x.toLowerCase() !== t.name.toLowerCase(); });
          else { state.teams.push(t.name); inp.value = ""; }
          saveSettings(); drawMine(); drawRes();
        });
        res.appendChild(b);
      });
    }
    inp.addEventListener("input", drawRes);
    // a college team's sport chips save by themselves (Settings' own row): redraw this step after they do
    res.addEventListener("click", function (e) { if (e.target.closest(".csp-c")) setTimeout(function () { if (wl.open && WL_STEPS[wl.step] === "teams") { drawMine(); drawRes(); } }, 0); }, true);
    drawRes(); drawMine();
  }
  function wlRender() {
    if (!wl.open) return;
    var a = wl.a, s = WL_STEPS[wl.step], o = $("wl");
    if (!o) { o = el("div", "wl"); o.id = "wl"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "Welcome to Slate"); document.body.appendChild(o); }
    o.textContent = ""; clearInterval(wl.tick); wl.tick = null;
    var top = el("div", "wl-top"); top.appendChild(el("span", "wl-mark", "Slate"));
    top.appendChild(el("span", "wl-n", s === "intro" ? "" : s === "done" ? "All set" : "Step " + wl.step + " of " + (WL_STEPS.length - 2)));
    o.appendChild(top);
    var body = el("div", "wl-body"); o.appendChild(body);
    var foot = el("div", "wl-foot"); o.appendChild(foot);
    var nextFn = function () { wlGo(1); };
    var next = el("button", "solid wl-next", "Next"); next.type = "button"; next.addEventListener("click", function () { nextFn(); });
    var back = el("button", "outline quiet wl-back", "Back"); back.type = "button"; back.addEventListener("click", function () { wlGo(-1); });
    var skip = el("button", "wl-skip", wl.fresh ? "Skip for now" : "Close"); skip.type = "button"; skip.addEventListener("click", wlSkip);
    var me = ""; try { me = localStorage.getItem("slate-user-name") || ""; } catch (e) {}
    if (wl.preview) { me = wl.name; skip.textContent = "Close preview"; top.lastChild.textContent = "Preview" + (top.lastChild.textContent ? " · " + top.lastChild.textContent : ""); }

    if (s === "intro") {
      body.appendChild(el("h1", "wl-big", wl.fresh && me ? "Welcome to Slate, " + me : "Welcome to Slate"));
      body.appendChild(el("p", "wl-p", "Slate answers one question: what's worth watching tonight? It builds your slate of games for you every day, then follows them live."));
      var pts = el("div", "wl-pts");
      [["Your slate, built for you", "Your teams' games, plus the big ones from the leagues you follow: ranked matchups, prime time, rivalries. You set the rules once."],
       ["Live, without the noise", "Scores, play by play and box scores for the games on your slate, and where to watch each one."],
       ["Alerts that matter", "Game starting, close late, final. A live scoreboard on your Lock Screen if you want it."]].forEach(function (p, i) {
        var r = el("div", "wl-pt"); r.appendChild(el("i", null, String(i + 1))); var t = el("div"); t.appendChild(el("b", null, p[0])); t.appendChild(el("span", null, p[1])); r.appendChild(t); pts.appendChild(r);
      });
      body.appendChild(pts);
      body.appendChild(el("p", "wl-p dim", wl.fresh ? "Five quick questions set it up. It takes about a minute, and you can change everything later in Settings." : "Five quick questions rebuild your slate rules. Nothing changes until the last step."));
      next.textContent = "Get started"; foot.appendChild(skip); foot.appendChild(next);
    } else if (s === "teams") {
      wlTeamsStep(body); foot.appendChild(back); foot.appendChild(next);
    } else if (s === "leagues") {
      body.appendChild(el("h1", null, "Which leagues do you watch?"));
      body.appendChild(el("p", "wl-p", "Slate adds the best games from these, beyond your own teams. Your teams' leagues are already picked."));
      var grid = el("div", "wl-lgs"); grid.setAttribute("role", "group"); grid.setAttribute("aria-label", "Leagues");
      WL_LEAGUES.forEach(function (L) {
        var on = a.leagues.indexOf(L[0]) !== -1, b = el("button", "wl-lg"); b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false");
        b.appendChild(el("span", null, L[1])); var c = el("i", "wl-opt-c"); if (on) c.appendChild(icon("check")); b.appendChild(c);
        b.addEventListener("click", function () { var i = a.leagues.indexOf(L[0]); if (i === -1) a.leagues.push(L[0]); else a.leagues.splice(i, 1); a.leaguesTouched = true; wlRender(); });
        grid.appendChild(b);
      });
      body.appendChild(grid);
      if (!a.leagues.length) body.appendChild(el("p", "notice", "With no leagues picked, your slate is your teams' games and big events only."));
      foot.appendChild(back); foot.appendChild(next);
    } else if (s === "size") {
      body.appendChild(el("h1", null, "How big a slate?"));
      body.appendChild(el("p", "wl-p", "How many games you want on a normal night, beyond your own teams."));
      var rg = el("div", "wl-opts"); rg.setAttribute("role", "radiogroup"); rg.setAttribute("aria-label", "Slate size");
      [["big", "Just the big ones"], ["mix", "A good mix"], ["lots", "Lots of games"]].forEach(function (x) {
        rg.appendChild(wlOpt(x[1], WL_SIZE[x[0]].line, a.size === x[0], function () { wlSetSize(a, x[0]); wlRender(); }));
      });
      body.appendChild(rg);
      foot.appendChild(back); foot.appendChild(next);
    } else if (s === "tune") {
      body.appendChild(el("h1", null, "A few preferences"));
      body.appendChild(el("p", "wl-p", "These start from the size you picked. Change any that don't fit."));
      var rows = el("div", "wl-rows");
      if (wlLeagueKeys(a).some(function (k) { return (LEAGUES[k] || {}).college; }))
        rows.appendChild(wlRow("Ranked college games", "Which ranked matchups make your slate.", wlSeg("Ranked college games", a.ranked, [["both", "Both ranked"], ["top10", "A top-10 team"], ["any", "Any ranked"]], function (v) { a.ranked = v; wlRender(); }), true));
      if (a.leagues.length)
        rows.appendChild(wlRow("National TV games", "Add games on national TV from your leagues.", switchEl(a.national, "National TV games", function (v) { a.national = v; wlRender(); })));
      rows.appendChild(wlRow("Rivalries and big events", a.events === "mine" ? "Only events one of your teams is playing in. The whole event goes on your slate." : a.events === "none" ? "No tournaments, bowls or rivalry games unless another rule picks them." : "Tournaments, bowls, rivalry games and finals in the sports you follow.",
        wlSeg("Rivalries and big events", a.events, [["all", "All"], ["mine", "My teams'"], ["none", "None"]], function (v) { a.events = v; wlRender(); }), true));
      rows.appendChild(wlRow("Earliest start", a.after ? "Skips games that start before " + fmtHour(a.after) + ". Your teams always count." : "Games at any hour. Pick a time to skip daytime games; your teams always count.",
        wlSeg("Earliest start", a.after, [[0, "Any time"], [17, "5 PM"], [18, "6 PM"], [19, "7 PM"]], function (v) { a.after = v; wlRender(); }), true));
      body.appendChild(rows);
      foot.appendChild(back); foot.appendChild(next);
    } else if (s === "notify") {
      body.appendChild(el("h1", null, "Notifications"));
      body.appendChild(el("p", "wl-p", "Pick what Slate tells you about. Settings > Notifications has the finer choices, like quiet hours."));
      var nr = el("div", "wl-rows");
      nr.appendChild(wlRow("My teams", "When a game starts, gets close late or goes to overtime, and the final.", switchEl(a.notify.teams, "My teams alerts", function (v) { a.notify.teams = v; wlRender(); })));
      nr.appendChild(wlRow("Games on my slate", "When a slate game starts, gets close late or goes to overtime.", switchEl(a.notify.slate, "Slate game alerts", function (v) { a.notify.slate = v; wlRender(); })));
      nr.appendChild(wlRow("Morning brief", "One notification each morning with the day's games.", switchEl(a.notify.brief, "Morning brief", function (v) { a.notify.brief = v; wlRender(); })));
      // the morning email (Settings > Email me my slate): the same switch, with the address asked for here
      if (typeof meCall === "function") {
        nr.appendChild(wlRow("Morning email", "Your slate by email every morning at 7: games, channels and last night's results.", switchEl(a.notify.email, "Morning email", function (v) { a.notify.email = v; wlRender(); if (v) { var f = document.querySelector("#wl .wl-email"); if (f) f.focus(); } })));
        if (a.notify.email) {
          var em = el("input", "field wl-email"); em.type = "email"; em.placeholder = "Your email address"; em.value = a.notify.addr || ""; em.setAttribute("autocomplete", "email"); em.setAttribute("autocapitalize", "off"); em.setAttribute("aria-label", "Your email address");
          em.addEventListener("input", function () { a.notify.addr = em.value; });
          nr.appendChild(em);
          nr.appendChild(el("p", "wl-p dim", "Only used for this email. Change the time or turn it off in Settings."));
        }
      }
      body.appendChild(nr);
      // this phone: the same switch as Settings > Notifications > This phone
      var ph = el("div", "wl-phone"), txt = el("p", "wl-p"), pb = el("button", "outline wl-phone-b", "Turn on notifications for this phone"); pb.type = "button";
      var draw = function () {
        var blocked = pushInfo.native === "denied" || (!isNativeApp() && window.Notification && Notification.permission === "denied");
        // heading for the app next (3.155.0): the app asks for notifications itself, so Safari doesn't
        if (window.slateWantsApp && window.slateWantsApp()) { txt.textContent = "You'll get these in the Slate app. It asks to send notifications the first time you open it."; pb.hidden = true; }
        else if (!pushOk()) { txt.textContent = "To get alerts on this phone, add Slate to your Home Screen (Share, then Add to Home Screen) and open it from there. Then turn them on in Settings > Notifications."; pb.hidden = true; }
        else if (blocked) { txt.textContent = "Notifications are blocked for Slate. Turn them on in iPhone Settings > Notifications > Slate."; pb.hidden = true; }
        else if (!pushInfo.checked) { txt.textContent = "Checking this phone…"; pb.hidden = true; }
        else if (pushInfo.on) { txt.textContent = "Alerts are on for this phone."; pb.hidden = true; }
        else { txt.textContent = "Alerts aren't on for this phone yet. Your iPhone will ask if Slate can send notifications."; pb.hidden = false; pb.textContent = pushInfo.busy ? "Turning on…" : "Turn on notifications for this phone"; }
      };
      pb.addEventListener("click", function () { if (wl.preview) { toast("In the preview this button does nothing. For a new person, the iPhone asks to allow notifications."); return; } pushTurnOn(); draw(); });
      ph.appendChild(txt); ph.appendChild(pb); body.appendChild(ph);
      pushState(); draw(); wl.tick = setInterval(draw, 700);
      foot.appendChild(back); foot.appendChild(next);
    } else {
      var pv = wlPreview(a), isToday = state.date === todayInHome();
      body.appendChild(el("h1", null, "Your slate is ready"));
      var card = el("div", "rsum wl-sum"), hd = el("div", "rsum-head"), nb = el("div", "rsum-n");
      nb.appendChild(el("b", null, String(pv.n))); nb.appendChild(el("span", null, (pv.n === 1 ? "game " : "games ") + (isToday ? "today" : "that day") + " from these rules"));
      hd.appendChild(nb); card.appendChild(hd); card.appendChild(el("p", "rsum-text", pv.text)); body.appendChild(card);
      body.appendChild(el("p", "wl-p", "Slate rebuilds it every day. Add or remove any game by hand, and change the rules any time in Settings > Slate rules."));
      if (wl.preview) body.appendChild(el("p", "notice", "This is a preview. A new person would land on this slate; yours stays as it is."));
      else if (!wl.fresh) body.appendChild(el("p", "notice", "This replaces the slate rules you have now."));
      next.textContent = wl.preview ? "Finish preview" : wl.fresh ? "See my slate" : "Replace my rules"; nextFn = wlFinish;
      // someone new on an iPhone, in Safari: the app is the last stop (3.155.0). Their slate is saved first, so the
      // app opens straight onto it after they log in with the passcode they just made.
      var app = (wl.fresh || wl.preview) && window.slateWantsApp ? window.slateWantsApp() : "";
      if (wl.preview && !app) try { app = localStorage.getItem("slate-app-link") || ""; } catch (e) {}
      if (app) {
        var ap = el("div", "wl-app");
        ap.appendChild(el("h2", null, "Last step: get the iPhone app"));
        var ol = el("ol", "wl-app-steps");
        ["Tap Get the app. Apple opens TestFlight, its app for trying new apps. Install TestFlight if you don't have it.",
         "In TestFlight, tap Accept, then Install.",
         "Come back to this page and tap Open Slate. You'll be logged in, with your teams and slate."].forEach(function (t, i) {
          var li = el("li"); li.appendChild(el("i", null, String(i + 1))); li.appendChild(el("span", null, t)); ol.appendChild(li);
        });
        ap.appendChild(ol); body.appendChild(ap);
        next.textContent = wl.preview ? "Finish preview" : "Get the app";
        // a new tab, so the saves still in flight from this page aren't cut off
        nextFn = function () {
          if (wl.preview) { wlFinish(); return; }
          var w = null; try { w = window.open(app, "_blank"); } catch (e) {}
          wlFinish(); try { localStorage.setItem("slate-app-wait", "1"); } catch (e) {} appWait(app);
          if (!w) setTimeout(function () { location.href = app; }, 1500);
        };
        var stay = el("button", "outline quiet wl-back", "Use it here"); stay.type = "button"; stay.addEventListener("click", wlFinish);
        foot.appendChild(stay); foot.appendChild(next);
      } else { foot.appendChild(back); foot.appendChild(next); }
    }
  }

  // ---------- after "Get the app" (3.156.0): Safari waits for the app to be installed, then opens it logged in ----------
  // "Open Slate" asks the worker for a one-time ticket (/api/handoff) and opens slatedj://open#h=<ticket>; the app
  // trades it for its own key (db-shim.js slateHandoff). The screen comes back if Safari reloads, until they leave it.
  function appWait(app) {
    var o = $("app-wait");
    if (!o) { o = el("div", "wl"); o.id = "app-wait"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "Open the Slate app"); document.body.appendChild(o); }
    o.textContent = ""; document.documentElement.classList.add("wl-on");
    var top = el("div", "wl-top"); top.appendChild(el("span", "wl-mark", "Slate")); top.appendChild(el("span", "wl-n", "Last step")); o.appendChild(top);
    var body = el("div", "wl-body"); o.appendChild(body);
    body.appendChild(el("h1", null, "Open Slate when it's installed"));
    body.appendChild(el("p", "wl-p", "When TestFlight shows Slate as installed, come back to this page and tap Open Slate. The app opens logged in, with your teams and your slate."));
    var go = el("button", "solid wl-app-go", "Open Slate"); go.type = "button"; body.appendChild(go);
    var hint = el("p", "wl-p dim"); hint.hidden = true; body.appendChild(hint);
    var get = el("button", "outline wl-phone-b", "Get the app from TestFlight"); get.type = "button";
    get.addEventListener("click", function () { var w = null; try { w = window.open(app, "_blank"); } catch (e) {} if (!w) location.href = app; });
    body.appendChild(get);
    go.addEventListener("click", function () {
      go.disabled = true; go.textContent = "Opening…"; hint.hidden = true;
      fetch("/api/handoff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "new", pass: slatePass() }) })
        .then(function (r) { return r.json(); }).catch(function () { return { error: "No connection. Try again." }; })
        .then(function (j) {
          go.disabled = false; go.textContent = "Open Slate";
          if (!j || !j.t) { hint.textContent = (j && j.error) || "Couldn't open Slate. Try again."; hint.hidden = false; return; }
          var left = false, gone = function () { if (document.visibilityState === "hidden") { left = true; try { localStorage.removeItem("slate-app-wait"); } catch (e) {} } };
          document.addEventListener("visibilitychange", gone);
          location.href = "slatedj://open#h=" + j.t;
          setTimeout(function () {
            document.removeEventListener("visibilitychange", gone);
            if (!left) { hint.textContent = "Slate didn't open. Install it from TestFlight first, or update it there. You can also open Slate and log in with your passcode."; hint.hidden = false; }
          }, 2500);
        });
    });
    var foot = el("div", "wl-foot"); o.appendChild(foot);
    var stay = el("button", "outline quiet wl-back", "Use Slate here instead"); stay.type = "button";
    stay.addEventListener("click", function () { try { localStorage.removeItem("slate-app-wait"); } catch (e) {} o.remove(); document.documentElement.classList.remove("wl-on"); render(); });
    foot.appendChild(stay);
  }
  // Safari reloaded while waiting for the app: show the screen again
  (function () {
    var w = ""; try { w = localStorage.getItem("slate-app-wait") || ""; } catch (e) {}
    var app = w && slatePass() && window.slateWantsApp ? window.slateWantsApp() : "";
    if (app) setTimeout(function () { if (!$("app-wait") && !wl.open) appWait(app); }, 300);
  })();

  // ---------- a favorite team in an event: that whole event goes on the slate by default (DJ, Nov 16, 2026) ----------
  // If one of your teams plays in an event that your rules wouldn't show (events picked by hand, or that group
  // switched off), the event is switched on for you. Switching it off in Slate rules sticks (eventsOff).
  function wlFavEvents(quiet) {
    var r = state.rules; if (!r || !r.events || !r.favorites || !state.settingsLoaded || !slatePass()) return false;
    var has = function (list, k) { return (list || []).some(function (x) { return x.toLowerCase() === k; }); }, add = [];
    games().forEach(function (g) {
      if (g.custom || !isEvent(g) || !hasFav(g)) return;
      var name = eventKey(g), k = name.toLowerCase(); if (!name) return;
      if (has(r.eventsOn, k) || has(r.eventsOff, k) || has(add, k) || evNameOn(name, evGroup(name, g.league))) return;
      add.push(name);
    });
    if (!add.length) return false;
    r.eventsOn = (r.eventsOn || []).concat(add).slice(-200);
    if (!quiet) saveSettings();
    return true;
  }
  // runs whenever the day's games or the settings arrive, just before the slate is worked out
  var wlAutoAdd0 = maybeAutoAdd;
  maybeAutoAdd = function () { if (wl.preview) return; try { if (!wl.open) wlFavEvents(false); } catch (e) {} wlAutoAdd0(); };
  // during a preview nothing is saved: not the teams picked, not the slate, not notification settings
  var wlSave0 = saveSettings, wlSaveN0 = saveNotify, wlSaveL0 = saveLineup;
  saveSettings = function () { if (wl.preview) return; wlSave0(); };
  saveNotify = function () { if (wl.preview) return; wlSaveN0(); };
  saveLineup = function () { if (wl.preview) return; wlSaveL0(); };

  // ---------- who gets the walkthrough by itself: someone new ----------
  (function () {
    if (!slatePass()) return;
    var tries = 0, t = setInterval(function () {
      if (++tries > 60) { clearInterval(t); return; }
      if (!db || !uid || !state.settingsLoaded || !state.notifyLoaded) return;
      clearInterval(t);
      // read only now: on a first load the phone learns whose passcode it is while the page starts
      var me = "dj", flag = ""; try { me = localStorage.getItem("slate-user") || "dj"; flag = localStorage.getItem("slate-welcome") || ""; } catch (e) {}
      if (me === "dj") return;
      if (flag) { wlStart(true); return; }
      try { if (localStorage.getItem("slate-handed")) { localStorage.removeItem("slate-handed"); toast("You're logged in. Your teams and slate came over from Safari.", null, 5000); } } catch (e) {}
      // logging in for the first time on this phone: new if nothing of theirs has been saved yet
      var c = db.collection("data/users/" + uid);
      Promise.all([c.doc("settings").get(), c.doc("welcome").get()]).then(function (r) {
        if (!r[0].exists && !r[1].exists && !wl.open) { wlStart(true); return; }
        // set up in Safari, now in the app for the first time (3.155.0): ask for notifications once, the way the
        // walkthrough's notifications step would have
        var w = r[1].exists ? r[1].data() || {} : {}, k = "slate-push-asked";
        try { if (w.askPush && window.SLATE_NATIVE && !localStorage.getItem(k)) { localStorage.setItem(k, "1"); setTimeout(pushTurnOn, 1500); } } catch (e) {}
      }, function () {});
    }, 500);
  })();

  // ---------- Settings > Account: the walkthrough, invites (DJ), log out ----------
  var inv = { list: [], link: "", busy: false, err: "", app: "", editApp: false };
  function invCall(body) {
    body.pass = slatePass();
    return fetch("/api/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).then(function (j) { j = j || {}; if (typeof j.app === "string") { inv.app = j.app; try { localStorage.setItem("slate-app-link", j.app); } catch (e) {} } return j; }, function () { return { error: "No connection. Try again." }; });
  }
  function invSheet() {
    var bd = $("sheet-invite");
    if (!bd) { bd = el("div", "sheet-backdrop"); bd.id = "sheet-invite"; bd.addEventListener("click", function (e) { if (e.target === bd) bd.classList.remove("open"); }); document.body.appendChild(bd); }
    bd.textContent = ""; bd.classList.add("open");
    var sh = el("div", "sheet inv"); bd.appendChild(sh);
    sh.appendChild(el("h3", null, "Invite someone"));
    sh.appendChild(el("p", "inv-p", inv.app ? "Make a link and text it. On their iPhone it sets up their account, walks them through their teams and slate rules, then gets them the app. A link works once and lasts 7 days. Everyone you invite gets 10 Claude summaries a day."
      : "Make a link and send it. They pick their own name and passcode, then get the welcome walkthrough. A link works once and lasts 7 days. Everyone you invite gets 10 Claude summaries a day."));
    if (inv.link) {
      var box = el("div", "inv-link"); box.appendChild(el("span", null, inv.link)); sh.appendChild(box);
      var acts = el("div", "inv-acts");
      var share = el("button", "solid", navigator.share ? "Send the link" : "Copy the link"); share.type = "button";
      share.addEventListener("click", function () {
        var copy = function () { try { navigator.clipboard.writeText(inv.link).then(function () { toast("Link copied"); }, function () { toast("Couldn't copy. Press and hold the link to copy it."); }); } catch (e) { toast("Press and hold the link to copy it."); } };
        if (navigator.share) navigator.share({ title: "Slate", text: inv.app ? "Here's your invite to Slate, my sports app. Open it on your iPhone: it sets up your account and gets you the app. The link works once." : "Here's your invite to Slate, my sports app. It works once.", url: inv.link }).catch(function (e) { if (!e || e.name !== "AbortError") copy(); }); else copy();
      });
      acts.appendChild(share);
      var again = el("button", "outline quiet", "Make another"); again.type = "button"; again.addEventListener("click", function () { inv.link = ""; invSheet(); }); acts.appendChild(again);
      sh.appendChild(acts);
      sh.appendChild(el("p", "inv-p dim", "This is the only time the link is shown, so send it now."));
    } else {
      var note = el("input", "field"); note.type = "text"; note.placeholder = "Who's it for? (optional)"; note.maxLength = 30; note.setAttribute("aria-label", "Who's it for"); sh.appendChild(note);
      var mkb = el("button", "solid", inv.busy ? "Making…" : "Make an invite link"); mkb.type = "button"; mkb.disabled = inv.busy;
      mkb.addEventListener("click", function () {
        inv.busy = true; inv.err = ""; var nt = note.value; invSheet();
        invCall({ action: "new", note: nt }).then(function (j) {
          inv.busy = false;
          if (j.code) { inv.link = location.origin + "/#invite=" + j.code; inv.list = j.list || []; } else inv.err = j.error || "Couldn't make a link. Try again.";
          invSheet();
        });
      });
      sh.appendChild(mkb);
      if (inv.err) { var er = el("p", "gate-err", inv.err); er.setAttribute("role", "alert"); sh.appendChild(er); }
    }
    if (inv.list.length) {
      var h = el("div", "sec"); h.appendChild(el("h2", null, "Invites")); sh.appendChild(h);
      var list = el("div", "inv-list");
      inv.list.forEach(function (v) {
        var row = el("div", "inv-row"), t = el("div");
        var when = ""; try { when = new Date(v.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch (e) {}
        t.appendChild(el("b", null, v.state === "used" ? (v.name || "Someone") + " signed up" : v.note || "Invite"));
        t.appendChild(el("span", null, (v.state === "used" ? "Used" : v.state === "open" ? "Waiting" : v.state === "expired" ? "Ran out" : "Locked") + " · made " + when + (v.state === "used" && v.note ? " for " + v.note : "")));
        row.appendChild(t);
        if (v.state !== "used") {
          var cx = el("button", "outline quiet", v.state === "open" ? "Cancel" : "Remove"); cx.type = "button";
          cx.addEventListener("click", function () { cx.disabled = true; invCall({ action: "cancel", k: v.k }).then(function (j) { if (j.list) inv.list = j.list; invSheet(); }); });
          row.appendChild(cx);
        }
        list.appendChild(row);
      });
      sh.appendChild(list);
    }
    invAppRow(sh);
    var done = el("button", "outline quiet inv-done", "Done"); done.type = "button"; done.addEventListener("click", function () { bd.classList.remove("open"); }); sh.appendChild(done);
  }
  // the iPhone app's public TestFlight link (3.155.0): pasted in once, then every invite ends with "Get the app"
  function invAppRow(sh) {
    var h = el("div", "sec"); h.appendChild(el("h2", null, "iPhone app link")); sh.appendChild(h);
    if (inv.app && !inv.editApp) {
      var row = el("div", "inv-row"), t = el("div");
      t.appendChild(el("b", null, "Invites end with Get the app")); t.appendChild(el("span", null, inv.app.replace(/^https:\/\//, "")));
      row.appendChild(t);
      var ch = el("button", "outline quiet", "Change"); ch.type = "button"; ch.addEventListener("click", function () { inv.editApp = true; invSheet(); }); row.appendChild(ch);
      sh.appendChild(row); return;
    }
    sh.appendChild(el("p", "inv-p dim", "Paste Slate's public TestFlight link (App Store Connect > TestFlight > your external group > Public Link). Then someone opening an invite on an iPhone gets the app at the end. Without it, they use Slate in Safari."));
    var f = el("input", "field"); f.type = "url"; f.placeholder = "https://testflight.apple.com/join/…"; f.value = inv.app || ""; f.setAttribute("aria-label", "TestFlight public link"); f.setAttribute("autocapitalize", "off"); f.setAttribute("autocorrect", "off"); sh.appendChild(f);
    var acts = el("div", "inv-acts");
    var sv = el("button", "solid", "Save the link"); sv.type = "button";
    sv.addEventListener("click", function () {
      sv.disabled = true; sv.textContent = "Saving…";
      invCall({ action: "applink", url: f.value.trim() }).then(function (j) {
        if (j.ok) { inv.app = j.app || ""; inv.editApp = false; toast(inv.app ? "Invites now end with Get the app" : "App link removed"); invSheet(); }
        else { sv.disabled = false; sv.textContent = "Save the link"; toast(j.error || "Couldn't save. Try again.", null, 6000); }
      });
    });
    acts.appendChild(sv);
    if (inv.editApp) { var cx = el("button", "outline quiet", "Cancel"); cx.type = "button"; cx.addEventListener("click", function () { inv.editApp = false; invSheet(); }); acts.appendChild(cx); }
    sh.appendChild(acts);
  }
  // admin-only rows (invites, People, the new user preview): shown to an admin, and the server checks every one of
  // their actions again (whoIs in worker/index.js)
  function isAdmin() { return !!(window.slateIsAdmin && window.slateIsAdmin()); }
  var ppl = { list: null, busy: false };
  function acctPeople() {
    var box = $("acct-people"); if (!box) return;
    box.textContent = "";
    if (!ppl.list) { box.appendChild(el("p", "hint", ppl.busy ? "Loading…" : "Couldn't load the list. Open this page again to retry.")); return; }
    if (!ppl.list.length) { box.appendChild(el("p", "hint", "No one else has an account yet.")); return; }
    ppl.list.forEach(function (u) {
      var r = el("div", "optrow"), t = el("div"), when = "";
      try { if (u.at) when = new Date(u.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch (e) {}
      t.appendChild(el("b", null, u.name));
      t.appendChild(el("span", null, (u.via === "invite" ? "Joined by invite" + (when ? " " + when : "") : "Added by you") + " · " + u.today + " of " + u.cap + " Claude summaries today"));
      r.appendChild(t);
      if (u.admin) { r.appendChild(el("span", "acct-tag", "Admin")); box.appendChild(r); return; }
      var b = el("button", "outline quiet", "Remove"); b.type = "button";
      b.addEventListener("click", function () {
        if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "Tap again to remove"; setTimeout(function () { delete b.dataset.sure; b.textContent = "Remove"; }, 4000); return; }
        b.disabled = true; b.textContent = "Removing…";
        invCall({ action: "remove", id: u.id }).then(function (j) { if (j.people) { ppl.list = j.people; toast(u.name + " can't log in any more"); } else toast(j.error || "Couldn't remove. Try again."); acctPeople(); });
      });
      r.appendChild(b); box.appendChild(r);
    });
    box.appendChild(el("p", "hint", "Removing someone takes away their passcode, so they can't log in or use Claude summaries. To let them back in, send a new invite."));
  }
  function acctLoadPeople() {
    if (!$("acct-people") || ppl.busy) return;
    ppl.busy = true; acctPeople();
    invCall({ action: "list" }).then(function (j) { ppl.busy = false; if (j.people) ppl.list = j.people; if (j.list) inv.list = j.list; acctPeople(); });
  }
  // ---- Sign in with Google (3.95.0): Connect ties Google to this profile, so it can open on any phone without the
  // passcode. Nothing about the profile changes. The Google part runs in Safari (db-shim.js slateGoogle, google.html). ----
  var gst = { state: "", email: "", msg: "" };
  function gCall(op) {
    return fetch("/api/google/" + op, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pass: slatePass() }) })
      .then(function (r) { return r.json(); }).catch(function () { return { error: "No connection. Try again." }; });
  }
  function acctGoogle() {
    var box = $("acct-google"); if (!box) return;
    if (!gst.state) { gst.state = "load"; gCall("status").then(function (j) { gst.state = j.linked ? "linked" : "off"; gst.email = j.email || ""; gst.apple = !!j.apple; gst.appleEmail = j.appleEmail || ""; acctGoogle(); }); }
    box.textContent = "";
    var me = ""; try { me = localStorage.getItem("slate-user") || ""; } catch (e) {}
    var r = el("div", "optrow acct-g"), t = el("div");
    t.appendChild(el("b", null, gst.state === "linked" ? "Google connected" : "Sign in with Google"));
    t.appendChild(el("span", null, gst.msg || (gst.state === "linked"
      ? gst.email + (me === "dj" ? ". Your own phone keeps logging in with your passcode for now." : ". On a new phone, tap Sign in with Google on the log-in page. Your passcode still works too.")
      : gst.state === "wait" ? (window.slateCanApple && window.slateCanApple() ? "Finish signing in with Google…" : "Finish in Safari, then come back here.")
      : "Connect your Google account so Slate opens on any phone without a passcode. Your teams, rules, favorites and alerts stay as they are.")));
    r.appendChild(t);
    if (gst.state === "load") { box.appendChild(r); return; }
    var b = el("button", "outline quiet", gst.state === "linked" ? "Disconnect" : gst.state === "wait" ? "Waiting…" : "Connect"); b.type = "button";
    if (gst.state === "wait") b.disabled = true;
    b.addEventListener("click", function () {
      if (gst.state === "linked") {
        if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "Tap again"; setTimeout(function () { delete b.dataset.sure; b.textContent = "Disconnect"; }, 4000); return; }
        b.disabled = true; gCall("unlink").then(function (j) { if (j.ok) { gst.state = "off"; gst.email = ""; toast("Google disconnected. Your passcode still works."); } else toast(j.error || "Couldn't disconnect. Try again."); acctGoogle(); });
        return;
      }
      b.disabled = true; gst.msg = "";
      window.slateGoogle("link", function (j) {
        if (j.opened) { gst.state = "wait"; acctGoogle(); return; }
        if (j.ok) { gst.state = "linked"; gst.email = j.email || ""; toast("Google is connected"); }
        else { gst.state = "off"; gst.msg = j.error === "cancel" ? "" : j.error || "Couldn't connect. Try again."; }
        acctGoogle();
      });
    });
    r.appendChild(b); box.appendChild(r);
    // Sign in with Apple (3.114.0): in the app (Apple's own sheet), or shown as connected anywhere
    if (!(window.slateCanApple && window.slateCanApple()) && !gst.apple) return;
    var ra = el("div", "optrow"), ta = el("div");
    ta.appendChild(el("b", null, gst.apple ? "Apple connected" : "Sign in with Apple"));
    ta.appendChild(el("span", null, gst.amsg || (gst.apple ? (gst.appleEmail || "Your Apple ID") + (me === "dj" ? ". Your own phone keeps logging in with your passcode for now." : ". On a new phone, tap Sign in with Apple on the log-in page.") : "Connect your Apple ID the same way. Everything you've set up stays.")));
    ra.appendChild(ta);
    var ba = el("button", "outline quiet", gst.apple ? "Disconnect" : "Connect"); ba.type = "button";
    ba.addEventListener("click", function () {
      if (gst.apple) {
        if (!ba.dataset.sure) { ba.dataset.sure = "1"; ba.textContent = "Tap again"; setTimeout(function () { delete ba.dataset.sure; ba.textContent = "Disconnect"; }, 4000); return; }
        ba.disabled = true;
        fetch("/api/google/unlink", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pass: slatePass(), p: "apple" }) }).then(function (x) { return x.json(); }).catch(function () { return {}; })
          .then(function (j) { if (j.ok) { gst.apple = false; gst.appleEmail = ""; toast("Apple disconnected. Your passcode still works."); } else toast(j.error || "Couldn't disconnect. Try again."); acctGoogle(); });
        return;
      }
      ba.disabled = true; gst.amsg = "";
      window.slateApple("link", function (j) {
        if (j.ok) { gst.apple = true; gst.appleEmail = j.email || ""; toast("Apple is connected"); }
        else gst.amsg = j.error === "cancel" ? "" : j.error || "Couldn't connect. Try again.";
        acctGoogle();
      });
    });
    ra.appendChild(ba); box.appendChild(ra);
  }
  // back from Google in this same tab (the website): say so once
  try { if (sessionStorage.getItem("slate-google-done")) { sessionStorage.removeItem("slate-google-done"); setTimeout(function () { toast("Google is connected"); }, 800); } } catch (e) {}
  function acctRows() {
    var slot = $("acct-slot"); if (!slot || !window.SLATE_SELF) return;
    slot.textContent = "";
    var me = "dj", name = ""; try { me = localStorage.getItem("slate-user") || "dj"; name = localStorage.getItem("slate-user-name") || ""; } catch (e) {}
    var signed = !!slatePass(), wrap = el("div", "acct"); wrap.id = "acct";
    var head = function (t) { var h = el("div", "sec"); h.appendChild(el("h2", null, t)); wrap.appendChild(h); };
    var row = function (title, line, label, fn) {
      var r = el("div", "optrow"), t = el("div"); t.appendChild(el("b", null, title)); t.appendChild(el("span", null, line)); r.appendChild(t);
      var b = el("button", "outline quiet", label); b.type = "button"; b.addEventListener("click", fn); r.appendChild(b); wrap.appendChild(r);
    };
    head("This phone");
    if (signed) row("Logged in as " + (me === "dj" ? "DJ" : name || me), "Log out to use a different passcode on this phone.", "Log out", function () {
      var b = this; if (b.dataset.sure) { if (window.slateLogOut) window.slateLogOut(); return; }
      b.dataset.sure = "1"; b.textContent = "Tap again to log out"; setTimeout(function () { delete b.dataset.sure; b.textContent = "Log out"; }, 4000);
    });
    else row("Not logged in", "This phone is just looking. Log in to save teams, rules and alerts.", "Log in", function () { if (window.slateAskPass) window.slateAskPass(); });
    if (signed && window.slateGoogle) { var gb = el("div"); gb.id = "acct-google"; wrap.appendChild(gb); }
    if (signed) {
      head("Welcome");
      row("Welcome walkthrough", "Pick teams and rebuild your own slate rules from a few questions.", "Start", function () { wlStart(false); });
    }
    if (signed && isAdmin()) {
      head("Admin");  // only DJ's account sees this part (3.175.0)
      row("Try the new user setup", "See sign-up and the welcome exactly as a new person does, starting blank. Nothing is saved and your slate doesn't change.", "Try it", function () {
        if (window.slatePreviewSignup) window.slatePreviewSignup(function (nm) { wlStart(true, true, nm); }); else wlStart(true, true, "");
      });
      row("Invite someone", "One link to text: their account, their slate and the iPhone app.", "Invite", function () {
        inv.link = ""; inv.err = ""; invSheet(); invCall({ action: "list" }).then(function (j) { if (j.list) { inv.list = j.list; if ($("sheet-invite") && $("sheet-invite").classList.contains("open")) invSheet(); } if (j.people) { ppl.list = j.people; acctPeople(); } });
      });
      var pb = el("div", "acct-people"); pb.id = "acct-people"; wrap.appendChild(pb);
    }
    slot.appendChild(wrap);
    acctGoogle();
    if (state.setPage === "account") acctLoadPeople();
  }
  (function () { var b = document.querySelector('#view-settings [data-open="account"]'); if (b) b.addEventListener("click", function () { ppl.list = ppl.list || null; acctLoadPeople(); }); })();
  // drawn at once, then again when the phone knows whose passcode it is (a first load finds out while the page starts)
  acctRows();
  (function () { var n = 0, t = setInterval(function () { if (db || ++n > 40) { clearInterval(t); acctRows(); } }, 500); })();

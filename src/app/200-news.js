  // ---------- by channel ----------
  function chanKind(n) { return NATIONAL_TV.indexOf(n) !== -1 ? "national" : isStreaming(n) ? "streaming" : "regional"; }
  // ---------- News: ESPN and The Athletic headlines by tab, Claude's brief on tap, and what you read most ----------
  // Tabs: My slate, My teams, then leagues (the ones you follow first, the rest after, ordered by what you read).
  var ATH_SLUG = { nfl: "nfl", ncaaf: "college-football", nba: "nba", mlb: "mlb", nhl: "nhl", ncaam: "college-basketball", ncaaw: "womens-college-basketball", wnba: "wnba", mls: "mls", epl: "premier-league", ucl: "champions-league" };
  var NW_LGS = ["nfl", "ncaaf", "nba", "nhl", "ncaam", "mlb", "epl", "ucl", "mls", "ncaaw", "wnba", "laliga", "seriea", "bundesliga", "ligue1"];
  var nw = { tab: null, feeds: {}, subs: {}, docs: {}, open: null };
  // leagues whose top stories feed Claude's "around sports" quick hits
  var NW_TOP = ["nfl", "nba", "ncaaf", "mlb", "nhl", "epl", "ncaam"];
  // the slate's headlines grouped by game: each story goes under the first slate game whose team it's about
  function nwGroups(items) {
    var gs = lineupGames().slice().sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); }), used = {};
    return gs.map(function (g) {
      var mine = items.filter(function (a) { if (used[a.url] || a.lg !== g.league) return false; var t = nwNamed(a, g.away) ? g.away : nwNamed(a, g.home) ? g.home : nwTagged(a, g.away) ? g.away : nwTagged(a, g.home) ? g.home : ""; if (!t) return false; used[a.url] = 1; a.about = t; return true; });
      return { g: g, items: mine };
    }).filter(function (x) { return x.items.length; });
  }
  // reading history (this phone, synced to the account): opens and seconds read, per league and per team
  function nwRead() { try { return JSON.parse(localStorage.getItem("slate-newsread") || "null") || { lg: {}, team: {} }; } catch (e) { return { lg: {}, team: {} }; } }
  function nwReadPut(r) { try { localStorage.setItem("slate-newsread", JSON.stringify(r)); } catch (e) {} clearTimeout(nw.saveT); nw.saveT = setTimeout(function () { if (db && uid) db.doc("prefs/newsread").set(r).then(null, function () {}); }, 4000); }
  function nwScore(o) { return o ? (o.n || 0) * 60 + Math.min(o.t || 0, 3600) : 0; }
  function nwInterests() {
    var r = nwRead(), lg = Object.keys(r.lg || {}).sort(function (a, b) { return nwScore(r.lg[b]) - nwScore(r.lg[a]); }).slice(0, 4);
    var tm2 = Object.keys(r.team || {}).sort(function (a, b) { return nwScore(r.team[b]) - nwScore(r.team[a]); }).slice(0, 6);
    return { leagues: lg.map(function (k) { return (LEAGUES[k] || {}).name || k; }), teams: tm2 };
  }
  // an article was opened: count it, and time how long Slate is away (reading it), up to 15 minutes
  function nwOpened(a) {
    var r = nwRead(); r.lg = r.lg || {}; r.team = r.team || {};
    var add = function (m, k) { if (!k) return; var o = m[k] = m[k] || { n: 0, t: 0 }; o.n++; };
    add(r.lg, a.lg); (a.teams || []).slice(0, 3).forEach(function (t) { add(r.team, t); });
    nwReadPut(r); nw.open = { at: Date.now(), lg: a.lg, teams: (a.teams || []).slice(0, 3) };
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden || !nw.open) return;
    var sec = Math.min(900, Math.round((Date.now() - nw.open.at) / 1000)), o = nw.open; nw.open = null; if (sec < 5) return;
    var r = nwRead(), add = function (m, k) { if (!k) return; var x = m[k] = m[k] || { n: 0, t: 0 }; x.t = (x.t || 0) + sec; };
    add(r.lg, o.lg); o.teams.forEach(function (t) { add(r.team, t); }); nwReadPut(r);
  });
  function nwTabs() {
    var r = nwRead(), mine = {};
    myTeamList().forEach(function (t) { mine[t.lg] = 1; }); lineupGames().forEach(function (g) { if (g.league) mine[g.league] = 1; });
    Object.keys(((state.rules || {}).by) || {}).forEach(function (k) { mine[k] = 1; });
    var lgs = NW_LGS.filter(function (k) { return LEAGUES[k] && bxBase(k); });
    lgs.sort(function (a, b) { return (mine[b] ? 1 : 0) - (mine[a] ? 1 : 0) || nwScore((r.lg || {})[b]) - nwScore((r.lg || {})[a]) || NW_LGS.indexOf(a) - NW_LGS.indexOf(b); });
    return [["slate", "My slate"]];  // News is about your slate now (league and team tabs retired Nov 14, 2026)
  }
  // one league's headlines: ESPN's news feed plus The Athletic's section feed, newest first (cached 10 minutes)
  function nwFeed(lg) {
    var c = nw.feeds[lg]; if (c && (c.busy || Date.now() - c.at < 10 * 60000)) return c.p;
    c = nw.feeds[lg] = { busy: true, at: Date.now(), items: c && c.items };
    var espn = rkFetch(bxApi(lg, "news?limit=40")).then(function (d) {
      return ((d || {}).articles || []).map(function (a) {
        var teams = (a.categories || []).filter(function (x) { return x.type === "team" && x.description; }).map(function (x) { return x.description; });
        var evs = (a.categories || []).filter(function (x) { return x.type === "event" && x.description; }).map(function (x) { return x.description.toLowerCase(); });
        return { title: a.headline, desc: a.description || "", url: ((a.links || {}).web || {}).href || "", at: a.published || a.lastModified || "", src: "ESPN", lg: lg, teams: teams, events: evs, img: ((a.images || [])[0] || {}).url || "" };
      });
    }, function () { return []; });
    var ath = ATH_SLUG[lg] ? fetch("/api/athletic?slug=" + ATH_SLUG[lg]).then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (j) {
      return (j.items || []).map(function (a) { return { title: a.title, desc: a.desc || "", url: a.url, at: a.at, src: "The Athletic", lg: lg, teams: [] }; });
    }, function () { return []; }) : Promise.resolve([]);
    c.p = Promise.all([espn, ath]).then(function (r) {
      var seen = {}, all = r[0].concat(r[1]).filter(function (a) { if (!a.title || !/^https:\/\//.test(a.url) || seen[a.title]) return false; seen[a.title] = 1; return true; });
      all.sort(function (a, b) { return (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
      c.items = all; c.busy = false; if (state.view === "news") keepScroll(renderNews); return all;
    });
    return c.p;
  }
  // does an article concern this team? ESPN tags its teams; otherwise look for the team's name in the headline
  // ESPN tags each story's teams, but roundups tag a dozen; for those the team must also be named in the text
  function nwTagged(a, name) {
    var n = String(name || "").toLowerCase(), tags = a.teams || []; if (!n) return false;
    var hit = tags.some(function (t) { var x = t.toLowerCase(); return x === n || x.indexOf(n) !== -1 || n.indexOf(x) !== -1; });
    // a story tagged with this game itself (ESPN's "event") counts however many teams it tags
    return hit && (tags.length <= 4 || (a.events || []).some(function (e) { return e.indexOf(n) !== -1; }));
  }
  function nwNamed(a, name) {
    var n = String(name || "").toLowerCase(); if (!n) return false;
    var words = n.split(" "), mascot = words.length > 1 ? words[words.length - 1] : "", school = words.length > 2 ? words.slice(0, -1).join(" ") : n;
    var txt = (a.title + " " + a.desc).toLowerCase(), esc = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var known = teamByName(name), short = known && known.s && known.s.length > 4 ? known.s : "";  // "Alabama", "Notre Dame"
    if (short && new RegExp("\\b" + esc(short) + "\\b").test(txt)) return true;
    return txt.indexOf(n) !== -1 || (school.length > 4 && new RegExp("\\b" + esc(school) + "\\b").test(txt)) || (mascot.length > 5 && a.lg !== "ncaaf" && a.lg !== "ncaam" && a.lg !== "ncaaw" && new RegExp("\\b" + esc(mascot) + "\\b").test(txt));
  }
  function nwAbout(a, name) { return nwNamed(a, name) || nwTagged(a, name); }
  // the articles for a tab, and the leagues whose feeds it needs
  function nwFor(tab) {
    var want = [], names = [];
    if (tab === "slate") lineupGames().forEach(function (g) { if (g.league && bxBase(g.league)) { want.push(g.league); names.push([g.away, g.league], [g.home, g.league]); } });
    else if (tab === "teams") myTeamList().forEach(function (t) { if (bxBase(t.lg)) { want.push(t.lg); names.push([t.name, t.lg]); } });
    else want.push(tab);
    want = want.filter(function (k, i) { return want.indexOf(k) === i; });
    var ready = true, out = [];
    want.forEach(function (lg) { var c = nw.feeds[lg]; nwFeed(lg); if (!c || !c.items) { ready = false; return; } (c.items || []).forEach(function (a) { out.push(a); }); });
    if (tab === "slate" || tab === "teams") out = out.filter(function (a) { return names.some(function (n) { return n[1] === a.lg && nwAbout(a, n[0]); }); });
    // what you read most rises a little: articles about your most-read teams get a 12-hour head start
    var top = nwInterests().teams;
    var key = function (a) { var t = Date.parse(a.at) || 0; return t + ((a.teams || []).some(function (x) { return top.indexOf(x) !== -1; }) ? 12 * 3600000 : 0); };
    out.sort(function (a, b) { return key(b) - key(a); });
    return { items: out.slice(0, 40), ready: ready, leagues: want };
  }
  function nwAgo(at) { var t = Date.parse(at) || 0; if (!t) return ""; var m = Math.round((Date.now() - t) / 60000); return m < 60 ? Math.max(1, m) + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; }
  function nwBriefPath(tab) { var d = todayInHome(); return tab === "slate" || tab === "teams" ? "mine/newsbrief-" + d + "-" + tab : "newsbrief/" + d + "-" + tab; }
  function nwSub(path) {
    if (nw.subs[path] || !db) return; nw.subs[path] = true;
    db.doc(path).onSnapshot(function (sn) { nw.docs[path] = sn.exists ? sn.data() : null; if (state.view === "news") keepScroll(renderNews); }, function () {});
  }
  function nwAsk(tab, label, list) {
    var pass = slatePass(); if (!pass) { toast("Enter your passcode first (bottom of the page)"); return; }
    var k = "n:" + nwBriefPath(tab); CL_ASK[k] = Date.now(); keepScroll(renderNews);
    var facts = { headlines: list.slice(0, 25).map(function (a) { return { title: a.title, source: a.src, at: a.at, desc: String(a.desc || "").slice(0, 200), url: a.url }; }), interests: nwInterests() };
    if (tab === "slate") {
      var lite = function (a) { return { title: a.title, source: a.src, at: a.at, url: a.url }; };
      facts.slate = lineupGames().map(function (g) { return { id: g.id, league: (LEAGUES[g.league] || {}).name || g.league, away: g.away, home: g.home, start: g.start, tv: g.tv || "", why: (state.why || {})[g.id] || "" }; });
      facts.byGame = {}; nwGroups(list).forEach(function (gr) { facts.byGame[gr.g.id] = gr.items.slice(0, 5).map(lite); });
      var top = []; NW_TOP.forEach(function (lg) { ((nw.feeds[lg] || {}).items || []).slice(0, 4).forEach(function (a) { top.push(lite(a)); }); }); facts.top = top;
      delete facts.headlines;
    }
    if (tab === "teams") facts.teams = myTeamList().map(function (t) { return t.name + " (" + ((LEAGUES[t.lg] || {}).name || t.lg) + ")"; });
    fetch("/api/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pass: pass, kind: "news", key: tab, date: todayInHome(), game: { label: label }, facts: facts }) })
      .then(function (r) { return r.json().then(function (j) { return [r.status, j]; }, function () { return [r.status, {}]; }); })
      .then(function (res) { if (res[0] >= 300) { delete CL_ASK[k]; keepScroll(renderNews); toast((res[1] && res[1].error) || "Couldn't start Claude. Try again."); } },
        function () { delete CL_ASK[k]; keepScroll(renderNews); toast("Couldn't reach Slate's server. Try again."); });
  }
  function nwLink(a) {
    var row = el("a", "nw-art"); row.href = a.url; row.target = "_blank"; row.rel = "noopener";
    row.addEventListener("click", function () { nwOpened(a); });
    var tx = el("div", "nw-tx");
    tx.appendChild(el("b", "nw-h", a.title));
    if (a.desc) tx.appendChild(el("span", "nw-d", a.desc));
    if (a.about) tx.appendChild(el("span", "nw-about", a.about));
    tx.appendChild(el("span", "nw-m", [a.src, (LEAGUES[a.lg] || {}).tag, nwAgo(a.at)].filter(Boolean).join(" · ")));
    row.appendChild(tx);
    if (a.img && /^https:\/\//.test(a.img)) { var im = el("img", "nw-img"); im.src = a.img; im.alt = ""; im.loading = "lazy"; im.onerror = function () { im.remove(); }; row.appendChild(im); }
    return row;
  }
  var NEWS_ON = false;  // News is parked for now (Nov 14, 2026): the menu item stays, the page says it's coming
  function renderNews() {
    if (state.view !== "news") return;
    if (!NEWS_ON) { var tb0 = $("nw-tabs"); tb0.textContent = ""; tb0.hidden = true; var b0 = $("nw-body"); b0.textContent = ""; var cs = el("div", "nw-soon"); cs.appendChild(icon("sparkle")); cs.appendChild(el("b", null, "Coming soon")); cs.appendChild(el("span", null, "News about your slate is on its way.")); b0.appendChild(cs); return; }
    nwLoadRead();
    var tabs = nwTabs(); if (!nw.tab || !tabs.some(function (t) { return t[0] === nw.tab; })) nw.tab = "slate";
    var tb = $("nw-tabs"); tb.textContent = ""; tb.hidden = tabs.length < 2;
    NW_TOP.forEach(function (lg) { if (bxBase(lg)) nwFeed(lg); });
    tabs.forEach(function (t) {
      var b = el("button", "lg-tab", t[1]); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", t[0] === nw.tab ? "true" : "false"); b.setAttribute("aria-pressed", t[0] === nw.tab ? "true" : "false");
      if (t[0] === nw.tab) b.classList.add("on");
      b.addEventListener("click", function () { if (nw.tab === t[0]) return; nw.tab = t[0]; renderNews(); window.scrollTo(0, 0); });
      tb.appendChild(b);
    });
    var on = tb.querySelector(".on"); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
    var body = $("nw-body"); body.textContent = "";
    var tab = nw.tab, label = (tabs.filter(function (t) { return t[0] === tab; })[0] || [])[1], full = tab === "slate" ? "My slate" : tab === "teams" ? "My teams" : (LEAGUES[tab] || {}).name || label;
    if (tab === "slate" && !lineupGames().length) { body.appendChild(el("p", "pv-none", "Nothing on today's slate yet. Add games and the news about them shows up here.")); return; }
    if (tab === "teams" && !myTeamList().length) { body.appendChild(el("p", "pv-none", "Pick your teams on the Teams page and their news shows up here.")); return; }
    var got = nwFor(tab);
    // Claude's brief: quick hits, a longer read, what to watch (My slate), picks worth opening. Only on a tap.
    var path = nwBriefPath(tab); nwSub(path);
    var doc = nw.docs[path], has = !!(doc && ((doc.quick && doc.quick.length) || (doc.games && doc.games.length))), bx2 = el("div", "nw-brief");
    var hd = el("div", "nw-bh"); hd.appendChild(icon("sparkle")); hd.appendChild(el("b", null, tab === "slate" ? "Your slate, briefed" : full + " brief")); bx2.appendChild(hd);
    if (doc && doc.games && doc.games.length) {
      // the biggest games on the slate: why each matters and the story behind it, with one story to open
      bx2.appendChild(el("p", "nw-sub", "Today's biggest games"));
      doc.games.forEach(function (g) {
        var gb = el("div", "nw-game"); gb.appendChild(el("b", "nw-gt", g.game)); gb.appendChild(el("p", "nw-story", g.story));
        if (g.read && g.read.url) gb.appendChild(nwLink({ title: g.read.title, url: g.read.url, src: g.read.source, desc: "", lg: "", teams: [] }));
        bx2.appendChild(gb);
      });
      if (doc.around && doc.around.length) { bx2.appendChild(el("p", "nw-sub", "Around sports")); var au = el("ul", "nw-quick"); doc.around.forEach(function (q) { au.appendChild(el("li", null, q)); }); bx2.appendChild(au); }
      bx2.appendChild(el("p", "nw-foot", "Written by Claude from its own research" + (doc.at ? " · " + nwAgo(doc.at) : "")));
    } else if (has) {
      bx2.appendChild(el("p", "nw-sub", "Quick hits"));
      var ul = el("ul", "nw-quick"); doc.quick.forEach(function (q) { ul.appendChild(el("li", null, q)); }); bx2.appendChild(ul);
      if (doc.watch && doc.watch.length) { bx2.appendChild(el("p", "nw-sub", "Tonight")); var wl = el("ul", "nw-watch"); doc.watch.forEach(function (w) { var li = el("li"); li.appendChild(el("b", null, w.game)); li.appendChild(el("span", null, w.why)); wl.appendChild(li); }); bx2.appendChild(wl); }
      if (doc.long && doc.long.length) {
        var openL = nw.longOpen === path, lb = el("button", "nw-more", openL ? "Hide the longer read" : "Longer read"); lb.type = "button";
        lb.addEventListener("click", function () { nw.longOpen = openL ? null : path; if (!openL) { var r = nwRead(); if (LEAGUES[tab]) { var o = r.lg[tab] = r.lg[tab] || { n: 0, t: 0 }; o.n++; nwReadPut(r); } } keepScroll(renderNews); });
        bx2.appendChild(lb);
        if (openL) { var lr = el("div", "nw-long"); doc.long.forEach(function (pp) { lr.appendChild(el("p", null, pp)); }); bx2.appendChild(lr); }
      }
      if (doc.reads && doc.reads.length) {
        bx2.appendChild(el("p", "nw-sub", "Worth reading"));
        doc.reads.forEach(function (rd) { var a = { title: rd.title, url: rd.url, src: rd.source, desc: rd.why, lg: LEAGUES[tab] ? tab : "", teams: [] }; bx2.appendChild(nwLink(a)); });
      }
      bx2.appendChild(el("p", "nw-foot", "Written by Claude from its own research" + (doc.at ? " · " + nwAgo(doc.at) : "")));
    } else bx2.appendChild(el("p", "nw-sub nw-pitch", tab === "slate" ? "Claude picks the biggest games on your slate and tells the story behind each, then rounds up the top stories across all of sports." : "Quick hits and a longer read on the biggest " + full + " storylines right now."));
    bx2.appendChild(claudeCtl("news", doc, has, { k: "n:" + path, go: function () { nwAsk(tab, full, got.items); } }, has ? "Brief me again" : "Brief me"));
    body.appendChild(bx2);
    // headlines
    var hh = el("div", "sec"); hh.appendChild(el("h2", null, tab === "slate" ? "Headlines by game" : "Headlines")); body.appendChild(hh);
    if (!got.items.length) { body.appendChild(el("p", "pv-none", got.ready ? (tab === "slate" ? "No stories about today's slate yet." : tab === "teams" ? "No recent stories about your teams." : "No stories right now.") : "Loading the latest from ESPN and The Athletic…")); return; }
    if (tab === "slate") {
      // grouped by game, so it's clear which matchup each story is about
      nwGroups(got.items).forEach(function (gr) {
        var g = gr.g, gh = el("div", "nw-gh");
        gh.appendChild(el("b", null, g.away + " at " + g.home));
        gh.appendChild(el("span", null, [(LEAGUES[g.league] || {}).tag, timeText(g.start), g.tv].filter(Boolean).join(" · ")));
        body.appendChild(gh);
        var gl = el("div", "nw-list"); gr.items.slice(0, 6).forEach(function (a) { gl.appendChild(nwLink(a)); }); body.appendChild(gl);
      });
      return;
    }
    var list = el("div", "nw-list"); got.items.forEach(function (a) { list.appendChild(nwLink(a)); }); body.appendChild(list);
  }
  // reading history follows the account: load it once and keep the larger counts
  function nwLoadRead() {
    if (nw.readLoaded || !db || !uid) return; nw.readLoaded = true;
    db.doc("prefs/newsread").get().then(function (sn) {
      if (!sn.exists) return; var srv = sn.data() || {}, r = nwRead();
      ["lg", "team"].forEach(function (k) { r[k] = r[k] || {}; Object.keys(srv[k] || {}).forEach(function (x) { var a = r[k][x] || { n: 0, t: 0 }, b = srv[k][x] || {}; r[k][x] = { n: Math.max(a.n || 0, b.n || 0), t: Math.max(a.t || 0, b.t || 0) }; }); });
      try { localStorage.setItem("slate-newsread", JSON.stringify(r)); } catch (e) {}
    }, function () {});
  }

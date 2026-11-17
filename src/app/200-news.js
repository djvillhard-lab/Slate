  // ---------- by channel ----------
  function chanKind(n) { return NATIONAL_TV.indexOf(n) !== -1 ? "national" : isStreaming(n) ? "streaming" : "regional"; }
  // ---------- News (3.45.0): a quick-look dashboard written by Claude, only when Generate is tapped ----------
  // 1. Options: what to cover (today's slate, my teams, leagues), then Generate news (one Claude request).
  // 2. The page: when it was generated + Regenerate (reopens the options), Top news (Claude's five picks), then
  //    Games | Teams | Leagues tabs. 3. Tap a game, team or league for a deeper breakdown, written on first tap and
  //    saved (shared by everyone). Free ESPN and Athletic headlines are handed to Claude as facts and link out.
  var ATH_SLUG = { nfl: "nfl", ncaaf: "college-football", nba: "nba", mlb: "mlb", nhl: "nhl", ncaam: "college-basketball", ncaaw: "womens-college-basketball", wnba: "wnba", mls: "mls", epl: "premier-league", ucl: "champions-league" };
  var NW_LGS = ["nfl", "ncaaf", "nba", "nhl", "ncaam", "mlb", "epl", "ucl", "mls", "ncaaw", "wnba", "laliga", "seriea", "bundesliga", "ligue1"];
  var nw = { feeds: {}, subs: {}, docs: {}, tab: null, deep: null, opts: false, optsAt: null, lg: null };
  // one league's headlines: ESPN's news feed plus The Athletic's section feed, newest first (cached 10 minutes)
  // fresh (a league briefing's Generate, 3.80.0): fetch again unless the last fetch is under a minute old
  function nwFeed(lg, fresh) {
    var c = nw.feeds[lg]; if (c && (c.busy || Date.now() - c.at < (fresh ? 60000 : 10 * 60000))) return c.p;
    c = nw.feeds[lg] = { busy: true, at: Date.now(), items: c && c.items };
    var espn = rkFetch(bxApi(lg, "news?limit=40")).then(function (d) {
      return ((d || {}).articles || []).map(function (a) {
        var teams = (a.categories || []).filter(function (x) { return x.type === "team" && x.description; }).map(function (x) { return x.description; });
        var evs = (a.categories || []).filter(function (x) { return x.type === "event" && x.description; }).map(function (x) { return x.description.toLowerCase(); });
        (a.categories || []).forEach(function (x) { var id = x.athleteId || (x.athlete || {}).id; if (x.type === "athlete" && id && x.description) nwAthPut(lg, x.description, id); });
        var img = ((a.images || []).filter(function (m) { return m && /^https:\/\//.test(m.url || "") && !/stitcher/.test(m.url); })[0] || {}).url || "";
        return { title: a.headline, desc: a.description || "", url: ((a.links || {}).web || {}).href || "", at: a.published || a.lastModified || "", src: "ESPN", lg: lg, teams: teams, events: evs, img: img };
      });
    }, function () { return []; });
    var ath = ATH_SLUG[lg] ? fetch("/api/athletic?slug=" + ATH_SLUG[lg]).then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (j) {
      return (j.items || []).map(function (a) { return { title: a.title, desc: a.desc || "", url: a.url, at: a.at, src: "The Athletic", lg: lg, teams: [] }; });
    }, function () { return []; }) : Promise.resolve([]);
    c.p = Promise.all([espn, ath]).then(function (r) {
      var seen = {}, all = r[0].concat(r[1]).filter(function (a) { if (!a.title || !/^https:\/\//.test(a.url) || seen[a.title]) return false; seen[a.title] = 1; return true; });
      all.sort(function (a, b) { return (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
      c.items = all; c.busy = false; return all;
    });
    return c.p;
  }
  // does an article concern this team? ESPN tags its teams, but roundups tag a dozen; for those the team must also be named in the text
  function nwTagged(a, name) {
    var n = String(name || "").toLowerCase(), tags = a.teams || []; if (!n) return false;
    var hit = tags.some(function (t) { var x = t.toLowerCase(); return x === n || x.indexOf(n) !== -1 || n.indexOf(x) !== -1; });
    return hit && (tags.length <= 4 || (a.events || []).some(function (e) { return e.indexOf(n) !== -1; }));
  }
  function nwNamed(a, name) {
    var n = String(name || "").toLowerCase(); if (!n) return false;
    var words = n.split(" "), mascot = words.length > 1 ? words[words.length - 1] : "", school = words.length > 2 ? words.slice(0, -1).join(" ") : n;
    var txt = (a.title + " " + a.desc).toLowerCase(), esc = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var known = teamByName(name), short2 = known && known.s && known.s.length > 4 ? known.s : "";  // "Alabama", "Notre Dame"
    if (short2 && new RegExp("\\b" + esc(short2) + "\\b").test(txt)) return true;
    return txt.indexOf(n) !== -1 || (school.length > 4 && new RegExp("\\b" + esc(school) + "\\b").test(txt)) || (mascot.length > 5 && a.lg !== "ncaaf" && a.lg !== "ncaam" && a.lg !== "ncaaw" && new RegExp("\\b" + esc(mascot) + "\\b").test(txt));
  }
  function nwAbout(a, name) { return nwNamed(a, name) || nwTagged(a, name); }
  function nwAgo(at) { var t = Date.parse(at) || 0; if (!t) return ""; var m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + (m === 1 ? " minute ago" : " minutes ago") : m < 1440 ? Math.round(m / 60) + (Math.round(m / 60) === 1 ? " hour ago" : " hours ago") : Math.round(m / 1440) + (Math.round(m / 1440) === 1 ? " day ago" : " days ago"); }
  function nwLite(a) { return { title: a.title, desc: String(a.desc || "").slice(0, 110), at: a.at, url: a.url, source: a.src }; }
  function nwTeamHeads(name, lg, n) { return (((nw.feeds[lg] || {}).items) || []).filter(function (a) { return nwAbout(a, name); }).slice(0, n).map(nwLite); }
  // ----- what to cover: remembered on this phone -----
  function nwLeagueKeys() { return NW_LGS.filter(function (k) { return LEAGUES[k] && bxBase(k); }); }
  function nwGames() { return lineupGames().filter(function (g) { return !g.custom && g.league && bxBase(g.league); }); }
  // picks (3.47.1): nothing is picked to start. gs: the slate games picked ({ d: date, ids: [] }); ts: my teams picked
  // ("lg|name"); lgs: leagues picked. All remembered (3.47.2). The slate changes every day, so gt keeps the teams of the
  // games picked last time ("lg|name"), and on a new day their games start picked.
  function nwGKeys(g) { return [g.league + "|" + String(g.away).toLowerCase(), g.league + "|" + String(g.home).toLowerCase()]; }
  function nwOpts() {
    var o = null; try { o = JSON.parse(localStorage.getItem("slate-newspicks") || "null"); } catch (e) {}
    if (!o || typeof o !== "object") o = {};
    var ok = nwLeagueKeys(), gt = Array.isArray(o.gt) ? o.gt : [], gs;
    if (o.gs && o.gs.d === state.date && Array.isArray(o.gs.ids)) gs = o.gs.ids;
    else gs = nwGames().filter(function (g) { var k = nwGKeys(g); return gt.indexOf(k[0]) !== -1 || gt.indexOf(k[1]) !== -1; }).map(function (g) { return g.id; });
    return { gs: { d: state.date, ids: gs }, gt: gt, ts: Array.isArray(o.ts) ? o.ts : [], lgs: (Array.isArray(o.lgs) ? o.lgs : []).filter(function (k) { return ok.indexOf(k) !== -1; }) };
  }
  function nwTKey(t) { return t.lg + "|" + String(t.name).toLowerCase(); }
  function nwOptsPut(o) {
    var gt = []; nwGames().forEach(function (g) { if (o.gs.ids.indexOf(g.id) !== -1) gt = gt.concat(nwGKeys(g)); }); o.gt = gt;
    try { localStorage.setItem("slate-newspicks", JSON.stringify(o)); } catch (e) {} }
  // what a Generate would actually cover right now
  function nwCover() {
    var o = nwOpts(), gs = nwGames().filter(function (g) { return o.gs.ids.indexOf(g.id) !== -1; }), tms = myTeamList().filter(function (t) { return bxBase(t.lg) && o.ts.indexOf(nwTKey(t)) !== -1; });
    return { slate: gs.length > 0, teams: tms.length > 0, lgs: o.lgs, games: gs, myTeams: tms };
  }
  function nwPagePath() { return "mine/news-" + state.date; }
  function nwSlug(x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48); }
  function nwDeepKey(d) { return d.type === "g" ? "g-" + d.id : d.type === "t" ? "t-" + d.lg + "-" + nwSlug(d.name) : "l-" + d.lg; }
  function nwSub(path) {
    if (nw.subs[path] || !db) return; nw.subs[path] = true;
    db.doc(path).onSnapshot(function (sn) {
      nw.docs[path] = sn.exists ? sn.data() : null;
      if (state.view === "news") keepScroll(renderNews);
    }, function () { if (nw.docs[path] === undefined) nw.docs[path] = null; if (state.view === "news") keepScroll(renderNews); });
  }
  function nwPost(body, k) {
    return fetch("/api/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return [r.status, j]; }, function () { return [r.status, {}]; }); })
      .then(function (res) {
        if (res[0] >= 300) { delete CL_ASK[k]; keepScroll(renderNews); toast((res[1] && res[1].error) || "Couldn't start Claude. Try again."); return; }
        if (res[1] && res[1].done) { delete CL_ASK[k]; keepScroll(renderNews); toast("Claude wrote this a moment ago, so here it is"); }
      }, function () { delete CL_ASK[k]; keepScroll(renderNews); toast("Couldn't reach Slate's server. Try again."); });
  }
  // Generate: gather the free headlines for everything picked, then one Claude request writes the whole page
  function nwGenerate() {
    var pass = slatePass(); if (!pass) { toast("Enter your passcode first (bottom of the page)"); return; }
    var cv = nwCover(); if (!cv.slate && !cv.teams && !cv.lgs.length) { toast("Pick something to cover first"); return; }
    var path = nwPagePath(), k = "n:" + path, date = state.date, prevDoc = nw.docs[path];
    CL_ASK[k] = Date.now(); nw.opts = false; keepScroll(renderNews); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0);
    var want = {}; if (cv.slate) cv.games.forEach(function (g) { want[g.league] = 1; }); if (cv.teams) cv.myTeams.forEach(function (t) { want[t.lg] = 1; }); cv.lgs.forEach(function (l) { want[l] = 1; });
    Promise.all(Object.keys(want).map(function (lg) { return nwFeed(lg).then(null, function () { return []; }); })).then(function () {
      var facts = { cover: { slate: cv.slate, teams: cv.teams, leagues: cv.lgs, picked: cv.myTeams.map(nwTKey) }, games: [], teams: [], leagues: [], headlines: { byGame: {}, byTeam: {}, byLeague: {} } };
      if (cv.slate) cv.games.forEach(function (g) {
        facts.games.push({ id: g.id, lg: g.league, league: info(g).name, away: g.away, home: g.home, awayRecord: g.awayRecord || "", homeRecord: g.homeRecord || "", start: g.start, status: ({ live: "live now", over: "finished", upcoming: "not started" })[status(g).kind] || "", tv: (g.tv || []).slice(0, 2).join(", "), note: g.note || "" });
        var seen = {}, hs = nwTeamHeads(g.away, g.league, 2).concat(nwTeamHeads(g.home, g.league, 2)).filter(function (a) { if (seen[a.url]) return false; seen[a.url] = 1; return true; });
        if (hs.length) facts.headlines.byGame[g.id] = hs.slice(0, 4);
      });
      if (cv.teams) cv.myTeams.forEach(function (t) { facts.teams.push({ name: t.name, lg: t.lg, league: (LEAGUES[t.lg] || {}).name || t.lg }); var hs = nwTeamHeads(t.name, t.lg, 2); if (hs.length) facts.headlines.byTeam[t.name] = hs; });
      cv.lgs.forEach(function (lg) { facts.leagues.push({ key: lg, name: (LEAGUES[lg] || {}).name || lg }); facts.headlines.byLeague[lg] = (((nw.feeds[lg] || {}).items) || []).slice(0, 8).map(nwLite); });
      if (prevDoc && prevDoc.top) facts.prev = prevDoc.top.map(function (x) { return x.title; });
      return nwPost({ pass: pass, kind: "news", key: "page", date: date, game: {}, facts: facts }, k);
    });
  }
  // a tap-in breakdown: its subject plus the free facts we have (ESPN's game summary, headlines, what the card said)
  function nwAskDeep(d) {
    var pass = slatePass(); if (!pass) { toast("Enter your passcode first (bottom of the page)"); return; }
    var k = "n:" + d.path, day = d.day || state.date, page = (day === state.date && nw.docs[nwPagePath()]) || {}; CL_ASK[k] = Date.now(); keepScroll(renderNews);
    var subj, factsP;
    if (d.type === "g") {
      var g = nwGames().filter(function (x) { return x.id === d.id; })[0]; if (!g) { delete CL_ASK[k]; toast("That game isn't on today's slate any more"); return; }
      subj = clGame(g);
      factsP = Promise.all([nwFeed(g.league).then(null, function () { return []; }), bxFindEvent(g).then(function (ev) { return ev ? rkFetch(bxSummaryUrl(g.league, ev)) : null; }).then(function (sum) { return sum ? trimEspn(sum, g, "preview") : {}; }, function () { return {}; })]).then(function (r) {
        var f = r[1] || {}; f.headlines = nwTeamHeads(g.away, g.league, 4).concat(nwTeamHeads(g.home, g.league, 4));
        f.card = (page.games || []).filter(function (x) { return x.id === g.id; })[0] || null; return f;
      });
    } else if (d.type === "t") {
      subj = { team: d.name, league: (LEAGUES[d.lg] || {}).name || d.lg };
      factsP = nwFeed(d.lg).then(null, function () { return []; }).then(function () {
        var gm = nwGames().filter(function (x) { return x.league === d.lg && (x.away === d.name || x.home === d.name); })[0];
        return { headlines: nwTeamHeads(d.name, d.lg, 8), card: nwTeamDoc(page, d.name, d.lg), today: gm ? clGame(gm) : null };
      });
    } else {
      // a league briefing (3.80.0): the newest ESPN and Athletic headlines (fetched again on this tap), what the
      // dashboard said, and today's games in the league (the slate's first, then the rest of the board, 20 at most)
      subj = { league: (LEAGUES[d.lg] || {}).name || d.lg };
      factsP = nwFeed(d.lg, true).then(null, function () { return []; }).then(function () {
        var mine = nwGames().filter(function (x) { return x.league === d.lg; }), ids = mine.map(function (x) { return x.id; });
        var rest = day === state.date ? games().filter(function (x) { return x.league === d.lg && !x.custom && ids.indexOf(x.id) === -1; }) : [];
        return { headlines: (((nw.feeds[d.lg] || {}).items) || []).slice(0, 20).map(nwLite), card: (page.leagues || []).filter(function (x) { return x.key === d.lg; })[0] || null,
          slate: mine.map(clGame), today: rest.slice(0, Math.max(0, 20 - mine.length)).map(function (x) { var o = clGame(x); o.status = ({ live: "live now", over: "finished", upcoming: "not started" })[status(x).kind] || ""; return o; }) };
      });
    }
    factsP.then(function (facts) { return nwPost({ pass: pass, kind: "deep", key: d.key, date: day, game: subj, facts: facts }, k); });
  }
  function nwTeamDoc(page, name, lg) { var n = String(name || "").toLowerCase(); return ((page || {}).teams || []).filter(function (x) { return String(x.name || "").toLowerCase() === n && (!x.lg || !lg || x.lg === lg); })[0] || null; }
  function nwOpenDeep(d) {
    d.key = nwDeepKey(d); d.path = "newsdeep/" + state.date + "-" + d.key; d.y = paneY();
    nw.deep = d;
    // opening never asks Claude (3.51.1): a saved breakdown shows right away, otherwise the page has a Generate button
    nwSub(d.path);
    renderNews(); renderBack(); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0);
    var b = $("nw-body"); if (b && !REDUCED) { b.classList.remove("push-in"); void b.offsetWidth; b.classList.add("push-in"); setTimeout(function () { b.classList.remove("push-in"); }, 320); }
  }
  // Back (the dock's, a swipe, or the row at the top) returns from a breakdown to the page, where you were
  function nwCloseDeep() {
    var d = nw.deep; if (!d) return false; nw.deep = null; renderNews(); renderBack();
    var y = d.y || 0; setTimeout(function () { if (isDuo) $("pane-r").scrollTop = y; else window.scrollTo(0, y); }, 0);
    return true;
  }
  // ----- small pieces every card shares -----
  function nwTeamBadge(name, g, side) {
    if (g && side) return badgeFor(abbr(g, side), g[side], g[side + "Color"], g[side + "Alt"]);
    var t = teamByName(name); return t ? teamBadge(t) : badgeFor(String(name || "?").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(), name || "");
  }
  // quick hits: the tag on its own line above the text, so every line of text starts at the same edge
  // emojis (3.52.2, DJ's ask): one in front of a section label or tag, never inside the text Claude wrote
  function nwEm(e) { var s = el("span", "nx-em", e); s.setAttribute("aria-hidden", "true"); return s; }
  // a tag Claude wrote as Hot (or Red-hot, On fire, Heating up) gets the 🔥 and red; Cold gets the 🧊 (3.52.3)
  var NW_HOT = /^(red[- ]?hot|hot|on fire|heating up)\b/i, NW_COLD = /^(ice[- ]?cold|cold|cooling off)\b/i;
  function nwTag(tag, alert) {
    var hot = NW_HOT.test(tag), t = el("span", "nx-tag" + (hot ? " hot" : alert ? " alert" : ""));
    var e = hot ? "🔥" : NW_COLD.test(tag) ? "🧊" : nwCatEm(tag); if (e) t.appendChild(nwEm(e));
    t.appendChild(document.createTextNode(tag)); return t;
  }
  // one emoji per tag, by what kind of story it is (3.82.0; DJ asked for emojis on News tags, never in the text)
  var NW_CATS = [[/injur|hurt|out\b|doubt|questionable|ir\b/i, "🚑"], [/trade|deal|swap|transfer/i, "🔁"], [/sign|contract|extension|agree/i, "✍️"], [/fire|coach|hire|staff/i, "📋"],
    [/upset|stun|shock/i, "😱"], [/record|milestone|history|career|season[- ]high/i, "📈"], [/streak|run\b|rolling|won \d/i, "🔥"], [/slump|skid|lost \d|losing/i, "🧊"], [/suspen|ban|fine|discipline/i, "⛔"],
    [/rumou?r|report|buzz|watch/i, "👀"], [/draft|prospect|recruit|portal/i, "🎓"], [/rank|poll|standing|playoff|bracket|seed/i, "📊"], [/return|back\b|activated/i, "💪"], [/debut|rookie|breakout/i, "🌟"],
    [/result|final|win|won|beat|loss|lost/i, "🏁"], [/tonight|schedule|matchup|preview|game/i, "🗓️"], [/quote|said/i, "💬"], [/storyline|story|news/i, "📰"]];
  function nwCatEm(tag) { var t = String(tag || ""); for (var i = 0; i < NW_CATS.length; i++) if (NW_CATS[i][0].test(t)) return NW_CATS[i][1]; return t ? "📰" : ""; }
  function nwChip(chip, tone) { var hot = NW_HOT.test(chip), c = el("span", "nx-chipt " + (hot ? "hot" : tone || "")); if (hot || NW_COLD.test(chip)) c.appendChild(nwEm(hot ? "🔥" : "🧊")); c.appendChild(document.createTextNode(chip)); return c; }
  // a team named in the text, when Claude didn't say which team (3.83.3): a full name ("Detroit Lions") anywhere, or a
  // nickname ("Lions") that only one team in that league has
  var NW_TLG = { nfl: "NFL", nba: "NBA", mlb: "MLB", nhl: "NHL", wnba: "WNBA", mls: "MLS", epl: "Premier League", laliga: "La Liga", seriea: "Serie A", bundesliga: "Bundesliga", ligue1: "Ligue 1", ncaaf: "College", ncaam: "College", ncaaw: "College" };
  function nwFindTeam(text, lg) {
    var tx = String(text || ""), lo = tx.toLowerCase(), want = NW_TLG[lg] || "", pool = teamIndex().filter(function (t) { return !want || t.lg === want; });
    var full = pool.filter(function (t) { return t.name.length > 5 && lo.indexOf(t.name.toLowerCase()) !== -1; });
    if (full.length) return full.sort(function (a, b) { return b.name.length - a.name.length; })[0];
    if (!want || want === "College") return null;
    var nick = pool.filter(function (t) { var w = t.name.split(" ").pop(); return w.length > 3 && new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(tx); });
    return nick.length === 1 ? nick[0] : null;
  }
  function nwLgOfTeam(t) { if (!t) return ""; for (var k in NW_TLG) if (NW_TLG[k] === t.lg && t.lg !== "College") return k; return ""; }
  function nwSportEm(lg) { var b = String(bxBase(lg) || ""); return /football\/(nfl|college)/.test(b) ? "🏈" : /basketball/.test(b) ? "🏀" : /hockey/.test(b) ? "🏒" : /baseball/.test(b) ? "⚾" : /soccer/.test(b) ? "⚽" : "🏆"; }
  // quick hits as feed boxes (3.83.3, DJ: the league sections in the new look): the team's color and logo, the tag
  function nwTopLgs(doc) {
    var o = {}; (((doc || {}).cover || {}).leagues || []).forEach(function (k) { o[k] = 1; }); nwGames().forEach(function (g) { o[g.league] = 1; }); myTeamList().forEach(function (t) { o[t.lg] = 1; });
    return Object.keys(o).filter(function (k) { return NW_TLG[k]; });
  }
  function nwBoxHits(list, lg) {
    var w = el("div", "nx-boxes nx-hitb");
    (list || []).forEach(function (h) {
      var t = nwTeam(h.team, lg) || nwFindTeam(h.text, lg), b = nwBox(t, h.team, [h.tag ? nwPill(h.tag) : null], t ? "" : "plain");
      b.appendChild(el("p", "nx-bx", h.text)); w.appendChild(b);
    });
    return w;
  }
  function nwHits(list) {
    var w = el("div", "nx-hits");
    (list || []).forEach(function (h) { var r = el("div", "nx-hit"); if (h.tag) r.appendChild(nwTag(h.tag, /injur|out\b|suspen|doubt/i.test(h.tag))); r.appendChild(el("span", "nx-tx", h.text)); w.appendChild(r); });
    return w;
  }
  function nwRead(rd) {
    var a = el("a", "nx-read"); a.href = safeUrl(rd.url); a.target = "_blank"; a.rel = "noopener";
    // ESPN's picture beside it when the story is in a league feed already loaded (3.82.0)
    var it = null; Object.keys(nw.feeds).some(function (k) { it = nwItem(k, rd.url); return !!it; });
    var im = it && it.img ? nwImg(nwPic(it.img, 200), "nx-rimg") : null; if (im) { a.appendChild(im); a.classList.add("pic"); }
    var tx = el("span", "nx-rw"); tx.appendChild(el("span", "nx-rt", rd.title)); tx.appendChild(el("span", "nx-rs", (rd.source || "Read") + (it && it.at ? " · " + nwAgo(it.at) : ""))); a.appendChild(tx); return a;
  }
  function nwDeepRow(d, label) {
    var b = el("button", "nx-deep"); b.type = "button"; b.appendChild(icon("sparkle")); b.appendChild(el("span", "nx-dl", label || "Claude's breakdown")); b.appendChild(icon("more"));
    b.addEventListener("click", function () { nwOpenDeep(d); }); return b;
  }
  // the team schedules load on their own; draw the Teams tab again once they're in
  function nwLiteWait() { if (nw.liteT) return; nw.liteT = setTimeout(function () { nw.liteT = 0; if (state.view === "news" && !nw.deep && nw.tab === "teams") keepScroll(renderNews); }, 1200); }
  // which game and league cards are open on the page: all start collapsed, and what you open stays open for that
  // day's page on this phone (slate-newsopen: { d: date, k: [keys] })
  function nwOpenSet() { var o = null; try { o = JSON.parse(localStorage.getItem("slate-newsopen") || "null"); } catch (e) {} return o && o.d === state.date && Array.isArray(o.k) ? o.k : []; }
  function nwIsOpen(k) { return nwOpenSet().indexOf(k) !== -1; }
  function nwFoldBtn(hd, k, open, label) {
    hd.setAttribute("role", "button"); hd.tabIndex = 0; hd.setAttribute("aria-expanded", open ? "true" : "false"); hd.setAttribute("aria-label", label + (open ? ", collapse" : ", expand"));
    var go = function () { var l = nwOpenSet().filter(function (y) { return y !== k; }); if (!open) l.push(k); try { localStorage.setItem("slate-newsopen", JSON.stringify({ d: state.date, k: l })); } catch (e) {} keepScroll(renderNews); };
    hd.addEventListener("click", go); hd.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  }
  // ----- the live feed's look on News (3.82.0, DJ: "match the live feed designs, be creative") -----
  // a team named by Claude ("Philadelphia 76ers", "76ers") → the app's team (colors, abbreviation, logo)
  function nwTeam(name, lg) {
    if (!name) return null; var t = teamByName(name); if (t) return t;
    var hit = teamSearch(name), want = lg && LEAGUES[lg] ? (LEAGUES[lg].college ? "College" : LEAGUES[lg].name) : "";
    return hit.filter(function (x) { return !want || x.lg === want || (want === "Premier League" && x.lg === "Premier League"); })[0] || null;
  }
  // the colored edge (and a light tint) that every feed box carries, in the team's color
  function nwTint(node, t) { if (t && hexOk(t.c1)) node.style.setProperty("--nx-team", t.c1); return node; }
  function nwMark(t, name) { var b = t ? teamBadge(t) : badgeFor(String(name || "?").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(), name || ""); b.classList.add("nx-mk"); return b; }
  function nwPill(text, cls, em) { var p = el("span", "nx-pill" + (cls ? " " + cls : "")), e = em === undefined ? (NW_HOT.test(text) ? "🔥" : NW_COLD.test(text) ? "🧊" : nwCatEm(text)) : em; if (NW_HOT.test(text)) p.classList.add("hot"); if (e) p.appendChild(nwEm(e)); p.appendChild(document.createTextNode(text)); return p; }
  // players' ESPN ids, so a name Claude writes gets its headshot: from the ids ESPN tags its stories with, else the team's roster
  nw.ath = {}; nw.rost = {};
  function nwAthPut(lg, name, id) { var m = nw.ath[lg] = nw.ath[lg] || {}; m[pwKey(name)] = String(id); }
  function nwAthId(lg, name, t) {
    var m = nw.ath[lg] || {}, k = pwKey(name); if (m[k]) return m[k];
    if (t && t.abbr && bxBase(lg) && !nw.rost[lg + "|" + t.abbr]) {
      nw.rost[lg + "|" + t.abbr] = 1;
      rkFetch(bxApi(lg, "teams/" + String(t.abbr).toLowerCase() + "/roster")).then(function (d) {
        var any = 0, add = function (a) { if (a && a.id && a.displayName) { nwAthPut(lg, a.displayName, a.id); any = 1; } };
        ((d || {}).athletes || []).forEach(function (a) { if (a && Array.isArray(a.items)) a.items.forEach(add); else add(a); });
        if (any) nwRedraw();
      }, function () {});
    }
    return "";
  }
  function nwRedraw() { if (nw.rdT) return; nw.rdT = setTimeout(function () { nw.rdT = 0; if (state.view === "news") keepScroll(renderNews); }, 400); }
  function nwFace(name, team, lg) {
    var t = nwTeam(team, lg), f = playerFace({ name: name, id: nwAthId(lg, name, t), teamName: t ? t.name : team, team: t ? t.abbr : "", color: t && t.c1 }, lg);
    f.classList.add("nx-face"); return f;
  }
  // the newest headlines' pictures and links (free ESPN), found by url
  // ESPN's photos are 1296 wide: ask its image server for a phone-sized copy
  function nwPic(u, w) { var m = /^https:\/\/a\.espncdn\.com(\/photo\/[^?#]+)$/.exec(u || ""); return m ? "https://a.espncdn.com/combiner/i?img=" + m[1] + "&w=" + w : u; }
  // one <img> per picture, kept across redraws, so a photo still loading isn't started over each time the page redraws
  nw.imgs = {};
  function nwImg(src, cls) { var k = cls + "|" + src, im = nw.imgs[k]; if (!im) { im = nw.imgs[k] = document.createElement("img"); im.className = cls; im.alt = ""; im.onerror = function () { im.remove(); im.dead = 1; }; im.src = src; } return im.dead ? null : im; }
  function nwItem(lg, url) { return url ? ((((nw.feeds[lg] || {}).items) || []).filter(function (a) { return a.url === url; })[0] || null) : null; }
  // a feed box: the team's edge, a meta row (logo, team, pills on the right), then the text
  // why (3.83.4, DJ): the why-it's-here tag sits right beside the team name, top left; the other tags stay top right
  function nwBox(t, team, pills, cls, why) {
    var b = nwTint(el("div", "nx-box" + (cls ? " " + cls : "")), t), m = el("div", "nx-bm");
    if (t || team || why) { var tm = el("span", "nx-bt"); if (t || team) { tm.appendChild(nwMark(t, team)); tm.appendChild(el("b", null, t ? t.name : team)); } if (why) tm.appendChild(why); m.appendChild(tm); }
    var pr = el("span", "nx-bp"); (pills || []).forEach(function (p) { if (p) pr.appendChild(p); }); if (pr.firstChild) m.appendChild(pr);
    if (m.firstChild) b.appendChild(m); return b;
  }
  function nwSec(title, right) { var h = el("div", "nx-sec"); h.appendChild(el("b", null, title)); if (right) h.appendChild(el("span", null, right)); return h; }
  function nwGameHead(g) {
    var hd = el("div", "nx-gh"), l = el("div", "nx-gl");
    l.appendChild(el("span", "nx-lg", info(g).tag + (g.note ? " · " + g.note : "")));
    // the result is the card's job (3.50.1): each team's score beside it once the game is live or over, and Final, the
    // live clock or the start time on the right, the same free ESPN numbers as the slate
    var st = status(g), sc = state.showScores ? scoreOf(g) : null;
    ["away", "home"].forEach(function (sd) {
      var r = el("div", "nx-tm"); r.appendChild(nwTeamBadge(g[sd], g, sd)); r.appendChild(el("span", "nx-nm", short(g, sd))); if (g[sd + "Record"]) r.appendChild(el("span", "nx-rec", g[sd + "Record"]));
      if (sc) { var mine = Number(sd === "away" ? sc.a : sc.h), other = Number(sd === "away" ? sc.h : sc.a); r.appendChild(el("b", "nx-sc" + (sc.state === "post" && mine < other ? " lose" : ""), String(sd === "away" ? sc.a : sc.h))); }
      l.appendChild(r);
    });
    hd.appendChild(l);
    var rt = el("div", "nx-gr"), tv = (g.tv || []).filter(Boolean)[0];
    if (st.kind === "live") { rt.appendChild(el("b", "live", sc && sc.detail ? sc.detail : "Live")); if (tv) rt.appendChild(el("span", null, tv)); }
    else if (st.kind === "over") { rt.appendChild(el("b", null, st.final ? (sc && sc.detail && /OT|SO|\//.test(sc.detail) ? sc.detail : "Final") : "Likely over")); rt.appendChild(el("span", null, timeText(g.start))); }
    else { rt.appendChild(el("b", null, timeText(g.start))); if (tv) rt.appendChild(el("span", null, tv)); }
    hd.appendChild(rt);
    return hd;
  }
  // how long Claude has been writing, counted from the tap (or the server's mark), ticking once a second
  function nwElapsed(doc, k) {
    var t0 = Math.max(CL_ASK[k] || 0, doc && doc.writing && !doc.writing.error ? Date.parse(doc.writing.at) || 0 : 0) || Date.now(), s = el("b", "nx-el");
    var show = function () { var n = Math.max(0, Math.round((Date.now() - t0) / 1000)); s.textContent = Math.floor(n / 60) + ":" + ("0" + n % 60).slice(-2); };
    show(); var iv = setInterval(function () { if (!s.isConnected) { clearInterval(iv); return; } show(); }, 1000);
    return s;
  }
  // an accurate wait: how long the last page really took (saved with it by the server), or the usual range before there is one
  function nwTookText() {
    var t = 0; try { t = Number(localStorage.getItem("slate-newstook")) || 0; } catch (e) {}
    return t >= 20 ? "Your last page took " + Math.floor(t / 60) + ":" + ("0" + t % 60).slice(-2) + "; more picks take longer." : "It usually takes 1 to 3 minutes, longer with more picks.";
  }
  function nwErr(e, at) {
    var when = !!at && !isNaN(Date.parse(at));
    if (/ran too long/i.test(String(e || ""))) return (when ? "The try at " + timeText(at) + " was" : "That was") + " too much for one page, so it didn't finish. Leave out a few games or teams and try again.";
    return /credit balance|limit of/i.test(String(e || "")) || !when ? clErr(e) : "The try at " + timeText(at) + " didn't finish. Try again.";
  }
  // ----- the options: what to cover, then Generate -----
  function nwRenderOpts(body, doc, busy, doc0) {
    var o = nwOpts(), gs = nwGames(), tms = myTeamList().filter(function (t) { return bxBase(t.lg); }), has = !!(doc && doc.at);
    var put = function () { nwOptsPut(o); var d0 = nw.docs[nwPagePath()]; if (d0 && d0.writing && d0.writing.error) nw.errSeen = d0.writing.at; keepScroll(renderNews); };
    var ttl = el("div", "nx-ptitle"); ttl.appendChild(el("b", null, state.date === todayInHome() ? "Customize today's news" : "Customize this day's news")); ttl.appendChild(el("span", null, "Pick the games, teams and leagues to cover.")); body.appendChild(ttl);
    var wrap = el("div", "nx-picks" + (busy ? " busy" : ""));
    // one group: its name, how many are picked, All / Clear, then a chip for each thing (nothing picked to start)
    var group = function (title, list, cls, key, picked, setPicked, fill, empty) {
      var keys = list.map(key), n = keys.filter(function (k) { return picked.indexOf(k) !== -1; }).length;
      // each group folds: tap its name to collapse or expand it; remembered on this phone (3.52.12, slate-newsfold)
      var fold = {}; try { fold = JSON.parse(localStorage.getItem("slate-newsfold") || "{}") || {}; } catch (e) {}
      var shut = !!fold[cls] && list.length > 0;
      var hd = el("div", "nx-ph" + (shut ? " shut" : "")), hl = el("button", "nx-pt"); hl.type = "button"; hl.setAttribute("aria-expanded", shut ? "false" : "true");
      var ht = el("span", "nx-ptx"); ht.appendChild(el("b", null, title)); ht.appendChild(el("span", null, list.length ? n + " of " + list.length + " picked" : empty)); hl.appendChild(ht);
      if (list.length) { hl.appendChild(icon("more")); hl.addEventListener("click", function () { fold[cls] = shut ? 0 : 1; try { localStorage.setItem("slate-newsfold", JSON.stringify(fold)); } catch (e) {} keepScroll(renderNews); }); }
      hd.appendChild(hl);
      if (list.length > 1 && !shut) { var all = el("button", "nx-all", n === list.length ? "Clear" : "All"); all.type = "button"; all.addEventListener("click", function () { setPicked(n === list.length ? [] : keys); put(); }); hd.appendChild(all); }
      wrap.appendChild(hd); if (!list.length || shut) return;
      var ch = el("div", "nx-chips " + cls);
      list.forEach(function (x) {
        var k = key(x), on = picked.indexOf(k) !== -1, c = el("button", "nx-chip"); c.type = "button"; c.setAttribute("aria-pressed", on ? "true" : "false"); fill(c, x);
        c.addEventListener("click", function () { setPicked(on ? picked.filter(function (y) { return y !== k; }) : picked.concat([k])); put(); }); ch.appendChild(c);
      });
      wrap.appendChild(ch);
    };
    group(state.date === todayInHome() ? "Today's slate" : "This day's slate", gs, "g", function (g) { return g.id; }, o.gs.ids, function (v) { o.gs.ids = v; }, function (c, g) {
      c.setAttribute("aria-label", g.away + " at " + g.home + ", " + info(g).name + ", " + timeText(g.start));
      c.appendChild(el("span", "nx-cm", info(g).tag + " · " + timeText(g.start)));
      var r = el("span", "nx-cr"); r.appendChild(nwTeamBadge(g.away, g, "away")); r.appendChild(el("i", null, "@")); r.appendChild(nwTeamBadge(g.home, g, "home")); c.appendChild(r);
    }, "Nothing on the slate yet");
    group("My teams", tms, "t", nwTKey, o.ts, function (v) { o.ts = v; }, function (c, t) {
      c.setAttribute("aria-label", t.name + ", " + ((LEAGUES[t.lg] || {}).name || t.lg));
      c.appendChild(nwTeamBadge(t.name)); c.appendChild(el("span", "nx-cm", (LEAGUES[t.lg] || {}).tag || t.lg));
    }, "Pick your teams on the Teams page");
    var mine = {}; gs.forEach(function (g) { mine[g.league] = 1; }); tms.forEach(function (t) { mine[t.lg] = 1; });
    var lks = nwLeagueKeys().sort(function (a, b) { return (mine[b] ? 1 : 0) - (mine[a] ? 1 : 0) || NW_LGS.indexOf(a) - NW_LGS.indexOf(b); });
    group("Leagues", lks, "l", function (k) { return k; }, o.lgs, function (v) { o.lgs = v; }, function (c, k) { c.appendChild(el("span", "nx-cn", (LEAGUES[k] || {}).name || k)); }, "");
    body.appendChild(wrap);
    var cv = nwCover(), any = cv.slate || cv.teams || cv.lgs.length > 0, act = el("div", "nx-act");
    if (busy) { var sp = el("div", "nx-busy"); sp.appendChild(el("i", "cl-dot")); sp.appendChild(el("span", null, "Claude is writing your news…")); sp.appendChild(nwElapsed(doc0, "n:" + nwPagePath())); act.appendChild(sp); }
    else {
      var go = el("button", "nx-go"); go.type = "button"; go.appendChild(icon("sparkle")); go.appendChild(el("span", null, has ? "Regenerate news" : "Generate news")); go.disabled = !any;
      go.addEventListener("click", nwGenerate); act.appendChild(go);
      if (has) { var cn = el("button", "nx-cancel", "Keep the page from " + timeText(doc.at)); cn.type = "button"; cn.addEventListener("click", function () { nw.opts = false; renderNews(); }); act.appendChild(cn); }
    }
    act.appendChild(el("p", "nx-note", any ? (busy ? nwTookText() + " You can leave this page and come back." : "Claude researches your picks and writes the page. " + nwTookText() + " It only runs when you tap.") : "Nothing is picked yet. Pick at least one game, team or league."));
    body.appendChild(act);
  }
  // ----- the generated page -----
  function nwRenderPage(body, doc, busy, err, errAt) {
    var cov = doc.cover || {}, parts = []; if (cov.slate) parts.push("Slate"); if (cov.teams) parts.push("My teams"); (cov.leagues || []).forEach(function (k) { parts.push((LEAGUES[k] || {}).tag || k); });
    var gen = el("div", "nx-card nx-gen"), gl = el("div", "nx-genl"), today = state.date === todayInHome();
    gl.appendChild(el("b", null, "Generated " + (today ? "today" : fmtDate(state.date, { weekday: "short", month: "short", day: "numeric" })) + " at " + timeText(doc.at)));
    gl.appendChild(el("span", null, [nwAgo(doc.at), parts.join(", ")].filter(Boolean).join(" · "))); gen.appendChild(gl);
    if (busy) { var sp = el("span", "nx-busy sm"); sp.appendChild(el("i", "cl-dot")); sp.appendChild(el("span", null, "Writing a new one…")); sp.appendChild(nwElapsed(doc, "n:" + nwPagePath())); gen.appendChild(sp); }
    else { var rg = el("button", "nx-regen"); rg.type = "button"; rg.appendChild(el("span", null, "Regenerate")); rg.addEventListener("click", function () { nw.opts = true; renderNews(); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0); }); gen.appendChild(rg); }
    body.appendChild(gen);
    if (err) body.appendChild(el("p", "pv-none cl-err", nwErr(err, errAt)));
    // Top news: open until collapsed, then stays collapsed until opened again
    var top = doc.top || [];
    if (top.length) {
      var shut = false; try { shut = localStorage.getItem("slate-newstop") === "0"; } catch (e) {}
      var th = el("button", "nx-toph"); th.type = "button"; th.setAttribute("aria-expanded", shut ? "false" : "true");
      var tl = el("span", "nx-cl"); tl.appendChild(icon("sparkle")); tl.appendChild(el("span", null, "Top news · Claude's picks")); th.appendChild(tl);
      var tc = el("span", "nx-topn", String(top.length)); tc.appendChild(icon("more")); th.appendChild(tc);
      th.addEventListener("click", function () { try { localStorage.setItem("slate-newstop", shut ? "1" : "0"); } catch (e) {} keepScroll(renderNews); });
      var tcard = el("div", "nx-card nx-top" + (shut ? " shut" : "")); tcard.appendChild(th);
      body.appendChild(tcard);
      // each story is a feed box (3.82.0): its rank, the team's color and logo when Claude named one, the tag and NEW
      if (!shut) { var tw = el("div", "nx-boxes nx-tops"); top.forEach(function (x, i) {
        // the team (from Claude, else found in the story) and why it made the five: one of my teams, a game on my slate, or its league (3.83.3, DJ)
        var txt = x.title + " " + (x.why || ""), t = nwTeam(x.team, x.lg) || nwFindTeam(txt, x.lg);
        // no league from Claude: try the leagues this page covers (its picked leagues, the slate's, my teams'), keeping a team only one of them has
        if (!t && !x.lg) { var cands = []; nwTopLgs(doc).forEach(function (k) { var f = nwFindTeam(txt, k); if (f && cands.indexOf(f) === -1) cands.push(f); }); if (cands.length === 1) t = cands[0]; }
        var lg = x.lg || nwLgOfTeam(t), why = null;
        if (t && isFav(t.name, lg)) why = nwPill("My team", "why", "⭐");
        else if (t && nwGames().some(function (g) { return (!lg || g.league === lg) && (teamMatch(t.name, g.away, g.league) || teamMatch(t.name, g.home, g.league)); })) why = nwPill("On your slate", "why", "📺");
        else if (lg && LEAGUES[lg]) why = nwPill(LEAGUES[lg].tag, "why", nwSportEm(lg));
        var b = nwBox(t, x.team, [x.tag ? nwPill(x.tag) : null, x.new && doc.regen ? nwPill("NEW", "new", "🚨") : null], t ? "" : "plain", why);
        var hl = el("div", "nx-th2"); hl.appendChild(el("i", "nx-rank", String(i + 1))); hl.appendChild(el("b", null, x.title)); b.appendChild(hl);
        if (x.why) b.appendChild(el("p", "nx-bx", x.why)); tw.appendChild(b);
      }); body.appendChild(tw); }
    }
    // Games | Teams | Leagues: only the ones this page has; the leftmost opens first. Teams is only the favorite teams
    // picked in the options (3.50.1; cover.picked), not every team in the picked games; older pages have no list of
    // picks, so they show the favorites they wrote about.
    var gmap = {}; nwGames().forEach(function (g) { gmap[g.id] = g; });
    var dg = (doc.games || []).filter(function (x) { return gmap[x.id]; }), pk = cov.picked || myTeamList().map(nwTKey), dt = (doc.teams || []).filter(function (x) { return pk.indexOf((x.lg || "") + "|" + String(x.name).toLowerCase()) !== -1; }), dl = (doc.leagues || []).filter(function (x) { return LEAGUES[x.key]; });
    var tabs = []; if (dg.length) tabs.push(["games", "Games"]); if (dt.length) tabs.push(["teams", "Teams"]); if (dl.length) tabs.push(["leagues", "Leagues"]);
    if (!tabs.length) return;
    if (!tabs.some(function (t) { return t[0] === nw.tab; })) nw.tab = tabs[0][0];
    if (tabs.length > 1) {
      var seg = el("div", "nx-tabs"); seg.setAttribute("role", "tablist");
      tabs.forEach(function (t) { var b = el("button", null, t[1]); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", t[0] === nw.tab ? "true" : "false"); b.addEventListener("click", function () { if (nw.tab === t[0]) return; nw.tab = t[0]; keepScroll(renderNews); }); seg.appendChild(b); });
      body.appendChild(seg);
    }
    if (nw.tab === "games") {
      var lastT = "";
      dg.sort(function (a, b) { return String(gmap[a.id].start).localeCompare(String(gmap[b.id].start)); }).forEach(function (x) {
        var g = gmap[x.id], tt = timeText(g.start);
        if (tt !== lastT) { lastT = tt; var m = /^(.*?)\s*([AP]M)$/i.exec(tt), th2 = el("div", "nx-time"); th2.appendChild(el("b", null, m ? m[1] : tt)); if (m) th2.appendChild(el("i", null, m[2].toLowerCase())); body.appendChild(th2); }
        // each game is a drop-down (3.53.1): the matchup and score show, a tap opens Claude's summary under it
        var ok = "g:" + g.id, open = nwIsOpen(ok), c = el("div", "nx-card nx-game nx-dd" + (open ? "" : " shut")), gh = nwGameHead(g);
        // the edge carries both teams' colors, away on top (3.82.0)
        var hx = function (v) { v = String(v || ""); return hexOk(v) ? v : hexOk("#" + v) ? "#" + v : ""; };
        ["away", "home"].forEach(function (sd) { var v = hx(g[sd + "Color"]) || ((nwTeam(g[sd], g.league) || {}).c1) || ""; if (hexOk(v)) c.style.setProperty(sd === "away" ? "--nx-a" : "--nx-h", v); });
        gh.appendChild(icon("more")); nwFoldBtn(gh, ok, open, short(g, "away") + " at " + short(g, "home")); c.appendChild(gh);
        if (open) {
          var bd = el("div", "nx-bd"); bd.appendChild(el("p", "nx-story", x.story)); if (x.hits && x.hits.length) bd.appendChild(nwBoxHits(x.hits, g.league)); c.appendChild(bd);
          if (x.read) c.appendChild(nwRead(x.read));
          c.appendChild(nwDeepRow({ type: "g", id: g.id }));
        }
        body.appendChild(c);
      });
    } else if (nw.tab === "teams") {
      var tile = function (name, lg, g, side) {
        var x = nwTeamDoc(doc, name, lg); if (!x) return null;
        var b = nwTint(el("button", "nx-card nx-tile" + (x.tone === "alert" ? " alert" : "")), nwTeam(name, lg)); b.type = "button";
        var hd = el("div", "nx-th"); hd.appendChild(nwTeamBadge(name, g, side)); var rec = g && side ? g[side + "Record"] : ""; if (rec) hd.appendChild(el("span", "nx-rec", rec));
        if (x.chip) hd.appendChild(nwChip(x.chip, x.tone)); b.appendChild(hd);
        b.appendChild(el("b", "nx-tn", g && side ? short(g, side) : name)); b.appendChild(el("p", null, x.line));
        // the team's last result and next game, from ESPN's schedule (the same lines as the Teams page tiles)
        var mt = myTeamList().filter(function (t) { return t.lg === lg && String(t.name).toLowerCase() === String(name).toLowerCase(); })[0] || { name: name, lg: lg };
        var lite = tmLite(mt), ld = lite.d, le = lite.espn, ls = ld && le ? tmGameLine(ld.last, le.id, true) : null, nx = ld && le ? tmGameLine(ld.next, le.id, false) : null;
        if (lite.busy && !ld) nwLiteWait();
        var lines = el("div", "nx-tl"), row = function (lab, txt, wl) { var r = el("div", "nx-tlr"); r.appendChild(el("i", null, lab)); if (wl) r.appendChild(el("b", "rk-wl " + wl.toLowerCase(), wl)); r.appendChild(el("span", null, txt)); lines.appendChild(r); };
        row("Last", ls ? ls.t.replace(/^[WLT] /, "") : lite.busy && !ld ? "Loading…" : !ld ? "Schedule unavailable" : "No recent game", ls && state.showScores ? ls.k : "");
        row("Next", nx ? nx.t : lite.busy && !ld ? "Loading…" : !ld ? "\u00a0" : "No games scheduled");
        b.appendChild(lines);
        var ft = el("span", "nx-tf"); ft.appendChild(el("span", null, "Claude's breakdown")); ft.appendChild(icon("more")); b.appendChild(ft);
        b.addEventListener("click", function () { nwOpenDeep({ type: "t", name: name, lg: lg }); });
        return b;
      };
      var gr = el("div", "nx-grid");
      dt.forEach(function (x) {
        var g = null, sd = null; nwGames().some(function (y) { if (y.league !== x.lg) return false; var n = String(x.name).toLowerCase(); sd = String(y.away).toLowerCase() === n ? "away" : String(y.home).toLowerCase() === n ? "home" : null; if (sd) g = y; return !!sd; });
        var t = tile(x.name, x.lg, g, sd); if (t) gr.appendChild(t);
      });
      body.appendChild(gr);
    } else {
      dl.forEach(function (x) {
        var n = nwGames().filter(function (g) { return g.league === x.key; }).length;
        // each league is a drop-down too: its name shows, a tap opens the write-up
        var ok = "l:" + x.key, open = nwIsOpen(ok), c = el("div", "nx-card nx-lgc nx-dd" + (open ? "" : " shut")), lh = el("div", "nx-lh"), lt = el("div", "nx-lt");
        var ltn = el("b"); ltn.appendChild(nwEm(nwSportEm(x.key))); ltn.appendChild(document.createTextNode(" " + ((LEAGUES[x.key] || {}).name || x.key))); lt.appendChild(ltn);
        if (n) lt.appendChild(el("span", null, n + (n === 1 ? " game" : " games") + " on your slate")); lh.appendChild(lt);
        lh.appendChild(icon("more")); nwFoldBtn(lh, ok, open, (LEAGUES[x.key] || {}).name || x.key); c.appendChild(lh);
        if (open) {
          var bd = el("div", "nx-bd"); bd.appendChild(el("p", "nx-story", x.story)); if (x.hits && x.hits.length) bd.appendChild(nwBoxHits(x.hits, x.key)); c.appendChild(bd);
          if (x.read) c.appendChild(nwRead(x.read));
          if (nwBriefLgs().indexOf(x.key) !== -1) { var lb = el("button", "nx-deep"); lb.type = "button"; lb.appendChild(icon("sparkle")); lb.appendChild(el("span", "nx-dl", (LEAGUES[x.key] || {}).tag + " briefing")); lb.appendChild(icon("more")); lb.addEventListener("click", function () { nwPickLg(x.key); }); c.appendChild(lb); }
          else c.appendChild(nwDeepRow({ type: "l", lg: x.key }));
        }
        body.appendChild(c);
      });
    }
  }
  // ----- a breakdown: one game, team or league, written by Claude on the tap that opened it -----
  function nwRenderDeep(body, brief) {
    var d = brief || nw.deep, doc = nw.docs[d.path], page = nw.docs[nwPagePath()] || {}, has = !!(doc && doc.take && doc.take.length), k = "n:" + d.path;
    if (brief) { nwRenderBriefTop(body, d, doc, has, k); if (!has) return; }
    else {
    var bk = el("button", "nx-back"); bk.type = "button"; bk.appendChild(icon("back")); bk.appendChild(el("span", null, d.type === "g" ? "Games" : d.type === "t" ? "Teams" : "Leagues")); bk.addEventListener("click", nwCloseDeep); body.appendChild(bk);
    var hero = el("div", "nx-card nx-hero");
    if (d.type === "g") { var g = nwGames().filter(function (x) { return x.id === d.id; })[0]; if (g) hero.appendChild(nwGameHead(g)); else hero.appendChild(el("b", "nx-hn", "Game")); }
    else if (d.type === "t") {
      var hr = el("div", "nx-hrow"); hr.appendChild(nwTeamBadge(d.name)); var ht = el("div"); ht.appendChild(el("b", "nx-hn", d.name)); ht.appendChild(el("span", "nx-hs", (LEAGUES[d.lg] || {}).name || "")); hr.appendChild(ht);
      var mood = has && doc.mood ? doc.mood : (nwTeamDoc(page, d.name, d.lg) || {}).chip; if (mood) hr.appendChild(nwChip(mood, "")); hero.appendChild(hr);
    } else { var hl = el("div", "nx-hrow"), h2 = el("div"); h2.appendChild(el("b", "nx-hn", (LEAGUES[d.lg] || {}).name || d.lg)); var ng = nwGames().filter(function (x) { return x.league === d.lg; }).length; h2.appendChild(el("span", "nx-hs", ng ? ng + (ng === 1 ? " game" : " games") + " on your slate" : "League news")); hl.appendChild(h2); hero.appendChild(hl); }
    body.appendChild(hero);
    if (!has) {
      var wr = clWriting(doc, k);
      if (doc === undefined || (wr && wr.busy)) { var sp = el("div", "nx-busy pad"); sp.appendChild(el("i", "cl-dot")); sp.appendChild(el("span", null, doc === undefined ? "Opening…" : "Claude is writing this breakdown… usually under a minute")); body.appendChild(sp); return; }
      body.appendChild(claudeCtl("deep", doc, false, { k: k, go: function () { nwAskDeep(d); } }, "Generate Claude's breakdown"));
      body.appendChild(el("p", "nx-note", "Nobody has generated this one today. Claude writes it only when you tap Generate, and then it's saved for the day.")); return;
    }
    }
    var sec = function (title, cl, em) { var h = el("div", "nx-h2" + (cl ? " nx-cl" : "")); if (cl) h.appendChild(icon("sparkle")); if (em) h.appendChild(nwEm(em)); h.appendChild(el("span", null, title)); body.appendChild(h); };
    var rows = function (list, key) { var c = el("div", "nx-card nx-rows"); list.forEach(function (x) { var r = el("div", "nx-row"); r.appendChild(el("b", null, x[key])); r.appendChild(el("span", null, x.text)); c.appendChild(r); }); return c; };
    var lg = d.lg || (d.type === "g" ? ((nwGames().filter(function (x) { return x.id === d.id; })[0] || {}).league) : ""), dteam = d.type === "t" ? nwTeam(d.name, lg) : null;
    if (lg && !nw.feeds[lg]) nwFeed(lg).then(nwRedraw, function () {});  // free: the story pictures and the players' ids
    // the big story (a league briefing): ESPN's picture when Claude named the headline, the team's color, a tap opens it
    if (doc.lead && doc.lead.title) {
      var lt = nwTeam(doc.lead.team, lg), it = nwItem(lg, doc.lead.url);
      // The Athletic's stories carry no picture: use the newest ESPN photo of a story about the same team (3.82.1)
      var pic = it && it.img ? it.img : lt ? ((((nw.feeds[lg] || {}).items) || []).filter(function (a) { return a.img && nwAbout(a, lt.name); })[0] || {}).img : "";
      var ld = nwTint(el(doc.lead.url ? "a" : "div", "nx-lead"), lt);
      if (doc.lead.url) { ld.href = safeUrl(doc.lead.url); ld.target = "_blank"; ld.rel = "noopener"; }
      var im = pic ? nwImg(nwPic(pic, 720), "nx-limg") : null; if (im) ld.appendChild(im);
      var lb = el("div", "nx-lbody"), lm = el("div", "nx-bm"); var lp = el("span", "nx-bt"); if (lt) { lp.appendChild(nwMark(lt)); lp.appendChild(el("b", null, lt.name)); } lm.appendChild(lp);
      var lpr = el("span", "nx-bp"); lpr.appendChild(nwPill("The big story", "lead", "🗞️")); lm.appendChild(lpr); lb.appendChild(lm);
      lb.appendChild(el("b", "nx-lt", doc.lead.title)); if (doc.lead.text) lb.appendChild(el("p", null, doc.lead.text));
      if (it) lb.appendChild(el("span", "nx-lsrc", it.src + " · " + nwAgo(it.at))); ld.appendChild(lb); body.appendChild(ld);
    }
    sec(d.type === "l" ? "Around the league" : "Claude's take", true);
    var tk = nwTint(el("div", "nx-card nx-take"), dteam); if (doc.verdict) tk.appendChild(el("span", "nx-verdict", doc.verdict)); doc.take.forEach(function (p) { tk.appendChild(el("p", null, p)); }); body.appendChild(tk);
    // the newest stories, one feed box each: the team's color and logo, what kind of story it is, NEW when it's today's
    var latest = function () {
      sec("Latest", false, "📰"); var w = el("div", "nx-boxes");
      doc.latest.forEach(function (x) { var t = nwTeam(x.team, lg) || dteam, b = nwBox(t, x.team, [x.tag ? nwPill(x.tag) : null, x.fresh ? nwPill("NEW", "new", "🚨") : null], t ? "" : "plain"); b.appendChild(el("p", "nx-bx", x.text)); w.appendChild(b); });
      body.appendChild(w);
    };
    if (d.type === "l" && doc.latest && doc.latest.length) latest();
    if (doc.number) {
      sec("The number", false, "🔢"); var nt = nwTeam(doc.number.team, lg) || dteam, nb = nwTint(el("div", "nx-card nx-num" + (String(doc.number.value).length > 7 ? " long" : "")), nt);
      nb.appendChild(el("b", null, doc.number.value)); var np = el("div", "nx-nt"); if (nt) np.appendChild(nwMark(nt)); np.appendChild(el("p", null, doc.number.text)); nb.appendChild(np); body.appendChild(nb);
    }
    if (d.type !== "l" && doc.latest && doc.latest.length) latest();
    if (doc.watch && doc.watch.length) { sec("What to watch for", false, "👀"); var wc = el("div", "nx-boxes"); doc.watch.forEach(function (x) { var b = nwBox(null, "", [x.tag ? nwPill(x.tag) : null], "plain"); b.appendChild(el("p", "nx-bx", x.text)); wc.appendChild(b); }); body.appendChild(wc); }
    if (doc.sides && doc.sides.length) {
      sec("Each side in a line"); var sg = el("div", "nx-grid");
      doc.sides.forEach(function (x) { var t = nwTeam(x.team, lg), c = nwTint(el("div", "nx-card nx-side"), t); var hh = el("div", "nx-th"); hh.appendChild(t ? nwMark(t) : nwTeamBadge(x.team)); hh.appendChild(el("b", "nx-sn", t ? t.name : x.team)); c.appendChild(hh); c.appendChild(el("p", null, x.text)); sg.appendChild(c); });
      body.appendChild(sg);
    }
    // who's hot and who's not: two columns, each team a row with its logo, red for hot and blue for cold
    if ((doc.hot && doc.hot.length) || (doc.cold && doc.cold.length)) {
      sec("Who's hot, who's not", false, "🌡️"); var hg = el("div", "nx-grid nx-hc");
      [["hot", "Hot", "🔥"], ["cold", "Cold", "🧊"]].forEach(function (o) {
        var l = doc[o[0]] || []; if (!l.length) return; var c = el("div", "nx-card nx-temp " + o[0]); c.appendChild(nwPill(o[1], o[0], o[2]));
        l.forEach(function (x) { var t = nwTeam(x.team, lg), r = nwTint(el("div", "nx-tr"), t); r.appendChild(nwMark(t, x.team)); var tx = el("div"); tx.appendChild(el("b", null, t ? t.name : x.team)); tx.appendChild(el("span", null, x.text)); r.appendChild(tx); c.appendChild(r); });
        hg.appendChild(c);
      });
      body.appendChild(hg);
    }
    // standout performances: Box Office's player cards (headshot in the team's color, the stat line as a tag)
    if (doc.perf && doc.perf.length) {
      sec("Performances", false, "⭐"); var pw = el("div", "nx-boxes");
      doc.perf.forEach(function (x) {
        var t = nwTeam(x.team, lg), c = nwTint(el("div", "nx-pc"), t);
        if (x.player) c.appendChild(nwFace(x.player, x.team, lg));
        var tx = el("div", "nx-pt"), nm = el("div", "nx-pn"); if (x.player) nm.appendChild(el("b", null, x.player)); if (t && t.abbr) nm.appendChild(el("span", "nx-ab", t.abbr)); if (nm.firstChild) tx.appendChild(nm);
        if (x.tag) tx.appendChild(nwPill(x.tag, "stat", "⭐")); tx.appendChild(el("p", null, x.text)); c.appendChild(tx); pw.appendChild(c);
      });
      body.appendChild(pw);
    }
    if (doc.said && doc.said.text) { sec("Said", false, "💬"); var sc = nwTint(el("div", "nx-card nx-said"), dteam); sc.appendChild(el("p", null, doc.said.text)); if (doc.said.who) sc.appendChild(el("span", null, doc.said.who)); body.appendChild(sc); }
    // injuries: the live feed's red timeout boxes, with the player's headshot and a status tag
    if (doc.injuries && doc.injuries.length) {
      sec("Injuries", false, "🚑"); var iw = el("div", "nx-boxes");
      doc.injuries.forEach(function (x) {
        if (typeof x === "string") x = { text: x };
        var t = nwTeam(x.team, lg), c = nwTint(el("div", "nx-inj"), t);
        if (x.player) c.appendChild(nwFace(x.player, x.team, lg));
        var tx = el("div", "nx-pt"), nm = el("div", "nx-pn"); if (x.player) nm.appendChild(el("b", null, x.player)); if (t && t.abbr) nm.appendChild(el("span", "nx-ab", t.abbr)); if (x.status) nm.appendChild(nwPill(x.status, "inj", "🚑")); if (nm.firstChild) tx.appendChild(nm);
        tx.appendChild(el("p", null, x.text)); c.appendChild(tx); iw.appendChild(c);
      });
      body.appendChild(iw);
    }
    if (doc.timeline && doc.timeline.length) { sec(d.type === "g" ? "How they got here" : "The timeline", false, "🗓️"); body.appendChild(rows(doc.timeline, "when")); }
    if (doc.next) { sec("Next up", false, "⏭️"); var nc = el("div", "nx-card nx-pad"); nc.appendChild(el("p", "nx-story", doc.next)); body.appendChild(nc); }
    if (doc.hunch) { sec("Claude's hunch", true); var hc = el("div", "nx-card nx-pad"); hc.appendChild(el("p", "nx-story", doc.hunch)); body.appendChild(hc); }
    if (doc.reads && doc.reads.length) { sec("Read more", false, "📖"); var rc = el("div", "nx-card nx-reads"); doc.reads.forEach(function (r) { rc.appendChild(nwRead(r)); }); body.appendChild(rc); }
    body.appendChild(el("p", "nx-foot", "Written by Claude from ESPN's data and its own research · " + nwAgo(doc.at)));
    if (!brief) body.appendChild(claudeCtl("deep", doc, true, { k: k, go: function () { nwAskDeep(d); } }, "Write Claude's breakdown"));
  }
  // ----- the tabs (3.80.0, DJ's ask): Press Box (the personal page) first, then one tab per league -----
  // A league tab is a one-tap briefing: Claude reads the newest ESPN and Athletic headlines and searches the web.
  // It's the same shared write-up as a league's breakdown (newsdeep/<today>-l-<league>), always for today, and
  // writes only on a tap (Generate, or Update once one exists). The picked tab lasts while the app is open.
  var NW_HOME = "Press Box";
  function nwBriefLgs() {
    var ok = nwLeagueKeys(), ord = (state.gamesOrder || []).filter(function (k) { return ok.indexOf(k) !== -1; });
    if (ord.length < 3) ord = ORDER.filter(function (k) { return ok.indexOf(k) !== -1; });
    return ord;
  }
  function nwBriefOf(lg) { var day = todayInHome(), d = { type: "l", lg: lg, day: day }; d.key = nwDeepKey(d); d.path = "newsdeep/" + day + "-" + d.key; return d; }
  function nwPickLg(lg) {
    nw.lg = lg; renderNews();
    if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0);
  }
  // a sideways swipe on News moves between Press Box and the league tabs (3.82.0, DJ: never Back); at either end it
  // springs back. The swipe code itself is in 280-ios-bridge.js (mode "news").
  function nwSwipe(step) {
    var list = [null].concat(nwBriefLgs()), i = list.indexOf(nw.lg), n = i < 0 ? undefined : list[i + step];
    if (n === undefined) return false;
    nw.lg = n; nw.stripX = null; renderNews(); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0);
    slideIn($("nw-body"), step > 0 ? "l" : "r"); return true;
  }
  function nwStrip(body) {
    var strip = el("div", "strip nx-strip"), list = [[null, NW_HOME]].concat(nwBriefLgs().map(function (k) { return [k, (LEAGUES[k] || {}).tag || k]; }));
    strip.setAttribute("role", "tablist"); strip.setAttribute("aria-label", "News");
    list.forEach(function (o) {
      var b = el("button", "lg-tab" + (o[0] ? "" : " nx-home"), o[1]); b.type = "button"; b.setAttribute("aria-pressed", nw.lg === o[0] ? "true" : "false");
      b.addEventListener("click", function () { if (nw.lg !== o[0]) nwPickLg(o[0]); }); strip.appendChild(b);
    });
    body.appendChild(strip);
    // rebuilt on every refresh: keep the strip where it was scrolled, and the picked tab in view
    var onT = strip.querySelector("[aria-pressed=true]");
    if (nw.stripX != null) strip.scrollLeft = nw.stripX;
    if (onT) { var x0 = onT.offsetLeft - strip.offsetLeft, sl = strip.scrollLeft; if (x0 < sl || x0 + onT.offsetWidth > sl + strip.clientWidth) strip.scrollLeft = Math.max(0, x0 - (strip.clientWidth - onT.offsetWidth) / 2); }
    strip.addEventListener("scroll", function () { nw.stripX = strip.scrollLeft; }, { passive: true });
  }
  // a briefing's top: the league, when it was written, and the one button (Generate, or Update)
  function nwRenderBriefTop(body, d, doc, has, k) {
    var name = (LEAGUES[d.lg] || {}).name || d.lg, tag = (LEAGUES[d.lg] || {}).tag || d.lg, w = clWriting(doc, k), busy = !!(w && w.busy);
    var ng = d.day === state.date ? nwGames().filter(function (x) { return x.league === d.lg; }).length : 0;
    var hd = el("div", "nx-card nx-gen nx-bf"), hl = el("div", "nx-genl");
    hl.appendChild(el("b", null, name + " briefing"));
    hl.appendChild(el("span", null, has ? "Updated " + timeText(doc.at) + " · " + nwAgo(doc.at) : ng ? ng + (ng === 1 ? " game" : " games") + " on your slate today" : "The latest around the league"));
    hd.appendChild(hl);
    if (doc === undefined) { var op = el("span", "nx-busy sm"); op.appendChild(el("i", "cl-dot")); op.appendChild(el("span", null, "Opening…")); hd.appendChild(op); body.appendChild(hd); return; }
    if (busy) { var sp = el("span", "nx-busy sm"); sp.appendChild(el("i", "cl-dot")); sp.appendChild(el("span", null, has ? "Updating…" : "Writing…")); sp.appendChild(nwElapsed(doc, k)); hd.appendChild(sp); }
    else if (has) { var up = el("button", "nx-regen"); up.type = "button"; up.appendChild(el("span", null, "Update")); up.setAttribute("aria-label", "Update the " + tag + " briefing with Claude"); up.addEventListener("click", function () { nwAskDeep(d); }); hd.appendChild(up); }
    body.appendChild(hd);
    if (w && w.error && !busy) body.appendChild(el("p", "pv-none cl-err", clErr(w.error)));
    if (has || busy) { if (!has) { var wr = el("div", "nx-busy pad"); wr.appendChild(el("i", "cl-dot")); wr.appendChild(el("span", null, "Claude is reading the latest " + tag + " news… about a minute")); body.appendChild(wr); } return; }
    var go = el("button", "cl-go"); go.type = "button"; go.appendChild(icon("sparkle")); go.appendChild(el("span", "cl-l", "Generate " + tag + " briefing")); go.appendChild(el("span", "cl-t", "about a minute"));
    go.addEventListener("click", function () { nwAskDeep(d); }); var gb = el("div", "cl-ctl nx-bgo"); gb.appendChild(go); body.appendChild(gb);
    body.appendChild(el("p", "nx-note", "Claude reads the newest ESPN and Athletic headlines and searches the web, then writes up the latest " + tag + " news. It's saved for everyone for the day, and Update writes a fresh one."));
  }
  function renderNews() {
    if (state.view !== "news") return;
    // News is always today's (3.82.2, DJ): the app keeps the day it was on, so after a night left open, News (and
    // Regenerate's game picker) still had last night's slate. Opening News on an earlier day moves the app to today.
    var today0 = todayInHome(); if (state.date < today0 && !nw.toToday) { nw.toToday = 1; setTimeout(function () { nw.toToday = 0; if (state.view === "news" && state.date < todayInHome()) setDate(todayInHome()); }, 0); }
    var tb = $("nw-tabs"); tb.textContent = ""; tb.hidden = true;
    var body = $("nw-body"); body.textContent = ""; body.className = "nx";
    if (!db) { body.appendChild(el("p", "pv-none", "News needs the app's saved data, which isn't available here.")); return; }
    if (nw.deep && nw.deep.date !== undefined && nw.deep.date !== state.date) nw.deep = null;
    if (nw.deep) { nw.deep.date = state.date; nwRenderDeep(body); return; }
    if (nw.lg && nwBriefLgs().indexOf(nw.lg) === -1) nw.lg = null;
    nwStrip(body);
    if (nw.lg) { var bd = nwBriefOf(nw.lg); nwSub(bd.path); nwRenderDeep(body, bd); return; }
    var path = nwPagePath(); nwSub(path);
    var doc = nw.docs[path]; if (doc === undefined) { body.appendChild(el("p", "pv-none", "Loading…")); return; }
    var has = !!(doc && doc.at && ((doc.top || []).length || (doc.games || []).length || (doc.teams || []).length || (doc.leagues || []).length)), w = clWriting(doc, "n:" + path), busy = !!(w && w.busy), err = w && w.error;
    if (has && doc.took) try { localStorage.setItem("slate-newstook", String(doc.took)); } catch (e) {}
    if (has) doc.regen = !!(doc.top || []).some(function (x) { return x.new === false; });
    if (!has && state.date !== todayInHome() && !busy) { body.appendChild(el("p", "pv-none", "No news was generated for " + fmtDate(state.date, { weekday: "long", month: "short", day: "numeric" }) + ". Go back to today to generate a page.")); return; }
    // a failed try is shown with its time, only for half an hour, and goes away once the picks change (3.47.2: an old
    // failure used to sit above the options for the rest of the day and read like a new one)
    var wat = doc && doc.writing && doc.writing.at, errAt = wat ? Date.parse(wat) : 0;
    if (err && !CL_ASK["n:" + path] && (!errAt || Date.now() - errAt > 30 * 60000 || nw.errSeen === wat)) err = null;
    if (!has || nw.opts) { if (err && !busy) body.appendChild(el("p", "pv-none cl-err", nwErr(err, wat))); nwRenderOpts(body, has ? doc : null, busy, doc); return; }
    nwRenderPage(body, doc, busy, err, wat);
  }

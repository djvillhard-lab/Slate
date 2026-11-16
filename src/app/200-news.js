  // ---------- by channel ----------
  function chanKind(n) { return NATIONAL_TV.indexOf(n) !== -1 ? "national" : isStreaming(n) ? "streaming" : "regional"; }
  // ---------- News (3.45.0): a quick-look dashboard written by Claude, only when Generate is tapped ----------
  // 1. Options: what to cover (today's slate, my teams, leagues), then Generate news (one Claude request).
  // 2. The page: when it was generated + Regenerate (reopens the options), Top news (Claude's five picks), then
  //    Games | Teams | Leagues tabs. 3. Tap a game, team or league for a deeper breakdown, written on first tap and
  //    saved (shared by everyone). Free ESPN and Athletic headlines are handed to Claude as facts and link out.
  var ATH_SLUG = { nfl: "nfl", ncaaf: "college-football", nba: "nba", mlb: "mlb", nhl: "nhl", ncaam: "college-basketball", ncaaw: "womens-college-basketball", wnba: "wnba", mls: "mls", epl: "premier-league", ucl: "champions-league" };
  var NW_LGS = ["nfl", "ncaaf", "nba", "nhl", "ncaam", "mlb", "epl", "ucl", "mls", "ncaaw", "wnba", "laliga", "seriea", "bundesliga", "ligue1"];
  var nw = { feeds: {}, subs: {}, docs: {}, tab: null, deep: null, opts: false, optsAt: null };
  // one league's headlines: ESPN's news feed plus The Athletic's section feed, newest first (cached 10 minutes)
  function nwFeed(lg) {
    var c = nw.feeds[lg]; if (c && (c.busy || Date.now() - c.at < 10 * 60000)) return c.p;
    c = nw.feeds[lg] = { busy: true, at: Date.now(), items: c && c.items };
    var espn = rkFetch(bxApi(lg, "news?limit=40")).then(function (d) {
      return ((d || {}).articles || []).map(function (a) {
        var teams = (a.categories || []).filter(function (x) { return x.type === "team" && x.description; }).map(function (x) { return x.description; });
        var evs = (a.categories || []).filter(function (x) { return x.type === "event" && x.description; }).map(function (x) { return x.description.toLowerCase(); });
        return { title: a.headline, desc: a.description || "", url: ((a.links || {}).web || {}).href || "", at: a.published || a.lastModified || "", src: "ESPN", lg: lg, teams: teams, events: evs };
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
    var k = "n:" + d.path, page = nw.docs[nwPagePath()] || {}; CL_ASK[k] = Date.now(); keepScroll(renderNews);
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
      subj = { league: (LEAGUES[d.lg] || {}).name || d.lg };
      factsP = nwFeed(d.lg).then(null, function () { return []; }).then(function () {
        return { headlines: (((nw.feeds[d.lg] || {}).items) || []).slice(0, 16).map(nwLite), card: (page.leagues || []).filter(function (x) { return x.key === d.lg; })[0] || null, slate: nwGames().filter(function (x) { return x.league === d.lg; }).map(clGame) };
      });
    }
    factsP.then(function (facts) { return nwPost({ pass: pass, kind: "deep", key: d.key, date: state.date, game: subj, facts: facts }, k); });
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
  function nwHits(list) {
    var w = el("div", "nx-hits");
    (list || []).forEach(function (h) { var r = el("div", "nx-hit"); if (h.tag) r.appendChild(el("span", "nx-tag" + (/injur|out\b|suspen|doubt/i.test(h.tag) ? " alert" : ""), h.tag)); r.appendChild(el("span", "nx-tx", h.text)); w.appendChild(r); });
    return w;
  }
  function nwRead(rd) {
    var a = el("a", "nx-read"); a.href = safeUrl(rd.url); a.target = "_blank"; a.rel = "noopener";
    a.appendChild(el("span", "nx-rt", rd.title)); a.appendChild(el("span", "nx-rs", rd.source || "Read")); return a;
  }
  function nwDeepRow(d, label) {
    var b = el("button", "nx-deep"); b.type = "button"; b.appendChild(icon("sparkle")); b.appendChild(el("span", "nx-dl", label || "Claude's breakdown")); b.appendChild(icon("more"));
    b.addEventListener("click", function () { nwOpenDeep(d); }); return b;
  }
  // the team schedules load on their own; draw the Teams tab again once they're in
  function nwLiteWait() { if (nw.liteT) return; nw.liteT = setTimeout(function () { nw.liteT = 0; if (state.view === "news" && !nw.deep && nw.tab === "teams") keepScroll(renderNews); }, 1200); }
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
      var hd = el("div", "nx-ph"), hl = el("div"); hl.appendChild(el("b", null, title)); hl.appendChild(el("span", null, list.length ? n + " of " + list.length + " picked" : empty)); hd.appendChild(hl);
      if (list.length > 1) { var all = el("button", "nx-all", n === list.length ? "Clear" : "All"); all.type = "button"; all.addEventListener("click", function () { setPicked(n === list.length ? [] : keys); put(); }); hd.appendChild(all); }
      wrap.appendChild(hd); if (!list.length) return;
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
      if (!shut) top.forEach(function (x, i) {
        var r = el("div", "nx-topi"); r.appendChild(el("i", null, String(i + 1)));
        var tx = el("div", "nx-topt"), tg = el("div", "nx-tagrow"); if (x.tag) tg.appendChild(el("span", "nx-tag" + (/injur/i.test(x.tag) ? " alert" : ""), x.tag)); if (x.new && doc.regen) tg.appendChild(el("span", "nx-tag new", "New"));
        if (tg.firstChild) tx.appendChild(tg); tx.appendChild(el("b", null, x.title)); if (x.why) tx.appendChild(el("span", null, x.why)); r.appendChild(tx); tcard.appendChild(r);
      });
      body.appendChild(tcard);
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
        var c = el("div", "nx-card nx-game"); c.appendChild(nwGameHead(g));
        var bd = el("div", "nx-bd"); bd.appendChild(el("p", "nx-story", x.story)); if (x.hits && x.hits.length) bd.appendChild(nwHits(x.hits)); c.appendChild(bd);
        if (x.read) c.appendChild(nwRead(x.read));
        c.appendChild(nwDeepRow({ type: "g", id: g.id }));
        body.appendChild(c);
      });
    } else if (nw.tab === "teams") {
      var tile = function (name, lg, g, side) {
        var x = nwTeamDoc(doc, name, lg); if (!x) return null;
        var b = el("button", "nx-card nx-tile" + (x.tone === "alert" ? " alert" : "")); b.type = "button";
        var hd = el("div", "nx-th"); hd.appendChild(nwTeamBadge(name, g, side)); var rec = g && side ? g[side + "Record"] : ""; if (rec) hd.appendChild(el("span", "nx-rec", rec));
        if (x.chip) hd.appendChild(el("span", "nx-chipt " + (x.tone || ""), x.chip)); b.appendChild(hd);
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
        body.appendChild(nwSec((LEAGUES[x.key] || {}).name || x.key, n ? n + (n === 1 ? " game" : " games") + " on your slate" : ""));
        var c = el("div", "nx-card"), bd = el("div", "nx-bd"); bd.appendChild(el("p", "nx-story", x.story)); if (x.hits && x.hits.length) bd.appendChild(nwHits(x.hits)); c.appendChild(bd);
        if (x.read) c.appendChild(nwRead(x.read));
        c.appendChild(nwDeepRow({ type: "l", lg: x.key }));
        body.appendChild(c);
      });
    }
  }
  // ----- a breakdown: one game, team or league, written by Claude on the tap that opened it -----
  function nwRenderDeep(body) {
    var d = nw.deep, doc = nw.docs[d.path], page = nw.docs[nwPagePath()] || {}, has = !!(doc && doc.take && doc.take.length), k = "n:" + d.path;
    var bk = el("button", "nx-back"); bk.type = "button"; bk.appendChild(icon("back")); bk.appendChild(el("span", null, d.type === "g" ? "Games" : d.type === "t" ? "Teams" : "Leagues")); bk.addEventListener("click", nwCloseDeep); body.appendChild(bk);
    var hero = el("div", "nx-card nx-hero");
    if (d.type === "g") { var g = nwGames().filter(function (x) { return x.id === d.id; })[0]; if (g) hero.appendChild(nwGameHead(g)); else hero.appendChild(el("b", "nx-hn", "Game")); }
    else if (d.type === "t") {
      var hr = el("div", "nx-hrow"); hr.appendChild(nwTeamBadge(d.name)); var ht = el("div"); ht.appendChild(el("b", "nx-hn", d.name)); ht.appendChild(el("span", "nx-hs", (LEAGUES[d.lg] || {}).name || "")); hr.appendChild(ht);
      var mood = has && doc.mood ? doc.mood : (nwTeamDoc(page, d.name, d.lg) || {}).chip; if (mood) hr.appendChild(el("span", "nx-chipt", mood)); hero.appendChild(hr);
    } else { var hl = el("div", "nx-hrow"), h2 = el("div"); h2.appendChild(el("b", "nx-hn", (LEAGUES[d.lg] || {}).name || d.lg)); var ng = nwGames().filter(function (x) { return x.league === d.lg; }).length; h2.appendChild(el("span", "nx-hs", ng ? ng + (ng === 1 ? " game" : " games") + " on your slate" : "League news")); hl.appendChild(h2); hero.appendChild(hl); }
    body.appendChild(hero);
    if (!has) {
      var wr = clWriting(doc, k);
      if (doc === undefined || (wr && wr.busy)) { var sp = el("div", "nx-busy pad"); sp.appendChild(el("i", "cl-dot")); sp.appendChild(el("span", null, doc === undefined ? "Opening…" : "Claude is writing this breakdown… usually under a minute")); body.appendChild(sp); return; }
      body.appendChild(claudeCtl("deep", doc, false, { k: k, go: function () { nwAskDeep(d); } }, "Generate Claude's breakdown"));
      body.appendChild(el("p", "nx-note", "Nobody has generated this one today. Claude writes it only when you tap Generate, and then it's saved for the day.")); return;
    }
    var sec = function (title, cl) { var h = el("div", "nx-h2" + (cl ? " nx-cl" : "")); if (cl) h.appendChild(icon("sparkle")); h.appendChild(el("span", null, title)); body.appendChild(h); };
    var rows = function (list, key) { var c = el("div", "nx-card nx-rows"); list.forEach(function (x) { var r = el("div", "nx-row"); r.appendChild(el("b", null, x[key])); r.appendChild(el("span", null, x.text)); c.appendChild(r); }); return c; };
    sec(d.type === "l" ? "Around the league" : "Claude's take", true);
    var tk = el("div", "nx-card nx-take"); if (doc.verdict) tk.appendChild(el("span", "nx-verdict", doc.verdict)); doc.take.forEach(function (p) { tk.appendChild(el("p", null, p)); }); body.appendChild(tk);
    if (doc.number) { sec("The number"); var nb = el("div", "nx-card nx-num"); nb.appendChild(el("b", null, doc.number.value)); nb.appendChild(el("p", null, doc.number.text)); body.appendChild(nb); }
    if (doc.latest && doc.latest.length) { sec("Latest"); var lc = el("div", "nx-card nx-pad"); lc.appendChild(nwHits(doc.latest)); body.appendChild(lc); }
    if (doc.watch && doc.watch.length) { sec("What to watch for"); var wc = el("div", "nx-card nx-pad"); wc.appendChild(nwHits(doc.watch)); body.appendChild(wc); }
    if (doc.sides && doc.sides.length) {
      sec("Each side in a line"); var sg = el("div", "nx-grid");
      doc.sides.forEach(function (x) { var c = el("div", "nx-card nx-side"); var hh = el("div", "nx-th"); hh.appendChild(nwTeamBadge(x.team)); c.appendChild(hh); c.appendChild(el("p", null, x.text)); sg.appendChild(c); });
      body.appendChild(sg);
    }
    if ((doc.hot && doc.hot.length) || (doc.cold && doc.cold.length)) {
      sec("Who's hot, who's not"); var hg = el("div", "nx-grid");
      [["hot", "Hot", "up"], ["cold", "Cold", "down"]].forEach(function (o) { var l = doc[o[0]] || []; if (!l.length) return; var c = el("div", "nx-card nx-side"); c.appendChild(el("span", "nx-chipt " + o[2], o[1])); l.forEach(function (x) { var p = el("p"); p.appendChild(el("b", null, x.team + " ")); p.appendChild(document.createTextNode(x.text)); c.appendChild(p); }); hg.appendChild(c); });
      body.appendChild(hg);
    }
    if (doc.perf && doc.perf.length) { sec("Performances"); var pc = el("div", "nx-card nx-pad"); pc.appendChild(nwHits(doc.perf)); body.appendChild(pc); }
    if (doc.said && doc.said.text) { sec("Said"); var sc = el("div", "nx-card nx-said"); sc.appendChild(el("p", null, doc.said.text)); if (doc.said.who) sc.appendChild(el("span", null, doc.said.who)); body.appendChild(sc); }
    if (doc.injuries && doc.injuries.length) { sec("Injuries"); var ic = el("div", "nx-card nx-pad"); ic.appendChild(nwHits(doc.injuries.map(function (t) { return { tag: "", text: t }; }))); body.appendChild(ic); }
    if (doc.timeline && doc.timeline.length) { sec(d.type === "g" ? "How they got here" : "The timeline"); body.appendChild(rows(doc.timeline, "when")); }
    if (doc.next) { sec("Next up"); var nc = el("div", "nx-card nx-pad"); nc.appendChild(el("p", "nx-story", doc.next)); body.appendChild(nc); }
    if (doc.hunch) { sec("Claude's hunch", true); var hc = el("div", "nx-card nx-pad"); hc.appendChild(el("p", "nx-story", doc.hunch)); body.appendChild(hc); }
    if (doc.reads && doc.reads.length) { sec("Read more"); var rc = el("div", "nx-card nx-reads"); doc.reads.forEach(function (r) { rc.appendChild(nwRead(r)); }); body.appendChild(rc); }
    body.appendChild(el("p", "nx-foot", "Written by Claude from ESPN's data and its own research · " + nwAgo(doc.at)));
    body.appendChild(claudeCtl("deep", doc, true, { k: k, go: function () { nwAskDeep(d); } }, "Write Claude's breakdown"));
  }
  function renderNews() {
    if (state.view !== "news") return;
    var tb = $("nw-tabs"); tb.textContent = ""; tb.hidden = true;
    var body = $("nw-body"); body.textContent = ""; body.className = "nx";
    if (!db) { body.appendChild(el("p", "pv-none", "News needs the app's saved data, which isn't available here.")); return; }
    if (nw.deep && nw.deep.date !== undefined && nw.deep.date !== state.date) nw.deep = null;
    if (nw.deep) { nw.deep.date = state.date; nwRenderDeep(body); return; }
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

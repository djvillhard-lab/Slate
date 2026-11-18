  // News extras (3.104.0): free headlines before a page is generated, earlier days, and a link from a top story to its article.
  // Nothing here asks Claude for anything: headlines are ESPN's and The Athletic's own feeds, earlier days are pages already saved.
  (function () { var st = document.createElement("style"); st.id = "nwx-css"; st.textContent =
    ".nwx-note { margin: 4px 0 16px; font-size: 13px; color: var(--dim); }" +
    ".nwx-days { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; }" +
    ".nwx-day { min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink); font: inherit; font-size: 15px; font-weight: 700; }" +
    ".nwx-back { display: block; width: 100%; min-height: 44px; margin: 0 0 12px; text-align: left; }" +
    ".nwx-link { display: inline-block; margin-top: 6px; font-size: 13px; font-weight: 700; color: var(--accent); text-decoration: none; min-height: 28px; }";
    document.head.appendChild(st); })();
  var nwx = { past: null, days: null, daysFor: "" };
  // the leagues a person cares about today: their teams', then the slate's, then the big three
  function nwxLgs() {
    var out = []; var add = function (k) { if (k && out.indexOf(k) === -1 && LEAGUES[k] && bxBase(k) && NW_LGS.indexOf(k) !== -1) out.push(k); };
    myTeamList().forEach(function (t) { add(t.lg); }); nwGames().forEach(function (g) { add(g.league); }); ["nfl", "nba", "ncaaf"].forEach(add);
    return out.slice(0, 4);
  }
  // Headlines right now: the newest stories from those leagues, the person's teams first. Shown until today's page exists.
  function nwxHeads(body) {
    var lgs = nwxLgs(), items = [], mine = myTeamList();
    lgs.forEach(function (lg) {
      var c = nw.feeds[lg];
      if (!c) nwFeed(lg).then(nwRedraw, function () {});
      else if (c.items) c.items.slice(0, 12).forEach(function (a) { items.push(a); });
    });
    if (!items.length) return;
    var isMine = function (a) { return mine.some(function (t) { return t.lg === a.lg && nwAbout(a, t.name); }) ? 0 : 1; };
    var seen = {}; items = items.filter(function (a) { if (seen[a.title]) return false; seen[a.title] = 1; return true; });
    items.sort(function (a, b) { return isMine(a) - isMine(b) || (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
    body.appendChild(nwSec("Headlines right now", lgs.map(function (k) { return LEAGUES[k].tag; }).join(" · ")));
    var rc = el("div", "nx-card nx-reads");
    items.slice(0, 6).forEach(function (a) { rc.appendChild(nwRead({ title: a.title, url: a.url, source: a.src + " · " + LEAGUES[a.lg].tag })); });
    body.appendChild(rc);
    body.appendChild(el("p", "nwx-note", "Straight from ESPN and The Athletic. For a page written around your games and teams, pick them below."));
  }
  // Earlier days: the last six days that have a saved page. One look-up per day, once per session.
  function nwxDays(body) {
    var today = todayInHome(); if (!db) return;
    if (nwx.daysFor !== today) {
      nwx.daysFor = today; nwx.days = null; var ds = [], t0 = new Date(today + "T12:00:00");
      for (var i = 1; i <= 6; i++) { var d = new Date(t0.getTime() - i * 864e5); ds.push(d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2)); }
      Promise.all(ds.map(function (d) { return db.doc("mine/news-" + d).get().then(function (sn) { var x = sn.exists ? sn.data() : null; return x && x.at && ((x.top || []).length || (x.games || []).length || (x.teams || []).length || (x.leagues || []).length) ? d : null; }, function () { return null; }); }))
        .then(function (r) { nwx.days = r.filter(Boolean); if (nwx.days.length) nwRedraw(); });
    }
    if (!nwx.days || !nwx.days.length) return;
    body.appendChild(nwSec("Earlier", "Pages already written"));
    var row = el("div", "nwx-days");
    nwx.days.forEach(function (d) {
      var b = el("button", "nwx-day", fmtDate(d, { weekday: "short" }) + ", " + fmtDate(d, { month: "short", day: "numeric" })); b.type = "button";
      b.addEventListener("click", function () { nwx.past = d; nw.opts = false; slideDir = ""; setDate(d); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0); });
      row.appendChild(b);
    });
    body.appendChild(row);
  }
  function nwxBackRow(body) {
    var b = el("button", "rlink nwx-back", "‹ Back to today's news"); b.type = "button";
    b.addEventListener("click", function () { nwx.past = null; slideDir = ""; setDate(todayInHome()); });
    body.appendChild(b);
  }
  // a top story's article: the loaded headline that shares the most words with it, when the match is strong
  function nwxArticle(x, lg) {
    var words = function (s) { var o = {}; String(s || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).forEach(function (w) { if (w.length >= 4) o[w] = 1; }); return o; };
    var mine = words(x.title), best = null, bestN = 0;
    Object.keys(nw.feeds).forEach(function (k) {
      if (lg && k !== lg) return;
      (((nw.feeds[k] || {}).items) || []).forEach(function (a) {
        var w = words(a.title), ks = Object.keys(w), n = ks.filter(function (q) { return mine[q]; }).length;
        if (n >= 3 && n / Math.max(1, ks.length) >= 0.5 && n > bestN) { best = a; bestN = n; }
      });
    });
    return best;
  }
  function nwxLink(x, lg) {
    var a = nwxArticle(x, lg); if (!a) return null;
    var l = el("a", "nwx-link", "Read it on " + a.src + " ›"); l.href = safeUrl(a.url); l.target = "_blank"; l.rel = "noopener"; return l;
  }

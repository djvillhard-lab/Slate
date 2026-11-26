  // News extras (3.104.0): free headlines before a page is generated, earlier days, and a link from a top story to its article.
  // Nothing here asks Claude for anything: headlines are ESPN's and The Athletic's own feeds, earlier days are pages already saved.
  (function () { var st = document.createElement("style"); st.id = "nwx-css"; st.textContent =
    ".nwx-note { margin: 4px 0 16px; font-size: 13px; color: var(--dim); }" +
    ".nwx-days { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; }" +
    ".nwx-day { position: relative; display: inline-flex; flex-direction: column; justify-content: center; min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--ink); font: inherit; font-size: 15px; font-weight: 700; overflow: hidden; }" +
    ".nwx-day > span { font-size: 12px; font-weight: 600; color: var(--dim); }" +
    ".nwx-day.none { color: var(--dim); }" +
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
  // Earlier days (3.113.14, DJ): the day picker by the thumb (070-navigation.js) moves News between days, up to today
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

  // ---- App-wide search (3.119.0): one box for teams, players and the day's games. ----
  // Opened by the magnifier in every page's header (#btn-find). Teams come from the built-in team list (teamSearch),
  // games from the day the app is showing (games()), players from ESPN's free search (only leagues Slate follows).
  // A sheet like the player page, so Back closes it (findBack, asked by goBack) and nothing here redraws on its own.
  var FIND = { q: "", seq: 0, timer: 0, cache: {}, more: false };
  var FIND_CSS =
    "#sheet-find { z-index: 19; }" +
    ".find-sheet { height: 88%; max-height: 88%; align-content: start; grid-template-rows: auto auto 1fr; gap: 10px; }" +
    ".find-top { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }" +
    ".find-top h3 { margin: 0; }" +
    ".find-x { min-height: 44px; padding: 0 12px; border-radius: 8px; background: var(--raise); color: var(--ink); font: 800 15px var(--font); border: 0; }" +
    ".find-in { width: 100%; box-sizing: border-box; min-height: 44px; font-size: 17px; border-radius: 8px; }" +
    ".find-res { overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; min-height: 0; margin: 0 -16px; padding: 0 16px 24px; }" +
    ".find-h { display: flex; align-items: baseline; gap: 8px; margin: 14px 0 2px; font: 800 15px var(--font); font-stretch: 112%; color: var(--head); }" +
    ".find-h:first-child { margin-top: 2px; }" +
    ".find-h .count { font: 700 13px var(--font); color: var(--dim); }" +
    ".find-row { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 6px 0; box-sizing: border-box; background: none; border: 0; border-top: 1px solid var(--hair); color: var(--ink); text-align: left; font: inherit; cursor: pointer; }" +
    ".find-h + .find-row, .find-h + .find-team > .find-row { border-top: 0; }" +
    ".find-row:active { background: var(--raise); }" +
    ".find-row .tx { flex: 1; min-width: 0; display: grid; gap: 1px; }" +
    ".find-row .n { font-weight: 800; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }" +
    ".find-row .s { font-weight: 700; font-size: 13px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }" +
    ".find-team { display: flex; align-items: center; border-top: 1px solid var(--hair); }" +
    ".find-team > .find-row { border-top: 0; flex: 1; min-width: 0; }" +
    ".find-h + .find-team { border-top: 0; }" +
    ".find-star { width: 44px; height: 44px; display: grid; place-items: center; background: none; border: 0; color: var(--dim); flex: none; }" +
    ".find-star.on { color: var(--accent); }" +
    ".find-star svg { width: 22px; height: 22px; }" +
    ".find-face { width: 42px; height: 42px; border-radius: 8px; background: var(--raise); overflow: hidden; display: grid; place-items: center; flex: none; font: 800 15px var(--font); color: var(--muted); }" +
    ".find-face img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }" +
    ".find-g { display: grid; gap: 4px; flex: 1; min-width: 0; }" +
    ".find-g .ln { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; }" +
    ".find-g .ln .n { font-size: 15px; }" +
    ".find-g .ln b { font: 800 18px var(--font); font-stretch: 66%; font-variant-numeric: tabular-nums; }" +
    ".find-g .ln b.lo { color: var(--muted); }" +
    ".find-st { flex: none; width: 88px; text-align: right; display: grid; gap: 2px; font-weight: 700; font-size: 13px; color: var(--muted); }" +
    ".find-st .t { font: 800 15px var(--font); font-stretch: 78%; color: var(--ink); }" +
    ".find-st .t.live { color: var(--live); }" +
    ".find-more { min-height: 44px; width: 100%; margin-top: 4px; border-radius: 8px; border: 1.5px solid var(--line); background: none; color: var(--ink); font: 800 15px var(--font); }" +
    ".find-note { margin: 8px 0 0; color: var(--muted); font-size: 15px; }" +
    ".find-wait { margin: 6px 0 0; color: var(--dim); font-size: 13px; font-weight: 700; }" +
    ".find-src { margin: 14px 0 0; color: var(--dim); font-size: 12px; }" +
    // the slate's header kept its two small boxed buttons; Search there looks and sits like on every other page
    "html .toprow.lineup-top > .pillgroup { grid-template-columns: auto !important; grid-template-rows: auto !important; }" +
    "html .toprow.lineup-top > .pillgroup #btn-find { display: grid !important; width: 40px !important; height: 40px !important; background: none !important; border: 0 !important; color: var(--head) !important; }" +
    "html .toprow.lineup-top > .pillgroup #btn-find svg { width: 22px !important; height: 22px !important; }";
  (function () { var st = document.createElement("style"); st.id = "find-css"; st.textContent = FIND_CSS; document.head.appendChild(st); })();

  // ESPN's league slugs → Slate's leagues (players from leagues Slate doesn't follow are left out)
  var FIND_LG = { "nfl": "nfl", "nba": "nba", "mlb": "mlb", "nhl": "nhl", "wnba": "wnba", "college-football": "ncaaf",
    "mens-college-basketball": "ncaam", "womens-college-basketball": "ncaaw", "usa.1": "mls", "eng.1": "epl", "esp.1": "laliga",
    "ita.1": "seriea", "ger.1": "bundesliga", "fra.1": "ligue1", "uefa.champions": "ucl", "uefa.europa": "uel", "eng.fa": "facup" };
  function findLg(slug) {
    slug = String(slug || "");
    if (FIND_LG[slug]) return FIND_LG[slug];
    if (/^(fifa\.|uefa\.nations|uefa\.euro|concacaf\.|conmebol\.)/.test(slug) && !/\.w$|wwc|women/.test(slug)) return "intl";
    return "";
  }

  function findSheet() {
    var bd = document.getElementById("sheet-find"); if (bd) return bd;
    bd = el("div", "sheet-backdrop"); bd.id = "sheet-find";
    bd.setAttribute("role", "dialog"); bd.setAttribute("aria-modal", "true"); bd.setAttribute("aria-labelledby", "find-title");
    var sh = el("div", "sheet find-sheet");
    var top = el("div", "find-top"), h = el("h3", null, "Search"); h.id = "find-title";
    var x = el("button", "find-x", "Close"); x.type = "button"; x.addEventListener("click", findClose);
    top.appendChild(h); top.appendChild(x); sh.appendChild(top);
    var inp = el("input", "field find-in"); inp.id = "find-in"; inp.type = "search";
    inp.placeholder = "Teams, players or games"; inp.setAttribute("aria-label", "Search teams, players and games");
    ["autocomplete", "autocorrect", "autocapitalize"].forEach(function (a) { inp.setAttribute(a, "off"); });
    inp.setAttribute("spellcheck", "false"); inp.setAttribute("enterkeyhint", "search");
    inp.addEventListener("input", function () { FIND.q = inp.value; FIND.more = false; findDraw(); findPlayersSoon(); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") inp.blur(); });
    sh.appendChild(inp);
    var res = el("div", "find-res"); res.id = "find-res"; res.setAttribute("aria-live", "polite");
    // scrolling the results puts the keyboard away, so the whole list is in reach
    res.addEventListener("touchmove", function () { if (document.activeElement === inp) inp.blur(); }, { passive: true });
    sh.appendChild(res);
    bd.appendChild(sh);
    bd.addEventListener("click", function (e) { if (e.target === bd) findClose(); });
    document.body.appendChild(bd); return bd;
  }
  function openFind() {
    var bd = findSheet(), inp = $("find-in");
    bd.classList.add("open"); findDraw();
    // the keyboard comes up with the box ready; it starts with the last search so a second look is one tap
    setTimeout(function () { inp.focus(); try { inp.select(); } catch (e) {} }, 60);
  }
  function findClose() { var bd = document.getElementById("sheet-find"); if (bd) bd.classList.remove("open"); var i = $("find-in"); if (i) i.blur(); }
  // Back closes the search before anything else (after an open player page, which sits on top of it)
  function findBack() { var bd = document.getElementById("sheet-find"); if (!bd || !bd.classList.contains("open")) return false; findClose(); return true; }

  // ---- games: the day the app is showing ----
  function findGames(raw) {
    var q = normT(raw); if (!q) return [];
    var qw = q.split(" "), alias = TEAM_ALIAS[q] ? normT(TEAM_ALIAS[q]) : "";
    return visibleGames().filter(function (g) {
      var names = normT([g.away, g.home, g.awayShort, g.homeShort].join(" "));
      if (alias && names.indexOf(alias) !== -1) return true;
      var hay = normT([g.away, g.home, g.awayShort, g.homeShort, abbr(g, "away"), abbr(g, "home"), confOf(g, "away"), confOf(g, "home"), info(g).name, info(g).tag, (g.tv || []).join(" ")].join(" "));
      var words = hay.split(" ");
      if (qw.every(function (x) { return words.some(function (w) { return w.indexOf(x) === 0; }); })) return true;
      return q.length >= 4 && hay.indexOf(q) !== -1;
    }).sort(function (a, b) {
      var ka = status(a).kind, kb = status(b).kind, r = { live: 0, upcoming: 1, tbd: 1, over: 2 };
      return (r[ka] - r[kb]) || byStart(a, b);
    });
  }
  function findGameRow(g) {
    var b = el("button", "find-row"); b.type = "button";
    var sc = scoreRaw(g.id), st = status(g), has = sc && (sc.state === "in" || sc.state === "post");
    var box = el("div", "find-g");
    sideOrder(g).forEach(function (s) {   // soccer: home on top (3.130.5)
      var ln = el("div", "ln");
      ln.appendChild(badgeFor(abbr(g, s), g[s], g[s + "Color"], g[s + "Alt"]));
      ln.appendChild(el("span", "n", g[s + "Short"] || g[s]));
      if (has) { var me = s === "away" ? sc.a : sc.h, them = s === "away" ? sc.h : sc.a; ln.appendChild(el("b", me < them ? "lo" : null, String(me))); }
      else ln.appendChild(el("span"));
      box.appendChild(ln);
    });
    b.appendChild(box);
    var right = el("div", "find-st"), t;
    if (st.kind === "live") t = el("span", "t live", (sc && sc.detail) || "Live");
    else if (st.kind === "over") t = el("span", "t", "Final");
    else t = el("span", "t", timeText(g.start));
    right.appendChild(t); right.appendChild(el("span", null, info(g).tag));
    b.appendChild(right);
    b.setAttribute("aria-label", (g.awayShort || g.away) + " at " + (g.homeShort || g.home) + ", " + t.textContent + ". Open the matchup");
    b.addEventListener("click", function () { findClose(); openMatchup(g); });
    return b;
  }

  // ---- teams: the built-in list, with the same star as the Teams page ----
  // the team list's best matches, with your teams and teams playing on the day showing first ("north carolina": the Tar Heels)
  function findTeams(q) {
    var playing = {};
    visibleGames().forEach(function (g) { playing[normT(g.away)] = 1; playing[normT(g.home)] = 1; });
    return teamSearch(q).map(function (t, i) {
      var k = normT(t.name), mine = state.teams.some(function (x) { return normT(parseTeam(x).name) === k; });
      return [(mine ? 0 : (t.s === normT(q) || k === normT(q)) ? 1 : playing[k] ? 2 : 3) * 100 + i, t];
    }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, 5).map(function (x) { return x[1]; });
  }
  function findTeamLg(t) {
    if (t.lg !== "College") return lgOfKnown(t);
    // a college: the sport it plays on the day showing, else the one starred, else men's hoops (as the Teams page does)
    var k = normT(t.name), playing = "";
    visibleGames().forEach(function (g) { if (!playing && COL_SPORT[g.league] && (normT(g.away) === k || normT(g.home) === k)) playing = g.league; });
    if (playing) return playing;
    var starred = COL_KEYS.filter(function (lg) { return isFav(t.name, lg); })[0];
    return starred || "ncaam";
  }
  function findTeamRow(t) {
    var lg = findTeamLg(t), wrap = el("div", "find-team"), b = el("button", "find-row"); b.type = "button";
    b.appendChild(teamBadge(t));
    var tx = el("span", "tx"); tx.appendChild(el("span", "n", t.name));
    tx.appendChild(el("span", "s", t.lg === "College" ? "College · " + (COL_SPORT[lg] || "") : t.lg));
    b.appendChild(tx);
    b.setAttribute("aria-label", "Open " + t.name);
    b.addEventListener("click", function () { if (!lg) return; findClose(); openTeam(t.name, lg); });
    wrap.appendChild(b);
    if (lg) {
      var on = isFav(t.name, lg), s = el("button", "find-star" + (on ? " on" : "")); s.type = "button";
      s.setAttribute("aria-pressed", on ? "true" : "false");
      s.setAttribute("aria-label", (on ? "Remove " : "Add ") + t.name + (COL_SPORT[lg] ? " " + COL_SPORT[lg] : "") + (on ? " from" : " to") + " my teams");
      s.appendChild(starIcon(on));
      s.addEventListener("click", function (e) {
        e.stopPropagation(); toggleFav(t.name, lg);
        var now = isFav(t.name, lg); s.classList.toggle("on", now); s.setAttribute("aria-pressed", now ? "true" : "false");
        s.textContent = ""; s.appendChild(starIcon(now));
      });
      wrap.appendChild(s);
    }
    return wrap;
  }

  // ---- players: ESPN's search, a moment after typing stops ----
  function findPlayersSoon() {
    clearTimeout(FIND.timer);
    var q = normT(FIND.q); if (q.length < 3 || FIND.cache[q]) return;
    FIND.timer = setTimeout(function () { findPlayers(q); }, 300);
  }
  function findPlayers(q) {
    if (FIND.cache[q]) return;
    var my = ++FIND.seq; FIND.cache[q] = { busy: true, list: [] };
    fetch("https://site.api.espn.com/apis/search/v2?type=player&limit=12&query=" + encodeURIComponent(q))
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (d) {
        var out = [];
        ((d && d.results) || []).forEach(function (r) {
          if (r.type !== "player") return;
          (r.contents || []).forEach(function (c) {
            var m = /~a:(\d+)/.exec(c.uid || ""), lg = findLg(c.defaultLeagueSlug);
            if (!m || !lg) return;
            out.push({ id: m[1], lg: lg, name: c.displayName || "", team: c.subtitle || "", img: (c.image && c.image.default) || "" });
          });
        });
        FIND.cache[q] = { busy: false, failed: !d, list: out.slice(0, 8) };
        if (my === FIND.seq && normT(FIND.q) === q) findDraw();
      });
  }
  function findPlayerRow(p) {
    var b = el("button", "find-row"); b.type = "button";
    var f = el("span", "find-face");
    if (p.img) { var im = el("img"); im.alt = ""; im.loading = "lazy"; im.src = p.img; im.onerror = function () { f.textContent = findInitials(p.name); }; f.appendChild(im); }
    else f.textContent = findInitials(p.name);
    b.appendChild(f);
    var tx = el("span", "tx"); tx.appendChild(el("span", "n", p.name));
    tx.appendChild(el("span", "s", [p.team, LEAGUES[p.lg] ? LEAGUES[p.lg].tag : ""].filter(Boolean).join(" · ")));
    b.appendChild(tx);
    b.setAttribute("aria-label", p.name + ", " + (p.team || "") + ". Open the player page");
    b.addEventListener("click", function () { openPlayer({ id: p.id, lg: p.lg, name: p.name }); });
    return b;
  }
  function findInitials(n) { return String(n || "").split(" ").map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase(); }

  function findHead(box, title, n) {
    var h = el("h2", "find-h"); h.appendChild(document.createTextNode(title));
    if (n != null) h.appendChild(el("span", "count", String(n)));
    box.appendChild(h);
  }
  function findDraw() {
    var box = $("find-res"); if (!box) return;
    var inp = $("find-in"); if (inp && inp.value !== FIND.q) inp.value = FIND.q;
    box.textContent = "";
    var q = FIND.q.trim();
    if (!normT(q)) {
      box.appendChild(el("p", "find-note", "Find a team, a player, or a game on " + (state.date === todayInHome() ? "today's" : fmtDate(state.date, { weekday: "long" }) + "'s") + " schedule by team, conference or channel."));
      return;
    }
    var teams = findTeams(q), gs = findGames(q), pk = normT(q), pc = FIND.cache[pk];
    if (teams.length) { findHead(box, "Teams"); teams.forEach(function (t) { box.appendChild(findTeamRow(t)); }); }
    if (gs.length) {
      var day = state.date === todayInHome() ? "Today" : fmtDate(state.date, { weekday: "short", month: "short", day: "numeric" });
      findHead(box, "Games · " + day, gs.length);
      var cap = FIND.more ? gs.length : 6;
      gs.slice(0, cap).forEach(function (g) { box.appendChild(findGameRow(g)); });
      if (gs.length > cap) {
        var mb = el("button", "find-more", "Show all " + gs.length); mb.type = "button";
        mb.addEventListener("click", function () { FIND.more = true; var y = box.scrollTop; findDraw(); box.scrollTop = y; });
        box.appendChild(mb);
      }
    }
    if (pk.length >= 3) {
      if (pc && pc.list.length) { findHead(box, "Players"); pc.list.forEach(function (p) { box.appendChild(findPlayerRow(p)); }); }
      else if (!pc || pc.busy) { if (!teams.length && !gs.length) findHead(box, "Players"); box.appendChild(el("p", "find-wait", "Looking up players…")); }
      else if (pc.failed) box.appendChild(el("p", "find-wait", "Couldn't reach ESPN for players. Check the connection and try again."));
    }
    var waiting = pk.length >= 3 && (!pc || pc.busy);
    if (!teams.length && !gs.length && !waiting && !(pc && pc.list.length) && !(pc && pc.failed)) {
      box.appendChild(el("p", "find-note", "Nothing matches “" + q + "”. Try a city, a nickname or a last name."));
    }
    if (pc && pc.list.length) box.appendChild(el("p", "find-src", "Players from ESPN."));
  }

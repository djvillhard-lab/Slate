  // ---------- Simple mode (3.140.0, DJ Nov 25, 2026) ----------
  // A second face for the app, for someone who wants the games, the scores and the channel and nothing to learn:
  // one page (your slate), big type, every control a button with words, no swiping. Concept and DJ's picks:
  // https://claude.ai/artifact/8LvyNL4aK2bvAYSpuzR6os, notes in docs/pages/simple.md.
  // It is one layer (#sm) drawn over the app from the same data (lineupGames, status, scoreOf, state.rules), so no
  // page file changed. The app underneath keeps running (live scores, saving). News, Teams and feedback open the
  // real pages in bigger type with a "Back to my slate" bar ("peek"). On by a switch in Settings > Look and text
  // size, kept on this phone (localStorage slate-simple). This file sorts before 288-panes.js and 290-layout.js on
  // purpose: with Simple mode on, the unfolded Duo never splits into two panes; the layer draws its own two halves.
  var SM_SIZES = { l: ["Large", 16], xl: ["Larger", 18], xxl: ["Largest", 20] };
  var SM = { on: false, size: "l", page: "home", gid: null, peek: "", addId: "", undo: null, sum: {}, last: "", two: false };
  (function () { try { var s = JSON.parse(localStorage.getItem("slate-simple") || "null"); if (s) { SM.on = !!s.on; if (SM_SIZES[s.size]) SM.size = s.size; } } catch (e) {} })();
  function smSave() { try { localStorage.setItem("slate-simple", JSON.stringify({ on: SM.on, size: SM.size })); } catch (e) {} }
  function smOn() { return SM.on && !PANE; }
  function smActive() { return smOn() && !$("gate") && !$("wl"); }
  function smReload() { try { (window.top || window).location.reload(); } catch (e) { location.reload(); } }
  var smPanesOK0 = panesOK; panesOK = function () { return !SM.on && smPanesOK0(); };

  var SM_CSS = "html.sm-on, html.sm-on body { overflow: hidden; }" +
    "html.sm-on .sheet-backdrop, html.sm-peek .sheet-backdrop { z-index: 45 !important; }" +
    "#sm { position: fixed; top: 0; bottom: 0; left: 0; right: 0; padding-right: var(--strip-w, 0px); z-index: 39; background: var(--bg); color: var(--ink); font-family: var(--font); font-weight: 700; line-height: 1.2; display: flex; font-size: 16px; -webkit-text-size-adjust: none; font-variant-numeric: tabular-nums; }" +
    "#sm { --sm-s: 1; } #sm.sz-xl { font-size: 18px; --sm-s: 1.06; } #sm.sz-xxl { font-size: 20px; --sm-s: 1.12; } #sm[hidden] { display: none; }" +
    "#sm * { box-sizing: border-box; }" +
    ".sm-col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; padding-top: max(env(safe-area-inset-top, 0px), 10px); }" +
    "#sm.two .sm-col + .sm-col { border-left: 2px solid var(--line); }" +
    ".sm-top { padding: 4px 16px 10px; } .sm-top h1 { margin: 0; font-size: 1.9em; font-weight: 800; font-stretch: 108%; line-height: 1.1; }" +
    ".sm-top p { margin: 4px 0 0; font-size: 1.15em; color: var(--muted); }" +
    ".sm-body { flex: 1 1 0; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; padding: 0 16px 16px; display: flex; flex-direction: column; gap: .6em; }" +
    ".sm-body > * { flex: none; }" +
    ".sm-h { font-size: 1.25em; font-weight: 800; color: var(--muted); display: flex; align-items: center; gap: .4em; margin: .3em 0 0; }" +
    ".sm-h.live { color: var(--live); } .sm-h.live::before { content: ''; width: .6em; height: .6em; border-radius: 50%; background: var(--live); }" +
    ".sm-card { display: flex; flex-direction: column; gap: .45em; width: 100%; text-align: left; background: var(--card); color: inherit; border: 2px solid var(--line); border-radius: 8px; padding: .65em .75em; font: inherit; margin: 0; }" +
    ".sm-team { display: flex; align-items: center; gap: .7em; } .sm-team .sm-nm { flex: 1; min-width: 0; font-size: 1.5em; font-weight: 800; line-height: 1.1; overflow: hidden; }" +
    ".sm-team .sm-sc { font-size: 2.6em; font-weight: 800; font-stretch: 66%; line-height: 1; } .sm-team .sm-sc.sm-rec { font-size: 1.7em; color: var(--muted); } .sm-team.behind .sm-sc { color: var(--muted); }" +
    ".sm-lg { width: 2.3em; height: 2.3em; flex: none; display: flex; align-items: center; justify-content: center; } .sm-lg img { width: 100%; height: 100%; object-fit: contain; }" +
    ".sm-stat { font-size: 1.3em; font-weight: 800; } .sm-stat.live { color: var(--live); } .sm-stat b { color: var(--ink); font-weight: 800; } .sm-say { font-size: 1.3em; }" +
    ".sm-when { font-size: 1.6em; font-weight: 800; text-align: center; padding: .1em 0; }" +
    ".sm-row { display: grid; grid-template-columns: 4.6em 1fr auto; gap: .7em; align-items: center; width: 100%; min-height: 4.4em; text-align: left; background: none; color: inherit; border: 0; border-top: 2px solid var(--hair); padding: .4em 0; margin: 0; font: inherit; }" +
    ".sm-rows { display: flex; flex-direction: column; }" +
    ".sm-row .sm-tm { font-size: 1.55em; font-weight: 800; font-stretch: 70%; line-height: 1.05; } .sm-row .sm-tm small { display: block; font-size: .7em; color: var(--muted); margin: 0; }" +
    ".sm-row .sm-gm { display: flex; flex-direction: column; gap: .2em; font-size: 1.375em; font-weight: 800; min-width: 0; } .sm-row .sm-gm .sm-t { display: flex; align-items: center; gap: .4em; min-width: 0; }" +
    ".sm-row .sm-gm .sm-lg { width: 1.4em; height: 1.4em; } .sm-row .sm-gm .sm-lg .badge { zoom: .7; }" +
    ".sm-lgl { display: flex; align-items: center; gap: 6px; font-size: calc(14px * var(--sm-s)); font-weight: 800; color: var(--muted); line-height: 1.2; } .sm-lgl svg { width: 1.25em; height: 1.25em; flex: none; } .sm-lgl .sm-lgt { flex: 1; min-width: 0; }" +
    ".sm-rc { font-size: calc(14px * var(--sm-s)); font-weight: 700; font-stretch: 88%; color: var(--muted); margin-left: .5em; white-space: nowrap; }" +
    ".sm-ft { display: flex; align-items: center; justify-content: space-between; gap: .6em; min-height: 2em; } .sm-stat.sm-time { font-size: 1.5em; font-stretch: 80%; }" +
    ".sm-mine { flex: none; font-size: calc(14px * var(--sm-s)); color: var(--accent); font-weight: 800; }" +
    ".sm-ch { flex: none; border: 2px solid var(--ink); border-radius: 4px; padding: .25em .5em; font-size: calc(17px * var(--sm-s)); font-weight: 800; text-align: center; white-space: nowrap; }" +
    ".sm-bar { display: flex; flex-wrap: wrap; gap: 10px; padding: 10px 16px max(env(safe-area-inset-bottom, 0px), 12px); border-top: 2px solid var(--hair); background: var(--bg); }" +
    ".sm-btn { flex: 1 1 40%; min-height: 2.7em; border-radius: 8px; border: 2px solid var(--line); background: var(--card); color: var(--ink); font-family: inherit; font-size: 1.3em; font-weight: 800; line-height: 1.15; display: flex; align-items: center; justify-content: center; text-align: center; padding: .3em .5em; margin: 0; text-decoration: none; }" +
    ".sm-btn.main { background: var(--accent-fill, var(--accent)); color: var(--on-accent, #0C0C0C); border-color: transparent; } .sm-btn.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }" +
    ".sm-bar .sm-btn { font-size: calc(21px * var(--sm-s)); min-height: 56px; }" +
    ".sm-btn.wide { flex: none; width: 100%; min-height: 3em; } .sm-seg { display: flex; gap: 8px; } .sm-seg .sm-btn { flex: 1 1 0; }" +
    ".sm-q { width: 100%; border-collapse: collapse; } .sm-q th, .sm-q td { border-top: 2px solid var(--hair); padding: .45em .2em; font-size: 1.3em; font-weight: 800; text-align: center; } .sm-q th { border-top: 0; color: var(--muted); font-size: 1.05em; } .sm-q th:first-child, .sm-q td:first-child { text-align: left; }" +
    ".sm-plh { display: flex; align-items: center; gap: .5em; font-size: 1.25em; font-weight: 800; color: var(--muted); border-top: 2px solid var(--line); padding-top: .5em; margin-top: .2em; } .sm-plh .sm-lg { width: 1.5em; height: 1.5em; } .sm-plh .sm-lg .badge { zoom: .7; }" +
    ".sm-pl { font-size: 1.3em; font-weight: 800; } .sm-pl small { display: block; font-size: .86em; font-weight: 700; color: var(--muted); }" +
    ".sm-rule { border-top: 2px solid var(--hair); padding: .7em 0; display: flex; align-items: center; gap: .6em; font-size: 1.375em; font-weight: 800; } .sm-rule > span { flex: 1; min-width: 0; } .sm-rule small { display: block; font-size: .78em; font-weight: 700; color: var(--muted); margin-top: 2px; }" +
    ".sm-rule button { border: 2px solid var(--line); border-radius: 8px; background: none; color: var(--ink); font: inherit; font-size: .82em; padding: .55em .7em; min-height: 44px; }" +
    ".sm-opt { display: block; width: 100%; text-align: left; border: 2px solid var(--line); background: var(--card); color: var(--ink); border-radius: 8px; padding: .6em .7em; font-family: inherit; font-size: 1.44em; font-weight: 800; margin: 0; } .sm-opt small { display: block; font-size: .74em; font-weight: 700; color: var(--muted); margin-top: 3px; }" +
    ".sm-opt.on { border-color: var(--accent); box-shadow: inset 0 0 0 2px var(--accent); } .sm-opt.on::after { content: 'On your slate'; display: block; font-size: .7em; color: var(--accent); margin-top: 4px; }" +
    ".sm-note { font-size: 1.25em; color: var(--muted); margin: 0; } .sm-undo { display: flex; align-items: center; gap: .6em; background: var(--raise); border-radius: 8px; padding: .6em .7em; font-size: 1.2em; } .sm-undo span { flex: 1; } .sm-undo button { border: 2px solid var(--line); border-radius: 8px; background: none; color: var(--ink); font: inherit; padding: .5em .7em; min-height: 44px; }" +
    "#sm-peekbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 39; display: flex; gap: 10px; padding: 10px calc(16px + var(--strip-w, 0px)) max(env(safe-area-inset-bottom, 0px), 12px) 16px; background: var(--bg); border-top: 2px solid var(--hair); font-family: var(--font); font-size: 16px; } #sm-peekbar[hidden] { display: none; }" +
    "html.sm-peek #n3, html.sm-peek #menu-fab, html.sm-peek #dock-day, html.sm-peek #dock-sort, html.sm-peek #dock-back, html.sm-peek .menu-pop { display: none !important; }" +
    "html.side-col:not(.duo) #sm-set-row .switch { margin-right: max(0px, calc(var(--strip-w, 0px) / var(--z, 1) - 28px)); }" +
    "html.pn-right #sm-set-row .switch { margin-right: max(0px, calc(var(--sm-isl, 0px) / var(--z, 1) - 28px)); }" +
    "html.sm-peek main.wrap, html.sm-peek .pbody { padding-bottom: 130px !important; }";
  (function () { var st = document.createElement("style"); st.id = "sm-css"; st.textContent = SM_CSS; document.head.appendChild(st); })();

  // ---- small parts ----
  function smBtn(text, fn, cls) { var b = el("button", "sm-btn" + (cls ? " " + cls : ""), text); b.type = "button"; b.addEventListener("click", fn); return b; }
  function smGo(page) { SM.page = page; SM.undo = null; smDraw(true); }
  function smLogo(g, sd) {
    var w = el("span", "sm-lg"), name = g[sd], seg = logoSeg(g[sd + "Logo"]), hit = seg ? null : teamLook(name);
    if (!seg && hit && hit[0]) seg = hit[0];
    var chip = function () { w.textContent = ""; w.appendChild(badgeFor(abbr(g, sd), name, g[sd + "Color"], g[sd + "Alt"])); };
    if (!seg) { chip(); return w; }
    var im = document.createElement("img"); im.alt = ""; im.draggable = false;
    im.onerror = chip; im.src = logoUrl(seg, themeIsDark() && LOGO_PICK[seg] !== "l");
    w.appendChild(im); return w;
  }
  function smName(g, sd) { return (g[sd + "Rank"] ? "#" + g[sd + "Rank"] + " " : "") + short(g, sd); }
  function smTeam(g, sd, right, behind, rec) {
    var r = el("div", "sm-team" + (behind ? " behind" : "")), nm = el("span", "sm-nm", smName(g, sd)); r.appendChild(smLogo(g, sd)); r.appendChild(nm);
    if (!rec && g[sd + "Record"]) nm.appendChild(el("small", "sm-rc", String(g[sd + "Record"])));
    if (right != null && right !== "") r.appendChild(el("span", "sm-sc" + (rec ? " sm-rec" : ""), String(right)));
    return r;
  }
  // the sport's icon and the league (with the event's name), as on the regular slate's cards; "Your team" at the end
  function smLeague(g, mine) {
    var r = el("div", "sm-lgl"), ic = g.custom ? null : sportIcon(g.league), nt = g.note ? noteShort(g.note) : "";
    if (ic) r.appendChild(ic);
    r.appendChild(el("span", "sm-lgt", g.custom ? "Added by you" : info(g).name + (nt ? " · " + nt : "")));
    if (mine && !g.custom && hasFav(g)) r.appendChild(el("span", "sm-mine", "Your team"));
    return r;
  }
  // a name that is one long word shrinks until it fits; names with spaces wrap between words, never inside one
  function smFit(box) {
    Array.prototype.forEach.call(box.querySelectorAll(".sm-nm"), function (n) {
      n.style.fontSize = ""; if (n.scrollWidth <= n.clientWidth + 1) return;
      var f = parseFloat(getComputedStyle(n).fontSize) || 24, min = f * 0.62;
      while (n.scrollWidth > n.clientWidth + 1 && f > min) { f -= 1; n.style.fontSize = f + "px"; }
    });
  }
  function smOrd(n) { return n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"); }
  function smLiveText(g, sc) {
    var d = String(sc.detail || ""), sp = BX_SPORT[g.league], m = /(\d+:\d+)/.exec(d), p = Number(sc.p) || 0;
    if (/half/i.test(d) && !m) return "Halftime";
    var reg = sp === "football" || sp === "bball" ? (g.league === "ncaam" ? 2 : 4) : sp === "hockey" ? 3 : 0, word = reg === 2 ? "half" : reg === 3 ? "period" : "quarter";
    if (reg && p >= 1 && p <= reg) return smOrd(p) + " " + word + (m ? " · " + m[1] + " left" : "");
    if (reg && p > reg) return "Overtime" + (m ? " · " + m[1] + " left" : "");
    return d || "On now";
  }
  function smChan(g) { var n = (g.tv || [])[0]; return n ? String(n) : ""; }
  function smSay(g, sc) {
    var a = Number(sc.a), h = Number(sc.h), over = sc.state === "post";
    if (a === h) return over ? "It finished tied at " + a + "." : "Tied at " + a + ".";
    var sd = a > h ? "away" : "home", by = Math.abs(a - h);
    return short(g, sd) + (over ? " won by " : " lead by ") + by + ".";
  }
  function smDayName(iso) {
    var t = todayInHome();
    if (iso === t) return "Today"; if (iso === shiftDate(t, -1)) return "Yesterday"; if (iso === shiftDate(t, 1)) return "Tomorrow";
    return fmtDate(iso, { weekday: "short", month: "short", day: "numeric" });
  }
  function smSetDate(iso) { SM.gid = null; setDate(iso); smDraw(true); }

  // ---- the game's player stats and score by quarter, straight from ESPN's game summary ----
  var SM_UNITS = { YDS: ["yard", "yards"], TD: ["touchdown", "touchdowns"], CAR: ["carry", "carries"], REC: ["catch", "catches"], INT: ["interception", "interceptions"], PTS: ["point", "points"], REB: ["rebound", "rebounds"], AST: ["assist", "assists"], STL: ["steal", "steals"], BLK: ["block", "blocks"], G: ["goal", "goals"], A: ["assist", "assists"], SV: ["save", "saves"], K: ["strikeout", "strikeouts"], H: ["hit", "hits"], HR: ["home run", "home runs"], ER: ["earned run", "earned runs"], SOG: ["shot on goal", "shots on goal"] };
  function smStat(cat, L) {
    var v = String(L.displayValue || "").trim(), name = String(cat.displayName || cat.name || "").trim(); if (!v) return "";
    if (/^[\d.]+$/.test(v)) { var w = name.toLowerCase(); if (!w) return ""; if (v === "1") w = w.replace(/s$/, ""); return v + " " + w; }
    var kind = (/^(passing|rushing|receiving)/i.exec(name) || [])[1];
    var out = v.replace(/([\d.]+) ([A-Z]{1,3})\b/g, function (m0, n, u) { var x = SM_UNITS[u]; return x ? n + " " + (n === "1" ? x[0] : x[1]) : m0; });
    if (kind) {
      out = out.replace(/^\d+\/\d+,\s*/, "").replace(/^\d+ (carry|carries|catch|catches),\s*/, "").replace(/ yards?\b/, function (y) { return " " + kind.toLowerCase() + y; });
    } else if (name && !/[a-z]{3}/.test(out)) out = name + ": " + out;
    return out;
  }
  function smSumParse(sum) {
    var comp = ((sum.header || {}).competitions || [])[0] || {}, byId = {}, line = {}, pl = { away: [], home: [] };
    (comp.competitors || []).forEach(function (c) {
      var sd = c.homeAway === "home" ? "home" : "away"; byId[String((c.team || {}).id || c.id || "")] = sd;
      line[sd] = (c.linescores || []).map(function (x) { return String(x.displayValue != null ? x.displayValue : x.value != null ? x.value : ""); });
    });
    (sum.leaders || []).forEach(function (t) {
      var sd = byId[String((t.team || {}).id || "")]; if (!sd) return;
      (t.leaders || []).forEach(function (cat) {
        var L = (cat.leaders || [])[0]; if (!L || !L.athlete || pl[sd].length >= 3) return;
        var s = smStat(cat, L), n = L.athlete.displayName || L.athlete.shortName || ""; if (s && n) pl[sd].push({ n: n, s: s });
      });
    });
    return { line: line, pl: pl };
  }
  function smSum(g, live) {
    if (g.custom || !bxBase(g.league)) return null;
    var c = SM.sum[g.id] = SM.sum[g.id] || { at: 0, busy: false, d: null };
    if (!c.busy && Date.now() - c.at > (live ? 45000 : c.d ? 3600000 : 60000)) {
      c.busy = true; c.at = Date.now();
      bxFindEvent(g).then(function (ev) { return ev ? rkFetch(bxSummaryUrl(g.league, ev)) : null; }).then(function (sum) {
        c.busy = false; if (sum) { c.d = smSumParse(sum); smDraw(); }
      }, function () { c.busy = false; });
    }
    return c.d;
  }

  // ---- pages ----
  function smHome(two) {
    var col = el("div", "sm-col"), list = lineupGames(), t = todayInHome();
    var top = el("div", "sm-top"); top.appendChild(el("h1", null, "Your slate"));
    top.appendChild(el("p", null, fmtDate(state.date, { weekday: "long", month: "short", day: "numeric" }) + (list.length ? " · " + list.length + (list.length === 1 ? " game" : " games") : "")));
    col.appendChild(top);
    var body = el("div", "sm-body"); col.appendChild(body);
    if (state.date !== t) body.appendChild(smBtn("Go to today", function () { smSetDate(todayInHome()); }, "wide main"));
    var live = [], next = [], done = [];
    list.forEach(function (g) { var k = status(g).kind; (k === "live" ? live : k === "over" ? done : next).push(g); });
    if (!list.length) {
      var loading = state.slateStatus === "loading" || !state.lineupLoaded;
      body.appendChild(el("p", "sm-note", loading ? "Loading your games…" : "No games on your slate " + (state.date === t ? "today" : "this day") + "."));
      if (!loading) body.appendChild(smBtn("Choose what's on my slate", function () { smGo("rules"); }, "wide"));
    }
    var open = function (g) { return function () { SM.gid = g.id; if (two) smDraw(true); else smGo("game"); }; };
    // 3.154.0 (DJ): one card for every game, laid out like the regular slate's card: the league on top, the two teams
    // with logo, record and score, then the time or the clock and the channel
    var card = function (g) {
      var sc = g.custom ? null : scoreOf(g), k = status(g).kind, b = el(g.custom ? "div" : "button", "sm-card"); if (!g.custom) { b.type = "button"; b.addEventListener("click", open(g)); }
      b.appendChild(smLeague(g, true));
      if (g.custom) { var cr = el("div", "sm-team"); cr.appendChild(el("span", "sm-nm", g.home)); b.appendChild(cr); }
      else sideOrder(g).forEach(function (sd) { var mine = sc ? Number(sd === "away" ? sc.a : sc.h) : "", other = sc ? Number(sd === "away" ? sc.h : sc.a) : 0; b.appendChild(smTeam(g, sd, mine, sc && mine < other)); });
      var ft = el("div", "sm-ft");
      if (k === "live") ft.appendChild(el("span", "sm-stat live", sc ? smLiveText(g, sc) : "On now"));
      else if (k === "over") ft.appendChild(el("span", "sm-stat", sc && /OT|SO|pen/i.test(sc.detail || "") ? String(sc.detail) : "Final"));
      else ft.appendChild(el("span", "sm-stat sm-time", timeText(g.start)));
      var ch = smChan(g); if (ch && k !== "over") ft.appendChild(el("span", "sm-ch", NET_SHORT[ch] || ch));
      b.appendChild(ft); return b;
    };
    if (live.length) { body.appendChild(el("div", "sm-h live", "On now")); live.forEach(function (g) { body.appendChild(card(g)); }); }
    if (next.length) { body.appendChild(el("div", "sm-h", state.date === t ? (live.length || done.length ? "Later today" : "Today") : "Games")); next.forEach(function (g) { body.appendChild(card(g)); }); }
    if (done.length) { body.appendChild(el("div", "sm-h", "Finished")); done.forEach(function (g) { body.appendChild(card(g)); }); }
    var bar = el("div", "sm-bar");
    bar.appendChild(smBtn(smDayName(shiftDate(state.date, -1)), function () { smSetDate(shiftDate(state.date, -1)); }));
    bar.appendChild(smBtn(smDayName(shiftDate(state.date, 1)), function () { smSetDate(shiftDate(state.date, 1)); }));
    if (!two) { bar.appendChild(smBtn("News", function () { smPeek("news"); })); bar.appendChild(smBtn("Help", function () { smGo("help"); })); }
    col.appendChild(bar); return col;
  }
  function smBackBar(col, two, text, fn) {
    var bar = el("div", "sm-bar");
    if (two && !fn && SM.page === "home") { bar.appendChild(smBtn("News", function () { smPeek("news"); })); bar.appendChild(smBtn("Help", function () { smGo("help"); })); }
    else bar.appendChild(smBtn(text || (two ? "Back" : "Back to my slate"), fn || function () { smGo("home"); }));
    col.appendChild(bar);
  }
  function smGamePick() {
    var list = lineupGames().filter(function (g) { return !g.custom; }), g = list.filter(function (x) { return x.id === SM.gid; })[0];
    if (!g && SM.two) g = list.filter(function (x) { return status(x).kind === "live"; })[0] || list.filter(function (x) { return status(x).kind === "upcoming"; })[0] || list[0];
    return g || null;
  }
  function smGame(two) {
    var col = el("div", "sm-col"), g = smGamePick();
    var top = el("div", "sm-top"); col.appendChild(top);
    var body = el("div", "sm-body"); col.appendChild(body);
    if (!g) { top.appendChild(el("h1", null, two ? "Pick a game" : "Game")); body.appendChild(el("p", "sm-note", two ? "Tap a game on the left to see it here." : "That game is not on this day's slate.")); smBackBar(col, two); return col; }
    var st = status(g), sc = scoreOf(g), o = sideOrder(g);
    top.appendChild(el("h1", null, pairText(g, function (sd) { return short(g, sd); }, g.neutral ? " vs " : " at ")));
    var sub = st.kind === "over" ? fmtDate(state.date, { weekday: "long", month: "short", day: "numeric" }) + " · Final" : st.kind === "live" ? "On now" : (state.date === todayInHome() ? "Today" : smDayName(state.date));
    top.appendChild(el("p", null, sub));
    var card = el("div", "sm-card"); card.appendChild(smLeague(g, true));
    if (!sc) card.appendChild(el("div", "sm-when", st.kind === "live" ? "On now" : (state.date === todayInHome() ? "Today" : smDayName(state.date)) + " at " + timeText(g.start)));
    o.forEach(function (sd) {
      if (sc) { var mine = Number(sd === "away" ? sc.a : sc.h), other = Number(sd === "away" ? sc.h : sc.a); card.appendChild(smTeam(g, sd, mine, mine < other)); }
      else card.appendChild(smTeam(g, sd, g[sd + "Record"] || "", false, true));
    });
    if (sc) { if (st.kind === "live") card.appendChild(el("div", "sm-stat live", smLiveText(g, sc))); card.appendChild(el("div", "sm-say", smSay(g, sc))); }
    body.appendChild(card);
    var ch = smChan(g);
    if (ch && st.kind !== "over") { var wl = watchLink(ch, "sm-btn main wide", "Watch on " + ch); body.appendChild(wl || el("div", "sm-stat", "On " + ch)); }
    var d = sc ? smSum(g, st.kind === "live") : null;
    if (d) {
      var n = Math.max((d.line.away || []).length, (d.line.home || []).length), sp = BX_SPORT[g.league];
      if (n && n <= 5) {
        var reg = sp === "hockey" ? 3 : sp === "soccer" || g.league === "ncaam" ? 2 : 4, word = sp === "hockey" ? "period" : reg === 2 ? "half" : "quarter";
        var tb = el("table", "sm-q"), hr = el("tr"); hr.appendChild(el("th", null, "By " + word));
        for (var i = 0; i < n; i++) hr.appendChild(el("th", null, i < reg ? String(i + 1) : "OT"));
        hr.appendChild(el("th", null, "Total")); tb.appendChild(hr);
        o.forEach(function (sd) { var tr = el("tr"); tr.appendChild(el("td", null, short(g, sd))); for (var j = 0; j < n; j++) tr.appendChild(el("td", null, (d.line[sd] || [])[j] || "")); tr.appendChild(el("td", null, String(sd === "away" ? sc.a : sc.h))); tb.appendChild(tr); });
        body.appendChild(tb);
      }
      o.forEach(function (sd) {
        if (!d.pl[sd].length) return;
        var h = el("div", "sm-plh"); h.appendChild(smLogo(g, sd)); h.appendChild(el("span", null, short(g, sd) + " top players")); body.appendChild(h);
        d.pl[sd].forEach(function (p) { var r = el("div", "sm-pl", p.n); r.appendChild(el("small", null, p.s)); body.appendChild(r); });
      });
    }
    smBackBar(col, two); return col;
  }
  function smRuleIds(on) { var out = []; rlGroups().forEach(function (grp) { grp[1].forEach(function (id) { if (!!rlInfo(id).on === on) out.push(id); }); }); return out; }
  function smRuleOff(id) {
    var r = state.rules, before = clone(r);
    if (id === "favorites") r.favorites = false; else if (id === "events") r.events = false;
    else if (id.indexOf("ev:") === 0) { r.sports = Object.assign({}, r.sports || {}); delete r.sports[id.slice(3)]; }
    else { r.by = r.by || {}; delete r.by[id.slice(3)]; }
    SM.undo = { name: rlName(id), rules: before }; rulesChanged(); smDraw(true);
  }
  function smRules(two) {
    var col = el("div", "sm-col"), top = el("div", "sm-top"); top.appendChild(el("h1", null, "My slate")); top.appendChild(el("p", null, "The games you see each day")); col.appendChild(top);
    var body = el("div", "sm-body"); col.appendChild(body);
    if (SM.undo) {
      var u = el("div", "sm-undo"); u.appendChild(el("span", null, "Removed " + SM.undo.name + "."));
      var ub = el("button", null, "Put it back"); ub.type = "button"; ub.addEventListener("click", function () { state.rules = SM.undo.rules; SM.undo = null; rulesChanged(); smDraw(true); }); u.appendChild(ub); body.appendChild(u);
    }
    var ids = smRuleIds(true), box = el("div", "sm-rows");
    ids.forEach(function (id) {
      var inf = rlInfo(id), r = el("div", "sm-rule"), tx = el("span", null, rlName(id));
      tx.appendChild(el("small", null, id === "favorites" ? "Every game your teams play" + (state.teams.length ? "" : ". You have no teams yet") : inf.sum));
      r.appendChild(tx);
      var rm = el("button", null, "Remove"); rm.type = "button"; rm.setAttribute("aria-label", "Remove " + rlName(id)); rm.addEventListener("click", function () { smRuleOff(id); }); r.appendChild(rm);
      box.appendChild(r);
    });
    if (ids.length) body.appendChild(box); else body.appendChild(el("p", "sm-note", "Nothing is picked yet, so your slate is empty. Add games to start."));
    body.appendChild(smBtn("Add games", function () { smGo("add"); }, "wide main"));
    body.appendChild(smBtn("Change my teams", function () { smPeek("teams"); }, "wide"));
    smBackBar(col, two); return col;
  }
  function smAdd(two) {
    var col = el("div", "sm-col"), top = el("div", "sm-top"); top.appendChild(el("h1", null, "Add games")); top.appendChild(el("p", null, "Step 1 of 2 · pick a sport")); col.appendChild(top);
    var body = el("div", "sm-body"); col.appendChild(body);
    rlGroups().forEach(function (grp) {
      var ids = grp[1].filter(function (id) { return !rlInfo(id).on; }); if (!ids.length) return;
      body.appendChild(el("div", "sm-h", grp[0]));
      ids.forEach(function (id) {
        body.appendChild(smBtn(rlName(id), function () {
          if (id === "favorites") { state.rules.favorites = true; rulesChanged(); smGo("rules"); }
          else if (id === "events") { state.rules.events = true; rulesChanged(); smGo("rules"); }
          else { SM.addId = id; smGo("add2"); }
        }, "wide"));
      });
    });
    smBackBar(col, two, "Back", function () { smGo("rules"); }); return col;
  }
  function smAdd2(two) {
    var id = SM.addId || "", col = el("div", "sm-col"), top = el("div", "sm-top"); top.appendChild(el("h1", null, "Which " + rlName(id) + " games?")); top.appendChild(el("p", null, "Step 2 of 2 · tap what you want. Any one counts.")); col.appendChild(top);
    var body = el("div", "sm-body"); col.appendChild(body);
    var opt = function (title, sub, on, fn) { var b = el("button", "sm-opt" + (on ? " on" : ""), title); b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false"); if (sub) b.appendChild(el("small", null, sub)); b.addEventListener("click", function () { fn(); smDraw(true); }); body.appendChild(b); };
    if (id.indexOf("ev:") === 0) {
      var k = id.slice(3), eb = (state.rules.sports || {})[k] || {};
      (EV_RULES[k] || []).forEach(function (x) { opt(x[1], x[2], !!eb[x[0]], function () { setEvRule(k, x[0], !eb[x[0]]); }); });
    } else {
      var lk = id.slice(3), b0 = lgRules(lk), opts = (LG_OPTS[lk] || []).slice();
      if (opts.indexOf("all") > 0) { opts.splice(opts.indexOf("all"), 1); opts.unshift("all"); }
      opts.forEach(function (key) {
        var oi = optInfo(lk, key) || {}, val = b0[key];
        if (oi.c) oi.c.forEach(function (c) { opt(c[1], oi.p, val === c[0], function () { setLg(lk, key, val === c[0] ? null : c[0]); }); });
        else opt(key === "all" ? "Every game" : oi.t || optShort(lk, key, true), key === "all" ? "All " + rlName(id) + " games, every day" : oi.p, !!val, function () { setLg(lk, key, val ? null : true); });
      });
    }
    var bar = el("div", "sm-bar"); bar.appendChild(smBtn("Back", function () { smGo("add"); })); bar.appendChild(smBtn("Done", function () { smGo("rules"); }, "main")); col.appendChild(bar);
    return col;
  }
  function smHelp(two) {
    var col = el("div", "sm-col"), top = el("div", "sm-top"); top.appendChild(el("h1", null, "Help")); col.appendChild(top);
    var body = el("div", "sm-body"); col.appendChild(body);
    body.appendChild(el("div", "sm-h", "Text size"));
    var sg = el("div", "sm-seg"); Object.keys(SM_SIZES).forEach(function (k) { sg.appendChild(smBtn(SM_SIZES[k][0], function () { SM.size = k; smSave(); smDraw(true); }, SM.size === k ? "on" : "")); }); body.appendChild(sg);
    body.appendChild(el("div", "sm-h", "Screen"));
    var lk = el("div", "sm-seg"), dark = themeIsDark();
    var look = function (k) { return function () { if (!THEMES[k]) return; state.look = k; state.accent = THEMES[k][2]; applyLook(); saveSettings(); render(); smDraw(true); }; };
    lk.appendChild(smBtn("Dark", look("dark"), dark ? "on" : "")); lk.appendChild(smBtn("Light", look("paper"), dark ? "" : "on")); body.appendChild(lk);
    body.appendChild(el("div", "sm-h", "Your games"));
    body.appendChild(smBtn("Choose what's on my slate", function () { smGo("rules"); }, "wide"));
    body.appendChild(smBtn("Change my teams", function () { smPeek("teams"); }, "wide"));
    body.appendChild(el("div", "sm-h", "More"));
    if ($("set-sfb")) body.appendChild(smBtn("Tell DJ something looks wrong", function () { $("set-sfb").click(); }, "wide"));
    body.appendChild(smBtn("Use the full app", function () { smGo("leave"); }, "wide"));
    smBackBar(col, two); return col;
  }
  function smLeave(two) {
    var col = el("div", "sm-col"), top = el("div", "sm-top"); top.appendChild(el("h1", null, "Use the full app?")); col.appendChild(top);
    var body = el("div", "sm-body"); col.appendChild(body);
    body.appendChild(el("p", "sm-note", "The full app has more pages, smaller text and menus. Your teams and your slate stay the same."));
    body.appendChild(el("p", "sm-note", "To come back here later: Settings, then Look and text, then Simple mode."));
    body.appendChild(smBtn("Yes, use the full app", function () { SM.on = false; smSave(); smReload(); }, "wide main"));
    body.appendChild(smBtn("No, stay here", function () { smGo("help"); }, "wide"));
    smBackBar(col, two, "Back", function () { smGo("help"); }); return col;
  }
  var SM_PAGES = { home: smHome, game: smGame, rules: smRules, add: smAdd, add2: smAdd2, help: smHelp, leave: smLeave };

  // ---- News, Teams and feedback: the real page in bigger type, with one bar to come back ----
  function smPeek(view) { SM.peek = view; setView(view); applyLook(); smDraw(true); window.scrollTo(0, 0); }
  function smPeekExit() { SM.peek = ""; SM.page = SM.page === "game" ? "home" : SM.page; state.backTo = null; setView(homeView()); applyLook(); smDraw(true); }
  function smPeekBar() {
    var pb = $("sm-peekbar");
    if (!SM.peek) { if (pb) pb.hidden = true; return; }
    if (!pb) { pb = el("div"); pb.id = "sm-peekbar"; document.body.appendChild(pb); smQuiet(pb); }
    var deep = state.view !== SM.peek, key = deep ? "2" : "1"; pb.hidden = false;
    if (pb.getAttribute("data-k") === key) return;
    pb.setAttribute("data-k", key); pb.textContent = "";
    if (deep) pb.appendChild(smBtn("Back", function () { goBack(); smDraw(); }));
    pb.appendChild(smBtn("Back to my slate", smPeekExit, deep ? "" : "main"));
  }
  var smLook0 = applyLook;
  applyLook = function () {
    smLook0.apply(this, arguments);
    if (!SM.peek || !smOn()) return;
    var root = document.documentElement, sw = parseFloat(root.style.getPropertyValue("--strip-w")) || 0, avail = window.innerWidth - sw; if (isDuo) avail = avail / 2 - 20;
    var z = Math.max(parseFloat(root.style.getPropertyValue("--z")) || 1, Math.min(1.16, Math.floor(avail / SIZE_MIN_W * 100) / 100));
    root.style.setProperty("--z", String(z)); root.classList.toggle("bigtext", z >= 1.08); root.classList.toggle("zoomed", z > 1.1);
  };
  // touches on the layer never reach the app's swipe, pull-down or long-press handlers (they listen on document)
  function smQuiet(node) { ["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function (t) { node.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); }); }
  document.body.addEventListener("touchstart", function (e) { if (SM.peek && smOn()) e.stopPropagation(); }, { passive: true });
  document.body.addEventListener("touchmove", function (e) { if (SM.peek && smOn()) e.stopPropagation(); }, { passive: true });
  document.body.addEventListener("touchend", function (e) { if (SM.peek && smOn()) e.stopPropagation(); }, { passive: true });

  function smDraw(force) {
    var root = document.documentElement, act = smActive(), o = $("sm");
    root.classList.toggle("sm-on", act && !SM.peek); root.classList.toggle("sm-peek", act && !!SM.peek);
    if (!act) { if (o) o.hidden = true; if ($("sm-peekbar")) $("sm-peekbar").hidden = true; return; }
    if (!o) { o = el("div"); o.id = "sm"; document.body.appendChild(o); smQuiet(o); }
    smPeekBar();
    o.hidden = !!SM.peek; if (SM.peek) return;
    SM.two = window.innerWidth >= 700 && window.innerWidth > window.innerHeight;
    o.className = "sz-" + SM.size + (SM.two ? " two" : "");
    var pages = SM.two ? ["home", SM.page === "home" ? "game" : SM.page] : [SM.page];
    var cols = pages.map(function (p, i) { var c = (SM_PAGES[p] || smHome)(SM.two && !(i === 0 && p === "home" && !SM.two), i); c.setAttribute("data-pg", p); return c; });
    var sig = cols.map(function (c) { return c.outerHTML; }).join("");
    if (!force && sig === SM.last && o.childNodes.length === cols.length) return;
    var keep = {}; Array.prototype.forEach.call(o.children, function (c) { var b = c.querySelector(".sm-body"); if (b) keep[c.getAttribute("data-pg")] = b.scrollTop; });
    var same = SM.lastPages === pages.join("|");
    SM.last = sig; SM.lastPages = pages.join("|");
    o.textContent = ""; cols.forEach(function (c) { o.appendChild(c); });
    smFit(o);
    cols.forEach(function (c, i) { var p = c.getAttribute("data-pg"), b = c.querySelector(".sm-body"); if (b && keep[p] && (same || (SM.two && i === 0))) b.scrollTop = keep[p]; });
  }
  // 3.152.1 (DJ: "Simple mode setting is covered by Dynamic Island"): the island's width for the unfolded Duo's right half,
  // read from the host page (a pane has no --strip-w of its own); the folded Duo uses its own --strip-w in the CSS.
  function smIsland() {
    if (!PANE) return; var root = document.documentElement, w = 0;
    try { if (root.classList.contains("pn-right")) w = parseFloat(window.parent.document.documentElement.style.getPropertyValue("--strip-w")) || 0; } catch (e) { w = 0; }
    root.style.setProperty("--sm-isl", w + "px");
  }
  var smRender0 = render;
  render = function () { smRender0.apply(this, arguments); smIsland(); if (smOn() || $("sm")) smDraw(); };
  window.addEventListener("resize", function () { if (smOn()) smDraw(); });

  // ---- the switch: Settings > Look and text ----
  (function () {
    var lk = document.querySelector('#view-settings .setpg[data-pg="look"]'); if (!lk) return;
    var h = el("div", "sec"); h.appendChild(el("h2", null, "Simple mode"));
    var card = el("div", "setcard"), row = el("div", "optrow"), tx = el("div"); row.id = "sm-set-row";
    tx.appendChild(el("b", null, "Simple mode")); tx.appendChild(el("span", null, "Big text, one page, buttons with words, no swiping."));
    row.appendChild(tx);
    row.appendChild(switchEl(false, "Simple mode", function () { SM.on = true; SM.page = "home"; smSave(); smReload(); }));
    card.appendChild(row); card.appendChild(el("p", "hint", "Just your slate, the scores and the channel. To switch back, open Help in Simple mode and tap Use the full app."));
    var slot = $("sm-slot");  // 3.175.0: after Text size, the other way to make Slate easier to read
    if (slot) { slot.appendChild(h); slot.appendChild(card); } else { lk.insertBefore(card, lk.firstChild); lk.insertBefore(h, card); }
  })();

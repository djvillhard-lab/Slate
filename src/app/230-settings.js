  // ---------- settings ----------
  // ---------- team catalog and search ----------
  var TEAM_ALIAS = { "man utd": "Manchester United", "man united": "Manchester United", "man u": "Manchester United", "utd": "Manchester United", "man city": "Manchester City", "spurs": "Tottenham Hotspur", "psg": "Paris Saint-Germain", "barca": "Barcelona", "inter": "Internazionale", "inter milan": "Internazionale", "bayern": "Bayern Munich", "atleti": "Atlético Madrid", "juve": "Juventus", "bvb": "Borussia Dortmund", "slu": "Saint Louis Billikens", "mizzou": "Missouri Tigers", "ud": "Dayton Flyers", "cards": "St. Louis Cardinals", "redbirds": "St. Louis Cardinals", "bolts": "Tampa Bay Lightning", "niners": "San Francisco 49ers", "sixers": "Philadelphia 76ers", "cavs": "Cleveland Cavaliers", "mavs": "Dallas Mavericks", "wolves": "Minnesota Timberwolves", "pens": "Pittsburgh Penguins", "habs": "Montreal Canadiens", "nats": "Washington Nationals", "dbacks": "Arizona Diamondbacks" };
  var TEAM_ORDER = ["NFL", "NBA", "MLB", "NHL", "Premier League", "MLS", "College", "WNBA", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];
  function normT(x) { return String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\bsaint\b/g, "st").replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
  var TEAM_IDX = null;
  function teamIndex() {
    if (TEAM_IDX) return TEAM_IDX;
    TEAM_IDX = (window.TEAM_LIST || []).map(function (r) {
      var n = normT(r[0]);
      return { name: r[0], abbr: r[1], lg: r[2], c1: r[3] ? "#" + r[3] : "", c2: r[4] ? "#" + r[4] : "", n: n, w: n.split(" "), a: String(r[1] || "").toLowerCase(), s: normT(r[5]), rank: TEAM_ORDER.indexOf(r[2]) };
    });
    return TEAM_IDX;
  }
  function teamByName(name) { var k = parseTeam(name).name.toLowerCase(); return teamIndex().filter(function (t) { return t.name.toLowerCase() === k; })[0] || null; }
  function hasTeam(name) { var k = String(name || "").toLowerCase(); return state.teams.some(function (t) { return t.toLowerCase() === k; }); }
  function teamSearch(raw) {
    var q = normT(raw); if (!q) return [];
    var qw = q.split(" "), alias = TEAM_ALIAS[q] || "", out = [];
    teamIndex().forEach(function (t) {
      var sc = 0;
      if (alias && t.name === alias) sc = 99;
      else if (q.length >= 2 && t.a === q) sc = 96;
      else if (t.n === q) sc = 98;
      else if (t.n.indexOf(q) === 0) sc = 90;
      else if (t.s && t.s.indexOf(q) === 0) sc = 85;
      else if (qw.every(function (x) { return t.w.some(function (w) { return w.indexOf(x) === 0; }); })) sc = 80;
      else if (q.length >= 4 && t.n.indexOf(q) !== -1) sc = 50;
      if (sc) out.push([sc, t]);
    });
    out.sort(function (x, y) { return y[0] - x[0] || x[1].rank - y[1].rank || (x[1].name < y[1].name ? -1 : 1); });
    return out.slice(0, 8).map(function (x) { return x[1]; });
  }
  function teamBadge(t) { return badgeFor(t.abbr || t.name.slice(0, 3).toUpperCase(), t.name, t.c1, t.c2); }
  function pickTeam(t) {
    state.teams.push(t.name); saveSettings();
    $("team-input").value = ""; render(); renderTeamResults();
    toast("Added " + t.name);
  }
  function renderTeamResults() {
    var box = $("team-results"), q = $("team-input").value; box.textContent = "";
    if (!normT(q)) { box.hidden = true; return; }
    box.hidden = false;
    var res = teamSearch(q);
    if (!res.length) { box.appendChild(el("p", "tres-none", "No team matches \u201c" + q.trim() + "\u201d. Try the city or the nickname.")); return; }
    res.forEach(function (t) {
      if (t.lg === "College") { box.appendChild(colPickRow(t, true)); return; }
      var on = hasTeam(t.name), b = el("button", "tres-row" + (on ? " on" : "")); b.type = "button";
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-label", t.name + ", " + t.lg + (on ? ". In your teams. Tap to remove" : ". Tap to add"));
      b.appendChild(teamBadge(t));
      var tx = el("span", "tx"); tx.appendChild(el("span", "n", t.name)); tx.appendChild(el("span", "lg", t.lg)); b.appendChild(tx);
      b.appendChild(starIcon(on));
      b.addEventListener("click", function () {
        if (hasTeam(t.name)) { state.teams = state.teams.filter(function (x) { return x.toLowerCase() !== t.name.toLowerCase(); }); saveSettings(); render(); renderTeamResults(); toast("Removed " + t.name); }
        else pickTeam(t);
      });
      box.appendChild(b);
    });
  }
  // which sports of a college team are picked: a bare entry counts as all three
  function colSports(name) {
    var k = name.toLowerCase(), on = {};
    state.teams.forEach(function (t) { var p = parseTeam(t); if (p.name.toLowerCase() !== k) return; if (p.lg) on[p.lg] = 1; else COL_KEYS.forEach(function (x) { on[x] = 1; }); });
    return on;
  }
  function setColSport(name, lg, want) {
    var on = colSports(name); if (want) on[lg] = 1; else delete on[lg];
    var k = name.toLowerCase(), at = -1;
    state.teams = state.teams.filter(function (t, i) { var hit = parseTeam(t).name.toLowerCase() === k; if (hit && at < 0) at = i; return !hit; });
    var add = COL_KEYS.filter(function (x) { return on[x]; }).map(function (x) { return colEntry(name, x); });
    if (at < 0) at = state.teams.length;
    Array.prototype.splice.apply(state.teams, [at, 0].concat(add));
    saveSettings(); render();
    if ($("team-results") && !$("team-results").hidden) renderTeamResults();
    toast((want ? "★ Added " : "Removed ") + name + " " + COL_SPORT[lg].toLowerCase());
  }
  function colPickRow(t, inSearch) {
    var on = colSports(t.name), any = Object.keys(on).length;
    var r = el("div", (inSearch ? "tres-row col" : "trow col") + (any ? " on" : ""));
    if (inSearch) r.setAttribute("role", "listitem");
    r.appendChild(teamBadge(t));
    var tx = el("span", "tx"); tx.appendChild(el("span", "n", t.name));
    var chips = el("span", "csp");
    COL_KEYS.forEach(function (k) {
      var c = el("button", "csp-c" + (on[k] ? " on" : "")); c.type = "button";
      c.setAttribute("aria-pressed", on[k] ? "true" : "false");
      c.setAttribute("aria-label", t.name + " " + COL_SPORT[k]);
      c.appendChild(starIcon(!!on[k])); c.appendChild(document.createTextNode({ ncaam: "Men's hoops", ncaaw: "Women's hoops", ncaaf: "Football" }[k]));
      c.addEventListener("click", function (e) { e.stopPropagation(); setColSport(t.name, k, !on[k]); });
      chips.appendChild(c);
    });
    tx.appendChild(chips); r.appendChild(tx);
    if (!inSearch) {
      var x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", "Remove " + t.name);
      x.addEventListener("click", function () { var k2 = t.name.toLowerCase(); state.teams = state.teams.filter(function (q) { return parseTeam(q).name.toLowerCase() !== k2; }); saveSettings(); render(); });
      r.appendChild(x);
    }
    return r;
  }
  function renderSettings() {
    var fn = Number(state.foldNudge) || 0; $("fold-val").textContent = fn ? (fn > 0 ? "+" : "") + fn + " pt" : "Auto";
    var dm = deviceMode();
    Array.prototype.forEach.call($("device-seg").children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-device") === dm ? "true" : "false"); });
    $("device-hint").textContent = dm === "duo" ? "Opened up and sideways, the screen splits on the crease: your slate on the left, games on the right." : "One page that fits a regular iPhone. Turn the phone sideways and it stays one page.";
    var tg = $("theme-grid"); tg.textContent = ""; tg.hidden = Object.keys(THEMES).length < 2;
    Object.keys(THEMES).forEach(function (k) {
      var t = THEMES[k], v = t[3], acc = ACCENTS[t[2]], b = el("button", "theme"); b.type = "button";
      b.setAttribute("aria-pressed", state.look === k ? "true" : "false"); b.setAttribute("aria-label", t[0] + " theme");
      var mini = el("span", "th-mini"); mini.style.background = v[0];
      var c1 = el("span", "th-card"); c1.style.background = v[1];
      var ln = el("span", "th-line"); ln.style.background = v[5]; c1.appendChild(ln);
      var ln2 = el("span", "th-line s"); ln2.style.background = v[6]; c1.appendChild(ln2);
      var dot = el("span", "th-dot"); dot.style.background = acc.fill; c1.appendChild(dot);
      mini.appendChild(c1); b.appendChild(mini); b.appendChild(el("span", "th-name", t[0]));
      b.addEventListener("click", function () { state.look = k; state.accent = t[2]; applyLook(); saveSettings(); render(); });
      tg.appendChild(b);
    });
    Array.prototype.forEach.call($("size-seg").children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-size") === state.textSize ? "true" : "false"); });
    var asn = $("auto-size-note"); if (asn) { var zz = Math.round(systemTextZoom() * 100); asn.textContent = "Auto matches your iPhone's text size (" + zz + "% right now). M is 100%."; }
    Array.prototype.forEach.call($("size-seg-wide").children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-size") === (state.textSizeWide || state.textSize) ? "true" : "false"); });
    if (false) Array.prototype.forEach.call([], function (b) { b.setAttribute("aria-pressed", (b.getAttribute("data-v") === "on") === !!state.autoAdd ? "true" : "false"); });
    Array.prototype.forEach.call($("score-seg").children, function (b) { b.setAttribute("aria-pressed", (b.getAttribute("data-v") === "on") === !!state.showScores ? "true" : "false"); });
    Array.prototype.forEach.call($("pvstyle-seg").children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-v") === (state.pvStyle || "para") ? "true" : "false"); });
    var nc = $("nl-chips"); if (nc) { nc.textContent = "";
      var cur = state.newsletters || [], nh = $("nl-head");
      $("nl-sum").textContent = cur.length ? nlList().filter(function (n) { return cur.indexOf(n[0]) !== -1; }).map(function (n) { return n[1]; }).join(", ") : "None. Today's editions, linked under your slate.";
      nc.hidden = !state.nlOpen; nh.setAttribute("aria-expanded", state.nlOpen ? "true" : "false");
      if (!nh.dataset.on) { nh.dataset.on = "1"; nh.addEventListener("click", function () { state.nlOpen = !state.nlOpen; renderSettings(); }); }
      var none = el("button", "nl-chip"); none.type = "button"; none.appendChild(el("b", null, "None")); none.appendChild(el("span", null, "No newsletters")); none.setAttribute("aria-pressed", cur.length ? "false" : "true");
      none.addEventListener("click", function () { state.newsletters = []; saveSettings(); render(); }); nc.appendChild(none);
      nlList().forEach(function (n) {
        var on = cur.indexOf(n[0]) !== -1, b = el("button", "nl-chip"); b.type = "button"; b.setAttribute("aria-pressed", on ? "true" : "false");
        b.appendChild(el("b", null, n[1])); b.appendChild(el("span", null, n[2]));
        b.addEventListener("click", function () { var l = (state.newsletters || []).slice(), i = l.indexOf(n[0]); if (i === -1) l.push(n[0]); else l.splice(i, 1); state.newsletters = l; saveSettings(); render(); });
        nc.appendChild(b);
      });
    }
    var ws = $("wal-set"); if (ws) { ws.textContent = ""; var wr = walRules(), wh = $("wal-head");
      var picks = [wr.close && "close finishes", wr.upset && "upset watch", wr.big && "big nights"].filter(Boolean);
      $("wal-sum").textContent = !wr.on ? "Off" : !picks.length ? "On, but no rules picked" : "On: " + picks.join(" and ") + ", " + (wr.leagues.length ? wr.leagues.map(function (k) { return (LEAGUES[k] || {}).tag || k; }).join(", ") : "no leagues");
      ws.hidden = !state.walOpen; wh.setAttribute("aria-expanded", state.walOpen ? "true" : "false");
      if (!wh.dataset.on) { wh.dataset.on = "1"; wh.addEventListener("click", function () { state.walOpen = !state.walOpen; renderSettings(); }); }
      var setRule = function (k, v) { var r = Object.assign({}, state.walRules || {}); r[k] = v; state.walRules = r; saveSettings(); render(); };
      var walRow = function (k, title, help, opts, parent) {
        var row = el("div", "optrow" + (parent ? " wal-parent" : "")), t = el("div"); t.appendChild(el("b", null, title)); if (help) t.appendChild(el("span", null, help)); row.appendChild(t);
        var seg = el("div", "seg seg2"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", title);
        opts.forEach(function (v) { var bt = el("button", null, v[1]); bt.type = "button"; bt.setAttribute("aria-pressed", wr[k] === v[0] ? "true" : "false");
          bt.addEventListener("click", function () { setRule(k, v[0]); }); seg.appendChild(bt); });
        row.appendChild(seg); return row;
      };
      ws.appendChild(walRow("on", "Show this section", "Live games that aren't on your slate but are worth switching to, at the top of today's slate.", [[true, "On"], [false, "Off"]], true));
      var kids = el("div", "wal-kids" + (wr.on ? "" : " off"));
      if (!wr.on) kids.setAttribute("aria-hidden", "true");
      kids.appendChild(el("p", "wal-kids-h", "What gets a game in"));
      kids.appendChild(walRow("close", "Close finishes", "The final 8 minutes (basketball, football, hockey's 3rd), from the 75th minute (soccer) or the 7th inning (baseball), within 6 points (basketball), 8 (football), 2 runs or 1 goal.", [[true, "On"], [false, "Off"]]));
      kids.appendChild(walRow("upset", "Upset watch", "A ranked college team trailing a lower-ranked or unranked team late: down 8 or more in football's second half, 7 or more in basketball's second half.", [[true, "On"], [false, "Off"]]));
      kids.appendChild(walRow("big", "Big individual nights", "The exact bar: 35 points (30 in WNBA and college), 300 passing or 130 rushing or receiving yards, or 2 goals in hockey.", [[true, "On"], [false, "Off"]]));
      kids.appendChild(walRow("nat", "National TV only", "Only games on national TV (ABC, CBS, NBC, FOX, ESPN, TNT and the like).", [[true, "On"], [false, "Off"]]));
      kids.appendChild(walRow("ranked", "College: ranked teams only", "College games show only when a ranked team is playing.", [[true, "On"], [false, "Off"]]));
      var lr = el("div", "optrow col"), lt = el("div"); lt.appendChild(el("b", null, "Leagues")); lt.appendChild(el("span", null, "Games from these leagues can show up. Games on your slate always can.")); lr.appendChild(lt);
      var lc = el("div", "lgchips");
      ORDER.forEach(function (k) {
        var on = wr.leagues.indexOf(k) !== -1, bt = el("button", "lgchip", (LEAGUES[k] || {}).name || k); bt.type = "button"; bt.setAttribute("aria-pressed", on ? "true" : "false");
        if (!wr.on) bt.disabled = true;
        bt.addEventListener("click", function () { var l = walRules().leagues.slice(), i = l.indexOf(k); if (i === -1) l.push(k); else l.splice(i, 1); setRule("leagues", ORDER.filter(function (x) { return l.indexOf(x) !== -1; })); });
        lc.appendChild(bt);
      });
      lr.appendChild(lc); kids.appendChild(lr);
      if (!wr.on) kids.querySelectorAll("button").forEach(function (bt) { bt.disabled = true; });
      ws.appendChild(kids);
    }
    // what your thumbs on Suggested for you and Worth a look have taught (185-thumbs.js)
    var fs = $("fb-set"), fh = $("fb-head"); if (fs && fh) {
      $("fb-sum").textContent = fbSummary();
      fs.hidden = !state.fbOpen; fh.setAttribute("aria-expanded", state.fbOpen ? "true" : "false");
      if (!fh.dataset.on) { fh.dataset.on = "1"; fh.addEventListener("click", function () { state.fbOpen = !state.fbOpen; renderSettings(); }); }
      if (state.fbOpen) fbSettings(fs);
    }
    var sw = $("swatches"); sw.textContent = "";
    Object.keys(ACCENTS).forEach(function (k) {
      var a = ACCENTS[k], b = el("button", "sw"); b.type = "button";
      b.style.background = a.fill; b.style.color = a.on;
      b.setAttribute("aria-label", a.name + " accent"); b.setAttribute("aria-pressed", state.accent === k ? "true" : "false");
      if (state.accent === k) b.appendChild(icon("check"));
      b.addEventListener("click", function () { state.accent = k; applyLook(); saveSettings(); render(); });
      sw.appendChild(b);
    });
    var tb = el("button", "sw sw-team"); tb.type = "button";
    var ta = TEAM_ACC && TEAM_ACC.date === todayInHome() && (TEAM_ACC.c1 || TEAM_ACC.c2) ? TEAM_ACC : null;
    tb.style.background = ta ? "linear-gradient(135deg, " + (ta.c1 || ta.c2) + " 50%, " + (ta.c2 || ta.c1) + " 50%)" : "conic-gradient(#c41e3a 0 25%, #002f87 0 50%, #da291c 0 75%, #fdb827 0)";
    tb.setAttribute("aria-label", "Team colors accent"); tb.setAttribute("aria-pressed", state.accent === "team" ? "true" : "false");
    if (state.accent === "team") tb.appendChild(icon("check"));
    tb.addEventListener("click", function () {
      state.accent = "team"; TEAM_ACC = null; updateTeamAccent(); applyLook(); saveSettings(); render();
      var t = TEAM_ACC && (TEAM_ACC.c1 || TEAM_ACC.c2) ? TEAM_ACC.name : "";
      toast(t ? "Team colors: changes daily to your first team playing. Today: " + t : "Team colors: changes daily to your first team playing. None play today");
    });
    sw.appendChild(tb);
  }


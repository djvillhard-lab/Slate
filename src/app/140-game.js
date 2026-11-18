  function renderGame() {
    var body = $("game-body"); if (!body) return; body.textContent = "";
    if (state.view !== "game") return;
    var g = games().filter(function (x) { return x.id === state.gameId; })[0];
    if (!g) { if (!isDuo) { state.view = "lineup"; setTimeout(render, 0); return; } body.appendChild(el("div", "notice", "Pick a game on your slate to read its full preview here.")); return; }
    var pv = (state.previews || {})[g.id] || null, lg = (state.previewLeagues || {})[g.league] || {}, L = info(g);

    // the matchup
    var hd = el("div", "gv-head");
    var ln = leagueLine(g, true); hd.appendChild(ln);
    var row = el("div", "gv-match"), teams = el("div", "gv-teams");
    sideOrder(g).forEach(function (s2) { teams.appendChild(teamLine(g, s2)); });
    if (!g.custom && BX_SPORT[g.league]) sideOrder(g).forEach(function (s2, i2) {
      var ln2 = teams.children[i2]; if (!ln2) return;
      ln2.classList.add("tm-link"); ln2.setAttribute("role", "button"); ln2.setAttribute("tabindex", "0"); ln2.setAttribute("aria-label", "Open the " + g[s2] + " team page");
      ln2.addEventListener("click", function (ev) { ev.stopPropagation(); openTeam(g[s2], g.league); });
    });
    row.appendChild(teams); row.appendChild(statusSide(g, "lineup")); hd.appendChild(row);
    var meta = [];
    sideOrder(g).forEach(function (sd) { var x = g[sd + "Standing"] || g[sd + "Conf"]; if (x) meta.push(abbr(g, sd) + " " + x); });
    if (meta.length) hd.appendChild(el("p", "gv-meta", meta.join(" · ")));
    var lc = venueLine(g); if (lc) hd.appendChild(lc);
    if (!g.custom && !isPastDay()) {
      var acts = el("div", "gv-acts"), onS = inLineup(g.id);
      var sb = el("button", "gv-act" + (onS ? " on" : "")); sb.type = "button";
      sb.appendChild(icon(onS ? "check" : "plus")); sb.appendChild(document.createTextNode(onS ? "On your slate" : "Add to slate"));
      sb.setAttribute("aria-label", onS ? "Remove from your slate" : "Add to your slate");
      sb.addEventListener("click", function () { toggle(g.id); keepScroll(renderGame); });
      acts.appendChild(sb);
      hd.appendChild(acts);
    }
    if (feedOk(g)) hd.appendChild(feedBtn(g));
    body.appendChild(hd);
    teamStripe(hd, g);   // 3.91.0: the team-color stripe down the header card's edge, as on every matchup card

    // three sections that open and close: box score, team stats, preview (or recap)
    var kind = status(g).kind, started = kind === "live" || kind === "over", sport = BX_SPORT[g.league] || "", b = sport ? boxFor(g) : null;
    bxNeed(g);
    var ostrip = oddsStrip(g, b); if (ostrip) { ostrip.classList.add("gv-oddsbar"); body.appendChild(ostrip); }
    var mybk = mybChip(g); if (mybk) { var mpo = ostrip && ostrip.querySelector(".pv-odds"); if (mpo) mpo.appendChild(mybk); else { var mrw = el("div", "myb-chip-row"); mrw.appendChild(mybk); body.appendChild(mrw); } }  // small "+ Add bet" (3.89.4)
    var mybc = mybCard(g); if (mybc) body.appendChild(mybc);  // Your bets, under the line (3.86.0)
    // Claude's write (or regenerate) button sits right under the location and the betting line, in every sport (DJ, 3.52.5)
    var gcTop = gameClaudeCtl(g); if (gcTop) { gcTop.classList.add("gv-cl"); body.appendChild(gcTop); }
    var live = boxLive(b), season = !live && b && b.state === "pre" && b.season;
    state.gvSec = state.gvSec || {};
    var open = state.gvSec[g.id] || (state.gvSec[g.id] = { recap: kind === "over", box: kind === "live", team: false, pv: !started });
    function section(key, title, sub, fill) {
      var on = !!open[key], wrap = el("div", "gv-sec" + (on ? " open" : ""));
      var tg = el("button", "gv-toggle"); tg.type = "button"; tg.setAttribute("aria-expanded", on ? "true" : "false");
      var tx = el("span", "gv-tt"); tx.appendChild(el("b", null, title)); if (sub) tx.appendChild(el("i", null, sub));
      tg.appendChild(tx); tg.appendChild(icon("more"));
      var inner = null;
      tg.addEventListener("click", function () {
        if (open[key] && inner) { tg.setAttribute("aria-expanded", "false"); wrap.classList.remove("open"); slideClose(inner, function () { open[key] = false; keepScroll(renderGame); }); return; }
        open[key] = true; state.secAnim = g.id + "|" + key; keepScroll(renderGame);
      });
      wrap.appendChild(tg);
      if (on) { inner = el("div", "gv-sec-in"); fill(inner); wrap.appendChild(inner); if (state.secAnim === g.id + "|" + key) { state.secAnim = null; slideOpen(inner); } }
      body.appendChild(wrap);
    }
    // finished: recap + box score, team stats, pregame preview. live: box score, team stats, preview. upcoming: preview, player stats, team stats
    function standFill(box) {
      var marks = [abbr(g, "away"), abbr(g, "home")].map(function (x) { return x.toUpperCase(); });
      var groups = Array.isArray(lg.standings) ? lg.standings : [];
      var show = groups.filter(function (gr) { return (gr.rows || []).some(function (r) { return marks.indexOf(String(r.abbr || "").toUpperCase()) !== -1; }); });
      if (!show.length && groups.length) show = groups.slice(0, 1);
      show.forEach(function (gr) { box.appendChild(standTable((gr.name || L.name) + " standings", gr.rows || [], marks)); });
      if (show.length && SDG_LGS.indexOf(g.league) !== -1) { var fs = el("button", "rlink", "Full " + L.name + " standings"); fs.type = "button"; fs.addEventListener("click", function () { openStandings(g.league); }); box.appendChild(fs); }
      if (Array.isArray(lg.poll) && lg.poll.length) box.appendChild(standTable(lg.pollName || "AP Top 25", lg.poll, marks));
    }
    // standings live with team stats; previews keep the Athletic links and byline
    function pvExtras(box) {
      if (!sport) standFill(box);
      var ath = athFor(g.league, [short(g, "away"), short(g, "home")]);
      if (ath.length) box.appendChild(linkList("From The Athletic", ath.slice(0, 5)));
      if (pv) { var by = byLine(pv); if (by) box.appendChild(el("p", "pv-at gv-at", by)); }
    }
    function boxFill(box) {
      if (live) {
        var bc = gvCard(null, "gv-box");
        if (BX_SPORT[g.league] === "soccer" && boxShown(g)) { var ftl = socTimeline(g, b, false); if (ftl) bc.appendChild(ftl); }
        bc.appendChild(boxShown(g) ? bxPlayers(g, b, false, false) : boxGate(g));
        bc.appendChild(el("p", "pv-at bx-at", bxStamp(b))); box.appendChild(bc);
      } else if (season) {
        var sc2 = gvCard(null, "gv-box"); sc2.appendChild(bxPlayers(g, b, false, true)); sc2.appendChild(el("p", "pv-at bx-at", bxStamp(b))); box.appendChild(sc2);
      } else {
        var wn = gvCard(null); wn.appendChild(el("p", "pv-none", window.SLATE_SELF ? (started ? "Loading the box score…" : "Loading this season's stats…") : started ? "The box score arrives with the next hourly refresh." : "This season's stats arrive with the next hourly refresh.")); box.appendChild(wn);
      }
    }
    function teamSec() {
      section("team", "Team stats", started ? (kind === "live" ? "Live" : "Final") : "This season", function (box) {
        var ts = (live && boxShown(g)) || season ? bxTeamStats(g, b, false) : null;
        var tc = gvCard(null, "gv-box");
        if (ts) tc.appendChild(ts);
        else tc.appendChild(live ? boxGate(g) : el("p", "pv-none", window.SLATE_SELF ? "Loading team stats…" : "Team stats arrive with the next hourly refresh."));
        box.appendChild(tc);
        standFill(box);
      });
    }
    var hasPre = pv && pv.summary;
    if (kind === "over") {
      var rcx = pv && recapOf(pv);
      section("recap", sport === "soccer" ? "Recap, lineups and summary" : "Recap and players", "Final", function (box) {
        // Claude's summary first, then the game's top performers, then the full box score
        previewSections(g, pv, box, "recap", true);
        var tp = live ? boxStars(g, b) : null; if (tp) box.appendChild(tp);
        var scbF = live && boxShown(g) ? scoringBlock(g, true) : null; if (scbF) { var scfc = gvCard(null, "gv-box"); scfc.appendChild(scbF); box.appendChild(scfc); }  // the scoring timeline
        if (sport) boxFill(box);
        pvExtras(box);
      });
      if (sport) teamSec();
    } else if (kind === "live") {
      if (sport) section("box", sport === "soccer" ? "Top performers, lineups and match summary" : "Top performers and players", "Live", function (box) {
        // the game's top individual performances first, then every player
        var tp = live ? boxStars(g, b) : null; if (tp) box.appendChild(tp);
        var scb2 = live && boxShown(g) ? scoringBlock(g, true) : null; if (scb2) { var sc2c = gvCard(null, "gv-box"); sc2c.appendChild(scb2); box.appendChild(sc2c); }
        boxFill(box); });
      if (sport) teamSec();
      section("pv", "Preview", hasPre ? "Quick read, deep dive, players" : "Not written yet", function (box) {
        previewSections(g, pv, box, "pre");
        pvExtras(box);
      });
    } else {
      section("pv", "Preview", hasPre ? "Quick read, deep dive, players" : "Not written yet", function (box) {
        previewSections(g, pv, box); pvExtras(box);
      });
      // season player stats before the start, except soccer (DJ, 3.52.7): soccer's arrive with the box score once the game is on
      if (sport) { if (sport !== "soccer") section("box", "Player stats", "This season", boxFill); teamSec(); }
    }
  }
  // the matchup page's preview sections (odds, quick read or recap, deep dive, players, form, headlines)
  // the game's top performers straight from the box score, each with a full line (at least four stats)
  var STAR_COLS = { bball: ["PTS", "REB", "AST", "FG", "3PT", "STL", "BLK"], hockey: ["G", "A", "S", "+/-", "TOI", "SV", "SA"], football: ["C/ATT", "YDS", "TD", "INT", "CAR", "REC", "LONG"], baseball: ["AB", "H", "R", "RBI", "HR", "BB", "K"], soccer: ["G", "A", "SH", "ST"] };
  function boxStars(g, b) {
    var sport = BX_SPORT[g.league] || "", want = STAR_COLS[sport]; if (!want || !b || !b.teams) return null;
    var all = [];
    b.teams.forEach(function (t) {
      (t.groups || []).forEach(function (gr) {
        var cols = gr.cols || [];
        (gr.rows || []).forEach(function (r) {
          if ("dnp" in r) return;
          var v = {}; cols.forEach(function (c, i) { v[c] = r.s[i]; });
          var n = function (k) { var x = parseFloat(String(v[k] == null ? "" : v[k]).replace("+", "")); return isNaN(x) ? 0 : x; };
          var score = sport === "bball" ? n("PTS") + n("REB") * 1.2 + n("AST") * 1.5 + n("STL") * 2 + n("BLK") * 2 : sport === "hockey" ? n("G") * 6 + n("A") * 4 + n("S") * .5 + n("SV") * .3 : sport === "football" ? n("YDS") / 10 + n("TD") * 6 - n("INT") * 4 : sport === "baseball" ? n("H") * 2 + n("HR") * 4 + n("RBI") * 2 + n("K") : n("G") * 6 + n("A") * 4 + n("SH");
          var parts = want.filter(function (k) { return v[k] != null && v[k] !== "" && v[k] !== "0" && v[k] !== "0-0"; }).slice(0, 5).map(function (k) { return v[k] + " " + k; });
          if (parts.length < 4) parts = want.filter(function (k) { return v[k] != null && v[k] !== ""; }).slice(0, 4).map(function (k) { return v[k] + " " + k; });
          // a touchdown that isn't on offense (a fumble or interception return, a kick return) says where it came from
          var odd = sport === "football" && ["passing", "rushing", "receiving"].indexOf(gr.k) === -1;
          if (odd) { if (!n("TD")) return; parts = [n("TD") + " TD (" + (BX_GROUP[gr.k] || gr.k).toLowerCase() + ")"]; }
          // football: one line per player, whatever he did (a QB who ran and threw: "81 pass yds · 66 rush yds, 1 rush TD")
          if (sport === "football") {
            var key = t.abbr + "|" + r.n, ex = all.filter(function (x) { return x.key === key; })[0];
            if (!ex) { ex = { key: key, n: r.n, id: r.id, p: r.p, team: t.abbr, score: 0, bits: [], scored: false, fb: { td: 0, ptd: 0, py: 0, ry: 0, cy: 0, int: 0, odd: [] } }; all.push(ex); }
            if (!ex.p && r.p) ex.p = r.p;
            var F = ex.fb;  // what the tags read (3.75.0)
            if (odd) F.odd.push(gr.k); else if (gr.k === "passing") { F.ptd += n("TD"); F.py += n("YDS"); F.int += n("INT"); } else { F.td += n("TD"); if (gr.k === "rushing") F.ry += n("YDS"); else F.cy += n("YDS"); }
            if (odd) F.td += n("TD");
            var bit = gr.k === "passing" ? n("YDS") + " pass yds" + (n("TD") ? ", " + n("TD") + " pass TD" : "") + (n("INT") ? ", " + n("INT") + " INT" : "") + (v["C/ATT"] ? " (" + v["C/ATT"] + ")" : "")
              : gr.k === "rushing" ? n("YDS") + " rush yds" + (n("TD") ? ", " + n("TD") + " rush TD" : "")
              : gr.k === "receiving" ? n("REC") + " rec, " + n("YDS") + " yds" + (n("TD") ? ", " + n("TD") + " rec TD" : "")
              : parts[0];
            if (gr.k === "passing") ex.bits.unshift(bit); else ex.bits.push(bit);
            ex.score += score; ex.scored = ex.scored || (gr.k !== "passing" && n("TD") > 0); ex.line = ex.bits.join(" · ");
            return;
          }
          all.push({ n: r.n, id: r.id, p: r.p, team: t.abbr, score: score, line: parts.join(" · "), tags: tpTags(sport, v, status(g).kind === "over"), scored: sport === "hockey" ? n("G") > 0 : false });
        });
      });
    });
    all.sort(function (a, c) { return c.score - a.score; }); if (!all.length) return null;
    var wc = gvCard("Top performers", "gv-watch");
    // the top four, plus everyone else who scored (every touchdown and goal scorer gets a line)
    var show = all.slice(0, 4).concat(all.slice(4).filter(function (w) { return w.scored; })).slice(0, 10);
    show.forEach(function (w) { if (w.fb) w.tags = tpFootTags(w.fb); wc.appendChild(tpRow(g, sport, w, tpJerseys(g))); });
    return wc;
  }
  // ---- Top performers' tags (DJ, 3.75.0: "creative options for tags for players from all sports") ----
  // only from numbers the box score has; the best ones first, at most three on a card
  // football adds up a player's groups first: F = { td (non-passing TDs), ptd (TD passes), py, ry, cy (pass, rush, receiving yards), int (thrown), odd: [group names of return TDs] }
  function tpFootTags(F) {
    var t = [], a = function (txt, c) { t.push({ t: txt, c: c || "" }); };
    if (F.odd.indexOf("interceptions") !== -1 && F.td) a("🧲 Pick six", "hot");
    else if (F.odd.some(function (k) { return /kick|punt/.test(k); }) && F.td) a("⚡ Return TD", "hot");
    else if (F.td) a("🏈 " + (F.td > 1 ? F.td + " TD" : "TD"), "hot");
    if (F.ptd >= 3) a("🔥 " + F.ptd + " TD passes", "hot"); else if (F.ptd) a("🎯 " + (F.ptd > 1 ? F.ptd + " TD passes" : "TD pass"), "good");
    if (F.py >= 300) a("🚀 300-yd passer", "good");
    if (F.ry >= 100) a("💨 100-yd rusher", "good");
    if (F.cy >= 100) a("🙌 100-yd receiver", "good");
    if (F.int >= 2) a("😬 " + F.int + " picks", "bad");
    return t;
  }
  // tpTags(sport, v, over): sport "bball" | "hockey" | "baseball" | "soccer"; v = { label: value } keyed by ESPN's box score labels
  // (PTS, REB, AST, STL, BLK, FG "7-9", 3PT "3-5", G, A, SV, GA, SA, IP, ER, K, H, HR, RBI, SOG, RC); over = the game is final.
  // Returns [{ t: "🎯 3 threes", c: "hot" | "good" | "bad" }], c being the fd-tag pill's style. Box Office uses it too. Football: tpFootTags.
  function tpTags(sport, v, over) {
    v = v || {};
    var t = [], a = function (txt, c) { t.push({ t: txt, c: c || "" }); }, has = function (k) { return v[k] != null && v[k] !== "" && v[k] !== "–"; };
    var n = function (k) { var x = parseFloat(String(v[k] == null ? "" : v[k]).replace("+", "")); return isNaN(x) ? 0 : x; };
    var made = function (k) { var m = /^(\d+)-(\d+)$/.exec(String(v[k] || "")); return m ? [Number(m[1]), Number(m[2])] : [0, 0]; };
    if (sport === "bball") {
      var tens = ["PTS", "REB", "AST", "STL", "BLK"].filter(function (k) { return n(k) >= 10; }).length, fg = made("FG"), tp = made("3PT");
      if (tens >= 3) a("👑 Triple-double", "hot"); else if (tens === 2) a("✌️ Double-double", "hot");
      if (n("PTS") >= 30) a("🪣 " + n("PTS") + "-piece", "hot");
      if (fg[1] >= 8 && fg[0] / fg[1] >= 0.6) a("🔥 Hot hand", "hot");
      if (tp[0] >= 3) a("🎯 " + tp[0] + " threes", "good");
      if (n("STL") + n("BLK") >= 5) a("🔒 Lockdown", "good");   // DJ (Nov 17, 2026): five steals and blocks, not three
      if (n("AST") >= 8 && tens < 2) a("🪄 " + n("AST") + " assists", "good");
    } else if (sport === "hockey") {
      if (has("SV")) {
        var ga = has("GA") ? n("GA") : has("SA") ? n("SA") - n("SV") : -1;
        if (ga === 0 && n("SV") > 0) a(over ? "🔒 Shutout" : "🔒 Perfect so far", "hot");
        if (n("SV") >= 30) a("🧱 " + n("SV") + " saves", "good");
      } else {
        if (n("G") >= 3) a("🎩 Hat trick", "hot"); else if (n("G") === 2) a("🚨 Two goals", "hot"); else if (n("G") === 1) a("🚨 Goal", "hot");
        if (n("A") >= 2) a("🍎 " + n("A") + " assists", "good");
      }
    } else if (sport === "baseball") {
      if (has("IP")) { if (n("K") >= 8) a("⚡ " + n("K") + " strikeouts", "hot"); if (n("IP") >= 6 && has("ER") && n("ER") === 0) a("🔒 Scoreless " + v.IP, "good"); }
      else {
        if (n("HR") >= 2) a("💣 " + n("HR") + " homers", "hot"); else if (n("HR") === 1) a("💣 Homer", "hot");
        if (n("H") >= 3) a("🔥 " + n("H") + " hits", "good");
        if (n("RBI") >= 3) a("🏃 " + n("RBI") + " RBI", "good");
      }
    } else if (sport === "soccer") {
      if (n("G") >= 3) a("🎩 Hat trick", "hot"); else if (n("G") === 2) a("⚽ Brace", "hot"); else if (n("G") === 1) a("⚽ Goal", "hot");
      if (n("A") >= 1) a("🅰️ " + (n("A") > 1 ? n("A") + " assists" : "Assist"), "good");
      if (n("SOG") >= 3) a("🎯 " + n("SOG") + " on target", "good");
      if (n("RC")) a("🟥 Sent off", "bad");
    }
    return t;
  }
  // ---- Top performers, in the live feed's look (DJ, 3.74.0: "bring this to life more") ----
  // each player is a small card: the team's color down the left edge, their jersey with the number (football and
  // basketball use the feed's own jerseys), the name, a position chip and team, the full stat line always on its own
  // line under the name (so every row reads the same), and the standout number big on the right in the team's color
  function tpJerseys(g) {
    var cur = bx.live[g.id], sum = cur && cur.sum, out = {}; if (!sum) return out;
    ((sum.boxscore || {}).players || []).forEach(function (t) { (t.statistics || []).forEach(function (gr) { (gr.athletes || []).forEach(function (r) { var a = r.athlete || {}; if (a.id && a.jersey) out[String(a.id)] = String(a.jersey); if (a.id && (a.position || {}).abbreviation) out["p" + a.id] = a.position.abbreviation; }); }); });
    ((sum.rosters || [])).forEach(function (t) { (t.roster || []).forEach(function (p) { var a = p.athlete || {}; if (a.id && (p.jersey || a.jersey)) out[String(a.id)] = String(p.jersey || a.jersey); }); });
    return out;
  }
  function tpSide(g, ab) { ab = String(ab || "").toUpperCase(); return ["away", "home"].filter(function (sd) { return String(abbr(g, sd) || "").toUpperCase() === ab || String(g[sd + "Abbr"] || "").toUpperCase() === ab; })[0] || ""; }
  function tpRow(g, sport, w, jers) {
    var sd = tpSide(g, w.team), r = el("div", "tp"), jer = (w.id && jers[w.id]) || "";
    if (sd) { var tc = ""; try { tc = hlInk(pairColors(g)[sd]); } catch (e) {} if (tc) r.style.setProperty("--tp-team", tc); }
    var P = { jer: jer };
    var jj = null; try { jj = sd ? (sport === "football" ? fdJersey(g, sd, P) : sport === "bball" ? hpJersey(g, sd, P) : null) : null; } catch (e) {}
    if (!jj) { jj = el("span", "tp-num", jer || "•"); var bc = sd ? badgeColor(g, sd) : ""; if (bc) { jj.style.background = bc; jj.style.color = hlContrast(bc, "#111111") >= hlContrast(bc, "#ffffff") ? "#111" : "#fff"; } }
    r.appendChild(jj);
    var m = el("div", "tp-m"), top = el("div", "tp-top");
    var nm = String(w.n || ""), parts = nm.split(" "); top.appendChild(el("b", "tp-n", parts.length > 1 ? parts[0].charAt(0) + ". " + parts.slice(1).join(" ") : nm));
    var pos = w.p || (w.id && jers["p" + w.id]) || ""; if (pos) top.appendChild(el("em", "fd-pos", pos));
    top.appendChild(el("span", "tp-t", w.team));
    var ln = el("div", "tp-l");
    ln.appendChild(document.createTextNode(w.line));
    m.appendChild(top); m.appendChild(ln); r.appendChild(m);
    // the right side: what made the night (3.75.0, DJ). Nothing qualifies, nothing shows.
    var tg = el("div", "tp-tags"); (w.tags || []).slice(0, 3).forEach(function (x) { tg.appendChild(el("span", "fd-tag" + (x.c ? " " + x.c : ""), x.t)); }); r.appendChild(tg);
    plrTap(r, { id: w.id, lg: g.league, name: w.n });   // 3.105.0: the row opens the player's page
    return r;
  }
  // part: "recap" (after the final: the recap and top performers), "pre" (the pregame preview only), or nothing (all of it)
  function previewSections(g, pv, body, part, noCl) {
    if (part === "recap") {
      var rc0 = pv && recapOf(pv);
      if (!rc0 && noCl) return;  // the matchup page has Claude's button at the top
      if (!rc0) { var np0 = gvCard(null); var c0 = gameClaudeCtl(g); if (c0) np0.appendChild(c0); body.appendChild(np0); return; }
    } else if (!pv || !(pv.summary || (part !== "pre" && pv.recap && pv.recap.text))) { var np = gvCard(null); np.appendChild(el("p", "pv-none", part === "pre" ? "No pregame preview was written for this game." : "No preview yet. Claude's button at the top writes one.")); body.appendChild(np); return; }
    // the betting line sits at the top of the matchup page, so it isn't repeated here
    var o = {};
    if (o.spread || o.total || (o.ml && o.ml.away != null)) {
      var od = el("div", "pv-odds gv-odds");
      if (o.spread) od.appendChild(el("span", null, o.spread));
      if (o.total) od.appendChild(el("span", null, "O/U " + o.total));
      if (o.ml && o.ml.away != null && o.ml.home != null) od.appendChild(el("span", null, mlText(g, o)));
      if (o.provider) od.appendChild(el("i", null, o.provider));
      body.appendChild(od);
    }
    var rc = part === "pre" ? null : recapOf(pv), rcOpen = rc && recapShown(g);
    if (rc) {
      var rq = gvCard(rc.quick ? "Box score recap" : "Recap", "gv-recap");
      if (rcOpen) { rq.appendChild(readNode(rc.text, rc.bullets, "gv-sum", rc.quick)); }
      else rq.appendChild(recapGate(g));
      body.appendChild(rq);
    } else if (pv.summary) {
      var q = gvCard("The quick read"); q.appendChild(readNode(pv.summary, pv.bullets, "gv-sum"));
      body.appendChild(q);
    }
    if (part === "recap") {
      var st0 = [];
      if (st0.length) { var wc0 = gvCard("Top performers", "gv-watch"); st0.forEach(function (w) { var r = el("div", "pw"); r.appendChild(el("span", "pw-n", w.name)); if (w.team) r.appendChild(el("span", "pw-t", w.team)); if (w.line) r.appendChild(el("span", "pw-l", w.line)); wc0.appendChild(r); }); body.appendChild(wc0); }
      return;
    }
    var long = Array.isArray(pv.long) ? pv.long.filter(Boolean) : [];
    var dd = gvCard(null), ddOpen = false; try { ddOpen = localStorage.getItem("slate-longread") === "1"; } catch (e) {}
    if (long.length) {
      var dt = el("button", "gv-tg" + (ddOpen ? "" : " shut")); dt.type = "button"; dt.setAttribute("aria-expanded", ddOpen ? "true" : "false");
      dt.appendChild(el("span", "gv-h", rc ? "Before the game" : "The deep dive")); dt.appendChild(el("em", null, ddOpen ? "Hide" : long.length + " paragraphs")); dt.appendChild(icon("more"));
      dt.addEventListener("click", function () { try { localStorage.setItem("slate-longread", ddOpen ? "0" : "1"); } catch (e) {} keepScroll(render); });
      dd.appendChild(dt);
      if (ddOpen) long.forEach(function (para) { dd.appendChild(el("p", "gv-p", para)); });
    } else { dd.appendChild(el("h3", "gv-h", "The deep dive")); if (!rc) dd.appendChild(el("p", "pv-none", "Regenerate the preview to add the longer read.")); }
    if (long.length || !rc) body.appendChild(dd);
    var stars = rcOpen && Array.isArray(rc.stars) ? rc.stars.filter(function (w) { return w && w.name; }) : [];
    var wl = pwList(g, pv, stars);
    if (wl.length) {
      var wc = gvCard(stars.length ? "Top performers" : "Players to watch", "gv-watch");
      wl.forEach(function (w) { wc.appendChild(pwRow(g, w, stars.length > 0)); });
      body.appendChild(wc);
    }
    if ((pv.last5 && (pv.last5.away || pv.last5.home)) || pv.series || pv.injuries) {
      var fc = gvCard("Form and health");
      if (pv.last5) sideOrder(g).forEach(function (sd) {
        if (!pv.last5[sd]) return;
        var r = el("div", "gv-form"); r.appendChild(el("b", null, short(g, sd))); r.appendChild(el("span", "gv-dim", "Last 5")); r.appendChild(formDots(pv.last5[sd])); fc.appendChild(r);
      });
      if (pv.series) fc.appendChild(el("p", "gv-line", pv.series));
      if (pv.injuries) { var ij = el("p", "gv-line"); ij.appendChild(el("b", null, "Injuries ")); ij.appendChild(document.createTextNode(pv.injuries)); fc.appendChild(ij); }
      body.appendChild(fc);
    }
    var hl = Array.isArray(pv.headlines) ? pv.headlines.filter(function (h) { return h && h.title && /^https:\/\/(www\.)?(nytimes\.com\/athletic|theathletic\.com)/.test(h.url || ""); }) : [];
    if (hl.length) body.appendChild(linkList("Headlines", hl));
  }
  function linkList(title, items) {
    var c = gvCard(title), ul = el("ul", "pv-hl gv-links");
    items.forEach(function (h) {
      var li = el("li"), a = el("a", null, h.title); a.href = safeUrl(h.url); a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a); if (h.source) li.appendChild(el("span", null, h.source)); ul.appendChild(li);
    });
    c.appendChild(ul); return c;
  }
  function standTable(title, rows, marks) {
    var c = gvCard(title, "gv-stand"), tb = el("div", "st-rows");
    rows.slice(0, 25).forEach(function (r) {
      var on = marks.indexOf(String(r.abbr || "").toUpperCase()) !== -1;
      var tr = el("div", "st-row" + (on ? " on" : ""));
      tr.appendChild(el("span", "st-rk", r.rank != null ? String(r.rank) : ""));
      tr.appendChild(el("span", "st-tm", r.team || r.abbr || ""));
      tr.appendChild(el("span", "st-rec", r.record || ""));
      tr.appendChild(el("span", "st-x", r.extra || ""));
      tb.appendChild(tr);
    });
    c.appendChild(tb); return c;
  }

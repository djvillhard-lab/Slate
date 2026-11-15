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

    // three sections that open and close: box score, team stats, preview (or recap)
    var kind = status(g).kind, started = kind === "live" || kind === "over", sport = BX_SPORT[g.league] || "", b = sport ? boxFor(g) : null;
    bxNeed(g);
    var ostrip = oddsStrip(g, b); if (ostrip) { ostrip.classList.add("gv-oddsbar"); body.appendChild(ostrip); }
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
        previewSections(g, pv, box, "recap");
        if (rcx) { var gcl = gameClaudeCtl(g); if (gcl) box.appendChild(gcl); }
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
      section("pv", "Preview", hasPre ? "Quick read, deep dive, players" : "Tap to have Claude write one", function (box) {
        if (!hasPre) { var gp = gvCard(null), gpc = gameClaudeCtl(g); if (gpc) { gp.appendChild(gpc); box.appendChild(gp); } }
        else previewSections(g, pv, box, "pre");
        pvExtras(box);
      });
    } else {
      section("pv", "Preview", hasPre ? "Quick read, deep dive, players" : "Tap to have Claude write one", function (box) {
        previewSections(g, pv, box); pvExtras(box);
      });
      if (sport) { section("box", "Player stats", "This season", boxFill); teamSec(); }
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
            if (!ex) { ex = { key: key, n: r.n, team: t.abbr, score: 0, bits: [], scored: false }; all.push(ex); }
            var bit = gr.k === "passing" ? n("YDS") + " pass yds" + (n("TD") ? ", " + n("TD") + " pass TD" : "") + (n("INT") ? ", " + n("INT") + " INT" : "") + (v["C/ATT"] ? " (" + v["C/ATT"] + ")" : "")
              : gr.k === "rushing" ? n("YDS") + " rush yds" + (n("TD") ? ", " + n("TD") + " rush TD" : "")
              : gr.k === "receiving" ? n("REC") + " rec, " + n("YDS") + " yds" + (n("TD") ? ", " + n("TD") + " rec TD" : "")
              : parts[0];
            if (gr.k === "passing") ex.bits.unshift(bit); else ex.bits.push(bit);
            ex.score += score; ex.scored = ex.scored || (gr.k !== "passing" && n("TD") > 0); ex.line = ex.bits.join(" · ");
            return;
          }
          all.push({ n: r.n, team: t.abbr, score: score, line: parts.join(" · "), scored: sport === "hockey" ? n("G") > 0 : false });
        });
      });
    });
    all.sort(function (a, c) { return c.score - a.score; }); if (!all.length) return null;
    var wc = gvCard("Top performers", "gv-watch");
    // the top four, plus everyone else who scored (every touchdown and goal scorer gets a line)
    var show = all.slice(0, 4).concat(all.slice(4).filter(function (w) { return w.scored; })).slice(0, 10);
    show.forEach(function (w) { var r = el("div", "pw"); r.appendChild(el("span", "pw-n", w.n)); r.appendChild(el("span", "pw-t", w.team)); r.appendChild(el("span", "pw-l", w.line)); wc.appendChild(r); });
    return wc;
  }
  // part: "recap" (after the final: the recap and top performers), "pre" (the pregame preview only), or nothing (all of it)
  function previewSections(g, pv, body, part) {
    if (part === "recap") {
      var rc0 = pv && recapOf(pv);
      if (!rc0) { var np0 = gvCard(null); var c0 = gameClaudeCtl(g); if (c0) np0.appendChild(c0); body.appendChild(np0); return; }
    } else if (!pv || !(pv.summary || (part !== "pre" && pv.recap && pv.recap.text))) { var np = gvCard(null); np.appendChild(part === "pre" ? el("p", "pv-none", "No pregame preview was written for this game.") : previewBlock(g)); body.appendChild(np); return; }
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
      var rq = withSwitch(gvCard(rc.quick ? "Box score recap" : "Recap", "gv-recap"));
      if (rcOpen) { rq.appendChild(readNode(rc.text, rc.bullets, "gv-sum", rc.quick)); }
      else rq.appendChild(recapGate(g));
      body.appendChild(rq);
    } else if (pv.summary) {
      var q = withSwitch(gvCard("The quick read")); q.appendChild(readNode(pv.summary, pv.bullets, "gv-sum"));
      body.appendChild(q);
      var qc = gameClaudeCtl(g); if (qc) body.appendChild(qc);
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
    var wl = stars.length ? stars : Array.isArray(pv.watch) ? pv.watch.filter(function (w) { return w && w.name; }) : [];
    if (wl.length) {
      var wc = gvCard(stars.length ? "Top performers" : "Players to watch", "gv-watch");
      wl.forEach(function (w) {
        var r = el("div", "pw");
        r.appendChild(el("span", "pw-n", w.name)); if (w.team) r.appendChild(el("span", "pw-t", w.team)); if (w.line) r.appendChild(el("span", "pw-l", w.line));
        if (w.note) r.appendChild(el("span", "pw-note", w.note));
        wc.appendChild(r);
      });
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

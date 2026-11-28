  // ---------- the long matchup preview (3.187.0) ----------
  // DJ (Nov 27, 2026): "Too much talk of recent results... Let's get more creative... graphics, colors and other layouts",
  // then on the mockups (Key duel dropped: "doesn't provide much"): "Needs team logos. I like pieces of both. I still need a full preview of the matchup and more
  // to read/see at once." So: a tale of the tape drawn from ESPN's game summary (logos, table spot, form, each team's
  // season leaders, past meetings), Claude's big question, a full preview in 4 storylines, both teams'
  // recent results as tiles, and what decides it. Claude writes only the words (pv.deep, worker/index.js deepOf);
  // every number, result and logo comes from ESPN. Notes: docs/pages/game.md.
  var PD_CSS =
    ".pd{padding:0;overflow:hidden}" +
    ".pd-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:12px 12px 10px}" +
    ".pd-tm{display:flex;align-items:center;gap:8px;min-width:0}.pd-tm.r{flex-direction:row-reverse;text-align:right}" +
    ".pd-tm .badge{width:38px;height:38px;flex:none}.pd-tm .badge .badge-logo{height:38px;margin-top:-19px}" +
    ".pd-tm b{display:block;font-size:16px;font-weight:800;line-height:1.15;overflow:hidden;text-overflow:ellipsis}" +
    ".pd-tm small{display:block;font-size:12px;color:var(--muted);font-weight:700}" +
    ".pd-vs{font-size:12px;color:var(--dim)}" +
    ".pd-cb{display:grid;grid-template-columns:1fr 1fr;height:3px}" +
    ".pd-row{display:grid;grid-template-columns:1fr 84px 1fr;align-items:center;gap:4px;padding:6px 12px;border-top:1px solid var(--hair);font-size:13px;min-height:32px}" +
    ".pd-row>.c{text-align:center;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em;font-stretch:85%;line-height:1.15}" +
    ".pd-row>.r{text-align:right}" +
    ".pd-row .v{font-size:17px;font-weight:800;font-stretch:80%;margin-right:6px}.pd-row>.r .v{margin:0 0 0 6px}" +
    ".pd-row .n{color:var(--muted);font-size:12.5px}" +
    ".pd-row .form{display:inline-flex;gap:3px}.pd-row .form i{width:18px;height:18px;font-size:10px}" +
    ".pd-mt{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:7px 12px;border-top:1px solid var(--hair);font-size:12.5px;color:var(--muted)}" +
    ".pd-mt b{color:var(--ink);font-size:16px;font-weight:800;font-stretch:80%}" +
    ".pd-bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--raise)}.pd-bar i{display:block}" +
    ".pd-mtl{grid-column:1/4;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em;font-stretch:85%;text-align:center;margin-bottom:-2px}" +
    ".pd-q{padding:10px 12px 12px;border-top:1px solid var(--hair)}" +
    ".pd-q span{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;font-stretch:85%}" +
    ".pd-q b{display:block;font-size:19px;line-height:1.2;font-weight:800;font-stretch:92%;margin-top:2px}" +
    ".pd-parts{padding:2px 12px}" +
    ".pd-pt{padding:10px 0;border-top:1px solid var(--hair)}.pd-pt:first-child{border-top:0}" +
    ".pd-k{display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap}" +
    ".pd-k .badge{width:20px;height:20px}.pd-k .badge .badge-logo{height:20px;margin-top:-10px}" +
    ".pd-k h4{font-size:15px;font-weight:800;margin:0;line-height:1.25}" +
    ".pd-tag{font-size:11px;font-weight:800;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em;font-stretch:85%;background:var(--raise);color:var(--ink)}" +
    ".pd-pt p{font-size:15px;line-height:1.42;margin:0;color:var(--ink)}" +
    ".pd-h{font-size:15px;font-weight:800;color:var(--head);margin:14px 0 6px}" +
    ".pd-rs{display:grid;grid-template-columns:24px 1fr;gap:6px;align-items:center;margin-top:5px}" +
    ".pd-rs>.badge{width:24px;height:24px}.pd-rs>.badge .badge-logo{height:24px;margin-top:-12px}" +
    ".pd-tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}" +
    ".pd-tile{background:var(--card);border-radius:4px;padding:4px 1px 3px;text-align:center;font-size:11px;color:var(--muted);font-stretch:85%;box-shadow:inset 0 3px 0 var(--dim)}" +
    ".pd-tile b{display:block;font-size:14px;color:var(--ink);font-weight:800;font-stretch:75%}" +
    ".pd-tile.W{box-shadow:inset 0 3px 0 #3DDC84}.pd-tile.L{box-shadow:inset 0 3px 0 var(--live)}" +
    ".pd-dec{font-size:15px;line-height:1.42;margin:0}";
  (function () { var st = document.createElement("style"); st.id = "pd-css"; st.textContent = PD_CSS; document.head.appendChild(st); })();

  var PD = { cache: {} };
  function pdLoad(g) {
    var c = PD.cache[g.id];
    if (c && (c.busy || (c.done && Date.now() - c.at < 1800000))) return c;
    c = PD.cache[g.id] = { at: Date.now(), busy: true, data: c ? c.data : null };
    bxFindEvent(g).then(function (ev) { return ev ? rkFetch(bxSummaryUrl(g.league, ev)) : null; }).then(null, function () { return null; }).then(function (j) {
      c.busy = false; c.done = true; c.at = Date.now();
      if (j) { try { c.data = pdParse(g, j); } catch (e) { c.data = null; } }
      if (state.view === "game" && state.gameId === g.id) { try { keepScroll(renderGame); } catch (e) {} }
    });
    return c;
  }
  // which side of this game an ESPN team is: by id from the header, then abbreviation, then name
  function pdSide(g, j, t) {
    t = t || {}; var cp = (((j.header || {}).competitions || [])[0] || {}).competitors || [], hit = null;
    cp.forEach(function (x) { var tm = x.team || {}; if ((t.id && tm.id === t.id) || (t.abbreviation && tm.abbreviation === t.abbreviation)) hit = x.homeAway; });
    if (hit) return hit;
    var a = String(t.abbreviation || "").toUpperCase(), n = String(t.displayName || "");
    if (a && a === abbr(g, "home") || n && n === g.home) return "home";
    if (a && a === abbr(g, "away") || n && n === g.away) return "away";
    return "";
  }
  // "Matches: 11, Goals: 4" -> "4"; "25.3" -> "25.3"; "2,345 YDS, 18 TD" -> "2,345 YDS, 18 TD"
  function pdVal(dv) { dv = String(dv || "").trim(); var m = /:\s*([\d.,]+)\s*$/.exec(dv); return m ? m[1] : dv; }
  function pdParse(g, j) {
    var d = { leaders: { away: [], home: [] }, last: { away: [], home: [] }, meet: null };
    (j.leaders || []).forEach(function (t) {
      var sd = pdSide(g, j, t.team); if (!sd) return;
      d.leaders[sd] = (t.leaders || []).map(function (c) { var l = (c.leaders || [])[0] || {}, a = l.athlete || {}; return { cat: c.shortDisplayName || c.displayName || c.name || "", key: c.name || c.displayName, name: a.displayName || "", short: a.shortName || a.displayName || "", val: pdVal(l.displayValue) }; })
        .filter(function (x) { return x.name && x.val; });
    });
    var gd = (((j.header || {}).competitions || [])[0] || {}).date || g.start;
    (j.lastFiveGames || []).forEach(function (t) {
      var sd = pdSide(g, j, t.team), tid = (t.team || {}).id; if (!sd) return;
      d.last[sd] = l5Season(t.events, gd).reverse().slice(0, 5).map(function (e) {
        var o = e.opponent || {}, mine = e.homeTeamId === tid ? e.homeTeamScore : e.awayTeamScore, theirs = e.homeTeamId === tid ? e.awayTeamScore : e.homeTeamScore;
        var sc = mine != null && theirs != null && mine !== "" ? mine + "-" + theirs : String(e.score || "");
        return { res: e.gameResult || "", at: e.atVs === "@", opp: o.abbreviation || "", oppName: o.displayName || "", score: sc };
      });
    });
    var ss = (j.seasonseries || [])[0];
    if (ss && Array.isArray(ss.events)) {
      var m = { away: 0, home: 0, draw: 0, n: 0, label: ss.shortSummary || ss.seriesLabel || "Season series" };
      ss.events.forEach(function (e) {
        if (!e || (e.statusType && !e.statusType.completed) || e.status && e.status !== "post") return;
        var w = (e.competitors || []).filter(function (x) { return x.winner; })[0]; m.n++;
        if (!w) { m.draw++; return; } var sd = pdSide(g, j, w.team); if (sd) m[sd]++;
      });
      if (m.n) d.meet = m;
    }
    return d;
  }
  function pdBadge(g, sd) { return badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]); }
  function pdColors(g) { var pc = {}; try { pc = pairColors(g); } catch (e) {} return { away: hexOk(pc.away) ? pc.away : "var(--hair)", home: hexOk(pc.home) ? pc.home : "var(--hair)" }; }
  // the tale of the tape: logos, table spot and record, form, the categories both teams have leaders in, past meetings
  function pdTape(g, pv, d, dp) {
    var so = sideOrder(g), tc = pdColors(g), box = el("div");
    var top = el("div", "pd-top");
    so.forEach(function (sd, i) {
      var t = el("div", "pd-tm" + (i ? " r" : "")), tx = el("div"); t.appendChild(pdBadge(g, sd));
      tx.appendChild(el("b", null, short(g, sd)));
      var sub = [g[sd + "Rank"] ? "No. " + g[sd + "Rank"] : "", g[sd + "Standing"] || "", g[sd + "Record"] || ""].filter(Boolean).join(" · ");
      if (sub) tx.appendChild(el("small", null, sub)); t.appendChild(tx); top.appendChild(t);
      if (!i) top.appendChild(el("span", "pd-vs", homeFirst(g) ? "vs" : "at"));
    });
    box.appendChild(top);
    var cb = el("div", "pd-cb"); so.forEach(function (sd) { var i = el("i"); i.style.background = tc[sd]; cb.appendChild(i); }); box.appendChild(cb);
    var row = function (label, l, r) { var rw = el("div", "pd-row"), a = el("div"), c = el("div", "c", label), b = el("div", "r"); if (l) a.appendChild(l); if (r) b.appendChild(r); rw.appendChild(a); rw.appendChild(c); rw.appendChild(b); box.appendChild(rw); };
    var form = function (sd) { var f = d && d.last[sd].length ? d.last[sd].map(function (x) { return x.res; }).join("") : (pv.last5 || {})[sd]; return f ? formDots(f) : null; };   // newest first, like the results tiles
    if (form(so[0]) || form(so[1])) row("Form", form(so[0]), form(so[1]));
    if (d) {
      var cats = d.leaders[so[0]].filter(function (x) { return d.leaders[so[1]].some(function (y) { return y.key === x.key; }); }).slice(0, 3);
      cats.forEach(function (x) {
        var y = d.leaders[so[1]].filter(function (z) { return z.key === x.key; })[0];
        var l = el("span"); l.appendChild(el("span", "v", x.val)); l.appendChild(el("span", "n", x.short));
        var r = el("span"); r.appendChild(el("span", "n", y.short)); r.appendChild(el("span", "v", y.val));
        row(x.cat, l, r);
      });
      if (d.meet) {
        var m = d.meet, mt = el("div", "pd-mt"), bar = el("div", "pd-bar");
        mt.appendChild(el("span", "pd-mtl", m.label));
        var side = function (sd) { var s = el("span"); s.appendChild(el("b", null, String(m[sd]))); s.appendChild(document.createTextNode(m[sd] === 1 ? " win" : " wins")); return s; };
        [[so[0], tc[so[0]]], ["draw", "var(--dim)"], [so[1], tc[so[1]]]].forEach(function (p) { if (!m[p[0]]) return; var i = el("i"); i.style.flex = m[p[0]]; i.style.background = p[1]; bar.appendChild(i); });
        mt.appendChild(side(so[0])); mt.appendChild(bar); var r2 = side(so[1]); r2.style.textAlign = "right"; mt.appendChild(r2);
        if (m.draw) { var dr = el("span", "pd-mtl", m.draw + (m.draw === 1 ? " draw" : " draws")); dr.style.marginTop = "-2px"; mt.appendChild(dr); }
        box.appendChild(mt);
      }
    }
    if (dp.question) { var q = el("div", "pd-q"); q.appendChild(el("span", null, "The big question")); q.appendChild(el("b", null, dp.question)); box.appendChild(q); }
    return box;
  }
  // the whole long preview
  // DJ (Nov 27): "If there isn't enough for a matchup for a full preview like this, then have a simple version just based
  // on data": with no parts (no preview written yet, or Claude found nothing worth a storyline) it's the tape and the results only
  function pdBlock(g, pv) {
    var dp = (pv && pv.deep) || {}, full = Array.isArray(dp.parts) && dp.parts.length > 0;
    if (!full && g.custom) return null;
    var c = pdLoad(g), d = c.data, tc = pdColors(g), wrap = el("div", "pd-wrap");
    if (!full && !d) return null;   // nothing from ESPN yet: the page redraws when it arrives
    if (!full && d && !d.last.away.length && !d.last.home.length && !d.leaders.away.length && !d.leaders.home.length) return null;
    var card = gvCard(null, "pd"); card.appendChild(pdTape(g, pv || {}, d, dp)); wrap.appendChild(card);
    if (full) {
      wrap.appendChild(el("h3", "pd-h", "The preview"));
      var pc = gvCard(null, "pd"), parts = el("div", "pd-parts");
      dp.parts.forEach(function (p) {
        var pt = el("div", "pd-pt"), k = el("div", "pd-k");
        if (p.side === "home" || p.side === "away") k.appendChild(pdBadge(g, p.side));
        if (p.tag) { var tg = el("span", "pd-tag", p.tag); if (p.side && hexOk(tc[p.side])) { tg.style.background = tc[p.side]; tg.style.color = lum(tc[p.side]) > 0.55 ? "#111" : "#fff"; } k.appendChild(tg); }
        k.appendChild(el("h4", null, p.title)); pt.appendChild(k); pt.appendChild(el("p", null, p.text)); parts.appendChild(pt);
      });
      pc.appendChild(parts); wrap.appendChild(pc);
    }
    if (d && (d.last.away.length || d.last.home.length)) {
      wrap.appendChild(el("h3", "pd-h", "Recent results"));
      sideOrder(g).forEach(function (sd) {
        if (!d.last[sd].length) return;
        var rs = el("div", "pd-rs"), tl = el("div", "pd-tiles"); rs.appendChild(pdBadge(g, sd));
        d.last[sd].forEach(function (x) { var t = el("div", "pd-tile " + x.res); t.appendChild(el("b", null, x.score)); t.appendChild(document.createTextNode((x.at ? "@ " : "") + x.opp)); t.title = x.oppName; tl.appendChild(t); });
        rs.appendChild(tl); wrap.appendChild(rs);
      });
      var nt = el("p", "pv-at", "Newest first. From ESPN."); nt.style.marginTop = "4px"; wrap.appendChild(nt);
    }
    if (dp.decides) { wrap.appendChild(el("h3", "pd-h", "What decides it")); wrap.appendChild(el("p", "pd-dec", dp.decides)); }
    if (full) { var st = clStamp(pvAt(pv)); if (st) wrap.appendChild(st); }
    return wrap;
  }

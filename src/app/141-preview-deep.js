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
    ".pd-row{display:grid;grid-template-columns:1fr 64px 1fr;align-items:center;gap:4px;padding:6px 12px;border-top:1px solid var(--hair);font-size:13px;min-height:32px}" +
    ".pd-row>.c{text-align:center;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em;font-stretch:85%;line-height:1.15}" +
    ".pd-row>.r{text-align:right}" +
    ".pd-row .v{font-size:17px;font-weight:800;font-stretch:80%;margin-right:6px}.pd-row>.r .v{margin:0 0 0 6px}" +
    ".pd-row .n{color:var(--muted);font-size:12.5px}" +
    ".pd-pl{display:flex;align-items:center;gap:7px;min-width:0}.pd-pl.r{flex-direction:row-reverse;text-align:right}" +
    ".pd-face{position:relative;width:36px;height:36px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center;background:var(--raise)}" +
    ".pd-face i{font-style:normal;font-size:12px;font-weight:800;color:#fff}.pd-face img{position:absolute;left:-4px;bottom:0;width:44px;height:auto;opacity:0}.pd-face.ok img{opacity:1}.pd-face.ok i{display:none}" +
    ".pd-tpic{width:40px!important;height:40px!important;align-self:center}.pd-tpic .badge-logo{height:40px;margin-top:-20px}" +
    ".pd-pn{display:flex;flex-direction:column;min-width:0;line-height:1.15}.pd-pn b{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".pd-pn .v{font-size:19px;font-weight:800;font-stretch:78%;margin:1px 0 0}.pd-row>.r .pd-pn .v{margin:1px 0 0}" +
    ".pd-row .form{display:inline-flex;gap:3px}.pd-row .form i{width:18px;height:18px;font-size:10px}" +
    ".pd-mt{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:7px 12px;border-top:1px solid var(--hair);font-size:12.5px;color:var(--muted)}" +
    ".pd-mt b{color:var(--ink);font-size:16px;font-weight:800;font-stretch:80%}" +
    ".pd-bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--raise)}.pd-bar i{display:block}" +
    ".pd-mtl{grid-column:1/4;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em;font-stretch:85%;text-align:center;margin-bottom:-2px}" +
    ".pd-lead{margin:2px 0 10px}" +
    ".pd-lead span{display:block;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;font-stretch:85%;font-weight:800}" +
    ".pd-lead b{display:block;font-size:22px;line-height:1.18;font-weight:800;font-stretch:92%;margin-top:3px}" +
    ".pd-parts{padding:2px 12px}" +
    ".pd-pt{padding:10px 0;border-top:1px solid var(--hair)}.pd-pt:first-child{border-top:0}" +
    ".pd-k{display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap}" +
    ".pd-k .badge{width:20px;height:20px}.pd-k .badge .badge-logo{height:20px;margin-top:-10px}" +
    ".pd-k h4{font-size:15px;font-weight:800;margin:0;line-height:1.25;flex:1;min-width:0}" +
    ".pd-k .pd-ft{flex:none;align-self:flex-start}" +
    ".pd-pt p{font-size:15px;line-height:1.42;margin:0;color:var(--ink)}" +
    ".pd-h{font-size:15px;font-weight:800;color:var(--head);margin:14px 0 6px}" +
    ".pd-rs{display:grid;grid-template-columns:24px 1fr;gap:6px;align-items:center;margin-top:5px}" +
    ".pd-rs>.badge{width:24px;height:24px}.pd-rs>.badge .badge-logo{height:24px;margin-top:-12px}" +
    ".pd-tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}" +
    ".pd-tile{background:var(--card);border-radius:4px;padding:4px 1px 3px;text-align:center;font-size:11px;color:var(--muted);font-stretch:85%;box-shadow:inset 0 3px 0 var(--dim)}" +
    ".pd-tile b{display:block;font-size:14px;color:var(--ink);font-weight:800;font-stretch:75%}" +
    ".pd-tile.W{box-shadow:inset 0 3px 0 #3DDC84}.pd-tile.L{box-shadow:inset 0 3px 0 var(--live)}" +
    ".pg-sb{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;padding:12px 12px 6px}" +
    ".pg-sb .pd-tm{gap:6px}.pg-sb .pd-tm>div{min-width:0;flex:1}" +
    ".pg-sc{font-size:32px;font-weight:800;font-stretch:72%;line-height:1}.pg-sb .lo b,.pg-sb .lo .pg-sc{color:var(--muted)}" +
    ".pg-ls{display:grid;align-items:center;row-gap:2px;padding:2px 12px 8px;font-size:12.5px;color:var(--muted);text-align:center}" +
    ".pg-ls b{color:var(--ink);font-weight:800}.pg-ls .h{color:var(--dim);font-size:10.5px}.pg-ls .a{text-align:left;font-weight:800;font-stretch:85%}" +
    ".pg-st{display:grid;grid-template-columns:56px 1fr 56px;align-items:center;gap:8px;padding:5px 12px 7px;border-top:1px solid var(--hair)}" +
    ".pg-st .c{grid-column:1/4;text-align:center;font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.05em;font-stretch:85%;margin-bottom:-4px}" +
    ".pg-st b{font-size:16px;font-weight:800;font-stretch:80%}.pg-st b.r{text-align:right}.pg-st b.lo{color:var(--muted)}" +
    ".pg-bar{display:flex;gap:2px;height:6px;border-radius:3px;overflow:hidden}.pg-bar i{display:block}" +
    ".pd-dec{font-size:15px;line-height:1.42;margin:0}";
  (function () { var st = document.createElement("style"); st.id = "pd-css"; st.textContent = PD_CSS; document.head.appendChild(st); })();

  var PD = { cache: {} };
  function pdLoad(g) {
    var c = PD.cache[g.id];
    var ov = status(g).kind === "over";   // a copy from before the final whistle is fetched again for the box score
    if (c && (c.busy || (c.done && Date.now() - c.at < (ov && !(c.data && c.data.fin) ? 60000 : 1800000)))) return c;
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
  // DJ (Nov 28, football): "too much focus on player stats and not the player headshots and names. Highlighting their
  // specific stat, not necessarily showing them all": one number per leader ("282/380, 3,095 YDS, 29 TD, 6 INT" -> "3,095")
  var PD_CAT = { passingYards: "Pass yds", rushingYards: "Rush yds", receivingYards: "Rec yds", totalTackles: "Tackles", sacks: "Sacks", interceptions: "Interceptions" };
  function pdKeyVal(name, dv) {
    dv = String(dv || "").trim(); var parts = dv.split(/,\s+(?=[\d.])/);
    if (/Yards$/.test(name || "")) { var y = parts.filter(function (x) { return / YDS$/.test(x); })[0]; if (y) return y.replace(/ YDS$/, ""); }
    var v = pdVal(parts.length > 1 ? parts[0] : dv); return v.length > 9 ? v.split(/[, ]/)[0] : v;
  }
  function pdFace(x, sd, g) {
    var f = el("span", "pd-face"); var c1 = pdColors(g)[sd]; if (hexOk(c1)) f.style.background = c1;
    var ini = String(x.name || "").split(" ").filter(Boolean); f.appendChild(el("i", null, ((ini[0] || "")[0] || "") + ((ini[ini.length - 1] || "")[0] || "")));
    var m = /^https:\/\/a\.espncdn\.com(\/i\/headshots\/[\w/.-]+\.png)$/.exec(x.head || "");
    if (m) { var im = document.createElement("img"); im.alt = ""; im.decoding = "async"; im.onload = function () { f.classList.add("ok"); }; im.onerror = function () { im.remove(); }; im.src = "https://a.espncdn.com/combiner/i?img=" + m[1] + "&w=96&h=70"; f.appendChild(im); }
    return f;
  }
  function pdParse(g, j) {
    var d = { leaders: { away: [], home: [] }, last: { away: [], home: [] }, meet: null };
    (j.leaders || []).forEach(function (t) {
      var sd = pdSide(g, j, t.team); if (!sd) return;
      d.leaders[sd] = (t.leaders || []).map(function (c) { var l = (c.leaders || [])[0] || {}, a = l.athlete || {}; return { cat: PD_CAT[c.name] || c.shortDisplayName || c.displayName || c.name || "", key: c.name || c.displayName, name: a.displayName || "", short: a.shortName || a.displayName || "", val: pdKeyVal(c.name, l.displayValue), head: ((a.headshot || {}).href) || "" }; })
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
    // after the game (3.189.0): the score, each period, the records, and the team stats from the box score
    var cp0 = (((j.header || {}).competitions || [])[0] || {});
    d.fin = !!(((cp0.status || {}).type || {}).completed);
    d.score = { away: null, home: null }; d.lines = { away: [], home: [] }; d.rec = { away: "", home: "" }; d.stats = { away: {}, home: {} };
    (cp0.competitors || []).forEach(function (x) { var sd = x.homeAway; if (sd !== "away" && sd !== "home") return; d.score[sd] = x.score; d.lines[sd] = (x.linescores || []).map(function (l) { return l.displayValue != null ? l.displayValue : l.value; }); d.rec[sd] = ((x.record || [])[0] || {}).summary || ""; });
    ((j.boxscore || {}).teams || []).forEach(function (t) { var sd = pdSide(g, j, t.team); if (!sd) return; (t.statistics || []).forEach(function (x) { if (x && x.name) d.stats[sd][x.name] = { label: x.label, v: x.displayValue }; }); });
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
        var pl = function (p, sd, right) { var w = el("span", "pd-pl" + (right ? " r" : "")); w.appendChild(pdFace(p, sd, g)); var t = el("span", "pd-pn"); t.appendChild(el("b", null, p.short)); t.appendChild(el("span", "v", p.val)); w.appendChild(t); return w; };
        row(x.cat, pl(x, so[0]), pl(y, so[1], true));
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
    return box;
  }
  // the whole long preview
  // DJ (Nov 28): "use the same exact designs as used elsewhere in the app. Like tags and emojis": Claude's tag word gets
  // the emoji the slate and Live feed use for that kind of story
  var PD_EMOJI = [[/turning|swing|run\b|comeback|rally/i, "🔥"], [/standout|star|career|record|milestone|hat/i, "⭐"], [/finish|clutch|late|buzzer|winner/i, "⏱️"], [/defen|lockdown|clean sheet|shutout/i, "🔒"],
    [/stake|table|standing|playoff|race|seed/i, "🏆"], [/pressure|crisis|hot seat|coach|manager/i, "😬"], [/old club|old team|return|reunion|homecoming/i, "↩️"], [/tactic|style|scheme|matchup/i, "🧠"],
    [/injur|absen|out\b|health/i, "🩹"], [/rival|derby/i, "⚔️"], [/form|streak|slump|skid/i, "📈"], [/stat|number|shoot|glass|turnover/i, "🎯"], [/collapse|gave it|mistake|error/i, "💥"], [/debut|rookie|young/i, "🌱"]];
  function pdTagText(t) { var e = ""; PD_EMOJI.some(function (x) { if (x[0].test(t)) { e = x[1]; return true; } return false; }); return (e ? e + " " : "") + t; }
  // Players to watch, drawn exactly like Top performers. The line is ESPN's season numbers (PW.line, pwFill), the tag says
  // why (a team lead from pwNote), and the position comes from ESPN's leaders when the player is one of them
  function pdWatch(g, wl, d) {
    var sport = BX_SPORT[g.league] || "", wc = gvCard("Players to watch", "gv-watch"), jers = {};
    try { jers = tpJerseys(g); } catch (e) {}
    wl.forEach(function (w) {
      var k = pwKey(w.name), ln = PW.line[g.id + "|" + k] || (/\d/.test(w.line || "") ? w.line : ""), nt = "";
      try { nt = pwNote(g, w) || ""; } catch (e) {}
      var lead = /^Leads (?:the )?.+? in (.+)$/i.exec(nt), tags = lead ? [{ t: "👑 Most " + lead[1].replace(/ and /, " & "), c: "good" }] : nt ? [{ t: nt, c: "" }] : [];
      tpRowSafe(wc, g, sport, { n: w.name, team: w.team, line: ln, tags: tags }, jers);
      // DJ (Nov 28): "Need either team logos or player headshots": ESPN's headshot when the player is one of its leaders, else the team logo
      var row = wc.lastChild, sd = tpSide(g, w.team), hd = "";
      if (d) ["away", "home"].forEach(function (s2) { d.leaders[s2].forEach(function (x) { if (!hd && pwKey(x.name) === k && x.head) hd = x.head; }); });
      if (row && row.firstChild && sd) { var pic = hd ? pdFace({ name: w.name, head: hd }, sd, g) : pdBadge(g, sd); pic.classList.add("pd-tpic"); row.replaceChild(pic, row.firstChild); }
    });
    return wc;
  }
  function tpRowSafe(box, g, sport, w, jers) { try { box.appendChild(tpRow(g, sport, w, jers)); } catch (e) { box.appendChild(pwRow(g, { name: w.n, team: w.team, line: w.line }, true)); } }
  // the storyline leads the whole block (DJ, Nov 28: "Add the storyline to the very top")
  function pdLead(label, text) { var q = el("div", "pd-lead"); q.appendChild(el("span", null, label)); q.appendChild(el("b", null, text)); return q; }
  function pdParts(g, list, tc) {
    var pc = gvCard(null, "pd"), parts = el("div", "pd-parts");
    list.forEach(function (p) {
      var pt = el("div", "pd-pt"), k = el("div", "pd-k");
      if (p.side === "home" || p.side === "away") k.appendChild(pdBadge(g, p.side));
      k.appendChild(el("h4", null, p.title));
      if (p.tag) k.appendChild(el("span", "fd-tag hot pd-ft", pdTagText(p.tag)));   // the Live feed's and Top performers' pill tags (DJ, Nov 28)
      pt.appendChild(k); pt.appendChild(el("p", null, p.text)); parts.appendChild(pt);
    });
    pc.appendChild(parts); return pc;
  }
  // DJ (Nov 27): "If there isn't enough for a matchup for a full preview like this, then have a simple version just based
  // on data": with no parts (no preview written yet, or Claude found nothing worth a storyline) it's the tape and the results only
  function pdBlock(g, pv) {
    var dp = (pv && pv.deep) || {}, full = Array.isArray(dp.parts) && dp.parts.length > 0;
    if (!full && g.custom) return null;
    var c = pdLoad(g), d = c.data, tc = pdColors(g), wrap = el("div", "pd-wrap");
    if (!full && !d) return null;   // nothing from ESPN yet: the page redraws when it arrives
    if (!full && d && !d.last.away.length && !d.last.home.length && !d.leaders.away.length && !d.leaders.home.length) return null;
    if (full && dp.question) wrap.appendChild(pdLead("The big question", dp.question));
    var card = gvCard(null, "pd"); card.appendChild(pdTape(g, pv || {}, d, dp)); wrap.appendChild(card);
    if (full) {
      wrap.appendChild(el("h3", "pd-h", "The preview"));
      wrap.appendChild(pdParts(g, dp.parts, tc));
      // DJ (Nov 28): "Remove players to watch and work it into the new preview", then "just doesn't match up with other
      // designs": the Top performers card and rows (tpRow: team-color edge, jersey, name, position chip, team, line, pill tag)
      var wl = pwList(g, pv, []);
      if (wl.length) wrap.appendChild(pdWatch(g, wl, d));
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
    if (full) { var st = gameStamp(g, pvAt(pv), false, true); if (st) wrap.appendChild(st); }
    return wrap;
  }

  // ---------- after the game (3.189.0) ----------
  // DJ (Nov 28): "In the same way we have a new preview format and design, I want to do the same for post game", then on
  // the mockup: "Postgame should include top performers. Remove the win chart" (it was confusing). So: the scoreboard (logos,
  // final, line score), five team stats side by side as bars in team colors, Claude's headline, top performers (ESPN's box),
  // how it was won in up to 4 parts, what it means. No Claude recap yet, or one without parts: the data-only version.
  // each sport's five team stats: [ESPN stat name(s), our label, lower is better]
  var PG_STATS = {
    bball: [["fieldGoalPct", "Field goal %"], ["threePointFieldGoalPct", "3-point %"], ["totalRebounds", "Rebounds"], ["assists", "Assists"], [["totalTurnovers", "turnovers"], "Turnovers", 1]],
    soccer: [["possessionPct", "Possession %"], ["totalShots", "Shots"], ["shotsOnTarget", "On target"], ["wonCorners", "Corners"], ["foulsCommitted", "Fouls", 1]],
    football: [["totalYards", "Total yards"], ["netPassingYards", "Passing yards"], ["rushingYards", "Rushing yards"], ["thirdDownEff", "Third downs"], ["turnovers", "Turnovers", 1]],
    hockey: [["shotsTotal", "Shots"], ["powerPlayGoals", "Power play goals"], ["faceoffPercent", "Faceoff %"], ["hits", "Hits"], ["blockedShots", "Blocked shots"]],
    baseball: [["hits", "Hits"], ["homeRuns", "Home runs"], ["walks", "Walks"], ["strikeouts", "Strikeouts"], ["errors", "Errors", 1]]
  };
  // "7-14" -> 0.5 (made of tried), "29.8" -> 29.8, "4-25" style penalties are left out by the lists above
  function pgNum(v) { v = String(v == null ? "" : v); var m = /^(\d+)[-/](\d+)$/.exec(v); if (m) return +m[2] ? +m[1] / +m[2] : 0; var x = parseFloat(v.replace(/,/g, "")); return isNaN(x) ? null : x; }
  function pgTape(g, d, rc) {
    var so = sideOrder(g), tc = pdColors(g), box = el("div"), win = null;
    var sa = parseFloat(d.score.away), sh = parseFloat(d.score.home); if (!isNaN(sa) && !isNaN(sh) && sa !== sh) win = sa > sh ? "away" : "home";
    var top = el("div", "pg-sb");
    so.forEach(function (sd, i) {
      var t = el("div", "pd-tm" + (i ? " r" : "") + (win && win !== sd ? " lo" : "")), tx = el("div"); t.appendChild(pdBadge(g, sd));
      tx.appendChild(el("b", null, short(g, sd))); var rec = d.rec[sd] || g[sd + "Record"] || ""; if (rec) tx.appendChild(el("small", null, rec));
      t.appendChild(tx); t.appendChild(el("span", "pg-sc", d.score[sd] != null ? String(d.score[sd]) : "")); top.appendChild(t);
      if (!i) top.appendChild(el("span", "pd-vs", "Final"));
    });
    box.appendChild(top);
    var n = Math.max(d.lines.away.length, d.lines.home.length);
    if (n > 1 && n <= 12) {
      var ls = el("div", "pg-ls"); ls.style.gridTemplateColumns = "48px repeat(" + n + ",1fr) 40px";
      var sp = BX_SPORT[g.league], reg = sp === "soccer" ? 2 : sp === "hockey" ? 3 : sp === "baseball" ? 99 : /ncaam/.test(g.league) ? 2 : 4, hd = [""];
      for (var i = 1; i <= n; i++) hd.push(i <= reg ? (sp === "soccer" ? (i === 1 ? "1st" : "2nd") : String(i)) : sp === "hockey" && i === n && i > 4 ? "SO" : sp === "soccer" ? "ET" : "OT");
      hd.push("T");
      hd.forEach(function (h) { ls.appendChild(el("span", "h", h)); });
      so.forEach(function (sd) {
        var other = sd === "home" ? "away" : "home";
        ls.appendChild(el("span", "a", abbr(g, sd)));
        for (var k = 0; k < n; k++) { var v = d.lines[sd][k], o = d.lines[other][k]; ls.appendChild(el(parseFloat(v) > parseFloat(o) ? "b" : "span", null, v == null ? "" : String(v))); }
        ls.appendChild(el(win === sd ? "b" : "span", null, d.score[sd] != null ? String(d.score[sd]) : ""));
      });
      box.appendChild(ls);
    }
    var cb = el("div", "pd-cb"); so.forEach(function (sd) { var i2 = el("i"); i2.style.background = tc[sd]; cb.appendChild(i2); }); box.appendChild(cb);
    (PG_STATS[BX_SPORT[g.league]] || []).forEach(function (st) {
      var names = Array.isArray(st[0]) ? st[0] : [st[0]], key = names.filter(function (k) { return d.stats.away[k] && d.stats.home[k]; })[0]; if (!key) return;
      var va = d.stats[so[0]][key].v, vb = d.stats[so[1]][key].v, na = pgNum(va), nb = pgNum(vb); if (na == null || nb == null) return;
      var better = na === nb ? "" : (na > nb) !== !!st[2] ? "a" : "b";
      var row = el("div", "pg-st"); row.appendChild(el("span", "c", st[1]));
      row.appendChild(el("b", better === "b" ? "lo" : null, va));
      var bar = el("div", "pg-bar"), tot = Math.abs(na) + Math.abs(nb) || 1;
      [[na, tc[so[0]]], [nb, tc[so[1]]]].forEach(function (p) { var i3 = el("i"); i3.style.flex = String(Math.max(0.02, Math.abs(p[0]) / tot)); i3.style.background = p[1]; bar.appendChild(i3); });
      row.appendChild(bar); row.appendChild(el("b", "r" + (better === "a" ? " lo" : ""), vb)); box.appendChild(row);
    });
    return box;
  }
  // the whole post-game block, or null (ESPN's data hasn't come: the old recap shows meanwhile). stars: the top performers node
  function pgBlock(g, pv, stars, rcNode) {
    var c = pdLoad(g), d = c.data; if (!d || !d.fin || d.score.away == null) return null;
    var rc = pv && recapOf(pv), dp = rc && rc.deep, full = !!(dp && Array.isArray(dp.parts) && dp.parts.length) && recapShown(g), tc = pdColors(g), wrap = el("div", "pd-wrap");
    if (full && dp.question) wrap.appendChild(pdLead("The story", dp.question));
    var card = gvCard(null, "pd"); card.appendChild(pgTape(g, d, full ? rc : null)); wrap.appendChild(card);
    if (stars) wrap.appendChild(stars);
    if (full) { wrap.appendChild(el("h3", "pd-h", "How it was won")); wrap.appendChild(pdParts(g, dp.parts, tc)); }
    else if (rcNode) wrap.appendChild(rcNode);   // a recap written before 3.189.0 (its paragraph, as before), Claude's button, or the tap to show it
    if (full && dp.decides) { wrap.appendChild(el("h3", "pd-h", "What it means")); wrap.appendChild(el("p", "pd-dec", dp.decides)); }
    if (full) { var st = gameStamp(g, pvAt(pv, rc), true, true); if (st) wrap.appendChild(st); }
    return wrap;
  }

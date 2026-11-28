  // ---------- the quick look for a finished game (3.192.0) ----------
  // DJ (Nov 28, 2026): the old quick look ("Recap", "Top performers", "Match summary" drop-downs) was "too much within a short
  // game preview" and repeated the full matchup page. A finished game's quick look is now one line on how it was won, the
  // betting result, and a small snapshot that depends on the sport. DJ picked each sport's snapshot from mockups:
  //   football: "Player of the game" (one big card, two small ones), soccer: goal scorers with minutes plus possession,
  //   shots and shots on target. The other sports keep the old drop-downs until DJ picks theirs.
  // Everything comes from ESPN's game summary the quick look already loads (bx.live[id].sum); nothing is estimated.
  var QL_CSS =
    ".qlf{display:block}.qlf .ql-line{font-size:15px;line-height:1.38;color:var(--ink);margin:2px 0 8px}" +
    ".ql-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}" +
    ".ql-chip{font-size:13px;font-weight:800;line-height:1;padding:7px 9px;border-radius:6px;background:var(--raise);color:var(--ink)}" +
    ".ql-chip.ok{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}" +
    ".ql-hero{display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;border:1px solid var(--hair);background:linear-gradient(90deg,color-mix(in srgb,var(--qc) 55%,transparent),var(--bg))}" +
    ".ql-hero .pd-face{width:60px;height:60px}.ql-hero .pd-face img{width:72px;left:-6px}.ql-hero .pd-face i{font-size:18px}" +
    ".ql-hero .k{display:block;font-size:11px;font-weight:800;color:var(--accent);letter-spacing:.08em;text-transform:uppercase;font-stretch:85%}" +
    ".ql-hero b{display:block;font-size:19px;font-weight:800;line-height:1.15}.ql-hero p{margin:2px 0 0;font-size:14px;color:var(--head)}" +
    ".ql-mini{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:8px}" +
    ".ql-mini>div{display:flex;align-items:center;gap:8px;min-width:0;padding:6px 8px;border-radius:8px;border:1px solid var(--hair);background:var(--bg)}" +
    ".ql-mini .pd-face{width:32px;height:32px}.ql-mini .pd-face img{width:40px}.ql-mini span{min-width:0}" +
    ".ql-mini em{display:block;font-style:normal;font-size:10.5px;font-weight:800;color:var(--dim);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}" +
    ".ql-mini b{display:block;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ql-mini small{display:block;font-size:12.5px;color:var(--muted);white-space:nowrap}" +
    ".ql-gs{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}" +
    ".ql-gs p{margin:0;font-size:14px;line-height:1.5;font-weight:800;white-space:nowrap}.ql-gs p span{color:var(--muted);font-weight:700}.ql-gs .r{text-align:right}" +
    ".qlf .pg-st{padding:5px 0 6px;border-top:0;grid-template-columns:44px 1fr 44px}.qlf .pg-st.none .pg-bar{height:2px;background:var(--hair)}";
  (function () { var st = document.createElement("style"); st.id = "ql-css"; st.textContent = QL_CSS; document.head.appendChild(st); })();

  var QL_SPORTS = { football: 1, soccer: 1 };   // the sports DJ has picked a design for so far
  function qlFinal(g, b) {
    var sport = BX_SPORT[g.league] || "", cur = bx.live[g.id], sum = cur && cur.sum;
    if (!QL_SPORTS[sport] || !b || b.state !== "post" || !sum) return null;
    var d; try { d = pdParse(g, sum); } catch (e) { return null; }
    var sa = parseFloat(d.score.away), sh = parseFloat(d.score.home); if (isNaN(sa) || isNaN(sh)) return null;
    var win = sa === sh ? "" : sa > sh ? "away" : "home";
    var snap = sport === "football" ? qlPotg(g, b, sum, win) : qlSoccer(g, b, d);
    if (!snap) return null;
    var wrap = el("div", "qlf");
    var line = qlLine(g, d, b, win, sport); if (line) wrap.appendChild(el("p", "ql-line", line));
    var chips = qlBets(g, b, sa, sh); if (chips) wrap.appendChild(chips);
    wrap.appendChild(snap);
    return wrap;
  }
  // the one line: Claude's recap headline when someone has had Claude write it, else a line from the score by period
  function qlLine(g, d, b, win, sport) {
    var rc = ((state.previews || {})[g.id] || {}).recap, hd = rc && rc.deep && rc.deep.question;
    if (hd) return String(hd);
    if (!win) return "";
    var lose = win === "home" ? "away" : "home", W = short(g, win), L = short(g, lose);
    if (sport === "soccer") {
      var ids = {}; (b.teams || []).forEach(function (t) { ids[t.side] = t.id; });
      var sc = { away: 0, home: 0 }, first = null, trailed = false;
      (b.ev || []).forEach(function (e) {
        if (e.k !== "goal" && e.k !== "pen" && e.k !== "og") return;
        var sd = e.tid === ids.home ? "home" : e.tid === ids.away ? "away" : ""; if (!sd) return;
        sc[sd]++; if (!first) first = { sd: sd, m: e.m };
        if (sc[lose] > sc[win]) trailed = true;
      });
      if (!first) return "";
      if (trailed) return W + " came from behind to win.";
      if (first.sd === win && sc[lose] === 0) return W + " scored in the " + qlOrd(parseInt(first.m, 10)) + " minute and kept a clean sheet.";
      if (first.sd === win) return W + " scored in the " + qlOrd(parseInt(first.m, 10)) + " minute and never trailed.";
      return "";
    }
    var la = d.lines[win].map(Number), lb = d.lines[lose].map(Number), reg = 4;
    if (la.length < 2 || la.some(isNaN) || lb.some(isNaN)) return "";
    if (la.length > reg) return W + " won in overtime.";
    var sumTo = function (a, i, j) { var s = 0; for (var k = i; k < j; k++) s += a[k] || 0; return s; };
    var hW = sumTo(la, 0, 2), hL = sumTo(lb, 0, 2), sW = sumTo(la, 2, la.length), sL = sumTo(lb, 2, lb.length);
    if (hW < hL) return W + " scored " + sW + " second-half points after trailing " + hL + "-" + hW + " at the break.";
    if (hW === hL) return W + " broke a " + hW + "-" + hL + " halftime tie, outscoring " + L + " " + sW + "-" + sL + " after the break.";
    return W + " led " + hW + "-" + hL + " at the half and " + (sW >= sL ? "pulled away." : "held on.");
  }
  function qlOrd(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  // the betting result: which side covered the pregame spread, and whether the total went over or under
  function qlBets(g, b, sa, sh) {
    var pv = (state.previews || {})[g.id] || {}, o = (pv.odds && (pv.odds.spread || pv.odds.total)) ? pv.odds : (b.odds && (b.odds.spread || b.odds.total)) ? b.odds : null;
    if (!o) return null;
    var w = el("div", "ql-chips"), chip = function (t, ok) { w.appendChild(el("span", "ql-chip" + (ok ? " ok" : ""), t)); };
    var m = /^([A-Z0-9&]{2,6})\s*([-+]?\d+(?:\.\d+)?)$/.exec(String(o.spread || "").trim());
    if (m) {
      var fav = ["away", "home"].filter(function (sd) { return String(abbr(g, sd)).toUpperCase() === m[1] || String(g[sd + "Abbr"] || "").toUpperCase() === m[1]; })[0];
      if (fav) {
        var dog = fav === "home" ? "away" : "home", ln = parseFloat(m[2]), sc = { away: sa, home: sh }, net = sc[fav] - sc[dog] + ln;
        var fmt = function (x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x); };
        if (net > 0) chip("✓ " + abbr(g, fav) + " " + fmt(ln) + " covered", true);
        else if (net < 0) chip("✓ " + abbr(g, dog) + " " + fmt(-ln) + " covered", true);
        else chip(abbr(g, fav) + " " + fmt(ln) + " push");
      }
    } else if (/^(even|pk|pick)/i.test(String(o.spread || ""))) chip("Pick'em");
    var tot = parseFloat(o.total);
    if (!isNaN(tot)) { var t = sa + sh; chip(t > tot ? "✓ Over " + tot : t < tot ? "✓ Under " + tot : "Total " + tot + " push", t !== tot); }
    return w.childNodes.length ? w : null;
  }
  // football: the player of the game (the winner's best day by the same score Top performers uses), then the next two
  // football players' day from the box score: one entry per player, passing, rushing and receiving added up, best first
  function qlFbList(g, b, sum) {
    if (!b || !b.teams) return [];
    var full = {}; ((sum && sum.boxscore || {}).players || []).forEach(function (t) { (t.statistics || []).forEach(function (gr) { (gr.athletes || []).forEach(function (r) { var a = r.athlete || {}; if (a.id) full[String(a.id)] = a.displayName || ""; }); }); });
    // positions: ESPN's box score has none, its game leaders do (passing, rushing, receiving and defense)
    var pos = {}; ((sum && sum.leaders) || []).forEach(function (t) { (t.leaders || []).forEach(function (c) { (c.leaders || []).forEach(function (l) { var a = l.athlete || {}; if (a.id && a.position && a.position.abbreviation) pos[String(a.id)] = a.position.abbreviation; }); }); });
    var all = {}, list = [];
    b.teams.forEach(function (t) {
      (t.groups || []).forEach(function (gr) {
        if (["passing", "rushing", "receiving"].indexOf(gr.k) === -1) return;
        var cols = gr.cols || [];
        (gr.rows || []).forEach(function (r) {
          if ("dnp" in r) return;
          var v = {}; cols.forEach(function (c, i) { v[c] = r.s[i]; });
          var n = function (k) { var x = parseFloat(String(v[k] == null ? "" : v[k]).replace(/,/g, "")); return isNaN(x) ? 0 : x; };
          var key = t.side + "|" + (r.id || r.n), p = all[key];
          if (!p) { p = all[key] = { sd: t.side, id: r.id, n: r.n, pos: r.p || pos[r.id] || "", full: full[r.id] || r.n, py: 0, ptd: 0, int: 0, ry: 0, rtd: 0, cy: 0, ctd: 0, score: 0 }; list.push(p); }
          if (!p.pos && r.p) p.pos = r.p;
          if (gr.k === "passing") { p.py += n("YDS"); p.ptd += n("TD"); p.int += n("INT"); } else if (gr.k === "rushing") { p.ry += n("YDS"); p.rtd += n("TD"); } else { p.cy += n("YDS"); p.ctd += n("TD"); }
          p.score += n("YDS") / 10 + n("TD") * 6 - n("INT") * 4;
        });
      });
    });
    list.sort(function (a, c) { return c.score - a.score; });
    return list;
  }
  function qlHead(g, id) { var dir = BX_HEAD[g.league]; return dir && id ? "https://a.espncdn.com/i/headshots/" + dir + "/players/full/" + id + ".png" : ""; }
  // a small player card: headshot in the team's color, "QB · OU" over the name (DJ, Nov 28: "include player positions"), one stat
  function qlMini(g, p, stat) {
    var c = el("div"); c.appendChild(pdFace({ name: p.full || p.n, head: p.head || qlHead(g, p.id) }, p.sd, g));
    var s = el("span"); s.appendChild(el("em", null, [p.pos, abbr(g, p.sd)].filter(Boolean).join(" · ")));
    s.appendChild(el("b", null, p.full || p.n)); s.appendChild(el("small", null, stat)); c.appendChild(s); return c;
  }
  // football: the player of the game (the winner's best day by the same score Top performers uses), then the next two
  function qlPotg(g, b, sum, win) {
    var list = qlFbList(g, b, sum); if (!list.length) return null;
    var star = list.filter(function (p) { return p.sd === win; })[0] || list[0], rest = list.filter(function (p) { return p !== star; }).slice(0, 2);
    var tc = pdColors(g);
    var box = el("div"), hero = el("div", "ql-hero"); hero.style.setProperty("--qc", hexOk(tc[star.sd]) ? tc[star.sd] : "var(--raise)");
    hero.appendChild(pdFace({ name: star.full, head: qlHead(g, star.id) }, star.sd, g)); var tx = el("div");
    tx.appendChild(el("span", "k", "⭐ Player of the game")); tx.appendChild(el("b", null, star.full));
    tx.appendChild(el("p", null, [star.pos].concat(qlFbLine(star) ? [qlFbLine(star)] : []).filter(Boolean).join(" · "))); hero.appendChild(tx); box.appendChild(hero);
    if (rest.length) { var mini = el("div", "ql-mini"); rest.forEach(function (p) { mini.appendChild(qlMini(g, p, qlFbShort(p))); }); box.appendChild(mini); }
    return box;
  }
  function qlFbLine(p) {
    var bits = [], td = p.ptd + p.rtd + p.ctd;
    if (p.py) bits.push(p.py + " pass yds");
    if (p.ry >= 30 || (p.ry && !p.py && p.ry >= p.cy)) bits.push(p.ry + " rush yds");
    if (p.cy >= 30 || (p.cy && !p.py && p.cy > p.ry)) bits.push(p.cy + " rec yds");
    bits = bits.slice(0, 2);
    if (td) bits.push(p.ptd && (p.rtd || p.ctd) ? td + " total TDs" : p.ptd ? (p.ptd === 1 ? "1 TD pass" : p.ptd + " TD passes") : (td === 1 ? "1 TD" : td + " TDs"));
    if (p.int >= 2) bits.push(p.int + " INT");
    return bits.join(" · ");
  }
  function qlFbShort(p) {
    var td = p.ptd + p.rtd + p.ctd, y = [[p.py, " pass yds"], [p.ry, " rush yds"], [p.cy, " rec yds"]].sort(function (a, c) { return c[0] - a[0]; })[0];
    return y[0] + y[1] + (td ? ", " + (td === 1 ? "1 TD" : td + " TDs") : "");
  }
  // soccer: who scored and when, under each team's side, then possession, shots and shots on target
  var QL_SOC = [["possessionPct", "Possession", "%"], ["totalShots", "Shots"], ["shotsOnTarget", "On target"]];
  function qlSoccer(g, b, d) {
    var so = sideOrder(g), ids = {}; (b.teams || []).forEach(function (t) { ids[t.id] = t.side; });
    var goals = { away: [], home: [] }, by = { away: {}, home: {} };
    (b.ev || []).forEach(function (e) {
      if (e.k !== "goal" && e.k !== "pen" && e.k !== "og") return;
      var sd = ids[e.tid]; if (!sd) return;
      var who = e.k === "og" ? (e.a ? e.a + " (OG)" : "Own goal") : (e.a || "Goal"), mn = e.m + "'" + (e.k === "pen" ? " (P)" : "");
      if (!by[sd][who]) { by[sd][who] = []; goals[sd].push(who); }
      by[sd][who].push(mn);
    });
    var box = el("div");
    if (goals.away.length || goals.home.length) {
      var gs = el("div", "ql-gs");
      so.forEach(function (sd, i) {
        var col = el("div", i ? "r" : null);
        goals[sd].forEach(function (who) {
          var p = el("p"), mins = el("span", null, by[sd][who].join(", "));
          if (i) { p.appendChild(mins); p.appendChild(document.createTextNode(" " + who + " ⚽")); }
          else { p.appendChild(document.createTextNode("⚽ " + who + " ")); p.appendChild(mins); }
          col.appendChild(p);
        });
        gs.appendChild(col);
      });
      box.appendChild(gs);
    }
    var tc = pdColors(g), rows = 0, ms = el("div"); ms.style.marginTop = "6px";
    QL_SOC.forEach(function (st) {
      var A = d.stats[so[0]][st[0]], B = d.stats[so[1]][st[0]]; if (!A || !B) return;
      var na = parseFloat(A.v), nb = parseFloat(B.v); if (isNaN(na) || isNaN(nb)) return;
      var fa = st[2] ? Math.round(na) + st[2] : A.v, fb = st[2] ? Math.round(nb) + st[2] : B.v;
      var row = el("div", "pg-st" + (!na || !nb ? " none" : "")); row.appendChild(el("span", "c", st[1]));
      row.appendChild(el("b", nb > na ? "lo" : null, fa));
      var bar = el("div", "pg-bar");
      if (na && nb) [[na, tc[so[0]]], [nb, tc[so[1]]]].forEach(function (p) { var i3 = el("i"); i3.style.flex = String(p[0]); i3.style.background = p[1]; bar.appendChild(i3); });
      row.appendChild(bar); row.appendChild(el("b", "r" + (na > nb ? " lo" : ""), fb)); ms.appendChild(row); rows++;
    });
    if (rows) box.appendChild(ms);
    return box.childNodes.length ? box : null;
  }

  // ---------- football before and during the game (3.193.0) ----------
  // DJ (Nov 28) picked "A · Faces" for the whole day: before kickoff, one player to watch from each team (headshot, position,
  // season stat) between the line and Claude's quick read; during the game, who has the ball and where, the last play, and
  // the two players having the best day so far. The longer lists (players to watch, injuries, headlines) stay on the full
  // matchup page.
  var QLW = {};   // game id -> { at, busy, data: { away, home } } season leaders from ESPN's game summary
  function qlWatchData(g) {
    var c = QLW[g.id];
    if (c && (c.busy || Date.now() - c.at < 1800000)) return c.data;
    c = QLW[g.id] = { at: Date.now(), busy: true, data: c ? c.data : null };
    bxFindEvent(g).then(function (ev) { return ev ? rkFetch(bxSummaryUrl(g.league, ev)) : null; }).then(null, function () { return null; }).then(function (j) {
      c.busy = false; c.at = Date.now();
      if (j) { try { c.data = qlWatchParse(g, j); } catch (e) { c.data = null; } }
      if (c.data && state.openId === g.id) { try { render(); } catch (e) {} }   // one redraw when it arrives, for the open quick look
    });
    return c.data;
  }
  // each team's player to watch: the biggest of its passing (counted at a third), rushing and receiving leaders
  function qlWatchParse(g, j) {
    var out = {}, W = { passingYards: [1 / 3, " pass yds"], rushingYards: [1, " rush yds"], receivingYards: [1, " rec yds"] };
    (j.leaders || []).forEach(function (t) {
      var sd = pdSide(g, j, t.team); if (!sd) return; var best = null;
      (t.leaders || []).forEach(function (c) {
        var w = W[c.name], l = (c.leaders || [])[0]; if (!w || !l) return;
        var a = l.athlete || {}, m = /([\d,]+) YDS/.exec(String(l.displayValue || "")); if (!m || !a.displayName) return;
        var y = Number(m[1].replace(/,/g, "")), sc = y * w[0];
        if (!best || sc > best.sc) best = { sc: sc, sd: sd, id: String(a.id || ""), full: a.displayName, pos: ((a.position || {}).abbreviation) || "", head: ((a.headshot || {}).href) || "", stat: m[1] + w[1] };
      });
      if (best) out[sd] = best;
    });
    return out.away || out.home ? out : null;
  }
  function qlWatch(g) {
    if (BX_SPORT[g.league] !== "football" || g.custom) return null;
    var d = qlWatchData(g); if (!d) return null;
    var w = el("div", "ql-mini ql-watch");
    sideOrder(g).forEach(function (sd) { if (d[sd]) w.appendChild(qlMini(g, d[sd], d[sd].stat)); });
    return w.childNodes.length ? w : null;
  }
  // before kickoff: slim the preview block down (the quick read keeps three lines) and put the two players in
  function qlPre(g, pvb) {
    if (BX_SPORT[g.league] !== "football" || !pvb) return;
    pvb.querySelectorAll(":scope > .pv-watch, :scope > .pv-inj, :scope > .pv-hl").forEach(function (n) { n.remove(); });
    pvb.querySelectorAll(":scope > .pv-sum").forEach(function (n) { n.classList.add("ql-clamp"); });
    var w = qlWatch(g); if (w) pvb.appendChild(w);   // trayBlock puts it right under the line
  }
  // during the game
  function qlLive(g, b) {
    if (BX_SPORT[g.league] !== "football" || !b || b.state !== "in") return null;
    var cur = bx.live[g.id], sum = cur && cur.sum, wrap = el("div", "qlf");
    var sit = String((scoreRaw(g.id) || {}).sit || "").replace(/^(\S+ ball), /, "$1 · ");
    if (sit) { var s = el("div", "ql-sit"); s.appendChild(el("i")); s.appendChild(el("b", null, sit)); wrap.appendChild(s); }
    var dr = sum && sum.drives || {}, pl = ((dr.current || {}).plays || []).concat([]);
    if (!pl.length && Array.isArray(dr.previous) && dr.previous.length) pl = (dr.previous[dr.previous.length - 1].plays || []);
    var last = null; for (var i = pl.length - 1; i >= 0 && !last; i--) if (pl[i] && pl[i].text && !/^(End of|Start of|Timeout|Official timeout|Two-minute)/i.test(String(pl[i].text).trim())) last = pl[i];   // a real play, not "End of 1st quarter"
    var tx = last ? String(last.text || "") : "";
    try { tx = fdClean(tx); } catch (e) {}
    tx = tx.replace(/^\s*(?:No Huddle-)?Shotgun\s+/i, "").replace(/#\d+\s*/g, "").trim();
    if (tx) { var lp = el("p", "ql-lp"); lp.appendChild(el("b", null, "Last play: ")); lp.appendChild(document.createTextNode(tx)); wrap.appendChild(lp); }
    var list = qlFbList(g, b, sum).slice(0, 2);
    if (list.length) { var mini = el("div", "ql-mini"); list.forEach(function (p) { mini.appendChild(qlMini(g, p, qlFbShort(p))); }); wrap.appendChild(mini); }
    return wrap.childNodes.length ? wrap : null;
  }
  (function () {
    var st = document.createElement("style"); st.id = "ql-css2";
    st.textContent = ".ql-watch{margin:8px 0}.pv-sum.ql-clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}" +
      ".ql-sit{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--live) 12%,transparent);font-size:15px}" +
      ".ql-sit i{width:8px;height:8px;border-radius:50%;background:var(--live);flex:none}.ql-sit b{font-weight:800}" +
      ".ql-lp{margin:6px 0 0;font-size:14px;line-height:1.35;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.ql-lp b{color:var(--head)}";
    document.head.appendChild(st);
  })();

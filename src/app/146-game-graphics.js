  // ---- Game flow (3.108.0): two pictures on a started game's page, drawn from ESPN's game summary and nothing else ----
  // 1. Win chance: ESPN's own win-probability number after every play (football and basketball, where ESPN sends it).
  // 2. Shot chart (basketball): where every shot was taken, from the spot ESPN records on each shooting play.
  // The section starts closed and the summary is only fetched when it's opened. Hidden scores hide it too (boxGate).
  var GFX = { cache: {} };
  var GFX_CSS =
    ".gfx-h { margin: 0 0 8px; font: 800 15px var(--font); font-stretch: 112%; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }" +
    ".gfx-h span { font-weight: 700; font-size: 13px; color: var(--muted); }" +
    ".gfx-wp { position: relative; }" +
    ".gfx-wp svg { display: block; width: 100%; height: auto; }" +
    ".gfx-side { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: var(--muted); margin: 2px 0; }" +
    ".gfx-per { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; font-size: 12px; color: var(--dim); text-align: center; margin-top: 2px; }" +
    ".gfx-courts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }" +
    ".gfx-court b { display: block; font: 800 14px var(--font); margin-bottom: 4px; }" +
    ".gfx-court i { display: block; font-style: normal; font-size: 12px; color: var(--muted); margin-top: 4px; }" +
    ".gfx-court svg { display: block; width: 100%; height: auto; }" +
    ".gfx-key { margin: 8px 0 0; font-size: 12px; color: var(--dim); }" +
    ".gfx-none { margin: 0; color: var(--muted); font-size: 15px; }";
  (function () { var st = document.createElement("style"); st.id = "gfx-css"; st.textContent = GFX_CSS; document.head.appendChild(st); })();

  function gfxOk(g) { var s = BX_SPORT[g.league]; return !g.custom && !!ESPN_URLS[g.league] && (s === "bball" || s === "football"); }
  function gfxSub(g) { return BX_SPORT[g.league] === "bball" ? "Win chance and shot chart" : "Win chance, play by play"; }
  function gfxLoad(g) {
    var c = GFX.cache[g.id], live = status(g).kind === "live";
    if (c && (c.busy || (c.done && (c.fin || Date.now() - c.at < (live ? 60000 : 600000))))) return c;
    c = GFX.cache[g.id] = { at: Date.now(), busy: true, data: c ? c.data : null };
    bxFindEvent(g).then(function (ev) { return ev ? rkFetch(bxSummaryUrl(g.league, ev)) : null; }).then(null, function () { return null; }).then(function (j) {
      c.busy = false; c.done = true; c.at = Date.now();
      if (j) { c.data = gfxParse(j); c.fin = c.data.fin; } else c.failed = !c.data;
      if (state.view === "game" && state.gameId === g.id) { try { keepScroll(renderGame); } catch (e) {} }
    });
    return c;
  }
  function gfxParse(j) {
    var comp = ((j.header || {}).competitions || [])[0] || {}, ids = {}, out = { wp: [], per: [], shots: { away: [], home: [] }, fin: !!(((comp.status || {}).type || {}).completed) };
    (comp.competitors || []).forEach(function (c) { ids[String(c.id)] = c.homeAway; });
    var per = {}; (j.plays || []).forEach(function (p) { per[String(p.id)] = (p.period || {}).number || 0; });
    var last = 0;
    (j.winprobability || []).forEach(function (w, i) {
      var h = Number(w.homeWinPercentage); if (isNaN(h)) return;
      out.wp.push(h);
      var pn = per[String(w.playId)]; if (pn && pn > last) { if (last) out.per.push(out.wp.length - 1); last = pn; }
    });
    out.periods = last;
    (j.plays || []).forEach(function (p) {
      if (!p.shootingPlay || !p.coordinate) return;
      var x = Number(p.coordinate.x), y = Number(p.coordinate.y), sd = ids[String((p.team || {}).id)];
      if (!sd || isNaN(x) || isNaN(y) || x < 0 || x > 50 || y < -4 || y > 43) return;   // free throws and full-court heaves have no spot on a half court
      out.shots[sd].push({ x: x, y: y, m: !!p.scoringPlay });
    });
    return out;
  }
  function gfxSvg(vb) { var NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", vb); s.setAttribute("role", "img"); return s; }
  function gfxEl(svg, tag, at) { var n = document.createElementNS("http://www.w3.org/2000/svg", tag); Object.keys(at).forEach(function (k) { n.setAttribute(k, at[k]); }); svg.appendChild(n); return n; }
  function gfxTeamInk(g, sd) { var c = ""; try { c = hlInk(badgeColor(g, sd) || ""); } catch (e) {} return hexOk(c) ? c : ""; }
  // the win-chance line: the home team's chance runs up, the away team's down, 50% is the dashed middle
  function gfxWin(g, d) {
    var card = gvCard(null, "gv-box"), n = d.wp.length, W = 300, H = 110, now = d.wp[n - 1];
    var lead = now >= 0.5 ? "home" : "away", pct = Math.round((now >= 0.5 ? now : 1 - now) * 100);
    var h = el("h4", "gfx-h", "Win chance"); h.appendChild(el("span", null, status(g).kind === "over" ? "From ESPN, play by play" : abbr(g, lead) + " " + pct + "% now")); card.appendChild(h);
    var wrap = el("div", "gfx-wp");
    var top = el("div", "gfx-side"); top.appendChild(el("span", null, abbr(g, "home") + " ahead")); top.appendChild(el("span", null, "100%")); wrap.appendChild(top);
    var svg = gfxSvg("0 0 " + W + " " + H); svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-label", "Win chance through the game. " + abbr(g, lead) + " at " + pct + " percent" + (status(g).kind === "over" ? " at the end." : " now."));
    gfxEl(svg, "rect", { x: 0, y: 0, width: W, height: H, fill: "none", stroke: "var(--line)", "stroke-width": 1 });
    d.per.forEach(function (i) { var x = (i / (n - 1)) * W; gfxEl(svg, "line", { x1: x, y1: 0, x2: x, y2: H, stroke: "var(--line)", "stroke-width": 1 }); });
    gfxEl(svg, "line", { x1: 0, y1: H / 2, x2: W, y2: H / 2, stroke: "var(--dim)", "stroke-width": 1, "stroke-dasharray": "4 4" });
    var pts = d.wp.map(function (v, i) { return ((i / Math.max(1, n - 1)) * W).toFixed(1) + "," + ((1 - v) * H).toFixed(1); }).join(" ");
    gfxEl(svg, "polyline", { points: pts, fill: "none", stroke: "var(--ink)", "stroke-width": 2, "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" });
    wrap.appendChild(svg);
    var bot = el("div", "gfx-side"); bot.appendChild(el("span", null, abbr(g, "away") + " ahead")); bot.appendChild(el("span", null, "100%")); wrap.appendChild(bot);
    if (d.per.length) {
      // period names sit under their stretch of the line, sized by how many plays each had
      var cuts = [0].concat(d.per, [n - 1]), pr = el("div", "gfx-per"), cols = [], half = g.league === "ncaam";   // men's college plays halves
      for (var k = 0; k < cuts.length - 1; k++) { cols.push(Math.max(1, cuts[k + 1] - cuts[k]) + "fr"); var reg = half ? 2 : 4; pr.appendChild(el("span", null, k < reg ? (half ? (k ? "2nd half" : "1st half") : "Q" + (k + 1)) : "OT" + (k - reg ? k - reg + 1 : ""))); }
      pr.style.gridAutoFlow = "initial"; pr.style.gridTemplateColumns = cols.join(" "); wrap.appendChild(pr);
    }
    card.appendChild(wrap);
    return card;
  }
  function gfxCourt(g, sd, shots) {
    var box = el("div", "gfx-court"), made = shots.filter(function (s) { return s.m; }).length, ink = gfxTeamInk(g, sd) || "var(--ink)";
    box.appendChild(el("b", null, abbr(g, sd)));
    var svg = gfxSvg("-1 -5 52 49"); svg.setAttribute("aria-label", abbr(g, sd) + " shots: " + made + " made of " + shots.length + " shown.");
    var ln = { fill: "none", stroke: "var(--line)", "stroke-width": 0.4 };
    gfxEl(svg, "rect", Object.assign({ x: 0, y: -4, width: 50, height: 47 }, ln));          // half court, baseline on top
    gfxEl(svg, "rect", Object.assign({ x: 17, y: -4, width: 16, height: 19 }, ln));         // the lane
    gfxEl(svg, "path", Object.assign({ d: "M19 15a6 6 0 0 0 12 0" }, ln));                  // top of the key
    gfxEl(svg, "path", Object.assign({ d: "M3 -4V8.95A23.75 23.75 0 0 0 47 8.95V-4" }, ln)); // the three-point line
    gfxEl(svg, "circle", Object.assign({ cx: 25, cy: 0, r: 0.75 }, ln));                    // the rim
    gfxEl(svg, "line", Object.assign({ x1: 22, y1: -1.2, x2: 28, y2: -1.2 }, ln));           // the backboard
    shots.filter(function (s) { return !s.m; }).forEach(function (s) { gfxEl(svg, "circle", { cx: s.x, cy: s.y, r: 0.9, fill: "none", stroke: "var(--dim)", "stroke-width": 0.35 }); });
    shots.filter(function (s) { return s.m; }).forEach(function (s) { gfxEl(svg, "circle", { cx: s.x, cy: s.y, r: 1, fill: ink, stroke: "var(--card)", "stroke-width": 0.2 }); });
    box.appendChild(svg);
    box.appendChild(el("i", null, made + " made of " + shots.length));
    return box;
  }
  function gfxFill(g, box) {
    if (!boxShown(g)) { var gc = gvCard(null, "gv-box"); gc.appendChild(boxGate(g)); box.appendChild(gc); return; }
    var c = gfxLoad(g), d = c.data;
    if (!d) { var w = gvCard(null); w.appendChild(el("p", "gfx-none", c.failed ? "ESPN's game data didn't load. Close and open this section to try again." : "Loading from ESPN…")); box.appendChild(w); return; }
    var any = false;
    if (d.wp.length > 5) { box.appendChild(gfxWin(g, d)); any = true; }
    if (d.shots.away.length + d.shots.home.length > 0) {
      var sc = gvCard(null, "gv-box"), h = el("h4", "gfx-h", "Shot chart"); h.appendChild(el("span", null, "Both shown at the top basket")); sc.appendChild(h);
      var cs = el("div", "gfx-courts"); sideOrder(g).forEach(function (sd) { cs.appendChild(gfxCourt(g, sd, d.shots[sd])); }); sc.appendChild(cs);
      sc.appendChild(el("p", "gfx-key", "Filled dot: made. Ring: missed. Free throws aren't shown. From ESPN's play-by-play."));
      box.appendChild(sc); any = true;
    }
    if (!any) { var nn = gvCard(null); nn.appendChild(el("p", "gfx-none", "ESPN isn't sending win chance or shot spots for this game.")); box.appendChild(nn); }
  }

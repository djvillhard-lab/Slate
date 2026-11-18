  // ---- Player page (3.105.0): a sheet with one player's season, last games, next game and headlines. ----
  // Everything comes from ESPN's free athlete pages (the athlete and its overview); nothing is worked out here.
  // Opened by tapping a player on a Box Office card, a box score row or a Top performers row (plrTap).
  var PLR = { cache: {}, cur: null };
  var PLR_CSS =
    ".plr-sheet { gap: 14px; }" +
    ".plr-head { display: grid; grid-template-columns: 72px 1fr; gap: 12px; align-items: center; }" +
    ".plr-face { width: 72px; height: 72px; border-radius: 8px; background: var(--bg); overflow: hidden; display: grid; place-items: center; font: 800 22px var(--font); color: var(--muted); }" +
    ".plr-face img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }" +
    ".plr-head h3 { margin: 0; font-size: 22px; line-height: 1.15; }" +
    ".plr-sub { margin: 2px 0 0; font-size: 15px; color: var(--muted); font-weight: 700; }" +
    ".plr-bio { margin: 2px 0 0; font-size: 13px; color: var(--dim); }" +
    ".plr-tiles { display: grid; grid-template-columns: repeat(var(--n, 4), 1fr); gap: 8px; }" +
    ".plr-tile { background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 8px 4px; text-align: center; min-width: 0; }" +
    ".plr-tile b { display: block; font: 800 20px var(--font); font-stretch: 112%; }" +
    ".plr-tile span { display: block; font-size: 12px; color: var(--muted); font-weight: 700; }" +
    ".plr-tile i { display: block; font-style: normal; font-size: 12px; color: var(--dim); }" +
    ".plr-h { margin: 4px 0 0; font: 800 15px var(--font); font-stretch: 112%; }" +
    ".plr-h span { font-weight: 700; color: var(--dim); font-size: 13px; margin-left: 6px; }" +
    ".plr-sc { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--line); border-radius: 8px; }" +
    ".plr-t { border-collapse: collapse; width: 100%; font-size: 14px; white-space: nowrap; }" +
    ".plr-t th { font-size: 12px; color: var(--muted); font-weight: 700; text-align: right; padding: 8px 8px 6px; }" +
    ".plr-t td { text-align: right; padding: 8px; border-top: 1px solid var(--line); font-variant-numeric: tabular-nums; }" +
    ".plr-t th:first-child, .plr-t td:first-child { text-align: left; position: sticky; left: 0; background: var(--card); font-weight: 700; }" +
    ".plr-t td.w { color: var(--muted); }" +
    ".plr-next { margin: 0; font-size: 15px; }" +
    ".plr-next b { color: var(--muted); font-weight: 700; margin-right: 6px; }" +
    ".plr-news { display: grid; }" +
    ".plr-news a { display: block; padding: 10px 0; min-height: 44px; box-sizing: border-box; border-top: 1px solid var(--line); color: var(--ink); text-decoration: none; font-size: 15px; font-weight: 700; }" +
    ".plr-news a:first-child { border-top: 0; }" +
    ".plr-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }" +
    ".plr-btns button { min-height: 44px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--bg); color: var(--ink); font: 800 15px var(--font); }" +
    ".plr-msg { margin: 0; color: var(--muted); font-size: 15px; }" +
    ".plr-src { margin: 0; font-size: 12px; color: var(--dim); }" +
    ".plr-tap { cursor: pointer; }";
  (function () { var st = document.createElement("style"); st.id = "plr-css"; st.textContent = PLR_CSS; document.head.appendChild(st); })();

  function plrGet(url) { return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function plrLoad(p) {
    var key = p.lg + "|" + p.id, c = PLR.cache[key];
    if (c && (c.busy || (c.done && Date.now() - c.at < 600000))) return c;
    c = PLR.cache[key] = { at: Date.now(), busy: true, a: c ? c.a : null, o: c ? c.o : null };
    var base = "https://site.api.espn.com/apis/common/v3/sports/" + bxBase(p.lg) + "/athletes/" + encodeURIComponent(p.id);
    Promise.all([plrGet(base), plrGet(base + "/overview")]).then(function (r) {
      c.busy = false; c.done = true; c.at = Date.now();
      if (r[0] && r[0].athlete) c.a = r[0].athlete; if (r[1]) c.o = r[1];
      c.failed = !c.a && !c.o;
      if (PLR.cur && PLR.cur.lg + "|" + PLR.cur.id === key) plrDraw();
    });
    return c;
  }
  function plrSheet() {
    var bd = document.getElementById("sheet-plr"); if (bd) return bd;
    bd = el("div", "sheet-backdrop"); bd.id = "sheet-plr";
    bd.setAttribute("role", "dialog"); bd.setAttribute("aria-modal", "true"); bd.setAttribute("aria-labelledby", "plr-title");
    bd.addEventListener("click", function (e) { if (e.target === bd) plrClose(); });
    document.body.appendChild(bd); return bd;
  }
  function plrClose() { var bd = document.getElementById("sheet-plr"); if (bd) bd.classList.remove("open"); PLR.cur = null; }
  // p: { id (ESPN athlete id), lg (Slate league key), name }
  function openPlayer(p) {
    if (!p || !p.id || !bxBase(p.lg)) return;
    PLR.cur = { id: String(p.id), lg: p.lg, name: p.name || "" };
    plrLoad(PLR.cur); plrDraw(); plrSheet().classList.add("open");
  }
  // makes a node open the player's page; does nothing for a row with no ESPN id
  function plrTap(node, p) {
    if (!node || !p || !p.id || !bxBase(p.lg)) return node;
    node.classList.add("plr-tap"); node.setAttribute("role", "button"); node.tabIndex = 0;
    node.setAttribute("aria-label", (p.name || "Player") + ", player page");
    var go = function (e) { if (e.target && e.target.closest && e.target.closest("a, button") && e.target.closest("a, button") !== node) return; e.stopPropagation(); openPlayer(p); };
    node.addEventListener("click", go);
    node.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e); } });
    return node;
  }
  function plrTable(head, rows) {
    var sc = el("div", "plr-sc"), t = el("table", "plr-t"), hr = el("tr");
    head.forEach(function (h) { hr.appendChild(el("th", null, h)); });
    var th = el("thead"); th.appendChild(hr); t.appendChild(th);
    var tb = el("tbody");
    rows.forEach(function (r) { var tr = el("tr"); r.forEach(function (v, i) { var td = el("td", null, v == null || v === "" ? "–" : String(v)); if (i === 1 && r.wl) td.className = "w"; tr.appendChild(td); }); tb.appendChild(tr); });
    t.appendChild(tb); sc.appendChild(t); return sc;
  }
  function plrDay(iso) { var d = new Date(iso); if (isNaN(d)) return ""; return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function plrWhen(iso) { var d = new Date(iso); if (isNaN(d)) return ""; return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  function plrDraw() {
    var P = PLR.cur; if (!P) return;
    var bd = plrSheet(), c = PLR.cache[P.lg + "|" + P.id] || {}, a = c.a || {}, o = c.o || {};
    var sh = el("div", "sheet plr-sheet");
    // who he is
    var head = el("div", "plr-head"), face = el("div", "plr-face"), nm = a.displayName || P.name || "Player";
    var ini = nm.split(" "); face.textContent = ((ini[0] || "")[0] || "") + ((ini.length > 1 ? ini[ini.length - 1] : "")[0] || "");
    var src = (a.headshot || {}).href;
    if (src) { var im = document.createElement("img"); im.alt = ""; im.src = safeUrl(src); im.addEventListener("error", function () { im.remove(); }); im.addEventListener("load", function () { face.textContent = ""; face.appendChild(im); }); }
    head.appendChild(face);
    var hm = el("div"), h = el("h3", null, nm); h.id = "plr-title"; hm.appendChild(h);
    var team = (a.team || {}).displayName || "", pos = (a.position || {}).abbreviation || "", jer = a.displayJersey || (a.jersey ? "#" + a.jersey : "");
    var sub = [team, pos, jer].filter(Boolean).join(" · "); if (sub) hm.appendChild(el("p", "plr-sub", sub));
    var bio = [a.displayHeight, a.displayWeight, a.age ? "Age " + a.age : "", a.displayExperience].filter(Boolean).join(" · "); if (bio) hm.appendChild(el("p", "plr-bio", bio));
    head.appendChild(hm); sh.appendChild(head);

    if (c.busy && !c.a && !c.o) sh.appendChild(el("p", "plr-msg", "Loading from ESPN…"));
    else if (c.failed) sh.appendChild(el("p", "plr-msg", "ESPN has no page for this player right now."));

    // the headline numbers ESPN picks for him, with his league rank when ESPN gives one
    var sm = a.statsSummary || {}, tiles = (sm.statistics || []).slice(0, 4);
    if (tiles.length) {
      var hh = el("h4", "plr-h", "Season"); if (sm.displayName) hh.appendChild(el("span", null, String(sm.displayName).replace(/ stats$/i, ""))); sh.appendChild(hh);
      var tw = el("div", "plr-tiles"); tw.style.setProperty("--n", tiles.length);
      tiles.forEach(function (s) { var t = el("div", "plr-tile"); t.appendChild(el("b", null, s.displayValue || "–")); t.appendChild(el("span", null, s.shortDisplayName || s.abbreviation || "")); if (s.rankDisplayValue) t.appendChild(el("i", null, s.rankDisplayValue)); t.title = s.displayName || ""; tw.appendChild(t); });
      sh.appendChild(tw);
    }
    // the full season lines (this season, career and so on), as ESPN lists them
    var st = o.statistics || {}, labels = st.labels || [], splits = (st.splits || []).filter(function (x) { return x && (x.stats || []).length && !/project/i.test(x.displayName || ""); });   // ESPN's "Projected" row is a forecast, not a stat, so it's left out
    if (labels.length && splits.length) {
      sh.appendChild(el("h4", "plr-h", "Season lines"));
      sh.appendChild(plrTable([""].concat(labels), splits.map(function (x) { return [x.displayName || ""].concat(x.stats); })));
    }
    // his last games
    var gl = o.gameLog || {}, evs = gl.events || {};
    (gl.statistics || []).forEach(function (grp, gi) {
      var rows = (grp.events || []).map(function (e) {
        var ev = evs[e.eventId] || {}, opp = (ev.opponent || {}).abbreviation || "";
        var r = [plrDay(ev.gameDate) + (opp ? " " + (ev.atVs || "vs") + " " + opp : ""), [ev.gameResult, ev.score].filter(Boolean).join(" ")].concat(e.stats || []); r.wl = 1; return r;
      });
      if (!rows.length) return;
      var gh = el("h4", "plr-h", gi ? String(grp.displayName || "") : "Last " + rows.length + " games");
      if (!gi && (gl.statistics || []).length > 1 && grp.displayName) gh.appendChild(el("span", null, grp.displayName));
      sh.appendChild(gh);
      sh.appendChild(plrTable(["Game", "Result"].concat(grp.labels || []), rows));
    });
    // what's next
    var nx = (((o.nextGame || {}).league || {}).events || [])[0];
    if (nx && nx.date) { var np = el("p", "plr-next"); np.appendChild(el("b", null, "Next")); np.appendChild(document.createTextNode((nx.shortName || nx.name || "") + " · " + plrWhen(nx.date))); sh.appendChild(np); }
    // written stories about him (no video clips)
    var news = (o.news || []).filter(function (n) { return n && n.headline && n.type !== "Media" && ((n.links || {}).web || {}).href; }).slice(0, 3);
    if (news.length) {
      sh.appendChild(el("h4", "plr-h", "Headlines"));
      var nw = el("div", "plr-news");
      news.forEach(function (n) { var l = el("a", null, n.headline); l.href = safeUrl(n.links.web.href); l.target = "_blank"; l.rel = "noopener"; nw.appendChild(l); });
      sh.appendChild(nw);
    }
    if (c.a || c.o) sh.appendChild(el("p", "plr-src", "From ESPN."));
    var btns = el("div", "plr-btns");
    if (team) { var tb = el("button", null, "Team page"); tb.type = "button"; tb.addEventListener("click", function () { var lg = P.lg; plrClose(); openTeam(team, lg); }); btns.appendChild(tb); }
    var cb = el("button", null, "Close"); cb.type = "button"; cb.addEventListener("click", plrClose); btns.appendChild(cb);
    if (!team) btns.style.gridTemplateColumns = "1fr";
    sh.appendChild(btns);
    var top = (bd.firstChild && bd.firstChild.scrollTop) || 0;
    bd.textContent = ""; bd.appendChild(sh); sh.scrollTop = top;
  }

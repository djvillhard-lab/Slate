  // ---------- TV watch setups on On TV (3.135.0, DJ Nov 25, 2026) ----------
  // You shape your TVs (up to 5: drag to move, drag the corner to resize, a split screen for 2 or 4 games) and save the
  // setup. Slate rules fill them: your team on the main TV, the other slate games on at the same time on the rest, best
  // first. It's about the matchup; each TV shows its channel big, since you turn every TV to it yourself.
  // Live games make a "Live now" setup; with nothing live it opens on the next start time. A game that ends drops out
  // and the next one takes its TV. Saved with the profile in data/users/<uid>/tv-setups (a copy on this phone for speed).
  // Positions are grid units on a 24 x 14 wall (TVW x TVH), so a setup looks the same on every screen size.
  var TVW = 24, TVH = 14, TV_MAXN = 5;
  var TVS = { list: [], cur: "", loaded: false, asked: false, slot: "", edit: null, sel: 0, once: null, swap: "", pins: {}, saveT: null };
  try { var tvc = JSON.parse(localStorage.getItem("slate-tv-setups") || "null"); if (tvc && Array.isArray(tvc.list)) { TVS.list = tvc.list; TVS.cur = tvc.cur || ""; } } catch (e) {}
  try { var tvp = JSON.parse(localStorage.getItem("slate-tv-pins") || "null"); if (tvp && tvp.d === todayInHome()) TVS.pins = tvp.p || {}; } catch (e) {}
  var TV_PRESETS = [
    { k: "one", n: "One TV", t: [[3, 1, 18, 12]] },
    { k: "big2", n: "1 big + 2", t: [[5, 0, 14, 8], [0, 9, 9, 5], [15, 9, 9, 5]] },
    { k: "big3", n: "Big + 3", t: [[5, 0, 14, 8], [0, 9, 7, 5], [8, 9, 8, 5], [17, 9, 7, 5]] },
    { k: "wall", n: "2 × 2 wall", t: [[0, 0, 11, 6], [13, 0, 11, 6], [0, 8, 11, 6], [13, 8, 11, 6]] },
    { k: "row5", n: "Big + 4", t: [[6, 0, 12, 8], [0, 10, 5, 4], [6, 10, 5, 4], [13, 10, 5, 4], [19, 10, 5, 4]] }
  ];
  var TV_NAMES = ["Main TV", "Left TV", "Middle TV", "Right TV", "Fifth TV"];
  (function () { var st = document.createElement("style"); st.id = "tvs-css"; st.textContent =
    ".tvs { margin: 4px 0 20px; padding-bottom: 88px; }" +
    ".tvs-top { display: flex; align-items: center; gap: 8px; min-height: 44px; }" +
    ".tvs-top .rlink { margin: 0 0 0 auto; min-height: 44px; }" +
    ".tvs-pick { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex: 1; min-width: 0; }" +
    ".tvs-pick::-webkit-scrollbar { display: none; }" +
    ".tvs-pill { flex: none; min-height: 40px; padding: 0 14px; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 700; color: var(--muted); background: var(--lg-fill); border: 1px solid var(--lg-edge); box-shadow: var(--lg-hi); }" +
    ".tvs-pill[aria-pressed=\"true\"] { background: var(--lg-lit); color: var(--ink); }" +
    ".tvs-slots { display: flex; gap: 2px; padding: 4px; margin: 8px 0 0; border-radius: 999px; background: var(--lg-fill); border: 1px solid var(--lg-edge); box-shadow: var(--lg-hi); overflow-x: auto; scrollbar-width: none; }" +
    ".tvs-slots::-webkit-scrollbar { display: none; }" +
    ".tvs-slots button { flex: 1 0 auto; min-height: 36px; padding: 0 12px; border: 0; border-radius: 999px; background: none; font: inherit; font-size: 13px; font-weight: 700; color: var(--muted); display: flex; align-items: center; justify-content: center; gap: 6px; }" +
    ".tvs-slots button[aria-pressed=\"true\"] { background: var(--lg-lit); color: var(--ink); }" +
    ".tvs-slots i { width: 7px; height: 7px; border-radius: 50%; background: var(--live); }" +
    ".tvs-wall { position: relative; margin-top: 10px; border-radius: 8px; background: var(--card); aspect-ratio: 24 / 14; }" +
    ".tvs-tv { position: absolute; box-sizing: border-box; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); padding: 6px; overflow: hidden; display: flex; flex-direction: column; gap: 4px; min-width: 0; text-align: left; font: inherit; color: var(--ink); }" +
    ".tvs-tv.main { border: 2px solid var(--accent); }" +
    ".tvs-tv .tn { display: flex; align-items: center; justify-content: space-between; gap: 4px; font-size: 11px; font-weight: 700; color: var(--muted); min-width: 0; }" +
    ".tvs-tv.main .tn > span:first-child { color: var(--accent); }" +
    ".tvs-tv .tn > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }" +
    ".tvs-ch { flex: none; display: inline-block; padding: 2px 6px; border-radius: 4px; background: var(--ink); color: var(--bg); font-size: 13px; font-weight: 800; font-stretch: 88%; line-height: 1.25; white-space: nowrap; }" +
    ".tvs-tv.sm .tvs-ch, .tvs-cell .tvs-ch { font-size: 10px; padding: 1px 4px; }" +
    ".tvs-mu { display: flex; align-items: center; gap: 6px; min-width: 0; }" +
    ".tvs-mu .sc { font-size: 22px; font-weight: 800; font-stretch: 66%; }" +
    ".tvs-mu .sc.lose { color: var(--muted); }" +
    ".tvs-mu .gap { flex: 1; }" +
        ".tvs-tv.sm .tvs-mu .sc { font-size: 16px; }" +
    ".tvs-st { font-size: 11px; font-weight: 800; font-stretch: 88%; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }" +
    ".tvs-st.live { color: var(--live); }" +
    ".tvs-nm { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }" +
    ".tvs-tv.sm .tvs-nm { display: none; }" +
    ".tvs-split { flex: 1; display: grid; gap: 3px; min-height: 0; }" +
    ".tvs-cell { background: var(--card); border-radius: 3px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 10px; font-weight: 800; font-stretch: 88%; min-width: 0; overflow: hidden; padding: 2px; }" +
    ".tvs-cell .live { color: var(--live); }" +
    ".tvs-empty { font-size: 11px; color: var(--dim); }" +
    ".tvs-h { display: flex; justify-content: space-between; align-items: baseline; margin: 18px 0 4px; }" +
    ".tvs-h h2 { margin: 0; font-size: 15px; }" +
    ".tvs-h .count { font-size: 12px; color: var(--dim); }" +
    ".tvs-row { display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 4px 0; border-top: 1px solid var(--hair); }" +
    ".tvs-row .tvs-ch { min-width: 44px; text-align: center; font-size: 14px; padding: 4px 6px; }" +
    ".tvs-row .tx { flex: 1; min-width: 0; }" +
    ".tvs-row .tx b { display: block; font-size: 16px; font-weight: 800; }" +
    ".tvs-row .tx > span { display: block; font-size: 12px; color: var(--muted); }" +
    ".tvs-row .tx .live { color: var(--live); }" +
    ".tvs-row .tvs-sw { min-height: 44px; flex: none; }" +
    ".tvs-row .chwatch { flex: none; display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 12px !important; border-radius: 8px !important; font: inherit; font-size: 13px; font-weight: 800; color: var(--ink); white-space: nowrap; }" +
    ".tvs-row .chwatch::before { content: \"\"; border-left: 7px solid var(--accent); border-top: 4.5px solid transparent; border-bottom: 4.5px solid transparent; }" +
    ".tvs-row .tvs-noch { min-width: 44px; font-size: 11px; color: var(--dim); text-align: center; }" +
    ".tvs-mu .ab { font-size: 12px; font-weight: 800; font-stretch: 88%; }" +
    ".tvs-sw { padding: 0 10px; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 700; color: var(--ink); background: var(--lg-fill); border: 1px solid var(--lg-edge); }" +
    ".tvs-alt { padding: 0 0 8px 54px; display: flex; flex-direction: column; }" +
    ".tvs-alt button { min-height: 44px; text-align: left; background: none; border: 0; border-top: 1px solid var(--hair); font: inherit; font-size: 15px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 8px; padding: 0; }" +
    ".tvs-alt button .tvs-ch { font-size: 11px; }" +
    ".tvs-alt button span.d { margin-left: auto; font-size: 12px; color: var(--dim); }" +
    ".tvs-new { padding: 16px; border-radius: 8px; background: var(--card); margin: 4px 0 20px; }" +
    ".tvs-new b { display: block; font-size: 16px; font-weight: 800; margin-bottom: 4px; }" +
    ".tvs-new p { margin: 0 0 12px; font-size: 13px; color: var(--muted); }" +
    // the editor
    ".tvs-ed .tvs-wall { background-color: var(--card); background-image: radial-gradient(var(--line) 1px, transparent 1px); background-size: calc(100% / 24) calc(100% / 14); touch-action: none; }" +
    ".tvs-ed .tvs-tv { touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; }" +
    ".tvs-ed .tvs-tv.sel { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }" +
    ".tvs-ed .tvs-tv .rz { position: absolute; right: 0; bottom: 0; width: 28px; height: 28px; touch-action: none; }" +
    ".tvs-ed .tvs-tv .rz::after { content: \"\"; position: absolute; right: 3px; bottom: 3px; width: 12px; height: 12px; border-right: 3px solid var(--accent); border-bottom: 3px solid var(--accent); border-radius: 0 0 3px 0; }" +
    ".tvs-ed .tvs-tv:not(.sel) .rz::after { border-color: var(--dim); }" +
    ".tvs-ed .tvs-tv .sz { font-size: 11px; color: var(--dim); }" +
    ".tvs-ed-h { display: flex; align-items: center; gap: 10px; margin: 8px 0; }" +
    ".tvs-ed-h h2 { margin: 0; font-size: 22px; font-weight: 800; font-stretch: 112%; flex: 1; }" +
    ".tvs-in { min-height: 44px; box-sizing: border-box; width: 100%; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--ink); font: inherit; font-size: 16px; font-weight: 700; padding: 0 12px; }" +
    ".tvs-lbl { display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin: 12px 0 6px; }" +
    ".tvs-chips { display: flex; gap: 6px; flex-wrap: wrap; }" +
    ".tvs-chips button { min-height: 40px; padding: 0 12px; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 700; color: var(--ink); background: var(--lg-fill); border: 1px solid var(--lg-edge); }" +
    ".tvs-hint { font-size: 12px; color: var(--dim); margin: 6px 0 0; }" +
    ".tvs-add { margin-top: 8px; min-height: 44px; width: 100%; border-radius: 8px; border: 1px dashed var(--line); background: none; font: inherit; font-size: 14px; font-weight: 700; color: var(--muted); }" +
    ".tvs-panel { margin-top: 12px; padding: 12px; border-radius: 8px; background: var(--card); }" +
    ".tvs-prow { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; }" +
    ".tvs-prow + .tvs-prow { border-top: 1px solid var(--hair); }" +
    ".tvs-prow > span { font-size: 15px; font-weight: 700; }" +
    ".tvs-prow > span small { display: block; font-size: 12px; color: var(--dim); font-weight: 700; }" +
    ".tvs-prow .seg { width: 170px; flex: none; }" +
    ".tvs-prow .tvs-in { flex: 1; }" +
    ".tvs-del { background: none; border: 0; font: inherit; font-size: 14px; font-weight: 700; color: var(--live); min-height: 44px; padding: 0; }" +
    ".tvs-acts { display: flex; gap: 8px; margin-top: 16px; align-items: stretch; }" +
    ".tvs-acts .full-mu { flex: 1; margin: 0; }" +
    ".tvs-acts .tvs-sw { min-height: 52px; padding: 0 14px; font-size: 14px; }" +
    ".tvs-foot { display: flex; justify-content: space-between; margin-top: 8px; }" +
    ".tvs-foot button { min-height: 44px; background: none; border: 0; font: inherit; font-size: 14px; font-weight: 700; color: var(--muted); padding: 0; }" +
    ".tvs-foot .tvs-del { color: var(--live); }";
    document.head.appendChild(st); })();

  // ---------- saving ----------
  function tvsKeep() { try { localStorage.setItem("slate-tv-setups", JSON.stringify({ list: TVS.list, cur: TVS.cur })); } catch (e) {} }
  function tvsLoad() {
    if (TVS.asked || !db || !uid) return;
    TVS.asked = true;
    db.collection("data/users/" + uid).doc("tv-setups").get().then(function (sn) {
      var d = sn.exists ? sn.data() : null;
      if (d && Array.isArray(d.list)) { TVS.list = d.list; TVS.cur = d.cur || ""; tvsKeep(); }
      TVS.loaded = true;
      if (!TVS.edit && $("view-tv") && !$("view-tv").hidden) keepScroll(renderTV);
    }, function () { TVS.loaded = true; });
  }
  function tvsSave() {
    tvsKeep();
    clearTimeout(TVS.saveT);
    TVS.saveT = setTimeout(function () {
      if (!db || !uid) return;
      db.collection("data/users/" + uid).doc("tv-setups").set({ v: 1, list: TVS.list, cur: TVS.cur }).then(null, function () { toast("Couldn't save your TV setup."); });
    }, 800);
  }
  function tvsPinsSave() { try { localStorage.setItem("slate-tv-pins", JSON.stringify({ d: todayInHome(), p: TVS.pins })); } catch (e) {} }
  function tvsCur() {
    if (TVS.once) return TVS.once;
    var s = TVS.list.filter(function (x) { return x.id === TVS.cur; })[0];
    return s || TVS.list[0] || null;
  }
  function tvsFromPreset(p) {
    return p.t.map(function (r, i) { return { id: "t" + i + Math.random().toString(36).slice(2, 6), name: TV_NAMES[i] || "TV " + (i + 1), x: r[0], y: r[1], w: r[2], h: r[3], main: i === 0, split: 1 }; });
  }

  // ---------- which games go on which TV ----------
  function tvsChan(g) {
    var tv = (g.tv || []).filter(Boolean);
    var nat = tv.filter(function (n) { return NATIONAL_TV.indexOf(n) !== -1; });
    var app = tv.filter(function (n) { return watchOptions(n).length; });
    return { main: nat[0] || app[0] || tv[0] || "", more: tv };
  }
  function tvsRank(g) {
    var h = ruleHits(g), on = !!state.slateSet[g.id];
    return (h.fav ? 1000 : 0) + (on ? 500 : 0) + h.score + (natFor(g) ? 5 : 0) + ((g.tv || []).filter(Boolean).length ? 0 : -300);
  }
  // the setups to choose from today: Live now (when something is on), then each upcoming start time
  function tvsSlots(gs) {
    var out = [], seen = {}, live = gs.filter(function (g) { return status(g).kind === "live"; });
    if (live.length) out.push({ k: "live", label: "Live now", live: true });
    gs.filter(function (g) { return status(g).kind === "upcoming"; }).sort(byStart).forEach(function (g) {
      var t = new Date(g.start).getTime(); if (isNaN(t)) return;
      var b = Math.floor(t / 900000) * 900000;   // start times within the same quarter hour share a setup
      if (seen[b]) return; seen[b] = 1; out.push({ k: String(b), label: timeText(new Date(b).toISOString()), t: b });
    });
    return out.slice(0, 8);
  }
  function tvsPool(gs, slot) {
    var pool;
    if (slot.k === "live") {
      // what's on now, plus games starting within 20 minutes for any TV left over
      var soon = Date.now() + 20 * 60000;
      pool = gs.filter(function (g) { var s = status(g); return s.kind === "live" || (s.kind === "upcoming" && new Date(g.start).getTime() <= soon); });
    } else {
      // everything on at that time: games starting then and ones already under way that won't be over yet
      pool = gs.filter(function (g) {
        var s = status(g); if (s.kind === "over" || s.kind === "tbd") return false;
        var st = new Date(g.start).getTime(); if (isNaN(st)) return false;
        return st < slot.t + 900000 && st + info(g).hrs * 3600000 > slot.t + 900000;
      });
    }
    return pool.sort(function (a, b) {
      var la = status(a).kind === "live" ? 1 : 0, lb = status(b).kind === "live" ? 1 : 0;
      return (slot.k === "live" ? lb - la : 0) || tvsRank(b) - tvsRank(a) || byStart(a, b);
    });
  }
  // fill the TVs: main TV first, then the biggest; each split TV takes 2 or 4. Swaps you made today come first.
  function tvsFill(setup, pool, slot) {
    var order = setup.tvs.map(function (t, i) { return i; }).sort(function (a, b) {
      var A = setup.tvs[a], B = setup.tvs[b];
      return (B.main ? 1 : 0) - (A.main ? 1 : 0) || B.w * B.h - A.w * A.h || a - b;
    });
    var used = {}, byId = {}, out = setup.tvs.map(function () { return []; });
    pool.forEach(function (g) { byId[g.id] = g; });
    var pins = TVS.pins[setup.id + "|" + slot.k] || {};
    order.forEach(function (i) {
      var t = setup.tvs[i], n = Math.max(1, t.split || 1);
      (pins[t.id] || []).forEach(function (id, j) { if (j < n && byId[id] && !used[id]) { out[i][j] = byId[id]; used[id] = 1; } });
    });
    order.forEach(function (i) {
      var t = setup.tvs[i], n = Math.max(1, t.split || 1);
      for (var j = 0; j < n; j++) {
        if (out[i][j]) continue;
        // the main TV takes your team's game first, wherever it ranks
        var g = null;
        if (t.main) g = pool.filter(function (x) { return !used[x.id] && hasFav(x); })[0] || null;
        if (!g) g = pool.filter(function (x) { return !used[x.id]; })[0] || null;
        if (!g) break;
        out[i][j] = g; used[g.id] = 1;
      }
      out[i] = out[i].filter(Boolean);
    });
    return out;
  }
  function tvsWhy(g) {
    if (hasFav(g)) return "Your team";
    var w = state.why && state.why[g.id];
    if (state.slateSet[g.id]) return w && w[0] && w[0] !== "Added" ? "On your slate · " + w[0] : "On your slate";
    return "Also on";
  }
  function tvsStatus(g) {
    var s = status(g), sc = scoreOf(g);
    if (s.kind === "live") return { live: true, text: sc && sc.detail ? sc.detail : "Live" };
    if (s.kind === "over") return { text: "Final" };
    if (s.late) return { text: "Starting soon" };
    return { text: timeText(g.start) };
  }

  // ---------- drawing a TV on the wall ----------
  function tvsPlace(node, t) {
    node.style.left = (t.x / TVW * 100) + "%"; node.style.top = (t.y / TVH * 100) + "%";
    node.style.width = (t.w / TVW * 100) + "%"; node.style.height = (t.h / TVH * 100) + "%";
  }
  function tvsMatch(g, small) {
    var mu = el("span", "tvs-mu"), sc = scoreOf(g), o = sideOrder(g);
    o.forEach(function (s, i) {
      var b = small ? el("span", "ab", abbr(g, s)) : badgeFor(abbr(g, s), g[s], g[s + "Color"], g[s + "Alt"]);
      var n = sc ? el("span", "sc", String(s === "away" ? sc.a : sc.h)) : null;
      if (n && sc.state === "post" && Number(s === "away" ? sc.a : sc.h) < Number(s === "away" ? sc.h : sc.a)) n.className += " lose";
      if (i === 0) { mu.appendChild(b); if (n) mu.appendChild(n); mu.appendChild(el("span", "gap")); }
      else { if (n) mu.appendChild(n); mu.appendChild(b); }
    });
    return mu;
  }
  function tvsTile(t, list, tag) {
    var small = t.w < 9 || t.h < 6;
    var node = el(tag || "div", "tvs-tv" + (t.main ? " main" : "") + (small ? " sm" : ""));
    tvsPlace(node, t);
    var n = Math.max(1, t.split || 1);
    if (n > 1) {
      var hd = el("span", "tn"); hd.appendChild(el("span", null, t.name + " · split " + n)); node.appendChild(hd);
      var grid = el("span", "tvs-split"); grid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))"; if (n === 4) grid.style.gridTemplateRows = "repeat(2, minmax(0, 1fr))";
      for (var j = 0; j < n; j++) {
        var g = list && list[j], c = el("span", "tvs-cell");
        if (g) { c.appendChild(el("span", null, abbr(g, sideOrder(g)[0]) + "–" + abbr(g, sideOrder(g)[1]))); var ch = tvsChan(g).main; if (ch) c.appendChild(el("span", "tvs-ch", NET_SHORT[ch] || ch)); var ts = tvsStatus(g); if (ts.live) c.appendChild(el("span", "live", ts.text)); }
        else if (list) c.appendChild(el("span", "tvs-empty", "Open"));
        grid.appendChild(c);
      }
      node.appendChild(grid);
      return node;
    }
    var g1 = list && list[0];
    var top = el("span", "tn"); top.appendChild(el("span", null, t.name));
    if (g1) { var c1 = tvsChan(g1).main; if (c1) top.appendChild(el("span", "tvs-ch", NET_SHORT[c1] || c1)); }
    node.appendChild(top);
    if (g1) {
      node.appendChild(tvsMatch(g1, small));
      var st = tvsStatus(g1);
      node.appendChild(el("span", "tvs-st" + (st.live ? " live" : ""), st.text));
      node.appendChild(el("span", "tvs-nm", pairText(g1, function (s) { return short(g1, s); }, homeFirst(g1) || g1.neutral ? " vs " : " at ")));
    } else if (list) node.appendChild(el("span", "tvs-empty", "Nothing else on"));
    return node;
  }

  // ---------- the On TV page's top part ----------
  function tvsBlock(body, gs) {
    tvsLoad();
    var setup = tvsCur(), wrap = el("div", "tvs");
    if (!setup) {
      var nw = el("div", "tvs-new");
      nw.appendChild(el("b", null, "Set up your TVs"));
      nw.appendChild(el("p", null, "Shape your TVs once, up to 5. Slate puts your team on the main TV and the other slate games on at the same time on the rest, with the channel to turn each one to."));
      var go = el("button", "full-mu"); go.type = "button"; go.appendChild(el("b", null, "Set up my TVs")); go.appendChild(el("span", null, "Takes about a minute"));
      go.addEventListener("click", function () { tvsOpenEditor(null); });
      nw.appendChild(go); body.appendChild(nw); return;
    }
    // which setup
    var top = el("div", "tvs-top"), pick = el("div", "tvs-pick");
    var all = TVS.once ? [TVS.once].concat(TVS.list) : TVS.list;
    all.forEach(function (s) {
      var b = el("button", "tvs-pill", s === TVS.once ? "Just tonight" : s.name || "My TVs"); b.type = "button";
      b.setAttribute("aria-pressed", s === setup ? "true" : "false");
      b.addEventListener("click", function () { if (s !== TVS.once) { TVS.once = null; TVS.cur = s.id; tvsSave(); } TVS.swap = ""; keepScroll(renderTV); });
      pick.appendChild(b);
    });
    var nb = el("button", "tvs-pill", "+ New"); nb.type = "button"; nb.addEventListener("click", function () { tvsOpenEditor(null); }); pick.appendChild(nb);
    top.appendChild(pick);
    var ed = el("button", "rlink", "Edit"); ed.type = "button"; ed.setAttribute("aria-label", "Edit this TV setup");
    ed.addEventListener("click", function () { tvsOpenEditor(setup); }); top.appendChild(ed);
    wrap.appendChild(top);
    // which time: Live now, or the next start times
    var slots = tvsSlots(gs);
    if (!slots.length) { wrap.appendChild(el("div", "notice", "No games left to put on your TVs this day.")); body.appendChild(wrap); return; }
    var slot = slots.filter(function (s) { return s.k === TVS.slot; })[0] || slots[0];
    if (slots.length > 1) {
      var sr = el("div", "tvs-slots"); sr.setAttribute("role", "group"); sr.setAttribute("aria-label", "When");
      slots.forEach(function (s) {
        var b = el("button"); b.type = "button"; b.setAttribute("aria-pressed", s === slot ? "true" : "false");
        if (s.live) b.appendChild(el("i")); b.appendChild(document.createTextNode(s.label));
        b.addEventListener("click", function () { TVS.slot = s.k; TVS.swap = ""; keepScroll(renderTV); });
        sr.appendChild(b);
      });
      wrap.appendChild(sr);
    }
    var pool = tvsPool(gs, slot), fill = tvsFill(setup, pool, slot);
    var wall = el("div", "tvs-wall"); wall.setAttribute("aria-hidden", "true");
    setup.tvs.forEach(function (t, i) { wall.appendChild(tvsTile(t, fill[i])); });
    wrap.appendChild(wall);
    // the list: what to turn each TV to
    var h = el("div", "tvs-h"); h.appendChild(el("h2", null, slot.live ? "Turn each TV to" : "At " + slot.label + ", turn each TV to"));
    var nGames = fill.reduce(function (a, l) { return a + l.length; }, 0);
    h.appendChild(el("span", "count", nGames + (nGames === 1 ? " game" : " games")));
    wrap.appendChild(h);
    var shown = {}; fill.forEach(function (l) { l.forEach(function (g) { shown[g.id] = 1; }); });
    setup.tvs.forEach(function (t, i) {
      var n = Math.max(1, t.split || 1);
      for (var j = 0; j < n; j++) {
        var g = fill[i][j];
        if (!g && j > 0) continue;
        wrap.appendChild(tvsRow(setup, slot, t, j, n, g, pool, shown));
      }
    });
    body.appendChild(wrap);
  }
  function tvsRow(setup, slot, t, j, n, g, pool, shown) {
    var box = el("div"), row = el("div", "tvs-row");
    var ch = g ? tvsChan(g).main : "";
    row.appendChild(ch ? el("span", "tvs-ch", NET_SHORT[ch] || ch) : el("span", "tvs-noch", g ? "No channel listed" : ""));
    var tx = el("div", "tx"), lbl = n > 1 ? t.name + ", screen " + (j + 1) : t.name;
    if (g) {
      tx.appendChild(el("b", null, pairText(g, function (s) { return short(g, s); }, homeFirst(g) || g.neutral ? " vs " : " at ")));
      var st = tvsStatus(g), sub = el("span");
      sub.appendChild(document.createTextNode(lbl + " · "));
      sub.appendChild(el("span", st.live ? "live" : null, st.text));
      sub.appendChild(document.createTextNode(" · " + tvsWhy(g)));
      var more = tvsChan(g).more.filter(function (m) { return m !== ch; });
      if (more.length) sub.appendChild(document.createTextNode(" · also " + more.slice(0, 2).join(", ")));
      tx.appendChild(sub);
    } else { tx.appendChild(el("b", null, lbl)); tx.appendChild(el("span", null, "Nothing else on at this time")); }
    row.appendChild(tx);
    var key = t.id + ":" + j, alts = pool.filter(function (x) { return !g || x.id !== g.id; });
    if (alts.length) {
      var sw = el("button", "tvs-sw", TVS.swap === key ? "Close" : "Swap"); sw.type = "button";
      sw.setAttribute("aria-expanded", TVS.swap === key ? "true" : "false"); sw.setAttribute("aria-label", "Swap the game on " + lbl);
      sw.addEventListener("click", function () { TVS.swap = TVS.swap === key ? "" : key; keepScroll(renderTV); });
      row.appendChild(sw);
    }
    if (ch) { var wl = watchLink(ch, "chwatch", "Watch"); if (wl) row.appendChild(wl); }
    box.appendChild(row);
    if (TVS.swap === key) {
      var al = el("div", "tvs-alt");
      alts.slice(0, 10).forEach(function (x) {
        var b = el("button"); b.type = "button";
        var c = tvsChan(x).main; if (c) b.appendChild(el("span", "tvs-ch", NET_SHORT[c] || c));
        b.appendChild(el("span", null, pairText(x, function (s) { return short(x, s); }, homeFirst(x) || x.neutral ? " vs " : " at ")));
        b.appendChild(el("span", "d", shown[x.id] ? "On another TV" : tvsStatus(x).text));
        b.addEventListener("click", function () {
          var pk = setup.id + "|" + slot.k, P = TVS.pins[pk] = TVS.pins[pk] || {};
          // the game leaves whatever TV it was pinned to, then takes this spot
          Object.keys(P).forEach(function (tid) { P[tid] = (P[tid] || []).map(function (id) { return id === x.id ? null : id; }); });
          var cur = P[t.id] = (P[t.id] || []).slice(); while (cur.length < j) cur.push(null); cur[j] = x.id;
          TVS.swap = ""; tvsPinsSave(); keepScroll(renderTV);
        });
        al.appendChild(b);
      });
      box.appendChild(al);
    }
    return box;
  }

  // ---------- the editor ----------
  function tvsOpenEditor(setup) {
    var base = setup || { id: "s" + Date.now().toString(36), name: TVS.list.length ? "" : "Living room", tvs: tvsFromPreset(TV_PRESETS[2]) };
    TVS.edit = { orig: setup && setup !== TVS.once ? setup.id : "", once: setup === TVS.once && !!setup, s: JSON.parse(JSON.stringify(base)) };
    TVS.sel = 0; TVS.drawn = false;
    renderTV(); window.scrollTo(0, 0);
  }
  function tvsCloseEditor() { TVS.edit = null; TVS.drawn = false; renderTV(); window.scrollTo(0, 0); }
  function tvsEditor(body) {
    var E = TVS.edit, s = E.s, wrap = el("div", "tvs-ed");
    var hd = el("div", "tvs-ed-h"); hd.appendChild(el("h2", null, E.orig ? "Edit setup" : "New setup")); wrap.appendChild(hd);
    var nm = el("input", "tvs-in"); nm.type = "text"; nm.maxLength = 24; nm.placeholder = "Name, like Living room or Basement"; nm.value = s.name || ""; nm.setAttribute("aria-label", "Setup name");
    nm.addEventListener("input", function () { s.name = nm.value; });
    wrap.appendChild(nm);
    wrap.appendChild(el("span", "tvs-lbl", "Start from a layout"));
    var chips = el("div", "tvs-chips");
    TV_PRESETS.forEach(function (p) {
      var b = el("button", null, p.n); b.type = "button";
      b.addEventListener("click", function () { s.tvs = tvsFromPreset(p); TVS.sel = 0; tvsEdRedraw(); });
      chips.appendChild(b);
    });
    wrap.appendChild(chips);
    var wall = el("div", "tvs-wall"); wall.id = "tvs-ed-wall"; wrap.appendChild(wall);
    wrap.appendChild(el("p", "tvs-hint", "Drag a TV to move it. Drag its corner to make it bigger or smaller."));
    var add = el("button", "tvs-add"); add.type = "button"; add.id = "tvs-ed-add";
    add.addEventListener("click", function () {
      if (s.tvs.length >= TV_MAXN) return;
      var i = s.tvs.length; s.tvs.push({ id: "t" + i + Math.random().toString(36).slice(2, 6), name: TV_NAMES[i] || "TV " + (i + 1), x: 8, y: 4, w: 8, h: 5, main: !s.tvs.some(function (t) { return t.main; }), split: 1 });
      TVS.sel = i; tvsEdRedraw();
    });
    wrap.appendChild(add);
    var panel = el("div", "tvs-panel"); panel.id = "tvs-ed-panel"; wrap.appendChild(panel);
    var acts = el("div", "tvs-acts");
    var save = el("button", "full-mu"); save.type = "button"; save.appendChild(el("b", null, "Save setup")); save.appendChild(el("span", null, "Keep it for next time"));
    save.addEventListener("click", function () {
      s.name = (s.name || "").trim() || "My TVs";
      var at = -1; TVS.list.forEach(function (x, i) { if (x.id === s.id) at = i; });
      if (at === -1) TVS.list.push(s); else TVS.list[at] = s;
      TVS.cur = s.id; TVS.once = null; tvsSave(); tvsCloseEditor();
    });
    acts.appendChild(save);
    var once = el("button", "tvs-sw", "Just tonight"); once.type = "button"; once.setAttribute("aria-label", "Use this setup tonight without saving it");
    once.addEventListener("click", function () { s.id = "once"; TVS.once = s; tvsCloseEditor(); });
    acts.appendChild(once);
    wrap.appendChild(acts);
    var foot = el("div", "tvs-foot");
    var cancel = el("button", null, "Cancel"); cancel.type = "button"; cancel.addEventListener("click", tvsCloseEditor); foot.appendChild(cancel);
    if (E.orig) {
      var del = el("button", "tvs-del", "Delete setup"); del.type = "button";
      del.addEventListener("click", function () {
        var old = TVS.list.slice(), oldCur = TVS.cur;
        TVS.list = TVS.list.filter(function (x) { return x.id !== E.orig; }); if (TVS.cur === E.orig) TVS.cur = TVS.list[0] ? TVS.list[0].id : "";
        tvsSave(); tvsCloseEditor();
        topUndo("Setup deleted", function () { TVS.list = old; TVS.cur = oldCur; tvsSave(); keepScroll(renderTV); });
      });
      foot.appendChild(del);
    }
    wrap.appendChild(foot);
    body.appendChild(wrap);
    tvsEdRedraw();
  }
  // redraws only the wall and the panel (never during a drag: a drag moves the one TV's box)
  function tvsEdRedraw() {
    var E = TVS.edit, s = E && E.s, wall = $("tvs-ed-wall"), panel = $("tvs-ed-panel"), add = $("tvs-ed-add");
    if (!s || !wall) return;
    if (TVS.sel >= s.tvs.length) TVS.sel = Math.max(0, s.tvs.length - 1);
    wall.textContent = "";
    s.tvs.forEach(function (t, i) {
      var node = tvsTile(t, null, "div");
      node.classList.toggle("sel", i === TVS.sel);
      node.setAttribute("role", "button"); node.tabIndex = 0; node.setAttribute("aria-label", t.name + ", tap to change, drag to move");
      node.appendChild(el("span", "sz", t.w + " × " + t.h));
      var rz = el("span", "rz"); rz.setAttribute("aria-hidden", "true"); node.appendChild(rz);
      tvsDrag(node, rz, t, i, wall);
      wall.appendChild(node);
    });
    add.textContent = s.tvs.length >= TV_MAXN ? "5 TVs is the most" : "+ Add a TV (" + s.tvs.length + " of " + TV_MAXN + ")";
    add.disabled = s.tvs.length >= TV_MAXN;
    tvsEdPanel(panel, s);
  }
  function tvsEdPanel(panel, s) {
    panel.textContent = "";
    var t = s.tvs[TVS.sel];
    if (!t) { panel.appendChild(el("p", "tvs-hint", "Add a TV to start.")); return; }
    var r0 = el("div", "tvs-prow"); var nmIn = el("input", "tvs-in"); nmIn.type = "text"; nmIn.maxLength = 18; nmIn.value = t.name; nmIn.setAttribute("aria-label", "TV name");
    nmIn.addEventListener("input", function () { t.name = nmIn.value || "TV"; });
    nmIn.addEventListener("change", function () { tvsEdRedraw(); });
    r0.appendChild(nmIn); panel.appendChild(r0);
    var r1 = el("div", "tvs-prow"), l1 = el("span", null, "Main TV"); l1.appendChild(el("small", null, "Your teams go here first"));
    r1.appendChild(l1);
    var sw = el("button", "switch"); sw.type = "button"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-label", "Main TV"); sw.setAttribute("aria-checked", t.main ? "true" : "false"); sw.appendChild(el("span", "knob"));
    sw.addEventListener("click", function () { var on = !t.main; s.tvs.forEach(function (x) { x.main = false; }); t.main = on; tvsEdRedraw(); });
    r1.appendChild(sw); panel.appendChild(r1);
    var r2 = el("div", "tvs-prow"), l2 = el("span", null, "Split screen"); l2.appendChild(el("small", null, "YouTube TV Multiview and the like"));
    r2.appendChild(l2);
    var seg = el("div", "seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Games on this TV");
    [[1, "1 game"], [2, "2"], [4, "4"]].forEach(function (o) {
      var b = el("button", null, o[1]); b.type = "button"; b.setAttribute("aria-pressed", (t.split || 1) === o[0] ? "true" : "false");
      b.addEventListener("click", function () { t.split = o[0]; tvsEdRedraw(); });
      seg.appendChild(b);
    });
    r2.appendChild(seg); panel.appendChild(r2);
    var r3 = el("div", "tvs-prow");
    var rm = el("button", "tvs-del", "Remove this TV"); rm.type = "button";
    rm.addEventListener("click", function () { var was = t.main; s.tvs.splice(TVS.sel, 1); if (was && s.tvs[0]) s.tvs[0].main = true; TVS.sel = 0; tvsEdRedraw(); });
    r3.appendChild(rm); panel.appendChild(r3);
  }
  // drag a TV, or its corner, in grid steps. Only the TV's own box moves while the finger is down; the panel redraws after.
  function tvsDrag(node, rz, t, i, wall) {
    node.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      var resize = e.target === rz, r = wall.getBoundingClientRect(), ux = r.width / TVW, uy = r.height / TVH;
      var sx = e.clientX, sy = e.clientY, o = { x: t.x, y: t.y, w: t.w, h: t.h }, moved = false;
      try { node.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
      if (TVS.sel !== i) { TVS.sel = i; [].forEach.call(wall.children, function (c, k) { c.classList.toggle("sel", k === i); }); }
      function mv(ev) {
        var dx = Math.round((ev.clientX - sx) / ux), dy = Math.round((ev.clientY - sy) / uy);
        if (dx || dy) moved = true;
        if (resize) { t.w = Math.max(4, Math.min(TVW - o.x, o.w + dx)); t.h = Math.max(3, Math.min(TVH - o.y, o.h + dy)); }
        else { t.x = Math.max(0, Math.min(TVW - o.w, o.x + dx)); t.y = Math.max(0, Math.min(TVH - o.h, o.y + dy)); }
        tvsPlace(node, t);
        var sz = node.querySelector(".sz"); if (sz) sz.textContent = t.w + " × " + t.h;
      }
      function up() {
        node.removeEventListener("pointermove", mv); node.removeEventListener("pointerup", up); node.removeEventListener("pointercancel", up);
        // the redraw waits until the finger has been up 0.4s, like every other redraw in Slate
        setTimeout(function () { if (TVS.edit) tvsEdRedraw(); }, moved ? 420 : 0);
      }
      node.addEventListener("pointermove", mv); node.addEventListener("pointerup", up); node.addEventListener("pointercancel", up);
    });
  }

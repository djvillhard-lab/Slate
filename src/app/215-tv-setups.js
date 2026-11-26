  // ---------- TV watch setups on On TV (3.135.0, DJ Nov 25, 2026) ----------
  // You shape your TVs (up to 5: drag to move, drag the corner to resize, a split screen for 2 or 4 games) and save the
  // setup. Slate rules fill them: your team on the main TV, the other slate games on at the same time on the rest, best
  // first. It's about the matchup; each TV shows its channel big, since you turn every TV to it yourself.
  // Live games make a "Live now" setup; with nothing live it opens on the next start time. A game that ends drops out
  // and the next one takes its TV. Saved with the profile in data/users/<uid>/tv-setups (a copy on this phone for speed).
  // Positions are grid units on a 32 x 22 wall (TVW x TVH), so a setup looks the same on every screen size.
  // 3.135.1 (DJ): a bigger wall, with room above and beside the main TV. Setups saved on the first 24 x 14 wall are
  // scaled up once (tvsGrid); new ones carry g: 2.
  var TVW = 32, TVH = 22, TV_MAXN = 5;
  // 3.135.1 (DJ): My TVs is On TV's first tab and the one it opens on; the channel list (All) is second.
  // TV_TABS lives in 070-navigation.js (swipe order); it's put in the same order as the tab row here.
  // 3.153.0 (DJ): two tabs, My TVs and Channels; the channel list has its own filters (TV.f in 210-tv.js)
  TV_TABS.splice(0, TV_TABS.length, "setups", "channels");
  if (state.tvFilter === "all") state.tvFilter = "setups";
  else if (state.tvFilter === "national" || state.tvFilter === "streaming") { TV.f = state.tvFilter; state.tvFilter = "channels"; }
  var TVS = { rules: { pins: [], lg: [] }, list: [], cur: "", loaded: false, asked: false, slot: "", edit: null, sel: 0, once: null, swap: "", pins: {}, saveT: null };
  try { var tvc = JSON.parse(localStorage.getItem("slate-tv-setups") || "null"); if (tvc && Array.isArray(tvc.list)) { TVS.list = tvc.list; TVS.cur = tvc.cur || ""; if (tvc.rules) TVS.rules = tvsRulesNorm(tvc.rules); } } catch (e) {}
  try { var tvp = JSON.parse(localStorage.getItem("slate-tv-pins") || "null"); if (tvp && tvp.d === todayInHome()) TVS.pins = tvp.p || {}; } catch (e) {}
  // 3.135.1 (DJ): pick how many TVs first, then a layout for that many. The main TV is always the first box.
  var TV_PRESETS = {
    1: [{ n: "One TV", t: [[6, 5, 20, 12]] }],
    2: [{ n: "Small one up to the right", t: [[3, 7, 20, 12], [24, 2, 8, 5]] },
        { n: "Small one to the right", t: [[3, 5, 20, 12], [24, 10, 8, 5]] },
        { n: "Small one up to the left", t: [[9, 7, 20, 12], [0, 2, 8, 5]] },
        { n: "Side by side", t: [[0, 6, 15, 9], [17, 6, 15, 9]] }],
    3: [{ n: "Big + 2 below", t: [[7, 1, 18, 11], [2, 14, 12, 7], [18, 14, 12, 7]] },
        { n: "Big + 2 on the right", t: [[0, 5, 21, 13], [22, 3, 10, 6], [22, 12, 10, 6]] },
        { n: "Big + one each side", t: [[8, 5, 16, 10], [0, 7, 7, 5], [25, 7, 7, 5]] }],
    4: [{ n: "Big + 3 below", t: [[7, 1, 18, 11], [0, 14, 10, 6], [11, 14, 10, 6], [22, 14, 10, 6]] },
        { n: "Big + 3 on the right", t: [[0, 5, 21, 13], [22, 1, 10, 6], [22, 8, 10, 6], [22, 15, 10, 6]] },
        { n: "2 × 2 wall", t: [[1, 1, 14, 9], [17, 1, 14, 9], [1, 12, 14, 9], [17, 12, 14, 9]] }],
    5: [{ n: "Big + 4 below", t: [[8, 1, 16, 10], [0, 14, 7, 5], [8, 14, 7, 5], [16, 14, 7, 5], [24, 14, 7, 5]] },
        { n: "Big + 2 each side", t: [[8, 5, 16, 10], [0, 3, 7, 5], [0, 11, 7, 5], [25, 3, 7, 5], [25, 11, 7, 5]] },
        { n: "2 big + 3 below", t: [[0, 1, 15, 9], [17, 1, 15, 9], [0, 13, 10, 6], [11, 13, 10, 6], [22, 13, 10, 6]] }]
  };
  var TV_NAMES = ["Main TV", "TV 2", "TV 3", "TV 4", "TV 5"];  // names you can change; a layout doesn't know which side is left
  (function () { var st = document.createElement("style"); st.id = "tvs-css"; st.textContent =
    ".tvs { margin: 4px 0 20px; padding-bottom: 88px; }" +
    ".tvs-top { display: flex; align-items: center; gap: 8px; min-height: 44px; }" +
    ".tvs-top .rlink { margin: 0 0 0 auto; min-height: 44px; }" +
    ".tvs-acts { display: flex; flex: none; gap: 12px; margin-left: auto; } .tvs-acts .rlink { margin: 0; } .tvs-acts .rlink:first-child { margin-right: 0 !important; }" +
    ".tvs-pick { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex: 1; min-width: 0; }" +
    ".tvs-pick::-webkit-scrollbar { display: none; }" +
    ".tvs-pill { flex: none; min-height: 40px; padding: 0 14px; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 700; color: var(--muted); background: var(--lg-fill); border: 1px solid var(--lg-edge); box-shadow: var(--lg-hi); }" +
    ".tvs-pill[aria-pressed=\"true\"] { background: var(--lg-lit); color: var(--ink); }" +
    ".tvs-slots { display: flex; gap: 2px; padding: 4px; margin: 8px 0 0; border-radius: 999px; background: var(--lg-fill); border: 1px solid var(--lg-edge); box-shadow: var(--lg-hi); overflow-x: auto; scrollbar-width: none; }" +
    ".tvs-slots::-webkit-scrollbar { display: none; }" +
    "@container (max-width: 240px) { .tvs-swn .pre { display: none; } }" +
    ".tvs-slots { touch-action: pan-x; overscroll-behavior-x: contain; }" +
    ".tvs-swn { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; padding: 2cqh 4cqw; background: rgba(0,0,0,.72); color: #fff; font-size: clamp(8px, 7.5cqh, 14px); font-weight: 800; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }" +
    ".tvs-row .tx > span.tvs-swl { display: block; color: var(--ink); font-weight: 700; }" +
    ".tvs-slots button { flex: 1 0 auto; min-height: 36px; padding: 0 12px; border: 0; border-radius: 999px; background: none; font: inherit; font-size: 13px; font-weight: 700; color: var(--muted); display: flex; align-items: center; justify-content: center; gap: 6px; }" +
    ".tvs-slots button[aria-pressed=\"true\"] { background: var(--lg-lit); color: var(--ink); }" +
    ".tvs-slots i { width: 7px; height: 7px; border-radius: 50%; background: var(--live); }" +
    ".tvs-wall { position: relative; margin-top: 10px; border-radius: 8px; background: var(--card); aspect-ratio: 32 / 22; }" +
    ".tvs-cnt { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }" +
    ".tvs-cnt button { min-height: 44px; border-radius: 8px; font: inherit; font-size: 17px; font-weight: 800; font-stretch: 88%; color: var(--ink); background: var(--lg-fill); border: 1px solid var(--lg-edge); }" +
    ".tvs-cnt button[aria-pressed=\"true\"] { background: var(--accent-fill); color: var(--on-accent); border-color: var(--accent-fill); }" +
    ".tvs-lays { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }" +
    ".tvs-lay { display: flex; flex-direction: column; gap: 6px; padding: 8px; min-height: 44px; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 700; color: var(--ink); text-align: left; background: var(--card); border: 1px solid var(--line); }" +
    ".tvs-lay[aria-pressed=\"true\"] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }" +
    ".tvs-mini { position: relative; display: block; width: 100%; aspect-ratio: 32 / 22; }" +
    ".tvs-mini i { position: absolute; box-sizing: border-box; border-radius: 2px; border: 1px solid var(--muted); }" +
    ".tvs-mini i:first-child { border: 2px solid var(--accent); }" +
    ".tvs-tv { position: absolute; box-sizing: border-box; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); overflow: hidden; container-type: size; font: inherit; color: var(--ink); text-align: left; }" +
    ".tvs-tv.main { border: 2px solid var(--accent); }" +
    ".tvs-pl { position: absolute; top: 0; bottom: 0; width: 34%; pointer-events: none; }" +
    ".tvs-pl.l { left: 0; background: linear-gradient(90deg, color-mix(in srgb, var(--tc) 62%, transparent), color-mix(in srgb, var(--tc) 30%, transparent)); clip-path: polygon(0 0, 100% 0, 80% 100%, 0 100%); }" +
    ".tvs-pl.r { right: 0; background: linear-gradient(270deg, color-mix(in srgb, var(--tc) 62%, transparent), color-mix(in srgb, var(--tc) 30%, transparent)); clip-path: polygon(20% 0, 100% 0, 100% 100%, 0 100%); }" +
    ".tvs-top2 { position: absolute; left: 0; right: 0; top: 0; z-index: 1; display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; padding: clamp(3px, 3cqh, 8px) clamp(4px, 3cqw, 10px); }" +
    ".tvs-tn { min-width: 0; font-size: clamp(9px, 8cqh, 14px); font-weight: 800; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px rgba(0,0,0,.6); }" +
    ".tvs-ch { flex: none; padding: .12em .4em; border-radius: 4px; background: var(--ink); color: var(--bg); font-size: clamp(11px, min(14cqh, 10cqw), 28px); font-weight: 800; font-stretch: 88%; line-height: 1.2; white-space: nowrap; }" +
    ".tvs-ch.none { background: var(--raise); color: var(--muted); font-size: clamp(9px, 7cqh, 12px); }" +
    ".tvs-fo { position: absolute; left: 0; right: 0; top: max(18px, 22cqh); bottom: 0; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; padding: 0 2cqw 4cqh; }" +
    ".tvs-sd { display: flex; flex-direction: column; align-items: center; gap: 2cqh; min-width: 0; }" +
    ".tvs-sd .badge { width: clamp(22px, min(40cqh, 24cqw), 104px); height: clamp(22px, min(40cqh, 24cqw), 104px); border-radius: 6px; font-size: clamp(10px, 10cqh, 22px); }" +
    ".tvs-sd .badge .badge-logo { top: 0; height: 100%; margin-top: 0; }" +
    ".tvs-sd .ab { font-size: clamp(9px, 9cqh, 18px); font-weight: 800; font-stretch: 88%; text-shadow: 0 1px 2px rgba(0,0,0,.6); }" +
    ".tvs-mid { display: flex; flex-direction: column; align-items: center; gap: 3cqh; }" +
    ".tvs-sc { display: flex; align-items: baseline; gap: 1.5cqw; font-size: clamp(16px, min(32cqh, 15cqw), 80px); font-stretch: 66%; line-height: 1; }" +
    ".tvs-sc b { font-weight: 800; } .tvs-sc b.lose { color: var(--muted); } .tvs-sc i { font-style: normal; color: var(--dim); font-size: .55em; }" +
    ".tvs-clk { padding: .15em .45em; border-radius: 2px; background: var(--raise); color: var(--ink); font-size: clamp(9px, min(10cqh, 7cqw), 20px); font-weight: 800; font-stretch: 88%; white-space: nowrap; }" +
    ".tvs-clk.live { background: var(--live); color: #fff; }" +
    ".tvs-clk.big { font-size: clamp(11px, min(15cqh, 9cqw), 30px); }" +
    "@container (max-height: 74px) { .tvs-sd .ab { display: none; } }" +
    "@container (max-width: 120px) { .tvs-tn { display: none; } }" +
    ".tvs-split { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px; background: var(--line); }" +
    ".tvs-split.four { grid-template-rows: repeat(2, minmax(0, 1fr)); }" +
    ".tvs-cell { position: relative; overflow: hidden; background: var(--bg); container-type: size; }" +
    ".tvs-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; color: var(--dim); }" +
    ".tvs-tv.ed { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 4px; }" +
    ".tvs-ename { font-size: clamp(11px, min(16cqh, 11cqw), 24px); font-weight: 800; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }" +
    ".tvs-esub { font-size: clamp(9px, 9cqh, 13px); color: var(--muted); }" +
    ".tvs-which { display: flex; gap: 6px; flex-wrap: wrap; }" +
    ".tvs-which button { min-height: 44px; padding: 0 14px; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 700; color: var(--ink); background: var(--lg-fill); border: 1px solid var(--lg-edge); }" +
    ".tvs-which button[aria-pressed=\"true\"] { background: var(--accent-fill); color: var(--on-accent); border-color: var(--accent-fill); }" +
    ".tvs-lbl.first { margin-top: 0; }" +
    ".tvs-panel > .tvs-del { margin-top: 4px; }" +
    ".tvs-prow.col { flex-direction: column; align-items: stretch; padding: 8px 0; }" +
    ".tvs-prow.col .seg { width: auto; }" +
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
    ".tvs-prow { border-top: 1px solid var(--hair); margin-top: 12px; }" +
    ".tvs-prow > span { font-size: 15px; font-weight: 700; }" +
    ".tvs-prow > span small { display: block; font-size: 12px; color: var(--dim); font-weight: 700; }" +
    ".tvs-prow .seg { width: 170px; flex: none; }" +
    ".tvs-prow .tvs-in { flex: 1; }" +
    ".tvs-ru h3 { margin: 22px 0 2px; font-size: 15px; font-weight: 800; color: var(--head); }" +
    ".tvs-ru .tvs-hint { margin: 0 0 8px; }" +
    ".tvs-rrow { display: flex; align-items: center; gap: 10px; min-height: 56px; border-top: 1px solid var(--hair); }" +
    ".tvs-rrow .tx { flex: 1; min-width: 0; font-size: 15px; font-weight: 700; }" +
    ".tvs-rrow .tx small { display: block; font-size: 12px; color: var(--dim); }" +
    ".tvs-rrow .num { width: 20px; flex: none; font-size: 13px; font-weight: 800; color: var(--dim); }" +
    ".tvs-sel { min-height: 40px; max-width: 46%; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--accent); font: inherit; font-size: 14px; font-weight: 800; padding: 0 8px; }" +
    ".tvs-x { flex: none; width: 44px; height: 44px; border: 0; background: none; color: var(--dim); font: inherit; font-size: 20px; }" +
    ".tvs-grip { flex: none; width: 44px; height: 44px; display: grid; place-items: center; color: var(--dim); font-size: 18px; letter-spacing: -3px; touch-action: none; cursor: grab; }" +
    ".tvs-rrow.drag { background: var(--card); box-shadow: 0 4px 16px var(--shadow, rgba(0,0,0,.4)); position: relative; z-index: 2; }" +
    ".tvs-pt { margin-top: 4px; min-height: 32px; padding: 0 10px; border-radius: 999px; font: inherit; font-size: 12px; font-weight: 700; color: var(--muted); background: var(--lg-fill); border: 1px solid var(--lg-edge); }" +
    ".tvs-pt[aria-pressed=\"true\"] { background: var(--accent-fill); color: var(--on-accent); border-color: var(--accent-fill); }" +
    ".tvs-addl { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }" +
    ".tvs-addl button { min-height: 40px; padding: 0 12px; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 700; color: var(--ink); background: var(--lg-fill); border: 1px solid var(--lg-edge); }" +
    ".tvs-del { background: none; border: 0; font: inherit; font-size: 14px; font-weight: 700; color: var(--live); min-height: 44px; padding: 0; }" +
    ".tvs-acts { display: flex; gap: 8px; margin-top: 16px; align-items: stretch; }" +
    ".tvs-acts .full-mu { flex: 1; margin: 0; }" +
    ".tvs-acts .tvs-sw { min-height: 52px; padding: 0 14px; font-size: 14px; }" +
    ".tvs-foot { display: flex; justify-content: space-between; margin-top: 8px; }" +
    ".tvs-foot button { min-height: 44px; background: none; border: 0; font: inherit; font-size: 14px; font-weight: 700; color: var(--muted); padding: 0; }" +
    ".tvs-foot .tvs-del { color: var(--live); }";
    document.head.appendChild(st); })();

  // ---------- saving ----------
  function tvsRulesNorm(r) { r = r || {}; return { pins: Array.isArray(r.pins) ? r.pins : [], lg: Array.isArray(r.lg) ? r.lg : [] }; }
  function tvsKeep() { try { localStorage.setItem("slate-tv-setups", JSON.stringify({ list: TVS.list, cur: TVS.cur, rules: TVS.rules })); } catch (e) {} }
  function tvsLoad() {
    if (TVS.asked || !db || !uid) return;
    TVS.asked = true;
    db.collection("data/users/" + uid).doc("tv-setups").get().then(function (sn) {
      var d = sn.exists ? sn.data() : null;
      if (d && Array.isArray(d.list)) { TVS.list = d.list; TVS.cur = d.cur || ""; TVS.rules = tvsRulesNorm(d.rules); tvsKeep(); }
      TVS.loaded = true;
      if (!TVS.edit && $("view-tv") && !$("view-tv").hidden) keepScroll(renderTV);
    }, function () { TVS.loaded = true; });
  }
  function tvsSave() {
    tvsKeep();
    clearTimeout(TVS.saveT);
    TVS.saveT = setTimeout(function () {
      if (!db || !uid) return;
      db.collection("data/users/" + uid).doc("tv-setups").set({ v: 1, list: TVS.list, cur: TVS.cur, rules: TVS.rules }).then(null, function () { toast("Couldn't save your TV setup."); });
    }, 800);
  }
  function tvsPinsSave() { try { localStorage.setItem("slate-tv-pins", JSON.stringify({ d: todayInHome(), p: TVS.pins })); } catch (e) {} }
  function tvsCur() {
    if (TVS.once) return TVS.once;
    TVS.list.forEach(tvsGrid);
    var s = TVS.list.filter(function (x) { return x.id === TVS.cur; })[0];
    return s || TVS.list[0] || null;
  }
  // setups saved on the first, smaller wall (3.135.0) are scaled to the 32 x 22 one, once
  function tvsGrid(st) {
    if (!st || st.g === 2) return st;
    var kx = 32 / 24, ky = 22 / 14;
    (st.tvs || []).forEach(function (t) { t.x = Math.round(t.x * kx); t.y = Math.round(t.y * ky); t.w = Math.round(t.w * kx); t.h = Math.round(t.h * ky); });
    st.g = 2; return st;
  }
  function tvsFromPreset(p) {
    return p.t.map(function (r, i) { return { id: "t" + i + Math.random().toString(36).slice(2, 6), name: TV_NAMES[i] || "TV " + (i + 1), x: r[0], y: r[1], w: r[2], h: r[3], main: i === 0, split: 1 }; });
  }

  // ---------- which games go on which TV ----------
  // 3.140.5 (DJ): a split-screen TV is YouTube TV Multiview, which only splits YouTube TV's own channels. So it only gets
  // games on a channel YouTube TV carries: the national channels the Watch popup already sends to YouTube TV, less the
  // ones it doesn't carry. Streaming-only games (Prime, Netflix, Peacock, ESPN+) never go on it.
  var TV_NOT_YT = { "NBCSN": 1, "beIN SPORTS": 1 };
  function tvsYTch(n) { return NATIONAL_TV.indexOf(n) !== -1 && !TV_NOT_YT[n]; }
  function tvsYT(g) { return (g.tv || []).some(tvsYTch); }
  function tvsChan(g, yt) {
    var tv = (g.tv || []).filter(Boolean);
    if (yt) { var y = tv.filter(tvsYTch); if (y.length) return { main: y[0], more: tv }; }
    var nat = tv.filter(function (n) { return NATIONAL_TV.indexOf(n) !== -1; });
    var app = tv.filter(function (n) { return watchOptions(n).length; });
    return { main: nat[0] || app[0] || tv[0] || "", more: tv };
  }
  // TV rules (3.142.0, DJ): your league order ranks above your slate and the matchup, below your own teams.
  // A league marked "prime time only" counts only for games starting 7 PM Central or later (Slate's prime time).
  function tvsLgRank(g) {
    var L = TVS.rules.lg;
    for (var i = 0; i < L.length; i++) if (L[i].k === g.league && (!L[i].prime || hourCT(g.start) >= 19)) return 700 + (L.length - i) * 10;
    return 0;
  }
  function tvsRank(g) {
    var h = ruleHits(g), on = !!state.slateSet[g.id];
    return (h.fav ? 1000 : 0) + tvsLgRank(g) + (on ? 500 : 0) + h.score + (natFor(g) ? 5 : 0) + ((g.tv || []).filter(Boolean).length ? 0 : -300);
  }
  // a team pin's game, and the TV it asks for (its place in this setup; a setup without that TV uses its main TV)
  function tvsPinOf(g) {
    var P = TVS.rules.pins;
    for (var i = 0; i < P.length; i++) if (teamMatch(g.away, P[i].team, g.league) || teamMatch(g.home, P[i].team, g.league)) return P[i];
    return null;
  }
  function tvsPinName(tv, setup) {
    if (tv === "main" || !tv) return "the Main TV";
    var t = setup && setup.tvs[tv - 1]; return t && !t.main ? t.name : "TV " + tv;
  }
  // a row that scrolls sideways: its touches never reach the page swipe or pull-down (3.153.0, DJ couldn't scroll the times)
  function tvsNoSwipe(node) {
    ["touchstart", "touchmove", "touchend"].forEach(function (k) { node.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); });
    return node;
  }
  // 3.153.0 (DJ): a game still on when a game your rules rank higher starts gets a note on its TV:
  // "Switch at 8:00 PM to LAL vs BOS". Game length per sport is LEAGUES[k].hrs (info(g).hrs).
  function tvsSwitches(setup, gs, slot, slots, fill) {
    var notes = fill.map(function () { return []; }), from = slot.live ? Date.now() : slot.t;
    var later = slots.filter(function (s) { return !s.live && s.t > from; });
    fill.forEach(function (l, i) {
      l.forEach(function (g, j) {
        var end = new Date(g.start).getTime() + info(g).hrs * 3600000;
        for (var q = 0; q < later.length; q++) {
          var s = later[q]; if (s.t >= end - 10 * 60000) break;   // over by then: the TV just moves on
          var pool = tvsPool(gs, s); if (!pool.some(function (x) { return x.id === g.id; })) break;
          var f2 = tvsFill(setup, pool, s);
          if (f2[i].some(function (x) { return x.id === g.id; })) continue;
          var mine = fill[i].map(function (x) { return x.id; });
          var nx = f2[i].filter(function (x) { return mine.indexOf(x.id) === -1; })[0] || f2[i][j];
          if (nx) notes[i][j] = { at: s, g: nx };
          break;
        }
      });
    });
    return notes;
  }
  function tvsNoteText(nt) { return "Switch at " + nt.at.label + " to " + abbr(nt.g, sideOrder(nt.g)[0]) + " vs " + abbr(nt.g, sideOrder(nt.g)[1]); }
  // the setups to choose from today: Live now (when something is on), then each upcoming start time
  function tvsSlots(gs) {
    var out = [], seen = {}, live = gs.filter(function (g) { return status(g).kind === "live"; });
    if (live.length) out.push({ k: "live", label: "Live now", live: true });
    gs.filter(function (g) { return status(g).kind === "upcoming"; }).sort(byStart).forEach(function (g) {
      var t = new Date(g.start).getTime(); if (isNaN(t)) return;
      var b = Math.floor(t / 900000) * 900000;   // start times within the same quarter hour share a setup
      if (seen[b]) return; seen[b] = 1; out.push({ k: String(b), label: timeText(new Date(b).toISOString()), t: b });
    });
    return out.slice(0, 24);   // the row scrolls (3.153.0), so the evening's start times fit too
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
      (pins[t.id] || []).forEach(function (id, j) { if (j < n && byId[id] && !used[id] && (n === 1 || tvsYT(byId[id]))) { out[i][j] = byId[id]; used[id] = 1; } });
    });
    // your team rules: "Manchester United always goes on the Main TV", in the order you listed them
    var mainI = order[0];
    TVS.rules.pins.forEach(function (p) {
      pool.forEach(function (g) {
        if (used[g.id] || !(teamMatch(g.away, p.team, g.league) || teamMatch(g.home, p.team, g.league))) return;
        var want = p.tv === "main" || !p.tv || !setup.tvs[p.tv - 1] ? mainI : p.tv - 1;
        var tries = [want].concat(order.filter(function (k) { return k !== want; }));
        for (var q = 0; q < tries.length; q++) {
          var k = tries[q], tt = setup.tvs[k], nn = Math.max(1, tt.split || 1);
          if (nn > 1 && !tvsYT(g)) continue;
          var free = -1; for (var jj = 0; jj < nn; jj++) if (!out[k][jj]) { free = jj; break; }
          if (free === -1) continue;
          out[k][free] = g; used[g.id] = 1; return;
        }
      });
    });
    order.forEach(function (i) {
      var t = setup.tvs[i], n = Math.max(1, t.split || 1);
      for (var j = 0; j < n; j++) {
        if (out[i][j]) continue;
        // the main TV takes your team's game first, wherever it ranks
        var g = null, ok = function (x) { return !used[x.id] && (n === 1 || tvsYT(x)); };
        if (t.main) g = pool.filter(function (x) { return ok(x) && hasFav(x); })[0] || null;
        if (!g) g = pool.filter(ok)[0] || null;
        if (!g) break;
        out[i][j] = g; used[g.id] = 1;
      }
    });
    out = out.map(function (l) { return l.filter(Boolean); });
    return out;
  }
  function tvsWhy(g) {
    if (tvsPinOf(g)) return "Your rule";
    if (hasFav(g)) return "Your team";
    if (tvsLgRank(g)) return "Your league order";
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
  function tvsPlace(node, t, bx) {
    bx = bx || { x: 0, y: 0, w: TVW, h: TVH };
    node.style.left = ((t.x - bx.x) / bx.w * 100) + "%"; node.style.top = ((t.y - bx.y) / bx.h * 100) + "%";
    node.style.width = (t.w / bx.w * 100) + "%"; node.style.height = (t.h / bx.h * 100) + "%";
  }
  // the part of the wall the TVs use, plus a grid unit around them, so the view doesn't show empty wall
  function tvsBox(tvs) {
    var x0 = TVW, y0 = TVH, x1 = 0, y1 = 0;
    tvs.forEach(function (t) { x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x + t.w); y1 = Math.max(y1, t.y + t.h); });
    if (x1 <= x0) return { x: 0, y: 0, w: TVW, h: TVH };
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(TVW, x1 + 1); y1 = Math.min(TVH, y1 + 1);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // 3.137.2 (DJ): each TV is drawn like the Live notification's face-off card: slanted team-color panels at each edge,
  // the logos big with the abbreviation under them, the score big in the middle and the clock in a square tag.
  // Sizes follow the TV's own box (container units), so a small TV is a smaller copy, and the channel is always big.
  function tvsColor(g, s) {
    var c = g[s + "Color"]; if (hexOk(c)) return c;
    var tl = teamLook(g[s]); if (tl && hexOk(tl[1])) return tl[1];
    var kt = typeof teamByName === "function" ? teamByName(g[s]) : null; if (kt && hexOk(kt.c1)) return kt.c1;
    return colors(g[s])[0];
  }
  function tvsFace(box, g, name, yt, note) {
    var o = sideOrder(g), sc = scoreOf(g), st = tvsStatus(g);
    o.forEach(function (s, i) { var pl = el("span", "tvs-pl " + (i ? "r" : "l")); pl.style.setProperty("--tc", tvsColor(g, s)); box.appendChild(pl); });
    var top = el("span", "tvs-top2");
    top.appendChild(el("span", "tvs-tn", name || ""));
    var ch = tvsChan(g, yt).main;
    top.appendChild(ch ? el("span", "tvs-ch", NET_SHORT[ch] || ch) : el("span", "tvs-ch none", "No channel"));
    box.appendChild(top);
    var fo = el("span", "tvs-fo");
    var side = function (s) { var w = el("span", "tvs-sd"); w.appendChild(badgeFor(abbr(g, s), g[s], g[s + "Color"], g[s + "Alt"])); w.appendChild(el("span", "ab", abbr(g, s))); return w; };
    fo.appendChild(side(o[0]));
    var mid = el("span", "tvs-mid");
    if (sc) {
      var a = Number(o[0] === "away" ? sc.a : sc.h), h = Number(o[1] === "away" ? sc.a : sc.h), row = el("span", "tvs-sc");
      row.appendChild(el("b", sc.state === "post" && a < h ? "lose" : null, String(a)));
      row.appendChild(el("i", null, "–"));
      row.appendChild(el("b", sc.state === "post" && h < a ? "lose" : null, String(h)));
      mid.appendChild(row);
    }
    mid.appendChild(el("span", "tvs-clk" + (st.live ? " live" : "") + (sc ? "" : " big"), st.text));
    fo.appendChild(mid);
    fo.appendChild(side(o[1]));
    box.appendChild(fo);
    if (note) {   // small TVs drop "Switch at" and keep the time and the game
      var sn = el("span", "tvs-swn"); sn.appendChild(el("span", "pre", "Switch at "));
      sn.appendChild(document.createTextNode(note.at.label + ": " + abbr(note.g, sideOrder(note.g)[0]) + " vs " + abbr(note.g, sideOrder(note.g)[1])));
      box.appendChild(sn);
    }
  }
  function tvsTile(t, list, tag, bx, notes) {
    notes = notes || [];
    var node = el(tag || "div", "tvs-tv" + (t.main ? " main" : ""));
    tvsPlace(node, t, bx);
    var n = Math.max(1, t.split || 1);
    if (!list) {   // the editor: the TV's name and what it's set to, big enough to read
      node.classList.add("ed");
      node.appendChild(el("span", "tvs-ename", t.name));
      var bits = []; if (t.main) bits.push("My teams"); if (n > 1) bits.push(n + " games");
      if (bits.length) node.appendChild(el("span", "tvs-esub", bits.join(" · ")));
      return node;
    }
    if (n > 1) {
      node.classList.add("split");
      var grid = el("span", "tvs-split" + (n === 4 ? " four" : ""));
      for (var j = 0; j < n; j++) {
        var c = el("span", "tvs-cell"), g = list[j];
        if (g) tvsFace(c, g, j === 0 ? t.name : "", true, notes[j]); else { c.appendChild(el("span", "tvs-tn", j === 0 ? t.name : "")); c.appendChild(el("span", "tvs-empty", "No YouTube TV game")); }
        grid.appendChild(c);
      }
      node.appendChild(grid);
      return node;
    }
    if (list[0]) tvsFace(node, list[0], t.name, false, notes[0]);
    else { node.appendChild(el("span", "tvs-tn", t.name)); node.appendChild(el("span", "tvs-empty", "Nothing else on")); }
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
    var ru = el("button", "rlink", "Rules"); ru.type = "button"; ru.setAttribute("aria-label", "Which game goes where: your TV rules");
    ru.addEventListener("click", function () { TVS.edit = { rules: true }; TVS.drawn = false; renderTV(); window.scrollTo(0, 0); });
    var acts = el("span", "tvs-acts"); acts.appendChild(ru); top.appendChild(acts);
    var ed = el("button", "rlink", "Edit"); ed.type = "button"; ed.setAttribute("aria-label", "Edit this TV setup");
    ed.addEventListener("click", function () { tvsOpenEditor(setup); }); acts.appendChild(ed);
    wrap.appendChild(top);
    // which time: Live now, or the next start times
    var slots = tvsSlots(gs);
    if (!slots.length) { wrap.appendChild(el("div", "notice", "No games left to put on your TVs this day.")); body.appendChild(wrap); return; }
    // 3.137.2 (DJ): opens on Live now; a time you pick holds while you're here, then it's back to Live now
    if (TVS.slot && Date.now() - (TVS.slotAt || 0) > 15 * 60000) TVS.slot = "";
    var slot = slots.filter(function (s) { return s.k === TVS.slot; })[0] || slots[0];
    if (slots.length > 1) {
      wrap.appendChild(el("span", "tvs-lbl", "What's on at"));
      var sr = tvsNoSwipe(el("div", "tvs-slots")); sr.setAttribute("role", "group"); sr.setAttribute("aria-label", "What's on at");
      slots.forEach(function (s) {
        var b = el("button"); b.type = "button"; b.setAttribute("aria-pressed", s === slot ? "true" : "false");
        if (s.live) b.appendChild(el("i")); b.appendChild(document.createTextNode(s.label));
        b.addEventListener("click", function () { TVS.slot = s.k; TVS.slotAt = Date.now(); TVS.swap = ""; keepScroll(renderTV); });
        sr.appendChild(b);
      });
      wrap.appendChild(sr);
      // the picked time stays in view after a redraw
      requestAnimationFrame(function () { var on = sr.querySelector('[aria-pressed="true"]'); if (on && on.offsetLeft + on.offsetWidth > sr.clientWidth) sr.scrollLeft = on.offsetLeft - 8; });
    }
    var pool = tvsPool(gs, slot), fill = tvsFill(setup, pool, slot), notes = tvsSwitches(setup, gs, slot, slots, fill);
    var wall = el("div", "tvs-wall"), bx = tvsBox(setup.tvs); wall.setAttribute("aria-hidden", "true");
    wall.style.aspectRatio = bx.w + " / " + bx.h;
    setup.tvs.forEach(function (t, i) { wall.appendChild(tvsTile(t, fill[i], null, bx, notes[i])); });
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
        wrap.appendChild(tvsRow(setup, slot, t, j, n, g, pool, shown, notes[i][j]));
      }
      if (n > 1 && fill[i].length < n) wrap.appendChild(el("p", "tvs-hint", t.name + " can only split YouTube TV channels, and " + (fill[i].length ? "only " + fill[i].length + " of its " + n + " screens have a game on one" : "no game left is on one") + " at this time."));
    });
    body.appendChild(wrap);
  }
  function tvsRow(setup, slot, t, j, n, g, pool, shown, note) {
    var box = el("div"), row = el("div", "tvs-row");
    var ch = g ? tvsChan(g, n > 1).main : "";
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
      if (note) tx.appendChild(el("span", "tvs-swl", tvsNoteText(note) + ", before this one ends"));
    } else { tx.appendChild(el("b", null, lbl)); tx.appendChild(el("span", null, "Nothing else on at this time")); }
    row.appendChild(tx);
    var key = t.id + ":" + j, alts = pool.filter(function (x) { return (!g || x.id !== g.id) && (n === 1 || tvsYT(x)); });
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
        var c = tvsChan(x, n > 1).main; if (c) b.appendChild(el("span", "tvs-ch", NET_SHORT[c] || c));
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
    var base = setup || { id: "s" + Date.now().toString(36), g: 2, lay: TV_PRESETS[2][0].n, name: TVS.list.length ? "" : "Living room", tvs: tvsFromPreset(TV_PRESETS[2][0]) };
    TVS.edit = { orig: setup && setup !== TVS.once ? setup.id : "", once: setup === TVS.once && !!setup, s: JSON.parse(JSON.stringify(base)) };
    TVS.sel = 0; TVS.drawn = false;
    renderTV(); window.scrollTo(0, 0);
  }
  function tvsCloseEditor() { TVS.edit = null; TVS.drawn = false; renderTV(); window.scrollTo(0, 0); }
  function tvsEditor(body) {
    if (TVS.edit.rules) { tvsRulesPage(body); return; }
    var E = TVS.edit, s = E.s, wrap = el("div", "tvs-ed"); wrap.id = "tvs-ed-root";
    var hd = el("div", "tvs-ed-h"); hd.appendChild(el("h2", null, E.orig ? "Edit setup" : "New setup")); wrap.appendChild(hd);
    var nm = el("input", "tvs-in"); nm.type = "text"; nm.maxLength = 24; nm.placeholder = "Name, like Living room or Basement"; nm.value = s.name || ""; nm.setAttribute("aria-label", "Setup name");
    nm.addEventListener("input", function () { s.name = nm.value; });
    wrap.appendChild(nm);
    wrap.appendChild(el("span", "tvs-lbl", "How many TVs"));
    var cnt = el("div", "tvs-cnt"); cnt.id = "tvs-ed-cnt"; cnt.setAttribute("role", "group"); cnt.setAttribute("aria-label", "How many TVs");
    wrap.appendChild(cnt);
    wrap.appendChild(el("span", "tvs-lbl", "Pick a layout, then move and size them below"));
    var lays = el("div", "tvs-lays"); lays.id = "tvs-ed-lays"; wrap.appendChild(lays);
    var wall = el("div", "tvs-wall"); wall.id = "tvs-ed-wall"; wrap.appendChild(wall);
    wrap.appendChild(el("p", "tvs-hint", "Drag a TV to move it. Drag its corner to make it bigger or smaller."));
    var panel = el("div", "tvs-panel"); panel.id = "tvs-ed-panel"; wrap.appendChild(panel);
    var acts = el("div", "tvs-acts");
    var save = el("button", "full-mu"); save.type = "button"; save.appendChild(el("b", null, "Save setup"));
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
    // 3.135.1 (DJ): a drag in the editor never swipes tabs or pages. The swipe handler listens on the document,
    // so the editor's touches stop here (the tap guard's window listeners still see them first).
    ["touchstart", "touchmove", "touchend"].forEach(function (k) { wrap.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); });
    body.appendChild(wrap);
    tvsEdRedraw();
  }
  // ---------- TV rules: which game goes where (3.142.0, DJ) ----------
  // Same for every setup. Team rules first ("always goes on" a TV you pick), then a league order you drag.
  function tvsRulesSave() { tvsSave(); }
  function tvsRulesPage(body) {
    var R = TVS.rules, setup = tvsCur(), wrap = el("div", "tvs-ed tvs-ru"); wrap.id = "tvs-ed-root";
    var hd = el("div", "tvs-ed-h"); hd.appendChild(el("h2", null, "Which game goes where")); wrap.appendChild(hd);
    wrap.appendChild(el("p", "tvs-hint", "Your rules come first, top to bottom, in every setup. After them: your teams, then games on your slate, then the strongest matchups, then national TV."));
    // team rules
    wrap.appendChild(el("h3", null, "Always on a TV"));
    if (!R.pins.length) wrap.appendChild(el("p", "tvs-hint", "None yet. Add a team to keep it on the same TV every time it plays."));
    R.pins.forEach(function (p, i) {
      var row = el("div", "tvs-rrow"), pt = parseTeam(p.team);
      var b = badgeFor((pt.name.replace(/[^A-Za-z ]/g, "").split(" ").pop() || "?").slice(0, 3).toUpperCase(), pt.name); row.appendChild(b);
      var tx = el("div", "tx"); tx.appendChild(document.createTextNode(pt.name + " always goes on")); row.appendChild(tx);
      var sel = el("select", "tvs-sel"); sel.setAttribute("aria-label", "Which TV for " + pt.name);
      var opts = [["main", "Main TV"]]; for (var k = 2; k <= TV_MAXN; k++) { var tk = setup && setup.tvs[k - 1]; opts.push([String(k), tk && !tk.main ? tk.name : "TV " + k]); }
      opts.forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; if (String(p.tv || "main") === o[0]) op.selected = true; sel.appendChild(op); });
      sel.addEventListener("change", function () { p.tv = sel.value === "main" ? "main" : Number(sel.value); tvsRulesSave(); });
      row.appendChild(sel);
      var x = el("button", "tvs-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Remove the rule for " + pt.name);
      x.addEventListener("click", function () { var old = R.pins.slice(); R.pins.splice(i, 1); tvsRulesSave(); tvsRedrawRules(); topUndo("Rule removed", function () { R.pins = old; tvsRulesSave(); tvsRedrawRules(); }); });
      row.appendChild(x);
      wrap.appendChild(row);
    });
    var have = {}; R.pins.forEach(function (p) { have[p.team] = 1; });
    var mine = (state.teams || []).filter(function (t) { return !have[t]; });
    if (mine.length) {
      var addT = el("div", "tvs-addl");
      mine.forEach(function (t) {
        var b = el("button", null, "+ " + parseTeam(t).name); b.type = "button";
        b.addEventListener("click", function () { R.pins.push({ team: t, tv: "main" }); tvsRulesSave(); tvsRedrawRules(); });
        addT.appendChild(b);
      });
      wrap.appendChild(addT);
    }
    wrap.appendChild(el("p", "tvs-hint", "Pick from your teams. To add another team, star it first."));
    // league order
    wrap.appendChild(el("h3", null, "When games clash, put these first"));
    wrap.appendChild(el("p", "tvs-hint", R.lg.length ? "Drag to reorder. A higher league gets the bigger TV. Leagues not listed follow your slate." : "None yet. Add leagues below, then drag them into order."));
    var list = el("div"); list.id = "tvs-lg-list";
    R.lg.forEach(function (x, i) {
      var row = el("div", "tvs-rrow"); row.setAttribute("data-k", x.k);
      row.appendChild(el("span", "num", String(i + 1)));
      var tx = el("div", "tx"); tx.appendChild(document.createTextNode((LEAGUES[x.k] || {}).name || x.k));
      var pt = el("button", "tvs-pt", "Prime time only"); pt.type = "button"; pt.setAttribute("aria-pressed", x.prime ? "true" : "false");
      pt.addEventListener("click", function () { x.prime = !x.prime; pt.setAttribute("aria-pressed", x.prime ? "true" : "false"); tvsRulesSave(); });
      var tw = el("div"); tw.appendChild(pt); tx.appendChild(tw);
      row.appendChild(tx);
      var rm = el("button", "tvs-x", "✕"); rm.type = "button"; rm.setAttribute("aria-label", "Remove " + ((LEAGUES[x.k] || {}).name || x.k));
      rm.addEventListener("click", function () { R.lg = R.lg.filter(function (y) { return y !== x; }); tvsRulesSave(); tvsRedrawRules(); });
      row.appendChild(rm);
      var grip = el("span", "tvs-grip", "⋮⋮"); grip.setAttribute("aria-hidden", "true"); row.appendChild(grip);
      tvsLgDrag(grip, row, list);
      list.appendChild(row);
    });
    wrap.appendChild(list);
    var inL = {}; R.lg.forEach(function (x) { inL[x.k] = 1; });
    var addL = el("div", "tvs-addl");
    Object.keys(LEAGUES).filter(function (k) { return !inL[k]; }).forEach(function (k) {
      var b = el("button", null, "+ " + LEAGUES[k].name); b.type = "button";
      b.addEventListener("click", function () { R.lg.push({ k: k, prime: false }); tvsRulesSave(); tvsRedrawRules(); });
      addL.appendChild(b);
    });
    wrap.appendChild(addL);
    var done = el("button", "full-mu tvs-ed-done"); done.type = "button"; done.style.marginTop = "20px"; done.appendChild(el("b", null, "Done"));
    done.addEventListener("click", tvsCloseEditor);
    wrap.appendChild(done);
    ["touchstart", "touchmove", "touchend"].forEach(function (k) { wrap.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); });
    body.appendChild(wrap);
  }
  function tvsRedrawRules() { var body = $("tv-body"); if (!body || !TVS.edit || !TVS.edit.rules) return; keepScroll(function () { body.textContent = ""; tvsRulesPage(body); }); }
  // drag a league by its handle: only that row moves while the finger is down; the order is saved when it lifts
  function tvsLgDrag(grip, row, list) {
    grip.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      e.preventDefault(); try { grip.setPointerCapture(e.pointerId); } catch (er) {}
      row.classList.add("drag");
      function mv(ev) {
        var rows = [].slice.call(list.children), y = ev.clientY;
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i]; if (r === row) continue;
          var b = r.getBoundingClientRect(), mid = b.top + b.height / 2;
          if (y < mid && rows.indexOf(row) > i) { list.insertBefore(row, r); break; }
          if (y > mid && rows.indexOf(row) < i && (i === rows.length - 1 || y < rows[i + 1].getBoundingClientRect().top + rows[i + 1].getBoundingClientRect().height / 2 || rows[i + 1] === row)) { list.insertBefore(row, r.nextSibling); break; }
        }
      }
      function up() {
        grip.removeEventListener("pointermove", mv); grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up);
        row.classList.remove("drag");
        var byK = {}; TVS.rules.lg.forEach(function (x) { byK[x.k] = x; });
        TVS.rules.lg = [].map.call(list.children, function (r) { return byK[r.getAttribute("data-k")]; }).filter(Boolean);
        [].forEach.call(list.children, function (r, i) { var n = r.querySelector(".num"); if (n) n.textContent = String(i + 1); });
        tvsRulesSave();
      }
      grip.addEventListener("pointermove", mv); grip.addEventListener("pointerup", up); grip.addEventListener("pointercancel", up);
    });
  }
  // redraws only the wall and the panel (never during a drag: a drag moves the one TV's box)
  function tvsEdRedraw() {
    var E = TVS.edit, s = E && E.s, wall = $("tvs-ed-wall"), panel = $("tvs-ed-panel");
    if (!s || !wall) return;
    if (TVS.sel >= s.tvs.length) TVS.sel = Math.max(0, s.tvs.length - 1);
    wall.textContent = "";
    s.tvs.forEach(function (t, i) {
      var node = tvsTile(t, null, "div");
      node.classList.toggle("sel", i === TVS.sel);
      node.setAttribute("role", "button"); node.tabIndex = 0; node.setAttribute("aria-label", t.name + ", tap to change, drag to move");
      var rz = el("span", "rz"); rz.setAttribute("aria-hidden", "true"); node.appendChild(rz);
      tvsDrag(node, rz, t, i, wall);
      wall.appendChild(node);
    });
    tvsEdCount(s);
    tvsEdPanel(panel, s);
  }
  // how many TVs (1 to 5) and that count's layouts, each drawn small; s.lay remembers which one was picked
  function tvsEdCount(s) {
    var cnt = $("tvs-ed-cnt"), lays = $("tvs-ed-lays"); if (!cnt || !lays) return;
    var n = s.tvs.length; cnt.textContent = ""; lays.textContent = "";
    for (var k = 1; k <= TV_MAXN; k++) (function (k) {
      var b = el("button", null, String(k)); b.type = "button"; b.setAttribute("aria-pressed", k === n ? "true" : "false");
      b.setAttribute("aria-label", k + (k === 1 ? " TV" : " TVs"));
      b.addEventListener("click", function () { if (k === s.tvs.length) return; s.tvs = tvsFromPreset(TV_PRESETS[k][0]); s.lay = TV_PRESETS[k][0].n; TVS.sel = 0; tvsEdRedraw(); });
      cnt.appendChild(b);
    })(k);
    (TV_PRESETS[n] || []).forEach(function (p) {
      var b = el("button", "tvs-lay"); b.type = "button"; b.setAttribute("aria-pressed", s.lay === p.n ? "true" : "false");
      var mini = el("span", "tvs-mini"); mini.setAttribute("aria-hidden", "true");
      p.t.forEach(function (r) { var i = el("i"); tvsPlace(i, { x: r[0], y: r[1], w: r[2], h: r[3] }); mini.appendChild(i); });
      b.appendChild(mini); b.appendChild(el("span", null, p.n));
      b.addEventListener("click", function () {
        // the TVs keep their names, main TV and split screens; only where they sit and their size change
        var old = s.tvs; s.tvs = tvsFromPreset(p).map(function (t, i) { var o = old[i]; if (o) { t.id = o.id; t.name = o.name; t.main = o.main; t.split = o.split; } return t; });
        if (!s.tvs.some(function (t) { return t.main; })) s.tvs[0].main = true;
        s.lay = p.n; TVS.sel = 0; tvsEdRedraw();
      });
      lays.appendChild(b);
    });
  }
  // 3.137.2 (DJ found it confusing): the panel says which TV it's changing, with a button for each TV to switch
  function tvsEdPanel(panel, s) {
    panel.textContent = "";
    var t = s.tvs[TVS.sel];
    if (!t) return;
    panel.appendChild(el("span", "tvs-lbl first", "Change a TV: tap one here or on the drawing"));
    var pick = el("div", "tvs-which"); pick.setAttribute("role", "group"); pick.setAttribute("aria-label", "Which TV");
    s.tvs.forEach(function (x, i) {
      var b = el("button", null, x.name || "TV " + (i + 1)); b.type = "button"; b.setAttribute("aria-pressed", i === TVS.sel ? "true" : "false");
      b.addEventListener("click", function () { TVS.sel = i; tvsEdRedraw(); });
      pick.appendChild(b);
    });
    panel.appendChild(pick);
    panel.appendChild(el("span", "tvs-lbl", "Name"));
    var nmIn = el("input", "tvs-in"); nmIn.type = "text"; nmIn.maxLength = 18; nmIn.value = t.name; nmIn.setAttribute("aria-label", "Name of this TV");
    nmIn.addEventListener("input", function () {
      t.name = nmIn.value || "TV";
      var w = $("tvs-ed-wall"), tile = w && w.children[TVS.sel], nm = tile && tile.querySelector(".tvs-ename"); if (nm) nm.textContent = t.name;
      var pb = pick.children[TVS.sel]; if (pb) pb.textContent = t.name;
    });
    panel.appendChild(nmIn);
    var r1 = el("div", "tvs-prow"), l1 = el("span", null, "My teams go on this TV");
    l1.appendChild(el("small", null, "When one of your teams plays, that game goes on this TV first. One TV can have this, usually your biggest."));
    r1.appendChild(l1);
    var sw = el("button", "switch"); sw.type = "button"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-label", "My teams go on this TV"); sw.setAttribute("aria-checked", t.main ? "true" : "false"); sw.appendChild(el("span", "knob"));
    sw.addEventListener("click", function () { var on = !t.main; s.tvs.forEach(function (x) { x.main = false; }); t.main = on; tvsEdRedraw(); });
    r1.appendChild(sw); panel.appendChild(r1);
    var r2 = el("div", "tvs-prow col"), l2 = el("span", null, "Games at once on this TV");
    l2.appendChild(el("small", null, "Most TVs show 1. Pick 2 or 4 if this TV uses YouTube TV Multiview. It only gets games on YouTube TV channels, since Multiview can't split Prime, Netflix, Peacock or ESPN+."));
    r2.appendChild(l2);
    var seg = el("div", "seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Games at once on this TV");
    [[1, "1 game"], [2, "2 games"], [4, "4 games"]].forEach(function (o) {
      var b = el("button", null, o[1]); b.type = "button"; b.setAttribute("aria-pressed", (t.split || 1) === o[0] ? "true" : "false");
      b.addEventListener("click", function () { t.split = o[0]; tvsEdRedraw(); });
      seg.appendChild(b);
    });
    r2.appendChild(seg); panel.appendChild(r2);
    if (s.tvs.length > 1) {
      var rm = el("button", "tvs-del", "Remove " + (t.name || "this TV")); rm.type = "button";
      rm.addEventListener("click", function () { var was = t.main; s.tvs.splice(TVS.sel, 1); if (was && s.tvs[0]) s.tvs[0].main = true; TVS.sel = 0; tvsEdRedraw(); });
      panel.appendChild(rm);
    }
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
      }
      function up() {
        node.removeEventListener("pointermove", mv); node.removeEventListener("pointerup", up); node.removeEventListener("pointercancel", up);
        // the redraw waits until the finger has been up 0.4s, like every other redraw in Slate
        setTimeout(function () { if (TVS.edit) tvsEdRedraw(); }, moved ? 420 : 0);
      }
      node.addEventListener("pointermove", mv); node.addEventListener("pointerup", up); node.addEventListener("pointercancel", up);
    });
  }

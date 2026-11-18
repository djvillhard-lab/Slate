  // ---------- My bets (3.86.0): track the bets you made ----------
  // Drew's idea (Nov 16, 2026), DJ chose "win/loss only": you add a bet you made to a game from its matchup page
  // (spread, moneyline, total or a player line), the app follows it live on the game card and settles it at the final as
  // Won, Lost or Push. No stakes, odds or money. The sportsbook's posted line (DraftKings, through ESPN) fills in, and you
  // can change it to the line you actually got. Bets are saved in the person's own account (data/users/<uid>/mybets),
  // which only they can read once the lockdown is in (docs/pages/security.md), plus localStorage as the phone's copy.
  // Names start with myb so they can't collide with the rest of the app (all src/app files share one scope).
  var MYB_DAYS = 120;
  var MYB = (function () { try { var o = JSON.parse(localStorage.getItem("slate-mybets") || "{}"); return o && o.days ? o : { days: {} }; } catch (e) { return { days: {} }; } })();
  var MYBL = { loaded: false, busy: false, timer: null, sig: "", props: {}, roster: {} };
  var MYB_CSS = [
    ".myb-list { display: grid; gap: 8px; }",
    ".myb-chip { position: relative; display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 8px; border-radius: 8px; border: 1px solid var(--line); background: none; color: var(--muted); font: 800 13px var(--font); }",
    ".myb-chip svg { width: 14px; height: 14px; }",
    ".myb-chip::after { content: ''; position: absolute; inset: -9px -4px; }",
    ".myb-chip-row { margin: 8px 0 0; }",
    ".bet-acts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 8px; }",
    ".bet-acts .bet-src { margin: 0; }",
    ".myb-in { font-size: 13px; font-weight: 800; color: var(--accent); }",
    ".myb-bet { position: relative; overflow: hidden; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 2px 12px; align-items: center; width: 100%; box-sizing: border-box; padding: 10px 12px 10px 16px; border-radius: 8px; border: 1px solid var(--hair); background: var(--card); color: var(--ink); text-align: left; }",
    ".myb-bet::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent-fill); }",
    ".myb-bet.one { background: color-mix(in srgb, var(--myb-c) 10%, var(--card)); border-color: color-mix(in srgb, var(--myb-c) 32%, var(--hair)); }",
    ".myb-bet.one::before { background: var(--myb-c); }",
    ".myb-bet.two { background: linear-gradient(90deg, color-mix(in srgb, var(--myb-a) 10%, var(--card)), color-mix(in srgb, var(--myb-h) 10%, var(--card))); }",
    ".myb-bet.two::before { background: linear-gradient(180deg, var(--myb-a) 50%, var(--myb-h) 50%); }",
    ".myb-bet > .badge, .myb-bet > .myb-pair { grid-row: 1 / span 3; align-self: center; }",
    ".myb-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 13px; font-weight: 700; color: var(--muted); min-width: 0; }",
    ".myb-kind { display: inline-block; padding: 2px 6px; border-radius: 4px; background: var(--raise); color: var(--ink); font-size: 12px; font-weight: 800; font-stretch: 85%; }",
    ".myb-line { grid-column: 2; font-size: 18px; font-weight: 800; color: var(--ink); line-height: 1.2; }",
    ".myb-st { grid-column: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 13px; font-weight: 700; color: var(--muted); line-height: 1.3; }",
    ".myb-st.up { color: var(--accent); }",
    ".myb-st .lvd { display: inline-flex; align-items: center; gap: 6px; color: var(--live); font-weight: 800; }",
    ".myb-st .lvd::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--live); }",
    ".myb-res { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 13px; font-weight: 800; background: var(--raise); color: var(--ink); }",
    ".myb-res.won { background: var(--accent-fill); color: var(--on-accent); }",
    ".myb-res.lost { background: var(--live); color: #fff; }",
    ".myb-bet.won { box-shadow: inset 0 0 0 1.5px var(--accent); }",
    ".myb-bet .myb-x { grid-row: 1 / span 3; }",
    ".myb-card { background: var(--card); border-radius: 8px; padding: 4px 16px 12px; margin: 12px 0; }",
    ".myb-card .myb-t { display: flex; align-items: center; gap: 8px; padding: 10px 0 6px; font-size: 15px; font-weight: 800; color: var(--head); }",
    ".myb-card .myb-t .count { color: var(--dim); font-size: 13px; font-weight: 700; }",
    ".myb-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 2px 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--hair); text-align: left; width: 100%; color: var(--ink); background: none; }",
    ".myb-rows > .myb-row:first-child { border-top: 0; }",
    ".myb-row > .badge, .myb-row > .myb-pair { grid-row: span 2; }",
    ".myb-pair { display: grid; gap: 2px; }",
    ".myb-pair .badge { transform: scale(.8); transform-origin: left center; margin: -3px 0; }",
    ".myb-l { font-size: 16px; font-weight: 800; color: var(--ink); line-height: 1.25; min-width: 0; }",
    ".myb-l i { font-style: normal; color: var(--muted); font-weight: 700; font-size: 13px; }",
    ".myb-s { grid-column: 2; font-size: 13px; font-weight: 700; color: var(--muted); line-height: 1.3; }",
    ".myb-s.up, .myb-s.won { color: var(--accent); }",
    ".myb-s.lost { color: var(--live); }",
    ".myb-s.lv::before { content: ''; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--live); margin-right: 6px; vertical-align: 1px; }",
    ".myb-x { grid-row: 1 / span 2; grid-column: 3; width: 44px; height: 44px; display: grid; place-items: center; color: var(--dim); margin-right: -12px; }",
    ".myb-x svg { width: 18px; height: 18px; }",
    ".myb-add { width: 100%; min-height: 44px; margin-top: 8px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--raise); color: var(--ink); font: 800 16px var(--font); display: flex; align-items: center; justify-content: center; gap: 8px; }",
    ".myb-add svg { width: 18px; height: 18px; }",
    ".myb-bar.one { background: color-mix(in srgb, var(--myb-c) 12%, var(--card)); box-shadow: inset 3px 0 0 var(--myb-c); }",
    ".myb-bar.two { background: linear-gradient(90deg, color-mix(in srgb, var(--myb-a) 12%, var(--card)), color-mix(in srgb, var(--myb-h) 12%, var(--card))); box-shadow: inset 3px 0 0 var(--myb-a); }",
    ".myb-bar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 6px; margin: 8px 0 0; padding: 6px 10px; border-radius: 8px; background: color-mix(in srgb, var(--accent) 10%, var(--card)); font-size: 13px; font-weight: 700; color: var(--muted); line-height: 1.3; }",
    ".myb-bar + .myb-bar { margin-top: 4px; }",
    ".myb-bar b { color: var(--ink); font-weight: 800; font-size: 15px; }",
    ".myb-bar { align-items: center !important; }",
    ".myb-bar .myb-kind { font-size: 11px; padding: 1px 6px; }",
    ".myb-bar .up, .myb-bar .won { color: var(--accent); font-weight: 800; }",
    ".myb-bar .lost { color: var(--live); font-weight: 800; }",
    ".myb-rec { margin: 8px 2px 0; font-size: 13px; line-height: 1.35; color: var(--dim); font-weight: 700; }",
    ".myb-rec b { color: var(--ink); }",
    ".myb-money { grid-column: 2; font-size: 13px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }",
    ".myb-money.won { color: var(--accent); }",
    ".myb-f2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }",
    ".myb-sheet .myb-f2 input::placeholder { color: var(--dim); font-weight: 700; }",
    ".myb-sec .myb-card { margin-top: 8px; }",
    ".myb-sheet .seg { grid-template-columns: repeat(var(--n, 4), 1fr); }",
    ".myb-sheet .seg button { min-height: 44px; font-size: 15px; }",
    ".myb-sub { margin: -6px 0 0; color: var(--muted); font-size: 13px; font-weight: 700; }",
    ".myb-sides { display: grid; grid-template-columns: repeat(var(--n, 2), 1fr); gap: 8px; }",
    ".myb-side { min-height: 52px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--bg); color: var(--ink); font: 800 16px var(--font); display: flex; align-items: center; justify-content: center; gap: 6px; padding: 4px 8px; }",
    ".myb-side small { font-size: 13px; color: var(--muted); font-weight: 700; }",
    ".myb-side[aria-pressed='true'] { background: var(--accent-fill); color: var(--on-accent); border-color: transparent; }",
    ".myb-side[aria-pressed='true'] small { color: var(--on-accent); opacity: .8; }",
    ".myb-stats { display: flex; flex-wrap: wrap; gap: 8px; }",
    ".myb-stats .myb-side { min-height: 44px; flex: 1 1 auto; font-size: 15px; }",
    ".myb-f { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: end; }",
    ".myb-sheet label { display: grid; gap: 4px; font-size: 13px; color: var(--muted); font-weight: 700; letter-spacing: 0; text-transform: none; }",
    ".myb-sheet input, .myb-sheet select { width: 100%; box-sizing: border-box; height: 48px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--bg); color: var(--ink); font: 800 17px var(--font); padding: 0 12px; }",
    ".myb-sheet select { appearance: none; -webkit-appearance: none; padding-right: 40px; }",
    ".myb-sel { position: relative; }",
    ".myb-sel::after { content: ''; position: absolute; right: 16px; bottom: 19px; width: 8px; height: 8px; border-right: 2.5px solid var(--muted); border-bottom: 2.5px solid var(--muted); transform: rotate(45deg); pointer-events: none; }",
    ".myb-pm { height: 48px; min-width: 52px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--raise); color: var(--ink); font: 800 18px var(--font); }",
    ".myb-note { margin: 0; font-size: 13px; color: var(--dim); font-weight: 700; line-height: 1.35; }",
    ".myb-sheet .full-mu[disabled] { opacity: .45; }",
    ".myb-sheet .myb-cancel { min-height: 44px; color: var(--muted); font: 800 15px var(--font); }"
  ].join("\n");
  (function () { var st = document.createElement("style"); st.id = "myb-css"; st.textContent = MYB_CSS; document.head.appendChild(st); })();

  // ---- saving: the phone's copy, then the account (merged by each bet's last change, so removals carry over too) ----
  function mybTrim() { var keep = {}; Object.keys(MYB.days).sort().slice(-MYB_DAYS).forEach(function (d) { if (MYB.days[d] && Object.keys(MYB.days[d]).length) keep[d] = MYB.days[d]; }); MYB.days = keep; }
  function mybSave() {
    mybTrim();
    try { localStorage.setItem("slate-mybets", JSON.stringify(MYB)); } catch (e) {}
    if (!db || !uid) return;
    clearTimeout(MYBL.timer);
    MYBL.timer = setTimeout(function () { db.collection("data/users/" + uid).doc("mybets").set({ v: 1, days: MYB.days }).then(null, function () {}); }, 1500);
  }
  function mybLoad() {
    if (MYBL.loaded || MYBL.busy || !db || !uid) return;
    MYBL.busy = true;
    db.collection("data/users/" + uid).doc("mybets").get().then(function (sn) {
      var days = (sn && sn.exists && (sn.data() || {}).days) || {}, moved = false, mine = false;
      Object.keys(days).forEach(function (d) { Object.keys(days[d] || {}).forEach(function (id) {
        var a = days[d][id], b = (MYB.days[d] || {})[id];
        if (!a) return;
        if (!b || (a.ed || 0) > (b.ed || 0) || ((a.ed || 0) === (b.ed || 0) && a.res && a.res.fin && !(b.res && b.res.fin))) { (MYB.days[d] = MYB.days[d] || {})[id] = a; moved = true; }
      }); });
      Object.keys(MYB.days).forEach(function (d) { Object.keys(MYB.days[d]).forEach(function (id) { if (!(days[d] || {})[id]) mine = true; }); });
      MYBL.loaded = true; MYBL.busy = false;
      if (moved || mine) mybSave();
      if (moved) keepScroll(render);
    }, function () { MYBL.busy = false; MYBL.loaded = true; });
  }
  function mybList(d) { var o = MYB.days[d || state.date] || {}; return Object.keys(o).map(function (k) { return o[k]; }).filter(function (b) { return b && !b.del; }).sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); }
  function mybFor(g) { return mybList().filter(function (b) { return b.gid === g.id; }); }

  // the game a bet is on: today's copy when it's loaded (scores, moved start times), else what was saved with the bet
  var MYB_SNAP = ["id", "league", "start", "away", "home", "awayAbbr", "homeAbbr", "awayShort", "homeShort", "awayColor", "homeColor", "awayAlt", "homeAlt", "neutral"];
  function mybSnap(g) { var o = {}; MYB_SNAP.forEach(function (k) { if (g[k] != null) o[k] = g[k]; }); return o; }
  function mybGame(b) { var g = games().filter(function (x) { return x.id === b.gid; })[0]; return g || b.g || { id: b.gid, league: b.lg, start: "", away: "", home: "" }; }

  // ---- what the bet is, in words ----
  function mybNum(n) { n = Number(n); return isNaN(n) ? "" : String(Math.round(n * 10) / 10); }
  function mybSigned(n) { n = Number(n); return n === 0 ? "PK" : (n > 0 ? "+" : "") + mybNum(n); }
  function mybDef(b) { return (BET_DEF[BX_SPORT[b.lg]] || []).filter(function (d) { return d.k === b.k; })[0]; }
  function mybNoun(b) { if (b.kind === "total") return BET_TOT[BX_SPORT[b.lg]] || "points"; var d = mybDef(b); return d ? d.noun : "points"; }
  function mybLabel(b, g) {
    if (b.kind === "spread") return abbr(g, b.sd) + " " + mybSigned(b.line);
    if (b.kind === "ml") return (b.sd === "draw" ? "Draw" : abbr(g, b.sd) + " to win") + (b.price != null && !isNaN(Number(b.price)) ? " " + fmtOdds(b.price) : "");
    if (b.kind === "total") return (b.ou === "over" ? "Over " : "Under ") + mybNum(b.line);
    return betSurname(b.p) + " " + b.ou + " " + mybNum(b.line) + " " + mybNoun(b);
  }
  // what kind of bet it is, for the card's tag: "Spread", "Moneyline", "Total points", "Player points"
  function mybKind(b) {
    if (b.kind === "spread") return BX_SPORT[b.lg] === "hockey" ? "Puck line" : BX_SPORT[b.lg] === "baseball" ? "Run line" : "Spread";
    if (b.kind === "ml") return "Moneyline";
    if (b.kind === "total") return "Total " + mybNoun(b);
    return "Player " + mybNoun(b);
  }
  // the card's colors: the team bet on (a player's team for a player line), both teams for a total or a draw
  function mybTone(node, b, g) {
    var c = function (sd) { var x = ""; try { x = badgeColor(g, sd); } catch (e) {} return x || ""; };
    if (b.kind === "total" || b.sd === "draw" || !b.sd) { var a = c("away"), h = c("home"); if (a && h) { node.style.setProperty("--myb-a", a); node.style.setProperty("--myb-h", h); node.classList.add("two"); } }
    else { var k = c(b.sd); if (k) { node.style.setProperty("--myb-c", k); node.classList.add("one"); } }
    return node;
  }
  function mybVs(g) { return abbr(g, "away") + (g.neutral ? " vs " : " at ") + abbr(g, "home"); }

  // ---- where a bet stands: s is pre, live, won, lost, push or void; m is the margin for the live line ----
  // Counting numbers only go up, so an over that has passed its line is won (and an under lost) before the final.
  function mybResult(b) {
    if (b.res && b.res.fin) return b.res;
    var g = mybGame(b), sc = scoreRaw(b.gid) || {}, kind = status(g).kind, out = null;
    if (b.kind !== "prop") {
      var a = parseFloat(sc.a), h = parseFloat(sc.h), fin = sc.state === "post";
      if (isNaN(a) || isNaN(h) || !(fin || sc.state === "in")) return { s: kind === "live" ? "live" : "pre" };
      var mine = b.sd === "home" ? h - a : a - h;
      if (b.kind === "spread") { var m = mine + Number(b.line); out = { s: fin ? (m > 0 ? "won" : m < 0 ? "lost" : "push") : "live", m: m }; }
      else if (b.kind === "ml") {
        if (b.sd === "draw") out = { s: fin ? (a === h ? "won" : "lost") : "live", m: -Math.abs(a - h) };
        else out = { s: fin ? (mine > 0 ? "won" : mine < 0 ? "lost" : SOCCER[b.lg] ? "lost" : "push") : "live", m: mine };
      } else {
        var t = a + h, L = Number(b.line), over = b.ou === "over";
        out = { now: t, m: over ? t - L : L - t };
        out.s = t > L ? (over ? "won" : "lost") : !fin ? "live" : t < L ? (over ? "lost" : "won") : "push";
      }
      out.a = a; out.h = h; if (fin) out.fin = true;
      if (out.s !== "live" && b.kind === "total" && !fin) out.early = true;
    } else {
      var cur = bx.live[b.gid] || {}, sum = cur.sum, st = sum && ((((sum.header || {}).competitions || [])[0] || {}).status || {}).type || {};
      if (!sum || !st.state || st.state === "pre") return { s: kind === "live" ? "live" : "pre", now: kind === "live" ? null : undefined };
      var done = st.state === "post", def = mybDef(b), ln = def ? betBoxLine(sum, b.pid, BX_SPORT[b.lg]) : null, L2 = Number(b.line), ov = b.ou === "over";
      if (!def) out = { s: done ? "void" : "live" };
      else if (!ln || ln.dnp) out = done ? { s: "void", why: ln && ln.dnp ? "Didn't play" : "No stats from ESPN" } : { s: "live", now: 0, m: ov ? -L2 : L2 };
      else { var v = def.val(ln); out = { now: v, m: ov ? v - L2 : L2 - v, s: v > L2 ? (ov ? "won" : "lost") : !done ? "live" : v < L2 ? (ov ? "lost" : "won") : "push" }; }
      if (done) out.fin = true; else if (out.s === "won" || out.s === "lost") out.early = true;
    }
    if (out.fin || out.early) mybKeep(b, out);
    return out;
  }
  function mybKeep(b, out) {
    var o = b.res || {}; if (o.s === out.s && o.now === out.now && o.a === out.a && o.h === out.h && !!o.fin === !!out.fin) return;
    b.res = { s: out.s, m: out.m, now: out.now, a: out.a, h: out.h, why: out.why, fin: !!out.fin, early: !!out.early }; b.ed = Date.now(); mybSave();
  }
  // the status line: "Covering by 2.5", "47 so far, needs 1 more", "Won · Final 118-109"
  function mybSay(b, r, g) {
    var sc = scoreRaw(b.gid) || {}, kind = status(g).kind;
    if (r.s === "pre") return { t: kind === "over" ? "Final" : "Starts " + timeText(g.start), c: "" };
    var fs = r.a != null ? " · " + abbr(g, "away") + " " + r.a + ", " + abbr(g, "home") + " " + r.h : "";
    var tally = function (noun) { var n = r.now == null ? 0 : r.now, room = Number(b.line) - n; var t = mybNum(n) + " " + noun + " so far"; if (r.s !== "live") return t; return t + (b.ou === "over" ? ", needs " + mybNum(Math.floor(room) + 1) + " more" : ", room for " + mybNum(Math.max(0, Math.ceil(room) - 1)) + " more"); };
    if (r.s === "won" || r.s === "lost") {
      var how = b.kind === "prop" ? " · " + mybNum(r.now) + " " + mybNoun(b) : b.kind === "total" ? " · " + mybNum(r.now) + " " + mybNoun(b) : "";
      return { t: (r.s === "won" ? "✓ Won" : "✗ Lost") + (r.early && !r.fin ? " · already " + (b.ou === "over" ? "over" : "past the line") : "") + how + (r.fin && b.kind !== "prop" ? fs : ""), c: r.s };
    }
    if (r.s === "push") return { t: "Push · right on the line" + (b.kind !== "prop" ? fs : ""), c: "" };
    if (r.s === "void") return { t: "No bet: " + (r.why || "not settled").replace(/^./, function (x) { return x.toLowerCase(); }), c: "" };
    var lv = "Live" + (sc.detail ? " " + sc.detail : "") + " · ";
    if (b.kind === "spread") return { t: lv + (r.m > 0 ? "covering by " + mybNum(r.m) : r.m < 0 ? "short by " + mybNum(-r.m) : "right on the line"), c: r.m > 0 ? "up" : "", lv: 1 };
    if (b.kind === "ml") { if (b.sd === "draw") return { t: lv + (r.m === 0 ? "tied" : "not tied"), c: r.m === 0 ? "up" : "", lv: 1 }; return { t: lv + (r.m > 0 ? "up " + r.m : r.m < 0 ? "down " + -r.m : "tied"), c: r.m > 0 ? "up" : "", lv: 1 }; }
    if (b.kind === "total") return { t: lv + tally(mybNoun(b)), c: b.ou === "under" ? "up" : "", lv: 1 };
    return { t: lv + (r.now == null ? "waiting for the box score" : tally(mybNoun(b))), c: b.ou === "under" && r.now != null ? "up" : "", lv: 1 };
  }

  // ---- money (3.106.0): only for bets saved with a stake. Odds are American (-110, +150); a moneyline falls back to the price shown when it was added.
  function mybOddsOf(b) { var o = Number(b.odds != null ? b.odds : b.price); return isNaN(o) || Math.abs(o) < 100 ? null : o; }
  function mybWin(stake, o) { return o > 0 ? stake * o / 100 : stake * 100 / -o; }
  function mybUsd(n) { var a = Math.abs(n), t = a >= 1000 || a === Math.round(a) ? String(Math.round(a)) : a.toFixed(2); return "$" + t.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  // what a settled bet made or lost: null when it has no stake, isn't settled, or won with no odds to pay it at
  function mybNet(b, r) {
    var st = Number(b.stake); if (!(st > 0) || !r) return null;
    if (r.s === "lost") return -st; if (r.s === "push" || r.s === "void") return 0;
    if (r.s === "won") { var o = mybOddsOf(b); return o == null ? null : Math.round(mybWin(st, o) * 100) / 100; }
    return null;
  }
  function mybMoneyLine(b, r) {
    var st = Number(b.stake); if (!(st > 0)) return null;
    var o = mybOddsOf(b), ot = o == null ? "" : " at " + (o > 0 ? "+" : "") + o, net = mybNet(b, r);
    if (r.s === "won" && net != null) return { t: "Won " + mybUsd(net) + " on " + mybUsd(st) + ot, c: "won" };
    if (r.s === "lost") return { t: "Lost " + mybUsd(st) + ot, c: "" };
    if (r.s === "push" || r.s === "void") return { t: mybUsd(st) + " back", c: "" };
    return { t: mybUsd(st) + ot + (o == null ? "" : " to win " + mybUsd(mybWin(st, o))), c: "" };
  }
  // settled bets over the days up to and including this one: the net of the ones with a stake, and the record for each league
  function mybTotals(upTo, nDays) {
    var out = { net: 0, staked: 0, lg: {} }, end = new Date(upTo + "T12:00:00Z").getTime();
    Object.keys(MYB.days).forEach(function (d) {
      var t = new Date(d + "T12:00:00Z").getTime(); if (t > end || end - t >= nDays * 864e5) return;
      mybList(d).forEach(function (b) {
        var r = (b.res && (b.res.fin || b.res.early)) ? b.res : null; if (!r || !/^(won|lost|push)$/.test(r.s)) return;
        var L = out.lg[b.lg] = out.lg[b.lg] || { w: 0, l: 0, p: 0 }; L[r.s === "won" ? "w" : r.s === "lost" ? "l" : "p"]++;
        var net = mybNet(b, r); if (net != null) { out.net += net; out.staked++; }
      });
    });
    out.net = Math.round(out.net * 100) / 100; return out;
  }
  function mybNetText(n) { return (n > 0 ? "up " : n < 0 ? "down " : "even, ") + (n === 0 ? "$0" : mybUsd(n)); }

  // ---- the pieces other pages use ----
  // a row for the matchup page and the slate's My bets: badge, the bet, where it stands, and × to remove it
  function mybRow(b, opts) {
    opts = opts || {};
    var g = mybGame(b), r = mybResult(b), say = mybSay(b, r, g);
    var row = el(opts.tap ? "button" : "div", "myb-bet" + (r.s === "won" ? " won" : "")); if (opts.tap) { row.type = "button"; row.addEventListener("click", function () { openMatchup(g); }); }
    mybTone(row, b, g);
    if (b.kind === "total" || b.sd === "draw" || !b.sd) { var pr = el("span", "myb-pair"); pr.setAttribute("aria-hidden", "true"); ["away", "home"].forEach(function (sd) { pr.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"])); }); row.appendChild(pr); }
    else row.appendChild(badgeFor(abbr(g, b.sd), g[b.sd], g[b.sd + "Color"], g[b.sd + "Alt"]));
    // top: the kind of bet and the game; then the bet itself, big; then where it stands
    var meta = el("span", "myb-meta"); meta.appendChild(el("span", "myb-kind", mybKind(b))); meta.appendChild(el("span", null, mybVs(g))); row.appendChild(meta);
    row.appendChild(el("span", "myb-line", mybLabel(b, g)));
    var st = el("span", "myb-st" + (say.c === "up" ? " up" : "")), txt = say.t;
    var m = /^(✓ Won|✗ Lost|Push)(?: · )?(.*)$/.exec(txt);
    if (m) { st.appendChild(el("span", "myb-res" + (/Won/.test(m[1]) ? " won" : /Lost/.test(m[1]) ? " lost" : ""), m[1])); if (m[2]) st.appendChild(el("span", null, m[2].replace(/^./, function (x) { return x.toUpperCase(); }))); }
    else if (say.lv) { var lm = /^(Live[^·]*?) · (.*)$/.exec(txt); st.appendChild(el("span", "lvd", lm ? lm[1] : "Live")); if (lm) st.appendChild(el("span", null, lm[2].replace(/^./, function (x) { return x.toUpperCase(); }))); }
    else st.textContent = txt;
    row.appendChild(st);
    var mo = mybMoneyLine(b, r); if (mo) row.appendChild(el("span", "myb-money" + (mo.c ? " " + mo.c : ""), mo.t));
    if (opts.x) {
      var x = el("span", "myb-x"); x.setAttribute("role", "button"); x.tabIndex = 0; x.appendChild(icon("x")); x.setAttribute("aria-label", "Remove your bet " + mybLabel(b, g));
      var rm = function (e) { e.stopPropagation(); e.preventDefault(); mybRemove(b); };
      x.addEventListener("click", rm); x.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") rm(e); });
      row.appendChild(x);
    }
    row.setAttribute("aria-label", "Your bet, " + mybKind(b) + ": " + mybLabel(b, g) + ", " + mybVs(g) + ". " + say.t + (mo ? ". " + mo.t : ""));
    return row;
  }
  function mybRemove(b) {
    b.del = 1; b.ed = Date.now(); mybSave(); keepScroll(render);
    topUndo("Bet removed", function () { delete b.del; b.ed = Date.now(); mybSave(); keepScroll(render); });
  }
  function mybCanAdd(g) { return !!g && !g.custom && !!ESPN_URLS[g.league] && status(g).kind !== "over" && !isPastDay(); }
  // matchup page: Your bets, under the betting line
  function mybCard(g) {
    if (!g || g.custom || !ESPN_URLS[g.league]) return null;
    mybLoad();
    var list = mybFor(g);
    if (!list.length) return null;   // the way in is the small "+ Add bet" beside the betting line (mybChip, 3.89.4: DJ found the big button too prominent)
    var c = el("div", "myb-card"), t = el("div", "myb-t"); t.appendChild(el("span", null, "Your bets")); t.appendChild(el("span", "count", String(list.length))); c.appendChild(t);
    var rows = el("div", "myb-list"); list.forEach(function (b) { rows.appendChild(mybRow(b, { x: true })); }); c.appendChild(rows);
    return c;
  }
  // matchup page: a small "+ Add bet" at the end of the betting line strip
  function mybChip(g) {
    if (!mybCanAdd(g)) return null;
    var b = el("button", "myb-chip"); b.type = "button"; b.appendChild(icon("plus")); b.appendChild(document.createTextNode("Add bet"));
    b.setAttribute("aria-label", "Add a bet you made on this game, to follow it live");
    b.addEventListener("click", function () { mybOpen(g); });
    return b;
  }
  // game cards (slate and All games): one short line per bet, under the card's one-liner
  function mybBars(g) {
    if (!g || g.custom) return [];
    return mybFor(g).map(function (b) {
      var r = mybResult(b), say = mybSay(b, r, g), bar = mybTone(el("div", "myb-bar"), b, g);
      bar.appendChild(el("span", "myb-kind", mybKind(b))); bar.appendChild(el("b", null, mybLabel(b, g)));
      bar.setAttribute("aria-label", "Your bet, " + mybKind(b) + ": " + mybLabel(b, g) + (r.s !== "pre" ? ". " + say.t : ""));
      if (r.s !== "pre") bar.appendChild(el("span", say.c || null, say.t.replace(/^Live[^·]*· /, "")));
      return bar;
    });
  }
  // the slate: My bets, under Betting lines (today's bets, wherever the game is), with the last seven days' record
  function mybBlock() {
    mybLoad();
    var list = mybList(); if (!list.length) return null;
    var sec = el("section", "sl-sec myb-sec"), open = !(state.slateFold || {}).__myb;
    var hb = el("button", "sl-h"); hb.type = "button"; hb.setAttribute("aria-expanded", open ? "true" : "false");
    hb.appendChild(el("b", null, "My bets")); hb.appendChild(el("span", "count", String(list.length))); hb.appendChild(icon("more"));
    hb.addEventListener("click", function () { var f = Object.assign({}, state.slateFold || {}); if (f.__myb) delete f.__myb; else f.__myb = 1; state.slateFold = f; try { saveSettings(); } catch (e) {} keepScroll(renderLineup); });
    sec.appendChild(hb);
    var rs = list.map(mybResult), n = function (s) { return rs.filter(function (r) { return r.s === s; }).length; };
    var parts = [[n("won"), " won"], [n("lost"), " lost"], [n("push"), n("push") === 1 ? " push" : " pushes"], [n("live"), " live"], [n("pre"), " to come"]].filter(function (x) { return x[0]; }).map(function (x) { return x[0] + x[1]; });
    var rec = el("p", "myb-rec"); rec.appendChild(el("b", null, (state.date === todayInHome() ? "Today: " : "This day: ") + parts.join(", ")));
    var wk = mybRecord(state.date, 7); if (wk) rec.appendChild(document.createTextNode(" · Last 7 days " + wk));
    var w7 = mybTotals(state.date, 7); if (w7.staked) rec.appendChild(document.createTextNode(", " + mybNetText(w7.net)));
    sec.appendChild(rec);
    // the last 30 days by league, once two leagues have settled bets
    var m30 = mybTotals(state.date, 30), lgs = Object.keys(m30.lg);
    if (open && lgs.length > 1) {
      var by = lgs.sort(function (a, b) { var A = m30.lg[a], B = m30.lg[b]; return (B.w + B.l + B.p) - (A.w + A.l + A.p); }).map(function (k) { var L = m30.lg[k]; return ((LEAGUES[k] || {}).tag || k.toUpperCase()) + " " + L.w + "-" + L.l + (L.p ? "-" + L.p : ""); });
      sec.appendChild(el("p", "myb-rec", "Last 30 days: " + by.join(" · ") + (m30.staked ? " · " + mybNetText(m30.net) : "")));
    }
    if (open) { var c = el("div", "myb-list"); c.style.marginTop = "8px"; list.forEach(function (b) { c.appendChild(mybRow(b, { tap: true, vs: true })); }); sec.appendChild(c); }
    return sec;
  }
  // won-lost(-push) over the days up to and including this one: only settled bets count
  function mybRecord(upTo, nDays) {
    var w = 0, l = 0, p = 0, end = new Date(upTo + "T12:00:00Z").getTime();
    Object.keys(MYB.days).forEach(function (d) {
      var t = new Date(d + "T12:00:00Z").getTime(); if (t > end || end - t >= nDays * 864e5) return;
      mybList(d).forEach(function (b) { var s = (b.res && (b.res.fin || b.res.early)) ? b.res.s : null; if (s === "won") w++; else if (s === "lost") l++; else if (s === "push") p++; });
    });
    return w + l + p ? w + "-" + l + (p ? "-" + p : "") : "";
  }

  // ---- the Add my bet sheet ----
  var MYBS = null;
  function mybOdds(g) { var pv = (state.previews || {})[g.id] || {}, b = boxFor(g); return (pv.odds && (pv.odds.spread || pv.odds.total)) ? pv.odds : (b && b.odds && (b.odds.spread || b.odds.total)) ? b.odds : sbOdds(g); }
  // "DUKE -8.5" → each side's spread
  function mybSpreads(g, o) {
    var m = /^([A-Za-z0-9&.']+)\s*([+-]?\d+(?:\.\d+)?)/.exec((o && o.spread) || ""), out = {};
    if (/^(even|pk|pick)/i.test((o && o.spread) || "")) return { away: 0, home: 0 };
    if (!m) return out;
    var f = m[1].toUpperCase(), n = parseFloat(m[2]), fs = abbr(g, "away") === f ? "away" : abbr(g, "home") === f ? "home" : null;
    if (!fs) return out;
    out[fs] = n; out[fs === "away" ? "home" : "away"] = -n; return out;
  }
  function mybSheet() {
    var bd = document.getElementById("sheet-myb"); if (bd) return bd;
    bd = el("div", "sheet-backdrop"); bd.id = "sheet-myb";
    bd.setAttribute("role", "dialog"); bd.setAttribute("aria-modal", "true"); bd.setAttribute("aria-labelledby", "myb-title");
    bd.addEventListener("click", function (e) { if (e.target === bd) mybClose(); });
    document.body.appendChild(bd); return bd;
  }
  function mybClose() { var bd = document.getElementById("sheet-myb"); if (bd) bd.classList.remove("open"); MYBS = null; }
  // pre: a bet to start from (a Betting lines card: kind, ou, line, and the player), so adding it is one tap on Save
  function mybOpen(g, pre) {
    var o = mybOdds(g) || {};
    MYBS = { g: g, kind: "spread", sd: "", ou: "", line: "", pid: "", k: "", o: o, sp: mybSpreads(g, o), src: o.provider || "", typed: false, odds: "", stake: "", oddsTyped: false };
    if (pre) { Object.keys(pre).forEach(function (k) { MYBS[k] = pre[k]; }); MYBS.line = String(pre.line); MYBS.typed = true; MYBS.card = MYBS.line; if (pre.src) MYBS.src = pre.src; }
    mybDraw(); mybSheet().classList.add("open");
  }
  // a Betting lines card's "+ Add to My bets": opens the sheet with that line and the side the numbers lean to
  function mybFromLine(g, b) {
    var pre = b.game ? { kind: "total", ou: b.lean < 0 ? "under" : "over", line: b.line, src: b.src || "" }
      : { kind: "prop", ou: b.lean < 0 ? "under" : "over", line: b.line, pid: String(b.pid), p: b.p, pos: b.pos || "", psd: b.sd, k: b.k, src: b.src || "" };
    mybOpen(g, pre);
  }
  function mybHasLine(g, b) { return mybFor(g).some(function (x) { return b.game ? x.kind === "total" : x.kind === "prop" && String(x.pid) === String(b.pid) && x.k === b.k; }); }
  function mybLineBtn(g, b) {
    if (!mybCanAdd(g)) return null;
    if (mybHasLine(g, b)) { var on = el("span", "myb-in", "✓ In My bets"); return on; }
    var c = el("button", "myb-chip bet-add"); c.type = "button"; c.appendChild(icon("plus")); c.appendChild(document.createTextNode("Add to My bets"));
    c.setAttribute("aria-label", "Add " + (b.game ? "this game total" : b.p + "'s line") + " to My bets");
    c.addEventListener("click", function (e) { e.stopPropagation(); mybFromLine(g, b); });
    return c;
  }
  function mybPropsFor(g) {
    var lg = g.league, sport = BX_SPORT[lg];
    if (!BET_DEF[sport]) return null;
    var P = MYBL.props[g.id] || (MYBL.props[g.id] = { lines: null, teams: null, busy: false, tries: 0 });
    if (!P.busy && (!P.teams || (BET_PROPS[lg] && !P.lines))) {
      var cur = bx.live[g.id] || {}, sum = cur.sum;
      if (!sum) { bxNeed(g); if (P.tries++ < 12) setTimeout(function () { if (MYBS && MYBS.g.id === g.id && MYBS.kind === "prop") mybDraw(); }, 1200); return P; }
      P.busy = true;
      var comps = ((((sum.header || {}).competitions || [])[0] || {}).competitors || []);
      var teams = comps.map(function (c) { return { sd: c.homeAway === "home" ? "home" : "away", id: String((c.team || {}).id || "") }; });
      var rosters = Promise.all(teams.map(function (t) {
        return rkFetch(bxApi(lg, "teams/" + t.id + "/roster")).then(function (j) {
          var a = (j && j.athletes) || []; if (a[0] && a[0].items) a = [].concat.apply([], a.map(function (x) { return x.items || []; }));
          return { sd: t.sd, list: a.map(function (x) { return { id: String(x.id), name: x.displayName || x.fullName || "", pos: (x.position || {}).abbreviation || "" }; }).filter(function (x) { return x.id && x.name; }) };
        });
      }));
      var lines = BET_PROPS[lg] && cur.ev ? betLines(lg, cur.ev).then(null, function () { return null; }) : Promise.resolve(null);
      Promise.all([rosters, lines]).then(function (r) {
        P.teams = r[0]; P.lines = r[1] || { src: "", list: [] }; P.busy = false;
        if (MYBS && MYBS.g.id === g.id && MYBS.kind === "prop") mybDraw();
      }, function () { P.busy = false; P.teams = P.teams || []; P.lines = P.lines || { src: "", list: [] }; if (MYBS && MYBS.g.id === g.id) mybDraw(); });
    }
    return P;
  }
  function mybPosted(P, pid, k) { var x = P && P.lines && (P.lines.list || []).filter(function (y) { return y.aid === pid && y.k === k; })[0]; return x ? x.line : null; }
  function mybFill() {  // the posted line for what's picked, unless the person has typed their own
    var S = MYBS, g = S.g; if (S.typed) return;
    if (S.kind === "spread") S.line = S.sd && S.sp[S.sd] != null ? String(S.sp[S.sd]) : S.line;
    else if (S.kind === "total") S.line = S.o.total !== "" && S.o.total != null ? String(S.o.total) : S.line;
    else if (S.kind === "prop") { var v = mybPosted(MYBL.props[g.id], S.pid, S.k); S.line = v != null ? String(v) : ""; }
  }
  function mybValid() {
    var S = MYBS, n = parseFloat(S.line);
    if (S.kind === "ml") return !!S.sd;
    if (S.kind === "spread") return !!S.sd && !isNaN(n);
    if (S.kind === "total") return !!S.ou && !isNaN(n) && n > 0;
    return !!S.pid && !!S.k && !!S.ou && !isNaN(n) && n >= 0;
  }
  function mybDraw() {
    var S = MYBS; if (!S) return;
    var g = S.g, bd = mybSheet(), sport = BX_SPORT[g.league], hasProps = !!BET_DEF[sport];
    var sh = el("div", "sheet myb-sheet");
    var h = el("h3", null, "Add my bet"); h.id = "myb-title"; sh.appendChild(h);
    sh.appendChild(el("p", "myb-sub", mybVs(g) + " · " + (status(g).kind === "live" ? "Live" : timeText(g.start))));
    var kinds = [["spread", "Spread"], ["ml", "Moneyline"], ["total", "Total"]]; if (hasProps) kinds.push(["prop", "Player"]);
    var seg = el("div", "seg"); seg.style.setProperty("--n", kinds.length);
    kinds.forEach(function (k) { var b = el("button", null, k[1]); b.type = "button"; b.setAttribute("aria-pressed", S.kind === k[0] ? "true" : "false"); b.addEventListener("click", function () { if (S.kind === k[0]) return; S.kind = k[0]; S.sd = ""; S.ou = ""; S.line = ""; S.typed = false; mybFill(); mybDraw(); }); seg.appendChild(b); });
    sh.appendChild(seg);
    var pick = function (label, small, on, fn) { var b = el("button", "myb-side"); b.type = "button"; b.appendChild(document.createTextNode(label)); if (small) b.appendChild(el("small", null, small)); b.setAttribute("aria-pressed", on ? "true" : "false"); b.addEventListener("click", fn); return b; };
    var sides = function (list) { var w = el("div", "myb-sides"); w.style.setProperty("--n", list.length); list.forEach(function (x) { w.appendChild(x); }); return w; };
    var note = "";
    if (S.kind === "spread" || S.kind === "ml") {
      var opts = sideOrder(g).map(function (sd) {
        var lab = S.kind === "spread" ? abbr(g, sd) + (S.sp[sd] != null ? " " + mybSigned(S.sp[sd]) : "") : abbr(g, sd);
        var ml = S.o.ml && S.o.ml[sd] != null && S.kind === "ml" ? fmtOdds(S.o.ml[sd]) : "";
        return pick(lab, ml, S.sd === sd, function () { S.sd = sd; mybFill(); mybDraw(); });
      });
      if (S.kind === "ml" && SOCCER[g.league]) opts.push(pick("Draw", "", S.sd === "draw", function () { S.sd = "draw"; mybDraw(); }));
      sh.appendChild(sides(opts));
      if (S.kind === "ml") note = "Wins if " + (S.sd === "draw" ? "the game ends level" : S.sd ? abbr(g, S.sd) + " wins" : "your team wins") + (SOCCER[g.league] ? " in normal time and stoppage time." : ", overtime included.");
      else note = S.sp.away == null ? "No spread is posted for this game: pick a side and type your line." : "";
    }
    if (S.kind === "total" || S.kind === "prop") {
      if (S.kind === "prop") {
        var P = mybPropsFor(g);
        if (!P || !P.teams) sh.appendChild(el("p", "myb-note", "Loading the players…"));
        else {
          var lab = el("label", "myb-sel", "Player"), sel = el("select"); sel.appendChild(new Option("Pick a player", ""));
          var posted = {}; ((P.lines && P.lines.list) || []).forEach(function (x) { posted[x.aid] = 1; });
          P.teams.slice().sort(function (a, b) { return sideOrder(g).indexOf(a.sd) - sideOrder(g).indexOf(b.sd); }).forEach(function (t) {
            var og = document.createElement("optgroup"); og.label = g[t.sd] || abbr(g, t.sd);
            t.list.slice().sort(function (a, b) { return (posted[b.id] ? 1 : 0) - (posted[a.id] ? 1 : 0) || a.name.localeCompare(b.name); }).forEach(function (x) { var op = new Option(x.name + (x.pos ? " · " + x.pos : ""), x.id); op.selected = x.id === S.pid; og.appendChild(op); });
            sel.appendChild(og);
          });
          sel.addEventListener("change", function () {
            S.pid = sel.value; S.typed = false; var who = null;
            P.teams.forEach(function (t) { t.list.forEach(function (x) { if (x.id === S.pid) who = { name: x.name, pos: x.pos, sd: t.sd }; }); });
            S.p = who ? who.name : ""; S.pos = who ? who.pos : ""; S.psd = who ? who.sd : ""; mybFill(); mybDraw();
          });
          lab.appendChild(sel); sh.appendChild(lab);
          var st = el("div", "myb-stats");
          (BET_DEF[sport] || []).forEach(function (d) { st.appendChild(pick(d.noun.replace(/^./, function (c) { return c.toUpperCase(); }), "", S.k === d.k, function () { S.k = d.k; S.typed = false; mybFill(); mybDraw(); })); });
          sh.appendChild(st);
        }
      }
      sh.appendChild(sides([pick("Over", "", S.ou === "over", function () { S.ou = "over"; mybDraw(); }), pick("Under", "", S.ou === "under", function () { S.ou = "under"; mybDraw(); })]));
      if (S.kind === "total" && (S.o.total === "" || S.o.total == null)) note = "No total is posted for this game: type your line.";
      if (S.kind === "prop" && S.pid && S.k && mybPosted(MYBL.props[g.id], S.pid, S.k) == null) note = "No line is posted for this player: type yours.";
    }
    if (S.kind !== "ml") {
      var f = el("div", "myb-f"), lb = el("label", null, "Line"), inp = el("input"); inp.type = "text"; inp.setAttribute("inputmode", "decimal"); inp.autocomplete = "off"; inp.value = S.line;
      inp.setAttribute("aria-label", "Your line");
      inp.addEventListener("input", function () { S.line = inp.value.replace(/[^0-9.+-]/g, ""); S.typed = true; var b = sh.querySelector(".full-mu"); if (b) b.disabled = !mybValid(); });
      lb.appendChild(inp); f.appendChild(lb);
      if (S.kind === "spread") { var pm = el("button", "myb-pm", "+/−"); pm.type = "button"; pm.setAttribute("aria-label", "Switch plus and minus"); pm.addEventListener("click", function () { var n = parseFloat(S.line); if (!isNaN(n)) { S.line = String(-n); S.typed = true; mybDraw(); } }); f.appendChild(pm); }
      sh.appendChild(f);
    }
    // optional money: odds and stake. Left empty, the bet is tracked as won or lost only, as before.
    if (S.kind === "ml" && !S.oddsTyped) { var mp = S.sd && S.sd !== "draw" && S.o.ml ? Number(S.o.ml[S.sd]) : NaN; S.odds = isNaN(mp) ? "" : (mp > 0 ? "+" : "") + mp; }
    else if (S.kind !== "ml" && !S.oddsTyped) S.odds = "";
    var f2 = el("div", "myb-f2");
    var ol = el("label", null, "Odds (optional)"), oi = el("input"); oi.type = "text"; oi.setAttribute("inputmode", "numbers-and-punctuation"); oi.autocomplete = "off"; oi.placeholder = "-110"; oi.value = S.odds;
    oi.addEventListener("input", function () { S.odds = oi.value.replace(/[^0-9+-]/g, ""); S.oddsTyped = true; });
    ol.appendChild(oi); f2.appendChild(ol);
    var sl = el("label", null, "Stake $ (optional)"), si = el("input"); si.type = "text"; si.setAttribute("inputmode", "decimal"); si.autocomplete = "off"; si.placeholder = "0"; si.value = S.stake;
    si.addEventListener("input", function () { S.stake = si.value.replace(/[^0-9.]/g, ""); });
    sl.appendChild(si); f2.appendChild(sl);
    sh.appendChild(f2);
    var srcNote = S.card != null && S.card === S.line ? "The line from your Betting lines card" + (S.src ? " (" + S.src + ")" : "") + ". Change it if yours was different." : S.src && S.kind !== "ml" && !S.typed && S.line !== "" ? "Filled in from " + S.src + ". Change it if your line was different." : "";
    var nt = [note, srcNote].filter(Boolean).join(" "); if (nt) sh.appendChild(el("p", "myb-note", nt));
    var save = el("button", "full-mu"); save.type = "button"; var ft = el("span", "fm-t"); ft.appendChild(el("b", null, "Save bet")); ft.appendChild(el("i", null, "Follows it live and settles at the final")); save.appendChild(ft);
    save.disabled = !mybValid(); save.addEventListener("click", mybAdd); sh.appendChild(save);
    var cn = el("button", "myb-cancel", "Cancel"); cn.type = "button"; cn.addEventListener("click", mybClose); sh.appendChild(cn);
    bd.textContent = ""; bd.appendChild(sh);
  }
  function mybAdd() {
    var S = MYBS; if (!S || !mybValid()) return;
    var g = S.g, now = Date.now(), b = { id: now.toString(36) + Math.random().toString(36).slice(2, 6), gid: g.id, lg: g.league, kind: S.kind, at: now, ed: now, g: mybSnap(g) };
    if (S.kind === "spread" || S.kind === "ml") b.sd = S.sd;
    if (S.kind !== "ml") b.line = parseFloat(S.line);
    if (S.kind === "ml" && S.sd !== "draw" && S.o.ml && S.o.ml[S.sd] != null && !isNaN(Number(S.o.ml[S.sd]))) b.price = Number(S.o.ml[S.sd]);  // shown with the bet, not used for money
    if (S.kind === "total" || S.kind === "prop") b.ou = S.ou;
    if (S.kind === "prop") { b.pid = S.pid; b.p = S.p; b.pos = S.pos; b.sd = S.psd; b.k = S.k; }
    if (S.kind === "spread" && S.sp[S.sd] != null && Number(S.sp[S.sd]) === b.line) b.src = S.src;
    var od = parseInt(S.odds, 10), stk = Math.round(parseFloat(S.stake) * 100) / 100;
    if (!isNaN(od) && Math.abs(od) >= 100) b.odds = od;
    if (stk > 0) b.stake = stk;
    (MYB.days[state.date] = MYB.days[state.date] || {})[b.id] = b;
    mybSave(); mybClose(); keepScroll(render);
  }

  // another copy of the app (the open Duo's other pane, another tab) added or settled a bet: pick it up
  window.addEventListener("storage", function (e) {
    if (e.key !== "slate-mybets" || !e.newValue) return;
    try { var o = JSON.parse(e.newValue); if (o && o.days) { MYB = o; keepScroll(render); } } catch (x) {}
  });
  // live player lines need the game's box score, which the app only fetches for games on screen: keep it coming for
  // today's live player bets, and redraw when any bet's standing changes
  setInterval(function () {
    if (document.hidden || state.date !== todayInHome()) return;
    var list = mybList(); if (!list.length) return;
    list.forEach(function (b) { if (b.kind === "prop" && !(b.res && b.res.fin)) { var g = mybGame(b), k = status(g).kind; if (k === "live" || k === "over") bxNeed(g); } });
    var sig = list.map(function (b) { var r = mybResult(b); return b.id + r.s + r.m + r.now; }).join("|");
    if (sig !== MYBL.sig) { var first = !MYBL.sig; MYBL.sig = sig; if (!first) { if (state.view === "lineup" || isDuo) keepScroll(renderLineup); if (state.view === "game") keepScroll(renderGame); } }
  }, 15000);

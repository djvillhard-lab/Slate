  // Injuries, trades and signings on News (3.114.0, DJ: "injury news, trades and signings"; DJ picked the News page).
  // Press Box: "Injuries and moves" for the person's own teams. A league tab: the newest on that league's injury
  // report, and its trades and signings. All of it is ESPN's free injury report and transaction list, trimmed by the
  // worker (/api/wire, worker/wire.js, kept 20 minutes). No Claude, nothing estimated: statuses and lines are ESPN's.
  (function () { var st = document.createElement("style"); st.id = "wire-css"; st.textContent =
    ".wr-team { display: grid; gap: 0; padding-bottom: 4px; }" +
    ".wr-row { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 8px; align-items: start; padding: 7px 0; border-top: 1px solid var(--hair); }" +
    ".wr-row:first-of-type { border-top: 0; }" +
    ".wr-row .nx-pill { margin-top: 1px; white-space: nowrap; }" +
    ".wr-tx { display: grid; gap: 2px; min-width: 0; }" +
    ".wr-tx b { font-size: 14px; font-weight: 800; color: var(--ink); line-height: 1.25; }" +
    ".wr-tx b i { font-style: normal; font-weight: 700; color: var(--dim); }" +
    ".wr-tx span { font-size: 13.5px; line-height: 1.38; color: var(--head); }" +
    ".wr-tx small { font-size: 12px; color: var(--dim); }" +
    ".wr-sub { margin: 14px 0 6px; font-size: 13px; font-weight: 800; color: var(--dim); }" +
    ".wr-none { margin: 2px 0 10px; font-size: 13px; color: var(--dim); }" +
    ".nx .wr-more { margin-top: 2px; }";
    document.head.appendChild(st); })();
  var WIRE_LGS = ["nfl", "nba", "nhl", "mlb", "wnba"];
  var wire = { d: {}, at: {}, busy: {}, more: {} };
  // a league's wire, loaded once and again after 15 minutes; null until it arrives (the page redraws then)
  function wireGet(lg) {
    if (WIRE_LGS.indexOf(lg) === -1) return null;
    if (!wire.busy[lg] && (!wire.at[lg] || Date.now() - wire.at[lg] > 15 * 60000)) {
      wire.busy[lg] = 1;
      fetch("/api/wire?lg=" + lg).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        wire.busy[lg] = 0; wire.at[lg] = Date.now(); if (j && Array.isArray(j.inj)) { wire.d[lg] = j; nwRedraw(); }
      }, function () { wire.busy[lg] = 0; wire.at[lg] = Date.now() - 13 * 60000; });  // try again in 2 minutes
    }
    return wire.d[lg] || null;
  }
  var WIRE_DAY = 86400000;
  function wireAge(at) { return Date.now() - (Date.parse(at) || 0); }
  // ESPN's transaction dates are days ("2026-11-18T08:00Z"): show the day, not a time
  function wireDay(at) { var t = Date.parse(at); return t ? new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : ""; }
  // one transaction line holds several moves ("Signed X. Waived Y."): split at each new move
  var WIRE_VERBS = "Signed|Re-signed|Placed|Released|Waived|Activated|Reinstated|Claimed|Traded|Acquired|Agreed|Designated|Recalled|Optioned|Assigned|Promoted|Elevated|Sent|Selected|Exercised|Declined|Outrighted|Removed|Transferred|Named|Hired|Fired|Fined|Suspended|Converted|Terminated|Purchased|Returned|Loaned|Granted|Announced|Extended";
  var WIRE_SPLIT = new RegExp("\\.\\s+(?=(?:" + WIRE_VERBS + ")\\b)");
  function wireMoves(text) { return String(text || "").split(WIRE_SPLIT).map(function (s) { s = s.trim(); return s && !/\.$/.test(s) && !/…$/.test(s) ? s + "." : s; }).filter(Boolean); }
  // what kind of move a sentence is: [label, emoji, rank] (rank: lower = bigger news)
  function wireKind(s) {
    if (/\btraded\b|\bacquired\b|in exchange for|\bin a trade\b/i.test(s)) return ["Trade", "🔁", 0];
    if (/^(placed|transferred)\b.*\b(injured|reserve|disabled|physically unable|non-football)/i.test(s)) return ["Injury list", "🚑", 1];
    if (/^(activated|reinstated|returned)\b/i.test(s)) return ["Back", "✅", 3];
    if (/^(signed|re-signed|agreed|claimed|extended|purchased|selected)\b/i.test(s)) return ["Signing", "✍️", 2];
    if (/^(released|waived|designated|outrighted|terminated)\b/i.test(s)) return ["Cut", "✂️", 4];
    if (/^(hired|fired|named)\b/i.test(s)) return ["Coaching", "📋", 1];
    if (/^(suspended|fined)\b/i.test(s)) return ["Discipline", "🚩", 2];
    return ["Move", "📋", 5];
  }
  // practice squad and minor-league shuffles: left out of the league list (too many), kept for your own teams last
  function wireMinor(s) { return /practice squad|two-way|minor league|\bG League\b|\bAHL\b|optioned|recalled|assigned to/i.test(s) && !/to the active roster|standard contract/i.test(s); }
  function wireTeamIs(x, t) { var n = String(t.name).toLowerCase(); return String(x.team || "").toLowerCase() === n; }
  // injury order: out for the longest first
  var WIRE_ST = ["Injured Reserve", "Out", "Suspension", "Doubtful", "Questionable", "Day-To-Day"];
  function wireStRank(st) { var i = WIRE_ST.indexOf(st); return i < 0 ? 9 : i; }
  // ESPN writes "Injured Reserve", "Day-To-Day": sentence case, as everywhere in the app
  function wireSt(st) { var s = String(st || "").replace(/-/g, " ").toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function wireMore(box, key, total, shown) {
    if (total <= shown) return;
    var open = !!wire.more[key], b = el("button", "nx-more wr-more"); b.type = "button"; b.setAttribute("aria-expanded", open ? "true" : "false");
    b.appendChild(el("span", null, open ? "Show fewer" : "Show " + (total - shown) + " more")); b.appendChild(icon("more"));
    b.addEventListener("click", function () { wire.more[key] = !open; keepScroll(renderNews); });
    box.appendChild(b);
  }
  function wireRow(pill, title, sub, note) {
    var r = el("div", "wr-row"); r.appendChild(pill);
    var tx = el("div", "wr-tx"); if (title) tx.appendChild(title); if (sub) tx.appendChild(el("span", null, sub)); if (note) tx.appendChild(el("small", null, note));
    r.appendChild(tx); return r;
  }
  function wireInjRow(x, withNote) {
    var b = el("b"); if (x.pos) b.appendChild(el("i", null, x.pos + " ")); b.appendChild(document.createTextNode(x.p)); if (x.what) b.appendChild(el("i", null, " · " + x.what));
    return wireRow(nwPill(wireSt(x.st), "inj", "🚑"), b, withNote ? x.note : "", "Updated " + nwAgo(x.at));
  }
  // ----- Press Box: your teams -----
  function wirePress(body) {
    var mine = myTeamList().map(function (t) { return { t: t, lg: t.lg }; }).filter(function (m) { return WIRE_LGS.indexOf(m.lg) !== -1; });
    if (!mine.length) return;
    var boxes = [], waiting = false;
    mine.forEach(function (m) {
      var d = wireGet(m.lg); if (!d) { waiting = true; return; }
      var t = m.t.known || nwTeam(m.t.name, m.lg) || null;
      // ESPN keeps old notes in the off-season (a WNBA "Out" from September): only the last 45 days count
      var inj = d.inj.filter(function (x) { return wireTeamIs(x, m.t) && wireAge(x.at) < 45 * WIRE_DAY; })
        .sort(function (a, b) { return wireStRank(a.st) - wireStRank(b.st) || (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
      var mv = []; d.tx.filter(function (x) { return wireTeamIs(x, m.t) && wireAge(x.at) < 10 * WIRE_DAY; }).forEach(function (x) {
        wireMoves(x.text).forEach(function (s) { var k = wireKind(s); mv.push({ s: s, k: k, at: x.at, minor: wireMinor(s) }); });
      });
      mv.sort(function (a, b) { return (a.minor - b.minor) || (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0) || a.k[2] - b.k[2]; });
      if (!inj.length && !mv.length) return;
      var news = mv.filter(function (y) { return !y.minor && wireAge(y.at) < 3 * WIRE_DAY; }).length + inj.filter(function (x) { return wireAge(x.at) < 2 * WIRE_DAY; }).length;
      var out = inj.filter(function (x) { return wireStRank(x.st) <= 2; }).length;
      var pills = [out ? nwPill(out + " out", "inj", "🚑") : null, mv.length ? nwPill(mv.length + (mv.length === 1 ? " move" : " moves"), "", "✍️") : null];
      var box = nwBox(t, m.t.name, pills, "wr-team", nwPill("My team", "why", "⭐"));
      // closed: up to 4 injuries and 3 moves, so the moves aren't hidden behind a long injury report
      var key = "p|" + m.lg + "|" + m.t.name, open = !!wire.more[key], all = inj.length + mv.length;
      inj.slice(0, open ? 99 : 4).forEach(function (x) { box.appendChild(wireInjRow(x, wireAge(x.at) < 3 * WIRE_DAY)); });
      mv.slice(0, open ? 99 : 3).forEach(function (y) { box.appendChild(wireRow(nwPill(y.k[0], "", y.k[1]), null, y.s, wireDay(y.at))); });
      wireMore(box, key, all, Math.min(inj.length, 4) + Math.min(mv.length, 3));
      boxes.push({ box: box, news: news });
    });
    if (!boxes.length && waiting) return;  // the first load; the section appears when ESPN answers
    body.appendChild(nwSec("🚑 Injuries and moves", "Your teams · ESPN"));
    if (!boxes.length) { body.appendChild(el("p", "wr-none", "Nothing new for your teams: no one on the injury report and no moves in the last 10 days.")); return; }
    boxes.sort(function (a, b) { return b.news - a.news; });
    var w = el("div", "nx-boxes"); boxes.forEach(function (b) { w.appendChild(b.box); }); body.appendChild(w);
  }
  // ----- a league tab: the newest on the injury report, then trades and signings -----
  function wireLeague(body, lg) {
    if (WIRE_LGS.indexOf(lg) === -1) return;
    var d = wireGet(lg), sec = el("div", "wr-lg");
    var mineT = myTeamList().filter(function (t) { return t.lg === lg; }), isMine = function (x) { return mineT.some(function (t) { return wireTeamIs(x, t); }) ? 0 : 1; };
    sec.appendChild(nwSec("🚑 Injuries and moves", (LEAGUES[lg] || {}).tag + " · ESPN"));
    if (!d) { var op = el("p", "nx-busy sm"); op.appendChild(el("i", "cl-dot")); op.appendChild(el("span", null, "Loading ESPN's injury report…")); sec.appendChild(op); return wirePlace(body, sec); }
    // injuries: changed in the last 3 days (your teams first), each a red box with the player's headshot
    var inj = d.inj.filter(function (x) { return wireAge(x.at) < 3 * WIRE_DAY; }).sort(function (a, b) { return isMine(a) - isMine(b) || wireStRank(a.st) - wireStRank(b.st) || (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
    sec.appendChild(el("div", "wr-sub", "New on the injury report"));
    if (!inj.length) sec.appendChild(el("p", "wr-none", "No changes in the last 3 days."));
    else {
      var iw = el("div", "nx-boxes"), ik = "li|" + lg, ion = !!wire.more[ik];
      inj.slice(0, ion ? 30 : 6).forEach(function (x) {
        var t = nwTeam(x.team, lg), c = nwTint(el("div", "nx-inj"), t);
        var f = playerFace({ name: x.p, id: x.id, teamName: x.team, team: x.ab, color: t && t.c1 }, lg); f.classList.add("nx-face"); c.appendChild(f);
        var tx = el("div", "nx-pt"), nm = el("div", "nx-pn"); nm.appendChild(el("b", null, x.p)); nm.appendChild(el("span", "nx-ab", [x.pos, x.ab].filter(Boolean).join(" · "))); nm.appendChild(nwPill(wireSt(x.st), "inj", "🚑")); tx.appendChild(nm);
        if (x.note) tx.appendChild(el("p", null, x.note)); tx.appendChild(el("small", "wr-ago", [x.what, "Updated " + nwAgo(x.at)].filter(Boolean).join(" · ")));
        c.appendChild(tx); iw.appendChild(c);
      });
      wireMore(iw, ik, Math.min(inj.length, 30), 6); sec.appendChild(iw);
    }
    // trades and signings in the last 7 days (no practice squad or minor-league shuffles), your teams first
    var mv = []; d.tx.filter(function (x) { return wireAge(x.at) < 7 * WIRE_DAY; }).forEach(function (x) {
      wireMoves(x.text).forEach(function (s) { var k = wireKind(s); if (!wireMinor(s) && k[2] <= 2) mv.push({ s: s, k: k, x: x }); });
    });
    mv.sort(function (a, b) { return isMine(a.x) - isMine(b.x) || a.k[2] - b.k[2] || (Date.parse(b.x.at) || 0) - (Date.parse(a.x.at) || 0); });
    sec.appendChild(el("div", "wr-sub", "Trades and signings"));
    if (!mv.length) sec.appendChild(el("p", "wr-none", "No trades or signings in the last 7 days."));
    else {
      var mw = el("div", "nx-boxes"), mk = "lm|" + lg, mon = !!wire.more[mk];
      mv.slice(0, mon ? 30 : 6).forEach(function (y) {
        var t = nwTeam(y.x.team, lg), b = nwBox(t, y.x.team, [el("span", "nx-ab", wireDay(y.x.at))], "", nwPill(y.k[0], "", y.k[1]));
        b.appendChild(el("p", "nx-bx", y.s)); mw.appendChild(b);
      });
      wireMore(mw, mk, Math.min(mv.length, 30), 6); sec.appendChild(mw);
    }
    wirePlace(body, sec);
  }
  // on a league tab the section goes right under the briefing's top card (and its Generate button), above the briefing
  function wirePlace(body, sec) {
    var top = body.querySelector(".nx-bf"), at = top;
    while (at && at.nextSibling && /\b(cl-err|nx-bgo|nx-note|nx-busy)\b/.test(at.nextSibling.className || "")) at = at.nextSibling;
    if (at && at.nextSibling) body.insertBefore(sec, at.nextSibling); else body.appendChild(sec);
  }

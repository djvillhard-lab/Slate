  // "Worth watching back" (3.103.0): facts about how a finished game went, counted from ESPN's own play list.
  // Nothing here names a team or a score, so it is safe with scores hidden. No fact, no line.
  var WWB = {};
  try { WWB = JSON.parse(localStorage.getItem("slate-wwb") || "{}") || {}; } catch (e) { WWB = {}; }
  (function () { var now = Date.now(), ch = false; Object.keys(WWB).forEach(function (k) { if (now - (WWB[k].at || 0) > 4 * 864e5) { delete WWB[k]; ch = true; } }); if (ch) try { localStorage.setItem("slate-wwb", JSON.stringify(WWB)); } catch (e) {} })();
  (function () { var st = document.createElement("style"); st.id = "wwb-css"; st.textContent =
    ".wwb { grid-column: 1 / -1; margin: 6px 0 0; font-size: 13px; line-height: 1.7; font-weight: 700; color: var(--muted); }";
    document.head.appendChild(st); })();
  var WWB_REG = { nba: 4, wnba: 4, ncaaw: 4, ncaam: 2, nfl: 4, ncaaf: 4, nhl: 3 };
  function wwbClock(p) { var c = p.clock || {}; if (typeof c.value === "number") return c.value; var m = String(c.displayValue || "").match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/); return m ? (Number(m[1] || 0) * 60 + Number(m[2])) : null; }
  function wwbCompute(lg, sum) {
    var sp = BX_SPORT[lg], reg = WWB_REG[lg]; if (!reg || !sum) return null;
    var cp = ((sum.header || {}).competitions || [])[0] || {}; if ((((cp.status || {}).type) || {}).state !== "post") return null;
    var seq = ((sum.plays || []).length ? sum.plays : (sum.scoringPlays || [])).filter(function (p) { return p && p.awayScore != null && p.homeScore != null && p.period; });
    if (!seq.length) return [];
    var last = seq[seq.length - 1], fa = Number(last.awayScore), fh = Number(last.homeScore), margin = Math.abs(fa - fh), win = fh > fa ? 1 : fa > fh ? -1 : 0;
    var maxP = 0; seq.forEach(function (p) { maxP = Math.max(maxP, Number(p.period.number) || 0); });
    var out = [], ots = maxP - reg;
    var post = Number(((sum.header || {}).season || {}).type) === 3;  // playoff hockey plays extra periods, never a shootout
    if (sp === "hockey" && ots >= 2 && !post) out.push("Went to a shootout");
    else if (ots === 1) out.push("Overtime"); else if (ots > 1) out.push(ots + " overtimes");
    // lead changes: each time the team in front changes (a tie in between doesn't count twice)
    var lead = 0, changes = 0, lateChanges = 0, lastChange = null, down = 0;
    seq.forEach(function (p) {
      var d = Number(p.homeScore) - Number(p.awayScore), s = d > 0 ? 1 : d < 0 ? -1 : 0, pn = Number(p.period.number) || 0;
      if (win && d * win < 0) down = Math.max(down, Math.abs(d));
      if (s && lead && s !== lead) { changes++; if (pn >= reg) lateChanges++; lastChange = p; }
      if (s) lead = s;
    });
    var lastName = reg === 2 ? "2nd half" : sp === "hockey" ? "3rd period" : "4th quarter";
    if (sp === "bball") { if (lateChanges >= 3) out.push(lateChanges + " lead changes in the " + lastName + (ots > 0 ? " and overtime" : "")); }
    else if (sp === "football") { if (changes >= 3) out.push(changes + " lead changes"); }
    // the winning side went in front for good late: basketball in the last 30 seconds, football in the last two minutes
    if (lastChange && sp !== "hockey") {
      var lp = Number(lastChange.period.number) || 0, ck = wwbClock(lastChange);
      if (lp >= reg && ck != null) {
        if (sp === "bball" && ck <= 30) out.push(ck <= 10 ? "Decided in the final 10 seconds" : "Decided in the final 30 seconds");
        if (sp === "football" && (ck <= 120 || lp > reg)) out.push(lp > reg ? "Won in overtime" : "Go-ahead score in the last two minutes");
      }
    }
    if (out.indexOf("Won in overtime") !== -1) out = out.filter(function (x) { return x !== "Overtime"; });
    if (sp === "bball" && margin <= 3 && !ots) out.push("One-possession finish");
    if (sp === "football" && margin <= 8 && margin > 0 && !ots) out.push("One-score game");
    if (sp === "hockey" && margin === 1 && !ots) out.push("One-goal game");
    var big = sp === "bball" ? 15 : sp === "football" ? 14 : 2;
    if (down >= big) out.push("Comeback from " + down + " down");
    return out.slice(0, 3);
  }
  function wwbPut(g, lg, sum) {
    var t; try { t = wwbCompute(lg, sum); } catch (e) { t = null; }
    if (!t) return; var cur = WWB[g.id]; if (cur && cur.t.join("|") === t.join("|")) return;
    WWB[g.id] = { t: t, at: Date.now() }; try { localStorage.setItem("slate-wwb", JSON.stringify(WWB)); } catch (e) {}
  }
  // the line on a finished card; asks for the game's summary once when nothing is saved yet
  function wwbNode(g, row, lazy) {
    if (!g || g.custom || !WWB_REG[g.league] || status(g).kind !== "over") return null;
    var c = WWB[g.id];
    if (!c) { var need = function () { if (!WWB[g.id] && !((bx.live[g.id] || {}).busy)) bxFetch(g); }; if (lazy && row) agSeen(row, need); else need(); return null; }
    if (!c.t.length) return null;
    var p = el("p", "wwb");
    p.appendChild(document.createTextNode(c.t.join(" · ")));
    return p;
  }

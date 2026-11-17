  // ---------- Live feed for basketball (3.37.0): NBA, WNBA and college, play by play ----------
  // Same page as football (145-live-feed.js: switcher, score bar, polling, swipe). This file draws what's below the score bar:
  // the court card (this period's shots from ESPN's shot locations, team fouls, scoring run, win probability) and the plays,
  // newest first under their quarter. Scores and big plays get a card; runs of minor plays (misses, rebounds, fouls, subs)
  // fold into one short row you can tap open. Everything comes from ESPN's game summary; nothing is estimated.
  function hpSecs(c) { var s = String(c || ""), m = /^(\d+):(\d+)/.exec(s); return m ? +m[1] * 60 + +m[2] : parseFloat(s) || 0; }
  function hpHalves(lg) { return lg === "ncaam"; }  // men's college plays two 20-minute halves; the rest play quarters
  function hpPerName(lg, n, long) {
    var reg = hpHalves(lg) ? 2 : 4;
    if (n > reg) { var k = n - reg; return (k > 1 ? k : "") + "OT"; }
    if (hpHalves(lg)) return long ? ordN(n) + " half" : (n === 1 ? "1H" : "2H");
    return long ? ordN(n) + " quarter" : "Q" + n;
  }
  // the players in the box score by ESPN id: name, jersey, position and their game so far
  function hpIndex(sum) {
    var ix = {};
    ((sum.boxscore || {}).players || []).forEach(function (t) { var tid = String((t.team || {}).id || "");
      (t.statistics || []).forEach(function (gr) { var lab = gr.labels || [];
        (gr.athletes || []).forEach(function (r) { var a = r.athlete || {}, id = String(a.id || ""); if (!id) return;
          var v = {}; lab.forEach(function (l, i) { v[l] = (r.stats || [])[i]; });
          ix[id] = { id: id, name: a.displayName || "", first: a.firstName || "", jer: a.jersey || "", tid: tid, pos: (a.position || {}).abbreviation || "", st: v }; }); }); });
    return ix;
  }
  function hpLine(P, k) {
    var s = P.st || {}, n = function (v) { return parseFloat(v) || 0; }, out = [];
    if (s.PTS == null || k === "none") return "";
    // 3.67.3: the gray boxes lead with the number that play is about (shooting on a miss, boards on a rebound)
    if (k === "fg" || k === "fg3") { if (s.FG) out.push(s.FG + " FG"); if (k === "fg3" && s["3PT"]) out.push(s["3PT"] + " 3PT"); out.push(n(s.PTS) + " pts"); return out.join(", "); }
    if (k === "ft") { if (s.FT) out.push(s.FT + " FT"); out.push(n(s.PTS) + " pts"); return out.join(", "); }
    if (k === "reb") { out.push(n(s.REB) + " reb"); if (s.OREB != null && n(s.OREB)) out.push(n(s.OREB) + " offensive"); return out.join(", "); }
    if (k === "ast") return n(s.AST) + " ast, " + n(s.PTS) + " pts";
    var fouls = function () { return n(s.PF) + (n(s.PF) === 1 ? " foul" : " fouls"); };
    if (k === "foul") return fouls() + ", " + n(s.PTS) + " pts";
    // 3.68.1 (DJ): every line leads with the stat the play is about. A turnover shows turnovers; an offensive foul counts as both a turnover and a personal foul
    if (k === "to" || k === "tofoul") { if (s.TO != null) out.push(n(s.TO) + " TO"); if (k === "tofoul") out.push(fouls()); if (!out.length) out.push(n(s.PTS) + " pts"); return out.join(", "); }
    if (k === "stl") return n(s.STL) + " stl, " + n(s.PTS) + " pts";
    if (k === "blk") return n(s.BLK) + " blk, " + n(s.REB) + " reb";
    if (k === "pts" || k === "3") { out.push(n(s.PTS) + " pts"); if (s.FG) out.push(s.FG + " FG"); if (k === "3" && s["3PT"]) out.push(s["3PT"] + " 3PT"); return out.join(", "); }
    out.push(n(s.PTS) + " pts"); if (n(s.REB)) out.push(n(s.REB) + " reb"); if (n(s.AST)) out.push(n(s.AST) + " ast");
    if (k === "3" && s["3PT"]) out.push(s["3PT"] + " 3PT"); if ((k === "blk" && n(s.BLK)) || (k === "all" && n(s.BLK) >= 2)) out.push(n(s.BLK) + " blk"); if ((k === "stl" && n(s.STL)) || (k === "all" && n(s.STL) >= 2)) out.push(n(s.STL) + " stl");
    if (k === "foul" && n(s.PF)) out.push(n(s.PF) + " fouls");
    return out.join(", ");
  }
  // a free throw, however ESPN types it: the NBA says "Free Throw - 1 of 2", college says "MadeFreeThrow" with "makes free throw 1 of 2" in the text (3.67.3: those were headlined "Two-pointer")
  function hpFT(pl) { return /free ?throw/i.test(String((pl.type || {}).text || "") + " " + String(pl.text || "")); }
  function hpPid(pl) { return String(pl.id || pl.sequenceNumber || ""); }
  // one play in plain words: its title, whether it gets a card ("big") or folds into the minor row, and the player to show
  function hpRead(pl, ix) {
    var ty = String((pl.type || {}).text || "").replace(/\s+/g, " "), tx = String(pl.text || "").replace(/\s+/g, " "), parts = (pl.participants || []).map(function (p) { return ix[String((p.athlete || {}).id || "")] || null; });
    var dist = (/(\d+)-foot/.exec(tx) || [])[1], three = /three point/i.test(tx) || Number(pl.scoreValue) === 3 || Number(pl.pointsAttempted) === 3;
    var o = { title: ty || "Play", big: false, kind: "", P: parts[0] || null, k: "", minor: "Play" };
    // the kind of shot in plain words (3.39.3): ESPN's type first, then its text ("makes 1-foot shot" is a shot at the rim, not a jumper)
    var shot = function () { var a = ty + " " + tx, d = Number(dist) || 0; return /dunk/i.test(a) ? "Dunk" : three ? "Three-pointer" : /putback/i.test(a) ? "Putback" : /tip/i.test(a) ? "Tip-in" : /layup|finger roll/i.test(a) ? "Layup" : /hook/i.test(a) ? "Hook shot" : /heave/i.test(a) ? "Heave" : /float/i.test(a) ? "Floater" : d && d <= 4 ? "Shot at the rim" : /jump|fade|pull ?up|step ?back|jumper/i.test(a) ? "Jumper" : "Two-pointer"; };
    var name = function (P) { return P ? P.name : ""; };
    // 3.67.3 (DJ): every play is a box. Scores stay green, turnovers red-edged, timeouts red, everything else gray
    if (/^End (Period|Game)|End of/i.test(ty)) { o.big = true; o.kind = "end"; o.P = null; o.title = tx.replace(/ the /, " the ") || "End of period"; return o; }
    if (/timeout/i.test(ty)) { o.big = true; o.kind = "to"; o.P = null; o.title = /official|tv/i.test(ty + tx) ? "TV timeout" : "Timeout" + (/^(.+?)\s+(Full|20 Sec\.?|Short)?\s*timeout/i.test(tx) ? ", " + tx.replace(/\s*(Full|20 Sec\.?|Short)?\s*timeout.*$/i, "") : ""); return o; }
    if (hpFT(pl)) {
      var of = (/(\d) of (\d)/.exec(ty) || /(\d) of (\d)/.exec(tx) || []), lab = of[1] ? " (" + of[1] + " of " + of[2] + ")" : /technical/i.test(ty + tx) ? " (technical)" : /flagrant/i.test(ty + tx) ? " (flagrant)" : "";
      if (pl.scoringPlay) { o.big = true; o.kind = "score"; o.title = "Free throw good" + lab; } else { o.big = true; o.kind = "miss"; o.title = "Free throw missed" + lab; o.minor = "Missed FT"; }
      o.k = "ft";
      return o;
    }
    if (pl.shootingPlay) {
      if (pl.scoringPlay) { o.big = true; o.kind = "score"; o.title = shot() + (dist && shot() !== "Dunk" ? ", " + dist + " ft" : ""); o.k = three ? "3" : "pts"; if (parts[1] && /assist/i.test(tx)) { o.P2 = parts[1]; o.k2 = "ast"; o.l2 = "assist"; } return o; }
      if (/blocks/i.test(tx)) { o.big = true; o.kind = "miss"; o.title = "Blocked" + (parts[1] ? " by " + fdShort(parts[1]) : ""); o.P = parts[1] || parts[0]; o.k = "blk"; if (parts[1] && parts[0]) { o.P2 = parts[0]; o.k2 = three ? "fg3" : "fg"; o.l2 = "shot blocked"; } return o; }
      o.big = true; o.kind = "miss"; o.k = three ? "fg3" : "fg";
      o.title = "Missed " + (three ? "three" : shot() === "Jumper" ? "jumper" : shot().toLowerCase()) + (dist && !/dunk|layup|tip|rim/i.test(shot()) ? ", " + dist + " ft" : ""); o.minor = "Miss"; return o;
    }
    if (/turnover|traveling/i.test(ty) || /turnover/i.test(tx)) {
      o.big = true; o.kind = "turn";
      // what kind of turnover, from ESPN's type and text; a second player from the other team is the one ESPN credits with the steal
      var a2 = ty + " " + tx, sub = /bad pass/i.test(a2) ? "Bad pass" : /lost ball/i.test(a2) ? "Lost ball" : /travel/i.test(a2) ? "Traveling" : /offensive foul|charge/i.test(a2) ? "Offensive foul" : /double dribble/i.test(a2) ? "Double dribble" : /shot clock/i.test(a2) ? "Shot clock violation" : /step/i.test(a2) && /out of bounds/i.test(a2) ? "Stepped out of bounds" : /goaltend/i.test(a2) ? "Offensive goaltending" : /3.?second/i.test(a2) ? "3 seconds" : /5.?second/i.test(a2) ? "5 seconds" : /8.?second/i.test(a2) ? "8 seconds" : /back ?court/i.test(a2) ? "Backcourt" : /palming|discontinued|carry/i.test(a2) ? "Carrying" : /inbound/i.test(a2) ? "Inbound turnover" : /out of bounds/i.test(a2) ? "Out of bounds" : /kicked/i.test(a2) ? "Kicked ball" : /lane/i.test(a2) ? "Lane violation" : "";
      var P0 = parts[0], P1 = parts[1], stl = P1 && (/steal/i.test(tx) || (P0 && P1.tid !== P0.tid));
      if (stl) { o.title = "Steal by " + fdShort(P1); o.P = P1; o.k = "stl"; o.desc = (P0 ? name(P0) + " " + (sub ? sub.toLowerCase() : "turnover") + ", " : (sub ? sub + ", " : "")) + "stolen by " + name(P1); if (P0) { o.P2 = P0; o.k2 = "to"; o.l2 = "turnover"; } }
      else { o.k = sub === "Offensive foul" ? "tofoul" : "to"; o.title = sub ? "Turnover: " + sub.toLowerCase() : "Turnover"; o.desc = P0 ? name(P0) + ": " + (sub ? sub.toLowerCase() : "turnover") : (sub ? sub + " (team turnover)" : "Team turnover"); }
      return o;
    }
    if (/technical|flagrant|ejection/i.test(ty + tx)) { o.big = true; o.kind = "turn"; o.k = /flagrant/i.test(ty + tx) ? "foul" : "none";  // a technical isn't a personal foul in the NBA: no stat line
      var fl = /flagrant[^0-9]*(\d)/i.exec(ty + " " + tx), why = ty.replace(/\s*technical( foul)?\s*/i, "").replace(/-/g, " ").trim().toLowerCase();
      o.title = /ejection|ejected/i.test(ty + tx) ? "Ejected" : /flagrant/i.test(ty + tx) ? "Flagrant foul" + (fl ? " " + fl[1] : "") : "Technical foul" + (why && why !== "technical" ? ": " + why : "");
      return o; }
    if (/challenge|review/i.test(ty)) { o.big = true; o.P = null;
      var res = /overturned/i.test(ty + tx) ? "call overturned" : /stands|upheld|supports/i.test(ty + tx) ? "call stands" : "", tm3 = (/\[([^\]]+)\]/.exec(tx) || /^(.+?) Coach's Challenge/i.exec(tx) || [])[1] || "";
      o.title = (/challenge/i.test(ty) ? "Coach's challenge" : "Replay review") + (res ? ": " + res : "");
      o.desc = /challenge/i.test(ty) ? (tm3 ? tm3 + " challenged the call" : "Coach's challenge") + (res ? "; the " + res.replace("call overturned", "call was overturned") : "") + (/retain/i.test(tx) ? ", and they keep their timeout" : /charged with a timeout/i.test(tx) ? ", and they lose a timeout" : "") : "The officials reviewed the play" + (res ? "; the " + res.replace("call overturned", "call was overturned") : "");
      return o; }
    var cap1 = function (t) { t = String(t || "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
    if (/foul/i.test(ty)) { o.big = true; o.kind = "foul"; o.title = cap1(/foul/i.test(ty) && ty.length > 4 ? ty : "Foul") + (parts[0] ? " on " + fdShort(parts[0]) : ""); o.minor = "Foul"; o.k = "foul"; return o; }
    if (/rebound/i.test(ty)) { o.big = true; o.kind = "miss"; o.reb = true; o.off = /offensive/i.test(ty + " " + tx); o.k = "reb"; o.title = (parts[0] ? "" : "Team ") + (o.off ? (parts[0] ? "Offensive rebound" : "offensive rebound") : (parts[0] ? "Defensive rebound" : "rebound")); o.minor = "Rebound"; return o; }
    if (/substitution/i.test(ty)) { o.title = "Sub"; o.minor = "Sub"; return o; }
    if (/jump ?ball/i.test(ty)) { o.big = true; o.kind = "miss"; o.P = null; o.title = "Jump ball"; o.minor = "Jump ball"; return o; }
    if (/violation|delay|kicked|lane|goaltend/i.test(ty + tx)) { o.big = true; o.kind = "miss"; o.P = null; o.title = cap1(ty); o.minor = "Violation"; return o; }
    o.big = true; o.kind = "miss"; o.P = null; o.title = cap1(o.title); return o;
  }
  // tags (right side of a card), all from ESPN's plays: lead change, tie, a scoring run, and-one, buzzer-beater, clutch, win probability swing
  function hpTags(plays, sum, g, sideOf, ix) {
    var out = {}, wpBy = {}, prevWp = null, pa = 0, ph = 0, run = { sd: "", n: 0 }, reg = hpHalves(g.league) ? 2 : 4, ft1 = {};
    (sum.winprobability || []).forEach(function (w) { if (w && w.playId != null && w.homeWinPercentage != null) wpBy[String(w.playId)] = w.homeWinPercentage; });
    plays.forEach(function (pl) { if (hpFT(pl) && /1 of 1/i.test(String((pl.type || {}).text || "") + " " + String(pl.text || "")) && !/technical|flagrant/i.test(String(pl.text || ""))) { var a = ((pl.participants || [])[0] || {}).athlete || {}; ft1[((pl.period || {}).number) + "|" + ((pl.clock || {}).displayValue) + "|" + a.id] = 1; } });
    plays.forEach(function (pl) {
      var pid = hpPid(pl), t = [], add = function (p, x, c) { t.push({ p: p, t: x, c: c || "" }); };
      var aS = pl.awayScore != null ? Number(pl.awayScore) : pa, hS = pl.homeScore != null ? Number(pl.homeScore) : ph, sd = sideOf[String((pl.team || {}).id || "")] || "";
      var lead0 = pa > ph ? "away" : ph > pa ? "home" : "", lead1 = aS > hS ? "away" : hS > aS ? "home" : "", pts = (aS - pa) + (hS - ph);
      if (pts > 0) {
        if (lead0 && lead1 && lead0 !== lead1) add(1, "Lead change", "hot"); else if (lead0 && !lead1) add(1, "Tie game", "hot");
        var who = aS !== pa ? "away" : "home"; if (run.sd === who) run.n += pts; else run = { sd: who, n: pts };
        if (run.n >= 8) add(2, abbr(g, who) + " " + run.n + "-0 run", "good");
        var a1 = ((pl.participants || [])[0] || {}).athlete || {};
        if (pl.shootingPlay && !hpFT(pl) && ft1[((pl.period || {}).number) + "|" + ((pl.clock || {}).displayValue) + "|" + a1.id]) add(3, "And-one", "hot");
        if (pl.shootingPlay && !hpFT(pl) && hpSecs((pl.clock || {}).displayValue) <= 1 && /\./.test(String((pl.clock || {}).displayValue || "")) ) add(2, "Buzzer-beater", "hot");
      }
      pa = aS; ph = hS;
      var per = Number((pl.period || {}).number) || 0, big = pts > 0 || /turnover|blocks|steals/i.test(String(pl.text || "") + String((pl.type || {}).text || ""));
      if (big && per >= reg && hpSecs((pl.clock || {}).displayValue) <= 300 && Math.abs(aS - hS) <= 5) add(4, "Clutch", "rz");
      var w = wpBy[pid]; if (w != null) { if (prevWp != null && Math.abs(w - prevWp) >= 0.08) { var up = w > prevWp ? "home" : "away"; add(5, "+" + Math.round(Math.abs(w - prevWp) * 100) + "% " + abbr(g, up), "swing"); } prevWp = w; }
      if (pid && t.length) out[pid] = t.sort(function (a, b) { return a.p - b.p; }).slice(0, 3);
    });
    return { tags: out, run: run };
  }
  function hpFeed(body, g, sum, anchor, aTop, sc) {
    var comp = ((sum.header || {}).competitions || [])[0] || {}, cst = comp.status || {}, st = cst.type || {}, sideOf = {}, scoreOf = {}, recOf = {}, lines = {};
    (comp.competitors || []).forEach(function (k) { var id = String((k.team || {}).id || ""), sd = k.homeAway === "home" ? "home" : "away"; sideOf[id] = sd; scoreOf[sd] = k.score; recOf[sd] = ((k.record || [])[0] || {}).summary || ""; lines[sd] = (k.linescores || []).map(function (l) { return l.displayValue != null ? l.displayValue : l.value; }); });
    var plays = (sum.plays || []).filter(function (p) { return p && (p.id || p.sequenceNumber); }), ix = hpIndex(sum), over = st.state === "post", lg = g.league;
    var TG = hpTags(plays, sum, g, sideOf, ix), tags = TG.tags, per = Number(cst.period) || 0, det = String(st.shortDetail || st.detail || "");
    var brk = /half|end of/i.test(det);
    // the score bar: badges, records, the score (held until the scoring play is in the feed) and the clock
    var shown = fdSumScore(g.id, sum); if (shown) { scoreOf.away = shown.a; scoreOf.home = shown.h; }
    var bug = el("div", "fd-bug"), aS = Number(scoreOf.away), hS = Number(scoreOf.home);
    ["away", "mid", "home"].forEach(function (sd) {
      if (sd === "mid") { var mid = el("div", "fd-mid");
        mid.appendChild(el("b", null, over ? "Final" : /halftime/i.test(det) ? "Half" : /^end/i.test(det) ? "End" : st.state === "pre" ? timeText(g.start) : (cst.displayClock || "")));
        if (!over && st.state !== "pre" && !/halftime/i.test(det)) mid.appendChild(el("i", null, per ? hpPerName(lg, per) : ""));
        else if (/halftime/i.test(det)) mid.appendChild(el("i", null, "Halftime"));
        bug.appendChild(mid); return; }
      var tm = el("div", "fd-tm fd-tm-" + sd); tm.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      var nm = el("b", null, recOf[sd] || ""); nm.setAttribute("aria-label", short(g, sd) + (recOf[sd] ? ", " + recOf[sd] : "")); tm.appendChild(nm);
      var scn = el("b", "fd-sc" + ((sd === "away" ? aS < hS : hS < aS) ? " trail" : ""), String(scoreOf[sd] != null ? scoreOf[sd] : "–"));
      if (sd === "away") { bug.appendChild(tm); bug.appendChild(scn); } else { bug.appendChild(scn); bug.appendChild(tm); }
    });
    body.appendChild(bug);
    var hdr = document.querySelector("#pane-r > header.top"); $("view-feed").style.setProperty("--fd-top", (hdr ? hdr.offsetHeight : 0) + "px");
    // each team's top-rated player so far (3.66.7): ESPN's own player rating from the live scoreboard, the same one the live
    // notifications use, so a big all-round game counts, not just points. A team ESPN hasn't rated yet shows its leading scorer.
    var card = null, lead = {}, rated = {}, raw = scoreRaw(g.id) || {}, sdAb = {};
    (comp.competitors || []).forEach(function (k) { var ab = (k.team || {}).abbreviation; if (ab) sdAb[ab] = k.homeAway === "home" ? "home" : "away"; });
    if (raw.state === "in" || raw.state === "post") (raw.ld || []).forEach(function (L) { if (L.c !== "rating" || !L.full) return; var sd = sdAb[L.t]; if (!sd || rated[sd]) return;
      Object.keys(ix).forEach(function (id) { var P = ix[id]; if (!rated[sd] && sideOf[P.tid] === sd && P.name === L.full && (P.st || {}).PTS != null) rated[sd] = P; }); });
    Object.keys(ix).forEach(function (id) { var P = ix[id], sd = sideOf[P.tid], pts = parseFloat((P.st || {}).PTS) || 0; if (sd && (!lead[sd] || pts > (parseFloat(lead[sd].st.PTS) || 0))) lead[sd] = P; });
    var nR = (rated.away ? 1 : 0) + (rated.home ? 1 : 0); ["away", "home"].forEach(function (sd) { if (rated[sd]) lead[sd] = rated[sd]; });
    if (lead.away || lead.home) {
      var nL = (lead.away ? 1 : 0) + (lead.home ? 1 : 0), ttl = nR === nL ? "Top rated" : nR ? "Top players" : "Top scorers";
      card = el("div", "fd-field hp-top"); card.appendChild(el("p", "fd-wpl hp-tl", ttl + (over ? "" : " so far")));
      // 3.67.3 (DJ: the card wasn't using its space): the two players sit side by side, name over stats, and the win probability is one row
      var two = el("div", "hp-two");
      ["away", "home"].forEach(function (sd) { var P = lead[sd]; if (!P) return; var row = el("div", "fd-pl"); row.appendChild(hpJersey(g, sd, P)); var nmw = el("span", "fd-pn"); nmw.appendChild(el("b", null, fdShort(P))); nmw.appendChild(el("em", "fd-pos", abbr(g, sd))); var lnx = hpLine(P, "all"); if (lnx) nmw.appendChild(el("i", null, lnx)); row.appendChild(nmw); two.appendChild(row); });
      card.appendChild(two);
      body.appendChild(card);
    }
    var wp = (sum.winprobability || [])[(sum.winprobability || []).length - 1];
    if (!over && wp && wp.homeWinPercentage != null) {
      var host = card || body, hp = Math.round(wp.homeWinPercentage * 100), ap = 100 - hp, wr = el("div", "fd-wp");
      wr.appendChild(el("span", null, abbr(g, "away") + " " + ap + "%"));
      var bar = el("span", "fd-wpb"), ba = el("i"), bh = el("i"); ba.style.width = ap + "%"; ba.style.background = fdTint(g, "away"); bh.style.width = hp + "%"; bh.style.background = fdTint(g, "home"); bar.appendChild(ba); bar.appendChild(bh); wr.appendChild(bar);
      wr.appendChild(el("span", null, hp + "% " + abbr(g, "home")));
      wr.setAttribute("aria-label", "ESPN win probability: " + abbr(g, "away") + " " + ap + " percent, " + abbr(g, "home") + " " + hp + " percent");
      var wl = el("p", "fd-wpl", "Win probability (ESPN)"); if (card) { wr.classList.add("hp-wp1"); wl.className = "fd-wpl hp-wpl1"; wl.textContent = "Win prob. (ESPN)"; wr.insertBefore(wl, wr.firstChild); host.appendChild(wr); } else { host.appendChild(wl); host.appendChild(wr); }
    }
    // the plays, newest first: scores and big plays as cards, everything else (misses, rebounds, fouls) as one plain line; subs left out
    FD.hpOpen = FD.hpOpen || {};
    var list = el("div", "fd-list"), items = 0, cap2 = 12 * (1 + (+FD.more || 0)), fresh = FD.seen || null, seenNow = {}, total = 0;
    // a trip to the line (same shooter, same moment) shows as one card with the last free throw
    var trips = {}, tripOf = {};
    plays.forEach(function (p) { if (!hpFT(p)) return; var a = ((p.participants || [])[0] || {}).athlete || {}, k = ((p.period || {}).number) + "|" + ((p.clock || {}).displayValue) + "|" + a.id; (trips[k] = trips[k] || []).push(p); tripOf[hpPid(p)] = trips[k]; });
    // 3.67.3: a rebound right after a miss (or a block, or a missed last free throw) shares that play's box; and each player's
    // latest foul is marked when it puts them in foul trouble or out of the game (the box score's foul count is the game so far)
    var rebOf = {}, rebSkip = {}, lastFoul = {}, isReb = function (p) { return /rebound/i.test(String((p.type || {}).text || "")); };
    plays.forEach(function (p, i) { var pv = plays[i - 1], ty0 = String((p.type || {}).text || "");
      if (/foul/i.test(ty0) && !/technical/i.test(ty0)) { var fa = String((((p.participants || [])[0] || {}).athlete || {}).id || ""); if (fa) lastFoul[fa] = hpPid(p); }
      if (!pv || !isReb(p) || ((p.period || {}).number) !== ((pv.period || {}).number)) return;
      var pty = String((pv.type || {}).text || ""), missed = !pv.scoringPlay && (pv.shootingPlay || hpFT(pv)); if (!missed) return;
      // the dead-ball "team rebound" ESPN logs between two free throws isn't a play: left out
      var Tp = tripOf[hpPid(pv)]; if (Tp && Tp.length > 1 && hpPid(Tp[Tp.length - 1]) !== hpPid(pv)) { if (!(p.participants || []).length) rebSkip[hpPid(p)] = 1; return; }
      rebOf[hpPid(pv)] = p; rebSkip[hpPid(p)] = 1; });
    var foulLimit = lg === "nba" || lg === "wnba" ? 6 : 5;
    var plRow = function (P, k, sdF, lab) { var psd = sideOf[P.tid] || sdF || "away", row = el("div", "fd-pl"); row.appendChild(hpJersey(g, psd, P)); var nmw = el("span", "fd-pn"); nmw.appendChild(el("b", null, fdShort(P))); nmw.appendChild(el("em", "fd-pos", lab || P.pos || abbr(g, psd))); var lnx = hpLine(P, k); if (lnx) nmw.appendChild(el("i", null, lnx)); row.appendChild(nmw); return row; };
    var byP = {}, order = []; plays.forEach(function (p) { var n = Number((p.period || {}).number) || 0; if (!byP[n]) { byP[n] = []; order.push(n); } byP[n].push(p); });
    for (var oi = order.length - 1; oi >= 0 && items < cap2; oi--) {
      var pn = order[oi], ps = byP[pn].slice().reverse(), isCur = !over && pn === per && !brk;
      var grp = null;
      var flush = function () {};  // 3.38.1: minor plays are plain one-line rows, nothing folded
      for (var pi = 0; pi < ps.length && items < cap2; pi++) {
        var pl = ps[pi], rd = hpRead(pl, ix), pid = hpPid(pl), isNew = !!(fresh && !fresh[pid]), ck = String((pl.clock || {}).displayValue || ""); seenNow[pid] = 1; total++;
        var T = tripOf[pid], tg = tags[pid], raw = rd.desc || String(pl.text || "").replace(/\s+/g, " ").trim();
        if (T && T.length > 1) {
          if (hpPid(T[T.length - 1]) !== pid) continue;
          var made = T.filter(function (x) { return x.scoringPlay; }).length, n3 = T.length;
          rd.big = true; rd.kind = made ? "score" : "miss"; rd.k = "ft"; rd.minor = "Missed FTs";
          rd.title = made === n3 ? (n3 === 2 ? "Both free throws good" : "All " + n3 + " free throws good") : made ? "Makes " + made + " of " + n3 + " free throws" : "Misses " + n3 + " free throws";
          raw = T.map(function (x, i) { var t3 = String(x.text || "").replace(/\s+/g, " ").trim(), nm3 = rd.P && rd.P.name; return i && nm3 && t3.indexOf(nm3 + " ") === 0 ? t3.slice(nm3.length + 1) : t3; }).join(", ");
          var tm2 = [], tseen = {}; T.forEach(function (x) { (tags[hpPid(x)] || []).forEach(function (y) { if (!tseen[y.t]) { tseen[y.t] = 1; tm2.push(y); } }); }); var runs = tm2.filter(function (y) { return /-0 run$/.test(y.t); }); if (runs.length > 1) tm2 = tm2.filter(function (y) { return !/-0 run$/.test(y.t) || y === runs[runs.length - 1]; });  // one run tag per trip: the latest
          tg = tm2.length ? tm2.slice(0, 3) : null;
        }
        if (rd.minor === "Sub" || rebSkip[pid]) continue;  // subs are left out; a rebound that follows a miss is on the miss's box
        flush(); items++;
        var gray = /^(miss|foul|to|end)$/.test(rd.kind), rb = rebOf[pid], rbR = rb ? hpRead(rb, ix) : null;
        if ((rd.kind === "foul" || rd.k === "tofoul") && rd.P && lastFoul[rd.P.id] === pid) { var pf = parseFloat((rd.P.st || {}).PF) || 0, ft0 = pf >= foulLimit ? "Fouled out" : pf === foulLimit - 1 ? "Foul trouble" : ""; if (ft0) tg = (tg || []).concat([{ t: ft0, c: "" }]); }
        var sd2 = sideOf[String((pl.team || {}).id || "")] || "";
        var c2 = el("div", "fd-play hp-play" + (rd.kind ? " fd-k-" + rd.kind : "") + (isNew ? " fd-new" : "")); c2.setAttribute("data-id", pid);
        if (sd2 && rd.kind !== "to" && rd.kind !== "end") c2.style.setProperty("--hp-team", fdTint(g, sd2));
        var ph = el("div", "fd-ph"); ph.appendChild(el("span", null, hpPerName(lg, pn) + " " + ck + (sd2 ? " · " + abbr(g, sd2) : "")));
        ph.appendChild(el("span", "fd-psc", abbr(g, "away") + " " + (pl.awayScore != null ? pl.awayScore : "") + "  " + abbr(g, "home") + " " + (pl.homeScore != null ? pl.homeScore : ""))); c2.appendChild(ph);
        if (tg) { var tw = el("div", "fd-tags"); tg.forEach(function (x) { tw.appendChild(el("span", "fd-tag" + (x.c ? " " + x.c : ""), fdTagText(x.t))); }); c2.appendChild(tw); }
        c2.appendChild(el("p", "fd-pt", fdTitleText(rd.title)));
        // the gray and red boxes say it in the headline and the player's line; ESPN's sentence is kept where it adds something
        if (raw && raw !== rd.title && (!gray || (!rd.P && rd.kind === "miss" && !rd.reb))) c2.appendChild(el("p", "fd-px", raw));
        if (rd.P) c2.appendChild(plRow(rd.P, rd.k, sd2, ""));
        if (rd.P2) c2.appendChild(plRow(rd.P2, rd.k2, sd2, rd.l2));
        if (rbR) { if (rbR.P) c2.appendChild(plRow(rbR.P, "reb", "", rbR.off ? "offensive rebound" : "rebound")); else { var rsd = sideOf[String((rb.team || {}).id || "")] || ""; c2.appendChild(el("p", "fd-px hp-treb", "Team rebound" + (rsd ? ", " + abbr(g, rsd) : ""))); } }
        list.appendChild(c2);
      }
      flush();
    }
    if (!plays.length) list.appendChild(el("p", "pv-none", st.state === "pre" ? "Plays show up here once the game tips off." : "No plays yet."));
    fdAgo(list, sum, st.state === "in", g.id); body.appendChild(list);
    if (plays.length > total) { var mb = el("button", "bets-more fd-more", "Show earlier plays"); mb.type = "button"; mb.addEventListener("click", function () { FD.more = (+FD.more || 0) + 1; renderFeed(); }); list.appendChild(mb); }
    var bxw = feedBox(g, sum); if (bxw) body.appendChild(bxw);
    body.appendChild(el("p", "pv-at fd-at", over ? "Final" : "Updates every few seconds while this page is open"));
    FD.seen = Object.assign(FD.seen || {}, seenNow);
    if (anchor) requestAnimationFrame(function () { var n2 = body.querySelector('[data-id="' + anchor + '"]'); if (!n2) return; var dlt = n2.getBoundingClientRect().top - aTop; if (Math.abs(dlt) > 1) { if (sc) sc.scrollTop += dlt; else window.scrollBy(0, dlt); } });
  }
  // the box score under the plays (3.40.3, football and basketball), from the same ESPN summary the feed already has
  function feedBox(g, sum) {
    if (!boxShown(g)) return null;
    var b = null; try { b = bxNorm(g.league, sum, null); } catch (e) { b = null; }
    if (!b || !b.teams || !b.teams.length) return null;
    var w = el("div", "fd-box"); w.setAttribute("data-id", "box"); w.appendChild(el("h3", "fd-boxh", "Box score"));
    var pl = null; try { pl = bxPlayers(g, b, true, false); } catch (e) { pl = null; } if (!pl) return null;
    w.appendChild(pl);
    w.addEventListener("click", function () { setTimeout(function () { if (state.view !== "feed") return;
      // 3.66.9: redrawing keeps your place (on the unfolded Duo the page jumped back to the top)
      var sc = isDuo ? $("pane-r") : null, y = sc ? sc.scrollTop : (window.scrollY || 0); renderFeed(); if (sc) sc.scrollTop = y; else window.scrollTo(0, y); }, 0); }, true);  // "Show all players" and the team switch redraw this page
    return w;
  }
  // a player's jersey (3.66.10, DJ): a basketball tank top in the team's color with the number on it, in place of the numbered circle
  function hpJersey(g, sd, P) {
    var c = badgeColor(g, sd) || "#555", ink = lum(c) > 0.62 ? "#111" : "#fff", j = el("span", "hp-jer");
    j.style.cssText = "position:relative;flex:none;width:26px;height:28px;display:grid;place-items:center";
    j.innerHTML = '<svg viewBox="0 0 24 26" width="26" height="28" style="position:absolute;inset:0" aria-hidden="true"><path d="M6.6 1H9.9Q12 5.6 14.1 1H17.4Q18 6.4 22 7.6V24.2Q22 25 21.2 25H2.8Q2 25 2 24.2V7.6Q6 6.4 6.6 1Z" fill="' + c + '" stroke="rgba(127,127,127,.45)" stroke-width="1"/></svg>';
    var nb = el("b", null, P.jer ? P.jer : ""); nb.style.cssText = "position:relative;margin-top:7px;font-size:" + (String(P.jer || "").length > 1 ? "10" : "11") + "px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;color:" + ink; j.appendChild(nb);
    j.setAttribute("aria-hidden", "true"); return j;
  }
  // one emoji in front of each big play's headline (3.66.8, DJ: "Where are the emojis?"): never inside the play text
  function fdTitleText(t) {
    t = String(t || "");
    var e = /^three-pointer/i.test(t) ? "🎯" : /^(dunk|alley-oop)/i.test(t) ? "💥" : /^free throw good/i.test(t) ? "🏀" : /^(two-pointer|layup|jumper|hook|tip|floater|bank|fadeaway|putback|shot|jump shot|reverse|driving|turnaround|finger roll)/i.test(t) ? "🏀"
      : /^blocked/i.test(t) ? "🚫" : /^steal/i.test(t) ? "🖐️" : /^ejected/i.test(t) ? "🟥" : /^(technical|flagrant)/i.test(t) ? "⚠️" : /^(coach's challenge|replay review)/i.test(t) ? "📺"
      : /^(td:|pick six|fumble return touchdown|return touchdown|.*touchdown!?$)/i.test(t) ? "🏈" : /^field goal is good/i.test(t) ? "🥅" : /^field goal (missed|blocked)/i.test(t) ? "❌"
      : /^safety/i.test(t) ? "🛡️" : /^intercepted/i.test(t) ? "🧤" : /^fumble/i.test(t) ? "😬" : /sacked|^sack/i.test(t) ? "💥" : /^penalty/i.test(t) ? "🚩"
      : /timeout/i.test(t) ? "🚨" : /^(miss(ed|es) |free throw missed)/i.test(t) ? "❌" : /^(both free throws|all \d free throws|makes \d of)/i.test(t) ? "🏀" : /offensive rebound/i.test(t) ? "🔁" : /rebound/i.test(t) ? "🙌"
      : /^turnover/i.test(t) ? "↩️" : /foul/i.test(t) ? "✋" : /^end /i.test(t) ? "🔔" : /^jump ball/i.test(t) ? "⛹️" : "";
    return e ? e + " " + t : t;
  }
  // how long since the newest play came in (3.66.8, DJ: "a small timer since last live play appeared"), from ESPN's wall clock on each play;
  // shown while the game is live, ticking every second
  function fdLastAt(sum) {
    var ps = (sum.plays || []).slice(), dr = sum.drives || {}; (dr.previous || []).concat(dr.current ? [dr.current] : []).forEach(function (d) { (d && d.plays || []).forEach(function (p) { ps.push(p); }); });
    var best = 0; ps.forEach(function (p) { var t = Date.parse(p.wallclock || ""); if (t > best) best = t; });
    var lastP = ps[ps.length - 1]; return { t: best, key: ps.length + "|" + (lastP ? String(lastP.id || lastP.sequenceNumber || "") : "") };
  }
  // 3.68.9 (DJ: "I expect it to reset to zero after a new play arrives"): ESPN's feed runs about 40 seconds behind its own clock, so the
  // timer counts from the moment a new play shows up on this page. Only the first look at a game, before any new play, uses ESPN's time.
  var FD_AGO = {};
  function fdAgoText(t) { var s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? s + "s ago" : s < 3600 ? Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2) + " ago" : ""; }
  // 3.66.10 (DJ): it sits small at the top left, directly above the newest play, and starts again from 0 when a new play comes in
  function fdAgo(list, sum, live, gid) {
    if (!live) return; var L = fdLastAt(sum), o = FD_AGO[gid];
    if (!o) o = FD_AGO[gid] = { key: L.key, t: L.t }; else if (o.key !== L.key) { o.key = L.key; o.t = Date.now(); }
    var t = o.t; if (!t || Date.now() - t > 3600000) return;
    var x = el("p", "fd-ago", "Last play " + fdAgoText(t)); x.setAttribute("data-t", String(t));
    x.style.cssText = "margin:0 0 2px 2px;text-align:left;font-size:11px;font-weight:600;line-height:1.2;color:var(--muted);font-variant-numeric:tabular-nums";
    list.insertBefore(x, list.firstChild);
  }
  setInterval(function () { if (state.view !== "feed" || document.hidden) return; var xs = document.querySelectorAll("#feed-body .fd-ago"); for (var i = 0; i < xs.length; i++) { var tx = "Last play " + fdAgoText(+xs[i].getAttribute("data-t")); if (xs[i].textContent !== tx) xs[i].textContent = tx; } }, 1000);
  // one emoji in front of each play tag (3.52.4, DJ's request, like News): never inside the play text
  function fdTagText(t) {
    t = String(t || "");
    var e = /takes the lead|lead change/i.test(t) ? "🔄" : /ties it|tie game/i.test(t) ? "🤝" : /big play/i.test(t) ? "🔥" : /-0 run$/i.test(t) ? "🔥"
      : /^converted/i.test(t) ? "✅" : /^stopped/i.test(t) ? "🛑" : /^1st down/i.test(t) ? "⛓️" : /^\+\d+%/.test(t) ? "📈" : /^flag/i.test(t) ? "🚩"
      : /red zone/i.test(t) ? "🚨" : /two-minute|clutch/i.test(t) ? "⏱️" : /and-one/i.test(t) ? "💪" : /buzzer/i.test(t) ? "🚨" : /^fouled out/i.test(t) ? "🚪" : /^foul trouble/i.test(t) ? "⚠️" : "";
    return e ? e + " " + t : t;
  }

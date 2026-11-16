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
    if (s.PTS == null) return "";
    out.push(n(s.PTS) + " pts"); if (n(s.REB)) out.push(n(s.REB) + " reb"); if (n(s.AST)) out.push(n(s.AST) + " ast");
    if (k === "3" && s["3PT"]) out.push(s["3PT"] + " 3PT"); if (k === "blk" && n(s.BLK)) out.push(n(s.BLK) + " blk"); if (k === "stl" && n(s.STL)) out.push(n(s.STL) + " stl");
    if (k === "foul" && n(s.PF)) out.push(n(s.PF) + " fouls");
    return out.join(", ");
  }
  function hpPid(pl) { return String(pl.id || pl.sequenceNumber || ""); }
  // one play in plain words: its title, whether it gets a card ("big") or folds into the minor row, and the player to show
  function hpRead(pl, ix) {
    var ty = String((pl.type || {}).text || "").replace(/\s+/g, " "), tx = String(pl.text || "").replace(/\s+/g, " "), parts = (pl.participants || []).map(function (p) { return ix[String((p.athlete || {}).id || "")] || null; });
    var dist = (/(\d+)-foot/.exec(tx) || [])[1], three = /three point/i.test(tx) || Number(pl.scoreValue) === 3 || Number(pl.pointsAttempted) === 3;
    var o = { title: ty || "Play", big: false, kind: "", P: parts[0] || null, k: "", minor: "Play" };
    var shot = function () { return /dunk/i.test(ty + tx) ? "Dunk" : three ? "Three-pointer" : /layup|finger roll/i.test(ty + tx) ? "Layup" : /hook/i.test(ty + tx) ? "Hook shot" : /tip/i.test(ty + tx) ? "Tip-in" : "Jumper"; };
    if (/^End (Period|Game)|End of/i.test(ty)) { o.note = true; o.title = tx.replace(/ the /, " the ") || "End of period"; return o; }
    if (/timeout/i.test(ty)) { o.note = true; o.title = /official|tv/i.test(ty + tx) ? "TV timeout" : "Timeout" + (/^(.+?)\s+(Full|20 Sec\.?|Short)?\s*timeout/i.test(tx) ? ", " + tx.replace(/\s*(Full|20 Sec\.?|Short)?\s*timeout.*$/i, "") : ""); return o; }
    if (/Free Throw/i.test(ty)) {
      var of = (/(\d) of (\d)/.exec(ty) || /(\d) of (\d)/.exec(tx) || []), lab = of[1] ? " (" + of[1] + " of " + of[2] + ")" : /technical/i.test(ty + tx) ? " (technical)" : /flagrant/i.test(ty + tx) ? " (flagrant)" : "";
      if (pl.scoringPlay) { o.big = true; o.kind = "score"; o.title = "Free throw good" + lab; } else { o.title = "Free throw missed" + lab; o.minor = "Missed FT"; }
      return o;
    }
    if (pl.shootingPlay) {
      if (pl.scoringPlay) { o.big = true; o.kind = "score"; o.title = shot() + (dist && shot() !== "Dunk" ? ", " + dist + " ft" : ""); o.k = three ? "3" : ""; return o; }
      if (/blocks/i.test(tx)) { o.big = true; o.title = "Blocked" + (parts[1] ? " by " + fdShort(parts[1]) : ""); o.P = parts[1] || parts[0]; o.k = "blk"; return o; }
      o.title = "Missed " + (three ? "three" : shot() === "Jumper" ? "jumper" : shot().toLowerCase()); o.minor = "Miss"; return o;
    }
    if (/turnover|traveling/i.test(ty) || /turnover/i.test(tx)) {
      o.big = true; o.kind = "turn";
      if (/steals/i.test(tx) && parts[1]) { o.title = "Stolen by " + fdShort(parts[1]); o.P = parts[1]; o.k = "stl"; }
      else o.title = "Turnover" + ((ty = ty.replace(/\s*turnover\s*/i, "").trim()) ? ": " + ty.toLowerCase() : "");
      return o;
    }
    if (/technical|flagrant|ejection/i.test(ty + tx)) { o.big = true; o.kind = "turn"; o.title = /ejection|ejected/i.test(ty + tx) ? "Ejected" : /flagrant/i.test(ty + tx) ? "Flagrant foul" : "Technical foul"; o.k = "foul"; return o; }
    if (/challenge|review/i.test(ty)) { o.big = true; o.title = "Coach's challenge"; o.P = null; return o; }
    if (/foul/i.test(ty)) { o.title = ty; o.minor = "Foul"; o.k = "foul"; return o; }
    if (/rebound/i.test(ty)) { o.title = ty; o.minor = "Rebound"; return o; }
    if (/substitution/i.test(ty)) { o.title = "Sub"; o.minor = "Sub"; return o; }
    if (/jump ?ball/i.test(ty)) { o.title = "Jump ball"; o.minor = "Jump ball"; return o; }
    if (/violation|delay|kicked|lane|goaltend/i.test(ty + tx)) { o.minor = "Violation"; return o; }
    return o;
  }
  // tags (right side of a card), all from ESPN's plays: lead change, tie, a scoring run, and-one, buzzer-beater, clutch, win probability swing
  function hpTags(plays, sum, g, sideOf, ix) {
    var out = {}, wpBy = {}, prevWp = null, pa = 0, ph = 0, run = { sd: "", n: 0 }, reg = hpHalves(g.league) ? 2 : 4, ft1 = {};
    (sum.winprobability || []).forEach(function (w) { if (w && w.playId != null && w.homeWinPercentage != null) wpBy[String(w.playId)] = w.homeWinPercentage; });
    plays.forEach(function (pl) { if (/Free Throw - 1 of 1/i.test(String((pl.type || {}).text || "")) && !/technical|flagrant/i.test(String(pl.text || ""))) { var a = ((pl.participants || [])[0] || {}).athlete || {}; ft1[((pl.period || {}).number) + "|" + ((pl.clock || {}).displayValue) + "|" + a.id] = 1; } });
    plays.forEach(function (pl) {
      var pid = hpPid(pl), t = [], add = function (p, x, c) { t.push({ p: p, t: x, c: c || "" }); };
      var aS = pl.awayScore != null ? Number(pl.awayScore) : pa, hS = pl.homeScore != null ? Number(pl.homeScore) : ph, sd = sideOf[String((pl.team || {}).id || "")] || "";
      var lead0 = pa > ph ? "away" : ph > pa ? "home" : "", lead1 = aS > hS ? "away" : hS > aS ? "home" : "", pts = (aS - pa) + (hS - ph);
      if (pts > 0) {
        if (lead0 && lead1 && lead0 !== lead1) add(1, "Lead change", "hot"); else if (lead0 && !lead1) add(1, "Tie game", "hot");
        var who = aS !== pa ? "away" : "home"; if (run.sd === who) run.n += pts; else run = { sd: who, n: pts };
        if (run.n >= 8) add(2, abbr(g, who) + " " + run.n + "-0 run", "good");
        var a1 = ((pl.participants || [])[0] || {}).athlete || {};
        if (pl.shootingPlay && !/Free Throw/i.test(String((pl.type || {}).text || "")) && ft1[((pl.period || {}).number) + "|" + ((pl.clock || {}).displayValue) + "|" + a1.id]) add(3, "And-one", "hot");
        if (pl.shootingPlay && !/Free Throw/i.test(String((pl.type || {}).text || "")) && hpSecs((pl.clock || {}).displayValue) <= 1 && /\./.test(String((pl.clock || {}).displayValue || "")) ) add(2, "Buzzer-beater", "hot");
      }
      pa = aS; ph = hS;
      var per = Number((pl.period || {}).number) || 0, big = pts > 0 || /turnover|blocks|steals/i.test(String(pl.text || "") + String((pl.type || {}).text || ""));
      if (big && per >= reg && hpSecs((pl.clock || {}).displayValue) <= 300 && Math.abs(aS - hS) <= 5) add(4, "Clutch", "rz");
      var w = wpBy[pid]; if (w != null) { if (prevWp != null && Math.abs(w - prevWp) >= 0.08) { var up = w > prevWp ? "home" : "away"; add(5, "+" + Math.round(Math.abs(w - prevWp) * 100) + "% " + abbr(g, up), "swing"); } prevWp = w; }
      if (pid && t.length) out[pid] = t.sort(function (a, b) { return a.p - b.p; }).slice(0, 3);
    });
    return { tags: out, run: run };
  }
  // the court card: each team's shots this period on its own half court (made filled, missed hollow, the latest ringed)
  function hpCourtSvg(shots, col, label) {
    var arc = "M3 0 V13.9 A23.75 23.75 0 0 0 47 13.9 V0";
    var s = '<svg viewBox="0 0 50 31" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + label + '"><rect x="0.3" y="0.3" width="49.4" height="31" rx="1.5" class="hp-fl"/>' +
      '<path d="' + arc + '" class="hp-ln"/><rect x="17" y="0" width="16" height="19" class="hp-ln hp-key"/><circle cx="25" cy="19" r="6" class="hp-ln"/>' +
      '<line x1="22" y1="4" x2="28" y2="4" class="hp-ln hp-bb"/><circle cx="25" cy="5.25" r="0.9" class="hp-rim"/>';
    shots.forEach(function (sh, i) {
      var x = Math.max(1, Math.min(49, sh.x)), y = Math.max(1, Math.min(30, sh.y + 4.75)), last = i === shots.length - 1;
      if (last) s += '<circle cx="' + x + '" cy="' + y + '" r="2.6" class="hp-last" style="stroke:' + col + '"/>';
      s += sh.made ? '<circle cx="' + x + '" cy="' + y + '" r="1.25" style="fill:' + col + '"/>' : '<circle cx="' + x + '" cy="' + y + '" r="1.05" class="hp-miss" style="stroke:' + col + '"/>';
    });
    return s + "</svg>";
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
    // the court card: the latest period with plays
    var curP = 0; plays.forEach(function (p) { curP = Math.max(curP, Number((p.period || {}).number) || 0); });
    var card = null;
    if (curP && !over) {
      card = el("div", "fd-field hp-card");
      var head = el("div", "fd-dd"), reg = hpHalves(lg) ? 2 : 4, lastP = plays[plays.length - 1] || {}, mg = Math.abs(aS - hS);
      var runTxt = TG.run.n >= 6 ? abbr(g, TG.run.sd) + " on a " + TG.run.n + "-0 run" : "";
      head.appendChild(el("b", null, runTxt || hpPerName(lg, curP, true)));
      head.appendChild(el("span", null, runTxt ? hpPerName(lg, curP, true) + " shots" : "Shots this " + (hpHalves(lg) && curP <= 2 ? "half" : curP > reg ? "overtime" : "quarter")));
      if (!brk && per >= reg && hpSecs(cst.displayClock) <= 300 && mg <= 5 && st.state === "in") head.appendChild(el("em", "fd-rz", "Clutch"));
      card.appendChild(head);
      var courts = el("div", "hp-courts"), anyXY = false;
      ["away", "home"].forEach(function (sd) {
        var shots = [], fgm = 0, fga = 0, fouls = 0, tos = 0;
        plays.forEach(function (p) {
          if (sideOf[String((p.team || {}).id || "")] !== sd) return;
          var ty = String((p.type || {}).text || ""), tx = String(p.text || ""), pn = Number((p.period || {}).number) || 0;
          if (/timeout/i.test(ty) && !/official/i.test(ty)) tos++;
          if (pn !== curP) return;
          if (/foul/i.test(ty) && !/technical|turnover/i.test(ty)) fouls++;
          if (p.shootingPlay && !/Free Throw/i.test(ty)) { fga++; if (p.scoringPlay) fgm++; var c = p.coordinate || {}; if (c.x != null && c.x >= 0 && c.x <= 50 && c.y >= 0 && c.y <= 50) shots.push({ x: Number(c.x), y: Number(c.y), made: !!p.scoringPlay }); }
        });
        // a blocked shot is listed under the shooting team: it stays a miss
        if (shots.length) anyXY = true;
        var col = fdTint(g, sd), w = el("div", "hp-ct hp-ct-" + sd), cap = el("div", "hp-cap");
        var dot = el("i", "hp-dot"); dot.style.background = col; cap.appendChild(dot); cap.appendChild(el("b", null, abbr(g, sd)));
        cap.appendChild(el("span", null, fgm + "/" + fga + " FG · " + fouls + (fouls === 1 ? " foul" : " fouls")));
        w.appendChild(cap);
        var box = el("div", "hp-svg"); box.innerHTML = hpCourtSvg(shots, col, abbr(g, sd) + " shots this period: " + fgm + " made of " + fga); w.appendChild(box);
        w.setAttribute("data-xy", shots.length ? "1" : "0");
        courts.appendChild(w);
      });
      if (!anyXY) courts.classList.add("hp-noxy");  // no shot locations from ESPN for this game: just the numbers
      card.appendChild(courts);
      body.appendChild(card);
    }
    var wp = (sum.winprobability || [])[(sum.winprobability || []).length - 1];
    if (!over && wp && wp.homeWinPercentage != null) {
      var host = card || body, hp = Math.round(wp.homeWinPercentage * 100), ap = 100 - hp, wr = el("div", "fd-wp");
      wr.appendChild(el("span", null, abbr(g, "away") + " " + ap + "%"));
      var bar = el("span", "fd-wpb"), ba = el("i"), bh = el("i"); ba.style.width = ap + "%"; ba.style.background = fdTint(g, "away"); bh.style.width = hp + "%"; bh.style.background = fdTint(g, "home"); bar.appendChild(ba); bar.appendChild(bh); wr.appendChild(bar);
      wr.appendChild(el("span", null, hp + "% " + abbr(g, "home")));
      wr.setAttribute("aria-label", "ESPN win probability: " + abbr(g, "away") + " " + ap + " percent, " + abbr(g, "home") + " " + hp + " percent");
      host.appendChild(el("p", "fd-wpl", "Win probability (ESPN)")); host.appendChild(wr);
    }
    // the plays, newest first under their period; minor plays between two cards fold into one row
    FD.hpOpen = FD.hpOpen || {};
    var list = el("div", "fd-list"), items = 0, cap2 = FD.more ? 1e9 : 90, fresh = FD.seen || null, seenNow = {}, total = 0;
    // a trip to the line (same shooter, same moment) shows as one card with the last free throw
    var trips = {}, tripOf = {};
    plays.forEach(function (p) { if (!/Free Throw/i.test(String((p.type || {}).text || ""))) return; var a = ((p.participants || [])[0] || {}).athlete || {}, k = ((p.period || {}).number) + "|" + ((p.clock || {}).displayValue) + "|" + a.id; (trips[k] = trips[k] || []).push(p); tripOf[hpPid(p)] = trips[k]; });
    var byP = {}, order = []; plays.forEach(function (p) { var n = Number((p.period || {}).number) || 0; if (!byP[n]) { byP[n] = []; order.push(n); } byP[n].push(p); });
    for (var oi = order.length - 1; oi >= 0 && items < cap2; oi--) {
      var pn = order[oi], ps = byP[pn].slice().reverse(), isCur = !over && pn === per && !brk;
      var dh = el("div", "fd-drive"), dt = el("span", "fd-dt");
      dt.appendChild(el("b", null, hpPerName(lg, pn, true) + (isCur ? " · now" : "")));
      var la = (lines.away || [])[pn - 1], lh = (lines.home || [])[pn - 1];
      if (la != null && lh != null) dt.appendChild(el("span", null, abbr(g, "away") + " " + la + ", " + abbr(g, "home") + " " + lh + " this " + (pn > (hpHalves(lg) ? 2 : 4) ? "overtime" : hpHalves(lg) ? "half" : "quarter")));
      dh.appendChild(dt); list.appendChild(dh);
      var grp = null;
      var flush = function () {
        if (!grp) return; var G = grp; grp = null; items++;
        var key = G.ps[0].pid, open = !!FD.hpOpen[key], w = el("div", "hp-min" + (open ? " open" : "") + (G.isNew ? " fd-new" : ""));
        var b = el("button", "hp-mb"); b.type = "button"; b.setAttribute("aria-expanded", open ? "true" : "false");
        var kinds = []; G.ps.forEach(function (x) { if (kinds.indexOf(x.rd.minor) < 0) kinds.push(x.rd.minor); });
        b.appendChild(el("span", "hp-mt", (G.ps[0].clock || "") + (G.ps.length > 1 && G.ps[G.ps.length - 1].clock !== G.ps[0].clock ? "–" + G.ps[G.ps.length - 1].clock : "")));
        b.appendChild(el("span", "hp-mk", kinds.slice(0, 4).join(" · ")));
        b.appendChild(el("i", null, G.ps.length + (G.ps.length === 1 ? " play" : " plays")));
        b.addEventListener("click", function () { FD.hpOpen[key] = !FD.hpOpen[key]; w.classList.toggle("open"); b.setAttribute("aria-expanded", FD.hpOpen[key] ? "true" : "false"); });
        w.appendChild(b);
        if (open) { var ul = el("div", "hp-ml"); G.ps.forEach(function (x) { var r = el("p"); r.appendChild(el("span", null, x.clock)); r.appendChild(document.createTextNode(String(x.pl.text || x.rd.title).replace(/\s+/g, " "))); ul.appendChild(r); }); w.appendChild(ul); }
        list.appendChild(w);
      };
      for (var pi = 0; pi < ps.length && items < cap2; pi++) {
        var pl = ps[pi], rd = hpRead(pl, ix), pid = hpPid(pl), isNew = !!(fresh && !fresh[pid]), ck = String((pl.clock || {}).displayValue || ""); seenNow[pid] = 1; total++;
        var T = tripOf[pid], tg = tags[pid], raw = String(pl.text || "").replace(/\s+/g, " ").trim();
        if (T && T.length > 1) {
          if (hpPid(T[T.length - 1]) !== pid) continue;
          var made = T.filter(function (x) { return x.scoringPlay; }).length, n3 = T.length;
          rd.big = made > 0; rd.kind = made ? "score" : ""; rd.minor = "Missed FTs";
          rd.title = made === n3 ? (n3 === 2 ? "Both free throws good" : "All " + n3 + " free throws good") : made ? "Makes " + made + " of " + n3 + " free throws" : "Misses " + n3 + " free throws";
          raw = T.map(function (x, i) { var t3 = String(x.text || "").replace(/\s+/g, " ").trim(), nm3 = rd.P && rd.P.name; return i && nm3 && t3.indexOf(nm3 + " ") === 0 ? t3.slice(nm3.length + 1) : t3; }).join(", ");
          var tm2 = [], tseen = {}; T.forEach(function (x) { (tags[hpPid(x)] || []).forEach(function (y) { if (!tseen[y.t]) { tseen[y.t] = 1; tm2.push(y); } }); }); tg = tm2.length ? tm2.slice(0, 3) : null;
        }
        if (rd.note) { flush(); items++; list.appendChild(el("p", "fd-note" + (isNew ? " fd-new" : ""), rd.title)); continue; }
        if (!rd.big) { if (!grp) grp = { ps: [], isNew: false }; grp.ps.push({ pl: pl, rd: rd, pid: pid, clock: ck }); if (isNew) grp.isNew = true; continue; }
        flush(); items++;
        var sd2 = sideOf[String((pl.team || {}).id || "")] || "";
        var c2 = el("div", "fd-play hp-play" + (rd.kind ? " fd-k-" + rd.kind : "") + (isNew ? " fd-new" : "")); c2.setAttribute("data-id", pid);
        if (sd2) c2.style.setProperty("--hp-team", fdTint(g, sd2));
        var ph = el("div", "fd-ph"); ph.appendChild(el("span", null, hpPerName(lg, pn) + " " + ck + (sd2 ? " · " + abbr(g, sd2) : "")));
        ph.appendChild(el("span", "fd-psc", abbr(g, "away") + " " + (pl.awayScore != null ? pl.awayScore : "") + "  " + abbr(g, "home") + " " + (pl.homeScore != null ? pl.homeScore : ""))); c2.appendChild(ph);
        if (tg) { var tw = el("div", "fd-tags"); tg.forEach(function (x) { tw.appendChild(el("span", "fd-tag" + (x.c ? " " + x.c : ""), x.t)); }); c2.appendChild(tw); }
        c2.appendChild(el("p", "fd-pt", rd.title));
        if (raw && raw !== rd.title) c2.appendChild(el("p", "fd-px", raw));
        if (rd.P) { var P = rd.P, psd = sideOf[P.tid] || sd2 || "away", row = el("div", "fd-pl"); row.appendChild(fdJersey(g, psd, P)); var nmw = el("span", "fd-pn"); nmw.appendChild(el("b", null, fdShort(P))); if (P.pos) nmw.appendChild(el("em", "fd-pos", P.pos)); var lnx = hpLine(P, rd.k); if (lnx) nmw.appendChild(el("i", null, lnx)); row.appendChild(nmw); c2.appendChild(row); }
        list.appendChild(c2);
      }
      flush();
    }
    if (!plays.length) list.appendChild(el("p", "pv-none", st.state === "pre" ? "Plays show up here once the game tips off." : "No plays yet."));
    body.appendChild(list);
    if (!FD.more && plays.length > total) { var mb = el("button", "bets-more fd-more", "Show earlier plays"); mb.type = "button"; mb.addEventListener("click", function () { FD.more = true; renderFeed(); }); body.appendChild(mb); }
    body.appendChild(el("p", "pv-at fd-at", over ? "Final" : "Updates every few seconds while this page is open"));
    FD.seen = Object.assign(FD.seen || {}, seenNow);
    if (anchor) requestAnimationFrame(function () { var n2 = body.querySelector('.fd-play[data-id="' + anchor + '"]'); if (!n2) return; var dlt = n2.getBoundingClientRect().top - aTop; if (Math.abs(dlt) > 1) { if (sc) sc.scrollTop += dlt; else window.scrollBy(0, dlt); } });
  }

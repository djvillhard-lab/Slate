  // ---- Live highlight: the one thing worth knowing about a live game right now.
  // The app scores candidates from ESPN's live summary (hot shooting, big lines and paces, runs, comebacks);
  // free rules only (no Claude): the line is worked out right here on the phone.
  var HL = {};
  function hlNum(x) { var n = parseFloat(String(x == null ? "" : x).replace("+", "")); return isNaN(n) ? 0 : n; }
  function hlMA(x) { var p = String(x || "").split("-"); return p.length === 2 ? [hlNum(p[0]), hlNum(p[1])] : [0, 0]; }
  // a finished game's closing line: past tense, nothing that only makes sense mid-game, the winner's story first
  function hlFinal(c, teams) {
    var win = null; Object.keys(teams).forEach(function (k) { if (!win || teams[k].score > win.score) win = teams[k]; });
    var out = [];
    c.forEach(function (x) {
      var k = x.key.split("|")[0], t = x.text, sc = x.score;
      if (k === "hot" || k === "run" || k === "lead") return;
      if (k === "td") {
        var m = /^(.*) has (\d+)-(\d+)-(\d+), (a triple-double|triple-double watch)$/.exec(t); if (!m) return;
        if (/watch/.test(m[5])) { t = m[1] + " finished with " + m[2] + " pts, " + m[3] + " reb and " + m[4] + " ast"; sc -= 12; }
        else t = m[1] + " finished with a triple-double: " + m[2] + " pts, " + m[3] + " reb, " + m[4] + " ast";
      }
      t = t.replace(/ are (\d+)-of-(\d+) from three/, " went $1-of-$2 from three").replace(/ are shooting /, " shot ")
        .replace(/, on pace for \d+/, "").replace(/ has (\d+) pts( in \d+ min)?/, " scored $1").replace(/ has (\d+) rebounds/, " grabbed $1 rebounds")
        .replace(/ is (\d+-\d+) from the field/, " went $1 from the field").replace(/ has thrown /, " threw ").replace(/ has a hat trick/, " had a hat trick")
        .replace(/ has two goals/, " scored twice").replace(/ has (\d+) saves and a shutout going/, " made $1 saves for the shutout").replace(/ has (\d+) saves/, " made $1 saves")
        .replace(/ leads all scorers with /, " led all scorers with ").replace(/ erased a (\d+)-point deficit/, " came back from $1 down to win");
      var f = x.facts || {};
      if (win && (f.team === win.abbr || f.team === win.name)) sc += 8;
      out.push({ key: x.key, score: sc, tone: x.tone, text: t, facts: x.facts, tm: x.tm });
    });
    return out;
  }
  // the finish: the go-ahead-for-good score, if it came in the last moments or overtime
  function hlWinner(sum, sport, lg, teams) {
    var list = (sum.scoringPlays || []).length ? sum.scoringPlays : (sum.plays || []).filter(function (p) { return p.scoringPlay; });
    var ids = Object.keys(teams), A = ids.filter(function (i) { return teams[i].side === "away"; })[0], H = ids.filter(function (i) { return teams[i].side === "home"; })[0];
    if (!list.length || !A || !H || teams[A].score === teams[H].score) return null;
    var W = teams[A].score > teams[H].score ? A : H, lead = function (p) { var a = Number(p.awayScore), h = Number(p.homeScore); return W === A ? a > h : h > a; };
    var go = null, prev = false; list.forEach(function (p) { var l = lead(p); if (l && !prev) go = p; prev = l; });
    if (!go || !prev) return null;
    var per = Number((go.period || {}).number) || 0, cdv = String((go.clock || {}).displayValue || ""), clk = Number((go.clock || {}).value);
    if (!isFinite(clk)) { var cm = /^(\d+):(\d+)/.exec(cdv); clk = cm ? Number(cm[1]) * 60 + Number(cm[2]) : /^\d+(\.\d+)?$/.test(cdv) ? Number(cdv) : NaN; }
    var coll = (LEAGUES[lg] || {}).college && lg !== "ncaaw", reg = sport === "bball" ? (coll ? 2 : 4) : sport === "football" ? 4 : sport === "hockey" ? 3 : sport === "baseball" ? 9 : 2;
    var ot = per > reg, mins = parseInt(cdv, 10) || 0;
    var lastSec = sport === "bball" ? per >= reg && clk <= 10 : sport === "football" ? per === reg && clk <= 30 : sport === "hockey" ? per === reg && clk <= 60 : false;
    var late = sport === "bball" ? per >= reg && clk <= 60 : sport === "football" ? per === reg && clk <= 120 : sport === "hockey" ? per === reg && clk <= 180 : sport === "baseball" ? per >= reg && teams[W].side === "home" : sport === "soccer" ? mins >= 85 : false;
    if (!ot && !late) return null;
    // 3.113.4 (DJ: Notre Dame "won it on Smith's 26-foot three in overtime" in a 110-100 game): a score only "won it" when the game
    // stayed close enough for it to decide it. Basketball by one possession (3 points), football by one score (8). Otherwise the
    // last lead change is just where the winner went ahead, and the line goes to the next fact (top performer and the rest)
    var margin = Math.abs(Number(teams[A].score) - Number(teams[H].score));
    if (sport === "bball" && margin > 3 || sport === "football" && margin > 8) return null;
    var nm = function (x) { return String(x || "").trim().replace(/^[A-Z]\.\s*/, ""); };
    var tx = String(go.text || ""), what;
    if (sport === "football") {
      var m1 = /^(.+?) pass to (.+?) for (\d+) yds?/i.exec(tx), m2 = /^(.+?) run for (\d+) yds?/i.exec(tx), m3 = /^(.+?) (\d+) (?:yd|yard) (?:FG|field goal)/i.exec(tx);
      what = m1 ? nm(m1[1]) + "'s " + m1[3] + "-yd TD pass to " + nm(m1[2]) : m2 ? nm(m2[1]) + "'s " + m2[2] + "-yd TD run" : m3 ? nm(m3[1]) + "'s " + m3[2] + "-yd field goal" : "";
      var ln = function (x) { return nm(String(x || "").replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "").split(" ").slice(-1)[0]); };
      var f1 = /^(.+?) (\d+) Yd pass from (.+?)(?:\s*\(|$)/i.exec(tx), f2 = /^(.+?) (\d+) Yd (?:Run|Rush)/i.exec(tx), f3 = /^(.+?) (\d+) Yd Field Goal/i.exec(tx), f4 = /^(.+?) (\d+) Yd (Fumble|Interception|Punt|Kickoff) Return/i.exec(tx);
      if (!what) what = f1 ? ln(f1[3]) + "'s " + f1[2] + "-yd TD pass to " + ln(f1[1]) : f2 ? ln(f2[1]) + "'s " + f2[2] + "-yd TD run" : f3 ? ln(f3[1]) + "'s " + f3[2] + "-yd field goal" : f4 ? ln(f4[1]) + "'s " + f4[2] + "-yd " + f4[3].toLowerCase() + " return TD" : "";
    } else if (sport === "bball") {
      var mb = /^(.+?) makes (.+)$/i.exec(tx);
      if (mb) { var sh = mb[2].toLowerCase(), ft = (/(\d+)-foot/.exec(sh) || [])[1], shot = /free throw/.test(sh) ? "free throw" + (/(\d) of (\d)/.test(sh) ? "s" : "") : /three point/.test(sh) ? "three" : /dunk/.test(sh) ? "dunk" : /layup/.test(sh) ? "layup" : /tip/.test(sh) ? "tip-in" : /hook/.test(sh) ? "hook shot" : "jumper";
        what = nm(mb[1].replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "").split(" ").slice(-1)[0]) + "'s " + (ft && shot !== "dunk" && shot !== "layup" && shot.indexOf("free") < 0 ? ft + "-foot " : "") + shot; }
    } else if (sport === "hockey") {
      var sc0 = (go.participants || []).filter(function (x) { return x.type === "scorer"; })[0] || (go.participants || [])[0];
      what = sc0 ? nm(((sc0.athlete || {}).shortName) || ((sc0.athlete || {}).displayName)) + "'s goal" : "";
    } else if (sport === "soccer") {
      var ath = (((go.participants || [])[0] || {}).athlete || {}); what = ath.displayName ? nm(ath.lastName || ath.displayName) + "'s goal" : "";
    }
    if (!what) { what = tx.replace(/\s*\(.*?\)\s*/g, " ").replace(/,?\s*for a TD/i, "").trim(); if (what.length > 70) what = what.slice(0, 68) + "…"; what = what ? "this: " + what : ""; }
    var tn = teams[W].short || teams[W].name, when = ot ? (sport === "soccer" ? " in extra time" : " in overtime") : sport === "baseball" ? " in the bottom of the " + per + (per === 9 ? "th" : "th") : sport === "soccer" ? " in the " + mins + "th minute" : " with " + cdv + " left";
    var text = what ? tn + " won it on " + what + when : tn + " won it" + when;
    if (sport === "baseball") text = tn + " walked it off" + (what ? " on " + what.replace(/^this: /, "") : "") + when;
    return { k: W + "|" + per, team: tn, text: text, sc: lastSec ? 80 : ot ? 72 : 66 };
  }
  function hlCompute(lg, sum) {
    var sport = BX_SPORT[lg], head = ((sum.header || {}).competitions || [])[0] || {}, st = ((head.status || {}).type || {});
    var done = st.state === "post";
    if (st.state !== "in" && !done) return null;
    var period = (head.status || {}).period || 0, teams = {}, c = [], lead1 = null, ctxP = {}, ctxT = {};
    (head.competitors || []).forEach(function (k) { var tm = k.team || {}; teams[String(tm.id)] = { abbr: tm.abbreviation || "", full: tm.displayName || "", name: tm.shortDisplayName || tm.displayName || "", short: tm.location || tm.shortDisplayName || "", nick: tm.nickname || tm.name || "", side: k.homeAway, score: hlNum(k.score) }; });
    var tid = Object.keys(teams);
    // tm: the one team a line is about (a player's team, or the team it names), shown in front of it on the slate
    var curTm = "", tmOf = function (f) { if (curTm) return curTm; var n = f && f.team; if (!n) return ""; for (var i in teams) if (teams[i].name === n || teams[i].abbr === n || teams[i].short === n || i === String(n)) return teams[i].abbr; return ""; };
    function add(key, score, tone, text, facts) { c.push({ key: key, score: score, tone: tone, text: text, facts: facts, tm: tmOf(facts) }); }
    var box = sum.boxscore || {}, hkP = {}, liveSc = null, bestP = {}, plStory = null;
    // 3.139.1: "Suárez (2)" -> "Suárez has scored twice"; "Barkov and Reinhart" -> "Barkov and Reinhart have scored" (past tense once it's over)
    var scoredTx = function (names) { if (/,| and /.test(names)) return names + (done ? " scored" : " have scored");
      var m0 = /^(.*) \((\d)\)$/.exec(names), n0 = m0 ? +m0[2] : 1, nm0 = m0 ? m0[1] : names;
      return nm0 + (n0 >= 3 ? (done ? " had a hat trick" : " has a hat trick") : n0 === 2 ? (done ? " scored twice" : " has scored twice") : (done ? " scored" : " has scored")); };
    // 3.139.1 (DJ: "Basketball games should show best player and stats from each team"): each team's best player so far, by sport
    var best = function (k, sc, tx) { if (!bestP[k] || sc > bestP[k].sc) bestP[k] = { sc: sc, tx: tx }; };
    // team shooting (basketball)
    var tsAll = {};   // each team's box-score totals by team id (3.144.2, for how a finished game went)
    (box.teams || []).forEach(function (bt) {
      var t = teams[String((bt.team || {}).id)]; if (t) { var m0 = {}; (bt.statistics || []).forEach(function (x) { m0[x.name] = x.displayValue; }); tsAll[String((bt.team || {}).id)] = m0; }
      if (!t || sport !== "bball") return;
      var m = {}; (bt.statistics || []).forEach(function (x) { m[x.name] = x.displayValue; });
      var three = hlMA(m["threePointFieldGoalsMade-threePointFieldGoalsAttempted"]), fg = hlMA(m["fieldGoalsMade-fieldGoalsAttempted"]);
      ctxT[t.abbr] = "FG " + fg.join("-") + ", 3PT " + three.join("-") + (m.turnovers ? ", TO " + m.turnovers : "") + (m.totalRebounds ? ", REB " + m.totalRebounds : "");
      if (three[1] >= 6 && three[0] / three[1] >= 0.6) add("3hot|" + t.abbr + "|" + three[0], 30 + three[0] * 3 + (three[0] / three[1]) * 20, 1, t.name + " are " + three[0] + "-of-" + three[1] + " from three", { team: t.name, threes: three.join("-") });
      if (three[1] >= 14 && three[0] / three[1] <= 0.2) add("3cold|" + t.abbr + "|" + Math.floor(three[1] / 4), 28 + three[1], -1, t.name + " are " + three[0] + "-of-" + three[1] + " from three", { team: t.name, threes: three.join("-") });
      if (fg[1] >= 30 && fg[0] / fg[1] <= 0.34) add("fgcold|" + t.abbr + "|" + Math.floor(fg[1] / 10), 30, -1, t.name + " are shooting " + Math.round(100 * fg[0] / fg[1]) + "% (" + fg.join("-") + ")", { team: t.name, fg: fg.join("-") });
      if (fg[1] >= 25 && fg[0] / fg[1] >= 0.62) add("fghot|" + t.abbr + "|" + Math.floor(fg[1] / 10), 32, 1, t.name + " are shooting " + Math.round(100 * fg[0] / fg[1]) + "% (" + fg.join("-") + ")", { team: t.name, fg: fg.join("-") });
    });
    // players
    (box.players || []).forEach(function (tp) {
      var tkey = String((tp.team || {}).id), t = teams[tkey] || { abbr: "" }, tFor = teams[tkey] ? " for " + teams[tkey].abbr : "";   // 3.141.1: by abbreviation, so the slate always finds the team (hlRows)
      curTm = t.abbr || "";
      (tp.statistics || []).forEach(function (grp) {
        var lab = grp.labels || [], gname = String(grp.name || "").toLowerCase();
        (grp.athletes || []).forEach(function (a) {
          var s2 = {}; lab.forEach(function (l, i) { s2[l] = (a.stats || [])[i]; });
          var nm = (a.athlete || {}).displayName || "", sh = (a.athlete || {}).shortName || nm, id = (a.athlete || {}).id || nm;
          if (sport === "bball") {
            var pts = hlNum(s2.PTS), min = hlNum(String(s2.MIN || "0").split(":")[0]), reb = hlNum(s2.REB), ast = hlNum(s2.AST), fg = hlMA(s2.FG), th = hlMA(s2["3PT"]);
            if (pts > 0 && tFor) { var xs = [pts + " pts"]; if (reb >= 5) xs.push(reb + " reb"); if (ast >= 5) xs.push(ast + " ast");
              best(tkey, pts + (reb + ast) / 100, nm + (done ? " had " : " has ") + (xs.length > 1 ? xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1] : xs[0]) + " (" + fg.join("-") + " FG)" + tFor); }
            if (false) add("fav|" + id + "|" + Math.floor(pts / 5), 38 + pts * 1.2, 1, "Your player " + nm + ": " + pts + " pts, " + reb + " reb, " + ast + " ast (" + fg.join("-") + " FG)", { player: nm, team: t.abbr, starred: true, line: pts + " pts, " + reb + " reb, " + ast + " ast, " + fg.join("-") + " FG" });
            (ctxP[t.abbr] = ctxP[t.abbr] || []).push({ n: sh, pts: pts, l: pts + "p " + reb + "r " + ast + "a " + fg.join("-") + " FG " + th.join("-") + " 3PT " + min + "m" });
            if (pts >= 8 && (!lead1 || pts > lead1.pts)) lead1 = { pts: pts, nm: nm, id: id, abbr: t.abbr, line: pts + " pts, " + reb + " reb, " + ast + " ast, " + fg.join("-") + " FG" };
            // a hot start: lots of points in few minutes (catches a college scorer going off early)
            if (pts >= 10 && min > 0 && pts / min >= 0.85 && pts < 20) add("hot|" + id + "|" + Math.floor(pts / 4), 30 + pts * 1.4 + (pts / min) * 10, 1, nm + " has " + pts + " pts in " + min + " min (" + fg.join("-") + " FG" + (th[0] >= 2 ? ", " + th.join("-") + " 3PT" : "") + ")", { player: nm, team: t.abbr, line: pts + " pts in " + min + " min, " + fg.join("-") + " FG, " + th.join("-") + " 3PT" });
            if (pts >= 20) {
              var pace = min >= 8 ? Math.round(pts / min * 36) : 0, txt = nm + " has " + pts + " pts" + (min ? " in " + min + " min" : "") + " (" + fg.join("-") + " FG" + (th[0] >= 3 ? ", " + th[0] + " threes" : "") + ")";
              if (pace >= 45 && pts < 45) txt += ", on pace for " + pace;
              add("pts|" + id + "|" + Math.floor(pts / 5), pts * 1.6 + Math.max(0, pace - 35) * 0.8 + (pts >= 50 ? 40 : pts >= 40 ? 15 : 0), 1, txt, { player: nm, team: t.abbr, line: pts + " pts, " + reb + " reb, " + ast + " ast, " + min + " min, " + fg.join("-") + " FG, " + th.join("-") + " 3PT" });
            }
            var dbl = [pts, reb, ast].filter(function (v) { return v >= 10; }).length, near = [pts, reb, ast].filter(function (v) { return v >= 7; }).length;
            if (near === 3) add("td|" + id + "|" + dbl, 34 + dbl * 8, 1, nm + " has " + pts + "-" + reb + "-" + ast + (dbl === 3 ? ", a triple-double" : ", triple-double watch"), { player: nm, team: t.abbr, line: pts + " pts, " + reb + " reb, " + ast + " ast" });
            if (reb >= 15) add("reb|" + id + "|" + Math.floor(reb / 3), reb * 2, 1, nm + " has " + reb + " rebounds", { player: nm, line: reb + " reb" });
            if (fg[1] >= 9 && fg[0] / fg[1] <= 0.2) add("cold|" + id + "|" + Math.floor(fg[1] / 3), 24 + fg[1], -1, nm + " is " + fg.join("-") + " from the field", { player: nm, team: t.abbr, line: pts + " pts, " + fg.join("-") + " FG" });
          } else if (sport === "football") {
            var yds = hlNum(s2.YDS), td = hlNum(s2.TD);
            if (tFor && yds > 0 && /^(passing|rushing|receiving)$/.test(gname)) { var tdT = td ? " and " + (td === 1 ? "a TD" : td + " TD") : "";
              best(tkey, gname === "passing" ? yds * 0.5 + td * 20 - hlNum(s2.INT) * 10 : yds + td * 20, nm + (done ? " had " : " has ") + yds + " " + gname + " yds" + tdT + tFor); }
            if (gname === "passing" && (yds >= 275 || td >= 3)) add("pass|" + id + "|" + Math.floor(yds / 50) + td, yds / 8 + td * 8, 1, nm + " " + yds + " passing yds, " + td + " TD", { player: nm, line: (s2["C/ATT"] || "") + ", " + yds + " yds, " + td + " TD, " + (s2.INT || 0) + " INT" });
            if (gname === "passing" && hlNum(s2.INT) >= 3) add("int|" + id + "|" + s2.INT, 40, -1, nm + " has thrown " + s2.INT + " interceptions", { player: nm, line: s2.INT + " INT" });
            if ((gname === "rushing" || gname === "receiving") && (yds >= 125 || td >= 2)) add(gname + "|" + id + "|" + Math.floor(yds / 25) + td, yds / 5 + td * 8, 1, nm + " " + yds + " " + (gname === "rushing" ? "rushing" : "receiving") + " yds" + (td ? ", " + td + " TD" : ""), { player: nm, line: yds + " yds, " + td + " TD" });
          } else if (sport === "baseball") {
            if (tFor && (gname || String(grp.type || "").toLowerCase()) === "batting") { var hh = hlNum(s2.H), ab = hlNum(s2.AB), hr = hlNum(s2.HR), rbi = hlNum(s2.RBI);
              if (hh >= 1) best(tkey, hh * 10 + hr * 25 + rbi * 8, nm + (done ? " went " : " is ") + hh + "-for-" + ab + (hr ? ", " + (hr === 1 ? "a HR" : hr + " HR") : "") + (rbi ? ", " + rbi + " RBI" : "") + tFor); }
            if (tFor && (gname || String(grp.type || "").toLowerCase()) === "pitching") { var ip = parseFloat(s2.IP) || 0, kk = hlNum(s2.K), er = hlNum(s2.ER);
              if (ip >= 5) best(tkey, ip * 8 + kk * 4 - er * 10, nm + (done ? " had " : " has ") + kk + " K in " + s2.IP + " IP (" + er + " ER)" + tFor); }
          } else if (sport === "hockey") {
            var g2 = hlNum(s2.G), sv = hlNum(s2.SV), a2 = hlNum(s2.A), ln = (a.athlete || {}).lastName || String(nm).split(" ").slice(-1)[0];
            if (g2 || a2) (hkP[t.abbr] = hkP[t.abbr] || []).push({ n: ln, g: g2, a: a2, id: id });
            if (sv >= 15 && hlNum(s2.GA) === 0 && sv < 30 && !done) add("so|" + id + "|" + Math.floor(sv / 5), 26 + sv, 1, ln + " has " + sv + " saves and a shutout going", { player: nm, line: sv + " saves, 0 GA" });
            if (g2 >= 2) add("g|" + id + "|" + g2, g2 * 22, 1, nm + (g2 >= 3 ? " has a hat trick" : " has two goals"), { player: nm, line: g2 + " goals" });
            if (sv >= 30) add("sv|" + id + "|" + Math.floor(sv / 5), sv, 1, nm + " has " + sv + " saves" + (hlNum(s2.GA) === 0 ? " and a shutout going" : ""), { player: nm, line: sv + " saves, " + s2.GA + " GA" });
          }
        });
      });
    });
    curTm = "";
    // hockey: who scored, multi-point nights, the shots and the power play (no score or clock in the line)
    if (sport === "hockey" && tid.length === 2) {
      var hT = function (i) { return "the " + teams[i].name; }, abbrId = {}; tid.forEach(function (i) { abbrId[teams[i].abbr] = i; });
      var andL = function (xs) { return xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]; };
      tid.forEach(function (i) {
        var ps = (hkP[teams[i].abbr] || []), sc0 = ps.filter(function (x) { return x.g; }).sort(function (x, y) { return y.g - x.g; });
        if (sc0.length) { var ng = sc0.reduce(function (n, x) { return n + x.g; }, 0), names = sc0.map(function (x) { return x.n + (x.g >= 2 ? " (" + x.g + ")" : ""); });
          add("hksc|" + i + "|" + ng, 36 + ng * 6, 1, andL(names) + (done ? " scored for " : (sc0.length === 1 && sc0[0].g === 1 ? " has scored for " : " have scored for ")) + hT(i), { team: teams[i].name }); }
        ps.forEach(function (x) { var pts = x.g + x.a; if (pts >= 3) add("hkpts|" + x.id + "|" + pts, 40 + pts * 8, 1, x.n + (done ? " had " : " has ") + pts + " points (" + x.g + " G, " + x.a + " A)", { player: x.n, team: teams[i].name });
          else if (x.a >= 2 && !x.g) add("hka|" + x.id + "|" + x.a, 34, 1, x.n + (done ? " set up two goals" : " has two assists"), { player: x.n }); });
      });
      // 3.134.6 (DJ: "In games like soccer and hockey, I want the live one-liners to always show the teams' goal scorers"):
      // every scorer for each team (away first, as on the card), used below as the live line
      var hkL = []; [tid.filter(function (i) { return teams[i].side !== "home"; })[0], tid.filter(function (i) { return teams[i].side === "home"; })[0]].forEach(function (i) {
        if (!i) return; var s1 = (hkP[teams[i].abbr] || []).filter(function (x) { return x.g; }).sort(function (x, y) { return y.g - x.g; });
        if (s1.length) hkL.push({ i: i, ng: s1.reduce(function (n, x) { return n + x.g; }, 0), names: andL(s1.map(function (x) { return x.n + (x.g >= 2 ? " (" + x.g + ")" : ""); })), one: s1.length === 1 ? s1[0] : null }); });
      if (hkL.length) liveSc = { n: hkL.reduce(function (n, x) { return n + x.ng; }, 0), tm: hkL.length === 1 ? teams[hkL[0].i].abbr : "",
        text: hkL.map(function (x) { return scoredTx(x.names) + " for " + teams[x.i].abbr; }).join("; ") };
      var hm = {}; (box.teams || []).forEach(function (bt) { var i = String((bt.team || {}).id); if (!teams[i]) return; var m = {}; (bt.statistics || []).forEach(function (x) { m[x.name] = x.displayValue; }); hm[i] = m; });
      if (hm[tid[0]] && hm[tid[1]]) {
        var sh = function (i) { return hlNum(hm[i].shotsTotal || hm[i].shots); }, hi = sh(tid[0]) >= sh(tid[1]) ? tid[0] : tid[1], lo = hi === tid[0] ? tid[1] : tid[0], s1 = sh(hi), s0 = sh(lo);
        var tot = teams[tid[0]].score + teams[tid[1]].score;
        if (!tot && s1 + s0 >= 10) add("hknil|" + hi + "|" + period, 30, 0, done ? "Scoreless, though " + hT(hi) + " outshot " + hT(lo) + " " + s1 + " to " + s0 : (s1 > s0 ? "Still scoreless; " + hT(hi) + " lead the shots " + s1 + " to " + s0 : "Still scoreless, " + s1 + " shots apiece"), { team: teams[hi].name });
        else if (s1 >= 10 && s1 - s0 >= 7) add("hksh|" + hi + "|" + Math.floor(s1 / 5), 26 + (s1 - s0), 0, "The " + teams[hi].name + (done ? " outshot " : " are outshooting ") + hT(lo) + " " + s1 + " to " + s0, { team: teams[hi].name });
        tid.forEach(function (i) { var ppg = hlNum(hm[i].powerPlayGoals), ppo = hlNum(hm[i].powerPlayOpportunities);
          if (ppg >= 2) add("hkpp|" + i + "|" + ppg, 34 + ppg * 4, 1, "The " + teams[i].name + (done ? " went " : " are ") + ppg + "-for-" + ppo + " on the power play", { team: teams[i].name });
          else if (ppo >= 4 && !ppg) add("hkpp0|" + i + "|" + ppo, 24 + ppo, -1, "The " + teams[i].name + (done ? " went " : " are ") + "0-for-" + ppo + " on the power play", { team: teams[i].name }); });
      }
    }
    // soccer: the story of the match — who scored, comebacks and late winners, penalties, red cards, who's running the game
    if (sport === "soccer" && tid.length === 2) {
      var HID = tid.filter(function (i) { return teams[i].side === "home"; })[0], AID = tid.filter(function (i) { return teams[i].side !== "home"; })[0];
      var other = function (i) { return i === HID ? AID : HID; };
      var lnm = {}; (sum.rosters || []).forEach(function (ro) { (ro.roster || []).forEach(function (p) { var a0 = p.athlete || {}; if (a0.id) lnm[String(a0.id)] = a0.lastName || a0.displayName; }); });
      var shortN = function (p) { var a0 = (p && p.athlete) || {}; return lnm[String(a0.id || "")] || a0.lastName || a0.displayName || ""; };
      var minOf = function (k) { return parseInt(String((k.clock || {}).displayValue || "0"), 10) || 0; };
      var NUMW = ["", "one", "two", "three", "four", "five"], ORD = function (n) { var v = n % 100; return n + (v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"); };
      var listAnd = function (xs) { return xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]; };
      var goals = [], reds = [], sh0 = 0, sa0 = 0, worst = {}, scorers = {}, gl = {}, as = {};
      worst[HID] = 0; worst[AID] = 0; scorers[HID] = []; scorers[AID] = [];
      (sum.keyEvents || []).forEach(function (k) {
        var tt = String((k.type || {}).text || ""), ps = k.participants || [], mn = minOf(k), og = /own goal/i.test(tt);
        if (og || k.scoringPlay || /^goal|penalty - scored/i.test(tt)) {
          var m = /(\d+), .*? (\d+)\./.exec(String(k.text || "")), h = m ? +m[1] : sh0, aw = m ? +m[2] : sa0, by;
          if (m && h > sh0) by = HID; else if (m && aw > sa0) by = AID; else { by = String((k.team || {}).id || ""); if (!m) { if (by === HID) h++; else aw++; } }
          if (by !== HID && by !== AID) return;
          var before = by === HID ? sh0 - sa0 : sa0 - sh0, nm = og ? "" : shortN(ps[0]), an = og ? "" : shortN(ps[1]), ogBy = og ? shortN(ps[0]) : "";
          goals.push({ by: by, mn: mn, mt: String((k.clock || {}).displayValue || "").trim(), nm: nm, as: an, og: og, ogBy: ogBy, before: before, pen: /penalty/i.test(tt), how: /header/i.test(String(k.text)) ? "header" : /free kick|free-kick/i.test(String(k.text) + tt) ? "free kick" : "" });
          sh0 = h; sa0 = aw;
          worst[HID] = Math.min(worst[HID], sh0 - sa0); worst[AID] = Math.min(worst[AID], sa0 - sh0);
          // 3.62.2: an own goal reads "an own goal by Chelsea's Smith" and is never the subject of "has scored"; a goal with no name from ESPN is left out of the lists
          if (og) scorers[by].push("an own goal" + (ogBy ? " by " + teams[by === HID ? AID : HID].name + "'s " + ogBy : "")); else if (nm) { if (!gl[nm]) scorers[by].push(nm); gl[nm] = (gl[nm] || 0) + 1; }
          if (an) as[an] = (as[an] || 0) + 1;
        } else if (/red card|second yellow/i.test(tt)) { var rt = String((k.team || {}).id || ""); if (teams[rt]) reds.push({ nm: shortN(ps[0]), t: rt, mn: mn }); }
      });
      var nameOf = function (i) { return teams[i].name; }, diff = teams[HID].score - teams[AID].score, leader = diff > 0 ? HID : diff < 0 ? AID : null, total = teams[HID].score + teams[AID].score;
      var tag = function (i) { return { team: nameOf(i) }; };
      var scorerList = function (i) { var seen = {}, out = []; scorers[i].forEach(function (n) { if (/^an own goal/.test(n)) { out.push(n); return; } if (seen[n]) return; seen[n] = 1; out.push(n + (gl[n] >= 3 ? " (3)" : gl[n] === 2 ? " (2)" : "")); }); return out; };
      // who scored: every scorer, not just the latest
      [HID, AID].forEach(function (i) {
        var goalsI = teams[i].score, ls = scorerList(i); if (!goalsI || !ls.length) return;
        // players are the ones who "scored"; own goals are added after them ("Saka scored for Arsenal, plus an own goal by Smith")
        var pl = ls.filter(function (x) { return !/^an own goal/.test(x); }), ogs = ls.filter(function (x) { return /^an own goal/.test(x); });
        if (goalsI >= 2) add("scorers|" + i + "|" + goalsI, 44 + goalsI * 7 + (i === leader ? 6 : 0), 1, pl.length
          ? listAnd(pl) + (done ? " scored for " : (pl.length === 1 ? " has scored for " : " have scored for ")) + nameOf(i) + (ogs.length ? ", plus " + listAnd(ogs) : "")
          : nameOf(i) + (done ? "'s goals came from " : "'s goals have come from ") + (ogs.length === 2 ? "two own goals" : listAnd(ogs)), tag(i));
        else if (i === leader && diff === 1) add("solo|" + i, 42, 1, /^an own goal/.test(ls[0]) ? "A" + ls[0].slice(1) + (done ? " decided it for " : " has ") + nameOf(i) + (done ? "" : " in front") : ls[0] + (done ? "'s goal won it for " : "'s goal has ") + nameOf(i) + (done ? "" : " in front"), tag(i));
      });
      var plFirst = function (i) { var l = scorerList(i); return listAnd(l.filter(function (x) { return !/^an own goal/.test(x); }).concat(l.filter(function (x) { return /^an own goal/.test(x); }))); }, allT = plFirst(HID) + " for " + nameOf(HID) + "; " + plFirst(AID) + " for " + nameOf(AID);
      if (scorers[HID].length && scorers[AID].length && total >= 3) add("allsc|" + total, 46 + total * 3, 0, allT.charAt(0).toUpperCase() + allT.slice(1), {});
      // 3.134.6 (DJ): the line always names every scorer (live and, since 3.139.1, finished), home team first (soccer order, 3.130.5)
      var scP = function (i) { var l = scorerList(i), pl = l.filter(function (x) { return !/^an own goal/.test(x); }), ogs = l.filter(function (x) { return /^an own goal/.test(x); }); return { pl: pl, ogs: ogs }; };
      // 3.141.1 (DJ: "Include minute that the goal was scored as well. Like how they normally would for soccer"): one entry per scorer
      // with every minute, in the order they scored: "Suárez 33' (pen), 80'", an own goal as "Pavlovic 12' (OG)". Each scorer's
      // clause ends "for <abbreviation>" so the slate puts it in that team's row (hlRows), home team first
      var scT = [HID, AID].filter(function (i) { return goals.some(function (q) { return q.by === i && (q.nm || q.ogBy); }); });
      if (scT.length) liveSc = { n: total, tm: scT.length === 1 ? teams[scT[0]].abbr : "", text: scT.map(function (i) {
        var who = [], mins = {}; goals.forEach(function (q) { if (q.by !== i) return; var n = q.og ? q.ogBy : q.nm; if (!n) return; var key = (q.og ? "og|" : "") + n;
          if (!mins[key]) { mins[key] = []; who.push(key); } mins[key].push((q.mt || (q.mn ? q.mn + "'" : "")) + (q.og ? " (OG)" : q.pen ? " (pen)" : "")); });
        return who.map(function (key) { return key.replace(/^og\|/, "") + " " + mins[key].filter(Boolean).join(", ") + " for " + teams[i].abbr; }).join("; "); }).join("; ") };
      // braces, hat tricks, playmakers
      Object.keys(gl).forEach(function (n) { var x = gl[n]; if (x < 2) return; var g0 = goals.filter(function (q) { return q.nm === n; })[0];
        add("brace|" + n + "|" + x, 50 + x * 14, 1, x >= 3 ? n + (done ? " scored a hat trick for " : " has a hat trick for ") + nameOf(g0.by) : n + (done ? " scored twice for " : " has scored twice for ") + nameOf(g0.by), { player: n, team: nameOf(g0.by) }); });
      Object.keys(as).forEach(function (n) { if (as[n] < 2) return; var at = (goals.filter(function (q) { return q.as === n; })[0] || {}).by; add("ast2|" + n + "|" + as[n], 48, 1, n + (done ? " set up " : " has set up ") + NUMW[Math.min(as[n], 5)] + " goals" + (at ? " for " + nameOf(at) : ""), at ? { player: n, team: nameOf(at) } : { player: n }); });
      // comebacks, late winners and equalizers, quick doubles
      [HID, AID].forEach(function (i) { var w = -worst[i], now = i === HID ? diff : -diff; if (w < 1 || now < 0) return;
        var from = w === 1 ? "behind" : NUMW[Math.min(w, 5)] + " goals down";
        var thru = scorerList(i).filter(function (x) { return !/^an own goal/.test(x); }), via = thru.length && thru.length <= 3 ? " through " + listAnd(thru) : "";
        if (now > 0) add("cb|" + i + "|" + w, 62 + w * 12, 1, nameOf(i) + (done ? " came from " + from + " to win" : " have come from " + from + " to lead") + via, tag(i));
        else add("cbd|" + i + "|" + w, 48 + w * 12, 1, nameOf(i) + (done ? " fought back from " + from + " for a draw" : " have fought back from " + from + " to level it"), tag(i)); });
      var lastG = goals[goals.length - 1];
      if (lastG && lastG.mn >= 80 && !lastG.og && lastG.nm) {
        if (lastG.before === 0 && diff !== 0) add("late|" + lastG.nm + "|" + lastG.mn, done ? 92 : 70, 1, done ? lastG.nm + " won it in the " + ORD(lastG.mn) + " minute for " + nameOf(lastG.by) : lastG.nm + " put " + nameOf(lastG.by) + " ahead in the " + ORD(lastG.mn) + " minute", { player: lastG.nm, team: nameOf(lastG.by) });
        if (lastG.before === -1 && diff === 0) add("lateq|" + lastG.nm + "|" + lastG.mn, done ? 86 : 72, 1, done ? lastG.nm + "'s " + ORD(lastG.mn) + "-minute equalizer rescued a point for " + nameOf(lastG.by) : lastG.nm + " levelled it in the " + ORD(lastG.mn) + " minute for " + nameOf(lastG.by), { player: lastG.nm, team: nameOf(lastG.by) });
      }
      for (var gi = 1; gi < goals.length; gi++) { var g1 = goals[gi - 1], g2 = goals[gi];
        if (g1.by === g2.by && g2.mn - g1.mn <= 5) add("quick|" + g2.by + "|" + g2.mn, 54, 1, nameOf(g2.by) + " scored twice in " + Math.max(1, g2.mn - g1.mn) + " minutes", tag(g2.by)); }
      if (total >= 5) add("fest|" + total, 50 + total * 4, 0, (NUMW[total] ? NUMW[total].charAt(0).toUpperCase() + NUMW[total].slice(1) : total) + (done ? " goals in a wild one" : " goals and counting"), {});
      if (!done && lastG && !lastG.og && lastG.nm) add("goal|" + lastG.nm + "|" + lastG.mn, 30, 1, lastG.nm + " scored" + (lastG.pen ? " from the spot" : lastG.how ? " with a " + lastG.how : "") + (lastG.as ? ", set up by " + lastG.as : "") + " for " + nameOf(lastG.by), { player: lastG.nm, team: nameOf(lastG.by) });
      // penalties: one waiting to be taken, one missed or saved
      var pens = socPens(sum, teams);
      pens.forEach(function (p, pi) {
        if (p.k === "pm") add("pm|" + p.a + "|" + p.m, 64, -1, (p.a ? nameOf(p.tid) + "'s " + p.a : nameOf(p.tid)) + (p.x === "saved" ? (done ? " had a penalty saved" : (p.a ? " has" : " have") + " had a penalty saved") : (done ? " missed a penalty" : (p.a ? " has" : " have") + " missed a penalty")), p.a ? { player: p.a, team: nameOf(p.tid) } : tag(p.tid));
        if (p.k === "pa" && !done && pi === pens.length - 1) { var after = goals.some(function (g) { return g.mn >= p.mi; }); if (!after) add("pa|" + p.m, 96, 0, "Penalty to " + nameOf(p.tid) + (p.a ? " — " + p.a + " was brought down" : ""), tag(p.tid)); }
      });
      // red cards
      reds.forEach(function (r) { if (!r.nm) { add("red|" + r.t + "|" + r.mn, 52, -1, nameOf(r.t) + (done ? " played with 10 men from the " : " have been down to 10 men since the ") + ORD(r.mn) + " minute", tag(r.t)); return; } add("red|" + r.nm, 52, -1, r.nm + (done ? "'s red card left " : " was sent off, leaving ") + nameOf(r.t) + " with 10 men from the " + ORD(r.mn) + " minute", { player: r.nm, team: nameOf(r.t) }); });
      // who's running the game: possession, shots, shots on target, and winning without the ball
      var tsm = {}; (box.teams || []).forEach(function (bt) { var i = String((bt.team || {}).id); if (!teams[i]) return; var m = {}; (bt.statistics || []).forEach(function (x) { m[x.name] = Number(String(x.displayValue).replace("%", "")) || 0; }); tsm[i] = m; });
      if (tsm[HID] && tsm[AID]) {
        var big = tsm[HID].possessionPct >= tsm[AID].possessionPct ? HID : AID, sml = other(big), pos = Math.round(tsm[big].possessionPct || 0);
        var shB = tsm[big].totalShots || 0, shS = tsm[sml].totalShots || 0, onB = tsm[big].shotsOnTarget || 0, onS = tsm[sml].shotsOnTarget || 0;
        if (pos >= 58 && shB - shS >= 5) add("dom|" + big + "|" + Math.floor(pos / 5), 34 + (pos - 55) + (shB - shS), 0, nameOf(big) + (done ? " ran the game: " : " are running the game: ") + pos + "% of the ball and " + shB + " shots to " + shS, tag(big));
        else if (pos >= 62) add("pos|" + big + "|" + Math.floor(pos / 5), 22 + (pos - 60), 0, nameOf(big) + (done ? " had " : " have ") + pos + "% of the ball", tag(big));
        if (leader && leader === sml && pos >= 58) add("smash|" + sml, 58 + (pos - 58), 1, nameOf(sml) + (done ? " won with just " : " lead with just ") + (100 - pos) + "% of the ball", tag(sml));
        var hiS = (tsm[HID].totalShots || 0) >= (tsm[AID].totalShots || 0) ? HID : AID, loS = other(hiS), a1 = tsm[hiS].totalShots || 0, b1 = tsm[loS].totalShots || 0;
        if (!(pos >= 58 && shB - shS >= 5) && a1 >= 8 && a1 - b1 >= 6) add("shots|" + hiS + "|" + Math.floor(a1 / 4), 26 + (a1 - b1), 0, nameOf(hiS) + (done ? " outshot " : " are outshooting ") + nameOf(loS) + " " + a1 + " to " + b1, tag(hiS));
        var hiT = (tsm[HID].shotsOnTarget || 0) >= (tsm[AID].shotsOnTarget || 0) ? HID : AID, loT = other(hiT), t1 = tsm[hiT].shotsOnTarget || 0, t2 = tsm[loT].shotsOnTarget || 0;
        if (t1 >= 5 && t2 <= 1) add("ot|" + loT + "|" + t2, 30 + t1 * 2, -1, nameOf(loT) + (done ? " managed " : " have managed ") + (t2 ? "one shot" : "no shots") + " on target to " + nameOf(hiT) + "'s " + t1, tag(loT));
        // 3.183.2 (DJ: "Live soccer games shouldn't say still goalless for a team without a goal"): no "Still goalless" line while live
        // (it was labeled as one team's line, and "lead the shots 4 to 4" when level); a final says it only when one side really outshot the other
        if (!total && done && a1 - b1 >= 3) add("nil|" + hiS, 32, 0, "Goalless, though " + nameOf(hiS) + " outshot " + nameOf(loS) + " " + a1 + " to " + b1, tag(hiS));
      }
      // keepers: lots of saves, and a clean sheet if it holds
      (sum.rosters || []).forEach(function (ro) { var i = String((ro.team || {}).id); if (!teams[i]) return; (ro.roster || []).forEach(function (p) {
        if (!/^G/.test((p.position || {}).abbreviation || "")) return; var sv = 0; (p.stats || []).forEach(function (x) { if (x.name === "saves") sv = Number(x.value || x.displayValue) || 0; });
        var nm = lnm[String((p.athlete || {}).id || "")] || ((p.athlete || {}).displayName) || "", cs = !teams[other(i)].score;
        if (sv >= 4 && nm) add("sv|" + nm + "|" + sv, 28 + sv * 3 + (cs ? 10 : 0), 1, (cs ? nameOf(i) + "'s " : "") + nm + (done ? " made " : " has made ") + sv + " saves" + (cs ? (done ? " for the clean sheet" : " to keep " + nameOf(other(i)) + " out") : " for " + nameOf(i)), { player: nm, team: nameOf(i) }); }); });
    }
    curTm = "";
    // runs and comebacks from the scoring plays
    var plays = (sum.plays || sum.scoringPlays || []).filter(function (x) { return x.scoringPlay !== false && x.awayScore != null; });
    if (plays.length && tid.length === 2) {
      var A = tid.filter(function (i) { return teams[i].side === "away"; })[0], H = tid.filter(function (i) { return teams[i].side === "home"; })[0];
      var worstA = 0, worstH = 0, run = 0, runTeam = null, pa = 0, ph = 0, lchg = 0, lsg = 0;
      // 3.134.9: ESPN sometimes lists a neutral-site game's plays with home and away the other way round from the header
      // (Michigan "came back from 50 down" in a 102-56 win over Toledo). When the last play's score is the header's score
      // swapped, the plays are read swapped
      var lp = plays[plays.length - 1], swp = lp && teams[A].score !== teams[H].score && hlNum(lp.awayScore) === teams[H].score && hlNum(lp.homeScore) === teams[A].score;
      plays.forEach(function (x) {
        var a = hlNum(swp ? x.homeScore : x.awayScore), h = hlNum(swp ? x.awayScore : x.homeScore);
        worstA = Math.min(worstA, a - h); worstH = Math.min(worstH, h - a);
        var sg0 = a > h ? 1 : a < h ? -1 : 0; if (sg0 && lsg && sg0 !== lsg) lchg++; if (sg0) lsg = sg0;
        var who = a > pa ? A : h > ph ? H : null, pts = (a - pa) + (h - ph);
        if (who) { if (who === runTeam && !(a > pa && h > ph)) run += pts; else { runTeam = who; run = pts; } }
        pa = a; ph = h;
      });
      var lead = teams[A].score - teams[H].score;
      plStory = { lc: lchg, maxA: -worstH, maxH: -worstA, A: A, H: H };   // the most each side led by: away led by -worstH, home by -worstA
      if (sport === "bball" && run >= 10) add("run|" + teams[runTeam].abbr + "|" + Math.floor(run / 4), 26 + run * 1.5, 0, teams[runTeam].name + " are on a " + run + "-0 run", { team: teams[runTeam].name, run: run });
      var big = sport === "bball" ? 15 : sport === "football" ? 14 : 3;
      if (lead > 0 && -worstA >= big) add("cb|" + A + "|" + Math.floor(-worstA / 5), 45 + (-worstA), 1, teams[A].name + " erased a " + (-worstA) + "-point deficit", { team: teams[A].name, deficit: -worstA });
      if (lead < 0 && -worstH >= big) add("cb|" + H + "|" + Math.floor(-worstH / 5), 45 + (-worstH), 1, teams[H].name + " erased a " + (-worstH) + "-point deficit", { team: teams[H].name, deficit: -worstH });
    }
    // how it ended: the score that put the winner ahead for good, when it came at the very end or in overtime.
    // This leads the line ("Texas won it on Manning's 4-yd TD pass to Brown with 0:02 left").
    if (done && tid.length === 2) { try { var wl = hlWinner(sum, sport, lg, teams); if (wl) add("win|" + wl.k, wl.sc, 1, wl.text, { team: wl.team }); } catch (e) {} }
    // a quiet game still gets a line: the margin if it's lopsided, else the top scorer
    if (tid.length === 2) { var d = teams[tid[0]].score - teams[tid[1]].score, up = d > 0 ? teams[tid[0]] : teams[tid[1]], m = Math.abs(d);
      if (false) add("lead|" + up.abbr + "|" + Math.floor(m / 5), 20 + m / 2, 0, up.name + " lead by " + m, { team: up.name, lead: m }); }
    if (lead1) add("top|" + lead1.id + "|" + Math.floor(lead1.pts / 5), 10 + lead1.pts / 2, 0, lead1.nm + " leads all scorers with " + lead1.pts, { player: lead1.nm, team: lead1.abbr, line: lead1.line });
    if (done) c = hlFinal(c, teams);
    // 3.134.6 / 3.139.1 (DJ: "always show the teams' goal scorers. If there's only been one, can provide a second featured line in addition
    // to the goalscorer"): a soccer or hockey game with a named scorer leads with every scorer, live or finished; after a single goal the
    // best other fact (not another take on that goal) follows it
    // 3.144.2 (DJ: "The post game one liners don't have to only include the top performers… Something more to give the user an idea of
    // how the game went… only if valuable"; DJ picked every idea on the cards): after a game, up to two facts about how it went join the
    // line, each only when the number stands out. Basketball: lead changes, wire to wire, a big or awful night from three, the paint,
    // comebacks. Football: turnovers, yardage, comebacks. Soccer: late winners and equalizers, penalties and red cards, who ran the game.
    // Hockey: the power play, a lopsided shots gap, a big night in goal. Each is written "ABBR: …" so it lands in that team's row
    var story = [];
    if (done && tid.length === 2) {
      var ab = function (i) { return teams[i].abbr; }, oth2 = function (i) { return i === tid[0] ? tid[1] : tid[0]; }, W2 = teams[tid[0]].score > teams[tid[1]].score ? tid[0] : teams[tid[1]].score > teams[tid[0]].score ? tid[1] : null;
      var st2 = function (i, k) { return (tsAll[i] || {})[k]; };
      if (sport === "bball") {
        if (plStory && plStory.lc >= 10) story.push({ tm: "", sc: 40 + plStory.lc, text: plStory.lc + " lead changes" });
        if (plStory && W2) { var wl2 = W2 === plStory.A ? plStory.maxH : plStory.maxA, wmax = W2 === plStory.A ? plStory.maxA : plStory.maxH;
          if (wl2 <= 0 && wmax >= 15) story.push({ tm: ab(W2), sc: 42 + wmax / 2, text: "Never trailed and led by as many as " + wmax }); }
        tid.forEach(function (i) { var t3 = hlMA(st2(i, "threePointFieldGoalsMade-threePointFieldGoalsAttempted")); if (t3[1] < 25) return;
          if (t3[0] / t3[1] >= 0.45 && t3[0] >= 14) story.push({ tm: ab(i), sc: 36 + t3[0], text: "Made " + t3[0] + " of " + t3[1] + " threes" });
          else if (t3[0] / t3[1] <= 0.2) story.push({ tm: ab(i), sc: 50 - t3[0] * 2, text: "Went " + t3[0] + "-of-" + t3[1] + " from three" }); });
        var pp = tid.map(function (i) { return hlNum(st2(i, "pointsInPaint")); }); if (pp[0] && pp[1] && Math.abs(pp[0] - pp[1]) >= 16) { var pw2 = pp[0] > pp[1] ? 0 : 1;
          story.push({ tm: ab(tid[pw2]), sc: 34 + Math.abs(pp[0] - pp[1]) / 2, text: "Outscored " + ab(tid[1 - pw2]) + " " + pp[pw2] + "-" + pp[1 - pw2] + " in the paint" }); }
      }
      if (sport === "football") {
        var to2 = tid.map(function (i) { return st2(i, "turnovers"); }); if (to2[0] != null && to2[1] != null) { var t0 = hlNum(to2[0]), t1 = hlNum(to2[1]); if (Math.abs(t0 - t1) >= 2) { var tw = t0 < t1 ? 0 : 1;
          // DJ (Nov 26): not "won the turnover battle", just each team's turnovers, on its own row
          var toTx = function (n) { return n ? n + " turnover" + (n === 1 ? "" : "s") : "No turnovers"; }, tc = [t0, t1];
          story.push({ tm: ab(tid[tw]), sc: 38 + Math.abs(t0 - t1) * 3, text: toTx(tc[tw]), pair: { tm: ab(tid[1 - tw]), text: toTx(tc[1 - tw]) } }); } }
        var yd = tid.map(function (i) { return hlNum(st2(i, "totalYards")); }); if (yd[0] && yd[1] && Math.abs(yd[0] - yd[1]) >= 120) { var yw = yd[0] > yd[1] ? 0 : 1;
          story.push({ tm: ab(tid[yw]), sc: 34 + Math.abs(yd[0] - yd[1]) / 15, text: "Outgained " + ab(tid[1 - yw]) + " " + yd[yw] + "-" + yd[1 - yw] + " in total yards" }); }
      }
      if (sport === "bball" || sport === "football") c.forEach(function (x) { if (x.key.split("|")[0] === "cb") story.push({ tm: x.tm || "", sc: x.score, text: x.text }); });
      if (sport === "soccer") c.forEach(function (x) { var k = x.key.split("|")[0];
        if (/^(late|lateq|pm|red|cb|cbd|smash)$/.test(k) || /^(dom|ot|shots)$/.test(k) && x.score >= 40) story.push({ tm: x.tm || "", sc: x.score, text: x.text, k: k }); });
      if (sport === "hockey") c.forEach(function (x) { var k = x.key.split("|")[0], n0 = +(/(\d+) saves/.exec(x.text) || [])[1] || 0, sh2 = /(\d+) to (\d+)/.exec(x.text);
        if (/^(hkpp|hkpp0)$/.test(k) || k === "sv" && n0 >= 35 || k === "hksh" && sh2 && sh2[1] - sh2[2] >= 12) story.push({ tm: x.tm || "", sc: x.score + (k === "sv" ? 10 : 0), text: x.text }); });
      story.sort(function (a, b) { return b.sc - a.sc; });
      // the row already starts "LILL:", so "Lille came from behind" reads "Came from behind"
      story.forEach(function (x) { var t0 = tid.filter(function (i) { return teams[i].abbr === x.tm; })[0]; if (!t0) return;
        [teams[t0].full, teams[t0].name, teams[t0].short, teams[t0].nick].filter(Boolean).sort(function (a, b) { return b.length - a.length; }).some(function (nm) {
          var m1 = new RegExp("^(The )?" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "('s?)? ").exec(x.text); if (!m1 || m1[2]) return false;
          x.orig = x.text; x.text = x.text.slice(m1[0].length); x.text = x.text.charAt(0).toUpperCase() + x.text.slice(1); return true; }); });
      story = story.filter(function (x) { return x.sc >= 36; }); if (story.length > 1 && story[1].tm && story[1].tm === story[0].tm && story.length > 2) story.splice(1, 1); story = story.slice(0, 2);
    }
    // a fact about both teams (lead changes) goes first as its own row; a team's fact joins that team's row
    // 3.178.5 (DJ: "Steelers have 2 defensive TDs. The live one liner should include that"): touchdowns the offense didn't score
    // (pick-sixes, fumble returns, punt and kick returns, blocked kicks), live and final, on the scoring team's row
    var bigTx = "";
    if (sport === "football" && tid.length === 2) { var bp = {};
      (sum.scoringPlays || []).forEach(function (p) { var ty = String((p.type || {}).text || ""), tx = String(p.text || ""), ti = String((p.team || {}).id || "");
        if (!teams[ti] || !/touchdown|end zone/i.test(ty + " " + tx) || !/interception|fumble|punt|kickoff|blocked|return/i.test(ty) && !/fumble recovery in end zone/i.test(tx)) return;
        var nm = (/^(.+?)\s+(?:\d+\s+Yd|Fumble|Blocked)/.exec(tx) || [])[1] || "", yd = +((/(\d+)\s+Yd/.exec(tx) || [])[1]) || 0, st = /punt|kickoff|kick return|blocked (?:punt|field goal|fg)/i.test(ty + " " + tx);
        var what = /interception/i.test(ty + tx) ? (yd ? yd + "-yard " : "") + "pick-six" : /fumble/i.test(ty + tx) ? (/end zone/i.test(tx) ? "fumble recovery in the end zone" : (yd ? yd + "-yard " : "") + "fumble return") :
          /punt/i.test(ty + tx) ? (yd ? yd + "-yard " : "") + "punt return" : /kickoff|kick return/i.test(ty + tx) ? (yd ? yd + "-yard " : "") + "kickoff return" : "blocked-kick return";
        if (nm) (bp[ti] = bp[ti] || []).push({ nm: nm, what: what, st: st }); });
      var ordB = tid.slice().sort(function (a, b) { return (teams[a].side === "home") - (teams[b].side === "home"); });
      ordB.forEach(function (i) { var L = bp[i]; if (!L) return; var allD = L.every(function (x) { return !x.st; }), allS = L.every(function (x) { return x.st; });
        // 3.179.1 (DJ: "Too much detail… makes it too long"): just the count and kind
        bigTx += "; " + teams[i].abbr + ": " + (L.length === 1 ? (/pick-six/.test(L[0].what) ? "Pick-six" : (allD ? "Defensive" : "Special-teams") + " TD") :
          L.length + (allD ? " defensive" : allS ? " special-teams" : " defense and special-teams") + " TDs"); }); }
    var storyTx = function (skip) { return story.filter(function (x) { return x.tm && (!skip || x.text !== skip && x.orig !== skip); }).map(function (x) { return "; " + x.tm + ": " + x.text + (x.pair ? "; " + x.pair.tm + ": " + x.pair.text : ""); }).join(""); };
    var storyLead = function () { return story.filter(function (x) { return !x.tm; }).map(function (x) { return x.text + "; "; }).join(""); };
    var SCK = /^(scorers|solo|allsc|brace|goal|late|lateq|quick|cb|cbd|fest|hksc|g|hkpts|hka|top)$/;
    if (liveSc && liveSc.text) {
      var more = "", nx = null; if (liveSc.n === 1) { nx = c.filter(function (x) { return !SCK.test(x.key.split("|")[0]); }).sort(function (a, b) { return b.score - a.score; })[0];
        if (nx && nx.text) more = "; " + (/^(The|A|An) /.test(nx.text) ? nx.text.charAt(0).toLowerCase() + nx.text.slice(1) : nx.text); }
      if (liveSc.n === 1) story = story.filter(function (x) { return !/^(late|lateq)$/.test(x.k || ""); });   // one goal: its minute already says it came late
      var add2 = done ? storyTx(nx && nx.text) : "";
      c.push({ key: "livesc|" + liveSc.n + (more ? "|" + nx.key : ""), score: 999, tone: 1, text: (done ? storyLead() : "") + liveSc.text + more + add2, facts: {}, tm: more || add2 ? "" : liveSc.tm });
    }
    // 3.139.1 (DJ: "Basketball games should show best player and stats from each team, unless there is some other one liner that should
    // show that trumps showing best player from each team. Apply our new one liner rules to all sports"): basketball, football and
    // baseball lead with each team's best player (away team first, as on the card). What still beats it: how it was won late or in
    // overtime, a big comeback, a finished triple-double, a 40-point game, a 15-0 run
    if (/^(bball|football|baseball)$/.test(sport) && tid.length === 2) {
      var ord = tid.slice().sort(function (a, b) { return (teams[a].side === "home") - (teams[b].side === "home"); }), bl = ord.filter(function (i) { return bestP[i]; });
      var trump = c.filter(function (x) { var k = x.key.split("|"); return k[0] === "win" || k[0] === "td" && /triple-double(:|$)/.test(x.text) && !/watch/.test(x.text) || k[0] === "pts" && +k[2] >= 8 || k[0] === "run" && /\b(1[5-9]|[2-9]\d)-0 run/.test(x.text); })[0];
      if (bl.length && !trump) c.push({ key: "best|" + bl.map(function (i) { return bestP[i].tx.split(" ")[0] + Math.floor(bestP[i].sc / 5); }).join("|") + (bigTx ? "|big" + bigTx.split("; ").length : ""), score: 998, tone: 0, text: (done ? storyLead() : "") + bl.map(function (i) { return bestP[i].tx; }).join("; ") + bigTx + (done ? storyTx() : ""), facts: {}, tm: bl.length === 1 && !(done && story.length) && !bigTx ? teams[bl[0]].abbr : "" });
    }
    if (!c.length) return null;
    c.sort(function (a, b) { return b.score - a.score; });
    var top = c[0]; top.when = ((head.status || {}).type || {}).shortDetail || ""; top.period = period;
    // what Claude sees: the best few angles plus the game around them
    top.cands = c.slice(0, 6).map(function (x) { return x.text; });
    var sc = tid.map(function (i) { return teams[i].abbr + " " + teams[i].score; }).join(", ");
    top.ctx = { teams: ctxT, players: Object.keys(ctxP).reduce(function (o, k) { o[k] = ctxP[k].sort(function (a, b) { return b.pts - a.pts; }).slice(0, 3).map(function (x) { return x.n + ": " + x.l; }); return o; }, {}) };
    // ask again when the lead story changes or a new period starts
    top.ask = done ? "final" : top.key + "|p" + period; top.final = done;
    return top;
  }
  function hlWatch() {
    if (!db || HL.sub === state.date) return;
    if (HL.unsub) { try { HL.unsub(); } catch (e) {} }
    HL.sub = state.date; HL.doc = null;
    HL.unsub = db.doc("live/" + state.date).onSnapshot(function (sn) { HL.doc = sn.exists ? sn.data() : null; if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, function () {});
  }
  // the highlight line under a live game on the slate
  // highlights never carry the score or the clock
  function hlScorey(t) { return /\b\d{1,2}:\d{2}\b/.test(t) || /\b\d{2,3}\s*[-–]\s*\d{2,3}\b(?!\s*(FG|3PT|from|shooting))/.test(t) && !/\b(FG|3PT|three|shooting|of)\b/i.test(t) || /\b(lead(s|ing)? by|trail(s|ing)? by|at the half|halftime|quarter|left in)\b/i.test(t); }
  // a finished game's line is kept on this phone, so reopening Slate doesn't refetch every final's game data
  // 3.134.6 (DJ: "Please reset all the one liners so I can test the new ones"): once per phone, the one-liners saved on it (finals'
  // lines and preview lines) are dropped, so every line is worked out again with the current rules. Change the stamp to reset again
  (function () { try { if (localStorage.getItem("slate-lines-reset") !== "3.183.3") { localStorage.removeItem("slate-hlc"); localStorage.removeItem("slate-pv"); localStorage.setItem("slate-lines-reset", "3.183.3"); } } catch (e) {} })();
  var HLC = (function () { try { var m = JSON.parse(localStorage.getItem("slate-hlc") || "{}") || {}, cut = Date.now() - 3 * 864e5; Object.keys(m).forEach(function (k) { if (!(m[k].at > cut) || !("tm" in m[k]) || /^[^:]{3,40}: \d+ (passing|rushing|receiving) yds/.test(m[k].t || "")) delete m[k]; }); return m; } catch (e) { return {}; } })();
  function hlcPut(id, text, tm) { if (HLC[id] && HLC[id].t === text && HLC[id].tm === tm) return; HLC[id] = { t: text, tm: tm || "", at: Date.now() }; try { localStorage.setItem("slate-hlc", JSON.stringify(HLC)); } catch (e) {} }
  // a line about one team gets that team's abbreviation in front ("TEX: Manning threw 3 interceptions"),
  // unless the line already names the team
  function hlLine(g, text, tm, cls) {
    var p = el("p", cls || "hl");
    // lines saved on this phone before abbreviations (or written by Claude) don't carry a team: work it out from the names in them
    if (!tm) { try { tm = teamOfText(g, text); } catch (e) {} }
    tm = String(tm || "").toUpperCase();
    var side = ["away", "home"].filter(function (sd) { return String(abbr(g, sd) || "").toUpperCase() === tm; })[0];
    if (tm && !side) { var raw = ["away", "home"].filter(function (sd) { return String(g[sd + "Abbr"] || "").toUpperCase() === tm; })[0]; side = raw; }
    // 3.134.9 (DJ: "I want all one liners to follow the same format of team name, colon, then one liner"): every line reads
    // "Blues: Holloway and McTavish have scored". A line about both teams becomes one row per team
    var rows = hlRows(g, text, side);
    if (rows.length === 1 && rows[0].side) p.dataset.side = rows[0].side;  // 3.71.0: which team the line is about, for its team color
    rows.forEach(function (r, i) {
      var box = rows.length > 1 ? el("span", "hl-row") : p;
      if (rows.length > 1 && r.side) box.dataset.side = r.side;
      if (r.side) box.appendChild(el("b", "hl-tm", String(abbr(g, r.side) || short(g, r.side)).toUpperCase() + ": "));   // 3.139.1 (DJ: "One liners should show team names as abbreviations")
      box.appendChild(document.createTextNode(r.text));
      if (box !== p) p.appendChild(box);
    });
    if (rows.length > 1) p.classList.add("hl-rows");
    return p;
  }
  // the names a line can call a team by ("No. 13 Notre Dame", "the Blues", "Man City"), longest first
  var HL_GENERIC = /^(State|City|United|FC|Club|University|College|Town|County|Athletic|Real|Sporting|The)$/i;
  function hlNames(g, sd) {
    var full = String(g[sd] || "").trim(), w = full.split(" "), out = [full, short(g, sd), String(g[sd + "Short"] || ""), String(g[sd + "Abbr"] || ""), w.slice(0, -1).join(" "), w.length > 1 ? w[w.length - 1] : "", w.length > 2 ? w.slice(-2).join(" ") : "", abbr(g, sd)];
    out = out.map(function (x) { return String(x || "").trim(); }).filter(function (x, i, a) { return x.length >= 2 && !HL_GENERIC.test(x) && a.indexOf(x) === i; });
    return out.sort(function (a, b) { return b.length - a.length; });
  }
  function hlEsc(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  // a line split into rows by team: each clause ("; ") goes to the team it names first, with that team's name taken out of the
  // sentence ("Oregon has won four straight" -> Oregon: "Won four straight"; "Buchanan has scored for Villarreal" -> "Buchanan has scored")
  function hlRows(g, text, tmSide) {
    var nm = { away: hlNames(g, "away"), home: hlNames(g, "home") }, rx = {};
    ["away", "home"].forEach(function (sd) { rx[sd] = nm[sd].length ? "(?:No\\. \\d+ )?(?:the |The )?(?:" + nm[sd].map(hlEsc).join("|") + ")" : null; });
    var find = function (cl, sd) { if (!rx[sd]) return -1; var m = new RegExp("(^|[^A-Za-z])" + rx[sd] + "(?![A-Za-z])").exec(cl); return m ? m.index + m[1].length : -1; };
    var parts = String(text || "").split(/; /), rows = [];
    parts.forEach(function (cl, ci) {
      // 3.144.2: a clause written "ABBR: …" (how a finished game went) names its team outright
      var pre = /^([A-Z0-9&]{2,6}): (.+)$/.exec(cl), ps = pre && ["away", "home"].filter(function (sd0) { return String(abbr(g, sd0) || "").toUpperCase() === pre[1] || String(g[sd0 + "Abbr"] || "").toUpperCase() === pre[1]; })[0];
      if (ps) cl = pre[2];
      var a = find(cl, "away"), h = find(cl, "home"), sd = ps || (a < 0 && h < 0 ? null : a < 0 ? "home" : h < 0 ? "away" : a <= h ? "away" : "home");
      if (!sd && parts.length === 1) sd = tmSide || null;
      if (!sd && rows.length) { rows[rows.length - 1].text += "; " + cl; return; }
      var t = cl;
      // a matchup line ("Jacksonville State and Pacific play in Las Vegas", "Iowa vs Ohio State") keeps its sentence and gets no label
      if (sd && a >= 0 && h >= 0 && new RegExp("^" + rx[sd] + " (?:and|vs\\.?|at|v) ").test(cl)) sd = null;
      // 3.148.1 (DJ: "Bills chiefs tomorrow should have the line about the qbs above the individual team lines"): in a line of
      // several clauses, a first one that names both teams is about the matchup: it gets no label and sits on top
      if (!ps && ci === 0 && parts.length > 1 && a >= 0 && h >= 0) sd = null;
      if (sd && rx[sd]) { var R = rx[sd];
        t = t.replace(new RegExp("^" + R + "(?:'s?|’s?)? (?:(?:has|have|is|are) )?"), "");
        t = t.replace(new RegExp(" (?:for|to keep) " + R + "(?=$|[,.])"), "");
        t = t.replace(new RegExp("\\bgives " + R + " a "), "gives them a ");
        t = t.replace(/^\s+/, "");
        t = t.charAt(0).toUpperCase() + t.slice(1); }
      // 3.182.4 (DJ: "Columbus crew one liner has a duplicate line"): the same fact never shows twice on a card
      var norm = function (x) { return String(x).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); };
      if (rows.some(function (r) { return r.text.split("; ").some(function (y) { return norm(y) === norm(t); }); })) return;
      var same = rows.filter(function (r) { return r.side === sd; })[0];   // one row per team, in the order the line names them
      if (same) same.text += "; " + t; else rows.push({ side: sd, text: t });
    });
    // 3.176.1 (DJ: "team related ones should come first, then best player stats"): in a team's row, a player's numbers go last
    var PSTAT = /^[A-Z][^;]*? (?:had|has|averages) [\d.]+ (?:pts|points|reb|ast|passing|rushing|receiving|TD|goals?|ppg|rebounds|assists|saves|hits?|H\b|K\b)|\(\d+-\d+ FG\)/;
    rows.forEach(function (r) { if (!r.side) return; var cs = r.text.split("; "); if (cs.length < 2) return;
      var tm = cs.filter(function (x) { return !PSTAT.test(x); }), pl = cs.filter(function (x) { return PSTAT.test(x); });
      if (tm.length && pl.length) { tm[0] = tm[0].charAt(0).toUpperCase() + tm[0].slice(1); r.text = tm.concat(pl).join("; "); } });
    // 3.191.4 (DJ: "make the player stat one liners shorter without filler words"): "Umari Hatcher has 1,257 receiving yds and 9 TD"
    // reads "Umari Hatcher 1,257 rec yds, 9 TD"; "had 24 pts and 5 reb (8-15 FG)" reads "24 pts, 5 reb (8-15 FG)"; "averages 14.1 points" "14.1 ppg"
    var pcomp = function (x) { var m = /^([A-Z][^;]*?) (?:had|has) (\d[^;]*)$/.exec(x) || /^([A-Z][^;]*?) averages ([\d.]+ points)$/.exec(x); if (!m) return x;
      var st = m[2].replace(/ points$/, " ppg").replace(/\bpassing yds\b/g, "pass yds").replace(/\brushing yds\b/g, "rush yds").replace(/\breceiving yds\b/g, "rec yds")
        .replace(/\b(\d+) TD passes\b/g, "$1 pass TD").replace(/\ba TD\b/g, "1 TD").replace(/,? and /g, ", ");
      return m[1] + " " + st; };
    rows.forEach(function (r) { r.text = r.text.split("; ").map(pcomp).join("; "); });
    rows = rows.filter(function (r) { return !r.side; }).concat(rows.filter(function (r) { return r.side; }));
    return rows.length ? rows : [{ side: tmSide || null, text: String(text || "") }];
  }
  // which team a free-text line is about: the players it names, matched to the game's leaders and box score (one team only)
  function teamOfText(g, text) {
    text = String(text || ""); if (!text) return "";
    var found = {}, hit = function (n, tm) { n = String(n || ""); if (tm && n.length >= 4 && text.indexOf(n) !== -1) found[String(tm).toUpperCase()] = 1; };
    var v = scoreRaw(g.id) || {}; (v.ld || []).forEach(function (L) { hit(L.full, L.t); hit(L.n, L.t); hit(String(L.full || L.n || "").split(" ").slice(1).join(" "), L.t); });
    var b = boxFor(g); ((b && b.teams) || []).forEach(function (t) { (t.groups || []).forEach(function (gr) { (gr.rows || []).forEach(function (r) { hit(r.n, t.abbr); }); }); (t.xi || []).forEach(function (r) { hit(r.n, t.abbr); }); });
    var ks = Object.keys(found); return ks.length === 1 ? ks[0] : "";
  }
  // 3.113.6 (DJ: Rutgers–Notre Dame still read "won it on Smith's 26-foot three in overtime" after 3.113.4): a line saved before
  // that fix (this phone's copy, the day's shared lines) gets the same test: "won it on" only when the final margin was one possession
  // in basketball (3) or one score in football (8). Otherwise the saved line is skipped and the card's line is worked out again
  function hlStaleWin(g, t) {
    if (!/\bwon it\b/.test(String(t || ""))) return false;
    var v = scoreRaw(g.id) || {}, sp = BX_SPORT[g.league], a = Number(v.a), h = Number(v.h); if (isNaN(a) || isNaN(h) || v.a === "" || v.h === "") return false;
    var m = Math.abs(a - h); return sp === "bball" && m > 3 || sp === "football" && m > 8;
  }
  function hlNode(g) {
    hlWatch();
    // lines come from the app's own rules (free); a closing line Claude wrote earlier is kept for that game
    var cur = bx.live[g.id], h = cur && cur.hl, sv0 = ((HL.doc || {}).games || {})[g.id];
    if (sv0 && sv0.final && sv0.text && !hlScorey(sv0.text) && !hlStaleWin(g, sv0.text)) return hlLine(g, sv0.text, "");
    if (h && h.text && !hlStaleWin(g, h.text)) { pvShare(); return hlLine(g, h.text, h.tm); }
    var kc = HLC[g.id];
    if (kc && kc.t && hlStaleWin(g, kc.t)) { delete HLC[g.id]; try { localStorage.setItem("slate-hlc", JSON.stringify(HLC)); } catch (e) {} if (cur) cur.hl = null; bxNeed(g); return null; }
    return kc && kc.t && status(g).kind === "over" ? hlLine(g, kc.t, kc.tm) : null;
  }
  // ---- Preview line: one free line under an upcoming game, from ESPN's pre-game summary ----
  // streaks, injuries to a team's leaders, the betting line, ESPN's predictor, table clashes, head-to-head, ESPN's preview headline
  // 3.113.10: a home or road record that is the whole record ("Florida State is 5-0 at home" on a 5-0 team) adds nothing
  function pvAllHome(t, W, L) { var r = String((t.rec || {}).total || "").split("-").map(Number); return r.length >= 2 && r[0] === W && r.slice(1).reduce(function (a, b) { return a + (b || 0); }, 0) === L; }
  function pvCompute(lg, sum, qbx, g) {
    // 3.156.1 (DJ: "The player positions in one-liners are sometimes confusing. And not obvious that they are player positions"),
    // 3.157.1 (DJ didn't like them spelled out: "I liked the abbreviations just need a new format"; picked on a card): the full name
    // with the position after it in brackets, as box scores and injury reports write it: "Chuck Clark (S)", "Jalen Hurts (QB)"
    function pvPosWord(pos, name) { pos = String(pos || "").toUpperCase(); return pos ? name + " (" + pos + ")" : name; }
    pvCompute.fb = false; pvCompute.tm = ""; pvCompute.sc = 0; pvCompute.f = ""; pvCompute.recs = null;
    var sport = BX_SPORT[lg], comp = ((sum.header || {}).competitions || [])[0] || {}, c = [], T = {}, ids = [];
    (comp.competitors || []).forEach(function (k) { var tm = k.team || {}, id = String(tm.id || ""); ids.push(id);
      var rec = {}; (k.record || []).forEach(function (r) { rec[r.type] = r.summary || r.displayValue || ""; });
      var rk = (k.curatedRank || {}).current; T[id] = { id: id, name: String((sport === "soccer" ? tm.shortDisplayName : tm.nickname || tm.name) || tm.shortDisplayName || tm.displayName || "").replace(/\s+/g, " ").trim(), full: tm.displayName || "", abbr: tm.abbreviation || "", side: k.homeAway, rec: rec, rank: rk && rk <= 25 ? rk : (k.rank && k.rank <= 25 ? k.rank : 0) }; });
    if (ids.length !== 2) return null;
    // 3.71.0: the card's own ranks win. ESPN's game summary can still carry last week's poll (UCLA "No. 7" on a card that
    // says 9 the Monday a new poll came out), so when the card has ranks, the line uses the same ones
    if (g && (Number(g.awayRank) > 0 || Number(g.homeRank) > 0)) ids.forEach(function (i) { var r = Number(g[T[i].side + "Rank"]); T[i].rank = r > 0 && r <= 25 ? r : 0; });
    // 3.89.6 (DJ: "Michigan St"): the card's own name for each team ("Michigan State", "Central Michigan", "Pistons")
    if (g) ids.forEach(function (i) { var cn = String(g[T[i].side + "Short"] || "").trim(); if (cn && cn.length <= 22) T[i].name = cn; });
    ids.forEach(function (i) { if (T[i].rank) T[i].name = "No. " + T[i].rank + " " + T[i].name; });
    var H = ids.filter(function (i) { return T[i].side === "home"; })[0] || ids[1], A = ids[0] === H ? ids[1] : ids[0], oth = function (i) { return i === H ? A : H; };
    // 3.120.x (DJ: "SIU Edwardsville is 4-0 at home" on a card that said 2-1 — "NEED these to be accurate always"): the records the line
    // was built from, so the card can refuse a line it can't check against its own record (pvRecOff); and a home or road record
    // bigger than the team's whole record is bad data and never used
    pvCompute.recs = { away: T[A].rec.total || "", home: T[H].rec.total || "" };
    ids.forEach(function (i) { var tt = String(T[i].rec.total || "").split("-").map(Number); ["home", "road"].forEach(function (k) { var x = String(T[i].rec[k] || "").split("-").map(Number);
      if (x.length >= 2 && tt.length >= 2 && (x[0] > tt[0] || x[x.length - 1] > tt[tt.length - 1])) delete T[i].rec[k]; }); });
    var nm = function (i) { return (T[i].rank ? "No. " + T[i].rank + " " : "") + T[i].name; };
    var NW = ["", "one", "two", "three", "four", "five", "six"], ORD = function (n) { var v = n % 100; return n + (v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"); };
    // 3.88.3: American grammar. A college team or a soccer side is one place ("Florida is", "USA has"); pro nicknames stay plural ("Spurs have")
    var sing = sport === "soccer" || /^ncaa/.test(lg), esc = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var conj = function (tx) { if (!sing) return tx; ids.forEach(function (i) { if (!T[i].name) return; tx = tx.replace(new RegExp("(^|[:;,] |and )" + esc(T[i].name) + " (have|are|lead)\\b", "g"), function (m0, pre, v) { return pre + T[i].name + " " + { have: "has", are: "is", lead: "leads" }[v]; }); });
      return tx.replace(/\bis (only )?([\d.]+)-point favorites/g, function (m0, o, n) { return "is " + (o || "") + (/^(8|11|18)(\.|$)/.test(n) ? "an " : "a ") + n + "-point favorite"; }).replace(/ their last five/g, " its last five"); };
    var add = function (k, sc, tx) { c.push({ k: k, sc: sc, tx: conj(tx) }); };
    var byAbbr = {}; ids.forEach(function (i) { byAbbr[T[i].abbr] = i; });
    // form: streaks from the last five
    var form = {}, formEv = {}; (sum.lastFiveGames || []).forEach(function (t) { var i = String((t.team || {}).id || ""); if (T[i]) form[i] = l5Season(t.events, comp.date).filter(function (e) {
      // soccer (Nov 20, 2026): only games in this competition, so a streak can be checked against the record on the card (Bournemouth's
      // "won five in a row" counted a Carabao Cup and a Europa League win on a 4-3-3 league record)
      var ln = String(e.leagueName || e.leagueAbbreviation || ""), gl = String(((sum.header || {}).league || {}).name || ""), ga = String(((sum.header || {}).league || {}).abbreviation || "");
      return sport !== "soccer" || !ln || !gl || ln === gl || ln === ga || String(e.leagueAbbreviation || "") === ga; }); formEv[i] = form[i]; form[i] = form[i].map(function (e) { return e.gameResult; }); });  // this season only (3.91.3)
    // Nov 20, 2026 (DJ: "I'd like to know who Murray State lost to"): the one game that broke a four-of-five run, by name
    var oppNm = function (o) { var dn = String((o || {}).displayName || ""), row = ((typeof window !== "undefined" && window.TEAM_LIST) || []).filter(function (r) { return r[0] === dn; })[0]; return row && row[5] && row[5].length <= 18 ? row[5] : dn; };
    var odd = function (i, res) { var ev = formEv[i] || [], k = -1, n = 0; ev.forEach(function (e, j) { if (e.gameResult !== "W" && res === "W" || e.gameResult === "W" && res !== "W") { n++; k = j; } }); if (n !== 1 || !(ev[k].opponent || {}).displayName) return "";
      var o = (sing ? "" : "the ") + oppNm(ev[k].opponent), lt = k === ev.length - 1 ? " last time out" : "", r0 = ev[k].gameResult;
      return res === "W" ? (r0 === "L" ? ", losing only to " + o + lt : r0 === "D" ? ", with a draw against " + o + lt : "") : ", beating only " + o + lt; };
    // 3.100.9 (DJ: "Houston has won four straight" on a 4-0 team just repeats the record): early in a season, when the last five
    // are the whole season, or a win streak covers every game (no losses yet), the streak lines say nothing new and are left out
    var wl = function (i) { var r = String(T[i].rec.total || "").split("-").map(Number); return r.length === 3 ? { w: r[0], l: r[2], gp: r[0] + r[1] + r[2] } : r.length === 2 ? { w: r[0], l: r[1], gp: r[0] + r[1] } : null; };
    ids.forEach(function (i) { var R = wl(i); if (R && R.gp && R.gp <= (form[i] || []).length) form[i] = []; T[i].wl = R; });
    ids.forEach(function (i) { var f = form[i] || []; if (f.length < 4) return; var last = f[f.length - 1], n = 0; for (var j = f.length - 1; j >= 0 && f[j] === last; j--) n++;
      if (T[i].wl && (last === "W" && T[i].wl.l === 0 || last === "L" && T[i].wl.w === 0)) return;   // 7-0 already says "won seven straight"
      var all = n === f.length && f.length >= 5 ? " in a row" : " straight";
      if (last === "W" && n >= 4) T[i].hot = n, add("won|" + i, 36 + n * 5, T[i].name + " have won " + NW[n] + all);
      if (last === "L" && n >= 4) T[i].cold = n, add("lost|" + i, 34 + n * 5, T[i].name + " have lost " + NW[n] + all);
      if (sport === "soccer" && f.indexOf("L") < 0 && f.length >= 5) add("unb|" + i, 40, T[i].name + " are unbeaten in their last five");
      if (sport === "soccer" && f.indexOf("W") < 0 && f.length >= 5 && last !== "L") add("winl|" + i, 40, T[i].name + " are winless in their last five"); });
    if (T[A].hot && T[H].cold || T[H].hot && T[A].cold) { var ho = T[A].hot ? A : H; add("form", 64, T[ho].name + " have won " + NW[T[ho].hot] + " straight; " + T[oth(ho)].name + " have lost " + NW[T[oth(ho)].cold]); }
    if (T[A].hot && T[H].hot) add("bothhot", 60, T[A].hot === T[H].hot ? "Both teams have won " + NW[T[A].hot] + " in a row" : "Both on a roll: " + T[A].name + " have won " + NW[T[A].hot] + " straight, " + T[H].name + " " + NW[T[H].hot]);
    // a two-legged tie's second leg (3.88.3): the aggregate score is the story ("USA leads 6-0 on aggregate going into the second leg")
    var ser = (comp.series || [])[0] || comp.series; if (sport === "soccer" && ser && +ser.leg === 2 && ser.competitors && ser.competitors.length === 2) {
      var ag = {}; ser.competitors.forEach(function (x) { var i = String(x.id || ""); if (T[i] && x.aggregateScore != null) ag[i] = +x.aggregateScore; });
      if (ag[A] != null && ag[H] != null) { var gA = ag[A], gH = ag[H], up = gA > gH ? A : H, d = Math.abs(gA - gH), hi = Math.max(gA, gH), lo = Math.min(gA, gH);
        if (!d) add("agg", 70, "Level at " + gA + "-" + gH + " on aggregate going into the second leg");
        else if (d === 1) add("agg|" + up, 70, T[up].name + " lead " + T[oth(up)].name + " " + hi + "-" + lo + " on aggregate going into the second leg");
        else add("agg|" + up, 70, T[up].name + " lead " + hi + "-" + lo + " on aggregate going into the second leg"); } }
    // playoff series (NBA, NHL, MLB, MLS Round One): "Thunder lead the series 2-1" (3.92.0)
    var hs0 = (sum.header || {}).season || {}, post = !!(g && g.post) || hs0.type === 3 || /playoff|post-?season/i.test(String(hs0.name || ""));
    if (post && ser && !ser.leg && ser.summary) { var sx = String(ser.summary).replace(/^([A-Z]{2,5}) (leads?|wins?|won)\b/, function (m0, ab, v) { return byAbbr[ab] ? T[byAbbr[ab]].name + " " + v.replace(/s$/, "") : m0; });
      if (/series/i.test(sx) && !/^\s*series starts/i.test(sx)) add("pser", 72, sx.charAt(0).toUpperCase() + sx.slice(1)); }
    // the team's leaders who won't play
    var lead = {}; (sum.leaders || []).forEach(function (L) { var i = String((L.team || {}).id || ""); (L.leaders || []).forEach(function (cat) { (cat.leaders || []).slice(0, 1).forEach(function (x) { var a = x.athlete || {}; if (a.displayName) (lead[i] = lead[i] || {})[a.displayName] = { pos: (a.position || {}).abbreviation || "", cat: cat.displayName || cat.name, v: x.displayValue }; }); }); });
    var keyOut = {};
    (sum.injuries || []).forEach(function (t) { var i = String((t.team || {}).id || ""); if (!T[i]) return; var outs = [], q = [];
      (t.injuries || []).forEach(function (x) { var n = ((x.athlete || {}).displayName) || "", stt = String(x.status || ""); if (!(lead[i] || {})[n]) return; var ln = (x.athlete || {}).lastName || n.split(" ").slice(1).join(" ") || n;
        // with the position in front ("QB Wilson"), from the injury report or the team's leaders (3.29.2)
        var pos = ((x.athlete || {}).position || {}).abbreviation || ((lead[i] || {})[n] || {}).pos || ""; if (pos && sport === "football") ln = pvPosWord(pos, n);  // football only (3.46.1): "QB Wilson" reads; "G Curry" in the NBA doesn't
        if (/out|reserve|suspen/i.test(stt)) outs.push(ln); else if (/question|doubt|day-to-day/i.test(stt)) q.push(ln); });
      // 3.153.2: who might explain a big line move: a quarterback or one of the team's leaders who is out
      (t.injuries || []).forEach(function (x) { var a0 = x.athlete || {}, n = a0.displayName || "", ps0 = (a0.position || {}).abbreviation || "";
        if (!/out|reserve|suspen/i.test(String(x.status || "")) || !(ps0 === "QB" && sport === "football" || (lead[i] || {})[n])) return;
        (keyOut[i] = keyOut[i] || []).push(sport === "football" && ps0 ? pvPosWord(ps0, n) : (a0.lastName || n.split(" ").slice(1).join(" ") || n)); });
      if (outs.length) add("out|" + i, 58 + outs.length * 4, T[i].name + " are without " + outs.slice(0, 2).join(" and "));
      else if (q.length) add("q|" + i, 40, q[0] + " is " + (/doubt/i.test(JSON.stringify(t.injuries)) ? "doubtful" : "a question mark") + " for " + T[i].name); });
    // a quarterback's first start of the season (3.31.0): the depth chart's QB1 isn't the team's passing leader and hasn't had a starter's game yet (see pvQB)
    (qbx || []).forEach(function (q) { if (T[q.team] && q.name) add("qb1|" + q.team, 66, T[q.team].name + " QB " + q.name + " makes his first start of the season"); });
    // the betting line and ESPN's predictor. 3.113.2: ESPN's win chance is shown at 99% at most (its 99.6% rounded to "a 100% chance")
    var pk = (sum.pickcenter || [])[0], m = pk && /^([A-Z]{2,5})\s+(-[\d.]+)$/.exec(String(pk.details || "").trim());
    // 3.101.4: only a real point spread. Without one ESPN's "details" can be the moneyline ("HOU -137"), which read as a 137-point favorite
    if (m && !(pk.spread != null && pk.spread !== "" && Math.abs(Math.abs(parseFloat(pk.spread)) - Math.abs(parseFloat(m[2]))) < 0.01 && Math.abs(parseFloat(m[2])) <= 45)) m = null;
    if (m && byAbbr[m[1]] && (sport === "football" || sport === "bball")) { var sp = Math.abs(parseFloat(m[2])), fav = byAbbr[m[1]];
      if (sp <= 2.5) add("tight", 42, T[fav].name + " are only " + sp + "-point favorites"); else if (sp >= (sport === "football" ? 14 : 12)) add("big", 30 + sp / 2, T[fav].name + " are " + sp + "-point favorites"); }
    if (m && byAbbr[m[1]] && byAbbr[m[1]] !== H && parseFloat(m[2]) <= -1 && sport !== "football" && sport !== "bball") {}
    // 3.144.1 (DJ: "I expect more with the one liners"): how the betting line has moved since it opened (DraftKings, in ESPN's pick center)
    var psp = (pk && pk.pointSpread) || {}, oH = parseFloat(((psp.home || {}).open || {}).line), cH = parseFloat(((psp.home || {}).close || {}).line);
    // never at a neutral site, where ESPN's opening line is sometimes from the other side (Kansas State "opened 12.5-point favorites"
    // over Alabama, now 15.5-point underdogs); a flip only when the line moved 6 points or less
    if (!comp.neutralSite && !isNaN(oH) && !isNaN(cH) && oH !== cH && Math.abs(cH) <= 45) {
      // 3.153.2 (DJ: "Become the favorite" read badly; "more valuable to say WHY the line moved"): the line now, then where it opened
      // (DraftKings' first line, often posted a week or more ahead). Shown only with a reason: a QB or one of the team's leaders
      // out for the side the line moved against, or that side's QB making his first start. A move with no reason is left out
      var thT = /^(nfl|nba|wnba|nhl|mlb)$/.test(lg) ? "the " : "";
      var why = function (fv0) { var o0 = oth(fv0), k1 = keyOut[o0] || [], k0 = k1.filter(function (n) { return /\(QB\)$/.test(n); }).concat(k1.filter(function (n) { return !/\(QB\)$/.test(n); })).slice(0, 1);
        if (k0.length) c = c.filter(function (x) { return x.k !== "out|" + o0; });  // the injury is in the line-move sentence instead
        var q0 = (qbx || []).filter(function (q) { return q.team === o0 && q.name; })[0];
        return k0.length ? ", with " + k0.join(" and ") + " out for " + thT + T[o0].name : q0 ? ", with " + q0.name + " (QB) making his first start for " + thT + T[o0].name : ""; };
      if (oH * cH < 0 && Math.abs(oH - cH) <= 6) { var nf = cH < 0 ? H : A, wy = why(nf); if (wy) add("flip|" + nf, 54, T[nf].name + " are now " + Math.abs(cH) + "-point favorites after opening as " + Math.abs(oH) + "-point underdogs" + wy); }
      else if (oH * cH > 0 && Math.abs(cH - oH) >= 2) { var fv = cH < 0 ? H : A, o1 = Math.abs(oH), c1 = Math.abs(cH), wy2 = why(c1 > o1 ? fv : oth(fv));
        if (wy2) add("move|" + fv, 46, T[fv].name + " are now " + c1 + "-point favorites, " + (c1 > o1 ? "up" : "down") + " from " + o1 + " when the line opened" + wy2); } }
    var tto = (pk && pk.total && pk.total.over) || {}, tO = parseFloat(String(((tto.open || {}).line) || "").replace(/^[ou]/, "")), tC = parseFloat(String(((tto.close || {}).line) || "").replace(/^[ou]/, ""));
    if (!isNaN(tO) && !isNaN(tC) && Math.abs(tC - tO) >= (sport === "football" ? 3 : sport === "bball" ? 4 : 99)) add("tot", 32, "The over/under has " + (tC > tO ? "climbed" : "dropped") + " from " + tO + " to " + tC);
    var pr = sum.predictor; if (pr && pr.homeTeam && pr.awayTeam) { var ph = parseFloat(pr.homeTeam.gameProjection), pa = parseFloat(pr.awayTeam.gameProjection);
      if (!isNaN(ph) && !isNaN(pa)) { if (Math.abs(ph - pa) <= 8) add("coin", 40, "ESPN's predictor calls it a coin flip"); else { var pf = ph > pa ? H : A, pp = Math.min(99, Math.round(Math.max(ph, pa))); if (pp >= 85) add("pred", 26 + (pp - 85), "ESPN gives " + T[pf].name + (/^(8\d|11|18)$/.test(String(pp)) ? " an " : " a ") + pp + "% chance"); } } }
    // the table: leaders, top-of-table and relegation clashes
    var pos = {}, grp = (((sum.standings || {}).groups || [])[0] || {}), ent = ((grp.standings || {}).entries || []);
    if (sport === "soccer" && ent.length >= 10) { var PT = [], GPn = 0; ent.forEach(function (e, n) { var id = String(e.id || ""), sv = {}; (e.stats || []).forEach(function (x) { sv[x.abbreviation] = x.displayValue; });
        PT[n] = parseInt(sv.P, 10); GPn = Math.max(GPn, parseInt(sv.GP, 10) || 0); if (T[id]) pos[id] = n + 1; });
      // 3.121.11 (DJ: "These one-liners don't provide a ton of value for soccer"): the card shows each team's place now, so the line
      // says what the place means in points (ESPN's own table): the lead at the top, the gap to the leaders, the gap to the drop zone,
      // or how close two sides are. Never just the two places again
      var N = ent.length, ptsOf = function (i) { return PT[pos[i] - 1]; }, pw = function (n) { return n === 1 ? "a point" : NW[n] && n <= 6 ? NW[n] + " points" : n + " points"; };
      var DZ = { epl: 3, laliga: 3, seriea: 3, bundesliga: 2, ligue1: 2 }[lg] || 0, drop = DZ && N >= 18 ? N - DZ + 1 : 0;   // the first place in the drop zone (direct relegation; no relegation in MLS or Europe)
      if (pos[A] && pos[H] && GPn >= 5 && PT.every(function (x) { return !isNaN(x); })) {
        ids.forEach(function (i) { var p0 = pos[i], me = ptsOf(i);
          if (p0 === 1) { var g1 = me - PT[1]; if (g1 > 0) add("top|" + i, 50 + Math.min(g1, 6), T[i].name + " are " + pw(g1) + " clear at the top"); else add("top|" + i, 50, T[i].name + " lead the table on goal difference"); }
          else if (p0 <= 3) { var gb = PT[0] - me; if (gb <= 6) add("chase|" + i, 46 - gb, T[i].name + " are " + (gb ? pw(gb) + " behind" : "level on points with") + " the leaders"); }
          if (drop && p0 >= drop) { var safe = PT[drop - 2] - me; add("drop|" + i, 48, T[i].name + (safe > 0 ? " are " + pw(safe) + " from safety" : " are in the drop zone on goal difference")); }
          else if (drop && p0 >= drop - 3) { var ab = me - PT[drop - 1]; if (ab >= 0 && ab <= 3) add("drop|" + i, 44, T[i].name + (ab ? " are only " + pw(ab) + " above the drop zone" : " are level on points with the drop zone")); } });
        var dp = Math.abs(ptsOf(A) - ptsOf(H)); if (Math.abs(pos[A] - pos[H]) <= 4 && dp <= 2) add("close", 40, dp ? "Only " + pw(dp) + " between them in the table" : "Level on points in the table");
        else if (Math.abs(pos[A] - pos[H]) <= 4 && dp <= 3) add("close", 34, "A win would lift " + T[ptsOf(A) < ptsOf(H) ? A : H].name + " level on points with " + T[ptsOf(A) < ptsOf(H) ? H : A].name); } }
    // 3.100.9: "still unbeaten" / "looking for a first win" are on the card's record already, so these two stay off
    if (false) ids.forEach(function (i) { var r = String(T[i].rec.total || "").split("-"); if (r.length === 3 && +r[2] === 0 && (+r[0] + +r[1]) >= 6) add("unbs|" + i, 50, T[i].name + " are still unbeaten this season"); if (r.length === 3 && +r[0] === 0 && (+r[1] + +r[2]) >= 6) add("winless|" + i, 46, T[i].name + " are still looking for a first win"); });
    // records: perfect or awful at home and on the road, unbeaten seasons
    ids.forEach(function (i) { var w = String(T[i].rec[i === H ? "home" : "road"] || "").split("-"), W = +w[0], Lw = +w[1];
      if (sport !== "soccer" && w.length >= 2 && W + Lw >= 4 && !pvAllHome(T[i], W, Lw)) { if (!Lw) add("perf|" + i, 40, T[i].name + " are " + W + "-0 " + (i === H ? "at home" : "on the road")); else if (!W || W / (W + Lw) <= 0.2) add("bad|" + i, 32, T[i].name + " are " + W + "-" + Lw + " " + (i === H ? "at home" : "on the road")); }
      var tot = String(T[i].rec.total || "").split("-"); if (false && tot.length >= 2 && +tot[0] >= 5 && +tot[1] === 0) add("unb0|" + i, 52, T[i].name + " are still unbeaten at " + tot[0] + "-0"); });
    // (no "ranked showdown" line: the ranks are already on the matchup)
    // head to head
    var ss = (sum.seasonseries || [])[0];
    if (ss) { var sm = /^(\w+) leads? (?:series|season) (\d+)-(\d+)/i.exec(String(ss.summary || "")), who = sm && byAbbr[sm[1]];
      if (sm && who && ss.type === "head-to-head" && +sm[3] === 0 && +sm[2] >= 3) add("h2h", sport === "soccer" ? 30 : 50, T[who].name + " have won the last " + NW[+sm[2]] + " meetings");
      else if (sm && who && ss.type === "head-to-head" && +sm[2] >= 3) add("h2h", sport === "soccer" ? 18 : 34, T[who].name + " have won " + NW[+sm[2]] + " of the last " + NW[+sm[2] + +sm[3]] + " meetings");
      else if (sm && who && ss.type !== "head-to-head" && +sm[2] >= 2) add("ser", 30, T[who].name + " lead the season series " + sm[2] + "-" + sm[3]); }
    // quieter form: four wins from the last five without a current streak. 3.113.2 (DJ: accuracy review): never "five of its last five"
    // (High Point at 6-0: the streak line is left out on an unbeaten record, and this one stepped in with it)
    ids.forEach(function (i) { var f = form[i] || [], w = f.filter(function (x) { return x === "W"; }).length; if (f.length >= 5 && w >= 4 && w < f.length && !T[i].hot) add("form5|" + i, 28 + w, T[i].name + " have won " + NW[w] + " of their last five" + odd(i, "W")); });
    // 3.91.2 (DJ: "Pistons (8-4) at Pelicans (5-10)" is not informative): quieter facts that only win when nothing above stands out
    // a slump: one or no wins in the last five, without a current four-game skid
    ids.forEach(function (i) { var f = form[i] || [], w = f.filter(function (x) { return x === "W"; }).length; if (f.length >= 5 && w <= 1 && w > 0 && f.indexOf("D") < 0 && !T[i].cold) add("slump|" + i, 31, T[i].name + " have lost " + NW[5 - w] + " of their last five" + odd(i, "L")); });
    // the division race (pro leagues; ESPN's summary carries each team's division): first place by how much, or last place
    if (/^(nba|wnba|nhl|nfl|mlb)$/.test(lg)) (((sum.standings || {}).groups) || []).forEach(function (gr) {
      var es = ((gr.standings || {}).entries || []), dv = String(gr.header || "").replace(/^\d{4}(-\d{2,4})?\s+/, "").replace(/\s+Standings$/i, "").trim();
      if (es.length < 4 || !dv || dv.length > 20) return;
      var st = function (e, ab) { var s = (e.stats || []).filter(function (x) { return x.abbreviation === ab; })[0]; return s ? s.displayValue : ""; };
      var gp = function (e) { return (+st(e, "W") || 0) + (+st(e, "L") || 0); };
      es.forEach(function (e, n) { var i = String(e.id || ""); if (!T[i] || gp(e) < 8) return;
        // hockey standings have no games-behind: the lead is in points (Nov 20, 2026)
        var pts = lg === "nhl", gap0 = pts ? (+st(e, "PTS") || 0) - (+st(es[1], "PTS") || 0) : 0, back = pts ? (+st(es[0], "PTS") || 0) - (+st(e, "PTS") || 0) : parseFloat(st(e, "GB"));
        if (n === 0) { var gb2 = pts ? gap0 : parseFloat(st(es[1], "GB")); if (!(gb2 > 0)) return;
          add("div|" + i, 38, T[i].name + " lead the " + dv + " by " + (pts ? (gb2 === 1 ? "a point" : gb2 + " points") : gb2 === 1 ? "a game" : gb2 === 0.5 ? "half a game" : gb2 + " games")); }
        else if (n === es.length - 1 && back >= (pts ? 5 : 3)) add("divlast|" + i, 30, T[i].name + " are last in the " + dv);
        // Nov 20, 2026 (DJ: a line on every slate game): the place in the division, a real fact the card doesn't show
        else add("place|" + i, 16 - n / 10, T[i].name + " are " + ORD(n + 1) + " in the " + dv); }); });
    // a strong home or road record that the perfect-record line above doesn't cover
    ids.forEach(function (i) { var w = String(T[i].rec[i === H ? "home" : "road"] || "").split("-"), W = +w[0], Lw = +w[1];
      if (sport !== "soccer" && w.length >= 2 && Lw > 0 && W + Lw >= 6 && !pvAllHome(T[i], W, Lw) && W / (W + Lw) >= 0.7) add("good|" + i, 30, T[i].name + " are " + W + "-" + Lw + " " + (i === H ? "at home" : "on the road")); });
    // ESPN's predictor leaning one way without being lopsided
    if (pr && pr.homeTeam && pr.awayTeam) { var ph2 = parseFloat(pr.homeTeam.gameProjection), pa2 = parseFloat(pr.awayTeam.gameProjection);
      if (!isNaN(ph2) && !isNaN(pa2) && Math.abs(ph2 - pa2) > 8 && Math.max(ph2, pa2) < 85) { var pf2 = ph2 > pa2 ? H : A, pp2 = Math.min(99, Math.round(Math.max(ph2, pa2))); add("pred", 22, "ESPN gives " + T[pf2].name + (/^(8\d|11|18)$/.test(String(pp2)) ? " an " : " a ") + pp2 + "% chance"); } }
    // the better team's top scorer (basketball)
    if (sport === "bball") { var bt = (parseFloat(String(T[A].rec.total).split("-")[0]) || 0) - (parseFloat(String(T[A].rec.total).split("-")[1]) || 0) >= (parseFloat(String(T[H].rec.total).split("-")[0]) || 0) - (parseFloat(String(T[H].rec.total).split("-")[1]) || 0) ? A : H;
      (sum.leaders || []).forEach(function (L) { if (String((L.team || {}).id || "") !== bt) return; (L.leaders || []).forEach(function (cat) { if (!/^points$/i.test(cat.name || cat.displayName || "")) return;
        var x = (cat.leaders || [])[0], a = x && x.athlete || {}, v = parseFloat(x && x.displayValue); if (a.displayName && v >= 15) add("scorer|" + bt, 20, (a.lastName || a.displayName) + " averages " + v + " points for " + T[bt].name); }); }); }
    // 3.144.1: each team's season leader, so every team can carry a real fact of its own (the card has one row per team)
    (sum.leaders || []).forEach(function (L) { var i = String((L.team || {}).id || ""); if (!T[i]) return; var cats = {};
      (L.leaders || []).forEach(function (cat) { var x = (cat.leaders || [])[0]; if (x && x.athlete && x.athlete.displayName) cats[cat.name || ""] = { n: x.athlete.displayName, v: String(x.displayValue || "") }; });
      var num = function (v, rx) { var m0 = rx.exec(v); return m0 ? parseFloat(m0[1].replace(/,/g, "")) : NaN; };
      if (sport === "football") { var ps = cats.passingYards, ru = cats.rushingYards, re = cats.receivingYards, pick = null;
        if (ru && num(ru.v, /([\d,]+) YDS/) >= 900) pick = ru.n + " has " + num(ru.v, /([\d,]+) YDS/).toLocaleString("en-US") + " rushing yds" + (num(ru.v, /(\d+) TD/) ? " and " + num(ru.v, /(\d+) TD/) + " TD" : "");
        else if (re && num(re.v, /([\d,]+) YDS/) >= 900) pick = re.n + " has " + num(re.v, /([\d,]+) YDS/).toLocaleString("en-US") + " receiving yds" + (num(re.v, /(\d+) TD/) ? " and " + num(re.v, /(\d+) TD/) + " TD" : "");
        else if (ps && num(ps.v, /(\d+) TD/) >= 8) pick = ps.n + " has " + num(ps.v, /(\d+) TD/) + " TD passes and " + (num(ps.v, /(\d+) INT/) || 0) + " INT";
        if (pick) add("lead|" + i, 22, pick + " for " + T[i].abbr); }
      if (sport === "bball" && !c.some(function (x) { return x.k === "scorer|" + i; })) { var pt = cats.points || cats.pointsPerGame; var pv0 = pt ? parseFloat(pt.v) : NaN;
        if (pt && pv0 >= 12) add("scorer|" + i, 20, pt.n + " averages " + pv0 + " points for " + T[i].abbr); }
      if ((sport === "hockey" || sport === "soccer") && !c.some(function (x) { return x.k === "goals|" + i; })) { var gq = cats.goals || cats.goalsLeaders; var gv = gq ? (/Goals:\s*(\d+)/i.test(gq.v) ? +/Goals:\s*(\d+)/i.exec(gq.v)[1] : parseInt(gq.v, 10)) : NaN;
        if (gq && gv >= 3) add("goals|" + i, 18, gq.n + " has " + gv + " goals for " + T[i].abbr); }
    });
    // Nov 20, 2026 (DJ: "We need some one-liner text to show for every slate game"): last real facts before the plain records line
    // the top scorer in goals (hockey, soccer), from ESPN's team leaders
    if (sport === "hockey" || sport === "soccer") { var gl0 = null; (sum.leaders || []).forEach(function (L) { var i = String((L.team || {}).id || ""); if (!T[i]) return; (L.leaders || []).forEach(function (cat) { if (!/^goals(Leaders)?$/i.test(cat.name || "")) return;
        // soccer's value reads "Matches: 10, Goals: 9" (3.121.11: the line never showed for soccer before)
        var x = (cat.leaders || [])[0], a = x && x.athlete || {}, dv = String(x && x.displayValue || ""), v = /Goals:\s*(\d+)/i.test(dv) ? +/Goals:\s*(\d+)/i.exec(dv)[1] : parseInt(dv, 10); if (a.displayName && v >= 3 && (!gl0 || v > gl0.v)) gl0 = { i: i, n: a.displayName, v: v }; }); });
      if (gl0 && !c.some(function (x) { return x.k === "goals|" + gl0.i; })) add("goals|" + gl0.i, sport === "soccer" && gl0.v >= 5 ? 36 + Math.min(gl0.v, 12) / 2 : 19, gl0.n + " leads " + (sing ? "" : "the ") + T[gl0.i].name + " with " + gl0.v + " goals"); }
    // the soccer table, both places
    // (no "Bournemouth (7th) host Forest (16th)": the card shows each team's place, 3.121.11)
    // a home or road record the lines above didn't use, whatever it is (the card shows only the overall record)
    ids.forEach(function (i) { var r0 = String(T[i].rec[i === H ? "home" : "road"] || ""), w = r0.split("-").map(Number);
      if (sport !== "soccer" && w.length >= 2 && !w.some(isNaN) && w[0] + w[1] >= 3 && !pvAllHome(T[i], w[0], w[1]) && !c.some(function (x) { return x.k === "perf|" + i || x.k === "bad|" + i || x.k === "good|" + i; }))
        add("split|" + i, 12 + Math.abs(w[0] / (w[0] + w[1]) - 0.5) * 6, T[i].name + " are " + r0 + " " + (i === H ? "at home" : "on the road")); });
    // ESPN's preview headline: a solid fallback
    var hd = String(((sum.article || {}).headline) || "").trim();
    // 3.183.3 (DJ: "One liner for ND says they're ranked 3 while the matchup shows 4"): ESPN's headline carries its own ranking
    // (here the playoff committee's); its "No. N Team" is rewritten to the card's ranking, or dropped when the card shows none
    ids.forEach(function (i) { var w = String(T[i].full || "").split(" "), nms = [w.slice(0, -1).join(" "), w.slice(0, -2).join(" "), T[i].full, w[0]].filter(function (x) { return x && x.length >= 3; });
      nms.sort(function (a, b) { return b.length - a.length; }).some(function (nm0) { var re = new RegExp("\\bNo\\. \\d+ (?=" + nm0.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b)"); if (!re.test(hd)) return false;
        hd = hd.replace(re, T[i].rank ? "No. " + T[i].rank + " " : ""); return true; }); });
    if (hd && hd.length <= 120 && !pvBlandHead(hd, ids.reduce(function (a, i) { var w = String(T[i].full || "").split(" "); return a.concat([T[i].name, T[i].full, T[i].abbr, w.length > 1 ? w[w.length - 1] : "", w.length > 2 ? w.slice(-2).join(" ") : "", w.length > 1 ? w.slice(0, -1).join(" ") : ""]); }, []))) add("art", 44, hd);   // 3.144.1: ESPN's preview headline is the storyline (rivalry, holiday, what's at stake)
    // a playoff game (3.92.0): the regular-season table, division race and season series no longer decide anything
    if (post) c = c.filter(function (x) { return !/^(div|divlast|topclash|relclash|leader|gap|unbs|winless|unb0|ser|top|chase|drop|close)(\||$)/.test(x.k); });
    if (!c.length) {  // nothing stands out (or the game has started and ESPN dropped the pre-game notes): records, plainly
      var rc = function (x) { return T[x].rec.total ? " (" + T[x].rec.total + ")" : ""; };
      pvCompute.fb = true;
      return T[A].name && T[H].name ? T[A].name + rc(A) + (comp.neutralSite ? " vs " : " at ") + T[H].name + rc(H) : null;
    }
    // "Both on a roll" (or a hot team against a cold one) already says each team's streak: drop the single-team streak lines
    if (c.some(function (x) { return x.k === "bothhot" || x.k === "form"; })) c = c.filter(function (x) { return !/^(won|lost|unb)\|/.test(x.k); });
    // "Both on a roll" and hot-vs-cold already say each team's streak: the single-team streak lines go, whichever ranked higher
    if (c.some(function (x) { return x.k === "bothhot" || x.k === "form"; })) c = c.filter(function (x) { return !/^(won|lost)\|/.test(x.k); });
    c.sort(function (x, y) { return y.sc - x.sc; });
    var idIn = function (k) { return String(k || "").split("|").filter(function (x) { return T[x]; })[0] || ""; };
    pvCompute.tm = idIn(c[0].k) ? T[idIn(c[0].k)].abbr : "";
    pvCompute.sc = c[0].sc; pvCompute.f = c[0].k === "art" ? "" : c[0].tx;   // for pvBlend (105-pv-notes.js): how strong the line is, and its best fact alone
    // 3.144.1 (DJ: "I expect more with the one liners for my slate tomorrow"): the card shows one "ABBR: fact" row per team, so the
    // line gives each team its own facts: a storyline or matchup fact first (ESPN's preview headline, both streaks, a coin flip, the
    // spread or the over/under moving), then each team's best fact, plus its second best when it's strong and short
    var STREAK = /^(form|bothhot|won|lost|unb|form5|slump)$/, k0 = function (x) { return x.k.split("|")[0]; };
    var mu = c.filter(function (x) { return !idIn(x.k) && x.sc >= 28; })[0], streaky = mu && /^(form|bothhot)$/.test(mu.k);
    var used = mu ? [mu] : [], order = sport === "soccer" ? [H, A] : [A, H], parts = mu ? [mu.k === "close" ? mu.tx : mu.tx] : [];
    order.forEach(function (i) {
      var mine = c.filter(function (x) { return idIn(x.k) === i && x.k !== "art" && used.indexOf(x) < 0 && !(streaky && STREAK.test(k0(x))) && !(mu && /^(tight|big)$/.test(mu.k) && /^(pred|coin)$/.test(k0(x))); });
      var f1 = mine[0]; if (!f1) return; used.push(f1); parts.push(f1.tx);
      var f2 = mine.filter(function (x) { return k0(x) !== k0(f1) && !(STREAK.test(k0(x)) && STREAK.test(k0(f1))) && !(/^(qb1)$/.test(k0(f1))); })[0];
      if (f2 && f2.sc >= 28 && f1.tx.length + f2.tx.length <= 110) { used.push(f2); parts.push(f2.tx); } });
    var t = parts.length ? parts.join("; ") : c[0].tx;
    if (parts.length > 1) pvCompute.tm = "";
    return t;
  }
  // football, before kickoff: is either team starting a quarterback for the first time this season? The depth chart's QB1 against the team's season
  // passing leader; when they differ, QB1's game log says whether he's had a starter's game (15+ pass attempts) this season. Depth charts are cached for the session.
  var QBD = {};
  // a team's offense from its ESPN depth chart, first name at each spot: { qb, rb, wr1, wr2, wr3, te } (each { id, name, pos })
  function depthOf(lg, id) {
    return QBD[lg + "|" + id] || (QBD[lg + "|" + id] = rkFetch(bxApi(lg, "teams/" + id + "/depthcharts")).then(function (d) {
      var off = ((d && d.depthchart) || []).filter(function (x) { return x.positions && x.positions.qb; })[0], o = {}; if (!off) return null;
      ["qb", "rb", "wr1", "wr2", "wr3", "te"].forEach(function (k) { var a = ((off.positions[k] || {}).athletes || [])[0]; if (a && a.id) o[k] = { id: String(a.id), name: a.displayName || "", pos: k.replace(/\d/, "").toUpperCase() }; });
      return o; }));
  }
  function pvQB(lg, sum) {
    var comp = ((sum && sum.header || {}).competitions || [])[0] || {}, yr = String(((sum.header || {}).season || {}).year || "");
    if (BX_SPORT[lg] !== "football" || ((comp.status || {}).type || {}).state !== "pre") return Promise.resolve([]);
    var lead = {}, hurt = {};
    (sum.leaders || []).forEach(function (L) { var i = String((L.team || {}).id || ""); (L.leaders || []).forEach(function (cat) { if (cat.name === "passingYards") lead[i] = String((((cat.leaders || [])[0] || {}).athlete || {}).id || ""); }); });
    (sum.injuries || []).forEach(function (t) { (t.injuries || []).forEach(function (x) { if (/out|reserve|suspen|doubt/i.test(String(x.status || ""))) hurt[String((x.athlete || {}).id || "")] = 1; }); });
    return Promise.all((comp.competitors || []).map(function (k) {
      var id = String((k.team || {}).id || ""); if (!id || !lead[id]) return null;
      return depthOf(lg, id).then(function (dc) { var qb = dc && dc.qb;
        if (!qb || qb.id === lead[id] || hurt[qb.id]) return null;
        return rkFetch("https://site.api.espn.com/apis/common/v3/sports/" + bxBase(lg) + "/athletes/" + qb.id + "/gamelog").then(function (gl) {
          if (!gl) return null;
          var ai = (gl.names || []).indexOf("passingAttempts"), st = (gl.seasonTypes || []).filter(function (x) { return !/pre|post|bowl/i.test(x.displayName || ""); })[0];
          if (st && ai < 0) return null;  // not a passer's log: say nothing
          var thisYr = st && yr && String(st.displayName || "").indexOf(yr) !== -1, most = 0;
          if (thisYr) (st.categories || []).forEach(function (c) { (c.events || []).forEach(function (e) { most = Math.max(most, parseFloat((e.stats || [])[ai]) || 0); }); });
          return most < 15 ? { team: id, name: qb.name } : null;
        });
      });
    })).then(function (r) { return r.filter(Boolean); }, function () { return []; });
  }
  var PV = (function () { try { var m = JSON.parse(localStorage.getItem("slate-pv") || "{}"); Object.keys(m).forEach(function (k) { if (/^A ranked showdown/.test((m[k] || {}).text || "") || (/^(nfl|ncaaf)-/.test(k) ? / are without [A-Z][a-z]|^[A-Z][a-z][^ ]* is (a question mark|doubtful) for / : /(without |^|and )(G|F|C|PG|SG|SF|PF|G-F|F-G|F-C|C-F|LW|RW|D) [A-Z]/).test((m[k] || {}).text || "") || /Both on a roll: .*; |; Both on a roll|^Both on a roll: \S+ have won (\w+) straight, \S+ \1$/.test((m[k] || {}).text || "") || !("tm" in (m[k] || {})) || !(m[k] || {}).g7 || (m[k] || {}).fb) delete m[k]; }); return m; } catch (e) { return {}; } })(), pvQ = [], pvRun = 0, pvT = null;
  // the phone shares today's preview lines with Slate's server (prefs/pvlines), so live notifications and Starting now
  // alerts can carry the same line as the slate (3.58.0). Only on a phone signed in with a passcode; only when it changed.
  var pvShareT = null, pvShared = "", pvSharedAt = 0;
  function pvShare() {
    if (pvShareT) return;  // one write at most every 8 seconds, however often the slate redraws
    pvShareT = setTimeout(function () {
      pvShareT = null;
      if (!db || !uid || !state.isOwner || state.date !== todayInHome()) return;
      var lines = {}, live = {}, tags = {}; games().forEach(function (g) {
        var p = PV[g.id]; if (p && p.text) lines[g.id] = String(p.text).slice(0, 140);   // notifications keep the plain stats line (DJ, 3.89.1)
        // 3.68.0: the card's tag for the live notification's header ("Upset watch", "Rivalry"), not "Your team" or "Added"
        try { var wst = status(g).kind === "live" ? walSlateTag(g) : null, tg = (wst ? [wst.tag] : []).concat(state.why[g.id] || []).filter(function (t) { return t && t !== "Your team" && t !== "Added"; })[0]; if (tg && status(g).kind !== "over") tags[g.id] = String(tg).slice(0, 24); } catch (e) {}
        // 3.61.1: the red live one-liner too, as the card shows it ("GER: Wirtz has scored twice"), for the live notification
        var h = (bx.live[g.id] || {}).hl; if (h && h.text && status(g).kind === "live") { try { var n = hlLine(g, h.text, h.tm); if (n && n.textContent) live[g.id] = String(n.textContent).slice(0, 140); } catch (e) {} }
      });
      var js = JSON.stringify([lines, live, tags]); if (js === "[{},{},{}]" || js === pvShared && (!Object.keys(live).length || Date.now() - pvSharedAt < 5 * 60000)) return;
      pvShared = js; pvSharedAt = Date.now();  // live lines are re-sent every 5 minutes while Slate is open, so the server knows they're current
      db.doc("prefs/pvlines").set({ date: state.date, lines: lines, live: live, tags: tags, liveAt: Date.now(), updatedAt: new Date().toISOString() }).then(null, function () { pvShared = ""; });
    }, 8000);
  }
  function pvSave() { pvShare(); try { var keep = {}, cut = Date.now() - 2 * 864e5; Object.keys(PV).forEach(function (k) { if (PV[k].at > cut && PV[k].text != null) keep[k] = { at: PV[k].at, text: PV[k].text, tm: PV[k].tm || "", sc: PV[k].sc || 0, f: PV[k].f || "", fb: PV[k].fb ? 1 : 0, recs: PV[k].recs || null, g7: 1 }; }); localStorage.setItem("slate-pv", JSON.stringify(keep)); } catch (e) {} }
  // 3.113.10 (DJ: "some of these one-liners provide no value"): a line that only restates the matchup. ESPN's preview headline
  // "Notre Dame Fighting Irish take on the Auburn Tigers", "Penguins take on the Blues, look to end home slide": it starts with a team
  // and take on / host / visit / face…, and past the team names it has no number and no other name (a player, a coach)
  function pvBlandHead(t, names) {
    // ranks are on the card already (DJ, Nov 19: "No. 8 Houston faces No. 11 Kansas" is repetitive): "No. 8", "#8", "8th-ranked" don't count as a number
    t = String(t || "").trim().replace(/\b(?:No\.|#)\s*\d+\s+/gi, "").replace(/\b\d+(?:st|nd|rd|th)[- ]ranked\s+/gi, "").replace(/^(?:top-\d+|ranked)\s+/i, ""); if (!t || /\d/.test(t)) return false;
    var esc = function (x) { return String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    names = (names || []).filter(function (x) { return x && String(x).length >= 2; }).sort(function (a, b) { return b.length - a.length; });
    if (!names.length) return false;
    var N = "(?:" + names.map(esc).join("|") + ")";
    if (!new RegExp("^(the )?" + N + "('s?)? (take on|takes on|face|faces|host|hosts|visit|visits|meet|meets|battle|battles|play|plays|welcome|welcomes|square off|squares off|face off|faces off|tip off|tips off|clash|vs\\.?|at|and)\\b", "i").test(t)) return false;
    var rest = t.replace(new RegExp("(^|[^\\w])" + N + "('s?)?(?![\\w])", "g"), " ");
    // 3.144.1: where they play ("…meet in Cypress Lake, Florida") and a school's state tag ("Saint Mary's (CA)") aren't news either
    rest = rest.replace(/\([^)]{1,12}\)/g, " ").replace(/\s+(in|at)\s+[A-Z][\w'.-]*(\s+[A-Z][\w'.-]*)*(,\s+[A-Z][\w.]*(\s+[A-Z][\w.]*)*)?\s*$/, "");
    return !/(^|[\s,;:-])(?!(The|A|An|In|On|At|As|And|To|For|With|After|Before|Look|Looks|Seek|Seeks|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Game|Week)\b)[A-Z][a-z]/.test(rest.slice(1));
  }
  function pvNames(g) {
    var out = []; ["away", "home"].forEach(function (sd) { var f = String(g[sd] || ""), w = f.split(" ");
      out.push(f, short(g, sd), abbr(g, sd), w.length > 1 ? w[w.length - 1] : "", w.length > 2 ? w.slice(-2).join(" ") : "", w.length > 1 ? w.slice(0, -1).join(" ") : ""); });
    return out.filter(function (x, i) { return x && out.indexOf(x) === i; });
  }
  // true when the records a line was built from disagree with the records on the game's card (3.120.x)
  function pvRecOff(g, recs) {
    if (!g || !recs) return false;
    return ["away", "home"].some(function (sd) { var c = String(g[sd + "Record"] || "").trim(), r = String(recs[sd] || "").trim(); return c && r && c !== r; });
  }
  function pvNode(g) {
    var p = PV[g.id]; if (p && p.text) pvShare();
    if (!p || (!p.busy && Date.now() - p.at > 30 * 60000)) pvNeed(g);
    else if (p.text && !p.busy && pvRecOff(g, p.recs) && Date.now() - p.at > 60000) pvNeed(g);   // a record just changed: build the line again now
    if (!p || !p.text) return null;
    // 3.113.10: the plain records line ("Cincinnati at Orlando") and a headline that only restates the matchup show nothing
    if (p.fb || pvBlandHead(p.text, pvNames(g)) || pvRecOff(g, p.recs)) return null;
    // 3.131.1 (DJ: "one liners on regular iPhone are shorter than duo. Make sure all are the same"): the full line on every phone,
    // wrapping to a second line when it has to. It used to be cut to the longest version that fit one line (pvFit), so narrower
    // screens got shorter lines
    var ln = hlLine(g, p.text, p.tm, "hl hl-pre hl-one");
    return ln;
  }
  function pvNeed(g) {
    if (!BX_SPORT[g.league] || !bxBase(g.league) || g.custom) return;
    var p = PV[g.id] || (PV[g.id] = { at: 0, text: null });
    if (p.busy || p.queued) return; p.queued = true; pvQ.push(g); pvPump();
  }
  function pvPump() {
    while (pvRun < 3 && pvQ.length) (function (g) {
      var p = PV[g.id]; p.queued = false; p.busy = true; pvRun++;
      var cur = bx.live[g.id] || (bx.live[g.id] = {});
      var qbx = [];
      (cur.ev ? Promise.resolve(cur.ev) : bxFindEvent(g)).then(function (ev) { if (!ev) return null; cur.ev = ev; return rkFetch(bxSummaryUrl(g.league, ev)); }).then(function (sum) {
        return sum ? pvQB(g.league, sum).then(function (q) { qbx = q || []; return sum; }, function () { return sum; }) : sum; }).then(function (sum) {
        if (sum) { cur.sum = sum; cur.sumAt = Date.now(); }
        var tx = null; try { tx = sum ? pvCompute(g.league, sum, qbx, g) : null; } catch (e) {}
        // a line built from records that don't match the card's own can't be checked: no line (the card's data is stale, or ESPN's is)
        if (tx && pvRecOff(g, pvCompute.recs)) { tx = null; p.text = ""; p.recs = null; }
        if (pvCompute.fb && p.text) tx = p.text;  // never swap a real pre-game line for the plain records one
        // keep the odds chips in step with the line: same fetch, same numbers
        try { var tgt = cur.data || (state.box || {})[g.id]; if (sum && tgt && tgt.state === "pre") { var fresh = bxNorm(g.league, sum, null); if (fresh.odds) { tgt.odds = fresh.odds; bxRedraw(g); } } } catch (e) {}
        var changed = tx !== p.text; if (tx && tx !== p.text) { p.tm = pvCompute.tm || ""; p.sc = pvCompute.sc || 0; p.f = pvCompute.f || ""; p.fb = !!pvCompute.fb; p.recs = pvCompute.recs; } p.text = tx || p.text || ""; p.at = Date.now();
        if (changed && tx) { pvSave(); clearTimeout(pvT); pvT = setTimeout(function () { if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, 250); }
        if (changed && tx) agRedraw();
      }, function () { p.at = Date.now() - 25 * 60000; }).then(function () { p.busy = false; pvRun--; pvPump(); });
    })(pvQ.shift());
  }

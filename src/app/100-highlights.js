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
    (head.competitors || []).forEach(function (k) { var tm = k.team || {}; teams[String(tm.id)] = { abbr: tm.abbreviation || "", name: tm.shortDisplayName || tm.displayName || "", short: tm.location || tm.shortDisplayName || "", side: k.homeAway, score: hlNum(k.score) }; });
    var tid = Object.keys(teams);
    // tm: the one team a line is about (a player's team, or the team it names), shown in front of it on the slate
    var curTm = "", tmOf = function (f) { if (curTm) return curTm; var n = f && f.team; if (!n) return ""; for (var i in teams) if (teams[i].name === n || teams[i].abbr === n || teams[i].short === n || i === String(n)) return teams[i].abbr; return ""; };
    function add(key, score, tone, text, facts) { c.push({ key: key, score: score, tone: tone, text: text, facts: facts, tm: tmOf(facts) }); }
    var box = sum.boxscore || {}, hkP = {};
    // team shooting (basketball)
    (box.teams || []).forEach(function (bt) {
      var t = teams[String((bt.team || {}).id)]; if (!t || sport !== "bball") return;
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
      var t = teams[String((tp.team || {}).id)] || { abbr: "" };
      curTm = t.abbr || "";
      (tp.statistics || []).forEach(function (grp) {
        var lab = grp.labels || [], gname = String(grp.name || "").toLowerCase();
        (grp.athletes || []).forEach(function (a) {
          var s2 = {}; lab.forEach(function (l, i) { s2[l] = (a.stats || [])[i]; });
          var nm = (a.athlete || {}).displayName || "", sh = (a.athlete || {}).shortName || nm, id = (a.athlete || {}).id || nm;
          if (sport === "bball") {
            var pts = hlNum(s2.PTS), min = hlNum(String(s2.MIN || "0").split(":")[0]), reb = hlNum(s2.REB), ast = hlNum(s2.AST), fg = hlMA(s2.FG), th = hlMA(s2["3PT"]);
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
            if (gname === "passing" && (yds >= 275 || td >= 3)) add("pass|" + id + "|" + Math.floor(yds / 50) + td, yds / 8 + td * 8, 1, nm + " " + yds + " passing yds, " + td + " TD", { player: nm, line: (s2["C/ATT"] || "") + ", " + yds + " yds, " + td + " TD, " + (s2.INT || 0) + " INT" });
            if (gname === "passing" && hlNum(s2.INT) >= 3) add("int|" + id + "|" + s2.INT, 40, -1, nm + " has thrown " + s2.INT + " interceptions", { player: nm, line: s2.INT + " INT" });
            if ((gname === "rushing" || gname === "receiving") && (yds >= 125 || td >= 2)) add(gname + "|" + id + "|" + Math.floor(yds / 25) + td, yds / 5 + td * 8, 1, nm + " " + yds + " " + (gname === "rushing" ? "rushing" : "receiving") + " yds" + (td ? ", " + td + " TD" : ""), { player: nm, line: yds + " yds, " + td + " TD" });
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
          goals.push({ by: by, mn: mn, nm: nm, as: an, og: og, ogBy: ogBy, before: before, pen: /penalty/i.test(tt), how: /header/i.test(String(k.text)) ? "header" : /free kick|free-kick/i.test(String(k.text) + tt) ? "free kick" : "" });
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
        if (!total && (done || period >= 2)) add("nil|" + hiS, 32, 0, done ? "Goalless, though " + nameOf(hiS) + " outshot " + nameOf(loS) + " " + a1 + " to " + b1 : "Still goalless; " + nameOf(hiS) + " lead the shots " + a1 + " to " + b1, tag(hiS));
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
      var worstA = 0, worstH = 0, run = 0, runTeam = null, pa = 0, ph = 0;
      plays.forEach(function (x) {
        var a = hlNum(x.awayScore), h = hlNum(x.homeScore);
        worstA = Math.min(worstA, a - h); worstH = Math.min(worstH, h - a);
        var who = a > pa ? A : h > ph ? H : null, pts = (a - pa) + (h - ph);
        if (who) { if (who === runTeam && !(a > pa && h > ph)) run += pts; else { runTeam = who; run = pts; } }
        pa = a; ph = h;
      });
      var lead = teams[A].score - teams[H].score;
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
    var named = false;
    if (side) {
      var full = String(g[side] || ""), words = [full, short(g, side), full.split(" ").slice(0, -1).join(" "), abbr(g, side)].filter(function (w) { return w && w.length >= 2; });
      named = words.some(function (w) { return new RegExp("(^|[^A-Za-z])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^A-Za-z]|$)").test(text); });
    }
    if (side) p.dataset.side = side;  // 3.71.0: which team the line is about, for its team color on the slate
    if (side && !named) p.appendChild(el("b", "hl-tm", String(abbr(g, side) || tm) + ": "));
    p.appendChild(document.createTextNode(text));
    return p;
  }
  // which team a free-text line is about: the players it names, matched to the game's leaders and box score (one team only)
  function teamOfText(g, text) {
    text = String(text || ""); if (!text) return "";
    var found = {}, hit = function (n, tm) { n = String(n || ""); if (tm && n.length >= 4 && text.indexOf(n) !== -1) found[String(tm).toUpperCase()] = 1; };
    var v = scoreRaw(g.id) || {}; (v.ld || []).forEach(function (L) { hit(L.full, L.t); hit(L.n, L.t); hit(String(L.full || L.n || "").split(" ").slice(1).join(" "), L.t); });
    var b = boxFor(g); ((b && b.teams) || []).forEach(function (t) { (t.groups || []).forEach(function (gr) { (gr.rows || []).forEach(function (r) { hit(r.n, t.abbr); }); }); (t.xi || []).forEach(function (r) { hit(r.n, t.abbr); }); });
    var ks = Object.keys(found); return ks.length === 1 ? ks[0] : "";
  }
  function hlNode(g) {
    hlWatch();
    // lines come from the app's own rules (free); a closing line Claude wrote earlier is kept for that game
    var cur = bx.live[g.id], h = cur && cur.hl, sv0 = ((HL.doc || {}).games || {})[g.id];
    if (sv0 && sv0.final && sv0.text && !hlScorey(sv0.text)) return hlLine(g, sv0.text, "");
    if (h && h.text) { pvShare(); return hlLine(g, h.text, h.tm); }
    var kc = HLC[g.id]; return kc && kc.t && status(g).kind === "over" ? hlLine(g, kc.t, kc.tm) : null;
  }
  // ---- Preview line: one free line under an upcoming game, from ESPN's pre-game summary ----
  // streaks, injuries to a team's leaders, the betting line, ESPN's predictor, table clashes, head-to-head, ESPN's preview headline
  function pvCompute(lg, sum, qbx, g) {
    pvCompute.fb = false; pvCompute.tm = ""; pvCompute.sc = 0; pvCompute.f = "";
    var sport = BX_SPORT[lg], comp = ((sum.header || {}).competitions || [])[0] || {}, c = [], T = {}, ids = [];
    (comp.competitors || []).forEach(function (k) { var tm = k.team || {}, id = String(tm.id || ""); ids.push(id);
      var rec = {}; (k.record || []).forEach(function (r) { rec[r.type] = r.summary || r.displayValue || ""; });
      var rk = (k.curatedRank || {}).current; T[id] = { id: id, name: String((sport === "soccer" ? tm.shortDisplayName : tm.nickname || tm.name) || tm.shortDisplayName || tm.displayName || "").replace(/\s+/g, " ").trim(), full: tm.displayName || "", abbr: tm.abbreviation || "", side: k.homeAway, rec: rec, rank: rk && rk <= 25 ? rk : (k.rank && k.rank <= 25 ? k.rank : 0) }; });
    if (ids.length !== 2) return null;
    // 3.71.0: the card's own ranks win. ESPN's game summary can still carry last week's poll (UCLA "No. 7" on a card that
    // says 9 the Monday a new poll came out), so when the card has ranks, the line uses the same ones
    if (g && (Number(g.awayRank) > 0 || Number(g.homeRank) > 0)) ids.forEach(function (i) { var r = Number(g[T[i].side + "Rank"]); T[i].rank = r > 0 && r <= 25 ? r : 0; });
    ids.forEach(function (i) { if (T[i].rank) T[i].name = "No. " + T[i].rank + " " + T[i].name; });
    var H = ids.filter(function (i) { return T[i].side === "home"; })[0] || ids[1], A = ids[0] === H ? ids[1] : ids[0], oth = function (i) { return i === H ? A : H; };
    var nm = function (i) { return (T[i].rank ? "No. " + T[i].rank + " " : "") + T[i].name; };
    var NW = ["", "one", "two", "three", "four", "five", "six"], ORD = function (n) { var v = n % 100; return n + (v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"); };
    // 3.88.3: American grammar. A college team or a soccer side is one place ("Florida is", "USA has"); pro nicknames stay plural ("Spurs have")
    var sing = sport === "soccer" || /^ncaa/.test(lg), esc = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var conj = function (tx) { if (!sing) return tx; ids.forEach(function (i) { if (!T[i].name) return; tx = tx.replace(new RegExp("(^|[:;,] |and )" + esc(T[i].name) + " (have|are|lead)\\b", "g"), function (m0, pre, v) { return pre + T[i].name + " " + { have: "has", are: "is", lead: "leads" }[v]; }); });
      return tx.replace(/\bis (only )?([\d.]+)-point favorites/g, function (m0, o, n) { return "is " + (o || "") + (/^(8|11|18)(\.|$)/.test(n) ? "an " : "a ") + n + "-point favorite"; }).replace(/ their last five/g, " its last five"); };
    var add = function (k, sc, tx) { c.push({ k: k, sc: sc, tx: conj(tx) }); };
    var byAbbr = {}; ids.forEach(function (i) { byAbbr[T[i].abbr] = i; });
    // form: streaks from the last five
    var form = {}; (sum.lastFiveGames || []).forEach(function (t) { var i = String((t.team || {}).id || ""); if (T[i]) form[i] = (t.events || []).map(function (e) { return e.gameResult; }); });
    ids.forEach(function (i) { var f = form[i] || []; if (f.length < 4) return; var last = f[f.length - 1], n = 0; for (var j = f.length - 1; j >= 0 && f[j] === last; j--) n++;
      var all = n === f.length && f.length >= 5 ? " in a row" : " straight";
      if (last === "W" && n >= 4) T[i].hot = n, add("won|" + i, 36 + n * 5, T[i].name + " have won " + NW[n] + all);
      if (last === "L" && n >= 4) T[i].cold = n, add("lost|" + i, 34 + n * 5, T[i].name + " have lost " + NW[n] + all);
      if (sport === "soccer" && f.indexOf("L") < 0 && f.length >= 5) add("unb|" + i, 40, T[i].name + " are unbeaten in their last five"); });
    if (T[A].hot && T[H].cold || T[H].hot && T[A].cold) { var ho = T[A].hot ? A : H; add("form", 64, T[ho].name + " have won " + NW[T[ho].hot] + " straight; " + T[oth(ho)].name + " have lost " + NW[T[oth(ho)].cold]); }
    if (T[A].hot && T[H].hot) add("bothhot", 60, T[A].hot === T[H].hot ? "Both teams have won " + NW[T[A].hot] + " in a row" : "Both on a roll: " + T[A].name + " have won " + NW[T[A].hot] + " straight, " + T[H].name + " " + NW[T[H].hot]);
    // a two-legged tie's second leg (3.88.3): the aggregate score is the story ("USA leads 6-0 on aggregate going into the second leg")
    var ser = (comp.series || [])[0] || comp.series; if (sport === "soccer" && ser && +ser.leg === 2 && ser.competitors && ser.competitors.length === 2) {
      var ag = {}; ser.competitors.forEach(function (x) { var i = String(x.id || ""); if (T[i] && x.aggregateScore != null) ag[i] = +x.aggregateScore; });
      if (ag[A] != null && ag[H] != null) { var gA = ag[A], gH = ag[H], up = gA > gH ? A : H, d = Math.abs(gA - gH), hi = Math.max(gA, gH), lo = Math.min(gA, gH);
        if (!d) add("agg", 70, "Level at " + gA + "-" + gH + " on aggregate going into the second leg");
        else if (d === 1) add("agg|" + up, 70, T[up].name + " lead " + T[oth(up)].name + " " + hi + "-" + lo + " on aggregate going into the second leg");
        else add("agg|" + up, 70, T[up].name + " lead " + hi + "-" + lo + " on aggregate going into the second leg"); } }
    // the team's leaders who won't play
    var lead = {}; (sum.leaders || []).forEach(function (L) { var i = String((L.team || {}).id || ""); (L.leaders || []).forEach(function (cat) { (cat.leaders || []).slice(0, 1).forEach(function (x) { var a = x.athlete || {}; if (a.displayName) (lead[i] = lead[i] || {})[a.displayName] = { pos: (a.position || {}).abbreviation || "", cat: cat.displayName || cat.name, v: x.displayValue }; }); }); });
    (sum.injuries || []).forEach(function (t) { var i = String((t.team || {}).id || ""); if (!T[i]) return; var outs = [], q = [];
      (t.injuries || []).forEach(function (x) { var n = ((x.athlete || {}).displayName) || "", stt = String(x.status || ""); if (!(lead[i] || {})[n]) return; var ln = (x.athlete || {}).lastName || n.split(" ").slice(1).join(" ") || n;
        // with the position in front ("QB Wilson"), from the injury report or the team's leaders (3.29.2)
        var pos = ((x.athlete || {}).position || {}).abbreviation || ((lead[i] || {})[n] || {}).pos || ""; if (pos && sport === "football") ln = pos + " " + ln;  // football only (3.46.1): "QB Wilson" reads; "G Curry" in the NBA doesn't
        if (/out|reserve|suspen/i.test(stt)) outs.push(ln); else if (/question|doubt|day-to-day/i.test(stt)) q.push(ln); });
      if (outs.length) add("out|" + i, 58 + outs.length * 4, T[i].name + " are without " + outs.slice(0, 2).join(" and "));
      else if (q.length) add("q|" + i, 40, q[0] + " is " + (/doubt/i.test(JSON.stringify(t.injuries)) ? "doubtful" : "a question mark") + " for " + T[i].name); });
    // a quarterback's first start of the season (3.31.0): the depth chart's QB1 isn't the team's passing leader and hasn't had a starter's game yet (see pvQB)
    (qbx || []).forEach(function (q) { if (T[q.team] && q.name) add("qb1|" + q.team, 66, T[q.team].name + " QB " + q.name + " makes his first start of the season"); });
    // the betting line and ESPN's predictor
    var pk = (sum.pickcenter || [])[0], m = pk && /^([A-Z]{2,5})\s+(-[\d.]+)$/.exec(String(pk.details || "").trim());
    if (m && byAbbr[m[1]] && (sport === "football" || sport === "bball")) { var sp = Math.abs(parseFloat(m[2])), fav = byAbbr[m[1]];
      if (sp <= 2.5) add("tight", 42, T[fav].name + " are only " + sp + "-point favorites"); else if (sp >= (sport === "football" ? 14 : 12)) add("big", 30 + sp / 2, T[fav].name + " are " + sp + "-point favorites"); }
    if (m && byAbbr[m[1]] && byAbbr[m[1]] !== H && parseFloat(m[2]) <= -1 && sport !== "football" && sport !== "bball") {}
    var pr = sum.predictor; if (pr && pr.homeTeam && pr.awayTeam) { var ph = parseFloat(pr.homeTeam.gameProjection), pa = parseFloat(pr.awayTeam.gameProjection);
      if (!isNaN(ph) && !isNaN(pa)) { if (Math.abs(ph - pa) <= 8) add("coin", 40, "ESPN's predictor calls it a coin flip"); else { var pf = ph > pa ? H : A, pp = Math.round(Math.max(ph, pa)); if (pp >= 85) add("pred", 26 + (pp - 85), "ESPN gives " + T[pf].name + (/^(8\d|11|18)$/.test(String(pp)) ? " an " : " a ") + pp + "% chance"); } } }
    // the table: leaders, top-of-table and relegation clashes
    var pos = {}, grp = (((sum.standings || {}).groups || [])[0] || {}), ent = ((grp.standings || {}).entries || []);
    if (sport === "soccer" && ent.length >= 10) { ent.forEach(function (e, n) { var id = String(e.id || ""); if (T[id]) pos[id] = n + 1; });
      if (pos[A] && pos[H]) { var N = ent.length, top = Math.min(pos[A], pos[H]);
        if (pos[A] <= 4 && pos[H] <= 4) add("topclash", 66, ORD(pos[H]) + " hosts " + ORD(pos[A]) + ": " + T[H].name + " vs " + T[A].name);
        else if (pos[A] > N - 4 && pos[H] > N - 4) add("relclash", 58, "Bottom-of-the-table scrap: " + T[H].name + " (" + ORD(pos[H]) + ") vs " + T[A].name + " (" + ORD(pos[A]) + ")");
        else if (top === 1) { var L1 = pos[A] === 1 ? A : H; add("leader", 48, "League leaders " + T[L1].name + (L1 === H ? " host " : " visit ") + T[oth(L1)].name + " (" + ORD(pos[oth(L1)]) + ")"); }
        else if (Math.abs(pos[A] - pos[H]) >= 12) { var hi2 = pos[A] < pos[H] ? A : H; add("gap", 30, T[hi2].name + " (" + ORD(pos[hi2]) + ") against " + T[oth(hi2)].name + " (" + ORD(pos[oth(hi2)]) + ")"); } } }
    if (sport === "soccer") ids.forEach(function (i) { var r = String(T[i].rec.total || "").split("-"); if (r.length === 3 && +r[2] === 0 && (+r[0] + +r[1]) >= 6) add("unbs|" + i, 50, T[i].name + " are still unbeaten this season"); if (r.length === 3 && +r[0] === 0 && (+r[1] + +r[2]) >= 6) add("winless|" + i, 46, T[i].name + " are still looking for a first win"); });
    // records: perfect or awful at home and on the road, unbeaten seasons
    ids.forEach(function (i) { var w = String(T[i].rec[i === H ? "home" : "road"] || "").split("-"), W = +w[0], Lw = +w[1];
      if (sport !== "soccer" && w.length >= 2 && W + Lw >= 4) { if (!Lw) add("perf|" + i, 40, T[i].name + " are " + W + "-0 " + (i === H ? "at home" : "on the road")); else if (!W || W / (W + Lw) <= 0.2) add("bad|" + i, 32, T[i].name + " are " + W + "-" + Lw + " " + (i === H ? "at home" : "on the road")); }
      var tot = String(T[i].rec.total || "").split("-"); if (sport !== "soccer" && tot.length >= 2 && +tot[0] >= 5 && +tot[1] === 0) add("unb0|" + i, 52, T[i].name + " are still unbeaten at " + tot[0] + "-0"); });
    // (no "ranked showdown" line: the ranks are already on the matchup)
    // head to head
    var ss = (sum.seasonseries || [])[0];
    if (ss) { var sm = /^(\w+) leads? (?:series|season) (\d+)-(\d+)/i.exec(String(ss.summary || "")), who = sm && byAbbr[sm[1]];
      if (sm && who && ss.type === "head-to-head" && +sm[3] === 0 && +sm[2] >= 3) add("h2h", 50, T[who].name + " have won the last " + NW[+sm[2]] + " meetings");
      else if (sm && who && ss.type === "head-to-head" && +sm[2] >= 3) add("h2h", 34, T[who].name + " have won " + NW[+sm[2]] + " of the last " + NW[+sm[2] + +sm[3]] + " meetings");
      else if (sm && who && ss.type !== "head-to-head" && +sm[2] >= 2) add("ser", 30, T[who].name + " lead the season series " + sm[2] + "-" + sm[3]); }
    // quieter form: four or five wins from the last five without a current streak
    ids.forEach(function (i) { var f = form[i] || [], w = f.filter(function (x) { return x === "W"; }).length; if (f.length >= 5 && w >= 4 && !T[i].hot) add("form5|" + i, 28 + w, T[i].name + " have won " + NW[w] + " of their last five"); });
    // ESPN's preview headline: a solid fallback
    var hd = String(((sum.article || {}).headline) || "").trim(); if (hd && hd.length <= 90) add("art", 33, hd);
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
    // the second fact must add something: after "Both on a roll" or a hot-vs-cold line, the streaks are already said
    var STREAK = /^(form|bothhot|won|lost|unb|form5)$/, streaky = STREAK.test(c[0].k.split("|")[0]);
    var qbFirst = c[0].k.indexOf("qb1|") === 0;  // "Raiders QB Mendoza makes his first start" doesn't read on into "and are without…": the second fact is the other team's
    var t = c[0].tx, s2 = c.filter(function (x) { var k0 = x.k.split("|")[0]; return x.k !== "art" && k0 !== c[0].k.split("|")[0] && x.k.indexOf("form") < 0 && !(streaky && STREAK.test(k0)) && !(qbFirst && idIn(x.k) === idIn(c[0].k)) && !(/^(big|tight)$/.test(c[0].k) && /^(pred|coin)$/.test(x.k)) && !(/^(pred|coin)$/.test(c[0].k) && /^(big|tight)$/.test(x.k)); })[0];
    if (c[0].k !== "art" && s2 && t.length + s2.tx.length <= 100 && s2.sc >= 30) {  // two facts when they fit in about a line and a half
      // same team twice reads as one sentence: "Canucks have lost five straight and are 1-8 at home"
      var who0 = qbFirst || s2.k.indexOf("qb1|") === 0 ? null : ids.filter(function (i) { return t.indexOf(T[i].name + " ") === 0 && s2.tx.indexOf(T[i].name + " ") === 0; })[0];
      var rest = who0 ? s2.tx.slice(T[who0].name.length + 1) : "";
      // 3.88.3: no repeated verb. "USA has won five in a row and has won the last four meetings" -> "...and the last four meetings";
      // "are without X and are 5-0 at home" -> "...and 5-0 at home"
      if (who0) { var p1 = t.slice(T[who0].name.length + 1).split(" "), p2 = rest.split(" ");
        if (p1[0] === p2[0] && /^(have|has)$/.test(p1[0]) && p1[1] === p2[1]) rest = p2.slice(2).join(" ");
        else if (p1[0] === p2[0] && /^(are|is|have|has)$/.test(p1[0]) && !/^(still|only|looking)$/.test(p2[1] || "")) rest = p2.slice(1).join(" ");
        else if (!/^(are|have|is|has|leads?) /.test(rest)) rest = ""; }
      t = who0 && rest ? t + " and " + rest : who0 ? t : t + "; " + s2.tx;
      if (!who0 && idIn(s2.k) !== idIn(c[0].k)) pvCompute.tm = "";  // two teams' facts: no single team
    }
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
  var PV = (function () { try { var m = JSON.parse(localStorage.getItem("slate-pv") || "{}"); Object.keys(m).forEach(function (k) { if (/^A ranked showdown/.test((m[k] || {}).text || "") || (/^(nfl|ncaaf)-/.test(k) ? / are without [A-Z][a-z]|^[A-Z][a-z][^ ]* is (a question mark|doubtful) for / : /(without |^|and )(G|F|C|PG|SG|SF|PF|G-F|F-G|F-C|C-F|LW|RW|D) [A-Z]/).test((m[k] || {}).text || "") || /Both on a roll: .*; |; Both on a roll|^Both on a roll: \S+ have won (\w+) straight, \S+ \1$/.test((m[k] || {}).text || "") || !("tm" in (m[k] || {})) || !(m[k] || {}).g3) delete m[k]; }); return m; } catch (e) { return {}; } })(), pvQ = [], pvRun = 0, pvT = null;
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
  function pvSave() { pvShare(); try { var keep = {}, cut = Date.now() - 2 * 864e5; Object.keys(PV).forEach(function (k) { if (PV[k].at > cut && PV[k].text != null) keep[k] = { at: PV[k].at, text: PV[k].text, tm: PV[k].tm || "", sc: PV[k].sc || 0, f: PV[k].f || "", fb: PV[k].fb ? 1 : 0, g3: 1 }; }); localStorage.setItem("slate-pv", JSON.stringify(keep)); } catch (e) {} }
  function pvNode(g) {
    var p = PV[g.id]; if (p && p.text) pvShare();
    if (!p || (!p.busy && Date.now() - p.at > 30 * 60000)) pvNeed(g);
    return p && p.text ? hlLine(g, p.text, p.tm, "hl hl-pre") : null;
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
        if (pvCompute.fb && p.text) tx = p.text;  // never swap a real pre-game line for the plain records one
        // keep the odds chips in step with the line: same fetch, same numbers
        try { var tgt = cur.data || (state.box || {})[g.id]; if (sum && tgt && tgt.state === "pre") { var fresh = bxNorm(g.league, sum, null); if (fresh.odds) { tgt.odds = fresh.odds; bxRedraw(g); } } } catch (e) {}
        var changed = tx !== p.text; if (tx && tx !== p.text) { p.tm = pvCompute.tm || ""; p.sc = pvCompute.sc || 0; p.f = pvCompute.f || ""; p.fb = !!pvCompute.fb; } p.text = tx || p.text || ""; p.at = Date.now();
        if (changed && tx) { pvSave(); clearTimeout(pvT); pvT = setTimeout(function () { if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, 250); }
        if (changed && tx) agRedraw();
      }, function () { p.at = Date.now() - 25 * 60000; }).then(function () { p.busy = false; pvRun--; pvPump(); });
    })(pvQ.shift());
  }

  // ---- The Slate rating for soccer (3.130.0, DJ: "I like slate rating... create some calculation for each player position") ----
  // Slate's own score, not an official one: no free source publishes match ratings, so this is worked out from the
  // real match stats ESPN (Opta) gives for every player. Everyone starts at 6.0; each thing he did adds or takes
  // points, and what a thing is worth depends on his job on the field. Shown to one decimal, kept between 3.0 and 10.0.
  // The six jobs: GK keeper, CB centre back, FB full back or wing-back, MID central or holding midfielder,
  // ATT winger or attacking midfielder, ST striker. docs/pages/soccer-rating.md has the table in plain words.
  var SOC_RATE_BASE = 6.0, SOC_RATE_MIN_MINUTES = 15;
  // 3.130.3 (DJ, Nov 23, 2026, after comparing with FotMob's Liverpool 4-0 Man United ratings; he said all four gaps
  // need adjusting): a big chance missed costs less, goals conceded cost defenders and midfielders more, a keeper's
  // clean sheet is worth less, and above 8.5 each extra point counts 0.55 so a great game lands near 9.4, not 10.
  var SOC_RATE_SOFT = 8.5, SOC_RATE_SOFT_KEEP = 0.55;
  //                                         what he did                  GK     CB     FB     MID    ATT    ST
  var SOC_RATE = [
    ["goal",    "Goals",                      "goal",                    [1.5,   1.2,   1.1,   1.0,   0.9,   0.85]],
    ["pen",     "Penalties scored",           "penalty scored",          [0.5,   0.5,   0.5,   0.5,   0.5,   0.5]],
    ["assist",  "Assists",                    "assist",                  [0.8,   0.8,   0.75,  0.7,   0.65,  0.65]],
    ["key",     "Chances created",            "chance created",          [0.1,   0.12,  0.14,  0.14,  0.12,  0.12]],
    ["big",     "Big chances created",        "big chance created",      [0.12,  0.12,  0.12,  0.12,  0.12,  0.12]],
    ["sot",     "Shots on target (saved)",    "shot on target",          [0.05,  0.08,  0.08,  0.08,  0.1,   0.1]],
    ["miss",    "Big chances missed",         "big chance missed",       [-0.1,  -0.1,  -0.1,  -0.1,  -0.1,  -0.12]],
    ["drib",    "Dribbles won",               "dribble won",             [0,     0.05,  0.08,  0.08,  0.1,   0.1]],
    ["box",     "Touches in their box",       "touch in their box",      [0,     0,     0.02,  0.02,  0.02,  0.03]],
    ["pass",    "Passes completed",           "pass completed",          [0.008, 0.01,  0.008, 0.01,  0.006, 0.005]],
    ["badpass", "Passes missed",              "pass missed",             [-0.03, -0.03, -0.025, -0.03, -0.02, -0.015]],
    ["f3",      "Passes in the final third",  "final-third pass",        [0,     0.005, 0.008, 0.008, 0.006, 0.006]],
    ["long",    "Long balls completed",       "long ball completed",     [0.03,  0.03,  0.02,  0.02,  0.01,  0]],
    ["cross",   "Crosses completed",          "cross completed",         [0,     0.05,  0.12,  0.1,   0.12,  0.08]],
    ["tackle",  "Tackles won",                "tackle won",              [0,     0.15,  0.15,  0.13,  0.08,  0.06]],
    ["int",     "Interceptions",              "interception",            [0.05,  0.15,  0.13,  0.12,  0.06,  0.05]],
    ["clear",   "Clearances",                 "clearance",               [0.03,  0.07,  0.05,  0.03,  0.02,  0.02]],
    ["block",   "Shots blocked",              "shot blocked",            [0,     0.15,  0.12,  0.1,   0.05,  0.05]],
    ["recov",   "Balls recovered",            "ball recovered",          [0.03,  0.04,  0.04,  0.05,  0.03,  0.02]],
    ["air",     "Headers won",                "header won",              [0.05,  0.08,  0.06,  0.05,  0.05,  0.08]],
    ["lost",    "Duels lost",                 "duel lost",               [0,     -0.05, -0.05, -0.04, -0.03, -0.03]],
    ["fouled",  "Fouls won",                  "foul won",                [0.04,  0.04,  0.04,  0.04,  0.04,  0.04]],
    ["foul",    "Fouls given away",           "foul given away",         [-0.08, -0.08, -0.08, -0.08, -0.08, -0.08]],
    ["disp",    "Times he lost the ball",     "time he lost the ball",   [-0.04, -0.04, -0.04, -0.04, -0.03, -0.03]],
    ["off",     "Offsides",                   "offside",                 [-0.05, -0.05, -0.05, -0.05, -0.05, -0.05]],
    ["yc",      "Yellow card",                "yellow card",             [-0.4,  -0.4,  -0.4,  -0.4,  -0.4,  -0.4]],
    ["rc",      "Red card",                   "red card",                [-1.8,  -1.8,  -1.8,  -1.8,  -1.8,  -1.8]],
    ["og",      "Own goals",                  "own goal",                [-1.2,  -1.2,  -1.2,  -1.2,  -1.2,  -1.2]],
    ["pkc",     "Penalties given away",       "penalty given away",      [-0.8,  -0.8,  -0.8,  -0.8,  -0.8,  -0.8]],
    ["pkm",     "Penalties missed",           "penalty missed",          [-0.8,  -0.8,  -0.8,  -0.8,  -0.8,  -0.8]],
    ["cs",      "Clean sheet",                "clean sheet",             [0.5,   0.7,   0.6,   0.2,   0,     0]],
    ["conc",    "Goals conceded while on",    "goal conceded",           [-0.25, -0.4,  -0.3,  -0.12, 0,     0]],
    ["save",    "Saves",                      "save",                    [0.25,  0,     0,     0,     0,     0]],
    ["prev",    "Goals prevented (ESPN's shot quality)", "goal prevented", [0.5, 0,     0,     0,     0,     0]],
    ["pks",     "Penalties saved",            "penalty saved",           [1.2,   0,     0,     0,     0,     0]],
    ["claim",   "High balls claimed",         "high ball claimed",       [0.08,  0,     0,     0,     0,     0]],
    ["sweep",   "Sweeper clearances",         "sweeper clearance",       [0.08,  0,     0,     0,     0,     0]]
  ];
  var SOC_ROLES = ["GK", "CB", "FB", "MID", "ATT", "ST"];
  var SOC_ROLE_NAME = { GK: "Goalkeeper", CB: "Centre back", FB: "Full back", MID: "Midfielder", ATT: "Winger / attacking mid", ST: "Striker" };
  // ESPN's stat names → the things the table counts
  function socRateCounts(s) {
    var n = function (k) { var v = Number(s[k]); return isFinite(v) ? v : 0; };
    var mins = n("minutes"), goals = n("totalGoals"), pens = n("penaltyKickGoals");
    return {
      goal: Math.max(0, goals - pens), pen: pens, assist: n("goalAssists"), key: n("shotAssists"), big: n("bigChanceCreated"),
      sot: Math.max(0, n("shotsOnTarget") - goals), miss: n("bigChanceMissed"), drib: n("wonContest"), box: n("touchesInOppBox"),
      pass: n("accuratePasses"), badpass: n("inaccuratePasses"), f3: n("successfulFinalThirdPasses"), long: n("accurateLongBalls"), cross: n("accurateCrosses"),
      tackle: n("effectiveTackles"), int: n("interceptions"), clear: n("totalClearance"), block: n("outfielderBlock") || n("blockedShots"), recov: n("ballRecovery"),
      air: n("aerialsWon"), lost: n("duelsLost"), fouled: n("foulsSuffered"), foul: n("foulsCommitted"), disp: n("turnover"), off: n("offsides"),
      yc: n("redCards") || n("secondYellow") ? 0 : n("yellowCards"), rc: n("redCards") || n("secondYellow") ? 1 : 0, og: n("ownGoals"), pkc: n("penaltyKickConceded"), pkm: n("penaltyKicksMissed"),
      cs: mins >= 60 && n("goalsConceded") === 0 ? 1 : 0, conc: n("goalsConceded"),
      save: n("saves"), prev: n("goalsPrevented"), pks: n("penaltyKicksSaved"), claim: n("goodHighClaim"), sweep: n("accurateKeeperSweeper"),
      minutes: mins, touches: n("touches")
    };
  }
  // → { score, role, minutes, parts: [{ label, n, pts }] biggest first }, or null when he played under 15 minutes or ESPN has no stats
  function socRate(stats, role) {
    if (!stats) return null;
    var c = socRateCounts(stats), ri = SOC_ROLES.indexOf(role); if (ri < 0) ri = 3;
    if (c.minutes < SOC_RATE_MIN_MINUTES || (!c.touches && !c.save)) return null;
    var total = SOC_RATE_BASE, parts = [];
    SOC_RATE.forEach(function (row) {
      var cnt = c[row[0]], w = row[3][ri]; if (!cnt || !w) return;
      var pts = cnt * w; total += pts; parts.push({ k: row[0], label: row[1], one: row[2], n: cnt, each: w, pts: pts });
    });
    parts.sort(function (a, b) { return Math.abs(b.pts) - Math.abs(a.pts); });
    var sq = total > SOC_RATE_SOFT ? (total - SOC_RATE_SOFT) * (SOC_RATE_SOFT_KEEP - 1) : 0; total += sq;  // the squeeze at the top
    return { score: Math.max(3, Math.min(10, Math.round(total * 10) / 10)), raw: total, squeeze: sq, role: SOC_ROLES[ri], minutes: c.minutes, parts: parts };
  }
  // a starter's job from where he lines up: `lines` is the keeper's row, then each line from the back to the strikers, left to right
  function socRoleAt(lines, i, j) {
    var out = lines.length - 1, w = (lines[i] || []).length, edge = j === 0 || j === w - 1;
    if (i === 0) return "GK";
    if (i === 1) return w >= 4 && edge ? "FB" : "CB";
    if (i === out) return w >= 3 && edge ? "ATT" : "ST";
    if (lines[1].length === 3 && w >= 4 && edge) return "FB";    // wing-backs outside a back three
    if (w >= 4) return edge ? "ATT" : "MID";                     // a midfield four or five: wide men attack, the middle holds
    return i >= 3 && i === out - 1 ? "ATT" : "MID";              // the short line right behind the striker attacks; the rest are midfielders
  }
  // a substitute's job from ESPN's position letters
  function socRoleOf(pos) { pos = String(pos || "").toUpperCase(); return pos === "G" || pos === "GK" ? "GK" : /^(CD|CB|SW)/.test(pos) ? "CB" : /^(RB|LB|WB|RWB|LWB)/.test(pos) ? "FB" : /^D/.test(pos) ? "CB" : /^(F|CF|ST|S$)/.test(pos) ? "ST" : /^(AM|LW|RW|W|LF|RF)/.test(pos) ? "ATT" : "MID"; }

  // ---- fetching the match stats and drawing the ratings ----
  // One ESPN request per player who played (about 14 a team), only for the team being looked at; a live game is asked
  // again at most every 90 seconds, a finished one once. Substitutes' jobs come from the club's ESPN squad list (G/D/M/F).
  var socRt = {}, socRtPos = {}, socRtCtx = {}, socRtOpen = {};
  function socRtLoad(g, t, b, people) {
    var key = g.id + "|" + t.id, cur = socRt[key] = socRt[key] || { at: 0, st: {}, busy: false, done: false };
    var ev = (bx.live[g.id] || {}).ev, base = bxBase(g.league), lgSlug = base.split("/")[1] || "all";
    if (!ev || cur.busy || (cur.done && b.state === "post") || Date.now() - cur.at < 90000) return;
    cur.busy = true; cur.at = Date.now();
    var jobs = people.map(function (p) {
      return rkFetch("https://sports.core.api.espn.com/v2/sports/soccer/leagues/" + lgSlug + "/events/" + ev + "/competitions/" + ev + "/competitors/" + t.id + "/roster/" + p.id + "/statistics/0").then(function (d) {
        var st = {}; (((d || {}).splits || {}).categories || []).forEach(function (c) { (c.stats || []).forEach(function (x) { st[x.name] = x.value; }); });
        if (Object.keys(st).length) cur.st[p.id] = st;
      });
    });
    if (!socRtPos[t.id] && people.some(function (p) { return p.sub; })) jobs.push(rkFetch(bxApi(g.league, "teams/" + t.id + "/roster")).then(function (d) {
      var m = socRtPos[t.id] = {}; ((d || {}).athletes || []).forEach(function (a) { m[String(a.id)] = (a.position || {}).abbreviation || ""; });
    }));
    Promise.all(jobs).then(function () {
      cur.busy = false; cur.done = b.state === "post";
      var go = function () {
        if (typeof agBusy === "function" && agBusy()) { setTimeout(go, 400); return; }  // never redraw under a finger
        var box = document.querySelector('.soc-rt-box[data-key="' + key + '"]'); if (box && socRtCtx[key]) socRtFill(box, socRtCtx[key]);
      };
      go();
    }, function () { cur.busy = false; });
  }
  function socRtFill(box, ctx) {
    var key = ctx.key, cur = socRt[key] || { st: {} }, rated = [];
    ctx.people.forEach(function (p) {
      var role = p.role || socRoleOf((socRtPos[ctx.tid] || {})[p.id]), r = socRate(cur.st[p.id], role);
      if (r) rated.push({ p: p, r: r });
    });
    rated.sort(function (a, b2) { return b2.r.raw - a.r.raw; });
    var pitch = box.parentNode && box.parentNode.querySelector(".soc-pitch");
    if (pitch) rated.forEach(function (x, i) {
      var pin = pitch.querySelector('.soc-p[data-id="' + x.p.id + '"]'); if (!pin) return;
      var old = pin.querySelector(".soc-rt"); if (old) old.remove();
      var dot = pin.querySelector(".soc-n"); if (dot) dot.appendChild(el("em", "soc-rt" + (i === 0 ? " top" : ""), x.r.score.toFixed(1)));
    });
    box.textContent = "";
    var hd = el("div", "soc-rt-h"); hd.appendChild(el("b", null, "Slate ratings"));
    var how = el("button", "soc-rt-how", "How it works"); how.type = "button"; hd.appendChild(how); box.appendChild(hd);
    // How it works (DJ, Nov 22, 2026: "Ensure users can see how the ratings are calculated in the app"): the rules in plain
    // words, then every point value for one job at a time, straight from the SOC_RATE table so it can never drift from the math.
    var note = el("div", "soc-rt-note");
    note.appendChild(el("p", null, "Slate's own score, not an official rating. It is worked out from ESPN's match stats for each player."));
    [["Start", "Every player starts at 6.0."],
     ["Add and take", "Each thing he did adds or takes points, times how often he did it. What it's worth depends on his job: a tackle counts more for a centre back, a chance created more for a winger, a save only for the keeper."],
     ["His job", "A starter's job comes from where he lines up in the formation. A substitute's comes from his listed position."],
     ["Top end", "Above " + SOC_RATE_SOFT.toFixed(1) + ", each extra point counts " + SOC_RATE_SOFT_KEEP + ", so only a rare game gets near 10. No score goes under 3.0 or over 10.0."],
     ["Who gets one", "Anyone who played " + SOC_RATE_MIN_MINUTES + " minutes or more. Tap a player below to see his own sums."]
    ].forEach(function (r) { var ln = el("p", "soc-rt-rule"); ln.appendChild(el("b", null, r[0])); ln.appendChild(el("span", null, r[1])); note.appendChild(ln); });
    note.appendChild(el("p", "soc-rt-sub", "Points for each thing, by job"));
    var jobs = el("div", "soc-rt-jobs"), tbl = el("div", "soc-rt-tbl"); jobs.setAttribute("role", "group"); jobs.setAttribute("aria-label", "Job on the field");
    var JOB_SHORT = { GK: "Keeper", CB: "Centre back", FB: "Full back", MID: "Midfielder", ATT: "Winger", ST: "Striker" };
    var drawJob = function () {
      var job = socRtOpen.job || "MID", ri = SOC_ROLES.indexOf(job);
      Array.prototype.forEach.call(jobs.children, function (bn) { bn.setAttribute("aria-pressed", bn.getAttribute("data-job") === job ? "true" : "false"); });
      tbl.textContent = "";
      SOC_RATE.forEach(function (row) {
        var w = row[3][ri]; if (!w) return;
        var ln = el("p", "soc-rt-line"); ln.appendChild(el("span", null, row[1]));
        ln.appendChild(el("b", w < 0 ? "neg" : null, (w > 0 ? "+" : "−") + String(Math.abs(w)))); tbl.appendChild(ln);
      });
    };
    SOC_ROLES.forEach(function (job) {
      var bn = el("button", null, JOB_SHORT[job]); bn.type = "button"; bn.setAttribute("data-job", job);
      bn.addEventListener("click", function (e) { e.stopPropagation(); socRtOpen.job = job; drawJob(); });
      jobs.appendChild(bn);
    });
    note.appendChild(jobs); note.appendChild(tbl); drawJob();
    note.hidden = !socRtOpen.how; box.appendChild(note);
    how.setAttribute("aria-expanded", socRtOpen.how ? "true" : "false");
    how.addEventListener("click", function (e) { e.stopPropagation(); socRtOpen.how = !socRtOpen.how; note.hidden = !socRtOpen.how; how.setAttribute("aria-expanded", socRtOpen.how ? "true" : "false"); });
    if (!rated.length) { box.appendChild(el("p", "soc-rt-wait", cur.busy || !cur.at ? "Working out the ratings…" : "ESPN has no player stats for this match yet.")); return; }
    var pts = function (v) { return (v > 0 ? "+" : "−") + Math.abs(v).toFixed(2); };
    var cnt = function (q) { var n = Math.round(q.n * 10) / 10; return q.k === "cs" || q.k === "yc" || q.k === "rc" ? q.label : n + " " + (n === 1 ? q.one : q.label.toLowerCase()); };
    rated.forEach(function (x, i) {
      var id = key + "|" + x.p.id, row = el("button", "soc-rt-row"); row.type = "button";
      row.appendChild(el("span", "soc-rt-sc" + (i === 0 ? " top" : ""), x.r.score.toFixed(1)));
      var who = el("span", "soc-rt-who"); who.appendChild(el("b", null, x.p.n));
      who.appendChild(el("span", null, SOC_ROLE_NAME[x.r.role] + " · " + Math.round(x.r.minutes) + "'" + (x.p.sub ? " · sub" : "")));
      who.appendChild(el("span", "soc-rt-top", x.r.parts.slice(0, 3).map(function (q) { return cnt(q); }).join(" · ")));
      row.appendChild(who); row.appendChild(icon("more"));
      var det = el("div", "soc-rt-det"); det.hidden = !socRtOpen[id];
      det.appendChild(el("p", "soc-rt-line base", "Starts at 6.0"));
      x.r.parts.forEach(function (q) { var ln = el("p", "soc-rt-line"); ln.appendChild(el("span", null, cnt(q))); ln.appendChild(el("b", q.pts < 0 ? "neg" : null, pts(q.pts))); det.appendChild(ln); });
      if (x.r.squeeze) { var sqz = el("p", "soc-rt-line"); sqz.appendChild(el("span", null, "Above " + SOC_RATE_SOFT.toFixed(1) + ", each extra point counts " + SOC_RATE_SOFT_KEEP)); sqz.appendChild(el("b", "neg", pts(x.r.squeeze))); det.appendChild(sqz); }
      var tot = el("p", "soc-rt-line total"); tot.appendChild(el("span", null, "Slate rating")); tot.appendChild(el("b", null, x.r.score.toFixed(1))); det.appendChild(tot);
      row.setAttribute("aria-expanded", socRtOpen[id] ? "true" : "false");
      row.addEventListener("click", function (e) { e.stopPropagation(); socRtOpen[id] = !socRtOpen[id]; det.hidden = !socRtOpen[id]; row.setAttribute("aria-expanded", socRtOpen[id] ? "true" : "false"); });
      box.appendChild(row); box.appendChild(det);
    });
  }
  // called by socLineup once the match has started: the box under the bench, and the score on each player's circle
  function socRatingBox(g, t, b, lines) {
    if (!b || (b.state !== "in" && b.state !== "post") || !t.id) return null;
    var key = g.id + "|" + t.id, people = [];
    lines.forEach(function (ln, i) { ln.forEach(function (p, j) { if (p && p.id) people.push({ id: p.id, n: p.n, role: socRoleAt(lines, i, j) }); }); });
    (t.bench || []).forEach(function (p) { if (p.on && p.id) people.push({ id: p.id, n: p.n, sub: true }); });
    if (!people.length) return null;
    socRtCtx[key] = { key: key, tid: t.id, people: people };
    var box = el("div", "soc-rt-box"); box.setAttribute("data-key", key);
    socRtLoad(g, t, b, people);
    return box;
  }

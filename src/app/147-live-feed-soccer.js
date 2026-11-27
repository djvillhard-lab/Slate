  // ---------- Live feed: soccer (3.87.0, DJ: "Work on setting up live feeds for soccer games") ----------
  // The same page as football and basketball: the score bar, who scored, possession, the match stats behind a button, and every event
  // newest first, from the commentary in ESPN's match summary (its key events when a match has no commentary). Everything shown is ESPN's:
  // the event types, the minute, the players named, the team stats. ESPN sends no xG and no "big chance" mark, so neither is shown.
  function scNorm(s) { s = String(s || "").toLowerCase(); try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {} return s.replace(/[^a-z0-9 ]/g, "").trim(); }
  function scLast(n) { var w = String(n || "").trim().split(" "); return w.length > 1 ? w.slice(1).join(" ") : w[0] || ""; }
  // every player in the match by name: jersey number, team and ESPN's stat line for the match so far
  function scIndex(sum) {
    var ix = {};
    (sum.rosters || []).forEach(function (r) { var tid = String((r.team || {}).id || "");
      (r.roster || []).forEach(function (p) { var a = p.athlete || {}, st = {}; (p.stats || []).forEach(function (s) { st[s.name] = Number(s.value != null ? s.value : s.displayValue) || 0; });
        var P = { id: "", name: a.displayName || a.fullName || "", jer: p.jersey || "", tid: tid, pos: (p.position || {}).abbreviation || "", st: st };
        if (P.name) ix[scNorm(P.name)] = P; }); });
    return ix;
  }
  function scLine(P) {
    var s = P.st || {}, o = [];
    if (s.totalGoals) o.push(s.totalGoals + (s.totalGoals === 1 ? " goal" : " goals"));
    if (s.goalAssists) o.push(s.goalAssists + (s.goalAssists === 1 ? " assist" : " assists"));
    if (s.totalShots) o.push(s.totalShots + (s.totalShots === 1 ? " shot" : " shots") + (s.shotsOnTarget ? ", " + s.shotsOnTarget + " on target" : ""));
    if (s.saves) o.push(s.saves + (s.saves === 1 ? " save" : " saves"));
    if (s.yellowCards) o.push(s.yellowCards === 1 ? "yellow card" : s.yellowCards + " yellows");
    return o.join(" · ");
  }
  // one event → what its box says. key = it stays when "Key events" is on (goals, penalties, cards, subs, VAR, the woodwork)
  function scRead(c) {
    var p = c.play || null, ty = String(((p || {}).type || {}).text || ""), tx = String(c.text || (p || {}).text || "").replace(/\s+/g, " ").trim();
    var names = ((p || {}).participants || []).map(function (a) { return (a.athlete || {}).displayName || ""; }).filter(Boolean), n0 = names[0] ? scLast(names[0]) : "";
    var o = { ty: ty, tx: tx, names: names, kind: "", title: ty || tx, emoji: "", key: false, note: false, roles: [] };
    if (!p || /^(kickoff|halftime|start |end |.*delay)/i.test(ty)) { o.note = true; o.title = tx || ty; o.key = /half|end |extra|shootout/i.test(ty + " " + tx); return o; }
    if (/own goal/i.test(ty)) { o.kind = "score"; o.emoji = "⚽"; o.title = "Own goal" + (n0 ? ", " + n0 : ""); o.key = true; o.goal = true; o.roles = ["own goal"]; }
    else if (/^goal|penalty - scored/i.test(ty)) { o.kind = "score"; o.emoji = "⚽"; o.goal = true; o.key = true;
      o.title = (/penalty/i.test(ty) ? "Penalty scored" : /header/i.test(ty) ? "Headed goal" : /free.?kick/i.test(ty) ? "Free-kick goal" : "Goal") + (n0 ? ", " + n0 : "");
      o.roles = ["goal", /assisted by/i.test(tx) ? "assist" : ""]; }
    else if (/penalty - (missed|saved)/i.test(ty)) { o.kind = "turn"; o.emoji = /saved/i.test(ty) ? "🧤" : "❌"; o.title = (/saved/i.test(ty) ? "Penalty saved" : "Penalty missed") + (n0 ? ", " + n0 : ""); o.key = true; o.roles = ["penalty"]; }
    else if (/red card|yellow.?red|second yellow/i.test(ty)) { o.kind = "to"; o.emoji = "🟥"; o.title = (/yellow/i.test(ty) ? "Second yellow, sent off" : "Red card") + (n0 ? ", " + n0 : ""); o.key = true; o.roles = ["sent off"]; }
    else if (/yellow card/i.test(ty)) { o.kind = "yc"; o.emoji = "🟨"; o.title = "Yellow card" + (n0 ? ", " + n0 : ""); o.key = true; o.roles = ["booked"]; }
    else if (/substitution/i.test(ty)) { o.kind = "foul"; o.emoji = "🔁"; o.title = "Substitution"; o.key = true; o.roles = ["on", "off"]; o.sub = true; }
    else if (/^var/i.test(ty)) { o.emoji = "📺"; o.title = "VAR" + (ty.replace(/^var\s*-?\s*/i, "") ? ": " + ty.replace(/^var\s*-?\s*/i, "") : ""); o.key = true; }
    else if (/woodwork/i.test(ty)) { o.emoji = "🥅"; o.title = "Off the woodwork" + (n0 ? ", " + n0 : ""); o.key = true; o.roles = ["shot"]; }
    else if (/shot on target/i.test(ty)) { o.kind = "miss"; o.emoji = "🧤"; o.title = "Shot saved" + (n0 ? ", " + n0 : ""); o.roles = ["shot"]; }
    else if (/shot off target/i.test(ty)) { o.kind = "miss"; o.emoji = "❌"; o.title = "Shot off target" + (n0 ? ", " + n0 : ""); o.roles = ["shot"]; }
    else if (/shot blocked/i.test(ty)) { o.kind = "miss"; o.emoji = "🚫"; o.title = "Shot blocked" + (n0 ? ", " + n0 : ""); o.roles = ["shot"]; }
    else if (/corner/i.test(ty)) { o.kind = "foul"; o.emoji = "🚩"; o.title = "Corner"; o.names = []; }
    else if (/offside/i.test(ty)) { o.kind = "foul"; o.emoji = "🚩"; o.title = "Offside"; o.names = []; }
    else if (/hand ?ball/i.test(ty)) { o.kind = "foul"; o.emoji = "✋"; o.title = "Handball" + (n0 ? ", " + n0 : ""); o.names = []; }
    else if (/foul/i.test(ty)) { o.kind = "foul"; o.names = [];  // ESPN logs a foul twice: "Foul by A." and "B wins a free kick."
      if (/wins a free kick/i.test(tx)) { o.emoji = "🦶"; o.title = "Free kick won"; } else { o.emoji = "✋"; o.title = "Foul" + (n0 ? " by " + n0 : ""); } }
    else { o.kind = "foul"; o.names = []; }
    return o;
  }
  // 3.91.5 (DJ: "doesn't look right after Portugal just scored"): for the first minute or so ESPN sends a new event as a bare sentence, with no
  // type, team or players attached; those arrive later. Until they do, the sentence itself says what happened ("Goal! Wales 2, Portugal 2.
  // Pedro Neto (Portugal) right footed shot..."), so the event is read from it and gets its proper box straight away.
  function scFill(c) {
    if (!c || c.play || !c.text) return c;
    var tx = String(c.text).replace(/\s+/g, " ").trim(), ty = "";
    if (/^Own Goal/i.test(tx)) ty = "Own Goal";
    else if (/^Goal!/i.test(tx)) ty = /converts the penalty/i.test(tx) ? "Penalty - Scored" : /\bheader\b/i.test(tx) ? "Goal - Header" : "Goal";
    else if (/^Penalty (saved|missed)/i.test(tx)) ty = /saved/i.test(tx) ? "Penalty - Saved" : "Penalty - Missed";
    else if (/second yellow card/i.test(tx)) ty = "Yellow Red Card";
    else if (/is shown the red card/i.test(tx)) ty = "Red Card";
    else if (/is shown the yellow card/i.test(tx)) ty = "Yellow Card";
    else if (/^Substitution,/i.test(tx)) ty = "Substitution";
    else if (/^VAR/i.test(tx)) ty = "VAR";
    else if (/hits the (bar|left post|right post|post|woodwork)/i.test(tx)) ty = "Shot Hit Woodwork";
    else if (/^Attempt saved/i.test(tx)) ty = "Shot On Target";
    else if (/^Attempt missed/i.test(tx)) ty = "Shot Off Target";
    else if (/^Attempt blocked/i.test(tx)) ty = "Shot Blocked";
    else if (/^Corner,/i.test(tx)) ty = "Corner Awarded";
    else if (/^Offside,/i.test(tx)) ty = "Offside";
    else if (/^Hand ball/i.test(tx)) ty = "Handball";
    else if (/^Foul by|wins a free kick/i.test(tx)) ty = "Foul";
    if (!ty) return c;
    var names = [], team = "", m;
    if (ty === "Substitution") { m = /^Substitution, ([^.]+)\. (.+?) replaces (.+?)(?: because of an injury)?\.$/i.exec(tx); if (m) { team = m[1]; names = [m[2], m[3]]; } }
    else { var body = tx.replace(/^Goal!\s+.+? \d+, .+? \d+\.\s*/, "").replace(/^(Attempt (saved|missed|blocked)|Own Goal by|Foul by|Hand ball by|Penalty (saved|missed)!?)\.?\s*/i, "");
      m = /^(.+?) \(([^)]+)\)/.exec(body); if (m) { names.push(m[1].replace(/^.*\. /, "").trim()); team = m[2]; }
      if (!team && (m = /^(?:Corner|Offside), ([^.]+)\./i.exec(tx))) team = m[1];
      if (/^Goal!/i.test(tx) && (m = /Assisted by (.+?)(?: with | following |\.|$)/.exec(tx)) && names.length) names.push(m[1].trim()); }
    var out = {}; Object.keys(c).forEach(function (k) { out[k] = c[k]; });
    out.play = { type: { text: ty }, text: tx, team: team ? { displayName: team } : null, participants: names.map(function (n) { return { athlete: { displayName: n } }; }) };
    return out;
  }
  function scStatsOpen() { try { return localStorage.getItem("slate-feed-stats") === "1"; } catch (e) { return false; } }
  // 3.167.0: what each event meant, counted from the events in order. Goals get a banner (Opens the scoring, Equalizer, Takes the lead, Hat trick) with
  // the scorer and the score, a red card gets one too; one line adds a second goal of the match, a three-goal lead, or a team's yellow card count.
  function scStory(rows, g) {
    var out = {}, pa = 0, ph = 0, goals = {}, yc = { away: 0, home: 0 };
    rows.forEach(function (R) { var rd = R.rd, st = { lines: [] }, nm = (rd.names && rd.names[0]) || "";
      if (rd.goal && R.a + R.h > pa + ph) { var sc = R.a > pa ? "away" : "home", own = /own goal/i.test(rd.ty), k = scNorm(nm), n = own || !k ? 0 : (goals[k] = (goals[k] || 0) + 1), d0 = pa - ph, d1 = R.a - R.h, m = Math.abs(d1);
        st.ban = { sd: sc, word: n === 3 ? "Hat trick" : pa + ph === 0 ? "Opens the scoring" : fdLeadWord(d0, d1, "Equalizer") || (Math.abs(d0) === 1 && m === 2 ? "Doubles the lead" : "Goal"), sub: own ? "Own goal" + (nm ? ", " + scLast(nm) : "") : nm, big: R.h + "-" + R.a };
        if (n === 2 || n > 3) st.lines.push(ordN(n) + " goal of the match for " + scLast(nm));
        if (m >= 3 && m > Math.abs(d0)) st.lines.push("A " + m + "-goal lead"); }
      else if (rd.kind === "to" && R.sd) st.ban = { sd: R.sd, word: "Red card", sub: nm, big: "" };
      else if (rd.kind === "yc" && R.sd) { yc[R.sd]++; if (yc[R.sd] >= 3) st.lines.push(fdPoss(abbr(g, R.sd)) + " " + ordN(yc[R.sd]) + " yellow card of the match"); }
      pa = R.a; ph = R.h; if (st.ban || st.lines.length) out[R.pid] = st; });
    return out;
  }
  function scFeed(body, g, sum, anchor, aTop, sc) {
    var comp = ((sum.header || {}).competitions || [])[0] || {}, cst = comp.status || {}, st = cst.type || {}, sideOf = {}, nameOf = {}, scoreOf = {}, recOf = {}, penOf = {};
    (comp.competitors || []).forEach(function (k) { var t = k.team || {}, sd = k.homeAway === "home" ? "home" : "away"; sideOf[String(t.id || "")] = sd;
      [t.displayName, t.name, t.shortDisplayName, t.location].forEach(function (n) { if (n) nameOf[scNorm(n)] = sd; });
      scoreOf[sd] = k.score; recOf[sd] = ((k.record || [])[0] || {}).summary || ""; if (k.shootoutScore != null) penOf[sd] = Number(k.shootoutScore); });
    var sdOf = function (t) { return t ? sideOf[String(t.id || "")] || nameOf[scNorm(t.displayName || t.name)] || "" : ""; };
    var over = st.state === "post", pre = st.state === "pre", live = st.state === "in", per = Number(cst.period) || 0, det = String(st.shortDetail || st.detail || "");
    var ht = live && /^ht$|half.?time/i.test(det), ix = scIndex(sum), lg = g.league;
    // the score bar: badges, records, the score, then the half and the minute ("2H 67'"), HT at the break, FT when it's over
    // 3.130.5 (DJ): the home side on the left, as soccer is written ("Man City 2-1 Fulham"); SL and SR are the sides left and right,
    // and the left/right classes (fd-tm-away is the left one) keep their places
    var SL = "home", SR = "away", pos = function (sd) { return sd === SL ? "away" : "home"; };
    var bug = el("div", "fd-bug");
    [SL, "mid", SR].forEach(function (sd) {
      if (sd === "mid") { var mid = el("div", "fd-mid");
        if (ht) mid.appendChild(fdHT("b")); else { var ck = el("span", "fd-ck");
          if (live) ck.appendChild(el("i", null, per === 1 ? "1H" : per === 2 ? "2H" : per === 5 ? "Pens" : per > 2 ? "ET" : ""));
          ck.appendChild(el("b", null, over ? (det || "FT") : pre ? timeText(g.start) : per === 5 ? "" : (cst.displayClock || det || ""))); mid.appendChild(ck); }
        if (penOf.away != null && penOf.home != null && (over || per === 5)) mid.appendChild(el("i", "sc-pens", "Pens " + penOf[SL] + "–" + penOf[SR]));
        var mw = fdWatch(g, over); if (mw) mid.appendChild(mw);
        bug.appendChild(mid); return; }
      var tm = el("div", "fd-tm fd-tm-" + pos(sd)); tm.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      var nm = el("b", null, recOf[sd] || ""); nm.setAttribute("aria-label", short(g, sd) + (recOf[sd] ? ", " + recOf[sd] : "")); tm.appendChild(nm);
      var aS = Number(scoreOf.away), hS = Number(scoreOf.home);
      var scn = el("b", "fd-sc" + (over && (sd === "away" ? aS < hS : hS < aS) ? " trail" : ""), pre ? "–" : String(scoreOf[sd] != null ? scoreOf[sd] : "–"));
      if (sd === SL) { bug.appendChild(tm); bug.appendChild(scn); } else { bug.appendChild(scn); bug.appendChild(tm); }
    });
    body.appendChild(bug);
    var hdr = document.querySelector("#pane-r > header.top"); $("view-feed").style.setProperty("--fd-top", (hdr ? hdr.offsetHeight : 0) + "px");
    // who scored and who was sent off, each side under its own badge, from ESPN's match details; then possession as one row
    var top = el("div", "fd-field sc-top"), cols = { away: [], home: [] }, byP = {};
    (comp.details || []).forEach(function (d) { var sd = sdOf(d.team); if (!sd || !(d.scoringPlay || d.redCard)) return;
      var nm = scLast((((d.participants || [])[0] || {}).athlete || {}).displayName || ""), min = (d.clock || {}).displayValue || "", k = sd + "|" + (d.redCard ? "r" : "g") + "|" + nm;
      if (!nm) return; var e = byP[k]; if (!e) { e = byP[k] = { nm: nm, red: !!d.redCard, mins: [] }; cols[sd].push(e); }
      e.mins.push(min + (d.penaltyKick ? " pen" : "") + (d.ownGoal ? " og" : "")); });
    var whoEl = function (cs) { var two = el("div", "sc-who");
      [SL, SR].forEach(function (sd) { var c = el("div", "sc-whoc sc-who-" + pos(sd)); cs[sd].forEach(function (e) { var r = el("p", "sc-wl"); r.appendChild(el("span", "sc-wi", e.red ? "🟥" : "⚽")); r.appendChild(el("b", null, e.nm)); r.appendChild(el("i", null, e.mins.join(", "))); c.appendChild(r); }); two.appendChild(c); });
      return two; };
    if (cols.away.length || cols.home.length) top.appendChild(whoEl(cols));
    var stOf = {}; ((sum.boxscore || {}).teams || []).forEach(function (t) { var sd = sdOf(t.team); if (!sd) return; stOf[sd] = {}; (t.statistics || []).forEach(function (s) { stOf[sd][s.name] = s.displayValue; }); });
    var hasStats = !pre && stOf.away && stOf.home, pa = hasStats ? parseFloat(stOf.away.possessionPct) : NaN, ph0 = hasStats ? parseFloat(stOf.home.possessionPct) : NaN;
    if (!isNaN(pa) && !isNaN(ph0) && pa + ph0 > 0) { var hp = Math.round(ph0), ap = 100 - hp, wr = el("div", "fd-wp hp-wp1");
      wr.appendChild(el("p", "fd-wpl hp-wpl1", "Possession")); wr.appendChild(el("span", null, abbr(g, "home") + " " + hp + "%"));
      var bar = el("span", "fd-wpb"), bh = el("i"), ba = el("i"); bh.style.width = hp + "%"; bh.style.background = fdTint(g, "home"); ba.style.width = ap + "%"; ba.style.background = fdTint(g, "away"); bar.appendChild(bh); bar.appendChild(ba); wr.appendChild(bar);
      wr.appendChild(el("span", null, ap + "% " + abbr(g, "away"))); wr.setAttribute("aria-label", "Possession: " + abbr(g, "home") + " " + hp + " percent, " + abbr(g, "away") + " " + ap + " percent"); top.appendChild(wr); }
    if (top.firstChild) body.appendChild(top);
    // the events, oldest first, with the score as it stood after each one (from ESPN's own "Goal! A 1, B 0." line; counted when it isn't there)
    var evs = (sum.commentary || []).filter(function (c) { return c && (c.text || c.play); }).map(scFill), fromKey = false;
    if (!evs.some(function (c) { return c.play; }) && (sum.keyEvents || []).length) { fromKey = true; evs = (sum.keyEvents || []).map(function (k, i) { return { sequence: i, time: k.clock || {}, text: k.text || "", play: k }; }); }
    var run = { away: 0, home: 0 }, rows = [], goalsC = [];
    evs.forEach(function (c, i) { var rd = scRead(c), p = c.play || {}, sd = sdOf(p.team), pid = fromKey ? String(p.id || "k" + i) : "c" + (c.sequence != null ? c.sequence : i);  /* by sequence: the id stays when ESPN fills the event's details in later */
      if (rd.goal) { var m = /Goal!\s+(.+?) (\d+), (.+?) (\d+)\./.exec(rd.tx), s1 = m ? nameOf[scNorm(m[1])] : "", s2 = m ? nameOf[scNorm(m[3])] : "";
        var was = { away: run.away, home: run.home };
        if (s1 && s2 && s1 !== s2) { run[s1] = +m[2]; run[s2] = +m[4]; } else if (sd) { var to = /own goal/i.test(rd.ty) && !m ? (sd === "away" ? "home" : "away") : sd; run[to]++; }
        var cr = run.away > was.away ? "away" : run.home > was.home ? "home" : sd, min0 = (c.time || {}).displayValue || ((p.clock || {}).displayValue) || "";
        if (cr && rd.names[0]) goalsC.push({ sd: cr, nm: scLast(rd.names[0]), min: min0 + (/penalty/i.test(rd.ty) ? " pen" : "") + (/own goal/i.test(rd.ty) ? " og" : "") }); }
      if (rd.kind === "to" && sd && rd.names[0]) goalsC.push({ sd: sd, nm: scLast(rd.names[0]), min: (c.time || {}).displayValue || "", red: true });
      rows.push({ c: c, rd: rd, sd: sd, pid: pid, a: run.away, h: run.home, min: (c.time || {}).displayValue || ((p.clock || {}).displayValue) || "" }); });
    // 3.91.5: ESPN's match details (the scorers card above) can trail its commentary by a minute or more after a goal. When the events
    // already hold more goals than the details do, the card is drawn from the events so the new scorer is there right away.
    if (!fromKey && goalsC.filter(function (x) { return !x.red; }).length > (comp.details || []).filter(function (d) { return d.scoringPlay; }).length) {
      var cols2 = { away: [], home: [] }, by2 = {};
      goalsC.forEach(function (x) { var k = x.sd + "|" + (x.red ? "r" : "g") + "|" + x.nm, e = by2[k]; if (!e) { e = by2[k] = { nm: x.nm, red: !!x.red, mins: [] }; cols2[x.sd].push(e); } e.mins.push(x.min); });
      var oldW = top.querySelector(".sc-who"), newW = whoEl(cols2); if (oldW) top.replaceChild(newW, oldW); else top.insertBefore(newW, top.firstChild);
      if (!top.parentNode) body.insertBefore(top, bug.nextSibling); }
    var keyOnly = !!FD.scOnly && !fromKey, list = el("div", "fd-list"), cap = keyOnly ? 1e9 : 14 * (1 + (+FD.more || 0)), shown = 0, total = 0, fresh = FD.seen || null, seenNow = {};
    var plRow = function (nm, sd, role) { var P = ix[scNorm(nm)] || { name: nm, jer: "", st: {} }, psd = sideOf[P.tid] || sd || "away", row = el("div", "fd-pl"); row.appendChild(fdJerseyOnly(g, psd, P));
      var w = el("span", "fd-pn"); w.appendChild(el("b", null, fdShort({ name: nm }))); if (role) w.appendChild(el("em", "fd-pos", role)); var ln = role === "on" || role === "off" ? "" : fdFzLine(R.pid, scNorm(nm), scLine(P)); if (ln) w.appendChild(el("i", null, ln)); row.appendChild(w); return row; };
    var story = {}; try { story = scStory(rows, g); } catch (e) { story = {}; }
    fdFzStart(g);
    for (var i = rows.length - 1; i >= 0; i--) {
      var R = rows[i], rd = R.rd; seenNow[R.pid] = 1;
      (rd.names || []).forEach(function (nm) { fdFzMark(scNorm(nm), R.pid); });
      if (keyOnly && !rd.key) continue;
      var isNew = !!(fresh && !fresh[R.pid]);
      if (rd.note) { if (shown < cap) list.appendChild(fdNoteCard(rd.title, isNew, R.pid, R.min, abbr(g, "home") + " " + R.h + "  " + abbr(g, "away") + " " + R.a)); continue; }
      total++; if (shown >= cap) continue; shown++;
      var card = el("div", "fd-play sc-play" + (rd.kind ? " fd-k-" + rd.kind : "") + (isNew ? " fd-new" : "")); card.setAttribute("data-id", R.pid);
      if (R.sd && rd.kind !== "to" && rd.kind !== "yc") card.style.setProperty("--fd-team", fdTint(g, R.sd));
      var ph = el("div", "fd-ph"); ph.appendChild(el("span", null, R.min + (R.sd ? (R.min ? " · " : "") + abbr(g, R.sd) : "")));
      ph.appendChild(el("span", "fd-psc", abbr(g, "home") + " " + R.h + "  " + abbr(g, "away") + " " + R.a)); card.appendChild(ph);
      card.appendChild(el("p", "fd-pt", (rd.emoji ? rd.emoji + " " : "") + rd.title));
      var tx = rd.tx.replace(/^Goal!\s+.+? \d+, .+? \d+\.\s*/, "").replace(/^Attempt (saved|missed|blocked)\.\s*/i, "").replace(/^Substitution, [^.]+\.\s*/i, "");
      if (tx && tx !== rd.title && !fromKey && !(rd.sub && rd.names.length > 1))  /* a key-events-only match has no sentence, just "X Goal at 72'" */ card.appendChild(el("p", "fd-px", tx));
      rd.names.slice(0, 2).forEach(function (nm, j) { if (j && !rd.roles[j]) return; card.appendChild(plRow(nm, rd.roles[j] === "own goal" ? "" : R.sd, rd.roles[j] || "")); });
      fdFlair(card, g, story[R.pid]);
      list.appendChild(card);
    }
    if (!rows.length) list.appendChild(el("p", "pv-none", pre ? "Goals, cards, subs and shots show up here after kickoff." : "ESPN has no play-by-play for this match."));
    // the line above the events: the timer and the delay while it's live (the same ones as the other sports), plus Stats and Key events
    if (live) fdAgo(list, sum, true, g);
    var fb = list.querySelector(".fd-bar"); if (!fb && rows.length) { fb = el("div", "fd-bar"); fb.appendChild(el("p", "fd-ago", "")); list.insertBefore(fb, list.firstChild); }
    if (fb) { var after = fb.querySelector(".fd-ago");
      if (hasStats) { var on = scStatsOpen(), sb = el("button", "fd-scf fd-ldb" + (on ? " on" : ""), "Stats"); sb.type = "button"; sb.setAttribute("aria-expanded", on ? "true" : "false");
        sb.addEventListener("click", function () { try { localStorage.setItem("slate-feed-stats", on ? "0" : "1"); } catch (e) {} fdKeepY(renderFeed); });
        fb.insertBefore(sb, after.nextSibling); after = sb;
        if (on) { var card2 = el("div", "fd-field sc-stats"), rowsS = [["totalShots", "Shots"], ["shotsOnTarget", "On target"], ["wonCorners", "Corners"], ["foulsCommitted", "Fouls"], ["offsides", "Offsides"], ["saves", "Saves"], ["yellowCards", "Yellow cards"], ["redCards", "Red cards"]];
          var hd2 = el("div", "sc-sr sc-srh"); hd2.appendChild(el("b", null, abbr(g, SL))); hd2.appendChild(el("span", null, "Match stats")); hd2.appendChild(el("b", null, abbr(g, SR))); card2.appendChild(hd2);
          rowsS.forEach(function (r) { var a = stOf[SL][r[0]], h = stOf[SR][r[0]]; if (a == null || h == null) return; var x = el("div", "sc-sr"); x.appendChild(el("b", null, String(a))); x.appendChild(el("span", null, r[1])); x.appendChild(el("b", null, String(h))); card2.appendChild(x); });
          if (stOf.away.totalPasses != null && stOf.home.totalPasses != null && stOf.away.accuratePasses != null && stOf.home.accuratePasses != null) { var x2 = el("div", "sc-sr"); x2.appendChild(el("b", null, stOf[SL].accuratePasses + "/" + stOf[SL].totalPasses)); x2.appendChild(el("span", null, "Passes completed")); x2.appendChild(el("b", null, stOf[SR].accuratePasses + "/" + stOf[SR].totalPasses)); card2.appendChild(x2); }
          var aft = list.querySelector(".fd-dlrow") || fb; list.insertBefore(card2, aft.nextSibling); } }
      if (!fromKey && rows.length) { var kb = el("button", "fd-scf" + (keyOnly ? " on" : ""), "Key events"); kb.type = "button"; kb.setAttribute("aria-pressed", keyOnly ? "true" : "false");
        kb.addEventListener("click", function () { FD.scOnly = !FD.scOnly; fdKeepY(renderFeed); }); fb.insertBefore(kb, after.nextSibling); } }
    if (fb) fdLdHook(list, g, sum);  // 3.162.0: the Box score button (it took the Leaders button's place)
    body.appendChild(list);
    fdMoreRow(list, !keyOnly && total > shown, keyOnly);
    body.appendChild(el("p", "pv-at fd-at", over ? "Full time" : "Updates every few seconds while this page is open"));
    fdFzEnd();
    FD.seen = Object.assign(FD.seen || {}, seenNow);
    fdSettle(body, g, anchor, aTop, sc);
  }

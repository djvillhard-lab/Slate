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
  function scStatsOpen() { try { return localStorage.getItem("slate-feed-stats") === "1"; } catch (e) { return false; } }
  function scFeed(body, g, sum, anchor, aTop, sc) {
    var comp = ((sum.header || {}).competitions || [])[0] || {}, cst = comp.status || {}, st = cst.type || {}, sideOf = {}, nameOf = {}, scoreOf = {}, recOf = {}, penOf = {};
    (comp.competitors || []).forEach(function (k) { var t = k.team || {}, sd = k.homeAway === "home" ? "home" : "away"; sideOf[String(t.id || "")] = sd;
      [t.displayName, t.name, t.shortDisplayName, t.location].forEach(function (n) { if (n) nameOf[scNorm(n)] = sd; });
      scoreOf[sd] = k.score; recOf[sd] = ((k.record || [])[0] || {}).summary || ""; if (k.shootoutScore != null) penOf[sd] = Number(k.shootoutScore); });
    var sdOf = function (t) { return t ? sideOf[String(t.id || "")] || nameOf[scNorm(t.displayName || t.name)] || "" : ""; };
    var over = st.state === "post", pre = st.state === "pre", live = st.state === "in", per = Number(cst.period) || 0, det = String(st.shortDetail || st.detail || "");
    var ht = live && /^ht$|half.?time/i.test(det), ix = scIndex(sum), lg = g.league;
    // the score bar: badges, records, the score, then the half and the minute ("2H 67'"), HT at the break, FT when it's over
    var bug = el("div", "fd-bug");
    ["away", "mid", "home"].forEach(function (sd) {
      if (sd === "mid") { var mid = el("div", "fd-mid");
        if (ht) mid.appendChild(fdHT("b")); else { var ck = el("span", "fd-ck");
          if (live) ck.appendChild(el("i", null, per === 1 ? "1H" : per === 2 ? "2H" : per === 5 ? "Pens" : per > 2 ? "ET" : ""));
          ck.appendChild(el("b", null, over ? (det || "FT") : pre ? timeText(g.start) : per === 5 ? "" : (cst.displayClock || det || ""))); mid.appendChild(ck); }
        if (penOf.away != null && penOf.home != null && (over || per === 5)) mid.appendChild(el("i", "sc-pens", "Pens " + penOf.away + "–" + penOf.home));
        var mw = fdWatch(g, over); if (mw) mid.appendChild(mw);
        bug.appendChild(mid); return; }
      var tm = el("div", "fd-tm fd-tm-" + sd); tm.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      var nm = el("b", null, recOf[sd] || ""); nm.setAttribute("aria-label", short(g, sd) + (recOf[sd] ? ", " + recOf[sd] : "")); tm.appendChild(nm);
      var aS = Number(scoreOf.away), hS = Number(scoreOf.home);
      var scn = el("b", "fd-sc" + (over && (sd === "away" ? aS < hS : hS < aS) ? " trail" : ""), pre ? "–" : String(scoreOf[sd] != null ? scoreOf[sd] : "–"));
      if (sd === "away") { bug.appendChild(tm); bug.appendChild(scn); } else { bug.appendChild(scn); bug.appendChild(tm); }
    });
    body.appendChild(bug);
    var hdr = document.querySelector("#pane-r > header.top"); $("view-feed").style.setProperty("--fd-top", (hdr ? hdr.offsetHeight : 0) + "px");
    // who scored and who was sent off, each side under its own badge, from ESPN's match details; then possession as one row
    var top = el("div", "fd-field sc-top"), cols = { away: [], home: [] }, byP = {};
    (comp.details || []).forEach(function (d) { var sd = sdOf(d.team); if (!sd || !(d.scoringPlay || d.redCard)) return;
      var nm = scLast((((d.participants || [])[0] || {}).athlete || {}).displayName || ""), min = (d.clock || {}).displayValue || "", k = sd + "|" + (d.redCard ? "r" : "g") + "|" + nm;
      if (!nm) return; var e = byP[k]; if (!e) { e = byP[k] = { nm: nm, red: !!d.redCard, mins: [] }; cols[sd].push(e); }
      e.mins.push(min + (d.penaltyKick ? " pen" : "") + (d.ownGoal ? " og" : "")); });
    if (cols.away.length || cols.home.length) { var two = el("div", "sc-who");
      ["away", "home"].forEach(function (sd) { var c = el("div", "sc-whoc sc-who-" + sd); cols[sd].forEach(function (e) { var r = el("p", "sc-wl"); r.appendChild(el("span", "sc-wi", e.red ? "🟥" : "⚽")); r.appendChild(el("b", null, e.nm)); r.appendChild(el("i", null, e.mins.join(", "))); c.appendChild(r); }); two.appendChild(c); });
      top.appendChild(two); }
    var stOf = {}; ((sum.boxscore || {}).teams || []).forEach(function (t) { var sd = sdOf(t.team); if (!sd) return; stOf[sd] = {}; (t.statistics || []).forEach(function (s) { stOf[sd][s.name] = s.displayValue; }); });
    var hasStats = !pre && stOf.away && stOf.home, pa = hasStats ? parseFloat(stOf.away.possessionPct) : NaN, ph0 = hasStats ? parseFloat(stOf.home.possessionPct) : NaN;
    if (!isNaN(pa) && !isNaN(ph0) && pa + ph0 > 0) { var ap = Math.round(pa), hp = 100 - ap, wr = el("div", "fd-wp hp-wp1");
      wr.appendChild(el("p", "fd-wpl hp-wpl1", "Possession")); wr.appendChild(el("span", null, abbr(g, "away") + " " + ap + "%"));
      var bar = el("span", "fd-wpb"), ba = el("i"), bh = el("i"); ba.style.width = ap + "%"; ba.style.background = fdTint(g, "away"); bh.style.width = hp + "%"; bh.style.background = fdTint(g, "home"); bar.appendChild(ba); bar.appendChild(bh); wr.appendChild(bar);
      wr.appendChild(el("span", null, hp + "% " + abbr(g, "home"))); wr.setAttribute("aria-label", "Possession: " + abbr(g, "away") + " " + ap + " percent, " + abbr(g, "home") + " " + hp + " percent"); top.appendChild(wr); }
    if (top.firstChild) body.appendChild(top);
    // the events, oldest first, with the score as it stood after each one (from ESPN's own "Goal! A 1, B 0." line; counted when it isn't there)
    var evs = (sum.commentary || []).filter(function (c) { return c && (c.text || c.play); }), fromKey = false;
    if (!evs.some(function (c) { return c.play; }) && (sum.keyEvents || []).length) { fromKey = true; evs = (sum.keyEvents || []).map(function (k, i) { return { sequence: i, time: k.clock || {}, text: k.text || "", play: k }; }); }
    var run = { away: 0, home: 0 }, rows = [];
    evs.forEach(function (c, i) { var rd = scRead(c), p = c.play || {}, sd = sdOf(p.team), pid = String(p.id || "c" + (c.sequence != null ? c.sequence : i));
      if (rd.goal) { var m = /Goal!\s+(.+?) (\d+), (.+?) (\d+)\./.exec(rd.tx), s1 = m ? nameOf[scNorm(m[1])] : "", s2 = m ? nameOf[scNorm(m[3])] : "";
        if (s1 && s2 && s1 !== s2) { run[s1] = +m[2]; run[s2] = +m[4]; } else if (sd) { var to = /own goal/i.test(rd.ty) && !m ? (sd === "away" ? "home" : "away") : sd; run[to]++; } }
      rows.push({ c: c, rd: rd, sd: sd, pid: pid, a: run.away, h: run.home, min: (c.time || {}).displayValue || ((p.clock || {}).displayValue) || "" }); });
    var keyOnly = !!FD.scOnly && !fromKey, list = el("div", "fd-list"), cap = keyOnly ? 1e9 : 14 * (1 + (+FD.more || 0)), shown = 0, total = 0, fresh = FD.seen || null, seenNow = {};
    var plRow = function (nm, sd, role) { var P = ix[scNorm(nm)] || { name: nm, jer: "", st: {} }, psd = sideOf[P.tid] || sd || "away", row = el("div", "fd-pl"); row.appendChild(fdJerseyOnly(g, psd, P));
      var w = el("span", "fd-pn"); w.appendChild(el("b", null, fdShort({ name: nm }))); if (role) w.appendChild(el("em", "fd-pos", role)); var ln = role === "on" || role === "off" ? "" : scLine(P); if (ln) w.appendChild(el("i", null, ln)); row.appendChild(w); return row; };
    for (var i = rows.length - 1; i >= 0; i--) {
      var R = rows[i], rd = R.rd; seenNow[R.pid] = 1;
      if (keyOnly && !rd.key) continue;
      var isNew = !!(fresh && !fresh[R.pid]);
      if (rd.note) { if (shown < cap) list.appendChild(el("p", "fd-note" + (isNew ? " fd-new" : ""), rd.title)); continue; }
      total++; if (shown >= cap) continue; shown++;
      var card = el("div", "fd-play sc-play" + (rd.kind ? " fd-k-" + rd.kind : "") + (isNew ? " fd-new" : "")); card.setAttribute("data-id", R.pid);
      if (R.sd && rd.kind !== "to" && rd.kind !== "yc") card.style.setProperty("--fd-team", fdTint(g, R.sd));
      var ph = el("div", "fd-ph"); ph.appendChild(el("span", null, R.min + (R.sd ? (R.min ? " · " : "") + abbr(g, R.sd) : "")));
      ph.appendChild(el("span", "fd-psc", abbr(g, "away") + " " + R.a + "  " + abbr(g, "home") + " " + R.h)); card.appendChild(ph);
      card.appendChild(el("p", "fd-pt", (rd.emoji ? rd.emoji + " " : "") + rd.title));
      var tx = rd.tx.replace(/^Goal!\s+.+? \d+, .+? \d+\.\s*/, "").replace(/^Attempt (saved|missed|blocked)\.\s*/i, "").replace(/^Substitution, [^.]+\.\s*/i, "");
      if (tx && tx !== rd.title && !fromKey && !(rd.sub && rd.names.length > 1))  /* a key-events-only match has no sentence, just "X Goal at 72'" */ card.appendChild(el("p", "fd-px", tx));
      rd.names.slice(0, 2).forEach(function (nm, j) { if (j && !rd.roles[j]) return; card.appendChild(plRow(nm, rd.roles[j] === "own goal" ? "" : R.sd, rd.roles[j] || "")); });
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
          var hd2 = el("div", "sc-sr sc-srh"); hd2.appendChild(el("b", null, abbr(g, "away"))); hd2.appendChild(el("span", null, "Match stats")); hd2.appendChild(el("b", null, abbr(g, "home"))); card2.appendChild(hd2);
          rowsS.forEach(function (r) { var a = stOf.away[r[0]], h = stOf.home[r[0]]; if (a == null || h == null) return; var x = el("div", "sc-sr"); x.appendChild(el("b", null, String(a))); x.appendChild(el("span", null, r[1])); x.appendChild(el("b", null, String(h))); card2.appendChild(x); });
          if (stOf.away.totalPasses != null && stOf.home.totalPasses != null && stOf.away.accuratePasses != null && stOf.home.accuratePasses != null) { var x2 = el("div", "sc-sr"); x2.appendChild(el("b", null, stOf.away.accuratePasses + "/" + stOf.away.totalPasses)); x2.appendChild(el("span", null, "Passes completed")); x2.appendChild(el("b", null, stOf.home.accuratePasses + "/" + stOf.home.totalPasses)); card2.appendChild(x2); }
          var aft = list.querySelector(".fd-dlrow") || fb; list.insertBefore(card2, aft.nextSibling); } }
      if (!fromKey && rows.length) { var kb = el("button", "fd-scf" + (keyOnly ? " on" : ""), "Key events"); kb.type = "button"; kb.setAttribute("aria-pressed", keyOnly ? "true" : "false");
        kb.addEventListener("click", function () { FD.scOnly = !FD.scOnly; fdKeepY(renderFeed); }); fb.insertBefore(kb, after.nextSibling); } }
    body.appendChild(list);
    fdMoreRow(list, !keyOnly && total > shown, keyOnly);
    var bxw = null; try { bxw = feedBox(g, sum); } catch (e) { bxw = null; } if (bxw) body.appendChild(bxw);
    body.appendChild(el("p", "pv-at fd-at", over ? "Full time" : "Updates every few seconds while this page is open"));
    FD.seen = Object.assign(FD.seen || {}, seenNow);
    fdSettle(body, g, anchor, aTop, sc);
  }

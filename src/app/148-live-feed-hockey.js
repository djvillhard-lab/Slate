  // ---------- Live feed: hockey (3.88.0, DJ: "Work on setting up live feeds for hockey games") ----------
  // The same page as the other sports: the score bar, the goals so far, shots on goal as one bar, team stats behind a button, and the plays
  // newest first from ESPN's game summary. Goals carry the scorer, the assists and "power play" or "shorthanded" when ESPN marks the play
  // that way; penalties carry the call and the minutes. Faceoffs and whistles are left out (over a hundred a game, like basketball's subs).
  function hkIndex(sum) {
    var ix = {};
    ((sum.boxscore || {}).players || []).forEach(function (t) { var tid = String((t.team || {}).id || "");
      (t.statistics || []).forEach(function (gr) { var keys = gr.keys || [];
        (gr.athletes || []).forEach(function (r) { var a = r.athlete || {}, id = String(a.id || ""); if (!id) return;
          var v = {}; keys.forEach(function (k, i) { v[k] = (r.stats || [])[i]; });
          ix[id] = { id: id, name: a.displayName || "", jer: a.jersey || "", tid: tid, pos: (a.position || {}).abbreviation || "", st: v, goalie: /goal/i.test(gr.name || "") }; }); }); });
    return ix;
  }
  function hkLine(P) {
    var s = P.st || {}, o = [], n = function (k) { return parseInt(s[k], 10) || 0; };
    if (P.goalie) { if (s.saves != null) o.push(n("saves") + (n("saves") === 1 ? " save" : " saves")); if (s.shotsAgainst != null) o.push(n("shotsAgainst") + " shots faced"); return o.join(" · "); }
    if (n("goals")) o.push(n("goals") + (n("goals") === 1 ? " goal" : " goals"));
    if (n("assists")) o.push(n("assists") + (n("assists") === 1 ? " assist" : " assists"));
    if (n("shotsTotal")) o.push(n("shotsTotal") + (n("shotsTotal") === 1 ? " shot" : " shots"));
    if (n("penaltyMinutes")) o.push(n("penaltyMinutes") + " PIM");
    return o.join(" · ");
  }
  // ESPN's play clock counts up from the start of the period; the score bar counts down. Shown as time left so the two agree:
  // 20-minute periods, and a 5-minute overtime in the regular season (20 in the playoffs).
  function hkLeft(ck, per, playoffs) {
    var m = /^(\d+):(\d{2})$/.exec(String(ck || "")); if (!m || per > 4 && !playoffs) return String(ck || "");
    var len = (per <= 3 || playoffs ? 20 : 5) * 60, left = len - (+m[1] * 60 + +m[2]); if (left < 0) return String(ck || "");
    return Math.floor(left / 60) + ":" + ("0" + (left % 60)).slice(-2);
  }
  function hkPer(n) { return n === 4 ? "OT" : n > 4 ? "SO" : n ? ordN(n) : ""; }
  function hkRead(pl) {
    var ty = String((pl.type || {}).text || ""), tx = String(pl.text || "").replace(/\s+/g, " ").trim(), ps = pl.participants || [], nm = function (i) { return ((ps[i] || {}).athlete || {}).displayName || ""; };
    var last = function (i) { var w = nm(i).split(" "); return w.length > 1 ? w.slice(1).join(" ") : w[0] || ""; }, str = String((pl.strength || {}).text || "");
    var o = { ty: ty, tx: tx, kind: "", title: ty, emoji: "", key: false, note: false, skip: false, rows: [], tags: [] };
    if (/^(period start|period end|end of game|end of period|shootout (start|end)|game end)/i.test(ty)) { o.note = true; o.title = tx || ty; o.key = /end/i.test(ty); return o; }
    if (/^(face ?off|stoppage)$/i.test(ty)) { o.skip = true; return o; }
    if (pl.scoringPlay || /^goal$/i.test(ty)) { o.kind = "score"; o.emoji = "🚨"; o.key = true; o.goal = true;
      var g0 = ps[0] || {}; o.title = "Goal, " + (last(0) || "") + (g0.ytdGoals != null ? " (" + g0.ytdGoals + ")" : "");
      if (/power play/i.test(str)) o.tags.push("Power play goal"); else if (/short/i.test(str)) o.tags.push("Shorthanded goal");
      if (/empty net/i.test(tx)) o.tags.push("Empty net");
      ps.forEach(function (p, i) { if (i < 3 && (p.athlete || {}).id) o.rows.push({ id: String(p.athlete.id), name: nm(i), role: i ? "assist" : "goal" }); }); return o; }
    if ((pl.type || {}).penaltyMinutes != null || (pl.type || {}).penaltyType) { o.kind = "turn"; o.emoji = "⛔"; o.key = true; o.pen = true;
      var mins = String((pl.type || {}).penaltyMinutes || ""); o.title = "Penalty: " + ty + (mins ? ", " + mins + " min" : "") + ((pl.type || {}).penaltyType && !/minor/i.test(pl.type.penaltyType) ? " (" + String(pl.type.penaltyType).toLowerCase() + ")" : "");
      if ((ps[0] || {}).athlete && ps[0].athlete.id) o.rows.push({ id: String(ps[0].athlete.id), name: nm(0), role: "penalty" }); return o; }
    if (/^shot$/i.test(ty)) { o.kind = "miss"; o.emoji = "🧤"; o.title = "Shot saved" + (last(0) ? ", " + last(0) : ""); return o; }
    if (/^missed$/i.test(ty)) { o.kind = "miss"; o.emoji = "❌"; o.title = "Shot wide" + (last(0) ? ", " + last(0) : ""); return o; }
    if (/^blocked$/i.test(ty)) { o.kind = "miss"; o.emoji = "🚫"; var di = -1; ps.forEach(function (p, i) { if (p.type === "defender") di = i; });  // ESPN files a block under the blocker's team
      o.title = di >= 0 && last(di) ? "Blocked shot, " + last(di) : "Shot blocked" + (last(0) ? ", " + last(0) : ""); return o; }
    if (/^hit$/i.test(ty)) { o.kind = "foul"; o.emoji = "💥"; o.title = "Hit" + (last(0) ? ", " + last(0) : ""); return o; }
    if (/^giveaway$/i.test(ty)) { o.kind = "foul"; o.emoji = "↩️"; o.title = "Giveaway" + (last(0) ? ", " + last(0) : ""); o.tx = ""; return o; }
    if (/^takeaway$/i.test(ty)) { o.kind = "foul"; o.emoji = "🖐️"; o.title = "Takeaway" + (last(0) ? ", " + last(0) : ""); o.tx = ""; return o; }
    o.kind = "foul"; return o;
  }
  function hkFeed(body, g, sum, anchor, aTop, sc) {
    var comp = ((sum.header || {}).competitions || [])[0] || {}, cst = comp.status || {}, st = cst.type || {}, sideOf = {}, scoreOf = {}, recOf = {};
    (comp.competitors || []).forEach(function (k) { var sd = k.homeAway === "home" ? "home" : "away"; sideOf[String((k.team || {}).id || "")] = sd; scoreOf[sd] = k.score; recOf[sd] = ((k.record || [])[0] || {}).summary || ""; });
    var over = st.state === "post", pre = st.state === "pre", live = st.state === "in", per = Number(cst.period) || 0, det = String(st.shortDetail || st.detail || "");
    var playoffs = Number((((sum.header || {}).season) || {}).type) === 3, ix = hkIndex(sum), brk = live && /^end|intermission/i.test(det);
    var plays = (sum.plays || []).filter(function (p) { return p && (p.id || p.sequenceNumber); });
    // the score bar; the score waits for its goal to be in the feed, the same hold as the other sports
    var shown0 = fdSumScore(g.id, sum); if (shown0) { scoreOf.away = shown0.a; scoreOf.home = shown0.h; }
    var bug = el("div", "fd-bug"), aS = Number(scoreOf.away), hS = Number(scoreOf.home);
    ["away", "mid", "home"].forEach(function (sd) {
      if (sd === "mid") { var mid = el("div", "fd-mid"), ck = el("span", "fd-ck");
        if (live && !brk && per) ck.appendChild(el("i", null, hkPer(per)));
        ck.appendChild(el("b", null, over ? (det || "Final") : pre ? timeText(g.start) : brk ? det.replace(/^end of /i, "End ") : per > 4 ? "Shootout" : (cst.displayClock || det || ""))); mid.appendChild(ck);
        var mw = fdWatch(g, over); if (mw) mid.appendChild(mw); bug.appendChild(mid); return; }
      var tm = el("div", "fd-tm fd-tm-" + sd); tm.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      var nm = el("b", null, recOf[sd] || ""); nm.setAttribute("aria-label", short(g, sd) + (recOf[sd] ? ", " + recOf[sd] : "")); tm.appendChild(nm);
      var scn = el("b", "fd-sc" + (over && (sd === "away" ? aS < hS : hS < aS) ? " trail" : ""), pre ? "–" : String(scoreOf[sd] != null ? scoreOf[sd] : "–"));
      if (sd === "away") { bug.appendChild(tm); bug.appendChild(scn); } else { bug.appendChild(scn); bug.appendChild(tm); }
    });
    body.appendChild(bug);
    var hdr = document.querySelector("#pane-r > header.top"); $("view-feed").style.setProperty("--fd-top", (hdr ? hdr.offsetHeight : 0) + "px");
    var tmOf = function (pl) { return sideOf[String((pl.team || {}).id || "")] || ""; };
    var when = function (pl) { var n = Number((pl.period || {}).number) || 0; return (n ? hkPer(n) + " " : "") + (n > 4 && !playoffs ? "" : hkLeft((pl.clock || {}).displayValue, n, playoffs)); };
    // the goals so far, each side under its own badge, then shots on goal as one bar
    var top = el("div", "fd-field sc-top"), cols = { away: [], home: [] };
    plays.forEach(function (pl) { if (!pl.scoringPlay) return; var sd = tmOf(pl), a = ((pl.participants || [])[0] || {}).athlete || {}; if (!sd || !a.displayName) return; var w = a.displayName.split(" "); cols[sd].push({ nm: w.length > 1 ? w.slice(1).join(" ") : w[0], at: when(pl).trim() }); });
    if (cols.away.length || cols.home.length) { var two = el("div", "sc-who");
      ["away", "home"].forEach(function (sd) { var c = el("div", "sc-whoc sc-who-" + sd); cols[sd].forEach(function (e) { var r = el("p", "sc-wl"); r.appendChild(el("span", "sc-wi", "🚨")); r.appendChild(el("b", null, e.nm)); r.appendChild(el("i", null, e.at)); c.appendChild(r); }); two.appendChild(c); });
      top.appendChild(two); }
    var stOf = {}; ((sum.boxscore || {}).teams || []).forEach(function (t) { var sd = sideOf[String((t.team || {}).id || "")]; if (!sd) return; stOf[sd] = {}; (t.statistics || []).forEach(function (s) { stOf[sd][s.name] = s.displayValue; }); });
    var hasStats = !pre && stOf.away && stOf.home, sa = hasStats ? parseInt(stOf.away.shotsTotal, 10) : NaN, sh = hasStats ? parseInt(stOf.home.shotsTotal, 10) : NaN;
    if (!isNaN(sa) && !isNaN(sh) && sa + sh > 0) { var wr = el("div", "fd-wp hp-wp1");
      wr.appendChild(el("p", "fd-wpl hp-wpl1", "Shots on goal")); wr.appendChild(el("span", null, abbr(g, "away") + " " + sa));
      var bar = el("span", "fd-wpb"), ba = el("i"), bh = el("i"); ba.style.width = (sa / (sa + sh) * 100) + "%"; ba.style.background = fdTint(g, "away"); bh.style.width = (sh / (sa + sh) * 100) + "%"; bh.style.background = fdTint(g, "home"); bar.appendChild(ba); bar.appendChild(bh); wr.appendChild(bar);
      wr.appendChild(el("span", null, sh + " " + abbr(g, "home"))); wr.setAttribute("aria-label", "Shots on goal: " + abbr(g, "away") + " " + sa + ", " + abbr(g, "home") + " " + sh); top.appendChild(wr); }
    if (top.firstChild) body.appendChild(top);
    // the plays, newest first
    var keyOnly = !!FD.scOnly, list = el("div", "fd-list"), cap = keyOnly ? 1e9 : 14 * (1 + (+FD.more || 0)), shown = 0, total = 0, fresh = FD.seen || null, seenNow = {};
    for (var i = plays.length - 1; i >= 0; i--) {
      var pl = plays[i], rd = hkRead(pl), pid = hpPid(pl); seenNow[pid] = 1;
      if (rd.skip || (keyOnly && !rd.key)) continue;
      var isNew = !!(fresh && !fresh[pid]);
      if (rd.note) { if (shown < cap) list.appendChild(el("p", "fd-note" + (isNew ? " fd-new" : ""), rd.title)); continue; }
      total++; if (shown >= cap) continue; shown++;
      var sd = tmOf(pl), card = el("div", "fd-play sc-play" + (rd.kind ? " fd-k-" + rd.kind : "") + (isNew ? " fd-new" : "")); card.setAttribute("data-id", pid);
      if (sd) card.style.setProperty("--fd-team", fdTint(g, sd));
      var ph = el("div", "fd-ph"); ph.appendChild(el("span", null, when(pl).trim() + (sd ? " · " + abbr(g, sd) : "")));
      if (pl.awayScore != null && pl.homeScore != null) ph.appendChild(el("span", "fd-psc", abbr(g, "away") + " " + pl.awayScore + "  " + abbr(g, "home") + " " + pl.homeScore)); card.appendChild(ph);
      if (rd.tags.length) { var tw = el("div", "fd-tags"); rd.tags.forEach(function (t) { tw.appendChild(el("span", "fd-tag", t)); }); card.appendChild(tw); }
      card.appendChild(el("p", "fd-pt", (rd.emoji ? rd.emoji + " " : "") + rd.title));
      if (rd.tx && rd.tx !== rd.title) card.appendChild(el("p", "fd-px", rd.tx));
      rd.rows.forEach(function (r) { var P = ix[r.id] || { id: r.id, name: r.name, jer: "", st: {} }, psd = sideOf[P.tid] || sd || "away", row = el("div", "fd-pl"); row.appendChild(fdFace(g, psd, P, fdJerseyOnly(g, psd, P)));
        var w = el("span", "fd-pn"); w.appendChild(el("b", null, fdShort({ name: r.name }))); w.appendChild(el("em", "fd-pos", r.role)); var ln = hkLine(P); if (ln) w.appendChild(el("i", null, ln)); row.appendChild(w); card.appendChild(row); });
      list.appendChild(card);
    }
    if (!plays.length) list.appendChild(el("p", "pv-none", pre ? "Goals, penalties and shots show up here once the puck drops." : "No plays yet."));
    if (live) fdAgo(list, sum, true, g);
    var fb = list.querySelector(".fd-bar"); if (!fb && plays.length) { fb = el("div", "fd-bar"); fb.appendChild(el("p", "fd-ago", "")); list.insertBefore(fb, list.firstChild); }
    if (fb) { var after = fb.querySelector(".fd-ago");
      if (hasStats) { var on = scStatsOpen(), sb = el("button", "fd-scf fd-ldb" + (on ? " on" : ""), "Stats"); sb.type = "button"; sb.setAttribute("aria-expanded", on ? "true" : "false");
        sb.addEventListener("click", function () { try { localStorage.setItem("slate-feed-stats", on ? "0" : "1"); } catch (e) {} fdKeepY(renderFeed); });
        fb.insertBefore(sb, after.nextSibling); after = sb;
        if (on) { var c2 = el("div", "fd-field sc-stats"), add = function (a, lab, h) { if (a == null || h == null) return; var x = el("div", "sc-sr"); x.appendChild(el("b", null, String(a))); x.appendChild(el("span", null, lab)); x.appendChild(el("b", null, String(h))); c2.appendChild(x); };
          var hd2 = el("div", "sc-sr sc-srh"); hd2.appendChild(el("b", null, abbr(g, "away"))); hd2.appendChild(el("span", null, "Team stats")); hd2.appendChild(el("b", null, abbr(g, "home"))); c2.appendChild(hd2);
          var A = stOf.away, H = stOf.home; add(A.shotsTotal, "Shots on goal", H.shotsTotal);
          if (A.powerPlayGoals != null && A.powerPlayOpportunities != null && H.powerPlayGoals != null && H.powerPlayOpportunities != null) add(A.powerPlayGoals + "/" + A.powerPlayOpportunities, "Power play", H.powerPlayGoals + "/" + H.powerPlayOpportunities);
          add(A.faceoffsWon, "Faceoffs won", H.faceoffsWon); add(A.hits, "Hits", H.hits); add(A.blockedShots, "Blocked shots", H.blockedShots); add(A.giveaways, "Giveaways", H.giveaways); add(A.takeaways, "Takeaways", H.takeaways); add(A.penaltyMinutes, "Penalty minutes", H.penaltyMinutes);
          var aft = list.querySelector(".fd-dlrow") || fb; list.insertBefore(c2, aft.nextSibling); } }
      if (plays.length) { var kb = el("button", "fd-scf" + (keyOnly ? " on" : ""), "Goals & penalties"); kb.type = "button"; kb.setAttribute("aria-pressed", keyOnly ? "true" : "false");
        kb.addEventListener("click", function () { FD.scOnly = !FD.scOnly; fdKeepY(renderFeed); }); fb.insertBefore(kb, after.nextSibling); } }
    body.appendChild(list);
    fdMoreRow(list, !keyOnly && total > shown, keyOnly);
    var bxw = null; try { bxw = feedBox(g, sum); } catch (e) { bxw = null; } if (bxw) body.appendChild(bxw);
    body.appendChild(el("p", "pv-at fd-at", over ? "Final" : "Updates every few seconds while this page is open"));
    FD.seen = Object.assign(FD.seen || {}, seenNow);
    fdSettle(body, g, anchor, aTop, sc);
  }

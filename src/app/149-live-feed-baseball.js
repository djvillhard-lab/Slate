  // ---------- Live feed: baseball (competitor review, recommendation 12; DJ's go-ahead Nov 18, 2026) ----------
  // The same page as the other sports: the score bar, the line score (runs by inning, then R H E), what's happening now while the game
  // is live (count, outs, who is on base, batter and pitcher), team stats behind a button, and the plays newest first from ESPN's game
  // summary. One box per at-bat: the result, ESPN's sentence, how many pitches it took and the last pitch, with the batter and the
  // pitcher underneath. Stolen bases, pitching changes and pinch hitters get their own small boxes. Every number is ESPN's: the count,
  // outs and runners come from the newest play, the pitch type and speed from the pitch itself. Nothing is worked out or guessed.
  // Built against a finished 2026 game (MIL at TB, Oct 28, 2026) because there are no live games until spring training.
  function bbIndex(sum) {
    var ix = {};
    ((sum.boxscore || {}).players || []).forEach(function (t) { var tid = String((t.team || {}).id || "");
      (t.statistics || []).forEach(function (gr) { var keys = gr.keys || [], pit = /pitch/i.test(gr.type || gr.name || "");
        (gr.athletes || []).forEach(function (r) { var a = r.athlete || {}, id = String(a.id || ""); if (!id) return;
          var v = {}; keys.forEach(function (k, i) { v[k] = (r.stats || [])[i]; });
          var P = ix[id] || (ix[id] = { id: id, name: a.displayName || "", jer: a.jersey || "", tid: tid, pos: (a.position || {}).abbreviation || "", st: {}, bat: null, pit: null });
          if (pit) P.pit = v; else P.bat = v; }); }); });
    return ix;
  }
  // a batter's game so far ("2-4, 1 RBI"), or a pitcher's ("5.1 IP, 6 K, 86 pitches")
  function bbLine(P, asPitcher) {
    var o = [], n = function (s, k) { return parseInt(s[k], 10) || 0; };
    if (asPitcher) { var p = P.pit; if (!p) return "";
      if (p["fullInnings.partInnings"] != null) o.push(p["fullInnings.partInnings"] + " IP");
      if (p.strikeouts != null) o.push(n(p, "strikeouts") + " K");
      if (n(p, "earnedRuns")) o.push(n(p, "earnedRuns") + " ER");
      if (n(p, "pitches")) o.push(n(p, "pitches") + " pitches");
      return o.join(", "); }
    var b = P.bat; if (!b) return "";
    if (b["hits-atBats"]) o.push(b["hits-atBats"]);
    if (n(b, "homeRuns")) o.push(n(b, "homeRuns") === 1 ? "HR" : n(b, "homeRuns") + " HR");
    if (n(b, "RBIs")) o.push(n(b, "RBIs") + " RBI");
    if (n(b, "runs")) o.push(n(b, "runs") + (n(b, "runs") === 1 ? " run" : " runs"));
    if (n(b, "walks")) o.push(n(b, "walks") + " BB");
    return o.join(", ");
  }
  function bbHalf(pl) { var t = String((pl.period || {}).type || ""), n = Number((pl.period || {}).number) || 0; return (/^top/i.test(t) ? "▲ " : /^bot/i.test(t) ? "▼ " : "") + (n ? ordN(n) : ""); }
  function bbWho(pl, type) { var id = ""; (pl.participants || []).forEach(function (p) { if (p.type === type && p.athlete && p.athlete.id) id = String(p.athlete.id); }); return id; }
  // how an at-bat ended, from ESPN's type for the last pitch and its sentence
  function bbResult(pl) {
    var ty = String((pl.alternativeType || pl.type || {}).text || ""), tx = String(pl.text || "").replace(/\s+/g, " ").trim(), runs = Number(pl.scoreValue) || 0;
    var who = (/^(.+?) (struck|grounded|flied|lined|popped|fouled|singled|doubled|tripled|homered|walked|hit|reached|safe|bunt|sacrificed|intentionally|was|out|called)/.exec(tx) || [])[1] || "";
    var o = { kind: "", emoji: "", title: ty, tx: tx, key: !!pl.scoringPlay, tags: [] }, t = function (s) { o.title = s + (who ? ", " + who : ""); };
    if (/home run/i.test(ty) || /homered/i.test(tx)) { o.kind = "score"; o.emoji = "💥"; t(/grand slam/i.test(ty + tx) ? "Grand slam" : "Home run"); o.key = true; }
    else if (/^triple$/i.test(ty)) { o.emoji = "🔥"; t("Triple"); }
    else if (/^double$/i.test(ty)) { o.emoji = "✌️"; t("Double"); }
    else if (/^single$/i.test(ty) || /^bunt single/i.test(ty)) { o.emoji = "⚾"; t("Single"); }
    else if (/^strike/i.test(ty) || /struck out/i.test(tx)) { o.kind = "miss"; o.emoji = "🌀"; t(/looking/i.test(ty + tx) ? "Strikeout looking" : /swinging/i.test(ty + tx) ? "Strikeout swinging" : "Strikeout"); }
    else if (/^(ball|walk|intentional)/i.test(ty) || /walked/i.test(tx)) { o.emoji = "🚶"; t(/intentional/i.test(ty + tx) ? "Intentional walk" : "Walk"); }
    else if (/hit by pitch/i.test(ty)) { o.emoji = "🤕"; t("Hit by pitch"); }
    else if (/double play|triple play/i.test(ty + " " + tx)) { o.kind = "miss"; o.emoji = "✂️"; t(/triple play/i.test(ty + tx) ? "Triple play" : "Double play"); }
    else if (/sacrifice fly/i.test(ty)) { o.emoji = "🪽"; t("Sacrifice fly"); }
    else if (/sacrifice|sac bunt/i.test(ty)) { o.emoji = "🤝"; t("Sacrifice bunt"); }
    else if (/error/i.test(ty)) { o.emoji = "🫣"; t("Reached on an error"); }
    else if (/fielder'?s choice/i.test(ty)) { o.emoji = "🔀"; t("Fielder's choice"); }
    else if (/ground out/i.test(ty)) { o.kind = "miss"; o.emoji = "⬇️"; t("Groundout"); }
    else if (/fly out/i.test(ty)) { o.kind = "miss"; o.emoji = "⬆️"; t("Flyout"); }
    else if (/line out/i.test(ty)) { o.kind = "miss"; o.emoji = "➡️"; t("Lineout"); }
    else if (/pop out/i.test(ty)) { o.kind = "miss"; o.emoji = "⤴️"; t("Popout"); }
    else if (/foul out/i.test(ty)) { o.kind = "miss"; o.emoji = "⤴️"; t("Foul out"); }
    else if (/out/i.test(ty)) { o.kind = "miss"; o.emoji = "⚾"; t(ty); }
    else { o.emoji = "⚾"; t(ty || "Play"); }
    if (pl.scoringPlay) { o.kind = "score"; o.tags.push(runs > 1 ? runs + " runs score" : "Run scores"); }
    return o;
  }
  // the things that happen between or during at-bats: a steal, a new pitcher, a pinch hitter
  function bbEvent(pl) {
    var ty = String((pl.alternativeType || pl.type || {}).text || ""), tx = String(pl.text || "").replace(/\s+/g, " ").trim().replace(/\.$/, ""), o = { kind: "foul", emoji: "⚾", title: tx, tx: "", key: !!pl.scoringPlay, tags: [], skip: false };
    var m;
    if ((m = /^(.+?) relieved (.+)$/i.exec(tx))) { o.emoji = "🔁"; o.title = "Pitching change, " + m[1]; o.tx = m[1] + " replaces " + m[2]; }
    else if ((m = /^(.+?) (hit|ran) for (.+)$/i.exec(tx))) { o.emoji = "🔁"; o.title = (/hit/i.test(m[2]) ? "Pinch hitter, " : "Pinch runner, ") + m[1]; o.tx = m[1] + (/hit/i.test(m[2]) ? " bats for " : " runs for ") + m[3]; }
    else if (/^(.+?) (at|in|as|catching|pitching)\b/i.test(tx) && /lineup change/i.test(ty)) o.skip = true;  // a fielder moving to a new spot: left out, like basketball's subs
    else if (/stole|stolen/i.test(ty + tx)) { o.kind = ""; o.emoji = "💨"; o.title = "Stolen base"; o.tx = tx; }
    else if (/caught stealing|picked off|pickoff/i.test(ty + tx)) { o.kind = "miss"; o.emoji = "🚫"; o.title = /caught/i.test(ty + tx) ? "Caught stealing" : "Picked off"; o.tx = tx; }
    else if (/wild pitch/i.test(ty + tx)) { o.emoji = "🎯"; o.title = "Wild pitch"; o.tx = tx; }
    else if (/passed ball/i.test(ty + tx)) { o.emoji = "🧤"; o.title = "Passed ball"; o.tx = tx; }
    else if (/balk/i.test(ty + tx)) { o.emoji = "⚠️"; o.title = "Balk"; o.tx = tx; }
    else if (/challenge|review|overturned|upheld/i.test(ty + tx)) { o.emoji = "📺"; o.title = "Replay review"; o.tx = tx; }
    else if (/eject/i.test(ty + tx)) { o.emoji = "🟥"; o.title = "Ejection"; o.tx = tx; }
    else if (/mound visit|delay|injur/i.test(ty + tx)) { o.emoji = "⏸️"; o.title = /mound/i.test(ty + tx) ? "Mound visit" : "Play stopped"; o.tx = tx; }
    if (pl.scoringPlay) { o.kind = "score"; o.tags.push((Number(pl.scoreValue) || 0) > 1 ? pl.scoreValue + " runs score" : "Run scores"); }
    return o;
  }
  function bbPitchWord(p) { var t = String((p.type || {}).text || ""); return /overturned/i.test(t) ? "call overturned" : /looking/i.test(t) ? "called strike" : /swinging/i.test(t) ? "swinging strike" : /^foul|bunted foul/i.test(t) ? "foul" : /^ball$/i.test(t) ? "ball" : /hit by pitch/i.test(t) ? "hit the batter" : "in play"; }
  // "5 pitches · 2-2 count · last pitch 89 mph Changeup"
  function bbPitchLine(pitches, live) {
    if (!pitches.length) return "";
    var lp = pitches[pitches.length - 1], o = [pitches.length + (pitches.length === 1 ? " pitch" : " pitches")], pc = lp.pitchCount;
    if (!live && pc && pc.balls != null && pitches.length > 1) o.push(pc.balls + "-" + pc.strikes + " count");
    var v = lp.pitchVelocity, pt = (lp.pitchType || {}).text;
    if (v || pt) o.push((live ? "last: " : "last pitch ") + (v ? v + " mph" : "") + (v && pt ? " " : "") + (pt || "") + (live ? ", " + bbPitchWord(lp) : ""));
    return o.join(" · ");
  }
  function bbFeed(body, g, sum, anchor, aTop, sc) {
    var comp = ((sum.header || {}).competitions || [])[0] || {}, cst = comp.status || {}, st = cst.type || {}, sideOf = {}, scoreOf = {}, recOf = {}, lineOf = {}, heOf = {};
    (comp.competitors || []).forEach(function (k) { var sd = k.homeAway === "home" ? "home" : "away"; sideOf[String((k.team || {}).id || "")] = sd; scoreOf[sd] = k.score; recOf[sd] = ((k.record || [])[0] || {}).summary || "";
      lineOf[sd] = (k.linescores || []).map(function (l) { return l && l.displayValue != null ? String(l.displayValue) : ""; }); heOf[sd] = { h: k.hits, e: k.errors }; });
    var over = st.state === "post", pre = st.state === "pre", live = st.state === "in", det = String(st.shortDetail || st.detail || ""), ix = bbIndex(sum);
    var plays = (sum.plays || []).filter(function (p) { return p && (p.id || p.sequenceNumber); }), lastPl = plays[plays.length - 1] || null;
    var shown0 = fdSumScore(g.id, sum); if (shown0) { scoreOf.away = shown0.a; scoreOf.home = shown0.h; }
    // the score bar: the half inning in the middle ("▲ 7th"), with the outs under it while the game is live
    var bug = el("div", "fd-bug"), aS = Number(scoreOf.away), hS = Number(scoreOf.home), mid2 = live && lastPl && /^(mid|end)/i.test(String((lastPl.period || {}).type || ""));
    ["away", "mid", "home"].forEach(function (sd) {
      if (sd === "mid") { var mid = el("div", "fd-mid"), ck = el("span", "fd-ck");
        ck.appendChild(el("b", null, over ? (det || "Final") : pre ? timeText(g.start) : live && lastPl && !mid2 ? bbHalf(lastPl) : (det || "")));
        mid.appendChild(ck);
        var mw = fdWatch(g, over); if (mw) mid.appendChild(mw); bug.appendChild(mid); return; }
      var tm = el("div", "fd-tm fd-tm-" + sd); tm.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      var nm = el("b", null, recOf[sd] || ""); nm.setAttribute("aria-label", short(g, sd) + (recOf[sd] ? ", " + recOf[sd] : "")); tm.appendChild(nm);
      var scn = el("b", "fd-sc" + (over && (sd === "away" ? aS < hS : hS < aS) ? " trail" : ""), pre ? "–" : String(scoreOf[sd] != null ? scoreOf[sd] : "–"));
      if (sd === "away") { bug.appendChild(tm); bug.appendChild(scn); } else { bug.appendChild(scn); bug.appendChild(tm); }
    });
    body.appendChild(bug);
    var hdr = document.querySelector("#pane-r > header.top"); $("view-feed").style.setProperty("--fd-top", (hdr ? hdr.offsetHeight : 0) + "px");
    var top = el("div", "fd-field sc-top bb-top");
    // now batting, while the game is live: the count, the outs, the bases, the batter and the pitcher, all from the newest play
    if (live && lastPl && !mid2 && lastPl.outs != null && Number(lastPl.outs) < 3) {
      var rc = lastPl.resultCount || lastPl.pitchCount || {}, done0 = /play result|end batter/i.test(String((lastPl.type || {}).text || "")), now = el("div", "bb-now");
      var dia = el("span", "bb-dia"); ["onSecond", "onThird", "onFirst"].forEach(function (b) { dia.appendChild(el("i", "bb-b bb-" + b + (lastPl[b] ? " on" : ""))); });
      var onN = ["onFirst", "onSecond", "onThird"].filter(function (b) { return lastPl[b]; }).map(function (b) { return b === "onFirst" ? "first" : b === "onSecond" ? "second" : "third"; });
      dia.setAttribute("role", "img"); dia.setAttribute("aria-label", onN.length ? "Runners on " + onN.join(" and ") : "Bases empty"); now.appendChild(dia);
      var nt = el("div", "bb-nt"), outs = Number(lastPl.outs) || 0;
      nt.appendChild(el("b", null, (done0 || rc.balls == null || rc.balls > 3 || rc.strikes > 2 ? "" : rc.balls + "-" + rc.strikes + ", ") + outs + (outs === 1 ? " out" : " outs")));
      var bid = bbWho(lastPl, "batter"), pidP = bbWho(lastPl, "pitcher"), bN = bid && ix[bid] ? fdShort(ix[bid]) : "", pN = pidP && ix[pidP] ? fdShort(ix[pidP]) : "";
      if (!done0 && bN) nt.appendChild(el("span", null, "At bat: " + bN + (bbLine(ix[bid], false) ? " (" + bbLine(ix[bid], false) + ")" : "")));
      if (pN) nt.appendChild(el("span", null, "Pitching: " + pN + (bbLine(ix[pidP], true) ? " (" + bbLine(ix[pidP], true) + ")" : "")));
      now.appendChild(nt); top.appendChild(now); }
    // the line score: runs by inning, then runs, hits and errors
    var inn = Math.max((lineOf.away || []).length, (lineOf.home || []).length);
    if (!pre && inn) { var from = Math.max(0, inn - 9), wrapL = el("div", "bb-ls"), tb = el("table", "bb-lt"), hr = el("tr");
      hr.appendChild(el("th", "bb-ltm", "")); for (var c = from; c < Math.max(inn, 9); c++) hr.appendChild(el("th", null, String(c + 1)));
      ["R", "H", "E"].forEach(function (x) { hr.appendChild(el("th", "bb-rhe", x)); }); tb.appendChild(hr);
      ["away", "home"].forEach(function (sd) { var r = el("tr"); r.appendChild(el("th", "bb-ltm", abbr(g, sd)));
        for (var c2 = from; c2 < Math.max(inn, 9); c2++) { var v = (lineOf[sd] || [])[c2]; r.appendChild(el("td", v && v !== "0" ? "bb-run" : "", v != null && v !== "" ? v : (over && sd === "home" && c2 === inn - 1 && (lineOf.away || [])[c2] != null ? "x" : ""))); }
        r.appendChild(el("td", "bb-rhe bb-r", scoreOf[sd] != null ? String(scoreOf[sd]) : "")); r.appendChild(el("td", "bb-rhe", heOf[sd] && heOf[sd].h != null ? String(heOf[sd].h) : "")); r.appendChild(el("td", "bb-rhe", heOf[sd] && heOf[sd].e != null ? String(heOf[sd].e) : ""));
        tb.appendChild(r); });
      tb.setAttribute("aria-label", "Line score"); wrapL.appendChild(tb); top.appendChild(wrapL); }
    // the pitchers of record once it's final, as ESPN names them
    if (over) { var dec = []; (cst.featuredAthletes || []).forEach(function (f) { var a = f.athlete || {}, nm2 = a.shortName || a.displayName || ""; if (!nm2) return;
        if (f.name === "winningPitcher") dec.push("W: " + nm2); else if (f.name === "losingPitcher") dec.push("L: " + nm2); else if (f.name === "savingPitcher") dec.push("S: " + nm2); });
      if (dec.length) top.appendChild(el("p", "bb-dec", dec.join(" · "))); }
    if (top.firstChild) body.appendChild(top);
    var stOf = {}; ((sum.boxscore || {}).teams || []).forEach(function (t) { var sd = sideOf[String((t.team || {}).id || "")]; if (!sd) return; stOf[sd] = {}; (t.statistics || []).forEach(function (grp) { var o2 = stOf[sd][grp.name] = {}; (grp.stats || []).forEach(function (s) { o2[s.name] = s.displayValue; }); }); });
    var hasStats = !pre && stOf.away && stOf.home && stOf.away.batting && stOf.home.batting;
    // the plays: one item per at-bat (its pitches folded in), plus the events between them, then newest first
    var items = [], pend = [];
    for (var i = 0; i < plays.length; i++) { var pl = plays[i], ty = String((pl.type || {}).text || ""), nx = plays[i + 1], pid = hpPid(pl);
      // each half inning opens with its own box ("Top of the 5th"); the middle and the end of an inning would only repeat it, so
      // they are left out, except the last one of a finished game
      if (/^(start|end) inning$/i.test(ty) || /^(middle|end) of/i.test(ty)) { if (/^start/i.test(ty) || /^(top|bottom) of/i.test(String(pl.text || "")) || (over && i === plays.length - 1)) items.push({ note: true, pl: pl, pid: pid }); pend = []; continue; }
      if (/^start batter/i.test(ty)) { pend = []; continue; }
      if (/^end batter/i.test(ty)) { pend = []; continue; }
      if (/^play result$/i.test(ty)) {
        if (nx && /^end batter/i.test(String((nx.type || {}).text || ""))) { items.push({ ab: true, pl: pl, pid: pid, pitches: pend.slice() }); pend = []; }
        else items.push({ ev: true, pl: pl, pid: pid });
        continue; }
      if (pl.atBatPitchNumber != null || /^pitch \d+/i.test(String(pl.text || ""))) { pend.push(pl); continue; }
      // a stolen base and the like arrive twice: once as their own play, once as its "Play Result". The result is the one shown.
    }
    if (live && pend.length && lastPl && !/play result|end batter|inning/i.test(String((lastPl.type || {}).text || ""))) items.push({ cur: true, pl: pend[pend.length - 1], pid: "cur-" + String(pend[0].atBatId || ""), pitches: pend.slice() });
    var keyOnly = !!FD.scOnly, list = el("div", "fd-list"), cap = keyOnly ? 1e9 : 14 * (1 + (+FD.more || 0)), shown = 0, total = 0, fresh = FD.seen || null, seenNow = {};
    var scoreTx = function (pl) { return pl.awayScore != null && pl.homeScore != null ? abbr(g, "away") + " " + pl.awayScore + "  " + abbr(g, "home") + " " + pl.homeScore : ""; };
    var plRow = function (card, id, role, asP, sd) { var P = ix[id]; if (!P) return; var psd = sideOf[P.tid] || sd || "away", row = el("div", "fd-pl"); row.appendChild(fdFace(g, psd, P, fdJerseyOnly(g, psd, P)));
      var w = el("span", "fd-pn"); w.appendChild(el("b", null, fdShort(P))); w.appendChild(el("em", "fd-pos", role)); var ln = bbLine(P, asP); if (ln) w.appendChild(el("i", null, ln)); row.appendChild(w); card.appendChild(row); };
    for (var k = items.length - 1; k >= 0; k--) {
      var it = items[k], p = it.pl; seenNow[it.pid] = 1;
      var isNew = !!(fresh && !fresh[it.pid]);
      if (it.note) { if (keyOnly) continue; if (shown < cap) list.appendChild(fdNoteCard(String(p.text || (p.type || {}).text || ""), isNew, it.pid, "", scoreTx(p))); continue; }
      var rd = it.ab ? bbResult(p) : it.ev ? bbEvent(p) : { kind: "", emoji: "🧢", title: (ix[bbWho(p, "batter")] ? fdShort(ix[bbWho(p, "batter")]) : "Batter") + " at bat", tx: "", key: false, tags: [] };
      if (rd.skip || (keyOnly && !rd.key)) continue;
      total++; if (shown >= cap) continue; shown++;
      // the batting team: top of the inning is the road team
      var half = String((p.period || {}).type || ""), sd = /^top/i.test(half) ? "away" : /^bot/i.test(half) ? "home" : (sideOf[String((p.team || {}).id || "")] || "");
      var csd = it.ev && /^(Pitching change)/.test(rd.title) ? (sd === "away" ? "home" : sd === "home" ? "away" : "") : sd;  // a new pitcher belongs to the team in the field
      var card = el("div", "fd-play sc-play bb-play" + (rd.kind ? " fd-k-" + rd.kind : "") + (it.cur ? " bb-cur" : "") + (isNew ? " fd-new" : "")); card.setAttribute("data-id", it.pid);
      if (csd) card.style.setProperty("--fd-team", fdTint(g, csd));
      var outs2 = p.outs != null && !it.cur ? Number(p.outs) : null, ph = el("div", "fd-ph");
      ph.appendChild(el("span", null, bbHalf(p) + (csd ? " · " + abbr(g, csd) : "") + (it.ab && outs2 != null ? " · " + outs2 + (outs2 === 1 ? " out" : " outs") : "")));
      var stx = scoreTx(p); if (stx) ph.appendChild(el("span", "fd-psc", stx)); card.appendChild(ph);
      if (rd.tags.length) { var tw = el("div", "fd-tags"); rd.tags.forEach(function (t) { tw.appendChild(el("span", "fd-tag good", t)); }); card.appendChild(tw); }
      card.appendChild(el("p", "fd-pt", (rd.emoji ? rd.emoji + " " : "") + rd.title));
      if (rd.tx && rd.tx !== rd.title) card.appendChild(el("p", "fd-px", rd.tx));
      if (it.cur) { var rc2 = p.resultCount || {}; card.appendChild(el("p", "fd-px", (rc2.balls != null && rc2.balls < 4 && rc2.strikes < 3 ? rc2.balls + "-" + rc2.strikes + " count, " : "") + (p.outs != null ? p.outs + (Number(p.outs) === 1 ? " out" : " outs") : ""))); }
      if (it.pitches && it.pitches.length) { var pln = bbPitchLine(it.pitches, !!it.cur); if (pln) card.appendChild(el("p", "bb-pit", pln)); }
      if (it.ab || it.cur) { plRow(card, bbWho(p, "batter"), "batter", false, sd); plRow(card, bbWho(p, "pitcher"), "pitcher", true, sd === "away" ? "home" : "away"); }
      else if (/^Pitching change/.test(rd.title)) plRow(card, bbWho(p, "pitcher"), "pitcher", true, csd);
      list.appendChild(card);
    }
    if (!plays.length) list.appendChild(el("p", "pv-none", pre ? "Every at-bat shows up here once the first pitch is thrown." : "No plays yet."));
    if (live) fdAgo(list, sum, true, g);
    var fb = list.querySelector(".fd-bar"); if (!fb && plays.length) { fb = el("div", "fd-bar"); fb.appendChild(el("p", "fd-ago", "")); list.insertBefore(fb, list.firstChild); }
    if (fb) { var after = fb.querySelector(".fd-ago");
      if (hasStats) { var on = scStatsOpen(), sb = el("button", "fd-scf fd-ldb" + (on ? " on" : ""), "Stats"); sb.type = "button"; sb.setAttribute("aria-expanded", on ? "true" : "false");
        sb.addEventListener("click", function () { try { localStorage.setItem("slate-feed-stats", on ? "0" : "1"); } catch (e) {} fdKeepY(renderFeed); });
        fb.insertBefore(sb, after.nextSibling); after = sb;
        if (on) { var c3 = el("div", "fd-field sc-stats"), add = function (a, lab, h) { if (a == null || h == null) return; var x = el("div", "sc-sr"); x.appendChild(el("b", null, String(a))); x.appendChild(el("span", null, lab)); x.appendChild(el("b", null, String(h))); c3.appendChild(x); };
          var hd2 = el("div", "sc-sr sc-srh"); hd2.appendChild(el("b", null, abbr(g, "away"))); hd2.appendChild(el("span", null, "Team stats")); hd2.appendChild(el("b", null, abbr(g, "home"))); c3.appendChild(hd2);
          var A = stOf.away, H = stOf.home, AB = A.batting, HB = H.batting, AP = A.pitching || {}, HP = H.pitching || {}, AF = A.fielding || {}, HF = H.fielding || {};
          add(AB.hits, "Hits", HB.hits); add(AB.homeRuns, "Home runs", HB.homeRuns); add(AB.doubles, "Doubles", HB.doubles); add(AB.walks, "Walks", HB.walks); add(AB.strikeouts, "Strikeouts (batting)", HB.strikeouts);
          add(AB.runnersLeftOnBase, "Left on base", HB.runnersLeftOnBase); add(AB.stolenBases, "Stolen bases", HB.stolenBases); add(AP.pitches, "Pitches thrown", HP.pitches); add(AF.errors, "Errors", HF.errors);
          var aft = list.querySelector(".fd-dlrow") || fb; list.insertBefore(c3, aft.nextSibling); } }
      if (plays.length) { var kb = el("button", "fd-scf" + (keyOnly ? " on" : ""), "Scoring"); kb.type = "button"; kb.setAttribute("aria-pressed", keyOnly ? "true" : "false");
        kb.addEventListener("click", function () { FD.scOnly = !FD.scOnly; fdKeepY(renderFeed); }); fb.insertBefore(kb, after.nextSibling); } }
    if (fb) fdLdHook(list, g, sum);  // 3.162.0: the Box score button (it took the Leaders button's place)
    if (keyOnly && !total && plays.length) list.appendChild(el("p", "pv-none", "No runs yet."));
    body.appendChild(list);
    fdMoreRow(list, !keyOnly && total > shown, keyOnly);
    body.appendChild(el("p", "pv-at fd-at", over ? "Final" : "Updates every few seconds while this page is open"));
    FD.seen = Object.assign(FD.seen || {}, seenNow);
    fdSettle(body, g, anchor, aTop, sc);
  }

  // ---------- Live feed (3.31.0): one live football game, play by play (after the Real app) ----------
  // A switcher of the other live games, the scorebug, the field (ball, line of scrimmage, line to gain) and every play, newest first,
  // from ESPN's game summary every 8 seconds while the page is open. Player lines are their game so far, from the same summary.
  var FD = { id: null, sum: null, at: 0, t: null, busy: false, seen: null, more: false };
  function feedBtn(g) {
    var b = el("button", "feed-go"); b.type = "button"; b.appendChild(el("i", "lo-dot")); var t = el("span"); t.appendChild(el("b", null, "Live feed")); t.appendChild(el("em", null, "Every play as it happens")); b.appendChild(t); b.appendChild(icon("more"));
    b.setAttribute("aria-label", "Open the live feed for " + g.away + " at " + g.home);
    b.addEventListener("click", function (e) { e.stopPropagation(); openFeed(g); }); return b;
  }
  function feedOk(g) { return !!g && !g.custom && BX_SPORT[g.league] === "football" && status(g).kind === "live"; }
  function feedGame() { var id = state.feedId; return id ? games().filter(function (x) { return x.id === id; })[0] || null : null; }
  function openFeed(g) {
    if (!g) return; state.boxOpen = state.boxOpen || {}; state.boxOpen[g.id] = true;  // opening the feed is asking to see the score
    if (state.feedId !== g.id) { state.feedId = g.id; FD.sum = null; FD.id = null; FD.seen = null; FD.more = false; }
    if (state.view === "feed") { renderFeed(); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0); } else openSub("feed");
    feedPoll(true);
  }
  function feedPoll(now) {
    clearTimeout(FD.t); FD.t = null;
    if (state.view !== "feed") return;
    var g = feedGame(); if (!g) return;
    if (document.hidden) { FD.t = setTimeout(feedPoll, 5000); return; }
    if (FD.busy) return; FD.busy = true;
    var cur = bx.live[g.id] || (bx.live[g.id] = {});
    (cur.ev ? Promise.resolve(cur.ev) : bxFindEvent(g)).then(function (ev) { if (!ev) return null; cur.ev = ev; return rkFetch(bxSummaryUrl(g.league, ev)); }).then(function (sum) {
      FD.busy = false; if (state.feedId !== g.id) return feedPoll();
      if (sum) { FD.sum = sum; FD.id = g.id; FD.at = Date.now(); cur.sum = sum; cur.sumAt = Date.now(); }
      if (state.view === "feed") renderFeed(true);
      var st = ((((sum || {}).header || {}).competitions || [])[0] || {}).status, k = ((st || {}).type || {}).state;
      if (state.view === "feed") FD.t = setTimeout(feedPoll, k === "post" ? 120000 : sum ? 8000 : 12000);
    }, function () { FD.busy = false; if (state.view === "feed") FD.t = setTimeout(feedPoll, 12000); });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && state.view === "feed") feedPoll(); });
  // the players in a game's box score, found by the short names in ESPN's play text ("F.Mendoza", "J.Smith-Njigba")
  function fdIndex(sum) {
    var ix = { byLast: {} };
    ((sum.boxscore || {}).players || []).forEach(function (t) { var tid = String((t.team || {}).id || "");
      (t.statistics || []).forEach(function (gr) { var lab = gr.labels || [];
        (gr.athletes || []).forEach(function (r) { var a = r.athlete || {}, id = String(a.id || ""); if (!id) return;
          var k = fdKey(a.lastName || String(a.displayName || "").split(" ").slice(1).join(" ")), L = ix.byLast[k] || (ix.byLast[k] = []), P = L.filter(function (x) { return x.id === id; })[0];
          if (!P) { P = { id: id, name: a.displayName || "", first: a.firstName || a.displayName || "", jer: a.jersey || "", tid: tid, st: {} }; L.push(P); }
          var v = {}; lab.forEach(function (l, i) { v[l] = (r.stats || [])[i]; }); P.st[gr.name] = v; }); }); });
    return ix;
  }
  function fdKey(last) { return String(last || "").toLowerCase().replace(/[\s,]+(jr|sr|ii|iii|iv|v)\.?$/, "").replace(/[^a-z]/g, ""); }  // "Washington Jr." and "Washington" match
  function fdFind(ix, init, last, offTid) {
    var L = (ix.byLast[fdKey(last)] || []).filter(function (P) { return String(P.first).toLowerCase().indexOf(String(init).toLowerCase()) === 0; });
    return L.length > 1 ? (L.filter(function (P) { return P.tid === offTid; })[0] || L[0]) : L[0] || null;
  }
  function fdLine(P, first) {
    var s = P.st, n = function (v) { return parseFloat(v) || 0; }, part = {};
    if (s.passing && n(String(s.passing["C/ATT"]).split("/")[1])) { var p = s.passing; part.passing = p["C/ATT"] + ", " + p.YDS + " yds" + (n(p.TD) ? ", " + p.TD + " TD" : "") + (n(p.INT) ? ", " + p.INT + " INT" : ""); }
    if (s.rushing && n(s.rushing.CAR)) { var r = s.rushing; part.rushing = r.CAR + " car, " + r.YDS + " yds" + (n(r.TD) ? ", " + r.TD + " TD" : ""); }
    if (s.receiving && n(s.receiving.REC)) { var c = s.receiving; part.receiving = c.REC + " rec, " + c.YDS + " yds" + (n(c.TD) ? ", " + c.TD + " TD" : ""); }
    if (s.defensive && (n(s.defensive.TOT) || n(s.defensive.SACKS))) { var d = s.defensive; part.defensive = n(d.TOT) + " tkl" + (n(d.SACKS) ? ", " + d.SACKS + " sk" : ""); }
    if (s.interceptions && n(s.interceptions.INT)) part.interceptions = s.interceptions.INT + " INT";
    if (s.kicking && s.kicking.FG) part.kicking = "FG " + s.kicking.FG + (s.kicking.XP ? ", XP " + s.kicking.XP : "");
    var order = [first, "passing", "rushing", "receiving", "interceptions", "defensive", "kicking"], out = [];
    order.forEach(function (k) { if (k && part[k] && out.indexOf(part[k]) < 0) out.push(part[k]); });
    return out.slice(0, 2).join(" · ");
  }
  function fdClean(t) { return String(t || "").replace(/^\s*\(\d{1,2}:\d\d\)\s*/, "").replace(/^\s*\((?:No Huddle|Shotgun|No Huddle, Shotgun|Run formation)[^)]*\)\s*/i, "").trim(); }
  // a play's title in plain words, its players (up to two) and which box-score line each one leads with
  function fdRead(pl, ix) {
    var ty = String((pl.type || {}).text || ""), tx = fdClean(pl.text), y = Number(pl.statYardage) || 0, offTid = String(((pl.start || {}).team || {}).id || "");
    var ya = function (v) { v = Math.abs(v); return v + (v === 1 ? " yard" : " yards"); };
    var inParens = /sack/i.test(ty), names = [], seen = {};
    var src = inParens ? tx : tx.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
    src.replace(/\b([A-Z][a-z]{0,2})\.((?:St\. ?)?[A-Z][A-Za-z'\-]+)/g, function (m, i, l) { var P = fdFind(ix, i, l, offTid); if (P && !seen[P.id]) { seen[P.id] = 1; names.push(P); } return m; });
    var ln = function (P) { return P ? String(P.name).split(" ").slice(1).join(" ").replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/, "") || P.name : ""; };
    var a = names[0], b = names[1], m, out = { title: ty || "Play", ps: [], kind: "" };
    var lead = function (P, k) { if (P) out.ps.push({ P: P, k: k }); };
    if (/^(End Period|End of Half|End of Game|Two-minute warning|Official Timeout|Timeout|End of Regulation)/i.test(ty)) { out.note = true; out.title = /two-minute/i.test(ty) ? "Two-minute warning" : /timeout/i.test(ty) ? (/official/i.test(ty) ? "TV timeout" : "Timeout" + ((m = /Timeout #\d+ by ([A-Z]{2,4})/i.exec(tx)) ? " " + m[1] : "")) : tx.replace(/^END /, "End of ").replace(/QUARTER/i, "quarter").replace(/HALF/i, "half").replace(/GAME/i, "game"); return out; }
    if (/Passing Touchdown/i.test(ty)) { out.kind = "score"; out.title = "Touchdown! " + (a && b ? ln(a) + " to " + ln(b) + ", " : "") + ya(y); lead(a, "passing"); lead(b, "receiving"); }
    else if (/Rushing Touchdown/i.test(ty)) { out.kind = "score"; out.title = "Touchdown! " + (a ? ln(a) + " runs it in from " + ya(y) : ya(y) + " run"); lead(a, "rushing"); }
    else if (/Touchdown/i.test(ty)) { out.kind = "score"; out.title = /interception/i.test(ty) ? "Pick six!" : /fumble/i.test(ty) ? "Fumble return touchdown!" : /punt|kick/i.test(ty) ? "Return touchdown!" : "Touchdown!"; lead(b || a, /interception/i.test(ty) ? "interceptions" : "defensive"); }
    else if (/Pass Reception/i.test(ty)) { out.title = (a && b ? ln(a) + " to " + ln(b) : "Pass complete") + (y > 0 ? " for " + ya(y) : y < 0 ? ", loss of " + ya(y) : ", no gain"); lead(a, "passing"); lead(b, "receiving"); }
    else if (/Pass Incompletion/i.test(ty)) { out.title = "Incomplete" + (b ? ", intended for " + ln(b) : ""); lead(a, "passing"); lead(b, "receiving"); }
    else if (/^Rush/i.test(ty)) { out.title = a ? ln(a) + (y > 0 ? " runs for " + ya(y) : y < 0 ? " loses " + ya(y) : ", no gain") : (y > 0 ? "Run for " + ya(y) : y < 0 ? "Run, loss of " + ya(y) : "Run, no gain"); lead(a, "rushing"); }
    else if (/Sack/i.test(ty)) { out.title = (a ? ln(a) + " sacked" : "Sack") + (y < 0 ? " for a loss of " + ya(y) : "") + (/fumble/i.test(ty) ? ", fumble" : ""); if (/fumble/i.test(ty)) out.kind = "turn"; lead(a, "passing"); lead(b, "defensive"); }
    else if (/Interception/i.test(ty)) { out.kind = "turn"; out.title = "Intercepted" + (b ? " by " + ln(b) : ""); lead(a, "passing"); lead(b, "interceptions"); }
    else if (/Fumble/i.test(ty)) { out.kind = /opp/i.test(ty) ? "turn" : ""; out.title = "Fumble" + (/opp/i.test(ty) ? ", recovered by the defense" : ", recovered by the offense"); lead(a, "rushing"); }
    else if (/Field Goal Good/i.test(ty)) { out.kind = "score"; out.title = "Field goal is good" + ((m = /(\d+) yard field goal/i.exec(tx)) ? " from " + m[1] + " yards" : ""); lead(a, "kicking"); }
    else if (/Field Goal|Blocked/i.test(ty) && /miss|block|no good/i.test(ty + tx)) { out.title = (/block/i.test(ty + tx) ? "Field goal blocked" : "Field goal missed") + ((m = /(\d+) yard field goal/i.exec(tx)) ? " from " + m[1] + " yards" : ""); lead(a, "kicking"); }
    else if (/Safety/i.test(ty)) { out.kind = "score"; out.title = "Safety!"; }
    else if (/Punt/i.test(ty)) { out.title = "Punt" + ((m = /punts (\d+) yards?/i.exec(tx)) ? ", " + m[1] + " yards" : "") + (/touchback/i.test(tx) ? ", touchback" : /fair catch/i.test(tx) ? ", fair catch" : /MUFFS/.test(tx) ? ", muffed" : ""); }
    else if (/Kickoff/i.test(ty)) { out.title = "Kickoff" + (/touchback/i.test(tx) ? ", touchback" : y > 0 && b ? ", " + ln(b) + " returns it " + ya(y) : ""); }
    else if (/Penalty/i.test(ty) || /PENALTY on/.test(tx)) { out.title = (m = /PENALTY on ([A-Z]{2,4})-[^,]*, ([^,]+), (\d+) yards?/.exec(tx)) ? "Penalty on " + m[1] + ": " + m[2] + ", " + m[3] + " yards" : "Penalty"; if (/NULLIFIED/.test(tx)) out.title += " (play wiped out)"; }
    else if (/Extra Point|Two-Point|2pt/i.test(ty)) { out.title = ty; }
    return out;
  }
  // a team's color that shows on a dark card: black or near-black gives way to the team's second color (or a neutral gray)
  function fdTint(g, sd) { var c = badgeColor(g, sd); if (c && lum(c) >= 0.06) return c; var a2 = g[sd + "Alt"]; return hexOk(a2) && lum(a2) >= 0.06 ? a2 : "#8A94A6"; }
  function fdJersey(g, sd, P) { var j = el("span", "fd-jer", P.jer ? P.jer : "•"), c = badgeColor(g, sd) || "#555"; j.style.background = c; if (lum(c) > 0.62) j.style.color = "#111"; j.setAttribute("aria-hidden", "true"); return j; }
  function fdStrip(g) {
    var ids = {}, list = games().filter(function (x) { return feedOk(x) || x.id === g.id; });
    list.sort(function (a, b) { return (inLineup(b.id) - inLineup(a.id)) || byStart(a, b); });
    if (list.length < 2) return null;
    var w = el("div", "fd-strip"); w.setAttribute("role", "tablist"); w.setAttribute("aria-label", "Live football games");
    list.forEach(function (x) { if (ids[x.id]) return; ids[x.id] = 1;
      var on = x.id === g.id, b = el("button", "fd-chip" + (on ? " on" : "")); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", on ? "true" : "false");
      var v = scoreRaw(x.id) || {}, show = boxShown(x) && v.a != null && !isNaN(v.a);
      ["away", "home"].forEach(function (sd) { var r = el("span", "fd-cr"); r.appendChild(el("b", null, abbr(x, sd))); if (show) r.appendChild(el("span", null, String(sd === "away" ? v.a : v.h))); b.appendChild(r); });
      b.appendChild(el("i", null, v.detail || "Live"));
      b.setAttribute("aria-label", x.away + " at " + x.home + (show ? ", " + v.a + " to " + v.h : "") + ", " + (v.detail || "live"));
      if (!on) b.addEventListener("click", function () { openFeed(x); });
      w.appendChild(b); });
    setTimeout(function () { var c = w.querySelector(".fd-chip.on"); if (c && w.scrollWidth > w.clientWidth) w.scrollLeft = Math.max(0, c.offsetLeft - 16); }, 0);
    return w;
  }
  function renderFeed(fromPoll) {
    var body = $("feed-body"); if (!body) return;
    if (state.view !== "feed") { if (body.firstChild) body.textContent = ""; clearTimeout(FD.t); FD.t = null; return; }
    var g = feedGame();
    if (!g) { body.textContent = ""; body.appendChild(el("div", "notice", "That game isn't on today's list anymore.")); return; }
    if ((FD.id !== g.id || !FD.t) && !FD.busy) setTimeout(function () { if (!FD.t && !FD.busy) feedPoll(); }, 0);
    // keep the reader's place: when new plays land on top, the play at the top of the screen stays where it was
    var sc = isDuo ? $("pane-r") : null, y0 = sc ? sc.scrollTop : (window.scrollY || 0), anchor = null, aTop = 0;
    if (fromPoll && y0 > 60) { var cs = body.querySelectorAll(".fd-play[data-id]"); for (var i = 0; i < cs.length; i++) { var rc = cs[i].getBoundingClientRect(); if (rc.bottom > 140) { anchor = cs[i].getAttribute("data-id"); aTop = rc.top; break; } } }
    body.textContent = "";
    var strip = fdStrip(g); if (strip) body.appendChild(strip);
    var sum = FD.id === g.id ? FD.sum : null;
    if (!sum) { body.appendChild(el("p", "pv-none bx-wait fd-wait", "Loading the play-by-play…")); return; }
    var comp = ((sum.header || {}).competitions || [])[0] || {}, st = (comp.status || {}).type || {}, sideOf = {}, abOf = {}, scoreOf = {}, recOf = {};
    (comp.competitors || []).forEach(function (k) { var id = String((k.team || {}).id || ""), sd = k.homeAway === "home" ? "home" : "away"; sideOf[id] = sd; abOf[String((k.team || {}).abbreviation || "").toUpperCase()] = sd; scoreOf[sd] = k.score; recOf[sd] = ((k.record || [])[0] || {}).summary || ""; });
    var ix = fdIndex(sum), drives = [], byId = {};
    var dr = sum.drives || {}; (dr.previous || []).concat(dr.current ? [dr.current] : []).forEach(function (d) { if (!d || !d.id) return; if (byId[d.id] != null) drives[byId[d.id]] = d; else { byId[d.id] = drives.length; drives.push(d); } });
    var allPlays = []; drives.forEach(function (d) { (d.plays || []).forEach(function (p2) { allPlays.push(p2); }); });
    var last = allPlays[allPlays.length - 1] || null, over = st.state === "post";
    // possession and the spot: the latest play's end (a score or kickoff leaves no down to show)
    var spot = null; for (var j = allPlays.length - 1; j >= 0 && !spot; j--) { var e = allPlays[j].end || {}; if (e.possessionText || e.yardLine != null) spot = { e: e, p: allPlays[j] }; }
    // between quarters' halves (halftime, end of regulation) nobody has the ball yet: no spot, no possession mark
    if (last && /End Period|End of Half|End of Game|End of Regulation/i.test(String((last.type || {}).text || "")) && /half|end/i.test(String(st.shortDetail || st.detail || ""))) spot = null;
    var posTid = spot ? String(((spot.e.team || {}).id) || ((((spot.p.start || {}).team) || {}).id) || "") : "", posSide = sideOf[posTid] || "";
    // the scorebug
    var bug = el("div", "fd-bug"), aS = Number(scoreOf.away), hS = Number(scoreOf.home);
    ["away", "mid", "home"].forEach(function (sd) {
      if (sd === "mid") { var mid = el("div", "fd-mid"); var per = Number((comp.status || {}).period) || 0, ht = /half/i.test(String(st.shortDetail || ""));
        mid.appendChild(el("b", null, over ? "Final" : ht ? "Half" : st.state === "pre" ? timeText(g.start) : ((comp.status || {}).displayClock || ""))); if (!over) mid.appendChild(el("i", null, ht ? "Halftime" : per > 4 ? "OT" : per ? ordN(per) : "")); bug.appendChild(mid); return; }
      var tm = el("div", "fd-tm"); tm.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      var nm = el("b", null, short(g, sd)); if (!over && posSide === sd) { var bl = el("i", "fd-ball"); bl.setAttribute("aria-label", "has the ball"); nm.appendChild(bl); } tm.appendChild(nm);
      if (recOf[sd]) tm.appendChild(el("i", null, recOf[sd]));
      var scn = el("b", "fd-sc" + ((sd === "away" ? aS < hS : hS < aS) ? " trail" : ""), String(scoreOf[sd] != null ? scoreOf[sd] : "–"));
      if (sd === "away") { bug.appendChild(tm); bug.appendChild(scn); } else { bug.appendChild(scn); bug.appendChild(tm); }
    });
    body.appendChild(bug);
    // the field: the away team's end zone on the left; the ball, the line of scrimmage and the yellow line to gain
    if (!over && spot) {
      var E = spot.e, pt = String(E.possessionText || ""), pm = /^([A-Z]{2,4})\s+(\d+)$/.exec(pt), x = null;
      if (pm && abOf[pm[1]]) x = abOf[pm[1]] === "away" ? +pm[2] : 100 - +pm[2]; else if (/^50$/.test(pt)) x = 50;
      var fld = el("div", "fd-field");
      var dd = el("div", "fd-dd"), down = Number(E.down) || 0;
      dd.appendChild(el("b", null, down ? String(E.shortDownDistanceText || "") : (last && /kickoff/i.test(((last.type || {}).text) || "") ? "Kickoff" : " ")));
      dd.appendChild(el("span", null, pt ? (posSide ? abbr(g, posSide) + " ball · " : "") + pt.replace(/^([A-Z]{2,4})/, function (a2) { return abOf[a2] ? abbr(g, abOf[a2]) : a2; }) : ""));
      var y2e = Number(E.yardsToEndzone); if (down && y2e > 0 && y2e <= 20) dd.appendChild(el("em", "fd-rz", "Red zone"));
      fld.appendChild(dd);
      var pitch = el("div", "fd-pitch"); pitch.setAttribute("aria-hidden", "true");
      ["away", "home"].forEach(function (sd) { var ez = el("span", "fd-ez fd-ez-" + sd, abbr(g, sd)); ez.style.background = badgeColor(g, sd) || "var(--raise)"; if (lum(badgeColor(g, sd) || "#333333") > 0.62) ez.style.color = "#111"; pitch.appendChild(ez); });
      var at = function (v) { return (8 + Math.max(0, Math.min(100, v)) * 0.84) + "%"; };
      if (x != null) {
        var dir = posSide === "away" ? 1 : -1, dist = Number(E.distance) || 0;
        if (down && dist) { var tg = x + dir * dist, lo = Math.min(x, tg), hi = Math.max(x, tg), band = el("span", "fd-band"); band.style.left = at(lo); band.style.width = (Math.min(100, hi) - Math.max(0, lo)) * 0.84 + "%"; pitch.appendChild(band); if (tg > 0 && tg < 100) { var ltg = el("span", "fd-ltg"); ltg.style.left = at(tg); pitch.appendChild(ltg); } }
        var los = el("span", "fd-los"); los.style.left = at(x); pitch.appendChild(los);
        var ball = el("span", "fd-fb"); ball.style.left = at(x); pitch.appendChild(ball);
      }
      fld.appendChild(pitch);
      var yl = el("div", "fd-yl"); yl.setAttribute("aria-hidden", "true"); ["G", "10", "20", "30", "40", "50", "40", "30", "20", "10", "G"].forEach(function (t2, k2) { var s3 = el("span", null, t2); s3.style.left = at(k2 * 10); yl.appendChild(s3); }); fld.appendChild(yl);
      fld.setAttribute("aria-label", (down ? E.shortDownDistanceText + ", " : "") + "ball on the " + pt);
      body.appendChild(fld);
    }
    // ESPN's win probability after the latest play
    var wp = (sum.winprobability || [])[(sum.winprobability || []).length - 1];
    if (!over && wp && wp.homeWinPercentage != null) {
      var hp = Math.round(wp.homeWinPercentage * 100), ap = 100 - hp, wr = el("div", "fd-wp");
      wr.appendChild(el("span", null, abbr(g, "away") + " " + ap + "%"));
      var bar = el("span", "fd-wpb"), ba = el("i"), bh = el("i"); ba.style.width = ap + "%"; ba.style.background = fdTint(g, "away"); bh.style.width = hp + "%"; bh.style.background = fdTint(g, "home"); bar.appendChild(ba); bar.appendChild(bh); wr.appendChild(bar);
      wr.appendChild(el("span", null, hp + "% " + abbr(g, "home")));
      wr.setAttribute("aria-label", "ESPN win probability: " + abbr(g, "away") + " " + ap + " percent, " + abbr(g, "home") + " " + hp + " percent");
      var wl = el("p", "fd-wpl", "Win probability (ESPN)"); body.appendChild(wl); body.appendChild(wr);
    }
    // the plays, newest first, under their drives
    var list = el("div", "fd-list"), shown = 0, cap = FD.more ? 1e9 : 60, fresh = FD.seen ? FD.seen : null, seenNow = {};
    for (var di = drives.length - 1; di >= 0 && shown < cap; di--) {
      var d2 = drives[di], dsd = sideOf[String((d2.team || {}).id || "")] || "", isCur = dr.current && d2.id === dr.current.id && !over && !d2.displayResult && (!posSide || dsd === posSide);  // a punt or turnover ends it before ESPN opens the next drive
      var dh = el("div", "fd-drive"); if (dsd) dh.appendChild(badgeFor(abbr(g, dsd), g[dsd], g[dsd + "Color"], g[dsd + "Alt"]));
      var dt = el("span", "fd-dt"); dt.appendChild(el("b", null, isCur ? "Current drive" : (dsd ? abbr(g, dsd) + " drive" : "Drive"))); if (d2.description) dt.appendChild(el("span", null, d2.description)); dh.appendChild(dt);
      var res = d2.displayResult || ""; if (res && !isCur) dh.appendChild(el("em", "fd-res" + (d2.isScore ? " sc" : /fumble|interception|downs/i.test(res) ? " to" : ""), res));
      list.appendChild(dh);
      var pls = (d2.plays || []).slice().reverse();
      for (var pi = 0; pi < pls.length && shown < cap; pi++) {
        var pl = pls[pi], rd = fdRead(pl, ix), pid = String(pl.id || pl.sequenceNumber || (di + "-" + pi)); seenNow[pid] = 1;
        var isNew = fresh && !fresh[pid];
        if (rd.note) { list.appendChild(el("p", "fd-note" + (isNew ? " fd-new" : ""), rd.title)); continue; }
        shown++;
        var card = el("div", "fd-play" + (rd.kind ? " fd-k-" + rd.kind : "") + (isNew ? " fd-new" : "")); card.setAttribute("data-id", pid);
        var ph = el("div", "fd-ph"), q = ((pl.period || {}).number) || 0, ss = pl.start || {};
        ph.appendChild(el("span", null, (q ? (q > 4 ? "OT" : "Q" + q) + " " : "") + ((pl.clock || {}).displayValue || "") + (ss.down ? " · " + (ss.downDistanceText || ss.shortDownDistanceText || "") : "")));
        var scs = el("span", "fd-psc"); scs.textContent = abbr(g, "away") + " " + (pl.awayScore != null ? pl.awayScore : "") + "  " + abbr(g, "home") + " " + (pl.homeScore != null ? pl.homeScore : ""); ph.appendChild(scs);
        card.appendChild(ph);
        card.appendChild(el("p", "fd-pt", rd.title));
        rd.ps.forEach(function (o) { var psd = sideOf[o.P.tid] || "away", row = el("div", "fd-pl"); row.appendChild(fdJersey(g, psd, o.P)); var nmw = el("span", "fd-pn"); nmw.appendChild(el("b", null, o.P.name)); var lnx = fdLine(o.P, o.k); if (lnx) nmw.appendChild(el("i", null, lnx)); row.appendChild(nmw); card.appendChild(row); });
        var raw = fdClean(pl.text); if (raw && raw !== rd.title) card.appendChild(el("p", "fd-px", raw));
        list.appendChild(card);
      }
    }
    if (!allPlays.length) list.appendChild(el("p", "pv-none", st.state === "pre" ? "Plays show up here once the game kicks off." : "No plays yet."));
    body.appendChild(list);
    if (!FD.more && allPlays.length > shown && shown >= cap) { var mb = el("button", "bets-more fd-more", "Show earlier plays"); mb.type = "button"; mb.addEventListener("click", function () { FD.more = true; renderFeed(); }); body.appendChild(mb); }
    body.appendChild(el("p", "pv-at fd-at", over ? "Final" : "Updates every few seconds while this page is open"));
    FD.seen = Object.assign(FD.seen || {}, seenNow);
    if (anchor) requestAnimationFrame(function () { var n2 = body.querySelector('.fd-play[data-id="' + anchor + '"]'); if (!n2) return; var dlt = n2.getBoundingClientRect().top - aTop; if (Math.abs(dlt) > 1) { if (sc) sc.scrollTop += dlt; else window.scrollBy(0, dlt); } });
  }

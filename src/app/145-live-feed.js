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
    if (state.feedId !== g.id) { var c0 = bx.live[g.id]; state.feedId = g.id; FD.sum = (c0 && c0.sum) || null; FD.id = FD.sum ? g.id : null; FD.seen = null; FD.more = false; FD.sig = null; FD.err = 0; clearTimeout(FD.t); FD.t = null; }
    if (state.view === "feed") { renderFeed(); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0); } else openSub("feed");
    feedPoll(true);
  }
  // how often the feed asks ESPN (3.36.0): every 4 seconds while a play could happen, slower at breaks, backing off after errors.
  // Straight from the phone to ESPN's public feed (nothing of ours in between), only while this page is open and on screen.
  function fdGet(url) {
    var ac = typeof AbortController === "function" ? new AbortController() : null, t = ac ? setTimeout(function () { ac.abort(); }, 7000) : null;  // a stuck request never holds up the next
    return fetch(url, ac ? { cache: "no-store", signal: ac.signal } : { cache: "no-store" }).then(function (r) { clearTimeout(t); return r.ok ? r.json() : null; }, function () { clearTimeout(t); return null; });
  }
  function fdSig(sum) {  // what's on screen: the newest play, the clock, the score and the win probability
    var comp = ((sum.header || {}).competitions || [])[0] || {}, st = comp.status || {}, dr = sum.drives || {}, cur = dr.current || (dr.previous || [])[(dr.previous || []).length - 1] || {}, pl = (cur.plays || [])[(cur.plays || []).length - 1] || {};
    return [(dr.previous || []).length, cur.id, (cur.plays || []).length, pl.id, pl.awayScore, pl.homeScore, st.displayClock, st.period, (st.type || {}).state, (comp.competitors || []).map(function (k) { return k.score; }).join("-"), (sum.winprobability || []).length].join("|");
  }
  function feedPoll(now) {
    clearTimeout(FD.t); FD.t = null;
    if (state.view !== "feed") return;
    var g = feedGame(); if (!g) return;
    if (document.hidden) return;  // the visibilitychange listener picks it up the moment the page is back
    if (FD.busy) return; FD.busy = true;
    var cur = bx.live[g.id] || (bx.live[g.id] = {});
    (cur.ev ? Promise.resolve(cur.ev) : bxFindEvent(g)).then(function (ev) { if (!ev) return null; cur.ev = ev; return fdGet(bxSummaryUrl(g.league, ev)); }).then(function (sum) {
      FD.busy = false; if (state.feedId !== g.id) return feedPoll();
      var changed = true;
      if (sum) { var sg = fdSig(sum); changed = sg !== FD.sig || FD.id !== g.id; FD.sig = sg; FD.err = 0; FD.sum = sum; FD.id = g.id; FD.at = Date.now(); cur.sum = sum; cur.sumAt = Date.now(); }
      else FD.err = (FD.err || 0) + 1;
      if (state.view === "feed" && changed) renderFeed(true);  // nothing new: leave the page alone
      var st = ((((sum || {}).header || {}).competitions || [])[0] || {}).status || {}, k = (st.type || {}).state, det = String((st.type || {}).shortDetail || st.type && st.type.detail || "");
      var brk = /half|end of|delay/i.test(det) || /End Period|End of Half/i.test(String(((((sum || {}).drives || {}).current || {}).plays || []).slice(-1).map(function (p) { return (p.type || {}).text; })[0] || ""));
      var wait = !sum ? Math.min(60000, 6000 * Math.pow(2, Math.min(FD.err, 4))) : k === "post" ? 120000 : k === "pre" ? 30000 : brk ? 12000 : 4000;
      if (state.view === "feed") FD.t = setTimeout(feedPoll, wait);
      if (sum) fdPrefetch(g);
    }, function () { FD.busy = false; FD.err = (FD.err || 0) + 1; if (state.view === "feed") FD.t = setTimeout(feedPoll, Math.min(60000, 6000 * Math.pow(2, Math.min(FD.err, 4)))); });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && state.view === "feed") feedPoll(); });
  (function () {
    var mark = function () { if (state.view === "feed") FD.scrollAt = Date.now(); };
    window.addEventListener("scroll", mark, { passive: true }); var pr = $("pane-r"); if (pr) pr.addEventListener("scroll", mark, { passive: true });
    document.addEventListener("touchstart", function () { FD.touch = true; }, { passive: true, capture: true });
    // the folded Duo (3.36.6): the clock and Wi-Fi can sit on the right end of the pinned score bar. Pulling down while it's
    // pinned slides the bar down below them (at most 56 points); it springs back when you let go. At the top of the page,
    // the page itself pulls down (iOS's bounce)
    var pk = null;
    document.addEventListener("touchstart", function (e) {
      pk = null; var h = document.documentElement;
      if (state.view !== "feed" || e.touches.length !== 1 || !h.hasAttribute("data-native") || !h.classList.contains("side-col") || h.classList.contains("duo")) return;
      var bug = document.querySelector("#feed-body .fd-bug"); if (!bug) return;
      var top = parseFloat($("view-feed").style.getPropertyValue("--fd-top")) || 0, y = (isDuo ? $("pane-r").scrollTop : window.scrollY) || 0;
      if (y > 0 && bug.getBoundingClientRect().top <= top + 1.5) pk = { bug: bug, y0: e.touches[0].clientY };
      else if (y <= 0) pk = { bug: $("feed-body"), y0: e.touches[0].clientY };  // at the top: the whole page slides down (iOS's own bounce doesn't always)
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!pk || FD.drag) return; var d = e.touches[0].clientY - pk.y0;
      pk.bug.style.transition = "none"; pk.bug.style.transform = d > 0 ? "translate3d(0," + Math.min(56, d * 0.6) + "px,0)" : "";
    }, { passive: true });
    ["touchend", "touchcancel"].forEach(function (n) { document.addEventListener(n, function () {
      if (!pk) return; var b = pk.bug; pk = null; b.style.transition = "transform .25s cubic-bezier(.2,.8,.2,1)"; b.style.transform = ""; setTimeout(function () { b.style.transition = ""; }, 260);
    }, { passive: true }); });
    ["touchend", "touchcancel"].forEach(function (n) { document.addEventListener(n, function () { FD.touch = false; mark(); }, { passive: true, capture: true }); });
  })();
  function fdPrefetch(g) {
    var list = fdList(g), i = -1; list.forEach(function (x, j) { if (x.id === g.id) i = j; });
    [list[i - 1], list[i + 1]].forEach(function (n) {
      if (!n) return; var c = bx.live[n.id] || (bx.live[n.id] = {}); if (c.pf || (c.sum && Date.now() - (c.sumAt || 0) < 60000)) return; c.pf = 1;
      (c.ev ? Promise.resolve(c.ev) : bxFindEvent(n)).then(function (ev) { if (!ev) return null; c.ev = ev; return rkFetch(bxSummaryUrl(n.league, ev)); })
        .then(function (sm) { c.pf = 0; if (sm) { c.sum = sm; c.sumAt = Date.now(); } }, function () { c.pf = 0; });
    });
  }
  // the players in a game's box score, found by the short names in ESPN's play text ("F.Mendoza", "J.Smith-Njigba")
  function fdIndex(sum) {
    var ix = { byLast: {} };
    ((sum.boxscore || {}).players || []).forEach(function (t) { var tid = String((t.team || {}).id || "");
      (t.statistics || []).forEach(function (gr) { var lab = gr.labels || [];
        (gr.athletes || []).forEach(function (r) { var a = r.athlete || {}, id = String(a.id || ""); if (!id) return;
          var k = fdKey(a.lastName || String(a.displayName || "").split(" ").slice(1).join(" ")), L = ix.byLast[k] || (ix.byLast[k] = []), P = L.filter(function (x) { return x.id === id; })[0];
          if (!P) { P = { id: id, name: a.displayName || "", first: a.firstName || a.displayName || "", jer: a.jersey || "", tid: tid, pos: (a.position || {}).abbreviation || "", st: {} }; L.push(P); }
          var v = {}; lab.forEach(function (l, i) { v[l] = (r.stats || [])[i]; }); P.st[gr.name] = v; }); }); });
    return ix;
  }
  // "F. Mendoza", "J. Smith-Njigba": the first initial and the rest of the name
  function fdShort(P) { var w = String(P.name || "").split(" "); return w.length > 1 ? w[0].charAt(0) + ". " + w.slice(1).join(" ") : P.name || ""; }
  // the player's position from ESPN: the box score when it has it, else the team's roster (asked once per team, kept with Box Office's)
  function fdPos(P, lg) {
    if (P.pos) return P.pos; if (P.id && FPOS[P.id]) return FPOS[P.id];
    if (P.tid && !FPOS_ASK[lg + P.tid] && RK_PATH[lg]) {
      FPOS_ASK[lg + P.tid] = 1;
      rkFetch(rkUrl(lg, "teams/" + P.tid + "/roster", "")).then(function (j) {
        var n = 0; ((j && j.athletes) || []).forEach(function (grp) { (grp.items || []).forEach(function (a) { var p = (a.position || {}).abbreviation; if (a.id && p) { FPOS[a.id] = p; n++; } }); });
        try { localStorage.setItem("slate-fpos", JSON.stringify(FPOS)); } catch (e) {}
        if (n && state.view === "feed") renderFeed(true);
      });
    }
    return "";
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
  // ESPN's play text, cleaned up (3.36.8): one short line per part, in plain sentence case. "B.Purdy pass short right to
  // C.McCaffrey for 66 yards, TOUCHDOWN. TWO-POINT CONVERSION ATTEMPT. ... ATTEMPT SUCCEEDS.PENALTY on DAL-J.Porter, ..."
  // becomes "Purdy pass short right to McCaffrey, 66 yds" and "2-pt good: Purdy to McCaffrey". Penalties are left to the Flag tag.
  function fdLines(raw, title) {
    var t = String(raw || "").replace(/\s+/g, " ").trim(); if (!t) return [];
    var nm = function (x) { return String(x || "").replace(/\b[A-Z][a-z]{0,2}\.(?=[A-Z])/g, ""); };  // "B.Purdy" -> "Purdy"
    var low = function (x) { return String(x).replace(/\b[A-Z][A-Z'\-]{3,}\b/g, function (w) { return w.toLowerCase(); }); };  // TOUCHDOWN -> touchdown (team abbreviations stay)
    var cap = function (x) { x = x.trim(); return x.charAt(0).toUpperCase() + x.slice(1); };
    var out = [], m, NM = "[A-Z][a-z]{0,2}\\.[A-Za-z'\\-]+";
    t = t.replace(new RegExp(",?\\s*Center-" + NM + ",\\s*Holder-" + NM + "\\.?", "gi"), "").replace(/(\d+) yards? field goal/gi, "$1-yard field goal");
    // the two-point try, the extra point and penalties come off the end first
    var two = /TWO-POINT CONVERSION ATTEMPT\.?\s*(.*?)(ATTEMPT (?:SUCCEEDS|FAILS))\.?/i.exec(t);
    if (two) { var tw = two[1].replace(/\.$/, ""), how = (m = /([A-Z][a-z]{0,2}\.[A-Za-z'\-]+) pass to ([A-Z][a-z]{0,2}\.[A-Za-z'\-]+)/.exec(tw)) ? nm(m[1]) + " to " + nm(m[2]) : (m = /([A-Z][a-z]{0,2}\.[A-Za-z'\-]+) (?:rush|left|right|up)/.exec(tw)) ? nm(m[1]) + " run" : "";
      t = t.replace(two[0], " "); var twoLine = "2-pt " + (/SUCCEEDS/i.test(two[2]) ? "good" : "no good") + (how ? ": " + how : ""); }
    var xp = /([A-Z][a-z]{0,2}\.[A-Za-z'\-]+) extra point is (GOOD|NO GOOD|BLOCKED)[^.]*\.?/i.exec(t), xpLine = "";
    if (xp) { t = t.replace(xp[0], " "); xpLine = "Extra point " + xp[2].toLowerCase() + " (" + nm(xp[1]) + ")"; }
    t = t.replace(new RegExp("PENALTY on [A-Z]{2,4}(?:-" + NM + ")?,.*?(?:enforced (?:at [A-Z]{2,4} \\d+|between downs)|declined|offsetting|(?=PENALTY)|$)(?:\\s*-\\s*No Play)?\\.?", "gi"), " ");
    t = t.replace(/\[[^\]]*\]/g, "").replace(/\((?:[A-Z][a-z]{0,2}\.[A-Za-z'\-]+(?:[;,]\s*)?)+\)/g, "");  // tacklers, in brackets or parentheses
    // the rest, a sentence at a time
    t.split(/\.\s+(?=[A-Z])|\.(?=[A-Z]{2})/).forEach(function (seg) {
      seg = seg.replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").replace(/[\s.,]+$/, "").trim(); if (!seg || /^-?\s*No Play$/i.test(seg)) return;
      seg = seg.replace(/ for (-?\d+) yards?,? TOUCHDOWN/i, ", $1 yds, touchdown").replace(/ for (-?\d+) yards?/i, ", $1 yds").replace(/ (\d+) yards?/g, " $1 yds");
      seg = seg.replace(/\s*FUMBLES,?\s*(?:\([^)]*\))?,?\s*/i, ", fumble, ").replace(/^, /, "").replace(/recovered by ([A-Z]{2,4})-([A-Z][a-z]{0,2}\.[A-Za-z'\-]+)/i, function (_, tm, p) { return "recovered by " + tm + " (" + nm(p) + ")"; });
      seg = cap(low(nm(seg)));
      if (seg && seg !== title) out.push(seg);
    });
    if (out.length && /No Play/i.test(String(raw))) out[0] = "No play: " + out[0];  // wiped out by a penalty
    if (xpLine) out.push(xpLine); if (two) out.push(twoLine);
    return out;
  }
  // a play's title in plain words, its players (up to two) and which box-score line each one leads with
  function fdRead(pl, ix) {
    var ty = String((pl.type || {}).text || ""), tx = fdClean(pl.text), y = Number(pl.statYardage) || 0, offTid = String(((pl.start || {}).team || {}).id || "");
    var ya = function (v) { v = Math.abs(v); return v + (v === 1 ? " yd" : " yds"); };  // short, like the lines under it (3.36.8)
    var inParens = /sack/i.test(ty), names = [], seen = {};
    var src = inParens ? tx : tx.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
    src.replace(/\b([A-Z][a-z]{0,2})\.((?:St\. ?)?[A-Z][A-Za-z'\-]+)/g, function (m, i, l) { var P = fdFind(ix, i, l, offTid); if (P && !seen[P.id]) { seen[P.id] = 1; names.push(P); } return m; });
    var ln = function (P) { return P ? String(P.name).split(" ").slice(1).join(" ").replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/, "") || P.name : ""; };
    var a = names[0], b = names[1], m, out = { title: ty || "Play", ps: [], kind: "" };
    var lead = function (P, k) { if (P) out.ps.push({ P: P, k: k }); };
    if (/^(End Period|End of Half|End of Game|Two-minute warning|Official Timeout|Timeout|End of Regulation)/i.test(ty)) { out.note = true; out.title = /two-minute/i.test(ty) ? "Two-minute warning" : /timeout/i.test(ty) ? (/official/i.test(ty) ? "TV timeout" : "Timeout" + ((m = /Timeout #\d+ by ([A-Z]{2,4})/i.exec(tx)) ? " " + m[1] : "")) : tx.replace(/^END /, "End of ").replace(/QUARTER/i, "quarter").replace(/HALF/i, "half").replace(/GAME/i, "game"); return out; }
    if (/Passing Touchdown/i.test(ty)) { out.kind = "score"; out.title = "TD: " + (a && b ? ln(a) + " to " + ln(b) + ", " : "pass, ") + Math.abs(y) + " yds"; lead(a, "passing"); lead(b, "receiving"); }
    else if (/Rushing Touchdown/i.test(ty)) { out.kind = "score"; out.title = "TD: " + (a ? ln(a) + " run, " : "run, ") + Math.abs(y) + " yds"; lead(a, "rushing"); }
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
  // the live games in the switcher's order: your slate's first, then by start time
  function fdList(g) {
    var ids = {}, list = games().filter(function (x) { if (ids[x.id] || !(feedOk(x) || x.id === g.id)) return false; ids[x.id] = 1; return true; });
    list.sort(function (a, b) { return (inLineup(b.id) - inLineup(a.id)) || byStart(a, b); });
    return list;
  }
  // a sideways swipe on the page moves to the next (left) or previous (right) game in the switcher; false when there's none that way
  function fdSwipe(step) {
    var g = feedGame(); if (!g) return false;
    var list = fdList(g), i = -1; list.forEach(function (x, j) { if (x.id === g.id) i = j; });
    var n = i < 0 ? null : list[i + step]; if (!n) return false;
    openFeed(n); fdSlideIn(step > 0 ? "l" : "r"); return true;
  }
  function fdAtFirst() { var g = feedGame(); if (!g) return true; var l = fdList(g); return !l.length || l[0].id === g.id; }
  function fdKids() { var b = $("feed-body"); return b ? Array.prototype.filter.call(b.children, function (c) { return !c.classList.contains("fd-strip"); }) : []; }
  function fdSlideIn(dir) { if (REDUCED) return; fdKids().forEach(function (c) { c.classList.remove("fd-in-l", "fd-in-r"); void c.offsetWidth; c.classList.add(dir === "l" ? "fd-in-l" : "fd-in-r"); }); }
  // the score on this page moves only when the scoring play itself is in the play-by-play (3.35.3): ESPN's header (and the
  // scoreboard) can update first. If the play still hasn't come through after 90 seconds, the header's score shows anyway.
  function fdSumScore(id, sum) {
    if (!sum) return null; var comp = ((sum.header || {}).competitions || [])[0] || {}, hd = {};
    (comp.competitors || []).forEach(function (k) { hd[k.homeAway === "home" ? "h" : "a"] = Number(k.score); });
    if (hd.a == null || isNaN(hd.a) || hd.h == null || isNaN(hd.h)) return null;
    var dr = sum.drives || {}, ds = (dr.previous || []).concat(dr.current ? [dr.current] : []), p = null;
    ds.forEach(function (d) { (d.plays || []).forEach(function (pl) { if (pl.awayScore != null && pl.homeScore != null) p = { a: Number(pl.awayScore), h: Number(pl.homeScore) }; }); });
    FD.hold = FD.hold || {};
    if (!p || (p.a === hd.a && p.h === hd.h)) { delete FD.hold[id]; return hd; }
    var key = hd.a + "-" + hd.h, H = FD.hold[id]; if (!H || H.k !== key) H = FD.hold[id] = { k: key, at: Date.now() };
    if (Date.now() - H.at > 90000) return hd;
    if (!FD.ht) FD.ht = setTimeout(function () { FD.ht = null; if (state.view === "feed") renderFeed(true); }, 91000 - (Date.now() - H.at));  // let the header's score through on time
    return p;
  }
  function fdStrip(g) {
    var ids = {}, list = fdList(g);
    if (!list.length) return null;  // shown even for one game (3.36.7): the page keeps the same shape, and the score box stays clear of the folded Duo's clock
    var w = el("div", "fd-strip"); w.setAttribute("role", "tablist"); w.setAttribute("aria-label", "Live football games");
    list.forEach(function (x) { if (ids[x.id]) return; ids[x.id] = 1;
      var on = x.id === g.id, b = el("button", "fd-chip" + (on ? " on" : "")); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", on ? "true" : "false");
      var v = scoreRaw(x.id) || {}, c1 = bx.live[x.id], fs = c1 && c1.sum && Date.now() - (c1.sumAt || 0) < 120000 ? fdSumScore(x.id, c1.sum) : null;
      if (fs) v = { a: fs.a, h: fs.h, detail: v.detail };  // the same held score as the page below
      var show = boxShown(x) && v.a != null && !isNaN(v.a);
      ["away", "home"].forEach(function (sd) { var r = el("span", "fd-cr"); r.appendChild(el("b", null, abbr(x, sd))); if (show) r.appendChild(el("span", null, String(sd === "away" ? v.a : v.h))); b.appendChild(r); });
      b.appendChild(el("i", null, v.detail || "Live"));
      b.setAttribute("aria-label", x.away + " at " + x.home + (show ? ", " + v.a + " to " + v.h : "") + ", " + (v.detail || "live"));
      if (!on) b.addEventListener("click", function () { openFeed(x); });
      w.appendChild(b); });
    // the switcher keeps its place between updates; the chosen game slides into view only when it's off screen
    var old = document.querySelector("#feed-body .fd-strip"), x0 = old ? old.scrollLeft : null;
    requestAnimationFrame(function () { if (x0 != null) w.scrollLeft = x0; var c = w.querySelector(".fd-chip.on"); if (!c || w.scrollWidth <= w.clientWidth) return;
      var l = c.offsetLeft - 16, r = c.offsetLeft + c.offsetWidth + 16 - w.clientWidth;
      if (x0 == null) w.scrollLeft = Math.max(0, l); else if (w.scrollLeft > l || w.scrollLeft < r) w.scrollTo({ left: Math.max(0, w.scrollLeft > l ? l : r), behavior: REDUCED ? "auto" : "smooth" }); });
    return w;
  }
  // play tags (3.35.0), all from ESPN's play data: the most important first, three at most so a row stays readable
  function fdTags(allPlays, sum, g, sideOf) {
    var out = {}, wpBy = {}, prevWp = null, pa = 0, ph = 0;
    (sum.winprobability || []).forEach(function (w) { if (w && w.playId != null && w.homeWinPercentage != null) wpBy[String(w.playId)] = w.homeWinPercentage; });
    allPlays.forEach(function (pl) {
      var pid = String(pl.id || pl.sequenceNumber || ""), ty = String((pl.type || {}).text || ""), tx = String(pl.text || ""), y = Number(pl.statYardage) || 0;
      var S = pl.start || {}, E = pl.end || {}, sd = Number(S.down) || 0, offT = String((S.team || {}).id || ""), endT = String((E.team || {}).id || ""), off = sideOf[offT] || "";
      var t = [], add = function (pri, txt, cls) { t.push({ p: pri, t: txt, c: cls || "" }); };
      var aS = pl.awayScore != null ? Number(pl.awayScore) : pa, hS = pl.homeScore != null ? Number(pl.homeScore) : ph;
      var lead0 = pa > ph ? "away" : ph > pa ? "home" : "", lead1 = aS > hS ? "away" : hS > aS ? "home" : "";
      if ((aS !== pa || hS !== ph) && lead1 !== lead0) { if (lead1) add(1, abbr(g, lead1) + " takes the lead", "hot"); else add(1, "Ties it", "hot"); }
      pa = aS; ph = hS;
      var isPen = /penalty/i.test(ty) || /PENALTY on/.test(tx), noPlay = /no play/i.test(tx) || /^penalty$/i.test(ty);
      if ((/^Rush|Rushing Touchdown/i.test(ty) && y >= 20) || (/Pass Reception|Passing Touchdown/i.test(ty) && y >= 25)) add(2, "Big play", "hot");
      var firstDown = sd && E.down === 1 && endT && endT === offT && !/Touchdown|Field Goal|Punt|Kickoff/i.test(ty);
      if (sd >= 3 && /Rush|Pass|Sack|Scramble|Touchdown/i.test(ty) && !noPlay) {
        if (firstDown || /Passing Touchdown|Rushing Touchdown/i.test(ty)) add(3, "Converted on " + ordN(sd), "good");
        else if (!/Touchdown/i.test(ty) && !(E.down === 1 && endT === offT)) add(3, "Stopped on " + ordN(sd), "bad");
      } else if (firstDown) add(7, "1st down");
      var w = wpBy[pid]; if (w != null) { if (prevWp != null && Math.abs(w - prevWp) >= 0.10) { var up = w > prevWp ? "home" : "away"; add(4, "+" + Math.round(Math.abs(w - prevWp) * 100) + "% " + abbr(g, up), "swing"); } prevWp = w; }
      if (isPen && !/^penalty$/i.test(ty)) { var m = /PENALTY on [^,]+,\s*([^,]+?),\s*(\d+)\s*yards?/i.exec(tx), dec = /declined/i.test(tx), offs = /offsetting/i.test(tx);
        add(5, "Flag" + (m ? ": " + m[1].replace(/\s+/g, " ") + (dec ? ", declined" : offs ? ", offsetting" : ", " + m[2] + " yds") : offs ? ": offsetting" : ""), "flag"); }
      var yte = Number(S.yardsToEndzone); if (sd && yte > 0 && yte <= 20) add(6, "Red zone", "rz");
      var per = Number((pl.period || {}).number) || 0, ck = String((pl.clock || {}).displayValue || ""), cm = /^(\d+):(\d+)/.exec(ck);
      if ((per === 2 || per === 4) && cm && +cm[1] * 60 + +cm[2] <= 120 && !/timeout|end |two-minute/i.test(ty)) add(8, "Two-minute drill");
      if (pid && t.length) out[pid] = t.sort(function (a, b) { return a.p - b.p; }).slice(0, 3);
    });
    return out;
  }
  function renderFeed(fromPoll) {
    var body = $("feed-body"); if (!body) return;
    // an update never rebuilds the page under a moving finger or mid-scroll (it would stop the scroll and jolt the score bar): it waits for stillness
    if (fromPoll && (FD.drag || FD.touch || Date.now() - (FD.scrollAt || 0) < 700)) { clearTimeout(FD.rt); FD.rt = setTimeout(function () { renderFeed(true); }, 300); return; }
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
    var tags = fdTags(allPlays, sum, g, sideOf);
    var last = allPlays[allPlays.length - 1] || null, over = st.state === "post";
    // possession and the spot: the latest play's end (a score or kickoff leaves no down to show)
    var spot = null; for (var j = allPlays.length - 1; j >= 0 && !spot; j--) { var e = allPlays[j].end || {}; if (e.possessionText || e.yardLine != null) spot = { e: e, p: allPlays[j] }; }
    // between quarters' halves (halftime, end of regulation) nobody has the ball yet: no spot, no possession mark
    if (last && /End Period|End of Half|End of Game|End of Regulation/i.test(String((last.type || {}).text || "")) && /half|end/i.test(String(st.shortDetail || st.detail || ""))) spot = null;
    var posTid = spot ? String(((spot.e.team || {}).id) || ((((spot.p.start || {}).team) || {}).id) || "") : "", posSide = sideOf[posTid] || "";
    // the scorebug
    var shown = fdSumScore(g.id, sum); if (shown) { scoreOf.away = shown.a; scoreOf.home = shown.h; }
    var bug = el("div", "fd-bug"), aS = Number(scoreOf.away), hS = Number(scoreOf.home);
    ["away", "mid", "home"].forEach(function (sd) {
      if (sd === "mid") { var mid = el("div", "fd-mid"); var per = Number((comp.status || {}).period) || 0, ht = /half/i.test(String(st.shortDetail || ""));
        var sd0 = spot && !over ? Number(spot.e.down) || 0 : 0;
        mid.appendChild(el("b", null, over ? "Final" : ht ? "Half" : st.state === "pre" ? timeText(g.start) : ((comp.status || {}).displayClock || ""))); if (!over) mid.appendChild(el("i", null, ht ? "Halftime" : per > 4 ? "OT" : per ? ordN(per) : "")); if (sd0 && spot.e.shortDownDistanceText) mid.appendChild(el("em", "fd-mdd", String(spot.e.shortDownDistanceText))); bug.appendChild(mid); return; }
      var tm = el("div", "fd-tm fd-tm-" + sd); tm.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      // compact: the badge, then the record with the ball beside whoever has it (the full name is in the badge's label)
      var nm = el("b", null, recOf[sd] || ""); nm.setAttribute("aria-label", short(g, sd) + (recOf[sd] ? ", " + recOf[sd] : "")); if (!over && posSide === sd) { var bl = el("i", "fd-ball"); bl.setAttribute("aria-label", "has the ball"); nm.appendChild(bl); } tm.appendChild(nm);
      var scn = el("b", "fd-sc" + ((sd === "away" ? aS < hS : hS < aS) ? " trail" : ""), String(scoreOf[sd] != null ? scoreOf[sd] : "–"));
      if (sd === "away") { bug.appendChild(tm); bug.appendChild(scn); } else { bug.appendChild(scn); bug.appendChild(tm); }
    });
    body.appendChild(bug);
    // the scorebug stays on screen under the top bar while the plays scroll
    var hdr = document.querySelector("#pane-r > header.top"); $("view-feed").style.setProperty("--fd-top", (hdr ? hdr.offsetHeight : 0) + "px");
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
    var wpHost = body.lastChild && body.lastChild.classList.contains("fd-field") ? body.lastChild : body;  // win probability sits in the field's card
    // ESPN's win probability after the latest play
    var wp = (sum.winprobability || [])[(sum.winprobability || []).length - 1];
    if (!over && wp && wp.homeWinPercentage != null) {
      var hp = Math.round(wp.homeWinPercentage * 100), ap = 100 - hp, wr = el("div", "fd-wp");
      wr.appendChild(el("span", null, abbr(g, "away") + " " + ap + "%"));
      var bar = el("span", "fd-wpb"), ba = el("i"), bh = el("i"); ba.style.width = ap + "%"; ba.style.background = fdTint(g, "away"); bh.style.width = hp + "%"; bh.style.background = fdTint(g, "home"); bar.appendChild(ba); bar.appendChild(bh); wr.appendChild(bar);
      wr.appendChild(el("span", null, hp + "% " + abbr(g, "home")));
      wr.setAttribute("aria-label", "ESPN win probability: " + abbr(g, "away") + " " + ap + " percent, " + abbr(g, "home") + " " + hp + " percent");
      var wl = el("p", "fd-wpl", "Win probability (ESPN)"); wpHost.appendChild(wl); wpHost.appendChild(wr);
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
        var tg = tags[String(pl.id || pl.sequenceNumber || "")]; if (tg) { var tw = el("div", "fd-tags"); tg.forEach(function (x) { tw.appendChild(el("span", "fd-tag" + (x.c ? " " + x.c : ""), x.t)); }); card.appendChild(tw); }
        card.appendChild(el("p", "fd-pt", rd.title));
        var lines = fdLines(fdClean(pl.text), rd.title); if (lines.length) { var px = el("div", "fd-px"); lines.forEach(function (l) { px.appendChild(el("p", null, l)); }); card.appendChild(px); }
        rd.ps.forEach(function (o) { var psd = sideOf[o.P.tid] || "away", row = el("div", "fd-pl"); row.appendChild(fdJersey(g, psd, o.P)); var nmw = el("span", "fd-pn"); nmw.appendChild(el("b", null, fdShort(o.P))); var pos = fdPos(o.P, g.league); if (pos) nmw.appendChild(el("em", "fd-pos", pos)); var lnx = fdLine(o.P, o.k); if (lnx) nmw.appendChild(el("i", null, lnx)); row.appendChild(nmw); card.appendChild(row); });
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

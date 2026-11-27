  // ---------- Live feed (3.31.0): one live football game, play by play (after the Real app) ----------
  // A switcher of the other live games, the scorebug, the field (ball, line of scrimmage, line to gain) and every play, newest first,
  // from ESPN's game summary every 8 seconds while the page is open. Player lines are their game so far, from the same summary.
  var FD = { id: null, sum: null, at: 0, t: null, busy: false, seen: null, more: false };
  function feedBtn(g) {
    // 3.69.4 (DJ): a finished game keeps its feed. Nothing is saved by Slate: ESPN still serves every play, so the page reads it back
    var done = !feedLive(g), foot = BX_SPORT[g.league] === "football", socc = BX_SPORT[g.league] === "soccer";
    var b = el("button", "feed-go" + (done ? " feed-done" : "")); b.type = "button"; if (!done) b.appendChild(el("i", "lo-dot")); var t = el("span"); t.appendChild(el("b", null, done ? "Game feed" : "Live feed")); t.appendChild(el("em", null, socc ? (done ? "The goals and cards, or every event" : "Goals, cards, subs and shots as they happen") : BX_SPORT[g.league] === "hockey" ? (done ? "The goals and penalties, or every play" : "Goals, penalties, shots and hits as they happen") : BX_SPORT[g.league] === "baseball" ? (done ? "The scoring plays, or every at-bat" : "Every at-bat, with the count and who's on base") : !done ? "Every play as it happens" : foot ? "The scoring plays, or every play" : "Every play, from the final buzzer back")); b.appendChild(t); b.appendChild(icon("more"));
    b.setAttribute("aria-label", "Open the " + (done ? "game" : "live") + " feed for " + (socc ? g.home + " v " + g.away : g.away + " at " + g.home));
    b.addEventListener("click", function (e) { e.stopPropagation(); openFeed(g); }); return b;
  }
  function feedHas(g) { return !!g && !g.custom && (BX_SPORT[g.league] === "football" || BX_SPORT[g.league] === "bball" || BX_SPORT[g.league] === "soccer" || BX_SPORT[g.league] === "hockey" || BX_SPORT[g.league] === "baseball"); }  /* soccer since 3.87.0 (147-live-feed-soccer.js), hockey since 3.88.0 (148-live-feed-hockey.js) */
  function feedLive(g) { return feedHas(g) && status(g).kind === "live"; }
  function feedOk(g) { if (!feedHas(g)) return false; var k = status(g).kind; return k === "live" || k === "over"; }  // basketball since 3.37.0 (146-live-feed-hoops.js)
  // a finished football game opens on its scoring plays, a finished soccer match on its key events (3.87.0)
  function fdQuietStart(g) { var sp = BX_SPORT[g.league]; return (sp === "football" || sp === "soccer" || sp === "hockey" || sp === "baseball") && status(g).kind === "over"; }
  function feedGame() { var id = state.feedId; return id ? games().filter(function (x) { return x.id === id; })[0] || null : null; }
  function openFeed(g) {
    if (!g) return; state.boxOpen = state.boxOpen || {}; state.boxOpen[g.id] = true;
    if (state.view !== "feed") { FD.from = g.id;
      // 3.70.0 (DJ): which live games the switcher and the swipe go through depends on where you opened the feed. All games on a league's tab: that league.
      // All games on All, Live or My teams: every live game. Anywhere else: your slate when the game is on it, else the game's league.
      FD.scope = state.view === "games" && LEAGUES[state.league] ? state.league : inLineup(g.id) ? "slate" : g.league; }  /* DJ, Nov 17: the "All" tab is gone, so All games' own ALL tab opens the feed on My slate or the game's league */  // 3.66.9: the game the page was opened from stays in the switcher  // opening the feed is asking to see the score
    if (state.feedId !== g.id) { var c0 = bx.live[g.id]; state.feedId = g.id; clearTimeout(FD.dt); FD.bufs = FD.bufs || {}; Object.keys(FD.bufs).forEach(function (k) { if (k !== g.id) delete FD.bufs[k]; });
      FD.sum = fdDelay(g.id) ? ((FD.last || {})[g.id] || null) : ((c0 && c0.sum) || null); /* a delayed game comes back where you left it, not at ESPN's latest */ FD.id = FD.sum ? g.id : null; FD.seen = null; FD.more = 0; FD.scOnly = fdQuietStart(g); /* a finished football game opens on its scoring plays */ FD.sig = null; FD.err = 0; clearTimeout(FD.t); FD.t = null; }
    if (state.view === "feed") { renderFeed(); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0); } else { FD.more = 0; FD.scOnly = fdQuietStart(g); openSub("feed"); }  // coming back to the page starts folded up
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
    return [(dr.previous || []).length, cur.id, (cur.plays || []).length, pl.id, pl.awayScore, pl.homeScore, st.displayClock, st.period, (st.type || {}).state, (comp.competitors || []).map(function (k) { return k.score; }).join("-"), (sum.winprobability || []).length, (sum.plays || []).length, hpPid((sum.plays || [])[(sum.plays || []).length - 1] || {}), (sum.commentary || []).length, (sum.keyEvents || []).length, String(((((sum.boxscore || {}).teams || [])[0] || {}).statistics || []).map(function (x) { return x.displayValue; }))].join("|");
  }
  // ---- the delay (3.69.0, DJ: "It's faster than the game on TV") ----
  // Set per game from the page (0 to 90 seconds, in fives), remembered on this phone for that game only; a game nobody has set starts
  // with none. What ESPN sends is held and shown that many seconds after it arrived: the plays, the score bar, the timer, the box score.
  function fdDelays() { try { return JSON.parse(localStorage.getItem("slate-feed-delay") || "{}") || {}; } catch (e) { return {}; } }
  function fdDelay(id) { var v = Number(fdDelays()[id]) || 0; return Math.max(0, Math.min(90, v)); }
  function fdSetDelay(id, secs) {
    var m = fdDelays(); secs = Math.max(0, Math.min(90, Math.round(secs / 5) * 5)); if (secs) m[id] = secs; else delete m[id];
    var live = {}; games().forEach(function (x) { live[x.id] = 1; }); Object.keys(m).forEach(function (k) { if (!live[k]) delete m[k]; });  // only today's games are kept
    try { localStorage.setItem("slate-feed-delay", JSON.stringify(m)); } catch (e) {}
  }
  function fdTake(g, sum) {
    FD.bufs = FD.bufs || {}; var B = FD.bufs[g.id] || (FD.bufs[g.id] = []), sg = fdSig(sum);
    if (!B.length || B[B.length - 1].sig !== sg) B.push({ t: Date.now(), sum: sum, sig: sg });
    // when each newest play first reached this page, so the "Last play" timer can count the delay too (DJ, Nov 17)
    try { FD.keyAt = FD.keyAt || {}; var KA = FD.keyAt[g.id] || (FD.keyAt[g.id] = {}), kk = fdLastAt(sum).key; if (!KA[kk]) { KA[kk] = Date.now(); var ks = Object.keys(KA); if (ks.length > 120) ks.sort(function (x, y) { return KA[x] - KA[y]; }).slice(0, ks.length - 120).forEach(function (k) { delete KA[k]; }); } } catch (e) {}
    if (B.length > 60) B.splice(0, B.length - 60);
    return fdRelease(g);
  }
  // puts the newest update that is old enough on the page; true when what's shown changed. It never steps backwards: after the delay
  // is turned up, the page holds where it is until the game catches up
  function fdRelease(g) {
    clearTimeout(FD.dt); FD.bufs = FD.bufs || {}; FD.last = FD.last || {};
    var B = FD.bufs[g.id] || [], d = fdDelay(g.id) * 1000, now = Date.now(), pick = null;
    B.forEach(function (e) { if (e.t <= now - d) pick = e; });
    if (!pick && !(FD.id === g.id && FD.sum)) pick = B[0] || null;  // the first look at a game shows what ESPN has now
    if (pick) B.splice(0, B.indexOf(pick));
    var changed = false;
    if (pick && (FD.id !== g.id || FD.sig !== pick.sig || !FD.sum)) { FD.sum = pick.sum; FD.sig = pick.sig; FD.id = g.id; FD.last[g.id] = pick.sum; changed = true; }
    var nx = null; B.forEach(function (e) { if (e !== pick && e.t > now - d && (nx == null || e.t < nx)) nx = e.t; });
    if (nx != null && state.view === "feed") FD.dt = setTimeout(function () { var g2 = feedGame(); if (g2 && g2.id === g.id && state.view === "feed" && fdRelease(g2)) renderFeed(true); }, Math.max(250, nx + d - now + 30));
    return changed;
  }
  // the control, on the right of the "Last play" line: minus, the delay, plus
  // The delay control (3.69.3, DJ). A "Delay" pill on the "Last play" line opens and closes a slider under it: 0 to 90 seconds in steps of 5, with Off beside it.
  // Closed, the pill shows the delay ("Delay 30s") and an × next to it turns it off in one tap. History: + and − (3.69.0) were too fiddly; always-showing chips (3.69.2) couldn't be hidden.
  function fdKeepY(fn) { var sc = isDuo ? $("pane-r") : null, y = sc ? sc.scrollTop : (window.scrollY || 0); fn(); if (sc) sc.scrollTop = y; else window.scrollTo(0, y); }
  function fdDelayPick(g, v, close) { fdSetDelay(g.id, v); fdRelease(g); if (close) FD.dlOpen = null; fdKeepY(renderFeed); }
  function fdDelayCtl(g) {
    var d = fdDelay(g.id), open = FD.dlOpen === g.id, w = el("span", "fd-dlw"), b = el("button", "fd-scf fd-dlb" + (d ? " on" : ""), d ? "Delay " + d + "s" : "Delay"); b.type = "button";
    b.setAttribute("aria-expanded", open ? "true" : "false");
    b.addEventListener("click", function () { FD.dlOpen = open ? null : g.id; fdKeepY(renderFeed); });
    w.appendChild(b);
    if (d > 0 && !open) { var x = el("button", "fd-scf fd-dlx", "×"); x.type = "button"; x.setAttribute("aria-label", "Turn the delay off"); x.addEventListener("click", function () { fdDelayPick(g, 0, true); }); w.appendChild(x); }
    return w;
  }
  function fdDelayRow(g) {
    if (FD.dlOpen !== g.id) return null;
    var d = fdDelay(g.id), w = el("div", "fd-dlrow"), off = el("button", "fd-dlc" + (d ? "" : " on"), "Off"); off.type = "button";
    off.addEventListener("click", function () { fdDelayPick(g, 0, true); });
    var r = document.createElement("input"); r.type = "range"; r.className = "fd-dlr"; r.min = "0"; r.max = "90"; r.step = "5"; r.value = String(d); r.setAttribute("aria-label", "Delay the feed, in seconds");
    var v = el("b", "fd-dlv" + (d ? " on" : ""), d ? d + "s" : "Off");
    r.addEventListener("input", function () { var n = +r.value || 0; v.textContent = n ? n + "s" : "Off"; v.classList.toggle("on", n > 0); off.classList.toggle("on", !n);
      var pill = document.querySelector("#feed-body .fd-dlb"); if (pill) { pill.textContent = n ? "Delay " + n + "s" : "Delay"; pill.classList.toggle("on", n > 0); } });
    r.addEventListener("change", function () { fdDelayPick(g, +r.value || 0, false); });  /* the slider stays open; the pill closes it */
    /* sliding sideways here must not swipe to the next game or go Back */
    ["touchstart", "touchmove"].forEach(function (n) { w.addEventListener(n, function (e) { e.stopPropagation(); }, { passive: true }); });
    w.appendChild(off); w.appendChild(r); w.appendChild(v);
    return w;
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
      if (sum) { FD.err = 0; FD.at = Date.now(); cur.sum = sum; cur.sumAt = Date.now(); changed = fdTake(g, sum); }
      else FD.err = (FD.err || 0) + 1;
      if (state.view === "feed" && changed) renderFeed(true);  // nothing new: leave the page alone
      var st = ((((sum || {}).header || {}).competitions || [])[0] || {}).status || {}, k = (st.type || {}).state, det = String((st.type || {}).shortDetail || st.type && st.type.detail || "");
      var brk = /half|end of|delay/i.test(det) || /End Period|End of Half/i.test(String(((((sum || {}).drives || {}).current || {}).plays || []).slice(-1).map(function (p) { return (p.type || {}).text; })[0] || ""));
      var wait = !sum ? Math.min(60000, 6000 * Math.pow(2, Math.min(FD.err, 4))) : k === "post" ? 120000 : k === "pre" ? 30000 : brk ? 12000 : BX_SPORT[g.league] === "soccer" ? 8000 : 4000;  /* soccer's commentary moves slower than a play clock */
      if (state.view === "feed") FD.t = setTimeout(feedPoll, wait);
      if (sum) fdPrefetch(g);
    }, function () { FD.busy = false; FD.err = (FD.err || 0) + 1; if (state.view === "feed") FD.t = setTimeout(feedPoll, Math.min(60000, 6000 * Math.pow(2, Math.min(FD.err, 4)))); });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && state.view === "feed") feedPoll(); });
  (function () {
    var mark = function () { if (state.view === "feed") FD.scrollAt = Date.now(); };
    window.addEventListener("scroll", mark, { passive: true }); var pr = $("pane-r"); if (pr) pr.addEventListener("scroll", mark, { passive: true });
    // 3.73.1 (DJ: "the score banner gets stuck sometimes when scrolling"): when the thing under your finger is redrawn mid-touch, the browser sends the
    // touch's end only to that removed element, never to the document. The page then believed a finger was still down forever: updates stopped (a stale
    // clock) and the pull-down below stayed pulled (a gap above the banner). So the end is also listened for on the touched element itself, every
    // new touch first lets go of anything left over, and a "finger down" older than 10 seconds no longer holds updates back.
    var fdLetGo = function () { FD.touch = false; fdPeekEnd(); };
    document.addEventListener("touchstart", function (e) { fdPeekEnd(); FD.touch = true; FD.touchAt = Date.now();
      var t = e.target; if (t && t.addEventListener) ["touchend", "touchcancel"].forEach(function (n) { t.addEventListener(n, function () { if (!document.documentElement.contains(t)) fdLetGo(); }, { passive: true, once: true }); });
    }, { passive: true, capture: true });
    document.addEventListener("touchmove", function () { FD.touchAt = Date.now(); }, { passive: true, capture: true });
    // the folded Duo (3.36.6): the clock and Wi-Fi can sit on the right end of the pinned score bar. Pulling down while it's
    // pinned slides the bar down below them (at most 56 points); it springs back when you let go. At the top of the page,
    // the page itself pulls down (iOS's bounce)
    var pk = null;
    function fdPeekEnd() { if (!pk) return; var b = pk.bug; pk = null; b.style.transition = "transform .25s cubic-bezier(.2,.8,.2,1)"; b.style.transform = ""; setTimeout(function () { b.style.transition = ""; }, 260); }
    document.addEventListener("touchstart", function (e) {
      var h = document.documentElement;
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
    ["touchend", "touchcancel"].forEach(function (n) { document.addEventListener(n, fdPeekEnd, { passive: true }); });
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
  // 3.177.0 (DJ: "I don't think I want player stats to continue to update on past live feed plays"): a player's stat line stays live only on
  // his newest play. On every older play it keeps what it read when that play was his newest (ESPN's own box numbers, saved per game on this
  // phone). A play from before the feed was first opened has no saved line, so it shows none rather than a later total.
  var FZ = { id: null, snap: {}, latest: {}, on: false, dirty: false };
  function fdFzStart(g) {
    var id = String((g && g.id) || "");
    if (FZ.id !== id) { FZ.id = id; FZ.snap = {}; try { FZ.snap = JSON.parse(localStorage.getItem("slate-fd-fz-" + id) || "{}") || {}; } catch (e) { FZ.snap = {}; } }
    FZ.latest = {}; FZ.on = !!id; FZ.dirty = false;
  }
  // called newest play first, for every play (also the ones a filter hides): the first play seen for a player is his newest
  function fdFzMark(key, pid) { if (FZ.on && key && pid && FZ.latest[key] == null) FZ.latest[key] = pid; }
  function fdFzLine(pid, key, live) {
    if (!FZ.on || !key || !pid || FZ.latest[key] == null) return live;
    var k = pid + "|" + key;
    if (FZ.latest[key] === pid) { if (live && FZ.snap[k] !== live) { FZ.snap[k] = live; FZ.dirty = true; } return live; }
    return FZ.snap[k] || "";
  }
  function fdFzEnd() {
    var was = FZ.on; FZ.on = false; if (!was || !FZ.dirty) return;
    try {
      localStorage.setItem("slate-fd-fz-" + FZ.id, JSON.stringify(FZ.snap));
      var ids = []; try { ids = JSON.parse(localStorage.getItem("slate-fd-fz-ids") || "[]") || []; } catch (e) { ids = []; }
      ids = ids.filter(function (x) { return x !== FZ.id; }); ids.push(FZ.id);
      while (ids.length > 4) localStorage.removeItem("slate-fd-fz-" + ids.shift());
      localStorage.setItem("slate-fd-fz-ids", JSON.stringify(ids));
    } catch (e) {}
  }
  function fdLine(P, first) {
    var s = P.st, n = function (v) { return parseFloat(v) || 0; }, part = {};
    if (s.passing && n(String(s.passing["C/ATT"]).split("/")[1])) { var p = s.passing; part.passing = p["C/ATT"] + ", " + p.YDS + " yds" + (n(p.TD) ? ", " + p.TD + " TD" : "") + (n(p.INT) ? ", " + p.INT + " INT" : ""); }
    if (s.rushing && n(s.rushing.CAR)) { var r = s.rushing; part.rushing = r.CAR + " car, " + r.YDS + " yds" + (n(r.TD) ? ", " + r.TD + " TD" : ""); }
    // 3.68.10 (DJ: receivers on incompletions showed no stats): a receiver with targets and no catch yet reads "0 rec, 2 tgt"; when the
    // play is a pass to him, his targets are added to his catches and yards
    if (s.receiving && (n(s.receiving.REC) || n(s.receiving.TGTS))) { var c = s.receiving, tg = c.TGTS != null && n(c.TGTS) ? ", " + n(c.TGTS) + " tgt" : "";
      part.receiving = n(c.REC) ? c.REC + " rec, " + c.YDS + " yds" + (n(c.TD) ? ", " + c.TD + " TD" : "") + (first === "receiving" ? tg : "") : "0 rec" + tg; }
    if (s.defensive && (n(s.defensive.TOT) || n(s.defensive.SACKS))) { var d = s.defensive; part.defensive = n(d.TOT) + " tkl" + (n(d.SACKS) ? ", " + d.SACKS + " sk" : ""); }
    if (s.interceptions && n(s.interceptions.INT)) part.interceptions = s.interceptions.INT + " INT";
    if (s.kicking && s.kicking.FG) part.kicking = "FG " + s.kicking.FG + (s.kicking.XP ? ", XP " + s.kicking.XP : "");
    var order = [first, "passing", "rushing", "receiving", "interceptions", "defensive", "kicking"], out = [];
    order.forEach(function (k) { if (k && part[k] && out.indexOf(part[k]) < 0) out.push(part[k]); });
    // nobody is shown without a line: a player the box score has nothing for yet in what this play is about has none of it so far
    if (!out.length) return first === "receiving" ? "0 rec" : first === "rushing" ? "0 car" : first === "passing" ? "0/0, 0 yds" : first === "defensive" ? "0 tkl" : first === "interceptions" ? "0 INT" : "";
    return out.slice(0, 2).join(" · ");
  }
  // the NFL's own team codes in ESPN's play text, turned into the ones on the scoreboard (3.73.1, DJ: "Timeout BLT" should read BAL)
  var FD_NFL_AB = { BLT: "BAL", HST: "HOU", CLV: "CLE", ARZ: "ARI" };
  function fdAb(t) { return String(t || "").replace(/\b(BLT|HST|CLV|ARZ)\b/g, function (m) { return FD_NFL_AB[m]; }); }
  // 3.170.1 (DJ: "intended for Goff ... don't seem right"): the NFL opens some plays with a note that isn't the play, "L.Borom reported in as eligible."
  // or "J.Fields in at QB.". Read as part of the play, its name was taken for the passer and the passer for the target. The note comes off first.
  // A replay review: when the call was reversed, the NFL writes the first ruling, then the review, then the play as it now stands. Only that last
  // part is the play. When the call was upheld the review sentence is dropped.
  function fdRev(t) { t = String(t || ""); var k = t.search(/and the play was REVERSED\.?/i); if (k >= 0) { var rest = t.slice(k).replace(/^and the play was REVERSED\.?\s*/i, ""); if (/[A-Za-z]{3}/.test(rest)) t = rest; }
    return t.replace(/(^|\.)\s*(?:The Replay Official reviewed|[A-Z][A-Za-z ]*? challenged)[^.]*?(?:[Uu]pheld|UPHELD|[Cc]onfirmed|CONFIRMED|stands|STANDS)\.\s*(?:The ruling on the field (?:stands|is confirmed)\.?\s*)?/g, "$1 ").replace(/\((?:Timeout #\d[^)]*)\)\s*/gi, " ").replace(/\s*\.?\s*\*\* Injury Update:[^*]*$/i, "").replace(/\b(ran|pushed|out of bounds|goes) ob\b/g, function (_, w) { return w === "ran" ? "ran out of bounds" : w === "pushed" ? "pushed out of bounds" : w + " out of bounds"; }); }
  function fdPre(t) { return fdRev(t).replace(/(?:[A-Z][a-z]{0,2}\.(?:St\. ?)?[A-Za-z'\-]+|#?\d+(?:-[A-Z][a-z]{0,2}\.[A-Za-z'\-]+)?)(?:,? (?:and )?(?:[A-Z][a-z]{0,2}\.(?:St\. ?)?[A-Za-z'\-]+|#?\d+))* (?:reported in as eligible|reports? as eligible|in at (?:QB|quarterback))\.\s*/gi, " ").replace(/Direct snap to [A-Z][a-z]{0,2}\.[A-Za-z'\-]+\.\s*/gi, " "); }
  function fdClean(t) { return fdAb(fdPre(t)).replace(/^\s+/, "").replace(/^\s*\(\d{1,2}:\d\d\)\s*/, "").replace(/^\s*\((?:No Huddle|Shotgun|No Huddle, Shotgun|[A-Za-z ]*formation)[^)]*\)\s*/i, "").trim(); }
  // ESPN's play text, cleaned up (3.36.8): one short line per part, in plain sentence case. "B.Purdy pass short right to
  // C.McCaffrey for 66 yards, TOUCHDOWN. TWO-POINT CONVERSION ATTEMPT. ... ATTEMPT SUCCEEDS.PENALTY on DAL-J.Porter, ..."
  // becomes "Purdy pass short right to McCaffrey, 66 yds" and "2-pt good: Purdy to McCaffrey". Penalties are left to the Flag tag.
  function fdLines(raw, title) {
    var t = fdPre(raw).replace(/\s+/g, " ").replace(/\bSt\. (?=[A-Z])/g, "St\u0001").trim(); if (!t) return [];  /* "A.St. Brown" is one name, not the end of a sentence */
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
      seg = seg.replace(/\b([A-Z]{2,4})-([A-Z][a-z]{0,2}\.[A-Za-z'\-]+)/g, "$2 ($1)");  // "DET-T.Ratledge was injured" -> "Ratledge (DET) was injured"
      seg = cap(low(nm(seg)));
      // "Gibbs left tackle, 1 yds" read like a position (DJ): the direction of a run is said as one, and one yard is "1 yd"
      seg = seg.replace(/^(\S+(?: \S+)?) (left|right) (tackle|guard|end)\b/, function (_, who, sd2, gap) { return who + (/scrambles$/.test(who) ? " " : " runs ") + (gap === "end" ? "around " : gap === "guard" ? "behind " : "off ") + sd2 + " " + gap; }).replace(/^(\S+(?: \S+)?) up the middle\b/, function (_, who) { return who + (/scrambles$/.test(who) ? "" : " runs") + " up the middle"; }).replace(/(^|[^\d])(-?1) yds\b/g, "$1$2 yd");
      seg = seg.replace(/\u0001/g, ". ").replace(/,? Center-[A-Za-z.'\-]+/g, "");
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
    var a = names[0], b = names[1], m, out = { title: ty || "Play", ps: [], kind: "", offTid: offTid };
    // a pass: the passer and the target come from "X pass ... to Y" itself, not from the order the names turn up in
    if (/pass/i.test(ty) && !/interception/i.test(ty)) { var NM2 = "([A-Z][a-z]{0,2})\\.((?:St\\. ?)?[A-Z][A-Za-z'\\-]+)", pm = new RegExp(NM2 + " pass (?:incomplete )?[^.]*? (?:to|intended for) " + NM2).exec(src);
      if (pm) { var pa2 = fdFind(ix, pm[1], pm[2], offTid), pb2 = fdFind(ix, pm[3], pm[4], offTid); if (pa2 && pb2 && pa2.id !== pb2.id) { a = pa2; b = pb2; } } }
    // an interception: the second name in the text is the receiver the pass was meant for. The man who caught it is the one after "INTERCEPTED by"
    // (before 3.170.1 the card said "Intercepted by" the intended receiver).
    if (/interception/i.test(ty)) { var im = /INTERCEPTED by ([A-Z][a-z]{0,2})\.((?:St\. ?)?[A-Z][A-Za-z'\-]+)/i.exec(src), IP = im ? fdFind(ix, im[1], im[2], "") || fdFind(ix, im[1], im[2], offTid) : null; b = IP && (!a || IP.id !== a.id) ? IP : null; }
    var lead = function (P, k) { if (P) out.ps.push({ P: P, k: k }); };
    if (/^(End Period|End of Half|End of Game|Two-minute warning|Official Timeout|Timeout|End of Regulation)/i.test(ty)) { out.note = true; out.title = /two-minute/i.test(ty) ? "Two-minute warning" : /timeout/i.test(ty) ? (/official/i.test(ty) ? "TV timeout" : "Timeout" + ((m = /Timeout #\d+ by ([A-Z]{2,4})/i.exec(tx)) ? " " + m[1] : "")) : tx.replace(/^END /, "End of ").replace(/QUARTER/i, "quarter").replace(/HALF/i, "half").replace(/GAME/i, "game"); return out; }
    if (/Passing Touchdown/i.test(ty)) { out.kind = "score"; out.title = "TD: " + (a && b ? ln(a) + " to " + ln(b) + ", " : "pass, ") + ya(y); lead(a, "passing"); lead(b, "receiving"); }
    else if (/Rushing Touchdown/i.test(ty)) { out.kind = "score"; out.title = "TD: " + (a ? ln(a) + " run, " : "run, ") + ya(y); lead(a, "rushing"); }
    else if (/Touchdown/i.test(ty)) { out.kind = "score"; out.title = /interception/i.test(ty) ? "Pick six!" : /fumble/i.test(ty) ? "Fumble return touchdown!" : /punt|kick/i.test(ty) ? "Return touchdown!" : "Touchdown!"; lead(b || a, /interception/i.test(ty) ? "interceptions" : "defensive"); out.teamP = b || a || null; if (!out.teamP && /interception|fumble/i.test(ty)) out.def = true; }
    else if (/Pass Reception/i.test(ty)) { out.title = (a && b ? ln(a) + " to " + ln(b) : "Pass complete") + (y > 0 ? " for " + ya(y) : y < 0 ? ", loss of " + ya(y) : ", no gain"); lead(a, "passing"); lead(b, "receiving"); }
    else if (/spiked the ball/i.test(tx)) { out.title = "Spike to stop the clock"; lead(a, "passing"); }
    else if (/\bkneels\b/i.test(tx)) { out.title = (a ? ln(a) + " kneels" : "Kneel-down"); }
    else if (/Pass Incompletion/i.test(ty)) { out.title = "Incomplete" + (b ? ", intended for " + ln(b) : ""); lead(a, "passing"); lead(b, "receiving"); }
    else if (/^Rush/i.test(ty)) { out.title = a ? ln(a) + (y > 0 ? " runs for " + ya(y) : y < 0 ? " loses " + ya(y) : ", no gain") : (y > 0 ? "Run for " + ya(y) : y < 0 ? "Run, loss of " + ya(y) : "Run, no gain"); lead(a, "rushing"); }
    else if (/Sack/i.test(ty)) { out.title = (a ? ln(a) + " sacked" : "Sack") + (y < 0 ? " for a loss of " + ya(y) : "") + (/fumble/i.test(ty) ? ", fumble" : ""); if (/fumble/i.test(ty)) out.kind = "turn"; lead(a, "passing"); lead(b, "defensive"); out.def = true; }
    else if (/Interception/i.test(ty)) { out.kind = "turn"; out.title = "Intercepted" + (b ? " by " + ln(b) : ""); lead(a, "passing"); lead(b, "interceptions"); out.def = true; }
    else if (/Fumble/i.test(ty)) { out.kind = /opp/i.test(ty) ? "turn" : ""; out.title = "Fumble" + (/opp/i.test(ty) ? ", recovered by the defense" : ", recovered by the offense"); lead(a, "rushing"); if (/opp/i.test(ty)) out.def = true; }
    else if (/Field Goal Good/i.test(ty)) { out.kind = "score"; out.title = "Field goal is good" + ((m = /(\d+) yard field goal/i.exec(tx)) ? " from " + m[1] + " yards" : ""); lead(a, "kicking"); }
    else if (/Field Goal|Blocked/i.test(ty) && /miss|block|no good/i.test(ty + tx)) { out.title = (/block/i.test(ty + tx) ? "Field goal blocked" : "Field goal missed") + ((m = /(\d+) yard field goal/i.exec(tx)) ? " from " + m[1] + " yards" : ""); lead(a, "kicking"); }
    else if (/Safety/i.test(ty)) { out.kind = "score"; out.title = "Safety!"; out.def = true; }
    else if (/Punt/i.test(ty)) { out.title = "Punt" + ((m = /punts (\d+) yards?/i.exec(tx)) ? ", " + m[1] + " yards" : "") + (/touchback/i.test(tx) ? ", touchback" : /fair catch/i.test(tx) ? ", fair catch" : /MUFFS/.test(tx) ? ", muffed" : ""); }
    else if (/Kickoff/i.test(ty) && /kicks onside/i.test(tx)) { out.title = "Onside kick"; out.noTeam = true; }
    else if (/Kickoff/i.test(ty)) { out.title = "Kickoff" + (/touchback/i.test(tx) ? ", touchback" : y > 0 && b ? ", " + ln(b) + " returns it " + ya(y) : ""); out.noTeam = true; }
    else if (/Penalty/i.test(ty) || /PENALTY on/.test(tx)) { out.title = (m = /PENALTY on ([A-Z]{2,4})-[^,]*, ([^,]+), (\d+) yards?/.exec(tx)) ? "Penalty on " + m[1] + ": " + m[2] + ", " + m[3] + " yards" : "Penalty"; if (/NULLIFIED/.test(tx)) out.title += " (play wiped out)"; out.noTeam = true; }
    else if (/Extra Point|Two-Point|2pt/i.test(ty)) { out.title = ty; }
    return out;
  }
  // ---- the story of each play (DJ, Nov 26: "more creativity and flair to live plays ... more than the basic sentence") ----
  // Football, worked out from ESPN's own plays and drives, nothing estimated. Per play: a banner for the big moments (a score, a turnover, a gain of
  // 20+ yards) in the team's color, the play traced on a thin field (where it started and how far it went), and one line of what it means:
  // "Cuts it to 3", "Caps an 8-play, 75-yard drive in 4:12", "Allen's 2nd TD pass today", "Longest play of the game".
  var FD_FLAIR_FOOT = true;  // DJ chose basketball first (Nov 26), then "Every sport" the same day (3.165.0): football's banner, field tracer and story line are on
  function fdPoss(n) { n = String(n || ""); return n + (/s$/i.test(n) ? "'" : "'s"); }
  // ---- the fun line (DJ, Nov 26: "spruce them up with fun sayings and some flare ... a few seconds after the current play comes through";
  // "Built in sayings, but do a lot and make them fun but accurate") ----
  // Football first. Free and built in: no Claude. Each kind of play has its own list, and a line is only used for the kind of play it is true of
  // (a "punched in" line needs a rushing touchdown of 1 or 2 yards; "three and out" needs exactly three plays, no first down, then a punt).
  // Numbers and names in a line come from the play itself. Ordinary plays get no line. A game works through each list in order from its own
  // starting point, so lines don't repeat until a list runs out. {p} the player, {q} the quarterback, {t} the offense, {d} the defense,
  // {y} the yards, {n} the distance to go.
  var FD_SAY = {
    tdShort: ["🚂 Punched in.", "🚂 Goal-line push, and {p} is in.", "🚂 Bully ball at the goal line.", "🚂 {p} would not be denied.", "🚂 Short, ugly and worth six.", "🚂 Shoved across the stripe.", "🚂 Trench warfare pays off for the {t}.", "🚂 The big fellas up front get an assist on that one.", "🚂 Knock, knock. {p} lets himself in.", "🚂 Nothing fancy, just six points.", "🚂 Heavy lifting at the goal line, and the {t} cash in.", "🚂 That's a grown-man touchdown for {p}."],
    tdRun: ["🏠 {p} finds paydirt.", "🏠 Six on the ground for the {t}.", "🏠 {p} takes it to the house from {y} out.", "🏠 {p} cashes it in.", "🏠 The ground game delivers six.", "🏠 Into the paint goes {p}.", "🏠 Call the band, the {t} just scored.", "🏠 {y} yards and six points for {p}.", "🏠 {p} punches the {t}' ticket to the end zone.", "🏠 Feed {p}, get points.", "🏠 {p} runs it in and the {d} can only watch.", "🏠 That's six the hard way, on the ground."],
    tdPass: ["🎯 Pitch and catch for six.", "🎯 {p} hauls in the score.", "🎯 Dialed up and delivered.", "🎯 {q} to {p}. Cash it.", "🎯 Six through the air.", "🎯 Money throw, money catch.", "🎯 {p} has a new souvenir.", "🎯 {q} drops it in the bucket for six.", "🎯 Paint the end zone, {p} is in.", "🎯 {q} found his man, and his man found the end zone.", "🎯 Throw, catch, celebrate.", "🎯 {p} with the grab and the six that goes with it.", "🎯 The {t} go upstairs for the score."],
    tdLong: ["🚀 See ya! {y} yards to the house.", "🚀 Gone. {y} yards, and nobody stopped it.", "🚀 House call from {y} yards out.", "🚀 {p} just took the scenic route to six: {y} yards.", "🚀 Lights out from {y} yards.", "🚀 Fire up the scoreboard, that one went {y}.", "🚀 Home run ball. {y} yards.", "🚀 {y} yards of trouble for the {d}.", "🚀 One snap, {y} yards, six points.", "🚀 {p} goes the distance. {y} yards.", "🚀 Blink and you missed it. {y} yards for the score."],
    tdDef: ["🔄 All the way back for six!", "🔄 Points without the offense on the field.", "🔄 That will swing a game.", "🔄 Going the other way, all the way.", "🔄 Six points, no offense required.", "🔄 The scoreboard changes and the offense never left the bench."],
    fgLong: ["🦵 From downtown! Good from {y}.", "🦵 Big leg. {y} yards and good.", "🦵 {p} from another zip code: {y} yards.", "🦵 Bombs away. {y} yards and true.", "🦵 Leg day paid off. Good from {y}.", "🦵 {y} yards? No sweat for {p}.", "🦵 That's a long way to kick a football. {y} yards, good.", "🦵 {y} yards and it counted. Tip your kicker."],
    fg: ["✅ Three on the board.", "✅ Split the uprights from {y}.", "✅ Right down the middle from {y}.", "✅ {p} tacks on three.", "✅ Good from {y}. Points are points.", "✅ Through the pipes from {y}.", "✅ {p} does his job. Three more.", "✅ The {t} settle for three.", "✅ Not a touchdown, but it counts. Good from {y}.", "✅ {p} is true from {y}.", "✅ Up, through, three.", "✅ The drive ends with points, and {p} gets the credit."],
    fgMiss: ["😬 No good! Empty trip for the {t}.", "😬 Nothing to show for the drive.", "😬 That one got away from {p}.", "😬 Leaves three on the field.", "😬 The uprights say no.", "😬 Missed from {y}. The {d} dodge one.", "😬 {p} would like a do-over from {y}.", "😬 Points were right there. Not anymore.", "😬 All that work, zero points."],
    fgBlock: ["✋ Blocked! The {d} got a hand on it.", "✋ Swatted at the line.", "✋ Denied. That kick never had a chance.", "✋ Return to sender."],
    sack: ["🧱 Sacked! {q} goes down.", "🧱 Nowhere to go for {q}.", "🧱 Meeting at the quarterback.", "🧱 {p} gets home.", "🧱 Lunch is served in the backfield.", "🧱 Down goes {q}, loss of {y}.", "🧱 Pressure wins that snap.", "🧱 {p} introduces himself to {q}.", "🧱 {q} ends up on the turf, loss of {y}.", "🧱 The {d} pass rush cashes in, loss of {y}.", "🧱 {q} goes for a ride he didn't ask for.", "🧱 Somebody block {p}.", "🧱 That's {y} yards the wrong way for the {t}.", "🧱 {p} with the takedown."],
    int: ["🎁 Picked!", "🎁 Wrong jersey, {q}.", "🎁 Thank you very much, says {p}.", "🎁 Gift wrapped for the {d}.", "🎁 {p} takes it away. {d} ball.", "🎁 That one will sting.", "🎁 {q} would like that one back.", "🎁 Ball hawk alert: {p}.", "🎁 {p} was the only one who caught that pass.", "🎁 Thrown by the {t}, caught by the {d}.", "🎁 {p} says that's mine.", "🎁 An early holiday present for the {d}."],
    fum: ["😱 Ball's out! {d} ball.", "😱 Put it on the ground and lost it.", "😱 Loose ball, and the {d} have it.", "😱 Coughed up.", "😱 Fumble! The {d} take it away.", "😱 The {d} pounce on it.", "😱 Hang on to the football. The {d} say thanks.", "😱 That's a giveaway the {t} can't afford.", "😱 Butterfingers. {d} ball.", "😱 The ball had other plans."],
    downs: ["🛑 Stopped! Turnover on downs.", "🛑 Gambled and lost on 4th down.", "🛑 The {d} hold on 4th down.", "🛑 Not today. {d} ball.", "🛑 Fourth-down stand by the {d}.", "🛑 Rolled the dice, came up empty.", "🛑 The {t} went for it. The {d} said no.", "🛑 Shut the door on 4th down."],
    fourth: ["🎲 Rolled the dice on 4th down and it paid off.", "🎲 Gutsy call, and it works.", "🎲 4th down? Moving the chains anyway.", "🎲 Going for it, and got it.", "🎲 Kept the offense out there and kept the drive alive.", "🎲 Fortune favors the bold.", "🎲 No punt, no problem.", "🎲 The {t} bet on themselves and won."],
    thirdLong: ["⛓️ 3rd and {n}? No problem.", "⛓️ Third and long, and they got all of it.", "⛓️ Moving the chains on 3rd and {n}.", "⛓️ That's a backbreaker on 3rd and {n}.", "⛓️ The drive stays alive on 3rd and {n}.", "⛓️ The {d} had them at 3rd and {n}. Had.", "⛓️ Needed {n}, got {y}.", "⛓️ Get off the field? Not on that one."],
    threeOut: ["🚪 Three and out.", "🚪 Three plays and a punt.", "🚪 Quick trip for the {t} offense.", "🚪 Back to the sideline after three.", "🚪 The {d} defense gets off the field in three.", "🚪 Nothing doing. Three and out.", "🚪 One, two, three, punt.", "🚪 The {t} offense barely broke a sweat. Not in a good way.", "🚪 Short shift for the {t} offense."],
    big: ["💨 Chunk play! {y} yards.", "💨 {p} breaks loose for {y}.", "💨 Big gainer. {y} yards.", "💨 Explosive. {y} yards on one snap.", "💨 That's how you flip the field: {y} yards.", "💨 {y} yards in a hurry.", "💨 Move the chains, and then some. {y} yards.", "💨 The {t} offense lands a haymaker, {y} yards.", "💨 {p} eats up {y} yards.", "💨 That's a big bite out of the field. {y} yards.", "💨 The {d} will want that one back. {y} yards.", "💨 {p} for {y}. The chain gang has to jog."],
    bomb: ["💣 Bombs away! {y} yards.", "💣 {y} yards! That's a field flipper.", "💣 Huge. {y} yards on one play.", "💣 {p} for {y}. Wake up the stadium.", "💣 Fireworks. {y} yards.", "💣 Top shelf. {y} yards.", "💣 {y} yards. Somebody check on the {d} defense.", "💣 One play, {y} yards, whole new ballgame."],
    tfl: ["🚧 Stuffed! Loss of {y}.", "🚧 Blown up in the backfield.", "🚧 Going backwards. Loss of {y}.", "🚧 Wrong direction, loss of {y}.", "🚧 Met in the backfield, loss of {y}.", "🚧 The {d} front wins that one.", "🚧 Road closed. Loss of {y}.", "🚧 {p} never got started. Loss of {y}."],
    safety: ["✌️ Safety! Two points and the ball.", "✌️ Trapped in the end zone. Two for the {d}.", "✌️ The rarest two points in football."],
    ret: ["⚡ {y}-yard return. Short field coming.", "⚡ Special teams with a spark: {y} yards.", "⚡ {p} brings it back {y}.", "⚡ Hidden yards. {y} of them.", "⚡ {p} gives the offense a head start, {y} yards."]
  };
  function fdSayPick(S, cat, v) {
    var L = FD_SAY[cat]; if (!L) return "";
    var n = S.n[cat] = (S.n[cat] || 0) + 1;
    for (var k = 0; k < L.length; k++) { var t = L[(S.seed + n - 1 + k) % L.length], ok = true;
      var o = t.replace(/\{(\w)\}/g, function (_, c) { if (v[c] == null || v[c] === "") ok = false; return v[c]; });
      if (ok) return o; }
    return "";
  }
  // 3.177.1 (DJ: "Remove the flare lines completely"): the fun sayings are off. The lines and the code stay so they can come back: set this to true.
  var FD_SAY_ON = false;
  var FD_SAY_AT = {};
  // the line comes in about 3 seconds after its play first shows, so the play itself is never held up. Its space is kept, so nothing jumps.
  function fdSayEl(pid, txt, isNew) {
    var p = el("span", "fd-say", txt); p.style.cssText = "font-weight:750;color:var(--ink);transition:opacity .5s ease";
    if (isNew && !FD_SAY_AT[pid]) FD_SAY_AT[pid] = Date.now();
    var left = FD_SAY_AT[pid] ? 3000 - (Date.now() - FD_SAY_AT[pid]) : 0;
    if (left > 0) { p.style.opacity = "0"; setTimeout(function () { p.style.opacity = "1"; }, left); }
    return p;
  }
  function fdStory(drives, g, sideOf, ix) {
    var out = {}, pa = 0, ph = 0, cnt = {}, best = 0, bump = function (k) { cnt[k] = (cnt[k] || 0) + 1; return cnt[k]; };
    var ln = function (P) { return P ? String(P.name).split(" ").slice(1).join(" ").replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/, "") || P.name : ""; };
    var other = function (sd) { return sd === "away" ? "home" : sd === "home" ? "away" : ""; };
    var seed0 = 0; String(g.id || "").split("").forEach(function (c) { seed0 = (seed0 * 31 + c.charCodeAt(0)) >>> 0; }); var SAY = { seed: seed0 % 997, n: {} };
    var snap = function (p) { return /^Rush|^Pass|Sack|Interception|Fumble/i.test(String((p.type || {}).text || "")) && !/no play/i.test(String(p.text || "")); };
    drives.forEach(function (d) {
      var dp = d.plays || [], lastSc = -1; dp.forEach(function (pl, k) { if (pl.scoringPlay) lastSc = k; });
      dp.forEach(function (pl, k) {
        var pid = String(pl.id || pl.sequenceNumber || ""), ty = String((pl.type || {}).text || ""), tx = String(pl.text || ""), y = Number(pl.statYardage) || 0;
        var aS = pl.awayScore != null ? Number(pl.awayScore) : pa, hS = pl.homeScore != null ? Number(pl.homeScore) : ph, dA = aS - pa, dH = hS - ph;
        var rd = fdRead(pl, ix), S = pl.start || {}, offSd = sideOf[rd.offTid] || "", noPlay = /no play/i.test(tx), st = { lines: [] };
        if (rd.note) { pa = aS; ph = hS; return; }
        var scSd = dA > 0 && dH <= 0 ? "away" : dH > 0 && dA <= 0 ? "home" : "", pts = dA + dH;
        if (scSd && pts > 0) {
          var word = /Field Goal/i.test(ty) ? "Field goal" : /Safety/i.test(ty) ? "Safety" : pts >= 6 ? "Touchdown" : "Points";
          st.ban = { sd: scSd, word: word, big: "+" + pts };
          var l0 = pa > ph ? "away" : ph > pa ? "home" : "", l1 = aS > hS ? "away" : hS > aS ? "home" : "", mg = Math.abs(aS - hS);
          if (!pa && !ph) st.lines.push("First points of the game");
          else if (l0 && l0 === l1) st.lines.push(l1 === scSd ? "Lead grows to " + mg : "Cuts it to " + mg);  // a lead change or a tie is already a tag
          var dm = /(\d+) plays?, (-?\d+) yards?, (\d+:\d\d)/.exec(String(d.description || ""));
          if (false && dm && k === lastSc && d.team && sideOf[String(d.team.id || "")] === scSd && +dm[1] > 1 && +dm[2] > 0) st.lines.push(  /* 3.177.0: off, the drive's own header just above the play says "13 plays, 90 yards, 7:12" */ "Caps " + (/^(8|11|18)\b/.test(dm[1]) ? "an " : "a ") + dm[1] + "-play, " + dm[2] + "-yard drive in " + dm[3]);
          var P0 = (rd.ps[0] || {}).P, P1 = (rd.ps[1] || {}).P, n;
          if (/Passing Touchdown/i.test(ty) && P0) { n = bump("ptd" + P0.id); if (n >= 2) st.lines.push(fdPoss(ln(P0)) + " " + ordN(n) + " TD pass today"); }
          if (/Passing Touchdown/i.test(ty) && P1) { n = bump("rtd" + P1.id); if (n >= 2) st.lines.push(fdPoss(ln(P1)) + " " + ordN(n) + " TD catch today"); }
          if (/Rushing Touchdown/i.test(ty) && P0) { n = bump("utd" + P0.id); if (n >= 2) st.lines.push(fdPoss(ln(P0)) + " " + ordN(n) + " rushing TD today"); }
          if (/Field Goal Good/i.test(ty) && P0) { n = bump("fg" + P0.id); if (n >= 2) st.lines.push(fdPoss(ln(P0)) + " " + ordN(n) + " field goal today"); }
        } else if (rd.kind === "turn" && offSd && !noPlay) {
          var ds = other(offSd); st.ban = { sd: ds, word: "Turnover", sub: short(g, ds) + " ball" };
          var nt = bump("tk" + ds); if (nt >= 2) st.lines.push(fdPoss(short(g, ds)) + " " + ordN(nt) + " takeaway today");
          var QB = /Interception/i.test(ty) ? (rd.ps[0] || {}).P : null; if (QB) { var ni = bump("int" + QB.id); if (ni >= 2) st.lines.push(fdPoss(ln(QB)) + " " + ordN(ni) + " interception today"); }
        } else if (y >= 20 && /^Rush|Pass Reception/i.test(ty) && !noPlay && offSd) st.ban = { sd: offSd, word: "Big play", big: y + " yds" };
        if (/Sack/i.test(ty) && !noPlay) { var SK = (rd.ps[1] || {}).P; if (SK) { var ns = bump("sk" + SK.id); if (ns >= 2) st.lines.push(fdPoss(ln(SK)) + " " + ordN(ns) + " sack today"); } }
        if (/^Rush|Pass Reception|Passing Touchdown|Rushing Touchdown/i.test(ty) && !noPlay && y > 0) { if (y >= 20 && y > best) st.lines.push("Longest play of the game so far"); if (y > best) best = y; }
        var yte = Number(S.yardsToEndzone);
        if (/^Rush|Pass Reception|Sack|Passing Touchdown|Rushing Touchdown/i.test(ty) && !noPlay && offSd && S.yardsToEndzone != null && yte >= 0 && yte <= 100)
          st.tr = { x0: offSd === "away" ? 100 - yte : yte, dir: offSd === "away" ? 1 : -1, y: y, sd: offSd, from: String(S.possessionText || "") };
        // the fun line: which kind of play this is, worked out from the play's own type, down, distance and yards
        if (!noPlay) { var cat = "", P0s = (rd.ps[0] || {}).P, P1s = (rd.ps[1] || {}).P, dn = Number(S.down) || 0, togo = Number(S.distance) || 0, ay = Math.abs(y), dfSd = other(offSd);
          var v = { y: ay, n: togo || null, t: offSd ? short(g, offSd) : "", d: dfSd ? short(g, dfSd) : "", p: "", q: "" }, m2;
          if (/Passing Touchdown/i.test(ty)) { cat = ay >= 30 ? "tdLong" : "tdPass"; v.q = ln(P0s); v.p = ln(P1s); }
          else if (/Rushing Touchdown/i.test(ty)) { cat = ay >= 30 ? "tdLong" : ay <= 2 ? "tdShort" : "tdRun"; v.p = ln(P0s); }
          else if (/Touchdown/i.test(ty)) cat = "tdDef";
          else if (/Safety/i.test(ty)) cat = "safety";
          else if (/Field Goal Good/i.test(ty) && (m2 = /(\d+) yard field goal/i.exec(tx))) { v.y = +m2[1]; v.p = ln(P0s); cat = v.y >= 50 ? "fgLong" : "fg"; }
          else if (/Field Goal|Blocked/i.test(ty) && /block/i.test(ty + tx) && !/punt/i.test(ty + tx)) cat = "fgBlock";
          else if (/Field Goal/i.test(ty) && /miss|no good/i.test(ty + tx) && (m2 = /(\d+) yard field goal/i.exec(tx))) { v.y = +m2[1]; v.p = ln(P0s); cat = "fgMiss"; }
          else if (/Interception/i.test(ty)) { cat = "int"; v.q = ln(P0s); v.p = ln(P1s); }
          else if (/Fumble/i.test(ty) && rd.kind === "turn") cat = "fum";
          else if (/Sack/i.test(ty) && y < 0) { cat = "sack"; v.q = ln(P0s); v.p = ln(P1s); }
          else if (dn === 4 && togo > 0 && /^Rush|Pass Reception|Pass Incompletion|Sack/i.test(ty)) { cat = /^Rush|Pass Reception/i.test(ty) && y >= togo ? "fourth" : "downs"; }
          else if (/^Rush|Pass Reception/i.test(ty) && ay >= 40 && y > 0) { cat = "bomb"; v.p = ln(/Pass/i.test(ty) ? P1s : P0s); }
          else if (/^Rush|Pass Reception/i.test(ty) && y >= 20) { cat = "big"; v.p = ln(/Pass/i.test(ty) ? P1s : P0s); }
          else if (dn === 3 && togo >= 8 && /^Rush|Pass Reception/i.test(ty) && y >= togo) cat = "thirdLong";
          else if (/^Rush/i.test(ty) && y <= -3) { cat = "tfl"; v.p = ln(P0s); }
          else if (/^Punt/i.test(ty)) { var sn = dp.slice(0, k).filter(snap); if (sn.length === 3 && sn.every(function (p3) { var s3 = p3.start || {}; return (Number(p3.statYardage) || 0) < (Number(s3.distance) || 99); }) && dp.slice(0, k).every(function (p3) { return !/penalty/i.test(String((p3.type || {}).text || "") + String(p3.text || "")); })) cat = "threeOut"; }
          else if (/Kickoff Return|Punt Return/i.test(ty) && y >= 35) { cat = "ret"; }
          if (cat) { var sy = fdSayPick(SAY, cat, v); if (sy) st.say = sy; } }
        if (st.ban || st.tr || st.lines.length || st.say) out[pid] = st;
        pa = aS; ph = hS;
      });
    });
    return out;
  }
  // the moment banner across the top of a big play's box: the team's chip, what happened, and the number (points, or yards on a big play)
  function fdBanner(g, b) {
    var c = badgeColor(g, b.sd) || "#2a3442", w = el("div", "fd-ban"); w.style.setProperty("--ban", c); w.style.setProperty("--ban-ink", fdNumInk(c));
    w.appendChild(badgeFor(abbr(g, b.sd), g[b.sd], g[b.sd + "Color"], g[b.sd + "Alt"]));
    var t = el("span", "fd-ban-t"); t.appendChild(el("b", null, b.word)); t.appendChild(el("span", null, b.sub || short(g, b.sd))); w.appendChild(t);
    if (b.big) w.appendChild(el("strong", "fd-ban-n", b.big));
    return w;
  }
  // 3.167.0 (DJ picked "Every sport" for the new play cards): hockey, soccer and baseball draw their own cards, so this adds the flair to a finished
  // card: the team-color banner on top (the header's score goes when the banner already shows it, DJ: "repetitive") and one story line under the play.
  function fdFlair(card, g, st) {
    if (!st) return;
    if (st.ban) { card.classList.add("fd-moment"); card.insertBefore(fdBanner(g, st.ban), card.firstChild);
      if (/^\d+-\d+$/.test(st.ban.big || "")) { var ps0 = card.querySelector(".fd-psc"); if (ps0) ps0.parentNode.removeChild(ps0); } }
    if (st.lines && st.lines.length) { var aft = card.querySelector(".bb-pit") || card.querySelector(".fd-px") || card.querySelector(".fd-pt"); if (aft) aft.parentNode.insertBefore(el("p", "fd-story", st.lines[0]), aft.nextSibling); }
  }
  function fdLeadWord(d0, d1, tie) { return d1 === 0 ? tie : (d0 === 0 || (d0 > 0) !== (d1 > 0)) ? "Takes the lead" : ""; }
  // 3.171.1 (DJ: "On the live yardage line graphic, use team logos in end zones"): the team's logo sits in its end zone, on the field at the top
  // and on each play's thin field. The end zone goes dark with an edge in the team's color so any logo reads; if the logo isn't known or doesn't
  // load, the end zone stays as it was (team color, and the letters on the big field).
  function fdEzLogo(ez, g, sd, size) {
    var hit = null; try { hit = teamLook(g[sd]); } catch (e) { hit = null; } if (!hit || !hit[0]) return;
    var tc = badgeColor(g, sd) || "#555", keepTx = ez.textContent, keepCss = ez.style.cssText, im = document.createElement("img");
    im.alt = ""; im.decoding = "async"; im.draggable = false; im.style.cssText = "width:" + size + "px;height:" + size + "px;object-fit:contain;display:block;margin:auto";
    im.onerror = function () { ez.textContent = keepTx; ez.style.cssText = keepCss; };
    im.src = logoUrl(hit[0], themeIsDark());
    ez.textContent = ""; ez.setAttribute("aria-label", abbr(g, sd));
    ez.style.cssText = keepCss + ";writing-mode:horizontal-tb;transform:none;opacity:1;display:grid;place-items:center;background:color-mix(in srgb, " + tc + " 30%, #0c1117);" + (sd === "away" ? "border-right" : "border-left") + ":2px solid " + tc + ";box-sizing:border-box";
    ez.appendChild(im);
  }
  // the play on a thin field: the away team's end zone on the left, like the field at the top. A gain in the team's color, a loss in red.
  function fdTracer(g, tr) {
    var at = function (v) { return (6 + Math.max(0, Math.min(100, v)) * 0.88) + "%"; }, x1 = Math.max(0, Math.min(100, tr.x0 + tr.dir * tr.y)), lo = Math.min(tr.x0, x1), hi = Math.max(tr.x0, x1);
    var w = el("div", "fd-tr"); w.setAttribute("role", "img"); w.setAttribute("aria-label", (tr.y >= 0 ? "Gain of " : "Loss of ") + Math.abs(tr.y) + " yards" + (tr.from ? " from the " + tr.from : ""));
    ["away", "home"].forEach(function (sd) { var ez = el("i", "fd-tr-ez fd-tr-" + sd); ez.style.background = badgeColor(g, sd) || "var(--raise)"; fdEzLogo(ez, g, sd, 11); w.appendChild(ez); });
    for (var k = 1; k < 10; k++) { var yl = el("i", "fd-tr-yl"); yl.style.left = at(k * 10); w.appendChild(yl); }
    var run = el("i", "fd-tr-run" + (tr.y < 0 ? " loss" : "")); run.style.left = at(lo); run.style.width = (hi - lo) * 0.88 + "%"; run.style.transformOrigin = x1 >= tr.x0 ? "left" : "right"; if (tr.y >= 0) run.style.background = fdTint(g, tr.sd); w.appendChild(run);
    var a = el("i", "fd-tr-dot fd-tr-from"); a.style.left = at(tr.x0); w.appendChild(a);
    var b = el("i", "fd-tr-dot fd-tr-to" + (tr.y < 0 ? " loss" : "")); b.style.left = at(x1); if (tr.y >= 0) b.style.background = fdTint(g, tr.sd); w.appendChild(b);
    return w;
  }
  // one football play's box (3.72.0: its own function so the quick look's Scoring can show the same boxes)
  function fdPlayCard(g, pl, rd, pid, sideOf, tags, isNew, sty) {
    var card = el("div", "fd-play" + (rd.kind ? " fd-k-" + rd.kind : "") + (isNew ? " fd-new" : "") + (sty && sty.ban ? " fd-moment" : "")); card.setAttribute("data-id", pid);
    if (sty && sty.ban) card.appendChild(fdBanner(g, sty.ban));
    // 3.70.1 (DJ: make it obvious which team made the play, like basketball): the card's left edge is that team's color. The offense by default;
    // the defense for a sack, interception, fumble it recovered or safety; the scorer's team on a return touchdown. Penalties and kickoffs get none.
    if (!rd.noTeam) { var osd = sideOf[rd.offTid] || "", tsd = rd.teamP ? sideOf[rd.teamP.tid] || "" : rd.def && osd ? (osd === "away" ? "home" : "away") : osd; if (tsd) card.style.setProperty("--fd-team", fdTint(g, tsd)); }
    var ph = el("div", "fd-ph"), q = ((pl.period || {}).number) || 0, ss = pl.start || {};
    ph.appendChild(el("span", null, (q ? (q > 4 ? "OT" : "Q" + q) + " " : "") + ((pl.clock || {}).displayValue || "") + (ss.down ? " · " + (ss.downDistanceText || ss.shortDownDistanceText || "") : "")));
    var scs = el("span", "fd-psc"); scs.textContent = abbr(g, "away") + " " + (pl.awayScore != null ? pl.awayScore : "") + "  " + abbr(g, "home") + " " + (pl.homeScore != null ? pl.homeScore : ""); ph.appendChild(scs);
    card.appendChild(ph);
    var tg = tags[String(pl.id || pl.sequenceNumber || "")]; if (tg && sty && sty.ban) tg = tg.filter(function (x) { return x.t !== "Big play"; }); if (tg && tg.length) { var tw = el("div", "fd-tags"); tg.forEach(function (x) { tw.appendChild(el("span", "fd-tag" + (x.c ? " " + x.c : ""), fdTagText(x.t))); }); card.appendChild(tw); }
    card.appendChild(fdTitle(rd.title));
    if (sty && sty.tr) card.appendChild(fdTracer(g, sty.tr));
    var lines = fdLines(fdClean(pl.text), rd.title); if (lines.length) { var px = el("div", "fd-px"); px.appendChild(el("p", null, lines.join(" · "))); card.appendChild(px); }  /* 3.177.0 (DJ: "too many lines of text on each play"): the extra point, the fumble and the rest follow on the same line */
    // 3.177.0 (DJ: compact them slightly): what the play meant and the fun line share one line. The fun line still comes in 3 seconds later, at the end.
    if (sty && !FD_SAY_ON) sty.say = null;
    if (sty && (sty.lines.length || sty.say)) { var fl = el("p", "fd-story", sty.lines.join(" · ")); if (sty.say) { if (sty.lines.length) fl.appendChild(document.createTextNode(" · ")); fl.appendChild(fdSayEl(pid, sty.say, isNew)); } card.appendChild(fl); }
    var plw = el("div", "fd-pls"); rd.ps.forEach(function (o) { var psd = sideOf[o.P.tid] || "away", row = el("div", "fd-pl"); row.appendChild(fdJersey(g, psd, o.P)); var nmw = el("span", "fd-pn"); nmw.appendChild(el("b", null, fdShort(o.P))); var pos = fdPos(o.P, g.league); if (pos) nmw.appendChild(el("em", "fd-pos", pos)); var lnx = fdFzLine(pid, String(o.P.id || o.P.name || ""), fdLine(o.P, o.k)); if (lnx) nmw.appendChild(el("i", null, lnx)); row.appendChild(nmw); plw.appendChild(row); }); if (plw.firstChild) card.appendChild(plw);
    return card;
  }
  // the quick look's Scoring (3.72.0, DJ: "match the score boxes from the live feed"): every scoring play as the feed's box,
  // oldest first, from the summary the quick look already has. Football only for now.
  function fdScoringList(g, sum) {
    if (!sum || BX_SPORT[g.league] !== "football") return null;
    var comp = ((sum.header || {}).competitions || [])[0] || {}, sideOf = {};
    (comp.competitors || []).forEach(function (k) { sideOf[String((k.team || {}).id || "")] = k.homeAway === "home" ? "home" : "away"; });
    var dr = sum.drives || {}, seen = {}, allPlays = [];
    (dr.previous || []).concat(dr.current ? [dr.current] : []).forEach(function (d) { if (!d || !d.id || seen[d.id]) return; seen[d.id] = 1; (d.plays || []).forEach(function (p2) { allPlays.push(p2); }); });
    if (!allPlays.length) return null;
    FZ.on = false;
    var ix = fdIndex(sum), tags = fdTags(allPlays, sum, g, sideOf), list = el("div", "fd-list scs-fd"), n = 0;
    allPlays.forEach(function (pl, k) { var rd = fdRead(pl, ix); if (rd.kind !== "score") return; n++; list.appendChild(fdPlayCard(g, pl, rd, String(pl.id || pl.sequenceNumber || k), sideOf, tags, false)); });
    return n ? list : null;
  }
  // a team's color that shows on a dark card: black or near-black gives way to the team's second color (or a neutral gray)
  // 3.72.1: then pushed toward white (dark themes) or black (Sunday Paper) until it stands at 4.5:1 against the card, with the slate one-liners' helper
  // (hlInk, 150-game-row.js). White and yellow teams were nearly invisible on Sunday Paper.
  function fdTint(g, sd) { var c = badgeColor(g, sd), a2 = g[sd + "Alt"], base = c && lum(c) >= 0.06 ? c : hexOk(a2) && lum(a2) >= 0.06 ? a2 : "#8A94A6"; return hexOk(base) ? hlInk(base) : base; }
  // the number on a jersey: black or white, whichever reads better on that team's color (3.72.1; a plain brightness cutoff left 17 teams hard to read)
  function fdNumInk(c) { return hexOk(c) ? (hlContrast(c, "#111111") >= hlContrast(c, "#ffffff") ? "#111" : "#fff") : "#fff"; }
  // 3.70.0 (DJ: "look more like a football jersey"): the player's number on a football jersey in the team's color (wide shoulders, short sleeves, a V neck),
  // in place of the numbered circle. Basketball's is hpJersey, a tank top.
  // 3.77.2 (DJ: "bring the player headshots into the live feed instead of the jersey icon"): the player's ESPN headshot in a circle of the team's color,
  // the same pictures as the box score and Box Office. The jersey with the number stays as the stand-in: it shows until the picture loads, and for good
  // when ESPN has none (FD_FACE remembers which, so the page doesn't flicker on every update).
  var FD_FACE = {};
  function fdFace(g, sd, P, jersey) {
    var dir = BX_HEAD[g.league], id = P && P.id ? String(P.id) : "";
    if (!id || !dir || dir === "soccer" || FD_FACE[id] === 0) return jersey;
    var c = badgeColor(g, sd) || "#2a3442", w = el("span", "fd-face" + (FD_FACE[id] === 1 ? " has" : "")); w.style.setProperty("--fc", c); w.setAttribute("aria-hidden", "true");
    w.appendChild(jersey);
    var im = document.createElement("img"); im.alt = ""; im.decoding = "async";
    im.onload = function () { FD_FACE[id] = 1; w.classList.add("has"); }; im.onerror = function () { FD_FACE[id] = 0; im.remove(); };
    im.src = "https://a.espncdn.com/combiner/i?img=/i/headshots/" + dir + "/players/full/" + id + ".png&w=96&h=70"; w.appendChild(im);
    return w;
  }
  function fdJersey(g, sd, P) { return fdFace(g, sd, P, fdJerseyOnly(g, sd, P)); }
  function fdJerseyOnly(g, sd, P) {
    var c = badgeColor(g, sd) || "#555", ink = fdNumInk(c), j = el("span", "fd-jer fd-jer-fb"), n = String(P.jer || "");
    j.style.cssText = "position:relative;flex:none;width:30px;height:27px;display:grid;place-items:center;background:none;border-radius:0;box-shadow:none";
    j.innerHTML = '<svg viewBox="0 0 30 27" width="30" height="27" style="position:absolute;inset:0;width:30px;height:27px" aria-hidden="true"><path d="M10 1.5H12.6Q15 5 17.4 1.5H20L28 5.2L28.6 12L23.6 13V24.6Q23.6 25.5 22.7 25.5H7.3Q6.4 25.5 6.4 24.6V13L1.4 12L2 5.2Z" fill="' + c + '" stroke="rgba(127,127,127,.7)" stroke-width="1" stroke-linejoin="round"/><path d="M2.3 9.2L6.4 10M27.7 9.2L23.6 10" fill="none" stroke="' + ink + '" stroke-opacity=".55" stroke-width="1.4"/></svg>';
    var nb = el("b", null, n || "•"); nb.style.cssText = "position:relative;margin-top:4px;font-size:" + (n.length > 1 ? "10.5" : "11.5") + "px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;color:" + ink; j.appendChild(nb);
    j.setAttribute("aria-hidden", "true"); return j;
  }
  // Watching the game from its feed (DJ). 3.70.1 had an "On ESPN" row with a Watch button under the score bar; 3.72.1 (DJ, with a screenshot): the
  // channel sits under the quarter inside the score bar with a small play arrow, and tapping it opens the app (watchLink, as on the cards and On TV).
  // The first channel Slate can open; a channel it can't open shows as plain text. Live games only.
  function fdWatch(g, over) {
    if (over) return null; var tv = (g.tv || []).filter(Boolean); if (!tv.length) return null;
    var n = tv.filter(function (x) { return watchOptions(x).length; })[0], lbl = NET_SHORT[n || tv[0]] || n || tv[0];
    var a = n ? watchLink(n, "fd-mw", "\u25B6 " + lbl) : null; if (a) a.addEventListener("click", function (e) { e.stopPropagation(); });
    return a || el("span", "fd-mw fd-mw-x", lbl);
  }
  // halftime (3.70.0, DJ): a red dot and "HT", on the score bar and on the game's box in the switcher. ESPN says "End of 2nd Quarter" for a moment
  // before "Halftime" (and "End of 1st Half" in men's college basketball); all of those read HT.
  function fdIsHT(det, lg) { det = String(det || ""); return /half ?time/i.test(det) || /^end of (the )?1st half/i.test(det) || (!hpHalves(lg) && /^end of (the )?2nd/i.test(det)); }
  function fdHT(tag) { var b = el(tag, "fd-ht"); b.appendChild(el("span", "fd-htd")); b.appendChild(document.createTextNode("HT")); b.setAttribute("aria-label", "Halftime"); return b; }
  // football's leaders card (3.70.0, DJ: the NFL feed had nothing like basketball's top-rated card). ESPN gives football no player rating, so nothing is
  // ranked here: these are ESPN's own leaders from the game summary, each team's passer, rusher and receiver, with ESPN's stat line.
  function fdLdOpen() { try { return localStorage.getItem("slate-feed-leaders") === "1"; } catch (e) { return false; } }
  // 3.146.0 (DJ: "add equivalents for all sports"): the Leaders card for every sport. Football, basketball, hockey and soccer use ESPN's own
  // leaders from the game summary (each team's leader in each of ESPN's categories, with ESPN's line); baseball has none from ESPN, so it shows
  // each team's pitcher now in the game (its starter once the game is over) and its best batter so far by the box score (hits, then RBIs, then home runs).
  var FD_LD = {
    football: [["passingYards", "PASS"], ["rushingYards", "RUSH"], ["receivingYards", "REC"]],
    bball: [["points", "PTS", "pts"], ["rebounds", "REB", "reb"], ["assists", "AST", "ast"]],
    hockey: [["goals", "G", "goal"], ["assists", "A", "assist"], ["points", "PTS", "point"]],
    soccer: [["totalShots", "SHOTS", "shot"], ["accuratePasses", "PASSES", "accurate pass"], ["defensiveInterventions", "DEF", "defensive action"], ["saves", "SAVES", "save"]]
  };
  function fdLdRow(g, sd, a, lab, txt) {
    var row = el("div", "fd-pl"), P = { jer: a.jersey || a.jer || "", id: a.id, name: a.displayName || a.name || "" };
    row.appendChild(BX_SPORT[g.league] === "bball" ? hpJersey(g, sd, P) : fdJersey(g, sd, P));
    var nmw = el("span", "fd-pn"); nmw.appendChild(el("b", null, a.shortName || fdShort(P))); nmw.appendChild(el("em", "fd-pos", lab)); if (txt) nmw.appendChild(el("i", null, txt)); row.appendChild(nmw); return row;
  }
  function fdLeaders(g, sum, sideOf, over, order) {
    var sp = BX_SPORT[g.league], cols = {}, any = false, hix = sp === "bball" ? hpIndex(sum) : null;
    if (sp === "baseball") {
      var ix = bbIndex(sum), pick = {};
      ((sum.boxscore || {}).players || []).forEach(function (t) { var sd = sideOf[String((t.team || {}).id || "")]; if (!sd) return; pick[sd] = pick[sd] || {};
        (t.statistics || []).forEach(function (gr) { if (/pitch/i.test(gr.type || gr.name || "")) { var at = gr.athletes || []; if (at.length) pick[sd].p = String(((over ? at[0] : at[at.length - 1]).athlete || {}).id || ""); } }); });
      var hv = function (P) { var b = P.bat || {}, n = function (k) { return parseInt(b[k], 10) || 0; }; return n("hits") * 10000 + n("RBIs") * 100 + n("homeRuns"); };
      Object.keys(ix).forEach(function (id) { var P = ix[id], sd = sideOf[P.tid]; if (!sd || !P.bat || !hv(P)) return; pick[sd] = pick[sd] || {}; if (!pick[sd].b || hv(P) > hv(ix[pick[sd].b])) pick[sd].b = id; });
      Object.keys(pick).forEach(function (sd) { var col = el("div", "fd-ldc"), pp = ix[pick[sd].p], bb = ix[pick[sd].b];
        if (pp && pp.pit) { col.appendChild(fdLdRow(g, sd, pp, over ? "STARTER" : "PITCHING", bbLine(pp, true))); any = true; }
        if (bb) { col.appendChild(fdLdRow(g, sd, bb, "BAT", bbLine(bb, false))); any = true; }
        if (col.firstChild) cols[sd] = col; });
    } else {
      var want = FD_LD[sp]; if (!want) return null;
      (sum.leaders || []).forEach(function (t) { var sd = sideOf[String((t.team || {}).id || "")]; if (!sd) return; var col = el("div", "fd-ldc");
        want.forEach(function (w) { var L = (t.leaders || []).filter(function (x) { return x.name === w[0]; })[0], top = L && (L.leaders || [])[0], a = top && top.athlete; if (!a || !top.displayValue) return;
          var txt;
          if (sp === "football") txt = String(top.displayValue).replace(/\bYDS\b/g, "yds").replace(/\bCAR\b/g, "car").replace(/\bREC\b/g, "rec");
          else if (hix) { var Pb = hix[String(a.id || "")], sb = (Pb && Pb.st) || {}, nb = function (k) { return parseFloat(sb[k]) || 0; }; if (!(parseFloat(top.displayValue) > 0)) return;
            /* 3.147.1 (DJ: "leaders should show all stats"): every basketball leader shows points, rebounds and assists from the box score */
            txt = Pb ? nb("PTS") + " pts, " + nb("REB") + " reb, " + nb("AST") + " ast" : top.displayValue + " " + w[2]; }
          else { var v = top.displayValue, n = parseFloat(v); if (!(n > 0)) return; var u = w[2]; if (n !== 1 && !/^(pts|reb|ast)$/.test(u)) u += /ss$/.test(u) ? "es" : "s"; txt = v + " " + u + (w[0] === "points" && sp === "bball" && top.summary ? ", " + String(top.summary).split(",")[0] : ""); }  /* basketball points add the shooting (8/13 FG); the rest is the count alone, so it fits a phone */
          col.appendChild(fdLdRow(g, sd, a, w[1], txt)); any = true; });
        if (col.firstChild) cols[sd] = col; });
    }
    if (!any) return null;
    var card = el("div", "fd-field hp-top fd-ld"); card.appendChild(el("p", "fd-wpl hp-tl", "Leaders" + (over ? "" : " so far")));
    var two = el("div", "hp-two"); (order || ["away", "home"]).forEach(function (sd) { var hd = el("div", "fd-ldc"); if (cols[sd]) { cols[sd].insertBefore(el("p", "fd-ldt", abbr(g, sd)), cols[sd].firstChild); two.appendChild(cols[sd]); } else two.appendChild(hd); });
    card.appendChild(two); return card;
  }
  // 3.162.0 (DJ: "I want box score to be a button, rather than show beneath the live feed" ... "Box score should replace leaders"): the Box score
  // button on the "Last play" line, for every sport. It took the Leaders button's place (fdLeaders above is no longer drawn) and opens the box
  // score right under the line; the box score no longer sits under the plays. Open or closed is remembered on this phone, for every sport.
  function fdBoxOpen() { try { return localStorage.getItem("slate-feed-box") === "1"; } catch (e) { return false; } }
  // 3.169.0 (DJ: "Football should have a 'drive result' during live game so I can see the result of all past team drives quickly"): a Drives
  // button on the bar. Open, it lists every drive, newest first, one line each: the team, when and where it started, ESPN's "7 plays, 53 yards, 3:45"
  // and the result (Touchdown, Field Goal, Punt, Fumble...). The drive still going leads the list. Opening it closes the box score, and the other way round.
  function fdDrvOpen() { try { return localStorage.getItem("slate-feed-drives") === "1"; } catch (e) { return false; } }
  function fdDrvHook(list, g, drives, sideOf, curId) {
    if (!drives || !drives.length) return;
    var fb = list.querySelector(".fd-bar"); if (!fb) { fb = el("div", "fd-bar"); fb.appendChild(el("p", "fd-ago", "")); list.insertBefore(fb, list.firstChild); }
    var on = fdDrvOpen(), db = el("button", "fd-scf fd-drb" + (on ? " on" : ""), "Drives"); db.type = "button"; db.setAttribute("aria-expanded", on ? "true" : "false");
    db.addEventListener("click", function () { try { localStorage.setItem("slate-feed-drives", on ? "0" : "1"); if (!on) localStorage.setItem("slate-feed-box", "0"); } catch (e) {} fdKeepY(renderFeed); });
    fb.insertBefore(db, fb.querySelector(".fd-dlw"));
    if (!on) return;
    var w = el("div", "fd-field fd-drv"); w.setAttribute("data-id", "drives"); w.style.cssText = "padding:10px 12px;margin-bottom:8px";
    var h = el("h3", "fd-boxh", "Drives"); h.style.margin = "0 0 4px"; w.appendChild(h);
    for (var i = drives.length - 1; i >= 0; i--) {
      var d = drives[i], sd = sideOf[String((d.team || {}).id || "")] || "", res = d.displayResult || "", cur = !res && curId && d.id === curId, st = d.start || {}, q = Number((st.period || {}).number) || 0;
      if (!res && !cur) continue;
      var r = el("div", "fd-drive"); r.style.cssText = "margin:0;padding:7px 0;" + (w.children.length > 1 ? "border-top:1px solid var(--line, rgba(127,127,127,.18))" : "");
      if (sd) r.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      var t = el("span", "fd-dt"), when = (q ? (q > 4 ? "OT" : "Q" + q) + " " : "") + ((st.clock || {}).displayValue || "");
      t.appendChild(el("b", null, (sd ? abbr(g, sd) : "Drive") + (when.trim() ? " · " + when.trim() : "") + (st.text ? " · from " + st.text : "")));
      if (d.description) t.appendChild(el("span", null, d.description)); r.appendChild(t);
      r.appendChild(el("em", "fd-res" + (cur ? "" : d.isScore ? " sc" : /fumble|interception|downs|safety/i.test(res) ? " to" : ""), cur ? "Going now" : res));
      w.appendChild(r);
    }
    if (w.children.length < 2) w.appendChild(el("p", "pv-none", "No drives yet."));
    var aft = list.querySelector(".fd-dlrow") || fb; list.insertBefore(w, aft.nextSibling);
  }
  function fdLdHook(list, g, sum) {
    var bx = null; try { bx = feedBox(g, sum); } catch (e) { bx = null; } if (!bx) return;
    var fb = list.querySelector(".fd-bar"); if (!fb) { fb = el("div", "fd-bar"); fb.appendChild(el("p", "fd-ago", "")); list.insertBefore(fb, list.firstChild); }
    var on = fdBoxOpen(), lb = el("button", "fd-scf fd-ldb fd-bxb" + (on ? " on" : ""), "Box score"); lb.type = "button"; lb.setAttribute("aria-expanded", on ? "true" : "false");
    lb.addEventListener("click", function () { try { localStorage.setItem("slate-feed-box", on ? "0" : "1"); if (!on) localStorage.setItem("slate-feed-drives", "0"); } catch (e) {} fdKeepY(renderFeed); });
    fb.insertBefore(lb, fb.querySelector(".fd-dlw"));
    if (on) { var aft = list.querySelector(".fd-dlrow") || fb, nx = aft.nextSibling; while (nx && nx.classList && nx.classList.contains("sc-stats")) nx = nx.nextSibling; list.insertBefore(bx, nx); }
  }
  // 3.162.0 (DJ: "highlighting specific players or stats to catch the users eye"): in the feed's box score, each column's best number on the
  // team is lit in the accent, and the player with the most of them gets a tinted row and a word on why ("Double-double", "Team high: 24 PTS").
  // Only numbers already in the box score are compared; columns where more isn't better (minutes, fouls, turnovers, plus-minus, rates) are left alone.
  var FD_BX_SKIP = /^(MIN|TO|PF|F|\+\/-|PIM|#P|PC|P|PC-ST|ERA|AVG|OBP|SLG|OPS|FC|YC|RC|OF|LOB|BB|K|ER|R|H|HR|INT|SACKS|SCK|LOST|FUM|GA|TOI|PN|GV|FL|OG|QBR|RTG|LONG|LNG|AB|GP|GS)$/i;
  function fdBoxShine(root, sport) {
    Array.prototype.forEach.call(root.querySelectorAll(".bxp-list"), function (grp) {
      var rows = Array.prototype.slice.call(grp.querySelectorAll(".bxp")); if (rows.length < 2) return;
      var hdr = grp.previousElementSibling, gname = hdr && hdr.classList.contains("bxp-grp") ? hdr.textContent : "", pit = /pitch/i.test(gname), defn = /defen|goal/i.test(gname);
      var val = function (c) { var b = c.querySelector("b"), t = b && b.firstChild ? String(b.firstChild.nodeValue || "") : ""; var m = /^(-?\d+(?:\.\d+)?)(?:[-\/]\d+)?$/.exec(t.trim()); return m ? parseFloat(m[1]) : null; };
      var lab = function (c) { var i = c.querySelector("i"); return i ? i.textContent.trim() : ""; };
      var best = {}, hits = rows.map(function () { return []; });
      rows.forEach(function (r) { Array.prototype.forEach.call(r.querySelectorAll(".bxp-c"), function (c) { var L = lab(c), v = val(c); if (!L || v == null || v <= 0) return;
        var skip = FD_BX_SKIP.test(L) && !((pit && /^(K|IP)$/i.test(L)) || (!pit && sport === "baseball" && /^(H|HR|R)$/i.test(L)) || (defn && /^(INT|SACKS|SCK)$/i.test(L))); if (skip) return;
        if (!best[L] || v > best[L].v) best[L] = { v: v, n: 1 }; else if (v === best[L].v) best[L].n++; }); });
      rows.forEach(function (r, ri) { Array.prototype.forEach.call(r.querySelectorAll(".bxp-c"), function (c) { var L = lab(c), v = val(c), B = best[L]; if (B && v === B.v && B.n <= 2 && v >= (/^(PTS|YDS)$/i.test(L) ? 2 : 1)) { c.classList.add("bx-hi"); hits[ri].push({ L: L, v: v, t: c.querySelector("b").firstChild.nodeValue }); } }); });
      var top = -1; hits.forEach(function (h, i) { if (h.length >= 2 && (top < 0 || h.length > hits[top].length)) top = i; });
      var chip = function (r, txt) { var nm = r.querySelector(".bxp-nm"); if (nm) { var e = el("span", "bx-chip", txt); var st = nm.querySelector(".bxp-star"); nm.insertBefore(e, st || null); } };
      if (sport === "bball") rows.forEach(function (r, ri) { var n10 = 0; Array.prototype.forEach.call(r.querySelectorAll(".bxp-c"), function (c) { if (/^(PTS|REB|AST|STL|BLK)$/i.test(lab(c)) && val(c) >= 10) n10++; });
        if (n10 >= 2) { r.classList.add("bx-star"); chip(r, n10 >= 3 ? "Triple-double" : "Double-double"); if (ri === top) top = -1; } });
      if (top >= 0) { var h0 = hits[top].filter(function (x) { return /^(PTS|YDS|G|H|K|SV|TD|REC|SOG|SH|ST)$/i.test(x.L); })[0] || hits[top][0]; rows[top].classList.add("bx-star"); chip(rows[top], "Team high: " + h0.t.trim() + " " + h0.L); }
    });
  }
  // the live games in the switcher's order: your slate's first, then by start time
  function fdIn(x, sc) { return feedLive(x) && (sc === "all" || (sc === "slate" ? inLineup(x.id) : x.league === sc)); }
  function fdList(g) {
    // The switcher and the swipe go between the live games (football and basketball) in the chosen filter, plus the game on screen and the one
    // you opened the page from. History: your teams' games (3.66.9), then the slate's (3.68.4, DJ), then filters for any league (3.70.0, DJ).
    var from = FD.from || "", sc = FD.scope || "slate";  /* 3.81.3: after a filter is picked nothing is pinned first. Before, the game on screen jumped to the front after every swipe, so a swipe right never had a game to go back to */
    var ids = {}, list = games().filter(function (x) { if (ids[x.id] || !(fdIn(x, sc) || x.id === g.id || x.id === from)) return false; ids[x.id] = 1; return true; });
    list.sort(function (a, b) { return ((b.id === from) - (a.id === from)) || byStart(a, b); });
    return list;
  }
  // the filters above the switcher (3.70.0): My slate, All live, then each league with a live game that has a feed. Picking one whose games
  // don't include the game on screen opens its first game.
  function fdFilters(g) {
    var sc = FD.scope || "slate", lgs = {}, opts = [["slate", "My slate"]]; if (sc === "all") sc = FD.scope = "slate";  /* DJ, Nov 17: no "All" tab */
    games().forEach(function (x) { if (feedLive(x)) lgs[x.league] = 1; });
    if (LEAGUES[sc]) lgs[sc] = 1;
    Object.keys(LEAGUES).forEach(function (k) { if (lgs[k]) opts.push([k, LEAGUES[k].tag || LEAGUES[k].name]); });
    var w = el("div", "fd-strip fd-filt"); w.setAttribute("role", "group"); w.setAttribute("aria-label", "Which live games to show");
    opts.forEach(function (o) {
      var n = games().filter(function (x) { return fdIn(x, o[0]); }).length, b = el("button", "cf-tab" + (n ? "" : " cf-empty"), o[1]); b.type = "button"; b.setAttribute("aria-pressed", sc === o[0] ? "true" : "false");
      b.addEventListener("click", function () { if (FD.scope === o[0]) return; FD.scope = o[0]; FD.from = null;
        var l = games().filter(function (x) { return fdIn(x, o[0]); }).sort(byStart);
        if (l.length && !l.some(function (x) { return x.id === g.id; })) openFeed(l[0]); else fdKeepY(renderFeed); });
      w.appendChild(b); });
    var old = document.querySelector("#feed-body .fd-filt"), x0 = old ? old.scrollLeft : 0; if (x0) requestAnimationFrame(function () { w.scrollLeft = x0; });
    return w;
  }
  // a sideways swipe on the page moves to the next (left) or previous (right) game in the switcher; false when there's none that way
  function fdSwipe(step) {
    var g = feedGame(); if (!g) return false;
    var list = fdList(g), i = -1; list.forEach(function (x, j) { if (x.id === g.id) i = j; });
    var n = i < 0 ? null : list[i + step]; if (!n) return true;  /* 3.81.3 (DJ): no swipe-back from the live feed. Saying "handled" here keeps the swipe code from going Back on the first game; the page just springs back. Back is the Back button. */
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
    if (!ds.length && sum.plays) ds = [{ plays: sum.plays }];  // basketball: one flat list of plays
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
    var w = el("div", "fd-strip"); w.setAttribute("role", "tablist"); w.setAttribute("aria-label", "Live games");
    list.forEach(function (x) { if (ids[x.id]) return; ids[x.id] = 1;
      var on = x.id === g.id, b = el("button", "fd-chip" + (on ? " on" : "")); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", on ? "true" : "false");
      var v = scoreRaw(x.id) || {}, c1 = bx.live[x.id], fs = c1 && c1.sum && Date.now() - (c1.sumAt || 0) < 120000 ? fdSumScore(x.id, c1.sum) : null;
      if (fs) v = { a: fs.a, h: fs.h, detail: v.detail };  // the same held score as the page below
      if (fdDelay(x.id)) { var dsum = on && FD.id === x.id ? FD.sum : (FD.last || {})[x.id], dfs = dsum ? fdSumScore(x.id, dsum) : null, dst = dsum ? ((((dsum.header || {}).competitions || [])[0] || {}).status || {}).type || {} : {};
        v = dfs ? { a: dfs.a, h: dfs.h, detail: dst.shortDetail || dst.detail || "Live" } : { detail: "Delayed" }; }  // 3.69.0: no score ahead of the delay
      var show = boxShown(x) && v.a != null && !isNaN(v.a);
      sideOrder(x).forEach(function (sd) { var r = el("span", "fd-cr"); r.appendChild(el("b", null, abbr(x, sd))); if (show) r.appendChild(el("span", null, String(sd === "away" ? v.a : v.h))); b.appendChild(r); });  // soccer: home first (3.130.5)
      var qd = String(v.detail || "").replace(/^(\d{1,2}:\d{2}(?:\.\d)?)\s*-\s*(.+)$/, "$2 $1");  /* 3.77.4 (DJ): the quarter reads first, "4th 8:39", same as the score bar */
      b.appendChild(fdIsHT(v.detail, x.league) ? fdHT("i") : el("i", null, qd || "Live"));
      var xo = sideOrder(x); b.setAttribute("aria-label", x[xo[0]] + sep(x) + x[xo[1]] + (show ? ", " + (xo[0] === "home" ? v.h + " to " + v.a : v.a + " to " + v.h) : "") + ", " + (v.detail || "live"));
      if (!on) b.addEventListener("click", function () { openFeed(x); });
      w.appendChild(b); });
    // the switcher keeps its place between updates. When the chosen game changes (a tap, a swipe, the first look), the row moves so the
    // chosen game is whole and the game before it shows whole on its left (DJ, Nov 17: the highlighted box was cut off at the left edge
    // and the game you just left was gone). When both don't fit, the chosen game sits at the right so most of the one before it shows.
    var old = document.querySelector("#feed-body .fd-strip:not(.fd-filt)"), x0 = old ? old.scrollLeft : null, moved = FD.stripOn !== g.id || Date.now() - (FD.stripAt || 0) < 700 /* a redraw in the middle of the slide finishes it */; if (FD.stripOn !== g.id) FD.stripAt = Date.now(); FD.stripOn = g.id;
    requestAnimationFrame(function () { if (x0 != null) w.scrollLeft = x0; var c = w.querySelector(".fd-chip.on"); if (!c || w.scrollWidth <= w.clientWidth) return;
      var pad = parseFloat(getComputedStyle(w).paddingLeft) || 16, padR = parseFloat(getComputedStyle(w).paddingRight) || 16, pv = c.previousElementSibling;
      var l = c.offsetLeft - pad, r = c.offsetLeft + c.offsetWidth + padR - w.clientWidth, to = null;
      if (moved || x0 == null) { to = pv && c.offsetLeft + c.offsetWidth - pv.offsetLeft + pad + padR <= w.clientWidth ? pv.offsetLeft - pad : pv ? r + (padR > 20 ? 0 : 44) /* both don't fit: the chosen game sits at the right (leaving a peek of the next one where no island covers that corner), so as much as possible of the game before it shows */ : l; to = Math.max(r, Math.min(l, to)); }
      else if (w.scrollLeft > l || w.scrollLeft < r) to = w.scrollLeft > l ? l : r;
      if (to == null) return; to = Math.max(0, to);
      if (x0 == null) w.scrollLeft = to; else w.scrollTo({ left: to, behavior: REDUCED ? "auto" : "smooth" }); });
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
  // 3.81.3 (DJ: "when a new play comes in... it gets added to the top, meaning I have to scroll back up to see it"): after a redraw, put the page back where the reader was.
  // On the newest play: the list's top stays put, so the new play shows where the last one was. Deeper in older plays: nothing moves, and a "↑ 1 new play" pill under the score bar takes you up.
  function fdSettle(body, g, anchor, aTop, sc) {
    var y = sc ? sc.scrollTop : (window.scrollY || 0), nw = body.querySelectorAll(".fd-list .fd-new").length;
    if (FD.unseenId !== g.id) { FD.unseenId = g.id; FD.unseen = 0; }
    if (anchor === ".fd-list") FD.unseen = 0; else if (anchor) FD.unseen = (FD.unseen || 0) + nw; else if (y <= 60) FD.unseen = 0;  /* an anchor means the page was scrolled; y itself reads 0 right after a redraw */
    var bug = body.querySelector(".fd-bug"), list = body.querySelector(".fd-list");
    if (FD.unseen > 0 && bug && list) {
      var p = el("button", "fd-newpill", "\u2191 " + FD.unseen + (FD.unseen === 1 ? " new play" : " new plays")); p.type = "button";
      var gone = function () { FD.unseen = 0; if (p.parentNode) p.remove(); (sc || window).removeEventListener("scroll", chk); };
      var chk = function () { if (!p.isConnected) return (sc || window).removeEventListener("scroll", chk); if (list.getBoundingClientRect().top > bug.getBoundingClientRect().bottom - 30) gone(); };
      p.addEventListener("click", function (e) { e.stopPropagation(); var d = list.getBoundingClientRect().top - bug.getBoundingClientRect().bottom - 10; gone(); (sc || window).scrollBy({ top: d, behavior: REDUCED ? "auto" : "smooth" }); });
      setTimeout(function () { if (p.isConnected) (sc || window).addEventListener("scroll", chk, { passive: true }); }, 400);  /* after the redraw has put the page back, or its own scroll would clear the pill */
      bug.appendChild(p);
    }
    if (anchor) requestAnimationFrame(function () { var n2 = body.querySelector(anchor); if (!n2) return; var dlt = n2.getBoundingClientRect().top - aTop; if (Math.abs(dlt) > 1) { if (sc) sc.scrollTop += dlt; else window.scrollBy(0, dlt); } });
  }
  // The lines between plays (a half starting or ending, added time, a stoppage, a two-minute warning) used to be loose gray text.
  // DJ (Nov 17): each gets its own box with an emoji and a short title, the sentence underneath, like every other play.
  // Only wording changes here: every fact is from ESPN's own sentence.
  function fdNoteRead(text) {
    var t = String(text || "").replace(/\s+/g, " ").trim(), m, o = { emoji: "📣", title: "", sub: "", tone: "" };
    var rest = function (re) { return t.replace(re, "").replace(/^[\s,.:-]+/, "").replace(/\.$/, ""); };
    var ord = function (n) { n = String(n).toLowerCase(); return ({ "1": "1st", "2": "2nd", "3": "3rd", "4": "4th", first: "1st", second: "2nd", third: "3rd", fourth: "4th" })[n] || n; };
    if (/^first half begins/i.test(t)) { o.emoji = "🟢"; o.title = "Kickoff"; o.sub = rest(/^first half begins/i); o.tone = "go"; }
    else if (/^second half begins/i.test(t)) { o.emoji = "▶️"; o.title = "Second half under way"; o.sub = rest(/^second half begins/i); o.tone = "go"; }
    else if (/^first half ends/i.test(t)) { o.emoji = "☕"; o.title = "Halftime"; o.sub = rest(/^first half ends/i); o.tone = "end"; }
    else if (/^second half ends/i.test(t)) { o.emoji = "\uD83D\uDD14"; o.title = "Second half over"; o.sub = rest(/^second half ends/i); o.tone = "end"; }
    else if (/^match ends/i.test(t)) { o.emoji = "🏁"; o.title = "Full time"; o.sub = rest(/^(second half ends|match ends)/i); o.tone = "end"; }
    else if ((m = /^(first|second) half extra time (begins|ends)/i.exec(t))) { var b1 = /begins/i.test(m[2]); o.emoji = b1 ? "⏩" : (/second/i.test(m[1]) ? "🏁" : "⏸️"); o.title = "Extra time, " + m[1].toLowerCase() + " half " + (b1 ? "under way" : "over"); o.sub = rest(/^(first|second) half extra time (begins|ends)/i); o.tone = b1 ? "go" : "end"; }
    else if (/^penalty shootout begins/i.test(t)) { o.emoji = "🥅"; o.title = "Penalty shootout"; o.sub = rest(/^penalty shootout begins/i); o.tone = "go"; }
    else if (/^penalty shootout ends/i.test(t)) { o.emoji = "🏁"; o.title = "Shootout over"; o.sub = rest(/^penalty shootout ends/i); o.tone = "end"; }
    else if ((m = /announced (\d+) minutes? of added time/i.exec(t))) { o.emoji = "⏱️"; o.title = m[1] === "0" ? "No added time" : "+" + m[1] + " added time"; o.sub = m[1] === "0" ? "The fourth official added nothing" : m[1] + (m[1] === "1" ? " minute" : " minutes") + " added by the fourth official"; o.tone = "clock"; }
    else if (/^delay over/i.test(t)) { o.emoji = "▶️"; o.title = "Back under way"; o.sub = rest(/^delay over/i); o.tone = "go"; }
    else if (/^delay in match/i.test(t)) { var inj = /injur/i.test(t); o.emoji = inj ? "🩹" : "⏸️"; o.title = inj ? "Stopped for an injury" : "Play stopped"; o.sub = t.replace(/\.$/, ""); o.tone = "stop"; }
    else if (/drinks break|cooling break|hydration/i.test(t)) { o.emoji = "💧"; o.title = "Drinks break"; o.sub = t.replace(/\.$/, ""); o.tone = "stop"; }
    else if (/^lineups are announced/i.test(t)) { o.emoji = "📋"; o.title = "Lineups are in"; o.sub = rest(/^lineups are announced( and players are warming up)?/i) || "Players are warming up"; }
    else if (/\bVAR\b/.test(t)) { o.emoji = "📺"; o.title = "VAR"; o.sub = t.replace(/\.$/, ""); o.tone = "clock"; }
    else if (/^two-minute warning/i.test(t)) { o.emoji = "⏱️"; o.title = "Two-minute warning"; o.tone = "clock"; }
    else if (/^tv timeout/i.test(t)) { o.emoji = "📺"; o.title = "TV timeout"; o.tone = "stop"; }
    else if (/^(end of game|game end|end game)/i.test(t)) { o.emoji = "🏁"; o.title = "Final"; o.tone = "end"; }
    else if (/^end of regulation/i.test(t)) { o.emoji = "⏩"; o.title = "End of regulation"; o.sub = "Overtime is next"; o.tone = "end"; }
    else if (/^end of (the )?(1st |first )?half/i.test(t)) { o.emoji = "☕"; o.title = "Halftime"; o.tone = "end"; }
    else if ((m = /^end of (?:the )?(\w+) (quarter|period)/i.exec(t))) { o.emoji = "🔔"; o.title = "End of the " + ord(m[1]) + " " + m[2].toLowerCase(); o.tone = "end"; }
    else if ((m = /^start of (?:the )?(\w+) (quarter|period)/i.exec(t)) || (m = /^(\w+) (period) start/i.exec(t))) { o.emoji = "▶️"; o.title = ord(m[1]) + " " + m[2].toLowerCase() + " under way"; o.tone = "go"; }
    else if ((m = /^(top|bottom) of the (\w+) inning/i.exec(t))) { var tp = /top/i.test(m[1]); o.emoji = tp ? "\uD83D\uDD3C" : "\uD83D\uDD3D"; o.title = (tp ? "Top of the " : "Bottom of the ") + m[2]; o.tone = "go"; }
    else if ((m = /^middle of the (\w+) inning/i.exec(t))) { o.emoji = "\uD83D\uDD04"; o.title = "Middle of the " + m[1]; o.tone = "end"; }
    else if ((m = /^end of the (\w+) inning/i.exec(t))) { o.emoji = "\uD83D\uDD14"; o.title = "End of the " + m[1]; o.tone = "end"; }
    else if (/^period start/i.test(t)) { o.emoji = "▶️"; o.title = "Period under way"; o.tone = "go"; }
    else if (/^(period end|end of period|end period)/i.test(t)) { o.emoji = "🔔"; o.title = "End of the period"; o.tone = "end"; }
    else if (/^shootout start/i.test(t)) { o.emoji = "🥅"; o.title = "Shootout"; o.tone = "go"; }
    else if (/^shootout end/i.test(t)) { o.emoji = "🏁"; o.title = "Shootout over"; o.tone = "end"; }
    else { var cut = t.search(/[.,]\s/); o.title = (cut > 8 && cut < 46 ? t.slice(0, cut) : t).replace(/\.$/, ""); o.sub = o.title.length < t.replace(/\.$/, "").length ? t.replace(/\.$/, "") : ""; }
    if (o.sub && o.sub.toLowerCase() === o.title.toLowerCase()) o.sub = "";
    return o;
  }
  function fdNoteCard(text, isNew, pid, left, right) {
    var rd = fdNoteRead(text), c = el("div", "fd-play fd-k-note" + (rd.tone ? " fd-n-" + rd.tone : "") + (isNew ? " fd-new" : "")); if (pid) c.setAttribute("data-id", pid);
    if (left || right) { var ph = el("div", "fd-ph"); ph.appendChild(el("span", null, left || "")); if (right) ph.appendChild(el("span", "fd-psc", right)); c.appendChild(ph); }
    c.appendChild(el("p", "fd-pt", rd.emoji + " " + rd.title)); if (rd.sub) c.appendChild(el("p", "fd-px", rd.sub));
    return c;
  }
  function fdIsland() {
  // 3.93.4: in the unfolded Duo's right pane the island sits over this pane's top right. The host page knows its width.
  // 3.94.1: which side this pane is on is the host's pn-right class on our <html> (288-panes.js), so the spacing follows a swap at once.
  if (!PANE) return; var w = 0;
  try { var fe = window.frameElement, pw = window.parent; if (fe) w = parseFloat(pw.document.documentElement.style.getPropertyValue("--strip-w")) || 0; } catch (e) { w = 0; }
  var v = $("view-feed"); if (!v) return; v.classList.toggle("fd-isl", w > 0); v.style.setProperty("--fd-isl", w + "px");
}
function renderFeed(fromPoll) {
    var body = $("feed-body"); if (!body) return;
    // an update never rebuilds the page under a moving finger or mid-scroll (it would stop the scroll and jolt the score bar): it waits for stillness
    if (FD.touch && Date.now() - (FD.touchAt || 0) > 10000) FD.touch = false;
    if (fromPoll && (FD.drag || FD.touch || Date.now() - (FD.scrollAt || 0) < 700)) { clearTimeout(FD.rt); FD.rt = setTimeout(function () { renderFeed(true); }, 300); return; }
    if (state.view !== "feed") { FD.more = 0; FD.scOnly = false; if (body.firstChild) body.textContent = "";  // leaving the page: earlier plays fold back up (3.43.1)
      clearTimeout(FD.t); FD.t = null; return; }
    var g = feedGame();
    if (!g) { body.textContent = ""; body.appendChild(el("div", "notice", "That game isn't on today's list anymore.")); return; }
    if ((FD.id !== g.id || !FD.t) && !FD.busy) setTimeout(function () { if (!FD.t && !FD.busy) feedPoll(); }, 0);
    // keep the reader's place: when new plays land on top, the play at the top of the screen stays where it was
    var sc = isDuo ? $("pane-r") : null, y0 = sc ? sc.scrollTop : (window.scrollY || 0), anchor = null, aTop = 0;
    // 3.41.2: a play, a basketball line or the box score below can be the anchor
    if (fromPoll && y0 > 60) { var cs = body.querySelectorAll(".fd-play[data-id], .hp-row[data-id], .fd-box[data-id]");  var bg0 = body.querySelector(".fd-bug"), lim = Math.max(140, bg0 ? bg0.getBoundingClientRect().bottom + 8 : 0), l0 = body.querySelector(".fd-list"), first = l0 ? l0.querySelector(".fd-play[data-id], .hp-row[data-id]") : null;
      for (var i = 0; i < cs.length; i++) { var rc = cs[i].getBoundingClientRect(); if (rc.bottom > lim) {
        // 3.81.3 (DJ): parked on the newest play, the list's top holds its place, so a new play lands right there in view. Deeper in the plays, the play you're reading holds still and a pill says what's new.
        if (cs[i] === first) { anchor = ".fd-list"; aTop = l0.getBoundingClientRect().top; } else { anchor = '[data-id="' + cs[i].getAttribute("data-id") + '"]'; aTop = rc.top; } break; } } }
    body.textContent = "";
    fdIsland();
    body.appendChild(fdFilters(g));
    var strip = fdStrip(g); if (strip) body.appendChild(strip);
    var sum = FD.id === g.id ? FD.sum : null;
    if (!sum) { body.appendChild(el("p", "pv-none bx-wait fd-wait", "Loading the play-by-play…")); return; }
    if (BX_SPORT[g.league] === "soccer") return scFeed(body, g, sum, anchor, aTop, sc);  // 3.87.0: soccer, in 147-live-feed-soccer.js
    if (BX_SPORT[g.league] === "baseball") return bbFeed(body, g, sum, anchor, aTop, sc);  // baseball, in 149-live-feed-baseball.js
    if (BX_SPORT[g.league] === "hockey") return hkFeed(body, g, sum, anchor, aTop, sc);  // 3.88.0: hockey, in 148-live-feed-hockey.js
    if (BX_SPORT[g.league] === "bball") return hpFeed(body, g, sum, anchor, aTop, sc);  // basketball draws its own court and plays
    var comp = ((sum.header || {}).competitions || [])[0] || {}, st = (comp.status || {}).type || {}, sideOf = {}, abOf = {}, scoreOf = {}, recOf = {};
    (comp.competitors || []).forEach(function (k) { var id = String((k.team || {}).id || ""), sd = k.homeAway === "home" ? "home" : "away"; sideOf[id] = sd; abOf[String((k.team || {}).abbreviation || "").toUpperCase()] = sd; scoreOf[sd] = k.score; recOf[sd] = ((k.record || [])[0] || {}).summary || ""; });
    var ix = fdIndex(sum), drives = [], byId = {};
    var dr = sum.drives || {}; (dr.previous || []).concat(dr.current ? [dr.current] : []).forEach(function (d) { if (!d || !d.id) return; if (byId[d.id] != null) drives[byId[d.id]] = d; else { byId[d.id] = drives.length; drives.push(d); } });
    var allPlays = []; drives.forEach(function (d) { (d.plays || []).forEach(function (p2) { allPlays.push(p2); }); });
    var tags = fdTags(allPlays, sum, g, sideOf), story = {}; if (FD_FLAIR_FOOT) { try { story = fdStory(drives, g, sideOf, ix); } catch (e) { story = {}; } }
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
      if (sd === "mid") { var mid = el("div", "fd-mid"); var per = Number((comp.status || {}).period) || 0, ht = !over && fdIsHT(st.shortDetail || st.detail, g.league);
        var sd0 = spot && !over ? Number(spot.e.down) || 0 : 0;
        if (ht) mid.appendChild(fdHT("b")); else { var ck = el("span", "fd-ck"); /* 3.75.2 (DJ): the quarter sits on the clock's line, not under it */ if (!over) ck.appendChild(el("i", null, per > 4 ? "OT" : per ? ordN(per) : "")); /* 3.77.2 (DJ): the quarter reads first, "4th 9:51" */ ck.appendChild(el("b", null, over ? "Final" : st.state === "pre" ? timeText(g.start) : ((comp.status || {}).displayClock || ""))); mid.appendChild(ck); } var mw = fdWatch(g, over); if (mw) mid.appendChild(mw); bug.appendChild(mid); return; }
      var tm = el("div", "fd-tm fd-tm-" + sd); tm.appendChild(badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]));
      // compact: the badge, then the record with the ball beside whoever has it (the full name is in the badge's label)
      var nm = el("b", null, recOf[sd] || ""); nm.setAttribute("aria-label", short(g, sd) + (recOf[sd] ? ", " + recOf[sd] : "")); tm.appendChild(nm);
      var scn = el("b", "fd-sc" + (over && (sd === "away" ? aS < hS : hS < aS) ? " trail" : ""), String(scoreOf[sd] != null ? scoreOf[sd] : "–"));
      if (sd === "away") { bug.appendChild(tm); bug.appendChild(scn); } else { bug.appendChild(scn); bug.appendChild(tm); }
    });
    // The game's situation, on its own centered line at the bottom of the score bar (3.75.2, DJ: "a spot that's obvious for a user following the
    // live feed to know the current down and yard line"): a pill with the football, the team that has the ball in its color, the down and distance
    // and the yard line, e.g. "LAC  4th & 1 at BAL 17". History: under the clock (3.36), beside the record (3.73.1), under that team's score (3.74.1).
    if (!over && posSide && spot && Number(spot.e.down) && spot.e.shortDownDistanceText) {  /* only on a real down: between a score and the kickoff ESPN still says the scoring team has the ball */ var E0 = spot.e, sit = el("div", "fd-sit"), sbl = el("i", "fd-ball"), tmN = el("b", "fd-sit-t", abbr(g, posSide)); tmN.style.color = fdTint(g, posSide); sit.style.setProperty("--fd-team", fdTint(g, posSide));
      var pt0 = String(E0.possessionText || "").replace(/^([A-Z]{2,4})/, function (a2) { return abOf[a2] ? abbr(g, abOf[a2]) : a2; }), dn0 = Number(E0.down) && E0.shortDownDistanceText ? String(E0.shortDownDistanceText) : "";
      sit.appendChild(sbl); sit.appendChild(tmN); sit.appendChild(el("span", "fd-sit-d", dn0 ? dn0 + (pt0 ? " at " + pt0 : "") : "ball" + (pt0 ? " at " + pt0 : "")));
      sit.setAttribute("aria-label", abbr(g, posSide) + " has the ball" + (dn0 ? ", " + dn0 : "") + (pt0 ? " at " + pt0 : "")); bug.appendChild(sit); }
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
      if (!down) fld.appendChild(dd);  /* 3.73.1 (DJ: too much above the plays on the folded Duo): the down and distance is in the score bar now, and the field shows the spot */
      var pitch = el("div", "fd-pitch"); pitch.setAttribute("aria-hidden", "true");
      // 3.177.0 (DJ: "Yard lines are messed up and not lined up here"): the yard lines were a striped background that was sized wrong (a line every 7%
      // of the field, not every 8.4%), so they drifted away from the numbers under them and from the ball. Each line is now its own mark, placed with
      // the same sum as the numbers, the ball and the line to gain.
      pitch.style.backgroundImage = "none";
      for (var yk = 0; yk <= 10; yk++) { var yln = el("i"); yln.style.cssText = "position:absolute;top:0;bottom:0;width:1px;margin-left:-.5px;background:rgba(255,255,255," + (yk === 5 ? ".3" : ".16") + ");left:" + (8 + yk * 8.4) + "%"; pitch.appendChild(yln); }
      ["away", "home"].forEach(function (sd) { var ez = el("span", "fd-ez fd-ez-" + sd, abbr(g, sd)); ez.style.background = badgeColor(g, sd) || "var(--raise)"; if (lum(badgeColor(g, sd) || "#333333") > 0.62) ez.style.color = "#111"; fdEzLogo(ez, g, sd, 18); pitch.appendChild(ez); });
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
      var wl = el("p", "fd-wpl hp-wpl1", "Win prob. (ESPN)"); wr.classList.add("hp-wp1"); wr.insertBefore(wl, wr.firstChild); wpHost.appendChild(wr);  /* one row, like basketball */
    }
    // the plays, newest first, under their drives
    // 3.69.1 (DJ): the Scoring button shows only the scoring plays (all of them, under their drives)
    var scOnly = !!FD.scOnly, isScore = function (p) { return fdRead(p, ix).kind === "score"; };
    var list = el("div", "fd-list"), shown = 0, cap = scOnly ? 1e9 : 8 * (1 + (+FD.more || 0)), fresh = FD.seen ? FD.seen : null, seenNow = {};
    fdFzStart(g);
    for (var fzd = drives.length - 1; fzd >= 0; fzd--) { var fzp = drives[fzd].plays || []; for (var fzi = fzp.length - 1; fzi >= 0; fzi--) { var fzid = String(fzp[fzi].id || fzp[fzi].sequenceNumber || ""); if (!fzid) continue; try { fdRead(fzp[fzi], ix).ps.forEach(function (o) { fdFzMark(String(o.P.id || o.P.name || ""), fzid); }); } catch (e) {} } }
    for (var di = drives.length - 1; di >= 0 && shown < cap; di--) {
      var d2 = drives[di], dsd = sideOf[String((d2.team || {}).id || "")] || "", isCur = dr.current && d2.id === dr.current.id && !over && !d2.displayResult && (!posSide || dsd === posSide);  // a punt or turnover ends it before ESPN opens the next drive
      var pls = (d2.plays || []).slice().reverse(); if (scOnly) { pls = pls.filter(isScore); if (!pls.length) continue; }
      var dh = el("div", "fd-drive"); if (dsd) dh.appendChild(badgeFor(abbr(g, dsd), g[dsd], g[dsd + "Color"], g[dsd + "Alt"]));
      var dt = el("span", "fd-dt"); dt.appendChild(el("b", null, isCur ? "Current drive" : (dsd ? abbr(g, dsd) + " drive" : "Drive"))); if (d2.description) dt.appendChild(el("span", null, d2.description)); dh.appendChild(dt);
      var res = d2.displayResult || ""; if (res && !isCur) dh.appendChild(el("em", "fd-res" + (d2.isScore ? " sc" : /fumble|interception|downs/i.test(res) ? " to" : ""), res));
      list.appendChild(dh);
      for (var pi = 0; pi < pls.length && shown < cap; pi++) {
        var pl = pls[pi], rd = fdRead(pl, ix), pid = String(pl.id || pl.sequenceNumber || (di + "-" + pi)); seenNow[pid] = 1;
        var isNew = fresh && !fresh[pid];
        if (rd.note && /timeout/i.test(rd.title)) {  // 3.81.3 (DJ): a timeout is a red box, the same as in the basketball feed, not a loose gray line
          var tab = (/^Timeout ([A-Z]{2,4})$/.exec(rd.title) || [])[1], tsd0 = tab ? (abbr(g, "away") === fdAb(tab) ? "away" : abbr(g, "home") === fdAb(tab) ? "home" : "") : "";
          var tc = el("div", "fd-play fd-k-to" + (isNew ? " fd-new" : "")), tq = ((pl.period || {}).number) || 0, th = el("div", "fd-ph"); tc.setAttribute("data-id", pid);
          th.appendChild(el("span", null, (tq ? (tq > 4 ? "OT" : "Q" + tq) + " " : "") + ((pl.clock || {}).displayValue || "") + (tsd0 ? " \u00b7 " + abbr(g, tsd0) : "")));
          if (pl.awayScore != null && pl.homeScore != null) th.appendChild(el("span", "fd-psc", abbr(g, "away") + " " + pl.awayScore + "  " + abbr(g, "home") + " " + pl.homeScore));
          tc.appendChild(th); tc.appendChild(fdTitle(tsd0 ? "Timeout, " + short(g, tsd0) : tab ? "Timeout, " + fdAb(tab) : rd.title)); list.appendChild(tc); continue; }
        if (rd.note) { var nq = ((pl.period || {}).number) || 0; list.appendChild(fdNoteCard(rd.title, isNew, pid, (nq ? (nq > 4 ? "OT" : "Q" + nq) + " " : "") + ((pl.clock || {}).displayValue || ""), pl.awayScore != null && pl.homeScore != null ? abbr(g, "away") + " " + pl.awayScore + "  " + abbr(g, "home") + " " + pl.homeScore : "")); continue; }
        shown++;
        var card = fdPlayCard(g, pl, rd, pid, sideOf, tags, isNew, story[pid]);
        list.appendChild(card);
      }
    }
    if (!allPlays.length) list.appendChild(el("p", "pv-none", st.state === "pre" ? "Plays show up here once the game kicks off." : "No plays yet."));
    else if (scOnly && !shown) list.appendChild(el("p", "pv-none", "No scoring plays yet."));
    fdAgo(list, sum, st.state === "in", g); body.appendChild(list);
    // 3.73.1 (DJ: the top of the page left no room for plays on the folded Duo): the leaders card is folded away behind a Leaders button on the
    // "Last play" line, and opens right under that line. Open or closed is remembered on this phone.
    if (allPlays.length) { try { fdDrvHook(list, g, drives, sideOf, !over && dr.current ? dr.current.id : ""); } catch (e) {} fdLdHook(list, g, sum); }
    fdMoreRow(list, !scOnly && allPlays.length > shown && shown >= cap, scOnly);
    body.appendChild(el("p", "pv-at fd-at", over ? "Final" : "Updates every few seconds while this page is open"));
    fdFzEnd();
    FD.seen = Object.assign(FD.seen || {}, seenNow);
    fdSettle(body, g, anchor, aTop, sc);
  }

  function gameRow(g, mode, opts) {
    opts = opts || {};
    var on = inLineup(g.id), st = status(g), pick = mode !== "lineup", closed = pick && isPastDay(), openTray = null;
    var row = el(pick && !closed && mode !== "games" ? "button" : "div", "g panel" + (st.kind === "over" && state.date >= todayInHome() ? " over" : "") + (pick ? " gpick" : ""));
    var label = g.custom ? g.home : pairText(g, function (sd) { return g[sd]; }, homeFirst(g) || g.neutral ? " versus " : " at ");
    if (pick && !closed) {
      row.type = "button";
      row.setAttribute("aria-pressed", on ? "true" : "false");
      if (mode === "games" && !g.custom) {
        row.removeAttribute("aria-pressed"); row.removeAttribute("type");
      } else {
        row.setAttribute("aria-label", (on ? "Remove " : "Add ") + label + ", " + timeText(g.start) + (on ? ", from slate" : ", to slate"));
        row.addEventListener("click", function () { toggle(g.id); });
      }
    }
    var main = el(pick ? "span" : "div", "g-main");
    var ng = noteShort(g.note);   // 3.89.2: the league line fits; a two-legged tie's aggregate is in the one-liner instead
    if (opts.league || mode === "lineup" || mode === "tv") {
      var ln = leagueLine(ng !== g.note ? Object.assign({}, g, { note: ng }) : g, true);
      // 3.176.1 (DJ: "looks great for duo, looks crowded on regular iphone"): with a tournament name, a regular iPhone shows the
      // league's short tag (CBB, WCBB) in place of "College Hoops", so the name fits on one line more often (CSS: html.iphone)
      var lgn0 = ln.querySelector(".lgn"), tg0 = !g.custom && info(g).tag; if (lgn0 && ng && tg0) { var lgt = el("span", "lgt", tg0); lgn0.parentNode.insertBefore(lgt, lgn0.nextSibling); }
      main.appendChild(ln);
    } else if (g.note) { var ln2 = el("span", "g-lg"); ln2.appendChild(el("span", "nt", ng)); main.appendChild(ln2); }
    if (g.custom) {
      var cr = el("span", "tm"); var cb = badgeFor("+", "custom"); cb.style.background = "var(--raise)"; cb.style.color = "var(--ink)"; cb.style.setProperty("--ring", "transparent"); cr.appendChild(cb);
      var cw = el("span", "nmw"); cw.appendChild(el("span", "nm", g.home)); cr.appendChild(cw); cr.appendChild(el("span")); main.appendChild(cr);
    } else {
      // 3.194.0 (DJ: "need a football icon to know which team has the ball"): a live football game puts the football in front of
      // the score of the team with the ball, the same drawn ball as the Live feed (livePos in 040-live.js; none at the half)
      var lv = state.showScores && BX_SPORT[g.league] === "football" ? scoreOf(g) : null, hasBall = lv && lv.state === "in" ? lv.pos : "";
      sideOrder(g).forEach(function (s2) {
        var tl = teamLine(g, s2), tsc = hasBall === s2 ? tl.querySelector(".sc") : null;
        if (tsc) { var gb = el("i", "fd-ball g-ball"); gb.setAttribute("aria-label", "has the ball"); gb.setAttribute("role", "img"); tsc.insertBefore(gb, tsc.firstChild); }
        main.appendChild(tl);
      });
    }
    var trayMode = mode === "lineup" || (mode === "games" && !g.custom);
    if (trayMode) {
      var wide = !isDuo || mode === "games";
      var open = state.openId === g.id;
      main.setAttribute("role", "button"); main.tabIndex = 0;
      main.setAttribute("aria-expanded", open ? "true" : "false");
      main.setAttribute("aria-label", label + ", " + timeText(g.start) + ". Show options");
      function makeTray() {
        var tray = el("div", "tray");
        if (!g.custom && wide) {
          tray.appendChild(trayBlock(g));
          if (feedOk(g)) tray.appendChild(feedBtn(g));  // a live football game: its play-by-play, right above Full matchup
          // the way into the big matchup page, always in the same spot
          var fm = el("button", "full-mu"); fm.type = "button";
          var fmt = el("span", "fm-t"); fmt.appendChild(el("b", null, "Full matchup"));
          var stx = status(g).kind; fmt.appendChild(el("i", null, stx === "upcoming" ? "Odds, season stats and preview" : BX_SPORT[g.league] === "soccer" ? "Lineups, match summary, team stats and recap" : "Top performers, players, team stats and recap"));
          fm.appendChild(fmt); fm.appendChild(icon("more"));
          fm.addEventListener("click", function (e) { e.stopPropagation(); openMatchup(g); });
          tray.appendChild(fm);
        }
        // the game's controls, one row under Full matchup: star either team on the left; on the right, under the thumb,
        // remove it from the slate and its live score on the Lock Screen (the bell is lit while it's on for this game)
        var acts = el("div", "tray-acts");
        if (!g.custom) sideOrder(g).forEach(function (s) {
          var fav = isFav(g[s], g.league), b = el("button", "ta-fav" + (fav ? " on" : "")); b.type = "button";
          b.appendChild(starIcon(fav)); b.appendChild(document.createTextNode(abbr(g, s)));
          b.setAttribute("aria-pressed", fav ? "true" : "false");
          b.setAttribute("aria-label", (fav ? "Remove " : "Add ") + g[s] + (fav ? " from" : " to") + " my teams");
          b.addEventListener("click", function (e) { e.stopPropagation(); toggleFav(g[s], g.league); });
          acts.appendChild(b);
        });
        acts.appendChild(el("span", "ta-sp"));
        if (mode === "lineup") {
          var rm = el("button"), keep = el("button", "ta-keep", "Keep"), armed = false, disarmT = null; rm.type = "button"; keep.type = "button";
          var disarm = function () {
            armed = false; clearTimeout(disarmT); acts.classList.remove("confirm");
            rm.className = "rm ta-ic"; rm.textContent = ""; rm.appendChild(icon("x"));
            rm.setAttribute("aria-label", "Remove " + label + " from the slate"); rm.title = "Remove from slate";
          };
          disarm();
          rm.addEventListener("click", function (e) {
            e.stopPropagation();
            if (armed) { clearTimeout(disarmT); state.openId = null; removeGame(g); return; }
            armed = true; acts.classList.add("confirm");
            rm.className = "rm ta-confirm"; rm.textContent = ""; rm.appendChild(icon("x")); rm.appendChild(document.createTextNode("Remove from slate?"));
            rm.setAttribute("aria-label", "Remove from slate? Tap again to remove " + label);
            disarmT = setTimeout(disarm, 5000);
          });
          keep.setAttribute("aria-label", "Keep " + label + " on the slate");
          keep.addEventListener("click", function (e) { e.stopPropagation(); disarm(); });
          acts.appendChild(keep);
          acts.appendChild(rm);
        }
        if (!g.custom && liveCtl(g)) {
          var nt = el("div", "tray-nt");
          nt.appendChild(notifyBtn(g, "live"));
          if (status(g).kind !== "over") nt.appendChild(notifyBtn(g, "alerts"));  // a finished game has no alerts left
          tray.appendChild(nt);
        }
        if (acts.querySelector("button")) tray.appendChild(acts);
        return tray;
      }
      // open or close this game's options in place: nothing else on the page is rebuilt, so the page stays put
      var flip = function (e) {
        if (e.target.closest && e.target.closest(".net, .tray")) return;
        var opening = state.openId !== g.id;
        Array.prototype.forEach.call(document.querySelectorAll("#lineup-body .tray, #games-body .tray"), function (t) {
          var m = t.parentNode && t.parentNode.querySelector(".g-main"); if (m) m.setAttribute("aria-expanded", "false");
          slideClose(t, function () { t.remove(); });
        });
        state.openId = opening ? g.id : null;
        if (opening) { var nt = makeTray(); row.appendChild(nt); slideOpen(nt); }
        main.setAttribute("aria-expanded", opening ? "true" : "false");
        if (isDuo && !g.custom && (mode === "lineup" || (row.closest && row.closest("#lineup-body")))) {  // slate cards and Worth a look
          state.gameId = g.id;
          Array.prototype.forEach.call(document.querySelectorAll("#lineup-body .g.picked"), function (r) { r.classList.remove("picked"); });
          row.classList.add("picked");
          if (state.view !== "game") openSub("game"); else { renderGame(); $("pane-r").scrollTop = 0; }
        }
      };
      var lpT = null, lpFired = false, lpX = 0, lpY = 0;
      if (!g.custom && wide) {
        main.addEventListener("touchstart", function (e) {
          if (e.touches.length !== 1 || (e.target.closest && e.target.closest(".net, .tray"))) return;
          lpFired = false; lpX = e.touches[0].clientX; lpY = e.touches[0].clientY;
          // 3.124.1 (DJ: "a delay and shows a different page first"): the matchup opens the moment the press is long enough.
          // Before, the open counted as a redraw under a finger (renderHeld, 240-chrome.js), so the page scrolled to the top
          // and the matchup only drew 0.4s after you let go. A finger resting on the card isn't a tap that a redraw could drop.
          clearTimeout(lpT); lpT = setTimeout(function () {
            lpFired = true; agDown = false; row.classList.add("lp"); setTimeout(function () { row.classList.remove("lp"); }, 250);
            var was = agTapping; agTapping = true; try { openMatchup(g); } finally { agTapping = was; }
          }, 450);
        }, { passive: true });
        main.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (Math.abs(t.clientX - lpX) > 10 || Math.abs(t.clientY - lpY) > 10) clearTimeout(lpT); }, { passive: true });
        main.addEventListener("touchend", function () { clearTimeout(lpT); if (lpFired) agSwipeAt = agUpAt = Date.now(); }, { passive: true });  // letting go after a long press: no 0.4s wait for the matchup's data to draw
        main.addEventListener("touchcancel", function () { clearTimeout(lpT); }, { passive: true });
        main.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      }
      main.addEventListener("click", function (e) { if (lpFired) { lpFired = false; e.preventDefault(); return; } flip(e); });
      main.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(e); } });
      if (open) openTray = makeTray();
      // the whole card opens and closes the quick look, apart from the channel links and the bell (3.29.1)
      row.addEventListener("click", function (e) {
        var t = e.target; if (main.contains(t) || (t.closest && t.closest(".tray, .net, .g-bell, .g-feed, a, button, input"))) return;
        main.click();
      });
    }
    row.appendChild(main);
    var sideEl = statusSide(g, mode); row.appendChild(sideEl);
    // the bell sits in the card's bottom right corner (3.29.1), clear of the clock and the channels
    // 3.77.0 (DJ): no bell on the slate's cards. In its corner, a quick button straight to the game's live feed (live and finished
    // games that have one). A game's notifications are still in its quick look: Live notification and Game alerts.
    var bellEl = sideEl.querySelector(".g-bell"); if (bellEl) bellEl.remove();
    if ((mode === "lineup" || mode === "games") && feedOk(g) && status(g).kind === "live") {   // 3.77.1: live games only (DJ); 3.91.4 (DJ): on All games too
      var fl = status(g).kind === "live", fb = el("button", "g-feed" + (fl ? " on" : "")); fb.type = "button";
      if (fl) fb.appendChild(el("i", "g-feed-dot")); fb.appendChild(el("span", null, "Feed")); fb.appendChild(el("i", "g-feed-chev"));
      fb.setAttribute("aria-label", "Open the " + (fl ? "live" : "game") + " feed for " + pairText(g, function (sd) { return g[sd]; }, " at "));
      fb.addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); openFeed(g); });
      row.appendChild(fb); row.classList.add("has-feed");
    }
    // the live highlight runs the full width of the card, under the teams and the clock
    // a line under every game: the live game's own line once there is one (red while it's on), until then the pre-game line
    if (mode === "lineup" && !g.custom && (st.kind === "live" || st.kind === "over")) {
      var hn = hlNode(g);
      if (hn) { if (st.kind === "live") { hn.classList.add("hl-live"); hlTeamInk(g, hn); } row.appendChild(hn); }
      else {
        if (!(st.kind === "over" && HLC[g.id])) bxNeed(g);
        // live with a score but no highlight yet: the game's standout so far, in red; before any score, the pre-game line
        var ll = st.kind === "live" ? liveLeadLine(g) : "";
        var pk = ll ? hlLine(g, ll, teamOfText(g, ll), "hl hl-live") : PV[g.id] && PV[g.id].text ? hlLine(g, PV[g.id].text, PV[g.id].tm, "hl hl-pre") : (st.kind === "live" ? pvNode(g) : null);
        if (pk && ll) hlTeamInk(g, pk);
        if (pk) row.appendChild(pk);
      }
    }
    else if (mode === "lineup" && !g.custom && st.kind === "upcoming") { var pn = pvNode(g); if (pn) row.appendChild(pn); var nn = pvNewsNode(g); if (nn) row.appendChild(nn); var lut = socLuTag(g); if (lut) row.appendChild(lut); }   // 3.188.0: 📋 Lineups once a soccer lineup is out   // 3.89.1: Claude's news note on its own line
    else if (mode === "games" && !g.custom) { var agl = agLine(g, st.kind, row); if (agl) row.appendChild(agl); if (st.kind === "upcoming") {
        // 3.90.5: the stats line on one line here too, the longest version that fits, without an "MSU:" in front (as on the slate)
        if (agl && agl.classList.contains("hl-pre") && PV[g.id] && PV[g.id].text) { agl.classList.add("hl-one"); } var agn = pvNewsNode(g); if (agn) row.appendChild(agn); } }   // 3.90.0: 📰 News lines on All games too  // All games: the same one-liners (3.39.0)
    if ((mode === "lineup" || mode === "games") && !g.custom && st.kind === "over") { var wb = wwbNode(g, row, mode === "games"); if (wb) row.appendChild(wb); }  // 3.103.0
    if ((mode === "lineup" || mode === "games") && !g.custom) mybBars(g).forEach(function (x) { row.appendChild(x); });  // your own bets on this game (3.86.0)
    if (openTray) row.appendChild(openTray);
    if (mode === "lineup" && isDuo && state.view === "game" && state.gameId === g.id) row.classList.add("picked");
    if ((mode === "lineup" || (mode === "games" && st.kind !== "over")) && !g.custom) {
      // why it's on the slate: a small tab tucked into the top-right corner (All games, 3.42.0: the same tags, upcoming and live games only, like the slate's Finished group)
      var ws = mode === "games" ? agTags(g) : state.why[g.id] || [];
      var wst = st.kind === "live" ? walSlateTag(g) : null;  // Close finish, Upset watch, Big night: like Worth a look
      if (wst) ws = [wst.tag].concat(ws);
      if (ws.length) {
        row.classList.add("tagged");
        var tg = el("span", "ctag" + (ws[0] === "Your team" ? " fav" : ws[0] === "Added" ? " manual" : /^(Upset watch|Close finish|Big night)$/.test(ws[0]) ? " upset" : ""), ws[0]);
        tg.title = "On your slate: " + ws.join(", ");
        row.appendChild(tg);
      }
    }
    if (pick) {
      var p = el("span", "add" + (on ? " on" : "")); if (on || !closed) p.appendChild(icon(on ? "check" : "plus"));
      if (mode === "games" && !g.custom && !closed) {
        p.classList.add("tap"); p.setAttribute("role", "button"); p.tabIndex = 0;
        p.setAttribute("aria-label", (on ? "Remove " : "Add ") + label + (on ? " from" : " to") + " your slate");
        var tog = function (e) { e.stopPropagation(); e.preventDefault(); toggle(g.id); };
        p.addEventListener("click", tog); p.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") tog(e); });
      }
      row.appendChild(p);
    }
    if (row.classList.contains("panel") && !g.custom) teamStripe(row, g);   // 3.91.0: the two teams' colors down the left edge
    return row;
  }

  // ---- the live one-liner in the color of the team it's about (DJ, 3.71.0) ----
  // "LAC: Tre' Harris 86 receiving yds" in Chargers colors. A line about both teams (or neither) keeps the live red.
  // The team's color (the pair that works on this theme, as on the cards) is lightened on Midnight or darkened on
  // Sunday Paper until it reads clearly on the card (4.5:1, the usual bar for text).
  function hlRelLum(h) {
    var n = parseInt(h.slice(1), 16), f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(n >> 16) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255);
  }
  function hlContrast(a, b) { var x = hlRelLum(a), y = hlRelLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function hlMix(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), m = function (s) { return Math.round((x >> s & 255) * (1 - t) + (y >> s & 255) * t); };
    return "#" + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  }
  var hlInkCache = {};
  function hlInk(c) {
    var card = String(getComputedStyle(document.documentElement).getPropertyValue("--card") || "").trim();
    if (!hexOk(card)) card = themeIsDark() ? "#1A2330" : "#FFFFFF";
    var k = c + card; if (hlInkCache[k]) return hlInkCache[k];
    var to = hlRelLum(card) < 0.5 ? "#ffffff" : "#000000", out = c;
    for (var t = 0.1; hlContrast(out, card) < 4.5 && t <= 1; t += 0.1) out = hlMix(c, to, t);
    return (hlInkCache[k] = out);
  }
  function hlTeamInk(g, p) {
    if (p && p.classList && p.classList.contains("hl-rows")) { hlTeamInkRows(g, p); return; }
    var sd = p && p.dataset && p.dataset.side; if (sd !== "away" && sd !== "home") return;
    var c = pairColors(g)[sd]; if (!hexOk(c)) return;
    p.style.color = hlInk(c); p.classList.add("hl-team");
  }
  // 3.134.9: a line with one row per team colors each row by its own team
  function hlTeamInkRows(g, p) { if (!p || !p.querySelectorAll) return; [].slice.call(p.querySelectorAll(".hl-row")).forEach(function (r) { hlTeamInk(g, r); }); }
  // 3.89.2 (DJ: "the fact that USA is up 6-0 on aggregate gets cut off here"): ESPN's long event notes, made to fit the league line.
  // "Concacaf Nations League · 2nd Leg - United States lead 6-0 on aggregate" -> "Nations League · 2nd leg" (the 6-0 leads the one-liner)
  function noteShort(n) {
    if (!n) return n;
    return String(n)
      .replace(/\s*-\s*[^·]*\b(lead|leads|level|tied)\b[^·]*aggregate/i, "")
      .replace(/\b(Concacaf|UEFA|CONMEBOL|CAF|AFC) Nations League\b/i, "Nations League")
      .replace(/\b(1st|2nd) Leg\b/g, function (m, x) { return x + " leg"; })
      .replace(/^The /, "").replace(/^U\.S\. Virgin Islands /, "").replace(/^Shriners Children's /, "")
      // 3.138.1: tournament names fit and read short. Only sponsor words that aren't the event's name go:
      // "Southwest Maui Invitational" is the Maui Invitational, "pres. by Belk" is a sponsor tag.
      .replace(/^Southwest (Maui Invitational)/i, "$1").replace(/\s+(pres\.|presented) by\s+[^-·]+/i, "")
      .replace(/\b(First|Third|Fifth|Seventh|Ninth|Eleventh) Place( Game)?\b/i, function (m, w) {
        return { first: "1st", third: "3rd", fifth: "5th", seventh: "7th", ninth: "9th", eleventh: "11th" }[w.toLowerCase()] + " place"; })
      .replace(/\bChampionship Game\b/i, "Championship")
      .replace(/\s+-\s+/g, "\u00a0· ")   // the dot stays with the word before it when the line wraps
      .replace(/[ \t\n]+/g, " ").trim();
  }

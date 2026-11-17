  function gameRow(g, mode, opts) {
    opts = opts || {};
    var on = inLineup(g.id), st = status(g), pick = mode !== "lineup", closed = pick && isPastDay(), openTray = null;
    var row = el(pick && !closed && mode !== "games" ? "button" : "div", "g panel" + (st.kind === "over" && state.date >= todayInHome() ? " over" : "") + (pick ? " gpick" : ""));
    var label = g.custom ? g.home : g.away + (g.neutral ? " versus " : " at ") + g.home;
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
    if (opts.league || mode === "lineup" || mode === "tv") {
      var ln = leagueLine(g, true);
      main.appendChild(ln);
    } else if (g.note) { var ln2 = el("span", "g-lg"); ln2.appendChild(el("span", "nt", g.note)); main.appendChild(ln2); }
    if (g.custom) {
      var cr = el("span", "tm"); var cb = badgeFor("+", "custom"); cb.style.background = "var(--raise)"; cb.style.color = "var(--ink)"; cb.style.setProperty("--ring", "transparent"); cr.appendChild(cb);
      var cw = el("span", "nmw"); cw.appendChild(el("span", "nm", g.home)); cr.appendChild(cw); cr.appendChild(el("span")); main.appendChild(cr);
    } else { sideOrder(g).forEach(function (s2) { main.appendChild(teamLine(g, s2)); }); }
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
          clearTimeout(lpT); lpT = setTimeout(function () { lpFired = true; row.classList.add("lp"); setTimeout(function () { row.classList.remove("lp"); openMatchup(g); }, 90); }, 450);
        }, { passive: true });
        main.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (Math.abs(t.clientX - lpX) > 10 || Math.abs(t.clientY - lpY) > 10) clearTimeout(lpT); }, { passive: true });
        main.addEventListener("touchend", function () { clearTimeout(lpT); }, { passive: true });
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
    if (mode === "lineup" && feedOk(g)) {
      var fl = status(g).kind === "live", fb = el("button", "g-feed" + (fl ? " on" : "")); fb.type = "button";
      if (fl) fb.appendChild(el("i", "g-feed-dot")); fb.appendChild(el("span", null, "Feed")); fb.appendChild(el("i", "g-feed-chev"));
      fb.setAttribute("aria-label", "Open the " + (fl ? "live" : "game") + " feed for " + g.away + " at " + g.home);
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
    else if (mode === "lineup" && !g.custom && st.kind === "upcoming") { var pn = pvNode(g); if (pn) row.appendChild(pn); }
    else if (mode === "games" && !g.custom) { var agl = agLine(g, st.kind, row); if (agl) row.appendChild(agl); }  // All games: the same one-liners (3.39.0)
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
    var sd = p && p.dataset && p.dataset.side; if (sd !== "away" && sd !== "home") return;
    var c = pairColors(g)[sd]; if (!hexOk(c)) return;
    p.style.color = hlInk(c); p.classList.add("hl-team");
  }


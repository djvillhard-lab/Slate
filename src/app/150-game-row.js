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
        var t = e.target; if (main.contains(t) || (t.closest && t.closest(".tray, .net, .g-bell, a, button, input"))) return;
        main.click();
      });
    }
    row.appendChild(main);
    var sideEl = statusSide(g, mode); row.appendChild(sideEl);
    // the bell sits in the card's bottom right corner (3.29.1), clear of the clock and the channels
    var bellEl = sideEl.querySelector(".g-bell"); if (bellEl) { row.appendChild(bellEl); row.classList.add("has-bell"); }
    // the live highlight runs the full width of the card, under the teams and the clock
    // a line under every game: the live game's own line once there is one (red while it's on), until then the pre-game line
    if (mode === "lineup" && !g.custom && (st.kind === "live" || st.kind === "over")) {
      var hn = hlNode(g);
      if (hn) { if (st.kind === "live") hn.classList.add("hl-live"); row.appendChild(hn); }
      else {
        if (!(st.kind === "over" && HLC[g.id])) bxNeed(g);
        // live with a score but no highlight yet: the game's standout so far, in red; before any score, the pre-game line
        var ll = st.kind === "live" ? liveLeadLine(g) : "";
        var pk = ll ? hlLine(g, ll, teamOfText(g, ll), "hl hl-live") : PV[g.id] && PV[g.id].text ? hlLine(g, PV[g.id].text, PV[g.id].tm, "hl hl-pre") : (st.kind === "live" ? pvNode(g) : null); if (pk) row.appendChild(pk);
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


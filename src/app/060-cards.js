  // ---------- team block: record big, name (rank) · conference/standing small ----------
  function who(g, side, tag) {
    var w = el(tag, "who" + (isFav(g[side], g.league) ? " fav" : ""));
    var big = el("span", "big");
    var rk = g[side + "Rank"];
    if (rk) big.appendChild(el("span", "rk", String(rk)));
    big.appendChild(el("span", "nm", short(g, side)));
    w.appendChild(big);
    var parts = [];
    if (g[side + "Record"]) parts.push(g[side + "Record"]);
    var ex = g[side + "Conf"] || g[side + "Standing"];
    if (ex) parts.push(ex);
    if (parts.length) w.appendChild(el("span", "small", parts.join(" · ")));
    return w;
  }
  function side(g, s, tag) {
    var sc = state.showScores ? scoreOf(g) : null;
    var r = el(tag, "side" + (sc ? " has-score" : ""));
    r.appendChild(badgeFor(abbr(g, s), g[s], g[s + "Color"], g[s + "Alt"]));
    r.appendChild(who(g, s, tag));
    if (sc) {
      var mine = Number(s === "away" ? sc.a : sc.h), other = Number(s === "away" ? sc.h : sc.a);
      var sp = el("span", "score" + (sc.state === "post" && mine < other ? " lose" : ""), String(s === "away" ? sc.a : sc.h));
      sp.style.display = "block"; r.appendChild(sp);
    }
    return r;
  }
  function visibleGames() {
    var hid = state.hiddenLeagues || [];
    return games().filter(function (g) { return hid.indexOf(g.league) === -1 || hasFav(g); });
  }

  var SPORT = { nba: "bb", wnba: "bb", ncaam: "bb", ncaaw: "bb", nfl: "fb", ncaaf: "fb", nhl: "hk", mlb: "base" };
  var SPORT_PATH = {
    bb: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3v18M6 5.2c2.6 3.2 2.6 10.4 0 13.6M18 5.2c-2.6 3.2-2.6 10.4 0 13.6",
    fb: "M4.6 19.4C3.4 13.2 7.6 5.4 19.4 4.6c1.2 6.2-3 14-14.8 14.8zM8.5 15.5l7-7M10.4 11.6l2 2M12.2 9.8l2 2",
    hk: "M3 9.5c0-1.9 4-3.5 9-3.5s9 1.6 9 3.5-4 3.5-9 3.5-9-1.6-9-3.5zM3 9.5v4c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5v-4",
    base: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM7.5 4.4c2.2 2.4 2.2 12.8 0 15.2M16.5 4.4c-2.2 2.4-2.2 12.8 0 15.2",
    soc: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8.2l3.3 2.4-1.3 3.9h-4l-1.3-3.9zM12 8.2V3.3M15.3 10.6l4.4-1.5M14 14.5l2.8 3.8M10 14.5l-2.8 3.8M8.7 10.6 4.3 9.1"
  };
  function sportIcon(league) {
    var k = SPORT[league] || (LEAGUES[league] ? "soc" : null); if (!k) return null;
    var NS = "http://www.w3.org/2000/svg", sv = document.createElementNS(NS, "svg"), pa = document.createElementNS(NS, "path");
    sv.setAttribute("viewBox", "0 0 24 24"); sv.setAttribute("fill", "none"); sv.setAttribute("stroke", "currentColor"); sv.setAttribute("stroke-width", "1.7"); sv.setAttribute("stroke-linecap", "round"); sv.setAttribute("stroke-linejoin", "round"); sv.setAttribute("aria-hidden", "true");
    pa.setAttribute("d", SPORT_PATH[k]); sv.appendChild(pa); return sv;
  }
  function leagueLine(g, withNote) {
    var ln = el("span", "g-lg"), ic = sportIcon(g.league);
    if (ic) ln.appendChild(ic);
    ln.appendChild(el("span", "lgn", g.custom ? "Added by you" : info(g).name));
    if (withNote && g.note) ln.appendChild(el("span", "nt", g.note));
    return ln;
  }

  // ---------- the game strip (one design for Slate, All games and On TV) ----------
  function starIcon(on) { var s = icon(on ? "star" : "star-o"); return s; }
  function teamLine(g, s) {
    var sc = state.showScores ? scoreOf(g) : null;
    var mine = sc ? Number(s === "away" ? sc.a : sc.h) : 0, other = sc ? Number(s === "away" ? sc.h : sc.a) : 0;
    var row = el("span", "tm" + (sc && sc.state === "post" && mine < other ? " lose" : "") + (isFav(g[s], g.league) ? " fav" : ""));
    row.appendChild(badgeFor(abbr(g, s), g[s], g[s + "Color"], g[s + "Alt"]));
    var w = el("span", "nmw");
    if (g[s + "Rank"]) w.appendChild(el("span", "rk", String(g[s + "Rank"])));
    w.appendChild(el("span", "nm", short(g, s)));
    if (isFav(g[s], g.league)) { var f = starIcon(true); f.setAttribute("class", "fv"); f.setAttribute("aria-label", "One of your teams"); w.appendChild(f); }
    if (g[s + "Record"]) w.appendChild(el("span", "rec", g[s + "Record"]));
    row.appendChild(w);
    row.appendChild(sc ? el("span", "sc", String(s === "away" ? sc.a : sc.h)) : el("span"));
    return row;
  }
  function cardBell(g) {
    var b = el("button", "g-bell"); b.type = "button"; b.appendChild(icon("bell"));
    b.setAttribute("aria-label", "Notifications on for this game (live notification or game alerts). Turn them off");
    b.addEventListener("click", function (e) {
      e.stopPropagation(); e.preventDefault();
      if (!state.notifyLoaded) { toast("Loading your notifications…"); return; }
      var undo = undoPer(g); setPer("live", g, false); setPer("alerts", g, false); saveNotify(); render(); laNow(g, false);
      toast("Notifications off for " + short(g, "away") + sep(g) + short(g, "home"), undo);
    });
    return b;
  }
  function statusSide(g, mode) {
    var side = el("span", "g-side"), st = status(g), sc = state.showScores ? scoreOf(g) : null;
    // your slate: the bell sits just left of the time or clock while this game will notify you
    if (mode === "lineup" && !g.custom && liveCtl(g) && notifyAny(g)) {
      var bw = el("span", "s-row"); bw.appendChild(cardBell(g)); side.appendChild(bw); side = bw;
    }
    if (st.kind === "live") side.appendChild(el("span", "s-live", sc && sc.detail ? sc.detail : "Live"));
    else if (st.kind === "over") side.appendChild(el("span", "s-final", st.final ? (sc && sc.detail && /OT|SO|\//.test(sc.detail) ? sc.detail : "Final") : "Likely over"));
    else if (mode === "lineup") {
      if (st.kind === "upcoming" && st.late) side.appendChild(el("span", "s-cd", "Starting soon"));  // past its time, not tipped off yet (3.71.4)
      else if (st.kind === "upcoming") { var u = until(st.ms); side.appendChild(el("span", "s-cd", u.h < 24 ? "in " + (u.h ? u.h + "h " : "") + u.m + "m" : timeText(g.start))); }
      else side.appendChild(el("span", "s-cd", timeText(g.start)));
    } else side.appendChild(el("span", "s-time", st.late ? "Starting soon" : timeText(g.start)));
    if (st.kind === "over" && mode !== "lineup") side.appendChild(el("span", "s-ftime", timeText(g.start)));  // when it was on (the slate's Finished group has its time headers)
    if (side.className === "s-row") side = side.parentNode;
    if (g.moved && st.kind === "upcoming") side.appendChild(el("span", "s-moved", "Was " + timeText(g.moved)));
    var tv = (g.tv || []).filter(Boolean);
    if (mode === "lineup" || mode === "games") {
      // at most two channels on the card, ones you can tap to watch first; the matchup page lists them all (All games too since 3.81.1)
      var linked = tv.filter(function (n) { return !!watchLink(n, "net", n); });
      var shown = linked.concat(tv.filter(function (n) { return linked.indexOf(n) === -1; })).slice(0, 2);
      tv = tv.filter(function (n) { return shown.indexOf(n) !== -1; }).sort(function (a, b) { return shown.indexOf(a) - shown.indexOf(b); });
      tv.forEach(function (n) {
        var lbl = NET_SHORT[n] || n;
        var a = watchLink(n, "net", lbl) || el("span", "net", lbl);
        a.addEventListener("click", function (e) { e.stopPropagation(); });
        side.appendChild(a);
      });
    }
    return side;
  }
  function fmtOdds(n) { n = Number(n); return isNaN(n) ? "" : (n > 0 ? "+" : "") + n; }
  // phone: the full matchup page opens over the slate; Back returns to the same spot
  function openMatchup(g) { state.gameId = g.id; if (!inLineup(g.id)) logAct("open", g); openSub("game"); }

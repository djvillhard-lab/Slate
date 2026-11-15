  var tgShut = null;
  function tgLoad() {
    if (tgShut) return tgShut;
    try { tgShut = JSON.parse(localStorage.getItem("slate-tg-shut") || "{}") || {}; } catch (e) { tgShut = {}; }
    var cut = shiftDate(todayInHome(), -3); Object.keys(tgShut).forEach(function (k) { if (k.slice(0, 10) < cut) delete tgShut[k]; });
    return tgShut;
  }
  function tgSave() { try { localStorage.setItem("slate-tg-shut", JSON.stringify(tgShut || {})); } catch (e) {} }
  function timeGroups(list0) {
    var groups = [], idx = {};
    list0.forEach(function (g) { var t = timeText(g.start); if (!(t in idx)) { idx[t] = groups.length; groups.push({ t: t, list: [] }); } groups[idx[t]].list.push(g); });
    var wrap = el("div", "tgroups");
    groups.forEach(function (gr) {
      var sec = el("section", "tgroup" + (state.date >= todayInHome() && gr.list.every(function (g) { return status(g).kind === "over"; }) ? " done" : ""));
      var kinds = gr.list.map(function (g) { return status(g).kind; });
      if (kinds.indexOf("live") !== -1) sec.setAttribute("data-now", "live"); else if (kinds.indexOf("upcoming") !== -1) sec.setAttribute("data-now", "next");
      var tp = gr.t.split(" "), tt = el("button", "tg-time"), key = state.date + "|" + gr.t;
      tt.type = "button";
      tt.appendChild(el("b", null, tp[0])); tt.appendChild(el("i", null, (tp[1] || "").toLowerCase()));
      var chev = el("span", "tg-chev"); chev.setAttribute("aria-hidden", "true"); tt.appendChild(chev);
      sec.appendChild(tt);
      // folded: one line naming the games, with a red dot on any that are live
      var sum = el("button", "tg-sum"); sum.type = "button";
      gr.list.forEach(function (g, n) {
        if (n) sum.appendChild(el("span", "tg-sep", "·"));
        var it = el("span", "tg-m"); if (status(g).kind === "live") it.appendChild(el("span", "tg-dot"));
        it.appendChild(document.createTextNode((abbr(g, "away") || g.away || "") + "–" + (abbr(g, "home") || g.home || ""))); sum.appendChild(it);
      });
      sec.appendChild(sum);
      var list = el("div", "tg-games"); gr.list.forEach(function (g) { list.appendChild(gameRow(g, "lineup")); });
      sec.appendChild(list); wrap.appendChild(sec);
      function paint() {
        var shut = !!tgLoad()[key]; sec.classList.toggle("shut", shut);
        tt.setAttribute("aria-expanded", shut ? "false" : "true");
        tt.setAttribute("aria-label", gr.t + ", " + gr.list.length + (gr.list.length === 1 ? " game" : " games") + (shut ? ", folded. Tap to show" : ". Tap to fold"));
      }
      function flip() { var m = tgLoad(); if (m[key]) delete m[key]; else m[key] = 1; tgSave(); paint(); }
      tt.addEventListener("click", flip); sum.addEventListener("click", flip);
      paint();
    });
    return wrap;
  }
  // league view: your teams' games first, then each league in your order (else the app's usual order)
  function slLeagueOrder(keys) {
    var ord = (state.slateLgOrder || []).length ? state.slateLgOrder : ((state.gamesOrder || []).length ? state.gamesOrder : ORDER);
    var at = function (k) { var i = ord.indexOf(k); return i !== -1 ? i : k === "mine" ? -1 : 999 + (ORDER.indexOf(k) === -1 ? 99 : ORDER.indexOf(k)); };
    return keys.slice().sort(function (a, b) { return at(a) - at(b); });
  }
  function slLeagueGroups(lg) {
    var mine = lg.filter(function (g) { return !g.custom && hasFav(g); }), rest = lg.filter(function (g) { return mine.indexOf(g) === -1; }), by = {};
    rest.forEach(function (g) { var k = g.custom ? "custom" : g.league; (by[k] = by[k] || []).push(g); });
    var out = [], keys0 = Object.keys(by).filter(function (k) { return k !== "custom"; }); if (mine.length) { by.mine = mine; keys0.push("mine"); }
    slLeagueOrder(keys0).forEach(function (k) { out.push({ k: k, name: k === "mine" ? "My teams" : (LEAGUES[k] || {}).name || k.toUpperCase(), list: by[k] }); });
    if (by.custom) out.push({ k: "custom", name: "Added by hand", list: by.custom });
    return out;
  }
  function slOrderBox(lg) {
    var keys = slLeagueOrder(["mine"].concat(Object.keys(LEAGUES).filter(function (k) { return lg.some(function (g) { return g.league === k && !(hasFav(g) && !g.custom); }); })));
    var nameOf = function (k) { return k === "mine" ? "My teams" : (LEAGUES[k] || {}).name || k; };
    var box = el("div", "tord sl-ord");
    var oh = el("div", "sl-ord-h"); oh.appendChild(el("p", "hint", "Section order"));
    var dn = el("button", "rlink", "Done"); dn.type = "button"; dn.addEventListener("click", function () { state.slOrderEdit = false; keepScroll(renderLineup); renderDockSort(); }); oh.appendChild(dn); box.appendChild(oh);
    keys.forEach(function (k, i) {
      var r = el("div", "trow"), tx = el("span", "tx"); tx.appendChild(el("span", "n", nameOf(k))); r.appendChild(tx);
      [["up", -1, "‹"], ["down", 1, "›"]].forEach(function (m) {
        var b = el("button", "x ford-b ford-" + m[0], m[2]); b.type = "button"; b.setAttribute("aria-label", "Move " + nameOf(k) + " " + m[0]);
        b.disabled = (m[1] < 0 && i === 0) || (m[1] > 0 && i === keys.length - 1);
        b.addEventListener("click", function () { var o = slLeagueOrder(["mine"].concat(Object.keys(LEAGUES))), a = o.indexOf(keys[i]), c = o.indexOf(keys[i + m[1]]); var x = o[a]; o[a] = o[c]; o[c] = x; state.slateLgOrder = o; saveSettings(); keepScroll(renderLineup); });
        r.appendChild(b);
      });
      box.appendChild(r);
    });
    if ((state.slateLgOrder || []).length) { var rs = el("button", "rlink", "Reset to the usual order"); rs.type = "button"; rs.addEventListener("click", function () { state.slateLgOrder = []; saveSettings(); keepScroll(renderLineup); }); box.appendChild(rs); }
    return box;
  }
  function renderLineup() {
    var body = $("lineup-body"); body.textContent = "";
    // until your settings (rules, teams) arrive, show the loading note rather than a slate built from the defaults
    var waitMine = (!state.settingsLoaded || (uid && !state.lineupLoaded)) && state.slateStatus !== "nodb";
    var lg = waitMine ? [] : lineupGames(), loading = (state.slateStatus !== "ready" && state.slateStatus !== "empty") || waitMine;
    if (!loading) {
      var ed = slateEdits();
      // (edits: "Back to default slate" sits with Clear slate under the slate)
      // sort: by time (default) or by league; today also gets a one-tap "Live only"
      var lo = null;
      if (lg.length) {
        lo = el("div", "lo-row");
        // Time | League sits at the left of this row (where Reorder used to be), styled like it
        var seg = el("div", "sl-seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Sort the slate");
        [["time", "Time"], ["league", "League"]].forEach(function (o) {
          var b0 = el("button", null, o[1]); b0.type = "button"; b0.setAttribute("aria-pressed", (state.slateSort || "time") === o[0] ? "true" : "false");
          b0.addEventListener("click", function () { if ((state.slateSort || "time") === o[0]) return; state.slateSort = o[0]; state.slOrderEdit = false; saveSettings(); keepScroll(renderLineup); });
          seg.appendChild(b0);
        });
        lo.appendChild(seg);
      }
      if (lo) {
        body.appendChild(lo);
      }
      if (state.date === todayInHome() && lg.length) {
        var nLive = lg.filter(function (g) { return status(g).kind === "live"; }).length;
        var lb = el("button", "lo-btn" + (liveOnly() ? " on" : "")); lb.type = "button";
        lb.setAttribute("aria-pressed", liveOnly() ? "true" : "false"); lb.setAttribute("aria-label", "Show only live games");
        lb.appendChild(el("i", "lo-dot")); lb.appendChild(el("span", null, "Live"));
        lb.appendChild(el("b", null, String(nLive)));
        lb.addEventListener("click", function () { setLiveOnly(!liveOnly()); keepScroll(renderLineup); });
        // the live scoreboard (3.23.0): up to 4 of these games in one live notification; lit while it's on
        if (boardCtl()) {
          var bdp = boardPrefs(), bdn = bdp.ids.filter(function (id) { return lg.some(function (g) { return g.id === id; }); }).length;
          var bdOn = bdn && boardIsOn(), bb = el("button", "lo-btn lo-board" + (bdOn ? " on" : "")); bb.type = "button";
          bb.appendChild(icon("grid")); bb.appendChild(el("span", null, "Board"));
          if (bdOn) bb.appendChild(el("b", null, String(bdn)));
          bb.setAttribute("aria-label", "Live scoreboard: up to 4 games in one live notification" + (bdOn ? ", on with " + bdn : ", off"));
          bb.addEventListener("click", openBoard);
          lo.appendChild(bb);
        }
        lo.appendChild(lb);
        if (liveOnly()) {
          var all = lg.length; lg = lg.filter(function (g) { return status(g).kind === "live"; });
          if (!lg.length) {
            var nl = el("div", "notice lo-none"); nl.appendChild(el("span", null, "None of your " + all + " games are live right now."));
            var sa = el("button", "pv-get", "Show all games"); sa.type = "button"; sa.addEventListener("click", function () { setLiveOnly(false); keepScroll(renderLineup); });
            nl.appendChild(sa); body.appendChild(nl);
          }
        }
      }
    }
    if (!loading) { var lsg = suggestionBlock("live"); if (lsg) body.appendChild(lsg); }
    if (!lg.length && liveOnly() && state.date === todayInHome() && !loading) {
      // the "none live" note above stands in for the list
    } else if (!lg.length) {
      var n = el("div", "notice");
      if (state.slateStatus === "empty" && !waitMine) { emptyDay(body); n = null; }
      else if (loading || !state.settingsLoaded || !state.lineupLoaded) n.textContent = waitMine ? "Loading your slate…" : loading ? noticeText() : "Loading games…";
      else n.textContent = "No games match your rules for this day. Loosen a rule or add games by hand.";
      if (n) body.appendChild(n);
    } else {
    // today: finished games move to a "Finished" group at the bottom, so live and upcoming games lead the page
    var finDone = state.date === todayInHome() && !state.slOrderEdit ? lg.filter(function (g) { return status(g).kind === "over"; }) : [];
    if (finDone.length) lg = lg.filter(function (g) { return finDone.indexOf(g) === -1; });
    if (!lg.length) {}
    else if (state.slateSort === "league") {
      if (state.slOrderEdit) body.appendChild(slOrderBox(lg));

      slLeagueGroups(lg).forEach(function (gp) {
        var shut = !!(state.slateFold || {})[gp.k], sec = el("section", "sl-sec" + (shut ? " shut" : ""));
        var hb = el("button", "sl-h"); hb.type = "button"; hb.setAttribute("aria-expanded", shut ? "false" : "true");
        hb.appendChild(el("b", null, gp.name));
        var nLv = gp.list.filter(function (g) { return status(g).kind === "live"; }).length;
        if (nLv) { var lv = el("span", "sl-live"); lv.appendChild(el("i")); lv.appendChild(document.createTextNode(nLv + " live")); hb.appendChild(lv); }
        hb.appendChild(el("span", "count", String(gp.list.length))); hb.appendChild(icon("more"));
        hb.addEventListener("click", function () { var f = Object.assign({}, state.slateFold || {}); if (f[gp.k]) delete f[gp.k]; else f[gp.k] = 1; state.slateFold = f; saveSettings(); keepScroll(renderLineup); });
        sec.appendChild(hb);
        if (!shut) sec.appendChild(timeGroups(gp.list));
        body.appendChild(sec);
      });
    } else body.appendChild(timeGroups(lg));
    if (finDone.length) {
      var fShut = !!(state.slateFold || {}).__fin, fsec = el("section", "sl-sec sl-fin" + (fShut ? " shut" : ""));
      var fh = el("button", "sl-h"); fh.type = "button"; fh.setAttribute("aria-expanded", fShut ? "false" : "true");
      fh.appendChild(el("b", null, "Finished")); fh.appendChild(el("span", "count", String(finDone.length))); fh.appendChild(icon("more"));
      fh.addEventListener("click", function () { var f = Object.assign({}, state.slateFold || {}); if (f.__fin) delete f.__fin; else f.__fin = 1; state.slateFold = f; saveSettings(); keepScroll(renderLineup); });
      fsec.appendChild(fh);
      // sorted by league: finished games fold by league; each card shows its start time at the top left (where the league line was)
      // sorted by time: finished games keep their time groups, earliest first
      if (!fShut && state.slateSort !== "league") fsec.appendChild(timeGroups(finDone.slice().sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); })));
      else if (!fShut) slLeagueGroups(finDone).forEach(function (gp) {
        var fk = "__fin|" + gp.k, lShut = !!(state.slateFold || {})[fk], ls = el("div", "sl-fin-lg" + (lShut ? " shut" : ""));
        var lh = el("button", "sl-fin-h"); lh.type = "button"; lh.setAttribute("aria-expanded", lShut ? "false" : "true");
        lh.appendChild(el("b", null, gp.name)); lh.appendChild(el("span", "count", String(gp.list.length))); lh.appendChild(icon("more"));
        lh.addEventListener("click", function () { var f = Object.assign({}, state.slateFold || {}); if (f[fk]) delete f[fk]; else f[fk] = 1; state.slateFold = f; saveSettings(); keepScroll(renderLineup); });
        ls.appendChild(lh);
        if (!lShut) {
          var fl = el("div", "tg-games");
          gp.list.slice().sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); }).forEach(function (g) {
            var r = gameRow(g, "lineup"), lgl = r.querySelector(".g-lg");
            if (lgl) { var nt = lgl.querySelector(".nt"); lgl.textContent = ""; lgl.appendChild(el("span", "fin-t", timeText(g.start))); if (nt) lgl.appendChild(nt); }
            fl.appendChild(r);
          });
          ls.appendChild(fl);
        }
        fsec.appendChild(ls);
      });
      body.appendChild(fsec);
    }
    // League order: Reorder sits under everything, below Finished too
    if (lg.length && state.slateSort === "league" && !state.slOrderEdit) { var orw = el("div", "sl-ord-row"); orw.appendChild(slOrdBtn("sl-ordb")); body.appendChild(orw); }
    }
    if (loading) return;
    var sg = suggestionBlock("slate"); if (sg) body.appendChild(sg);
    var nlb = newsletterBlock(); if (nlb) body.appendChild(nlb);
    var bts = betsBlock(lg); if (bts) body.appendChild(bts);
    // two actions in one panel, like the rest of the slate; Share lives in the header, Clear is a quiet link
    var acts = el("div", "slate-acts"), row = el("div", "sa-row");
    function act(label, path, fn) {
      var bt = el("button", "sa-btn"); bt.type = "button";
      var NS = "http://www.w3.org/2000/svg", sv = document.createElementNS(NS, "svg"), pa = document.createElementNS(NS, "path");
      sv.setAttribute("viewBox", "0 0 24 24"); sv.setAttribute("fill", "none"); sv.setAttribute("stroke", "currentColor"); sv.setAttribute("stroke-width", "2"); sv.setAttribute("stroke-linecap", "round"); sv.setAttribute("stroke-linejoin", "round"); sv.setAttribute("aria-hidden", "true");
      pa.setAttribute("d", path); sv.appendChild(pa); bt.appendChild(sv); bt.appendChild(el("span", null, label));
      bt.addEventListener("click", fn); return bt;
    }
    if (games().length) row.appendChild(act("All games", "M3 9.2h18M3 14.8h18M7 6.4h5M7 12h7M7 17.6h4M6 3.5h12a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3z", function () { state.gamesLive = false; openSub("games"); }));
    if (row.childNodes.length) acts.appendChild(row);
    var links = el("div", "sa-links");
    if (lg.length) { var cl = el("button", "sa-clear", "Clear slate"); cl.type = "button"; cl.addEventListener("click", clearLineup); links.appendChild(cl); }
    if (!loading && slateEdits().any) { var rb = el("button", "sa-clear", "Back to default slate"); rb.type = "button"; rb.addEventListener("click", buildSlate); links.appendChild(rb); }
    if (links.childNodes.length) acts.appendChild(links);
    if (!acts.childNodes.length) return;
    body.appendChild(acts);
  }


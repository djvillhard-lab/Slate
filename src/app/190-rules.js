  // ---------- Slate rules page (3.136.0 redesign, DJ Nov 26, 2026) ----------
  // Main page: what the slate picks, then "Your rules" (only the rules that are on, one row each), "Add a rule" (a sheet of
  // everything else, by sport) and Limits. Tapping a rule opens its own page (state.rulesEdit) with its choices and
  // "Remove this rule". The saved rules (state.rules, normRules) are unchanged, so everyone's rules carry over as they are.
  var RL_GOLF = "M8 21V3l9 4-9 4M4.5 21h9", RL_F1 = "M6 21V4h12l-2.5 4L18 12H6M6 8h3v4M12 4v4h3.5M12 8v4";
  function rlScrollTop() { if (isDuo && $("pane-r")) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0); }
  function rlOpen(id) { rlSheetClose(); state.rulesEdit = id; renderRules(); rlScrollTop(); }
  // Back closes the Add sheet first, then a rule's page (070-navigation.js asks this before anything else on this page)
  function rulesBack() {
    if (state.view !== "rules") return false;
    if (rlSheetClose()) return true;
    if (state.rulesEdit) { state.rulesEdit = null; renderRules(); rlScrollTop(); return true; }
    return false;
  }
  function rlIcon(id) {
    var ic;
    if (id === "favorites" || id === "events") ic = svgIcon(RULE_ICONS[id][0], RULE_ICONS[id][1]);
    else if (id.indexOf("ev:") === 0) { var k = id.slice(3); ic = svgIcon(EV_SPORTS[k] && EV_SPORTS[k].golf ? RL_GOLF : RL_F1, false); }
    else ic = sportIcon(id.slice(3));
    var w = el("span", "rl-ic"); if (ic) w.appendChild(ic); return w;
  }
  function rlName(id) {
    if (id === "favorites") return "My teams";
    if (id === "events") return "Big events";
    if (id.indexOf("ev:") === 0) return (EV_SPORTS[id.slice(3)] || {}).name || id;
    return (LEAGUES[id.slice(3)] || {}).name || id;
  }
  function evPicksAll() {
    var r = state.rules; if (r.eventMode === "pick" || (r.eventsOff || []).length) return false;
    var g = r.eventGroups || {}; return !Object.keys(g).some(function (k) { return !g[k]; });
  }
  // one rule: is it on, what it picks in plain words, how many games it picks on the slate's day
  function rlInfo(id) {
    var r = state.rules;
    if (id === "favorites") return { on: !!r.favorites, sum: "Every game your starred teams play", n: countMatching(hasFav) };
    if (id === "events") return { on: !!r.events, sum: evPicksAll() ? "Every classic, tournament, rivalry and final" : "Only the events you picked", n: countMatching(eventOn) };
    if (id.indexOf("ev:") === 0) {
      var k = id.slice(3), b = (r.sports || {})[k] || {}, on = (EV_RULES[k] || []).filter(function (x) { return b[x[0]]; });
      var today = evList(state.date, k);
      return { on: on.length > 0, sum: on.map(function (x) { return x[1]; }).join(", "), n: on.length ? today.filter(evRuleOn).length : 0, all: today.length, ev: true };
    }
    var lk = id.slice(3), lb = (r.by || {})[lk] || {}, lon = (LG_OPTS[lk] || []).filter(function (key) { return lb[key]; });
    return { on: lon.length > 0, sum: lb.all ? "Every game" : lon.map(function (key) { return optShort(lk, key, lb[key]); }).join(", "),
      n: lon.length ? countMatching(function (g) { return g.league === lk && !!lgHit(g); }) : 0, all: countMatching(function (g) { return g.league === lk; }) };
  }
  // every rule there could be, grouped the way the Add sheet shows them
  function rlGroups() {
    var col = [], pro = [], soc = [];
    ORDER.forEach(function (k) { if (!LG_OPTS[k]) return; (LEAGUES[k] && LEAGUES[k].college ? col : SOCCER[k] ? soc : pro).push("lg:" + k); });
    return [["Your teams and events", ["favorites", "events"]], ["College", col], ["Pro", pro], ["Soccer", soc], ["Golf and racing", EV_ORDER.map(function (k) { return "ev:" + k; })]];
  }
  function rlCount(n, zero, ev) { return n ? n + " " + whenWord() : zero ? "None " + whenWord() : ""; }

  function renderRules() {
    var body = $("rules-body"); body.textContent = "";
    if (!state.rules) state.rules = normRules();
    if (state.rulesMain == null) { state.rulesMain = 1; state.rulesEdit = null; }  // setView clears rulesMain on the way in: start on the main page
    if (state.rulesEdit) { renderRuleEdit(body, state.rulesEdit); return; }
    var r = state.rules, isToday = state.date === todayInHome(), when = isToday ? "tonight" : fmtDate(state.date, { weekday: "long" });

    // what the rules produce, in plain words
    var top = el("div", "rsum");
    var head = el("div", "rsum-head"), n = lineupGames().length;
    var nb = el("div", "rsum-n"); nb.appendChild(el("b", null, String(n))); nb.appendChild(el("span", null, (n === 1 ? "game " : "games ") + (isToday ? "tonight" : "on " + when)));
    head.appendChild(nb); top.appendChild(head);
    top.appendChild(el("p", "rsum-text", rulesSentence()));
    var ed2 = slateEdits();
    if (ed2.any) { var eb = el("div", "editbar"); eb.appendChild(el("span", null, editsText(ed2))); eb.appendChild(resetButton()); top.appendChild(eb); }
    body.appendChild(top);
    var sgr = suggestionBlock("rules"); if (sgr) body.appendChild(sgr);

    // your rules: only the ones that are on
    var mine = [];
    rlGroups().forEach(function (gr) { gr[1].forEach(function (id) { if (rlInfo(id).on) mine.push(id); }); });
    var h1 = el("div", "sec"); h1.appendChild(el("h2", null, "Your rules")); if (mine.length) h1.appendChild(el("span", "count", "Tap one to change it")); body.appendChild(h1);
    var list = el("div", "rl-list");
    mine.forEach(function (id) {
      var inf = rlInfo(id), row = el("button", "rl-row"); row.type = "button";
      row.appendChild(rlIcon(id));
      var tx = el("span", "rl-tx"); tx.appendChild(el("b", null, rlName(id))); tx.appendChild(el("span", null, inf.sum)); row.appendChild(tx);
      row.appendChild(el("span", "rl-n" + (inf.n ? "" : " zero"), rlCount(inf.n, true)));
      row.appendChild(el("span", "chev", "›"));
      row.addEventListener("click", function () { rlOpen(id); });
      list.appendChild(row);
    });
    if (!mine.length) list.appendChild(el("p", "rl-empty", "No rules are on, so your slate only has games you add by hand. Add a rule to fill it on its own."));
    body.appendChild(list);
    var add = el("button", "rl-add"); add.type = "button"; add.appendChild(icon("plus")); add.appendChild(el("span", null, "Add a rule"));
    add.addEventListener("click", rlSheetOpen); body.appendChild(add);

    // limits
    var h3 = el("div", "sec"); h3.appendChild(el("h2", null, "Limits")); h3.appendChild(el("span", "count", "Your teams always count")); body.appendChild(h3);
    var lim = el("div", "rl-lims");
    var a = el("div", "rl-lim"); a.appendChild(el("span", null, "Starts after"));
    a.appendChild(pillSelect("Starts after", r.after, [[0, "Any time"], [17, "5 PM"], [18, "6 PM"], [19, "7 PM"], [20, "8 PM"]], function (v) { r.after = Number(v); rulesChanged(); })); lim.appendChild(a);
    var m = el("div", "rl-lim"); m.appendChild(el("span", null, "Most games"));
    m.appendChild(pillSelect("Most games", r.max, [[0, "No limit"], [4, "4"], [6, "6"], [8, "8"], [10, "10"]], function (v) { r.max = Number(v); rulesChanged(); })); lim.appendChild(m);
    body.appendChild(lim);
    body.appendChild(el("p", "rsum-note rl-foot", "Your slate updates on its own when you change a rule. With a game limit, your teams come first, then the best of the rest."));
  }

  // one rule's own page
  function renderRuleEdit(body, id) {
    var r = state.rules, inf = rlInfo(id), when = whenWord();
    var hd = el("div", "rl-head"); hd.appendChild(rlIcon(id));
    var tx = el("div", "rl-tx"); tx.appendChild(el("b", null, rlName(id)));
    tx.appendChild(el("span", "rl-n" + (inf.on && !inf.n ? " zero" : ""), inf.on ? (inf.n ? "Picks " + inf.n + " " + when : "Picks nothing " + when) : "Not one of your rules yet"));
    hd.appendChild(tx); body.appendChild(hd);
    var panel = el("div", "rpanel rl-opts");
    if (id === "favorites") {
      panel.appendChild(el("p", "rl-say", "Every game your starred teams play goes on your slate, at any hour, even past your limits. Star teams on the Teams page or from any game."));
      if (!inf.on) panel.appendChild(rlTurnOn(function () { r.favorites = true; rulesChanged(); }));
    } else if (id === "events") {
      panel.appendChild(el("p", "rl-say", "Classics, tournaments, rivalries and finals."));
      if (inf.on) panel.appendChild(eventPicker()); else panel.appendChild(rlTurnOn(function () { r.events = true; rulesChanged(); }));
    } else if (id.indexOf("ev:") === 0) {
      var k = id.slice(3), b = (r.sports || {})[k] || {};
      panel.appendChild(el("h3", "rl-ask", inf.on ? "Pick days that are" : "Pick what to add"));
      (EV_RULES[k] || []).forEach(function (x) {
        var isOn = !!b[x[0]], row = el("div", "lopt rl-opt" + (isOn ? " on" : ""));
        var t = el("div", "rtext"), tl = el("div", "rtitle"); tl.appendChild(el("b", null, x[1])); t.appendChild(tl); t.appendChild(el("p", null, x[2]));
        row.appendChild(t);
        row.appendChild(switchEl(isOn, x[1] + ", " + rlName(id), function (v) { setEvRule(k, x[0], v); }));
        panel.appendChild(row);
      });
    } else {
      var lk = id.slice(3);
      panel.appendChild(el("h3", "rl-ask", "Pick games that are"));
      panel.appendChild(el("p", "rl-hint", "Any one counts. " + (inf.all ? inf.all + (inf.all === 1 ? " game " : " games ") + when + "." : "No games " + when + ".")));
      lgOptRows(lk, when).forEach(function (row) { panel.appendChild(row); });
    }
    body.appendChild(panel);
    if (inf.on) {
      var rm = el("button", "outline quiet rl-remove", "Remove this rule"); rm.type = "button";
      rm.addEventListener("click", function () {
        var before = clone(state.rules);
        if (id === "favorites") r.favorites = false;
        else if (id === "events") r.events = false;
        else if (id.indexOf("ev:") === 0) { r.sports = Object.assign({}, r.sports || {}); delete r.sports[id.slice(3)]; }
        else { r.by = r.by || {}; delete r.by[id.slice(3)]; }
        state.rulesEdit = null; rulesChanged(); rlScrollTop();
        topUndo("Removed " + rlName(id), function () { state.rules = before; rulesChanged(); });
      });
      body.appendChild(rm);
    }
    var dn = el("button", "solid rl-done", "Done"); dn.type = "button";
    dn.addEventListener("click", function () { state.rulesEdit = null; renderRules(); rlScrollTop(); });
    body.appendChild(dn);
  }
  function rlTurnOn(fn) {
    var row = el("div", "lopt rl-opt"), t = el("div", "rtext"), tl = el("div", "rtitle"); tl.appendChild(el("b", null, "Add to my rules")); t.appendChild(tl); row.appendChild(t);
    row.appendChild(switchEl(false, "Add to my rules", function (v) { if (v) fn(); })); return row;
  }

  // the Add a rule sheet: every rule that's off, by sport, with how many games each league has on the slate's day
  function rlSheetOpen() {
    var bd = $("sheet-rladd");
    if (!bd) {
      bd = el("div", "sheet-backdrop"); bd.id = "sheet-rladd";
      bd.setAttribute("role", "dialog"); bd.setAttribute("aria-modal", "true"); bd.setAttribute("aria-labelledby", "rladd-title");
      bd.addEventListener("click", function (e) { if (e.target === bd) rlSheetClose(); });
      document.body.appendChild(bd);
    }
    bd.textContent = "";
    var sh = el("div", "sheet rl-sheet");
    var h = el("div", "rl-sh-head"); var t = el("h3", null, "Add a rule"); t.id = "rladd-title"; h.appendChild(t);
    var x = el("button", "outline quiet rl-sh-x", "Close"); x.type = "button"; x.addEventListener("click", rlSheetClose); h.appendChild(x);
    sh.appendChild(h);
    var any = false;
    rlGroups().forEach(function (gr) {
      var ids = gr[1].filter(function (id) { return !rlInfo(id).on; }); if (!ids.length) return;
      any = true;
      sh.appendChild(el("h4", "rl-sh-sec", gr[0]));
      var list = el("div", "rl-list");
      ids.forEach(function (id) {
        var inf = rlInfo(id), row = el("button", "rl-row"); row.type = "button";
        row.appendChild(rlIcon(id));
        var tx = el("span", "rl-tx"); tx.appendChild(el("b", null, rlName(id)));
        var cnt = id === "favorites" ? inf.n : id === "events" ? inf.n : inf.all;
        tx.appendChild(el("span", null, cnt ? cnt + (inf.ev ? (cnt === 1 ? " event " : " events ") : (cnt === 1 ? " game " : " games ")) + whenWord() : "Nothing " + whenWord()));
        row.appendChild(tx); row.appendChild(icon("plus"));
        row.addEventListener("click", function () {
          if (id === "favorites") { state.rules.favorites = true; rlSheetClose(); rulesChanged(); toast("Rule on: My teams"); return; }
          if (id === "events") { state.rules.events = true; rlSheetClose(); rulesChanged(); toast("Rule on: Big events"); return; }
          rlOpen(id);
        });
        list.appendChild(row);
      });
      sh.appendChild(list);
    });
    if (!any) sh.appendChild(el("p", "rl-empty", "Every rule is already on."));
    bd.appendChild(sh); bd.classList.add("open");
  }
  function rlSheetClose() { var bd = $("sheet-rladd"); if (bd && bd.classList.contains("open")) { bd.classList.remove("open"); return true; } return false; }

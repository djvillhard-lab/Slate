  function renderRules() {
    var body = $("rules-body"); body.textContent = "";
    if (!state.rules) state.rules = normRules();
    var r = state.rules, isToday = state.date === todayInHome(), when = isToday ? "tonight" : fmtDate(state.date, { weekday: "long" }), ww = whenWord();

    // what the rules produce, in plain words
    var top = el("div", "rsum");
    var head = el("div", "rsum-head"), n = lineupGames().length;
    var nb = el("div", "rsum-n"); nb.appendChild(el("b", null, String(n))); nb.appendChild(el("span", null, (n === 1 ? "game " : "games ") + (isToday ? "tonight" : "on " + when)));
    head.appendChild(nb); top.appendChild(head);
    top.appendChild(el("p", "rsum-text", rulesSentence()));
    var ed2 = slateEdits();
    if (ed2.any) { var eb = el("div", "editbar"); eb.appendChild(el("span", null, editsText(ed2))); eb.appendChild(resetButton()); top.appendChild(eb); }
    else top.appendChild(el("p", "rsum-note", "Your slate updates on its own when you change a rule."));
    body.appendChild(top);
    var sgr = suggestionBlock("rules"); if (sgr) body.appendChild(sgr);

    // every league
    var h1 = el("div", "sec"); h1.appendChild(el("h2", null, "Every league")); body.appendChild(h1);
    var p1 = el("div", "rpanel");
    p1.appendChild(ruleRow("favorites", "My teams", "Every game your starred teams play, at any hour.", r.favorites, countMatching(hasFav), function (v) { r.favorites = v; rulesChanged(); }));
    p1.appendChild(ruleRow("events", "Big events", "Classics, tournaments, rivalries and finals.", r.events, countMatching(eventOn), function (v) { r.events = v; rulesChanged(); }, eventPicker()));
    body.appendChild(p1);

    // by league
    var h2 = el("div", "sec"); h2.appendChild(el("h2", null, "By league")); h2.appendChild(el("span", "count", "Tap a league to set its rules")); body.appendChild(h2);
    var cnt = {}; games().forEach(function (g) { cnt[g.league] = (cnt[g.league] || 0) + 1; });
    var keys = ORDER.filter(function (k) { return LG_OPTS[k]; });
    if (!state.rulesMain) state.rulesMain = keys.filter(function (k) { return (r.by || {})[k]; });
    var withGames = keys.filter(function (k) { return state.rulesMain.indexOf(k) !== -1; });
    var rest = keys.filter(function (k) { return withGames.indexOf(k) === -1; }).sort(function (a, b) { return ((cnt[b] ? 1 : 0) - (cnt[a] ? 1 : 0)) || (keys.indexOf(a) - keys.indexOf(b)); });
    var p2 = el("div", "lgcards");
    withGames.forEach(function (k) { p2.appendChild(lgCard(k, cnt, ww)); });
    if (!withGames.length) p2.appendChild(el("p", "rempty", "No league rules are on. Open More leagues to add one."));
    body.appendChild(p2);
    var more = el("details", "rmore"); if (state.rulesMoreOpen || !withGames.length) more.open = true;
    more.addEventListener("toggle", function () { state.rulesMoreOpen = more.open; });
    more.appendChild(el("summary", null, "More leagues (" + rest.length + ")"));
    var p3 = el("div", "lgcards"); rest.forEach(function (k) { p3.appendChild(lgCard(k, cnt, ww)); }); more.appendChild(p3);
    if (rest.length) body.appendChild(more);

    // fine-tune
    var h3 = el("div", "sec"); h3.appendChild(el("h2", null, "Fine-tune")); body.appendChild(h3);
    var p4 = el("div", "rpanel");
    var a = el("div", "lgline"); var at = el("div", "rtext"); var atl = el("div", "rtitle"); atl.appendChild(el("b", null, "Starts after")); at.appendChild(atl); at.appendChild(el("p", null, "Skip earlier games. Your teams always count.")); a.appendChild(at);
    a.appendChild(pillSelect("Starts after", r.after, [[0, "Any time"], [17, "5 PM"], [18, "6 PM"], [19, "7 PM"], [20, "8 PM"]], function (v) { r.after = Number(v); rulesChanged(); })); p4.appendChild(a);
    var m = el("div", "lgline"); var mt = el("div", "rtext"); var mtl = el("div", "rtitle"); mtl.appendChild(el("b", null, "Most games")); mt.appendChild(mtl); mt.appendChild(el("p", null, "Keeps your teams first, then the best of the rest.")); m.appendChild(mt);
    m.appendChild(pillSelect("Most games", r.max, [[0, "No limit"], [4, "4"], [6, "6"], [8, "8"], [10, "10"]], function (v) { r.max = Number(v); rulesChanged(); })); p4.appendChild(m);
    body.appendChild(p4);
  }



  // On TV. 3.102.1: a channel lists five games until "Show all"; My channels hides the ones you don't get.
  var TV = { edit: false, all: {} }, TV_MAX = 5, TV_HIDE = {};
  try { TV_HIDE = JSON.parse(localStorage.getItem("slate-tv-hide") || "{}") || {}; } catch (e) { TV_HIDE = {}; }
  (function () { var st = document.createElement("style"); st.id = "tv-css"; st.textContent =
    ".tv-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 44px; }" +
    ".tv-bar .rlink { min-height: 44px; margin: 0; }" +
    ".tv-more { display: block; width: 100%; min-height: 44px; text-align: center; }" +
    ".tv-ed-h { margin: 8px 0 4px; font-size: 22px; font-weight: 800; font-stretch: 112%; }" +
    ".tv-ed-row { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 4px 0; }" +
    ".tv-ed-row + .tv-ed-row { border-top: 1px solid var(--hair); }" +
    ".tv-ed-row .n { flex: 1; min-width: 0; font-size: 16px; font-weight: 700; }" +
    ".tv-ed-row .c { font-size: 13px; color: var(--dim); }" +
    ".tv-ed-done { margin-top: 16px; }";
    document.head.appendChild(st); })();
  function tvEdit(body, names, groups) {
    body.appendChild(el("h2", "tv-ed-h", "My channels"));
    body.appendChild(el("p", "hint", "Switch off the channels and services you don't get. They stay off On TV until you switch them back on."));
    var save = function () { try { localStorage.setItem("slate-tv-hide", JSON.stringify(TV_HIDE)); } catch (e) {} };
    var all = names.slice(); Object.keys(TV_HIDE).forEach(function (n) { if (all.indexOf(n) === -1) all.push(n); });
    all.forEach(function (n) {
      var r = el("div", "tv-ed-row"); r.appendChild(el("span", "n", n));
      r.appendChild(el("span", "c", groups[n] ? groups[n].length + (groups[n].length === 1 ? " game" : " games") : "none today"));
      var sw = el("button", "switch"); sw.type = "button"; sw.setAttribute("role", "switch"); sw.setAttribute("aria-label", n); sw.setAttribute("aria-checked", TV_HIDE[n] ? "false" : "true"); sw.appendChild(el("span", "knob"));
      sw.addEventListener("click", function () { if (TV_HIDE[n]) delete TV_HIDE[n]; else TV_HIDE[n] = 1; save(); sw.setAttribute("aria-checked", TV_HIDE[n] ? "false" : "true"); });
      r.appendChild(sw); body.appendChild(r);
    });
    var done = el("button", "full-mu tv-ed-done"); done.type = "button"; done.appendChild(el("b", null, "Done")); done.addEventListener("click", function () { TV.edit = false; renderTV(); window.scrollTo(0, 0); });
    body.appendChild(done);
  }
  function renderTV() {
    var body = $("tv-body");
    // TV watch setups (3.135.0): the editor isn't redrawn by live score updates, so a drag or the name you're typing stays put
    if (TVS.edit) { if (TVS.drawn && $("tvs-ed-wall")) return; body.textContent = ""; TVS.drawn = true; tvsEditor(body); return; }
    body.textContent = "";
    var gs = visibleGames();
    if (state.tvFilter === "setups") { tvsBlock(body, gs); return; }   // My TVs tab (3.135.0)
    if (!gs.length) { if (isDuo || games().length) body.appendChild(el("div", "notice", noticeText() || "No games found for this day.")); else emptyDay(body); return; }
    var groups = {};
    gs.forEach(function (g) {
      (g.tv || []).filter(Boolean).forEach(function (n) {
        var k = chanKind(n);
        if (state.tvFilter === "national" && k !== "national") return;
        if (state.tvFilter === "streaming" && k !== "streaming") return;
        (groups[n] = groups[n] || []).push(g);
      });
    });
    // My channels (3.102.1): channels the person switched off are left out; kept on this phone
    var allNames = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b, "en", { sensitivity: "base" }); });
    var nHid = allNames.filter(function (n) { return TV_HIDE[n]; }).length;
    if (TV.edit) { tvEdit(body, allNames, groups); return; }
    allNames.forEach(function (n) { if (TV_HIDE[n]) delete groups[n]; });
    // channels with a game on right now first, then the rest; alphabetical within each
    var onNow = function (n) { return groups[n].some(function (g) { return status(g).kind === "live"; }) ? 0 : 1; };
    var names = Object.keys(groups).sort(function (a, b) { return onNow(a) - onNow(b) || a.localeCompare(b, "en", { sensitivity: "base" }); });
    var bar = el("div", "tv-bar");
    var ed = el("button", "rlink", nHid ? "My channels (" + nHid + " hidden)" : "My channels"); ed.type = "button"; ed.addEventListener("click", function () { TV.edit = true; renderTV(); window.scrollTo(0, 0); }); bar.appendChild(ed);
    body.appendChild(bar);
    if (!names.length) {
      body.appendChild(el("div", "notice", state.tvFilter === "national" ? "No national TV games on this day." : state.tvFilter === "streaming" ? "No streaming-only games on this day." : "No channel listings for this day."));
      return;
    }
    // each channel opens and closes; the choice is remembered
    var saveC = function () { try { localStorage.setItem("slate-collapsed", JSON.stringify(COLLAPSED)); } catch (e) {} keepScroll(renderTV); };
    if (names.length > 1) {
      var allShut = names.every(function (n) { return COLLAPSED["tv:" + n]; });
      var ta = el("button", "rlink tv-all", allShut ? "Open all channels" : "Close all channels"); ta.type = "button";
      ta.addEventListener("click", function () { names.forEach(function (n) { if (allShut) delete COLLAPSED["tv:" + n]; else COLLAPSED["tv:" + n] = 1; }); saveC(); });
      bar.appendChild(ta);
    }
    names.forEach(function (n) {
      var rank = function (g) { var k = status(g).kind; return k === "live" ? 0 : k === "over" ? 2 : 1; };  // on now, then still to come, then finished
      var list = groups[n].sort(function (a, b) { return rank(a) - rank(b) || byStart(a, b); }), ck = "tv:" + n, shut = !!COLLAPSED[ck];
      var h = el("div", "ch-head ch-tg" + (shut ? " shut" : ""));
      var tg = el("button", "ch-tgb"); tg.type = "button"; tg.setAttribute("aria-expanded", shut ? "false" : "true");
      tg.appendChild(el("h2", null, n));
      var nLive = list.filter(function (g) { return status(g).kind === "live"; }).length;
      if (nLive) { var lv = el("span", "ch-live"); lv.appendChild(el("i")); lv.appendChild(document.createTextNode(nLive > 1 ? nLive + " live" : "Live")); tg.appendChild(lv); }
      tg.appendChild(el("span", "kind", list.length + (list.length === 1 ? " game" : " games")));
      tg.appendChild(icon("more"));
      tg.addEventListener("click", function () { if (COLLAPSED[ck]) delete COLLAPSED[ck]; else COLLAPSED[ck] = 1; saveC(); });
      h.appendChild(tg);
      var wl = watchLink(n, "chwatch", "Watch");
      if (wl) h.appendChild(wl);
      body.appendChild(h);
      var cut = list.length > TV_MAX + 1 && !TV.all[n] ? TV_MAX : list.length;
      var box = el("div", "glist"); if (!shut) list.slice(0, cut).forEach(function (g) { box.appendChild(gameRow(g, "tv")); }); body.appendChild(box);
      if (!shut && cut < list.length) { var mb = el("button", "rlink tv-more", "Show all " + list.length); mb.type = "button"; mb.addEventListener("click", function () { TV.all[n] = 1; keepScroll(renderTV); }); body.appendChild(mb); }
    });
  }


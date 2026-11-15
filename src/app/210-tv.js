  function renderTV() {
    var body = $("tv-body"); body.textContent = "";
    var gs = visibleGames();
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
    // channels with a game on right now first, then the rest; alphabetical within each
    var onNow = function (n) { return groups[n].some(function (g) { return status(g).kind === "live"; }) ? 0 : 1; };
    var names = Object.keys(groups).sort(function (a, b) { return onNow(a) - onNow(b) || a.localeCompare(b, "en", { sensitivity: "base" }); });
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
      body.appendChild(ta);
    }
    names.forEach(function (n) {
      var list = groups[n].sort(byStart), ck = "tv:" + n, shut = !!COLLAPSED[ck];
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
      var box = el("div", "glist"); if (!shut) list.forEach(function (g) { box.appendChild(gameRow(g, "tv")); }); body.appendChild(box);
    });
  }


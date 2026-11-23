  // ---- Three pages (3.128.0, DJ): News | Slate | All games, one swipe apart ----
  // A small glass bar at the bottom center holds the three. A swipe on any of them only ever changes page (days, leagues
  // and News tabs are taps now). Tapping the hammer while on the slate opens the other pages in a row above the bar.
  // On the iPhone Duo, All games gets one glass filter button bottom right (where the menu button was): it opens every
  // league (ones with no games that day grayed out) and the day, over the page. A regular iPhone keeps its league row.
  // The bottom date picker and the menu button are gone in this layout; every dated page gets the slate's day arrows in
  // its header. The old layout is kept whole: Settings > Look and text size > Navigation > Classic menu.
  // The iPhone app draws its own menu button, so this layout only runs there on builds that can hand the bottom of the
  // screen to the page (SLATE_NATIVE.webNav); older builds stay on the Classic menu by themselves.
  var N3_PAGES = ["news", "lineup", "games"], N3_MORE = [["moments", "Box Office"], ["tv", "On TV"], ["teams", "Teams"]];  // 3.129.3 (DJ): Settings moved to a button beside Search
  var N3 = { row: false, filt: false, el: null, sig: "", fsig: "", told: null };
  function n3Pref() { try { return localStorage.getItem("slate-nav") === "classic" ? "classic" : "three"; } catch (e) { return "three"; } }
  function n3HostNative() { if (!PANE) return NATIVE; try { return window.parent.slateHostNative(); } catch (e) { return NATIVE; } }
  // can this copy of the page own the bottom of the screen? A browser, the Home Screen app and the preview can; the
  // iPhone app only when its build says so
  function n3Can() { var n = n3HostNative(); return !n || n.platform === "preview" || !!n.webNav; }
  function n3On() { return n3Pref() === "three" && n3Can() && !isDuo; }
  function n3Left() { return document.documentElement.classList.contains("pn-left"); }
  // the bar shows on the three pages and on the menu's own pages (nothing lit there); a page you open shows Back instead
  function n3BarOn() {
    if (!n3On() || n3Left() || (typeof panesOn === "function" && panesOn())) return false;
    var v = state.view;
    if (v === "news") return !(typeof nw !== "undefined" && nw.deep);
    if (v === "settings") return !state.setPage;
    return v === "lineup" || v === "games" || v === "tv" || v === "teams" || v === "moments";
  }
  // the filter button: All games on the iPhone Duo (folded, or a side of the unfolded screen)
  // 3.129.x (DJ, Nov 23): News too, in place of its row of tabs (Press Box and the leagues), not inside a breakdown
  function n3FiltOn() { return n3BarOn() && deviceMode() === "duo" && (state.view === "games" ? games().length > 0 : state.view === "news" && !(typeof nw !== "undefined" && nw.deep)); }
  function n3NewsOpts() { return [[null, NW_HOME]].concat(nwBriefLgs().map(function (k) { return [k, (LEAGUES[k] || {}).tag || k]; })); }
  // page swipes: only on the three pages, and not on the unfolded Duo (both sides are in view there; the bar picks pages)
  // the day arrows (3.129.1, DJ: one tap, never two): the slate gets a glass pair of arrows bottom right, always showing
  function n3DayOn() { return n3BarOn() && n3Dated(); }  // 3.129.2: All games too; 3.129.3: News, On TV and Box Office too
  function n3SwipeOk() { return n3BarOn() && !PANE && N3_PAGES.indexOf(state.view) !== -1 && !N3.row && !N3.filt; }
  function n3Next(step) { var i = N3_PAGES.indexOf(state.view); return i === -1 ? null : N3_PAGES[i + step] || null; }
  function n3Go(v) {
    N3.row = false; N3.filt = false;
    if (state.view === v) { render(); return; }
    if (v === "lineup" || v === "news" || v === "games") { if (v === "games") state.gamesLive = false; setView(v); renderTop(); if (typeof nativeSync === "function") nativeSync(); }
    else window.SlateApp.go(v);
  }
  function n3Page(step) { var v = n3Next(step); if (v) n3Go(v); }
  function n3Icon(id) { var s = document.querySelector("#" + id + " svg"); return s ? s.cloneNode(true) : document.createElement("span"); }
  function n3Svg(d) { var b = document.createElement("span"); b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; return b.firstChild; }
  function n3Build() {
    var root = el("div", "n3"); root.id = "n3";
    var scrim = el("div", "n3-scrim"); scrim.id = "n3-scrim"; scrim.hidden = true; root.appendChild(scrim);
    scrim.addEventListener("click", function () { N3.row = false; N3.filt = false; n3Draw(); });
    // the other pages, in a row just above the bar
    var row = el("div", "n3-row"); row.id = "n3-row"; row.setAttribute("role", "menu"); row.setAttribute("aria-label", "More pages"); row.hidden = true;
    N3_MORE.forEach(function (m) {
      var b = el("button", "n3-more"); b.type = "button"; b.setAttribute("role", "menuitem");
      b.appendChild(n3Icon(m[0] === "settings" ? "nav-settings2" : "nav-" + m[0])); b.appendChild(el("span", null, m[1]));
      b.addEventListener("click", function () { n3Go(m[0]); });
      row.appendChild(b);
    });
    root.appendChild(row);
    var bar = el("nav", "n3-bar"); bar.id = "n3-bar"; bar.setAttribute("aria-label", "Pages");
    [["news", "News", "nav-news"], ["lineup", "Slate", "nav-lineup"], ["games", "All games", "nav-games"]].forEach(function (p) {
      var b = el("button", "n3-b"); b.type = "button"; b.setAttribute("data-p", p[0]); b.setAttribute("aria-label", p[1]);
      var ic = el("span", "n3-ic"); ic.appendChild(n3Icon(p[2])); b.appendChild(ic);
      if (p[0] === "lineup") { var x = el("span", "n3-x"); x.appendChild(n3Svg("M6 6l12 12M18 6L6 18")); b.appendChild(x); }
      if (p[0] === "games") b.appendChild(el("i", "n3-live"));
      b.addEventListener("click", function () {
        if (p[0] === "lineup" && state.view === "lineup") { N3.row = !N3.row; N3.filt = false; n3Draw(); return; }
        n3Go(p[0]);
      });
      bar.appendChild(b);
    });
    root.appendChild(bar);
    // All games on the Duo: the filter button and what it opens
    var fp = el("div", "n3-fp"); fp.id = "n3-fp"; fp.hidden = true;
    var rail = el("div", "n3-rail"); rail.id = "n3-rail"; rail.setAttribute("role", "group"); rail.setAttribute("aria-label", "Filter by league"); fp.appendChild(rail);
    var day = el("div", "n3-day"); day.id = "n3-day"; day.setAttribute("role", "group"); day.setAttribute("aria-label", "Pick a day");
    var dp = el("button", "n3-dar"); dp.type = "button"; dp.setAttribute("aria-label", "Previous day"); dp.appendChild(n3Svg("M15 5l-7 7 7 7"));
    var dl = el("button", "n3-dl"); dl.type = "button"; dl.id = "n3-dl"; dl.appendChild(el("b")); dl.appendChild(el("span"));
    var dn = el("button", "n3-dar"); dn.type = "button"; dn.setAttribute("aria-label", "Next day"); dn.appendChild(n3Svg("M9 5l7 7-7 7"));
    dp.addEventListener("click", function () { slideDir = "r"; setDate(shiftDate(state.date, -1)); });
    dn.addEventListener("click", function () { slideDir = "l"; setDate(shiftDate(state.date, 1)); });
    dl.addEventListener("click", function () { var t = todayInHome(); if (state.date === t) return; slideDir = state.date > t ? "r" : "l"; setDate(t); });
    day.appendChild(dp); day.appendChild(dl); day.appendChild(dn);  // 3.129.2 (DJ): no day control inside the filter; the arrows under the filter button do it
    root.appendChild(fp);
    var fb = el("button", "n3-fb"); fb.type = "button"; fb.id = "n3-fb"; fb.setAttribute("aria-label", "Filter by league"); fb.setAttribute("aria-haspopup", "true"); fb.hidden = true;
    var fi = el("span", "n3-fi"); fi.appendChild(n3Svg("M4 7h16M7 12h10M10 17h4")); fb.appendChild(fi);
    var fx = el("span", "n3-x"); fx.appendChild(n3Svg("M6 6l12 12M18 6L6 18")); fb.appendChild(fx);
    fb.appendChild(el("em", "n3-tag"));
    fb.addEventListener("click", function () { N3.filt = !N3.filt; N3.row = false; n3Draw(); if (N3.filt) { var r = $("n3-rail"); if (r) r.scrollTop = r.scrollHeight; } });
    root.appendChild(fb);
    // the slate: yesterday and tomorrow, one tap each; off today a Today chip sits just above
    var dr = el("div", "n3-dr"); dr.id = "n3-dr"; dr.setAttribute("role", "group"); dr.setAttribute("aria-label", "Change day"); dr.hidden = true;
    var rp = el("button", "n3-dra"); rp.type = "button"; rp.setAttribute("aria-label", "Previous day"); rp.appendChild(n3Svg("M15 5l-7 7 7 7"));
    var rn = el("button", "n3-dra"); rn.type = "button"; rn.setAttribute("aria-label", "Next day"); rn.appendChild(n3Svg("M9 5l7 7-7 7"));
    rp.addEventListener("click", function () { n3SetDay(shiftDate(n3DayOf(), -1)); });
    rn.addEventListener("click", function () { n3SetDay(shiftDate(n3DayOf(), 1)); });
    dr.appendChild(rp); dr.appendChild(rn); root.appendChild(dr);
    var dt = el("button", "n3-dt"); dt.type = "button"; dt.id = "n3-dt"; dt.hidden = true; dt.appendChild(el("b", null, "Today"));
    dt.addEventListener("click", function () { n3SetDay(todayInHome()); });
    root.appendChild(dt);
    // 3.129.2 (DJ): the date you are on is its own label, apart from the Today button
    var dd = el("div", "n3-dd"); dd.id = "n3-dd"; dd.hidden = true; root.appendChild(dd);
    document.body.appendChild(root);
    N3.el = root;
  }
  // the league rail: every league, nearest the thumb first (ALL at the bottom); a league with no games that day is gray
  function n3Rail() {
    var rail = $("n3-rail"); if (!rail) return;
    if (state.view === "news") {  // News: Press Box and the league briefings, Press Box nearest the thumb
      var nsig = JSON.stringify(["news", n3NewsOpts(), nw.lg]);
      if (N3.fsig !== nsig) {
        N3.fsig = nsig; rail.textContent = "";
        n3NewsOpts().slice().reverse().forEach(function (o) {
          var b = el("button", "n3-lg", o[1]); b.type = "button"; b.setAttribute("aria-pressed", nw.lg === o[0] ? "true" : "false");
          b.addEventListener("click", function () { N3.filt = false; if (nw.lg !== o[0]) nwPickLg(o[0]); n3Draw(); });
          rail.appendChild(b);
        });
      }
      return;
    }
    var gs = visibleGames(), opts = filterOpts(gs), liveLg = {};
    gs.forEach(function (g) { if (status(g).kind === "live") liveLg[g.league] = 1; });
    var sig = JSON.stringify([opts, state.league, Object.keys(liveLg).sort()]);
    if (N3.fsig !== sig) {
      N3.fsig = sig; rail.textContent = "";
      opts.forEach(function (o) {
        var b = el("button", "n3-lg" + (o[2] ? " none" : ""), o[1]); b.type = "button";
        if (o[0] === "fav") b.setAttribute("aria-label", "My teams");
        b.setAttribute("aria-pressed", state.league === o[0] ? "true" : "false");
        if (o[2]) { b.disabled = true; b.setAttribute("aria-label", LEAGUES[o[0]].name + ", no games"); }
        else b.addEventListener("click", function () { N3.filt = false; pickFilter(o[0]); n3Draw(); });
        if (liveLg[o[0]] || (o[0] === "all" && Object.keys(liveLg).length)) b.appendChild(el("i", "n3-live"));
        rail.appendChild(b);
      });
      var eb = el("button", "n3-lg n3-edit"); eb.type = "button"; eb.setAttribute("aria-label", "Edit tabs: order and which leagues show");
      eb.appendChild(icon("sliders")); eb.addEventListener("click", function () { N3.filt = false; openSub("tabs"); n3Draw(); }); rail.appendChild(eb);
    }
    n3DayLab();
  }
  function n3DayLab() {
    var t = todayInHome(), dl = $("n3-dl");
    if (dl) {
      var lab = dayLabel(state.date), named = /^(today|yesterday|tomorrow)$/.test(lab);
      dl.firstChild.textContent = fmtDate(state.date, { weekday: "short" }) + ", " + fmtDate(state.date, { month: "short", day: "numeric" });
      dl.lastChild.textContent = state.date === t ? "Today" : named ? lab.charAt(0).toUpperCase() + lab.slice(1) + " · tap for today" : "Tap for today";
    }
  }
  function n3Draw() {
    var h = document.documentElement, on = n3On(), bar = n3BarOn(), filt = n3FiltOn(), dayb = n3DayOn();
    if (!N3.el) { if (!on) { n3Tell(false); h.removeAttribute("data-nav3"); return; } n3Build(); }
    if (!bar) N3.row = false; if (state.view !== "lineup") N3.row = false; if (!filt) N3.filt = false;
    if (on) h.setAttribute("data-nav3", ""); else h.removeAttribute("data-nav3");
    if (bar) h.setAttribute("data-n3bar", ""); else h.removeAttribute("data-n3bar");
    if (filt) h.setAttribute("data-n3f", ""); else h.removeAttribute("data-n3f");
    n3Tell(on);
    var liveAny = false;
    if (bar && state.date === todayInHome()) liveAny = games().some(function (g) { return status(g).kind === "live"; });
    var lgTag = "";
    if (filt && state.view === "news") lgTag = nw.lg ? (LEAGUES[nw.lg] || {}).tag || nw.lg : "";
    else if (filt && state.league !== "all") filterOpts(visibleGames()).forEach(function (o) { if (o[0] === state.league) lgTag = o[1]; });
    var dNow = dayb ? n3DayOf() : "";
    var offDay = dayb && dNow !== todayInHome() ? fmtDate(dNow, { weekday: "short" }) + " " + fmtDate(dNow, { month: "short", day: "numeric" }) : "";
    var sig = [on, bar, filt, dayb, offDay, state.view, N3.row, N3.filt, liveAny, lgTag].join("|");
    if (sig !== N3.sig) {
      N3.sig = sig;
      N3.el.hidden = !on;
      $("n3-bar").hidden = !bar;
      Array.prototype.forEach.call($("n3-bar").children, function (b) {
        var p = b.getAttribute("data-p"), cur = p === state.view;
        if (cur) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
        if (p === "lineup") { b.setAttribute("aria-expanded", N3.row ? "true" : "false"); b.setAttribute("aria-label", cur ? (N3.row ? "Close more pages" : "Slate. Tap for more pages") : "Slate"); }
        if (p === "games") b.classList.toggle("has-live", liveAny && !cur);
      });
      $("n3-row").hidden = !N3.row;
      $("n3-fb").hidden = !filt; $("n3-fb").setAttribute("aria-expanded", N3.filt ? "true" : "false");
      $("n3-dr").hidden = !dayb || N3.row; $("n3-dt").hidden = !offDay || N3.row || N3.filt; $("n3-dd").hidden = !offDay || N3.row || N3.filt; $("n3-dd").textContent = offDay;
      var tg = $("n3-fb").querySelector(".n3-tag"); tg.textContent = lgTag; tg.hidden = !lgTag || N3.filt;
      $("n3-fp").hidden = !N3.filt;
      $("n3-scrim").hidden = !(N3.row || N3.filt);
    }
    if (N3.filt) n3Rail();
    n3Pin();
  }
  // the app is told when the page draws the bottom of the screen itself, so it puts its own menu button away
  function n3Tell(on) {
    if (PANE || !NATIVE || !NATIVE.webNav) return;
    var want = n3Pref() === "three" && (!isDuo || (typeof panesOn === "function" && panesOn()));
    if (N3.told === want) return; N3.told = want;
    nativePost({ t: "nav", web: want });
  }
  // stays at the bottom of the screen with the dock (iPhone's toolbar and zoom move fixed things)
  function n3Pin() { if (N3.el) { var t = dockShift(); if (N3.el.style.transform !== t) N3.el.style.transform = t; } }
  window.addEventListener("scroll", n3Pin, { passive: true });
  if (window.visualViewport) { window.visualViewport.addEventListener("scroll", n3Pin); window.visualViewport.addEventListener("resize", n3Pin); }
  // ---- the day in every dated page's header (the bottom date picker is gone in this layout) ----
  function n3Dated() { var v = state.view; return v === "lineup" || v === "games" || v === "tv" || v === "moments" || (v === "news" && !(typeof nw !== "undefined" && nw.deep)); }
  function n3DayOf() { return state.view === "moments" ? (mm.date || todayInHome()) : state.date; }
  function n3SetDay(iso) {
    var v = state.view, today = todayInHome(), cur = n3DayOf();
    if (!iso || iso === cur) return;
    if (v === "moments") { mmSetDate(iso); renderTop(); return; }
    if (v === "news") { if (iso > today) { if (cur >= today) { toast("News goes up to today"); return; } iso = today; } nwx.past = iso < today ? iso : null; nw.opts = false; }
    slideDir = iso > state.date ? "l" : "r"; setDate(iso);
  }
  // 3.129.3 (DJ): Settings is a permanent button beside Search at the top of every page (not on Settings itself)
  function n3Gear() {
    var on = n3On() && state.view !== "settings";
    ["btn-settings", "l-btn-settings"].forEach(function (id) { var b = $(id), f = $(id.replace("settings", "find")); if (b && on && f && !f.hidden) { b.hidden = false; if (f.parentNode === b.parentNode) f.parentNode.insertBefore(b, f); } });
  }
  function n3Top() {
    n3Gear();
    if (!n3On() || !n3Dated()) return;
    var td = $("title-d"), sub = $("title-sub"), tl = $("title"), today = todayInHome(), day = n3DayOf();
    td.hidden = false; if (sub) sub.hidden = true; if (tl) tl.classList.remove("one-line");
    var away = Math.round((new Date(day + "T12:00:00") - new Date(today + "T12:00:00")) / 86400000);
    var shortDate = fmtDate(day, { weekday: "short" }) + ", " + fmtDate(day, { month: "short", day: "numeric" });
    $("day-label").textContent = Math.abs(away) <= 1 || state.view !== "lineup" ? shortDate : away > 0 ? "In " + away + " days" : -away + " days ago";
    $("day-input").value = day;
    $("day-today").hidden = day === today || n3DayOn();  // 3.129.2 (DJ): Today is bottom right only   // the Back button used to jump to today; the bar took its place
  }
  // News and Box Office keep their own day; the header's arrows are the slate's, so their taps are taken here first
  (function () {
    function mine() { return n3On() && (state.view === "moments" || state.view === "news"); }
    function hook(id, ev, fn) { var n = $(id); if (n) n.addEventListener(ev, function (e) { if (!mine()) return; e.stopImmediatePropagation(); e.preventDefault(); fn(n); }, true); }
    hook("day-prev", "click", function () { n3SetDay(shiftDate(n3DayOf(), -1)); });
    hook("day-next", "click", function () { n3SetDay(shiftDate(n3DayOf(), 1)); });
    hook("day-today", "click", function () { n3SetDay(todayInHome()); });
    hook("day-input", "change", function (n) { if (n.value) n3SetDay(n.value); });
  })();
  // ---- wiring into the page's own drawing ----
  var n3RenderTop0 = renderTop;
  renderTop = function () { n3RenderTop0(); n3Top(); n3Draw(); };
  // the app's "hide your menu button" marks don't apply while the page draws the bottom itself
  var n3NativeApply0 = nativeApply;
  nativeApply = function () {
    n3NativeApply0();
    if (n3On()) { var h = document.documentElement; h.removeAttribute("data-strip"); h.removeAttribute("data-float"); h.removeAttribute("data-nback"); }
  };
  var n3RenderSettings0 = renderSettings;
  renderSettings = function () { n3RenderSettings0(); n3Settings(); };
  // ---- Settings > Look and text size > Navigation ----
  function n3Settings() {
    var seg = $("nav-seg");
    if (!seg) {
      var dev = $("device-seg"), card0 = dev && dev.closest(".setcard"); if (!card0) return;
      var sec = el("div", "sec"); sec.appendChild(el("h2", null, "Navigation"));
      var card = el("div", "setcard"); seg = el("div", "seg seg2"); seg.id = "nav-seg"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Navigation");
      [["three", "Three pages"], ["classic", "Classic menu"]].forEach(function (o) {
        var b = el("button", null, o[1]); b.type = "button"; b.setAttribute("data-nav", o[0]);
        b.addEventListener("click", function () {
          if (o[0] === "three" && !n3Can()) { toast("Three pages needs the newer iPhone app build"); return; }
          if (n3Pref() === o[0]) return;
          try { localStorage.setItem("slate-nav", o[0]); } catch (e) {}
          N3.sig = ""; N3.told = null; state.menuOpen = false; nativeApply(); render(); repinDock();
          try { if (PANE) window.parent.slatePaneNav && window.parent.slatePaneNav(); } catch (e) {}
        });
        seg.appendChild(b);
      });
      card.appendChild(seg); var hint = el("p", "hint"); hint.id = "nav-hint"; card.appendChild(hint);
      card0.parentNode.insertBefore(card, card0.nextSibling); card0.parentNode.insertBefore(sec, card);
    }
    var cur = n3Pref() === "three" && n3Can() ? "three" : "classic";
    Array.prototype.forEach.call(seg.children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-nav") === cur ? "true" : "false"); });
    $("nav-hint").textContent = !n3Can() ? "This iPhone app build has the Classic menu only. Three pages arrives with the next app build."
      : cur === "three" ? "News, Slate and All games sit on a bar at the bottom, a swipe apart. Tap the hammer on the slate for Box Office, On TV, Teams and Settings."
      : "One menu button at the bottom right opens every page.";
  }
  // the other side of the unfolded Duo (and other tabs) follow the switch
  window.addEventListener("storage", function (e) { if (e && e.key === "slate-nav") { N3.sig = ""; N3.told = null; nativeApply(); render(); } });
  window.slateNavRedraw = function () { N3.sig = ""; N3.told = null; nativeApply(); render(); };
  nativeApply();

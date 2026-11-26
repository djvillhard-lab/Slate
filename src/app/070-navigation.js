  // ---------- going back, one-handed: a Back button beside the menu in the bottom-right corner, or a sideways swipe ----------
  function paneY() { return isDuo ? $("pane-r").scrollTop : (window.scrollY || 0); }
  // open a page that Back returns from (the menu's own pages don't keep a Back)
  function openSub(v) {
    var from = state.view, y = paneY(); if (from === v) return;
    var parentBk = state.backTo;
    setView(v); state.backTo = { view: isDuo && from === "lineup" ? homeView() : from, y: y, parent: parentBk }; renderBack();
    var sec = $("view-" + v); if (sec && !REDUCED) { sec.classList.remove("push-in"); void sec.offsetWidth; sec.classList.add("push-in"); setTimeout(function () { sec.classList.remove("push-in"); }, 320); }
  }
  // day picker for Player rankings and All games: a vertical pill above Back, by the right thumb (later day on top)
  // On TV: All / National TV / Streaming, by tap or swipe
  var TV_TABS = ["all", "national", "streaming", "setups"];  // My TVs: TV watch setups (3.135.0)
  function tvPick(k, dir) { if (state.tvFilter === k) return; var i0 = TV_TABS.indexOf(state.tvFilter); state.tvFilter = k; render(); slideIn($("tv-body"), dir || (TV_TABS.indexOf(k) > i0 ? "l" : "r")); }
  function tvSwipe(step) { var i = TV_TABS.indexOf(state.tvFilter), n = TV_TABS[i + step]; if (n) tvPick(n, step > 0 ? "l" : "r"); }
  function renderDockDay() {
    var dn = $("dock-day"); if (!dn) return;
    var v = state.view, on = (v === "best" || v === "games" || v === "tv" || v === "moments" || (v === "lineup" && !isDuo) || (v === "news" && !nw.deep)) && !state.menuOpen;  // News too (3.113.14, DJ): back to earlier days' pages, up to today  // the slate too (3.49.0): the same picker under the thumb on every dated page
    var wasOn = !dn.hidden; dn.hidden = !on; if (!on) return;
    // grow in only when it appears (not every refresh, or when the page re-pins the dock while it bounces)
    if (!wasOn && !REDUCED) { dn.classList.remove("dd-in"); void dn.offsetWidth; dn.classList.add("dd-in"); clearTimeout(dn._t); dn._t = setTimeout(function () { dn.classList.remove("dd-in"); }, 300); }
    dn.textContent = "";
    var today = todayInHome(), mmMode = v === "moments", rkMode = v === "best" || mmMode, day = mmMode ? (mm.date || today) : v === "best" ? (rk.date || today) : state.date;
    var nwMode = v === "news", go = function (iso) { if (mmMode) mmSetDate(iso); else if (rkMode) rkSetDate(iso); else { if (nwMode) { if (iso > today) iso = today; nwx.past = iso < today ? iso : null; nw.opts = false; } slideDir = iso > state.date ? "l" : "r"; setDate(iso); } };
    var lastDay = today, atEnd = (rkMode || nwMode) && day >= lastDay;
    var nxt = el("button", "dd-arrow" + (atEnd ? " dd-end" : "")); nxt.type = "button"; nxt.setAttribute("aria-label", "Next day"); nxt.appendChild(icon("more"));
    nxt.addEventListener("click", function () { if (atEnd) { if (nwMode) toast("News goes up to today"); else if (!mmMode) toast("Rankings go up to today"); return; } go(shiftDate(day, 1)); });
    var lab = el("label", "dd-date");
    var dl = day === today ? "Today" : day === shiftDate(today, -1) ? "Yest." : day === shiftDate(today, 1) ? "Tmrw" : fmtDate(day, { weekday: "short" });
    lab.appendChild(el("b", null, fmtDate(day, { month: "short" }))); lab.appendChild(el("b", "dd-n", fmtDate(day, { day: "numeric" }))); lab.appendChild(el("em", null, dl));
    var inp = document.createElement("input"); inp.type = "date"; inp.className = "dd-input"; if (rkMode || nwMode) inp.max = lastDay; inp.value = day; inp.setAttribute("aria-label", "Pick a day");
    inp.addEventListener("change", function () { if (inp.value) go(inp.value); });
    lab.appendChild(inp);
    var prev = el("button", "dd-arrow dd-prev"); prev.type = "button"; prev.setAttribute("aria-label", "Previous day"); prev.appendChild(icon("more"));
    prev.addEventListener("click", function () { go(shiftDate(day, -1)); });
    dn.appendChild(nxt); dn.appendChild(lab); dn.appendChild(prev);
  }
  // Back always returns to tonight's slate (unfolded, the slate is on the left, so the right side returns to All games)
  function homeView() { return isDuo ? "games" : "lineup"; }  // unfolded, the right side opens on All games
  // pages reached from another page (Notifications or Slate rules from Settings, a team from Teams, a matchup from
  // All games or On TV): Back returns there, where you were. The menu's own pages go back to the home page.
  var MENU_PAGES = ["lineup", "games", "tv", "teams", "moments", "news", "settings"];
  function goBack() {
    if (typeof plrBack === "function" && plrBack()) return true;  // 3.112.2: an open player page closes first
    if (typeof findBack === "function" && findBack()) return true;  // 3.119.0: then an open search
    if (state.view === "news" && typeof nwCloseDeep === "function" && nwCloseDeep()) return true;  // a News breakdown: back to the News page
    if (typeof setPageBack === "function" && setPageBack()) return true;  // a Settings sub-page: back to the Settings main page
    var bk = state.backTo, cur = state.view, h0 = homeView();
    if (bk && bk.view && bk.view !== cur && bk.view !== h0 && MENU_PAGES.indexOf(cur) === -1 && $("view-" + bk.view)) {
      var y0 = bk.y || 0; state.backTo = bk.parent || null;
      state.view = bk.view; state.menuOpen = false; render(); repinDock();
      setTimeout(function () { if (isDuo) $("pane-r").scrollTop = y0; else window.scrollTo(0, y0); }, 0);
      renderBack(); return true;
    }
    var home = homeView(); if (state.view === home && state.date === todayInHome() && (home !== "moments" || !mm.date || mm.date === todayInHome())) return false;
    state.backTo = null; if (home === "moments") { mm.date = null; mm.picked = false; }
    if (state.view !== home) setView(home);
    if (state.date !== todayInHome()) { slideDir = "r"; setDate(todayInHome()); }
    if (isDuo) { $("pane-r").scrollTop = 0; $("pane-l").scrollTop = 0; } else window.scrollTo(0, 0);
    renderBack(); repinDock(); setTimeout(repinDock, 350);
    return true;
  }
  function renderBack() {
    if (typeof nativeSync === "function") setTimeout(nativeSync, 0);
    var bt = $("dock-back"); if (!bt) return;
    // also shown on another day's slate (after a swipe), as a quick way back to today
    var offDay = state.date && state.date !== todayInHome() && (state.view === "lineup" || isDuo);
    var show = state.view !== homeView() || offDay;
    bt.hidden = !show; renderDockDay(); renderDockSort();
    // on another day's slate the arrow points toward today: right from a past day, left from a future one
    bt.classList.toggle("fwd", !!(offDay && (state.view === "lineup" || state.view === homeView()) && state.date < todayInHome())); var dk = document.querySelector("nav.dock"); if (dk) dk.classList.toggle("menu-open", !!state.menuOpen);
    if (show) { $("dock-back-t").textContent = state.view === "settings" && state.setPage ? "Settings" : state.view === homeView() || (isDuo && state.view === "lineup") ? "Today" : isDuo ? "All games" : "Tonight's Slate"; bt.setAttribute("aria-label", state.view === homeView() ? "Back to today" : isDuo ? "Back to All games" : "Back to tonight's slate"); }
  }
  // Time | League for the slate, where the day picker sits on other pages
  function renderDockSort() {
    var ds = $("dock-sort"); if (!ds) return;
    var on = false;  // Time | League lives at the top of the slate now
    ds.hidden = !on; if (!on) return; ds.textContent = "";
    [["time", "Time"], ["league", "League"]].forEach(function (o) {
      var b0 = el("button", "ds-b", o[1]); b0.type = "button"; b0.setAttribute("aria-pressed", (state.slateSort || "time") === o[0] ? "true" : "false");
      b0.addEventListener("click", function () { if ((state.slateSort || "time") === o[0]) return; state.slateSort = o[0]; state.slOrderEdit = false; saveSettings(); keepScroll(renderLineup); renderDockSort(); });
      ds.appendChild(b0);
    });
  }
  // league order: a small icon beside League in the sort switch
  function slOrdBtn(cls) {
    var b = el("button", cls); b.type = "button"; b.setAttribute("aria-label", "Change league order"); b.setAttribute("aria-pressed", state.slOrderEdit ? "true" : "false");
    b.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/></svg><span>Reorder</span>';
    b.addEventListener("click", function () {
      if (state.slateSort !== "league") { state.slateSort = "league"; state.slOrderEdit = false; saveSettings(); }  // order is a League-view thing: switch to it
      state.slOrderEdit = !state.slOrderEdit; keepScroll(renderLineup); renderDockSort(); if (state.slOrderEdit) { if (isDuo) $("pane-l").scrollTop = 0; else window.scrollTo(0, 0); } });
    return b;
  }
  // after the final: a recap (written once, frozen an hour after the game ends) takes the quick read's place
  function recapOf(pv) { return pv && pv.recap && pv.recap.text ? pv.recap : null; }
  function recapShown(g) { return state.showScores || !!(state.recapOpen || {})[g.id]; }
  function recapGate(g) {
    var w = el("div", "pv-gate");
    w.appendChild(el("span", null, "Final. The recap has the score, and scores are hidden."));
    var b = el("button", "pv-get", "Show recap"); b.type = "button";
    b.addEventListener("click", function (e) { e.stopPropagation(); state.recapOpen = state.recapOpen || {}; state.recapOpen[g.id] = true; keepScroll(render); });
    w.appendChild(b); return w;
  }
  // the moment a game ends: a recap straight from the box score, until Claude's written one arrives
  function quickRecap(g) {
    if (!window.SLATE_SELF || status(g).kind !== "over") return null;
    var sc = scoreOf(g); if (!sc || sc.state !== "post") return null;
    var b = boxFor(g); if (!b || b.state !== "post") { bxNeed(g); }
    var a = Number(sc.a), h = Number(sc.h), an = short(g, "away"), hn = short(g, "home");
    var text = a === h ? "Final: " + (homeFirst(g) ? hn + " " + h + ", " + an + " " + a : an + " " + a + ", " + hn + " " + h) + " (tied)."
      : "Final: " + (a > h ? an + " " + a + ", " + hn + " " + h : hn + " " + h + ", " + an + " " + a) + ".";
    if (sc.detail && /OT|SO|\/\d|extra/i.test(sc.detail)) text = text.replace(/\.$/, " (" + sc.detail.replace(/^Final\/?/i, "") + ").").replace(" ().", ".");
    var stars = [];
    if (b && b.state === "post") {
      var sport = BX_SPORT[g.league] || "", win = a > h ? "away" : h > a ? "home" : "";
      b.teams.forEach(function (t) {
        var best = null;
        function ci(grp, l) { for (var i = 0; i < grp.cols.length; i++) if (String(grp.cols[i]).toUpperCase() === l) return i; return -1; }
        function n(r, i) { var v = i < 0 ? "" : String(r.s[i] || ""); return parseFloat(v) || 0; }
        function v(r, i) { return i < 0 ? "" : String(r.s[i] || ""); }
        t.groups.forEach(function (grp, gi) {
          (grp.rows || []).forEach(function (r) {
            if (r.dnp != null || !r.s || !r.s.length) return;
            var sc2 = 0, line = "";
            if (sport === "bball") {
              var P = ci(grp, "PTS"), R = ci(grp, "REB"), A = ci(grp, "AST"); if (P < 0) return;
              sc2 = n(r, P) + 0.5 * n(r, R) + 0.7 * n(r, A); line = v(r, P) + " pts" + (R >= 0 ? ", " + v(r, R) + " reb" : "") + (A >= 0 ? ", " + v(r, A) + " ast" : "");
            } else if (sport === "hockey") {
              var G = ci(grp, "G"), A2 = ci(grp, "A"), SV = ci(grp, "SV");
              if (G >= 0) { sc2 = n(r, G) * 2 + n(r, A2); if (!sc2) return; line = v(r, G) + " G, " + (A2 >= 0 ? v(r, A2) : "0") + " A"; }
              else if (SV >= 0) { sc2 = n(r, SV) / 12; line = v(r, SV) + " saves"; }
            } else if (sport === "football") {
              var Y = ci(grp, "YDS"), TD = ci(grp, "TD"), k = String(grp.k || "").toLowerCase(); if (Y < 0) return;
              var kind = k.indexOf("pass") === 0 ? "pass" : k.indexOf("rush") === 0 ? "rush" : k.indexOf("rec") === 0 ? "rec" : ""; if (!kind) return;
              sc2 = n(r, Y) / (kind === "pass" ? 2.5 : 1) + n(r, TD) * 20; line = v(r, Y) + " " + kind + " yds" + (n(r, TD) ? ", " + v(r, TD) + " TD" : "");
            } else if (sport === "baseball") {
              var H = ci(grp, "H"), RBI = ci(grp, "RBI"), HR = ci(grp, "HR"), IP = ci(grp, "IP"), ER = ci(grp, "ER"), K = ci(grp, "K");
              if (IP >= 0) { sc2 = n(r, IP) * 1.2 + n(r, K) * 0.5 - n(r, ER); line = v(r, IP) + " IP, " + v(r, ER) + " ER, " + v(r, K) + " K"; }
              else if (RBI >= 0) { sc2 = n(r, H) + n(r, RBI) * 1.5 + n(r, HR) * 2; if (!sc2) return; line = v(r, H) + " H" + (n(r, HR) ? ", " + v(r, HR) + " HR" : "") + (n(r, RBI) ? ", " + v(r, RBI) + " RBI" : ""); }
            } else if (sport === "soccer") {
              var G3 = ci(grp, "G"), A3 = ci(grp, "A"); sc2 = n(r, G3) * 2 + n(r, A3); if (!sc2) return;
              line = (n(r, G3) ? v(r, G3) + (n(r, G3) > 1 ? " goals" : " goal") : "") + (n(r, A3) ? (n(r, G3) ? ", " : "") + v(r, A3) + (n(r, A3) > 1 ? " assists" : " assist") : "");
            }
            if (line && (!best || sc2 > best.sc)) best = { sc: sc2, name: r.n, team: t.abbr, line: line, win: t.side === win };
          });
        });
        if (best) stars.push(best);
      });
      stars.sort(function (x, y) { return (y.win ? 1 : 0) - (x.win ? 1 : 0) || y.sc - x.sc; });
    }
    return { text: text, stars: stars, quick: true };
  }
  // a quick read as a paragraph or as bullet points (Claude's own bullets when it wrote them, otherwise one per sentence);
  // the style is picked only in Settings > Slate and games > Quick reads (state.pvStyle)
  // quick reads and Claude's write-ups always show in full (no "More" link)
  function readNode(text, bullets, cls, plain) {
    if (state.pvStyle !== "bullets" || plain || !text) return el("p", cls, text || "");
    var items = Array.isArray(bullets) && bullets.length ? bullets
      : String(text).replace(/\b(St|Jr|Sr|Mr|Dr|No|vs|Mt|Ft|Ave|U\.S)\./g, "$1\u0001").replace(/([a-z0-9%)][.!?])\s+(?=[A-Z"\u201c])/g, "$1\n")
          .split("\n").map(function (x) { return x.replace(/\u0001/g, ".").trim(); }).filter(Boolean);
    if (items.length < 2) return el("p", cls, text);
    var ul = el("ul", cls + " pv-bul"); items.forEach(function (t) { ul.appendChild(el("li", null, t)); }); return ul;
  }
  function byLine(pv) {
    var rc = recapOf(pv);
    if (rc) { var ra = new Date(rc.at || pv.updatedAt); return "Recap by Claude" + (rc.final ? " · final" : !isNaN(ra) ? " · " + ra.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""); }
    var t = new Date(pv.updatedAt); if (isNaN(t)) return "";
    // say which day: "updated 10:04 PM" alone reads like the future at 7 PM
    var dd = Math.round((new Date(new Date().toDateString()) - new Date(t.toDateString())) / 864e5), dw = dd === 0 ? "" : dd === 1 ? "yesterday " : t.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " ";
    return "Preview by Claude · updated " + dw + t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  // The day picker and Back step out of the way while you scroll down, and come back when you scroll up, reach the
  // bottom or change pages (3.49.0). The menu button stays. Works for the page and for the open Duo's right pane.
  (function () {
    var root = document.documentElement, lastY = 0, lastView = null;
    function away(on) { root.classList.toggle("dock-away", !!on); }
    function onScroll(y, max) {
      if (state.view !== lastView) { lastView = state.view; lastY = y; away(false); return; }
      if (state.menuOpen || y < 60 || y >= max - 24) away(false);
      else if (y > lastY + 8) away(true);
      else if (y < lastY - 8) away(false);
      else return;
      lastY = y;
    }
    window.addEventListener("scroll", function () { if (!isDuo) onScroll(window.scrollY || 0, document.documentElement.scrollHeight - window.innerHeight); }, { passive: true });
    var pr = $("pane-r"); if (pr) pr.addEventListener("scroll", function () { if (isDuo) onScroll(pr.scrollTop, pr.scrollHeight - pr.clientHeight); }, { passive: true });
    document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#menu-fab")) away(false); }, true);
  })();

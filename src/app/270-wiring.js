  // ---------- wiring ----------
  $("nav-lineup").addEventListener("click", function () { setView("lineup"); });
  function menuGo(v) { state.menuOpen = false; if (state.view === v) { render(); return; } openSub(v); state.backTo = null; renderBack(); }
  $("nav-games").addEventListener("click", function () { state.gamesLive = false; menuGo("games"); });
  $("nav-teams").addEventListener("click", function () { menuGo("teams"); });
  $("nav-moments").addEventListener("click", function () { mm.date = null; mm.picked = false; menuGo("moments"); });

  $("btn-settings").addEventListener("click", function () { openSub("settings"); showCost(); });
  $("btn-refresh").addEventListener("click", resetApp);
  $("l-btn-refresh").addEventListener("click", resetApp);
  // More (the header's second button): Reset, Slate rules and Share in one small menu
  ["btn-more", "l-btn-more"].forEach(function (bid) {
    var btn = $(bid), pop = null; if (!btn) return;
    function close() { if (pop) { pop.remove(); pop = null; btn.setAttribute("aria-expanded", "false"); } }
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); if (pop) return close();
      pop = el("div", "more-pop"); pop.setAttribute("role", "menu");
      var ICO = {
        reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
        rules: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4"/></svg>',
        share: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg>'
      };
      [["Reset the app", function () { resetApp(); }, "reset"], ["Slate rules", function () { openSub("rules"); }, "rules"], ["Share the slate", function () { $("btn-copy").click(); }, "share"]].forEach(function (it) {
        var b = el("button", "mi more-i"); b.type = "button"; b.setAttribute("role", "menuitem");
        b.innerHTML = ICO[it[2]]; b.appendChild(el("span", null, it[0]));
        b.addEventListener("click", function (ev) { ev.stopPropagation(); close(); it[1](); }); pop.appendChild(b);
      });
      var r = btn.getBoundingClientRect();
      pop.style.top = Math.round(r.bottom + 6) + "px"; pop.style.right = Math.max(8, Math.round(window.innerWidth - r.right)) + "px";
      document.body.appendChild(pop); btn.setAttribute("aria-expanded", "true");
    });
    document.addEventListener("click", close); window.addEventListener("scroll", close, { passive: true });
  });
  $("l-btn-settings").addEventListener("click", function () { openSub("settings"); showCost(); });
  $("set-share").addEventListener("click", function () { $("btn-copy").click(); });
  $("set-reset").addEventListener("click", function () { resetApp(); });
  // what the on-demand summaries have cost this month (DJ only; the worker logs each one to stats/usage)
  function screenDiag() {
    var d = $("screen-diag"); if (!d) return; d.hidden = true; var vv = window.visualViewport, pr = document.createElement("div");
    pr.style.cssText = "position:fixed;left:0;right:0;top:0;bottom:0;pointer-events:none;visibility:hidden"; document.body.appendChild(pr); var fh = pr.getBoundingClientRect().height; pr.remove();
    d.textContent = "Screen check: window " + window.innerWidth + "×" + window.innerHeight + " · fixed area " + Math.round(fh) + " · visible " + (vv ? Math.round(vv.width) + "×" + Math.round(vv.height) : "?") + " · screen " + screen.width + "×" + screen.height + " · " + (isDuo ? "split" : "single");
  }
  function showCost() { screenDiag();
    var installed = window.navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || !!window.SLATE_NATIVE;
    Array.prototype.forEach.call(document.querySelectorAll(".a2hs"), function (x) { x.hidden = installed; });
    var me = ""; try { me = localStorage.getItem("slate-user") || "dj"; } catch (e) {}
    if (!db || me !== "dj") return;
    db.doc("stats/usage").get().then(function (sn) {
      var d = sn.exists ? sn.data() : null, mo = todayInHome().slice(0, 7), n = 0, usd = 0, by = {};
      Object.keys((d && d.days) || {}).forEach(function (k) { if (k.slice(0, 7) !== mo) return; var x = d.days[k]; n += x.n || 0; usd += x.usd || 0; Object.keys(x.by || {}).forEach(function (u) { by[u] = (by[u] || 0) + x.by[u]; }); });
      // who wrote how many is still counted per person (stats/usage "by"); the line here just shows the totals
      $("cost-text").textContent = n ? "This month: " + n + (n === 1 ? " summary" : " summaries") + ", about $" + usd.toFixed(2) + "." : "None written this month yet. Each costs roughly 10 to 20 cents.";
      $("cost-row").hidden = false;
    }, function () {});
  }
  $("nav-tv").addEventListener("click", function () { menuGo("tv"); });
  $("nav-news").addEventListener("click", function () { menuGo("news"); });
  $("nav-settings2").addEventListener("click", function () { menuGo("settings"); showCost(); });
  $("open-notify").addEventListener("click", function () { openSub("notify"); });
  $("open-rules").addEventListener("click", function () { openSub("rules"); });
  $("nt-phone-btn").addEventListener("click", pushTurnOn);
  // release history: CHANGELOG.md, built into the page as window.SLATE_CHANGES
  (function () {
    var tg = $("rel-tg"), list = $("rel-list"); if (!tg || !list) return;
    tg.appendChild(icon("more"));
    var md = String(window.SLATE_CHANGES || ""), built = false;
    function fill() {
      built = true; list.textContent = "";
      var cur = null;
      md.split("\n").forEach(function (ln) {
        var h = /^##\s+(\S+)\s*(?:\((.*?)\))?\s*(.*)$/.exec(ln);
        if (h) { cur = el("div", "rel-v"); var hd = el("div", "rel-h"); hd.appendChild(el("b", null, "Slate " + h[1])); hd.appendChild(el("span", null, (h[2] || "") + (h[3] ? " · " + h[3].replace(/^[:\s]+/, "") : ""))); cur.appendChild(hd); cur.appendChild(el("ul")); list.appendChild(cur); return; }
        var tf = /^TestFlight:\s*(.*)$/.exec(ln);
        if (tf && cur) { cur.insertBefore(el("p", "rel-tf", "iPhone app: TestFlight " + tf[1]), cur.querySelector("ul")); return; }
        var it = /^-\s+(.*)$/.exec(ln);
        if (it && cur) cur.querySelector("ul").appendChild(el("li", null, it[1]));
      });
      if (!list.children.length) list.appendChild(el("p", "pv-none", "No release notes yet."));
    }
    tg.addEventListener("click", function () {
      var open = list.hidden; if (open && !built) fill();
      list.hidden = !open; tg.setAttribute("aria-expanded", open ? "true" : "false"); $("rel-sec").classList.toggle("open", open);
    });
  })();
  (function () {
    var b = window.SLATE_BUILD || "", t = $("ver-text");
    var vb = $("ver-row").querySelector("b"); if (vb) vb.textContent = "Slate " + SLATE_VERSION;
    if (t) t.textContent = b ? "Built " + new Date(b.slice(0, 4) + "-" + b.slice(4, 6) + "-" + b.slice(6, 8) + "T" + b.slice(8, 10) + ":" + b.slice(10, 12) + ":00").toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + ". Tap to load the newest version." : "Tap to load the newest version.";
    $("ver-btn").addEventListener("click", function () { if (window.slateForceUpdate) window.slateForceUpdate(); else location.reload(); });
  })();
  $("dock-back").addEventListener("click", function () { state.menuOpen = false; goBack(); });
  Array.prototype.forEach.call(document.querySelectorAll("#view-notify .seg[data-pref]"), function (sg) {
    Array.prototype.forEach.call(sg.children, function (b) {
      b.addEventListener("click", function () {
        if (!state.notifyLoaded) { toast("Loading your settings…"); return; }
        setPref(sg.getAttribute("data-pref"), b.getAttribute("data-v") === "on"); saveNotify(); render();
      });
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("#view-notify select[data-pref]"), function (sl) {
    sl.addEventListener("change", function () {
      if (!state.notifyLoaded) return;
      setPref(sl.getAttribute("data-pref"), Number(sl.value)); saveNotify(); render();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("#view-notify [data-chip]"), function (b) {
    b.addEventListener("click", function () {
      if (!state.notifyLoaded) return;
      var p = b.getAttribute("data-chip"); setPref(p, !getPref(p));
      if (p.indexOf("liveAct.") === 0) setPref("liveAct.on", !!(getPref("liveAct.lineup") || getPref("liveAct.myTeams")));  // on whenever either is ticked
      saveNotify(); render();
    });
  });

  Array.prototype.forEach.call($("device-seg").children, function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-device"); if (v === deviceMode() && state.device) return;
      state.device = v; saveSettings(); applyLook(); applyLayout(true);
      toast(v === "duo" ? "Set up for iPhone Duo" : "Set up for iPhone");
    });
  });
  Array.prototype.forEach.call($("pvstyle-seg").children, function (b) {
    b.addEventListener("click", function () { state.pvStyle = b.getAttribute("data-v"); saveSettings(); render(); });
  });
  Array.prototype.forEach.call($("score-seg").children, function (b) {
    b.addEventListener("click", function () { state.showScores = b.getAttribute("data-v") === "on"; saveSettings(); render(); });
  });
  Array.prototype.forEach.call($("size-seg").children, function (b) {
    b.addEventListener("click", function () { state.textSize = b.getAttribute("data-size"); applyLook(); saveSettings(); render(); });
  Array.prototype.forEach.call($("size-seg-wide").children, function (b) {
    b.addEventListener("click", function () { state.textSizeWide = b.getAttribute("data-size"); applyLook(); saveSettings(); render(); });
  });
  });
  $("nav-rules").addEventListener("click", function () { menuGo("rules"); });
  $("btn-rules").addEventListener("click", function () { openSub("rules"); });
  $("btn-find").addEventListener("click", function () { state.showSearch = !state.showSearch; render(); if (state.showSearch) setTimeout(function () { $("search").focus(); }, 50); });
  $("menu-fab").addEventListener("click", function () { state.menuOpen = !state.menuOpen; renderTop(); });
  $("menu-scrim").addEventListener("click", function () { state.menuOpen = false; renderTop(); });

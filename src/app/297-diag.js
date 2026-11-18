  // ---------- tap check (3.96.1, DJ: All games stays unresponsive on his phone but not in our checks) ----------
  // On the admin's phone only (or a test run with localStorage slate-diag = 1), this keeps a short log of what the phone itself sees: the
  // version it is really running, every touch (what it landed on, whether a tap followed), moments the page froze, and
  // any errors. It's sent every 30 seconds with the passcode (worker/usage.js keeps the latest 300 entries per person,
  // encrypted) and read with the feedback reader key. No game or team names, only page parts. Remove once solved.
  (function () {
    var on = function () { try { return localStorage.getItem("slate-diag") === "1" || !!(window.slateIsAdmin && window.slateIsAdmin()); } catch (e) { return false; } };
    var LOG = [], t0 = Date.now(), lastDown = null, renders = 0;
    function what(n) {
      if (!n || !n.tagName) return "none";
      var s = n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (typeof n.className === "string" && n.className ? "." + n.className.trim().split(/\s+/).slice(0, 3).join(".") : "");
      var p = n.closest && n.closest("[id^=view-], .g.panel, .lo-btn, .sec, nav, header, .menu-pop, .pn-grip, iframe");
      return s + (p && p !== n ? " in " + p.tagName.toLowerCase() + (p.id ? "#" + p.id : "") + (typeof p.className === "string" && p.className ? "." + p.className.trim().split(/\s+/).slice(0, 2).join(".") : "") : "");
    }
    function add(e) { if (!on()) return; e.t = Math.round((Date.now() - t0) / 100) / 10; e.v = (state && state.view) || ""; LOG.push(e); if (LOG.length > 150) LOG.shift(); }
    ["pointerdown", "touchstart"].forEach(function (k) {
      window.addEventListener(k, function (ev) {
        var pt = ev.touches && ev.touches[0] ? ev.touches[0] : ev, x = Math.round(pt.clientX || 0), y = Math.round(pt.clientY || 0);
        var top = document.elementFromPoint(x, y);
        if (k === "touchstart") { add({ k: "touch", x: x, y: y }); return; }   // the same touch as its pointerdown
        lastDown = { at: Date.now(), x: x, y: y, clicked: false };
        add({ k: "down", x: x, y: y, el: what(ev.target), top: top === ev.target ? "same" : what(top), cancelable: !!ev.cancelable });
        var mine = lastDown, muts = [], mo = null;
        // 3.100.3: what changed on the page while the finger was down (a change under the finger makes an iPhone drop the tap)
        try {
          var box = (ev.target.closest && ev.target.closest(".g.panel, header, [id^=view-]")) || document.body;
          mo = new MutationObserver(function (rs) { rs.forEach(function (r) { if (muts.length < 6) muts.push(r.type + ":" + what(r.target).slice(0, 50) + (r.type === "childList" ? "+" + r.addedNodes.length + "-" + r.removedNodes.length : r.attributeName ? "@" + r.attributeName : "")); }); });
          mo.observe(box, { subtree: true, childList: true, attributes: true, characterData: true });
          if (!document.contains(ev.target)) muts.push("target already gone");
        } catch (e) {}
        setTimeout(function () {
          if (mo) mo.disconnect();
          var gone = !document.contains(ev.target);
          if (!mine.clicked) add({ k: "no-tap", x: mine.x, y: mine.y, gone: gone, muts: muts.join(" | ").slice(0, 190) });
          else if (muts.length) add({ k: "tap-muts", muts: muts.join(" | ").slice(0, 190) });
        }, 900);
      }, { capture: true, passive: true });
    });
    ["pointercancel", "touchcancel"].forEach(function (k) { window.addEventListener(k, function () { add({ k: "cancel", by: k }); }, { capture: true, passive: true }); });
    window.addEventListener("click", function (ev) { if (lastDown) lastDown.clicked = true; add({ k: "tap", el: what(ev.target), ms: lastDown ? Date.now() - lastDown.at : -1, prevented: ev.defaultPrevented }); }, { capture: true });
    // someone stopping taps before they arrive: a click that was already cancelled shows prevented: true above
    window.addEventListener("error", function (ev) { add({ k: "error", m: String(ev.message || "").slice(0, 160), at: String(ev.filename || "").split("/").pop() + ":" + ev.lineno }); });
    window.addEventListener("unhandledrejection", function (ev) { add({ k: "error", m: String((ev.reason && ev.reason.message) || ev.reason || "").slice(0, 160) }); });
    // the page froze: a timer meant to run every 100ms ran late
    var tick = Date.now();
    setInterval(function () { var n = Date.now(), late = n - tick - 100; tick = n; if (late > 250 && document.visibilityState === "visible") add({ k: "freeze", ms: late }); }, 100);
    var why = {};
    window.slateDiagRender = function (st) {   // what asked for each All games redraw (function names only), counted
      renders++;
      var k = String(st || "").split("\n").slice(3, 9).map(function (l) { l = l.trim(); var nm = (l.match(/^(?:at )?([\w$.]+)[ @(]/) || [])[1] || ""; var ln = (l.match(/:(\d+):\d+\)?$/) || [])[1] || ""; return (nm || "?") + (ln ? ":" + ln : ""); }).join("<").slice(0, 150);  // 3.100.3: with index.html line numbers
      why[k] = (why[k] || 0) + 1;
    };
    function send() {
      if (!on() || !LOG.length) return;
      var p = ""; try { p = localStorage.getItem("slate-pass") || ""; } catch (e) {}
      if (!p) return;
      var body = { pass: p, diag: { ver: SLATE_VERSION, build: (window.SLATE_NATIVE && window.SLATE_NATIVE.build) || "", app: window.SLATE_NATIVE ? (window.SLATE_NATIVE.app || "yes") : "", pane: /[?&]pane=/.test(location.search) ? location.search : "",
        w: window.innerWidth, h: window.innerHeight, ua: navigator.userAgent.slice(0, 160), sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller), renders: renders, why: JSON.stringify(why).slice(0, 890), at: new Date().toISOString(), log: LOG.splice(0) } };
      renders = 0; why = {};
      try { fetch("/api/usage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true }).then(null, function () {}); } catch (e) {}
    }
    setInterval(send, 30000);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send(); });
  })();

  // ---------- usage: how much each person uses Slate, for DJ's Project status page ----------
  // Counts only: times opened, seconds on screen, and how many times each page was shown. Nothing about which games
  // or teams. Sent every two minutes and when the app goes to the background (worker/usage.js keeps 30 days,
  // encrypted). Someone just looking around without a passcode isn't counted. Reads state.view; changes nothing.
  (function () {
    var U = { opens: 1, secs: 0, views: {}, cur: "", last: Date.now(), hiddenAt: 0 };
    function pw() { try { return localStorage.getItem("slate-pass") || ""; } catch (e) { return ""; } }
    function where() { try { return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.slate ? "app" : (window.navigator.standalone ? "home" : "web"); } catch (e) { return "web"; } }
    function tick() {
      var now = Date.now(), dt = now - U.last; U.last = now;
      if (document.visibilityState !== "visible") return;
      if (dt > 0 && dt < 10000) U.secs += dt / 1000;
      var v = (state && state.view) || "";
      if (v && v !== U.cur) { U.cur = v; U.views[v] = (U.views[v] || 0) + 1; }
    }
    function send() {
      var p = pw(); if (!p || (!U.opens && U.secs < 5)) return;
      var body = JSON.stringify({ pass: p, opens: U.opens, secs: Math.round(U.secs), views: U.views, where: where() });
      U.opens = 0; U.secs = 0; U.views = {};
      try { fetch("/api/usage", { method: "POST", headers: { "content-type": "application/json" }, body: body, keepalive: true }).then(null, function () {}); } catch (e) {}
    }
    setInterval(tick, 2000); setInterval(send, 120000); setTimeout(send, 20000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") { tick(); U.hiddenAt = Date.now(); send(); }
      else { U.last = Date.now(); if (U.hiddenAt && Date.now() - U.hiddenAt > 30 * 60000) U.opens += 1; }   // back after half an hour counts as a new open
    });
  })();

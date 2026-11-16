  // Pull-down on every page (3.65.2). In the app on the folded Duo, iOS's clock and Wi-Fi sit at the top of the right
  // column and can cover the right end of the first lines of a page. At the top of a page, pulling down slides the page
  // down with your finger (at most 56 points) and it springs back when you let go, so you can see what's under them.
  // Tonight's Slate gets this from iOS's own bounce (040-components.css) and the Live feed does its own (145-live-feed.js),
  // so both are left out here. No added space anywhere: the layout stays as in 3.36.0.
  (function () {
    var pd = null;
    function folded() { var h = document.documentElement; return h.hasAttribute("data-native") && h.classList.contains("side-col") && !h.classList.contains("duo"); }
    function parts() { var m = $("main-wrap"), h = document.querySelector("#pane-r > header.top"); return h ? [h, m] : [m]; }  // the top bar and the page move together, like iOS's bounce
    function slide(L, y) { L.forEach(function (x) { x.style.transform = y > 0 ? "translate3d(0," + y + "px,0)" : ""; }); }
    function settle(L) { L.forEach(function (x) { x.style.transition = "transform .25s cubic-bezier(.2,.8,.2,1)"; x.style.transform = ""; setTimeout(function () { x.style.transition = ""; }, 260); }); }
    document.addEventListener("touchstart", function (e) {
      pd = null;
      if (REDUCED || e.touches.length !== 1 || !folded() || state.view === "lineup" || state.view === "feed") return;
      var m = $("main-wrap"), h = document.querySelector("#pane-r > header.top");
      if (!m || !(m.contains(e.target) || (h && h.contains(e.target))) || (window.scrollY || 0) > 0) return;
      pd = { L: parts(), x0: e.touches[0].clientX, y0: e.touches[0].clientY, on: false };
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!pd || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - pd.x0, dy = e.touches[0].clientY - pd.y0;
      if (!pd.on) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || (window.scrollY || 0) > 0) { pd = null; return; }  // sideways (a page swipe) or scrolling up the page
        pd.on = true; pd.L.forEach(function (x) { x.style.transition = "none"; });
      }
      slide(pd.L, Math.min(56, dy * 0.6));
    }, { passive: true });
    ["touchend", "touchcancel"].forEach(function (n) { document.addEventListener(n, function () {
      if (!pd) return; var p = pd; pd = null; if (p.on) settle(p.L);
    }, { passive: true }); });
  })();

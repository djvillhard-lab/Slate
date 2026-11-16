  // Pull-down on every page (3.65.4). In the app on the folded Duo, iOS's clock and Wi-Fi sit at the top of the right
  // column and can cover the right end of the first lines of a page. Every page (but the Live feed, which does its own in
  // 145-live-feed.js) gets iOS's own bounce at the top, the same as Tonight's Slate (040-components.css). iOS only bounces
  // a page tall enough to scroll, so a short page (an empty day, a short list) gets the same pull here: iOS's rubber-band
  // curve, no limit, and it springs back when you let go. No added space anywhere: the layout stays as in 3.36.0.
  (function () {
    var pd = null;
    function folded() { var h = document.documentElement; return h.hasAttribute("data-native") && h.classList.contains("side-col") && !h.classList.contains("duo"); }
    function parts() { var m = $("main-wrap"), h = document.querySelector("#pane-r > header.top"); return h ? [h, m] : [m]; }  // the top bar and the page move together, like iOS's bounce
    function slide(L, y) { L.forEach(function (x) { x.style.transform = y > 0 ? "translate3d(0," + y + "px,0)" : ""; }); }
    function settle(L) { L.forEach(function (x) { x.style.transition = "transform .45s cubic-bezier(.2,.9,.25,1)"; x.style.transform = ""; setTimeout(function () { x.style.transition = ""; }, 460); }); }
    function rubber(d) { var H = window.innerHeight || 600; return (1 - 1 / (d * 0.55 / H + 1)) * H; }  // UIScrollView's rubber band
    function short() { var se = document.scrollingElement || document.documentElement; return se.scrollHeight <= window.innerHeight + 1; }
    document.addEventListener("touchstart", function (e) {
      pd = null;
      if (REDUCED || e.touches.length !== 1 || !folded() || state.view === "feed" || !short()) return;  // a page that scrolls bounces by itself
      var m = $("main-wrap"), h = document.querySelector("#pane-r > header.top");
      if (!m || !(m.contains(e.target) || (h && h.contains(e.target)))) return;
      pd = { L: parts(), x0: e.touches[0].clientX, y0: e.touches[0].clientY, on: false };
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!pd || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - pd.x0, dy = e.touches[0].clientY - pd.y0;
      if (!pd.on) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { pd = null; return; }  // sideways (a page swipe) or upward
        pd.on = true; pd.L.forEach(function (x) { x.style.transition = "none"; });
      }
      slide(pd.L, rubber(Math.max(0, dy)));
    }, { passive: true });
    ["touchend", "touchcancel"].forEach(function (n) { document.addEventListener(n, function () {
      if (!pd) return; var p = pd; pd = null; if (p.on) settle(p.L);
    }, { passive: true }); });
  })();

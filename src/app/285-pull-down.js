  // Pull-down on every page of the iPhone Duo app (3.65.4; unfolded since 3.65.5). iOS's clock and Wi-Fi (and, unfolded,
  // the Dynamic Island) can cover the first lines of a page. At the top of a page, pull down: the page slides down with
  // your finger, stiffer the further you go, and springs back when you let go. No added space: the layout stays as it is.
  // - One page on screen (folded or unfolded): iOS's own bounce, the same as Tonight's Slate (040-components.css). iOS only
  //   bounces a page tall enough to scroll, so a short page gets the same pull here. The folded Live feed does its own
  //   (145-live-feed.js).
  // - Unfolded, two pages side by side: each pane scrolls by itself, so the pull is done here for both panes (iOS's
  //   bounce is off on them, 040-components.css), with iOS's rubber-band curve.
  (function () {
    var pd = null;
    function duoApp() { var h = document.documentElement; return h.hasAttribute("data-native") && !h.classList.contains("iphone"); }
    function slide(L, y) { L.forEach(function (x) { x.style.transform = y > 0 ? "translate3d(0," + y + "px,0)" : ""; }); }
    function settle(L) { L.forEach(function (x) { x.style.transition = "transform .45s cubic-bezier(.2,.9,.25,1)"; x.style.transform = ""; setTimeout(function () { x.style.transition = ""; }, 460); }); }
    function rubber(d, H) { return (1 - 1 / (d * 0.55 / H + 1)) * H; }  // UIScrollView's rubber band
    function short() { var se = document.scrollingElement || document.documentElement; return se.scrollHeight <= window.innerHeight + 1; }
    function kids(pane, list) { return list.map(function (s) { return pane.querySelector(":scope > " + s); }).filter(Boolean); }
    document.addEventListener("touchstart", function (e) {
      pd = null; var h = document.documentElement;
      if (REDUCED || e.touches.length !== 1 || !duoApp()) return;
      var L, H;
      if (h.classList.contains("duo")) {  // two panes: the pane under the finger, when it's at its top
        var pane = e.target.closest && e.target.closest(".pane"); if (!pane || pane.scrollTop > 0) return;
        L = pane.id === "pane-l" ? kids(pane, ["header.phead", "#pbody-l"]) : kids(pane, ["header.top", "#main-wrap"]);
        if (!L.some(function (x) { return x.contains(e.target); })) return;
        H = pane.clientHeight;
      } else {  // one page: only a page too short to scroll (a longer one bounces by itself)
        if ((h.classList.contains("side-col") && state.view === "feed") || !short()) return;
        L = kids($("pane-r"), ["header.top", "#main-wrap"]);
        if (!L.some(function (x) { return x.contains(e.target); })) return;
        H = window.innerHeight;
      }
      pd = { L: L, H: H || 600, x0: e.touches[0].clientX, y0: e.touches[0].clientY, on: false };
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!pd || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - pd.x0, dy = e.touches[0].clientY - pd.y0;
      if (!pd.on) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) { pd = null; return; }  // sideways (a page swipe) or upward
        pd.on = true; pd.L.forEach(function (x) { x.style.transition = "none"; });
      }
      slide(pd.L, rubber(Math.max(0, dy), pd.H));
    }, { passive: true });
    ["touchend", "touchcancel"].forEach(function (n) { document.addEventListener(n, function () {
      if (!pd) return; var p = pd; pd = null; if (p.on) settle(p.L);
    }, { passive: true }); });
  })();

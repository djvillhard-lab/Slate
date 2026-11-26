  // ---- Focus view of the Live feed (DJ, Nov 26, 2026; first shipped as "compact" in 3.168.0) ----
  // One round button beside Back, on every sport and every phone shape (folded, unfolded upright and sideways, iPhone):
  // the page header, the league pills and the extra cards above the plays go away, the score becomes one slim line and
  // (football) the field stays pinned above the newest plays. The other live games sit beside the score as a row to tap
  // or swipe through, with the game on screen outlined (styles/108-feed-compact.css; the row is the feed's own .fd-strip).
  // It also turns on by itself when the app only has a short, wide space: Picture in Picture on the top half of the
  // unfolded Duo held upright. The choice is remembered apart for that short space and for normal screens.
  // Nothing in the Live feed's own files is touched: this only sets html.fd-cmp.
  (function () {
    var KEY = "slate-feed-compact", root = document.documentElement, btn = null, probe = null;
    // the room the page really has: iOS may shrink the window for Picture in Picture, or keep it full size and grow the
    // safe area at the top instead (3.168.0 only looked at the window, and did not switch on for DJ)
    function room() {
      var h = window.innerHeight, vv = window.visualViewport; if (vv && vv.height && vv.height < h) h = vv.height;
      if (!probe) { probe = document.createElement("div"); probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)"; document.body.appendChild(probe); }
      var cs = getComputedStyle(probe), z = parseFloat(getComputedStyle(root).getPropertyValue("--z")) || 1;
      var pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      return { w: window.innerWidth, h: h - (pad > 120 ? pad : 0), z: z };  // a normal notch or home bar does not count
    }
    // (the unfolded Duo sideways is short and wide too: never by itself there, on the two-page screen or inside a page of it)
    function shortWide() { if (PANE || root.classList.contains("panes")) return false; var r = room(); return r.h <= 540 && r.w >= 430 && r.w > r.h; }
    function prefs() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
    function want() { var s = shortWide(), p = prefs()[s ? "short" : "tall"]; return p === "on" || (p !== "off" && s); }
    function apply() {
      var on = want() && !root.classList.contains("panes");  // the two-page screen itself never changes; its pages do
      if (root.classList.contains("fd-cmp") !== on) root.classList.toggle("fd-cmp", on);
      if (btn && btn.getAttribute("aria-pressed") !== (on ? "true" : "false")) { btn.setAttribute("aria-pressed", on ? "true" : "false"); btn.setAttribute("aria-label", on ? "Focus view is on. Tap for the full Live feed" : "Focus on this game: score, live games and plays only"); }
    }
    function build() {
      btn = document.createElement("button"); btn.type = "button"; btn.className = "fdc-btn"; btn.id = "fdc-btn";
      // arrows pointing in = focus; arrows pointing out = back to the full feed
      btn.innerHTML = '<svg class="fdc-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v6M9 6.5l3 3 3-3M12 21v-6M9 17.5l3-3 3 3M4 12h16"/></svg>'
        + '<svg class="fdc-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 10V4M9 6.5l3-3 3 3M12 14v6M9 17.5l3 3 3-3M4 12h16"/></svg>';
      btn.addEventListener("click", function () {
        var p = prefs(); p[shortWide() ? "short" : "tall"] = root.classList.contains("fd-cmp") ? "off" : "on";
        try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
        apply();
      });
      document.body.appendChild(btn);
    }
    build(); apply();
    // reading down hides the button with the others (DJ's rule for every floating button); any scroll up brings it back
    var y0 = 0;
    window.addEventListener("scroll", function () {
      var y = window.scrollY || 0, dy = y - y0; y0 = y;
      if (y < 24 || dy < -1) btn.classList.remove("fdc-away"); else if (dy > 0 && y > 40) btn.classList.add("fdc-away");
    }, { passive: true });
    window.addEventListener("resize", apply);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", apply);
    window.addEventListener("orientationchange", function () { setTimeout(apply, 250); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) setTimeout(apply, 300); });
    // docking Picture in Picture may only change the safe area, which fires no event: look again every 2 seconds while the
    // Live feed is open, never with a finger down (apply() changes nothing unless the answer changed)
    var down = false;
    document.addEventListener("touchstart", function () { down = true; }, { passive: true, capture: true });
    ["touchend", "touchcancel"].forEach(function (n) { document.addEventListener(n, function () { down = false; }, { passive: true, capture: true }); });
    setInterval(function () { if (!PANE && !down && !document.hidden && state.view === "feed") apply(); }, 2000);
    // the same choice in both pages of the unfolded Duo, and in the phone's other windows
    window.addEventListener("storage", function (e) { if (e.key === KEY) apply(); });
  })();

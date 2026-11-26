  // ---- Compact Live feed (DJ, Nov 26, 2026) ----
  // Watching with Picture in Picture on the top half of the unfolded Duo held upright leaves the app a short, wide
  // window. There the Live feed drops its header, pills and chips, shows the score on one line and keeps the field
  // pinned above the newest plays (styles/108-feed-compact.css). It turns on by itself in a short wide window, and a
  // round button beside Back turns it on or off by hand on any phone shape. The choice is remembered apart for short
  // windows and for tall ones, so turning it off while watching does not change the folded phone, and the other way.
  // Nothing in the Live feed's own files is touched: this only sets html.fd-cmp.
  (function () {
    if (PANE) return;  // the two sides of the unfolded Duo sideways keep the full feed
    var KEY = "slate-feed-compact", root = document.documentElement, btn = null;
    function shortWide() { return window.innerHeight <= 540 && window.innerWidth >= 430 && window.innerWidth > window.innerHeight; }
    function prefs() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
    function want() { var s = shortWide(), p = prefs()[s ? "short" : "tall"]; return p === "on" || (p !== "off" && s); }
    function apply() {
      var on = want();
      root.classList.toggle("fd-cmp", on);
      if (btn) { btn.setAttribute("aria-pressed", on ? "true" : "false"); btn.setAttribute("aria-label", on ? "Compact Live feed is on. Tap for the full feed" : "Tap for the compact Live feed: score, field and plays only"); }
    }
    function build() {
      btn = document.createElement("button"); btn.type = "button"; btn.className = "fdc-btn"; btn.id = "fdc-btn";
      // arrows pointing in = make it compact; arrows pointing out = back to the full feed
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
    window.addEventListener("orientationchange", function () { setTimeout(apply, 250); });
  })();

  // ---------- font choice (3.157.0): Settings > Look and text size > Font ----------
  // One font for the whole app, set through --font (Simple mode and both Duo panes use it too).
  // Every choice is a variable font with width and weight axes, so the app's condensed scores and wide titles keep
  // working at every text size. Archivo (embedded in the page) stays the default; the others are in /fonts and
  // download only when used.
  var FONT_FALLBACK = ', -apple-system, BlinkMacSystemFont, system-ui, "Helvetica Neue", Arial, sans-serif';
  var FONTS = {
    archivo: ["Archivo", '"Archivo"', "Slate's own. Sporty, built for scores."],
    mona: ["Mona Sans", '"Slate Mona Sans", "Archivo"', "Modern and roomy."],
    flex: ["Roboto Flex", '"Slate Roboto Flex", "Archivo"', "Clean and neutral."],
    saira: ["Saira", '"Slate Saira", "Archivo"', "Squared off, like a scoreboard."],
    noto: ["Noto Sans", '"Slate Noto Sans", "Archivo"', "Open letters, easy reading."],
    serif: ["Roboto Serif", '"Slate Roboto Serif", "Archivo"', "A newspaper feel."]
  };
  var FONT_ORDER = ["archivo", "mona", "flex", "saira", "noto", "serif"];
  try { var savedFont = localStorage.getItem("slate-font"); if (savedFont) state.font = savedFont; } catch (e) {}
  // called by applyLook() (020-look.js) and once here at load
  function applyFont() {
    if (!FONTS) return;  // applyLook's first run comes before this file sets FONTS; the call below covers it
    if (!FONTS[state.font]) state.font = "archivo";
    var root = document.documentElement;
    if (state.font === "archivo") root.style.removeProperty("--font"); else root.style.setProperty("--font", FONTS[state.font][1] + FONT_FALLBACK);
    root.setAttribute("data-font", state.font);
    try { localStorage.setItem("slate-font", state.font); } catch (e) {}
  }
  applyFont();
  function drawFonts() {
    var box = $("font-list"); if (!box) return;
    if (!box.dataset.on) {
      box.dataset.on = "1";
      FONT_ORDER.forEach(function (k) {
        var f = FONTS[k], b = el("button", "fontopt"); b.type = "button"; b.setAttribute("data-font", k);
        b.style.fontFamily = f[1] + FONT_FALLBACK;
        b.setAttribute("aria-label", f[0] + (k === "archivo" ? " (default)" : "") + ". " + f[2]);
        b.appendChild(el("b", null, f[0] + (k === "archivo" ? " · default" : "")));
        var sc = el("span", "fo-score"); sc.appendChild(document.createTextNode("112")); sc.appendChild(el("em", null, "–108")); b.appendChild(sc);
        b.appendChild(el("i", null, f[2]));
        b.addEventListener("click", function () { if (state.font === k) return; state.font = k; applyFont(); saveSettings(); render(); });
        box.appendChild(b);
      });
    }
    Array.prototype.forEach.call(box.children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-font") === state.font ? "true" : "false"); });
  }
  function fontName() { return (FONTS[state.font] || FONTS.archivo)[0]; }

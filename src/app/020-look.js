  // ---------- look ----------
  try { var saved = JSON.parse(localStorage.getItem("lineup.look") || "null"); if (saved) { if (saved.device === "duo" || saved.device === "iphone") state.device = saved.device; if (saved.look) state.look = saved.look; if (saved.accent) state.accent = saved.accent; if (saved.textSize) state.textSize = saved.textSize; if (saved.textSizeWide) state.textSizeWide = saved.textSizeWide; if (saved.navPos) state.navPos = saved.navPos; if (typeof saved.foldNudge === "number") state.foldNudge = saved.foldNudge; } } catch (e) {}
  var isDuo = false, isCorner = false, isBig = false;
  function deviceMode() {
    if (state.device === "duo" || state.device === "iphone") return state.device;
    var a = Math.max(screen.width || 0, screen.height || 0), b = Math.min(screen.width || 0, screen.height || 0) || 1;
    return state.textSizeWide || Number(state.foldNudge) || a / b < 1.9 ? "duo" : "iphone";
  }
  // ---- team colors accent: the color of the first team (Teams page order) that plays today ----
  var TEAM_ACC = (function () { try { return JSON.parse(localStorage.getItem("slate-team-acc") || "null"); } catch (e) { return null; } })();
  function hexRgb(h) { h = String(h || "").replace("#", ""); if (!/^[0-9a-f]{6}$/i.test(h)) return null; return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function rgbHex(c) { return "#" + c.map(function (v) { return ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(""); }
  function taLum(c) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
  function mix(c, to, t) { return c.map(function (v, i) { return v + (to[i] - v) * t; }); }
  function teamAccent(base) {
    var tc = TEAM_ACC && TEAM_ACC.date === todayInHome() ? TEAM_ACC : null; if (!tc) return null;
    // pick the team's color that reads best on this theme; nudge it lighter (dark themes) or darker (light) until readable
    var cs = [hexRgb(tc.c1), hexRgb(tc.c2)].filter(Boolean); if (!cs.length) return null;
    var dark = base !== "light", ok = function (c) { var L = taLum(c); return L > 0.02 && L < 0.85; };
    var pickC = ok(cs[0]) ? cs[0] : (cs[1] && ok(cs[1]) ? cs[1] : cs[0]);
    var fill = pickC.slice(), text = pickC.slice(), k = 0;
    if (taLum(fill) > 0.9) fill = mix(fill, [0, 0, 0], 0.25);
    while (dark && taLum(text) < 0.22 && k++ < 12) text = mix(text, [255, 255, 255], 0.15);
    while (!dark && taLum(text) > 0.18 && k++ < 12) text = mix(text, [0, 0, 0], 0.15);
    while (dark && taLum(fill) < 0.12 && k++ < 24) fill = mix(fill, [255, 255, 255], 0.12);
    return { name: tc.name, text: rgbHex(text), fill: rgbHex(fill), deep: rgbHex(mix(fill, [0, 0, 0], 0.45)), on: taLum(fill) > 0.3 ? "#0C0C0C" : "#FFFFFF" };
  }
  function updateTeamAccent() {
    // wait for your teams and today's games: working it out from the defaults wiped the saved color for a moment
    if (state.accent !== "team" || state.date !== todayInHome() || !state.teams || !state.settingsLoaded || !games().length) return;
    var list = myTeamList(), ord = state.teamOrder || [];
    if (ord.length) list = list.map(function (t, i) { var j = ord.indexOf(tmKey(t)); return [j === -1 ? 1e3 + i : j, t]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; });
    var gs = games(), pick = null;
    list.some(function (t) {
      var g = gs.filter(function (x) { return x.league === t.lg && (teamMatch(x.away, t.name, t.lg) || teamMatch(x.home, t.name, t.lg)); })[0];
      if (!g) return false;
      var sd = teamMatch(g.away, t.name, t.lg) ? "away" : "home", kn = t.known || {};
      pick = { date: state.date, name: t.name, c1: g[sd + "Color"] || kn.c1 || "", c2: g[sd + "Alt"] || kn.c2 || "" };
      return !!(pick.c1 || pick.c2);
    });
    var next = pick || { date: state.date, name: "", c1: "", c2: "" };
    if (TEAM_ACC && TEAM_ACC.date === next.date && TEAM_ACC.c1 === next.c1 && TEAM_ACC.c2 === next.c2) return;
    TEAM_ACC = next; try { localStorage.setItem("slate-team-acc", JSON.stringify(next)); } catch (e) {}
    applyLook();
  }
  function applyLook() {
    var root = document.documentElement;
    if (!THEMES[state.look]) state.look = "dark";
    var th = THEMES[state.look];
    if (!ACCENTS[state.accent] && state.accent !== "team") state.accent = THEMES[state.look][2];
    root.setAttribute("data-look", th[1]); root.setAttribute("data-theme", state.look);
    THEME_VARS.forEach(function (v, i) { root.style.setProperty(v, th[3][i]); });
    var a = state.accent === "team" ? (teamAccent(th[1]) || ACCENTS[th[2]]) : ACCENTS[state.accent];
    var accText = th[1] === "light" ? a.deep : a.text;
    if (th[1] !== "light" && /^#[0-9a-f]{6}$/i.test(accText)) { var guard = 0; while (contrastRatio(accText, th[3][2]) < 4.5 && guard++ < 20) accText = lighten(accText, 0.08); }
    root.style.setProperty("--accent", accText);
    root.style.setProperty("--accent-fill", a.fill);
    root.style.setProperty("--accent-deep", a.deep);
    root.style.setProperty("--on-accent", a.on);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", th[3][0]);
    if (state.textSize === "xxs") state.textSize = "xs"; if (state.textSizeWide === "xxs") state.textSizeWide = "xs";
    if (!SIZES[state.textSize] && state.textSize !== "auto") state.textSize = "m";
    if (state.textSizeWide && !SIZES[state.textSizeWide] && state.textSizeWide !== "auto") state.textSizeWide = "";
    var duoMode = deviceMode() === "duo";
    root.classList.toggle("iphone", !duoMode);
    var szk = isBig && duoMode ? (state.textSizeWide || state.textSize) : state.textSize;
    var z = szk === "auto" ? systemTextZoom() : SIZES[szk];
    // the page's usable width: the screen less iOS's Duo column (app), halved when the open Duo shows two panes
    var sw = parseFloat(root.style.getPropertyValue("--strip-w")) || 0, availW = window.innerWidth - sw;
    if (isDuo) availW = availW / 2 - 20;
    // 3.144.3: a page shown full screen on the unfolded Duo keeps the text size it has as one of two pages, so nothing
    // changes size when the layout switches
    if (typeof PANE !== "undefined" && PANE && root.classList.contains("pn-full")) availW = availW / 2;
    if (availW > 0) z = Math.max(0.8, Math.min(z, Math.floor(availW / SIZE_MIN_W * 100) / 100));
    root.classList.toggle("bigtext", z >= 1.08);
    root.style.setProperty("--z", String(z)); root.classList.toggle("zoomed", z > 1.1);
    if (["auto", "right", "bottom"].indexOf(state.navPos) === -1) state.navPos = "auto";
    applyFont();  // the Font choice (233-fonts.js)
    try { localStorage.setItem("lineup.look", JSON.stringify({ look: state.look, accent: state.accent, textSize: state.textSize, textSizeWide: state.textSizeWide, device: state.device, navPos: state.navPos, foldNudge: state.foldNudge })); } catch (e) {}
  }
  applyLook();
  // "Match iPhone": the iPhone's own text size (Settings > Display & Brightness > Text Size); 17 pt is the default
  function systemTextZoom() {
    var p = document.createElement("p"); p.style.cssText = "font: -apple-system-body; position: absolute; visibility: hidden"; document.documentElement.appendChild(p);
    var px = parseFloat(getComputedStyle(p).fontSize) || 17; p.remove();
    return Math.max(0.82, Math.min(1.35, Math.round(px / 17 * 100) / 100));
  }
  function lighten(hex, f) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255; r = Math.round(r + (255 - r) * f); g = Math.round(g + (255 - g) * f); b = Math.round(b + (255 - b) * f); return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase(); }


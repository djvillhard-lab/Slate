  // ---------- team logos (4.x): ESPN's official logo inside the team chip ----------
  // Where logos come from, fastest first:
  //  1. the game itself (slates.py saves ESPN's logo as awayLogo / homeLogo),
  //  2. a team list per league from ESPN's free teams feed, kept on this phone for a week
  //     (name -> logo, main color, alternate color), so team pages, Settings, News and Box Office get them too.
  // The chip is drawn first with its colors and abbreviation; the logo fades in on top once it has loaded,
  // so nothing moves. A logo that fails to load leaves the colored chip as it was.
  var LOGO_FEEDS = {
    nfl: "football/nfl", nba: "basketball/nba", wnba: "basketball/wnba", nhl: "hockey/nhl", mlb: "baseball/mlb",
    ncaaf: "football/college-football", ncaam: "basketball/mens-college-basketball", ncaaw: "basketball/womens-college-basketball",
    mls: "soccer/usa.1", epl: "soccer/eng.1", laliga: "soccer/esp.1", seriea: "soccer/ita.1", bundesliga: "soccer/ger.1", ligue1: "soccer/fra.1",
    ucl: "soccer/uefa.champions", uel: "soccer/uefa.europa",
    intl: "soccer/fifa.friendly"   // national teams (3.77.2): about 200 countries, so World Cup qualifiers and friendlies get flags too
  };
  var LOGO_PRO = { NFL: "nfl", NBA: "nba", WNBA: "wnba", NHL: "nhl", MLB: "mlb" };
  var LOGO_WEEK = 7 * 86400000, LOGO_KEY = "slate-logos-v1";
  var LOGO_REG = (function () { try { return JSON.parse(localStorage.getItem(LOGO_KEY) || "null") || {}; } catch (e) { return {}; } })();  // { lg: { at, t: { name: [seg, c1, c2] } } }
  var LOGO_OK = (function () { try { return JSON.parse(localStorage.getItem("slate-logos-ok") || "null") || {}; } catch (e) { return {}; } })();  // logo URLs this phone has loaded before
  var LOGO_BAD = {}, logoLoading = false, logoGamesRef = null, logoGamesIdx = {};
  function logoNorm(n) { return String(n || "").toLowerCase().replace(/\s*\((men's basketball|women's basketball|football)\)$/, "").replace(/[^a-z0-9]/g, ""); }
  // "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/bos.png" -> "nba/bos.png"; anything else -> ""
  function logoSeg(href) { var m = /\/i\/teamlogos\/([a-z0-9]+)\/500(?:-dark)?\/(?:scoreboard\/)?([\w-]+\.png)/i.exec(String(href || "")); return m ? m[1].toLowerCase() + "/" + m[2].toLowerCase() : ""; }
  function themeIsDark() { var th = THEMES[state.look]; return !th || th[1] !== "light"; }
  // the small resized copy from ESPN's image server (about 4 KB, cached for hours); the dark-theme version on Midnight
  function logoUrl(seg, dark) { var p = seg.split("/"); return "https://a.espncdn.com/combiner/i?img=/i/teamlogos/" + p[0] + "/" + (dark ? "500-dark" : "500") + "/" + p[1] + "&w=96&h=96"; }
  function logoGames() {
    var lists = [state.slate && state.slate.games]; SLATE_PARTS.forEach(function (k) { var p = (state.slateParts || {})[k]; lists.push(p && p.games); });
    if (logoGamesRef && lists.length === logoGamesRef.length && lists.every(function (l, i) { return l === logoGamesRef[i]; })) return logoGamesIdx;
    var idx = {};
    lists.forEach(function (l) { (l || []).forEach(function (g) { ["away", "home"].forEach(function (sd) {
      var sg = logoSeg(g[sd + "Logo"]);
      // national teams (3.81.11): saved games often have no logo, but ESPN's flag file is the team's abbreviation (GER -> countries/ger.png)
      if (!sg && g.league === "intl" && /^[A-Z]{2,4}$/.test(g[sd + "Abbr"] || "")) sg = "countries/" + g[sd + "Abbr"].toLowerCase() + ".png";
      if (sg && g[sd]) idx[logoNorm(g[sd])] = [sg, g[sd + "Color"], g[sd + "Alt"]];
    }); }); });
    logoGamesRef = lists; logoGamesIdx = idx; return idx;
  }
  // logos seen in ESPN's live scoreboard (national teams and anyone the team lists miss); true when it's a new one
  var LOGO_LIVE = {}, logoFillT = 0;
  function logoNote(name, href, c1, c2) {
    var k = logoNorm(name), sg = logoSeg(href); if (!k || !sg || LOGO_LIVE[k]) return false;
    var hx = function (c) { return /^[0-9a-f]{6}$/i.test(c || "") ? "#" + c.toLowerCase() : ""; };
    LOGO_LIVE[k] = [sg, hx(c1), hx(c2)]; clearTimeout(logoFillT); logoFillT = setTimeout(logoFill, 0); return !logoGames()[k];
  }
  // the team's entry: [logo segment, main color, alternate color], or null
  function teamLook(name) {
    var k = logoNorm(name); if (!k) return null;
    var hit = logoGames()[k] || LOGO_LIVE[k]; if (hit) return hit;
    for (var lg in LOGO_REG) { var t = LOGO_REG[lg] && LOGO_REG[lg].t; if (t && t[k]) return t[k]; }
    logoRefresh();
    // the five big pro leagues never wait on ESPN's team list (3.62.2): their logo file is the team's abbreviation,
    // which the app's own team list already has. One failed download used to leave a whole league without logos for an hour.
    var kt = typeof teamByName === "function" ? teamByName(name) : null;
    if (kt && LOGO_PRO[kt.lg] && kt.abbr) return [LOGO_PRO[kt.lg] + "/" + String(kt.abbr).toLowerCase() + ".png", kt.c1, kt.c2];
    return null;
  }
  function logoRefresh() {
    if (logoLoading || !window.fetch) return;
    var now = Date.now(), due = Object.keys(LOGO_FEEDS).filter(function (lg) { var r = LOGO_REG[lg]; return !r || now - (r.at || 0) > LOGO_WEEK || (!Object.keys(r.t || {}).length && now - (r.at || 0) > 120000); });
    if (!due.length) return;
    logoLoading = true;
    Promise.all(due.map(function (lg) {
      return fetch("https://site.api.espn.com/apis/site/v2/sports/" + LOGO_FEEDS[lg] + "/teams?limit=1000").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        var ts = j && j.sports && j.sports[0] && j.sports[0].leagues && j.sports[0].leagues[0] && j.sports[0].leagues[0].teams; if (!ts) return;
        var t = {};
        ts.forEach(function (x) {
          var tm = x.team || {}, sg = logoSeg(((tm.logos || [])[0] || {}).href); if (!sg || !tm.displayName) return;
          var c1 = /^[0-9a-f]{6}$/i.test(tm.color || "") ? "#" + tm.color.toLowerCase() : "", c2 = /^[0-9a-f]{6}$/i.test(tm.alternateColor || "") ? "#" + tm.alternateColor.toLowerCase() : "";
          t[logoNorm(tm.displayName)] = [sg, c1, c2];
        });
        if (!Object.keys(t).length) return;   // 3.94.2 (DJ: Premier League logos missing): an empty answer from ESPN counts as a failed one, tried again in two minutes, instead of a week of letters
        LOGO_REG[lg] = { at: now, t: t };
      }).catch(function () {}).then(function () {
        if (!LOGO_REG[lg] || LOGO_REG[lg].at !== now) LOGO_REG[lg] = { at: now - LOGO_WEEK + 120000, t: (LOGO_REG[lg] || {}).t || {} };   // offline or ESPN hiccup: keep what we had, try again in two minutes
      });
    })).then(function () {
      logoLoading = false;
      try { localStorage.setItem(LOGO_KEY, JSON.stringify(LOGO_REG)); } catch (e) {}
      if (typeof render === "function") render();
      logoFill();
    });
  }
  // chips already on screen that were drawn before their league's team list arrived get their logo now (3.81.11).
  // render() alone missed them: the open Duo's two panes don't redraw on render()
  function logoFill() {
    Array.prototype.forEach.call(document.querySelectorAll(".badge[data-lg-wait]"), function (b) {
      var n = b.getAttribute("data-lg-wait"); b.removeAttribute("data-lg-wait"); if (!b.querySelector(".badge-logo")) addLogo(b, n);
    });
  }
  // which version to show on Midnight, decided once per logo and kept on this phone (3.77.2): "l" = the regular logo,
  // because ESPN's dark-theme version has almost no color (Clemson's white paw) and the regular one is colorful and bright enough
  // for the dark card. Duke and the Yankees keep their white marks: their navy would disappear.
  var LOGO_PICK = (function () { try { return JSON.parse(localStorage.getItem("slate-logos-pick") || "null") || {}; } catch (e) { return {}; } })();
  function logoPickSave() { try { localStorage.setItem("slate-logos-pick", JSON.stringify(LOGO_PICK)); } catch (e) {} }
  // what a loaded logo looks like: solid pixels, average color saturation and average brightness (0 to 1).
  // The same test the live notifications and the morning email use. null when the picture can't be read (then it's trusted as it is)
  function logoStats(im) {
    try {
      var W = 48, cv = document.createElement("canvas"); cv.width = cv.height = W;
      var cx = cv.getContext("2d"); cx.drawImage(im, 0, 0, W, W);
      var d = cx.getImageData(0, 0, W, W).data, n = 0, sat = 0, br = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        var r = d[i], g = d[i + 1], bl = d[i + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
        n++; sat += mx ? (mx - mn) / mx : 0; br += (0.299 * r + 0.587 * g + 0.114 * bl) / 255;
      }
      return { n: n, sat: n ? sat / n : 0, br: n ? br / n : 0 };
    } catch (e) { return null; }
  }
  // puts the logo into a chip made by badgeFor; the chip keeps its colors and letters until the picture has loaded
  function addLogo(b, name) {
    var hit = teamLook(name); if (!hit || !hit[0]) { b.setAttribute("data-lg-wait", name); return; }
    var seg = hit[0], dark = themeIsDark(), light = logoUrl(seg, false), url = dark && LOGO_PICK[seg] !== "l" ? logoUrl(seg, true) : light;
    var bad = function (u) { return LOGO_BAD[u] && Date.now() - LOGO_BAD[u] < 120000; };   // 3.91.2: a failed download is tried again two minutes later
    if (bad(url)) { if (!dark || bad(url = light)) return; }
    var im = document.createElement("img"); im.className = "badge-logo"; im.alt = ""; im.decoding = "async"; im.draggable = false; im.crossOrigin = "anonymous";
    var done = false;
    if (LOGO_OK[url]) {                                 // loaded on this phone before: show it straight away, no letters flashing first
      b.classList.add("lg");
      setTimeout(function () { if (!done) b.classList.remove("lg"); }, 4000);   // 3.77.2: a load that hangs no longer leaves an empty box
    }
    im.onload = function () {
      var fresh = !LOGO_OK[url] || (dark && url !== light && !LOGO_PICK[seg]), st = fresh ? logoStats(im) : null;   // read each logo once per phone
      if (st && st.n < 8) { im.onerror(); return; }     // an empty picture counts as a failed one: letters, or the other version
      done = true; b.classList.add("lg");
      if (!LOGO_OK[url]) { LOGO_OK[url] = 1; try { localStorage.setItem("slate-logos-ok", JSON.stringify(LOGO_OK)); } catch (e) {} }
      if (dark && url !== light && !LOGO_PICK[seg] && st) {
        if (st.sat >= 0.12) { LOGO_PICK[seg] = "d"; logoPickSave(); return; }
        var pr = new Image(); pr.crossOrigin = "anonymous";   // one-color dark mark: is the full-color logo readable on the card?
        pr.onload = function () { var s2 = logoStats(pr); LOGO_PICK[seg] = s2 && s2.n >= 8 && s2.sat > 0.3 && s2.br >= 0.3 ? "l" : "d"; logoPickSave(); if (LOGO_PICK[seg] === "l") { url = light; im.src = light; } };
        pr.onerror = function () { LOGO_PICK[seg] = "d"; logoPickSave(); };
        pr.src = light;
      }
    };
    im.onerror = function () {
      LOGO_BAD[url] = Date.now(); delete LOGO_OK[url];
      if (url !== light && !bad(light)) { url = light; im.src = light; return; }   // no dark version: try the regular one
      // 3.91.2 (DJ: the Thunder showed "OKC"): one dropped download on the phone used to leave the letters for the whole visit.
      // Try once more a few seconds later; the letters stay meanwhile
      b.classList.remove("lg");
      if (!im._again) { im._again = 1; setTimeout(function () { if (!im.isConnected) return; delete LOGO_BAD[url]; im.src = url + "&t=" + (Date.now() % 100000); }, 4000); return; }
      done = true; im.remove();
    };
    im.src = url; b.appendChild(im);
  }
  // team colors that work as a pair and on this theme: the alternate color when the two sides clash,
  // or when the main color nearly disappears into the background (black on Midnight, white on Sunday Paper)
  function colorDist(a, b) { var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); return Math.abs((x >> 16) - (y >> 16)) + Math.abs((x >> 8 & 255) - (y >> 8 & 255)) + Math.abs((x & 255) - (y & 255)); }
  function readableTeamColor(main, alt) {
    if (!hexOk(main)) return hexOk(alt) ? alt : "";
    var dark = themeIsDark(), L = lum(main), bad = dark ? L < 0.05 : L > 0.85;
    if (bad && hexOk(alt)) { var La = lum(alt); if (dark ? La >= 0.05 : La <= 0.85) return alt; }
    return main;
  }
  // national teams' colors (3.85.1, DJ: a Haiti-USA game was all one blue): their flag and kit colors, main then
  // second, used before ESPN's for any team that isn't a club in the app's team list. Keys are logoNorm'd names.
  var NATION_COLORS = (function () {
    var o = {}, add = function (names, m, a) { names.split("|").forEach(function (n) { o[logoNorm(n)] = [m, a]; }); };
    add("United States|USA|United States of America", "#0A3161", "#B31942"); add("Mexico", "#006847", "#CE1126"); add("Canada", "#D80621", "#FFFFFF");
    add("Haiti", "#00209F", "#D21034"); add("Jamaica", "#009B3A", "#FED100"); add("Costa Rica", "#002B7F", "#CE1126"); add("Panama", "#DA121A", "#072357");
    add("Honduras", "#0073CF", "#FFFFFF"); add("El Salvador", "#0F47AF", "#FFFFFF"); add("Guatemala", "#4997D0", "#FFFFFF"); add("Trinidad and Tobago", "#CE1126", "#000000");
    add("Curacao|Curaçao", "#002B7F", "#F9E814"); add("Suriname", "#377E3F", "#B40A2D"); add("Nicaragua", "#0067C6", "#FFFFFF"); add("Cuba", "#002A8F", "#CF142B");
    add("Brazil", "#FEDF00", "#009C3B"); add("Argentina", "#75AADB", "#FCBF49"); add("Uruguay", "#0038A8", "#FCD116"); add("Colombia", "#FCD116", "#003893");
    add("Chile", "#D52B1E", "#0039A6"); add("Ecuador", "#FFD100", "#034EA2"); add("Peru", "#D91023", "#FFFFFF"); add("Paraguay", "#D52B1E", "#0038A8");
    add("Venezuela", "#7F1734", "#FFCC00"); add("Bolivia", "#007A33", "#D52B1E");
    add("England", "#FFFFFF", "#CE1124"); add("France", "#002395", "#ED2939"); add("Spain", "#AA151B", "#F1BF00"); add("Germany", "#000000", "#DD0000");
    add("Portugal", "#C8102E", "#006600"); add("Netherlands|Holland", "#F36C21", "#21468B"); add("Italy", "#0066CC", "#009246"); add("Belgium", "#E30613", "#000000");
    add("Croatia", "#FF0000", "#171796"); add("Switzerland", "#D52B1E", "#FFFFFF"); add("Denmark", "#C8102E", "#FFFFFF"); add("Sweden", "#FECC02", "#006AA7");
    add("Norway", "#BA0C2F", "#00205B"); add("Poland", "#DC143C", "#FFFFFF"); add("Austria", "#ED2939", "#FFFFFF"); add("Scotland", "#005EB8", "#FFFFFF");
    add("Wales", "#C8102E", "#00B140"); add("Republic of Ireland|Ireland", "#169B62", "#FF883E"); add("Northern Ireland", "#00B140", "#FFFFFF");
    add("Serbia", "#C6363C", "#0C4076"); add("Turkey|Türkiye|Turkiye", "#E30A17", "#FFFFFF"); add("Ukraine", "#0057B7", "#FFD700"); add("Czechia|Czech Republic", "#11457E", "#D7141A");
    add("Hungary", "#CE2939", "#477050"); add("Greece", "#0D5EAF", "#FFFFFF"); add("Romania", "#FCD116", "#002B7F"); add("Slovakia", "#0B4EA2", "#EE1C25");
    add("Slovenia", "#005DA4", "#ED1C24"); add("Iceland", "#02529C", "#DC1E35"); add("Finland", "#002F6C", "#FFFFFF"); add("Russia", "#D52B1E", "#0039A6");
    add("Bosnia and Herzegovina|Bosnia-Herzegovina", "#002395", "#FECB00"); add("Albania", "#E41E20", "#000000"); add("Georgia", "#DA291C", "#FFFFFF");
    add("Japan", "#1B3C8C", "#BC002D"); add("South Korea|Korea Republic", "#C60C30", "#003478"); add("Australia", "#FFCD00", "#00843D"); add("New Zealand", "#000000", "#FFFFFF");
    add("Saudi Arabia", "#006C35", "#FFFFFF"); add("Iran|IR Iran", "#239F40", "#DA0000"); add("Qatar", "#8A1538", "#FFFFFF"); add("Iraq", "#007A3D", "#CE1126");
    add("Jordan", "#CE1126", "#007A3D"); add("Uzbekistan", "#0099B5", "#1EB53A"); add("China|China PR", "#DE2910", "#FFDE00"); add("United Arab Emirates|UAE", "#00732F", "#FF0000");
    add("Morocco", "#C1272D", "#006233"); add("Senegal", "#00853F", "#FDEF42"); add("Nigeria", "#008751", "#FFFFFF"); add("Ghana", "#006B3F", "#FCD116");
    add("Cameroon", "#007A5E", "#CE1126"); add("Egypt", "#CE1126", "#000000"); add("Algeria", "#006233", "#D21034"); add("Tunisia", "#E70013", "#FFFFFF");
    add("Ivory Coast|Côte d'Ivoire|Cote d'Ivoire", "#F77F00", "#009E60"); add("South Africa", "#007749", "#FFB81C"); add("Mali", "#14B53A", "#FCD116");
    add("Cape Verde|Cabo Verde", "#003893", "#CF2027"); add("DR Congo|Congo DR", "#007FFF", "#CE1021");
    return o;
  })();
  function nationColors(name) { var k = logoNorm(name); if (!k || !NATION_COLORS[k]) return null; var kt = typeof teamByName === "function" ? teamByName(name) : null; return kt ? null : NATION_COLORS[k]; }
  function pairColors(g) {
    var raw = ["away", "home"].map(function (sd) {
      var nc = nationColors(g[sd]); if (nc) return { m: nc[0], a: nc[1] };
      var m = g[sd + "Color"], a = g[sd + "Alt"];
      if (!hexOk(m)) { var tl = teamLook(g[sd]); if (tl) { m = tl[1]; a = a || tl[2]; } }
      if (!hexOk(m)) { var kt = typeof teamByName === "function" ? teamByName(g[sd]) : null; if (kt && kt.c1) { m = kt.c1; a = a || kt.c2; } }
      return { m: m, a: a };
    });
    var out = raw.map(function (c) { return readableTeamColor(c.m, c.a); });
    if (hexOk(out[0]) && hexOk(out[1]) && colorDist(out[0], out[1]) < 90) {   // two reds, two navies: the home side switches to its other color
      var alt = hexOk(raw[1].a) && raw[1].a !== out[1] ? raw[1].a : (hexOk(raw[1].m) && raw[1].m !== out[1] ? raw[1].m : "");
      if (alt && colorDist(out[0], alt) >= 90) out[1] = alt;
    }
    return { away: out[0], home: out[1] };
  }

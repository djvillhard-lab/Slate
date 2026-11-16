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
    ucl: "soccer/uefa.champions", uel: "soccer/uefa.europa"
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
    lists.forEach(function (l) { (l || []).forEach(function (g) { ["away", "home"].forEach(function (sd) { var sg = logoSeg(g[sd + "Logo"]); if (sg && g[sd]) idx[logoNorm(g[sd])] = [sg, g[sd + "Color"], g[sd + "Alt"]]; }); }); });
    logoGamesRef = lists; logoGamesIdx = idx; return idx;
  }
  // logos seen in ESPN's live scoreboard (national teams and anyone the team lists miss); true when it's a new one
  var LOGO_LIVE = {};
  function logoNote(name, href, c1, c2) {
    var k = logoNorm(name), sg = logoSeg(href); if (!k || !sg || LOGO_LIVE[k]) return false;
    var hx = function (c) { return /^[0-9a-f]{6}$/i.test(c || "") ? "#" + c.toLowerCase() : ""; };
    LOGO_LIVE[k] = [sg, hx(c1), hx(c2)]; return !logoGames()[k];
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
    var now = Date.now(), due = Object.keys(LOGO_FEEDS).filter(function (lg) { return !LOGO_REG[lg] || now - (LOGO_REG[lg].at || 0) > LOGO_WEEK; });
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
        LOGO_REG[lg] = { at: now, t: t };
      }).catch(function () {}).then(function () {
        if (!LOGO_REG[lg] || LOGO_REG[lg].at !== now) LOGO_REG[lg] = { at: now - LOGO_WEEK + 120000, t: (LOGO_REG[lg] || {}).t || {} };   // offline or ESPN hiccup: keep what we had, try again in two minutes
      });
    })).then(function () {
      logoLoading = false;
      try { localStorage.setItem(LOGO_KEY, JSON.stringify(LOGO_REG)); } catch (e) {}
      if (typeof render === "function") render();
    });
  }
  // puts the logo into a chip made by badgeFor; the chip keeps its colors and letters until the picture has loaded
  function addLogo(b, name) {
    var hit = teamLook(name); if (!hit || !hit[0]) return;
    var dark = themeIsDark(), url = logoUrl(hit[0], dark);
    if (LOGO_BAD[url]) { if (!dark || LOGO_BAD[url = logoUrl(hit[0], false)]) return; }
    var im = document.createElement("img"); im.className = "badge-logo"; im.alt = ""; im.decoding = "async"; im.draggable = false; im.crossOrigin = "anonymous";
    if (LOGO_OK[url]) b.classList.add("lg");           // loaded on this phone before: show it straight away, no letters flashing first
    im.onload = function () { b.classList.add("lg"); if (!LOGO_OK[url]) { LOGO_OK[url] = 1; try { localStorage.setItem("slate-logos-ok", JSON.stringify(LOGO_OK)); } catch (e) {} } };
    im.onerror = function () {
      LOGO_BAD[url] = 1; delete LOGO_OK[url];
      var light = logoUrl(hit[0], false);
      if (url !== light && !LOGO_BAD[light]) { url = light; im.src = light; return; }   // no dark version: try the regular one
      b.classList.remove("lg"); im.remove();
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
  function pairColors(g) {
    var raw = ["away", "home"].map(function (sd) {
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

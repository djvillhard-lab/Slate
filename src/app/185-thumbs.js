  // ---------- thumbs up and down on Suggested for you and Worth a look (3.57.0) ----------
  // Each person's thumbs are saved in their own account (data/users/<uid>/feedback), so they follow them to any phone.
  // A thumb teaches the game's features, not just the one game: its teams, league, conference, the reason it was
  // suggested (Rivalry, Close finish…), a late or early start, national TV and ranked matchups. Each feature gets a
  // weight (up +1, down −1, fading by half every 45 days) and a suggestion's score moves by those weights.
  // Kept from narrowing: likes can lift a game by at most 15 (a game still needs its own reason to be suggested),
  // dislikes can sink one by up to 40, and Suggested for you shows at most two games from one league.
  var FB = { list: [], loaded: false, timer: null, pending: [] };
  var FB_HALF = 45, FB_KEEP = 300;
  var FB_COEF = { tm: 6, why: 5, cf: 3, lg: 3, time: 3, tv: 2, rk: 3 };
  function fbLoad() {
    if (!db || !uid || FB.loaded) return;
    db.collection("data/users/" + uid).doc("feedback").get().then(function (sn) {
      var d = sn.exists ? sn.data() : null; FB.list = ((d && d.list) || []).concat(FB.pending); FB.pending = []; FB.loaded = true; keepScroll(render);
    }, function () { FB.loaded = true; });
  }
  function fbSave() {
    clearTimeout(FB.timer);
    FB.timer = setTimeout(function () {
      if (!db || !uid || !FB.loaded) return;
      var cut = Date.now() - 365 * 86400000;
      FB.list = FB.list.filter(function (e) { return Date.parse(e.t) > cut; }).slice(-FB_KEEP);
      db.collection("data/users/" + uid).doc("feedback").set({ v: 1, list: FB.list }).then(null, function () {});
    }, 1500);
  }
  function fbAll() { return FB.loaded ? FB.list : FB.list.concat(FB.pending); }
  // this game's thumb today: 1, -1 or 0
  function fbGet(g) { var l = fbAll(); for (var i = l.length - 1; i >= 0; i--) if (l[i].id === g.id && l[i].d === state.date) return l[i].v; return 0; }
  function fbSet(g, v, src, tag) {
    if (!g || g.custom || !uid) return;
    var keep = function (e) { return !(e.id === g.id && e.d === state.date); };
    FB.list = FB.list.filter(keep); FB.pending = FB.pending.filter(keep);
    if (v) {
      var e = { v: v, t: new Date().toISOString(), d: state.date, id: g.id, src: src, tag: tag || "", league: g.league, start: g.start, away: g.away, home: g.home,
        awayShort: short(g, "away"), homeShort: short(g, "home"), awayConf: g.awayConf || "", homeConf: g.homeConf || "",
        awayRank: Number(g.awayRank) || 0, homeRank: Number(g.homeRank) || 0, nat: natFor(g) ? 1 : 0 };
      (FB.loaded ? FB.list : FB.pending).push(e);
    }
    fbSave();
  }
  // the features a thumb teaches, each with the words Settings shows for it
  function fbFeats(x, tag) {
    var lg = x.league, L = LEAGUES[lg] || {}, out = [], put = function (k, label) { out.push([k, label]); };
    if (lg) put("lg:" + lg, (L.name || lg) + " games");
    ["away", "home"].forEach(function (sd) {
      var t = x[sd]; if (!t) return;
      put("tm:" + lg + ":" + t, (x[sd + "Short"] || t) + (L.tag ? " (" + L.tag + ")" : ""));
      var cf = x[sd + "Conf"]; if (cf && L.college) put("cf:" + lg + ":" + cf, cf + " games" + (L.tag ? " (" + L.tag + ")" : ""));
    });
    if (tag) put("why:" + tag, tag + " games");
    var h = x.start ? hourCT(x.start) : 0;
    if (h >= 21) put("time:late", "Late starts (9 PM or later)"); else if (h && h < 17) put("time:early", "Early starts (before 5 PM)");
    if (x.nat) put("tv:nat", "Games on national TV");
    var ra = Number(x.awayRank) || 0, rh = Number(x.homeRank) || 0;
    if (L.college) { if (ra && rh) put("rk:both", "Ranked vs ranked"); else if (!ra && !rh) put("rk:none", "College games with no ranked team"); }
    // the same feature twice (both teams in one conference) counts once
    var seen = {}; return out.filter(function (f) { if (seen[f[0]]) return false; seen[f[0]] = 1; return true; });
  }
  var FB_W = null, FB_WK = "";
  // feature → {w, label}, faded by age; cached until the thumbs change
  function fbWeights() {
    var l = fbAll(), key = l.length + "|" + (l.length ? l[l.length - 1].t + l[l.length - 1].v : "") + "|" + todayInHome();
    if (FB_W && FB_WK === key) return FB_W;
    var w = {}, now = Date.now();
    l.forEach(function (e) {
      var age = Math.max(0, (now - Date.parse(e.t)) / 86400000), k = e.v * Math.pow(0.5, age / FB_HALF);
      fbFeats(e, e.tag).forEach(function (f) { var o = w[f[0]] || (w[f[0]] = { w: 0, label: f[1], n: 0 }); o.w += k; o.n++; o.label = f[1]; });
    });
    FB_W = w; FB_WK = key; return w;
  }
  // how much the thumbs move this game's score, and the biggest liked feature (for the reason line)
  function fbAdj(g, tag) {
    var w = fbWeights(), sum = 0, top = null;
    var x = { league: g.league, start: g.start, away: g.away, home: g.home, awayShort: short(g, "away"), homeShort: short(g, "home"), awayConf: g.awayConf, homeConf: g.homeConf, awayRank: g.awayRank, homeRank: g.homeRank, nat: natFor(g) ? 1 : 0 };
    fbFeats(x, tag).forEach(function (f) {
      var o = w[f[0]]; if (!o) return;
      var c = FB_COEF[f[0].split(":")[0]] || 2, v = o.w > 0 ? Math.min(o.w, 2) : Math.max(o.w, -3), d = c * v;
      sum += d; if (d > 0 && (!top || d > top.d)) top = { d: d, key: f[0], label: f[1] };
    });
    return { adj: Math.max(-40, Math.min(15, sum)), top: top, veto: fbVeto(g, w) };
  }
  // two net thumbs down on a team (not one of yours) keeps its games out of both sections
  function fbVeto(g, w) {
    if (hasFav(g)) return false;
    return ["away", "home"].some(function (sd) { var o = w["tm:" + g.league + ":" + g[sd]]; return o && o.w <= -1.6; });
  }
  // a liked team with no other reason to show still gets suggested, with its own reason
  function fbLikedTeam(g) {
    var w = fbWeights(), best = null;
    ["away", "home"].forEach(function (sd) { var o = w["tm:" + g.league + ":" + g[sd]]; if (o && o.w >= 1.6 && (!best || o.w > best.w)) best = { w: o.w, side: sd }; });
    return best;
  }
  function fbTopWords(t) {
    if (!t) return "";
    var k = t.key.split(":")[0];
    return k === "tm" ? "You gave " + t.label.replace(/ \(.*\)$/, "") + " a thumbs up" : k === "cf" ? "You like " + t.label.replace(/ \(.*\)$/, "") : "";
  }
  // ---------- the buttons ----------
  var THUMB_D = "M7.5 10.5v9.5h-3v-9.5zM7.5 10.5l3.6-7c1.5 0 2.5 1.2 2.2 2.6l-.7 3.4h5.3c1.3 0 2.3 1.2 2 2.5l-1.5 6.5c-.2 1-1.1 1.5-2 1.5H7.5";
  function thumbBtn(dir, on) {
    var b = el("button", "thumb thumb-" + (dir > 0 ? "up" : "down") + (on ? " on" : "")); b.type = "button";
    b.setAttribute("aria-label", dir > 0 ? "Thumbs up: more like this" : "Thumbs down: fewer like this, and hide it");
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.appendChild(svgIcon(THUMB_D, on)); return b;
  }
  // 👍 keeps it and teaches; 👎 hides it for today and teaches. Tap a lit thumb again to take it back.
  function thumbPair(g, src, tag, onDown) {
    var cur = fbGet(g), box = el("div", "thumbs"), up = thumbBtn(1, cur > 0), dn = thumbBtn(-1, cur < 0);
    up.addEventListener("click", function (e) {
      e.stopPropagation(); var was = fbGet(g), nv = was > 0 ? 0 : 1; fbSet(g, nv, src, tag); keepScroll(render);
      if (nv) topUndo("Got it. More like this", function () { fbSet(g, was, src, tag); keepScroll(render); });
    });
    dn.addEventListener("click", function (e) {
      e.stopPropagation(); var was = fbGet(g); fbSet(g, -1, src, tag); if (onDown) onDown();
      logAct("skip", g, { why: tag }); keepScroll(render);
      topUndo("Hidden. Fewer like this", function () {
        fbSet(g, was, src, tag);
        for (var i = ACT.log.length - 1; i >= 0; i--) { var a = ACT.log[i]; if (a.a === "skip" && a.id === g.id && a.d === state.date) { ACT.log.splice(i, 1); break; } }
        actSave(); keepScroll(render);
      });
    });
    box.appendChild(up); box.appendChild(dn); return box;
  }
  // ---------- test mode (3.57.1, temporary): more suggestions today so there are games to rate ----------
  // On from Settings, this phone only, until midnight. Suggested for you lowers its bar and shows up to five;
  // Worth a look shows any live game that isn't on your slate, in any league.
  function fbTest() { try { return localStorage.getItem("slate-sugg-test") === todayInHome(); } catch (e) { return false; } }
  function fbTestSet(on) { try { if (on) localStorage.setItem("slate-sugg-test", todayInHome()); else localStorage.removeItem("slate-sugg-test"); } catch (e) {} }
  // ---------- Settings: what the thumbs have taught, and starting over ----------
  // strongest first, the specific ones (a team) ahead of the broad ones (a league) at the same strength
  function fbRank(w, sign) {
    return Object.keys(w).filter(function (k) { return sign > 0 ? w[k].w >= 0.75 : w[k].w <= -0.75; })
      .sort(function (a, b) { return sign * ((FB_COEF[b.split(":")[0]] || 2) * w[b].w - (FB_COEF[a.split(":")[0]] || 2) * w[a].w); });
  }
  function fbSummary() {
    var n = fbAll().length; if (!n) return "Nothing yet. Rate games with the thumbs on Suggested for you and Worth a look.";
    var w = fbWeights(), more = fbRank(w, 1), less = fbRank(w, -1);
    return n + (n === 1 ? " game rated" : " games rated") + (more.length ? ". More: " + w[more[0]].label : "") + (less.length ? ". Fewer: " + w[less[0]].label : "");
  }
  function fbSettings(box) {
    box.textContent = "";
    var w = fbWeights();
    var tst = fbTest(), tb = el("button", "fb-reset" + (tst ? " on" : ""), tst ? "Testing: extra suggestions on (tap to stop)" : "Show extra suggestions today, for testing"); tb.type = "button";
    tb.setAttribute("aria-pressed", tst ? "true" : "false");
    tb.addEventListener("click", function () { fbTestSet(!fbTest()); render(); toast(fbTest() ? "Extra suggestions on until midnight, on this phone. See the top and bottom of today's slate." : "Extra suggestions off"); });
    box.appendChild(tb);
    box.appendChild(el("p", "fb-help", "Thumbs on Suggested for you and Worth a look teach Slate what you like: the teams, the league, why it was picked, the start time, national TV and ranked matchups. Older thumbs count less over time, and a game still needs its own reason to be suggested, so you keep seeing some variety."));
    var list = function (title, keys) {
      if (!keys.length) return;
      var row = el("div", "fb-group"); row.appendChild(el("b", null, title));
      var chips = el("div", "fb-chips"); keys.slice(0, 8).forEach(function (k) { chips.appendChild(el("span", "fb-chip", w[k].label)); }); row.appendChild(chips); box.appendChild(row);
    };
    list("More of", fbRank(w, 1));
    list("Fewer of", fbRank(w, -1));
    if (!fbAll().length) { box.appendChild(el("p", "fb-help", "Nothing learned yet.")); return; }
    var reset = el("button", "fb-reset", "Start over"); reset.type = "button";
    reset.addEventListener("click", function () {
      var old = FB.list.slice(); FB.list = []; FB.pending = []; fbSave(); render();
      topUndo("Thumbs cleared", function () { FB.list = old; fbSave(); render(); });
    });
    box.appendChild(reset);
  }

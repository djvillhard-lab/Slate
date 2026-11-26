  // ---------- News: the redesign concepts as tabs to try (3.136.0, DJ Nov 25, 2026) ----------
  // DJ: "It's hard for me to conceptualize the different mockups for new news page. Add everything suggested as tabs so
  // I can play around with it." A row of layout tabs sits on top of Press Box (DJ's account and the test account only,
  // or localStorage slate-newslab = "1"). "Current" is today's Press Box. Every other tab draws the same shared wire
  // (doc newsdeep/<today>-w-wire, worker "deep" key w-wire) a different way:
  //   Rundown (A), Wire (B), Daily (C), Deck (D), Wire 1 Edge to edge, Wire 2 Mosaic, Wire 3 Board, and the Combo
  //   (Wire 1 with Wire 3's games pinned on top, the recommendation).
  // Until someone taps Generate, the tabs fill themselves from ESPN's and The Athletic's free feeds (no numbers, since
  // only a source's own numbers are shown). Claude writes only on the tap (DJ's cost rule; the schedule question is open).
  // This is a prototype for picking a direction: once DJ picks, the other layouts come out. Notes: docs/pages/news.md.
  var NL_TABS = [["now", "Current"], ["combo", "Combo"], ["w1", "Wire 1"], ["w2", "Wire 2"], ["w3", "Wire 3"], ["a", "Rundown"], ["b", "Wire"], ["c", "Daily"], ["d", "Deck"]];
  var nl = { tab: null, f: "all", prev: null, more: false };
  function nlOn() { var u = "", f = ""; try { u = localStorage.getItem("slate-user") || ""; f = localStorage.getItem("slate-newslab") || ""; } catch (e) {} return f === "1" || u === "tester" || (typeof isAdmin === "function" && isAdmin()); }
  function nlTab() { if (nl.tab == null) { try { nl.tab = localStorage.getItem("slate-newslabtab") || "now"; } catch (e) { nl.tab = "now"; } if (!NL_TABS.some(function (t) { return t[0] === nl.tab; })) nl.tab = "now"; } return nl.tab; }
  function nlPath() { return "newsdeep/" + todayInHome() + "-w-wire"; }
  function nlHex(v) { v = String(v || ""); return hexOk(v) ? v : hexOk("#" + v) ? "#" + v : ""; }
  function nlTime(ms) { return timeText(new Date(ms).toISOString()); }
  // ----- the model every layout draws from -----
  function nlFeedItem(url) { var it = null; if (url) Object.keys(nw.feeds).some(function (k) { it = nwItem(k, url); return !!it; }); return it; }
  function nlModel() {
    var path = nlPath(); nwSub(path);
    var doc = nw.docs[path], has = !!(doc && doc.at && ((doc.items || []).length || doc.lead)), k = "n:" + path, w = clWriting(doc, k);
    var lgs = ncLgs(), per = {}, loading = false, now = Date.now();
    lgs.forEach(function (lg) { var c = nw.feeds[lg]; if (!c || (!c.busy && now - c.at > 10 * 60000)) nwFeed(lg).then(nwRedraw, function () {}); if (c && c.items) per[lg] = c.items; else loading = true; });
    var fill = function (x) {   // the photo, team and color for one entry
      var it = nlFeedItem(x.url); if (it && it.img) x.img = it.img;
      x.t = (x.team && nwTeam(x.team, x.lg)) || (it ? ncTeamOf(it) : null) || nwFindTeam(x.title, x.lg);
      if (x.value && x.kind !== "fun" && x.kind !== "breaking") x.kind = "number";   // Claude sometimes files a number under "news"
      x.c = (x.t && nlHex(x.t.c1)) || ""; x.ms = Date.parse(x.at) || now; return x;
    };
    var free = function (a) { return fill({ kind: a.kind === "HeadlineNews" && now - (Date.parse(a.at) || 0) < 6 * 3600000 ? "breaking" : "news", tag: "", lg: a.lg, team: "", title: a.title, text: a.desc && a.desc.length > 20 ? String(a.desc).replace(/^\s*[—-]\s*/, "") : "", value: "", url: a.url, src: a.src, at: a.at, free: true }); };
    var items = [], seen = {}, add = function (x) { var key = x.url || x.title; if (seen[key] || seen[String(x.title).toLowerCase()]) return; seen[key] = 1; seen[String(x.title).toLowerCase()] = 1; items.push(x); };
    var lead = null;
    if (has) {
      if (doc.lead) { lead = fill(Object.assign({}, doc.lead)); seen[lead.url || lead.title] = 1; }
      (doc.items || []).forEach(function (x) { add(fill(Object.assign({}, x))); });
      // between taps: ESPN's own news items published after the last write still show up, as they are
      var cut = Date.parse(doc.at) || now;
      lgs.forEach(function (lg) { (per[lg] || []).forEach(function (a) { if (a.kind === "HeadlineNews" && (Date.parse(a.at) || 0) > cut) add(free(a)); }); });
    } else {
      var pool = [];
      lgs.forEach(function (lg) { var n = 0; (per[lg] || []).forEach(function (a) { if (a.kind === "Media" || /highlights$/i.test(a.title) || now - (Date.parse(a.at) || 0) > 30 * 3600000) return; if (a.kind === "HeadlineNews" || n++ < 4) pool.push(a); }); });
      pool.forEach(function (a) { add(free(a)); });
    }
    items.sort(function (a, b) { return b.ms - a.ms; });
    if (!has) items = items.slice(0, 26);
    if (!lead) { lead = items.filter(function (x) { return x.img && x.kind !== "number" && x.kind !== "fun"; })[0] || items[0] || null; }
    if (lead) items = items.filter(function (x) { return x !== lead; });
    // tonight's games: Claude's picks when written, else the slate's and national TV games still to play
    var all = games().filter(function (g) { return !g.custom && g.league && bxBase(g.league); }), gs = [];
    if (has) (doc.games || []).forEach(function (x) { var g = all.filter(function (y) { return y.id === x.id; })[0]; if (g) gs.push({ g: g, why: x.why }); });
    if (!gs.length) {
      var sc = function (g) { var st = status(g).kind; return (inLineup(g.id) ? 4 : 0) + ((g.tv || []).some(function (n) { return NATIONAL_TV.indexOf(n) !== -1; }) ? 2 : 0) + (g.awayRank && g.homeRank ? 2 : g.awayRank || g.homeRank ? 1 : 0) + (st === "over" ? -6 : st === "live" ? 1 : 0); };
      gs = all.slice().sort(function (a, b) { return sc(b) - sc(a) || String(a.start).localeCompare(String(b.start)); }).slice(0, 4).map(function (g) { return { g: g, why: (typeof noteShort === "function" && g.note ? noteShort(g.note) : g.note) || "" }; });
    }
    // what's new since you last looked (kept per day on this phone)
    if (nl.prev == null) { var sv = null; try { sv = JSON.parse(localStorage.getItem("slate-newsseen") || "null"); } catch (e) {} nl.prev = sv && sv.d === todayInHome() ? sv.t : 0; try { localStorage.setItem("slate-newsseen", JSON.stringify({ d: todayInHome(), t: now })); } catch (e) {} }
    var isNew = function (x) { return nl.prev > 0 && Math.max(x.ms, Date.parse(x.w) || 0) > nl.prev; };
    items.forEach(function (x) { x.nw = isNew(x); });
    return { doc: doc, has: has, k: k, busy: !!(w && w.busy), err: w && w.error, lead: lead, items: items, games: gs, nums: items.filter(function (x) { return (x.kind === "number" || x.kind === "fun") && x.value; }),
      news: items.filter(function (x) { return !((x.kind === "number" || x.kind === "fun") && x.value); }), leagues: has ? (doc.leagues || []).filter(function (x) { return LEAGUES[x.key]; }) : [], nNew: items.filter(function (x) { return x.nw; }).length, loading: loading, per: per, lgs: lgs };
  }
  // Generate / Update: the free headlines (numbered, so Claude's entries keep their real link and time) and today's games
  function nlAsk() {
    var pass = slatePass(); if (!pass) { toast("Enter your passcode first (bottom of the page)"); return; }
    var path = nlPath(), k = "n:" + path, day = todayInHome(), prev = nw.docs[path];
    CL_ASK[k] = Date.now(); keepScroll(renderNews);
    var lgs = ncLgs(), et = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    Promise.all(lgs.map(function (lg) { return nwFeed(lg, true).then(null, function () { return []; }); })).then(function () {
      var hs = [], n = 0, now = Date.now();
      for (var i = 0; i < 9; i++) lgs.forEach(function (lg) {
        var list = (((nw.feeds[lg] || {}).items) || []).filter(function (a) { return a.kind !== "Media" && !/highlights$/i.test(a.title) && now - (Date.parse(a.at) || 0) < 30 * 3600000; });
        list.sort(function (a, b) { return (a.kind === "HeadlineNews" ? 0 : 1) - (b.kind === "HeadlineNews" ? 0 : 1) || (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
        var a = list[i]; if (a) hs.push({ n: ++n, lg: lg, type: a.kind || a.src, title: a.title, desc: String(a.desc || "").slice(0, 140), at: et.format(new Date(a.at)) + " ET", ts: Date.parse(a.at) || 0, url: a.url, source: a.src });
      });
      var all = games().filter(function (g) { return !g.custom && g.league && bxBase(g.league); }), nat = function (g) { return (inLineup(g.id) ? 2 : 0) + ((g.tv || []).some(function (x) { return NATIONAL_TV.indexOf(x) !== -1; }) ? 1 : 0) + (g.awayRank || g.homeRank ? 1 : 0); };
      var gs = state.date === day ? all.slice().sort(function (a, b) { return nat(b) - nat(a); }).slice(0, 18).map(function (g) {
        var o = clGame(g), s = scoreOf(g); o.id = g.id; o.start = et.format(new Date(g.start)) + " ET"; o.status = ({ live: "live now", over: "finished", upcoming: "not started" })[status(g).kind] || ""; if (s) o.score = abbr(g, "away") + " " + s.a + ", " + abbr(g, "home") + " " + s.h; return o;
      }) : [];
      var facts = { headlines: hs, games: gs, prev: ((prev && prev.items) || []).slice(0, 20).map(function (x) { return x.title; }) };
      while (JSON.stringify(facts).length > 23000 && facts.headlines.length > 12) facts.headlines.pop();   // the worker cuts facts at 24,000 characters
      return nwPost({ pass: pass, kind: "deep", key: "w-wire", date: day, game: { page: "News wire" }, facts: facts }, k);
    });
  }
  // ----- shared pieces -----
  var NL_KIND = { breaking: ["Breaking", "🚨"], number: ["Number", "🔢"], fun: ["Did you know", "🎲"] };
  function nlPill(text, cls, em) { var p = el("span", "nl-pill" + (cls ? " " + cls : "")); if (em) p.appendChild(nwEm(em)); p.appendChild(document.createTextNode(text)); return p; }
  function nlTags(x, dark) {
    var r = el("div", "nl-kr"), kd = NL_KIND[x.kind], tag = kd ? kd[0] : x.tag || "";
    if (tag) r.appendChild(nlPill(tag, dark ? "dk" : x.kind === "breaking" ? "red" : kd ? "acc" : "", kd ? kd[1] : nwCatEm(tag)));
    var lt = (LEAGUES[x.lg] || {}).tag; if (lt) r.appendChild(nlPill(lt, dark ? "dk" : "", ""));
    if (x.nw) r.appendChild(nlPill("New", dark ? "dk" : "acc", ""));
    return r;
  }
  function nlLink(x, cls) { var a = el(x.url ? "a" : "div", cls); if (x.url) { a.href = safeUrl(x.url); a.target = "_blank"; a.rel = "noopener"; } if (x.c) a.style.setProperty("--c", x.c); return a; }
  function nlSrc(x) { return x.url ? el("span", "nl-src", "Read it on " + (x.src || "ESPN") + " ›") : null; }
  function nlImg(x, cls, w) { return x.img ? nwImg(nwPic(x.img, w || 400), cls) : null; }
  function nlH(title, right) { var h = el("div", "nl-h"); h.appendChild(el("b", null, title)); if (right) h.appendChild(typeof right === "string" ? el("span", null, right) : right); return h; }
  function nlGameColors(node, g) { var pc = pairColors(g) || {}; node.style.setProperty("--a", nlHex(pc.away) || nlHex(g.awayColor) || "var(--line)"); node.style.setProperty("--h", nlHex(pc.home) || nlHex(g.homeColor) || "var(--line)"); return node; }
  function nlGameMeta(g) {
    var st = status(g), s = scoreOf(g);
    if (s) return (st.kind === "over" ? "Final" : "Live") + " · " + abbr(g, "away") + " " + s.a + ", " + abbr(g, "home") + " " + s.h;
    return [timeText(g.start), (g.tv || [])[0]].filter(Boolean).join(" · ");
  }
  function nlOpenGame(node, g) { node.setAttribute("role", "button"); node.tabIndex = 0; node.addEventListener("click", function () { if (inLineup(g.id) || games().some(function (y) { return y.id === g.id; })) openMatchup(g); }); return node; }
  // a game as one line with a color edge, and why it matters under it
  function nlGameRow(o) {
    var g = o.g, c = nlGameColors(el("div", "nx-card nl-g"), g), r = el("div", "nl-gr");
    sideOrder(g).forEach(function (sd, i) { if (i) r.appendChild(el("span", "at", sep(g).trim())); r.appendChild(nwTeamBadge(g[sd], g, sd)); r.appendChild(el("b", null, abbr(g, sd))); if (g[sd + "Record"]) r.appendChild(el("em", null, g[sd + "Record"])); });
    r.appendChild(el("span", "nl-gm", nlGameMeta(g))); c.appendChild(r); if (o.why) c.appendChild(el("p", "nl-gn", o.why));
    return nlOpenGame(c, g);
  }
  // a game as a small tile, the two teams stacked
  function nlGameTile(o) {
    var g = o.g, c = nlGameColors(el("div", "nl-gt"), g);
    sideOrder(g).forEach(function (sd) { var r = el("div", "r"); r.appendChild(nwTeamBadge(g[sd], g, sd)); r.appendChild(el("b", null, abbr(g, sd))); var s = scoreOf(g); r.appendChild(el("em", null, s ? String(sd === "away" ? s.a : s.h) : g[sd + "Record"] || "")); c.appendChild(r); });
    var st = status(g); c.appendChild(el("span", "m" + (st.kind === "live" ? " live" : ""), scoreOf(g) ? (st.kind === "over" ? "Final" : "Live") : nlGameMeta(g)));
    return nlOpenGame(c, g);
  }
  // a game as a poster in both teams' colors
  function nlPoster(o, tags) {
    var g = o.g, c = nlGameColors(el("div", "nl-po"), g), lg = el("div", "lg");
    sideOrder(g).forEach(function (sd) { lg.appendChild(nwTeamBadge(g[sd], g, sd)); }); c.appendChild(lg);
    var tx = el("div", "tx"); tx.appendChild(el("b", null, pairText(g, function (sd) { return abbr(g, sd); }, " @ "))); tx.appendChild(el("span", null, nlGameMeta(g))); if (o.why && tags) tx.appendChild(el("span", "nl-why", o.why)); c.appendChild(tx);
    return nlOpenGame(c, g);
  }
  function nlStatus(body, M, plain) {
    var r = el("div", "nl-st"), l = el("div", "nl-stl");
    if (M.busy) { var sp = el("span", "nl-busy"); sp.appendChild(el("i", "cl-dot")); sp.appendChild(document.createTextNode("Claude is writing the wire ")); sp.appendChild(nwElapsed(M.doc, M.k)); l.appendChild(sp); }
    else l.appendChild(el("span", null, M.has ? "Generated by Claude " + clWhen(M.doc.at) : "ESPN's headlines as they are. Claude hasn't written today's wire yet."));
    r.appendChild(l);
    if (M.nNew && !plain) r.appendChild(el("span", "nl-new", "↑ " + M.nNew + " new"));
    if (!M.busy) { var b = el("button", "nl-up"); b.type = "button"; b.appendChild(icon("sparkle")); b.appendChild(el("span", null, M.has ? "Update" : "Generate")); b.setAttribute("aria-label", (M.has ? "Update" : "Generate") + " the News wire with Claude"); b.addEventListener("click", nlAsk); r.appendChild(b); }
    body.appendChild(r);
    if (M.err && !M.busy && CL_ASK[M.k]) body.appendChild(el("p", "pv-none cl-err", nwErr(M.err, M.doc && M.doc.writing && M.doc.writing.at)));
  }
  function nlFilters(body, M) {
    var opts = [["all", "All", ""], ["breaking", "Breaking", "🚨"], ["number", "Numbers", "🔢"], ["fun", "Fun", "🎲"]].filter(function (o) { return o[0] === "all" || M.items.some(function (x) { return x.kind === o[0]; }); });
    if (opts.length < 2) { nl.f = "all"; return; }
    if (!opts.some(function (o) { return o[0] === nl.f; })) nl.f = "all";
    var r = el("div", "nl-f");
    opts.forEach(function (o) { var b = el("button", null); b.type = "button"; b.setAttribute("aria-pressed", nl.f === o[0] ? "true" : "false"); if (o[2]) b.appendChild(nwEm(o[2])); b.appendChild(document.createTextNode(o[1])); b.addEventListener("click", function () { nl.f = o[0]; keepScroll(renderNews); }); r.appendChild(b); });
    body.appendChild(r);
  }
  function nlShown(M) { return nl.f === "all" ? M.items : M.items.filter(function (x) { return x.kind === nl.f; }); }
  function nlOwn(body) {
    var b = el("button", "nl-own"); b.type = "button"; var d = el("span"); d.appendChild(el("b", null, "✦ Build your own page")); d.appendChild(el("span", null, "Pick games or leagues to dig into")); b.appendChild(d); b.appendChild(icon("more"));
    b.addEventListener("click", function () { nl.tab = "now"; try { localStorage.setItem("slate-newslabtab", "now"); localStorage.setItem("slate-newscustom", "1"); } catch (e) {} renderNews(true); if (isDuo) $("pane-r").scrollTop = 0; else window.scrollTo(0, 0); });
    body.appendChild(b);
  }
  function nlReads(body, M, title) {
    var seen = {}, rows = []; M.lgs.forEach(function (lg) { var n = 0; (M.per[lg] || []).forEach(function (a) { if (a.kind === "HeadlineNews" || a.kind === "Media" || a.kind === "Recap" || a.kind === "Preview" || !a.img || seen[a.title] || n >= 1 || /highlights$/i.test(a.title)) return; seen[a.title] = 1; n++; rows.push(a); }); });
    if (!rows.length) return;
    body.appendChild(nlH(title || "📖 Worth reading", "ESPN and The Athletic"));
    var rc = el("div", "nx-card nx-reads"); rows.slice(0, 5).forEach(function (a) { rc.appendChild(nwRead({ title: a.title, url: a.url, source: a.src + " · " + ((LEAGUES[a.lg] || {}).tag || "") })); }); body.appendChild(rc);
  }
  function nlCaught() { return el("div", "nl-caught", "Caught up to here" + (nl.prev ? " at " + nlTime(nl.prev) : "")); }
  function nlEmpty(body, M) { if (M.lead || M.items.length) return false; body.appendChild(el("p", "pv-none", M.loading ? "Loading headlines…" : "No headlines right now.")); return true; }
  // a text entry: tags, headline, summary, link, and a thumbnail on the right
  function nlEntry(x, cls) {
    var a = nlLink(x, "nl-e" + (cls ? " " + cls : "")), top = nlTags(x); top.appendChild(el("span", "nl-tm", nlTime(x.ms))); a.appendChild(top);
    if ((x.kind === "number" || x.kind === "fun") && x.value) { a.classList.add("num"); a.appendChild(el("b", "n", x.value)); var d = el("div"); d.appendChild(el("h4", null, x.title)); if (x.text) d.appendChild(el("p", null, x.text)); a.appendChild(d); return a; }
    var d2 = el("div"); d2.appendChild(el("h4", null, x.title)); if (x.text) d2.appendChild(el("p", null, x.text)); var s = nlSrc(x); if (s) d2.appendChild(s); a.appendChild(d2);
    var im = nlImg(x, "th", 240); if (im) a.appendChild(im);
    return a;
  }
  function nlLead(x, cls) {
    var a = nlLink(x, "nl-lead" + (cls ? " " + cls : "")), im = nlImg(x, "bg", 800); if (im) a.appendChild(im); else a.classList.add("noimg");
    var d = el("div", "in"), top = nlTags(x, !!im); top.appendChild(el("span", "nl-tm", nlTime(x.ms))); d.appendChild(top);
    d.appendChild(el("h3", null, x.title)); if (x.text) d.appendChild(el("p", null, x.text)); var s = nlSrc(x); if (s) d.appendChild(s); a.appendChild(d); return a;
  }
  // ----- the layouts -----
  // Wire 1, Edge to edge (and the Combo, with the games pinned first)
  function nlWire1(body, M, combo) {
    nlStatus(body, M);
    if (combo && M.games.length) { body.appendChild(nlH("📺 On tonight", M.games.length + (M.games.length === 1 ? " game" : " games") + " to know")); var gt = el("div", "nl-ton"); M.games.slice(0, 4).forEach(function (o) { gt.appendChild(nlGameTile(o)); }); body.appendChild(gt); }
    nlFilters(body, M); if (nlEmpty(body, M)) return;
    if (M.lead && nl.f === "all") body.appendChild(nlLead(M.lead, "bleed"));
    var hr = "", wrap = el("div", "nl-w1"), list = nlShown(M), marked = !list.some(function (x) { return x.nw; });
    list.forEach(function (x, i) {
      var d = new Date(x.ms), key = d.toDateString() + d.getHours();
      if (!marked && !x.nw) { marked = true; wrap.appendChild(nlCaught()); }
      if (key !== hr) { hr = key; var n = list.filter(function (y) { var e = new Date(y.ms); return e.toDateString() + e.getHours() === key; }), nn = n.filter(function (y) { return y.nw; }).length;
        var h = el("div", "nl-hr"); h.appendChild(el("b", null, nlTime(x.ms).replace(/:\d\d/, ""))); h.appendChild(el("span", null, (d.toDateString() !== new Date().toDateString() ? "yesterday · " : "") + n.length + (n.length === 1 ? " update" : " updates"))); if (nn) h.appendChild(el("i", null, nn + " new")); wrap.appendChild(h); }
      wrap.appendChild(nlEntry(x, "bleed"));
      if (!combo && nl.f === "all" && i % 4 === 1 && M.games[(i - 1) / 4]) wrap.appendChild(nlGameRow(M.games[(i - 1) / 4]));
    });
    body.appendChild(wrap); nlOwn(body);
  }
  // Wire 2, The Mosaic: two columns of tiles
  function nlWire2(body, M) {
    nlStatus(body, M); nlFilters(body, M); if (nlEmpty(body, M)) return;
    var g = el("div", "nl-mo"), list = nlShown(M), gi = 0;
    var tile = function (x, wide) {
      var num = (x.kind === "number" || x.kind === "fun") && x.value, im = !num && nlImg(x, "bg", wide ? 800 : 400), a = nlLink(x, "nl-t" + (im ? " ph" : num ? " nl-nm" : "") + (wide ? " wide" : ""));
      var top = nlTags(x, !!im); top.appendChild(el("span", "nl-tm", nlTime(x.ms)));
      if (im) { a.appendChild(im); top.classList.add("top"); a.appendChild(top); var d = el("div", "in"); d.appendChild(el("h4", null, x.title)); if (wide && x.text) d.appendChild(el("p", null, x.text)); a.appendChild(d); }
      else if (num) { a.appendChild(top); a.appendChild(el("b", "n", x.value)); var dn = el("div"); dn.appendChild(el("h4", null, x.title)); if (x.text) dn.appendChild(el("p", null, x.text)); a.appendChild(dn); }
      else { a.appendChild(top); var dt = el("div"); dt.appendChild(el("h4", null, x.title)); if (x.text) dt.appendChild(el("p", null, x.text)); a.appendChild(dt); var s = nlSrc(x); if (s) a.appendChild(s); }
      return a;
    };
    if (M.lead && nl.f === "all") g.appendChild(tile(M.lead, true));
    list.forEach(function (x, i) { g.appendChild(tile(x)); if (nl.f === "all" && i % 3 === 0 && M.games[gi]) g.appendChild(nlPoster(M.games[gi++], true)); });
    body.appendChild(g); nlOwn(body);
  }
  // Wire 3, The Board: games and numbers pinned, then tight rows
  function nlWire3(body, M) {
    nlStatus(body, M, true); if (nlEmpty(body, M)) return;
    if (M.games.length) { body.appendChild(nlH("📺 On tonight", M.games.length + (M.games.length === 1 ? " game" : " games") + " to know")); var gt = el("div", "nl-ton"); M.games.slice(0, 4).forEach(function (o) { gt.appendChild(nlGameTile(o)); }); body.appendChild(gt); }
    if (M.nums.length) { body.appendChild(nlH("🔢 Numbers today")); var ns = el("div", "nl-nums"); M.nums.slice(0, 3).forEach(function (x) { var c = nlLink(x, "nl-n"); c.appendChild(el("b", null, x.value)); c.appendChild(el("span", null, x.title)); ns.appendChild(c); }); body.appendChild(ns); }
    body.appendChild(nlH("🚨 The wire", M.nNew ? el("span", "nl-new", "↑ " + M.nNew + " new") : ""));
    var rows = el("div", "nl-rows");
    [M.lead].concat(M.items).filter(Boolean).sort(function (a, b) { return b.ms - a.ms; }).forEach(function (x) {
      var a = nlLink(x, "nl-r" + (x.nw ? " new" : "")), t = el("span", "t", nlTime(x.ms).replace(/ [AP]M/, "")); t.appendChild(el("i")); a.appendChild(t);
      var d = el("div"); d.appendChild(nlTags(x)); d.appendChild(el("h4", null, x.title)); if (x.text) d.appendChild(el("p", null, x.text)); a.appendChild(d);
      var num = (x.kind === "number" || x.kind === "fun") && x.value, im = !num && nlImg(x, "th", 240); if (num) a.appendChild(el("b", "n", x.value)); else if (im) a.appendChild(im);
      rows.appendChild(a);
    });
    body.appendChild(rows); nlOwn(body);
  }
  // A, The Rundown: five things, prime time, a number, the leagues, reads
  function nlRundown(body, M) {
    nlStatus(body, M); if (nlEmpty(body, M)) return;
    var hour = new Date().getHours(), five = [M.lead].concat(M.news).filter(Boolean).slice(0, 5);
    body.appendChild(nlH("Five things to know " + (hour < 11 ? "this morning" : hour < 17 ? "today" : "tonight"), "2 min read"));
    var fc = el("div", "nx-card nl-five");
    five.forEach(function (x, i) { var a = nlLink(x, "nl-it"); a.appendChild(el("span", "nl-rk", String(i + 1))); var d = el("div"); d.appendChild(el("h4", null, x.title)); if (x.text) d.appendChild(el("p", null, x.text)); var m = nlTags(x); var s = nlSrc(x); if (s) m.appendChild(s); d.appendChild(m); a.appendChild(d); fc.appendChild(a); });
    body.appendChild(fc);
    if (M.games.length) { body.appendChild(nlH("📺 Prime time", "tonight")); M.games.slice(0, 4).forEach(function (o) { body.appendChild(nlGameRow(o)); }); }
    if (M.nums[0]) { var x0 = M.nums[0]; body.appendChild(nlH("🔢 Number of the day")); var nc0 = nlLink(x0, "nx-card nl-num"); nc0.appendChild(el("b", null, x0.value)); var nd = el("div"); nd.appendChild(el("h4", null, x0.title)); if (x0.text) nd.appendChild(el("p", null, x0.text)); var ns0 = nlSrc(x0); if (ns0) nd.appendChild(ns0); nc0.appendChild(nd); body.appendChild(nc0); }
    if (M.leagues.length) {
      body.appendChild(nlH("Around the leagues", "tap for the full briefing")); var lc = el("div", "nx-card nl-lgs");
      M.leagues.forEach(function (x) { var b = el("button", "nl-lr"); b.type = "button"; b.appendChild(el("b", null, LEAGUES[x.key].tag)); b.appendChild(el("span", null, x.line)); b.appendChild(icon("more")); b.addEventListener("click", function () { if (nwBriefLgs().indexOf(x.key) !== -1) nwPickLg(x.key); }); lc.appendChild(b); });
      body.appendChild(lc);
    }
    nlReads(body, M); nlOwn(body);
  }
  // B, The Wire as first drawn: a timeline with the time down the side
  function nlWireB(body, M) {
    nlStatus(body, M); nlFilters(body, M); if (nlEmpty(body, M)) return;
    var tl = el("div", "nl-tl"), list = (nl.f === "all" && M.lead ? [M.lead] : []).concat(nlShown(M)).sort(function (a, b) { return b.ms - a.ms; }), marked = !list.some(function (x) { return x.nw; });
    list.forEach(function (x, i) {
      if (!marked && !x.nw) { marked = true; tl.appendChild(nlCaught()); }
      var e = el("div", "nl-te"); if (x.c) e.style.setProperty("--c", x.c); e.appendChild(el("span", "t", nlTime(x.ms).replace(/ [AP]M/, "")));
      var a = nlLink(x, "nx-card nl-tc"), im = i < 6 && !x.value ? nlImg(x, "ph", 600) : null; if (im) a.appendChild(im); a.appendChild(nlTags(x));
      if ((x.kind === "number" || x.kind === "fun") && x.value) { var bg = el("div", "big"); bg.appendChild(el("b", null, x.value)); var bd = el("div"); bd.appendChild(el("h4", null, x.title)); if (x.text) bd.appendChild(el("p", null, x.text)); bg.appendChild(bd); a.appendChild(bg); }
      else { a.appendChild(el("h4", null, x.title)); if (x.text) a.appendChild(el("p", null, x.text)); var s = nlSrc(x); if (s) a.appendChild(s); }
      e.appendChild(a); tl.appendChild(e);
      if (nl.f === "all" && i % 4 === 2 && M.games[(i - 2) / 4]) { var ge = el("div", "nl-te"); ge.appendChild(el("span", "t", "")); ge.appendChild(nlGameRow(M.games[(i - 2) / 4])); tl.appendChild(ge); }
    });
    body.appendChild(tl); nlOwn(body);
  }
  // C, The Slate Daily: a front page
  function nlDaily(body, M) {
    var hour = new Date().getHours(), mast = el("div", "nl-mast"); mast.appendChild(el("b", null, "The Slate Daily"));
    mast.appendChild(el("span", null, fmtDate(todayInHome(), { weekday: "long", month: "long", day: "numeric" }) + " · " + (hour < 11 ? "Morning" : hour < 17 ? "Afternoon" : "Evening") + " edition")); body.appendChild(mast);
    nlStatus(body, M, true); if (nlEmpty(body, M)) return;
    if (M.lead) body.appendChild(nlLead(M.lead, "nl-crd"));
    var pics = M.news.filter(function (x) { return x.img; }).slice(0, 2), rest = M.news.filter(function (x) { return pics.indexOf(x) === -1; });
    if (pics.length === 2) { var two = el("div", "nl-two"); pics.forEach(function (x) { var a = nlLink(x, "nx-card nl-s2"), im = nlImg(x, "", 400); if (im) a.appendChild(im); var d = el("div"); d.appendChild(nlTags(x)); d.appendChild(el("h4", null, x.title)); a.appendChild(d); two.appendChild(a); }); body.appendChild(two); } else rest = M.news;
    if (M.games.length) {
      body.appendChild(nlH("📺 Tonight's marquee", M.games.length + (M.games.length === 1 ? " game" : " games"))); var ps = el("div", "nl-posts nl-p" + Math.min(3, M.games.length)); M.games.slice(0, 3).forEach(function (o) { ps.appendChild(nlPoster(o)); }); body.appendChild(ps);
      if (M.games[0].why) { var g0 = M.games[0].g, q = el("div", "nx-card nl-q"), p = el("p"); p.appendChild(el("b", null, "The one to circle: ")); p.appendChild(document.createTextNode(pairText(g0, function (sd) { return short(g0, sd); }, " at ") + ". " + M.games[0].why)); q.appendChild(p); body.appendChild(q); }
    }
    if (M.nums.length) { body.appendChild(nlH("🔢 By the numbers")); var ns = el("div", "nl-nums nl-2c"); M.nums.slice(0, 4).forEach(function (x) { var c = nlLink(x, "nl-n"); c.appendChild(el("b", null, x.value)); c.appendChild(el("span", null, x.title)); ns.appendChild(c); }); body.appendChild(ns); }
    if (rest.length) { body.appendChild(nlH("⚡ Quick hits")); var qc = el("div", "nx-card"); rest.slice(0, 5).forEach(function (x) { var a = nlLink(x, "nl-q"); a.appendChild(nlTags(x)); var p2 = el("p"); p2.appendChild(el("b", null, x.title + (x.text ? ". " : ""))); if (x.text) p2.appendChild(document.createTextNode(x.text)); a.appendChild(p2); qc.appendChild(a); }); body.appendChild(qc); }
    nlReads(body, M, "📖 From the press box"); nlOwn(body);
  }
  // D, The Deck: one big card at a time
  function nlDeck(body, M) {
    nlStatus(body, M, true); if (nlEmpty(body, M)) return;
    var cards = [], hits = M.news.slice(0, 3), fun = M.nums.filter(function (x) { return x.kind === "fun"; })[0], num = M.nums.filter(function (x) { return x !== fun; })[0];
    if (M.lead) cards.push(function (c) { c.classList.add("lead"); var im = nlImg(M.lead, "bg", 800); if (im) { c.appendChild(im); c.appendChild(el("div", "sh")); } else c.classList.add("flat"); var d = el("div", "in"); d.appendChild(el("span", "k", "🚨 The lead" + ((LEAGUES[M.lead.lg] || {}).tag ? " · " + LEAGUES[M.lead.lg].tag : ""))); d.appendChild(el("h3", null, M.lead.title)); if (M.lead.text) d.appendChild(el("p", null, M.lead.text)); var s = nlSrc(M.lead); if (s) d.appendChild(s); c.appendChild(d); return M.lead; });
    if (M.games[0]) cards.push(function (c) { var o = M.games[0], g = o.g; c.classList.add("mu"); nlGameColors(c, g); var lg = el("div", "lg2"); sideOrder(g).forEach(function (sd) { lg.appendChild(nwTeamBadge(g[sd], g, sd)); }); c.appendChild(lg); c.appendChild(el("div", "sh")); var d = el("div", "in"); d.appendChild(el("span", "k", "📺 The game to circle")); d.appendChild(el("h3", null, pairText(g, function (sd) { return short(g, sd); }, " at "))); if (o.why) d.appendChild(el("p", null, o.why)); var r = el("div", "row"); [nlGameMeta(g), [g.awayRecord, g.homeRecord].filter(Boolean).join(" vs ")].filter(Boolean).forEach(function (t) { r.appendChild(el("span", null, t)); }); d.appendChild(r); c.appendChild(d); nlOpenGame(c, g); });
    if (num) cards.push(function (c) { c.classList.add("num"); var d = el("div", "in"); d.appendChild(el("span", "k", "🔢 Number of the day" + ((LEAGUES[num.lg] || {}).tag ? " · " + LEAGUES[num.lg].tag : ""))); d.appendChild(el("div", "big", num.value)); d.appendChild(el("h3", "sm", num.title)); if (num.text) d.appendChild(el("p", null, num.text)); var s = nlSrc(num); if (s) d.appendChild(s); c.appendChild(d); return num; });
    if (hits.length) cards.push(function (c) { c.classList.add("hits"); var d = el("div", "in"); d.appendChild(el("span", "k", "⚡ " + (hits.length === 3 ? "Three" : hits.length === 2 ? "Two" : "One") + " quick " + (hits.length === 1 ? "hit" : "hits"))); hits.forEach(function (x) { var a = nlLink(x, "ht"); a.appendChild(el("b", null, x.title)); if (x.text) a.appendChild(el("span", null, x.text)); d.appendChild(a); }); c.appendChild(d); });
    if (fun) cards.push(function (c) { c.classList.add("num"); var d = el("div", "in"); d.appendChild(el("span", "k", "🎲 Did you know")); d.appendChild(el("div", "big", fun.value)); d.appendChild(el("h3", "sm", fun.title)); if (fun.text) d.appendChild(el("p", null, fun.text)); c.appendChild(d); return fun; });
    var deck = el("div", "nl-deck");
    cards.forEach(function (fn, i) { var c = el("div", "nl-dc"), dots = el("div", "dots"); cards.forEach(function (_, j) { dots.appendChild(el("i", j <= i ? "on" : "")); }); var x = fn(c); c.appendChild(dots); if (x && x.url) { c.setAttribute("role", "link"); c.addEventListener("click", function () { window.open(safeUrl(x.url), "_blank", "noopener"); }); } deck.appendChild(c); });
    body.appendChild(deck); nlReads(body, M); nlOwn(body);
  }
  // the row of layouts, and whichever one is picked. Returns true when it drew the page.
  function nlRender(body) {
    if (!nlOn()) return false;
    var tab = nlTab(), row = el("div", "nl-tabs"); row.setAttribute("role", "tablist"); row.setAttribute("aria-label", "Try a News layout");
    NL_TABS.forEach(function (t) { var b = el("button", null, t[1]); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", t[0] === tab ? "true" : "false"); b.addEventListener("click", function () { if (nl.tab === t[0]) return; nl.tab = t[0]; nl.f = "all"; try { localStorage.setItem("slate-newslabtab", t[0]); } catch (e) {} renderNews(true); }); row.appendChild(b); });
    body.appendChild(row);
    if (tab === "now") return false;
    var pad = 16, n = body; while (n && n !== document.body) { var pl = parseFloat(getComputedStyle(n).paddingLeft) || 0; if (pl >= 8) { pad = pl; break; } n = n.parentNode; }
    var wrap = el("div", "nl nl-" + tab); wrap.style.setProperty("--pad", pad + "px"); body.appendChild(wrap);
    var M = nlModel();
    if (tab === "a") nlRundown(wrap, M); else if (tab === "b") nlWireB(wrap, M); else if (tab === "c") nlDaily(wrap, M); else if (tab === "d") nlDeck(wrap, M);
    else if (tab === "w2") nlWire2(wrap, M); else if (tab === "w3") nlWire3(wrap, M); else nlWire1(wrap, M, tab === "combo");
    return true;
  }

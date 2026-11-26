  // ---------- News: the Front Page (3.139.0, DJ Nov 25, 2026) ----------
  // DJ: "Remove the tabs. Keep just front page. Make this page the same for every user and update on a schedule. No
  // generation or customization. ... I want this to be more about Claude and slate than anything ... I liked the design
  // that included the pills at the top to filter the information shown below. I think there should be a news homepage,
  // but those pill type selections to further filter the information shown."
  // So News is one page for everyone, drawn from the shared doc newsdeep/<day>-w-wire that Claude writes on a schedule
  // (worker/newswire.js, every 3 hours 6 AM to midnight Central): a lead, story breakdowns, previews of the games coming up, recaps of the ones
  // that ended, a snapshot of each league, numbers and fun facts. The pills on top filter it: Home, Breaking, Up next,
  // Recaps, Numbers, and one per league. Nothing here calls Claude. ESPN's and The Athletic's own headlines (free) fill
  // in what has been published since the last write, and the whole page before the day's first one.
  // History: 3.136.0-3.138.0 tried eight layouts as tabs (203-news-lab.js); DJ picked the combined one. docs/pages/news.md.
    var nl = { f: "home", prev: null, story: null, back: null, all: false, open: false };
  function nlPath(day) { return "newsdeep/" + (day || todayInHome()) + "-w-wire"; }
  function nlDayBefore(iso) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
  function nlHex(v) { v = String(v || ""); return hexOk(v) ? v : hexOk("#" + v) ? "#" + v : ""; }
  function nlTime(ms) { return timeText(new Date(ms).toISOString()); }
  // ----- the model every layout draws from -----
  function nlFeedItem(url) { var it = null; if (url) Object.keys(nw.feeds).some(function (k) { it = nwItem(k, url); return !!it; }); return it; }
  var NL_LGS = ["nfl", "nba", "ncaaf", "ncaam", "nhl", "mlb", "epl", "ncaaw"];   // the same leagues the server writes about
  function nlModel() {
    var today = todayInHome(), past = state.date < today, path = nlPath(past ? state.date : today); nwSub(path);
    var ok = function (d) { return !!(d && d.at && ((d.items || []).length || d.lead)); };
    var doc = nw.docs[path], has = ok(doc), wr = doc && doc.writing, busy = !!(wr && wr.at && !wr.error && Date.now() - Date.parse(wr.at) < 10 * 60000);
    // after midnight, before the day's first write: last night's page stays up
    if (!past && !has && doc !== undefined) { var yp = nlPath(nlDayBefore(today)); nwSub(yp); if (ok(nw.docs[yp])) { doc = nw.docs[yp]; has = true; } }
    var lgs = NL_LGS.filter(function (k2) { return LEAGUES[k2] && bxBase(k2); }), per = {}, loading = doc === undefined, now = Date.now();
    if (past) lgs = [];
    lgs.forEach(function (lg) { var c = nw.feeds[lg]; if (!c || (!c.busy && now - c.at > 10 * 60000)) nwFeed(lg).then(nwRedraw, function () {}); if (c && c.items) per[lg] = c.items; else loading = true; });
    var fill = function (x) {   // the photo, team and color for one entry
      var it = nlFeedItem(x.url); if (it && it.img) x.img = it.img;
      x.t = (x.team && nwTeam(x.team, x.lg)) || (it ? ncTeamOf(it) : null) || nwFindTeam(x.title, x.lg);
      if (x.value && x.kind !== "fun" && x.kind !== "breaking") x.kind = "number";   // Claude sometimes files a number under "news"
      x.c = (x.t && nlHex(x.t.c1)) || ""; x.ms = Date.parse(x.at) || now; return x;
    };
    var free = function (a) { return fill({ kind: a.kind === "HeadlineNews" && now - (Date.parse(a.at) || 0) < 6 * 3600000 ? "breaking" : "news", tag: "", lg: a.lg, team: "", title: a.title, text: a.desc && a.desc.length > 20 ? String(a.desc).replace(/^\s*[—-]\s*/, "") : "", value: "", url: a.url, src: a.src, at: a.at, free: true }); };
    var items = [], seen = {}, add = function (x) { var key = x.url || x.title; if (seen[key] || seen[String(x.title).toLowerCase()]) return; seen[key] = 1; seen[String(x.title).toLowerCase()] = 1; items.push(x); };
    var lead = null, stories = [], wrote = function (x) { return !x.free; }, isNum = function (x) { return (x.kind === "number" || x.kind === "fun") && !!x.value; };
    if (has) {
      if (doc.lead) { lead = fill(Object.assign({}, doc.lead)); seen[lead.url || lead.title] = 1; }
      stories = (doc.stories || []).map(function (x) { var y = fill(Object.assign({}, x)); seen[y.url || y.title] = 1; seen[String(y.title).toLowerCase()] = 1; return y; });
      (doc.items || []).forEach(function (x) { add(fill(Object.assign({}, x))); });
      // 3.140.5 (DJ: "The wire in news should go back all through the day"): Claude's entries only reach back as far as
      // its passes chose to, so the rest of today's stories from ESPN and The Athletic (since midnight, and anything
      // newer than the last pass) fill the wire in as they are. They are marked free: the top of the page stays Claude's.
      var mid = new Date(); mid.setHours(0, 0, 0, 0); var from = mid.getTime();
      lgs.forEach(function (lg) { (per[lg] || []).forEach(function (a) { var ts = Date.parse(a.at) || 0; if (ts >= from && ts <= now + 60000 && a.kind !== "Media" && !/highlights$/i.test(a.title)) add(free(a)); }); });
    } else {
      var pool = [];
      lgs.forEach(function (lg) { var n = 0; (per[lg] || []).forEach(function (a) { if (a.kind === "Media" || /highlights$/i.test(a.title) || now - (Date.parse(a.at) || 0) > 30 * 3600000) return; if (a.kind === "HeadlineNews" || n++ < 4) pool.push(a); }); });
      pool.forEach(function (a) { add(free(a)); });
    }
    items.sort(function (a, b) { return b.ms - a.ms; });
    if (!has) items = items.slice(0, 26);
    if (!lead) { lead = items.filter(function (x) { return x.img && x.kind !== "number" && x.kind !== "fun"; })[0] || items[0] || null; }
    if (lead) items = items.filter(function (x) { return x !== lead; });
    // a page written before 3.143.0 has no breakdowns of its own: Claude's five newest entries stand in until the next write
    if (has && !stories.length) { stories = items.filter(function (x) { return wrote(x) && !isNum(x); }).slice(0, 5); items = items.filter(function (x) { return stories.indexOf(x) === -1; }); }
    // Claude's previews (games still to come) and recaps (finished), each with the app's own game when it has one
    var gs = games(), own = function (x) { x.game = x.id ? gs.filter(function (y) { return String(y.id) === String(x.id); })[0] || null : null; x.ms = Date.parse(x.start) || 0; return x; };
    var recaps = has ? (doc.recaps || []).map(function (x) { return own(Object.assign({}, x)); }) : [], done = {}; recaps.forEach(function (x) { done[x.ev] = 1; });
    var previews = has ? (doc.previews || []).map(function (x) { return own(Object.assign({}, x)); }).filter(function (x) { return !done[x.ev] && (past || x.ms > now - 4 * 3600000) && !(x.game && status(x.game).kind === "over"); }) : [];
    // what's new since you last looked (kept per day on this phone)
    if (nl.prev == null) { var sv = null; try { sv = JSON.parse(localStorage.getItem("slate-newsseen") || "null"); } catch (e) {} nl.prev = sv && sv.d === todayInHome() ? sv.t : 0; try { localStorage.setItem("slate-newsseen", JSON.stringify({ d: todayInHome(), t: now })); } catch (e) {} }
    var isNew = function (x) { return nl.prev > 0 && Math.max(x.ms, Date.parse(x.w) || 0) > nl.prev; };
    items.concat(stories).forEach(function (x) { x.nw = isNew(x); });
    // Just In: breaking headlines exactly as ESPN and The Athletic publish them, the moment they are in the feed (no wait for Claude)
    var brk = items.filter(function (x) { return x.kind === "breaking" && (past || now - x.ms < 8 * 3600000); });
    return { doc: doc, has: has, busy: busy, past: past, lead: lead, stories: stories, brk: brk, items: items, previews: previews, recaps: recaps, nums: items.filter(function (x) { return (x.kind === "number" || x.kind === "fun") && x.value; }),
      news: items.filter(function (x) { return !((x.kind === "number" || x.kind === "fun") && x.value); }), top: (has ? items.filter(wrote) : items).filter(function (x) { return !((x.kind === "number" || x.kind === "fun") && x.value); }), leagues: has ? (doc.leagues || []).filter(function (x) { return LEAGUES[x.key] && (x.text || x.line); }) : [], nNew: items.filter(function (x) { return x.nw; }).length, loading: loading, per: per, lgs: lgs };
  }
  // ----- shared pieces -----
  // 3.143.0 (DJ: "I don't like the section titles"): every section title in one place
  var NL_T = { brk: "Just In", lead: "The Lead", stories: "The Breakdown", next: "On Deck", recaps: "In the Books", nums: "Stat Sheet", leagues: "League Check", all: "All Headlines", reads: "Long Reads" };
  var NL_KIND = { breaking: ["Breaking", "🚨"], number: ["Number", "🔢"], fun: ["Did you know", "🎲"] };
  function nlPill(text, cls, em) { var p = el("span", "nl-pill" + (cls ? " " + cls : "")); if (em) p.appendChild(nwEm(em)); p.appendChild(document.createTextNode(text)); return p; }
  function nlTags(x, dark) {
    var r = el("div", "nl-kr"), kd = NL_KIND[x.kind], tag = kd ? kd[0] : x.tag || "";
    if (tag) r.appendChild(nlPill(tag, dark ? "dk" : x.kind === "breaking" ? "red" : kd ? "acc" : "", kd ? kd[1] : nwCatEm(tag)));
    var lt = (LEAGUES[x.lg] || {}).tag; if (lt) r.appendChild(nlPill(lt, dark ? "dk" : "", ""));
    if (x.nw) r.appendChild(nlPill("New", dark ? "dk" : "acc", ""));
    return r;
  }
  function nlLink(x, cls) { var a = el(x.url ? "a" : "div", cls); if (x.url) { a.href = safeUrl(x.url); a.target = "_blank"; a.rel = "noopener"; } if (x.c) a.style.setProperty("--c", x.c); a.addEventListener("click", function (e) { nlOpenStory(x, e); }); return a; }
  function nlSrc(x) { return x.url ? el("span", "nl-src", "Read it on " + (x.src || "ESPN") + " ›") : null; }
  function nlImg(x, cls, w) { return x.img ? nwImg(nwPic(x.img, w || 400), cls) : null; }
  function nlH(title, right) { var h = el("div", "nl-h"); h.appendChild(el("b", null, title)); if (right) h.appendChild(typeof right === "string" ? el("span", null, right) : right); return h; }
  function nlReads(body, M, title) {
    var seen = {}, rows = []; M.lgs.forEach(function (lg) { var n = 0; (M.per[lg] || []).forEach(function (a) { if (a.kind === "HeadlineNews" || a.kind === "Media" || a.kind === "Recap" || a.kind === "Preview" || !a.img || seen[a.title] || n >= 1 || /highlights$/i.test(a.title)) return; seen[a.title] = 1; n++; rows.push(a); }); });
    if (!rows.length) return;
    body.appendChild(nlH(title || NL_T.reads, "ESPN and The Athletic"));
    var rc = el("div", "nx-card nx-reads"); rows.slice(0, 5).forEach(function (a) { rc.appendChild(nwRead({ title: a.title, url: a.url, source: a.src + " · " + ((LEAGUES[a.lg] || {}).tag || "") })); }); body.appendChild(rc);
  }
  function nlCaught() { return el("div", "nl-caught", "Caught up to here" + (nl.prev ? " at " + nlTime(nl.prev) : "")); }
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
  function nlTile(x, wide) {
      var num = (x.kind === "number" || x.kind === "fun") && x.value, im = !num && nlImg(x, "bg", wide ? 800 : 400), a = nlLink(x, "nl-t" + (im ? " ph" : num ? " nl-nm" : "") + (wide ? " wide" : ""));
      var top = nlTags(x, !!im); top.appendChild(el("span", "nl-tm", nlTime(x.ms)));
      if (im) { a.appendChild(im); top.classList.add("top"); a.appendChild(top); var d = el("div", "in"); d.appendChild(el("h4", null, x.title)); if (wide && x.text) d.appendChild(el("p", null, x.text)); a.appendChild(d); }
      else if (num) { a.appendChild(top); a.appendChild(el("b", "n", x.value)); var dn = el("div"); dn.appendChild(el("h4", null, x.title)); if (x.text) dn.appendChild(el("p", null, x.text)); a.appendChild(dn); }
      else { a.appendChild(top); var dt = el("div"); dt.appendChild(el("h4", null, x.title)); if (x.text) dt.appendChild(el("p", null, x.text)); a.appendChild(dt); var s = nlSrc(x); if (s) a.appendChild(s); }
      return a;
    }
  function nlWrap(body, cls) {
    var pad = 16, n = body; while (n && n !== document.body) { var pl = parseFloat(getComputedStyle(n).paddingLeft) || 0; if (pl >= 8) { pad = pl; break; } n = n.parentNode; }
    var wrap = el("div", "nl " + cls); wrap.style.setProperty("--pad", pad + "px"); body.appendChild(wrap); return wrap;
  }
  // ----- the unfolded Duo (3.138.0, DJ picked "Yes, tap opens on the other half"): the wire stays on its half and a
  // tapped story or game opens on the other half, replacing what was there. Close puts that half back. -----
  function nlOther() { if (!PANE) return null; try { var f = window.parent.document.getElementById(PANE === "a" ? "pn-b" : "pn-a"), w = f && f.contentWindow; return w && w.SlateApp && w.SlateApp.newsStory ? w : null; } catch (e) { return null; } }
  function nlOpenStory(x, e) {
    var w = nlOther(); if (!w) return false; if (e) { e.preventDefault(); e.stopPropagation(); }
    w.SlateApp.newsStory(JSON.stringify({ kind: x.kind, tag: x.tag, lg: x.lg, team: x.team, title: x.title, text: x.text, value: x.value, url: x.url, src: x.src, img: x.img, at: x.at, ms: x.ms, c: x.c, free: x.free, why: x.why, next: x.next })); return true;
  }
  function nlStoryShow(x) { if (!nl.story) nl.back = state.view === "news" ? "news" : pnRouteOf(); nl.story = x; if (state.view !== "news") setView("news"); else renderNews(true); window.scrollTo(0, 0); }
  function nlStoryClose() { var r = nl.back || "news"; nl.story = null; nl.back = null; if (r !== "news" && window.SlateApp && window.SlateApp.paneGo) window.SlateApp.paneGo(r); else renderNews(true); }
  setTimeout(function () { if (window.SlateApp) window.SlateApp.newsStory = function (json) { try { nlStoryShow(JSON.parse(json)); } catch (e) {} }; }, 0);
  // the story on its own half. Returns true when it drew.
  function nlStoryRender(body) {
    var x = nl.story; if (!x) return false;
    var wrap = nlWrap(body, "nl-sv"), bar = el("div", "nl-svbar"), cb = el("button", "nl-svx"); cb.type = "button"; cb.appendChild(el("span", null, "✕ Close")); cb.addEventListener("click", nlStoryClose); bar.appendChild(el("b", null, "From the wire")); bar.appendChild(cb); wrap.appendChild(bar);
    var num = (x.kind === "number" || x.kind === "fun") && x.value, im = !num && x.img ? nwImg(nwPic(x.img, 800), "nl-svp") : null; if (im) wrap.appendChild(im);
    var art = el("div", "nl-sva"); if (x.c) art.style.setProperty("--c", x.c);
    var top = nlTags(x); top.appendChild(el("span", "nl-tm", nlTime(x.ms || Date.now()))); art.appendChild(top);
    if (num) art.appendChild(el("b", "nl-svn", x.value));
    art.appendChild(el("h3", null, x.title)); if (x.text) art.appendChild(el("p", null, x.text));
    var sdp = nlDeep(x); if (sdp) art.appendChild(sdp);
    if (!x.free) art.appendChild(el("span", "nl-svg", "Summary generated by Claude"));
    if (x.url) { var a = el("a", "nl-svb", "Read the full story on " + (x.src || "ESPN") + " ›"); a.href = safeUrl(x.url); a.target = "_blank"; a.rel = "noopener"; art.appendChild(a); }
    wrap.appendChild(art);
    var M = nlModel(), more = [M.lead].concat(M.stories, M.items).filter(function (y) { return y && y.lg === x.lg && y.title !== x.title; }).slice(0, 5);
    if (more.length) {
      wrap.appendChild(nlH("More from " + ((LEAGUES[x.lg] || {}).tag || "the wire"))); var mw = el("div", "nl-w1");
      more.forEach(function (y) { var e = nlEntry(y, "bleed"); e.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopImmediatePropagation(); nl.story = y; renderNews(true); window.scrollTo(0, 0); }, true); mw.appendChild(e); });
      wrap.appendChild(mw);
    }
    return true;
  }
  // ----- 3.143.0 (DJ: "too many direct headlines and not enough Claude summary and breakdown") -----
  // why it matters / what's next, under a breakdown
  function isNumX(x) { return (x.kind === "number" || x.kind === "fun") && !!x.value; }
  function nlDeep(x) {
    if (!x.why && !x.next) return null; var d = el("div", "nf-dp");
    [["Why it matters", x.why], ["What's next", x.next]].forEach(function (r) { if (!r[1]) return; var p = el("p"); p.appendChild(el("b", null, r[0])); p.appendChild(document.createTextNode(r[1])); d.appendChild(p); });
    return d;
  }
  // one of Claude's breakdowns: the story in its own words, then why it matters and what's next
  function nlStory(x) {
    var a = nlLink(x, "nx-card nf-s"), top = nlTags(x); top.appendChild(el("span", "nl-tm", nlTime(x.ms))); a.appendChild(top);
    var hd = el("div", "nf-sh"); hd.appendChild(el("h4", null, x.title)); var im = nlImg(x, "th", 240); if (im) hd.appendChild(im); a.appendChild(hd);
    if (x.text) a.appendChild(el("p", null, x.text));
    var dp = nlDeep(x); if (dp) a.appendChild(dp);
    var s = nlSrc(x); if (s) a.appendChild(s);
    return a;
  }
  // Just In: the breaking headlines themselves, newest first, one line each
  function nlJustIn(list) {
    var c = el("div", "nx-card nf-ji");
    list.forEach(function (x) { var a = nlLink(x, "nf-j" + (x.nw ? " nw" : "")); a.appendChild(el("span", "tm", nlTime(x.ms))); var d = el("span", "tt"); var lt = (LEAGUES[x.lg] || {}).tag; if (lt) d.appendChild(el("i", null, lt)); d.appendChild(document.createTextNode(x.title)); a.appendChild(d); a.appendChild(icon("more")); c.appendChild(a); });
    return c;
  }
  // ----- a game Claude previewed or recapped: the two teams in their colors (ESPN's names, time and score), then Claude's words -----
  function nlGameCard(o, kind) {
    var c = el("div", "nx-card nf-g nf-" + kind), hd = el("div", "nf-gh"), g = o.game;
    hd.style.setProperty("--a", nlHex(o.ac) || "var(--raise)"); hd.style.setProperty("--h", nlHex(o.hc) || "var(--raise)");
    var side = function (sd) {
      var a = sd === "away", d = el("div", "nf-gs " + sd), rk = a ? o.ak : o.hk, t = el("span", "nf-gt");
      d.appendChild(badgeFor(a ? o.aa : o.ha, a ? o.away : o.home, nlHex(a ? o.ac : o.hc)));
      t.appendChild(el("b", null, (rk ? rk + " " : "") + (a ? o.aa : o.ha))); if (a ? o.ar : o.hr) t.appendChild(el("em", null, a ? o.ar : o.hr)); d.appendChild(t);
      return d;
    };
    var mid = el("div", "nf-gm"), live = g ? status(g).kind === "live" : false, sc = g ? scoreOf(g) : null;
    if (kind === "recap") { mid.appendChild(el("b", null, o.as + " - " + o.hs)); mid.appendChild(el("span", null, "Final")); }
    else if (live && sc) { mid.appendChild(el("b", "live", sc.a + " - " + sc.h)); mid.appendChild(el("span", "live", "Live")); }
    else { var st = new Date(o.ms), same = st.toDateString() === new Date().toDateString(); mid.appendChild(el("b", "tm", nlTime(o.ms))); mid.appendChild(el("span", null, [same ? "" : st.toLocaleDateString("en-US", { weekday: "short" }), (o.tv || [])[0]].filter(Boolean).join(" · "))); }
    hd.appendChild(side("away")); hd.appendChild(mid); hd.appendChild(side("home")); c.appendChild(hd);
    var bd = el("div", "nf-gb"), tg = el("div", "nl-kr");
    tg.appendChild(nlPill(kind === "recap" ? "Recap" : "Preview", kind === "recap" ? "" : "acc", kind === "recap" ? "🏁" : "🔭")); var lt = (LEAGUES[o.lg] || {}).tag; if (lt) tg.appendChild(nlPill(lt, "", "")); if (o.note) tg.appendChild(el("span", "nf-note", o.note));
    bd.appendChild(tg); bd.appendChild(el("h4", null, o.title)); bd.appendChild(el("p", null, o.text));
    if (kind === "preview" && o.watch) { var w = el("p", "nf-x"); w.appendChild(el("b", null, "👀 Watch for ")); w.appendChild(document.createTextNode(o.watch)); bd.appendChild(w); }
    if (kind === "recap" && o.star) { var s2 = el("p", "nf-x"); s2.appendChild(el("b", null, "⭐ ")); s2.appendChild(document.createTextNode(o.star)); bd.appendChild(s2); }
    c.appendChild(bd);
    if (g) { c.classList.add("tap"); c.setAttribute("role", "button"); c.tabIndex = 0; c.addEventListener("click", function () { var ow = nlOther(); if (ow && !document.documentElement.classList.contains("pn-fwd")) { ow.SlateApp.paneGo("game:" + g.id); return; } openMatchup(g); }); }
    return c;
  }
  function nlNumTile(x) { var c = nlLink(x, "nl-n"); c.appendChild(el("b", null, x.value)); c.appendChild(el("span", "t", x.title)); if (x.text) c.appendChild(el("span", null, x.text)); return c; }
  function nlFive(list) {
    var fc = el("div", "nx-card nl-five");
    list.forEach(function (x, i) { var a = nlLink(x, "nl-it"); a.appendChild(el("span", "nl-rk", String(i + 1))); var d = el("div"); d.appendChild(el("h4", null, x.title)); if (x.text) d.appendChild(el("p", null, x.text)); var m = nlTags(x); var s = nlSrc(x); if (s) m.appendChild(s); d.appendChild(m); a.appendChild(d); fc.appendChild(a); });
    return fc;
  }
  // the wire by the hour, edge to edge, with pairs of photo tiles breaking it up
  function nlWireList(list) {
    var wrap = el("div", "nl-w1"), hr = "", marked = !list.some(function (x) { return x.nw; }), run = 0, i = 0;
    while (i < list.length) {
      var x = list[i], d = new Date(x.ms), key = d.toDateString() + d.getHours(), same = function (y) { var e = new Date(y.ms); return e.toDateString() + e.getHours() === key; };
      if (!marked && !x.nw) { marked = true; wrap.appendChild(nlCaught()); run = 0; }
      if (key !== hr) { hr = key; var n = list.filter(same), nn = n.filter(function (y) { return y.nw; }).length, h = el("div", "nl-hr"); h.appendChild(el("b", null, nlTime(x.ms).replace(/:\d\d/, ""))); h.appendChild(el("span", null, (d.toDateString() !== new Date().toDateString() ? d.toLocaleDateString("en-US", { weekday: "short" }) + " · " : "") + n.length + (n.length === 1 ? " update" : " updates"))); if (nn) h.appendChild(el("i", null, nn + " new")); wrap.appendChild(h); run = 0; }
      var y = list[i + 1], pic = function (z) { return z && z.img && !((z.kind === "number" || z.kind === "fun") && z.value); };
      if (run >= 1 && pic(x) && pic(y) && (marked || y.nw || !x.nw)) { var pr = el("div", "nl-pair"); pr.appendChild(nlTile(x)); pr.appendChild(nlTile(y)); wrap.appendChild(pr); i += 2; run = 0; }
      else { wrap.appendChild(nlEntry(x, "bleed")); i++; run++; }
    }
    return wrap;
  }
  function nlMore(label, f) { var b = el("button", "nf-more"); b.type = "button"; b.appendChild(el("span", null, label)); b.appendChild(icon("more")); b.addEventListener("click", function () { nlPick(f); }); return b; }
  function nlPick(f) { nl.f = f; renderNews(true); var top = $("nw-body"); if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView(); }
  function nlLeagueCard(x, tap) {
    var c = el(tap ? "button" : "div", "nx-card nf-lg"); if (tap) { c.type = "button"; c.addEventListener("click", function () { nlPick("lg:" + x.key); }); }
    var h = el("div", "nf-lh"); h.appendChild(el("b", null, LEAGUES[x.key].tag)); if (x.title) h.appendChild(el("span", null, x.title)); if (tap) h.appendChild(icon("more")); c.appendChild(h);
    c.appendChild(el("p", null, x.text || x.line)); return c;
  }
  // the pills: what's on the page. Each says how much is behind it; Breaking wears a red dot when something is new.
  function nlPills(body, M) {
    var brk = [M.lead].concat(M.stories, M.items).filter(function (x) { return x && x.kind === "breaking"; }), opts = [["home", "Home", "🏠", 0]];
    if (brk.length) opts.push(["breaking", NL_T.brk, "🚨", brk.length, brk.some(function (x) { return x.nw; })]);
    if (M.previews.length) opts.push(["next", NL_T.next, "🔭", M.previews.length]);
    if (M.recaps.length) opts.push(["recaps", NL_T.recaps, "🏁", M.recaps.length]);
    if (M.nums.length) opts.push(["numbers", NL_T.nums, "🔢", M.nums.length]);
    var cnt = {}, bump = function (x) { if (x && LEAGUES[x.lg]) cnt[x.lg] = (cnt[x.lg] || 0) + 1; };
    [M.lead].concat(M.stories, M.items.filter(function (x) { return !x.free; }), M.previews, M.recaps).forEach(bump); M.leagues.forEach(function (x) { cnt[x.key] = (cnt[x.key] || 0) + 1; });
    Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).forEach(function (k) { opts.push(["lg:" + k, LEAGUES[k].tag, "", cnt[k]]); });
    if (!opts.some(function (o) { return o[0] === nl.f; })) nl.f = "home";
    if (opts.length < 2) return;
    var row = el("div", "nf-pills"); row.setAttribute("role", "tablist"); row.setAttribute("aria-label", "Filter the news");
    opts.forEach(function (o) {
      var b = el("button", "nf-pill" + (o[0].indexOf("lg:") === 0 ? " lg" : "")); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", nl.f === o[0] ? "true" : "false");
      if (o[2]) b.appendChild(nwEm(o[2])); b.appendChild(el("b", null, o[1])); if (o[3]) b.appendChild(el("i", null, String(o[3]))); if (o[4]) b.appendChild(el("u"));
      b.addEventListener("click", function () { if (nl.f !== o[0]) nlPick(o[0]); }); row.appendChild(b);
    });
    // 3.140.2 (DJ: "swiping on the pill tabs attempts to swipe the page back to my slate"): a finger on the row only
    // scrolls the row; the page swipe (280-ios-bridge.js) never hears it. Same as the My TVs editor.
    ["touchstart", "touchmove", "touchend"].forEach(function (k) { row.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); });
    body.appendChild(row);
    var on = row.querySelector('[aria-selected="true"]'); if (on && on.offsetLeft + on.offsetWidth > row.clientWidth) row.scrollLeft = on.offsetLeft - 16;
  }
  function nlStamp(body, M) {
    var r = el("div", "nf-st"), t;
    if (M.has) t = "Generated by Claude " + clWhen(M.doc.at) + (M.past ? "" : M.busy ? " · writing a fresh pass now" : " · rewritten through the day, breaking news shows right away");
    else t = M.past ? "" : "Claude writes this page through the day, starting at 6 AM. Until then, these are ESPN's headlines.";
    if (M.busy) r.appendChild(el("i", "cl-dot")); r.appendChild(el("span", null, t));
    if (M.nNew && !M.past) r.appendChild(el("span", "nl-new", "↑ " + M.nNew + " new"));
    if (t) body.appendChild(r);
  }
  // the page. Always draws (returns true), so the old News below it in renderNews is no longer reached.
  function nlRender(body) {
    var M = nlModel(), wrap = nlWrap(body, "nf"), f;
    // 3.140.2 (DJ): the Dynamic Island covers the top right of the folded Duo and of the unfolded Duo's right half. The
    // pills, the "Generated by Claude" line and the lead's tag row stop short of it (--nf-isl, used in 103-news-front.css).
    var isl = 0, root = document.documentElement;
    try { if (PANE) { if (root.classList.contains("pn-right")) isl = parseFloat(window.parent.document.documentElement.style.getPropertyValue("--strip-w")) || 0; } else if (root.classList.contains("side-col")) isl = parseFloat(root.style.getPropertyValue("--strip-w")) || 0; } catch (e) { isl = 0; }
    wrap.style.setProperty("--nf-isl", isl + "px");
    nlPills(wrap, M); f = nl.f; nlStamp(wrap, M);
    if (!M.lead && !M.items.length) { wrap.appendChild(el("p", "pv-none", M.loading ? "Loading the news…" : M.past ? "No News page was saved for " + fmtDate(state.date, { weekday: "long", month: "short", day: "numeric" }) + "." : "No news right now.")); return true; }
    var all = [M.lead].concat(M.stories, M.items).filter(Boolean);
    var none = function (t) { wrap.appendChild(el("p", "pv-none", t)); };
    var gamesSec = function (list, kind, cap, f2) { if (!list.length) return; wrap.appendChild(nlH(kind === "preview" ? NL_T.next : NL_T.recaps, kind === "preview" ? "Claude's previews" : "Claude's recaps")); (cap ? list.slice(0, cap) : list).forEach(function (o) { wrap.appendChild(nlGameCard(o, kind)); }); if (cap && list.length > cap) wrap.appendChild(nlMore("All " + list.length + (kind === "preview" ? " previews" : " recaps"), f2)); };
    // every other headline of the day: closed on Home until asked for (the page is Claude's), open before the day's first write
    var headlines = function (list, open) {
      if (!list.length) return; var n = list.length + (list.length === 1 ? " headline" : " headlines");
      wrap.appendChild(nlH(NL_T.all, M.past ? n : n + " today"));
      if (!open && !nl.open) { var ob = el("button", "nf-more"); ob.type = "button"; ob.appendChild(el("span", null, "Show " + (list.length === 1 ? "it" : "all " + list.length))); ob.appendChild(icon("more")); ob.addEventListener("click", function () { nl.open = true; keepScroll(renderNews); }); wrap.appendChild(ob); return; }
      wrap.appendChild(nlWireList(nl.all ? list : list.slice(0, 20)));
      if (!nl.all && list.length > 20) { var mb = el("button", "nf-more"); mb.type = "button"; mb.appendChild(el("span", null, "Show the rest of the day (" + (list.length - 20) + " more)")); mb.appendChild(icon("more")); mb.addEventListener("click", function () { nl.all = true; keepScroll(renderNews); }); wrap.appendChild(mb); }
    };
    if (f === "breaking") {
      var bk = all.filter(function (x) { return x.kind === "breaking"; }).sort(function (a, b) { return b.ms - a.ms; });
      if (bk[0] && bk[0].img) wrap.appendChild(nlLead(bk.shift(), "bleed")); if (bk.length) wrap.appendChild(nlWireList(bk));
    } else if (f === "next") {
      gamesSec(M.previews, "preview");
    } else if (f === "recaps") {
      gamesSec(M.recaps, "recap");
    } else if (f === "numbers") {
      wrap.appendChild(nlH(NL_T.nums)); var ng = el("div", "nl-nums nl-2c"); M.nums.forEach(function (x) { ng.appendChild(nlNumTile(x)); }); wrap.appendChild(ng);
    } else if (f.indexOf("lg:") === 0) {
      var lg = f.slice(3), snap = M.leagues.filter(function (x) { return x.key === lg; })[0], mine = function (x) { return x.lg === lg; };
      if (snap) wrap.appendChild(nlLeagueCard(snap));
      var ls = [M.lead].concat(M.stories).filter(function (x) { return x && mine(x) && !x.free; }), lp = M.previews.filter(mine), lr = M.recaps.filter(mine), li = M.items.filter(mine).sort(function (a, b) { return b.ms - a.ms; });
      if (ls.length) { wrap.appendChild(nlH(NL_T.stories, "Claude's breakdowns")); ls.forEach(function (x) { wrap.appendChild(nlStory(x)); }); }
      gamesSec(lp, "preview"); gamesSec(lr, "recap");
      headlines(li, true);
      if (!snap && !ls.length && !lp.length && !lr.length && !li.length) none("Nothing here right now.");
      nlReads(wrap, { lgs: [lg], per: M.per });
    } else {
      var jin = M.brk.slice(0, 5);
      if (jin.length) { wrap.appendChild(nlH(NL_T.brk, "as it happens")); wrap.appendChild(nlJustIn(jin)); if (M.brk.length > 5) wrap.appendChild(nlMore("All " + M.brk.length + " breaking headlines", "breaking")); }
      if (M.lead) { if (M.has) wrap.appendChild(nlH(NL_T.lead, "Claude's top story")); wrap.appendChild(nlLead(M.lead, "bleed")); var ld = nlDeep(M.lead); if (ld) { var lc = el("div", "nx-card nf-ld"); lc.appendChild(ld); wrap.appendChild(lc); } }
      if (M.stories.length) { wrap.appendChild(nlH(NL_T.stories, "Claude's breakdowns")); M.stories.forEach(function (x) { wrap.appendChild(nlStory(x)); }); }
      gamesSec(M.previews, "preview", 2, "next"); gamesSec(M.recaps, "recap", 2, "recaps");
      if (M.nums.length) { wrap.appendChild(nlH(NL_T.nums)); var hg = el("div", "nl-nums nl-2c"); M.nums.slice(0, 4).forEach(function (x) { hg.appendChild(nlNumTile(x)); }); wrap.appendChild(hg); if (M.nums.length > 4) wrap.appendChild(nlMore("All " + M.nums.length + " numbers", "numbers")); }
      if (M.leagues.length) { wrap.appendChild(nlH(NL_T.leagues, "Claude's snapshots")); M.leagues.forEach(function (x) { wrap.appendChild(nlLeagueCard(x, true)); }); }
      headlines(M.items.filter(function (x) { return jin.indexOf(x) === -1 && !isNumX(x); }), !M.has);
    }
    return true;
  }

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
    var nl = { wx: {}, f: "home", prev: null, last: 0, story: null, back: null, all: false, open: false };
  function nlPath(day) { return "newsdeep/" + (day || todayInHome()) + "-w-wire"; }
  function nlDayBefore(iso) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
  function nlHex(v) { v = String(v || ""); return hexOk(v) ? v : hexOk("#" + v) ? "#" + v : ""; }
  function nlTime(ms) { return timeText(new Date(ms).toISOString()); }
  // ----- the model every layout draws from -----
  function nlFeedItem(url) { var it = null; if (url) Object.keys(nw.feeds).some(function (k) { it = nwItem(k, url); return !!it; }); return it; }
  var NL_LGS = ["nfl", "nba", "ncaaf", "ncaam", "nhl", "mlb", "epl", "ncaaw"];   // the same leagues the server writes about
  function nlModel() {
    // 3.144.2 (DJ: "News doesn't need the day picker. Should only show the updated news for the current time"): always today
    var today = todayInHome(), past = false, path = nlPath(today); nwSub(path);
    var ok = function (d) { return !!(d && d.at && ((d.items || []).length || d.lead)); };
    // 3.148.1: the app's day turns over at 4 AM, the server's pages at midnight Central. Between the two the page for the
    // new calendar day may already exist (a write-up after midnight), so the newer of the two is the one shown.
    var cal = todayInHome(); try { cal = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch (e) {}
    if (cal > today) { var cp = nlPath(cal); nwSub(cp); if (ok(nw.docs[cp]) && (!ok(nw.docs[path]) || nw.docs[cp].at > nw.docs[path].at)) path = cp; }
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
    var previews = has ? (doc.previews || []).map(function (x) { return own(Object.assign({}, x)); }).filter(function (x) { return !done[x.ev] && (past || x.ms > now - 4 * 3600000) && !(x.game && status(x.game).kind === "over") && !(nl.sb[x.ev] && nl.sb[x.ev].state === "post"); }) : [];
    // 3.163.0: the page Claude designed for this write-up (theme, its own sections, names, order); games in it get the app's game
    var page = has && doc.page && typeof doc.page === "object" ? { feature: doc.page.feature && doc.page.feature.title ? Object.assign({}, doc.page.feature, { games: (doc.page.feature.games || []).map(function (y) { return own(Object.assign({}, y)); }), stories: (doc.page.feature.stories || []).map(function (y) { var z = fill(Object.assign({}, y)); seen[z.url || z.title] = 1; return z; }) }) : null, theme: doc.page.theme || null, emoji: doc.page.emoji || {}, titles: doc.page.titles || {}, order: Array.isArray(doc.page.order) ? doc.page.order : [], specials: (Array.isArray(doc.page.specials) ? doc.page.specials : []).map(function (sp) { return Object.assign({}, sp, { items: (sp.items || []).map(function (y) { var o = Object.assign({}, y); return o.ev ? own(o) : o; }) }); }) } : null;
    // 3.144.2 (DJ: "anything new since last generation, or since last time I viewed the page, should show some sort of
    // indicator"): what was written or published after this person last had News open, kept on this phone. The marks stay
    // for the visit and are gone on the next one (a visit ends once News has been off screen for two minutes).
    if (nl.prev == null || now - nl.last > 120000) { var sv = null; try { sv = JSON.parse(localStorage.getItem("slate-newsseen") || "null"); } catch (e) {} nl.prev = nl.prev == null ? (sv && Number(sv.t)) || 0 : nl.last; }
    nl.last = now; try { localStorage.setItem("slate-newsseen", JSON.stringify({ d: todayInHome(), t: now })); } catch (e) {}
    var isNew = function (x) { return nl.prev > 0 && Math.max(x.free ? x.ms : 0, Date.parse(x.w) || (x.free ? 0 : x.ms)) > nl.prev; };
    items.concat(stories, lead ? [lead] : [], previews, recaps).forEach(function (x) { x.nw = isNew(x); });
    // Just In: breaking headlines exactly as ESPN and The Athletic publish them, the moment they are in the feed (no wait for Claude)
    var brk = items.filter(function (x) { return x.kind === "breaking" && (past || now - x.ms < 8 * 3600000); });
    return { doc: doc, has: has, busy: busy, past: past, page: page, lead: lead, stories: stories, brk: brk, items: items, previews: previews, recaps: recaps, nums: items.filter(function (x) { return (x.kind === "number" || x.kind === "fun") && x.value; }),
      news: items.filter(function (x) { return !((x.kind === "number" || x.kind === "fun") && x.value); }), top: (has ? items.filter(wrote) : items).filter(function (x) { return !((x.kind === "number" || x.kind === "fun") && x.value); }), leagues: has ? (doc.leagues || []).filter(function (x) { return LEAGUES[x.key] && (x.text || x.line); }) : [], nNew: items.concat(stories, lead ? [lead] : [], previews, recaps).filter(function (x) { return x.nw; }).length, loading: loading, per: per, lgs: lgs };
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
  var NL_E = { brk: "🚨", lead: "📰", stories: "🔎", next: "🔭", recaps: "🏁", nums: "🔢", leagues: "🏟️", all: "🗞️", reads: "📚" };
  var NL_LE = { nfl: "🏈", ncaaf: "🏈", nba: "🏀", ncaam: "🏀", ncaaw: "🏀", nhl: "🏒", mlb: "⚾", epl: "⚽" };
  function nlH(title, right, em) { var h = el("div", "nl-h"), tb = el("b", null, title); if (em) { tb.insertBefore(nwEm(em), tb.firstChild); h.classList.add("em"); } h.appendChild(tb); if (right) h.appendChild(typeof right === "string" ? el("span", null, right) : right); return h; }
  function nlReads(body, M, title) {
    var seen = {}, rows = []; M.lgs.forEach(function (lg) { var n = 0; (M.per[lg] || []).forEach(function (a) { if (a.kind === "HeadlineNews" || a.kind === "Media" || a.kind === "Recap" || a.kind === "Preview" || !a.img || seen[a.title] || n >= 1 || /highlights$/i.test(a.title)) return; seen[a.title] = 1; n++; rows.push(a); }); });
    if (!rows.length) return;
    body.appendChild(nlH(title || NL_T.reads, "ESPN and The Athletic"));
    var rc = el("div", "nx-card nx-reads"); rows.slice(0, 5).forEach(function (a) { rc.appendChild(nwRead({ title: a.title, url: a.url, source: a.src + " · " + ((LEAGUES[a.lg] || {}).tag || "") })); }); body.appendChild(rc);
  }
  function nlCaught() { return el("div", "nl-caught", "Caught up to here" + (nl.prev ? " at " + nlTime(nl.prev) : "")); }
  // a text entry: tags, headline, summary, link, and a thumbnail on the right
  function nlEntry(x, cls) {
    var a = nlLink(x, "nl-e" + (cls ? " " + cls : "")), top = nlTags(x); if (x.t) top.insertBefore(teamBadge(x.t), top.firstChild); top.appendChild(el("span", "nl-tm", nlTime(x.ms))); a.appendChild(top);
    if ((x.kind === "number" || x.kind === "fun") && x.value) { a.classList.add("num"); a.appendChild(el("b", "n", x.value)); var d = el("div"); d.appendChild(el("h4", null, x.title)); if (x.text) d.appendChild(el("p", null, x.text)); a.appendChild(d); return a; }
    var d2 = el("div"); d2.appendChild(el("h4", null, x.title)); if (x.text) d2.appendChild(el("p", null, x.text)); var s = nlSrc(x); if (s) d2.appendChild(s); a.appendChild(d2);
    var im = nlImg(x, "th", 240); if (im) a.appendChild(im);
    return a;
  }
  function nlLead(x, cls) {
    var a = nlLink(x, "nl-lead clr" + (cls ? " " + cls : "")), im = nlImg(x, "bg", 800); if (im) a.appendChild(im); else a.classList.add("noimg");
    var d = el("div", "in"), top = nlTags(x, false); top.appendChild(el("span", "nl-tm", nlTime(x.ms))); d.appendChild(top);
    d.appendChild(el("h3", null, x.title)); if (x.text) d.appendChild(el("p", null, x.text)); var s = nlSrc(x); if (s) d.appendChild(s); a.appendChild(d); return a;
  }
  function nlTile(x, wide) {
      var num = (x.kind === "number" || x.kind === "fun") && x.value, im = !num && nlImg(x, "bg", wide ? 800 : 400), a = nlLink(x, "nl-t" + (im ? " ph" : num ? " nl-nm" : "") + (wide ? " wide" : ""));
      var top = nlTags(x, false); top.appendChild(el("span", "nl-tm", nlTime(x.ms)));
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
  // 3.149.2 (DJ: "Only need one back button. Match the layout and design and placement of other places it is used in the
  // app"): an opened story or section is a page you opened, so the app's own Back button shows (bottom right, in place
  // of the bar; goBack calls nwCloseDeep in 200-news.js, which closes the story, then the section). Where the app's Back
  // is not on screen (the left half of the unfolded Duo has no bar or Back of its own), News draws the same round button.
  function nlOpen() { return !!nl.story || nl.f !== "home"; }
  function nlChrome() { var sg = (nl.story ? "s" : "") + nl.f; if (nl.csig === sg) return; nl.csig = sg; if (typeof n3Draw === "function") n3Draw(); if (typeof renderBack === "function") renderBack(); }
  function nlFab(fn) { var b = el("button", "nf-fab"); b.type = "button"; b.setAttribute("aria-label", "Back"); b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'; b.addEventListener("click", fn); return b; }
  function nlStoryRender(body) {
    var x = nl.story; if (!x) return false;
    // 3.148.1 (DJ got stuck here: Close sat top right, under the Dynamic Island): Back is on the left, away from the island,
    // and again as a button under the thumb that stays on screen
    var wrap = nlWrap(body, "nl-sv"), bar = el("div", "nl-svbar"); bar.appendChild(el("b", null, "News story")); wrap.appendChild(bar); nlChrome();
    var dbk = $("dock-back"); if (!dbk || !dbk.offsetWidth) wrap.appendChild(nlFab(nlStoryClose));
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
  // 3.144.2 (DJ: "Some pictures in news are too small. Use more team colors and logos"): the team an entry is about, as
  // its logo badge and name
  function nlTeamMark(x, cls) { if (!x.t) return null; var m = el("span", "nf-tm" + (cls ? " " + cls : "")); m.appendChild(teamBadge(x.t)); m.appendChild(el("b", null, x.t.name)); return m; }
  // one of Claude's breakdowns: a full-width picture (or a band in the team's color), the team's logo, the story in
  // Claude's words, then why it matters and what's next
  function nlStory(x) {
    var a = nlLink(x, "nx-card nf-s"), ph = el("div", "nf-sp"), im = nlImg(x, "bg", 800), tm = nlTeamMark(x);
    if (im) ph.appendChild(im); else ph.classList.add("noimg"); if (tm) ph.appendChild(tm); if (im || tm) a.appendChild(ph);
    var bd = el("div", "nf-sb"), top = nlTags(x); top.appendChild(el("span", "nl-tm", nlTime(x.ms))); bd.appendChild(top);
    bd.appendChild(el("h4", null, x.title)); if (x.text) bd.appendChild(el("p", null, x.text));
    var dp = nlDeep(x); if (dp) bd.appendChild(dp);
    var s = nlSrc(x); if (s) bd.appendChild(s); a.appendChild(bd);
    return a;
  }
  // Just In: the breaking headlines themselves, newest first, each with its team's logo
  function nlJustIn(list) {
    var c = el("div", "nx-card nf-ji");
    list.forEach(function (x) {
      var a = nlLink(x, "nf-j" + (x.nw ? " nw" : "")); if (x.t) a.appendChild(teamBadge(x.t)); else a.appendChild(el("span", "nf-jl", (LEAGUES[x.lg] || {}).tag || ""));
      var d = el("span", "tt"), m = el("i"); if (x.nw) m.appendChild(el("u")); m.appendChild(document.createTextNode([nlTime(x.ms), x.t ? (LEAGUES[x.lg] || {}).tag : ""].filter(Boolean).join(" · "))); d.appendChild(m); d.appendChild(el("b", null, x.title)); a.appendChild(d); a.appendChild(icon("more")); c.appendChild(a);
    });
    return c;
  }
  // ----- a game Claude previewed or recapped: the two teams in their colors (ESPN's names, time and score), then Claude's words -----
  // 3.172.4 (DJ: "News anytime showing scores should be updated. Whether live or completed, should show accurate score and
  // time left"): every game card on News reads ESPN's scoreboard for its own game (by ESPN's event number, so it works for
  // games the slate doesn't carry too). While News is open, the scoreboards of games that have started and aren't final
  // are read again every 20 seconds; the card shows the live score with the time left, then the final.
  nl.sb = {}; nl.sbWant = {}; nl.sbAt = {};
  function nlSbDay(ms, add) { var p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms + (add || 0) * 86400000)); return p.replace(/-/g, ""); }
  function nlScore(o) {
    if (!o.ev || !o.lg || !(ESPN_URLS[o.lg] || []).length) return null;
    var ms = o.ms || Date.parse(o.start) || 0, s = nl.sb[o.ev];
    if (ms && Date.now() > ms - 5 * 60000 && Date.now() < ms + 30 * 3600000 && !(s && s.state === "post")) { nl.sbWant[o.lg + "|" + nlSbDay(ms, 0)] = 1; if (nlSbDay(ms, 0) !== nlSbDay(ms - 6 * 3600000, 0)) nl.sbWant[o.lg + "|" + nlSbDay(ms, -1)] = 1; nlSbPoll(); }   // a game after midnight Eastern is on ESPN's list for the evening before
    return s && (s.state === "in" || s.state === "post") ? s : null;
  }
  function nlSbPoll() {
    if (!window.SLATE_SELF || state.view !== "news" || document.hidden) return;
    Object.keys(nl.sbWant).forEach(function (k) {
      if (Date.now() - (nl.sbAt[k] || 0) < 19000) return; nl.sbAt[k] = Date.now();
      var lg = k.split("|")[0], days = k.split("|")[1];
      ESPN_URLS[lg].forEach(function (u) {
        var q = u.split("&"), url = "https://site.api.espn.com/apis/site/v2/sports/" + q[0] + "/scoreboard?dates=" + days + (q.length > 1 ? "&" + q.slice(1).join("&") : "");
        rkFetch(url).then(function (d) {
          var ch = false; ((d || {}).events || []).forEach(function (e) {
            var c = (e.competitions || [])[0] || {}, cs = c.competitors || [], A = cs.filter(function (x) { return x.homeAway === "away"; })[0], H = cs.filter(function (x) { return x.homeAway === "home"; })[0], st = ((c.status || e.status || {}).type) || {};
            if (!A || !H) return; var v = { a: String(A.score == null ? "" : A.score), h: String(H.score == null ? "" : H.score), state: st.state || "", detail: st.shortDetail || st.detail || "" }, old = nl.sb[e.id];
            if (!old || old.a !== v.a || old.h !== v.h || old.state !== v.state || old.detail !== v.detail) { nl.sb[e.id] = v; if (v.state !== "pre" || (old && old.state !== "pre")) ch = true; }
          });
          if (ch) nwRedraw();
        });
      });
    });
  }
  if (window.SLATE_SELF) { setInterval(nlSbPoll, 20000); document.addEventListener("visibilitychange", function () { if (!document.hidden) { nl.sbAt = {}; nlSbPoll(); } }); }
  // the biggest games being played right now, biggest first: your teams, your slate, ranked teams, national TV, the
  // league, and a close game late. Scores and clocks are the app's live ones (040-live.js), so they tick by themselves.
  var NL_LVW = { nfl: 5, nba: 3, ncaaf: 3, ncaam: 2, nhl: 2, mlb: 2 }, NL_LAST = { nfl: 4, ncaaf: 4, nba: 4, wnba: 4, ncaam: 2, ncaaw: 4, nhl: 3, mlb: 7 }, NL_NAT = /^(ABC|CBS|NBC|FOX|ESPN|ESPN2|TNT|TBS|FS1|Prime Video|Peacock|NFL Network|NBA TV|truTV|USA Net|USA)$/i;
  function nlLive() {
    if (state.date !== todayInHome()) return [];
    var out = []; games().forEach(function (g) {
      if (status(g).kind !== "live") return; var sc = scoreOf(g); if (!sc || sc.state !== "in") return;
      var ra = Number(g.awayRank) || 0, rh = Number(g.homeRank) || 0, d = Math.abs(sc.a - sc.h), hoops = /^(nba|wnba|ncaam|ncaaw)$/.test(g.league), fb = /^(nfl|ncaaf)$/.test(g.league);
      var late = (Number(sc.p) || 0) >= (NL_LAST[g.league] || 2), close = d <= (fb ? 8 : hoops ? 6 : 1);
      var w = (NL_LVW[g.league] || 2) + (ra && rh ? 4 : ra || rh ? 2 : 0) + (inLineup(g.id) ? 4 : 0) + (isFav(g.away, g.league) || isFav(g.home, g.league) ? 6 : 0) + ((g.tv || []).some(function (n) { return NL_NAT.test(n); }) ? 2 : 0) + (late && close ? 3 : 0);
      out.push({ g: g, sc: sc, w: w });
    });
    return out.sort(function (a, b) { return b.w - a.w || String(a.g.start).localeCompare(String(b.g.start)); }).slice(0, 8);
  }
  function nlLiveTile(x) {
    var g = x.g, sc = x.sc, c = el("button", "nx-card nf-lv"), top = el("div", "nf-lvt"); c.type = "button";
    top.appendChild(el("b", null, sc.detail || "Live")); var lt = (LEAGUES[g.league] || {}).tag, tv = (g.tv || [])[0]; top.appendChild(el("span", null, [lt, tv].filter(Boolean).join(" · "))); c.appendChild(top);
    ["away", "home"].forEach(function (sd) {
      var a = sd === "away", r = el("div", "nf-lvr"), rk = Number(g[sd + "Rank"]) || 0, mine = a ? sc.a : sc.h, other = a ? sc.h : sc.a; if (mine > other) r.classList.add("up");
      r.appendChild(badgeFor(abbr(g, sd), g[sd], nlHex(g[sd + "Color"]))); r.appendChild(el("span", null, (rk ? rk + " " : "") + abbr(g, sd))); r.appendChild(el("b", null, String(mine))); c.appendChild(r);
    });
    c.addEventListener("click", function () { var ow = nlOther(); if (ow && !document.documentElement.classList.contains("pn-fwd")) { ow.SlateApp.paneGo("game:" + g.id); return; } openMatchup(g); });
    return c;
  }
  function nlGameCard(o, kind) {
    var c = el("div", "nx-card nf-g nf-" + kind), hd = el("div", "nf-gh"), g = o.game;
    hd.style.setProperty("--a", nlHex(o.ac) || "var(--raise)"); hd.style.setProperty("--h", nlHex(o.hc) || "var(--raise)");
    var side = function (sd) {
      var a = sd === "away", d = el("div", "nf-gs " + sd), rk = a ? o.ak : o.hk, t = el("span", "nf-gt");
      d.appendChild(badgeFor(a ? o.aa : o.ha, a ? o.away : o.home, nlHex(a ? o.ac : o.hc)));
      t.appendChild(el("b", null, (rk ? rk + " " : "") + (a ? o.aa : o.ha))); if (a ? o.ar : o.hr) t.appendChild(el("em", null, a ? o.ar : o.hr)); d.appendChild(t);
      return d;
    };
    var mid = el("div", "nf-gm"), sb = nlScore(o), live = sb ? sb.state === "in" : g ? status(g).kind === "live" : false, sc = sb || (g ? scoreOf(g) : null);
    if (sb && sb.a !== "" && sb.h !== "") { mid.appendChild(el("b", live ? "live" : null, sb.a + " - " + sb.h)); mid.appendChild(el("span", live ? "live" : null, live ? (sb.detail || "Live") : (/^final/i.test(sb.detail) ? sb.detail : "Final"))); }
    else if (kind === "recap") { mid.appendChild(el("b", null, o.as + " - " + o.hs)); mid.appendChild(el("span", null, "Final")); }
    else if (live && sc) { mid.appendChild(el("b", "live", sc.a + " - " + sc.h)); mid.appendChild(el("span", "live", sc.detail || "Live")); }
    else { var st = new Date(o.ms), same = st.toDateString() === new Date().toDateString(); mid.appendChild(el("b", "tm", nlTime(o.ms))); mid.appendChild(el("span", null, [same ? "" : st.toLocaleDateString("en-US", { weekday: "short" }), (o.tv || [])[0]].filter(Boolean).join(" · "))); }
    hd.appendChild(side("away")); hd.appendChild(mid); hd.appendChild(side("home")); c.appendChild(hd);
    var bd = el("div", "nf-gb"), tg = el("div", "nl-kr");
    tg.appendChild(nlPill(o.label || (kind === "recap" ? "Recap" : "Preview"), kind === "recap" ? "" : "acc", kind === "recap" ? "🏁" : "🔭")); var lt = (LEAGUES[o.lg] || {}).tag; if (lt) tg.appendChild(nlPill(lt, "", "")); if (o.nw) tg.appendChild(nlPill("New", "acc", "")); if (o.note) tg.appendChild(el("span", "nf-note", o.note));
    bd.appendChild(tg); if (o.title) bd.appendChild(el("h4", null, o.title)); bd.appendChild(el("p", null, o.text));
    if (kind === "preview" && o.watch) { var w = el("p", "nf-x"); w.appendChild(el("b", null, "👀 Watch for ")); w.appendChild(document.createTextNode(o.watch)); bd.appendChild(w); }
    if (kind === "recap" && o.star) { var s2 = el("p", "nf-x"), hi = o.head ? nwImg(o.head, "nf-hd") : null; if (hi) { s2.classList.add("hd"); s2.appendChild(hi); } s2.appendChild(el("b", null, "⭐ ")); s2.appendChild(document.createTextNode(o.star)); bd.appendChild(s2); }
    c.appendChild(bd);
    if (g) { c.classList.add("tap"); c.setAttribute("role", "button"); c.tabIndex = 0; c.addEventListener("click", function () { var ow = nlOther(); if (ow && !document.documentElement.classList.contains("pn-fwd")) { ow.SlateApp.paneGo("game:" + g.id); return; } openMatchup(g); }); }
    return c;
  }
  function nlNumTile(x) { var c = nlLink(x, "nl-n"); if (x.t) { c.classList.add("tmd"); c.appendChild(teamBadge(x.t)); } c.appendChild(el("b", null, x.value)); c.appendChild(el("span", "t", x.title)); if (x.text) c.appendChild(el("span", null, x.text)); return c; }
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
  function nlLeagueCard(x, tap, M) {
    var c = el(tap ? "button" : "div", "nx-card nf-lg"); if (tap) { c.type = "button"; c.addEventListener("click", function () { nlPick("lg:" + x.key); }); }
    var lp = M ? ((M.per[x.key] || []).filter(function (a) { return a.img; })[0] || null) : null, li = lp ? nwImg(nwPic(lp.img, 800), "nf-lp") : null; if (li) { c.classList.add("ph"); c.appendChild(li); }
    var h = el("div", "nf-lh"); if (NL_LE[x.key]) h.appendChild(nwEm(NL_LE[x.key])); h.appendChild(el("b", null, LEAGUES[x.key].tag)); if (x.title) h.appendChild(el("span", null, x.title)); if (tap) h.appendChild(icon("more")); c.appendChild(h);
    c.appendChild(el("p", null, x.text || x.line)); return c;
  }
  // the pills: what's on the page. Each says how much is behind it; Breaking wears a red dot when something is new.
  function nlOpts(M) {
    var brk = [M.lead].concat(M.stories, M.items).filter(function (x) { return x && x.kind === "breaking"; }), opts = [["home", "Home", "🏠", 0]];
    if (brk.length) opts.push(["breaking", NL_T.brk, "🚨", brk.length, brk.some(function (x) { return x.nw; })]);
    if (M.previews.length) opts.push(["next", NL_T.next, "🔭", M.previews.length, M.previews.some(function (x) { return x.nw; })]);
    if (M.recaps.length) opts.push(["recaps", NL_T.recaps, "🏁", M.recaps.length, M.recaps.some(function (x) { return x.nw; })]);
    if (M.nums.length) opts.push(["numbers", NL_T.nums, "🔢", M.nums.length]);
    var cnt = {}, bump = function (x) { if (x && LEAGUES[x.lg]) cnt[x.lg] = (cnt[x.lg] || 0) + 1; };
    [M.lead].concat(M.stories, M.items.filter(function (x) { return !x.free; }), M.previews, M.recaps).forEach(bump); M.leagues.forEach(function (x) { cnt[x.key] = (cnt[x.key] || 0) + 1; });
    Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).forEach(function (k) { opts.push(["lg:" + k, LEAGUES[k].tag, "", cnt[k]]); });
    if (!opts.some(function (o) { return o[0] === nl.f; })) nl.f = "home";
    return opts;
  }
  // 3.145.0 (DJ picked "Section button"): with the three-page bar on screen the sections live in its bottom-right button
  // (283-three-pages.js draws the button and its list from nlTabs); the pills on top stay only where that bar isn't shown
  function nlTabs() { return nl.story ? [] : (nl.opts || []).map(function (o) { return [o[0], o[1], o[3], !!o[4], nl.f === o[0]]; }); }
  function nlTabNow() { var t = ""; (nl.opts || []).forEach(function (o) { if (o[0] === nl.f && o[0] !== "home") t = o[1]; }); return t; }
  function nlBarTabs() { return typeof n3On === "function" && n3On() && !n3Left() && !(typeof panesOn === "function" && panesOn()); }   // the three-page bar is this page's menu (even while Back stands in for it)
  function nlPills(body, M) {
    var opts = nl.opts = nlOpts(M);
    if (opts.length < 2) return;
    if (nlBarTabs()) { if (nl.f !== "home") { var cur = opts.filter(function (o) { return o[0] === nl.f; })[0], hb = el("div", "nf-cur"); hb.appendChild(el("b", null, cur ? cur[1] : "")); body.appendChild(hb); } return; }
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
    if (M.nNew && !M.past) r.appendChild(el("span", "nl-new", M.nNew + " new since you last looked"));
    if (t) body.appendChild(r);
  }
  // one section as a wheel: a title with "2 of 5", then the cards side by side. A finger on it turns only the wheel
  // (the page swipe in 280-ios-bridge.js never hears it, like the pills), and where the wheel was turned to is kept
  // across redraws (nl.wx), since the page redraws itself when scores and stories arrive.
  function nlWheelSec(wrap, key, title, sub, cards, cls, intro, em) {
    if (!cards.length) return; var n = cards.length, h = nlH(title, n > 1 ? "1 of " + n : sub || "", em); wrap.appendChild(h); if (intro) wrap.appendChild(el("p", "nf-in", intro));
    if (n === 1) { wrap.appendChild(cards[0]); return; }
    var w = el("div", "nf-wh" + (cls ? " " + cls : "")); w.setAttribute("role", "group"); w.setAttribute("aria-label", title + ", " + n + " cards, swipe sideways");
    cards.forEach(function (c) { c.classList.add("nf-wc"); w.appendChild(c); }); wrap.appendChild(w);
    var lab = h.lastChild, per = cls === "sm" ? 2 : 1, tell = function () { var c0 = w.firstChild, step = c0 ? c0.offsetWidth + 10 : 1, i = Math.round(w.scrollLeft / step), end = w.scrollLeft + w.clientWidth >= w.scrollWidth - 4; i = end ? n : Math.min(n, i + per); lab.textContent = (per > 1 ? Math.max(1, i - per + 1) + " to " + i : i) + " of " + n; };
    if (nl.wx[key]) w.scrollLeft = nl.wx[key]; tell();
    w.addEventListener("scroll", function () { nl.wx[key] = w.scrollLeft; tell(); }, { passive: true });
    ["touchstart", "touchmove", "touchend"].forEach(function (k) { w.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); });
  }
  // the page. Always draws (returns true), so the old News below it in renderNews is no longer reached.
  function nlRender(body) {
    nl.sbWant = {}; var M = nlModel(), wrap = nlWrap(body, "nf"), f;
    // 3.140.2 (DJ): the Dynamic Island covers the top right of the folded Duo and of the unfolded Duo's right half. The
    // pills, the "Generated by Claude" line and the lead's tag row stop short of it (--nf-isl, used in 103-news-front.css).
    var isl = 0, root = document.documentElement;
    try { if (PANE) { if (root.classList.contains("pn-right")) isl = parseFloat(window.parent.document.documentElement.style.getPropertyValue("--strip-w")) || 0; } else if (root.classList.contains("side-col")) isl = parseFloat(root.style.getPropertyValue("--strip-w")) || 0; } catch (e) { isl = 0; }
    wrap.style.setProperty("--nf-isl", isl + "px");
    nlPills(wrap, M); f = nl.f; nlStamp(wrap, M);
    if (!M.lead && !M.items.length) { wrap.appendChild(el("p", "pv-none", M.loading ? "Loading the news…" : M.past ? "No News page was saved for " + fmtDate(state.date, { weekday: "long", month: "short", day: "numeric" }) + "." : "No news right now.")); return true; }
    var all = [M.lead].concat(M.stories, M.items).filter(Boolean);
    var none = function (t) { wrap.appendChild(el("p", "pv-none", t)); };
    var gamesSec = function (list, kind, cap, f2) { if (!list.length) return; wrap.appendChild(nlH(kind === "preview" ? NL_T.next : NL_T.recaps, kind === "preview" ? "Claude's previews" : "Claude's recaps", kind === "preview" ? NL_E.next : NL_E.recaps)); (cap ? list.slice(0, cap) : list).forEach(function (o) { wrap.appendChild(nlGameCard(o, kind)); }); if (cap && list.length > cap) wrap.appendChild(nlMore("All " + list.length + (kind === "preview" ? " previews" : " recaps"), f2)); };
    // every other headline of the day: closed on Home until asked for (the page is Claude's), open before the day's first write
    var headlines = function (list, open) {
      if (!list.length) return; var n = list.length + (list.length === 1 ? " headline" : " headlines");
      wrap.appendChild(nlH(NL_T.all, M.past ? n : n + " today", NL_E.all));
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
      if (snap) wrap.appendChild(nlLeagueCard(snap, false, M));
      var ls = [M.lead].concat(M.stories).filter(function (x) { return x && mine(x) && !x.free; }), lp = M.previews.filter(mine), lr = M.recaps.filter(mine), li = M.items.filter(mine).sort(function (a, b) { return b.ms - a.ms; });
      if (ls.length) { wrap.appendChild(nlH(NL_T.stories, "Claude's breakdowns")); ls.forEach(function (x) { wrap.appendChild(nlStory(x)); }); }
      gamesSec(lp, "preview"); gamesSec(lr, "recap");
      headlines(li, true);
      if (!snap && !ls.length && !lp.length && !lr.length && !li.length) none("Nothing here right now.");
      nlReads(wrap, { lgs: [lg], per: M.per });
    } else {
      // 3.161.0 (DJ: "Swiping along news cards shows them all in a horizontal wheel rather than opening a new page to
      // show them all"): every section on Home holds all of its cards side by side; a sideways swipe turns the wheel
      var pages = [], bi; for (bi = 0; bi < M.brk.length; bi += 3) pages.push(nlJustIn(M.brk.slice(bi, bi + 3)));
      // 3.183.0 (DJ: "News should have a live section showing the biggest games happening then"): what is on right now, first
      // on the page, from the app's own live scores (no wait for a write-up). Gone when nothing is live.
      var lv = nlLive(), lvEnd = null; if (lv.length) { nlWheelSec(wrap, "live", "Live Now", "", lv.map(nlLiveTile), "sm", "", "🔴"); lvEnd = wrap.lastChild; }
      nlWheelSec(wrap, "brk", NL_T.brk, "as it happens", pages, "", "", NL_E.brk);
      // 3.163.0 (DJ: "I want news to be more creative... The format doesn't always need to be the same. It should redo it
      // each time it rewrites"): Claude designs the page each write-up (doc.page): the day's theme on top, one or two
      // sections that exist only today, its own names for the standard sections, and the order they run in. The page
      // draws whatever it chose; anything it left out of the order follows in the usual order, so nothing is lost.
      var P = M.page || { titles: {}, order: [], specials: [] }, T = function (k) { return P.titles[k] || NL_T[k]; }, E = function (k) { return (P.emoji || {})[k] || NL_E[k]; };
      // 3.164.0 (DJ: "thanksgiving day should be like its own section card, and include a Claude paragraph, and the three
      // matchups listed, and stories related to those matchups within the section, then continue with other news beneath
      // it"): the day's feature is one card on top: the day, Claude's paragraph, its matchups, then the stories about them
      if (P.feature) {
        var F = P.feature, fc = el("section", "nf-ft"), fh = el("div", "nf-fth");
        fh.appendChild(el("span", null, fmtDate(todayInHome(), { weekday: "long", month: "long", day: "numeric" }))); // 3.166.0 (DJ: "Photo behind for thanksgiving, but not for others. Usually should be full images with no text over it, other
        // than for bigger events"): a big day (F.big, Claude's call) wears its photo behind the title; any other day's photo sits clear above it
        // 3.172.3 (DJ: "Don't understand the image chosen behind thanksgiving day"): it was the picture of the card's first
        // story, whatever that story was (a player's injury portrait). Now the photo has to be about the day itself: a
        // picture ESPN names for one of the featured games ("Bears vs. Lions"), or a story about the day by name
        // ("Thanksgiving"), or a story about both teams of a featured game. With none of those the card has no photo.
        // 3.178.1 (DJ, Black Friday: "Why were those photo options selected?"): the day's word alone ("friday") picked a TV-show
        // poll's photo. Now a photo leads only when its story is about a team in a featured game: ESPN names the team in the
        // photo (4 = both teams of one game, 2 = one), or tags the story with it (3 = both, 1 = one; stories tagged with more
        // than 4 teams are lists, not about anyone). The day's word only adds to a story that passes. Fantasy and betting
        // pieces never lead. Nothing passes = no photo.
        var fkey = (String(F.title).toLowerCase().match(/[a-z]{6,}/) || [""])[0], fwd = function (t) { return String(t || "").toLowerCase().split(" ").pop(); }, fbest = null, fsc = 0;
        var fesc = function (t) { return String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }, fin = function (txt, w) { return !!w && new RegExp("(^|[^a-z0-9])" + fesc(w) + "($|[^a-z0-9])").test(txt); };
        F.games.map(function (g) { return g.lg; }).filter(function (k, ki, ka) { return k && ka.indexOf(k) === ki; }).forEach(function (lg) { (M.per[lg] || []).forEach(function (a) {
          if (!a.img || a.kind === "Media" || /fantasy|betting|\bodds\b|\bDFS\b/i.test(a.title)) return;
          var nm = String(a.inm || "").toLowerCase(), tl = (a.title + " " + (a.events || []).join(" ")).toLowerCase(), tg = (a.teams || []).filter(function (t, ti, ta) { return ta.indexOf(t) === ti; }), sc = 0;
          if (tg.length > 4) tg = []; tg = tg.map(function (t) { return String(t).toLowerCase(); });
          var side = function (n) { n = String(n || "").toLowerCase(); if (!n) return 0; if (fin(nm, n) || fin(nm, fwd(n))) return 2; return tg.indexOf(n) !== -1 ? 1 : 0; };
          F.games.forEach(function (g) { var x = side(g.away), y = side(g.home); sc = Math.max(sc, x && y ? (x === 2 && y === 2 ? 4 : 3) : Math.max(x, y)); });
          if (sc && fkey && tl.indexOf(fkey) !== -1) sc += 3;
          if (sc > fsc) { fsc = sc; fbest = a; }
        }); });
        var fp = fbest, fi = fp ? nwImg(nwPic(fp.img, 800), "nf-ftp") : null; if (fi) { fh.classList.add(F.big === false ? "cl" : "ph"); fh.insertBefore(fi, fh.firstChild); }
        fh.appendChild(el("h2", null, (F.emoji ? F.emoji + " " : "") + F.title)); if (F.text) fh.appendChild(el("p", null, F.text)); fc.appendChild(fh);
        if (F.games.length) { fc.appendChild(el("h5", null, F.games.length === 1 ? "The matchup" : "The " + (["", "", "two", "three", "four", "five"][F.games.length] || "") + " matchups")); F.games.forEach(function (o) { fc.appendChild(nlGameCard(o, o.as != null && o.as !== "" ? "recap" : "preview")); }); }
        if (F.stories.length) { fc.appendChild(el("h5", null, "The stories")); var fl = el("div", "nf-fsl"); F.stories.forEach(function (x) { var a = nlLink(x, "nf-fs"); var si = x.img && !(fp && x.img === fp.img) ? nwImg(nwPic(x.img, 400), "nf-fsp") : null; if (si) a.appendChild(si); else if (x.t) a.appendChild(teamBadge(x.t)); var d = el("div"); d.appendChild(el("h4", null, x.title)); if (x.text) d.appendChild(el("p", null, x.text)); var sr = nlSrc(x); if (sr) d.appendChild(sr); a.appendChild(d); fl.appendChild(a); }); fc.appendChild(fl); }
        wrap.insertBefore(fc, lvEnd ? lvEnd.nextSibling : wrap.querySelector(".nl-h"));
      } else if (P.theme && P.theme.title) { var th = el("div", "nf-th"); th.appendChild(el("span", null, fmtDate(todayInHome(), { weekday: "long", month: "long", day: "numeric" }))); th.appendChild(el("h2", null, P.theme.title)); if (P.theme.text) th.appendChild(el("p", null, P.theme.text)); wrap.insertBefore(th, lvEnd ? lvEnd.nextSibling : wrap.querySelector(".nl-h")); }
      var special = function (sp) {
        if (!sp || !sp.items || !sp.items.length) return;
        if (sp.style === "games") { nlWheelSec(wrap, sp.id, sp.title, "", sp.items.map(function (o) { return nlGameCard(o, o.as != null && o.as !== "" ? "recap" : "preview"); }), "", sp.intro, sp.emoji); return; }
        if (sp.style === "numbers") { nlWheelSec(wrap, sp.id, sp.title, "", sp.items.filter(function (x) { return x.value; }).map(nlNumTile), "sm", sp.intro, sp.emoji); return; }
        wrap.appendChild(nlH(sp.title, "", sp.emoji)); if (sp.intro) wrap.appendChild(el("p", "nf-in", sp.intro));
        if (sp.style === "qa") { var qc = el("div", "nx-card nf-qa"); sp.items.forEach(function (x) { var r = el("div"); r.appendChild(el("h4", null, x.title)); r.appendChild(el("p", null, x.text)); qc.appendChild(r); }); wrap.appendChild(qc); return; }
        wrap.appendChild(nlFive(sp.items));
      };
      var sec = {
        lead: function () { if (M.lead) { if (M.has) wrap.appendChild(nlH(T("lead"), "Claude's top story", E("lead"))); wrap.appendChild(nlLead(M.lead, "bleed")); var ld = nlDeep(M.lead); if (ld) { var lc = el("div", "nx-card nf-ld"), lm = nlTeamMark(M.lead, "ln"); if (M.lead.c) lc.style.setProperty("--c", M.lead.c); if (lm) lc.appendChild(lm); lc.appendChild(ld); wrap.appendChild(lc); } } },
        stories: function () { nlWheelSec(wrap, "stories", T("stories"), "Claude's breakdowns", M.stories.map(nlStory), "", "", E("stories")); },
        next: function () { nlWheelSec(wrap, "next", T("next"), "Claude's previews", M.previews.map(function (o) { return nlGameCard(o, "preview"); }), "", "", E("next")); },
        recaps: function () { nlWheelSec(wrap, "recaps", T("recaps"), "Claude's recaps", M.recaps.map(function (o) { return nlGameCard(o, "recap"); }), "", "", E("recaps")); },
        nums: function () { nlWheelSec(wrap, "nums", T("nums"), "", M.nums.map(nlNumTile), "sm", "", E("nums")); },
        leagues: function () { nlWheelSec(wrap, "leagues", T("leagues"), "Claude's snapshots", M.leagues.map(function (x) { return nlLeagueCard(x, true, M); }), "", "", E("leagues")); },
        s1: function () { special(P.specials[0]); },
        s2: function () { special(P.specials[1]); }
      };
      var ord = P.order.filter(function (k) { return sec[k]; }); ["s1", "lead", "stories", "next", "recaps", "s2", "nums", "leagues"].forEach(function (k) { if (ord.indexOf(k) === -1) ord.push(k); });
      ord.forEach(function (k) { sec[k](); });
      headlines(M.items.filter(function (x) { return M.brk.indexOf(x) === -1 && !isNumX(x); }), !M.has);
    }
    nlChrome(); if (nlBarTabs() && typeof n3Draw === "function") n3Draw();   // the section button follows the page
    return true;
  }

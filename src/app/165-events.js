  // ---------- events: golf and F1 (3.116.0, DJ: "more sports") ----------
  // Sports without two teams. Each day's events come straight from ESPN's free scoreboards (no Supabase, no Claude):
  // golf = the PGA Tour and LPGA leaderboards, F1 = the race weekend (practice, qualifying, race) with each session's
  // finishing order. All games gets a tab per sport and a section on ALL; the slate shows golf on tournament days and
  // F1 on qualifying and race days. Only what ESPN gives is shown: position, name, flag, score to par, holes played.
  var EV_SPORTS = {
    golf: { tag: "GOLF", name: "Golf", feeds: [["golf/pga", "PGA Tour"], ["golf/lpga", "LPGA"]] },
    f1: { tag: "F1", name: "Formula 1", feeds: [["racing/f1", "Formula 1"]] }
  };
  var EV_ORDER = ["golf", "f1"];
  var EV = {}, EV_OPEN = {}, evPollT = null;
  var evEtFmt = null, evHomeFmt = null;
  function evDay(iso, tz) {  // "2026-11-19" for a time, in that time zone
    var f = tz === "et" ? (evEtFmt = evEtFmt || new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }))
      : (evHomeFmt = evHomeFmt || new Intl.DateTimeFormat("en-CA", { timeZone: HOME_TZ, year: "numeric", month: "2-digit", day: "2-digit" }));
    var d = new Date(iso); return isNaN(d) ? "" : f.format(d);
  }
  function evToPar(s) { s = String(s == null ? "" : s).trim(); if (s === "E") return 0; var n = parseInt(s, 10); return isNaN(n) ? null : n; }
  function evParText(n) { return n == null ? "" : n === 0 ? "E" : n > 0 ? "+" + n : String(n); }
  function evKind(st) { var s = ((st || {}).type || {}).state; return s === "in" ? "live" : s === "post" ? "over" : "upcoming"; }
  function evNets(c) { var out = []; ((c || {}).broadcasts || []).forEach(function (b) { (b.names || []).forEach(function (n) { if (out.indexOf(n) === -1) out.push(n); }); }); return out; }
  function evFlag(a) { var f = (a || {}).flag || {}; return { src: f.href || "", alt: f.alt || "" }; }

  // golf: one leaderboard per tour. Position is ESPN's order (ties when the totals match); the total is the sum of
  // the rounds ESPN has scored, and "thru" counts the holes it lists for the round being played.
  function evGolf(e, tour, day) {
    var c = (e.competitions || [])[0] || {}, st = c.status || e.status || {}, kind = evKind(e.status || st);
    var start = evDay(e.date, "et"), end = evDay(e.endDate || e.date, "et");
    if (day < start || day > end) return null;
    var period = st.period || 0, rows = [];
    (c.competitors || []).slice().sort(function (a, b) { return (a.order || 999) - (b.order || 999); }).forEach(function (x) {
      var ls = x.linescores || [], tot = null, any = false;
      ls.forEach(function (r) { var v = evToPar(r.displayValue); if (v != null) { tot = (tot || 0) + v; any = true; } });
      if (!any) tot = evToPar(x.score);
      var cur = period ? ls[period - 1] : null, holes = cur && cur.linescores ? cur.linescores.length : 0;
      var thru = kind === "live" && holes ? (holes >= 18 ? "F" : "Thru " + holes) : "";
      rows.push({ id: x.id, name: (x.athlete || {}).displayName || "", short: (x.athlete || {}).shortName || "", flag: evFlag(x.athlete), tot: tot, thru: thru });
    });
    var scored = rows.filter(function (r) { return r.tot != null; });
    scored.forEach(function (r, i) {
      var same = scored.filter(function (o) { return o.tot === r.tot; }).length > 1, first = scored.findIndex(function (o) { return o.tot === r.tot; });
      r.pos = (same ? "T" : "") + (first + 1); r.val = evParText(r.tot);
    });
    var detail = (st.type || {}).shortDetail || (st.type || {}).detail || "";
    if (kind === "upcoming") detail = "Starts " + fmtDate(start, { weekday: "short", month: "short", day: "numeric" });
    var link = ((e.links || [])[0] || {}).href || "";
    return { id: "ev-golf-" + e.id, sport: "golf", tour: tour, name: e.name || "", kind: kind, detail: detail.replace(/ - /g, " · "),
      start: e.date, nets: evNets(c), link: link, rows: scored, round: period, field: rows.length };
  }

  // F1: the race weekend. A day shows the event when one of its sessions is that day (your time). The card lists
  // the weekend's sessions; once one has finished, ESPN's finishing order for the latest is the leaderboard.
  var F1_NAMES = { FP1: "Practice 1", FP2: "Practice 2", FP3: "Practice 3", Qual: "Qualifying", Race: "Race", SS: "Sprint qualifying", Sprint: "Sprint", SQ: "Sprint qualifying" };
  function evF1(e, tour, day) {
    var ss = (e.competitions || []).map(function (c) {
      var ab = (c.type || {}).abbreviation || (c.type || {}).text || "";
      return { ab: ab, name: F1_NAMES[ab] || (c.type || {}).text || ab, start: c.date, day: evDay(c.date), kind: evKind(c.status), nets: evNets(c),
        rows: (c.competitors || []).slice().sort(function (a, b) { return (a.order || 999) - (b.order || 999); }).map(function (x) {
          return { id: x.id, name: (x.athlete || {}).displayName || "", short: (x.athlete || {}).shortName || "", flag: evFlag(x.athlete), pos: String(x.order || ""), win: !!x.winner };
        }) };
    });
    var today = ss.filter(function (s) { return s.day === day; });
    if (!today.length && !ss.some(function (s) { return s.kind === "live"; })) return null;
    var live = ss.filter(function (s) { return s.kind === "live"; })[0];
    var done = ss.filter(function (s) { return s.kind === "over" && s.rows.length; }), last = done[done.length - 1];
    var shown = live && live.rows.length ? live : last;
    var race = ss.filter(function (s) { return s.ab === "Race"; })[0];
    var kind = live ? "live" : race && race.kind === "over" ? "over" : "upcoming";
    var next = ss.filter(function (s) { return s.kind === "upcoming"; })[0];
    var detail = live ? live.name + " · Live" : kind === "over" ? "Final" : next ? next.name + " " + (next.day === day ? timeText(next.start) : fmtDate(next.day, { weekday: "short" }) + " " + timeText(next.start)) : "";
    return { id: "ev-f1-" + e.id, sport: "f1", tour: tour, name: e.name || "", kind: kind, detail: detail, start: (today[0] || ss[0] || {}).start || e.date,
      nets: evNets((e.competitions || [])[0]), link: ((e.links || [])[0] || {}).href || "", rows: shown ? shown.rows : [], rowsOf: shown ? shown.name : "",
      sessions: ss, day: day, venue: ((e.circuit || {}).fullName) || "", slate: today.some(function (s) { return s.ab === "Race" || s.ab === "Qual" || s.ab === "Sprint"; }) || !!(live && /Race|Qual|Sprint/.test(live.ab)) };
  }

  // fetch a day's events (shared by every page asking at once); live days refresh every minute, others every 15
  function evNeed(day) {
    var e = EV[day], now = Date.now();
    if (e && (e.busy || now - e.at < (e.live ? 55000 : 15 * 60000))) return;
    EV[day] = { at: e ? e.at : 0, busy: true, list: e ? e.list : [], live: e ? e.live : false };
    var ymd = day.replace(/-/g, ""), jobs = [];
    EV_ORDER.forEach(function (sp) {
      EV_SPORTS[sp].feeds.forEach(function (f) {
        jobs.push(fetch("https://site.api.espn.com/apis/site/v2/sports/" + f[0] + "/scoreboard?dates=" + ymd, { cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
          .then(function (d) { return ((d && d.events) || []).map(function (ev) { try { return sp === "golf" ? evGolf(ev, f[1], day) : evF1(ev, f[1], day); } catch (x) { return null; } }).filter(Boolean); }));
      });
    });
    Promise.all(jobs).then(function (rs) {
      var list = [].concat.apply([], rs), old = JSON.stringify(EV[day].list);
      EV[day] = { at: Date.now(), busy: false, list: list, live: list.some(function (x) { return x.kind === "live"; }) };
      if (JSON.stringify(list) !== old) { if (typeof liveRender === "function") liveRender(); else render(); }
      evSchedule();
    });
  }
  function evSchedule() {
    clearTimeout(evPollT);
    var d = EV[todayInHome()];
    if (!d || !d.live) return;
    evPollT = setTimeout(function () { if (!document.hidden && (state.view === "games" || state.view === "lineup" || isDuo)) evNeed(todayInHome()); else evSchedule(); }, 60000);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && state.date) evNeed(state.date); });
  function evList(day, sp) { evNeed(day); return ((EV[day] || {}).list || []).filter(function (x) { return !sp || x.sport === sp; }); }

  // ---------- the card ----------
  function evRowsFor(x, open) { var n = open ? 10 : x.sport === "golf" ? 5 : 3; return x.rows.slice(0, n); }
  function evCard(x, where) {
    var open = !!EV_OPEN[x.id], card = el("div", "ev-card panel" + (x.kind === "over" && state.date >= todayInHome() ? " over" : ""));
    var top = el("div", "ev-top");
    var lg = el("span", "g-lg ev-lg"); lg.appendChild(el("span", "nt", x.tour)); top.appendChild(lg);
    var bug = el("span", "bug" + (x.kind === "live" ? " live" : ""), x.kind === "live" ? (x.sport === "golf" ? (x.round ? "Round " + x.round : "Live") : "Live") : x.kind === "over" ? "Final" : x.sport === "golf" ? "Upcoming" : timeText(x.start));
    top.appendChild(bug);
    card.appendChild(top);
    card.appendChild(el("div", "ev-name", x.name));
    // the tag already says the round (golf) or the next session's time (F1), so the line under the name doesn't repeat it
    var sub = x.sport === "f1" ? x.venue : x.kind === "upcoming" ? x.detail : String(x.detail || "").replace(/^Round \d+ · /, "").replace(/^\w/, function (c) { return c.toUpperCase(); }).replace(/ (\w)/g, function (m, c) { return " " + c.toLowerCase(); });
    if (sub) card.appendChild(el("div", "ev-sub", sub));
    if (x.sport === "f1") {
      var sl = el("div", "ev-sess");
      x.sessions.forEach(function (s) {
        var r = el("div", "ev-s" + (s.day === x.day ? " on" : "") + (s.kind === "live" ? " live" : ""));
        r.appendChild(el("span", "ev-s-n", s.name));
        r.appendChild(el("span", "ev-s-t", s.kind === "live" ? "Live" : s.kind === "over" ? "Done" : (s.day === x.day ? "" : fmtDate(s.day, { weekday: "short" }) + " ") + timeText(s.start)));
        sl.appendChild(r);
      });
      card.appendChild(sl);
      if (x.rows.length) card.appendChild(el("div", "ev-of", x.rowsOf + (x.kind === "live" ? ", running order" : "")));
    }
    if (x.rows.length) {
      var tb = el("ol", "ev-board");
      evRowsFor(x, open).forEach(function (r) {
        var li = el("li", "ev-r" + (r.win ? " win" : ""));
        li.appendChild(el("span", "ev-pos", r.pos || ""));
        var nm = el("span", "ev-nm");
        if (r.flag.src) { var im = el("img", "ev-flag"); im.src = r.flag.src; im.alt = r.flag.alt; im.loading = "lazy"; im.width = 18; im.height = 12; nm.appendChild(im); }
        nm.appendChild(el("span", "ev-pn", r.name));
        li.appendChild(nm);
        if (x.sport === "golf") {
          li.appendChild(el("span", "ev-thru", r.thru || ""));
          li.appendChild(el("span", "ev-val" + (r.tot < 0 ? " under" : ""), r.val || ""));
        }
        tb.appendChild(li);
      });
      card.appendChild(tb);
    } else if (x.sport === "golf" && x.kind === "upcoming") card.appendChild(el("div", "ev-none", "The leaderboard starts with the first round."));
    var foot = el("div", "ev-foot");
    if (x.rows.length > evRowsFor(x, false).length) {
      var more = el("button", "ev-more", open ? "Show fewer" : "Show top 10"); more.type = "button";
      more.setAttribute("aria-expanded", open ? "true" : "false");
      more.addEventListener("click", function () { EV_OPEN[x.id] = !open; if (where === "games") keepScroll(renderGames); else keepScroll(renderLineup); });
      foot.appendChild(more);
    } else foot.appendChild(el("span"));
    var nets = el("span", "nets ev-nets");
    x.nets.slice(0, 2).forEach(function (n) { var a = watchLink(n, "net", n); nets.appendChild(a || el("span", "net", n)); });
    foot.appendChild(nets);
    card.appendChild(foot);
    return card;
  }

  // ---------- All games ----------
  // a section per sport (folds on ALL like a league; remembered with the leagues' fold state)
  function evGamesSections(body, sp) {
    var day = state.date, sports = sp ? [sp] : EV_ORDER, n = 0;
    sports.forEach(function (k) {
      var list = evList(day, k);
      if (state.gamesLive && day === todayInHome()) list = list.filter(function (x) { return x.kind === "live"; });
      if (state.q) { var q = state.q.trim().toLowerCase(); list = list.filter(function (x) { return [x.name, x.tour, EV_SPORTS[k].name].concat(x.rows.map(function (r) { return r.name; })).join(" ").toLowerCase().indexOf(q) !== -1; }); }
      if (!list.length) return;
      n += list.length;
      var title = EV_SPORTS[k].name, many = !sp;
      var shut = many && !!(title in COLLAPSED ? COLLAPSED[title] : state.league === "all" ? 1 : 0);
      var sec = el(many ? "button" : "div", "sec ev-sec" + (many ? " sec-tg" : "") + (shut ? " shut" : ""));
      if (many) { sec.type = "button"; sec.setAttribute("aria-expanded", shut ? "false" : "true"); }
      sec.appendChild(el("h2", null, title));
      var nLive = list.filter(function (x) { return x.kind === "live"; }).length;
      if (nLive) { var lv = el("span", "ch-live sec-live"); lv.appendChild(el("i")); lv.appendChild(document.createTextNode("Live")); sec.appendChild(lv); }
      sec.appendChild(el("span", "count", list.length + (list.length === 1 ? " event" : " events")));
      if (many) sec.appendChild(icon("more"));
      body.appendChild(sec);
      var box = el("div", "glist ev-list");
      if (!shut) list.forEach(function (x) { box.appendChild(evCard(x, "games")); });
      body.appendChild(box);
      if (many) sec.addEventListener("click", function () {
        COLLAPSED[title] = shut ? 0 : 1;
        try { localStorage.setItem("slate-collapsed", JSON.stringify(COLLAPSED)); } catch (e) {}
        keepScroll(renderGames);
      });
    });
    return n;
  }
  // the All games tabs for sports with an event that day (after the leagues)
  function evTabs(day) { return EV_ORDER.filter(function (k) { return evList(day, k).length; }).map(function (k) { return [k, EV_SPORTS[k].tag]; }); }

  // ---------- the slate ----------
  // golf on tournament days, F1 on qualifying and race days; one folding section per sport, under the games
  function evSlateBlock() {
    var day = state.date, out = el("div", "ev-slate"), n = 0;
    EV_ORDER.forEach(function (k) {
      var list = evList(day, k).filter(function (x) { return k !== "f1" || x.slate; });
      if (liveOnly() && day === todayInHome()) list = list.filter(function (x) { return x.kind === "live"; });
      if (!list.length) return;
      n++;
      var fk = "ev-" + k, shut = !!(state.slateFold || {})[fk], sec = el("section", "sl-sec" + (shut ? " shut" : ""));
      var hb = el("button", "sl-h"); hb.type = "button"; hb.setAttribute("aria-expanded", shut ? "false" : "true");
      hb.appendChild(el("b", null, EV_SPORTS[k].name));
      var nLv = list.filter(function (x) { return x.kind === "live"; }).length;
      if (nLv) { var lv = el("span", "sl-live"); lv.appendChild(el("i")); lv.appendChild(document.createTextNode("Live")); hb.appendChild(lv); }
      hb.appendChild(el("span", "count", String(list.length))); hb.appendChild(icon("more"));
      hb.addEventListener("click", function () { var f = Object.assign({}, state.slateFold || {}); if (f[fk]) delete f[fk]; else f[fk] = 1; state.slateFold = f; saveSettings(); keepScroll(renderLineup); });
      sec.appendChild(hb);
      if (!shut) { var gl = el("div", "tg-games ev-list"); list.forEach(function (x) { gl.appendChild(evCard(x, "lineup")); }); sec.appendChild(gl); }
      out.appendChild(sec);
    });
    return n ? out : null;
  }

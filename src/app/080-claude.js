  // ---------- Claude on demand: one tap starts a summary in the background (Cloudflare → Claude → Supabase) ----------
  var CL_ASK = {};   // just-tapped requests, until the saved "writing" marker shows up
  // links from outside data (Claude's headlines, newsletter feeds) open only as http(s) pages
  function safeUrl(u) { u = String(u || ""); return /^https?:\/\//i.test(u) ? u : "#"; }
  function slatePass() { try { return localStorage.getItem("slate-pass") || ""; } catch (e) { return ""; } }
  var CL_SEEN = {};
  function clWriting(doc, k) {
    var w = doc && doc.writing, mine = CL_ASK[k];
    // the server marks the item while it writes and clears the mark when the summary is saved:
    // once the mark has come and gone (or the saved summary is newer than the tap), it's done
    if (w && !w.error && mine) CL_SEEN[k] = true;
    if (mine && !w) {
      var saved = Date.parse((doc && (doc.at || doc.updatedAt || (doc.recap || {}).at)) || 0) || 0;
      if (CL_SEEN[k] || saved > mine - 5000) { delete CL_ASK[k]; delete CL_SEEN[k]; mine = 0; }
    }
    if (w && w.error && !(mine && mine > Date.parse(w.at || 0))) return { error: w.error };
    var at = Math.max(w && !w.error ? Date.parse(w.at) || 0 : 0, mine || 0);
    return at && Date.now() - at < 6 * 60000 ? { busy: true } : null;
  }
  function trimEspn(sum, g, kind) {
    var f = {}, hd = sum.header || {}, cp = (hd.competitions || [])[0] || {};
    try {
      var gi = sum.gameInfo || {}; if (gi.venue) f.venue = (gi.venue.fullName || "") + ((gi.venue.address || {}).city ? ", " + gi.venue.address.city : "");
      f.teams = (cp.competitors || []).map(function (c) { return { side: c.homeAway, name: (c.team || {}).displayName, abbr: (c.team || {}).abbreviation, record: ((c.record || [])[0] || {}).summary, score: c.score, winner: c.winner }; });
      f.status = ((cp.status || {}).type || {}).detail;
      f.injuries = (sum.injuries || []).map(function (t) { return { team: (t.team || {}).abbreviation, out: (t.injuries || []).slice(0, 8).map(function (i) { return ((i.athlete || {}).displayName || "") + " (" + (i.status || "") + ")"; }) }; });
      f.leaders = (sum.leaders || []).map(function (t) { return { team: (t.team || {}).abbreviation, cats: (t.leaders || []).slice(0, 4).map(function (c) { var l = (c.leaders || [])[0] || {}; return (c.displayName || c.name) + ": " + ((l.athlete || {}).displayName || "") + " " + (l.displayValue || ""); }) }; });
      f.last5 = (sum.lastFiveGames || []).map(function (t) { return { team: (t.team || {}).abbreviation, games: (t.events || []).map(function (e) { return (e.gameResult || "") + " " + (e.atVs || "") + " " + ((e.opponent || {}).abbreviation || "") + " " + (e.score || ""); }) }; });
      if ((sum.seasonseries || [])[0]) f.series = sum.seasonseries[0].summary || sum.seasonseries[0].description;
      if (kind === "recap") {
        f.lines = (cp.competitors || []).map(function (c) { return { team: (c.team || {}).abbreviation, by: (c.linescores || []).map(function (l) { return l.displayValue || l.value; }) }; });
        f.teamStats = ((sum.boxscore || {}).teams || []).map(function (t) { return { team: (t.team || {}).abbreviation, stats: (t.statistics || []).slice(0, 14).map(function (x) { return (x.label || x.name) + " " + x.displayValue; }) }; });
        var qr = quickRecap(g); if (qr) f.quick = qr.text;
        if ((sum.article || {}).headline) f.espnArticle = sum.article.headline + ". " + String(sum.article.description || "").slice(0, 300);
      }
    } catch (e) {}
    return f;
  }
  function clGame(g) { var o = {}; ["league", "away", "home", "awayShort", "homeShort", "awayAbbr", "homeAbbr", "awayRank", "homeRank", "awayRecord", "homeRecord", "awayStanding", "homeStanding", "awayConf", "homeConf", "tv", "start", "note", "neutral", "comp", "stage"].forEach(function (k) { if (g[k] != null && g[k] !== "") o[k] = g[k]; }); o.leagueName = info(g).name; return o; }
  function claudeAsk(kind, g, team) {
    var pass = slatePass(); if (!pass) { toast("Enter your passcode first (bottom of the page)"); return; }
    var k = kind === "team" ? "t:" + team.key : "g:" + state.date + ":" + g.id; CL_ASK[k] = Date.now(); keepScroll(render);
    var factsP = kind === "team" ? Promise.resolve(team.facts)
      : (bxBase(g.league) ? bxFindEvent(g).then(function (ev) { return ev ? rkFetch(bxSummaryUrl(g.league, ev)) : null; }).then(function (sum) { return sum ? trimEspn(sum, g, kind) : {}; }, function () { return {}; }) : Promise.resolve({}));
    factsP.then(function (facts) {
      var body = { pass: pass, kind: kind, facts: facts };
      if (kind === "team") body.key = team.key; else { body.date = state.date; body.id = g.id; body.game = clGame(g); }
      return fetch("/api/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (j) { return [r.status, j]; }, function () { return [r.status, {}]; }); });
    }).then(function (res) {
      if (res[0] >= 300) { delete CL_ASK[k]; keepScroll(render); toast((res[1] && res[1].error) || "Couldn't start Claude. Try again."); return; }
      // someone (you or another account) had it written moments ago: that one is shared, so it's already here
      if (res[1] && res[1].done) { delete CL_ASK[k]; state.clConfirm = null; keepScroll(render); toast("Claude wrote this a moment ago, so here it is"); }
    }, function () { delete CL_ASK[k]; keepScroll(render); toast("Couldn't reach Slate's server. Try again."); });
  }
  // a plain-words reason when a summary didn't finish (the raw error stays in the database)
  function clErr(e) { e = String(e || ""); return /credit balance/i.test(e) ? "Claude is out of API credits. Add credits in the Anthropic Console, then try again." : /limit of/i.test(e) ? e : "Last try didn't finish. Tap to try again."; }
  // the one control: Write … / Claude is writing… / Regenerate (asks first)
  function claudeCtl(kind, doc, has, ask, label) {
    var k = kind, box = el("div", "cl-ctl"), w = clWriting(doc, ask.k);
    if (w && w.busy) { var sp = el("span", "cl-busy"); sp.appendChild(el("i", "cl-dot")); sp.appendChild(el("span", null, "Claude is writing this… usually under a minute")); box.appendChild(sp); return box; }
    if (w && w.error) box.appendChild(el("p", "pv-none cl-err", clErr(w.error)));
    if (!has) { var b = el("button", "cl-go"); b.type = "button"; b.appendChild(icon("sparkle")); b.appendChild(el("span", "cl-l", label)); b.appendChild(el("span", "cl-t", "about a minute")); b.addEventListener("click", function (e) { e.stopPropagation(); ask.go(); }); box.appendChild(b); return box; }
    var confirmOpen = state.clConfirm === ask.k;
    if (!confirmOpen) { var rg = el("button", "rlink cl-re", "Regenerate · Claude"); rg.type = "button"; rg.addEventListener("click", function (e) { e.stopPropagation(); state.clConfirm = ask.k; keepScroll(render); }); box.appendChild(rg); return box; }
    var cf = el("div", "cl-confirm"); cf.appendChild(el("span", null, "Rewrite this summary?"));
    var y = el("button", "cl-yes", "Yes"); y.type = "button"; y.addEventListener("click", function (e) { e.stopPropagation(); state.clConfirm = null; ask.go(); });
    var n = el("button", "cl-no", "No"); n.type = "button"; n.addEventListener("click", function (e) { e.stopPropagation(); state.clConfirm = null; keepScroll(render); });
    cf.appendChild(y); cf.appendChild(n); box.appendChild(cf); return box;
  }
  function gameClaudeCtl(g) {
    if (g.custom || isPastDay() && status(g).kind !== "over") return null;
    var pv = (state.previews || {})[g.id], over = status(g).kind === "over", kind = over ? "recap" : "preview";
    var has = over ? !!(pv && pv.recap && pv.recap.text) : !!(pv && pv.summary);
    return claudeCtl(kind, pv, has, { k: "g:" + state.date + ":" + g.id, go: function () { claudeAsk(kind, g); } }, over ? "Write Claude's recap" : "Write Claude's preview");
  }
  function previewBlock(g, inTray) {
    var pv = (state.previews || {})[g.id], box = el("div", "pv");
    if (!pv || !(pv.summary || (pv.recap && pv.recap.text)) || (status(g).kind === "over" && !recapOf(pv))) {

      var ctl = gameClaudeCtl(g); if (ctl) box.appendChild(ctl);
      return box;
    }
    var o = inTray ? (pv.odds || {}) : {};
    if (o.spread || o.total || (o.ml && (o.ml.away != null || o.ml.home != null))) {
      var od = el("div", "pv-odds");
      if (o.spread) od.appendChild(el("span", null, o.spread));
      if (o.total) od.appendChild(el("span", null, "O/U " + o.total));
      if (o.ml && o.ml.away != null && o.ml.home != null) od.appendChild(el("span", null, mlText(g, o)));
      if (o.provider) od.appendChild(el("i", null, o.provider));
      box.appendChild(od);
    }
    var rc = recapOf(pv), rcOpen = rc && recapShown(g);
    if (rc) {
      if (rcOpen) {
        var rb = el("div", "pv-recap"); rb.appendChild(el("b", "pv-h", rc.quick ? "Box score recap" : "Recap")); rb.appendChild(readNode(rc.text, rc.bullets, "pv-sum", rc.quick));

        box.appendChild(rb);
      } else box.appendChild(recapGate(g));
    } else if (pv.summary) {
      var hr0 = el("div", "gv-hrow pv-hrow"); hr0.appendChild(el("b", "pv-h", "The quick read")); box.appendChild(hr0);
      box.appendChild(readNode(pv.summary, pv.bullets, "pv-sum"));

    }
    var stars = rcOpen && Array.isArray(rc.stars) ? rc.stars.filter(function (w) { return w && w.name; }).slice(0, 4) : [];
    var wl = stars.length ? stars : Array.isArray(pv.watch) ? pv.watch.filter(function (w) { return w && w.name; }).slice(0, 4) : [];
    if (wl.length) {
      var wb = el("div", "pv-watch"); wb.appendChild(el("b", "pv-h", stars.length ? "Top performers" : "Players to watch"));
      wl.forEach(function (w) {
        var r = el("div", "pw");
        var nm = el("span", "pw-n", w.name); r.appendChild(nm);
        if (w.team) r.appendChild(el("span", "pw-t", w.team));
        if (w.line) r.appendChild(el("span", "pw-l", w.line));
        if (w.note) r.appendChild(el("span", "pw-note", w.note));
        wb.appendChild(r);
      });
      box.appendChild(wb);
    }
    if (pv.injuries) { var inj = el("p", "pv-inj"); inj.appendChild(el("b", null, "Injuries ")); inj.appendChild(document.createTextNode(pv.injuries)); box.appendChild(inj); }
    var hl = Array.isArray(pv.headlines) ? pv.headlines.filter(function (h) { return h && h.title && /^https:\/\/(www\.)?(nytimes\.com\/athletic|theathletic\.com)/.test(h.url || ""); }).slice(0, 4) : [];
    if (hl.length) {
      var ul = el("ul", "pv-hl");
      hl.forEach(function (h) {
        var li = el("li"), a = el("a", null, h.title); a.href = safeUrl(h.url); a.target = "_blank"; a.rel = "noopener";
        a.addEventListener("click", function (e) { e.stopPropagation(); });
        li.appendChild(a); if (h.source) li.appendChild(el("span", null, h.source)); ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    var by = byLine(pv); if (by) box.appendChild(el("p", "pv-at", by));
    var cl = gameClaudeCtl(g); if (cl) box.appendChild(cl);
    return box;
  }
  function gvCard(title, cls) { var c = el("section", "gv-card" + (cls ? " " + cls : "")); if (title) c.appendChild(el("h3", "gv-h", title)); return c; }
  function formDots(str) {
    var w = el("span", "form");
    String(str || "").split("").slice(-5).forEach(function (ch) { w.appendChild(el("i", ch === "W" ? "fw" : ch === "L" ? "fl" : "fd", ch)); });
    return w;
  }

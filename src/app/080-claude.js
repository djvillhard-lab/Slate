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
  // ESPN's "last five games" for one team, this season only, oldest first (3.91.3). Early in a season ESPN fills the list
  // with last season's final games (Central Michigan's March loss at Ball State on a 4-0 team), and Claude read them as
  // recent results. Anything before the off-season gap (60+ days between games), or 60+ days old, is dropped.
  function l5Season(evs, now) {
    var t = Date.parse(now) || Date.now(), out = (evs || []).slice().sort(function (x, y) { return (Date.parse(x.gameDate) || 0) - (Date.parse(y.gameDate) || 0); });
    for (var i = out.length - 1; i > 0; i--) if ((Date.parse(out[i].gameDate) || 0) - (Date.parse(out[i - 1].gameDate) || 0) > 60 * 864e5) { out = out.slice(i); break; }
    return out.filter(function (e) { var d = Date.parse(e.gameDate); return !d || t - d < 60 * 864e5; });
  }
  function trimEspn(sum, g, kind) {
    var f = {}, hd = sum.header || {}, cp = (hd.competitions || [])[0] || {};
    try {
      var gi = sum.gameInfo || {}; if (gi.venue) f.venue = (gi.venue.fullName || "") + ((gi.venue.address || {}).city ? ", " + gi.venue.address.city : "");
      f.teams = (cp.competitors || []).map(function (c) { return { side: c.homeAway, name: (c.team || {}).displayName, abbr: (c.team || {}).abbreviation, record: ((c.record || [])[0] || {}).summary, score: c.score, winner: c.winner }; });
      f.status = ((cp.status || {}).type || {}).detail;
      f.injuries = (sum.injuries || []).map(function (t) { return { team: (t.team || {}).abbreviation, out: (t.injuries || []).slice(0, 8).map(function (i) { return ((i.athlete || {}).displayName || "") + " (" + (i.status || "") + ")"; }) }; });
      f.leaders = (sum.leaders || []).map(function (t) { return { team: (t.team || {}).abbreviation, cats: (t.leaders || []).slice(0, 4).map(function (c) { var l = (c.leaders || [])[0] || {}; return (c.displayName || c.name) + ": " + ((l.athlete || {}).displayName || "") + " " + (l.displayValue || ""); }) }; });
      // this season's results only, newest first, each with its date, so "last game" is the right one (3.91.3)
      var gd = (cp.date || (g && g.start) || "");
      f.last5 = (sum.lastFiveGames || []).map(function (t) { return { team: (t.team || {}).abbreviation, newestFirst: l5Season(t.events, gd).reverse().map(function (e) { var d = new Date(e.gameDate); return (isNaN(d) ? "" : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()] + " " + d.getUTCDate() + ": ") + (e.gameResult || "") + " " + (e.atVs || "") + " " + ((e.opponent || {}).abbreviation || "") + " " + (e.score || ""); }) }; });
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
  function clGame(g) { var o = {}; ["league", "away", "home", "awayShort", "homeShort", "awayAbbr", "homeAbbr", "awayRank", "homeRank", "awayRecord", "homeRecord", "awayStanding", "homeStanding", "awayConf", "homeConf", "tv", "start", "note", "neutral", "comp", "stage", "post"].forEach(function (k) { if (g[k] != null && g[k] !== "") o[k] = g[k]; }); o.leagueName = info(g).name; return o; }
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
  // ---- Players to watch: every player shows a real season stat line from ESPN (3.66.6) ----
  // Claude picks the players and says why; the numbers come from ESPN's season stats for the team, chosen by what
  // Claude says to watch (3P% for a shooter, rebounds for a big). Never a role like "Boston guard" in place of numbers.
  var PW = { team: {}, busy: {}, line: {}, redraw: 0 };
  function pwKey(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "").replace(/[^a-z]/g, ""); }
  function pwNum(v) { var n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isNaN(n) ? 0 : n; }
  // the game's two ESPN team ids by abbreviation, from its box or that day's scoreboard
  function pwTeams(g) {
    var out = {}, b = boxFor(g);
    if (b) b.teams.forEach(function (t) { if (t.id) out[String(t.abbr || "").toUpperCase()] = t.id; });
    if (Object.keys(out).length === 2) return Promise.resolve(out);
    return bxFindEvent(g).then(function (ev) {
      if (!ev) return out;
      Object.keys(bx.sb).forEach(function (k) { ((bx.sb[k] || {}).events || []).forEach(function (e) { if (String(e.id) !== String(ev)) return; (((e.competitions || [])[0] || {}).competitors || []).forEach(function (c) { var t = c.team || {}; if (t.id) out[String(t.abbreviation || "").toUpperCase()] = String(t.id); }); }); });
      return out;
    });
  }
  // one team's season stats → {name key: {groups, stats}}; cached for the session
  function pwSeason(lg, id) {
    var k = lg + "|" + id;
    return PW.team[k] || (PW.team[k] = seasonFetch(lg, id).then(function (S) {
      var by = {};
      ((S && S.results) || []).forEach(function (r) {
        (r.leaders || []).forEach(function (L) {
          var a = L.athlete || {}, nk = pwKey(a.displayName || a.shortName); if (!nk) return;
          var p = by[nk] || (by[nk] = { grp: {}, s: {}, last: pwKey(a.lastName || String(a.displayName || "").split(" ").slice(-1)[0]) });
          p.grp[r.name] = 1;
          (L.statistics || []).forEach(function (c) { (c.stats || []).forEach(function (x) { if (!(x.name in p.s)) p.s[x.name] = x.displayValue; p.s[(c.name || "") + "." + x.name] = x.displayValue; }); });
        });
      });
      return by;
    }, function () { return {}; }));
  }
  // the stat line: the numbers that match what the player is being watched for, at most three
  function pwLine(lg, p, hint) {
    var s = p.s, v = function (n) { return pwNum(s[n]); }, d = function (n) { return String(s[n]); }, has = function (n) { return s[n] != null && s[n] !== ""; };
    var sp = BX_SPORT[lg], h = String(hint || "").toLowerCase(), out = [], add = function (t) { if (t && out.indexOf(t) < 0 && out.length < 3) out.push(t); };
    if (sp === "bball") {
      var want = { three: /\bthree|\b3p|3-point|\b3pt|\bfrom 3\b|\bdeep\b|shoot|sniper|\btriples\b|\barc\b/.test(h), reb: /\breb|glass|board|\bpaint\b/.test(h), ast: /\bast\b|assist|playmak|creat|facilitat|distribut|\bpass/.test(h), blk: /block|\brim\b|protect/.test(h), stl: /steal|takeaway/.test(h), fg: /fg%|efficien|field goal/.test(h) };
      if (has("avgPoints")) add(d("avgPoints") + " pts");
      if (want.three && has("threePointFieldGoalPct")) add(d("threePointFieldGoalPct") + "% 3P");
      if (want.reb && has("avgRebounds")) add(d("avgRebounds") + " reb");
      if (want.ast && has("avgAssists")) add(d("avgAssists") + " ast");
      if (want.blk && has("avgBlocks")) add(d("avgBlocks") + " blk");
      if (want.stl && has("avgSteals")) add(d("avgSteals") + " stl");
      if (want.fg && has("fieldGoalPct")) add(d("fieldGoalPct") + "% FG");
      if (out.length < 2) {
        var big = [["avgRebounds", " reb"], ["avgAssists", " ast"]].filter(function (x) { return v(x[0]) >= 5; }).sort(function (a, b) { return v(b[0]) - v(a[0]); });
        big.forEach(function (x) { add(d(x[0]) + x[1]); });
        if (out.length < 2 && v("avgThreePointFieldGoalsAttempted") >= 4 && has("threePointFieldGoalPct")) add(d("threePointFieldGoalPct") + "% 3P");
        if (out.length < 2 && v("avgBlocks") >= 1.5) add(d("avgBlocks") + " blk");
      }
    } else if (sp === "hockey") {
      if (p.grp.goalkeeping) { if (has("savePct")) add(d("savePct") + " SV%"); if (has("avgGoalsAgainst")) add(d("avgGoalsAgainst") + " GAA"); if (has("wins")) add(d("wins") + " W"); }
      else { add(d("goals") + " G"); add(d("assists") + " A"); if (/power play|pp/.test(h) && has("powerPlayGoals")) add(d("powerPlayGoals") + " PPG"); else if (has("points")) add(d("points") + " PTS"); }
    } else if (sp === "football") {
      var pass = v("netPassingYards") || v("passingYards"), rush = v("rushingYards"), rec = v("receivingYards");
      if (p.grp.passing && pass >= Math.max(rush, rec)) { add(d(has("netPassingYards") ? "netPassingYards" : "passingYards") + " pass yds"); add(d("passingTouchdowns") + " TD"); if (has("passing.interceptions")) add(d("passing.interceptions") + " INT"); }
      else if (rush && rush >= rec) { add(d("rushingYards") + " rush yds"); if (has("yardsPerRushAttempt")) add(d("yardsPerRushAttempt") + " a carry"); add(d("rushingTouchdowns") + " TD"); }
      else if (rec) { add(d("receptions") + " rec"); add(d("receivingYards") + " yds"); add(d("receivingTouchdowns") + " TD"); }
      else if (p.grp.defensive) { if (v("sacks")) add(d("sacks") + " sacks"); add(d("totalTackles") + " tackles"); if (v("defensiveInterceptions.interceptions")) add(d("defensiveInterceptions.interceptions") + " INT"); }
      else if (p.grp.kicking && has("fieldGoalsMade")) { add(d("fieldGoalsMade") + "/" + d("fieldGoalAttempts") + " FG"); }
    } else if (sp === "baseball") {
      if (p.grp.pitching && !(p.grp.batting && v("atBats") > 50)) { if (has("ERA")) add(d("ERA") + " ERA"); if (has("wins")) add(d("wins") + "-" + d("losses")); if (has("strikeouts")) add(d("strikeouts") + " K"); }
      else { if (has("avg")) add(d("avg")); if (has("homeRuns")) add(d("homeRuns") + " HR"); if (has("RBIs")) add(d("RBIs") + " RBI"); }
    } else if (sp === "soccer") {
      if (p.grp.keepers) { if (has("saves")) add(d("saves") + " saves"); if (has("goalsConceded")) add(d("goalsConceded") + " conceded"); }
      else { add(d("totalGoals") + " goals"); add(d("goalAssists") + " assists"); }
      if (has("appearances")) add("in " + d("appearances") + " games");
    }
    return out.filter(function (t) { return !/^(undefined|null)\b/.test(t); }).join(", ");
  }
  // fill in each watch player's line once ESPN's season stats are in; redraw once when they arrive
  function pwFill(g, wl) {
    var bk = g.id + "|" + wl.map(function (w) { return pwKey(w.name); }).join(",");
    if (!BX_SPORT[g.league] || !bxBase(g.league) || PW.busy[bk]) return;
    PW.busy[bk] = 1;
    pwTeams(g).then(function (ids) {
      var abs = Object.keys(ids);
      return Promise.all(abs.map(function (ab) { return pwSeason(g.league, ids[ab]); })).then(function (rs) {
        var got = 0;
        wl.forEach(function (w) {
          var nk = pwKey(w.name), want = String(w.team || "").toUpperCase(), hit = null;
          abs.forEach(function (ab, i) { if (hit || (want && abs.indexOf(want) >= 0 && ab !== want)) return; hit = rs[i][nk] || null; });
          if (!hit) abs.forEach(function (ab, i) { if (hit || (want && abs.indexOf(want) >= 0 && ab !== want)) return; var m = Object.keys(rs[i]).filter(function (k) { var x = rs[i][k]; return x.last && nk.slice(-x.last.length) === x.last && k.charAt(0) === nk.charAt(0); }); if (m.length === 1) hit = rs[i][m[0]]; });
          var ln = hit ? pwLine(g.league, hit, (w.line || "") + " " + (w.note || "")) : "";
          PW.line[g.id + "|" + nk] = ln; if (ln) got++;
        });
        if (got) { clearTimeout(PW.redraw); PW.redraw = setTimeout(function () { keepScroll(render); }, 50); }
      });
    }).then(null, function () {});
  }
  // one Players to watch / Top performers row; used by the quick look and the matchup page
  function pwRow(g, w, star) {
    var r = el("div", "pw");
    r.appendChild(el("span", "pw-n", w.name)); if (w.team) r.appendChild(el("span", "pw-t", w.team));
    var ln = star ? w.line : PW.line[g.id + "|" + pwKey(w.name)] || (/\d/.test(w.line || "") ? w.line : "");
    if (ln) r.appendChild(el("span", "pw-l", ln));
    if (w.note) r.appendChild(el("span", "pw-note", w.note));
    return r;
  }
  function pwList(g, pv, stars) {
    var wl = stars.length ? stars : Array.isArray(pv.watch) ? pv.watch.filter(function (w) { return w && w.name; }).slice(0, 4) : [];
    if (!stars.length && wl.length && wl.some(function (w) { return PW.line[g.id + "|" + pwKey(w.name)] === undefined; })) pwFill(g, wl);
    return wl;
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
    var wl = pwList(g, pv, stars);
    if (wl.length) {
      var wb = el("div", "pv-watch"); wb.appendChild(el("b", "pv-h", stars.length ? "Top performers" : "Players to watch"));
      wl.forEach(function (w) { wb.appendChild(pwRow(g, w, stars.length > 0)); });
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

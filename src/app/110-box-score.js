  // ---- where a game's box comes from ----
  var bx = { live: {}, sb: {} };
  function boxFor(g) {
    var c = bx.live[g.id];
    if (window.SLATE_SELF && c && c.data) return c.data;
    var d = (state.box || {})[g.id];
    return d && Array.isArray(d.teams) && d.teams.length === 2 ? d : null;
  }
  function boxLive(b) { return !!b && (b.state === "in" || b.state === "post"); }
  function bxBase(lg) { var u = (ESPN_URLS[lg] || [])[0]; return u ? u.split("&")[0] : ""; }
  function bxSummaryUrl(lg, ev) { return BX_SPORT[lg] === "soccer" ? "https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=" + ev : bxApi(lg, "summary?event=" + ev); }
  function bxApi(lg, rest) { return "https://site.api.espn.com/apis/site/v2/sports/" + bxBase(lg) + "/" + rest; }
  // self-hosted only: find the game's ESPN event on that day's scoreboard (cached ten minutes)
  // 3.141.3 (DJ: "Clemson live feed not loading"): a game that tips after midnight Eastern (Maui, Hawaii, the West Coast late game) is on
  // ESPN's list for the evening before, not the Eastern date of its start. When it isn't on its own day's list, the day before is checked
  // (the day after for a game starting after noon), so the Live feed, quick look box and matchup page find it.
  function bxDayEvents(lg, d) {
    var key = lg + "|" + d, c = bx.sb[key];
    // one scoreboard request per league and day, shared by every game asking at once (it used to be one per game)
    bx.sbP = bx.sbP || {};
    return c && Date.now() - c.at < 600000 ? Promise.resolve(c.events) : bx.sbP[key] || (bx.sbP[key] = Promise.all((ESPN_URLS[lg] || []).map(function (u) {
      var parts = u.split("&"); return rkFetch("https://site.api.espn.com/apis/site/v2/sports/" + parts[0] + "/scoreboard?dates=" + d + (parts.length > 1 ? "&" + parts.slice(1).join("&") : ""));
    })).then(function (rs) { var evs = []; rs.forEach(function (j) { evs = evs.concat((j && j.events) || []); }); bx.sb[key] = { at: Date.now(), events: evs }; delete bx.sbP[key]; return evs; }, function (e) { delete bx.sbP[key]; throw e; }));
  }
  function bxFindEvent(g) {
    var t = new Date(g.start).getTime(), d = etDate(t);
    var norm = function (x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
    var pick = function (evs) {
      for (var i = 0; i < evs.length; i++) {
        var e = evs[i], cp = e.competitions && e.competitions[0]; if (!cp) continue;
        if (Math.abs(new Date(e.date).getTime() - t) > 3 * 3600000) continue;
        var A = null, H = null; (cp.competitors || []).forEach(function (k) { if (k.homeAway === "home") H = k; else A = k; });
        var ok = function (k, side) { var tm = (k && k.team) || {}; return norm(tm.displayName) === norm(g[side]) || (!!g[side + "Abbr"] && norm(tm.abbreviation) === norm(g[side + "Abbr"])); };
        if (A && H && ok(A, "away") && ok(H, "home")) { noteFlip(g, false); return e.id; }
        if (A && H && ok(H, "away") && ok(A, "home")) { if (noteFlip(g, true)) setTimeout(render, 0); return e.id; }
      }
      return null;
    };
    var d2 = etDate(t + (etHour(t) < 12 ? -1 : 1) * 86400000);
    return bxDayEvents(g.league, d).then(function (evs) {
      var id = pick(evs); return id ? id : bxDayEvents(g.league, d2).then(pick);
    });
  }
  function bxFetch(g) {
    var lg = g.league, cur = bx.live[g.id] || (bx.live[g.id] = {});
    if (cur.busy || !bxBase(lg)) return;
    cur.busy = true;
    (cur.ev ? Promise.resolve(cur.ev) : bxFindEvent(g)).then(function (ev) {
      if (!ev) throw new Error("no event");
      cur.ev = ev;
      return rkFetch(bxSummaryUrl(lg, ev)).then(function (sum) {
        if (!sum) throw new Error("no summary");
        var vn = (sum.gameInfo || {}).venue; if (vn && vn.fullName) { var ad = vn.address || {}; cur.venue = { name: vn.fullName, place: [ad.city, ad.state || ad.country].filter(Boolean).join(", ") }; }
        var cp = ((sum.header || {}).competitions || [])[0] || {}, stt = ((cp.status || {}).type || {}).state;
        if (stt !== "pre" || !BX_SEASON[BX_SPORT[lg]]) return [sum, null];
        var ids = (cp.competitors || []).map(function (c) { return String((c.team || {}).id || ""); });
        return Promise.all(ids.map(function (id) { return seasonFetch(lg, id); })).then(function (rs) {
          var m = {}; ids.forEach(function (id, i) { if (rs[i]) m[id] = rs[i]; }); return [sum, m];
        });
      });
    }).then(function (r) {
      try { var nh = hlCompute(lg, r[0]); if ((nh && nh.key) !== (cur.hl && cur.hl.key) || (nh && cur.hl && nh.text !== cur.hl.text)) { cur.hl = nh; cur.hlNew = true; } } catch (e) {}
      try { if (((((r[0].header || {}).competitions || [])[0] || {}).status || {}).type && r[0].header.competitions[0].status.type.state === "post") hlcPut(g.id, (cur.hl && cur.hl.text) || "", (cur.hl && cur.hl.tm) || ""); } catch (e) {}
      try { var spx = BX_SPORT[lg]; cur.scoring = spx === "football" ? footScoring(r[0]) : spx === "hockey" || spx === "baseball" ? otherScoring(r[0], spx) : null; } catch (e) { cur.scoring = null; }
      wwbPut(g, lg, r[0]);  // "Worth watching back" facts for a finished game (152-watch-back.js)
      cur.sum = r[0]; cur.sumAt = Date.now();  // the raw summary too: Best bets reads tonight's numbers from it
      cur.data = bxNorm(lg, r[0], r[1]); cur.data.at = new Date().toISOString(); cur.at = Date.now(); cur.busy = false; cur.err = false; bxRedraw(g);
    }, function () { cur.busy = false; cur.at = Date.now(); cur.err = true; bxRedraw(g); });
  }
  // football scoring summary from ESPN's game data: quarter and clock, team, TD / FG / safety, who, and the score after it
  function footScoring(sum) {
    var comp = ((sum.header || {}).competitions || [])[0] || {}, ab = {}, side = {};
    (comp.competitors || []).forEach(function (k) { var t = k.team || {}; ab[String(t.id)] = t.abbreviation || ""; side[k.homeAway] = t.abbreviation || ""; });
    return (sum.scoringPlays || []).map(function (p) {
      var tx = String(p.text || ""), ty = String((p.type || {}).text || "");
      var kind = /field goal/i.test(ty + " " + tx) ? "FG" : /safety/i.test(ty + " " + tx) ? "Safety" : /two-point|2pt|2-pt/i.test(ty) ? "2-pt" : "TD";
      var who = tx.replace(/\s*\([^)]*\)\s*$/, "").replace(/,?\s*for a TD/i, "").replace(/\bfor (\d+) yds?\b/i, "$1 yds").replace(/\s*,\s*$/, "").replace(/\s{2,}/g, " ").trim();
      var n = Number((p.period || {}).number) || 0;
      return { q: n > 4 ? "OT" : "Q" + n, ck: String((p.clock || {}).displayValue || ""), tm: (p.team && (p.team.abbreviation || ab[String(p.team.id)])) || "", kind: kind, who: who,
        sc: side.away + " " + p.awayScore + ", " + side.home + " " + p.homeScore };
    });
  }
  // hockey goals and baseball runs, in the same shape as football's: period, clock, team, kind, who, the score after
  function otherScoring(sum, sport) {
    var comp = ((sum.header || {}).competitions || [])[0] || {}, ab = {}, side = {};
    (comp.competitors || []).forEach(function (k) { var t = k.team || {}; ab[String(t.id)] = t.abbreviation || ""; side[k.homeAway] = t.abbreviation || ""; });
    var list = (sum.scoringPlays || []).length ? sum.scoringPlays : (sum.plays || []).filter(function (p) { return p.scoringPlay; });
    var nm = function (x) { var a = (x && x.athlete) || {}; return a.lastName || String(a.shortName || a.displayName || "").replace(/^[A-Z]\.\s*/, ""); };
    return list.map(function (p) {
      var n = Number((p.period || {}).number) || 0, tx = String(p.text || ""), q, kind, who;
      if (sport === "hockey") {
        var so = n > 4 || /shootout/i.test(String((p.period || {}).displayValue || "")); q = so ? "SO" : n > 3 ? "OT" : "P" + n;
        var stg = String(((p.strength || {}).abbreviation) || ""), en = /empty net/i.test(tx);
        kind = /power-play/.test(stg) ? "PP goal" : /short-handed/.test(stg) ? "SH goal" : en ? "EN goal" : "Goal";
        var ps = p.participants || [], sco = ps.filter(function (x) { return x.type === "scorer"; })[0] || ps[0], as = ps.filter(function (x) { return x.type === "assister"; }).map(nm);
        who = sco ? nm(sco) + (as.length ? " (" + as.join(", ") + ")" : " (unassisted)") : tx.replace(/\s*\(\d+\).*$/, "");
      } else {
        var half = /bottom/i.test(String((p.period || {}).type || "") + " " + String((p.period || {}).displayValue || "")) ? "Bot" : "Top"; q = half + " " + n;
        kind = /homered|home run/i.test(tx) ? "HR" : "Run"; who = tx.replace(/\s*\(.*?\)/g, "").trim();
      }
      return { q: q, ck: sport === "hockey" ? String((p.clock || {}).displayValue || "") : "", tm: (p.team && (p.team.abbreviation || ab[String(p.team.id)])) || "", kind: kind, who: who,
        sc: side.away + " " + p.awayScore + ", " + side.home + " " + p.homeScore };
    });
  }
  function scoringBlock(g, full) {
    var cur = bx.live[g.id], sc = cur && cur.scoring;
    if (BX_SPORT[g.league] === "soccer") return null;  // soccer: the match summary carries the goals
    if (!sc || !sc.length || !state.showScores) return null;
    var w = el("div", "scs"); w.appendChild(el("p", "scs-h", "Scoring"));
    // 3.72.0 (DJ): football shows each scoring play as the live feed's box (team edge, goalposts or emoji, jerseys, stat lines, score)
    var fl = null; try { fl = fdScoringList(g, cur.sum); } catch (e) {}
    // 3.74.0 (DJ): newest score first, down to the game's first
    if (fl) { for (var ci = fl.children.length - 1; ci > 0; ci--) fl.appendChild(fl.children[ci - 1]); w.appendChild(fl); return w; }
    sc.slice().reverse().forEach(function (p) {
      var r = el("div", "scs-r");
      r.appendChild(el("span", "scs-t", p.q + (p.ck ? " " + p.ck : "")));
      var m = el("div", "scs-m"), top = el("div", "scs-top"); top.appendChild(el("b", null, p.tm)); top.appendChild(el("span", "scs-k", p.kind)); top.appendChild(el("span", "scs-s", p.sc));
      m.appendChild(top); m.appendChild(el("span", "scs-w", p.who)); r.appendChild(m); w.appendChild(r);
    });
    return w;
  }
  // self-hosted only: fetch when there's nothing yet, or a live box is more than ~25 seconds old
  function bxNeed(g) {
    if (!window.SLATE_SELF || !g || g.custom || !BX_SPORT[g.league]) return;
    var cur = bx.live[g.id], kind = status(g).kind;
    if (cur && cur.busy) return;
    if (cur && cur.data) {
      // after the final, ESPN keeps correcting the box score for a while (a late TD credited, a stat moved):
      // check again every 2 minutes for the first hour after we first saw it final, then leave it
      if (cur.data.state === "post") { cur.postAt = cur.postAt || cur.at; if (Date.now() - cur.postAt > 60 * 60000 || Date.now() - cur.at < 2 * 60000) return; }
      if (cur.data.state === "pre" && kind === "upcoming" && Date.now() - cur.at < (BX_SPORT[g.league] === "soccer" && Date.parse(g.start) - Date.now() < 90 * 60000 && !(cur.data.teams || []).some(function (t) { return t.xi && t.xi.length; }) ? 4 : 20) * 60000) return;  // 3.188.0: a soccer game near kickoff looks for its lineups every 4 minutes  // odds and injuries move: refresh a pre-game box every 20 minutes
      if (Date.now() - cur.at < (state.openId === g.id || (state.view === "game" && state.gameId === g.id) ? 9000 : 25000)) return;
    } else if (cur && cur.err && Date.now() - cur.at < 60000) return;
    bxFetch(g);
  }
  function bxRedraw(g) {
    var cur = bx.live[g.id], hl = !!(cur && cur.hlNew), bt = inLineup(g.id) && betTouch(g); if (hl) cur.hlNew = false;
    // 3.188.0: a soccer game's lineups just came out: its slate card gets the "📋 Lineups" tag (socLuTag in 090-box-data.js)
    var lu = !!(cur && cur.data && cur.data.state === "pre" && (cur.data.teams || []).some(function (t) { return t.xi && t.xi.length; }));
    if (lu && !cur.luSeen) { cur.luSeen = true; bt = bt || inLineup(g.id); }
    if ((hl || bt) && inLineup(g.id) && (state.view === "lineup" || isDuo)) keepScroll(renderLineup);
    if (hl) agRedraw();
    if (state.view === "game" && state.gameId === g.id) keepScroll(renderGame);
    if (state.openId === g.id && document.querySelector("#lineup-body .tray") && $("lineup-body").offsetParent) keepScroll(renderLineup);
    if (state.openId === g.id && document.querySelector("#games-body .tray") && $("games-body").offsetParent) keepScroll(renderGames);  // 3.95.1: not while All games is hidden
    if (state.view === "moments" && mm.pick && state.openId === g.id) keepScroll(renderMoments);
  }
  if (window.SLATE_SELF) {
    setInterval(function () {
      if (document.hidden) return;
      [state.openId, state.view === "game" ? state.gameId : null].forEach(function (id) {
        if (!id) return; var g = games().filter(function (x) { return x.id === id; })[0];
        if (g && status(g).kind === "live") bxNeed(g);
      });
    }, 10000);
    setInterval(function () {
      if (document.hidden) return;
      [].forEach(function (id) {
        if (!id) return; var g = games().filter(function (x) { return x.id === id; })[0];
        if (g && status(g).kind === "live") bxNeed(g);
      });
      // every live game on the slate, for its highlight line
      if (state.date === todayInHome()) lineupGames().forEach(function (g) { if (!g.custom && status(g).kind === "live") bxNeed(g); });
    }, 30000);
  }

  // ---- drawing it ----
  var BX_GROUP = { "": "Players", game: "Per game", team: "Skaters", goalkeeping: "Goalies", forwards: "Forwards", defenses: "Defense", goalies: "Goalies", passing: "Passing", rushing: "Rushing", receiving: "Receiving", fumbles: "Fumbles", defensive: "Defense", interceptions: "Interceptions", kickReturns: "Kick returns", puntReturns: "Punt returns", kicking: "Kicking", punting: "Punting", batting: "Batting", pitching: "Pitching", lineup: "Lineup", outfield: "Season stats", keepers: "Goalkeepers" };
  // the slate's quick look: a few columns and the top few players in each group
  var BX_COMPACT = {
    bball: { "": { cols: ["MIN", "PTS", "REB", "AST", "FG", "3PT", "FT", "STL", "BLK", "+/-"], sort: ["PTS", "REB", "AST"], n: 6 } },
    hockey: { forwards: { cols: ["G", "A", "+/-", "S", "TOI"], sort: ["G", "A", "S"], n: 4 }, defenses: { cols: ["G", "A", "S", "TOI"], sort: ["G", "A", "S"], n: 2 }, goalies: { cols: ["SA", "SV", "SV%"], sort: ["SA"], n: 2 } },
    football: { passing: { cols: ["C/ATT", "YDS", "TD", "INT"], sort: ["YDS"], n: 1 }, rushing: { cols: ["CAR", "YDS", "TD"], sort: ["YDS"], n: 2 }, receiving: { cols: ["REC", "YDS", "TD"], sort: ["YDS"], n: 3 } },
    baseball: { batting: { cols: ["AB", "R", "H", "RBI"], sort: ["H", "RBI", "R"], n: 4 }, pitching: { cols: ["IP", "H", "ER", "K"], sort: ["IP", "K"], n: 2 } },
    soccer: { lineup: { cols: ["G", "A", "SH"], sort: ["G", "A", "SH"], n: 5 } }
  };
  // columns that lead the full table (the rest follow in ESPN's order)
  var BX_ORDER = { hockey: { forwards: ["G", "A", "+/-", "S", "TOI", "SHFT", "HT", "BS", "FO%", "PIM"], defenses: ["G", "A", "+/-", "S", "TOI", "SHFT", "HT", "BS", "PIM"], goalies: ["SA", "GA", "SV", "SV%", "TOI", "PIM"] } };
  var BX_DROP = { hockey: ["PPTOI", "SHTOI", "ESTOI", "YTDG", "SM", "SOG", "FW", "FL", "TK", "GV", "PN", "SOS", "SOSA", "ESSV", "PPSV", "SHSV"] };
  var BX_KEY_STATS = {
    bball: ["fieldGoalsMade-fieldGoalsAttempted", "fieldGoalPct", "threePointFieldGoalsMade-threePointFieldGoalsAttempted", "totalRebounds", "assists", "totalTurnovers", "avgPoints", "avgPointsAgainst", "threePointFieldGoalPct", "avgRebounds", "avgAssists"],
    hockey: ["shotsTotal", "powerPlayGoals", "powerPlayOpportunities", "faceoffPercent", "hits", "blockedShots", "avgGoals", "avgGoalsAgainst", "avgShots", "powerPlayPct", "penaltyKillPct"],
    football: ["totalYards", "netPassingYards", "rushingYards", "firstDowns", "thirdDownEff", "turnovers", "possessionTime", "totalPointsPerGame", "totalPointsPerGameAllowed", "yardsPerGame", "yardsPerGameAllowed"],
    baseball: ["hits", "errors", "homeRuns", "strikeouts", "walks"],
    soccer: ["possessionPct", "xG", "totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted", "saves"]
  };
  function bxNum(v) { var n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isNaN(n) ? -1 : n; }
  function bxTeamStats(g, b, compact) {
    var A = b.teams[0], H = b.teams[1]; if (!A || !H) return null;
    if (homeFirst(g)) { var swp = A; A = H; H = swp; }   // 3.130.5: soccer's home side on the left
    var hm = {}; (H.stats || []).forEach(function (s) { hm[s[0]] = s; });
    var rows = (A.stats || []).filter(function (s) { return hm[s[0]]; });
    if (compact) {
      var pick = []; (BX_KEY_STATS[BX_SPORT[g.league]] || []).forEach(function (k) { var r = rows.filter(function (s) { return s[0] === k; })[0]; if (r && pick.length < 6) pick.push(r); });
      rows = pick.length >= 3 ? pick : rows.slice(0, 6);
    }
    if (!rows.length) return null;
    var w = el("div", "bx-ts"), hd = el("div", "bx-tr bx-th");
    hd.appendChild(el("b", null, A.abbr || abbr(g, sideOrder(g)[0]))); hd.appendChild(el("span")); hd.appendChild(el("b", null, H.abbr || abbr(g, sideOrder(g)[1]))); w.appendChild(hd);
    rows.forEach(function (s) {
      var r = el("div", "bx-tr");
      r.appendChild(el("span", "bx-v", s[2])); r.appendChild(el("span", "bx-l", s[1])); r.appendChild(el("span", "bx-v", hm[s[0]][2]));
      w.appendChild(r);
    });
    return w;
  }
  // the quick look's short version of a stat group: its key columns and its top few players, drawn like the full box score
  function bxCompactGroup(sport, gr) {
    var spec = (BX_COMPACT[sport] || {})[gr.k], cols = gr.cols || [];
    if (!spec) return gr;
    var keep = spec.cols.filter(function (c) { return cols.indexOf(c) !== -1; }), si = spec.sort.map(function (c) { return cols.indexOf(c); }).filter(function (i) { return i !== -1; });
    var played = gr.rows.filter(function (r) { return !("dnp" in r); }).slice().sort(function (a, b) { for (var k = 0; k < si.length; k++) { var d = bxNum(b.s[si[k]]) - bxNum(a.s[si[k]]); if (d) return d; } return 0; });  // everyone who played (3.40.1)
    return { k: gr.k, cols: keep, rows: played.map(function (r) { var c = Object.assign({}, r); c.s = keep.map(function (k) { return r.s[cols.indexOf(k)]; }); return c; }) };
  }
  // one team at a time, with a two-button switch; starts on your team when one of them is yours

  // ---- the full box score, drawn like the Real app: a team summary, then one row per player with big numbers ----
  var BX_HEAD = { nba: "nba", wnba: "wnba", nhl: "nhl", nfl: "nfl", mlb: "mlb", ncaam: "mens-college-basketball", ncaaw: "womens-college-basketball", ncaaf: "college-football", mls: "soccer", epl: "soccer", ucl: "soccer", uel: "soccer", laliga: "soccer", seriea: "soccer", bundesliga: "soccer", ligue1: "soccer", facup: "soccer" , intl: "soccer"};
  var BX_LEAD = { bball: ["MIN", "PTS", "REB", "AST", "STL", "BLK", "+/-", "FG", "3PT", "FT", "TO", "PF", "OREB", "DREB"], game: ["GP", "MIN", "PTS", "REB", "AST", "FG%", "3P%", "FT%", "STL", "BLK", "TO"] };
  function bxFace(g, r, team) {
    var f = el("span", "bxp-face"), tc = (teamByName && teamByName(team.name)) || null, c1 = (tc && tc.c1) || "#2a3442";
    f.style.background = c1;
    var ini = String(r.n || "").replace(/[^A-Za-z. ]/g, "").split(/[ .]+/).filter(Boolean); f.appendChild(el("i", null, ((ini[0] || "")[0] || "") + ((ini[ini.length - 1] || "")[0] || "")));
    var dir = BX_HEAD[g.league];
    if (r.id && dir && dir !== "soccer") {
      var im = document.createElement("img"); im.alt = ""; im.loading = "lazy"; im.decoding = "async";
      im.src = "https://a.espncdn.com/combiner/i?img=/i/headshots/" + dir + "/players/full/" + r.id + ".png&w=120&h=88";
      im.onerror = function () { im.remove(); }; f.appendChild(im);
    }
    return f;
  }
  // 3.133.1 (DJ): basketball's made-attempted pairs (FG, 3PT, FT) get their shooting % beside them, small and muted.
  // ESPN gives each player only the made-attempted pair, so the % is worked out from those two numbers; nothing when there were no attempts.
  var BX_PCT_COLS = { FG: 1, "3PT": 1, FT: 1 };
  function bxPct(sport, col, v) {
    if (sport !== "bball" || !BX_PCT_COLS[col]) return "";
    var m = /^(\d+)-(\d+)$/.exec(String(v || "")); if (!m || !+m[2]) return "";
    return Math.round(100 * m[1] / m[2]) + "%";
  }
  function bxCells(cols, idx, vals, plusCol, widths, sport) {
    var row = el("div", "bxp-cells");
    idx.forEach(function (i) {
      var v = vals[i]; v = v != null && v !== "" ? String(v) : "–";
      var c = el("span", "bxp-c"), n = el("b", null, v), pc = bxPct(sport, cols[i], v);
      if (pc) n.appendChild(el("small", "bxp-pct", pc));
      if (i === plusCol) { var x = parseFloat(v); if (x > 0) n.className = "up"; else if (x < 0) n.className = "down"; }
      if (widths && widths[i]) c.style.width = widths[i] + "px";
      c.appendChild(n); c.appendChild(el("i", null, cols[i])); row.appendChild(c);
    });
    return row;
  }
  function bxOrder(sport, gr) {
    var cols = gr.cols || [], drop = BX_DROP[sport] || [];
    var leadList = (BX_ORDER[sport] || {})[gr.k] || BX_LEAD[sport === "bball" && gr.k !== "game" ? "bball" : gr.k] || [];
    var lead = leadList.map(function (c) { return cols.indexOf(c); }).filter(function (i) { return i !== -1; });
    return lead.concat(cols.map(function (c, i) { return i; }).filter(function (i) { return drop.indexOf(cols[i]) === -1 && lead.indexOf(i) === -1; }));
  }
  function bxTeamCard(g, t, sport) {
    var m = {}; (t.stats || []).forEach(function (s) { m[s[0]] = s; });
    var cells = [];
    function pair(made, pct, lab) { var a = m[made], b = m[pct]; if (a) cells.push([String(a[2]).replace("-", "/"), lab, b ? b[2] + "%" : ""]); }
    if (sport === "bball") {
      pair("fieldGoalsMade-fieldGoalsAttempted", "fieldGoalPct", "FG");
      pair("threePointFieldGoalsMade-threePointFieldGoalsAttempted", "threePointFieldGoalPct", "3FG");
      pair("freeThrowsMade-freeThrowsAttempted", "freeThrowPct", "FT");
      [["totalTurnovers", "TO"], ["turnovers", "TO"], ["totalRebounds", "REB"], ["assists", "AST"], ["steals", "STL"], ["blocks", "BLK"]].forEach(function (k) { if (m[k[0]] && !cells.some(function (c) { return c[1] === k[1]; })) cells.push([m[k[0]][2], k[1], ""]); });
    } else {
      // short labels, so every sport's team row reads like basketball's (FG, REB, AST)
      var SHORT = { totalYards: "Yards", netPassingYards: "Pass yds", rushingYards: "Rush yds", firstDowns: "1st downs", thirdDownEff: "3rd down", turnovers: "TO", possessionTime: "Possession",
        shotsTotal: "Shots", powerPlayGoals: "PP goals", powerPlayOpportunities: "PP chances", faceoffPercent: "Faceoff %", hits: "Hits", blockedShots: "Blocks",
        possessionPct: "Possession", totalShots: "Shots", shotsOnTarget: "On target", wonCorners: "Corners", foulsCommitted: "Fouls", saves: "Saves" };
      (BX_KEY_STATS[sport] || []).forEach(function (k) { if (m[k] && cells.length < 7) cells.push([/possession/i.test(m[k][1]) && !/%/.test(m[k][2]) && !/:/.test(m[k][2]) ? m[k][2] + "%" : m[k][2], SHORT[k] || m[k][1], ""]); });
      if (!cells.length) (t.stats || []).slice(0, 6).forEach(function (s) { cells.push([s[2], s[1], ""]); });
    }
    if (!cells.length) return null;
    var card = el("div", "bxt");
    card.appendChild(badgeFor(t.abbr || "", t.name || ""));
    var right = el("div", "bxt-r"); right.appendChild(el("span", "bxt-nm", t.name || t.abbr || ""));
    var row = el("div", "bxp-cells bxt-cells");
    cells.forEach(function (c) { var x = el("span", "bxp-c"); x.appendChild(el("b", null, String(c[0]))); x.appendChild(el("i", null, c[1])); if (c[2]) x.appendChild(el("em", null, c[2])); row.appendChild(x); });
    right.appendChild(row); card.appendChild(right);
    return card;
  }
  // players without a line: while the game is on, nobody is listed (a bench player isn't "coach's decision" yet);
  // after the final, the ones who sat, minus the injured (they're in the Injuries line)
  function bxBench(wrap, out, live, team) {
    if (live || !out.length) return;
    var hurt = {}; ((team && team.inj) || []).forEach(function (i) { hurt[i.n] = 1; });
    var sat = out.filter(function (r) { return !hurt[r.n]; });
    if (sat.length) wrap.appendChild(el("p", "bx-dnp", "Did not play: " + sat.map(function (r) { return r.n; }).join(", ")));
  }
  function bxInjuries(t) {
    var l = (t && t.inj) || []; if (!l.length) return null;
    var p = el("p", "bx-dnp bx-inj"); p.appendChild(el("b", null, "Injuries "));
    p.appendChild(document.createTextNode(l.map(function (i) { var bits = [i.why, i.s].filter(Boolean); return i.n + (bits.length ? " (" + bits.join(", ") + ")" : ""); }).join(", ")));
    return p;
  }
  function bxRows(g, gr, sport, live, team, cut) {
    var cols = gr.cols || [], idx = bxOrder(sport, gr), plus = cols.indexOf("+/-");
    var played = gr.rows.filter(function (r) { return !("dnp" in r); }), out = gr.rows.filter(function (r) { return "dnp" in r; });
    // after the final, a long list shows its first few (basketball: the starters) with a button for the rest
    state.bxAll = state.bxAll || {};
    var allKey = g.id + "|" + (team ? team.id : "") + "|" + gr.k, nAll = played.length, folded = false;
    if (cut && !state.bxAll[allKey]) {
      var keep = sport === "bball" && played.some(function (r) { return r.st; }) ? played.filter(function (r) { return r.st; }) : played.slice(0, cut);
      if (nAll - keep.length >= 2) { played = keep; folded = true; }
    }
    // every row's column gets the same width, so the columns line up and scroll together
    var big = 10.5, widths = {};
    idx.forEach(function (i) { var m = String(cols[i] || "").length * 7.5; played.forEach(function (r) { var pc = bxPct(sport, cols[i], r.s[i]); m = Math.max(m, String(r.s[i] == null ? "–" : r.s[i]).length * big + (pc ? pc.length * 6.5 + 3 : 0)); }); widths[i] = Math.ceil(Math.max(26, m)); });
    var wrap = el("div", "bxp-list"), sc = el("div", "bxp-sc");  // one sideways scroller for the whole group
    // 3.170.2 (DJ: "Too much unused space here"): a group with only a few columns (football's, most compact ones) puts the name and the stats on
    // one line, and fills two columns of players where the box score is wide. The CSS does the rest (040-components.css, "bxp-few").
    var tot = 0; idx.forEach(function (i) { tot += (widths[i] || 26) + 12; }); if (idx.length && tot <= 215) wrap.classList.add("bxp-few");
    var split = sport === "bball" && gr.k !== "game" && played.some(function (r) { return r.st; }) && played.some(function (r) { return !r.st; });
    var parts = split ? [["Starters", played.filter(function (r) { return r.st; })], ["Bench", played.filter(function (r) { return !r.st; })]] : [[null, played]];
    parts.forEach(function (pt) {
      if (pt[0]) sc.appendChild(el("b", "bxp-sec", pt[0]));
      pt[1].forEach(function (r) {
        var row = el("div", "bxp"), fw = el("span", "bxp-fw");
        fw.appendChild(bxFace(g, r, team)); row.appendChild(fw);
        var right = el("div", "bxp-r"), nm = el("div", "bxp-nm");
        nm.appendChild(el("span", "bxp-n", r.n));
        plrTap(fw, { id: r.id, lg: g.league, name: r.n });   // 3.112.2 (DJ): only the player's picture opens his page
        if (r.p) nm.appendChild(el("span", "bxp-p", "· " + r.p));
        if (r.st && !split && sport !== "bball") nm.appendChild(el("span", "bxp-s", "S"));
        if (r.id && team) { var ps = playerStar({ id: r.id, name: r.n, lg: g.league, team: team.abbr, teamName: team.name }); ps.classList.add("bxp-star"); nm.appendChild(ps); }
        right.appendChild(nm);
        right.appendChild(bxCells(cols, idx, r.s, plus, widths, sport));
        row.appendChild(right); sc.appendChild(row);
      });
    });
    if (played.length) wrap.appendChild(sc);
    if (!played.length) wrap.appendChild(el("p", "bx-dnp", live ? "Nobody has played yet." : "No stats."));
    if (cut && (folded || state.bxAll[allKey])) {
      var mb = el("button", "bx-more", folded ? "Show all " + nAll + " players" : "Show fewer"); mb.type = "button";
      mb.setAttribute("aria-expanded", folded ? "false" : "true");
      mb.addEventListener("click", function (e) { e.stopPropagation(); if (state.bxAll[allKey]) delete state.bxAll[allKey]; else state.bxAll[allKey] = 1; keepScroll(renderGame); });
      wrap.appendChild(mb);
    }
    if (!folded) bxBench(wrap, out, live, team);
    return wrap;
  }
  function bxPlayers(g, b, compact, season) {
    state.bxSide = state.bxSide || {};
    var side = state.bxSide[g.id], hf = homeFirst(g);
    if (side == null) side = hf ? (isFav(g.away, g.league) && !isFav(g.home, g.league) ? 0 : 1) : (isFav(g.home, g.league) && !isFav(g.away, g.league) ? 1 : 0);
    var sport = BX_SPORT[g.league] || "", wrap = el("div", "bx-pl"), seg = el("div", "bx-tabs2");  // same team tabs in the quick look and the full box score
    seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Pick a team");
    (hf ? [1, 0] : [0, 1]).forEach(function (i) {   // 3.130.5: soccer's home team is the first tab
      var t = b.teams[i]; if (!t) return;
      var bt = el("button"); bt.type = "button";
      var sd = i ? "home" : "away", bdg = badgeFor(abbr(g, sd), g[sd], g[sd + "Color"], g[sd + "Alt"]), tc = bdg.style.background || "";
      bdg.setAttribute("aria-hidden", "true"); bt.appendChild(bdg); bt.appendChild(el("span", "bx-tn", short(g, sd) || t.abbr || abbr(g, sd)));  // 3.43.2: badge and team name
      if (tc) bt.style.setProperty("--tc", tc);
      bt.setAttribute("aria-pressed", i === side ? "true" : "false"); bt.setAttribute("aria-label", (t.name || short(g, i ? "home" : "away")) + (season ? " season stats" : " box score"));
      bt.addEventListener("click", function (e) { e.stopPropagation(); if (state.bxSide[g.id] === i) return; state.bxSide[g.id] = i; wrap.replaceWith(bxPlayers(g, b, compact, season)); });
      seg.appendChild(bt);
    });
    wrap.appendChild(seg);
    var t = b.teams[side] || b.teams[0], groups = (t.groups || []).filter(function (gr) { return !compact || (BX_COMPACT[sport] || {})[gr.k]; });
    var socLu = sport === "soccer" ? socLineup(g, t, b) : null;
    if (!groups.length) { if (socLu) { if (!season) { var tc0 = bxTeamCard(g, t, sport); if (tc0) wrap.appendChild(tc0); } wrap.appendChild(socLu); } else wrap.appendChild(el("p", "bx-dnp", season ? "No season stats for this team yet." : "No player stats yet.")); return wrap; }
    if (!compact) wrap.classList.add("real");
    // the picked team's stats: one sideways-scrolling row under the team tabs (the quick look and the full box score alike)
    if (!season) { var tcard = bxTeamCard(g, t, sport); if (tcard) wrap.appendChild(tcard); }
    if (socLu) wrap.appendChild(socLu);
    // football's full box score leads with passing, rushing and receiving; defense, turnovers and special teams wait behind a button
    var moreKey = g.id + "|" + (t.id || side) + "|more", FB_MAIN = ["passing", "rushing", "receiving"], hidN = 0;
    state.bxAll = state.bxAll || {};
    if (sport === "football" && !compact && !season) {
      var mainG = groups.filter(function (gr) { return FB_MAIN.indexOf(gr.k) !== -1; });
      hidN = groups.length - mainG.length;
      if (mainG.length && hidN && !state.bxAll[moreKey]) groups = mainG; else if (!mainG.length) hidN = 0;
    }
    groups.forEach(function (gr) {
      if (groups.length > 1) wrap.appendChild(el("b", "bxp-grp", BX_GROUP[gr.k] || gr.k));
      wrap.appendChild(bxRows(g, compact ? bxCompactGroup(sport, gr) : gr, sport, b.state === "in", t, 0));  // everyone who played, starters and the whole bench, in the quick look and the full box score alike (3.40.1)  // one look for every sport, quick look and full box score alike
    });
    if (hidN) {
      var mo = el("button", "bx-more", state.bxAll[moreKey] ? "Hide defense and special teams" : "Show defense and special teams"); mo.type = "button";
      mo.setAttribute("aria-expanded", state.bxAll[moreKey] ? "true" : "false");
      mo.addEventListener("click", function (e) { e.stopPropagation(); if (state.bxAll[moreKey]) delete state.bxAll[moreKey]; else state.bxAll[moreKey] = 1; keepScroll(renderGame); });
      wrap.appendChild(mo);
    }
    if (!season) { var injL = bxInjuries(t); if (injL) wrap.appendChild(injL); }
    // 3.165.0 (DJ: "Implement the new box score design and such app wide"): the Live feed's highlights (each column's team best lit, the standout
    // player's row tinted with a word on why) on every game box score: the quick look, the matchup page and finished games. Not on season stats.
    if (!season) { try { fdBoxShine(wrap, sport); } catch (e) {} }
    return wrap;
  }
  function bxStamp(b) {
    var t = new Date(b.at || 0), tm = isNaN(t) || !b.at ? "" : t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (b.season) return "Season stats from ESPN" + (tm ? " · " + tm : "");
    if (b.state === "post") return "Final box score from ESPN";
    return window.SLATE_SELF ? "Live from ESPN" + (tm ? " · updated " + tm : "") : "Box score as of " + (tm || "the last refresh") + " · refreshes hourly";
  }
  // the line (from the preview or ESPN), plus the live win chance while a game is on
  // moneylines in the team order shown; a line saved before ESPN turned a neutral-site game round is put right
  // by checking it against the spread's favorite
  function mlText(g, o) {
    var ml = { away: Number(o.ml.away), home: Number(o.ml.home) }, m = /^([A-Za-z0-9&.']+)\s*-\d/.exec(o.spread || "");
    if (m) { var f = m[1].toUpperCase(), fs = abbr(g, "away") === f ? "away" : abbr(g, "home") === f ? "home" : null;
      if (fs && ml[fs] > 0 && ml[fs === "away" ? "home" : "away"] < 0) { var t = ml.away; ml.away = ml.home; ml.home = t; } }
    return sideOrder(g).map(function (sd) { return abbr(g, sd) + " " + fmtOdds(ml[sd]); }).join(" · ");
  }
  // the betting line straight from ESPN's scoreboard (one request per league and day, shared by every game),
  // so every game has its line even before its own game data loads, and without any Claude preview
  var SB_ODDS_T = null;
  function sbOdds(g) {
    if (g.custom || !ESPN_URLS[g.league]) return null;
    var t = new Date(g.start).getTime(), key = g.league + "|" + etDate(t), c = bx.sb[key];
    var c2 = bx.sb[g.league + "|" + etDate(t + (etHour(t) < 12 ? -1 : 1) * 86400000)];  // 3.141.3: a game after midnight Eastern is on the evening before's list
    if (c && c2) c = { events: c.events.concat(c2.events) };
    if (!c) {
      if (window.SLATE_SELF && !(bx.sbP || {})[key] && !(bx.sbTried || (bx.sbTried = {}))[key]) {
        bx.sbTried[key] = 1;
        bxFindEvent(g).then(function () { clearTimeout(SB_ODDS_T); SB_ODDS_T = setTimeout(function () { keepScroll(render); }, 300); }, function () {});
      }
      return null;
    }
    var norm = function (x) { return String(x || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
    for (var i = 0; i < c.events.length; i++) {
      var e = c.events[i], cp = e.competitions && e.competitions[0]; if (!cp || Math.abs(new Date(e.date).getTime() - t) > 3 * 3600000) continue;
      var A = null, H = null; (cp.competitors || []).forEach(function (k) { if (k.homeAway === "home") H = k; else A = k; });
      var ok = function (k, side) { var tm = (k && k.team) || {}; return norm(tm.displayName) === norm(g[side]) || (!!g[side + "Abbr"] && norm(tm.abbreviation) === norm(g[side + "Abbr"])); };
      if (!(A && H && ((ok(A, "away") && ok(H, "home")) || (ok(H, "away") && ok(A, "home"))))) continue;
      var pk = (cp.odds || [])[0]; if (!pk || !(pk.details || pk.overUnder != null)) return null;
      var ml = { away: (pk.awayTeamOdds || {}).moneyLine, home: (pk.homeTeamOdds || {}).moneyLine };
      if ((ml.away == null || ml.home == null) && pk.moneyline) { var mm = pk.moneyline; ml = { away: Number(((mm.away || {}).close || {}).odds || ((mm.away || {}).open || {}).odds) || null, home: Number(((mm.home || {}).close || {}).odds || ((mm.home || {}).open || {}).odds) || null }; }
      return { provider: (pk.provider || {}).name || "", spread: pk.details || "", total: pk.overUnder != null ? pk.overUnder : "", ml: ml };
    }
    return null;
  }
  function oddsStrip(g, b) {
    var pv = (state.previews || {})[g.id] || {}, o = (pv.odds && (pv.odds.spread || pv.odds.total)) ? pv.odds : (b && b.odds && (b.odds.spread || b.odds.total)) ? b.odds : sbOdds(g);
    var wp = b && b.state === "in" && typeof b.wp === "number" ? b.wp : null;
    if (!o && wp == null) return null;
    var w = el("div", "odds-strip");
    if (wp != null && state.showScores) {
      var hp = Math.round(wp * 100), ap = 100 - hp, bar = el("div", "wp");
      var pct = function (x, raw) { return raw >= 0.995 ? ">99%" : raw <= 0.005 ? "<1%" : x + "%"; };
      var a = el("span", "wp-a", abbr(g, "away") + " " + pct(ap, 1 - wp)), h = el("span", "wp-h", abbr(g, "home") + " " + pct(hp, wp));
      a.style.flexGrow = Math.max(ap, 18); h.style.flexGrow = Math.max(hp, 18);
      var ac = badgeColor(g, "away"), hc = badgeColor(g, "home"); if (ac) a.style.background = ac; if (hc) h.style.background = hc;
      bar.appendChild(a); bar.appendChild(h); w.appendChild(bar);
      w.appendChild(el("p", "wp-note", "Live win chance · ESPN"));
    }
    if (o) {
      var od = el("div", "pv-odds");
      if (o.spread) od.appendChild(el("span", null, o.spread));
      if (o.total !== "" && o.total != null) od.appendChild(el("span", null, "O/U " + o.total));
      if (o.ml && o.ml.away != null && o.ml.home != null) od.appendChild(el("span", null, mlText(g, o)));
      od.appendChild(el("i", null, (status(g).kind === "upcoming" ? "" : "Pregame line · ") + (o.provider || "")));
      w.appendChild(od);
    }
    return w;
  }
  function badgeColor(g, sd) {
    var pc = pairColors(g)[sd]; if (hexOk(pc)) return pc;   // ESPN's colors, switched to the alternate when the two teams clash or it vanishes on the theme
    var c = g[sd + "Color"]; if (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) return c;
    var t = typeof teamByName === "function" ? teamByName(g[sd]) : null; return t && t.c1 ? t.c1 : "";
  }
  function boxShown(g) { return state.showScores || !!(state.boxOpen || {})[g.id]; }
  function boxGate(g) {
    var w = el("div", "pv-gate"); w.appendChild(el("span", null, "Scores are hidden, and the box score shows them."));
    var b = el("button", "pv-get", "Show box score"); b.type = "button";
    b.addEventListener("click", function (e) { e.stopPropagation(); state.boxOpen = state.boxOpen || {}; state.boxOpen[g.id] = true; keepScroll(renderGame); });
    w.appendChild(b); return w;
  }
  // where the game is played, once ESPN's game details have loaded
  function venueLine(g, cls) {
    var vn = !g.custom && bx.live[g.id] && bx.live[g.id].venue; if (!vn) return null;
    var lc = el("p", cls || "gv-meta gv-loc"); lc.appendChild(icon("pin"));
    lc.appendChild(document.createTextNode(vn.name + (vn.place ? ", " + vn.place : "") + (g.neutral ? " (neutral site)" : ""))); return lc;
  }
  // the slate tray: a live or finished game shows its box score where the preview was
  // before tip-off the venue leads; once a game is on, the score and box score lead and the venue sits at the foot (DJ, 3.123.2: it used to vanish at tip-off)
  function trayBlock(g) {
    var tb = trayBlock0(g), k = status(g).kind, vl = venueLine(g, "gv-loc tray-loc" + (k === "live" || k === "over" ? " tray-loc-end" : ""));
    if (tb && vl) { if (k === "live" || k === "over") tb.appendChild(vl); else tb.insertBefore(vl, tb.firstChild); }
    // an upcoming game: the venue and the betting line lead, then Claude's preview (or the button to write one), then the rest (DJ, 3.52.8)
    if (tb && k !== "live" && k !== "over") {
      var os = tb.querySelector(":scope > .odds-strip, :scope > .pv-odds");
      var hr = tb.querySelector(":scope > .pv-hrow"), sum = hr && hr.nextElementSibling, ctl = hr ? null : tb.querySelector(":scope > .cl-ctl");
      var qw = tb.querySelector(":scope > .ql-watch");   // football's players to watch sit right under the line (3.193.0)
      [vl, os, qw, hr, sum, ctl].filter(Boolean).reverse().forEach(function (n) { tb.insertBefore(n, tb.firstChild); });
    }
    return tb;
  }
  function trayBlock0(g) {
    var kind = status(g).kind, started = kind === "live" || kind === "over", b = boxFor(g);
    if (started) bxNeed(g);
    if (!BX_SPORT[g.league] || !boxLive(b)) {
      if (!started) bxNeed(g);
      // a started game: wait for its box score quietly rather than flashing the Claude button first
      var bxc = bx.live[g.id];
      if (started && BX_SPORT[g.league] && window.SLATE_SELF && !(bxc && bxc.err)) { var wt = el("div", "pv"); wt.appendChild(el("p", "pv-none bx-wait", "Loading the box score…")); return wt; }
      var pvb = previewBlock(g, true);
      if (!started) { try { qlPre(g, pvb); } catch (er) {} }   // football before kickoff: slimmer, with a player to watch per team
      // soccer before the start: no lineups or season stats in the quick look (DJ, Nov 28, 2026, 3.189.4: "only full page matchup", its Lineups section)
      var pvo = ((state.previews || {})[g.id] || {}).odds;
      // the line shows whether or not Claude has written a preview (the preview only carries it once it's written)
      if (!pvb.querySelector(".pv-odds")) { var os0 = oddsStrip(g, b); if (os0) pvb.insertBefore(os0, pvb.firstChild); }
      if (started && BX_SPORT[g.league]) pvb.insertBefore(el("p", "pv-none bx-wait", window.SLATE_SELF ? "Loading the box score…" : "The box score arrives with the next hourly refresh."), pvb.firstChild);
      return pvb;
    }
    var box = el("div", "pv bx");
    var os = oddsStrip(g, b); if (os) box.appendChild(os);
    if (!boxShown(g)) box.appendChild(boxGate(g));
    else {
      // the quick look: each part is its own dropdown, closed to start (top performers, the scoring or match summary, the box score)
      if (!state.trayDD) { try { state.trayDD = JSON.parse(localStorage.getItem("slate-traydd") || "{}") || {}; } catch (er) { state.trayDD = {}; } }
      var dd = function (k, title, node) {
        if (!node) return;
        // left open or closed, a section stays that way on every quick look (remembered on this phone)
        var key = k, on = !!state.trayDD[key], w = el("div", "tdd" + (on ? " open" : ""));
        var h = el("button", "tdd-h"); h.type = "button"; h.setAttribute("aria-expanded", on ? "true" : "false");
        h.appendChild(el("b", null, title)); h.appendChild(icon("more"));
        var body = el("div", "tdd-b"); body.appendChild(node); if (!on) body.hidden = true;
        h.addEventListener("click", function (e) { e.stopPropagation(); var o2 = !state.trayDD[key]; if (o2) state.trayDD[key] = 1; else delete state.trayDD[key]; try { localStorage.setItem("slate-traydd", JSON.stringify(state.trayDD)); } catch (er) {} w.classList.toggle("open", o2); body.hidden = !o2; h.setAttribute("aria-expanded", o2 ? "true" : "false"); });
        w.appendChild(h); w.appendChild(body); box.appendChild(w);
      };
      var sp0 = BX_SPORT[g.league], qf = null;
      // 3.192.0 (DJ, Nov 28): a finished game in a sport DJ has picked a design for gets the slim quick look (143-quick-final.js):
      // one line, the betting result, and the sport's snapshot. It carries the line's result, so the pregame line strip goes.
      try { qf = b.state === "post" ? qlFinal(g, b) : b.state === "in" ? qlLive(g, b) : null; } catch (er) { qf = null; }   // 3.193.0: football during the game too
      if (qf) { if (os && b.state === "post") os.remove(); box.appendChild(qf); }   // 3.193.1 (DJ: "Odds have gone away"): live games keep the line
      else {
      // a finished game: Claude's short read, or the button to have Claude write it, right here
      if (b.state === "post") { var rcw = el("div", "tray-rc"); try { previewSections(g, (state.previews || {})[g.id], rcw, "recap"); } catch (er) {} if (rcw.childNodes.length) dd("recap", "Recap", rcw); }
      dd("top", "Top performers", boxStars(g, b));
      if (sp0 === "soccer") dd("tl", "Match summary", socTimeline(g, b, true));
      else dd("sc", "Scoring", scoringBlock(g));
      if (sp0 !== "soccer") dd("box", "Box score", bxPlayers(g, b, true, false));  // 3.189.5 (DJ): soccer lineups and player stats live only on the full matchup page
      }
    }
    box.appendChild(el("p", "pv-at", bxStamp(b)));
    return box;
  }

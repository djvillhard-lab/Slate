  // ---- Preview lines that use what Claude already found (3.89.0, DJ: "look at all info found by Claude related to that team or
  // matchup and use that info when building one-liners. Only use info if it adds to the value") ----
  // No new Claude calls. Sources, all written earlier by someone's tap: this person's News page (mine/news-<date>: per game
  // "hits" and per team "line"), the game's News breakdown (newsdeep/<date>-g-<id>: number, watch) and the game's Claude preview
  // (state.previews[id].bullets). A note wins over the stats line only when it scores higher (see pvNoteScore); otherwise the
  // stats line stays as it was.
  // 3.90.2 (DJ: "I want them automatically update as new news pages are generated"): each source is watched live, so the
  // moment a News page (or a league briefing) is written or rewritten, the lines are rebuilt from it and every open card redraws.
  // A line from the older page is gone with it; a line that's still the best one stays the same.
  var PVN = { docs: {}, subs: {} };
  function pvnRedraw() {
    clearTimeout(pvT); pvT = setTimeout(function () { if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, 250);
    if (typeof agRedraw === "function") agRedraw();
  }
  function pvnGet(path) {
    if (!db || !uid) return (typeof nw !== "undefined" && nw.docs && nw.docs[path]) || null;
    if (!PVN.subs[path]) {
      PVN.subs[path] = true;
      db.doc(path).onSnapshot(function (sn) {
        var d = sn.exists ? sn.data() : null, was = JSON.stringify(PVN.docs[path] || null);
        PVN.docs[path] = d;
        if (JSON.stringify(d || null) !== was) pvnRedraw();
      }, function () { PVN.subs[path] = false; });
    }
    return PVN.docs[path] || (typeof nw !== "undefined" && nw.docs && nw.docs[path]) || null;
  }
  var PVN_SKIP = /^(schedule|record|ranking|rankings|matchup|home|away|tv|aggregate|standings|series|odds|tip|kickoff)$/i;
  // 3.191.2 (DJ: "News tag here doesn't provide value", on "Rivalry meets in Columbus at noon ET on FOX…"): the News line is for real
  // news only (injuries, coaching, trades, suspensions, debuts, milestones). Rivalry, storyline, history and revenge notes are the
  // matchup itself, which the one-liner already covers, so they no longer count as news
  var PVN_TOP = /^(final game|staff|coaching|coach|milestone|debut|return|returning|injury|injuries|trade|suspension|firing|fired|farewell|news)$/i;
  var PVN_WOW = /\b(final (match|game)|in charge|head coach|manager|interim|fired|sacked|resign|debut|returns?|back from|milestone|career[- ]high|all-time|franchise record|suspend|traded?|farewell|first time since)\b/i;
  var PVN_SPORT = { football: /\b(football|quarterback|touchdown)\b/i, bball: /\b(basketball|hoops|tip-off)\b/i, hockey: /\b(hockey|puck)\b/i, baseball: /\b(baseball|pitcher|inning)\b/i, soccer: /\b(soccer|football club)\b/i };
  // how much a note adds: its tag, then words that mark a real story. Under 0 = never use it
  function pvNoteScore(g, tag, text) {
    text = String(text || ""); tag = String(tag || "").trim();
    if (text.length < 20 || text.length > 130 || PVN_SKIP.test(tag)) return -1;
    var sport = BX_SPORT[g.league];
    // about another sport ("On the football side, Duke's Nate Sheppard…" under a basketball game): never
    for (var k in PVN_SPORT) if (k !== sport && PVN_SPORT[k].test(text) && !(sport === "soccer" && k === "football")) return -1;
    if (/^(on the [a-z]+ side|elsewhere|meanwhile)\b/i.test(text)) return -1;
    // 3.113.4 (DJ: "a team losing their game before isn't newsworthy"): a note that only says how a team's last game went
    // ("The Bucks lost to the Hawks on Sunday", tagged Last game or Result) is never the News line, unless it carries a real story
    if (/^(last game|last time out|result|results|last result|recent|form)$/i.test(tag) && !PVN_WOW.test(text)) return -1;
    if (/^(the )?[A-Z][\w.&' -]{1,40}? (lost|fell|beat|won|defeated|edged|routed|topped|dropped|blew out|held off|survived|rallied past)\b/.test(text) && !PVN_WOW.test(text)) return -1;
    if (/\b(tip|kickoff|puck drop|first pitch) is\b|\b\d{1,2}(:\d\d)? ?(am|pm) (et|ct|pt)\b|\b(noon|midnight) (et|ct|pt)\b|\bon (FOX|FS1|ABC|CBS|NBC|ESPN2?|ESPNU|TNT|TBS|truTV|Peacock|Prime Video|Apple TV|Paramount\+|BTN|SEC Network|ACC Network|Big Ten Network|NFL Network|NBA TV|MLB Network)\b/i.test(text)) return -1;   // start time and TV are on the card
    return (PVN_TOP.test(tag) ? 62 : 46) + (PVN_WOW.test(text) ? 16 : 0);
  }
  function pvnClean(t) {
    t = String(t || "").replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
    t = t.replace(/^(this is|this will be|it is|it's|it will be) /i, "");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  // which side a note's team is ("United States", "Duke Blue Devils" -> away / home), or ""
  function pvnSide(g, team) {
    var nz = function (x) { return String(x || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim(); }, n = nz(team); if (!n) return "";
    // the full name, the card's name, or the start of the full name at least as long as the card's ("Michigan" is not "Michigan State")
    return ["away", "home"].filter(function (sd) { var F = nz(g[sd]), S = nz(short(g, sd));
      return n === F || n === S || (F && F.indexOf(n + " ") === 0 && n.length >= S.length) || (S && n.indexOf(F + " ") === 0); })[0] || "";
  }
  // the best note Claude has for this game: { text, sc, side }, or null
  // 3.90.0 (DJ: "look at the news that's generated, determine one liners for specific matchups, and then add them to the matchup
  // cards in all games… and on my slate"): news first. Every note Claude has written today is gathered into one index, by game id
  // and by team; a card then only looks itself up there. Sources: this person's News page (game notes, top stories, team lines,
  // league notes), the league briefings (latest news, injuries) for the leagues on screen, a game breakdown News already has open,
  // and the game's Claude preview. Nothing new is asked of Claude.
  var PVN_IX = { key: [], ix: null };
  function pvnFirst(t) { t = String(t || ""); var m = /^(.{20,130}?[.!?])(\s|$)/.exec(t); return m ? m[1] : t; }
  function pvNewsIndex(lgs) {
    var day = state.date, page = pvnGet("mine/news-" + day), briefs = lgs.map(function (lg) { return pvnGet("newsdeep/" + day + "-l-" + lg); });
    var key = [day, lgs.join(","), page].concat(briefs);   // rebuilt whenever any source is a new snapshot
    if (PVN_IX.ix && PVN_IX.key.length === key.length && PVN_IX.key.every(function (x, i) { return x === key[i]; })) return PVN_IX.ix;
    var ix = { game: {}, team: [] }, team = function (name, tag, text, lg) { if (name && text) ix.team.push({ name: name, tag: tag, text: pvnFirst(text), lg: lg || "" }); };
    if (page) {
      (page.games || []).forEach(function (x) { if (x && x.id) ix.game[x.id] = (x.hits || []).map(function (h) { return { tag: h.tag, text: h.text, team: h.team }; }); });
      (page.top || []).forEach(function (x) { if (x && x.team) team(x.team, x.tag || "news", x.title && x.title.length >= 25 ? x.title : x.why, x.lg); });
      (page.teams || []).forEach(function (t) { if (t && t.line) team(t.name, t.tone === "alert" ? "news" : t.chip, t.line, t.lg); });
      (page.leagues || []).forEach(function (L) { ((L && L.hits) || []).forEach(function (h) { if (h.team) team(h.team, h.tag, h.text, L.key); }); });
    }
    briefs.forEach(function (d, i) { if (!d) return; var lg = lgs[i];
      if (d.lead && d.lead.team) team(d.lead.team, "news", d.lead.text || d.lead.title, lg);
      (d.latest || []).forEach(function (x) { if (x.team) team(x.team, x.tag, x.text, lg); });
      (d.injuries || []).forEach(function (x) { if (x.team && x.player) team(x.team, "injury", x.player + (x.status ? " (" + x.status + ")" : "") + ": " + String(x.text || "").replace(/^[A-Z]/, function (c) { return c.toLowerCase(); }), lg); });
    });
    PVN_IX.key = key; PVN_IX.ix = ix; return ix;
  }
  // 3.113.5 (DJ: "the Heat's depth beyond Giannis"): a line that puts a player on the wrong team. teams: [{ key, names }],
  // players: { name: team key } (names that both rosters share are left out). Only phrases that say whose player it is count:
  // "the Heat's Giannis", "Heat star Giannis", "the Heat's depth beyond Giannis", "the Heat without Giannis", "Giannis leads the Heat",
  // "Giannis and the Heat". "Giannis faces the Heat" is fine. Returns "Giannis plays for MIL" or ""
  function wrongTeamLine(s, teams, players) {
    s = String(s || "").replace(/[‘’]/g, "'");
    var esc = function (x) { return String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }, ROLE = "star|guard|forward|center|centre|big man|wing|rookie|veteran|quarterback|QB|receiver|running back|tight end|linebacker|goalkeeper|keeper|striker|winger|midfielder|defender|pitcher|ace|captain|scorer|sharpshooter|point guard|playmaker";
    var names = Object.keys(players).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < names.length; i++) {
      var P = names[i], own = players[P]; if (!new RegExp("(^|[^\\w])" + esc(P) + "(?![\\w])").test(s)) continue;
      for (var j = 0; j < teams.length; j++) { var t = teams[j]; if (t.key === own) continue;
        var N = "(?:" + t.names.map(esc).join("|") + ")", p = esc(P), w = "(?![\\w])";
        var rx = [N + "'s? (?:[\\w-]+ ){0,5}?(?:beyond|behind|besides|other than|around|without|apart from|alongside|next to|led by|anchored by|built around) " + p + w,
          N + "'s? (?:(?:" + ROLE + ") )?" + p + w, N + " (?:" + ROLE + ") " + p + w,
          N + " (?:will be |are |is |could be |may be )?(?:without|missing) " + p + w,
          p + " (?:leads|carries|paces|powers|anchors|headlines|and) (?:the )?" + N + w, p + "'s? " + N + w, p + " (?:of|for) (?:the )?" + N + w];
        if (rx.some(function (r) { return new RegExp("(^|[^\\w])" + r).test(s); })) return P + " plays for " + own;
      }
    }
    return "";
  }
  // the players ESPN lists for each side of this game (leaders, injuries, box score): { name: "away" | "home" }, names both share left out
  function pvnPlayers(g) {
    var cur = (bx.live || {})[g.id] || {}, sum = cur.sum, ids = {}, map = {}, dup = {};
    var put = function (n, sd) { n = String(n || "").trim(); if (!sd || n.length < 4) return; if (map[n] && map[n] !== sd) dup[n] = 1; map[n] = sd; };
    var name = function (n, sd) { n = String(n || "").replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/, "").trim(); if (!n) return; put(n, sd); var w = n.split(" "); if (w.length > 1) { put(w[w.length - 1], sd); put(w[0], sd); } };
    if (sum) {
      (((sum.header || {}).competitions || [])[0] || {}).competitors && sum.header.competitions[0].competitors.forEach(function (k) { ids[String((k.team || {}).id || "")] = k.homeAway; });
      (sum.leaders || []).forEach(function (L) { var sd = ids[String((L.team || {}).id || "")]; (L.leaders || []).forEach(function (c) { (c.leaders || []).forEach(function (x) { name((x.athlete || {}).displayName, sd); }); }); });
      (sum.injuries || []).forEach(function (t) { var sd = ids[String((t.team || {}).id || "")]; (t.injuries || []).forEach(function (x) { name((x.athlete || {}).displayName, sd); }); });
    }
    Object.keys(dup).forEach(function (n) { delete map[n]; });
    // a name that is also a team name ("Jordan", "Miami") never counts
    var tn = [g.away, g.home, short(g, "away"), short(g, "home")].join(" ").toLowerCase().split(/\s+/);
    Object.keys(map).forEach(function (n) { if (tn.indexOf(n.toLowerCase()) >= 0) delete map[n]; });
    return map;
  }
  function pvnTeams(g) {
    return ["away", "home"].map(function (sd) { var f = String(g[sd] || ""), w = f.split(" "), sh = short(g, sd);
      return { key: sd, names: [f, sh, w.length > 1 ? w[w.length - 1] : ""].filter(function (x, i, a) { return x && x.length >= 3 && a.indexOf(x) === i && !/^(The|State|City|United|FC|Club)$/i.test(x); }) }; });
  }
  function pvNote(g) {
    var pl = pvnPlayers(g), tms = pvnTeams(g);
    var out = [], add = function (tag, text, team) { var sc = pvNoteScore(g, tag, text); if (sc >= 0 && Object.keys(pl).length && wrongTeamLine(text, tms, pl)) sc = -1; if (sc >= 0) out.push({ text: pvnClean(text), sc: sc, side: pvnSide(g, team) }); };
    var ix = pvNewsIndex(pvnLeagues(g));
    (ix.game[g.id] || []).forEach(function (h) { add(h.tag, h.text, h.team); });
    ix.team.forEach(function (x) { if ((!x.lg || x.lg === g.league || BX_SPORT[x.lg] === BX_SPORT[g.league]) && pvnSide(g, x.name)) add(x.tag, x.text, x.name); });
    var deep = typeof nw !== "undefined" && nw.docs ? nw.docs["newsdeep/" + state.date + "-g-" + g.id] : null;
    if (deep) {
      (deep.watch || []).forEach(function (w) { add(w.tag, w.text, ""); });
      if (deep.number && deep.number.text) add("", deep.number.text, deep.number.team);
    }
    var pv = (state.previews || {})[g.id]; if (pv && pv.bullets) pv.bullets.forEach(function (b) { add("", b, ""); });
    out.sort(function (a, b) { return b.sc - a.sc; });
    return out[0] || null;
  }
  // the leagues whose briefings are read: the ones with a card drawn this session (each read at most every 10 minutes)
  var PVN_LGS = [];
  function pvnLeagues(g) { if (g && g.league && PVN_LGS.indexOf(g.league) < 0 && BX_SPORT[g.league]) PVN_LGS.push(g.league); return PVN_LGS; }
  // 3.89.1 (DJ: "keep the original one-liners. If something is newsworthy… include it as another line beneath the one-liner and
  // make it obvious that it's extra and news"): the stats line always stays; a newsworthy note gets its own line under it,
  // with a 📰 News tag. Newsworthy = a story tag (Last game, Coaching, Injury…) or story words; plain "Slump"/"Rebounding" notes don't show
  // 3.89.3 (DJ: "I don't like the news USA line going to two lines"): one line on every screen. The note is tightened by rule
  // (no "USA:" prefix, filler words out, "before he starts at Manchester United" -> "before joining Man United"); if it still
  // doesn't fit, it's cut at a clause ("Pochettino's final match in charge"); an ellipsis only as the last resort
  var PVN_CLUB = [[/\bManchester United\b/g, "Man United"], [/\bManchester City\b/g, "Man City"], [/\bTottenham Hotspur\b/g, "Tottenham"], [/\bUnited States\b/g, "USA"], [/\bhead coach\b/gi, "coach"]];
  function pvnShorts(t) {
    var a = String(t || "");
    PVN_CLUB.forEach(function (r) { a = a.replace(r[0], r[1]); });
    a = a.replace(/\b(officially|reportedly|currently|still|now|already|actually) /gi, "")
      .replace(/\bbefore (he|she|they) (starts?|begins?|takes over) (at|with) /i, "before joining ")
      .replace(/\b(after|before) (he|she|they) (joins?|moves? to) /i, "$1 joining ")
      .replace(/ (on |this |next )?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i, "")
      .replace(/\s+/g, " ").trim();
    return pvCuts([a]);
  }
  // 3.90.5 (DJ: the news lines still ended in "…" on All games): every shorter version of a line, longest first, so pvFit can keep
  // the longest that fits. Asides in brackets go first ("Duncan Robinson (quad) and…" -> "Duncan Robinson and…"), then the line is
  // cut where a clause starts ("…are out for the season" -> "…are out"; "The Irish open Players Era against…" -> "The Irish open Players Era")
  var PVN_BRK = /(,|;| -| (?:before|after|as|while|with|since|when|following|ahead of|because|for|against|in|at|on|and|but|to|from|despite|over|than|including|amid|behind|into|until) )/g;
  // 3.113.2 (DJ: accuracy review): a cut never leaves a fragment: a word or two after a comma ("…Eastern Michigan, looks") or a verb
  // waiting for its object ("Detroit Mercy takes")
  var PVN_DANGLE = /(, \S+( \S+)?|\b(takes?|visits?|faces?|hosts?|plays?|leads?|meets?|looks?|seeks?|aims?|brings?|puts?|is|are|has|have|was|were|will|gets?|goes|go|returns?|heads?|tries|try|wants?|needs?|says?))$/i;
  function pvCuts(list) {
    var out = [];
    list.forEach(function (t) {
      t = String(t || "").replace(/\s+/g, " ").trim(); if (!t) return;
      var np = t.replace(/\s*\([^)]{1,40}\)/g, "").replace(/\s+/g, " ").trim();
      [t, np].forEach(function (b) {
        out.push(b); var m; PVN_BRK.lastIndex = 0;
        while ((m = PVN_BRK.exec(b))) { var c = b.slice(0, m.index).replace(/[,;:\s-]+$/, "").replace(/\s+(the|a|an|of|and|or|to|his|her|their|its)$/i, ""); if (c.length >= 18 && !PVN_DANGLE.test(c)) out.push(c); }
      });
    });
    out = out.filter(function (x, i) { return x && out.indexOf(x) === i; });
    return out.sort(function (a, b) { return b.length - a.length; });
  }
  function pvNewsNode(g) {
    var n = null; try { n = pvNote(g); } catch (e) {}
    if (!n || n.sc < 60) return null;
    var st = (PV[g.id] || {}).text || ""; if (st && (st.indexOf(n.text) >= 0 || n.text.indexOf(st) >= 0)) return null;
    var p = el("p", "hl hl-news"), tg = el("span", "hl-news-tag", "📰 News"), tx = el("span", "hl-news-t"), alts = pvnShorts(n.text);
    p.appendChild(tg); p.appendChild(tx); tx.textContent = alts[0]; p.title = n.text;
    if (n.side) p.dataset.side = n.side;
    // 3.113.5 (DJ: "Text cut off", the line ended "…how thei…"): the whole note shows, wrapping to a second line when it has to.
    // Cutting it at a clause made fragments, and the ellipsis cut it mid-word
    return p;
  }
  // once a line is on screen: the longest version that fits on one line (3.89.6). Skipped while it isn't laid out
  // (a folded time group); the next redraw fits it then
  function pvFit(p, node, alts) {
    if (alts.length < 2) return;
    requestAnimationFrame(function () {
      if (!p.isConnected || !p.clientWidth) return;
      for (var i = 1; i < alts.length && p.scrollWidth > p.clientWidth + 1; i++) { if (node.nodeType === 3) node.nodeValue = alts[i]; else node.textContent = alts[i]; }
    });
  }
  // 3.89.6 (DJ: the one-liner wrapped to a second line on the folded Duo): the stats line is one line too. Shorter versions,
  // longest first: both facts with filler cut ("going into the second leg"), then the strongest fact alone, then that fact cut
  function pvStatAlts(p) {
    var cut = function (t) { return String(t || "").replace(/ going into the second leg/, "").replace(/ in their last five\b/, " in the last five").replace(/\bis only a ([\d.]+)-point favorite/, "is only a $1-pt favorite").replace(/\b(is|are) a ([\d.]+)-point favorite/, "$1 a $2-pt favorite").replace(/\s+/g, " ").trim(); };
    // Nov 20, 2026 (DJ: "I'd like to know who Murray State lost to"): the four-of-five line keeps the opponent when it's shortened
    // ("Murray State's lone loss in five: NC State") instead of losing the clause that names it
    var odd = function (t) { var m = /^(.+?) (?:have|has) (won|lost) four of (?:their|its) last five, (?:losing only to|beating only) (.+?)(?: last time out)?(;.*)?$/.exec(String(t || "")); if (!m) return [];
      var own = m[1] + (/s$/.test(m[1]) ? "'" : "'s"), what = m[2] === "won" ? "loss" : "win", rest = m[4] || "";
      return [own + " only " + what + " in the last five: " + m[3] + rest, own + " lone " + what + " in five: " + m[3] + rest, own + " lone " + what + " in five: " + m[3]]; };
    var out = [p.text, cut(p.text)].concat(odd(p.text));
    if (p.f && p.f !== p.text) out.push(p.f, cut(p.f)), out = out.concat(odd(p.f));
    // last: the strongest fact up to its first clause ("No. 10 Illinois visits No. 5 Duke after Ivisic's 28-point outing" -> "...visits No. 5 Duke")
    // then every shorter cut of those (pvCuts), longest first; the two-fact line always comes before a cut of it
    var head = out.filter(function (x, i) { return x && out.indexOf(x) === i; });
    return head.concat(pvCuts(head).filter(function (x) { return head.indexOf(x) < 0 && x.length < head[head.length - 1].length; }));
  }

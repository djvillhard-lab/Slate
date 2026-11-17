  // ---- Preview lines that use what Claude already found (3.89.0, DJ: "look at all info found by Claude related to that team or
  // matchup and use that info when building one-liners. Only use info if it adds to the value") ----
  // No new Claude calls. Sources, all written earlier by someone's tap: this person's News page (mine/news-<date>: per game
  // "hits" and per team "line"), the game's News breakdown (newsdeep/<date>-g-<id>: number, watch) and the game's Claude preview
  // (state.previews[id].bullets). A note wins over the stats line only when it scores higher (see pvNoteScore); otherwise the
  // stats line stays as it was.
  var PVN = { docs: {}, at: {} };
  function pvnGet(path) {
    if (typeof nw !== "undefined" && nw.docs && nw.docs[path] !== undefined) return nw.docs[path];   // News already has it open
    if (!db || !uid) return null;
    if (!PVN.at[path] || Date.now() - PVN.at[path] > 10 * 60000) {
      PVN.at[path] = Date.now();
      db.doc(path).get().then(function (sn) {
        var d = sn.exists ? sn.data() : null, was = JSON.stringify(PVN.docs[path] || null);
        PVN.docs[path] = d;
        if (JSON.stringify(d || null) !== was) { clearTimeout(pvT); pvT = setTimeout(function () { if (state.view === "lineup" || isDuo) keepScroll(renderLineup); }, 250); }
      }, function () {});
    }
    return PVN.docs[path] || null;
  }
  var PVN_SKIP = /^(schedule|record|ranking|rankings|matchup|home|away|tv|aggregate|standings|series|odds|tip|kickoff)$/i;
  var PVN_TOP = /^(last game|final game|staff|coaching|coach|storyline|milestone|debut|return|returning|injury|injuries|trade|suspension|firing|fired|rivalry|revenge|history|farewell|news)$/i;
  var PVN_WOW = /\b(final (match|game)|last (match|game)|in charge|head coach|manager|interim|fired|sacked|resign|debut|returns?|back from|milestone|career[- ]high|all-time|franchise record|suspend|traded?|farewell|first time since|rivalry)\b/i;
  var PVN_SPORT = { football: /\b(football|quarterback|touchdown)\b/i, bball: /\b(basketball|hoops|tip-off)\b/i, hockey: /\b(hockey|puck)\b/i, baseball: /\b(baseball|pitcher|inning)\b/i, soccer: /\b(soccer|football club)\b/i };
  // how much a note adds: its tag, then words that mark a real story. Under 0 = never use it
  function pvNoteScore(g, tag, text) {
    text = String(text || ""); tag = String(tag || "").trim();
    if (text.length < 20 || text.length > 130 || PVN_SKIP.test(tag)) return -1;
    var sport = BX_SPORT[g.league];
    // about another sport ("On the football side, Duke's Nate Sheppard…" under a basketball game): never
    for (var k in PVN_SPORT) if (k !== sport && PVN_SPORT[k].test(text) && !(sport === "soccer" && k === "football")) return -1;
    if (/^(on the [a-z]+ side|elsewhere|meanwhile)\b/i.test(text)) return -1;
    if (/\b(tip|kickoff|puck drop|first pitch) is\b|\b\d{1,2}(:\d\d)? ?(am|pm) (et|ct|pt)\b/i.test(text)) return -1;   // start time and TV are on the card
    return (PVN_TOP.test(tag) ? 62 : 46) + (PVN_WOW.test(text) ? 16 : 0);
  }
  function pvnClean(t) {
    t = String(t || "").replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
    t = t.replace(/^(this is|this will be|it is|it's|it will be) /i, "");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  // which side a note's team is ("United States", "Duke Blue Devils" -> away / home), or ""
  function pvnSide(g, team) {
    var n = String(team || "").toLowerCase().replace(/[^a-z0-9 ]/g, ""); if (!n) return "";
    return ["away", "home"].filter(function (sd) {
      return [g[sd], short(g, sd), g[sd + "Short"]].some(function (w) { w = String(w || "").toLowerCase().replace(/[^a-z0-9 ]/g, ""); return w.length >= 3 && (n === w || n.indexOf(w + " ") === 0 || w.indexOf(n) === 0); });
    })[0] || "";
  }
  // the best note Claude has for this game: { text, sc, side }, or null
  function pvNote(g) {
    var out = [], add = function (tag, text, team) { var sc = pvNoteScore(g, tag, text); if (sc >= 0) out.push({ text: pvnClean(text), sc: sc, side: pvnSide(g, team) }); };
    var day = state.date, page = pvnGet("mine/news-" + day);
    if (page) {
      (page.games || []).forEach(function (x) { if (x && x.id === g.id) (x.hits || []).forEach(function (h) { add(h.tag, h.text, h.team); }); });
      // a team's one line, when it isn't about tonight's start time ("At 1-3, the Flyers host… at 7 pm ET")
      (page.teams || []).forEach(function (t) { var sd = pvnSide(g, t && t.name); if (sd && t.line) add(t.tone === "alert" ? "news" : t.chip, t.line, t.name); });
    }
    var deep = pvnGet("newsdeep/" + day + "-g-" + g.id);
    if (deep) {
      (deep.watch || []).forEach(function (w) { add(w.tag, w.text, ""); });
      if (deep.number && deep.number.text) add("", deep.number.text, deep.number.team);
    }
    var pv = (state.previews || {})[g.id]; if (pv && pv.bullets) pv.bullets.forEach(function (b) { add("", b, ""); });
    out.sort(function (a, b) { return b.sc - a.sc; });
    return out[0] || null;
  }
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
    var out = [a], m = /^(.{18,}?)(,| -| before | after | as | while | with | since | when | following | ahead of | because )/.exec(a);
    if (m && m[1].length < a.length) out.push(m[1].replace(/[,;:\s]+$/, ""));
    return out;
  }
  function pvNewsNode(g) {
    var n = null; try { n = pvNote(g); } catch (e) {}
    if (!n || n.sc < 60) return null;
    var st = (PV[g.id] || {}).text || ""; if (st && (st.indexOf(n.text) >= 0 || n.text.indexOf(st) >= 0)) return null;
    var p = el("p", "hl hl-news"), tg = el("span", "hl-news-tag", "📰 News"), tx = el("span", "hl-news-t"), alts = pvnShorts(n.text);
    p.appendChild(tg); p.appendChild(tx); tx.textContent = alts[0]; p.title = n.text;
    if (n.side) p.dataset.side = n.side;
    // once it's on screen: the longest version that fits on the one line
    pvFit(p, tx, alts);
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
    var out = [p.text, cut(p.text)];
    if (p.f && p.f !== p.text) out.push(p.f, cut(p.f));
    // last: the strongest fact up to its first clause ("No. 10 Illinois visits No. 5 Duke after Ivisic's 28-point outing" -> "...visits No. 5 Duke")
    var last = out[out.length - 1], m = /^(.{20,}?)( after | and | as | with | while | following |; )/.exec(last); if (m) out.push(m[1]);
    return out.filter(function (x, i) { return x && out.indexOf(x) === i; });
  }

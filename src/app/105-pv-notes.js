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
  // the line a slate card shows before the game: the stats line, or Claude's note when it says more
  function pvBlend(g) {
    var p = PV[g.id] || {}, st = p.text || "", n = null;
    try { n = pvNote(g); } catch (e) {}
    var stSc = p.fb ? 0 : (p.sc || (st ? 50 : 0));
    if (!n || n.sc <= stSc) return st ? { text: st, tm: p.tm || "" } : null;
    var tm = n.side ? String(abbr(g, n.side) || "").toUpperCase() : "";
    // room for the stats line's best fact too: "Pochettino's final match in charge…; USA leads 6-0 on aggregate"
    var f = !p.fb && p.f ? p.f : "", both = f && n.text.length + f.length <= 112 && n.text.indexOf(f) < 0;
    return { text: both ? n.text + "; " + f : n.text, tm: both ? "" : tm };
  }

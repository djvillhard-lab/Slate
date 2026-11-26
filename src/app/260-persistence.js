  // ---------- persistence ----------
  function lineupRef(date) { return db.collection("data/users/" + uid).doc("lineup-" + (date || state.date)); }
  function saveLineup() {
    if (!uid) {
      var lo = localGet(), all = lo.lineups || {}, keep = {};
      all[state.date] = { v: 2, ids: state.slateIds.slice(), added: state.lineup.added.slice(), removed: state.lineup.removed.slice(), custom: (state.lineup.custom || []).slice() };
      Object.keys(all).sort().slice(-14).forEach(function (k) { keep[k] = all[k]; });
      lo.lineups = keep; localPut(lo); return;
    }
    if (!db) return;
    computeSlate(); state.lineup.ids = state.slateIds.slice();
    writer.next = { date: state.date, body: { v: 2, date: state.date, ids: state.slateIds.slice(), added: state.lineup.added.slice(), removed: state.lineup.removed.slice(), custom: (state.lineup.custom || []).slice(), updatedAt: new Date().toISOString() } };
    if (!writer.busy) flushLineup();
    followSoon();
  }
  // Tell the server right away which games to follow (your slate, your teams' games, things added by hand), so an
  // added game gets its alerts and live notification on the next minute instead of after the 10-minute tick job.
  var followTimer = null, followSent = "";
  function followSoon() {
    clearTimeout(followTimer);
    followTimer = setTimeout(function () {
      var pass = slatePass(); if (!pass || !uid || state.date !== todayInHome() || !state.lineupLoaded || !state.settingsLoaded || state.slateStatus !== "ready") return;
      var body = { date: state.date, slate: (state.slateIds || []).slice(), customs: (state.lineup.custom || []).slice(),
        mine: games().filter(function (g) { return !g.custom && hasFav(g); }).map(function (g) { return g.id; }) };
      var key = JSON.stringify(body); if (key === followSent) return;
      body.pass = pass;
      fetch("/api/follow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok) followSent = key; }, function () {});
    }, 1500);
  }
  function flushLineup() {
    var job = writer.next; writer.next = null; if (!job) return;
    writer.busy = true; writer.curDate = job.date;
    var ref = lineupRef(job.date);
    ref.set(job.body).then(done, function (e) { if (e && e.code === "unavailable") setTimeout(function () { ref.set(job.body).then(done, fail); }, 600 + Math.random() * 800); else fail(e); });
    function done() {
      mirrored[job.date] = true;
      if (!state.isOwner) { writer.busy = false; flushLineup(); return; }
      db.doc("mine/lineup-" + job.date).set({ date: job.date, ids: job.body.ids, custom: job.body.custom, updatedAt: job.body.updatedAt })
        .then(function () { writer.busy = false; flushLineup(); }, function () { writer.busy = false; flushLineup(); });
    }
    function fail(e) { writer.busy = false; toast(e && e.code === "quota_exceeded" ? "Storage is full; couldn't save" : "Couldn't save. Try again."); flushLineup(); }
  }
  function pendingFor(date) { return (writer.busy && writer.curDate === date) || (writer.next && writer.next.date === date); }
  function saveSettings() {
    if (!uid) { var lo = localGet(); lo.teams = state.teams.slice(); lo.rules = clone(state.rules || RULE_DEFAULTS); lo.tickerLeague = state.tickerLeague || ""; localPut(lo); return; }
    if (!db || !state.settingsLoaded) return;
    if (setWriter.busy) { setWriter.dirty = true; return; }
    setWriter.busy = true; setWriter.dirty = false;
    db.collection("data/users/" + uid).doc("settings").set({ teams: state.teams.slice(), look: state.look, accent: state.accent, textSize: state.textSize, textSizeWide: state.textSizeWide || "", font: state.font || "archivo", device: state.device || "", navPos: state.navPos, watchVia: state.watchVia, foldNudge: Number(state.foldNudge) || 0, rules: clone(state.rules || RULE_DEFAULTS), tickerLeague: state.tickerLeague || "", showScores: !!state.showScores, hiddenLeagues: (state.hiddenLeagues || []).slice(), gamesOrder: (state.gamesOrder || []).slice(), players: (state.players || []).slice(), teamOrder: (state.teamOrder || []).slice(), pvStyle: state.pvStyle || "para", slateSort: state.slateSort || "time", slateLgOrder: (state.slateLgOrder || []).slice(), slateFold: Object.assign({}, state.slateFold || {}), newsletters: (state.newsletters || []).slice(), walRules: Object.assign({}, state.walRules || {}) }).then(function () {
      setWriter.busy = false; if (setWriter.dirty) saveSettings();
    }, function () { setWriter.busy = false; toast("Couldn't save settings."); });
    saveNotify();
    followSoon();
  }
  // Keep the stored slate (which the alert task reads) in step with the rules.
  function maybeAutoAdd() {
    if (!state.lineupLoaded || !state.settingsLoaded) return;
    if (!slatePass()) return;  // a phone that isn't signed in only views
    if (state.slateStatus !== "ready" && state.slateStatus !== "empty") return;
    if (uid && (!lineupFromServer || pendingFor(state.date))) return;
    computeSlate();
    var a = state.slateIds.slice().sort().join(","), b = (state.lineup.ids || []).slice().sort().join(",");
    if (a !== b) saveLineup();
  }
  // the server is the record of which live notifications are on (a swiped-away one is switched off there):
  // coming back to Slate, take its live switches unless a change of ours is still being saved
  function pullLiveSwitches() {
    if (!state.isOwner || !db || !state.notifyLoaded || ntWriter.busy || ntWriter.dirty) return;
    db.doc("prefs/notify").get().then(function (ps) {
      if (!ps.exists || ntWriter.busy || ntWriter.dirty) return;
      var la = (ps.data() || {}).liveAct || {}, mine = state.notify.liveAct = state.notify.liveAct || {}, ch = false;
      if (la.games && JSON.stringify(la.games) !== JSON.stringify(mine.games || {})) { mine.games = Object.assign({}, la.games); ch = true; }
      if (la.board && JSON.stringify(la.board) !== JSON.stringify(mine.board || {})) { mine.board = Object.assign({}, la.board); ch = true; }
      if (ch) render();
    }, function () {});
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) pullLiveSwitches(); });
  setInterval(function () { if (!document.hidden) pullLiveSwitches(); }, 60000);
  function saveNotify() {
    if (!state.isOwner || !db || !uid || !state.notifyLoaded || !state.settingsLoaded) return;
    if (ntWriter.busy) { ntWriter.dirty = true; return; }
    ntWriter.busy = true; ntWriter.dirty = false;
    var body = clone(state.notify);
    body.teams = state.teams.slice(); body.rules = clone(state.rules || RULE_DEFAULTS); body.spoilerFree = !state.showScores;
    body.players = (state.players || []).slice(-40).map(function (x) { return { id: String(x.id), lg: x.lg, name: x.name || "", team: x.team || "", teamName: x.teamName || "" }; });  // players you follow: their alerts (3.117.0)
    body.updatedAt = new Date().toISOString();
    try { body.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}  // alert times use this phone's time zone
    db.doc("prefs/notify").set(body).then(function () { ntWriter.busy = false; if (ntWriter.dirty) saveNotify(); },
      function () { ntWriter.busy = false; toast("Couldn't save notification settings."); });
  }
  function subscribe() {
    if (unsubSlate) { unsubSlate(); unsubSlate = null; }
    (state.unsubParts || []).forEach(function (f) { try { f(); } catch (e) {} }); state.unsubParts = []; state.slateParts = {};
    if (unsubLineup) { unsubLineup(); unsubLineup = null; }
    if (unsubScores) { unsubScores(); unsubScores = null; }
    clearTimeout(slateTimer);
    state.slate = null; state.slateStatus = "loading"; state.lineup = normLineup(null);
    state.scores = {}; state.scoresAt = null; state.lineupAutoDone = false; lineupFromServer = false; state.previews = {}; state.previewsAt = null; state.previewLeagues = {};
    render();
    var forDate = state.date;
    slateTimer = setTimeout(function () { if (forDate === state.date && state.slateStatus === "loading") { state.slateStatus = "timeout"; render(); } }, 10000);
    unsubSlate = db.doc("slates/" + forDate).onSnapshot(function (snap) {
      if (forDate !== state.date) return;
      if (!snap.metadata.fromCache) clearTimeout(slateTimer);
      if (snap.exists) { state.slate = snap.data(); state.slateStatus = "ready"; }
      else if (!snap.metadata.fromCache) { state.slate = null; state.slateStatus = games().length ? "ready" : "empty"; }
      maybeAutoAdd(); render(); setTimeout(livePoll, 300);
    }, function () { clearTimeout(slateTimer); state.slateStatus = "error"; render(); });
    SLATE_PARTS.forEach(function (k) {
      state.unsubParts.push(db.doc("slates/" + forDate + "-" + k).onSnapshot(function (snap) {
        if (forDate !== state.date) return;
        state.slateParts[k] = snap.exists ? snap.data() : null;
        if (snap.exists && state.slateStatus !== "ready") { state.slateStatus = "ready"; clearTimeout(slateTimer); }
        maybeAutoAdd(); render(); setTimeout(livePoll, 300);
      }, function () {}));
    });
    if (unsubPreviews) { unsubPreviews(); unsubPreviews = null; }
    unsubPreviews = db.doc("previews/" + forDate).onSnapshot(function (snap) {
      if (forDate !== state.date) return;
      var d = snap.exists ? snap.data() : null;
      state.previews = d && d.games && typeof d.games === "object" ? d.games : {};
      state.previewsAt = d ? (d.refreshedAt || d.updatedAt) : null; state.previewLeagues = d && d.leagues && typeof d.leagues === "object" ? d.leagues : {}; renderFoot();
      if (state.view === "game") keepScroll(renderGame);
      var open = document.querySelector("#lineup-body .tray");
      if (open) keepScroll(renderLineup);
    }, function () {});
    if (unsubBox) { unsubBox(); unsubBox = null; }
    state.box = {}; state.boxAt = null;
    unsubBox = db.doc("box/" + forDate).onSnapshot(function (snap) {
      if (forDate !== state.date) return;
      var d = snap.exists ? snap.data() : null;
      state.box = d && d.games && typeof d.games === "object" ? d.games : {}; state.boxAt = d ? d.updatedAt : null;
      if (state.view === "game") keepScroll(renderGame);
      if (document.querySelector("#lineup-body .tray")) keepScroll(renderLineup);
    }, function () {});
    unsubScores = db.doc("scores/" + forDate).onSnapshot(function (snap) {
      if (forDate !== state.date) return;
      var d = snap.exists ? snap.data() : null;
      state.scores = d && d.games && typeof d.games === "object" ? d.games : {};
      state.scoresAt = d ? d.updatedAt : null;
      render();
    }, function () {});
    if (uid) {
      state.lineupLoaded = false;
      unsubLineup = lineupRef(forDate).onSnapshot(function (snap) {
        if (forDate !== state.date || pendingFor(forDate)) return;
        var d = snap.exists ? snap.data() : null;
        state.lineup = normLineup(d);
        state.lineupAutoDone = !!(d && d.autoDone);
        if (!snap.metadata.fromCache) lineupFromServer = true;
        state.lineupLoaded = true; maybeAutoAdd();
        if (state.isOwner && lineupFromServer && !mirrored[forDate] && !pendingFor(forDate) && d) saveLineup();
        render();
      }, function () { state.lineupLoaded = true; });
      setTimeout(function () { if (forDate === state.date) state.lineupLoaded = true; }, 10000);
    } else {
      var ll = (localGet().lineups || {})[forDate] || {};
      state.lineup = normLineup(ll);
      state.lineupAutoDone = !!ll.autoDone; state.lineupLoaded = true; maybeAutoAdd(); render();
    }
  }


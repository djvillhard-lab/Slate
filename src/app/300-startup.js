  // ---------- capabilities ----------
  function waitForClaude(ms) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function poll() { if (window.claude && typeof window.claude.use === "function") return resolve(window.claude); if (Date.now() - t0 > ms) return resolve(null); setTimeout(poll, 100); })();
    });
  }
  waitForClaude(4000).then(function (c) {
    if (!c) { state.slateStatus = "nodb"; render(); return; }
    return Promise.all([c.use("db"), c.use("user")]).then(function (res) {
      db = res[0]; var user = res[1];
      if (!db) { state.slateStatus = "nodb"; render(); return; }
      var idp = user && typeof user.id === "function" ? user.id() : Promise.resolve(null);
      var ownp = !user ? Promise.resolve(false) : typeof user.isOwner === "function" ? Promise.resolve(user.isOwner()) : Promise.resolve(true);
      return Promise.all([Promise.resolve(idp).catch(function () { return null; }), ownp.catch(function () { return false; })]).then(function (r) {
        var id = r[0]; uid = id || null; state.isOwner = !!r[1];
        if (!state.isOwner) state.teams = [];
        if (uid) {
          actLoad();
          db.collection("data/users/" + uid).doc("settings").get().then(function (snap) {
            var d = snap.exists ? snap.data() : null;
            if (d) {
              if (Array.isArray(d.teams)) state.teams = d.teams.slice();
              if (d.look) state.look = d.look;
              if (d.accent) state.accent = d.accent;
              if (d.textSize) state.textSize = d.textSize;
              if (typeof d.textSizeWide === "string") state.textSizeWide = d.textSizeWide;
              if (d.device === "duo" || d.device === "iphone") state.device = d.device;
              if (d.navPos) state.navPos = d.navPos;
              if (d.watchVia === "apps" || d.watchVia === "yttv") state.watchVia = d.watchVia;
              if (typeof d.foldNudge === "number") state.foldNudge = d.foldNudge;
              state.rules = normRules(d.rules || (d.autoAdd === false ? { favorites: false } : null));
              if (typeof d.tickerLeague === "string") state.tickerLeague = d.tickerLeague;
              if (typeof d.showScores === "boolean") state.showScores = d.showScores;
              if (Array.isArray(d.hiddenLeagues)) state.hiddenLeagues = d.hiddenLeagues.slice();
              if (Array.isArray(d.gamesOrder)) state.gamesOrder = d.gamesOrder.slice();
              if (Array.isArray(d.players)) state.players = d.players.slice();
              if (Array.isArray(d.teamOrder)) state.teamOrder = d.teamOrder.slice();
              if (d.pvStyle === "bullets" || d.pvStyle === "para") state.pvStyle = d.pvStyle;
              if (d.slateSort === "league" || d.slateSort === "time") state.slateSort = d.slateSort;
              if (Array.isArray(d.slateLgOrder)) state.slateLgOrder = d.slateLgOrder.slice();
              if (d.slateFold && typeof d.slateFold === "object") state.slateFold = Object.assign({}, d.slateFold);
              if (d.walRules && typeof d.walRules === "object") state.walRules = Object.assign({}, d.walRules);
              if (Array.isArray(d.newsletters)) state.newsletters = d.newsletters.filter(function (k) { return NL_LIST.some(function (x) { return x[0] === k; }); });
              applyLook(); applyLayout();
            }
            state.settingsLoaded = true; maybeAutoAdd(); render();
            if (!state.isOwner) { state.notifyLoaded = true; render(); return; }
            db.doc("prefs/notify").get().then(function (ps) {
              state.notify = mergeDefaults(NOTIFY_DEFAULTS, ps.exists ? ps.data() : null);
              state.notifyLoaded = true; render();
              var tz0 = ""; try { tz0 = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
              if (!ps.exists || (tz0 && (ps.data() || {}).tz !== tz0)) saveNotify();
            }, function () { state.notifyLoaded = true; });
          }, function () { state.settingsLoaded = true; });
        } else { var lo0 = localGet(); if (Array.isArray(lo0.teams)) state.teams = lo0.teams.slice(); state.rules = normRules(lo0.rules); if (lo0.tickerLeague) state.tickerLeague = lo0.tickerLeague; state.settingsLoaded = true; render(); }
        subscribe();
        if (state.isOwner) db.doc("prefs/load").onSnapshot(function (s) { state.loadReq = s.exists ? s.data() : null; render(); }, function () {});
      });
    });
  }).catch(function () { state.slateStatus = "nodb"; render(); });

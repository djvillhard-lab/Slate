  // ---- All games: one line of controls (3.184.0, DJ picked option A of the simplicity review's mockups, Nov 27 2026) ----
  // The filter words (All, Best, National TV, or a league's conferences) and the 2 columns, Standings and Live buttons used
  // to be two lines: the words in the page's top, the buttons as the first row of the list. Now the buttons sit at the right
  // end of the words' line. Nothing about the buttons changes: renderGames still builds its row (160-all-games.js,
  // 132-standings.js), and this moves the row's buttons, handlers and all, into #ag-acts beside #substrip.
  // Not in the old "duo" layout (isDuo), which has its own top.
  (function () {
    function agLine() {
      var ss = $("substrip"); if (!ss) return null;
      var w = $("ag-line");
      if (!w) {
        w = el("div", "ag-line"); w.id = "ag-line"; ss.parentNode.insertBefore(w, ss); w.appendChild(ss);
        var a = el("div", "lo-row gm-live ag-acts"); a.id = "ag-acts"; a.hidden = true; w.appendChild(a);
      }
      return w;
    }
    function agLineSync() {
      var w = agLine(); if (!w) return;
      var acts = $("ag-acts"), body = $("games-body"), on = state.view === "games" && !isDuo && !!body;
      var row = on ? body.querySelector(":scope > .lo-row.gm-live") : null;
      if (row && row.firstChild) { acts.textContent = ""; while (row.firstChild) acts.appendChild(row.firstChild); row.hidden = true; }
      var show = on && !!acts.firstChild;
      if (acts.hidden === show) acts.hidden = !show;
      if (w.classList.contains("has-acts") !== show) w.classList.toggle("has-acts", show);
    }
    var rg0 = renderGames; renderGames = function () { rg0.apply(this, arguments); agLineSync(); };
    var rt0 = renderTop; renderTop = function () { rt0.apply(this, arguments); agLineSync(); };
  })();

  // ---------- Send feedback (Settings → Send feedback) ----------
  // A sheet with a type (Problem, Idea, Other), a text box and an optional screenshot from Photos. The app adds what
  // DJ needs to follow up: who sent it, the page they were on before Settings, the app version and the phone layout.
  // Saved privately through /api/feedback (worker/feedback.js); a daily report in DJ's Claude project lists new items.
  // Everything here is inside its own function so its names can't collide with other pages (the thumbs feature
  // uses fb*, so this uses sfb*).
  (function () {
    var sfb = { kind: "bug", shot: "", lastPage: "", lastDetail: "", busy: false };
    var CSS = [
      ".sfb-sheet textarea { width: 100%; min-height: 140px; box-sizing: border-box; border-radius: 8px; border: 1.5px solid var(--line); background: var(--bg); color: var(--ink); padding: 12px; font: 700 16px/1.45 var(--font); resize: vertical; }",
      ".sfb-sheet textarea::placeholder { color: var(--dim); font-weight: 700; }",
      ".sfb-sheet .seg { grid-template-columns: repeat(3, 1fr); }",
      ".sfb-sheet .seg button { min-height: 44px; }",
      ".sfb-shot { display: flex; align-items: center; gap: 12px; }",
      ".sfb-shot img { width: 56px; height: 56px; object-fit: cover; border-radius: 4px; border: 1px solid var(--hair); }",
      ".sfb-shot button { min-height: 44px; }",
      ".sfb-ctx { margin: 0; color: var(--dim); font-size: 13px; line-height: 1.4; }",
      ".sfb-sheet button.solid, .sfb-sheet button.outline { min-height: 44px; }",
      ".sfb-sheet button.solid[disabled] { opacity: .5; }",
      ".sfb-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }",
      ".sfb-head span { color: var(--dim); font-size: 13px; }"
    ].join("\n");
    var KINDS = [["bug", "Problem"], ["idea", "Idea"], ["other", "Other"]];
    var PH = { bug: "What went wrong, and what did you expect?", idea: "What would make Slate better?", other: "Tell DJ anything" };

    function pageName() {
      var t = document.getElementById("title-t"); return t ? t.textContent.trim() : "";
    }
    // the page someone was on before opening Settings (that's the one their feedback is usually about)
    function watchPage() {
      var h = document.documentElement;
      function note() {
        var v = h.getAttribute("data-view") || "";
        if (!v || v === "settings") return;
        sfb.lastPage = pageName() || v;
        sfb.lastDetail = "";
        try {
          if (v === "game" || v === "feed") {
            var g = games().filter(function (x) { return x.id === state.gameId; })[0];
            if (g) sfb.lastDetail = (g.custom ? String(g.home) : pairText(g, function (sd) { return g[sd]; }, " at ")) + (g.league ? ", " + g.league : "");
          }
        } catch (e) {}
      }
      note();
      try { new MutationObserver(note).observe(h, { attributes: true, attributeFilter: ["data-view"] }); } catch (e) {}
    }
    function layout() {
      var w = window.innerWidth, ht = window.innerHeight, m = "";
      try { m = deviceMode(); } catch (e) {}
      var s = m === "duo" ? (isDuo ? "iPhone Duo, open" : "iPhone Duo, folded") : m === "iphone" ? "iPhone" : (m || "phone");
      try { if (typeof NATIVE !== "undefined" && NATIVE && NATIVE.strip) s += ", side column"; } catch (e) {}
      return { device: s, screen: w + "×" + ht + (w > ht ? " sideways" : "") };
    }
    function appLabel() {
      try { if (typeof NATIVE !== "undefined" && NATIVE && NATIVE.build) return "iPhone app build " + NATIVE.build; } catch (e) {}
      return window.navigator.standalone ? "Home Screen web app" : "browser";
    }
    function ctxLine() {
      var l = layout();
      return "Sent with it: " + [sfb.lastPage ? "page " + sfb.lastPage + (sfb.lastDetail ? " (" + sfb.lastDetail + ")" : "") : "", "Web " + SLATE_VERSION, l.device].filter(Boolean).join(" · ");
    }

    function build() {
      if (document.getElementById("sheet-sfb")) return;
      var st = document.createElement("style"); st.id = "sfb-css"; st.textContent = CSS; document.head.appendChild(st);
      // the Settings entry, with the other actions at the top
      var acts = document.querySelector("#view-settings .set-acts");
      if (acts) {
        var b = el("button", "navrow sa"); b.type = "button"; b.id = "set-sfb";
        b.innerHTML = '<i class="sa-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.5h5"/></svg></i>' +
          '<span><b>Send feedback</b><span>A problem or an idea, straight to DJ</span></span><span class="chev">›</span>';
        var reset = document.getElementById("set-reset");
        if (reset && reset.parentNode === acts) acts.insertBefore(b, reset); else acts.appendChild(b);
        b.addEventListener("click", openSheet);
      }
      var bd = el("div", "sheet-backdrop"); bd.id = "sheet-sfb";
      bd.setAttribute("role", "dialog"); bd.setAttribute("aria-modal", "true"); bd.setAttribute("aria-labelledby", "sfb-title");
      bd.innerHTML =
        '<div class="sheet sfb-sheet">' +
        '<div class="sfb-head"><h3 id="sfb-title">Send feedback</h3><span id="sfb-who"></span></div>' +
        '<div class="seg" id="sfb-kind" role="group" aria-label="Type of feedback">' +
        KINDS.map(function (k) { return '<button type="button" data-k="' + k[0] + '">' + k[1] + "</button>"; }).join("") + "</div>" +
        '<textarea id="sfb-text" maxlength="4000" aria-label="Your feedback"></textarea>' +
        '<div class="sfb-shot"><img id="sfb-img" alt="Your screenshot" hidden>' +
        '<button type="button" class="outline quiet" id="sfb-add">Add a screenshot</button>' +
        '<input type="file" id="sfb-file" accept="image/*" hidden></div>' +
        '<p class="sfb-ctx" id="sfb-ctx"></p>' +
        '<button type="button" class="solid" id="sfb-send">Send</button>' +
        '<button type="button" class="outline quiet" id="sfb-cancel">Cancel</button>' +
        "</div>";
      document.body.appendChild(bd);
      bd.addEventListener("click", function (e) { if (e.target === bd) closeSheet(); });
      document.getElementById("sfb-cancel").addEventListener("click", closeSheet);
      document.getElementById("sfb-kind").addEventListener("click", function (e) {
        var t = e.target.closest("button[data-k]"); if (!t) return; sfb.kind = t.getAttribute("data-k"); paint();
      });
      document.getElementById("sfb-text").addEventListener("input", paint);
      document.getElementById("sfb-add").addEventListener("click", function () {
        if (sfb.shot) { sfb.shot = ""; paint(); return; }
        document.getElementById("sfb-file").click();
      });
      document.getElementById("sfb-file").addEventListener("change", function () {
        var f = this.files && this.files[0]; this.value = ""; if (f) shrink(f);
      });
      document.getElementById("sfb-send").addEventListener("click", send);
    }
    // screenshots go up as a JPEG no wider than 900 points, so they stay small
    function shrink(file) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 900 / Math.max(img.width, img.height * 0.5)), w = Math.round(img.width * k), h = Math.round(img.height * k);
        var c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
        var q = 0.7, d = c.toDataURL("image/jpeg", q);
        while (d.length > 600000 && q > 0.3) { q -= 0.15; d = c.toDataURL("image/jpeg", q); }
        URL.revokeObjectURL(url);
        if (d.length > 650000) { toast("That picture is too big to send"); return; }
        sfb.shot = d; paint();
      };
      img.onerror = function () { URL.revokeObjectURL(url); toast("Couldn't open that picture"); };
      img.src = url;
    }
    function paint() {
      [].forEach.call(document.querySelectorAll("#sfb-kind button"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-k") === sfb.kind ? "true" : "false"); });
      var ta = document.getElementById("sfb-text"); ta.placeholder = PH[sfb.kind];
      var im = document.getElementById("sfb-img"); im.hidden = !sfb.shot; if (sfb.shot) im.src = sfb.shot; else im.removeAttribute("src");
      document.getElementById("sfb-add").textContent = sfb.shot ? "Remove screenshot" : "Add a screenshot";
      document.getElementById("sfb-ctx").textContent = ctxLine();
      var s = document.getElementById("sfb-send"); s.disabled = sfb.busy || !ta.value.trim(); s.textContent = sfb.busy ? "Sending…" : "Send";
    }
    function openSheet() {
      build();
      var pass = slatePass();
      document.getElementById("sfb-who").textContent = pass ? "" : "Needs your passcode";
      paint();
      document.getElementById("sheet-sfb").classList.add("open");
      setTimeout(function () { try { document.getElementById("sfb-text").focus(); } catch (e) {} }, 250);
    }
    function closeSheet() { var s = document.getElementById("sheet-sfb"); if (s) s.classList.remove("open"); }
    function send() {
      var ta = document.getElementById("sfb-text"), text = ta.value.trim();
      if (!text || sfb.busy) return;
      var pass = slatePass();
      if (!pass) { toast("Sign in with your passcode first, then send it"); return; }
      var l = layout(), look = "";
      try { look = (state.look || "") + (state.accent ? ", accent " + state.accent : ""); } catch (e) {}
      var body = { pass: pass, kind: sfb.kind, text: text, page: sfb.lastPage, detail: sfb.lastDetail,
        ctx: { version: SLATE_VERSION, app: appLabel(), device: l.device, screen: l.screen, look: look } };
      if (sfb.shot) body.shot = sfb.shot;
      sfb.busy = true; paint();
      fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          sfb.busy = false;
          if (!res.ok || !res.j.ok) { paint(); toast((res.j && res.j.error) || "Couldn't send it. Try again."); return; }
          ta.value = ""; sfb.shot = ""; sfb.kind = "bug"; paint(); closeSheet();
          toast("Sent. Thanks for the feedback.");
        }, function () { sfb.busy = false; paint(); toast("No connection. Your note is still here, try again."); });
    }

    function init() { watchPage(); build(); }
    if (document.getElementById("view-settings")) init(); else document.addEventListener("DOMContentLoaded", init);
  })();

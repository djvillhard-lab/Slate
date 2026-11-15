  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(kind) {
    var NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path");
    s.setAttribute("viewBox", "0 0 24 24");
    if (kind === "star" || kind === "star-o") {
      p.setAttribute("d", "m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8z");
      if (kind === "star") s.setAttribute("fill", "currentColor");
      else { s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8"); s.setAttribute("stroke-linejoin", "round"); }
    } else {
      s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "3"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
      var D = { check: "M5 12.5l4.5 4.5L19 7.5", x: "M6.5 6.5l11 11M17.5 6.5l-11 11", back: "M15 5l-7 7 7 7", more: "M9 5l7 7-7 7", sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5", sparkle: "M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9zM18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z", pin: "M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11zM12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z",
        bell: "M18 16.5v-5.3a6 6 0 0 0-12 0v5.3l-1.7 2.2h15.4zM10 20.7a2.1 2.1 0 0 0 4 0", "bell-off": "M18 16.5v-5.3a6 6 0 0 0-12 0v5.3l-1.7 2.2h15.4zM10 20.7a2.1 2.1 0 0 0 4 0M3.5 3.5l17 17",
        card: "M7.5 2.5h9a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM8.5 13h7v3.5h-7z", "card-off": "M7.5 2.5h9a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM8.5 13h7v3.5h-7zM3.5 3.5l17 17",
        grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" };
      if (/^(pin|sparkle|bell|bell-on|bell-off|card|card-off|grid|sliders)$/.test(kind)) s.setAttribute("stroke-width", kind === "sliders" ? "2.2" : "1.9");
      if (kind === "bell-on") { kind = "bell"; s.setAttribute("fill", "currentColor"); }
      p.setAttribute("d", D[kind] || "M12 5v14M5 12h14");
    }
    s.appendChild(p); return s;
  }
  function todayInHome() { return new Intl.DateTimeFormat("en-CA", { timeZone: HOME_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() - 4 * 3600000)); }
  function shiftDate(iso, n) { var p = iso.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n, 12)).toISOString().slice(0, 10); }
  function fmtDate(iso, opts) { var p = iso.split("-").map(Number); opts.timeZone = "UTC"; return new Intl.DateTimeFormat("en-US", opts).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12))); }
  function timeText(iso) { var d = new Date(iso); return isNaN(d) ? "TBD" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  function info(g) { var L = LEAGUES[g.league] || {}; return { tag: L.tag || (g.leagueLabel || g.league || "").toUpperCase().slice(0, 5), name: g.leagueLabel || L.name || "Other", hrs: L.hrs || 2.5, college: !!L.college }; }

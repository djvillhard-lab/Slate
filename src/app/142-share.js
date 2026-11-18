  // ---- Send a game (3.107.0): a "Send" button on the matchup page opens the phone's share sheet (Messages, Mail, AirDrop) ----
  // with one line about the game and a link that opens it in Slate (?game=<id>, the same link a tapped alert uses).
  // Never includes the score, so it can't spoil a game for the person getting it. No share sheet: the line is copied instead.
  function shareText(g) {
    var kind = status(g).kind, who = g.away + (g.neutral ? " vs " : " at ") + g.home, tv = (g.tv || []).filter(Boolean).slice(0, 2).join(" / ");
    if (kind === "live") return who + " is on right now" + (tv ? " on " + tv : "") + ".";
    if (kind === "over") return who + " is final. No score here, in case you want to watch it back.";
    var d = new Date(g.start), when = isNaN(d) ? "" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + ", " + timeText(g.start);
    return who + (when ? " · " + when : "") + (tv ? " · " + tv : "") + ".";
  }
  function shareUrl(g) { var o = /^https:/.test(location.origin) ? location.origin : "https://slate.djvillhard.workers.dev"; return o + "/?game=" + encodeURIComponent(g.id); }
  function shareGame(g) {
    var text = shareText(g), url = shareUrl(g);
    if (navigator.share) { navigator.share({ title: "Slate", text: text, url: url }).catch(function (e) { if (!e || e.name !== "AbortError") shareCopy(text + " " + url); }); return; }
    shareCopy(text + " " + url);
  }
  function shareCopy(s) {
    var done = function () { toast("Copied. Paste it into a message."); }, fail = function () { toast("Couldn't copy it on this phone."); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(done, fail); else fail(); } catch (e) { fail(); }
  }
  var SHARE_ON = false;   // 3.109.1 (DJ, Nov 18): "Keep the share a game option for the future, remove for now". Set to true to bring the Send button back.
  function shareBtn(g) {
    if (!SHARE_ON || !g || g.custom || !g.id) return null;
    var b = el("button", "gv-act"); b.type = "button";
    var NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2.2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    p.setAttribute("d", "M12 15V4M8 7.5l4-4 4 4M6 11.5v7a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-7"); s.appendChild(p); b.appendChild(s);
    b.appendChild(document.createTextNode("Send"));
    b.setAttribute("aria-label", "Send this game to someone");
    b.addEventListener("click", function () { shareGame(g); });
    return b;
  }

  // ---- Team-color stripe on matchup cards (3.91.0, DJ: "I like the colors here [News game cards] and I want to incorporate that on
  // all matchup cards in the app") ----
  // A 4px edge on the card's left side, split in two: the away team's color beside the away row, the home team's beside the
  // home row (pairColors: readable on the theme, the home side switches when the two clash). The split sits between the two
  // team rows once the card is laid out; until then, halfway down. Slate, All games, On TV, Worth a look, the matchup page
  // header and Betting lines cards.
  function teamStripe(box, g, rowSel) {
    if (!box || !g || g.custom) return;
    var pc = {}; try { pc = pairColors(g) || {}; } catch (e) {}
    if (!hexOk(pc.away) && !hexOk(pc.home)) return;
    box.classList.add("tstripe");
    box.style.setProperty("--ts-a", hexOk(pc.away) ? pc.away : "var(--hair)");
    box.style.setProperty("--ts-h", hexOk(pc.home) ? pc.home : "var(--hair)");
    if (!rowSel) return;
    requestAnimationFrame(function () {
      if (!box.isConnected) return;
      var rs = box.querySelectorAll(rowSel); if (rs.length < 2) return;
      var b = box.getBoundingClientRect(), r0 = rs[0].getBoundingClientRect(), r1 = rs[1].getBoundingClientRect(); if (!b.height || !r0.height) return;
      box.style.setProperty("--ts-split", Math.round((r0.bottom + r1.top) / 2 - b.top) + "px");
    });
  }
  // one team's color the whole way down (a player's line in Betting lines)
  function teamStripe1(box, g, sd) {
    if (!box || !g || g.custom) return;
    var pc = {}; try { pc = pairColors(g) || {}; } catch (e) {}
    if (!hexOk(pc[sd])) return;
    box.classList.add("tstripe"); box.style.setProperty("--ts-a", pc[sd]); box.style.setProperty("--ts-h", pc[sd]);
  }

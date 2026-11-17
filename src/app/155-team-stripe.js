  // ---- Team-color stripe on matchup cards (3.91.0, DJ: "I like the colors here [News game cards] and I want to incorporate that on
  // all matchup cards in the app") ----
  // A 4px edge on the card's left side, split in two: the top team's color on the top half, the bottom team's on the bottom half
  // (pairColors: readable on the theme, the home side switches when the two clash). The split is always halfway down
  // the card (3.91.1). Slate, All games, On TV, Worth a look, the matchup page
  // header and Betting lines cards.
  // 3.91.4 (DJ: Wales on top showed Portugal's color): the top half is the team listed on top. Soccer cards list the home
  // side first (sideOrder), everything else away first; a card that draws its own order passes it in
  function teamStripe(box, g, order) {
    if (!box || !g || g.custom) return;
    var pc = {}; try { pc = pairColors(g) || {}; } catch (e) {}
    if (!hexOk(pc.away) && !hexOk(pc.home)) return;
    var o = Array.isArray(order) ? order : sideOrder(g);
    box.classList.add("tstripe");
    box.style.setProperty("--ts-a", hexOk(pc[o[0]]) ? pc[o[0]] : "var(--hair)");
    box.style.setProperty("--ts-h", hexOk(pc[o[1]]) ? pc[o[1]] : "var(--hair)");
    // 3.91.1 (DJ: "always split 50-50… no matter the size of the card"): exactly half and half of the card's height
  }
  // one team's color the whole way down (a player's line in Betting lines)
  function teamStripe1(box, g, sd) {
    if (!box || !g || g.custom) return;
    var pc = {}; try { pc = pairColors(g) || {}; } catch (e) {}
    if (!hexOk(pc[sd])) return;
    box.classList.add("tstripe"); box.style.setProperty("--ts-a", pc[sd]); box.style.setProperty("--ts-h", pc[sd]);
  }

# Lock Screen live game and Dynamic Island (ios/SlateLive/SlateLiveActivity.swift)

- 3.133.2 (DJ, Nov 25): the possession football never sits beside a score. Beside the score it squeezed that score
  (minimumScaleFactor) or, in the island's narrow expanded side, pushed it out. Lock Screen (`PillSide`): the football
  sits by the team name under the pill, on the inside edge. Island expanded (`IslandTeam`): a small 16 pt black-circle
  tag on the logo's inside bottom corner (an overlay, so it takes no width). Both scores have `layoutPriority(1)`.
- 3.133.2 (DJ): no graying of the trailing team while live, on the one-game card (`trail` removed) or the slate
  board (`SlateBoardActivity.swift`). Only `SlateLook.lost` (finals) dims.
- Compact island (`ChipsSide`) and the multi-game board (`SlateBoardActivity.swift`) never showed a football.
- The web has no shared code for this; the Live feed score bar draws its own possession mark.
- Open: check on DJ's phone once the build lands (Lock Screen, island held open, folded and unfolded Duo).

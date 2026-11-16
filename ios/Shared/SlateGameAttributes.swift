import ActivityKit
import SwiftUI

// A live notification (Live Activity) for one game: the score on the Lock Screen and at the top of the screen.
// Shared by the app and the SlateLive widget extension. Slate's server starts, updates and ends these by push,
// so the property names below are also the JSON keys it sends ("attributes" and "content-state").
// Keys added after 3.0 (16) are optional, so live notifications started before an app update still decode.
struct SlateGameAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var a: Int            // away score
        var h: Int            // home score
        var detail: String    // "4:12 - 3rd", "Halftime", "Final"
        var state: String     // "pre", "in" or "post"
        var line: String?     // optional one-liner, like the slate's ("Cade Cunningham has 41 pts")
        var poss: String?     // football: who has the ball, "away" or "home" (from ESPN, while it reports one)
        var sit: String?      // football: ESPN's down and distance, "2nd & 7 at BC 34"
        // 3.38.0, the expanded Dynamic Island's extra room, all straight from ESPN's live scoreboard and all optional:
        var ap: String?       // away's standout so far: "V. Wembanyama 26 PTS, 10 REB, 6 AST, 5 BLK", "B. Purdy 21/27, 323 YDS, 2 TD"
        var hp: String?       // home's standout
        var ox: String?       // football, when a team has no leader in ESPN's scoreboard: the next standout's team ("SF")
        var op: String?       // and its line ("C. McCaffrey 4 REC, 161 YDS, 2 TD")
        var at: String?       // away team line: "FG 48% · 3PT 10/33 · REB 48" (basketball), "3 timeouts" (football)
        var ht: String?       // home team line
        var lp: String?       // the last play, in ESPN's words: "Dylan Harper makes free throw 2 of 2"
        var wp: String?       // ESPN's win probability for the team ahead in it: "ESPN win chance: SA 99%"
    }

    var gameId: String
    var league: String        // "NBA", "NHL", "Premier League"…
    var away: String
    var home: String
    var awayAbbr: String
    var homeAbbr: String
    var awayColor: String     // "#RRGGBB", or "" for the default
    var homeColor: String
    var awayAlt: String?      // the team's second color: the stripe along the bottom of its chip
    var homeAlt: String?
    var awayRank: Int?        // college rankings (No. 5), when ranked
    var homeRank: Int?
    var channel: String?      // "NBC", "ESPN"…, as on the slate: the Watch button
}

extension Color {
    // "#RRGGBB" → Color; anything else → the fallback
    init(slateHex: String, fallback: Color = .gray) {
        let s = slateHex.hasPrefix("#") ? String(slateHex.dropFirst()) : slateHex
        guard s.count == 6, let v = UInt32(s, radix: 16) else { self = fallback; return }
        self = Color(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

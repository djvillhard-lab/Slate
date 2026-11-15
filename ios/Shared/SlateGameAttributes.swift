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

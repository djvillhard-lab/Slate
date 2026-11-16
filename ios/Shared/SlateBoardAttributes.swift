import ActivityKit
import Foundation

// The live scoreboard (3.23.0): one live notification with up to four games you pick on the slate (the Board button).
// Shared by the app and the SlateLive widget extension. Slate's server starts, updates and ends it by push, so the
// property names below are also the JSON keys it sends ("attributes" and "content-state").
struct SlateBoardAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var games: [SlateBoardGame]
        var lead: Int?        // before 3.30.0, the game that last scored; the Dynamic Island now works out its own game (BoardLook.lead)
    }

    var title: String         // "Your slate"
}

struct SlateBoardGame: Codable, Hashable {
    var id: String
    var aa: String            // away abbreviation
    var ha: String            // home abbreviation
    var ac: String            // team colors, "#RRGGBB" or "" for the default
    var hc: String
    var ax: String?           // second colors: the stripes along the chips
    var hx: String?
    var a: Int                // away score
    var h: Int                // home score
    var d: String             // ESPN's "8:42 - 3rd", "Final", or the start time "7:30 PM"
    var s: String             // "pre", "in" or "post"
    var p: String?            // football, live: who has the ball, "away" or "home" (3.25.0; optional, so older ones still decode)
    var dd: String?           // football, live: ESPN's down and distance, "3rd & 4 at ILL 35"
    var t: Double?            // 3.30.0: kickoff, seconds since 1970 (for the countdown before a game starts)
    var tv: String?           // 3.30.0: the channel, shown beside the start time ("12:00 PM · CBS")
    var c: Bool?              // 3.30.0: kickoff is within the hour, so the Dynamic Island counts down to it
    var ln: String?           // 3.64.0: the slate card's one-liner (the live line while it's on, the preview line before)
}

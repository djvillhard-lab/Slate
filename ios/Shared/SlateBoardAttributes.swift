import ActivityKit
import Foundation

// The live scoreboard (3.23.0): one live notification with up to four games you pick on the slate (the Board button).
// Shared by the app and the SlateLive widget extension. Slate's server starts, updates and ends it by push, so the
// property names below are also the JSON keys it sends ("attributes" and "content-state").
struct SlateBoardAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var games: [SlateBoardGame]
        var lead: Int?        // the game that last scored: the one the Dynamic Island shows on its own
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
}

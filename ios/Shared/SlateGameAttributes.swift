import ActivityKit
import SwiftUI
import UIKit

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
        var pv: String?       // 3.58.0: the slate's preview line for the game ("Celtics have won five in a row"), before and during it
        var wp: String?       // ESPN's win probability for the team ahead in it: "ESPN win chance: SA 99%"
        var tag: String?      // 3.68.0: the slate card's tag ("Upset watch", "Rivalry"), shown after "Slate • CBB" in the header
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
    var awayLogo: String?     // 3.67.0: ESPN's logo for the team, "nba/bos.png": drawn in place of the chip once the app has saved it
    var homeLogo: String?
}

// 3.67.0: team logos for live notifications. A live notification can't download a picture, so the app saves ESPN's
// logos for the day's games (the page sends the list when Slate is open) into the space it shares with the
// SlateLive extension, and the extension draws a saved one in place of the team's colored chip.
enum SlateLogos {
    static let group = "group.com.djvillhard.slate"
    static var dir: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appendingPathComponent("Logos", isDirectory: true)
    }
    // "nba/bos.png" -> Logos/nba-bos.png; anything that isn't a plain league/file name is ignored
    static func file(_ seg: String) -> URL? {
        let clean = seg.lowercased().replacingOccurrences(of: "/", with: "-")
        guard seg.split(separator: "/").count == 2, clean.range(of: "^[a-z0-9_-]+\\.png$", options: .regularExpression) != nil else { return nil }
        return dir?.appendingPathComponent(clean)
    }
    static func image(_ seg: String?) -> UIImage? {
        guard let seg, !seg.isEmpty, let u = file(seg), let d = try? Data(contentsOf: u) else { return nil }
        return UIImage(data: d)
    }
    // the app: save each logo not saved in the last week, small (64 px) and in ESPN's version for dark backgrounds,
    // or the regular one when a team has no dark version
    static func fetch(_ segs: [String]) {
        guard let dir else { return }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        for seg in Set(segs).prefix(300) {
            guard let f = file(seg) else { continue }
            if let at = (try? FileManager.default.attributesOfItem(atPath: f.path))?[.modificationDate] as? Date,
               Date().timeIntervalSince(at) < 7 * 86400 { continue }
            let p = seg.lowercased().split(separator: "/").map(String.init)
            SlateLogos.load(p, dark: true) { d in
                if let d { try? d.write(to: f, options: .atomic); return }
                SlateLogos.load(p, dark: false) { d in if let d { try? d.write(to: f, options: .atomic) } }
            }
        }
    }
    private static func load(_ p: [String], dark: Bool, done: @escaping (Data?) -> Void) {
        guard let url = URL(string: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/\(p[0])/\(dark ? "500-dark" : "500")/\(p[1])&w=64&h=64") else { done(nil); return }
        URLSession.shared.dataTask(with: url) { d, r, _ in
            let ok = (r as? HTTPURLResponse)?.statusCode == 200 && d.flatMap { UIImage(data: $0) } != nil
            done(ok ? d : nil)
        }.resume()
    }
}

extension Color {
    // "#RRGGBB" → Color; anything else → the fallback
    init(slateHex: String, fallback: Color = .gray) {
        let s = slateHex.hasPrefix("#") ? String(slateHex.dropFirst()) : slateHex
        guard s.count == 6, let v = UInt32(s, radix: 16) else { self = fallback; return }
        self = Color(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

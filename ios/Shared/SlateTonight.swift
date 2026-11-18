import Foundation

// 3.112.0: the Tonight's slate home-screen widget's games. The page sends today's slate whenever it changes (a
// "slate" message: the same game fields as the live scoreboard), the app saves it in the space it shares with the
// SlateLive extension, and the widget reads it from there. A widget can't load Slate itself, so it shows what was
// saved the last time Slate was open, and works out from the start times which games are next.
struct SlateTonight: Codable {
    var date: String            // the slate's day, "2026-11-18"
    var at: Double              // when the page sent it, seconds since 1970 (scores older than a few minutes aren't shown)
    var games: [SlateBoardGame] // the slate's games, by start time

    static var file: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: SlateLogos.group)?.appendingPathComponent("tonight.json")
    }
    static func load() -> SlateTonight? {
        guard let f = file, let d = try? Data(contentsOf: f) else { return nil }
        return try? JSONDecoder().decode(SlateTonight.self, from: d)
    }
    // the app: save what the page sent; true when it changed (so the widget is redrawn only then)
    static func save(_ m: [String: Any]) -> Bool {
        guard let f = file, JSONSerialization.isValidJSONObject(m),
              let raw = try? JSONSerialization.data(withJSONObject: m),
              let t = try? JSONDecoder().decode(SlateTonight.self, from: raw),
              let d = try? JSONEncoder().encode(t) else { return false }
        if let old = try? Data(contentsOf: f), old == d { return false }
        return (try? d.write(to: f, options: .atomic)) != nil
    }
}

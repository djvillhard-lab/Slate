import Foundation
import SwiftUI
import CoreText

// 3.114.0: the Apple Watch app's copy of today's slate. The iPhone app sends the same list it saves for the
// Tonight's slate widget (WatchLink on the phone); the Watch keeps it in its own app group so the watch-face
// complication can read it too, and refreshes the scores straight from ESPN while the app is open.
struct WatchGame: Codable, Hashable, Identifiable {
    var id: String
    var aa: String, ha: String          // abbreviations
    var ac: String, hc: String          // team colors "#RRGGBB"
    var ax: String?, hx: String?
    var a: Int, h: Int                  // score
    var d: String                       // ESPN's clock "8:42 - 2nd", "Final", or the start time
    var s: String                       // "pre", "in", "post"
    var t: Double?                      // start, seconds since 1970
    var tv: String?
    var al: String?, hl: String?        // logos, "nba/bos.png"
    var e: Double?                      // when the phone saw it go final
    var lg: String?                     // league, "NBA"
    var st: String?                     // the standout, "C. Boozer 21 PTS · 11 REB"
    var bl: String?                     // your bet from My bets, "DUKE -3.5"
    var ln: String?                     // the slate's one-liner
    var u: String?                      // the ESPN scoreboard with this game
}

struct WatchTonight: Codable {
    var date: String
    var at: Double                      // when the scores were last current, seconds since 1970
    var games: [WatchGame]

    static let group = "group.com.djvillhard.slate"
    static var file: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appendingPathComponent("watch-tonight.json")
    }
    static func load() -> WatchTonight? {
        guard let f = file, let d = try? Data(contentsOf: f) else { return nil }
        return try? JSONDecoder().decode(WatchTonight.self, from: d)
    }
    func save() { if let f = Self.file, let d = try? JSONEncoder().encode(self) { try? d.write(to: f, options: .atomic) } }
}

enum WatchLook {
    static let ink = Color.white
    static let muted = Color(watchHex: "#A0ACBD")
    static let live = Color(watchHex: "#FF7A6F")
    static let liveDot = Color(watchHex: "#FF5B4E")
    static let raise = Color(watchHex: "#232D3C")

    // the Watch draws in Archivo like the rest of Slate; the fonts ship in the app and the complication
    static func registerFonts() {
        for n in ["SlateArchivo-Bold", "SlateArchivo-SemiBold", "SlateArchivo-CondensedExtraBold"] {
            if let u = Bundle.main.url(forResource: n, withExtension: "ttf") { CTFontManagerRegisterFontsForURL(u as CFURL, .process, nil) }
        }
    }
    static func semi(_ s: CGFloat) -> Font { .custom("SlateArchivo-SemiBold", fixedSize: s) }
    static func bold(_ s: CGFloat) -> Font { .custom("SlateArchivo-Bold", fixedSize: s) }
    static func num(_ s: CGFloat) -> Font { .custom("SlateArchivo-CondensedExtraBold", fixedSize: s).monospacedDigit() }

    static func logoURL(_ seg: String?) -> URL? {
        guard let seg, !seg.isEmpty else { return nil }
        let p = seg.lowercased().split(separator: "/").map(String.init)
        guard p.count == 2 else { return nil }
        return URL(string: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/\(p[0])/500-dark/\(p[1])&w=64&h=64")
    }

    // the next games now: live (and finals from the last 30 minutes) first, then by start time
    static func next(_ d: WatchTonight?, at now: Date, count: Int) -> [WatchGame] {
        guard let d, now.timeIntervalSince1970 - d.at < 20 * 3600 else { return [] }
        let n = now.timeIntervalSince1970
        let left = d.games.filter { g in
            if g.s == "post" { return g.e.map { n - $0 < 30 * 60 } ?? false }
            if let t = g.t, t > 0, n - t > 4 * 3600 { return false }
            return true
        }
        return left.sorted { p, q in
            let lp = started(p, now), lq = started(q, now)
            if lp != lq { return lp }
            return (p.t ?? 0) < (q.t ?? 0)
        }.prefix(count).map { $0 }
    }
    static func started(_ g: WatchGame, _ now: Date) -> Bool {
        g.s != "pre" || (g.t.map { $0 > 0 && $0 <= now.timeIntervalSince1970 } ?? false)
    }
    // a score is shown only while it's recent (20 minutes), and always for a final
    static func showScore(_ g: WatchGame, _ d: WatchTonight?, _ now: Date) -> Bool {
        g.s == "post" || (g.s == "in" && (d.map { now.timeIntervalSince1970 - $0.at < 20 * 60 } ?? false))
    }
    static func time(_ g: WatchGame) -> String {
        guard let t = g.t, t > 0 else { return g.d }
        return Date(timeIntervalSince1970: t).formatted(date: .omitted, time: .shortened)
    }
    // "2nd 8:42" from ESPN's "8:42 - 2nd"
    static func clock(_ g: WatchGame) -> String {
        if g.s == "post" { return g.d.isEmpty ? "Final" : g.d }
        let parts = g.d.components(separatedBy: " - ")
        return parts.count == 2 ? parts[1] + " " + parts[0] : g.d
    }
    static func status(_ g: WatchGame, _ d: WatchTonight?, _ now: Date) -> String {
        if g.s == "post" { return clock(g) }
        if showScore(g, d, now) { return clock(g) }
        if started(g, now) { return "Live" }
        return time(g)
    }
}

extension Color {
    init(watchHex: String, fallback: Color = .gray) {
        let s = watchHex.hasPrefix("#") ? String(watchHex.dropFirst()) : watchHex
        guard s.count == 6, let v = UInt32(s, radix: 16) else { self = fallback; return }
        self = Color(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

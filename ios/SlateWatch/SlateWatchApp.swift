import SwiftUI
import WatchConnectivity
import WidgetKit

// 3.114.0 (DJ): Slate on the Apple Watch. "Tonight" lists the games on today's slate in the live notifications'
// look (two slanted team-color pills with logos and scores, the clock under them); tap one for the big score, the
// standout, your bet and the slate's line. The list comes from the iPhone (WatchLink there) whenever Slate updates
// it; while the app is open the Watch refreshes the scores itself from ESPN every minute.
@main
struct SlateWatchApp: App {
    @StateObject private var store = WatchStore.shared
    @Environment(\.scenePhase) private var phase

    init() { WatchLook.registerFonts() }

    var body: some Scene {
        WindowGroup {
            NavigationStack { TonightList() }
                .environmentObject(store)
                .onChange(of: phase) { _, p in if p == .active { store.refresh() } }
        }
    }
}

@MainActor
final class WatchStore: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchStore()
    @Published var data: WatchTonight? = WatchTonight.load()
    @Published var now = Date()
    private var timer: Timer?

    override init() {
        super.init()
        if WCSession.isSupported() { WCSession.default.delegate = self; WCSession.default.activate() }
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in Task { @MainActor in WatchStore.shared.refresh() } }
    }

    private func take(_ d: Data) {
        guard let t = try? JSONDecoder().decode(WatchTonight.self, from: d) else { return }
        data = t; t.save(); WidgetCenter.shared.reloadAllTimelines()
        refresh()
    }

    // ESPN's scoreboards for the slate's games, matched by the two teams' abbreviations; only scores change here
    func refresh() {
        now = Date()
        guard let d = data, Date().timeIntervalSince1970 - d.at < 20 * 3600 else { return }
        let urls = Set(d.games.filter { $0.s != "post" && WatchLook.started($0, Date()) }.compactMap { $0.u })
        guard !urls.isEmpty else { return }
        Task {
            var got: [String: (Int, Int, String, String)] = [:]   // "AWAY|HOME" → (away, home, detail, state)
            for u in urls {
                guard let url = URL(string: u), let (raw, _) = try? await URLSession.shared.data(from: url),
                      let j = try? JSONSerialization.jsonObject(with: raw) as? [String: Any],
                      let evs = j["events"] as? [[String: Any]] else { continue }
                for ev in evs {
                    guard let comp = (ev["competitions"] as? [[String: Any]])?.first,
                          let cs = comp["competitors"] as? [[String: Any]] else { continue }
                    var aw: (String, Int)?, hm: (String, Int)?
                    for c in cs {
                        let ab = ((c["team"] as? [String: Any])?["abbreviation"] as? String ?? "").uppercased()
                        let sc = Int(c["score"] as? String ?? "") ?? 0
                        if (c["homeAway"] as? String) == "home" { hm = (ab, sc) } else { aw = (ab, sc) }
                    }
                    let st = (comp["status"] as? [String: Any]) ?? (ev["status"] as? [String: Any]) ?? [:]
                    let ty = st["type"] as? [String: Any] ?? [:]
                    let state = ty["state"] as? String ?? "pre"
                    let clock = st["displayClock"] as? String ?? "", per = ty["shortDetail"] as? String ?? ""
                    if let aw, let hm { got[aw.0 + "|" + hm.0] = (aw.1, hm.1, state == "post" ? (ty["shortDetail"] as? String ?? "Final") : per.isEmpty ? clock : per, state) }
                }
            }
            guard !got.isEmpty, var t = self.data else { return }
            var changed = false
            for i in t.games.indices {
                let g = t.games[i]
                guard let x = got[g.aa.uppercased() + "|" + g.ha.uppercased()] else { continue }
                if x.3 == "post" && g.s != "post" { t.games[i].e = Date().timeIntervalSince1970 }
                if g.a != x.0 || g.h != x.1 || g.s != x.3 || g.d != x.2 { changed = true }
                t.games[i].a = x.0; t.games[i].h = x.1; t.games[i].s = x.3
                // ESPN's short detail is "8:42 - 2nd" style for basketball and "Q3 6:12"/"64'" elsewhere; kept as is
                t.games[i].d = x.2
            }
            t.at = Date().timeIntervalSince1970
            self.data = t; t.save()
            if changed { WidgetCenter.shared.reloadAllTimelines() }
        }
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        if let d = session.receivedApplicationContext["tonight"] as? Data { Task { @MainActor in self.take(d) } }
    }
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext ctx: [String: Any]) {
        if let d = ctx["tonight"] as? Data { Task { @MainActor in self.take(d) } }
    }
}

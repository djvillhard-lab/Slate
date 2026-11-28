import ActivityKit
import Security
import UIKit

// Live notifications (Live Activities): Slate's server starts one by push when a game on your slate goes live,
// then updates and ends it by push. This side only hands the server the tokens it needs, posting straight to
// /api/live-token, because the app is often in the background when a new game's token arrives.
// The server reads your Settings > Notifications > Live notifications choices; nothing is decided here.
@MainActor
final class LiveActivities {
    static let shared = LiveActivities()
    private static let endpoint = URL(string: "https://slate.djvillhard.workers.dev/api/live-token")!
    private var started = false
    private var watching = Set<String>()
    private var lastStartToken = ""
    private var lastBoardStartToken = ""   // the live scoreboard's (SlateBoardAttributes, 3.23.0)

    private var env: String {
        #if DEBUG
        return "sandbox"
        #else
        return "production"
        #endif
    }

    // The page sends the passcode on each load; kept so tokens can be posted while the page isn't running.
    // It lives in the iPhone's Keychain (code review, Nov 27, 2026). Builds up to 62 kept it in the app's settings file,
    // which is readable in a backup of the phone; the first launch of this build moves it across and removes the old copy.
    private var passCache: String?
    var pass: String {
        get {
            if let c = passCache { return c }
            let defaults = UserDefaults.standard
            var v = ""
            if let old = defaults.string(forKey: "slate-pass") {
                // an older build's copy: into the Keychain, then gone from the settings file (kept if the Keychain refused it)
                v = old
                if old.isEmpty || PassStore.write(old) { defaults.removeObject(forKey: "slate-pass"); defaults.set(true, forKey: "slate-pass-kc") }
            } else if defaults.bool(forKey: "slate-pass-kc") {
                v = PassStore.read() ?? ""
            } else {
                // a fresh install: the Keychain outlives a deleted app, so a passcode left by an earlier install is dropped
                PassStore.write("")
                defaults.set(true, forKey: "slate-pass-kc")
            }
            if !v.isEmpty { passCache = v }  // an empty answer can also mean "phone not unlocked since it restarted": ask again next time
            return v
        }
        set {
            let changed = newValue != pass
            if changed {
                passCache = newValue
                PassStore.write(newValue)
                lastStartToken = ""; lastBoardStartToken = ""
            }
            start()
        }
    }

    func start() {
        guard !started, !pass.isEmpty, ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        started = true
        // every time Slate comes up, hand the server the tokens of the live notifications already showing (3.25.4).
        // iOS only wakes the app for a new one's token when the app wasn't swiped away; until the server has that token
        // it can't update the score, so opening Slate gets every one of them current again.
        NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { _ in
            Task { @MainActor in LiveActivities.shared.resendTokens() }
        }
        if #available(iOS 17.2, *) {
            Task {
                for await data in Activity<SlateGameAttributes>.pushToStartTokenUpdates {
                    let tok = Self.hex(data)
                    if tok != lastStartToken { lastStartToken = tok; post(kind: "start", token: tok, gameId: nil) }
                }
            }
            // the live scoreboard has its own start token
            Task {
                for await data in Activity<SlateBoardAttributes>.pushToStartTokenUpdates {
                    let tok = Self.hex(data)
                    if tok != lastBoardStartToken { lastBoardStartToken = tok; post(kind: "start-board", token: tok, gameId: nil) }
                }
            }
        }
        // each live notification the server starts gets its own token, used for its updates and its end
        for act in Activity<SlateGameAttributes>.activities { watch(act) }
        Task {
            for await act in Activity<SlateGameAttributes>.activityUpdates { watch(act) }
        }
        for act in Activity<SlateBoardAttributes>.activities { watchBoard(act) }
        Task {
            for await act in Activity<SlateBoardAttributes>.activityUpdates { watchBoard(act) }
        }
        resendTokens()
    }

    // which games' live notifications are on the phone right now (and whether the scoreboard is): the slate's switches
    // show exactly that for games that are on or over (3.28.1)
    func reportShowing() {
        let on: (ActivityState) -> Bool = { $0 == .active || $0 == .stale || $0 == .ended }
        let ids = Activity<SlateGameAttributes>.activities.filter { on($0.activityState) }.map { $0.attributes.gameId }
        let board = Activity<SlateBoardAttributes>.activities.contains { on($0.activityState) }
        let list = (try? JSONSerialization.data(withJSONObject: ids)).flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        WebModel.shared.js("window.SlateApp && SlateApp.liveShowing && SlateApp.liveShowing(\(list), \(board))")
    }

    func resendTokens() {
        reportShowing()
        for act in Activity<SlateGameAttributes>.activities where act.activityState == .active || act.activityState == .stale {
            watch(act)
            if let t = act.pushToken { post(kind: "activity", token: Self.hex(t), gameId: act.attributes.gameId) }
        }
        for act in Activity<SlateBoardAttributes>.activities where act.activityState == .active || act.activityState == .stale {
            watchBoard(act)
            if let t = act.pushToken { post(kind: "board", token: Self.hex(t), gameId: nil) }
        }
    }

    // the running scoreboard's token, used for its updates and its end
    private func watchBoard(_ act: Activity<SlateBoardAttributes>) {
        guard !watching.contains(act.id) else { return }
        watching.insert(act.id)
        Task {
            for await data in act.pushTokenUpdates { post(kind: "board", token: Self.hex(data), gameId: nil) }
        }
        Task {
            for await st in act.activityStateUpdates {
                if st == .dismissed { gone(kind: "board-gone", gameId: nil) }
                reportShowing()
            }
        }
        reportShowing()
    }

    private func watch(_ act: Activity<SlateGameAttributes>) {
        guard !watching.contains(act.id) else { return }
        watching.insert(act.id)
        let game = act.attributes.gameId
        Task {
            for await data in act.pushTokenUpdates { post(kind: "activity", token: Self.hex(data), gameId: game) }
        }
        // swiped away (or taken down): the game's Live notification switch goes off, on the server and on the slate
        Task {
            for await st in act.activityStateUpdates {
                if st == .dismissed { gone(kind: "gone", gameId: game) }
                reportShowing()
            }
        }
        reportShowing()
    }

    // ---- started and ended by the app itself, the moment you switch one on or off on the slate (3.24.0) ----
    // The app puts it on the Lock Screen at once with the score it has; the server then picks up its token (posted
    // below, like any other) and keeps it current. Switching off takes it down at once.
    func fromPage(_ m: [String: Any]) {
        guard let op = m["op"] as? String, let kind = m["kind"] as? String else { return }
        start()
        if kind == "board" {
            if op == "end" {
                Task { for act in Activity<SlateBoardAttributes>.activities { await act.end(nil, dismissalPolicy: .immediate) } }
                return
            }
            guard let list = Self.decode(SlateBoardGameList.self, ["games": m["games"] ?? []]) else { return }
            let content = SlateBoardAttributes.ContentState(games: list.games, lead: m["lead"] as? Int)
            Task { await self.show(Activity<SlateBoardAttributes>.activities.first, attributes: SlateBoardAttributes(title: "Your slate"), state: content) }
            return
        }
        guard let id = m["id"] as? String else { return }
        if op == "end" {
            Task { for act in Activity<SlateGameAttributes>.activities where act.attributes.gameId == id { await act.end(nil, dismissalPolicy: .immediate) } }
            return
        }
        guard let attrs = Self.decode(SlateGameAttributes.self, m["attrs"]), let state = Self.decode(SlateGameAttributes.ContentState.self, m["state"]) else { return }
        Task {
            let existing = Activity<SlateGameAttributes>.activities.first { $0.attributes.gameId == id }
            // a new one listens on the game's broadcast channel (3.28.0), so the server's score updates reach it even
            // when Slate isn't running; without a channel it falls back to its own token
            if existing == nil, #available(iOS 18.0, *), let ch = await self.channel(for: id), ActivityAuthorizationInfo().areActivitiesEnabled {
                let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(15 * 60))
                if (try? Activity<SlateGameAttributes>.request(attributes: attrs, content: content, pushType: .channel(ch))) != nil {
                    self.postChannel(gameId: id)
                    return
                }
            }
            await self.show(existing, attributes: attrs, state: state)
        }
    }

    // update the one already showing, or start a new one (its push token goes to the server like any other)
    private func show<A: ActivityAttributes>(_ existing: Activity<A>?, attributes: A, state: A.ContentState) async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(15 * 60))
        if let existing, existing.activityState == .active || existing.activityState == .stale {
            await existing.update(content)
            return
        }
        _ = try? Activity<A>.request(attributes: attributes, content: content, pushType: .token)
    }

    private static func decode<T: Decodable>(_ type: T.Type, _ any: Any?) -> T? {
        guard let any, JSONSerialization.isValidJSONObject(any), let data = try? JSONSerialization.data(withJSONObject: any) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    // the game's broadcast channel from the server ("" when broadcast isn't available)
    private func channel(for gameId: String) async -> String? {
        var req = URLRequest(url: URL(string: "https://slate.djvillhard.workers.dev/api/live-channel")!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["pass": pass, "gameId": gameId, "env": env])
        req.timeoutInterval = 6
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let ch = j["channel"] as? String, !ch.isEmpty else { return nil }
        return ch
    }

    // tell the server this game's live notification is up, on its channel, so it keeps it current
    private func postChannel(gameId: String) {
        var req = URLRequest(url: Self.endpoint)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["pass": pass, "kind": "activity-ch", "gameId": gameId, "env": env])
        URLSession.shared.dataTask(with: req).resume()
    }

    // a live notification that's no longer on the phone: the server switches it off (so it isn't started again) and the
    // slate's button turns off at once if the page is open
    private func gone(kind: String, gameId: String?) {
        var body: [String: Any] = ["pass": pass, "kind": kind]
        if let gameId { body["gameId"] = gameId }
        var req = URLRequest(url: Self.endpoint)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        let bg = UIApplication.shared.beginBackgroundTask(withName: "slate-live-gone")
        URLSession.shared.dataTask(with: req) { _, _, _ in
            Task { @MainActor in UIApplication.shared.endBackgroundTask(bg) }
        }.resume()
        WebModel.shared.liveGone(gameId ?? "board")
    }

    private func post(kind: String, token: String, gameId: String?) {
        var body: [String: Any] = ["pass": pass, "kind": kind, "token": token, "env": env]
        if let gameId { body["gameId"] = gameId }
        var req = URLRequest(url: Self.endpoint)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        // a short background task so the post finishes even if iOS woke the app only to deliver the token
        let bg = UIApplication.shared.beginBackgroundTask(withName: "slate-live-token")
        URLSession.shared.dataTask(with: req) { _, _, _ in
            Task { @MainActor in UIApplication.shared.endBackgroundTask(bg) }
        }.resume()
    }

    private static func hex(_ d: Data) -> String { d.map { String(format: "%02x", $0) }.joined() }
}

// the page's list of board games, read with the same keys the server sends
private struct SlateBoardGameList: Decodable { var games: [SlateBoardGame] }

// The passcode's place in the Keychain. Readable after the phone's first unlock (tokens are posted while the phone is
// locked), on this phone only: it is not copied to other devices or restored onto a new one.
enum PassStore {
    private static var base: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "com.djvillhard.slate.pass",
         kSecAttrAccount as String: "slate-pass"]
    }

    static func read() -> String? {
        var q = base
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }

    // an empty passcode removes the entry
    @discardableResult
    static func write(_ value: String) -> Bool {
        SecItemDelete(base as CFDictionary)
        if value.isEmpty { return true }
        var q = base
        q[kSecValueData as String] = Data(value.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(q as CFDictionary, nil) == errSecSuccess
    }
}

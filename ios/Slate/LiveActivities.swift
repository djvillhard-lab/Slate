import ActivityKit
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
    var pass: String {
        get { UserDefaults.standard.string(forKey: "slate-pass") ?? "" }
        set {
            let changed = newValue != pass
            UserDefaults.standard.set(newValue, forKey: "slate-pass")
            if changed { lastStartToken = ""; lastBoardStartToken = "" }
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

    func resendTokens() {
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
            for await st in act.activityStateUpdates where st == .dismissed { gone(kind: "board-gone", gameId: nil) }
        }
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
            for await st in act.activityStateUpdates where st == .dismissed { gone(kind: "gone", gameId: game) }
        }
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
        Task { await self.show(Activity<SlateGameAttributes>.activities.first { $0.attributes.gameId == id }, attributes: attrs, state: state) }
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

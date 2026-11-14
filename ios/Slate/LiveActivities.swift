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
            if changed { lastStartToken = "" }
            start()
        }
    }

    func start() {
        guard !started, !pass.isEmpty, ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        started = true
        if #available(iOS 17.2, *) {
            Task {
                for await data in Activity<SlateGameAttributes>.pushToStartTokenUpdates {
                    let tok = Self.hex(data)
                    if tok != lastStartToken { lastStartToken = tok; post(kind: "start", token: tok, gameId: nil) }
                }
            }
        }
        // each live notification the server starts gets its own token, used for its updates and its end
        for act in Activity<SlateGameAttributes>.activities { watch(act) }
        Task {
            for await act in Activity<SlateGameAttributes>.activityUpdates { watch(act) }
        }
    }

    private func watch(_ act: Activity<SlateGameAttributes>) {
        guard !watching.contains(act.id) else { return }
        watching.insert(act.id)
        let game = act.attributes.gameId
        Task {
            for await data in act.pushTokenUpdates { post(kind: "activity", token: Self.hex(data), gameId: game) }
        }
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

import Foundation
import WatchConnectivity

// 3.120.0: hands today's slate to the Slate app on your Apple Watch. Each time the page sends a new slate (the
// "slate" message, also saved for the widgets), the newest copy goes to the Watch as its application context: the
// Watch keeps only the latest one and gets it even if its app is closed. The Watch refreshes the scores itself.
final class WatchLink: NSObject, WCSessionDelegate {
    static let shared = WatchLink()

    func start() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func send() {
        guard WCSession.isSupported() else { return }
        let s = WCSession.default
        guard s.activationState == .activated, s.isPaired, s.isWatchAppInstalled,
              let f = SlateTonight.file, let d = try? Data(contentsOf: f) else { return }
        try? s.updateApplicationContext(["tonight": d])
    }

    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        if state == .activated { DispatchQueue.main.async { self.send() } }
    }
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { WCSession.default.activate() }
    func sessionWatchStateDidChange(_ session: WCSession) { DispatchQueue.main.async { self.send() } }
}

import SwiftUI
import UserNotifications
import WebKit

// What the app knows about the page (which view is open, the theme) and the few things it can ask the page to do.
// The page side lives in index.html under "the iPhone app" (window.SlateApp and nativePost).
@MainActor
final class WebModel: ObservableObject {
    static let shared = WebModel()
    static let home = URL(string: "https://slate.djvillhard.workers.dev/")!

    @Published var view = "lineup"
    @Published var duo = false
    @Published var look = "dark"
    @Published private(set) var strip = false
    @Published var loadError: String?

    weak var webView: WKWebView?
    private var pushAsked = false

    var appVersion: String { Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "3.0" }

    // The first page load. A "-pass <code>" launch argument signs in (used by the CI screenshots).
    var startURL: URL {
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-pass"), i + 1 < args.count {
            return URL(string: Self.home.absoluteString + "#pass=" + args[i + 1]) ?? Self.home
        }
        return Self.home
    }

    // which strip button is lit
    var activeTarget: String {
        switch view {
        case "team": return "teams"
        case "game", "best": return ""
        default: return view
        }
    }

    func js(_ source: String) {
        webView?.evaluateJavaScript(source, completionHandler: nil)
    }

    func go(_ target: String) {
        view = target  // light the strip button right away; the page's own report follows
        js("window.SlateApp && SlateApp.go(\(Self.quote(target)))")
    }

    func setStrip(_ on: Bool) {
        guard on != strip else { return }
        strip = on
        js("window.SlateApp && SlateApp.setStrip(\(on))")
        setStripInset(trailingInset)
    }

    private var stripInset: CGFloat = 0
    private var trailingInset: CGFloat = 0
    func setStripInset(_ w: CGFloat) {
        trailingInset = w
        let v = strip ? w : 0
        guard abs(v - stripInset) >= 1 else { return }
        stripInset = v
        js("window.SlateApp && SlateApp.setInset && SlateApp.setInset(\(Int(v.rounded())))")
    }

    func reload() {
        loadError = nil
        if let wv = webView {
            if wv.url == nil { wv.load(URLRequest(url: startURL)) } else { wv.reload() }
        }
    }

    // ---- messages from the page ----
    func handle(_ body: Any) {
        guard let m = body as? [String: Any], let t = m["t"] as? String else { return }
        switch t {
        case "ready":
            loadError = nil
            js("window.SlateApp && SlateApp.setStrip(\(strip)); window.SlateApp && SlateApp.setInset && SlateApp.setInset(\(Int(stripInset.rounded())))")
        case "state":
            if let v = m["view"] as? String { view = v }
            if let l = m["look"] as? String { look = l }
            if let d = m["duo"] as? Bool { duo = d }
        case "push-status":
            pushStatus()
        case "push-request":
            pushAsked = true
            requestPush()
        default:
            break
        }
    }

    // ---- push alerts (Apple's push service) ----
    private func pushStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let status = settings.authorizationStatus
            Task { @MainActor in
                switch status {
                case .authorized, .provisional, .ephemeral:
                    self.js("window.SlateApp && SlateApp.onPushStatus('granted')")
                    UIApplication.shared.registerForRemoteNotifications()  // refreshes the token, which the page re-saves quietly
                case .denied:
                    self.js("window.SlateApp && SlateApp.onPushStatus('denied')")
                default:
                    self.js("window.SlateApp && SlateApp.onPushStatus('default')")
                }
            }
        }
    }

    private func requestPush() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            Task { @MainActor in
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                } else {
                    self.js("window.SlateApp && SlateApp.onPushStatus('denied'); SlateApp.onPushError()")
                }
            }
        }
    }

    func pushTokenArrived(_ token: String) {
        #if DEBUG
        let env = "sandbox"      // builds run from Xcode talk to Apple's test push server
        #else
        let env = "production"   // TestFlight and App Store builds
        #endif
        js("window.SlateApp && SlateApp.onPushToken(\(Self.quote(token)), \(Self.quote(env)))")
    }

    func pushFailed() {
        js("window.SlateApp && SlateApp.onPushError()")
    }

    static func quote(_ s: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: [s])
        let arr = data.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
        return String(arr.dropFirst().dropLast())
    }
}

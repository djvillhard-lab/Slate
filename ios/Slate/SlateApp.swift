import SwiftUI
import UserNotifications

// Slate for iPhone: a native shell around the live Slate web app (https://slate.djvillhard.workers.dev).
// Every web update reaches the app on its next launch or refresh; only changes to these Swift files need a new build.
@main
struct SlateApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        // live notifications: report tokens even when iOS launches the app in the background for one
        Task { @MainActor in LiveActivities.shared.start() }
        return true
    }

    // Regular iPhones stay upright like the Home Screen app; iPhone Duo can turn (its inner display is a small tablet).
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        DeviceShape.isWideScreen ? .allButUpsideDown : .portrait
    }

    // Apple's push service hands back this phone's token; the page saves it next to the web push subscriptions.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { @MainActor in WebModel.shared.pushTokenArrived(token) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        Task { @MainActor in WebModel.shared.pushFailed() }
    }

    // Alerts still show as banners while Slate is open.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }
}

@MainActor
enum DeviceShape {
    // Every regular iPhone screen is about 2.2 times taller than wide. Both iPhone Duo displays are about 1.4.
    static var isWideScreen: Bool {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        guard let size = scene?.screen.bounds.size, size.width > 0, size.height > 0 else { return false }
        let long = max(size.width, size.height), short = min(size.width, size.height)
        return UIDevice.current.userInterfaceIdiom == .phone && long / short < 1.8
    }
}

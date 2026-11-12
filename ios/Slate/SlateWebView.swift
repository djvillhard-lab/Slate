import SwiftUI
import WebKit

// The live Slate page in a WKWebView, set up to behave like the Home Screen app:
// edge to edge, no pinch zoom or swipe-back, links to other sites open outside the app.
struct SlateWebView: UIViewRepresentable {
    @ObservedObject var model: WebModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = .default()  // keeps the sign-in, settings and cached data between launches
        config.applicationNameForUserAgent = "Mobile/15E148 Safari/604.1 SlateApp/\(model.appVersion)"

        let content = WKUserContentController()
        content.add(WeakMessageHandler(context.coordinator), name: "slate")
        // set before the page's own script runs, so the page knows it's inside the app from the first frame
        let boot = "window.SLATE_NATIVE = { platform: 'ios', app: \(WebModel.quote(model.appVersion)), strip: \(model.strip) };"
        content.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = content

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.scrollView.contentInsetAdjustmentBehavior = .never  // the page handles the notch and home bar itself (viewport-fit=cover)
        web.allowsBackForwardNavigationGestures = false          // left/right swipes belong to the page (days, leagues)
        web.allowsLinkPreview = false
        if #available(iOS 16.4, *) { web.isInspectable = true }  // Safari > Develop can inspect the app's page
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        model.webView = web
        web.load(URLRequest(url: model.startURL))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        let model: WebModel
        init(model: WebModel) { self.model = model }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            model.handle(message.body)
        }

        // Slate's own pages load inside the app; everything else (ESPN, streaming apps, maps) opens outside it.
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let url = navigationAction.request.url else { return .allow }
            let scheme = url.scheme?.lowercased() ?? ""
            if scheme == "about" || scheme == "blob" || scheme == "data" { return .allow }
            if scheme == "http" || scheme == "https" {
                let ours = url.host?.lowercased() == WebModel.home.host?.lowercased()
                let mainFrame = navigationAction.targetFrame?.isMainFrame ?? true
                if ours || !mainFrame { return .allow }
            }
            _ = await UIApplication.shared.open(url)
            return .cancel
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.loadError = nil
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            if (error as NSError).code == NSURLErrorCancelled { return }
            model.loadError = error.localizedDescription
        }

        // iOS can stop a background page to save memory: load it again instead of showing a blank screen
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        // target="_blank" and window.open(): open outside the app
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url { UIApplication.shared.open(url) }
            return nil
        }

        // alert(), confirm() and prompt() work like they do in Safari
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async {
            await withCheckedContinuation { (done: CheckedContinuation<Void, Never>) in
                let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
                a.addAction(UIAlertAction(title: "OK", style: .default) { _ in done.resume() })
                if !show(a, from: webView) { done.resume() }
            }
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async -> Bool {
            await withCheckedContinuation { (done: CheckedContinuation<Bool, Never>) in
                let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
                a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in done.resume(returning: false) })
                a.addAction(UIAlertAction(title: "OK", style: .default) { _ in done.resume(returning: true) })
                if !show(a, from: webView) { done.resume(returning: false) }
            }
        }

        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo) async -> String? {
            await withCheckedContinuation { (done: CheckedContinuation<String?, Never>) in
                let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
                a.addTextField { $0.text = defaultText }
                a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in done.resume(returning: nil) })
                a.addAction(UIAlertAction(title: "OK", style: .default) { [weak a] _ in done.resume(returning: a?.textFields?.first?.text) })
                if !show(a, from: webView) { done.resume(returning: nil) }
            }
        }

        private func show(_ alert: UIAlertController, from view: UIView) -> Bool {
            var top = view.window?.rootViewController
            while let next = top?.presentedViewController { top = next }
            guard let top else { return false }
            top.present(alert, animated: true)
            return true
        }
    }
}

// WKUserContentController keeps a strong reference to its handlers; this breaks the cycle.
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

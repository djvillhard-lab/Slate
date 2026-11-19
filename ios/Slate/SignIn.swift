import AuthenticationServices
import CryptoKit
import UIKit

// Sign-in inside the app (3.114.0). The page asks for it (WebModel.handle "auth" and "apple") and gets the answer back
// through a JavaScript callback; the server (worker/google.js) ties the account to the Slate profile.
//
// Google: Google won't sign in inside a web view, so the sign-in page (google.html) opens in Apple's sign-in sheet
// (ASWebAuthenticationSession) on top of the app, instead of sending people out to Safari. The page ends at
// slate-auth://done, which closes the sheet; the app page is already checking with the server and finishes by itself.
// Apple: Sign in with Apple, Apple's own sheet. The app hands the page Apple's signed token and the nonce it was made
// with; the server checks the token against Apple's keys.
@MainActor
final class SlateSignIn: NSObject {
    static let shared = SlateSignIn()
    private var session: ASWebAuthenticationSession?
    private var appleDone: ((String?, String?, String?) -> Void)?
    private var rawNonce = ""

    // the Google page in Apple's sign-in sheet; done(true) when the page finished, false when it was closed
    func web(_ url: URL, done: @escaping (Bool) -> Void) {
        session?.cancel()
        let s = ASWebAuthenticationSession(url: url, callbackURLScheme: "slate-auth") { [weak self] callback, _ in
            Task { @MainActor in
                self?.session = nil
                done(callback != nil)
            }
        }
        s.presentationContextProvider = self
        s.prefersEphemeralWebBrowserSession = false  // keeps the Google sign-in Safari already has, so it's usually one tap
        session = s
        if !s.start() { session = nil; done(false) }
    }

    // Sign in with Apple; done(identityToken, rawNonce, error)
    func apple(done: @escaping (String?, String?, String?) -> Void) {
        appleDone = done
        rawNonce = Self.randomNonce()
        let req = ASAuthorizationAppleIDProvider().createRequest()
        req.requestedScopes = [.email]
        req.nonce = Self.sha256(rawNonce)
        let c = ASAuthorizationController(authorizationRequests: [req])
        c.delegate = self
        c.presentationContextProvider = self
        c.performRequests()
    }

    private func finishApple(_ token: String?, _ error: String?) {
        let cb = appleDone; appleDone = nil
        cb?(token, token == nil ? nil : rawNonce, error)
    }

    private static func randomNonce() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
    private static func sha256(_ s: String) -> String {
        SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    fileprivate static func anchor() -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.flatMap { $0.windows }.first { $0.isKeyWindow } ?? scenes.first?.windows.first ?? ASPresentationAnchor()
    }
}

extension SlateSignIn: ASWebAuthenticationPresentationContextProviding, ASAuthorizationControllerPresentationContextProviding {
    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated { SlateSignIn.anchor() }
    }
    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        MainActor.assumeIsolated { SlateSignIn.anchor() }
    }
}

extension SlateSignIn: ASAuthorizationControllerDelegate {
    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        let cred = authorization.credential as? ASAuthorizationAppleIDCredential
        let token = cred?.identityToken.flatMap { String(data: $0, encoding: .utf8) }
        Task { @MainActor in SlateSignIn.shared.finishApple(token, token == nil ? "Apple didn't send a sign-in. Try again." : nil) }
    }
    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let cancelled = (error as? ASAuthorizationError)?.code == .canceled
        Task { @MainActor in SlateSignIn.shared.finishApple(nil, cancelled ? "cancel" : "Sign in with Apple didn't finish. Try again.") }
    }
}

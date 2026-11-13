# Slate for iPhone: weekend setup on the iMac

The app is already written and builds on Apple's Xcode 27 (checked automatically on GitHub every time `ios/` changes).
This weekend is just: put it on your phone, then set things up so you never need the iMac again.

**How the app works:** it's a native shell that loads the live Slate site. Every web update shows up in the app
the next time it opens. Only changes to the Swift files in `ios/Slate/` need a new build, and Xcode Cloud can do
those builds without a Mac.

---

## Before Saturday (from your PC or phone)

1. **Join the Apple Developer Program** ($99/year) at developer.apple.com/programs/enroll with your own Apple ID.
   Approval can take a day or two, so do this first. (Without it, the app expires off your phone after 7 days.)
2. That's it. Everything else is ready in the repo.

## At the iMac (about an hour, most of it waiting on downloads)

### 1. Set up the Mac (15–45 min)
- Add a user account for yourself (System Settings > Users & Groups) so your Apple ID stays out of your mom's.
- Apple menu > About This Mac: it needs **macOS Tahoe 26.6 or later**. Update if not.
- App Store: install **Xcode** (big download, start it first). When it opens, let it install the **iOS** platform.
- Check: Xcode > About Xcode should say **27.1 or later** (27.1 is what fills iPhone Duo's screens).

### 2. Get the project (2 min)
- Xcode > Settings > Accounts > **+** > GitHub, sign in as djvillhard-lab (or Apple ID first, see step 3).
- Welcome window > **Clone Git Repository** > `https://github.com/djvillhard-lab/Slate.git` > Clone.
- Open **ios/Slate.xcodeproj**.

### 3. Sign it as you (2 min)
- Xcode > Settings > Accounts > **+** > Apple ID > sign in.
- Click the blue **Slate** project at the top left > **Slate** target > **Signing & Capabilities**.
- **Team:** pick your name (your developer team). Leave "Automatically manage signing" on.
- The bundle ID is `com.djvillhard.slate`. If Xcode says it's taken, change it to `com.djvillhard.slate2` and tell Claude.
- Push Notifications should already show under capabilities (it comes from Slate.entitlements).

### 4. Put it on your Duo (5 min)
- Plug the Duo into the iMac with a cable. Unlock it and tap **Trust**.
- On the phone: Settings > Privacy & Security > **Developer Mode** > on (it restarts).
- In Xcode's top bar, pick your iPhone Duo as the run destination, then press **▶ Run** (Cmd-R).
- First launch: on the phone, Settings > General > VPN & Device Management > trust your developer profile if asked.
- In the app, sign in once with your passcode (it keeps it after that).

### 5. Try it
- Folded and unfolded, rotated both ways. On iPhone Duo, Slate / Box Office / Teams / On TV / All games
  sit in the system strip on the right, and the floating menu button goes away.
- Links to ESPN, streaming apps and maps open outside the app, like the Home Screen version.
- Settings > Notifications > This phone > **Turn on**. (Alerts need step 7 before they arrive.)

### 6. Hand future builds to Apple (10 min): no Mac needed after this
- Xcode > **Product > Xcode Cloud > Create Workflow** > pick the Slate app > Grant access to the GitHub repo.
- Workflow: Start condition **Branch changes on main, files in ios/**. Action **Archive - iOS**, Post-action
  **TestFlight (Internal Testing)**. Save. Xcode Cloud now builds and ships a new TestFlight version whenever
  Claude changes the app's Swift code.
- In App Store Connect (appstoreconnect.apple.com) > Apps > Slate > TestFlight: add yourself and Drew as testers.
  You both install the **TestFlight** app and get Slate from there. TestFlight builds last 90 days; each new
  push makes a fresh one.

### 7. Turn on alerts through Apple (5 min)
- developer.apple.com/account > **Certificates, IDs & Profiles > Keys > +**. Name it "Slate push", tick
  **Apple Push Notifications service (APNs)**, Continue > Register > **Download** (you only get one download).
- Note the **Key ID** (10 characters) and your **Team ID** (top right of the developer site, 10 characters).
- Cloudflare dashboard > Workers & Pages > **slate** > Settings > **Variables and Secrets** > Add, type **Secret**:
  - `APNS_KEY` = the whole text of the downloaded .p8 file (open it in TextEdit, copy everything)
  - `APNS_KEY_ID` = the Key ID
  - `APNS_TEAM_ID` = the Team ID
- Deploy. Within a minute the app on your phone gets "Alerts are on for this phone."

The Home Screen web app keeps working the whole time; keep it until you're happy with the app.

---

## If something goes wrong
- **"No account for team" / signing errors:** Signing & Capabilities > Team: pick your team again.
- **"Untrusted developer" on the phone:** Settings > General > VPN & Device Management > trust it.
- **The Duo option isn't in the run menu:** unlock the phone, replug, and wait for Xcode to finish "preparing" it.
- **Black bars on the Duo:** Xcode is older than 27.1. Update it from the App Store.
- **Anything else:** take a photo of the Xcode error and send it to Claude.

## What's in ios/
- `Slate/SlateApp.swift` app start, push registration, rotation rules
- `Slate/RootView.swift` the screen: the page, plus the iPhone Duo control strip
- `Slate/SlateWebView.swift` the web view: edge to edge, outside links, alerts and dialogs
- `Slate/WebModel.swift` what the app and the page tell each other (window.SlateApp in index.html)
- `Slate.entitlements`, `Slate-Info.plist` push permission, launch screen, export compliance
- `tools/gen_project.py` writes Slate.xcodeproj (only needed to change build settings)

# Slate for iPhone: weekend setup on the iMac

The app is already written and builds on Apple's Xcode 27 (checked automatically on GitHub every time `ios/` changes).
This weekend is just: put it on your phone, then set things up so you never need the iMac again.

**How the app works:** it's a native shell that loads the live Slate site. Every web update shows up in the app
the next time it opens. Only changes to the Swift files in `ios/Slate/` need a new build, and Xcode Cloud can do
those builds without a Mac.

**Version 3:** the first build on your phone is Slate 3.0. The app's version is already set to 3.0, and the
web app moves to 3.0.0 the same day, so the release history marks the real app as the start of version 3.

---

## Before Saturday (from your PC or phone)

1. ~~Join the Apple Developer Program~~ Done Nov 13. Wait for Apple's activation email before step 3 below.
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
- The bundle ID is `com.djvillhard.slate`. If Xcode says it's taken, change it to `com.djvillhard.slate2` and tell Claude
  (alerts then also need a Cloudflare secret `APNS_TOPIC` = the new bundle ID).
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
- Xcode > **Product > Xcode Cloud > Create Workflow** > pick the Slate app. If Xcode offers to create the app in
  App Store Connect, say yes (name: Slate). Grant access to the GitHub repo when asked.
- Workflow:
  - Start condition 1: **Branch changes**, branch **main**, files in **ios/**.
  - Start condition 2: **Schedule**, weekly. (TestFlight builds stop working after 90 days; a weekly build
    means yours and Drew's never expire, even in months with no app changes.)
  - Action: **Archive - iOS**, distribution **TestFlight and App Store**.
  - Post-actions: **TestFlight Internal Testing** (group: you) and **TestFlight External Testing** (group: Friends).
  - Save, then **Start Build** once by hand. Builds take ~10–20 minutes and are free (25 hours a month included).
- App Store Connect (appstoreconnect.apple.com) > Apps > Slate > TestFlight:
  - **Internal Testing:** add yourself. Your builds show up right away.
  - **External Testing:** make a group called Friends, add Drew by email (or turn on a Public Link and text it
    to him). The first build goes through Apple's beta review, usually 1–2 days; after that he gets updates fast.
    It asks for a short "What to test" note and a contact email: anything works ("Sports slate app").
  - Both of you install the free **TestFlight** app and get Slate from there. In TestFlight > Slate, turn on
    **Automatic Updates**.

### 7. Turn on alerts through Apple (5 min)
- developer.apple.com/account > **Certificates, IDs & Profiles > Keys > +**. Name it "Slate push", tick
  **Apple Push Notifications service (APNs)**, Continue > Register > **Download** (you only get one download).
- Note the **Key ID** (10 characters) and your **Team ID** (top right of the developer site, 10 characters).
- Cloudflare dashboard > Workers & Pages > **slate** > Settings > **Variables and Secrets** > Add, type **Secret**:
  - `APNS_KEY` = the whole text of the downloaded .p8 file (open it in TextEdit, copy everything)
  - `APNS_KEY_ID` = the Key ID
  - `APNS_TEAM_ID` = the Team ID
- Deploy. Within a minute the app on your phone gets "Alerts are on for this phone."
- Alerts work for both kinds of build: the copy Xcode installs uses Apple's test push server, TestFlight copies
  use the real one. Slate keeps track of which is which. After switching to the TestFlight copy, turn alerts on
  again in it (Settings > Notifications > This phone).

### 8. Clean up your mom's iMac (5 min)
First make sure: Xcode Cloud finished at least one build (App Store Connect > Xcode Cloud), and Slate installs
and opens from TestFlight on your phone. After that the iMac isn't needed; builds run on Apple's servers.
- **If you used your own Mac user (recommended):** log out, log into your mom's account, System Settings >
  Users & Groups > select your user > **Delete User** > delete the home folder. That removes your Apple ID,
  Xcode settings and signing keys, the project, simulators and caches in one step.
- **Then remove Xcode** (it's installed for everyone): Finder > Applications > drag **Xcode** to the Trash >
  empty the Trash (enter her password if asked).
- **If you didn't use a separate user:** Xcode > Settings > Accounts > select your Apple ID > **−**. Quit Xcode,
  drag it to the Trash. Finder > Go > Go to Folder > `~/Library/Developer` > delete that folder (simulators and
  builds, often 20-40 GB). Delete the cloned Slate folder. Empty the Trash.
- On your phone, use the **TestFlight** copy of Slate from now on (that's the one that updates). The copy Xcode
  installed directly can be deleted. Developer Mode can stay on or off.

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

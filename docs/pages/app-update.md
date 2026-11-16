# iPhone app update notice

The "New app version … is ready" bar at the top of My lineup, iPhone app only (`src/app/280-ios-bridge.js`, markup `#app-upd` in `src/body.html`).

**Done (3.66.2):** it shows only when a newer build than the one running is *really* in TestFlight. Proof = some person's phone is already running it: every usage count the app sends (`/api/usage`, with its build) raises `stats/app-build` in the worker (`worker/usage.js`), and the bar reads it from `POST /api/usage/app-build`. Before, it trusted the newest "TestFlight: x (N)" line in the changelog plus 35 minutes, so a build stuck in Apple's processing or review was announced (DJ, Nov 16, 2026).

**Trade-off:** the first person to install a build never sees the bar for it (TestFlight tells them itself). If DJ is an internal tester and Drew/Doug external, Drew/Doug can see it while their copy still waits for Apple's beta review.

**Open:** the exact answer is App Store Connect's API (build processing state and beta review per tester group). Needs an App Store Connect API key (issuer id, key id, .p8) saved as worker secrets, which only DJ can make.

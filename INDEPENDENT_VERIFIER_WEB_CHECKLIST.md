# What the independent verifier must obtain/verify from the web (I have no internet)

I cannot reach the internet, download dependencies, run GitHub Actions, or drive a real browser. The items
below are the ONLY web/external actions needed to close the Step 3 browser gate. Everything else in this
package is already executed offline and green.

## 1. Verify the vendored runtime files against their upstream sources (integrity)
Confirm each packaged file is the genuine, unmodified upstream artifact by matching its SHA-256:

| File | Upstream URL | Expected SHA-256 |
|---|---|---|
| vendor/react.production.min.js | https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js | 4b4969fa4ef3594324da2c6d78ce8766fbbc2fd121fff395aedf997db0a99a06 |
| vendor/react-dom.production.min.js | https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js | 21758ed084cd0e37e735722ee4f3957ea960628a29dfa6c3ce1a1d47a2d6e4f7 |
| tools/compiler/babel.standalone.7.23.2.min.js | https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js | 7bcd2533d8908a1545817804bcb78aeaf9bd6771694bc0f62cc44bfce4f135b2 |

(`sha256sum vendor/*.js tools/compiler/*.js` then compare. These are also recorded in
vendor/VENDOR_MANIFEST.json, tools/compiler/compiler.lock.json and dependency_manifest.json.)

## 2. Install a real Chromium and run the gate
On a machine/CI where loopback navigation is permitted (the verifier's managed desktop blocked it with
net::ERR_BLOCKED_BY_ADMINISTRATOR; GitHub-hosted Ubuntu runners allow it):

    node tests/run_preflight.js
    CHROMIUM_BIN=/usr/bin/chromium node chromium/run_chromium.js

Record the real Chrome/Chromium version string.

## 3. Run the CI workflow
Push the package so its contents are at the repository root and run
`.github/workflows/step3-browser-gate.yml` (Actions → Step 3 Browser Gate). Collect the
`step3-chromium-evidence` artifact (uploaded even on failure).

## 4. Confirm zero external application requests
From `chromium/results/chromium_network.log`, confirm the application made no non-loopback request.

## 5. Decide the defect state
If status is PASSED with JUnit failures = 0 and zero external application requests → set
`DEF-AL-PRESSURE = RESOLVED` and link the workflow run, `chromium_result.json`, `chromium_junit.xml`,
retaining production SHA 8a0e39b68116c87797f380756ec4affd6ed5d79e3aef03521d5e63e58d82813b.
If status is ENVIRONMENT_BLOCKED → the block is the environment, not the application; re-run where loopback
is allowed (CI).

Nothing else from the web is required.

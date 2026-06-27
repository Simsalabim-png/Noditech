# Step 3.8 — CI execution instructions

The real Chromium A–H gate runs in GitHub Actions (`.github/workflows/step3-browser-gate.yml`), because the
independent verifier's managed desktop environment blocks Chromium navigation to localhost
(`net::ERR_BLOCKED_BY_ADMINISTRATOR`). GitHub-hosted Ubuntu runners allow loopback navigation.

## How to run

1. Place the contents of this package at the **repository root** (so `tests/`, `chromium/`, `vendor/`,
   `SHA256SUMS.txt` and `.github/workflows/step3-browser-gate.yml` are all at the top level).
   - If you keep the package in a subdirectory, add `defaults: { run: { working-directory: <subdir> } }`
     to the job, or adjust the `path:` and `run:` lines accordingly.
2. Push to GitHub (or open a PR, or run the workflow manually via **Actions → Step 3 Browser Gate → Run
   workflow**).
3. The job: installs Node 22 + Google Chrome (stable), verifies `SHA256SUMS.txt`, runs
   `node tests/run_preflight.js`, resolves `CHROMIUM_BIN` explicitly, then runs
   `node chromium/run_chromium.js`.
4. Evidence is uploaded as the **`step3-chromium-evidence`** artifact **even on failure**:
   `chromium_result.json`, `chromium_junit.xml`, `render_root_diagnostic.json`, console / page-error /
   stderr / network logs, and screenshots.

## Local reproduction (any machine with Chrome where loopback navigation is allowed)

    node tests/run_preflight.js
    CHROMIUM_BIN="$(command -v google-chrome || command -v chromium)" node chromium/run_chromium.js

## Offline guarantee

The tested application loads only from the package-local server (`http://127.0.0.1:<dynamic-port>/...`). The
runner aborts every non-loopback application request and records the full network log; acceptance requires
**zero external application requests**. (Installing the runner's own Chrome is a CI-environment step, not an
application runtime dependency.)

## Navigation-block handling (§3.8)

`chromium/run_chromium.js` captures the `Page.navigate` result. If `errorText` is present it stops
immediately and classifies `ERR_BLOCKED_BY_ADMINISTRATOR` / `ERR_ACCESS_DENIED` /
`ERR_PROXY_CONNECTION_FAILED` / similar as **`ENVIRONMENT_BLOCKED`** (exit code 4), recording the navigation
result and `location.href` in `render_root_diagnostic.json`. It does **not** report missing React / missing
`#root` / render failure when navigation itself failed.

## On a green run

When the CI job is green (status `PASSED`, JUnit failures 0, zero external application requests),
`DEF-AL-PRESSURE` is set to `RESOLVED` with the workflow run, `chromium_result.json` and `chromium_junit.xml`
linked, and the exact production SHA retained.

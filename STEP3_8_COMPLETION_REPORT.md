# Step 3.8 — CI Execution Closure (narrow)

**Programme:** Noditech HVAC&R calculator — A/L atmospheric-pressure closure
**Step:** 3.8 (navigation error handling + GitHub Actions Chromium gate)
**Date:** 2026-06-26
**Governance:** **Simen Allum is Product Owner and IP Owner. Noditech is Customer Zero only.**

> Narrow scope: no production physics/UI change, no harness redesign, **Step 4 not begun**. Corrected
> production artifact unchanged: `8a0e39b68116c87797f380756ec4affd6ed5d79e3aef03521d5e63e58d82813b`.

## Context

Step 3.7 passed every offline gate (checksums, preflight 18/18, source equivalence, artifact binding,
structural + local-dependency + governance validation). The independent verifier has **Chromium 144.0.7559.96**,
but the managed desktop environment blocks Chromium navigation to loopback:

```
Page.navigate → net::ERR_BLOCKED_BY_ADMINISTRATOR   (both 127.0.0.1 and localhost; server received 0 requests)
```

This is an **environment policy restriction, not an application-render failure**.

## 1. Navigation error handling (runner)

`chromium/run_chromium.js` now captures the `Page.navigate` result. If `errorText` is present it **stops
immediately** and classifies `ERR_BLOCKED_BY_ADMINISTRATOR`, `ERR_ACCESS_DENIED`,
`ERR_PROXY_CONNECTION_FAILED` (and similar) as **`ENVIRONMENT_BLOCKED`** (exit code 4). It does **not**
report missing React / missing `#root` / render failure when navigation itself failed. The
`render_root_diagnostic.json` and `chromium_result.json` record the **navigation result**, the
**`location.href`**, and the **server request count**. JUnit marks this as an `error` (environment), not a
`failure` (so it never reads as an application defect); failures = 0.

## 2. GitHub Actions Chromium gate

`.github/workflows/step3-browser-gate.yml` runs on `ubuntu-latest` with Node 22 and Google Chrome (stable),
where loopback navigation is permitted. Steps: verify `SHA256SUMS.txt` → `node tests/run_preflight.js` →
resolve `CHROMIUM_BIN` explicitly → `node chromium/run_chromium.js`. Browser evidence
(`chromium_result.json`, `chromium_junit.xml`, `render_root_diagnostic.json`, console / page-error / stderr /
network logs, screenshots) is uploaded as artifact **`step3-chromium-evidence` even on failure**
(`if: always()`). See `CI_EXECUTION_INSTRUCTIONS.md`.

## 3. Offline runtime preserved

The tested application loads only from the package-local server (`http://127.0.0.1:<dynamic-port>/...`); the
runner aborts every non-loopback application request and records the full network log. Acceptance requires
**zero external application requests**. Installing the runner's own Chrome is a CI-environment step, not an
application runtime dependency.

## 4. Browser gate acceptance

The workflow runs the **existing A–H suite unchanged** (initial missing pressure; invalid cases; valid 95.0
and 101.5 kPa; explicit reference 101.325 kPa; WITHHELD UI + reason; save/session log; CSV; JSON/session;
print; screenshots; no page errors; zero external application network).

## 5. Defect status

**`DEF-AL-PRESSURE` = PENDING_INDEPENDENT_BROWSER_VERIFICATION** until the CI Chromium job passes. On a real
passing CI run it becomes RESOLVED with the workflow run, `chromium_result.json` and `chromium_junit.xml`
linked, and the production SHA `8a0e39b68116c87797f380756ec4affd6ed5d79e3aef03521d5e63e58d82813b` retained.

## Evidence provenance (§10)

**Executed by Claude (offline, in this environment):** package build; checksum generation (`SHA256SUMS.txt`);
source extraction; application compilation (`app.compiled.js`); source equivalence; JavaScript syntax checks
(React/ReactDOM/compiled app); structural validation (preflight 23/23, JSON + JUnit); offline preflight;
static-server self-test (14/14); compiled-app render proof; render-tree + regression; governance; clean-room
run from a freshly extracted ZIP (offline portion).

**NOT executed by Claude (no internet / no browser here — independent verifier owns these):** the real
Chromium A–H run; GitHub Actions / external CI; browser screenshots; real Chrome/Chromium version capture;
external network-policy validation; upstream dependency-source verification. No fabricated Chromium JSON,
browser JUnit, screenshots, Chrome version, GitHub run URL/ID, or resolved-defect evidence is included. The
runner writes the real browser evidence into `chromium/results/` and `screenshots/` when executed (see
`chromium/results/PENDING_BROWSER_RESULTS.md`).

## Still green here (run by Claude, offline)

Checksums, path-safety, extract + compile, source equivalence, preflight 18/18, static-server self-test 14/14,
compiled-app render proof, render-tree, governance — **offline suite 8/8** — plus a clean-room run from a
freshly extracted ZIP. The real Chromium A–H suite runs in CI (this build environment has no browser).

**Stop after Step 3.8. Step 4 not begun.**

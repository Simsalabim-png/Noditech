# Step 3.7 — Final Browser Gate — Manifest

Generated: 2026-06-26
**Simen Allum is Product Owner and IP Owner. Noditech is Customer Zero only.**
Corrected production artifact SHA-256: `8a0e39b68116c87797f380756ec4affd6ed5d79e3aef03521d5e63e58d82813b` (unchanged; no production diff in Step 3.7).

## Layout (all paths relative to package root; no absolute/machine-specific paths)
| Path | Role |
|---|---|
| STEP3_7_COMPLETION_REPORT.md | Completion report + honest evidence split |
| EVIDENCE_STATUS.json | Three-way: run-by-Claude / prepared / verifier-to-generate |
| MANIFEST.md / SHA256SUMS.txt / VERIFICATION_OUTPUT.txt | Integrity |
| package.json / dependency_manifest.json | Zero-npm; locked packaged compiler |
| corrected/Kalkulator_build9.6-rc8_step3_4.src.html | Corrected production artifact (no diff) |
| tools/compiler/babel.standalone.7.23.2.min.js | Locked build-time compiler (SHA-pinned; NOT shipped to browser) |
| tools/compiler/compiler.lock.json | Compiler lockfile (name/version/SHA/source) |
| tests/extract_app_source.js | Deterministic application-source extraction |
| tests/compile_app.js | Compile extracted source → app.compiled.js + source_equivalence.json |
| vendor/react.production.min.js (18.2.0) | Clean runtime, served as-is |
| vendor/react-dom.production.min.js (18.2.0) | Clean runtime, served as-is |
| vendor/VENDOR_MANIFEST.json | Runtime versions/sources/SHA-256/JS-syntax result |
| chromium/generated/app.compiled.js | Precompiled real app (no JSX/babel/CDN) |
| chromium/test_harness.html | Minimal static harness (script src only) |
| chromium/server.js | Node-builtin 127.0.0.1 static server (traversal-safe, request log) |
| chromium/run_chromium.js | Real-Chromium A–H runner over HTTP (CDP; no npm) |
| chromium/results/source_equivalence.json | production/extracted/compiled SHA chain |
| chromium/results/structural_validation.json | Preflight 18/18 |
| chromium/results/js_syntax_check.json | React/ReactDOM/app.compiled syntax + SHA |
| chromium/results/server_selftest.json | Static-server 14/14 |
| chromium/results/PENDING_BROWSER_RESULTS.md | Where the verifier's browser outputs land |
| tests/run_preflight.js | Pre-browser validation gate (§6) |
| tests/server_selftest.js | HTTP serving + traversal proof (run by Claude) |
| tests/harness_render_check.js | Compiled-app render proof (offline VM) |
| tests/render_tree_evidence.js | Real-component render-tree (6 scenarios) |
| tests/sha_consistency.js / path_safety.js / governance_check.js | Consistency / path-safety / governance |
| tests/run_offline_suite.js | Consolidated offline suite (8/8) → JUnit |
| tests/clean_room.sh | §11 clean-room sequence (extract→…→Chromium→checksum) |
| tests/engine.js / mount.js | Offline engine + mount tooling |
| results/offline_suite_result.json / offline_junit.xml | Offline suite (run by Claude) |
| results/render_tree_evidence.json / harness_render_check.json | Render proofs |
| results/governance_result.json | Governance result |
| results/defect_evidence_update.json | DEF-AL-PRESSURE = PENDING_INDEPENDENT_BROWSER_VERIFICATION |
| results/clean_room_execution_log.txt | Clean-room run from freshly extracted ZIP |
| screenshots/ | Populated by the verifier's Chromium run |

## Browser status (honest)
Real Chromium A–H: NOT run in this build environment (no browser; npm/CDN unreachable). No simulated browser
results are shipped. The verifier produces them via:
  node tests/run_preflight.js && CHROMIUM_BIN=/usr/bin/chromium node chromium/run_chromium.js

## Checksum scope
SHA256SUMS.txt covers deterministic content. Excluded (environment/time/verifier-specific):
results/clean_room_execution_log.txt, VERIFICATION_OUTPUT.txt, SHA256SUMS.txt, chromium/results/server_selftest.json
(dynamic port), results/harness_render_check.json + chromium/results/harness_render_check.json (live clock),
chromium/results/chromium_* and render_root_diagnostic.json (verifier-generated), screenshots/*.

## Step 3.8 additions
| Path | Role |
|---|---|
| STEP3_8_COMPLETION_REPORT.md | Step 3.8 report (nav error handling + CI gate) |
| .github/workflows/step3-browser-gate.yml | GitHub Actions Chromium gate (Ubuntu, Node 22, Chrome; uploads evidence on failure) |
| CI_EXECUTION_INSTRUCTIONS.md | How to run the CI gate; offline guarantee; nav-block handling |
| chromium/run_chromium.js | Updated: Page.navigate error classification → ENVIRONMENT_BLOCKED (exit 4); navigation + location.href in diagnostic |

# Milestone 1 implementation status

## Review authority

- Recovery integration base: current production `main` at `d6ab3a4f3dc1ce4f3eda6fcabaaeaa28f7862e17` (behind 0). The historical baseline `cb888c6a8cd943a2bdb8a252ebe8236d8743cc8e` / artifact `1ef3926dfc1257a9812fc591a237da5b79ef538900f96dd39287a249874f6c31` is historical evidence only and is not the current review authority.
- Authoritative working branch: `m1-integrated-20260630` (the scratch branches `fix/milestone1-correctness-20260630` and `m1-20260630` are superseded and must not be used).
- Tracking PR: **Draft PR #51 — "Milestone 1 correctness recovery"** (base `main`, head `m1-integrated-20260630`); must remain Draft.
- Independent pre-implementation verdict: `GO WITH REQUIRED CHANGES`. The first exact-head review (`f14edb47…44822`) returned **REQUEST CHANGES**; this branch carries the corrections.
- **Exact-head invalidation:** every new commit creates a new exact head and invalidates the prior review, candidate SHA-256, section hashes, browser verdict, and CI evidence. Regenerate all evidence on the new head.
- No ready transition, merge to `main`, deploy, tag, release, or `dry_run:false` is authorized. Issue #48 remains open.

## Implemented in the draft branch

1. Canonical Celsius state with Celsius/Fahrenheit display projection for active A/A, A/L and L/L temperature fields.
2. Canonical projection and Fahrenheit-valid input ranges for refrigerant suction, liquid-line and measured-discharge temperatures.
3. Fahrenheit-valid input ranges for A/L and L/L liquid temperatures.
4. Fixed Liquid/Liquid COP concepts:
   - cooling COP always equals `Q_cold / P_el`;
   - heating COP always equals `Q_hot / P_el`;
   - active-mode COP is retained only for the active summary/formula.
5. Air/Air blocked values use unavailable/null semantics instead of numeric zero.
6. Air/Air chart points consume the evaluated Air/Air result states and are withheld unless all required values are finite.
7. Air/Air blocked EER styling and bar width are finite-safe.
8. Air/Air Save is disabled by the existing evaluated result state.
9. Numeric golden vectors added for A/A and A/L.
10. Generated Air/Air and Air/Liquid component hashes are recalculated after the final deterministic transform.
11. Build-generated user-visible identity: the deterministic build sets `BUILD_VERSION = "Build 9.8-pc2"`, `BUILD_DATE = "2026-06-30"`, and `BUILD_HASH` to the first 12 hex of SHA-256 of the app script (computed with the field blanked, then injected), so the artifact identity matches its `Kalkulator_build9.8-pc2.html` filename.
12. The dedicated CI workflow `verify-milestone1-correctness` wires the Chromium browser gates (`npm run chromium`, `npm run chromium:ll-cutover`, `npm run chromium:milestone1`). The new `chromium:milestone1` runner (`chromium/run_milestone1_assertions.js`) drives the exact built candidate and implements the required exact-candidate assertions (A/A blocked/valid/round-trip/re-block, A/L blocked/valid/round-trip and the valid-liquid-vs-invalid-contract distinction, L/L fixed COP cards across mode and unit round-trips, refrigerant round-trips and Fahrenheit ranges, no non-finite attributes, zero console/page errors). These browser assertions are **executed in CI on a real Chromium**, not in Claude's offline environment; their pass/fail status comes from the CI run, not from this document. A Node governance test (`tests/build/milestone1-browser-runner.test.js`) pins the required assertion IDs so coverage cannot silently regress.

## Current candidate (exact head — regenerate on every new commit)

- Candidate artifact SHA-256: `edaa93726357a3bc5fee63380ecdc61f1bef5a1b0ea7aa8b324087f32079ae30`
- Build identity: `Build 9.8-pc2 · 2026-06-30 · 568ec3bad455`
- A/A section hash after: `53734e338144b47751185b3a94394f6cb364e1dd6fc2754787212e0d42a34fbf`
- A/L section hash after: `9d666dfc903b0be65fb86b3d3ff4c48cb86434c6e1e9aa86d5f42a2d6b5652ba`

## Still required before any release consideration

- Exact-head CI run on the corrected head (Node suites, build, offline, `verify-pc6`, and the now-wired Chromium gates) all green with zero failed and zero skipped required gates.
- Green `deploy-pc2-pages` verification with `EXPECTED_PC2_SHA256` pinned to the final artifact SHA (no deploy from the PR).
- Independent review of the exact corrected branch head.
- New explicit production GO from Simen before any merge or deploy.

# Milestone 1 implementation status

## Review authority

- Production base: `main` at `d6ab3a4f3dc1ce4f3eda6fcabaaeaa28f7862e17`.
- Authoritative verification branch: `automation/m1-closeout-staging-20260701`.
- Tracking PR: **Draft PR #55 — M1 final verification**. It must remain Draft.
- Historical PRs #51, #53 and #54 are superseded verification paths and must not be merged.
- Every new commit creates a new exact head and invalidates earlier CI, browser evidence and review.
- No Ready transition, merge, tag, release, deployment, `dry_run:false`, or issue #48 closure is authorized without a separate explicit GO from Simen.

## Implemented

1. Canonical Celsius state with Celsius/Fahrenheit display projection for A/A, A/L, L/L and refrigerant temperature fields.
2. Fahrenheit-valid engineering ranges, with the governed `min` and `max` values exposed on the rendered inputs as well as enforced by internal validation.
3. Fixed Liquid/Liquid physical COP concepts:
   - Cooling COP = `Q_cold / P_el`;
   - Heating COP = `Q_hot / P_el`.
4. Air/Air unavailable/null semantics, finite-safe charts and disabled Save behavior while blocked.
5. Stable, unique `data-m1-*` hooks for exact-candidate browser verification.
6. Numeric A/A and A/L golden vectors and deterministic section-byte anchors.
7. Deterministic user-visible build identity matching `Kalkulator_build9.8-pc2.html`.
8. Existing general Chromium and Liquid/Liquid cutover suites remain active.
9. The dedicated workflow also opens `chromium/milestone1_selftest.html` in real Chromium. The same-origin test loads `dist-milestone1/Kalkulator_build9.8-pc2.html`, drives the actual candidate UI and writes JSON/JUnit evidence through `chromium/verify_milestone1_selftest.js`.
10. Runtime hook uniqueness is mode-aware because mutually exclusive A/A and A/L components are not mounted simultaneously. Deterministic Node tests separately prove every generated hook occurs exactly once in the artifact.

## Current deterministic candidate

- Artifact SHA-256: `e41bd3e9c14e6e8588c8de4ba40e3329cf7e4d464d8007f6b8cb75e9ed51c4ba`
- Identity: `Build 9.8-pc2 · 2026-06-30 · 4798e55eefee`
- A/A section SHA-256: `53734e338144b47751185b3a94394f6cb364e1dd6fc2754787212e0d42a34fbf`
- A/L section SHA-256: `9d666dfc903b0be65fb86b3d3ff4c48cb86434c6e1e9aa86d5f42a2d6b5652ba`

## Exact-head acceptance gates

The final exact head is acceptable for independent closeout review only when GitHub shows:

- deterministic build success and the pinned artifact SHA above;
- named Node suites and integration gates green;
- `verify-pc6` green;
- `deploy-pc2-pages` verification green, with deployment skipped on the pull request;
- general Chromium regression: zero failures;
- Liquid/Liquid cutover Chromium: zero failures;
- exact-candidate Milestone 1 Chromium: zero failures and zero skipped required assertions;
- fresh independent review of that exact head.

Passing these gates does not authorize Ready, merge or deployment. Those remain separate Simen GO decisions.

# Milestone 1 freeze transition

## Scope

This reviewed exception applies only to the corrective Milestone 1 work approved after the independent pre-implementation review of production baseline `cb888c6a8cd943a2bdb8a252ebe8236d8743cc8e` and artifact SHA-256 `1ef3926dfc1257a9812fc591a237da5b79ef538900f96dd39287a249874f6c31`.

The approved corrections are:

1. Temperature-unit switching must preserve the physical state and all engineering results.
2. Liquid/Liquid cooling and heating COP cards must retain fixed physical meanings in both operating modes.
3. Blocked Air/Air results must project unavailable values as null/`—`, must not emit non-finite chart coordinates, and must not allow misleading save/export actions.

No new calculation method, product behavior, A/A formula, A/L formula, fluid property source, or release process is authorized.

## Freeze transition

The existing byte-level A/A and A/L component anchors remain mandatory until the corrective patch is built and reviewed. Because the approved unit-state correction necessarily changes component code, the patch may update those byte anchors only when all of the following are present in the same review head:

1. Numeric golden-vector tests for A/A and A/L fixed physical inputs and outputs, captured from the production baseline before the refactor.
2. Unit round-trip tests proving that C → F → C preserves canonical temperature, status, capacity, COP/EER, humidity state, and saved/exported values within the tolerances below.
3. New post-fix byte anchors for the changed component sections.
4. Deterministic double-build equality and an exact candidate artifact SHA-256.
5. Full Node, browser, offline, governance, and protected-file checks.
6. Independent review of the exact patch head.

The byte freeze is therefore changed in form, not removed or weakened: behavioral numeric invariants are added before the byte anchors are advanced.

## Required tolerances

- Temperature display round-trip: at most `0.05 °C` difference after C → F → C.
- Capacity, COP/EER, humidity ratio, enthalpy, mass flow, and balance values: identical to the production golden value at the existing displayed precision; underlying numeric relative tolerance `1e-9` unless an existing engine test defines a stricter tolerance.
- Blocked state: no calculated numeric value may be projected as zero solely because the value is unavailable.
- Browser console on initial blocked A/A load: zero errors.
- No SVG or Canvas coordinate may contain a non-finite value.

## Required browser regressions

1. A/A and A/L unit round-trip preserves the physical result.
2. L/L Heating mode displays distinct fixed cards:
   - `COP cooling = Q_cold / P_el`
   - `COP heating = Q_hot / P_el`
3. Initial blocked A/A load renders `—` for unavailable result values and emits zero console errors.
4. Save/export controls are disabled with an explicit reason when their result contract is blocked.
5. Charts consume the same result contract as cards and do not independently recompute blocked values.

## Test-count policy

Acceptance is based on named suites and successful conclusions, not a permanently hard-coded historical total. The evidence report must state the exact commands, discovered test count, pass count, fail count, and skipped count for the exact review head.

## Release governance

- Work occurs only on `fix/milestone1-correctness-20260630`, based on `cb888c6a8cd943a2bdb8a252ebe8236d8743cc8e`.
- A draft PR may be opened for evidence and review.
- No ready-for-review transition, merge to `main`, GitHub Pages deployment, tag, or release is authorized without a new explicit production GO from Simen.
- Existing deterministic-build, exact-SHA, browser, offline, protected-file, evidence, and post-deploy controls must remain enabled.

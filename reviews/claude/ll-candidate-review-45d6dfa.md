# Claude review package — L/L candidate gate

## Review target

- Repository: `Simsalabim-png/Noditech`
- Branch: `feature/liquid-liquid-mode-aware-correctness`
- Review commit: `45d6dfaec7416cd4b1dd5676bef609ae8e7afa62`
- Base: `develop` at `123c35290169443623c3f4a4a56cd191374380a7`
- Pull request: #24

## Required review posture

Act as an independent verifier. Do not assume the implementation is correct. Report concrete findings with file, line, severity, impact and a reproducible example. Do not propose unrelated refactors.

## Hard invariants

1. A/A behavior must remain unchanged.
2. A/L behavior must remain unchanged.
3. Protected files must remain byte-identical:
   - `Kalkulator_build9.7-pc6.html`
   - `index.html`
   - `Kalkulator.html`
4. The validated production source must remain SHA-256:
   - `d3080ff5fcf0dd539130c6849edb66aa3db9faed11e6b045561d048c76c99210`
5. No merge, release or deployment is part of this review.
6. Candidate mode must be opt-in only through `NODITECH_LL_CANDIDATE=1`.
7. Normal compilation without that variable must preserve the original code path and equivalence claim.

## Files requiring focused review

- `src/engine/liquidLiquid.js`
- `src/engine/liquidProperties.js`
- `src/engine/liquidLiquidWithProperties.js`
- `src/engine/liquidLiquidContract.js`
- `src/engine/liquidLiquidCalculatorAdapter.js`
- `src/engine/liquidLiquidShadow.js`
- `src/engine/liquidLiquidUiTransform.js`
- `tests/compile_app.js`
- all added L/L tests and fixtures

## Questions Claude must answer

1. Does the energy law consistently use `Qhot = Qcold + Pel` and the signed residual `Qhot - Qcold - Pel`?
2. Can any reversed or zero temperature direction produce a valid or positive result?
3. Can zero, negative, missing, `NaN` or infinite power, flow, density or specific heat escape fail-closed behavior?
4. Is Cooling mapped to cold-side useful capacity/COP and Heating mapped to hot-side useful capacity/COP?
5. Are EG/PG properties temperature- and concentration-aware through the existing validated provider, without silently falling back to the legacy linear model?
6. Are freeze-limit failures propagated without fabricated values?
7. Do UI, record, JSON, CSV and print projections use the same authoritative numbers?
8. Can blocked, warning or failed results be presented as positive or saved by the new contract?
9. Does `liquidLiquidUiTransform.js` structurally limit edits to `LiqLiq`, leaving A/A and A/L unchanged?
10. Does candidate compilation alter normal production compilation when `NODITECH_LL_CANDIDATE` is absent?
11. Are the source-equivalence labels in `tests/compile_app.js` accurate in both production and candidate modes?
12. Identify any hidden coupling, race, stale-data or browser-render risk before the candidate is applied to the real calculator source.

## Required response format

Start with one verdict: `APPROVE`, `APPROVE WITH CONDITIONS`, or `BLOCK`.

Then list findings ordered by severity:

- Severity: blocker / high / medium / low
- File and line
- Problem
- Why it matters
- Minimal correction
- Test that proves the correction

Finish with an explicit statement on each hard invariant and whether it was independently verified.

## Current automated evidence

At commit `45d6dfaec7416cd4b1dd5676bef609ae8e7afa62`:

- `verify-develop`: success
- `verify-pc6`: success
- No merge or deployment has occurred.

This automated evidence is supporting material only. It does not replace independent code review.

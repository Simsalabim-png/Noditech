# Liquid/Liquid live cutover milestone

Target: **L/L candidate ready for full browser and save/export review**.

## Stack

- Base reviewed engine branch: `feature/liquid-liquid-mode-aware-correctness`
- Base reviewed SHA: `9247e454ab5f9c7ef8da405e6f6afdeafafafe92`
- Cutover branch: `feature/liquid-liquid-live-cutover`
- Initial cutover branch parent is exactly the reviewed SHA.

## No-touch boundary

Air/Air and Air/Liquid component source sections must remain byte-identical to the reviewed base. The protected production files must remain at SHA-256:

`b9f8be84731b9038a814ecc32b876d8856d8526ccf28cd35cc1bb1d74167dc50`

Any A/A or A/L source, numeric, status, UI, Save, JSON, CSV or print regression is STOP/BLOCK.

## Cutover data flow

1. Existing `LiqLiq` state is adapted by `evaluateLegacyLiquidLiquidState`.
2. EG/PG properties are provided only by the embedded validated `glyEval` CoolProp provider through a fail-closed adapter.
3. The reviewed engine creates one authoritative contract.
4. UI, Save record, dedicated L/L JSON, dedicated L/L CSV and print projection consume that contract.
5. Blocked contracts expose no calculated result, record or export and disable Save/export actions.

## Required gates

- all Node validation/build/engine tests
- pinned-compiler cutover compile
- existing full Chromium suite against the cutover compile
- dedicated L/L Chromium suite on desktop and mobile
- no console errors, page errors or external requests
- A/A and A/L source freeze proof
- protected-file SHA proof
- complete review manifest and diffs

No merge, release or deploy is part of this milestone.

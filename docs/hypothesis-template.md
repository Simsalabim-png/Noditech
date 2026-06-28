<!--
  PUBLIC-SAFE BLANK TEMPLATE (may live in the repo under docs/).

  A filled instance is confidential by default, including qualitative findings.
  Store it only in the local git-ignored private report location unless a separate
  sanitisation review explicitly approves a public extract.

  A public PR may include only a SHORT, SANITISED hypothesis summary that reveals
  none of: measured values, deviation figures, lab identity, machine/model identity,
  private operating limits, sensitive model mechanism, source information, or any
  technical finding that is itself confidential. Detailed hypothesis and numeric
  acceptance criteria stay local.
  Public references use IDs only:  DIAG-XXXX, HYP-XXXX.
-->

# Hypothesis — single controlled model change (Noditech 9.8)

> Step 2 of the work method: **one testable hypothesis per change.**
> One hypothesis ↔ one feature branch ↔ one narrow PR.

## 0. Metadata (private)
- Hypothesis ID: `HYP-____`
- Linked diagnosis: `DIAG-____`
- Branch: `feature/____`
- Storage: local private only → `$NODITECH_PRIVATE_REPORT_DIR/hypotheses/`
  (numeric criteria never committed)

## 1. The five required singulars (all mandatory)
A valid hypothesis names exactly:

1. **One physical mechanism:** `____`
2. **One specific model term** being changed: `____`
3. **One expected direction** (increase / decrease): `____`
4. **One primary operating region:** `____`
5. **One target metric** (cooling_capacity_w / electrical_power_w / eer): `____`

## 2. Statement (physical, falsifiable)
> Must be disprovable. Reject any wording that merely says "the result will be
> better" — that is not a hypothesis.

"Because `<mechanism>`, changing `<specific model term>` will `<direction>`
predicted `<metric>` in `<region>`, bringing it within tolerance, WITHOUT
degrading other metrics or other regions."

How this could be **disproved**: `____`

## 3. Acceptance criteria (measurable; numbers stay local)
Judge per metric AND grouped per region using the harness error measures:

- [ ] signed % deviation: `<local>`
- [ ] absolute % deviation: `<local>`
- [ ] mean deviation: `<local>`
- [ ] median deviation: `<local>`
- [ ] max error (magnitude): `<local>`
- [ ] grouped deviations per operating region: `<local>`

Public reporting uses the status contract only (section 7) — never the numbers.

## 4. No-shift verification (mandatory)
> An improvement must not move error from one region to another.

- Regions to re-check for regressions: `____`
- Criterion: no region's grouped error worsens beyond `<local threshold>`
- [ ] Confirmed: change does not shift error into another region

## 5. Physical plausibility
- Behaviour stays physically reasonable across the FULL envelope, not only the
  tested points: `____`
- [ ] No non-physical artefacts (negative power, EER discontinuities, etc.)

## 6. Calibration discipline
- [ ] NOT a general calibration to a small number of test points
- Mechanism-based rationale (not curve-fitting): `____`

## 7. Public status contract (only allowed public result lines)
```
<anonymous-case-id>    PASS
<anonymous-case-id>    FAIL
<anonymous-case-id>    SKIP
summary cases=<integer> pass=<integer> fail=<integer> skip=<integer>
region=<public-region-id> pass=<integer> fail=<integer> skip=<integer>
SKIPPED
NO_EVALUATOR
```
No values, deviation percentages, tolerances, file paths, or private error
messages may accompany these lines.

## 8. Decision rule — do NOT use a combined score
If the tooling produces a combined measure across capacity, power and EER, it is
**secondary diagnostics only**. GO/NO-GO is decided SEPARATELY for:

- [ ] capacity per operating region
- [ ] power per operating region
- [ ] EER/COP per operating region
- [ ] regression in other operating regions
- [ ] physical plausibility

A good overall average must never hide a weak single parameter.

## 9. Validation-area guard (stop condition)
- [ ] Claim stays WITHIN the documented validation area
- If any tested point falls outside it → STOP and request clarification (no
  extrapolated claims).

## 10. Rollback
- Rollback method (revert branch / merge): `____`
- [ ] Fully reversible; no effect on pc6 or `verify-pc6`

## 11. Review requirements for the resulting model-change PR
The model-change PR cannot be approved without:

- [ ] private Diagnosis reference: `Diagnosis reference: DIAG-XXXX`
- [ ] private Hypothesis reference: `Hypothesis reference: HYP-XXXX`
- [ ] public problem statement
- [ ] public, sanitised hypothesis summary
- [ ] confirmed no-shift plan
- [ ] regression test plan
- [ ] confidentiality attestation
- [ ] rollback plan

No private file path or document content goes in the PR — IDs only.

## Confidentiality check
- [ ] Whole instance treated as confidential by default
- [ ] No lab/device/report identifiers; no measured or derived figures
- [ ] Numeric targets/thresholds kept local only
- [ ] Only `confidential external validation evidence` used in public text

<!--
  PUBLIC-SAFE BLANK TEMPLATE (may live in the repo under docs/).

  A filled instance is confidential by default, including qualitative findings.
  Store it only in the local git-ignored private report location unless a separate
  sanitisation review explicitly approves a public extract.

  Filled diagnoses are stored under, e.g.:  $NODITECH_PRIVATE_REPORT_DIR/diagnoses/
  In any repo-visible text use only the neutral string:
      confidential external validation evidence
-->

# Diagnosis — Noditech 9.8 (pre-change)

> Step 1 of the work method: **diagnose before any model/formula change.**
> A qualitative cause analysis, operating-region description, or technical
> conclusion can be confidential even without concrete numbers. Treat the whole
> filled instance as confidential by default.

## 0. Metadata
- Diagnosis ID: `DIAG-____`  (use only this ID in any public text)
- Date: `____-__-__`
- Candidate baseline under study: `Kalkulator_build9.8-pcN.html` (or current engine)
- Evidence source (repo-visible wording): **confidential external validation evidence**
- Storage: local private only → `$NODITECH_PRIVATE_REPORT_DIR/diagnoses/`

## 1. Operating region under diagnosis
Diagnose ONE primary region at a time (do not mix). Tick one:

- [ ] full load
- [ ] part load
- [ ] low load
- [ ] high temperature
- [ ] derating
- [ ] regulator transition
- [ ] compressor transition / state change
- [ ] other: `____`

Validity / boundary of the region (ranges, limits): `____`

## 2. Separated diagnostics (mandatory order)
Diagnose each output **independently**. EER/COP must NOT be assessed in isolation
**before** cooling capacity and electrical power have been analysed, since
EER = capacity / power and a single EER error can originate in either term.

### 2.1 Cooling capacity  (analyse FIRST)
- Observed behaviour (qualitative — still confidential): `____`
- Direction of deviation (over / under / mixed): `____`
- Suspected mechanism (physical): `____`
- Supporting evidence: `____`

### 2.2 Electrical power  (analyse SECOND)
- Observed behaviour: `____`
- Direction of deviation: `____`
- Suspected mechanism: `____`
- Supporting evidence: `____`

### 2.3 EER / COP  (only AFTER 2.1 and 2.2)
- Observed behaviour: `____`
- Is the EER error explained by capacity, by power, or both? `____`
- Suspected mechanism: `____`

## 3. Units, assumptions, calculation limits
- Units for each quantity (W, kW, °C, K, %, …): `____`
- Key assumptions (steady state, refrigerant, fluid-property source/version, …): `____`
- Documented validity range / where the model is NOT claimed to apply: `____`
- Boundary effects (derating thresholds, regulator/compressor states): `____`

## 4. Cross-region context (frames the no-shift requirement)
- Does this deviation also appear in other regions? `____`
- Could a fix here plausibly affect another region? Which, and how? `____`

## 5. Regression / coverage status
- Existing public regression coverage touching this area: `____`
- Gaps to cover before changing the model: `____`

## 6. Diagnostic conclusion (confidential by default)
- Primary suspected source of error: `____`
- Confidence: low / medium / high
- Ready to formulate a single testable hypothesis? yes / no

## 7. Public status contract (if any verdicts are quoted)
Only these line shapes may ever appear in public text — no values, percentages,
tolerances, paths, or private error messages may follow them:

```
<anonymous-case-id>    PASS
<anonymous-case-id>    FAIL
<anonymous-case-id>    SKIP
summary cases=<integer> pass=<integer> fail=<integer> skip=<integer>
region=<public-region-id> pass=<integer> fail=<integer> skip=<integer>
SKIPPED
NO_EVALUATOR
```

## Confidentiality check (before saving/sharing)
- [ ] Whole instance treated as confidential by default (incl. qualitative findings)
- [ ] No lab name, device/model/serial id, or report filename present
- [ ] No measured values or derived confidential figures in any repo-visible field
- [ ] No identifiable operating-region + result combinations exposed publicly
- [ ] Stored only under `$NODITECH_PRIVATE_REPORT_DIR/diagnoses/`
- [ ] Only the neutral string `confidential external validation evidence` used publicly
- [ ] Public references use the ID `DIAG-____` only

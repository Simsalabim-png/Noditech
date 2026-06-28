<!--
  PUBLIC-SAFE BLANK TEMPLATE for the anonymized technical conclusion (work-method
  step 6).

  A filled instance may be repository-visible only after the confidentiality
  attestation is completed and a second-person or independent AI-role review confirms
  that no confidential or indirectly identifying information remains.

  The detailed analysis lives in a SEPARATE local private appendix (git-ignored) —
  see section 10.
-->

# Anonymized technical conclusion — Noditech 9.8 evaluation

> Mandatory standing statement (keep verbatim):
>
> This is an engineering evaluation informed by confidential external validation
> evidence. It is not laboratory certification, regulatory approval, or a general
> accuracy guarantee outside the documented validation area.

## 1. Scope
- Candidate evaluated: `Kalkulator_build9.8-pcN.html`
- Baseline compared against: `____`
- Evidence: **confidential external validation evidence**
- Operating regions covered (qualitative, public-safe): `____`

## 2. Method (public)
- Per-metric diagnostics (cooling capacity, electrical power, EER/COP) separated;
  EER/COP not assessed before capacity and power.
- Errors aggregated per metric and grouped per operating region.
- One controlled change evaluated against a single testable hypothesis.
- No general calibration to a small set of points; no-shift check applied.
- Any combined cross-metric score is **secondary diagnostics only** — never the
  decision basis.

## 3. Result — public status contract ONLY
Allowed public result lines (no values, percentages, tolerances, paths, or private
error messages):

```
<anonymous-case-id>    PASS
<anonymous-case-id>    FAIL
<anonymous-case-id>    SKIP
summary cases=<integer> pass=<integer> fail=<integer> skip=<integer>
region=<public-region-id> pass=<integer> fail=<integer> skip=<integer>
SKIPPED
NO_EVALUATOR
```

Do NOT present identifiable region+result combinations that could reveal private
findings; keep regions at public-region-id granularity.

## 4. Separated GO/NO-GO (a good average must not hide a weak parameter)
Decide each independently:

- [ ] capacity per operating region: GO / NO-GO
- [ ] power per operating region: GO / NO-GO
- [ ] EER/COP per operating region: GO / NO-GO
- [ ] regression in other operating regions: GO / NO-GO
- [ ] physical plausibility: GO / NO-GO

## 5. Required status fields (public)
- Public regression status: `____`
- Deterministic build status (two builds identical SHA-256): yes / no
- Relevant browser (Chromium) test status: `____`
- No-shift result: pass / fail
- Physical plausibility result: pass / fail
- Human GO/NO-GO decision (named human): `____`

## 6. Decision recommendation
- Recommendation: proceed to candidate / iterate / reject
- Overall limitations (public, no figures): `____`
- Stays within documented validation area? yes / no

## 7. Stop conditions encountered (if any)
- [ ] pc6 file change required → stopped
- [ ] confidential info would need to enter GitHub → stopped
- [ ] physical hypothesis unclear → stopped
- [ ] expected reference values missing → stopped
- [ ] test coverage would have to be reduced → stopped
- [ ] a safety gate would have to be bypassed → stopped
- [ ] a change could not be rolled back → stopped
- [ ] a claim went outside the documented validation area → stopped

## 8. Release posture
- This document **never self-approves a release.** GO/NO-GO is an explicit human
  decision recorded in section 5.

## 9. Confidentiality attestation + review gate
- [ ] No lab name, device/model/serial id, or report filename anywhere
- [ ] No measured values, deviation percentages, or tolerance limits
- [ ] No private operating limits or concrete cause analysis based on private evidence
- [ ] No identifiable operating-region + result combinations
- [ ] Only the neutral string `confidential external validation evidence` used
- [ ] Second-person OR independent AI-role review confirms nothing confidential or
      indirectly identifying remains
- Reviewer (not the author): `____`

## 10. Private appendix pointer (NOT committed)
> Detailed deviation analysis, numeric targets, reference values, and concrete
> cause analysis live ONLY in the local git-ignored private report directory
> (`$NODITECH_PRIVATE_REPORT_DIR`). Nothing from it goes above this line.

- Local private appendix location (do not commit it): `____`

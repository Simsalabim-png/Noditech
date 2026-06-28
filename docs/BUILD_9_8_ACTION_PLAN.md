# Build 9.8 action plan

## Objective
Develop the next Noditech candidate safely while preserving build 9.7-pc6 as an immutable production reference.

## Non-negotiable rules
- Do not modify `Kalkulator_build9.7-pc6.html`, `index.html`, or `Kalkulator.html` on `main`.
- Keep `verify-pc6` green.
- Do not place confidential validation material, source reports, measurements, filenames, screenshots, identifiers, summaries, or derived values in GitHub.
- Refer to private evidence only as `confidential external validation evidence`.
- New candidate artefacts must use new filenames, beginning with `Kalkulator_build9.8-pc1.html`.
- No production promotion without an explicit GO decision.

## Branch model
- `main`: frozen production/reference line.
- `develop`: integration branch for the next release.
- `feature/<topic>`: isolated implementation work.
- `release/9.8-pc1`: release-candidate preparation after all required gates pass.

All feature work must reach `develop` through reviewed pull requests. No direct feature commits to `main`.

## Phase 1 — validation foundation
### Deliverables
1. Separate the production identity gate from development regression tests.
2. Define a private validation-data interface that accepts anonymised test cases without embedding confidential source material.
3. Restore automated engine and result-contract regression tests for candidate builds.
4. Add signed-error, absolute-error, median-error and regime-grouping calculations.
5. Add deterministic Chromium desktop and mobile smoke tests.

### Acceptance criteria
- pc6 files remain unchanged.
- Public tests contain no confidential measurements or identifiers.
- Private validation cases can be supplied at runtime from outside the repository.
- Missing private data causes tests to skip clearly, not fabricate results.
- Candidate output is deterministic and reproducible.

## Phase 2 — model diagnosis
### Workstreams
- Decompose efficiency deviation into capacity contribution and electrical-power contribution.
- Check operating-regime transitions, part-load behaviour and high-temperature derating.
- Standardise the electrical measurement boundary used by the model and reports.
- Record assumptions and units at every calculation boundary.
- Identify whether deviations are systematic, regime-specific or input-matching errors.

### Rules
- Diagnose before calibrating.
- Do not tune the model to a small number of external points.
- Preserve general physical behaviour and existing regression coverage.
- Every model change requires a stated hypothesis and before/after evidence.

## Phase 3 — architecture preparation
Treat the single HTML file as a release artefact rather than the primary editing surface.

Target source areas:

```text
src/
  engine/
  domain/
  validation/
  persistence/
  export/
  ui/
tests/
dist/
```

The release may remain a self-contained offline HTML file, but it must be built deterministically from reviewable source modules.

## Phase 4 — candidate release
A `9.8-pc1` candidate requires:
- unique artefact name and SHA-256 manifest;
- engine regression suite passing;
- result, export and persistence contracts passing;
- Chromium desktop and mobile tests passing;
- no confidential material in repository, logs or artefacts;
- documented model-change hypothesis;
- expert review across HVAC, thermodynamics, QA, security and release governance;
- explicit GO/NO-GO decision.

## Immediate execution order
1. Build the public-safe validation harness interface.
2. Restore and document candidate regression tests.
3. Add private-data injection and redaction controls.
4. Run confidential comparisons outside GitHub.
5. Produce an anonymised findings summary for development decisions.
6. Select one model improvement for `9.8-pc1`.

## Definition of done
The project is ready for model changes only when confidential external evidence can be evaluated reproducibly without copying any confidential source information into the repository.

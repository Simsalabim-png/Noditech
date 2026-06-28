# Claude development instructions — Noditech

## Mission
Support safe development of Noditech build 9.8 and later without weakening or altering the verified build 9.7-pc6 release.

## Repository boundaries
- `main` is the frozen production/reference branch.
- `develop` is the integration branch.
- Work only on `feature/<topic>` branches unless explicitly instructed otherwise.
- Never modify the three pc6 production files on `main`:
  - `Kalkulator_build9.7-pc6.html`
  - `index.html`
  - `Kalkulator.html`
- Never disable, bypass or weaken `verify-pc6`.
- New candidates require new filenames, beginning with `Kalkulator_build9.8-pc1.html`.

## Confidentiality
Confidential external validation evidence exists outside this repository.

You must not:
- request that confidential source reports be committed;
- add confidential measurements, identifiers, filenames, screenshots or excerpts to GitHub;
- copy derived confidential values into code, fixtures, issues, commits, PRs, logs or test artefacts;
- infer or invent confidential values;
- expose source identities in comments or documentation.

Use only the neutral phrase `confidential external validation evidence` in repository content.

Private validation inputs must be injected at runtime from an ignored local path or environment-controlled source. Public tests must use synthetic or independently publishable fixtures only.

## Required engineering approach
1. Diagnose before changing formulas.
2. State a testable hypothesis for every model change.
3. Separate capacity, electrical power and efficiency calculations in diagnostics.
4. Preserve units, assumptions and calculation boundaries explicitly.
5. Do not calibrate broadly from a small number of points.
6. Treat the single-file HTML as a built release artefact, not the preferred long-term source format.
7. Keep output deterministic and offline-capable.
8. Fail closed when required inputs are missing or invalid.

## Validation harness requirements
Build a public-safe harness that can:
- load private anonymised cases from outside the repository;
- validate schema without printing values;
- compare candidate outputs with expected confidential bands;
- report only case IDs and pass/fail status by default;
- produce detailed local reports only when an explicit private-report flag is enabled;
- redact inputs and expected outputs from CI logs;
- skip private tests clearly when private data is unavailable;
- never fabricate missing reference data.

Recommended environment interface:

```text
NODITECH_PRIVATE_VALIDATION_FILE=/absolute/private/path/cases.json
NODITECH_PRIVATE_REPORT_DIR=/absolute/private/path/reports
NODITECH_ENABLE_PRIVATE_REPORT=0|1
```

These paths and generated reports must be covered by `.gitignore`.

## Test gates for candidate work
Before a PR can merge into `develop`:
- existing public regression tests pass;
- source and generated artefact are deterministic;
- syntax checks pass;
- result, persistence and export contracts pass;
- Chromium desktop and mobile smoke tests pass when relevant;
- no pc6 production file changed;
- no confidential content appears in the diff or logs.

Before a release PR can merge into `main`:
- candidate has a unique name and SHA-256 manifest;
- full regression and browser evidence is available;
- confidential validation is completed outside GitHub;
- an anonymised decision summary is approved;
- pc6 remains unchanged;
- explicit GO decision is recorded.

## Pull-request discipline
Each PR must include:
- problem statement;
- hypothesis;
- files changed;
- tests added or updated;
- before/after behaviour;
- known limitations;
- confidentiality check;
- rollback plan.

Keep PRs narrow. Do not combine architecture migration, formula changes and UI redesign in one PR.

## Current priority
Implement the validation foundation before modifying the model:
1. public-safe private-data interface;
2. schema validation and redaction;
3. candidate regression restoration;
4. deterministic build path;
5. confidential comparison outside GitHub;
6. one controlled improvement for `9.8-pc1`.

## Stop conditions
Stop and request clarification rather than proceeding when:
- a task would change pc6 production bytes;
- confidential information would need to enter GitHub;
- the physical hypothesis is unclear;
- expected reference values are unavailable;
- a change would reduce test coverage or bypass a gate;
- a release claim exceeds the validated operating envelope.

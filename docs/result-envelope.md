# ResultEnvelope contract

`ResultEnvelope` is the browser-independent public contract for describing
whether a calculated result is usable.

This first implementation slice defines only the contract, synthetic fixtures,
and regression tests. It does not integrate the contract with formulas, UI,
persistence, export, or release files.

## Schema version

The initial schema version is `1.0`.

Every envelope contains exactly:

- `schema_version`
- `status`
- `result`
- `issues`

## Statuses

### `valid`

The calculation completed without a known limitation.

- `result` contains a finite numeric `value` and a non-empty `unit`.
- `issues` is empty.

### `warning`

The calculation completed, but the result has a non-blocking limitation.

- `result` contains a finite numeric `value` and a non-empty `unit`.
- `issues` contains at least one issue with severity `warning`.
- Blocking issues are not permitted.

### `blocked`

The calculation must not produce a usable result.

- `result` is `null`.
- `issues` contains at least one issue with severity `blocking`.

## Issue fields

Every issue contains exactly:

- `severity`: `warning` or `blocking`
- `code`: stable machine-readable identifier
- `field`: exact affected input or domain field
- `message`: human-readable explanation
- `corrective_action`: explicit action needed to address the issue

## Deterministic rules

The validator:

- has no browser or external dependencies;
- does not mutate its input;
- rejects unknown statuses and undocumented fields;
- returns structural error messages without embedding input values;
- applies the same status rules on every run.

## Current scope

This contract is not yet connected to production calculation paths.

Later slices may connect the envelope to export, persistence, UI presentation,
and accessibility behavior. Those changes require separate review.

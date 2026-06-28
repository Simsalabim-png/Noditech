# Private validation harness — run interface (Build 9.8)

Public-safe harness for comparing the Noditech engine against **confidential
external validation evidence**. The harness lives in the repo; the evidence does
not. Nothing confidential is ever committed, logged to CI, or printed by default.

## What this PR delivers

A narrow, public-safe scaffold only:

- external loading of private test data (env-driven),
- zero-dependency schema validation of the private test set,
- redacted PASS / FAIL / SKIP output (anonymous case-id + verdict only),
- safe handling of missing data (clearly skipped, never failed, never fabricated),
- `.gitignore` rules for private paths and generated reports,
- synthetic **public** fixtures + Node tests,
- this documentation.

It does **not** touch the calculation engine, the UI, or any pc6 production file.
Wiring the real engine evaluator and the extended error metrics are later PRs.

## Run interface

| Variable | Meaning | Default |
| --- | --- | --- |
| `NODITECH_PRIVATE_VALIDATION_FILE` | Absolute path to the private `cases.json` | unset → skipped |
| `NODITECH_PRIVATE_REPORT_DIR` | Absolute path for **local** detailed reports | unset |
| `NODITECH_ENABLE_PRIVATE_REPORT` | `1` enables local detailed reporting | `0` |
| `NODITECH_EVALUATOR_MODULE` | Optional path to engine evaluator (later PR) | unset |

Run:

```bash
node src/validation/cli.js
```

Run the public test suite (no private data, no engine, fully deterministic):

```bash
node --test tests/validation/
```

## Behavior / contract

- **No private data configured or present** → prints `SKIPPED ...`, exits `0`.
  Missing reference data is never replaced with invented values.
- **Private file is not valid JSON** → structural error, exits `1`.
- **Private set fails schema check** → structural path+message errors (no values), exits `1`.
- **No engine evaluator wired** → prints `NO_EVALUATOR ...`, exits `0`. The
  test-double stub is used only by the public test suite — never against real
  private cases.
- **Otherwise** → one `"<case-id>\tPASS|FAIL|SKIP"` line per case + a `summary`
  counts line. Exit `0` if no `FAIL`.

A case is `SKIP` when it carries no reference metric. A metric fails closed
(`FAIL`) if it has a reference but no finite prediction.

Reference values must be finite and **non-zero**: a zero reference is rejected by
the schema, and the harness never includes a zero/non-finite reference in a percent
deviation (no implicit division by zero).

## Confidentiality rules (enforced by design)

- Standard output contains only anonymous case-ids, verdicts, and summary counts.
  A runtime guard (`redact.assertPublicSafe`) refuses to print anything else.
- Detailed, value-bearing reports are written **only** when explicitly enabled,
  **only** to the local git-ignored `NODITECH_PRIVATE_REPORT_DIR`. Their path and
  contents are never echoed to stdout.
- In the repo, evidence is referred to only as
  `confidential external validation evidence` — never a lab name, device id,
  measurement, report filename, or derived confidential figure.
- `.gitignore` blocks `private/`, `*.private.json`, `validation-reports/`, and
  `.env` files that might carry private absolute paths.

## Private test-set schema (`schema_version` `1.0`)

```jsonc
{
  "schema_version": "1.0",
  "cases": [
    {
      "id": "anonymous-string",                 // required, unique
      "operating_region": "full_load",          // required enum (see schema.js)
      "inputs": { /* opaque engine inputs */ }, // required object
      "reference": {                            // optional; omit => case SKIP
        "cooling_capacity_w": 0,
        "electrical_power_w": 0,
        "eer": 0
      },
      "tolerance": {                            // optional; defaults to 5% per metric
        "cooling_capacity_w_pct": 5,
        "electrical_power_w_pct": 5,
        "eer_pct": 5
      }
    }
  ]
}
```

Diagnostics are kept separate per metric — **cooling capacity**, **electrical
power**, and **EER/COP** — so a regression in one is never masked by another.
Operating regions are evaluated separately (full load, part load, high
temperature, derating, regulator/compressor transition, …) to ensure an
improvement in one region is not just shifting error into another.

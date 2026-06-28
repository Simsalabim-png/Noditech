# Confidentiality pre-commit checklist (Noditech 9.8)

Run through this before every commit / PR / issue / CI run that touches the
validation work. If any box cannot be checked, STOP and fix before pushing.

## Confidential by default
A filled diagnosis, hypothesis, or conclusion is confidential by default —
including purely qualitative findings (cause analysis, region description, technical
conclusion). It becomes public only via an explicit sanitisation review (and, for
the conclusion, a second-person or independent AI-role review).

## Never in GitHub (repo, diff, commit msg, issue, PR, CI log, artifact)
- [ ] laboratory reports
- [ ] measured values
- [ ] test results (numeric) / deviation percentages / tolerance limits
- [ ] model / machine identifiers
- [ ] laboratory names
- [ ] screenshots
- [ ] report filenames
- [ ] excerpts from source documents
- [ ] derived confidential figures
- [ ] detailed deviation analyses
- [ ] private operating limits
- [ ] concrete cause analysis based on private evidence
- [ ] identifiable operating-region + result combinations
- [ ] private test files or reports

## Allowed public wording & references
- [ ] Only the neutral string is used: `confidential external validation evidence`
- [ ] Public references use IDs only: `DIAG-XXXX`, `HYP-XXXX`
- [ ] Issues/commits/PRs do not reveal which lab, which units, or which results

## Public status contract (the only allowed result lines)
```
<anonymous-case-id>    PASS
<anonymous-case-id>    FAIL
<anonymous-case-id>    SKIP
summary cases=<integer> pass=<integer> fail=<integer> skip=<integer>
region=<public-region-id> pass=<integer> fail=<integer> skip=<integer>
SKIPPED
NO_EVALUATOR
```
No values, percentages, tolerances, paths, or private error messages may follow.

## Mechanics
- [ ] Private data loaded only from an external, git-ignored path
      (`NODITECH_PRIVATE_VALIDATION_FILE`)
- [ ] Filled diagnoses stored under `$NODITECH_PRIVATE_REPORT_DIR/diagnoses/`
- [ ] `.gitignore` covers private paths and generated reports (`private/`,
      `*.private.json`, `validation-reports/`, `.env`)
- [ ] Standard output shows anonymous case-id + PASS/FAIL only
- [ ] Detailed reports produced locally only, when explicitly enabled
- [ ] Missing reference data => clearly SKIPPED, never fabricated

## Local denylist scan (replaces the old broad keyword grep)
Do NOT auto-flag generic words like `lab`, `laboratory`, `model`, `machine`,
`report` — they occur legitimately in public process docs and cause false alarms.
Instead, scan the staged diff against a LOCAL, non-versioned denylist of the
actual private markers.

```text
NODITECH_PRIVATE_MARKERS_FILE=/absolute/private/path/markers.txt
```

The markers file may contain: laboratory names, report filenames, serial numbers,
model identifiers, internal test IDs, and other unique private strings.
It must NEVER be committed or written to a CI log.

The scan must run **quietly**: it must never print the matching diff line, the
marker itself, the marker-file contents, or the private file path. Use `grep -Fqi`
(quiet) — never `grep -n`.

```bash
markers="${NODITECH_PRIVATE_MARKERS_FILE:-}"

if [ -z "$markers" ] || [ ! -f "$markers" ]; then
  echo "PRIVATE MARKER SCAN NOT CONFIGURED"
  exit 1
fi

failed=0

while IFS= read -r marker || [ -n "$marker" ]; do
  [ -z "$marker" ] && continue

  if git diff --cached --text | grep -Fqi -- "$marker"; then
    echo "CONFIDENTIAL MARKER FOUND IN STAGED DIFF"
    failed=1
  fi
done < "$markers"

exit "$failed"
```

The scan stops the commit on any match (exit 1) but reveals nothing about what
matched. It is an aid, not a guarantee. The staged diff must still be reviewed
manually before every push.

## Final pre-commit gate
- [ ] Local marker scan ran in quiet mode and printed no matching content
- [ ] No private marker or matching diff line was written to stdout or CI
- [ ] No operating-system metadata files are staged
- [ ] Staged filenames were manually reviewed
- [ ] Staged textual diff was manually reviewed
- [ ] Public status contract matches the current harness output exactly

# Release recovery runbook

## Current verified production

- PR: `#33`
- Reviewed head: `ccf6bc35c00636dc5f107cacb9c5e5353debe329`
- Main merge: `1c48563082cbca5495629d72d809f25c4dd6487c`
- Artifact: `Kalkulator_build9.8-pc2.html`
- Artifact SHA-256: `1ef3926dfc1257a9812fc591a237da5b79ef538900f96dd39287a249874f6c31`
- Live verification run: `28429692341`

Replace this reference only after a later release has passed exact-SHA and live verification.

## Recovery procedure

1. Record the affected production commit, published SHA, observed fault, and detection time.
2. Select the latest known-good production commit and its verified artifact SHA.
3. Create a new recovery branch from current `main`.
4. Use a normal revert commit or a narrow restoration commit. Do not rewrite `main` history.
5. Rebuild the intended artifact and set `EXPECTED_PC2_SHA256` to its exact value.
6. Open a PR to `main` that states the affected commit, target state, expected SHA, reason, and evidence.
7. Require deterministic build, exact SHA, pc6 freeze, Node tests, browser gates, governance checks, and no A/A or A/L drift.
8. Obtain explicit production GO for the exact PR head.
9. Merge through the normal GitHub Pages workflow.
10. Verify the live HTML SHA, `SHA256.txt`, required mode markers, browser dependencies, desktop/mobile rendering, and core calculations.
11. Record the final live SHA after recovery succeeds.

## Stop conditions

Stop when the target state is ambiguous, the artifact is not reproducible, protected anchors drift, A/A or A/L changes unexpectedly, required checks are red, or history rewriting would be required.

## Hardening verification baseline

The action-pinning maintenance change was independently executed against the release-head source before merge consideration:

- Node validation/build/engine tests: `195/195 PASS`
- action-reference regression test: `PASS`
- rebuilt artifact SHA-256: `1ef3926dfc1257a9812fc591a237da5b79ef538900f96dd39287a249874f6c31`
- rebuilt artifact matches the current verified production artifact byte-for-byte

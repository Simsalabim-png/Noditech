# Safe release manager review checklist

Review the exact draft head and confirm all items before any activation decision.

## Required green checks

- `prepare-safe-release / validate`
- `verify-pc6`
- Existing repository governance checks applicable to the changed paths

## Code review

- The release branch is created from exact `main`.
- Only exact validated `develop` is merged into the release branch.
- An existing open `release/safe-*` PR prevents duplicate creation, including candidates found beyond the first API page.
- Exact-head `verify-pc6` success is mandatory.
- Pending or failed exact-head workflows block creation.
- Known v1 limitation: the develop gate does not yet require an explicit allowlist of every general repository workflow; release-head validation and independent review remain mandatory.
- `main` and `develop` are re-read immediately before writes.
- Created PRs are always draft.
- Only `verify-safe-release.yml` and `verify-pc6.yml` are dispatched.
- Missing or failed latest validation runs may be re-dispatched; pending or successful runs are not duplicated.
- Pull-request and workflow-run API reads paginate and fail closed if the page limit is exceeded.
- No endpoint for Ready, merge-to-main, tags, releases, auto-merge or deployment exists.
- No force update exists.

## Operational simulation

Use manual `workflow_dispatch` with `dry_run: true` first after merge.

A non-dry manual run must:

1. no-op when an active release PR exists;
2. no-op when develop is not ahead;
3. no-op when exact-head CI is missing, pending or red;
4. create one branch and one draft PR only when all gates are green;
5. dispatch validation but never deployment.

## Production authority

This governance change does not authorize:

- merging the governance PR;
- marking a release PR ready;
- merging any release PR;
- deployment;
- tags or releases.

All production authority remains with Simen through a new explicit GO.

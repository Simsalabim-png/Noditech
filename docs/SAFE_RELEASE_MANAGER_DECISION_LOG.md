# Safe release manager decision log

## Decision

Use GitHub Actions and the GitHub API as the authoritative safe-release operator. Chat-based automation is not authoritative and must not perform repository mutations.

## Rationale

- GitHub provides immutable workflow history, exact commit identities, branch protection, auditable permissions and evidence artifacts.
- The repository already contains deterministic safe-release, browser, freeze and deployment gates.
- Chat automation cannot reliably retain authentication or execute repository mutations across sessions.
- Production authority must remain explicitly human-controlled.

## Scope of this change

This change adds preparation automation only:

- inspect exact `main` and `develop`;
- require exact-head green validation;
- create one release branch from `main`;
- merge `develop` into that release branch;
- open one draft PR;
- dispatch read-only validation.

## Explicitly excluded

- Ready-for-review transition
- merge to `main`
- auto-merge
- tag
- GitHub Release
- deployment
- modification of production artifact SHA locks

## Follow-up

A later, separately reviewed change may add a read-only readiness assessor that posts a single status comment when the exact release head is fully green. It must remain unable to mark Ready, merge or deploy.

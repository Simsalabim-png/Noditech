# Safe release manager threat model

## Protected assets

- `main`
- production GitHub Pages deployment
- release tags and GitHub Releases
- protected production source and artifact SHA anchors
- A/A and A/L behavior

## Primary risks and controls

### Duplicate release candidates

Control: any open `release/safe-*` PR targeting `main` blocks creation of another candidate.

### Stale validation

Control: validation is bound to the exact current `develop` SHA. Older successful runs do not qualify.

### Branch movement during decision

Control: `main` and `develop` are re-read immediately before the first write. Any movement fails closed.

### Invalid or incomplete CI

Control: missing pc6, pending workflows and blocking workflow conclusions produce a no-op.

### Merge conflict

Control: only the newly created release branch is used as the merge base. A conflict fails the run and removes the new branch.

### Workflow recursion suppression

Control: validation workflows are explicitly dispatched because GitHub suppresses ordinary workflow chaining from `GITHUB_TOKEN` writes.

### Unauthorized production action

Control: the manager never calls Ready, merge-PR, tag, release, Pages deployment or auto-merge APIs. Deployment workflow dispatch is absent and prohibited by tests and review checklist.

### Force update

Control: the manager creates a new unique branch and never updates an existing ref.

## Residual risk

Repository administrators retain the technical ability to merge or deploy outside this manager. Branch protection, environment protection and human review remain necessary controls. This automation reduces accidental release risk but does not replace repository governance.

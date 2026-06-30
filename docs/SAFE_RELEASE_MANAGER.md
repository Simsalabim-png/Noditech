# GitHub-native safe release manager

## Purpose

The safe release manager replaces chat-based release preparation with repository-native, auditable automation.

It prepares release candidates only. It has no authority to put code into production.

## Activation

The workflow lives in `.github/workflows/prepare-safe-release.yml`.

- Pull requests validate the manager and its guardrails only.
- Version 1 has no scheduled trigger.
- Manual `workflow_dispatch` defaults to dry-run mode.
- A non-dry manual run must be a separate, deliberate repository action after review.

Merging the governance PR installs the manual workflow but does not schedule or execute release preparation.

## Preconditions

A release draft is created only when all of the following are true:

1. `develop` contains commits not present in `main`.
2. The exact current `develop` SHA has a successful `verify-pc6` workflow run.
3. No workflow on the exact `develop` SHA is pending or has a blocking conclusion.
4. No open PR from a `release/safe-*` branch to `main` already exists.
5. `main` and `develop` remain on the same SHAs throughout the read-before-write check.

If any precondition is not met, the manager exits without writing repository state.

Known v1 limitation: the develop gate explicitly requires exact-head `verify-pc6` success and blocks workflow runs that are present and pending or bad, but it does not yet require an explicit allowlist of every general repository workflow. The generated release head is revalidated by `verify-safe-release.yml` and `verify-pc6.yml`, remains draft, and still requires independent review and explicit production GO.

## Allowed writes

The manager may perform only these writes:

1. Create one uniquely named `release/safe-*` branch from the exact current `main` SHA.
2. Merge the exact validated `develop` SHA into that release branch.
3. Open a draft PR from the release branch to `main`.
4. Dispatch `verify-safe-release.yml` and `verify-pc6.yml` on the exact release branch.

The workflow uses the repository `GITHUB_TOKEN`. GitHub suppresses ordinary workflow chaining for changes created by that token, so the two validation workflows are dispatched explicitly. The deployment workflow is never dispatched.

## Hard restrictions

The manager has no code path or permission purpose for any of the following:

- marking a PR ready for review;
- merging a PR into `main`;
- enabling auto-merge;
- force-pushing;
- creating a tag;
- creating a GitHub Release;
- dispatching `deploy-pc2-pages`;
- deploying to GitHub Pages;
- modifying A/A or A/L behavior.

A new explicit production GO from Simen remains mandatory before any production action.

## Failure behavior

The manager fails closed.

- If CI is missing, pending or red, no branch is created.
- If `main` or `develop` moves during validation, no branch is created.
- If a release PR appears during validation, no duplicate is created.
- If merging `develop` into the new release branch conflicts, the newly created empty branch is removed and the run fails.
- If draft PR creation fails, the newly created branch is removed and the run fails.
- If an active release PR already exists, the manager creates nothing new and only dispatches missing validation workflows for its exact head.

## Human and Codex review

GitHub Actions are the source of truth for deterministic gates and repository mutations. Codex or another reviewer may inspect the draft PR, evidence artifact and workflow logs, but must not be granted an automated path to Ready, merge, tag, release or deploy.

The release PR remains draft until Simen explicitly decides otherwise.

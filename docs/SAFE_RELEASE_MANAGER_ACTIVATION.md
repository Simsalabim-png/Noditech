# Safe release manager activation sequence

This document defines the only approved activation sequence for the GitHub-native safe release manager.

1. Review the exact draft PR head.
2. Confirm the validation workflow and guardrail tests are green.
3. Run an independent code review against `docs/SAFE_RELEASE_MANAGER_REVIEW_CHECKLIST.md`.
4. Obtain an explicit governance GO from Simen before merging this governance PR.
5. After merge, manually run `prepare-safe-release` once with `dry_run: true`.
6. Review the dry-run summary and confirm no repository write occurred.
7. Allow the hourly schedule to operate only after the dry-run is accepted.

Activation of this manager does not authorize any production release action. Every release PR remains subject to its own exact-head validation, independent review and explicit production GO from Simen.

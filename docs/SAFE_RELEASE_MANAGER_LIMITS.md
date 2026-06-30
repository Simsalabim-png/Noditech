# Safe release manager limits

The manager is intentionally limited to release-candidate preparation.

It does not replace:

- independent review of the exact release head;
- browser and offline evidence review;
- artifact SHA pinning for a new production candidate;
- GitHub branch and environment protection;
- Simen's explicit production GO.

It must not be extended to merge or deploy inside the same workflow. Any proposal to add production authority requires a separate threat review, separate PR and explicit decision.

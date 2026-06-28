# Deterministic build (Build 9.8)

Establishes the architecture direction: the self-contained offline HTML is a
**built release artifact**, not the primary editing surface. Source lives under
`src*/`; the artifact is assembled into `dist/` by a deterministic, reproducible
build. This PR delivers the build *process* on a small sample source set — it does
**not** produce a release candidate and does **not** touch pc6.

## Commands
```bash
node build/build.js                 # assemble src-sample/ -> dist/<output>.html (+ SHA256SUMS.dist.txt)
node build/verify-reproducible.js   # build twice in separate processes, assert byte-identical (exit 1 on drift)
node build/verify-reproducible.js <sha256>   # also pin to an expected hash
node --test tests/build/*.test.js tests/engine/*.test.js   # unit tests (use file globs, not dirs)
```

## How determinism is guaranteed
- **No timestamps / host data** in the output — nothing environment-dependent is
  written.
- **LF line endings**, trailing CR stripped from every source; single trailing LF.
- **Fixed inline order** taken from `build/build.manifest.json` (never directory
  listing order).
- **Self-contained**: CSS inlined into `<style>`, JS into `<script>`; the build
  fails if any external `http(s)://`, `<link rel=stylesheet>`, or `<script src>`
  slips in (enforced by tests).
- **Non-circular content hash**: the artifact embeds a `data-build-content-hash`
  computed over the assembled HTML with the hash token present, then the token is
  replaced by the hash. (A file cannot contain its own full-file hash; we bind a
  content hash instead — same principle as pc6's F2.)
- **Fail-closed**: unresolved markers or a missing marker throw, so a placeholder
  artifact can never ship.

## Reproducibility gate
`verify-reproducible.js` builds the artifact twice in **two separate Node
processes**, each writing into its own temporary directory; it then reads the two
final artifacts as bytes, compares their SHA-256, fails (exit 1) on any byte
difference, and always cleans up the temp directories. Verified locally: the two
independent builds produce an identical hash. Wire this as a CI step (browser-free)
for candidate builds.

## Engine is testable without the UI
`src-sample/engine.sample.js` is a UMD module: the same file inlines into the
browser artifact and is `require()`-d directly in `tests/engine/` with no DOM.
`tests/engine/engine.sample.test.js` exercises it headless (fail-closed EER/COP).
This is the template for the real engine extraction (`src/engine/`).

## Scope / not included
- Sample source only — the real `src/engine|domain|validation|persistence|export|ui`
  extraction and the actual `Kalkulator_build9.8-pc1.html` candidate are later,
  separate PRs (a candidate is only created after a chosen model improvement).
- pc6 production files are untouched; `verify-pc6` is unaffected.
- Candidate filenames start at `Kalkulator_build9.8-pc1.html`; the pc6 filename is
  never reused. The sample output here is named `Kalkulator_build9.8-sample.html`
  to make clear it is not a release candidate.

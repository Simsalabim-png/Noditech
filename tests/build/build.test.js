'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { assemble, build, loadManifest } = require('../../build/build');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src-sample');
const MANIFEST_PATH = path.join(ROOT, 'build', 'build.manifest.json');
const manifest = loadManifest(MANIFEST_PATH);

test('build is deterministic: two assemblies are byte-identical', () => {
  const a = assemble({ srcDir: SRC, manifest });
  const b = assemble({ srcDir: SRC, manifest });
  assert.equal(a.html, b.html);
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.contentHash, b.contentHash);
});

test('output resolves all markers and the content-hash token', () => {
  const { html } = assemble({ srcDir: SRC, manifest });
  assert.equal(/<!--\s*INLINE:/.test(html), false, 'no inline markers should remain');
  assert.equal(html.includes('__ARTIFACT_CONTENT_HASH__'), false, 'token must be replaced');
});

test('content hash is 64-hex and embedded in the artifact', () => {
  const { html, contentHash } = assemble({ srcDir: SRC, manifest });
  assert.match(contentHash, /^[0-9a-f]{64}$/);
  assert.ok(html.includes(`data-build-content-hash="${contentHash}"`));
});

test('artifact is self-contained (no external resource references)', () => {
  const { html } = assemble({ srcDir: SRC, manifest });
  assert.equal(/https?:\/\//.test(html), false, 'no http(s) URLs');
  assert.equal(/<link\b[^>]*rel=["\']?stylesheet/i.test(html), false, 'no external stylesheet link');
  assert.equal(/<script\b[^>]*\bsrc=/i.test(html), false, 'no external script src');
  // CSS and JS are inlined.
  assert.ok(html.includes('<style>'));
  assert.ok(html.includes('<script>'));
});

test('output ends with a single trailing LF newline', () => {
  const { html } = assemble({ srcDir: SRC, manifest });
  assert.equal(html.endsWith('\n'), true);
  assert.equal(html.endsWith('\n\n'), false);
  assert.equal(html.includes('\r'), false, 'no CR characters (LF only)');
});

test('build is sensitive to source changes (different source => different hash)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noditech-build-'));
  // Clone src into tmp, mutate one byte of a partial.
  for (const f of ['template.html', 'styles.css', 'engine.sample.js', 'ui.sample.js']) {
    fs.copyFileSync(path.join(SRC, f), path.join(tmp, f));
  }
  const baseline = assemble({ srcDir: SRC, manifest }).sha256;
  fs.appendFileSync(path.join(tmp, 'styles.css'), '\n/* mutated */\n');
  const mutated = assemble({ srcDir: tmp, manifest }).sha256;
  assert.notEqual(baseline, mutated);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('build() writes artifact + dist checksum file', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noditech-dist-'));
  const out = build({ srcDir: SRC, manifestPath: MANIFEST_PATH, distDir: tmp });
  assert.ok(fs.existsSync(out.outPath));
  const sums = fs.readFileSync(path.join(tmp, 'SHA256SUMS.dist.txt'), 'utf8').trim();
  assert.equal(sums, `${out.sha256}  ${out.output}`);
  // Written bytes hash to the reported sha256.
  const crypto = require('crypto');
  const onDisk = crypto.createHash('sha256').update(fs.readFileSync(out.outPath)).digest('hex');
  assert.equal(onDisk, out.sha256);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('missing marker throws (no silent placeholder shipping)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noditech-bad-'));
  for (const f of ['styles.css', 'engine.sample.js', 'ui.sample.js']) {
    fs.copyFileSync(path.join(SRC, f), path.join(tmp, f));
  }
  // Template without the engine marker.
  fs.writeFileSync(path.join(tmp, 'template.html'), '<!doctype html><html><head><!-- INLINE:styles --></head><body><!-- INLINE:ui --></body></html>\n');
  assert.throws(() => assemble({ srcDir: tmp, manifest }), /missing marker for "engine"/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('9.8-pc1 candidate contains trustworthy result guidance', () => {
  const { html } = assemble({ srcDir: SRC, manifest });

  assert.ok(html.includes('id="calculation-form"'));
  assert.ok(html.includes('id="result-panel"'));
  assert.ok(html.includes('id="status-label"'));
  assert.ok(html.includes('id="issue-list"'));
  assert.ok(html.includes('Beregning blokkert'));
  assert.ok(html.includes('Resultat med begrensninger'));
  assert.ok(html.includes('Resultat klart'));
});

test('9.8-pc1 candidate includes accessible status and focus behavior', () => {
  const { html } = assemble({ srcDir: SRC, manifest });

  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes("setAttribute('role', 'alert')"));
  assert.ok(html.includes("setAttribute('aria-live', 'assertive')"));
  assert.ok(html.includes("setAttribute('aria-invalid', 'true')"));
  assert.ok(html.includes('target.focus()'));
  assert.ok(html.includes('panel.focus()'));
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const WORK = path.resolve(__dirname, '..', '..');
if (!process.env.NODITECH_REPO_FILES) process.env.NODITECH_REPO_FILES = WORK;
const haveSources = fs.existsSync(path.join(process.env.NODITECH_REPO_FILES, 'Kalkulator_build9.7-pc6.html'));
const skip = !haveSources && 'real source files not present';

const releaseBuilder = require('../../build/assemble-pc2-ll-release.js');
const transform = require('../../src/ui/milestone1ArtifactTransform.js');

const EXPECTED = Object.freeze({
  artifactSha256: 'b7a1f4b597383fb877c1aa762f8103041411bd8c6ad2b78f33845a746cd63abe',
  before: Object.freeze({
    airAir: '6af7a16bb8adc2019f72f4f731900f16f9e1268dfb2d0a233049166ccd2b0275',
    airLiquid: '364119e063e7fc58c2e04f96012bdebb29d8da4235db38c56668e8e6eb591aec',
  }),
  after: Object.freeze({
    airAir: '27bac419f7f92d47070239520b360dbce9d20a5e2619ae02df749aaea8980cd7',
    airLiquid: 'ac589bca41ae0260e97779e73e727e2ab999d7a962447a5ddc3c59cdc8d1085a',
  }),
});

test('Milestone 1 transform fails closed on missing or ambiguous anchors', () => {
  assert.throws(() => transform.replaceOnce('abc', 'missing', 'x', 'test'), /anchor not found/);
  assert.throws(() => transform.replaceOnce('aa', 'a', 'x', 'test'), /anchor not unique/);
  assert.throws(() => transform.applyMilestone1ArtifactTransform('<html/>'), /compiled Noditech artifact required/);
});

test('Milestone 1 release is deterministic and pins replacement freeze anchors', { skip }, () => {
  const first = releaseBuilder.build();
  const second = releaseBuilder.build();
  assert.equal(first.html, second.html);
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.sha256, EXPECTED.artifactSha256);
  assert.deepEqual(first.milestone1.before, EXPECTED.before);
  assert.deepEqual(first.milestone1.after, EXPECTED.after);
});

test('Milestone 1 artifact contains the reviewed correctness contracts', { skip }, () => {
  const result = releaseBuilder.build();
  const html = result.html;
  assert.match(html, /function useCanonicalTemperature\(initialC, unit\)/);
  assert.match(html, /data-aa-chart-status/);
  assert.match(html, /data-ll-cop/);
  assert.match(html, /"data-ll-cop": "cooling"/);
  assert.match(html, /"data-ll-cop": "heating"/);
  assert.match(html, /copCooling = _llRecord \? _llRecord\.copCooling : null/);
  assert.match(html, /copHeating = _llRecord \? _llRecord\.copHeating : null/);
  assert.match(html, /activeCop = _llUi\.cop/);
  assert.match(html, /Chart unavailable until the Air\/Air result is valid/);
  assert.match(html, /Number\.isFinite\(p\.W\)/);
  assert.doesNotMatch(html, /agree by construction but are not a single code path/);
});

test('canonical unit projection tolerances are explicit and physically invariant', () => {
  const toF = c => c * 9 / 5 + 32;
  const toC = f => (f - 32) * 5 / 9;
  for (const c of [-40, -10, 0, 7, 12, 15, 26, 35, 60, 120]) {
    assert.ok(Math.abs(toC(toF(c)) - c) <= 0.01, `${c} C round-trip`);
  }
  assert.ok(Math.abs(toF(26) - 78.8) <= 0.05);
});

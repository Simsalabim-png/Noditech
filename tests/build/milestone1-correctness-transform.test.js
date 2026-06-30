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
  artifactSha256: 'edaa93726357a3bc5fee63380ecdc61f1bef5a1b0ea7aa8b324087f32079ae30',
  identity: Object.freeze({
    version: 'Build 9.8-pc2',
    date: '2026-06-30',
    hash: '568ec3bad455',
  }),
  before: Object.freeze({
    airAir: '6af7a16bb8adc2019f72f4f731900f16f9e1268dfb2d0a233049166ccd2b0275',
    airLiquid: '364119e063e7fc58c2e04f96012bdebb29d8da4235db38c56668e8e6eb591aec',
  }),
  after: Object.freeze({
    airAir: '53734e338144b47751185b3a94394f6cb364e1dd6fc2754787212e0d42a34fbf',
    airLiquid: '9d666dfc903b0be65fb86b3d3ff4c48cb86434c6e1e9aa86d5f42a2d6b5652ba',
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
  assert.deepEqual(first.identity, second.identity);
  assert.deepEqual(first.identity, EXPECTED.identity);
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

test('Milestone 1 artifact carries the unique exact-candidate data-m1-* hooks', { skip }, () => {
  const { html } = releaseBuilder.build();
  const hooks = [
    '"data-m1-field": "al-liquid-inlet"',
    '"data-m1-field": "al-liquid-outlet"',
    '"data-m1-field": "ref-suction-temperature"',
    '"data-m1-field": "ref-liquid-temperature"',
    '"data-m1-field": "ref-discharge-temperature"',
    '"data-m1-result": "al-liquid-q"',
    '"data-m1-result": "aa-total-capacity"',
    '"data-m1-save": "air-air"',
    '"data-m1-save": "air-liquid"',
  ];
  for (const h of hooks) {
    const count = html.split(h).length - 1;
    assert.equal(count, 1, `hook ${h} must appear exactly once (found ${count})`);
  }
  assert.match(html, /'data-m1-field': props\['data-m1-field'\]/);
});

test('Milestone 1 artifact presents the build-generated 9.8-pc2 identity', { skip }, () => {
  const { html } = releaseBuilder.build();
  assert.match(html, /const BUILD_VERSION = "Build 9\.8-pc2";/);
  assert.match(html, /const BUILD_DATE = "2026-06-30";/);
  assert.match(html, /const BUILD_HASH = "568ec3bad455";/);
  assert.doesNotMatch(html, /Build 9\.6-rc8/);
  assert.doesNotMatch(html, /b6ebc906e926/);
});

test('canonical unit projection tolerances are explicit and physically invariant', () => {
  const toF = c => c * 9 / 5 + 32;
  const toC = f => (f - 32) * 5 / 9;
  for (const c of [-40, -10, 0, 7, 12, 15, 26, 35, 60, 120]) {
    assert.ok(Math.abs(toC(toF(c)) - c) <= 0.01, `${c} C round-trip`);
  }
  assert.ok(Math.abs(toF(26) - 78.8) <= 0.05);
});

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
  artifactSha256: 'dabe8957fe37dc5bced1a73398ae9b0bb872ceff5b462538b6428b0ec69a2910',
  identity: Object.freeze({
    version: 'Build 9.8-pc2',
    date: '2026-06-30',
    hash: 'ac2413d9dc35',
  }),
  // NOTE on the airLiquid hashes: they cover the compiled span
  // 'function AirLiquid({' -> 'function LiqLiq({', and the L/L cutover transform
  // inserts the build-generated L/L browser bundle between those two anchors.
  // The airLiquid values therefore change whenever any reviewed L/L module
  // embedded in the bundle changes (e.g. liquidLiquidContract.js), even when the
  // AirLiquid component bytes are untouched. Byte-identity of the actual A/A and
  // A/L components is separately enforced, fail-closed, by the freeze assertions
  // inside transformLiqLiqCutover ('A/A freeze violation' / 'A/L freeze violation').
  before: Object.freeze({
    airAir: '6af7a16bb8adc2019f72f4f731900f16f9e1268dfb2d0a233049166ccd2b0275',
    airLiquid: '4b1fe7803487d80d81060377c9ba18a8e9c742a4551bc93e18512cb48f64699e',
  }),
  after: Object.freeze({
    airAir: '53734e338144b47751185b3a94394f6cb364e1dd6fc2754787212e0d42a34fbf',
    airLiquid: 'a5e32e9c4f5055d5533b38d341c32d2d89243c5a4a0e42fe8dea6e8a67672d02',
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

test('Milestone 1 artifact carries the unique exact-candidate data-m1-* hooks and DOM ranges', { skip }, () => {
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
  assert.match(html, /min: min,\n    max: max,\n    'aria-invalid'/);
});

test('Milestone 1 artifact presents the build-generated 9.8-pc2 identity', { skip }, () => {
  const { html } = releaseBuilder.build();
  assert.match(html, /const BUILD_VERSION = "Build 9\.8-pc2";/);
  assert.match(html, /const BUILD_DATE = "2026-06-30";/);
  assert.match(html, /const BUILD_HASH = "ac2413d9dc35";/);
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

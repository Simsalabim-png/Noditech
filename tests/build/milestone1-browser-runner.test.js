'use strict';

// Governance test for the exact-candidate Milestone 1 browser runner. It does NOT execute Chromium
// (that runs via `npm run chromium:milestone1` in CI, which is authoritative). It pins the required
// assertion IDs AND the meaningful behavioural controls, so the runner cannot silently regress into a
// vacuous or mis-targeted state (the v3 review's B2.1–B2.9 failure modes).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RUNNER = path.join(__dirname, '..', '..', 'chromium', 'run_milestone1_assertions.js');
const SRC = fs.readFileSync(RUNNER, 'utf8');

const REQUIRED_IDS = [
  'identity', 'HOOKS.unique',
  'AA.initial.blocked', 'AA.initial.save_disabled', 'AA.initial.unavailable', 'AA.initial.no_nonfinite',
  'AA.valid.chart_ready', 'AA.valid.save_enabled',
  'AA.unit.toF', 'AA.unit.result_invariant_F', 'AA.unit.roundtrip', 'AA.unit.result_invariant_C',
  'AA.reblocked.chart', 'AA.reblocked.save_disabled',
  'AL.initial.save_disabled', 'AL.cooling.valid', 'AL.cooling.air_withheld_save_allowed',
  'AL.unit.toF', 'AL.unit.roundtrip', 'AL.invalid.blocked',
  'LL.scenario.balanced', 'LL.cards.present', 'LL.cards.fixed_across_mode', 'LL.heating.formula',
  'LL.unit.toF', 'LL.cards.invariant_F', 'LL.unit.roundtrip',
  'REF.range.suction_F', 'REF.range.liquid_F', 'REF.range.discharge_F',
  'REF.suction.roundtrip', 'REF.liquid.roundtrip', 'REF.discharge.blank',
  'GLOBAL.no_console_errors', 'GLOBAL.no_page_errors', 'GLOBAL.offline',
];

test('runner covers every required exact-candidate assertion ID', () => {
  for (const id of REQUIRED_IDS) assert.ok(SRC.includes("'" + id + "'"), `missing required assertion ID: ${id}`);
});

test('runner loads the exact deterministic candidate artifact', () => {
  assert.match(SRC, /Kalkulator_build9\.8-pc2\.html/);
  assert.match(SRC, /dist-milestone1/);
});

test('runner drives unique data-m1-* hooks, not ranges or generic input types', () => {
  for (const hook of ['al-liquid-inlet', 'al-liquid-outlet', 'ref-suction-temperature', 'ref-liquid-temperature', 'ref-discharge-temperature', 'al-liquid-q', 'aa-total-capacity']) {
    assert.ok(SRC.includes(hook), `runner must reference hook ${hook}`);
  }
  assert.match(SRC, /HOOKS\.unique/, 'must assert hook uniqueness');
  assert.doesNotMatch(SRC, /input\[type="number"\]/, 'must not select engineering fields by generic number input');
});

test('A/L uses distinct inlet and outlet writes and asserts a finite liquid Q', () => {
  assert.match(SRC, /setField\('al-liquid-inlet',12\)/);
  assert.match(SRC, /setField\('al-liquid-outlet',7\)/);
  assert.match(SRC, /distinct write failed/);
  assert.match(SRC, /Number\.isFinite\(alQ\)/);
  assert.match(SRC, /result\('al-liquid-q'\)/);
});

test('A/L withheld-air distinction inspects air-side status explicitly', () => {
  assert.match(SRC, /airStatus\(\)/);
  assert.match(SRC, /air !== 'good'/);
});

test('A/L invalid transition depends on the prior valid state', () => {
  assert.match(SRC, /alValidPassed/);
  assert.match(SRC, /precondition AL\.cooling\.valid did not pass/);
});

test('L/L scenario is balanced via the production property helper, not hard-coded flow', () => {
  assert.match(SRC, /NoditechLiquidLiquid/);
  assert.match(SRC, /resolveLiquidProperties/);
  assert.match(SRC, /balancedWaterHotFlow/);
  assert.doesNotMatch(SRC, /hot-flow",\s*1\.0/);
});

test('refrigerant blank/range checks assert the unique element exists first', () => {
  assert.match(SRC, /fieldExists\('ref-discharge-temperature'\)/);
  assert.match(SRC, /hook missing/);
});

test('A/A unavailable assertion is scoped to a governed result card, not a page-wide dash scan', () => {
  assert.match(SRC, /result\('aa-total-capacity'\)/);
  assert.doesNotMatch(SRC, /unavailableDash/);
});

test('runner inspects Page.navigate return value and fails closed with diagnostics', () => {
  assert.match(SRC, /nav\.errorText/);
  assert.match(SRC, /navDiag/);
  assert.match(SRC, /classification:/);
});

test('runner is robust: timeouts, fail-closed cleanup, evidence, skipped:0', () => {
  assert.match(SRC, /withTimeout\(loaded/, 'navigation must be guarded by a timeout');
  assert.match(SRC, /function cleanup\(\)/, 'must close CDP/Chromium/server in finally-style cleanup');
  assert.match(SRC, /milestone1_assertions_junit\.xml/);
  assert.match(SRC, /milestone1_assertions_result\.json/);
  assert.match(SRC, /skipped: 0/);
});

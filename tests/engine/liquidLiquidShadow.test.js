'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const {
  normalizeOperatingMode,
  nextOperatingMode,
  buildLiquidLiquidShadow,
} = require('../../src/engine/liquidLiquidShadow.js');

const glycolLookup = (fluid, percent, temperatureC) => E.glyEval(fluid, percent, temperatureC);

function state(overrides) {
  return {
    unit: 'C', operatingMode: 'cooling',
    cFt: 'water', cGlyKind: 'EG', cGp: 30, cTi: 12, cTo: 7, cF: 0.5,
    hFt: 'water', hGlyKind: 'EG', hGp: 30, hTi: 30, hTo: 35, hF: 0.56,
    pw: 1.2, job: 'Shadow', uid: 'LL-SHADOW', ref: 'R32', measDate: '2026-06-29 12:00',
    ...overrides,
  };
}

test('operating mode state accepts only cooling or heating', () => {
  assert.equal(normalizeOperatingMode('cooling'), 'cooling');
  assert.equal(normalizeOperatingMode('heating'), 'heating');
  assert.equal(normalizeOperatingMode('Cooling'), null);
  assert.equal(normalizeOperatingMode(null), null);
  assert.equal(nextOperatingMode('cooling', 'heating'), 'heating');
  assert.equal(nextOperatingMode('heating', 'invalid'), 'heating');
  assert.equal(nextOperatingMode(null, 'invalid'), 'cooling');
});

test('shadow evaluation exposes only neutral data attributes', () => {
  const shadow = buildLiquidLiquidShadow(state(), { glycolLookup });
  assert.equal(shadow.operatingMode, 'cooling');
  assert.equal(shadow.attributes['data-ll-shadow'], 'true');
  assert.equal(shadow.attributes['data-ll-operating-mode'], 'cooling');
  assert.match(shadow.attributes['data-ll-shadow-valid'], /^(true|false)$/);
  assert.equal(typeof shadow.attributes['data-ll-shadow-code'], 'string');
  assert.equal(typeof shadow.attributes['data-ll-shadow-status'], 'string');
  assert.match(shadow.attributes['data-ll-shadow-save-allowed'], /^(true|false)$/);
  assert.deepEqual(Object.keys(shadow.attributes).sort(), [
    'data-ll-operating-mode',
    'data-ll-shadow',
    'data-ll-shadow-code',
    'data-ll-shadow-save-allowed',
    'data-ll-shadow-status',
    'data-ll-shadow-valid',
  ]);
});

test('shadow mode never changes the supplied legacy state', () => {
  const input = state({ operatingMode: 'heating' });
  const snapshot = JSON.parse(JSON.stringify(input));
  buildLiquidLiquidShadow(input, { glycolLookup });
  assert.deepEqual(input, snapshot);
});

test('missing mode is visible as blocked shadow state', () => {
  const shadow = buildLiquidLiquidShadow(state({ operatingMode: null }), { glycolLookup });
  assert.equal(shadow.operatingMode, null);
  assert.equal(shadow.attributes['data-ll-operating-mode'], 'missing');
  assert.equal(shadow.attributes['data-ll-shadow-valid'], 'false');
  assert.equal(shadow.attributes['data-ll-shadow-code'], 'operating_mode_missing');
  assert.equal(shadow.attributes['data-ll-shadow-status'], 'blocked');
  assert.equal(shadow.attributes['data-ll-shadow-save-allowed'], 'false');
  assert.equal(shadow.evaluated.contract.record, null);
});

test('reversed legacy temperatures remain blocked in shadow mode', () => {
  const shadow = buildLiquidLiquidShadow(state({ cTi: 7, cTo: 12, hTi: 40, hTo: 35 }), { glycolLookup });
  assert.equal(shadow.attributes['data-ll-shadow-valid'], 'false');
  assert.equal(shadow.attributes['data-ll-shadow-code'], 'cold_direction_invalid');
  assert.equal(shadow.attributes['data-ll-shadow-save-allowed'], 'false');
});

test('cooling and heating select the correct useful COP in the contract', () => {
  const cooling = buildLiquidLiquidShadow(state({ operatingMode: 'cooling' }), { glycolLookup });
  const heating = buildLiquidLiquidShadow(state({ operatingMode: 'heating' }), { glycolLookup });
  assert.equal(cooling.evaluated.contract.operatingMode, 'cooling');
  assert.equal(heating.evaluated.contract.operatingMode, 'heating');
  if (cooling.evaluated.contract.valid && heating.evaluated.contract.valid) {
    assert.equal(cooling.evaluated.contract.record.cop, cooling.evaluated.result.copCooling);
    assert.equal(heating.evaluated.contract.record.cop, heating.evaluated.result.copHeating);
  }
});

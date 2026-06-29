'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const {
  celsius,
  legacyFluid,
  adaptLegacyLiquidLiquidState,
  legacyMetadata,
  evaluateLegacyLiquidLiquidState,
} = require('../../src/engine/liquidLiquidCalculatorAdapter.js');

const near = (actual, expected, tolerance = 1e-9, label = 'value') => {
  assert.ok(Number.isFinite(actual), `${label} non-finite: ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tol ${tolerance})`);
};

const glycolLookup = (fluid, percent, temperatureC) => E.glyEval(fluid, percent, temperatureC);

function exactLegacyState(overrides) {
  return {
    unit: 'C', operatingMode: 'cooling',
    cFt: 'water', cGlyKind: 'EG', cGp: 30, cTi: 12, cTo: 7, cF: 0.5,
    hFt: 'water', hGlyKind: 'EG', hGp: 30, hTi: 30, hTo: 35, hF: 0.5574162679425837,
    pw: 1.2, job: 'Adapter baseline', uid: 'LL-01', ref: 'R32', measDate: '2026-06-29 12:00',
    ...overrides,
  };
}

test('temperature conversion is deterministic', () => {
  near(celsius(32, 'F'), 0, 1e-12, '32 F');
  near(celsius(212, 'F'), 100, 1e-12, '212 F');
  near(celsius(12, 'C'), 12, 1e-12, '12 C');
});

test('legacy fluid selectors map only to water EG or PG', () => {
  assert.deepEqual(legacyFluid('water', 'PG', 30), { fluid: 'WATER', glycolPercent: 0 });
  assert.deepEqual(legacyFluid('glycol', 'EG', 25), { fluid: 'EG', glycolPercent: 25 });
  assert.deepEqual(legacyFluid('glycol', 'PG', 35), { fluid: 'PG', glycolPercent: 35 });
  assert.deepEqual(legacyFluid('unknown', 'EG', 30), { fluid: null, glycolPercent: null });
});

test('legacy state maps to new engine input without mutation', () => {
  const state = exactLegacyState();
  const snapshot = JSON.parse(JSON.stringify(state));
  const input = adaptLegacyLiquidLiquidState(state);
  assert.deepEqual(state, snapshot);
  assert.equal(input.operatingMode, 'cooling');
  assert.equal(input.electricalPower_kW, 1.2);
  assert.deepEqual(input.cold, { fluid: 'WATER', glycolPercent: 0, inletC: 12, outletC: 7, flowLs: 0.5 });
  assert.deepEqual(input.hot, { fluid: 'WATER', glycolPercent: 0, inletC: 30, outletC: 35, flowLs: 0.5574162679425837 });
});

test('Fahrenheit and Celsius states map to the same physics', () => {
  const c = adaptLegacyLiquidLiquidState(exactLegacyState());
  const f = adaptLegacyLiquidLiquidState(exactLegacyState({ unit: 'F', cTi: 53.6, cTo: 44.6, hTi: 86, hTo: 95 }));
  near(f.cold.inletC, c.cold.inletC, 1e-12, 'cold inlet');
  near(f.cold.outletC, c.cold.outletC, 1e-12, 'cold outlet');
  near(f.hot.inletC, c.hot.inletC, 1e-12, 'hot inlet');
  near(f.hot.outletC, c.hot.outletC, 1e-12, 'hot outlet');
});

test('metadata maps current calculator names without invented values', () => {
  assert.deepEqual(legacyMetadata(exactLegacyState()), {
    recordId: null, measuredAt: '2026-06-29 12:00', job: 'Adapter baseline', unit: 'LL-01', reference: 'R32',
  });
  assert.deepEqual(legacyMetadata({}), {
    recordId: null, measuredAt: null, job: null, unit: null, reference: null,
  });
});

test('exact water state evaluates through engine and contract', () => {
  const evaluated = evaluateLegacyLiquidLiquidState(exactLegacyState(), { glycolLookup });
  assert.equal(evaluated.result.valid, true);
  assert.equal(evaluated.contract.valid, true);
  assert.equal(evaluated.contract.status, 'good');
  near(evaluated.result.energyResidual_kW, 0, 1e-9, 'residual');
  near(evaluated.contract.record.usefulCapacity_kW, evaluated.result.cold.capacity_kW, 1e-12, 'capacity');
  assert.equal(evaluated.contract.record.job, 'Adapter baseline');
});

test('EG and PG selections use the validated provider', () => {
  for (const kind of ['EG', 'PG']) {
    const properties = glycolLookup(kind, 30, 9.5);
    assert.equal(properties.valid, true);
    const qCold = 0.5 * properties.rho * properties.cp * 5;
    const hotFlow = (qCold + 1.2) / (properties.rho * properties.cp * 5);
    const evaluated = evaluateLegacyLiquidLiquidState(exactLegacyState({
      cFt: 'glycol', cGlyKind: kind, cGp: 30,
      hFt: 'glycol', hGlyKind: kind, hGp: 30,
      hTi: 7, hTo: 12, hF: hotFlow,
    }), { glycolLookup });
    assert.equal(evaluated.result.valid, true, kind);
    near(evaluated.result.energyResidual_kW, 0, 1e-8, `${kind} residual`);
    assert.match(evaluated.result.cold.propertySource, /CoolProp/i);
  }
});

test('missing mode is fail-closed in result and contract', () => {
  const evaluated = evaluateLegacyLiquidLiquidState(exactLegacyState({ operatingMode: null }), { glycolLookup });
  assert.equal(evaluated.result.valid, false);
  assert.equal(evaluated.result.code, 'operating_mode_missing');
  assert.equal(evaluated.contract.valid, false);
  assert.equal(evaluated.contract.saveAllowed, false);
  assert.equal(evaluated.contract.record, null);
});

test('legacy reversed directions are blocked instead of made positive', () => {
  const evaluated = evaluateLegacyLiquidLiquidState(exactLegacyState({ cTi: 7, cTo: 12, hTi: 40, hTo: 35 }), { glycolLookup });
  assert.equal(evaluated.result.valid, false);
  assert.equal(evaluated.result.code, 'cold_direction_invalid');
  assert.equal(evaluated.contract.valid, false);
  assert.equal(evaluated.contract.ui.resultVisible, false);
});

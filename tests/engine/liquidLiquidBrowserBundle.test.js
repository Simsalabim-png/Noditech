'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  buildLiquidLiquidBrowserBundle,
} = require('../../src/engine/liquidLiquidBrowserBundle.js');
const {
  evaluateLegacyLiquidLiquidState,
} = require('../../src/engine/liquidLiquidCalculatorAdapter.js');

function loadBrowserApi() {
  const context = { globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  const bundle = buildLiquidLiquidBrowserBundle();
  vm.runInContext(bundle, context, { filename: 'liquid-liquid-browser-bundle.js' });
  return { api: context.NoditechLiquidLiquid, bundle };
}

function lookup(fluid, percent, temperatureC) {
  if (fluid !== 'EG' && fluid !== 'PG') return { valid: false, reason: 'unknown_fluid' };
  return {
    valid: true,
    cp: fluid === 'EG' ? 3.68 : 3.62,
    rho: fluid === 'EG' ? 1.042 : 1.034,
    freeze: -12 - percent / 10,
    source: `CoolProp test ${fluid} ${temperatureC}`,
  };
}

function state(overrides) {
  return {
    unit: 'C', operatingMode: 'cooling',
    cFt: 'glycol', cGlyKind: 'EG', cGp: 30, cTi: 12, cTo: 7, cF: 0.5,
    hFt: 'glycol', hGlyKind: 'PG', hGp: 30, hTi: 30, hTo: 35, hF: 0.56,
    pw: 1.2, job: 'Browser parity', uid: 'LL-BROWSER', ref: 'R32', measDate: '2026-06-29',
    ...overrides,
  };
}

test('browser bundle is deterministic and contains no CommonJS runtime dependency', () => {
  const first = buildLiquidLiquidBrowserBundle();
  const second = buildLiquidLiquidBrowserBundle();
  assert.equal(first, second);
  assert.doesNotMatch(first, /\brequire\s*\(/);
  assert.doesNotMatch(first, /module\.exports/);
  assert.match(first, /global\.NoditechLiquidLiquid=Object\.freeze/);
});

test('browser API matches the reviewed Node adapter and contract', () => {
  const { api } = loadBrowserApi();
  const input = state();
  const nodeResult = evaluateLegacyLiquidLiquidState(input, { glycolLookup: lookup });
  const browserResult = api.evaluateLegacyLiquidLiquidState(input, { glycolLookup: lookup });
  assert.deepEqual(JSON.parse(JSON.stringify(browserResult)), JSON.parse(JSON.stringify(nodeResult)));
  assert.equal(browserResult.contract.record.operatingMode, 'cooling');
  assert.equal(browserResult.contract.record.cold.propertySource, 'CoolProp test EG 9.5');
  assert.equal(browserResult.contract.record.hot.propertySource, 'CoolProp test PG 32.5');
});

test('browser API fails closed when glycol provider is missing', () => {
  const { api } = loadBrowserApi();
  const evaluated = api.evaluateLegacyLiquidLiquidState(state(), {});
  assert.equal(evaluated.contract.valid, false);
  assert.equal(evaluated.contract.code, 'cold_glycol_provider_missing');
  assert.equal(evaluated.contract.saveAllowed, false);
  assert.equal(evaluated.contract.record, null);
  assert.equal(evaluated.contract.json, null);
  assert.equal(evaluated.contract.csv, null);
});

test('browser API propagates provider freeze errors without fabricated values', () => {
  const { api } = loadBrowserApi();
  const evaluated = api.evaluateLegacyLiquidLiquidState(state(), {
    glycolLookup: () => ({ valid: false, reason: 'below_freeze_guard' }),
  });
  assert.equal(evaluated.contract.valid, false);
  assert.equal(evaluated.contract.code, 'cold_below_freeze_guard');
  assert.equal(evaluated.result.cold, null);
  assert.equal(evaluated.contract.ui.usefulCapacity_kW, null);
});

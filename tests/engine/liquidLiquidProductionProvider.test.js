'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  createProductionGlycolLookup,
  productionProviderBrowserSource,
} = require('../../src/engine/liquidLiquidProductionProvider.js');

test('production adapter forwards EG and PG calls unchanged', () => {
  const calls = [];
  const lookup = createProductionGlycolLookup((fluid, percent, temperatureC) => {
    calls.push([fluid, percent, temperatureC]);
    return { valid: true, cp: 3.7, rho: 1.04, freeze: -14, source: 'CoolProp verified' };
  });
  assert.deepEqual(lookup('EG', 30, 9.5), {
    valid: true, cp: 3.7, rho: 1.04, freeze: -14, source: 'CoolProp verified',
  });
  assert.deepEqual(lookup('PG', 25, 20), {
    valid: true, cp: 3.7, rho: 1.04, freeze: -14, source: 'CoolProp verified',
  });
  assert.deepEqual(calls, [['EG', 30, 9.5], ['PG', 25, 20]]);
});

test('production adapter fails closed when provider is absent or invalid', () => {
  assert.deepEqual(createProductionGlycolLookup(null)('EG', 30, 10), {
    valid: false, reason: 'glycol_provider_missing',
  });
  assert.deepEqual(createProductionGlycolLookup(() => null)('EG', 30, 10), {
    valid: false, reason: 'glycol_properties_invalid',
  });
  assert.deepEqual(createProductionGlycolLookup(() => ({ valid: true, cp: NaN, rho: 1, freeze: -10 }))('EG', 30, 10), {
    valid: false, reason: 'glycol_properties_invalid',
  });
});

test('provider reason including freeze guard propagates without values', () => {
  const lookup = createProductionGlycolLookup(() => ({ valid: false, reason: 'below_freeze_guard' }));
  assert.deepEqual(lookup('EG', 30, -14), { valid: false, reason: 'below_freeze_guard' });
});

test('browser source binds the production glyEval function explicitly', () => {
  const calls = [];
  const context = {
    glyEval: (...args) => {
      calls.push(args);
      return { valid: true, cp: 3.6, rho: 1.03, freeze: -12, source: 'CoolProp browser' };
    },
  };
  vm.createContext(context);
  vm.runInContext(`${productionProviderBrowserSource('lookup')}\nglobalThis.result=lookup('PG',35,18);`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.result)), {
    valid: true, cp: 3.6, rho: 1.03, freeze: -12, source: 'CoolProp browser',
  });
  assert.deepEqual(calls, [['PG', 35, 18]]);
});

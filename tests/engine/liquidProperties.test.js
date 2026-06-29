'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');
const {
  normalizeFluid,
  resolveLiquidProperties,
} = require('../../src/engine/liquidProperties.js');
const {
  computeLiquidLiquidWithProperties,
} = require('../../src/engine/liquidLiquidWithProperties.js');

const near = (actual, expected, tolerance = 1e-9, label = 'value') => {
  assert.ok(Number.isFinite(actual), `${label} non-finite: ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tol ${tolerance})`);
};

const glycolLookup = (fluid, percent, temperatureC) => E.glyEval(fluid, percent, temperatureC);

test('fluid aliases normalize deterministically', () => {
  assert.equal(normalizeFluid('water'), 'WATER');
  assert.equal(normalizeFluid('H2O'), 'WATER');
  assert.equal(normalizeFluid('MEG'), 'EG');
  assert.equal(normalizeFluid('ethylene glycol'), 'EG');
  assert.equal(normalizeFluid('MPG'), 'PG');
  assert.equal(normalizeFluid('propylene glycol'), 'PG');
  assert.equal(normalizeFluid('oil'), null);
});

test('water properties use mean temperature and interpolation', () => {
  const result = resolveLiquidProperties({
    fluid: 'water',
    inletC: 30,
    outletC: 10,
  });
  assert.equal(result.valid, true);
  assert.equal(result.fluid, 'WATER');
  near(result.meanTemperatureC, 20, 1e-12, 'mean temperature');
  near(result.cpKJkgK, 4.1816, 1e-12, 'water cp');
  near(result.densityKgL, 0.99821, 1e-12, 'water density');
  assert.equal(result.freezePointC, 0);
  assert.equal(result.glycolPercent, 0);
  assert.match(result.propertySource, /water table/i);
});

test('water properties vary with temperature', () => {
  const cold = resolveLiquidProperties({ fluid: 'water', meanTemperatureC: 10 });
  const warm = resolveLiquidProperties({ fluid: 'water', meanTemperatureC: 70 });
  assert.equal(cold.valid, true);
  assert.equal(warm.valid, true);
  assert.notEqual(cold.cpKJkgK, warm.cpKJkgK);
  assert.notEqual(cold.densityKgL, warm.densityKgL);
  assert.ok(cold.densityKgL > warm.densityKgL);
});

test('water fails closed outside table range', () => {
  assert.equal(resolveLiquidProperties({ fluid: 'water', meanTemperatureC: -0.1 }).code, 'water_temperature_out_of_range');
  assert.equal(resolveLiquidProperties({ fluid: 'water', meanTemperatureC: 100.1 }).code, 'water_temperature_out_of_range');
});

test('EG30 resolves from existing validated CoolProp provider', () => {
  const result = resolveLiquidProperties({
    fluid: 'EG',
    glycolPercent: 30,
    inletC: 12,
    outletC: 7,
  }, { glycolLookup });
  assert.equal(result.valid, true);
  assert.equal(result.fluid, 'EG');
  near(result.meanTemperatureC, 9.5, 1e-12, 'EG mean temperature');
  near(result.cpKJkgK, 3.6869969921, 1e-9, 'EG cp');
  near(result.densityKgL, 1.0419784157, 1e-9, 'EG density');
  assert.ok(result.freezePointC < 0);
  assert.match(result.propertySource, /CoolProp/i);
});

test('PG properties resolve and change with temperature', () => {
  const lower = resolveLiquidProperties({
    fluid: 'PG', glycolPercent: 30, meanTemperatureC: 10,
  }, { glycolLookup });
  const higher = resolveLiquidProperties({
    fluid: 'PG', glycolPercent: 30, meanTemperatureC: 30,
  }, { glycolLookup });
  assert.equal(lower.valid, true);
  assert.equal(higher.valid, true);
  assert.equal(lower.fluid, 'PG');
  assert.notEqual(lower.cpKJkgK, higher.cpKJkgK);
  assert.notEqual(lower.densityKgL, higher.densityKgL);
  assert.ok(lower.densityKgL > higher.densityKgL);
  assert.match(lower.propertySource, /CoolProp/i);
});

test('glycol lookup is mandatory and concentration is fail-closed', () => {
  assert.equal(resolveLiquidProperties({ fluid: 'EG', glycolPercent: 30, meanTemperatureC: 10 }).code, 'glycol_provider_missing');
  assert.equal(resolveLiquidProperties({ fluid: 'EG', glycolPercent: -1, meanTemperatureC: 10 }, { glycolLookup }).code, 'glycol_concentration_invalid');
  assert.equal(resolveLiquidProperties({ fluid: 'PG', glycolPercent: 61, meanTemperatureC: 10 }, { glycolLookup }).code, 'glycol_concentration_invalid');
});

test('glycol freeze guard blocks operation near freeze point', () => {
  const properties = glycolLookup('EG', 30, 0);
  assert.equal(properties.valid, true);
  const freeze = properties.freeze;
  const result = resolveLiquidProperties({
    fluid: 'EG',
    glycolPercent: 30,
    inletC: freeze + 0.05,
    outletC: freeze + 0.08,
    meanTemperatureC: 0,
  }, { glycolLookup });
  assert.equal(result.valid, false);
  assert.equal(result.code, 'below_freeze_guard');
});

test('provider invalid result is propagated without fabricated properties', () => {
  const result = resolveLiquidProperties({
    fluid: 'PG', glycolPercent: 30, meanTemperatureC: 500,
  }, { glycolLookup });
  assert.equal(result.valid, false);
  assert.notEqual(result.code, 'ok');
  assert.equal(result.cpKJkgK, null);
  assert.equal(result.densityKgL, null);
  assert.equal(result.propertySource, null);
});

test('end-to-end EG30 L/L calculation uses adapter values and exact energy law', () => {
  const coldInput = {
    fluid: 'EG', glycolPercent: 30,
    inletC: 12, outletC: 7, flowLs: 0.5,
  };
  const hotInput = {
    fluid: 'EG', glycolPercent: 30,
    inletC: 7, outletC: 12, flowLs: 0,
  };
  const coldProperties = resolveLiquidProperties(coldInput, { glycolLookup });
  const hotProperties = resolveLiquidProperties({ ...hotInput, flowLs: 1 }, { glycolLookup });
  assert.equal(coldProperties.valid, true);
  assert.equal(hotProperties.valid, true);

  const coldCapacity = coldInput.flowLs * coldProperties.densityKgL * coldProperties.cpKJkgK * 5;
  const requiredHotCapacity = coldCapacity + 1.2;
  hotInput.flowLs = requiredHotCapacity / (hotProperties.densityKgL * hotProperties.cpKJkgK * 5);

  const result = computeLiquidLiquidWithProperties({
    operatingMode: 'cooling',
    electricalPower_kW: 1.2,
    cold: coldInput,
    hot: hotInput,
  }, { glycolLookup });

  assert.equal(result.valid, true);
  near(result.cold.capacity_kW, 9.60442821129756, 1e-9, 'cold capacity');
  near(result.hot.capacity_kW, result.cold.capacity_kW + 1.2, 1e-9, 'hot capacity');
  near(result.energyResidual_kW, 0, 1e-9, 'residual');
  near(result.balanceDeviation_pct, 0, 1e-9, 'deviation');
  assert.match(result.cold.propertySource, /CoolProp/i);
  assert.match(result.hot.propertySource, /CoolProp/i);
});

test('side-specific property failure blocks result and Save', () => {
  const result = computeLiquidLiquidWithProperties({
    operatingMode: 'cooling',
    electricalPower_kW: 1.2,
    cold: { fluid: 'EG', glycolPercent: 30, inletC: 12, outletC: 7, flowLs: 0.5 },
    hot: { fluid: 'unknown', inletC: 30, outletC: 35, flowLs: 0.5 },
  }, { glycolLookup });
  assert.equal(result.valid, false);
  assert.equal(result.status, 'blocked');
  assert.equal(result.code, 'hot_fluid_invalid');
  assert.equal(result.saveAllowed, false);
  assert.equal(result.balanceDeviation_pct, null);
});

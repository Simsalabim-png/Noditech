'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeLiquidLiquid } = require('../../src/engine/liquidLiquid.js');

const near = (actual, expected, tolerance = 1e-9, label = 'value') => {
  assert.ok(Number.isFinite(actual), `${label} non-finite: ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tol ${tolerance})`);
};

const waterSide = (inletC, outletC, flowLs) => ({
  inletC,
  outletC,
  flowLs,
  densityKgL: 1,
  cpKJkgK: 4.18,
  fluid: 'water',
  glycolPercent: 0,
  propertySource: 'test-reference',
});

const exactCooling = {
  operatingMode: 'cooling',
  electricalPower_kW: 1.2,
  cold: waterSide(12, 7, 0.5),
  hot: waterSide(30, 35, 0.5574162679425837),
};

test('cooling exact balance follows Qhot = Qcold + Pel', () => {
  const r = computeLiquidLiquid(exactCooling);
  assert.equal(r.valid, true);
  assert.equal(r.status, 'valid');
  assert.equal(r.code, 'ok');
  assert.equal(r.operatingMode, 'cooling');
  assert.equal(r.saveAllowed, true);
  near(r.cold.capacity_kW, 10.45, 1e-9, 'Qcold');
  near(r.hot.capacity_kW, 11.65, 1e-9, 'Qhot');
  near(r.expectedHot_kW, 11.65, 1e-9, 'expected hot');
  near(r.energyResidual_kW, 0, 1e-9, 'residual');
  near(r.balanceDeviation_pct, 0, 1e-9, 'deviation');
  near(r.copCooling, 10.45 / 1.2, 1e-9, 'COP cooling');
  near(r.copHeating, 11.65 / 1.2, 1e-9, 'COP heating');
});

test('heating exact balance uses hot side as useful output', () => {
  const r = computeLiquidLiquid({
    operatingMode: 'heating',
    electricalPower_kW: 1.2,
    cold: waterSide(12, 7, 0.5),
    hot: waterSide(30, 35, 0.5574162679425837),
  });
  assert.equal(r.valid, true);
  assert.equal(r.operatingMode, 'heating');
  near(r.expectedCold_kW, 10.45, 1e-9, 'expected cold');
  near(r.energyResidual_kW, 0, 1e-9, 'residual');
  near(r.balanceDeviation_pct, 0, 1e-9, 'deviation');
  near(r.copHeating, 11.65 / 1.2, 1e-9, 'COP heating');
});

test('equal hot and cold capacity is not a false good', () => {
  const r = computeLiquidLiquid({
    operatingMode: 'cooling',
    electricalPower_kW: 1.2,
    cold: waterSide(12, 7, 0.5),
    hot: waterSide(30, 35, 0.5),
  });
  assert.equal(r.valid, true);
  near(r.energyResidual_kW, -1.2, 1e-9, 'residual');
  near(r.balanceDeviation_pct, -10.300429184549357, 1e-9, 'deviation');
  assert.notEqual(r.balanceDeviation_pct, 0);
});

test('EG30 explicit properties reproduce independent baseline', () => {
  const cp = 3.6869969921;
  const rho = 1.0419784157;
  const r = computeLiquidLiquid({
    operatingMode: 'cooling',
    electricalPower_kW: 1.2,
    cold: {
      inletC: 12, outletC: 7, flowLs: 0.5,
      densityKgL: rho, cpKJkgK: cp,
      fluid: 'EG', glycolPercent: 30, propertySource: 'CoolProp 7.2.0',
    },
    hot: {
      inletC: 7, outletC: 12, flowLs: 0.5624711837914753,
      densityKgL: rho, cpKJkgK: cp,
      fluid: 'EG', glycolPercent: 30, propertySource: 'CoolProp 7.2.0',
    },
  });
  assert.equal(r.valid, true);
  near(r.cold.capacity_kW, 9.60442821129756, 1e-9, 'EG Qcold');
  near(r.hot.capacity_kW, 10.804428211297559, 1e-9, 'EG Qhot');
  near(r.energyResidual_kW, 0, 1e-9, 'EG residual');
  near(r.balanceDeviation_pct, 0, 1e-9, 'EG deviation');
  assert.equal(r.cold.propertySource, 'CoolProp 7.2.0');
});

test('doubling flow doubles capacity', () => {
  const a = computeLiquidLiquid(exactCooling);
  const b = computeLiquidLiquid({
    ...exactCooling,
    cold: { ...exactCooling.cold, flowLs: exactCooling.cold.flowLs * 2 },
    hot: { ...exactCooling.hot, flowLs: exactCooling.hot.flowLs * 2 },
    electricalPower_kW: 2.4,
  });
  near(b.cold.capacity_kW, a.cold.capacity_kW * 2, 1e-9, 'cold scaling');
  near(b.hot.capacity_kW, a.hot.capacity_kW * 2, 1e-9, 'hot scaling');
});

test('doubling delta-T doubles side capacity', () => {
  const a = computeLiquidLiquid(exactCooling);
  const b = computeLiquidLiquid({
    operatingMode: 'cooling',
    electricalPower_kW: 2.4,
    cold: waterSide(17, 7, 0.5),
    hot: waterSide(30, 40, 0.5574162679425837),
  });
  near(b.cold.capacity_kW, a.cold.capacity_kW * 2, 1e-9, 'cold delta-T scaling');
  near(b.hot.capacity_kW, a.hot.capacity_kW * 2, 1e-9, 'hot delta-T scaling');
});

test('missing mode blocks all outputs and Save', () => {
  const r = computeLiquidLiquid({ ...exactCooling, operatingMode: null });
  assert.equal(r.valid, false);
  assert.equal(r.status, 'blocked');
  assert.equal(r.code, 'operating_mode_missing');
  assert.equal(r.saveAllowed, false);
  assert.equal(r.cold, null);
  assert.equal(r.balanceDeviation_pct, null);
});

test('reversed or equal temperature directions are blocked', () => {
  const coldReverse = computeLiquidLiquid({ ...exactCooling, cold: waterSide(7, 12, 0.5) });
  assert.equal(coldReverse.code, 'cold_direction_invalid');

  const coldEqual = computeLiquidLiquid({ ...exactCooling, cold: waterSide(7, 7, 0.5) });
  assert.equal(coldEqual.code, 'cold_direction_invalid');

  const hotReverse = computeLiquidLiquid({ ...exactCooling, hot: waterSide(35, 30, 0.5) });
  assert.equal(hotReverse.code, 'hot_direction_invalid');

  const hotEqual = computeLiquidLiquid({ ...exactCooling, hot: waterSide(30, 30, 0.5) });
  assert.equal(hotEqual.code, 'hot_direction_invalid');
});

test('zero, negative and non-finite flow or power are blocked', () => {
  for (const flow of [0, -1, NaN, Infinity]) {
    assert.equal(computeLiquidLiquid({ ...exactCooling, cold: { ...exactCooling.cold, flowLs: flow } }).code, 'cold_flow_invalid');
    assert.equal(computeLiquidLiquid({ ...exactCooling, hot: { ...exactCooling.hot, flowLs: flow } }).code, 'hot_flow_invalid');
  }
  for (const power of [0, -1, NaN, Infinity]) {
    assert.equal(computeLiquidLiquid({ ...exactCooling, electricalPower_kW: power }).code, 'electrical_power_invalid');
  }
});

test('invalid liquid properties and temperatures are blocked', () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.equal(computeLiquidLiquid({ ...exactCooling, cold: { ...exactCooling.cold, densityKgL: value } }).code, 'cold_properties_invalid');
    assert.equal(computeLiquidLiquid({ ...exactCooling, hot: { ...exactCooling.hot, cpKJkgK: value } }).code, 'hot_properties_invalid');
  }
  assert.equal(computeLiquidLiquid({ ...exactCooling, cold: { ...exactCooling.cold, inletC: NaN } }).code, 'cold_temperature_invalid');
  assert.equal(computeLiquidLiquid({ ...exactCooling, hot: { ...exactCooling.hot, outletC: Infinity } }).code, 'hot_temperature_invalid');
});

test('heating blocks physically impossible Qhot - Pel <= 0', () => {
  const r = computeLiquidLiquid({
    operatingMode: 'heating',
    electricalPower_kW: 12,
    cold: waterSide(12, 7, 0.5),
    hot: waterSide(30, 35, 0.5),
  });
  assert.equal(r.valid, false);
  assert.equal(r.code, 'heating_expected_cold_non_positive');
  assert.equal(r.saveAllowed, false);
  assert.equal(r.balanceDeviation_pct, null);
});

test('valid results contain no NaN or Infinity', () => {
  const r = computeLiquidLiquid(exactCooling);
  const values = [
    r.cold.deltaT_K, r.cold.massFlow_kg_s, r.cold.capacity_kW,
    r.hot.deltaT_K, r.hot.massFlow_kg_s, r.hot.capacity_kW,
    r.electricalPower_kW, r.copCooling, r.copHeating,
    r.expectedHot_kW, r.expectedCold_kW,
    r.energyResidual_kW, r.balanceDeviation_pct,
  ];
  for (const value of values) assert.ok(Number.isFinite(value), `non-finite ${value}`);
});

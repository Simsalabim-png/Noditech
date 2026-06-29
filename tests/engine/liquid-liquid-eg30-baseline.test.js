'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const baseline = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'mode-regression-baseline-2026-06-29.json'),
  'utf8'
));

const near = (actual, expected, tolerance = 1e-9, label = 'value') => {
  assert.ok(Number.isFinite(actual), `${label} is not finite: ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tol ${tolerance})`);
};

test('LL-BASE-003 EG30 current output and physical reference', () => {
  const c = baseline.liquidLiquidCases.find((x) => x.id === 'LL-BASE-003');
  assert.ok(c, 'LL-BASE-003 fixture missing');

  const coldCpCurrent = 4.18 - (4.18 - 2.38) * (c.input.cold.glycolPct / 100);
  const coldRhoCurrent = 1 + 0.0012 * c.input.cold.glycolPct;
  const hotCpCurrent = 4.18 - (4.18 - 2.38) * (c.input.hot.glycolPct / 100);
  const hotRhoCurrent = 1 + 0.0012 * c.input.hot.glycolPct;

  const currentQcold = coldCpCurrent * c.input.cold.flowLs * coldRhoCurrent *
    Math.abs(c.input.cold.ToutC - c.input.cold.TinC);
  const currentQhot = hotCpCurrent * c.input.hot.flowLs * hotRhoCurrent *
    Math.abs(c.input.hot.TinC - c.input.hot.ToutC);
  const currentCop = currentQcold / c.input.powerKW;
  const currentBalance = ((currentQhot - currentQcold) / currentQcold) * 100;

  near(currentQcold, c.currentCalculator.QcoldKW, 1e-9, 'current Qcold');
  near(currentQhot, c.currentCalculator.QhotKW, 1e-9, 'current Qhot');
  near(currentCop, c.currentCalculator.copCooling, 1e-9, 'current COP');
  near(currentBalance, c.currentCalculator.displayedBalancePct, 1e-9, 'current displayed balance');
  assert.equal(Math.abs(currentBalance) > 10 ? 'check_measurements' : 'ok', c.currentCalculator.classification);

  const cp = c.physicalReference.cpKJkgK;
  const rho = c.physicalReference.rhoKgL;
  const coldDeltaT = c.input.cold.TinC - c.input.cold.ToutC;
  const hotDeltaT = c.input.hot.ToutC - c.input.hot.TinC;
  const physicalQcold = cp * c.input.cold.flowLs * rho * coldDeltaT;
  const physicalQhot = cp * c.input.hot.flowLs * rho * hotDeltaT;
  const expectedHot = physicalQcold + c.input.powerKW;
  const residual = physicalQhot - physicalQcold - c.input.powerKW;
  const deviation = (residual / expectedHot) * 100;
  const bias = ((currentQcold - physicalQcold) / physicalQcold) * 100;

  near(physicalQcold, c.physicalReference.QcoldKW, 1e-9, 'physical Qcold');
  near(expectedHot, c.physicalReference.expectedHotKW, 1e-9, 'physical expected hot');
  near(residual, c.physicalReference.residualKW, 1e-9, 'physical residual');
  near(deviation, c.physicalReference.deviationPct, 1e-9, 'physical deviation');
  near(bias, c.physicalReference.currentColdCapacityBiasPct, 1e-9, 'current capacity bias');
});

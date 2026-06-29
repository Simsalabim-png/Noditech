'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { computeAirAir } = require('../../src/engine/airAir.js');
const E = require('../engine.js');

const baseline = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'mode-regression-baseline-2026-06-29.json'),
  'utf8'
));

function near(actual, expected, tolerance = 1e-9, label = 'value') {
  assert.ok(Number.isFinite(actual), `${label} is not finite: ${actual}`);
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tol ${tolerance})`
  );
}

test('validated A/A numerical baseline remains frozen', () => {
  const c = baseline.validatedModes.airAir;
  const out = computeAirAir(c.input);

  assert.equal(out.status, c.expected.status);
  assert.equal(out.code, c.expected.code);
  assert.ok(out.result);

  near(out.result.dryAirMassFlowKgS, c.expected.dryAirMassFlowKgS, 1e-9, 'A/A mass flow');
  near(out.result.totalCapacityKW, c.expected.totalCapacityKW, 1e-9, 'A/A total');
  near(out.result.sensibleCapacityKW, c.expected.sensibleCapacityKW, 1e-9, 'A/A sensible');
  near(out.result.latentCapacityKW, c.expected.latentCapacityKW, 1e-9, 'A/A latent');
  near(out.result.shr, c.expected.shr, 1e-9, 'A/A SHR');
  near(out.result.entering.enthalpyKJkg, c.expected.enteringEnthalpyKJkg, 1e-9, 'A/A h entering');
  near(out.result.leaving.enthalpyKJkg, c.expected.leavingEnthalpyKJkg, 1e-9, 'A/A h leaving');
});

test('validated A/L numerical and status baseline remains frozen', () => {
  const c = baseline.validatedModes.airLiquid;
  const sol = E.engcalcAirLiquidSolve(c.input);

  assert.equal(sol.valid, c.expected.valid);
  assert.equal(sol.reason, c.expected.reason);
  assert.equal(sol.mode, c.expected.mode);
  near(sol.Q, c.expected.Q, 1e-9, 'A/L Q');
  near(sol.cop, c.expected.cop, 1e-9, 'A/L COP');
  near(sol.expectedAirSigned, c.expected.expectedAirSigned, 1e-9, 'A/L expected air');

  const ev = E.engcalcAirLiquidEvaluateAir(Object.assign({}, c.input, {
    ambientDB_C: 35,
    ambientRH_pct: 40,
    pAtm: 101325,
    lDBset: false,
    lRHset: false,
    afSet: false,
  }));

  const expected = c.autoAirExpected;
  assert.equal(ev.airStatus, expected.airStatus);
  assert.equal(ev.reasonCode, expected.reasonCode);
  assert.equal(ev.reasonMessage, expected.reasonMessage);
  assert.equal(ev.saveAllowed, expected.saveAllowed);
  assert.equal(ev.qaAvailable, expected.qaAvailable);
  assert.equal(ev.operatingMode, expected.operatingMode);
  near(ev.expectedAirSigned_kW, expected.expectedAirSigned_kW, 1e-9, 'A/L evaluated expected air');
});

function currentProperties(glycolPct) {
  return {
    cpKJkgK: 4.18 - (4.18 - 2.38) * (glycolPct / 100),
    rhoKgL: 1 + 0.0012 * glycolPct,
  };
}

function currentLiquidLiquid(input) {
  const coldProps = currentProperties(input.cold.glycolPct);
  const hotProps = currentProperties(input.hot.glycolPct);
  const QcoldKW = coldProps.cpKJkgK * input.cold.flowLs * coldProps.rhoKgL *
    Math.abs(input.cold.ToutC - input.cold.TinC);
  const QhotKW = hotProps.cpKJkgK * input.hot.flowLs * hotProps.rhoKgL *
    Math.abs(input.hot.TinC - input.hot.ToutC);
  const copCooling = input.powerKW > 0 ? QcoldKW / input.powerKW : 0;
  const displayedBalancePct = QcoldKW > 0 ? ((QhotKW - QcoldKW) / QcoldKW) * 100 : 0;
  return {
    coldProps,
    hotProps,
    QcoldKW,
    QhotKW,
    copCooling,
    displayedBalancePct,
    classification: Math.abs(displayedBalancePct) > 10 ? 'check_measurements' : 'ok',
  };
}

function physicalLiquidLiquid(input, reference) {
  const cpKJkgK = reference.cpKJkgK || 4.18;
  const rhoKgL = reference.rhoKgL || 1;
  const coldDeltaT = input.cold.TinC - input.cold.ToutC;
  const hotDeltaT = input.hot.ToutC - input.hot.TinC;
  const directionValid = coldDeltaT > 0 && hotDeltaT > 0;
  const QcoldKW = cpKJkgK * input.cold.flowLs * rhoKgL * coldDeltaT;
  const QhotKW = cpKJkgK * input.hot.flowLs * rhoKgL * hotDeltaT;
  const expectedHotKW = QcoldKW + input.powerKW;
  const residualKW = QhotKW - QcoldKW - input.powerKW;
  const deviationPct = expectedHotKW !== 0 ? (residualKW / expectedHotKW) * 100 : null;
  return { directionValid, QcoldKW, QhotKW, expectedHotKW, residualKW, deviationPct };
}

test('three dated L/L cases reproduce the current calculator and independent energy reference', () => {
  for (const c of baseline.liquidLiquidCases) {
    const current = currentLiquidLiquid(c.input);
    const expectedCurrent = c.currentCalculator;

    near(current.QcoldKW, expectedCurrent.QcoldKW, 1e-9, `${c.id} current Qcold`);
    near(current.QhotKW, expectedCurrent.QhotKW, 1e-9, `${c.id} current Qhot`);
    near(current.copCooling, expectedCurrent.copCooling, 1e-9, `${c.id} current COP`);
    near(current.displayedBalancePct, expectedCurrent.displayedBalancePct, 1e-9, `${c.id} current balance`);
    assert.equal(current.classification, expectedCurrent.classification, `${c.id} current classification`);

    if (Object.prototype.hasOwnProperty.call(expectedCurrent, 'cpKJkgK')) {
      near(current.coldProps.cpKJkgK, expectedCurrent.cpKJkgK, 1e-9, `${c.id} current cp`);
      near(current.coldProps.rhoKgL, expectedCurrent.rhoKgL, 1e-9, `${c.id} current rho`);
    }

    const reference = physicalLiquidLiquid(c.input, c.physicalReference);
    const expectedReference = c.physicalReference;
    assert.equal(reference.directionValid, expectedReference.directionValid, `${c.id} direction`);
    near(reference.expectedHotKW, expectedReference.expectedHotKW, 1e-9, `${c.id} expected hot`);
    near(reference.residualKW, expectedReference.residualKW, 1e-9, `${c.id} residual`);
    near(reference.deviationPct, expectedReference.deviationPct, 1e-9, `${c.id} physical deviation`);

    if (Object.prototype.hasOwnProperty.call(expectedReference, 'QcoldKW')) {
      near(reference.QcoldKW, expectedReference.QcoldKW, 1e-9, `${c.id} reference Qcold`);
    }
  }

  const [exactWater, falseGood, exactGlycol] = baseline.liquidLiquidCases;
  assert.equal(exactWater.currentCalculator.classification, 'check_measurements');
  assert.equal(exactWater.physicalReference.classification, 'exact');

  assert.equal(falseGood.currentCalculator.classification, 'ok');
  assert.equal(falseGood.physicalReference.classification, 'failed');

  assert.equal(exactGlycol.currentCalculator.classification, 'check_measurements');
  assert.equal(exactGlycol.physicalReference.classification, 'exact');
});

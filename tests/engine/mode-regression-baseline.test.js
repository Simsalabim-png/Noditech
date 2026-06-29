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
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tol ${tolerance})`);
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
  const cold = currentProperties(input.cold.glycolPct);
  const hot = currentProperties(input.hot.glycolPct);
  const QcoldKW = cold.cpKJkgK * input.cold.flowLs * cold.rhoKgL *
    Math.abs(input.cold.ToutC - input.cold.TinC);
  const QhotKW = hot.cpKJkgK * input.hot.flowLs * hot.rhoKgL *
    Math.abs(input.hot.TinC - input.hot.ToutC);
  const copCooling = QcoldKW / input.powerKW;
  const displayedBalancePct = ((QhotKW - QcoldKW) / QcoldKW) * 100;
  return {
    cold,
    QcoldKW,
    QhotKW,
    copCooling,
    displayedBalancePct,
    classification: Math.abs(displayedBalancePct) > 10 ? 'check_measurements' : 'ok',
  };
}

function physicalLiquidLiquid(input, reference) {
  const cpKJkgK = reference.cpKJkgK ?? 4.18;
  const rhoKgL = reference.rhoKgL ?? 1;
  const coldDeltaT = input.cold.TinC - input.cold.ToutC;
  const hotDeltaT = input.hot.ToutC - input.hot.TinC;
  const QcoldKW = cpKJkgK * input.cold.flowLs * rhoKgL * coldDeltaT;
  const QhotKW = cpKJkgK * input.hot.flowLs * rhoKgL * hotDeltaT;
  const expectedHotKW = QcoldKW + input.powerKW;
  const residualKW = QhotKW - QcoldKW - input.powerKW;
  const deviationPct = (residualKW / expectedHotKW) * 100;
  return {
    directionValid: coldDeltaT > 0 && hotDeltaT > 0,
    QcoldKW,
    expectedHotKW,
    residualKW,
    deviationPct,
  };
}

test('three dated L/L cases reproduce current output and independent energy reference', () => {
  for (const c of baseline.liquidLiquidCases) {
    const current = currentLiquidLiquid(c.input);
    near(current.QcoldKW, c.currentCalculator.QcoldKW, 1e-9, `${c.id} current Qcold`);
    near(current.QhotKW, c.currentCalculator.QhotKW, 1e-9, `${c.id} current Qhot`);
    near(current.copCooling, c.currentCalculator.copCooling, 1e-9, `${c.id} current COP`);
    near(current.displayedBalancePct, c.currentCalculator.displayedBalancePct, 1e-9, `${c.id} displayed balance`);
    assert.equal(current.classification, c.currentCalculator.classification, `${c.id} classification`);

    if (c.currentCalculator.cpKJkgK != null) {
      near(current.cold.cpKJkgK, c.currentCalculator.cpKJkgK, 1e-9, `${c.id} current cp`);
      near(current.cold.rhoKgL, c.currentCalculator.rhoKgL, 1e-9, `${c.id} current rho`);
    }

    const physical = physicalLiquidLiquid(c.input, c.physicalReference);
    assert.equal(physical.directionValid, c.physicalReference.directionValid, `${c.id} direction`);
    near(physical.expectedHotKW, c.physicalReference.expectedHotKW, 1e-9, `${c.id} expected hot`);
    near(physical.residualKW, c.physicalReference.residualKW, 1e-9, `${c.id} residual`);
    near(physical.deviationPct, c.physicalReference.deviationPct, 1e-9, `${c.id} deviation`);
    if (c.physicalReference.QcoldKW != null) {
      near(physical.QcoldKW, c.physicalReference.QcoldKW, 1e-9, `${c.id} reference Qcold`);
    }
  }

  assert.equal(baseline.liquidLiquidCases[0].currentCalculator.classification, 'check_measurements');
  assert.equal(baseline.liquidLiquidCases[0].physicalReference.classification, 'exact');
  assert.equal(baseline.liquidLiquidCases[1].currentCalculator.classification, 'ok');
  assert.equal(baseline.liquidLiquidCases[1].physicalReference.classification, 'failed');
  assert.equal(baseline.liquidLiquidCases[2].currentCalculator.classification, 'check_measurements');
  assert.equal(baseline.liquidLiquidCases[2].physicalReference.classification, 'exact');
});

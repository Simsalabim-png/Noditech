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

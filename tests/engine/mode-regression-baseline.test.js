'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { computeAirAir } = require('../../src/engine/airAir.js');

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

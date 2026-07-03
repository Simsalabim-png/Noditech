'use strict';

// M2 — A/L golden numeric fixtures.
// Pins exact Q, COP and expectedAirSigned_kW values for the existing Node-side
// Air/Liquid evaluator path in tests/engine.js. Goldens are generated from the
// unmodified ca91d87 tree by this guarded runner, not hand-computed.

const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

const COOLING_VECTOR = Object.freeze({
  "operatingMode": "cooling",
  "Tin": 12,
  "Tout": 7,
  "flow_Ls": 0.5,
  "rho": 1,
  "cp": 4.18,
  "glyValid": true,
  "useGly": false,
  "glyType": "EG",
  "pw": 1.2,
  "ambientDB_C": 35,
  "ambientRH_pct": 40,
  "pAtm": 101325,
  "pressure": {
    "state": "known",
    "value": 101325,
    "classification": "reference",
    "source": "m2_golden_fixture",
    "reason": null
  }
});
const HEATING_VECTOR = Object.freeze({
  "operatingMode": "heating",
  "Tin": 30,
  "Tout": 35,
  "flow_Ls": 0.5,
  "rho": 1,
  "cp": 4.18,
  "glyValid": true,
  "useGly": false,
  "glyType": "EG",
  "pw": 1.2,
  "ambientDB_C": 25,
  "ambientRH_pct": 40,
  "pAtm": 101325,
  "pressure": {
    "state": "known",
    "value": 101325,
    "classification": "reference",
    "source": "m2_golden_fixture",
    "reason": null
  }
});

const GOLDEN_COOLING = Object.freeze({
  "Q_kW": 10.45,
  "cop": 8.708333333333334,
  "expectedAirSigned_kW": 11.649999999999999
});
const GOLDEN_HEATING = Object.freeze({
  "Q_kW": 10.45,
  "cop": 8.708333333333334,
  "expectedAirSigned_kW": -9.25
});

function assertFiniteDeep(value, path) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), path + ' must be finite, got ' + value);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertFiniteDeep(child, path + '.' + key);
  }
}

function evaluateAirLiquid(vector) {
  const sol = E.engcalcAirLiquidSolve(vector);
  assert.equal(sol.valid, true, vector.operatingMode + ' liquid solve must be valid');
  const ev = E.engcalcAirLiquidEvaluateAir(vector);
  assert.equal(ev.expectedAirSigned_kW, sol.expectedAirSigned, vector.operatingMode + ' expectedAirSigned mapping');
  return {
    Q_kW: sol.Q,
    cop: sol.cop,
    expectedAirSigned_kW: ev.expectedAirSigned_kW,
    liquid: sol,
    air: ev,
  };
}

test('A/L golden fixtures are wired and generated', () => {
  assert.equal(typeof E.engcalcAirLiquidSolve, 'function');
  assert.equal(typeof E.engcalcAirLiquidEvaluateAir, 'function');
  for (const golden of [GOLDEN_COOLING, GOLDEN_HEATING]) {
    assert.ok(Number.isFinite(golden.Q_kW));
    assert.ok(Number.isFinite(golden.cop));
    assert.ok(Number.isFinite(golden.expectedAirSigned_kW));
  }
});

test('A/L cooling golden vector reproduces Q, COP and expectedAirSigned exactly', () => {
  const out = evaluateAirLiquid(COOLING_VECTOR);
  assert.equal(out.Q_kW, GOLDEN_COOLING.Q_kW);
  assert.equal(out.cop, GOLDEN_COOLING.cop);
  assert.equal(out.expectedAirSigned_kW, GOLDEN_COOLING.expectedAirSigned_kW);
});

test('A/L heating golden vector reproduces Q, COP and expectedAirSigned exactly', () => {
  const out = evaluateAirLiquid(HEATING_VECTOR);
  assert.equal(out.Q_kW, GOLDEN_HEATING.Q_kW);
  assert.equal(out.cop, GOLDEN_HEATING.cop);
  assert.equal(out.expectedAirSigned_kW, GOLDEN_HEATING.expectedAirSigned_kW);
});

test('A/L golden vectors contain no NaN or Infinity and are deterministic', () => {
  for (const vector of [COOLING_VECTOR, HEATING_VECTOR]) {
    const first = evaluateAirLiquid(vector);
    const second = evaluateAirLiquid(JSON.parse(JSON.stringify(vector)));
    assert.equal(JSON.stringify(first), JSON.stringify(second), 'deterministic across repeated evaluation');
    assertFiniteDeep(first, 'result');
  }
});

'use strict';

// M2 — A/A golden numeric fixtures.
// Pins the exact numeric outputs of the single-source Air/Air engine
// (src/engine/airAir.js + src/engine/psychrometrics.js) for a public
// AHRI-210/240-style cooling rating vector. Any PR that changes these numbers
// changes Air/Air physics and must fail here, loudly.
//
// Golden values were generated from the UNMODIFIED head tree by evaluating the
// engine itself (not re-derived formulas). Exact equality is intentional: the
// engine is pure IEEE-754 arithmetic with a fixed operation order, so outputs
// are bit-deterministic across platforms.

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAirAir, sideInput } = require('../../src/engine/airAir.js');

// Public reference vector: entering 26.7 °C DB / 19.4 °C WB, leaving
// 12.8 °C DB / 12.2 °C WB, 3400 m³/h referenced to the entering state,
// sea-level pressure 101325 Pa, cooling mode.
const VECTOR = Object.freeze({
  entering: Object.freeze(sideInput('wb', 26.7, null, 19.4)),
  leaving: Object.freeze(sideInput('wb', 12.8, null, 12.2)),
  airflowM3h: 3400,
  airflowReference: 'entering',
  pressurePa: 101325,
  mode: 'cooling',
});

const GOLDEN = Object.freeze({
  status: 'valid',
  code: 'ok',
  warnings: 0,
  dryAirMassFlowKgS: 1.0923394580716477,
  totalCapacityKW: 22.407335493275127,
  sensibleCapacityKW: 15.587265674553969,
  latentCapacityKW: 6.820069818721159,
  shr: 0.6956322709244929,
  entering: Object.freeze({
    rhPct: 50.56433941348404,
    humidityRatio: 0.01107051040812573,
    enthalpyKJkg: 55.097330218610786,
    specificVolumeM3kg: 0.8646070939446896,
  }),
  leaving: Object.freeze({
    rhPct: 93.46179205025952,
    humidityRatio: 0.008597631551679684,
    enthalpyKJkg: 34.584168922733284,
    specificVolumeM3kg: 0.8213061856731307,
  }),
});

function assertFiniteDeep(value, path) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${path} must be finite, got ${value}`);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) assertFiniteDeep(child, `${path}.${key}`);
  }
}

test('A/A golden vector reproduces the pinned capacities, SHR, mass flow and enthalpies exactly', () => {
  const out = computeAirAir(VECTOR);
  assert.equal(out.status, GOLDEN.status);
  assert.equal(out.code, GOLDEN.code);
  assert.equal(out.warnings.length, GOLDEN.warnings);
  const r = out.result;
  assert.equal(r.dryAirMassFlowKgS, GOLDEN.dryAirMassFlowKgS);
  assert.equal(r.totalCapacityKW, GOLDEN.totalCapacityKW);
  assert.equal(r.sensibleCapacityKW, GOLDEN.sensibleCapacityKW);
  assert.equal(r.latentCapacityKW, GOLDEN.latentCapacityKW);
  assert.equal(r.shr, GOLDEN.shr);
  assert.equal(r.entering.rhPct, GOLDEN.entering.rhPct);
  assert.equal(r.entering.humidityRatio, GOLDEN.entering.humidityRatio);
  assert.equal(r.entering.enthalpyKJkg, GOLDEN.entering.enthalpyKJkg);
  assert.equal(r.entering.specificVolumeM3kg, GOLDEN.entering.specificVolumeM3kg);
  assert.equal(r.leaving.rhPct, GOLDEN.leaving.rhPct);
  assert.equal(r.leaving.humidityRatio, GOLDEN.leaving.humidityRatio);
  assert.equal(r.leaving.enthalpyKJkg, GOLDEN.leaving.enthalpyKJkg);
  assert.equal(r.leaving.specificVolumeM3kg, GOLDEN.leaving.specificVolumeM3kg);
  // measured inputs echoed exactly
  assert.equal(r.entering.dbC, 26.7);
  assert.equal(r.entering.wbC, 19.4);
  assert.equal(r.leaving.dbC, 12.8);
  assert.equal(r.leaving.wbC, 12.2);
  // internal consistency of the pinned values
  assert.equal(r.sensibleCapacityKW + r.latentCapacityKW, r.totalCapacityKW);
});

test('A/A golden vector contains no NaN or Infinity anywhere', () => {
  const out = computeAirAir(VECTOR);
  assertFiniteDeep(out.result, 'result');
});

test('A/A golden vector is deterministic across repeated evaluation', () => {
  const first = computeAirAir(VECTOR);
  const second = computeAirAir(JSON.parse(JSON.stringify(VECTOR)));
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

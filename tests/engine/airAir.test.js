'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const psy = require('../../src/engine/psychrometrics.js');
const { computeAirAir, sideInput } = require('../../src/engine/airAir.js');
const { evaluateCase, publicId, publicLine } = require('../../src/engine/airAirEvaluator.js');

const P = 101325;
const close = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} !~= ${b}`);

// A standard valid cooling case reused by several tests.
const VALID = {
  entering: { inputMethod: 'rh', dbC: 26.7, rhPct: 50 },
  leaving: { inputMethod: 'rh', dbC: 12, rhPct: 90 },
  airflowM3h: 2000,
  airflowReference: 'leaving',
  pressurePa: P,
};

// sideInput: only the selected field is sent (no stale rhPct in wb, no stale wbC in rh)
test('sideInput sends only the selected field', () => {
  const wb = sideInput('wb', 26.7, 50, 19);
  assert.equal(Object.prototype.hasOwnProperty.call(wb, 'rhPct'), false, 'wb must not carry rhPct');
  assert.equal(wb.inputMethod, 'wb');
  assert.equal(wb.wbC, 19);
  const rh = sideInput('rh', 26.7, 50, 19);
  assert.equal(Object.prototype.hasOwnProperty.call(rh, 'wbC'), false, 'rh must not carry wbC');
  assert.equal(rh.inputMethod, 'rh');
  assert.equal(rh.rhPct, 50);
  // sideInput output causes no state_input_inconsistent warning
  const r = computeAirAir({ entering: sideInput('wb', 26.7, 50, 19), leaving: sideInput('rh', 12, 90, undefined), airflowM3h: 2000, airflowReference: 'leaving', pressurePa: 101325 });
  assert.equal((r.warnings || []).some((w) => w.code === 'state_input_inconsistent'), false);
});

// regression: DB/WB derived RH must be physical (not the old spurious 0.00 %)
test('DB 26/WB 20 and DB 14/WB 12 at 101500 Pa give physical RH (not 0)', () => {
  const e = psy.stateFromDBWB(26, 20, 101325);
  const l = psy.stateFromDBWB(14, 12, 101325);
  assert.equal(e.ok, true);
  assert.ok(e.rhPct > 0 && e.rhPct <= 100, `entering RH ${e.rhPct}`);
  assert.ok(e.rhPct > 40 && e.rhPct < 80, `entering RH plausible ${e.rhPct}`);
  assert.equal(l.ok, true);
  assert.ok(l.rhPct > 0 && l.rhPct <= 100, `leaving RH ${l.rhPct}`);
});

// regression: invalid/non-finite pressure must FAIL, never collapse to ~0 % RH
test('non-finite or non-positive pressure fails (no spurious 0% RH)', () => {
  // The real UI bug path passes NaN (pressure not set -> engcalcAppPressurePa = NaN).
  assert.equal(psy.rhFromWetBulb(26, 20, NaN).ok, false);
  assert.equal(psy.stateFromDBWB(26, 20, NaN).ok, false);
  assert.equal(psy.stateFromDBWB(26, 20, 0).ok, false);
  assert.equal(psy.stateFromDBWB(26, 20, -5).ok, false);
  // (undefined intentionally falls through to the 101500 Pa default — not the bug path)
});

// regression: choosing the airflow reference releases the result when inputs are valid
test('airflow reference releases a valid result; total matches the public case', () => {
  const blocked = computeAirAir({ entering: sideInput('wb', 26, undefined, 20), leaving: sideInput('wb', 14, undefined, 12), airflowM3h: 600, pressurePa: 101500 });
  assert.equal(blocked.code, 'airflow_reference_missing');
  const ok = computeAirAir({ entering: sideInput('wb', 26, undefined, 20), leaving: sideInput('wb', 14, undefined, 12), airflowM3h: 600, airflowReference: 'leaving', pressurePa: 101500 });
  assert.ok(ok.status === 'valid' || ok.status === 'warning');
  assert.equal(ok.code, 'ok');
  assert.ok(Math.abs(ok.result.totalCapacityKW - 4.678553111004039) < 1e-6);
});

// 1. DB+RH and DB+WB describing the same state => same enthalpy and humidity ratio.
test('DB+RH and DB+WB for the same state agree on enthalpy and humidity ratio', () => {
  const db = 26.7, rh = 50;
  const wb = psy.wBulb(db, rh, P);
  const a = psy.stateFromDBRH(db, rh, P);
  const b = psy.stateFromDBWB(db, wb, P);
  assert.equal(b.ok, true);
  close(a.enthalpyKJkg, b.enthalpyKJkg, 1e-3);
  close(a.humidityRatio, b.humidityRatio, 1e-5);
});

// public case identity: stdout uses sequential ids, never the private id
test('public id is sequential and never echoes the private case id', () => {
  assert.equal(publicId(0), 'case-001');
  assert.equal(publicId(11), 'case-012');
  const line = publicLine(0, { verdict: 'VALID', id: 'LAB-SECRET-7788' });
  assert.equal(line, 'case-001\tVALID');
  assert.equal(line.includes('LAB-SECRET-7788'), false);
});

// 2. Same input => identical result from the engine and from the evaluator (single source).
test('engine result and evaluator use the same engine (identical numbers)', () => {
  const direct = computeAirAir(VALID);
  const viaEval = evaluateCase({ id: 'X', input: VALID });
  assert.equal(viaEval.calculated.totalCapacityKW, direct.result.totalCapacityKW);
  assert.equal(viaEval.calculated.sensibleCapacityKW, direct.result.sensibleCapacityKW);
  assert.equal(viaEval.calculated.latentCapacityKW, direct.result.latentCapacityKW);
  // determinism
  assert.deepEqual(computeAirAir(VALID).result, direct.result);
});

// 3. Entering- vs leaving-referenced airflow uses the correct specific volume.
test('airflow reference selects the correct specific volume', () => {
  const E = psy.stateFromDBRH(26.7, 50, P);
  const L = psy.stateFromDBRH(12, 90, P);
  const afs = 2000 / 3600;

  const refLeaving = computeAirAir(Object.assign({}, VALID, { airflowReference: 'leaving' }));
  const refEntering = computeAirAir(Object.assign({}, VALID, { airflowReference: 'entering' }));

  close(refLeaving.result.dryAirMassFlowKgS, afs / L.specificVolumeM3kg, 1e-9);
  close(refEntering.result.dryAirMassFlowKgS, afs / E.specificVolumeM3kg, 1e-9);
  assert.notEqual(refLeaving.result.dryAirMassFlowKgS, refEntering.result.dryAirMassFlowKgS);
});

// 4. Q_total ≈ Q_sensible + Q_latent.
test('total capacity equals sensible + latent', () => {
  const r = computeAirAir(VALID).result;
  close(r.totalCapacityKW, r.sensibleCapacityKW + r.latentCapacityKW, 1e-9);
});

// 5. WB > DB is blocked.
test('wet-bulb above dry-bulb is blocked', () => {
  const r = computeAirAir(Object.assign({}, VALID, { entering: { inputMethod: 'wb', dbC: 20, wbC: 25 } }));
  assert.equal(r.status, 'blocked');
  assert.equal(r.code, 'wb_gt_db');
});

// 6. leaving enthalpy >= entering enthalpy in cooling mode is blocked.
test('leaving enthalpy >= entering enthalpy (cooling) is blocked', () => {
  const r = computeAirAir({
    entering: { inputMethod: 'rh', dbC: 20, rhPct: 50 },
    leaving: { inputMethod: 'rh', dbC: 30, rhPct: 50 }, // warmer => higher enthalpy
    airflowM3h: 2000, airflowReference: 'leaving', pressurePa: P,
  });
  assert.equal(r.status, 'blocked');
  assert.equal(r.code, 'leaving_enthalpy_ge_entering');
});

// inputMethod rules
test('missing or unknown inputMethod is blocked (method never guessed)', () => {
  const noMethod = computeAirAir(Object.assign({}, VALID, { entering: { dbC: 26.7, rhPct: 50 } }));
  assert.equal(noMethod.status, 'blocked');
  assert.equal(noMethod.code, 'state_input_method_invalid');
  const bad = computeAirAir(Object.assign({}, VALID, { entering: { inputMethod: 'dewpoint', dbC: 26.7, rhPct: 50 } }));
  assert.equal(bad.code, 'state_input_method_invalid');
});

test('inputMethod rh requires rhPct; wb requires wbC', () => {
  const rhMissing = computeAirAir(Object.assign({}, VALID, { entering: { inputMethod: 'rh', dbC: 26.7 } }));
  assert.equal(rhMissing.code, 'rh_missing');
  const wbMissing = computeAirAir(Object.assign({}, VALID, { entering: { inputMethod: 'wb', dbC: 26.7 } }));
  assert.equal(wbMissing.code, 'wb_missing');
});

test('non-selected field is ignored but cross-checked; inconsistency warns', () => {
  // consistent extra wbC -> no inconsistency warning
  const wbConsistent = psy.wBulb(26.7, 50, P);
  const ok = computeAirAir(Object.assign({}, VALID, { entering: { inputMethod: 'rh', dbC: 26.7, rhPct: 50, wbC: wbConsistent } }));
  assert.ok(!ok.warnings.some((w) => w.code === 'state_input_inconsistent'));
  // inconsistent extra wbC (off by >0.2C) -> warning, still computes
  const warn = computeAirAir(Object.assign({}, VALID, { entering: { inputMethod: 'rh', dbC: 26.7, rhPct: 50, wbC: wbConsistent + 1.0 } }));
  assert.ok(warn.warnings.some((w) => w.code === 'state_input_inconsistent'));
  assert.notEqual(warn.status, 'blocked');
});

// 7. No NaN / Infinity / empty valid results.
test('valid case produces only finite numbers and a populated result', () => {
  const r = computeAirAir(VALID);
  assert.ok(r.status === 'valid' || r.status === 'warning');
  assert.ok(r.result);
  const nums = [
    r.result.dryAirMassFlowKgS, r.result.totalCapacityKW, r.result.sensibleCapacityKW,
    r.result.latentCapacityKW, r.result.shr,
    r.result.entering.enthalpyKJkg, r.result.leaving.enthalpyKJkg,
  ];
  for (const n of nums) assert.ok(Number.isFinite(n), `non-finite: ${n}`);
  assert.ok(r.result.totalCapacityKW >= 0);
});

// extra blocked/invalid guards
test('invalid pressure and airflow are blocked', () => {
  assert.equal(computeAirAir(Object.assign({}, VALID, { pressurePa: 0 })).code, 'pressure_non_positive');
  assert.equal(computeAirAir(Object.assign({}, VALID, { pressurePa: 200000 })).code, 'pressure_above_range');
  assert.equal(computeAirAir(Object.assign({}, VALID, { airflowM3h: 0 })).code, 'airflow_invalid');
  assert.equal(computeAirAir(Object.assign({}, VALID, { airflowReference: undefined })).code, 'airflow_reference_missing');
});

// DB+WB path produces a valid result equal to its DB+RH equivalent
test('DB+WB entering produces a result consistent with the equivalent DB+RH', () => {
  const wb = psy.wBulb(26.7, 50, P);
  const viaWB = computeAirAir(Object.assign({}, VALID, { entering: { inputMethod: 'wb', dbC: 26.7, wbC: wb } }));
  const viaRH = computeAirAir(VALID);
  assert.equal(viaWB.status !== 'blocked', true);
  close(viaWB.result.totalCapacityKW, viaRH.result.totalCapacityKW, 1e-2);
});

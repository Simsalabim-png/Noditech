'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeLiquidLiquid } = require('../../src/engine/liquidLiquid.js');
const {
  createLiquidLiquidContract,
  serializeLiquidLiquidCsv,
  serializeLiquidLiquidJson,
} = require('../../src/engine/liquidLiquidContract.js');
const {
  OVERRIDE_STAMP_TITLE,
  OVERRIDE_STAMP_QUALIFIER,
  createBalanceOverride,
  fingerprintInputs,
} = require('../../src/domain/balanceOverride.js');
const { EXAMPLE_EXPORT_NOTE } = require('../../src/domain/measurementConfirmation.js');

function waterSide(inletC, outletC, flowLs) {
  return {
    inletC,
    outletC,
    flowLs,
    densityKgL: 1,
    cpKJkgK: 4.18,
    fluid: 'WATER',
    glycolPercent: 0,
    propertySource: 'field-safety-test-water',
    freezePointC: 0,
    meanTemperatureC: (inletC + outletC) / 2,
  };
}

function failedResult() {
  // Valid but failed: Q_hot is larger than Q_cold + P_el, so the engine can
  // compute a thermodynamically possible result while the balance still fails.
  const result = computeLiquidLiquid({
    operatingMode: 'cooling',
    electricalPower_kW: 1.2,
    cold: waterSide(12, 7, 0.5),
    hot: waterSide(30, 35, 0.8),
  });
  assert.equal(result.valid, true);
  assert.equal(result.status, 'valid');
  assert.ok(Math.abs(result.balanceDeviation_pct) > 10, `expected failed balance, got ${result.balanceDeviation_pct}`);
  return result;
}

test('L/L contract carries failed-balance override in record json csv and print projections', () => {
  const inputsFingerprint = fingerprintInputs({ cTi: 12, cTo: 7, cF: 0.5, hTi: 30, hTo: 35, hF: 0.8, pw: 1.2 });
  const override = createBalanceOverride({
    reasonId: 'liquid-primary',
    trustedSide: 'liquid',
    deviationPct: failedResult().balanceDeviation_pct,
    inputsFingerprint,
    nowIso: '2026-07-02T10:42:00Z',
  });
  const contract = createLiquidLiquidContract(failedResult(), {
    recordId: 'LL-FS-001',
    measuredAt: '2026-07-02T10:42:00Z',
  }, { balanceOverride: override });

  assert.equal(contract.status, 'failed');
  assert.equal(contract.record.balanceValidation, 'failed-override');
  assert.equal(contract.json.balanceValidation, 'failed-override');
  assert.equal(contract.print.balanceValidation, 'failed-override');
  assert.equal(contract.record.balanceOverride.title, OVERRIDE_STAMP_TITLE);
  assert.equal(contract.print.balanceOverride.qualifier, OVERRIDE_STAMP_QUALIFIER);

  const json = serializeLiquidLiquidJson(contract);
  assert.match(json, /failed-override/);
  assert.match(json, /BALANCE VALIDATION: FAILED/);

  const csv = serializeLiquidLiquidCsv(contract);
  assert.match(csv, /Balance Validation/);
  assert.match(csv, /failed-override/);
  assert.match(csv, /Liquid side is the primary trusted measurement/);
});

test('canonical reasonId and reasonLabel survive into every export projection', () => {
  const override = createBalanceOverride({
    reasonId: 'liquid-primary',
    trustedSide: 'liquid',
    deviationPct: failedResult().balanceDeviation_pct,
    inputsFingerprint: 'fp-canonical',
    nowIso: '2026-07-02T10:42:00Z',
  });
  const contract = createLiquidLiquidContract(failedResult(), {}, { balanceOverride: override });

  assert.equal(contract.record.balanceOverride.reasonId, 'liquid-primary');
  assert.equal(contract.json.balanceOverride.reasonId, 'liquid-primary');
  assert.equal(contract.print.balanceOverride.reasonId, 'liquid-primary');
  assert.equal(contract.record.balanceOverride.reasonLabel, 'Liquid side is the primary trusted measurement');
  assert.equal(contract.print.balanceOverride.reasonLabel, 'Liquid side is the primary trusted measurement');
  assert.notEqual(contract.record.balanceOverride.reasonId, 'other');

  const json = serializeLiquidLiquidJson(contract);
  assert.match(json, /liquid-primary/);

  const airOverride = createBalanceOverride({
    reasonId: 'air-primary',
    trustedSide: 'air',
    deviationPct: failedResult().balanceDeviation_pct,
    inputsFingerprint: 'fp-air',
  });
  const airContract = createLiquidLiquidContract(failedResult(), {}, { balanceOverride: airOverride });
  assert.equal(airContract.record.balanceOverride.reasonId, 'air-primary');
  assert.notEqual(airContract.record.balanceOverride.reasonId, 'other');
  assert.match(serializeLiquidLiquidCsv(airContract), /Air side is the primary trusted measurement/);
});

test('L/L contract carries example measurement confirmation without changing numbers', () => {
  const baseline = createLiquidLiquidContract(failedResult(), {}, {});
  const example = createLiquidLiquidContract(failedResult(), {}, { measurementConfirmation: 'example' });

  assert.equal(example.record.measurementConfirmation, 'example');
  assert.equal(example.record.exampleNote, EXAMPLE_EXPORT_NOTE);
  assert.equal(example.json.measurementConfirmation, 'example');
  assert.equal(example.print.measurementConfirmation, 'example');
  assert.equal(example.record.usefulCapacity_kW, baseline.record.usefulCapacity_kW);
  assert.equal(example.record.cop, baseline.record.cop);
  assert.equal(example.record.balanceDeviation_pct, baseline.record.balanceDeviation_pct);
  assert.match(serializeLiquidLiquidJson(example), /unmodified example values/);
  assert.match(serializeLiquidLiquidCsv(example), /Measurement Confirmation/);
});

test('measurement confirmation fails safe for absent or unknown options', () => {
  const noOptions = createLiquidLiquidContract(failedResult(), {}, undefined);
  assert.notEqual(noOptions.record.measurementConfirmation, 'confirmed');
  assert.equal(noOptions.record.measurementConfirmation, null);
  assert.equal(noOptions.record.exampleNote, null);
  assert.equal(noOptions.json.measurementConfirmation, null);
  assert.equal(noOptions.print.measurementConfirmation, null);

  const emptyOptions = createLiquidLiquidContract(failedResult(), {}, {});
  assert.equal(emptyOptions.record.measurementConfirmation, null);
  assert.notEqual(emptyOptions.json.measurementConfirmation, 'confirmed');

  const unknown = createLiquidLiquidContract(failedResult(), {}, { measurementConfirmation: 'banana' });
  assert.equal(unknown.record.measurementConfirmation, null);
  assert.equal(unknown.json.measurementConfirmation, null);
  assert.equal(unknown.print.measurementConfirmation, null);
  assert.equal(unknown.record.exampleNote, null);

  const confirmed = createLiquidLiquidContract(failedResult(), {}, { measurementConfirmation: 'confirmed' });
  assert.equal(confirmed.record.measurementConfirmation, 'confirmed');
  assert.equal(confirmed.json.measurementConfirmation, 'confirmed');
  assert.equal(confirmed.print.measurementConfirmation, 'confirmed');
  assert.equal(confirmed.record.exampleNote, null);

  // the CSV projection follows the same normalization
  assert.match(serializeLiquidLiquidCsv(confirmed), /Measurement Confirmation/);
  assert.doesNotMatch(serializeLiquidLiquidCsv(noOptions), /\bconfirmed\b/);
  assert.doesNotMatch(serializeLiquidLiquidCsv(unknown), /\bbanana\b/);

  // numeric outputs are identical across all confirmation states
  assert.equal(noOptions.record.usefulCapacity_kW, confirmed.record.usefulCapacity_kW);
  assert.equal(unknown.record.cop, confirmed.record.cop);
  assert.equal(noOptions.record.balanceDeviation_pct, unknown.record.balanceDeviation_pct);
  assert.equal(emptyOptions.record.energyResidual_kW, confirmed.record.energyResidual_kW);
});

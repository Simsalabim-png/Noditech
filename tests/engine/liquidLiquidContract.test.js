'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeLiquidLiquid } = require('../../src/engine/liquidLiquid.js');
const {
  CONTRACT_VERSION,
  classifyBalance,
  createLiquidLiquidContract,
  serializeLiquidLiquidCsv,
  serializeLiquidLiquidJson,
} = require('../../src/engine/liquidLiquidContract.js');

const near = (actual, expected, tolerance = 1e-9, label = 'value') => {
  assert.ok(Number.isFinite(actual), `${label} non-finite: ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} != ${expected} (tol ${tolerance})`);
};

function waterSide(inletC, outletC, flowLs) {
  return {
    inletC,
    outletC,
    flowLs,
    densityKgL: 1,
    cpKJkgK: 4.18,
    fluid: 'WATER',
    glycolPercent: 0,
    propertySource: 'test-water-source',
    freezePointC: 0,
    meanTemperatureC: (inletC + outletC) / 2,
  };
}

function exactResult(mode = 'cooling') {
  return computeLiquidLiquid({
    operatingMode: mode,
    electricalPower_kW: 1.2,
    cold: waterSide(12, 7, 0.5),
    hot: waterSide(30, 35, 0.5574162679425837),
  });
}

const metadata = {
  recordId: 'LL-2026-06-29-001',
  measuredAt: '2026-06-29T12:00:00Z',
  job: 'Baseline plant',
  unit: 'HP-01',
  reference: 'Commissioning point A',
};

test('balance classification has deterministic boundaries', () => {
  assert.equal(classifyBalance(0), 'good');
  assert.equal(classifyBalance(3), 'good');
  assert.equal(classifyBalance(-3.0001), 'warning');
  assert.equal(classifyBalance(10), 'warning');
  assert.equal(classifyBalance(-10.0001), 'failed');
  assert.equal(classifyBalance(NaN), 'blocked');
});

test('cooling contract uses cold capacity and cooling COP as useful values', () => {
  const result = exactResult('cooling');
  const contract = createLiquidLiquidContract(result, metadata);

  assert.equal(contract.valid, true);
  assert.equal(contract.schemaVersion, CONTRACT_VERSION);
  assert.equal(contract.status, 'good');
  assert.equal(contract.saveAllowed, true);
  assert.equal(contract.operatingMode, 'cooling');
  assert.equal(contract.ui.resultVisible, true);
  assert.equal(contract.ui.statusLabel, 'OK');
  assert.equal(contract.ui.showPositive, true);
  near(contract.ui.usefulCapacity_kW, result.cold.capacity_kW, 1e-9, 'UI useful capacity');
  near(contract.ui.cop, result.copCooling, 1e-9, 'UI COP');
  near(contract.record.usefulCapacity_kW, result.cold.capacity_kW, 1e-9, 'record useful capacity');
  near(contract.record.cop, result.copCooling, 1e-9, 'record COP');
});

test('heating contract uses hot capacity and heating COP as useful values', () => {
  const result = exactResult('heating');
  const contract = createLiquidLiquidContract(result, metadata);
  assert.equal(contract.valid, true);
  assert.equal(contract.operatingMode, 'heating');
  near(contract.ui.usefulCapacity_kW, result.hot.capacity_kW, 1e-9, 'heating useful capacity');
  near(contract.ui.cop, result.copHeating, 1e-9, 'heating COP');
  near(contract.record.usefulCapacity_kW, result.hot.capacity_kW, 1e-9, 'record heating capacity');
});

test('record JSON CSV print and UI are projections of the same numbers', () => {
  const result = exactResult('cooling');
  const contract = createLiquidLiquidContract(result, metadata);

  const values = [
    contract.ui.usefulCapacity_kW,
    contract.record.usefulCapacity_kW,
    contract.json.record.usefulCapacity_kW,
    contract.print.usefulCapacity_kW,
  ];
  for (const value of values) near(value, result.cold.capacity_kW, 1e-9, 'useful capacity identity');

  near(contract.ui.cop, contract.record.cop, 1e-12, 'COP UI/record');
  near(contract.record.cop, contract.json.record.cop, 1e-12, 'COP record/JSON');
  near(contract.json.record.cop, contract.print.cop, 1e-12, 'COP JSON/print');
  near(contract.record.energyResidual_kW, contract.print.energyResidual_kW, 1e-12, 'residual identity');
  near(contract.record.balanceDeviation_pct, contract.ui.balanceDeviation_pct, 1e-12, 'balance identity');

  const capacityColumn = contract.csv.headers.indexOf('Useful Capacity kW');
  const copColumn = contract.csv.headers.indexOf('COP');
  const residualColumn = contract.csv.headers.indexOf('Energy Residual kW');
  assert.ok(capacityColumn >= 0 && copColumn >= 0 && residualColumn >= 0);
  near(contract.csv.row[capacityColumn], contract.record.usefulCapacity_kW, 1e-12, 'CSV capacity');
  near(contract.csv.row[copColumn], contract.record.cop, 1e-12, 'CSV COP');
  near(contract.csv.row[residualColumn], contract.record.energyResidual_kW, 1e-12, 'CSV residual');
});

test('property provenance survives record JSON CSV and print', () => {
  const contract = createLiquidLiquidContract(exactResult(), metadata);
  assert.equal(contract.record.cold.propertySource, 'test-water-source');
  assert.equal(contract.record.hot.propertySource, 'test-water-source');
  assert.equal(contract.json.record.cold.propertySource, 'test-water-source');
  assert.equal(contract.print.propertyProvenance.cold, 'test-water-source');
  assert.equal(contract.print.propertyProvenance.hot, 'test-water-source');

  const coldSourceColumn = contract.csv.headers.indexOf('Cold Property Source');
  const hotSourceColumn = contract.csv.headers.indexOf('Hot Property Source');
  assert.equal(contract.csv.row[coldSourceColumn], 'test-water-source');
  assert.equal(contract.csv.row[hotSourceColumn], 'test-water-source');
});

test('metadata is preserved without invented timestamps or identifiers', () => {
  const full = createLiquidLiquidContract(exactResult(), metadata);
  assert.equal(full.record.recordId, metadata.recordId);
  assert.equal(full.record.measuredAt, metadata.measuredAt);
  assert.equal(full.record.job, metadata.job);
  assert.equal(full.record.unit, metadata.unit);
  assert.equal(full.record.reference, metadata.reference);

  const empty = createLiquidLiquidContract(exactResult(), {});
  assert.equal(empty.record.recordId, null);
  assert.equal(empty.record.measuredAt, null);
  assert.equal(empty.record.job, null);
  assert.equal(empty.record.unit, null);
  assert.equal(empty.record.reference, null);
});

test('blocked engine result cannot produce Save JSON CSV or print payloads', () => {
  const blockedResult = computeLiquidLiquid({
    operatingMode: 'cooling',
    electricalPower_kW: 1.2,
    cold: waterSide(7, 12, 0.5),
    hot: waterSide(30, 35, 0.5),
  });
  assert.equal(blockedResult.valid, false);

  const contract = createLiquidLiquidContract(blockedResult, metadata);
  assert.equal(contract.valid, false);
  assert.equal(contract.status, 'blocked');
  assert.equal(contract.saveAllowed, false);
  assert.equal(contract.ui.resultVisible, false);
  assert.equal(contract.ui.showPositive, false);
  assert.equal(contract.record, null);
  assert.equal(contract.json, null);
  assert.equal(contract.csv, null);
  assert.equal(contract.print, null);
  assert.equal(serializeLiquidLiquidJson(contract), null);
  assert.equal(serializeLiquidLiquidCsv(contract), null);
});

test('non-finite valid-looking result is blocked by the contract boundary', () => {
  const result = exactResult();
  result.balanceDeviation_pct = NaN;
  const contract = createLiquidLiquidContract(result, metadata);
  assert.equal(contract.valid, false);
  assert.equal(contract.code, 'contract_non_finite');
  assert.equal(contract.saveAllowed, false);
  assert.equal(contract.record, null);
});

test('warning and failed balances never show positive status', () => {
  const warningResult = exactResult();
  warningResult.energyResidual_kW = 0.6;
  warningResult.balanceDeviation_pct = 5;
  const warning = createLiquidLiquidContract(warningResult, metadata);
  assert.equal(warning.status, 'warning');
  assert.equal(warning.ui.statusLabel, 'CHECK');
  assert.equal(warning.ui.showPositive, false);

  const failedResult = exactResult();
  failedResult.energyResidual_kW = -2;
  failedResult.balanceDeviation_pct = -15;
  const failed = createLiquidLiquidContract(failedResult, metadata);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.ui.statusLabel, 'FAILED');
  assert.equal(failed.ui.showPositive, false);
});

test('custom thresholds affect only classification, not numerical values', () => {
  const result = exactResult();
  result.energyResidual_kW = 0.5;
  result.balanceDeviation_pct = 4;
  const defaultContract = createLiquidLiquidContract(result, metadata);
  const customContract = createLiquidLiquidContract(result, metadata, {
    thresholds: { goodLimitPct: 5, warnLimitPct: 12 },
  });
  assert.equal(defaultContract.status, 'warning');
  assert.equal(customContract.status, 'good');
  near(defaultContract.record.balanceDeviation_pct, customContract.record.balanceDeviation_pct, 1e-12, 'unchanged balance');
  near(defaultContract.record.energyResidual_kW, customContract.record.energyResidual_kW, 1e-12, 'unchanged residual');
});

test('JSON serializer is deterministic and round-trips the record', () => {
  const contract = createLiquidLiquidContract(exactResult(), metadata);
  const first = serializeLiquidLiquidJson(contract);
  const second = serializeLiquidLiquidJson(contract);
  assert.equal(first, second);
  const parsed = JSON.parse(first);
  assert.deepEqual(parsed, contract.json);
  assert.deepEqual(parsed.record, contract.record);
});

test('CSV serializer escapes commas and quotes and contains one data row', () => {
  const contract = createLiquidLiquidContract(exactResult(), {
    ...metadata,
    job: 'Plant, west',
    reference: 'Point "A"',
  });
  const csv = serializeLiquidLiquidCsv(contract);
  assert.equal(typeof csv, 'string');
  assert.equal(csv.split('\n').length, 2);
  assert.match(csv, /"Plant, west"/);
  assert.match(csv, /"Point ""A"""/);
  assert.match(csv, /"Liquid\/Liquid"/);
});

test('valid contract contains no NaN or Infinity in serialized outputs', () => {
  const contract = createLiquidLiquidContract(exactResult(), metadata);
  const json = serializeLiquidLiquidJson(contract);
  const csv = serializeLiquidLiquidCsv(contract);
  assert.doesNotMatch(json, /NaN|Infinity/);
  assert.doesNotMatch(csv, /NaN|Infinity/);
});

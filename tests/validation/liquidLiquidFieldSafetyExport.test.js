'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeLiquidLiquid } = require('../../src/engine/liquidLiquid.js');
const {
  createLiquidLiquidContract,
  csvCell,
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

// Quote-aware CSV line parser (RFC 4180) for structural assertions.
function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { cells.push(cell); cell = ''; }
    else cell += ch;
  }
  cells.push(cell);
  return cells;
}

function overrideWithReason(reasonText) {
  return createBalanceOverride({
    reasonId: 'other',
    reasonText,
    trustedSide: 'liquid',
    deviationPct: failedResult().balanceDeviation_pct,
    inputsFingerprint: 'fp-hostile',
    nowIso: '2026-07-03T10:00:00Z',
  });
}

function csvColumns(contract) {
  const csv = serializeLiquidLiquidCsv(contract);
  const lines = csv.split('\n');
  return { csv, lines, headers: parseCsvLine(lines[0]), row: parseCsvLine(lines[1]) };
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

// ---------------------------------------------------------------------------
// M4 — CSV escaping / formula-injection hardening
// ---------------------------------------------------------------------------

test('csvCell neutralizes formula triggers in text and never in numbers', () => {
  // formula triggers, incl. whitespace/control variants that spreadsheets trim
  assert.equal(csvCell('=HYPERLINK("http://x","y")'), '"\'=HYPERLINK(""http://x"",""y"")"');
  assert.equal(csvCell('+SUM(1)'), '"\'+SUM(1)"');
  assert.equal(csvCell('-1+1'), '"\'-1+1"');
  assert.equal(csvCell('@cmd'), '"\'@cmd"');
  assert.equal(csvCell('\t=1'), '"\'\t=1"');
  assert.equal(csvCell('  =1'), '"\'  =1"');
  assert.equal(csvCell('  +A1'), '"\'  +A1"');
  // leading tab / CR without a trigger character still neutralized (CR flattened)
  assert.equal(csvCell('\tcmd'), '"\'\tcmd"');
  assert.equal(csvCell('\rrun'), '"\' run"');
  // benign text untouched
  assert.equal(csvCell('Liquid side is the primary trusted measurement'), '"Liquid side is the primary trusted measurement"');
  assert.equal(csvCell('a=b inside'), '"a=b inside"');
  // numbers: bare (quoted, no apostrophe) — negatives stay parseable numbers
  assert.equal(csvCell(-15.5), '"-15.5"');
  assert.equal(csvCell(0.5), '"0.5"');
  // null/undefined behavior unchanged
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
  // RFC-4180: inner quotes doubled, CR/LF flattened to one physical line
  assert.equal(csvCell('say "hi", ok\nnext'), '"say ""hi"", ok next"');
});

test('hostile override reason text stays one aligned CSV row and is neutralized', () => {
  const hostile = ['=HYPERLINK("http://x","y")', '+SUM(1)', '-1+1', '@cmd'];
  for (const reasonText of hostile) {
    const contract = createLiquidLiquidContract(failedResult(), {}, { balanceOverride: overrideWithReason(reasonText) });
    const { lines, headers, row } = csvColumns(contract);
    assert.equal(lines.length, 2, `one header + one data line for ${reasonText}`);
    assert.equal(row.length, headers.length, `column alignment for ${reasonText}`);
    const reasonCell = row[headers.indexOf('Override Reason')];
    assert.equal(reasonCell, `'${reasonText}`, `neutralized reason for ${reasonText}`);
    // JSON export is not CSV-neutralized: domain value stays intact there
    assert.equal(contract.json.balanceOverride.reasonLabel, reasonText);
  }
});

test('reason text with comma, quote and newline keeps structure and alignment', () => {
  const nasty = 'line1\nline2, includes "quotes", and, commas';
  const contract = createLiquidLiquidContract(failedResult(), {}, { balanceOverride: overrideWithReason(nasty) });
  const { lines, headers, row } = csvColumns(contract);
  assert.equal(lines.length, 2, 'newline in text must not add physical CSV lines');
  assert.equal(row.length, headers.length, 'column alignment preserved');
  const reasonCell = row[headers.indexOf('Override Reason')];
  assert.equal(reasonCell, 'line1 line2, includes "quotes", and, commas');
  // neighbours intact
  assert.equal(row[headers.indexOf('Override Trusted Side')], 'liquid');
  assert.equal(row[headers.indexOf('Override Acknowledged At')], '2026-07-03T10:00:00Z');
});

test('job, unit and reference metadata are formula-neutralized in CSV', () => {
  const contract = createLiquidLiquidContract(failedResult(), {
    job: '=2+5', unit: '+A1', reference: '@x',
  }, {});
  const { headers, row } = csvColumns(contract);
  assert.equal(row[headers.indexOf('Job')], "'=2+5");
  assert.equal(row[headers.indexOf('Unit')], "'+A1");
  assert.equal(row[headers.indexOf('Reference')], "'@x");
  // record/json keep the raw metadata (CSV-only neutralization)
  assert.equal(contract.record.job, '=2+5');
});

test('numeric CSV cells stay bare numbers and are never neutralized', () => {
  const contract = createLiquidLiquidContract(failedResult(), {}, {});
  const { headers, row } = csvColumns(contract);
  for (const column of ['Balance Deviation %', 'Energy Residual kW', 'Cold Capacity kW', 'Hot Capacity kW', 'Electrical Power kW', 'COP']) {
    const cell = row[headers.indexOf(column)];
    assert.ok(!cell.startsWith("'"), `${column} must not be neutralized (got ${cell})`);
    assert.ok(Number.isFinite(Number(cell)), `${column} must parse as a number (got ${cell})`);
  }
  // the failed deviation is a real negative-capable numeric path
  assert.ok(Math.abs(Number(row[headers.indexOf('Balance Deviation %')])) > 10);
});

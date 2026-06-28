'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { validateTestSet } = require('../../src/validation/schema');
const { runHarness, makeReportWriter } = require('../../src/validation/runHarness');
const { makeStubEvaluator } = require('../../src/validation/evaluatorStub');
const { loadPrivateTestSet } = require('../../src/validation/loadPrivate');
const { maskText, maskNumbers, assertPublicSafe } = require('../../src/validation/redact');

const FIX = path.join(__dirname, 'fixtures');
const readFix = (name) => JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));

test('schema: valid public fixture passes', () => {
  const { valid, errors } = validateTestSet(readFix('public_cases.valid.json'));
  assert.equal(valid, true, JSON.stringify(errors));
  assert.equal(errors.length, 0);
});

test('schema: invalid public fixture is rejected with structural errors only', () => {
  const { valid, errors } = validateTestSet(readFix('public_cases.invalid.json'));
  assert.equal(valid, false);
  assert.ok(errors.length >= 5);
  // Error messages must not leak values: they are path+message structural strings.
  for (const e of errors) {
    assert.equal(typeof e.path, 'string');
    assert.equal(typeof e.message, 'string');
  }
  const paths = errors.map((e) => e.path);
  assert.ok(paths.includes('$.schema_version'));
  // Zero reference is rejected (cannot be used in percent deviation).
  assert.ok(paths.includes('$.cases[2].reference.cooling_capacity_w'));
});

test('harness: deterministic PASS/FAIL/SKIP on synthetic fixture', () => {
  const testSet = readFix('public_cases.valid.json');
  const lines = [];
  const result = runHarness({
    testSet,
    evaluate: makeStubEvaluator(),
    out: (l) => lines.push(l),
  });

  assert.deepEqual(
    { cases: result.cases, pass: result.pass, fail: result.fail, skip: result.skip },
    { cases: 4, pass: 2, fail: 1, skip: 1 },
  );
  assert.equal(result.ok, false); // there is one FAIL

  // Per-case verdicts as expected.
  assert.ok(lines.includes('SYN-FULL-001\tPASS'));
  assert.ok(lines.includes('SYN-PART-002\tFAIL'));
  assert.ok(lines.includes('SYN-HIGH-003\tSKIP'));
  assert.ok(lines.includes('SYN-DERATE-004\tPASS'));
});

test('harness: public output never contains numeric values', () => {
  const testSet = readFix('public_cases.valid.json');
  const lines = [];
  runHarness({ testSet, evaluate: makeStubEvaluator(), out: (l) => lines.push(l) });

  for (const line of lines) {
    // Every emitted line must pass the public-safety guard.
    assert.doesNotThrow(() => assertPublicSafe(line), `unsafe line: ${line}`);
  }
  // The only digits allowed are in the summary counts line.
  const nonSummary = lines.filter((l) => !l.startsWith('summary'));
  for (const line of nonSummary) {
    assert.equal(/\d/.test(line.replace(/^[\w.-]+/, '')), false, `value leaked: ${line}`);
  }
});

test('harness: requires an evaluate function', () => {
  assert.throws(() => runHarness({ testSet: { cases: [] } }), /evaluate/);
});

test('load: missing env => not present, reason env_unset (skipped, not failed)', () => {
  const res = loadPrivateTestSet({});
  assert.equal(res.present, false);
  assert.equal(res.reason, 'env_unset');
});

test('load: non-absolute path => not present', () => {
  const res = loadPrivateTestSet({ NODITECH_PRIVATE_VALIDATION_FILE: 'relative/cases.json' });
  assert.equal(res.present, false);
  assert.equal(res.reason, 'path_not_absolute');
});

test('load: absolute but missing file => file_not_found', () => {
  const res = loadPrivateTestSet({ NODITECH_PRIVATE_VALIDATION_FILE: '/definitely/not/here/cases.json' });
  assert.equal(res.present, false);
  assert.equal(res.reason, 'file_not_found');
});

test('load + report: detailed report writes locally and is value-bearing (kept off stdout)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pvh-'));
  const casesFile = path.join(tmp, 'cases.json');
  fs.writeFileSync(casesFile, fs.readFileSync(path.join(FIX, 'public_cases.valid.json')));

  const env = {
    NODITECH_PRIVATE_VALIDATION_FILE: casesFile,
    NODITECH_PRIVATE_REPORT_DIR: path.join(tmp, 'reports'),
    NODITECH_ENABLE_PRIVATE_REPORT: '1',
  };
  const loaded = loadPrivateTestSet(env);
  assert.equal(loaded.present, true);

  const writeReport = makeReportWriter(loaded.config);
  assert.equal(typeof writeReport, 'function');

  const lines = [];
  runHarness({ testSet: loaded.data, evaluate: makeStubEvaluator(), out: (l) => lines.push(l), writeReport });

  const reports = fs.readdirSync(path.join(tmp, 'reports'));
  assert.equal(reports.length, 1);
  const report = JSON.parse(fs.readFileSync(path.join(tmp, 'reports', reports[0]), 'utf8'));
  assert.equal(report.evidence, 'confidential external validation evidence');
  assert.ok(report.cases.length === 4);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('report writer disabled when NODITECH_ENABLE_PRIVATE_REPORT != 1', () => {
  const w = makeReportWriter({ reportEnabled: false, reportDir: '/tmp/x' });
  assert.equal(w, null);
});

test('redact: masks numbers and sensitive keys', () => {
  assert.equal(/\d/.test(maskNumbers('cooling 12345.6 W')), false);
  const masked = maskText('lab=Acme model=XJ-9 cooling=12345');
  assert.equal(/12345/.test(masked), false, 'numbers must be masked');
  assert.equal(/lab=«redacted»/.test(masked), true, 'sensitive key lab masked');
  assert.equal(/model=«redacted»/.test(masked), true, 'sensitive key model masked');
});

test('redact: assertPublicSafe rejects value-bearing lines', () => {
  assert.throws(() => assertPublicSafe('SYN-001 cooling=12345'), /unsafe/);
  assert.doesNotThrow(() => assertPublicSafe('SYN-001\tPASS'));
  assert.doesNotThrow(() => assertPublicSafe('summary cases=4 pass=2 fail=1 skip=1'));
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  SCHEMA_VERSION,
  RESULT_STATUSES,
  ISSUE_SEVERITIES,
  validateResultEnvelope,
  assertResultEnvelope,
} = require('../../src/domain/resultEnvelope');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'result_envelopes.synthetic.json',
);

const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const clone = (value) => JSON.parse(JSON.stringify(value));

test('contract exposes stable schema, statuses, and issue severities', () => {
  assert.equal(SCHEMA_VERSION, '1.0');
  assert.deepEqual(RESULT_STATUSES, ['valid', 'warning', 'blocked']);
  assert.deepEqual(ISSUE_SEVERITIES, ['warning', 'blocking']);
});

test('synthetic valid, warning, and blocked fixtures pass', () => {
  for (const status of RESULT_STATUSES) {
    const validation = validateResultEnvelope(fixtures[status]);
    assert.equal(
      validation.valid,
      true,
      `${status}: ${validation.errors.join('; ')}`,
    );
    assert.deepEqual(validation.errors, []);
  }
});

test('valid requires a finite result and no issues', () => {
  const withIssue = clone(fixtures.valid);
  withIssue.issues.push(clone(fixtures.warning.issues[0]));

  const nonFinite = clone(fixtures.valid);
  nonFinite.result.value = null;

  assert.equal(validateResultEnvelope(withIssue).valid, false);
  assert.equal(validateResultEnvelope(nonFinite).valid, false);
});

test('warning requires a result and at least one warning', () => {
  const missingWarning = clone(fixtures.warning);
  missingWarning.issues = [];

  const blockingIssue = clone(fixtures.warning);
  blockingIssue.issues[0].severity = 'blocking';

  assert.equal(validateResultEnvelope(missingWarning).valid, false);
  assert.equal(validateResultEnvelope(blockingIssue).valid, false);
});

test('blocked prevents a result and requires a blocking issue', () => {
  const withResult = clone(fixtures.blocked);
  withResult.result = clone(fixtures.valid.result);

  const withoutBlockingIssue = clone(fixtures.blocked);
  withoutBlockingIssue.issues[0].severity = 'warning';

  assert.equal(validateResultEnvelope(withResult).valid, false);
  assert.equal(validateResultEnvelope(withoutBlockingIssue).valid, false);
});

test('issues identify field and corrective action', () => {
  for (const status of ['warning', 'blocked']) {
    const issue = fixtures[status].issues[0];

    assert.equal(typeof issue.field, 'string');
    assert.ok(issue.field.length > 0);
    assert.equal(typeof issue.corrective_action, 'string');
    assert.ok(issue.corrective_action.length > 0);
  }
});

test('unknown statuses and undocumented fields are rejected', () => {
  const unknownStatus = clone(fixtures.valid);
  unknownStatus.status = 'unknown';

  const extraField = clone(fixtures.valid);
  extraField.internal_detail = 'not part of the public contract';

  assert.equal(validateResultEnvelope(unknownStatus).valid, false);
  assert.equal(validateResultEnvelope(extraField).valid, false);
});

test('assertResultEnvelope returns valid envelopes and throws otherwise', () => {
  assert.equal(assertResultEnvelope(fixtures.valid), fixtures.valid);

  const invalid = clone(fixtures.blocked);
  invalid.result = clone(fixtures.valid.result);

  assert.throws(
    () => assertResultEnvelope(invalid),
    /Invalid ResultEnvelope/,
  );
});

test('validation is deterministic and does not mutate input', () => {
  const input = clone(fixtures.warning);
  const before = JSON.stringify(input);

  const first = validateResultEnvelope(input);
  const second = validateResultEnvelope(input);

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(input), before);
});

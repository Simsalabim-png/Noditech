'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createResultEnvelope,
} = require('../../src/domain/createResultEnvelope');

const result = {
  value: 12.5,
  unit: 'synthetic-unit',
};

const warning = {
  severity: 'warning',
  code: 'SYNTHETIC_WARNING',
  field: 'synthetic_input',
  message: 'Synthetic limitation.',
  corrective_action: 'Review the synthetic input.',
};

const blocking = {
  severity: 'blocking',
  code: 'SYNTHETIC_BLOCK',
  field: 'synthetic_required_input',
  message: 'Required synthetic input is missing.',
  corrective_action: 'Provide the required synthetic input.',
};

test('creates valid envelope when there are no issues', () => {
  assert.deepEqual(
    createResultEnvelope({ result, issues: [] }),
    {
      schema_version: '1.0',
      status: 'valid',
      result,
      issues: [],
    },
  );
});

test('creates warning envelope for non-blocking issues', () => {
  assert.deepEqual(
    createResultEnvelope({ result, issues: [warning] }),
    {
      schema_version: '1.0',
      status: 'warning',
      result,
      issues: [warning],
    },
  );
});

test('blocking takes precedence and suppresses result', () => {
  const envelope = createResultEnvelope({
    result,
    issues: [warning, blocking],
  });

  assert.equal(envelope.status, 'blocked');
  assert.equal(envelope.result, null);
  assert.deepEqual(envelope.issues, [warning, blocking]);
});

test('does not mutate or reuse caller-owned objects', () => {
  const inputResult = { ...result };
  const inputIssues = [{ ...warning }];
  const envelope = createResultEnvelope({
    result: inputResult,
    issues: inputIssues,
  });

  assert.notEqual(envelope.result, inputResult);
  assert.notEqual(envelope.issues, inputIssues);
  assert.notEqual(envelope.issues[0], inputIssues[0]);

  envelope.result.value = 99;
  envelope.issues[0].message = 'changed';

  assert.deepEqual(inputResult, result);
  assert.deepEqual(inputIssues, [warning]);
});

test('rejects missing result for valid or warning status', () => {
  assert.throws(
    () => createResultEnvelope({ issues: [] }),
    /Invalid ResultEnvelope/,
  );

  assert.throws(
    () => createResultEnvelope({ issues: [warning] }),
    /Invalid ResultEnvelope/,
  );
});

test('rejects malformed issues', () => {
  assert.throws(
    () => createResultEnvelope({ result, issues: 'warning' }),
    /issues must be an array/,
  );

  assert.throws(
    () => createResultEnvelope({
      result,
      issues: [{ severity: 'warning' }],
    }),
    /Invalid ResultEnvelope/,
  );
});

test('is deterministic', () => {
  const input = {
    result,
    issues: [warning],
  };

  assert.deepEqual(
    createResultEnvelope(input),
    createResultEnvelope(input),
  );
});

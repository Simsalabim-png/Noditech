'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  attachResultEnvelopeToExport,
  attachResultEnvelopeToSession,
  readResultEnvelopeFromExport,
  readResultEnvelopeFromSession,
} = require('../../src/domain/resultEnvelopeTransport');

const validEnvelope = {
  schema_version: '1.0',
  status: 'valid',
  result: {
    value: 12.5,
    unit: 'synthetic-unit',
  },
  issues: [],
};

const warningEnvelope = {
  schema_version: '1.0',
  status: 'warning',
  result: {
    value: 9.5,
    unit: 'synthetic-unit',
  },
  issues: [{
    severity: 'warning',
    code: 'SYNTHETIC_LIMIT',
    field: 'synthetic_input',
    message: 'Synthetic limitation.',
    corrective_action: 'Review the synthetic input.',
  }],
};

test('export contract preserves existing fields and adds result_envelope', () => {
  const payload = {
    tool: 'engcalc-calculator',
    build: 'synthetic-build',
    exported: '2026-01-01T00:00:00.000Z',
    pressure: { state: 'known' },
    records: [{ id: 'synthetic-record' }],
  };

  const transported = attachResultEnvelopeToExport(
    payload,
    validEnvelope,
  );

  assert.deepEqual(transported, {
    ...payload,
    result_envelope: validEnvelope,
  });
});

test('session contract preserves existing fields and adds result_envelope', () => {
  const payload = {
    tool: 'engcalc-calculator',
    version: '5',
    saved: '2026-01-01T00:00:00.000Z',
    pressure: { state: 'known' },
    measDate: '2026-01-01',
    log: [{ id: 'synthetic-record' }],
  };

  const transported = attachResultEnvelopeToSession(
    payload,
    warningEnvelope,
  );

  assert.deepEqual(transported, {
    ...payload,
    result_envelope: warningEnvelope,
  });
});

test('transport adapters do not mutate payloads or envelopes', () => {
  const payload = {
    records: [],
  };
  const envelope = structuredClone(warningEnvelope);

  const transported = attachResultEnvelopeToExport(
    payload,
    envelope,
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(payload, 'result_envelope'),
    false,
  );
  assert.notEqual(transported, payload);
  assert.notEqual(transported.result_envelope, envelope);
  assert.notEqual(
    transported.result_envelope.result,
    envelope.result,
  );
  assert.notEqual(
    transported.result_envelope.issues,
    envelope.issues,
  );
  assert.notEqual(
    transported.result_envelope.issues[0],
    envelope.issues[0],
  );
});

test('export reader validates and returns a defensive copy', () => {
  const payload = attachResultEnvelopeToExport(
    { records: [] },
    warningEnvelope,
  );

  const restored = readResultEnvelopeFromExport(payload);

  assert.deepEqual(restored, warningEnvelope);
  assert.notEqual(restored, payload.result_envelope);
  assert.notEqual(
    restored.issues[0],
    payload.result_envelope.issues[0],
  );
});

test('session reader validates and returns a defensive copy', () => {
  const payload = attachResultEnvelopeToSession(
    { log: [] },
    validEnvelope,
  );

  const restored = readResultEnvelopeFromSession(payload);

  assert.deepEqual(restored, validEnvelope);
  assert.notEqual(restored, payload.result_envelope);
});

test('rejects malformed payloads and missing envelopes', () => {
  assert.throws(
    () => attachResultEnvelopeToExport([], validEnvelope),
    /export payload must be a plain object/,
  );

  assert.throws(
    () => attachResultEnvelopeToSession(null, validEnvelope),
    /session payload must be a plain object/,
  );

  assert.throws(
    () => readResultEnvelopeFromExport({ records: [] }),
    /missing result_envelope/,
  );

  assert.throws(
    () => readResultEnvelopeFromSession({ log: [] }),
    /missing result_envelope/,
  );
});

test('rejects invalid envelopes on write and read', () => {
  const invalidEnvelope = {
    ...validEnvelope,
    status: 'unknown',
  };

  assert.throws(
    () => attachResultEnvelopeToExport(
      { records: [] },
      invalidEnvelope,
    ),
    /Invalid ResultEnvelope/,
  );

  assert.throws(
    () => readResultEnvelopeFromSession({
      log: [],
      result_envelope: invalidEnvelope,
    }),
    /Invalid ResultEnvelope/,
  );
});

test('transport is deterministic', () => {
  const payload = {
    records: [{ id: 'synthetic-record' }],
  };

  assert.deepEqual(
    attachResultEnvelopeToExport(payload, warningEnvelope),
    attachResultEnvelopeToExport(payload, warningEnvelope),
  );
});

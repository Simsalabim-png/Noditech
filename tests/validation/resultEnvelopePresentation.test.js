'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  STATUS_LABELS,
  STATUS_ROLES,
  createResultEnvelopePresentation,
} = require('../../src/domain/resultEnvelopePresentation');

const validEnvelope = {
  schema_version: '1.0',
  status: 'valid',
  result: {
    value: 12.5,
    unit: 'kW',
  },
  issues: [],
};

const warningEnvelope = {
  schema_version: '1.0',
  status: 'warning',
  result: {
    value: 9.5,
    unit: 'kW',
  },
  issues: [{
    severity: 'warning',
    code: 'SYNTHETIC_LIMIT',
    field: 'airflow',
    message: 'Resultatet har en begrensning.',
    corrective_action: 'Kontroller luftmengden.',
  }],
};

const blockedEnvelope = {
  schema_version: '1.0',
  status: 'blocked',
  result: null,
  issues: [{
    severity: 'blocking',
    code: 'SYNTHETIC_REQUIRED',
    field: 'supply_temperature',
    message: 'Turtemperatur mangler.',
    corrective_action: 'Fyll inn turtemperatur.',
  }, {
    severity: 'warning',
    code: 'SYNTHETIC_SECONDARY',
    field: 'pressure',
    message: 'Trykk bør kontrolleres.',
    corrective_action: 'Bekreft trykkverdien.',
  }],
};

test('exposes stable labels and live-region roles', () => {
  assert.deepEqual(STATUS_LABELS, {
    valid: 'Resultat klart',
    warning: 'Resultat med begrensninger',
    blocked: 'Beregning blokkert',
  });

  assert.deepEqual(STATUS_ROLES, {
    valid: 'status',
    warning: 'status',
    blocked: 'alert',
  });
});

test('valid presentation includes result and no issues', () => {
  assert.deepEqual(
    createResultEnvelopePresentation(validEnvelope),
    {
      status: 'valid',
      status_label: 'Resultat klart',
      live_region_role: 'status',
      announce_immediately: false,
      result_text: '12.5 kW',
      issues: [],
      first_blocking_field: null,
    },
  );
});

test('warning presentation keeps result and corrective guidance', () => {
  const presentation = createResultEnvelopePresentation(
    warningEnvelope,
  );

  assert.equal(
    presentation.status_label,
    'Resultat med begrensninger',
  );
  assert.equal(presentation.live_region_role, 'status');
  assert.equal(presentation.announce_immediately, false);
  assert.equal(presentation.result_text, '9.5 kW');
  assert.equal(presentation.first_blocking_field, null);
  assert.deepEqual(presentation.issues[0], {
    severity: 'warning',
    code: 'SYNTHETIC_LIMIT',
    field: 'airflow',
    message: 'Resultatet har en begrensning.',
    corrective_action: 'Kontroller luftmengden.',
    text: 'Resultatet har en begrensning. Kontroller luftmengden.',
  });
});

test('blocked presentation suppresses result and identifies first field', () => {
  const presentation = createResultEnvelopePresentation(
    blockedEnvelope,
  );

  assert.equal(presentation.status_label, 'Beregning blokkert');
  assert.equal(presentation.live_region_role, 'alert');
  assert.equal(presentation.announce_immediately, true);
  assert.equal(presentation.result_text, null);
  assert.equal(
    presentation.first_blocking_field,
    'supply_temperature',
  );
  assert.equal(presentation.issues.length, 2);
});

test('does not mutate or reuse caller-owned objects', () => {
  const envelope = structuredClone(blockedEnvelope);
  const presentation = createResultEnvelopePresentation(envelope);

  assert.deepEqual(envelope, blockedEnvelope);
  assert.notEqual(presentation.issues, envelope.issues);
  assert.notEqual(presentation.issues[0], envelope.issues[0]);
});

test('rejects invalid envelopes', () => {
  const invalidEnvelope = {
    ...validEnvelope,
    status: 'unknown',
  };

  assert.throws(
    () => createResultEnvelopePresentation(invalidEnvelope),
    /Invalid ResultEnvelope/,
  );
});

test('presentation is deterministic', () => {
  assert.deepEqual(
    createResultEnvelopePresentation(blockedEnvelope),
    createResultEnvelopePresentation(blockedEnvelope),
  );
});

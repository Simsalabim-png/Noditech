'use strict';

const {
  assertResultEnvelope,
} = require('./resultEnvelope');

const isPlainObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const cloneResultEnvelope = (envelope) => {
  assertResultEnvelope(envelope);

  return {
    schema_version: envelope.schema_version,
    status: envelope.status,
    result: envelope.result === null
      ? null
      : {
        value: envelope.result.value,
        unit: envelope.result.unit,
      },
    issues: envelope.issues.map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      field: issue.field,
      message: issue.message,
      corrective_action: issue.corrective_action,
    })),
  };
};

const attachResultEnvelope = (payload, envelope, contractName) => {
  if (!isPlainObject(payload)) {
    throw new TypeError(`${contractName} payload must be a plain object`);
  }

  return {
    ...payload,
    result_envelope: cloneResultEnvelope(envelope),
  };
};

const readResultEnvelope = (payload, contractName) => {
  if (!isPlainObject(payload)) {
    throw new TypeError(`${contractName} payload must be a plain object`);
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'result_envelope')) {
    throw new TypeError(`${contractName} payload is missing result_envelope`);
  }

  return cloneResultEnvelope(payload.result_envelope);
};

const attachResultEnvelopeToExport = (payload, envelope) => (
  attachResultEnvelope(payload, envelope, 'export')
);

const attachResultEnvelopeToSession = (payload, envelope) => (
  attachResultEnvelope(payload, envelope, 'session')
);

const readResultEnvelopeFromExport = (payload) => (
  readResultEnvelope(payload, 'export')
);

const readResultEnvelopeFromSession = (payload) => (
  readResultEnvelope(payload, 'session')
);

module.exports = {
  attachResultEnvelopeToExport,
  attachResultEnvelopeToSession,
  readResultEnvelopeFromExport,
  readResultEnvelopeFromSession,
};

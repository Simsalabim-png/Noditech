'use strict';

const SCHEMA_VERSION = '1.0';

const RESULT_STATUSES = Object.freeze([
  'valid',
  'warning',
  'blocked',
]);

const ISSUE_SEVERITIES = Object.freeze([
  'warning',
  'blocking',
]);

const ENVELOPE_KEYS = Object.freeze([
  'schema_version',
  'status',
  'result',
  'issues',
]);

const RESULT_KEYS = Object.freeze([
  'value',
  'unit',
]);

const ISSUE_KEYS = Object.freeze([
  'severity',
  'code',
  'field',
  'message',
  'corrective_action',
]);

const isPlainObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const hasExactKeys = (value, expected) => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();

  return (
    actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index])
  );
};

const isNonEmptyString = (value) => (
  typeof value === 'string' && value.trim().length > 0
);

const validateIssue = (issue, index, errors) => {
  const path = `$.issues[${index}]`;

  if (!isPlainObject(issue)) {
    errors.push(`${path} must be an object`);
    return;
  }

  if (!hasExactKeys(issue, ISSUE_KEYS)) {
    errors.push(`${path} must contain exactly the documented fields`);
  }

  if (!ISSUE_SEVERITIES.includes(issue.severity)) {
    errors.push(`${path}.severity must be warning or blocking`);
  }

  if (!isNonEmptyString(issue.code)) {
    errors.push(`${path}.code must be a non-empty string`);
  }

  if (!isNonEmptyString(issue.field)) {
    errors.push(`${path}.field must identify the affected field`);
  }

  if (!isNonEmptyString(issue.message)) {
    errors.push(`${path}.message must be a non-empty string`);
  }

  if (!isNonEmptyString(issue.corrective_action)) {
    errors.push(`${path}.corrective_action must be a non-empty string`);
  }
};

const validateResult = (result, errors) => {
  if (!isPlainObject(result)) {
    errors.push('$.result must be an object when calculation is available');
    return;
  }

  if (!hasExactKeys(result, RESULT_KEYS)) {
    errors.push('$.result must contain exactly value and unit');
  }

  if (typeof result.value !== 'number' || !Number.isFinite(result.value)) {
    errors.push('$.result.value must be a finite number');
  }

  if (!isNonEmptyString(result.unit)) {
    errors.push('$.result.unit must be a non-empty string');
  }
};

const validateResultEnvelope = (envelope) => {
  const errors = [];

  if (!isPlainObject(envelope)) {
    return {
      valid: false,
      errors: ['$ must be an object'],
    };
  }

  if (!hasExactKeys(envelope, ENVELOPE_KEYS)) {
    errors.push('$ must contain exactly the documented fields');
  }

  if (envelope.schema_version !== SCHEMA_VERSION) {
    errors.push(`$.schema_version must be ${SCHEMA_VERSION}`);
  }

  if (!RESULT_STATUSES.includes(envelope.status)) {
    errors.push('$.status must be valid, warning, or blocked');
  }

  if (!Array.isArray(envelope.issues)) {
    errors.push('$.issues must be an array');
  } else {
    envelope.issues.forEach((issue, index) => {
      validateIssue(issue, index, errors);
    });
  }

  if (envelope.status === 'blocked') {
    if (envelope.result !== null) {
      errors.push('$.result must be null when status is blocked');
    }

    if (
      Array.isArray(envelope.issues)
      && !envelope.issues.some((issue) => issue && issue.severity === 'blocking')
    ) {
      errors.push('$.issues must include at least one blocking issue');
    }
  }

  if (envelope.status === 'warning') {
    validateResult(envelope.result, errors);

    if (
      Array.isArray(envelope.issues)
      && !envelope.issues.some((issue) => issue && issue.severity === 'warning')
    ) {
      errors.push('$.issues must include at least one warning issue');
    }

    if (
      Array.isArray(envelope.issues)
      && envelope.issues.some((issue) => issue && issue.severity === 'blocking')
    ) {
      errors.push('warning envelopes cannot contain blocking issues');
    }
  }

  if (envelope.status === 'valid') {
    validateResult(envelope.result, errors);

    if (Array.isArray(envelope.issues) && envelope.issues.length !== 0) {
      errors.push('valid envelopes must not contain issues');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const assertResultEnvelope = (envelope) => {
  const validation = validateResultEnvelope(envelope);

  if (!validation.valid) {
    throw new TypeError(
      `Invalid ResultEnvelope: ${validation.errors.join('; ')}`,
    );
  }

  return envelope;
};

module.exports = {
  SCHEMA_VERSION,
  RESULT_STATUSES,
  ISSUE_SEVERITIES,
  validateResultEnvelope,
  assertResultEnvelope,
};

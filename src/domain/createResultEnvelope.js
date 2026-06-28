'use strict';

const {
  SCHEMA_VERSION,
  assertResultEnvelope,
} = require('./resultEnvelope');

const cloneIssue = (issue) => ({
  severity: issue.severity,
  code: issue.code,
  field: issue.field,
  message: issue.message,
  corrective_action: issue.corrective_action,
});

const cloneResult = (result) => ({
  value: result.value,
  unit: result.unit,
});

const createResultEnvelope = ({ result = null, issues = [] } = {}) => {
  if (!Array.isArray(issues)) {
    throw new TypeError('issues must be an array');
  }

  const copiedIssues = issues.map(cloneIssue);
  const hasBlocking = copiedIssues.some(
    (issue) => issue.severity === 'blocking',
  );
  const hasWarning = copiedIssues.some(
    (issue) => issue.severity === 'warning',
  );

  const envelope = {
    schema_version: SCHEMA_VERSION,
    status: hasBlocking
      ? 'blocked'
      : hasWarning
        ? 'warning'
        : 'valid',
    result: hasBlocking
      ? null
      : result === null
        ? null
        : cloneResult(result),
    issues: copiedIssues,
  };

  return assertResultEnvelope(envelope);
};

module.exports = {
  createResultEnvelope,
};

'use strict';

const {
  assertResultEnvelope,
} = require('./resultEnvelope');

const STATUS_LABELS = Object.freeze({
  valid: 'Resultat klart',
  warning: 'Resultat med begrensninger',
  blocked: 'Beregning blokkert',
});

const STATUS_ROLES = Object.freeze({
  valid: 'status',
  warning: 'status',
  blocked: 'alert',
});

const cloneIssuePresentation = (issue) => ({
  severity: issue.severity,
  code: issue.code,
  field: issue.field,
  message: issue.message,
  corrective_action: issue.corrective_action,
  text: `${issue.message} ${issue.corrective_action}`,
});

const createResultEnvelopePresentation = (envelope) => {
  assertResultEnvelope(envelope);

  const issues = envelope.issues.map(cloneIssuePresentation);
  const firstBlockingIssue = issues.find(
    (issue) => issue.severity === 'blocking',
  ) || null;

  return {
    status: envelope.status,
    status_label: STATUS_LABELS[envelope.status],
    live_region_role: STATUS_ROLES[envelope.status],
    announce_immediately: envelope.status === 'blocked',
    result_text: envelope.result === null
      ? null
      : `${envelope.result.value} ${envelope.result.unit}`,
    issues,
    first_blocking_field: firstBlockingIssue
      ? firstBlockingIssue.field
      : null,
  };
};

module.exports = {
  STATUS_LABELS,
  STATUS_ROLES,
  createResultEnvelopePresentation,
};

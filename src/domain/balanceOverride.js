'use strict';

const TRUSTED_SIDES = Object.freeze(['liquid', 'air', 'none']);

const OVERRIDE_REASONS = Object.freeze([
  { id: 'liquid-primary', label: 'Liquid side is the primary trusted measurement' },
  { id: 'air-primary', label: 'Air side is the primary trusted measurement' },
  { id: 'one-side-indicative', label: 'One side is indicative only' },
  { id: 'troubleshooting', label: 'Troubleshooting / documentation only' },
  { id: 'other', label: 'Other (free text)' },
]);

const ACK_TEXT =
  'I understand this measurement failed balance validation and should not be used ' +
  'as a validated full-system performance claim without explanation.';

const OVERRIDE_STAMP_TITLE = 'BALANCE VALIDATION: FAILED — ACCEPTED WITH USER OVERRIDE';

const OVERRIDE_STAMP_QUALIFIER =
  'This result is printable and storable for documentation purposes, but is not a ' +
  'validated full-system performance claim without the qualification stated above.';

function reasonFor(reasonId) {
  return OVERRIDE_REASONS.find((reason) => reason.id === reasonId) || null;
}

function createBalanceOverride({
  reasonId,
  reasonText = '',
  trustedSide,
  deviationPct,
  inputsFingerprint,
  nowIso,
}) {
  const reason = reasonFor(reasonId);
  if (!reason) throw new Error('BalanceOverride: invalid reasonId');
  const trimmedReasonText = String(reasonText || '').trim();
  if (reasonId === 'other' && !trimmedReasonText) {
    throw new Error('BalanceOverride: free text required for reason "other"');
  }
  if (!TRUSTED_SIDES.includes(trustedSide)) throw new Error('BalanceOverride: invalid trustedSide');
  if (!Number.isFinite(deviationPct)) throw new Error('BalanceOverride: deviationPct must be finite');
  return Object.freeze({
    acknowledged: true,
    reasonId,
    reasonLabel: reasonId === 'other' ? trimmedReasonText : reason.label,
    reasonText: reasonId === 'other' ? trimmedReasonText : '',
    trustedSide,
    deviationPct,
    acknowledgedAt: nowIso || new Date().toISOString(),
    inputsFingerprint: String(inputsFingerprint || ''),
  });
}

function canExport(balanceStatus, override, currentFingerprint) {
  if (balanceStatus !== 'failed') return { allowed: true, requiresOverride: false };
  const valid = !!(
    override &&
    override.acknowledged === true &&
    override.inputsFingerprint === String(currentFingerprint || '')
  );
  return { allowed: valid, requiresOverride: true };
}

function fingerprintInputs(inputsObject) {
  const input = inputsObject && typeof inputsObject === 'object' ? inputsObject : {};
  return JSON.stringify(input, Object.keys(input).sort());
}

function exportStampFromOverride(override) {
  if (!override || override.acknowledged !== true) return null;
  return Object.freeze({
    title: OVERRIDE_STAMP_TITLE,
    qualifier: OVERRIDE_STAMP_QUALIFIER,
    deviationPct: override.deviationPct,
    trustedSide: override.trustedSide,
    reasonId: override.reasonId,
    reasonLabel: override.reasonLabel,
    reasonText: override.reasonText,
    acknowledgedAt: override.acknowledgedAt,
  });
}

module.exports = {
  TRUSTED_SIDES,
  OVERRIDE_REASONS,
  ACK_TEXT,
  OVERRIDE_STAMP_TITLE,
  OVERRIDE_STAMP_QUALIFIER,
  createBalanceOverride,
  canExport,
  fingerprintInputs,
  exportStampFromOverride,
};

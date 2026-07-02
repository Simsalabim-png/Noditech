'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ACK_TEXT,
  OVERRIDE_STAMP_TITLE,
  createBalanceOverride,
  canExport,
  fingerprintInputs,
  exportStampFromOverride,
} = require('../../src/domain/balanceOverride.js');

test('canExport allows good and warning balances without override', () => {
  assert.deepEqual(canExport('good', null, 'abc'), { allowed: true, requiresOverride: false });
  assert.deepEqual(canExport('warning', null, 'abc'), { allowed: true, requiresOverride: false });
});

test('failed balance requires matching acknowledged override', () => {
  const fingerprint = fingerprintInputs({ cTi: 7, cTo: 12, cF: 0.5 });
  assert.deepEqual(canExport('failed', null, fingerprint), { allowed: false, requiresOverride: true });
  const override = createBalanceOverride({
    reasonId: 'liquid-primary',
    trustedSide: 'liquid',
    deviationPct: 14.2,
    inputsFingerprint: fingerprint,
    nowIso: '2026-07-02T10:42:00Z',
  });
  assert.deepEqual(canExport('failed', override, fingerprint), { allowed: true, requiresOverride: true });
  assert.deepEqual(canExport('failed', override, fingerprintInputs({ cTi: 8, cTo: 12, cF: 0.5 })), { allowed: false, requiresOverride: true });
});

test('other reason requires free text and invalid trusted side is rejected', () => {
  assert.throws(() => createBalanceOverride({
    reasonId: 'other',
    reasonText: '',
    trustedSide: 'liquid',
    deviationPct: 12,
    inputsFingerprint: 'x',
  }), /free text required/);
  assert.throws(() => createBalanceOverride({
    reasonId: 'liquid-primary',
    trustedSide: 'water',
    deviationPct: 12,
    inputsFingerprint: 'x',
  }), /invalid trustedSide/);
});

test('canonical reasons keep their ids and labels and never collapse to other', () => {
  const air = createBalanceOverride({
    reasonId: 'air-primary',
    trustedSide: 'air',
    deviationPct: 12.4,
    inputsFingerprint: 'fp-air',
    nowIso: '2026-07-02T10:42:00Z',
  });
  assert.equal(air.reasonId, 'air-primary');
  assert.notEqual(air.reasonId, 'other');
  assert.equal(air.reasonLabel, 'Air side is the primary trusted measurement');
  assert.equal(air.reasonText, '');

  const troubleshooting = createBalanceOverride({
    reasonId: 'troubleshooting',
    trustedSide: 'none',
    deviationPct: 18,
    inputsFingerprint: 'fp-none',
  });
  assert.equal(troubleshooting.reasonId, 'troubleshooting');
  assert.equal(troubleshooting.reasonLabel, 'Troubleshooting / documentation only');
});

test('override stamp is deterministic and carries qualifier text', () => {
  const override = createBalanceOverride({
    reasonId: 'one-side-indicative',
    trustedSide: 'none',
    deviationPct: -15.5,
    inputsFingerprint: 'same-inputs',
    nowIso: '2026-07-02T10:42:00Z',
  });
  const stamp = exportStampFromOverride(override);
  assert.equal(ACK_TEXT.includes('failed balance validation'), true);
  assert.equal(stamp.title, OVERRIDE_STAMP_TITLE);
  assert.equal(stamp.trustedSide, 'none');
  assert.equal(stamp.reasonLabel, 'One side is indicative only');
  assert.equal(stamp.acknowledgedAt, '2026-07-02T10:42:00Z');
  assert.ok(Object.isFrozen(override));
});

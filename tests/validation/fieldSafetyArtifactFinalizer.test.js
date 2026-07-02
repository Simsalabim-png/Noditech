'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FIELD_ESTIMATE_TEXT,
  applyFieldSafetyArtifactFinalizer,
} = require('../../src/ui/fieldSafetyArtifactFinalizer.js');

test('field safety finalizer injects field-estimate disclaimer CSS once', () => {
  const html = '<style>\n    .print-only{display:none}\n    @media(max-width:520px){body{}}\n  </style><body><div class="res">Result</div></body>';
  const first = applyFieldSafetyArtifactFinalizer(html).html;
  assert.match(first, new RegExp(FIELD_ESTIMATE_TEXT));
  assert.match(first, /\.res::before/);
  assert.match(first, /@media print/);
  const second = applyFieldSafetyArtifactFinalizer(first).html;
  assert.equal(second, first, 'finalizer is idempotent');
});

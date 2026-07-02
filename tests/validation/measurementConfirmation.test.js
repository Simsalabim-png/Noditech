'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EXAMPLE_EXPORT_NOTE,
  createConfirmationState,
  markTouched,
  confirmAll,
  resetConfirmation,
  isExampleState,
  exportConfirmationState,
} = require('../../src/domain/measurementConfirmation.js');

const LL_FIELDS = ['cTi', 'cTo', 'cF', 'hTi', 'hTo', 'hF', 'pw'];

test('fresh L/L confirmation state is example until fields are touched or confirmed', () => {
  const state = createConfirmationState();
  assert.equal(isExampleState(state, LL_FIELDS), true);
  for (const field of LL_FIELDS.slice(0, -1)) markTouched(state, field);
  assert.equal(isExampleState(state, LL_FIELDS), true);
  markTouched(state, LL_FIELDS[LL_FIELDS.length - 1]);
  assert.equal(isExampleState(state, LL_FIELDS), false);
});

test('confirmAll ends example state without requiring changed default values', () => {
  const state = createConfirmationState();
  const confirmed = confirmAll(state);
  assert.equal(isExampleState(confirmed, LL_FIELDS), false);
  assert.equal(state.explicitlyConfirmed, false, 'original state is not mutated by confirmAll');
});

test('reset returns to example state and export representation is explicit', () => {
  const reset = resetConfirmation();
  const exportState = exportConfirmationState(reset, LL_FIELDS);
  assert.equal(exportState.measurementConfirmation, 'example');
  assert.equal(exportState.exampleNote, EXAMPLE_EXPORT_NOTE);

  const confirmed = confirmAll(reset);
  const confirmedExport = exportConfirmationState(confirmed, LL_FIELDS);
  assert.equal(confirmedExport.measurementConfirmation, 'confirmed');
  assert.equal(confirmedExport.exampleNote, null);
});

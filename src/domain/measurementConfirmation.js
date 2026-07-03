'use strict';

const EXAMPLE_BANNER_TEXT =
  'EXAMPLE VALUES — this result includes unmodified example inputs and is not a ' +
  'confirmed field measurement.';

const EXAMPLE_EXPORT_NOTE =
  'NOTE: One or more inputs were unmodified example values. This document is not a ' +
  'confirmed field measurement.';

function createConfirmationState() {
  return { touchedFields: new Set(), explicitlyConfirmed: false };
}

function markTouched(state, fieldKey) {
  if (!state || !(state.touchedFields instanceof Set)) throw new Error('MeasurementConfirmation: invalid state');
  state.touchedFields.add(String(fieldKey));
  return state;
}

function confirmAll(state) {
  if (!state || !(state.touchedFields instanceof Set)) throw new Error('MeasurementConfirmation: invalid state');
  return { touchedFields: new Set(state.touchedFields), explicitlyConfirmed: true };
}

function resetConfirmation() {
  return createConfirmationState();
}

function isExampleState(state, relevantFields) {
  if (!state || !(state.touchedFields instanceof Set)) return true;
  if (state.explicitlyConfirmed === true) return false;
  const fields = Array.isArray(relevantFields) ? relevantFields : [];
  return fields.some((field) => !state.touchedFields.has(String(field)));
}

function exportConfirmationState(state, relevantFields) {
  const example = isExampleState(state, relevantFields);
  return Object.freeze({
    measurementConfirmation: example ? 'example' : 'confirmed',
    exampleNote: example ? EXAMPLE_EXPORT_NOTE : null,
  });
}

module.exports = {
  EXAMPLE_BANNER_TEXT,
  EXAMPLE_EXPORT_NOTE,
  createConfirmationState,
  markTouched,
  confirmAll,
  resetConfirmation,
  isExampleState,
  exportConfirmationState,
};

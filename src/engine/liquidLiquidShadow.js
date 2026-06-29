'use strict';

const { evaluateLegacyLiquidLiquidState } = require('./liquidLiquidCalculatorAdapter.js');

function normalizeOperatingMode(value) {
  return value === 'heating' ? 'heating' : value === 'cooling' ? 'cooling' : null;
}

function nextOperatingMode(current, requested) {
  const next = normalizeOperatingMode(requested);
  return next || normalizeOperatingMode(current) || 'cooling';
}

function buildLiquidLiquidShadow(state, options) {
  const operatingMode = normalizeOperatingMode(state && state.operatingMode);
  const evaluated = evaluateLegacyLiquidLiquidState({
    ...(state || {}),
    operatingMode,
  }, options);

  const result = evaluated.result;
  const contract = evaluated.contract;

  return {
    operatingMode,
    evaluated,
    attributes: {
      'data-ll-shadow': 'true',
      'data-ll-operating-mode': operatingMode || 'missing',
      'data-ll-shadow-valid': result.valid === true ? 'true' : 'false',
      'data-ll-shadow-code': result.code || 'unknown',
      'data-ll-shadow-status': contract.status || 'blocked',
      'data-ll-shadow-save-allowed': contract.saveAllowed === true ? 'true' : 'false',
    },
  };
}

module.exports = {
  normalizeOperatingMode,
  nextOperatingMode,
  buildLiquidLiquidShadow,
};

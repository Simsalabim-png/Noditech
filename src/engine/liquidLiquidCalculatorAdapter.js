'use strict';

const { computeLiquidLiquidWithProperties } = require('./liquidLiquidWithProperties.js');
const { createLiquidLiquidContract } = require('./liquidLiquidContract.js');

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function celsius(value, unit) {
  if (!finiteNumber(value)) return value;
  return unit === 'F' ? (value - 32) * 5 / 9 : value;
}

function legacyFluid(fluidType, glycolKind, glycolPercent) {
  if (fluidType === 'water') {
    return { fluid: 'WATER', glycolPercent: 0 };
  }
  if (fluidType === 'glycol') {
    return {
      fluid: glycolKind === 'PG' ? 'PG' : 'EG',
      glycolPercent,
    };
  }
  return { fluid: null, glycolPercent: null };
}

/**
 * Translate the current LiqLiq component state into the isolated L/L engine input.
 *
 * This function intentionally understands only the existing state names. It does
 * not read DOM state, mutate UI values, save records or alter A/A or A/L behavior.
 */
function adaptLegacyLiquidLiquidState(state) {
  state = state || {};
  const unit = state.unit === 'F' ? 'F' : 'C';
  const coldFluid = legacyFluid(state.cFt, state.cGlyKind, state.cGp);
  const hotFluid = legacyFluid(state.hFt, state.hGlyKind, state.hGp);

  return {
    operatingMode: state.operatingMode,
    electricalPower_kW: state.pw,
    cold: {
      ...coldFluid,
      inletC: celsius(state.cTi, unit),
      outletC: celsius(state.cTo, unit),
      flowLs: state.cF,
    },
    hot: {
      ...hotFluid,
      inletC: celsius(state.hTi, unit),
      outletC: celsius(state.hTo, unit),
      flowLs: state.hF,
    },
  };
}

function legacyMetadata(state) {
  state = state || {};
  return {
    recordId: state.recordId || null,
    measuredAt: state.measDate || null,
    job: state.job || null,
    unit: state.uid || null,
    reference: state.ref || null,
  };
}

/**
 * Run the new isolated L/L stack from current calculator state.
 * Returned contract is side-effect free and is not connected to current UI/Save.
 */
function evaluateLegacyLiquidLiquidState(state, options) {
  const engineInput = adaptLegacyLiquidLiquidState(state);
  const result = computeLiquidLiquidWithProperties(engineInput, options);
  const contract = createLiquidLiquidContract(result, legacyMetadata(state), options);
  return {
    engineInput,
    result,
    contract,
  };
}

module.exports = {
  celsius,
  legacyFluid,
  adaptLegacyLiquidLiquidState,
  legacyMetadata,
  evaluateLegacyLiquidLiquidState,
};

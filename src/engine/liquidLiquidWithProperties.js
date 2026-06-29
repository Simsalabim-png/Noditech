'use strict';

const { resolveLiquidProperties } = require('./liquidProperties.js');
const { computeLiquidLiquid } = require('./liquidLiquid.js');

function blocked(code, message, operatingMode) {
  return {
    valid: false,
    status: 'blocked',
    code,
    message,
    operatingMode: operatingMode || null,
    saveAllowed: false,
    cold: null,
    hot: null,
    electricalPower_kW: null,
    copCooling: null,
    copHeating: null,
    expectedHot_kW: null,
    expectedCold_kW: null,
    energyResidual_kW: null,
    balanceDeviation_pct: null,
  };
}

function computeLiquidLiquidWithProperties(input, options) {
  input = input || {};
  options = options || {};

  const coldProperties = resolveLiquidProperties(input.cold, options);
  if (!coldProperties.valid) {
    return blocked(`cold_${coldProperties.code}`, coldProperties.message, input.operatingMode);
  }

  const hotProperties = resolveLiquidProperties(input.hot, options);
  if (!hotProperties.valid) {
    return blocked(`hot_${hotProperties.code}`, hotProperties.message, input.operatingMode);
  }

  return computeLiquidLiquid({
    operatingMode: input.operatingMode,
    electricalPower_kW: input.electricalPower_kW,
    cold: {
      inletC: input.cold.inletC,
      outletC: input.cold.outletC,
      flowLs: input.cold.flowLs,
      densityKgL: coldProperties.densityKgL,
      cpKJkgK: coldProperties.cpKJkgK,
      fluid: coldProperties.fluid,
      glycolPercent: coldProperties.glycolPercent,
      propertySource: coldProperties.propertySource,
      freezePointC: coldProperties.freezePointC,
      meanTemperatureC: coldProperties.meanTemperatureC,
    },
    hot: {
      inletC: input.hot.inletC,
      outletC: input.hot.outletC,
      flowLs: input.hot.flowLs,
      densityKgL: hotProperties.densityKgL,
      cpKJkgK: hotProperties.cpKJkgK,
      fluid: hotProperties.fluid,
      glycolPercent: hotProperties.glycolPercent,
      propertySource: hotProperties.propertySource,
      freezePointC: hotProperties.freezePointC,
      meanTemperatureC: hotProperties.meanTemperatureC,
    },
  });
}

module.exports = {
  computeLiquidLiquidWithProperties,
};

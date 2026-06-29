'use strict';

/**
 * Pure Liquid/Liquid calculation engine.
 *
 * This module is intentionally isolated from the current UI and from A/A and A/L.
 * It accepts already-resolved liquid properties for each side. Property lookup and
 * UI wiring are separate concerns and are not part of this first implementation.
 *
 * Units:
 * - temperatures: °C
 * - flow: L/s
 * - density: kg/L
 * - specific heat: kJ/(kg·K)
 * - power/capacity: kW
 */

function finitePositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

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

function reasonMessage(code) {
  switch (code) {
    case 'operating_mode_missing': return 'Select Cooling or Heating.';
    case 'electrical_power_invalid': return 'Electrical power must be finite and greater than zero.';
    case 'cold_temperature_invalid': return 'Cold-side temperatures must be finite numbers.';
    case 'hot_temperature_invalid': return 'Hot-side temperatures must be finite numbers.';
    case 'cold_direction_invalid': return 'Cold side requires inlet warmer than outlet.';
    case 'hot_direction_invalid': return 'Hot side requires outlet warmer than inlet.';
    case 'cold_flow_invalid': return 'Cold-side flow must be finite and greater than zero.';
    case 'hot_flow_invalid': return 'Hot-side flow must be finite and greater than zero.';
    case 'cold_properties_invalid': return 'Cold-side liquid properties are invalid.';
    case 'hot_properties_invalid': return 'Hot-side liquid properties are invalid.';
    case 'cold_capacity_invalid': return 'Cold-side capacity is not finite and positive.';
    case 'hot_capacity_invalid': return 'Hot-side capacity is not finite and positive.';
    case 'heating_expected_cold_non_positive': return 'Heating result is impossible because Qhot - Pel is not positive.';
    case 'energy_balance_invalid': return 'Energy balance could not be evaluated.';
    default: return 'Liquid/Liquid result unavailable.';
  }
}

function validateSide(side, name) {
  if (!side || typeof side !== 'object') return `${name}_properties_invalid`;
  if (!finiteNumber(side.inletC) || !finiteNumber(side.outletC)) return `${name}_temperature_invalid`;
  if (!finitePositive(side.flowLs)) return `${name}_flow_invalid`;
  if (!finitePositive(side.densityKgL) || !finitePositive(side.cpKJkgK)) return `${name}_properties_invalid`;
  return null;
}

function sideResult(side, deltaT_K) {
  const massFlow_kg_s = side.flowLs * side.densityKgL;
  const capacity_kW = massFlow_kg_s * side.cpKJkgK * deltaT_K;
  return {
    inletC: side.inletC,
    outletC: side.outletC,
    deltaT_K,
    flowLs: side.flowLs,
    densityKgL: side.densityKgL,
    cpKJkgK: side.cpKJkgK,
    massFlow_kg_s,
    capacity_kW,
    fluid: side.fluid || null,
    glycolPercent: side.glycolPercent == null ? null : side.glycolPercent,
    propertySource: side.propertySource || null,
  };
}

function computeLiquidLiquid(input) {
  input = input || {};
  const mode = input.operatingMode;

  if (mode !== 'cooling' && mode !== 'heating') {
    return blocked('operating_mode_missing', reasonMessage('operating_mode_missing'), mode);
  }
  if (!finitePositive(input.electricalPower_kW)) {
    return blocked('electrical_power_invalid', reasonMessage('electrical_power_invalid'), mode);
  }

  const coldError = validateSide(input.cold, 'cold');
  if (coldError) return blocked(coldError, reasonMessage(coldError), mode);
  const hotError = validateSide(input.hot, 'hot');
  if (hotError) return blocked(hotError, reasonMessage(hotError), mode);

  const coldDeltaT = input.cold.inletC - input.cold.outletC;
  const hotDeltaT = input.hot.outletC - input.hot.inletC;

  if (!(coldDeltaT > 0)) {
    return blocked('cold_direction_invalid', reasonMessage('cold_direction_invalid'), mode);
  }
  if (!(hotDeltaT > 0)) {
    return blocked('hot_direction_invalid', reasonMessage('hot_direction_invalid'), mode);
  }

  const cold = sideResult(input.cold, coldDeltaT);
  const hot = sideResult(input.hot, hotDeltaT);

  if (!finitePositive(cold.capacity_kW)) {
    return blocked('cold_capacity_invalid', reasonMessage('cold_capacity_invalid'), mode);
  }
  if (!finitePositive(hot.capacity_kW)) {
    return blocked('hot_capacity_invalid', reasonMessage('hot_capacity_invalid'), mode);
  }

  const power = input.electricalPower_kW;
  const residual = hot.capacity_kW - cold.capacity_kW - power;
  if (!finiteNumber(residual)) {
    return blocked('energy_balance_invalid', reasonMessage('energy_balance_invalid'), mode);
  }

  const expectedHot = cold.capacity_kW + power;
  const expectedCold = hot.capacity_kW - power;
  if (mode === 'heating' && !(expectedCold > 0)) {
    return blocked('heating_expected_cold_non_positive', reasonMessage('heating_expected_cold_non_positive'), mode);
  }

  const reference = mode === 'cooling' ? expectedHot : hot.capacity_kW;
  const balanceDeviation = (residual / reference) * 100;
  if (!finiteNumber(balanceDeviation)) {
    return blocked('energy_balance_invalid', reasonMessage('energy_balance_invalid'), mode);
  }

  return {
    valid: true,
    status: 'valid',
    code: 'ok',
    message: null,
    operatingMode: mode,
    saveAllowed: true,
    cold,
    hot,
    electricalPower_kW: power,
    copCooling: cold.capacity_kW / power,
    copHeating: hot.capacity_kW / power,
    expectedHot_kW: expectedHot,
    expectedCold_kW: expectedCold,
    energyResidual_kW: residual,
    balanceDeviation_pct: balanceDeviation,
  };
}

module.exports = {
  computeLiquidLiquid,
  reasonMessage,
};

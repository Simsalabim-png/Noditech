'use strict';

const WATER_POINTS = [
  { temperatureC: 0, cpKJkgK: 4.2174, densityKgL: 0.99984 },
  { temperatureC: 20, cpKJkgK: 4.1816, densityKgL: 0.99821 },
  { temperatureC: 40, cpKJkgK: 4.1796, densityKgL: 0.99222 },
  { temperatureC: 60, cpKJkgK: 4.1844, densityKgL: 0.98320 },
  { temperatureC: 80, cpKJkgK: 4.1968, densityKgL: 0.97180 },
  { temperatureC: 100, cpKJkgK: 4.2160, densityKgL: 0.95835 },
];

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeFluid(fluid) {
  const value = String(fluid || '').trim().toUpperCase();
  if (value === 'WATER' || value === 'H2O') return 'WATER';
  if (value === 'EG' || value === 'MEG' || value === 'ETHYLENE GLYCOL') return 'EG';
  if (value === 'PG' || value === 'MPG' || value === 'PROPYLENE GLYCOL') return 'PG';
  return null;
}

function interpolate(points, temperatureC) {
  if (!finiteNumber(temperatureC)) return null;
  if (temperatureC < points[0].temperatureC || temperatureC > points[points.length - 1].temperatureC) return null;
  for (let index = 0; index < points.length - 1; index += 1) {
    const lower = points[index];
    const upper = points[index + 1];
    if (temperatureC >= lower.temperatureC && temperatureC <= upper.temperatureC) {
      const fraction = (temperatureC - lower.temperatureC) / (upper.temperatureC - lower.temperatureC);
      return {
        cpKJkgK: lower.cpKJkgK + fraction * (upper.cpKJkgK - lower.cpKJkgK),
        densityKgL: lower.densityKgL + fraction * (upper.densityKgL - lower.densityKgL),
      };
    }
  }
  return null;
}

function invalid(code, message, fluid, meanTemperatureC, glycolPercent) {
  return {
    valid: false,
    code,
    message,
    fluid: fluid || null,
    meanTemperatureC: finiteNumber(meanTemperatureC) ? meanTemperatureC : null,
    glycolPercent: finiteNumber(glycolPercent) ? glycolPercent : null,
    cpKJkgK: null,
    densityKgL: null,
    freezePointC: null,
    propertySource: null,
  };
}

function resolveLiquidProperties(input, options) {
  input = input || {};
  options = options || {};

  const fluid = normalizeFluid(input.fluid);
  const meanTemperatureC = finiteNumber(input.meanTemperatureC)
    ? input.meanTemperatureC
    : (finiteNumber(input.inletC) && finiteNumber(input.outletC)
      ? (input.inletC + input.outletC) / 2
      : NaN);

  if (!fluid) return invalid('fluid_invalid', 'Fluid must be water, EG or PG.', null, meanTemperatureC, input.glycolPercent);
  if (!finiteNumber(meanTemperatureC)) return invalid('mean_temperature_invalid', 'Mean liquid temperature is invalid.', fluid, meanTemperatureC, input.glycolPercent);

  if (fluid === 'WATER') {
    const properties = interpolate(WATER_POINTS, meanTemperatureC);
    if (!properties) {
      return invalid('water_temperature_out_of_range', 'Water property range is 0 to 100 °C.', fluid, meanTemperatureC, 0);
    }
    return {
      valid: true,
      code: 'ok',
      message: null,
      fluid,
      meanTemperatureC,
      glycolPercent: 0,
      cpKJkgK: properties.cpKJkgK,
      densityKgL: properties.densityKgL,
      freezePointC: 0,
      propertySource: 'Noditech water table v1',
    };
  }

  const glycolPercent = input.glycolPercent;
  if (!finiteNumber(glycolPercent) || glycolPercent < 0 || glycolPercent > 60) {
    return invalid('glycol_concentration_invalid', 'Glycol concentration must be between 0 and 60 mass-%.', fluid, meanTemperatureC, glycolPercent);
  }
  if (typeof options.glycolLookup !== 'function') {
    return invalid('glycol_provider_missing', 'Validated glycol property provider is unavailable.', fluid, meanTemperatureC, glycolPercent);
  }

  const raw = options.glycolLookup(fluid, glycolPercent, meanTemperatureC);
  if (!raw || raw.valid !== true) {
    return invalid(raw && raw.reason ? raw.reason : 'glycol_properties_invalid', 'Glycol properties are outside the validated range.', fluid, meanTemperatureC, glycolPercent);
  }

  const cpKJkgK = raw.cpKJkgK == null ? raw.cp : raw.cpKJkgK;
  const densityKgL = raw.densityKgL == null ? raw.rho : raw.densityKgL;
  const freezePointC = raw.freezePointC == null ? raw.freeze : raw.freezePointC;
  if (!finiteNumber(cpKJkgK) || cpKJkgK <= 0 || !finiteNumber(densityKgL) || densityKgL <= 0 || !finiteNumber(freezePointC)) {
    return invalid('glycol_properties_invalid', 'Glycol property provider returned invalid values.', fluid, meanTemperatureC, glycolPercent);
  }

  const minimumOperatingC = Math.min(input.inletC, input.outletC);
  if (finiteNumber(minimumOperatingC) && minimumOperatingC <= freezePointC + 0.1) {
    return invalid('below_freeze_guard', 'Liquid temperature is at or below the freeze protection guard.', fluid, meanTemperatureC, glycolPercent);
  }

  return {
    valid: true,
    code: 'ok',
    message: null,
    fluid,
    meanTemperatureC,
    glycolPercent,
    cpKJkgK,
    densityKgL,
    freezePointC,
    propertySource: raw.source || 'CoolProp glycol table',
  };
}

module.exports = {
  WATER_POINTS,
  normalizeFluid,
  resolveLiquidProperties,
};

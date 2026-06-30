'use strict';

function createProductionGlycolLookup(provider) {
  return function productionGlycolLookup(fluid, percent, temperatureC) {
    if (typeof provider !== 'function') {
      return { valid: false, reason: 'glycol_provider_missing' };
    }
    const raw = provider(fluid, percent, temperatureC);
    if (!raw || raw.valid !== true) {
      return {
        valid: false,
        reason: raw && raw.reason ? raw.reason : 'glycol_properties_invalid',
      };
    }
    const cp = raw.cpKJkgK == null ? raw.cp : raw.cpKJkgK;
    const rho = raw.densityKgL == null ? raw.rho : raw.densityKgL;
    const freeze = raw.freezePointC == null ? raw.freeze : raw.freezePointC;
    if (![cp, rho, freeze].every((value) => typeof value === 'number' && Number.isFinite(value))) {
      return { valid: false, reason: 'glycol_properties_invalid' };
    }
    return {
      valid: true,
      cp,
      rho,
      freeze,
      source: raw.source || 'CoolProp 7.2.0 INCOMP (mass-%)',
    };
  };
}

function productionProviderBrowserSource(variableName) {
  const name = variableName || '_llGlycolLookup';
  if (!/^[$A-Z_a-z][$\w]*$/.test(name)) throw new Error('Invalid provider variable name');
  return `const ${name}=(${createProductionGlycolLookup.toString()})(typeof glyEval==='function'?glyEval:null);`;
}

module.exports = {
  createProductionGlycolLookup,
  productionProviderBrowserSource,
};

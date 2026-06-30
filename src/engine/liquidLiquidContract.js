'use strict';

const CONTRACT_VERSION = '1';

function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function textOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sideProjection(side) {
  if (!side || typeof side !== 'object') return null;
  return {
    fluid: textOrNull(side.fluid),
    glycolPercent: finiteOrNull(side.glycolPercent),
    inletC: finiteOrNull(side.inletC),
    outletC: finiteOrNull(side.outletC),
    meanTemperatureC: finiteOrNull(side.meanTemperatureC),
    deltaT_K: finiteOrNull(side.deltaT_K),
    flowLs: finiteOrNull(side.flowLs),
    densityKgL: finiteOrNull(side.densityKgL),
    cpKJkgK: finiteOrNull(side.cpKJkgK),
    massFlow_kg_s: finiteOrNull(side.massFlow_kg_s),
    capacity_kW: finiteOrNull(side.capacity_kW),
    freezePointC: finiteOrNull(side.freezePointC),
    propertySource: textOrNull(side.propertySource),
  };
}

function classifyBalance(deviationPct, thresholds) {
  thresholds = thresholds || {};
  const goodLimit = Number.isFinite(thresholds.goodLimitPct) ? Math.abs(thresholds.goodLimitPct) : 3;
  const warnLimit = Number.isFinite(thresholds.warnLimitPct) ? Math.abs(thresholds.warnLimitPct) : 10;
  if (!Number.isFinite(deviationPct)) return 'blocked';
  const absolute = Math.abs(deviationPct);
  if (absolute <= goodLimit) return 'good';
  if (absolute <= warnLimit) return 'warning';
  return 'failed';
}

function createLiquidLiquidContract(result, metadata, options) {
  metadata = metadata || {};
  options = options || {};

  const valid = !!(result && result.valid === true && result.status === 'valid' && result.saveAllowed === true);
  const mode = result && (result.operatingMode === 'cooling' || result.operatingMode === 'heating')
    ? result.operatingMode
    : null;

  if (!valid) {
    const code = result && textOrNull(result.code) ? result.code : 'result_invalid';
    const message = result && textOrNull(result.message) ? result.message : 'Liquid/Liquid result is unavailable.';
    return {
      schema: 'noditech.liquid-liquid.contract',
      schemaVersion: CONTRACT_VERSION,
      valid: false,
      status: 'blocked',
      code,
      message,
      operatingMode: mode,
      saveAllowed: false,
      ui: {
        resultVisible: false,
        status: 'blocked',
        statusLabel: 'BLOCKED',
        statusMessage: message,
        showPositive: false,
        usefulCapacity_kW: null,
        cop: null,
        balanceDeviation_pct: null,
        energyResidual_kW: null,
      },
      record: null,
      json: null,
      csv: null,
      print: null,
    };
  }

  const cold = sideProjection(result.cold);
  const hot = sideProjection(result.hot);
  const electricalPower = finiteOrNull(result.electricalPower_kW);
  const copCooling = finiteOrNull(result.copCooling);
  const copHeating = finiteOrNull(result.copHeating);
  const expectedHot = finiteOrNull(result.expectedHot_kW);
  const expectedCold = finiteOrNull(result.expectedCold_kW);
  const residual = finiteOrNull(result.energyResidual_kW);
  const deviation = finiteOrNull(result.balanceDeviation_pct);

  const requiredNumbers = [
    electricalPower, copCooling, copHeating, expectedHot, expectedCold, residual, deviation,
    cold && cold.capacity_kW, hot && hot.capacity_kW,
  ];
  if (!cold || !hot || requiredNumbers.some((value) => value === null)) {
    return createLiquidLiquidContract({
      valid: false,
      status: 'blocked',
      code: 'contract_non_finite',
      message: 'Liquid/Liquid result contains missing or non-finite values.',
      operatingMode: mode,
      saveAllowed: false,
    }, metadata, options);
  }

  const balanceStatus = classifyBalance(deviation, options.thresholds);
  const usefulCapacity = mode === 'cooling' ? cold.capacity_kW : hot.capacity_kW;
  const usefulCop = mode === 'cooling' ? copCooling : copHeating;
  const recordId = textOrNull(metadata.recordId);
  const measuredAt = textOrNull(metadata.measuredAt);
  const job = textOrNull(metadata.job);
  const unit = textOrNull(metadata.unit);
  const reference = textOrNull(metadata.reference);

  const record = {
    schema: 'noditech.liquid-liquid.record',
    schemaVersion: CONTRACT_VERSION,
    recordId,
    measuredAt,
    job,
    unit,
    reference,
    operatingMode: mode,
    status: balanceStatus,
    code: 'ok',
    saveAllowed: true,
    cold,
    hot,
    electricalPower_kW: electricalPower,
    usefulCapacity_kW: usefulCapacity,
    cop: usefulCop,
    copCooling,
    copHeating,
    expectedHot_kW: expectedHot,
    expectedCold_kW: expectedCold,
    energyResidual_kW: residual,
    balanceDeviation_pct: deviation,
  };

  const ui = {
    resultVisible: true,
    status: balanceStatus,
    statusLabel: balanceStatus === 'good' ? 'OK' : balanceStatus === 'warning' ? 'CHECK' : 'FAILED',
    statusMessage: balanceStatus === 'good'
      ? 'Energy balance is within the accepted limit.'
      : balanceStatus === 'warning'
        ? 'Energy balance should be checked.'
        : 'Energy balance is outside the accepted limit.',
    showPositive: balanceStatus === 'good',
    usefulCapacity_kW: usefulCapacity,
    cop: usefulCop,
    balanceDeviation_pct: deviation,
    energyResidual_kW: residual,
  };

  const json = {
    tool: 'noditech-calculator',
    mode: 'Liquid/Liquid',
    schemaVersion: CONTRACT_VERSION,
    record,
  };

  const csvHeaders = [
    'Schema Version','Record ID','Measured At','Mode','Operating Mode','Job','Unit','Reference','Status',
    'Cold Fluid','Cold Glycol %','Cold Inlet C','Cold Outlet C','Cold Mean C','Cold Flow L/s','Cold Density kg/L','Cold Cp kJ/kgK','Cold Capacity kW','Cold Property Source',
    'Hot Fluid','Hot Glycol %','Hot Inlet C','Hot Outlet C','Hot Mean C','Hot Flow L/s','Hot Density kg/L','Hot Cp kJ/kgK','Hot Capacity kW','Hot Property Source',
    'Electrical Power kW','Useful Capacity kW','COP','COP Cooling','COP Heating','Expected Hot kW','Expected Cold kW','Energy Residual kW','Balance Deviation %'
  ];
  const csvRow = [
    CONTRACT_VERSION,recordId,measuredAt,'Liquid/Liquid',mode,job,unit,reference,balanceStatus,
    cold.fluid,cold.glycolPercent,cold.inletC,cold.outletC,cold.meanTemperatureC,cold.flowLs,cold.densityKgL,cold.cpKJkgK,cold.capacity_kW,cold.propertySource,
    hot.fluid,hot.glycolPercent,hot.inletC,hot.outletC,hot.meanTemperatureC,hot.flowLs,hot.densityKgL,hot.cpKJkgK,hot.capacity_kW,hot.propertySource,
    electricalPower,usefulCapacity,usefulCop,copCooling,copHeating,expectedHot,expectedCold,residual,deviation,
  ];

  const print = {
    title: 'Liquid/Liquid Energy Rating',
    operatingMode: mode,
    status: balanceStatus,
    metadata: { recordId, measuredAt, job, unit, reference },
    cold,
    hot,
    electricalPower_kW: electricalPower,
    usefulCapacity_kW: usefulCapacity,
    cop: usefulCop,
    energyResidual_kW: residual,
    balanceDeviation_pct: deviation,
    propertyProvenance: {
      cold: cold.propertySource,
      hot: hot.propertySource,
    },
  };

  return {
    schema: 'noditech.liquid-liquid.contract',
    schemaVersion: CONTRACT_VERSION,
    valid: true,
    status: balanceStatus,
    code: 'ok',
    message: null,
    operatingMode: mode,
    saveAllowed: true,
    ui,
    record,
    json,
    csv: { headers: csvHeaders, row: csvRow },
    print,
  };
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function serializeLiquidLiquidCsv(contract) {
  if (!contract || contract.valid !== true || !contract.csv) return null;
  return [contract.csv.headers, contract.csv.row]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');
}

function serializeLiquidLiquidJson(contract) {
  if (!contract || contract.valid !== true || !contract.json) return null;
  return JSON.stringify(contract.json, null, 2);
}

module.exports = {
  CONTRACT_VERSION,
  classifyBalance,
  createLiquidLiquidContract,
  serializeLiquidLiquidCsv,
  serializeLiquidLiquidJson,
};

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;

function moduleBody(filename) {
  const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
  const body = source
    .replace(/^'use strict';\s*/, '')
    .replace(/^const\s+\{[\s\S]*?\}\s*=\s*require\([^\n]+\);\s*/gm, '')
    .replace(/\nmodule\.exports\s*=\s*\{[\s\S]*?\};\s*$/, '')
    .trim();

  if (!body || /\brequire\s*\(/.test(body) || /module\.exports/.test(body)) {
    throw new Error(`Unable to make ${filename} browser-safe`);
  }
  return body;
}

function buildLiquidLiquidBrowserBundle() {
  const properties = moduleBody('liquidProperties.js');
  const engine = moduleBody('liquidLiquid.js');
  const withProperties = moduleBody('liquidLiquidWithProperties.js');
  const contract = moduleBody('liquidLiquidContract.js');
  const adapter = moduleBody('liquidLiquidCalculatorAdapter.js');
  const balanceOverride = moduleBody(path.join('..', 'domain', 'balanceOverride.js'));

  return `/* GENERATED AT BUILD TIME FROM REVIEWED L/L MODULES — DO NOT EDIT */\n(function(global){\n'use strict';\n` +
    `const _llProperties=(function(){\n${properties}\nreturn {resolveLiquidProperties};\n})();\n` +
    `const _llEngine=(function(){\n${engine}\nreturn {computeLiquidLiquid,reasonMessage};\n})();\n` +
    `const _llWithProperties=(function(resolveLiquidProperties,computeLiquidLiquid){\n${withProperties}\nreturn {computeLiquidLiquidWithProperties};\n})(_llProperties.resolveLiquidProperties,_llEngine.computeLiquidLiquid);\n` +
    `const _llContract=(function(){\n${contract}\nreturn {CONTRACT_VERSION,classifyBalance,createLiquidLiquidContract,serializeLiquidLiquidCsv,serializeLiquidLiquidJson};\n})();\n` +
    `const _llAdapter=(function(computeLiquidLiquidWithProperties,createLiquidLiquidContract){\n${adapter}\nreturn {celsius,legacyFluid,adaptLegacyLiquidLiquidState,legacyMetadata,evaluateLegacyLiquidLiquidState};\n})(_llWithProperties.computeLiquidLiquidWithProperties,_llContract.createLiquidLiquidContract);\n` +
    `const _llBalanceOverride=(function(){\n${balanceOverride}\nreturn {TRUSTED_SIDES,OVERRIDE_REASONS,ACK_TEXT,createBalanceOverride,canExport,fingerprintInputs,exportStampFromOverride};\n})();\n` +
    `global.NoditechLiquidLiquid=Object.freeze({` +
      `CONTRACT_VERSION:_llContract.CONTRACT_VERSION,` +
      `resolveLiquidProperties:_llProperties.resolveLiquidProperties,` +
      `computeLiquidLiquid:_llEngine.computeLiquidLiquid,` +
      `computeLiquidLiquidWithProperties:_llWithProperties.computeLiquidLiquidWithProperties,` +
      `createLiquidLiquidContract:_llContract.createLiquidLiquidContract,` +
      `serializeLiquidLiquidCsv:_llContract.serializeLiquidLiquidCsv,` +
      `serializeLiquidLiquidJson:_llContract.serializeLiquidLiquidJson,` +
      `adaptLegacyLiquidLiquidState:_llAdapter.adaptLegacyLiquidLiquidState,` +
      `evaluateLegacyLiquidLiquidState:_llAdapter.evaluateLegacyLiquidLiquidState,` +
      `OVERRIDE_REASONS:_llBalanceOverride.OVERRIDE_REASONS,` +
      `ACK_TEXT:_llBalanceOverride.ACK_TEXT,` +
      `createBalanceOverride:_llBalanceOverride.createBalanceOverride` +
    `});\n})(typeof window!=='undefined'?window:globalThis);\n`;
}

module.exports = {
  moduleBody,
  buildLiquidLiquidBrowserBundle,
};

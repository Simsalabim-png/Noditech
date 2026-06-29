'use strict';

const { transformLiqLiqCutover } = require('./liquidLiquidCutoverTransform.js');
const { extractProductionGlycolDataset } = require('./liquidLiquidProductionDataset.js');

function buildLiquidLiquidCutoverSource(applicationSource) {
  if (typeof applicationSource !== 'string' || !applicationSource.includes('function LiqLiq(')) {
    throw new Error('Validated application source is required for L/L cutover build');
  }
  const dataset = extractProductionGlycolDataset();
  const transformedApplication = transformLiqLiqCutover(applicationSource);
  return {
    source: `${dataset.source}\n${transformedApplication}`,
    dataset,
    transformedApplication,
  };
}

module.exports = {
  buildLiquidLiquidCutoverSource,
};

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  EXPECTED_ASSIGNMENT_SHA256,
  EXPECTED_OBJECT_SHA256,
  extractProductionGlycolDataset,
} = require('../../src/engine/liquidLiquidProductionDataset.js');

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('extracts the exact SHA-locked glycol assignment from production', () => {
  const extracted = extractProductionGlycolDataset();
  assert.equal(extracted.assignmentSha256, EXPECTED_ASSIGNMENT_SHA256);
  assert.equal(extracted.objectSha256, EXPECTED_OBJECT_SHA256);
  assert.equal(extracted.productionArtifactSha256, 'd3080ff5fcf0dd539130c6849edb66aa3db9faed11e6b045561d048c76c99210');
  assert.equal(extracted.propertyEngine, 'CoolProp 7.2.0 INCOMP');
  assert.equal(extracted.concentrationBasis, 'mass_fraction_added_component');
  assert.deepEqual(extracted.fluidKeys, ['MEG', 'MPG']);
});

test('extracted assignment creates the authoritative browser dataset', () => {
  const extracted = extractProductionGlycolDataset();
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(extracted.source, context);
  const dataset = plain(context.window.__GLYCOL__);
  assert.equal(dataset.property_engine.name, 'CoolProp');
  assert.equal(dataset.property_engine.version, '7.2.0');
  assert.equal(dataset.property_engine.backend, 'INCOMP');
  assert.equal(dataset.fluids.MEG.concentrations.find((x) => x.mass_fraction === 0.3).freeze_point_C, -14.575778);
  assert.equal(dataset.fluids.MPG.concentrations.find((x) => x.mass_fraction === 0.3).freeze_point_C, -12.789104);
});

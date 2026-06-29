'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const {
  PROD,
  EXPECT_PROD_SHA,
} = require('../../tests/extract_app_source.js');

const ASSIGNMENT_ANCHOR = 'window.__GLYCOL__ = ';
const EXPECTED_ASSIGNMENT_SHA256 = '8beabb9f3c61dfeef61e1fc487a4972487231cc70426c442cafa286d8f05c30d';
const EXPECTED_OBJECT_SHA256 = 'aae380d254d1578c64c453a4c6c42799ce20a53bc75f24fc44032b94c494141c';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function findJsonObjectEnd(source, objectStart) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
      if (depth < 0) break;
    }
  }
  throw new Error('Validated glycol dataset object is unterminated');
}

function extractProductionGlycolDataset() {
  const html = fs.readFileSync(PROD, 'utf8');
  const productionArtifactSha256 = sha256(html);
  if (productionArtifactSha256 !== EXPECT_PROD_SHA) {
    throw new Error(`production artifact SHA mismatch: ${productionArtifactSha256} != ${EXPECT_PROD_SHA}`);
  }

  const assignmentStart = html.indexOf(ASSIGNMENT_ANCHOR);
  if (assignmentStart < 0) throw new Error('Validated glycol dataset assignment not found');
  if (html.indexOf(ASSIGNMENT_ANCHOR, assignmentStart + ASSIGNMENT_ANCHOR.length) >= 0) {
    throw new Error('Validated glycol dataset assignment is not unique');
  }

  const objectStart = assignmentStart + ASSIGNMENT_ANCHOR.length;
  if (html[objectStart] !== '{') throw new Error('Validated glycol dataset object does not begin with {');
  const objectEnd = findJsonObjectEnd(html, objectStart);
  let assignmentEnd = objectEnd;
  while (/\s/.test(html[assignmentEnd] || '')) assignmentEnd += 1;
  if (html[assignmentEnd] !== ';') throw new Error('Validated glycol dataset assignment has no terminator');
  assignmentEnd += 1;

  const objectSource = html.slice(objectStart, objectEnd);
  const assignmentSource = html.slice(assignmentStart, assignmentEnd);
  const assignmentSha256 = sha256(assignmentSource);
  const objectSha256 = sha256(objectSource);
  if (assignmentSha256 !== EXPECTED_ASSIGNMENT_SHA256) {
    throw new Error(`glycol assignment SHA mismatch: ${assignmentSha256} != ${EXPECTED_ASSIGNMENT_SHA256}`);
  }
  if (objectSha256 !== EXPECTED_OBJECT_SHA256) {
    throw new Error(`glycol object SHA mismatch: ${objectSha256} != ${EXPECTED_OBJECT_SHA256}`);
  }

  const dataset = JSON.parse(objectSource);
  if (dataset.concentration_basis !== 'mass_fraction_added_component') {
    throw new Error('Validated glycol dataset concentration basis changed');
  }
  if (!dataset.fluids || !dataset.fluids.MEG || !dataset.fluids.MPG) {
    throw new Error('Validated glycol dataset must contain MEG and MPG');
  }
  const engine = dataset.property_engine || {};
  if (engine.name !== 'CoolProp' || engine.version !== '7.2.0' || engine.backend !== 'INCOMP') {
    throw new Error('Validated glycol dataset property engine changed');
  }

  return {
    source: assignmentSource,
    assignmentSha256,
    objectSha256,
    productionArtifactSha256,
    releaseDate: dataset.dataset_release_date || null,
    propertyEngine: `${engine.name} ${engine.version} ${engine.backend}`,
    concentrationBasis: dataset.concentration_basis,
    fluidKeys: Object.keys(dataset.fluids).sort(),
  };
}

module.exports = {
  ASSIGNMENT_ANCHOR,
  EXPECTED_ASSIGNMENT_SHA256,
  EXPECTED_OBJECT_SHA256,
  findJsonObjectEnd,
  extractProductionGlycolDataset,
};

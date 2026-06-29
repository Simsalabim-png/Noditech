'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const extract = require('../extract_app_source.js');
const { buildLiquidLiquidCutoverSource } = require('../../src/engine/liquidLiquidCutoverBuild.js');
const { extractProductionStyle } = require('../../src/engine/productionStyle.js');

const root = path.join(__dirname, '../..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'tools/compiler/compiler.lock.json'), 'utf8'));
const compilerPath = path.join(root, 'tools/compiler', path.basename(lock.file));
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

test('normal extracted production source remains byte-identical', () => {
  const extracted = extract.extract();
  assert.equal(sha(Buffer.from(extracted.source, 'utf8')), extracted.sourceSha);
  assert.equal(extracted.prodSha, 'd3080ff5fcf0dd539130c6849edb66aa3db9faed11e6b045561d048c76c99210');
});

test('L/L cutover transform compiles with the pinned compiler', () => {
  assert.equal(sha(fs.readFileSync(compilerPath)), lock.integrity_sha256);
  const Babel = require(compilerPath);
  const extracted = extract.extract();
  const transformed = buildLiquidLiquidCutoverSource(extracted.source).source;
  const compiled = Babel.transform(transformed, {
    presets: lock.presets,
    sourceType: 'script',
    comments: false,
  }).code;
  assert.ok(compiled.length > 1000);
  assert.match(compiled, /NoditechLiquidLiquid/);
  assert.match(compiled, /data-ll-cutover/);
  assert.match(compiled, /data-ll-useful-capacity/);
  assert.match(compiled, /noditech-liquid-liquid\.json/);
  assert.doesNotMatch(compiled, /return\s*<[A-Za-z]/);
  assert.doesNotMatch(compiled, /\btype\s*=\s*["']text\/babel["']/);
  assert.doesNotMatch(compiled, /https?:\/\/(cdnjs|unpkg|cdn\.jsdelivr|fonts\.googleapis|fonts\.gstatic)/i);
  const style=extractProductionStyle(fs.readFileSync(extract.PROD,'utf8'));
  assert.equal(style.cssSha256,'d05974bba0660376cc441c670ce40db14cf805bb772bdc48e61e6fb118eb0b98');
});

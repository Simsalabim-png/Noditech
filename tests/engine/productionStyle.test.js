'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const extract = require('../extract_app_source.js');
const {
  EXPECTED_PRODUCTION_STYLE_SHA256,
  extractProductionStyle,
} = require('../../src/engine/productionStyle.js');

test('exact SHA-locked production CSS is extracted without external resources', () => {
  const html = fs.readFileSync(extract.PROD, 'utf8');
  const style = extractProductionStyle(html);
  assert.equal(style.cssSha256, EXPECTED_PRODUCTION_STYLE_SHA256);
  assert.equal(style.cssSha256, 'd05974bba0660376cc441c670ce40db14cf805bb772bdc48e61e6fb118eb0b98');
  assert.match(style.css, /\.three\{display:grid;grid-template-columns:1fr 1fr 1fr/);
  assert.match(style.css, /@media\(max-width:520px\)/);
  assert.match(style.css, /\.print-only\{display:none\}/);
  assert.doesNotMatch(style.css, /https?:\/\//i);
  assert.doesNotMatch(style.css, /@import\b/i);
});

test('production CSS extraction fails closed on drift', () => {
  const html = fs.readFileSync(extract.PROD, 'utf8').replace('.print-only{display:none}', '.print-only{display:block}');
  assert.throws(() => extractProductionStyle(html), /production style SHA mismatch/);
});

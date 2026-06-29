'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformLiqLiqShadow } = require('../../src/engine/liquidLiquidUiTransform.js');

const sourcePath = path.join(__dirname, '../../corrected/Kalkulator_build9.6-rc8_step3_4.src.html');
const source = fs.readFileSync(sourcePath, 'utf8');

test('transform adds operating mode state and shadow attributes only to LiqLiq', () => {
  const transformed = transformLiqLiqShadow(source);

  assert.match(transformed, /const \[operatingMode,setOperatingMode\]=useState\("cooling"\)/);
  assert.match(transformed, /data-ll-shadow="true"/);
  assert.match(transformed, /data-ll-operating-mode=\{operatingMode\}/);
  assert.match(transformed, /data-ll-shadow-valid=\{_llShadowValid\?"true":"false"\}/);
  assert.match(transformed, /data-ll-shadow-code=\{_llShadowCode\}/);
  assert.match(transformed, /data-ll-mode-selector="true"/);
  assert.match(transformed, />Cooling<\/button>/);
  assert.match(transformed, />Heating<\/button>/);

  const aaBefore = source.slice(source.indexOf('function AirAir('), source.indexOf('function AirLiquid('));
  const aaAfter = transformed.slice(transformed.indexOf('function AirAir('), transformed.indexOf('function AirLiquid('));
  assert.equal(aaAfter, aaBefore);

  const alBefore = source.slice(source.indexOf('function AirLiquid('), source.indexOf('function LiqLiq('));
  const alAfter = transformed.slice(transformed.indexOf('function AirLiquid('), transformed.indexOf('function LiqLiq('));
  assert.equal(alAfter, alBefore);
});

test('transform leaves legacy displayed calculations Save and export expressions intact', () => {
  const transformed = transformLiqLiqShadow(source);
  const ll = transformed.slice(transformed.indexOf('function LiqLiq('), transformed.indexOf('function EnergyRating'));

  assert.match(ll, /const Qc=mC\*cpC\*Math\.abs\(cToC-cTiC\),Qh=mH\*cpH\*Math\.abs\(hTiC-hToC\);/);
  assert.match(ll, /const eer=pTot>0\?Qc\/pTot:0;/);
  assert.match(ll, /setLog\(p=>\[\{id:Date\.now\(\)/);
  assert.match(ll, /Q:fmt\(Qc,4\),Qw:fmt\(Qh,4\),eer:fmt\(eer,4\)/);
  assert.match(ll, /<button className="bt bt-g" onClick=\{save\}>Save Measurement<\/button>/);
  assert.doesNotMatch(ll, /disabled=\{!_llShadowValid\}/);
});

test('transform is fail-closed when an expected anchor changes', () => {
  const modified = source.replace('const ec=eCol(eer);', 'const ec = eCol(eer);');
  assert.throws(() => transformLiqLiqShadow(modified), /shadow anchor not found/);
});

test('transform is deterministic', () => {
  const first = transformLiqLiqShadow(source);
  const second = transformLiqLiqShadow(source);
  assert.equal(first, second);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { transformLiqLiqCutover } = require('../../src/engine/liquidLiquidCutoverTransform.js');

const root = path.join(__dirname, '../..');
const sourcePath = path.join(root, 'corrected/Kalkulator_build9.6-rc8_step3_4.src.html');
const source = fs.readFileSync(sourcePath, 'utf8');
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const bundleMarker = '/* GENERATED AT BUILD TIME FROM REVIEWED L/L MODULES — DO NOT EDIT */';

function between(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `${start}..${end}`);
  return text.slice(a, b);
}

test('cutover transform is deterministic and injects reviewed browser API', () => {
  const first = transformLiqLiqCutover(source);
  const second = transformLiqLiqCutover(source);
  assert.equal(first, second);
  assert.match(first, /global\.NoditechLiquidLiquid=Object\.freeze/);
  assert.match(first, /evaluateLegacyLiquidLiquidState\(_llState,_llOptions\(null\)\)/);
  assert.match(first, /measurementConfirmation:_llExample\?"example":"confirmed"/);
  assert.match(first, /balanceOverride:override\|\|\( _llOverrideActive\?llOverride:null\)/);
  assert.match(first, /typeof glyEval==='function'\?glyEval:null/);
  assert.doesNotMatch(first, /_llApi\.resolveLiquidProperties\(_llEval\.engineInput/);
  assert.match(first, /_llRecord=_llContract\.record/);
  assert.doesNotMatch(between(first, 'function LiqLiq(', 'function GuideAA('), /const Qc=mC\*cpC/);
});

test('A/A and A/L component bytes remain identical', () => {
  const transformed = transformLiqLiqCutover(source);
  assert.equal(
    between(transformed, 'function AirAir(', 'function AirLiquid('),
    between(source, 'function AirAir(', 'function AirLiquid(')
  );
  assert.equal(
    between(transformed, 'function AirLiquid(', bundleMarker),
    between(source, 'function AirLiquid(', 'function LiqLiq(')
  );
});

test('cutover UI, Save, JSON, CSV and print all read from reportable contract', () => {
  const ll = between(transformLiqLiqCutover(source), 'function LiqLiq(', 'function GuideAA(');
  assert.match(ll, /data-ll-cutover="true"/);
  assert.match(ll, /data-ll-save-allowed=\{_llContract\.saveAllowed\?"true":"false"\}/);
  assert.match(ll, /function _llReportableContract\(\)/);
  assert.match(ll, /const c=_llReportableContract\(\)/);
  assert.match(ll, /if\(!c\|\|!c\.saveAllowed\|\|!c\.record\)return/);
  assert.match(ll, /const r=c\.record/);
  assert.match(ll, /mode:"Liq\/Liq "\+\(r\.operatingMode==="heating"\?"Heating":"Cooling"\)/);
  assert.match(ll, /Q:fmt\(r\.usefulCapacity_kW,4\)/);
  assert.match(ll, /Qcold:fmt\(r\.cold\.capacity_kW,4\),Qhot:fmt\(r\.hot\.capacity_kW,4\)/);
  assert.match(ll, /ll_record:r,ll_json:c\.json,ll_csv:c\.csv,ll_print:c\.print/);
  assert.match(ll, /serializeLiquidLiquidJson\(c\)/);
  assert.match(ll, /serializeLiquidLiquidCsv\(c\)/);
  assert.match(ll, /data-ll-print-contract="true"/);
  assert.match(ll, /data-ll-action="save"[^>]*disabled=\{!_llContract\.saveAllowed\}/);
  assert.match(ll, /data-ll-action="json"/);
  assert.match(ll, /data-ll-action="csv"/);
});

test('blocked projection contains no result or export path', () => {
  const ll = between(transformLiqLiqCutover(source), 'function LiqLiq(', 'function GuideAA(');
  assert.match(ll, /data-ll-result="blocked"/);
  assert.match(ll, /No calculated capacity, COP, record or export is available/);
  assert.match(ll, /_llUi\.resultVisible\?\(/);
  assert.match(ll, /_llUi\.resultVisible&&<UncertaintyPanel/);
});

test('protected production files remain at the locked hash', () => {
  const expected = 'b9f8be84731b9038a814ecc32b876d8856d8526ccf28cd35cc1bb1d74167dc50';
  for (const filename of ['Kalkulator_build9.7-pc6.html', 'index.html', 'Kalkulator.html']) {
    assert.equal(sha(fs.readFileSync(path.join(root, filename))), expected, filename);
  }
});

test('cutover transform fails closed when a LiqLiq anchor changes', () => {
  const modified = source.replace('function LiqLiq(', 'function LiqLiqChanged(');
  assert.throws(() => transformLiqLiqCutover(modified), /LiqLiq component section not found/);
});

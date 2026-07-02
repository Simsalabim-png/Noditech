'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { transformLiqLiqCutover } = require('../../src/engine/liquidLiquidCutoverTransform.js');
const { buildLiquidLiquidBrowserBundle } = require('../../src/engine/liquidLiquidBrowserBundle.js');

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

test('browser bundle exposes the balance override domain factory', () => {
  const bundle = buildLiquidLiquidBrowserBundle();
  assert.match(bundle, /createBalanceOverride:_llBalanceOverride\.createBalanceOverride/);
  assert.match(bundle, /OVERRIDE_REASONS:_llBalanceOverride\.OVERRIDE_REASONS/);
  assert.match(bundle, /ACK_TEXT:_llBalanceOverride\.ACK_TEXT/);

  const context = vm.createContext({});
  vm.runInContext(bundle, context);
  const api = context.NoditechLiquidLiquid;
  assert.ok(api && typeof api.createBalanceOverride === 'function', 'API exposes createBalanceOverride');
  assert.ok(Array.isArray(api.OVERRIDE_REASONS) && api.OVERRIDE_REASONS.some(r => r.id === 'troubleshooting'));
  assert.equal(api.ACK_TEXT.includes('failed balance validation'), true);

  const liquid = api.createBalanceOverride({
    reasonId: 'liquid-primary',
    trustedSide: 'liquid',
    deviationPct: 14.2,
    inputsFingerprint: 'fp-1',
    nowIso: '2026-07-02T10:42:00Z',
  });
  assert.equal(liquid.reasonId, 'liquid-primary');
  assert.equal(liquid.reasonLabel, 'Liquid side is the primary trusted measurement');
  assert.equal(liquid.reasonText, '');
  assert.ok(Object.isFrozen(liquid));

  const air = api.createBalanceOverride({
    reasonId: 'air-primary',
    trustedSide: 'air',
    deviationPct: -12.5,
    inputsFingerprint: 'fp-2',
  });
  assert.equal(air.reasonId, 'air-primary');
  assert.notEqual(air.reasonId, 'other');
  assert.equal(air.reasonLabel, 'Air side is the primary trusted measurement');

  assert.throws(() => api.createBalanceOverride({
    reasonId: 'other',
    reasonText: '',
    trustedSide: 'none',
    deviationPct: 11,
    inputsFingerprint: 'fp-3',
  }), /free text required/);
});

test('override prompt calls the domain factory instead of building a raw literal', () => {
  const ll = between(transformLiqLiqCutover(source), 'function LiqLiq(', 'function GuideAA(');
  assert.match(ll, /_llCanonicalReason=trustedSide==="liquid"\?"liquid-primary":trustedSide==="air"\?"air-primary":"troubleshooting"/);
  assert.match(ll, /_llApi\.OVERRIDE_REASONS\.find\(r=>r\.id===_llCanonicalReason\)/);
  assert.match(ll, /_llApi\.OVERRIDE_REASONS\.find\(r=>r\.id!=="other"&&r\.label===reasonText\)/);
  assert.match(ll, /window\.confirm\(_llApi\.ACK_TEXT\)/);
  assert.match(ll, /_llApi\.createBalanceOverride\(\{reasonId:_llMatched\?_llMatched\.id:"other",reasonText:_llMatched\?"":reasonText,trustedSide:trustedSide,deviationPct:_llUi\.balanceDeviation_pct,inputsFingerprint:_llFingerprint\}\)/);
  assert.doesNotMatch(ll, /return \{acknowledged:true,reasonId:"other"/);
  assert.doesNotMatch(ll, /window\.confirm\("I understand this measurement failed balance validation/);
});

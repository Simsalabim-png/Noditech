'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const transform = read('src/engine/liquidLiquidCutoverTransform.js');
const runner = read('chromium/run_ll_cutover_contract.js');
const harness = read('chromium/test_harness.html');
const compiler = read('tests/compile_app.js');

test('heating Save and log use the authoritative useful capacity', () => {
  assert.ok(transform.includes('mode:"Liq/Liq "+(r.operatingMode==="heating"?"Heating":"Cooling")'));
  assert.ok(transform.includes('Q:fmt(r.usefulCapacity_kW,4)'));
  assert.ok(transform.includes('Qcold:fmt(r.cold.capacity_kW,4),Qhot:fmt(r.hot.capacity_kW,4)'));
  assert.ok(transform.includes('_llRecord=_llContract.record'));
  assert.ok(!transform.includes('_llApi.resolveLiquidProperties(_llEval.engineInput'));
});

test('browser evidence uses locked production CSS and mode-aware assertions', () => {
  assert.ok(harness.includes('/chromium/generated/production.css'));
  assert.ok(compiler.includes('production_css_sha256'));
  assert.ok(runner.includes('BUILD.production_css'));
  assert.ok(runner.includes('CSS.desktop_grid'));
  assert.ok(runner.includes('LL.heating_log_capacity'));
  assert.ok(runner.includes('LL.global_csv_heating'));
  assert.ok(runner.includes('LL.print_no_print_hidden'));
  assert.ok(runner.includes('data-ll-hot-capacity'));
  assert.ok(runner.includes('window.matchMedia("(max-width:520px)").matches'));
});

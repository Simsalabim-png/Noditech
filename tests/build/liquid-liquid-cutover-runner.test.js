'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const runner = fs.readFileSync(path.join(root, 'chromium/run_ll_cutover_contract.js'), 'utf8');

test('cutover Chromium runner covers required gates', () => {
  for (const marker of [
    'AA.desktop', 'AA.mobile', 'AL.desktop', 'AL.mobile',
    'LL.cooling_good', 'LL.heating_active', 'LL.impossible_blocked',
    'LL.glycol_provider', 'LL.glycol_good', 'LL.freeze_guard', 'LL.freeze_no_values',
    'LL.json_contract', 'LL.csv_contract', 'LL.saved_record', 'LL.print',
    'LL.mobile', 'LL.mobile.good',
    'GLOBAL.no_page_errors', 'GLOBAL.no_console_errors', 'GLOBAL.offline',
  ]) assert.match(runner, new RegExp(marker.replace('.', '\\.')));
});

test('runner requires exact cutover and production glycol metadata', () => {
  assert.match(runner, /candidate_mode==='liquid-liquid-cutover'/);
  assert.match(runner, /8beabb9f3c61dfeef61e1fc487a4972487231cc70426c442cafa286d8f05c30d/);
  assert.match(runner, /CoolProp 7\.2\.0 INCOMP/);
  assert.match(runner, /source_equivalence\.json/);
});

test('runner addresses named L/L fields and waits for contract state', () => {
  assert.match(runner, /data-ll-field/);
  assert.match(runner, /data-ll-select/);
  assert.match(runner, /evalWait\(S,'__llh\.attr\("data-ll-code"\)===/);
  assert.doesNotMatch(runner, /input\[type=number\]/);
});

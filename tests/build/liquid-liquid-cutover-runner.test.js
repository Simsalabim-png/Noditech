'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const runner = fs.readFileSync(path.join(root, 'chromium/run_ll_cutover.js'), 'utf8');

test('cutover Chromium runner covers required gates', () => {
  for (const marker of [
    'AA.desktop', 'AA.mobile', 'LL.cooling_good', 'LL.heating_active',
    'LL.impossible_blocked', 'LL.glycol_provider', 'LL.freeze_guard',
    'LL.json_contract', 'LL.csv_contract', 'LL.print',
    'GLOBAL.no_page_errors', 'GLOBAL.no_console_errors', 'GLOBAL.offline',
  ]) assert.match(runner, new RegExp(marker.replace('.', '\\.')));
});

test('runner requires explicit cutover compile metadata', () => {
  assert.match(runner, /candidate_mode==='liquid-liquid-cutover'/);
  assert.match(runner, /source_equivalence\.json/);
});

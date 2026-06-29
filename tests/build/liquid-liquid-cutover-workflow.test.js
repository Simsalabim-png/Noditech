'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/verify-develop.yml'), 'utf8');

test('stacked cutover PR base is included in pull request gates', () => {
  assert.match(workflow, /pull_request:[\s\S]*feature\/liquid-liquid-mode-aware-correctness/);
});

test('cutover CI runs compile, existing Chromium, dedicated Chromium and final freeze gate', () => {
  const compile = workflow.indexOf('Compile explicit L/L cutover candidate');
  const existing = workflow.indexOf('Run full existing Chromium regression on cutover candidate');
  const dedicated = workflow.indexOf('Run L/L desktop mobile Save export print gate');
  const freeze = workflow.indexOf('Reverify protected files after browser gates');
  assert.ok(compile >= 0 && existing > compile && dedicated > existing && freeze > dedicated);
  assert.match(workflow, /NODITECH_LL_CUTOVER=1 node tests\/compile_app\.js/);
  assert.match(workflow, /glycol_dataset_assignment_sha256/);
  assert.match(workflow, /glycol_dataset_object_sha256/);
  assert.match(workflow, /node chromium\/run_chromium\.js/);
  assert.match(workflow, /node chromium\/run_ll_cutover_contract\.js/);
});

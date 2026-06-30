'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORK = path.resolve(__dirname, '..', '..');
if (!process.env.NODITECH_REPO_FILES) process.env.NODITECH_REPO_FILES = WORK;
const haveSources = fs.existsSync(path.join(process.env.NODITECH_REPO_FILES, 'Kalkulator_build9.7-pc6.html'));
const skip = !haveSources && 'real source files not present';
const { build } = require('../../build/assemble-pc2.js');

test('default pc2 build remains production mode', { skip }, () => {
  const result = build();
  assert.equal(result.mode, 'production');
  assert.equal(result.html.includes('data-ll-cutover="true"'), false);
});

test('L/L release build is deterministic and includes the reviewed cutover', { skip }, () => {
  const a = build({ liquidLiquidCutover: true });
  const b = build({ liquidLiquidCutover: true });
  assert.equal(a.mode, 'liquid-liquid-cutover');
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.html, b.html);
  assert.ok(a.html.includes('data-ll-cutover'));
  assert.ok(a.html.includes('data-ll-useful-capacity'));
  assert.ok(a.html.includes('NoditechLiquidLiquid'));
  assert.ok(a.html.includes('Liq/Liq '));
  assert.ok(a.html.includes('Heating'));
  assert.ok(a.html.includes('noditech-liquid-liquid.json'));
  assert.ok(a.html.includes('CoolProp 7.2.0 INCOMP'));
  assert.equal(a.html.includes('type="text/babel"'), false);
  assert.equal(/<script\s+src=["']https?:/i.test(a.html), false);
  assert.equal(a.liquidLiquidDataset.assignmentSha256, '8beabb9f3c61dfeef61e1fc487a4972487231cc70426c442cafa286d8f05c30d');
  assert.equal(a.liquidLiquidDataset.objectSha256, 'aae380d254d1578c64c453a4c6c42799ce20a53bc75f24fc44032b94c494141c');
});

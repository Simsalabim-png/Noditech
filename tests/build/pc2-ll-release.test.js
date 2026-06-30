'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORK = path.resolve(__dirname, '..', '..');
if (!process.env.NODITECH_REPO_FILES) process.env.NODITECH_REPO_FILES = WORK;
const haveSources = fs.existsSync(path.join(process.env.NODITECH_REPO_FILES, 'Kalkulator_build9.7-pc6.html'));
const skip = !haveSources && 'real source files not present';
const baseBuilder = require('../../build/assemble-pc2.js');
const releaseBuilder = require('../../build/assemble-pc2-ll-release.js');

test('default pc2 builder remains byte-identical and contains no L/L cutover', { skip }, () => {
  const a = baseBuilder.build();
  const b = baseBuilder.build();
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.html, b.html);
  assert.equal(a.html.includes('data-ll-cutover'), false);
});

test('L/L release wrapper is deterministic and includes reviewed cutover', { skip }, () => {
  const a = releaseBuilder.build();
  const b = releaseBuilder.build();
  assert.equal(a.mode, 'liquid-liquid-cutover');
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.html, b.html);
  assert.ok(a.html.includes('data-ll-cutover'));
  assert.ok(a.html.includes('data-ll-useful-capacity'));
  assert.ok(a.html.includes('NoditechLiquidLiquid'));
  assert.ok(a.html.includes('noditech-liquid-liquid.json'));
  assert.ok(a.html.includes('CoolProp 7.2.0 INCOMP'));
  assert.equal(a.html.includes('type="text/babel"'), false);
  assert.equal(/<script\s+src=["']https?:/i.test(a.html), false);
  assert.equal(a.liquidLiquidDataset.assignmentSha256, '8beabb9f3c61dfeef61e1fc487a4972487231cc70426c442cafa286d8f05c30d');
  assert.equal(a.liquidLiquidDataset.objectSha256, 'aae380d254d1578c64c453a4c6c42799ce20a53bc75f24fc44032b94c494141c');
});

test('wrapper fails closed if original builder anchors drift', () => {
  assert.throws(() => releaseBuilder.replaceOnce('abc', 'missing', 'x', 'test'), /anchor not found/);
  assert.throws(() => releaseBuilder.replaceOnce('aa', 'a', 'x', 'test'), /not unique/);
});

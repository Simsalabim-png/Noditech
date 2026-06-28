'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORK = path.resolve(__dirname, '..', '..');
if (!process.env.NODITECH_REPO_FILES) {
  process.env.NODITECH_REPO_FILES = WORK;
}
const REPO = process.env.NODITECH_REPO_FILES;
const haveSources = fs.existsSync(path.join(REPO, 'Kalkulator_build9.7-pc6.html'));

const { build } = require('../../build/assemble-pc2.js');

test('pc2 assembler builds and is deterministic', { skip: !haveSources && 'real source files not present' }, () => {
  const a = build();
  const b = build();
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.html, b.html);
  assert.match(a.sha256, /^[0-9a-f]{64}$/);
});

test('pc2 is self-contained (no external/network references, no Babel-in-browser)', { skip: !haveSources && 'sources missing' }, () => {
  const { html } = build();
  assert.equal(/<script\s+src=["']https?:/i.test(html), false, 'no external script src');
  assert.equal(html.includes('cdnjs.cloudflare.com'), false, 'no cdnjs references');
  assert.equal(/type=["']text\/babel["']/.test(html), false, 'no in-browser babel');
});

test('Air/Air UI uses computeAirAir as the single capacity source (no duplicate formula)', { skip: !haveSources && 'sources missing' }, () => {
  const { html } = build();
  assert.ok(html.includes('NoditechAirAir.computeAirAir'), 'computeAirAir wired into the app');
  assert.ok(html.includes('NoditechPsychrometrics'), 'shared psychrometrics inlined');
  assert.equal(html.includes('mf=afs/vL'), false, 'old inline capacity formula removed');
});

test('frozen pc6 file is not modified by the build', { skip: !haveSources && 'sources missing' }, () => {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, 'Kalkulator_build9.7-pc6.html'))).digest('hex');
  assert.equal(sha, 'b9f8be84731b9038a814ecc32b876d8856d8526ccf28cd35cc1bb1d74167dc50');
});

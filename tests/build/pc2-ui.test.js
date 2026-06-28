'use strict';

/**
 * pc2 acceptance tests (15 points). UI rendering itself is verified by the operator
 * browser smoke test; here we verify everything checkable offline: the assembled
 * artifact's wiring (static assertions on the built HTML) and the shared engine
 * behavior. Build is performed once and shared.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORK = path.resolve(__dirname, '..', '..');
if (!process.env.NODITECH_REPO_FILES) process.env.NODITECH_REPO_FILES = WORK;
const REPO = process.env.NODITECH_REPO_FILES;
const haveSources = fs.existsSync(path.join(REPO, 'Kalkulator_build9.7-pc6.html'));
const skip = !haveSources && 'real source files not present';

const { build } = require('../../build/assemble-pc2.js');
const { computeAirAir } = require('../../src/engine/airAir.js');

const HTML = haveSources ? build().html : '';
const P = 101325;
const baseInput = (over) => Object.assign({
  entering: { inputMethod: 'rh', dbC: 26.7, rhPct: 50 },
  leaving: { inputMethod: 'rh', dbC: 12, rhPct: 90 },
  airflowM3h: 2000, airflowReference: 'leaving', pressurePa: P,
}, over);

test('1. entering input method (DB+RH / DB+WB) selectable', { skip }, () => {
  assert.ok(HTML.includes('Entering input method'));
  assert.ok(HTML.includes('data-testid="entering-method"') || HTML.includes('"entering-method"'));
  assert.ok(/setEMethod/.test(HTML));
});

test('2. leaving input method (DB+RH / DB+WB) selectable', { skip }, () => {
  assert.ok(HTML.includes('Leaving input method'));
  assert.ok(HTML.includes('"leaving-method"'));
  assert.ok(/setLMethod/.test(HTML));
});

test('3. UI sends only the selected field via sideInput (no stale rhPct/wbC)', { skip }, () => {
  assert.ok(/sideInput\(\s*eMethod/.test(HTML), 'entering uses sideInput(eMethod,...)');
  assert.ok(/sideInput\(\s*lMethod/.test(HTML), 'leaving uses sideInput(lMethod,...)');
  // the old object form that sent both fields at once must be gone
  assert.equal(/inputMethod:\s*eMethod/.test(HTML), false, 'no inputMethod:eMethod object form');
});

test('4. UI sends chosen airflowReference to the engine', { skip }, () => {
  assert.ok(/airflowReference: afRef|airflowReference:afRef/.test(HTML));
});

test('5. empty airflow reference => blocked (engine)', () => {
  const r = computeAirAir(baseInput({ airflowReference: undefined }));
  assert.equal(r.status, 'blocked');
  assert.equal(r.code, 'airflow_reference_missing');
});

test('6. WB > DB => blocked (engine)', () => {
  const r = computeAirAir(baseInput({ entering: { inputMethod: 'wb', dbC: 20, wbC: 25 } }));
  assert.equal(r.status, 'blocked');
  assert.equal(r.code, 'wb_gt_db');
});

test('7. derived RH is shown when WB method is selected', { skip }, () => {
  assert.ok(HTML.includes('RH (derived)'));
});

test('8. UI capacity comes from computeAirAir', { skip }, () => {
  assert.ok(HTML.includes('NoditechAirAir.computeAirAir'));
  assert.ok(HTML.includes('NoditechPsychrometrics'));
});

test('9. old inline Q/Qs/Ql/SHR/mass-flow formula is absent', { skip }, () => {
  assert.equal(HTML.includes('mf=afs/vL'), false);
  assert.equal(HTML.includes('cpMA=1.006+1.86*WE'), false);
  assert.equal(HTML.includes('const qs=Q*sr,ql=Q-qs'), false);
});

test('10. export/envelope record carries inputMethod and airflowReference', { skip }, () => {
  assert.ok(/engineStatus: ?_aa\.status/.test(HTML));
  assert.ok(/eMethod/.test(HTML) && /lMethod/.test(HTML) && /afRef/.test(HTML));
  // blocked result cannot be saved as valid (save guard, as compiled by Babel)
  assert.ok(/if \(!_aaOK\)/.test(HTML), 'save guard present');
});

test('11. Q_total = Q_sensible + Q_latent within tolerance (engine)', () => {
  const r = computeAirAir(baseInput()).result;
  assert.ok(Math.abs(r.totalCapacityKW - (r.sensibleCapacityKW + r.latentCapacityKW)) <= 1e-9);
});

test('12. no NaN/Infinity in a valid result (engine)', () => {
  const r = computeAirAir(baseInput());
  for (const v of [r.result.totalCapacityKW, r.result.sensibleCapacityKW, r.result.latentCapacityKW, r.result.dryAirMassFlowKgS, r.result.shr]) {
    assert.ok(Number.isFinite(v));
  }
});

test('13. artifact has no external runtime dependencies', { skip }, () => {
  assert.equal(/<script[^>]*src=["']https?:/i.test(HTML), false, 'no external script src');
  assert.equal(/<link[^>]*href=["']https?:/i.test(HTML), false, 'no external link href');
  assert.equal(/<img[^>]*src=["']https?:/i.test(HTML), false, 'no external img src');
  assert.equal(/url\(\s*["']?https?:/i.test(HTML), false, 'no external css url()');
  assert.equal(/@import/i.test(HTML), false, 'no @import');
  assert.equal(HTML.includes('fonts.googleapis'), false, 'no Google Fonts');
  assert.equal(HTML.includes('cdnjs.cloudflare.com'), false, 'no cdnjs');
});

test('engine code/status exposed + corrective text + testids for all inputs', { skip }, () => {
  assert.ok(HTML.includes('data-engine-status'), 'data-engine-status present');
  assert.ok(HTML.includes('data-engine-code'), 'data-engine-code present');
  assert.ok(HTML.includes('data-engine-field'), 'data-engine-field present');
  assert.ok(HTML.includes('"engine-corrective"'), 'corrective text testid present');
  for (const id of ['entering-db', 'leaving-db', 'airflow', 'pressure', 'unit-']) {
    assert.ok(HTML.includes(`"${id}`), `data-testid ${id} present`);
  }
});

test('derived RH is null-guarded (no 0.00% fallback) in the artifact', { skip }, () => {
  assert.ok(/eRHderived=\(?_eSt/.test(HTML) || HTML.includes('state blocked'), 'derived RH guarded / blocked label present');
  assert.ok(HTML.includes('state blocked'), 'explicit blocked label for invalid derived state');
});

test('14. two builds produce an identical SHA-256', { skip }, () => {
  const a = build();
  const b = build();
  assert.equal(a.sha256, b.sha256);
  assert.match(a.sha256, /^[0-9a-f]{64}$/);
});

test('15. all available frozen files are untouched', { skip }, () => {
  const h = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, f))).digest('hex');
  assert.equal(h('Kalkulator_build9.7-pc6.html'), 'b9f8be84731b9038a814ecc32b876d8856d8526ccf28cd35cc1bb1d74167dc50');
  assert.equal(h('corrected/Kalkulator_build9.6-rc8_step3_4.src.html'), '8a0e39b68116c87797f380756ec4affd6ed5d79e3aef03521d5e63e58d82813b');
});

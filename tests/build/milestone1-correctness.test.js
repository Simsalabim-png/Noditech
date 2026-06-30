'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const airAir = require('../../src/engine/airAir.js');
const {
  convertDisplayed,
  fromC,
  toC,
} = require('../../src/ui/milestone1Transforms.js');
const releaseBuilder = require('../../build/assemble-pc2-ll-release.js');

function approx(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual), `${label}: actual must be finite`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected} ± ${tolerance}`);
}

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist in built artifact`);
  const brace = source.indexOf('{', start);
  assert.ok(brace >= 0, `${name} opening brace missing`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} closing brace missing`);
}

test('temperature display conversion is reversible within the reviewed tolerance', () => {
  const cases = [-40, -5, 0, 7, 12, 14, 26, 35, 80, 120];
  for (const c of cases) {
    const f = fromC(c, 'F');
    const roundTrip = toC(f, 'F');
    approx(roundTrip, c, 1e-12, `${c} C round-trip`);
    approx(convertDisplayed(c, 'C', 'F'), f, 1e-12, `${c} C to F`);
    approx(convertDisplayed(f, 'F', 'C'), c, 1e-12, `${f} F to C`);
    assert.ok(Math.abs(roundTrip - c) <= 0.05, 'reviewed display tolerance must be met');
  }
});

test('Air/Air production golden vector remains numerically frozen', () => {
  const result = airAir.computeAirAir({
    entering: airAir.sideInput('rh', 26, 50),
    leaving: airAir.sideInput('rh', 14, 90),
    airflowM3h: 600,
    airflowReference: 'leaving',
    pressurePa: 101500,
  });
  assert.notEqual(result.status, 'blocked');
  assert.equal(result.code, 'ok');
  const r = result.result;
  approx(r.entering.enthalpyKJkg, 52.86322894659911, 1e-12, 'entering enthalpy');
  approx(r.leaving.enthalpyKJkg, 36.68205143692052, 1e-12, 'leaving enthalpy');
  approx(r.leaving.specificVolumeM3kg, 0.8237811111848489, 1e-12, 'leaving specific volume');
  approx(r.dryAirMassFlowKgS, 0.20231911657569943, 1e-12, 'dry air mass flow');
  approx(r.totalCapacityKW, 3.2737615389127486, 1e-12, 'total capacity');
  approx(r.sensibleCapacityKW, 2.4897037417843615, 1e-12, 'sensible capacity');
  approx(r.latentCapacityKW, 0.7840577971283872, 1e-12, 'latent capacity');
  approx(r.shr, 0.7605024716037255, 1e-12, 'SHR');
});

test('Air/Liquid production solver golden vectors remain frozen', () => {
  const built = releaseBuilder.build();
  const fnText = extractNamedFunction(built.html, 'engcalcAirLiquidSolve');
  const solve = vm.runInNewContext(`(${fnText})`, { isFinite, Math, Number });
  const cooling = solve({
    operatingMode: 'cooling', Tin: 12, Tout: 7, flow_Ls: 0.5,
    rho: 1, cp: 4.18, glyValid: true, useGly: false, glyType: 'EG', pw: 1.2,
  });
  assert.equal(cooling.valid, true);
  approx(cooling.Q, 10.45, 1e-12, 'A/L cooling capacity');
  approx(cooling.cop, 8.708333333333334, 1e-12, 'A/L cooling COP');
  approx(cooling.expectedAirSigned, 11.649999999999999, 1e-12, 'A/L cooling expected air');

  const heating = solve({
    operatingMode: 'heating', Tin: 7, Tout: 12, flow_Ls: 0.5,
    rho: 1, cp: 4.18, glyValid: true, useGly: false, glyType: 'EG', pw: 1.2,
  });
  assert.equal(heating.valid, true);
  approx(heating.Q, 10.45, 1e-12, 'A/L heating capacity');
  approx(heating.cop, 8.708333333333334, 1e-12, 'A/L heating COP');
  approx(heating.expectedAirSigned, -9.25, 1e-12, 'A/L heating expected air');
});

test('Milestone 1 release build is deterministic and contains reviewed contracts', () => {
  const a = releaseBuilder.build();
  const b = releaseBuilder.build();
  assert.equal(a.mode, 'liquid-liquid-cutover');
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.html, b.html);
  assert.match(a.html, /NoditechUnitRegistry/);
  assert.match(a.html, /data-aa-result-status/);
  assert.match(a.html, /data-chart-status/);
  assert.match(a.html, /data-ll-cop/);
  assert.match(a.html, /copCooling/);
  assert.match(a.html, /copHeating/);
  assert.doesNotMatch(a.html, /Q=_aaOK\?_aaRes\.totalCapacityKW:0/);
  assert.doesNotMatch(a.html, /eer=_llUi\.cop,copHeat=/);
});

'use strict';

const crypto = require('crypto');
const { applyFieldSafetyArtifactFinalizer } = require('./fieldSafetyArtifactFinalizer.js');

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function replaceOnce(source, anchor, replacement, label) {
  const first = source.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found`);
  if (source.indexOf(anchor, first + anchor.length) >= 0) throw new Error(`${label}: anchor not unique`);
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

function mapSection(source, startAnchor, endAnchor, transform, label) {
  const start = source.indexOf(startAnchor);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  if (start < 0 || end < 0) throw new Error(`${label}: section missing`);
  const body = source.slice(start, end);
  const next = transform(body);
  if (body === next) throw new Error(`${label}: no change`);
  return source.slice(0, start) + next + source.slice(end);
}

function section(source, startAnchor, endAnchor) {
  const start = source.indexOf(startAnchor);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  if (start < 0 || end < 0) throw new Error(`section missing: ${startAnchor}`);
  return source.slice(start, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function projectRange(body, value, setter, minC, maxC, label) {
  const strict = new RegExp(`(^[ \\t]+)value: ${escapeRegExp(value)},\\n\\1onChange: ${escapeRegExp(setter)},\\n\\1min: ${minC},\\n\\1max: ${maxC},`, 'gm');
  let matches = [...body.matchAll(strict)];
  let re = strict;
  if (matches.length !== 1) {
    re = new RegExp(`(^[ \\t]+)value: ${escapeRegExp(value)},\\n(\\1onChange: [^\\n]+,\\n)\\1min: ${minC},\\n\\1max: ${maxC},`, 'gm');
    matches = [...body.matchAll(re)];
  }
  if (matches.length !== 1) throw new Error(`${label}: anchor count ${matches.length}`);
  const minF = minC * 9 / 5 + 32;
  const maxF = maxC * 9 / 5 + 32;
  return body.replace(re, (match, indent, onChangeLine) => {
    const onChange = typeof onChangeLine === 'string' ? onChangeLine : `${indent}onChange: ${setter},\n`;
    return `${indent}value: ${value},\n${onChange}${indent}min: unit === "F" ? ${minF} : ${minC},\n${indent}max: unit === "F" ? ${maxF} : ${maxC},`;
  });
}

function applyRefrigerantProjection(html) {
  return mapSection(html, 'function RefSec({', 'function validateInputs(', body => {
    let out = replaceOnce(body, '  const [t2meas, setT2meas] = React.useState(null);', '  const [t2meas, setT2meas] = useCanonicalTemperature(null, unit);', 'RefSec measured discharge canonical state');
    out = projectRange(out, 'sT', 'setST', -60, 100, 'RefSec suction range');
    out = projectRange(out, 'liqT', 'setLiqT || (v => {})', -20, 80, 'RefSec liquid range');
    out = projectRange(out, 't2meas', 'setT2meas', -20, 200, 'RefSec discharge range');
    return out;
  }, 'RefSec projection');
}

function applyAirLiquidRanges(html) {
  return mapSection(html, 'function AirLiquid({', 'function LiqLiq({', body => {
    let out = projectRange(body, 'wTi', 'setWTi', -30, 50, 'A/L inlet range');
    out = projectRange(out, 'wTo', 'setWTo', -30, 50, 'A/L outlet range');
    return out;
  }, 'A/L ranges');
}

function applyLiquidLiquidRanges(html) {
  return mapSection(html, 'function LiqLiq({', 'function GuideAA(', body => {
    let out = projectRange(body, 'cTi', 'setCTi', -30, 50, 'L/L cold inlet range');
    out = projectRange(out, 'cTo', 'setCTo', -30, 50, 'L/L cold outlet range');
    out = projectRange(out, 'hTi', 'setHTi', -30, 80, 'L/L hot inlet range');
    out = projectRange(out, 'hTo', 'setHTo', -30, 80, 'L/L hot outlet range');
    return out;
  }, 'L/L ranges');
}

function applyAirAirFinalGuards(html) {
  return mapSection(html, 'function AirAir({', 'function AirLiquid({', body => {
    let out = replaceOnce(body, '  const _aaChartOK = _aaOK && [pAtm, eC, lC, eRH, lRH, WE, WL].every(Number.isFinite);', '  const _aaChartOK = _aaOK && _aaRes && [_aaRes.pressurePa, _aaRes.entering.dbC, _aaRes.entering.rhPct, _aaRes.entering.humidityRatio, _aaRes.entering.enthalpyKJkg, _aaRes.leaving.dbC, _aaRes.leaving.rhPct, _aaRes.leaving.humidityRatio, _aaRes.leaving.enthalpyKJkg].every(Number.isFinite);', 'A/A chart contract readiness');
    out = replaceOnce(out, '    ec = eCol(eer);', "    ec = Number.isFinite(_aaContract.eer) ? eCol(_aaContract.eer) : '#8a7a65';", 'A/A blocked EER colour');
    out = replaceOnce(out, "      width: Math.min(100, eer / 6 * 100) + '%',", "      width: Number.isFinite(_aaContract.eer) ? Math.min(100, _aaContract.eer / 6 * 100) + '%' : '0%',", 'A/A blocked EER width');
    out = replaceOnce(out, `    pAtm: pAtm,\n    points: [{\n      T: eC,\n      RH: eRHderived,\n      W: WE,\n      h: hE,`, `    pAtm: _aaRes.pressurePa,\n    points: [{\n      T: _aaRes.entering.dbC,\n      RH: _aaRes.entering.rhPct,\n      W: _aaRes.entering.humidityRatio,\n      h: _aaRes.entering.enthalpyKJkg,`, 'A/A entering chart state');
    out = replaceOnce(out, `      T: lC,\n      RH: lRHderived,\n      W: WL,\n      h: hL,`, `      T: _aaRes.leaving.dbC,\n      RH: _aaRes.leaving.rhPct,\n      W: _aaRes.leaving.humidityRatio,\n      h: _aaRes.leaving.enthalpyKJkg,`, 'A/A leaving chart state');
    return out;
  }, 'A/A final guards');
}

function applyMilestone1Hooks(html) {
  let out = html;
  out = replaceOnce(out, "'aria-invalid': bad ? 'true' : 'false',", "'data-m1-field': props['data-m1-field'],\n    min: min,\n    max: max,\n    'aria-invalid': bad ? 'true' : 'false',", 'FloatInput data-m1-field forward');
  out = replaceOnce(out, 'value: wTi,\n    onChange: setWTi,', 'value: wTi,\n    "data-m1-field": "al-liquid-inlet",\n    onChange: setWTi,', 'A/L inlet hook');
  out = replaceOnce(out, 'value: wTo,\n    onChange: setWTo,', 'value: wTo,\n    "data-m1-field": "al-liquid-outlet",\n    onChange: setWTo,', 'A/L outlet hook');
  out = replaceOnce(out, 'value: sT,\n    onChange: setST,', 'value: sT,\n    "data-m1-field": "ref-suction-temperature",\n    onChange: setST,', 'ref suction hook');
  out = replaceOnce(out, 'value: liqT,\n    onChange: setLiqT || (v => {}),', 'value: liqT,\n    "data-m1-field": "ref-liquid-temperature",\n    onChange: setLiqT || (v => {}),', 'ref liquid hook');
  out = replaceOnce(out, 'value: t2meas,\n      onChange: setT2meas,', 'value: t2meas,\n      "data-m1-field": "ref-discharge-temperature",\n      onChange: setT2meas,', 'ref discharge hook');
  out = replaceOnce(out, 'React.createElement("div", {\n    className: "rv",\n    style: {\n      color: \'#0ea5e9\'\n    }\n  }, fmt(Qw, 4), " kW")', 'React.createElement("div", {\n    "data-m1-result": "al-liquid-q",\n    className: "rv",\n    style: {\n      color: \'#0ea5e9\'\n    }\n  }, fmt(Qw, 4), " kW")', 'A/L liquid Q hook');
  out = replaceOnce(out, '"data-testid": "total-capacity"', '"data-testid": "total-capacity",\n    "data-m1-result": "aa-total-capacity"', 'A/A total capacity hook');
  out = replaceOnce(out, 'onClick: save,\n    disabled: !_aaOK,', 'onClick: save,\n    "data-m1-save": "air-air",\n    disabled: !_aaOK,', 'A/A save hook');
  out = replaceOnce(out, 'onClick: save,\n    disabled: !_eval.saveAllowed,', 'onClick: save,\n    "data-m1-save": "air-liquid",\n    disabled: !_eval.saveAllowed,', 'A/L save hook');
  return out;
}

const EXPECTED_M1_HOOKS = Object.freeze([
  '"data-m1-field": "al-liquid-inlet"',
  '"data-m1-field": "al-liquid-outlet"',
  '"data-m1-field": "ref-suction-temperature"',
  '"data-m1-field": "ref-liquid-temperature"',
  '"data-m1-field": "ref-discharge-temperature"',
  '"data-m1-result": "al-liquid-q"',
  '"data-m1-result": "aa-total-capacity"',
  '"data-m1-save": "air-air"',
  '"data-m1-save": "air-liquid"',
]);

function assertMilestone1Hooks(html) {
  for (const hook of EXPECTED_M1_HOOKS) {
    const count = html.split(hook).length - 1;
    if (count !== 1) throw new Error(`milestone1 hook post-condition: ${hook} must appear exactly once (found ${count})`);
  }
  return html;
}

const BUILD_IDENTITY = { version: 'Build 9.8-pc2', date: '2026-06-30' };

function appScriptBounds(html) {
  const marker = 'function App()';
  const m = html.indexOf(marker);
  if (m < 0) throw new Error('build identity: function App() not found');
  if (html.indexOf(marker, m + marker.length) >= 0) throw new Error('build identity: function App() not unique');
  const open = html.lastIndexOf('<script', m);
  if (open < 0) throw new Error('build identity: app <script> open not found');
  const openEnd = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', m);
  if (close < 0) throw new Error('build identity: app </script> close not found');
  return { start: openEnd, end: close };
}

function applyBuildIdentity(html, identity = BUILD_IDENTITY) {
  let out = replaceOnce(html, 'const BUILD_VERSION = "Build 9.6-rc8";', `const BUILD_VERSION = "${identity.version}";`, 'BUILD_VERSION');
  out = replaceOnce(out, 'const BUILD_DATE = "2026-06-25";', `const BUILD_DATE = "${identity.date}";`, 'BUILD_DATE');
  out = replaceOnce(out, 'const BUILD_HASH = "b6ebc906e926";', 'const BUILD_HASH = "";', 'BUILD_HASH blank');
  const { start, end } = appScriptBounds(out);
  const hash = sha256(out.slice(start, end)).slice(0, 12);
  out = replaceOnce(out, 'const BUILD_HASH = "";', `const BUILD_HASH = "${hash}";`, 'BUILD_HASH inject');
  return { html: out, version: identity.version, date: identity.date, hash };
}

function applyMilestone1ArtifactFinalizer(html) {
  if (typeof html !== 'string' || !html.includes('function useCanonicalTemperature(initialC, unit)')) throw new Error('Milestone 1 transformed artifact required');
  let out = applyRefrigerantProjection(html);
  out = applyAirLiquidRanges(out);
  out = applyLiquidLiquidRanges(out);
  out = applyAirAirFinalGuards(out);
  out = applyMilestone1Hooks(out);
  out = applyFieldSafetyArtifactFinalizer(out).html;
  const identity = applyBuildIdentity(out);
  out = identity.html;
  assertMilestone1Hooks(out);
  const after = {
    airAir: sha256(section(out, 'function AirAir({', 'function AirLiquid({')),
    airLiquid: sha256(section(out, 'function AirLiquid({', 'function LiqLiq({')),
  };
  return { html: out, after, sha256: sha256(out), identity: { version: identity.version, date: identity.date, hash: identity.hash } };
}

module.exports = {
  applyMilestone1ArtifactFinalizer,
  applyMilestone1Hooks,
  assertMilestone1Hooks,
  EXPECTED_M1_HOOKS,
  applyBuildIdentity,
  appScriptBounds,
  BUILD_IDENTITY,
  applyAirAirFinalGuards,
  applyAirLiquidRanges,
  applyLiquidLiquidRanges,
  applyRefrigerantProjection,
  projectRange,
  replaceOnce,
  sha256,
};

'use strict';

const crypto = require('crypto');

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

function projectRange(body, value, setter, minC, maxC, label) {
  const anchor = `    value: ${value},\n    onChange: ${setter},\n    min: ${minC},\n    max: ${maxC},`;
  const minF = minC * 9 / 5 + 32;
  const maxF = maxC * 9 / 5 + 32;
  const replacement = `    value: ${value},\n    onChange: ${setter},\n    min: unit === "F" ? ${minF} : ${minC},\n    max: unit === "F" ? ${maxF} : ${maxC},`;
  return replaceOnce(body, anchor, replacement, label);
}

function applyRefrigerantProjection(html) {
  return mapSection(html, 'function RefSec({', 'function validateInputs(', body => {
    let out = replaceOnce(
      body,
      '  const [t2meas, setT2meas] = React.useState(null);',
      '  const [t2meas, setT2meas] = useCanonicalTemperature(null, unit);',
      'RefSec measured discharge canonical state'
    );
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
    let out = replaceOnce(
      body,
      '  const _aaChartOK = _aaOK && [pAtm, eC, lC, eRH, lRH, WE, WL].every(Number.isFinite);',
      '  const _aaChartOK = _aaOK && _aaRes && [_aaRes.pressurePa, _aaRes.entering.dbC, _aaRes.entering.rhPct, _aaRes.entering.humidityRatio, _aaRes.entering.enthalpyKJkg, _aaRes.leaving.dbC, _aaRes.leaving.rhPct, _aaRes.leaving.humidityRatio, _aaRes.leaving.enthalpyKJkg].every(Number.isFinite);',
      'A/A chart contract readiness'
    );
    out = replaceOnce(
      out,
      '    ec = eCol(eer);',
      "    ec = Number.isFinite(_aaContract.eer) ? eCol(_aaContract.eer) : '#8a7a65';",
      'A/A blocked EER colour'
    );
    out = replaceOnce(
      out,
      "      width: Math.min(100, eer / 6 * 100) + '%',",
      "      width: Number.isFinite(_aaContract.eer) ? Math.min(100, _aaContract.eer / 6 * 100) + '%' : '0%',",
      'A/A blocked EER width'
    );
    out = replaceOnce(
      out,
      `    pAtm: pAtm,\n    points: [{\n      T: eC,\n      RH: eRHderived,\n      W: WE,\n      h: hE,`,
      `    pAtm: _aaRes.pressurePa,\n    points: [{\n      T: _aaRes.entering.dbC,\n      RH: _aaRes.entering.rhPct,\n      W: _aaRes.entering.humidityRatio,\n      h: _aaRes.entering.enthalpyKJkg,`,
      'A/A entering chart state'
    );
    out = replaceOnce(
      out,
      `      T: lC,\n      RH: lRHderived,\n      W: WL,\n      h: hL,`,
      `      T: _aaRes.leaving.dbC,\n      RH: _aaRes.leaving.rhPct,\n      W: _aaRes.leaving.humidityRatio,\n      h: _aaRes.leaving.enthalpyKJkg,`,
      'A/A leaving chart state'
    );
    return out;
  }, 'A/A final guards');
}

function applyMilestone1ArtifactFinalizer(html) {
  if (typeof html !== 'string' || !html.includes('function useCanonicalTemperature(initialC, unit)')) {
    throw new Error('Milestone 1 transformed artifact required');
  }
  let out = applyRefrigerantProjection(html);
  out = applyAirLiquidRanges(out);
  out = applyLiquidLiquidRanges(out);
  out = applyAirAirFinalGuards(out);
  const after = {
    airAir: sha256(section(out, 'function AirAir({', 'function AirLiquid({')),
    airLiquid: sha256(section(out, 'function AirLiquid({', 'function LiqLiq({')),
  };
  return { html: out, after, sha256: sha256(out) };
}

module.exports = {
  applyMilestone1ArtifactFinalizer,
  applyAirAirFinalGuards,
  applyAirLiquidRanges,
  applyLiquidLiquidRanges,
  applyRefrigerantProjection,
  projectRange,
  replaceOnce,
  sha256,
};

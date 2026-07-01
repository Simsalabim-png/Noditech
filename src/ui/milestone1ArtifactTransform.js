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

function section(source, startAnchor, endAnchor) {
  const start = source.indexOf(startAnchor);
  if (start < 0) throw new Error(`section start not found: ${startAnchor}`);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  if (end < 0) throw new Error(`section end not found: ${endAnchor}`);
  return source.slice(start, end);
}

const TEMPERATURE_HELPER = `function useCanonicalTemperature(initialC, unit) {
  const [canonicalC, setCanonicalC] = React.useState(initialC);
  const displayValue = canonicalC == null || canonicalC === '' ? canonicalC : unit === "F" ? canonicalC * 9 / 5 + 32 : canonicalC;
  const setDisplayValue = React.useCallback(next => {
    setCanonicalC(previousC => {
      const previousDisplay = previousC == null || previousC === '' ? previousC : unit === "F" ? previousC * 9 / 5 + 32 : previousC;
      const resolved = typeof next === 'function' ? next(previousDisplay) : next;
      if (resolved == null || resolved === '') return resolved;
      const numeric = Number(resolved);
      if (!Number.isFinite(numeric)) return previousC;
      return unit === "F" ? (numeric - 32) * 5 / 9 : numeric;
    });
  }, [unit]);
  return [displayValue, setDisplayValue, canonicalC];
}
`;

const TEMPERATURE_DECLARATIONS = [
  ['const [eDB, setEDB] = useState(26);', 'const [eDB, setEDB] = useCanonicalTemperature(26, unit);'],
  ['const [eWB, setEWB] = useState(18);', 'const [eWB, setEWB] = useCanonicalTemperature(18, unit);'],
  ['const [lWB, setLWB] = useState(13);', 'const [lWB, setLWB] = useCanonicalTemperature(13, unit);'],
  ['const [lDB, setLDB] = useState(14);', 'const [lDB, setLDB] = useCanonicalTemperature(14, unit);'],
  ['const [oDB, setODB] = useState(35);', 'const [oDB, setODB] = useCanonicalTemperature(35, unit);'],
  ['const [wTi, setWTi] = React.useState(7.0);', 'const [wTi, setWTi] = useCanonicalTemperature(7.0, unit);'],
  ['const [wTo, setWTo] = React.useState(12.0);', 'const [wTo, setWTo] = useCanonicalTemperature(12.0, unit);'],
  ['const [oDB, setODB] = React.useState(35);', 'const [oDB, setODB] = useCanonicalTemperature(35, unit);'],
  ['const [lDBm, setLDBm] = React.useState(14);', 'const [lDBm, setLDBm] = useCanonicalTemperature(14, unit);'],
  ['const [cTi, setCTi] = useState(12);', 'const [cTi, setCTi] = useCanonicalTemperature(12, unit);'],
  ['const [cTo, setCTo] = useState(7);', 'const [cTo, setCTo] = useCanonicalTemperature(7, unit);'],
  ['const [hTi, setHTi] = useState(30);', 'const [hTi, setHTi] = useCanonicalTemperature(30, unit);'],
  ['const [hTo, setHTo] = useState(35);', 'const [hTo, setHTo] = useCanonicalTemperature(35, unit);'],
];

function transformScopedTemperatureState(html, start, end, reactPrefix) {
  const sectionStart = html.indexOf(start);
  const sectionEnd = html.indexOf(end, sectionStart);
  if (sectionStart < 0 || sectionEnd < 0) throw new Error(`temperature section missing: ${start}`);
  const before = html.slice(0, sectionStart);
  let body = html.slice(sectionStart, sectionEnd);
  const state = reactPrefix ? 'React.useState' : 'useState';
  body = replaceOnce(body, `const [sT, setST] = ${state}(15);`, 'const [sT, setST] = useCanonicalTemperature(15, unit);', `${start} suction temperature`);
  body = replaceOnce(body, `const [liqT, setLiqT] = ${state}(35);`, 'const [liqT, setLiqT] = useCanonicalTemperature(35, unit);', `${start} liquid temperature`);
  return before + body + html.slice(sectionEnd);
}

function applyUnitProjection(html) {
  let out = replaceOnce(html, 'function AirAir({', TEMPERATURE_HELPER + 'function AirAir({', 'canonical temperature helper');
  for (const [anchor, replacement] of TEMPERATURE_DECLARATIONS) {
    out = replaceOnce(out, anchor, replacement, `canonical temperature ${anchor}`);
  }
  out = transformScopedTemperatureState(out, 'function AirAir({', 'function AirLiquid({', false);
  out = transformScopedTemperatureState(out, 'function AirLiquid({', 'function LiqLiq({', true);
  out = transformScopedTemperatureState(out, 'function LiqLiq({', 'function GuideAA(', false);
  return out;
}

function applyAirAirResultContract(html) {
  let out = replaceOnce(
    html,
    `  const mf = _aaOK ? _aaRes.dryAirMassFlowKgS : NaN,\n    dh = Math.max(0, hE - hL),\n    Q = _aaOK ? _aaRes.totalCapacityKW : 0,\n    pTotal = pw + pFan + pOther,\n    eer = pTotal > 0 ? Q / pTotal : 0,\n    eerComp = pw > 0 ? Q / pw : 0;\n  const sr = _aaOK ? _aaRes.shr : 0;\n  const qs = _aaOK ? _aaRes.sensibleCapacityKW : 0,\n    ql = _aaOK ? _aaRes.latentCapacityKW : 0;`,
    `  const mf = _aaOK ? _aaRes.dryAirMassFlowKgS : NaN,\n    dh = _aaOK ? Math.max(0, hE - hL) : NaN,\n    Q = _aaOK ? _aaRes.totalCapacityKW : NaN,\n    pTotal = pw + pFan + pOther,\n    eer = _aaOK && pTotal > 0 ? Q / pTotal : NaN,\n    eerComp = _aaOK && pw > 0 ? Q / pw : NaN;\n  const sr = _aaOK ? _aaRes.shr : NaN;\n  const qs = _aaOK ? _aaRes.sensibleCapacityKW : NaN,\n    ql = _aaOK ? _aaRes.latentCapacityKW : NaN;\n  const _aaContract = {\n    status: _aa.status,\n    value: _aaOK ? Q : null,\n    reason: _aaOK ? null : _aaMsg,\n    totalCapacityKW: _aaOK ? Q : null,\n    sensibleCapacityKW: _aaOK ? qs : null,\n    latentCapacityKW: _aaOK ? ql : null,\n    dryAirMassFlowKgS: _aaOK ? mf : null,\n    deltaEnthalpyKJkg: _aaOK ? dh : null,\n    eer: _aaOK && Number.isFinite(eer) ? eer : null,\n    eerCompressor: _aaOK && Number.isFinite(eerComp) ? eerComp : null,\n    shr: _aaOK && Number.isFinite(sr) ? sr : null\n  };\n  const _aaText = (value, digits = 4) => Number.isFinite(value) ? fmt(value, digits) : '—';\n  const _aaChartOK = _aaOK && [pAtm, eC, lC, eRH, lRH, WE, WL].every(Number.isFinite);`,
    'Air/Air result contract'
  );

  const start = out.indexOf('function AirAir({');
  const end = out.indexOf('function AirLiquid({', start);
  if (start < 0 || end < 0) throw new Error('Air/Air component section missing');
  let airAir = out.slice(start, end);
  const outputReplacements = [
    ['fmt(Q, 4), " kW"', '_aaText(_aaContract.totalCapacityKW, 4), " kW"'],
    ['fmt(Q * 3412.14, 0), " BTU/h - ", fmt(Q / 3.517, 4)', '_aaText(_aaContract.totalCapacityKW == null ? null : _aaContract.totalCapacityKW * 3412.14, 0), " BTU/h - ", _aaText(_aaContract.totalCapacityKW == null ? null : _aaContract.totalCapacityKW / 3.517, 4)'],
    ['elecBoundary === "" ? \'— confirm boundary —\' : fmt(eer, 4)', 'elecBoundary === "" ? \'— confirm boundary —\' : _aaText(_aaContract.eer, 4)'],
    ['elecBoundary === "" ? \'select what P_total includes above\' : \'W/W = \' + fmt(eer * 3.412, 3) + \' BTU/Wh\'', 'elecBoundary === "" ? \'select what P_total includes above\' : _aaContract.eer == null ? \'—\' : \'W/W = \' + fmt(_aaContract.eer * 3.412, 3) + \' BTU/Wh\''],
    ['fmt(eerComp, 4)', '_aaText(_aaContract.eerCompressor, 4)'],
    ['fmt(mf, 4)', '_aaText(_aaContract.dryAirMassFlowKgS, 4)'],
    ['fmt(dh, 4)', '_aaText(_aaContract.deltaEnthalpyKJkg, 4)'],
    ['fmt(qs, 4)', '_aaText(_aaContract.sensibleCapacityKW, 4)'],
    ['fmt(sr, 4)', '_aaText(_aaContract.shr, 4)'],
    ['fmt(ql, 4)', '_aaText(_aaContract.latentCapacityKW, 4)'],
  ];
  for (const [anchor, replacement] of outputReplacements) airAir = airAir.split(anchor).join(replacement);

  airAir = replaceOnce(
    airAir,
    `  }, "Entering and leaving air plotted on a live psychrometric chart at ", fmt(pAtm / 1000, 1), " kPa. The red line is the cooling process; its slope shows the sensible/latent split. Saturation, RH and enthalpy grid use the same psychrometric formulas (Buck saturation, humidity ratio, enthalpy) as the capacity result, evaluated at the actual barometric pressure. The chart re-implements those formulas rather than sharing one stored state, so they agree by construction but are not a single code path."), React.createElement("div", {\n    className: "chartbox"\n  }, React.createElement(MollierChart, {\n    pAtm: pAtm,\n    points: [{\n      T: eC,\n      RH: eRH,\n      label: 'Entering (inn)',\n      color: 'var(--ch-enter)'\n    }, {\n      T: lC,\n      RH: lRH,\n      label: 'Leaving (ut)',\n      color: 'var(--ch-leave)'\n    }]\n  })))`,
    `  }, _aaChartOK ? "Entering and leaving air use the same validated psychrometric states as the capacity result. The background grid is a visual reference evaluated at the active barometric pressure." : "Chart unavailable until the Air/Air result is valid."), React.createElement("div", {\n    className: "chartbox",\n    "data-aa-chart-status": _aaChartOK ? "ready" : "blocked"\n  }, _aaChartOK ? React.createElement(MollierChart, {\n    pAtm: pAtm,\n    points: [{\n      T: eC,\n      RH: eRHderived,\n      W: WE,\n      h: hE,\n      label: 'Entering (inn)',\n      color: 'var(--ch-enter)'\n    }, {\n      T: lC,\n      RH: lRHderived,\n      W: WL,\n      h: hL,\n      label: 'Leaving (ut)',\n      color: 'var(--ch-leave)'\n    }]\n  }) : React.createElement("div", {\n    className: "warn",\n    style: { marginTop: 0 }\n  }, _aaContract.reason || "Chart unavailable.")))`,
    'Air/Air chart contract'
  );

  airAir = replaceOnce(
    airAir,
    'React.createElement(SteadyStateChecker, null), React.createElement(UncertaintyPanel, {',
    'React.createElement(SteadyStateChecker, null), _aaOK && React.createElement(UncertaintyPanel, {',
    'Air/Air uncertainty blocked visibility'
  );

  airAir = replaceOnce(
    airAir,
    `  }, React.createElement("button", {\n    className: "bt bt-g",\n    onClick: save\n  }, "Save Measurement"),`,
    `  }, React.createElement("button", {\n    className: "bt bt-g",\n    onClick: save,\n    disabled: !_aaOK,\n    title: _aaOK ? "" : _aaContract.reason || "Calculation is blocked.",\n    style: !_aaOK ? { opacity: .5, cursor: 'not-allowed' } : undefined\n  }, "Save Measurement"),`,
    'Air/Air blocked save'
  );

  return out.slice(0, start) + airAir + out.slice(end);
}

function applyMollierFiniteGuards(html) {
  let out = replaceOnce(
    html,
    `  const wOf = (T, RH) => {\n    const pv = RH / 100 * pS(T);\n    return 0.622 * pv / (pAtm - pv);\n  };\n  const hOf = (T, RH) => {\n    const W = wOf(T, RH);\n    return 1.006 * T + W * (2501 + 1.86 * T);\n  };`,
    `  const wOf = (T, RH) => {\n    if (![T, RH, pAtm].every(Number.isFinite) || pAtm <= 0) return NaN;\n    const pv = RH / 100 * pS(T);\n    const denominator = pAtm - pv;\n    return denominator > 0 ? 0.622 * pv / denominator : NaN;\n  };\n  const hOf = (T, RH) => {\n    const W = wOf(T, RH);\n    return Number.isFinite(W) ? 1.006 * T + W * (2501 + 1.86 * T) : NaN;\n  };`,
    'Mollier finite formula guards'
  );
  out = replaceOnce(
    out,
    `  const plotted = points.filter(p => p && isFinite(p.T) && isFinite(p.RH)).map(p => ({\n    ...p,\n    x: px(p.T),\n    y: py(wOf(p.T, p.RH)),\n    W: wOf(p.T, p.RH),\n    h: hOf(p.T, p.RH)\n  }));`,
    `  const plotted = points.map(p => {\n    if (!p || !Number.isFinite(p.T)) return null;\n    const W = Number.isFinite(p.W) ? p.W : Number.isFinite(p.RH) ? wOf(p.T, p.RH) : NaN;\n    const h = Number.isFinite(p.h) ? p.h : Number.isFinite(p.RH) ? hOf(p.T, p.RH) : NaN;\n    if (![W, h].every(Number.isFinite)) return null;\n    const x = px(p.T), y = py(W);\n    if (![x, y].every(Number.isFinite)) return null;\n    return { ...p, x, y, W, h };\n  }).filter(Boolean);`,
    'Mollier shared-state projection'
  );
  return out;
}

function applyLiquidLiquidCopFix(html) {
  let out = replaceOnce(
    html,
    `  const pTot = _llRecord ? _llRecord.electricalPower_kW : null,\n    eer = _llUi.cop,\n    copHeat = _llRecord ? _llRecord.copHeating : null;`,
    `  const pTot = _llRecord ? _llRecord.electricalPower_kW : null,\n    copCooling = _llRecord ? _llRecord.copCooling : null,\n    copHeating = _llRecord ? _llRecord.copHeating : null,\n    activeCop = _llUi.cop,\n    eer = activeCop,\n    copHeat = copHeating;`,
    'Liquid/Liquid COP concepts'
  );
  const start = out.indexOf('function LiqLiq({');
  const end = out.indexOf('function GuideAA(', start);
  if (start < 0 || end < 0) throw new Error('Liquid/Liquid component section missing');
  let liquidLiquid = out.slice(start, end);
  liquidLiquid = replaceOnce(
    liquidLiquid,
    `  }, "COP cooling"), React.createElement("div", {\n    className: "rv",\n    style: {\n      color: ec\n    }\n  }, fmt(eer, 4)),`,
    `  }, "COP cooling"), React.createElement("div", {\n    className: "rv",\n    style: {\n      color: eCol(copCooling)\n    },\n    "data-ll-cop": "cooling"\n  }, fmt(copCooling, 4)),`,
    'Liquid/Liquid cooling COP card'
  );
  liquidLiquid = replaceOnce(
    liquidLiquid,
    `  }, "COP heating"), React.createElement("div", {\n    className: "rv",\n    style: {\n      color: eCol(copHeat)\n    }\n  }, fmt(copHeat, 4)),`,
    `  }, "COP heating"), React.createElement("div", {\n    className: "rv",\n    style: {\n      color: eCol(copHeating)\n    },\n    "data-ll-cop": "heating"\n  }, fmt(copHeating, 4)),`,
    'Liquid/Liquid heating COP card'
  );
  liquidLiquid = replaceOnce(
    liquidLiquid,
    `React.createElement("strong", null, "COP"), " = ", fmt(Qc, 4), " / ", fmt(pw, 4), " = ", React.createElement("strong", null, fmt(eer, 4))`,
    `React.createElement("strong", null, operatingMode === "cooling" ? "Cooling COP" : "Heating COP"), " = ", fmt(operatingMode === "cooling" ? Qc : Qh, 4), " / ", fmt(pw, 4), " = ", React.createElement("strong", null, fmt(activeCop, 4))`,
    'Liquid/Liquid active COP formula'
  );
  return out.slice(0, start) + liquidLiquid + out.slice(end);
}

function applyMilestone1ArtifactTransform(html) {
  if (typeof html !== 'string' || !html.includes('function App()')) throw new Error('compiled Noditech artifact required');
  const before = {
    airAir: sha256(section(html, 'function AirAir({', 'function AirLiquid({')),
    airLiquid: sha256(section(html, 'function AirLiquid({', 'function LiqLiq({')),
  };
  let out = applyUnitProjection(html);
  out = applyAirAirResultContract(out);
  out = applyMollierFiniteGuards(out);
  out = applyLiquidLiquidCopFix(out);
  const after = {
    airAir: sha256(section(out, 'function AirAir({', 'function AirLiquid({')),
    airLiquid: sha256(section(out, 'function AirLiquid({', 'function LiqLiq({')),
  };
  return { html: out, before, after, sha256: sha256(out) };
}

module.exports = {
  applyMilestone1ArtifactTransform,
  applyUnitProjection,
  applyAirAirResultContract,
  applyMollierFiniteGuards,
  applyLiquidLiquidCopFix,
  replaceOnce,
  section,
  sha256,
};

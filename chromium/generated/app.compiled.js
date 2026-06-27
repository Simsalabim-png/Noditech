/* GENERATED — do not edit. Build-time compile of the extracted Step 3 application source.
   Compiler: @babel/standalone@7.23.2 (preset react). Source SHA-256: 1d841f323b3646af5ac0c0c64d83f3d7bbedf8b9fefe48930748d7394fa38bbd.
   Produced by tests/compile_app.js from corrected/Kalkulator_build9.6-rc8_step3_4.src.html. No JSX, no Babel-in-browser. */
const BUILD_VERSION = "Build 9.6-rc8";
const BUILD_DATE = "2026-06-25";
const BUILD_HASH = "b6ebc906e926";
const BUILD_COMMIT = "";
const PH_DATASET_SHA = "5f040b097c6bb0c8";
const PH_LIQ_DATASET_SHA = "7c915bb0a8302df5";
const PH_SATDB_SHA = "ff28dd48d4f40108";
const PH_PROV = {
  coolprop: "7.2.0",
  backend: "HEOS",
  reference: "IIR (h=200 kJ/kg, s=1.0 kJ/kg·K @ sat. liquid 0°C)"
};
const DATASET_INFO = "Refrigerant data: Ambrose-Walton (pure fluids); R407C bubble/dew (AGas/FSW & Tega) and R452A bubble/dew (Tega) and R454B bubble/dew (CoolProp 7.2.0, R32/1234yf). Glycol: ASHRAE 2017.";
const {
  useState,
  useEffect
} = React;
function fmt(n, d = 4) {
  if (!isFinite(n) || isNaN(n)) return "--";
  return n.toFixed(d);
}
function pSat(T) {
  return 611.21 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T)));
}
function humR(T, RH, p = 101500) {
  const pv = RH / 100 * pSat(T);
  return 0.622 * pv / (p - pv);
}
function enth(T, RH, p = 101500) {
  const W = humR(T, RH, p);
  return 1.006 * T + W * (2501 + 1.86 * T);
}
function sVol(T, RH, p = 101500) {
  const pv = RH / 100 * pSat(T);
  return 287.058 * (T + 273.15) / (p - pv);
}
function wBulb(T, RH, p = 101500) {
  const pv = RH / 100 * pSat(T);
  let Tw = T - (1 - RH / 100) * 10;
  const A = 66 * (p / 101500);
  for (let i = 0; i < 60; i++) {
    const f = pSat(Tw) - A * (T - Tw) - pv;
    const df = (pSat(Tw + .001) - pSat(Tw - .001)) / .002 + A;
    const d = f / df;
    Tw -= d;
    if (Math.abs(d) < .0001) break;
  }
  return Tw;
}
function dewPt(T, RH) {
  const a = 17.625,
    b = 243.04;
  const alpha = Math.log(Math.max(RH, 0.01) / 100) + a * T / (b + T);
  return b * alpha / (a - alpha);
}
function engcalcResolveAirPressure(pAtm, classification) {
  if (pAtm === undefined || pAtm === null) return {
    state: 'missing',
    value: null,
    classification: null,
    source: null,
    valid: false,
    reason: 'pressure_missing'
  };
  if (typeof pAtm === 'string' && pAtm.trim() === '') return {
    state: 'missing',
    value: null,
    classification: null,
    source: null,
    valid: false,
    reason: 'pressure_missing'
  };
  var v = Number(pAtm);
  if (!isFinite(v)) return {
    state: 'invalid',
    value: null,
    classification: null,
    source: null,
    valid: false,
    reason: 'pressure_non_finite'
  };
  if (v <= 0) return {
    state: 'invalid',
    value: null,
    classification: null,
    source: null,
    valid: false,
    reason: 'pressure_non_positive'
  };
  if (v < 50000) return {
    state: 'invalid',
    value: null,
    classification: null,
    source: null,
    valid: false,
    reason: 'pressure_below_range'
  };
  if (v > 110000) return {
    state: 'invalid',
    value: null,
    classification: null,
    source: null,
    valid: false,
    reason: 'pressure_above_range'
  };
  var cls = classification === 'measured' || classification === 'estimated' || classification === 'reference' ? classification : 'entered';
  return {
    state: 'known',
    value: v,
    classification: cls,
    source: 'pKpa_field',
    valid: true,
    reason: null
  };
}
function engcalcAirSide(args) {
  var pr = engcalcResolveAirPressure(args.pAtm, args.classification);
  var prov = {
    state: pr.state,
    value: pr.value,
    classification: pr.classification,
    source: pr.source,
    reason: pr.reason
  };
  if (!pr.valid) {
    return {
      pressure: prov,
      suppressed: true,
      reason: pr.reason,
      hE: NaN,
      vE: NaN,
      wBE: NaN,
      WE: NaN,
      mA: NaN,
      hLauto: NaN,
      lDBauto: NaN,
      lRHauto: NaN,
      lDBuse: NaN,
      lRHuse: NaN,
      hL: NaN,
      vL: NaN,
      wBL: NaN,
      dh: NaN,
      Qa: NaN
    };
  }
  var P = pr.value,
    oC = args.oC,
    oRH = args.oRH,
    Qw = args.Qw;
  var hE = enth(oC, oRH, P),
    vE = sVol(oC, oRH, P),
    wBE = wBulb(oC, oRH, P),
    WE = humR(oC, oRH, P);
  var AF_NOMINAL = 2000,
    afUse = args.af !== null ? args.afm : AF_NOMINAL,
    afsUse = afUse / 3600,
    mA = afsUse / vE;
  var hLauto = mA > 0 ? hE + Qw / mA : hE;
  var lDBauto = oC + (hLauto - hE) / (1.006 + WE * 1.86);
  var pvSame = WE * P / (0.622 + WE),
    lRHauto = Math.max(5, Math.min(100, pvSame / pSat(lDBauto) * 100));
  var lDBuse = args.lDB !== null ? args.lDBmC : lDBauto,
    lRHuse = args.lRH !== null ? args.lRHm : lRHauto;
  var hL = enth(lDBuse, lRHuse, P),
    vL = sVol(lDBuse, lRHuse, P),
    wBL = wBulb(lDBuse, lRHuse, P);
  var dh = hL - hE,
    Qa = mA * dh;
  return {
    pressure: prov,
    suppressed: false,
    reason: null,
    hE: hE,
    vE: vE,
    wBE: wBE,
    WE: WE,
    mA: mA,
    hLauto: hLauto,
    lDBauto: lDBauto,
    lRHauto: lRHauto,
    lDBuse: lDBuse,
    lRHuse: lRHuse,
    hL: hL,
    vL: vL,
    wBL: wBL,
    dh: dh,
    Qa: Qa
  };
}
function engcalcPressureMessage(code) {
  switch (code) {
    case 'pressure_missing':
      return 'Atmospheric pressure is missing';
    case 'pressure_non_finite':
      return 'Atmospheric pressure is not a valid number';
    case 'pressure_non_positive':
      return 'Atmospheric pressure must be greater than zero';
    case 'pressure_below_range':
      return 'Atmospheric pressure is below the accepted range (50–110 kPa)';
    case 'pressure_above_range':
      return 'Atmospheric pressure is above the accepted range (50–110 kPa)';
    default:
      return 'Atmospheric pressure is missing or invalid';
  }
}
function engcalcAirDisplay(air, ctx) {
  ctx = ctx || {};
  if (air && air.suppressed) {
    return {
      available: false,
      kind: 'withheld',
      statusLabel: 'WITHHELD',
      qAirText: 'unavailable',
      balanceText: 'unavailable',
      reasonCode: air.reason,
      reasonMessage: engcalcPressureMessage(air.reason),
      showPositive: false,
      color: '#94a3b8',
      borderColor: 'rgba(148,163,184,.4)'
    };
  }
  if (ctx.isAutoAir) return {
    available: true,
    kind: 'estimate',
    statusLabel: 'EST',
    qAirText: 'estimated',
    balanceText: 'no check possible',
    reasonCode: null,
    reasonMessage: null,
    showPositive: false,
    color: '#7dd3fc',
    borderColor: 'rgba(125,211,252,.3)'
  };
  if (!ctx.isFullyManualAir) return {
    available: true,
    kind: 'incomplete',
    statusLabel: 'INC',
    qAirText: 'partial',
    balanceText: 'incomplete',
    reasonCode: null,
    reasonMessage: null,
    showPositive: false,
    color: '#7dd3fc',
    borderColor: 'rgba(125,211,252,.3)'
  };
  var a = Math.abs(ctx.balVsReject),
    kind = a > 8 ? 'bad' : a > 3 ? 'warn' : 'good';
  return {
    available: true,
    kind: kind,
    statusLabel: a.toFixed(2) + '%',
    qAirText: 'measured',
    balanceText: a.toFixed(2) + '%',
    reasonCode: null,
    reasonMessage: null,
    showPositive: kind === 'good',
    color: a > 8 ? '#f87171' : a > 3 ? '#fbbf24' : '#22c55e',
    borderColor: a > 8 ? 'rgba(248,113,113,.4)' : a > 3 ? 'rgba(251,191,36,.4)' : 'rgba(34,197,94,.3)'
  };
}
function engcalcAirRecord(o) {
  var sup = !!(o.air && o.air.suppressed);
  return {
    id: o.id,
    date: o.date,
    mode: 'Air/Liquid',
    job: o.job,
    uid: o.uid,
    ref: o.ref,
    t1: o.t1,
    t2: sup ? null : o.t2,
    wb1: o.wb1,
    wb2: sup ? null : o.wb2,
    rh1: o.rh1,
    rh2: sup ? null : o.rh2,
    wTi: o.wTi,
    wTo: o.wTo,
    wF: o.wF,
    af: o.af,
    pw: o.pw,
    Q: o.Q,
    Qw: sup ? null : o.Qair,
    eer: o.eer,
    air_suppressed: sup,
    pAtm_state: o.air.pressure.state,
    pAtm_value: o.air.pressure.value,
    pAtm_class: o.air.pressure.classification,
    pAtm_source: o.air.pressure.source,
    pAtm_reason: o.air.pressure.reason,
    tE: o.tE,
    sh: o.sh,
    tC: o.tC,
    sP: o.sP,
    dP: o.dP,
    unit: o.unit
  };
}
function engcalcAppPressureInit() {
  return {
    state: 'missing',
    value_kPa: null,
    classification: null,
    source: null,
    reason: 'pressure_missing'
  };
}
function engcalcAppPressureValidate(value_kPa, classification, source) {
  if (value_kPa === undefined || value_kPa === null) return {
    state: 'missing',
    value_kPa: null,
    classification: null,
    source: source || null,
    reason: 'pressure_missing'
  };
  if (typeof value_kPa === 'string' && value_kPa.trim() === '') return {
    state: 'missing',
    value_kPa: null,
    classification: null,
    source: source || null,
    reason: 'pressure_missing'
  };
  var v = Number(value_kPa);
  if (!isFinite(v)) return {
    state: 'invalid',
    value_kPa: null,
    classification: null,
    source: source || null,
    reason: 'pressure_non_finite'
  };
  if (v <= 0) return {
    state: 'invalid',
    value_kPa: null,
    classification: null,
    source: source || null,
    reason: 'pressure_non_positive'
  };
  if (v < 50) return {
    state: 'invalid',
    value_kPa: null,
    classification: null,
    source: source || null,
    reason: 'pressure_below_range'
  };
  if (v > 110) return {
    state: 'invalid',
    value_kPa: null,
    classification: null,
    source: source || null,
    reason: 'pressure_above_range'
  };
  var cls = classification === 'measured' || classification === 'reference' || classification === 'estimated' ? classification : 'entered';
  return {
    state: 'known',
    value_kPa: v,
    classification: cls,
    source: source || 'pKpa_field',
    reason: null
  };
}
function engcalcAppPressureFromField(v) {
  return engcalcAppPressureValidate(v, 'entered', 'pKpa_field');
}
function engcalcAppPressureReference() {
  return {
    state: 'known',
    value_kPa: 101.325,
    classification: 'reference',
    source: 'reference_selection',
    reason: null
  };
}
function engcalcAppPressureFromSession(raw, cls) {
  return engcalcAppPressureValidate(raw, cls || 'entered', 'session');
}
function engcalcAppPressurePa(pp) {
  return pp && pp.state === 'known' && pp.value_kPa != null ? pp.value_kPa * 1000 : NaN;
}
function engcalcBuildCsv(log) {
  var H = ["Date", "Mode", "Job", "Unit", "Ref", "T1", "T2", "Q kW", "Qw(air) kW", "EER", "Air suppressed", "Pressure state", "Pressure value Pa", "Pressure class", "Pressure source", "Pressure reason", "T_evap", "SH K", "T_cond", "P_suc", "P_dis", "Temp unit"];
  var rows = log.map(function (e) {
    return [e.date, e.mode, e.job, e.uid, e.ref, e.t1, e.t2, e.Q, e.Qw == null ? '--' : e.Qw, e.eer, e.air_suppressed ? 'WITHHELD' : 'no', e.pAtm_state || '--', e.pAtm_value == null ? '--' : e.pAtm_value, e.pAtm_class || '--', e.pAtm_source || '--', e.pAtm_reason || '--', e.tE, e.sh, e.tC, e.sP, e.dP, e.unit];
  });
  return [H].concat(rows).map(function (r) {
    return r.map(function (c) {
      return '"' + (c == null ? '--' : c) + '"';
    }).join(",");
  }).join("\n");
}
function engcalcPressureProvenance(pp) {
  return {
    state: pp.state,
    value_kPa: pp.value_kPa,
    classification: pp.classification,
    source: pp.source,
    reason: pp.reason
  };
}
function engcalcBuildJson(log, pp) {
  return {
    tool: "engcalc-calculator",
    build: BUILD_VERSION,
    exported: new Date().toISOString(),
    pressure: engcalcPressureProvenance(pp),
    records: log
  };
}
function engcalcBuildSession(log, pp, measDate) {
  return {
    tool: "engcalc-calculator",
    version: "5",
    saved: new Date().toISOString(),
    pressure: engcalcPressureProvenance(pp),
    measDate: measDate,
    log: log
  };
}
function engcalcBuildPrintProjection(log, pp) {
  var lastAL = null;
  for (var i = 0; i < log.length; i++) {
    if (log[i].mode === 'Air/Liquid') {
      lastAL = log[i];
      break;
    }
  }
  var air = null;
  if (lastAL) {
    var sup = !!lastAL.air_suppressed;
    air = {
      suppressed: sup,
      status: sup ? 'WITHHELD' : 'available',
      air_output: sup ? null : lastAL.Qw == null ? null : lastAL.Qw,
      reason_code: lastAL.pAtm_reason || null,
      reason_message: engcalcPressureMessage(lastAL.pAtm_reason),
      pressure_state: lastAL.pAtm_state || null,
      pressure_class: lastAL.pAtm_class || null,
      pressure_source: lastAL.pAtm_source || null,
      liquid_side: lastAL.Q == null ? null : lastAL.Q
    };
  }
  return {
    pressure: engcalcPressureProvenance(pp),
    air_side: air
  };
}
function eCol(e) {
  if (e >= 4) return "#22c55e";
  if (e >= 3) return "#86efac";
  if (e >= 2.5) return "#facc15";
  return "#f87171";
}
function eLbl(e) {
  if (e >= 4) return "Excellent";
  if (e >= 3) return "Good";
  if (e >= 2) return "Average";
  return "Poor";
}
const EG_PROPS = {
  0: [[-20, 4.280, 0.9935], [-10, 4.243, 0.9986], [0, 4.218, 1.0000], [10, 4.199, 0.9997], [20, 4.187, 0.9982], [30, 4.180, 0.9957], [40, 4.175, 0.9922], [50, 4.181, 0.9881]],
  10: [[-20, 4.162, 1.0150], [-10, 4.115, 1.0188], [0, 4.080, 1.0188], [10, 4.055, 1.0173], [20, 4.037, 1.0145], [30, 4.025, 1.0107], [40, 4.018, 1.0059], [50, 4.015, 1.0003]],
  20: [[-20, 3.983, 1.0300], [-10, 3.929, 1.0330], [0, 3.888, 1.0337], [10, 3.858, 1.0323], [20, 3.836, 1.0294], [30, 3.820, 1.0252], [40, 3.809, 1.0199], [50, 3.803, 1.0137]],
  30: [[-20, 3.779, 1.0453], [-10, 3.721, 1.0471], [0, 3.676, 1.0476], [10, 3.644, 1.0460], [20, 3.619, 1.0430], [30, 3.601, 1.0387], [40, 3.588, 1.0333], [50, 3.579, 1.0269]],
  40: [[-20, 3.559, 1.0585], [-10, 3.500, 1.0599], [0, 3.455, 1.0604], [10, 3.423, 1.0589], [20, 3.399, 1.0561], [30, 3.381, 1.0521], [40, 3.368, 1.0470], [50, 3.360, 1.0409]],
  50: [[-20, 3.334, 1.0697], [-10, 3.277, 1.0711], [0, 3.236, 1.0718], [10, 3.207, 1.0705], [20, 3.185, 1.0681], [30, 3.169, 1.0645], [40, 3.158, 1.0599], [50, 3.151, 1.0544]]
};
const PG_PROPS = {
  0: [[-20, 4.280, 0.9935], [-10, 4.243, 0.9986], [0, 4.218, 1.0000], [10, 4.199, 0.9997], [20, 4.187, 0.9982], [30, 4.180, 0.9957], [40, 4.175, 0.9922], [50, 4.181, 0.9881]],
  10: [[-20, 4.098, 1.0090], [-10, 4.058, 1.0123], [0, 4.027, 1.0125], [10, 4.004, 1.0111], [20, 3.987, 1.0085], [30, 3.975, 1.0048], [40, 3.968, 1.0002], [50, 3.965, 0.9948]],
  20: [[-20, 3.913, 1.0205], [-10, 3.869, 1.0237], [0, 3.836, 1.0241], [10, 3.812, 1.0229], [20, 3.795, 1.0205], [30, 3.782, 1.0170], [40, 3.774, 1.0126], [50, 3.770, 1.0074]],
  30: [[-20, 3.729, 1.0305], [-10, 3.683, 1.0337], [0, 3.649, 1.0345], [10, 3.625, 1.0336], [20, 3.608, 1.0315], [30, 3.596, 1.0284], [40, 3.588, 1.0244], [50, 3.584, 1.0196]],
  40: [[-20, 3.551, 1.0388], [-10, 3.504, 1.0421], [0, 3.470, 1.0433], [10, 3.447, 1.0427], [20, 3.430, 1.0410], [30, 3.418, 1.0383], [40, 3.410, 1.0347], [50, 3.406, 1.0303]],
  50: [[-20, 3.381, 1.0453], [-10, 3.333, 1.0488], [0, 3.299, 1.0504], [10, 3.277, 1.0502], [20, 3.261, 1.0489], [30, 3.249, 1.0466], [40, 3.242, 1.0435], [50, 3.237, 1.0396]]
};
let __GLY_IDX = null;
function _glyIndex() {
  if (__GLY_IDX) return __GLY_IDX;
  const ds = typeof window !== 'undefined' && window.__GLYCOL__ ? window.__GLYCOL__ : null;
  if (!ds || !ds.fluids) return null;
  const idx = {
    fluids: {}
  };
  for (const fid of Object.keys(ds.fluids)) {
    idx.fluids[fid] = ds.fluids[fid].concentrations.map(c => ({
      mf: c.mass_fraction,
      freeze: c.freeze_point_C,
      T: c.points.map(p => p.temperature_C),
      cp: c.points.map(p => p.cp_J_kgK),
      rho: c.points.map(p => p.rho_kg_m3)
    })).sort((a, b) => a.mf - b.mf);
  }
  __GLY_IDX = idx;
  return idx;
}
function glyEval(type, pct, T_C) {
  const out = {
    cp: NaN,
    rho: NaN,
    freeze: NaN,
    valid: false,
    reason: null,
    source: 'CoolProp 7.2.0 INCOMP (mass-%)'
  };
  const idx = _glyIndex();
  if (!idx) {
    out.reason = 'no_dataset';
    return out;
  }
  const fid = type === 'PG' || type === 'MPG' ? 'MPG' : 'MEG';
  const F = idx.fluids[fid];
  if (!F) {
    out.reason = 'unknown_fluid';
    return out;
  }
  const mf = pct / 100;
  if (!(typeof mf === 'number' && isFinite(mf)) || mf < 0 || mf > 0.60) {
    out.reason = 'concentration_out_of_range';
    return out;
  }
  if (!(typeof T_C === 'number' && isFinite(T_C))) {
    out.reason = 'invalid_temperature';
    return out;
  }
  if (mf < F[0].mf - 1e-9 || mf > F[F.length - 1].mf + 1e-9) {
    out.reason = 'concentration_out_of_range';
    return out;
  }
  let j = 0;
  while (j < F.length - 1 && F[j + 1].mf < mf) j++;
  const c1 = F[j],
    c2 = F[Math.min(j + 1, F.length - 1)];
  if (T_C <= c1.freeze + 0.1 || T_C <= c2.freeze + 0.1) {
    out.reason = 'below_freeze_guard';
    out.freeze = Math.max(c1.freeze, c2.freeze);
    return out;
  }
  function it(c) {
    const Ts = c.T;
    if (T_C < Ts[0] - 1e-9 || T_C > Ts[Ts.length - 1] + 1e-9) return null;
    let i = 0;
    while (i < Ts.length - 1 && Ts[i + 1] < T_C) i++;
    const TL = Ts[i],
      TU = Ts[i + 1];
    if (TU === undefined) return Math.abs(Ts[i] - T_C) < 1e-9 ? {
      cp: c.cp[i],
      rho: c.rho[i]
    } : null;
    const f = TU === TL ? 0 : (T_C - TL) / (TU - TL);
    return {
      cp: c.cp[i] + f * (c.cp[i + 1] - c.cp[i]),
      rho: c.rho[i] + f * (c.rho[i + 1] - c.rho[i])
    };
  }
  const p1 = it(c1),
    p2 = it(c2);
  if (!p1 || !p2) {
    out.reason = 'missing_bounding_node';
    return out;
  }
  const fc = c2.mf === c1.mf ? 0 : (mf - c1.mf) / (c2.mf - c1.mf);
  out.valid = true;
  out.cp = (p1.cp + fc * (p2.cp - p1.cp)) / 1000;
  out.rho = (p1.rho + fc * (p2.rho - p1.rho)) / 1000;
  out.freeze = c1.freeze + fc * (c2.freeze - c1.freeze);
  return out;
}
function glyPropsTD(type, pct, T) {
  const r = glyEval(type, pct, T);
  return {
    cp: r.cp,
    rho: r.rho,
    freeze: r.freeze,
    valid: r.valid,
    reason: r.reason
  };
}
function cpGly(p) {
  return 4.18 - (4.18 - 2.38) * (p / 100);
}
function rhoGly(p) {
  return 1.0 + 0.0012 * p;
}
const CP = 4.186;
const SAT_TABLES = {
  R32: [[-40, 176.2], [-35, 220.6], [-30, 273.1], [-25, 334.9], [-20, 406.9], [-15, 490.1], [-10, 585.8], [-5, 694.9], [0, 818.7], [5, 958.5], [10, 1115.3], [15, 1290.6], [20, 1485.6], [25, 1701.7], [30, 1940.5], [35, 2203.4], [40, 2492.1], [45, 2808.4], [50, 3154.3], [55, 3531.8], [60, 3943.6], [65, 4392.7], [70, 4882.9]],
  R290: [[-40, 111.2], [-35, 137.3], [-30, 167.9], [-25, 203.5], [-20, 244.6], [-15, 291.7], [-10, 345.3], [-5, 406.1], [0, 474.5], [5, 551.1], [10, 636.6], [15, 731.5], [20, 836.4], [25, 952.0], [30, 1078.9], [35, 1217.8], [40, 1369.3], [45, 1534.1], [50, 1713.1], [55, 1906.9], [60, 2116.5], [65, 2342.7], [70, 2586.5]],
  R410A: [[-40, 174.6], [-35, 217.4], [-30, 267.9], [-25, 327.0], [-20, 395.6], [-15, 474.7], [-10, 565.2], [-5, 668.2], [0, 784.6], [5, 915.6], [10, 1062.4], [15, 1225.9], [20, 1407.6], [25, 1608.6], [30, 1830.2], [35, 2074.1], [40, 2341.6], [45, 2634.6], [50, 2955.0], [55, 3305.0], [60, 3687.6], [65, 4106.3], [70, 4567.1]],
  R22: [[-40, 105.4], [-35, 132.2], [-30, 164.0], [-25, 201.5], [-20, 245.4], [-15, 296.2], [-10, 354.7], [-5, 421.6], [0, 497.7], [5, 583.6], [10, 680.3], [15, 788.4], [20, 908.8], [25, 1042.3], [30, 1189.9], [35, 1352.3], [40, 1530.6], [45, 1725.8], [50, 1938.7], [55, 2170.5], [60, 2422.5], [65, 2695.7], [70, 2991.7]],
  R134a: [[-40, 51.1], [-35, 66.1], [-30, 84.3], [-25, 106.4], [-20, 132.7], [-15, 163.9], [-10, 200.6], [-5, 243.4], [0, 292.9], [5, 349.7], [10, 414.7], [15, 488.4], [20, 571.7], [25, 665.3], [30, 770.1], [35, 886.7], [40, 1016.1], [45, 1159.2], [50, 1316.9], [55, 1490.2], [60, 1680.1], [65, 1887.9], [70, 2114.6]],
  R407C: [[-40, 120.1], [-35, 150.4], [-30, 186.4], [-25, 228.7], [-20, 278.0], [-15, 335.1], [-10, 400.7], [-5, 475.6], [0, 560.6], [5, 656.6], [10, 764.4], [15, 884.9], [20, 1019.0], [25, 1167.7], [30, 1331.8], [35, 1512.5], [40, 1710.7], [45, 1927.7], [50, 2164.7], [55, 2422.9], [60, 2703.9], [65, 3009.2], [70, 3340.8]],
  R404A: [[-40, 135.3], [-35, 168.6], [-30, 208.0], [-25, 254.0], [-20, 307.5], [-15, 369.2], [-10, 439.9], [-5, 520.2], [0, 611.2], [5, 713.6], [10, 828.3], [15, 956.2], [20, 1098.2], [25, 1255.5], [30, 1429.0], [35, 1619.8], [40, 1829.2], [45, 2058.6], [50, 2309.4], [55, 2583.5], [60, 2882.8], [65, 3210.3], [70, 3570.1]],
  R454B: [[-40, 170.0], [-35, 211.6], [-30, 260.6], [-25, 317.9], [-20, 384.4], [-15, 461.1], [-10, 548.8], [-5, 648.5], [0, 761.3], [5, 888.2], [10, 1030.1], [15, 1188.3], [20, 1363.9], [25, 1558.0], [30, 1771.9], [35, 2006.9], [40, 2264.4], [45, 2545.8], [50, 2852.9], [55, 3187.4], [60, 3551.4], [65, 3947.3], [70, 4378.5]],
  R1234yf: [[-40, 62.1], [-35, 78.8], [-30, 98.8], [-25, 122.7], [-20, 150.8], [-15, 183.7], [-10, 221.9], [-5, 265.9], [0, 316.2], [5, 373.5], [10, 438.2], [15, 511.1], [20, 592.7], [25, 683.7], [30, 784.7], [35, 896.4], [40, 1019.6], [45, 1155.0], [50, 1303.3], [55, 1465.5], [60, 1642.4], [65, 1835.0], [70, 2044.5]],
  R1234ze: [[-40, 36.7], [-35, 47.7], [-30, 61.1], [-25, 77.3], [-20, 96.9], [-15, 120.1], [-10, 147.5], [-5, 179.5], [0, 216.7], [5, 259.5], [10, 308.6], [15, 364.4], [20, 427.7], [25, 498.9], [30, 578.7], [35, 667.8], [40, 766.8], [45, 876.4], [50, 997.3], [55, 1130.3], [60, 1276.1], [65, 1435.7], [70, 1609.8]],
  R744: [[-40, 999.5], [-38, 1074.7], [-36, 1154.1], [-34, 1237.7], [-32, 1325.8], [-30, 1418.4], [-28, 1515.7], [-26, 1618.0], [-24, 1725.2], [-22, 1837.6], [-20, 1955.3], [-18, 2078.5], [-16, 2207.4], [-14, 2342.1], [-12, 2482.7], [-10, 2629.6], [-8, 2782.7], [-6, 2942.4], [-4, 3108.8], [-2, 3282.1], [0, 3462.5], [2, 3650.3], [4, 3845.5], [6, 4048.6], [8, 4259.7], [10, 4479.2], [12, 4707.2], [14, 4944.1], [16, 5190.2], [18, 5445.9], [20, 5711.6], [22, 5987.7], [24, 6274.9], [26, 6573.9], [28, 6885.5], [30, 7211.3]],
  R513A: [[-40, 61.8], [-35, 78.9], [-30, 99.6], [-25, 124.3], [-20, 153.5], [-15, 187.9], [-10, 227.9], [-5, 274.2], [0, 327.4], [5, 388.1], [10, 456.9], [15, 534.6], [20, 621.9], [25, 719.5], [30, 828.0], [35, 948.4], [40, 1081.4], [45, 1227.8], [50, 1388.6], [55, 1564.7], [60, 1757.1], [65, 1967.0], [70, 2195.5]],
  R452A: [[-40, 140.2], [-35, 174.5], [-30, 215.0], [-25, 262.3], [-20, 317.2], [-15, 380.5], [-10, 452.9], [-5, 535.2], [0, 628.3], [5, 733.0], [10, 850.2], [15, 980.8], [20, 1125.8], [25, 1286.1], [30, 1462.9], [35, 1657.2], [40, 1870.1], [45, 2103.1], [50, 2357.6], [55, 2635.1], [60, 2937.7], [65, 3267.8], [70, 3628.6]]
};
const SAT_BLENDS = {
  R407C: [[-40, 120.3, 85.7], [-35, 150.8, 109.7], [-30, 187.1, 138.7], [-25, 229.9, 173.5], [-20, 279.9, 214.7], [-15, 337.9, 263.2], [-10, 404.7, 319.8], [-5, 481.1, 385.3], [0, 567.9, 460.7], [5, 666.0, 546.9], [10, 776.4, 644.9], [15, 900.0, 755.7], [20, 1038.0, 880.3], [25, 1190.0, 1020.0], [30, 1359.0, 1176.0], [35, 1545.0, 1349.0], [40, 1749.0, 1537.0], [45, 1972.0, 1743.0], [50, 2215.0, 1968.0], [55, 2479.0, 2213.0], [60, 2766.0, 2479.0]],
  R452A: [[-60, 51.2, 41.6], [-55, 67.2, 55.1], [-50, 87.0, 71.9], [-45, 111.2, 92.5], [-40, 140.3, 117.7], [-35, 175.1, 147.8], [-30, 216.1, 183.8], [-25, 264.3, 226.2], [-20, 320.2, 275.8], [-15, 384.7, 333.4], [-10, 458.6, 399.8], [-5, 542.7, 475.9], [0, 637.9, 562.5], [5, 745.1, 660.6], [10, 865.0, 771.1], [15, 998.7, 895.2], [20, 1147.0, 1034.0], [25, 1311.0, 1188.0], [30, 1492.0, 1359.0], [35, 1690.0, 1548.0], [40, 1895.0, 1740.0], [45, 2120.0, 1955.0], [50, 2365.0, 2190.0], [55, 2630.0, 2445.0], [60, 2920.0, 2725.0]],
  R454B: [[-40.0, 166.8, 159.2], [-34.4, 213.0, 203.4], [-28.9, 268.9, 257.1], [-23.3, 335.1, 320.6], [-17.8, 413.7, 395.7], [-12.2, 504.7, 484.0], [-6.7, 610.8, 586.0], [-1.1, 733.6, 703.9], [4.4, 873.5, 839.1], [10.0, 1032.1, 992.8], [15.6, 1212.1, 1167.3], [21.1, 1414.8, 1363.8], [26.7, 1641.6, 1585.1], [32.2, 1894.0, 1831.9], [35.0, 2031.2, 1965.7], [37.8, 2175.3, 2107.0], [43.3, 2486.2, 2412.4], [48.9, 2829.6, 2751.0], [52.8, 3090.2, 3009.5]]
};
const BLEND_GLIDE = {
  R404A: 0.5,
  R410A: 0.1,
  R513A: 0.1
};
function satTblend(ref, pBar, pAtmKpa) {
  const tbl = SAT_BLENDS[ref];
  if (!tbl) return null;
  const pAtmBar = (pAtmKpa != null ? pAtmKpa : 101.325) / 100;
  const P = (pBar + pAtmBar) * 100;
  function lookup(col) {
    if (P < tbl[0][col] || P > tbl[tbl.length - 1][col]) return null;
    for (let i = 0; i < tbl.length - 1; i++) {
      const T1 = tbl[i][0],
        P1 = tbl[i][col],
        T2 = tbl[i + 1][0],
        P2 = tbl[i + 1][col];
      if (P1 <= P && P <= P2) return T1 + (T2 - T1) * (P - P1) / (P2 - P1);
    }
    return null;
  }
  return {
    bubble: lookup(1),
    dew: lookup(2)
  };
}
function satT(ref, pBar, pAtmKpa) {
  const tbl = SAT_TABLES[ref];
  if (!tbl) return null;
  const pAtmBar = (pAtmKpa != null ? pAtmKpa : 101.325) / 100;
  const P_kPa = (pBar + pAtmBar) * 100;
  if (P_kPa < tbl[0][1] || P_kPa > tbl[tbl.length - 1][1]) return null;
  for (let i = 0; i < tbl.length - 1; i++) {
    const [T1, P1] = tbl[i],
      [T2, P2] = tbl[i + 1];
    if (P1 <= P_kPa && P_kPa <= P2) {
      return T1 + (T2 - T1) * (P_kPa - P1) / (P2 - P1);
    }
  }
  return null;
}
function refrigState(refr, sP, dP, sTC, liqTC, pAtmKpa) {
  if (refr === "Other") return null;
  const isBlend = SAT_BLENDS[refr] != null;
  const bE = isBlend ? satTblend(refr, sP, pAtmKpa) : null;
  const bC = isBlend ? satTblend(refr, dP, pAtmKpa) : null;
  const r744Critical = refr === "R744" && satT(refr, dP, pAtmKpa) == null && !isBlend;
  const tE = isBlend ? bE ? bE.dew : null : satT(refr, sP, pAtmKpa);
  const tC = isBlend ? bC ? bC.bubble : null : satT(refr, dP, pAtmKpa);
  const sh = tE != null ? sTC - tE : null;
  const sc = tC != null && !r744Critical ? tC - liqTC : null;
  return {
    refr,
    isBlend,
    tE,
    tC,
    sh,
    sc,
    r744Critical,
    tE_oor: tE == null,
    tC_oor: tC == null
  };
}
const REFS = ['R32', 'R290', 'R410A', 'R22', 'R134a', 'R407C', 'R404A', 'R454B', 'R1234yf', 'R1234ze', 'R744', 'R513A', 'R452A', 'Other'];
const RCOL = {
  R32: '#a855f7',
  R290: '#f97316',
  R410A: '#d4a843',
  R22: '#fbbf24',
  R134a: '#22c55e',
  R407C: '#f472b6',
  R404A: '#60a5fa',
  Other: '#94a3b8'
};
function RefSec({
  unit,
  refr,
  setRefr,
  sP,
  setSP,
  dP,
  setDP,
  sT,
  setST,
  liqT = 35,
  setLiqT,
  pAtm = 101.325
}) {
  const [showSources, setShowSources] = React.useState(false);
  const [showPh, setShowPh] = React.useState(true);
  const [etaIs, setEtaIs] = React.useState(0.70);
  const [t2meas, setT2meas] = React.useState(null);
  const toC = v => unit === "F" ? (v - 32) * 5 / 9 : v;
  const sC = unit === "F" ? toC(sT) : sT;
  const lC_ref = unit === "F" ? toC(liqT) : liqT;
  const isBlend = SAT_BLENDS[refr] != null;
  const blendE = isBlend ? satTblend(refr, sP, pAtm) : null;
  const blendC = isBlend ? satTblend(refr, dP, pAtm) : null;
  const tE = refr === "Other" ? null : isBlend ? blendE.dew : satT(refr, sP, pAtm);
  const tC = refr === "Other" ? null : isBlend ? blendC.bubble : satT(refr, dP, pAtm);
  const r744Critical = refr === "R744" && dP != null && dP + pAtm / 100 >= 73.77;
  const sh = tE != null ? sC - tE : null;
  const sc = tC != null && !r744Critical ? tC - lC_ref : null;
  const evapOOR = refr !== "Other" && tE == null && sP != null;
  const condOOR = refr !== "Other" && tC == null && dP != null;
  const highGlideBlend = refr === "R404A";
  const pr = dP > 0 && sP > 0 ? (dP + pAtm / 100) / (sP + pAtm / 100) : null;
  const rc = RCOL[refr] || '#94a3b8';
  return React.createElement("div", {
    className: "card",
    style: {
      borderColor: rc + '44'
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: rc
    }
  }, "Refrigerant - ", refr), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Refrigerant")), React.createElement("select", {
    value: refr,
    onChange: e => setRefr(e.target.value)
  }, REFS.map(r => React.createElement("option", {
    key: r
  }, r)))), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Suction Pressure"), React.createElement("span", {
    className: "utag"
  }, "bar g")), React.createElement(FloatInput, {
    value: sP,
    onChange: setSP,
    min: 0,
    max: 60,
    step: 0.0001
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Discharge Pressure"), React.createElement("span", {
    className: "utag"
  }, "bar g")), React.createElement(FloatInput, {
    value: dP,
    onChange: setDP,
    min: 0,
    max: 120,
    step: 0.0001
  }))), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Suction Gas Temp"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: sT,
    onChange: setST,
    min: -60,
    max: 100,
    step: 0.0001
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Liquid Line Temp"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: liqT,
    onChange: setLiqT || (v => {}),
    min: -20,
    max: 80,
    step: 0.0001
  })), refr !== "Other" && React.createElement("div", {
    className: "three",
    style: {
      marginTop: 12
    }
  }, React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.2)',
      borderRadius: 10,
      padding: '13px 15px'
    }
  }, React.createElement("div", {
    className: "rn"
  }, "Evap Temp", isBlend ? ' (dew)' : ''), React.createElement("div", {
    className: "rv",
    style: {
      fontSize: 20,
      color: evapOOR ? '#f87171' : rc
    }
  }, tE != null ? fmt(tE, 4) + ' C' : evapOOR ? 'OOR' : "--"), React.createElement("div", {
    className: "ru"
  }, evapOOR ? '⚠ outside validated range' : isBlend ? 'dew pt at suction P' : 'at suction P')), React.createElement("div", {
    style: {
      background: sh != null && sh < 3 ? 'rgba(248,113,113,.1)' : sh != null && sh > 15 ? 'rgba(251,191,36,.1)' : 'rgba(34,197,94,.1)',
      borderRadius: 10,
      padding: '13px 15px',
      border: sh != null && sh < 3 ? '1px solid rgba(248,113,113,.3)' : sh != null && sh > 15 ? '1px solid rgba(251,191,36,.3)' : '1px solid rgba(34,197,94,.2)'
    }
  }, React.createElement("div", {
    className: "rn"
  }, "Superheat"), React.createElement("div", {
    className: "rv",
    style: {
      fontSize: 20,
      color: sh != null && sh < 2 ? '#f87171' : rc
    }
  }, sh != null ? fmt(sh, 4) + ' K' : "--"), React.createElement("div", {
    className: "ru"
  }, sh != null && sh < 2 ? '⚠ very low — risk of liquid return' : 'vs OEM target')), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.2)',
      borderRadius: 10,
      padding: '13px 15px'
    }
  }, React.createElement("div", {
    className: "rn"
  }, r744Critical ? 'Gas Cooler' : 'Cond Temp' + (isBlend ? ' (bubble)' : '')), React.createElement("div", {
    className: "rv",
    style: {
      fontSize: 20,
      color: condOOR || r744Critical ? '#f87171' : rc
    }
  }, r744Critical ? '—' : tC != null ? fmt(tC, 4) + ' C' : condOOR ? 'OOR' : "--"), React.createElement("div", {
    className: "ru"
  }, r744Critical ? '⚠ transcritical — no condensing temp' : condOOR ? '⚠ outside validated range' : isBlend ? 'bubble pt at discharge P' : 'at discharge P')), React.createElement("div", {
    style: {
      background: sc != null && sc < 0 ? "rgba(248,113,113,.1)" : "rgba(0,0,0,.2)",
      borderRadius: 10,
      padding: "13px 15px"
    }
  }, React.createElement("div", {
    className: "rn"
  }, "Subcooling"), React.createElement("div", {
    className: "rv",
    style: {
      fontSize: 20,
      color: sc != null && sc < 0 ? "#f87171" : rc
    }
  }, sc != null ? fmt(sc, 2) + ' K' : "--"), React.createElement("div", {
    className: "ru"
  }, sc != null && sc < 0 ? "⚠ negative — check readings" : "vs OEM target"))), highGlideBlend && React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#fbbf24',
      marginTop: 10,
      lineHeight: 1.5,
      padding: '9px 11px',
      background: 'rgba(251,191,36,.08)',
      borderRadius: 6,
      border: '1px solid rgba(251,191,36,.25)'
    }
  }, "\u26A0 ", refr, " is a zeotropic blend with significant temperature glide, shown here with a single mean saturation column. Superheat and subcooling values are APPROXIMATE for this refrigerant \u2014 do not use them for charge decisions. Use a bubble/dew PT reference or calibrated manifold with the OEM target."), refr !== "Other" && React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#fbbf24',
      marginTop: 10,
      lineHeight: 1.6,
      padding: '11px 13px',
      background: 'rgba(251,191,36,.08)',
      borderRadius: 6,
      border: '1px solid rgba(251,191,36,.25)'
    }
  }, "\u26A0 ", React.createElement("strong", null, "NOT A CHARGING AUTHORITY."), " Superheat and subcooling here are for diagnostics only. Do NOT add or remove refrigerant based on these values alone \u2014 always use the equipment manufacturer's target superheat/subcooling and charging procedure, confirm steady-state operation, and verify with a calibrated manifold. For compliance work, verify against certified property data such as NIST REFPROP."), refr !== "Other" && React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, React.createElement("button", {
    onClick: () => setShowSources(v => !v),
    style: {
      width: '100%',
      textAlign: 'left',
      background: 'rgba(201,168,76,.05)',
      border: '1px solid rgba(201,168,76,.12)',
      borderRadius: 6,
      padding: '8px 11px',
      color: '#8a7a65',
      fontFamily: 'DM Mono,monospace',
      fontSize: 10,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, React.createElement("span", null, "Refrigerant data sources & method ", isBlend ? `— ${refr} bubble/dew` : '— Ambrose-Walton'), React.createElement("span", {
    style: {
      transition: 'transform .2s',
      transform: showSources ? 'rotate(180deg)' : 'none'
    }
  }, "\u25BE")), showSources && React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: '#8a7a65',
      marginTop: 6,
      lineHeight: 1.65,
      padding: '10px 13px',
      background: 'rgba(201,168,76,.04)',
      borderRadius: 6,
      border: '1px solid rgba(201,168,76,.1)'
    }
  }, React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, React.createElement("strong", {
    style: {
      color: '#c8b89a'
    }
  }, "Zeotropic blends with bubble/dew tables (R407C, R452A, R454B):"), " superheat references the DEW point at suction pressure, subcooling references the BUBBLE point at discharge pressure, correctly accounting for temperature glide. R407C cross-validated against two independent sources (Tega and A-Gas/FSW Genetron 407C, composition R32/125/134a 23/25/52, agreement within 2%); R452A from Tega (R32/125/1234yf); R454B from CoolProp (R32/1234yf)."), React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, React.createElement("strong", {
    style: {
      color: '#c8b89a'
    }
  }, "Pure fluids:"), " computed via the Ambrose-Walton corresponding-states method, anchored to each fluid's critical point and validated against published manufacturer PT charts (within ~1%)."), React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, React.createElement("strong", {
    style: {
      color: '#c8b89a'
    }
  }, "Remaining single-column blends (R404A, R410A, R513A):"), " a single pseudo-pure saturation column; superheat/subcooling are approximate pending bubble/dew tables \u2014 treat with extra caution."), React.createElement("div", null, React.createElement("strong", {
    style: {
      color: '#c8b89a'
    }
  }, "R744 (CO\u2082):"), " undefined above its critical point (~31\xB0C / ~73.8 bar); the tool reports a gas-cooler state rather than a fake condensing temperature."))), BLEND_GLIDE[refr] != null && BLEND_GLIDE[refr] >= 2 && React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#fbbf24',
      marginTop: 8,
      lineHeight: 1.5,
      padding: '8px 10px',
      background: 'rgba(251,191,36,.08)',
      borderRadius: 6,
      border: '1px solid rgba(251,191,36,.25)'
    }
  }, "\u26A0 ", refr, " is a zeotropic blend with ~", fmt(BLEND_GLIDE[refr], 1), "K temperature glide, shown here as a single pseudo-pure column. Superheat (dew) and subcooling (bubble) references can differ by up to this amount. For precise charge work on ", refr, ", cross-check against a bubble/dew PT chart. (R407C, R452A and R454B in this tool use full bubble/dew tables.)"), refr !== "Other" && tE != null && tC != null && PH_AVAILABLE.includes(refr) && React.createElement("div", {
    className: "card" + (showPh ? "" : " no-print"),
    style: {
      marginTop: 12,
      borderColor: 'rgba(220,38,38,.2)'
    }
  }, (() => {
    const SH_MIN_DRY = 2;
    const shValid = sh != null && sh >= SH_MIN_DRY;
    const nearSat = sh != null && sh > 0 && sh < SH_MIN_DRY;
    const scUsed = sc != null && sc > 0 ? sc : 0;
    const wetSuction = sh != null && sh <= 0;
    const nearCritical = PH_CRIT[refr] != null && dP != null && dP + pAtm / 100 >= PH_CRIT_FRAC * PH_CRIT[refr];
    const _cr = shValid ? cycleResult(refr, tE, tC, sh, scUsed, etaIs) : {
      status: 'invalid',
      code: 'SH_BELOW_FLOOR'
    };
    const cyc = _cr && _cr.status === 'valid' ? _cr.result : null;
    const cycStatus = _cr ? _cr.status : 'invalid';
    const cycCode = _cr ? _cr.code : null;
    const cycExc = _cr && _cr.status === 'exception' ? _cr.error : null;
    const outputsBlocked = cycStatus === 'exception' || cycCode === 'INVALID_DATASET';
    const acc = cyc && cyc.accurate;
    const cycLo = acc ? phCycleAccurate(refr, tE, tC, sh, scUsed, 0.60) : null;
    const cycHi = acc ? phCycleAccurate(refr, tE, tC, sh, scUsed, 0.75) : null;
    const t2measC = t2meas != null ? unit === "F" ? toC(t2meas) : t2meas : null;
    let etaImplied = null,
      t2dev = null;
    if (acc && t2measC != null) {
      const h2m = phShProp(refr, cyc.P_cond / 100, t2measC, 'h');
      if (h2m != null && h2m - cyc.h1 > 0) etaImplied = (cyc.h2s - cyc.h1) / (h2m - cyc.h1);
      if (cyc.T2 != null) t2dev = t2measC - cyc.T2;
    }
    return React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
      }
    }, React.createElement("div", {
      className: "slbl",
      style: {
        color: '#f87171',
        marginBottom: 0
      }
    }, "Refrigerant cycle \u2014 log p\u2013h ", acc ? '(CoolProp HEOS four-state model)' : '(schematic only \u2014 no quantitative cycle result)'), React.createElement("label", {
      className: "no-print",
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10,
        color: '#8a7a65',
        cursor: 'pointer'
      }
    }, React.createElement("input", {
      type: "checkbox",
      checked: showPh,
      onChange: e => setShowPh(e.target.checked)
    }), "include in print")), React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#8a7a65',
        marginBottom: 8,
        lineHeight: 1.5
      }
    }, acc ? React.createElement(React.Fragment, null, "Cycle on a log p\u2013h chart with the compression state from real superheated-vapour properties (CoolProp HEOS, IIR reference): evaporation at ", fmt(tE, 1), "\xB0C, condensing at ", fmt(tC, 1), "\xB0C", sh != null ? `, ${fmt(sh, 1)}K superheat` : '', `, ${fmt(scUsed, 1)}K subcooling${sc != null && sc <= 0 ? ' (read <=0, shown as 0)' : ''}`, ". Discharge state 2 is computed at the condenser pressure from the isentropic state and the efficiency below. All four states are HEOS-backed: the vapour and compression states from the superheated grid, and the subcooled-liquid state 3 from a real pressure\u2013temperature liquid grid (liquid pressure taken as the condenser pressure, neglecting condenser pressure drop).") : React.createElement(React.Fragment, null, "Schematic of the cycle on a log p\u2013h chart: evaporation at ", fmt(tE, 1), "\xB0C, condensing at ", fmt(tC, 1), "\xB0C", sh != null ? `, ${fmt(sh, 1)}K superheat` : '', sc != null ? `, ${fmt(sc, 1)}K subcooling` : '', ". The saturation dome is from the refrigerant property data (CoolProp HEOS, IIR reference). State points 1, 3 and 4 sit on the saturation curve; point 2 is drawn schematically to close the loop \u2014 ", React.createElement("strong", null, "not"), " a calculated discharge state.")), !acc && React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#fbbf24',
        marginBottom: 8,
        lineHeight: 1.5,
        padding: '9px 11px',
        background: 'rgba(251,191,36,.08)',
        borderRadius: 6,
        border: '1px solid rgba(251,191,36,.25)'
      }
    }, nearCritical ? React.createElement(React.Fragment, null, "Condensing pressure is within ", fmt((1 - PH_CRIT_FRAC) * 100, 0), "% of the critical pressure for ", refr, ". The property grid is not reliable this close to the critical point, so no computed cycle is shown \u2014 the result fails closed rather than report a doubtful number.") : wetSuction ? React.createElement(React.Fragment, null, "Superheat is at or below 0 (wet / saturated suction). The compressor inlet is in the two-phase region, so a quantitative compression cycle cannot be computed, and this is itself a fault with risk of liquid return. Correct the superheat and re-read.") : nearSat ? React.createElement(React.Fragment, null, "Measured superheat is positive but below ", SH_MIN_DRY, " K, so a dry-vapour suction state cannot be confirmed within normal measurement uncertainty. No computed cycle is shown \u2014 add superheat or verify the reading before trusting a cycle result.") : !shValid ? React.createElement(React.Fragment, null, "Enter a measured suction gas temperature (and liquid line temperature) so superheat is at least ", SH_MIN_DRY, " K, and a computed cycle with COP and discharge temperature appears here. Values are never assumed.") : React.createElement(React.Fragment, null, "This operating point is outside the validated superheated region, so only the schematic is shown. Check that pressures and temperatures are in range.")), acc && React.createElement("div", {
      className: "field no-print",
      style: {
        maxWidth: 280
      }
    }, React.createElement("div", {
      className: "lbl"
    }, React.createElement("span", null, "Isentropic efficiency \u03B7"), React.createElement("span", {
      className: "utag"
    }, "0.4\u20130.9")), React.createElement(FloatInput, {
      value: etaIs,
      onChange: setEtaIs,
      min: 0.4,
      max: 0.9,
      step: 0.01
    }), React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#8a7a65',
        marginTop: 3
      }
    }, "Typical scroll/recip compressor 0.6\u20130.75. Affects discharge state 2 and the work estimate.")), acc && React.createElement("div", {
      className: "field no-print",
      style: {
        maxWidth: 280,
        marginTop: 8
      }
    }, React.createElement("div", {
      className: "lbl"
    }, React.createElement("span", null, "Measured discharge temp"), React.createElement("span", {
      className: "utag"
    }, "deg ", unit, " \xB7 optional")), React.createElement(FloatInput, {
      value: t2meas,
      onChange: setT2meas,
      min: -20,
      max: 200,
      step: 0.0001
    }), React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#8a7a65',
        marginTop: 3
      }
    }, "Hot-gas line temperature, if measured. Compared with the computed discharge below.")), React.createElement("div", {
      className: "chartbox",
      style: {
        marginTop: 6
      }
    }, React.createElement(PhChart, {
      refr: refr,
      T_evap: tE,
      T_cond: tC,
      SH: shValid ? sh : 5,
      SC: scUsed > 0 ? scUsed : 5,
      eta: acc ? etaIs : undefined,
      accurate: acc
    })), React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#6b5d4a',
        marginTop: 4,
        lineHeight: 1.4
      }
    }, "Lines connect calculated state endpoints; the intermediate compression and heat-exchanger paths are schematic."), acc && cyc.COP != null && React.createElement("div", {
      className: "irow",
      style: {
        borderColor: 'rgba(220,38,38,.3)',
        background: 'rgba(220,38,38,.06)',
        marginTop: 8
      }
    }, React.createElement("span", null, React.createElement("span", {
      className: "ik"
    }, "Refrig. effect"), React.createElement("span", {
      className: "iv",
      style: {
        color: '#f87171'
      }
    }, fmt(cyc.q, 1)), React.createElement("span", {
      className: "iu"
    }, " kJ/kg")), React.createElement("span", null, React.createElement("span", {
      className: "ik"
    }, "Comp. work"), React.createElement("span", {
      className: "iv",
      style: {
        color: '#f87171'
      }
    }, fmt(cyc.w, 1)), React.createElement("span", {
      className: "iu"
    }, " kJ/kg")), React.createElement("span", null, React.createElement("span", {
      className: "ik"
    }, "Cycle COP"), React.createElement("span", {
      className: "iv",
      style: {
        color: '#f87171'
      }
    }, fmt(cyc.COP, 2))), cyc.T2 != null && React.createElement("span", null, React.createElement("span", {
      className: "ik"
    }, "Discharge T\u2082"), React.createElement("span", {
      className: "iv",
      style: {
        color: '#f87171'
      }
    }, fmt(cyc.T2, 1)), React.createElement("span", {
      className: "iu"
    }, " \xB0C"))), acc && cyc.COP != null && React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#8a7a65',
        marginTop: 4,
        lineHeight: 1.45
      }
    }, "At the assumed \u03B7 = ", fmt(etaIs, 2), ". ", cycLo && cycHi ? React.createElement(React.Fragment, null, "Across \u03B7 0.60\u20130.75 the cycle COP spans ", fmt(Math.min(cycLo.COP, cycHi.COP), 2), "\u2013", fmt(Math.max(cycLo.COP, cycHi.COP), 2), cycLo.T2 != null && cycHi.T2 != null ? React.createElement(React.Fragment, null, " and discharge ", fmt(Math.min(cycLo.T2, cycHi.T2), 0), "\u2013", fmt(Math.max(cycLo.T2, cycHi.T2), 0), "\xB0C") : null, ". ") : null, "COP and discharge are functions of this assumed efficiency, not measured values."), acc && t2measC != null && React.createElement("div", {
      className: "irow",
      style: {
        borderColor: 'rgba(96,165,250,.3)',
        background: 'rgba(96,165,250,.06)',
        marginTop: 8
      }
    }, React.createElement("span", null, React.createElement("span", {
      className: "ik"
    }, "Measured T\u2082"), React.createElement("span", {
      className: "iv",
      style: {
        color: '#60a5fa'
      }
    }, fmt(t2measC, 1)), React.createElement("span", {
      className: "iu"
    }, " \xB0C")), t2dev != null && React.createElement("span", null, React.createElement("span", {
      className: "ik"
    }, "vs computed"), React.createElement("span", {
      className: "iv",
      style: {
        color: Math.abs(t2dev) > 15 ? '#fbbf24' : '#60a5fa'
      }
    }, t2dev >= 0 ? '+' : '', fmt(t2dev, 1)), React.createElement("span", {
      className: "iu"
    }, " K")), etaImplied != null && React.createElement("span", null, React.createElement("span", {
      className: "ik"
    }, "Implied \u03B7"), React.createElement("span", {
      className: "iv",
      style: {
        color: etaImplied < 0.4 || etaImplied > 0.9 ? '#fbbf24' : '#60a5fa'
      }
    }, fmt(etaImplied, 2)))), acc && t2measC != null && React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#6b5d4a',
        marginTop: 4,
        lineHeight: 1.45
      }
    }, etaImplied != null ? React.createElement(React.Fragment, null, "Implied \u03B7 is the efficiency that would make the measured hot-gas temperature match. Treat it as a flag, not proof: a low implied \u03B7 (or a large positive \u0394T) can mean a hotter-running compressor (high superheat, undercharge, restriction, wear), but also pressure drop to the sensor or poor sensor contact/location. An implied \u03B7 above 1 or at/below 0 means the pressure and temperature do not describe the same state \u2014 check the measurement, not the compressor.") : React.createElement(React.Fragment, null, "The measured discharge could not be placed on the superheated grid at this pressure (likely below the saturation line or off-grid). Check the reading.")), React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#6b5d4a',
        marginTop: 6,
        lineHeight: 1.45
      }
    }, acc ? React.createElement(React.Fragment, null, "\u26A0 This is the ", React.createElement("strong", null, "modelled"), " refrigerant-cycle COP at the assumed compressor isentropic efficiency \u2014 ", React.createElement("strong", null, "not"), " the measured system EER (which includes fan/pump power and real losses). Discharge T\u2082 is the modelled compressor-outlet gas temperature; the measured discharge-line temperature may read higher or lower because of motor heat, oil effects, pressure loss, external heat transfer and sensor location. Use it to sanity-check the cycle, not as a performance rating.") : React.createElement(React.Fragment, null, "\u26A0 Schematic only \u2014 shows the cycle shape and pressure levels, not quantitative performance. No COP, work or discharge temperature, because those require a confirmed dry-vapour suction state (a measured superheat of at least a couple of kelvin) within the validated property region. Use it to visualise the cycle, not to rate it.")));
  })()), refr === "R744" && r744Critical && React.createElement("div", {
    className: "no-print",
    style: {
      marginTop: 12,
      padding: '12px',
      background: 'rgba(251,191,36,.06)',
      border: '1px solid rgba(251,191,36,.2)',
      borderRadius: 8,
      fontSize: 10,
      color: '#fbbf24',
      lineHeight: 1.5
    }
  }, "\u26A0 R744 (CO\u2082) transcritical p\u2013h cycle is not supported. Your discharge pressure is above the critical point (~73.8 bar / ~31\xB0C), so the high side is a ", React.createElement("strong", null, "gas cooler, not a condenser"), " \u2014 there is no condensing saturation temperature and no two-phase dome to plot on the high side. A correct transcritical diagram needs supercritical property states and gas-cooler-outlet logic, which this tool does not yet model."), refr === "R744" && !r744Critical && condOOR && React.createElement("div", {
    className: "no-print",
    style: {
      marginTop: 12,
      padding: '12px',
      background: 'rgba(251,191,36,.06)',
      border: '1px solid rgba(251,191,36,.2)',
      borderRadius: 8,
      fontSize: 10,
      color: '#fbbf24',
      lineHeight: 1.5
    }
  }, "\u26A0 Subcritical R744 (CO\u2082) condition, but the discharge pressure is above the validated saturation/cycle-data range (data ends at +25\xB0C / ~64 bar; critical point ~31\xB0C / ~73.8 bar). This is ", React.createElement("strong", null, "not"), " transcritical \u2014 the high side is still a condenser \u2014 but no cycle result is reported because the property data does not cover this interval."), refr !== "Other" && tE != null && tC != null && !PH_AVAILABLE.includes(refr) && React.createElement("div", {
    className: "no-print",
    style: {
      marginTop: 12,
      padding: '12px',
      background: 'rgba(251,191,36,.06)',
      border: '1px solid rgba(251,191,36,.2)',
      borderRadius: 8,
      fontSize: 10,
      color: '#fbbf24',
      lineHeight: 1.5
    }
  }, "A log p\u2013h cycle diagram for ", refr, " isn't available yet. Verified enthalpy data (CoolProp 7.2.0 HEOS, IIR reference) is currently loaded for ", PH_AVAILABLE.join(', '), ". ", refr, " is a blend CoolProp 7.2.0 ships no equation of state for; it will be added once REFPROP- or explicit-mixture-sourced data is in hand."), refr !== "Other" && pr != null && React.createElement("div", {
    className: "irow",
    style: {
      borderColor: rc + '44',
      background: rc + '11',
      marginTop: 12
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "P-ratio"), React.createElement("span", {
    className: "iv",
    style: {
      color: rc
    }
  }, fmt(pr, 4))), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "Suction"), React.createElement("span", {
    className: "iv",
    style: {
      color: rc
    }
  }, fmt(sP, 4)), React.createElement("span", {
    className: "iu"
  }, " bar g")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "Discharge"), React.createElement("span", {
    className: "iv",
    style: {
      color: rc
    }
  }, fmt(dP, 4)), React.createElement("span", {
    className: "iu"
  }, " bar g")), tE != null && tC != null && React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "dT lift"), React.createElement("span", {
    className: "iv",
    style: {
      color: rc
    }
  }, fmt(tC - tE, 4)), React.createElement("span", {
    className: "iu"
  }, " K"))));
}
function validateInputs(mode, p) {
  const issues = [];
  const add = (level, msg) => issues.push({
    level,
    msg
  });
  if (p.pw !== undefined && p.pw <= 0) add('invalid', 'Electrical power must be greater than zero');
  if (mode === 'aa') {
    if (p.eRH < 0 || p.eRH > 100) add('invalid', 'Return air RH outside 0-100%');
    if (p.lRH < 0 || p.lRH > 100) add('invalid', 'Supply air RH outside 0-100%');
    if (p.hL > p.hE) add('critical', 'Supply enthalpy exceeds return enthalpy — not cooling, check sensor placement');
    if (p.lC >= p.eC) add('caution', 'Supply DB not below return DB — verify cooling operation');
    if (p.af <= 0) add('invalid', 'Airflow must be greater than zero');
    if (p.af > 0 && p.af < 50) add('caution', 'Airflow unusually low — verify reading');
    if (p.lRH > 98) add('caution', 'Supply RH >98% — condensation on sensor likely, reading unreliable');
    if (Math.abs(p.hE - p.hL) < 2) add('caution', 'Enthalpy difference <2 kJ/kg — high relative uncertainty');
  }
  if (mode === 'al') {
    if (p.dTw <= 0) add('critical', 'Water ΔT is zero or negative — check sensor placement or operation mode');
    if (p.dTw > 0 && p.dTw < 2) add('caution', 'Water ΔT <2K — sensor uncertainty causes large Q error');
    if (p.wF <= 0) add('invalid', 'Liquid flow must be greater than zero');
    if (p.glyPct > 60) add('caution', 'Glycol concentration >60% — outside typical range');
  }
  if (mode === 'll') {
    if (p.dTc <= 0) add('critical', 'Cold side ΔT is zero or negative — check sensors');
    if (p.dTh <= 0) add('critical', 'Hot side ΔT is zero or negative — check sensors');
    if (p.dTc > 0 && p.dTc < 2) add('caution', 'Cold side ΔT <2K — high uncertainty');
    if (p.dTh > 0 && p.dTh < 2) add('caution', 'Hot side ΔT <2K — high uncertainty');
    if (p.Qh < p.Qc) add('critical', 'Q_hot < Q_cold — thermodynamically impossible, check flow/sensors');
    if (p.cF <= 0 || p.hF <= 0) add('invalid', 'Flow rates must be greater than zero');
  }
  if (p.eer !== undefined) {
    if (p.eer > 12) add('caution', 'EER >12 — verify power includes all consumers');
    if (p.eer > 0 && p.eer < 1.5) add('caution', 'EER <1.5 — unusually low, verify measurements');
  }
  return issues;
}
function ValidationBanner({
  issues
}) {
  if (!issues || !issues.length) return null;
  const crit = issues.filter(i => i.level === 'critical');
  const inv = issues.filter(i => i.level === 'invalid');
  const cau = issues.filter(i => i.level === 'caution');
  const info = issues.filter(i => i.level === 'info');
  const cfg = {
    critical: {
      c: '#f87171',
      bg: 'rgba(248,113,113,.12)',
      b: 'rgba(248,113,113,.5)',
      icon: '⛔',
      label: 'Critical'
    },
    invalid: {
      c: '#f87171',
      bg: 'rgba(248,113,113,.08)',
      b: 'rgba(248,113,113,.35)',
      icon: '✗',
      label: 'Invalid'
    },
    caution: {
      c: '#fbbf24',
      bg: 'rgba(251,191,36,.08)',
      b: 'rgba(251,191,36,.25)',
      icon: '⚠',
      label: 'Caution'
    },
    info: {
      c: '#7dd3fc',
      bg: 'rgba(125,211,252,.08)',
      b: 'rgba(125,211,252,.25)',
      icon: 'ℹ',
      label: 'Info'
    }
  };
  function group(arr, level) {
    if (!arr.length) return null;
    const k = cfg[level];
    return React.createElement("div", {
      style: {
        background: k.bg,
        border: '1px solid ' + k.b,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8
      }
    }, arr.map((it, i) => React.createElement("div", {
      key: i,
      style: {
        fontSize: 11,
        color: k.c,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        marginBottom: i < arr.length - 1 ? 4 : 0
      }
    }, React.createElement("span", null, k.icon), React.createElement("span", null, it.msg))));
  }
  return React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, group(crit, 'critical'), group(inv, 'invalid'), group(cau, 'caution'), group(info, 'info'));
}
function SteadyStateChecker() {
  const [open, setOpen] = React.useState(false);
  const [readings, setReadings] = React.useState([]);
  const [t, setT] = React.useState('');
  const [f, setF] = React.useState('');
  const [p, setP] = React.useState('');
  const [limT, setLimT] = React.useState(0.5);
  const [limF, setLimF] = React.useState(2.0);
  const [limP, setLimP] = React.useState(2.0);
  function addReading() {
    const tv = parseFloat(t),
      fv = parseFloat(f),
      pv = parseFloat(p);
    if (isNaN(tv) && isNaN(fv) && isNaN(pv)) return;
    setReadings(r => [...r, {
      time: new Date().toLocaleTimeString('sv-SE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      t: tv,
      f: fv,
      p: pv
    }]);
  }
  function clear() {
    setReadings([]);
  }
  let status = null;
  if (readings.length >= 2) {
    const ts = readings.map(r => r.t).filter(v => !isNaN(v));
    const fs = readings.map(r => r.f).filter(v => !isNaN(v));
    const ps = readings.map(r => r.p).filter(v => !isNaN(v));
    const driftT = ts.length >= 2 ? Math.max(...ts) - Math.min(...ts) : 0;
    const driftF = fs.length >= 2 ? (Math.max(...fs) - Math.min(...fs)) / ((Math.max(...fs) + Math.min(...fs)) / 2) * 100 : 0;
    const driftP = ps.length >= 2 ? (Math.max(...ps) - Math.min(...ps)) / ((Math.max(...ps) + Math.min(...ps)) / 2) * 100 : 0;
    const okT = driftT <= limT,
      okF = driftF <= limF,
      okP = driftP <= limP;
    const allOk = okT && okF && okP;
    status = {
      driftT,
      driftF,
      driftP,
      okT,
      okF,
      okP,
      allOk
    };
  }
  return React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(201,168,76,.2)'
    }
  }, React.createElement("button", {
    className: "guide-btn",
    onClick: () => setOpen(v => !v),
    style: {
      marginBottom: open ? 14 : 0
    }
  }, React.createElement("span", null, "Steady-State Checker \xA0", status && React.createElement("span", {
    style: {
      fontSize: 10,
      color: status.allOk ? '#22c55e' : '#fbbf24'
    }
  }, status.allOk ? '✓ Stable' : '⚠ Not stable yet')), React.createElement("span", {
    style: {
      transition: 'transform .2s',
      transform: open ? 'rotate(180deg)' : 'none'
    }
  }, "\u25BC")), open && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginBottom: 12,
      lineHeight: 1.6
    }
  }, "Log 3+ readings at 1-2 minute intervals. The unit is steady when drift in all parameters stays within limits. Take final measurements only when stable. Per ASHRAE Std 37 / EN ISO 5151."), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, "Stability Limits"), React.createElement("div", {
    className: "three"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "\u0394T max"), React.createElement("span", {
    className: "utag"
  }, "K")), React.createElement(FloatInput, {
    value: limT,
    onChange: setLimT,
    min: 0.1,
    max: 5,
    step: 0.1
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Flow max"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: limF,
    onChange: setLimF,
    min: 0.5,
    max: 10,
    step: 0.5
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Power max"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: limP,
    onChange: setLimP,
    min: 0.5,
    max: 10,
    step: 0.5
  }))), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginTop: 8,
      marginBottom: 8
    }
  }, "Add Reading"), React.createElement("div", {
    className: "three"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Temp / \u0394T"), React.createElement("span", {
    className: "utag"
  }, "\xB0C")), React.createElement(FloatInput, {
    value: t,
    onChange: v => setT(String(v)),
    step: 0.01
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Flow"), React.createElement("span", {
    className: "utag"
  }, "L/s")), React.createElement(FloatInput, {
    value: f,
    onChange: v => setF(String(v)),
    step: 0.01
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Power"), React.createElement("span", {
    className: "utag"
  }, "kW")), React.createElement(FloatInput, {
    value: p,
    onChange: v => setP(String(v)),
    step: 0.01
  }))), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 12
    }
  }, React.createElement("button", {
    onClick: addReading,
    style: {
      flex: 1,
      padding: '8px',
      borderRadius: 6,
      border: '1px solid rgba(34,197,94,.3)',
      background: 'rgba(34,197,94,.1)',
      color: '#22c55e',
      fontFamily: 'DM Mono,monospace',
      fontSize: 11,
      cursor: 'pointer'
    }
  }, "+ Log reading"), readings.length > 0 && React.createElement("button", {
    onClick: clear,
    style: {
      padding: '8px 14px',
      borderRadius: 6,
      border: '1px solid rgba(248,113,113,.3)',
      background: 'rgba(248,113,113,.08)',
      color: '#f87171',
      fontFamily: 'DM Mono,monospace',
      fontSize: 11,
      cursor: 'pointer'
    }
  }, "Clear")), readings.length > 0 && React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.2)',
      borderRadius: 8,
      padding: '10px',
      marginBottom: 12
    }
  }, React.createElement("table", {
    style: {
      width: '100%',
      fontSize: 10,
      borderCollapse: 'collapse'
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      color: '#8a7a65',
      textAlign: 'left'
    }
  }, React.createElement("th", {
    style: {
      padding: '2px 4px'
    }
  }, "Time"), React.createElement("th", {
    style: {
      padding: '2px 4px'
    }
  }, "T/\u0394T"), React.createElement("th", {
    style: {
      padding: '2px 4px'
    }
  }, "Flow"), React.createElement("th", {
    style: {
      padding: '2px 4px'
    }
  }, "Power"))), React.createElement("tbody", null, readings.map((r, i) => React.createElement("tr", {
    key: i,
    style: {
      color: '#c8b89a'
    }
  }, React.createElement("td", {
    style: {
      padding: '2px 4px'
    }
  }, r.time), React.createElement("td", {
    style: {
      padding: '2px 4px'
    }
  }, isNaN(r.t) ? '-' : fmt(r.t, 2)), React.createElement("td", {
    style: {
      padding: '2px 4px'
    }
  }, isNaN(r.f) ? '-' : fmt(r.f, 2)), React.createElement("td", {
    style: {
      padding: '2px 4px'
    }
  }, isNaN(r.p) ? '-' : fmt(r.p, 2))))))), status && React.createElement("div", {
    style: {
      background: status.allOk ? 'rgba(34,197,94,.1)' : 'rgba(251,191,36,.08)',
      border: '1px solid ' + (status.allOk ? 'rgba(34,197,94,.3)' : 'rgba(251,191,36,.25)'),
      borderRadius: 8,
      padding: '12px'
    }
  }, React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 14,
      fontWeight: 700,
      color: status.allOk ? '#22c55e' : '#fbbf24',
      marginBottom: 8
    }
  }, status.allOk ? '✓ STEADY STATE REACHED' : '⚠ NOT STABLE — wait and continue logging'), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      fontSize: 10
    }
  }, React.createElement("div", {
    style: {
      color: status.okT ? '#22c55e' : '#f87171'
    }
  }, "\u0394T drift: ", fmt(status.driftT, 2), " K ", status.okT ? '✓' : '✗'), React.createElement("div", {
    style: {
      color: status.okF ? '#22c55e' : '#f87171'
    }
  }, "Flow drift: ", fmt(status.driftF, 2), "% ", status.okF ? '✓' : '✗'), React.createElement("div", {
    style: {
      color: status.okP ? '#22c55e' : '#f87171'
    }
  }, "Power drift: ", fmt(status.driftP, 2), "% ", status.okP ? '✓' : '✗')))));
}
const SENSOR_PRESETS = {
  temp: {
    'PT100 Class A': 0.15,
    'PT100 1/3 DIN': 0.10,
    'PT1000 Class A': 0.15,
    'NTC 10k': 0.20,
    'Type T TC': 0.50,
    'Type K TC': 1.50
  },
  flow: {
    'Electromagnetic': 1.0,
    'Ultrasonic clamp': 2.0,
    'Turbine': 1.0,
    'Vortex': 1.5,
    'Mechanical': 3.0
  },
  rh: {
    'Capacitive ±2%': 2.0,
    'Capacitive ±3%': 3.0,
    'Chilled mirror': 0.5,
    'Sling psychro': 3.0
  },
  power: {
    'Class 0.2 analyser': 0.2,
    'Class 0.5 analyser': 0.5,
    'Class 1.0 meter': 1.0,
    'Clamp meter': 2.0
  }
};
function toStdU(tol, dist) {
  if (dist === 'rect') return tol / Math.sqrt(3);
  if (dist === 'tri') return tol / Math.sqrt(6);
  if (dist === 'k1') return tol;
  return tol / 2;
}
function liquidUncertainty(Q, dT, uT, uFlow_pct, uCp_pct, uRho_pct, commonFrac, typeA_pct, nEff) {
  const cf = commonFrac != null ? Math.max(0, Math.min(1, commonFrac)) : 0;
  const tA = typeA_pct != null ? typeA_pct : 0;
  const uCommon2 = cf * uT * uT;
  const uIndep2 = (1 - cf) * uT * uT;
  const u_dT = Math.sqrt(Math.max(0, 2 * uIndep2));
  const u_dT_pct = dT > 0 ? u_dT / Math.abs(dT) * 100 : 999;
  const uc_pct = Math.sqrt(uFlow_pct ** 2 + uRho_pct ** 2 + uCp_pct ** 2 + u_dT_pct ** 2 + tA ** 2);
  let kFactor = 2.0;
  if (tA > 0 && nEff != null && nEff > 1) {
    const veff = wsEffectiveDoF(uc_pct, tA, nEff - 1);
    kFactor = studentT95(veff);
  }
  const contributions = [{
    name: 'Flow',
    pct: uFlow_pct,
    share: (uFlow_pct / uc_pct) ** 2 * 100
  }, {
    name: 'ΔT',
    pct: u_dT_pct,
    share: (u_dT_pct / uc_pct) ** 2 * 100
  }, {
    name: 'Density ρ',
    pct: uRho_pct,
    share: (uRho_pct / uc_pct) ** 2 * 100
  }, {
    name: 'Spec heat cp',
    pct: uCp_pct,
    share: (uCp_pct / uc_pct) ** 2 * 100
  }];
  if (tA > 0) contributions.push({
    name: 'Type A repeatability',
    pct: tA,
    share: (tA / uc_pct) ** 2 * 100
  });
  return {
    uc_pct,
    U_pct: kFactor * uc_pct,
    U_abs: Q * kFactor * uc_pct / 100,
    u_dT_pct,
    commonFrac: cf,
    kFactor,
    contributions: contributions.sort((a, b) => b.share - a.share)
  };
}
function wsEffectiveDoF(uc_pct, uA_pct, vA) {
  if (uA_pct <= 0 || vA <= 0) return 1e6;
  return Math.pow(uc_pct, 4) / (Math.pow(uA_pct, 4) / vA);
}
function studentT95(v) {
  const tbl = [[1, 12.71], [2, 4.30], [3, 3.18], [4, 2.78], [5, 2.57], [6, 2.45], [7, 2.36], [8, 2.31], [9, 2.26], [10, 2.23], [12, 2.18], [15, 2.13], [20, 2.09], [30, 2.04], [50, 2.01], [100, 1.98]];
  if (v >= 100) return 2.0;
  for (let i = 0; i < tbl.length - 1; i++) {
    if (v >= tbl[i][0] && v < tbl[i + 1][0]) {
      const [v1, t1] = tbl[i],
        [v2, t2] = tbl[i + 1];
      return t1 + (t2 - t1) * (v - v1) / (v2 - v1);
    }
  }
  return tbl[0][1];
}
function airUncertainty(Q, dh, hInn, hUt, uT, uRH, uFlow_pct, T_ut, RH_ut) {
  const ps = t => 611.21 * Math.exp((18.678 - t / 234.5) * (t / (257.14 + t)));
  const dh_dT = 1.05;
  const pvUt = RH_ut / 100 * ps(T_ut);
  const dW_dRH = 0.622 * ps(T_ut) / (101500 - pvUt) ** 2 * 101500 / 100;
  const dh_dRH = (2501 + 1.86 * T_ut) * dW_dRH;
  const u_h = Math.sqrt((dh_dT * uT) ** 2 + (dh_dRH * uRH) ** 2);
  const u_dh = Math.sqrt(2) * u_h;
  const u_dh_pct = Math.abs(dh) > 0 ? u_dh / Math.abs(dh) * 100 : 999;
  const u_v_pct = uT * 0.34;
  const uc_pct = Math.sqrt(uFlow_pct ** 2 + u_v_pct ** 2 + u_dh_pct ** 2);
  return {
    uc_pct,
    U_pct: 2 * uc_pct,
    U_abs: Q * 2 * uc_pct / 100,
    contributions: [{
      name: 'Airflow',
      pct: uFlow_pct,
      share: (uFlow_pct / uc_pct) ** 2 * 100
    }, {
      name: 'Δenthalpy',
      pct: u_dh_pct,
      share: (u_dh_pct / uc_pct) ** 2 * 100
    }, {
      name: 'Spec volume',
      pct: u_v_pct,
      share: (u_v_pct / uc_pct) ** 2 * 100
    }].sort((a, b) => b.share - a.share)
  };
}
function UncertaintyPanel({
  mode,
  Q,
  EER,
  params,
  travCov,
  afMethod
}) {
  const [open, setOpen] = React.useState(false);
  const [uT, setUT] = React.useState(0.10);
  const [uFlow, setUFlow] = React.useState(2.0);
  const [uRH, setURH] = React.useState(2.0);
  const [uPow, setUPow] = React.useState(0.5);
  const [dist, setDist] = React.useState('k2');
  const [commonFrac, setCommonFrac] = React.useState(0);
  const [typeA, setTypeA] = React.useState(0);
  const [nEff, setNEff] = React.useState(0);
  const uT_std = toStdU(uT, dist);
  let uFlow_base = toStdU(uFlow, dist);
  if (mode === 'aa' && afMethod === 'free') uFlow_base = Math.max(uFlow_base, 20);
  const uFlow_eff = mode === 'aa' && travCov != null ? Math.sqrt(toStdU(uFlow, dist) ** 2 + travCov ** 2) : uFlow_base;
  const uFlow_std = uFlow_eff;
  const uRH_std = toStdU(uRH, dist);
  const uPow_std = toStdU(uPow, dist);
  const typeA_mean = nEff > 1 ? typeA / Math.sqrt(nEff) : typeA;
  let unc;
  if (mode === 'aa') {
    unc = airUncertainty(Q, params.dh, params.hInn, params.hUt, uT_std, uRH_std, uFlow_std, params.T_ut, params.RH_ut);
  } else {
    unc = liquidUncertainty(Q, params.dT, uT_std, uFlow_std, 0.5, 0.3, commonFrac, typeA_mean, nEff);
  }
  const u_EER_pct = Math.sqrt(unc.uc_pct ** 2 + uPow_std ** 2);
  const kEER = unc.kFactor || 2;
  const U_EER_pct = kEER * u_EER_pct;
  const col = unc.U_pct < 6 ? '#22c55e' : unc.U_pct < 16 ? '#fbbf24' : '#f87171';
  return React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(201,168,76,.2)'
    }
  }, React.createElement("button", {
    className: "guide-btn",
    onClick: () => setOpen(v => !v),
    style: {
      marginBottom: open ? 14 : 0
    }
  }, React.createElement("span", null, "Measurement Uncertainty (GUM) \xA0", React.createElement("span", {
    style: {
      fontSize: 10,
      opacity: .7,
      color: col
    }
  }, "Q = ", fmt(Q, 3), " \xB1 ", fmt(unc.U_abs, 3), " kW (\xB1", fmt(unc.U_pct, 1), "%)")), React.createElement("span", {
    style: {
      transition: 'transform .2s',
      transform: open ? 'rotate(180deg)' : 'none'
    }
  }, "\u25BC")), open && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginBottom: 12,
      lineHeight: 1.6
    }
  }, "ISO/IEC Guide 98-3 (GUM). Enter the ", React.createElement("strong", null, "\xB1 half-width"), " of each instrument tolerance (not the full span), and choose its distribution below. Expanded uncertainty U = k\xB7u_c; the coverage factor k is taken from the Student-t value for the effective degrees of freedom (Welch-Satterthwaite), approaching k=2 (\u224895%) when degrees of freedom are large."), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Temp sensor \xB1"), React.createElement("span", {
    className: "utag"
  }, "K")), React.createElement(FloatInput, {
    value: uT,
    onChange: setUT,
    min: 0.01,
    max: 2,
    step: 0.01
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, "PT100 1/3 DIN = 0.10 K")), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, mode === 'aa' ? 'Airflow ±' : 'Flow ±'), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: uFlow,
    onChange: setUFlow,
    min: 0.1,
    max: 15,
    step: 0.1
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: mode === 'aa' && afMethod === 'free' ? '#f87171' : mode === 'aa' && travCov != null ? '#7dd3fc' : '#8a7a65',
      marginTop: 3
    }
  }, mode === 'aa' && afMethod === 'free' ? `free reading → floored at 20% (using ${fmt(uFlow_eff, 1)}%)` : mode === 'aa' && travCov != null ? `+ traverse scatter ${fmt(travCov, 1)}% → combined ${fmt(uFlow_eff, 1)}%` : mode === 'aa' ? 'Anemometer 5-10%' : 'Ultrasonic 2%'))), React.createElement("div", {
    className: "two"
  }, mode === 'aa' && React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "RH sensor \xB1"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: uRH,
    onChange: setURH,
    min: 0.1,
    max: 5,
    step: 0.1
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, "Capacitive \xB12%")), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Power meter \xB1"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: uPow,
    onChange: setUPow,
    min: 0.1,
    max: 5,
    step: 0.1
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, "Class 0.5 analyser"))), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      marginTop: 14,
      marginBottom: 8,
      letterSpacing: '.05em',
      textTransform: 'uppercase'
    }
  }, "GUM model parameters"), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Tolerance distribution")), React.createElement("select", {
    value: dist,
    onChange: e => setDist(e.target.value),
    style: {
      width: '100%',
      padding: '8px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 13
    }
  }, React.createElement("option", {
    value: "k2"
  }, "Normal, k=2 (manufacturer spec \xF72)"), React.createElement("option", {
    value: "k1"
  }, "Standard uncertainty (\xF71)"), React.createElement("option", {
    value: "rect"
  }, "Rectangular (\xF7\u221A3)"), React.createElement("option", {
    value: "tri"
  }, "Triangular (\xF7\u221A6)")), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, "How stated \xB1 limits convert to standard uncertainty")), mode !== 'aa' && React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Common-mode fraction")), React.createElement(FloatInput, {
    value: commonFrac,
    onChange: setCommonFrac,
    min: 0,
    max: 1,
    step: 0.05
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, "Fraction of probe error that is documented shared offset (cancels in \u0394T). 0 unless a calibration certificate proves it."))), mode !== 'aa' && React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Type A repeatability \xB1"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: typeA,
    onChange: setTypeA,
    min: 0,
    max: 10,
    step: 0.1
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, "Std dev (s) of steady-state log readings (0 if unknown)")), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Effective samples n_eff")), React.createElement(FloatInput, {
    value: nEff,
    onChange: setNEff,
    min: 0,
    max: 500,
    step: 1
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, "Independent readings behind s. Type A of the mean = s/\u221An_eff. Use a low count if readings are autocorrelated."))), commonFrac > 0 && mode !== 'aa' && React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#7dd3fc',
      marginTop: 4,
      marginBottom: 8,
      lineHeight: 1.5,
      padding: '7px 9px',
      background: 'rgba(125,211,252,.07)',
      borderRadius: 6
    }
  }, "With ", fmt(commonFrac * 100, 0), "% common-mode, only the independent part of the probe error remains in \u0394T: u_\u0394T/\u0394T = ", fmt(unc.u_dT_pct, 2), "% (vs ", fmt(Math.sqrt(2) * toStdU(uT, dist) / Math.abs(params.dT || 1) * 100, 2), "% with no common-mode cancellation). The shared offset must be evidenced by a calibration certificate \u2014 do not assume it."), mode !== 'aa' && React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 4,
      marginBottom: 8,
      lineHeight: 1.5,
      padding: '7px 9px',
      background: 'rgba(201,168,76,.05)',
      borderRadius: 6
    }
  }, "Coverage factor in use: k = ", fmt(unc.kFactor || 2, 2), " ", unc.kFactor && unc.kFactor > 2.05 ? '(Student-t, limited degrees of freedom — wider than k=2)' : '(large effective degrees of freedom)', "."), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginTop: 8,
      marginBottom: 12
    }
  }, React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.25)',
      borderRadius: 10,
      padding: '14px',
      border: '1px solid ' + col + '44'
    }
  }, React.createElement("div", {
    className: "rn"
  }, "Capacity Q \xB1 U"), React.createElement("div", {
    className: "rv",
    style: {
      color: col,
      fontSize: 20
    }
  }, fmt(Q, 3), " \xB1 ", fmt(unc.U_abs, 3)), React.createElement("div", {
    className: "ru"
  }, "kW \xB7 \xB1", fmt(unc.U_pct, 2), "% (k=2)")), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.25)',
      borderRadius: 10,
      padding: '14px',
      border: '1px solid ' + col + '44'
    }
  }, React.createElement("div", {
    className: "rn"
  }, "EER \xB1 U"), React.createElement("div", {
    className: "rv",
    style: {
      color: col,
      fontSize: 20
    }
  }, fmt(EER, 3), " \xB1 ", fmt(EER * U_EER_pct / 100, 3)), React.createElement("div", {
    className: "ru"
  }, "\xB1", fmt(U_EER_pct, 2), "% (k=2)"))), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, "Uncertainty Contributions"), unc.contributions.map((c, i) => React.createElement("div", {
    key: i,
    style: {
      marginBottom: 6
    }
  }, React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 10,
      color: '#c8b89a',
      marginBottom: 2
    }
  }, React.createElement("span", null, c.name), React.createElement("span", null, "\xB1", fmt(c.pct, 2), "% \xB7 ", fmt(c.share, 0), "% of total")), React.createElement("div", {
    style: {
      height: 5,
      background: 'rgba(201,168,76,.1)',
      borderRadius: 3
    }
  }, React.createElement("div", {
    style: {
      width: Math.min(100, c.share) + '%',
      height: '100%',
      background: i === 0 ? col : '#8a7a65',
      borderRadius: 3
    }
  })))), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 10,
      lineHeight: 1.5
    }
  }, "Combined standard uncertainty u_c = \xB1", fmt(unc.uc_pct, 2), "%. Dominant source: ", React.createElement("strong", {
    style: {
      color: col
    }
  }, unc.contributions[0].name), ".", unc.contributions[0].name === 'ΔT' && ' Increase ΔT or use more accurate sensors to reduce.', unc.contributions[0].name === 'Airflow' && ' Multi-point duct traverse would reduce this significantly.')));
}
function parseMeasurement(rawText, opts) {
  opts = opts || {};
  var min = opts.min === undefined ? null : opts.min;
  var max = opts.max === undefined ? null : opts.max;
  var out = {
    rawText: rawText == null ? '' : String(rawText),
    parsedValue: null,
    valid: false,
    source: opts.source || 'measured',
    unit: opts.unit || null,
    reason: null
  };
  var s = out.rawText.trim().replace(/\s+/g, '');
  if (s === '') {
    out.reason = 'empty';
    return out;
  }
  if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) {
    out.reason = 'ambiguous_separators';
    return out;
  }
  s = s.replace(',', '.').replace(/^\+/, '');
  if (!/^-?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(s)) {
    out.reason = 'not_a_number';
    return out;
  }
  var n = Number(s);
  if (!isFinite(n)) {
    out.reason = 'not_finite';
    return out;
  }
  out.parsedValue = n;
  if (min != null && n < min) {
    out.reason = 'below_min';
    return out;
  }
  if (max != null && n > max) {
    out.reason = 'above_max';
    return out;
  }
  out.valid = true;
  return out;
}
function FloatInput(props) {
  var value = props.value,
    onChange = props.onChange,
    min = props.min,
    max = props.max,
    style = props.style,
    placeholder = props.placeholder,
    unit = props.unit,
    onValidity = props.onValidity;
  function emptyOrNaN(v) {
    return v === undefined || v === null || typeof v === 'number' && isNaN(v);
  }
  var st = React.useState(emptyOrNaN(value) ? '' : String(value));
  var raw = st[0],
    setRaw = st[1];
  var bs = React.useState(false);
  var bad = bs[0],
    setBad = bs[1];
  var editing = React.useRef(false);
  React.useEffect(function () {
    if (!editing.current) {
      setRaw(emptyOrNaN(value) ? '' : String(value));
      setBad(false);
    }
  }, [value]);
  function commit(text) {
    var m = parseMeasurement(text, {
      min: min,
      max: max,
      unit: unit
    });
    if (m.rawText === '') {
      setBad(false);
      onChange(NaN);
      if (onValidity) onValidity(false, m);
      return;
    }
    if (m.valid) {
      setBad(false);
      onChange(m.parsedValue);
      if (onValidity) onValidity(true, m);
    } else {
      setBad(true);
      onChange(NaN);
      if (onValidity) onValidity(false, m);
    }
  }
  var stl = style || {};
  if (bad) {
    stl = Object.assign({}, stl, {
      borderColor: '#f87171',
      background: 'rgba(248,113,113,.08)'
    });
  }
  return React.createElement('input', {
    type: 'text',
    inputMode: 'decimal',
    value: raw,
    style: stl,
    placeholder: placeholder,
    'aria-invalid': bad ? 'true' : 'false',
    onFocus: function () {
      editing.current = true;
    },
    onChange: function (e) {
      setRaw(e.target.value);
      commit(e.target.value);
    },
    onBlur: function () {
      editing.current = false;
      commit(raw);
    }
  });
}
const LOGT_RECT = {
  5: [0.074, 0.288, 0.500, 0.712, 0.926],
  6: [0.061, 0.235, 0.437, 0.563, 0.765, 0.939],
  7: [0.053, 0.203, 0.366, 0.500, 0.634, 0.797, 0.947]
};
function ptsPerSide(mm) {
  return mm < 760 ? 5 : mm <= 915 ? 6 : 7;
}
function ringFracs(n) {
  const a = [];
  for (let i = 1; i <= n; i++) a.push(Math.sqrt((2 * i - 1) / (2 * n)));
  return a;
}
const PH_SAT = {
  "R32": [[-40, 177.6, 133.23, 502.02, 0.7382, 2.32], [-35, 221.4, 141.31, 504.21, 0.7723, 2.2962], [-30, 273.6, 149.45, 506.27, 0.806, 2.2735], [-25, 334.6, 157.66, 508.2, 0.8392, 2.2518], [-20, 406.0, 165.94, 509.97, 0.872, 2.231], [-15, 488.2, 174.31, 511.58, 0.9044, 2.2109], [-10, 582.9, 182.77, 513.02, 0.9365, 2.1915], [-5, 690.7, 191.33, 514.26, 0.9684, 2.1727], [0, 813.4, 200.0, 515.3, 1.0, 2.1543], [5, 951.6, 208.8, 516.1, 1.0315, 2.1363], [10, 1107.3, 217.75, 516.65, 1.0628, 2.1185], [15, 1281.0, 226.85, 516.93, 1.094, 2.1008], [20, 1475.0, 236.13, 516.89, 1.1253, 2.0831], [25, 1689.8, 245.61, 516.51, 1.1566, 2.0652], [30, 1928.0, 255.32, 515.72, 1.1881, 2.0471], [35, 2190.1, 265.31, 514.48, 1.2198, 2.0284], [40, 2478.9, 275.62, 512.69, 1.252, 2.0091], [45, 2795.1, 286.31, 510.29, 1.2847, 1.9887], [50, 3141.9, 297.5, 507.08, 1.3183, 1.9669], [55, 3520.2, 309.29, 502.92, 1.3532, 1.9432], [60, 3934.0, 321.95, 497.4, 1.3898, 1.9165], [65, 4384.6, 335.82, 490.03, 1.4294, 1.8854], [70, 4877.8, 351.82, 479.39, 1.4743, 1.8461]],
  "R290": [[-40, 111.2, 105.12, 528.47, 0.6275, 2.4433], [-35, 137.3, 116.48, 534.44, 0.6755, 2.4306], [-30, 167.9, 127.97, 540.38, 0.723, 2.4192], [-25, 203.5, 139.59, 546.28, 0.7701, 2.409], [-20, 244.6, 151.36, 552.13, 0.8167, 2.3999], [-15, 291.7, 163.27, 557.92, 0.863, 2.3918], [-10, 345.3, 175.34, 563.65, 0.9089, 2.3846], [-5, 406.1, 187.58, 569.3, 0.9546, 2.3781], [0, 474.5, 199.99, 574.86, 1.0, 2.3724], [5, 551.2, 212.59, 580.32, 1.0451, 2.3672], [10, 636.6, 225.39, 585.67, 1.0902, 2.3626], [15, 731.6, 238.4, 590.88, 1.135, 2.3583], [20, 836.5, 251.63, 595.94, 1.1798, 2.3544], [25, 952.2, 265.1, 600.83, 1.2246, 2.3507], [30, 1079.0, 278.83, 605.53, 1.2694, 2.3472], [35, 1218.0, 292.83, 610.0, 1.3143, 2.3436], [40, 1369.5, 307.14, 614.21, 1.3593, 2.3399], [45, 1534.4, 321.78, 618.11, 1.4046, 2.336], [50, 1713.3, 336.79, 621.65, 1.4502, 2.3317], [55, 1907.3, 352.23, 624.76, 1.4962, 2.3268], [60, 2116.8, 368.13, 627.35, 1.5428, 2.321], [65, 2343.1, 384.6, 629.27, 1.5903, 2.3139], [70, 2586.8, 401.75, 630.36, 1.6389, 2.3051]],
  "R410A": [[-40, 175.6, 142.25, 405.08, 0.7736, 1.9011], [-35, 219.0, 149.22, 407.48, 0.8031, 1.8876], [-30, 270.5, 156.24, 409.8, 0.8321, 1.875], [-25, 330.6, 163.33, 412.02, 0.8607, 1.863], [-20, 400.9, 170.48, 414.14, 0.8891, 1.8517], [-15, 481.8, 177.72, 416.15, 0.9171, 1.8408], [-10, 574.9, 185.05, 418.04, 0.9449, 1.8304], [-5, 680.7, 192.47, 419.79, 0.9725, 1.8204], [0, 801.0, 200.0, 421.38, 1.0, 1.8106], [5, 936.3, 207.66, 422.81, 1.0274, 1.801], [10, 1088.7, 215.45, 424.05, 1.0546, 1.7914], [15, 1258.4, 223.4, 425.07, 1.0819, 1.7819], [20, 1447.9, 231.52, 425.83, 1.1093, 1.7722], [25, 1657.4, 239.84, 426.31, 1.1368, 1.7623], [30, 1889.7, 248.39, 426.45, 1.1644, 1.7519], [35, 2144.9, 257.2, 426.19, 1.1925, 1.741], [40, 2426.2, 266.33, 425.43, 1.2209, 1.7291], [45, 2734.0, 275.85, 424.08, 1.2501, 1.7161], [50, 3071.8, 285.9, 421.9, 1.2803, 1.7012], [55, 3440.1, 296.64, 418.64, 1.312, 1.6838], [60, 3843.5, 308.52, 413.64, 1.3465, 1.6621], [65, 4282.9, 322.52, 405.64, 1.3865, 1.6323], [70, 4765.0, 346.44, 386.69, 1.4545, 1.5719]],
  "R22": [[-40, 105.3, 154.89, 388.13, 0.8227, 1.8231], [-35, 132.1, 160.37, 390.43, 0.8459, 1.812], [-30, 164.0, 165.88, 392.69, 0.8687, 1.8015], [-25, 201.5, 171.44, 394.9, 0.8912, 1.7918], [-20, 245.4, 177.05, 397.06, 0.9135, 1.7826], [-15, 296.3, 182.7, 399.16, 0.9354, 1.774], [-10, 354.9, 188.41, 401.2, 0.9572, 1.7658], [-5, 421.9, 194.17, 403.16, 0.9787, 1.7581], [0, 498.2, 200.0, 405.05, 1.0, 1.7507], [5, 584.3, 205.9, 406.85, 1.0212, 1.7436], [10, 681.2, 211.87, 408.56, 1.0422, 1.7368], [15, 789.5, 217.92, 410.16, 1.063, 1.7302], [20, 910.3, 224.06, 411.66, 1.0838, 1.7238], [25, 1044.1, 230.29, 413.03, 1.1045, 1.7174], [30, 1192.2, 236.63, 414.26, 1.1252, 1.7111], [35, 1355.0, 243.07, 415.34, 1.1458, 1.7048], [40, 1533.9, 249.65, 416.24, 1.1665, 1.6985], [45, 1729.5, 256.37, 416.95, 1.1872, 1.6919], [50, 1943.0, 263.25, 417.43, 1.208, 1.6852], [55, 2175.4, 270.32, 417.65, 1.2291, 1.6781], [60, 2427.9, 277.62, 417.54, 1.2504, 1.6704], [65, 2701.5, 285.19, 417.06, 1.2722, 1.6622], [70, 2997.9, 293.1, 416.08, 1.2945, 1.6529]],
  "R134a": [[-40, 51.3, 148.15, 374.0, 0.7956, 1.7644], [-35, 66.2, 154.45, 377.17, 0.8223, 1.7575], [-30, 84.5, 160.79, 380.32, 0.8486, 1.7515], [-25, 106.4, 167.19, 383.45, 0.8746, 1.7461], [-20, 132.8, 173.64, 386.55, 0.9002, 1.7413], [-15, 164.0, 180.14, 389.63, 0.9256, 1.7371], [-10, 200.7, 186.7, 392.66, 0.9506, 1.7334], [-5, 243.4, 193.32, 395.66, 0.9754, 1.73], [0, 292.9, 200.0, 398.6, 1.0, 1.7271], [5, 349.8, 206.75, 401.49, 1.0243, 1.7245], [10, 414.8, 213.58, 404.32, 1.0485, 1.7221], [15, 488.5, 220.48, 407.07, 1.0724, 1.72], [20, 571.9, 227.47, 409.75, 1.0962, 1.718], [25, 665.5, 234.55, 412.33, 1.1199, 1.7162], [30, 770.4, 241.73, 414.82, 1.1435, 1.7145], [35, 887.1, 249.01, 417.19, 1.167, 1.7128], [40, 1016.9, 256.41, 419.43, 1.1905, 1.7111], [45, 1160.1, 263.95, 421.52, 1.2139, 1.7092], [50, 1318.2, 271.63, 423.43, 1.2375, 1.7072], [55, 1491.7, 279.47, 425.15, 1.2611, 1.705], [60, 1682.1, 287.51, 426.62, 1.2848, 1.7024], [65, 1890.1, 295.77, 427.81, 1.3088, 1.6993], [70, 2117.2, 304.29, 428.64, 1.3332, 1.6956]],
  "R407C": [[-40, 120.4, 145.47, 387.67, 0.7857, 1.8412], [-35, 150.8, 152.09, 390.58, 0.8137, 1.8306], [-30, 187.3, 158.76, 393.44, 0.8413, 1.8209], [-25, 230.0, 165.47, 396.26, 0.8685, 1.812], [-20, 280.1, 172.25, 399.02, 0.8954, 1.8038], [-15, 338.0, 179.08, 401.72, 0.9219, 1.7961], [-10, 404.9, 185.98, 404.35, 0.9482, 1.789], [-5, 481.1, 192.95, 406.91, 0.9742, 1.7823], [0, 568.1, 200.0, 409.38, 1.0, 1.776], [5, 666.1, 207.14, 411.75, 1.0256, 1.77], [10, 776.7, 214.37, 414.02, 1.051, 1.7643], [15, 900.0, 221.7, 416.16, 1.0763, 1.7588], [20, 1037.9, 229.15, 418.17, 1.1016, 1.7534], [25, 1190.4, 236.72, 420.03, 1.1267, 1.748], [30, 1359.4, 244.44, 421.71, 1.1519, 1.7426], [35, 1545.0, 252.32, 423.19, 1.1771, 1.7371], [40, 1749.3, 260.38, 424.43, 1.2025, 1.7313], [45, 1972.3, 268.65, 425.4, 1.228, 1.7252], [50, 2216.4, 277.16, 426.04, 1.2538, 1.7186], [55, 2481.4, 285.97, 426.28, 1.28, 1.7113], [60, 2770.0, 295.15, 426.01, 1.3069, 1.7029], [65, 3082.0, 304.79, 425.08, 1.3346, 1.6932], [70, 3420.3, 315.11, 423.19, 1.3638, 1.6812]],
  "R404A": [[-40, 135.4, 147.13, 343.48, 0.7925, 1.6363], [-35, 168.6, 153.5, 346.46, 0.8194, 1.6312], [-30, 207.9, 159.92, 349.4, 0.846, 1.6266], [-25, 253.8, 166.41, 352.3, 0.8722, 1.6225], [-20, 307.3, 172.96, 355.14, 0.8982, 1.6189], [-15, 368.7, 179.59, 357.93, 0.9239, 1.6157], [-10, 439.3, 186.31, 360.64, 0.9495, 1.6129], [-5, 519.4, 193.11, 363.28, 0.9748, 1.6102], [0, 610.4, 200.0, 365.82, 1.0, 1.6078], [5, 712.5, 207.0, 368.25, 1.0251, 1.6054], [10, 827.4, 214.12, 370.56, 1.0501, 1.6032], [15, 955.1, 221.36, 372.74, 1.075, 1.6009], [20, 1097.5, 228.75, 374.74, 1.1, 1.5984], [25, 1254.7, 236.29, 376.56, 1.125, 1.5958], [30, 1428.7, 244.02, 378.15, 1.1501, 1.5929], [35, 1619.8, 251.96, 379.47, 1.1755, 1.5896], [40, 1830.0, 260.16, 380.45, 1.2012, 1.5856], [45, 2059.6, 268.66, 381.01, 1.2274, 1.5807], [50, 2311.4, 277.56, 381.01, 1.2542, 1.5746], [55, 2585.6, 286.97, 380.28, 1.2822, 1.5667], [60, 2885.6, 297.16, 378.36, 1.3119, 1.5558], [65, 3212.7, 308.63, 374.49, 1.3448, 1.5397], [70, 3573.0, 324.18, 364.62, 1.389, 1.5069]],
  "R1234yf": [[-40, 62.4, 151.07, 336.58, 0.8074, 1.6031], [-35, 79.1, 156.9, 339.95, 0.8321, 1.6007], [-30, 99.1, 162.81, 343.32, 0.8566, 1.599], [-25, 122.9, 168.8, 346.69, 0.8809, 1.5978], [-20, 151.0, 174.87, 350.05, 0.905, 1.597], [-15, 183.8, 181.03, 353.4, 0.929, 1.5967], [-10, 221.9, 187.27, 356.72, 0.9528, 1.5968], [-5, 265.7, 193.59, 360.02, 0.9765, 1.5971], [0, 316.0, 200.0, 363.29, 1.0, 1.5978], [5, 373.0, 206.51, 366.52, 1.0234, 1.5987], [10, 437.7, 213.11, 369.7, 1.0467, 1.5998], [15, 510.3, 219.8, 372.83, 1.07, 1.601], [20, 591.9, 226.6, 375.89, 1.0931, 1.6024], [25, 682.7, 233.5, 378.87, 1.1162, 1.6037], [30, 783.7, 240.52, 381.75, 1.1392, 1.6051], [35, 895.3, 247.65, 384.52, 1.1622, 1.6064], [40, 1018.7, 254.91, 387.17, 1.1851, 1.6075], [45, 1153.9, 262.3, 389.66, 1.2082, 1.6085], [50, 1302.6, 269.86, 391.98, 1.2313, 1.6092], [55, 1464.8, 277.59, 394.08, 1.2545, 1.6095], [60, 1642.2, 285.53, 395.92, 1.278, 1.6093], [65, 1834.9, 293.72, 397.45, 1.3017, 1.6085], [70, 2044.9, 302.23, 398.56, 1.326, 1.6068]],
  "R1234ze": [[-40, 36.8, 148.67, 355.94, 0.7975, 1.6865], [-35, 47.7, 154.95, 359.52, 0.8241, 1.6831], [-30, 61.1, 161.26, 363.09, 0.8503, 1.6804], [-25, 77.4, 167.61, 366.65, 0.8761, 1.6782], [-20, 96.9, 174.0, 370.21, 0.9015, 1.6766], [-15, 120.1, 180.43, 373.74, 0.9266, 1.6755], [-10, 147.5, 186.9, 377.25, 0.9514, 1.6747], [-5, 179.5, 193.43, 380.73, 0.9758, 1.6744], [0, 216.6, 200.01, 384.18, 1.0, 1.6743], [5, 259.4, 206.64, 387.59, 1.024, 1.6745], [10, 308.5, 213.33, 390.96, 1.0477, 1.675], [15, 364.3, 220.08, 394.27, 1.0711, 1.6757], [20, 427.5, 226.91, 397.53, 1.0944, 1.6765], [25, 498.7, 233.8, 400.72, 1.1176, 1.6774], [30, 578.5, 240.78, 403.84, 1.1405, 1.6784], [35, 667.6, 247.85, 406.87, 1.1634, 1.6795], [40, 766.6, 255.01, 409.8, 1.1862, 1.6805], [45, 876.3, 262.27, 412.63, 1.2089, 1.6815], [50, 997.4, 269.65, 415.33, 1.2315, 1.6823], [55, 1130.6, 277.15, 417.88, 1.2542, 1.683], [60, 1276.8, 284.79, 420.26, 1.2769, 1.6835], [65, 1436.7, 292.59, 422.45, 1.2996, 1.6837], [70, 1611.2, 300.56, 424.4, 1.3225, 1.6834]],
  "R744": [[-40, 1005.0, 112.91, 435.32, 0.6657, 2.0485], [-35, 1202.9, 123.06, 436.23, 0.708, 2.023], [-30, 1428.4, 133.35, 436.81, 0.7498, 1.9979], [-25, 1683.3, 143.8, 437.05, 0.7914, 1.9732], [-20, 1970.4, 154.46, 436.88, 0.8329, 1.9485], [-15, 2291.5, 165.35, 436.27, 0.8742, 1.9237], [-10, 2649.5, 176.53, 435.12, 0.9157, 1.8985], [-5, 3046.7, 188.06, 433.37, 0.9576, 1.8725], [0, 3486.1, 200.02, 430.88, 1.0, 1.8453], [5, 3970.4, 212.52, 427.47, 1.0435, 1.8163], [10, 4503.4, 225.75, 422.85, 1.0885, 1.7846], [15, 5088.3, 240.02, 416.6, 1.136, 1.7488], [20, 5730.5, 255.93, 407.79, 1.1879, 1.706], [25, 6435.7, 274.89, 394.28, 1.2488, 1.6493]]
};
const PH_AVAILABLE = Object.keys(PH_SAT);
const PH_CRIT = {
  R32: 57.82,
  R290: 42.51,
  R410A: 49.01,
  R22: 49.90,
  R134a: 40.59,
  R407C: 46.32,
  R404A: 37.35,
  R1234yf: 33.82,
  R1234ze: 36.35,
  R744: 73.77
};
const PH_CRIT_FRAC = 0.85;
function phInterp(ref, T, col) {
  const d = PH_SAT[ref];
  if (!d) return null;
  const TOL = 0.5;
  if (T < d[0][0] - TOL || T > d[d.length - 1][0] + TOL) return null;
  let a, b;
  if (T <= d[0][0]) {
    a = d[0];
    b = d[1];
  } else if (T >= d[d.length - 1][0]) {
    a = d[d.length - 2];
    b = d[d.length - 1];
  } else {
    for (let i = 0; i < d.length - 1; i++) {
      if (d[i][0] <= T && T <= d[i + 1][0]) {
        a = d[i];
        b = d[i + 1];
        break;
      }
    }
  }
  const f = b[0] !== a[0] ? (T - a[0]) / (b[0] - a[0]) : 0;
  return a[col] + f * (b[col] - a[col]);
}
function phTfromP(ref, P) {
  const d = PH_SAT[ref];
  if (!d) return null;
  const loP = d[0][1],
    hiP = d[d.length - 1][1];
  if (P < loP * 0.98 || P > hiP * 1.02) return null;
  if (P <= loP) return d[0][0];
  if (P >= hiP) return d[d.length - 1][0];
  for (let i = 0; i < d.length - 1; i++) {
    if (d[i][1] <= P && P <= d[i + 1][1]) {
      const f = (P - d[i][1]) / (d[i + 1][1] - d[i][1]);
      return d[i][0] + f * (d[i + 1][0] - d[i][0]);
    }
  }
  return null;
}
function phCycle(ref, T_evap, T_cond, SH, SC) {
  if (!PH_SAT[ref]) return null;
  const P_evap = phInterp(ref, T_evap, 1),
    P_cond = phInterp(ref, T_cond, 1);
  const hg_e = phInterp(ref, T_evap, 3);
  const hf_c = phInterp(ref, T_cond, 2);
  const hg_c = phInterp(ref, T_cond, 3);
  if (P_evap == null || P_cond == null || hg_e == null || hf_c == null || hg_c == null) return null;
  const h1 = hg_e + Math.max(0, SH) * 0.0;
  const h3 = hf_c;
  const h4 = h3;
  const h2 = hg_c + (hg_c - hf_c) * 0.18;
  return {
    P_evap,
    P_cond,
    h1,
    h2,
    h3,
    h4,
    schematic: true
  };
}
let PH_SH = typeof window !== 'undefined' && window.__PH_SH__ ? window.__PH_SH__ : null;
function phShReady(refr) {
  return !!(PH_SH && PH_SH.SH && PH_SH.SH[refr] && PH_SH.meta);
}
function phSatVaporAtP(refr, P_bar) {
  const tab = PH_SAT[refr];
  if (!tab || !tab.length) return null;
  const Pk = P_bar * 100;
  let lo = null,
    hi = null;
  for (let r = 0; r < tab.length; r++) {
    if (tab[r][1] <= Pk) lo = tab[r];
    if (tab[r][1] >= Pk && hi == null) hi = tab[r];
  }
  if (!lo || !hi) return null;
  if (lo === hi) return {
    Tsat: lo[0],
    hg: lo[3],
    sg: lo[5]
  };
  const f = hi[1] === lo[1] ? 0 : (Pk - lo[1]) / (hi[1] - lo[1]);
  return {
    Tsat: lo[0] + f * (hi[0] - lo[0]),
    hg: lo[3] + f * (hi[3] - lo[3]),
    sg: lo[5] + f * (hi[5] - lo[5])
  };
}
function getVapourState(refr, P_bar, T_C) {
  if (!phShReady(refr)) return {
    valid: false,
    code: 'NO_GRID'
  };
  const Pax = PH_SH.meta.P_bar,
    Tax = PH_SH.meta.T_C,
    Gh = PH_SH.SH[refr].h,
    Gs = PH_SH.SH[refr].s;
  if (P_bar < Pax[0] || P_bar > Pax[Pax.length - 1]) return {
    valid: false,
    code: 'P_OUT_OF_RANGE'
  };
  if (T_C > Tax[Tax.length - 1]) return {
    valid: false,
    code: 'T_OUT_OF_RANGE'
  };
  if (PH_CRIT[refr] != null && P_bar >= PH_CRIT_FRAC * PH_CRIT[refr]) return {
    valid: false,
    code: 'NEAR_CRITICAL'
  };
  let i = 0;
  while (i < Pax.length - 1 && Pax[i + 1] < P_bar) i++;
  const fp = Pax[i + 1] === Pax[i] ? 0 : (P_bar - Pax[i]) / (Pax[i + 1] - Pax[i]);
  function nodeAt(G, k) {
    const a = G[i][k],
      b = G[i + 1][k];
    if (a == null || b == null) return null;
    return a + fp * (b - a);
  }
  const sv = getDewVapourAnchor(refr, P_bar);
  if (!sv || sv.Tsat == null) return {
    valid: false,
    code: 'NO_DEW_ANCHOR'
  };
  const Tdew = sv.Tsat,
    hg = sv.hg,
    sg = sv.sg;
  if (T_C <= Tdew - 1e-9) return {
    valid: false,
    code: 'BELOW_DOME'
  };
  if (T_C <= Tdew + 1e-9) return {
    valid: true,
    code: 'DEW',
    h: hg,
    s: sg,
    mode: 'dew'
  };
  let j = -1,
    hn = null,
    sn = null;
  for (let k = 0; k < Tax.length; k++) {
    if (Tax[k] > Tdew + 1e-9) {
      const h = nodeAt(Gh, k),
        s = nodeAt(Gs, k);
      if (h != null && s != null) {
        j = k;
        hn = h;
        sn = s;
        break;
      }
    }
  }
  if (j < 0) return {
    valid: false,
    code: 'NO_SUPERHEATED_NODE'
  };
  const Tn = Tax[j];
  if (T_C <= Tn) {
    const f = Tn === Tdew ? 0 : (T_C - Tdew) / (Tn - Tdew);
    return {
      valid: true,
      code: 'BOUNDARY',
      h: hg + f * (hn - hg),
      s: sg + f * (sn - sg),
      mode: 'boundary'
    };
  }
  let k = j;
  while (k < Tax.length - 1 && Tax[k + 1] < T_C) k++;
  const TL = Tax[k],
    TU = Tax[k + 1];
  const hL = nodeAt(Gh, k),
    hU = nodeAt(Gh, k + 1),
    sL = nodeAt(Gs, k),
    sU = nodeAt(Gs, k + 1);
  if (hL == null || hU == null || sL == null || sU == null) return {
    valid: false,
    code: 'MISSING_NODE'
  };
  const ft = TU === TL ? 0 : (T_C - TL) / (TU - TL);
  return {
    valid: true,
    code: 'GRID',
    h: hL + ft * (hU - hL),
    s: sL + ft * (sU - sL),
    mode: 'grid'
  };
}
function phShProp(refr, P_bar, T_C, prop) {
  const st = getVapourState(refr, P_bar, T_C);
  return st.valid ? st[prop] : null;
}
let PH_LIQ = typeof window !== 'undefined' && window.__PH_LIQ__ ? window.__PH_LIQ__ : null;
if (PH_LIQ && PH_LIQ.meta) {
  const _refOK = /^IIR/.test(PH_LIQ.meta.reference || "");
  const _verOK = /^7\.2\./.test(PH_LIQ.meta.coolprop_version || "");
  if (!(_refOK && _verOK)) {
    try {
      console.warn("Noditech: liquid grid reference/version incompatible - subcooled-liquid lookup disabled");
    } catch (e) {}
    PH_LIQ = null;
  }
}
function phLiqReady(refr) {
  return !!(PH_LIQ && PH_LIQ.LIQ && PH_LIQ.LIQ[refr] && PH_LIQ.meta);
}
function phLiqProp(refr, P_bar, T_C) {
  if (!phLiqReady(refr)) return null;
  const d = PH_LIQ.LIQ[refr],
    Pax = PH_LIQ.meta.P_bar,
    Tax = PH_LIQ.meta.T_C,
    G = d.h;
  if (P_bar < Pax[0] || P_bar > Pax[Pax.length - 1] || T_C < Tax[0] || T_C > Tax[Tax.length - 1]) return null;
  if (PH_CRIT[refr] != null && P_bar >= PH_CRIT_FRAC * PH_CRIT[refr]) return null;
  let i = 0;
  while (i < Pax.length - 1 && Pax[i + 1] < P_bar) i++;
  const fp = Pax[i + 1] === Pax[i] ? 0 : (P_bar - Pax[i]) / (Pax[i + 1] - Pax[i]);
  const barr = a => {
    const x = a[i],
      y = a[i + 1];
    if (x == null || y == null) return null;
    return x + fp * (y - x);
  };
  const nodeAt = k => {
    const a = G[i][k],
      b = G[i + 1][k];
    if (a == null || b == null) return null;
    return a + fp * (b - a);
  };
  const Tbub = barr(d.T_bubble_C),
    hbub = barr(d.h_bubble);
  if (Tbub == null || hbub == null) return null;
  if (T_C > Tbub + 0.05) return null;
  if (T_C >= Tbub - 0.05) return hbub;
  let jl = -1;
  for (let k = Tax.length - 1; k >= 0; k--) {
    if (Tax[k] <= T_C + 1e-9 && nodeAt(k) != null) {
      jl = k;
      break;
    }
  }
  if (jl < 0) return null;
  const TL = Tax[jl],
    vL = nodeAt(jl);
  let TU = Tbub,
    vU = hbub;
  for (let k = jl + 1; k < Tax.length; k++) {
    if (Tax[k] >= Tbub - 1e-9) break;
    const v = nodeAt(k);
    if (v != null) {
      TU = Tax[k];
      vU = v;
      break;
    }
  }
  if (vL == null || vU == null) return null;
  const ft2 = TU === TL ? 0 : (T_C - TL) / (TU - TL);
  return vL + ft2 * (vU - vL);
}
function phShTfromPS(refr, P_bar, s_target) {
  if (!phShReady(refr)) return null;
  const Tax = PH_SH.meta.T_C;
  const sv = getDewVapourAnchor(refr, P_bar);
  if (!sv || sv.sg == null || sv.Tsat == null) return null;
  if (s_target <= sv.sg + 1e-9) return null;
  let loT = sv.Tsat,
    loS = sv.sg;
  for (let k = 0; k < Tax.length; k++) {
    if (Tax[k] <= loT) continue;
    const s = phShProp(refr, P_bar, Tax[k], 's');
    if (s == null) continue;
    if ((loS - s_target) * (s - s_target) <= 0) {
      let a = loT,
        b = Tax[k],
        sa = loS;
      for (let it = 0; it < 60; it++) {
        const m = (a + b) / 2,
          sm = phShProp(refr, P_bar, m, 's');
        if (sm == null) {
          a = m;
          continue;
        }
        if ((sa - s_target) * (sm - s_target) <= 0) b = m;else {
          a = m;
          sa = sm;
        }
      }
      return (a + b) / 2;
    }
    loT = Tax[k];
    loS = s;
  }
  return null;
}
let PH_SATDB = typeof window !== 'undefined' && window.__PH_SATDB__ ? window.__PH_SATDB__ : null;
const PH_DSET_EXPECT = {
  schema_version: 1,
  thermo_dataset_release: "2026.06.25-1",
  coolprop_version: "7.2.0",
  coolprop_gitrevision: "98b3523d5daa98454618d381d2ae53f7471d216b",
  backend: "HEOS",
  reference: "IIR",
  dataset_sha256: "ff28dd48d4f401086aa746b4679ae08e73ce87b9e77e1a0193a61039f9883626"
};
function _satdbCompatible(db) {
  if (!db || !db.fluids) return false;
  for (const k of Object.keys(PH_DSET_EXPECT)) {
    if (db[k] !== PH_DSET_EXPECT[k]) return false;
  }
  return true;
}
if (PH_SATDB && !_satdbCompatible(PH_SATDB)) {
  try {
    console.warn("Noditech: dew/bubble dataset incompatible — zeotropic blend cycles disabled");
  } catch (e) {}
  PH_SATDB = null;
}
const PH_HIGH_GLIDE = {
  R407C: true
};
function _satdb(refr) {
  return PH_HIGH_GLIDE[refr] && PH_SATDB && PH_SATDB.fluids && PH_SATDB.fluids[refr] ? PH_SATDB.fluids[refr] : null;
}
function _interp1(xs, ys, x) {
  if (!xs || !ys || x < xs[0] || x > xs[xs.length - 1]) return null;
  let i = 0;
  while (i < xs.length - 1 && xs[i + 1] < x) i++;
  const a = ys[i],
    b = ys[i + 1];
  if (a == null || b == null) return null;
  const f = xs[i + 1] === xs[i] ? 0 : (x - xs[i]) / (xs[i + 1] - xs[i]);
  return a + f * (b - a);
}
function _interp1P(xs_kpa, ys, P_bar) {
  if (!xs_kpa) return null;
  const Pk = P_bar * 100;
  let lo = null,
    hi = null,
    vlo = null,
    vhi = null;
  for (let r = 0; r < xs_kpa.length; r++) {
    const px = xs_kpa[r];
    if (px == null || ys[r] == null) continue;
    if (px <= Pk) {
      lo = px;
      vlo = ys[r];
    }
    if (px >= Pk && hi == null) {
      hi = px;
      vhi = ys[r];
    }
  }
  if (lo == null || hi == null) return null;
  if (lo === hi) return vlo;
  return vlo + (Pk - lo) / (hi - lo) * (vhi - vlo);
}
function getDewPressure(refr, T_C) {
  const d = _satdb(refr);
  if (d) return _interp1(d.T_C, d.P_dew_kPa, T_C);
  if (PH_HIGH_GLIDE[refr]) return null;
  return phInterp(refr, T_C, 1);
}
function getBubblePressure(refr, T_C) {
  const d = _satdb(refr);
  if (d) return _interp1(d.T_C, d.P_bub_kPa, T_C);
  if (PH_HIGH_GLIDE[refr]) return null;
  return phInterp(refr, T_C, 1);
}
function getDewTemperature(refr, P_bar) {
  const d = _satdb(refr);
  if (d) return _interp1P(d.P_dew_kPa, d.T_C, P_bar);
  const sv = phSatVaporAtP(refr, P_bar);
  return sv ? sv.Tsat : null;
}
function getBubbleTemperature(refr, P_bar) {
  const d = _satdb(refr);
  if (d) return _interp1P(d.P_bub_kPa, d.T_C, P_bar);
  const sv = phSatVaporAtP(refr, P_bar);
  return sv ? sv.Tsat : null;
}
function getDewVapourAnchor(refr, P_bar) {
  const d = _satdb(refr);
  if (d) {
    const T = _interp1P(d.P_dew_kPa, d.T_C, P_bar),
      hg = _interp1P(d.P_dew_kPa, d.hg_dew, P_bar),
      sg = _interp1P(d.P_dew_kPa, d.sg_dew, P_bar);
    if (T == null || hg == null || sg == null) return null;
    return {
      Tsat: T,
      hg: hg,
      sg: sg
    };
  }
  return phSatVaporAtP(refr, P_bar);
}
function getBubbleLiquidAnchor(refr, P_bar) {
  const d = _satdb(refr);
  if (d) {
    const T = _interp1P(d.P_bub_kPa, d.T_C, P_bar),
      hf = _interp1P(d.P_bub_kPa, d.hf_bub, P_bar);
    if (T == null || hf == null) return null;
    return {
      Tsat: T,
      hf: hf
    };
  }
  return null;
}
const DATASET_MANIFEST = {
  manifest_version: 1,
  thermo_dataset_release: "2026.06.25-1",
  coolprop_version: "7.2.0",
  coolprop_gitrevision: "98b3523d5daa98454618d381d2ae53f7471d216b",
  backend: "HEOS",
  reference: "IIR",
  datasets: {
    superheated: {
      sha16: "5f040b097c6bb0c8"
    },
    liquid: {
      sha16: "7c915bb0a8302df5"
    },
    dewbubble: {
      sha256: "ff28dd48d4f401086aa746b4679ae08e73ce87b9e77e1a0193a61039f9883626"
    },
    glycol: {
      sha256: "5dab423cb10f272e956b9b1b342d9d5c379eacde0f18ab9c0c6b68eb608eb27f"
    }
  }
};
function _v720(s) {
  return /^7\.2\.0/.test(String(s || ''));
}
function datasetsCompatible() {
  const M = DATASET_MANIFEST;
  if (typeof PH_DATASET_SHA === 'undefined' || PH_DATASET_SHA !== M.datasets.superheated.sha16) return false;
  if (typeof PH_LIQ_DATASET_SHA === 'undefined' || PH_LIQ_DATASET_SHA !== M.datasets.liquid.sha16) return false;
  if (typeof PH_SH !== 'undefined' && PH_SH && PH_SH.meta && !_v720(PH_SH.meta.coolprop_version)) return false;
  if (typeof PH_LIQ !== 'undefined' && PH_LIQ && PH_LIQ.meta && !_v720(PH_LIQ.meta.coolprop_version)) return false;
  const db = typeof window !== 'undefined' && window.__PH_SATDB__ ? window.__PH_SATDB__ : null;
  if (!db || db.dataset_sha256 !== M.datasets.dewbubble.sha256 || !_v720(db.coolprop_version)) return false;
  return true;
}
function cycleResult(refr, Te, Tc, SH, SC, eta) {
  try {
    if (!datasetsCompatible()) return {
      status: 'invalid',
      code: 'INVALID_DATASET'
    };
    const c = phCycleAccurate(refr, Te, Tc, SH, SC, eta);
    if (c) return {
      status: 'valid',
      result: c
    };
    return {
      status: 'invalid',
      code: 'FAIL_CLOSED'
    };
  } catch (e) {
    return {
      status: 'exception',
      error: {
        name: e && e.name,
        message: e && e.message,
        stack: String(e && e.stack || '')
      }
    };
  }
}
function phCycleAccurate(refr, T_evap, T_cond, SH, SC, eta) {
  if (!PH_SAT[refr] || !phShReady(refr) || !phLiqReady(refr)) return null;
  if (!datasetsCompatible()) return null;
  const PH_SH_MIN_DRY = 2;
  if (!(typeof eta === 'number' && isFinite(eta) && eta > 0 && eta <= 1)) return null;
  if (!(typeof SH === 'number' && isFinite(SH) && SH >= PH_SH_MIN_DRY)) return null;
  if (!(typeof SC === 'number' && isFinite(SC) && SC >= 0)) return null;
  const P_evap = getDewPressure(refr, T_evap),
    P_cond = getBubblePressure(refr, T_cond);
  if (P_evap == null || P_cond == null) return null;
  const Pe_bar = P_evap / 100,
    Pc_bar = P_cond / 100;
  const T1 = T_evap + SH;
  const h1 = phShProp(refr, Pe_bar, T1, 'h'),
    s1 = phShProp(refr, Pe_bar, T1, 's');
  if (h1 == null || s1 == null) return null;
  const T2s = phShTfromPS(refr, Pc_bar, s1);
  if (T2s == null) return null;
  const h2s = phShProp(refr, Pc_bar, T2s, 'h');
  if (h2s == null) return null;
  const h2 = h1 + (h2s - h1) / eta;
  let T2 = null;
  {
    const Tax = PH_SH.meta.T_C;
    let a = null,
      b = null,
      ha = null,
      hb = null;
    for (let k = 0; k < Tax.length; k++) {
      const hh = phShProp(refr, Pc_bar, Tax[k], 'h');
      if (hh == null) continue;
      if (a == null) {
        a = Tax[k];
        ha = hh;
      }
      if (ha != null && (ha - h2) * (hh - h2) <= 0 && Tax[k] !== a) {
        let lo = a,
          hi = Tax[k];
        for (let it = 0; it < 40; it++) {
          const m = (lo + hi) / 2,
            hm = phShProp(refr, Pc_bar, m, 'h');
          if (hm == null) break;
          if ((ha - h2) * (hm - h2) <= 0) hi = m;else {
            lo = m;
            ha = hm;
          }
        }
        T2 = (lo + hi) / 2;
        break;
      }
      a = Tax[k];
      ha = hh;
    }
  }
  if (T2 == null || !isFinite(T2)) return null;
  const T3 = T_cond - SC;
  const h3 = phLiqProp(refr, P_cond / 100, T3);
  if (h3 == null) return null;
  const h4 = h3;
  if (!(isFinite(h1) && isFinite(s1) && isFinite(h2s) && isFinite(h2) && isFinite(h3))) return null;
  if (!(h2 > h1)) return null;
  if (!(h1 > h3)) return null;
  const q = h1 - h4,
    w = h2 - h1;
  if (!(w > 0) || !(q > 0)) return null;
  const COP = q / w;
  if (!(isFinite(COP) && COP > 0)) return null;
  return {
    accurate: true,
    P_evap,
    P_cond,
    h1,
    s1,
    h2,
    h2s,
    T2,
    h3,
    h4,
    q,
    w,
    COP
  };
}
function PhChart({
  refr,
  T_evap,
  T_cond,
  SH = 5,
  SC = 5,
  eta,
  accurate,
  title
}) {
  if (!PH_SAT[refr]) {
    return React.createElement("div", {
      style: {
        padding: '16px',
        background: 'rgba(251,191,36,.08)',
        border: '1px solid rgba(251,191,36,.25)',
        borderRadius: 8,
        fontSize: 11,
        color: '#fbbf24',
        lineHeight: 1.5
      }
    }, "\u26A0 A log p\u2013h cycle diagram for ", refr, " isn't available yet. Verified enthalpy data (CoolProp 7.2.0 HEOS, IIR reference) is currently loaded for ", PH_AVAILABLE.join(', '), ". The remaining refrigerants will be added with the same verification.");
  }
  const d = PH_SAT[refr];
  const cyc = accurate && eta != null ? phCycleAccurate(refr, T_evap, T_cond, SH, SC, eta) || phCycle(refr, T_evap, T_cond, SH, SC) : phCycle(refr, T_evap, T_cond, SH, SC);
  const allH = [];
  d.forEach(r => {
    allH.push(r[2], r[3]);
  });
  if (cyc) {
    allH.push(cyc.h1, cyc.h2, cyc.h3, cyc.h4);
  }
  let hMin = Math.min(...allH),
    hMax = Math.max(...allH);
  const hPad = (hMax - hMin) * 0.08;
  hMin -= hPad;
  hMax += hPad;
  let pMin = d[0][1],
    pMax = d[d.length - 1][1];
  if (cyc) {
    pMin = Math.min(pMin, cyc.P_evap);
    pMax = Math.max(pMax, cyc.P_cond);
  }
  pMin *= 0.6;
  pMax *= 1.5;
  const X0 = 58,
    X1 = 556,
    Y0 = 28,
    Y1 = 298;
  const px = h => X0 + (h - hMin) / (hMax - hMin) * (X1 - X0);
  const logP = p => Math.log10(p);
  const py = p => Y1 - (logP(p) - logP(pMin)) / (logP(pMax) - logP(pMin)) * (Y1 - Y0);
  let bub = "",
    dew = "";
  d.forEach(r => {
    bub += (bub ? " L" : "M") + px(r[2]).toFixed(1) + " " + py(r[1]).toFixed(1);
  });
  d.slice().reverse().forEach(r => {
    dew += (dew ? " L" : "M") + px(r[3]).toFixed(1) + " " + py(r[1]).toFixed(1);
  });
  const domePath = bub + " L" + dew.slice(1);
  const pTicks = [];
  for (let e = Math.floor(logP(pMin)); e <= Math.ceil(logP(pMax)); e++) {
    [1, 2, 5].forEach(m => {
      const v = m * Math.pow(10, e);
      if (v >= pMin && v <= pMax) pTicks.push(v);
    });
  }
  const hStep = hMax - hMin > 400 ? 100 : 50;
  const hTicks = [];
  for (let v = Math.ceil(hMin / hStep) * hStep; v <= hMax; v += hStep) hTicks.push(v);
  let cyclePath = "";
  if (cyc) {
    const p1 = [px(cyc.h1), py(cyc.P_evap)],
      p2 = [px(cyc.h2), py(cyc.P_cond)],
      p3 = [px(cyc.h3), py(cyc.P_cond)],
      p4 = [px(cyc.h4), py(cyc.P_evap)];
    cyclePath = `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)} L${p3[0].toFixed(1)} ${p3[1].toFixed(1)} L${p4[0].toFixed(1)} ${p4[1].toFixed(1)} Z`;
  }
  return React.createElement("svg", {
    viewBox: "0 0 590 340",
    xmlns: "http://www.w3.org/2000/svg",
    style: {
      width: '100%',
      height: 'auto',
      display: 'block'
    }
  }, React.createElement("text", {
    x: "295",
    y: "14",
    fill: "var(--ch-title)",
    fontFamily: "monospace",
    fontSize: "11",
    fontWeight: "bold",
    textAnchor: "middle"
  }, title || `log p–h cycle — ${refr}`), React.createElement("rect", {
    x: X0,
    y: Y0,
    width: X1 - X0,
    height: Y1 - Y0,
    fill: "none",
    stroke: "var(--ch-frame)",
    strokeWidth: "1"
  }), pTicks.map((p, i) => React.createElement("g", {
    key: 'p' + i
  }, React.createElement("line", {
    x1: X0,
    y1: py(p),
    x2: X1,
    y2: py(p),
    stroke: "var(--ch-grid)",
    strokeWidth: "0.6"
  }), React.createElement("text", {
    x: X0 - 4,
    y: py(p) + 3,
    fill: "var(--ch-tick)",
    fontFamily: "monospace",
    fontSize: "7.5",
    textAnchor: "end"
  }, (p / 100).toFixed(p / 100 >= 10 ? 0 : 1)))), React.createElement("text", {
    x: X0 - 40,
    y: (Y0 + Y1) / 2,
    fill: "var(--ch-axis)",
    fontFamily: "monospace",
    fontSize: "9",
    textAnchor: "middle",
    transform: `rotate(90 ${X0 - 40} ${(Y0 + Y1) / 2})`
  }, "Pressure (bar, log)"), hTicks.map((h, i) => React.createElement("g", {
    key: 'h' + i
  }, React.createElement("line", {
    x1: px(h),
    y1: Y0,
    x2: px(h),
    y2: Y1,
    stroke: "var(--ch-grid)",
    strokeWidth: "0.6"
  }), React.createElement("text", {
    x: px(h),
    y: Y1 + 12,
    fill: "var(--ch-tick)",
    fontFamily: "monospace",
    fontSize: "7.5",
    textAnchor: "middle"
  }, Math.round(h)))), React.createElement("text", {
    x: (X0 + X1) / 2,
    y: Y1 + 24,
    fill: "var(--ch-axis)",
    fontFamily: "monospace",
    fontSize: "9",
    textAnchor: "middle"
  }, "Specific enthalpy h (kJ/kg)"), React.createElement("path", {
    d: domePath,
    fill: "var(--ch-satfill)",
    stroke: "var(--ch-sat)",
    strokeWidth: "1.5"
  }), React.createElement("text", {
    x: px(d[Math.floor(d.length / 2)][2]) - 4,
    y: py(d[Math.floor(d.length / 2)][1]),
    fill: "var(--ch-sat)",
    fontFamily: "monospace",
    fontSize: "7",
    textAnchor: "end"
  }, "liquid"), React.createElement("text", {
    x: px(d[Math.floor(d.length / 2)][3]) + 4,
    y: py(d[Math.floor(d.length / 2)][1]),
    fill: "var(--ch-sat)",
    fontFamily: "monospace",
    fontSize: "7"
  }, "vapour"), (() => {
    const top = d[d.length - 1];
    return React.createElement("circle", {
      cx: px((top[2] + top[3]) / 2),
      cy: py(top[1]),
      r: "2.5",
      fill: "var(--ch-sat)"
    });
  })(), cyc && React.createElement("path", {
    d: cyclePath,
    fill: "var(--ch-cyclefill)",
    stroke: "var(--ch-cycle)",
    strokeWidth: "1.8"
  }), cyc && (() => {
    const pts = [{
      x: px(cyc.h1),
      y: py(cyc.P_evap),
      l: '1',
      t: 'comp in'
    }, {
      x: px(cyc.h2),
      y: py(cyc.P_cond),
      l: '2',
      t: 'discharge'
    }, {
      x: px(cyc.h3),
      y: py(cyc.P_cond),
      l: '3',
      t: 'cond out'
    }, {
      x: px(cyc.h4),
      y: py(cyc.P_evap),
      l: '4',
      t: 'evap in'
    }];
    return pts.map((p, i) => React.createElement("g", {
      key: 's' + i
    }, React.createElement("circle", {
      cx: p.x,
      cy: p.y,
      r: "3.5",
      fill: "var(--ch-pt)",
      stroke: "var(--ch-pthalo)",
      strokeWidth: "1.2"
    }), React.createElement("text", {
      x: p.x,
      y: p.y - 6,
      fill: "var(--ch-ptlabel)",
      fontFamily: "monospace",
      fontSize: "8",
      fontWeight: "bold",
      textAnchor: "middle"
    }, p.l)));
  })(), cyc && React.createElement("text", {
    x: (px(cyc.h1) + px(cyc.h2)) / 2 + 4,
    y: (py(cyc.P_evap) + py(cyc.P_cond)) / 2,
    fill: "var(--ch-ptlabel)",
    fontFamily: "monospace",
    fontSize: "6.5"
  }, "compression"), React.createElement("text", {
    x: X0,
    y: Y0 - 3,
    fill: "var(--ch-note)",
    fontFamily: "monospace",
    fontSize: "6.5"
  }, accurate && eta != null ? `CoolProp HEOS · IIR ref · η=${eta} · endpoints calc, line schematic` : 'CoolProp HEOS · IIR ref · P in bar(a) · schematic loop'));
}
function MollierChart({
  points,
  pAtm = 101500,
  title = "Psychrometric chart (T vs humidity ratio)"
}) {
  const Tmin = 0,
    Tmax = 45,
    Wmax = 0.025;
  const X0 = 64,
    X1 = 540,
    Y0 = 26,
    Y1 = 300;
  const px = T => X0 + (T - Tmin) / (Tmax - Tmin) * (X1 - X0);
  const py = W => Y1 - Math.min(W, Wmax) / Wmax * (Y1 - Y0);
  const pS = T => 611.21 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T)));
  const wOf = (T, RH) => {
    const pv = RH / 100 * pS(T);
    return 0.622 * pv / (pAtm - pv);
  };
  const hOf = (T, RH) => {
    const W = wOf(T, RH);
    return 1.006 * T + W * (2501 + 1.86 * T);
  };
  let satPath = "";
  for (let T = Tmin; T <= Tmax; T += 1) {
    const W = wOf(T, 100);
    if (W > Wmax) break;
    satPath += (satPath ? " L" : "M") + px(T).toFixed(1) + " " + py(W).toFixed(1);
  }
  const rhCurves = [20, 40, 60, 80].map(rh => {
    let d = "";
    for (let T = Tmin; T <= Tmax; T += 1) {
      const W = wOf(T, rh);
      if (W > Wmax) break;
      d += (d ? " L" : "M") + px(T).toFixed(1) + " " + py(W).toFixed(1);
    }
    return {
      rh,
      d
    };
  });
  const hLines = [10, 20, 30, 40, 50, 60, 70, 80].map(h => {
    const Tdry = h / 1.006;
    let x1, y1;
    if (Tdry <= Tmax) {
      x1 = px(Tdry);
      y1 = py(0);
    } else {
      const W = (h - 1.006 * Tmax) / (2501 + 1.86 * Tmax);
      x1 = px(Tmax);
      y1 = py(W);
    }
    let Twet = null;
    for (let T = Tmin; T <= Tmax; T += 0.5) {
      if (hOf(T, 100) >= h) {
        Twet = T;
        break;
      }
    }
    let x2, y2;
    if (Twet != null) {
      x2 = px(Twet);
      y2 = py(wOf(Twet, 100));
    } else {
      const W = Math.min(Wmax, (h - 1.006 * Tmin) / (2501 + 1.86 * Tmin));
      x2 = px(Tmin);
      y2 = py(W);
    }
    return {
      h,
      x1,
      y1,
      x2,
      y2
    };
  });
  const plotted = points.filter(p => p && isFinite(p.T) && isFinite(p.RH)).map(p => ({
    ...p,
    x: px(p.T),
    y: py(wOf(p.T, p.RH)),
    W: wOf(p.T, p.RH),
    h: hOf(p.T, p.RH)
  }));
  const procPath = plotted.length >= 2 ? "M" + plotted.map(p => p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" L") : "";
  const xticks = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];
  const yticks = [0, 5, 10, 15, 20, 25];
  return React.createElement("svg", {
    viewBox: "0 0 580 340",
    xmlns: "http://www.w3.org/2000/svg",
    style: {
      width: '100%',
      height: 'auto',
      display: 'block'
    }
  }, React.createElement("text", {
    x: "290",
    y: "14",
    fill: "var(--ch-title)",
    fontFamily: "monospace",
    fontSize: "11",
    fontWeight: "bold",
    textAnchor: "middle"
  }, title), React.createElement("rect", {
    x: X0,
    y: Y0,
    width: X1 - X0,
    height: Y1 - Y0,
    fill: "none",
    stroke: "var(--ch-frame)",
    strokeWidth: "1"
  }), xticks.map(t => React.createElement("g", {
    key: 'x' + t
  }, React.createElement("line", {
    x1: px(t),
    y1: Y0,
    x2: px(t),
    y2: Y1,
    stroke: "var(--ch-grid)",
    strokeWidth: "0.6"
  }), React.createElement("text", {
    x: px(t),
    y: Y1 + 12,
    fill: "var(--ch-tick)",
    fontFamily: "monospace",
    fontSize: "8",
    textAnchor: "middle"
  }, t))), React.createElement("text", {
    x: (X0 + X1) / 2,
    y: Y1 + 24,
    fill: "var(--ch-axis)",
    fontFamily: "monospace",
    fontSize: "9",
    textAnchor: "middle"
  }, "Dry-bulb temperature (\xB0C)"), yticks.map(g => React.createElement("g", {
    key: 'y' + g
  }, React.createElement("line", {
    x1: X0,
    y1: py(g / 1000),
    x2: X1,
    y2: py(g / 1000),
    stroke: "var(--ch-grid)",
    strokeWidth: "0.6"
  }), React.createElement("text", {
    x: X1 + 4,
    y: py(g / 1000) + 3,
    fill: "var(--ch-tick)",
    fontFamily: "monospace",
    fontSize: "8",
    textAnchor: "start"
  }, g))), React.createElement("text", {
    x: X1 + 34,
    y: (Y0 + Y1) / 2,
    fill: "var(--ch-axis)",
    fontFamily: "monospace",
    fontSize: "9",
    textAnchor: "middle",
    transform: `rotate(90 ${X1 + 34} ${(Y0 + Y1) / 2})`
  }, "Humidity ratio (g/kg)"), hLines.map(l => React.createElement("line", {
    key: 'h' + l.h,
    x1: l.x1,
    y1: l.y1,
    x2: l.x2,
    y2: l.y2,
    stroke: "var(--ch-enth)",
    strokeWidth: "0.6",
    strokeDasharray: "3 2"
  })), hLines.map(l => l.h % 20 === 0 ? React.createElement("text", {
    key: 'hl' + l.h,
    x: l.x2 + 2,
    y: l.y2 - 2,
    fill: "var(--ch-enth)",
    fontFamily: "monospace",
    fontSize: "6.5"
  }, l.h) : null), rhCurves.map(c => React.createElement("path", {
    key: 'rh' + c.rh,
    d: c.d,
    fill: "none",
    stroke: "var(--ch-rh)",
    strokeWidth: "0.8"
  })), rhCurves.map(c => {
    const T = Tmax - 3;
    const W = wOf(T, c.rh);
    if (W > Wmax) return null;
    return React.createElement("text", {
      key: 'rl' + c.rh,
      x: px(T),
      y: py(W) - 2,
      fill: "var(--ch-rh)",
      fontFamily: "monospace",
      fontSize: "7",
      textAnchor: "end"
    }, c.rh, "%");
  }), React.createElement("path", {
    d: satPath,
    fill: "none",
    stroke: "var(--ch-sat)",
    strokeWidth: "1.6"
  }), procPath && React.createElement("path", {
    d: procPath,
    fill: "none",
    stroke: "var(--ch-cycle)",
    strokeWidth: "1.8"
  }), plotted.length >= 2 && (() => {
    const a = plotted[0],
      b = plotted[plotted.length - 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const s = 7;
    return React.createElement("polygon", {
      points: `${b.x},${b.y} ${(b.x - s * Math.cos(ang - 0.4)).toFixed(1)},${(b.y - s * Math.sin(ang - 0.4)).toFixed(1)} ${(b.x - s * Math.cos(ang + 0.4)).toFixed(1)},${(b.y - s * Math.sin(ang + 0.4)).toFixed(1)}`,
      fill: "var(--ch-cycle)"
    });
  })(), plotted.map((p, i) => {
    const left = i > 0;
    const tx = left ? p.x - 7 : p.x + 7;
    const anc = left ? 'end' : 'start';
    return React.createElement("g", {
      key: 'pt' + i
    }, React.createElement("circle", {
      cx: p.x,
      cy: p.y,
      r: "4",
      fill: p.color || 'var(--ch-cycle)',
      stroke: "var(--ch-pthalo)",
      strokeWidth: "1.2"
    }), React.createElement("text", {
      x: tx,
      y: p.y + (left ? 14 : -5),
      fill: "var(--ch-title)",
      fontFamily: "monospace",
      fontSize: "8",
      fontWeight: "bold",
      textAnchor: anc
    }, p.label), React.createElement("text", {
      x: tx,
      y: p.y + (left ? 24 : 5),
      fill: "var(--ch-tick)",
      fontFamily: "monospace",
      fontSize: "7",
      textAnchor: anc
    }, fmt(p.T, 1), "\xB0C \xB7 ", fmt(p.W * 1000, 1), "g/kg \xB7 ", fmt(p.h, 1), "kJ/kg"));
  }), React.createElement("text", {
    x: X0,
    y: Y0 - 3,
    fill: "var(--ch-note)",
    fontFamily: "monospace",
    fontSize: "7"
  }, "p = ", fmt(pAtm / 1000, 1), " kPa \xB7 saturation (blue), RH (light blue), enthalpy (purple) all computed live"));
}
function DuctTraverse({
  onApply
}) {
  const [open, setOpen] = React.useState(false);
  const [shape, setShape] = React.useState('rect');
  const [w, setW] = React.useState(400);
  const [h, setH] = React.useState(300);
  const [dia, setDia] = React.useState(315);
  const [rings, setRings] = React.useState(3);
  const [nDiam, setNDiam] = React.useState(3);
  const [vels, setVels] = React.useState({});
  const [inputMode, setInputMode] = React.useState('vel');
  const [rhoAir, setRhoAir] = React.useState(1.20);
  const [upDiam, setUpDiam] = React.useState(7.5);
  const [downDiam, setDownDiam] = React.useState(3);
  const [override, setOverride] = React.useState(false);
  let cols = [],
    rows = [],
    area = 0,
    nPts = 0,
    posList = [],
    posDepth = {},
    Dh = 0;
  if (shape === 'rect') {
    const nc = ptsPerSide(w),
      nr = ptsPerSide(h);
    cols = LOGT_RECT[nc];
    rows = LOGT_RECT[nr];
    area = w / 1000 * (h / 1000);
    Dh = 2 * w * h / (w + h);
    nPts = nc * nr;
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
      const k = `r${r}c${c}`;
      posList.push(k);
      posDepth[k] = {
        x: cols[c] * w,
        y: rows[r] * h
      };
    }
  } else {
    const fr = ringFracs(rings);
    area = Math.PI * Math.pow(dia / 2000, 2);
    Dh = dia;
    nPts = 2 * nDiam * rings;
    for (let d = 0; d < nDiam; d++) for (let s = 0; s < 2; s++) for (let i = 0; i < rings; i++) {
      const k = `d${d}s${s}r${i}`;
      posList.push(k);
      const depthFrac = s === 0 ? 1 - fr[i] : 1 + fr[i];
      posDepth[k] = {
        depth: dia / 2 * depthFrac,
        ang: d * (180 / nDiam)
      };
    }
  }
  const toVel = raw => {
    const x = parseFloat(raw);
    if (isNaN(x)) return NaN;
    if (inputMode === 'vp') return Math.sign(x) * Math.sqrt(2 * Math.abs(x) / rhoAir);
    return x;
  };
  const entered = posList.map(k => vels[k]).filter(v => v != null && v !== '' && !isNaN(parseFloat(v))).map(toVel);
  const allEntered = entered.length === nPts && nPts > 0;
  const vMean = entered.length > 0 ? entered.reduce((a, b) => a + b, 0) / entered.length : 0;
  const flow = vMean * area * 3600;
  const vMax = entered.length > 0 ? Math.max(...entered) : 0;
  const vpThreshold = Math.sqrt(0.10) * vMax;
  const hasReverse = entered.some(v => v < 0);
  const goodCount = entered.filter(v => v >= vpThreshold).length;
  const qualityOK = entered.length > 0 && !hasReverse && goodCount / entered.length >= 0.75;
  const planeOK = upDiam >= 7.5 && downDiam >= 3;
  const sd = entered.length > 1 ? Math.sqrt(entered.reduce((a, b) => a + (b - vMean) ** 2, 0) / (entered.length - 1)) : 0;
  const cov = vMean > 0 ? sd / vMean * 100 : 0;
  const covMean = entered.length > 1 ? cov / Math.sqrt(entered.length) : null;
  const setV = (k, val) => setVels(p => ({
    ...p,
    [k]: val
  }));
  return React.createElement("div", {
    className: "card no-print",
    style: {
      borderColor: 'rgba(125,211,252,.25)'
    }
  }, React.createElement("button", {
    className: "guide-btn",
    onClick: () => setOpen(!open),
    style: {
      width: '100%',
      textAlign: 'left'
    }
  }, open ? '▾' : '▸', " Multi-point duct traverse (ASHRAE 111 / ISO 3966)"), open && React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "Airflow is usually the largest A/A uncertainty. A single-point reading can be off by 20% or more. Enter velocity at the standard traverse points below; the mean is computed per the log-Tchebycheff rule (rectangular) or equal-area rings (round), then applied as the airflow. No straight duct to traverse? Use a capture hood/funnel instead (see the Air/Air measurement guide, method 5b) and enter its throat as a 1-ring round duct here."), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.22)',
      borderRadius: 8,
      padding: '10px',
      margin: '4px 0 12px',
      border: '1px solid rgba(125,211,252,.12)'
    }
  }, React.createElement("svg", {
    viewBox: "0 0 600 320",
    xmlns: "http://www.w3.org/2000/svg",
    style: {
      width: '100%',
      height: 'auto',
      display: 'block'
    }
  }, React.createElement("text", {
    x: "210",
    y: "18",
    fill: "#7dd3fc",
    "font-family": "monospace",
    "font-size": "11",
    "font-weight": "bold",
    "text-anchor": "middle"
  }, "Rectangular \u2014 log-Tchebycheff (5\xD75)"), React.createElement("text", {
    x: "480",
    y: "18",
    fill: "#5eead4",
    "font-family": "monospace",
    "font-size": "11",
    "font-weight": "bold",
    "text-anchor": "middle"
  }, "Round \u2014 equal-area rings (3)"), React.createElement("rect", {
    x: "60",
    y: "40",
    width: "300",
    height: "200",
    fill: "rgba(125,211,252,.04)",
    stroke: "#7dd3fc",
    "stroke-width": "2"
  }), React.createElement("circle", {
    cx: "82.2",
    cy: "54.8",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "146.4",
    cy: "54.8",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "210.0",
    cy: "54.8",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "273.6",
    cy: "54.8",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "337.8",
    cy: "54.8",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "82.2",
    cy: "97.6",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "146.4",
    cy: "97.6",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "210.0",
    cy: "97.6",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "273.6",
    cy: "97.6",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "337.8",
    cy: "97.6",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "82.2",
    cy: "140.0",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "146.4",
    cy: "140.0",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "210.0",
    cy: "140.0",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "273.6",
    cy: "140.0",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "337.8",
    cy: "140.0",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "82.2",
    cy: "182.4",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "146.4",
    cy: "182.4",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "210.0",
    cy: "182.4",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "273.6",
    cy: "182.4",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "337.8",
    cy: "182.4",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "82.2",
    cy: "225.2",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "146.4",
    cy: "225.2",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "210.0",
    cy: "225.2",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "273.6",
    cy: "225.2",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "337.8",
    cy: "225.2",
    r: "3.5",
    fill: "#7dd3fc",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("text", {
    x: "52",
    y: "244",
    fill: "#8a7a65",
    "font-family": "monospace",
    "font-size": "8",
    "text-anchor": "end"
  }, "0"), React.createElement("text", {
    x: "364",
    y: "256",
    fill: "#8a7a65",
    "font-family": "monospace",
    "font-size": "8",
    "text-anchor": "middle"
  }, "W"), React.createElement("text", {
    x: "46",
    y: "46",
    fill: "#8a7a65",
    "font-family": "monospace",
    "font-size": "8",
    "text-anchor": "middle"
  }, "H"), React.createElement("text", {
    x: "210",
    y: "270",
    fill: "#8a7a65",
    "font-family": "monospace",
    "font-size": "9",
    "text-anchor": "middle"
  }, "positions (fraction of side): 0.074 \xB7 0.288 \xB7 0.500 \xB7 0.712 \xB7 0.926"), React.createElement("text", {
    x: "210",
    y: "284",
    fill: "#6b7280",
    "font-family": "monospace",
    "font-size": "8",
    "text-anchor": "middle"
  }, "points cluster toward walls where the boundary layer slows the flow"), React.createElement("text", {
    x: "210",
    y: "298",
    fill: "#6b7280",
    "font-family": "monospace",
    "font-size": "8",
    "text-anchor": "middle"
  }, "duct <760mm\u21925 pts/side \xB7 \u2264915\u21926 \xB7 >915\u21927"), React.createElement("circle", {
    cx: "480",
    cy: "140",
    r: "95",
    fill: "rgba(94,234,212,.04)",
    stroke: "#5eead4",
    "stroke-width": "2"
  }), React.createElement("circle", {
    cx: "480",
    cy: "140",
    r: "38.8",
    fill: "none",
    stroke: "#5eead4",
    "stroke-width": "0.5",
    "stroke-dasharray": "2 2",
    opacity: "0.4"
  }), React.createElement("circle", {
    cx: "480",
    cy: "140",
    r: "67.2",
    fill: "none",
    stroke: "#5eead4",
    "stroke-width": "0.5",
    "stroke-dasharray": "2 2",
    opacity: "0.4"
  }), React.createElement("circle", {
    cx: "480",
    cy: "140",
    r: "86.7",
    fill: "none",
    stroke: "#5eead4",
    "stroke-width": "0.5",
    "stroke-dasharray": "2 2",
    opacity: "0.4"
  }), React.createElement("line", {
    x1: "385",
    y1: "140",
    x2: "575",
    y2: "140",
    stroke: "#5eead4",
    "stroke-width": "0.7",
    "stroke-dasharray": "3 3",
    opacity: "0.5"
  }), React.createElement("line", {
    x1: "480",
    y1: "45",
    x2: "480",
    y2: "235",
    stroke: "#5eead4",
    "stroke-width": "0.7",
    "stroke-dasharray": "3 3",
    opacity: "0.5"
  }), React.createElement("circle", {
    cx: "518.8",
    cy: "140",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "441.2",
    cy: "140",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "547.2",
    cy: "140",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "412.8",
    cy: "140",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "566.7",
    cy: "140",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "393.3",
    cy: "140",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "480",
    cy: "178.8",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "480",
    cy: "101.2",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "480",
    cy: "207.2",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "480",
    cy: "72.8",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "480",
    cy: "226.7",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "480",
    cy: "53.3",
    r: "3.5",
    fill: "#5eead4",
    stroke: "#0a1929",
    "stroke-width": "0.8"
  }), React.createElement("circle", {
    cx: "480",
    cy: "140",
    r: "1.5",
    fill: "#8a7a65"
  }), React.createElement("text", {
    x: "480",
    y: "270",
    fill: "#8a7a65",
    "font-family": "monospace",
    "font-size": "9",
    "text-anchor": "middle"
  }, "ring radii: 0.408 \xB7 0.707 \xB7 0.913 of R"), React.createElement("text", {
    x: "480",
    y: "284",
    fill: "#6b7280",
    "font-family": "monospace",
    "font-size": "8",
    "text-anchor": "middle"
  }, "3 diameters \xD7 2 sides \xD7 3 rings = 18 points (preferred)"), React.createElement("text", {
    x: "480",
    y: "298",
    fill: "#6b7280",
    "font-family": "monospace",
    "font-size": "8",
    "text-anchor": "middle"
  }, "each ring bounds an equal area: \u221A((2i\u22121)/2n)"))), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Duct shape")), React.createElement("select", {
    value: shape,
    onChange: e => {
      setShape(e.target.value);
      setVels({});
    },
    style: {
      width: '100%',
      padding: '8px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 13
    }
  }, React.createElement("option", {
    value: "rect"
  }, "Rectangular"), React.createElement("option", {
    value: "round"
  }, "Round"))), shape === 'rect' ? React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Width \xD7 Height"), React.createElement("span", {
    className: "utag"
  }, "mm")), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, React.createElement(FloatInput, {
    value: w,
    onChange: v => {
      setW(v);
      setVels({});
    },
    min: 50,
    max: 3000,
    step: 10
  }), React.createElement(FloatInput, {
    value: h,
    onChange: v => {
      setH(v);
      setVels({});
    },
    min: 50,
    max: 3000,
    step: 10
  }))) : React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Diameter"), React.createElement("span", {
    className: "utag"
  }, "mm")), React.createElement(FloatInput, {
    value: dia,
    onChange: v => {
      setDia(v);
      setVels({});
    },
    min: 50,
    max: 3000,
    step: 5
  }))), shape === 'round' && React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Concentric rings (per radius)")), React.createElement("select", {
    value: rings,
    onChange: e => {
      setRings(parseInt(e.target.value));
      setVels({});
    },
    style: {
      width: '100%',
      padding: '8px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 13
    }
  }, React.createElement("option", {
    value: 3
  }, "3 rings (\u2264250mm duct)"), React.createElement("option", {
    value: 4
  }, "4 rings"), React.createElement("option", {
    value: 5
  }, "5 rings (large duct)"))), shape === 'round' && React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Traverse diameters")), React.createElement("select", {
    value: nDiam,
    onChange: e => {
      setNDiam(parseInt(e.target.value));
      setVels({});
    },
    style: {
      width: '100%',
      padding: '8px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 13
    }
  }, React.createElement("option", {
    value: 2
  }, "2 diameters (minimum)"), React.createElement("option", {
    value: 3
  }, "3 diameters (ASHRAE 111 preferred \u2014 drill at 60\xB0)")), React.createElement("div", {
    style: {
      fontSize: 9,
      color: nDiam < 3 ? '#fbbf24' : '#22c55e',
      marginTop: 3
    }
  }, nDiam < 3 ? '2 is the minimum; 3 diameters at 60° is the standard-preferred method' : '✓ 3 diameters at 60° — standard-preferred coverage')), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Reading type")), React.createElement("select", {
    value: inputMode,
    onChange: e => {
      setInputMode(e.target.value);
      setVels({});
    },
    style: {
      width: '100%',
      padding: '8px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 13
    }
  }, React.createElement("option", {
    value: "vel"
  }, "Velocity \u2014 m/s (vane / hot-wire anemometer)"), React.createElement("option", {
    value: "vp"
  }, "Velocity pressure \u2014 Pa (Pitot-static, per ISO 3966)")), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, inputMode === 'vp' ? 'ISO 3966 reference method: v = √(2·VP/ρ), converted per point automatically' : 'Direct velocity entry')), inputMode === 'vp' && React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Air density \u03C1"), React.createElement("span", {
    className: "utag"
  }, "kg/m\xB3")), React.createElement(FloatInput, {
    value: rhoAir,
    onChange: setRhoAir,
    min: 0.8,
    max: 1.5,
    step: 0.001
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 3
    }
  }, "Standard air \u2248 1.20 at 20\xB0C/101.3 kPa. Use site value for best accuracy.")), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Straight duct upstream"), React.createElement("span", {
    className: "utag"
  }, "\xD7Dh")), React.createElement(FloatInput, {
    value: upDiam,
    onChange: setUpDiam,
    min: 0,
    max: 30,
    step: 0.5
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Straight duct downstream"), React.createElement("span", {
    className: "utag"
  }, "\xD7Dh")), React.createElement(FloatInput, {
    value: downDiam,
    onChange: setDownDiam,
    min: 0,
    max: 30,
    step: 0.5
  }))), React.createElement("div", {
    style: {
      fontSize: 10,
      color: planeOK ? '#22c55e' : '#fbbf24',
      margin: '0 0 8px',
      padding: '7px 9px',
      background: planeOK ? 'rgba(34,197,94,.07)' : 'rgba(251,191,36,.08)',
      borderRadius: 6,
      lineHeight: 1.5
    }
  }, planeOK ? '✓' : '⚠', " Plane location (ASHRAE 111): need \u22657.5 Dh upstream and \u22653 Dh downstream of the nearest bend/damper/transition. ", planeOK ? `Hydraulic diameter Dh ≈ ${fmt(Dh, 0)} mm → need ≥${fmt(7.5 * Dh / 1000, 2)} m upstream, ≥${fmt(3 * Dh / 1000, 2)} m downstream.` : `You have ${fmt(upDiam, 1)}/${fmt(downDiam, 1)} Dh; the profile may not be fully developed and the traverse can read high. Dh ≈ ${fmt(Dh, 0)} mm.`), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#7dd3fc',
      margin: '8px 0',
      padding: '6px 8px',
      background: 'rgba(125,211,252,.06)',
      borderRadius: 6
    }
  }, nPts, " measurement points \xB7 area ", fmt(area, 4), " m\xB2 ", shape === 'rect' ? `· ${cols.length}×${rows.length} grid` : `· ${nDiam} diameters × ${rings} rings × 2 sides`), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      marginBottom: 6
    }
  }, inputMode === 'vp' ? 'Velocity pressure at each point (Pa):' : 'Velocity at each point (m/s):'), shape === 'rect' ? React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, React.createElement("table", {
    style: {
      borderCollapse: 'collapse',
      width: '100%'
    }
  }, React.createElement("tbody", null, rows.map((rf, r) => React.createElement("tr", {
    key: r
  }, cols.map((cf, c) => React.createElement("td", {
    key: c,
    style: {
      padding: 2
    }
  }, React.createElement("input", {
    type: "number",
    value: vels[`r${r}c${c}`] || '',
    onChange: e => setV(`r${r}c${c}`, e.target.value),
    placeholder: "\u2014",
    style: {
      width: '100%',
      minWidth: 48,
      padding: '5px 4px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.15)',
      borderRadius: 4,
      fontSize: 11,
      textAlign: 'center'
    }
  }), React.createElement("div", {
    style: {
      fontSize: 7.5,
      color: '#5a6472',
      textAlign: 'center',
      marginTop: 1
    }
  }, fmt(cf * w, 0), "\xB7", fmt(rf * h, 0)))))))), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#6b5d4a',
      marginTop: 4
    }
  }, "Small numbers under each cell = insertion depth from the two reference walls (mm), x\xB7y. Position tolerance per ISO 3966: \xB10.005\xB7side. Cols (fraction): ", cols.map(c => fmt(c, 3)).join(', '))) : React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))',
      gap: 6
    }
  }, posList.map((k, idx) => React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, React.createElement("input", {
    type: "number",
    value: vels[k] || '',
    onChange: e => setV(k, e.target.value),
    placeholder: `p${idx + 1}`,
    style: {
      padding: '6px 4px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.15)',
      borderRadius: 4,
      fontSize: 11,
      textAlign: 'center'
    }
  }), React.createElement("div", {
    style: {
      fontSize: 7.5,
      color: '#5a6472',
      textAlign: 'center',
      marginTop: 1
    }
  }, posDepth[k] ? `${fmt(posDepth[k].depth, 0)}mm` : '')))), entered.length > 0 && React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '10px 12px',
      background: 'rgba(0,0,0,.15)',
      borderRadius: 8,
      border: '1px solid rgba(201,168,76,.15)'
    }
  }, React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12,
      color: '#f5f0e8',
      marginBottom: 4
    }
  }, React.createElement("span", null, "Mean velocity", inputMode === 'vp' ? ' (from VP)' : ''), React.createElement("strong", null, fmt(vMean, 3), " m/s")), React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 12,
      color: '#f5f0e8',
      marginBottom: 4
    }
  }, React.createElement("span", null, "Volume flow"), React.createElement("strong", {
    style: {
      color: '#7dd3fc'
    }
  }, fmt(flow, 0), " m\xB3/h")), React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11,
      color: '#8a7a65',
      marginBottom: 4
    }
  }, React.createElement("span", null, "Points entered"), React.createElement("span", null, entered.length, " / ", nPts)), React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11,
      color: '#8a7a65'
    }
  }, React.createElement("span", null, "Profile spread (CoV)"), React.createElement("span", null, fmt(cov, 1), "%", covMean != null ? ` · u(mean) ≈ ${fmt(covMean, 1)}%` : '')), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#6b5d4a',
      marginTop: 2,
      lineHeight: 1.4
    }
  }, "CoV is a profile-uniformity diagnostic. Only the standard uncertainty of the mean (CoV/\u221AN) feeds the airflow budget \u2014 combined with instrument terms, not replacing them."), React.createElement("div", {
    style: {
      fontSize: 10,
      color: qualityOK ? '#22c55e' : '#fbbf24',
      marginTop: 8,
      lineHeight: 1.5,
      padding: '6px 8px',
      background: qualityOK ? 'rgba(34,197,94,.07)' : 'rgba(251,191,36,.08)',
      borderRadius: 6
    }
  }, qualityOK ? '✓' : '⚠', " ASHRAE 111 spread check: ", goodCount, "/", entered.length, " readings \u2265 ", fmt(vpThreshold, 2), " m/s (= \u221A0.10\xB7v_max, the 10% velocity-pressure threshold; ", fmt(0.75 * entered.length, 0), " needed). ", hasReverse ? 'Reverse/negative reading detected — relocate the traverse plane.' : qualityOK ? 'Profile acceptable.' : 'Profile may be unreliable — check for obstructions or measure in a straighter run.'), !planeOK && React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#fbbf24',
      marginTop: 6,
      lineHeight: 1.5,
      padding: '6px 8px',
      background: 'rgba(251,191,36,.08)',
      borderRadius: 6
    }
  }, "\u26A0 Plane is at ", fmt(upDiam, 1), " Dh upstream / ", fmt(downDiam, 1), " Dh downstream \u2014 below the 7.5/3 Dh the profile may not be fully developed; the flow can read high."), allEntered && (!qualityOK || !planeOK) && React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      fontSize: 10,
      color: '#fbbf24',
      marginTop: 8,
      padding: '8px 10px',
      background: 'rgba(251,191,36,.1)',
      border: '1px solid rgba(251,191,36,.3)',
      borderRadius: 6,
      cursor: 'pointer',
      lineHeight: 1.45
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: override,
    onChange: e => setOverride(e.target.checked),
    style: {
      marginTop: 2
    }
  }), React.createElement("span", null, "This traverse fails the ", !qualityOK ? 'profile spread' : '', !qualityOK && !planeOK ? ' and ' : '', !planeOK ? 'plane-location' : '', " check", !qualityOK && !planeOK ? 's' : '', ". I understand the result may be unreliable and want to apply it anyway. It will be flagged ", React.createElement("strong", null, "non-compliant"), " in the airflow source.")), (() => {
    const ok = allEntered && (qualityOK && planeOK || override);
    const compliant = qualityOK && planeOK;
    const label = !allEntered ? `Enter all ${nPts} points to apply` : !compliant && !override ? `Acknowledge to apply (failed checks)` : !compliant && override ? `Apply ${fmt(flow, 0)} m³/h — non-compliant` : `Apply ${fmt(flow, 0)} m³/h as airflow`;
    return React.createElement("button", {
      onClick: () => onApply(Math.round(flow), covMean, compliant ? 'traverse' : 'traverse-noncompliant'),
      disabled: !ok,
      style: {
        width: '100%',
        marginTop: 10,
        padding: '9px',
        background: ok ? compliant ? 'rgba(125,211,252,.15)' : 'rgba(251,191,36,.15)' : 'rgba(100,100,100,.1)',
        color: ok ? compliant ? '#7dd3fc' : '#fbbf24' : '#6b5d4a',
        border: `1px solid ${ok ? compliant ? 'rgba(125,211,252,.4)' : 'rgba(251,191,36,.4)' : 'rgba(100,100,100,.2)'}`,
        borderRadius: 8,
        fontSize: 12,
        cursor: ok ? 'pointer' : 'not-allowed'
      }
    }, label);
  })())));
}
function AirAir({
  unit,
  job,
  uid,
  setLog,
  setShowLog,
  pAtm = 101500,
  measDate = ""
}) {
  const [eDB, setEDB] = useState(26);
  const [eRH, setERH] = useState(50);
  const [lDB, setLDB] = useState(14);
  const [lRH, setLRH] = useState(90);
  const [oDB, setODB] = useState(35);
  const [oRH, setORH] = useState(40);
  const [af, setAf] = useState(600);
  const [pw, setPw] = useState(1.2);
  const [pFan, setPFan] = useState(0.0);
  const [pOther, setPOther] = useState(0.0);
  const [showPow, setShowPow] = useState(false);
  const [elecBoundary, setElecBoundary] = useState("");
  const [travCov, setTravCov] = useState(null);
  const [afMethod, setAfMethod] = useState("");
  const [printChart, setPrintChart] = useState(true);
  const [ref, setRef] = useState("R32");
  const [sP, setSP] = useState(8);
  const [dP, setDP] = useState(28);
  const [sT, setST] = useState(15);
  const [liqT, setLiqT] = useState(35);
  const C = v => unit === "F" ? (v - 32) * 5 / 9 : v;
  const F = v => unit === "F" ? v * 9 / 5 + 32 : v;
  const d = (c, n = 1) => fmt(F(c), n);
  const eC = C(eDB),
    lC = C(lDB),
    oC = C(oDB);
  const hE = enth(eC, eRH, pAtm),
    vE = sVol(eC, eRH, pAtm),
    wE = wBulb(eC, eRH, pAtm),
    WE = humR(eC, eRH, pAtm);
  const hL = enth(lC, lRH, pAtm),
    vL = sVol(lC, lRH, pAtm),
    wL = wBulb(lC, lRH, pAtm),
    WL = humR(lC, lRH, pAtm);
  const wO = wBulb(oC, oRH, pAtm),
    WO = humR(oC, oRH, pAtm);
  const afs = af / 3600,
    mf = afs / vL,
    dh = Math.max(0, hE - hL),
    Q = mf * dh,
    pTotal = pw + pFan + pOther,
    eer = pTotal > 0 ? Q / pTotal : 0,
    eerComp = pw > 0 ? Q / pw : 0;
  const dT = eC - lC,
    cpMA = 1.006 + 1.86 * WE,
    sr = dh > 0 ? Math.max(0, Math.min(1, cpMA * dT / dh)) : 0;
  const qs = Q * sr,
    ql = Q - qs;
  const mn = unit === "F" ? 23 : -5,
    mx = unit === "F" ? 113 : 45,
    ec = eCol(eer);
  function save() {
    const _rs = refrigState(ref, sP, dP, unit === "F" ? C(sT) : sT, unit === "F" ? C(liqT) : liqT, pAtm / 1000);
    const tE = _rs ? _rs.tE : null,
      sh = _rs ? _rs.sh : null,
      tCond = _rs ? _rs.tC : null;
    setLog(p => [{
      id: Date.now(),
      date: measDate || new Date().toLocaleString(),
      mode: 'Air/Air',
      job: job || "--",
      uid: uid || "--",
      ref,
      t1: fmt(F(eC), 2),
      t2: fmt(F(lC), 2),
      wb1: d(wE, 2),
      wb2: d(wL, 2),
      rh1: fmt(eRH, 4),
      rh2: fmt(lRH, 4),
      af,
      pw: fmt(pw, 4),
      Q: fmt(Q, 4),
      eer: fmt(eer, 4),
      tE: tE != null ? fmt(tE, 4) : "--",
      sh: sh != null ? fmt(sh, 4) : "--",
      tC: tCond != null ? fmt(tCond, 4) : "--",
      sP: fmt(sP, 4),
      dP: fmt(dP, 4),
      unit
    }, ...p]);
    setShowLog(true);
  }
  const _issues = validateInputs('aa', {
    eRH,
    lRH,
    hE,
    hL,
    eC,
    lC,
    af,
    pw,
    eer
  });
  return React.createElement(React.Fragment, null, React.createElement(ValidationBanner, {
    issues: _issues
  }), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "slbl"
  }, "Inn - Entering Evaporator (Return Air)"), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Dry-Bulb ", React.createElement("span", {
    className: "badge bd"
  }, "DB")), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: eDB,
    onChange: setEDB,
    min: mn,
    max: mx,
    step: 0.0001
  }), React.createElement("input", {
    type: "range",
    min: mn,
    max: mx,
    step: 0.1,
    value: eDB,
    onChange: e => setEDB(parseFloat(e.target.value))
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Relative Humidity"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: eRH,
    onChange: setERH
  }), React.createElement("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 0.0001,
    value: eRH,
    onChange: e => setERH(parseFloat(e.target.value))
  }))), React.createElement("div", {
    className: "irow"
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "WBinn"), React.createElement("span", {
    className: "iv"
  }, d(wE, 2), " deg ", unit)), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "DP_inn"), React.createElement("span", {
    className: "iv"
  }, d(dewPt(eC, eRH), 2), " deg ", unit)), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "h_inn"), React.createElement("span", {
    className: "iv"
  }, fmt(hE)), React.createElement("span", {
    className: "iu"
  }, " kJ/kg")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "v_inn"), React.createElement("span", {
    className: "iv"
  }, fmt(vE, 4)), React.createElement("span", {
    className: "iu"
  }, " m3/kg")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "W_inn"), React.createElement("span", {
    className: "iv"
  }, fmt(WE * 1000, 4)), React.createElement("span", {
    className: "iu"
  }, " g/kg")))), React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(201,168,76,.2)'
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: '#d4a843'
    }
  }, "Ut - Leaving Evaporator (Supply Air)"), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Leaving DB ", React.createElement("span", {
    className: "badge bd"
  }, "DB")), React.createElement("span", {
    className: "utag"
  }, "deg ", unit, " measured")), React.createElement(FloatInput, {
    value: lDB,
    onChange: setLDB,
    min: mn,
    max: mx,
    step: 0.0001,
    style: {
      borderColor: 'rgba(201,168,76,.4)'
    }
  }), React.createElement("input", {
    type: "range",
    min: mn,
    max: mx,
    step: 0.1,
    value: lDB,
    onChange: e => setLDB(parseFloat(e.target.value))
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Leaving RH"), React.createElement("span", {
    className: "utag"
  }, "% measured")), React.createElement(FloatInput, {
    value: lRH,
    onChange: setLRH,
    style: {
      borderColor: 'rgba(201,168,76,.4)'
    }
  }), React.createElement("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 0.0001,
    value: lRH,
    onChange: e => setLRH(parseFloat(e.target.value))
  }))), lDB >= eDB && React.createElement("div", {
    className: "warn"
  }, "Leaving DB must be below entering DB"), lRH > 98 && React.createElement("div", {
    className: "warn"
  }, "Leaving RH > 98% \u2014 condensation on sensor possible. Reading unreliable \u2014 verify with sling psychrometer."), lRH > 95 && lRH <= 98 && React.createElement("div", {
    className: "warn",
    style: {
      background: 'rgba(251,191,36,.08)',
      border: '1px solid rgba(251,191,36,.2)',
      color: '#fbbf24'
    }
  }, "Leaving RH > 95% \u2014 near saturation. Allow 5-10 min extra stabilisation."), lRH > 98 && React.createElement("div", {
    className: "warn"
  }, "\u26A0 Leaving RH > 98% \u2014 condensation possible on sensor. Reading may be unreliable. Verify with sling psychrometer."), lRH > 95 && lRH <= 98 && React.createElement("div", {
    className: "warn",
    style: {
      background: 'rgba(251,191,36,.08)',
      border: '1px solid rgba(251,191,36,.2)',
      color: '#fbbf24'
    }
  }, "\u26A0 Leaving RH > 95% \u2014 near saturation. Allow extra stabilisation time (5-10 min)."), React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '13px 15px',
      background: 'rgba(201,168,76,.07)',
      border: '1px solid rgba(201,168,76,.18)',
      borderRadius: 8
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: '.15em',
      textTransform: 'uppercase',
      color: '#d4a843',
      marginBottom: 9
    }
  }, "DB + RH - Wet-Bulb Converter"), React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.25)',
      borderRadius: 8,
      padding: '9px 14px',
      textAlign: 'center'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#475569',
      marginBottom: 3
    }
  }, "DB"), React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 20,
      fontWeight: 700,
      color: '#f0f9ff'
    }
  }, lDB, " deg")), React.createElement("div", {
    style: {
      color: '#475569',
      fontSize: 16
    }
  }, "+"), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.25)',
      borderRadius: 8,
      padding: '9px 14px',
      textAlign: 'center'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#475569',
      marginBottom: 3
    }
  }, "RH"), React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 20,
      fontWeight: 700,
      color: '#f0f9ff'
    }
  }, lRH, "%")), React.createElement("div", {
    style: {
      color: '#475569',
      fontSize: 16
    }
  }, "->"), React.createElement("div", {
    style: {
      background: 'rgba(201,168,76,.12)',
      border: '1px solid rgba(201,168,76,.3)',
      borderRadius: 8,
      padding: '9px 14px',
      textAlign: 'center'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#d4a843',
      marginBottom: 3
    }
  }, "Wet-Bulb WB"), React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 20,
      fontWeight: 700,
      color: '#d4a843'
    }
  }, d(wL, 2), " deg"))), React.createElement("div", {
    className: "irow",
    style: {
      borderColor: 'rgba(201,168,76,.18)',
      background: 'rgba(0,0,0,.15)',
      marginTop: 0
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "h_ut"), React.createElement("span", {
    className: "iv"
  }, fmt(hL)), React.createElement("span", {
    className: "iu"
  }, " kJ/kg")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "v_ut"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, fmt(vL, 4)), React.createElement("span", {
    className: "iu"
  }, " m3/kg")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "W_ut"), React.createElement("span", {
    className: "iv"
  }, fmt(WL * 1000, 4)), React.createElement("span", {
    className: "iu"
  }, " g/kg"))))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "slbl"
  }, "Coil Summary"), React.createElement("table", {
    className: "pt"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null), React.createElement("th", null, "DB deg ", unit), React.createElement("th", null, "WB deg ", unit), React.createElement("th", null, "RH %"), React.createElement("th", null, "h kJ/kg"), React.createElement("th", null, "v m3/kg"), React.createElement("th", null, "W g/kg"))), React.createElement("tbody", null, React.createElement("tr", {
    className: "re"
  }, React.createElement("td", null, "Inn"), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, d(eC, 2))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, d(wE, 2))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, fmt(eRH, 4))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, fmt(hE))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, fmt(vE, 4))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, fmt(WE * 1000, 4)))), React.createElement("tr", {
    className: "rl"
  }, React.createElement("td", null, "Ut"), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, d(lC, 2))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, d(wL, 2))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, d(dewPt(lC, lRH), 2))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, fmt(lRH, 4))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, fmt(hL))), React.createElement("td", null, React.createElement("span", {
    className: "vb",
    style: {
      color: '#fbbf24'
    }
  }, fmt(vL, 4))), React.createElement("td", null, React.createElement("span", {
    className: "vb"
  }, fmt(WL * 1000, 4)))), React.createElement("tr", {
    className: "rd"
  }, React.createElement("td", null, "delta"), React.createElement("td", null, fmt(Math.abs(eC - lC), 2)), React.createElement("td", null, fmt(Math.abs(wE - wL), 2)), React.createElement("td", null, fmt(Math.abs(lRH - eRH), 1)), React.createElement("td", null, fmt(dh, 4)), React.createElement("td", null, "--"), React.createElement("td", null, fmt(Math.abs(WE - WL) * 1000, 2)))))), React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(251,191,36,.18)'
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: '#fbbf24'
    }
  }, "Outdoor Unit - Ambient (Condenser)"), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Ambient DB"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: oDB,
    onChange: setODB,
    min: mn,
    max: mx,
    step: 0.0001,
    style: {
      borderColor: 'rgba(251,191,36,.4)'
    }
  }), React.createElement("input", {
    type: "range",
    min: mn,
    max: mx,
    step: 0.1,
    value: oDB,
    onChange: e => setODB(parseFloat(e.target.value)),
    max: unit === "F" ? 140 : 60
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Relative Humidity"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: oRH,
    onChange: setORH,
    style: {
      borderColor: 'rgba(251,191,36,.4)'
    }
  }), React.createElement("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 0.0001,
    value: oRH,
    onChange: e => setORH(parseFloat(e.target.value))
  }))), React.createElement("div", {
    className: "irow",
    style: {
      borderColor: 'rgba(251,191,36,.18)',
      background: 'rgba(251,191,36,.05)'
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "DB"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, d(oC), " deg ", unit)), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "WB"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, d(wO, 2), " deg ", unit)), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "RH"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, oRH, "%")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "W"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, fmt(WO * 1000, 4)), React.createElement("span", {
    className: "iu"
  }, " g/kg")))), React.createElement(RefSec, {
    unit: unit,
    refr: ref,
    setRefr: setRef,
    sP: sP,
    setSP: setSP,
    dP: dP,
    setDP: setDP,
    sT: sT,
    setST: setST,
    liqT: liqT,
    setLiqT: setLiqT,
    pAtm: pAtm / 1000
  }), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "slbl"
  }, "Airflow and Electrical Input"), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Airflow (at outlet)"), React.createElement("span", {
    className: "utag"
  }, "m3/h")), React.createElement(FloatInput, {
    value: af,
    onChange: setAf,
    min: 10,
    max: 50000,
    step: 10
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#475569',
      marginTop: 5
    }
  }, fmt(afs * 1000, 4), " L/s"), React.createElement("select", {
    value: afMethod,
    onChange: e => setAfMethod(e.target.value),
    style: {
      width: '100%',
      marginTop: 8,
      padding: '7px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 12
    }
  }, React.createElement("option", {
    value: ""
  }, "\u2014 how was airflow obtained? \u2014"), React.createElement("option", {
    value: "traverse"
  }, "Duct traverse (multi-point, best)"), React.createElement("option", {
    value: "hood"
  }, "Capture hood / funnel"), React.createElement("option", {
    value: "free"
  }, "Free reading at grille (no duct, no hood)")), afMethod === "free" && React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#f87171',
      marginTop: 8,
      lineHeight: 1.55,
      padding: '8px 10px',
      background: 'rgba(248,113,113,.1)',
      border: '1px solid rgba(248,113,113,.35)',
      borderRadius: 8
    }
  }, "\u26A0 Free grille reading \u2014 expect \xB115\u201325% airflow error. A handheld sensor at the outlet captures a turbulent mix of supply and room air, so the resulting capacity (Q) and EER carry the same error. Enter that figure in the GUM panel below and treat the result as indicative, not verified. Prefer a duct traverse or capture hood whenever possible (see the Air/Air measurement guide)."), afMethod === "hood" && React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#fbbf24',
      marginTop: 8,
      lineHeight: 1.55,
      padding: '8px 10px',
      background: 'rgba(251,191,36,.08)',
      border: '1px solid rgba(251,191,36,.3)',
      borderRadius: 8
    }
  }, "\u26A0 Capture hood \u2014 typically \xB15\u201310% if the hood seals fully over the grille and the throat has a straight section before the sensor. Cross-check against the liquid side or psychrometric capacity; a >10% gap suggests a hood leak. See the build guide in the Air/Air measurement guide."), afMethod === "traverse" && travCov == null && React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#7dd3fc',
      marginTop: 8,
      lineHeight: 1.55,
      padding: '8px 10px',
      background: 'rgba(125,211,252,.08)',
      border: '1px solid rgba(125,211,252,.3)',
      borderRadius: 8
    }
  }, "\u2139 Use the multi-point traverse panel below and press \u201CApply \u2026\u201D so the measured profile scatter feeds the uncertainty budget automatically."), afMethod === "traverse" && travCov != null && React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#22c55e',
      marginTop: 8,
      lineHeight: 1.55,
      padding: '8px 10px',
      background: 'rgba(34,197,94,.07)',
      border: '1px solid rgba(34,197,94,.3)',
      borderRadius: 8
    }
  }, "\u2713 Traverse applied \u2014 profile scatter ", fmt(travCov, 1), "% is included in the GUM airflow uncertainty."), afMethod === "traverse-noncompliant" && React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#fbbf24',
      marginTop: 8,
      lineHeight: 1.55,
      padding: '8px 10px',
      background: 'rgba(251,191,36,.1)',
      border: '1px solid rgba(251,191,36,.4)',
      borderRadius: 8
    }
  }, "\u26A0 ", React.createElement("strong", null, "Non-compliant traverse applied."), " This airflow came from a traverse that failed the profile-spread or plane-location acceptance check. It was applied by explicit override. Treat the capacity and EER as indicative only, and mark any report as non-compliant. ", travCov != null ? `Profile scatter ${fmt(travCov, 1)}% is still included in the uncertainty, but it does not capture the profile-development error.` : '')), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Compressor Power"), React.createElement("span", {
    className: "utag"
  }, "kW")), React.createElement(FloatInput, {
    value: pw,
    onChange: setPw,
    min: 0.1,
    max: 500,
    step: 0.05
  })), React.createElement("button", {
    onClick: () => setShowPow(v => !v),
    style: {
      fontSize: 10,
      color: '#8a7a65',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px 0',
      textDecoration: 'underline'
    }
  }, showPow ? '▾ Hide' : '▸ Add', " fan / auxiliary power"), showPow && React.createElement("div", {
    className: "two",
    style: {
      marginTop: 6
    }
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Fan(s) P_fan"), React.createElement("span", {
    className: "utag"
  }, "kW")), React.createElement(FloatInput, {
    value: pFan,
    onChange: setPFan,
    min: 0,
    max: 50,
    step: 0.001
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Auxiliary P_aux"), React.createElement("span", {
    className: "utag"
  }, "kW")), React.createElement(FloatInput, {
    value: pOther,
    onChange: setPOther,
    min: 0,
    max: 50,
    step: 0.001
  }))), pFan + pOther > 0 && React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#d4a843',
      marginTop: 4
    }
  }, "P_total = ", fmt(pTotal, 4), " kW \u2014 EER uses P_total per EN 14511-1")), React.createElement(DuctTraverse, {
    onApply: (flow, cov, method) => {
      setAf(flow);
      setTravCov(cov);
      setAfMethod(method || "traverse");
    }
  }), React.createElement("div", {
    className: "bar-l"
  }, React.createElement("span", null, elecBoundary === "" ? 'EER' : elecBoundary === 'whole' ? 'EER whole-unit' : elecBoundary === 'compressor' ? 'EER compressor-only' : elecBoundary === 'system' ? 'EER refrigeration-system' : 'EER measured-total', ": ", React.createElement("strong", {
    style: {
      color: elecBoundary === "" ? '#8a7a65' : ec
    }
  }, elecBoundary === "" ? '— confirm boundary —' : fmt(eer, 4) + ' W/W - ' + eLbl(eer)))), React.createElement("div", {
    className: "bar-t"
  }, React.createElement("div", {
    className: "bar-f",
    style: {
      width: Math.min(100, eer / 6 * 100) + '%',
      background: ec
    }
  })), React.createElement("div", {
    style: {
      marginTop: 10,
      padding: '10px 12px',
      background: elecBoundary === "" ? 'rgba(251,191,36,.08)' : 'rgba(34,197,94,.06)',
      border: `1px solid ${elecBoundary === "" ? 'rgba(251,191,36,.3)' : 'rgba(34,197,94,.2)'}`,
      borderRadius: 8
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: elecBoundary === "" ? '#fbbf24' : '#8a7a65',
      marginBottom: 6,
      lineHeight: 1.5
    }
  }, elecBoundary === "" ? '⚠ Confirm the electrical measurement boundary before relying on this EER. A blank fan/aux field is NOT automatically zero load — confirm what your power figure actually includes:' : 'Power boundary confirmed: this EER is labelled accordingly. Change if your measurement boundary differs.'), React.createElement("select", {
    value: elecBoundary,
    onChange: e => setElecBoundary(e.target.value),
    style: {
      width: '100%',
      padding: '8px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 12
    }
  }, React.createElement("option", {
    value: ""
  }, "\u2014 Select what P_total includes \u2014"), React.createElement("option", {
    value: "whole"
  }, "Whole unit (compressor + all fans + auxiliaries)"), React.createElement("option", {
    value: "compressor"
  }, "Compressor only"), React.createElement("option", {
    value: "system"
  }, "Refrigeration system (compressor + condenser fan)"), React.createElement("option", {
    value: "measured"
  }, "Measured total at supply terminals")))), React.createElement("div", {
    className: "res"
  }, React.createElement("div", {
    className: "rl2"
  }, "Results"), React.createElement("div", {
    className: "rg"
  }, React.createElement("div", {
    className: "ri big"
  }, React.createElement("div", {
    className: "rn"
  }, "Q_tot - Total Cooling Output"), React.createElement("div", {
    className: "rv"
  }, fmt(Q, 4), " kW"), React.createElement("div", {
    className: "ru"
  }, fmt(Q * 3412.14, 0), " BTU/h - ", fmt(Q / 3.517, 4), " tons")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, elecBoundary === "" ? 'EER — confirm boundary' : elecBoundary === 'whole' ? 'EER — whole unit' : elecBoundary === 'compressor' ? 'EER — compressor only' : elecBoundary === 'system' ? 'EER — refrigeration system' : 'EER — measured total'), React.createElement("div", {
    className: "rv",
    style: {
      color: elecBoundary === "" ? '#8a7a65' : ec
    }
  }, elecBoundary === "" ? '— confirm boundary —' : fmt(eer, 4)), React.createElement("div", {
    className: "ru"
  }, elecBoundary === "" ? 'select what P_total includes above' : 'W/W = ' + fmt(eer * 3.412, 3) + ' BTU/Wh')), pFan + pOther > 0 && React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "EER \u2014 compressor only"), React.createElement("div", {
    className: "rv",
    style: {
      color: eCol(eerComp)
    }
  }, fmt(eerComp, 4)), React.createElement("div", {
    className: "ru"
  }, "W/W (excl. fans)")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "Mass Flow"), React.createElement("div", {
    className: "rv"
  }, fmt(mf, 4)), React.createElement("div", {
    className: "ru"
  }, "kg/s = V / v_ut")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "dh (h_inn - h_ut)"), React.createElement("div", {
    className: "rv"
  }, fmt(dh, 4)), React.createElement("div", {
    className: "ru"
  }, "kJ/kg")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "Sensible Qs"), React.createElement("div", {
    className: "rv"
  }, fmt(qs, 4)), React.createElement("div", {
    className: "ru"
  }, "kW (SHR ", fmt(sr, 4), ")")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "Latent Ql"), React.createElement("div", {
    className: "rv"
  }, fmt(ql, 4)), React.createElement("div", {
    className: "ru"
  }, "kW (dehumid)"))), React.createElement("div", {
    className: "fml"
  }, React.createElement("strong", null, "m"), " = V/v_ut = ", fmt(afs, 4), " / ", fmt(vL, 4), " = ", fmt(mf, 4), " kg/s", React.createElement("br", null), React.createElement("strong", null, "Q_tot"), " = m x (h_inn - h_ut) = ", fmt(mf, 4), " x (", fmt(hE, 4), " - ", fmt(hL, 4), ") = ", React.createElement("strong", null, fmt(Q, 4), " kW"), React.createElement("br", null), React.createElement("strong", null, "EER"), " = ", fmt(Q, 4), " / ", fmt(pw, 4), " = ", React.createElement("strong", null, elecBoundary === "" ? '— confirm electrical boundary —' : fmt(eer, 4)))), React.createElement("div", {
    className: "card" + (printChart ? "" : " no-print"),
    style: {
      borderColor: 'rgba(125,211,252,.2)'
    }
  }, React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: '#7dd3fc',
      marginBottom: 0
    }
  }, "Psychrometric Chart (T\u2013W)"), React.createElement("label", {
    className: "no-print",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 10,
      color: '#8a7a65',
      cursor: 'pointer'
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: printChart,
    onChange: e => setPrintChart(e.target.checked)
  }), "include in print")), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "Entering and leaving air plotted on a live psychrometric chart at ", fmt(pAtm / 1000, 1), " kPa. The red line is the cooling process; its slope shows the sensible/latent split. Saturation, RH and enthalpy grid use the same psychrometric formulas (Buck saturation, humidity ratio, enthalpy) as the capacity result, evaluated at the actual barometric pressure. The chart re-implements those formulas rather than sharing one stored state, so they agree by construction but are not a single code path."), React.createElement("div", {
    className: "chartbox"
  }, React.createElement(MollierChart, {
    pAtm: pAtm,
    points: [{
      T: eC,
      RH: eRH,
      label: 'Entering (inn)',
      color: 'var(--ch-enter)'
    }, {
      T: lC,
      RH: lRH,
      label: 'Leaving (ut)',
      color: 'var(--ch-leave)'
    }]
  }))), React.createElement(SteadyStateChecker, null), React.createElement(UncertaintyPanel, {
    mode: "aa",
    Q: Q,
    EER: eer,
    travCov: travCov,
    afMethod: afMethod,
    params: {
      dh: dh,
      hInn: hE,
      hUt: hL,
      T_ut: lC,
      RH_ut: lRH
    }
  }), React.createElement(GuideAA, null), React.createElement("div", {
    className: "brow no-print"
  }, React.createElement("button", {
    className: "bt bt-g",
    onClick: save
  }, "Save Measurement"), React.createElement("button", {
    className: "bt bt-b",
    onClick: () => window.print()
  }, "Print / PDF")));
}
function AirLiquid({
  unit,
  job,
  uid,
  setLog,
  setShowLog,
  pAtm,
  measDate = ""
}) {
  const [useGly, setUseGly] = React.useState(true);
  const [printChart, setPrintChart] = React.useState(true);
  const [glyType, setGlyType] = React.useState('EG');
  const [glyPct, setGlyPct] = React.useState(30);
  const [wTi, setWTi] = React.useState(7.0);
  const [wTo, setWTo] = React.useState(12.0);
  const [wF, setWF] = React.useState(0.5);
  const [pw, setPw] = React.useState(1.2);
  const [oDB, setODB] = React.useState(35);
  const [oRH, setORH] = React.useState(40);
  const [lDB, setLDB] = React.useState(null);
  const [lRH, setLRH] = React.useState(null);
  const [af, setAf] = React.useState(null);
  const [lDBm, setLDBm] = React.useState(14);
  const [lRHm, setLRHm] = React.useState(90);
  const [afm, setAfm] = React.useState(600);
  const [ref, setRef] = React.useState('R32');
  const [sP, setSP] = React.useState(8);
  const [dP, setDP] = React.useState(28);
  const [sT, setST] = React.useState(15);
  const [liqT, setLiqT] = React.useState(35);
  const C = v => unit === 'F' ? (v - 32) * 5 / 9 : v;
  const F = v => unit === 'F' ? v * 9 / 5 + 32 : v;
  const d = (c, n = 2) => fmt(F(c), n);
  const EG_TABLE = [[0, 4.18, 1.000, 0], [10, 4.09, 1.014, -3.5], [15, 4.04, 1.021, -6], [20, 3.98, 1.028, -9], [25, 3.91, 1.035, -13], [30, 3.84, 1.041, -16], [35, 3.74, 1.048, -21], [40, 3.63, 1.054, -25], [45, 3.52, 1.059, -31], [50, 3.40, 1.064, -37]];
  const PG_TABLE = [[0, 4.18, 1.000, 0], [10, 4.13, 1.009, -3], [15, 4.09, 1.013, -5], [20, 4.03, 1.018, -8], [25, 3.97, 1.022, -11], [30, 3.89, 1.026, -15], [35, 3.81, 1.030, -20], [40, 3.72, 1.034, -24], [45, 3.62, 1.037, -29], [50, 3.51, 1.040, -34]];
  function glyProps(type, pct, T) {
    const r = glyEval(type, pct, typeof T === 'number' && isFinite(T) ? T : 20);
    return {
      cp: r.cp,
      rho: r.rho,
      freeze: r.freeze,
      valid: r.valid,
      reason: r.reason
    };
  }
  const gp = useGly ? glyProps(glyType, glyPct, (C(wTi) + C(wTo)) / 2) : {
    cp: 4.18,
    rho: 1.0,
    freeze: 0,
    valid: true
  };
  const wTiC = C(wTi),
    wToC = C(wTo);
  const dTw = Math.abs(wToC - wTiC);
  const mW = wF * gp.rho;
  const Qw = mW * gp.cp * dTw;
  const eer = pw > 0 ? Qw / pw : 0;
  const oC = C(oDB);
  const _air = engcalcAirSide({
    oC,
    oRH,
    lDB,
    lRH,
    af,
    lDBmC: C(lDBm),
    lRHm,
    afm,
    Qw,
    pAtm,
    classification: 'entered'
  });
  const _pProv = _air.pressure;
  const _airSuppressed = _air.suppressed;
  const hE = _air.hE,
    vE = _air.vE,
    wBE = _air.wBE,
    WE = _air.WE,
    mA = _air.mA,
    hLauto = _air.hLauto,
    lDBauto = _air.lDBauto,
    lRHauto = _air.lRHauto,
    lDBuse = _air.lDBuse,
    lRHuse = _air.lRHuse,
    hL = _air.hL,
    vL = _air.vL,
    wBL = _air.wBL,
    dh = _air.dh,
    Qa = _air.Qa;
  const afUse = af !== null ? afm : 2000;
  const isFullyManualAir = lDB !== null && lRH !== null && af !== null;
  const isAutoAir = lDB === null && lRH === null && af === null;
  const bal = _airSuppressed || !isFinite(Qa) ? null : Qw > 0 ? (Qa - Qw) / Qw * 100 : 0;
  const Qexpected = Qw + pw;
  const balVsReject = _airSuppressed || !isFinite(Qa) ? null : Qexpected > 0 ? (Qa - Qexpected) / Qexpected * 100 : 0;
  const _disp = engcalcAirDisplay(_air, {
    isAutoAir,
    isFullyManualAir,
    bal,
    balVsReject
  });
  const ec = eCol(eer);
  function resetAir() {
    setLDB(null);
    setLRH(null);
    setAf(null);
    setLDBm(14);
    setLRHm(90);
    setAfm(600);
  }
  function save() {
    const _rs = refrigState(ref, sP, dP, unit === 'F' ? C(sT) : sT, unit === 'F' ? C(liqT) : liqT, pAtm / 1000);
    const tE = _rs ? _rs.tE : null;
    const sh = _rs ? _rs.sh : null;
    const tCond = _rs ? _rs.tC : null;
    setLog(p => [engcalcAirRecord({
      id: Date.now(),
      date: measDate || new Date().toLocaleString(),
      job: job || '--',
      uid: uid || '--',
      ref,
      t1: fmt(F(oC), 4),
      t2: fmt(F(lDBuse), 4),
      wb1: d(wBE, 4),
      wb2: d(wBL, 4),
      rh1: fmt(oRH, 4),
      rh2: fmt(lRHuse, 4),
      wTi: fmt(F(wTiC), 4),
      wTo: fmt(F(wToC), 4),
      wF: fmt(wF, 4),
      af: fmt(afUse, 1),
      pw: fmt(pw, 4),
      Q: fmt(Qw, 4),
      Qair: fmt(Qa, 4),
      eer: fmt(eer, 4),
      air: _air,
      tE: tE != null ? fmt(tE, 4) : '--',
      sh: sh != null ? fmt(sh, 4) : '--',
      tC: tCond != null ? fmt(tCond, 4) : '--',
      sP: fmt(sP, 4),
      dP: fmt(dP, 4),
      unit
    }), ...p]);
    setShowLog(true);
  }
  const mn = unit === 'F' ? 23 : -5,
    mx = unit === 'F' ? 113 : 45;
  const _issues = validateInputs('al', {
    dTw,
    wF,
    glyPct,
    pw,
    eer
  });
  return React.createElement(React.Fragment, null, React.createElement(ValidationBanner, {
    issues: _issues
  }), React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(180,145,60,.3)'
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: '#0ea5e9'
    }
  }, "Liquid Side \u2014 Primary (Chilled Water)"), React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14
    }
  }, React.createElement("button", {
    onClick: () => setUseGly(v => !v),
    style: {
      padding: '6px 14px',
      borderRadius: 6,
      fontSize: 11,
      cursor: 'pointer',
      fontFamily: 'DM Mono,monospace',
      border: '1px solid',
      borderColor: useGly ? '#0ea5e9' : 'rgba(255,255,255,.15)',
      background: useGly ? 'rgba(180,145,60,.15)' : 'rgba(255,255,255,.03)',
      color: useGly ? '#0ea5e9' : '#64748b'
    }
  }, useGly ? 'Glycol ON' : 'Glycol OFF'), useGly && React.createElement(React.Fragment, null, React.createElement("select", {
    value: glyType,
    onChange: e => setGlyType(e.target.value),
    style: {
      flex: 1
    }
  }, React.createElement("option", {
    value: "EG"
  }, "Ethylene Glycol (MEG)"), React.createElement("option", {
    value: "PG"
  }, "Propylene Glycol (MPG)")), React.createElement(FloatInput, {
    value: glyPct,
    onChange: setGlyPct,
    min: 0,
    max: 60,
    step: 1
  }))), useGly && React.createElement("div", {
    className: "irow",
    style: {
      borderColor: 'rgba(180,145,60,.2)',
      background: 'rgba(180,145,60,.06)',
      marginBottom: 14
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "Type"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#0ea5e9',
      fontSize: 13
    }
  }, glyType === 'EG' ? 'Ethylene' : 'Propylene', " ", glyPct, "%")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "cp"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#0ea5e9'
    }
  }, fmt(gp.cp, 3)), React.createElement("span", {
    className: "iu"
  }, " kJ/kg\xB7K")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "rho"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#0ea5e9'
    }
  }, fmt(gp.rho, 3)), React.createElement("span", {
    className: "iu"
  }, " kg/L")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "freeze"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#0ea5e9'
    }
  }, fmt(gp.freeze, 1)), React.createElement("span", {
    className: "iu"
  }, " \xB0C"))), React.createElement("div", {
    className: "three"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "T Inlet"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: wTi,
    onChange: setWTi,
    min: -30,
    max: 50,
    step: 0.0001
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "T Outlet"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: wTo,
    onChange: setWTo,
    min: -30,
    max: 50,
    step: 0.0001
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Flow"), React.createElement("span", {
    className: "utag"
  }, "L/s")), React.createElement(FloatInput, {
    value: wF,
    onChange: setWF,
    min: 0.001,
    max: 100,
    step: 0.0001
  }))), dTw < 2 && React.createElement("div", {
    className: "warn"
  }, "\u26A0 dT = ", fmt(dTw, 4), " K \u2014 very low. Sensor uncertainty causes ~", fmt(0.1 / Math.max(dTw, 0.01) * 100, 0), "% Q error."), dTw >= 2 && dTw < 3 && React.createElement("div", {
    className: "warn",
    style: {
      background: 'rgba(251,191,36,.08)',
      border: '1px solid rgba(251,191,36,.2)',
      color: '#fbbf24'
    }
  }, "\u26A0 dT = ", fmt(dTw, 4), " K \u2014 low. Verify sensor accuracy."), React.createElement("div", {
    className: "irow",
    style: {
      borderColor: 'rgba(180,145,60,.25)',
      background: 'rgba(180,145,60,.06)',
      marginTop: 10
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "dT"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#0ea5e9'
    }
  }, fmt(dTw, 4)), React.createElement("span", {
    className: "iu"
  }, " K")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "m"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#0ea5e9'
    }
  }, fmt(mW, 4)), React.createElement("span", {
    className: "iu"
  }, " kg/s")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "Q liquid"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#0ea5e9',
      fontSize: 18
    }
  }, fmt(Qw, 4)), React.createElement("span", {
    className: "iu"
  }, " kW")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "BTU/h"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#0ea5e9'
    }
  }, fmt(Qw * 3412.14, 0)))), React.createElement("div", {
    className: "field",
    style: {
      marginTop: 14
    }
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Compressor Power P_el"), React.createElement("span", {
    className: "utag"
  }, "kW")), React.createElement(FloatInput, {
    value: pw,
    onChange: setPw,
    min: 0.01,
    max: 500,
    step: 0.0001
  }))), React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(249,115,22,.2)'
    }
  }, React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: '#f97316',
      marginBottom: 0
    }
  }, "Air Side \u2014 Verification (Heat Rejection)"), React.createElement("button", {
    onClick: resetAir,
    style: {
      padding: '5px 12px',
      borderRadius: 6,
      fontSize: 10,
      cursor: 'pointer',
      fontFamily: 'DM Mono,monospace',
      border: '1px solid rgba(249,115,22,.3)',
      background: 'rgba(249,115,22,.08)',
      color: '#f97316'
    }
  }, "Reset to AUTO")), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#64748b',
      marginBottom: 12
    }
  }, "Fields marked AUTO are estimated from liquid Q. Edit to override \u2014 will not affect liquid side."), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#fbbf24',
      textTransform: 'uppercase',
      letterSpacing: '.1em',
      marginBottom: 8
    }
  }, "Entering Ambient Air"), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Ambient DB"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: oDB,
    onChange: setODB,
    min: mn,
    max: unit === 'F' ? 140 : 60,
    step: 0.0001,
    style: {
      borderColor: 'rgba(251,191,36,.4)'
    }
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Ambient RH"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: oRH,
    onChange: setORH,
    min: 0,
    max: 100,
    step: 0.0001,
    style: {
      borderColor: 'rgba(251,191,36,.4)'
    }
  }))), React.createElement("div", {
    className: "irow",
    style: {
      borderColor: 'rgba(251,191,36,.2)',
      background: 'rgba(251,191,36,.05)',
      marginBottom: 14
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "WB"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, d(wBE, 4), " deg ", unit)), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "h_inn"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, fmt(hE, 4)), React.createElement("span", {
    className: "iu"
  }, " kJ/kg")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "W"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, fmt(WE * 1000, 4)), React.createElement("span", {
    className: "iu"
  }, " g/kg"))), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#f97316',
      textTransform: 'uppercase',
      letterSpacing: '.1em',
      marginBottom: 8
    }
  }, "Leaving Air (warmer \u2014 heat rejection)"), React.createElement("div", {
    className: "three"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Leaving DB"), React.createElement("span", {
    className: "badge",
    style: {
      background: lDB === null ? 'rgba(34,197,94,.15)' : 'rgba(251,191,36,.15)',
      color: lDB === null ? '#22c55e' : '#fbbf24',
      marginLeft: 4
    }
  }, lDB === null ? 'AUTO' : 'MANUAL')), React.createElement(FloatInput, {
    value: lDB === null ? fmt(F(lDBuse), 4) : lDBm,
    onChange: v => {
      setLDB(true);
      setLDBm(v);
    },
    min: mn,
    max: mx,
    step: 0.0001,
    style: {
      borderColor: 'rgba(249,115,22,.4)'
    }
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Leaving RH"), React.createElement("span", {
    className: "badge",
    style: {
      background: lRH === null ? 'rgba(34,197,94,.15)' : 'rgba(251,191,36,.15)',
      color: lRH === null ? '#22c55e' : '#fbbf24',
      marginLeft: 4
    }
  }, lRH === null ? 'AUTO' : 'MANUAL')), React.createElement(FloatInput, {
    value: lRH === null ? lRHuse : lRHm,
    onChange: v => {
      setLRH(true);
      setLRHm(v);
    },
    min: 0,
    max: 100,
    step: 0.0001,
    style: {
      borderColor: 'rgba(249,115,22,.4)'
    }
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Airflow"), React.createElement("span", {
    className: "badge",
    style: {
      background: af === null ? 'rgba(34,197,94,.15)' : 'rgba(251,191,36,.15)',
      color: af === null ? '#22c55e' : '#fbbf24',
      marginLeft: 4
    }
  }, af === null ? 'AUTO' : 'MANUAL')), React.createElement(FloatInput, {
    value: af === null ? fmt(afUse, 1) : afm,
    onChange: v => {
      setAf(true);
      setAfm(v);
    },
    min: 10,
    max: 50000,
    step: 1,
    style: {
      borderColor: 'rgba(249,115,22,.4)'
    }
  }))), lRHuse > 98 && React.createElement("div", {
    className: "warn"
  }, "\u26A0 Leaving RH > 98% \u2014 condensation on sensor possible."), lRHuse > 95 && lRHuse <= 98 && React.createElement("div", {
    className: "warn",
    style: {
      background: 'rgba(251,191,36,.08)',
      border: '1px solid rgba(251,191,36,.2)',
      color: '#fbbf24'
    }
  }, "\u26A0 Leaving RH > 95% \u2014 near saturation."), lDBuse <= oC && React.createElement("div", {
    className: "warn"
  }, "\u26A0 Leaving DB should be warmer than ambient in heat rejection mode."), React.createElement("div", {
    className: "irow",
    style: {
      borderColor: 'rgba(249,115,22,.2)',
      background: 'rgba(249,115,22,.06)',
      marginTop: 10
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "WB_ut"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#f97316'
    }
  }, d(wBL, 4), " deg ", unit)), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "h_ut"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#f97316'
    }
  }, fmt(hL, 4)), React.createElement("span", {
    className: "iu"
  }, " kJ/kg")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "\u0394h"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#f97316'
    }
  }, fmt(dh, 4)), React.createElement("span", {
    className: "iu"
  }, " kJ/kg")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "\u1E41_air"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#f97316'
    }
  }, fmt(mA, 4)), React.createElement("span", {
    className: "iu"
  }, " kg/s")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "Q_air"), React.createElement("span", {
    className: "iv",
    style: {
      color: _airSuppressed ? '#94a3b8' : '#f97316'
    }
  }, _airSuppressed ? 'unavailable' : fmt(Qa, 4)), React.createElement("span", {
    className: "iu"
  }, " kW")))), React.createElement("div", {
    className: "card",
    style: {
      borderColor: _airSuppressed ? _disp.borderColor : isAutoAir ? 'rgba(125,211,252,.3)' : Math.abs(bal) > 8 ? 'rgba(248,113,113,.4)' : Math.abs(bal) > 3 ? 'rgba(251,191,36,.4)' : 'rgba(34,197,94,.3)'
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: _airSuppressed ? _disp.color : isAutoAir ? '#7dd3fc' : Math.abs(bal) > 8 ? '#f87171' : Math.abs(bal) > 3 ? '#fbbf24' : '#22c55e'
    }
  }, _airSuppressed ? 'Air Side — WITHHELD' : isAutoAir ? 'Air Side — Estimated from Liquid Capacity' : 'Energy Balance — Independent Air Measurement'), _airSuppressed && React.createElement("div", {
    "data-air-status": "withheld",
    "data-air-reason": _disp.reasonCode,
    style: {
      background: 'rgba(248,113,113,.10)',
      border: '1px solid rgba(248,113,113,.35)',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 12,
      fontSize: 11,
      color: '#fca5a5',
      lineHeight: 1.5
    }
  }, React.createElement("strong", null, "Status: WITHHELD \u2014 Air-side result unavailable."), " Reason: ", _disp.reasonMessage, ". ", React.createElement("span", {
    style: {
      opacity: .75
    }
  }, "Reason code: ", _disp.reasonCode), ". Liquid-side capacity (Q Liquid) is unaffected."), !_airSuppressed && isAutoAir && React.createElement("div", {
    style: {
      background: 'rgba(125,211,252,.08)',
      border: '1px solid rgba(125,211,252,.25)',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 12,
      fontSize: 11,
      color: '#7dd3fc',
      lineHeight: 1.5
    }
  }, "\u2139 The air-side values below are ", React.createElement("strong", null, "estimated from the liquid capacity"), ", not independently measured. This is a synthetic expected condition \u2014 it cannot verify the measurement. To perform a real energy-balance check, enter measured leaving air DB, RH and airflow (each field switches to MANUAL)."), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 12,
      marginBottom: 12
    }
  }, React.createElement("div", {
    style: {
      background: 'rgba(180,145,60,.08)',
      borderRadius: 10,
      padding: '12px 14px',
      border: '1px solid rgba(180,145,60,.2)'
    }
  }, React.createElement("div", {
    className: "rn"
  }, "Q Liquid (primary)"), React.createElement("div", {
    className: "rv",
    style: {
      color: '#0ea5e9'
    }
  }, fmt(Qw, 4), " kW"), React.createElement("div", {
    className: "ru"
  }, fmt(Qw * 3412.14, 0), " BTU/h")), React.createElement("div", {
    style: {
      background: 'rgba(249,115,22,.08)',
      borderRadius: 10,
      padding: '12px 14px',
      border: '1px solid rgba(249,115,22,.2)'
    }
  }, React.createElement("div", {
    className: "rn"
  }, "Q Air ", _airSuppressed ? '(withheld)' : isAutoAir ? '(estimated)' : '(measured)'), React.createElement("div", {
    className: "rv",
    style: {
      color: _airSuppressed ? '#94a3b8' : '#f97316'
    }
  }, _airSuppressed ? 'unavailable' : fmt(Qa, 4) + ' kW'), React.createElement("div", {
    className: "ru"
  }, _airSuppressed ? 'pressure missing/invalid' : isAutoAir ? 'synthetic — not measured' : isFullyManualAir ? 'independent measurement' : 'partial manual')), React.createElement("div", {
    "data-air-balance-cell": "1",
    style: {
      background: _airSuppressed ? 'rgba(148,163,184,.10)' : !isFullyManualAir ? 'rgba(125,211,252,.08)' : Math.abs(balVsReject) > 8 ? 'rgba(248,113,113,.08)' : Math.abs(balVsReject) > 3 ? 'rgba(251,191,36,.08)' : 'rgba(34,197,94,.08)',
      borderRadius: 10,
      padding: '12px 14px',
      border: `1px solid ${_airSuppressed ? 'rgba(148,163,184,.4)' : !isFullyManualAir ? 'rgba(125,211,252,.3)' : Math.abs(balVsReject) > 8 ? 'rgba(248,113,113,.3)' : Math.abs(balVsReject) > 3 ? 'rgba(251,191,36,.3)' : 'rgba(34,197,94,.3)'}`
    }
  }, React.createElement("div", {
    className: "rn"
  }, "Status"), React.createElement("div", {
    className: "rv",
    style: {
      color: _disp.color
    }
  }, _disp.statusLabel), React.createElement("div", {
    className: "ru"
  }, _airSuppressed ? 'air-side withheld' : isAutoAir ? 'no check possible' : !isFullyManualAir ? 'incomplete' : Math.abs(balVsReject) > 8 ? '❌ Check measurements' : Math.abs(balVsReject) > 3 ? '⚠ Acceptable' : '✅ Good'))), !_airSuppressed && !isAutoAir && !isFullyManualAir && React.createElement("div", {
    style: {
      background: 'rgba(251,191,36,.08)',
      border: '1px solid rgba(251,191,36,.25)',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 11,
      color: '#fbbf24',
      lineHeight: 1.5
    }
  }, "\u26A0 Incomplete air-side measurement. Some fields are still AUTO (estimated). A valid energy-balance check requires all three air inputs \u2014 leaving DB, leaving RH, and airflow \u2014 to be independently measured. Switch the remaining AUTO fields to manual entry, or treat the air side as estimate-only."), !_airSuppressed && isFullyManualAir && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "bar-l"
  }, React.createElement("span", {
    style: {
      color: '#0ea5e9'
    }
  }, "Heat rejection target"), React.createElement("span", {
    style: {
      color: Math.abs(balVsReject) > 8 ? '#f87171' : Math.abs(balVsReject) > 3 ? '#fbbf24' : '#22c55e'
    }
  }, fmt(Math.abs(balVsReject), 2), "% deviation"), React.createElement("span", {
    style: {
      color: '#f97316'
    }
  }, "Measured Air Q")), React.createElement("div", {
    className: "bar-t"
  }, React.createElement("div", {
    className: "bar-f",
    style: {
      width: Math.min(100, Math.abs(balVsReject) / 15 * 100) + '%',
      background: Math.abs(balVsReject) > 8 ? '#f87171' : Math.abs(balVsReject) > 3 ? '#fbbf24' : '#22c55e'
    }
  })), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 8,
      lineHeight: 1.5
    }
  }, "Condenser heat rejection: measured air Q (", fmt(Qa, 3), " kW) compared against the physical expectation Q_liquid + P_el = ", fmt(Qexpected, 3), " kW. Deviation ", fmt(Math.abs(balVsReject), 1), "% (", Math.abs(balVsReject) > 8 ? '❌ check measurements' : Math.abs(balVsReject) > 3 ? '⚠ acceptable' : '✅ good agreement', ").")), !isAutoAir && !isFullyManualAir && React.createElement("div", {
    style: {
      background: 'rgba(251,191,36,.08)',
      border: '1px solid rgba(251,191,36,.25)',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 11,
      color: '#fbbf24',
      lineHeight: 1.5
    }
  }, "Partial measurement: some air-side fields are manual and some auto-estimated. A valid independent energy balance requires ALL air-side inputs (leaving DB, RH and airflow) to be measured. No balance shown until complete.")), React.createElement(RefSec, {
    unit: unit,
    refr: ref,
    setRefr: setRef,
    sP: sP,
    setSP: setSP,
    dP: dP,
    setDP: setDP,
    sT: sT,
    setST: setST,
    liqT: liqT,
    setLiqT: setLiqT,
    pAtm: pAtm / 1000
  }), React.createElement("div", {
    className: "res"
  }, React.createElement("div", {
    className: "rl2"
  }, "Results"), React.createElement("div", {
    className: "rg"
  }, React.createElement("div", {
    className: "ri big"
  }, React.createElement("div", {
    className: "rn"
  }, "Q Liquid \u2014 Primary Cooling Output"), React.createElement("div", {
    className: "rv"
  }, fmt(Qw, 4), " kW"), React.createElement("div", {
    className: "ru"
  }, fmt(Qw * 3412.14, 0), " BTU/h \u2014 ", fmt(Qw / 3.517, 4), " tons")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "Cooling COP (W/W)"), React.createElement("div", {
    className: "rv",
    style: {
      color: ec
    }
  }, fmt(eer, 4)), React.createElement("div", {
    className: "ru"
  }, "Q_liquid / P_electrical \xB7 confirm what P includes")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "dT liquid"), React.createElement("div", {
    className: "rv"
  }, fmt(dTw, 4)), React.createElement("div", {
    className: "ru"
  }, "K")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "Flow"), React.createElement("div", {
    className: "rv"
  }, fmt(wF, 4)), React.createElement("div", {
    className: "ru"
  }, "L/s")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "Q Air (verif)"), React.createElement("div", {
    className: "rv",
    style: {
      color: '#f97316'
    }
  }, fmt(Qa, 4)), React.createElement("div", {
    className: "ru"
  }, "kW heat rejection")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "Balance"), React.createElement("div", {
    className: "rv",
    style: {
      color: Math.abs(bal) > 8 ? '#f87171' : Math.abs(bal) > 3 ? '#fbbf24' : '#22c55e'
    }
  }, fmt(Math.abs(bal), 2), "%"), React.createElement("div", {
    className: "ru"
  }, "deviation"))), React.createElement("div", {
    className: "fml"
  }, useGly ? React.createElement(React.Fragment, null, React.createElement("strong", null, "Q"), " = m \xD7 cp \xD7 dT = ", fmt(wF, 4), " \xD7 ", fmt(gp.rho, 3), " \xD7 ", fmt(gp.cp, 3), " \xD7 ", fmt(dTw, 4), " = ", React.createElement("strong", null, fmt(Qw, 4), " kW"), React.createElement("br", null)) : React.createElement(React.Fragment, null, React.createElement("strong", null, "Q"), " = 4.18 \xD7 V(L/s) \xD7 dT = 4.18 \xD7 ", fmt(wF, 4), " \xD7 ", fmt(dTw, 4), " = ", React.createElement("strong", null, fmt(Qw, 4), " kW"), React.createElement("br", null)), React.createElement("strong", null, "Cooling COP"), " = ", fmt(Qw, 4), " / ", fmt(pw, 4), " = ", React.createElement("strong", null, fmt(eer, 4), " W/W"), React.createElement("br", null), React.createElement("span", {
    style: {
      fontSize: 9,
      color: '#8a7a65'
    }
  }, "Boundary: COP uses whatever electrical input you metered into P. Identify it (whole unit / compressor / system) when reporting."))), React.createElement(SteadyStateChecker, null), React.createElement(UncertaintyPanel, {
    mode: "al",
    Q: Qw,
    EER: eer,
    params: {
      dT: dTw
    }
  }), React.createElement(GuideAL, null), React.createElement("div", {
    className: "brow no-print"
  }, React.createElement("button", {
    className: "bt bt-g",
    onClick: save
  }, "Save Measurement"), React.createElement("button", {
    className: "bt bt-b",
    onClick: () => window.print()
  }, "Print / PDF")));
}
function LiqLiq({
  unit,
  job,
  uid,
  setLog,
  setShowLog,
  pAtm = 101500,
  measDate = ""
}) {
  const [cFt, setCFt] = useState("water");
  const [cGp, setCGp] = useState(30);
  const [cGlyKind, setCGlyKind] = useState('EG');
  const [cTi, setCTi] = useState(7);
  const [cTo, setCTo] = useState(12);
  const [cF, setCF] = useState(0.50);
  const [hFt, setHFt] = useState("water");
  const [hGp, setHGp] = useState(30);
  const [hGlyKind, setHGlyKind] = useState('EG');
  const [hTi, setHTi] = useState(40);
  const [hTo, setHTo] = useState(35);
  const [hF, setHF] = useState(0.60);
  const [pw, setPw] = useState(1.2);
  const [ref, setRef] = useState("R32");
  const [sP, setSP] = useState(8);
  const [dP, setDP] = useState(28);
  const [sT, setST] = useState(15);
  const [liqT, setLiqT] = useState(35);
  const C = v => unit === "F" ? (v - 32) * 5 / 9 : v;
  const F = v => unit === "F" ? v * 9 / 5 + 32 : v;
  const cTiC = C(cTi),
    cToC = C(cTo),
    hTiC = C(hTi),
    hToC = C(hTo);
  const _cMeanT = (cTiC + cToC) / 2,
    _hMeanT = (hTiC + hToC) / 2;
  const _cGly = cFt === "glycol" ? glyPropsTD(cGlyKind || 'EG', cGp, _cMeanT) : null;
  const _hGly = hFt === "glycol" ? glyPropsTD(hGlyKind || 'EG', hGp, _hMeanT) : null;
  const cpC = _cGly ? _cGly.cp : CP,
    rC = _cGly ? _cGly.rho : 1.0;
  const cpH = _hGly ? _hGly.cp : CP,
    rH = _hGly ? _hGly.rho : 1.0;
  const mC = cF * rC,
    mH = hF * rH;
  const Qc = mC * cpC * Math.abs(cToC - cTiC),
    Qh = mH * cpH * Math.abs(hTiC - hToC);
  const pTot = pw + (typeof pFanLL !== 'undefined' ? pFanLL : 0);
  const eer = pTot > 0 ? Qc / pTot : 0;
  const copHeat = pTot > 0 ? Qh / pTot : 0;
  const residual = Qh - Qc - pTot;
  const balDenom = Math.max(Math.abs(Qh), Math.abs(Qc + pTot));
  const bal = balDenom > 0 ? residual / balDenom * 100 : 0;
  const ec = eCol(eer);
  function save() {
    const _rs = refrigState(ref, sP, dP, unit === "F" ? C(sT) : sT, unit === "F" ? C(liqT) : liqT, pAtm / 1000);
    const tE = _rs ? _rs.tE : null,
      sh = _rs ? _rs.sh : null,
      tCond = _rs ? _rs.tC : null;
    setLog(p => [{
      id: Date.now(),
      date: measDate || new Date().toLocaleString(),
      mode: 'Liq/Liq',
      job: job || "--",
      uid: uid || "--",
      ref,
      t1: fmt(F(cTiC), 2),
      t2: fmt(F(cToC), 2),
      wb1: "--",
      wb2: "--",
      rh1: "--",
      rh2: "--",
      wTi: fmt(F(hTiC), 2),
      wTo: fmt(F(hToC), 2),
      wF: fmt(hF, 4),
      af: "--",
      pw: fmt(pw, 4),
      Q: fmt(Qc, 4),
      Qw: fmt(Qh, 4),
      eer: fmt(eer, 4),
      tE: tE != null ? fmt(tE, 4) : "--",
      sh: sh != null ? fmt(sh, 4) : "--",
      tC: tCond != null ? fmt(tCond, 4) : "--",
      sP: fmt(sP, 4),
      dP: fmt(dP, 4),
      unit
    }, ...p]);
    setShowLog(true);
  }
  const _dTc = Math.abs(cToC - cTiC),
    _dTh = Math.abs(hToC - hTiC);
  const _issues = validateInputs('ll', {
    dTc: _dTc,
    dTh: _dTh,
    Qc,
    Qh,
    cF: cF,
    hF: hF,
    pw,
    eer
  });
  return React.createElement(React.Fragment, null, React.createElement(ValidationBanner, {
    issues: _issues
  }), React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(201,168,76,.25)'
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: '#d4a843'
    }
  }, "Cold Side - Chilled Water / Glycol"), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, "Fluid Type"), React.createElement("select", {
    value: cFt,
    onChange: e => setCFt(e.target.value)
  }, React.createElement("option", {
    value: "water"
  }, "Water"), React.createElement("option", {
    value: "glycol"
  }, "Ethylene Glycol / Water"))), cFt === "glycol" && React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Glycol Concentration"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: cGp,
    onChange: setCGp,
    min: 0,
    max: 60,
    step: 1
  }), React.createElement("select", {
    value: cGlyKind,
    onChange: e => setCGlyKind(e.target.value),
    style: {
      width: '100%',
      marginTop: 6,
      padding: '7px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 12
    }
  }, React.createElement("option", {
    value: "EG"
  }, "Ethylene glycol (EG)"), React.createElement("option", {
    value: "PG"
  }, "Propylene glycol (PG)")), React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#475569',
      marginTop: 5
    }
  }, "cp = ", fmt(cpC, 4), " kJ/kg\xB7K \xB7 \u03C1 = ", fmt(rC, 4), " kg/L @ ", fmt(_cMeanT, 1), "\xB0C mean")), React.createElement("div", {
    className: "three"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "T Inlet"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: cTi,
    onChange: setCTi,
    min: -30,
    max: 50,
    step: 0.0001,
    style: {
      borderColor: 'rgba(201,168,76,.4)'
    }
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "T Outlet"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: cTo,
    onChange: setCTo,
    min: -30,
    max: 50,
    step: 0.0001,
    style: {
      borderColor: 'rgba(201,168,76,.4)'
    }
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Flow"), React.createElement("span", {
    className: "utag"
  }, "L/s")), React.createElement(FloatInput, {
    value: cF,
    onChange: setCF,
    min: 0.001,
    max: 100,
    step: 0.0001,
    style: {
      borderColor: 'rgba(201,168,76,.4)'
    }
  }))), React.createElement("div", {
    className: "irow",
    style: {
      borderColor: 'rgba(201,168,76,.25)',
      background: 'rgba(201,168,76,.05)'
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "dT"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#d4a843'
    }
  }, fmt(Math.abs(cToC - cTiC), 2)), React.createElement("span", {
    className: "iu"
  }, " K")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "m"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#d4a843'
    }
  }, fmt(mC, 4)), React.createElement("span", {
    className: "iu"
  }, " kg/s")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "Q cold"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#d4a843'
    }
  }, fmt(Qc, 4)), React.createElement("span", {
    className: "iu"
  }, " kW")))), React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(251,191,36,.25)'
    }
  }, React.createElement("div", {
    className: "slbl",
    style: {
      color: '#fbbf24'
    }
  }, "Hot Side - Condenser Water / Glycol"), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, "Fluid Type"), React.createElement("select", {
    value: hFt,
    onChange: e => setHFt(e.target.value)
  }, React.createElement("option", {
    value: "water"
  }, "Water"), React.createElement("option", {
    value: "glycol"
  }, "Ethylene Glycol / Water"))), hFt === "glycol" && React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Glycol Concentration"), React.createElement("span", {
    className: "utag"
  }, "%")), React.createElement(FloatInput, {
    value: hGp,
    onChange: setHGp,
    min: 0,
    max: 60,
    step: 1
  }), React.createElement("select", {
    value: hGlyKind,
    onChange: e => setHGlyKind(e.target.value),
    style: {
      width: '100%',
      marginTop: 6,
      padding: '7px',
      background: 'rgba(0,0,0,.2)',
      color: '#f5f0e8',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      fontSize: 12
    }
  }, React.createElement("option", {
    value: "EG"
  }, "Ethylene glycol (EG)"), React.createElement("option", {
    value: "PG"
  }, "Propylene glycol (PG)")), React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#475569',
      marginTop: 5
    }
  }, "cp = ", fmt(cpH, 4), " kJ/kg\xB7K \xB7 \u03C1 = ", fmt(rH, 4), " kg/L @ ", fmt(_hMeanT, 1), "\xB0C mean")), React.createElement("div", {
    className: "three"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "T Inlet"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: hTi,
    onChange: setHTi,
    min: -30,
    max: 80,
    step: 0.0001,
    style: {
      borderColor: 'rgba(251,191,36,.4)'
    }
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "T Outlet"), React.createElement("span", {
    className: "utag"
  }, "deg ", unit)), React.createElement(FloatInput, {
    value: hTo,
    onChange: setHTo,
    min: -30,
    max: 80,
    step: 0.0001,
    style: {
      borderColor: 'rgba(251,191,36,.4)'
    }
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Flow"), React.createElement("span", {
    className: "utag"
  }, "L/s")), React.createElement(FloatInput, {
    value: hF,
    onChange: setHF,
    min: 0.001,
    max: 100,
    step: 0.0001,
    style: {
      borderColor: 'rgba(251,191,36,.4)'
    }
  }))), React.createElement("div", {
    className: "irow",
    style: {
      borderColor: 'rgba(251,191,36,.25)',
      background: 'rgba(251,191,36,.05)'
    }
  }, React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "dT"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, fmt(Math.abs(hTiC - hToC), 2)), React.createElement("span", {
    className: "iu"
  }, " K")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "m"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, fmt(mH, 4)), React.createElement("span", {
    className: "iu"
  }, " kg/s")), React.createElement("span", null, React.createElement("span", {
    className: "ik"
  }, "Q hot"), React.createElement("span", {
    className: "iv",
    style: {
      color: '#fbbf24'
    }
  }, fmt(Qh, 4)), React.createElement("span", {
    className: "iu"
  }, " kW")))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    className: "slbl"
  }, "Electrical Input"), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Compressor Power"), React.createElement("span", {
    className: "utag"
  }, "kW")), React.createElement(FloatInput, {
    value: pw,
    onChange: setPw,
    min: 0.1,
    max: 500,
    step: 0.05
  })), React.createElement("div", {
    className: "bar-l"
  }, React.createElement("span", null, "COP: ", React.createElement("strong", {
    style: {
      color: ec
    }
  }, fmt(eer, 4), " - ", eLbl(eer)))), React.createElement("div", {
    className: "bar-t"
  }, React.createElement("div", {
    className: "bar-f",
    style: {
      width: Math.min(100, eer / 6 * 100) + '%',
      background: ec
    }
  }))), React.createElement(RefSec, {
    unit: unit,
    refr: ref,
    setRefr: setRef,
    sP: sP,
    setSP: setSP,
    dP: dP,
    setDP: setDP,
    sT: sT,
    setST: setST,
    liqT: liqT,
    setLiqT: setLiqT,
    pAtm: pAtm / 1000
  }), React.createElement("div", {
    className: "res"
  }, React.createElement("div", {
    className: "rl2"
  }, "Results"), React.createElement("div", {
    className: "rg"
  }, React.createElement("div", {
    className: "ri big"
  }, React.createElement("div", {
    className: "rn"
  }, "Q_cold - Cooling Output"), React.createElement("div", {
    className: "rv"
  }, fmt(Qc, 4), " kW"), React.createElement("div", {
    className: "ru"
  }, fmt(Qc * 3412.14, 4), " BTU/h - ", fmt(Qc / 3.517, 4), " tons")), React.createElement("div", {
    className: "ri",
    style: {
      background: Qh < Qc ? 'rgba(248,113,113,.15)' : Math.abs(bal) > 10 ? 'rgba(248,113,113,.06)' : 'rgba(34,197,94,.06)',
      border: Qh < Qc ? '2px solid #f87171' : Math.abs(bal) > 10 ? '1px solid rgba(248,113,113,.2)' : '1px solid rgba(34,197,94,.2)'
    }
  }, React.createElement("div", {
    className: "rn"
  }, "Q_hot - Condenser"), React.createElement("div", {
    className: "rv",
    style: {
      fontSize: 22,
      color: Qh < Qc ? '#f87171' : Math.abs(bal) > 10 ? '#f87171' : '#22c55e'
    }
  }, fmt(Qh, 4), " kW"), React.createElement("div", {
    className: "ru"
  }, Qh < Qc ? 'IMPOSSIBLE: Q_hot < Q_cold!' : Math.abs(bal) > 10 ? 'Balance error: ' + fmt(Math.abs(bal), 2) + '%' : 'OK: ' + fmt(Math.abs(bal), 2) + '% dev')), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "COP cooling"), React.createElement("div", {
    className: "rv",
    style: {
      color: ec
    }
  }, fmt(eer, 4)), React.createElement("div", {
    className: "ru"
  }, "Q_cold / P_el")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "COP heating"), React.createElement("div", {
    className: "rv",
    style: {
      color: eCol(copHeat)
    }
  }, fmt(copHeat, 4)), React.createElement("div", {
    className: "ru"
  }, "Q_hot / P_el")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "Residual R"), React.createElement("div", {
    className: "rv",
    style: {
      color: Math.abs(bal) > 8 ? '#f87171' : Math.abs(bal) > 3 ? '#fbbf24' : '#22c55e'
    }
  }, fmt(residual, 4)), React.createElement("div", {
    className: "ru"
  }, "kW = Q_hot\u2212Q_cold\u2212P_el")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "P_el"), React.createElement("div", {
    className: "rv"
  }, fmt(pw, 4)), React.createElement("div", {
    className: "ru"
  }, "kW")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "dT cold"), React.createElement("div", {
    className: "rv"
  }, fmt(Math.abs(cToC - cTiC), 2)), React.createElement("div", {
    className: "ru"
  }, "K")), React.createElement("div", {
    className: "ri"
  }, React.createElement("div", {
    className: "rn"
  }, "dT hot"), React.createElement("div", {
    className: "rv"
  }, fmt(Math.abs(hTiC - hToC), 2)), React.createElement("div", {
    className: "ru"
  }, "K"))), Math.abs(cToC - cTiC) < 2 && React.createElement("div", {
    className: "warn",
    style: {
      marginBottom: 8
    }
  }, "\u26A0 Cold side dT = ", fmt(Math.abs(cToC - cTiC), 4), " K \u2014 very low. Sensor uncertainty causes ", fmt(0.1 / Math.abs(cToC - cTiC) * 100, 0), "% Q error."), Math.abs(hTiC - hToC) < 2 && React.createElement("div", {
    className: "warn",
    style: {
      marginBottom: 8
    }
  }, "\u26A0 Hot side dT = ", fmt(Math.abs(hTiC - hToC), 4), " K \u2014 very low. Sensor uncertainty causes ", fmt(0.1 / Math.abs(hTiC - hToC) * 100, 0), "% Q error."), Qh < Qc && React.createElement("div", {
    className: "warn",
    style: {
      marginBottom: 8,
      background: 'rgba(248,113,113,.12)',
      border: '2px solid rgba(248,113,113,.4)'
    }
  }, "\u26A0 IMPOSSIBLE: Q_hot (", fmt(Qh, 2), " kW) < Q_cold (", fmt(Qc, 2), " kW). Check flow meters and temperature sensors on both sides."), React.createElement("div", {
    className: "fml"
  }, React.createElement("strong", null, "Q_cold"), " = V(L/s) x rho x cp x dT = ", fmt(cF, 4), " x ", fmt(rC, 4), " x ", fmt(cpC, 4), " x ", fmt(Math.abs(cToC - cTiC), 2), " = ", React.createElement("strong", null, fmt(Qc, 4), " kW"), React.createElement("br", null), React.createElement("strong", null, "Q_hot"), " = ", fmt(mH, 4), " x ", fmt(cpH, 4), " x ", fmt(Math.abs(hTiC - hToC), 2), " = ", React.createElement("strong", null, fmt(Qh, 4), " kW"), React.createElement("br", null), React.createElement("strong", null, "COP"), " = ", fmt(Qc, 4), " / ", fmt(pw, 4), " = ", React.createElement("strong", null, fmt(eer, 4)))), React.createElement(SteadyStateChecker, null), React.createElement(UncertaintyPanel, {
    mode: "ll",
    Q: Qc,
    EER: eer,
    params: {
      dT: Math.abs(cToC - cTiC)
    }
  }), React.createElement(GuideLL, null), React.createElement("div", {
    className: "brow no-print"
  }, React.createElement("button", {
    className: "bt bt-g",
    onClick: save
  }, "Save Measurement"), React.createElement("button", {
    className: "bt bt-b",
    onClick: () => window.print()
  }, "Print / PDF")));
}
function GuideAA() {
  return React.createElement("div", null, React.createElement("button", {
    id: "guide-aa-btn",
    className: "guide-btn",
    onClick: () => toggleGuide('guide-aa')
  }, React.createElement("span", null, "Measurement Guide - Air / Air \xA0", React.createElement("span", {
    style: {
      fontSize: 10,
      opacity: .6
    }
  }, "accuracy tips for enthalpy calculation")), React.createElement("span", {
    className: "arr"
  }, "v")), React.createElement("div", {
    id: "guide-aa",
    className: "guide-panel"
  }, React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "gs gs-amber"
  }, "Entering air (Inn)"), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(245,158,11,.2)',
      color: '#fcd34d'
    }
  }, "1"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Dry-Bulb (DB)"), React.createElement("p", null, "PT100 or NTC probe, duct center, 30-50 cm from bends. Wait 3-5 min. Take 3 readings and average. Never use IR gun."))), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(245,158,11,.2)',
      color: '#fcd34d'
    }
  }, "2"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Relative Humidity (RH)"), React.createElement("p", null, "Calibrated capacitive hygrometer. Return air 40-60% RH. Wait 3-5 min. Cross-check with sling psychrometer if possible.")))), React.createElement("div", null, React.createElement("div", {
    className: "gs gs-teal"
  }, "Leaving air (Ut)"), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(20,184,166,.2)',
      color: '#5eead4'
    }
  }, "3"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Dry-Bulb (DB)"), React.createElement("p", null, "10-20 cm from outlet, center of airstream. Avoid condensate zone below coil. PT100 only. Wait min 5 min."))), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(20,184,166,.2)',
      color: '#5eead4'
    }
  }, "4"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Relative Humidity (RH)"), React.createElement("p", null, "Supply air is 85-95% RH - hardest to measure. Allow 5-10 min stabilisation. Avoid water droplets on sensor. Best: measure WB with sling psychrometer and convert."))))), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14,
      marginTop: 10
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "gs gs-blue"
  }, "Airflow \u2014 three methods, best first"), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(34,197,94,.2)',
      color: '#22c55e'
    }
  }, "5a"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Best \u2014 duct traverse (if a straight duct exists)"), React.createElement("p", null, "If the unit connects to ductwork with a straight run (\u22657.5 duct-diameters upstream, \u22653 downstream of any bend or damper), use the multi-point traverse panel below. It applies the log-Tchebycheff / equal-area rule and is the most accurate field method. Prefer this whenever a duct is accessible."))), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(125,211,252,.2)',
      color: '#7dd3fc'
    }
  }, "5b"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Field standard \u2014 capture hood / funnel (no duct)"), React.createElement("p", null, "On a free-blowing indoor unit (split, cassette, console) there is no duct to traverse and a sensor held in front of the grille reads a turbulent mix of supply and room air \u2014 easily 20\u201330% wrong. Build a funnel/hood that captures ALL the air and channels it through a known cross-section where one clean velocity reading represents the whole flow. Sizing is below. Measured against the liquid side or a balometer, a well-built hood lands within a few percent."))), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(251,191,36,.2)',
      color: '#fbbf24'
    }
  }, "5c"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Last resort \u2014 free sensor reading (no duct, no hood)"), React.createElement("p", null, "If neither is possible, grid at least 5 points evenly across the grille face, average them, and multiply by the grille free-area factor (0.65\u20130.80 depending on louvre blockage). Treat the result as \xB115\u201325%: enter that figure in the GUM uncertainty panel so the capacity confidence reflects it. Do not present this as a verified airflow.")))), React.createElement("div", null, React.createElement("div", {
    className: "gs gs-blue"
  }, "Power"), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(201,168,76,.2)',
      color: '#d4a843'
    }
  }, "6"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Compressor power (kW)"), React.createElement("p", null, "Clamp meter on live wire. Record kW not kVA. Steady-state only. Inverter units: average over 1 min."))))), React.createElement("div", {
    style: {
      marginTop: 14,
      padding: '12px 14px',
      background: 'rgba(125,211,252,.06)',
      border: '1px solid rgba(125,211,252,.2)',
      borderRadius: 10
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#7dd3fc',
      fontWeight: 700,
      letterSpacing: '.05em',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, "Building a capture hood / funnel (method 5b)"), React.createElement("p", {
    style: {
      fontSize: 11,
      color: '#c8b89a',
      lineHeight: 1.6,
      marginBottom: 10
    }
  }, "Goal: catch every bit of the unit's air and force it through ONE throat of known area, then read a single clean velocity there. Flow (m\xB3/h) = throat velocity (m/s) \xD7 throat area (m\xB2) \xD7 3600 \u2014 or feed that velocity straight into the traverse panel as a 1-point round duct of the throat diameter."), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.22)',
      borderRadius: 8,
      padding: '10px',
      marginBottom: 10,
      border: '1px solid rgba(125,211,252,.12)'
    }
  }, React.createElement("svg", {
    viewBox: "0 0 560 300",
    xmlns: "http://www.w3.org/2000/svg",
    style: {
      width: '100%',
      height: 'auto',
      display: 'block'
    }
  }, React.createElement("defs", null, React.createElement("marker", {
    id: "arr",
    markerWidth: "8",
    markerHeight: "8",
    refX: "7",
    refY: "4",
    orient: "auto"
  }, React.createElement("path", {
    d: "M0,0 L8,4 L0,8 Z",
    fill: "#7dd3fc"
  })), React.createElement("marker", {
    id: "arrS",
    markerWidth: "7",
    markerHeight: "7",
    refX: "6",
    refY: "3.5",
    orient: "auto"
  }, React.createElement("path", {
    d: "M0,0 L7,3.5 L0,7 Z",
    fill: "#d4a843"
  })), React.createElement("marker", {
    id: "arrSr",
    markerWidth: "7",
    markerHeight: "7",
    refX: "0",
    refY: "3.5",
    orient: "auto"
  }, React.createElement("path", {
    d: "M7,0 L0,3.5 L7,7 Z",
    fill: "#d4a843"
  }))), React.createElement("rect", {
    x: "22",
    y: "40",
    width: "14",
    height: "200",
    rx: "2",
    fill: "rgba(245,158,11,.18)",
    stroke: "#f59e0b",
    "stroke-width": "2"
  }), React.createElement("text", {
    x: "29",
    y: "262",
    fill: "#fbbf24",
    "font-family": "monospace",
    "font-size": "10",
    "text-anchor": "middle"
  }, "grille"), React.createElement("line", {
    x1: "40",
    y1: "80",
    x2: "64",
    y2: "80",
    stroke: "#7dd3fc",
    "stroke-width": "1.5",
    "marker-end": "url(#arr)"
  }), React.createElement("line", {
    x1: "40",
    y1: "140",
    x2: "64",
    y2: "140",
    stroke: "#7dd3fc",
    "stroke-width": "1.5",
    "marker-end": "url(#arr)"
  }), React.createElement("line", {
    x1: "40",
    y1: "200",
    x2: "64",
    y2: "200",
    stroke: "#7dd3fc",
    "stroke-width": "1.5",
    "marker-end": "url(#arr)"
  }), React.createElement("path", {
    d: "M70,42 L70,238 L300,180 L300,100 Z",
    fill: "rgba(125,211,252,.06)",
    stroke: "none"
  }), React.createElement("line", {
    x1: "70",
    y1: "42",
    x2: "300",
    y2: "100",
    stroke: "#7dd3fc",
    "stroke-width": "2.5"
  }), React.createElement("line", {
    x1: "70",
    y1: "238",
    x2: "300",
    y2: "180",
    stroke: "#7dd3fc",
    "stroke-width": "2.5"
  }), React.createElement("line", {
    x1: "70",
    y1: "42",
    x2: "70",
    y2: "238",
    stroke: "#f59e0b",
    "stroke-width": "3",
    "stroke-dasharray": "4 3"
  }), React.createElement("text", {
    x: "86",
    y: "34",
    fill: "#7dd3fc",
    "font-family": "monospace",
    "font-size": "10"
  }, "foam seal over whole grille"), React.createElement("line", {
    x1: "70",
    y1: "140",
    x2: "300",
    y2: "140",
    stroke: "#64748b",
    "stroke-width": "1",
    "stroke-dasharray": "3 3"
  }), React.createElement("path", {
    d: "M120,140 A50,50 0 0,0 116,127",
    fill: "none",
    stroke: "#94a3b8",
    "stroke-width": "1"
  }), React.createElement("text", {
    x: "128",
    y: "133",
    fill: "#94a3b8",
    "font-family": "monospace",
    "font-size": "9"
  }, "\u226415\u201320\xB0"), React.createElement("rect", {
    x: "300",
    y: "100",
    width: "180",
    height: "80",
    fill: "rgba(125,211,252,.06)",
    stroke: "none"
  }), React.createElement("line", {
    x1: "300",
    y1: "100",
    x2: "480",
    y2: "100",
    stroke: "#7dd3fc",
    "stroke-width": "2.5"
  }), React.createElement("line", {
    x1: "300",
    y1: "180",
    x2: "480",
    y2: "180",
    stroke: "#7dd3fc",
    "stroke-width": "2.5"
  }), React.createElement("line", {
    x1: "480",
    y1: "100",
    x2: "480",
    y2: "180",
    stroke: "#7dd3fc",
    "stroke-width": "1.5"
  }), React.createElement("line", {
    x1: "316",
    y1: "100",
    x2: "316",
    y2: "180",
    stroke: "#d4a843",
    "stroke-width": "1.2",
    "marker-start": "url(#arrSr)",
    "marker-end": "url(#arrS)"
  }), React.createElement("text", {
    x: "324",
    y: "144",
    fill: "#d4a843",
    "font-family": "monospace",
    "font-size": "11",
    "font-weight": "bold"
  }, "D"), React.createElement("circle", {
    cx: "380",
    cy: "140",
    r: "6",
    fill: "#22c55e",
    stroke: "#0f1f17",
    "stroke-width": "1.5"
  }), React.createElement("circle", {
    cx: "380",
    cy: "140",
    r: "11",
    fill: "none",
    stroke: "#22c55e",
    "stroke-width": "1",
    "stroke-dasharray": "2 2"
  }), React.createElement("text", {
    x: "372",
    y: "160",
    fill: "#22c55e",
    "font-family": "monospace",
    "font-size": "10",
    "text-anchor": "start"
  }, "sensor"), React.createElement("text", {
    x: "372",
    y: "171",
    fill: "#22c55e",
    "font-family": "monospace",
    "font-size": "9",
    "text-anchor": "start"
  }, "\u27C2 flow"), React.createElement("line", {
    x1: "300",
    y1: "92",
    x2: "380",
    y2: "92",
    stroke: "#d4a843",
    "stroke-width": "1",
    "marker-start": "url(#arrSr)",
    "marker-end": "url(#arrS)"
  }), React.createElement("text", {
    x: "340",
    y: "86",
    fill: "#d4a843",
    "font-family": "monospace",
    "font-size": "9",
    "text-anchor": "middle"
  }, "\u22482D"), React.createElement("line", {
    x1: "300",
    y1: "214",
    x2: "480",
    y2: "214",
    stroke: "#d4a843",
    "stroke-width": "1",
    "marker-start": "url(#arrSr)",
    "marker-end": "url(#arrS)"
  }), React.createElement("text", {
    x: "430",
    y: "226",
    fill: "#d4a843",
    "font-family": "monospace",
    "font-size": "9",
    "text-anchor": "middle"
  }, "throat \u22653D"), React.createElement("g", {
    stroke: "#5eead4",
    "stroke-width": "0.8",
    opacity: "0.8"
  }, React.createElement("line", {
    x1: "304",
    y1: "104",
    x2: "304",
    y2: "176"
  }), React.createElement("line", {
    x1: "308",
    y1: "104",
    x2: "308",
    y2: "176"
  }), React.createElement("line", {
    x1: "312",
    y1: "104",
    x2: "312",
    y2: "176"
  })), React.createElement("text", {
    x: "150",
    y: "262",
    fill: "#5eead4",
    "font-family": "monospace",
    "font-size": "9"
  }, "straws/honeycomb at throat entry (de-swirl)"), React.createElement("line", {
    x1: "486",
    y1: "140",
    x2: "512",
    y2: "140",
    stroke: "#7dd3fc",
    "stroke-width": "1.5",
    "marker-end": "url(#arr)"
  }), React.createElement("text", {
    x: "280",
    y: "288",
    fill: "#8a7a65",
    "font-family": "monospace",
    "font-size": "10",
    "text-anchor": "middle"
  }, "Flow (m\xB3/h) = velocity at sensor (m/s) \xD7 throat area \u03C0D\xB2/4 (m\xB2) \xD7 3600"))), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.18)',
      borderRadius: 8,
      padding: '9px 11px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#7dd3fc',
      fontWeight: 600,
      marginBottom: 5
    }
  }, "Shape & throat size by machine"), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      lineHeight: 1.7
    }
  }, "Throat sized so velocity lands in the meter's sweet spot (2\u201310 m/s):", React.createElement("br", null), "\xB7 Small split / console (\u22723.5 kW, ~300\u2013700 m\xB3/h): throat 150\u2013200 mm \xD8 or 150\xD7150 mm", React.createElement("br", null), "\xB7 Mid split / cassette (3.5\u20137 kW, ~700\u20131300 m\xB3/h): throat 200\u2013250 mm \xD8", React.createElement("br", null), "\xB7 Large cassette / ducted (7\u201314 kW, ~1300\u20132500 m\xB3/h): throat 300\u2013350 mm \xD8, or split into two throats", React.createElement("br", null), React.createElement("span", {
    style: {
      color: '#7dd3fc'
    }
  }, "Rule of thumb: throat area \u2248 peak flow (m\xB3/s) \xF7 6 m/s."))), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.18)',
      borderRadius: 8,
      padding: '9px 11px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#7dd3fc',
      fontWeight: 600,
      marginBottom: 5
    }
  }, "Geometry that keeps it accurate"), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      lineHeight: 1.7
    }
  }, "\xB7 Mouth must seal over the WHOLE grille (foam/brush gasket) \u2014 any leak is lost flow", React.createElement("br", null), "\xB7 Taper gently: cone half-angle \u2264 15\u201320\xB0 so flow doesn't separate from the walls", React.createElement("br", null), "\xB7 After the taper add a straight throat \u2265 3 throat-diameters long before the sensor", React.createElement("br", null), "\xB7 Put the sensor centred, ~2 throat-diameters into the straight part, perpendicular to flow", React.createElement("br", null), "\xB7 A few drinking-straws / honeycomb at throat entry straightens swirl from cassettes"))), React.createElement("p", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      lineHeight: 1.6,
      marginBottom: 0
    }
  }, React.createElement("strong", {
    style: {
      color: '#c8b89a'
    }
  }, "Materials:"), " appliance cardboard or corrugated plastic (Coroplast), aluminium tape, foam weatherstrip for the seal. ", React.createElement("strong", {
    style: {
      color: '#c8b89a'
    }
  }, "Modular tip:"), " build several mouth adapters (one per common grille size) that all neck down to ONE standard throat tube, so you keep a single calibrated throat. ", React.createElement("strong", {
    style: {
      color: '#c8b89a'
    }
  }, "Sanity check:"), " for a cooling unit you can cross-check hood airflow against the liquid-side or psychrometric capacity \u2014 if they disagree by >10%, suspect a hood leak or a separated cone.")), React.createElement("div", {
    className: "gtip"
  }, "Enthalpy accuracy: A 2% RH error at 90% supply RH causes approx 1.5 kJ/kg enthalpy error. With 0.2 kg/s airflow this is 0.3 kW error in Q - roughly 5-10% on a residential unit. Always allow full stabilisation and cross-check RH with wet-bulb measurement where precision matters.")));
}
function GuideAL() {
  return React.createElement("div", null, React.createElement("button", {
    id: "guide-al-btn",
    className: "guide-btn",
    onClick: () => toggleGuide('guide-al')
  }, React.createElement("span", null, "Measurement Guide - Air / Liquid \xA0", React.createElement("span", {
    style: {
      fontSize: 10,
      opacity: .6
    }
  }, "water side primary, air side control")), React.createElement("span", {
    className: "arr"
  }, "v")), React.createElement("div", {
    id: "guide-al",
    className: "guide-panel"
  }, React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "gs gs-blue"
  }, "Liquid side (primary)"), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(201,168,76,.2)',
      color: '#d4a843'
    }
  }, "1"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Water temperatures (T inn / T ut)"), React.createElement("p", null, "Immersion sensor or insulated clamp-on PT100 directly on pipe. T inn = cold water in, T ut = warmer water out. Avoid elbows and valves."))), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(201,168,76,.2)',
      color: '#d4a843'
    }
  }, "2"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Water flow (L/s)"), React.createElement("p", null, "Ultrasonic clamp-on flow meter. Min 10 pipe diameters straight run before sensor. Formula: Q = 4.18 x V(L/s) x dT. 5% flow error = 5% Q error.")))), React.createElement("div", null, React.createElement("div", {
    className: "gs gs-amber"
  }, "Air side (heat rejection control)"), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(245,158,11,.2)',
      color: '#fcd34d'
    }
  }, "3"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Ambient air (Inn) - DB + RH"), React.createElement("p", null, "Shade probe from sun. 1 m from condenser inlet, not in discharge stream. Max 60 C. This is the entering ambient air temperature."))), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(245,158,11,.2)',
      color: '#fcd34d'
    }
  }, "4"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Leaving air (Ut) - DB + RH"), React.createElement("p", null, "Leaving air is warmer than ambient - this is heat rejection. Expected: Q_heat = Q_water + P_el. Deviation over 10% indicates measurement error."))))), React.createElement("div", {
    className: "gtip"
  }, "Balance check: Q_water and Q_air should balance within 5-8%. Larger deviation usually means flow measurement error on water side or airflow error on air side. Trust water side as primary measurement.")));
}
function GuideLL() {
  return React.createElement("div", null, React.createElement("button", {
    id: "guide-ll-btn",
    className: "guide-btn",
    onClick: () => toggleGuide('guide-ll')
  }, React.createElement("span", null, "Measurement Guide - Liquid / Liquid \xA0", React.createElement("span", {
    style: {
      fontSize: 10,
      opacity: .6
    }
  }, "both sides measured, balance is key")), React.createElement("span", {
    className: "arr"
  }, "v")), React.createElement("div", {
    id: "guide-ll",
    className: "guide-panel"
  }, React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "gs gs-blue"
  }, "Cold side (chilled water / glycol)"), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(201,168,76,.2)',
      color: '#d4a843'
    }
  }, "1"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "T inlet + T outlet"), React.createElement("p", null, "Immersion or insulated clamp-on PT100. Measure close to heat exchanger. Even 0.1 C error at 2 C dT = 5% Q error - 4 decimals matters here."))), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(201,168,76,.2)',
      color: '#d4a843'
    }
  }, "2"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Flow (L/s) + glycol %"), React.createElement("p", null, "Ultrasonic clamp-on preferred. Use refractometer to verify actual glycol %. Wrong concentration = wrong cp = wrong Q. Calculator adjusts cp and density automatically.")))), React.createElement("div", null, React.createElement("div", {
    className: "gs gs-amber"
  }, "Hot side (condenser water / glycol)"), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(245,158,11,.2)',
      color: '#fcd34d'
    }
  }, "3"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "T inlet + T outlet"), React.createElement("p", null, "Same method as cold side. At steady state and for this control volume, Q_hot \u2248 Q_cold + compressor input (neglecting storage and unmeasured losses). If Q_hot is well below Q_cold, check the measurements."))), React.createElement("div", {
    className: "guide-row"
  }, React.createElement("div", {
    className: "guide-num",
    style: {
      background: 'rgba(245,158,11,.2)',
      color: '#fcd34d'
    }
  }, "4"), React.createElement("div", {
    className: "guide-content"
  }, React.createElement("h4", null, "Flow (L/s) + glycol %"), React.createElement("p", null, "Verify glycol % on hot side separately - concentrations may differ between circuits. Use refractometer."))))), React.createElement("div", {
    className: "gtip"
  }, "Energy balance: Q_hot = Q_cold + P_el. Deviation over 5-8%: check flow measurements first. Small dT with high flow is much more sensitive to errors than large dT with low flow. At dT = 2 C, a 0.1 C sensor error = 5% Q error.")));
}
function runSelfTests() {
  const tests = [];
  const approx = (a, b, tol) => Math.abs(a - b) <= tol;
  let v = pSat(20);
  tests.push({
    name: 'Sat. pressure @ 20°C',
    input: 'T=20°C',
    expected: '2339 Pa',
    got: fmt(v, 0) + ' Pa',
    tol: '±15 Pa',
    pass: approx(v, 2339, 15)
  });
  v = humR(25, 50, 101325);
  tests.push({
    name: 'Humidity ratio @ 25°C/50%',
    input: '25°C, 50%, 101325Pa',
    expected: '0.00988 kg/kg',
    got: fmt(v, 5) + ' kg/kg',
    tol: '±0.0002',
    pass: approx(v, 0.00988, 0.0002)
  });
  v = enth(25, 50, 101325);
  tests.push({
    name: 'Enthalpy @ 25°C/50%',
    input: '25°C, 50%',
    expected: '50.4 kJ/kg',
    got: fmt(v, 2) + ' kJ/kg',
    tol: '±0.6',
    pass: approx(v, 50.4, 0.6)
  });
  v = dewPt(25, 50);
  tests.push({
    name: 'Dew point @ 25°C/50%',
    input: '25°C, 50%',
    expected: '13.9°C',
    got: fmt(v, 2) + '°C',
    tol: '±0.4',
    pass: approx(v, 13.9, 0.4)
  });
  v = wBulb(30, 40, 101325);
  tests.push({
    name: 'Wet bulb @ 30°C/40%',
    input: '30°C, 40%',
    expected: '19.9°C',
    got: fmt(v, 2) + '°C',
    tol: '±0.5',
    pass: approx(v, 19.9, 0.5)
  });
  v = 4.18 * 1.0 * 5;
  tests.push({
    name: 'Water capacity 1L/s ΔT5K',
    input: '1 L/s, ΔT=5K',
    expected: '20.90 kW',
    got: fmt(v, 2) + ' kW',
    tol: '±0.05',
    pass: approx(v, 20.9, 0.05)
  });
  let gp = glyPropsTD('EG', 30, 10);
  tests.push({
    name: 'EG 30% cp @ 10°C',
    input: 'EG 30%, 10°C',
    expected: '3.689 kJ/kgK (CoolProp 7.2.0)',
    got: fmt(gp.cp, 3) + ' kJ/kgK',
    tol: '±0.02',
    pass: approx(gp.cp, 3.689, 0.02)
  });
  tests.push({
    name: 'EG 30% ρ @ 10°C',
    input: 'EG 30%, 10°C',
    expected: '1.042 kg/L (CoolProp 7.2.0)',
    got: fmt(gp.rho, 3) + ' kg/L',
    tol: '±0.005',
    pass: approx(gp.rho, 1.042, 0.005)
  });
  var _g55 = glyPropsTD('EG', 55, 10);
  tests.push({
    name: 'EG 55% valid (50-60% band)',
    input: 'EG 55%, 10°C',
    expected: 'valid cp<3.5',
    got: isFinite(_g55.cp) ? fmt(_g55.cp, 3) : 'invalid',
    tol: 'cp<3.5',
    pass: isFinite(_g55.cp) && _g55.cp < 3.5
  });
  var _g65 = glyPropsTD('EG', 65, 10);
  tests.push({
    name: 'EG 65% fail-closed (no water)',
    input: 'EG 65%, 10°C',
    expected: 'invalid (not 4.18)',
    got: isFinite(_g65.cp) ? fmt(_g65.cp, 3) : 'invalid ✓',
    tol: 'invalid',
    pass: !isFinite(_g65.cp)
  });
  v = 3.5 * 3.412;
  tests.push({
    name: 'EER 3.5 W/W to BTU/Wh',
    input: '3.5 W/W',
    expected: '11.94 BTU/Wh',
    got: fmt(v, 2) + ' BTU/Wh',
    tol: '±0.05',
    pass: approx(v, 11.94, 0.05)
  });
  v = satT('R32', 9);
  tests.push({
    name: 'R32 sat temp @ 9 bar(g)',
    input: 'R32, 9 bar gauge',
    expected: '6.37°C',
    got: v != null ? fmt(v, 2) + '°C' : 'null',
    tol: '±0.2K',
    pass: v != null && approx(v, 6.3656, 0.2)
  });
  v = satTblend("R407C", 4.666, 101.3)?.bubble;
  tests.push({
    name: 'R407C bubble @ 4.666 bar(g)',
    input: 'R407C bubble point',
    expected: '~0.0°C',
    got: v != null ? fmt(v, 1) + '°C' : 'null',
    tol: '±1°C',
    pass: v != null && approx(v, 0, 1)
  });
  v = satTblend("R407C", 3.594, 101.3)?.dew;
  tests.push({
    name: 'R407C dew @ 3.594 bar(g)',
    input: 'R407C dew point',
    expected: '~0.0°C',
    got: v != null ? fmt(v, 1) + '°C' : 'null',
    tol: '±1°C',
    pass: v != null && approx(v, 0, 1)
  });
  v = satT("R744", 75, 101.3);
  tests.push({
    name: 'R744 above critical returns null',
    input: 'R744 75 bar(g) > critical',
    expected: 'null',
    got: v == null ? 'null ✓' : fmt(v, 1) + '°C',
    tol: 'exact',
    pass: v == null
  });
  v = satT("R32", 200, 101.3);
  tests.push({
    name: 'Out-of-range R32 returns null',
    input: 'R32 200 bar(g)',
    expected: 'null',
    got: v == null ? 'null ✓' : fmt(v, 1) + '°C',
    tol: 'exact',
    pass: v == null
  });
  v = toStdU(0.2, 'rect');
  tests.push({
    name: 'GUM rectangular divisor √3',
    input: 'tol 0.2, rect',
    expected: '0.1155',
    got: fmt(v, 4),
    tol: '±0.001',
    pass: approx(v, 0.1155, 0.001)
  });
  var gi = liquidUncertainty(20.9, 5, 0.1, 2, 0.5, 0.3, 0, 0),
    gm = liquidUncertainty(20.9, 5, 0.1, 2, 0.5, 0.3, 0.8, 0);
  tests.push({
    name: 'GUM common-mode cancellation',
    input: 'cf=0.8 vs cf=0',
    expected: 'common<independent',
    got: gm.u_dT_pct < gi.u_dT_pct ? 'yes ✓' : 'no',
    tol: 'qualitative',
    pass: gm.u_dT_pct < gi.u_dT_pct
  });
  var gk = liquidUncertainty(20.9, 5, 0.1, 2, 0.5, 0.3, 0, 5.0, 3);
  tests.push({
    name: 'GUM Welch-Satterthwaite k>2',
    input: 'Type A 5%, n_eff=3',
    expected: 'k>2',
    got: 'k=' + fmt(gk.kFactor, 2),
    tol: 'k>2.0',
    pass: gk.kFactor > 2.0
  });
  var b452 = satTblend("R452A", 5.37, 101.3);
  tests.push({
    name: 'R452A bubble @ 5.37 bar(g)',
    input: 'R452A 5.37 barg',
    expected: '~0°C bubble',
    got: b452 != null ? fmt(b452.bubble, 1) + '°C' : 'null',
    tol: '±1K',
    pass: b452 != null && approx(b452.bubble, 0, 1.5)
  });
  tests.push({
    name: 'R452A glide (dew>bubble)',
    input: 'R452A 5.37 barg',
    expected: 'dew>bubble',
    got: b452 != null ? fmt(b452.dew - b452.bubble, 1) + 'K' : 'null',
    tol: '>2K',
    pass: b452 != null && b452.dew - b452.bubble > 2
  });
  tests.push({
    name: 'Traverse pts/side <760mm',
    input: '400mm',
    expected: '5',
    got: String(ptsPerSide(400)),
    tol: 'exact',
    pass: ptsPerSide(400) === 5
  });
  tests.push({
    name: 'Traverse pts/side >915mm',
    input: '1000mm',
    expected: '7',
    got: String(ptsPerSide(1000)),
    tol: 'exact',
    pass: ptsPerSide(1000) === 7
  });
  var rf = ringFracs(3);
  tests.push({
    name: 'Traverse equal-area rings',
    input: '3 rings',
    expected: 'increasing 0-1',
    got: rf.map(x => fmt(x, 2)).join(','),
    tol: 'monotonic',
    pass: rf[0] < rf[1] && rf[1] < rf[2] && rf[2] < 1
  });
  var vFromVP = Math.sqrt(2 * 25 / 1.2);
  tests.push({
    name: 'Pitot VP→velocity @ 25 Pa',
    input: 'VP=25 Pa, ρ=1.2',
    expected: '6.45 m/s',
    got: fmt(vFromVP, 2) + ' m/s',
    tol: '±0.05',
    pass: approx(vFromVP, 6.455, 0.05)
  });
  if (typeof refrigState === 'function' && SAT_BLENDS['R407C']) {
    var rsBlend = refrigState('R407C', 5, 28, 15, 35, 101.5);
    var naive = satT('R407C', 5, 101.5);
    tests.push({
      name: 'refrigState blend-aware (R407C)',
      input: 'R407C @ 5 bar',
      expected: 'dew uses bubble/dew table',
      got: 'tE=' + (rsBlend && rsBlend.tE != null ? fmt(rsBlend.tE, 2) : 'null'),
      tol: 'non-null & blend',
      pass: rsBlend != null && rsBlend.tE != null && rsBlend.isBlend === true
    });
    var rsPure = refrigState('R32', 5, 28, 15, 35, 101.5);
    var pureSat = satT('R32', 5, 101.5);
    tests.push({
      name: 'refrigState pure matches satT',
      input: 'R32 @ 5 bar',
      expected: 'tE===satT',
      got: rsPure && rsPure.tE != null ? fmt(rsPure.tE, 3) + '=' + fmt(pureSat, 3) : 'null',
      tol: 'exact',
      pass: rsPure != null && pureSat != null && Math.abs(rsPure.tE - pureSat) < 0.001
    });
  }
  if (typeof glyPropsTD === 'function') {
    var gCold = glyPropsTD('EG', 30, 0),
      gWarm = glyPropsTD('EG', 30, 40);
    tests.push({
      name: 'Glycol cp varies with temperature',
      input: 'EG 30% at 0 vs 40°C',
      expected: 'cp differs',
      got: fmt(gCold.cp, 3) + ' vs ' + fmt(gWarm.cp, 3),
      tol: '>1% apart',
      pass: Math.abs(gCold.cp - gWarm.cp) / gWarm.cp > 0.01
    });
  }
  if (typeof phCycle === 'function' && PH_SAT['R410A']) {
    var cyc = phCycle('R410A', 5, 45, 5, 5);
    tests.push({
      name: 'p-h schematic cycle returns points',
      input: 'R410A Te=5,Tc=45',
      expected: '4 state points',
      got: cyc ? 'h1=' + fmt(cyc.h1, 0) + ',h3=' + fmt(cyc.h3, 0) : 'null',
      tol: 'exists',
      pass: cyc != null && isFinite(cyc.h1) && isFinite(cyc.h3)
    });
    if (cyc) tests.push({
      name: 'p-h h4=h3 (isenthalpic)',
      input: 'expansion',
      expected: 'h4===h3',
      got: fmt(cyc.h4, 1) + '=' + fmt(cyc.h3, 1),
      tol: 'exact',
      pass: Math.abs(cyc.h4 - cyc.h3) < 0.01
    });
    var cycOOR = phCycle('R410A', 5, 200);
    tests.push({
      name: 'p-h fails closed out of range',
      input: 'Tc=200°C (>table)',
      expected: 'null',
      got: cycOOR === null ? 'null' : 'NON-NULL',
      tol: 'exact',
      pass: cycOOR === null
    });
    tests.push({
      name: 'phInterp null past table edge',
      input: 'T=200°C',
      expected: 'null',
      got: phInterp('R410A', 200, 3) === null ? 'null' : 'value',
      tol: 'exact',
      pass: phInterp('R410A', 200, 3) === null
    });
  }
  let unc = liquidUncertainty(20.9, 5, 0.1, 2.0, 0.5, 0.3);
  tests.push({
    name: 'GUM water ΔT=5K uT=0.1',
    input: 'ΔT=5K, uT=0.1K',
    expected: 'u_c 3-4%',
    got: '±' + fmt(unc.uc_pct, 2) + '%',
    tol: '3-4%',
    pass: unc.uc_pct >= 3 && unc.uc_pct <= 4
  });
  let resid = 25 - 20 - 5;
  tests.push({
    name: 'Energy balance Qh-Qc-P',
    input: 'Qh=25,Qc=20,P=5',
    expected: '0 kW',
    got: fmt(resid, 2) + ' kW',
    tol: '±0.01',
    pass: approx(resid, 0, 0.01)
  });
  v = 20 * 9 / 5 + 32;
  tests.push({
    name: 'Temp 20°C to °F',
    input: '20°C',
    expected: '68°F',
    got: fmt(v, 1) + '°F',
    tol: '±0.1',
    pass: approx(v, 68, 0.1)
  });
  v = sVol(20, 50, 101325);
  tests.push({
    name: 'Spec volume @ 20°C/50%',
    input: '20°C, 50%',
    expected: '0.8419 m³/kg',
    got: fmt(v, 4) + ' m³/kg',
    tol: '±0.002',
    pass: approx(v, 0.8419, 0.002)
  });
  let iss = validateInputs('aa', {
    eRH: 120,
    lRH: 50,
    hE: 50,
    hL: 30,
    eC: 25,
    lC: 14,
    af: 600,
    pw: 2,
    eer: 5
  });
  let caught = iss.some(i => i.msg.includes('RH outside'));
  tests.push({
    name: 'Validation: RH>100 caught',
    input: 'RH=120%',
    expected: 'flagged invalid',
    got: caught ? 'caught ✓' : 'missed',
    tol: '—',
    pass: caught
  });
  iss = validateInputs('ll', {
    dTc: 5,
    dTh: 4,
    Qc: 20,
    Qh: 15,
    cF: 1,
    hF: 1,
    pw: 5,
    eer: 4
  });
  caught = iss.some(i => i.msg.includes('impossible'));
  tests.push({
    name: 'Validation: Qh<Qc caught',
    input: 'Qh=15,Qc=20',
    expected: 'flagged critical',
    got: caught ? 'caught ✓' : 'missed',
    tol: '—',
    pass: caught
  });
  if (typeof phShProp === 'function' && typeof phCycleAccurate === 'function') {
    var _savedSH = typeof PH_SH !== 'undefined' ? PH_SH : null;
    var _tg = {
      meta: {
        P_bar: [3, 4, 5, 6, 8, 10, 12],
        T_C: [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
        coolprop_version: '7.2.0 (synthetic test)',
        reference: 'IIR (test)'
      },
      SH: {
        TEST: {
          h: [],
          s: []
        }
      }
    };
    for (var _pi = 0; _pi < _tg.meta.P_bar.length; _pi++) {
      var _P = _tg.meta.P_bar[_pi],
        _hr = [],
        _sr = [];
      for (var _ti = 0; _ti < _tg.meta.T_C.length; _ti++) {
        var _T = _tg.meta.T_C[_ti];
        _hr.push(Math.round((415 + 0.9 * _T - 0.3 * _P) * 100) / 100);
        _sr.push(Math.round((1.95 + 0.0025 * _T - 0.03 * _P) * 1e4) / 1e4);
      }
      _tg.SH.TEST.h.push(_hr);
      _tg.SH.TEST.s.push(_sr);
    }
    var _origSAT = PH_SAT.TEST;
    PH_SAT.TEST = [[10, 400, 210, 408, 1.04, 1.73], [40, 800, 240, 432, 1.16, 1.70]];
    try {
      PH_SH = _tg;
    } catch (e) {}
    var _savedLIQ = typeof PH_LIQ !== 'undefined' ? PH_LIQ : null;
    var _tl = {
      meta: {
        P_bar: [3, 4, 5, 6, 8, 10, 12],
        T_C: [-10, 0, 10, 20, 30, 40, 50],
        reference: 'IIR (test)',
        coolprop_version: '7.2.0'
      },
      LIQ: {
        TEST: {
          h: [],
          T_bubble_C: [],
          h_bubble: []
        }
      }
    };
    for (var _qi = 0; _qi < _tl.meta.P_bar.length; _qi++) {
      var _Pq = _tl.meta.P_bar[_qi];
      var _Tb = 10 + 7.5 * (_Pq - 4),
        _hb = 210 + 7.5 * (_Pq - 4);
      _tl.LIQ.TEST.T_bubble_C.push(Math.round(_Tb * 1000) / 1000);
      _tl.LIQ.TEST.h_bubble.push(Math.round(_hb * 100) / 100);
      var _hrq = [];
      for (var _tq = 0; _tq < _tl.meta.T_C.length; _tq++) {
        var _Tq = _tl.meta.T_C[_tq];
        _hrq.push(_Tq <= _Tb + 1e-9 ? Math.round((_hb - 1.5 * (_Tb - _Tq)) * 100) / 100 : null);
      }
      _tl.LIQ.TEST.h.push(_hrq);
    }
    try {
      PH_LIQ = _tl;
    } catch (e) {}
    var _hl = phLiqProp('TEST', 8, 35);
    tests.push({
      name: 'LIQ grid subcooled h',
      input: 'P=8bar,T=35',
      expected: '232.5',
      got: _hl != null ? fmt(_hl, 1) : 'null',
      tol: 'exact',
      pass: _hl != null && Math.abs(_hl - 232.5) < 0.05
    });
    var _hl2 = phLiqProp('TEST', 8, 45);
    tests.push({
      name: 'LIQ above-bubble fail-closed',
      input: 'P=8bar,T=45',
      expected: 'null',
      got: _hl2 === null ? 'null' : fmt(_hl2, 1),
      tol: 'null',
      pass: _hl2 === null
    });
    var _h = phShProp('TEST', 5, 30, 'h');
    tests.push({
      name: 'SH grid bilinear h',
      input: 'P=5bar,T=30',
      expected: '440.5',
      got: _h != null ? fmt(_h, 1) : 'null',
      tol: 'exact',
      pass: _h != null && Math.abs(_h - 440.5) < 0.05
    });
    var _Ti = phShTfromPS('TEST', 6, 2.0);
    tests.push({
      name: 'SH isentrope inversion',
      input: 'P=6,s=2.0',
      expected: 'T≈92',
      got: _Ti != null ? fmt(_Ti, 0) : 'null',
      tol: '±1',
      pass: _Ti != null && Math.abs(_Ti - 92) < 1
    });
    var _cyc = phCycleAccurate('TEST', 10, 40, 5, 5, 0.7);
    tests.push({
      name: 'Accurate cycle h4=h3',
      input: 'isenthalpic',
      expected: 'h4===h3',
      got: _cyc ? fmt(_cyc.h4, 1) + '=' + fmt(_cyc.h3, 1) : 'null',
      tol: 'exact',
      pass: _cyc != null && Math.abs(_cyc.h4 - _cyc.h3) < 0.01
    });
    tests.push({
      name: 'Accurate cycle COP>1',
      input: 'TEST cycle',
      expected: 'COP plausible',
      got: _cyc && _cyc.COP != null ? fmt(_cyc.COP, 2) : 'null',
      tol: '>1',
      pass: _cyc != null && _cyc.COP != null && _cyc.COP > 1 && _cyc.COP < 10
    });
    PH_SH = _savedSH;
    PH_LIQ = _savedLIQ;
    if (_origSAT !== undefined) PH_SAT.TEST = _origSAT;else delete PH_SAT.TEST;
  }
  return tests;
}
function StandardsPanel({
  mode
}) {
  const [open, setOpen] = React.useState(false);
  const rows = {
    aa: [{
      std: 'EN 14511',
      lvl: 'partial',
      note: 'Capacity from air enthalpy difference & EER per Part 1 boundary; full rating points/tolerances not enforced'
    }, {
      std: 'EN 14825',
      lvl: 'partial',
      note: 'Seasonal SEER computed in the Energy Rating panel via climate-bin hours, part-load interpolation and a degradation coefficient; not the full certified rating procedure (fixed reference climate, no defrost/auxiliary terms)'
    }, {
      std: 'ASHRAE 37',
      lvl: 'partial',
      note: 'Air-enthalpy method supported; calorimeter & full test apparatus out of scope'
    }, {
      std: 'ASHRAE 111 / ISO 3966',
      lvl: 'partial',
      note: 'Implements the duct-traverse geometry and profile checks: Log-Tchebycheff (rectangular) and equal-area (round) point positions, 5/6/7 points per side by width, 2 or 3 traverse diameters, insertion depths in mm with ±0.005·side tolerance, Pitot velocity-pressure input (v=√(2·VP/ρ), Cp assumed 1.0), velocity-pressure spread check and a 7.5/3 Dh plane check. Does NOT cover the full standard (probe/yaw effects, density determination, steady-flow and integration requirements)'
    }, {
      std: 'GUM (ISO/IEC 98-3)',
      lvl: 'partial',
      note: 'First-order GUM-based engineering uncertainty estimate: RSS propagation, distribution conversion, common-mode split, Type A s/√n_eff, Welch-Satterthwaite effective DoF with Student-t k. Air-side model uses fixed reference pressure and dh/dT and omits enthalpy/specific-volume covariance; Monte Carlo (JCGM 101) not implemented'
    }],
    al: [{
      std: 'EN 14511',
      lvl: 'partial',
      note: 'Liquid-side capacity primary; air side estimated; rating-point enforcement out of scope'
    }, {
      std: 'ASHRAE 30 (chiller)',
      lvl: 'partial',
      note: 'Liquid calorimetric capacity supported; full test sequence out of scope'
    }, {
      std: 'ASHRAE Guideline 22',
      lvl: 'informed',
      note: 'Heat-rejection balance concept used for manual A/L cross-check'
    }, {
      std: 'Glycol props (ASHRAE 2017)',
      lvl: 'full',
      note: 'EG/PG cp and density from 2D temperature/concentration tables, applied at each circuit mean temperature in all liquid modes'
    }, {
      std: 'GUM (ISO/IEC 98-3)',
      lvl: 'partial',
      note: 'First-order GUM-based engineering uncertainty estimate: RSS propagation, distribution conversion, common-mode split, Type A s/√n_eff, Welch-Satterthwaite effective DoF with Student-t k. Does not include all covariances or Monte Carlo (JCGM 101)'
    }],
    ll: [{
      std: 'EN 14511',
      lvl: 'partial',
      note: 'Dual-circuit capacity & COP; rating-point enforcement out of scope'
    }, {
      std: 'ASHRAE 30',
      lvl: 'partial',
      note: 'Calorimetric capacity both circuits; full test sequence out of scope'
    }, {
      std: 'First-law balance',
      lvl: 'full',
      note: 'Residual R = Q_hot − Q_cold − P_total computed and displayed'
    }, {
      std: 'Glycol props (ASHRAE 2017)',
      lvl: 'full',
      note: 'EG/PG cp and density from 2D temperature/concentration tables, applied at each circuit mean temperature in all liquid modes'
    }, {
      std: 'GUM (ISO/IEC 98-3)',
      lvl: 'partial',
      note: 'First-order GUM-based engineering uncertainty estimate: RSS propagation, distribution conversion, common-mode split, Type A s/√n_eff, Welch-Satterthwaite effective DoF with Student-t k. Does not include all covariances or Monte Carlo (JCGM 101)'
    }]
  };
  const lblMap = {
    full: {
      t: 'Fully implements',
      c: '#22c55e'
    },
    partial: {
      t: 'Partially supports',
      c: '#fbbf24'
    },
    informed: {
      t: 'Informed by',
      c: '#8a7a65'
    }
  };
  const data = rows[mode] || rows.aa;
  return React.createElement("div", {
    className: "card no-print",
    style: {
      marginTop: 14,
      borderColor: 'rgba(201,168,76,.2)'
    }
  }, React.createElement("button", {
    className: "guide-btn",
    onClick: () => setOpen(!open),
    style: {
      width: '100%',
      textAlign: 'left'
    }
  }, open ? '▾' : '▸', " Standards applicability (", mode === 'aa' ? 'Air/Air' : mode === 'al' ? 'Air/Liquid' : 'Liquid/Liquid', ")"), open && React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "What this tool does relative to each standard. \"Fully implements\" means the standard method is realised here; \"partially supports\" means core calculations only; \"informed by\" means the concept guides the design but the procedure is not implemented. This tool is a calculation aid, not a certified test apparatus."), data.map((r, i) => React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 10,
      padding: '8px 0',
      borderTop: i > 0 ? '1px solid rgba(201,168,76,.1)' : 'none'
    }
  }, React.createElement("div", {
    style: {
      minWidth: 130,
      fontSize: 11,
      color: '#f5f0e8',
      fontWeight: 600
    }
  }, r.std), React.createElement("div", {
    style: {
      minWidth: 120
    }
  }, React.createElement("span", {
    style: {
      fontSize: 9,
      color: lblMap[r.lvl].c,
      border: `1px solid ${lblMap[r.lvl].c}55`,
      borderRadius: 4,
      padding: '2px 6px',
      whiteSpace: 'nowrap'
    }
  }, lblMap[r.lvl].t)), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      lineHeight: 1.4
    }
  }, r.note)))));
}
function SelfTestPanel() {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState(null);
  function run() {
    try {
      setResults(runSelfTests());
    } catch (e) {
      setResults([{
        name: 'Test run error',
        input: '-',
        expected: '-',
        got: String(e),
        tol: '-',
        pass: false
      }]);
    }
  }
  const passed = results ? results.filter(t => t.pass).length : 0;
  const total = results ? results.length : 0;
  const allPass = results && passed === total;
  return React.createElement("div", {
    className: "card no-print",
    style: {
      borderColor: 'rgba(201,168,76,.2)'
    }
  }, React.createElement("button", {
    className: "guide-btn",
    onClick: () => setOpen(v => !v),
    style: {
      marginBottom: open ? 14 : 0
    }
  }, React.createElement("span", null, "Engineering Self-Test \xA0", results && React.createElement("span", {
    style: {
      fontSize: 10,
      color: allPass ? '#22c55e' : '#f87171'
    }
  }, passed, "/", total, " passed ", allPass ? '✓' : '✗')), React.createElement("span", {
    style: {
      transition: 'transform .2s',
      transform: open ? 'rotate(180deg)' : 'none'
    }
  }, "\u25BC")), open && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginBottom: 12,
      lineHeight: 1.6
    }
  }, "Verifies all calculations against known reference values from ASHRAE Fundamentals 2017 and standard thermodynamic data. Run this to confirm the tool is computing correctly."), React.createElement("button", {
    onClick: run,
    style: {
      width: '100%',
      padding: '10px',
      borderRadius: 8,
      border: '1px solid rgba(201,168,76,.4)',
      background: 'rgba(201,168,76,.12)',
      color: '#d4a843',
      fontFamily: 'DM Mono,monospace',
      fontSize: 12,
      cursor: 'pointer',
      marginBottom: 14
    }
  }, "\u25B6 Run All Tests"), results && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      background: allPass ? 'rgba(34,197,94,.1)' : 'rgba(248,113,113,.1)',
      border: '1px solid ' + (allPass ? 'rgba(34,197,94,.3)' : 'rgba(248,113,113,.3)'),
      borderRadius: 8,
      padding: '12px',
      marginBottom: 12,
      textAlign: 'center'
    }
  }, React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 18,
      fontWeight: 700,
      color: allPass ? '#22c55e' : '#f87171'
    }
  }, passed, " / ", total, " TESTS PASSED"), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#8a7a65',
      marginTop: 4
    }
  }, allPass ? 'All calculations verified against reference data' : 'Some tests failed — see details below')), React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, React.createElement("table", {
    style: {
      width: '100%',
      fontSize: 10,
      borderCollapse: 'collapse'
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      color: '#8a7a65',
      textAlign: 'left',
      borderBottom: '1px solid rgba(201,168,76,.2)'
    }
  }, React.createElement("th", {
    style: {
      padding: '4px'
    }
  }, "Test"), React.createElement("th", {
    style: {
      padding: '4px'
    }
  }, "Expected"), React.createElement("th", {
    style: {
      padding: '4px'
    }
  }, "Got"), React.createElement("th", {
    style: {
      padding: '4px',
      textAlign: 'center'
    }
  }, "Result"))), React.createElement("tbody", null, results.map((t, i) => React.createElement("tr", {
    key: i,
    style: {
      borderBottom: '1px solid rgba(255,255,255,.04)'
    }
  }, React.createElement("td", {
    style: {
      padding: '4px',
      color: '#c8b89a'
    }
  }, t.name), React.createElement("td", {
    style: {
      padding: '4px',
      color: '#8a7a65'
    }
  }, t.expected), React.createElement("td", {
    style: {
      padding: '4px',
      color: t.pass ? '#c8b89a' : '#f87171'
    }
  }, t.got), React.createElement("td", {
    style: {
      padding: '4px',
      textAlign: 'center'
    }
  }, React.createElement("span", {
    style: {
      color: t.pass ? '#22c55e' : '#f87171',
      fontWeight: 700
    }
  }, t.pass ? 'PASS' : 'FAIL'))))))))));
}
function App() {
  const [mode, setMode] = useState("aa");
  const [, forceRerender] = useState(0);
  React.useEffect(() => {
    window.__NDT_RERENDER__ = () => forceRerender(n => n + 1);
    return () => {
      window.__NDT_RERENDER__ = null;
    };
  }, []);
  const [unit, setUnit] = useState("C");
  const [job, setJob] = useState("");
  const [uid, setUid] = useState("");
  const [pPress, setPPress] = useState(engcalcAppPressureInit);
  const _pKpaPa = engcalcAppPressurePa(pPress);
  const [measDate, setMeasDate] = useState(() => {
    const n = new Date();
    return n.toLocaleDateString('sv-SE') + ' ' + n.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  });
  const [log, setLog] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ndt_log') || '[]');
    } catch {
      return [];
    }
  });
  const [showLog, setShowLog] = useState(false);
  useEffect(() => {
    localStorage.setItem('ndt_log', JSON.stringify(log));
  }, [log]);
  function delEntry(id) {
    setLog(p => p.filter(e => e.id !== id));
  }
  function exportCSV() {
    if (!log.length) return;
    const csv = engcalcBuildCsv(log);
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "noditech_log.csv";
    a.click();
  }
  function exportJSON() {
    if (!log.length) return;
    const data = engcalcBuildJson(log, pPress);
    const a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    a.download = "noditech_log.json";
    a.click();
  }
  function saveSession() {
    const data = engcalcBuildSession(log, pPress, measDate);
    const a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    a.download = "noditech_session_" + new Date().toLocaleDateString('sv-SE') + ".json";
    a.click();
  }
  function loadSession(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.log) setLog(d.log);
        if (d.pressure) {
          setPPress(engcalcAppPressureFromSession(d.pressure.value_kPa, d.pressure.classification));
        } else {
          setPPress(engcalcAppPressureFromSession(d.pKpa));
        }
        if (d.measDate) setMeasDate(d.measDate);
        alert("Session loaded: " + (d.log ? d.log.length : 0) + " measurements");
      } catch (err) {
        alert("Could not read session file");
      }
    };
    r.readAsText(file);
    e.target.value = "";
  }
  function printReport() {
    window.print();
  }
  return React.createElement("div", {
    className: "app"
  }, React.createElement("div", {
    className: "wrap"
  }, React.createElement("div", {
    className: "print-only",
    style: {
      borderBottom: '2px solid #000',
      paddingBottom: '12px',
      marginBottom: '16px'
    }
  }, React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: '18pt',
      fontWeight: 'bold'
    }
  }, "Noditech AB"), React.createElement("div", {
    style: {
      fontSize: '11pt',
      color: '#333'
    }
  }, "HVAC Cooling Performance Measurement Report")), React.createElement("div", {
    style: {
      textAlign: 'right',
      fontSize: '9pt',
      color: '#333'
    }
  }, React.createElement("div", null, React.createElement("strong", null, "Date:"), " ", measDate), React.createElement("div", null, React.createElement("strong", null, "Job:"), " ", job || '—'), React.createElement("div", null, React.createElement("strong", null, "Unit:"), " ", uid || '—'), React.createElement("div", null, React.createElement("strong", null, "Tool:"), " ", BUILD_VERSION, " (", BUILD_DATE, ")"), React.createElement("div", null, React.createElement("strong", null, "Build:"), " ", BUILD_HASH), React.createElement("div", null, React.createElement("strong", null, "Properties:"), " CoolProp ", PH_PROV.coolprop, " ", PH_PROV.backend, " \xB7 ", PH_PROV.reference), React.createElement("div", null, React.createElement("strong", null, "Vapour data:"), " ", PH_DATASET_SHA), React.createElement("div", null, React.createElement("strong", null, "Liquid data:"), " ", PH_LIQ_DATASET_SHA), React.createElement("div", null, React.createElement("strong", null, "Mode:"), " ", mode === 'aa' ? 'Air/Air' : mode === 'al' ? 'Air/Liquid' : 'Liquid/Liquid'), React.createElement("div", null, React.createElement("strong", null, "Pressure:"), " ", pPress.state === 'known' ? fmt(pPress.value_kPa, 1) + ' kPa (' + pPress.classification + ')' : 'NOT SET — ' + pPress.reason)))), React.createElement("div", {
    style: {
      marginBottom: 28
    }
  }, React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 'clamp(34px,7vw,66px)',
      fontWeight: 800,
      color: '#f0f9ff',
      letterSpacing: '-.03em',
      lineHeight: 1,
      marginBottom: 5
    }
  }, "Nodi", React.createElement("span", {
    style: {
      color: '#d4a843'
    }
  }, "tech"), " ", React.createElement("span", {
    style: {
      color: '#d4a843'
    }
  }, "AB")), React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 'clamp(16px,3vw,24px)',
      fontWeight: 700,
      color: '#c8b89a',
      marginBottom: 3
    }
  }, "Cooling and EER Calculator"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8a7a65',
      letterSpacing: '.08em',
      marginBottom: 4
    }
  }, "by Simen Olsen Allum"), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#6b5d4a',
      letterSpacing: '.04em',
      marginBottom: 18
    }
  }, BUILD_VERSION, " \xB7 ", BUILD_DATE, " \xB7 build ", BUILD_HASH, " \xB7 CoolProp ", PH_PROV.coolprop, " ", PH_PROV.backend, " \xB7 data ", PH_DATASET_SHA, "/", PH_LIQ_DATASET_SHA), React.createElement("div", {
    className: "modes"
  }, [{
    id: "aa",
    icon: "A/A",
    label: "Air / Air",
    sub: "Luft til luft"
  }, {
    id: "al",
    icon: "A/L",
    label: "Air / Liquid",
    sub: "Luft til vann"
  }, {
    id: "ll",
    icon: "L/L",
    label: "Liquid / Liquid",
    sub: "Vann til vann"
  }].map(m => React.createElement("button", {
    key: m.id,
    className: "mbt" + (mode === m.id ? " on" : ""),
    onClick: () => setMode(m.id)
  }, React.createElement("span", {
    className: "mi"
  }, m.icon), React.createElement("span", {
    className: "ml"
  }, m.label), React.createElement("span", {
    className: "ms"
  }, m.sub))))), React.createElement("div", {
    className: "card no-print"
  }, React.createElement("div", {
    className: "slbl"
  }, "Measurement Info"), React.createElement("div", {
    className: "two"
  }, React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, "Job / Location"), React.createElement("input", {
    type: "text",
    placeholder: "e.g. Office 3rd floor",
    value: job,
    onChange: e => setJob(e.target.value)
  })), React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, "Unit ID / Serial"), React.createElement("input", {
    type: "text",
    placeholder: "e.g. AHU-01",
    value: uid,
    onChange: e => setUid(e.target.value)
  }))), React.createElement("div", {
    className: "field",
    style: {
      marginTop: 10
    }
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Date & Time"), React.createElement("span", {
    className: "utag"
  }, "auto")), React.createElement("input", {
    type: "text",
    value: measDate,
    onChange: e => setMeasDate(e.target.value),
    style: {
      fontFamily: 'DM Mono,monospace'
    }
  })), React.createElement("div", {
    className: "field",
    style: {
      marginTop: 10
    }
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, "Atmospheric Pressure"), React.createElement("span", {
    className: "utag"
  }, "kPa")), React.createElement(FloatInput, {
    value: pPress.value_kPa,
    onChange: v => setPPress(engcalcAppPressureFromField(v)),
    min: 50,
    max: 110,
    step: 0.1,
    placeholder: "enter site pressure (kPa)"
  }), React.createElement("button", {
    type: "button",
    onClick: () => setPPress(engcalcAppPressureReference()),
    style: {
      marginTop: 6,
      padding: '5px 10px',
      fontSize: 11,
      borderRadius: 6,
      border: '1px solid rgba(125,211,252,.4)',
      background: 'rgba(125,211,252,.08)',
      color: '#7dd3fc',
      cursor: 'pointer'
    }
  }, "Use reference pressure 101.325 kPa"), React.createElement("div", {
    "data-pressure-state": pPress.state,
    "data-pressure-reason": pPress.reason || '',
    style: {
      marginTop: 6,
      fontSize: 11,
      color: pPress.state === 'known' ? '#9fb3c8' : '#fca5a5'
    }
  }, pPress.state === 'known' ? 'Pressure: ' + fmt(pPress.value_kPa, 3) + ' kPa — ' + pPress.classification + (pPress.source ? ' (' + pPress.source + ')' : '') : 'Pressure not set — ' + engcalcPressureMessage(pPress.reason) + '. Pressure-dependent air-side results are withheld.'), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#8a7a65',
      marginTop: 4
    }
  }, pPress.state === 'known' ? '= ' + fmt(pPress.value_kPa * 1000, 0) + ' Pa' : '(not set)', " \xB7 Standard: 101.325 kPa (use the reference button) \xB7 Norrk\xF6ping typical: 101.5\u2013102.3 kPa"))), React.createElement("div", {
    className: "card no-print"
  }, React.createElement("div", {
    className: "slbl"
  }, "Temperature Unit"), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, ["C", "F"].map(u => React.createElement("button", {
    key: u,
    onClick: () => setUnit(u),
    style: {
      flex: 1,
      padding: '9px',
      borderRadius: 8,
      border: '1px solid',
      borderColor: unit === u ? '#d4a843' : 'rgba(255,255,255,.1)',
      background: unit === u ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.03)',
      color: unit === u ? '#d4a843' : '#8a7a65',
      fontFamily: 'DM Mono,monospace',
      fontSize: 13,
      cursor: 'pointer'
    }
  }, "deg ", u)))), mode === "aa" && React.createElement(AirAir, {
    unit: unit,
    job: job,
    uid: uid,
    setLog: setLog,
    setShowLog: setShowLog,
    pAtm: _pKpaPa,
    measDate: measDate
  }), mode === "al" && React.createElement(AirLiquid, {
    unit: unit,
    job: job,
    uid: uid,
    setLog: setLog,
    setShowLog: setShowLog,
    pAtm: _pKpaPa,
    measDate: measDate
  }), mode === "ll" && React.createElement(LiqLiq, {
    unit: unit,
    job: job,
    uid: uid,
    setLog: setLog,
    setShowLog: setShowLog,
    pAtm: _pKpaPa,
    measDate: measDate
  }), React.createElement(EnergyRating, {
    mode: mode
  }), React.createElement("div", {
    className: "brow no-print",
    style: {
      marginTop: 8,
      flexWrap: 'wrap'
    }
  }, React.createElement("button", {
    className: "bt bt-y",
    onClick: () => setShowLog(v => !v)
  }, showLog ? "Hide" : "Show", " Log (", log.length, ")"), React.createElement("button", {
    className: "bt bt-b",
    onClick: saveSession
  }, "Save Session"), React.createElement("label", {
    className: "bt bt-g",
    style: {
      cursor: 'pointer',
      textAlign: 'center'
    }
  }, "Load Session", React.createElement("input", {
    type: "file",
    accept: ".json",
    onChange: loadSession,
    style: {
      display: 'none'
    }
  }))), React.createElement(StandardsPanel, {
    mode: mode
  }), React.createElement(SelfTestPanel, null), showLog && React.createElement("div", {
    className: "card no-print",
    style: {
      marginTop: 14
    }
  }, React.createElement("div", {
    className: "slbl"
  }, "Measurement Log"), log.length === 0 ? React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#475569',
      padding: '10px 0'
    }
  }, "No measurements saved yet.") : React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, React.createElement("table", {
    className: "lt"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Date"), React.createElement("th", null, "Mode"), React.createElement("th", null, "Job"), React.createElement("th", null, "Unit"), React.createElement("th", null, "Ref"), React.createElement("th", null, "T1"), React.createElement("th", null, "T2"), React.createElement("th", null, "Q kW"), React.createElement("th", null, "EER"), React.createElement("th", null, "SH"), React.createElement("th", null, "T_evap"), React.createElement("th", null))), React.createElement("tbody", null, log.map(e => React.createElement("tr", {
    key: e.id
  }, React.createElement("td", {
    style: {
      fontSize: 10,
      color: '#64748b',
      whiteSpace: 'nowrap'
    }
  }, e.date), React.createElement("td", {
    style: {
      fontSize: 10
    }
  }, e.mode), React.createElement("td", {
    style: {
      color: '#f0f9ff'
    }
  }, e.job), React.createElement("td", null, e.uid), React.createElement("td", {
    style: {
      color: RCOL[e.ref] || '#94a3b8',
      fontWeight: 600
    }
  }, e.ref), React.createElement("td", null, e.t1), React.createElement("td", {
    style: {
      color: '#d4a843'
    }
  }, e.t2), React.createElement("td", {
    style: {
      color: '#d4a843',
      fontWeight: 600
    }
  }, e.Q), React.createElement("td", {
    style: {
      color: eCol(parseFloat(e.eer)),
      fontWeight: 600
    }
  }, e.eer), React.createElement("td", null, e.sh), React.createElement("td", null, e.tE), React.createElement("td", null, React.createElement("button", {
    className: "bt-r",
    onClick: () => delEntry(e.id)
  }, "x"))))))), React.createElement("div", {
    className: "brow",
    style: {
      marginTop: 10,
      flexWrap: 'wrap'
    }
  }, React.createElement("button", {
    className: "bt bt-b",
    onClick: exportCSV
  }, "Export CSV"), React.createElement("button", {
    className: "bt bt-b",
    onClick: exportJSON
  }, "Export JSON"), React.createElement("button", {
    className: "bt bt-g",
    onClick: printReport
  }, "Print / PDF Report"), React.createElement("button", {
    className: "bt-r",
    style: {
      padding: '7px 12px',
      fontSize: 11
    },
    onClick: () => {
      if (window.confirm("Clear all?")) setLog([]);
    }
  }, "Clear All")))), React.createElement("div", {
    className: "print-only",
    style: {
      borderTop: '1px solid #ccc',
      marginTop: '16px',
      paddingTop: '10px',
      fontSize: '8pt',
      color: '#555',
      lineHeight: 1.5
    }
  }, React.createElement("strong", null, "Disclaimer:"), " This tool supports engineering calculations, commissioning and diagnostic work. It does not replace accredited laboratory testing, certified instruments, applicable product standards or official certification procedures. Results are field estimates with the stated measurement uncertainty. Calculations are ", React.createElement("em", null, "informed by"), " EN 14511, EN ISO 5151 and ASHRAE Std 37; the uncertainty model follows ISO/IEC Guide 98-3 (GUM). This tool partially supports these standards for field calculation and is not a certified implementation \u2014 see the in-app Standards applicability panel for the per-mode breakdown.", React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, "Generated by Noditech Cooling Calculator \xB7 ", new Date().toLocaleString('sv-SE'), " ", React.createElement("span", {
    style: {
      display: 'block',
      marginTop: '6px',
      fontSize: '8pt',
      color: '#666'
    }
  }, DATASET_INFO)))));
}
function toggleGuide(id) {
  const panel = document.getElementById(id);
  const btn = document.getElementById(id + '-btn');
  panel.classList.toggle('open');
  btn.classList.toggle('open');
}
function NumField({
  label,
  val,
  set,
  utag,
  step = 1,
  min,
  max
}) {
  return React.createElement("div", {
    className: "field"
  }, React.createElement("div", {
    className: "lbl"
  }, React.createElement("span", null, label), React.createElement("span", {
    className: "utag"
  }, utag)), React.createElement(FloatInput, {
    value: val,
    onChange: set,
    step: step,
    min: min,
    max: max
  }));
}
function EnergyRating({
  mode
}) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState('iseer');
  const [i_capF35, setI_capF35] = React.useState(5103);
  const [i_powF35, setI_powF35] = React.useState(1224);
  const [i_capH35, setI_capH35] = React.useState(2496);
  const [i_powH35, setI_powH35] = React.useState(483);
  const [i_capF29, setI_capF29] = React.useState(5496);
  const [i_powF29, setI_powF29] = React.useState(1119);
  const [i_Cd, setI_Cd] = React.useState(0.25);
  const [e_capF35, setE_capF35] = React.useState(5103);
  const [e_powF35, setE_powF35] = React.useState(1224);
  const [e_capF29, setE_capF29] = React.useState(5496);
  const [e_powF29, setE_powF29] = React.useState(1119);
  const [e_Cd, setE_Cd] = React.useState(0.25);
  const [u_capA, setU_capA] = React.useState(5103);
  const [u_powA, setU_powA] = React.useState(1224);
  const [u_capB, setU_capB] = React.useState(5800);
  const [u_powB, setU_powB] = React.useState(950);
  const [u_Cd, setU_Cd] = React.useState(0.25);
  const [al_wTi, setAl_wTi] = React.useState(7.0);
  const [al_wTo, setAl_wTo] = React.useState(12.0);
  const [al_wF, setAl_wF] = React.useState(0.5);
  const [al_gly, setAl_gly] = React.useState(0);
  const [al_hTi, setAl_hTi] = React.useState(35.0);
  const [al_hTo, setAl_hTo] = React.useState(40.0);
  const [al_hF, setAl_hF] = React.useState(0.6);
  const [al_hGly, setAl_hGly] = React.useState(0);
  const [al_pw, setAl_pw] = React.useState(1.2);
  const isAA = mode === "aa",
    isAL = mode === "al",
    isLL = mode === "ll";
  function fn(n, d = 2) {
    if (!isFinite(n) || isNaN(n)) return "--";
    return n.toFixed(d);
  }
  function stars(n) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }
  const indiaBins = [{
    t: 24,
    h: 146
  }, {
    t: 25,
    h: 163
  }, {
    t: 26,
    h: 177
  }, {
    t: 27,
    h: 183
  }, {
    t: 28,
    h: 167
  }, {
    t: 29,
    h: 150
  }, {
    t: 30,
    h: 125
  }, {
    t: 31,
    h: 104
  }, {
    t: 32,
    h: 86
  }, {
    t: 33,
    h: 67
  }, {
    t: 34,
    h: 54
  }, {
    t: 35,
    h: 46
  }, {
    t: 36,
    h: 36
  }, {
    t: 37,
    h: 28
  }, {
    t: 38,
    h: 22
  }, {
    t: 39,
    h: 16
  }, {
    t: 40,
    h: 12
  }, {
    t: 41,
    h: 9
  }, {
    t: 42,
    h: 6
  }, {
    t: 43,
    h: 3
  }];
  const T0 = 23,
    Tb = 35,
    Tc = 29;
  const i_capFullT = t => i_capF35 + (i_capF29 - i_capF35) * (Tb - t) / (Tb - Tc);
  const i_powFullT = t => i_powF35 + (i_powF29 - i_powF35) * (Tb - t) / (Tb - Tc);
  const i_capHalfT = t => i_capF29 > 0 ? i_capFullT(t) * (i_capH35 / i_capF35) : i_capFullT(t) * 0.5;
  const i_powHalfT = t => i_powF29 > 0 ? i_powFullT(t) * (i_powH35 / i_powF35) : i_powFullT(t) * 0.5;
  const coolLoad = t => t > T0 ? i_capF35 / 1000 * (t - T0) / (Tb - T0) : 0;
  let CSTL = 0,
    CSEC = 0;
  indiaBins.forEach(({
    t,
    h
  }) => {
    const bld = coolLoad(t);
    if (bld <= 0) return;
    const cF = i_capFullT(t) / 1000,
      cH = i_capHalfT(t) / 1000;
    const pF = i_powFullT(t) / 1000,
      pH = i_powHalfT(t) / 1000;
    const eerF = cF / pF,
      eerH = cH / pH;
    const load = Math.min(bld, cF);
    CSTL += load * h;
    if (load <= cH) {
      const X = load / cH;
      CSEC += load / (eerH * (1 - i_Cd * (1 - X))) * h;
    } else if (bld <= cF) {
      const X = (load - cH) / (cF - cH);
      CSEC += load / (eerH + X * (eerF - eerH)) * h;
    } else {
      CSEC += cF / eerF * h;
    }
  });
  const ISEER = CSEC > 0 ? CSTL / CSEC : 0;
  function iseerStars(v) {
    if (v >= 5.20) return {
      stars: 5,
      label: "5 Star",
      color: "#22c55e"
    };
    if (v >= 4.70) return {
      stars: 4,
      label: "4 Star",
      color: "#86efac"
    };
    if (v >= 4.00) return {
      stars: 3,
      label: "3 Star",
      color: "#facc15"
    };
    if (v >= 3.50) return {
      stars: 2,
      label: "2 Star",
      color: "#fb923c"
    };
    return {
      stars: 1,
      label: "1 Star",
      color: "#f87171"
    };
  }
  const indiaRating = iseerStars(ISEER);
  const euBins = [{
    t: 20,
    h: 205
  }, {
    t: 25,
    h: 227
  }, {
    t: 30,
    h: 225
  }, {
    t: 35,
    h: 270
  }];
  const e_capT = t => e_capF35 + (e_capF29 - e_capF35) * (35 - t) / (35 - 29);
  const e_powT = t => e_powF35 + (e_powF29 - e_powF35) * (35 - t) / (35 - 29);
  const Pref = e_capF35 / 1000;
  let CSTL_EU = 0,
    CSEC_EU = 0;
  euBins.forEach(({
    t,
    h
  }) => {
    const pl = Math.max(0, (t - 16) / (35 - 16));
    const load = Pref * pl;
    if (load <= 0) return;
    const cap = Math.min(e_capT(t) / 1000, Pref);
    const pow = e_powT(t) / 1000;
    const eer = pow > 0 ? cap / pow : 0;
    CSTL_EU += load * h;
    if (load <= cap) {
      const X = load / cap;
      CSEC_EU += load / (eer * (1 - e_Cd * (1 - X))) * h;
    } else {
      CSEC_EU += cap / eer * h;
    }
  });
  const SEER_EU = CSEC_EU > 0 ? CSTL_EU / CSEC_EU : 0;
  function euClass(v) {
    if (v >= 8.5) return {
      cls: "A+++",
      color: "#166534",
      bg: "#bbf7d0"
    };
    if (v >= 6.1) return {
      cls: "A++",
      color: "#15803d",
      bg: "#dcfce7"
    };
    if (v >= 5.6) return {
      cls: "A+",
      color: "#16a34a",
      bg: "#f0fdf4"
    };
    if (v >= 5.1) return {
      cls: "A",
      color: "#65a30d",
      bg: "#f7fee7"
    };
    if (v >= 4.6) return {
      cls: "B",
      color: "#ca8a04",
      bg: "#fefce8"
    };
    if (v >= 4.1) return {
      cls: "C",
      color: "#d97706",
      bg: "#fffbeb"
    };
    if (v >= 3.6) return {
      cls: "D",
      color: "#ea580c",
      bg: "#fff7ed"
    };
    return {
      cls: "E",
      color: "#dc2626",
      bg: "#fef2f2"
    };
  }
  const euRating = euClass(SEER_EU);
  const indoorCorr = 0.997;
  const usBins = [{
    t: 67,
    h: 214
  }, {
    t: 72,
    h: 231
  }, {
    t: 77,
    h: 243
  }, {
    t: 82,
    h: 253
  }, {
    t: 87,
    h: 234
  }, {
    t: 92,
    h: 189
  }, {
    t: 97,
    h: 128
  }, {
    t: 102,
    h: 63
  }, {
    t: 107,
    h: 12
  }];
  const u_capAt = f => u_capA * indoorCorr + (u_capB - u_capA * indoorCorr) * (95 - f) / (95 - 82);
  const u_powAt = f => u_powA * indoorCorr + (u_powB - u_powA * indoorCorr) * (95 - f) / (95 - 82);
  const refCapUS = u_capA * indoorCorr / 1000;
  let CSTL_US = 0,
    CSEC_US = 0;
  usBins.forEach(({
    t,
    h
  }) => {
    const pl = Math.max(0, (t - 65) / (95 - 65));
    const load = refCapUS * pl;
    if (load <= 0) return;
    const cap = Math.min(u_capAt(t) / 1000, refCapUS);
    const pow = u_powAt(t) / 1000;
    const eer = pow > 0 ? cap / pow : 0;
    CSTL_US += load * h;
    if (load <= cap) {
      const X = load / cap;
      CSEC_US += load / (eer * (1 - u_Cd * (1 - X))) * h;
    } else {
      CSEC_US += cap / eer * h;
    }
  });
  const SEER_US = CSEC_US > 0 ? CSTL_US / CSEC_US * 3.412 : 0;
  const EER_US = u_capA * indoorCorr / u_powA / indoorCorr * 3.412;
  function usClass(v) {
    if (v >= 22) return {
      cls: "Energy Star",
      detail: "Top tier",
      color: "#15803d",
      bg: "#dcfce7"
    };
    if (v >= 18) return {
      cls: "High Eff.",
      detail: "Above std",
      color: "#65a30d",
      bg: "#f7fee7"
    };
    if (v >= 15) return {
      cls: "Standard",
      detail: "Meets min",
      color: "#ca8a04",
      bg: "#fefce8"
    };
    if (v >= 14) return {
      cls: "Marginal",
      detail: "Near min",
      color: "#ea580c",
      bg: "#fff7ed"
    };
    return {
      cls: "Below Min",
      detail: "Fails DOE min",
      color: "#dc2626",
      bg: "#fef2f2"
    };
  }
  const usRating = usClass(SEER_US);
  function euClassChiller(v) {
    if (v >= 6.4) return {
      cls: "A+++",
      color: "#166534",
      bg: "#bbf7d0"
    };
    if (v >= 5.5) return {
      cls: "A++",
      color: "#15803d",
      bg: "#dcfce7"
    };
    if (v >= 5.1) return {
      cls: "A+",
      color: "#16a34a",
      bg: "#f0fdf4"
    };
    if (v >= 4.6) return {
      cls: "A",
      color: "#65a30d",
      bg: "#f7fee7"
    };
    if (v >= 4.0) return {
      cls: "B",
      color: "#ca8a04",
      bg: "#fefce8"
    };
    if (v >= 3.5) return {
      cls: "C",
      color: "#d97706",
      bg: "#fffbeb"
    };
    if (v >= 3.0) return {
      cls: "D",
      color: "#ea580c",
      bg: "#fff7ed"
    };
    return {
      cls: "E",
      color: "#dc2626",
      bg: "#fef2f2"
    };
  }
  function tabStyle(id) {
    const on = tab === id;
    const cols = {
      iseer: '#fbbf24',
      eu: '#d4a843',
      us: '#a855f7'
    };
    const c = cols[id] || '#d4a843';
    return {
      flex: 1,
      padding: '8px 6px',
      borderRadius: 7,
      border: '1px solid',
      borderColor: on ? c : 'rgba(255,255,255,.08)',
      background: on ? `rgba(${id === 'iseer' ? '245,158,11' : id === 'eu' ? '56,189,248' : '139,92,246'},.12)` : 'rgba(255,255,255,.02)',
      color: on ? c : '#475569',
      fontFamily: 'DM Mono,monospace',
      fontSize: 11,
      cursor: 'pointer',
      transition: 'all .2s'
    };
  }
  const modeLabel = isAA ? "Air / Air" : isAL ? "Air / Liquid" : "Liquid / Liquid";
  return React.createElement("div", {
    className: "card",
    style: {
      borderColor: 'rgba(201,168,76,.15)',
      marginTop: 14
    }
  }, React.createElement("button", {
    className: "guide-btn",
    onClick: () => setOpen(v => !v),
    style: {
      marginBottom: open ? 14 : 0
    }
  }, React.createElement("span", null, "Energy Rating \u2014 ", modeLabel, " \xA0", React.createElement("span", {
    style: {
      fontSize: 10,
      opacity: .6
    }
  }, isAA ? "ISEER · SEER (EU) · SEER2 (US)" : "ESEER (EU) · IPLV (US)")), React.createElement("span", {
    style: {
      transition: 'transform .2s',
      transform: open ? 'rotate(180deg)' : 'none'
    }
  }, "\u25BC")), open && isAA && React.createElement("div", null, React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 10,
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.25)',
      borderRadius: 12,
      padding: '14px',
      border: '1px solid rgba(245,158,11,.25)',
      cursor: 'pointer',
      outline: tab === 'iseer' ? '2px solid #fbbf24' : 'none'
    },
    onClick: () => setTab('iseer')
  }, React.createElement("div", {
    style: {
      fontSize: 9,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: '#fbbf24',
      marginBottom: 8
    }
  }, "India BEE \u2014 ISEER"), React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 28,
      fontWeight: 800,
      color: indiaRating.color,
      lineHeight: 1
    }
  }, fn(ISEER, 2)), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#64748b',
      marginTop: 2,
      marginBottom: 8
    }
  }, "ISEER"), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.3)',
      borderRadius: 7,
      padding: '7px',
      textAlign: 'center'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 16,
      color: indiaRating.color
    }
  }, stars(indiaRating.stars)), React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 12,
      fontWeight: 700,
      color: indiaRating.color
    }
  }, indiaRating.label)), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#475569',
      marginTop: 8,
      lineHeight: 1.6
    }
  }, React.createElement("div", null, "CSTL: ", fn(CSTL / 1000, 2), " kWh/yr"), React.createElement("div", null, "CSEC: ", fn(CSEC, 2), " kWh/yr"), React.createElement("div", {
    style: {
      color: '#64748b',
      marginTop: 2
    }
  }, "5\u2605\u22655.20 \xB7 4\u2605\u22654.70 \xB7 3\u2605\u22654.00"))), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.25)',
      borderRadius: 12,
      padding: '14px',
      border: '1px solid rgba(201,168,76,.25)',
      cursor: 'pointer',
      outline: tab === 'eu' ? '2px solid #38bdf8' : 'none'
    },
    onClick: () => setTab('eu')
  }, React.createElement("div", {
    style: {
      fontSize: 9,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: '#d4a843',
      marginBottom: 8
    }
  }, "EU ErP / EN 14825"), React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 28,
      fontWeight: 800,
      color: '#d4a843',
      lineHeight: 1
    }
  }, fn(SEER_EU, 2)), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#64748b',
      marginTop: 2,
      marginBottom: 8
    }
  }, "SEER"), React.createElement("div", {
    style: {
      background: euRating.bg,
      borderRadius: 7,
      padding: '7px',
      textAlign: 'center',
      border: '1px solid ' + euRating.color
    }
  }, React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 20,
      fontWeight: 800,
      color: euRating.color
    }
  }, euRating.cls), React.createElement("div", {
    style: {
      fontSize: 10,
      color: euRating.color
    }
  }, "EU Energy Label")), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#475569',
      marginTop: 8,
      lineHeight: 1.6
    }
  }, React.createElement("div", null, "A+++\u22658.5 \xB7 A++\u22656.1 \xB7 A+\u22655.6"), React.createElement("div", null, "A\u22655.1 \xB7 B\u22654.6 \xB7 C\u22654.1"), React.createElement("div", {
    style: {
      color: '#64748b',
      marginTop: 2
    }
  }, "Strasbourg bins \xB7 No half-load test"))), React.createElement("div", {
    style: {
      background: 'rgba(0,0,0,.25)',
      borderRadius: 12,
      padding: '14px',
      border: '1px solid rgba(139,92,246,.25)',
      cursor: 'pointer',
      outline: tab === 'us' ? '2px solid #a855f7' : 'none'
    },
    onClick: () => setTab('us')
  }, React.createElement("div", {
    style: {
      fontSize: 9,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: '#a855f7',
      marginBottom: 8
    }
  }, "US AHRI 210/240"), React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 28,
      fontWeight: 800,
      color: '#a855f7',
      lineHeight: 1
    }
  }, fn(SEER_US, 1)), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#64748b',
      marginTop: 2,
      marginBottom: 8
    }
  }, "SEER2 (BTU/Wh)"), React.createElement("div", {
    style: {
      background: 'rgba(139,92,246,.1)',
      borderRadius: 7,
      padding: '7px',
      textAlign: 'center',
      border: '1px solid rgba(139,92,246,.3)'
    }
  }, React.createElement("div", {
    style: {
      fontFamily: 'Syne,sans-serif',
      fontSize: 13,
      fontWeight: 700,
      color: usRating.color
    }
  }, usRating.cls), React.createElement("div", {
    style: {
      fontSize: 10,
      color: '#64748b'
    }
  }, usRating.detail)), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#475569',
      marginTop: 8,
      lineHeight: 1.6
    }
  }, React.createElement("div", null, "EER (95F): ", fn(EER_US, 2), " BTU/Wh"), React.createElement("div", null, "E-Star\u226522 \xB7 Min\u226514"), React.createElement("div", {
    style: {
      color: '#64748b',
      marginTop: 2
    }
  }, "Fort Worth TX bins \xB7 Indoor 80\xB0F")))), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginBottom: 14
    }
  }, React.createElement("button", {
    style: tabStyle('iseer'),
    onClick: () => setTab('iseer')
  }, "India ISEER inputs"), React.createElement("button", {
    style: tabStyle('eu'),
    onClick: () => setTab('eu')
  }, "EU SEER inputs"), React.createElement("button", {
    style: tabStyle('us'),
    onClick: () => setTab('us')
  }, "US SEER2 inputs")), tab === 'iseer' && React.createElement("div", {
    style: {
      background: 'rgba(245,158,11,.05)',
      border: '1px solid rgba(245,158,11,.15)',
      borderRadius: 10,
      padding: '14px 16px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#fbbf24',
      letterSpacing: '.15em',
      textTransform: 'uppercase',
      marginBottom: 12
    }
  }, "ISEER Test Data \u2014 IS 1391 Part 2"), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#64748b',
      marginBottom: 12,
      lineHeight: 1.6
    }
  }, "Full + half load tested at 35\xB0C DB / 24\xB0C WB outdoor, 27\xB0C DB / 19\xB0C WB indoor. 29\xB0C values are declared by manufacturer (measured at 29\xB0C DB outdoor). Half load scaled proportionally from 29\xB0C full load."), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 14
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#fbbf24',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "35\xB0C \u2014 Full load"), React.createElement(NumField, {
    label: "Capacity",
    val: i_capF35,
    set: setI_capF35,
    utag: "W"
  }), React.createElement(NumField, {
    label: "Power",
    val: i_powF35,
    set: setI_powF35,
    utag: "W"
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 4
    }
  }, "EER: ", fn(i_capF35 / i_powF35, 3))), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#fbbf24',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "35\xB0C \u2014 Half load (locked 50%)"), React.createElement(NumField, {
    label: "Capacity",
    val: i_capH35,
    set: setI_capH35,
    utag: "W"
  }), React.createElement(NumField, {
    label: "Power",
    val: i_powH35,
    set: setI_powH35,
    utag: "W"
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 4
    }
  }, "EER: ", fn(i_capH35 / i_powH35, 3))), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#fbbf24',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "29\xB0C \u2014 Curve ref (full only)"), React.createElement(NumField, {
    label: "Capacity",
    val: i_capF29,
    set: setI_capF29,
    utag: "W"
  }), React.createElement(NumField, {
    label: "Power",
    val: i_powF29,
    set: setI_powF29,
    utag: "W"
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 4
    }
  }, "EER: ", fn(i_capF29 / i_powF29, 3)), React.createElement(NumField, {
    label: "Degradation coeff. Cd",
    val: i_Cd,
    set: setI_Cd,
    utag: "0\u20131",
    step: 0.01
  })))), tab === 'eu' && React.createElement("div", {
    style: {
      background: 'rgba(201,168,76,.05)',
      border: '1px solid rgba(201,168,76,.15)',
      borderRadius: 10,
      padding: '14px 16px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#d4a843',
      letterSpacing: '.15em',
      textTransform: 'uppercase',
      marginBottom: 12
    }
  }, "EU SEER Test Data \u2014 EN 14825 / ErP Reg 2016/2281"), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#64748b',
      marginBottom: 12,
      lineHeight: 1.6
    }
  }, "EU uses full load test at 35\xB0C and a 29\xB0C reference point for bin interpolation. No half-load test \u2014 EU uses continuous capacity interpolation across 4 Strasbourg bins. Indoor: 27\xB0C DB / 19\xB0C WB."), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 14
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#d4a843',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "35\xB0C \u2014 Full load"), React.createElement(NumField, {
    label: "Capacity",
    val: e_capF35,
    set: setE_capF35,
    utag: "W"
  }), React.createElement(NumField, {
    label: "Power",
    val: e_powF35,
    set: setE_powF35,
    utag: "W"
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 4
    }
  }, "EER: ", fn(e_capF35 / e_powF35, 3))), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#d4a843',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "29\xB0C \u2014 Curve reference"), React.createElement(NumField, {
    label: "Capacity",
    val: e_capF29,
    set: setE_capF29,
    utag: "W"
  }), React.createElement(NumField, {
    label: "Power",
    val: e_powF29,
    set: setE_powF29,
    utag: "W"
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 4
    }
  }, "EER: ", fn(e_capF29 / e_powF29, 3))), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#d4a843',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "Bins used (Strasbourg)"), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#475569',
      lineHeight: 1.8,
      background: 'rgba(0,0,0,.2)',
      borderRadius: 6,
      padding: '8px 10px'
    }
  }, React.createElement("div", null, "20\xB0C \u2014 205 hours"), React.createElement("div", null, "25\xB0C \u2014 227 hours"), React.createElement("div", null, "30\xB0C \u2014 225 hours"), React.createElement("div", null, "35\xB0C \u2014 270 hours"), React.createElement("div", {
    style: {
      marginTop: 4,
      color: '#d4a843'
    }
  }, "Total: 927 hours")), React.createElement(NumField, {
    label: "Degradation coeff. Cd",
    val: e_Cd,
    set: setE_Cd,
    utag: "0\u20131",
    step: 0.01
  })))), tab === 'us' && React.createElement("div", {
    style: {
      background: 'rgba(139,92,246,.05)',
      border: '1px solid rgba(139,92,246,.15)',
      borderRadius: 10,
      padding: '14px 16px'
    }
  }, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#a855f7',
      letterSpacing: '.15em',
      textTransform: 'uppercase',
      marginBottom: 12
    }
  }, "US SEER2 Test Data \u2014 AHRI 210/240-2023"), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#64748b',
      marginBottom: 12,
      lineHeight: 1.6
    }
  }, "A-test at 95\xB0F (35\xB0C), B-test at 82\xB0F (27.8\xB0C). Indoor = 80\xB0F (26.7\xB0C) \u2014 0.3\xB0C lower than ISEER/EU. Capacity correction factor 0.997 applied. Result in BTU/Wh."), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 14
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#a855f7',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "A-test \u2014 95\xB0F (35\xB0C)"), React.createElement(NumField, {
    label: "Capacity",
    val: u_capA,
    set: setU_capA,
    utag: "W"
  }), React.createElement(NumField, {
    label: "Power",
    val: u_powA,
    set: setU_powA,
    utag: "W"
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 4
    }
  }, "EER: ", fn(u_capA / u_powA, 3), " W/W = ", fn(u_capA / u_powA * 3.412, 3), " BTU/Wh")), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#a855f7',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "B-test \u2014 82\xB0F (27.8\xB0C)"), React.createElement(NumField, {
    label: "Capacity",
    val: u_capB,
    set: setU_capB,
    utag: "W"
  }), React.createElement(NumField, {
    label: "Power",
    val: u_powB,
    set: setU_powB,
    utag: "W"
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 4
    }
  }, "EER: ", fn(u_capB / u_powB, 3), " W/W")), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#a855f7',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '.08em'
    }
  }, "Climate bins (Fort Worth TX)"), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#475569',
      lineHeight: 1.7,
      background: 'rgba(0,0,0,.2)',
      borderRadius: 6,
      padding: '8px 10px'
    }
  }, React.createElement("div", null, "67\xB0F \u2014 214h \xB7 72\xB0F \u2014 231h"), React.createElement("div", null, "77\xB0F \u2014 243h \xB7 82\xB0F \u2014 253h"), React.createElement("div", null, "87\xB0F \u2014 234h \xB7 92\xB0F \u2014 189h"), React.createElement("div", null, "97\xB0F \u2014 128h \xB7 102\xB0F \u2014 63h"), React.createElement("div", null, "107\xB0F \u2014 12h"), React.createElement("div", {
    style: {
      marginTop: 4,
      color: '#a855f7'
    }
  }, "Total: 1567 hours")), React.createElement(NumField, {
    label: "Degradation coeff. Cd",
    val: u_Cd,
    set: setU_Cd,
    utag: "0\u20131",
    step: 0.01
  })))), React.createElement("div", {
    className: "gtip",
    style: {
      marginTop: 12
    }
  }, React.createElement("strong", null, "Key difference \u2014 EU vs ISEER:"), " EU EN 14825 does NOT use a half-load test. It uses continuous capacity interpolation between the 35\xB0C and 29\xB0C full-load points across 4 Strasbourg climate bins. ISEER uses a locked 50% half-load test at 35\xB0C as a specific operating point, then scales it across bins. Each standard uses completely independent input data \u2014 changing one does not affect the others.")), open && (isAL || isLL) && React.createElement("div", null, React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      marginBottom: 14
    }
  }, React.createElement("div", {
    style: {
      background: 'rgba(201,168,76,.07)',
      border: '1px solid rgba(201,168,76,.2)',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 9,
      color: '#d4a843',
      lineHeight: 1.7
    }
  }, React.createElement("strong", null, "EU \u2014 EN 14511 EER"), React.createElement("br", null), isAL ? 'Q = 4.18 x V(L/s) x dT_water' : 'Q = V x rho x cp x dT', React.createElement("br", null), "EER = Q_cold / P_el", React.createElement("br", null), "Rated at: CW 7\xB0C supply / 12\xB0C return"), React.createElement("div", {
    style: {
      background: 'rgba(139,92,246,.07)',
      border: '1px solid rgba(139,92,246,.2)',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 9,
      color: '#c4b5fd',
      lineHeight: 1.7
    }
  }, React.createElement("strong", null, "US \u2014 AHRI 550/590 EER"), React.createElement("br", null), "Same Q formula, result in BTU/Wh", React.createElement("br", null), "EER_BTU = EER_WW x 3.412", React.createElement("br", null), "Rated at: CW 6.7\xB0C / 12.2\xB0C")), React.createElement("div", {
    className: "slbl"
  }, "Measured Data \u2014 Direct EER Calculation"), React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 14,
      marginBottom: 14
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#d4a843',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, isAL ? 'Water Side (Chilled Water)' : 'Cold Side (Chilled Water)'), React.createElement(NumField, {
    label: "T inlet",
    val: al_wTi,
    set: setAl_wTi,
    utag: "\xB0C",
    step: 0.0001
  }), React.createElement(NumField, {
    label: "T outlet",
    val: al_wTo,
    set: setAl_wTo,
    utag: "\xB0C",
    step: 0.0001
  }), React.createElement(NumField, {
    label: "Flow",
    val: al_wF,
    set: setAl_wF,
    utag: "L/s",
    step: 0.0001
  }), !isAL && React.createElement(NumField, {
    label: "Glycol %",
    val: al_gly,
    set: setAl_gly,
    utag: "%",
    step: 1
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 6
    }
  }, "dT = ", fn(Math.abs(al_wTo - al_wTi), 4), " K", React.createElement("br", null), "Q = ", fn(isAL ? 4.18 * al_wF * Math.abs(al_wTo - al_wTi) : (4.18 - (4.18 - 2.38) * (al_gly / 100)) * al_wF * (1 + 0.0012 * al_gly) * Math.abs(al_wTo - al_wTi), 4), " kW")), isLL && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#fbbf24',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, "Hot Side (Condenser)"), React.createElement(NumField, {
    label: "T inlet",
    val: al_hTi,
    set: setAl_hTi,
    utag: "\xB0C",
    step: 0.0001
  }), React.createElement(NumField, {
    label: "T outlet",
    val: al_hTo,
    set: setAl_hTo,
    utag: "\xB0C",
    step: 0.0001
  }), React.createElement(NumField, {
    label: "Flow",
    val: al_hF,
    set: setAl_hF,
    utag: "L/s",
    step: 0.0001
  }), React.createElement(NumField, {
    label: "Glycol %",
    val: al_hGly,
    set: setAl_hGly,
    utag: "%",
    step: 1
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#94a3b8',
      marginTop: 6
    }
  }, "dT = ", fn(Math.abs(al_hTi - al_hTo), 4), " K", React.createElement("br", null), "Q_hot = ", fn((4.18 - (4.18 - 2.38) * (al_hGly / 100)) * al_hF * (1 + 0.0012 * al_hGly) * Math.abs(al_hTi - al_hTo), 4), " kW")), isAL && React.createElement("div", null), React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#a855f7',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, "Electrical Input"), React.createElement(NumField, {
    label: "Compressor power",
    val: al_pw,
    set: setAl_pw,
    utag: "kW",
    step: 0.0001
  }), React.createElement("div", {
    style: {
      fontSize: 9,
      color: '#64748b',
      marginTop: 8,
      lineHeight: 1.6
    }
  }, "EER = Q_cold / P_el", React.createElement("br", null), "EER_BTU = EER x 3.412"))), (() => {
    const cpC = isLL ? 4.18 - (4.18 - 2.38) * (al_gly / 100) : 4.18;
    const rC = isLL ? 1 + 0.0012 * al_gly : 1.0;
    const Qc = isAL ? 4.18 * al_wF * Math.abs(al_wTo - al_wTi) : cpC * al_wF * rC * Math.abs(al_wTo - al_wTi);
    const cpH = 4.18 - (4.18 - 2.38) * (al_hGly / 100);
    const rH = 1 + 0.0012 * al_hGly;
    const Qh = isLL ? cpH * al_hF * rH * Math.abs(al_hTi - al_hTo) : Qc + al_pw;
    const eer = al_pw > 0 ? Qc / al_pw : 0;
    const eerBTU = eer * 3.412;
    const bal = Qc > 0 ? (Qh - Qc) / Qc * 100 : 0;
    const ec = eer >= 4 ? '#22c55e' : eer >= 3 ? '#86efac' : eer >= 2.5 ? '#facc15' : '#f87171';
    function euCh(v) {
      if (v >= 6.4) return {
        cls: 'A+++',
        color: '#166534',
        bg: '#bbf7d0'
      };
      if (v >= 5.5) return {
        cls: 'A++',
        color: '#15803d',
        bg: '#dcfce7'
      };
      if (v >= 5.1) return {
        cls: 'A+',
        color: '#16a34a',
        bg: '#f0fdf4'
      };
      if (v >= 4.6) return {
        cls: 'A',
        color: '#65a30d',
        bg: '#f7fee7'
      };
      if (v >= 4.0) return {
        cls: 'B',
        color: '#ca8a04',
        bg: '#fefce8'
      };
      if (v >= 3.5) return {
        cls: 'C',
        color: '#d97706',
        bg: '#fffbeb'
      };
      if (v >= 3.0) return {
        cls: 'D',
        color: '#ea580c',
        bg: '#fff7ed'
      };
      return {
        cls: 'E',
        color: '#dc2626',
        bg: '#fef2f2'
      };
    }
    const eR = euCh(eer);
    return React.createElement("div", null, React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12,
        marginBottom: 12
      }
    }, React.createElement("div", {
      style: {
        background: 'rgba(0,0,0,.25)',
        borderRadius: 12,
        padding: '14px',
        border: '1px solid rgba(201,168,76,.25)'
      }
    }, React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#d4a843',
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        marginBottom: 8
      }
    }, "Q Cold \u2014 Cooling Output"), React.createElement("div", {
      style: {
        fontFamily: 'Syne,sans-serif',
        fontSize: 28,
        fontWeight: 800,
        color: '#d4a843',
        lineHeight: 1
      }
    }, fn(Qc, 4)), React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2
      }
    }, "kW"), React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#475569',
        marginTop: 8
      }
    }, fn(Qc * 3412.14, 0), " BTU/h", React.createElement("br", null), fn(Qc / 3.517, 4), " tons")), React.createElement("div", {
      style: {
        background: 'rgba(0,0,0,.25)',
        borderRadius: 12,
        padding: '14px',
        border: '1px solid ' + ec + '66'
      }
    }, React.createElement("div", {
      style: {
        fontSize: 9,
        color: ec,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        marginBottom: 8
      }
    }, "Cooling COP (W/W)"), React.createElement("div", {
      style: {
        fontFamily: 'Syne,sans-serif',
        fontSize: 28,
        fontWeight: 800,
        color: ec,
        lineHeight: 1
      }
    }, fn(eer, 4)), React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2
      }
    }, "W/W"), React.createElement("div", {
      style: {
        background: eR.bg,
        borderRadius: 7,
        padding: '6px 8px',
        textAlign: 'center',
        border: '1px solid ' + eR.color,
        marginTop: 8
      }
    }, React.createElement("div", {
      style: {
        fontFamily: 'Syne,sans-serif',
        fontSize: 16,
        fontWeight: 800,
        color: eR.color
      }
    }, eR.cls), React.createElement("div", {
      style: {
        fontSize: 9,
        color: eR.color
      }
    }, "EU EN 14511")), React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#475569',
        marginTop: 8
      }
    }, fn(eerBTU, 4), " BTU/Wh (US)")), React.createElement("div", {
      style: {
        background: Math.abs(bal) > 10 ? 'rgba(248,113,113,.06)' : 'rgba(34,197,94,.06)',
        borderRadius: 12,
        padding: '14px',
        border: '1px solid ' + (Math.abs(bal) > 10 ? 'rgba(248,113,113,.3)' : 'rgba(34,197,94,.3)')
      }
    }, React.createElement("div", {
      style: {
        fontSize: 9,
        color: Math.abs(bal) > 10 ? '#f87171' : '#22c55e',
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        marginBottom: 8
      }
    }, isLL ? 'Energy Balance' : 'Heat Rejection'), React.createElement("div", {
      style: {
        fontFamily: 'Syne,sans-serif',
        fontSize: 28,
        fontWeight: 800,
        color: Math.abs(bal) > 10 ? '#f87171' : '#22c55e',
        lineHeight: 1
      }
    }, fn(Qh, 4)), React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2
      }
    }, isLL ? 'kW (hot side)' : 'kW (Q_cold + P_el)'), React.createElement("div", {
      style: {
        fontSize: 9,
        color: Math.abs(bal) > 10 ? '#f87171' : '#22c55e',
        marginTop: 8
      }
    }, isLL ? `Balance: ${fn(Math.abs(bal), 2)}% deviation` : `Expected: ${fn(Qc + al_pw, 4)} kW`, React.createElement("br", null), Math.abs(bal) > 10 ? 'Check measurements' : '✓ OK'))), React.createElement("div", {
      className: "fml"
    }, isAL && React.createElement(React.Fragment, null, React.createElement("strong", null, "Q"), " = 4.18 x ", fn(al_wF, 4), " L/s x ", fn(Math.abs(al_wTo - al_wTi), 4), " K = ", React.createElement("strong", null, fn(Qc, 4), " kW"), React.createElement("br", null)), isLL && React.createElement(React.Fragment, null, React.createElement("strong", null, "Q_cold"), " = ", fn(al_wF, 4), " x ", fn(rC, 3), " x ", fn(cpC, 3), " x ", fn(Math.abs(al_wTo - al_wTi), 4), " = ", React.createElement("strong", null, fn(Qc, 4), " kW"), React.createElement("br", null)), React.createElement("strong", null, "EER"), " = ", fn(Qc, 4), " / ", fn(al_pw, 4), " = ", React.createElement("strong", null, fn(eer, 4)), " W/W = ", React.createElement("strong", null, fn(eerBTU, 4)), " BTU/Wh"));
  })()));
}
(function loadSuperheatedGrid() {
  if (typeof fetch === 'undefined') return;
  fetch('superheated_grid.json').then(function (r) {
    return r.ok ? r.json() : null;
  }).then(function (data) {
    if (data && data.meta && data.SH) {
      window.__PH_SH__ = data;
      PH_SH = data;
      if (window.__NDT_RERENDER__) window.__NDT_RERENDER__();
    }
  }).catch(function () {});
})();
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));

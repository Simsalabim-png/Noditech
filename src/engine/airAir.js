'use strict';

/**
 * Air/Air capacity engine (pure) — SINGLE SOURCE used by both the browser UI and
 * the evaluator. Implements the exact pc6 Air/Air path:
 *
 *   afs = af/3600 ; mf = afs / vRef ; dh = max(0, hE - hL) ; Q = mf * dh
 *   dT = eDB - lDB ; cpMA = 1.006 + 1.86*WE ; sr = clamp(cpMA*dT/dh, 0, 1)
 *   qs = Q*sr ; ql = Q - qs
 *
 * Difference from pc6's inline version: the airflow reference (entering vs leaving
 * specific volume) is EXPLICIT and must be supplied — never guessed. The browser
 * result must come from this same function (no second formula in the UI).
 *
 * Capacities in kW (kJ/kg · kg/s). Pressure in Pa.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./psychrometrics.js'));
  } else {
    root.NoditechAirAir = factory(root.NoditechPsychrometrics);
  }
})(typeof self !== 'undefined' ? self : this, function (psy) {
  const PRESSURE_MIN_PA = 50000;   // 50 kPa  (matches production accepted range)
  const PRESSURE_MAX_PA = 110000;  // 110 kPa
  const RH_NEAR_SATURATION = 98;   // warn threshold
  const SHR_NEAR_LIMIT = 0.02;     // warn if sr within this of 0 or 1
  // Consistency tolerances for an optional non-selected field (structural cross-check,
  // NOT a lab acceptance threshold):
  const WB_CONSISTENCY_TOL_C = 0.2;
  const RH_CONSISTENCY_TOL_PCT = 1.5;

  function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function blocked(code, field, warnings) {
    return { status: 'blocked', code, field: field || null, result: null, warnings: warnings || [] };
  }

  // Build a normalized state from an EXPLICIT input method. The method is never
  // guessed from which fields are present. Returns {ok:false, code, field} on a
  // blocking condition, or {ok:true, state, warnings} otherwise.
  function buildState(side, label, pressurePa) {
    if (!side || !isNum(side.dbC)) return { ok: false, code: 'db_invalid', field: `${label}.dbC` };

    const method = side.inputMethod;
    if (method !== 'rh' && method !== 'wb') {
      return { ok: false, code: 'state_input_method_invalid', field: `${label}.inputMethod` };
    }

    if (method === 'rh') {
      if (!isNum(side.rhPct)) return { ok: false, code: 'rh_missing', field: `${label}.rhPct` };
      if (side.rhPct <= 0 || side.rhPct > 100) return { ok: false, code: 'rh_out_of_range', field: `${label}.rhPct` };
      if (isNum(side.wbC) && side.wbC > side.dbC + 1e-9) return { ok: false, code: 'wb_gt_db', field: `${label}.wbC` };
      const st = psy.stateFromDBRH(side.dbC, side.rhPct, pressurePa);
      const fin = finalizeState(st, label);
      if (!fin.ok) return fin;
      const warnings = [];
      // Optional non-selected wbC: ignore in the calc, but cross-check consistency.
      if (isNum(side.wbC) && Math.abs(st.wbC - side.wbC) > WB_CONSISTENCY_TOL_C) {
        warnings.push({ code: 'state_input_inconsistent', field: `${label}.wbC` });
      }
      return { ok: true, state: fin.state, warnings };
    }

    // method === 'wb'
    if (!isNum(side.wbC)) return { ok: false, code: 'wb_missing', field: `${label}.wbC` };
    if (side.wbC > side.dbC + 1e-9) return { ok: false, code: 'wb_gt_db', field: `${label}.wbC` };
    const st = psy.stateFromDBWB(side.dbC, side.wbC, pressurePa);
    if (!st.ok) return { ok: false, code: st.reason === 'wb_gt_db' ? 'wb_gt_db' : 'wb_not_attainable', field: `${label}.wbC` };
    const fin = finalizeState(st, label);
    if (!fin.ok) return fin;
    const warnings = [];
    // Optional non-selected rhPct: ignore in the calc, but cross-check consistency.
    if (isNum(side.rhPct) && Math.abs(st.rhPct - side.rhPct) > RH_CONSISTENCY_TOL_PCT) {
      warnings.push({ code: 'state_input_inconsistent', field: `${label}.rhPct` });
    }
    return { ok: true, state: fin.state, warnings };
  }

  function finalizeState(st, label) {
    if (!isNum(st.specificVolumeM3kg) || st.specificVolumeM3kg <= 0) {
      return { ok: false, code: 'non_physical_specific_volume', field: `${label}` };
    }
    if (!isNum(st.enthalpyKJkg) || !isNum(st.humidityRatio)) {
      return { ok: false, code: 'non_physical_state', field: `${label}` };
    }
    return { ok: true, state: st };
  }

  /**
   * @param {object} input
   *   entering: { dbC, rhPct?|wbC? }
   *   leaving:  { dbC, rhPct?|wbC? }
   *   airflowM3h: number
   *   airflowReference: 'entering' | 'leaving'   (required; never guessed)
   *   pressurePa: number
   *   mode?: 'cooling' (default)
   *   airflowFreeGrate?: boolean        (warn — free-grate measurement)
   *   airflowReferenceCertain?: boolean (default true; false => warn)
   * @returns {{status, code, result, warnings}}
   */
  function computeAirAir(input) {
    input = input || {};
    const warnings = [];
    const P = input.pressurePa;
    const mode = input.mode || 'cooling';

    // pressure
    if (!isNum(P)) return blocked('pressure_non_finite', 'pressurePa');
    if (P <= 0) return blocked('pressure_non_positive', 'pressurePa');
    if (P < PRESSURE_MIN_PA) return blocked('pressure_below_range', 'pressurePa');
    if (P > PRESSURE_MAX_PA) return blocked('pressure_above_range', 'pressurePa');

    // states
    const e = buildState(input.entering, 'entering', P);
    if (!e.ok) return blocked(e.code, e.field);
    const l = buildState(input.leaving, 'leaving', P);
    if (!l.ok) return blocked(l.code, l.field);
    if (e.warnings) warnings.push(...e.warnings);
    if (l.warnings) warnings.push(...l.warnings);
    const E = e.state, L = l.state;

    // airflow
    if (!isNum(input.airflowM3h) || input.airflowM3h <= 0) return blocked('airflow_invalid', 'airflowM3h');

    // airflow reference — explicit, never guessed
    const ref = input.airflowReference;
    if (ref !== 'entering' && ref !== 'leaving') return blocked('airflow_reference_missing', 'airflowReference');
    const vRef = ref === 'leaving' ? L.specificVolumeM3kg : E.specificVolumeM3kg;
    if (!isNum(vRef) || vRef <= 0) return blocked('non_physical_specific_volume', 'airflowReference');

    // cooling-mode physical guard: leaving enthalpy must be below entering
    const hE = E.enthalpyKJkg, hL = L.enthalpyKJkg;
    if (mode === 'cooling' && hL >= hE) return blocked('leaving_enthalpy_ge_entering', 'leaving');

    // capacity path (verbatim pc6 definitions)
    const afs = input.airflowM3h / 3600;
    const mf = afs / vRef;                       // dry-air mass flow, kg/s
    const dh = Math.max(0, hE - hL);             // kJ/kg
    const Q = mf * dh;                           // kW (total)
    const dT = E.dbC - L.dbC;
    const WE = E.humidityRatio;
    const cpMA = 1.006 + 1.86 * WE;
    const sr = dh > 0 ? clamp(cpMA * dT / dh, 0, 1) : 0;
    const qs = Q * sr;
    const ql = Q - qs;

    if (![mf, Q, qs, ql, sr].every(isNum)) return blocked('non_finite_capacity', null);
    if (Q < 0 || qs < 0 || ql < 0) return blocked('negative_capacity', null);

    // warnings (do not block)
    if (L.rhPct >= RH_NEAR_SATURATION) warnings.push({ code: 'leaving_near_saturation', field: 'leaving' });
    if (input.airflowFreeGrate) warnings.push({ code: 'airflow_free_grate', field: 'airflowM3h' });
    if (input.airflowReferenceCertain === false) warnings.push({ code: 'airflow_reference_uncertain', field: 'airflowReference' });
    if (sr <= SHR_NEAR_LIMIT || sr >= 1 - SHR_NEAR_LIMIT) warnings.push({ code: 'shr_near_physical_limit', field: 'shr' });

    const result = {
      entering: publicState(E),
      leaving: publicState(L),
      airflowM3h: input.airflowM3h,
      airflowReference: ref,
      dryAirMassFlowKgS: mf,
      totalCapacityKW: Q,
      sensibleCapacityKW: qs,
      latentCapacityKW: ql,
      shr: sr,
      pressurePa: P,
      mode,
    };
    return { status: warnings.length ? 'warning' : 'valid', code: 'ok', result, warnings };
  }

  function publicState(st) {
    return {
      dbC: st.dbC,
      wbC: st.wbC,
      rhPct: st.rhPct,
      humidityRatio: st.humidityRatio,
      enthalpyKJkg: st.enthalpyKJkg,
      specificVolumeM3kg: st.specificVolumeM3kg,
      dewPointC: st.dewPointC,
    };
  }

  // Build a single side's engine input from the SELECTED method only. The
  // non-selected field is never included (no stale rhPct in wb mode, no stale wbC
  // in rh mode) — this prevents artificial state_input_inconsistent warnings.
  function sideInput(method, dbC, rhPct, wbC) {
    return method === 'wb'
      ? { inputMethod: 'wb', dbC: dbC, wbC: wbC }
      : { inputMethod: 'rh', dbC: dbC, rhPct: rhPct };
  }

  return { computeAirAir, sideInput, PRESSURE_MIN_PA, PRESSURE_MAX_PA };
});

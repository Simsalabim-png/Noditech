'use strict';

/**
 * Shared psychrometric engine — SINGLE SOURCE OF TRUTH for both the browser UI and
 * the evaluator. The primitive functions below are copied VERBATIM from the real
 * production engine (tests/engine.js, lines pSat/humR/enth/sVol/wBulb/dewPt) so the
 * physics is identical to Kalkulator_build9.7-pc6.html. They are NOT re-derived or
 * approximated. An equivalence test (tests/engine/psychrometrics-equivalence.test.js)
 * asserts numeric identity against the production engine.
 *
 * Units: temperature °C, pressure Pa (default 101500 Pa, matching production),
 * humidity ratio kg/kg dry air, enthalpy kJ/kg dry air, specific volume m³/kg dry air.
 *
 * UMD: works as a CommonJS module (Node tests + evaluator) and attaches to the
 * browser global so the UI imports the SAME functions (no second copy in the UI).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NoditechPsychrometrics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // ---- VERBATIM production primitives (do not edit physics) ----------------
  function pSat(T) { return 611.21 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T))); }
  function humR(T, RH, p = 101500) { const pv = (RH / 100) * pSat(T); return 0.622 * pv / (p - pv); }
  function enth(T, RH, p = 101500) { const W = humR(T, RH, p); return 1.006 * T + W * (2501 + 1.86 * T); }
  function sVol(T, RH, p = 101500) { const pv = (RH / 100) * pSat(T); return 287.058 * (T + 273.15) / (p - pv); }
  function wBulb(T, RH, p = 101500) {
    const pv = (RH / 100) * pSat(T); let Tw = T - (1 - RH / 100) * 10;
    // Sprung coefficient A = 66 Pa/°C at sea level, scales with pressure
    const A = 66 * (p / 101500);
    for (let i = 0; i < 60; i++) { const f = pSat(Tw) - A * (T - Tw) - pv; const df = (pSat(Tw + 0.001) - pSat(Tw - 0.001)) / 0.002 + A; const d = f / df; Tw -= d; if (Math.abs(d) < 0.0001) break; }
    return Tw;
  }
  function dewPt(T, RH) {
    // Magnus formula — accurate to ±0.35°C for 0-60°C
    const a = 17.625, b = 243.04;
    const alpha = Math.log(Math.max(RH, 0.01) / 100) + a * T / (b + T);
    return b * alpha / (a - alpha);
  }

  // ---- DB+WB -> RH inversion using the production wBulb (monotonic in RH) ---
  // Returns { ok, rhPct } or { ok:false, reason }. No separate approximate WB
  // formula is used — we invert the SAME wBulb the rest of the engine uses.
  function rhFromWetBulb(dbC, wbC, p = 101500) {
    if (!(typeof dbC === 'number' && Number.isFinite(dbC))) return { ok: false, reason: 'db_invalid' };
    if (!(typeof wbC === 'number' && Number.isFinite(wbC))) return { ok: false, reason: 'wb_invalid' };
    // Non-finite / non-positive pressure must FAIL — never let the bisection collapse
    // to a spurious ~0 % RH (that produced the "RH (derived): 0.00 %" UI bug).
    if (!(typeof p === 'number' && Number.isFinite(p) && p > 0)) return { ok: false, reason: 'pressure_invalid' };
    if (wbC > dbC + 1e-9) return { ok: false, reason: 'wb_gt_db' };
    let lo = 1e-4, hi = 100;
    const fLo = wBulb(dbC, lo, p) - wbC;
    if (fLo > 0) return { ok: false, reason: 'wb_below_attainable' }; // even at ~0% RH, wb exceeds target
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      const fm = wBulb(dbC, mid, p) - wbC;
      if (fm === 0) { lo = hi = mid; break; }
      if (fm < 0) lo = mid; else hi = mid;
      if (hi - lo < 1e-7) break;
    }
    return { ok: true, rhPct: (lo + hi) / 2 };
  }

  // ---- Normalized air state -----------------------------------------------
  function stateFromDBRH(dbC, rhPct, p = 101500) {
    return {
      dbC,
      rhPct,
      wbC: wBulb(dbC, rhPct, p),
      humidityRatio: humR(dbC, rhPct, p),
      enthalpyKJkg: enth(dbC, rhPct, p),
      specificVolumeM3kg: sVol(dbC, rhPct, p),
      dewPointC: dewPt(dbC, rhPct),
    };
  }

  function stateFromDBWB(dbC, wbC, p = 101500) {
    const inv = rhFromWetBulb(dbC, wbC, p);
    if (!inv.ok) return { ok: false, reason: inv.reason };
    const st = stateFromDBRH(dbC, inv.rhPct, p);
    // A physically valid state must have finite W / v / h — otherwise fail explicitly
    // (so the UI shows blocked, not a fabricated 0 % RH).
    if (!Number.isFinite(st.humidityRatio) || !Number.isFinite(st.specificVolumeM3kg) || !Number.isFinite(st.enthalpyKJkg) || !Number.isFinite(st.rhPct) || st.rhPct <= 0) {
      return { ok: false, reason: 'non_physical_state' };
    }
    st.wbC = wbC; // honor the measured wet-bulb exactly
    return Object.assign({ ok: true }, st);
  }

  return { pSat, humR, enth, sVol, wBulb, dewPt, rhFromWetBulb, stateFromDBRH, stateFromDBWB };
});

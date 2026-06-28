'use strict';

/**
 * Per-region / per-metric error aggregation for private validation.
 *
 * CONFIDENTIALITY: this module is public code, but the NUMBERS it produces are
 * derived confidential figures ("avledede konfidensielle tall"). The caller must
 * route the aggregate output ONLY to the local, git-ignored private report.
 * Never print deviation values to stdout/CI/repo. A counts-only summary
 * (`publicRegionCounts`) is provided for safe public output.
 *
 * Input: the harness "detailed" array, where each evaluated metric entry has the
 * shape { verdict, signed_pct, abs_pct, tolerance_pct }. Entries without a finite
 * `signed_pct` (SKIP / no_prediction) are excluded from deviation statistics but
 * still counted in verdict tallies.
 *
 * Zero dependencies; deterministic.
 */

const { METRICS } = require('./schema');

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function mean(xs) {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function maxAbs(xs) {
  if (xs.length === 0) return null;
  return xs.reduce((m, v) => (Math.abs(v) > Math.abs(m) ? v : m), xs[0]);
}

/**
 * Aggregate a list of signed-% deviations into the required error measures.
 * @param {number[]} signed list of signed percent deviations
 */
function aggregateDeviations(signed) {
  const abs = signed.map((v) => Math.abs(v));
  return {
    n: signed.length,
    mean_signed_pct: mean(signed),     // gjennomsnittsavvik (signert)
    mean_abs_pct: mean(abs),           // absolutt prosentavvik (snitt)
    median_signed_pct: median(signed), // medianavvik
    median_abs_pct: median(abs),
    max_abs_pct: abs.length ? Math.max(...abs) : null, // maksimalfeil (størrelse)
    worst_signed_pct: maxAbs(signed),  // signert verdi ved maksimalfeil (retning)
  };
}

function emptyVerdictTally() {
  return { pass: 0, fail: 0, skip: 0 };
}

/**
 * Compute full aggregates from the harness detailed results.
 *
 * @param {Array<object>} detailed harness detailed case results
 * @returns {{
 *   overall: {byMetric: Record<string, object>, combined: object, verdicts: object},
 *   byRegion: Record<string, {byMetric: Record<string, object>, combined: object, verdicts: object}>
 * }}
 */
function computeAggregates(detailed) {
  const signedByMetric = {};                 // metric -> number[]
  const signedByRegionMetric = {};           // region -> metric -> number[]
  const verdictsOverall = emptyVerdictTally();
  const verdictsByRegion = {};               // region -> tally
  const allSigned = [];
  const allSignedByRegion = {};              // region -> number[]

  for (const m of METRICS) signedByMetric[m] = [];

  for (const c of detailed) {
    const region = c.operating_region || 'other';
    if (!verdictsByRegion[region]) verdictsByRegion[region] = emptyVerdictTally();
    if (!signedByRegionMetric[region]) {
      signedByRegionMetric[region] = {};
      for (const m of METRICS) signedByRegionMetric[region][m] = [];
    }
    if (!allSignedByRegion[region]) allSignedByRegion[region] = [];

    // Case-level verdict tally.
    const v = String(c.verdict || '').toLowerCase();
    if (v === 'pass') { verdictsOverall.pass += 1; verdictsByRegion[region].pass += 1; }
    else if (v === 'fail') { verdictsOverall.fail += 1; verdictsByRegion[region].fail += 1; }
    else { verdictsOverall.skip += 1; verdictsByRegion[region].skip += 1; }

    // Per-metric deviations (only finite signed_pct entries contribute).
    const metricsObj = c.metrics || {};
    for (const m of METRICS) {
      const entry = metricsObj[m];
      if (entry && isNum(entry.signed_pct)) {
        signedByMetric[m].push(entry.signed_pct);
        signedByRegionMetric[region][m].push(entry.signed_pct);
        allSigned.push(entry.signed_pct);
        allSignedByRegion[region].push(entry.signed_pct);
      }
    }
  }

  const buildScope = (perMetricSigned, combinedSigned, verdicts) => {
    const byMetric = {};
    for (const m of METRICS) byMetric[m] = aggregateDeviations(perMetricSigned[m]);
    return { byMetric, combined: aggregateDeviations(combinedSigned), verdicts };
  };

  const byRegion = {};
  for (const region of Object.keys(signedByRegionMetric)) {
    byRegion[region] = buildScope(
      signedByRegionMetric[region],
      allSignedByRegion[region],
      verdictsByRegion[region],
    );
  }

  return {
    overall: buildScope(signedByMetric, allSigned, verdictsOverall),
    byRegion,
  };
}

/**
 * Public-safe summary: verdict COUNTS per region only. No deviation values.
 * Safe to print to stdout / CI.
 * @returns {string[]} lines like "region=full_load pass=2 fail=1 skip=0"
 */
function publicRegionCounts(aggregates) {
  const lines = [];
  const regions = Object.keys(aggregates.byRegion).sort();
  for (const region of regions) {
    const v = aggregates.byRegion[region].verdicts;
    lines.push(`region=${region} pass=${v.pass} fail=${v.fail} skip=${v.skip}`);
  }
  const o = aggregates.overall.verdicts;
  lines.push(`region=ALL pass=${o.pass} fail=${o.fail} skip=${o.skip}`);
  return lines;
}

module.exports = {
  aggregateDeviations,
  computeAggregates,
  publicRegionCounts,
  mean,
  median,
  maxAbs,
};

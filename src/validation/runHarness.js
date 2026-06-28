'use strict';

const fs = require('fs');
const path = require('path');

const { METRICS, DEFAULT_TOLERANCE_PCT, validateTestSet } = require('./schema');
const { publicCaseLine, assertPublicSafe, maskText } = require('./redact');

/**
 * Core harness. Pure with respect to IO except for the injected `out`/`writeReport`
 * sinks, so it is fully unit-testable without a UI, without an engine, and
 * without private data.
 *
 * @param {object} opts
 * @param {object} opts.testSet     parsed + schema-valid test set ({schema_version, cases})
 * @param {(c:object)=>object} opts.evaluate  returns predicted metrics for a case
 * @param {(line:string)=>void} [opts.out]    public sink (default: stdout, guarded)
 * @param {(report:object)=>void} [opts.writeReport] optional LOCAL detailed report sink
 * @returns {{cases:number, pass:number, fail:number, skip:number, ok:boolean}}
 */
function runHarness({ testSet, evaluate, out, writeReport } = {}) {
  const emit = out || ((line) => {
    assertPublicSafe(line); // guard: never leak values to stdout
    process.stdout.write(line + '\n');
  });

  if (typeof evaluate !== 'function') {
    throw new Error('runHarness requires an evaluate(case) function');
  }

  const counts = { cases: 0, pass: 0, fail: 0, skip: 0 };
  const detailed = []; // values live here only; never emitted publicly

  for (const c of testSet.cases) {
    counts.cases += 1;
    const reference = c.reference || {};
    // Exclude non-finite AND zero references: percent deviation divides by the
    // reference, so a zero reference is never evaluated here (no implicit division
    // by zero). Zero references are also rejected up-front by the schema.
    const refMetrics = METRICS.filter((m) => typeof reference[m] === 'number' && Number.isFinite(reference[m]) && reference[m] !== 0);

    // No reference data for this case => SKIP. Never fabricate references.
    if (refMetrics.length === 0) {
      counts.skip += 1;
      emit(publicCaseLine({ id: c.id, verdict: 'SKIP' }));
      detailed.push({ id: c.id, operating_region: c.operating_region, verdict: 'SKIP', reason: 'no_reference', metrics: {} });
      continue;
    }

    const predicted = evaluate(c) || {};
    const perMetric = {};
    let caseFailed = false;
    let evaluatedAny = false;

    for (const metric of refMetrics) {
      const ref = reference[metric];
      const tolPct = (c.tolerance && c.tolerance[`${metric}_pct`]) || DEFAULT_TOLERANCE_PCT[metric];
      const pred = predicted[metric];

      if (typeof pred !== 'number' || !Number.isFinite(pred)) {
        // Prediction missing for a metric that has a reference => fail-closed.
        perMetric[metric] = { verdict: 'FAIL', reason: 'no_prediction' };
        caseFailed = true;
        continue;
      }

      evaluatedAny = true;
      const signedPct = ((pred - ref) / ref) * 100;
      const pass = Math.abs(signedPct) <= tolPct;
      if (!pass) caseFailed = true;
      perMetric[metric] = {
        verdict: pass ? 'PASS' : 'FAIL',
        signed_pct: signedPct,
        abs_pct: Math.abs(signedPct),
        tolerance_pct: tolPct,
      };
    }

    const verdict = !evaluatedAny ? 'FAIL' : caseFailed ? 'FAIL' : 'PASS';
    if (verdict === 'PASS') counts.pass += 1; else counts.fail += 1;
    emit(publicCaseLine({ id: c.id, verdict }));
    detailed.push({ id: c.id, operating_region: c.operating_region, verdict, metrics: perMetric });
  }

  emit(`summary cases=${counts.cases} pass=${counts.pass} fail=${counts.fail} skip=${counts.skip}`);

  if (typeof writeReport === 'function') {
    // Detailed report contains values => caller must route it to a LOCAL,
    // git-ignored location only. Never to stdout.
    writeReport({
      generated_at_iso: new Date().toISOString(),
      evidence: 'confidential external validation evidence',
      summary: counts,
      cases: detailed,
    });
  }

  return { ...counts, ok: counts.fail === 0 };
}

/**
 * Convenience: write a detailed report into NODITECH_PRIVATE_REPORT_DIR.
 * Returns a writeReport function, or null if reporting is not enabled/configured.
 */
function makeReportWriter(config) {
  if (!config || !config.reportEnabled || !config.reportDir) return null;
  if (!path.isAbsolute(config.reportDir)) return null;
  return function writeReport(report) {
    fs.mkdirSync(config.reportDir, { recursive: true });
    const file = path.join(config.reportDir, `validation-report-${Date.now()}.private.json`);
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    // Note: we intentionally do NOT print the path or contents to stdout.
  };
}

module.exports = { runHarness, makeReportWriter, validateTestSet, maskText };

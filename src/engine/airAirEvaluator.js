'use strict';

/**
 * Private-compatible Air/Air evaluator. Calls EXACTLY the same engine
 * (computeAirAir) as the browser UI — there is no second formula here.
 *
 * Reads cases from NODITECH_PRIVATE_VALIDATION_FILE. No private test data is stored
 * in the repo. Raw private input and confidential external validation evidence are
 * NEVER written to CI logs, PR text, or public stdout. Public output is anonymous
 * case-id + status only.
 * The only public phrasing for the source material is:
 *     confidential external validation evidence
 *
 * Detailed local comparison (measured vs calculated, deviations) is returned to the
 * caller for LOCAL reporting only; it is value-bearing and must never be printed
 * publicly or committed.
 */

const fs = require('fs');
const { computeAirAir } = require('./airAir.js');

function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function pctDev(calc, meas) {
  if (meas === null || calc === null || meas === 0) return null; // no implicit divide-by-zero
  return ((calc - meas) / meas) * 100;
}
function absDev(calc, meas) {
  if (meas === null || calc === null) return null;
  return calc - meas;
}

/**
 * Evaluate a single case. `case_.input` is the engine input; `case_.measured`
 * carries lab capacities (kW) when present.
 * Returns a LOCAL-ONLY detailed object (value-bearing) plus a public-safe verdict.
 */
function evaluateCase(case_) {
  const out = computeAirAir(case_.input || {});
  const measured = case_.measured || {};

  const calc = out.result ? {
    totalCapacityKW: out.result.totalCapacityKW,
    sensibleCapacityKW: out.result.sensibleCapacityKW,
    latentCapacityKW: out.result.latentCapacityKW,
  } : { totalCapacityKW: null, sensibleCapacityKW: null, latentCapacityKW: null };

  const m = {
    totalCapacityKW: num(measured.totalCapacityKW),
    sensibleCapacityKW: num(measured.sensibleCapacityKW),
    latentCapacityKW: num(measured.latentCapacityKW),
  };

  const verdict = out.status === 'blocked' ? 'BLOCKED'
    : out.status === 'warning' ? 'WARNING' : 'VALID';

  return {
    id: case_.id,
    status: out.status,
    code: out.code,
    verdict,
    warnings: out.warnings || [],
    calculated: calc,
    // LOCAL-ONLY value-bearing comparison (never print publicly):
    comparison: {
      total: { measured: m.totalCapacityKW, calculated: calc.totalCapacityKW, abs: absDev(calc.totalCapacityKW, m.totalCapacityKW), pct: pctDev(calc.totalCapacityKW, m.totalCapacityKW) },
      sensible: { measured: m.sensibleCapacityKW, calculated: calc.sensibleCapacityKW, abs: absDev(calc.sensibleCapacityKW, m.sensibleCapacityKW), pct: pctDev(calc.sensibleCapacityKW, m.sensibleCapacityKW) },
      latent: { measured: m.latentCapacityKW, calculated: calc.latentCapacityKW, abs: absDev(calc.latentCapacityKW, m.latentCapacityKW), pct: pctDev(calc.latentCapacityKW, m.latentCapacityKW) },
    },
  };
}

function loadCases(env = process.env) {
  const file = env.NODITECH_PRIVATE_VALIDATION_FILE;
  if (!file) return { present: false, reason: 'env_unset' };
  if (!fs.existsSync(file)) return { present: false, reason: 'file_not_found' };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const cases = Array.isArray(data) ? data : (data.cases || []);
    return { present: true, cases };
  } catch (_e) {
    return { present: false, reason: 'invalid_json' };
  }
}

/** Public sequential id (case-001, case-002, ...). Never the private case id. */
function publicId(index) { return `case-${String(index + 1).padStart(3, '0')}`; }

/** Public-safe line: public sequential id + status only. No private id, no values. */
function publicLine(index, r) { return `${publicId(index)}\t${r.verdict}`; }

/**
 * CLI: prints only `<id>\tVALID|WARNING|BLOCKED` + a counts summary. Detailed
 * value-bearing comparison is written ONLY to NODITECH_PRIVATE_REPORT_DIR when
 * NODITECH_ENABLE_PRIVATE_REPORT=1.
 */
function main(env = process.env) {
  const loaded = loadCases(env);
  if (!loaded.present) {
    process.stdout.write(`SKIPPED no private validation data (${loaded.reason})\n`);
    process.exit(0);
  }
  const results = loaded.cases.map(evaluateCase);
  const counts = { valid: 0, warning: 0, blocked: 0 };
  results.forEach((r, i) => {
    counts[r.verdict.toLowerCase()] += 1;
    // PUBLIC stdout: sequential id + status only. Never the private id, path,
    // input, measured value, or deviation.
    process.stdout.write(publicLine(i, r) + '\n');
  });
  process.stdout.write(`summary cases=${results.length} valid=${counts.valid} warning=${counts.warning} blocked=${counts.blocked}\n`);

  if (env.NODITECH_ENABLE_PRIVATE_REPORT === '1' && env.NODITECH_PRIVATE_REPORT_DIR) {
    const dir = env.NODITECH_PRIVATE_REPORT_DIR;
    fs.mkdirSync(dir, { recursive: true });
    const report = {
      evidence: 'confidential external validation evidence',
      generated_at_iso: new Date().toISOString(),
      summary: counts,
      // Local private report keeps the public sequential id AND the original private
      // id (for traceability) alongside the value-bearing comparison.
      cases: results.map((r, i) => Object.assign({ publicId: publicId(i) }, r)),
    };
    fs.writeFileSync(`${dir}/airair-validation-${Date.now()}.private.json`, JSON.stringify(report, null, 2));
    // Path/contents intentionally NOT printed.
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { evaluateCase, loadCases, publicLine, publicId };

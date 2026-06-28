#!/usr/bin/env node
'use strict';

/**
 * CLI entry for the private validation harness.
 *
 *   node src/validation/cli.js
 *
 * Behavior:
 *  - No private data configured/present      -> prints "SKIPPED ..." and exits 0.
 *  - Private data present but invalid JSON    -> structural error, exits 1.
 *  - Private data present but schema-invalid  -> structural errors, exits 1.
 *  - No calculation engine evaluator wired    -> prints "NO_EVALUATOR ..." exits 0
 *      (cannot evaluate real cases yet; the engine is wired in a later PR — we do
 *       NOT run the test-double stub against real private data).
 *  - Otherwise: prints "<id>\tPASS|FAIL|SKIP" per case + summary; exits 0 if no FAIL.
 *
 * Stdout is value-free by construction (see redact.assertPublicSafe).
 */

const path = require('path');
const fs = require('fs');

const { loadPrivateTestSet } = require('./loadPrivate');
const { validateTestSet } = require('./schema');
const { runHarness, makeReportWriter } = require('./runHarness');

function resolveEngineEvaluator(env = process.env) {
  // The real engine evaluator is provided by a later PR. We look for an explicit
  // module path or a conventional file; if neither exists, there is no evaluator.
  const candidates = [];
  if (env.NODITECH_EVALUATOR_MODULE) candidates.push(env.NODITECH_EVALUATOR_MODULE);
  candidates.push(path.join(__dirname, 'evaluator.js'));
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const mod = require(candidate);
        if (typeof mod.makeEvaluator === 'function') return mod.makeEvaluator();
        if (typeof mod.evaluate === 'function') return mod.evaluate;
      }
    } catch (_e) {
      // ignore; treated as "no evaluator"
    }
  }
  return null;
}

function main() {
  const loaded = loadPrivateTestSet(process.env);

  if (!loaded.present) {
    process.stdout.write(`SKIPPED no private validation data (${loaded.reason}); set NODITECH_PRIVATE_VALIDATION_FILE\n`);
    process.exit(0);
  }

  if (loaded.parseError) {
    process.stderr.write('ERROR private validation file is not valid JSON\n');
    process.exit(1);
  }

  const { valid, errors } = validateTestSet(loaded.data);
  if (!valid) {
    process.stderr.write(`ERROR private validation set failed schema check (${errors.length} issue(s))\n`);
    for (const e of errors) process.stderr.write(`  - ${e.path}: ${e.message}\n`);
    process.exit(1);
  }

  const evaluate = resolveEngineEvaluator(process.env);
  if (!evaluate) {
    process.stdout.write('NO_EVALUATOR calculation engine not wired yet; cannot evaluate real cases (follow-up PR)\n');
    process.exit(0);
  }

  const writeReport = makeReportWriter(loaded.config);
  const result = runHarness({ testSet: loaded.data, evaluate, writeReport });
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = { resolveEngineEvaluator };

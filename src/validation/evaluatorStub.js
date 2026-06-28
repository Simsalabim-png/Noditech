'use strict';

/**
 * TEST DOUBLE — not a physical model.
 *
 * This stub exists ONLY so the harness plumbing (load -> validate -> compare ->
 * redacted output) can be tested deterministically against synthetic PUBLIC
 * fixtures, with no engine and no private data.
 *
 * It derives a "prediction" from each case's own reference scaled by a factor
 * carried in inputs.stub_factors. That is intentionally circular and is fine for
 * exercising the metrics/IO layer — it must NEVER be used against real private
 * cases. Real evaluation is wired to the calculation engine in a later PR.
 */

const { METRICS } = require('./schema');

function makeStubEvaluator() {
  return function evaluate(testCase) {
    const out = {};
    const ref = testCase.reference || {};
    const factors = (testCase.inputs && testCase.inputs.stub_factors) || {};
    for (const metric of METRICS) {
      if (typeof ref[metric] === 'number' && Number.isFinite(ref[metric])) {
        const f = typeof factors[metric] === 'number' ? factors[metric] : 1;
        out[metric] = ref[metric] * f;
      }
    }
    return out;
  };
}

module.exports = { makeStubEvaluator, IS_TEST_DOUBLE: true };

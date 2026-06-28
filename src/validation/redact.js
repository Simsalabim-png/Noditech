'use strict';

/**
 * Redaction / log masking utilities.
 *
 * Purpose: defense-in-depth so that no measured values, lab names, device
 * identifiers, or report filenames can reach stdout / CI logs. The harness is
 * designed to never print values by default; these helpers guarantee it even
 * for ad-hoc / error messages.
 */

// Tokens we never want to surface in public logs. Matched case-insensitively.
const SENSITIVE_KEY_PATTERNS = [
  /lab/i,
  /laborator/i,
  /report/i,
  /serial/i,
  /model/i,
  /machine/i,
  /device/i,
  /unit_id/i,
  /vendor/i,
  /manufacturer/i,
  /site/i,
];

const REDACTED = '«redacted»';

/** Mask every numeric token in a free-text string. */
function maskNumbers(text) {
  return String(text).replace(/-?\d[\d.,]*/g, REDACTED);
}

/**
 * Mask a free-text log line: strip numbers and obvious sensitive tokens.
 * Use for any message that might inadvertently include data.
 */
function maskText(text) {
  let out = maskNumbers(text);
  // Collapse any key=value where the key looks sensitive.
  out = out.replace(/([A-Za-z_][\w-]*)\s*[:=]\s*\S+/g, (m, key) => {
    if (SENSITIVE_KEY_PATTERNS.some((re) => re.test(key))) return `${key}=${REDACTED}`;
    return m;
  });
  return out;
}

/** True if an object key name is considered sensitive. */
function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(String(key)));
}

/**
 * Produce a public-safe summary of a case result: anonymous id + verdict only.
 * Never includes inputs, references, predictions, or deviations.
 */
function publicCaseLine(result) {
  return `${result.id}\t${result.verdict}`;
}

/**
 * Assert that a string carries no values / sensitive tokens. Used in tests and
 * as a runtime guard before writing to stdout. Throws on violation.
 */
function assertPublicSafe(line) {
  // Allowed public line shapes:
  //   "<id>\tPASS|FAIL|SKIP"
  //   summary line "cases=.. pass=.. fail=.. skip=.." (counts are allowed)
  const verdict = /^[\w.-]+\t(PASS|FAIL|SKIP)$/;
  const summary = /^summary\b/;
  const status = /^(SKIPPED|NO_EVALUATOR|ERROR)\b/;
  if (verdict.test(line) || summary.test(line) || status.test(line)) return true;
  throw new Error('refused to print potentially unsafe line to public output');
}

module.exports = {
  REDACTED,
  maskNumbers,
  maskText,
  isSensitiveKey,
  publicCaseLine,
  assertPublicSafe,
};

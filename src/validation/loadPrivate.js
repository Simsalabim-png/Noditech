'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Loads the private validation test set from an external, git-ignored location.
 *
 * Interface (all optional; absence => harness is skipped, never failed):
 *   NODITECH_PRIVATE_VALIDATION_FILE  absolute path to cases.json
 *   NODITECH_PRIVATE_REPORT_DIR       absolute path for local detailed reports
 *   NODITECH_ENABLE_PRIVATE_REPORT    "1" to enable local detailed reporting
 *
 * The file contents are never logged. Only presence/absence and structural
 * validity are surfaced.
 */

const ENV = Object.freeze({
  FILE: 'NODITECH_PRIVATE_VALIDATION_FILE',
  REPORT_DIR: 'NODITECH_PRIVATE_REPORT_DIR',
  ENABLE_REPORT: 'NODITECH_ENABLE_PRIVATE_REPORT',
});

function readConfig(env = process.env) {
  const file = env[ENV.FILE] ? String(env[ENV.FILE]).trim() : '';
  const reportDir = env[ENV.REPORT_DIR] ? String(env[ENV.REPORT_DIR]).trim() : '';
  const reportEnabled = String(env[ENV.ENABLE_REPORT] || '').trim() === '1';
  return { file, reportDir, reportEnabled };
}

/**
 * @returns {{present: boolean, reason?: string, data?: object, config: object}}
 *   present=false with a clear reason when data is absent/unreadable so the
 *   caller can mark the run as SKIPPED. Never throws on missing data; only the
 *   structural parse failure is reported (without content).
 */
function loadPrivateTestSet(env = process.env) {
  const config = readConfig(env);

  if (!config.file) {
    return { present: false, reason: 'env_unset', config };
  }
  if (!path.isAbsolute(config.file)) {
    return { present: false, reason: 'path_not_absolute', config };
  }
  if (!fs.existsSync(config.file)) {
    return { present: false, reason: 'file_not_found', config };
  }

  let raw;
  try {
    raw = fs.readFileSync(config.file, 'utf8');
  } catch (_e) {
    // Do not include the underlying error/message: it could echo a path/value.
    return { present: false, reason: 'unreadable', config };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (_e) {
    return { present: true, parseError: true, reason: 'invalid_json', config };
  }

  return { present: true, data, config };
}

module.exports = { ENV, readConfig, loadPrivateTestSet };

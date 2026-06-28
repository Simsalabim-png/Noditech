'use strict';

/**
 * Schema for private validation test sets.
 *
 * IMPORTANT (confidentiality): this module defines STRUCTURE only. It contains
 * no measured values, no lab names, no device identifiers. The actual private
 * data ("confidential external validation evidence") is loaded at runtime from
 * an external, git-ignored location and is never committed.
 *
 * Zero external dependencies on purpose: the project is self-contained/offline,
 * so we ship a small deterministic validator instead of pulling a JSON-Schema
 * library (avoids npm integrity/egress concerns and keeps builds reproducible).
 */

const SCHEMA_VERSION = '1.0';

const OPERATING_REGIONS = Object.freeze([
  'full_load',
  'part_load',
  'low_load',
  'high_temperature',
  'derating',
  'regulator_transition',
  'compressor_transition',
  'other',
]);

const METRICS = Object.freeze(['cooling_capacity_w', 'electrical_power_w', 'eer']);

const DEFAULT_TOLERANCE_PCT = Object.freeze({
  cooling_capacity_w: 5,
  electrical_power_w: 5,
  eer: 5,
});

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Validate a parsed private test set.
 * Returns { valid, errors }. Errors are STRUCTURAL ONLY (path + message);
 * they never echo measured values, so they are safe to log.
 *
 * @param {unknown} data parsed JSON
 * @returns {{valid: boolean, errors: Array<{path: string, message: string}>}}
 */
function validateTestSet(data) {
  const errors = [];
  const err = (path, message) => errors.push({ path, message });

  if (!isPlainObject(data)) {
    err('$', 'root must be an object');
    return { valid: false, errors };
  }

  if (data.schema_version !== SCHEMA_VERSION) {
    err('$.schema_version', `unsupported or missing schema_version (expected "${SCHEMA_VERSION}")`);
  }

  if (!Array.isArray(data.cases)) {
    err('$.cases', 'cases must be an array');
    return { valid: errors.length === 0, errors };
  }

  if (data.cases.length === 0) {
    err('$.cases', 'cases must not be empty');
  }

  const seenIds = new Set();

  data.cases.forEach((c, i) => {
    const p = `$.cases[${i}]`;

    if (!isPlainObject(c)) {
      err(p, 'case must be an object');
      return;
    }

    if (typeof c.id !== 'string' || c.id.trim() === '') {
      err(`${p}.id`, 'id must be a non-empty string (anonymous case identifier)');
    } else if (seenIds.has(c.id)) {
      err(`${p}.id`, 'duplicate case id');
    } else {
      seenIds.add(c.id);
    }

    if (typeof c.operating_region !== 'string' || !OPERATING_REGIONS.includes(c.operating_region)) {
      err(`${p}.operating_region`, `operating_region must be one of: ${OPERATING_REGIONS.join(', ')}`);
    }

    if (!isPlainObject(c.inputs)) {
      err(`${p}.inputs`, 'inputs must be an object');
    }

    // reference is optional, but if present must be an object of finite numbers.
    if (c.reference !== undefined) {
      if (!isPlainObject(c.reference)) {
        err(`${p}.reference`, 'reference must be an object when present');
      } else {
        for (const key of Object.keys(c.reference)) {
          if (!METRICS.includes(key)) {
            err(`${p}.reference.${key}`, `unknown reference metric (allowed: ${METRICS.join(', ')})`);
          } else if (!isFiniteNumber(c.reference[key]) || c.reference[key] === 0) {
            // Zero reference is rejected: it cannot be used in a percent deviation
            // ((pred-ref)/ref) without an implicit division by zero. Use a non-zero
            // reference (or model an absolute-tolerance case explicitly elsewhere).
            err(`${p}.reference.${key}`, 'reference metric must be a finite non-zero number');
          }
        }
      }
    }

    // tolerance is optional; if present must be an object of positive finite numbers.
    if (c.tolerance !== undefined) {
      if (!isPlainObject(c.tolerance)) {
        err(`${p}.tolerance`, 'tolerance must be an object when present');
      } else {
        for (const key of Object.keys(c.tolerance)) {
          const metricKey = key.replace(/_pct$/, '');
          if (!METRICS.includes(metricKey)) {
            err(`${p}.tolerance.${key}`, 'unknown tolerance key');
          } else if (!isFiniteNumber(c.tolerance[key]) || c.tolerance[key] <= 0) {
            err(`${p}.tolerance.${key}`, 'tolerance must be a positive finite number (percent)');
          }
        }
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

module.exports = {
  SCHEMA_VERSION,
  OPERATING_REGIONS,
  METRICS,
  DEFAULT_TOLERANCE_PCT,
  validateTestSet,
  isFiniteNumber,
  isPlainObject,
};

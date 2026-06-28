#!/usr/bin/env node
'use strict';

/**
 * Reproducibility gate for the pc2 candidate. Builds the artifact TWICE in two
 * SEPARATE Node processes, each into its own temp directory, reads the two final
 * artifacts as bytes, and compares SHA-256. Fails (exit 1) on any byte difference.
 * Temp directories are always cleaned up.
 *
 *   node build/verify-reproducible-pc2.js [expected_sha256]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const OUT = 'Kalkulator_build9.8-pc2.html';

function buildInto(root) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'noditech-pc2-'));
  const res = spawnSync(process.execPath, [path.join(root, 'build', 'assemble-pc2.js')], {
    env: Object.assign({}, process.env, { NODITECH_DIST_DIR: dir }),
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error('pc2 build subprocess failed:\n' + (res.stderr || ''));
  return dir;
}

function main() {
  const root = path.resolve(__dirname, '..');
  let d1; let d2; let ok = true; let sha = '';
  try {
    d1 = buildInto(root);
    d2 = buildInto(root);
    const b1 = fs.readFileSync(path.join(d1, OUT));
    const b2 = fs.readFileSync(path.join(d2, OUT));
    const s1 = crypto.createHash('sha256').update(b1).digest('hex');
    const s2 = crypto.createHash('sha256').update(b2).digest('hex');
    sha = s1;
    if (!b1.equals(b2) || s1 !== s2) {
      process.stderr.write('PC2 REPRODUCIBILITY FAIL: two independent builds differ\n');
      ok = false;
    } else {
      process.stdout.write(`REPRODUCIBLE sha256=${s1}\n`);
    }
  } finally {
    for (const d of [d1, d2]) if (d) fs.rmSync(d, { recursive: true, force: true });
  }
  const expected = process.argv[2] || process.env.NODITECH_EXPECTED_SHA256;
  if (ok && expected) {
    if (expected !== sha) { process.stderr.write(`PIN MISMATCH: expected ${expected} got ${sha}\n`); ok = false; }
    else process.stdout.write('PIN OK\n');
  }
  process.exit(ok ? 0 : 1);
}

if (require.main === module) main();

#!/usr/bin/env node
'use strict';

/**
 * Reproducibility gate.
 *
 * Builds the artifact TWICE in two SEPARATE Node processes, each writing into its
 * own temporary directory, then reads the two final artifacts as bytes and
 * compares their SHA-256. Fails (exit 1) on any byte difference. Temporary
 * directories are always cleaned up.
 *
 *   node build/verify-reproducible.js [expected_sha256]
 *
 * Exit 0 on success (and PIN OK if an expected hash is given and matches),
 * 1 on any reproducibility/pin failure.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const { loadManifest } = require('./build');

function buildIntoTempDir(root) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'noditech-repro-'));
  const res = spawnSync(process.execPath, [path.join(root, 'build', 'build.js')], {
    env: { ...process.env, NODITECH_DIST_DIR: dir },
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error('build subprocess failed');
  }
  return dir;
}

function sha256OfFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function main() {
  const root = path.resolve(__dirname, '..');
  const manifest = loadManifest(path.join(root, 'build', 'build.manifest.json'));
  const outName = manifest.output;

  let dir1;
  let dir2;
  let ok = true;
  let sha = '';

  try {
    dir1 = buildIntoTempDir(root);
    dir2 = buildIntoTempDir(root);

    const file1 = path.join(dir1, outName);
    const file2 = path.join(dir2, outName);
    const bytes1 = fs.readFileSync(file1);
    const bytes2 = fs.readFileSync(file2);
    const sha1 = sha256OfFile(file1);
    const sha2 = sha256OfFile(file2);
    sha = sha1;

    if (!bytes1.equals(bytes2) || sha1 !== sha2) {
      process.stderr.write('REPRODUCIBILITY FAIL: two independent builds differ\n');
      ok = false;
    } else {
      process.stdout.write(`REPRODUCIBLE sha256=${sha1}\n`);
    }
  } finally {
    for (const d of [dir1, dir2]) {
      if (d) fs.rmSync(d, { recursive: true, force: true });
    }
  }

  const expected = process.argv[2] || process.env.NODITECH_EXPECTED_SHA256;
  if (ok && expected) {
    if (expected !== sha) {
      process.stderr.write(`PIN MISMATCH: expected ${expected} got ${sha}\n`);
      ok = false;
    } else {
      process.stdout.write('PIN OK\n');
    }
  }

  process.exit(ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = { buildIntoTempDir };

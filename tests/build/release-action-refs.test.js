'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const workflows = [
  '.github/workflows/deploy-pc2-pages.yml',
  '.github/workflows/verify-safe-release.yml',
];

const allowed = {
  'actions/checkout': [
    'df4cb1c069e1874edd31b4311f1884172cec0e10',
    '34e114876b0b11c390a56381ad16ebd13914f8d5',
  ],
  'actions/setup-node': ['49933ea5288caeca8642d1e84afbd3f7d6820020'],
  'actions/configure-pages': ['45bfe0192ca1faeb007ade9deae92b16b8254a0d'],
  'actions/upload-pages-artifact': ['7b1f4a764d45c48632c6b24a0339c27f5614fb0b'],
  'actions/deploy-pages': ['d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e'],
  'actions/upload-artifact': ['ea165f8d65b6e75b540449e92b4886f43607fa02'],
};

test('release workflows use reviewed full action commit references', () => {
  const seen = new Set();
  for (const relative of workflows) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const refs = [...text.matchAll(/^\s*uses:\s+(actions\/[^@\s]+)@([^\s#]+)/gm)];
    assert.ok(refs.length > 0, `${relative} has no action references`);
    for (const [, action, ref] of refs) {
      assert.match(ref, /^[0-9a-f]{40}$/, `${relative}: ${action} must use a full commit reference`);
      assert.ok(Object.hasOwn(allowed, action), `${relative}: unexpected action ${action}`);
      assert.ok(allowed[action].includes(ref), `${relative}: unexpected reference for ${action}`);
      seen.add(`${action}@${ref}`);
    }
  }
  for (const [action, refs] of Object.entries(allowed)) {
    for (const ref of refs) assert.ok(seen.has(`${action}@${ref}`), `missing ${action}@${ref}`);
  }
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

async function loadManager() {
  return import('../../tools/release/safe-release-manager.mjs');
}

test('release branch names are unique, scoped and never main', async () => {
  const manager = await loadManager();
  const branch = manager.buildReleaseBranchName(
    'abcdef1234567890',
    new Date('2026-06-30T14:05:06.000Z'),
    '28450000000'
  );
  assert.equal(branch, 'release/safe-20260630T140506Z-abcdef12-28450000000');
  assert.match(branch, /^release\/safe-/);
  assert.notEqual(branch, 'main');
  assert.notEqual(branch, 'develop');
});

test('only open release branches targeting main block a new release', async () => {
  const manager = await loadManager();
  const pulls = [
    { state: 'open', base: { ref: 'main' }, head: { ref: 'release/safe-one' } },
    { state: 'closed', base: { ref: 'main' }, head: { ref: 'release/safe-old' } },
    { state: 'open', base: { ref: 'develop' }, head: { ref: 'release/safe-wrong-base' } },
    { state: 'open', base: { ref: 'main' }, head: { ref: 'fix/not-a-release' } },
  ];
  const active = manager.findActiveReleasePulls(pulls);
  assert.equal(active.length, 1);
  assert.equal(active[0].head.ref, 'release/safe-one');
});

test('develop gate requires exact-head pc6 success and no pending or failed workflow', async () => {
  const manager = await loadManager();
  const sha = 'a'.repeat(40);
  const green = manager.evaluateDevelopGate({
    developSha: sha,
    workflowRuns: [
      { id: 10, name: 'verify-pc6', head_sha: sha, status: 'completed', conclusion: 'success' },
      { id: 11, name: 'unit-tests', head_sha: sha, status: 'completed', conclusion: 'success' },
      { id: 12, name: 'verify-safe-release', head_sha: sha, status: 'completed', conclusion: 'skipped' },
      { id: 9, name: 'verify-pc6', head_sha: 'b'.repeat(40), status: 'completed', conclusion: 'success' },
    ],
  });
  assert.equal(green.ready, true, green.reasons.join('; '));

  const stalePc6 = manager.evaluateDevelopGate({
    developSha: sha,
    workflowRuns: [
      { id: 1, name: 'verify-pc6', head_sha: 'b'.repeat(40), status: 'completed', conclusion: 'success' },
      { id: 2, name: 'unit-tests', head_sha: sha, status: 'completed', conclusion: 'success' },
    ],
  });
  assert.equal(stalePc6.ready, false);
  assert.match(stalePc6.reasons.join(' '), /missing verify-pc6/);

  const pending = manager.evaluateDevelopGate({
    developSha: sha,
    workflowRuns: [
      { id: 3, name: 'verify-pc6', head_sha: sha, status: 'completed', conclusion: 'success' },
      { id: 4, name: 'unit-tests', head_sha: sha, status: 'in_progress', conclusion: null },
    ],
  });
  assert.equal(pending.ready, false);
  assert.match(pending.reasons.join(' '), /pending workflows/);

  const failed = manager.evaluateDevelopGate({
    developSha: sha,
    workflowRuns: [
      { id: 5, name: 'verify-pc6', head_sha: sha, status: 'completed', conclusion: 'success' },
      { id: 6, name: 'unit-tests', head_sha: sha, status: 'completed', conclusion: 'failure' },
    ],
  });
  assert.equal(failed.ready, false);
  assert.match(failed.reasons.join(' '), /failed workflows/);
});

test('release plan can only merge develop into a release branch and opens a draft PR', async () => {
  const manager = await loadManager();
  const plan = manager.buildReleasePlan({
    mainSha: '1'.repeat(40),
    developSha: '2'.repeat(40),
    releaseBranch: 'release/safe-example',
  });
  assert.equal(plan.createFrom, plan.mainSha);
  assert.equal(plan.mergeBase, 'release/safe-example');
  assert.equal(plan.mergeHead, plan.developSha);
  assert.equal(plan.pullRequestBase, 'main');
  assert.equal(plan.pullRequestHead, 'release/safe-example');
  assert.equal(plan.pullRequestDraft, true);
  assert.deepEqual(plan.validationWorkflows, ['verify-safe-release.yml', 'verify-pc6.yml']);
  assert.deepEqual(plan.productionActions, {
    markReady: false,
    mergeToMain: false,
    createTag: false,
    createRelease: false,
    deploy: false,
  });
  assert.equal(plan.validationWorkflows.includes('deploy-pc2-pages.yml'), false);
});

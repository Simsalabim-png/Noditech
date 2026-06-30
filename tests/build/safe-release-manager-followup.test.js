'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

async function loadManager() {
  return import('../../tools/release/safe-release-manager.mjs');
}

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    async text() {
      return data === undefined ? '' : JSON.stringify(data);
    },
  };
}

function installEnv(dryRun) {
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.GITHUB_REPOSITORY = 'Simsalabim-png/Noditech';
  process.env.GITHUB_API_URL = 'https://api.github.test';
  process.env.SAFE_RELEASE_DRY_RUN = dryRun;
  delete process.env.GITHUB_OUTPUT;
  delete process.env.GITHUB_STEP_SUMMARY;
}

function restoreEnv(originalEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

test('retry policy dispatches only missing or bad terminal validation runs', async () => {
  const manager = await loadManager();

  for (const run of [
    undefined,
    { status: 'completed', conclusion: 'failure' },
    { status: 'completed', conclusion: 'cancelled' },
    { status: 'completed', conclusion: 'timed_out' },
  ]) {
    assert.equal(manager.shouldDispatchValidationRun(run), true);
  }

  for (const run of [
    { status: 'queued', conclusion: null },
    { status: 'in_progress', conclusion: null },
    { status: 'completed', conclusion: 'success' },
    { status: 'completed', conclusion: 'skipped' },
  ]) {
    assert.equal(manager.shouldDispatchValidationRun(run), false);
  }
});

test('open pull pagination finds a release PR on page two and prevents duplication', async () => {
  const manager = await loadManager();
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const requests = [];
  const mainSha = '1'.repeat(40);
  const developSha = '2'.repeat(40);

  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    number: index + 1,
    state: 'open',
    base: { ref: 'main' },
    head: { ref: `fix/example-${index}`, sha: String(index).padStart(40, '0') },
  }));
  const secondPage = [{
    number: 1001,
    state: 'open',
    base: { ref: 'main' },
    head: { ref: 'release/safe-existing', sha: '3'.repeat(40) },
  }];

  try {
    global.fetch = async (url, options = {}) => {
      const target = String(url);
      const method = options.method || 'GET';
      requests.push({ target, method });

      if (method !== 'GET') return response({ message: 'unexpected write' }, 500);
      if (target.endsWith('/branches/main')) return response({ commit: { sha: mainSha } });
      if (target.endsWith('/branches/develop')) return response({ commit: { sha: developSha } });

      const page = new URL(target).searchParams.get('page');
      if (target.includes('/pulls?state=open&base=main') && page === '1') return response(firstPage);
      if (target.includes('/pulls?state=open&base=main') && page === '2') return response(secondPage);
      return response({ message: `unexpected GET ${target}` }, 404);
    };

    installEnv('true');
    await manager.main();

    assert.equal(requests.some(request => request.target.includes('page=2')), true);
    assert.deepEqual(requests.filter(request => request.method !== 'GET'), []);
    assert.equal(requests.some(request => request.target.includes('/compare/main...develop')), false);
  } finally {
    global.fetch = originalFetch;
    restoreEnv(originalEnv);
  }
});

test('workflow pagination re-dispatches only the failed latest allowlisted run', async () => {
  const manager = await loadManager();
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const requests = [];
  const mainSha = '1'.repeat(40);
  const developSha = '2'.repeat(40);
  const releaseSha = '3'.repeat(40);
  const unrelatedRuns = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    name: `unrelated-${index}`,
    head_sha: releaseSha,
    status: 'completed',
    conclusion: 'success',
  }));

  try {
    global.fetch = async (url, options = {}) => {
      const target = String(url);
      const method = options.method || 'GET';
      requests.push({ target, method });

      if (target.endsWith('/branches/main')) return response({ commit: { sha: mainSha } });
      if (target.endsWith('/branches/develop')) return response({ commit: { sha: developSha } });

      const page = new URL(target).searchParams.get('page');
      if (target.includes('/pulls?state=open&base=main') && page === '1') {
        return response([{
          number: 50,
          state: 'open',
          base: { ref: 'main' },
          head: { ref: 'release/safe-existing', sha: releaseSha },
        }]);
      }
      if (target.includes(`/actions/runs?head_sha=${releaseSha}`) && page === '1') {
        return response({ total_count: 102, workflow_runs: unrelatedRuns });
      }
      if (target.includes(`/actions/runs?head_sha=${releaseSha}`) && page === '2') {
        return response({
          total_count: 102,
          workflow_runs: [
            { id: 1001, name: 'verify-safe-release', head_sha: releaseSha, status: 'completed', conclusion: 'success' },
            { id: 1002, name: 'verify-pc6', head_sha: releaseSha, status: 'completed', conclusion: 'failure' },
          ],
        });
      }
      if (method === 'POST' && target.includes('/actions/workflows/verify-pc6.yml/dispatches')) {
        return response(undefined, 204);
      }
      return response({ message: `unexpected ${method} ${target}` }, 404);
    };

    installEnv('false');
    await manager.main();

    const writes = requests.filter(request => request.method !== 'GET');
    assert.equal(writes.length, 1);
    assert.match(writes[0].target, /verify-pc6\.yml\/dispatches$/);
    assert.equal(requests.some(request => request.target.includes('verify-safe-release.yml/dispatches')), false);
    assert.equal(requests.some(request => request.target.includes('page=2')), true);
  } finally {
    global.fetch = originalFetch;
    restoreEnv(originalEnv);
  }
});

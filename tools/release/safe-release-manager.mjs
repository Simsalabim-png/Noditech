#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MAIN_BRANCH = 'main';
export const DEVELOP_BRANCH = 'develop';
export const RELEASE_PREFIX = 'release/safe-';
export const REQUIRED_WORKFLOW = 'verify-pc6';
export const VALIDATION_WORKFLOWS = Object.freeze([
  'verify-safe-release.yml',
  'verify-pc6.yml',
]);

const BAD_CONCLUSIONS = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'stale',
  'startup_failure',
]);

function latestRunsByName(runs) {
  const latest = new Map();
  for (const run of runs || []) {
    if (!run || !run.name) continue;
    const current = latest.get(run.name);
    if (!current || Number(run.id || 0) > Number(current.id || 0)) latest.set(run.name, run);
  }
  return [...latest.values()];
}

export function evaluateDevelopGate({ developSha, workflowRuns }) {
  const exact = (workflowRuns || []).filter(run => run && run.head_sha === developSha);
  const latest = latestRunsByName(exact);
  const pc6 = latest.find(run => run.name === REQUIRED_WORKFLOW);
  const pending = latest.filter(run => run.status !== 'completed');
  const failed = latest.filter(run => run.status === 'completed' && BAD_CONCLUSIONS.has(run.conclusion));
  const successes = latest.filter(run => run.status === 'completed' && run.conclusion === 'success');
  const reasons = [];

  if (!pc6) reasons.push(`missing ${REQUIRED_WORKFLOW} run on exact develop SHA`);
  else if (pc6.status !== 'completed' || pc6.conclusion !== 'success') {
    reasons.push(`${REQUIRED_WORKFLOW} is ${pc6.status}/${pc6.conclusion || 'pending'}`);
  }
  if (pending.length) reasons.push(`pending workflows: ${pending.map(run => run.name).join(', ')}`);
  if (failed.length) reasons.push(`failed workflows: ${failed.map(run => `${run.name}=${run.conclusion}`).join(', ')}`);
  if (!successes.length) reasons.push('no successful workflow run found on exact develop SHA');

  return {
    ready: reasons.length === 0,
    reasons,
    exactRuns: latest,
  };
}

export function findActiveReleasePulls(pulls, { mainBranch = MAIN_BRANCH, releasePrefix = RELEASE_PREFIX } = {}) {
  return (pulls || []).filter(pr =>
    pr &&
    pr.state === 'open' &&
    pr.base && pr.base.ref === mainBranch &&
    pr.head && typeof pr.head.ref === 'string' &&
    pr.head.ref.startsWith(releasePrefix)
  );
}

export function buildReleaseBranchName(developSha, now = new Date(), runId = 'manual') {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const safeRunId = String(runId).replace(/[^A-Za-z0-9._-]/g, '-');
  return `${RELEASE_PREFIX}${stamp}-${String(developSha).slice(0, 8)}-${safeRunId}`;
}

export function buildReleasePlan({ mainSha, developSha, releaseBranch }) {
  return Object.freeze({
    mainSha,
    developSha,
    releaseBranch,
    createFrom: mainSha,
    mergeBase: releaseBranch,
    mergeHead: developSha,
    pullRequestBase: MAIN_BRANCH,
    pullRequestHead: releaseBranch,
    pullRequestDraft: true,
    validationWorkflows: [...VALIDATION_WORKFLOWS],
    productionActions: Object.freeze({
      markReady: false,
      mergeToMain: false,
      createTag: false,
      createRelease: false,
      deploy: false,
    }),
  });
}

export function parseDryRun(value) {
  return String(value ?? 'true').trim().toLowerCase() !== 'false';
}

function repositoryParts(repository) {
  const [owner, repo, ...rest] = String(repository || '').split('/');
  if (!owner || !repo || rest.length) throw new Error(`invalid GITHUB_REPOSITORY: ${repository || '(missing)'}`);
  return { owner, repo };
}

function encodeRef(ref) {
  return String(ref).split('/').map(encodeURIComponent).join('/');
}

function appendFile(file, text) {
  if (file) fs.appendFileSync(file, `${text}\n`, 'utf8');
}

async function githubRequest({ apiUrl, token, method = 'GET', path, body }) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'noditech-safe-release-manager',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = text; }
  }
  if (!response.ok) {
    const detail = data && data.message ? data.message : String(data || response.statusText);
    const error = new Error(`${method} ${path} failed (${response.status}): ${detail}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function getBranch(ctx, branch) {
  return githubRequest({
    ...ctx,
    path: `/repos/${ctx.owner}/${ctx.repo}/branches/${encodeRef(branch)}`,
  });
}

async function listOpenPulls(ctx) {
  return githubRequest({
    ...ctx,
    path: `/repos/${ctx.owner}/${ctx.repo}/pulls?state=open&base=${encodeURIComponent(MAIN_BRANCH)}&per_page=100`,
  });
}

async function listWorkflowRunsForSha(ctx, sha) {
  return githubRequest({
    ...ctx,
    path: `/repos/${ctx.owner}/${ctx.repo}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=100`,
  });
}

async function dispatchWorkflow(ctx, workflow, ref) {
  await githubRequest({
    ...ctx,
    method: 'POST',
    path: `/repos/${ctx.owner}/${ctx.repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
    body: { ref },
  });
}

async function ensureValidationDispatched(ctx, releaseBranch, releaseSha) {
  const runsResponse = await listWorkflowRunsForSha(ctx, releaseSha);
  const workflowNames = new Set((runsResponse.workflow_runs || []).map(run => run.name));
  const dispatched = [];
  for (const workflow of VALIDATION_WORKFLOWS) {
    const expectedName = workflow.replace(/\.yml$/, '');
    if (workflowNames.has(expectedName)) continue;
    await dispatchWorkflow(ctx, workflow, releaseBranch);
    dispatched.push(workflow);
  }
  return dispatched;
}

async function cleanupBranch(ctx, branch) {
  try {
    await githubRequest({
      ...ctx,
      method: 'DELETE',
      path: `/repos/${ctx.owner}/${ctx.repo}/git/refs/heads/${encodeRef(branch)}`,
    });
  } catch (error) {
    console.error(`Cleanup failed for ${branch}: ${error.message}`);
  }
}

export async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  const repository = process.env.GITHUB_REPOSITORY;
  const { owner, repo } = repositoryParts(repository);
  const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com';
  const dryRun = parseDryRun(process.env.SAFE_RELEASE_DRY_RUN);
  const ctx = { apiUrl, token, owner, repo };
  const outputFile = process.env.GITHUB_OUTPUT;
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;

  const [mainBranch, developBranch, pulls] = await Promise.all([
    getBranch(ctx, MAIN_BRANCH),
    getBranch(ctx, DEVELOP_BRANCH),
    listOpenPulls(ctx),
  ]);
  const mainSha = mainBranch.commit.sha;
  const developSha = developBranch.commit.sha;
  const active = findActiveReleasePulls(pulls);

  if (active.length) {
    const pr = active[0];
    const dispatched = dryRun ? [] : await ensureValidationDispatched(ctx, pr.head.ref, pr.head.sha);
    const message = `Active release PR #${pr.number} already covers ${pr.head.ref}; no new branch created.`;
    console.log(message);
    appendFile(outputFile, 'action=noop-active-release');
    appendFile(outputFile, `pull_request_number=${pr.number}`);
    appendFile(outputFile, `release_branch=${pr.head.ref}`);
    appendFile(summaryFile, `## Safe release manager\n\n${message}\n\nValidation dispatches: ${dispatched.length ? dispatched.join(', ') : 'none'}.`);
    return;
  }

  const comparison = await githubRequest({
    ...ctx,
    path: `/repos/${owner}/${repo}/compare/${encodeRef(MAIN_BRANCH)}...${encodeRef(DEVELOP_BRANCH)}`,
  });
  if (!(comparison.ahead_by > 0)) {
    const message = `develop has no validated changes ahead of main (status=${comparison.status}, ahead_by=${comparison.ahead_by}).`;
    console.log(message);
    appendFile(outputFile, 'action=noop-no-changes');
    appendFile(summaryFile, `## Safe release manager\n\n${message}`);
    return;
  }

  const runsResponse = await listWorkflowRunsForSha(ctx, developSha);
  const gate = evaluateDevelopGate({ developSha, workflowRuns: runsResponse.workflow_runs || [] });
  if (!gate.ready) {
    const message = `develop ${developSha} is not release-eligible: ${gate.reasons.join('; ')}`;
    console.log(message);
    appendFile(outputFile, 'action=noop-ci-not-green');
    appendFile(summaryFile, `## Safe release manager\n\n${message}`);
    return;
  }

  const [mainCheck, developCheck, pullsCheck] = await Promise.all([
    getBranch(ctx, MAIN_BRANCH),
    getBranch(ctx, DEVELOP_BRANCH),
    listOpenPulls(ctx),
  ]);
  if (mainCheck.commit.sha !== mainSha || developCheck.commit.sha !== developSha) {
    throw new Error('main or develop moved during validation; refusing to create a release branch');
  }
  if (findActiveReleasePulls(pullsCheck).length) {
    throw new Error('a release PR appeared during validation; refusing to create a duplicate');
  }

  const releaseBranch = buildReleaseBranchName(developSha, new Date(), process.env.GITHUB_RUN_ID || 'manual');
  const plan = buildReleasePlan({ mainSha, developSha, releaseBranch });
  console.log(JSON.stringify(plan, null, 2));

  if (dryRun) {
    appendFile(outputFile, 'action=dry-run');
    appendFile(outputFile, `release_branch=${releaseBranch}`);
    appendFile(summaryFile, `## Safe release manager dry run\n\nWould create \`${releaseBranch}\` from \`${mainSha}\` and merge \`${developSha}\` into that branch. No production action is included.`);
    return;
  }

  await githubRequest({
    ...ctx,
    method: 'POST',
    path: `/repos/${owner}/${repo}/git/refs`,
    body: { ref: `refs/heads/${releaseBranch}`, sha: mainSha },
  });

  let releaseHead;
  try {
    const merge = await githubRequest({
      ...ctx,
      method: 'POST',
      path: `/repos/${owner}/${repo}/merges`,
      body: {
        base: releaseBranch,
        head: developSha,
        commit_message: `Synchronize develop ${developSha} into ${releaseBranch}`,
      },
    });
    releaseHead = merge.sha;
  } catch (error) {
    await cleanupBranch(ctx, releaseBranch);
    throw error;
  }

  let pullRequest;
  try {
    pullRequest = await githubRequest({
      ...ctx,
      method: 'POST',
      path: `/repos/${owner}/${repo}/pulls`,
      body: {
        title: `Safe release candidate: ${developSha.slice(0, 8)}`,
        head: releaseBranch,
        base: MAIN_BRANCH,
        draft: true,
        maintainer_can_modify: true,
        body: [
          '## Automated safe-release preparation',
          '',
          'This draft PR was created by the GitHub-native safe release manager.',
          '',
          `- main baseline: \`${mainSha}\``,
          `- validated develop source: \`${developSha}\``,
          `- release head: \`${releaseHead}\``,
          `- release branch: \`${releaseBranch}\``,
          '',
          '### Hard restrictions',
          '',
          '- Keep this PR in draft.',
          '- Do not merge to main without a new explicit production GO from Simen.',
          '- Do not create a tag or GitHub Release.',
          '- Do not deploy from this PR.',
          '- Do not modify A/A or A/L behavior outside the reviewed scope.',
          '- Never force-push.',
          '',
          'The manager dispatches read-only safe-release and pc6 validation on the exact release head. It has no code path for Ready, merge-to-main, tag, release, or deploy.',
        ].join('\n'),
      },
    });
  } catch (error) {
    await cleanupBranch(ctx, releaseBranch);
    throw error;
  }

  const dispatched = await ensureValidationDispatched(ctx, releaseBranch, releaseHead);
  appendFile(outputFile, 'action=created-draft-release');
  appendFile(outputFile, `pull_request_number=${pullRequest.number}`);
  appendFile(outputFile, `pull_request_url=${pullRequest.html_url}`);
  appendFile(outputFile, `release_branch=${releaseBranch}`);
  appendFile(outputFile, `release_head=${releaseHead}`);
  appendFile(summaryFile, [
    '## Safe release draft created',
    '',
    `- PR: #${pullRequest.number}`,
    `- branch: \`${releaseBranch}\``,
    `- head: \`${releaseHead}\``,
    `- validations dispatched: ${dispatched.join(', ') || 'already present'}`,
    '- production remains untouched',
  ].join('\n'));
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch(error => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const site = process.env.SITE_URL;
const expected = process.env.EXPECTED_PC2_SHA256;
if (!site) throw new Error('SITE_URL is required');
if (!/^[0-9a-f]{64}$/.test(expected || '')) throw new Error('EXPECTED_PC2_SHA256 must be a SHA-256');

const base = new URL(site.endsWith('/') ? site : `${site}/`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, attempts = 6) {
  let last;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      last = error;
      if (i < attempts) await sleep(10_000);
    }
  }
  throw last;
}

(async () => {
  const htmlBuffer = await fetchWithRetry(base);
  const shaBuffer = await fetchWithRetry(new URL('SHA256.txt', base));
  const actual = crypto.createHash('sha256').update(htmlBuffer).digest('hex');
  const shaText = shaBuffer.toString('utf8');
  const html = htmlBuffer.toString('utf8');

  if (actual !== expected) throw new Error(`published SHA mismatch: ${actual} != ${expected}`);
  if (!shaText.includes(expected)) throw new Error('SHA256.txt does not contain expected release SHA');
  for (const marker of ['NoditechLiquidLiquid', 'data-ll-cutover', 'CoolProp 7.2.0 INCOMP']) {
    if (!html.includes(marker)) throw new Error(`published marker missing: ${marker}`);
  }
  if (/type=["']text\/babel/i.test(html)) throw new Error('published artifact contains text/babel');
  if (/https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com)/i.test(html)) {
    throw new Error('published artifact contains forbidden external runtime dependency');
  }
  console.log(`published L/L release verified: ${actual}`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

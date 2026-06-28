#!/usr/bin/env bash
# Operator script — REAL, deterministic browser UI test for Kalkulator_build9.8-pc2.html.
#
# NOTE ON STATUS:
#   * Claude cannot run any browser test (no browser in Claude's offline environment).
#   * This Playwright variant is OPTIONAL — a convenience runner.
#   * The operator has ALREADY passed a zero-dependency Chrome/CDP browser gate:
#       artifact SHA-256: 0814fb96c351d405029b556f33b984530c59aeb4c12fce2ac01228bec059a424
#       Chrome 149.0.7827.197, desktop + mobile -> 43/43 PASS,
#       derived RH 57.77% / 79.48%, UI total 4.6786 kW (engine 4.678553111004039 kW),
#       0 console errors, 0 page errors, 0 external runtime requests.
#   * Do NOT treat this Playwright runner as a new permanent repo dependency. Use it
#     only if Playwright + Chromium are already available; otherwise the existing
#     Chromium/CDP infrastructure in the repo is authoritative.
#
# Uses only a PUBLIC synthetic test case — no private data. Sets ALL relevant inputs
# explicitly (never relies on UI defaults) and waits on the actual engine state via
# data-engine-* attributes (no fixed sleeps). Drives the UI via stable data-testid.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ART="${1:-$ROOT/dist/Kalkulator_build9.8-pc2.html}"
[ -f "$ART" ] || { echo "FAIL artifact not found: $ART"; exit 2; }

# Portable temp file (macOS BSD mktemp + Linux GNU mktemp): X's must be trailing, so
# create without a suffix and append .mjs afterwards. Kept in TMPDIR (outside the repo)
# so the working tree is never dirtied.
SMOKE_JS="$(mktemp "${TMPDIR:-/tmp}/pc2-smoke-XXXXXX")"
mv "$SMOKE_JS" "$SMOKE_JS.mjs"
SMOKE_JS="$SMOKE_JS.mjs"
trap 'rm -f "$SMOKE_JS"' EXIT
cat > "$SMOKE_JS" <<'JS'
import { chromium } from 'playwright';
const art = process.argv[2];
const url = 'file://' + art;
const fail = (m) => { console.error('FAIL ' + m); process.exit(1); };
const browser = await chromium.launch();

async function setField(page, testid, value) {
  const sel = `[data-testid="${testid}"] input`;
  await page.waitForSelector(sel, { state: 'visible' });
  await page.fill(sel, String(value));
  await page.keyboard.press('Tab');
}
const codeOf = (page) => page.getAttribute('[data-testid="engine-status"]', 'data-engine-code');
const statusOf = (page) => page.getAttribute('[data-testid="engine-status"]', 'data-engine-status');
const numFrom = (t) => parseFloat(String(t || '').replace(/[^0-9.\-]/g, ''));

async function run(page, name) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });

  // explicit inputs — never rely on defaults
  await page.click('[data-testid="unit-C"]');
  await setField(page, 'entering-db', 26);
  await page.selectOption('[data-testid="entering-method"]', 'wb');
  await setField(page, 'entering-wb', 20);
  await setField(page, 'leaving-db', 14);
  await page.selectOption('[data-testid="leaving-method"]', 'wb');
  await setField(page, 'leaving-wb', 12);
  await setField(page, 'airflow', 600);
  await setField(page, 'pressure', 101.5);

  // (1) empty airflow reference -> exact engine code airflow_reference_missing
  await page.waitForFunction(() => {
    const e = document.querySelector('[data-testid="engine-status"]');
    return e && e.getAttribute('data-engine-code') === 'airflow_reference_missing';
  }, { timeout: 8000 }).catch(() => fail(`${name}: expected code airflow_reference_missing, got ${ '' }`));

  // (2) choose leaving
  await page.selectOption('[data-testid="airflow-ref"]', 'leaving');

  // (3-4) status valid|warning AND code ok — wait on real state, not a sleep
  await page.waitForFunction(() => {
    const e = document.querySelector('[data-testid="engine-status"]');
    if (!e) return false;
    const st = e.getAttribute('data-engine-status');
    return (st === 'valid' || st === 'warning') && e.getAttribute('data-engine-code') === 'ok';
  }, { timeout: 8000 }).catch(() => fail(`${name}: engine did not reach valid/ok after choosing reference`));

  // (5) derived RH finite, >0, <=100 for both states
  const eRH = numFrom(await page.textContent('[data-testid="entering-rh-derived"]'));
  const lRH = numFrom(await page.textContent('[data-testid="leaving-rh-derived"]'));
  if (!(eRH > 0 && eRH <= 100)) fail(`${name}: entering derived RH not in (0,100]: ${eRH}`);
  if (!(lRH > 0 && lRH <= 100)) fail(`${name}: leaving derived RH not in (0,100]: ${lRH}`);

  // (6) total capacity numeric
  const uiTotal = numFrom(await page.textContent('[data-testid="total-capacity"]'));
  if (!isFinite(uiTotal)) fail(`${name}: UI total capacity not numeric`);

  // (7) UI total matches the page engine within display rounding (fmt 4 decimals)
  const engineTotal = await page.evaluate(() => window.NoditechAirAir.computeAirAir({
    entering: window.NoditechAirAir.sideInput('wb', 26, undefined, 20),
    leaving: window.NoditechAirAir.sideInput('wb', 14, undefined, 12),
    airflowM3h: 600, airflowReference: 'leaving', pressurePa: 101500,
  }).result.totalCapacityKW);
  if (Math.abs(uiTotal - engineTotal) > 1e-3) fail(`${name}: UI total ${uiTotal} != engine ${engineTotal}`);

  // (8-9) no console/page errors (and no external runtime requests — enforced at build)
  if (errors.length) fail(`${name}: console/page errors: ${errors.slice(0, 3).join(' | ')}`);
  console.log(`OK ${name}: status valid/ok, derived RH ${eRH.toFixed(1)}%/${lRH.toFixed(1)}%, total ${uiTotal} kW (engine ${engineTotal.toFixed(4)})`);
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await run(desktop, 'desktop');
  await desktop.close();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await run(mobile, 'mobile');
  await mobile.close();
  console.log('BROWSER SMOKE PASS');
} finally {
  await browser.close();
}
JS

command -v node >/dev/null 2>&1 || { echo "FAIL node not found"; exit 2; }
echo "Running real, deterministic browser UI smoke test (requires Playwright + Chromium)…"
node "$SMOKE_JS" "$ART"

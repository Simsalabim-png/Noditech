'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  aggregateDeviations,
  computeAggregates,
  publicRegionCounts,
  mean,
  median,
  maxAbs,
} = require('../../src/validation/metrics');

const FIX = path.join(__dirname, 'fixtures');
const detailed = JSON.parse(fs.readFileSync(path.join(FIX, 'detailed_results.synthetic.json'), 'utf8')).cases;

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !~= ${b}`);

test('helpers: mean/median/maxAbs', () => {
  close(mean([2, 10, -4]), 8 / 3);
  assert.equal(median([-4, 2, 10]), 2);
  assert.equal(median([0, 2, 2, 4]), 2);
  assert.equal(maxAbs([2, -10, 4]), -10); // largest magnitude keeps its sign
  assert.equal(mean([]), null);
  assert.equal(median([]), null);
});

test('aggregateDeviations: signed/abs/mean/median/max', () => {
  const a = aggregateDeviations([2, 10, -4]);
  assert.equal(a.n, 3);
  close(a.mean_signed_pct, 8 / 3);
  close(a.mean_abs_pct, 16 / 3);
  assert.equal(a.median_signed_pct, 2);
  assert.equal(a.median_abs_pct, 4);
  assert.equal(a.max_abs_pct, 10);
  assert.equal(a.worst_signed_pct, 10);
});

test('computeAggregates: overall combined + per metric', () => {
  const agg = computeAggregates(detailed);

  // verdict tally
  assert.deepEqual(agg.overall.verdicts, { pass: 2, fail: 1, skip: 1 });

  // combined overall: signed [2,-2,10,-4,0]
  close(agg.overall.combined.mean_signed_pct, 1.2);
  close(agg.overall.combined.mean_abs_pct, 3.6);
  assert.equal(agg.overall.combined.median_signed_pct, 0);
  assert.equal(agg.overall.combined.median_abs_pct, 2);
  assert.equal(agg.overall.combined.max_abs_pct, 10);

  // per-metric cooling: [2,10,-4]
  const cool = agg.overall.byMetric.cooling_capacity_w;
  assert.equal(cool.n, 3);
  close(cool.mean_signed_pct, 8 / 3);
  assert.equal(cool.max_abs_pct, 10);

  // electrical: [0]
  assert.equal(agg.overall.byMetric.electrical_power_w.n, 1);
  assert.equal(agg.overall.byMetric.electrical_power_w.mean_abs_pct, 0);

  // eer: [-2]
  assert.equal(agg.overall.byMetric.eer.n, 1);
  assert.equal(agg.overall.byMetric.eer.worst_signed_pct, -2);
});

test('computeAggregates: grouped per operating region', () => {
  const agg = computeAggregates(detailed);

  assert.deepEqual(Object.keys(agg.byRegion).sort(), ['full_load', 'part_load']);

  const fl = agg.byRegion.full_load;
  assert.deepEqual(fl.verdicts, { pass: 1, fail: 1, skip: 0 });
  // full_load combined signed [2,-2,10]
  close(fl.combined.mean_signed_pct, 10 / 3);
  assert.equal(fl.combined.max_abs_pct, 10);
  // electrical not present in full_load => n=0, nulls
  assert.equal(fl.byMetric.electrical_power_w.n, 0);
  assert.equal(fl.byMetric.electrical_power_w.mean_signed_pct, null);

  const pl = agg.byRegion.part_load;
  assert.deepEqual(pl.verdicts, { pass: 1, fail: 0, skip: 1 });
  // part_load combined signed [-4,0]
  close(pl.combined.mean_signed_pct, -2);
  assert.equal(pl.combined.max_abs_pct, 4);
});

test('SKIP / no-prediction cases excluded from deviation stats but counted as verdicts', () => {
  const agg = computeAggregates(detailed);
  // SYN-PL-2 is SKIP with no metrics: contributes to skip tally, not to deviations.
  const totalDeviations = agg.overall.combined.n;
  assert.equal(totalDeviations, 5); // 2 + 1 + 2 finite signed entries
  assert.equal(agg.overall.verdicts.skip, 1);
});

test('publicRegionCounts: counts only, no deviation values', () => {
  const agg = computeAggregates(detailed);
  const lines = publicRegionCounts(agg);
  assert.deepEqual(lines, [
    'region=full_load pass=1 fail=1 skip=0',
    'region=part_load pass=1 fail=0 skip=1',
    'region=ALL pass=2 fail=1 skip=1',
  ]);
  // No floating-point deviation value should appear (only small integer counts).
  for (const l of lines) {
    assert.equal(/\d+\.\d+/.test(l), false, `decimal value leaked: ${l}`);
  }
});

test('determinism: identical aggregates across runs', () => {
  const a = JSON.stringify(computeAggregates(detailed));
  const b = JSON.stringify(computeAggregates(detailed));
  assert.equal(a, b);
});

'use strict';

/**
 * Demonstrates the architecture requirement: the engine is testable WITHOUT the
 * UI. We require the engine module directly in Node — no DOM, no browser.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const engine = require('../../src-sample/engine.sample.js');

test('engine loads headless (no DOM) and exposes pure functions', () => {
  assert.equal(typeof engine.eer, 'function');
});

test('eer computes COP and fails closed on bad input', () => {
  assert.ok(Math.abs(engine.eer(10000, 3000) - 10000 / 3000) < 1e-9);
  assert.equal(engine.eer(10000, 0), null);      // zero power => fail-closed
  assert.equal(engine.eer(10000, -5), null);     // negative power => fail-closed
  assert.equal(engine.eer(NaN, 3000), null);     // non-finite capacity
  assert.equal(engine.eer(10000, Infinity), null);
});

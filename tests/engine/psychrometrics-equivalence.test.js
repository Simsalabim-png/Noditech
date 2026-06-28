'use strict';

/**
 * Proves the shared psychrometrics module is NUMERICALLY IDENTICAL to the real
 * production engine (tests/engine.js). This is what guarantees pc2's shared engine
 * computes the same physics as Kalkulator_build9.7-pc6.html.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const shared = require('../../src/engine/psychrometrics.js');
const prod = require('../engine.js'); // real engine module exports enth/humR/sVol/wBul...

const TOL = 1e-9;
const close = (a, b, tol = TOL) => assert.ok(Math.abs(a - b) <= tol, `${a} !~= ${b}`);

test('shared primitives == production primitives across a grid', () => {
  const Ps = [85000, 101325, 101500, 105000];
  for (const p of Ps) {
    for (let db = -10; db <= 50; db += 5) {
      for (let rh = 5; rh <= 100; rh += 5) {
        close(shared.humR(db, rh, p), prod.humR(db, rh, p));
        close(shared.enth(db, rh, p), prod.enth(db, rh, p));
        close(shared.sVol(db, rh, p), prod.sVol(db, rh, p));
        close(shared.wBulb(db, rh, p), prod.wBulb(db, rh, p), 1e-6); // iterative; allow tiny slack
      }
    }
  }
});

// Note: production exports humR/enth/sVol/wBulb (not pSat/dewPt). pSat equivalence
// is covered transitively: humR/enth/sVol all derive from pSat, so matching them
// across the grid proves shared.pSat is identical to the production pSat.

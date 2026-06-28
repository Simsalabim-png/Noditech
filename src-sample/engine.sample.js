/*
 * Sample engine module — demonstrates the architecture direction:
 * the calculation engine is a pure, UI-independent module that can be unit
 * tested headless (no DOM). UMD wrapper so the SAME file works both when
 * inlined into the browser artifact and when required directly in Node tests.
 *
 * NOT a physical model — sample-only helpers to exercise the build/test plumbing.
 */
;(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NoditechEngineSample = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // EER/COP = cooling capacity / electrical power. Fail-closed on bad input.
  function eer(coolingCapacityW, electricalPowerW) {
    if (!Number.isFinite(coolingCapacityW)) return null;
    if (!Number.isFinite(electricalPowerW) || electricalPowerW <= 0) return null;
    return coolingCapacityW / electricalPowerW;
  }

  return { eer: eer };
});

/*
 * Sample UI glue — headless-safe. Demonstrates that UI code is a thin layer over
 * the engine and never required for engine tests. No values rendered here.
 */
;(function () {
  'use strict';
  if (typeof document === 'undefined') return; // safe to load in Node/tests
  var el = document.getElementById('app');
  if (el && typeof NoditechEngineSample !== 'undefined') {
    el.setAttribute('data-engine', 'ready');
  }
})();

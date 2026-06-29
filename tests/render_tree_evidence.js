'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const M = require('./mount.js');
const E = require('./engine.js');

const ROOT = path.join(__dirname, '..');
const PROD = path.join(
  ROOT,
  'corrected',
  'Kalkulator_build9.6-rc8_step3_4.src.html'
);

const SHA = crypto
  .createHash('sha256')
  .update(fs.readFileSync(PROD))
  .digest('hex');

const paFrom = fn => E.engcalcAppPressurePa(fn());

const samples = {
  artifact_sha256: SHA,
  runtime:
    'Node.js ' +
    process.version +
    ' (virtual React render tree — NOT a pixel browser)',
  note:
    'Offline semantic rendering of the real App and AirLiquid components. ' +
    'The real Chromium gate remains authoritative for browser interaction.',
  scenarios: [],
};

// App initial pressure contract.
{
  const r = M.renderComponent('App', {});

  const scenario = {
    id: 'A-initial',
    expected_pressure_state: 'missing',
    actual_pressure_state: r.data['data-pressure-state'] || null,
    pressure_missing: r.data['data-pressure-state'] === 'missing',
    no_implicit_101_5: !/value="101\.5"/.test(JSON.stringify(r)),
  };

  scenario.pass =
    scenario.pressure_missing &&
    scenario.no_implicit_101_5;

  samples.scenarios.push(scenario);
}

// AirLiquid state index 8 is the explicit operating mode.
// Default temperatures are 7 -> 12 °C, which is a valid heating case.
// Pressure/status-testene bruker en deterministisk, gyldig
// vannbaseline. Glykol valideres separat av A/L correctness-suiten.
const HEATING_MODE_STATE = {
  0: false,      // useGly = false
  8: 'heating',  // explicit operating mode
};

const cases = [
  [
    'B-missing',
    () => E.engcalcAppPressureInit(),
    'withheld',
  ],
  [
    'B-zero',
    () => E.engcalcAppPressureFromField(0),
    'withheld',
  ],
  [
    'B-above',
    () => E.engcalcAppPressureFromField(120),
    'withheld',
  ],
  [
    'C-valid-95',
    () => E.engcalcAppPressureFromField(95),
    'estimated',
  ],
  [
    'D-reference',
    () => E.engcalcAppPressureReference(),
    'estimated',
  ],
];

for (const [id, pressureFactory, expectedStatus] of cases) {
  const pressure = pressureFactory();
  const pAtm = paFrom(() => pressure);

  const r = M.renderAirLiquid(
    { pAtm },
    HEATING_MODE_STATE
  );

  const actualStatus =
    r.data['data-air-status'] || null;

  const reason =
    r.data['data-air-reason'] || null;

  const liquidVisible = /Q Liquid/.test(r.text);
  const noNaNInfinity = !/NaN|Infinity/.test(r.text);
  const statusMatches = actualStatus === expectedStatus;

  const scenario = {
    id,
    expected_status: expectedStatus,
    actual_status: actualStatus,
    reason,
    pressure_state: pressure.state || null,
    pressure_value_kPa:
      pressure.value_kPa == null
        ? null
        : pressure.value_kPa,
    liquid_visible: liquidVisible,
    no_nan_infinity: noNaNInfinity,
    status_matches: statusMatches,
    pass:
      statusMatches &&
      liquidVisible &&
      noNaNInfinity,
  };

  samples.scenarios.push(scenario);
}

const failed = samples.scenarios.filter(
  scenario => !scenario.pass
);

samples.summary = {
  total: samples.scenarios.length,
  pass: samples.scenarios.length - failed.length,
  fails: failed.length,
};

fs.mkdirSync(path.join(ROOT, 'results'), {
  recursive: true,
});

fs.writeFileSync(
  path.join(ROOT, 'results', 'render_tree_evidence.json'),
  JSON.stringify(samples, null, 2)
);

for (const scenario of samples.scenarios) {
  console.log(
    (scenario.pass ? 'PASS ' : 'FAIL ') +
      scenario.id +
      ' expected=' +
      (
        scenario.expected_status ||
        scenario.expected_pressure_state ||
        '--'
      ) +
      ' actual=' +
      (
        scenario.actual_status ||
        scenario.actual_pressure_state ||
        '--'
      ) +
      (
        scenario.reason
          ? ' reason=' + scenario.reason
          : ''
      )
  );
}

console.log(
  '\nRENDER TREE ' +
    samples.summary.pass +
    '/' +
    samples.summary.total +
    (
      failed.length
        ? '  FAILS ' + failed.length
        : '  ALL GREEN'
    )
);

if (failed.length) {
  console.log(
    JSON.stringify(
      { failed },
      null,
      2
    )
  );
}

process.exit(failed.length ? 1 : 0);

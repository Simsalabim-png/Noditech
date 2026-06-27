# Pending — independent browser verification

These files are intentionally NOT present and must be produced by the independent verifier by running the
real Chromium gate. No simulated or placeholder browser results are shipped.

Run from a freshly extracted copy of this package:

    node tests/run_preflight.js
    CHROMIUM_BIN=/usr/bin/chromium node chromium/run_chromium.js

The runner (chromium/run_chromium.js) starts the packaged static server on 127.0.0.1:<dynamic-port>,
navigates Chromium to http://127.0.0.1:<port>/chromium/test_harness.html, verifies render prerequisites,
runs scenarios A–H against the real rendered application, and writes:

- chromium/results/chromium_result.json       (machine-readable A–H result)
- chromium/results/chromium_junit.xml          (JUnit; failures must be 0)
- chromium/results/render_root_diagnostic.json (render prerequisites + diagnostics)
- chromium/results/chromium_console.log
- chromium/results/chromium_page_errors.log
- chromium/results/chromium_stderr.log
- chromium/results/chromium_network.log
- screenshots/00_rendered_initial.png, 01_initial_missing_withheld.png, 02_invalid_withheld.png,
  03_valid_95.png, 04_reference_101325.png, 05_saved_session.png, 06_print_projection.png

DEF-AL-PRESSURE is set to RESOLVED only after this run is green.

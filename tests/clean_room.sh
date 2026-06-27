#!/usr/bin/env bash
# Step 3.7 clean-room acceptance runner. Extracts the delivered ZIP into a NEW empty directory and runs the
# §11 sequence using ONLY packaged files. Usage: bash tests/clean_room.sh <bundle.zip>
set -u
ZIP="${1:?usage: clean_room.sh <bundle.zip>}"; ZIP="$(cd "$(dirname "$ZIP")" && pwd)/$(basename "$ZIP")"
export BUILD_TS="${BUILD_TS:-2026-06-26T15:00:00.000Z}"
WORK="$(mktemp -d)"; echo "clean-room dir: $WORK"; cd "$WORK"
unzip -q "$ZIP" -d extracted
ROOT="$(dirname "$(dirname "$(find extracted -path '*/tests/run_offline_suite.js' | head -1)")")"; cd "$ROOT"
echo "package root: $(pwd)"; FAILS=0
step(){ echo; echo "== $1 =="; shift; "$@"; local rc=$?; [ $rc -ne 0 ] && FAILS=$((FAILS+1)) && echo "  (exit $rc)"; return 0; }
step "2. verify SHA256SUMS.txt"           sha256sum -c SHA256SUMS.txt
step "3. path / package-boundary checks"  node tests/path_safety.js
step "4. extract application source"      node tests/extract_app_source.js
step "5. compile app.compiled.js"         node tests/compile_app.js
step "6. source equivalence"              node tests/sha_consistency.js
step "7-9. structural + JS syntax"        node tests/run_preflight.js
step "10. local static server"            node tests/server_selftest.js
step "render proofs (offline)"            node tests/harness_render_check.js
step "consolidated offline suite"         node tests/run_offline_suite.js
echo; echo "== 11. real Chromium A–H suite =="
node chromium/run_chromium.js; CR=$?
if [ $CR -eq 0 ]; then echo "  Chromium: PASSED"; STAT="PASSED";
elif [ $CR -eq 3 ]; then echo "  Chromium: PENDING_INDEPENDENT_BROWSER_VERIFICATION (no installed browser here) — run in CI / set CHROMIUM_BIN"; STAT="PENDING";
elif [ $CR -eq 4 ]; then echo "  Chromium: ENVIRONMENT_BLOCKED (navigation blocked by environment policy; NOT an app/render failure) — run the GitHub Actions gate"; STAT="ENVIRONMENT_BLOCKED";
elif [ $CR -eq 5 ]; then echo "  Chromium: NAVIGATION_FAILED ($CR)"; STAT="NAVIGATION_FAILED"; FAILS=$((FAILS+1));
else echo "  Chromium: FAILED ($CR)"; STAT="FAILED"; FAILS=$((FAILS+1)); fi
echo; echo "================ CLEAN-ROOM SUMMARY ================"
echo "offline gate failures: $FAILS"
echo "chromium: $STAT (exit $CR; 0=pass, 3=no browser present)"
[ $FAILS -eq 0 ] && echo "CLEAN-ROOM OFFLINE: ALL GREEN" || echo "CLEAN-ROOM OFFLINE: FAILURES=$FAILS"
[ $FAILS -eq 0 ] && [ "$STAT" = "PASSED" ] && echo "ACCEPTANCE: GREEN (offline + real Chromium)"
exit $FAILS

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const BASE = '123c35290169443623c3f4a4a56cd191374380a7';
const HEAD = cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const OUT = process.argv[2] || 'artifacts/noditech-ll-claude-review-full';
const PROD = 'corrected/Kalkulator_build9.6-rc8_step3_4.src.html';
const PROD_SHA = 'd3080ff5fcf0dd539130c6849edb66aa3db9faed11e6b045561d048c76c99210';
const PC6_SHA = 'b9f8be84731b9038a814ecc32b876d8856d8526ccf28cd35cc1bb1d74167dc50';

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const run = (cmd, args, opts = {}) => cp.execFileSync(cmd, args, { stdio: 'pipe', ...opts });
const ensure = (cond, msg) => { if (!cond) throw new Error(msg); };
const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
run('git', ['cat-file', '-e', `${BASE}^{commit}`]);
ensure(sha(fs.readFileSync(PROD)) === PROD_SHA, 'production source SHA mismatch');
for (const file of ['Kalkulator_build9.7-pc6.html', 'index.html', 'Kalkulator.html']) {
  ensure(sha(fs.readFileSync(file)) === PC6_SHA, `${file} SHA mismatch`);
}

for (const [ref, dir] of [[HEAD, 'head'], [BASE, 'base']]) {
  const tar = run('git', ['archive', '--format=tar', ref]);
  fs.mkdirSync(path.join(OUT, 'repo', dir), { recursive: true });
  cp.execFileSync('tar', ['-xf', '-', '-C', path.join(OUT, 'repo', dir)], { input: tar });
}
write(path.join(OUT, 'diff', 'develop-to-head.diff'), run('git', ['diff', '--binary', '--full-index', BASE, HEAD]));
write(path.join(OUT, 'diff', 'name-status.txt'), run('git', ['diff', '--name-status', BASE, HEAD]));
write(path.join(OUT, 'diff', 'stat.txt'), run('git', ['diff', '--stat', BASE, HEAD]));
write(path.join(OUT, 'diff', 'commits.txt'), run('git', ['log', '--oneline', `${BASE}..${HEAD}`]));

const source = fs.readFileSync(PROD, 'utf8');
const { transformLiqLiqShadow } = require('../../src/engine/liquidLiquidUiTransform.js');
const candidate = transformLiqLiqShadow(source);
const section = (text, start, end) => {
  const a = text.indexOf(start); const b = text.indexOf(end, a);
  ensure(a >= 0 && b > a, `missing section ${start} -> ${end}`);
  return text.slice(a, b);
};
const aa0 = section(source, 'function AirAir(', 'function AirLiquid(');
const aa1 = section(candidate, 'function AirAir(', 'function AirLiquid(');
const al0 = section(source, 'function AirLiquid(', 'function LiqLiq(');
const al1 = section(candidate, 'function AirLiquid(', 'function LiqLiq(');
ensure(aa0 === aa1, 'A/A freeze violation');
ensure(al0 === al1, 'A/L freeze violation');
write(path.join(OUT, 'candidate', 'Kalkulator_ll_shadow.candidate.html'), candidate);
write(path.join(OUT, 'evidence', 'freeze-proof.json'), JSON.stringify({
  airAir: { byteIdentical: true, sha256: sha(aa0), bytes: Buffer.byteLength(aa0) },
  airLiquid: { byteIdentical: true, sha256: sha(al0), bytes: Buffer.byteLength(al0) },
  sourceSha256: sha(source), candidateSha256: sha(candidate)
}, null, 2) + '\n');

const env = { ...process.env, BUILD_TS: '2026-06-29T00:00:00.000Z' };
write(path.join(OUT, 'evidence', 'node-tests.log'), run('node', ['--test', 'tests/validation/*.test.js', 'tests/build/*.test.js', 'tests/engine/*.test.js'], { encoding: 'utf8', shell: true }));
write(path.join(OUT, 'evidence', 'compile-production.log'), run('node', ['tests/compile_app.js'], { encoding: 'utf8', env }));
fs.copyFileSync('chromium/generated/app.compiled.js', path.join(OUT, 'candidate', 'app.production.compiled.js'));
fs.copyFileSync('chromium/results/source_equivalence.json', path.join(OUT, 'evidence', 'source-equivalence-production.json'));
write(path.join(OUT, 'evidence', 'compile-candidate.log'), run('node', ['tests/compile_app.js'], { encoding: 'utf8', env: { ...env, NODITECH_LL_CANDIDATE: '1' } }));
fs.copyFileSync('chromium/generated/app.compiled.js', path.join(OUT, 'candidate', 'app.ll-candidate.compiled.js'));
fs.copyFileSync('chromium/results/source_equivalence.json', path.join(OUT, 'evidence', 'source-equivalence-candidate.json'));

write(path.join(OUT, 'REVIEW_INSTRUCTIONS.md'), `# Claude independent review — complete offline bundle\n\nRepository: Simsalabim-png/Noditech\nBranch: feature/liquid-liquid-mode-aware-correctness\nBase: ${BASE}\nHead: ${HEAD}\nPR: #24\n\nA/A and A/L are hard-frozen and any difference is an immediate BLOCK. Review the full base/head trees, complete diff, candidate, compiled outputs, tests, compile logs and freeze proof. Start with APPROVE, APPROVE WITH CONDITIONS, or BLOCK. For each finding include severity, file/line, problem, impact, minimal correction and proving test. No merge, release or deploy is authorized.\n`);

const manifest = { schema: 'noditech.claude-review-bundle/4', complete: true, base: BASE, head: HEAD, airAirFrozen: true, airLiquidFrozen: true, files: {} };
for (const file of fs.readdirSync(OUT, { recursive: true })) {
  const full = path.join(OUT, file);
  if (fs.statSync(full).isFile()) manifest.files[file] = { sha256: sha(fs.readFileSync(full)), bytes: fs.statSync(full).size };
}
write(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(OUT);

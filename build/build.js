'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Deterministic build: assemble a template + ordered CSS/JS partials into ONE
 * self-contained HTML artifact. Same inputs => byte-identical output.
 *
 * Determinism guarantees:
 *  - no timestamps, no build-host paths, no environment data in the output;
 *  - LF line endings; trailing CR stripped from sources;
 *  - inlining order is fixed by the manifest (not directory listing order);
 *  - a non-circular content hash: computed over the assembled HTML with the
 *    hash token still present, then the token is replaced by the hash (a file
 *    cannot contain its own full-file hash, so we bind a content hash instead).
 *
 * Zero external dependencies; uses only Node built-ins.
 */

const MARKER = (key) => `<!-- INLINE:${key} -->`;

function normalizeLF(text) {
  return String(text).replace(/\r\n?/g, '\n');
}

function wrapPartial(file, content) {
  const ext = path.extname(file).toLowerCase();
  const body = normalizeLF(content).replace(/\s+$/g, '');
  if (ext === '.css') return `<style>\n${body}\n</style>`;
  if (ext === '.js') return `<script>\n${body}\n</script>`;
  // Default: inline raw (e.g. an .html partial).
  return body;
}

/**
 * Assemble the artifact in memory.
 * @param {object} opts
 * @param {string} opts.srcDir directory containing template + partials
 * @param {object} opts.manifest parsed manifest
 * @returns {{html: string, contentHash: string, sha256: string, output: string}}
 */
function assemble({ srcDir, manifest }) {
  const token = manifest.content_hash_token || '__ARTIFACT_CONTENT_HASH__';
  const templatePath = path.join(srcDir, manifest.template);
  let html = normalizeLF(fs.readFileSync(templatePath, 'utf8'));

  const keys = Object.keys(manifest.inline); // manifest order is authoritative
  for (const key of keys) {
    const files = manifest.inline[key];
    const blocks = files.map((f) => wrapPartial(f, fs.readFileSync(path.join(srcDir, f), 'utf8')));
    const marker = MARKER(key);
    if (!html.includes(marker)) {
      throw new Error(`template is missing marker for "${key}": ${marker}`);
    }
    html = html.replace(marker, blocks.join('\n'));
  }

  // Any unresolved markers => fail (avoids silently shipping a placeholder).
  const leftover = html.match(/<!--\s*INLINE:[^>]*-->/);
  if (leftover) throw new Error(`unresolved inline marker: ${leftover[0]}`);

  // Non-circular content hash: hash the assembled HTML WITH the token present.
  const contentHash = crypto.createHash('sha256').update(html, 'utf8').digest('hex');
  html = html.split(token).join(contentHash);

  // Ensure a single trailing newline, LF only.
  html = html.replace(/\n*$/, '\n');

  const sha256 = crypto.createHash('sha256').update(html, 'utf8').digest('hex');
  return { html, contentHash, sha256, output: manifest.output };
}

function loadManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function build({ srcDir, manifestPath, distDir }) {
  const manifest = loadManifest(manifestPath);
  const result = assemble({ srcDir, manifest });
  if (distDir) {
    fs.mkdirSync(distDir, { recursive: true });
    const outPath = path.join(distDir, result.output);
    fs.writeFileSync(outPath, result.html, { encoding: 'utf8' });
    fs.writeFileSync(
      path.join(distDir, 'SHA256SUMS.dist.txt'),
      `${result.sha256}  ${result.output}\n`,
      'utf8',
    );
    return { ...result, outPath };
  }
  return result;
}

module.exports = { assemble, build, loadManifest, normalizeLF, wrapPartial };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  // Output directory can be overridden (used by verify-reproducible.js to build
  // two independent copies into separate temp directories).
  const distDir = process.env.NODITECH_DIST_DIR || path.join(root, 'dist');
  const out = build({
    srcDir: path.join(root, 'src-sample'),
    manifestPath: path.join(__dirname, 'build.manifest.json'),
    distDir,
  });
  process.stdout.write(`built ${out.output}\nsha256 ${out.sha256}\ncontent_hash ${out.contentHash}\n`);
}

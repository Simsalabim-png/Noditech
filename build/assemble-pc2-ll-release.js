#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const WORK = path.resolve(__dirname, '..');
const ORIGINAL = path.join(__dirname, 'assemble-pc2.js');

function replaceOnce(source, anchor, replacement, label) {
  const first = source.indexOf(anchor);
  if (first < 0) throw new Error(`${label} anchor not found`);
  if (source.indexOf(anchor, first + anchor.length) >= 0) throw new Error(`${label} anchor is not unique`);
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

function loadReleaseBuilder() {
  let source = fs.readFileSync(ORIGINAL, 'utf8');
  source = replaceOnce(
    source,
    'function build() {\n',
    "function build(options = {}) {\n  const llRelease = options.liquidLiquidCutover === true;\n",
    'build signature'
  );
  source = replaceOnce(
    source,
    '  appSrc = applyUiTransforms(appSrc);\n\n  const lock',
    "  appSrc = applyUiTransforms(appSrc);\n  let liquidLiquidDataset = null;\n  if (llRelease) {\n    const built = require('../src/engine/liquidLiquidCutoverBuild.js').buildLiquidLiquidCutoverSource(appSrc);\n    appSrc = built.source;\n    liquidLiquidDataset = built.dataset;\n  }\n\n  const lock",
    'cutover injection'
  );
  source = replaceOnce(
    source,
    "  return { html: out, sha256: sha(Buffer.from(out, 'utf8')), pc6sha: EXPECT_PC6, rc8sha: EXPECT_RC8 };",
    "  return { html: out, sha256: sha(Buffer.from(out, 'utf8')), pc6sha: EXPECT_PC6, rc8sha: EXPECT_RC8, mode: llRelease ? 'liquid-liquid-cutover' : 'production', liquidLiquidDataset };",
    'build result'
  );

  const compiledModule = new Module(ORIGINAL, module);
  compiledModule.filename = ORIGINAL;
  compiledModule.paths = Module._nodeModulePaths(__dirname);
  compiledModule._compile(source, ORIGINAL);
  return compiledModule.exports;
}

function build() {
  const builder = loadReleaseBuilder();
  const base = builder.build({ liquidLiquidCutover: true });
  const milestone1 = require('../src/ui/milestone1ArtifactTransform.js').applyMilestone1ArtifactTransform(base.html);
  const finalized = require('../src/ui/milestone1ArtifactFinalizer.js').applyMilestone1ArtifactFinalizer(milestone1.html);
  return {
    ...base,
    html: finalized.html,
    sha256: finalized.sha256,
    milestone1: {
      before: milestone1.before,
      after: finalized.after,
    },
  };
}

module.exports = { build, loadReleaseBuilder, replaceOnce };

if (require.main === module) {
  const distDir = process.env.NODITECH_DIST_DIR || path.join(WORK, 'dist');
  const result = build();
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'Kalkulator_build9.8-pc2.html'), result.html, 'utf8');
  fs.writeFileSync(path.join(distDir, 'SHA256SUMS.pc2.txt'), `${result.sha256}  Kalkulator_build9.8-pc2.html\n`, 'utf8');
  process.stdout.write(
    `built Kalkulator_build9.8-pc2.html\n` +
    `mode ${result.mode}\n` +
    `sha256 ${result.sha256}\n` +
    `bytes ${Buffer.byteLength(result.html)}\n` +
    `air-air-before ${result.milestone1.before.airAir}\n` +
    `air-air-after ${result.milestone1.after.airAir}\n` +
    `air-liquid-before ${result.milestone1.before.airLiquid}\n` +
    `air-liquid-after ${result.milestone1.after.airLiquid}\n`
  );
}

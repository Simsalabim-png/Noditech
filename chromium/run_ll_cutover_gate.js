#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const filename = path.join(__dirname, 'run_ll_cutover.js');
let source = fs.readFileSync(filename, 'utf8');
const broken = '};true`;';
const fixed = '},true`;';
if (!source.includes(broken)) {
  throw new Error('Expected L/L browser helper anchor is missing');
}
source = source.replace(broken, fixed);
if (source.includes(broken)) {
  throw new Error('L/L browser helper anchor is not unique');
}
const runner = new Module(filename, module);
runner.filename = filename;
runner.paths = module.paths;
runner._compile(source, filename);

'use strict';

const crypto = require('node:crypto');

const EXPECTED_PRODUCTION_STYLE_SHA256 = 'd05974bba0660376cc441c670ce40db14cf805bb772bdc48e61e6fb118eb0b98';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function extractProductionStyle(html) {
  if (typeof html !== 'string' || !html.length) throw new Error('production HTML is required');
  const open = '<style>';
  const close = '</style>';
  const start = html.indexOf(open);
  if (start < 0) throw new Error('production style block not found');
  if (html.indexOf(open, start + open.length) >= 0) throw new Error('production style block is not unique');
  const end = html.indexOf(close, start + open.length);
  if (end < 0) throw new Error('production style block is not closed');
  if (html.indexOf(close, end + close.length) >= 0) throw new Error('production style close is not unique');
  const css = html.slice(start + open.length, end);
  const cssSha256 = sha256(Buffer.from(css, 'utf8'));
  if (cssSha256 !== EXPECTED_PRODUCTION_STYLE_SHA256) {
    throw new Error(`production style SHA mismatch: ${cssSha256} != ${EXPECTED_PRODUCTION_STYLE_SHA256}`);
  }
  if (/https?:\/\//i.test(css) || /@import\b/i.test(css)) {
    throw new Error('production style contains an external resource reference');
  }
  return { css, cssSha256, bytes: Buffer.byteLength(css, 'utf8') };
}

module.exports = {
  EXPECTED_PRODUCTION_STYLE_SHA256,
  extractProductionStyle,
};

'use strict';

const FIELD_ESTIMATE_TEXT = 'Field estimate — not an accredited laboratory measurement.';

function replaceOnce(source, anchor, replacement, label) {
  const first = source.indexOf(anchor);
  if (first < 0) throw new Error(`${label}: anchor not found`);
  if (source.indexOf(anchor, first + anchor.length) >= 0) throw new Error(`${label}: anchor not unique`);
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

function applyFieldEstimateDisclaimer(html) {
  const css = `
    .res::before{
      content:"${FIELD_ESTIMATE_TEXT}";
      display:block;
      margin:0 0 12px 0;
      padding:8px 10px;
      border:1px solid rgba(251,191,36,.26);
      border-radius:8px;
      background:rgba(251,191,36,.08);
      color:#fbbf24;
      font-size:10px;
      line-height:1.45;
      letter-spacing:.02em;
    }
    @media print{
      .res::before{
        color:#000!important;
        background:#fff8dc!important;
        border:1px solid #999!important;
      }
    }
`;
  return replaceOnce(html, '    @media(max-width:520px)', css + '    @media(max-width:520px)', 'field estimate disclaimer css');
}

function applyFieldSafetyArtifactFinalizer(html) {
  if (typeof html !== 'string') throw new Error('field safety finalizer requires html string');
  if (html.includes(FIELD_ESTIMATE_TEXT)) return { html, fieldEstimateText: FIELD_ESTIMATE_TEXT };
  const out = applyFieldEstimateDisclaimer(html);
  return { html: out, fieldEstimateText: FIELD_ESTIMATE_TEXT };
}

module.exports = {
  FIELD_ESTIMATE_TEXT,
  applyFieldEstimateDisclaimer,
  applyFieldSafetyArtifactFinalizer,
  replaceOnce,
};

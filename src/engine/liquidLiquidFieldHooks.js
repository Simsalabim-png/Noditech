'use strict';

function replaceOnce(source, anchor, replacement, label) {
  const first = source.indexOf(anchor);
  if (first < 0) throw new Error(`${label} hook anchor not found`);
  if (source.indexOf(anchor, first + anchor.length) >= 0) throw new Error(`${label} hook anchor not unique`);
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

function addLiquidLiquidFieldHooks(source) {
  const start = source.indexOf('function LiqLiq(');
  const end = source.indexOf('function GuideAA(', start);
  if (!(start >= 0 && end > start)) throw new Error('LiqLiq hook section not found');
  const prefix = source.slice(0, start);
  const suffix = source.slice(end);
  let ll = source.slice(start, end);

  ll = replaceOnce(
    ll,
    '<div data-ll-cutover="true" data-ll-operating-mode={operatingMode} data-ll-status={_llContract.status} data-ll-code={_llContract.code} data-ll-save-allowed={_llContract.saveAllowed?"true":"false"}>',
    '<div data-ll-cutover="true" data-ll-operating-mode={operatingMode} data-ll-valid={_llContract.valid?"true":"false"} data-ll-status={_llContract.status} data-ll-code={_llContract.code} data-ll-save-allowed={_llContract.saveAllowed?"true":"false"} data-ll-balance-deviation={Number.isFinite(_llUi.balanceDeviation_pct)?String(_llUi.balanceDeviation_pct):""} data-ll-cold-capacity={Number.isFinite(Qc)?String(Qc):""} data-ll-hot-capacity={Number.isFinite(Qh)?String(Qh):""}>',
    'root status'
  );

  ll = replaceOnce(ll, '<select value={cFt} onChange={e=>setCFt(e.target.value)}>', '<select data-ll-select="cold-fluid" value={cFt} onChange={e=>setCFt(e.target.value)}>', 'cold fluid');
  ll = replaceOnce(ll, '<select value={hFt} onChange={e=>setHFt(e.target.value)}>', '<select data-ll-select="hot-fluid" value={hFt} onChange={e=>setHFt(e.target.value)}>', 'hot fluid');
  ll = replaceOnce(ll, '<select value={cGlyKind} onChange={e=>setCGlyKind(e.target.value)}', '<select data-ll-select="cold-glycol-kind" value={cGlyKind} onChange={e=>setCGlyKind(e.target.value)}', 'cold glycol kind');
  ll = replaceOnce(ll, '<select value={hGlyKind} onChange={e=>setHGlyKind(e.target.value)}', '<select data-ll-select="hot-glycol-kind" value={hGlyKind} onChange={e=>setHGlyKind(e.target.value)}', 'hot glycol kind');

  ll = replaceOnce(ll, '{cFt==="glycol"&&<div className="field"><div className="lbl"><span>Glycol Concentration</span>', '{cFt==="glycol"&&<div className="field" data-ll-field="cold-glycol-percent"><div className="lbl"><span>Glycol Concentration</span>', 'cold glycol percent');
  ll = replaceOnce(ll, '{hFt==="glycol"&&<div className="field"><div className="lbl"><span>Glycol Concentration</span>', '{hFt==="glycol"&&<div className="field" data-ll-field="hot-glycol-percent"><div className="lbl"><span>Glycol Concentration</span>', 'hot glycol percent');

  const fields = [
    ['cold-inlet', 'cTi'], ['cold-outlet', 'cTo'], ['cold-flow', 'cF'],
    ['hot-inlet', 'hTi'], ['hot-outlet', 'hTo'], ['hot-flow', 'hF'],
    ['power', 'pw'],
  ];
  for (const [name, value] of fields) {
    const anchor = `<div className="field"><div className="lbl"><span>${name === 'power' ? 'Compressor Power' : name.endsWith('flow') ? 'Flow' : name.endsWith('inlet') ? 'T Inlet' : 'T Outlet'}</span>`;
    const valueAnchor = `<FloatInput value={${value}}`;
    const first = ll.indexOf(anchor);
    let match = first;
    while (match >= 0) {
      const close = ll.indexOf(valueAnchor, match);
      const next = ll.indexOf(anchor, match + anchor.length);
      if (close >= 0 && (next < 0 || close < next)) break;
      match = next;
    }
    if (match < 0) throw new Error(`${name} field hook anchor not found`);
    const replacement = anchor.replace('<div className="field">', `<div className="field" data-ll-field="${name}">`);
    ll = ll.slice(0, match) + replacement + ll.slice(match + anchor.length);
  }

  return prefix + ll + suffix;
}

module.exports = {
  addLiquidLiquidFieldHooks,
};

'use strict';

function replaceOnce(source, anchor, replacement, label) {
  const first = source.indexOf(anchor);
  if (first < 0) throw new Error(`${label} anchor not found`);
  if (source.indexOf(anchor, first + anchor.length) >= 0) throw new Error(`${label} anchor not unique`);
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

function transformLiqLiqShadow(source) {
  const aaStart = source.indexOf('function AirAir(');
  const alStart = source.indexOf('function AirLiquid(');
  const llStart = source.indexOf('function LiqLiq(');
  if (!(aaStart >= 0 && alStart > aaStart && llStart > alStart)) throw new Error('mode sections not found');
  const airAirBefore = source.slice(aaStart, alStart);
  const airLiquidBefore = source.slice(alStart, llStart);

  let out = replaceOnce(
    source,
    'function LiqLiq({unit,job,uid,setLog,setShowLog,pAtm=101500,measDate=""}){\n  const [cFt,setCFt]=useState("water");',
    'function LiqLiq({unit,job,uid,setLog,setShowLog,pAtm=101500,measDate=""}){\n  const [operatingMode,setOperatingMode]=useState("cooling");\n  const [cFt,setCFt]=useState("water");',
    'state'
  );

  out = replaceOnce(
    out,
    '  const ec=eCol(eer);\n  function save(){',
    '  const ec=eCol(eer);\n  const _llShadowValid=(operatingMode==="cooling"||operatingMode==="heating")&&(cTiC>cToC)&&(hToC>hTiC)&&isFinite(Qc)&&Qc>0&&isFinite(Qh)&&Qh>0&&isFinite(pTot)&&pTot>0;\n  const _llShadowCode=(cTiC<=cToC)?"cold_direction_invalid":((hToC<=hTiC)?"hot_direction_invalid":(_llShadowValid?"ok":"shadow_invalid"));\n  function save(){',
    'shadow'
  );

  out = replaceOnce(
    out,
    '  return(<>\n    <ValidationBanner issues={_issues}/>',
    '  return(<div data-ll-shadow="true" data-ll-operating-mode={operatingMode} data-ll-shadow-valid={_llShadowValid?"true":"false"} data-ll-shadow-code={_llShadowCode}>\n    <div className="card no-print" data-ll-mode-selector="true">\n      <div className="slbl">Operating Mode</div>\n      <div style={{display:"flex",gap:8}}>\n        <button type="button" onClick={()=>setOperatingMode("cooling")}>Cooling</button>\n        <button type="button" onClick={()=>setOperatingMode("heating")}>Heating</button>\n      </div>\n    </div>\n    <ValidationBanner issues={_issues}/>',
    'return'
  );

  out = replaceOnce(
    out,
    '    <div className="brow no-print">\n      <button className="bt bt-g" onClick={save}>Save Measurement</button>\n      <button className="bt bt-b" onClick={()=>window.print()}>Print / PDF</button>\n    </div>\n  </>);\n}\n\nfunction EnergyRating',
    '    <div className="brow no-print">\n      <button className="bt bt-g" onClick={save}>Save Measurement</button>\n      <button className="bt bt-b" onClick={()=>window.print()}>Print / PDF</button>\n    </div>\n  </div>);\n}\n\nfunction EnergyRating',
    'end'
  );

  const aaAfter = out.slice(out.indexOf('function AirAir('), out.indexOf('function AirLiquid('));
  const alAfter = out.slice(out.indexOf('function AirLiquid('), out.indexOf('function LiqLiq('));
  if (aaAfter !== airAirBefore) throw new Error('A/A section changed');
  if (alAfter !== airLiquidBefore) throw new Error('A/L section changed');
  return out;
}

module.exports = { replaceOnce, transformLiqLiqShadow };

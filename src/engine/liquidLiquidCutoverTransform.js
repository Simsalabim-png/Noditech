'use strict';

const { buildLiquidLiquidBrowserBundle } = require('./liquidLiquidBrowserBundle.js');
const { productionProviderBrowserSource } = require('./liquidLiquidProductionProvider.js');

function replaceOnce(source, anchor, replacement, label) {
  const first = source.indexOf(anchor);
  if (first < 0) throw new Error(`${label} anchor not found`);
  if (source.indexOf(anchor, first + anchor.length) >= 0) throw new Error(`${label} anchor not unique`);
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

function replaceBetween(source, startAnchor, endAnchor, replacement, label) {
  const start = source.indexOf(startAnchor);
  if (start < 0) throw new Error(`${label} start anchor not found`);
  if (source.indexOf(startAnchor, start + startAnchor.length) >= 0) throw new Error(`${label} start anchor not unique`);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  if (end < 0) throw new Error(`${label} end anchor not found`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function section(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (!(a >= 0 && b > a)) throw new Error(`section ${start}..${end} not found`);
  return source.slice(a, b);
}

function transformLiqLiqCutover(source) {
  const llStart = source.indexOf('function LiqLiq(');
  const llEnd = source.indexOf('function GuideAA(', llStart);
  if (!(llStart >= 0 && llEnd > llStart)) throw new Error('LiqLiq component section not found');

  const aaBefore = section(source, 'function AirAir(', 'function AirLiquid(');
  const alBefore = section(source, 'function AirLiquid(', 'function LiqLiq(');
  const prefix = source.slice(0, llStart);
  const suffix = source.slice(llEnd);
  let ll = source.slice(llStart, llEnd);

  ll = replaceOnce(
    ll,
    'function LiqLiq({unit,job,uid,setLog,setShowLog,pAtm=101500,measDate=""}){\n  const [cFt,setCFt]=useState("water");const [cGp,setCGp]=useState(30);',
    'function LiqLiq({unit,job,uid,setLog,setShowLog,pAtm=101500,measDate=""}){\n  const [operatingMode,setOperatingMode]=useState("cooling");\n  const [cFt,setCFt]=useState("water");const [cGp,setCGp]=useState(30);',
    'component state'
  );
  ll = replaceOnce(ll, 'const [cTi,setCTi]=useState(7);const [cTo,setCTo]=useState(12);', 'const [cTi,setCTi]=useState(12);const [cTo,setCTo]=useState(7);', 'cold defaults');
  ll = replaceOnce(ll, 'const [hTi,setHTi]=useState(40);const [hTo,setHTo]=useState(35);', 'const [hTi,setHTi]=useState(30);const [hTo,setHTo]=useState(35);', 'hot defaults');

  const evaluation = `  const C=v=>unit==="F"?(v-32)*5/9:v;const F=v=>unit==="F"?v*9/5+32:v;\n` +
    `  const cTiC=C(cTi),cToC=C(cTo),hTiC=C(hTi),hToC=C(hTo);\n` +
    `  const _llApi=(typeof window!=="undefined"&&window.NoditechLiquidLiquid)?window.NoditechLiquidLiquid:null;\n` +
    `  ${productionProviderBrowserSource('_llGlycolLookup')}\n` +
    `  const _llState={unit,operatingMode,cFt,cGp,cGlyKind,cTi,cTo,cF,hFt,hGp,hGlyKind,hTi,hTo,hF,pw,job,uid,ref,measDate};\n` +
    `  const _llEval=_llApi?_llApi.evaluateLegacyLiquidLiquidState(_llState,{glycolLookup:_llGlycolLookup}):{engineInput:null,result:{valid:false,code:"browser_bundle_missing",message:"Liquid/Liquid engine is unavailable.",saveAllowed:false,cold:null,hot:null},contract:{valid:false,status:"blocked",code:"browser_bundle_missing",message:"Liquid/Liquid engine is unavailable.",saveAllowed:false,ui:{resultVisible:false,status:"blocked",statusLabel:"BLOCKED",statusMessage:"Liquid/Liquid engine is unavailable.",usefulCapacity_kW:null,cop:null,balanceDeviation_pct:null,energyResidual_kW:null},record:null,json:null,csv:null,print:null}};\n` +
    `  const _llResult=_llEval.result,_llContract=_llEval.contract,_llUi=_llContract.ui,_llRecord=_llContract.record;\n` +
    `  const _cold=_llRecord?_llRecord.cold:null,_hot=_llRecord?_llRecord.hot:null;\n` +
    `  const cpC=_cold?_cold.cpKJkgK:null,rC=_cold?_cold.densityKgL:null;\n` +
    `  const cpH=_hot?_hot.cpKJkgK:null,rH=_hot?_hot.densityKgL:null;\n` +
    `  const mC=_cold?_cold.massFlow_kg_s:null,mH=_hot?_hot.massFlow_kg_s:null;\n` +
    `  const Qc=_cold?_cold.capacity_kW:null,Qh=_hot?_hot.capacity_kW:null;\n` +
    `  const pTot=_llRecord?_llRecord.electricalPower_kW:null,eer=_llUi.cop,copHeat=_llRecord?_llRecord.copHeating:null;\n` +
    `  const residual=_llUi.energyResidual_kW,bal=_llUi.balanceDeviation_pct;\n` +
    `  const ec=eCol(Number.isFinite(eer)?eer:0);\n` +
    `  const _llNum=(value,digits=4)=>Number.isFinite(value)?fmt(value,digits):"--";\n`;

  ll = replaceBetween(
    ll,
    '  const C=v=>unit==="F"?(v-32)*5/9:v;const F=v=>unit==="F"?v*9/5+32:v;\n',
    '  function save(){\n',
    evaluation,
    'contract evaluation'
  );

  const actions = `  function _llDownload(filename,mime,text){\n` +
    `    if(!_llContract.valid||!text)return;\n` +
    `    const a=document.createElement("a");a.href="data:"+mime+";charset=utf-8,"+encodeURIComponent(text);a.download=filename;a.click();\n` +
    `  }\n` +
    `  function exportLlJson(){_llDownload("noditech-liquid-liquid.json","application/json",_llApi.serializeLiquidLiquidJson(_llContract));}\n` +
    `  function exportLlCsv(){_llDownload("noditech-liquid-liquid.csv","text/csv",_llApi.serializeLiquidLiquidCsv(_llContract));}\n` +
    `  function save(){\n` +
    `    if(!_llContract.saveAllowed||!_llContract.record)return;\n` +
    `    const r=_llContract.record;\n` +
    `    const _rs=refrigState(ref,sP,dP,(unit==="F"?C(sT):sT),(unit==="F"?C(liqT):liqT),pAtm/1000);\n` +
    `    const tE=_rs?_rs.tE:null,sh=_rs?_rs.sh:null,tCond=_rs?_rs.tC:null;\n` +
    `    const entry={id:Date.now(),date:measDate||new Date().toLocaleString(),mode:"Liq/Liq "+(r.operatingMode==="heating"?"Heating":"Cooling"),operatingMode:r.operatingMode,capacityType:r.operatingMode,status:r.status,job:job||"--",uid:uid||"--",ref,` +
      `t1:fmt(F(r.cold.inletC),2),t2:fmt(F(r.cold.outletC),2),wb1:"--",wb2:"--",rh1:"--",rh2:"--",` +
      `wTi:fmt(F(r.hot.inletC),2),wTo:fmt(F(r.hot.outletC),2),wF:fmt(r.hot.flowLs,4),af:"--",pw:fmt(r.electricalPower_kW,4),` +
      `Q:fmt(r.usefulCapacity_kW,4),Qw:fmt(r.hot.capacity_kW,4),Qcold:fmt(r.cold.capacity_kW,4),Qhot:fmt(r.hot.capacity_kW,4),eer:fmt(r.cop,4),usefulCapacity_kW:r.usefulCapacity_kW,cop:r.cop,` +
      `energyResidual_kW:r.energyResidual_kW,balanceDeviation_pct:r.balanceDeviation_pct,` +
      `ll_record:r,ll_json:_llContract.json,ll_csv:_llContract.csv,ll_print:_llContract.print,` +
      `tE:tE!=null?fmt(tE,4):"--",sh:sh!=null?fmt(sh,4):"--",tC:tCond!=null?fmt(tCond,4):"--",sP:fmt(sP,4),dP:fmt(dP,4),unit};\n` +
    `    setLog(p=>[entry,...p]);setShowLog(true);\n` +
    `  }\n`;

  ll = replaceBetween(ll, '  function save(){\n', '  const _dTc = Math.abs(cToC-cTiC), _dTh = Math.abs(hToC-hTiC);\n', actions, 'save and export');

  ll = replaceOnce(
    ll,
    '  const _dTc = Math.abs(cToC-cTiC), _dTh = Math.abs(hToC-hTiC);\n  const _issues = validateInputs(\'ll\', {dTc:_dTc, dTh:_dTh, Qc, Qh, cF:cF, hF:hF, pw, eer});\n  return(<>\n    <ValidationBanner issues={_issues}/>',
    '  const _dTc=Math.abs(cToC-cTiC),_dTh=Math.abs(hToC-hTiC);\n  const _issues=_llContract.valid?validateInputs(\'ll\',{dTc:_dTc,dTh:_dTh,Qc,Qh,cF,hF,pw,eer}):[{level:\'critical\',msg:_llContract.message||\'Liquid/Liquid result is blocked.\'}];\n  return(<div data-ll-cutover="true" data-ll-operating-mode={operatingMode} data-ll-status={_llContract.status} data-ll-code={_llContract.code} data-ll-save-allowed={_llContract.saveAllowed?"true":"false"}>\n    <div className="card no-print" data-ll-mode-select="true">\n      <div className="slbl">Operating Mode</div>\n      <div style={{display:\'flex\',gap:8}}>\n        <button type="button" data-ll-mode="cooling" aria-pressed={operatingMode==="cooling"} className={operatingMode==="cooling"?"bt bt-b":"bt"} onClick={()=>setOperatingMode("cooling")}>Cooling</button>\n        <button type="button" data-ll-mode="heating" aria-pressed={operatingMode==="heating"} className={operatingMode==="heating"?"bt bt-b":"bt"} onClick={()=>setOperatingMode("heating")}>Heating</button>\n      </div>\n    </div>\n    <ValidationBanner issues={_issues}/>',
    'return and mode selector'
  );

  ll = replaceOnce(ll, '<div className="card" style={{borderColor:\'rgba(201,168,76,.25)\'}}>', '<div className="card" data-ll-side="cold" style={{borderColor:\'rgba(201,168,76,.25)\'}}>', 'cold card');
  ll = replaceOnce(ll, '<div className="card" style={{borderColor:\'rgba(251,191,36,.25)\'}}>', '<div className="card" data-ll-side="hot" style={{borderColor:\'rgba(251,191,36,.25)\'}}>', 'hot card');
  ll = replaceOnce(ll, 'cp = {fmt(cpC,4)} kJ/kg·K · ρ = {fmt(rC,4)} kg/L @ {fmt(_cMeanT,1)}°C mean', 'cp = {_llNum(cpC,4)} kJ/kg·K · ρ = {_llNum(rC,4)} kg/L · {_cold?(_cold.propertySource||"validated provider"):"BLOCKED: properties unavailable"}', 'cold property display');
  ll = replaceOnce(ll, 'cp = {fmt(cpH,4)} kJ/kg·K · ρ = {fmt(rH,4)} kg/L @ {fmt(_hMeanT,1)}°C mean', 'cp = {_llNum(cpH,4)} kJ/kg·K · ρ = {_llNum(rH,4)} kg/L · {_hot?(_hot.propertySource||"validated provider"):"BLOCKED: properties unavailable"}', 'hot property display');

  ll = ll.replace(/\{fmt\(mC,4\)\}/g, '{_llNum(mC,4)}').replace(/\{fmt\(mH,4\)\}/g, '{_llNum(mH,4)}');
  ll = replaceOnce(ll, '<span><span className="ik">Q cold</span><span className="iv" style={{color:\'#d4a843\'}}>{fmt(Qc,4)}</span><span className="iu"> kW</span></span>', '<span><span className="ik">Q cold</span><span className="iv" style={{color:\'#d4a843\'}}>{_llNum(Qc,4)}</span><span className="iu"> kW</span></span>', 'cold capacity preview');
  ll = replaceOnce(ll, '<span><span className="ik">Q hot</span><span className="iv" style={{color:\'#fbbf24\'}}>{fmt(Qh,4)}</span><span className="iu"> kW</span></span>', '<span><span className="ik">Q hot</span><span className="iv" style={{color:\'#fbbf24\'}}>{_llNum(Qh,4)}</span><span className="iu"> kW</span></span>', 'hot capacity preview');
  ll = replaceOnce(ll, '<div className="bar-l"><span>COP: <strong style={{color:ec}}>{fmt(eer,4)} - {eLbl(eer)}</strong></span></div>\n      <div className="bar-t"><div className="bar-f" style={{width:Math.min(100,(eer/6)*100)+\'%\',background:ec}}/></div>', '<div className="bar-l"><span>{operatingMode==="cooling"?"Cooling COP":"Heating COP"}: <strong style={{color:ec}}>{_llNum(eer,4)}{Number.isFinite(eer)?" - "+eLbl(eer):""}</strong></span></div>\n      <div className="bar-t"><div className="bar-f" style={{width:Number.isFinite(eer)?Math.min(100,(eer/6)*100)+"%":"0%",background:ec}}/></div>', 'mode-active cop display');

  ll = replaceOnce(ll, '    <div className="res">\n      <div className="rl2">Results</div>', '    {_llUi.resultVisible?(<div className="res" data-ll-result="visible">\n      <div className="rl2">Results · {_llUi.statusLabel}</div>', 'result open');
  ll = replaceOnce(ll, '<div className="ri big"><div className="rn">Q_cold - Cooling Output</div><div className="rv">{fmt(Qc,4)} kW</div><div className="ru">{fmt(Qc*3412.14,4)} BTU/h - {fmt(Qc/3.517,4)} tons</div></div>', '<div className="ri big" data-ll-useful-capacity="true"><div className="rn">{operatingMode==="cooling"?"Useful Cooling Capacity":"Useful Heating Capacity"}</div><div className="rv">{fmt(_llUi.usefulCapacity_kW,4)} kW</div><div className="ru">{fmt(_llUi.usefulCapacity_kW*3412.14,4)} BTU/h - {fmt(_llUi.usefulCapacity_kW/3.517,4)} tons</div></div>', 'useful capacity card');
  ll = replaceOnce(ll, '    </div>\n        <SteadyStateChecker/>', '    </div>):(<div className="res" data-ll-result="blocked"><div className="rl2">Results · BLOCKED</div><div className="warn" style={{marginTop:0}}>{_llContract.message}</div><div className="fml"><strong>Code</strong> = {_llContract.code}<br/><strong>No calculated capacity, COP, record or export is available.</strong></div></div>)}\n    {_llUi.resultVisible&&<div className="card print-only" data-ll-print-contract="true"><div className="slbl">Liquid/Liquid Contract</div><div className="fml"><strong>Mode</strong> = {_llContract.print.operatingMode}<br/><strong>Status</strong> = {_llContract.print.status}<br/><strong>Useful capacity</strong> = {fmt(_llContract.print.usefulCapacity_kW,4)} kW<br/><strong>COP</strong> = {fmt(_llContract.print.cop,4)}<br/><strong>Residual</strong> = {fmt(_llContract.print.energyResidual_kW,4)} kW<br/><strong>Balance deviation</strong> = {fmt(_llContract.print.balanceDeviation_pct,4)}%<br/><strong>Cold properties</strong> = {_llContract.print.propertyProvenance.cold}<br/><strong>Hot properties</strong> = {_llContract.print.propertyProvenance.hot}</div></div>}\n        <SteadyStateChecker/>', 'result close and print projection');
  ll = replaceOnce(ll, '    <UncertaintyPanel mode="ll" Q={Qc} EER={eer} params={{dT:Math.abs(cToC-cTiC)}}/>', '    {_llUi.resultVisible&&<UncertaintyPanel mode="ll" Q={_llUi.usefulCapacity_kW} EER={_llUi.cop} params={{dT:Math.abs(cToC-cTiC)}}/>}', 'uncertainty visibility');
  ll = replaceOnce(
    ll,
    '    <div className="brow no-print">\n      <button className="bt bt-g" onClick={save}>Save Measurement</button>\n      <button className="bt bt-b" onClick={()=>window.print()}>Print / PDF</button>\n    </div>\n  </>);',
    '    <div className="brow no-print">\n      <button className="bt bt-g" data-ll-action="save" onClick={save} disabled={!_llContract.saveAllowed} style={!_llContract.saveAllowed?{opacity:.5,cursor:\'not-allowed\'}:undefined}>Save Measurement</button>\n      <button className="bt bt-b" data-ll-action="json" onClick={exportLlJson} disabled={!_llContract.saveAllowed}>Export L/L JSON</button>\n      <button className="bt bt-b" data-ll-action="csv" onClick={exportLlCsv} disabled={!_llContract.saveAllowed}>Export L/L CSV</button>\n      <button className="bt bt-b" data-ll-action="print" onClick={()=>window.print()}>Print / PDF</button>\n    </div>\n  </div>);',
    'actions and root close'
  );

  const transformed = prefix + buildLiquidLiquidBrowserBundle() + '\n' + ll + suffix;
  const aaAfter = section(transformed, 'function AirAir(', 'function AirLiquid(');
  const alAfter = section(transformed, 'function AirLiquid(', '/* GENERATED AT BUILD TIME FROM REVIEWED L/L MODULES — DO NOT EDIT */');
  if (aaAfter !== aaBefore) throw new Error('A/A freeze violation in cutover transform');
  if (alAfter !== alBefore) throw new Error('A/L freeze violation in cutover transform');
  return transformed;
}

module.exports = {
  replaceOnce,
  replaceBetween,
  transformLiqLiqCutover,
};

'use strict';

function replaceOnce(source, anchor, replacement, label) {
  const first = source.indexOf(anchor);
  if (first < 0) throw new Error(`${label} anchor not found`);
  if (source.indexOf(anchor, first + anchor.length) >= 0) throw new Error(`${label} anchor not unique`);
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

function mapSection(source, startAnchor, endAnchor, transform, label) {
  const start = source.indexOf(startAnchor);
  if (start < 0) throw new Error(`${label} start anchor not found`);
  if (source.indexOf(startAnchor, start + startAnchor.length) >= 0) throw new Error(`${label} start anchor not unique`);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  if (end < 0) throw new Error(`${label} end anchor not found`);
  const before = source.slice(start, end);
  const after = transform(before);
  if (typeof after !== 'string' || after === before) throw new Error(`${label} transform made no change`);
  return source.slice(0, start) + after + source.slice(end);
}

function projectState(section, stateName, setterName, label) {
  const escapedState = stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedSetter = setterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`const \\[${escapedState},\\s*${escapedSetter}\\]\\s*=\\s*(?:React\\.)?useState\\(([-+]?\\d+(?:\\.\\d+)?)\\);`, 'g');
  const matches = [...section.matchAll(re)];
  if (matches.length !== 1) throw new Error(`${label} state anchor count ${matches.length}`);
  return section.replace(re, match => match.replace(/useState\(([-+]?\d+(?:\.\d+)?)\)/, 'useState(NoditechUnit.fromC($1,unit))'));
}

function injectAfterState(section, stateName, setterName, injection, label) {
  const escapedState = stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedSetter = setterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`const \\[${escapedState},\\s*${escapedSetter}\\]\\s*=\\s*(?:React\\.)?useState\\(NoditechUnit\\.fromC\\(([-+]?\\d+(?:\\.\\d+)?),unit\\)\\);`, 'g');
  const matches = [...section.matchAll(re)];
  if (matches.length !== 1) throw new Error(`${label} injection anchor count ${matches.length}`);
  return section.replace(re, match => `${match}\n${injection}`);
}

function replaceFixedTemperatureRange(section, anchor, minC, maxC, label) {
  const replacement = anchor
    .replace(`min={${minC}}`, `min={NoditechUnit.fromC(${minC},unit)}`)
    .replace(`max={${maxC}}`, `max={NoditechUnit.fromC(${maxC},unit)}`);
  return replaceOnce(section, anchor, replacement, label);
}

const UNIT_BROWSER_SOURCE = `
const NoditechUnit=Object.freeze({
  toC:function(value,unit){var n=Number(value);return unit==='F'?(n-32)*5/9:n;},
  fromC:function(value,unit){var n=Number(value);return unit==='F'?n*9/5+32:n;},
  convert:function(value,fromUnit,toUnit){return this.fromC(this.toC(value,fromUnit),toUnit);}
});
const NoditechUnitRegistry=(function(){
  var handlers=new Set();
  return {
    register:function(handler){handlers.add(handler);return function(){handlers.delete(handler);};},
    convert:function(fromUnit,toUnit){if(fromUnit===toUnit)return;handlers.forEach(function(handler){handler(fromUnit,toUnit);});}
  };
})();
function useNoditechDisplayedTemperatureUnit(unit,entries){
  var latest=React.useRef(entries);latest.current=entries;
  React.useEffect(function(){
    return NoditechUnitRegistry.register(function(fromUnit,toUnit){
      latest.current.forEach(function(entry){
        var value=entry[0],setter=entry[1];
        if(value===null||value===undefined||typeof setter!=='function')return;
        var n=Number(value);if(!Number.isFinite(n))return;
        setter(NoditechUnit.convert(n,fromUnit,toUnit));
      });
    });
  },[]);
  return unit;
}
`.trim();

function transformAirAir(section) {
  const states = [
    ['eDB', 'setEDB'], ['lDB', 'setLDB'], ['oDB', 'setODB'],
    ['eWB', 'setEWB'], ['lWB', 'setLWB'], ['sT', 'setST'], ['liqT', 'setLiqT'],
  ];
  for (const [state, setter] of states) section = projectState(section, state, setter, `A/A ${state}`);
  section = injectAfterState(
    section,
    'liqT',
    'setLiqT',
    "  useNoditechDisplayedTemperatureUnit(unit,[[eDB,setEDB],[lDB,setLDB],[oDB,setODB],[eWB,setEWB],[lWB,setLWB],[sT,setST],[liqT,setLiqT]]);",
    'A/A unit registry'
  );

  section = replaceOnce(
    section,
    'const mf=_aaOK?_aaRes.dryAirMassFlowKgS:NaN,dh=Math.max(0,hE-hL),Q=_aaOK?_aaRes.totalCapacityKW:0,pTotal=pw+pFan+pOther,eer=pTotal>0?Q/pTotal:0,eerComp=pw>0?Q/pw:0;',
    'const mf=_aaOK?_aaRes.dryAirMassFlowKgS:NaN,dh=_aaOK?Math.max(0,hE-hL):NaN,Q=_aaOK?_aaRes.totalCapacityKW:NaN,pTotal=pw+pFan+pOther,eer=_aaOK&&pTotal>0?Q/pTotal:NaN,eerComp=_aaOK&&pw>0?Q/pw:NaN;',
    'A/A blocked main values'
  );
  section = replaceOnce(section, 'const sr=_aaOK?_aaRes.shr:0;', 'const sr=_aaOK?_aaRes.shr:NaN;', 'A/A blocked SHR');
  section = replaceOnce(section, 'const qs=_aaOK?_aaRes.sensibleCapacityKW:0,ql=_aaOK?_aaRes.latentCapacityKW:0;', 'const qs=_aaOK?_aaRes.sensibleCapacityKW:NaN,ql=_aaOK?_aaRes.latentCapacityKW:NaN;', 'A/A blocked split');
  section = replaceOnce(section, 'mx=unit==="F"?113:45,ec=eCol(eer);', 'mx=unit==="F"?113:45,ec=_aaOK&&Number.isFinite(eer)?eCol(eer):\'#8a7a65\';', 'A/A blocked EER colour');

  section = replaceOnce(
    section,
    "<div className=\"bar-l\"><span>{elecBoundary===\"\"?'EER':elecBoundary==='whole'?'EER whole-unit':elecBoundary==='compressor'?'EER compressor-only':elecBoundary==='system'?'EER refrigeration-system':'EER measured-total'}: <strong style={{color:elecBoundary===\"\"?'#8a7a65':ec}}>{elecBoundary===\"\"?'— confirm boundary —':fmt(eer,4)+' W/W - '+eLbl(eer)}</strong></span></div>\n      <div className=\"bar-t\"><div className=\"bar-f\" style={{width:Math.min(100,(eer/6)*100)+'%',background:ec}}/></div>",
    "<div className=\"bar-l\"><span>{elecBoundary===\"\"?'EER':elecBoundary==='whole'?'EER whole-unit':elecBoundary==='compressor'?'EER compressor-only':elecBoundary==='system'?'EER refrigeration-system':'EER measured-total'}: <strong style={{color:elecBoundary===\"\"?'#8a7a65':ec}}>{elecBoundary===\"\"?'— confirm boundary —':Number.isFinite(eer)?fmt(eer,4)+' W/W - '+eLbl(eer):'— unavailable —'}</strong></span></div>\n      <div className=\"bar-t\"><div className=\"bar-f\" style={{width:Number.isFinite(eer)?Math.min(100,(eer/6)*100)+'%':'0%',background:ec}}/></div>",
    'A/A blocked EER bar'
  );
  section = replaceOnce(section, '<div className="res">\n      <div className="rl2">Results</div>', '<div className="res" data-aa-result-status={_aa.status}>\n      <div className="rl2">Results · {_aaOK?_aa.status.toUpperCase():\'BLOCKED\'}</div>', 'A/A result status');
  section = replaceOnce(section, 'style={{color:eCol(eerComp)}}', "style={{color:Number.isFinite(eerComp)?eCol(eerComp):'#8a7a65'}}", 'A/A compressor EER colour');

  section = replaceOnce(
    section,
    "Entering and leaving air plotted on a live psychrometric chart at {fmt(pAtm/1000,1)} kPa. The red line is the cooling process; its slope shows the sensible/latent split. Saturation, RH and enthalpy grid use the same psychrometric formulas (Buck saturation, humidity ratio, enthalpy) as the capacity result, evaluated at the actual barometric pressure. The chart re-implements those formulas rather than sharing one stored state, so they agree by construction but are not a single code path.",
    "Entering and leaving points come from the same validated Air/Air result contract as the capacity cards. The background grid is evaluated at the contract pressure; no chart is rendered while the result is blocked.",
    'A/A chart explanation'
  );
  section = replaceOnce(
    section,
    "<MollierChart pAtm={pAtm} points={[{T:eC,RH:eRH,label:'Entering (inn)',color:'var(--ch-enter)'},{T:lC,RH:lRH,label:'Leaving (ut)',color:'var(--ch-leave)'}]}/>",
    "{_aaOK&&_aaRes?<MollierChart pAtm={_aaRes.pressurePa} points={[{T:_aaRes.entering.dbC,RH:_aaRes.entering.rhPct,W:_aaRes.entering.humidityRatio,h:_aaRes.entering.enthalpyKJkg,label:'Entering (inn)',color:'var(--ch-enter)'},{T:_aaRes.leaving.dbC,RH:_aaRes.leaving.rhPct,W:_aaRes.leaving.humidityRatio,h:_aaRes.leaving.enthalpyKJkg,label:'Leaving (ut)',color:'var(--ch-leave)'}]}/>:<div data-chart-status=\"blocked\" className=\"warn\" style={{marginTop:0}}>Chart unavailable until the Air/Air result is valid.</div>}",
    'A/A contract chart'
  );
  section = replaceOnce(
    section,
    '<UncertaintyPanel mode="aa" Q={Q} EER={eer} travCov={travCov} afMethod={afMethod} params={{dh:dh,hInn:hE,hUt:hL,T_ut:lC,RH_ut:lRH}}/>',
    '{_aaOK?<UncertaintyPanel mode="aa" Q={Q} EER={eer} travCov={travCov} afMethod={afMethod} params={{dh:dh,hInn:hE,hUt:hL,T_ut:lC,RH_ut:lRH}}/>:<div data-aa-uncertainty="blocked" className="card"><div className="slbl">Measurement Uncertainty</div><div className="warn" style={{marginTop:0}}>Unavailable while the Air/Air result is blocked.</div></div>}',
    'A/A uncertainty guard'
  );
  section = replaceOnce(
    section,
    '<button className="bt bt-g" onClick={save}>Save Measurement</button>',
    '<button className="bt bt-g" data-aa-action="save" onClick={save} disabled={!_aaOK} title={!_aaOK?(_aaMsg||"Air/Air result is blocked"):""} style={!_aaOK?{opacity:.5,cursor:\'not-allowed\'}:undefined}>Save Measurement</button>',
    'A/A save guard'
  );
  return section;
}

function transformAirLiquid(section) {
  const states = [
    ['wTi', 'setWTi'], ['wTo', 'setWTo'], ['oDB', 'setODB'], ['lDBm', 'setLDBm'],
    ['sT', 'setST'], ['liqT', 'setLiqT'],
  ];
  for (const [state, setter] of states) section = projectState(section, state, setter, `A/L ${state}`);
  section = injectAfterState(
    section,
    'liqT',
    'setLiqT',
    "  useNoditechDisplayedTemperatureUnit(unit,[[wTi,setWTi],[wTo,setWTo],[oDB,setODB],[lDBm,setLDBm],[sT,setST],[liqT,setLiqT]]);",
    'A/L unit registry'
  );
  section = replaceFixedTemperatureRange(section, '<FloatInput value={wTi} onChange={setWTi} min={-30} max={50} step={0.0001}/>', -30, 50, 'A/L inlet range');
  section = replaceFixedTemperatureRange(section, '<FloatInput value={wTo} onChange={setWTo} min={-30} max={50} step={0.0001}/>', -30, 50, 'A/L outlet range');
  return section;
}

function transformLiquidLiquid(section) {
  const states = [
    ['cTi', 'setCTi'], ['cTo', 'setCTo'], ['hTi', 'setHTi'], ['hTo', 'setHTo'],
    ['sT', 'setST'], ['liqT', 'setLiqT'],
  ];
  for (const [state, setter] of states) section = projectState(section, state, setter, `L/L ${state}`);
  section = injectAfterState(
    section,
    'liqT',
    'setLiqT',
    "  useNoditechDisplayedTemperatureUnit(unit,[[cTi,setCTi],[cTo,setCTo],[hTi,setHTi],[hTo,setHTo],[sT,setST],[liqT,setLiqT]]);",
    'L/L unit registry'
  );
  section = replaceFixedTemperatureRange(section, '<FloatInput value={cTi} onChange={setCTi} min={-30} max={50} step={0.0001} style={{borderColor:\'rgba(201,168,76,.4)\'}}/>', -30, 50, 'L/L cold inlet range');
  section = replaceFixedTemperatureRange(section, '<FloatInput value={cTo} onChange={setCTo} min={-30} max={50} step={0.0001} style={{borderColor:\'rgba(201,168,76,.4)\'}}/>', -30, 50, 'L/L cold outlet range');
  section = replaceFixedTemperatureRange(section, '<FloatInput value={hTi} onChange={setHTi} min={-30} max={80} step={0.0001} style={{borderColor:\'rgba(251,191,36,.4)\'}}/>', -30, 80, 'L/L hot inlet range');
  section = replaceFixedTemperatureRange(section, '<FloatInput value={hTo} onChange={setHTo} min={-30} max={80} step={0.0001} style={{borderColor:\'rgba(251,191,36,.4)\'}}/>', -30, 80, 'L/L hot outlet range');

  if (section.includes('_llUi.cop')) {
    section = replaceOnce(
      section,
      'const pTot=_llRecord?_llRecord.electricalPower_kW:null,eer=_llUi.cop,copHeat=_llRecord?_llRecord.copHeating:null;',
      'const pTot=_llRecord?_llRecord.electricalPower_kW:null,copCooling=_llRecord?_llRecord.copCooling:null,copHeating=_llRecord?_llRecord.copHeating:null,activeCop=_llUi.cop,eer=copCooling,copHeat=copHeating;',
      'L/L fixed COP semantics'
    );
    section = replaceOnce(section, 'const ec=eCol(Number.isFinite(eer)?eer:0);', 'const ec=eCol(Number.isFinite(activeCop)?activeCop:0),ecCooling=eCol(Number.isFinite(copCooling)?copCooling:0),ecHeating=eCol(Number.isFinite(copHeating)?copHeating:0);', 'L/L COP colours');
    section = replaceOnce(
      section,
      '<div className="bar-l"><span>{operatingMode==="cooling"?"Cooling COP":"Heating COP"}: <strong style={{color:ec}}>{_llNum(eer,4)}{Number.isFinite(eer)?" - "+eLbl(eer):""}</strong></span></div>\n      <div className="bar-t"><div className="bar-f" style={{width:Number.isFinite(eer)?Math.min(100,(eer/6)*100)+"%":"0%",background:ec}}/></div>',
      '<div className="bar-l"><span>{operatingMode==="cooling"?"Cooling COP":"Heating COP"}: <strong style={{color:ec}}>{_llNum(activeCop,4)}{Number.isFinite(activeCop)?" - "+eLbl(activeCop):""}</strong></span></div>\n      <div className="bar-t"><div className="bar-f" style={{width:Number.isFinite(activeCop)?Math.min(100,(activeCop/6)*100)+"%":"0%",background:ec}}/></div>',
      'L/L active COP bar'
    );
    section = replaceOnce(
      section,
      '<div className="ri"><div className="rn">COP cooling</div><div className="rv" style={{color:ec}}>{fmt(eer,4)}</div><div className="ru">Q_cold / P_el</div></div>',
      '<div className="ri" data-ll-cop="cooling"><div className="rn">COP cooling</div><div className="rv" style={{color:ecCooling}}>{fmt(copCooling,4)}</div><div className="ru">Q_cold / P_el</div></div>',
      'L/L cooling COP card'
    );
    section = replaceOnce(
      section,
      '<div className="ri"><div className="rn">COP heating</div><div className="rv" style={{color:eCol(copHeat)}}>{fmt(copHeat,4)}</div><div className="ru">Q_hot / P_el</div></div>',
      '<div className="ri" data-ll-cop="heating"><div className="rn">COP heating</div><div className="rv" style={{color:ecHeating}}>{fmt(copHeating,4)}</div><div className="ru">Q_hot / P_el</div></div>',
      'L/L heating COP card'
    );
  }
  return section;
}

function transformRefSec(section) {
  section = replaceOnce(
    section,
    'const [t2meas,setT2meas]=React.useState(null);',
    'const [t2meas,setT2meas]=React.useState(null);\n  useNoditechDisplayedTemperatureUnit(unit,[[t2meas,setT2meas]]);',
    'RefSec discharge unit registry'
  );
  section = replaceFixedTemperatureRange(section, '<FloatInput value={sT} onChange={setST} min={-60} max={100} step={0.0001}/>', -60, 100, 'RefSec suction range');
  section = replaceFixedTemperatureRange(section, '<FloatInput value={liqT} onChange={setLiqT||(()=>{})} min={-20} max={80} step={0.0001}/>', -20, 80, 'RefSec liquid range');
  section = replaceFixedTemperatureRange(section, '<FloatInput value={t2meas} onChange={setT2meas} min={-20} max={200} step={0.0001}/>', -20, 200, 'RefSec discharge range');
  return section;
}

function guardMollierChart(source) {
  source = replaceOnce(
    source,
    'function MollierChart({points, pAtm=101500, title="Psychrometric chart (T vs humidity ratio)"}){\n  const Tmin=0, Tmax=45, Wmax=0.025;',
    'function MollierChart({points, pAtm=101500, title="Psychrometric chart (T vs humidity ratio)"}){\n  const _chartReady=Number.isFinite(pAtm)&&pAtm>0&&Array.isArray(points)&&points.length>0;\n  if(!_chartReady)return <div data-chart-status="blocked" className="warn" style={{marginTop:0}}>Chart unavailable until valid pressure and state data are available.</div>;\n  const Tmin=0, Tmax=45, Wmax=0.025;',
    'Mollier finite guard'
  );
  source = replaceOnce(
    source,
    'const plotted=points.filter(p=>p&&isFinite(p.T)&&isFinite(p.RH)).map(p=>({\n    ...p, x:px(p.T), y:py(wOf(p.T,p.RH)), W:wOf(p.T,p.RH), h:hOf(p.T,p.RH)\n  }));',
    'const plotted=points.filter(p=>p&&Number.isFinite(p.T)&&Number.isFinite(p.RH)).map(p=>{\n    const W=Number.isFinite(p.W)?p.W:wOf(p.T,p.RH);\n    const h=Number.isFinite(p.h)?p.h:hOf(p.T,p.RH);\n    return {...p,x:px(p.T),y:py(W),W,h};\n  }).filter(p=>[p.x,p.y,p.W,p.h].every(Number.isFinite));',
    'Mollier contract point projection'
  );
  return source;
}

function applyMilestone1Transforms(appSource) {
  let source = appSource;
  source = replaceOnce(source, 'function FloatInput(props){', `${UNIT_BROWSER_SOURCE}\nfunction FloatInput(props){`, 'unit browser helper');
  source = replaceOnce(
    source,
    '<button key={u} data-testid={"unit-"+u} onClick={()=>setUnit(u)}',
    '<button key={u} type="button" data-testid={"unit-"+u} onClick={()=>{if(unit!==u){NoditechUnitRegistry.convert(unit,u);setUnit(u);}}}',
    'transactional unit button'
  );
  source = mapSection(source, 'function RefSec(', 'function validateInputs(', transformRefSec, 'RefSec');
  source = guardMollierChart(source);
  source = mapSection(source, 'function AirAir(', 'function AirLiquid(', transformAirAir, 'Air/Air');
  source = mapSection(source, 'function AirLiquid(', 'function LiqLiq(', transformAirLiquid, 'Air/Liquid');
  source = mapSection(source, 'function LiqLiq(', 'function GuideAA(', transformLiquidLiquid, 'Liquid/Liquid');
  return source;
}

function toC(value, unit) {
  const n = Number(value);
  return unit === 'F' ? (n - 32) * 5 / 9 : n;
}

function fromC(value, unit) {
  const n = Number(value);
  return unit === 'F' ? n * 9 / 5 + 32 : n;
}

function convertDisplayed(value, fromUnit, toUnit) {
  return fromC(toC(value, fromUnit), toUnit);
}

module.exports = {
  UNIT_BROWSER_SOURCE,
  applyMilestone1Transforms,
  convertDisplayed,
  fromC,
  mapSection,
  replaceOnce,
  toC,
};

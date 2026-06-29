'use strict';
// tests/air-liquid-correctness.test.js — rev9.1. Run from repo root: node --test tests/air-liquid-correctness.test.js
const test=require('node:test'); const assert=require('node:assert/strict');
const fs=require('fs'), path=require('path');
const E=require('./engine.js');
const {engcalcAirLiquidSolve:S, engcalcAirLiquidBalance:B, engcalcAirLiquidEvaluateAir:EV,
       engcalcAirRecord, engcalcBuildCsv, engcalcBuildPrintProjection, engcalcAirLiquidReasonMessage:RM,
       glyEval}=E;

// ---------- robust function extractor (strings, template strings, line + block comments) ----------
function extractFn(src, name){
  const start=src.indexOf('function '+name+'(');
  if(start<0) return null;
  // skip the parameter list (its destructuring braces are not the body)
  let pp=src.indexOf('(', start), pdepth=0, q=pp;
  for(; q<src.length; q++){ const c=src[q]; if(c==='(') pdepth++; else if(c===')'){ pdepth--; if(pdepth===0){ q++; break; } } }
  let i=src.indexOf('{', q); if(i<0) return null;
  let depth=0, j=i, mode='code', quote='';
  for(; j<src.length; j++){
    const c=src[j], n=src[j+1];
    if(mode==='line'){ if(c==='\n') mode='code'; continue; }
    if(mode==='block'){ if(c==='*'&&n==='/'){ mode='code'; j++; } continue; }
    if(mode==='str'){ if(c==='\\'){ j++; continue; } if(c===quote) mode='code'; continue; }
    if(mode==='tmpl'){ if(c==='\\'){ j++; continue; } if(c==='`') mode='code'; continue; }
    // code mode
    if(c==='/'&&n==='/'){ mode='line'; j++; continue; }
    if(c==='/'&&n==='*'){ mode='block'; j++; continue; }
    if(c==='\''||c==='"'){ mode='str'; quote=c; continue; }
    if(c==='`'){ mode='tmpl'; continue; }
    if(c==='{') depth++;
    else if(c==='}'){ depth--; if(depth===0){ j++; break; } }
  }
  return src.slice(start, j);
}
function readSrc(){const c=['corrected/Kalkulator_build9.6-rc8_step3_4.src.html',path.join(__dirname,'..','corrected','Kalkulator_build9.6-rc8_step3_4.src.html')];const p=c.find(x=>{try{fs.accessSync(x);return true;}catch(e){return false;}});assert.ok(p,'production source not found');return fs.readFileSync(p,'utf8');}
function readEng(){const c=['tests/engine.js',path.join(__dirname,'engine.js')];const p=c.find(x=>{try{fs.accessSync(x);return true;}catch(e){return false;}});assert.ok(p,'tests/engine.js not found');return fs.readFileSync(p,'utf8');}

// ---------- helpers ----------
const gp=(t,p,Tm)=>{const r=glyEval(t,p,isFinite(Tm)?Tm:20);return {cp:r.cp,rho:r.rho,valid:r.valid};};
const solve=(mode,Tin,Tout,o={})=>{const x=Object.assign({type:'EG',pct:30,flow:0.5,pw:1.2,useGly:true},o);const g=gp(x.type,x.pct,(Tin+Tout)/2);
  return S({operatingMode:mode,Tin,Tout,flow_Ls:x.flow,rho:g.rho,cp:g.cp,glyValid:g.valid,useGly:x.useGly,glyType:x.type,pw:x.pw});};
function evalArgs(mode,Tin,Tout,o={}){const x=Object.assign({type:'EG',pct:30,flow:0.5,pw:1.2,useGly:true,ambientDB_C:35,ambientRH_pct:40,pAtm:101325},o);
  const g=gp(x.type,x.pct,(Tin+Tout)/2);
  return {operatingMode:mode,Tin,Tout,flow_Ls:x.flow,rho:g.rho,cp:g.cp,glyValid:g.valid,useGly:x.useGly,glyType:x.type,pw:x.pw,
    ambientDB_C:x.ambientDB_C,ambientRH_pct:x.ambientRH_pct,pAtm:x.pAtm,pressure:x.pressure,
    lDBset:x.lDBset,lRHset:x.lRHset,afSet:x.afSet,leavingDB_C:x.leavingDB_C,leavingRH_pct:x.leavingRH_pct,airflow_m3h:x.airflow_m3h};}
function spy(){let n=0; const f=(a)=>{n++; return E.engcalcAirSide(a);}; f.calls=()=>n; return f;}
const near=(a,b,t)=>Math.abs(a-b)<=t;

// ===== DETERMINISTIC PHYSICS (point 18) =====
test('EG 30% @ flow .5 / power 1.2 -> cp,rho,Q,COP reference',()=>{
  const g=glyEval('EG',30,9.5);
  assert.ok(near(g.cp,3.6869969921,1e-6),'cp');
  assert.ok(near(g.rho,1.0419784157,1e-6),'rho');
  const c=solve('cooling',12,7);
  assert.ok(near(c.Q,9.6044282113,1e-4),'Q');
  assert.ok(near(c.cop,8.0036901761,1e-4),'COP');
  assert.ok(near(c.expectedAirSigned,10.8044282113,1e-4),'cooling expected +');
  const h=solve('heating',7,12);
  assert.ok(near(h.expectedAirSigned,-8.4044282113,1e-4),'heating expected -');
});
test('fullmanual cooling reference -> measured, Qa ~ +10.80443',()=>{
  const r=EV(evalArgs('cooling',12,7,{ambientDB_C:35,ambientRH_pct:40,lDBset:true,leavingDB_C:44,lRHset:true,leavingRH_pct:24.70665,afSet:true,airflow_m3h:3737.956}));
  assert.equal(r.airStatus,'measured'); assert.ok(near(r.view.airEnergySigned_kW,10.80443,0.02),'Qa '+r.view.airEnergySigned_kW);
});
test('fullmanual heating reference -> measured, Qa ~ -8.40443',()=>{
  const r=EV(evalArgs('heating',7,12,{ambientDB_C:25,ambientRH_pct:40,lDBset:true,leavingDB_C:12.32184,lRHset:true,leavingRH_pct:88.47902,afSet:true,airflow_m3h:2000}));
  assert.equal(r.airStatus,'measured'); assert.ok(near(r.view.airEnergySigned_kW,-8.40443,0.05),'Qa '+r.view.airEnergySigned_kW);
});

// ===== SIGNED BALANCE (point 10) =====
test('signed balance sign matrix',()=>{
  assert.ok(near(B(11,10),10,1e-9)); assert.ok(near(B(9,10),-10,1e-9));
  assert.ok(near(B(-11,-10),-10,1e-9)); assert.ok(near(B(-9,-10),10,1e-9));
});

// ===== GLYCOL FAIL-CLOSED (point 11) =====
test('glycol EG/PG valid; XX & null invalid (useGly); glyType irrelevant when useGly=false',()=>{
  assert.equal(solve('cooling',12,7,{type:'EG'}).valid,true);
  assert.equal(solve('cooling',12,7,{type:'PG'}).valid,true);
  assert.equal(S({operatingMode:'cooling',Tin:12,Tout:7,flow_Ls:0.5,rho:1,cp:4,glyValid:true,useGly:true,glyType:'XX',pw:1.2}).reason,'glycol_type_invalid');
  assert.equal(S({operatingMode:'cooling',Tin:12,Tout:7,flow_Ls:0.5,rho:1,cp:4,glyValid:true,useGly:true,glyType:null,pw:1.2}).reason,'glycol_type_invalid');
  const w=S({operatingMode:'cooling',Tin:12,Tout:7,flow_Ls:0.5,rho:1,cp:4.18,glyValid:true,useGly:false,glyType:'XX',pw:1.2});
  assert.equal(w.valid,true);
});
test('glycol_type_invalid -> Q/cop/expectedAir null',()=>{const r=S({operatingMode:'cooling',Tin:12,Tout:7,flow_Ls:0.5,rho:1,cp:4,glyValid:true,useGly:true,glyType:'ZZ',pw:1.2});assert.equal(r.Q,null);assert.equal(r.cop,null);assert.equal(r.expectedAirSigned,null);});

// ===== LIQUID =====
test('mode missing -> Q/cop/expectedAir null',()=>{const r=S({Tin:12,Tout:7});assert.equal(r.reason,'operating_mode_missing');assert.equal(r.Q,null);assert.equal(r.cop,null);assert.equal(r.expectedAirSigned,null);});
test('wrong directions invalid',()=>{assert.equal(solve('cooling',7,12).reason,'cooling_direction_invalid');assert.equal(solve('heating',12,7).reason,'heating_direction_invalid');});
test('flow/power invalid',()=>{assert.equal(solve('cooling',12,7,{flow:0}).reason,'flow_invalid');assert.equal(solve('cooling',12,7,{pw:NaN}).reason,'power_invalid');});
test('heating extraction <=0 -> Q/cop/expectedAir null',()=>{const r=solve('heating',7,7.3);assert.equal(r.reason,'heating_air_extraction_non_positive');assert.equal(r.Q,null);assert.equal(r.cop,null);assert.equal(r.expectedAirSigned,null);});

// ===== ORCHESTRATION (spy) =====
test('invalid liquid does NOT call airSideFn',()=>{const sp=spy();assert.equal(EV(evalArgs(null,12,7),sp).airStatus,'blocked');assert.equal(sp.calls(),0);});
test('invalid manual DB/RH/airflow/ambient do NOT call airSideFn',()=>{
  for(const o of [{lDBset:true,leavingDB_C:NaN},{lRHset:true,leavingRH_pct:150},{afSet:true,airflow_m3h:0},{ambientRH_pct:140}]){
    const sp=spy();const r=EV(evalArgs('cooling',12,7,o),sp);assert.equal(r.airStatus,'blocked');assert.equal(sp.calls(),0);}
});
test('manual invalid + pressure missing/invalid -> BLOCKED, no airSideFn',()=>{
  for(const p of [undefined,NaN]){const sp=spy();const r=EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:NaN,pAtm:p}),sp);assert.equal(r.airStatus,'blocked');assert.equal(r.reasonCode,'manual_air_input_invalid');assert.equal(sp.calls(),0);}
});

// ===== STATUS =====
test('pressure missing/invalid -> withheld',()=>{assert.equal(EV(evalArgs('cooling',12,7,{pAtm:undefined})).airStatus,'withheld');assert.equal(EV(evalArgs('cooling',12,7,{pAtm:NaN})).airStatus,'withheld');});
test('structured pressure provenance survives NaN Pa transport',()=>{
  const cases=[['missing','pressure_missing'],['invalid','pressure_non_finite'],['invalid','pressure_non_positive'],['invalid','pressure_below_range'],['invalid','pressure_above_range']];
  for(const [state,reason] of cases){
    const pressure={state,value:null,classification:null,source:(state==='missing'?null:'pKpa_field'),reason};
    const r=EV(evalArgs('cooling',12,7,{pAtm:NaN,pressure}));
    assert.equal(r.airStatus,'withheld');assert.equal(r.reasonCode,reason);assert.equal(r.pressure,pressure);
  }
});
test('auto cooling/heating -> estimated',()=>{assert.equal(EV(evalArgs('cooling',12,7)).airStatus,'estimated');assert.equal(EV(evalArgs('heating',7,12)).airStatus,'estimated');});
test('partial -> incomplete and qaAvailable=false',()=>{const r=EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44}));assert.equal(r.airStatus,'incomplete');assert.equal(r.qaAvailable,false);});
test('fullmanual valid -> measured',()=>{const r=EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44,lRHset:true,leavingRH_pct:24.7,afSet:true,airflow_m3h:3700}));assert.equal(r.airStatus,'measured');assert.equal(r.balanceAvailable,true);});
test('fullmanual non-finite -> blocked manual_air_calculation_invalid',()=>{const fake=()=>({suppressed:false,pressure:{state:'known',value:101325,classification:'entered',source:'x',reason:null},hE:50,vE:.9,wBE:20,WE:.01,mA:1,hLauto:60,lDBauto:40,lRHauto:30,lDBuse:NaN,lRHuse:NaN,hL:NaN,vL:NaN,wBL:NaN,dh:NaN,Qa:NaN});const r=EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44,lRHset:true,leavingRH_pct:25,afSet:true,airflow_m3h:3700}),fake);assert.equal(r.airStatus,'blocked');assert.equal(r.reasonCode,'manual_air_calculation_invalid');assert.equal(r.saveAllowed,false);});
test('frost -> limited; saturation -> limited (real)',()=>{
  assert.equal(EV(evalArgs('heating',2,45,{flow:1.2,pw:0.4,ambientDB_C:2,ambientRH_pct:80})).reasonCode,'heating_auto_frost_limit');
  assert.equal(EV(evalArgs('heating',25,31,{flow:0.3,pw:1.0,ambientDB_C:25,ambientRH_pct:100})).reasonCode,'heating_auto_saturation_limit');
});

// ===== SAVE MATRIX (point 6) =====
test('saveAllowed matrix',()=>{
  assert.equal(EV(evalArgs(null,12,7)).saveAllowed,false);                                   // invalid liquid
  assert.equal(EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:NaN})).saveAllowed,false); // manual invalid
  assert.equal(EV(evalArgs('cooling',12,7,{pAtm:undefined})).saveAllowed,true);               // withheld
  assert.equal(EV(evalArgs('heating',2,45,{flow:1.2,pw:0.4,ambientDB_C:2,ambientRH_pct:80})).saveAllowed,true); // limited
  assert.equal(EV(evalArgs('cooling',12,7)).saveAllowed,true);                                // auto
  assert.equal(EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44})).saveAllowed,true);    // partial
});

// ===== SANITIZED VIEW (point 8) =====
const LEAVE=['leavingDB_C','leavingRH_pct','leavingWB_C','leavingEnthalpy_kJ_kg','deltaH_kJ_kg','airMassFlow_kg_s','airEnergySigned_kW','airEnergyMagnitude_kW'];
test('leaving/Q view fields null for blocked/withheld/limited/incomplete',()=>{
  for(const ev of [EV(evalArgs(null,12,7)),EV(evalArgs('cooling',12,7,{pAtm:undefined})),EV(evalArgs('heating',2,45,{flow:1.2,pw:0.4,ambientDB_C:2,ambientRH_pct:80})),EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44}))])
    LEAVE.forEach(k=>assert.equal(ev.view[k],null,k+' must be null'));
});
test('entering view present for estimated/incomplete/limited; null for blocked/withheld',()=>{
  assert.ok(Number.isFinite(EV(evalArgs('cooling',12,7)).view.enteringEnthalpy_kJ_kg));
  assert.ok(Number.isFinite(EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44})).view.enteringWB_C)); // incomplete keeps entering
  assert.ok(Number.isFinite(EV(evalArgs('heating',2,45,{flow:1.2,pw:0.4,ambientDB_C:2,ambientRH_pct:80})).view.enteringDB_C)); // limited keeps entering
  assert.equal(EV(evalArgs(null,12,7)).view.enteringDB_C,null);
  assert.equal(EV(evalArgs('cooling',12,7,{pAtm:undefined})).view.enteringDB_C,null);
});

// ===== RECORD =====
const recFrom=(ev,over={})=>engcalcAirRecord(Object.assign({operatingMode:ev.operatingMode,expectedAirSigned_kW:ev.expectedAirSigned_kW,
  airEnergySigned_kW:ev.view.airEnergySigned_kW,airEnergyMagnitude_kW:ev.view.airEnergyMagnitude_kW,
  air_status:ev.airStatus,air_reason:ev.reasonCode,air_reason_message:ev.reasonMessage,air_output_available:ev.qaAvailable,
  pressure:ev.pressure,Qair:(ev.view.airEnergySigned_kW==null?null:String(ev.view.airEnergySigned_kW)),t2:'40',wb2:'x',rh2:'30'},over));
test('record stable mode + operatingMode + electricalBoundary constant',()=>{
  const r=recFrom(EV(evalArgs('cooling',12,7)));assert.equal(r.mode,'Air/Liquid');assert.equal(r.operatingMode,'cooling');assert.equal(r.electricalBoundary,'compressor_power');
  assert.equal(recFrom(EV(evalArgs('heating',7,12))).operatingMode,'heating');
});
test('partial & withheld records have Q Air null + air_output_available false',()=>{
  const p=recFrom(EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44})));assert.equal(p.Qw,null);assert.equal(p.air_output_available,false);
  const w=recFrom(EV(evalArgs('cooling',12,7,{pAtm:undefined})));assert.equal(w.Qw,null);assert.equal(w.pAtm_reason,'pressure_missing');
});
test('frost record carries A/L reason; pAtm_reason null (pressure known)',()=>{const r=recFrom(EV(evalArgs('heating',2,45,{flow:1.2,pw:0.4,ambientDB_C:2,ambientRH_pct:80})));assert.equal(r.air_reason,'heating_auto_frost_limit');assert.equal(r.pAtm_reason,null);});
test('invalid liquid record has all pAtm_* null',()=>{const r=recFrom(EV(evalArgs(null,12,7)));['pAtm_state','pAtm_value','pAtm_class','pAtm_source','pAtm_reason'].forEach(k=>assert.equal(r[k],null,k));});
test('heating measured: signed Q Air negative; magnitude positive',()=>{const ev=EV(evalArgs('heating',7,12,{ambientDB_C:25,ambientRH_pct:40,lDBset:true,leavingDB_C:12.32184,lRHset:true,leavingRH_pct:88.47902,afSet:true,airflow_m3h:2000}));assert.equal(ev.airStatus,'measured');assert.ok(ev.view.airEnergySigned_kW<0);assert.ok(ev.view.airEnergyMagnitude_kW>0);});

// ===== CSV / PRINT =====
const aaRec=()=>({id:1700000000000,date:'2026-06-28 10:00',mode:'Air/Air',job:'JOB',uid:'U1',ref:'R1',t1:'25.00',t2:'12.00',wb1:'18.0',wb2:'9.0',rh1:'50.0000',rh2:'70.0000',af:'2000',pw:'1.2000',Q:'7.5000',eer:'6.2500',tE:'5.0000',sh:'4.0000',tC:'40.0000',sP:'5.0000',dP:'15.0000',unit:'C'});
const AA_R='"2026-06-28 10:00","Air/Air","JOB","U1","R1","25.00","12.00","7.5000","--","6.2500","no","--","--","--","--","--","5.0000","4.0000","40.0000","5.0000","15.0000","C"';
test('CSV: A/L Mode cell Cooling/Heating; A/A row byte-identical',()=>{
  const c=engcalcAirRecord({operatingMode:'cooling',air_status:'estimated',air_output_available:true,air:{suppressed:false,pressure:{state:'known',value:1,classification:'x',source:'x',reason:null}}});
  const h=engcalcAirRecord({operatingMode:'heating',air_status:'estimated',air_output_available:true,air:{suppressed:false,pressure:{state:'known',value:1,classification:'x',source:'x',reason:null}}});
  assert.ok(engcalcBuildCsv([c]).split('\n')[1].indexOf('"Air/Liquid Cooling"')>=0);
  assert.ok(engcalcBuildCsv([h]).split('\n')[1].indexOf('"Air/Liquid Heating"')>=0);
  assert.equal(engcalcBuildCsv([aaRec()]).split('\n')[1],AA_R);
});
test('CSV: A/L Air-suppressed cell derives BLOCKED/WITHHELD/LIMITED/INCOMPLETE/no',()=>{
  const m=(st,avail)=>engcalcAirRecord({operatingMode:'cooling',air_status:st,air_output_available:avail,air:{suppressed:!avail,pressure:{state:'known',value:1,classification:'x',source:'x',reason:null}}});
  assert.ok(engcalcBuildCsv([m('blocked',false)]).split('\n')[1].indexOf('"BLOCKED"')>=0);
  assert.ok(engcalcBuildCsv([m('withheld',false)]).split('\n')[1].indexOf('"WITHHELD"')>=0);
  assert.ok(engcalcBuildCsv([m('limited',false)]).split('\n')[1].indexOf('"LIMITED"')>=0);
  assert.ok(engcalcBuildCsv([m('incomplete',false)]).split('\n')[1].indexOf('"INCOMPLETE"')>=0);
  assert.ok(engcalcBuildCsv([m('estimated',true)]).split('\n')[1].indexOf('"no"')>=0);
});
test('print: available result reason null; frost uses A/L reason',()=>{
  const ok=engcalcAirRecord({operatingMode:'cooling',air_status:'estimated',air_output_available:true,air:{suppressed:false,pressure:{state:'known',value:101325,classification:'entered',source:'x',reason:null}}});
  const okp=engcalcBuildPrintProjection([ok],{state:'known',value_kPa:101.325,classification:'reference',source:'x',reason:null});
  assert.equal(okp.air_side.reason_code,null);assert.equal(okp.air_side.reason_message,null);
  const fr=engcalcAirRecord({operatingMode:'heating',air_status:'limited',air_reason:'heating_auto_frost_limit',air_reason_message:RM('heating_auto_frost_limit'),air_output_available:false,air:{suppressed:true,pressure:{state:'known',value:1,classification:'x',source:'x',reason:null}}});
  const frp=engcalcBuildPrintProjection([fr],{state:'known',value_kPa:101.325,classification:'reference',source:'x',reason:null});
  assert.equal(frp.air_side.reason_code,'heating_auto_frost_limit');assert.ok(/frost/i.test(frp.air_side.reason_message));assert.ok(!/pressure/i.test(frp.air_side.reason_message));
});

// ===== COMPONENT INTEGRATION (robust extraction of ONLY AirLiquid) =====
test('AirLiquid integrates the single evaluator and reads only the contract',()=>{
  const body=extractFn(readSrc(),'AirLiquid');
  assert.ok(body,'AirLiquid not found');
  const evalCalls=(body.match(/engcalcAirLiquidEvaluateAir\(/g)||[]).length;
  assert.equal(evalCalls,1,'exactly one engcalcAirLiquidEvaluateAir( call, got '+evalCalls);
  assert.ok(!/engcalcAirSide\(/.test(body),'AirLiquid must not call engcalcAirSide directly');
  assert.ok(!/engcalcAirLiquidAirState\(/.test(body),'engcalcAirLiquidAirState must not be called');
  // strip strings/comments before scanning for raw object access
  const code=body.replace(/`(?:\\.|[^`\\])*`/g,'``').replace(/'(?:\\.|[^'\\])*'/g,"''").replace(/"(?:\\.|[^"\\])*"/g,'""').replace(/\/\/[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'');
  assert.ok(!/[^A-Za-z0-9_]_air\.[a-zA-Z]/.test(code),'no standalone _air. in AirLiquid');
  assert.ok(!/_raw\./.test(code),'no _raw. in AirLiquid');
  assert.ok(!/rawAir\./.test(code),'no rawAir. in AirLiquid');
  assert.ok(/disabled=\{!_eval\.saveAllowed\}/.test(body),'Save must use _eval.saveAllowed');
  assert.ok(/data-air-status=\{_eval\.airStatus\}/.test(body),'permanent data-air-status');
  assert.ok(/data-air-reason=\{_eval\.reasonCode/.test(body),'permanent data-air-reason');
});
test('AirLiquid: neutral pre-mode strings present',()=>{
  const body=extractFn(readSrc(),'AirLiquid');
  for(const t of ["'COP — select mode'","'Air Side — Waiting for operating mode'","'Leaving Air — select operating mode'","'kW air-side energy'"]) assert.ok(body.indexOf(t)>=0,'missing '+t);
});

// ===== SINGLE-SOURCE EQUIVALENCE (point 19); AirState absent everywhere =====
test('production source and tests/engine.js define identical A/L bodies; engcalcAirLiquidAirState absent',()=>{
  const src=readSrc(), eng=readEng();
  assert.ok(src.indexOf('engcalcAirLiquidAirState')<0,'AirState must not exist in production source');
  assert.ok(eng.indexOf('engcalcAirLiquidAirState')<0,'AirState must not exist in tests/engine.js');
  const norm=t=>t.replace(/`(?:\\.|[^`\\])*`/g,m=>m).replace(/\/\/[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();
  for(const name of ['engcalcAirLiquidSolve','engcalcAirLiquidBalance','engcalcAirLiquidReasonMessage','engcalcAirLiquidEvaluateAir','engcalcAirRecord']){
    const a=extractFn(src,name), b=extractFn(eng,name);
    assert.ok(a,'missing '+name+' in source'); assert.ok(b,'missing '+name+' in engine.js');
    assert.equal(norm(a),norm(b),name+' differs between production source and tests/engine.js');
  }
});

// ===== rev9.2 — statusMessage separated from reason; record gates message; legacy CSV =====
test('non-error states: reasonCode/reasonMessage null, statusMessage populated',()=>{
  for(const [args,st] of [[evalArgs('cooling',12,7),'estimated'],
      [evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44}),'incomplete'],
      [evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44,lRHset:true,leavingRH_pct:24.7,afSet:true,airflow_m3h:3700}),'measured']]){
    const r=EV(args); assert.equal(r.airStatus,st); assert.equal(r.reasonCode,null); assert.equal(r.reasonMessage,null);
    assert.ok(typeof r.statusMessage==='string'&&r.statusMessage.length>0);
  }
});
test('error states keep reasonCode + reasonMessage; statusMessage mirrors reason',()=>{
  const w=EV(evalArgs('cooling',12,7,{pAtm:undefined}));
  assert.equal(w.reasonCode,'pressure_missing'); assert.ok(w.reasonMessage); assert.equal(w.statusMessage,w.reasonMessage);
});
test('CHAIN auto: EvaluateAir -> engcalcAirRecord -> engcalcBuildPrintProjection => estimated, reason null/null',()=>{
  const ev=EV(evalArgs('cooling',12,7));
  const rec=engcalcAirRecord({operatingMode:ev.operatingMode,air_status:ev.airStatus,air_reason:ev.reasonCode,air_reason_message:ev.reasonMessage,air_output_available:ev.qaAvailable,pressure:ev.pressure});
  assert.equal(rec.air_status,'estimated'); assert.equal(rec.air_reason,null); assert.equal(rec.air_reason_message,null);
  const proj=engcalcBuildPrintProjection([rec],{state:'known',value_kPa:101.325,classification:'reference',source:'x',reason:null});
  assert.equal(proj.air_side.status,'estimated'); assert.equal(proj.air_side.reason_code,null); assert.equal(proj.air_side.reason_message,null);
});
test('CHAIN measured: reason null/null through record + print',()=>{
  const ev=EV(evalArgs('cooling',12,7,{lDBset:true,leavingDB_C:44,lRHset:true,leavingRH_pct:24.7,afSet:true,airflow_m3h:3700}));
  const rec=engcalcAirRecord({operatingMode:ev.operatingMode,air_status:ev.airStatus,air_reason:ev.reasonCode,air_reason_message:ev.reasonMessage,air_output_available:ev.qaAvailable,pressure:ev.pressure,Qair:String(ev.view.airEnergySigned_kW)});
  assert.equal(rec.air_status,'measured'); assert.equal(rec.air_reason,null); assert.equal(rec.air_reason_message,null);
  const proj=engcalcBuildPrintProjection([rec],{state:'known',value_kPa:101.325,classification:'reference',source:'x',reason:null});
  assert.equal(proj.air_side.reason_code,null); assert.equal(proj.air_side.reason_message,null);
});
test('record stores air_reason_message only when air_reason is non-null',()=>{
  const ok=engcalcAirRecord({operatingMode:'cooling',air_status:'estimated',air_reason:null,air_reason_message:'should be dropped',air_output_available:true,air:{suppressed:false,pressure:{state:'known',value:1,classification:'x',source:'x',reason:null}}});
  assert.equal(ok.air_reason_message,null);
  const er=engcalcAirRecord({operatingMode:'heating',air_status:'limited',air_reason:'heating_auto_frost_limit',air_reason_message:RM('heating_auto_frost_limit'),air_output_available:false,air:{suppressed:true,pressure:{state:'known',value:1,classification:'x',source:'x',reason:null}}});
  assert.ok(/frost/i.test(er.air_reason_message));
});
test('legacy A/L CSV compatibility: no air_status -> old air_suppressed fallback; A/A byte-identical',()=>{
  assert.ok(engcalcBuildCsv([{mode:'Air/Liquid',air_suppressed:true,air_status:undefined}]).split('\n')[1].indexOf('"WITHHELD"')>=0);
  assert.ok(engcalcBuildCsv([{mode:'Air/Liquid',air_suppressed:false,air_status:undefined}]).split('\n')[1].indexOf('"no"')>=0);
  assert.equal(engcalcBuildCsv([aaRec()]).split('\n')[1],AA_R);
});

const fs=require('fs'),path=require('path'),crypto=require('crypto');
const M=require('./mount.js'); const E=require('./engine.js');
const ROOT=path.join(__dirname,'..');
const SHA=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'corrected','Kalkulator_build9.6-rc8_step3_4.src.html'))).digest('hex');
const paFrom=fn=>E.engcalcAppPressurePa(fn());
const POS=/✅|Good|Acceptable/, ZP=/\b0\.00%|\b0%/, NANINF=/NaN|Infinity/;
const samples={ artifact_sha256:SHA, runtime:'Node.js '+process.version+' (virtual React render tree — NOT a pixel browser)', note:'Substitute for Chromium screenshots: the REAL App/AirLiquid components rendered to a React element tree and asserted. A real browser run is in chromium/pc_step3_4.spec.js (NOT RUN here — no engine).', scenarios:[] };
// App initial
{ const r=M.renderComponent('App',{}); samples.scenarios.push({id:'A-initial', data:r.data, pressure_missing:r.data['data-pressure-state']==='missing', no_implicit_101_5:!/value="101\.5"/.test(JSON.stringify(r)), reference_button:/Use reference pressure 101\.325/.test(r.text)}); }
// AirLiquid withheld (missing/invalid) + available (valid/reference)
for(const [id,fn,withheld] of [['B-missing',()=>E.engcalcAppPressureInit(),true],['B-zero',()=>E.engcalcAppPressureFromField(0),true],['B-above',()=>E.engcalcAppPressureFromField(120),true],['C-valid-95',()=>E.engcalcAppPressureFromField(95),false],['D-reference',()=>E.engcalcAppPressureReference(),false]]){
  const r=M.renderAirLiquid({pAtm:paFrom(fn)});
  const w=r.data['data-air-status']==='withheld';
  samples.scenarios.push({id, withheld_expected:withheld, withheld_actual:w, data:r.data,
    no_positive: !POS.test(r.text), no_zero_pct: !ZP.test(r.text), no_naninf: !NANINF.test(r.text),
    liquid_visible:/Q Liquid/.test(r.text), pass: (w===withheld) && (!w || (!POS.test(r.text)&&!ZP.test(r.text))) && !NANINF.test(r.text) && /Q Liquid/.test(r.text)});
}
const allPass=samples.scenarios.every(s=>s.pass!==false && (s.pressure_missing!==false));
fs.writeFileSync(path.join(ROOT,'results','render_tree_evidence.json'),JSON.stringify(samples,null,2));
console.log('render-tree scenarios:',samples.scenarios.length,'| all consistent:',allPass);
process.exit(allPass?0:1);

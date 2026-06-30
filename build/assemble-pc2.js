'use strict';

/**
 * Deterministic assembler for Kalkulator_build9.8-pc2.html.
 *
 * Builds the candidate from the REAL rc8 application source. The Air/Air page is
 * transformed so that all CALCULATED results come from the shared computeAirAir()
 * engine (single source — no duplicate capacity/SHR/mass-flow formula remains), and
 * the UI gains explicit DB+RH / DB+WB input-method selectors (per state) and a
 * required airflow-reference selector. Does NOT hand-edit the output HTML.
 *
 * Frozen files are read-only and never modified:
 *   Kalkulator_build9.7-pc6.html, index.html, Kalkulator.html, Kalkulator_build9.8-pc1.html
 *
 * Determinism: no timestamps, no random ids, no absolute paths, no environment data
 * embedded — two consecutive builds produce a byte-identical artifact. The build
 * STOPS on a SHA mismatch of a gated source, or if an expected UI anchor is missing
 * or ambiguous.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORK = path.resolve(__dirname, '..');
const REPO = process.env.NODITECH_REPO_FILES || WORK;

const PC6 = path.join(REPO, 'Kalkulator_build9.7-pc6.html');
const RC8 = path.join(REPO, 'corrected', 'Kalkulator_build9.6-rc8_step3_4.src.html');
const LOCK_PATH = path.join(REPO, 'tools', 'compiler', 'compiler.lock.json');
const BABEL = path.join(REPO, 'tools', 'compiler', 'babel.standalone.7.23.2.min.js');

const EXPECT_PC6 = 'b9f8be84731b9038a814ecc32b876d8856d8526ccf28cd35cc1bb1d74167dc50';
const EXPECT_RC8 = 'd3080ff5fcf0dd539130c6849edb66aa3db9faed11e6b045561d048c76c99210';

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

function readGated(file, expect, name) {
  const buf = fs.readFileSync(file);
  const h = sha(buf);
  if (h !== expect) throw new Error(`${name} SHA-256 mismatch: ${h} != ${expect}`);
  return buf.toString('utf8');
}

function extractScriptBlock(html, marker) {
  const i = html.indexOf(marker);
  if (i < 0) throw new Error(`marker not found: ${marker}`);
  const start = html.lastIndexOf('<script', i);
  const end = html.indexOf('</script>', i);
  if (start < 0 || end < 0) throw new Error('script bounds not found');
  return html.slice(start, end + '</script>'.length);
}

// require an anchor to be present exactly once
function uniqueIndex(src, anchor, label) {
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error(`UI anchor not found (${label})`);
  if (src.indexOf(anchor, i + 1) >= 0) throw new Error(`UI anchor ambiguous (${label})`);
  return i;
}

// ── A/A compute block: derive entering/leaving states + capacity from the shared
//    engine. Removes the inline capacity formula (mf=afs/vL, Q=mf*dh, cpMA, sr, qs, ql).
const COMPUTE_START = 'const hE=enth(eC,eRH,pAtm),vE=sVol(eC,eRH,pAtm),wE=wBulb(eC,eRH,pAtm),WE=humR(eC,eRH,pAtm);';
const COMPUTE_END = 'const qs=Q*sr,ql=Q-qs;';
const NEW_COMPUTE = [
  // In WB mode, sync the (now-derived) RH state via the shared engine so the active
  // RH is used consistently everywhere (display, validation, save/export, print).
  "React.useEffect(function(){if(eMethod==='wb'){var s=NoditechPsychrometrics.stateFromDBWB(eC,C(eWB),pAtm);if(s&&s.ok&&isFinite(s.rhPct))setERH(s.rhPct);}},[eMethod,eWB,eC,pAtm]);",
  "React.useEffect(function(){if(lMethod==='wb'){var s=NoditechPsychrometrics.stateFromDBWB(lC,C(lWB),pAtm);if(s&&s.ok&&isFinite(s.rhPct))setLRH(s.rhPct);}},[lMethod,lWB,lC,pAtm]);",
  "const _eSt=(function(){if(eMethod==='wb'){var s=NoditechPsychrometrics.stateFromDBWB(eC,C(eWB),pAtm);return s&&s.ok?s:null;}return NoditechPsychrometrics.stateFromDBRH(eC,eRH,pAtm);})();",
  "const _lSt=(function(){if(lMethod==='wb'){var s=NoditechPsychrometrics.stateFromDBWB(lC,C(lWB),pAtm);return s&&s.ok?s:null;}return NoditechPsychrometrics.stateFromDBRH(lC,lRH,pAtm);})();",
  'const hE=_eSt?_eSt.enthalpyKJkg:enth(eC,eRH,pAtm),vE=_eSt?_eSt.specificVolumeM3kg:sVol(eC,eRH,pAtm),wE=_eSt?_eSt.wbC:wBulb(eC,eRH,pAtm),WE=_eSt?_eSt.humidityRatio:humR(eC,eRH,pAtm);',
  'const hL=_lSt?_lSt.enthalpyKJkg:enth(lC,lRH,pAtm),vL=_lSt?_lSt.specificVolumeM3kg:sVol(lC,lRH,pAtm),wL=_lSt?_lSt.wbC:wBulb(lC,lRH,pAtm),WL=_lSt?_lSt.humidityRatio:humR(lC,lRH,pAtm);',
  'const wO=wBulb(oC,oRH,pAtm),WO=humR(oC,oRH,pAtm);',
  // Derived RH is null (not 0) when the engine state is invalid — never display 0.00 %.
  'const eRHderived=(_eSt&&isFinite(_eSt.rhPct))?_eSt.rhPct:null,lRHderived=(_lSt&&isFinite(_lSt.rhPct))?_lSt.rhPct:null;',
  'const afs=af/3600;',
  "const _aa=NoditechAirAir.computeAirAir({entering:NoditechAirAir.sideInput(eMethod,eC,eRH,C(eWB)),leaving:NoditechAirAir.sideInput(lMethod,lC,lRH,C(lWB)),airflowM3h:af,airflowReference:afRef||undefined,pressurePa:pAtm});",
  "const _aaOK=_aa.status!=='blocked',_aaRes=_aa.result;",
  "var _aaMsgMap={airflow_reference_missing:'Select an airflow reference (entering or leaving).',pressure_non_finite:'Enter a valid atmospheric pressure (50-110 kPa).',pressure_non_positive:'Atmospheric pressure must be greater than 0.',pressure_below_range:'Atmospheric pressure is below 50 kPa.',pressure_above_range:'Atmospheric pressure is above 110 kPa.',wb_gt_db:'Wet-bulb cannot exceed dry-bulb.',wb_not_attainable:'Wet-bulb is not attainable for this dry-bulb/pressure.',rh_missing:'Enter relative humidity.',rh_out_of_range:'Relative humidity must be 0-100%.',state_input_method_invalid:'Choose an input method (RH or WB).',leaving_enthalpy_ge_entering:'Leaving enthalpy must be below entering (cooling).',airflow_invalid:'Enter a valid airflow.',non_physical_specific_volume:'Non-physical specific volume.',non_finite_capacity:'Non-finite capacity.',negative_capacity:'Negative capacity.'};",
  "var _aaMsg=(_aa.code&&_aa.code!=='ok')?(_aaMsgMap[_aa.code]||('Blocked: '+_aa.code)):'';",
  'const mf=_aaOK?_aaRes.dryAirMassFlowKgS:NaN,dh=Math.max(0,hE-hL),Q=_aaOK?_aaRes.totalCapacityKW:0,pTotal=pw+pFan+pOther,eer=pTotal>0?Q/pTotal:0,eerComp=pw>0?Q/pw:0;',
  'const sr=_aaOK?_aaRes.shr:0;',
  'const qs=_aaOK?_aaRes.sensibleCapacityKW:0,ql=_aaOK?_aaRes.latentCapacityKW:0;',
].join('\n  ');

const STATE_ANCHOR = 'const [eDB,setEDB]=useState(26);const [eRH,setERH]=useState(50);';
const STATE_INJECT = STATE_ANCHOR +
  "\n  const [eMethod,setEMethod]=useState('rh');const [lMethod,setLMethod]=useState('rh');" +
  "const [eWB,setEWB]=useState(18);const [lWB,setLWB]=useState(13);const [afRef,setAfRef]=useState('');";

const RECORD_ANCHOR = 'mode:\'Air/Air\',job:job||"--",uid:uid||"--",ref,';
const RECORD_INJECT = 'mode:\'Air/Air\',eMethod,lMethod,afRef,eRHd:fmt(eRHderived,4),lRHd:fmt(lRHderived,4),engineStatus:_aa.status,engineCode:_aa.code,enteringInput:{method:eMethod,db:fmt(F(eC),2),rhMeasured:eMethod===\'rh\'?eRH:null,wbMeasured:eMethod===\'wb\'?eWB:null},leavingInput:{method:lMethod,db:fmt(F(lC),2),rhMeasured:lMethod===\'rh\'?lRH:null,wbMeasured:lMethod===\'wb\'?lWB:null},job:job||"--",uid:uid||"--",ref,';

const CONTROL_CARD = `
    <div className="card">
      <div className="slbl">Input Method & Airflow Reference</div>
      <div className="two">
        <div className="field"><div className="lbl"><span>Entering input method</span></div>
          <select data-testid="entering-method" value={eMethod} onChange={e=>setE
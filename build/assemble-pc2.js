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
          <select data-testid="entering-method" value={eMethod} onChange={e=>setEMethod(e.target.value)} style={{width:'100%',padding:'7px',background:'rgba(0,0,0,.2)',color:'#f5f0e8',border:'1px solid rgba(255,255,255,.15)',borderRadius:6}}>
            <option value="rh">DB + RH</option><option value="wb">DB + WB</option>
          </select>
          {eMethod==='wb'&&<><div className="lbl" style={{marginTop:8}}><span>Entering WB</span><span className="utag">deg {unit}</span></div><span data-testid="entering-wb"><FloatInput value={eWB} onChange={setEWB} min={mn} max={mx} step={0.0001}/></span><div data-testid="entering-rh-derived" style={{fontSize:11,color:eRHderived!=null?'#94a3b8':'#fca5a5',marginTop:4}}>RH (derived): {eRHderived!=null?(fmt(eRHderived,2)+' %'):'— (state blocked)'}</div></>}
        </div>
        <div className="field"><div className="lbl"><span>Leaving input method</span></div>
          <select data-testid="leaving-method" value={lMethod} onChange={e=>setLMethod(e.target.value)} style={{width:'100%',padding:'7px',background:'rgba(0,0,0,.2)',color:'#f5f0e8',border:'1px solid rgba(255,255,255,.15)',borderRadius:6}}>
            <option value="rh">DB + RH</option><option value="wb">DB + WB</option>
          </select>
          {lMethod==='wb'&&<><div className="lbl" style={{marginTop:8}}><span>Leaving WB</span><span className="utag">deg {unit}</span></div><span data-testid="leaving-wb"><FloatInput value={lWB} onChange={setLWB} min={mn} max={mx} step={0.0001}/></span><div data-testid="leaving-rh-derived" style={{fontSize:11,color:lRHderived!=null?'#94a3b8':'#fca5a5',marginTop:4}}>RH (derived): {lRHderived!=null?(fmt(lRHderived,2)+' %'):'— (state blocked)'}</div></>}
        </div>
      </div>
      <div className="field" style={{marginTop:10}}><div className="lbl"><span>Airflow reference</span><span className="utag">required</span></div>
        <select data-testid="airflow-ref" value={afRef} onChange={e=>setAfRef(e.target.value)} style={{width:'100%',padding:'7px',background:'rgba(0,0,0,.2)',color:'#f5f0e8',border:'1px solid rgba(255,255,255,.15)',borderRadius:6}}>
          <option value="">— select airflow reference —</option>
          <option value="entering">Entering (use entering specific volume)</option>
          <option value="leaving">Leaving (use leaving specific volume)</option>
        </select>
        {!afRef&&<div className="warn" data-testid="airflow-ref-warning">Select the airflow reference (entering or leaving). Capacity is blocked until a reference is chosen.</div>}
      </div>
      <div style={{marginTop:10,fontSize:12,display:'flex',gap:14,flexWrap:'wrap'}}>
        <span>Engine status: <strong data-testid="engine-status" data-engine-status={_aa.status} data-engine-code={_aa.code||''} data-engine-field={_aa.field||''} style={{color:_aaOK?'#22c55e':'#f87171'}}>{_aa.status.toUpperCase()}</strong></span>
        {_aa.code&&_aa.code!=='ok'&&<span style={{color:'#f87171'}}>code: {_aa.code}{_aa.field?(' ('+_aa.field+')'):''}</span>}
        {afRef&&<span>airflow ref: <strong data-testid="airflow-ref-active">{afRef}</strong></span>}
        <span>total Q: <strong data-testid="total-capacity">{_aaOK?fmt(Q,4):'--'}</strong> kW</span>
        {_aa.warnings&&_aa.warnings.length>0&&<span style={{color:'#fbbf24'}}>warnings: {_aa.warnings.map(w=>w.code).join(', ')}</span>}
      </div>
      {!_aaOK&&_aaMsg&&<div className="warn" data-testid="engine-corrective">{_aaMsg}</div>}
    </div>`;

function applyUiTransforms(appSrc) {
  let s = appSrc;

  // 1) new state
  uniqueIndex(s, STATE_ANCHOR, 'state');
  s = s.split(STATE_ANCHOR).join(STATE_INJECT);

  // 2) compute block -> single-source via computeAirAir
  const cs = uniqueIndex(s, COMPUTE_START, 'compute-start');
  const ce = s.indexOf(COMPUTE_END, cs);
  if (ce < 0) throw new Error('UI anchor not found (compute-end)');
  s = s.slice(0, cs) + NEW_COMPUTE + s.slice(ce + COMPUTE_END.length);
  if (s.indexOf('mf=afs/vL') >= 0) throw new Error('duplicate capacity formula still present');
  if (s.indexOf('NoditechAirAir.computeAirAir(') < 0) throw new Error('computeAirAir not wired');

  // 3) saved record fields (A/A-specific, unique)
  uniqueIndex(s, RECORD_ANCHOR, 'record');
  s = s.split(RECORD_ANCHOR).join(RECORD_INJECT);

  // A/A marker used to disambiguate the 3 identical save()/ValidationBanner sites
  const mark = uniqueIndex(s, "mode:'Air/Air'", 'aa-mark');

  // 4) block save when engine status is blocked (inject into the A/A save())
  const saveIdx = s.lastIndexOf('function save(){', mark);
  if (saveIdx < 0) throw new Error('A/A save() not found');
  const saveHead = 'function save(){';
  s = s.slice(0, saveIdx + saveHead.length) + 'if(!_aaOK){return;}' + s.slice(saveIdx + saveHead.length);

  // 5) inject the control card after the A/A ValidationBanner
  const mark2 = s.indexOf("mode:'Air/Air'");
  const vb = s.indexOf('<ValidationBanner issues={_issues}/>', mark2);
  if (vb < 0) throw new Error('A/A ValidationBanner not found');
  const vbEnd = vb + '<ValidationBanner issues={_issues}/>'.length;
  s = s.slice(0, vbEnd) + CONTROL_CARD + s.slice(vbEnd);

  // 6) stable data-testid on existing inputs so the browser test sets ALL inputs explicitly
  const TESTID_WRAPS = [
    ['<FloatInput value={eDB} onChange={setEDB} min={mn} max={mx} step={0.0001}/>', 'entering-db'],
    ["<FloatInput value={lDB} onChange={setLDB} min={mn} max={mx} step={0.0001} style={{borderColor:'rgba(201,168,76,.4)'}}/>", 'leaving-db'],
    ['<FloatInput value={af} onChange={setAf} min={10} max={50000} step={10}/>', 'airflow'],
    ['<FloatInput value={pPress.value_kPa} onChange={v=>setPPress(engcalcAppPressureFromField(v))} onValidity={(valid,m)=>setAlPPress(engcalcAppPressureFromField(m.rawText))} min={50} max={110} step={0.1} placeholder="enter site pressure (kPa)"/>', 'pressure'],
  ];
  for (const [tag, id] of TESTID_WRAPS) {
    uniqueIndex(s, tag, 'testid-' + id);
    s = s.split(tag).join('<span data-testid="' + id + '">' + tag + '</span>');
  }
  // unit toggle buttons -> data-testid unit-C / unit-F
  uniqueIndex(s, '<button key={u} onClick={()=>setUnit(u)}', 'unit-buttons');
  s = s.split('<button key={u} onClick={()=>setUnit(u)}').join('<button key={u} data-testid={"unit-"+u} onClick={()=>setUnit(u)}');

  return s;
}

function build() {
  const pc6 = readGated(PC6, EXPECT_PC6, 'pc6');
  const rc8 = readGated(RC8, EXPECT_RC8, 'rc8');

  const reactBlock = extractScriptBlock(pc6, '/* react 18.2.0 UMD');
  const reactDomBlock = extractScriptBlock(pc6, '/* react-dom 18.2.0 UMD');

  const ob = '<script type="text/babel">';
  const oi = rc8.indexOf(ob);
  if (oi < 0) throw new Error('text/babel app block not found in rc8');
  const ci = rc8.indexOf('</script>', oi + ob.length);
  if (ci < 0) throw new Error('text/babel app block end not found');
  const appBlockFull = rc8.slice(oi, ci + '</script>'.length);
  let appSrc = rc8.slice(oi + ob.length, ci);

  appSrc = applyUiTransforms(appSrc);

  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const compilerSha = sha(fs.readFileSync(BABEL));
  if (compilerSha !== lock.integrity_sha256) throw new Error(`locked compiler integrity fail: ${compilerSha}`);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const Babel = require(BABEL);
  const compiled = Babel.transform(appSrc, { presets: lock.presets, sourceType: 'script', comments: false }).code;

  const psy = fs.readFileSync(path.join(WORK, 'src', 'engine', 'psychrometrics.js'), 'utf8');
  const aa = fs.readFileSync(path.join(WORK, 'src', 'engine', 'airAir.js'), 'utf8');

  // Assemble: rc8 with deterministic substitutions (split/join avoids $-interpretation)
  let out = rc8;

  // remove external Google Fonts link -> inline system font stack (no external font dep)
  const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet">';
  if (out.indexOf(FONT_LINK) < 0) throw new Error('expected Google Fonts link not found');
  out = out.split(FONT_LINK).join('<style>html,body,button,input,select,textarea{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}</style>');

  out = out.split('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>').join(reactBlock);
  out = out.split('<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>').join(reactDomBlock);
  out = out.split('<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>').join('');

  const replacement =
    '<script>\n' + psy.trimEnd() + '\n</script>\n' +
    '<script>\n' + aa.trimEnd() + '\n</script>\n' +
    '<script>\n' + compiled.trimEnd() + '\n</script>';
  out = out.split(appBlockFull).join(replacement);

  out = out.replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');

  return { html: out, sha256: sha(Buffer.from(out, 'utf8')), pc6sha: EXPECT_PC6, rc8sha: EXPECT_RC8 };
}

module.exports = { build, applyUiTransforms, extractScriptBlock };

if (require.main === module) {
  const distDir = process.env.NODITECH_DIST_DIR || path.join(WORK, 'dist');
  const res = build();
  fs.mkdirSync(distDir, { recursive: true });
  const outPath = path.join(distDir, 'Kalkulator_build9.8-pc2.html');
  fs.writeFileSync(outPath, res.html, 'utf8');
  fs.writeFileSync(path.join(distDir, 'SHA256SUMS.pc2.txt'), `${res.sha256}  Kalkulator_build9.8-pc2.html\n`, 'utf8');
  process.stdout.write(`built Kalkulator_build9.8-pc2.html\nsha256 ${res.sha256}\nbytes ${Buffer.byteLength(res.html)}\n`);
}

#!/usr/bin/env node
/* Step 3.7 — complete real-Chromium runner over HTTP (no file://). Zero npm deps: starts the packaged
 * Node static server (127.0.0.1, dynamic port), drives an already-installed Chromium via CDP using Node's
 * built-in WebSocket, runs render prerequisites + the full A–H Step 3 suite against the REAL rendered
 * application, captures Chromium version, console, page errors, browser stderr, network log, screenshots,
 * and writes JSON + JUnit. Requires no source editing.
 *
 *   CHROMIUM_BIN=/usr/bin/chromium node chromium/run_chromium.js
 *
 * Binds to the exact packaged production artifact SHA; fails closed on render failure, any failed assertion,
 * any uncaught page error, or any external runtime network request. */
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http'), crypto=require('crypto'), cp=require('child_process');
const server=require('./server.js');
const ROOT=path.join(__dirname,'..');
const PROD=path.join(ROOT,'corrected','Kalkulator_build9.6-rc8_step3_4.src.html');
const RES=path.join(ROOT,'chromium','results');
const SHOT=path.join(ROOT,'screenshots');
const EXPECT_SHA='d3080ff5fcf0dd539130c6849edb66aa3db9faed11e6b045561d048c76c99210';
const TS=process.env.BUILD_TS||new Date().toISOString();
fs.mkdirSync(RES,{recursive:true}); fs.mkdirSync(SHOT,{recursive:true});
let stderrBuf='';
function writeDiag(d){ fs.writeFileSync(path.join(RES,'render_root_diagnostic.json'),JSON.stringify(d,null,2)); }
function die(msg,diag){ const out={suite:'step3.7.chromium/1.0',status:'ERROR',error:String(msg),generated:TS,artifact_sha256_expected:EXPECT_SHA};
  fs.writeFileSync(path.join(RES,'chromium_result.json'),JSON.stringify(out,null,2));
  fs.writeFileSync(path.join(RES,'chromium_junit.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="step3.7-chromium" tests="1" failures="1" errors="1">\n  <testsuite name="chromium" tests="1" failures="1"><testcase classname="chromium" name="environment"><error>'+String(msg).replace(/[<&>]/g,'')+'</error></testcase></testsuite>\n</testsuites>\n');
  fs.writeFileSync(path.join(RES,'chromium_stderr.log'),stderrBuf||'(none)\n');
  writeDiag(diag||{status:'ERROR',error:String(msg),generated:TS});
  console.error('CHROMIUM RUN ERROR:',msg); process.exit(3); }

const actualSha=crypto.createHash('sha256').update(fs.readFileSync(PROD)).digest('hex');
if(actualSha!==EXPECT_SHA) die('artifact SHA mismatch: '+actualSha+' != '+EXPECT_SHA);

function findChromium(){
  if(process.env.CHROMIUM_BIN && fs.existsSync(process.env.CHROMIUM_BIN)) return process.env.CHROMIUM_BIN;
  const names=['google-chrome','google-chrome-stable','chromium','chromium-browser','chrome'];
  for(const n of names){ try{ const w=cp.execSync((process.platform==='win32'?'where ':'command -v ')+n,{stdio:['ignore','pipe','ignore']}).toString().trim().split('\n')[0]; if(w&&fs.existsSync(w)) return w; }catch(e){} }
  for(const f of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium','/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','C:/Program Files/Google/Chrome/Application/chrome.exe']) if(fs.existsSync(f)) return f;
  try{ const base=path.join(os.homedir(),process.platform==='darwin'?'Library/Caches/ms-playwright':'.cache/ms-playwright'); for(const d of fs.readdirSync(base)){ if(/^chromium/.test(d)){ for(const rel of ['chrome-linux/chrome','chrome-mac/Chromium.app/Contents/MacOS/Chromium','chrome-win/chrome.exe']){ const p=path.join(base,d,rel); if(fs.existsSync(p)) return p; } } } }catch(e){}
  return null;
}
const BIN=findChromium();
if(!BIN) die('no installed Chromium found. Set CHROMIUM_BIN=/path/to/chrome and re-run. This package does NOT download a browser.');

const results=[], consoleLog=[], browserLog=[], pageErrors=[], netLog=[], shots=[];
function rec(id,desc,pass,detail){ results.push({id,desc,pass:!!pass,detail:detail!==undefined?String(detail):''}); console.log((pass?'PASS ':'FAIL ')+id+'  '+desc+(pass?'':'  -> '+detail)); }
const HELP="window.__h={"+
 "txt:function(){return document.querySelector('#root').innerText;},"+
 "rootHTML:function(){var r=document.getElementById('root');return r?r.outerHTML.slice(0,4000):null;},"+
 "clickAL:function(){var b=[].slice.call(document.querySelectorAll('button.mbt')).find(function(x){return /A\\/L/.test(x.textContent)});if(b)b.click();return !!b;},"+
 "glycolOff:function(){var a=[].slice.call(document.querySelectorAll('button'));var off=a.find(function(x){return /^\\s*Glycol OFF\\s*$/.test(x.textContent||'');});if(off)return true;var on=a.find(function(x){return /^\\s*Glycol ON\\s*$/.test(x.textContent||'');});if(on)on.click();return !!on;},"+
 "glycolState:function(){var a=[].slice.call(document.querySelectorAll('button'));var b=a.find(function(x){return /^\\s*Glycol (ON|OFF)\\s*$/.test(x.textContent||'');});return b?(/OFF/.test(b.textContent||'')?'off':'on'):null;},"+
 "selectALMode:function(mode){var a=[].slice.call(document.querySelectorAll('[data-al-mode-select] button'));var b=a.find(function(x){return x.getAttribute('data-al-mode')===mode||(x.textContent||'').trim().toLowerCase()===mode;});if(b)b.click();return !!b;},"+
 "alMode:function(){var b=document.querySelector('[data-al-mode][aria-pressed=true]');return b?b.getAttribute('data-al-mode'):null;},"+
 "setPress:function(v){var i=[].slice.call(document.querySelectorAll('input')).find(function(x){return /enter site pressure/i.test(x.placeholder||'')});if(!i)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(i,v);i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return true;},"+
 "pressVal:function(){var i=[].slice.call(document.querySelectorAll('input')).find(function(x){return /enter site pressure/i.test(x.placeholder||'')});return i?i.value:'';},"+
 "clickRef:function(){var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return /Use reference pressure 101\\.325 kPa/.test(x.textContent)});if(b)b.click();return !!b;},"+
 "clickByName:function(re){var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return new RegExp(re).test(x.textContent)});if(b)b.click();return !!b;},"+
 "pressState:function(){var e=document.querySelector('[data-pressure-state]');return e?e.getAttribute('data-pressure-state'):null;},"+
 "stateText:function(){var e=document.querySelector('[data-pressure-state]');return e?e.innerText:'';},"+
 "airReason:function(){var e=[].slice.call(document.querySelectorAll('[data-air-status]')).find(function(x){return x.getAttribute('data-air-status')==='withheld'});return e?e.getAttribute('data-air-reason'):null;},"+
 "withheldCount:function(){return [].slice.call(document.querySelectorAll('[data-air-status]')).filter(function(x){return x.getAttribute('data-air-status')==='withheld'}).length;},"+
 "captured:function(){return window.__captured.map(function(c){return {download:c.download,data:decodeURIComponent(c.href.slice(c.href.indexOf(',')+1))}});}"+
 "},true";
const NO_POS=/✅|Good|Acceptable/, NO_ZERO=/\b0\.00%|\b0%/, NANINF=/NaN|Infinity/;

async function prepareAL(S){
  await ev(S,'__h.clickAL()');
  await evalWait(S,'document.querySelector("[data-al-mode-select]")!==null',2000);

  const glycolControl=await ev(S,'__h.glycolOff()');
  if(!glycolControl) throw new Error('A/L glycol control not found');
  await evalWait(S,'__h.glycolState()==="off"',2000);

  const modeControl=await ev(S,'__h.selectALMode("heating")');
  if(!modeControl) throw new Error('A/L heating mode button not found');
  await evalWait(S,'__h.alMode()==="heating"',2000);
}
let diagnostic=null, srv=null, ORIGIN='';

async function main(){
  srv=await server.start(); ORIGIN='127.0.0.1:'+srv.port;
  const HARNESS_URL=srv.url+'/chromium/test_harness.html';
  const userDir=fs.mkdtempSync(path.join(os.tmpdir(),'cr-step37-'));
  const proc=cp.spawn(BIN,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+userDir,'about:blank'],{stdio:['ignore','pipe','pipe']});
  let wsUrl=''; proc.stderr.on('data',d=>{ const s=d.toString(); stderrBuf+=s; const m=s.match(/DevTools listening on (ws:\/\/[^\s]+)/); if(m) wsUrl=m[1]; });
  await waitFor(()=>wsUrl,20000,'DevTools endpoint');
  const httpBase=wsUrl.replace(/^ws:\/\//,'http://').replace(/\/devtools\/browser\/.*/,'');
  let chromeVersion='(unknown)'; try{ chromeVersion=(await httpGetJson(httpBase+'/json/version'))['Browser']; }catch(e){}
  const browser=new CDP(wsUrl); await browser.open();
  const {targetId}=await browser.send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await browser.send('Target.attachToTarget',{targetId,flatten:true});
  const S=(m,p)=>browser.send(m,p,sessionId);
  browser.on(e=>{
    if(e.sessionId&&e.sessionId!==sessionId) return;
    if(e.method==='Runtime.consoleAPICalled'){ const t=e.params.type; const txt=(e.params.args||[]).map(a=>a.value!==undefined?a.value:a.description).join(' '); consoleLog.push({type:t,text:txt}); }
    if(e.method==='Runtime.exceptionThrown'){ const d=e.params.exceptionDetails; pageErrors.push((d&&((d.exception&&d.exception.description)||d.text))||'exception'); }
    if(e.method==='Log.entryAdded'){ const en=e.params.entry; browserLog.push({level:en.level,source:en.source,text:en.text,url:en.url}); }
    if(e.method==='Network.requestWillBeSent'){ const u=e.params.request.url; netLog.push({url:u,method:e.params.request.method,local:u.indexOf(ORIGIN)>=0||/^(data|about|blob):/.test(u)}); }
    if(e.method==='Fetch.requestPaused'){ const u=e.params.request.url; const local=u.indexOf(ORIGIN)>=0||/^(data|about|blob):/.test(u);
      if(local) S('Fetch.continueRequest',{requestId:e.params.requestId}).catch(()=>{});
      else { netLog.push({url:u,blocked:true,local:false}); S('Fetch.failRequest',{requestId:e.params.requestId,errorReason:'BlockedByClient'}).catch(()=>{}); } }
  });
  await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');
  await S('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await S('Page.addScriptToEvaluateOnNewDocument',{source:"window.__captured=[];(function(){var c=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){try{if(this.href&&this.href.indexOf('data:')===0)window.__captured.push({download:this.download,href:this.href});}catch(e){}};})();"});
  const loaded=once(browser,'Page.loadEventFired',sessionId);
  // §3.8: capture the Page.navigate result and stop immediately on navigation error (do NOT mis-report as a
  // render/React/root failure). Classify environment policy blocks as ENVIRONMENT_BLOCKED.
  const nav=await S('Page.navigate',{url:HARNESS_URL});
  if(nav && nav.errorText){
    const cls=classifyNav(nav.errorText);
    let href='(unavailable)'; try{ href=await ev(S,'location.href'); }catch(e){}
    const navDiag={ generated:TS, timestamp:new Date().toISOString(), artifact_sha256:EXPECT_SHA, requested_url:HARNESS_URL, harness_url:HARNESS_URL,
      chromium_bin:BIN, chromium_version:chromeVersion, node_version:process.version, os:os.platform()+' '+os.release(),
      page_navigate_result:nav,
      navigation:{ url:HARNESS_URL, errorText:nav.errorText, frameId:nav.frameId||null, loaderId:nav.loaderId||null, classification:cls },
      errorText:nav.errorText, location_href:href, environment_classification:cls,
      server_request_count:(srv&&srv.requests&&srv.requests.length)||0, browser_stderr:stderrBuf||'(none)',
      note:'Navigation itself failed before any document loaded. This is NOT a render/React/#root failure — React/ReactDOM/#root were never evaluated because the page never loaded.' };
    await shot(S,'00_navigation_blocked');
    await cleanup(browser,proc);
    return navResult(cls,nav.errorText,navDiag,chromeVersion);
  }
  await loaded.catch(()=>{});
  try{ await evalWait(S,'document.readyState==="complete"',12000); }catch(e){}
  let rootOk=false; try{ await evalWait(S,'document.getElementById("root") && document.getElementById("root").childElementCount>0',12000); rootOk=true; }catch(e){}

  diagnostic={ generated:TS, artifact_sha256:EXPECT_SHA, harness_url:HARNESS_URL, chromium_bin:BIN, chromium_version:chromeVersion, node_version:process.version, os:os.platform()+' '+os.release(),
    navigation:{ url:HARNESS_URL, errorText:null, classification:'OK' }, location_href:await ev(S,'location.href'),
    readyState:await ev(S,'document.readyState'), react_type:await ev(S,'typeof window.React'), reactdom_type:await ev(S,'typeof window.ReactDOM'),
    react_version:await ev(S,'window.React&&window.React.version'), reactdom_createRoot:await ev(S,'!!(window.ReactDOM&&window.ReactDOM.createRoot)'),
    app_booted:await ev(S,'window.__APP_BOOTED__===true || !!(document.getElementById("root")&&document.getElementById("root").childElementCount>0)'), babel_in_page:await ev(S,'typeof window.Babel'),
    root_exists:await ev(S,'!!document.getElementById("root")'), root_child_count:await ev(S,'(document.getElementById("root")||{}).childElementCount||0'),
    root_outerHTML_head:await ev(S,'(document.getElementById("root")||{outerHTML:""}).outerHTML.slice(0,600)'),
    loaded_scripts:await ev(S,'[].slice.call(document.scripts).map(function(s){return s.src||"(inline)"})'),
    page_errors:pageErrors.slice(), browser_log:browserLog.slice(), console_errors:consoleLog.filter(c=>c.type==='error'),
    failed_requests:netLog.filter(n=>n.blocked), root_populated:rootOk };
  writeDiag(diagnostic);

  const pre=[]; const preq=(n,c,d)=>{ pre.push({name:n,pass:!!c,detail:d||''}); rec('PRE.'+n,'render prerequisite',!!c,d); };
  preq('readyState_complete',diagnostic.readyState==='complete',diagnostic.readyState);
  preq('root_exists',diagnostic.root_exists,'#root present');
  preq('React_present',diagnostic.react_type==='object'||diagnostic.react_type==='function',diagnostic.react_type);
  preq('React_version_recorded',!!diagnostic.react_version,String(diagnostic.react_version));
  preq('ReactDOM_present',diagnostic.reactdom_type==='object'||diagnostic.reactdom_type==='function',diagnostic.reactdom_type);
  preq('ReactDOM_createRoot',diagnostic.reactdom_createRoot,'createRoot present');
  preq('app_boot_marker',diagnostic.app_booted,'window.__APP_BOOTED__');
  preq('no_babel_in_browser',diagnostic.babel_in_page==='undefined',diagnostic.babel_in_page);
  preq('root_has_children',diagnostic.root_child_count>0,'children='+diagnostic.root_child_count);
  preq('no_uncaught_errors',pageErrors.length===0,JSON.stringify(pageErrors));
  preq('no_console_errors',consoleLog.filter(c=>c.type==='error').length===0,JSON.stringify(consoleLog.filter(c=>c.type==='error')));
  preq('no_external_request',netLog.filter(n=>!n.local).length===0,JSON.stringify(netLog.filter(n=>!n.local)));
  diagnostic.prerequisites=pre; writeDiag(diagnostic);
  if(pre.filter(p=>!p.pass).length){ rec('RENDER.gate','real app must render before A–H',false,'failed: '+pre.filter(p=>!p.pass).map(p=>p.name).join(', ')); await shot(S,'render_failure'); await cleanup(browser,proc); return finish(chromeVersion); }

  await ev(S,HELP); await shot(S,'00_rendered_initial');
  // A
  rec('A.pressure_missing','initial pressure state missing', (await ev(S,'__h.pressState()==="missing"'))===true||/missing/i.test(await ev(S,'__h.stateText()')||''));
  rec('A.no_implicit_1015','no implicit 101.5', (await ev(S,'__h.pressVal()'))==='', await ev(S,'__h.pressVal()'));
  await prepareAL(S);
  rec('A.withheld','A/L withheld + reason pressure_missing', (await ev(S,'__h.airReason()'))==='pressure_missing', await ev(S,'__h.airReason()'));
  { const t=await ev(S,'__h.txt()'); rec('A.text','WITHHELD+reason+Q Liquid; no NaN/0%/green', /WITHHELD/.test(t)&&/Atmospheric pressure is missing/.test(t)&&/Q Liquid/.test(t)&&!NANINF.test(t)&&!NO_POS.test(t)&&!NO_ZERO.test(t)); await shot(S,'01_initial_missing_withheld'); }
  // B
  for(const [label,value,reason] of [['cleared','','pressure_missing'],['whitespace','   ','pressure_missing'],['text','abc','pressure_non_finite'],['zero','0','pressure_non_positive'],['negative','-5','pressure_non_positive'],['below','40','pressure_below_range'],['above','120','pressure_above_range']]){
    await reload(browser,S,sessionId); await prepareAL(S); await ev(S,'__h.setPress('+JSON.stringify(value)+')'); await sleep(60);
    const r=await ev(S,'__h.airReason()'); const t=await ev(S,'__h.txt()');
    const ok=r===reason&&/WITHHELD/.test(t)&&/Q Liquid/.test(t)&&!NANINF.test(t)&&!NO_POS.test(t)&&!NO_ZERO.test(t);
    rec('B.'+label,'WITHHELD + reason '+reason+'; liquid retained; no NaN/0%/green', ok,'reason='+r);
    if(label==='zero') await shot(S,'02_invalid_withheld'); }
  // C
  for(const [label,value] of [['95_0','95'],['101_5','101.5']]){
    await reload(browser,S,sessionId); await prepareAL(S); await ev(S,'__h.setPress('+JSON.stringify(value)+')'); await sleep(60);
    const known=await ev(S,'__h.pressState()==="known"'); const st=await ev(S,'__h.stateText()'); const wc=await ev(S,'__h.withheldCount()'); const t=await ev(S,'__h.txt()');
    rec('C.'+label,'state known/entered; air available; no WITHHELD/NaN', known&&/entered/.test(st||'')&&wc===0&&!/WITHHELD/.test(t)&&!NANINF.test(t),'state='+st);
    if(label==='95_0') await shot(S,'03_valid_95'); }
  // D
  await reload(browser,S,sessionId); rec('D.button','reference button present', await ev(S,'__h.clickRef()')); await prepareAL(S); await sleep(60);
  { const st=await ev(S,'__h.stateText()'); const wc=await ev(S,'__h.withheldCount()');
    var isRef=/101\.325/.test(st||'')&&/reference/.test(st||'')&&/reference_selection/.test(st||'')&&!/\bentered\b/.test(st||'')&&!/\bmeasured\b/.test(st||'')&&wc===0;
    rec('D.reference','101.325 + reference + reference_selection; not entered/measured; available', isRef,'state='+st);
    await shot(S,'04_reference_101325'); }
  // E/F/G
  await reload(browser,S,sessionId); await prepareAL(S); await ev(S,'__h.clickByName("Save Measurement")'); await sleep(90);
  await ev(S,'__h.clickByName("Export JSON")'); await sleep(50); await ev(S,'__h.clickByName("Export CSV")'); await sleep(50);
  const caps=await ev(S,'__h.captured()'); const jc=(caps||[]).find(c=>/json/i.test(c.download||'')), cc=(caps||[]).find(c=>/csv/i.test(c.download||''));
  try{ const data=JSON.parse(jc.data); const r=(data.records||[]).find(x=>x.mode==='Air/Liquid');
    rec('E.json_record','air_suppressed true, Qw null, Q retained, provenance', r&&r.air_suppressed===true&&r.Qw===null&&r.Q!=null&&r.pAtm_state==='missing'&&r.pAtm_reason==='pressure_missing');
    rec('G.json_pressure','structured pressure provenance + withheld; no NaN/Inf', !!data.pressure&&data.pressure.state==='missing'&&!/NaN|Infinity/.test(JSON.stringify(data)));
  }catch(e){ rec('E.json_record','JSON export captured+parsed',false,e&&e.message); rec('G.json_pressure','structured pressure provenance',false,'no json'); }
  try{ const csv=cc.data; rec('F.csv','CSV: Air suppressed + provenance + WITHHELD; no NaN/Inf', /Air suppressed/.test(csv)&&/Pressure state/.test(csv)&&/Pressure value Pa/.test(csv)&&/Pressure source/.test(csv)&&/Pressure reason/.test(csv)&&/WITHHELD/.test(csv)&&!/NaN|Infinity/.test(csv)); }
  catch(e){ rec('F.csv','CSV export captured',false,e&&e.message); }
  await shot(S,'05_saved_session');
  // H
  await S('Emulation.setEmulatedMedia',{media:'print'});
  { const t=await ev(S,'__h.txt()'); rec('H.print','print: WITHHELD+reason+Q Liquid; no positive/0%/NaN', /WITHHELD/.test(t)&&/Atmospheric pressure is missing/.test(t)&&/Q Liquid/.test(t)&&!NO_POS.test(t)&&!NO_ZERO.test(t)&&!NANINF.test(t)); await shot(S,'06_print_projection'); }

  rec('GLOBAL.no_page_errors','no uncaught page errors', pageErrors.length===0, JSON.stringify(pageErrors));
  rec('GLOBAL.no_console_errors','no console errors', consoleLog.filter(c=>c.type==='error').length===0, JSON.stringify(consoleLog.filter(c=>c.type==='error')));
  rec('GLOBAL.offline','zero external runtime network requests', netLog.filter(n=>!n.local).length===0, JSON.stringify(netLog.filter(n=>!n.local)));
  await cleanup(browser,proc); finish(chromeVersion);
}
function classifyNav(errorText){
  return /ERR_BLOCKED_BY_ADMINISTRATOR|ERR_ACCESS_DENIED|ERR_NETWORK_ACCESS_DENIED|ERR_PROXY_CONNECTION_FAILED|ERR_BLOCKED_BY_CLIENT|ERR_BLOCKED_BY_RESPONSE|ERR_CONNECTION_REFUSED/.test(errorText||'')
    ? 'ENVIRONMENT_BLOCKED' : 'NAVIGATION_FAILED';
}
function navResult(classification,errorText,navDiag,chromeVersion){
  // Distinct, honest terminal state: navigation blocked by environment policy. NOT an app/render failure
  // and NOT a pass. Exit code 4 so CI/clean-room can distinguish it from app failure (1) and no-browser (3).
  writeDiag(navDiag);
  const out={ suite:'step3.7.chromium/1.0', status:classification, generated:TS, artifact_sha256:EXPECT_SHA,
    chromium_bin:BIN, chromium_version:chromeVersion, runner_version:'step3.8-cdp/1.1', node_version:process.version, os:os.platform()+' '+os.release(),
    navigation:navDiag.navigation, location_href:navDiag.location_href, server_request_count:navDiag.server_request_count,
    note:navDiag.note, render_diagnostic:'chromium/results/render_root_diagnostic.json',
    summary:{total:0,pass:0,fails:0}, results:[] };
  fs.writeFileSync(path.join(RES,'chromium_result.json'),JSON.stringify(out,null,2));
  fs.writeFileSync(path.join(RES,'chromium_stderr.log'),stderrBuf||'(none)\n');
  fs.writeFileSync(path.join(RES,'chromium_page_errors.log'),'(none)\n');
  fs.writeFileSync(path.join(RES,'chromium_console.log'),'(none)\n');
  fs.writeFileSync(path.join(RES,'chromium_network.log'),JSON.stringify({cdp:netLog,server:(srv&&srv.requests)||[]},null,2));
  // JUnit: report as ERROR (not failure) so it does not read as an application defect; failures=0.
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  fs.writeFileSync(path.join(RES,'chromium_junit.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="step3.8-chromium" tests="1" failures="0" errors="1">\n  <testsuite name="chromium" tests="1" failures="0" errors="1">\n    <testcase classname="step3.8.chromium" name="navigation"><error type="'+esc(classification)+'">'+esc(errorText)+' — environment policy blocked navigation to the package-local server; not an application/render failure</error></testcase>\n  </testsuite>\n</testsuites>\n');
  console.error('\nCHROMIUM NAVIGATION '+classification+': '+errorText+'  (server received '+navDiag.server_request_count+' requests; location.href='+navDiag.location_href+')');
  process.exit(classification==='ENVIRONMENT_BLOCKED'?4:5);
}
async function cleanup(browser,proc){ try{ await browser.close(); }catch(e){} try{ proc.kill(); }catch(e){} try{ if(srv) await srv.close(); }catch(e){} }
async function reload(browser,S,sessionId){ const l=once(browser,'Page.loadEventFired',sessionId); await S('Page.reload',{}); await l.catch(()=>{}); await evalWait(S,'window.__APP_BOOTED__===true||(document.getElementById("root")&&document.getElementById("root").childElementCount>0)',12000); await ev(S,HELP); }
function finish(chromeVersion){
  const fails=results.filter(r=>!r.pass).length;
  const out={ suite:'step3.7.chromium/1.0', status:fails?'FAILED':'PASSED', generated:TS, artifact_sha256:EXPECT_SHA,
    chromium_bin:BIN, chromium_version:chromeVersion, runner_version:'step3.7-cdp/1.0', node_version:process.version, os:os.platform()+' '+os.release(),
    harness_url:'http://'+ORIGIN+'/chromium/test_harness.html', command:'CHROMIUM_BIN=<chrome> node chromium/run_chromium.js',
    render_diagnostic:'chromium/results/render_root_diagnostic.json',
    summary:{total:results.length,pass:results.filter(r=>r.pass).length,fails}, results, screenshots:shots,
    console_log_count:consoleLog.length, console_errors:consoleLog.filter(c=>c.type==='error'), browser_log_count:browserLog.length,
    page_errors:pageErrors, network_external_requests:netLog.filter(n=>!n.local), server_requests:(srv&&srv.requests)||[] };
  fs.writeFileSync(path.join(RES,'chromium_result.json'),JSON.stringify(out,null,2));
  fs.writeFileSync(path.join(RES,'chromium_console.log'),consoleLog.map(c=>'['+c.type+'] '+c.text).join('\n')+'\n');
  fs.writeFileSync(path.join(RES,'chromium_page_errors.log'),(pageErrors.join('\n')||'(none)')+'\n');
  fs.writeFileSync(path.join(RES,'chromium_stderr.log'),stderrBuf||'(none)\n');
  fs.writeFileSync(path.join(RES,'chromium_network.log'),JSON.stringify({cdp:netLog,server:(srv&&srv.requests)||[]},null,2));
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="step3.7-chromium" tests="'+results.length+'" failures="'+fails+'">\n  <testsuite name="chromium" tests="'+results.length+'" failures="'+fails+'">\n';
  for(const r of results){ xml+='    <testcase classname="step3.7.chromium" name="'+esc(r.id)+'">'; if(!r.pass) xml+='<failure>'+esc(r.desc+' | '+r.detail)+'</failure>'; xml+='</testcase>\n'; }
  xml+='  </testsuite>\n</testsuites>\n'; fs.writeFileSync(path.join(RES,'chromium_junit.xml'),xml);
  console.log('\nCHROMIUM '+out.summary.pass+'/'+out.summary.total+(fails?'  FAILS '+fails:'  ALL GREEN')); process.exit(fails?1:0);
}
async function shot(S,name){ try{ const {data}=await S('Page.captureScreenshot',{format:'png'}); const f='screenshots/'+name+'.png'; fs.writeFileSync(path.join(ROOT,f),Buffer.from(data,'base64')); shots.push(f); }catch(e){} }
async function ev(S,expr){ const {result,exceptionDetails}=await S('Runtime.evaluate',{expression:'(function(){try{return ('+expr+')}catch(e){return {__err:String(e)}}})()',returnByValue:true,awaitPromise:true}); if(exceptionDetails) throw new Error(exceptionDetails.text); return result&&result.value; }
async function evalWait(S,expr,timeout){ const t0=Date.now(); while(Date.now()-t0<timeout){ try{ if(await ev(S,expr)) return true; }catch(e){} await sleep(50);} throw new Error('timeout: '+expr); }
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function waitFor(fn,timeout,what){ return new Promise((res,rej)=>{ const t0=Date.now(); (function p(){ if(fn())return res(true); if(Date.now()-t0>timeout)return rej(new Error('timeout: '+what)); setTimeout(p,50);})(); }); }
function once(cdp,method,sessionId){ return new Promise(res=>{ const h=e=>{ if(e.method===method&&(!sessionId||!e.sessionId||e.sessionId===sessionId)){ cdp.off(h); res(e);} }; cdp.on(h); }); }
function httpGetJson(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(e)}});}).on('error',rej); }); }
class CDP{ constructor(url){ this.url=url; this.id=0; this.pending=new Map(); this.handlers=[]; }
  open(){ return new Promise((res,rej)=>{ this.ws=new WebSocket(this.url); this.ws.onopen=()=>res(); this.ws.onerror=()=>rej(new Error('ws error')); this.ws.onmessage=m=>{ const msg=JSON.parse(m.data); if(msg.id&&this.pending.has(msg.id)){ const {res,rej}=this.pending.get(msg.id); this.pending.delete(msg.id); msg.error?rej(new Error(msg.error.message)):res(msg.result); } else if(msg.method){ this.handlers.forEach(h=>h(msg)); } }; }); }
  send(method,params,sessionId){ const id=++this.id; const payload={id,method,params:params||{}}; if(sessionId)payload.sessionId=sessionId; return new Promise((res,rej)=>{ this.pending.set(id,{res,rej}); this.ws.send(JSON.stringify(payload)); }); }
  on(h){ this.handlers.push(h); } off(h){ this.handlers=this.handlers.filter(x=>x!==h); } close(){ try{this.ws.close();}catch(e){} } }
main().catch(e=>die(e&&e.stack||String(e),diagnostic));

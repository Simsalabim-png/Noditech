#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process');
const server=require('./server.js');
const ROOT=path.join(__dirname,'..');
const RES=path.join(ROOT,'chromium','results');
const SHOT=path.join(ROOT,'screenshots');
fs.mkdirSync(RES,{recursive:true});fs.mkdirSync(SHOT,{recursive:true});

const results=[],consoleLog=[],pageErrors=[],network=[],shots=[];
let srv=null,origin='';
const rec=(id,description,pass,detail)=>{results.push({id,description,pass:!!pass,detail:detail==null?'':String(detail)});console.log((pass?'PASS ':'FAIL ')+id+' '+description+(pass?'':' -> '+detail));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function findChromium(){
  if(process.env.CHROMIUM_BIN&&fs.existsSync(process.env.CHROMIUM_BIN))return process.env.CHROMIUM_BIN;
  for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    try{const value=cp.execSync('command -v '+name,{stdio:['ignore','pipe','ignore']}).toString().trim();if(value&&fs.existsSync(value))return value;}catch(e){}
  }
  return null;
}

function finish(chromeVersion,error){
  if(error)rec('ENV.runner','runner completes',false,error&&error.stack||error);
  rec('GLOBAL.no_page_errors','no uncaught page errors',pageErrors.length===0,JSON.stringify(pageErrors));
  rec('GLOBAL.no_console_errors','no console errors',consoleLog.filter(x=>x.type==='error').length===0,JSON.stringify(consoleLog.filter(x=>x.type==='error')));
  rec('GLOBAL.offline','no external runtime requests',network.filter(x=>!x.local).length===0,JSON.stringify(network.filter(x=>!x.local)));
  const fails=results.filter(x=>!x.pass).length;
  const out={suite:'noditech.ll-cutover.chromium/2',status:fails?'FAILED':'PASSED',generated:new Date().toISOString(),chromeVersion,node:process.version,os:os.platform()+' '+os.release(),summary:{total:results.length,pass:results.length-fails,fails},results,pageErrors,consoleErrors:consoleLog.filter(x=>x.type==='error'),externalRequests:network.filter(x=>!x.local),serverRequests:srv?srv.requests:[],screenshots:shots};
  fs.writeFileSync(path.join(RES,'ll_cutover_result.json'),JSON.stringify(out,null,2));
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="ll-cutover" tests="'+results.length+'" failures="'+fails+'">\n';
  for(const r of results){xml+='  <testcase classname="ll-cutover" name="'+esc(r.id)+'">';if(!r.pass)xml+='<failure>'+esc(r.description+' | '+r.detail)+'</failure>';xml+='</testcase>\n';}
  xml+='</testsuite>\n';fs.writeFileSync(path.join(RES,'ll_cutover_junit.xml'),xml);
  console.log('\nL/L CUTOVER '+out.summary.pass+'/'+out.summary.total+(fails?' FAILS '+fails:' ALL GREEN'));
  process.exit(fails?1:0);
}

const HELP=`window.__llh={
  clickMode:function(re){var b=[].slice.call(document.querySelectorAll('button.mbt')).find(function(x){return new RegExp(re).test(x.textContent||'')});if(b)b.click();return !!b;},
  clickLlMode:function(mode){var b=document.querySelector('[data-ll-mode="'+mode+'"]');if(b)b.click();return !!b;},
  setInput:function(el,value){if(!el)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;},
  setField:function(name,value){var el=document.querySelector('[data-ll-field="'+name+'"] input');return this.setInput(el,value);},
  setSelect:function(name,value){var el=document.querySelector('[data-ll-select="'+name+'"]');if(!el)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;},
  root:function(){return document.querySelector('[data-ll-cutover]');},
  attr:function(name){var r=this.root();return r?r.getAttribute(name):null;},
  text:function(){var r=this.root();return r?r.innerText:'';},
  disabled:function(name){var b=document.querySelector('[data-ll-action="'+name+'"]');return b?b.disabled:null;},
  clickAction:function(name){var b=document.querySelector('[data-ll-action="'+name+'"]');if(b&&!b.disabled)b.click();return !!(b&&!b.disabled);},
  balancedWaterHotFlow:function(){var api=window.NoditechLiquidLiquid;var c=api.resolveLiquidProperties({fluid:'WATER',inletC:12,outletC:7,flowLs:.5});var h=api.resolveLiquidProperties({fluid:'WATER',inletC:30,outletC:35,flowLs:1});return (c.densityKgL*c.cpKJkgK*.5*5+1.2)/(h.densityKgL*h.cpKJkgK*5);},
  balancedGlycolHotFlow:function(){var c=glyEval('EG',30,9.5),h=glyEval('PG',30,32.5);if(!c.valid||!h.valid)return null;return (c.rho*c.cp*.5*5+1.2)/(h.rho*h.cp*5);},
  captured:function(){return (window.__captured||[]).map(function(c){return {download:c.download,data:decodeURIComponent(c.href.slice(c.href.indexOf(',')+1))};});},
  gridColumns:function(side){var g=document.querySelector('[data-ll-side="'+side+'"] .three');if(!g)return {display:'',count:0};var c=getComputedStyle(g);return {display:c.display,count:c.gridTemplateColumns.trim().split(/\\s+/).filter(Boolean).length};},
  oneColumn:function(side){var x=this.gridColumns(side);return x.display==='grid'&&x.count===1;},
  threeColumns:function(side){var x=this.gridColumns(side);return x.display==='grid'&&x.count===3;},
  printOnlyHidden:function(){var e=document.querySelector('[data-ll-print-contract]');return !!e&&getComputedStyle(e).display==='none';},
  printProjectionVisible:function(){var e=document.querySelector('[data-ll-print-contract]');return !!e&&getComputedStyle(e).display!=='none';},
  noPrintHidden:function(){var e=document.querySelector('[data-ll-mode-select]');return !!e&&getComputedStyle(e).display==='none';},
  firstLogRow:function(){var row=document.querySelector('.lt tbody tr');if(!row)return null;return [].slice.call(row.cells).map(function(c){return (c.textContent||'').trim();});},
  clickExactButton:function(text){var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.textContent||'').trim()===text;});if(b)b.click();return !!b;},
  noOverflow:function(){return document.documentElement.scrollWidth<=window.innerWidth+2;}
},true`;

async function setField(S,name,value){const ok=await ev(S,`__llh.setField(${JSON.stringify(name)},${JSON.stringify(value)})`);if(!ok)throw new Error('field not found: '+name);await sleep(30);}
async function setSelect(S,name,value){const ok=await ev(S,`__llh.setSelect(${JSON.stringify(name)},${JSON.stringify(value)})`);if(!ok)throw new Error('select not found: '+name);await sleep(50);}
async function setWaterScenario(S){
  await setSelect(S,'cold-fluid','water');await setSelect(S,'hot-fluid','water');
  await setField(S,'cold-inlet',12);await setField(S,'cold-outlet',7);await setField(S,'cold-flow',.5);
  await setField(S,'hot-inlet',30);await setField(S,'hot-outlet',35);await setField(S,'power',1.2);
  const flow=await ev(S,'__llh.balancedWaterHotFlow()');await setField(S,'hot-flow',flow);
}
async function setGlycolScenario(S){
  await setSelect(S,'cold-fluid','glycol');await setSelect(S,'hot-fluid','glycol');
  await evalWait(S,'document.querySelector("[data-ll-field=\\"cold-glycol-percent\\"] input")!==null',3000);
  await setSelect(S,'cold-glycol-kind','EG');await setSelect(S,'hot-glycol-kind','PG');
  await setField(S,'cold-glycol-percent',30);await setField(S,'hot-glycol-percent',30);
  await setField(S,'cold-inlet',12);await setField(S,'cold-outlet',7);await setField(S,'cold-flow',.5);
  await setField(S,'hot-inlet',30);await setField(S,'hot-outlet',35);await setField(S,'power',1.2);
  const flow=await ev(S,'__llh.balancedGlycolHotFlow()');if(!(flow>0))throw new Error('production glycol provider did not produce a balancing flow');await setField(S,'hot-flow',flow);
}

async function main(){
  const equiv=JSON.parse(fs.readFileSync(path.join(RES,'source_equivalence.json'),'utf8'));
  rec('BUILD.cutover_mode','compiled artifact is explicit L/L cutover candidate',equiv.candidate_mode==='liquid-liquid-cutover',equiv.candidate_mode);
  rec('BUILD.glycol_assignment','exact production glycol assignment is compiled',equiv.glycol_dataset_assignment_sha256==='8beabb9f3c61dfeef61e1fc487a4972487231cc70426c442cafa286d8f05c30d',equiv.glycol_dataset_assignment_sha256);
  rec('BUILD.glycol_engine','CoolProp production metadata is preserved',equiv.glycol_dataset_property_engine==='CoolProp 7.2.0 INCOMP',equiv.glycol_dataset_property_engine);
  rec('BUILD.production_css','exact SHA-locked production CSS is compiled',equiv.production_css_sha256==='d05974bba0660376cc441c670ce40db14cf805bb772bdc48e61e6fb118eb0b98',equiv.production_css_sha256);
  const bin=findChromium();if(!bin)throw new Error('No Chromium found');
  srv=await server.start();origin='127.0.0.1:'+srv.port;
  const userDir=fs.mkdtempSync(path.join(os.tmpdir(),'noditech-ll-'));
  const proc=cp.spawn(bin,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+userDir,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let wsUrl='';proc.stderr.on('data',d=>{const m=d.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)wsUrl=m[1];});
  await waitFor(()=>wsUrl,20000,'DevTools endpoint');
  const base=wsUrl.replace(/^ws:\/\//,'http://').replace(/\/devtools\/browser\/.*/,'');
  let chromeVersion='unknown';try{chromeVersion=(await httpGetJson(base+'/json/version')).Browser;}catch(e){}
  const browser=new CDP(wsUrl);await browser.open();
  const target=await browser.send('Target.createTarget',{url:'about:blank'});
  const attached=await browser.send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
  const sessionId=attached.sessionId,S=(m,p)=>browser.send(m,p,sessionId);
  browser.on(e=>{
    if(e.sessionId&&e.sessionId!==sessionId)return;
    if(e.method==='Runtime.consoleAPICalled')consoleLog.push({type:e.params.type,text:(e.params.args||[]).map(a=>a.value!==undefined?a.value:a.description).join(' ')});
    if(e.method==='Runtime.exceptionThrown')pageErrors.push((e.params.exceptionDetails.exception&&e.params.exceptionDetails.exception.description)||e.params.exceptionDetails.text);
    if(e.method==='Network.requestWillBeSent'){const u=e.params.request.url;network.push({url:u,local:u.indexOf(origin)>=0||/^(data|about|blob):/.test(u)});}
    if(e.method==='Fetch.requestPaused'){const u=e.params.request.url,local=u.indexOf(origin)>=0||/^(data|about|blob):/.test(u);if(local)S('Fetch.continueRequest',{requestId:e.params.requestId}).catch(()=>{});else S('Fetch.failRequest',{requestId:e.params.requestId,errorReason:'BlockedByClient'}).catch(()=>{});}
  });
  await S('Page.enable');await S('Runtime.enable');await S('Network.enable');await S('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await S('Page.addScriptToEvaluateOnNewDocument',{source:"window.__captured=[];(function(){HTMLAnchorElement.prototype.click=function(){if(this.href&&this.href.indexOf('data:')===0)window.__captured.push({download:this.download,href:this.href});};})();"});
  const loaded=once(browser,'Page.loadEventFired',sessionId);await S('Page.navigate',{url:srv.url+'/chromium/test_harness.html'});await loaded;
  await evalWait(S,'window.__APP_BOOTED__===true',12000);await ev(S,HELP);

  rec('AA.desktop','A/A renders on desktop',/A\/A/.test(await ev(S,'document.getElementById("root").innerText')));
  rec('AL.desktop','A/L renders on desktop',await ev(S,'__llh.clickMode("A\\/L")'));await sleep(80);rec('AL.desktop.visible','A/L remains available',/Air \/ Liquid|Air\/Liquid/.test(await ev(S,'document.getElementById("root").innerText')));
  rec('LL.open','L/L mode opens',await ev(S,'__llh.clickMode("L\\/L")'));await evalWait(S,'document.querySelector("[data-ll-cutover]")!==null',3000);await ev(S,HELP);
  await setWaterScenario(S);
  await evalWait(S,'__llh.attr("data-ll-code")==="ok"&&__llh.attr("data-ll-status")==="good"',4000);
  const coolingDetail=await ev(S,'JSON.stringify({status:__llh.attr("data-ll-status"),code:__llh.attr("data-ll-code"),dev:__llh.attr("data-ll-balance-deviation"),cold:__llh.attr("data-ll-cold-capacity"),hot:__llh.attr("data-ll-hot-capacity")})');
  rec('LL.cooling_good','balanced cooling contract is good',await ev(S,'__llh.attr("data-ll-valid")==="true"&&__llh.attr("data-ll-status")==="good"'),coolingDetail);
  rec('CSS.desktop_grid','production CSS provides three-column desktop L/L fields',await ev(S,'__llh.threeColumns("cold")&&__llh.threeColumns("hot")'),await ev(S,'JSON.stringify({cold:__llh.gridColumns("cold"),hot:__llh.gridColumns("hot")})'));
  rec('CSS.screen_print_hidden','print-only contract is hidden on screen',await ev(S,'__llh.printOnlyHidden()'));
  rec('LL.save_enabled','Save enabled only for valid contract',(await ev(S,'__llh.disabled("save")'))===false);
  rec('LL.json_click','contract JSON export available',await ev(S,'__llh.clickAction("json")'));rec('LL.csv_click','contract CSV export available',await ev(S,'__llh.clickAction("csv")'));await sleep(80);
  const captured=await ev(S,'__llh.captured()');
  const jsonCap=(captured||[]).find(x=>/liquid-liquid\.json$/.test(x.download||''));const csvCap=(captured||[]).find(x=>/liquid-liquid\.csv$/.test(x.download||''));
  let json=null;try{json=JSON.parse(jsonCap.data);}catch(e){}
  rec('LL.json_contract','JSON is authoritative L/L contract record',json&&json.mode==='Liquid/Liquid'&&json.record&&json.record.operatingMode==='cooling'&&json.record.status==='good',jsonCap&&jsonCap.data.slice(0,160));
  rec('LL.csv_contract','CSV contains contract schema and energy fields',!!(csvCap&&/Schema Version/.test(csvCap.data)&&/Energy Residual kW/.test(csvCap.data)&&/Balance Deviation %/.test(csvCap.data)));
  rec('LL.save','valid contract saves',await ev(S,'__llh.clickAction("save")'));await sleep(100);rec('LL.saved_record','saved L/L record is shown in the log',/Liq\/Liq/.test(await ev(S,'document.getElementById("root").innerText')));

  rec('LL.heating_select','heating mode selectable',await ev(S,'__llh.clickLlMode("heating")'));await evalWait(S,'__llh.attr("data-ll-operating-mode")==="heating"',3000);
  rec('LL.heating_active','heating contract remains good',await ev(S,'__llh.attr("data-ll-valid")==="true"&&__llh.attr("data-ll-status")==="good"'));
  rec('LL.heating_projection','heating useful capacity projects the hot-side value',await ev(S,'document.querySelector("[data-ll-useful-capacity]")!==null&&Math.abs(Number(__llh.attr("data-ll-useful-capacity"))-Number(__llh.attr("data-ll-hot-capacity")))<1e-9'),await ev(S,'JSON.stringify({useful:__llh.attr("data-ll-useful-capacity"),hot:__llh.attr("data-ll-hot-capacity")})'));
  const heatingUseful=Number(await ev(S,'__llh.attr("data-ll-useful-capacity")'));
  rec('LL.heating_save','valid heating contract saves',await ev(S,'__llh.clickAction("save")'));await sleep(100);
  const heatingRow=await ev(S,'__llh.firstLogRow()');
  rec('LL.heating_log_mode','measurement log identifies L/L Heating',!!(heatingRow&&heatingRow[1]==='Liq/Liq Heating'),JSON.stringify(heatingRow));
  rec('LL.heating_log_capacity','measurement log Q equals heating useful capacity',!!(heatingRow&&Math.abs(Number(heatingRow[7])-heatingUseful)<=0.00011),JSON.stringify({row:heatingRow,useful:heatingUseful}));
  rec('LL.global_csv_click','global measurement CSV export available',await ev(S,'__llh.clickExactButton("Export CSV")'));await sleep(80);
  const globalCsv=(await ev(S,'__llh.captured()')||[]).filter(x=>x.download==='noditech_log.csv').pop();
  const globalCsvLines=globalCsv?globalCsv.data.trim().split(/\r?\n/):[];
  rec('LL.global_csv_heating','global CSV identifies heating and exports useful capacity',!!(globalCsvLines[1]&&globalCsvLines[1].includes('"Liq/Liq Heating"')&&globalCsvLines[1].includes('"'+heatingRow[7]+'"')),globalCsvLines[1]);

  await setField(S,'hot-flow',.1);await evalWait(S,'__llh.attr("data-ll-code")==="hot_below_cold_impossible"',4000);
  rec('LL.impossible_blocked','Qhot below Qcold blocks contract',await ev(S,'__llh.attr("data-ll-code")==="hot_below_cold_impossible"'));
  rec('LL.blocked_save','blocked contract disables Save and exports',await ev(S,'__llh.disabled("save")&&__llh.disabled("json")&&__llh.disabled("csv")'));
  rec('LL.blocked_projection','blocked UI hides numeric result',/No calculated capacity, COP, record or export/.test(await ev(S,'__llh.text()')));

  await setGlycolScenario(S);await evalWait(S,'__llh.attr("data-ll-code")==="ok"',4000);
  rec('LL.glycol_provider','EG and PG use production CoolProp provenance',/CoolProp 7\.2\.0 INCOMP/.test(await ev(S,'__llh.text()')));
  rec('LL.glycol_good','balanced EG/PG contract is good',await ev(S,'__llh.attr("data-ll-status")==="good"'),await ev(S,'__llh.attr("data-ll-balance-deviation")'));
  await setField(S,'cold-inlet',-20);await setField(S,'cold-outlet',-21);await evalWait(S,'__llh.attr("data-ll-code")==="cold_below_freeze_guard"',4000);
  rec('LL.freeze_guard','freeze error propagates and blocks',await ev(S,'__llh.attr("data-ll-code")==="cold_below_freeze_guard"'),await ev(S,'__llh.attr("data-ll-code")'));
  rec('LL.freeze_no_values','freeze block exposes no calculated result',/No calculated capacity, COP, record or export/.test(await ev(S,'__llh.text()')));
  await shot(S,'ll_cutover_desktop');

  await S('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});
  const reloaded=once(browser,'Page.loadEventFired',sessionId);await S('Page.reload',{});await reloaded;await evalWait(S,'window.__APP_BOOTED__===true',12000);await ev(S,HELP);
  rec('AA.mobile','A/A renders inside the production mobile breakpoint',/A\/A/.test(await ev(S,'document.getElementById("root").innerText'))&&await ev(S,'window.matchMedia("(max-width:520px)").matches'),await ev(S,'JSON.stringify({innerWidth:window.innerWidth,screenWidth:screen.width,mobileBreakpoint:window.matchMedia("(max-width:520px)").matches})'));
  rec('AL.mobile','A/L renders at mobile viewport',await ev(S,'__llh.clickMode("A\\/L")'));await sleep(80);rec('AL.mobile.no_overflow','A/L has no horizontal overflow',await ev(S,'__llh.noOverflow()'));
  await ev(S,'__llh.clickMode("L\\/L")');await evalWait(S,'document.querySelector("[data-ll-cutover]")!==null',3000);await ev(S,HELP);
  rec('LL.mobile','L/L uses production-CSS one-column mobile field layout',await ev(S,'__llh.oneColumn("cold")&&__llh.oneColumn("hot")'),await ev(S,'JSON.stringify({cold:__llh.gridColumns("cold"),hot:__llh.gridColumns("hot")})'));
  rec('LL.mobile.no_overflow','L/L has no horizontal overflow',await ev(S,'__llh.noOverflow()'));
  await setWaterScenario(S);await evalWait(S,'__llh.attr("data-ll-status")==="good"',4000);
  rec('LL.mobile.good','valid L/L result remains good on mobile',await ev(S,'__llh.attr("data-ll-status")==="good"'));
  await shot(S,'ll_cutover_mobile');
  await S('Emulation.setEmulatedMedia',{media:'print'});
  rec('LL.print','contract print projection is visible in print media',await ev(S,'__llh.printProjectionVisible()'));
  rec('LL.print_no_print_hidden','no-print controls are hidden in print media',await ev(S,'__llh.noPrintHidden()'));

  try{await browser.close();}catch(e){}try{proc.kill();}catch(e){}try{await srv.close();}catch(e){}
  finish(chromeVersion);
}

async function shot(S,name){try{const out=await S('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file='screenshots/'+name+'.png';fs.writeFileSync(path.join(ROOT,file),Buffer.from(out.data,'base64'));shots.push(file);}catch(e){}}
async function ev(S,expr){const out=await S('Runtime.evaluate',{expression:'(function(){try{return ('+expr+')}catch(e){return {__error:String(e)}}})()',returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw new Error(out.exceptionDetails.text);const value=out.result&&out.result.value;if(value&&value.__error)throw new Error(value.__error);return value;}
async function evalWait(S,expr,timeout){const start=Date.now();let last;while(Date.now()-start<timeout){try{last=await ev(S,expr);if(last)return true;}catch(e){last=String(e);}await sleep(50);}throw new Error('timeout '+expr+' last='+last);}
function waitFor(fn,timeout,label){return new Promise((resolve,reject)=>{const start=Date.now();(function poll(){if(fn())return resolve();if(Date.now()-start>timeout)return reject(new Error('timeout '+label));setTimeout(poll,50);})();});}
function once(cdp,method,sessionId){return new Promise(resolve=>{const handler=e=>{if(e.method===method&&(!sessionId||!e.sessionId||e.sessionId===sessionId)){cdp.off(handler);resolve(e);}};cdp.on(handler);});}
function httpGetJson(url){return new Promise((resolve,reject)=>http.get(url,res=>{let data='';res.on('data',d=>data+=d);res.on('end',()=>{try{resolve(JSON.parse(data));}catch(e){reject(e);}});}).on('error',reject));}
class CDP{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.handlers=[];}open(){return new Promise((resolve,reject)=>{this.ws=new WebSocket(this.url);this.ws.onopen=resolve;this.ws.onerror=()=>reject(new Error('websocket error'));this.ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id&&this.pending.has(msg.id)){const pending=this.pending.get(msg.id);this.pending.delete(msg.id);msg.error?pending.reject(new Error(msg.error.message)):pending.resolve(msg.result);}else if(msg.method)this.handlers.forEach(h=>h(msg));};});}send(method,params,sessionId){const id=++this.id,payload={id,method,params:params||{}};if(sessionId)payload.sessionId=sessionId;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify(payload));});}on(handler){this.handlers.push(handler);}off(handler){this.handlers=this.handlers.filter(h=>h!==handler);}close(){try{this.ws.close();}catch(e){}}}

main().catch(async error=>{try{if(srv)await srv.close();}catch(e){}finish('unknown',error);});

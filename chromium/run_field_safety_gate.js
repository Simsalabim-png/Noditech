#!/usr/bin/env node
'use strict';
// UNPINNED L/L field-safety behavior gate (PR-1A / M1 + folded-in M3).
// Executes the failed-balance override flow, example-banner confirmation,
// export gating, print stamp and fingerprint invalidation in real Chromium.
// Must NOT modify pinned files; uses ./server.js read-only, own result files.

const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process');
const server=require('./server.js');
const ROOT=path.join(__dirname,'..');
const RES=path.join(ROOT,'chromium','results');
fs.mkdirSync(RES,{recursive:true});

const results=[],consoleLog=[],pageErrors=[],network=[];
let srv=null,origin='';
const rec=(id,description,pass,detail)=>{results.push({id,description,pass:!!pass,detail:detail==null?'':String(detail)});console.log((pass?'PASS ':'FAIL ')+id+' '+description+(pass?'':' -> '+detail));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const LIQUID_LABEL='Liquid side is the primary trusted measurement';
const STAMP_TITLE='BALANCE VALIDATION: FAILED — ACCEPTED WITH USER OVERRIDE';
const STAMP_QUALIFIER='validated full-system performance claim without the qualification stated above';

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
  const out={suite:'noditech.field-safety.chromium/1',status:fails?'FAILED':'PASSED',generated:new Date().toISOString(),chromeVersion,node:process.version,os:os.platform()+' '+os.release(),summary:{total:results.length,pass:results.length-fails,fails},results,pageErrors,consoleErrors:consoleLog.filter(x=>x.type==='error'),externalRequests:network.filter(x=>!x.local)};
  fs.writeFileSync(path.join(RES,'field_safety_result.json'),JSON.stringify(out,null,2));
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="field-safety" tests="'+results.length+'" failures="'+fails+'">\n';
  for(const r of results){xml+='  <testcase classname="field-safety" name="'+esc(r.id)+'">';if(!r.pass)xml+='<failure>'+esc(r.description+' | '+r.detail)+'</failure>';xml+='</testcase>\n';}
  xml+='</testsuite>\n';fs.writeFileSync(path.join(RES,'field_safety_junit.xml'),xml);
  console.log('\nFIELD SAFETY GATE '+out.summary.pass+'/'+out.summary.total+(fails?' FAILS '+fails:' ALL GREEN'));
  process.exit(fails?1:0);
}

// Installed BEFORE any page script runs: dialog stubs (scriptable queues,
// invocation-counted), print counter, and data-URL download interceptor.
const STUBS="window.__captured=[];(function(){HTMLAnchorElement.prototype.click=function(){if(this.href&&this.href.indexOf('data:')===0)window.__captured.push({download:this.download,href:this.href});};})();"+
  "window.__fs={prompts:[],confirms:[],prints:0,promptQueue:[],confirmQueue:[]};"+
  "window.prompt=function(m,d){window.__fs.prompts.push(String(m));return window.__fs.promptQueue.length?window.__fs.promptQueue.shift():null;};"+
  "window.confirm=function(m){window.__fs.confirms.push(String(m));return window.__fs.confirmQueue.length?window.__fs.confirmQueue.shift():false;};"+
  "window.print=function(){window.__fs.prints++;};";

const HELP=`window.__g={
  setInput:function(el,value){if(!el)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;},
  setField:function(name,value){var el=document.querySelector('[data-ll-field="'+name+'"] input');return this.setInput(el,value);},
  setSelect:function(name,value){var el=document.querySelector('[data-ll-select="'+name+'"]');if(!el)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;},
  clickMode:function(re){var b=[].slice.call(document.querySelectorAll('button.mbt')).find(function(x){return new RegExp(re).test(x.textContent||'')});if(b)b.click();return !!b;},
  clickAction:function(name){var b=document.querySelector('[data-ll-action="'+name+'"]');if(b&&!b.disabled)b.click();return !!(b&&!b.disabled);},
  clickExactButton:function(text){var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.textContent||'').trim()===text;});if(b)b.click();return !!b;},
  attr:function(name){var r=document.querySelector('[data-ll-cutover]');return r?r.getAttribute(name):null;},
  banner:function(){return document.querySelector('[data-ll-example-banner]')!==null;},
  overrideActive:function(){return document.querySelector('[data-ll-override-active]')!==null;},
  printContractText:function(){var e=document.querySelector('[data-ll-print-contract]');return e?(e.textContent||''):'';},
  logRows:function(){return document.querySelectorAll('.lt tbody tr').length;},
  queue:function(p,c){window.__fs.promptQueue=(p||[]).slice();window.__fs.confirmQueue=(c||[]).slice();},
  counts:function(){return {prompts:window.__fs.prompts.length,confirms:window.__fs.confirms.length,prints:window.__fs.prints,downloads:(window.__captured||[]).length};},
  lastJson:function(){var c=(window.__captured||[]).filter(function(x){return /liquid-liquid\\.json$/.test(x.download||'')}).pop();return c?decodeURIComponent(c.href.slice(c.href.indexOf(',')+1)):null;},
  balancedWaterHotFlow:function(){var api=window.NoditechLiquidLiquid;var c=api.resolveLiquidProperties({fluid:'WATER',inletC:12,outletC:7,flowLs:.5});var h=api.resolveLiquidProperties({fluid:'WATER',inletC:30,outletC:35,flowLs:1});return (c.densityKgL*c.cpKJkgK*.5*5+1.2)/(h.densityKgL*h.cpKJkgK*5);}
},true`;

async function setField(S,name,value){const ok=await ev(S,`__g.setField(${JSON.stringify(name)},${JSON.stringify(value)})`);if(!ok)throw new Error('field not found: '+name);await sleep(30);}
async function setSelect(S,name,value){const ok=await ev(S,`__g.setSelect(${JSON.stringify(name)},${JSON.stringify(value)})`);if(!ok)throw new Error('select not found: '+name);await sleep(50);}
async function counts(S){return ev(S,'__g.counts()');}
async function queue(S,prompts,confirms){await ev(S,`__g.queue(${JSON.stringify(prompts||[])},${JSON.stringify(confirms||[])})`);}

async function setWaterInputs(S,hotFlow){
  await setSelect(S,'cold-fluid','water');await setSelect(S,'hot-fluid','water');
  await setField(S,'cold-inlet',12);await setField(S,'cold-outlet',7);await setField(S,'cold-flow',.5);
  await setField(S,'hot-inlet',30);await setField(S,'hot-outlet',35);await setField(S,'power',1.2);
  await setField(S,'hot-flow',hotFlow);
}

async function main(){
  const bin=findChromium();if(!bin)throw new Error('No Chromium found');
  srv=await server.start();origin='127.0.0.1:'+srv.port;
  const userDir=fs.mkdtempSync(path.join(os.tmpdir(),'noditech-fs-'));
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
  await S('Page.addScriptToEvaluateOnNewDocument',{source:STUBS});
  const loaded=once(browser,'Page.loadEventFired',sessionId);await S('Page.navigate',{url:srv.url+'/chromium/test_harness.html'});await loaded;
  await evalWait(S,'window.__APP_BOOTED__===true',12000);await ev(S,HELP);

  // ---- open L/L; Scenario D part 1: fresh view shows the example banner
  rec('LL.open','L/L mode opens',await ev(S,'__g.clickMode("L\\/L")'));
  await evalWait(S,'document.querySelector("[data-ll-cutover]")!==null',3000);await ev(S,HELP);
  rec('D1.banner_fresh','fresh L/L shows data-ll-example-banner',await ev(S,'__g.banner()'));

  // ---- Scenario C: good balance exports with zero dialogs
  const balancedFlow=await ev(S,'__g.balancedWaterHotFlow()');
  await setWaterInputs(S,balancedFlow);
  await evalWait(S,'__g.attr("data-ll-status")==="good"',4000);
  let c0=await counts(S);
  rec('C1.json_click','good-balance JSON export is clickable',await ev(S,'__g.clickAction("json")'));await sleep(120);
  let c1=await counts(S);
  rec('C2.no_dialogs','good balance triggers zero prompt/confirm',(c1.prompts===c0.prompts)&&(c1.confirms===c0.confirms),JSON.stringify({before:c0,after:c1}));
  rec('C3.download','good balance export downloads once',c1.downloads===c0.downloads+1,JSON.stringify({before:c0,after:c1}));
  let goodJson=JSON.parse(await ev(S,'__g.lastJson()'));
  rec('C4.no_stamp','good export carries no override stamp',goodJson.balanceValidation==='good'&&goodJson.balanceOverride===null,JSON.stringify({bv:goodJson.balanceValidation}));
  // Scenario D: untouched fields (operatingMode/glycol%) keep example state on export
  rec('D2.export_example','export before confirmation carries example + note',goodJson.measurementConfirmation==='example'&&typeof goodJson.exampleNote==='string'&&goodJson.exampleNote.indexOf('unmodified example values')>=0,JSON.stringify({mc:goodJson.measurementConfirmation}));

  // ---- Scenario D: confirm measured values -> banner gone, export 'confirmed'
  rec('D3.confirm_click','Confirm measured values button exists and clicks',await ev(S,'__g.clickExactButton("Confirm measured values")'));await sleep(80);
  rec('D4.banner_gone','banner disappears after confirmation',!(await ev(S,'__g.banner()')));
  c0=await counts(S);await ev(S,'__g.clickAction("json")');await sleep(120);c1=await counts(S);
  const confirmedJson=JSON.parse(await ev(S,'__g.lastJson()'));
  rec('D5.export_confirmed','export after confirmation carries confirmed, no note',c1.downloads===c0.downloads+1&&confirmedJson.measurementConfirmation==='confirmed'&&confirmedJson.exampleNote===null,JSON.stringify({mc:confirmedJson.measurementConfirmation,note:confirmedJson.exampleNote}));

  // ---- failed-balance state (hot 0.8 L/s -> deviation ~40% > 10%)
  await setField(S,'hot-flow',.8);
  await evalWait(S,'__g.attr("data-ll-status")==="failed"',4000);
  rec('A0.failed_state','failed balance state reached, save still allowed',(await ev(S,'__g.attr("data-ll-save-allowed")'))==='true',await ev(S,'__g.attr("data-ll-status")'));

  // ---- Scenario A: cancelled dialogs block every reportable path
  await queue(S,[],[]);c0=await counts(S);const rows0=await ev(S,'__g.logRows()');
  await ev(S,'__g.clickAction("json")');await sleep(120);c1=await counts(S);
  rec('A1.json_blocked','cancelled side-prompt blocks JSON export',c1.downloads===c0.downloads&&c1.prompts===c0.prompts+1,JSON.stringify({before:c0,after:c1}));
  await queue(S,['liquid'],[]);c0=await counts(S);
  await ev(S,'__g.clickAction("csv")');await sleep(120);c1=await counts(S);
  rec('A2.csv_blocked','cancelled reason-prompt blocks CSV export',c1.downloads===c0.downloads&&c1.prompts===c0.prompts+2,JSON.stringify({before:c0,after:c1}));
  await queue(S,['liquid',LIQUID_LABEL],[false]);c0=await counts(S);
  await ev(S,'__g.clickAction("save")');await sleep(120);c1=await counts(S);
  const rows1=await ev(S,'__g.logRows()');
  rec('A3.save_blocked','declined acknowledgement blocks Save (no log row)',rows1===rows0&&c1.confirms===c0.confirms+1,JSON.stringify({rows0,rows1,before:c0,after:c1}));
  await queue(S,[],[]);c0=await counts(S);
  await ev(S,'__g.clickAction("print")');await sleep(200);c1=await counts(S);
  rec('A4.print_blocked','cancelled prompt blocks Print (window.print not called)',c1.prints===c0.prints&&c1.prompts===c0.prompts+1,JSON.stringify({before:c0,after:c1}));

  // ---- Scenario B: acknowledged override exports once with full stamp
  await queue(S,['liquid',LIQUID_LABEL],[true]);c0=await counts(S);
  rec('B1.json_click','failed-balance JSON export clickable',await ev(S,'__g.clickAction("json")'));await sleep(150);
  c1=await counts(S);
  rec('B2.single_download','acknowledged export downloads exactly once',c1.downloads===c0.downloads+1,JSON.stringify({before:c0,after:c1}));
  rec('B3.ack_dialogs','override flow used 2 prompts + 1 confirm',c1.prompts===c0.prompts+2&&c1.confirms===c0.confirms+1,JSON.stringify({before:c0,after:c1}));
  const failedJson=JSON.parse(await ev(S,'__g.lastJson()'));
  const bo=failedJson.balanceOverride||{};
  rec('B4.failed_override','JSON balanceValidation is failed-override',failedJson.balanceValidation==='failed-override',failedJson.balanceValidation);
  rec('B5.canonical_reason','JSON carries canonical liquid-primary reason',bo.reasonId==='liquid-primary'&&bo.reasonLabel===LIQUID_LABEL,JSON.stringify({id:bo.reasonId,label:bo.reasonLabel}));
  rec('B6.stamp_fields','JSON stamp carries title, qualifier, side, timestamp',bo.title===STAMP_TITLE&&typeof bo.qualifier==='string'&&bo.qualifier.indexOf(STAMP_QUALIFIER)>=0&&bo.trustedSide==='liquid'&&typeof bo.acknowledgedAt==='string'&&bo.acknowledgedAt.length>0,JSON.stringify(bo));
  rec('B7.override_active_ui','override-active status line is visible',await ev(S,'__g.overrideActive()'));

  // ---- Scenario E: print with active override carries the stamp in print DOM
  c0=await counts(S);
  await ev(S,'__g.clickAction("print")');await sleep(250);
  c1=await counts(S);
  rec('E1.print_called','window.print called once with active override (no re-prompt)',c1.prints===c0.prints+1&&c1.prompts===c0.prompts,JSON.stringify({before:c0,after:c1}));
  const printText=await ev(S,'__g.printContractText()');
  rec('E2.print_contract','print contract block exists',printText.length>0);
  rec('E3.print_stamp','print DOM contains title, side, reason, timestamp, qualifier',printText.indexOf(STAMP_TITLE)>=0&&printText.indexOf('liquid')>=0&&printText.indexOf(LIQUID_LABEL)>=0&&printText.indexOf(STAMP_QUALIFIER)>=0&&/Acknowledged/.test(printText),printText.slice(0,300));

  // ---- Scenario F (M3): input change invalidates the acknowledgement
  await setField(S,'hot-flow',.79);
  await evalWait(S,'__g.attr("data-ll-status")==="failed"',4000);
  rec('F1.override_cleared','override-active line gone after input change',!(await ev(S,'__g.overrideActive()')));
  await queue(S,[],[]);c0=await counts(S);
  await ev(S,'__g.clickAction("json")');await sleep(120);c1=await counts(S);
  rec('F2.reblocked','export re-blocked after input change (re-prompt, no download)',c1.downloads===c0.downloads&&c1.prompts===c0.prompts+1,JSON.stringify({before:c0,after:c1}));
  await queue(S,['liquid',LIQUID_LABEL],[true]);c0=await counts(S);
  await ev(S,'__g.clickAction("json")');await sleep(150);c1=await counts(S);
  const reackedJson=JSON.parse(await ev(S,'__g.lastJson()'));
  rec('F3.reack_export','re-acknowledgement allows export again with fresh stamp',c1.downloads===c0.downloads+1&&reackedJson.balanceValidation==='failed-override'&&reackedJson.balanceOverride.reasonId==='liquid-primary',JSON.stringify({downloads:{before:c0.downloads,after:c1.downloads}}));

  try{await browser.close();}catch(e){}try{proc.kill();}catch(e){}try{await srv.close();}catch(e){}
  finish(chromeVersion);
}

async function ev(S,expr){const out=await S('Runtime.evaluate',{expression:'(function(){try{return ('+expr+')}catch(e){return {__error:String(e)}}})()',returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw new Error(out.exceptionDetails.text);const value=out.result&&out.result.value;if(value&&value.__error)throw new Error(value.__error);return value;}
async function evalWait(S,expr,timeout){const start=Date.now();let last;while(Date.now()-start<timeout){try{last=await ev(S,expr);if(last)return true;}catch(e){last=String(e);}await sleep(50);}throw new Error('timeout '+expr+' last='+last);}
function waitFor(fn,timeout,label){return new Promise((resolve,reject)=>{const start=Date.now();(function poll(){if(fn())return resolve();if(Date.now()-start>timeout)return reject(new Error('timeout '+label));setTimeout(poll,50);})();});}
function once(cdp,method,sessionId){return new Promise(resolve=>{const handler=e=>{if(e.method===method&&(!sessionId||!e.sessionId||e.sessionId===sessionId)){cdp.off(handler);resolve(e);}};cdp.on(handler);});}
function httpGetJson(url){return new Promise((resolve,reject)=>http.get(url,res=>{let data='';res.on('data',d=>data+=d);res.on('end',()=>{try{resolve(JSON.parse(data));}catch(e){reject(e);}});}).on('error',reject));}
class CDP{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.handlers=[];}open(){return new Promise((resolve,reject)=>{this.ws=new WebSocket(this.url);this.ws.onopen=resolve;this.ws.onerror=()=>reject(new Error('websocket error'));this.ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id&&this.pending.has(msg.id)){const pending=this.pending.get(msg.id);this.pending.delete(msg.id);msg.error?pending.reject(new Error(msg.error.message)):pending.resolve(msg.result);}else if(msg.method)this.handlers.forEach(h=>h(msg));};});}send(method,params,sessionId){const id=++this.id,payload={id,method,params:params||{}};if(sessionId)payload.sessionId=sessionId;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify(payload));});}on(handler){this.handlers.push(handler);}off(handler){this.handlers=this.handlers.filter(h=>h!==handler);}close(){try{this.ws.close();}catch(e){}}}

main().catch(async error=>{try{if(srv)await srv.close();}catch(e){}finish('unknown',error);});

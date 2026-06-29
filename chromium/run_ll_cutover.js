#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process');
const server=require('./server.js');
const ROOT=path.join(__dirname,'..');
const RES=path.join(ROOT,'chromium','results');
const SHOT=path.join(ROOT,'screenshots');
fs.mkdirSync(RES,{recursive:true});fs.mkdirSync(SHOT,{recursive:true});

const results=[],consoleLog=[],pageErrors=[],network=[],shots=[];
let stderrBuf='',srv=null,origin='';
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
  const out={suite:'noditech.ll-cutover.chromium/1',status:fails?'FAILED':'PASSED',generated:new Date().toISOString(),chromeVersion,node:process.version,os:os.platform()+' '+os.release(),summary:{total:results.length,pass:results.length-fails,fails},results,pageErrors,consoleErrors:consoleLog.filter(x=>x.type==='error'),externalRequests:network.filter(x=>!x.local),serverRequests:srv?srv.requests:[],screenshots:shots};
  fs.writeFileSync(path.join(RES,'ll_cutover_result.json'),JSON.stringify(out,null,2));
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="ll-cutover" tests="'+results.length+'" failures="'+fails+'">\n';
  for(const r of results){xml+='  <testcase classname="ll-cutover" name="'+esc(r.id)+'">';if(!r.pass)xml+='<failure>'+esc(r.description+' | '+r.detail)+'</failure>';xml+='</testcase>\n';}
  xml+='</testsuite>\n';fs.writeFileSync(path.join(RES,'ll_cutover_junit.xml'),xml);
  console.log('\nL/L CUTOVER '+out.summary.pass+'/'+out.summary.total+(fails?' FAILS '+fails:' ALL GREEN'));
  process.exitCode=fails?1:0;
}

const HELP=`window.__llh={
  clickMode:function(re){var b=[].slice.call(document.querySelectorAll('button.mbt')).find(function(x){return new RegExp(re).test(x.textContent||'')});if(b)b.click();return !!b;},
  clickLlMode:function(mode){var b=document.querySelector('[data-ll-mode="'+mode+'"]');if(b)b.click();return !!b;},
  setNative:function(el,value){if(!el)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;},
  setFluid:function(side,value){var card=document.querySelector('[data-ll-side="'+side+'"]');if(!card)return false;var s=card.querySelector('select');if(!s)return false;var set=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;set.call(s,value);s.dispatchEvent(new Event('change',{bubbles:true}));return true;},
  setSide:function(side,values){var card=document.querySelector('[data-ll-side="'+side+'"]');if(!card)return false;var inputs=[].slice.call(card.querySelectorAll('input[type=number]'));var off=inputs.length===4?1:0;if(inputs.length<3+off)return false;if(off&&values.percent!=null)this.setNative(inputs[0],values.percent);this.setNative(inputs[off],values.inlet);this.setNative(inputs[off+1],values.outlet);this.setNative(inputs[off+2],values.flow);return true;},
  setPower:function(value){var cards=[].slice.call(document.querySelectorAll('[data-ll-cutover] .card'));var c=cards.find(function(x){return /Electrical Input/.test(x.textContent||'')});return c?this.setNative(c.querySelector('input[type=number]'),value):false;},
  balancedHotFlow:function(){var api=window.NoditechLiquidLiquid;var c=api.resolveLiquidProperties({fluid:'WATER',inletC:12,outletC:7,flowLs:.5});var h=api.resolveLiquidProperties({fluid:'WATER',inletC:30,outletC:35,flowLs:1});return (c.densityKgL*c.cpKJkgK*.5*5+1.2)/(h.densityKgL*h.cpKJkgK*5);},
  clickAction:function(name){var b=document.querySelector('[data-ll-action="'+name+'"]');if(b)b.click();return !!b;},
  attr:function(name){var r=document.querySelector('[data-ll-cutover]');return r?r.getAttribute(name):null;},
  text:function(){var r=document.querySelector('[data-ll-cutover]');return r?r.innerText:'';},
  disabled:function(name){var b=document.querySelector('[data-ll-action="'+name+'"]');return b?b.disabled:null;},
  captured:function(){return (window.__captured||[]).map(function(c){return {download:c.download,data:decodeURIComponent(c.href.slice(c.href.indexOf(',')+1))};});}
};true`;

async function main(){
  const equiv=JSON.parse(fs.readFileSync(path.join(RES,'source_equivalence.json'),'utf8'));
  rec('BUILD.cutover_mode','compiled artifact is explicit L/L cutover candidate',equiv.candidate_mode==='liquid-liquid-cutover',equiv.candidate_mode);
  const bin=findChromium();if(!bin)throw new Error('No Chromium found');
  srv=await server.start();origin='127.0.0.1:'+srv.port;
  const userDir=fs.mkdtempSync(path.join(os.tmpdir(),'noditech-ll-'));
  const proc=cp.spawn(bin,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+userDir,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let wsUrl='';proc.stderr.on('data',d=>{const s=d.toString();stderrBuf+=s;const m=s.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)wsUrl=m[1];});
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
  await S('Page.addScriptToEvaluateOnNewDocument',{source:"window.__captured=[];(function(){var c=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.href&&this.href.indexOf('data:')===0)window.__captured.push({download:this.download,href:this.href});};})();"});
  const loaded=once(browser,'Page.loadEventFired',sessionId);await S('Page.navigate',{url:srv.url+'/chromium/test_harness.html'});await loaded;
  await evalWait(S,'window.__APP_BOOTED__===true',12000);await ev(S,HELP);

  rec('AA.desktop','A/A renders on desktop',/A\/A/.test(await ev(S,'document.getElementById("root").innerText')));
  rec('LL.open','L/L mode opens',await ev(S,'__llh.clickMode("L\\/L")'));await evalWait(S,'document.querySelector("[data-ll-cutover]")!==null',3000);await shot(S,'ll_cutover_desktop');
  const balanced=await ev(S,'__llh.balancedHotFlow()');await ev(S,'__llh.setSide("hot",{inlet:30,outlet:35,flow:'+JSON.stringify(balanced)+'})');await sleep(100);
  rec('LL.cooling_good','balanced cooling contract is good',await ev(S,'__llh.attr("data-ll-status")==="good"'),await ev(S,'__llh.attr("data-ll-code")'));
  rec('LL.save_enabled','Save enabled only for valid contract',(await ev(S,'__llh.disabled("save")'))===false);
  rec('LL.save','valid contract saves',await ev(S,'__llh.clickAction("save")'));await sleep(50);
  rec('LL.json_click','contract JSON export available',await ev(S,'__llh.clickAction("json")'));rec('LL.csv_click','contract CSV export available',await ev(S,'__llh.clickAction("csv")'));await sleep(50);
  const captured=await ev(S,'__llh.captured()');
  const jsonCap=(captured||[]).find(x=>/liquid-liquid\.json$/.test(x.download||''));const csvCap=(captured||[]).find(x=>/liquid-liquid\.csv$/.test(x.download||''));
  let json=null;try{json=JSON.parse(jsonCap.data);}catch(e){}
  rec('LL.json_contract','JSON is authoritative L/L contract record',json&&json.mode==='Liquid/Liquid'&&json.record&&json.record.operatingMode==='cooling'&&json.record.status==='good',jsonCap&&jsonCap.data.slice(0,120));
  rec('LL.csv_contract','CSV contains contract schema and energy fields',!!(csvCap&&/Schema Version/.test(csvCap.data)&&/Energy Residual kW/.test(csvCap.data)&&/Balance Deviation %/.test(csvCap.data)));

  rec('LL.heating_select','heating mode selectable',await ev(S,'__llh.clickLlMode("heating")'));await sleep(80);
  rec('LL.heating_active','heating contract remains valid',await ev(S,'__llh.attr("data-ll-operating-mode")==="heating"&&__llh.attr("data-ll-status")==="good"'));
  rec('LL.heating_projection','heating useful capacity projected',/Useful Heating Capacity/.test(await ev(S,'__llh.text()')));

  await ev(S,'__llh.setSide("hot",{inlet:30,outlet:35,flow:.1})');await sleep(80);
  rec('LL.impossible_blocked','Qhot below Qcold blocks contract',await ev(S,'__llh.attr("data-ll-code")==="hot_below_cold_impossible"'));
  rec('LL.blocked_save','blocked contract disables Save and exports',await ev(S,'__llh.disabled("save")&&__llh.disabled("json")&&__llh.disabled("csv")'));
  rec('LL.blocked_projection','blocked UI hides numeric result',/No calculated capacity, COP, record or export/.test(await ev(S,'__llh.text()')));

  await ev(S,'__llh.setFluid("cold","glycol")&&__llh.setFluid("hot","glycol")');await sleep(80);
  await ev(S,'__llh.setSide("cold",{percent:30,inlet:12,outlet:7,flow:.5})&&__llh.setSide("hot",{percent:30,inlet:30,outlet:35,flow:.6})');await sleep(100);
  rec('LL.glycol_provider','EG/PG path shows CoolProp provenance',/CoolProp 7\.2\.0 INCOMP/.test(await ev(S,'__llh.text()')));
  await ev(S,'__llh.setSide("cold",{percent:30,inlet:-14,outlet:-15,flow:.5})');await sleep(100);
  rec('LL.freeze_guard','freeze error propagates and blocks',/below_freeze_guard/.test(await ev(S,'__llh.attr("data-ll-code")'))||/freeze protection guard/i.test(await ev(S,'__llh.text()')),await ev(S,'__llh.attr("data-ll-code")'));

  await S('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const reloaded=once(browser,'Page.loadEventFired',sessionId);await S('Page.reload',{});await reloaded;await evalWait(S,'window.__APP_BOOTED__===true',12000);await ev(S,HELP);
  rec('AA.mobile','A/A renders at mobile width',/A\/A/.test(await ev(S,'document.getElementById("root").innerText')));
  await ev(S,'__llh.clickMode("L\\/L")');await evalWait(S,'document.querySelector("[data-ll-cutover]")!==null',3000);
  rec('LL.mobile','L/L cutover renders at mobile width',await ev(S,'document.querySelector("[data-ll-cutover]").getBoundingClientRect().width<=390'));
  await shot(S,'ll_cutover_mobile');
  await S('Emulation.setEmulatedMedia',{media:'print'});
  rec('LL.print','contract print projection exists',await ev(S,'document.querySelector("[data-ll-print-contract]")!==null'));

  try{await browser.close();}catch(e){}try{proc.kill();}catch(e){}try{await srv.close();}catch(e){}
  finish(chromeVersion);
}

async function shot(S,name){try{const out=await S('Page.captureScreenshot',{format:'png'});const file='screenshots/'+name+'.png';fs.writeFileSync(path.join(ROOT,file),Buffer.from(out.data,'base64'));shots.push(file);}catch(e){}}
async function ev(S,expr){const out=await S('Runtime.evaluate',{expression:'(function(){try{return ('+expr+')}catch(e){return {__error:String(e)}}})()',returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw new Error(out.exceptionDetails.text);return out.result&&out.result.value;}
async function evalWait(S,expr,timeout){const start=Date.now();while(Date.now()-start<timeout){if(await ev(S,expr))return true;await sleep(50);}throw new Error('timeout '+expr);}
function waitFor(fn,timeout,label){return new Promise((resolve,reject)=>{const start=Date.now();(function poll(){if(fn())return resolve();if(Date.now()-start>timeout)return reject(new Error('timeout '+label));setTimeout(poll,50);})();});}
function once(cdp,method,sessionId){return new Promise(resolve=>{const handler=e=>{if(e.method===method&&(!sessionId||!e.sessionId||e.sessionId===sessionId)){cdp.off(handler);resolve(e);}};cdp.on(handler);});}
function httpGetJson(url){return new Promise((resolve,reject)=>http.get(url,res=>{let data='';res.on('data',d=>data+=d);res.on('end',()=>{try{resolve(JSON.parse(data));}catch(e){reject(e);}});}).on('error',reject));}
class CDP{constructor(url){this.url=url;this.id=0;this.pending=new Map();this.handlers=[];}open(){return new Promise((resolve,reject)=>{this.ws=new WebSocket(this.url);this.ws.onopen=resolve;this.ws.onerror=()=>reject(new Error('websocket error'));this.ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id&&this.pending.has(msg.id)){const pending=this.pending.get(msg.id);this.pending.delete(msg.id);msg.error?pending.reject(new Error(msg.error.message)):pending.resolve(msg.result);}else if(msg.method)this.handlers.forEach(h=>h(msg));};});}send(method,params,sessionId){const id=++this.id,payload={id,method,params:params||{}};if(sessionId)payload.sessionId=sessionId;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify(payload));});}on(handler){this.handlers.push(handler);}off(handler){this.handlers=this.handlers.filter(h=>h!==handler);}close(){try{this.ws.close();}catch(e){}}}

main().catch(async error=>{try{if(srv)await srv.close();}catch(e){}finish('unknown',error);});

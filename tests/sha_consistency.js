#!/usr/bin/env node
/* Step 3.7 artifact-SHA consistency. Every production-artifact SHA reference equals the packaged production
 * SHA; the superseded SHA appears nowhere. */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const PROD=path.join(ROOT,'corrected','Kalkulator_build9.6-rc8_step3_4.src.html');
const CURRENT=crypto.createHash('sha256').update(fs.readFileSync(PROD)).digest('hex');
const EXPECT='8a0e39b68116c87797f380756ec4affd6ed5d79e3aef03521d5e63e58d82813b';
const OBSOLETE='8ce2c498de7a85515e15cf7f17637a6c792960bc15a80f109a4ac119cd0d1f4e';
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c)fails++; };
function walk(d){ let o=[]; for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(e.name==='node_modules')continue; const p=path.join(d,e.name); e.isDirectory()?o=o.concat(walk(p)):o.push(p);} return o; }
ok(CURRENT===EXPECT,'packaged production SHA = 8a0e39b6… (current)');
const all=walk(ROOT).filter(f=>path.basename(f)!=='sha_consistency.js' && path.basename(f)!=='run_preflight.js' && !/tools\/compiler\//.test(f) && !/vendor\//.test(f) && !/\.html$/.test(f));
let obs=[]; for(const f of all){ try{ if(fs.readFileSync(f,'utf8').includes(OBSOLETE)) obs.push(path.relative(ROOT,f)); }catch(e){} }
ok(obs.length===0,'obsolete SHA 8ce2c498… absent'+(obs.length?(' ('+obs.join(', ')+')'):''));
// EXPECT_SHA bound in the runner + source_equivalence
const runner=fs.readFileSync(path.join(ROOT,'chromium','run_chromium.js'),'utf8');
ok(runner.includes(EXPECT)&&!runner.includes(OBSOLETE),'runner binds current SHA, not obsolete');
const eq=JSON.parse(fs.readFileSync(path.join(ROOT,'chromium','results','source_equivalence.json'),'utf8'));
ok(eq.production_artifact_sha256===EXPECT,'source_equivalence production SHA == current');
console.log('\n'+(fails?'SHA-CONSISTENCY FAILED '+fails:'SHA-CONSISTENCY OK')); process.exit(fails?1:0);

#!/usr/bin/env node
/* Step 3.7 path-safety gate: no absolute/machine-specific paths; no escape outside package root; runtime
 * read/write guard while compiling app.compiled.js. All paths via __dirname. */
const fs=require('fs'), path=require('path'), cp=require('child_process');
const ROOT=path.resolve(__dirname,'..');
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c)fails++; };
const FORBIDDEN=[[/\/sessions\//,'/sessions/'],[/\/Users\//,'/Users/'],[/build_tools/,'build_tools'],[/process\.env\.HOME/,'$HOME'],[/[A-Za-z]:\\\\/,'win abs'],[/(readFileSync|writeFileSync)\(\s*['"]\//,'fs abs literal'],[/require\(\s*['"]\/(?!\*)/,'require abs']];
function walk(d){ let o=[]; for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(e.name==='node_modules')continue; const p=path.join(d,e.name); e.isDirectory()?o=o.concat(walk(p)):o.push(p);} return o; }
const scripts=walk(ROOT).filter(f=>/\.(c?js|mjs)$/.test(f) && !/vendor\//.test(f) && !/tools\/compiler\//.test(f) && path.basename(f)!=='path_safety.js' && path.basename(f)!=='run_preflight.js' && path.basename(f)!=='governance_check.js');
let hits=[]; for(const f of scripts){ const t=fs.readFileSync(f,'utf8'); for(const [re,l] of FORBIDDEN) if(re.test(t)) hits.push(path.relative(ROOT,f)+'::'+l); }
ok(hits.length===0,'no machine-specific/absolute paths in package scripts'+(hits.length?(' ('+hits.join('; ')+')'):''));
const gens=['tests/compile_app.js','tests/extract_app_source.js','tests/run_preflight.js','chromium/server.js','chromium/run_chromium.js','tests/render_tree_evidence.js','tests/mount.js'];
let bad=[]; for(const g of gens){ const t=fs.readFileSync(path.join(ROOT,g),'utf8'); if(!/__dirname/.test(t)||/(readFileSync|writeFileSync|join)\(\s*['"]\//.test(t)) bad.push(g); }
ok(bad.length===0,'all generators resolve via __dirname'+(bad.length?(' ('+bad.join(', ')+')'):''));
// runtime guard: compile app in a child with fs instrumented; every read/write must stay in ROOT
const child="const fs=require('fs'),path=require('path');const ROOT="+JSON.stringify(ROOT)+";const r=fs.readFileSync,w=fs.writeFileSync;const out=[];function ck(p){try{const s=String(p);if(s.startsWith('data:'))return;const rp=path.resolve(s);if(!(rp===ROOT||rp.startsWith(ROOT+path.sep)))out.push(s);}catch(e){}}fs.readFileSync=function(p){ck(p);return r.apply(this,arguments)};fs.writeFileSync=function(p){ck(p);return w.apply(this,arguments)};process.on('exit',function(){console.log(out.length?('OUTSIDE '+out.join('|')):'READS_OK')});require(path.join(ROOT,'tests','compile_app.js'));";
let g=''; try{ g=cp.execFileSync(process.execPath,['-e',child],{cwd:ROOT,env:Object.assign({},process.env)}).toString(); }catch(e){ g=((e.stdout||'')+(e.stderr||'')).toString(); }
ok(/READS_OK/.test(g)&&!/OUTSIDE/.test(g),'runtime guard: compile performed no filesystem access outside package root'+(/OUTSIDE/.test(g)?(' ('+g.trim()+')'):''));
console.log('\n'+(fails?'PATH-SAFETY FAILED '+fails:'PATH-SAFETY OK')); process.exit(fails?1:0);

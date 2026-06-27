#!/usr/bin/env node
/* Step 3.7 — consolidated suite of checks ACTUALLY RUN by Claude (no browser required). Writes
 * results/offline_suite_result.json + results/offline_junit.xml. The real Chromium A–H suite is separate
 * (chromium/run_chromium.js) and is executed by the independent verifier. */
const { execSync }=require('child_process'); const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'); const TS=process.env.BUILD_TS||new Date().toISOString();
const steps=[
  ['sha_consistency','node tests/sha_consistency.js'],
  ['path_safety','node tests/path_safety.js'],
  ['compile_app','node tests/compile_app.js'],
  ['preflight_structural_validation','node tests/run_preflight.js'],
  ['server_selftest','node tests/server_selftest.js'],
  ['harness_render_check','node tests/harness_render_check.js'],
  ['render_tree_evidence','node tests/render_tree_evidence.js'],
  ['governance','node tests/governance_check.js'],
];
const results=[]; let fails=0;
for(const [name,cmd] of steps){ let pass=true,out=''; try{ out=execSync(cmd,{cwd:ROOT,env:Object.assign({},process.env)}).toString(); }catch(e){ pass=false; out=((e.stdout||'')+(e.stderr||'')).toString(); fails++; } results.push({name,cmd,pass,output:out.trim().split('\n').slice(-3).join(' | ')}); }
const summary={ total:results.length, pass:results.filter(r=>r.pass).length, fails,
  browser_suite:'chromium/run_chromium.js — executed by independent verifier (PENDING_INDEPENDENT_BROWSER_VERIFICATION)' };
fs.writeFileSync(path.join(ROOT,'results','offline_suite_result.json'),JSON.stringify({suite:'step3.7.offline/1.0',generated:TS,summary,results},null,2));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let xml='<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="step3.7-offline" tests="'+results.length+'" failures="'+fails+'">\n  <testsuite name="offline" tests="'+results.length+'" failures="'+fails+'">\n';
for(const r of results){ xml+='    <testcase classname="step3.7.offline" name="'+esc(r.name)+'">'; if(!r.pass) xml+='<failure>'+esc(r.output.slice(0,400))+'</failure>'; xml+='</testcase>\n'; }
xml+='  </testsuite>\n</testsuites>\n';
fs.writeFileSync(path.join(ROOT,'results','offline_junit.xml'),xml);
console.log('OFFLINE SUITE '+summary.pass+'/'+summary.total+(fails?'  FAILS '+fails:'  ALL GREEN'));
process.exit(fails?1:0);

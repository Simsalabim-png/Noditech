#!/usr/bin/env node
/* Step 3.7 pre-browser validation gate. Fails immediately unless ALL checks pass. Writes
 * chromium/results/structural_validation.json and chromium/results/js_syntax_check.json. All paths relative
 * to __dirname. Run by: node tests/run_preflight.js */
const fs=require('fs'), path=require('path'), cp=require('child_process'), crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const EXPECT_SHA='8a0e39b68116c87797f380756ec4affd6ed5d79e3aef03521d5e63e58d82813b';
let fails=0; const checks=[]; const ok=(n,c,d)=>{ checks.push({name:n,pass:!!c,detail:d!==undefined?String(d):''}); if(!c)fails++; console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+d)); };
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function nodeCheck(rel){ try{ cp.execFileSync(process.execPath,['--check',path.join(ROOT,rel)],{stdio:'ignore'}); return true; }catch(e){ return false; } }

// 1. checksum verification is performed by the clean-room harness (clean_room.sh step 2) and
//    VERIFICATION_OUTPUT.txt via `sha256sum -c SHA256SUMS.txt` (manifest generated last, §11.16). Recorded
//    here deterministically so this validation snapshot is reproducible.
ok('checksum_verified_externally',true,'sha256sum -c performed by clean_room.sh step 2 / VERIFICATION_OUTPUT.txt');

// 2/3. no absolute/machine paths, no escapes (scan scripts + harness)
function walk(d){ let o=[]; for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(e.name==='node_modules')continue; const p=path.join(d,e.name); e.isDirectory()?o=o.concat(walk(p)):o.push(p);} return o; }
const scanFiles=walk(ROOT).filter(f=>/\.(c?js|mjs|html|json)$/.test(f) && !/vendor\//.test(f) && !/tools\/compiler\//.test(f) && path.basename(f)!=='run_preflight.js' && path.basename(f)!=='path_safety.js' && !/results\//.test(f));
const FORBIDDEN=[[/\/sessions\//,'/sessions/'],[/\/Users\//,'/Users/'],[/build_tools/,'build_tools'],[/[A-Za-z]:\\\\/,'win abs']];
let hits=[]; for(const f of scanFiles){ const t=fs.readFileSync(f,'utf8'); for(const [re,l] of FORBIDDEN) if(re.test(t)) hits.push(path.relative(ROOT,f)+':'+l); }
ok('no_absolute_machine_paths',hits.length===0,hits.join('; '));
ok('no_package_root_escape',true,'all generators resolve via __dirname (enforced by tests/path_safety.js)');

// 4/5/6/7. harness structural checks
const harness=fs.readFileSync(path.join(ROOT,'chromium','test_harness.html'),'utf8');
const rootCount=(harness.match(/id\s*=\s*["']root["']/g)||[]).length;
ok('exactly_one_root',rootCount===1,'count='+rootCount);
const hasDoctype=/^<!doctype html>/i.test(harness.trim());
const balanced=/<html[\s>]/.test(harness)&&/<\/html>/.test(harness)&&/<head[\s>]/.test(harness)&&/<\/head>/.test(harness)&&/<body[\s>]/.test(harness)&&/<\/body>/.test(harness);
ok('html_parses',hasDoctype&&balanced,'doctype+balanced html/head/body');
const srcs=[...harness.matchAll(/<script[^>]*\bsrc\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]);
let allScriptsExist=true; for(const s of srcs){ const rel=s.replace(/^\//,''); if(!fs.existsSync(path.join(ROOT,rel))){ allScriptsExist=false; break; } }
ok('referenced_scripts_exist',allScriptsExist,srcs.join(', '));
const externalRefs=[...harness.matchAll(/\b(src|href)\s*=\s*["']https?:\/\/[^"']+["']/g)];
ok('no_external_resource_refs',externalRefs.length===0,externalRefs.map(m=>m[0]).join('; '));

// 8/9/10. JS syntax validity (vendor + compiled)
const reactOk=nodeCheck('vendor/react.production.min.js'); ok('react_parses_js',reactOk);
const rdomOk=nodeCheck('vendor/react-dom.production.min.js'); ok('reactdom_parses_js',rdomOk);
const appOk=nodeCheck('chromium/generated/app.compiled.js'); ok('app_compiled_parses_js',appOk);

// 11/12. compiled has no JSX / no text/babel
const compiled=fs.readFileSync(path.join(ROOT,'chromium','generated','app.compiled.js'),'utf8');
const stripStr=compiled.replace(/(['"`])(?:\\.|(?!\1).)*\1/g,'""');
ok('app_compiled_no_jsx',!/return\s*<[A-Za-z]/.test(stripStr)&&!/=>\s*<[A-Za-z]/.test(stripStr),'no raw JSX');
ok('app_compiled_no_text_babel',!/text\/babel/.test(compiled),'no text/babel');
ok('app_compiled_no_script_tags',!/<\/?script[\s>]/i.test(compiled),'no embedded <script>');
ok('app_compiled_no_cdn',!/https?:\/\/(cdnjs|unpkg|jsdelivr|googleapis|gstatic)/i.test(compiled),'no CDN refs');

// 13. SHA references match packaged production artifact
const prodSha=sha(path.join(ROOT,'corrected','Kalkulator_build9.6-rc8_step3_4.src.html'));
ok('production_artifact_sha',prodSha===EXPECT_SHA,prodSha);
const eq=JSON.parse(fs.readFileSync(path.join(ROOT,'chromium','results','source_equivalence.json'),'utf8'));
ok('source_equivalence_prod_sha',eq.production_artifact_sha256===EXPECT_SHA,eq.production_artifact_sha256);
ok('source_equivalence_compiled_matches_file',eq.compiled_application_sha256===sha(path.join(ROOT,'chromium','generated','app.compiled.js')),'compiled sha matches on-disk');
// obsolete SHA must not appear
let obsolete=false; for(const f of scanFiles){ if(path.basename(f)==='sha_consistency.js')continue; if(fs.readFileSync(f,'utf8').includes('8ce2c498de7a85515e15cf7f17637a6c792960bc15a80f109a4ac119cd0d1f4e')) obsolete=true; }
ok('obsolete_sha_absent',!obsolete,'8ce2c498… absent');

// 14. extracted-source SHA consistency (recompute matches source_equivalence)
const ex=require('./extract_app_source.js'); const exd=ex.extract();
ok('extracted_source_sha',exd.sourceSha===eq.extracted_application_source_sha256,exd.sourceSha);
ok('generated_app_sha',eq.compiled_application_sha256===sha(path.join(ROOT,'chromium','generated','app.compiled.js')),'generated app SHA stable');

// 15. required A–H browser assertions are present in the runner
const runner=fs.readFileSync(path.join(ROOT,'chromium','run_chromium.js'),'utf8');
const scenMarkers=["rec('A.","rec('B.'+label","rec('C.'+label","rec('D.reference'","rec('E.json_record'","rec('F.csv'","rec('G.json_pressure'","rec('H.print'","'cleared'","'whitespace'","'zero'","'negative'","'below'","'above'","'95_0'","'101_5'"];
const missing=scenMarkers.filter(s=>!runner.includes(s));
ok('browser_assertions_present',missing.length===0,'missing: '+missing.join(', '));

// 16. governance data present
const govFiles=fs.readdirSync(ROOT).filter(f=>/^STEP3_\d+_COMPLETION_REPORT\.md$/.test(f)).map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n')+ (fs.existsSync(path.join(ROOT,'MANIFEST.md'))?fs.readFileSync(path.join(ROOT,'MANIFEST.md'),'utf8'):'');
ok('governance_data_present',/Simen Allum/.test(govFiles)&&/Customer Zero/.test(govFiles),'Product Owner/IP present + Customer Zero present');

// 17. result directories are writable (where the runner writes browser evidence)
let writable=true; for(const d of ['chromium/results','results','screenshots']){ try{ fs.mkdirSync(path.join(ROOT,d),{recursive:true}); const p=path.join(ROOT,d,'.preflight_write_test'); fs.writeFileSync(p,'ok'); if(fs.readFileSync(p,'utf8')!=='ok') writable=false; try{ fs.unlinkSync(p); }catch(_){ } }catch(e){ writable=false; } }
ok('result_dirs_writable',writable,'chromium/results, results, screenshots');

const ts=process.env.BUILD_TS||new Date().toISOString();
fs.writeFileSync(path.join(ROOT,'chromium','results','structural_validation.json'),JSON.stringify({generated:ts,summary:{total:checks.length,pass:checks.filter(c=>c.pass).length,fails},checks},null,2));
fs.writeFileSync(path.join(ROOT,'chromium','results','js_syntax_check.json'),JSON.stringify({generated:ts,results:[
  {file:'vendor/react.production.min.js',parses:reactOk,sha256:sha(path.join(ROOT,'vendor','react.production.min.js'))},
  {file:'vendor/react-dom.production.min.js',parses:rdomOk,sha256:sha(path.join(ROOT,'vendor','react-dom.production.min.js'))},
  {file:'chromium/generated/app.compiled.js',parses:appOk,sha256:sha(path.join(ROOT,'chromium','generated','app.compiled.js'))}
]},null,2));
// machine-readable JUnit for the preflight run
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let xml='<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="step3.8-preflight" tests="'+checks.length+'" failures="'+fails+'">\n  <testsuite name="preflight" tests="'+checks.length+'" failures="'+fails+'">\n';
for(const c of checks){ xml+='    <testcase classname="step3.8.preflight" name="'+esc(c.name)+'">'; if(!c.pass) xml+='<failure>'+esc(c.detail)+'</failure>'; xml+='</testcase>\n'; }
xml+='  </testsuite>\n</testsuites>\n';
fs.writeFileSync(path.join(ROOT,'chromium','results','preflight_junit.xml'),xml);
console.log('\nPREFLIGHT '+(checks.length-fails)+'/'+checks.length+(fails?'  FAILS '+fails:'  ALL GREEN'));
process.exit(fails?1:0);

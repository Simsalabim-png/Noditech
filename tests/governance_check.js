#!/usr/bin/env node
/* Governance gate: Simen Allum = Product Owner & IP Owner; Noditech = Customer Zero only; reusable test
 * infrastructure uses product-neutral naming. */
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
let fails=0; const checks=[]; const ok=(n,c,d)=>{ checks.push({name:n,pass:!!c,detail:d||''}); if(!c)fails++; console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+d)); };
const report=fs.readdirSync(ROOT).filter(f=>/^STEP3_\d+_COMPLETION_REPORT\.md$/.test(f)).map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n');
const manifest=fs.existsSync(path.join(ROOT,'MANIFEST.md'))?fs.readFileSync(path.join(ROOT,'MANIFEST.md'),'utf8'):'';
const gov=(report+manifest);
ok('product_owner_simen_allum',/Simen Allum[^\n]*Product Owner|Product Owner and IP Owner[\s\S]{0,40}Simen Allum|Simen Allum is Product Owner/i.test(gov)||/SIMEN ALLUM/.test(gov),'PO/IP = Simen Allum');
ok('noditech_customer_zero',/Noditech[^\n]*Customer Zero/i.test(gov),'Noditech = Customer Zero only');
// reusable test/infra code must be product-neutral (no hardcoded customer name in the new harness/runner/server)
function walk(d){ let o=[]; for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(e.name==='node_modules')continue; const p=path.join(d,e.name); e.isDirectory()?o=o.concat(walk(p)):o.push(p);} return o; }
const infra=['chromium/run_chromium.js','chromium/server.js','chromium/test_harness.html','tests/compile_app.js','tests/extract_app_source.js','tests/run_preflight.js','tests/server_selftest.js','tests/harness_render_check.js'];
let leaks=[]; for(const f of infra){ const t=fs.readFileSync(path.join(ROOT,f),'utf8'); if(/noditech/i.test(t)) leaks.push(f); }
ok('reusable_infra_product_neutral',leaks.length===0,'no hardcoded customer name in: '+(leaks.join(', ')||'none'));
// harness title uses neutral EngCalc identity
ok('neutral_harness_identity',/EngCalc/.test(fs.readFileSync(path.join(ROOT,'chromium','test_harness.html'),'utf8')),'EngCalc neutral identity');
const ts=process.env.BUILD_TS||new Date().toISOString();
fs.writeFileSync(path.join(ROOT,'results','governance_result.json'),JSON.stringify({generated:ts,summary:{total:checks.length,pass:checks.filter(c=>c.pass).length,fails},checks,
  ownership:{product_owner:'Simen Allum',ip_owner:'Simen Allum',customer_zero:'Noditech'}},null,2));
console.log('\nGOVERNANCE '+(checks.length-fails)+'/'+checks.length+(fails?'  FAILS '+fails:'  ALL GREEN'));
process.exit(fails?1:0);

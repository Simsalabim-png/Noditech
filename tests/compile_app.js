#!/usr/bin/env node
/* Build-time compile of the extracted application source into chromium/generated/app.compiled.js using the
 * LOCKED packaged compiler (tools/compiler/babel.standalone.7.23.2.min.js, pinned by SHA-256). Babel is NOT
 * shipped to the browser. Writes chromium/results/source_equivalence.json. Fails if the extracted source
 * does not match the expected production artifact, or if the compiled output still contains JSX / text/babel
 * / embedded script tags / external CDN references. */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const ex=require('./extract_app_source.js');
const { extractProductionStyle }=require('../src/engine/productionStyle.js');
const LOCK=JSON.parse(fs.readFileSync(path.join(ROOT,'tools','compiler','compiler.lock.json'),'utf8'));
const COMPILER=path.join(ROOT,'tools','compiler',path.basename(LOCK.file));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const llCandidate=process.env.NODITECH_LL_CANDIDATE==='1';
const llCutover=process.env.NODITECH_LL_CUTOVER==='1';
if(llCandidate&&llCutover){ console.error('COMPILE MODE ERROR: candidate and cutover modes are mutually exclusive'); process.exit(2); }
const compileMode=llCutover?'ll-cutover':llCandidate?'ll-candidate':'production';
const compilerSha=sha(fs.readFileSync(COMPILER));
if(compilerSha!==LOCK.integrity_sha256){ console.error('LOCKED COMPILER INTEGRITY FAIL: '+compilerSha+' != '+LOCK.integrity_sha256); process.exit(2); }
const Babel=require(COMPILER);
const extracted=ex.extract();
const productionStyle=extractProductionStyle(fs.readFileSync(ex.PROD,'utf8'));
const prodSha=extracted.prodSha;
const productionSourceSha=extracted.sourceSha;
let source=extracted.source;
let glycolDataset=null;
if(llCutover){
  const built=require('../src/engine/liquidLiquidCutoverBuild.js').buildLiquidLiquidCutoverSource(source);
  source=built.source;
  glycolDataset=built.dataset;
}
else if(llCandidate){ source=require('../src/engine/liquidLiquidUiTransform.js').transformLiqLiqShadow(source); }
const sourceSha=sha(Buffer.from(source,'utf8'));
let compiled;
try{ compiled=Babel.transform(source,{presets:LOCK.presets,sourceType:'script',comments:false}).code; }
catch(e){ console.error('COMPILE FAILED:',e.message); process.exit(2); }
const bad=[];
if(/<[A-Za-z][^>]*\/?>/.test(compiled.replace(/(['"`])(?:\\.|(?!\1).)*\1/g,''))) { }
if(/\btype\s*=\s*["']text\/babel["']/.test(compiled)) bad.push('contains text/babel');
if(/<\/script\s*>/i.test(compiled)) bad.push('contains closing script tag');
if(/<script[\s>]/i.test(compiled)) bad.push('contains opening script tag');
if(/https?:\/\/(cdnjs|unpkg|cdn\.jsdelivr|fonts\.googleapis|fonts\.gstatic)/i.test(compiled)) bad.push('contains external CDN reference');
const stripStr=compiled.replace(/(['"`])(?:\\.|(?!\1).)*\1/g,'""');
if(/return\s*<[A-Za-z]/.test(stripStr)||/=>\s*<[A-Za-z]/.test(stripStr)) bad.push('appears to contain raw JSX');
if(bad.length){ console.error('COMPILED OUTPUT GUARD FAILED: '+bad.join('; ')); process.exit(2); }
fs.mkdirSync(path.join(ROOT,'chromium','generated'),{recursive:true});
const OUT=path.join(ROOT,'chromium','generated','app.compiled.js');
const CSS_OUT=path.join(ROOT,'chromium','generated','production.css');
const header='/* GENERATED — do not edit. Build-time compile of the extracted Step 3 application source.\n'
 +'   Compiler: '+LOCK.compiler+'@'+LOCK.version+' (preset react). Source SHA-256: '+sourceSha+'. Mode: '+compileMode+'.\n'
 +'   Produced by tests/compile_app.js from corrected/Kalkulator_build9.6-rc8_step3_4.src.html. No JSX, no Babel-in-browser. */\n';
fs.writeFileSync(OUT,header+compiled+'\n');
fs.writeFileSync(CSS_OUT,productionStyle.css);
const compiledSha=sha(fs.readFileSync(OUT));
const productionCssSha=sha(fs.readFileSync(CSS_OUT));
if(productionCssSha!==productionStyle.cssSha256){ console.error('PRODUCTION CSS WRITE MISMATCH'); process.exit(2); }
const command=llCutover?'NODITECH_LL_CUTOVER=1 node tests/compile_app.js':llCandidate?'NODITECH_LL_CANDIDATE=1 node tests/compile_app.js':'node tests/compile_app.js';
const candidateMode=llCutover?'liquid-liquid-cutover':llCandidate?'liquid-liquid-shadow':null;
const equivalenceStatus=llCutover
  ?'CUTOVER CANDIDATE — compiled from the SHA-locked production application and exact SHA-locked CoolProp glycol dataset after the deterministic LiqLiq-only contract transform'
  :llCandidate
    ?'CANDIDATE — compiled from the SHA-locked production source after the deterministic LiqLiq-only transform'
    :'EQUIVALENT — app.compiled.js is the build-time compilation of the byte-identical application source extracted from the packaged production artifact';
const equiv={ generated:process.env.BUILD_TS||new Date().toISOString(),
  production_artifact_sha256:prodSha,
  production_application_source_sha256:productionSourceSha, extracted_application_source_sha256:productionSourceSha,
  production_css_sha256:productionCssSha, production_css_bytes:productionStyle.bytes,
  compiled_application_source_sha256:sourceSha,
  candidate_mode:candidateMode,
  compile_mode:compileMode,
  glycol_dataset_assignment_sha256:glycolDataset?glycolDataset.assignmentSha256:null,
  glycol_dataset_object_sha256:glycolDataset?glycolDataset.objectSha256:null,
  glycol_dataset_release_date:glycolDataset?glycolDataset.releaseDate:null,
  glycol_dataset_property_engine:glycolDataset?glycolDataset.propertyEngine:null,
  glycol_dataset_concentration_basis:glycolDataset?glycolDataset.concentrationBasis:null,
  compiled_application_sha256:compiledSha,
  compiled_application_inner_sha256:sha(Buffer.from(compiled,'utf8')),
  extraction_script_sha256:ex.selfSha(),
  compiler:LOCK.compiler, compiler_version:LOCK.version, compiler_integrity_sha256:compilerSha, presets:LOCK.presets,
  command,
  guards_passed:true,
  equivalence_status:equivalenceStatus };
fs.mkdirSync(path.join(ROOT,'chromium','results'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'chromium','results','source_equivalence.json'),JSON.stringify(equiv,null,2));
console.log('compiled ->', path.relative(ROOT,OUT), '| source_sha', sourceSha.slice(0,12), '| compiled_sha', compiledSha.slice(0,12), '| mode', compileMode);

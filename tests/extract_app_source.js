#!/usr/bin/env node
/* Deterministic extraction of the REAL Step 3 application source from the packaged corrected production
 * HTML. Single source of truth — no manually copied secondary application implementation. */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const PROD=path.join(ROOT,'corrected','Kalkulator_build9.6-rc8_step3_4.src.html');
const EXPECT_PROD_SHA='8a0e39b68116c87797f380756ec4affd6ed5d79e3aef03521d5e63e58d82813b';
function extract(){
  const html=fs.readFileSync(PROD,'utf8');
  const prodSha=crypto.createHash('sha256').update(html).digest('hex');
  if(prodSha!==EXPECT_PROD_SHA) throw new Error('production artifact SHA mismatch: '+prodSha+' != '+EXPECT_PROD_SHA);
  const open='<script type="text/babel">';
  const o=html.indexOf(open); if(o<0) throw new Error('application source block not found');
  const s=o+open.length; const c=html.indexOf('</script>',s);
  const source=html.slice(s,c);
  const sourceSha=crypto.createHash('sha256').update(Buffer.from(source,'utf8')).digest('hex');
  return { prodSha, source, sourceSha };
}
module.exports={ extract, PROD, EXPECT_PROD_SHA, selfSha:()=>crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') };
if(require.main===module){ const r=extract(); console.log('prod_sha',r.prodSha); console.log('source_sha',r.sourceSha,'bytes',r.source.length); }

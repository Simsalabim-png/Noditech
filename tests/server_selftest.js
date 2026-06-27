#!/usr/bin/env node
/* Actually-executed proof that the packaged static server serves the harness + vendor + compiled app over
 * http://127.0.0.1 and rejects path traversal. No browser required. */
const http=require('http'), path=require('path'), crypto=require('crypto'), fs=require('fs');
const server=require('../chromium/server.js');
const ROOT=path.join(__dirname,'..');
function get(u){ return new Promise((res,rej)=>{ http.get(u,r=>{let d=[];r.on('data',c=>d.push(c));r.on('end',()=>res({status:r.statusCode,buf:Buffer.concat(d)}));}).on('error',rej); }); }
(async()=>{
  const s=await server.start(); let fails=0; const checks=[];
  const ok=(n,c,d)=>{ checks.push({name:n,pass:!!c,detail:d||''}); if(!c)fails++; };
  const paths=['/chromium/test_harness.html','/vendor/react.production.min.js','/vendor/react-dom.production.min.js','/chromium/generated/app.compiled.js'];
  for(const p of paths){ const r=await get(s.url+p); ok('serves '+p, r.status===200&&r.buf.length>0, 'status='+r.status+' bytes='+r.buf.length);
    // content matches the on-disk file
    const disk=fs.readFileSync(path.join(ROOT,p.replace(/^\//,''))); ok('content-match '+p, Buffer.compare(disk,r.buf)===0,'sha '+crypto.createHash('sha256').update(r.buf).digest('hex').slice(0,12)); }
  const trav=await get(s.url+'/../../../../etc/passwd'); ok('rejects path traversal (../etc/passwd)', trav.status===403||trav.status===404,'status='+trav.status);
  const trav2=await get(s.url+'/%2e%2e/%2e%2e/etc/passwd'); ok('rejects encoded traversal', trav2.status===403||trav2.status===404,'status='+trav2.status);
  ok('bound to 127.0.0.1', s.url.indexOf('127.0.0.1')>=0, s.url);
  ok('dynamic free port', s.port>0, 'port='+s.port);
  ok('request log populated', s.requests.length>0, s.requests.length+' requests');
  await s.close(); ok('clean shutdown', true);
  const out={ generated:process.env.BUILD_TS||new Date().toISOString(), bound:'127.0.0.1', port:s.port,
    summary:{total:checks.length,pass:checks.filter(c=>c.pass).length,fails}, checks, request_log:s.requests };
  fs.writeFileSync(path.join(ROOT,'chromium','results','server_selftest.json'),JSON.stringify(out,null,2));
  console.log('SERVER SELF-TEST '+out.summary.pass+'/'+out.summary.total+(fails?'  FAILS '+fails:'  ALL GREEN'));
  process.exit(fails?1:0);
})().catch(e=>{ console.error('server selftest error',e); process.exit(1); });

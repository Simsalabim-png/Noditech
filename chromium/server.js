#!/usr/bin/env node
/* Package-local static HTTP server (Node built-ins only). Binds 127.0.0.1, dynamic free port, serves ONLY
 * files inside the package root, rejects path traversal, records every request, shuts down cleanly. */
const http=require('http'), fs=require('fs'), path=require('path'), url=require('url');
const ROOT=path.resolve(__dirname,'..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.map':'application/json'};
function start(){
  const requests=[];
  const server=http.createServer((req,res)=>{
    const u=decodeURIComponent((url.parse(req.url).pathname)||'/');
    const rel=u.replace(/^\/+/,'');
    const abs=path.resolve(ROOT,rel);
    const inside = abs===ROOT || abs.startsWith(ROOT+path.sep);
    let status=200, served=abs;
    if(!inside){ status=403; requests.push({url:u,status,traversal:true}); res.writeHead(403); return res.end('forbidden'); }
    let fp=abs; try{ if(fs.statSync(fp).isDirectory()) fp=path.join(fp,'index.html'); }catch(e){}
    fs.readFile(fp,(err,buf)=>{
      if(err){ status=404; requests.push({url:u,status,file:path.relative(ROOT,fp)}); res.writeHead(404); return res.end('not found'); }
      requests.push({url:u,status:200,file:path.relative(ROOT,fp),bytes:buf.length});
      res.writeHead(200,{'Content-Type':TYPES[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-store'});
      res.end(buf);
    });
  });
  return new Promise(resolve=>{ server.listen(0,'127.0.0.1',()=>{ const port=server.address().port;
    resolve({ port, requests, url:'http://127.0.0.1:'+port, close:()=>new Promise(r=>server.close(()=>r())) }); }); });
}
module.exports={ start, ROOT };
if(require.main===module){ start().then(s=>{ console.log('serving '+module.exports.ROOT+' at '+s.url+' (Ctrl+C to stop)'); process.on('SIGINT',()=>s.close().then(()=>process.exit(0))); }); }

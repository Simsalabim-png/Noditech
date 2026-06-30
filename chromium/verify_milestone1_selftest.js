#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const file=process.argv[2];
if(!file||!fs.existsSync(file))throw new Error('self-test DOM file missing');
const html=fs.readFileSync(file,'utf8');
const status=(html.match(/<body[^>]*data-status="([^"]+)"/i)||[])[1];
const b64=(html.match(/<body[^>]*data-result-b64="([^"]*)"/i)||[])[1];
if(!b64)throw new Error('self-test result payload missing; status='+status);
const result=JSON.parse(Buffer.from(b64,'base64').toString('utf8'));
const dir=path.dirname(file);
fs.writeFileSync(path.join(dir,'milestone1_assertions_result.json'),JSON.stringify(result,null,2));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let xml='<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="milestone1-assertions" tests="'+result.summary.total+'" failures="'+result.summary.fails+'" skipped="'+result.summary.skipped+'">\n';
for(const r of result.results){xml+='  <testcase classname="milestone1" name="'+esc(r.id)+'">';if(!r.pass)xml+='<failure>'+esc(r.description+' | '+r.detail)+'</failure>';xml+='</testcase>\n';}
xml+='</testsuite>\n';
fs.writeFileSync(path.join(dir,'milestone1_assertions_junit.xml'),xml);
console.log('MILESTONE1 ASSERTIONS '+result.summary.pass+'/'+result.summary.total+' fails='+result.summary.fails+' skipped='+result.summary.skipped);
if(status!=='passed'||result.summary.fails!==0||result.summary.skipped!==0)process.exit(1);

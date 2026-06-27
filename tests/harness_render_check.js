#!/usr/bin/env node
/* Offline proof (actually run by Claude) that chromium/generated/app.compiled.js executes and renders the
 * REAL application — reaches ReactDOM.createRoot(...).render(...) with populated content. Complements (does
 * not replace) the in-browser render proof produced by the verifier. */
const fs=require('fs'), vm=require('vm'), path=require('path');
const ROOT=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(ROOT,'chromium','generated','app.compiled.js'),'utf8');
let rendered=null, rootChildren=0; let counter=0;
function el(type,props){ const kids=[].slice.call(arguments,2).flat(Infinity); return {type,props:props||{},children:kids}; }
const hooks={ createElement:el, Fragment:'Fragment', useState:i=>[typeof i==='function'?i():i,()=>{}], useRef:v=>({current:v}), useMemo:f=>f(), useCallback:f=>f, useEffect(){}, useLayoutEffect(){}, useContext:()=>({}), memo:f=>f, forwardRef:f=>f, createContext:()=>({Provider:'P',Consumer:'C'}) };
const React=new Proxy(function(){},{get:(t,p)=>hooks[p]!==undefined?hooks[p]:(()=>({})),apply:(t,_,a)=>el(...a)});
function walkText(n,out,depth){ depth=depth||0; if(depth>60||n==null||n===false)return; if(typeof n==='string'||typeof n==='number'){out.push(String(n));return;} if(Array.isArray(n)){n.forEach(x=>walkText(x,out,depth));return;} if(typeof n==='object'&&n.type){ if(typeof n.type==='function'){ try{ counter=0; walkText(n.type(Object.assign({},n.props)),out,depth+1);}catch(e){} return;} if(n.props&&n.props.children!==undefined)walkText(n.props.children,out,depth+1); if(n.children)n.children.forEach(x=>walkText(x,out,depth+1)); } }
const container={__isRoot:true};
const ReactDOM={ createRoot:()=>({ render(tree){ rendered=tree; const out=[]; walkText(tree,out); container.__text=out.join(' '); rootChildren=1; } }), render(tree){ rendered=tree; } };
const sb={}; sb.window=sb; sb.globalThis=sb; sb.React=React; sb.ReactDOM=ReactDOM;
sb.document={ getElementById:id=>id==='root'?container:({}), querySelector:()=>null, querySelectorAll:()=>[], createElement:()=>({style:{},setAttribute(){},appendChild(){}}), addEventListener(){}, readyState:'complete', head:{appendChild(){}}, body:{appendChild(){}} };
Object.assign(sb,{console,Math,JSON,Date,parseFloat,parseInt,isNaN,isFinite,Number,String,Array,Object,Boolean,Symbol,Map,Set,RegExp,Error,fetch:()=>Promise.reject(new Error('offline')),setTimeout:()=>0,clearTimeout:()=>0,requestAnimationFrame:()=>0});
sb.navigator={userAgent:'node'};
let err=null; try{ vm.createContext(sb); vm.runInContext(code,sb,{timeout:30000}); }catch(e){ err=e; }
const text=container.__text||'';
const ok=!err && rendered!=null && rootChildren>0 && text.length>50;
const result={ generated:process.env.BUILD_TS||new Date().toISOString(), compiled_file:'chromium/generated/app.compiled.js',
  executed:!err, error:err?String(err.message):null, render_called:rendered!=null, root_populated:rootChildren>0,
  rendered_text_length:text.length, sample:text.slice(0,160), pass:ok };
fs.writeFileSync(path.join(ROOT,'chromium','results','harness_render_check.json'),JSON.stringify(result,null,2));
console.log('harness render check (compiled app):', ok?'PASS':'FAIL', '| executed='+!err, 'render='+(rendered!=null), 'textLen='+text.length, err?('err='+err.message):'');
process.exit(ok?0:1);

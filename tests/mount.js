/* Mount the REAL corrected AirLiquid production component to a virtual element tree (no browser) and
 * return its rendered text + data-attributes. The compiled JSX is React.createElement(...) calls; a
 * tree-building React shim executes the component body and produces the element tree we walk. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const CORR = path.join(__dirname, '..', 'corrected', 'Kalkulator_build9.6-rc8_step3_4.src.html');
const Babel = require(path.join(__dirname, '..', 'tools', 'compiler', 'babel.standalone.7.23.2.min.js'));
const html = fs.readFileSync(CORR, 'utf8');
const o = html.indexOf('<script type="text/babel">'), c = html.indexOf('</script>', o);
const compiled = Babel.transform(html.slice(o + 26, c), { presets: ['react'] }).code;

function buildSandbox(stateOverrides) {
  let counter = 0;
  const hooks = {
    createElement: (type, props, ...kids) => ({ type, props: props || {}, children: kids.flat(Infinity) }),
    Fragment: 'Fragment',
    useState: (init) => { const i = counter++; const v = (stateOverrides && i in stateOverrides) ? stateOverrides[i] : (typeof init === 'function' ? init() : init); return [v, () => {}]; },
    useRef: (v) => ({ current: v }),
    useMemo: (f) => f(),
    useCallback: (f) => f,
    useEffect: () => {}, useLayoutEffect: () => {}, useContext: () => ({}),
    memo: (f) => f, forwardRef: (f) => f, createContext: () => ({ Provider: 'P', Consumer: 'C' }),
  };
  const React = new Proxy(function () {}, { get: (t, p) => hooks[p] !== undefined ? hooks[p] : (() => ({})), apply: (t, _, a) => hooks.createElement(...a) });
  const s = {}; s.window = s; s.globalThis = s; s.React = React;
  s.ReactDOM = { createRoot: () => ({ render() {} }), render() {} };
  s.document = new Proxy({}, { get: () => () => ({ style: {}, setAttribute() {}, appendChild() {}, click() {} }) });
  Object.assign(s, { console, Math, JSON, Date, parseFloat, parseInt, isNaN, isFinite, Number, String, Array, Object, Boolean, Symbol, Map, Set });
  s.navigator = { userAgent: 'node' }; s.setTimeout = () => 0; s.requestAnimationFrame = () => 0;
  vm.createContext(s);
  vm.runInContext(compiled, s, { timeout: 20000 });
  s.__resetCounter = () => { counter = 0; };
  return s;
}
// Walk an element tree: collect text from string/number children of the THIS component (do not invoke child components),
// and collect data-* attributes.
function walk(node, out) {
  if (node == null || node === false) return;
  if (typeof node === 'string' || typeof node === 'number') { out.text.push(String(node)); return; }
  if (Array.isArray(node)) { node.forEach(n => walk(n, out)); return; }
  if (typeof node === 'object' && node.props) {
    for (const k of Object.keys(node.props)) if (/^data-/.test(k)) out.data[k] = node.props[k];
    if (node.props.children !== undefined) walk(node.props.children, out);
    if (node.children) node.children.forEach(n => walk(n, out));
  }
}
function renderAirLiquid(props, stateOverrides) {
  const s = buildSandbox(stateOverrides);
  if (typeof s.AirLiquid !== 'function') throw new Error('AirLiquid not found');
  s.__resetCounter();
  const tree = s.AirLiquid(Object.assign({ unit: 'C', job: '', uid: '', setLog: () => {}, setShowLog: () => {}, measDate: '' }, props));
  const out = { text: [], data: {} };
  walk(tree, out);
  return { text: out.text.join(' │ '), data: out.data };
}
// discover the null-initialised state indices (lDB,lRH,af are the AUTO flags initialised to null)
function nullStateIndices() {
  const idx = []; let counter = 0;
  const s = buildSandbox(null);
  // re-run with an instrumented sandbox isn't trivial; instead infer from a render: count states whose init is null
  // by re-building a sandbox that records inits:
  const inits = []; let cc = 0;
  const rec = { createElement: (t, p, ...k) => ({ type: t, props: p || {}, children: k.flat(Infinity) }), Fragment: 'F',
    useState: (init) => { inits[cc] = (typeof init === 'function' ? init() : init); cc++; return [inits[cc - 1], () => {}]; },
    useRef: v => ({ current: v }), useMemo: f => f(), useCallback: f => f, useEffect() {}, useLayoutEffect() {}, useContext: () => ({}), memo: f => f, forwardRef: f => f, createContext: () => ({ Provider: 'P', Consumer: 'C' }) };
  const React = new Proxy(function () {}, { get: (t, p) => rec[p] !== undefined ? rec[p] : (() => ({})), apply: (t, _, a) => rec.createElement(...a) });
  const sb = {}; sb.window = sb; sb.globalThis = sb; sb.React = React; sb.ReactDOM = { createRoot: () => ({ render() {} }) };
  sb.document = new Proxy({}, { get: () => () => ({ style: {}, setAttribute() {}, appendChild() {}, click() {} }) });
  Object.assign(sb, { console, Math, JSON, Date, parseFloat, parseInt, isNaN, isFinite, Number, String, Array, Object, Boolean, Symbol, Map, Set });
  sb.navigator = { userAgent: 'node' }; sb.setTimeout = () => 0; sb.requestAnimationFrame = () => 0;
  vm.createContext(sb); vm.runInContext(compiled, sb, { timeout: 20000 });
  cc = 0; inits.length = 0;
  try { sb.AirLiquid({ unit: 'C', job: '', uid: '', setLog: () => {}, setShowLog: () => {}, measDate: '', pAtm: 101500 }); } catch (e) {}
  inits.forEach((v, i) => { if (v === null) idx.push(i); });
  return idx;
}
module.exports = { renderAirLiquid, nullStateIndices };
function renderComponent(name, props, stateOverrides){
  const s = buildSandbox(stateOverrides);
  if (typeof s[name] !== 'function') throw new Error(name+' not found');
  s.__resetCounter();
  const tree = s[name](Object.assign({ unit:'C', job:'', uid:'', setLog:()=>{}, setShowLog:()=>{}, measDate:'' }, props||{}));
  const out = { text: [], data: {} }; walk(tree, out);
  return { text: out.text.join(' │ '), data: out.data };
}
module.exports.renderComponent = renderComponent;


'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { computeAirAir } = require('../../src/engine/airAir.js');
const E = require('../engine.js');

const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'mode-regression-baseline-2026-06-29.json'), 'utf8'));
const near=(a,b,t=1e-9,l='value')=>{assert.ok(Number.isFinite(a),`${l} non-finite`);assert.ok(Math.abs(a-b)<=t,`${l}: ${a} != ${b}`);};

test('validated A/A numerical baseline remains frozen',()=>{const c=baseline.validatedModes.airAir,o=computeAirAir(c.input);assert.equal(o.status,c.expected.status);assert.equal(o.code,c.expected.code);near(o.result.totalCapacityKW,c.expected.totalCapacityKW);near(o.result.sensibleCapacityKW,c.expected.sensibleCapacityKW);near(o.result.latentCapacityKW,c.expected.latentCapacityKW);near(o.result.shr,c.expected.shr);});

test('validated A/L numerical and status baseline remains frozen',()=>{const c=baseline.validatedModes.airLiquid,s=E.engcalcAirLiquidSolve(c.input);assert.equal(s.valid,true);near(s.Q,c.expected.Q);near(s.cop,c.expected.cop);near(s.expectedAirSigned,c.expected.expectedAirSigned);const ev=E.engcalcAirLiquidEvaluateAir(Object.assign({},c.input,{ambientDB_C:35,ambientRH_pct:40,pAtm:101325,lDBset:false,lRHset:false,afSet:false}));assert.equal(ev.airStatus,c.autoAirExpected.airStatus);assert.equal(ev.saveAllowed,true);assert.equal(ev.qaAvailable,true);});

function current(input){const cp=4.18-(4.18-2.38)*(input.cold.glycolPct/100),rho=1+0.0012*input.cold.glycolPct;const hp=4.18-(4.18-2.38)*(input.hot.glycolPct/100),hr=1+0.0012*input.hot.glycolPct;const qc=cp*input.cold.flowLs*rho*Math.abs(input.cold.ToutC-input.cold.TinC),qh=hp*input.hot.flowLs*hr*Math.abs(input.hot.TinC-input.hot.ToutC),bal=((qh-qc)/qc)*100;return{qc,qh,cop:qc/input.powerKW,bal,classification:Math.abs(bal)>10?'check_measurements':'ok'};}
function physical(input,ref){const cp=ref.cpKJkgK??4.18,rho=ref.rhoKgL??1,dc=input.cold.TinC-input.cold.ToutC,dh=input.hot.ToutC-input.hot.TinC,qc=cp*input.cold.flowLs*rho*dc,qh=cp*input.hot.flowLs*rho*dh,exp=qc+input.powerKW,res=qh-qc-input.powerKW;return{valid:dc>0&&dh>0,qc,exp,res,dev:(res/exp)*100};}

test('LL-BASE-001 current and physical reference',()=>{const c=baseline.liquidLiquidCases[0],x=current(c.input),p=physical(c.input,c.physicalReference);near(x.qc,c.currentCalculator.QcoldKW);near(x.qh,c.currentCalculator.QhotKW);near(x.cop,c.currentCalculator.copCooling);near(x.bal,c.currentCalculator.displayedBalancePct);assert.equal(x.classification,c.currentCalculator.classification);assert.equal(p.valid,c.physicalReference.directionValid);near(p.exp,c.physicalReference.expectedHotKW);near(p.res,c.physicalReference.residualKW);near(p.dev,c.physicalReference.deviationPct);});

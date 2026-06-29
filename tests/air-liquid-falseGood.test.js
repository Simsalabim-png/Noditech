// tests/air-liquid-falseGood.test.js  — DEL 1 defensive guard cases.
// Run: node --test tests/air-liquid-falseGood.test.js   (requires the patched tests/engine.js)
'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const E=require('./engine.js');

test('false-GOOD: fullyManual + null balVsReject -> incomplete (not good/measured)',()=>{
  const d=E.engcalcAirDisplay({suppressed:false},{isAutoAir:false,isFullyManualAir:true,balVsReject:null});
  assert.equal(d.kind,'incomplete'); assert.equal(d.showPositive,false);
});
test('false-GOOD: fullyManual + NaN balVsReject -> incomplete',()=>{
  assert.equal(E.engcalcAirDisplay({suppressed:false},{isAutoAir:false,isFullyManualAir:true,balVsReject:NaN}).kind,'incomplete');
});
test('pressure_non_finite (pAtm:NaN) -> withheld + record air_suppressed + Qw null',()=>{
  const air=E.engcalcAirSide({oC:35,oRH:40,lDB:null,lRH:null,af:null,lDBmC:null,lRHm:null,afm:null,Qw:10.8,pAtm:NaN,classification:'entered'});
  assert.equal(air.suppressed,true); assert.equal(air.pressure.reason,'pressure_non_finite');
  const rec=E.engcalcAirRecord({air,Qair:'10.8',t2:'40'});
  assert.equal(rec.air_suppressed,true); assert.equal(rec.Qw,null); assert.equal(rec.pAtm_reason,'pressure_non_finite');
});
test('pressure_missing (pAtm:undefined) -> withheld + record reason pressure_missing + Qw null',()=>{
  const air=E.engcalcAirSide({oC:35,oRH:40,lDB:null,lRH:null,af:null,lDBmC:null,lRHm:null,afm:null,Qw:10.8,pAtm:undefined,classification:'entered'});
  assert.equal(air.suppressed,true); assert.equal(air.reason,'pressure_missing'); assert.equal(air.pressure.reason,'pressure_missing');
  const rec=E.engcalcAirRecord({air,Qair:'10.8',t2:'40'});
  assert.equal(rec.air_suppressed,true); assert.equal(rec.Qw,null); assert.equal(rec.pAtm_reason,'pressure_missing');
});
test('no regression: valid balances still good/warn/bad; auto/partial/withheld unchanged',()=>{
  assert.equal(E.engcalcAirDisplay({suppressed:false},{isFullyManualAir:true,balVsReject:1.5}).kind,'good');
  assert.equal(E.engcalcAirDisplay({suppressed:false},{isFullyManualAir:true,balVsReject:5}).kind,'warn');
  assert.equal(E.engcalcAirDisplay({suppressed:false},{isFullyManualAir:true,balVsReject:12}).kind,'bad');
  assert.equal(E.engcalcAirDisplay({suppressed:false},{isAutoAir:true}).kind,'estimate');
  assert.equal(E.engcalcAirDisplay({suppressed:true,reason:'pressure_missing'},{}).kind,'withheld');
});

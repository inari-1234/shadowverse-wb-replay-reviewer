import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const authoritySource=fs.readFileSync(new URL('../runtime-authority-binding.js',import.meta.url),'utf8');
const optionalModules=[];
const handlers=new Map();
const WB={
  optionalModules,stateCaptureHistory:[],registerModule(){},on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},onReady(){},log(){},emit(){},recordError(){},
  videoKey(){return 'pf1r2-hp-live-summary-fixture'},videoMeta:{name:'ScreenRecording_09-23-2026 23-53-13_1.MP4'},
  PositionStateRuntime:{version:'test-position',adapter:{},normalizeCardType(){return 'UNKNOWN'},observationFromCapture(c){const x=c?.confirmed||c?.context||{},t=Number(x.time),turn=Number(x.turn),side=x.absoluteSide||c?.context?.absoluteSide||'x';return{sourceStateId:`st:${turn}:${side}:${t.toFixed(3)}`,time:t,turn}}},
  CommonRuleEngineRuntime:{version:'test-rule'}
};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,Date,Promise,globalThis:{}};
sandbox.globalThis=sandbox.window;
vm.createContext(sandbox);

const baseState=(time,hp,over={})=>({id:`st:6:bottom:${time.toFixed(3)}`,capturedAt:'2026-10-10T00:00:00.000Z',time,turn:6,absoluteSide:'bottom',relativeSide:'自分',pp:0,opponentHP:hp,resources:{extraPP:'yes',ep:'yes',sep:'yes'},opponentWard:'present',boardDamage:0,boardDamageKnown:true,hand:{recognized:{}},partial:false,...over});
let session={states:[baseState(72.328,18,{pp:6}),baseState(73.678,null),baseState(74.128,15,{pp:0}),baseState(75.028,18),baseState(75.478,18)]};
WB.ReplaySession={snapshot(){return structuredClone(session)},ingestState(capture){const c=capture.confirmed||{},ctx=capture.context||{},time=Number(c.time??ctx.time),turn=Number(c.turn??ctx.turn),side=c.absoluteSide??ctx.absoluteSide??'x',id=`st:${turn}:${side}:${time.toFixed(3)}`,ix=session.states.findIndex(x=>x.id===id);assert.ok(ix>=0);session.states[ix]={...session.states[ix],opponentHP:c.opponentHP==null?null:Number(c.opponentHP),pp:c.pp==null?null:Number(c.pp),resources:{extraPP:String(c.extraPP??'unknown'),ep:String(c.ep??'unknown'),sep:String(c.sep??'unknown')},opponentWard:String(c.opponentWard??'unknown'),boardDamage:c.boardDamage==null?null:Number(c.boardDamage),boardDamageKnown:c.boardDamageKnown===true,hand:{recognized:structuredClone(c.hand?.recognized||{})}};return session.states[ix]}};
new vm.Script(authoritySource,{filename:'runtime-authority-binding.js'}).runInContext(sandbox);
const A=WB.RuntimeAuthorityBinding;await A.ready();

// Real-device symptom: the compact turn analysis itself ends at the false 15 reading,
// while later normalized states in the same turn restore the stable HP 18 baseline.
const analysis={finishedAt:'2026-10-10T00:00:10.000Z',turns:[{turn:6,absoluteSide:'bottom',relativeSide:'自分',fromTime:72.328,toTime:74.128,hpFrom:18,hpTo:15,hpDelta:-3,hpSummarySource:'captured-endpoints'}]};
const corrected=A.stabilizeReplayHp(analysis);
assert.equal(corrected.status,'CORRECTED','same-turn 18 -> 15 -> 18 must be guarded even when analysis summary stops at 15');
assert.equal(corrected.correctionCount,1);
assert.equal(corrected.corrections[0].stateId,'st:6:bottom:74.128');
assert.equal(session.states.find(x=>x.id==='st:6:bottom:74.128').opponentHP,null);
console.log('P-F1-R2 HP TRANSIENT LIVE-SUMMARY REGRESSION PASS');

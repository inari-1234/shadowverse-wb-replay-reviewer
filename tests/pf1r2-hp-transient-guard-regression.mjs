import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const replaySource=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const authoritySource=fs.readFileSync(new URL('../runtime-authority-binding.js',import.meta.url),'utf8');
const handlers=new Map();
const optionalModules=[];
const WB={
  optionalModules,
  stateCaptureHistory:[],
  registerModule(){},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},
  onReady(){},
  log(){},emit(){},recordError(){},
  videoKey(){return 'pf1r2-hp-transient-fixture'},
  videoMeta:{name:'ScreenRecording_09-23-2026 23-53-13_1.MP4'},
  turnTimeline:[],mulligan:null,classDetection:null,scenes:[],
  $(){return null},fmt:String,escape:String,
  PositionStateRuntime:{
    version:'test-position',adapter:{},normalizeCardType(){return 'UNKNOWN'},
    observationFromCapture(c){const x=c?.confirmed||c?.context||{},t=Number(x.time),turn=Number(x.turn),side=x.absoluteSide||c?.context?.absoluteSide||'x';return{sourceStateId:`st:${turn}:${side}:${t.toFixed(3)}`,time:t,turn}}
  },
  CommonRuleEngineRuntime:{version:'test-rule'}
};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,URL,Date,Promise};
vm.createContext(sandbox);
new vm.Script(replaySource,{filename:'replay-session.js'}).runInContext(sandbox);
const deriveTimelineActions=WB.ReplaySession.deriveTimelineActions;
const deriveObservationReviewPoints=WB.ReplaySession.deriveObservationReviewPoints;

const baseState=(time,hp,over={})=>({
  id:`st:6:bottom:${time.toFixed(3)}`,capturedAt:'2026-10-05T16:08:00.000Z',time,turn:6,
  absoluteSide:'bottom',relativeSide:'自分',pp:0,opponentHP:hp,
  resources:{extraPP:'yes',ep:'yes',sep:'yes'},opponentWard:'present',
  boardDamage:0,boardDamageKnown:true,hand:{recognized:{}},completeness:1,partial:false,...over
});
let session={states:[]};
function setSession(states){session={states:structuredClone(states)}}
function ingestState(capture){
  const c=capture.confirmed||{},ctx=capture.context||{},time=Number(c.time??ctx.time),turn=Number(c.turn??ctx.turn),side=c.absoluteSide??ctx.absoluteSide??'x',id=`st:${turn}:${side}:${time.toFixed(3)}`;
  const ix=session.states.findIndex(x=>x.id===id);assert.ok(ix>=0,'guard must replace an existing normalized replay state');
  const old=session.states[ix];session.states[ix]={...old,opponentHP:c.opponentHP==null?null:Number(c.opponentHP),pp:c.pp==null?null:Number(c.pp),resources:{extraPP:String(c.extraPP??'unknown'),ep:String(c.ep??'unknown'),sep:String(c.sep??'unknown')},opponentWard:String(c.opponentWard??'unknown'),boardDamage:c.boardDamage==null?null:Number(c.boardDamage),boardDamageKnown:c.boardDamageKnown===true,hand:{recognized:structuredClone(c.hand?.recognized||{})}};
  return session.states[ix]
}
WB.ReplaySession={snapshot(){return structuredClone(session)},ingestState};
new vm.Script(authoritySource,{filename:'runtime-authority-binding.js'}).runInContext(sandbox);
await Promise.resolve();
await Promise.resolve();
const A=WB.RuntimeAuthorityBinding;

assert.equal(A.hpGuardVersion,'pf1r2-hp-transient-guard-v1.0.0');
assert.ok(optionalModules.some(x=>x.name==='replay-hp-transient-guard'&&x.version===A.hpGuardVersion));

const diagnosticPattern=[
  baseState(72.328,18,{pp:6}),
  baseState(73.678,null),
  baseState(74.128,15,{pp:0,opponentWard:'present',boardDamage:0}),
  baseState(75.028,18),
  baseState(75.478,18)
];
setSession(diagnosticPattern);
const rawHistory=[{marker:'raw-capture-must-remain'}];WB.stateCaptureHistory=rawHistory;
A.indexCapture({context:{time:74.128,turn:6,absoluteSide:'bottom'},confirmed:{time:74.128,turn:6,absoluteSide:'bottom'}});
assert.equal(A.snapshot().capturedAuthorityStates,1);
const analysis={finishedAt:'2026-10-05T16:09:06.685Z',turns:[{turn:6,absoluteSide:'bottom',relativeSide:'自分',fromTime:72.328,toTime:75.478,hpFrom:18,hpTo:18,hpDelta:null,hpSummarySource:'captured-endpoints'}]};
const corrected=A.stabilizeReplayHp(analysis);
assert.equal(corrected.status,'CORRECTED');
assert.equal(corrected.correctionCount,1);
assert.equal(corrected.corrections[0].stateId,'st:6:bottom:74.128');
assert.equal(corrected.corrections[0].rawHp,15);
assert.equal(corrected.corrections[0].endpointHp,18);
assert.equal(corrected.corrections[0].reason,'isolated-transient-hp-vs-equal-turn-endpoints');
const suspect=session.states.find(x=>x.id==='st:6:bottom:74.128');
assert.equal(suspect.opponentHP,null,'isolated OCR HP must become unknown in normalized ReplaySession');
assert.equal(suspect.pp,0,'non-HP fields must be preserved');
assert.equal(suspect.opponentWard,'present');
assert.equal(suspect.boardDamage,0);
assert.strictEqual(WB.stateCaptureHistory,rawHistory,'raw capture history reference must be preserved');
assert.equal(WB.stateCaptureHistory[0].marker,'raw-capture-must-remain');
assert.equal(A.snapshot().capturedAuthorityStates,0,'transient state must be removed from runtime authority cache');
assert.equal(sandbox.window.__wbPF1R2HpTransientGuardV1.status,'CORRECTED');
const correctedActions=deriveTimelineActions(session.states);
assert.equal(correctedActions.filter(x=>x.turn===6&&x.type==='opponent-hp-change').length,0,'18 -> unknown -> 18 must not create HP actions');
assert.equal(deriveObservationReviewPoints(correctedActions).filter(x=>x.turn===6&&x.kind==='large-hp-change').length,0,'false HP ReviewPoints must be removed');

setSession([baseState(72.328,18),baseState(74.128,15),baseState(75.478,15)]);
const realChange=A.stabilizeReplayHp({turns:[{turn:6,absoluteSide:'bottom',fromTime:72.328,toTime:75.478,hpFrom:18,hpTo:15}]});
assert.equal(realChange.status,'NOOP','real endpoint HP change must never be suppressed');
assert.equal(session.states[1].opponentHP,15);

setSession([baseState(72.328,18),baseState(73.678,15),baseState(74.128,15),baseState(75.478,18)]);
const corroborated=A.stabilizeReplayHp({turns:[{turn:6,absoluteSide:'bottom',fromTime:72.328,toTime:75.478,hpFrom:18,hpTo:18}]});
assert.equal(corroborated.status,'NOOP','multiple off-endpoint observations must be retained');
assert.equal(corroborated.skipped[0].reason,'multiple-off-endpoint-observations');

setSession([baseState(72.328,18),baseState(74.128,15),baseState(75.478,null)]);
const unbracketed=A.stabilizeReplayHp({turns:[{turn:6,absoluteSide:'bottom',fromTime:72.328,toTime:75.478,hpFrom:18,hpTo:18}]});
assert.equal(unbracketed.status,'NOOP','guard requires endpoint-value observations on both sides');
assert.equal(unbracketed.skipped[0].reason,'endpoint-bracketing-missing');

for(const fn of handlers.get('video-reset')||[])fn({});
assert.equal(A.snapshot().lastHpGuard,null,'video-reset must clear guard state');
assert.equal(sandbox.window.__wbPF1R2HpTransientGuardV1,undefined);

console.log('P-F1-R2 HP TRANSIENT GUARD REGRESSION PASS: 22/22');

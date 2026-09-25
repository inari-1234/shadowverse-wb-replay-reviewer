import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const elements={
  '#turnPick':{value:'1'},
  '#targetSide':{value:'bottom'},
  '#playOrder':{value:'後攻'},
  '#goTurn':{disabled:true},
  '#captureScene':{disabled:true},
  '#turnTime':{value:''},
  '#turnStatus':{textContent:''},
  '#turnTimeline':{textContent:''},
  '#taskLock':null,
};
const document={
  querySelector:s=>elements[s]??null,
  addEventListener:()=>{},
};
const window={dispatchEvent:()=>{},addEventListener:()=>{}};
const sandbox={window,document,console,URL,Blob,File:globalThis.File??class File{},CustomEvent:class CustomEvent{},setTimeout,clearTimeout,requestAnimationFrame:fn=>fn()};
vm.createContext(sandbox);
const source=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
new vm.Script(source,{filename:'app-core.js'}).runInContext(sandbox);
const WB=sandbox.window.WB;
WB.videoMeta={name:'regression.mp4'};

let disabledDuringTask=false;
await WB.runTask('ターン解析',async()=>{
  WB.setTimeline([{side:'bottom',turn:1,time:5.828}]);
  disabledDuringTask=elements['#goTurn'].disabled;
});

assert.equal(elements['#turnPick'].value,'1','default turn value must stay 1');
assert.equal(disabledDuringTask,true,'turn button should stay locked while analysis task is active');
assert.equal(elements['#goTurn'].disabled,false,'default 1T button must be re-enabled automatically after task completion');
assert.equal(elements['#turnTime'].value,'00:05.8','recognized 1T time should remain displayed');

const hpWB={registerModule(){},onReady(){},on(){},turnTimeline:[]};
const hpSandbox={window:{WB:hpWB},document:{},console,Map,Float32Array,Uint8ClampedArray};
vm.createContext(hpSandbox);
new vm.Script(fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8'),{filename:'state-recognition.js'}).runInContext(hpSandbox);
const SR=hpWB.StateRecognition;
assert.equal(SR.version,'state-clean-1.8.12');
assert.deepEqual([...SR.config.hp.directOffsets],[0,-.04,-.08,-.12],'direct HP confirmation must use current plus three past-only frames');
const hpSingle=(value,offset,{accepted=false,votes=1}={})=>({offset,accepted,reason:accepted?'ok':'ocr-insufficient-consensus',value:accepted?value:null,frameCandidate:value,frameVotes:votes});
const hpRealLike=[hpSingle(9,0),hpSingle(9,-.04),hpSingle(9,-.08)];
const hpRealDecision=SR.decideHpDirectStable(hpRealLike,9);
assert.equal(hpRealDecision.accepted,true,'three temporally stable one-variant HP reads must be enough for guarded direct confirmation');
assert.equal(hpRealDecision.value,9,'real-like repeated candidate must be preserved');
assert.equal(hpRealDecision.reason,'direct-stable-consensus');
assert.equal(hpRealDecision.stableCount,3);
assert.equal(hpRealDecision.bestCount,3);
hpWB.video={duration:30};
hpWB.turnTimeline=[{side:'bottom',turn:1,time:5},{side:'top',turn:2,time:8}];
const pairPlan=SR.statePairTarget(5,{row:hpWB.turnTimeline[0],turn:1,absoluteSide:'bottom',relativeSide:'自分'},2);
assert.equal(pairPlan.target,7,'state pair should use the requested +2s point while remaining inside the same turn');
const nearBoundary=SR.statePairTarget(7.4,{row:hpWB.turnTimeline[0],turn:1,absoluteSide:'bottom',relativeSide:'自分'},2);
assert.equal(nearBoundary.valid,false,'state pair must reject a comparison when the next turn boundary is too close');

assert.equal(SR.decideHpDirectStable([hpSingle(9,0),hpSingle(9,-.04)],9).accepted,false,'two one-vote frames must remain insufficient');
const hpOldDominates=[hpSingle(9,0),hpSingle(10,-.04,{accepted:true,votes:2}),hpSingle(10,-.08)];
const hpOldDecision=SR.decideHpDirectStable(hpOldDominates,9);
assert.equal(hpOldDecision.accepted,false,'past frames must never override a different current-frame candidate');
assert.equal(hpOldDecision.reason,'direct-current-candidate-changed');
const hpConflict=[hpSingle(9,0),hpSingle(9,-.04),hpSingle(10,-.08,{accepted:true,votes:2})];
const hpConflictDecision=SR.decideHpDirectStable(hpConflict,9);
assert.equal(hpConflictDecision.accepted,false,'strong conflicting historical HP evidence must remain unresolved');
assert.equal(hpConflictDecision.reason,'direct-frame-conflict');
const hpHistoricalConflict=[hpSingle(9,0),{offset:-.04,accepted:false,value:null,frameCandidate:9,frameVotes:2,reason:'ocr-conflict'},hpSingle(9,-.08)];
const hpHistoricalConflictDecision=SR.decideHpDirectStable(hpHistoricalConflict,9);
assert.equal(hpHistoricalConflictDecision.accepted,false,'an OCR-conflict frame must never strengthen a weak direct HP candidate');
assert.equal(hpHistoricalConflictDecision.ignoredConflictFrames,1);
const hpConflictPlusClean=[hpSingle(9,0),{offset:-.04,accepted:false,value:null,frameCandidate:9,frameVotes:2,reason:'ocr-conflict'},hpSingle(9,-.08),hpSingle(9,-.12)];
const hpConflictPlusCleanDecision=SR.decideHpDirectStable(hpConflictPlusClean,9);
assert.equal(hpConflictPlusCleanDecision.accepted,true,'three clean weak frames may still confirm HP even if one separate historical frame is conflicting');
assert.equal(hpConflictPlusCleanDecision.value,9);
assert.equal(hpConflictPlusCleanDecision.ignoredConflictFrames,1);

console.log('TURN CONTROL SYNC REGRESSION PASS');

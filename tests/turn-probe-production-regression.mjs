import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},onReady(){},on(){},log(){},emit(){},playOrder:()=> '後攻',targetSide:()=> 'bottom',video:{duration:150},turnTimeline:[],$:()=>null,frameCanvas(){return null},videoKey:()=> 'test',currentTurnContext:()=>({})};
const sandbox={window:{WB},document:{createElement(){return {width:0,height:0,getContext(){return {}}}}},console,performance:{now:()=>0},setTimeout,clearTimeout,Uint8Array,Uint32Array};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);
const S=WB.StateRecognition;
assert.equal(S.version,'state-clean-1.8.23');

const times=Array.from({length:25},(_,i)=>+(111.388+i*.45).toFixed(3));
const stable=new Set([4,5,6,7,9,10,11,19,20]);
const pp=[null,8,8,8,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0];
const rows=times.map((time,i)=>({time,stable:stable.has(i),ppAccepted:Number.isInteger(pp[i]),ppValue:Number.isInteger(pp[i])?pp[i]:null}));
const coarseOnly=new Array(rows.length);
for(const i of S.adaptiveProbeIndexPlan(coarseOnly,rows.length).coarseIndices)coarseOnly[i]=rows[i];
const plan=S.adaptiveProbeIndexPlan(coarseOnly,rows.length);
assert.deepEqual(Array.from(plan.selectedIndices),[0,2,3,4,5,6,7,8,9,10,11,12,14,16,18,19,20,21,22,24]);
const selected=plan.selectedIndices.map(i=>rows[i]);
assert.equal(S.adaptiveProbeNeedsFallback(selected),false,'validated turn-8 style adaptive result must not force full fallback');

const hidden=[
 {time:0,stable:false,ppAccepted:true,ppValue:3},
 {time:.45,stable:true,ppAccepted:true,ppValue:3},
 {time:.9,stable:false,ppAccepted:true,ppValue:3},
 {time:1.35,stable:true,ppAccepted:true,ppValue:3},
 {time:1.8,stable:false,ppAccepted:true,ppValue:3}
];
const hiddenSparse=new Array(hidden.length);
for(const i of S.adaptiveProbeIndexPlan(hiddenSparse,hidden.length).coarseIndices)hiddenSparse[i]=hidden[i];
const hiddenPlan=S.adaptiveProbeIndexPlan(hiddenSparse,hidden.length),hiddenSelected=hiddenPlan.selectedIndices.map(i=>hidden[i]);
assert.equal(S.adaptiveProbeNeedsFallback(hiddenSelected),true,'blind stable islands must trigger the full 0.45s fallback before production use');

const source=fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8');
assert.ok(source.includes("'turn-analysis-probe-coarse'"));
assert.ok(source.includes("'turn-analysis-probe-refine'"));
assert.ok(source.includes("'turn-analysis-probe-fallback'"));
assert.ok(source.includes("probeProduction.fallbackReason='insufficient-safe-stable-pair'"));
assert.ok(source.includes("adaptiveProbeProductionFallback:true"));
assert.equal(source.includes('fastSeek'),false);
console.log('TURN PROBE PRODUCTION REGRESSION PASS');

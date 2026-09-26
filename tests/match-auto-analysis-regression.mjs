import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const elements={
  '#leTurn':{value:'6',tagName:'INPUT',dataset:{source:'manual',manualVideo:'test'}},
  '#leOppHp':{value:'17',tagName:'INPUT',dataset:{source:'manual',manualVideo:'test'}},
  '#lePp':{value:'3',tagName:'INPUT',dataset:{source:'manual',manualVideo:'test'}},
  '#leBoard':{value:'4',tagName:'INPUT',dataset:{source:'manual',manualVideo:'test'}},
  '#leExtra':{value:'yes',tagName:'SELECT',dataset:{source:'manual',manualVideo:'test'}},
  '#leEp':{value:'yes',tagName:'SELECT',dataset:{source:'manual',manualVideo:'test'}},
  '#leSep':{value:'no',tagName:'SELECT',dataset:{source:'manual',manualVideo:'test'}},
  '#leWard':{value:'present',tagName:'SELECT',dataset:{source:'manual',manualVideo:'test'}}
};
const WB={
  registerModule(){},onReady(){},on(){},log(){},emit(){},
  playOrder:()=> '後攻',targetSide:()=> 'bottom',
  video:{duration:123.338},turnTimeline:[],
  $:s=>elements[s]??null,frameCanvas(){return null},
  videoKey:()=> 'test',currentTurnContext:()=>({})
};
const sandbox={window:{WB},document:{createElement(){return {getContext(){return {}}}}},console,performance:{now:()=>0},setTimeout,clearTimeout,Uint8Array,Uint32Array};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);
const S=WB.StateRecognition;

const timeline=[
  {side:'top',turn:1,time:13.5},{side:'bottom',turn:1,time:15.25},
  {side:'top',turn:2,time:17.75},{side:'bottom',turn:2,time:20.363},
  {side:'top',turn:3,time:23.938},{side:'bottom',turn:3,time:28.04},
  {side:'top',turn:4,time:31.313},{side:'bottom',turn:4,time:34.438},
  {side:'top',turn:5,time:37.653},{side:'bottom',turn:5,time:42.691},
  {side:'top',turn:6,time:51.375},{side:'bottom',turn:6,time:59.32},
  {side:'top',turn:7,time:66.751},{side:'bottom',turn:7,time:77.295},
  {side:'top',turn:8,time:92.313},{side:'bottom',turn:8,time:99.42},
  {side:'top',turn:9,time:112.375},{side:'bottom',turn:9,time:118.875},
  {side:'top',turn:10,time:120.875}
];
let plan=Array.from(S.matchAnalysisPlan(timeline,'bottom',123.338));
assert.equal(plan.length,9,'bottom target must process exactly the nine recognized bottom turns');
assert.equal(plan.every(x=>x.absoluteSide==='bottom'),true,'whole-match auto review must not silently add opponent-side turns');
assert.deepEqual(plan.map(x=>x.turn),[1,2,3,4,5,6,7,8,9]);
const t6=plan.find(x=>x.turn===6);
assert.ok(t6);
assert.equal(t6.eligible,true);
assert.equal(t6.bounds.start,59.77);
assert.equal(t6.bounds.end,66.631);
assert.equal(t6.bounds.nextTurnTime,66.751);

plan=Array.from(S.matchAnalysisPlan(timeline,'top',123.338));
assert.equal(plan.length,10,'top target must process exactly the recognized top turns');
assert.equal(plan.every(x=>x.absoluteSide==='top'),true);

const shortPlan=Array.from(S.matchAnalysisPlan([
  {side:'bottom',turn:1,time:1},
  {side:'top',turn:1,time:1.7}
],'bottom',3));
assert.equal(shortPlan.length,1);
assert.equal(shortPlan[0].eligible,false,'too-short turn windows must be marked ineligible rather than forcing unsafe captures');

const saved=Array.from(S.snapshotBatchInputs());
S.prepareBatchInputs();
for(const id of ['#leTurn','#leOppHp','#lePp','#leBoard']){
  assert.equal(elements[id].value,'','numeric manual state must be isolated during whole-match auto analysis');
  assert.equal(elements[id].dataset.manualVideo,undefined);
}
for(const id of ['#leExtra','#leEp','#leSep','#leWard']){
  assert.equal(elements[id].value,'unknown','tri-state manual state must be isolated during whole-match auto analysis');
  assert.equal(elements[id].dataset.manualVideo,undefined);
}
S.restoreBatchInputs(saved);
assert.equal(elements['#leOppHp'].value,'17');
assert.equal(elements['#leBoard'].value,'4');
assert.equal(elements['#leExtra'].value,'yes');
assert.equal(elements['#leWard'].value,'present');
assert.equal(elements['#leOppHp'].dataset.source,'manual');
assert.equal(elements['#leOppHp'].dataset.manualVideo,'test');

assert.equal(S.version,'state-clean-1.8.16');
assert.equal(typeof S.analyzeMatchTargetTurns,'function');
assert.equal(typeof S.selectTurnTimelineAnchors,'function');
assert.equal(typeof S.captureTimelineState,'function');
console.log('MATCH AUTO ANALYSIS REGRESSION PASS');

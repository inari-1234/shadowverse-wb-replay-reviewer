import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},onReady(){},on(){},log(){},emit(){},playOrder:()=> '後攻',targetSide:()=> 'bottom',video:{duration:150},turnTimeline:[],$:()=>null,frameCanvas(){return null},videoKey:()=> 'test',currentTurnContext:()=>({})};
const sandbox={window:{WB},document:{createElement(){return {width:0,height:0,getContext(){return {}}}}},console,performance:{now:()=>0},setTimeout,clearTimeout,Uint8Array,Uint32Array};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../state-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);
const S=WB.StateRecognition;

const times=Array.from({length:25},(_,i)=>+(111.388+i*.45).toFixed(3));
const stable=new Set([4,5,6,7,9,10,11,19,20]);
const pp=[null,8,8,8,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0];
const scores=[.444,3.268,3.28,3.26,4.669,5.096,3.464,3.672,2.799,3.589,3.901,3.528,3.271,2.048,1.076,1.072,3.228,3.307,3.236,3.564,4.74,3.299,3.243,2.953,3.232];
const probes=times.map((time,i)=>({time,stable:stable.has(i),score:scores[i],ppAccepted:Number.isInteger(pp[i]),ppValue:Number.isInteger(pp[i])?pp[i]:null}));
const ocrTimes=new Set([113.188,113.638,114.088,114.538,115.438,115.888,116.338,120.388]);
const ocrSamples=probes.filter(p=>ocrTimes.has(p.time)).map(p=>({...p,hpAccepted:true,hpValue:16,hpReason:'ok'}));
const fullPair=S.selectTurnStablePair(ocrSamples);
const fullTimeline=S.selectTurnTimelineAnchors({probes,ocrSamples,pair:fullPair});
const shadow=S.evaluateAdaptiveProbeShadow({probes,ocrSamples},fullTimeline);
assert.equal(shadow.productionApplied,false);
assert.equal(shadow.total,25);
assert.equal(shadow.selectedCount,20);
assert.equal(shadow.potentialSaved,5);
assert.deepEqual(Array.from(shadow.stableMisses),[]);
assert.deepEqual(Array.from(shadow.missingOcrTimes),[]);
assert.equal(shadow.anchorExact,true);
assert.equal(shadow.safeCandidate,true);
assert.deepEqual(Array.from(shadow.shadowAnchors,x=>x.time),Array.from(shadow.fullAnchors,x=>x.time));

const hiddenProbes=[
  {time:0,stable:false,ppAccepted:true,ppValue:3,score:3},
  {time:.45,stable:true,ppAccepted:true,ppValue:3,score:4},
  {time:.9,stable:false,ppAccepted:true,ppValue:3,score:3},
  {time:1.35,stable:true,ppAccepted:true,ppValue:3,score:4},
  {time:1.8,stable:false,ppAccepted:true,ppValue:3,score:3}
];
const hiddenOcr=hiddenProbes.filter(x=>x.stable).map(x=>({...x,hpAccepted:true,hpValue:20}));
const hiddenPair=S.selectTurnStablePair(hiddenOcr),hiddenTimeline=S.selectTurnTimelineAnchors({probes:hiddenProbes,ocrSamples:hiddenOcr,pair:hiddenPair});
const rejected=S.evaluateAdaptiveProbeShadow({probes:hiddenProbes,ocrSamples:hiddenOcr},hiddenTimeline);
assert.equal(rejected.safeCandidate,false,'coarse-only blind stable islands must block future production adoption');
assert.deepEqual(Array.from(rejected.stableMisses),[.45,1.35]);
assert.equal(rejected.productionApplied,false);

console.log('TURN PROBE SHADOW REGRESSION PASS');

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},log(){},turnTimeline:[]};
const sandbox={
  window:{WB},console,Float32Array,Uint8ClampedArray,Map,
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  document:{createElement(){return {width:0,height:0,getContext(){return {imageSmoothingEnabled:true,drawImage(){},getImageData(){return {data:new Uint8ClampedArray(12*16*4)}}}}}}}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);

const H=WB.HandRecognition;
assert.equal(H.version,'hand-clean-1.41');
assert.equal(H.config.nearThresholdPhaseOffset,.012);
assert.equal(typeof H.phaseShiftWindowCompatible,'function');

const mk=(t,xs)=>({sampleTime:t,candidateCount:xs.length,centers:xs.map(cx=>({cx,cy:487}))});
const baseXs=[701,740,774,815,844,882,923,960];
const refs=[
  mk(131.758,baseXs),
  mk(131.798,baseXs),
  mk(131.838,baseXs),
  mk(131.878,baseXs)
];
const shifted=[
  mk(131.770,baseXs.map((x,i)=>x+(i%2))),
  mk(131.810,baseXs.map((x,i)=>x-(i%2))),
  mk(131.850,baseXs),
  mk(131.890,baseXs.map(x=>x+1))
];
assert.equal(H.phaseShiftWindowCompatible(refs,shifted,1200),true,'+12ms phase window with the same eight-card layout must remain comparable');
assert.equal(H.phaseShiftWindowCompatible(refs.slice().reverse(),shifted.slice().reverse(),1200),true,'phase compatibility must be time-order independent');

const missing=shifted.map((x,i)=>i===2?mk(x.sampleTime,baseXs.slice(0,-1)):x);
assert.equal(H.phaseShiftWindowCompatible(refs,missing,1200),false,'phase probe must reject a changed candidate count');

const displaced=shifted.map((x,i)=>i===1?mk(x.sampleTime,baseXs.map(v=>v-120)):x);
assert.equal(H.phaseShiftWindowCompatible(refs,displaced,1200),false,'phase probe must reject a geometrically different hand layout');

assert.equal(H.phaseShiftWindowCompatible(refs,shifted.slice(0,3),1200),false,'phase probe must require all baseline frames');
assert.equal(H.phaseShiftWindowCompatible([],[],1200),false,'empty windows must never be phase-compatible');

console.log('NEAR-THRESHOLD PHASE PROBE REGRESSION PASS');

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const appCore=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
const expectedHandVersion=appCore.match(/'hand-recognition'\s*:\s*'([^']+)'/)?.[1];
assert.ok(expectedHandVersion,'app-core expected hand-recognition version must be parseable');

const profile=new Float32Array(420);
for(let ch=0;ch<3;ch++)for(let y=0;y<14;y++)for(let x=0;x<10;x++){
  const i=ch*140+y*10+x;
  profile[i]=(x-4.5)+(y-6.5)*.17+ch*.31;
}
const WB={
  registerModule(){},log(){},turnTimeline:[],
  CardDB:{
    recognitionCards(){return[{id:'probeCard',label:'probe'}]},
    anchorRecognitionProfiles(id){return id==='probeCard'?[profile]:[]}
  }
};
const sandbox={
  window:{WB},console,Float32Array,Uint8Array,Uint8ClampedArray,Map,
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  document:{createElement(){return {width:0,height:0,getContext(){return {imageSmoothingEnabled:true,drawImage(){},getImageData(){return {data:new Uint8ClampedArray(12*16*4)}}}}}}}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8')).runInContext(sandbox);

const H=WB.HandRecognition;
assert.equal(H.version,expectedHandVersion);
assert.equal(typeof H.fixedLeftAnchorDiagnosticScores,'function');

const variants=Array.from({length:25},()=>new Float32Array(profile));
const scores=H.fixedLeftAnchorDiagnosticScores(variants);
assert.ok(scores.probeCard);
for(const key of ['left40','left50']){
  const row=scores.probeCard[key];
  assert.equal(row.diagnosticOnly,true);
  assert.equal(row.applied,false);
  assert.equal(row.score,1);
  assert.equal(row.normalization,'fixed-left-visible-columns');
  assert.equal(row.columns,key==='left40'?4:5);
  assert.equal(row.supportRatio,key==='left40'?.4:.5);
}
assert.deepEqual(Object.keys(H.fixedLeftAnchorDiagnosticScores([])),[]);

console.log('COMMON STRIP DIAGNOSTIC REGRESSION PASS');

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../diagnostics.js',import.meta.url),'utf8');
const seeks=[];
const recognition={
  base:22.113,
  windowMode:'stable-backscan',
  recognized:{},
  unresolved:{quickBlader:{reason:'temporal-evidence-insufficient'}},
  samples:[
    {sampleTime:1,candidates:[{index:0}]},
    {sampleTime:2,candidates:[{index:0}]},
    {sampleTime:3,candidates:[{index:0}]},
    {sampleTime:4,candidates:[{index:0}]},
    {sampleTime:5,candidates:[{index:0}]},
    {sampleTime:6,candidates:[{index:0}]},
    {sampleTime:7,candidates:[{index:0}]}
  ]
};
const WB={
  APP:{version:'4.13.42',build:'test-build',revision:'test-revision'},
  modules:[],events:[],errors:[],scenes:[],
  videoMeta:{name:'fixture.mp4',size:123,type:'video/mp4',lastModified:1},
  video:{currentTime:10,duration:120,videoWidth:1920,videoHeight:1080},
  tacticalHandRecognition:recognition,
  DisplayedCostRecognition:{meta:{version:'cost-test'}},
  CardDB:{meta:{version:'card-test'}},
  cancelRequested:false,
  registerModule(){},
  onReady(){},
  targetSide(){return'bottom'},
  playOrder(){return'後攻'},
  videoKey(){return'fixture-key'},
  async seekTo(t){seeks.push(t);this.video.currentTime=t;return t},
  frameCanvas(maxW){assert.equal(maxW,1200);return{width:1200,height:675}},
  async canvasBlob(){return new Blob([Uint8Array.from([1,2,3])],{type:'image/jpeg'})}
};
const context={
  window:{WB,__wbDecisionInputV1:{marker:'decision'}},
  structuredClone,
  Blob,
  Uint8Array,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  crypto:undefined,
  console
};
context.globalThis=context;
vm.runInNewContext(source,context,{filename:'diagnostics.js'});

assert.equal(WB.Diagnostics.version,'diagnostics-clean-1.42');
assert.deepEqual(Array.from(WB.Diagnostics.fixtureSampleTimes(recognition,4)),[1,3,5,7],'seven samples should be evenly reduced to four');
assert.deepEqual(Array.from(WB.Diagnostics.fixtureSampleTimes({samples:[{sampleTime:2},{sampleTime:2},{sampleTime:null},{sampleTime:4}]},4)),[2,4],'times must be unique and finite');

const bundle=await WB.Diagnostics.captureHandFixtureBundle({maxFrames:2,quality:.9});
assert.equal(bundle.format,'shadowverse-wb-hand-fixture-v1');
assert.equal(bundle.capturePolicy.automatic,false);
assert.equal(bundle.capturePolicy.fullFrame,true);
assert.equal(bundle.capturePolicy.selectedFrames,2);
assert.deepEqual(Array.from(bundle.frames,x=>x.sampleTime),[1,7]);
assert.equal(bundle.frames[0].width,1200);
assert.equal(bundle.frames[0].height,675);
assert.equal(bundle.frames[0].image.encoding,'base64');
assert.equal(bundle.frames[0].image.data,'AQID');
assert.equal(bundle.frames[0].image.byteLength,3);
assert.equal(bundle.frames[0].sample.sampleTime,1);
assert.equal(bundle.recognition.windowMode,'stable-backscan');
assert.equal(bundle.decisionInputV1.marker,'decision');
assert.equal(WB.video.currentTime,10,'fixture capture must restore the original video position');
assert.deepEqual(seeks,[1,7,10],'capture should seek only selected fixture frames and restore once');

console.log('HAND FIXTURE EXPORT REGRESSION PASS');

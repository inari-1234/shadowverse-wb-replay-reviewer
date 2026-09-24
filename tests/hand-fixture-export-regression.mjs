import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../diagnostics.js',import.meta.url),'utf8');
const appSource=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
const latest=JSON.parse(fs.readFileSync(new URL('../latest.json',import.meta.url),'utf8'));
const expectedDiagnosticsVersion=appSource.match(/'diagnostics'\s*:\s*'([^']+)'/)?.[1];
assert.ok(expectedDiagnosticsVersion,'expected diagnostics module version must be parseable from app-core manifest');
const seeks=[],observeCalls=[],ocrParameterCalls=[];let restoreOcrCalls=0,throwObserve=false;
const recognition={
  base:22.113,
  windowMode:'stable-backscan',
  recognized:{},
  unresolved:{quickBlader:{reason:'temporal-evidence-insufficient'}},
  samples:[
    {sampleTime:1,centers:[{cx:100,cy:500,score:14,greenFraction:.4}],candidates:[{index:0}]},
    {sampleTime:2,centers:[{cx:200,cy:500,score:14,greenFraction:.4}],candidates:[{index:0}]},
    {sampleTime:3,centers:[{cx:300,cy:500,score:14,greenFraction:.4}],candidates:[{index:0}]},
    {sampleTime:4,centers:[{cx:400,cy:500,score:14,greenFraction:.4}],candidates:[{index:0}]},
    {sampleTime:5,centers:[{cx:500,cy:500,score:14,greenFraction:.4}],candidates:[{index:0}]},
    {sampleTime:6,centers:[{cx:600,cy:500,score:14,greenFraction:.4}],candidates:[{index:0}]},
    {sampleTime:7,centers:[{cx:700,cy:500,score:14,greenFraction:.4}],candidates:[{index:0}]}
  ]
};
const WB={
  APP:{version:latest.version,build:latest.build,revision:latest.revision},
  modules:[],events:[],errors:[],scenes:[],
  videoMeta:{name:'fixture.mp4',size:123,type:'video/mp4',lastModified:1},
  video:{currentTime:10,duration:120,videoWidth:1920,videoHeight:1080},
  tacticalHandRecognition:recognition,
  DisplayedCostRecognition:{meta:{version:'cost-test'}},
  CardDB:{meta:{version:'card-test'}},
  HandRecognition:{
    findCostCenters(){const x=Math.round(WB.video.currentTime*100);return[{cx:x,cy:500,score:14,greenFraction:.4}]},
    layoutsCompatible(a,b){const aa=a?.centers||[],bb=b?.centers||[];return aa.length===bb.length&&aa.every((x,i)=>Math.abs(Number(x.cx)-Number(bb[i]?.cx))<=18)},
    async observeHandFrame(_canvas,sampleTime,offset,worker,options){observeCalls.push({sampleTime,offset,worker,options});if(throwObserve)throw new Error('diagnostic-reobserve-failed');return{sampleTime,offset,centers:this.findCostCenters(),candidateCount:1,candidates:[{index:0,commonStripScores:{quickBlader:{left40:{score:.92},left50:{score:.93}}},displayedCost:{diagnostic6Probe:{score:.41,threshold:.98,reachesThreshold:false}},matchScores:{quickBlader:{imageScore:.91,anchorVariant:{edgeProbe:{diagnosticOnly:true,applied:false}}}}}]}}
  },
  cancelRequested:false,
  registerModule(){},
  onReady(){},
  targetSide(){return'bottom'},
  playOrder(){return'後攻'},
  videoKey(){return'fixture-key'},
  async seekTo(t){seeks.push(t);this.video.currentTime=t;return t},
  async initOCR(){return{async setParameters(x){ocrParameterCalls.push(x)}}},
  async restoreOCRDefaults(){restoreOcrCalls++},
  frameCanvas(maxW){assert.equal(maxW,1200);return{width:1200,height:675}},
  async canvasBlob(_canvas,_quality,type){assert.equal(type,'image/png','fixture capture must request lossless PNG');return new Blob([Uint8Array.from([1,2,3])],{type:'image/png'})}
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

assert.equal(WB.Diagnostics.version,expectedDiagnosticsVersion);
assert.deepEqual(Array.from(WB.Diagnostics.fixtureSampleTimes(recognition,4)),[1,3,5,7],'seven samples should be evenly reduced to four');
assert.deepEqual(Array.from(WB.Diagnostics.fixtureSampleTimes({samples:[{sampleTime:2},{sampleTime:2},{sampleTime:null},{sampleTime:4}]},4)),[2,4],'times must be unique and finite');

const bundle=await WB.Diagnostics.captureHandFixtureBundle({maxFrames:2,quality:.9});
assert.equal(bundle.format,'shadowverse-wb-hand-fixture-v1');
assert.equal(bundle.capturePolicy.automatic,false);
assert.equal(bundle.capturePolicy.fullFrame,true);
assert.equal(bundle.capturePolicy.selectedFrames,2);
assert.equal(bundle.capturePolicy.lossless,true);
assert.equal(bundle.capturePolicy.imageMime,'image/png');
assert.equal(bundle.capturePolicy.replayGeometryCheck,true);
assert.equal(bundle.capturePolicy.diagnosticReobservation,true);
assert.equal(bundle.capturePolicy.diagnosticProbes,true);
assert.equal(bundle.capturePolicy.commonStripAllLayouts,true);
assert.equal(bundle.capturePolicy.jpegQuality,null);
assert.deepEqual(Array.from(bundle.frames,x=>x.sampleTime),[1,7]);
assert.equal(bundle.frames[0].width,1200);
assert.equal(bundle.frames[0].height,675);
assert.equal(bundle.frames[0].image.encoding,'base64');
assert.equal(bundle.frames[0].image.data,'AQID');
assert.equal(bundle.frames[0].image.byteLength,3);
assert.equal(bundle.frames[0].image.mime,'image/png');
assert.deepEqual(Array.from(bundle.frames[0].replay.centers,x=>x.cx),[100]);
assert.equal(bundle.frames[0].replay.geometry.countMatch,true);
assert.equal(bundle.frames[0].replay.geometry.exactCenterMatch,true);
assert.equal(bundle.frames[0].replay.geometry.maxCenterDeltaPx,0);
assert.equal(bundle.frames[0].replay.geometry.layoutCompatible,true);
assert.equal(bundle.frames[0].sourceSample.sampleTime,1);
assert.equal(bundle.frames[0].sample.sampleTime,1);
assert.equal(bundle.frames[0].sample.offset,-21.113);
assert.equal(bundle.frames[0].sample.candidates[0].commonStripScores.quickBlader.left40.score,.92);
assert.equal(bundle.frames[0].sample.candidates[0].displayedCost.diagnostic6Probe.score,.41);
assert.equal(bundle.frames[0].sample.candidates[0].matchScores.quickBlader.anchorVariant.edgeProbe.diagnosticOnly,true);
assert.equal(bundle.recognition.windowMode,'stable-backscan');
assert.equal(bundle.decisionInputV1.marker,'decision');
assert.equal(WB.video.currentTime,10,'fixture capture must restore the original video position');
assert.deepEqual(seeks,[1,7,10],'capture should seek only selected fixture frames and restore once');
assert.equal(observeCalls.length,2);
assert.deepEqual(observeCalls.map(x=>JSON.parse(JSON.stringify(x.options))),[{diagnosticProbes:true,commonStripAllLayouts:true},{diagnosticProbes:true,commonStripAllLayouts:true}]);
assert.equal(ocrParameterCalls.length,1);
assert.equal(restoreOcrCalls,1,'fixture capture must restore OCR defaults after success');

seeks.length=0;
WB.video.currentTime=10;
throwObserve=true;
await assert.rejects(()=>WB.Diagnostics.captureHandFixtureBundle({maxFrames:2,quality:.9}),/diagnostic-reobserve-failed/);
assert.equal(WB.video.currentTime,10,'fixture failure must restore the original video position');
assert.deepEqual(seeks,[1,10],'fixture failure should restore immediately after the failing selected frame');
assert.equal(restoreOcrCalls,2,'fixture failure must also restore OCR defaults');
throwObserve=false;

const geometry=WB.Diagnostics.fixtureReplayGeometry(
  [{cx:100,cy:500,score:14,greenFraction:.4},{cx:200,cy:500,score:15,greenFraction:.5}],
  [{cx:102,cy:500,score:13.5,greenFraction:.39},{cx:205,cy:500,score:15.1,greenFraction:.48}],
  1200
);
assert.equal(geometry.available,true);
assert.equal(geometry.countMatch,true);
assert.equal(geometry.exactCenterMatch,false);
assert.equal(geometry.maxCenterDeltaPx,5);
assert.equal(geometry.meanCenterDeltaPx,3.5);
assert.equal(geometry.maxScoreDelta,.5);
assert.equal(geometry.maxGreenFractionDelta,.02);
assert.equal(geometry.layoutCompatible,true);

console.log('HAND FIXTURE EXPORT REGRESSION PASS');

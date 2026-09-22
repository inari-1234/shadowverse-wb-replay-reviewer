import assert from 'node:assert/strict';
import {datasetFromDiagnostic,datasetFromFixture,V5_DATASET_VERSION} from '../experiments/v5-dataset-extractor.mjs';

const sample={
  sampleTime:10.04,candidateCount:2,candidates:[
    {index:0,center:{cx:700,cy:500},matchScores:{zeta:{imageScore:.2},quick:{imageScore:.88}},displayedCost:{value:1,source:'ocr',ocrValue:1,ocrConfidence:77,templateValue:1,templateScore:.99,diagnostic6Probe:{score:.41,threshold:.98,reachesThreshold:false}},imageBest:{cardId:'quick'},best:{cardId:'quick',decision:'matched',matched:true}},
    {index:1,center:{cx:760,cy:500},matchScores:{zeta:{imageScore:.89},quick:{imageScore:.3}},displayedCost:{value:3,source:'ocr',ocrValue:3,ocrConfidence:72,templateValue:7,templateScore:.67,diagnostic6Probe:{score:.982,threshold:.98,reachesThreshold:true}},imageBest:{cardId:'zeta'},best:{cardId:'zeta',decision:'image-below-candidate',matched:false}}
  ]
};
const diag=datasetFromDiagnostic({
  format:'shadowverse-wb-diagnostic-v4.13.55-clean',
  video:{name:'video.mp4'},
  stateCapture:{context:{videoKey:'video-key'}},
  handRecognition:{samples:[sample]}
});
assert.equal(diag.version,V5_DATASET_VERSION);
assert.equal(diag.sourceType,'diagnostic');
assert.equal(diag.records.length,2);
assert.equal(diag.records[1].videoKey,'video-key');
assert.equal(diag.records[1].cost.scores['6'],.982);
assert.equal(diag.records[1].cardScores.zeta,.89);
assert.equal(diag.records[1].legacy.matched,false);

const fixture=datasetFromFixture({
  format:'shadowverse-wb-hand-fixture-v1',
  video:{name:'fixture.mp4'},
  context:{videoKey:'fixture-key'},
  recognition:{samples:[sample]},
  frames:[{sampleTime:10.04,width:1200,height:675,image:{sha256:'abc',mime:'image/png'},replay:{geometry:{layoutCompatible:true}}}]
});
assert.equal(fixture.sourceType,'fixture');
assert.equal(fixture.records.length,2);
assert.equal(fixture.records[0].frameKey,'abc','lossless fixture SHA-256 must become the distinct-frame identity');
assert.equal(fixture.images[0].sha256,'abc');
assert.equal(fixture.images[0].replayGeometry.layoutCompatible,true);

console.log('V5 DATASET EXTRACTOR REGRESSION PASS');

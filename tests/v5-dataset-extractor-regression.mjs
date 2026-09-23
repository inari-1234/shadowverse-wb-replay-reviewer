import assert from 'node:assert/strict';
import {datasetFromDiagnostic,datasetFromFixture,V5_DATASET_VERSION} from '../experiments/v5-dataset-extractor.mjs';

const sample={
  sampleTime:10.04,candidateCount:2,candidates:[
    {index:0,center:{cx:700,cy:500},geometry:{leftGapToCostCenter:null,rightGapToCostCenter:32,anchorRightSpanPx:46,titleRightSpanPx:81,titleLeftSpanPx:16,isRightmost:false},matchScores:{zeta:{imageScore:.2},quick:{imageScore:.88}},shadowMatchScores:{zeta:{score:.41,supportRatio:.5,visibleCells:70,totalCells:140,rightGap:32,limitX:726,marginPx:6,normalization:'visible-cells-per-channel'},quick:{score:.91,supportRatio:.6,visibleCells:84,totalCells:140,rightGap:32,limitX:726,marginPx:6,normalization:'visible-cells-per-channel'}},commonStripScores:{zeta:{left40:{diagnosticOnly:true,applied:false,score:.55,dx:0,angle:0,profileIndex:0,columns:4,supportRatio:.4,normalization:'fixed-left-visible-columns'},left50:{diagnosticOnly:true,applied:false,score:.58,dx:0,angle:0,profileIndex:0,columns:5,supportRatio:.5,normalization:'fixed-left-visible-columns'}},quick:{left40:{diagnosticOnly:true,applied:false,score:.92,dx:0,angle:0,profileIndex:1,columns:4,supportRatio:.4,normalization:'fixed-left-visible-columns'},left50:{diagnosticOnly:true,applied:false,score:.93,dx:0,angle:0,profileIndex:1,columns:5,supportRatio:.5,normalization:'fixed-left-visible-columns'}}},displayedCost:{value:1,source:'ocr',ocrValue:1,ocrConfidence:77,templateValue:1,templateScore:.99,diagnostic6Probe:{score:.41,threshold:.98,reachesThreshold:false}},imageBest:{cardId:'quick'},best:{cardId:'quick',decision:'matched',matched:true}},
    {index:1,center:{cx:760,cy:500},geometry:{leftGapToCostCenter:32,rightGapToCostCenter:null,anchorRightSpanPx:46,titleRightSpanPx:81,titleLeftSpanPx:16,isRightmost:true},matchScores:{zeta:{imageScore:.89},quick:{imageScore:.3}},shadowMatchScores:{zeta:{score:.93,supportRatio:.7,visibleCells:98,totalCells:140,rightGap:null,limitX:null,marginPx:6,normalization:'visible-cells-per-channel'}},displayedCost:{value:3,source:'ocr',ocrValue:3,ocrConfidence:72,templateValue:7,templateScore:.67,diagnostic6Probe:{score:.982,threshold:.98,reachesThreshold:true}},imageBest:{cardId:'zeta'},best:{cardId:'zeta',decision:'image-below-candidate',matched:false}}
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
assert.equal(diag.frameIdentityQuality,'time-fallback');
assert.equal(diag.records.length,2);
assert.equal(diag.records[1].videoKey,'video-key');
assert.equal(diag.records[1].frameIdentitySource,'sampleTime');
assert.equal(diag.records[1].cost.scores['6'],.982);
assert.equal(diag.records[1].cardScores.zeta,.89);
assert.equal(diag.records[0].maskedCardScores.quick,.91);
assert.equal(diag.records[0].maskedCardMeta.quick.supportRatio,.6);
assert.equal(diag.records[0].commonStrip40Scores.quick,.92);
assert.equal(diag.records[0].commonStrip50Scores.quick,.93);
assert.equal(diag.records[0].commonStrip40Meta.quick.columns,4);
assert.equal(diag.records[0].commonStrip50Meta.quick.supportRatio,.5);
assert.equal(diag.records[0].commonStrip50Meta.quick.diagnosticOnly,true);
assert.equal(diag.records[0].commonStrip50Meta.quick.applied,false);
assert.equal(diag.records[0].visibility.rightGap,32);
assert.equal(diag.records[0].visibility.anchorRightSpanPx,46);
assert.equal(diag.records[0].visibility.rightVisibleRatio,32/46);
assert.ok(diag.records[0].visibility.rightOcclusionRatio>.3);
assert.equal(diag.records[1].visibility.isRightmost,true);
assert.equal(diag.records[1].legacy.matched,false);

const runtimeSample={...sample,candidates:sample.candidates.map((x,i)=>({...x,roiAppearanceId:i===0?'roi-quick-301':null})),frameIdentity:{requestedTime:10.04,actualTime:10.033,mediaTime:10.033333,presentedFrames:301,visualFrameId:'hand-vf-301'}};
const runtimeDiag=datasetFromDiagnostic({
  format:'shadowverse-wb-diagnostic-v4.13.57-clean',
  video:{name:'runtime.mp4'},
  stateCapture:{context:{videoKey:'runtime-key'}},
  handRecognition:{samples:[runtimeSample]}
});
assert.equal(runtimeDiag.frameIdentityQuality,'runtime-frame-id-partial');
assert.equal(runtimeDiag.records[0].frameKey,'hand-vf-301');
assert.equal(runtimeDiag.records[0].frameIdentitySource,'visual-frame-id');
assert.equal(runtimeDiag.records[0].requestedTime,10.04);
assert.equal(runtimeDiag.records[0].actualTime,10.033);
assert.equal(runtimeDiag.records[0].mediaTime,10.033333);
assert.equal(runtimeDiag.records[0].presentedFrames,301);
assert.equal(runtimeDiag.records[0].visualFrameId,'hand-vf-301');
assert.equal(runtimeDiag.records[0].roiAppearanceId,'roi-quick-301');
assert.equal(runtimeDiag.records[1].roiAppearanceId,null);


const fixture=datasetFromFixture({
  format:'shadowverse-wb-hand-fixture-v1',
  video:{name:'fixture.mp4'},
  context:{videoKey:'fixture-key'},
  recognition:{samples:[sample]},
  frames:[{sampleTime:10.04,width:1200,height:675,image:{sha256:'abc',mime:'image/png'},replay:{geometry:{layoutCompatible:true}}}]
});
assert.equal(fixture.sourceType,'fixture');
assert.equal(fixture.frameIdentityQuality,'sha256-partial');
assert.equal(fixture.records.length,2);
assert.equal(fixture.records[0].frameKey,'abc','lossless fixture SHA-256 must become the distinct-frame identity');
assert.equal(fixture.records[0].frameIdentitySource,'sha256');
assert.equal(fixture.images[0].sha256,'abc');
assert.equal(fixture.images[0].replayGeometry.layoutCompatible,true);

console.log('V5 DATASET EXTRACTOR REGRESSION PASS');

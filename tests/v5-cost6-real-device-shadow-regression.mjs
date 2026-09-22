import assert from 'node:assert/strict';
import {aggregateCostSlots,V5_SHADOW_VERSION} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.2');

const source={
  diagnostic:'shadowverse-wb-diagnostic-v4.13.56-2026-09-22T0045.json',
  videoKey:'ScreenRecording_09-14-2026 21-19-26_1.mp4|268050356|1789388366000',
  evidenceClass:'observed-calibration-snapshot',
  validation:false
};

const frames=[
  {time:130.62,scores:[.0964,.4043,.2917,.6808,.3485,.4712,.7026,.9812],ocr:{value:0,confidence:21}},
  {time:130.66,scores:[.0939,.4292,.2236,.6849,.3523,.4781,.7131,.9750],ocr:{value:6,confidence:59}},
  {time:130.70,scores:[.0961,.1859,.1970,.6935,.2941,.5075,.7260,.9846],ocr:{value:3,confidence:53}},
  {time:130.74,scores:[.0959,.1846,.1905,.7018,.2956,.5317,.7342,.9834],ocr:{value:3,confidence:52}}
];

const records=frames.flatMap(frame=>frame.scores.map((score,slot)=>({
  videoKey:source.videoKey,
  sampleTime:frame.time,
  frameKey:'time:'+frame.time,
  frameIdentitySource:'sampleTime',
  slot,
  cost:{
    scores:{6:score},
    ocrValue:slot===7?frame.ocr.value:null,
    ocrConfidence:slot===7?frame.ocr.confidence:null,
    diagnostic6:{score,threshold:.98,reachesThreshold:score>=.98}
  }
})));

const slots=aggregateCostSlots(records);
assert.equal(slots.length,8);
const rightmost=slots.find(x=>x.slot===7);
assert.ok(rightmost);
assert.equal(rightmost.evidence.distinctFrames,4);
assert.equal(rightmost.evidence.visual.top.id,'6');
assert.equal(rightmost.evidence.visual.top.min,.975);
assert.equal(rightmost.evidence.visual.top.median,.9823);
assert.equal(rightmost.evidence.visual.top.max,.9846);
assert.equal(rightmost.evidence.visual.thresholdDecision.accepted,true,'temporal median should support 6 even when one frame is below .98');
assert.equal(rightmost.evidence.visual.thresholdDecision.classId,'6');
assert.equal(rightmost.evidence.ocr.top.id,'3','legacy OCR weighting is dominated by the repeated 3 misread in this observation');
assert.equal(rightmost.evidence.disagreement,true,'v5 shadow must preserve the real-device OCR-vs-visual disagreement');

const other=slots.filter(x=>x.slot!==7);
assert.ok(other.every(x=>x.evidence.visual.thresholdDecision.accepted===false),'all other slots in this observation must abstain from class 6');
const otherMax=Math.max(...other.map(x=>x.evidence.visual.top.max));
assert.equal(otherMax,.7342);
assert.equal(+(rightmost.evidence.visual.top.min-otherMax).toFixed(4),.2408,'observed positive-vs-other-slot gap must remain large');

console.log('V5 COST6 REAL-DEVICE SHADOW REGRESSION PASS');

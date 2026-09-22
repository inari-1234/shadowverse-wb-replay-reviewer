import assert from 'node:assert/strict';
import {aggregateClassScores,aggregateCostEvidence,aggregateCostSlots,aggregateVisibilityCardEvidence,distinctFrames,median,shadowComparison,V5_SHADOW_VERSION} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.4');
assert.equal(median([1,4,2,3]),2.5);
assert.deepEqual(distinctFrames([
  {frameKey:'a',sampleTime:1},{frameKey:'a',sampleTime:1.01},{frameKey:'b',sampleTime:2}
]).map(x=>x.frameKey),['a','b']);

const ranked=aggregateClassScores([
  {frameKey:'f1',scores:{zeta:.89,quick:.35}},
  {frameKey:'f2',scores:{zeta:.91,quick:.36}},
  {frameKey:'f3',scores:{zeta:.90,quick:.34}},
  {frameKey:'f3',scores:{zeta:.10,quick:.99}}
]);
assert.equal(ranked.distinctFrames,3,'duplicate decoded frames must not be double-counted');
assert.equal(ranked.top.id,'zeta');
assert.ok(ranked.top.margin>.5);

const cost=aggregateCostEvidence([
  {frameKey:'a',templateScores:{7:.67},diagnostic6Score:.9815,diagnostic6Threshold:.98,ocrValue:3,ocrConfidence:62},
  {frameKey:'b',templateScores:{7:.66},diagnostic6Score:.9848,diagnostic6Threshold:.98,ocrValue:6,ocrConfidence:37},
  {frameKey:'c',templateScores:{7:.65},diagnostic6Score:.9855,diagnostic6Threshold:.98,ocrValue:6,ocrConfidence:43}
]);
assert.equal(cost.mode,'shadow');
assert.equal(cost.applied,false);
assert.equal(cost.visual.top.id,'6');
assert.equal(cost.visual.thresholdDecision.available,true);
assert.equal(cost.visual.thresholdDecision.accepted,true);
assert.equal(cost.visual.thresholdDecision.classId,'6');
assert.ok(cost.visual.top.median>.98);
assert.equal(cost.ocr.top.id,'6');
assert.equal(cost.disagreement,false);

const conflict=aggregateCostEvidence([
  {frameKey:'a',diagnostic6Score:.982,diagnostic6Threshold:.98,ocrValue:3,ocrConfidence:80},
  {frameKey:'b',diagnostic6Score:.984,diagnostic6Threshold:.98,ocrValue:3,ocrConfidence:80},
  {frameKey:'c',diagnostic6Score:.985,diagnostic6Threshold:.98,ocrValue:6,ocrConfidence:20}
]);
assert.equal(conflict.visual.top.id,'6');
assert.equal(conflict.ocr.top.id,'3');
assert.equal(conflict.disagreement,true,'shadow evaluator must preserve OCR-vs-visual conflicts instead of silently resolving them');


const low=aggregateCostEvidence([
  {frameKey:'a',cost:{scores:{6:.70},diagnostic6:{score:.70,threshold:.98},ocrValue:3,ocrConfidence:70}},
  {frameKey:'b',cost:{scores:{6:.72},diagnostic6:{score:.72,threshold:.98},ocrValue:3,ocrConfidence:72}}
]);
assert.equal(low.visual.top.id,'6','single-class ranking may still have 6 as top evidence');
assert.equal(low.visual.thresholdDecision.accepted,false,'low single-class evidence must abstain instead of classifying 6');
assert.equal(low.visual.thresholdDecision.classId,null);
assert.equal(low.disagreement,false,'abstained visual evidence must not be treated as a classification conflict');

const canonicalSlots=aggregateCostSlots([
  {videoKey:'v',slot:0,frameKey:'a',cost:{scores:{6:.30},diagnostic6:{score:.30,threshold:.98},ocrValue:3,ocrConfidence:60}},
  {videoKey:'v',slot:0,frameKey:'b',cost:{scores:{6:.32},diagnostic6:{score:.32,threshold:.98},ocrValue:3,ocrConfidence:60}},
  {videoKey:'v',slot:1,frameKey:'a',cost:{scores:{6:.99},diagnostic6:{score:.99,threshold:.98},ocrValue:3,ocrConfidence:80}},
  {videoKey:'v',slot:1,frameKey:'b',cost:{scores:{6:.985},diagnostic6:{score:.985,threshold:.98},ocrValue:6,ocrConfidence:20}}
]);
assert.equal(canonicalSlots.length,2);
assert.equal(canonicalSlots[0].evidence.visual.thresholdDecision.accepted,false);
assert.equal(canonicalSlots[1].evidence.visual.thresholdDecision.classId,'6');
assert.equal(canonicalSlots[1].evidence.disagreement,true);


const visible=aggregateVisibilityCardEvidence([
  {frameKey:'f1',candidateCount:9,cardScores:{barbaros:.36,quick:.30},maskedCardScores:{barbaros:.72,quick:.43},maskedCardMeta:{barbaros:{supportRatio:.5},quick:{supportRatio:.6}},visibility:{rightGap:33,anchorRightSpanPx:46,rightVisibleRatio:33/46,rightOcclusionRatio:1-33/46}},
  {frameKey:'f2',candidateCount:9,cardScores:{barbaros:.35,quick:.31},maskedCardScores:{barbaros:.73,quick:.42},maskedCardMeta:{barbaros:{supportRatio:.5},quick:{supportRatio:.6}},visibility:{rightGap:33,anchorRightSpanPx:46,rightVisibleRatio:33/46,rightOcclusionRatio:1-33/46}}
]);
assert.equal(visible.visibility.geometryLimited,true);
assert.ok(visible.visibility.rightVisibleRatioMedian<1);
assert.equal(visible.masked.top.id,'barbaros');
assert.ok(visible.masked.top.margin>.25);
assert.ok(visible.recovery.gain>.35);
assert.equal(visible.applied,false);
assert.equal(visible.confidence.rankAgreement,true);
assert.equal(visible.confidence.rankPreservingRecovery,true);
assert.equal(visible.confidence.rankConflict,false);
assert.equal(visible.confidence.normalTopConsistency,1);
assert.equal(visible.confidence.maskedTopConsistency,1);
assert.ok(visible.confidence.marginGain>0);


const visibilityConflict=aggregateVisibilityCardEvidence([
  {frameKey:'c1',candidateCount:9,cardScores:{barbaros:.39,quick:.24},maskedCardScores:{barbaros:.29,quick:.33},maskedCardMeta:{barbaros:{supportRatio:.46},quick:{supportRatio:.56}},visibility:{rightGap:28,anchorRightSpanPx:46,rightVisibleRatio:28/46,rightOcclusionRatio:1-28/46}},
  {frameKey:'c2',candidateCount:9,cardScores:{barbaros:.38,quick:.25},maskedCardScores:{barbaros:.28,quick:.32},maskedCardMeta:{barbaros:{supportRatio:.46},quick:{supportRatio:.56}},visibility:{rightGap:28,anchorRightSpanPx:46,rightVisibleRatio:28/46,rightOcclusionRatio:1-28/46}}
]);
assert.equal(visibilityConflict.confidence.rankAgreement,false);
assert.equal(visibilityConflict.confidence.rankConflict,true);
assert.equal(visibilityConflict.confidence.rankPreservingRecovery,false);

const full=shadowComparison({legacy:{recognized:false},costRows:[{frameKey:'a',diagnostic6Score:.99,diagnostic6Threshold:.98}],cardRows:[{frameKey:'a',cardScores:{zeta:.9,quick:.3}}]});
assert.equal(full.mode,'shadow');
assert.equal(full.applied,false);
assert.equal(full.legacy.recognized,false);
assert.equal(full.cards.top.id,'zeta');

console.log('V5 SHADOW RECOGNITION REGRESSION PASS');

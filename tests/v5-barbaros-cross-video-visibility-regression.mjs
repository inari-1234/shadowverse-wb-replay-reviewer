import assert from 'node:assert/strict';
import {aggregateVisibilityCardEvidence,V5_SHADOW_VERSION} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.9');

const source={
  successVideo:'ScreenRecording_09-14-2026 21-17-26_1.mp4',
  successTime:75.875,
  occludedVideo:'ScreenRecording_09-20-2026 00-06-12_1.mp4',
  occludedTime:109.183,
  evidenceClass:'observed-cross-video-calibration-snapshot',
  validation:false
};

const successRows=[
  {frameKey:'75.795',candidateCount:5,cardScores:{barbaros:.9401,quickBlader:.4738,zetaBeatrix:.2843},maskedCardScores:{},maskedCardMeta:{},visibility:{leftGap:63,rightGap:60,anchorRightSpanPx:46,rightVisibleRatio:1,rightOcclusionRatio:0}},
  {frameKey:'75.835',candidateCount:5,cardScores:{barbaros:.9413,quickBlader:.47,zetaBeatrix:.28},maskedCardScores:{},maskedCardMeta:{},visibility:{leftGap:63,rightGap:59,anchorRightSpanPx:46,rightVisibleRatio:1,rightOcclusionRatio:0}},
  {frameKey:'75.875',candidateCount:5,cardScores:{barbaros:.9405,quickBlader:.47,zetaBeatrix:.28},maskedCardScores:{},maskedCardMeta:{},visibility:{leftGap:63,rightGap:59,anchorRightSpanPx:46,rightVisibleRatio:1,rightOcclusionRatio:0}}
];

const occludedRows=[
  {frameKey:'109.063',candidateCount:9,cardScores:{barbaros:.3569,quickBlader:.2997,zetaBeatrix:.1683},maskedCardScores:{barbaros:.7248,quickBlader:.4295,zetaBeatrix:.2965},maskedCardMeta:{barbaros:{supportRatio:.5},quickBlader:{supportRatio:.6},zetaBeatrix:{supportRatio:.4643}},visibility:{leftGap:28,rightGap:33,anchorRightSpanPx:46,rightVisibleRatio:33/46,rightOcclusionRatio:1-33/46}},
  {frameKey:'109.103',candidateCount:9,cardScores:{barbaros:.3585,quickBlader:.3048,zetaBeatrix:.1616},maskedCardScores:{barbaros:.7260,quickBlader:.4298,zetaBeatrix:.3042},maskedCardMeta:{barbaros:{supportRatio:.5},quickBlader:{supportRatio:.6},zetaBeatrix:{supportRatio:.4643}},visibility:{leftGap:28,rightGap:33,anchorRightSpanPx:46,rightVisibleRatio:33/46,rightOcclusionRatio:1-33/46}},
  {frameKey:'109.143',candidateCount:9,cardScores:{barbaros:.3595,quickBlader:.3070,zetaBeatrix:.1591},maskedCardScores:{barbaros:.7270,quickBlader:.4315,zetaBeatrix:.3035},maskedCardMeta:{barbaros:{supportRatio:.5},quickBlader:{supportRatio:.6},zetaBeatrix:{supportRatio:.4643}},visibility:{leftGap:28,rightGap:33,anchorRightSpanPx:46,rightVisibleRatio:33/46,rightOcclusionRatio:1-33/46}},
  {frameKey:'109.183',candidateCount:9,cardScores:{barbaros:.3563,quickBlader:.2905,zetaBeatrix:.1696},maskedCardScores:{barbaros:.7052,quickBlader:.4285,zetaBeatrix:.2956},maskedCardMeta:{barbaros:{supportRatio:.5},quickBlader:{supportRatio:.6},zetaBeatrix:{supportRatio:.5429}},visibility:{leftGap:28,rightGap:33,anchorRightSpanPx:46,rightVisibleRatio:33/46,rightOcclusionRatio:1-33/46}}
];

const success=aggregateVisibilityCardEvidence(successRows);
assert.equal(success.visibility.candidateCountMedian,5);
assert.equal(success.visibility.geometryLimited,false);
assert.equal(success.visibility.rightVisibleRatioMedian,1);
assert.equal(success.normal.top.id,'barbaros');
assert.equal(success.normal.top.median,.9405);
assert.equal(success.masked.top,null,'masked evidence is not needed when the card is fully visible');

const occluded=aggregateVisibilityCardEvidence(occludedRows);
assert.equal(occluded.visibility.candidateCountMedian,9);
assert.equal(occluded.visibility.geometryLimited,true);
assert.equal(+occluded.visibility.rightVisibleRatioMedian.toFixed(4),.7174);
assert.equal(occluded.normal.top.id,'barbaros');
assert.equal(occluded.normal.top.median,.3577);
assert.equal(occluded.masked.top.id,'barbaros');
assert.equal(occluded.masked.top.median,.7254);
assert.equal(+occluded.masked.top.margin.toFixed(4),.2958);
assert.equal(+occluded.recovery.gain.toFixed(4),.3677);
assert.equal(occluded.recovery.supportRatioMedian,.5);
assert.equal(occluded.confidence.rankAgreement,true);
assert.equal(occluded.confidence.rankPreservingRecovery,true);
assert.equal(occluded.confidence.rankConflict,false);
assert.equal(occluded.confidence.normalTopConsistency,1);
assert.equal(occluded.confidence.maskedTopConsistency,1);
assert.equal(+occluded.confidence.scoreGain.toFixed(4),.3677);
assert.equal(+occluded.confidence.marginGain.toFixed(4),.2403);
assert.ok(occluded.masked.top.median>occluded.normal.top.median+.35,'visible-region matching should preserve substantially more Barbaros evidence under 9-card overlap');

assert.ok(success.normal.top.median-occluded.normal.top.median>.58,'the normal ROI collapses sharply between the 5-card and 9-card layouts');
assert.ok(success.visibility.rightGapMedian>success.visibility.anchorRightSpanMedian);
assert.ok(occluded.visibility.rightGapMedian<occluded.visibility.anchorRightSpanMedian);

console.log('V5 BARBAROS CROSS-VIDEO VISIBILITY REGRESSION PASS');

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  V5_SHADOW_VERSION,
  fuseVisualEvidenceSources,
  aggregateFusedCardSlots,
  summarizeTrackEvidence
} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.8');
const validation=JSON.parse(fs.readFileSync(new URL('./v5-real-video-validation-cases.json',import.meta.url),'utf8'));
const negative=validation.negatives.find(x=>x.id==='validation-all-targets-absent-20260923-128.00');
assert.ok(negative);

const positiveSources={
  quickBlader:{
    normal:validation.positives.find(x=>x.cardId==='quickBlader').scores.normalMedian,
    left40:validation.positives.find(x=>x.cardId==='quickBlader').scores.left40Median,
    left50:validation.positives.find(x=>x.cardId==='quickBlader').scores.left50Median
  },
  zetaBeatrix:{
    normal:validation.positives.find(x=>x.cardId==='zetaBeatrix').scores.normal,
    left40:validation.positives.find(x=>x.cardId==='zetaBeatrix').scores.left40,
    left50:validation.positives.find(x=>x.cardId==='zetaBeatrix').scores.left50
  },
  barbaros:{
    normal:validation.positives.find(x=>x.cardId==='barbaros').scores.normal,
    left40:validation.positives.find(x=>x.cardId==='barbaros').scores.left40,
    left50:validation.positives.find(x=>x.cardId==='barbaros').scores.left50
  }
};

for(const cardId of Object.keys(positiveSources)){
  const pos=fuseVisualEvidenceSources(positiveSources[cardId]);
  const neg=fuseVisualEvidenceSources(negative.maxScores[cardId]);
  assert.equal(pos.sourceConsensus,true,`${cardId} real positive must have 2-of-3 source consensus`);
  assert.ok(pos.supportingCount>=2);
  assert.ok(pos.robustMedian>.94,`${cardId} fused positive median must remain above .94`);
  assert.equal(neg.sourceConsensus,false,`${cardId} real negative must not satisfy source consensus`);
  assert.equal(neg.supportingCount,0);
  assert.ok(neg.robustMedian<.45,`${cardId} fused real negative must remain below .45`);
  assert.ok(pos.robustMedian-neg.robustMedian>.50,`${cardId} fused positive/negative separation must exceed .50`);
  assert.equal(pos.applied,false);
  assert.equal(neg.applied,false);
}

// Dense Quick: one source collapses, but the two fixed visible strips agree.
const quickRows=['f1','f2','f3','f4'].map((frameKey,i)=>({
  videoKey:'dense-quick',
  visualFrameId:frameKey,
  slot:4,
  cardScores:{quickBlader:[.668,.672,.675,.671][i]},
  commonStrip40Scores:{quickBlader:[.944,.946,.948,.947][i]},
  commonStrip50Scores:{quickBlader:[.946,.948,.949,.947][i]}
}));
const quickFusion=aggregateFusedCardSlots(quickRows).find(x=>x.cardId==='quickBlader');
assert.ok(quickFusion);
assert.equal(quickFusion.distinctFrames,4);
assert.equal(quickFusion.sourceConsensusFrames,4);
assert.equal(quickFusion.sourceConsensusRatio,1);
assert.equal(quickFusion.shadowEligible,true);
assert.ok(quickFusion.scoreMedian>.945);
assert.equal(quickFusion.applied,false);

// Negative scene: stable low scores across time must stay ineligible.
const negativeRows=['n1','n2','n3','n4'].map((frameKey,i)=>({
  videoKey:'all-targets-absent',
  visualFrameId:frameKey,
  slot:1,
  cardScores:{quickBlader:[.43,.44,.45,.44][i]},
  commonStrip40Scores:{quickBlader:[.40,.42,.41,.43][i]},
  commonStrip50Scores:{quickBlader:[.42,.43,.44,.43][i]}
}));
const negativeFusion=aggregateFusedCardSlots(negativeRows).find(x=>x.cardId==='quickBlader');
assert.ok(negativeFusion);
assert.equal(negativeFusion.distinctFrames,4);
assert.equal(negativeFusion.sourceConsensusFrames,0);
assert.equal(negativeFusion.shadowEligible,false);
assert.ok(negativeFusion.scoreMax<.45);

// Same card may legitimately form multiple independent slot groups.
const duplicateRows=['d1','d2','d3'].flatMap((frameKey,i)=>[
  {videoKey:'duplicate',visualFrameId:frameKey,slot:2,cardScores:{barbaros:.94+i*.001},commonStrip40Scores:{barbaros:.95},commonStrip50Scores:{barbaros:.951}},
  {videoKey:'duplicate',visualFrameId:frameKey,slot:5,cardScores:{barbaros:.93+i*.001},commonStrip40Scores:{barbaros:.94},commonStrip50Scores:{barbaros:.942}}
]);
const duplicateFusion=aggregateFusedCardSlots(duplicateRows).filter(x=>x.cardId==='barbaros');
assert.equal(duplicateFusion.length,2,'fusion must preserve legitimate duplicate-card slot groups');
assert.deepEqual(duplicateFusion.map(x=>x.slot),[2,5]);
assert.equal(duplicateFusion.every(x=>x.shadowEligible),true);

const quickTrack=summarizeTrackEvidence(validation.tracking.find(x=>x.cardId==='quickBlader'));
assert.equal(quickTrack.slotChanged,true);
assert.equal(quickTrack.handCountChanged,true);
assert.ok(quickTrack.patchSimilarity>=.99);
assert.equal(quickTrack.imageFloorSupport,true);
assert.equal(quickTrack.applied,false);

for(const row of validation.tracking.filter(x=>x.cardId==='barbaros')){
  const track=summarizeTrackEvidence(row);
  assert.equal(track.slotChanged,true);
  assert.equal(track.handCountChanged,true);
  assert.ok(track.topScore>.90);
  assert.ok(track.margin>.50);
  assert.equal(track.imageFloorSupport,true);
  assert.equal(track.applied,false);
}

console.log(JSON.stringify({
  version:V5_SHADOW_VERSION,
  positiveCards:Object.keys(positiveSources),
  denseQuickEligible:quickFusion.shadowEligible,
  negativeEligible:negativeFusion.shadowEligible,
  duplicateSlots:duplicateFusion.map(x=>x.slot),
  trackingCases:validation.tracking.length
},null,2));
console.log('V5 FUSED EVIDENCE REGRESSION PASS');

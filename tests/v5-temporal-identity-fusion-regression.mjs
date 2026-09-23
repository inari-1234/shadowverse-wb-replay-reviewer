import assert from 'node:assert/strict';
import {
  V5_SHADOW_VERSION,
  distinctFrames,
  summarizeFrameIdentity,
  aggregateTemporalMedianCardSlots,
  shadowComparisonFromRecords
} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.10');

const actualRows=[
  {videoKey:'actual',visualFrameId:'vf-1',frameIdentitySource:'visual-frame-id',sampleTime:10.000,slot:4,cardScores:{quickBlader:.91},commonStrip40Scores:{quickBlader:.94},commonStrip50Scores:{quickBlader:.945}},
  {videoKey:'actual',visualFrameId:'vf-2',frameIdentitySource:'visual-frame-id',sampleTime:10.040,slot:4,cardScores:{quickBlader:.92},commonStrip40Scores:{quickBlader:.95},commonStrip50Scores:{quickBlader:.955}},
  // Same decoded frame observed again at another requested time: must not add a vote.
  {videoKey:'actual',visualFrameId:'vf-2',frameIdentitySource:'visual-frame-id',sampleTime:10.052,slot:4,cardScores:{quickBlader:.10},commonStrip40Scores:{quickBlader:.10},commonStrip50Scores:{quickBlader:.10}},
  {videoKey:'actual',visualFrameId:'vf-3',frameIdentitySource:'visual-frame-id',sampleTime:10.080,slot:4,cardScores:{quickBlader:.93},commonStrip40Scores:{quickBlader:.96},commonStrip50Scores:{quickBlader:.965}}
];

assert.equal(distinctFrames(actualRows).length,3,'same visualFrameId must count only once');
const actualIdentity=summarizeFrameIdentity(actualRows);
assert.equal(actualIdentity.observations,4);
assert.equal(actualIdentity.distinctFrames,3);
assert.equal(actualIdentity.duplicateObservations,1);
assert.equal(actualIdentity.actualIdentityFrames,3);
assert.equal(actualIdentity.timeFallbackFrames,0);
assert.equal(actualIdentity.actualIdentityRatio,1);
assert.equal(actualIdentity.identitySafe,true);
assert.deepEqual(actualIdentity.sourceCounts,{'visual-frame-id':3});

const temporal=aggregateTemporalMedianCardSlots(actualRows).find(x=>x.cardId==='quickBlader');
assert.ok(temporal);
assert.equal(temporal.distinctFrames,3);
assert.equal(temporal.temporalSources.normalMedian,.92);
assert.equal(temporal.temporalSources.left40Median,.95);
assert.equal(temporal.temporalSources.left50Median,.955);
assert.equal(temporal.fused.sourceConsensus,true);
assert.equal(temporal.fused.supportingCount,3);
assert.equal(temporal.temporalEligible,true);
assert.equal(temporal.identitySafeEligible,true);
assert.equal(temporal.applied,false);

const fallbackRows=[
  {videoKey:'fallback',frameKey:'11.000',frameIdentitySource:'sampleTime',sampleTime:11.000,slot:2,cardScores:{zetaBeatrix:.93},commonStrip40Scores:{zetaBeatrix:.95},commonStrip50Scores:{zetaBeatrix:.95}},
  {videoKey:'fallback',frameKey:'11.040',frameIdentitySource:'sampleTime',sampleTime:11.040,slot:2,cardScores:{zetaBeatrix:.94},commonStrip40Scores:{zetaBeatrix:.95},commonStrip50Scores:{zetaBeatrix:.96}},
  {videoKey:'fallback',frameKey:'11.080',frameIdentitySource:'sampleTime',sampleTime:11.080,slot:2,cardScores:{zetaBeatrix:.93},commonStrip40Scores:{zetaBeatrix:.96},commonStrip50Scores:{zetaBeatrix:.95}}
];
const fallback=aggregateTemporalMedianCardSlots(fallbackRows).find(x=>x.cardId==='zetaBeatrix');
assert.ok(fallback);
assert.equal(fallback.temporalEligible,true,'time-only data may still describe temporal evidence');
assert.equal(fallback.frameIdentity.identitySafe,false,'time-only evidence must not claim decoded-frame identity safety');
assert.equal(fallback.frameIdentity.actualIdentityFrames,0);
assert.equal(fallback.frameIdentity.timeFallbackFrames,3);
assert.equal(fallback.identitySafeEligible,false,'production-promotion evidence must require actual-frame identity');

const negativeRows=[
  {videoKey:'negative',visualFrameId:'n1',frameIdentitySource:'visual-frame-id',slot:1,cardScores:{barbaros:.43},commonStrip40Scores:{barbaros:.38},commonStrip50Scores:{barbaros:.41}},
  {videoKey:'negative',visualFrameId:'n2',frameIdentitySource:'visual-frame-id',slot:1,cardScores:{barbaros:.44},commonStrip40Scores:{barbaros:.39},commonStrip50Scores:{barbaros:.42}},
  {videoKey:'negative',visualFrameId:'n3',frameIdentitySource:'visual-frame-id',slot:1,cardScores:{barbaros:.42},commonStrip40Scores:{barbaros:.37},commonStrip50Scores:{barbaros:.40}}
];
const negative=aggregateTemporalMedianCardSlots(negativeRows).find(x=>x.cardId==='barbaros');
assert.ok(negative);
assert.equal(negative.fused.sourceConsensus,false);
assert.equal(negative.temporalEligible,false);
assert.equal(negative.identitySafeEligible,false);
assert.ok(negative.fused.robustMedian<.45);

const comparison=shadowComparisonFromRecords(actualRows);
assert.equal(comparison.version,'recognition-v5-shadow-0.10');
assert.equal(comparison.applied,false);
assert.equal(comparison.temporalMedianCardSlots.length,1);
assert.equal(comparison.temporalMedianCardSlots[0].identitySafeEligible,true);

console.log(JSON.stringify({
  version:V5_SHADOW_VERSION,
  dedupedFrames:actualIdentity.distinctFrames,
  duplicateObservations:actualIdentity.duplicateObservations,
  temporalSources:temporal.temporalSources,
  actualIdentitySafe:temporal.identitySafeEligible,
  fallbackIdentitySafe:fallback.identitySafeEligible,
  negativeEligible:negative.temporalEligible
},null,2));
console.log('V5 TEMPORAL IDENTITY FUSION REGRESSION PASS');

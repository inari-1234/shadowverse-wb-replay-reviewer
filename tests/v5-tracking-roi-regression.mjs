import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  V5_SHADOW_VERSION,
  fuseVisualEvidenceSources,
  summarizeFrameIdentity,
  evaluateTrackingTransition,
  evaluateTrackingSequence,
  shadowComparisonFromRecords
} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.10');
const data=JSON.parse(fs.readFileSync(new URL('./v5-tracking-roi-validation-cases.json',import.meta.url),'utf8'));
assert.equal(data.version,'v5-tracking-roi-validation-v1');
assert.equal(data.policy.applied,false);
assert.equal(data.policy.trackingMayOnlyInheritPreviouslyConfirmedIdentity,true);
assert.equal(data.policy.disappearanceVetoStopsInheritanceButDoesNotAssertAbsence,true);

const zeta=data.zetaHardPositive;
const initial=fuseVisualEvidenceSources(zeta.initialConfirmed.scores);
assert.equal(initial.sourceConsensus,true,'initial Zeta frame must be visually confirmable');
assert.equal(initial.supportingCount,3);

const hard=fuseVisualEvidenceSources(zeta.visualHardCase.scores);
assert.equal(hard.sourceConsensus,false,'new real-video Zeta hard case must defeat direct 2-of-3 visual fusion');
assert.equal(hard.supportingCount,1,'only left50 remains above the .90 floor in the hard case');

const temporal=fuseVisualEvidenceSources({
  normal:zeta.temporalHardCase.temporalMedians.normal,
  left40:zeta.temporalHardCase.temporalMedians.left40,
  left50:zeta.temporalHardCase.temporalMedians.left50
});
assert.equal(temporal.sourceConsensus,false,'temporal source medians alone must also fail on the hard Zeta window');
assert.equal(temporal.supportingCount,0);

const transitions=zeta.tracking.map(x=>evaluateTrackingTransition({cardId:'zetaBeatrix',...x}));
assert.equal(transitions.length,9);
assert.equal(transitions.every(x=>x.continuitySupported),true,'all visually reviewed Zeta continuation steps must support continuity');
assert.equal(transitions.every(x=>x.inheritanceAllowed),true,'a previously confirmed Zeta may inherit identity across all validated hard transitions');
assert.equal(transitions.every(x=>x.disappearanceVeto===false),true);
assert.equal(transitions.every(x=>x.state==='continue'),true);
assert.ok(Math.min(...transitions.map(x=>x.topScore))>=.802);
assert.ok(Math.min(...transitions.map(x=>x.margin))>=.426);

const noPrior=evaluateTrackingTransition({cardId:'zetaBeatrix',topScore:.95,margin:.55,priorConfirmed:false});
assert.equal(noPrior.continuitySupported,true,'strong tracking evidence may exist without prior confirmation');
assert.equal(noPrior.inheritanceAllowed,false,'tracking must never create a new card identity');
assert.equal(noPrior.state,'ambiguous');

const lost=evaluateTrackingTransition({cardId:'zetaBeatrix',...zeta.disappearance});
assert.equal(lost.disappearanceVeto,true,'real disappearance transition must veto identity inheritance');
assert.equal(lost.inheritanceAllowed,false);
assert.equal(lost.state,'lost');
assert.equal('absent' in lost,false,'tracking loss must not be promoted to an absence claim');

const seq=evaluateTrackingSequence([
  ...zeta.tracking.map(x=>({cardId:'zetaBeatrix',...x})),
  {cardId:'zetaBeatrix',...zeta.disappearance}
],{initialConfirmed:true});
assert.equal(seq.initialConfirmed,true);
assert.equal(seq.lost,true);
assert.equal(seq.finalConfirmed,false,'a disappearance veto must end inherited confirmation');
assert.equal(seq.steps.slice(0,-1).every(x=>x.state==='continue'),true);
assert.equal(seq.steps.at(-1).state,'lost');
assert.equal(seq.applied,false);

const roiRows=data.roiIdentity.sequence.map(x=>({
  videoKey:data.sourceVideo,
  visualFrameId:x.visualFrameId,
  imageHash:x.frameSha256,
  frameIdentitySource:'visual-frame-id',
  roiAppearanceId:x.roiAppearanceId,
  sampleTime:x.time
}));
const roiIdentity=summarizeFrameIdentity(roiRows);
assert.equal(roiIdentity.distinctFrames,5,'all five decoded video frames are distinct');
assert.equal(roiIdentity.actualIdentityFrames,5);
assert.equal(roiIdentity.identitySafe,true);
assert.equal(roiIdentity.roiAppearanceFrames,5);
assert.equal(roiIdentity.distinctRoiAppearances,4,'the final two decoded frames share the same hand ROI appearance');
assert.equal(roiIdentity.duplicateRoiAppearances,1);
assert.equal(roiIdentity.roiAppearanceRatio,.8);

const comparison=shadowComparisonFromRecords([],{
  tracking:[
    {cardId:'zetaBeatrix',topScore:.879,margin:.504,priorConfirmed:true},
    {cardId:'zetaBeatrix',...zeta.disappearance}
  ]
});
assert.equal(comparison.version,'recognition-v5-shadow-0.10');
assert.equal(comparison.applied,false);
assert.equal(comparison.tracking.length,2);
assert.equal(comparison.tracking[0].state,'continue');
assert.equal(comparison.tracking[1].state,'lost');
assert.equal(comparison.tracking.every(x=>x.applied===false),true);

console.log(JSON.stringify({
  version:V5_SHADOW_VERSION,
  hardVisualSupportingSources:hard.supportingSources,
  temporalSupportingSources:temporal.supportingSources,
  trackingContinuationSteps:transitions.length,
  weakestTrackingTop:+Math.min(...transitions.map(x=>x.topScore)).toFixed(3),
  weakestTrackingMargin:+Math.min(...transitions.map(x=>x.margin)).toFixed(3),
  disappearanceState:lost.state,
  decodedFrames:roiIdentity.distinctFrames,
  roiAppearances:roiIdentity.distinctRoiAppearances
},null,2));
console.log('V5 TRACKING ROI REGRESSION PASS');

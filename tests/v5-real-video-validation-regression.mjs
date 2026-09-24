import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fuseVisualEvidenceSources,V5_SHADOW_VERSION} from '../experiments/recognition-v5-shadow.mjs';

const data=JSON.parse(fs.readFileSync(new URL('./v5-real-video-validation-cases.json',import.meta.url),'utf8'));
assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.10');
assert.equal(data.version,'v5-real-video-evidence-v2');
assert.equal(data.policy.validation,false,'score snapshots without committed raw media must not claim E2E validation');
assert.equal(data.policy.snapshotOnly,true);
assert.equal(data.policy.diagnosticOnly,true);
assert.equal(data.policy.applied,false);
assert.equal(data.policy.rawFixtureRequiredForValidationClaim,true);
assert.equal(data.pipeline.visualFloor,.90);

const cards=['quickBlader','zetaBeatrix','barbaros'];
const sha=/^[0-9a-f]{64}$/;
for(const [key,source] of Object.entries(data.sources||{})){
  assert.match(source.sha256,sha,`${key} must pin source-video byte identity`);
  assert.ok(source.size>0&&source.duration>0&&source.width>0&&source.height>0&&source.fps>0);
  assert.equal(source.canonicalWidth,1200);
}

const positives=new Map(data.positives.map(x=>[x.cardId,x]));
assert.equal(positives.size,3);
for(const id of cards){
  const row=positives.get(id);
  assert.ok(row,`${id} must have current-upload positive evidence`);
  assert.equal(row.groundTruth,'present');
  assert.equal(row.validation,false);
  assert.equal(row.applied,false);
  assert.equal(row.evidenceClass,'current-upload-frame-hash-snapshot');
  assert.ok(data.sources[row.source],`${id} must reference a pinned source`);
  assert.ok(row.frames.length>=4,`${id} must retain multiple distinct frame observations`);
  for(const frame of row.frames)assert.match(frame.framePngSha256,sha,`${id} frame must retain image hash`);
  const median=fuseVisualEvidenceSources(row.medianScores,data.pipeline.visualFloor);
  assert.equal(median.sourceConsensus,true,`${id} median evidence must satisfy source consensus`);
}

const negative=data.negatives.find(x=>x.id==='all-targets-absent-10s');
assert.ok(negative,'replacement true-negative evidence must exist');
assert.equal(negative.validation,false);
assert.equal(negative.applied,false);
assert.equal(negative.evidenceClass,'current-upload-frame-hash-snapshot');
assert.ok(data.sources[negative.source]);
assert.ok(cards.every(id=>negative.groundTruthAbsent.includes(id)));
assert.ok(negative.frames.length>=4);
for(const frame of negative.frames)assert.match(frame.framePngSha256,sha,'negative frame must retain image hash');
for(const id of cards){
  const fused=fuseVisualEvidenceSources(negative.globalMaxScores[id],data.pipeline.visualFloor);
  assert.equal(fused.sourceConsensus,false,`${id} global negative maximum must remain below consensus`);
  assert.equal(fused.supportingCount,0);
}

const invalidated=data.invalidatedEvidence.find(x=>x.id==='validation-all-targets-absent-20260923-128.00');
assert.ok(invalidated,'the unreproducible v1 negative must remain explicitly retired for auditability');
assert.equal(invalidated.validation,false);
assert.match(invalidated.reason,/not reproducible/i);

assert.ok(data.historicalSnapshots.tracking.length>=3);
assert.equal(data.historicalSnapshots.tracking.every(x=>x.validation===false&&x.applied===false),true);
assert.equal(data.historicalSnapshots.frameIdentity.validation,false);

console.log(JSON.stringify({
  evidenceVersion:data.version,
  validationClaim:data.policy.validation,
  sourceVideos:Object.keys(data.sources).length,
  positiveCards:cards,
  negativeFrames:negative.frames.length,
  invalidatedEvidence:data.invalidatedEvidence.map(x=>x.id),
  historicalTracking:data.historicalSnapshots.tracking.length
},null,2));
console.log('V5 REAL-VIDEO EVIDENCE SNAPSHOT REGRESSION PASS');

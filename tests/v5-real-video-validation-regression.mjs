import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const data=JSON.parse(fs.readFileSync(new URL('v5-real-video-validation-cases.json',root),'utf8'));

assert.equal(data.version,'v5-real-video-validation-v1');
assert.equal(data.policy.validation,true);
assert.equal(data.policy.diagnosticOnly,true);
assert.equal(data.policy.applied,false);
assert.equal(data.policy.requirePositiveAndNegativePerCard,true);

const cards=['quickBlader','zetaBeatrix','barbaros'];
const positives=new Map(data.positives.map(x=>[x.cardId,x]));
const negativeScene=data.negatives.find(x=>Array.isArray(x.groundTruthAbsent)&&cards.every(id=>x.groundTruthAbsent.includes(id)));
assert.ok(negativeScene,'one real-video scene must ground-truth all three target cards as absent');

for(const id of cards){
  assert.ok(positives.has(id),`${id} must have a real-video positive validation snapshot`);
  assert.ok(negativeScene.maxScores?.[id],`${id} must have a real-video negative validation snapshot`);
}

const quick=positives.get('quickBlader');
assert.ok(quick.scores.normalMedian<.75,'dense Quick must retain the observed weak normal-anchor condition');
assert.ok(quick.scores.left40Median>.94,'dense Quick left40 must retain strong visible-strip evidence');
assert.ok(quick.scores.left50Median>.94,'dense Quick left50 must retain strong visible-strip evidence');

const zeta=positives.get('zetaBeatrix');
assert.ok(zeta.scores.normal>.92);
assert.ok(zeta.scores.left40>.94);
assert.ok(zeta.scores.left50>.94);

const barbaros=positives.get('barbaros');
assert.ok(barbaros.scores.normal>.95);
assert.ok(barbaros.scores.left40>.95);
assert.ok(barbaros.scores.left50>.95);

for(const id of cards){
  const neg=negativeScene.maxScores[id];
  assert.ok(neg.normal<.45,`${id} real negative normal score must stay below .45`);
  assert.ok(neg.left40<.45,`${id} real negative left40 score must stay below .45`);
  assert.ok(neg.left50<.45,`${id} real negative left50 score must stay below .45`);
}

const commonStripPositive={
  quickBlader:{left40:quick.scores.left40Median,left50:quick.scores.left50Median},
  zetaBeatrix:{left40:zeta.scores.left40,left50:zeta.scores.left50},
  barbaros:{left40:barbaros.scores.left40,left50:barbaros.scores.left50}
};
for(const id of cards){
  const neg=negativeScene.maxScores[id];
  const pos=commonStripPositive[id];
  assert.ok(pos.left40-neg.left40>.50,`${id} left40 positive/negative separation must exceed .50`);
  assert.ok(pos.left50-neg.left50>.50,`${id} left50 positive/negative separation must exceed .50`);
}

const quickTrack=data.tracking.find(x=>x.cardId==='quickBlader');
assert.ok(quickTrack);
assert.notEqual(quickTrack.from.slot,quickTrack.to.slot,'Quick validation must cross a slot-number change');
assert.notEqual(quickTrack.from.handCount,quickTrack.to.handCount,'Quick validation must cross a hand-count change');
assert.ok(quickTrack.patchSimilarity>=.99,'Quick patch identity must survive the hand-count transition');

const barbarosTracks=data.tracking.filter(x=>x.cardId==='barbaros');
assert.ok(barbarosTracks.length>=2);
for(const row of barbarosTracks){
  assert.notEqual(row.from.slot,row.to.slot,'Barbaros validation must cross a slot-number change');
  assert.notEqual(row.from.handCount,row.to.handCount,'Barbaros validation must cross a hand-count change');
  assert.ok(row.topScore>.90,'Barbaros tracked identity must remain a strong top match');
  assert.ok(row.margin>.50,'Barbaros tracked identity must remain well separated from the runner-up');
}

const dup=data.frameIdentity.measuredDuplicateRates;
assert.ok(dup['0.012']>.60,'12ms probes should retain the observed high same-frame rate');
assert.ok(dup['0.020']>.35,'20ms probes should retain the observed same-frame risk');
assert.equal(dup['0.040'],0,'40ms stable-window samples were distinct in the uploaded validation video');

console.log(JSON.stringify({
  validationVersion:data.version,
  cards,
  positiveCoverage:cards.length,
  negativeCoverage:cards.length,
  trackingCases:data.tracking.length,
  commonStripSeparation:Object.fromEntries(cards.map(id=>[
    id,
    {
      left40:+(commonStripPositive[id].left40-negativeScene.maxScores[id].left40).toFixed(4),
      left50:+(commonStripPositive[id].left50-negativeScene.maxScores[id].left50).toFixed(4)
    }
  ]))
},null,2));
console.log('V5 REAL-VIDEO VALIDATION REGRESSION PASS');

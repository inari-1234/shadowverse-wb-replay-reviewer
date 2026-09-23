import assert from 'node:assert/strict';
import {aggregateCommonStripComparisons,V5_SHADOW_VERSION} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.8');

const source={
  fixture:'shadowverse-wb-hand-fixture-v4.13.48-2026-09-21T0801.json',
  video:'ScreenRecording_09-14-2026 21-19-26_1.mp4',
  baseTime:131.889,
  evidenceClass:'observed-raw-fixture-calibration-snapshot',
  validation:false,
  groundTruth:{slot:7,cardId:'zetaBeatrix'}
};

const frames=[
  {time:131.769,left40:[.3559,.2244,.4560,.1338,.4187,.5083,.3650,.9197],left50:[.3355,.2578,.3739,.1038,.3715,.4320,.3405,.9245]},
  {time:131.809,left40:[.4342,.2287,.4522,.1313,.4637,.5076,.3644,.9162],left50:[.3647,.2405,.4206,.0987,.4125,.4275,.3270,.9213]},
  {time:131.849,left40:[.4414,.2331,.4548,.1336,.5192,.5033,.3659,.9233],left50:[.3718,.2400,.4228,.1036,.4561,.4223,.3314,.9229]},
  {time:131.889,left40:[.3999,.2310,.4624,.1357,.5200,.5035,.3593,.9240],left50:[.3392,.2450,.3745,.1099,.4555,.4219,.3300,.9242]}
];

const records=frames.flatMap(frame=>frame.left40.map((_,slot)=>({
  videoKey:source.video,
  frameKey:String(frame.time),
  sampleTime:frame.time,
  slot,
  commonStrip40Scores:{zetaBeatrix:frame.left40[slot]},
  commonStrip50Scores:{zetaBeatrix:frame.left50[slot]}
})));

const comparisons=aggregateCommonStripComparisons(records);
const left40=comparisons.left40.find(x=>x.cardId==='zetaBeatrix');
const left50=comparisons.left50.find(x=>x.cardId==='zetaBeatrix');

assert.ok(left40&&left50);
assert.equal(left40.dominantSlot,7);
assert.equal(left50.dominantSlot,7);
assert.equal(left40.dominantFrameRatio,1);
assert.equal(left50.dominantFrameRatio,1);

assert.equal(left40.topScoreMedian,.9215);
assert.equal(+left50.topScoreMedian.toFixed(5),.92355);
assert.equal(+left40.slotMarginMedian.toFixed(4),.4063);
assert.equal(+left50.slotMarginMedian.toFixed(4),.4806);
assert.equal(+left40.slotMarginMin.toFixed(4),.4040);
assert.equal(+left50.slotMarginMin.toFixed(4),.4668);

assert.deepEqual(left40.slotWinnerCounts,{'7':4});
assert.deepEqual(left50.slotWinnerCounts,{'7':4});
assert.ok(left40.frames.every(x=>x.topSlot===7));
assert.ok(left50.frames.every(x=>x.topSlot===7));

console.log('V5 ZETA COMMON STRIP RAW-FIXTURE REGRESSION PASS');

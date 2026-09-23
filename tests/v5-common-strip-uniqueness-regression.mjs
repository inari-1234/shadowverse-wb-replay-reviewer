import assert from 'node:assert/strict';
import {aggregateCommonStripUniqueness,aggregateCommonStripComparisons,V5_SHADOW_VERSION} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.9');

const uniqueRecords=[
  {videoKey:'v',frameKey:'f1',slot:0,commonStrip40Scores:{barbaros:.31},commonStrip50Scores:{barbaros:.33}},
  {videoKey:'v',frameKey:'f1',slot:1,commonStrip40Scores:{barbaros:.45},commonStrip50Scores:{barbaros:.47}},
  {videoKey:'v',frameKey:'f1',slot:2,commonStrip40Scores:{barbaros:.82},commonStrip50Scores:{barbaros:.84}},
  {videoKey:'v',frameKey:'f2',slot:0,commonStrip40Scores:{barbaros:.30},commonStrip50Scores:{barbaros:.32}},
  {videoKey:'v',frameKey:'f2',slot:1,commonStrip40Scores:{barbaros:.44},commonStrip50Scores:{barbaros:.46}},
  {videoKey:'v',frameKey:'f2',slot:2,commonStrip40Scores:{barbaros:.81},commonStrip50Scores:{barbaros:.83}},
  {videoKey:'v',frameKey:'f3',slot:0,commonStrip40Scores:{barbaros:.29},commonStrip50Scores:{barbaros:.31}},
  {videoKey:'v',frameKey:'f3',slot:1,commonStrip40Scores:{barbaros:.43},commonStrip50Scores:{barbaros:.45}},
  {videoKey:'v',frameKey:'f3',slot:2,commonStrip40Scores:{barbaros:.83},commonStrip50Scores:{barbaros:.85}}
];
const u40=aggregateCommonStripUniqueness(uniqueRecords,{scoreField:'commonStrip40Scores'});
assert.equal(u40.length,1);
assert.equal(u40[0].cardId,'barbaros');
assert.equal(u40[0].dominantSlot,2);
assert.equal(u40[0].dominantFrameRatio,1);
assert.equal(u40[0].topScoreMedian,.82);
assert.equal(+u40[0].slotMarginMedian.toFixed(2),.37);
assert.equal(+u40[0].slotMarginMin.toFixed(2),.37);

const ambiguous=[
  {videoKey:'v2',frameKey:'a',slot:0,commonStrip40Scores:{zeta:.61},commonStrip50Scores:{zeta:.62}},
  {videoKey:'v2',frameKey:'a',slot:1,commonStrip40Scores:{zeta:.63},commonStrip50Scores:{zeta:.64}},
  {videoKey:'v2',frameKey:'b',slot:0,commonStrip40Scores:{zeta:.65},commonStrip50Scores:{zeta:.66}},
  {videoKey:'v2',frameKey:'b',slot:1,commonStrip40Scores:{zeta:.62},commonStrip50Scores:{zeta:.63}},
  {videoKey:'v2',frameKey:'c',slot:0,commonStrip40Scores:{zeta:.60},commonStrip50Scores:{zeta:.61}},
  {videoKey:'v2',frameKey:'c',slot:1,commonStrip40Scores:{zeta:.64},commonStrip50Scores:{zeta:.65}}
];
const a40=aggregateCommonStripUniqueness(ambiguous,{scoreField:'commonStrip40Scores'})[0];
assert.equal(a40.dominantSlot,1);
assert.equal(+a40.dominantFrameRatio.toFixed(4),.6667);
assert.ok(a40.slotMarginMedian<.04,'ambiguous cross-slot evidence must retain its weak separation');

const both=aggregateCommonStripComparisons([...uniqueRecords,...ambiguous]);
assert.equal(both.left40.length,2);
assert.equal(both.left50.length,2);
assert.equal(both.left50.find(x=>x.videoKey==='v').dominantSlot,2);

console.log('V5 COMMON STRIP UNIQUENESS REGRESSION PASS');

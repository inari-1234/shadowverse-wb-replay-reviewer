import assert from 'node:assert/strict';
import {aggregateClassScores,aggregateCostEvidence,distinctFrames,median,shadowComparison,V5_SHADOW_VERSION} from '../experiments/recognition-v5-shadow.mjs';

assert.equal(V5_SHADOW_VERSION,'recognition-v5-shadow-0.1');
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
  {frameKey:'a',templateScores:{7:.67},diagnostic6Score:.9815,ocrValue:3,ocrConfidence:62},
  {frameKey:'b',templateScores:{7:.66},diagnostic6Score:.9848,ocrValue:6,ocrConfidence:37},
  {frameKey:'c',templateScores:{7:.65},diagnostic6Score:.9855,ocrValue:6,ocrConfidence:43}
]);
assert.equal(cost.mode,'shadow');
assert.equal(cost.applied,false);
assert.equal(cost.visual.top.id,'6');
assert.ok(cost.visual.top.median>.98);
assert.equal(cost.ocr.top.id,'6');
assert.equal(cost.disagreement,false);

const conflict=aggregateCostEvidence([
  {frameKey:'a',diagnostic6Score:.982,ocrValue:3,ocrConfidence:80},
  {frameKey:'b',diagnostic6Score:.984,ocrValue:3,ocrConfidence:80},
  {frameKey:'c',diagnostic6Score:.985,ocrValue:6,ocrConfidence:20}
]);
assert.equal(conflict.visual.top.id,'6');
assert.equal(conflict.ocr.top.id,'3');
assert.equal(conflict.disagreement,true,'shadow evaluator must preserve OCR-vs-visual conflicts instead of silently resolving them');

const full=shadowComparison({legacy:{recognized:false},costRows:[{frameKey:'a',diagnostic6Score:.99}],cardRows:[{frameKey:'a',cardScores:{zeta:.9,quick:.3}}]});
assert.equal(full.mode,'shadow');
assert.equal(full.applied,false);
assert.equal(full.legacy.recognized,false);
assert.equal(full.cards.top.id,'zeta');

console.log('V5 SHADOW RECOGNITION REGRESSION PASS');

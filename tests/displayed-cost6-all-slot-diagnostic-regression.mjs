import fs from 'node:fs';
import assert from 'node:assert/strict';

const hand=fs.readFileSync(new URL('../hand-recognition.js',import.meta.url),'utf8');

assert.ok(hand.includes("diagnosticCostVariants=displayedCostFeatureVariants(canvas,center),diagnostic6Probe=matchDisplayedCostDiagnosticFeatures(diagnosticCostVariants,6)"),
  'every detected hand slot must get the diagnostic-only cost6 feature probe');
assert.ok(hand.includes("template:{accepted:false,value:null,score:null,threshold:null,reason:'not-run'},diagnostic6Probe"),
  'slots below the live cost-read gate must still retain cost6 diagnostic evidence');
assert.ok(hand.includes("if(shouldReadCost)displayedCost=await readDisplayedCost(canvas,center,worker,diagnosticCostVariants,diagnostic6Probe)"),
  'live OCR reads must remain gated by shouldReadCost and reuse cached diagnostic features');

const observeStart=hand.indexOf('async function observeHandFrame');
const decideStart=hand.indexOf('function decideHandSamples',observeStart);
assert.ok(observeStart>=0&&decideStart>observeStart,'observeHandFrame source block must be extractable');
const observe=hand.slice(observeStart,decideStart);
assert.equal((observe.match(/await readDisplayedCost\(/g)||[]).length,1,'observeHandFrame must have exactly one live displayed-cost read path');
assert.ok(observe.includes('if(shouldReadCost)displayedCost=await readDisplayedCost('),'displayed-cost OCR path must stay conditionally gated');

const resolveStart=hand.indexOf('function resolveDisplayedCost');
const resolveEnd=hand.indexOf('function ocrConfidenceForAccepted',resolveStart);
assert.ok(resolveStart>=0&&resolveEnd>resolveStart,'resolveDisplayedCost source block must be extractable');
assert.equal(hand.slice(resolveStart,resolveEnd).includes('diagnostic6Probe'),false,'cost6 diagnostics must not affect live cost resolution');

const selectStart=hand.indexOf('function selectCostScopedMatch');
const selectEnd=hand.indexOf('function resolveCostGate',selectStart);
assert.ok(selectStart>=0&&selectEnd>selectStart,'selectCostScopedMatch source block must be extractable');
assert.equal(hand.slice(selectStart,selectEnd).includes('diagnostic6Probe'),false,'cost6 diagnostics must not affect card selection');

console.log('DISPLAYED COST 6 ALL-SLOT DIAGNOSTIC REGRESSION PASS');

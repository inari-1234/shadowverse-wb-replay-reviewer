import fs from 'node:fs';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../coach-integration.js',import.meta.url),'utf8'),cf=fs.readFileSync(new URL('../counterfactual-review.js',import.meta.url),'utf8'),sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
for(const api of ['ingestDecision','getForWindow','presentationModel','createCard','decorate','snapshot','clear'])assert.match(src,new RegExp(api));
for(const required of ['comparison-decision-ready','CoachExplanation','P-D1','data-comparison-coach','Meaningful Alternative','Alternativeが有力になる条件','__wbComparisonCoachV1'])assert.ok(src.includes(required),required);
for(const forbidden of ['generateLegalActions','applyAction(','getPlayerView(','getTerminalStatus(','stateFingerprint(','OutcomeBacktracking.create','ComparisonDecision.evaluateDecision','ComparisonDecision.compareCandidates','rankCandidates('])assert.equal(src.includes(forbidden),false,`P-E2 recomputation forbidden: ${forbidden}`);
assert.ok(cf.includes("./coach-integration.js"));assert.ok(cf.includes('loadCoachIntegration'));
assert.ok(sw.includes("'./coach-explanation.js'"));assert.ok(sw.includes("'./coach-integration.js'"));
assert.equal(src.includes('innerHTML='),false,'comparison coach content must use textContent/DOM APIs');
console.log('P-E2 STATIC VALIDATION PASS');
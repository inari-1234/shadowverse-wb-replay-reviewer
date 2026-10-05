import fs from 'node:fs';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../runtime-decision-pipeline.js',import.meta.url),'utf8');
for(const required of ['registerAuthority','authorityStatus','evaluateWindow','evaluateSession','evaluateOutcomes','LegalActionSequence.create','OutcomeBacktracking.create','evaluateSequences','ComparisonDecision.evaluateDecision','comparison-decision-ready','match-analysis-complete','runtime-decision-hold','P-A1->P-C1->P-D1->P-E1/P-E2'])assert.ok(src.includes(required),required);
for(const forbidden of ['ReviewEngine.calculate','deriveWindowCoach','damageAmount:15','forcedScore','weightedScore','score +=','score+=','innerHTML='])assert.equal(src.includes(forbidden),false,`P-F1 authority/recompute violation: ${forbidden}`);
assert.ok(src.includes("AUTHORITY_MISSING"));assert.ok(src.includes("POSITION_STATE_UNAVAILABLE"));assert.ok(src.includes("getPositionState"));
assert.ok(src.includes("stateAdapter"));assert.ok(src.includes("ruleEngine"));assert.ok(src.includes("applyCoreAction"));assert.ok(src.includes("resolveAfterAction"));
assert.ok(src.includes("sourceAuthority:'P-C1->P-D1'"));assert.ok(src.includes("sourceAuthority:'P-F1/P-D1'"));
console.log('P-F1 STATIC VALIDATION PASS');
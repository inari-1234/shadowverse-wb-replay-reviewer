import fs from 'node:fs';import assert from 'node:assert/strict';const src=fs.readFileSync(new URL('../comparison-decision.js',import.meta.url),'utf8');
for(const api of ['compareCandidates','evaluateDecision','rankCandidates','selectMeaningfulAlternative','extractCriticalDifferences'])assert.match(src,new RegExp(api));
for(const cls of ['DOMINATES','TRADE_OFF','CONTEXT_DEPENDENT','EQUIVALENT','INSUFFICIENT_EVIDENCE'])assert.ok(src.includes(cls));
for(const axis of ['IMMEDIATE_PRESSURE','FUTURE_LETHAL','BOARD_TEMPO','OPPONENT_BENEFIT_RISK','RESOURCE_ECONOMY','SURVIVAL','CONTINUATION_QUALITY','UNCERTAINTY'])assert.ok(src.includes(axis));
for(const field of ['persistentResources','temporaryResources','outcomeDepth','RESOURCE_CONTEXT_DEPENDENT'])assert.ok(src.includes(field));
for(const forbidden of ['generateLegalActions','applyAction(','getPlayerView(','getTerminalStatus(','stateFingerprint('])assert.equal(src.includes(forbidden),false,forbidden);
assert.equal(/damage\s*\*\s*\d/i.test(src),false);assert.equal(/board\s*\*\s*\d/i.test(src),false);
console.log('P-D1 STATIC VALIDATION PASS');

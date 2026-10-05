import fs from 'node:fs';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../coach-explanation.js',import.meta.url),'utf8');
for(const api of ['buildExplanation','renderCoachText','explainDecision','explainPairwise'])assert.match(src,new RegExp(api));
for(const mode of ['DECISIVE','TRADE_OFF','CONTEXT_DEPENDENT','EQUIVALENT','INSUFFICIENT_EVIDENCE'])assert.ok(src.includes(mode));
for(const forbidden of ['generateLegalActions','applyAction(','getPlayerView(','getTerminalStatus(','stateFingerprint(','OutcomeBacktracking.create','ComparisonDecision.evaluateDecision','ComparisonDecision.compareCandidates'])assert.equal(src.includes(forbidden),false,forbidden);
for(const card of ['barbaros','zetaBeatrix','quickBlader'])assert.equal(src.includes(card),false,`card-specific inference forbidden: ${card}`);
assert.equal(/damage\s*\*\s*\d/i.test(src),false);assert.equal(/Math\.random/.test(src),false);
for(const code of ['UNKNOWN_HAND_DEPENDENCY','UNKNOWN_DRAW_DEPENDENCY','UNKNOWN_RULE','UNKNOWN_ORDERING','OPPONENT_DRAIN_RISK'])assert.ok(src.includes(code));
console.log('P-E1 STATIC VALIDATION PASS');
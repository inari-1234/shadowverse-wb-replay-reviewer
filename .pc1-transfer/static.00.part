import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../outcome-backtracking.js',import.meta.url),'utf8');
const WB={registerModule(){}};
const sandbox={window:{WB},console};
vm.createContext(sandbox);
new vm.Script(source,{filename:'outcome-backtracking.js'}).runInContext(sandbox);
const P=WB.OutcomeBacktracking;
assert.ok(P,'OutcomeBacktracking module must register');
assert.equal(P.version,'pc1-outcome-backtracking-v1.0.0');
for(const group of ['LETHAL_STATUS','SURVIVAL_STATUS','RESPONSE_TYPE','DRAW_STATUS','REASON']){
 const vals=Object.values(P[group]);
 assert.equal(new Set(vals).size,vals.length,`${group} values must be unique`);
}
assert.equal(typeof P.create,'function');
for(const token of ['generateLegalActions','applyAction','stateFingerprint','INDETERMINATE_RULE_ORDER','UNKNOWN_OPPONENT_RESPONSE','UNKNOWN_DRAW','maxDepth','maxNodes','maxBranches','maxOpponentResponses','maxContinuations','maxTurns','CYCLE_DETECTED','DUPLICATE_STATE','TERMINAL_PRUNED','MEMO_HIT'])assert.ok(source.includes(token),`missing contract/search token ${token}`);
for(const forbidden of ['applyCoreAction(','Math.random(','new Function(','eval('])assert.equal(source.includes(forbidden),false,`P-C1 must not duplicate core rules or use unsafe fallback: ${forbidden}`);
assert.ok(source.includes("a.legality!=='LEGAL'"),'non-LEGAL P-A1 input must be rejected');
assert.ok(source.includes('LETHAL_UNKNOWN')&&source.includes('SURVIVAL_UNKNOWN'),'unknown outcome states must remain explicit');
assert.ok(source.includes('OUTCOME_EVENT_AUTHORITY_MISSING'),'missing drain/heal event authority must not be silently guessed');
assert.ok(source.includes('EXACT_STATE_DOMINANCE_PRUNED'),'dominance pruning must be conservative exact-state only');
console.log('P-C1 static validation PASS');

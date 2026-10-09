import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const fixture=JSON.parse(fs.readFileSync(path.join(here,'pf1r2-0923-offline-expected-fixture.json'),'utf8'));
const expected=fixture.expected.visibleTradeOff;

// First bind this semantic check to the full production-path offline fixture.
const production=spawnSync(process.execPath,[path.join(here,'pf1r2-0923-offline-expected-regression.mjs')],{encoding:'utf8'});
assert.equal(production.status,0,`production offline fixture failed\n${production.stdout}\n${production.stderr}`);
const goldenLine=production.stdout.split(/\r?\n/).find(x=>x.startsWith('OFFLINE_GOLDEN '));
assert.ok(goldenLine,'OFFLINE_GOLDEN missing from production-path fixture');
const golden=JSON.parse(goldenLine.slice('OFFLINE_GOLDEN '.length));
assert.equal(golden.recommendedCandidate,expected.recommendedCandidate);
assert.equal(golden.comparisonClass,expected.classification);
assert.deepEqual(golden.tradeOffAxes,expected.intraAxisTradeOffAxes);
assert.equal(golden.playedMoveStatus,fixture.expected.playedMoveStatus);
assert.equal(golden.reasonDirection,fixture.expected.reasonDirection);

// Then prove why Best is absent: visible BOARD_TEMPO vs RESOURCE_ECONOMY,
// not common hidden-opponent uncertainty and not an intra-axis contradiction.
const WB={registerModule(){}};
const sandbox={window:{WB},console};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(path.join(here,'..','comparison-decision.js'),'utf8'),{filename:'comparison-decision.js'}).runInContext(sandbox);
const D=WB.ComparisonDecision;
const hiddenAuthority={status:'UNRESOLVED',reasons:['UNKNOWN_OPPONENT_RESPONSE','UNKNOWN_HIDDEN_BOARD']};
const commonUnknown=['OPPONENT_RESPONSE_UNKNOWN_HAND','UNKNOWN_OPPONENT_RESPONSE'];
const base={
  status:'LIMIT',turnEnded:true,lethalStatus:'LETHAL_UNKNOWN',survivalStatus:'POSSIBLE_SURVIVAL',
  damageAmount:0,leaderHP:20,opponentLeaderHP:16,
  opponentResponses:[{responseType:'UNKNOWN_HAND_DEPENDENT_RESPONSE',opponentDrainAmount:0,opponentHealAmount:0,uncertainty:['OPPONENT_RESPONSE_UNKNOWN_HAND']}],
  continuations:[],ruleAuthority:hiddenAuthority,uncertainty:commonUnknown,
  futureOutcome:{drawStatus:'NO_DRAW_EVIDENCE',search:{truncated:false,unknownReasonCodes:['UNKNOWN_OPPONENT_RESPONSE']}}
};
const quick={...base,sequenceId:'quick-evolve',boardState:{followerCount:1,totalAttack:3,totalDefense:3,wardCount:0,nextTurnAttackPotential:3},resourceRemaining:{pp:1,ep:0,sep:0,handCount:2},resourceSpend:{pp:1,ep:1,sep:0,hand:1}};
const idle={...base,sequenceId:'idle',boardState:{followerCount:0,totalAttack:0,totalDefense:0,wardCount:0,nextTurnAttackPotential:0},resourceRemaining:{pp:2,ep:1,sep:0,handCount:3},resourceSpend:{pp:0,ep:0,sep:0,hand:0}};
const comparison=D.compareCandidates(quick,idle);
assert.equal(comparison.classification,D.CLASSIFICATION.TRADE_OFF);
assert.equal(comparison.preferredCandidateId,null);
assert.equal(comparison.axisResults[expected.quickBetterAxis],D.AXIS_RESULT.A_BETTER);
assert.equal(comparison.axisResults[expected.idleBetterAxis],D.AXIS_RESULT.B_BETTER);
assert.deepEqual(Array.from(comparison.tradeOffAxes),expected.intraAxisTradeOffAxes);
assert.equal(comparison.normalized.a.uncertainty.unknownHand,true);
assert.equal(comparison.normalized.b.uncertainty.unknownHand,true);
assert.equal(comparison.normalized.a.uncertainty.unknownRule,false);
assert.equal(comparison.normalized.b.uncertainty.unknownRule,false);
assert.equal(comparison.uncertainty.common.unknownHand,true);
assert.equal(comparison.uncertainty.differential.unknownHand,false);
assert.ok(!comparison.reasonCodes.includes('UNKNOWN_HAND_DEPENDENCY'));
assert.ok(!comparison.reasonCodes.includes('UNKNOWN_RULE'));
assert.equal(expected.bestAbsenceReason,'VISIBLE_CROSS_AXIS_TRADE_OFF');

console.log('P-F1-R2 09-23 VISIBLE TRADE-OFF ORACLE REGRESSION PASS: production golden + semantic cause');

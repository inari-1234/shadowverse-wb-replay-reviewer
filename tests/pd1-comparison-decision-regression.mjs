import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const WB={registerModule(){}};const sandbox={window:{WB},console};vm.createContext(sandbox);new vm.Script(fs.readFileSync(new URL('../comparison-decision.js',import.meta.url),'utf8')).runInContext(sandbox);
const D=WB.ComparisonDecision,{CLASSIFICATION,AXIS}=D;
const deep=v=>JSON.parse(JSON.stringify(v));
function c(id,over={}){const base={status:'OK',sequenceId:id,lethalStatus:'NO_CONFIRMED_LETHAL',survivalStatus:'CONFIRMED_SURVIVAL',damageAmount:0,leaderHP:20,opponentLeaderHP:20,boardState:{followerCount:0,totalAttack:0,totalDefense:0,wardCount:0,nextTurnAttackPotential:0},resourceRemaining:{pp:0,ep:0,sep:0,handCount:0},resourceSpend:{pp:0,ep:0,sep:0,hand:0},opponentResponses:[],continuations:[],ruleAuthority:{status:'RESOLVED'},uncertainty:[],reasonCodes:[],futureOutcome:{drawStatus:'NO_DRAW_EVIDENCE',search:{truncated:false,unknownReasonCodes:[]}}};const out={...base,...deep(over)};out.boardState={...base.boardState,...deep(over.boardState||{})};out.resourceRemaining={...base.resourceRemaining,...deep(over.resourceRemaining||{})};out.resourceSpend={...base.resourceSpend,...deep(over.resourceSpend||{})};out.futureOutcome={...base.futureOutcome,...deep(over.futureOutcome||{})};out.futureOutcome.search={...base.futureOutcome.search,...deep((over.futureOutcome&&over.futureOutcome.search)||{})};return out;}
const pair=(a,b)=>D.compareCandidates(a,b);
// PD-01 Immediate Lethal vs Non-lethal
{const r=pair(c('A',{lethalStatus:'IMMEDIATE_LETHAL'}),c('B',{damageAmount:15}));assert.equal(r.preferredCandidateId,'A');assert.equal(r.classification,CLASSIFICATION.DOMINATES);}
// PD-02 Higher Immediate Damage vs Forced Next-turn Lethal
{const r=pair(c('A',{damageAmount:15,opponentLeaderHP:5}),c('B',{damageAmount:12,opponentLeaderHP:8,lethalStatus:'NEXT_TURN_LETHAL_FORCED'}));assert.equal(r.preferredCandidateId,'B');assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);}
// PD-03 Higher Immediate Damage vs Possible Next-turn Lethal
{const r=pair(c('A',{damageAmount:15,opponentLeaderHP:5}),c('B',{damageAmount:12,opponentLeaderHP:8,lethalStatus:'NEXT_TURN_LETHAL_POSSIBLE'}));assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);}
// PD-04 Board Retention advantage
{const r=pair(c('A',{boardState:{followerCount:2,totalAttack:8,totalDefense:8,nextTurnAttackPotential:8}}),c('B'));assert.equal(r.axes[AXIS.BOARD],1);assert.equal(r.preferredCandidateId,'A');}
// PD-05 Board Retention causes opponent Drain risk
{const A=c('A',{boardState:{followerCount:2,totalAttack:8},opponentResponses:[{responseType:'OBSERVED_AVAILABLE_RESPONSE',opponentDrainAmount:4,opponentHealAmount:4}]});const B=c('B');const r=pair(A,B);assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);assert.ok(r.reasonCodes.includes('OPPONENT_DRAIN_RISK'));}
// PD-06 Board zero denies Drain target
{const A=c('A');const B=c('B',{boardState:{followerCount:1,totalAttack:3},opponentResponses:[{responseType:'OBSERVED_AVAILABLE_RESPONSE',opponentDrainAmount:5,opponentHealAmount:5}]});const r=pair(A,B);assert.equal(r.axes[AXIS.OPPONENT_RISK],1);assert.equal(r.criticalDifference.code,'OPPONENT_DRAIN_RISK');}
// PD-07 Resource conservation vs immediate tempo
{const A=c('A',{damageAmount:4,opponentLeaderHP:16,resourceRemaining:{pp:0,handCount:1}}),B=c('B',{damageAmount:1,opponentLeaderHP:19,resourceRemaining:{pp:3,handCount:3}});assert.equal(pair(A,B).classification,CLASSIFICATION.TRADE_OFF);}
// PD-08 EP conservation vs damage gain
{const r=pair(c('A',{damageAmount:5,opponentLeaderHP:15,resourceRemaining:{ep:0}}),c('B',{damageAmount:3,opponentLeaderHP:17,resourceRemaining:{ep:1}}));assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);assert.ok(r.reasonCodes.includes('EP_CONSERVATION'));}
// PD-09 SEP conservation vs board gain
{const r=pair(c('A',{boardState:{followerCount:2,totalAttack:7},resourceRemaining:{sep:0}}),c('B',{boardState:{followerCount:1,totalAttack:4},resourceRemaining:{sep:1}}));assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);assert.ok(r.reasonCodes.includes('SEP_CONSERVATION'));}
// PD-10 Hand conservation vs pressure
{const r=pair(c('A',{damageAmount:5,opponentLeaderHP:15,resourceRemaining:{handCount:1}}),c('B',{damageAmount:2,opponentLeaderHP:18,resourceRemaining:{handCount:4}}));assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);assert.ok(r.reasonCodes.includes('HAND_CONSERVATION'));}
// PD-11 Confirmed Survival vs higher damage but death
{const r=pair(c('A',{damageAmount:10,opponentLeaderHP:10,survivalStatus:'CONFIRMED_DEATH'}),c('B',{damageAmount:4,opponentLeaderHP:16,survivalStatus:'CONFIRMED_SURVIVAL'}));assert.equal(r.preferredCandidateId,'B');}
// PD-12 Possible Survival vs Confirmed Survival
{const r=pair(c('A',{survivalStatus:'POSSIBLE_SURVIVAL'}),c('B',{survivalStatus:'CONFIRMED_SURVIVAL'}));assert.equal(r.preferredCandidateId,'B');}
// PD-13 Forced Lethal vs Possible Lethal
{const r=pair(c('A',{lethalStatus:'NEXT_TURN_LETHAL_FORCED'}),c('B',{lethalStatus:'NEXT_TURN_LETHAL_POSSIBLE'}));assert.equal(r.preferredCandidateId,'A');}
// PD-14 Lower uncertainty wins otherwise equivalent comparison
{const A=c('A'),B=c('B',{uncertainty:['SEARCH_TRUNCATED'],futureOutcome:{search:{truncated:true}}});const r=pair(A,B);assert.equal(r.preferredCandidateId,'A');assert.ok(r.reasonCodes.includes('LOWER_UNCERTAINTY')||r.classification===CLASSIFICATION.CONTEXT_DEPENDENT);}
// PD-15 Unknown Hand dependent outcome
{const r=pair(c('A',{damageAmount:3}),c('B',{damageAmount:4,uncertainty:['UNKNOWN_HAND']}));assert.equal(r.classification,CLASSIFICATION.CONTEXT_DEPENDENT);}
// PD-16 Unknown Draw dependent future lethal
{const r=pair(c('A',{lethalStatus:'NEXT_TURN_LETHAL_POSSIBLE',uncertainty:['UNKNOWN_DRAW'],futureOutcome:{drawStatus:'UNKNOWN_DRAW'}}),c('B'));assert.equal(r.classification,CLASSIFICATION.CONTEXT_DEPENDENT);}
// PD-17 Unknown Rule prevents safe decision
{const r=pair(c('A',{uncertainty:['UNKNOWN_EFFECT_RULE']}),c('B'));assert.equal(r.classification,CLASSIFICATION.INSUFFICIENT_EVIDENCE);assert.equal(r.preferredCandidateId,null);}
// PD-18 Equivalent candidates
{const r=pair(c('A'),c('B'));assert.equal(r.classification,CLASSIFICATION.EQUIVALENT);}
// PD-19 Strict dominance
{const A=c('A',{damageAmount:5,opponentLeaderHP:15,boardState:{followerCount:2,totalAttack:6},resourceRemaining:{pp:2,handCount:2}}),B=c('B',{damageAmount:2,opponentLeaderHP:18,boardState:{followerCount:1,totalAttack:2},resourceRemaining:{pp:1,handCount:1}});const r=pair(A,B);assert.equal(r.classification,CLASSIFICATION.DOMINATES);assert.equal(r.preferredCandidateId,'A');}
// PD-20 Trade-off classification
{const r=pair(c('A',{damageAmount:7,opponentLeaderHP:13}),c('B',{boardState:{followerCount:2,totalAttack:8}}));assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);}
// PD-21 Context-dependent classification
{const r=pair(c('A',{boardState:{followerCount:1,totalAttack:4}}),c('B',{damageAmount:2,uncertainty:['UNKNOWN_HAND']}));assert.equal(r.classification,CLASSIFICATION.CONTEXT_DEPENDENT);}
// PD-22 Insufficient evidence
{const r=pair(c('A',{status:'UNRESOLVED'}),c('B'));assert.equal(r.classification,CLASSIFICATION.INSUFFICIENT_EVIDENCE);}
// PD-23 Meaningful Alternative selection
{const A=c('A',{damageAmount:8,opponentLeaderHP:12}),B=c('B',{damageAmount:7,opponentLeaderHP:13}),C=c('C',{boardState:{followerCount:3,totalAttack:9},resourceRemaining:{handCount:3}});assert.equal(D.selectMeaningfulAlternative(A,[A,B,C]).candidateId,'C');}
// PD-24 Alternative must not simply equal rank 2
{const A=c('A',{damageAmount:8,opponentLeaderHP:12}),B=c('B',{damageAmount:7,opponentLeaderHP:13}),C=c('C',{boardState:{followerCount:3,totalAttack:9},resourceRemaining:{handCount:3}});const alt=D.selectMeaningfulAlternative(A,[A,B,C]);assert.notEqual(alt.candidateId,'B');}
// PD-25 Critical Difference extraction
{const x=D.extractCriticalDifferences(c('A'),c('B',{opponentResponses:[{opponentDrainAmount:4,opponentHealAmount:4}]}));assert.equal(x.criticalDifference.code,'OPPONENT_DRAIN_RISK');}
// PD-26 Opponent response changes preferred candidate
{const A=c('A',{boardState:{followerCount:1,totalAttack:5},opponentResponses:[{opponentDrainAmount:5,opponentHealAmount:5}]}),B=c('B',{boardState:{followerCount:1,totalAttack:5}});assert.equal(pair(A,B).preferredCandidateId,'B');}
// PD-27 Drain heal changes lethal timing
{const A=c('A',{lethalStatus:'NEXT_TURN_LETHAL_POSSIBLE',opponentResponses:[{opponentDrainAmount:4,opponentHealAmount:4}]}),B=c('B',{lethalStatus:'NEXT_TURN_LETHAL_FORCED'});const r=pair(A,B);assert.equal(r.preferredCandidateId,'B');assert.ok(r.reasonCodes.includes('OPPONENT_DRAIN_RISK'));}
// PD-28 Immediate board value is outweighed by Drain risk (trade-off retained, risk is critical)
{const A=c('A',{boardState:{followerCount:3,totalAttack:10},opponentResponses:[{opponentDrainAmount:6,opponentHealAmount:6}]}),B=c('B');const r=pair(A,B);assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);assert.equal(r.criticalDifference.code,'OPPONENT_DRAIN_RISK');}
// PD-29 Future continuation quality breaks tie
{const A=c('A',{continuations:[{parentResponseId:'R1',lethal:false},{parentResponseId:'R2',lethal:false}]}),B=c('B',{continuations:[{parentResponseId:'R1',lethal:false}]});assert.equal(pair(A,B).preferredCandidateId,'A');}
// PD-30 Multiple continuation routes vs fragile single route
{const r=pair(c('A',{continuations:[{parentResponseId:'R1'},{parentResponseId:'R2'}]}),c('B',{continuations:[{parentResponseId:'R1'}]}));assert.equal(r.axes[AXIS.CONTINUATION],1);assert.ok(r.reasonCodes.includes('MULTIPLE_CONTINUATION_ROUTES'));}
// PD-31 Confirmed win must outrank non-win
{const d=D.evaluateDecision([c('A',{damageAmount:19}),c('B',{lethalStatus:'IMMEDIATE_LETHAL'}),c('C',{lethalStatus:'NEXT_TURN_LETHAL_FORCED'})]);assert.equal(d.bestCandidateId,'B');}
// PD-32 Confirmed death must not be selected over survivable line without stronger terminal reason
{const d=D.evaluateDecision([c('A',{damageAmount:19,survivalStatus:'CONFIRMED_DEATH'}),c('B',{damageAmount:2,survivalStatus:'CONFIRMED_SURVIVAL'})]);assert.equal(d.bestCandidateId,'B');}
// PD-33 Pairwise trade-off preserved
{const r=pair(c('A',{damageAmount:6}),c('B',{boardState:{totalAttack:6,followerCount:2}}));assert.equal(r.classification,CLASSIFICATION.TRADE_OFF);assert.equal(r.preferredCandidateId,null);}
// PD-34 Global decision with 3+ candidates
{const d=D.evaluateDecision([c('A',{damageAmount:4}),c('B',{lethalStatus:'IMMEDIATE_LETHAL'}),c('C',{boardState:{totalAttack:8,followerCount:2}}),c('D')]);assert.equal(d.bestCandidateId,'B');assert.ok(d.ranking.tiers.length>=1);}
// PD-35 No illegal action/state/rule recomputation inside P-D1
{const src=fs.readFileSync(new URL('../comparison-decision.js',import.meta.url),'utf8');for(const forbidden of ['generateLegalActions','applyAction(','getPlayerView(','getTerminalStatus(','stateFingerprint('])assert.equal(src.includes(forbidden),false,forbidden);}
// PD-36 P-C1 uncertainty preserved exactly
{const u=['UNKNOWN_HAND','SEARCH_TRUNCATED','LETHAL_DEPENDS_ON_UNKNOWN_DRAW'];const A=c('A',{uncertainty:u}),B=c('B');const r=pair(A,B);assert.equal(JSON.stringify(r.uncertainty.a),JSON.stringify(u));assert.equal(JSON.stringify(A.uncertainty),JSON.stringify(u));}
console.log('P-D1 REGRESSION PASS: 36/36');

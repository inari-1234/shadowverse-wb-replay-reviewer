import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){}};
const sandbox={window:{WB},console};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../comparison-decision.js',import.meta.url),'utf8'),{filename:'comparison-decision.js'}).runInContext(sandbox);
const D=WB.ComparisonDecision;
const deep=v=>JSON.parse(JSON.stringify(v));
function c(id,over={}){
  const base={status:'OK',sequenceId:id,turnEnded:false,lethalStatus:'NO_CONFIRMED_LETHAL',survivalStatus:'CONFIRMED_SURVIVAL',damageAmount:0,leaderHP:20,opponentLeaderHP:20,boardState:{followerCount:0,totalAttack:0,totalDefense:0,wardCount:0,nextTurnAttackPotential:0},resourceRemaining:{pp:0,ep:0,sep:0,handCount:0},resourceSpend:{pp:0,ep:0,sep:0,hand:0},opponentResponses:[],continuations:[],ruleAuthority:{status:'RESOLVED'},uncertainty:[],reasonCodes:[],futureOutcome:{drawStatus:'NO_DRAW_EVIDENCE',search:{truncated:false,unknownReasonCodes:[]}}};
  const out={...base,...deep(over)};
  out.boardState={...base.boardState,...deep(over.boardState||{})};
  out.resourceRemaining={...base.resourceRemaining,...deep(over.resourceRemaining||{})};
  out.resourceSpend={...base.resourceSpend,...deep(over.resourceSpend||{})};
  out.futureOutcome={...base.futureOutcome,...deep(over.futureOutcome||{})};
  out.futureOutcome.search={...base.futureOutcome.search,...deep((over.futureOutcome&&over.futureOutcome.search)||{})};
  return out;
}
const failures=[];let passed=0;
function check(id,title,fn){try{fn();passed++;console.log(`PASS ${id} ${title}`)}catch(err){failures.push({id,title,message:err.message});console.error(`FAIL ${id} ${title}: ${err.message}`)}}

check('D1R1-01','terminal remaining PP is not move strength',()=>{
  const A=c('A',{turnEnded:true,resourceRemaining:{pp:2}}),B=c('B',{turnEnded:true,resourceRemaining:{pp:0}});
  const r=D.compareCandidates(A,B);
  assert.equal(r.preferredCandidateId,null);
  assert.notEqual(r.classification,D.CLASSIFICATION.DOMINATES);
});

check('D1R1-02','uncertainty-only difference cannot dominate',()=>{
  const A=c('A'),B=c('B',{uncertainty:['SEARCH_TRUNCATED'],futureOutcome:{search:{truncated:true}}});
  const r=D.compareCandidates(A,B);
  assert.equal(r.preferredCandidateId,null);
  assert.notEqual(r.classification,D.CLASSIFICATION.DOMINATES);
});

check('D1R1-03','intra-axis trade-off remains material',()=>{
  const A=c('A',{damageAmount:1,opponentLeaderHP:19,boardState:{totalAttack:6,followerCount:1}}),B=c('B',{boardState:{totalAttack:4,followerCount:2}});
  const r=D.compareCandidates(A,B);
  assert.equal(r.axisResults?.[D.AXIS.BOARD],D.AXIS_RESULT?.TRADE_OFF);
  assert.equal(r.classification,D.CLASSIFICATION.TRADE_OFF);
  assert.equal(r.preferredCandidateId,null);
});

check('D1R1-04','evidence carries candidate direction',()=>{
  const A=c('A',{boardState:{totalAttack:6,followerCount:2}}),B=c('B',{boardState:{totalAttack:2,followerCount:2}});
  const r=D.compareCandidates(A,B);
  const ev=r.evidence.find(x=>x.axis===D.AXIS.BOARD&&x.label==='boardAttack');
  assert.ok(ev);
  assert.equal(ev.winnerCandidateId,'A');
  assert.equal(ev.loserCandidateId,'B');
  assert.equal(ev.difference,4);
  assert.ok(ev.evidence);
  assert.ok(ev.confidence);
});

check('D1R1-05','common unknown opponent hand is not a candidate difference',()=>{
  const common=['UNKNOWN_HAND_DEPENDENT_RESPONSE'];
  const A=c('A',{damageAmount:3,opponentLeaderHP:17,uncertainty:common}),B=c('B',{damageAmount:1,opponentLeaderHP:19,uncertainty:common});
  const r=D.compareCandidates(A,B);
  assert.equal(r.classification,D.CLASSIFICATION.DOMINATES);
  assert.equal(r.preferredCandidateId,'A');
  assert.ok(!r.reasonCodes.includes('UNKNOWN_HAND_DEPENDENCY'));
});

console.log(JSON.stringify({suite:'P-D1R1 comparison semantic corrective',passed,failed:failures.length,failures},null,2));
if(failures.length)process.exit(1);
assert.equal(passed,5);
console.log('P-D1R1 COMPARISON SEMANTIC CORRECTIVE REGRESSION PASS: 5/5');
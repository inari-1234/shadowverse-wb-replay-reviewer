import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={optionalModules:[],registerModule(){},log(){},recordError(){}};
const sandbox={window:{WB},console,structuredClone,Date,JSON,Number,String,Object,Array,Map,Set,Promise};
vm.createContext(sandbox);
for(const file of ['../card-db.js','../position-state-runtime.js','../common-rule-engine-runtime.js','../legal-action-sequence.js','../outcome-backtracking.js','../comparison-decision.js','../played-move-authority.js','../coach-explanation.js']){
  new vm.Script(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{filename:file}).runInContext(sandbox);
}
const P=WB.PositionStateRuntime,A=P.adapter,R=WB.CommonRuleEngineRuntime,D=WB.ComparisonDecision,PM=WB.PlayedMoveAuthority,E=WB.CoachExplanation;
const anchorCapture={
  at:'2026-09-23T00:00:01.000Z',captureMode:'decision-authority',partial:false,
  context:{time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分'},
  confirmed:{time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:2,opponentHP:16,extraPP:'no',ep:'yes',sep:'no',opponentWard:'none',boardDamage:0,boardDamageKnown:true,hand:{recognized:{quickBlader:{id:'quickBlader',label:'刹那のクイックブレイダー',count:1,confidence:.9221,positiveFrames:4}}}},
  resources:{ui:{extra:'no',ep:'yes',sep:'no'}},ward:{state:'none'},
  hand:{result:{recognized:{quickBlader:{id:'quickBlader',label:'刹那のクイックブレイダー',count:1,confidence:.9221,positiveFrames:4}}}},
  board:{result:{accepted:true,followers:[],faceDamageConfirmed:true,value:0}}
};
const afterCapture={
  at:'2026-09-23T00:00:02.000Z',captureMode:'decision-authority',partial:false,
  context:{time:116.338,turn:8,absoluteSide:'bottom',relativeSide:'自分'},
  confirmed:{time:116.338,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,extraPP:'no',ep:'yes',sep:'yes',opponentWard:'none',boardDamage:3,boardDamageKnown:true,hand:{recognized:{}}},
  resources:{ui:{extra:'no',ep:'yes',sep:'yes'}},ward:{state:'none'},
  hand:{result:{recognized:{}}},board:{result:{accepted:true,followers:[],faceDamageConfirmed:true,value:3}}
};
const cardAuthority={get(cardId){const c=WB.CardDB.get(cardId);if(!c)return null;if(cardId!=='quickBlader')return{id:cardId,known:false,authority:`CARD_DB:${cardId}:UNMODELED`};return{id:c.id,known:true,authority:'CARD_DB:quickBlader:VERIFIED_SIMPLE',cardType:'FOLLOWER',cost:c.cost,attack:c.atk,defense:c.life,storm:true,rush:false,occupiesField:true,requiresTarget:false,requiresChoice:false,coreOnlySafe:true}}};
const source=P.createState(P.observationFromCapture(anchorCapture),{windowId:'dw-8-live'});
assert.equal(source.players.self.pp,2);
assert.equal(source.players.self.ep,1);
assert.equal(source.players.self.evolveWindowOpen,true);
assert.ok(source.players.self.hand.some(x=>x.cardId==='quickBlader'&&x.known));
const actionEngine=WB.LegalActionSequence.create({stateAdapter:A,ruleEngine:R,cardAuthority},{maxDepth:4,maxNodes:240,maxSequences:120});
const generated=actionEngine.generateSequences(source,{maxDepth:4,maxNodes:240,maxSequences:120});
assert.equal(generated.status,'OK');
const seqs=generated.sequences||[];
const types=s=>s.actions.map(a=>a.actionType);
const quickOnly=seqs.find(s=>s.actions?.some(a=>a.actionType==='PLAY_CARD'&&a.source?.cardId==='quickBlader')&&!s.actions.some(a=>a.actionType==='EVOLVE')&&s.actions.at(-1)?.actionType==='END_TURN');
const quickEvolve=seqs.find(s=>s.actions?.some(a=>a.actionType==='PLAY_CARD'&&a.source?.cardId==='quickBlader')&&s.actions.some(a=>a.actionType==='EVOLVE'&&a.source?.cardId==='quickBlader')&&s.actions.at(-1)?.actionType==='END_TURN');
const idle=seqs.find(s=>types(s).length===1&&types(s)[0]==='END_TURN');
assert.ok(quickOnly,'live exact capture must generate Quick-only candidate');
assert.ok(quickEvolve,'live exact capture must generate Quick+evolve candidate');
assert.ok(idle,'live exact capture must generate do-nothing candidate');
const pc1=WB.OutcomeBacktracking.create({actionEngine,stateAdapter:A,ruleEngine:R},{maxDepth:3,maxNodes:80,maxBranches:20,maxOpponentResponses:12,maxContinuations:12,maxTurns:2});
const qOutcome=pc1.evaluateSequence(source,quickEvolve.actions,{maxDepth:2,maxNodes:50,maxBranches:12,maxOpponentResponses:8,maxContinuations:8,maxTurns:2});
const iOutcome=pc1.evaluateSequence(source,idle.actions,{maxDepth:2,maxNodes:50,maxBranches:12,maxOpponentResponses:8,maxContinuations:8,maxTurns:2});
assert.equal(qOutcome.boardState.nextTurnAttackPotential,3);
assert.equal(iOutcome.boardState.nextTurnAttackPotential,0);
const comparison=D.compareCandidates(qOutcome,iOutcome);
assert.equal(comparison.classification,D.CLASSIFICATION.TRADE_OFF);
assert.equal(comparison.axisResults[D.AXIS.BOARD],D.AXIS_RESULT.A_BETTER);
assert.equal(comparison.axisResults[D.AXIS.RESOURCE],D.AXIS_RESULT.B_BETTER);
const decision=D.evaluateDecision([qOutcome,iOutcome]);
assert.equal(decision.status,'OK');
assert.equal(decision.classification,D.CLASSIFICATION.TRADE_OFF);
assert.equal(decision.bestCandidateId,null);
PM.clear();
PM.indexCapture(anchorCapture);PM.indexCapture(afterCapture);
const binding={runId:'pf1r2-live-capture:1',windowId:'dw-8-live',complete:true,anchorExact:true,afterExact:true,anchorStateId:P.observationFromCapture(anchorCapture).sourceStateId,afterStateId:P.observationFromCapture(afterCapture).sourceStateId};
const playedMove=PM.identify({windowId:'dw-8-live',runId:binding.runId,binding,sequences:[quickEvolve,idle],outcomes:[qOutcome,iOutcome]});
assert.equal(playedMove.status,'CONFIRMED');
assert.equal(playedMove.playedCandidateId,qOutcome.sequenceId);
assert.ok(playedMove.matchedActions.some(a=>a.actionType==='PLAY_CARD'&&a.source?.cardId==='quickBlader'));
assert.ok(playedMove.matchedActions.some(a=>a.actionType==='EVOLVE'&&a.source?.cardId==='quickBlader'));
const coach=E.explainDecision(decision,{playedMove});
assert.equal(coach.mode,'TRADE_OFF');
assert.equal(coach.bestCandidateId,null);
assert.equal(coach.headline,'候補ごとに異なる長所があるため、推奨手を1つに絞れません。');
assert.doesNotMatch(coach.text,/情報が足りない|DOMINATES|TRADE_OFF|Candidate|seq:/);
console.log('P-F1-R2 LIVE EXACT-CAPTURE PIPELINE REGRESSION PASS');

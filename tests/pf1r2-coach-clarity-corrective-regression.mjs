// Final clean-tree gate trigger; semantic assertions below are unchanged.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={optionalModules:[],registerModule(){},CardDB:{get(id){return id==='quickBlader'?{label:'刹那のクイックブレイダー'}:null}}};
const sandbox={window:{WB},console};vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../coach-explanation.js',import.meta.url),'utf8'),{filename:'coach-explanation.js'}).runInContext(sandbox);
const E=WB.CoachExplanation;
const obs={basis:'P-C1_OUTCOME',observationOnly:false};
const pair=(a,b,evidence)=>({aCandidateId:a,bCandidateId:b,classification:'TRADE_OFF',axisResults:{},axes:{},reasonCodes:[],evidence,uncertainty:{a:[],b:[],common:{unknownHand:true,unknownDraw:false,truncated:false},differential:{}}});
const played='quick-evolve',attack='quick-evolve-attack',idle='idle';
const decision={status:'OK',classification:'TRADE_OFF',bestCandidateId:null,meaningfulAlternativeCandidateId:null,ranking:{tiers:[],pairwise:[
  pair(played,attack,[
    {axis:'IMMEDIATE_PRESSURE',label:'immediateDamage',a:0,b:3,winnerCandidateId:attack,loserCandidateId:played,difference:3,evidence:obs,confidence:'CONFIRMED'},
    {axis:'IMMEDIATE_PRESSURE',label:'opponentLeaderHP',a:16,b:13,winnerCandidateId:attack,loserCandidateId:played,difference:-3,evidence:obs,confidence:'CONFIRMED'},
    {axis:'BOARD_TEMPO',label:'boardAttack',a:3,b:0,winnerCandidateId:played,loserCandidateId:attack,difference:3,evidence:obs,confidence:'CONFIRMED'}
  ]),
  pair(played,idle,[
    {axis:'RESOURCE_ECONOMY',label:'EP',a:0,b:1,winnerCandidateId:idle,loserCandidateId:played,difference:-1,evidence:obs,confidence:'CONFIRMED'},
    {axis:'RESOURCE_ECONOMY',label:'handCount',a:2,b:3,winnerCandidateId:idle,loserCandidateId:played,difference:-1,evidence:obs,confidence:'CONFIRMED'}
  ])
]},reasonCodes:[]};
const q={cardId:'quickBlader'};
const playedMove={status:'CONFIRMED',playedCandidateId:played,matchedCandidateId:played,matchedActions:[{actionType:'PLAY_CARD',source:q},{actionType:'EVOLVE',source:q}],candidates:[
  {candidateId:played,actions:[{actionType:'PLAY_CARD',source:q},{actionType:'EVOLVE',source:q},{actionType:'END_TURN'}]},
  {candidateId:attack,actions:[{actionType:'PLAY_CARD',source:q},{actionType:'EVOLVE',source:q},{actionType:'ATTACK',source:q,target:{zone:'LEADER'}},{actionType:'END_TURN'}]},
  {candidateId:idle,actions:[{actionType:'END_TURN'}]}
]};
const x=E.explainDecision(decision,{playedMove});
assert.equal(x.playedMoveComparison.visible,true);
assert.equal(x.playedMoveComparison.status,'CONFIRMED_TRADE_OFF');
assert.match(x.playedMoveComparison.text,/刹那のクイックブレイダーを出して進化する手/,'same-card play+evolve must be rendered as one natural action chain');
assert.doesNotMatch(x.playedMoveComparison.text,/出す、刹那のクイックブレイダーを進化する/,'same card name must not be repeated between chained actions');
assert.ok(Array.isArray(x.playedMoveComparison.otherCandidateAdvantages),'structured alternative-candidate advantages must be retained');
assert.ok(x.playedMoveComparison.otherCandidateAdvantages.some(g=>g.candidateId===attack&&g.description.includes('リーダーを攻撃する手')&&g.reasons.some(r=>r.includes('即時打点で3点'))),'3-damage reason must retain the candidate that produced it');
assert.ok(x.playedMoveComparison.otherCandidateAdvantages.some(g=>g.candidateId===idle&&g.description.includes('ターンを終える手')&&g.reasons.some(r=>r.includes('EP'))),'EP-preservation reason must retain the candidate that produced it');
assert.ok(x.playedMoveComparison.otherAdvantages.length<=3,'human-facing alternative reasons must be intentionally limited');
assert.ok(x.playedMoveComparison.otherAdvantages.every(s=>s.includes('：')),'each human-facing alternative advantage must identify its candidate');
assert.ok(x.playedMoveComparison.otherAdvantages.some(s=>s.includes('リーダーを攻撃する手')&&s.includes('即時打点で3点')),'highest-learning immediate-damage alternative must remain visible');
assert.doesNotMatch(x.text,/他候補が上回る点：即時打点で1点上回ります。 他候補が上回る点：即時打点で3点上回ります。/,'different alternatives must not collapse into an apparently contradictory anonymous list');
assert.equal(x.bestCandidateId,null);
assert.match(x.text,/単独の推奨はしません/);
assert.doesNotMatch(x.text,/良い手|最善/);

const bindingSource=fs.readFileSync(new URL('../runtime-authority-binding.js',import.meta.url),'utf8');
const replaySource=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
assert.match(bindingSource,/preActionResourceAuthority\s*:/,'single-presentation authority must carry pre-action resource provenance as metadata');
assert.match(replaySource,/観測から引き継ぎ/,'Review Card must disclose carried EP provenance to the reader');
assert.match(replaySource,/reviewStateRows\(beforeState,changedKeys,[^)]+preActionResourceAuthority/,'carry provenance must be applied only through Review Card rendering rather than mutating the exact beforeState');

console.log('P-F1-R2 COACH CLARITY CORRECTIVE REGRESSION PASS');

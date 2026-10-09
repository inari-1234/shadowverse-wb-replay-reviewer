import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={optionalModules:[],registerModule(){},CardDB:{get(){return null}}};
const sandbox={window:{WB},console};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../coach-explanation.js',import.meta.url),'utf8'),{filename:'coach-explanation.js'}).runInContext(sandbox);
const E=WB.CoachExplanation;

const pair={
  aCandidateId:'quick-evolve',bCandidateId:'idle',classification:'TRADE_OFF',decision:'UNRESOLVED',preferredCandidateId:null,preferredSide:null,
  axisResults:{IMMEDIATE_PRESSURE:'EQUIVALENT',FUTURE_LETHAL:'EQUIVALENT',BOARD_TEMPO:'A_BETTER',OPPONENT_BENEFIT_RISK:'EQUIVALENT',RESOURCE_ECONOMY:'B_BETTER',SURVIVAL:'EQUIVALENT',CONTINUATION_QUALITY:'EQUIVALENT',UNCERTAINTY:'EQUIVALENT'},
  axes:{IMMEDIATE_PRESSURE:0,FUTURE_LETHAL:0,BOARD_TEMPO:1,OPPONENT_BENEFIT_RISK:0,RESOURCE_ECONOMY:-1,SURVIVAL:0,CONTINUATION_QUALITY:0,UNCERTAINTY:0},
  criticalDifference:{code:'NO_MATERIAL_DIFFERENCE',axis:null,preferred:null},
  reasonCodes:['BOARD_ADVANTAGE','EP_CONSERVATION','HAND_CONSERVATION'],
  evidence:[
    {axis:'BOARD_TEMPO',label:'boardAttack',a:3,b:0,winnerCandidateId:'quick-evolve',loserCandidateId:'idle',difference:3,evidence:{basis:'P-C1_OUTCOME'},confidence:'CONFIRMED'},
    {axis:'RESOURCE_ECONOMY',label:'EP',a:0,b:1,winnerCandidateId:'idle',loserCandidateId:'quick-evolve',difference:-1,evidence:{basis:'P-C1_OUTCOME'},confidence:'CONFIRMED'},
    {axis:'RESOURCE_ECONOMY',label:'handCount',a:2,b:3,winnerCandidateId:'idle',loserCandidateId:'quick-evolve',difference:-1,evidence:{basis:'P-C1_OUTCOME'},confidence:'CONFIRMED'}
  ],
  uncertainty:{a:[],b:[],common:{unknownHand:true,unknownDraw:false,truncated:false},differential:{unknownHand:false,unknownDraw:false,truncated:false}}
};
const decision={status:'OK',classification:'TRADE_OFF',bestCandidateId:null,meaningfulAlternativeCandidateId:null,alternativeComparison:null,ranking:{tiers:[],pairwise:[pair]},reasonCodes:['BOARD_ADVANTAGE','EP_CONSERVATION','HAND_CONSERVATION']};
const playedMove={status:'CONFIRMED',playedCandidateId:'quick-evolve',matchedCandidateId:'quick-evolve',candidates:[]};
const x=E.explainDecision(decision,{playedMove});
assert.equal(x.mode,'TRADE_OFF');
assert.equal(x.bestCandidateId,null);
assert.equal(x.playedMoveComparison.visible,false);
assert.doesNotMatch(x.headline,/情報が足りない|必要な情報が足り/);
assert.match(x.headline,/長所|一長一短|絞れない|優劣/);
assert.ok(x.cautions.some(s=>s.includes('見えている情報')));
assert.doesNotMatch(x.text,/DOMINATES|TRADE_OFF|Candidate|Alternative|seq:/);
console.log('P-E1R1 TRADE-OFF NO-BEST REGRESSION PASS');

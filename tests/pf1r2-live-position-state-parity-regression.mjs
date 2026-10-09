import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){},log(){},CardDB:null};
const sandbox={window:{WB},console,structuredClone};
vm.createContext(sandbox);
for(const file of ['../card-db.js','../position-state-runtime.js','../common-rule-engine-runtime.js','../legal-action-sequence.js']){
  new vm.Script(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{filename:file}).runInContext(sandbox);
}
const capture={
  at:'2026-09-23T00:00:01.000Z',captureMode:'decision-authority',partial:false,
  context:{time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分'},
  confirmed:{
    time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:2,opponentHP:16,
    extraPP:'no',ep:'yes',sep:'no',opponentWard:'none',boardDamage:0,boardDamageKnown:true,
    hand:{recognized:{quickBlader:{id:'quickBlader',label:'刹那のクイックブレイダー',count:1,confidence:.9221,positiveFrames:4}}}
  },
  resources:{ui:{extra:'no',ep:'yes',sep:'no'}},ward:{state:'none'},
  hand:{result:{recognized:{quickBlader:{id:'quickBlader',label:'刹那のクイックブレイダー',count:1,confidence:.9221,positiveFrames:4}}}},
  board:{result:{accepted:true,followers:[],faceDamageConfirmed:true,value:0}}
};
const P=WB.PositionStateRuntime,A=P.adapter,R=WB.CommonRuleEngineRuntime;
const obs=P.observationFromCapture(capture);
assert.equal(obs.handRecognized.quickBlader.count,1,'exact capture must preserve current Quick recognition');
assert.equal(obs.resources.ep,'yes','exact capture must preserve EP useability');
assert.equal(obs.boardStructureKnown,true);
assert.equal(obs.boardFaceDamageConfirmed,true);
const state=P.createState(obs,{windowId:'dw-8'});
assert.equal(state.players.self.ep,1,'EP yes must remain a usable EP resource');
assert.equal(state.players.self.evolveWindowOpen,true,'EP UI useable authority must open normal evolution in P-S1');
assert.equal(state.players.self.superEvolveWindowOpen,false,'SEP UI unavailable must not open super evolution');
assert.ok(state.players.self.hand.some(x=>x.cardId==='quickBlader'&&x.known===true),'recognized Quick must enter runtime hand');
const cardAuthority={get(id){const c=WB.CardDB.get(id);if(id!=='quickBlader'||!c)return null;return{known:true,cardId:id,cost:Number(c.cost),cardType:'FOLLOWER',occupiesField:true,attack:Number(c.atk),defense:Number(c.life),storm:true,rush:false,coreOnlySafe:true,authority:'TEST_VERIFIED_SIMPLE'}}};
const engine=WB.LegalActionSequence.create({stateAdapter:A,ruleEngine:R,cardAuthority},{maxDepth:4,maxNodes:120,maxSequences:64});
const root=engine.generateLegalActions(state);
const play=root.actions.find(a=>a.actionType==='PLAY_CARD'&&a.source?.cardId==='quickBlader');
assert.ok(play,'live P-A1 source must expose Quick play');
const after=engine.applyAction(state,play);
assert.equal(after.status,'OK');
const q=after.state.players.self.field.find(x=>x.cardId==='quickBlader');
assert.equal(q?.canEvolve,true,'played Quick must be eligible for normal evolve when exact capture says EP useable');
const next=engine.generateLegalActions(after.state);
assert.ok(next.actions.some(a=>a.actionType==='EVOLVE'&&a.source?.cardId==='quickBlader'),'live P-A1 must expose Quick evolve');
console.log('P-F1-R2 LIVE POSITION-STATE PARITY REGRESSION PASS');

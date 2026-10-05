import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){}};
const sandbox={window:{WB},console};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../legal-action-sequence.js',import.meta.url),'utf8')).runInContext(sandbox);
const P=WB.LegalActionSequence,{ACTION_TYPES,LEGALITY,STATUS,REASON}=P;
const deep=v=>JSON.parse(JSON.stringify(v));
let nextId=1;
const cards={
 cheap:{known:true,authority:'TEST:CARD:cheap',cardType:'FOLLOWER',cost:2,occupiesField:true,follower:{attack:2,hp:2,canAttack:false,canAttackLeader:true,canEvolve:true,canSuperEvolve:true}},
 expensive:{known:true,authority:'TEST:CARD:expensive',cardType:'FOLLOWER',cost:7,occupiesField:true,follower:{attack:7,hp:7,canAttack:false,canAttackLeader:true,canEvolve:true,canSuperEvolve:true}},
 storm:{known:true,authority:'TEST:CARD:storm',cardType:'FOLLOWER',cost:1,occupiesField:true,follower:{attack:2,hp:1,canAttack:true,storm:true,canAttackLeader:true,canEvolve:true,canSuperEvolve:true}},
 targetSpell:{known:true,authority:'TEST:CARD:targetSpell',cardType:'SPELL',cost:1,requiresTarget:true,listTargets({state,actor}){const opp=actor==='P1'?'P2':'P1';return state.players[opp].field.filter(x=>x.targetable!==false).map(x=>({zone:'FIELD',player:opp,instanceId:x.instanceId,cardId:x.cardId}));}},
 choiceSpell:{known:true,authority:'TEST:CARD:choiceSpell',cardType:'SPELL',cost:1,requiresChoice:true,listChoices(){return [{id:'A'},{id:'B'}];}},
 triggerCard:{known:true,authority:'TEST:CARD:triggerCard',cardType:'SPELL',cost:1,direct({draft,actor}){draft.pendingTriggers.push({controller:actor,registrationOrder:2,id:'same-2'},{controller:actor,registrationOrder:1,id:'same-1'});const opp=actor==='P1'?'P2':'P1';draft.pendingTriggers.push({controller:opp,registrationOrder:1,id:'opp-1'});}},
 lethal:{known:true,authority:'TEST:CARD:lethal',cardType:'SPELL',cost:1,direct({draft,actor}){draft.players[actor==='P1'?'P2':'P1'].leaderHp=0;}},
 restricted:{known:true,authority:'TEST:CARD:restricted',cardType:'SPELL',cost:1,checkLegality(){return {legality:LEGALITY.ILLEGAL,reasons:['CARD_CONDITION_FALSE']};}}
};
const cardAuthority={get:id=>cards[id]||null};
const adapter={
 getStateId:s=>s.id,
 fingerprint(s){const c=deep(s);delete c.id;delete c.lastAction;return P.stableStringify(c);},
 validateState:s=>s&&s.players&&s.activePlayer?{ok:true}:{ok:false,reasons:[REASON.INVALID_STATE]},
 getActivePlayer:s=>s.activePlayer,getOpponentPlayer:(_s,p)=>p==='P1'?'P2':'P1',
 getPlayerView(s,p){const x=s.players[p];return {...x,opponentPlayer:p==='P1'?'P2':'P1',pendingDecision:s.pendingDecision||null};},
 applyCoreAction(state,action,{cardRule}){
  const s=deep(state);s.id=`s${++nextId}`;s.lastAction=action.actionId;const p=action.actorPlayer,pv=s.players[p],find=id=>pv.field.find(x=>x.instanceId===id);
  if(action.actionType===ACTION_TYPES.PLAY_CARD){const i=pv.hand.findIndex(x=>(x.instanceId||x.id)===action.source.instanceId);if(i<0)return {status:'ERROR',reasons:[REASON.ILLEGAL_SOURCE_NOT_FOUND]};pv.hand.splice(i,1);pv.pp-=action.cost.pp;if(cardRule.cardType==='FOLLOWER')pv.field.push({instanceId:`f:${action.source.instanceId}`,cardId:action.source.cardId,kind:'FOLLOWER',summonedThisTurn:true,attacked:false,evolved:false,superEvolved:false,ward:false,targetable:true,...deep(cardRule.follower||{})});if(typeof cardRule.direct==='function')cardRule.direct({draft:s,actor:p,action});}
  else if(action.actionType===ACTION_TYPES.ATTACK){const f=find(action.source.instanceId);if(!f)return {status:'ERROR',reasons:[REASON.ILLEGAL_SOURCE_NOT_FOUND]};f.attacked=true;if(action.target.zone==='LEADER')s.players[action.target.player].leaderHp-=Number(f.attack||0);else{const tp=s.players[action.target.player],t=tp.field.find(x=>x.instanceId===action.target.instanceId);if(!t)return {status:'ERROR'};t.hp-=Number(f.attack||0);if(t.hp<=0)tp.field=tp.field.filter(x=>x.instanceId!==t.instanceId);}}
  else if(action.actionType===ACTION_TYPES.EVOLVE){const f=find(action.source.instanceId);pv.ep--;f.evolved=true;f.attack=(f.attack||0)+2;f.canAttack=true;f.summonedThisTurn=false;}
  else if(action.actionType===ACTION_TYPES.SUPER_EVOLVE){const f=find(action.source.instanceId);pv.sep--;f.superEvolved=true;f.attack=(f.attack||0)+3;f.canAttack=true;f.summonedThisTurn=false;}
  else if(action.actionType===ACTION_TYPES.END_TURN){s.turn++;s.activePlayer=p==='P1'?'P2':'P1';}
  else if(action.actionType===ACTION_TYPES.ACTIVATE){s.marker=1;for(const pl of Object.values(s.players))for(const f of pl.field)delete f.activations;}
  else if(action.actionType===ACTION_TYPES.TARGET_SELECT||action.actionType===ACTION_TYPES.CHOICE_SELECT)delete s.pendingDecision;
  return {status:'OK',state:s,reasons:[]};
 }
};
const ruleEngine={
 getAuthorityStatus:s=>s.authorityStatus?{status:s.authorityStatus}:{status:'RESOLVED'},
 getTerminalStatus(s){const terminal=Object.values(s.players).some(p=>p.leaderHp<=0);return {terminal,reasons:terminal?['LEADER_LETHAL']:[]};},
 resolveAfterAction(state,{action}){const s=deep(state);if(s.indeterminateAfterAction)return {status:'INDETERMINATE_RULE_ORDER',state:s};if(s.pendingTriggers?.length){const turnPlayer=action.actorPlayer;s.resolvedTriggers=[...s.pendingTriggers].sort((a,b)=>(a.controller===turnPlayer?0:1)-(b.controller===turnPlayer?0:1)||a.registrationOrder-b.registrationOrder).map(x=>x.id);s.pendingTriggers=[];}return {status:'RESOLVED',state:s,reasons:[]};}
};
const engine=P.create({stateAdapter:adapter,ruleEngine,cardAuthority},{maxDepth:5,maxNodes:200,maxSequences:100});
function base(over={}){return {id:`s${nextId++}`,turn:5,activePlayer:'P1',pendingTriggers:[],players:{P1:{leaderHp:20,pp:3,ep:1,sep:1,evolveWindowOpen:true,superEvolveWindowOpen:true,fieldLimit:5,hand:[],field:[],canEndTurn:true},P2:{leaderHp:20,pp:3,ep:1,sep:1,evolveWindowOpen:true,superEvolveWindowOpen:true,fieldLimit:5,hand:[],field:[],canEndTurn:true}},...over};}
const hand=(id,cardId=id)=>({instanceId:`h:${id}:${nextId++}`,cardId});
const follower=(id,over={})=>({instanceId:`f:${id}:${nextId++}`,cardId:id,kind:'FOLLOWER',attack:2,hp:2,summonedThisTurn:false,attacked:false,canAttack:true,canAttackLeader:true,canEvolve:true,canSuperEvolve:true,evolved:false,superEvolved:false,ward:false,targetable:true,...over});
const gen=s=>engine.generateLegalActions(s),ofType=(g,t)=>g.actions.filter(a=>a.actionType===t);

// LA-01 / LA-02 PP
let s=base();s.players.P1.pp=1;s.players.P1.hand=[hand('expensive')];let g=gen(s);assert.equal(ofType(g,ACTION_TYPES.PLAY_CARD).length,0);assert.ok(g.rejected.some(x=>x.reasonCodes.includes(REASON.ILLEGAL_NOT_ENOUGH_PP)));
s=base();s.players.P1.pp=2;s.players.P1.hand=[hand('cheap')];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.PLAY_CARD).length,1);
// LA-03 field full
s=base();s.players.P1.hand=[hand('cheap')];s.players.P1.field=Array.from({length:5},(_,i)=>follower(`full${i}`));g=gen(s);assert.equal(ofType(g,ACTION_TYPES.PLAY_CARD).length,0);assert.ok(g.rejected.some(x=>x.reasonCodes.includes(REASON.ILLEGAL_FIELD_FULL)));
// LA-04..07 attacks / Ward / leader restriction
s=base();s.players.P1.field=[follower('atk')];s.players.P2.field=[follower('ward',{ward:true})];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.ATTACK).length,1);assert.equal(ofType(g,ACTION_TYPES.ATTACK)[0].target.zone,'FIELD');assert.ok(g.rejected.some(x=>x.reasonCodes.includes(REASON.ILLEGAL_WARD_RESTRICTS_TARGET)));
s=base();s.players.P1.field=[follower('used',{attacked:true})];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.ATTACK).length,0);assert.ok(g.rejected.some(x=>x.reasonCodes.includes(REASON.ILLEGAL_ALREADY_ATTACKED)));
s=base();s.players.P1.field=[follower('rush',{summonedThisTurn:true,rush:true,storm:false})];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.ATTACK).some(a=>a.target.zone==='LEADER'),false);assert.ok(g.rejected.some(x=>x.reasonCodes.includes(REASON.ILLEGAL_LEADER_ATTACK_RESTRICTED)));
// LA-08 / LA-09 evolve separation
s=base();s.players.P1.field=[follower('evo')];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.EVOLVE).length,1);assert.equal(ofType(g,ACTION_TYPES.SUPER_EVOLVE).length,1);
// LA-10 / LA-11 target + choice branching
s=base();s.players.P1.hand=[hand('targetSpell')];s.players.P2.field=[follower('t1'),follower('t2')];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.PLAY_CARD).filter(a=>a.source.cardId==='targetSpell').length,2);
s=base();s.players.P1.hand=[hand('choiceSpell')];g=gen(s);assert.equal(JSON.stringify(ofType(g,ACTION_TYPES.PLAY_CARD).filter(a=>a.source.cardId==='choiceSpell').map(a=>a.choice.id).sort()),JSON.stringify(['A','B']));
// LA-12 state update
s=base();s.players.P1.pp=2;s.players.P1.hand=[hand('cheap')];g=gen(s);let a=ofType(g,ACTION_TYPES.PLAY_CARD)[0],ap=engine.applyAction(s,a);assert.equal(ap.status,STATUS.OK);assert.equal(ap.state.players.P1.pp,0);assert.equal(ap.state.players.P1.hand.length,0);assert.equal(ap.state.players.P1.field.length,1);assert.ok(ap.action.resultingState.stateId&&ap.action.resultingState.fingerprint);
// LA-13 / LA-18 / LA-19 trigger resolution, registration order, TURN_PLAYER_FIRST through P-R1 adapter
s=base();s.players.P1.hand=[hand('triggerCard')];g=gen(s);a=ofType(g,ACTION_TYPES.PLAY_CARD)[0];ap=engine.applyAction(s,a);assert.equal(JSON.stringify(ap.state.resolvedTriggers),JSON.stringify(['same-1','same-2','opp-1']));
// LA-14 terminal stops
s=base();s.players.P1.hand=[hand('lethal')];g=gen(s);ap=engine.applyAction(s,ofType(g,ACTION_TYPES.PLAY_CARD)[0]);assert.equal(ap.status,STATUS.TERMINAL);assert.equal(engine.generateLegalActions(ap.state).actions.length,0);
// LA-15 END_TURN ends same-turn branch
s=base();let seq=engine.generateSequences(s,{maxDepth:2,maxNodes:20,maxSequences:20});assert.ok(seq.sequences.some(x=>x.actions.length===1&&x.actions[0].actionType===ACTION_TYPES.END_TURN&&x.stopReason===REASON.END_TURN_BRANCH));
// LA-16 unknown card is never guessed
s=base();s.players.P1.hand=[hand('mystery')];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.PLAY_CARD).length,0);assert.ok(g.unknown.some(x=>x.reasonCodes.includes(REASON.UNKNOWN_CARD_AUTHORITY)));
// LA-17 indeterminate rule order stops generation
s=base({authorityStatus:'INDETERMINATE_RULE_ORDER'});g=gen(s);assert.equal(g.status,STATUS.UNRESOLVED);assert.equal(g.actions.length,0);assert.ok(g.reasonCodes.includes(REASON.INDETERMINATE_RULE_ORDER));
// card-specific illegality + stale action protection
s=base();s.players.P1.hand=[hand('restricted')];g=gen(s);assert.equal(ofType(g,ACTION_TYPES.PLAY_CARD).length,0);assert.ok(g.rejected.some(x=>x.reasonCodes.includes('CARD_CONDITION_FALSE')));
s=base();s.players.P1.hand=[hand('cheap')];g=gen(s);a=ofType(g,ACTION_TYPES.PLAY_CARD)[0];const changed=deep(s);changed.players.P1.pp=1;ap=engine.applyAction(changed,a);assert.equal(ap.status,STATUS.ERROR);assert.ok(ap.reasonCodes.includes(REASON.ILLEGAL_STATE_CHANGED));
// explicit pending TARGET / CHOICE action models
s=base({pendingDecision:{id:'pd1',type:'TARGET',source:{cardId:'x'},options:[{zone:'FIELD',instanceId:'a'},{zone:'FIELD',instanceId:'b'}]}});g=gen(s);assert.equal(g.actions.length,2);assert.ok(g.actions.every(x=>x.actionType===ACTION_TYPES.TARGET_SELECT));
s=base({pendingDecision:{id:'pd2',type:'CHOICE',source:{cardId:'x'},options:[{id:'A'},{id:'B'}]}});g=gen(s);assert.equal(g.actions.length,2);assert.ok(g.actions.every(x=>x.actionType===ACTION_TYPES.CHOICE_SELECT));
// LA-20 duplicate-state suppression while retaining witness sequence
s=base();s.players.P1.field=[follower('a',{activations:[{id:'one',legality:'LEGAL'}]}),follower('b',{activations:[{id:'two',legality:'LEGAL'}]})];seq=engine.generateSequences(s,{maxDepth:2,maxNodes:50,maxSequences:30});assert.ok(seq.diagnostics.duplicates+seq.diagnostics.cycles>0);assert.ok(seq.sequences.some(x=>x.stopReason===REASON.DUPLICATE_STATE||x.stopReason===REASON.CYCLE_DETECTED));

// Required multi-action sequence coverage.
s=base();s.players.P1.pp=2;s.players.P1.hand=[hand('storm'),hand('choiceSpell')];seq=engine.generateSequences(s,{maxDepth:3,maxNodes:100,maxSequences:60});assert.ok(seq.sequences.some(x=>x.actions.length>=2&&x.actions[0].actionType===ACTION_TYPES.PLAY_CARD&&x.actions[0].source.cardId==='storm'&&x.actions[1].actionType===ACTION_TYPES.ATTACK));
s=base();s.players.P1.pp=2;s.players.P1.hand=[hand('cheap')];seq=engine.generateSequences(s,{maxDepth:4,maxNodes:150,maxSequences:80});assert.ok(seq.sequences.some(x=>x.actions.length>=3&&x.actions[0].actionType===ACTION_TYPES.PLAY_CARD&&x.actions[1].actionType===ACTION_TYPES.EVOLVE&&x.actions[2].actionType===ACTION_TYPES.ATTACK));
s=base();s.players.P1.pp=2;s.players.P1.field=[follower('atk')];s.players.P1.hand=[hand('cheap')];seq=engine.generateSequences(s,{maxDepth:3,maxNodes:120,maxSequences:80});assert.ok(seq.sequences.some(x=>x.actions.length>=2&&x.actions[0].actionType===ACTION_TYPES.ATTACK&&x.actions[1].actionType===ACTION_TYPES.PLAY_CARD));
s=base();s.players.P1.pp=4;s.players.P1.hand=[hand('cheap'),hand('cheap2','cheap')];seq=engine.generateSequences(s,{maxDepth:3,maxNodes:120,maxSequences:80});assert.ok(seq.sequences.some(x=>x.actions.length>=2&&x.actions[0].actionType===ACTION_TYPES.PLAY_CARD&&x.actions[1].actionType===ACTION_TYPES.PLAY_CARD));
s=base();s.players.P1.field=[follower('evo')];seq=engine.generateSequences(s,{maxDepth:3,maxNodes:100,maxSequences:60});assert.ok(seq.sequences.some(x=>x.actions.length>=2&&x.actions[0].actionType===ACTION_TYPES.EVOLVE&&x.actions[1].actionType===ACTION_TYPES.ATTACK));
s=base();s.players.P1.pp=2;s.players.P1.hand=[hand('triggerCard'),hand('choiceSpell')];seq=engine.generateSequences(s,{maxDepth:3,maxNodes:120,maxSequences:80});assert.ok(seq.sequences.some(x=>x.actions.length>=2&&x.actions[0].actionType===ACTION_TYPES.PLAY_CARD&&x.actions[0].source.cardId==='triggerCard'&&x.actions[1].actionType===ACTION_TYPES.PLAY_CARD));
// Mid-sequence legality changes: PP spent makes the previously legal 2-cost card illegal.
s=base();s.players.P1.pp=2;s.players.P1.hand=[hand('choiceSpell'),hand('cheap')];g=gen(s);ap=engine.applyAction(s,ofType(g,ACTION_TYPES.PLAY_CARD).find(x=>x.source.cardId==='choiceSpell'));assert.equal(gen(ap.state).actions.some(x=>x.actionType===ACTION_TYPES.PLAY_CARD&&x.source.cardId==='cheap'),false);
// Limits and conservative fallback fingerprint.
s=base();seq=engine.generateSequences(s,{maxDepth:1,maxNodes:1,maxSequences:10});assert.ok([STATUS.OK,STATUS.LIMIT].includes(seq.status));assert.ok(seq.nodes<=1);
const fallbackAdapter={...adapter};delete fallbackAdapter.fingerprint;const fallback=P.create({stateAdapter:fallbackAdapter,ruleEngine,cardAuthority}),fa=base(),fb=deep(fa);fb.history={onceUsed:true};assert.notEqual(fallback.stateFingerprint(fa),fallback.stateFingerprint(fb));
assert.equal(P.version,'pa1-legal-action-sequence-v1.0.0');
console.log('P-A1 LEGAL ACTION / SEQUENCE REGRESSION PASS');

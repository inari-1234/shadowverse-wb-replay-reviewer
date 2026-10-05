import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const WB={registerModule(){}};
const sandbox={window:{WB},console};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../outcome-backtracking.js',import.meta.url),'utf8')).runInContext(sandbox);
const P=WB.OutcomeBacktracking,{LETHAL_STATUS,SURVIVAL_STATUS,RESPONSE_TYPE,DRAW_STATUS,REASON,STATUS}=P;
const deep=v=>JSON.parse(JSON.stringify(v));

function player(over={}){return {leaderHp:20,pp:5,maxPP:5,ep:1,sep:1,fieldLimit:5,hand:[],field:[],destroyedCount:0,playCount:0,...deep(over)};}
function node(name,over={}){return {id:name,node:name,activePlayer:'P1',players:{P1:player(),P2:player()},terminal:false,winner:null,loser:null,lastOutcomeEvents:[],...deep(over)};}
function follower(id,over={}){return {instanceId:id,cardId:id,kind:'FOLLOWER',attack:2,hp:2,canAttack:true,canAttackLeader:true,targetable:true,ward:false,...over};}
function hand(id,over={}){return {instanceId:`h:${id}`,cardId:id,...over};}
function makeHarness(nodes,edges,{options={}}={}){
 const table=Object.fromEntries(Object.entries(nodes).map(([k,v])=>[k,deep(v)]));
 const edgeTable={}; for(const e of edges){(edgeTable[e.from]??=[]).push(e);}
 const fp=s=>String(s.fingerprint??s.node);
 const adapter={
  getStateId:s=>s.id,
  getActivePlayer:s=>s.activePlayer,
  getOpponentPlayer:(_s,p)=>p==='P1'?'P2':'P1',
  getPlayerView:(s,p)=>({...deep(s.players[p]),opponentPlayer:p==='P1'?'P2':'P1'}),
  getOutcomeEvents:(_b,a)=>deep(a.lastOutcomeEvents||[])
 };
 const ruleEngine={
  getAuthorityStatus:s=>s.authorityStatus?{status:s.authorityStatus,reasons:s.authorityReasons||[]}:{status:'RESOLVED'},
  getTerminalStatus:s=>s.terminal?{terminal:true,winner:s.winner,loser:s.loser,reasons:s.terminalReasons||['LEADER_LETHAL']}:{terminal:false}
 };
 const actionEngine={
  stateFingerprint:fp,
  generateLegalActions(s,{sequenceDepth=0}={}){
   if(s.authorityStatus==='INDETERMINATE_RULE_ORDER')return {status:'UNRESOLVED',actions:[],unknown:[],reasonCodes:['INDETERMINATE_RULE_ORDER']};
   if(s.authorityStatus==='UNRESOLVED')return {status:'UNRESOLVED',actions:[],unknown:[],reasonCodes:s.authorityReasons||['UNRESOLVED_LEGALITY']};
   if(s.terminal)return {status:'TERMINAL',actions:[],unknown:[],reasonCodes:['TERMINAL_STATE']};
   const actions=(edgeTable[s.node]||[]).filter(e=>e.actor==null||e.actor===s.activePlayer).map(e=>({actionId:e.id,actionType:e.type||'PLAY_CARD',actorPlayer:s.activePlayer,source:e.source||null,target:e.target||null,cost:e.cost||null,requiredState:{stateId:s.id,fingerprint:fp(s)},resultingState:null,ruleAuthority:'TEST:P-A1',legality:e.legality||'LEGAL',uncertainty:null,sequenceDepth,reasonCodes:e.reasonCodes||['LEGAL_TEST']}));
   const unknown=(s.unknownReasons||[]).map(r=>({legality:'UNKNOWN',reasonCodes:[r]}));
   return {status:'OK',stateId:s.id,stateFingerprint:fp(s),actions:actions.filter(a=>a.legality==='LEGAL'),rejected:actions.filter(a=>a.legality==='ILLEGAL'),unknown,reasonCodes:[]};
  },
  applyAction(s,a){
   if(!a||a.legality!=='LEGAL')return {status:'UNRESOLVED',state:null,reasonCodes:['UNRESOLVED_LEGALITY']};
   if(!a.requiredState||a.requiredState.fingerprint!==fp(s))return {status:'ERROR',state:null,reasonCodes:['ILLEGAL_STATE_CHANGED']};
   const e=(edgeTable[s.node]||[]).find(x=>x.id===a.actionId);
   if(!e)return {status:'ERROR',state:null,reasonCodes:['UNRESOLVED_LEGALITY']};
   if(e.status==='UNRESOLVED')return {status:'UNRESOLVED',state:e.to?deep(table[e.to]):deep(s),reasonCodes:e.reasonCodes||['UNKNOWN_EFFECT_RULE']};
   if(e.status==='ERROR')return {status:'ERROR',state:null,reasonCodes:e.reasonCodes||['UNKNOWN_EFFECT_RULE']};
   const ns=deep(table[e.to]); if(!ns)throw new Error(`missing node ${e.to}`);
   const out={...a,resultingState:{stateId:ns.id,fingerprint:fp(ns)}};
   return {status:ns.terminal?'TERMINAL':'OK',state:ns,stateId:ns.id,stateFingerprint:fp(ns),action:out,reasonCodes:e.resultReasons||[]};
  }
 };
 const engine=P.create({actionEngine,stateAdapter:adapter,ruleEngine},{maxDepth:6,maxNodes:100,maxBranches:20,maxOpponentResponses:20,maxContinuations:30,maxTurns:2,...options});
 const state=name=>deep(table[name]);
 const action=(name,id)=>actionEngine.generateLegalActions(state(name)).actions.find(a=>a.actionId===id);
 return {engine,state,action,actionEngine,adapter,ruleEngine};
}
function evalOne(nodes,edges,inputId='PLAY',{start='S0',limits={}}={}){const h=makeHarness(nodes,edges);const a=h.action(start,inputId);assert.ok(a,`missing input action ${inputId}`);return {h,out:h.engine.evaluateSequence(h.state(start),[a],limits)};}

// OC-01 immediate damage.
{
 const S0=node('S0'),S1=node('S1');S1.players.P2.leaderHp=15;
 const {out}=evalOne({S0,S1},[{from:'S0',to:'S1',id:'PLAY'}]);
 assert.equal(out.damageAmount,5);
}
// OC-02 immediate lethal.
{
 const S0=node('S0'),T=node('T',{terminal:true,winner:'P1',loser:'P2'});T.players.P2.leaderHp=0;
 const {out}=evalOne({S0,T},[{from:'S0',to:'T',id:'PLAY'}]);
 assert.equal(out.lethalStatus,LETHAL_STATUS.IMMEDIATE_LETHAL);
}
// OC-03 terminal pruning: no future response exploration.
{
 const S0=node('S0'),T=node('T',{terminal:true,winner:'P1',loser:'P2'});T.players.P2.leaderHp=0;
 const {out}=evalOne({S0,T},[{from:'S0',to:'T',id:'PLAY'}]);
 assert.equal(out.futureOutcome.opponentResponses.length,0);assert.ok(out.reasonCodes.includes(REASON.TERMINAL_PRUNED));
}
// OC-04 board retained.
{
 const S0=node('S0'),S1=node('S1');S1.players.P1.field=[follower('a',{attack:4})];
 const {out}=evalOne({S0,S1},[{from:'S0',to:'S1',id:'PLAY'}]);assert.equal(out.boardState.followerCount,1);assert.equal(out.boardState.totalAttack,4);
}
// OC-05 / 06 / 07 PP, EP, SEP retained.
{
 const S0=node('S0'),S1=node('S1');Object.assign(S1.players.P1,{pp:2,ep:0,sep:0});
 const {out}=evalOne({S0,S1},[{from:'S0',to:'S1',id:'PLAY'}]);assert.equal(out.PP,2);assert.equal(out.EP,0);assert.equal(out.SEP,0);
}
// OC-08 hand resources retained, including persistent counters.
{
 const S0=node('S0'),S1=node('S1');S1.players.P1.hand=[hand('x'),hand('mystery',{known:false})];S1.players.P1.flag=2;S1.players.P1.crest=['c1'];
 const {out}=evalOne({S0,S1},[{from:'S0',to:'S1',id:'PLAY'}]);assert.equal(out.handResources.handCount,2);assert.equal(out.handResources.unknownHandCount,1);assert.equal(out.persistentResources.flag,2);
}
// OC-09 drain recovers HP.
{
 const S0=node('S0');S0.players.P1.leaderHp=10;const S1=node('S1');S1.players.P1.leaderHp=13;S1.players.P2.leaderHp=17;S1.lastOutcomeEvents=[{type:'DRAIN',player:'P1',targetPlayer:'P1',amount:3,certainty:'CONFIRMED'},{type:'DAMAGE',targetPlayer:'P2',amount:3,certainty:'CONFIRMED'}];
 const {out}=evalOne({S0,S1},[{from:'S0',to:'S1',id:'PLAY'}]);assert.equal(out.drainAmount,3);assert.equal(out.healAmount,3);
}
// OC-10 direct heal.
{
 const S0=node('S0');S0.players.P1.leaderHp=10;const S1=node('S1');S1.players.P1.leaderHp=14;S1.lastOutcomeEvents=[{type:'HEAL',player:'P1',amount:4,certainty:'CONFIRMED'}];
 const {out}=evalOne({S0,S1},[{from:'S0',to:'S1',id:'PLAY'}]);assert.equal(out.healAmount,4);assert.equal(out.drainAmount,0);
}
// OC-11 next-turn lethal confirmed.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1'}),T=node('T',{activePlayer:'P1',terminal:true,winner:'P1',loser:'P2'});T.players.P2.leaderHp=0;
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'M0',id:'ET2',type:'END_TURN'},{from:'M0',to:'T',id:'KILL',type:'ATTACK'}];
 const {out}=evalOne({S0,S1,O0,M0,T},edges);assert.equal(out.lethalStatus,LETHAL_STATUS.NEXT_TURN_LETHAL_FORCED);
}
// OC-12 Ward blocks next-turn lethal.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1'}),M1=node('M1',{activePlayer:'P1'}),E=node('E',{activePlayer:'P2'});M0.players.P2.field=[follower('ward',{ward:true,hp:5})];M1.players.P2.field=[];
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'M0',id:'ET2',type:'END_TURN'},{from:'M0',to:'M1',id:'WARD_HIT',type:'ATTACK',target:{zone:'FIELD'}},{from:'M1',to:'E',id:'ET3',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,M0,M1,E},edges);assert.equal(out.lethalStatus,LETHAL_STATUS.NO_CONFIRMED_LETHAL);
}
// OC-13 opponent removal deletes board lethal.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),O1=node('O1',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1'}),E=node('E',{activePlayer:'P2'});S1.players.P1.field=[follower('threat',{attack:10})];O0.players.P1.field=[follower('threat',{attack:10})];O1.players.P1.field=[];M0.players.P1.field=[];
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'O1',id:'REMOVE'},{from:'O1',to:'M0',id:'ET2',type:'END_TURN'},{from:'M0',to:'E',id:'ET3',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,O1,M0,E},edges);assert.equal(out.lethalStatus,LETHAL_STATUS.NO_CONFIRMED_LETHAL);
}
// OC-14 lethal remains after opponent response.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),O1=node('O1',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1'}),T=node('T',{terminal:true,winner:'P1',loser:'P2'});T.players.P2.leaderHp=0;
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'O1',id:'REMOVE'},{from:'O1',to:'M0',id:'ET2',type:'END_TURN'},{from:'M0',to:'T',id:'SPELL_KILL'}];
 const {out}=evalOne({S0,S1,O0,O1,M0,T},edges);assert.equal(out.lethalStatus,LETHAL_STATUS.NEXT_TURN_LETHAL_FORCED);
}
// OC-15 opponent heal moves out of lethal range.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),O1=node('O1',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1'}),E=node('E',{activePlayer:'P2'});S1.players.P2.leaderHp=3;O0.players.P2.leaderHp=3;O1.players.P2.leaderHp=8;O1.lastOutcomeEvents=[{type:'HEAL',player:'P2',amount:5,certainty:'CONFIRMED'}];M0.players.P2.leaderHp=8;
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'O1',id:'HEAL'},{from:'O1',to:'M0',id:'ET2',type:'END_TURN'},{from:'M0',to:'E',id:'ET3',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,O1,M0,E},edges);assert.equal(out.lethalStatus,LETHAL_STATUS.NO_CONFIRMED_LETHAL);assert.ok(out.opponentResponses.some(r=>r.opponentHealAmount>=5));
}
// OC-16 board left behind provides Drain target.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),O1=node('O1',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1'});S1.players.P1.field=[follower('target')];O0.players.P1.field=[follower('target')];O1.players.P2.leaderHp=15;O1.lastOutcomeEvents=[{type:'DRAIN',player:'P2',targetPlayer:'P2',amount:3,certainty:'CONFIRMED'}];
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'O1',id:'DRAIN'},{from:'O1',to:'M0',id:'ET2',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,O1,M0},edges);assert.ok(out.opponentResponses.some(r=>r.opponentDrainAmount===3));
}
// OC-17 empty board removes confirmed Drain response.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'M0',id:'ET2',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,M0},edges);assert.equal(Math.max(0,...out.opponentResponses.map(r=>r.opponentDrainAmount||0)),0);
}
// OC-18 unknown opponent hand is never materialized as a card response.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2',unknownReasons:['UNKNOWN_CARD_AUTHORITY']}),M0=node('M0',{activePlayer:'P1'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'M0',id:'ET2',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,M0},edges);assert.ok(out.uncertainty.includes(REASON.OPPONENT_RESPONSE_UNKNOWN_HAND));assert.notEqual(out.lethalStatus,LETHAL_STATUS.NEXT_TURN_LETHAL_FORCED);assert.ok(out.opponentResponses.some(r=>r.responseType===RESPONSE_TYPE.UNKNOWN_HAND_DEPENDENT_RESPONSE));
}
// OC-19 unknown draw never becomes confirmed lethal.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1',unknownReasons:['UNKNOWN_CARD_AUTHORITY']});M0.lastOutcomeEvents=[{type:'DRAW',player:'P1',certainty:'UNKNOWN'}];
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'M0',id:'ET2',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,M0},edges);assert.equal(out.futureOutcome.drawStatus,DRAW_STATUS.UNKNOWN_DRAW);assert.notEqual(out.lethalStatus,LETHAL_STATUS.NEXT_TURN_LETHAL_FORCED);
}
// Extra: unknown effect is preserved as a rule uncertainty, not mislabeled as unknown hand.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2',unknownReasons:['UNKNOWN_EFFECT_RULE']}),M0=node('M0',{activePlayer:'P1'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'M0',id:'ET2',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,M0},edges);assert.ok(out.uncertainty.includes(REASON.UNKNOWN_EFFECT_RULE));assert.equal(out.uncertainty.includes(REASON.OPPONENT_RESPONSE_UNKNOWN_HAND),false);
}
// OC-20 indeterminate rule ordering safely stops.
{
 const S0=node('S0'),S1=node('S1',{authorityStatus:'INDETERMINATE_RULE_ORDER'});
 const {out}=evalOne({S0,S1},[{from:'S0',to:'S1',id:'PLAY'}]);assert.equal(out.lethalStatus,LETHAL_STATUS.LETHAL_UNKNOWN);assert.ok(out.uncertainty.includes(REASON.INDETERMINATE_RULE_ORDER)||out.reasonCodes.includes(REASON.INDETERMINATE_RULE_ORDER));
}
// OC-21 memoization across converged self-turn searches.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),OA=node('OA',{activePlayer:'P2'}),OB=node('OB',{activePlayer:'P2'}),MA=node('MA',{activePlayer:'P1',fingerprint:'M-SAME'}),MB=node('MB',{activePlayer:'P1',fingerprint:'M-SAME'}),EA=node('EA',{activePlayer:'P2'}),EB=node('EB',{activePlayer:'P2'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'OA',id:'A'},{from:'O0',to:'OB',id:'B'},{from:'OA',to:'MA',id:'ETA',type:'END_TURN'},{from:'OB',to:'MB',id:'ETB',type:'END_TURN'},{from:'MA',to:'EA',id:'ENDM',type:'END_TURN'},{from:'MB',to:'EB',id:'ENDM',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,OA,OB,MA,MB,EA,EB},edges);assert.ok(out.futureOutcome.search.memoHits>=1);
}
// OC-22 duplicate-state suppression.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),OA=node('OA',{activePlayer:'P2',fingerprint:'DUP'}),OB=node('OB',{activePlayer:'P2',fingerprint:'DUP'}),M=node('M',{activePlayer:'P1'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'OA',id:'A'},{from:'O0',to:'OB',id:'B'},{from:'OA',to:'M',id:'ETA',type:'END_TURN'},{from:'OB',to:'M',id:'ETB',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,OA,OB,M},edges);assert.ok(out.futureOutcome.search.opponentDuplicates>=1);
}
// OC-23 cycle detection.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),OC=node('OC',{activePlayer:'P2',fingerprint:'O0'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'OC',id:'LOOP'}];
 const {out}=evalOne({S0,S1,O0,OC},edges);assert.ok(out.futureOutcome.search.opponentCycles>=1);
}
// OC-24 maxDepth stop.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),O1=node('O1',{activePlayer:'P2'}),O2=node('O2',{activePlayer:'P2'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'O1',id:'A'},{from:'O1',to:'O2',id:'B'}];
 const {out}=evalOne({S0,S1,O0,O1,O2},edges,'PLAY',{limits:{maxDepth:1}});assert.ok(out.uncertainty.includes(REASON.DEPTH_LIMIT)||out.uncertainty.includes(REASON.SEARCH_TRUNCATED));
}
// OC-25 maxNodes is global across opponent/continuation search.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),O1=node('O1',{activePlayer:'P2'}),M=node('M',{activePlayer:'P1'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'O1',id:'A'},{from:'O1',to:'M',id:'ET2',type:'END_TURN'}];
 const {out}=evalOne({S0,S1,O0,O1,M},edges,'PLAY',{limits:{maxNodes:1}});assert.equal(out.futureOutcome.search.limits.globalNodes,1);assert.ok(out.uncertainty.includes(REASON.NODE_LIMIT)||out.uncertainty.includes(REASON.SEARCH_TRUNCATED));
}
// OC-26 outcome diff API.
{
 const A={sequenceId:'A',lethalStatus:LETHAL_STATUS.NO_CONFIRMED_LETHAL,survivalStatus:SURVIVAL_STATUS.CONFIRMED_SURVIVAL,uncertainty:[],immediateOutcome:{damageAmount:15,leaderHP:10,opponentLeaderHP:5,drainAmount:0,healAmount:0,boardState:{followerCount:0,totalAttack:0},opponentBoardState:{followerCount:0,totalAttack:0},handResources:{pp:0,ep:0,sep:0,handCount:0}},futureOutcome:{opponentResponses:[]}};
 const B={sequenceId:'B',lethalStatus:LETHAL_STATUS.NEXT_TURN_LETHAL_POSSIBLE,survivalStatus:SURVIVAL_STATUS.CONFIRMED_SURVIVAL,uncertainty:[],immediateOutcome:{damageAmount:12,leaderHP:10,opponentLeaderHP:8,drainAmount:0,healAmount:0,boardState:{followerCount:2,totalAttack:10},opponentBoardState:{followerCount:0,totalAttack:0},handResources:{pp:1,ep:0,sep:0,handCount:2}},futureOutcome:{opponentResponses:[]}};
 const d=P.create?null:null; // keep lint-free marker
 const h=makeHarness({S0:node('S0')},[]);const cmp=h.engine.compareOutcomes(A,B);assert.equal(cmp.damageDelta,3);assert.equal(cmp.boardDelta.ownAttack,-10);assert.equal(cmp.resourceDelta.hand,-2);
}
// OC-27 lower immediate damage can preserve stronger next-turn lethal.
{
 const h=makeHarness({S0:node('S0')},[]);const A={sequenceId:'A',lethalStatus:LETHAL_STATUS.NO_CONFIRMED_LETHAL,survivalStatus:SURVIVAL_STATUS.CONFIRMED_SURVIVAL,uncertainty:[],immediateOutcome:{damageAmount:15,leaderHP:20,opponentLeaderHP:5,drainAmount:0,healAmount:0,boardState:{followerCount:0,totalAttack:0},opponentBoardState:{followerCount:0,totalAttack:0},handResources:{pp:0,ep:0,sep:0,handCount:0}},futureOutcome:{opponentResponses:[]}};const B=deep(A);B.sequenceId='B';B.lethalStatus=LETHAL_STATUS.NEXT_TURN_LETHAL_FORCED;B.immediateOutcome.damageAmount=12;B.immediateOutcome.boardState={followerCount:2,totalAttack:10};const c=h.engine.compareOutcomes(A,B);assert.ok(c.damageDelta>0);assert.ok(c.lethalTimingDelta.orderDelta>0);
}
// OC-28 higher immediate damage can spend more resources.
{
 const h=makeHarness({S0:node('S0')},[]);const A={sequenceId:'A',lethalStatus:LETHAL_STATUS.NO_CONFIRMED_LETHAL,survivalStatus:SURVIVAL_STATUS.CONFIRMED_SURVIVAL,uncertainty:[],immediateOutcome:{damageAmount:10,leaderHP:20,opponentLeaderHP:10,drainAmount:0,healAmount:0,boardState:{followerCount:0,totalAttack:0},opponentBoardState:{followerCount:0,totalAttack:0},handResources:{pp:0,ep:0,sep:0,handCount:0}},futureOutcome:{opponentResponses:[]}};const B=deep(A);B.sequenceId='B';B.immediateOutcome.damageAmount=7;B.immediateOutcome.handResources.pp=3;B.immediateOutcome.handResources.handCount=2;const c=h.engine.compareOutcomes(A,B);assert.ok(c.damageDelta>0);assert.ok(c.resourceDelta.pp<0&&c.resourceDelta.hand<0);
}
// OC-29 survival difference retained.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),D=node('D',{activePlayer:'P2',terminal:true,winner:'P2',loser:'P1'});D.players.P1.leaderHp=0;
 const {out}=evalOne({S0,S1,O0,D},[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'D',id:'KILL'}]);assert.equal(out.survivalStatus,SURVIVAL_STATUS.CONFIRMED_DEATH);
}
// OC-30 P-A1 UNKNOWN/illegal input is not continued.
{
 const h=makeHarness({S0:node('S0'),S1:node('S1')},[{from:'S0',to:'S1',id:'PLAY'}]);const a=h.action('S0','PLAY');const bad={...a,legality:'UNKNOWN'};const out=h.engine.evaluateSequence(h.state('S0'),[bad]);assert.equal(out.status,STATUS.UNRESOLVED);assert.ok(out.reasonCodes.includes(REASON.ILLEGAL_SEQUENCE_INPUT));
}

// Required comparison Case A: 15 damage empty hand vs 12 damage + board/hand -> future lethal distinction.
{
 const h=makeHarness({S0:node('S0')},[]),A={sequenceId:'A',lethalStatus:LETHAL_STATUS.NO_CONFIRMED_LETHAL,survivalStatus:SURVIVAL_STATUS.CONFIRMED_SURVIVAL,uncertainty:[],immediateOutcome:{damageAmount:15,leaderHP:20,opponentLeaderHP:5,drainAmount:0,healAmount:0,boardState:{followerCount:0,totalAttack:0},opponentBoardState:{followerCount:0,totalAttack:0},handResources:{pp:0,ep:0,sep:0,handCount:0}},futureOutcome:{opponentResponses:[]}},B=deep(A);B.sequenceId='B';B.lethalStatus=LETHAL_STATUS.NEXT_TURN_LETHAL_POSSIBLE;B.immediateOutcome.damageAmount=12;B.immediateOutcome.boardState={followerCount:2,totalAttack:10};B.immediateOutcome.handResources.handCount=2;assert.ok(h.engine.compareOutcomes(A,B).lethalTimingDelta.orderDelta>0);
}
// Required comparison Case B: board left vs clear, Drain risk captured.
{
 const h=makeHarness({S0:node('S0')},[]),A={sequenceId:'A',lethalStatus:LETHAL_STATUS.NO_CONFIRMED_LETHAL,survivalStatus:SURVIVAL_STATUS.CONFIRMED_SURVIVAL,uncertainty:[],immediateOutcome:{damageAmount:8,leaderHP:20,opponentLeaderHP:12,drainAmount:0,healAmount:0,boardState:{followerCount:1,totalAttack:5},opponentBoardState:{followerCount:1,totalAttack:3},handResources:{pp:0,ep:0,sep:0,handCount:1}},futureOutcome:{opponentResponses:[{opponentDrainAmount:4}]}},B=deep(A);B.sequenceId='B';B.immediateOutcome.damageAmount=5;B.futureOutcome.opponentResponses=[{opponentDrainAmount:0}];assert.equal(h.engine.compareOutcomes(A,B).futureOpponentDrainRiskDelta,4);
}
// Required comparison Case C: PP/hand conservation is a structural delta, not a score.
{
 const h=makeHarness({S0:node('S0')},[]),A={sequenceId:'A',lethalStatus:LETHAL_STATUS.NO_CONFIRMED_LETHAL,survivalStatus:SURVIVAL_STATUS.CONFIRMED_SURVIVAL,uncertainty:[],immediateOutcome:{damageAmount:5,leaderHP:20,opponentLeaderHP:15,drainAmount:0,healAmount:0,boardState:{followerCount:0,totalAttack:0},opponentBoardState:{followerCount:0,totalAttack:0},handResources:{pp:0,ep:0,sep:0,handCount:0}},futureOutcome:{opponentResponses:[]}},B=deep(A);B.sequenceId='B';B.immediateOutcome.handResources.pp=2;B.immediateOutcome.handResources.handCount=2;const c=h.engine.compareOutcomes(A,B);assert.equal(c.resourceDelta.pp,-2);assert.equal(c.resourceDelta.hand,-2);
}
// Required comparison Case D: aggression vs self-heal preserves survival status separately.
{
 const h=makeHarness({S0:node('S0')},[]),A={sequenceId:'A',lethalStatus:LETHAL_STATUS.NO_CONFIRMED_LETHAL,survivalStatus:SURVIVAL_STATUS.CONFIRMED_DEATH,uncertainty:[],immediateOutcome:{damageAmount:8,leaderHP:2,opponentLeaderHP:4,drainAmount:0,healAmount:0,boardState:{followerCount:0,totalAttack:0},opponentBoardState:{followerCount:0,totalAttack:0},handResources:{pp:0,ep:0,sep:0,handCount:0}},futureOutcome:{opponentResponses:[]}},B=deep(A);B.sequenceId='B';B.survivalStatus=SURVIVAL_STATUS.CONFIRMED_SURVIVAL;B.immediateOutcome.damageAmount=3;B.immediateOutcome.leaderHP=8;B.immediateOutcome.healAmount=6;const c=h.engine.compareOutcomes(A,B);assert.notEqual(c.survivalDelta.a,c.survivalDelta.b);assert.equal(c.leaderHpDelta.own,-6);
}

// Extended multi-turn horizon + maxTurns control.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),M0=node('M0',{activePlayer:'P1'}),O2=node('O2',{activePlayer:'P2'}),M2=node('M2',{activePlayer:'P1'}),T=node('T',{activePlayer:'P1',terminal:true,winner:'P1',loser:'P2'});T.players.P2.leaderHp=0;
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'M0',id:'ET2',type:'END_TURN'},{from:'M0',to:'O2',id:'ET3',type:'END_TURN'},{from:'O2',to:'M2',id:'ET4',type:'END_TURN'},{from:'M2',to:'T',id:'LATE_KILL',type:'ATTACK'}];
 const {out}=evalOne({S0,S1,O0,M0,O2,M2,T},edges,'PLAY',{limits:{maxTurns:4}});assert.equal(out.lethalStatus,LETHAL_STATUS.MULTI_TURN_LETHAL_POSSIBLE);assert.ok(out.futureOutcome.search.limits.multiTurn.turnsExplored>=2);
}
// maxBranches truncates safely rather than approximating omitted outcomes.
{
 const S0=node('S0'),S1=node('S1'),O0=node('O0',{activePlayer:'P2'}),OA=node('OA',{activePlayer:'P2'}),OB=node('OB',{activePlayer:'P2'});
 const edges=[{from:'S0',to:'S1',id:'PLAY'},{from:'S1',to:'O0',id:'ET1',type:'END_TURN'},{from:'O0',to:'OA',id:'A'},{from:'O0',to:'OB',id:'B'}];
 const {out}=evalOne({S0,S1,O0,OA,OB},edges,'PLAY',{limits:{maxBranches:1}});assert.ok(out.uncertainty.includes(REASON.BRANCH_LIMIT)||out.uncertainty.includes(REASON.SEARCH_TRUNCATED));
}
console.log('P-C1 Outcome Backtracking regression PASS: OC-01..OC-30 + comparison cases A-D');

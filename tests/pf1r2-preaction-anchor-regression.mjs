import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../runtime-authority-binding.js',import.meta.url),'utf8');
const handlers=new Map(),optionalModules=[];
const states=[
  {id:'st:8:bottom:113.638',time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:2,opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'unknown'},opponentWard:'unknown',boardDamage:0,boardDamageKnown:true,hand:{recognized:{}}},
  {id:'st:8:bottom:115.888',time:115.888,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,resources:{extraPP:'unknown',ep:'unknown',sep:'unknown'},opponentWard:'unknown',boardDamage:0,boardDamageKnown:true,hand:{recognized:{}}},
  {id:'st:8:bottom:116.338',time:116.338,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'yes'},opponentWard:'unknown',boardDamage:3,boardDamageKnown:true,hand:{recognized:{}}}
];
const pp={id:'st:8:bottom:113.638->st:8:bottom:115.888:pp',type:'pp-change',fromStateId:states[0].id,toStateId:states[1].id,time:115.888,turn:8,data:{from:2,to:1,delta:-1}};
const board={id:'st:8:bottom:115.888->st:8:bottom:116.338:board',type:'board-damage-change',fromStateId:states[1].id,toStateId:states[2].id,time:116.338,turn:8,data:{from:0,to:3,delta:3}};
const win={id:'dw:'+board.fromStateId+'->'+board.toStateId,beforeState:structuredClone(states[1]),afterState:structuredClone(states[2]),relatedActionIds:[board.id],reviewStart:115.888,reviewEnd:116.338};
let session={states:structuredClone(states),actions:[structuredClone(pp),structuredClone(board)],decisionWindows:[structuredClone(win)]};
const WB={
  optionalModules,stateCaptureHistory:[],CardDB:{get(){return null}},
  registerModule(){},on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},onReady(){},log(){},emit(){},recordError(){},
  videoKey(){return 'pf1r2-preaction-fixture'},$(){return null},
  PositionStateRuntime:{version:'test-position',adapter:{},normalizeCardType(){return 'UNKNOWN'},observationFromCapture(c){const x=c.confirmed||c.context||{};return{sourceStateId:`st:${x.turn}:${x.absoluteSide}:${Number(x.time).toFixed(3)}`,time:Number(x.time),turn:Number(x.turn)}},observationFromReplayState(s){return{sourceStateId:s.id,time:s.time,turn:s.turn,replay:true}},createState(obs,meta){return{schema:'test',observed:obs,meta}}},
  CommonRuleEngineRuntime:{version:'test-rule'},
  ReplaySession:{snapshot(){return structuredClone(session)},ingestState(){}}
};
const sandbox={window:{WB,__wbReplaySessionV1:session},console,structuredClone,Date,Promise,setTimeout,clearTimeout};
vm.createContext(sandbox);
new vm.Script(source,{filename:'runtime-authority-binding.js'}).runInContext(sandbox);
const A=WB.RuntimeAuthorityBinding;
await A.ready();

assert.equal(A.version,'pf0a-runtime-authority-binding-v1.1.3');
assert.equal(A.preActionAnchorVersion,'pf1r2-preaction-anchor-v1.0.0');
assert.ok(optionalModules.some(x=>x.name==='decision-window-preaction-anchor'&&x.version===A.preActionAnchorVersion));

const resolved=A.resolveDecisionAnchor(win,session);
assert.equal(resolved.anchored,true);
assert.equal(resolved.state.id,'st:8:bottom:113.638');
assert.equal(resolved.originalStateId,'st:8:bottom:115.888');
assert.equal(resolved.anchorActionId,pp.id);
assert.equal(resolved.primaryActionId,board.id);
assert.equal(resolved.policy,'adjacent-pp-decrease-before-board-swing');
assert.equal(win.beforeState.id,'st:8:bottom:115.888','source Review Window must remain observationally unchanged');

const targets=A.decisionTargets(session);
assert.equal(targets.length,1);
assert.equal(targets[0].stateId,'st:8:bottom:113.638');
assert.equal(targets[0].anchored,true);
assert.equal(targets[0].originalStateId,'st:8:bottom:115.888');

const ps=await A.getPositionState({windowId:win.id,context:{window:win},session});
assert.equal(ps.observed.sourceStateId,'st:8:bottom:113.638');
assert.equal(ps.meta.preActionAnchor.anchored,true);

const noPp={...session,actions:[board]};
assert.equal(A.resolveDecisionAnchor(win,noPp).anchored,false,'no adjacent PP decrease must preserve original anchor');
assert.equal(A.resolveDecisionAnchor(win,noPp).state.id,win.beforeState.id);

const ppIncrease={...pp,data:{from:1,to:2,delta:1}};
assert.equal(A.resolveDecisionAnchor(win,{...session,actions:[ppIncrease,board]}).anchored,false,'PP increase must not re-anchor');

const nonAdjacent={...pp,toStateId:'st:8:bottom:999.999'};
assert.equal(A.resolveDecisionAnchor(win,{...session,actions:[nonAdjacent,board]}).anchored,false,'non-adjacent PP change must not re-anchor');

const ambiguous={...pp,id:'other-pp'};
assert.equal(A.resolveDecisionAnchor(win,{...session,actions:[pp,ambiguous,board]}).anchored,false,'ambiguous multiple PP edges must fail closed');

const farAnchor={...states[0],id:'st:8:bottom:110.000',time:110};
const farPp={...pp,id:'far-pp',fromStateId:farAnchor.id};
assert.equal(A.resolveDecisionAnchor(win,{...session,states:[farAnchor,states[1],states[2]],actions:[farPp,board]}).anchored,false,'pre-action span above 3 seconds must fail closed');

const otherTurn={...states[0],id:'st:7:bottom:113.638',turn:7};
const otherPp={...pp,id:'other-turn-pp',fromStateId:otherTurn.id,turn:8};
assert.equal(A.resolveDecisionAnchor(win,{...session,states:[otherTurn,states[1],states[2]],actions:[otherPp,board]}).anchored,false,'turn mismatch must fail closed');

const hpAction={id:'hp',type:'opponent-hp-change',fromStateId:states[1].id,toStateId:states[2].id,time:116.338,turn:8,data:{from:16,to:13,delta:-3}};
const hpWin={...win,id:'dw-hp',relatedActionIds:[hpAction.id]};
assert.equal(A.resolveDecisionAnchor(hpWin,{...session,actions:[pp,hpAction]}).anchored,false,'non-board Review Window must not re-anchor');

console.log('P-F1-R2 PREACTION ANCHOR REGRESSION PASS: 18/18');

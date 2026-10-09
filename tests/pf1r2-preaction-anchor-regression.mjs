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
vm.createContext(sandbox);new vm.Script(source,{filename:'runtime-authority-binding.js'}).runInContext(sandbox);
const A=WB.RuntimeAuthorityBinding;await A.ready();
let n=0;const t=(name,fn)=>{try{fn();n++}catch(e){e.message=`${name}: ${e.message}`;throw e}};

t('PRE-01 version',()=>assert.equal(A.preActionAnchorVersion,'pf1r2-preaction-anchor-v1.1.0'));
t('PRE-02 optional module',()=>assert.ok(optionalModules.some(x=>x.name==='decision-window-preaction-anchor'&&x.version===A.preActionAnchorVersion)));
const resolved=A.resolveDecisionAnchor(win,session);
t('PRE-03 anchored',()=>assert.equal(resolved.anchored,true));
t('PRE-04 anchor state',()=>assert.equal(resolved.state.id,'st:8:bottom:113.638'));
t('PRE-05 original state',()=>assert.equal(resolved.originalStateId,'st:8:bottom:115.888'));
t('PRE-06 pp edge',()=>assert.equal(resolved.anchorActionId,pp.id));
t('PRE-07 primary edge',()=>assert.equal(resolved.primaryActionId,board.id));
t('PRE-08 policy',()=>assert.equal(resolved.policy,'adjacent-exclusive-pp-decrease-before-board-swing'));
t('PRE-09 source window unchanged',()=>assert.equal(win.beforeState.id,'st:8:bottom:115.888'));
const targets=A.decisionTargets(session);
t('PRE-10 target anchor',()=>assert.equal(targets[0].stateId,'st:8:bottom:113.638'));
t('PRE-11 no PP fallback',()=>assert.equal(A.resolveDecisionAnchor(win,{...session,actions:[board]}).anchored,false));
const ppIncrease={...pp,data:{from:1,to:2,delta:1}};
t('PRE-12 PP increase fallback',()=>assert.equal(A.resolveDecisionAnchor(win,{...session,actions:[ppIncrease,board]}).anchored,false));
const nonAdjacent={...pp,toStateId:'st:8:bottom:999.999'};
t('PRE-13 non-adjacent fallback',()=>assert.equal(A.resolveDecisionAnchor(win,{...session,actions:[nonAdjacent,board]}).anchored,false));
const ambiguous={...pp,id:'other-pp'};
t('PRE-14 multiple PP blocked',()=>{const r=A.resolveDecisionAnchor(win,{...session,actions:[pp,ambiguous,board]});assert.equal(r.blocked,true);assert.equal(r.blockReason,'PREACTION_PP_EDGE_AMBIGUOUS')});
const farAnchor={...states[0],id:'st:8:bottom:110.000',time:110},farPp={...pp,id:'far-pp',fromStateId:farAnchor.id};
t('PRE-15 far anchor blocked',()=>assert.equal(A.resolveDecisionAnchor(win,{...session,states:[farAnchor,states[1],states[2]],actions:[farPp,board]}).blocked,true));
const otherTurn={...states[0],id:'st:7:bottom:113.638',turn:7},otherPp={...pp,id:'other-turn-pp',fromStateId:otherTurn.id,turn:8};
t('PRE-16 turn mismatch blocked',()=>assert.equal(A.resolveDecisionAnchor(win,{...session,states:[otherTurn,states[1],states[2]],actions:[otherPp,board]}).blocked,true));
const hpAction={id:'hp',type:'opponent-hp-change',fromStateId:states[1].id,toStateId:states[2].id,time:116.338,turn:8,data:{from:16,to:13,delta:-3}},hpWin={...win,id:'dw-hp',relatedActionIds:[hpAction.id]};
t('PRE-17 non-board no anchor',()=>assert.equal(A.resolveDecisionAnchor(hpWin,{...session,actions:[pp,hpAction]}).anchored,false));
const cohabiting={id:'res',type:'resource-change',fromStateId:states[0].id,toStateId:states[1].id,time:115.888,turn:8,data:{resource:'ep',from:'yes',to:'no'}};
t('PRE-18 cohabiting action blocked',()=>{const r=A.resolveDecisionAnchor(win,{...session,actions:[pp,cohabiting,board]});assert.equal(r.blocked,true);assert.equal(r.blockReason,'PREACTION_COHABITING_ACTION')});
const ppMismatch={...pp,data:{from:3,to:1,delta:-2}};
t('PRE-19 PP state mismatch blocked',()=>assert.equal(A.resolveDecisionAnchor(win,{...session,actions:[ppMismatch,board]}).blockReason,'PREACTION_PP_STATE_MISMATCH'));
const boardMismatch={...board,data:{from:0,to:4,delta:4}},badWin={...win,relatedActionIds:[boardMismatch.id]};
t('PRE-20 board state mismatch blocked',()=>assert.equal(A.resolveDecisionAnchor(badWin,{...session,actions:[pp,boardMismatch]}).blockReason,'PREACTION_BOARD_STATE_MISMATCH'));
const primary2={...board,id:'board2'};
t('PRE-21 multiple primary blocked',()=>{const w={...win,relatedActionIds:[board.id,primary2.id]};assert.equal(A.resolveDecisionAnchor(w,{...session,actions:[pp,board,primary2]}).blockReason,'PREACTION_PRIMARY_ACTION_AMBIGUOUS')});
assert.equal(n,21);console.log(`P-F1-R2 PREACTION ANCHOR REGRESSION PASS: ${n}/${n}`);
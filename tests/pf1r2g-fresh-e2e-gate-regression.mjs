import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const bindingSource=fs.readFileSync(new URL('../runtime-authority-binding.js',import.meta.url),'utf8');
const handlers=new Map(),optionalModules=[];
const video={currentTime:120};
const anchor={id:'st:8:bottom:113.638',time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:2,opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'unknown'},opponentWard:'unknown',boardDamage:0,boardDamageKnown:true,hand:{recognized:{quickBlader:{known:true,count:1,confidence:.9221}}}};
const before={id:'st:8:bottom:115.888',time:115.888,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,resources:{extraPP:'unknown',ep:'unknown',sep:'unknown'},opponentWard:'unknown',boardDamage:0,boardDamageKnown:true,hand:{recognized:{}}};
const after={id:'st:8:bottom:116.338',time:116.338,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'yes'},opponentWard:'unknown',boardDamage:3,boardDamageKnown:true,hand:{recognized:{}}};
const pp={id:'pp',type:'pp-change',fromStateId:anchor.id,toStateId:before.id,time:before.time,turn:8,data:{from:2,to:1,delta:-1}};
const board={id:'board',type:'board-damage-change',fromStateId:before.id,toStateId:after.id,time:after.time,turn:8,data:{from:0,to:3,delta:3}};
const win={id:'w8',beforeState:structuredClone(before),afterState:structuredClone(after),relatedActionIds:[board.id]};
let session={states:[structuredClone(anchor),structuredClone(before),structuredClone(after)],actions:[structuredClone(pp),structuredClone(board)],decisionWindows:[structuredClone(win)]};
let failAfter=false;
const makeCapture=t=>{
  const src=Math.abs(t-after.time)<.001&&failAfter?{...after,time:116.999,id:'st:8:bottom:116.999'}:Math.abs(t-anchor.time)<.001?anchor:Math.abs(t-after.time)<.001?after:before;
  return{at:new Date().toISOString(),context:{time:src.time,turn:src.turn,absoluteSide:src.absoluteSide,relativeSide:src.relativeSide},confirmed:{time:src.time,turn:src.turn,absoluteSide:src.absoluteSide,relativeSide:src.relativeSide,pp:src.pp,opponentHP:src.opponentHP,extraPP:src.resources.extraPP,ep:src.resources.ep,sep:src.resources.sep,opponentWard:src.opponentWard,boardDamage:src.boardDamage,boardDamageKnown:src.boardDamageKnown,hand:{recognized:src.hand.recognized}},partial:false};
};
let coachItems=[];
const WB={
  optionalModules,stateCaptureHistory:[],stateCapture:null,video,
  registerModule(){},recordError(){},log(){},videoKey:()=> '09-23-video',
  emit(name,detail){for(const f of handlers.get(name)||[])f(detail)},on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},onReady(){},$(){return null},
  seekTo:async t=>{video.currentTime=Number(t);return Number(t)},
  StateRecognition:{captureState:async()=>{const c=makeCapture(Number(video.currentTime));WB.stateCapture=c;WB.emit('state-captured',{capture:c});return c}},
  ReplaySession:{snapshot:()=>structuredClone(session),ingestState(){}},
  PositionStateRuntime:{version:'test-position',adapter:{},normalizeCardType(){return 'UNKNOWN'},observationFromCapture(c){const x=c.confirmed||c.context||{};return{sourceStateId:`st:${x.turn}:${x.absoluteSide}:${Number(x.time).toFixed(3)}`,time:Number(x.time),turn:Number(x.turn),pp:Number(x.pp),handRecognized:structuredClone(x.hand?.recognized||{})}},createState(obs,meta){return{schema:'test-position',observed:structuredClone(obs),meta:structuredClone(meta)}}},
  CommonRuleEngineRuntime:{version:'test-rules'},CardDB:{get(){return null}},
  RuntimeDecisionPipeline:{clear(){},registerAuthority(){return{ready:true,missing:[],providerId:'P-F0A_RUNTIME_AUTHORITY_V1'}},authorityStatus(){return{ready:true,missing:[],providerId:'P-F0A_RUNTIME_AUTHORITY_V1'}}},
  CoachIntegration:{clear(){coachItems=[]},snapshot(){return{count:coachItems.length,items:structuredClone(coachItems)}}}
};
const sandbox={window:{WB,__wbReplaySessionV1:session},console,structuredClone,Date,Promise,setTimeout,clearTimeout,queueMicrotask};
vm.createContext(sandbox);
new vm.Script(bindingSource,{filename:'runtime-authority-binding.js'}).runInContext(sandbox);
const B=WB.RuntimeAuthorityBinding;
await B.ready();
let n=0;const t=async(name,fn)=>{try{await fn();n++}catch(e){e.message=`${name}: ${e.message}`;throw e}};

await t('PF1R2G-01 gate version',()=>assert.equal(B.freshGateVersion,'pf1r2-g-fresh-e2e-gate-v1.0.0'));
await t('PF1R2G-02 evidence version bumped',()=>assert.equal(B.evidenceVersion,'pf1r2-fresh-real-video-evidence-v1.1.0'));
let summary1;
await t('PF1R2G-03 capture anchor and after',async()=>{summary1=await B.enrichDecisionWindows({finishedAt:'2026-10-09T00:00:00.000Z'});assert.equal(summary1.status,'OK');assert.equal(summary1.targets,1);assert.equal(summary1.captureTargets,2);assert.equal(summary1.capturedWindows,1)});
await t('PF1R2G-04 run identity present',()=>{assert.ok(summary1.runId);assert.ok(summary1.nonce)});
await t('PF1R2G-05 binding same run and window',()=>{const b=summary1.windowBindings[0];assert.equal(b.runId,summary1.runId);assert.equal(b.windowId,'w8');assert.equal(b.anchorExact,true);assert.equal(b.afterExact,true);assert.equal(b.complete,true)});
await t('PF1R2G-06 anchor exact id',()=>assert.equal(summary1.windowBindings[0].anchorStateId,anchor.id));
await t('PF1R2G-07 after exact id',()=>assert.equal(summary1.windowBindings[0].afterStateId,after.id));
await t('PF1R2G-08 exact PositionState only from bound run',async()=>{const s=await B.getPositionState({windowId:'w8',context:{window:win,analysis:{pf0b:summary1}},session});assert.equal(s.observed.sourceStateId,anchor.id);assert.equal(s.meta.freshAuthority.afterStateId,after.id);assert.equal(s.meta.freshAuthority.runId,summary1.runId)});
await t('PF1R2G-09 wrong run fails closed',async()=>{await assert.rejects(()=>B.getPositionState({windowId:'w8',context:{window:win,analysis:{pf0b:{runId:'stale-run'}}},session}),e=>e?.code==='DECISION_AUTHORITY_CAPTURE_MISSING')});
coachItems=[{windowId:'w8',runId:summary1.runId}];
const okEval={status:'OK',processed:1,results:[{status:'OK',windowId:'w8',meta:{runId:summary1.runId}}]};
let evidence;
await t('PF1R2G-10 valid same-run chain',()=>{evidence=B.buildFreshEvidence(summary1,okEval,{finishedAt:'done'});assert.equal(evidence.status,'CHAIN_OK');assert.deepEqual(Array.from(evidence.chainSuccessWindowIds),['w8'])});
await t('PF1R2G-11 proof binds all stages',()=>{const p=evidence.chainProofs[0];assert.equal(p.windowId,'w8');assert.equal(p.sameRun,true);assert.equal(p.sameWindow,true);assert.equal(p.authorityRunId,summary1.runId);assert.equal(p.pipelineRunId,summary1.runId);assert.equal(p.coachRunId,summary1.runId)});
await t('PF1R2G-12 stale coach cannot pass',()=>{coachItems=[{windowId:'w8',runId:'old-run'}];const e=B.buildFreshEvidence(summary1,okEval,{});assert.notEqual(e.status,'CHAIN_OK');assert.equal(e.chainSuccessWindowIds.length,0)});
await t('PF1R2G-13 stale pipeline cannot pass',()=>{coachItems=[{windowId:'w8',runId:summary1.runId}];const e=B.buildFreshEvidence(summary1,{status:'OK',processed:1,results:[{status:'OK',windowId:'w8',meta:{runId:'old-run'}}]},{});assert.notEqual(e.status,'CHAIN_OK');assert.equal(e.chainSuccessWindowIds.length,0)});
await t('PF1R2G-14 different window cannot pass',()=>{coachItems=[{windowId:'other',runId:summary1.runId}];const e=B.buildFreshEvidence(summary1,okEval,{});assert.notEqual(e.status,'CHAIN_OK');assert.equal(e.chainSuccessWindowIds.length,0)});
let summary2;
await t('PF1R2G-15 each fresh analysis gets new run identity',async()=>{summary2=await B.enrichDecisionWindows({finishedAt:'next'});assert.notEqual(summary2.runId,summary1.runId);assert.notEqual(summary2.nonce,summary1.nonce)});
failAfter=true;let failed;
await t('PF1R2G-16 missing after exact capture blocks window',async()=>{failed=await B.enrichDecisionWindows({finishedAt:'fail-after'});assert.equal(failed.capturedWindows,0);assert.ok(failed.failed>=1);assert.equal(failed.windowBindings[0].afterExact,false)});
await t('PF1R2G-17 missing after capture rejects PositionState',async()=>{await assert.rejects(()=>B.getPositionState({windowId:'w8',context:{window:win,analysis:{pf0b:failed}},session}),e=>e?.code==='DECISION_AUTHORITY_CAPTURE_MISSING')});
await t('PF1R2G-18 capture failure is not chain success',()=>{coachItems=[{windowId:'w8',runId:failed.runId}];const e=B.buildFreshEvidence(failed,{status:'HOLD',processed:1,results:[{status:'HOLD',windowId:'w8',reason:'DECISION_AUTHORITY_CAPTURE_MISSING',meta:{runId:failed.runId}}]},{});assert.equal(e.status,'CAPTURE_FAILED');assert.equal(e.chainSuccessWindowIds.length,0)});
failAfter=false;
await t('PF1R2G-19 cohabiting action blocks re-anchor',()=>{const extra={id:'res',type:'resource-change',fromStateId:anchor.id,toStateId:before.id,time:before.time,turn:8,data:{resource:'ep',from:'yes',to:'no'}};const r=B.resolveDecisionAnchor(win,{...session,actions:[pp,extra,board]});assert.equal(r.blocked,true);assert.equal(r.blockReason,'PREACTION_COHABITING_ACTION')});
await t('PF1R2G-20 PP state mismatch blocks re-anchor',()=>{const bad={...pp,data:{from:3,to:1,delta:-2}};const r=B.resolveDecisionAnchor(win,{...session,actions:[bad,board]});assert.equal(r.blocked,true);assert.equal(r.blockReason,'PREACTION_PP_STATE_MISMATCH')});
await t('PF1R2G-21 board state mismatch blocks re-anchor',()=>{const bad={...board,data:{from:0,to:4,delta:4}};const w={...win,relatedActionIds:[bad.id]};const r=B.resolveDecisionAnchor(w,{...session,actions:[pp,bad]});assert.equal(r.blocked,true);assert.equal(r.blockReason,'PREACTION_BOARD_STATE_MISMATCH')});
await t('PF1R2G-22 no replay fallback after reset',async()=>{WB.emit('video-reset',{});await assert.rejects(()=>B.getPositionState({windowId:'w8',context:{window:win},session}),e=>e?.code==='DECISION_AUTHORITY_CAPTURE_MISSING')});

assert.equal(n,22);
console.log(`P-F1-R2-G FRESH E2E GATE REGRESSION PASS: ${n}/${n}`);
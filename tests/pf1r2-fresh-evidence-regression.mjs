import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../runtime-authority-binding.js',import.meta.url),'utf8');
const listeners=new Map(),logs=[],optionalModules=[];
let coachItems=[];
const WB={
  optionalModules,stateCaptureHistory:[],video:{currentTime:20},stateCapture:null,
  registerModule(){},recordError(){},log(type,data){logs.push({type,...data})},
  emit(name,detail){for(const f of listeners.get(name)||[])f(detail)},
  on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},onReady(){},
  videoKey:()=> 'fresh-video|123|456',CardDB:{get(){return null}},
  ReplaySession:{snapshot:()=>sandbox.window.__wbReplaySessionV1},
  PositionStateRuntime:{version:'test',adapter:{},observationFromCapture(){return null}},CommonRuleEngineRuntime:{version:'test'},
  CoachIntegration:{snapshot(){return{count:coachItems.length,items:structuredClone(coachItems)}},clear(){coachItems=[]}}
};
const sandbox={window:{WB,__wbReplaySessionV1:{decisionWindows:[{id:'w1'},{id:'w2'}]},__wbComparisonCoachV1:null},console,structuredClone,Date,Promise,setTimeout,clearTimeout,queueMicrotask};
vm.createContext(sandbox);new vm.Script(source,{filename:'runtime-authority-binding.js'}).runInContext(sandbox);
const B=WB.RuntimeAuthorityBinding;await B.ready();
let n=0;const t=(name,fn)=>{try{fn();n++}catch(e){e.message=`${name}: ${e.message}`;throw e}};
const runId='run-20261009-a',nonce='nonce-a';
const bindings=[{runId,nonce,windowId:'w1',anchorStateId:'a1',afterStateId:'z1',anchorExact:true,afterExact:true,complete:true,anchored:true,originalStateId:'o1',anchorPolicy:'test',anchorActionId:'pp',primaryActionId:'board'},{runId,nonce,windowId:'w2',anchorStateId:'a2',afterStateId:'z2',anchorExact:true,afterExact:true,complete:true,anchored:false}];
const summary={version:'pf0b-decision-window-authority-v1.0.0',gateVersion:'pf1r2-g-fresh-e2e-gate-v1.0.0',runId,nonce,status:'OK',targets:2,captureTargets:4,captured:4,capturedWindows:2,reused:0,failed:0,windowBindings:bindings,analysisFinishedAt:'2026-10-09T00:00:00.000Z'};
const evaluation={status:'OK',processed:2,results:[{status:'OK',windowId:'w1',meta:{runId}},{status:'HOLD',windowId:'w2',reason:'NO_SEQUENCE_CANDIDATES',meta:{runId}}]};
coachItems=[{windowId:'w1',runId}];
const evidence=B.buildFreshEvidence(summary,evaluation,{finishedAt:'2026-10-09T00:00:00.000Z'});
t('PF1R2-01 evidence version',()=>assert.equal(B.evidenceVersion,'pf1r2-fresh-real-video-evidence-v1.1.0'));
t('PF1R2-02 gate version',()=>assert.equal(B.freshGateVersion,'pf1r2-g-fresh-e2e-gate-v1.0.0'));
t('PF1R2-03 fresh marker',()=>assert.equal(evidence.freshRun,true));
t('PF1R2-04 run identity',()=>{assert.equal(evidence.runId,runId);assert.equal(evidence.nonce,nonce)});
t('PF1R2-05 chain success status',()=>assert.equal(evidence.status,'CHAIN_OK'));
t('PF1R2-06 authority run retained',()=>assert.equal(evidence.authority.runId,runId));
t('PF1R2-07 complete bindings retained',()=>assert.equal(evidence.authority.windowBindings.length,2));
t('PF1R2-08 captured windows retained',()=>assert.equal(evidence.authority.capturedWindows,2));
t('PF1R2-09 pipeline same-run count',()=>assert.equal(evidence.pipeline.sameRunProcessed,2));
t('PF1R2-10 pipeline OK count',()=>assert.equal(evidence.pipeline.okCount,1));
t('PF1R2-11 pipeline HOLD count',()=>assert.equal(evidence.pipeline.holdCount,1));
t('PF1R2-12 HOLD reason retained',()=>assert.deepEqual(Array.from(evidence.pipeline.holdReasons),['NO_SEQUENCE_CANDIDATES']));
t('PF1R2-13 coach same-run count',()=>assert.equal(evidence.coach.sameRunCount,1));
t('PF1R2-14 coach window retained',()=>assert.deepEqual(Array.from(evidence.coach.windowIds),['w1']));
t('PF1R2-15 chain intersection',()=>assert.deepEqual(Array.from(evidence.chainSuccessWindowIds),['w1']));
t('PF1R2-16 chain proof',()=>{const p=evidence.chainProofs[0];assert.equal(p.windowId,'w1');assert.equal(p.sameRun,true);assert.equal(p.sameWindow,true)});
t('PF1R2-17 session window count',()=>assert.equal(evidence.session.decisionWindowCount,2));
t('PF1R2-18 video key retained',()=>assert.equal(evidence.videoKey,'fresh-video|123|456'));
t('PF1R2-19 analysis timestamp retained',()=>assert.equal(evidence.analysisFinishedAt,'2026-10-09T00:00:00.000Z'));
coachItems=[{windowId:'w1',runId:'old'}];
const staleCoach=B.buildFreshEvidence(summary,evaluation,{});
t('PF1R2-20 stale coach does not false PASS',()=>{assert.notEqual(staleCoach.status,'CHAIN_OK');assert.equal(staleCoach.chainSuccessWindowIds.length,0)});
coachItems=[{windowId:'w1',runId}];
const stalePipeline=B.buildFreshEvidence(summary,{status:'OK',processed:1,results:[{status:'OK',windowId:'w1',meta:{runId:'old'}}]},{});
t('PF1R2-21 stale pipeline does not false PASS',()=>{assert.notEqual(stalePipeline.status,'CHAIN_OK');assert.equal(stalePipeline.chainSuccessWindowIds.length,0)});
const failed=B.buildFreshEvidence({...summary,status:'FAILED',capturedWindows:0,failed:1,windowBindings:[{...bindings[0],complete:false,afterExact:false}]},null,{});
t('PF1R2-22 capture failure status',()=>assert.equal(failed.status,'CAPTURE_FAILED'));
const recorded=B.recordFreshEvidence(summary,evaluation,{finishedAt:'done'});
t('PF1R2-23 global evidence exposed',()=>assert.equal(sandbox.window.__wbPF1R2FreshEvidenceV1.runId,runId));
t('PF1R2-24 diagnostic event logged',()=>assert.ok(logs.some(x=>x.type==='pf1r2-fresh-e2e-evidence')));
t('PF1R2-25 snapshot contains evidence',()=>assert.equal(B.snapshot().freshEvidence.runId,runId));
t('PF1R2-26 record returns clone',()=>{recorded.status='MUTATED';assert.notEqual(B.snapshot().freshEvidence.status,'MUTATED')});
t('PF1R2-27 optional module registered',()=>assert.ok(optionalModules.some(x=>x.name==='fresh-real-video-e2e-evidence')));
WB.emit('video-reset',{});
t('PF1R2-28 reset clears evidence',()=>assert.equal(B.snapshot().freshEvidence,null));
assert.equal(n,28);console.log(`P-F1-R2 FRESH EVIDENCE REGRESSION PASS: ${n}/${n}`);
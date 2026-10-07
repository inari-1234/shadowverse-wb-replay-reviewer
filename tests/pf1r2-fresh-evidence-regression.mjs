import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url),read=n=>fs.readFileSync(new URL(n,root),'utf8');
const listeners=new Map(),logs=[],optionalModules=[];
const WB={
  optionalModules,stateCaptureHistory:[],video:{currentTime:20},stateCapture:null,
  registerModule(){},recordError(){},log(type,data){logs.push({type,...data})},
  emit(name,detail){for(const f of listeners.get(name)||[])f(detail)},
  on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},onReady(fn){fn()},
  videoKey:()=> 'fresh-video|123|456',
  CardDB:{get(){return null}},
  ReplaySession:{snapshot:()=>sandbox.window.__wbReplaySessionV1}
};
const sandbox={window:{WB,__wbReplaySessionV1:{decisionWindows:[{id:'w1'},{id:'w2'}]},__wbComparisonCoachV1:null},console,structuredClone,Date,Promise,setTimeout,clearTimeout,queueMicrotask};
vm.createContext(sandbox);
for(const f of ['position-state-runtime.js','common-rule-engine-runtime.js','runtime-authority-binding.js'])new vm.Script(read(f),{filename:f}).runInContext(sandbox);
const B=WB.RuntimeAuthorityBinding;
await B.ready();
let n=0;const t=(name,fn)=>{try{fn();n++}catch(e){e.message=`${name}: ${e.message}`;throw e}};

const summary={version:'pf0b-decision-window-authority-v1.0.0',status:'OK',targets:2,captured:2,reused:0,failed:0,analysisFinishedAt:'2026-10-05T10:00:00.000Z'};
const evaluation={status:'OK',processed:2,results:[{status:'OK',windowId:'w1'},{status:'HOLD',windowId:'w2',reason:'NO_SEQUENCE_CANDIDATES'}]};
sandbox.window.__wbComparisonCoachV1={count:1,items:[{windowId:'w1'}]};
const evidence=B.buildFreshEvidence(summary,evaluation,{finishedAt:'2026-10-05T10:00:00.000Z'});

t('PF1R2-01 evidence version',()=>assert.equal(B.evidenceVersion,'pf1r2-fresh-real-video-evidence-v1.0.0'));
t('PF1R2-02 fresh marker',()=>assert.equal(evidence.freshRun,true));
t('PF1R2-03 chain success status',()=>assert.equal(evidence.status,'CHAIN_OK'));
t('PF1R2-04 exact authority summary retained',()=>assert.deepEqual(JSON.parse(JSON.stringify(evidence.authority)),{version:'pf0b-decision-window-authority-v1.0.0',status:'OK',targets:2,captured:2,reused:0,failed:0,exactStateIds:[],preActionAnchorVersion:'pf1r2-preaction-anchor-v1.0.0',preActionAnchors:[]}));
t('PF1R2-05 pipeline processed',()=>assert.equal(evidence.pipeline.processed,2));
t('PF1R2-06 pipeline OK count',()=>assert.equal(evidence.pipeline.okCount,1));
t('PF1R2-07 pipeline HOLD count',()=>assert.equal(evidence.pipeline.holdCount,1));
t('PF1R2-08 HOLD reason retained',()=>assert.deepEqual(Array.from(evidence.pipeline.holdReasons),['NO_SEQUENCE_CANDIDATES']));
t('PF1R2-09 coach count retained',()=>assert.equal(evidence.coach.count,1));
t('PF1R2-10 coach window retained',()=>assert.deepEqual(Array.from(evidence.coach.windowIds),['w1']));
t('PF1R2-11 chain intersection',()=>assert.deepEqual(Array.from(evidence.chainSuccessWindowIds),['w1']));
t('PF1R2-12 session window count',()=>assert.equal(evidence.session.decisionWindowCount,2));
t('PF1R2-13 video key retained',()=>assert.equal(evidence.videoKey,'fresh-video|123|456'));
t('PF1R2-14 analysis timestamp retained',()=>assert.equal(evidence.analysisFinishedAt,'2026-10-05T10:00:00.000Z'));
const hold=B.buildFreshEvidence({...summary,captured:0,reused:0},{status:'HOLD',processed:1,results:[{status:'HOLD',windowId:'w2',reason:'POSITION_STATE_UNAVAILABLE'}]},{});
t('PF1R2-15 safe hold status',()=>assert.equal(hold.status,'SAFE_HOLD'));
t('PF1R2-16 safe hold reason',()=>assert.ok(hold.pipeline.holdReasons.includes('POSITION_STATE_UNAVAILABLE')));
const failed=B.buildFreshEvidence({...summary,status:'FAILED',failed:2},null,{});
t('PF1R2-17 capture failure status',()=>assert.equal(failed.status,'CAPTURE_FAILED'));
const incomplete=B.buildFreshEvidence(summary,{status:'OK',processed:1,results:[{status:'OK',windowId:'w2'}]},{});
t('PF1R2-18 no coach is not false PASS',()=>assert.equal(incomplete.status,'INCOMPLETE'));
const recorded=B.recordFreshEvidence(summary,evaluation,{finishedAt:'done'});
t('PF1R2-19 global evidence exposed',()=>assert.equal(sandbox.window.__wbPF1R2FreshEvidenceV1.status,'CHAIN_OK'));
t('PF1R2-20 diagnostic event logged',()=>assert.ok(logs.some(x=>x.type==='pf1r2-fresh-e2e-evidence'&&x.status==='CHAIN_OK')));
t('PF1R2-21 snapshot contains evidence',()=>assert.equal(B.snapshot().freshEvidence.status,'CHAIN_OK'));
t('PF1R2-22 record returns clone',()=>{recorded.status='MUTATED';assert.equal(B.snapshot().freshEvidence.status,'CHAIN_OK')});
t('PF1R2-23 optional module registered',()=>assert.ok(optionalModules.some(x=>x.name==='fresh-real-video-e2e-evidence')));
WB.emit('video-reset',{});
t('PF1R2-24 reset clears evidence',()=>assert.equal(B.snapshot().freshEvidence,null));

assert.equal(n,24);
console.log(`P-F1-R2 FRESH EVIDENCE REGRESSION PASS: ${n}/${n}`);

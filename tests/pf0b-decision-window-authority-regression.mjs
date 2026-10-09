import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url),read=n=>fs.readFileSync(new URL(n,root),'utf8');
const listeners=new Map(),events=[],optionalModules=[],seekLog=[],reevaluations=[];
const el=value=>({value,textContent:'seed-text',className:'seed-class',dataset:{manualVideo:'seed-video',source:'manual'}});
const elements={
  '#leTurn':el('9'),'#lePp':el('99'),'#leOppHp':el('88'),'#leBoard':el('77'),
  '#leExtra':el('yes'),'#leEp':el('no'),'#leSep':el('yes'),'#leWard':el('present'),
  '#leStatus':el(''),'#stateSummary':el('')
};
const video={currentTime:20,paused:true};
let captureCalls=0,registeredProvider=null;
const state=(t,pp,hp=8)=>({id:`st:5:bottom:${t.toFixed(3)}`,time:t,turn:5,absoluteSide:'bottom',relativeSide:'自分',pp,opponentHP:hp,resources:{extraPP:'unknown',ep:'yes',sep:'no'},opponentWard:'none',boardDamage:2,boardDamageKnown:true,hand:{recognized:{}}});
const s10=state(10,2),s105=state(10.5,1,7),s12=state(12,1,7),s125=state(12.5,0,6);
const session={states:[s10,s105,s12,s125],actions:[],decisionWindows:[
  {id:'w1',beforeState:structuredClone(s10),afterState:structuredClone(s105),relatedActionIds:[]},
  {id:'w2',beforeState:structuredClone(s12),afterState:structuredClone(s125),relatedActionIds:[]},
  {id:'w-opp',beforeState:{...state(11,1),id:'st:5:top:11.000',absoluteSide:'top',relativeSide:'相手'},afterState:{...state(11.2,1),id:'st:5:top:11.200',absoluteSide:'top',relativeSide:'相手'},relatedActionIds:[]}
]};
const follower=(attack=2)=>({attackValue:attack,attackable:true,attackableEvidence:{reason:'green-attack-ring-confirmed'},position:{attackBadgeCx:.4,attackBadgeCy:.6}});
function recognizedAt(t){return t===10?{quickBlader:{known:true,id:'quickBlader',label:'刹那のクイックブレイダー',count:1,confidence:.98}}:{}}
function makeCapture(t){const turn=5,pp=t===10?2:t===10.5?1:t===12?1:0,hp=t===10?8:t===10.5?7:t===12?7:6,recognized=recognizedAt(t);return{version:'state-clean-test',at:new Date().toISOString(),context:{time:t,turn,absoluteSide:'bottom',relativeSide:'自分'},confirmed:{version:'confirmed-state-v1',time:t,turn,relativeSide:'自分',pp,opponentHP:hp,extraPP:'unknown',ep:'yes',sep:'no',opponentWard:'none',boardDamage:2,boardDamageKnown:true,hand:{recognized},observation:{boardAccepted:true,handKnown:true}},captureMode:'decision-authority',handHistoryMode:'skipped-batch',resources:{ui:{extra:'unknown',ep:'yes',sep:'no',ward:'none'}},ward:{state:'none'},hand:{result:{known:true,recognized}},board:{result:{accepted:true,faceDamageConfirmed:true,value:2,followers:[follower()]}},partial:false}}
const WB={
  optionalModules,stateCaptureHistory:[{id:'old-history'}],stateCapture:{id:'old-capture'},video,
  registerModule(){},log(){},recordError(){},
  emit(name,detail){events.push({name,detail});for(const f of listeners.get(name)||[])f(detail)},
  on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},onReady(fn){fn()},
  $:id=>elements[id]||null,
  seekTo:async(t,reason)=>{seekLog.push({t,reason});video.currentTime=Number(t);return Number(t)},
  videoKey:()=> 'pf0b-test-video',
  CardDB:{get(id){if(id==='quickBlader')return{id:'quickBlader',type:'フォロワー',cost:1,atk:1,life:1,tags:['疾走']};return null}},
  StateRecognition:{captureState:async options=>{captureCalls++;assert.equal(options.handHistory,false);assert.equal(options.captureMode,'decision-authority');assert.equal(options.sharedFrameReuse,true);const t=Number(video.currentTime);elements['#leTurn'].value='5';elements['#lePp'].value=String(t===10?2:t===10.5?1:t===12?1:0);elements['#leOppHp'].value=String(t===10?8:t===10.5?7:t===12?7:6);elements['#leBoard'].value='2';elements['#leExtra'].value='unknown';elements['#leEp'].value='yes';elements['#leSep'].value='no';elements['#leWard'].value='none';const c=makeCapture(t);WB.stateCapture=c;WB.stateCaptureHistory=[...(WB.stateCaptureHistory||[]),c].slice(-5);WB.emit('state-captured',{capture:c});return c}},
  RuntimeDecisionPipeline:{registerAuthority(p){registeredProvider=p;return{ready:true,missing:[],providerId:p.id}},authorityStatus(){return{ready:!!registeredProvider,missing:[],providerId:registeredProvider?.id||null}},clear(){},evaluateSession(detail){reevaluations.push(detail);return Promise.resolve({status:'OK',processed:0,results:[]})}},
  CoachIntegration:{clear(){},snapshot(){return{count:0,items:[]}}},
  ReplaySession:{snapshot(){return structuredClone(session)},ingestState(){}}
};
const sandbox={window:{WB,__wbReplaySessionV1:session},console,structuredClone,Date,Promise,setTimeout,clearTimeout,queueMicrotask,crypto:{randomUUID:()=>`uuid-${captureCalls}-${Date.now()}`}};vm.createContext(sandbox);
for(const f of ['position-state-runtime.js','common-rule-engine-runtime.js','runtime-authority-binding.js'])new vm.Script(read(f),{filename:f}).runInContext(sandbox);
const B=WB.RuntimeAuthorityBinding,R=WB.CommonRuleEngineRuntime;
await B.ready();await Promise.resolve();
let n=0;const t=async(name,fn)=>{try{await fn();n++}catch(e){e.message=`${name}: ${e.message}`;throw e}};

await t('PF0B-01 capture version',()=>assert.equal(B.captureVersion,'pf0b-decision-window-authority-v1.0.0'));
await t('PF0B-02 fresh gate version',()=>assert.equal(B.freshGateVersion,'pf1r2-g-fresh-e2e-gate-v1.0.0'));
await t('PF0B-03 provider preserved',()=>assert.equal(registeredProvider?.id,'P-F0A_RUNTIME_AUTHORITY_V1'));
await t('PF0B-04 targets own-side windows only',()=>assert.equal(B.decisionWindowTargets(session).length,2));
await t('PF0B-05 each target has anchor and after',()=>assert.ok(B.decisionWindowTargets(session).every(x=>x.anchorStateId&&x.afterStateId&&x.afterValid===true)));
await t('PF0B-06 no eager heavy capture',()=>assert.equal(captureCalls,0));
const oldHistory=WB.stateCaptureHistory,oldCapture=WB.stateCapture;
let first;
await t('PF0B-07 enrich exact decision windows',async()=>{first=await B.enrichDecisionWindows({finishedAt:'2026-10-09T00:00:00.000Z'});assert.equal(first.status,'OK')});
await t('PF0B-08 two target windows',()=>assert.equal(first.targets,2));
await t('PF0B-09 four exact capture targets',()=>assert.equal(first.captureTargets,4));
await t('PF0B-10 four exact captures',()=>assert.equal(first.captured,4));
await t('PF0B-11 two complete window bindings',()=>assert.equal(first.capturedWindows,2));
await t('PF0B-12 no cross-run reuse in first run',()=>assert.equal(first.reused,0));
await t('PF0B-13 no failures',()=>assert.equal(first.failed,0));
await t('PF0B-14 run identity present',()=>{assert.ok(first.runId);assert.ok(first.nonce)});
await t('PF0B-15 exact seek reasons',()=>assert.equal(seekLog.filter(x=>x.reason==='pf0b-decision-window-authority').length,4));
await t('PF0B-16 original video position restored',()=>assert.equal(video.currentTime,20));
await t('PF0B-17 UI numeric restored',()=>assert.equal(elements['#lePp'].value,'99'));
await t('PF0B-18 UI tri-state restored',()=>assert.equal(elements['#leWard'].value,'present'));
await t('PF0B-19 manual provenance restored',()=>assert.equal(elements['#lePp'].dataset.manualVideo,'seed-video'));
await t('PF0B-20 current capture restored',()=>assert.equal(WB.stateCapture,oldCapture));
await t('PF0B-21 capture history restored',()=>assert.equal(WB.stateCaptureHistory,oldHistory));
await t('PF0B-22 anchor observation cached',()=>assert.equal(B.closestObservation(s10).sourceStateId,s10.id));
await t('PF0B-23 after observation cached',()=>assert.equal(B.closestObservation(s105).sourceStateId,s105.id));
await t('PF0B-24 recognized hand authority retained',()=>assert.equal(B.closestObservation(s10).handRecognized.quickBlader.count,1));
await t('PF0B-25 board structure retained',()=>assert.equal(B.closestObservation(s10).boardStructureKnown,true));
await t('PF0B-26 binding is same-run complete',()=>{const b=B.bindingForWindow('w1',first.runId);assert.equal(b.complete,true);assert.equal(b.anchorExact,true);assert.equal(b.afterExact,true);assert.equal(b.anchorStateId,s10.id);assert.equal(b.afterStateId,s105.id)});
await t('PF0B-27 PositionState requires exact same-run binding',async()=>{const s=await B.getPositionState({windowId:'w1',context:{window:session.decisionWindows[0],analysis:{pf0b:first}},session});assert.equal(s.observed.sourceStateId,s10.id);assert.equal(B.bindingForWindow('w1',first.runId).complete,true);assert.equal(R.getAuthorityStatus(s).status,'RESOLVED')});
await t('PF0B-28 wrong run fails closed',async()=>{await assert.rejects(()=>B.getPositionState({windowId:'w1',context:{window:session.decisionWindows[0],analysis:{pf0b:{runId:'old-run'}}},session}),e=>e.code==='DECISION_AUTHORITY_CAPTURE_MISSING')});
let second;
await t('PF0B-29 repeat starts a new fresh run',async()=>{second=await B.enrichDecisionWindows({finishedAt:'2026-10-09T00:01:00.000Z'});assert.equal(second.captured,4);assert.equal(second.reused,0);assert.notEqual(second.runId,first.runId);assert.equal(captureCalls,8)});
await t('PF0B-30 old run binding no longer valid',()=>assert.equal(B.bindingForWindow('w1',first.runId),null));
await t('PF0B-31 task-finished orchestration waits for completed task',async()=>{WB.emit('video-reset',{});const before=captureCalls;WB.emit('match-analysis-complete',{cancelled:false,finishedAt:'done'});await Promise.resolve();assert.equal(captureCalls,before);WB.emit('task-finished',{name:'別処理',cancelRequested:false});await new Promise(r=>setTimeout(r,5));assert.equal(captureCalls,before);WB.emit('match-analysis-complete',{cancelled:false,finishedAt:'done2'});WB.emit('task-finished',{name:'試合全体を解析',cancelRequested:false});await new Promise(r=>setTimeout(r,30));assert.equal(captureCalls,before+4);assert.ok(reevaluations.length>=1);assert.ok(reevaluations.at(-1).pf0b?.runId)});
await t('PF0B-32 optional module registered',()=>assert.ok(optionalModules.some(x=>x.name==='decision-window-authority-capture'&&x.version==='pf0b-decision-window-authority-v1.0.0')));

assert.equal(n,32);
console.log(`P-F0B DECISION WINDOW AUTHORITY REGRESSION PASS: ${n}/${n}`);
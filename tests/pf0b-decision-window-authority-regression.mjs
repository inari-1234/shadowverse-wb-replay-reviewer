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
const session={decisionWindows:[
  {id:'w1',beforeState:{id:'st:5:bottom:10.000',time:10,turn:5,absoluteSide:'bottom',relativeSide:'自分'}},
  {id:'w2',beforeState:{id:'st:5:bottom:12.000',time:12,turn:5,absoluteSide:'bottom',relativeSide:'自分'}},
  {id:'w-opp',beforeState:{id:'st:5:top:11.000',time:11,turn:5,absoluteSide:'top',relativeSide:'相手'}},
  {id:'w1-duplicate',beforeState:{id:'st:5:bottom:10.000',time:10,turn:5,absoluteSide:'bottom',relativeSide:'自分'}}
]};
const follower=(attack=2)=>({attackValue:attack,attackable:true,attackableEvidence:{reason:'green-attack-ring-confirmed'},position:{attackBadgeCx:.4,attackBadgeCy:.6}});
function recognizedAt(t){return t===10?{quickBlader:{known:true,id:'quickBlader',label:'刹那のクイックブレイダー',count:1,confidence:.98}}:{}}
function makeCapture(t){const turn=5,pp=t===10?2:1,hp=t===10?8:6,recognized=recognizedAt(t);return{version:'state-clean-1.8.28',at:new Date().toISOString(),context:{time:t,turn,absoluteSide:'bottom',relativeSide:'自分'},confirmed:{version:'confirmed-state-v1',time:t,turn,relativeSide:'自分',pp,opponentHP:hp,extraPP:'unknown',ep:'yes',sep:'no',opponentWard:'none',boardDamage:2,boardDamageKnown:true,hand:{recognized},observation:{boardAccepted:true,handKnown:true}},captureMode:'decision-authority',handHistoryMode:'skipped-batch',resources:{ui:{extra:'unknown',ep:'yes',sep:'no',ward:'none'}},ward:{state:'none'},hand:{result:{known:true,recognized}},board:{result:{accepted:true,faceDamageConfirmed:true,value:2,followers:[follower()]}},partial:false}}
const WB={
  optionalModules,stateCaptureHistory:[{id:'old-history'}],stateCapture:{id:'old-capture'},video,
  registerModule(){},log(){},recordError(){},
  emit(name,detail){events.push({name,detail});for(const f of listeners.get(name)||[])f(detail)},
  on(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},onReady(fn){fn()},
  $:id=>elements[id]||null,
  seekTo:async(t,reason)=>{seekLog.push({t,reason});video.currentTime=Number(t);return Number(t)},
  CardDB:{get(id){if(id==='quickBlader')return{id:'quickBlader',type:'フォロワー',cost:1,atk:1,life:1,tags:['疾走']};return null}},
  StateRecognition:{captureState:async options=>{captureCalls++;assert.equal(options.handHistory,false);assert.equal(options.captureMode,'decision-authority');assert.equal(options.sharedFrameReuse,true);const t=Number(video.currentTime);elements['#leTurn'].value='5';elements['#lePp'].value=t===10?'2':'1';elements['#leOppHp'].value=t===10?'8':'6';elements['#leBoard'].value='2';elements['#leExtra'].value='unknown';elements['#leEp'].value='yes';elements['#leSep'].value='no';elements['#leWard'].value='none';const c=makeCapture(t);WB.stateCapture=c;WB.stateCaptureHistory=[...(WB.stateCaptureHistory||[]),c].slice(-5);WB.emit('state-captured',{capture:c});return c}},
  RuntimeDecisionPipeline:{registerAuthority(p){registeredProvider=p;return{ready:true,missing:[],providerId:p.id}},authorityStatus(){return{ready:!!registeredProvider,missing:[],providerId:registeredProvider?.id||null}},evaluateSession(detail){reevaluations.push(detail);return Promise.resolve({status:'OK'})}}
};
const sandbox={window:{WB,__wbReplaySessionV1:session},console,structuredClone,Date,Promise,setTimeout,clearTimeout,queueMicrotask};vm.createContext(sandbox);
for(const f of ['position-state-runtime.js','common-rule-engine-runtime.js','runtime-authority-binding.js'])new vm.Script(read(f),{filename:f}).runInContext(sandbox);
const B=WB.RuntimeAuthorityBinding,PS=WB.PositionStateRuntime,R=WB.CommonRuleEngineRuntime;
await B.ready();await Promise.resolve();
let n=0;const t=async(name,fn)=>{try{await fn();n++}catch(e){e.message=`${name}: ${e.message}`;throw e}};

await t('PF0B-01 capture version',()=>assert.equal(B.captureVersion,'pf0b-decision-window-authority-v1.0.0'));
await t('PF0B-02 provider preserved',()=>assert.equal(registeredProvider?.id,'P-F0A_RUNTIME_AUTHORITY_V1'));
await t('PF0B-03 targets own-side only',()=>assert.equal(B.decisionTargets(session).length,2));
await t('PF0B-04 targets dedupe exact state',()=>assert.deepEqual(Array.from(B.decisionTargets(session),x=>x.stateId),['st:5:bottom:10.000','st:5:bottom:12.000']));
await t('PF0B-05 no eager heavy capture',()=>assert.equal(captureCalls,0));
const oldHistory=WB.stateCaptureHistory,oldCapture=WB.stateCapture;
let first;
await t('PF0B-06 enrich exact review windows',async()=>{first=await B.enrichDecisionWindows({finishedAt:'2026-10-05T00:00:00.000Z'});assert.equal(first.status,'OK')});
await t('PF0B-07 only selected windows captured',()=>assert.equal(first.targets,2));
await t('PF0B-08 two exact captures',()=>assert.equal(first.captured,2));
await t('PF0B-09 no failures',()=>assert.equal(first.failed,0));
await t('PF0B-10 exact seek reasons',()=>assert.equal(seekLog.filter(x=>x.reason==='pf0b-decision-window-authority').length,2));
await t('PF0B-11 original video position restored',()=>assert.equal(video.currentTime,20));
await t('PF0B-12 UI numeric restored',()=>assert.equal(elements['#lePp'].value,'99'));
await t('PF0B-13 UI tri-state restored',()=>assert.equal(elements['#leWard'].value,'present'));
await t('PF0B-14 manual provenance restored',()=>assert.equal(elements['#lePp'].dataset.manualVideo,'seed-video'));
await t('PF0B-15 current capture restored',()=>assert.equal(WB.stateCapture,oldCapture));
await t('PF0B-16 capture history restored',()=>assert.equal(WB.stateCaptureHistory,oldHistory));
await t('PF0B-17 exact observation cached',()=>assert.equal(B.closestObservation(session.decisionWindows[0].beforeState).sourceStateId,'st:5:bottom:10.000'));
await t('PF0B-18 recognized hand authority retained',()=>assert.equal(B.closestObservation(session.decisionWindows[0].beforeState).handRecognized.quickBlader.count,1));
await t('PF0B-19 board structure retained',()=>assert.equal(B.closestObservation(session.decisionWindows[0].beforeState).boardStructureKnown,true));
await t('PF0B-20 board follower retained',()=>assert.equal(B.closestObservation(session.decisionWindows[0].beforeState).boardFollowers.length,1));
await t('PF0B-21 PositionState resolves exact observation',async()=>{const s=await B.getPositionState({windowId:'w1',context:{window:session.decisionWindows[0]},session});assert.equal(s.observed.sourceStateId,'st:5:bottom:10.000');assert.equal(R.getAuthorityStatus(s).status,'RESOLVED');assert.ok(s.players.self.hand.some(x=>x.cardId==='quickBlader'))});
let second;
await t('PF0B-22 repeat uses authority cache',async()=>{second=await B.enrichDecisionWindows({});assert.equal(second.captured,0);assert.equal(second.reused,2);assert.equal(captureCalls,2)});
await t('PF0B-23 task-finished orchestration waits for completed task',async()=>{WB.emit('video-reset',{});const before=captureCalls;WB.emit('match-analysis-complete',{cancelled:false,finishedAt:'done'});await Promise.resolve();assert.equal(captureCalls,before);WB.emit('task-finished',{name:'別処理',cancelRequested:false});await new Promise(r=>setTimeout(r,5));assert.equal(captureCalls,before);WB.emit('match-analysis-complete',{cancelled:false,finishedAt:'done2'});WB.emit('task-finished',{name:'試合全体を解析',cancelRequested:false});await new Promise(r=>setTimeout(r,20));assert.equal(captureCalls,before+2);assert.ok(reevaluations.length>=1)});
await t('PF0B-24 optional module registered',()=>assert.ok(optionalModules.some(x=>x.name==='decision-window-authority-capture'&&x.version==='pf0b-decision-window-authority-v1.0.0')));

assert.equal(n,24);
console.log(`P-F0B DECISION WINDOW AUTHORITY REGRESSION PASS: ${n}/${n}`);

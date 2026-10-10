const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const {JSDOM}=require('jsdom');
const FDB=require('fake-indexeddb');

const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'pf1r2-0923-integrated-acceptance-fixture.json'),'utf8'));
const failures=[];
function check(ok,id,detail=''){
  if(ok){console.log(`INTEGRATED ASSERT PASS: ${id}`);return true}
  const msg=`INTEGRATED ASSERT FAIL: ${id}${detail?` :: ${detail}`:''}`;
  failures.push(msg);console.error(msg);return false;
}
const near=(a,b,t=.01)=>Number.isFinite(Number(a))&&Math.abs(Number(a)-Number(b))<=t;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,{timeout=1800,step=10}={}){const end=Date.now()+timeout;let last=null;while(Date.now()<end){try{last=await fn();if(last)return last}catch{}await sleep(step)}return last}
function clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}

function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IDB request failed'))})}
async function seedDirtyV2(indexedDB){
  const open=indexedDB.open('wb-replay-session-v1',2);
  open.onupgradeneeded=()=>{const db=open.result;if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions',{keyPath:'sourceKey'});if(!db.objectStoreNames.contains('scene-images'))db.createObjectStore('scene-images',{keyPath:'key'});if(!db.objectStoreNames.contains('analysis-runs'))db.createObjectStore('analysis-runs',{keyPath:'id'})};
  const db=await request(open);await request(db.transaction('sessions','readwrite').objectStore('sessions').put(clone(fixture.dirtyV2)));db.close();
}
async function readStoredSession(indexedDB){
  const db=await request(indexedDB.open('wb-replay-session-v1',2));
  const row=await request(db.transaction('sessions','readonly').objectStore('sessions').get(fixture.dirtyV2.sourceKey));db.close();return row||null;
}
function makeCapture(row,mode='timeline-lite'){
  const hand=clone(row.hand||{}),ward=String(row.opponentWard??'unknown');
  return{
    version:'state-clean-1.8.28',at:'2026-10-10T00:00:10.000Z',captureMode:mode,partial:false,
    context:{time:row.time,turn:row.turn,absoluteSide:'bottom',relativeSide:'自分',targetSide:'bottom',playOrder:'後攻',videoKey:fixture.dirtyV2.sourceKey},
    confirmed:{version:'confirmed-state-v1',time:row.time,turn:row.turn,absoluteSide:'bottom',relativeSide:'自分',pp:row.pp,opponentHP:row.opponentHP,extraPP:row.extraPP,ep:row.ep,sep:row.sep,opponentWard:ward,boardDamage:row.boardDamage,boardDamageKnown:row.boardDamageKnown===true,hand:{recognized:hand},observation:{boardAccepted:true,handKnown:Object.keys(hand).length>0,captureMode:mode}},
    resources:{ui:{extra:row.extraPP,ep:row.ep,sep:row.sep}},
    ward:{state:ward,unknown:ward==='unknown',result:{known:ward!=='unknown',state:ward,reason:ward==='unknown'?'not-confirmed':'fixture-recorded',method:'recorded-capture'}},
    hand:{result:{known:Object.keys(hand).length>0,recognized:hand,unresolved:{},samples:[],reason:Object.keys(hand).length?'recorded-capture':'not-observed'}},
    board:{result:{accepted:true,known:true,value:row.boardDamage,attackableTotal:row.boardDamage,faceDamageConfirmed:true,candidateTotal:row.boardDamage,followers:[]},applied:false,manualPreserved:false,conflict:false},
    stageErrors:[]
  };
}

(async()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const dom=new JSDOM(html,{url:'https://example.test/main/',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom,document=window.document;
  Object.defineProperty(window,'indexedDB',{value:FDB.indexedDB,configurable:true});
  Object.defineProperty(window,'IDBKeyRange',{value:FDB.IDBKeyRange,configurable:true});
  Object.defineProperty(window,'crypto',{value:webcrypto,configurable:true});
  window.structuredClone=global.structuredClone;
  window.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);
  window.cancelAnimationFrame=id=>clearTimeout(id);
  window.matchMedia=()=>({matches:false,media:'',addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  Object.defineProperty(window.navigator,'serviceWorker',{value:{controller:null,async register(){return{addEventListener(){},update(){}}},addEventListener(){}},configurable:true});
  if(!window.URL.createObjectURL)window.URL.createObjectURL=()=>`blob:fixture-${Date.now()}`;
  if(!window.URL.revokeObjectURL)window.URL.revokeObjectURL=()=>{};
  if(!window.HTMLElement.prototype.scrollIntoView)window.HTMLElement.prototype.scrollIntoView=function(){};

  const video=document.querySelector('#video');let currentTime=0,paused=true;
  Object.defineProperties(video,{
    duration:{get:()=>200,configurable:true},videoWidth:{get:()=>1920,configurable:true},videoHeight:{get:()=>1080,configurable:true},readyState:{get:()=>4,configurable:true},seeking:{get:()=>false,configurable:true},paused:{get:()=>paused,configurable:true},
    currentTime:{get:()=>currentTime,set:v=>{currentTime=Number(v)||0;queueMicrotask(()=>video.dispatchEvent(new window.Event('seeked')))},configurable:true}
  });
  video.play=async()=>{paused=false};video.pause=()=>{paused=true};

  const evalFile=file=>window.eval(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
  evalFile('app-core.js');
  for(const file of ['card-db.js','review-engine.js','position-state-runtime.js','common-rule-engine-runtime.js','legal-action-sequence.js','outcome-backtracking.js','comparison-decision.js','played-move-authority.js','coach-explanation.js','replay-session.js','runtime-decision-pipeline.js','runtime-authority-binding.js','coach-integration.js','state-recognition.js'])evalFile(file);
  document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
  await sleep(0);
  const WB=window.WB;
  check(!!WB?.APP&&typeof WB.emit==='function'&&typeof WB.on==='function','APP_CORE_EVENT_BUS_REAL');
  check(!!WB.ReplaySession&&!!WB.RuntimeAuthorityBinding&&!!WB.RuntimeDecisionPipeline&&!!WB.CoachIntegration&&!!WB.CoachExplanation&&!!WB.LegalActionSequence&&!!WB.OutcomeBacktracking&&!!WB.ComparisonDecision&&!!WB.PlayedMoveAuthority&&!!WB.StateRecognition,'REAL_MODULE_CHAIN_LOADED');
  check(WB.ReplaySession?.persistenceMode?.()==='indexeddb','INDEXEDDB_PERSISTENCE_ACTIVE',`mode=${WB.ReplaySession?.persistenceMode?.()}`);

  WB.videoMeta=clone(fixture.videoMeta);WB.videoName='09-23';WB.turnTimeline=[];WB.stateCaptureHistory=[];
  await seedDirtyV2(window.indexedDB);

  const restoresBefore=WB.events.filter(x=>x.type==='replay-session-restore').length;
  video.dispatchEvent(new window.Event('loadedmetadata'));
  await waitFor(()=>WB.events.filter(x=>x.type==='replay-session-restore').length>restoresBefore);
  let snap=WB.ReplaySession?.snapshot?.()||window.__wbReplaySessionV1||null;
  check(!!snap,'METADATA_RESTORE_EXECUTES');
  check(!(snap?.states||[]).some(x=>near(x.time,74.141)&&Number(x.opponentHP)===15),'V2_DIRTY_6T_STATE_REJECTED',`schema=${snap?.version}; states=${(snap?.states||[]).map(x=>`${x.time}:${x.opponentHP}`).join(',')}`);

  const recorded=fixture.freshCaptures.map(x=>({...x,capture:makeCapture(x)}));
  const realCaptureState=WB.StateRecognition.captureState;
  WB.StateRecognition.captureState=async options=>{
    const t=Number(WB.video.currentTime),row=recorded.slice().sort((a,b)=>Math.abs(a.time-t)-Math.abs(b.time-t))[0];
    if(!row||Math.abs(row.time-t)>.05)throw new Error(`recorded capture missing at ${t}`);
    const c=makeCapture(row,options?.captureMode||'decision-authority');WB.stateCapture=c;return c;
  };
  check(typeof realCaptureState==='function'&&WB.StateRecognition.captureState!==realCaptureState,'ONLY_CAPTURESTATE_SUBSTITUTED');

  WB.turnTimeline=clone(fixture.timeline);
  WB.emit('match-analysis-start',{targetSide:'bottom',totalTurns:2,runId:fixture.analysis.runId,nonce:fixture.analysis.nonce,startedAt:fixture.analysis.startedAt});
  for(const row of recorded)WB.emit('state-captured',{capture:clone(row.capture)});
  WB.emit('match-analysis-complete',clone(fixture.analysis));
  WB.emit('task-finished',{name:'試合全体を解析',cancelRequested:false});

  await waitFor(()=>WB.RuntimeAuthorityBinding?.snapshot?.()?.lastEnrichment?.runId===fixture.analysis.runId,{timeout:2500});
  await waitFor(()=>window.__wbPF1R2FreshEvidenceV1?.runId===fixture.analysis.runId,{timeout:2500});
  await sleep(30);

  snap=WB.ReplaySession?.snapshot?.()||window.__wbReplaySessionV1||null;
  const targetWindow=(snap?.decisionWindows||[]).find(w=>near(w.reviewEnd,fixture.expected.reviewEnd,.02))||(snap?.decisionWindows||[]).find(w=>Number(w.turn)===8)||null;
  const windowId=targetWindow?.id||'';
  const binding=WB.RuntimeAuthorityBinding?.bindingForWindow?.(windowId,fixture.analysis.runId)||null;
  const authorityPresentation=WB.RuntimeAuthorityBinding?.presentationForWindow?.(windowId,fixture.analysis.runId)||null;
  check(!!windowId,'REAL_8T_WINDOW_CREATED',`windows=${(snap?.decisionWindows||[]).map(w=>`${w.id}:${w.reviewStart}->${w.reviewEnd}`).join('|')}`);
  check(binding?.complete===true&&binding?.anchorExact===true&&binding?.afterExact===true&&near(binding?.anchorTime,fixture.expected.reviewStart)&&near(binding?.afterTime,fixture.expected.reviewEnd),'REAL_BINDING_EXACT_113638_116338',JSON.stringify(binding));
  check(authorityPresentation?.beforeState?.opponentWard==='unknown'&&authorityPresentation?.afterState?.opponentWard==='unknown','WARD_REMAINS_UNKNOWN_IN_AUTHORITY',JSON.stringify({before:authorityPresentation?.beforeState?.opponentWard,after:authorityPresentation?.afterState?.opponentWard}));

  const pipeRow=WB.RuntimeDecisionPipeline?.getForWindow?.(windowId)||null;
  const holdReasons=pipeRow?.detail?.reasonCodes||[];
  check(pipeRow?.status==='HOLD'&&holdReasons.includes(fixture.expected.safeHoldCriticalReason),'WARD_UNKNOWN_SAFE_HOLD',`status=${pipeRow?.status}; reason=${pipeRow?.reason}; generation=${pipeRow?.detail?.generationStatus}; reasons=${holdReasons.join(',')}`);

  WB.emit('comparison-decision-ready',{windowId,runId:fixture.expected.staleRunId,sourceAuthority:'stale-fixture',decision:{status:'OK',classification:'INSUFFICIENT_EVIDENCE',bestCandidateId:null,reasonCodes:['INSUFFICIENT_AUTHORITY'],ranking:{pairwise:[]}},playedMove:null});
  await sleep(20);
  check(!(WB.CoachIntegration?.snapshot?.()?.items||[]).some(x=>x.runId===fixture.expected.staleRunId),'STALE_RUN_DECISION_REJECTED',JSON.stringify(WB.CoachIntegration?.snapshot?.()));

  const persisted=await waitFor(async()=>{const s=await readStoredSession(window.indexedDB);return s?.analysisRun?.runId===fixture.analysis.runId&&Object.keys(s?.authorityPresentations||{}).length>0?s:null},{timeout:1800,step:20});
  check(!!persisted,'AUTHORITY_PRESENTATION_PERSISTED_BEFORE_RESTORE');

  WB.setTimeline(clone(fixture.timeline));
  const restoreCount=WB.events.filter(x=>x.type==='replay-session-restore').length;
  video.dispatchEvent(new window.Event('loadedmetadata'));
  await waitFor(()=>WB.events.filter(x=>x.type==='replay-session-restore').length>restoreCount,{timeout:1800});
  WB.emit('review-profile-changed',{profile:WB.ReviewEngine?.activeProfile?.()||'none'});
  WB.emit('postprocess-complete',{});
  await sleep(40);
  WB.ReplaySession?.render?.();
  await sleep(10);

  snap=WB.ReplaySession?.snapshot?.()||window.__wbReplaySessionV1||null;
  const finalWindow=(snap?.decisionWindows||[]).find(w=>String(w.id)===String(windowId))||(snap?.decisionWindows||[]).find(w=>near(w.reviewEnd,fixture.expected.reviewEnd,.02))||null;
  const finalId=finalWindow?.id||windowId;
  const host=finalId?document.querySelector(`[data-review-window-id="${String(finalId).replace(/"/g,'\\"')}"]`):null;
  const timeText=host?.querySelector('.reviewWindowTime')?.textContent||'';
  const ppRow=host?.querySelector('[data-review-state-key="pp"]');
  const ppBefore=ppRow?.children?.[1]?.textContent||'',ppAfter=ppRow?.children?.[2]?.textContent||'';
  const beforeButton=host?.querySelector('[data-review-frame-phase="before"]');
  const reviewText=document.querySelector('#reviewPoints')?.textContent||'';

  check(!!host,'FINAL_DOM_8T_WINDOW_EXISTS',`id=${finalId}; html=${document.querySelector('#reviewPoints')?.innerHTML?.slice(0,500)||''}`);
  check(timeText.includes('8T')&&timeText.includes('01:53.6')&&timeText.includes('01:56.3'),'FINAL_DOM_8T_START_113638',timeText);
  check(ppBefore===fixture.expected.ppBefore&&ppAfter===fixture.expected.ppAfter,'FINAL_DOM_PP_2_TO_1',`pp=${ppBefore}→${ppAfter}`);
  check(!reviewText.includes(fixture.expected.forbiddenHpText),'FINAL_DOM_NO_6T_FALSE_HP_18_TO_15',reviewText.includes(fixture.expected.forbiddenHpText)?fixture.expected.forbiddenHpText:'not present');
  check(!host?.querySelector('.reviewCoach'),'FINAL_DOM_NO_LEGACY_REVIEW_COACH',host?.querySelector('.reviewCoach')?.textContent||'none');
  check(!!host?.querySelector('[data-comparison-coach="1"]'),'FINAL_DOM_SAFE_HOLD_COMPARISON_COACH_PRESENT',host?.querySelector('[data-comparison-coach="1"]')?.textContent||'missing');
  check((window.__wbReviewCoachV1?.count||0)===0,'LEGACY_COACH_NOT_FINAL_AUTHORITY',`count=${window.__wbReviewCoachV1?.count}`);
  check(near(Number(beforeButton?.dataset?.reviewFrameTime),fixture.expected.reviewStart),'FINAL_DOM_BEFORE_FRAME_113638',`frame=${beforeButton?.dataset?.reviewFrameTime}`);
  const authorityStart=WB.ReplaySession?.reviewAuthorityPlaybackStart?.(finalId);
  check(near(authorityStart,fixture.expected.reviewStart),'PLAYBACK_AUTHORITY_START_113638',`start=${authorityStart}`);
  if(finalId&&typeof WB.ReplaySession?.playReviewWindow==='function')await WB.ReplaySession.playReviewWindow(finalId);
  check(near(WB.video.currentTime,fixture.expected.reviewStart-3,.03),'PLAYBACK_SEEKS_THREE_SECONDS_BEFORE_AUTHORITY_START',`currentTime=${WB.video.currentTime}`);

  const stored=await readStoredSession(window.indexedDB);
  check(stored?.version==='replay-session-v3'&&!((stored?.states||[]).some(x=>near(x.time,74.141)&&Number(x.opponentHP)===15)),'INDEXEDDB_FINAL_V3_NO_DIRTY_STATE',`version=${stored?.version}; states=${(stored?.states||[]).map(x=>`${x.time}:${x.opponentHP}`).join(',')}`);
  const model=WB.ReplaySession?.reviewWindowModels?.(snap)?.find(x=>String(x.id)===String(finalId));
  check(near(model?.reviewStart,fixture.expected.reviewStart)&&model?.beforeState?.pp===2&&model?.afterState?.pp===1,'POST_RESTORE_MODEL_RETAINS_AUTHORITY',`reviewStart=${model?.reviewStart}; pp=${model?.beforeState?.pp}→${model?.afterState?.pp}`);

  if(failures.length){console.error(`P-F1-R2 09-23 INTEGRATED ACCEPTANCE FAIL ${failures.length}`);for(const x of failures)console.error(x);process.exitCode=1}
  else console.log('P-F1-R2 09-23 INTEGRATED ACCEPTANCE PASS');
})().catch(err=>{console.error('INTEGRATED HARNESS ERROR',err?.stack||err);process.exitCode=2});

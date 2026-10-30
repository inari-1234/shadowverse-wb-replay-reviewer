const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const {JSDOM}=require('jsdom');
const FDB=require('fake-indexeddb');

const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'pf1r2-0923-tradeoff-integrated-acceptance-fixture.json'),'utf8'));
const failures=[];
function check(ok,id,detail=''){if(ok){console.log(`TRADEOFF INTEGRATED ASSERT PASS: ${id}`);return true}const msg=`TRADEOFF INTEGRATED ASSERT FAIL: ${id}${detail?` :: ${detail}`:''}`;failures.push(msg);console.error(msg);return false}
const near=(a,b,t=.01)=>Number.isFinite(Number(a))&&Math.abs(Number(a)-Number(b))<=t;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,{timeout=2500,step=10}={}){const end=Date.now()+timeout;let last=null;while(Date.now()<end){try{last=await fn();if(last)return last}catch{}await sleep(step)}return last}
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
function makeCapture(row,mode){
  const hand=clone(row.hand||{}),ward=String(row.opponentWard??'unknown'),followers=clone(row.followers||[]);
  return {version:'state-clean-1.8.29',at:row.at,captureMode:mode,partial:false,
    context:{time:row.time,turn:row.turn,absoluteSide:'bottom',relativeSide:'自分',targetSide:'bottom',playOrder:'後攻',videoKey:`${fixture.videoMeta.name}|${fixture.videoMeta.size}|${fixture.videoMeta.lastModified}`},
    confirmed:{version:'confirmed-state-v1',time:row.time,turn:row.turn,absoluteSide:'bottom',relativeSide:'自分',pp:row.pp,opponentHP:row.opponentHP,extraPP:row.extraPP,ep:row.ep,sep:row.sep,opponentWard:ward,boardDamage:row.boardDamage,boardDamageKnown:row.boardDamageKnown===true,hand:{recognized:hand},observation:{boardAccepted:row.boardAccepted===true,handKnown:Object.keys(hand).length>0,captureMode:mode}},
    resources:{ui:{extra:row.extraPP,ep:row.ep,sep:row.sep,ward}},
    ward:{state:ward,unknown:ward==='unknown',result:{known:row.wardKnown===true,state:ward,reason:row.wardReason||null,method:row.wardMethod||null}},
    hand:{result:{known:Object.keys(hand).length>0,recognized:hand,unresolved:{},samples:[],reason:Object.keys(hand).length?'recorded-capture':'not-observed'}},
    board:{result:{accepted:row.boardAccepted===true,known:row.boardKnown===true,value:row.boardDamage,attackableTotal:row.boardDamage,faceDamageConfirmed:row.faceDamageConfirmed===true,candidateTotal:row.candidateTotal??row.boardDamage,followers},applied:false,manualPreserved:false,conflict:false},stageErrors:[]};
}

(async()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const dom=new JSDOM(html,{url:'https://example.test/main/',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom,document=window.document;
  Object.defineProperty(window,'indexedDB',{value:FDB.indexedDB,configurable:true});
  Object.defineProperty(window,'IDBKeyRange',{value:FDB.IDBKeyRange,configurable:true});
  Object.defineProperty(window,'crypto',{value:webcrypto,configurable:true});
  window.structuredClone=global.structuredClone;
  window.requestAnimationFrame=cb=>setTimeout(()=>cb(Date.now()),0);window.cancelAnimationFrame=id=>clearTimeout(id);
  window.matchMedia=()=>({matches:false,media:'',addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  Object.defineProperty(window.navigator,'serviceWorker',{value:{controller:null,async register(){return{addEventListener(){},update(){}}},addEventListener(){}},configurable:true});
  if(!window.URL.createObjectURL)window.URL.createObjectURL=()=>`blob:fixture-${Date.now()}`;if(!window.URL.revokeObjectURL)window.URL.revokeObjectURL=()=>{};
  if(!window.HTMLElement.prototype.scrollIntoView)window.HTMLElement.prototype.scrollIntoView=function(){};
  const video=document.querySelector('#video');let currentTime=0,paused=true;
  Object.defineProperties(video,{duration:{get:()=>fixture.videoMeta.duration,configurable:true},videoWidth:{get:()=>2622,configurable:true},videoHeight:{get:()=>1206,configurable:true},readyState:{get:()=>4,configurable:true},seeking:{get:()=>false,configurable:true},paused:{get:()=>paused,configurable:true},currentTime:{get:()=>currentTime,set:v=>{currentTime=Number(v)||0;queueMicrotask(()=>video.dispatchEvent(new window.Event('seeked')))},configurable:true}});
  video.play=async()=>{paused=false};video.pause=()=>{paused=true};
  const evalFile=f=>window.eval(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
  evalFile('app-core.js');
  for(const f of ['card-db.js','review-engine.js','position-state-runtime.js','common-rule-engine-runtime.js','legal-action-sequence.js','outcome-backtracking.js','comparison-decision.js','played-move-authority.js','coach-explanation.js','replay-session.js','runtime-decision-pipeline.js','runtime-authority-binding.js','coach-integration.js','state-recognition.js','diagnostics.js'])evalFile(f);
  document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));await sleep(0);
  const WB=window.WB;
  check(fixture.authorityClass==='IPHONE_EXACT_TRADEOFF_RAW_TRACE_SUBSET'&&fixture.provenance.sourceRuntimeCommit==='9a44a163447af07e43a3bd4f67eb5a394ce7e992'&&fixture.provenance.runtimeBuildId==='candidate-assets-0b0737bea9d9','FIXTURE_IS_1021_IPHONE_EXACT_TRADEOFF');
  check(!!WB.ReplaySession&&!!WB.RuntimeAuthorityBinding&&!!WB.RuntimeDecisionPipeline&&!!WB.CoachIntegration&&!!WB.CoachExplanation&&!!WB.Diagnostics,'REAL_PRODUCTION_CHAIN_LOADED');
  WB.videoMeta=clone(fixture.videoMeta);WB.videoName='09-23';WB.turnTimeline=clone(fixture.timeline);WB.stateCaptureHistory=[];
  const timeline=fixture.timelineCaptures.map(x=>({...x,capture:makeCapture(x,x.time===113.188?'full':'timeline-lite')}));
  const exact=fixture.decisionAuthorityCaptures.map(x=>({...x,capture:makeCapture(x,'decision-authority')}));
  const realCapture=WB.StateRecognition.captureState;
  WB.StateRecognition.captureState=async options=>{const t=Number(WB.video.currentTime),mode=options?.captureMode||'decision-authority',pool=mode==='decision-authority'?exact:timeline;const row=pool.slice().sort((a,b)=>Math.abs(a.time-t)-Math.abs(b.time-t))[0];if(!row||Math.abs(row.time-t)>.05)throw new Error(`recorded capture missing at ${t} mode=${mode}`);const c=makeCapture(row,mode);WB.stateCapture=c;return c};
  check(typeof realCapture==='function'&&WB.StateRecognition.captureState!==realCapture,'ONLY_CAPTURESTATE_SUBSTITUTED');
  await WB.RuntimeAuthorityBinding.ready();
  WB.emit('match-analysis-start',clone(fixture.analysis));for(const row of timeline)WB.emit('state-captured',{capture:clone(row.capture)});WB.emit('match-analysis-complete',clone(fixture.analysis));
  WB.emit('task-finished',{name:'試合全体を解析',cancelRequested:false});
  await waitFor(()=>WB.RuntimeAuthorityBinding.snapshot()?.lastEnrichment?.runId===fixture.analysis.runId);
  await waitFor(()=>WB.RuntimeDecisionPipeline.snapshot()?.items?.some(x=>x?.status==='OK'));
  await waitFor(()=>WB.CoachIntegration.snapshot()?.items?.some(x=>x?.runId===fixture.analysis.runId));
  await sleep(30);

  const snap=WB.ReplaySession.snapshot(),target=(snap.decisionWindows||[]).find(w=>near(w.reviewEnd,fixture.expected.reviewEnd,.02));
  const windowId=target?.id||'',binding=WB.RuntimeAuthorityBinding.bindingForWindow(windowId,fixture.analysis.runId),authority=WB.RuntimeAuthorityBinding.presentationForWindow(windowId,fixture.analysis.runId);
  check(!!windowId,'REAL_8T_WINDOW_CREATED');
  check(binding?.complete===true&&binding.anchorExact===true&&binding.afterExact===true&&near(binding.anchorTime,fixture.expected.reviewStart)&&near(binding.afterTime,fixture.expected.reviewEnd),'EXACT_113638_116338_BINDING',JSON.stringify(binding));
  check(authority?.beforeState?.opponentWard===fixture.expected.wardBefore,'WARD_NONE_IS_EXACT_AUTHORITY',JSON.stringify(authority?.beforeState));
  check(near(authority?.beforeState?.hand?.recognized?.quickBlader?.confidence,fixture.expected.quickConfidence),'QUICK_CONFIDENCE_09188');
  const input=WB.RuntimeAuthorityBinding.snapshot()?.inputTrace?.captures||[],anchorTrace=input.find(x=>x.source==='pf0b-exact'&&x.role==='anchor');
  check(Number(anchorTrace?.capture?.hand?.result?.recognized?.quickBlader?.positiveFrames)===fixture.expected.quickPositiveFrames,'QUICK_POSITIVE_FRAMES_4');

  const ra=(WB.RuntimeAuthorityBinding.snapshot()?.preActionResourceAuthorities||[]).find(x=>x.windowId===windowId);
  check(ra?.sourceStateId===fixture.expected.preActionResourceAuthority.sourceStateId&&ra?.anchorStateId===fixture.expected.preActionResourceAuthority.anchorStateId&&near(ra?.gapSeconds,fixture.expected.preActionResourceAuthority.gapSeconds,.001),'PREACTION_EP_CARRY_PROVENANCE_113188',JSON.stringify(ra));
  check(ra?.carried?.ep==='yes'&&ra?.carried?.sep===undefined&&ra?.criteria?.positiveAvailabilityOnly===true&&ra?.criteria?.afterStateUsed===false,'PREACTION_CARRY_POSITIVE_ONLY',JSON.stringify(ra));

  const pipe=WB.RuntimeDecisionPipeline.getForWindow(windowId);
  check(pipe?.status===fixture.expected.pipelineStatus&&pipe?.outcomeCount===fixture.expected.outcomeCount,'PIPELINE_OK_SIX_OUTCOMES',`status=${pipe?.status}; outcomes=${pipe?.outcomeCount}`);
  check(pipe?.decision?.classification===fixture.expected.classification&&pipe?.decision?.bestCandidateId===fixture.expected.recommendation,'TRADEOFF_WITHOUT_RECOMMENDATION',JSON.stringify({classification:pipe?.decision?.classification,best:pipe?.decision?.bestCandidateId}));
  check(pipe?.playedMove?.status===fixture.expected.playedMoveStatus&&pipe.playedMove.matchedActions?.some(a=>a.actionType==='PLAY_CARD'&&a.source?.cardId===fixture.expected.playedCardId)&&pipe.playedMove.matchedActions?.some(a=>a.actionType==='EVOLVE'&&a.source?.cardId===fixture.expected.playedCardId),'PLAYED_MOVE_QUICK_EVOLVE_CONFIRMED',JSON.stringify(pipe?.playedMove));

  const coach=WB.CoachIntegration.getForWindow(windowId),pmc=coach?.explanation?.playedMoveComparison;
  check(coach?.explanation?.bestCandidateId==null&&coach?.explanation?.whyBest?.length===0,'COACH_HAS_NO_RECOMMENDED_CANDIDATE');
  check(pmc?.visible===true&&pmc?.status==='CONFIRMED_TRADE_OFF'&&pmc?.text?.includes('確認')&&pmc?.text?.includes('単独の推奨はしません'),'CONFIRMED_PLAYED_MOVE_VISIBLE_WITHOUT_RANKING',JSON.stringify(pmc));
  check((pmc?.actualAdvantages||[]).some(x=>x.includes(fixture.expected.actualStrengthKeyword))&&!(pmc?.actualAdvantages||[]).some(x=>x.includes('EP')||x.includes('手札')),'ACTUAL_ADVANTAGES_DIRECTION_SAFE',JSON.stringify(pmc?.actualAdvantages));
  // Assertion migration: the old flat list required EP and hand to be human-visible and no board text. The new contract keeps every directional reason in candidate-attributed structured groups, while the human summary shows at most three named alternatives. Dedicated corrective regression proves old implementation RED / new implementation GREEN.
  const altGroups=pmc?.otherCandidateAdvantages||[],allOtherReasons=altGroups.flatMap(g=>g.reasons||[]);
  check(fixture.expected.otherStrengthKeywords.every(k=>allOtherReasons.some(x=>x.includes(k)))&&altGroups.every(g=>g.candidateId&&g.description&&!(g.reasons||[]).some(x=>x.includes('盤面'))),'OTHER_ADVANTAGES_DIRECTION_SAFE',JSON.stringify(altGroups));
  check((pmc?.otherAdvantages||[]).length<=3&&(pmc?.otherAdvantages||[]).every(x=>x.includes('：'))&&(pmc?.otherAdvantages||[]).some(x=>x.includes('リーダーを攻撃する手')&&x.includes('即時打点')),'OTHER_ADVANTAGES_ARE_NAMED_AND_LIMITED',JSON.stringify(pmc?.otherAdvantages));
  check(!((pmc?.otherAdvantages||[]).some(x=>x==='即時打点で1点上回ります。')&&(pmc?.otherAdvantages||[]).some(x=>x==='即時打点で3点上回ります。')),'NO_ANONYMOUS_DAMAGE_CONTRADICTION',JSON.stringify(pmc?.otherAdvantages));
  const unresolved=WB.CoachExplanation.explainDecision(pipe.decision,{playedMove:{status:'UNRESOLVED'}});
  check(unresolved.playedMoveComparison?.visible===false,'UNCONFIRMED_PLAYED_MOVE_STAYS_HIDDEN');

  const diag=WB.Diagnostics.diagnostic(),dra=diag?.preActionResourceAuthorityV1?.items?.find(x=>x.windowId===windowId);
  check(dra?.sourceStateId===fixture.expected.preActionResourceAuthority.sourceStateId&&near(dra?.gapSeconds,.45,.001)&&dra?.criteria?.sameTurnSide===true,'DIAGNOSTIC_EXPORTS_PREACTION_RESOURCE_AUTHORITY',JSON.stringify(diag?.preActionResourceAuthorityV1));
  check(Array.isArray(diag?.holdDiagnosticsV1?.items)&&diag.holdDiagnosticsV1.items.length===0,'SUCCESS_PATH_HAS_NO_HOLD_DIAGNOSTICS');

  WB.CoachIntegration.decorate();WB.ReplaySession.render();await sleep(10);
  const host=document.querySelector(`[data-review-window-id="${windowId}"]`),card=host?.querySelector('[data-comparison-coach="1"]'),text=card?.textContent||'';
  check(!!card,'FINAL_DOM_COMPARISON_COACH_PRESENT',text);
  check(text.includes('刹那のクイックブレイダー')&&text.includes('進化')&&text.includes('確認'),'FINAL_DOM_SHOWS_CONFIRMED_QUICK_EVOLVE',text);
  check(!card?.querySelector('.comparisonCoachReasons')&&!text.includes('実際の手は推奨手と一致')&&!text.includes('良い手でした'),'FINAL_DOM_NO_RECOMMENDATION_OR_PRAISE',text);
  check(text.includes('実際の手が上回る点：')&&text.includes('盤面')&&text.includes('他候補が上回る点：')&&text.includes('EP')&&text.includes('手札'),'FINAL_DOM_DIRECTIONAL_STRENGTHS_AND_WEAKNESSES',text);

  if(failures.length){console.error(`P-F1-R2 09-23 TRADEOFF INTEGRATED ACCEPTANCE FAIL: ${failures.length}`);process.exit(1)}
  console.log('P-F1-R2 09-23 TRADEOFF INTEGRATED ACCEPTANCE PASS');
})().catch(err=>{console.error(err);process.exit(1)});

import fs from 'node:fs';
import vm from 'node:vm';

const fixture=JSON.parse(fs.readFileSync(new URL('./pf1r2-0923-offline-expected-fixture.json',import.meta.url),'utf8'));
const replaySource=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const coachSource=fs.readFileSync(new URL('../coach-integration.js',import.meta.url),'utf8');

const failures=[];
function check(ok,id,detail=''){
  if(ok){console.log(`ACCEPTANCE ASSERT PASS: ${id}`);return true}
  const msg=`ACCEPTANCE ASSERT FAIL: ${id}${detail?` :: ${detail}`:''}`;
  failures.push(msg);console.error(msg);return false;
}
function near(a,b,t=.001){return Number.isFinite(Number(a))&&Math.abs(Number(a)-Number(b))<=t}
function fmt(v){const n=Number(v),m=Math.floor(n/60),s=n-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`}

const handlers=new Map();
const runtime={runId:'acceptance-run-A',nonce:'acceptance-nonce-A',windowId:null};
const WB={
  videoMeta:{name:'09-23.mp4',size:123456,lastModified:1727078400000,type:'video/mp4'},
  video:{currentTime:0,duration:200},turnTimeline:[],mulligan:null,classDetection:null,scenes:[],task:{name:'acceptance-seed'},
  optionalModules:[],registerModule(){},recordError(){},log(){},videoKey(){return '09-23.mp4|123456|1727078400000'},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},
  emit(name,detail){for(const fn of handlers.get(name)||[])fn(detail)},onReady(){},$(){return null},fmt,escape:s=>String(s),pauseVideo(){},
  ReviewEngine:{activeProfile(){return 'none'},deriveWindowCoach(){return{facts:['legacy'],focus:['legacy'],cautions:['legacy'],judgementReason:'legacy hold'}},deriveCardUseCandidates(){return[]}}
};
const hostState={
  time:{textContent:'8T / 01:55.9 → 01:56.3'},
  ppBefore:{textContent:'1',className:''},ppAfter:{textContent:'1',className:''},
  boardBefore:{textContent:'0',className:''},boardAfter:{textContent:'3',className:''},
  hpBefore:{textContent:'16',className:''},hpAfter:{textContent:'16',className:''},
  beforeBtn:{dataset:{reviewFrameTime:'115.888'}},afterBtn:{dataset:{reviewFrameTime:'116.338'}},videoBtn:{dataset:{}},oldCoach:{hidden:false,dataset:{}}
};
const host={dataset:{},querySelector(sel){
  if(sel==='.reviewWindowTime')return hostState.time;
  if(sel==='[data-review-state-key="pp"]')return{children:[{},hostState.ppBefore,hostState.ppAfter]};
  if(sel==='[data-review-state-key="boardDamage"]')return{children:[{},hostState.boardBefore,hostState.boardAfter]};
  if(sel==='[data-review-state-key="opponentHP"]')return{children:[{},hostState.hpBefore,hostState.hpAfter]};
  if(sel==='[data-review-frame-phase="before"]')return hostState.beforeBtn;
  if(sel==='[data-review-frame-phase="after"]')return hostState.afterBtn;
  if(sel==='[data-review-video-window]')return hostState.videoBtn;
  if(sel==='.reviewCoach')return hostState.oldCoach;
  if(sel==='[data-comparison-coach="1"]')return null;
  return null;
},appendChild(){},insertBefore(){}};
const document={
  querySelector(sel){if(sel===`[data-review-window-id="${runtime.windowId||''}"]`)return host;return null},
  querySelectorAll(){return[]},
  createElement(){return{dataset:{},className:'',children:[],appendChild(){},insertBefore(){},remove(){},addEventListener(){},querySelector(){return null},textContent:''}},
  head:{appendChild(){}}
};
const sandbox={window:{WB},document,console,structuredClone,queueMicrotask(fn){fn()},setTimeout,clearTimeout,URL,Date,Promise,crypto:globalThis.crypto,requestAnimationFrame:fn=>fn(),CSS:{escape:s=>s}};
vm.createContext(sandbox);
new vm.Script(replaySource,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

function startRun(runId,nonce){
  if(typeof R.beginAnalysisRun==='function')return R.beginAnalysisRun({runId,nonce,startedAt:'2026-10-10T00:00:00.000Z',source:'recorded-acceptance'});
  for(const fn of handlers.get('match-analysis-start')||[])fn({runId,nonce,startedAt:'2026-10-10T00:00:00.000Z',source:'recorded-acceptance'});
  return null;
}
function capFrom(row){return{at:'2026-10-10T00:00:00.000Z',captureMode:'timeline-lite',context:{time:row.time,turn:row.turn,absoluteSide:row.absoluteSide,relativeSide:row.relativeSide},confirmed:{time:row.time,turn:row.turn,absoluteSide:row.absoluteSide,relativeSide:row.relativeSide,pp:row.pp,opponentHP:row.opponentHP,extraPP:'unknown',ep:'yes',sep:'unknown',opponentWard:'none',boardDamage:row.boardDamage,boardDamageKnown:row.boardDamageKnown,hand:{recognized:{}}}}}
function windowFor(snap){return (snap.decisionWindows||[]).find(w=>near(w.reviewEnd,fixture.source.decisionWindow.afterTime,.01))||(snap.decisionWindows||[]).at(-1)||null}

startRun(runtime.runId,runtime.nonce);
for(const key of ['anchor113638','original115888','after116338'])R.ingestState(capFrom(fixture.replayStates[key]));
let snap=R.snapshot();
let baseWindow=windowFor(snap);
check(!!baseWindow,'RECORDED_WINDOW_CREATED','09-23 8T window was not created');
runtime.windowId=baseWindow?.id||null;

const authorityPresentation=()=>{
  const s=R.snapshot(),anchor=(s.states||[]).find(x=>near(x.time,fixture.source.decisionWindow.anchorTime)),after=(s.states||[]).find(x=>near(x.time,fixture.source.decisionWindow.afterTime));
  return{version:'pf1r2-recorded-acceptance-v1',authority:'fresh-exact',windowId:runtime.windowId,runId:runtime.runId,nonce:runtime.nonce,reviewStart:fixture.source.decisionWindow.anchorTime,reviewEnd:fixture.source.decisionWindow.afterTime,turn:8,beforeState:structuredClone(anchor),afterState:structuredClone(after)};
};
const binding={runId:runtime.runId,nonce:runtime.nonce,windowId:runtime.windowId,originalStateId:fixture.replayStates.original115888.id,anchorStateId:fixture.replayStates.anchor113638.id,anchorTime:fixture.source.decisionWindow.anchorTime,afterStateId:fixture.replayStates.after116338.id,afterTime:fixture.source.decisionWindow.afterTime,anchored:true,anchorExact:true,afterExact:true,complete:true,blocked:false};
WB.RuntimeAuthorityBinding={
  snapshot(){return{currentFreshRun:{runId:runtime.runId,nonce:runtime.nonce},windowAuthorityBindings:[structuredClone(binding)]}},
  bindingForWindow(windowId,runId){return windowId===runtime.windowId&&runId===runtime.runId?structuredClone(binding):null},
  presentationForWindow(windowId,runId){return windowId===runtime.windowId&&runId===runtime.runId?authorityPresentation():null}
};
WB.RuntimeDecisionPipeline={snapshot(){return{items:[{status:'HOLD',windowId:runtime.windowId,reason:'NO_SEQUENCE_CANDIDATES',meta:{runId:runtime.runId}}]}}};
WB.CoachExplanation={explainDecision(){throw new Error('comparison coach is not required by this authority-only acceptance')}};
new vm.Script(coachSource,{filename:'coach-integration.js'}).runInContext(sandbox);
const C=WB.CoachIntegration;
let decorateError=null;
try{C.decorate()}catch(err){decorateError=err}
check(!decorateError,'OLD_OR_NEW_PRESENTATION_PATH_EXECUTES',decorateError?.stack||String(decorateError||''));

if(typeof R.setAuthorityPresentation==='function'&&typeof R.reviewWindowModels==='function'){
  const model=R.reviewWindowModels(R.snapshot()).find(x=>x.id===runtime.windowId);
  check(near(model?.reviewStart,fixture.source.decisionWindow.anchorTime),'RERENDER_RETAINS_113638',`model.reviewStart=${model?.reviewStart}`);
  check(model?.beforeState?.pp===2&&model?.afterState?.pp===1,'RERENDER_RETAINS_PP_2_TO_1',`pp=${model?.beforeState?.pp}→${model?.afterState?.pp}`);
}else{
  check(near(Number(hostState.beforeBtn.dataset.reviewFrameTime),fixture.source.decisionWindow.anchorTime),'LEGACY_PATH_APPLIES_113638_BEFORE_RERENDER',`legacy before=${hostState.beforeBtn.dataset.reviewFrameTime}`);
  const persisted=windowFor(R.snapshot());
  check(near(persisted?.reviewStart,fixture.source.decisionWindow.anchorTime),'RERENDER_RETAINS_113638',`legacy ReplaySession reviewStart=${persisted?.reviewStart}; expected ${fixture.source.decisionWindow.anchorTime}, old symptom=${fixture.source.decisionWindow.originalWindowStartTime}`);
  check(persisted?.beforeState?.pp===2&&persisted?.afterState?.pp===1,'RERENDER_RETAINS_PP_2_TO_1',`legacy model pp=${persisted?.beforeState?.pp}→${persisted?.afterState?.pp}`);
}

runtime.runId='acceptance-run-B';runtime.nonce='acceptance-nonce-B';
startRun(runtime.runId,runtime.nonce);
const runB={...fixture.replayStates.anchor113638,time:120.000,id:'st:8:bottom:120.000'};
R.ingestState(capFrom(runB));
snap=R.snapshot();
const staleTimes=(snap.states||[]).map(x=>Number(x.time)).filter(t=>near(t,113.638)||near(t,115.888)||near(t,116.338));
check(staleTimes.length===0,'NO_PAST_RUN_STATE_MIXING',`past-run times still present: ${staleTimes.join(',')||'none'}`);
if(snap.analysisRun)check(snap.analysisRun.runId==='acceptance-run-B','CURRENT_RUN_ID_IS_RUN_B',`analysisRun=${snap.analysisRun.runId}`);

if(failures.length){
  console.error(`P-F1-R2 RECORDED ACCEPTANCE FAIL ${failures.length}`);
  for(const x of failures)console.error(x);
  process.exitCode=1;
}else console.log('P-F1-R2 09-23 RECORDED ACCEPTANCE PASS');

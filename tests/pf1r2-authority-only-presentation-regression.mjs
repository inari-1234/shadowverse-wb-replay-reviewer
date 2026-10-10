import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Migration authority: this regression preserves every behavioral assertion from the
// pre-P0-2 DOM-decoration test, but verifies them through the new single source of
// truth: ReplaySession presentation model -> ReplaySession renderer/playback.
const replaySource=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const coachSource=fs.readFileSync(new URL('../coach-integration.js',import.meta.url),'utf8');

const handlers=new Map();
const runtime={runId:'fresh-hold-1',nonce:'nonce-hold-1',bindingMode:'exact'};
const WB={
  videoMeta:{name:'09-23.mp4',size:1,lastModified:1},video:{currentTime:0,duration:200},turnTimeline:[],mulligan:null,classDetection:null,scenes:[],task:null,
  optionalModules:[],registerModule(){},recordError(){},log(){},videoKey(){return '09-23|1|1'},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},
  emit(name,detail){for(const fn of handlers.get(name)||[])fn(detail)},onReady(){},
  fmt(v){const m=Math.floor(Number(v)/60),s=Number(v)-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`},
  escape:s=>String(s),$(){return null},pauseVideo(){},
  ReviewEngine:{
    activeProfile(){return 'none'},
    deriveWindowCoach(){return{facts:['legacy observation'],focus:['legacy focus'],cautions:['legacy caution'],judgementReason:'legacy hold'}},
    deriveCardUseCandidates(){return[]}
  },
  CoachExplanation:{explainDecision(){throw new Error('comparison coach must not be needed for authority-only presentation')}},
  RuntimeDecisionPipeline:{snapshot(){return{items:[{status:'HOLD',windowId:runtime.windowId||null,reason:'NO_SEQUENCE_CANDIDATES',meta:{runId:runtime.runId}}]}}}
};
const sandbox={window:{WB},document:{querySelector(){return null},createElement(){return{dataset:{},appendChild(){},addEventListener(){}}},head:{appendChild(){}}},console,structuredClone,queueMicrotask(fn){fn()},setTimeout,clearTimeout,URL,Date,Promise,crypto:globalThis.crypto,requestAnimationFrame:fn=>fn(),CSS:{escape:s=>s}};
vm.createContext(sandbox);
new vm.Script(replaySource,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

function seed(runId,nonce){
  R.beginAnalysisRun({runId,nonce,startedAt:'2026-10-10T00:00:00.000Z'});
  const cap=(time,pp,board)=>({at:'2026-10-10T00:00:00.000Z',captureMode:'timeline-lite',context:{time,turn:8,absoluteSide:'bottom',relativeSide:'自分'},confirmed:{time,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp,opponentHP:16,extraPP:'unknown',ep:'yes',sep:'unknown',opponentWard:'unknown',boardDamage:board,boardDamageKnown:true,hand:{recognized:{}}}});
  R.ingestState(cap(113.638,2,0));
  R.ingestState(cap(115.888,1,0));
  R.ingestState(cap(116.338,1,3));
  const snap=R.snapshot(),w=snap.decisionWindows.at(-1);assert.ok(w,'fixture must create the 8T Review Window');
  runtime.windowId=w.id;
  return w;
}
function exactPresentation(windowId,runId,nonce){
  const snap=R.snapshot(),states=snap.states;
  const anchor=states.find(x=>Math.abs(Number(x.time)-113.638)<.001),after=states.find(x=>Math.abs(Number(x.time)-116.338)<.001);
  return{version:'pf1r2-single-presentation-v1',authority:'fresh-exact',windowId,runId,nonce,reviewStart:113.638,reviewEnd:116.338,turn:8,beforeState:{...structuredClone(anchor),id:'st:8:bottom:113.638',time:113.638,pp:2,boardDamage:0,boardDamageKnown:true},afterState:{...structuredClone(after),id:'st:8:bottom:116.338',time:116.338,pp:1,boardDamage:3,boardDamageKnown:true}};
}

let base=seed(runtime.runId,runtime.nonce);
WB.RuntimeAuthorityBinding={
  snapshot(){return{currentFreshRun:{runId:runtime.runId,nonce:runtime.nonce},windowAuthorityBindings:[{windowId:runtime.windowId,runId:runtime.runId,nonce:runtime.nonce,complete:runtime.bindingMode==='exact',anchorExact:runtime.bindingMode==='exact',afterExact:runtime.bindingMode==='exact'}]}},
  presentationForWindow(windowId,runId){return runtime.bindingMode==='exact'&&windowId===runtime.windowId&&runId===runtime.runId?exactPresentation(windowId,runId,runtime.nonce):null}
};
new vm.Script(coachSource,{filename:'coach-integration.js'}).runInContext(sandbox);
const C=WB.CoachIntegration;

// Original assertion: no P-D1 OK row exists in this HOLD fixture.
assert.equal(C.snapshot().count,0,'no P-D1 OK row should exist in this HOLD fixture');

// Original assertion: exact fresh authority must still update the Review Card even when P-D1 is HOLD.
const count=C.decorate();
assert.ok(count>=1,'exact fresh authority must populate presentation even when P-D1 is HOLD');
let model=R.reviewWindowModels(R.snapshot()).find(x=>x.id===runtime.windowId);assert.ok(model);
assert.equal(model.authorityPresentation?.authority,'fresh-exact');
assert.equal(model.reviewStart,113.638);
assert.equal(model.reviewEnd,116.338);
assert.equal(model.beforeState.pp,2);
assert.equal(model.afterState.pp,1);
assert.equal(model.beforeState.boardDamage,0);
assert.equal(model.afterState.boardDamage,3);
assert.equal(model.beforeState.time,113.638,'before-frame authority must be 113.638');
assert.equal(R.reviewAuthorityPlaybackStart(runtime.windowId),113.638,'playback authority must start from 113.638');
const html=R.renderDecisionWindowCard(model);
assert.match(html,/8T \/ 01:53\.6 → 01:56\.3/);
assert.match(html,/data-review-frame-time="113\.638"[^>]*data-review-frame-phase="before"/);
assert.match(html,/class="reviewCoach"/,'legacy coach policy remains independent when no comparison coach exists');
assert.doesNotMatch(html,/data-comparison-coach="1"/,'no comparison coach should be fabricated for a HOLD row');

// Original negative assertion: incomplete/stale authority must never rewrite the card.
runtime.runId='fresh-hold-2';runtime.nonce='nonce-hold-2';runtime.bindingMode='incomplete';
base=seed(runtime.runId,runtime.nonce);runtime.windowId=base.id;
C.decorate();
model=R.reviewWindowModels(R.snapshot()).find(x=>x.id===runtime.windowId);assert.ok(model);
assert.equal(model.authorityPresentation,null,'incomplete binding must not create an exact presentation');
assert.equal(model.reviewStart,115.888,'incomplete binding must retain ReplaySession base start');
assert.equal(model.beforeState.pp,1,'incomplete binding must retain base before-state PP');
assert.equal(R.reviewAuthorityPlaybackStart(runtime.windowId),null,'incomplete binding must not override playback authority');

console.log('P-F1-R2 AUTHORITY-ONLY PRESENTATION REGRESSION PASS');

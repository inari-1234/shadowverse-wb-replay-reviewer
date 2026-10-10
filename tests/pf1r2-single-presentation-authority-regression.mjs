import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const replaySource=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const coachSource=fs.readFileSync(new URL('../coach-integration.js',import.meta.url),'utf8');
const bindingSource=fs.readFileSync(new URL('../runtime-authority-binding.js',import.meta.url),'utf8');

assert.match(replaySource,/setAuthorityPresentation/,'ReplaySession must own the exact authority presentation');
assert.match(replaySource,/setComparisonCoachPresentation/,'ReplaySession must own the comparison coach presentation');
assert.match(replaySource,/clearAuthorityPresentations/,'ReplaySession must clear run-scoped presentation state');
assert.match(bindingSource,/function presentationForWindow/,'binding layer must expose exact capture presentation without writing ReplaySession states');
assert.match(coachSource,/setAuthorityPresentation/,'CoachIntegration must hand exact presentation into ReplaySession');
assert.match(coachSource,/setComparisonCoachPresentation/,'CoachIntegration must hand coach presentation into ReplaySession');
const decorate=(coachSource.match(/function decorate\(\)[\s\S]*?\nfunction scheduleDecorate/)||[])[0]||'';
assert.doesNotMatch(decorate,/querySelector|insertBefore|appendChild|\.hidden|textContent/,'CoachIntegration must no longer be a DOM source of truth');
const playbackStart=(replaySource.match(/function reviewAuthorityPlaybackStart\([\s\S]*?\nfunction updateReviewPlaybackUi/)||[])[0]||'';
assert.doesNotMatch(playbackStart,/querySelector|dataset/,'playback authority must come from the stored presentation model, never DOM');

const handlers=new Map();
const WB={
  videoMeta:{name:'09-23.mp4',size:1,lastModified:1},video:{currentTime:0,duration:200},turnTimeline:[],mulligan:null,classDetection:null,scenes:[],task:null,
  registerModule(){},videoKey(){return '09-23|1|1'},log(){},recordError(){},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},onReady(){},
  $(){return null},fmt:v=>Number(v).toFixed(1),escape:s=>String(s),pauseVideo(){},
  ReviewEngine:{activeProfile(){return 'none'},deriveWindowCoach(){return{facts:['legacy'],focus:['legacy'],cautions:['legacy'],judgementReason:'legacy hold'}},deriveCardUseCandidates(){return[]}}
};
const sandbox={window:{WB},console,structuredClone,Date,Promise,setTimeout,clearTimeout,URL,crypto:globalThis.crypto,requestAnimationFrame:fn=>fn()};
vm.createContext(sandbox);
new vm.Script(replaySource,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;
R.beginAnalysisRun({runId:'run-8',nonce:'nonce-8',startedAt:'2026-10-10T00:00:00.000Z'});
const cap=(time,pp,board)=>({at:'2026-10-10T00:00:00.000Z',captureMode:'timeline-lite',context:{time,turn:8,absoluteSide:'bottom',relativeSide:'自分'},confirmed:{time,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp,opponentHP:16,extraPP:'unknown',ep:'yes',sep:'unknown',opponentWard:'none',boardDamage:board,boardDamageKnown:true,hand:{recognized:{}}}});
R.ingestState(cap(113.638,2,0));
R.ingestState(cap(115.888,1,0));
R.ingestState(cap(116.338,1,3));
let snap=R.snapshot();
assert.ok(snap.decisionWindows.length>0,'fixture must create a Review Window');
const windowId=snap.decisionWindows.at(-1).id;
const anchor={id:'st:8:bottom:113.638',time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:2,opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'unknown'},opponentWard:'none',boardDamage:0,boardDamageKnown:true,hand:{recognized:{quickBlader:{known:true,count:1,confidence:.9221}}}};
const after={id:'st:8:bottom:116.338',time:116.338,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'unknown'},opponentWard:'none',boardDamage:3,boardDamageKnown:true,hand:{recognized:{}}};
const authority={version:'pf1r2-single-presentation-v1',authority:'fresh-exact',windowId,runId:'run-8',nonce:'nonce-8',reviewStart:113.638,reviewEnd:116.338,turn:8,beforeState:anchor,afterState:after};
const comparison={version:'pf1r2-single-presentation-v1',windowId,runId:'run-8',mode:'TRADE_OFF',claim:'HOLD',classification:'TRADE_OFF',headline:'候補ごとに異なる長所があるため、推奨手を1つに絞れません。',whyBest:[],alternativeDescription:'',alternativeReasons:[],reversalConditions:[],playedMoveComparison:{visible:false,status:'UNAVAILABLE',text:null,reasons:[]},cautions:['相手の手札など見えていない情報があります。見えている情報の範囲での比較です。'],evidenceSummary:[]};
assert.equal(R.setAuthorityPresentation(windowId,authority,{commit:false}),true);
assert.equal(R.setComparisonCoachPresentation(windowId,comparison,{commit:false}),true);
let model=R.reviewWindowModels(R.snapshot()).find(x=>x.id===windowId);
assert.ok(model);
assert.equal(model.reviewStart,113.638);
assert.equal(model.reviewEnd,116.338);
assert.equal(model.beforeState.pp,2);
assert.equal(model.afterState.pp,1);
assert.equal(model.afterState.boardDamage,3);
assert.equal(model.comparisonCoach?.classification,'TRADE_OFF');
assert.equal(model.coach,null,'legacy coach must not coexist with authoritative comparison coach');
const html=R.renderDecisionWindowCard(model);
assert.match(html,/comparisonCoach/,'ReplaySession renderer itself must render the new coach');
assert.match(html,/候補ごとに異なる長所/);
assert.doesNotMatch(html,/class="reviewCoach"/,'legacy coach must not be generated when authoritative coach exists');
assert.equal(R.reviewAuthorityPlaybackStart(windowId),113.638);
assert.equal(R.reviewPlaybackStart(model),113.638);

for(const name of ['timeline','review-profile-changed','postprocess-complete'])for(const fn of handlers.get(name)||[])fn(name==='timeline'?{timeline:[]}:{});
model=R.reviewWindowModels(R.snapshot()).find(x=>x.id===windowId);
assert.equal(model.reviewStart,113.638,'ordinary ReplaySession rerenders must retain exact authority');
assert.equal(model.comparisonCoach?.classification,'TRADE_OFF');
assert.ok(R.snapshot().states.every(x=>x.runId==='run-8'));

R.beginAnalysisRun({runId:'run-9',nonce:'nonce-9',startedAt:'2026-10-10T00:05:00.000Z'});
assert.equal(R.snapshot().authorityPresentations?.[windowId],undefined,'new run must clear old exact presentation');
assert.equal(R.snapshot().comparisonCoachPresentations?.[windowId],undefined,'new run must clear old coach presentation');

console.log('P-F1-R2 SINGLE PRESENTATION AUTHORITY REGRESSION PASS');

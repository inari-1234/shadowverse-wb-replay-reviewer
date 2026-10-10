import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../coach-integration.js',import.meta.url),'utf8');
const handlers=new Map();
const states=[
  {id:'st:8:bottom:113.638',time:113.638,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:2,opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'unknown'},opponentWard:'unknown',boardDamage:0,boardDamageKnown:true},
  {id:'st:8:bottom:115.888',time:115.888,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,resources:{extraPP:'unknown',ep:'unknown',sep:'unknown'},opponentWard:'unknown',boardDamage:0,boardDamageKnown:true},
  {id:'st:8:bottom:116.338',time:116.338,turn:8,absoluteSide:'bottom',relativeSide:'自分',pp:1,opponentHP:16,resources:{extraPP:'unknown',ep:'yes',sep:'yes'},opponentWard:'unknown',boardDamage:3,boardDamageKnown:true}
];
let currentRunId='fresh-1';
const session={analysisRun:{runId:'fresh-1',nonce:'nonce-1'},states:[states[1]],decisionWindows:[{id:'dw-8',reviewStart:115.888,reviewEnd:116.338,beforeState:states[1],afterState:states[2]}]};
const binding={runId:'fresh-1',nonce:'nonce-1',windowId:'dw-8',originalStateId:states[1].id,anchorStateId:states[0].id,anchorTime:113.638,afterStateId:states[2].id,afterTime:116.338,anchored:true,anchorExact:true,afterExact:true,complete:true,blocked:false};
const exactPresentation={version:'pf1r2-single-presentation-v1',authority:'fresh-exact',windowId:'dw-8',runId:'fresh-1',nonce:'nonce-1',anchored:true,reviewStart:113.638,reviewEnd:116.338,turn:8,beforeState:states[0],afterState:states[2],binding};
const storedAuthority=new Map(),storedCoach=new Map();
const WB={
  optionalModules:[],registerModule(){},recordError(){},log(){},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},onReady(){},
  ReplaySession:{snapshot(){return structuredClone({...session,analysisRun:{runId:currentRunId,nonce:'nonce-1'}})},setAuthorityPresentation(id,p){if(String(p?.runId||'')!==String(currentRunId))return false;storedAuthority.set(String(id),structuredClone(p));return true},setComparisonCoachPresentation(id,p){if(String(p?.runId||'')!==String(currentRunId))return false;storedCoach.set(String(id),structuredClone(p));return true},clearAuthorityPresentations(){storedAuthority.clear();storedCoach.clear();return true},commitAuthorityPresentations(){return true}},
  RuntimeAuthorityBinding:{presentationForWindow(windowId,runId){return windowId==='dw-8'&&runId==='fresh-1'&&currentRunId==='fresh-1'?structuredClone(exactPresentation):null},snapshot(){return{currentFreshRun:{runId:currentRunId},windowAuthorityBindings:[structuredClone(binding)]}}},
  CoachExplanation:{explainDecision(){return{mode:'TRADE_OFF',claim:'HOLD',classification:'TRADE_OFF',bestCandidateId:null,meaningfulAlternativeCandidateId:null,headline:'候補ごとに異なる長所があるため、推奨手を1つに絞れません。',whyBest:[],alternative:{candidateId:null,reasons:[],reversalConditions:[]},playedMoveComparison:{visible:false,status:'UNAVAILABLE',text:null,reasons:[]},cautions:['相手の手札など見えていない情報があります。見えている情報の範囲での比較です。'],evidenceSummary:[]}}},
  RuntimeDecisionPipeline:{snapshot(){return{items:[]}}}
};
const document={querySelector(){return null},querySelectorAll(){return[]},createElement(){return{dataset:{},className:'',children:[],appendChild(x){this.children.push(x)},insertBefore(x){this.children.push(x)},remove(){},querySelector(){return null},textContent:''}},head:{appendChild(){}}};
const sandbox={window:{WB,__wbReplaySessionV1:session},document,console,structuredClone,queueMicrotask(fn){fn()},setTimeout,clearTimeout,CSS:{escape:s=>s}};
vm.createContext(sandbox);new vm.Script(source,{filename:'coach-integration.js'}).runInContext(sandbox);
const C=WB.CoachIntegration;
assert.equal(C.presentationVersion,'pf1r2-single-presentation-v1');
assert.equal(typeof C.authorityPresentationForWindow,'function');
assert.equal(typeof C.applyAuthorityPresentation,'function');
assert.equal(typeof C.syncFromRuntime,'function');

const p=C.authorityPresentationForWindow('dw-8','fresh-1');
assert.ok(p,'complete exact fresh binding must create presentation');
assert.equal(p.reviewStart,113.638);
assert.equal(p.reviewEnd,116.338);
assert.equal(p.beforeState.pp,2);
assert.equal(p.afterState.pp,1);
assert.equal(p.beforeState.boardDamage,0);
assert.equal(p.afterState.boardDamage,3);
assert.equal(C.authorityPresentationForWindow('dw-8','wrong-run'),null,'stale run must not present');

assert.equal(C.applyAuthorityPresentation(null,p,{commit:false}),true,'compatibility binder must write the ReplaySession model rather than DOM');
assert.equal(storedAuthority.get('dw-8').reviewStart,113.638);
assert.equal(storedAuthority.get('dw-8').beforeState.pp,2);

// Simulate P-E2 loading after comparison-decision-ready was missed. The runtime result
// is recoverable only when its run still matches exact fresh authority.
const decision={status:'OK',classification:'TRADE_OFF',bestCandidateId:null,meaningfulAlternativeCandidateId:null,ranking:{pairwise:[]},reasonCodes:[]};
WB.RuntimeDecisionPipeline.snapshot=()=>({items:[{status:'OK',windowId:'dw-8',decision,playedMove:{status:'CONFIRMED'},sourceAuthority:'P-F1/P-D1/P-F1-R2-PM',meta:{runId:'fresh-1'},at:'2026-10-09T00:00:00.000Z'}]});
let sync=await C.syncFromRuntime('fresh-1');
assert.equal(sync.ingested,1,'same-run exact runtime row must backfill missed event');
assert.equal(C.getForWindow('dw-8').runId,'fresh-1');
C.decorate();
assert.equal(storedCoach.get('dw-8').classification,'TRADE_OFF');
assert.equal(storedAuthority.get('dw-8').authority,'fresh-exact');

C.clear();
currentRunId='fresh-2';
WB.RuntimeDecisionPipeline.snapshot=()=>({items:[{status:'OK',windowId:'dw-8',decision,playedMove:{status:'CONFIRMED'},sourceAuthority:'P-F1/P-D1/P-F1-R2-PM',meta:{runId:'stale-run'},at:'2026-10-09T00:00:00.000Z'}]});
sync=await C.syncFromRuntime();
assert.equal(sync.ingested,0,'stale runtime result must not cross fresh-run presentation boundary');
assert.equal(C.getForWindow('dw-8'),null);

const decorate=(source.match(/function decorate\(\)[\s\S]*?\nfunction scheduleDecorate/)||[])[0]||'';
assert.doesNotMatch(decorate,/querySelector|insertBefore|appendChild|\.hidden|textContent/,'live presentation must not patch Review Card DOM');

console.log('P-F1-R2 LIVE PRESENTATION REGRESSION PASS');

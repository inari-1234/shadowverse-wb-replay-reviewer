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
const session={states,decisionWindows:[{id:'dw-8',reviewStart:115.888,reviewEnd:116.338,beforeState:states[1],afterState:states[2]}]};
const binding={runId:'fresh-1',nonce:'nonce-1',windowId:'dw-8',originalStateId:states[1].id,anchorStateId:states[0].id,anchorTime:113.638,afterStateId:states[2].id,afterTime:116.338,anchored:true,anchorExact:true,afterExact:true,complete:true,blocked:false};

const WB={
  optionalModules:[],registerModule(){},recordError(){},log(){},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},onReady(){},
  fmt(v){const m=Math.floor(Number(v)/60),s=Number(v)-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`},
  ReplaySession:{snapshot(){return structuredClone(session)}},
  RuntimeAuthorityBinding:{bindingForWindow(windowId,runId){return windowId==='dw-8'&&runId==='fresh-1'?structuredClone(binding):null}},
  CoachExplanation:{explainDecision(){return{mode:'TRADE_OFF',claim:'HOLD',classification:'TRADE_OFF',bestCandidateId:null,meaningfulAlternativeCandidateId:null,headline:'候補ごとに異なる長所があるため、推奨手を1つに絞れません。',whyBest:[],alternative:{candidateId:null,reasons:[],reversalConditions:[]},playedMoveComparison:{visible:false},cautions:['相手の手札など見えていない情報があります。見えている情報の範囲での比較です。'],evidenceSummary:[]}}},
  RuntimeDecisionPipeline:{}
};
const document={querySelector(){return null},querySelectorAll(){return[]},createElement(){return{dataset:{},className:'',children:[],appendChild(x){this.children.push(x)},insertBefore(x){this.children.push(x)},remove(){},querySelector(){return null},textContent:''}},head:{appendChild(){}}};
const sandbox={window:{WB,__wbReplaySessionV1:session},document,console,structuredClone,queueMicrotask(fn){fn()},setTimeout,clearTimeout,CSS:{escape:s=>s}};
vm.createContext(sandbox);new vm.Script(source,{filename:'coach-integration.js'}).runInContext(sandbox);
const C=WB.CoachIntegration;
assert.equal(typeof C.authorityPresentationForWindow,'function','live presentation authority helper must exist');
assert.equal(typeof C.applyAuthorityPresentation,'function','live presentation DOM binder must exist');
assert.equal(typeof C.syncFromRuntime,'function','missed-event same-run runtime backfill must exist');

const p=C.authorityPresentationForWindow('dw-8','fresh-1');
assert.ok(p,'complete exact fresh binding must create presentation');
assert.equal(p.reviewStart,113.638);
assert.equal(p.reviewEnd,116.338);
assert.equal(p.beforeState.pp,2);
assert.equal(p.afterState.pp,1);
assert.equal(p.beforeState.boardDamage,0);
assert.equal(p.afterState.boardDamage,3);
assert.equal(C.authorityPresentationForWindow('dw-8','wrong-run'),null,'stale run must not present');

function valueCell(){return{textContent:'',className:''}}
const rows={pp:{children:[{},valueCell(),valueCell()]},boardDamage:{children:[{},valueCell(),valueCell()]},opponentHP:{children:[{},valueCell(),valueCell()]}};
const time={textContent:''},beforeBtn={dataset:{reviewFrameTime:'115.888'}},afterBtn={dataset:{reviewFrameTime:'116.338'}},oldCoach={hidden:false,dataset:{}},host={dataset:{},querySelector(sel){
  if(sel==='.reviewWindowTime')return time;
  if(sel==='[data-review-state-key="pp"]')return rows.pp;
  if(sel==='[data-review-state-key="boardDamage"]')return rows.boardDamage;
  if(sel==='[data-review-state-key="opponentHP"]')return rows.opponentHP;
  if(sel==='[data-review-frame-phase="before"]')return beforeBtn;
  if(sel==='[data-review-frame-phase="after"]')return afterBtn;
  if(sel==='.reviewCoach')return oldCoach;
  return null;
}};
C.applyAuthorityPresentation(host,p);
assert.equal(host.dataset.decisionAuthority,'fresh-exact');
assert.match(time.textContent,/8T \/ 01:53\.6 → 01:56\.3/);
assert.equal(rows.pp.children[1].textContent,'2');
assert.equal(rows.pp.children[2].textContent,'1');
assert.equal(rows.boardDamage.children[1].textContent,'0');
assert.equal(rows.boardDamage.children[2].textContent,'3');
assert.equal(beforeBtn.dataset.reviewFrameTime,'113.638');
assert.equal(afterBtn.dataset.reviewFrameTime,'116.338');

C.suppressLegacyCoach(host,true);
assert.equal(oldCoach.hidden,true,'authoritative comparison coach must suppress conflicting legacy hold coach');
C.suppressLegacyCoach(host,false);
assert.equal(oldCoach.hidden,false);

// Simulate P-E2 loading after comparison-decision-ready was missed. The runtime result
// is recoverable only when its run still matches an exact fresh binding.
const decision={status:'OK',classification:'TRADE_OFF',bestCandidateId:null,meaningfulAlternativeCandidateId:null,ranking:{pairwise:[]},reasonCodes:[]};
WB.RuntimeDecisionPipeline.snapshot=()=>({items:[{status:'OK',windowId:'dw-8',decision,playedMove:{status:'CONFIRMED'},sourceAuthority:'P-F1/P-D1/P-F1-R2-PM',meta:{runId:'fresh-1'},at:'2026-10-09T00:00:00.000Z'}]});
let sync=await C.syncFromRuntime('fresh-1');
assert.equal(sync.ingested,1,'same-run exact runtime row must backfill missed event');
assert.equal(C.getForWindow('dw-8').runId,'fresh-1');

C.clear();
WB.RuntimeDecisionPipeline.snapshot=()=>({items:[{status:'OK',windowId:'dw-8',decision,playedMove:{status:'CONFIRMED'},sourceAuthority:'P-F1/P-D1/P-F1-R2-PM',meta:{runId:'stale-run'},at:'2026-10-09T00:00:00.000Z'}]});
sync=await C.syncFromRuntime();
assert.equal(sync.ingested,0,'stale runtime result must not cross fresh-run presentation boundary');
assert.equal(C.getForWindow('dw-8'),null);

console.log('P-F1-R2 LIVE PRESENTATION REGRESSION PASS');

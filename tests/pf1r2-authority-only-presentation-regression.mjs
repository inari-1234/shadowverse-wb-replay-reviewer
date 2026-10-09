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
const binding={runId:'fresh-hold-1',nonce:'nonce-hold-1',windowId:'dw-8',originalStateId:states[1].id,anchorStateId:states[0].id,anchorTime:113.638,afterStateId:states[2].id,afterTime:116.338,anchored:true,anchorExact:true,afterExact:true,complete:true,blocked:false};
function valueCell(v=''){return{textContent:v,className:''}}
const rows={pp:{children:[{},valueCell('1'),valueCell('1')]},boardDamage:{children:[{},valueCell('0'),valueCell('3')]},opponentHP:{children:[{},valueCell('16'),valueCell('16')]}};
const time={textContent:'8T / 01:55.9 → 01:56.3'},beforeBtn={dataset:{reviewFrameTime:'115.888'}},afterBtn={dataset:{reviewFrameTime:'116.338'}},videoBtn={dataset:{}},oldCoach={hidden:false,dataset:{}};
const host={dataset:{},querySelector(sel){
  if(sel==='.reviewWindowTime')return time;
  if(sel==='[data-review-state-key="pp"]')return rows.pp;
  if(sel==='[data-review-state-key="boardDamage"]')return rows.boardDamage;
  if(sel==='[data-review-state-key="opponentHP"]')return rows.opponentHP;
  if(sel==='[data-review-frame-phase="before"]')return beforeBtn;
  if(sel==='[data-review-frame-phase="after"]')return afterBtn;
  if(sel==='[data-review-video-window]')return videoBtn;
  if(sel==='.reviewCoach')return oldCoach;
  if(sel==='[data-comparison-coach="1"]')return null;
  return null;
},appendChild(){},insertBefore(){}};
const WB={
  optionalModules:[],registerModule(){},recordError(){},log(){},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},emit(name,detail){for(const fn of handlers.get(name)||[])fn(detail)},onReady(){},
  fmt(v){const m=Math.floor(Number(v)/60),s=Number(v)-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`},
  ReplaySession:{snapshot(){return structuredClone(session)},setAuthorityPresentation(){}},
  RuntimeAuthorityBinding:{
    snapshot(){return{currentFreshRun:{runId:'fresh-hold-1',nonce:'nonce-hold-1'},windowAuthorityBindings:[structuredClone(binding)]}},
    bindingForWindow(windowId,runId){return windowId==='dw-8'&&runId==='fresh-hold-1'?structuredClone(binding):null}
  },
  CoachExplanation:{explainDecision(){throw new Error('comparison coach must not be needed for authority-only presentation')}},
  RuntimeDecisionPipeline:{snapshot(){return{items:[{status:'HOLD',windowId:'dw-8',reason:'NO_SEQUENCE_CANDIDATES',meta:{runId:'fresh-hold-1'}}]}}}
};
const document={
  querySelector(sel){if(sel==='[data-review-window-id="dw-8"]')return host;return null},
  querySelectorAll(){return[]},
  createElement(){return{dataset:{},className:'',children:[],appendChild(){},insertBefore(){},remove(){},querySelector(){return null},textContent:''}},head:{appendChild(){}}
};
const sandbox={window:{WB,__wbReplaySessionV1:session},document,console,structuredClone,queueMicrotask(fn){fn()},setTimeout,clearTimeout,CSS:{escape:s=>s}};
vm.createContext(sandbox);new vm.Script(source,{filename:'coach-integration.js'}).runInContext(sandbox);
const C=WB.CoachIntegration;
assert.equal(C.snapshot().count,0,'no P-D1 OK row should exist in this HOLD fixture');
const count=C.decorate();
assert.ok(count>=1,'exact fresh authority must decorate review card even when P-D1 is HOLD');
assert.equal(host.dataset.decisionAuthority,'fresh-exact');
assert.match(time.textContent,/8T \/ 01:53\.6 → 01:56\.3/);
assert.equal(rows.pp.children[1].textContent,'2');
assert.equal(rows.pp.children[2].textContent,'1');
assert.equal(rows.boardDamage.children[1].textContent,'0');
assert.equal(rows.boardDamage.children[2].textContent,'3');
assert.equal(beforeBtn.dataset.reviewFrameTime,'113.638');
assert.equal(videoBtn.dataset.reviewAuthorityStart,'113.638');
assert.equal(oldCoach.hidden,false,'legacy coach policy is independent when no comparison coach exists');

// Incomplete or stale bindings must never rewrite the card.
WB.RuntimeAuthorityBinding.snapshot=()=>({currentFreshRun:{runId:'fresh-hold-2'},windowAuthorityBindings:[{...binding,runId:'fresh-hold-2',complete:false,anchorExact:false}]});
time.textContent='8T / 01:55.9 → 01:56.3';rows.pp.children[1].textContent='1';delete host.dataset.decisionAuthority;
C.decorate();
assert.equal(host.dataset.decisionAuthority,undefined);
assert.equal(time.textContent,'8T / 01:55.9 → 01:56.3');
assert.equal(rows.pp.children[1].textContent,'1');

console.log('P-F1-R2 AUTHORITY-ONLY PRESENTATION REGRESSION PASS');

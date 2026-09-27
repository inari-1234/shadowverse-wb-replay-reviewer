import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const store={};
const WB={
  registerModule(){},onReady(){},videoMeta:null,video:null,currentTurnContext:()=>({turn:1}),
  $(){return null},escape:s=>String(s),recordError(){},log(){},videoKey:()=> 'candidate-test',on(){}
};
const sandbox={
  window:{WB},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},
  atob:s=>Buffer.from(s,'base64').toString('binary'),Float32Array,Map,
  console,document:{querySelectorAll:()=>[]}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../card-db.js',import.meta.url),'utf8')).runInContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8')).runInContext(sandbox);
const R=WB.ReviewEngine;

assert.equal(R.version,'review-clean-1.8.0');

const state=(time,turn,pp,recognized={},side='自分')=>({
  id:`st:${turn}:bottom:${Number(time).toFixed(3)}`,time,turn,relativeSide:side,absoluteSide:'bottom',pp,
  opponentHP:20,resources:{extraPP:'unknown',ep:'yes',sep:'no'},opponentWard:'unknown',
  boardDamage:0,boardDamageKnown:true,hand:{recognized}
});
const model=({id='dw:test',turn=5,start=47.641,end=48.091,fromPp=2,toPp=1,recognized={},side='自分',changes=null}={})=>({
  id,turn,reviewStart:start,reviewEnd:end,
  beforeState:state(start,turn,fromPp,recognized,side),
  afterState:state(end,turn,toPp,{},side),
  observedChanges:changes??[{type:'pp-change',data:{from:fromPp,to:toPp,delta:toPp-fromPp}}],
  unknownFields:['extraPP','opponentWard'],unresolved:['同一行動か','使用カード','効果源・ダメージ源','行動順']
});

const quick={quickBlader:{id:'quickBlader',label:'刹那のクイックブレイダー',count:1,confidence:.95}};
const q=R.deriveCardUseCandidates(model({recognized:quick}));
assert.equal(q.length,1,'high-confidence before-hand recognition + exact PP spend must create one candidate');
assert.equal(q[0].cardId,'quickBlader');
assert.equal(q[0].status,'candidate-only');
assert.equal(q[0].confirmed,false);
assert.equal(q[0].createsAction,false);
assert.equal(q[0].evidenceCount,2);
assert.deepEqual(Array.from(q[0].evidence.map(x=>x.type)),['positive-before-hand-recognition','same-window-pp-spend-match']);
assert.equal(q[0].evidence[1].spent,1);
assert.equal(q[0].afterAbsenceUsed,false);
assert.equal(q[0].pastHandTraceUsed,false);
assert.equal(q[0].effectAttributionUsed,false);
assert.equal(q[0].causalAttribution,false);
assert.equal(q[0].cardAttribution,'candidate-only');
assert.ok(q[0].warning.includes('確定ではなく'));

assert.equal(R.deriveCardUseCandidates(model({recognized:{quickBlader:{...quick.quickBlader,confidence:.899}}})).length,0,'below candidate threshold must not identify a card');
assert.equal(R.deriveCardUseCandidates(model({recognized:quick,fromPp:2,toPp:0})).length,0,'PP spend mismatch must not identify Quick');
assert.equal(R.deriveCardUseCandidates(model({recognized:quick,changes:[{type:'board-damage-change',data:{from:0,to:1,delta:1}}]})).length,0,'no same-window PP spend must produce no card candidate');
assert.equal(R.deriveCardUseCandidates(model({recognized:quick,start:44,end:47.1})).length,0,'window longer than 3 seconds must not produce a candidate');
assert.equal(R.deriveCardUseCandidates(model({recognized:quick,side:'相手'})).length,0,'opponent-side window must not produce a candidate');

const zeta={zetaBeatrix:{id:'zetaBeatrix',label:'ゼタ＆ベアトリクス',count:1,confidence:.95}};
const z=R.deriveCardUseCandidates(model({turn:6,start:60,end:61,fromPp:6,toPp:0,recognized:zeta}));
assert.equal(z.length,1,'Zeta enhance cost 6 must be recognized as an accepted-cost candidate');
assert.equal(z[0].cardId,'zetaBeatrix');
assert.deepEqual(Array.from(z[0].evidence[1].acceptedCosts),[4,6]);

const originalRecognitionCards=WB.CardDB.recognitionCards;
WB.CardDB.recognitionCards=()=>[...originalRecognitionCards(),{id:'dummyOne',label:'同コスト候補',expectedCost:1,acceptedCosts:[1],threshold:.9,candidateThreshold:.9}];
const ambiguous=R.deriveCardUseCandidates(model({recognized:{
  ...quick,dummyOne:{id:'dummyOne',label:'同コスト候補',count:1,confidence:.95}
}}));
assert.equal(ambiguous.length,0,'multiple positively observed same-cost candidates must remain unresolved');
WB.CardDB.recognitionCards=originalRecognitionCards;

// v4.13.90 real-device six Decision Windows: no positive recognized card exists in either endpoint.
// Phase 18 must therefore produce zero candidates rather than naming a card from PP/HP/board changes alone.
const real=[
  model({id:'dw:44.941-47.641',turn:5,start:44.941,end:47.641,fromPp:2,toPp:2,recognized:{},changes:[{type:'board-damage-change',data:{from:0,to:4,delta:4}}]}),
  model({id:'dw:47.641-48.091',turn:5,start:47.641,end:48.091,fromPp:2,toPp:1,recognized:{},changes:[{type:'pp-change',data:{from:2,to:1,delta:-1}},{type:'board-damage-change',data:{from:4,to:0,delta:-4}}]}),
  model({id:'dw:49.441-51.241',turn:5,start:49.441,end:51.241,fromPp:0,toPp:0,recognized:{},changes:[{type:'opponent-hp-change',data:{from:20,to:16,delta:-4}}]}),
  model({id:'dw:63.820-66.520',turn:6,start:63.82,end:66.52,fromPp:0,toPp:0,recognized:{},changes:[{type:'opponent-hp-change',data:{from:16,to:11,delta:-5}}]}),
  model({id:'dw:79.095-81.795',turn:7,start:79.095,end:81.795,fromPp:2,toPp:2,recognized:{},changes:[{type:'opponent-hp-change',data:{from:14,to:12,delta:-2}}]}),
  model({id:'dw:85.395-88.095',turn:7,start:85.395,end:88.095,fromPp:2,toPp:2,recognized:{},changes:[{type:'opponent-hp-change',data:{from:12,to:10,delta:-2}}]})
];
const report=R.deriveCardUseCandidateReport(real);
assert.equal(report.version,'card-use-candidate-v1');
assert.equal(report.count,0,'v4.13.90 real-device Decision Windows must produce zero candidate cards');
assert.equal(report.items.length,0);

const review=fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8');
const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
assert.equal(review.includes("'card-play'"),false);
assert.equal(replay.includes("'card-play'"),false);
assert.ok(review.includes("afterAbsenceUsed:false,pastHandTraceUsed:false,effectAttributionUsed:false"));

console.log('CARD USE CANDIDATE REGRESSION PASS');

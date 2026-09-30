import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const store={};
const review=fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8');
const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const WB={
  registerModule(){},onReady(){},videoMeta:null,video:null,currentTurnContext:()=>({turn:6}),
  $(){return null},escape:s=>String(s),recordError(){},log(){},videoKey:()=> 'ui-opt4b-test',on(){}
};
const sandbox={
  window:{WB},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},
  atob:s=>Buffer.from(s,'base64').toString('binary'),Float32Array,Map,
  console,document:{querySelectorAll:()=>[]}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../card-db.js',import.meta.url),'utf8')).runInContext(sandbox);
new vm.Script(review).runInContext(sandbox);

const model={
  id:'dw:ui-opt4b',turn:6,reviewStart:72.3,reviewEnd:74.1,
  beforeState:{pp:6,opponentHP:18,opponentWard:'present',boardDamage:null,boardDamageKnown:false},
  afterState:{pp:0,opponentHP:15,opponentWard:'present',boardDamage:null,boardDamageKnown:false},
  observedChanges:[
    {type:'opponent-hp-change',data:{from:18,to:15,delta:-3}},
    {type:'pp-change',data:{from:6,to:0,delta:-6}}
  ],
  unknownFields:['boardDamage'],
  unresolved:['同一行動か','使用カード','効果源・ダメージ源','行動順']
};
const coach=WB.ReviewEngine.deriveWindowCoach(model);
assert.equal(coach.structure,'facts-thinking-unknown-v1');
assert.equal(coach.basis,'observation-only');
assert.equal(coach.deckSpecific,false);
assert.equal(coach.usesCurrentHand,false);
assert.equal(coach.judgement,'hold');
assert.equal(coach.causalAttribution,false);
assert.equal(coach.cardAttribution,false);
for(const fact of ['相手HP 18 → 15','PP 6 → 0','相手守護 あり確認','変化後の盤面打点は未確認']){
  assert.ok(coach.facts.includes(fact),`grounded observed fact missing: ${fact}`);
}
assert.ok(coach.focus.some(x=>x.includes('残りHP 15')),'thinking point must use the observed remaining HP');
assert.ok(coach.focus.some(x=>x.includes('残りPP 0')),'thinking point must use the observed PP change');
assert.ok(coach.cautions.some(x=>x.includes('使用カード')&&x.includes('行動順')),'causal unknowns must remain explicit');
assert.ok(coach.cautions.some(x=>x.includes('盤面打点')),'unknown observed fields must remain explicit');
assert.ok(coach.judgementReason.includes('プレイの良否を断定しません'));
assert.ok(coach.judgementReason.includes('最善手も断定しません'));

const serialized=JSON.stringify(coach);
for(const forbidden of ['刹那のクイックブレイダー','ゼタ＆ベアトリクス','バルバロス','card-play']){
  assert.equal(serialized.includes(forbidden),false,`generic coach must not invent deck/card detail: ${forbidden}`);
}

const start=replay.indexOf('function renderWindowCoach(coach)');
const end=replay.indexOf('function renderCardUseCandidates',start);
const renderer=replay.slice(start,end);
const rendered=renderer.slice(renderer.indexOf('return`<details'));
for(const heading of ['観測事実','考えるポイント','まだ判断できないこと','評価保留']){
  assert.ok(rendered.includes(heading),`three-layer coach heading missing: ${heading}`);
}
assert.ok(rendered.indexOf('観測事実')<rendered.indexOf('考えるポイント'));
assert.ok(rendered.indexOf('考えるポイント')<rendered.indexOf('まだ判断できないこと'));
assert.ok(renderer.includes('class="reviewCoach" open'),'tactical coach must be visible by default');
assert.equal(renderer.includes('<b>確認質問</b>'),false,'questions must be folded into the thinking layer rather than adding a fourth layer');
assert.ok(review.includes("structure:'facts-thinking-unknown-v1'"));

console.log('UI OPT4B REGRESSION PASS');

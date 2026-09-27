import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const store={};
const WB={
  registerModule(){},onReady(){},videoMeta:null,video:null,currentTurnContext:()=>({turn:1}),
  $(){return null},escape:s=>String(s),recordError(){},log(){},videoKey:()=> 'coach-test',on(){}
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

const mk=(id,turn,start,end,changes,before,after,unknown=[])=>({
  id,turn,reviewStart:start,reviewEnd:end,observedChanges:changes,beforeState:before,afterState:after,
  unknownFields:unknown,unresolved:['同一行動か','使用カード','効果源・ダメージ源','行動順']
});

// Exact six v4.13.89 Decision Window times; only observation-backed fields are included.
const models=[
  mk('dw:44.941-47.641',5,44.941,47.641,
    [{type:'board-damage-change',data:{from:0,to:4,delta:4}}],
    {pp:2,opponentHP:20,opponentWard:'unknown',boardDamage:0,boardDamageKnown:true},
    {pp:2,opponentHP:20,opponentWard:'unknown',boardDamage:4,boardDamageKnown:true},
    ['extraPP','opponentWard']),
  mk('dw:47.641-48.091',5,47.641,48.091,
    [{type:'pp-change',data:{from:2,to:1,delta:-1}},{type:'board-damage-change',data:{from:4,to:0,delta:-4}}],
    {pp:2,opponentHP:20,opponentWard:'unknown',boardDamage:4,boardDamageKnown:true},
    {pp:1,opponentHP:20,opponentWard:'unknown',boardDamage:0,boardDamageKnown:true},
    ['extraPP','opponentWard']),
  mk('dw:49.441-51.241',5,49.441,51.241,
    [{type:'opponent-hp-change',data:{from:20,to:16,delta:-4}}],
    {pp:0,opponentHP:20,opponentWard:'unknown',boardDamage:null,boardDamageKnown:false},
    {pp:0,opponentHP:16,opponentWard:'unknown',boardDamage:null,boardDamageKnown:false},
    ['ep','opponentWard','boardDamage']),
  mk('dw:63.820-66.520',6,63.82,66.52,
    [{type:'opponent-hp-change',data:{from:16,to:11,delta:-5}}],
    {pp:0,opponentHP:16,opponentWard:'unknown',boardDamage:null,boardDamageKnown:false},
    {pp:0,opponentHP:11,opponentWard:'unknown',boardDamage:null,boardDamageKnown:false},
    ['opponentWard','boardDamage']),
  mk('dw:79.095-81.795',7,79.095,81.795,
    [{type:'opponent-hp-change',data:{from:14,to:12,delta:-2}}],
    {pp:7,opponentHP:14,opponentWard:'unknown',boardDamage:null,boardDamageKnown:false},
    {pp:7,opponentHP:12,opponentWard:'unknown',boardDamage:null,boardDamageKnown:false},
    ['opponentWard','boardDamage']),
  mk('dw:85.395-88.095',7,85.395,88.095,
    [{type:'opponent-hp-change',data:{from:12,to:10,delta:-2}}],
    {pp:0,opponentHP:12,opponentWard:'unknown',boardDamage:null,boardDamageKnown:false},
    {pp:0,opponentHP:10,opponentWard:'unknown',boardDamage:null,boardDamageKnown:false},
    ['opponentWard','boardDamage'])
];

const coaches=R.deriveWindowCoaches(models);
assert.equal(coaches.length,6,'all six real-device Decision Windows must receive a generic coach');
for(const c of coaches){
  assert.equal(c.version,'review-window-coach-v1');
  assert.equal(c.basis,'observation-only');
  assert.equal(c.deckSpecific,false);
  assert.equal(c.usesCurrentHand,false);
  assert.equal(c.judgement,'hold');
  assert.equal(c.causalAttribution,false);
  assert.equal(c.cardAttribution,false);
  assert.ok(c.focus.length>=1);
  assert.ok(c.questions.length>=1);
  assert.ok(c.judgementReason.includes('プレイの良否を断定しません'));
}

assert.ok(coaches[0].summary.includes('攻撃可能打点が増えた'));
assert.ok(coaches[0].focus.some(x=>x.includes('0 → 4')));
assert.ok(coaches[1].focus.some(x=>x.includes('PPが 2 → 1')));
assert.ok(coaches[1].focus.some(x=>x.includes('4 → 0')));
assert.ok(coaches[1].cautions.some(x=>x.includes('同一カード・同一行動')));
assert.ok(coaches[2].summary.includes('相手HPが減った'));
assert.ok(coaches[2].focus.some(x=>x.includes('20 → 16')));
assert.ok(coaches[2].cautions.some(x=>x.includes('相手守護')&&x.includes('盤面打点')));

const combined=JSON.stringify(coaches);
for(const forbidden of ['刹那のクイックブレイダー','ゼタ＆ベアトリクス','バルバロス','card-play']){
  assert.equal(combined.includes(forbidden),false,`generic coach must not invent deck/card specifics: ${forbidden}`);
}

// A fully observed board-lethal shape may be raised only as a candidate to re-check, never as a declared best move.
const candidate=R.deriveWindowCoach(mk('dw:lethal-candidate',8,90,91,
  [{type:'board-damage-change',data:{from:3,to:6,delta:3}}],
  {pp:3,opponentHP:5,opponentWard:'none',boardDamage:3,boardDamageKnown:true},
  {pp:3,opponentHP:5,opponentWard:'none',boardDamage:6,boardDamageKnown:true},
  []));
assert.ok(candidate.focus.some(x=>x.includes('リーサル候補')&&x.includes('再確認')));
assert.equal(candidate.judgement,'hold');
assert.equal(candidate.cardAttribution,false);

console.log('REVIEW WINDOW COACH REGRESSION PASS');

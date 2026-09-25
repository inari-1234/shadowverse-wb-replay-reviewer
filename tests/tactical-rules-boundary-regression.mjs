import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const cardSource=fs.readFileSync(new URL('../card-db.js',import.meta.url),'utf8');
const reviewSource=fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8');

const store={};
const WB={
  registerModule(){},onReady(){},videoMeta:null,video:null,currentTurnContext:()=>({turn:1}),
  $(){return null},escape:s=>String(s),recordError(){},log(){},videoKey:()=> 'test',on(){}
};
const sandbox={
  window:{WB},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},
  atob:s=>Buffer.from(s,'base64').toString('binary'),Float32Array,Map,
  console,document:{querySelectorAll:()=>[]}
};
vm.createContext(sandbox);
new vm.Script(cardSource).runInContext(sandbox);
new vm.Script(reviewSource).runInContext(sandbox);

const R=WB.ReviewEngine;
const quick=WB.CardDB.get('quickBlader');
const zeta=WB.CardDB.get('zetaBeatrix');
const barbaros=WB.CardDB.get('barbaros');

assert.equal('route' in quick,false,'Quick tactical route must not live in card DB');
assert.equal('route' in zeta,false,'Zeta tactical route must not live in card DB');
assert.equal('route' in barbaros,false,'Barbaros tactical route must not live in card DB');

assert.equal(R.ruleset.id,'sea-pirate-royal-runtime-v1');
assert.deepEqual(JSON.parse(JSON.stringify(R.ruleset.cards.quickBlader)),{type:'storm',cost:1,baseDamage:1,evolveBonus:2,superBonus:3});
assert.deepEqual(JSON.parse(JSON.stringify(R.ruleset.cards.zetaBeatrix)),{type:'enhance-storm',cost:6,baseDamage:3,evolveBonus:2,superBonus:3});
assert.deepEqual(JSON.parse(JSON.stringify(R.ruleset.cards.barbaros)),{type:'pirate-flag-finisher',cost:7,baseDamage:4,evolveBonus:2,superBonus:3,flagBreakAtOrBelow:5,flagDamage:2});

const tactical=(quickCount=0,zetaCount=0,barCount=0,flags=[])=>({
  version:'tactical-v1',
  cards:{
    quickBlader:{known:true,count:quickCount},
    zetaBeatrix:{known:true,count:zetaCount},
    barbaros:{known:true,count:barCount}
  },
  resources:{
    pirateFlags:{known:true,values:flags},
    otherConfirmedDamage:{known:true,value:0},
    damageRoutesChecked:true
  }
});
const mk=(over={})=>({
  turn:7,opponentHP:20,pp:7,extraPP:'no',ep:'no',sep:'no',opponentWard:'none',
  knownBoardLeaderDamage:0,boardDamageKnown:true,
  otherConfirmedLeaderDamage:0,otherDamageKnown:true,
  tactical:tactical(),hand:{otherDamageRoutesChecked:true},...over
});

let x=R.calculate(mk({opponentHP:1,pp:1,tactical:tactical(1,0,0,[])}),'sea-pirate-royal');
assert.ok(x.lethalRoutes.some(v=>v.includes('クイックブレイダー')));

x=R.calculate(mk({opponentHP:3,pp:6,tactical:tactical(0,1,0,[])}),'sea-pirate-royal');
assert.ok(x.lethalRoutes.some(v=>v.includes('ゼタ＆ベアトリクス')));

x=R.calculate(mk({opponentHP:6,pp:7,tactical:tactical(0,0,1,[5])}),'sea-pirate-royal');
assert.ok(x.lethalRoutes.some(v=>v.includes('バルバロス')));
assert.ok(x.routes.some(r=>r.cardId==='barbaros'&&r.damage===6));

assert.equal(cardSource.includes("route:{type:'storm'"),false,'recognition card DB source must not define tactical storm routes');
assert.ok(reviewSource.includes('const SEA_PIRATE_RULESET=Object.freeze'),'ReviewEngine must own the runtime tactical ruleset');

console.log('TACTICAL RULES BOUNDARY REGRESSION PASS');

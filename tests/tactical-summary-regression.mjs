import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const store={};
const WB={
  registerModule(){},onReady(){},videoMeta:null,video:null,currentTurnContext:()=>({turn:1}),
  $(){return null},escape:s=>String(s),recordError(){},log(){},videoKey:()=> 'test',on(){}
};
const sandbox={
  window:{WB},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},
  console,document:{querySelectorAll:()=>[]}
};
vm.createContext(sandbox);
new vm.Script(fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8')).runInContext(sandbox);
const R=WB.ReviewEngine;

const tactical=(quick=1,bar=0,zeta=0,flagsKnown=false)=>({
  version:'tactical-v1',
  cards:{
    barbaros:{known:true,count:bar},
    zetaBeatrix:{known:true,count:zeta},
    quickBlader:{known:true,count:quick}
  },
  resources:{
    pirateFlags:{known:flagsKnown,values:[]},
    otherConfirmedDamage:{known:true,value:0},
    damageRoutesChecked:true
  }
});
const mk=(over={})=>({
  turn:2,opponentHP:1,pp:1,extraPP:'no',ep:'no',sep:'no',opponentWard:'none',
  knownBoardLeaderDamage:0,boardDamageKnown:true,
  otherConfirmedLeaderDamage:0,otherDamageKnown:true,
  tactical:tactical(),hand:{otherDamageRoutesChecked:true},...over
});

let x=R.calculate(mk());
assert.equal(x.status,'confirmed-lethal');
assert.ok(x.lethalRoutes.some(n=>n.includes('クイックブレイダー')));

x=R.calculate(mk({opponentWard:'present'}));
assert.equal(x.lethalRoutes.length,0);
assert.ok(x.routes.some(r=>r.cardId==='quickBlader'&&r.damage===1));

const tUnknown=tactical();
tUnknown.cards.quickBlader={known:false,count:null};
x=R.calculate(mk({tactical:tUnknown}));
assert.equal(x.status,'incomplete-do-not-declare-no-lethal');
assert.ok(x.unknown.some(v=>v.includes('クイックブレイダー')));

x=R.calculate(mk());
assert.ok(!x.unknown.includes('海賊旗カウント'));

x=R.calculate(mk({tactical:tactical(0,1,0,false)}));
assert.ok(x.unknown.includes('海賊旗カウント'));

x=R.calculate(mk({opponentHP:2,pp:2,tactical:tactical(2)}));
assert.ok(x.lethalRoutes.some(n=>n.includes('×2')));

const legacy={
  turn:7,opponentHP:4,pp:7,extraPP:'no',ep:'no',sep:'no',opponentWard:'none',
  pirateFlagCountdowns:[],pirateFlagsKnown:true,
  knownBoardLeaderDamage:0,boardDamageKnown:true,
  otherConfirmedLeaderDamage:0,otherDamageKnown:true,
  hand:{barbaros:'have',zetaBeatrix:'none',otherDamageRoutesChecked:true}
};
x=R.calculate(legacy);
assert.ok(x.routes.some(r=>r.name==='バルバロス'));
assert.equal(x.status,'incomplete-do-not-declare-no-lethal');
assert.ok(x.unknown.some(v=>v.includes('クイックブレイダー')));

assert.equal(R.catalog.cards.some(c=>c.id==='quickBlader'&&c.route?.type==='storm'&&c.route.cost===1&&c.route.baseDamage===1),true);
console.log('TACTICAL SUMMARY REGRESSION PASS');

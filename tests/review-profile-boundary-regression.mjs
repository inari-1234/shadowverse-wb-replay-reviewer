import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const store={};
const elements={
  '#reviewProfile':{value:'none'}
};
const WB={
  registerModule(){},onReady(){},videoMeta:null,video:null,currentTurnContext:()=>({turn:2}),
  $:s=>elements[s]??null,escape:s=>String(s),recordError(){},log(){},videoKey:()=> 'profile-test',on(){}
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

assert.equal(R.activeProfile(),'none');
assert.equal(R.profileEnabled(),false);
assert.equal(R.profiles.none.tactical,false);
assert.equal(R.profiles['sea-pirate-royal'].tactical,true);

const tactical={
  version:'tactical-v1',
  cards:{
    barbaros:{known:true,count:0},
    zetaBeatrix:{known:true,count:0},
    quickBlader:{known:true,count:1}
  },
  resources:{
    pirateFlags:{known:true,values:[]},
    otherConfirmedDamage:{known:true,value:0},
    damageRoutesChecked:true
  }
};
const state={
  turn:2,opponentHP:1,pp:1,extraPP:'no',ep:'no',sep:'no',opponentWard:'none',
  knownBoardLeaderDamage:0,boardDamageKnown:true,
  otherConfirmedLeaderDamage:0,otherDamageKnown:true,
  tactical,hand:{otherDamageRoutesChecked:true}
};

let x=R.calculate(state);
assert.equal(x.status,'profile-disabled');
assert.equal(x.reviewProfile,'none');
assert.deepEqual(Array.from(x.routes),[]);
assert.deepEqual(Array.from(x.lethalRoutes),[]);

const applied=R.applyDetectedHand({recognized:{quickBlader:{known:true,count:1,confidence:.99}}});
assert.deepEqual(Array.from(applied.applied),[]);
assert.equal(applied.reviewProfile,'none');
assert.equal(WB.tacticalHandRecognition.recognized.quickBlader.count,1);

elements['#reviewProfile'].value='sea-pirate-royal';
assert.equal(R.activeProfile(),'sea-pirate-royal');
assert.equal(R.profileEnabled(),true);
x=R.calculate(state);
assert.equal(x.status,'confirmed-lethal');
assert.equal(x.reviewProfile,'sea-pirate-royal');
assert.ok(x.lethalRoutes.some(v=>v.includes('クイックブレイダー')));

assert.ok(index.includes('<option value="none" selected>使用しない（状態確認のみ）</option>'));
assert.ok(index.includes('使用デッキ（記録用）'));
assert.ok(index.includes('戦術レビューの切替には使用しません'));
assert.ok(index.includes('後から得た公開情報を自動遮断する仕組みではありません'));
assert.ok(index.includes('<details class="panel" id="diagnosticsPanel">'));

console.log('REVIEW PROFILE BOUNDARY REGRESSION PASS');

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

const WB={
  videoMeta:null,turnTimeline:[],mulligan:null,classDetection:null,scenes:[],
  registerModule(){},videoKey(){return 'ui-fixture'},log(){},recordError(){},on(){},onReady(){},
  $(){return null},fmt:v=>Number(v).toFixed(1)+'s',
  escape:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,URL,Date,Promise};
vm.createContext(sandbox);
new vm.Script(replay,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

assert.equal(R.version,'replay-session-clean-1.8');

const before={
  id:'st:5:bottom:47.641',time:47.641,turn:5,absoluteSide:'bottom',relativeSide:'自分',
  pp:2,opponentHP:20,resources:{extraPP:'unknown',ep:'yes',sep:'no'},
  opponentWard:'unknown',boardDamage:4,boardDamageKnown:true,hand:{recognized:{}}
};
const after={
  id:'st:5:bottom:48.091',time:48.091,turn:5,absoluteSide:'bottom',relativeSide:'自分',
  pp:1,opponentHP:20,resources:{extraPP:'unknown',ep:'yes',sep:'no'},
  opponentWard:'unknown',boardDamage:0,boardDamageKnown:true,hand:{recognized:{}}
};
const session={
  decisionWindows:[{
    id:'dw:test',kind:'decision-window',reviewStart:47.641,reviewEnd:48.091,time:48.091,turn:5,
    beforeState:before,afterState:after,
    observedChanges:[
      {actionId:'a:pp',type:'pp-change',confidence:'observed',data:{from:2,to:1,delta:-1}},
      {actionId:'a:board',type:'board-damage-change',confidence:'observed',data:{from:4,to:0,delta:-4}}
    ],
    importanceReasons:['攻撃可能打点 4 → 0'],confidence:'observed',
    unknownFields:['extraPP','opponentWard'],reviewPointIds:['rp:board','rp:also-same-window'],
    causalAttribution:false,unresolved:['同一行動か','使用カード','効果源・ダメージ源','行動順']
  }],
  observationReviewPoints:[
    {id:'rp:board',turn:5,priority:'medium',title:'盤面打点の大きな変化'},
    {id:'rp:also-same-window',turn:5,priority:'high',title:'同一区間の別候補'}
  ]
};

const models=R.reviewWindowModels(session);
assert.equal(models.length,1,'one Decision Window must render as one review card even when multiple ReviewPoints share it');
assert.equal(models[0].causalAttribution,false);
assert.equal(models[0].beforeRows.find(x=>x.key==='pp').value,'2');
assert.equal(models[0].afterRows.find(x=>x.key==='pp').value,'1');
assert.equal(models[0].beforeRows.find(x=>x.key==='extraPP').value,'未確認');
assert.deepEqual(Array.from(models[0].unknownFields),['extraPP','opponentWard']);

const html=R.renderDecisionWindowCard(models[0]);
for(const phrase of ['判断直前','変化後','観測した変化','重要とした理由','未確認: ExPP / 相手守護','断定していない項目','PP 2 → 1','盤面打点 4 → 0']){
  assert.ok(html.includes(phrase),`review card must include: ${phrase}`);
}
assert.ok(html.includes('使用カード'),'unresolved card identity must be shown only as not determined');
assert.equal(html.includes('使用カード:'),false,'UI must not invent a specific played card');
assert.equal(html.includes('効果源:'),false,'UI must not invent a specific causal source');
assert.ok(index.includes('Decision Windowごとに「判断直前」「変化後」「観測した変化」「重要とした理由」「未確認項目」'));
assert.ok(index.includes('使用カード・効果源・行動順を推定しません'));
assert.ok(index.includes('.reviewStateGrid,.reviewWindowGrid'));
assert.ok(replay.includes("reviewWindowUi:'before-after-observed-importance-unknown-noncausal'"));
assert.ok(replay.includes('causalAttribution:false'));
assert.equal(replay.includes("'card-play'"),false);

console.log('REVIEW WINDOW UI REGRESSION PASS');

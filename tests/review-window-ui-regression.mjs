import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

const WB={
  videoMeta:null,turnTimeline:[],mulligan:null,classDetection:null,scenes:[],
  registerModule(){},videoKey(){return 'ui-fixture'},log(){},recordError(){},on(){},onReady(){},
  ReviewEngine:{deriveWindowCoach(model){return{version:'review-window-coach-v1',basis:'observation-only',summary:'盤面とPPの変化を重点確認します。',focus:['PPと盤面打点を見比べる。'],questions:['別の手順を残せたか？'],cautions:['同一カード・同一行動とは結び付けません。'],judgement:'hold',judgementReason:'観測だけではプレイの良否を断定しません。',causalAttribution:false,cardAttribution:false}}},
  $(){return null},fmt:v=>Number(v).toFixed(1)+'s',
  escape:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,URL,Date,Promise};
vm.createContext(sandbox);
new vm.Script(replay,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

assert.equal(R.version,'replay-session-clean-1.10');

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
assert.equal(models[0].beforeRows.find(x=>x.key==='pp').changed,true,'PP row must be visually marked because an observed PP change exists');
assert.equal(models[0].beforeRows.find(x=>x.key==='boardDamage').changed,true,'board row must be visually marked because an observed board change exists');
assert.equal(models[0].beforeRows.find(x=>x.key==='opponentHP').changed,false,'unchanged HP must not be highlighted');
assert.deepEqual(Array.from(models[0].unknownFields),['extraPP','opponentWard']);
assert.equal(models[0].coach.version,'review-window-coach-v1');
assert.equal(models[0].coach.basis,'observation-only');
assert.equal(models[0].coach.causalAttribution,false);
assert.equal(models[0].coach.cardAttribution,false);

const html=R.renderDecisionWindowCard(models[0]);
for(const phrase of ['判断直前','変化後','観測した変化','重要とした理由','未確認: ExPP / 相手守護','断定していない項目','PP 2 → 1','盤面打点 4 → 0']){
  assert.ok(html.includes(phrase),`review card must include: ${phrase}`);
}
assert.ok(html.includes('使用カード'),'unresolved card identity must be shown only as not determined');
assert.equal(html.includes('使用カード:'),false,'UI must not invent a specific played card');
assert.equal(html.includes('効果源:'),false,'UI must not invent a specific causal source');
assert.ok(html.includes('data-review-time="47.641"')&&html.includes('判断直前を見る'),'review card must provide a direct before-state video navigation control');
assert.ok(html.includes('data-review-time="48.091"')&&html.includes('変化後を見る'),'review card must provide a direct after-state video navigation control');
assert.ok(html.includes('reviewStateChanged'),'only observed changed state rows should receive changed-state emphasis');
assert.ok(html.includes('戦術コーチ'),'Decision Window card must expose the Phase 17 coach');
assert.ok(html.includes('考えるポイント')&&html.includes('確認質問')&&html.includes('評価保留'),'coach UI must separate prompts from held judgement');
assert.ok(html.includes('観測だけではプレイの良否を断定しません。'));

const navStatus={textContent:''};
let sought=null,paused=false,scrolled=false,taskName=null,taskLockText=null;
WB.video={duration:123.338,currentTime:0,scrollIntoView(){scrolled=true}};
WB.pauseVideo=()=>{paused=true;return true};
WB.seekTo=async t=>{sought=Number(t);WB.video.currentTime=Number(t)};
WB.runTask=async(name,fn,opts={})=>{taskName=name;taskLockText=opts.lockText;return await fn()};
WB.$=sel=>sel==='#reviewNavigationStatus'?navStatus:null;
assert.equal(await R.seekReviewWindow(47.641,'before'),true,'before navigation must seek successfully');
assert.equal(sought,47.641);
assert.equal(paused,true);
assert.equal(scrolled,true);
assert.equal(taskName,'局面レビュー移動');
assert.equal(taskLockText,'判断直前へ移動しています。');
assert.equal(navStatus.textContent,'判断直前 47.6s へ移動しました。');
assert.ok(index.includes('Decision Windowごとに「判断直前」「変化後」「観測した変化」「重要とした理由」「未確認項目」'));
assert.ok(index.includes('使用カード・効果源・行動順を推定しません'));
assert.ok(index.includes('.reviewStateGrid,.reviewWindowGrid'));
assert.ok(index.includes('id="reviewNavigationStatus"'),'review panel must expose navigation feedback');
assert.ok(index.includes('「判断直前を見る」「変化後を見る」から動画の該当時刻へ直接移動できます。'));
assert.ok(replay.includes("reviewWindowUi:'before-after-observed-importance-unknown-noncausal-navigation+coach-v1'"));
assert.ok(replay.includes('causalAttribution:false'));
assert.equal(replay.includes("'card-play'"),false);

console.log('REVIEW WINDOW UI REGRESSION PASS');

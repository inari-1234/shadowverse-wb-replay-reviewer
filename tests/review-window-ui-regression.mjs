import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const replay=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

const WB={
  videoMeta:null,turnTimeline:[],mulligan:null,classDetection:null,scenes:[],
  registerModule(){},videoKey(){return 'ui-fixture'},log(){},recordError(){},on(){},onReady(){},
  ReviewEngine:{deriveWindowCoach(model){return{version:'review-window-coach-v1',basis:'observation-only',summary:'盤面とPPの変化を重点確認します。',focus:['PPと盤面打点を見比べる。'],questions:['別の手順を残せたか？'],cautions:['同一カード・同一行動とは結び付けません。'],judgement:'hold',judgementReason:'観測だけではプレイの良否を断定しません。',causalAttribution:false,cardAttribution:false}},deriveCardUseCandidates(){return[{version:'card-use-candidate-v1',cardId:'quickBlader',label:'刹那のクイックブレイダー',status:'candidate-only',warning:'候補カードです。このカードを使用した確定ではありません。'}]}},
  $(){return null},fmt:v=>Number(v).toFixed(1)+'s',
  escape:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
const raf=fn=>setTimeout(fn,0);
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame:raf,URL,Date,Promise};
vm.createContext(sandbox);
new vm.Script(replay,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

assert.equal(R.version,'replay-session-clean-1.13');

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
assert.equal(models[0].cardUseCandidates[0].status,'candidate-only');

const comparison=R.reviewComparisonRows(models[0]);
assert.equal(comparison.length,7,'comparison must combine the two snapshots into one seven-row table');
assert.equal(comparison.find(x=>x.key==='pp').before,'2');
assert.equal(comparison.find(x=>x.key==='pp').after,'1');
assert.equal(comparison.find(x=>x.key==='pp').changed,true);
assert.equal(comparison.find(x=>x.key==='opponentHP').changed,false);

const html=R.renderDecisionWindowCard(models[0]);
for(const phrase of ['判断直前','変化後','観測した変化','状態比較','重要とした理由','ExPP','相手守護','断定不可','PP 2 → 1','盤面打点 4 → 0']){
  assert.ok(html.includes(phrase),`review card must include: ${phrase}`);
}
assert.ok(html.indexOf('観測した変化')<html.indexOf('状態比較'),'diff summary must precede the comparison table');
assert.ok(html.indexOf('状態比較')<html.indexOf('直前フレーム'),'comparison must precede frame evidence buttons');
assert.ok(html.includes('data-review-frame-time="47.641"')&&html.includes('直前フレーム'),'review card must provide a static before-frame control');
assert.ok(html.includes('data-review-frame-time="48.091"')&&html.includes('変化後フレーム'),'review card must provide a static after-frame control');
assert.ok(html.includes('isChanged'),'only observed changed rows should receive changed-state emphasis');
assert.ok(html.includes('isQuiet'),'unchanged rows should remain visually subordinate');
assert.ok(html.includes('reviewUnknown'),'unknown values must use the dedicated uncertainty treatment');
assert.equal(html.includes('reviewStateGrid'),false,'legacy vertical before/after state cards must not render');
assert.ok(html.includes('戦術コーチ'));
assert.ok(html.includes('評価保留'));
assert.ok(html.includes('候補カード使用（未確定）'));
assert.equal(html.includes('使用カード:'),false,'UI must not invent a specific played card');
assert.equal(html.includes('効果源:'),false,'UI must not invent a specific causal source');

let seekedHandler=null;
const video={
  duration:123.338,readyState:4,seeking:false,_time:0,
  get currentTime(){return this._time},
  set currentTime(v){this._time=Number(v);this.seeking=false;queueMicrotask(()=>seekedHandler?.())},
  addEventListener(name,fn){if(name==='seeked')seekedHandler=fn},
  removeEventListener(name,fn){if(name==='seeked'&&seekedHandler===fn)seekedHandler=null}
};
WB.video=video;
WB.seekCount=17;
WB.seekReasons={analysis:17};
WB.seekPositionReached=(v,target)=>Math.abs(Number(v.currentTime)-Number(target))<=.06&&!v.seeking&&v.readyState>=2;
await R.previewSeekTo(47.641,'review-frame-before');
assert.equal(WB.seekCount,17,'preview seek must not increment analysis seek count');
assert.deepEqual(WB.seekReasons,{analysis:17},'preview seek must not alter analysis seek reasons');
assert.equal(WB.previewSeekCount,1,'preview seek must have its own counter');
assert.equal(WB.previewSeekReasons['review-frame-before'],1);

assert.ok(index.includes('id="reviewFrameSheet"'),'static frame sheet must exist');
assert.ok(index.includes('id="matchProgressWrap"'),'whole-match progress surface must exist');
assert.ok(index.includes('動画・静止画の閲覧用seekは解析性能のseek数とは別管理です。'));
assert.ok(index.includes('使用カード・効果源・行動順を推定しません'));
assert.ok(index.includes('id="reviewNavigationStatus"'));
assert.ok(replay.includes("reviewWindowUi:'before-after-observed-importance-unknown-noncausal-navigation+coach-v1'"));
assert.ok(replay.includes("reviewWindowPresentation:'diff-first-comparison+static-frame-preview+unknown-amber+coach-v1'"));
assert.ok(replay.includes('window.__wbCardUseCandidateV1'));
assert.ok(replay.includes('causalAttribution:false'));
assert.equal(replay.includes("'card-play'"),false);

console.log('REVIEW WINDOW UI REGRESSION PASS');

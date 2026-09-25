import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const review=fs.readFileSync(new URL('../review-engine.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app-core.js',import.meta.url),'utf8');
const mulligan=fs.readFileSync(new URL('../mulligan-class.js',import.meta.url),'utf8');
const diagnostics=fs.readFileSync(new URL('../diagnostics.js',import.meta.url),'utf8');

const WB={
  videoMeta:{name:'match.mp4',size:1000,lastModified:123,type:'video/mp4'},
  video:{currentTime:10},
  turnTimeline:[],mulligan:null,classDetection:null,scenes:[],
  registerModule(name,version){this.module={name,version}},
  videoKey(){return 'match.mp4|1000|123'},
  log(){},recordError(){},on(){},onReady(){},$(){return null},fmt:v=>String(v),escape:s=>String(s)
};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,URL,Date,Promise};
vm.createContext(sandbox);
new vm.Script(source,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

assert.equal(R.version,'replay-session-clean-1.0');
assert.equal(R.persistenceMode(),'memory','no IndexedDB in regression sandbox must use memory fallback');

const capture=(time,over={})=>({
  at:'2026-09-25T00:00:00.000Z',
  context:{time,turn:2,relativeSide:'自分'},
  confirmed:{
    version:'confirmed-state-v1',time,turn:2,relativeSide:'自分',
    pp:5,opponentHP:20,extraPP:'yes',ep:'yes',sep:'no',opponentWard:'none',
    boardDamage:2,boardDamageKnown:true,
    hand:{recognized:{quickBlader:{known:true,count:1,label:'刹那のクイックブレイダー',confidence:.95}}},
    ...over
  },
  partial:false
});

const a=R.normalizeCapture(capture(10));
const b=R.normalizeCapture(capture(12,{pp:3,opponentHP:17,ep:'no',opponentWard:'present',boardDamage:5}));
assert.equal(a.completeness,1);
assert.equal(a.hand.recognized.quickBlader.count,1);

const actions=R.deriveActions(a,b);
assert.deepEqual(Array.from(actions.map(x=>x.type)),[
  'opponent-hp-change','pp-change','resource-change','ward-change','board-damage-change'
]);
assert.equal(actions.find(x=>x.type==='opponent-hp-change').data.delta,-3);
assert.equal(actions.find(x=>x.type==='resource-change').data.resource,'ep');

const gap=R.normalizeCapture(capture(8+10,{pp:1,opponentHP:10,ep:'no',opponentWard:'present',boardDamage:0}));
const gapActions=R.deriveActions(b,gap);
assert.deepEqual(Array.from(gapActions.map(x=>x.type)),['observation-gap'],'more than 3 seconds must not be expanded into invented detailed actions');

const nextTurn=R.normalizeCapture({...capture(19),context:{time:19,turn:3,relativeSide:'自分'},confirmed:{...capture(19).confirmed,time:19,turn:3}});
assert.deepEqual(Array.from(R.deriveActions(gap,nextTurn).map(x=>x.type)),['turn-transition'],'turn changes must remain a transition, not inferred actions');

const unknownA=R.normalizeCapture(capture(20,{extraPP:'unknown'}));
const unknownB=R.normalizeCapture(capture(21,{extraPP:'no'}));
assert.equal(R.deriveActions(unknownA,unknownB).some(x=>x.type==='resource-change'&&x.data.resource==='extraPP'),false,'UNKNOWN must never be converted into resource usage');

const points=R.deriveReviewPoints(actions,[{
  id:'ev:lethal',kind:'lethal',time:12,turn:2,status:'confirmed-lethal',lethalRoutes:['Quick route']
}]);
assert.ok(points.some(x=>x.kind==='large-hp-change'&&x.priority==='high'));
assert.ok(points.some(x=>x.kind==='resource-used'&&x.priority==='high'));
assert.ok(points.some(x=>x.kind==='board-swing'&&x.priority==='medium'));
assert.ok(points.some(x=>x.kind==='ward-change'));
assert.ok(points.some(x=>x.kind==='lethal-available'&&x.priority==='critical'));

R.ingestState(capture(10));
R.ingestState(capture(12,{pp:3,opponentHP:17,ep:'no',opponentWard:'present',boardDamage:5}));
let snap=R.snapshot();
assert.equal(snap.states.length,2);
assert.equal(snap.actions.length,5);
assert.equal(snap.actions.some(x=>x.type==='card-play'),false,'state differences must not invent card plays');

R.ingestReviewSignal({atSeconds:12,turn:2,reviewProfile:'sea-pirate-royal',status:'confirmed-lethal',lethalRoutes:['Quick route'],unknown:[]});
snap=R.snapshot();
assert.ok(snap.reviewPoints.some(x=>x.kind==='lethal-available'));

const beforeDisabled=snap.reviewSignals.length;
assert.equal(R.ingestReviewSignal({atSeconds:12,turn:2,reviewProfile:'none',status:'profile-disabled',lethalRoutes:[]}),null);
assert.equal(R.snapshot().reviewSignals.length,beforeDisabled,'disabled tactical profile must not create review signals');

await R.ingestScene({id:'scene1',turn:2,time:12,playOrder:'後攻',matchup:'ロイヤル',deck:'海賊ロイヤル',note:'見返す'});
snap=R.snapshot();
assert.equal(snap.scenes.length,1);
assert.ok(snap.reviewPoints.some(x=>x.kind==='saved-scene'));
await R.clearScenes(['scene1']);
assert.equal(R.snapshot().scenes.length,0);
assert.equal(R.snapshot().reviewPoints.some(x=>x.kind==='saved-scene'),false);

assert.ok(source.includes("indexedDB.open(DB_NAME,DB_VERSION)"));
assert.ok(source.includes("MAX_CONTIGUOUS_GAP=3"));
assert.equal(source.includes("'card-play'"),false);
assert.ok(review.includes("W.emit('review-evaluated'"),'ReviewEngine must publish evaluation results');
assert.ok(review.includes("W.emit('review-state-changed'"),'ReviewEngine must publish saved tactical review state');
assert.ok(app.includes("WB.emit('scene-saved',{scene})"),'scene save must feed ReplaySession');
assert.ok(app.includes("WB.emit('scenes-cleared',{sceneIds})"),'scene clear must feed ReplaySession');
assert.ok(mulligan.includes("WB.emit('postprocess-complete'"),'mulligan/class result must feed ReplaySession');
assert.ok(diagnostics.includes('replaySessionV1:clone(WB.ReplaySession?.snapshot?.()||window.__wbReplaySessionV1||null)'),'review exports must carry ReplaySession metadata');

console.log('REPLAY SESSION REGRESSION PASS');

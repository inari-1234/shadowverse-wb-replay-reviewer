import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../replay-session.js',import.meta.url),'utf8');
const handlers=new Map();
const WB={
  videoMeta:{name:'09-23.mp4',size:123456,lastModified:1727078400000,type:'video/mp4'},
  video:{currentTime:0},turnTimeline:[],mulligan:null,classDetection:null,scenes:[],task:null,
  registerModule(){},videoKey(){return '09-23.mp4|123456|1727078400000'},log(){},recordError(){},
  on(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn)},
  onReady(){},$(){return null},fmt:v=>String(v),escape:s=>String(s),
  ReviewEngine:{activeProfile(){return 'none'}}
};
const sandbox={window:{WB},console,structuredClone,setTimeout,clearTimeout,URL,Date,Promise,crypto:globalThis.crypto};
vm.createContext(sandbox);
new vm.Script(source,{filename:'replay-session.js'}).runInContext(sandbox);
const R=WB.ReplaySession;

assert.equal(R.schema,'replay-session-v3','P0-1 must bump session schema so dirty v2 analysis data is not restored');
assert.equal(typeof R.beginAnalysisRun,'function','ReplaySession must expose explicit run-boundary creation');

const dirtyV2={
  version:'replay-session-v2',sourceKey:WB.videoKey(),createdAt:'2026-09-23T00:00:00.000Z',updatedAt:'2026-10-01T00:00:00.000Z',
  states:[{id:'st:6:bottom:74.141',time:74.141,turn:6,opponentHP:15}],
  actions:[{id:'old-action',type:'opponent-hp-change'}],
  observedEpisodes:[{id:'old-episode'}],decisionWindows:[{id:'old-window'}],observationReviewPoints:[{id:'old-point'}],
  supplementalReviewPoints:[{id:'old-supp'}],reviewPoints:[{id:'old-review'}],
  reviewSignals:[
    {id:'old-analysis-signal',kind:'lethal',status:'confirmed-lethal'},
    {id:'scene:saved-1',kind:'manual-scene',time:50,turn:4,note:'keep me'}
  ],
  scenes:[{id:'saved-1',time:50,turn:4,note:'keep me',imageKey:'old|saved-1'}],
  tacticalReview:{old:true},turnTimeline:[{old:true}],mulligan:{old:true},classDetection:{old:true}
};
const migrated=R.migrateLoadedSession(dirtyV2,WB.videoKey());
assert.equal(migrated.migrated,true);
assert.equal(migrated.session.version,'replay-session-v3');
for(const key of ['states','actions','observedEpisodes','decisionWindows','observationReviewPoints'])assert.equal(migrated.session[key].length,0,`dirty analysis field ${key} must be discarded`);
assert.equal(migrated.session.reviewSignals.length,1,'only user-authored manual-scene signal may survive v2 migration');
assert.equal(migrated.session.reviewSignals[0].kind,'manual-scene');
assert.equal(migrated.session.scenes.length,1,'saved scene metadata is a user asset and must survive migration');
assert.equal(migrated.session.tacticalReview,null,'old analysis tacticalReview must not cross schema migration');
assert.equal(migrated.session.analysisRun,null,'migrated session must not pretend to belong to a current run');

const capture=(time,hp=18)=>({
  at:'2026-10-10T00:00:00.000Z',captureMode:'timeline',
  context:{time,turn:6,absoluteSide:'bottom',relativeSide:'自分'},
  confirmed:{time,turn:6,absoluteSide:'bottom',relativeSide:'自分',pp:6,opponentHP:hp,extraPP:'yes',ep:'yes',sep:'yes',opponentWard:'present',boardDamage:0,boardDamageKnown:true,hand:{recognized:{}}}
});

const runA=R.beginAnalysisRun({runId:'analysis-run-A',startedAt:'2026-10-10T00:00:00.000Z',source:'regression'});
assert.equal(runA.runId,'analysis-run-A');
R.ingestState(capture(72.3,18));
R.ingestState(capture(74.1,15));
let snap=R.snapshot();
assert.equal(snap.analysisRun.runId,'analysis-run-A');
assert.equal(snap.states.length,2);
assert.ok(snap.states.every(x=>x.runId==='analysis-run-A'),'every analysis-derived state must carry the current runId');
assert.ok(snap.states.every(x=>x.provenance?.source==='state-captured'),'state provenance must identify capture origin');

await R.ingestScene({id:'saved-live',time:80,turn:7,note:'user scene'});
snap=R.snapshot();
assert.ok(snap.scenes.some(x=>x.id==='saved-live'));
assert.ok(snap.reviewSignals.some(x=>x.kind==='manual-scene'));

const runB=R.beginAnalysisRun({runId:'analysis-run-B',startedAt:'2026-10-10T00:05:00.000Z',source:'regression'});
assert.equal(runB.runId,'analysis-run-B');
snap=R.snapshot();
assert.equal(snap.analysisRun.runId,'analysis-run-B');
for(const key of ['states','actions','observedEpisodes','decisionWindows','observationReviewPoints'])assert.equal(snap[key].length,0,`${key} from run A must not leak into run B`);
assert.ok(snap.scenes.some(x=>x.id==='saved-live'),'user saved scenes must survive run reset');
assert.ok(snap.reviewSignals.every(x=>x.kind==='manual-scene'),'analysis review signals must not survive run reset');

const startHandlers=handlers.get('match-analysis-start')||[];
assert.ok(startHandlers.length>0,'match-analysis-start must own the run boundary');
for(const fn of startHandlers)fn({runId:'analysis-run-C',startedAt:'2026-10-10T00:10:00.000Z'});
snap=R.snapshot();
assert.equal(snap.analysisRun.runId,'analysis-run-C','production event path must start a fresh run');
assert.equal(snap.states.length,0);

console.log('P-F1-R2 RUN ISOLATION REGRESSION PASS');

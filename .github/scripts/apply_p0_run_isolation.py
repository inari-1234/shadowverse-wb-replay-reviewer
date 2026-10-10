from pathlib import Path

p=Path('replay-session.js')
s=p.read_text()

s=s.replace("const VERSION='replay-session-clean-1.14';","const VERSION='replay-session-clean-1.15';")
s=s.replace("const DB_NAME='wb-replay-session-v1',DB_VERSION=1,SESSION_STORE='sessions',SCENE_STORE='scene-images',MAX_CONTIGUOUS_GAP=3,SESSION_SCHEMA='replay-session-v2';","const DB_NAME='wb-replay-session-v1',DB_VERSION=2,SESSION_STORE='sessions',SCENE_STORE='scene-images',RUN_STORE='analysis-runs',MAX_CONTIGUOUS_GAP=3,SESSION_SCHEMA='replay-session-v3';")

old="""function emptySession(key=sourceKey()){return{
  version:SESSION_SCHEMA,sourceKey:key,video:clone(W.videoMeta||null),createdAt:nowIso(),updatedAt:nowIso(),
  turnTimeline:clone(W.turnTimeline||[]),mulligan:clone(W.mulligan||null),classDetection:clone(W.classDetection||null),
  reviewProfile:W.ReviewEngine?.activeProfile?.()||'none',states:[],actions:[],observedEpisodes:[],decisionWindows:[],observationReviewPoints:[],reviewSignals:[],supplementalReviewPoints:[],reviewPoints:[],scenes:[],tacticalReview:null
}}
function ensureCurrent(){const key=sourceKey();if(!key)return null;if(!current||current.sourceKey!==key)current=emptySession(key);return current}
function migrateLoadedSession(loaded,key){
  const base=emptySession(key);
  if(!loaded)return{session:base,migrated:false,reason:null};
  if(loaded.version===SESSION_SCHEMA)return{session:{...base,...clone(loaded),sourceKey:key},migrated:false,reason:null};
  const keptSignals=Array.isArray(loaded.reviewSignals)?clone(loaded.reviewSignals):[];
  const legacyScenes=Array.isArray(loaded.scenes)?clone(loaded.scenes):[];
  const session={...base,createdAt:loaded.createdAt||base.createdAt,updatedAt:nowIso(),reviewSignals:keptSignals,scenes:legacyScenes,tacticalReview:clone(loaded.tacticalReview||null)};
  return{session,migrated:true,reason:'legacy-unsafe-null-number-coercion'}
}
"""
new="""function emptySession(key=sourceKey()){return{
  version:SESSION_SCHEMA,sourceKey:key,video:clone(W.videoMeta||null),createdAt:nowIso(),updatedAt:nowIso(),analysisRun:null,
  turnTimeline:clone(W.turnTimeline||[]),mulligan:clone(W.mulligan||null),classDetection:clone(W.classDetection||null),
  reviewProfile:W.ReviewEngine?.activeProfile?.()||'none',states:[],actions:[],observedEpisodes:[],decisionWindows:[],observationReviewPoints:[],reviewSignals:[],supplementalReviewPoints:[],reviewPoints:[],scenes:[],tacticalReview:null
}}
function ensureCurrent(){const key=sourceKey();if(!key)return null;if(!current||current.sourceKey!==key)current=emptySession(key);return current}
function userReviewSignals(rows=[]){return(Array.isArray(rows)?rows:[]).filter(x=>x?.kind==='manual-scene').map(clone)}
function migrateLoadedSession(loaded,key){
  const base=emptySession(key);
  if(!loaded)return{session:base,migrated:false,reason:null};
  if(loaded.version===SESSION_SCHEMA)return{session:{...base,...clone(loaded),sourceKey:key},migrated:false,reason:null};
  const legacyScenes=Array.isArray(loaded.scenes)?clone(loaded.scenes):[];
  const session={...base,createdAt:loaded.createdAt||base.createdAt,updatedAt:nowIso(),analysisRun:null,reviewSignals:userReviewSignals(loaded.reviewSignals),scenes:legacyScenes,tacticalReview:null};
  return{session,migrated:true,reason:'analysis-run-isolation-v3'}
}
function makeAnalysisRun(meta={}){const startedAt=meta?.startedAt||nowIso(),runId=String(meta?.runId||`analysis:${Date.parse(startedAt)||Date.now()}:${Math.random().toString(36).slice(2,10)}`);return{runId,startedAt,source:meta?.source||'match-analysis-start',sourceKey:sourceKey()}}
function archiveRunSnapshot(session,reason='superseded'){
  if(!session)return Promise.resolve(false);const runId=session?.analysisRun?.runId||null,hasAnalysis=!!runId||(session.states||[]).length>0||(session.actions||[]).length>0||(session.decisionWindows||[]).length>0;
  if(!hasAnalysis)return Promise.resolve(false);const archivedAt=nowIso(),id=`${session.sourceKey}|${runId||session.createdAt||archivedAt}`;
  return dbPut(RUN_STORE,{id,sourceKey:session.sourceKey,runId,archivedAt,reason,session:sessionForStorage(session)})
}
function beginAnalysisRun(meta={}){
  const s=ensureCurrent();if(!s)return null;const previous=sessionForStorage(s),run=makeAnalysisRun(meta),keepScenes=clone(s.scenes||[]),keepSignals=userReviewSignals(s.reviewSignals);
  if(previous)persistQueue=persistQueue.then(()=>archiveRunSnapshot(previous,'new-analysis-run')).catch(err=>{W.recordError('replay-session-run-archive',err);return false});
  s.version=SESSION_SCHEMA;s.analysisRun=run;s.video=clone(W.videoMeta||null);s.turnTimeline=clone(W.turnTimeline||[]);s.mulligan=clone(W.mulligan||null);s.classDetection=clone(W.classDetection||null);s.reviewProfile=W.ReviewEngine?.activeProfile?.()||s.reviewProfile||'none';
  s.states=[];s.actions=[];s.observedEpisodes=[];s.decisionWindows=[];s.observationReviewPoints=[];s.reviewSignals=keepSignals;s.supplementalReviewPoints=deriveSupplementalReviewPoints(keepSignals);s.reviewPoints=clone(s.supplementalReviewPoints);s.scenes=keepScenes;s.tacticalReview=null;s.updatedAt=nowIso();
  expose();if(W.task)renderDeferred=true;else render();W.log?.('replay-session-analysis-run-start',{sourceKey:s.sourceKey,runId:run.runId,startedAt:run.startedAt,previousRunId:previous?.analysisRun?.runId||null,preservedScenes:keepScenes.length});return clone(run)
}
"""
if old not in s: raise SystemExit('session header block not found')
s=s.replace(old,new)

s=s.replace("if(!db.objectStoreNames.contains(SESSION_STORE))db.createObjectStore(SESSION_STORE,{keyPath:'sourceKey'});if(!db.objectStoreNames.contains(SCENE_STORE))db.createObjectStore(SCENE_STORE,{keyPath:'key'})","if(!db.objectStoreNames.contains(SESSION_STORE))db.createObjectStore(SESSION_STORE,{keyPath:'sourceKey'});if(!db.objectStoreNames.contains(SCENE_STORE))db.createObjectStore(SCENE_STORE,{keyPath:'key'});if(!db.objectStoreNames.contains(RUN_STORE))db.createObjectStore(RUN_STORE,{keyPath:'id'})")

s=s.replace("function action(id,type,prev,curr,data={},confidence='observed'){return{id,type,fromStateId:prev?.id||null,toStateId:curr?.id||null,time:curr?.time??null,turn:curr?.turn??null,confidence,data}}","function action(id,type,prev,curr,data={},confidence='observed'){const runId=curr?.runId??prev?.runId??null;return{id,type,runId,fromStateId:prev?.id||null,toStateId:curr?.id||null,time:curr?.time??null,turn:curr?.turn??null,confidence,data}}")

s=s.replace("if(a.type==='opponent-hp-change'&&Math.abs(Number(a.data?.delta)||0)>=2)rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'high',kind:'large-hp-change'","if(a.type==='opponent-hp-change'&&Math.abs(Number(a.data?.delta)||0)>=2)rows.push({id:'rp:'+a.id,runId:a.runId||null,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'high',kind:'large-hp-change'")
s=s.replace("if(a.type==='resource-change'&&a.data?.from==='yes'&&a.data?.to==='no')rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'high',kind:'resource-used'","if(a.type==='resource-change'&&a.data?.from==='yes'&&a.data?.to==='no')rows.push({id:'rp:'+a.id,runId:a.runId||null,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'high',kind:'resource-used'")
s=s.replace("if(a.type==='board-damage-change'&&Math.abs(Number(a.data?.delta)||0)>=2)rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'medium',kind:'board-swing'","if(a.type==='board-damage-change'&&Math.abs(Number(a.data?.delta)||0)>=2)rows.push({id:'rp:'+a.id,runId:a.runId||null,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'medium',kind:'board-swing'")
s=s.replace("if(a.type==='ward-change')rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'medium',kind:'ward-change'","if(a.type==='ward-change')rows.push({id:'rp:'+a.id,runId:a.runId||null,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'medium',kind:'ward-change'")

s=s.replace("id:'oe:'+key,kind:'observed-episode',fromStateId:first.fromStateId,toStateId:first.toStateId,time:first.time??null,turn:first.turn??null,","id:'oe:'+key,kind:'observed-episode',runId:first.runId||null,fromStateId:first.fromStateId,toStateId:first.toStateId,time:first.time??null,turn:first.turn??null,")
s=s.replace("id:'dw:'+key,kind:'decision-window',reviewStart:start,reviewEnd:end,time:finite(point.time)??end,turn:finite(point.turn)??finite(after.turn)??finite(before.turn),","id:'dw:'+key,kind:'decision-window',runId:primary.runId||before.runId||after.runId||null,reviewStart:start,reviewEnd:end,time:finite(point.time)??end,turn:finite(point.turn)??finite(after.turn)??finite(before.turn),")

old_ingest="""function ingestState(capture){
  const s=ensureCurrent(),row=normalizeCapture(capture);if(!s||!row)return null;
  const ix=s.states.findIndex(x=>x.id===row.id);if(ix>=0)s.states[ix]=row;else s.states.push(row);
  rebuildDerived();schedulePersist();W.log('replay-session-state',{stateId:row.id,states:s.states.length,actions:s.actions.length,reviewPoints:s.reviewPoints.length});return row
}
"""
new_ingest="""function ingestState(capture){
  const s=ensureCurrent(),row=normalizeCapture(capture);if(!s||!row)return null;const runId=s.analysisRun?.runId||null;
  row.runId=runId;row.provenance={source:'state-captured',runId,captureMode:capture?.captureMode||null,capturedAt:row.capturedAt||null};
  const ix=s.states.findIndex(x=>x.id===row.id&&String(x.runId||'')===String(runId||''));if(ix>=0)s.states[ix]=row;else s.states.push(row);
  if(runId)s.states=s.states.filter(x=>String(x.runId||'')===String(runId));
  rebuildDerived();schedulePersist();W.log('replay-session-state',{stateId:row.id,runId,states:s.states.length,actions:s.actions.length,reviewPoints:s.reviewPoints.length});return row
}
"""
if old_ingest not in s: raise SystemExit('ingest block not found')
s=s.replace(old_ingest,new_ingest)

s=s.replace("W.ReplaySession={version:VERSION,schema:SESSION_SCHEMA,dbName:DB_NAME,persistenceMode,emptySession,migrateLoadedSession,normalizeCapture,deriveActions","W.ReplaySession={version:VERSION,schema:SESSION_SCHEMA,dbName:DB_NAME,persistenceMode,emptySession,migrateLoadedSession,beginAnalysisRun,normalizeCapture,deriveActions")

old_event="W.on('match-analysis-start',()=>{activeReviewPlaybackIndex=0;updateReviewPlaybackUi()});"
new_event="W.on('match-analysis-start',detail=>{beginAnalysisRun({runId:detail?.runId||null,startedAt:detail?.startedAt||null,source:'match-analysis-start'});activeReviewPlaybackIndex=0;updateReviewPlaybackUi()});"
if old_event not in s: raise SystemExit('match-analysis-start event not found')
s=s.replace(old_event,new_event)

p.write_text(s)

# Align legacy replay regression with intentional schema/version bump.
t=Path('tests/replay-session-regression.mjs')
r=t.read_text().replace("assert.equal(R.version,'replay-session-clean-1.14');","assert.equal(R.version,'replay-session-clean-1.15');").replace("assert.equal(R.schema,'replay-session-v2');","assert.equal(R.schema,'replay-session-v3');")
t.write_text(r)
print('P0-1 run isolation patch applied')

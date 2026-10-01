(()=>{'use strict';
const W=window.WB;if(!W)return;
const VERSION='replay-session-clean-1.13';
const DB_NAME='wb-replay-session-v1',DB_VERSION=1,SESSION_STORE='sessions',SCENE_STORE='scene-images',MAX_CONTIGUOUS_GAP=3,SESSION_SCHEMA='replay-session-v2';
W.registerModule('replay-session',VERSION);

const clone=x=>{try{return structuredClone(x)}catch{return x==null?x:JSON.parse(JSON.stringify(x))}};
const finite=v=>{if(v===null||v===undefined)return null;if(typeof v==='string'&&v.trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const nowIso=()=>new Date().toISOString();
let current=null,dbPromise=null,persistQueue=Promise.resolve(),renderDeferred=false,reviewPlaybackReady=false,activeReviewPlaybackIndex=0;
const REVIEW_PLAYBACK_LEAD=3;

function sourceKey(){return W.videoMeta?W.videoKey():null}
function emptySession(key=sourceKey()){return{
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
function refreshMetadata(){const s=ensureCurrent();if(!s)return null;s.video=clone(W.videoMeta||null);s.turnTimeline=clone(W.turnTimeline||s.turnTimeline||[]);s.mulligan=clone(W.mulligan||s.mulligan||null);s.classDetection=clone(W.classDetection||s.classDetection||null);s.reviewProfile=W.ReviewEngine?.activeProfile?.()||s.reviewProfile||'none';s.updatedAt=nowIso();return s}

function openDb(){
  if(dbPromise)return dbPromise;
  if(typeof indexedDB==='undefined')return Promise.resolve(null);
  dbPromise=new Promise(resolve=>{
    try{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(SESSION_STORE))db.createObjectStore(SESSION_STORE,{keyPath:'sourceKey'});if(!db.objectStoreNames.contains(SCENE_STORE))db.createObjectStore(SCENE_STORE,{keyPath:'key'})};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>{W.recordError('replay-session-db-open',req.error||new Error('IndexedDB open failed'));resolve(null)};
    }catch(err){W.recordError('replay-session-db-open',err);resolve(null)}
  });
  return dbPromise
}
function requestResult(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB request failed'))})}
async function dbGet(store,key){const db=await openDb();if(!db)return null;try{return await requestResult(db.transaction(store,'readonly').objectStore(store).get(key))}catch(err){W.recordError('replay-session-db-get',err,{store});return null}}
async function dbPut(store,value){const db=await openDb();if(!db)return false;try{await requestResult(db.transaction(store,'readwrite').objectStore(store).put(value));return true}catch(err){W.recordError('replay-session-db-put',err,{store});return false}}
async function dbDelete(store,key){const db=await openDb();if(!db)return false;try{await requestResult(db.transaction(store,'readwrite').objectStore(store).delete(key));return true}catch(err){W.recordError('replay-session-db-delete',err,{store});return false}}

function persistenceMode(){return typeof indexedDB==='undefined'?'memory':'indexeddb'}
function sessionForStorage(s){const x=clone(s);if(!x)return null;x.scenes=(x.scenes||[]).map(({url,blob,...rest})=>rest);return x}
function expose(){window.__wbReplaySessionV1=current?sessionForStorage(current):null}
function schedulePersist(){
  const snap=refreshMetadata();if(!snap)return Promise.resolve(false);
  const stored=sessionForStorage(snap);expose();if(W.task)renderDeferred=true;else render();
  persistQueue=persistQueue.then(()=>dbPut(SESSION_STORE,stored)).catch(err=>{W.recordError('replay-session-persist',err);return false});
  return persistQueue
}
function flushDeferredRender(){if(!renderDeferred)return false;renderDeferred=false;render();return true}

function normalizeCapture(capture){
  if(!capture)return null;const c=capture.confirmed||{},ctx=capture.context||{},hand=c.hand?.recognized||capture?.hand?.result?.recognized||{};
  const recognized={};for(const [id,row] of Object.entries(hand||{})){if(row?.known===true&&Number.isFinite(Number(row.count))&&Number(row.count)>0)recognized[id]={id,label:row.label||id,count:Number(row.count),confidence:finite(row.confidence)}}
  const time=finite(c.time??ctx.time),turn=finite(c.turn??ctx.turn),pp=finite(c.pp),opponentHP=finite(c.opponentHP),boardDamage=finite(c.boardDamage);
  const resources={extraPP:String(c.extraPP??capture?.resources?.ui?.extra??'unknown'),ep:String(c.ep??capture?.resources?.ui?.ep??'unknown'),sep:String(c.sep??capture?.resources?.ui?.sep??'unknown')};
  const opponentWard=String(c.opponentWard??capture?.ward?.state??'unknown'),known=[pp!=null,opponentHP!=null,resources.extraPP!=='unknown',resources.ep!=='unknown',resources.sep!=='unknown',opponentWard!=='unknown',c.boardDamageKnown===true||boardDamage!=null],knownCount=known.filter(Boolean).length;
  return{
    id:`st:${turn??'x'}:${String(c.absoluteSide??ctx.absoluteSide??'x')}:${time==null?'x':time.toFixed(3)}`,capturedAt:capture.at||nowIso(),time,turn,
    absoluteSide:c.absoluteSide??ctx.absoluteSide??null,relativeSide:c.relativeSide??ctx.relativeSide??null,pp,opponentHP,resources,opponentWard,
    boardDamage,boardDamageKnown:c.boardDamageKnown===true||boardDamage!=null,hand:{recognized},
    completeness:+(knownCount/known.length).toFixed(3),partial:!!capture.partial
  }
}
function action(id,type,prev,curr,data={},confidence='observed'){return{id,type,fromStateId:prev?.id||null,toStateId:curr?.id||null,time:curr?.time??null,turn:curr?.turn??null,confidence,data}}
function deriveActions(prev,curr){
  if(!prev||!curr)return[];const out=[],dt=curr.time!=null&&prev.time!=null?curr.time-prev.time:null,
    sameNumber=prev.turn!=null&&curr.turn!=null&&Number(prev.turn)===Number(curr.turn),
    sameSide=(prev.absoluteSide&&curr.absoluteSide)?prev.absoluteSide===curr.absoluteSide:(prev.relativeSide&&curr.relativeSide)?prev.relativeSide===curr.relativeSide:false,
    sameTurn=sameNumber&&sameSide;
  if(!sameTurn){out.push(action(`${prev.id}->${curr.id}:turn`,'turn-transition',prev,curr,{fromTurn:prev.turn,toTurn:curr.turn,fromSide:prev.absoluteSide||prev.relativeSide||null,toSide:curr.absoluteSide||curr.relativeSide||null,elapsedSeconds:dt},'observed'));return out}
  if(dt==null||dt<0||dt>MAX_CONTIGUOUS_GAP){out.push(action(`${prev.id}->${curr.id}:gap`,'observation-gap',prev,curr,{elapsedSeconds:dt},'observed'));return out}
  if(prev.opponentHP!=null&&curr.opponentHP!=null&&prev.opponentHP!==curr.opponentHP)out.push(action(`${prev.id}->${curr.id}:hp`,'opponent-hp-change',prev,curr,{from:prev.opponentHP,to:curr.opponentHP,delta:curr.opponentHP-prev.opponentHP}));
  if(prev.pp!=null&&curr.pp!=null&&prev.pp!==curr.pp)out.push(action(`${prev.id}->${curr.id}:pp`,'pp-change',prev,curr,{from:prev.pp,to:curr.pp,delta:curr.pp-prev.pp}));
  for(const key of ['extraPP','ep','sep']){const a=prev.resources?.[key]||'unknown',b=curr.resources?.[key]||'unknown';if(a!=='unknown'&&b!=='unknown'&&a!==b)out.push(action(`${prev.id}->${curr.id}:res:${key}`,'resource-change',prev,curr,{resource:key,from:a,to:b}))}
  if(prev.opponentWard!=='unknown'&&curr.opponentWard!=='unknown'&&prev.opponentWard!==curr.opponentWard)out.push(action(`${prev.id}->${curr.id}:ward`,'ward-change',prev,curr,{from:prev.opponentWard,to:curr.opponentWard}));
  if(prev.boardDamageKnown&&curr.boardDamageKnown&&prev.boardDamage!=null&&curr.boardDamage!=null&&prev.boardDamage!==curr.boardDamage)out.push(action(`${prev.id}->${curr.id}:board`,'board-damage-change',prev,curr,{from:prev.boardDamage,to:curr.boardDamage,delta:curr.boardDamage-prev.boardDamage}));
  return out
}
const REVIEW_POINT_WEIGHT=Object.freeze({critical:4,high:3,medium:2,manual:1});
function sortReviewPoints(rows=[]){return(Array.isArray(rows)?rows:[]).slice().sort((a,b)=>(finite(a.time)??Infinity)-(finite(b.time)??Infinity)||((REVIEW_POINT_WEIGHT[b.priority]||0)-(REVIEW_POINT_WEIGHT[a.priority]||0)))}
function deriveObservationReviewPoints(actions=[]){
  const rows=[];
  for(const a of actions){
    if(a.type==='opponent-hp-change'&&Math.abs(Number(a.data?.delta)||0)>=2)rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'high',kind:'large-hp-change',title:'大きなHP変化',detail:`相手HP ${a.data.from} → ${a.data.to}`});
    if(a.type==='resource-change'&&a.data?.from==='yes'&&a.data?.to==='no')rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'high',kind:'resource-used',title:'重要資源の変化',detail:`${a.data.resource} が使用可 → 使用不可`});
    if(a.type==='board-damage-change'&&Math.abs(Number(a.data?.delta)||0)>=2)rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'medium',kind:'board-swing',title:'盤面打点の大きな変化',detail:`攻撃可能打点 ${a.data.from} → ${a.data.to}`});
    if(a.type==='ward-change')rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'medium',kind:'ward-change',title:'守護状態の変化',detail:`${a.data.from} → ${a.data.to}`});
  }
  return sortReviewPoints(rows)
}
function deriveSupplementalReviewPoints(signals=[]){
  const rows=[];
  for(const s of signals){
    if(s.kind==='lethal'&&s.status==='confirmed-lethal')rows.push({id:'rp:'+s.id,source:'review',sourceId:s.id,time:s.time,turn:s.turn,priority:'critical',kind:'lethal-available',title:'リーサル候補を確認',detail:(s.lethalRoutes||[]).join(' / ')||'既知ルートでリーサル'});
    if(s.kind==='manual-scene')rows.push({id:'rp:'+s.id,source:'manual',sourceId:s.id,time:s.time,turn:s.turn,priority:'manual',kind:'saved-scene',title:'保存した局面',detail:s.note||'ユーザーが見返し対象として保存'});
  }
  return sortReviewPoints(rows)
}
function mergeReviewPoints(observation=[],supplemental=[]){return sortReviewPoints([...(observation||[]),...(supplemental||[])])}
function deriveReviewPoints(actions=[],signals=[]){return mergeReviewPoints(deriveObservationReviewPoints(actions),deriveSupplementalReviewPoints(signals))}
function sameTurnIdentity(a,b){
  if(!a||!b)return false;
  const sameNumber=a.turn!=null&&b.turn!=null&&Number(a.turn)===Number(b.turn),
    sameSide=(a.absoluteSide&&b.absoluteSide)?a.absoluteSide===b.absoluteSide:(a.relativeSide&&b.relativeSide)?a.relativeSide===b.relativeSide:false;
  return sameNumber&&sameSide
}
function deriveTimelineActions(states=[]){
  const ordered=(Array.isArray(states)?states:[]).slice().sort((a,b)=>(finite(a.time)??Infinity)-(finite(b.time)??Infinity)),actions=[];
  for(let i=1;i<ordered.length;i++)actions.push(...deriveActions(ordered[i-1],ordered[i]));
  const ids=new Set(actions.map(x=>x.id));let hpAnchor=null,unknownHpAfterAnchor=0;
  for(const cur of ordered){
    if(cur?.opponentHP==null){
      if(hpAnchor){
        const dt=finite(cur?.time)!=null&&finite(hpAnchor?.time)!=null?finite(cur.time)-finite(hpAnchor.time):null;
        if(!sameTurnIdentity(hpAnchor,cur)||dt==null||dt<0||dt>MAX_CONTIGUOUS_GAP){hpAnchor=null;unknownHpAfterAnchor=0}
        else unknownHpAfterAnchor++
      }
      continue
    }
    if(hpAnchor){
      const dt=finite(cur?.time)!=null&&finite(hpAnchor?.time)!=null?finite(cur.time)-finite(hpAnchor.time):null;
      if(sameTurnIdentity(hpAnchor,cur)&&dt!=null&&dt>=0&&dt<=MAX_CONTIGUOUS_GAP&&hpAnchor.opponentHP!==cur.opponentHP){
        const id=`${hpAnchor.id}->${cur.id}:hp`;
        if(!ids.has(id)){
          actions.push(action(id,'opponent-hp-change',hpAnchor,cur,{from:hpAnchor.opponentHP,to:cur.opponentHP,delta:cur.opponentHP-hpAnchor.opponentHP,bridgedUnknownObservations:unknownHpAfterAnchor},unknownHpAfterAnchor?'observed-endpoints':'observed'));
          ids.add(id)
        }
      }
    }
    hpAnchor=cur;unknownHpAfterAnchor=0
  }
  return actions.sort((a,b)=>(finite(a.time)??Infinity)-(finite(b.time)??Infinity))
}
function observedActionPart(a){
  if(a?.type==='opponent-hp-change')return`相手HP ${a.data.from}→${a.data.to}`;
  if(a?.type==='pp-change')return`PP ${a.data.from}→${a.data.to}`;
  if(a?.type==='resource-change')return`${a.data.resource} ${a.data.from}→${a.data.to}`;
  if(a?.type==='ward-change')return`守護 ${a.data.from}→${a.data.to}`;
  if(a?.type==='board-damage-change')return`盤面打点 ${a.data.from}→${a.data.to}`;
  return null
}
function observedEpisodeInterpretation(rows=[]){
  const hp=rows.find(x=>x.type==='opponent-hp-change'),pp=rows.find(x=>x.type==='pp-change'),board=rows.find(x=>x.type==='board-damage-change'),ward=rows.find(x=>x.type==='ward-change'),
    usedResources=rows.filter(x=>x.type==='resource-change'&&x.data?.from==='yes'&&x.data?.to==='no'),
    notes=[];
  if(pp&&Number(pp.data?.delta)<0&&hp&&Number(hp.data?.delta)<0)notes.push(`PPが${Math.abs(Number(pp.data.delta))}減少した区間で相手HPが${Math.abs(Number(hp.data.delta))}減少`);
  else if(hp&&Number(hp.data?.delta)<0)notes.push(`相手HPが${Math.abs(Number(hp.data.delta))}減少`);
  else if(pp&&Number(pp.data?.delta)<0)notes.push(`PPが${Math.abs(Number(pp.data.delta))}減少`);
  if(board&&Number(board.data?.delta)!==0)notes.push(`盤面の攻撃可能打点が${board.data.from}→${board.data.to}に変化`);
  if(ward)notes.push(`守護状態が${ward.data.from}→${ward.data.to}に変化`);
  if(usedResources.length)notes.push(`${usedResources.map(x=>x.data.resource).join('・')}を使用可能→使用不可として観測`);
  const base=notes.length?notes.join('。'):'複数の状態変化を同じ観測区間で確認';
  return`${base}。同じ行動による変化とは断定せず、使用カード・効果源・ダメージ源・行動順は未確定。`
}
function deriveObservedEpisodes(actions=[]){
  const detailed=new Set(['opponent-hp-change','pp-change','resource-change','ward-change','board-damage-change']),groups=new Map();
  for(const a of actions||[]){
    if(!detailed.has(a?.type)||!a?.fromStateId||!a?.toStateId)continue;
    const key=`${a.fromStateId}->${a.toStateId}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(a)
  }
  const rows=[];
  for(const [key,items] of groups){
    const ordered=items.slice().sort((a,b)=>String(a.type).localeCompare(String(b.type))),parts=ordered.map(observedActionPart).filter(Boolean),first=ordered[0],
      hasEndpointBridge=ordered.some(x=>x.confidence==='observed-endpoints');
    rows.push({
      id:'oe:'+key,kind:'observed-episode',fromStateId:first.fromStateId,toStateId:first.toStateId,time:first.time??null,turn:first.turn??null,
      confidence:hasEndpointBridge?'observed-endpoints':'observed',actionIds:ordered.map(x=>x.id),observedTypes:ordered.map(x=>x.type),
      summary:parts.join(' / '),interpretation:observedEpisodeInterpretation(ordered),causalAttribution:false,
      unresolved:['同一行動か','使用カード','効果源・ダメージ源','行動順']
    })
  }
  return rows.sort((a,b)=>(finite(a.time)??Infinity)-(finite(b.time)??Infinity))
}
const DECISION_WINDOW_ACTION_TYPES=new Set(['opponent-hp-change','pp-change','resource-change','ward-change','board-damage-change']);
function decisionUnknownFields(state){
  if(!state)return['state'];
  const out=[];
  if(state.pp==null)out.push('pp');
  if(state.opponentHP==null)out.push('opponentHP');
  for(const key of ['extraPP','ep','sep'])if((state.resources?.[key]??'unknown')==='unknown')out.push(key);
  if((state.opponentWard??'unknown')==='unknown')out.push('opponentWard');
  if(state.boardDamageKnown!==true||state.boardDamage==null)out.push('boardDamage');
  return out
}
function decisionObservedChange(a){return{actionId:a.id,type:a.type,confidence:a.confidence||'observed',data:clone(a.data||{})}}
function deriveDecisionWindows(reviewPoints=[],actions=[],episodes=[],states=[]){
  const actionById=new Map((actions||[]).map(x=>[x.id,x])),stateById=new Map((states||[]).map(x=>[x.id,x])),windows=new Map();
  for(const point of reviewPoints||[]){
    if(point?.source!=='action')continue;
    const primary=actionById.get(point.sourceId);
    if(!primary||!DECISION_WINDOW_ACTION_TYPES.has(primary.type)||!primary.fromStateId||!primary.toStateId)continue;
    const before=stateById.get(primary.fromStateId),after=stateById.get(primary.toStateId),start=finite(before?.time),end=finite(after?.time);
    if(!before||!after||!sameTurnIdentity(before,after)||start==null||end==null||end<start||end-start>MAX_CONTIGUOUS_GAP)continue;
    const key=`${primary.fromStateId}->${primary.toStateId}`;
    let row=windows.get(key);
    if(!row){
      const relatedActions=(actions||[]).filter(x=>x?.fromStateId===primary.fromStateId&&x?.toStateId===primary.toStateId&&DECISION_WINDOW_ACTION_TYPES.has(x?.type)),
        relatedEpisodes=(episodes||[]).filter(x=>x?.fromStateId===primary.fromStateId&&x?.toStateId===primary.toStateId),
        endpointOnly=relatedActions.some(x=>x?.confidence==='observed-endpoints'),
        unknownFields=[...new Set([...decisionUnknownFields(before),...decisionUnknownFields(after)])],
        unresolved=[...new Set(relatedEpisodes.flatMap(x=>Array.isArray(x?.unresolved)?x.unresolved:[]))];
      row={
        id:'dw:'+key,kind:'decision-window',reviewStart:start,reviewEnd:end,time:finite(point.time)??end,turn:finite(point.turn)??finite(after.turn)??finite(before.turn),
        beforeState:clone(before),afterState:clone(after),observedChanges:relatedActions.map(decisionObservedChange),
        importanceReasons:[],confidence:endpointOnly?'observed-endpoints':'observed',unknownFields,
        relatedActionIds:relatedActions.map(x=>x.id),relatedObservedEpisodeIds:relatedEpisodes.map(x=>x.id),reviewPointIds:[],
        causalAttribution:false,unresolved:unresolved.length?unresolved:['同一行動か','使用カード','効果源・ダメージ源','行動順']
      };
      windows.set(key,row)
    }
    if(!row.reviewPointIds.includes(point.id))row.reviewPointIds.push(point.id);
    const reason=point.detail||point.title||point.kind||'振り返り候補';
    if(!row.importanceReasons.includes(reason))row.importanceReasons.push(reason)
  }
  return[...windows.values()].sort((a,b)=>(finite(a.reviewStart)??Infinity)-(finite(b.reviewStart)??Infinity))
}
function attachDecisionWindows(reviewPoints=[],decisionWindows=[]){
  const byPoint=new Map();
  for(const window of decisionWindows||[])for(const id of window?.reviewPointIds||[])if(!byPoint.has(id))byPoint.set(id,window);
  return(reviewPoints||[]).map(point=>{
    const window=byPoint.get(point.id);
    if(!window)return point;
    return{...point,decisionWindowId:window.id,reviewStart:window.reviewStart,reviewEnd:window.reviewEnd,beforeState:clone(window.beforeState),afterState:clone(window.afterState),
      observedChanges:clone(window.observedChanges),importanceReason:point.detail||point.title||point.kind||null,confidence:window.confidence,
      unknownFields:clone(window.unknownFields),relatedActionIds:clone(window.relatedActionIds),relatedObservedEpisodeIds:clone(window.relatedObservedEpisodeIds),
      causalAttribution:false,unresolved:clone(window.unresolved)}
  })
}
function rebuildDerived(){
  const s=ensureCurrent();if(!s)return null;
  s.states.sort((a,b)=>(finite(a.time)??Infinity)-(finite(b.time)??Infinity));
  const actions=deriveTimelineActions(s.states),rawObservationReviewPoints=deriveObservationReviewPoints(actions);
  s.actions=actions;
  s.observedEpisodes=deriveObservedEpisodes(actions);
  s.decisionWindows=deriveDecisionWindows(rawObservationReviewPoints,actions,s.observedEpisodes,s.states);
  s.observationReviewPoints=attachDecisionWindows(rawObservationReviewPoints,s.decisionWindows);
  s.supplementalReviewPoints=deriveSupplementalReviewPoints(s.reviewSignals||[]);
  s.reviewPoints=mergeReviewPoints(s.observationReviewPoints,s.supplementalReviewPoints);
  return s
}

function ingestState(capture){
  const s=ensureCurrent(),row=normalizeCapture(capture);if(!s||!row)return null;
  const ix=s.states.findIndex(x=>x.id===row.id);if(ix>=0)s.states[ix]=row;else s.states.push(row);
  rebuildDerived();schedulePersist();W.log('replay-session-state',{stateId:row.id,states:s.states.length,actions:s.actions.length,reviewPoints:s.reviewPoints.length});return row
}
function ingestReviewSignal(detail){
  const s=ensureCurrent();if(!s||!detail||detail.status==='profile-disabled')return null;
  const time=finite(detail.atSeconds),turn=finite(detail.turn),routes=Array.isArray(detail.lethalRoutes)?detail.lethalRoutes.slice():[],key=[turn,time==null?'x':time.toFixed(1),detail.reviewProfile||'none',detail.status||'',routes.join('|')].join(':');
  const row={id:'ev:'+key,kind:'lethal',time,turn,reviewProfile:detail.reviewProfile||'none',status:detail.status||'unknown',lethalRoutes:routes,unknown:Array.isArray(detail.unknown)?detail.unknown.slice():[]};
  const ix=s.reviewSignals.findIndex(x=>x.id===row.id);if(ix>=0)s.reviewSignals[ix]=row;else s.reviewSignals.push(row);
  rebuildDerived();schedulePersist();return row
}
async function ingestScene(scene){
  const s=ensureCurrent();if(!s||!scene)return null;const imageKey=`${s.sourceKey}|${scene.id}`,meta={id:scene.id,turn:scene.turn??null,time:finite(scene.time),playOrder:scene.playOrder||null,matchup:scene.matchup||null,deck:scene.deck||null,note:scene.note||null,imageKey};
  const ix=s.scenes.findIndex(x=>x.id===meta.id);if(ix>=0)s.scenes[ix]=meta;else s.scenes.push(meta);
  const signal={id:'scene:'+meta.id,kind:'manual-scene',time:meta.time,turn:meta.turn,note:meta.note};if(!s.reviewSignals.some(x=>x.id===signal.id))s.reviewSignals.push(signal);
  rebuildDerived();if(scene.blob)await dbPut(SCENE_STORE,{key:imageKey,sourceKey:s.sourceKey,sceneId:scene.id,blob:scene.blob});await schedulePersist();return meta
}
async function clearScenes(sceneIds=[]){
  const s=ensureCurrent();if(!s)return false;const ids=new Set(sceneIds||[]),removed=s.scenes.filter(x=>!ids.size||ids.has(x.id));s.scenes=s.scenes.filter(x=>ids.size&&!ids.has(x.id));s.reviewSignals=(s.reviewSignals||[]).filter(x=>x.kind!=='manual-scene'||!removed.some(y=>'scene:'+y.id===x.id));for(const row of removed)if(row.imageKey)await dbDelete(SCENE_STORE,row.imageKey);rebuildDerived();await schedulePersist();return true
}
function ingestReviewState(detail){const s=ensureCurrent();if(!s)return null;s.tacticalReview=clone(detail||null);schedulePersist();return s.tacticalReview}
function ingestPostprocess(){const s=ensureCurrent();if(!s)return null;refreshMetadata();schedulePersist();return s}

async function restoreScenes(s){
  if(!s)return[];const rows=[];for(const meta of s.scenes||[]){const stored=meta.imageKey?await dbGet(SCENE_STORE,meta.imageKey):null,blob=stored?.blob||null,url=blob&&typeof URL?.createObjectURL==='function'?URL.createObjectURL(blob):null;rows.push({...clone(meta),blob,url})}return rows
}
async function restoreCurrent(){
  const key=sourceKey();if(!key)return null;const loaded=await dbGet(SESSION_STORE,key);if(sourceKey()!==key)return null;const migrated=migrateLoadedSession(loaded,key);current=migrated.session;rebuildDerived();if(migrated.migrated){W.log('replay-session-migrate',{sourceKey:key,fromVersion:loaded?.version||null,toVersion:SESSION_SCHEMA,reason:migrated.reason});await dbPut(SESSION_STORE,sessionForStorage(current))}
  const old=W.scenes||[];for(const s of old)if(s?.url&&typeof URL?.revokeObjectURL==='function')URL.revokeObjectURL(s.url);
  W.scenes=await restoreScenes(current);if(typeof W.renderScenes==='function')W.renderScenes();refreshMetadata();expose();render();W.log('replay-session-restore',{sourceKey:key,restored:!!loaded,states:current.states.length,reviewPoints:current.reviewPoints.length,scenes:current.scenes.length,persistence:persistenceMode()});return snapshot()
}
function snapshot(){return current?sessionForStorage(current):null}

function actionLabel(a){if(a.type==='opponent-hp-change')return`相手HP ${a.data.from} → ${a.data.to}`;if(a.type==='pp-change')return`PP ${a.data.from} → ${a.data.to}`;if(a.type==='resource-change')return`${a.data.resource}: ${a.data.from} → ${a.data.to}`;if(a.type==='ward-change')return`守護: ${a.data.from} → ${a.data.to}`;if(a.type==='board-damage-change')return`盤面打点 ${a.data.from} → ${a.data.to}`;if(a.type==='turn-transition')return`${a.data.fromTurn??'?'}T → ${a.data.toTurn??'?'}T`;return'観測間隔が空いているため詳細は推定しません'}
const REVIEW_FIELD_LABELS=Object.freeze({pp:'PP',opponentHP:'相手HP',extraPP:'ExPP',ep:'EP',sep:'SEP',opponentWard:'相手守護',boardDamage:'盤面打点',state:'状態'});
function reviewFlag(v){return v==='yes'?'使用可':v==='no'?'使用不可':'未確認'}
function reviewWard(v){return v==='present'?'あり確認':v==='none'?'なし確認':'未確認'}
function reviewChangedKeys(changes=[]){
  const out=new Set();
  for(const a of Array.isArray(changes)?changes:[]){
    if(a?.type==='pp-change')out.add('pp');
    else if(a?.type==='opponent-hp-change')out.add('opponentHP');
    else if(a?.type==='ward-change')out.add('opponentWard');
    else if(a?.type==='board-damage-change')out.add('boardDamage');
    else if(a?.type==='resource-change'){
      const k=String(a?.data?.resource||'').toLowerCase();
      if(k==='extrapp'||k==='extra-pp'||k==='extra_pp')out.add('extraPP');
      else if(k==='ep')out.add('ep');
      else if(k==='sep')out.add('sep');
    }
  }
  return out
}
function reviewStateRows(state,changedKeys=[]){
  const s=state||{},r=s.resources||{},boardKnown=s.boardDamageKnown===true&&finite(s.boardDamage)!=null,changed=new Set(changedKeys||[]);
  return[
    {key:'pp',label:'PP',value:finite(s.pp)==null?'未確認':String(finite(s.pp)),changed:changed.has('pp')},
    {key:'opponentHP',label:'相手HP',value:finite(s.opponentHP)==null?'未確認':String(finite(s.opponentHP)),changed:changed.has('opponentHP')},
    {key:'extraPP',label:'ExPP',value:reviewFlag(r.extraPP),changed:changed.has('extraPP')},
    {key:'ep',label:'EP',value:reviewFlag(r.ep),changed:changed.has('ep')},
    {key:'sep',label:'SEP',value:reviewFlag(r.sep),changed:changed.has('sep')},
    {key:'opponentWard',label:'相手守護',value:reviewWard(s.opponentWard),changed:changed.has('opponentWard')},
    {key:'boardDamage',label:'盤面打点',value:boardKnown?String(finite(s.boardDamage)):'未確認',changed:changed.has('boardDamage')}
  ]
}
function reviewWindowModels(session=current){
  const s=session||{},pointById=new Map((s.observationReviewPoints||[]).map(x=>[x.id,x]));
  return(s.decisionWindows||[]).map(window=>{
    const points=(window.reviewPointIds||[]).map(id=>pointById.get(id)).filter(Boolean),first=points[0]||null,
      observedChanges=clone(window.observedChanges||[]),changedKeys=[...reviewChangedKeys(observedChanges)],
      model={
        id:window.id,turn:window.turn??first?.turn??null,reviewStart:finite(window.reviewStart),reviewEnd:finite(window.reviewEnd),
        title:first?.title||'重要な状態変化',priority:first?.priority||'review',
        beforeState:clone(window.beforeState),afterState:clone(window.afterState),
        beforeRows:reviewStateRows(window.beforeState,changedKeys),afterRows:reviewStateRows(window.afterState,changedKeys),
        observedChanges,changedKeys,importanceReasons:clone(window.importanceReasons||[]),
        confidence:window.confidence||'observed',unknownFields:clone(window.unknownFields||[]),
        unresolved:clone(window.unresolved||[]),causalAttribution:false,reviewPointIds:clone(window.reviewPointIds||[])
      };
    model.coach=typeof W.ReviewEngine?.deriveWindowCoach==='function'?W.ReviewEngine.deriveWindowCoach(model):null;
    model.cardUseCandidates=typeof W.ReviewEngine?.deriveCardUseCandidates==='function'?W.ReviewEngine.deriveCardUseCandidates(model):[];
    return model
  })
}
function reviewComparisonRows(model){
  const before=new Map((model?.beforeRows||[]).map(x=>[x.key,x])),after=new Map((model?.afterRows||[]).map(x=>[x.key,x])),
    order=(model?.beforeRows||[]).map(x=>x.key);
  for(const row of model?.afterRows||[])if(!order.includes(row.key))order.push(row.key);
  return order.map(key=>{const b=before.get(key)||{},a=after.get(key)||{};return{key,label:b.label||a.label||REVIEW_FIELD_LABELS[key]||key,before:b.value??'未確認',after:a.value??'未確認',changed:!!(b.changed||a.changed)}})
}
function renderReviewValue(value){return value==='未確認'?'<span class="reviewUnknown">未確認</span>':`<span class="reviewComparisonValue">${W.escape(value)}</span>`}
function renderReviewComparison(model){
  const rows=reviewComparisonRows(model);
  return`<div class="reviewComparison"><div class="reviewComparisonTitle">状態比較</div><div class="reviewComparisonTable"><div class="reviewComparisonRow reviewComparisonHead"><span>項目</span><span>判断直前</span><span>変化後</span></div>${rows.map(r=>`<div class="reviewComparisonRow ${r.changed?'isChanged':'isQuiet'}" data-review-state-key="${W.escape(r.key)}"><span class="reviewComparisonLabel">${W.escape(r.label)}</span>${renderReviewValue(r.before)}${renderReviewValue(r.after)}</div>`).join('')}</div></div>`
}
function reviewFrameButton(label,time,phase){const t=finite(time);return t==null?'':`<button type="button" class="reviewFrameButton" data-review-frame-time="${t}" data-review-frame-phase="${W.escape(phase)}">${W.escape(label)}</button>`}
function renderWindowCoach(coach){
  if(!coach)return'';
  const facts=(coach.facts||[]).map(x=>`<li>${W.escape(x)}</li>`).join(''),
    thinking=(coach.focus||[]).filter((x,i,a)=>x&&a.indexOf(x)===i).map(x=>`<li>${W.escape(x)}</li>`).join(''),
    cautions=(coach.cautions||[]).map(x=>`<li>${W.escape(x)}</li>`).join('');
  return`<details class="reviewCoach" open><summary><b>戦術コーチ</b></summary><div class="reviewCoachBody">${facts?`<div class="reviewCoachFacts"><b>観測事実</b><ul>${facts}</ul></div>`:''}${thinking?`<div><b>考えるポイント</b><ul>${thinking}</ul></div>`:''}<div class="reviewCoachCaution"><div><b>まだ判断できないこと</b> <span class="reviewUncertainLabel">評価保留</span></div>${cautions?`<ul>${cautions}</ul>`:''}<p>${W.escape(coach.judgementReason||'観測だけではプレイの良否や最善手を断定しません。')}</p></div></div></details>`
}
function renderCardUseCandidates(candidates=[]){
  if(!Array.isArray(candidates)||!candidates.length)return'';
  return`<div class="cardUseCandidate"><b>候補カード使用（未確定）</b>${candidates.map(c=>`<div class="cardUseCandidateRow"><strong>${W.escape(c.label||c.cardId||'候補')}</strong><span>判断直前の高信頼認識 + 同一区間PP消費一致</span><small>${W.escape(c.warning||'このカードを使用した確定ではありません。')}</small></div>`).join('')}</div>`
}
function renderDecisionWindowCard(model){
  const changeLabels=model.observedChanges?.length?model.observedChanges.map(actionLabel):[],
    changes=changeLabels.length?changeLabels.map(x=>`<li>${W.escape(x)}</li>`).join(''):'<li><span class="reviewUnknown">詳細な状態変化は未確認</span></li>',
    normalized=s=>String(s||'').replace(/[\s：:・。]/g,''),
    changeSet=new Set(changeLabels.map(normalized)),
    reasons=(model.importanceReasons||[]).filter(x=>!changeSet.has(normalized(x))),
    reasonHtml=reasons.length?`<div class="reviewReasonCompact"><b>重要とした理由</b><ul>${reasons.map(x=>`<li>${W.escape(x)}</li>`).join('')}</ul></div>`:`<div class="reviewReasonCompact"><b>重要判定</b>：${W.escape(model.title||'状態変化')}</div>`,
    unknown=(model.unknownFields||[]).map(x=>REVIEW_FIELD_LABELS[x]||x),
    unresolved=(model.unresolved||[]),
    confidence=model.confidence==='observed-endpoints'?'端点観測':model.confidence==='observed'?'観測':'確認値',
    videoAction=finite(model.reviewStart)==null?'':`<div class="reviewVideoAction"><button type="button" data-review-video-window="${W.escape(model.id||'')}">この局面を動画で見る</button><small>3秒前から再生</small></div>`,
    frames=`<div class="reviewFrameActions">${reviewFrameButton('直前フレーム',model.reviewStart,'before')}${reviewFrameButton('変化後フレーム',model.reviewEnd,'after')}</div>`;
  return`<article class="reviewWindow" data-review-window-id="${W.escape(model.id||'')}"><div class="reviewWindowHeader"><div><span class="badge">${W.escape(model.priority)}</span><b>${W.escape(model.title)}</b></div><div class="reviewWindowTime">${model.turn?W.escape(model.turn+'T'):'局面'} / ${model.reviewStart==null?'--:--.-':W.fmt(model.reviewStart)} → ${model.reviewEnd==null?'--:--.-':W.fmt(model.reviewEnd)}</div></div><div class="reviewObservationSummary"><b>観測した変化</b><ul>${changes}</ul></div>${videoAction}${renderReviewComparison(model)}${frames}${reasonHtml}${renderCardUseCandidates(model.cardUseCandidates)}${renderWindowCoach(model.coach)}<div class="reviewWindowMeta"><span>確度: ${W.escape(confidence)}</span></div>${unknown.length?`<div class="reviewUncertain"><span class="reviewUncertainLabel">未確認</span>${W.escape(unknown.join(' / '))}</div>`:''}${unresolved.length?`<div class="reviewUnresolved reviewUncertain"><span class="reviewUncertainLabel">断定不可</span><b>断定していない項目:</b> ${W.escape(unresolved.join(' / '))}</div>`:''}</article>`
}
async function previewSeekTo(time,reason='review-frame-preview'){
  const v=W.video,t=finite(time);if(t==null||!v||!Number.isFinite(v.duration))throw new Error('動画未読込');
  const target=Math.max(0,Math.min(Math.max(0,v.duration-.05),t));
  if(Math.abs(Number(v.currentTime)-target)<=.025){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return +Number(v.currentTime).toFixed(3)}
  W.previewSeekCount=(W.previewSeekCount||0)+1;W.previewSeekReasons=W.previewSeekReasons||{};W.previewSeekReasons[reason]=(W.previewSeekReasons[reason]||0)+1;
  W.log?.('preview-seek-start',{reason,target,from:Number.isFinite(Number(v.currentTime))?+Number(v.currentTime).toFixed(3):null});
  return await new Promise((resolve,reject)=>{let done=false,poll=null;const cleanup=()=>{v.removeEventListener('seeked',onSeek);clearTimeout(timer);if(poll!==null)clearInterval(poll)},finish=(ok,err,completion='seeked')=>{if(done)return;done=true;cleanup();if(ok){W.log?.('preview-seek-complete',{reason,target,actual:+Number(v.currentTime).toFixed(3),completion});requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(+Number(v.currentTime).toFixed(3))))}else reject(err||new Error('閲覧用シーク失敗'))},check=completion=>{if(W.seekPositionReached?.(v,target)??(Math.abs(Number(v.currentTime)-target)<=.06&&!v.seeking)){finish(true,null,completion);return true}return false},onSeek=()=>finish(true,null,'seeked'),timer=setTimeout(()=>{if(!check('timeout-currentTime'))finish(false,new Error(`閲覧用シーク失敗: ${reason}`),'timeout')},3500);v.addEventListener('seeked',onSeek,{once:true});poll=setInterval(()=>check('currentTime-fallback'),80);v.currentTime=target})
}
function closeReviewFrame(){
  const sheet=W.$('#reviewFrameSheet'),img=W.$('#reviewFrameImage');if(sheet)sheet.classList.add('hidden');if(img)img.removeAttribute?.('src');return true
}
async function showReviewFrame(time,phase='before'){
  const t=finite(time),label=phase==='after'?'変化後':'判断直前',status=W.$('#reviewNavigationStatus'),sheet=W.$('#reviewFrameSheet'),img=W.$('#reviewFrameImage'),title=W.$('#reviewFrameTitle'),timeEl=W.$('#reviewFrameTime');
  if(t==null||!W.video||!Number.isFinite(W.video.duration)||W.task){if(status)status.textContent='動画を読み込み、解析処理完了後にフレームを確認できます。';return false}
  W.pauseVideo?.('review-frame-'+phase);const original=finite(W.video.currentTime);
  const capture=async()=>{await previewSeekTo(t,'review-frame-'+phase);const canvas=W.frameCanvas?.(1200);if(!canvas)throw new Error('静止フレームを取得できません');const src=canvas.toDataURL('image/jpeg',.92);if(original!=null&&Math.abs(original-t)>.025){try{await previewSeekTo(original,'review-frame-restore')}catch(err){W.log?.('preview-seek-restore-failed',{message:err?.message||String(err)})}}if(img)img.src=src;if(title)title.textContent=phase==='after'?'変化後フレーム':'直前フレーム';if(timeEl)timeEl.textContent=`${label} — ${W.fmt(t)}`;sheet?.classList.remove('hidden');if(status)status.textContent=`${label} ${W.fmt(t)} の静止フレームを表示しています。`;W.log?.('review-frame-preview',{phase,time:+t.toFixed(3)});return true};
  try{return typeof W.runTask==='function'?await W.runTask('フレーム確認',capture,{lockText:`${label}フレームを取得しています。`}):await capture()}
  catch(err){if(status)status.textContent='フレーム確認エラー: '+(err?.message||String(err));return false}
}
async function seekReviewWindow(time,phase='before'){return showReviewFrame(time,phase)}

function reviewPlaybackModels(session=current){return reviewWindowModels(session).slice(-12)}
function updateReviewPlaybackUi(){
  const box=W.$('#reviewPlayback'),pos=W.$('#reviewPointPosition'),prev=W.$('#reviewPointPrev'),next=W.$('#reviewPointNext'),models=reviewPlaybackModels();
  if(box){box.classList.toggle('reviewPlaybackActive',reviewPlaybackReady);box.setAttribute('aria-hidden',reviewPlaybackReady?'false':'true')}
  if(models.length)activeReviewPlaybackIndex=Math.max(0,Math.min(models.length-1,activeReviewPlaybackIndex));else activeReviewPlaybackIndex=0;
  if(pos)pos.textContent=`振り返りポイント ${models.length?activeReviewPlaybackIndex+1:0} / ${models.length}`;
  if(prev)prev.disabled=!reviewPlaybackReady||models.length<2||activeReviewPlaybackIndex<=0;
  if(next)next.disabled=!reviewPlaybackReady||models.length<2||activeReviewPlaybackIndex>=models.length-1;
  return{ready:reviewPlaybackReady,index:activeReviewPlaybackIndex,count:models.length}
}
function setReviewPlaybackReady(ready){reviewPlaybackReady=!!ready;if(!reviewPlaybackReady)W.pauseVideo?.('review-playback-hide');return updateReviewPlaybackUi()}
async function playReviewWindow(windowId){
  const status=W.$('#reviewNavigationStatus'),models=reviewPlaybackModels(),index=models.findIndex(x=>String(x.id||'')===String(windowId||''));
  if(index<0||!W.video||!Number.isFinite(W.video.duration)||W.task){if(status)status.textContent='解析完了後に振り返り動画を確認できます。';return false}
  activeReviewPlaybackIndex=index;setReviewPlaybackReady(true);
  const model=models[index],start=finite(model.reviewStart)??finite(model.reviewEnd);if(start==null)return false;
  const target=Math.max(0,start-REVIEW_PLAYBACK_LEAD);W.pauseVideo?.('review-playback-select');
  try{
    await previewSeekTo(target,'review-playback-window');
    W.$('#reviewPlayback')?.scrollIntoView?.({behavior:'smooth',block:'start'});
    let played=false;if(typeof W.video.play==='function'){try{await W.video.play();played=true}catch{}}
    if(status)status.textContent=`振り返りポイント ${index+1}/${models.length}：${model.turn?model.turn+'T / ':''}${W.fmt(start)} の3秒前から${played?'再生しています。':'確認できます。'}`;
    W.log?.('review-playback',{windowId:model.id||null,index:index+1,count:models.length,reviewStart:+start.toFixed(3),target:+target.toFixed(3),autoplay:played});
    updateReviewPlaybackUi();return true
  }catch(err){if(status)status.textContent='振り返り動画の移動エラー: '+(err?.message||String(err));return false}
}
async function moveReviewPlayback(delta){
  const models=reviewPlaybackModels();if(!models.length)return false;
  const next=Math.max(0,Math.min(models.length-1,activeReviewPlaybackIndex+Number(delta||0)));
  return playReviewWindow(models[next]?.id)
}

function bindReviewNavigation(){
  const root=W.$('#reviewPoints'),sheet=W.$('#reviewFrameSheet'),close=W.$('#reviewFrameClose'),prev=W.$('#reviewPointPrev'),next=W.$('#reviewPointNext');if(!root)return false;
  if(root.dataset.reviewNavigationBound!=='1'){root.dataset.reviewNavigationBound='1';root.addEventListener('click',e=>{const videoButton=e.target?.closest?.('[data-review-video-window]');if(videoButton&&root.contains(videoButton)){playReviewWindow(videoButton.dataset.reviewVideoWindow);return}const b=e.target?.closest?.('[data-review-frame-time]');if(!b||!root.contains(b))return;showReviewFrame(b.dataset.reviewFrameTime,b.dataset.reviewFramePhase||'before')})}
  if(prev&&prev.dataset.reviewPlaybackBound!=='1'){prev.dataset.reviewPlaybackBound='1';prev.addEventListener('click',()=>moveReviewPlayback(-1))}
  if(next&&next.dataset.reviewPlaybackBound!=='1'){next.dataset.reviewPlaybackBound='1';next.addEventListener('click',()=>moveReviewPlayback(1))}
  if(close&&close.dataset.reviewFrameBound!=='1'){close.dataset.reviewFrameBound='1';close.addEventListener('click',closeReviewFrame)}
  if(sheet&&sheet.dataset.reviewFrameBound!=='1'){sheet.dataset.reviewFrameBound='1';sheet.addEventListener('click',e=>{if(e.target===sheet)closeReviewFrame()})}
  updateReviewPlaybackUi();return true
}
function renderSupplementalPoint(x){return`<div class="branchItem"><b>${x.turn?x.turn+'T':'局面'}</b><div><span class="badge">${W.escape(x.priority)}</span>${W.escape(x.title)}<br><span class="muted">${x.time==null?'--:--.-':W.fmt(x.time)} / ${W.escape(x.detail||'')}</span></div></div>`}
function render(){
  const s=current,status=W.$('#replaySessionStatus'),rp=W.$('#reviewPoints'),ep=W.$('#observedEpisodes'),at=W.$('#actionTimeline');if(status)status.textContent=s?`保存: ${persistenceMode()==='indexeddb'?'端末内': 'この画面のみ'} / 状態 ${s.states.length} / 観測区間 ${(s.observedEpisodes||[]).length} / 状態変化 ${s.actions.length} / 振り返り候補 ${s.reviewPoints.length}（観測 ${(s.observationReviewPoints||[]).length} / 補助 ${(s.supplementalReviewPoints||[]).length}）`:'動画を読み込むと試合単位で記録します。';
  if(rp){
    const windows=reviewWindowModels(s).slice(-12),supplemental=(s?.supplementalReviewPoints||[]).slice(-8),coachItems=windows.filter(x=>x.coach).map(x=>clone(x.coach)),
      cardUseItems=windows.flatMap(x=>clone(x.cardUseCandidates||[]));
    window.__wbReviewCoachV1={version:'review-window-coach-v1',sourceKey:s?.sourceKey||null,basis:'observation-only',count:coachItems.length,items:coachItems};
    window.__wbCardUseCandidateV1={version:'card-use-candidate-v1',sourceKey:s?.sourceKey||null,basis:'positive-before-hand+same-window-pp-cost-match',count:cardUseItems.length,items:cardUseItems};
    const windowHtml=windows.length?windows.map(renderDecisionWindowCard).join(''):'<p class="help">まだ安全に確定したDecision Windowはありません。</p>',
      supplementalHtml=supplemental.length?`<details class="tacticalEditor"><summary>補助の振り返り候補 ${supplemental.length}件</summary><div class="tacticalBody">${supplemental.map(renderSupplementalPoint).join('')}</div></details>`:'';
    rp.innerHTML=(windows.length||supplemental.length)?windowHtml+supplementalHtml:'<p class="help">まだ自動抽出された振り返り候補はありません。状態取得や局面保存を行うと追加されます。</p>';bindReviewNavigation()
  }
  if(ep)ep.innerHTML=s?.observedEpisodes?.length?s.observedEpisodes.slice(-12).map(x=>`<div class="branchItem"><b>${x.turn?x.turn+'T':'-'}</b><div><b>${W.escape(x.summary||'観測区間')}</b><br><span class="muted">${x.time==null?'--:--.-':W.fmt(x.time)} / ${W.escape(x.interpretation||'')}</span></div></div>`).join(''):'<p class="help">同一ターン内で複数の確定状態を取得すると、観測区間ごとの変化をまとめます。</p>';
  if(at)at.innerHTML=s?.actions?.length?s.actions.slice(-20).map(x=>`<div class="branchItem"><b>${x.turn?x.turn+'T':'-'}</b><div>${W.escape(actionLabel(x))}<br><span class="muted">${x.time==null?'--:--.-':W.fmt(x.time)} / ${W.escape(x.confidence)}</span></div></div>`).join(''):'<p class="help">連続した状態取得がまだありません。3秒以内の同一ターン観測だけを詳細な状態変化として扱います。</p>'
}

W.ReplaySession={version:VERSION,schema:SESSION_SCHEMA,dbName:DB_NAME,persistenceMode,emptySession,migrateLoadedSession,normalizeCapture,deriveActions,deriveTimelineActions,deriveObservedEpisodes,observedEpisodeInterpretation,deriveObservationReviewPoints,deriveSupplementalReviewPoints,mergeReviewPoints,deriveReviewPoints,deriveDecisionWindows,attachDecisionWindows,reviewChangedKeys,reviewStateRows,reviewComparisonRows,reviewWindowModels,reviewPlaybackModels,renderReviewComparison,renderWindowCoach,renderCardUseCandidates,renderDecisionWindowCard,previewSeekTo,showReviewFrame,closeReviewFrame,seekReviewWindow,setReviewPlaybackReady,updateReviewPlaybackUi,playReviewWindow,moveReviewPlayback,bindReviewNavigation,ingestState,ingestReviewSignal,ingestScene,clearScenes,ingestReviewState,restoreCurrent,snapshot,rebuildDerived,render,flushDeferredRender};

W.on('metadata',()=>{restoreCurrent().catch(err=>W.recordError('replay-session-restore',err))});
W.on('timeline',detail=>{const s=ensureCurrent();if(s){s.turnTimeline=clone(detail?.timeline||W.turnTimeline||[]);schedulePersist()}});
W.on('postprocess-complete',()=>ingestPostprocess());
W.on('state-captured',detail=>ingestState(detail?.capture));
W.on('review-evaluated',detail=>ingestReviewSignal(detail));
W.on('review-state-changed',detail=>ingestReviewState(detail));
W.on('review-profile-changed',()=>{const s=ensureCurrent();if(s){refreshMetadata();schedulePersist()}});
W.on('scene-saved',detail=>{ingestScene(detail?.scene).catch(err=>W.recordError('replay-session-scene-save',err))});
W.on('scenes-cleared',detail=>{clearScenes(detail?.sceneIds||[]).catch(err=>W.recordError('replay-session-scenes-clear',err))});
W.on('task-finished',()=>flushDeferredRender());
W.on('match-analysis-start',()=>{reviewPlaybackReady=false;activeReviewPlaybackIndex=0;updateReviewPlaybackUi()});
W.on('match-analysis-complete',detail=>{reviewPlaybackReady=!detail?.cancelled;activeReviewPlaybackIndex=0;updateReviewPlaybackUi()});
W.on('video-reset',()=>{current=null;renderDeferred=false;reviewPlaybackReady=false;activeReviewPlaybackIndex=0;closeReviewFrame();updateReviewPlaybackUi();expose();render()});
W.onReady(()=>{render();W.log('module-ready',{module:'replay-session',version:VERSION,persistence:persistenceMode(),maxContiguousGap:MAX_CONTIGUOUS_GAP,turnIdentity:'number+side',unknownSafe:true,nullNumericSafe:true,unknownHpBridge:'same-turn-observed-endpoints<=3s',observedEpisodes:'same-state-pair-noncausal-summary',causalAttribution:false,reviewPointDomains:'observation+supplemental-merged',decisionWindows:'same-turn-state-pair<=3s-noncausal',reviewWindowUi:'before-after-observed-importance-unknown-noncausal-navigation+coach-v1',reviewWindowPresentation:'diff-first-comparison+static-frame-preview+unknown-amber+coach-v1',cardUseCandidate:'two-evidence-candidate-only-no-action-v1',reviewPlayback:'post-analysis-video+3s-lead+preview-seek-only-v1',taskRenderCoalescing:true,sessionSchema:SESSION_SCHEMA})});
})();
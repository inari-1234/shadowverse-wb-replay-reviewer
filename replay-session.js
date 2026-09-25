(()=>{'use strict';
const W=window.WB;if(!W)return;
const VERSION='replay-session-clean-1.1';
const DB_NAME='wb-replay-session-v1',DB_VERSION=1,SESSION_STORE='sessions',SCENE_STORE='scene-images',MAX_CONTIGUOUS_GAP=3;
W.registerModule('replay-session',VERSION);

const clone=x=>{try{return structuredClone(x)}catch{return x==null?x:JSON.parse(JSON.stringify(x))}};
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const nowIso=()=>new Date().toISOString();
let current=null,dbPromise=null,persistQueue=Promise.resolve();

function sourceKey(){return W.videoMeta?W.videoKey():null}
function emptySession(key=sourceKey()){return{
  version:'replay-session-v1',sourceKey:key,video:clone(W.videoMeta||null),createdAt:nowIso(),updatedAt:nowIso(),
  turnTimeline:clone(W.turnTimeline||[]),mulligan:clone(W.mulligan||null),classDetection:clone(W.classDetection||null),
  reviewProfile:W.ReviewEngine?.activeProfile?.()||'none',states:[],actions:[],reviewSignals:[],reviewPoints:[],scenes:[],tacticalReview:null
}}
function ensureCurrent(){const key=sourceKey();if(!key)return null;if(!current||current.sourceKey!==key)current=emptySession(key);return current}
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
  const stored=sessionForStorage(snap);expose();render();
  persistQueue=persistQueue.then(()=>dbPut(SESSION_STORE,stored)).catch(err=>{W.recordError('replay-session-persist',err);return false});
  return persistQueue
}

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
function deriveReviewPoints(actions=[],signals=[]){
  const rows=[];
  for(const a of actions){
    if(a.type==='opponent-hp-change'&&Math.abs(Number(a.data?.delta)||0)>=2)rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'high',kind:'large-hp-change',title:'大きなHP変化',detail:`相手HP ${a.data.from} → ${a.data.to}`});
    if(a.type==='resource-change'&&a.data?.from==='yes'&&a.data?.to==='no')rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'high',kind:'resource-used',title:'重要資源の変化',detail:`${a.data.resource} が使用可 → 使用不可`});
    if(a.type==='board-damage-change'&&Math.abs(Number(a.data?.delta)||0)>=2)rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'medium',kind:'board-swing',title:'盤面打点の大きな変化',detail:`攻撃可能打点 ${a.data.from} → ${a.data.to}`});
    if(a.type==='ward-change')rows.push({id:'rp:'+a.id,source:'action',sourceId:a.id,time:a.time,turn:a.turn,priority:'medium',kind:'ward-change',title:'守護状態の変化',detail:`${a.data.from} → ${a.data.to}`});
  }
  for(const s of signals){
    if(s.kind==='lethal'&&s.status==='confirmed-lethal')rows.push({id:'rp:'+s.id,source:'review',sourceId:s.id,time:s.time,turn:s.turn,priority:'critical',kind:'lethal-available',title:'リーサル候補を確認',detail:(s.lethalRoutes||[]).join(' / ')||'既知ルートでリーサル'});
    if(s.kind==='manual-scene')rows.push({id:'rp:'+s.id,source:'manual',sourceId:s.id,time:s.time,turn:s.turn,priority:'manual',kind:'saved-scene',title:'保存した局面',detail:s.note||'ユーザーが見返し対象として保存'});
  }
  const weight={critical:4,high:3,medium:2,manual:1};return rows.sort((a,b)=>(finite(a.time)??Infinity)-(finite(b.time)??Infinity)||((weight[b.priority]||0)-(weight[a.priority]||0)))
}
function rebuildDerived(){const s=ensureCurrent();if(!s)return null;s.states.sort((a,b)=>(finite(a.time)??Infinity)-(finite(b.time)??Infinity));const actions=[];for(let i=1;i<s.states.length;i++)actions.push(...deriveActions(s.states[i-1],s.states[i]));s.actions=actions;s.reviewPoints=deriveReviewPoints(actions,s.reviewSignals||[]);return s}

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
  const key=sourceKey();if(!key)return null;const loaded=await dbGet(SESSION_STORE,key);if(sourceKey()!==key)return null;current=loaded?{...emptySession(key),...clone(loaded),sourceKey:key}:emptySession(key);rebuildDerived();
  const old=W.scenes||[];for(const s of old)if(s?.url&&typeof URL?.revokeObjectURL==='function')URL.revokeObjectURL(s.url);
  W.scenes=await restoreScenes(current);if(typeof W.renderScenes==='function')W.renderScenes();refreshMetadata();expose();render();W.log('replay-session-restore',{sourceKey:key,restored:!!loaded,states:current.states.length,reviewPoints:current.reviewPoints.length,scenes:current.scenes.length,persistence:persistenceMode()});return snapshot()
}
function snapshot(){return current?sessionForStorage(current):null}

function actionLabel(a){if(a.type==='opponent-hp-change')return`相手HP ${a.data.from} → ${a.data.to}`;if(a.type==='pp-change')return`PP ${a.data.from} → ${a.data.to}`;if(a.type==='resource-change')return`${a.data.resource}: ${a.data.from} → ${a.data.to}`;if(a.type==='ward-change')return`守護: ${a.data.from} → ${a.data.to}`;if(a.type==='board-damage-change')return`盤面打点 ${a.data.from} → ${a.data.to}`;if(a.type==='turn-transition')return`${a.data.fromTurn??'?'}T → ${a.data.toTurn??'?'}T`;return'観測間隔が空いているため詳細は推定しません'}
function render(){
  const s=current,status=W.$('#replaySessionStatus'),rp=W.$('#reviewPoints'),at=W.$('#actionTimeline');if(status)status.textContent=s?`保存: ${persistenceMode()==='indexeddb'?'端末内': 'この画面のみ'} / 状態 ${s.states.length} / 状態変化 ${s.actions.length} / 振り返り候補 ${s.reviewPoints.length}`:'動画を読み込むと試合単位で記録します。';
  if(rp)rp.innerHTML=s?.reviewPoints?.length?s.reviewPoints.slice(-12).map(x=>`<div class="branchItem"><b>${x.turn?x.turn+'T':'局面'}</b><div><span class="badge">${W.escape(x.priority)}</span>${W.escape(x.title)}<br><span class="muted">${x.time==null?'--:--.-':W.fmt(x.time)} / ${W.escape(x.detail||'')}</span></div></div>`).join(''):'<p class="help">まだ自動抽出された振り返り候補はありません。状態取得や局面保存を行うと追加されます。</p>';
  if(at)at.innerHTML=s?.actions?.length?s.actions.slice(-20).map(x=>`<div class="branchItem"><b>${x.turn?x.turn+'T':'-'}</b><div>${W.escape(actionLabel(x))}<br><span class="muted">${x.time==null?'--:--.-':W.fmt(x.time)} / ${W.escape(x.confidence)}</span></div></div>`).join(''):'<p class="help">連続した状態取得がまだありません。3秒以内の同一ターン観測だけを詳細な状態変化として扱います。</p>'
}

W.ReplaySession={version:VERSION,dbName:DB_NAME,persistenceMode,emptySession,normalizeCapture,deriveActions,deriveReviewPoints,ingestState,ingestReviewSignal,ingestScene,clearScenes,ingestReviewState,restoreCurrent,snapshot,rebuildDerived,render};

W.on('metadata',()=>{restoreCurrent().catch(err=>W.recordError('replay-session-restore',err))});
W.on('timeline',detail=>{const s=ensureCurrent();if(s){s.turnTimeline=clone(detail?.timeline||W.turnTimeline||[]);schedulePersist()}});
W.on('postprocess-complete',()=>ingestPostprocess());
W.on('state-captured',detail=>ingestState(detail?.capture));
W.on('review-evaluated',detail=>ingestReviewSignal(detail));
W.on('review-state-changed',detail=>ingestReviewState(detail));
W.on('review-profile-changed',()=>{const s=ensureCurrent();if(s){refreshMetadata();schedulePersist()}});
W.on('scene-saved',detail=>{ingestScene(detail?.scene).catch(err=>W.recordError('replay-session-scene-save',err))});
W.on('scenes-cleared',detail=>{clearScenes(detail?.sceneIds||[]).catch(err=>W.recordError('replay-session-scenes-clear',err))});
W.on('video-reset',()=>{current=null;expose();render()});
W.onReady(()=>{render();W.log('module-ready',{module:'replay-session',version:VERSION,persistence:persistenceMode(),maxContiguousGap:MAX_CONTIGUOUS_GAP,turnIdentity:'number+side',unknownSafe:true})});
})();
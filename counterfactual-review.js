(()=>{'use strict';
const W=window.WB;if(!W)return;
const VERSION='counterfactual-review-clean-1.0',CS='wb-counterfactual-v1',LS='wb-lethal-v2';W.registerModule('counterfactual-review',VERSION);
const clone=x=>JSON.parse(JSON.stringify(x)),key=()=>W.videoMeta?`${W.videoMeta.name}|${W.videoMeta.size}|${W.videoMeta.lastModified}`:null,
  load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}},
  save=(k,x)=>{try{localStorage.setItem(k,JSON.stringify(x))}catch(e){W.recordError('counterfactual-persist',e)}};
let cd=load(CS,{sessions:{}}),cfDraft=null;
const ses=(db,make=true)=>{const k=key();if(!k)return null;db.sessions??={};if(make&&!db.sessions[k])db.sessions[k]={sourceKey:k,snapshots:[],branches:[]};return db.sessions[k]},
  val=id=>W.$(id)?.value??'',
  num=(id,d=null)=>{const raw=val(id);if(raw==='')return d;const x=Number(raw);return Number.isFinite(x)?x:d},
  parseFlags=raw=>{raw=String(raw??'').trim();if(!raw)return{known:false,values:[]};const values=raw.split(/[、,\s]+/).map(Number).filter(Number.isFinite);return{known:true,values}},
  state=()=>W.ReviewEngine?.state?.()||{},
  calculate=s=>W.ReviewEngine?.calculate?.(s)||{status:'incomplete-do-not-declare-no-lethal',lethalRoutes:[],unknown:['review-engine-unavailable']};
function expose(){const c=ses(cd,false);window.__wbCounterfactualV1={sourceKey:key(),branches:clone(c?.branches||[]),protocol:{independentState:true}};W.ReviewEngine?.publishReviewState?.()}
function cf(){return ses(cd)}
function branchEval(b){return b?.evaluation||b?.automation?.lethalResult||null}
function renderCf(){const o=W.$('#cfList'),q=cf()?.branches||[],p=W.$('#cfParent');if(p){const old=p.value;p.innerHTML='<option value="">親なし（起点）</option>'+q.map(b=>`<option value="${b.id}">${W.escape(b.name)} / ${b.state?.turn??'?'}T</option>`).join('');if(q.some(b=>b.id===old))p.value=old}if(o)o.innerHTML=q.map(b=>{const e=branchEval(b),txt=e?.lethalRoutes?.length?'リーサル候補 '+e.lethalRoutes.join(' / '):e?.status==='incomplete-do-not-declare-no-lethal'?'未確認あり':e?.status==='checked-no-lethal-in-covered-routes'?'主要既知ルート内リーサルなし':'';return`<div class="branchItem"><b>${W.escape(b.name)}</b><div>${b.state?.turn??'?'}T / 手番 ${W.escape(b.state?.sideToAct||'未設定')} / 判断時点 ${b.knowledgeCutoffSeconds??'?'}s${txt?`<br>${W.escape(txt)}`:''}</div></div>`}).join('');refreshAssist()}
function loadCurrentCf(){cfDraft={state:clone(state()),knowledgeCutoffSeconds:Number.isFinite(W.video?.currentTime)?+W.video.currentTime.toFixed(2):null};const st=W.$('#cfStatus');if(st)st.textContent=`現在のリーサル状態を分岐下書きへ取り込みました（${cfDraft.state.turn??'?'}T）。`;W.log('counterfactual-load-current',{turn:cfDraft.state.turn,cutoff:cfDraft.knowledgeCutoffSeconds})}
function newCf(){cfDraft=null;for(const id of ['#cfName','#cfNote']){const e=W.$(id);if(e)e.value=''}const p=W.$('#cfParent');if(p)p.value='';const side=W.$('#cfSide');if(side)side.value='自分';const kind=W.$('#cfKind');if(kind)kind.value='counterfactual';const st=W.$('#cfStatus');if(st)st.textContent='新しい分岐を入力できます。'}
function saveCf(){const q=cf(),name=String(val('#cfName')).trim();if(!q||!name){const st=W.$('#cfStatus');if(st)st.textContent='分岐名を入力してください。';return}const parentId=val('#cfParent')||null,parent=q.branches.find(b=>b.id===parentId);let s,cut;if(parent){s=clone(parent.state);cut=parent.knowledgeCutoffSeconds}else if(cfDraft){s=clone(cfDraft.state);cut=cfDraft.knowledgeCutoffSeconds}else{s=state();cut=Number.isFinite(W.video?.currentTime)?+W.video.currentTime.toFixed(2):null}if(cut==null)return;s.sideToAct=val('#cfSide')||'自分';const ev=calculate(s),b={id:'b'+Date.now().toString(36),name,kind:val('#cfKind')||'counterfactual',parentId,state:s,evaluation:{status:ev.status,lethalRoutes:ev.lethalRoutes,unknown:ev.unknown},knowledgeCutoffSeconds:cut,note:String(val('#cfNote')).trim(),origin:'clean-v4.11.0'};q.branches.push(b);save(CS,cd);cfDraft=null;expose();renderCf();W.$('#cfStatus').textContent=`「${name}」を独立状態として保存しました。`}
function sameTurnTemplate(src){const lethalDb=load(LS,{sessions:{}}),snaps=ses(lethalDb,false)?.snapshots||[];return snaps.filter(x=>+x.turn===+src?.state?.turn&&Number.isFinite(+x.pp)).slice(-1)[0]||null}
function renderAssistTemplate(){const q=cf(),src=q?.branches.find(b=>b.id===val('#asSource')),o=W.$('#asTemplate');if(!o)return;if(!src){o.textContent='相手手番の起点を選択してください。';return}const tpl=sameTurnTemplate(src);o.textContent=tpl?`資源テンプレート：${src.state?.turn??'?'}T / PP ${tpl.pp} / ExPP ${tpl.extraPP??'unknown'} / EP ${tpl.ep??'unknown'} / SEP ${tpl.sep??'unknown'}`:'同ターンの保存済みリーサル状態がないため、PP/ExPP/EP/SEPは推測しません。'}
function renderAssistResults(){const o=W.$('#asResults'),q=cf()?.branches.filter(b=>b.origin==='branch-assist-clean')||[];if(!o)return;o.innerHTML=q.slice(-6).reverse().map(b=>{const r=b.automation?.lethalResult||{};const txt=r.lethalRoutes?.length?'候補：'+r.lethalRoutes.join(' / '):r.status==='incomplete-do-not-declare-no-lethal'?'未確認：'+(r.unknown||[]).join(' / '):'主要既知ルート内ではリーサルなし';return`<div class="branchItem"><b>${W.escape(b.name)}</b><div>${W.escape(txt)}</div></div>`}).join('')}
function refreshAssist(){const s=W.$('#asSource'),q=cf()?.branches.filter(b=>b.state?.sideToAct==='相手')||[];if(!s)return;const old=s.value;s.innerHTML=q.map(b=>`<option value="${b.id}">${W.escape(b.name)} / ${b.state?.turn??'?'}T</option>`).join('')||'<option value="">相手手番の起点がありません</option>';if(q.some(b=>b.id===old))s.value=old;renderAssistTemplate();renderAssistResults()}
function assist(){const q=cf(),src=q?.branches.find(b=>b.id===val('#asSource')),name=String(val('#asName')).trim();if(!src||!name){const st=W.$('#asStatus');if(st)st.textContent='相手手番の起点と返し名を指定してください。';return}const tpl=sameTurnTemplate(src),s=clone(src.state),fg=parseFlags(val('#asFlags')),boardRaw=String(val('#asBoard')).trim(),otherRaw=String(val('#asOther')).trim();s.sideToAct='自分';s.opponentHP=num('#asOppHp');s.selfHP=num('#asSelfHp');s.opponentWard=val('#asWard')||'unknown';s.pirateFlagCountdowns=fg.values;s.pirateFlagsKnown=fg.known;s.knownBoardLeaderDamage=boardRaw===''?null:Math.max(0,Number(boardRaw)||0);s.boardDamageKnown=boardRaw!=='';s.otherConfirmedLeaderDamage=otherRaw===''?null:Math.max(0,Number(otherRaw)||0);s.otherDamageKnown=otherRaw!=='';if(s.tactical?.resources){s.tactical.resources.pirateFlags={known:fg.known,values:fg.values.slice()};s.tactical.resources.otherConfirmedDamage={known:otherRaw!=='',value:otherRaw===''?null:Math.max(0,Number(otherRaw)||0)}}if(tpl){for(const k of ['pp','extraPP','ep','sep'])s[k]=tpl[k]??s[k]}else{s.pp=null;s.extraPP=s.ep=s.sep='unknown'}const r=calculate(s),b={id:'a'+Date.now().toString(36),name,kind:'counterfactual',parentId:src.id,state:s,knowledgeCutoffSeconds:src.knowledgeCutoffSeconds,note:String(val('#asNote')).trim(),origin:'branch-assist-clean',automation:{resourceStatus:tpl?'from-saved-lethal-snapshot':'missing-template',lethalResult:{status:r.status,lethalRoutes:r.lethalRoutes,unknown:r.unknown}}};q.branches.push(b);save(CS,cd);expose();renderCf();W.$('#asStatus').textContent=r.lethalRoutes.length?`「${name}」：リーサル候補 ${r.lethalRoutes.join(' / ')}`:r.status==='incomplete-do-not-declare-no-lethal'?`「${name}」：未確認情報あり。リーサルなしとは断定しません。`:`「${name}」：主要既知ルート内ではリーサルなし`}

// P-E2 is an optional presentation layer. Keep the frozen recognition module list unchanged
// and bootstrap it after the existing runtime is ready so recognition/analysis behavior is untouched.
function loadCoachIntegration(){
  const doc=typeof document==='undefined'?null:document,host=doc&&(doc.head||doc.documentElement);
  if(W.CoachIntegration||!doc||typeof doc.createElement!=='function'||!host)return Promise.resolve(W.CoachIntegration||null);
  const old=typeof doc.querySelector==='function'?doc.querySelector('script[data-pe2-bootstrap="coach-integration"]'):null;
  if(old)return new Promise(resolve=>{old.addEventListener?.('load',()=>resolve(W.CoachIntegration||null),{once:true});setTimeout(()=>{if(W.CoachIntegration)resolve(W.CoachIntegration)},0)});
  return new Promise((resolve,reject)=>{const s=doc.createElement('script');if(window.__wbPrepareAssetScript)window.__wbPrepareAssetScript(s,'./coach-integration.js');else s.src=window.__wbAssetUrl?window.__wbAssetUrl('./coach-integration.js'):'./coach-integration.js';s.defer=true;s.dataset.pe2Bootstrap='coach-integration';s.onload=()=>resolve(W.CoachIntegration||null);s.onerror=()=>reject(new Error('P-E2 coach integration load failed'));host.appendChild(s)})
}

W.CounterfactualReview={version:VERSION,storageKey:CS,cf,branchEval,renderCf,loadCurrentCf,newCf,saveCf,sameTurnTemplate,renderAssistTemplate,renderAssistResults,refreshAssist,assist,expose,loadCoachIntegration};
W.onReady(()=>{
  W.$('#cfLoadState')?.addEventListener('click',loadCurrentCf);
  W.$('#cfSave')?.addEventListener('click',saveCf);
  W.$('#cfNew')?.addEventListener('click',newCf);
  W.$('#asSource')?.addEventListener('change',renderAssistTemplate);
  W.$('#asCreate')?.addEventListener('click',assist);
  W.on('video-reset',()=>{cfDraft=null;expose();renderCf()});
  loadCoachIntegration().catch(err=>W.recordError?.('pe2-bootstrap',err));
  expose();renderCf();
  W.log('module-ready',{module:'counterfactual-review',version:VERSION,independentState:true,branchAssist:true,storageKey:CS,reviewEngineDependency:'calculate+state+publishReviewState',optionalCoachIntegration:'pe2'});
});
})();
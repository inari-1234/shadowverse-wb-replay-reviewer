(()=>{
  const PATCH='4.7.0-20260915-05';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const STORE='wb-public-info-v2.1';
  const LEGACY_STORE='wb-public-info-v2';

  const TYPES={hand_add:'手札に加わった',hand_buff:'手札強化',revealed:'公開／プレイ',removed:'除去／破壊',effect:'効果解決',other:'その他'};
  let legacyCount=0;
  try{const old=JSON.parse(localStorage.getItem(LEGACY_STORE)||'null');legacyCount=Array.isArray(old?.events)?old.events.length:0}catch{}

  let db={version:'public-info-tracker-v2.1',sessions:{},activeKey:null};
  try{const raw=localStorage.getItem(STORE);if(raw){const x=JSON.parse(raw);if(x?.version&&x?.sessions)db=x}}catch{}

  const uid=()=>`e${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
  function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
  function videoMeta(){
    const v=videoEl();
    let m=null;try{m=typeof videoFileMeta!=='undefined'?videoFileMeta:null}catch{}
    const name=String(m?.name||((typeof videoName!=='undefined'&&videoName)||'')||'').trim();
    if(!name&&!v?.src)return null;
    return {name:name||'replay',size:Number(m?.size)||null,lastModified:Number(m?.lastModified)||null,duration:Number.isFinite(v?.duration)?+v.duration.toFixed(3):null,width:v?.videoWidth||null,height:v?.videoHeight||null};
  }
  function sourceKey(meta){if(!meta)return null;return `${meta.name}|${meta.size??'?' }|${meta.lastModified??'?'}`}
  function persist(){try{localStorage.setItem(STORE,JSON.stringify(db))}catch{};expose()}
  function bindVideo(create=true){
    const meta=videoMeta(),key=sourceKey(meta);if(!key)return null;
    if(!db.sessions[key]&&create)db.sessions[key]={sourceKey:key,video:meta,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),events:[]};
    if(db.sessions[key]){db.activeKey=key;db.sessions[key].video={...db.sessions[key].video,...meta};db.sessions[key].updatedAt=new Date().toISOString();persist();return db.sessions[key]}
    return null;
  }
  function session(){return bindVideo(true)}
  function currentTime(){const v=videoEl();return Number.isFinite(v?.currentTime)?+v.currentTime.toFixed(2):null}
  function currentTimelineRow(){const t=currentTime(),tl=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];let best=null;for(const x of tl){if(Number(x.time)<=t&&(!best||Number(x.time)>Number(best.time)))best=x}return best}
  function turnGuess(){const b=currentTimelineRow();return b?Number(b.turn)||null:null}
  function sideGuess(){const b=currentTimelineRow();return b?.side==='me'?'自分':b?.side==='opp'?'相手':'相手'}

  function integrity(s=session()){
    const events=s?.events||[],ids=new Set(events.map(e=>e.id)),retros=events.filter(e=>e.status==='retrospective'),resolved=new Set(retros.map(e=>e.resolvesEventId).filter(Boolean));
    const unresolved=events.filter(e=>e.status==='candidate'&&!resolved.has(e.id));
    const missingTurn=events.filter(e=>!Number.isInteger(Number(e.turn)));
    const missingTime=events.filter(e=>!Number.isFinite(Number(e.observedAtSeconds)));
    const brokenLinks=retros.filter(e=>!e.resolvesEventId||!ids.has(e.resolvesEventId));
    const timeReversal=retros.filter(e=>{const src=events.find(x=>x.id===e.resolvesEventId);return src&&Number.isFinite(Number(src.observedAtSeconds))&&Number.isFinite(Number(e.observedAtSeconds))&&Number(e.observedAtSeconds)<Number(src.observedAtSeconds)});
    return {ok:missingTurn.length===0&&missingTime.length===0&&brokenLinks.length===0&&timeReversal.length===0,eventCount:events.length,unresolvedCandidateCount:unresolved.length,missingTurnCount:missingTurn.length,missingTimeCount:missingTime.length,brokenLinkCount:brokenLinks.length,timeReversalCount:timeReversal.length};
  }
  function expose(){const s=db.activeKey?db.sessions[db.activeKey]:null;window.__wbPublicInfoV2={version:db.version,sourceKey:s?.sourceKey||null,sourceVideo:s?.video||null,events:s?.events||[],integrity:integrityNoBind(s)}}
  function integrityNoBind(s){
    const events=s?.events||[],ids=new Set(events.map(e=>e.id)),retros=events.filter(e=>e.status==='retrospective'),resolved=new Set(retros.map(e=>e.resolvesEventId).filter(Boolean));
    return {ok:events.every(e=>Number.isInteger(Number(e.turn))&&Number.isFinite(Number(e.observedAtSeconds)))&&retros.every(e=>e.resolvesEventId&&ids.has(e.resolvesEventId)),eventCount:events.length,unresolvedCandidateCount:events.filter(e=>e.status==='candidate'&&!resolved.has(e.id)).length};
  }
  function save(){const s=session();if(s)s.updatedAt=new Date().toISOString();persist();render()}

  function statusText(msg,color='#9aa8bf'){const el=$q('#piActionStatus467')||$q('#piActionStatus466');if(el){el.textContent=msg;el.style.color=color}}
  function addEvent(){
    const s=session();if(!s){statusText('先に動画を選んでください。','#fca5a5');return}
    const turn=Number($q('#piTurn466')?.value)||null,side=$q('#piSide466')?.value||'相手',type=$q('#piType466')?.value||'other',text=($q('#piText466')?.value||'').trim(),status=$q('#piStatus466')?.value||'confirmed',observedAt=currentTime();
    if(!text)return;
    if(!turn){statusText('ターンを入力してください。動画位置から自動入力もできます。','#fca5a5');return}
    if(!Number.isFinite(observedAt)){statusText('動画時刻を取得できません。動画を読み込んでください。','#fca5a5');return}
    s.events.push({id:uid(),turn,side,type,text,status,observedAtSeconds:observedAt,knowledgeAvailableFromTurn:turn,knowledgeAvailableFromSeconds:observedAt,resolvesEventId:null,resolvedAtTurn:null,resolvedAtSeconds:null,notes:''});
    save();$q('#piText466').value='';safeLog('public-info-event-added-v470',{turn,side,type,status,observedAt,sourceKey:s.sourceKey});
  }
  function removeEvent(id){const s=session();if(!s)return;s.events=s.events.filter(e=>e.id!==id&&e.resolvesEventId!==id);save()}
  function resolveEvent(id){
    const s=session(),src=s?.events.find(e=>e.id===id);if(!src||src.status!=='candidate')return;
    const observedAt=currentTime(),guessed=turnGuess(),typed=Number($q('#piTurn466')?.value)||null,turn=guessed||typed;
    if(!turn){statusText('答え合わせしたターンを取得できません。動画位置からターン入力を行ってください。','#fca5a5');return}
    if(Number.isFinite(src.observedAtSeconds)&&Number.isFinite(observedAt)&&observedAt<src.observedAtSeconds){statusText('元の候補より前の時刻では事後確定できません。','#fca5a5');return}
    const text=($q('#piText466')?.value||'').trim()||`「${src.text}」を後の公開情報で確認`;
    s.events.push({id:uid(),turn,side:$q('#piSide466')?.value||src.side,type:'revealed',text,status:'retrospective',observedAtSeconds:observedAt,knowledgeAvailableFromTurn:turn,knowledgeAvailableFromSeconds:observedAt,resolvesEventId:src.id,resolvedAtTurn:turn,resolvedAtSeconds:observedAt,notes:'元の判断時点では未確定。後の公開情報で答え合わせされた事実。'});
    save();$q('#piText466').value='';statusText(`${turn}Tで候補を事後確定しました。過去ターンの既知情報には逆流させません。`,'#86efac');safeLog('public-info-event-resolved-v470',{source:id,turn,observedAt});
  }
  function clearAll(){const s=session();if(!s)return;if(confirm('この試合の公開情報記録を全消去しますか？')){s.events=[];save()}}
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function render(){
    const out=$q('#piList466');if(!out)return;const s=session(),rows=(s?.events||[]).slice().sort((a,b)=>(a.observedAtSeconds??9999)-(b.observedAtSeconds??9999)||(a.turn??999)-(b.turn??999));
    const src=$q('#piSource466');if(src)src.textContent=s?`この試合：${s.video?.name||'replay'} / 記録 ${rows.length}件`:'動画未選択';
    if(!rows.length){out.innerHTML='<div class="help">まだ記録はありません。動画を該当場面に合わせて情報を追加してください。</div>';renderCheck();return}
    const resolvedBy=new Map(rows.filter(e=>e.status==='retrospective'&&e.resolvesEventId).map(e=>[e.resolvesEventId,e]));
    out.innerHTML=rows.map(e=>{
      const badge=e.status==='confirmed'?'確定':e.status==='candidate'?'候補':'事後確定',resolved=resolvedBy.get(e.id),srcEvent=e.resolvesEventId?rows.find(x=>x.id===e.resolvesEventId):null;
      const relation=e.status==='candidate'&&resolved?`<div class="help">↳ ${resolved.turn}T / ${resolved.observedAtSeconds}s で答え合わせ済み</div>`:e.resolvesEventId?`<div class="help">↳ 元候補：${escapeHtml(srcEvent?.text||e.resolvesEventId)}</div>`:'';
      const resolveBtn=e.status==='candidate'&&!resolved?`<button type="button" data-resolve="${e.id}" style="padding:5px 8px">この候補を後で確定</button>`:'';
      return `<div style="border:1px solid #334155;border-radius:8px;padding:8px;margin:6px 0"><div><b>${e.turn??'?'}T ${escapeHtml(e.side)} / ${escapeHtml(TYPES[e.type]||e.type)}</b> <span style="font-size:11px">[${badge}]</span></div><div>${escapeHtml(e.text)}</div><div class="help">判明 ${e.observedAtSeconds??'?'}s / 利用開始 ${e.knowledgeAvailableFromSeconds??e.observedAtSeconds??'?'}s</div>${relation}<div class="buttons" style="margin-top:6px">${resolveBtn}<button type="button" data-del="${e.id}" style="padding:5px 8px">削除</button></div></div>`
    }).join('');
    out.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeEvent(b.dataset.del));out.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>resolveEvent(b.dataset.resolve));renderCheck();
  }
  function renderCheck(){const box=$q('#piCheckResult466');if(!box)return;const s=session(),v=integrity(s);if(!s){box.textContent='動画を選択するとチェックできます。';return}const parts=[`記録 ${v.eventCount}件`,`未確定候補 ${v.unresolvedCandidateCount}件`];if(v.missingTurnCount)parts.push(`ターン欠落 ${v.missingTurnCount}`);if(v.missingTimeCount)parts.push(`時刻欠落 ${v.missingTimeCount}`);if(v.brokenLinkCount)parts.push(`リンク不整合 ${v.brokenLinkCount}`);if(v.timeReversalCount)parts.push(`時系列逆転 ${v.timeReversalCount}`);box.textContent=(v.ok?'整合性OK：':'要確認：')+parts.join(' / ');box.style.color=v.ok?'#86efac':'#fca5a5'}

  function mount(){
    if($q('#publicInfoPanel466')){
      const p=$q('#publicInfoPanel466');if(!$q('#piSource466')){const x=document.createElement('p');x.id='piSource466';x.className='help';p.querySelector('h2')?.insertAdjacentElement('afterend',x)}
      if(!$q('#piCheck466')){const row=$q('#piClear466')?.closest('.buttons');const b=document.createElement('button');b.id='piCheck466';b.type='button';b.textContent='トラッカーをチェック';row?.appendChild(b);const r=document.createElement('p');r.id='piCheckResult466';r.className='help';row?.insertAdjacentElement('afterend',r);b.onclick=renderCheck}
      $q('#piClear466').textContent='この試合の記録を全消去';render();return true;
    }
    const anchor=$q('#fullMatchPanel465')||$q('#rangeReviewPanel462');if(!anchor?.parentNode)return false;const p=document.createElement('section');p.id='publicInfoPanel466';p.className='panel';
    p.innerHTML=`<h2>公開情報トラッカー v2.1</h2><p id="piSource466" class="help"></p><p class="help">「その時点で知っていた情報」と「後から分かった答え」を分離します。記録は動画ごとに保存され、別試合には混ざりません。</p>${legacyCount?`<p class="warn">旧v2.0の未紐づけ記録が${legacyCount}件あります。誤混入防止のため自動では引き継ぎません。</p>`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>ターン<input id="piTurn466" type="number" min="1" step="1"></label><label>誰の情報<select id="piSide466"><option>相手</option><option>自分</option></select></label><label>種類<select id="piType466">${Object.entries(TYPES).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><label>その時点の確度<select id="piStatus466"><option value="confirmed">確定</option><option value="candidate">候補</option></select></label></div><label>分かったこと<input id="piText466" placeholder="例：アージュドールでリリムを除去し、バットが相手手札に加わった"></label><div class="buttons"><button id="piAdd466" type="button" class="good">現在時刻の情報として追加</button><button id="piFill466" type="button">現在のターンを入れる</button><button id="piClear466" type="button">この試合の記録を全消去</button><button id="piCheck466" type="button">トラッカーをチェック</button></div><p id="piActionStatus466" class="help"></p><p id="piCheckResult466" class="help"></p><div id="piList466"></div><p class="help">候補だけが「後で確定」の対象です。事後確定の内容は、元の判断時点へ逆流させません。</p>`;
    anchor.parentNode.insertBefore(p,anchor.nextSibling);$q('#piAdd466').onclick=addEvent;$q('#piClear466').onclick=clearAll;$q('#piCheck466').onclick=renderCheck;$q('#piFill466').onclick=()=>{const t=turnGuess();if(t)$q('#piTurn466').value=t;$q('#piSide466').value=sideGuess()};render();return true;
  }

  function installZipHook(){
    const Z=window.JSZip;if(!Z?.prototype?.generateAsync)return false;if(Z.prototype.__wbPublicInfo466)return true;const original=Z.prototype.generateAsync;
    Z.prototype.generateAsync=async function(...args){try{const f=this.files?.['range-review.json'];if(f){const raw=await f.async('string'),manifest=JSON.parse(raw),s=session(),check=integrity(s);manifest.publicInformationTracker={version:db.version,sourceKey:s?.sourceKey||null,sourceVideo:s?.video||null,rule:'判断評価では、その判断時刻までに利用可能だった情報だけを使う。後の場面で事後確定した事実を、過去の判断時点へ逆流させない。',statuses:{confirmed:'その時点で公開情報として確定',candidate:'合理的候補だが未確定',retrospective:'後の公開情報による答え合わせ'},integrity:check,events:s?.events||[]};if(manifest.coaching){manifest.coaching.stateTrackingVersion=db.version;manifest.coaching.temporalKnowledgeRule=manifest.publicInformationTracker.rule}this.file('range-review.json',JSON.stringify(manifest,null,2));this.remove('COACHING-INSTRUCTIONS.txt');this.remove('strategy/sea-pirate-royal-coaching-v1.json')}}catch(e){safeLog('public-info-manifest-error-v470',{message:e?.message||String(e)})}return original.apply(this,args)};
    Object.defineProperty(Z.prototype,'__wbPublicInfo466',{value:true});safeLog('public-info-zip-hook-installed-v470');return true;
  }
  function arm(){if(installZipHook())return;let n=0;const tm=setInterval(()=>{n++;if(installZipHook()||n>240)clearInterval(tm)},100)}

  $q('#videoFile')?.addEventListener('change',()=>setTimeout(()=>{bindVideo(true);render()},0));videoEl()?.addEventListener('loadedmetadata',()=>setTimeout(()=>{bindVideo(true);render()},50));
  let tries=0;const tm=setInterval(()=>{tries++;if(mount()||tries>120)clearInterval(tm)},150);arm();bindVideo(false);expose();
  const header=$q('header h1'),sub=$q('header p');if(header)header.textContent='シャドバWB リプレイ診断 v4.7.0';if(sub)sub.textContent='Build 2026.09.15-05 / 公開情報トラッカー v2.1';
  safeLog('patch-v470-tracker-active',{feature:'per-video-temporal-public-information-tracker-v2.1'});
})();
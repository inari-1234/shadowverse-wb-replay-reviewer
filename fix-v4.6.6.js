(()=>{
  const PATCH='4.6.6-20260915-01';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const STORE='wb-public-info-v2';

  const STATUS={confirmed:'確定',candidate:'候補',retrospective:'事後確定'};
  const TYPES={
    hand_add:'手札に加わった',
    hand_buff:'手札強化',
    revealed:'公開／プレイ',
    removed:'除去／破壊',
    effect:'効果解決',
    other:'その他'
  };

  let state={version:'public-info-tracker-v2.0',events:[]};
  try{const raw=localStorage.getItem(STORE);if(raw){const x=JSON.parse(raw);if(x&&Array.isArray(x.events))state=x}}catch{}

  function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{};render();}
  const uid=()=>`e${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
  function currentTime(){const v=typeof video!=='undefined'?video:$q('#video');return Number.isFinite(v?.currentTime)?+v.currentTime.toFixed(2):null}
  function turnGuess(){const t=currentTime(),tl=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];let best=null;for(const x of tl){if(Number(x.time)<=t&&(!best||Number(x.time)>Number(best.time)))best=x}return best?Number(best.turn)||'':''}
  function sideGuess(){const t=currentTime(),tl=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];let best=null;for(const x of tl){if(Number(x.time)<=t&&(!best||Number(x.time)>Number(best.time)))best=x}return best?.side==='me'?'自分':best?.side==='opp'?'相手':'相手'}

  function addEvent(){
    const turn=Number($q('#piTurn466')?.value)||null;
    const side=$q('#piSide466')?.value||'相手';
    const type=$q('#piType466')?.value||'other';
    const text=($q('#piText466')?.value||'').trim();
    if(!text)return;
    const status=$q('#piStatus466')?.value||'confirmed';
    const observedAt=currentTime();
    const ev={id:uid(),turn,side,type,text,status,observedAtSeconds:observedAt,knowledgeAvailableFromTurn:turn,resolvesEventId:null,resolvedAtTurn:null,notes:''};
    state.events.push(ev);save();
    $q('#piText466').value='';
    safeLog('public-info-event-added-v466',{turn,side,type,status,observedAt});
  }

  function removeEvent(id){state.events=state.events.filter(e=>e.id!==id);save()}
  function resolveEvent(id){
    const src=state.events.find(e=>e.id===id);if(!src)return;
    const turn=Number($q('#piTurn466')?.value)||src.turn||null;
    const text=($q('#piText466')?.value||'').trim()||`「${src.text}」を後の公開情報で確認`;
    const ev={id:uid(),turn,side:$q('#piSide466')?.value||src.side,type:'revealed',text,status:'retrospective',observedAtSeconds:currentTime(),knowledgeAvailableFromTurn:turn,resolvesEventId:src.id,resolvedAtTurn:turn,notes:'この事実は元の判断時点では未確定。後の場面で答え合わせされた。'};
    state.events.push(ev);save();$q('#piText466').value='';
    safeLog('public-info-event-resolved-v466',{source:id,turn});
  }

  function clearAll(){if(confirm('公開情報トラッカーを全消去しますか？')){state={version:'public-info-tracker-v2.0',events:[]};save()}}

  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function render(){
    const out=$q('#piList466');if(!out)return;
    const rows=state.events.slice().sort((a,b)=>(a.turn??999)-(b.turn??999)||(a.observedAtSeconds??9999)-(b.observedAtSeconds??9999));
    if(!rows.length){out.innerHTML='<div class="help">まだ記録はありません。動画を該当場面に合わせて情報を追加してください。</div>';return}
    out.innerHTML=rows.map(e=>{
      const resolved=e.resolvesEventId?`<div class="help">↳ ${escapeHtml(e.resolvesEventId)} の答え合わせ</div>`:'';
      const badge=e.status==='confirmed'?'確定':e.status==='candidate'?'候補':'事後確定';
      return `<div style="border:1px solid #334155;border-radius:8px;padding:8px;margin:6px 0"><div><b>${e.turn??'?'}T ${escapeHtml(e.side)} / ${escapeHtml(TYPES[e.type]||e.type)}</b> <span style="font-size:11px">[${badge}]</span></div><div>${escapeHtml(e.text)}</div><div class="help">判明 ${e.observedAtSeconds??'?'}s / 判断利用開始 ${e.knowledgeAvailableFromTurn??'?'}T</div>${resolved}<div class="buttons" style="margin-top:6px"><button type="button" data-resolve="${e.id}" style="padding:5px 8px">この候補を後で確定</button><button type="button" data-del="${e.id}" style="padding:5px 8px">削除</button></div></div>`
    }).join('');
    out.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeEvent(b.dataset.del));
    out.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=()=>resolveEvent(b.dataset.resolve));
  }

  function mount(){
    if($q('#publicInfoPanel466'))return true;
    const anchor=$q('#fullMatchPanel465')||$q('#rangeReviewPanel462');if(!anchor?.parentNode)return false;
    const p=document.createElement('section');p.id='publicInfoPanel466';p.className='panel';
    p.innerHTML=`<h2>公開情報トラッカー v2</h2><p class="help">短評で「その時点で知っていた情報」と「後から分かった答え」を混同しないための記録です。現在の動画時刻も一緒に保存します。</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>ターン<input id="piTurn466" type="number" min="1" step="1"></label><label>誰の情報<select id="piSide466"><option>相手</option><option>自分</option></select></label><label>種類<select id="piType466">${Object.entries(TYPES).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><label>その時点の確度<select id="piStatus466"><option value="confirmed">確定</option><option value="candidate">候補</option></select></label></div><label>分かったこと<input id="piText466" placeholder="例：リリムの破壊でバットが相手手札に加わった"></label><div class="buttons"><button id="piAdd466" type="button" class="good">現在時刻の情報として追加</button><button id="piFill466" type="button">現在のターンを入れる</button><button id="piClear466" type="button">全消去</button></div><div id="piList466"></div><p class="help">「候補」を後の場面で確認できた場合は、その項目の「この候補を後で確定」を押します。元のターンの評価には未来の確定情報を使わない、という制約をZIPに明示します。</p>`;
    anchor.parentNode.insertBefore(p,anchor.nextSibling);
    $q('#piAdd466').onclick=addEvent;$q('#piClear466').onclick=clearAll;$q('#piFill466').onclick=()=>{const t=turnGuess();if(t)$q('#piTurn466').value=t;$q('#piSide466').value=sideGuess()};
    render();return true;
  }

  function installZipHook(){
    const Z=window.JSZip;if(!Z?.prototype?.generateAsync)return false;if(Z.prototype.__wbPublicInfo466)return true;
    const original=Z.prototype.generateAsync;
    Z.prototype.generateAsync=async function(...args){
      try{
        const f=this.files?.['range-review.json'];
        if(f){
          const raw=await f.async('string'),manifest=JSON.parse(raw);
          manifest.publicInformationTracker={
            version:state.version,
            rule:'各ターンの判断評価では、そのターン開始時点までに利用可能だった確定情報・候補情報だけを使う。後のターンで事後確定した事実を、過去ターンの既知情報として逆流させない。',
            statuses:{confirmed:'その時点で公開情報として確定',candidate:'その時点では合理的候補だが未確定',retrospective:'後の公開情報によって事後確定'},
            events:state.events
          };
          if(manifest.coaching){manifest.coaching.stateTrackingVersion=state.version;manifest.coaching.temporalKnowledgeRule=manifest.publicInformationTracker.rule}
          this.file('range-review.json',JSON.stringify(manifest,null,2));
          this.remove('COACHING-INSTRUCTIONS.txt');
          this.remove('strategy/sea-pirate-royal-coaching-v1.json');
        }
      }catch(e){safeLog('public-info-manifest-error-v466',{message:e?.message||String(e)})}
      return original.apply(this,args);
    };
    Object.defineProperty(Z.prototype,'__wbPublicInfo466',{value:true});safeLog('public-info-zip-hook-installed-v466');return true;
  }

  function arm(){if(installZipHook())return;let n=0;const tm=setInterval(()=>{n++;if(installZipHook()||n>240)clearInterval(tm)},100)}
  let tries=0;const tm=setInterval(()=>{tries++;if(mount()||tries>120)clearInterval(tm)},150);arm();
  window.__wbPublicInfoV2=state;
  const header=$q('header h1'),sub=$q('header p');if(header)header.textContent='シャドバWB リプレイ診断 v4.6.6';if(sub)sub.textContent='Build 2026.09.15-01 / 公開情報トラッカー v2';
  safeLog('patch-v466-active',{feature:'temporal-public-information-tracker-v2'});
})();
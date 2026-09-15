(()=>{
  const PATCH='4.10.0-20260915-15b';
  const CF_STORE='wb-counterfactual-v1';
  const $q=s=>document.querySelector(s);
  const uid=()=>`a${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
  window.__wbV410Active=true;
  document.documentElement.dataset.wbLatestUi='494';
  try{window.__wbHeaderObserver494?.disconnect?.()}catch{}

  function sourceKey(){return window.__wbCounterfactualV1?.sourceKey||window.__wbLethalV2?.sourceKey||window.__wbPublicInfoV2?.sourceKey||null}
  function readDb(){try{return JSON.parse(localStorage.getItem(CF_STORE)||'null')}catch{return null}}
  function writeDb(db){try{localStorage.setItem(CF_STORE,JSON.stringify(db));return true}catch{return false}}
  function getSession(db=readDb()){const k=sourceKey();return k?db?.sessions?.[k]||null:null}
  function syncCounterfactual(s){
    if(!s)return false;
    const cur=window.__wbCounterfactualV1||{};
    window.__wbCounterfactualV1={...cur,version:'counterfactual-tree-v1.0',sourceKey:s.sourceKey,branches:clone(s.branches||[]),protocol:{...(cur.protocol||{}),branchAssist:{version:'v1.0',policy:'相手手番の起点から、相手の返し後の自分手番枝を作る。PP/ExPP/EP/SEPは同ターンの既存リーサル状態からのみ自動取得し、無い場合は推測しない。knowledge cutoffは親から継承する。'}}};
    return true;
  }
  function persist(db,s){if(s)s.updatedAt=new Date().toISOString();const ok=writeDb(db);syncCounterfactual(s);return ok}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function num(id,def=null){const e=$q(id);if(!e)return def;const raw=String(e.value??'').trim();if(raw==='')return def;const n=Number(raw);return Number.isFinite(n)?n:def}
  function setVal(id,v){const e=$q(id);if(e)e.value=v==null?'':String(v)}
  function setCheck(id,v){const e=$q(id);if(e)e.checked=!!v}
  function parseFlags(v){return String(v||'').split(/[、,\s]+/).map(Number).filter(n=>Number.isFinite(n)&&n>=0)}
  function actualTurnTime(turn){
    const target=$q('#targetSide')?.value||'bottom';
    const rows=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];
    const r=rows.find(x=>Number(x.turn)===Number(turn)&&x.side===target);
    return r&&Number.isFinite(Number(r.time))?Number(r.time):null;
  }
  function resourceTemplates(turn){
    const rows=(window.__wbLethalV2?.snapshots||[]).filter(x=>Number(x.turn)===Number(turn)&&Number.isFinite(Number(x.pp)));
    const t=actualTurnTime(turn);
    return rows.slice().sort((a,b)=>{
      if(Number.isFinite(t)){
        const da=Number.isFinite(Number(a.observedAtSeconds))?Math.abs(Number(a.observedAtSeconds)-t):9999;
        const db=Number.isFinite(Number(b.observedAtSeconds))?Math.abs(Number(b.observedAtSeconds)-t):9999;
        if(da!==db)return da-db;
      }
      return String(a.createdAt||'').localeCompare(String(b.createdAt||''));
    });
  }
  function bestTemplate(turn){return resourceTemplates(turn)[0]||null}
  function deriveOwnTurnState(source,after,template){
    const st=clone(source?.state||{});
    st.sideToAct='自分';
    st.turn=Number(source?.state?.turn)||null;
    st.opponentHP=after.opponentHP;
    st.selfHP=after.selfHP;
    st.opponentWard=!!after.opponentWard;
    st.pirateFlagCountdowns=after.pirateFlagCountdowns||[];
    st.knownBoardLeaderDamage=Math.max(0,Number(after.knownBoardLeaderDamage)||0);
    st.otherConfirmedLeaderDamage=Math.max(0,Number(after.otherConfirmedLeaderDamage)||0);
    st.hand=clone(st.hand||{});
    const handTemplateFields=[];
    if(template){
      st.pp=Number(template.pp);
      st.extraPPAvailable=!!template.extraPPAvailable;
      st.epAvailable=!!template.epAvailable;
      st.sepAvailable=!!template.sepAvailable;
      for(const k of ['barbaros','zetaBeatrix']){
        const cur=st.hand?.[k]||'unknown',tv=template.hand?.[k];
        if(cur==='unknown'&&tv&&tv!=='unknown'){st.hand[k]=tv;handTemplateFields.push(k)}
      }
    }else{
      st.pp=null;st.extraPPAvailable=null;st.epAvailable=null;st.sepAvailable=null;
    }
    return{state:st,handTemplateFields};
  }
  function validateSource(b){
    const issues=[];
    if(!b)issues.push('起点がありません');
    else{
      if(b.state?.sideToAct!=='相手')issues.push('起点の「次に動く側」が相手ではありません');
      if(!Number.isInteger(Number(b.state?.turn)))issues.push('起点ターンがありません');
      if(!Number.isFinite(Number(b.knowledgeCutoffSeconds)))issues.push('起点の判断時点がありません');
    }
    return{ok:issues.length===0,issues};
  }
  function findBranch(id){return getSession()?.branches?.find(b=>b.id===id)||null}
  function currentSource(){return findBranch($q('#asSource410')?.value||'')}
  function setStatus(msg,color='#9aa8bf'){const e=$q('#asStatus410');if(e){e.textContent=msg;e.style.color=color}}
  function fillFromSource(){
    const b=currentSource();if(!b)return;
    setVal('#asOppHp410',b.state?.opponentHP);setVal('#asSelfHp410',b.state?.selfHP);setCheck('#asWard410',b.state?.opponentWard);setVal('#asFlags410',(b.state?.pirateFlagCountdowns||[]).join(','));setVal('#asBoard410',0);setVal('#asOther410',0);
    const t=bestTemplate(b.state?.turn),info=$q('#asTemplate410');
    if(info){
      if(t)info.textContent=`${b.state?.turn}Tの自分資源を自動利用：PP ${t.pp}${t.extraPPAvailable?' + ExPP':''}${t.epAvailable?' / EP':''}${t.sepAvailable?' / SEP':''}（保存済みリーサル状態から）`;
      else info.textContent=`${b.state?.turn}Tの自分資源テンプレートがありません。枝は作れますが、自動リーサル判定は行いません。`;
    }
  }
  let sourceListSignature='';
  function refreshSources(force=false){
    const sel=$q('#asSource410');if(!sel)return false;
    const bs=getSession()?.branches||[],old=sel.value;
    const candidates=bs.filter(b=>b.state?.sideToAct==='相手');
    const sig=candidates.map(b=>`${b.id}|${b.name}|${b.state?.turn??''}|${b.updatedAt||''}`).join('||');
    if(!force&&sig===sourceListSignature)return true;
    sourceListSignature=sig;
    sel.innerHTML=candidates.length?candidates.map(b=>`<option value="${b.id}">${esc(b.name)} / ${b.state?.turn??'?'}T</option>`).join(''):'<option value="">相手手番の起点がありません</option>';
    const kept=candidates.some(b=>b.id===old);
    if(kept)sel.value=old;else if(candidates[0])sel.value=candidates[0].id;
    if(force||!kept)fillFromSource();
    renderResults();return true;
  }
  function writeToLethal(st){
    setVal('#leTurn480',st.turn);setVal('#leOppHp480',st.opponentHP);setVal('#lePp480',st.pp);setVal('#leFlags480',(st.pirateFlagCountdowns||[]).join(','));setVal('#leBoard480',st.knownBoardLeaderDamage??0);setVal('#leOther480',st.otherConfirmedLeaderDamage??0);
    setCheck('#leExtra480',st.extraPPAvailable);setCheck('#leEp480',st.epAvailable);setCheck('#leSep480',st.sepAvailable);setCheck('#leWard480',st.opponentWard);setCheck('#leOthersChecked480',st.hand?.otherDamageRoutesChecked);
    if($q('#leBar480'))$q('#leBar480').value=st.hand?.barbaros||'unknown';if($q('#leZeta480'))$q('#leZeta480').value=st.hand?.zetaBeatrix||'unknown';
  }
  function attachLethal(branchId,beforeIds){
    const snaps=window.__wbLethalV2?.snapshots||[];
    const snap=snaps.slice().reverse().find(x=>!beforeIds.has(x.id));
    if(!snap)return null;
    const db=readDb(),s=getSession(db),b=s?.branches?.find(x=>x.id===branchId);if(!b)return null;
    b.automation=b.automation||{};b.automation.lethalSnapshotId=snap.id||null;b.automation.lethalStatus=snap.status||null;b.automation.lethalRoutes=clone(snap.lethalRoutes||[]);b.automation.lethalRouteDetails=clone(snap.routes||[]);b.updatedAt=new Date().toISOString();persist(db,s);return snap;
  }
  function createAndAnalyze(){
    const source=currentSource(),v=validateSource(source);if(!v.ok){setStatus(v.issues.join(' / '),'#fca5a5');return}
    const name=String($q('#asName410')?.value||'').trim();if(!name){setStatus('相手の返し名を入力してください。','#fca5a5');return}
    const opp=num('#asOppHp410'),self=num('#asSelfHp410');if(opp==null||self==null){setStatus('返し後の相手HPと自分HPを入力してください。','#fca5a5');return}
    const after={opponentHP:opp,selfHP:self,opponentWard:!!$q('#asWard410')?.checked,pirateFlagCountdowns:parseFlags($q('#asFlags410')?.value),knownBoardLeaderDamage:num('#asBoard410',0),otherConfirmedLeaderDamage:num('#asOther410',0)};
    const template=bestTemplate(source.state.turn),derived=deriveOwnTurnState(source,after,template),db=readDb(),s=getSession(db);if(!s){setStatus('動画/セッションを取得できません。','#fca5a5');return}
    const b={id:uid(),name,kind:'counterfactual',parentId:source.id,state:derived.state,knowledgeCutoffSeconds:Number(source.knowledgeCutoffSeconds),note:String($q('#asNote410')?.value||'').trim(),origin:'branch-assist-v1',automation:{createdBy:'v4.10.0',hypotheticalOpponentResponse:true,inheritedKnowledgeCutoff:true,resourceStatus:template?'from-saved-lethal-snapshot':'missing-template',resourceTemplateId:template?.id||null,resourceTemplateObservedAtSeconds:template?.observedAtSeconds??null,handTemplateFields:derived.handTemplateFields},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    s.branches.push(b);persist(db,s);safeLog('branch-assist-created-v410',{branchId:b.id,parentId:b.parentId,turn:b.state.turn,resourceStatus:b.automation.resourceStatus});
    if(!template){setStatus(`「${name}」を作成しました。${b.state.turn}Tの自分資源が未保存のため、リーサルは自動判定していません。`,'#fbbf24');refreshSources();renderResults();return}
    if(!$q('#leSave480')||!$q('#leCalc480')){setStatus(`「${name}」を作成しましたが、リーサル検証v2の画面が見つからないため自動判定を停止しました。`,'#fbbf24');refreshSources();renderResults();return}
    writeToLethal(b.state);const before=new Set((window.__wbLethalV2?.snapshots||[]).map(x=>x.id));$q('#leCalc480').click();$q('#leSave480').click();
    setTimeout(()=>{const snap=attachLethal(b.id,before);if(snap){const routes=snap.lethalRoutes||[];setStatus(routes.length?`「${name}」：リーサル候補 ${routes.join(' / ')}`:`「${name}」：${snap.status==='incomplete-do-not-declare-no-lethal'?'未確認情報あり。リーサルなしとは断定しません。':'主要既知ルート内ではリーサルなし'}`,routes.length?'#86efac':'#cbd5e1')}else setStatus(`「${name}」を作成しました。リーサル結果の紐付けだけ取得できませんでした。`,'#fbbf24');renderResults();refreshSources()},60);
  }
  function renderResults(){
    const out=$q('#asResults410');if(!out)return;
    const bs=(getSession()?.branches||[]).filter(b=>b.origin==='branch-assist-v1').slice(-8).reverse();
    if(!bs.length){out.innerHTML='<div class="help">アシストで作成した分岐はまだありません。</div>';return}
    out.innerHTML=bs.map(b=>{const lr=b.automation?.lethalRoutes||[],rs=b.automation?.resourceStatus;return `<div style="border:1px solid #334155;border-radius:8px;padding:8px;margin:6px 0"><b>${esc(b.name)}</b><div class="help">${b.state?.turn??'?'}T / 相手HP ${b.state?.opponentHP??'?'} / 自分HP ${b.state?.selfHP??'?'} / ${rs==='from-saved-lethal-snapshot'?`PP ${b.state?.pp??'?'}${b.state?.extraPPAvailable?' +ExPP':''}`:'自分資源 未取得'}</div><div>${lr.length?'◎ リーサル候補：'+esc(lr.join(' / ')):b.automation?.lethalStatus==='incomplete-do-not-declare-no-lethal'?'未確認情報あり：リーサルなしと断定禁止':b.automation?.lethalStatus?'主要既知ルート内リーサルなし':'未解析'}</div></div>`}).join('');
  }
  function mount(){
    if($q('#branchAssist410'))return true;const anchor=$q('#counterfactualPanel490');if(!anchor?.parentNode)return false;
    const p=document.createElement('section');p.id='branchAssist410';p.className='panel';p.innerHTML=`<h2>分岐アシスト</h2><p class="help">相手手番の起点を選び、相手の返し後に変わった情報だけ入力します。自分のPP・ExPP・EP/SEPは同ターンの保存済みリーサル状態から自動取得します。見つからない場合は推測しません。</p><label>起点<select id="asSource410"></select></label><div id="asTemplate410" class="help" style="margin:6px 0"></div><label>相手の返し名<input id="asName410" placeholder="例：強襲の特攻隊長を使わない"></label><div class="grid"><label>返し後 相手HP<input id="asOppHp410" type="number" min="0"></label><label>返し後 自分HP<input id="asSelfHp410" type="number" min="0"></label><label>返し後 旗カウント<input id="asFlags410" placeholder="例 3"></label><label>自分場から確定の顔打点<input id="asBoard410" type="number" min="0" value="0"></label><label>その他の確定顔打点<input id="asOther410" type="number" min="0" value="0"></label></div><label style="display:flex;gap:7px;align-items:center;margin:8px 0"><input id="asWard410" type="checkbox"> 返し後に相手守護あり</label><label>メモ（任意）<textarea id="asNote410" placeholder="この返しで変わった点だけ"></textarea></label><div class="buttons"><button id="asRun410" class="good">自分ターン枝を作成してリーサルまで確認</button></div><p id="asStatus410" class="help"></p><div id="asResults410"></div><p class="help">重要：反実仮想の判断時点は親枝を継承します。実戦の後の情報を過去へ逆流させません。</p>`;
    anchor.parentNode.insertBefore(p,anchor.nextSibling);$q('#asSource410').addEventListener('change',fillFromSource);$q('#asRun410').addEventListener('click',createAndAnalyze);refreshSources(true);renderResults();return true;
  }
  function header(){
    const h=$q('header h1'),s=$q('header p');if(h)h.textContent='シャドバWB リプレイ診断 v4.10.0';if(s)s.textContent='Build 2026.09.15-15b / 分岐アシスト・資源自動引継ぎ';
    const st=$q('#wbUpdateStatus463')||$q('#wbUpdateStatus462');if(st&&!/最新版を確認中|更新完了/.test(st.textContent))st.textContent='v4.10.0 / 分岐アシスト';
  }
  function updater(){
    const old=$q('#wbForceLatest463')||$q('#wbForceLatest462');if(!old||old.dataset.wb410==='1')return false;const b=old.cloneNode(true);b.dataset.wb410='1';old.replaceWith(b);
    b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;const st=$q('#wbUpdateStatus463')||$q('#wbUpdateStatus462');if(st)st.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.10.0-20260915-15b',{updateViaCache:'none'});await reg.update()}if('caches'in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-10-0-20260915-15b').map(k=>caches.delete(k)))}if(st)st.textContent='更新完了。v4.10.0で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','4100b-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(err){if(st)st.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v410',{message:err?.message||String(err)})}},true);return true;
  }
  if(!document.documentElement.dataset.wb410Events){document.documentElement.dataset.wb410Events='1';document.addEventListener('click',e=>{if(e.target?.closest?.('#cfSave490,#cfNew490,[data-clone-cf],[data-edit-cf]'))setTimeout(()=>refreshSources(true),120)},true);$q('#videoFile')?.addEventListener('change',()=>setTimeout(()=>refreshSources(true),350));}
  window.__wbBranchAssistV1={version:'branch-assist-v1.0',deriveOwnTurnState,bestTemplate,validateSource,policy:{resourceRule:'PP/ExPP/EP/SEPは同ターンの保存済みリーサル状態からのみ取得。見つからなければnullで停止。',knowledgeRule:'knowledgeCutoffSecondsは親枝を継承。',branchRule:'相手手番起点から相手の返し後＝自分手番の子枝を作成。'}};
  let n=0;const tm=setInterval(()=>{n++;window.__wbV410Active=true;mount();header();updater();if(n>900)clearInterval(tm)},150);
  safeLog('patch-v4100-active',{feature:'guided-counterfactual-response-to-lethal'});
})();
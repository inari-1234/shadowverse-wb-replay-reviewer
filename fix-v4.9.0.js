(()=>{
  const PATCH='4.9.0-20260915-10';
  const STORE='wb-counterfactual-v1';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const uid=()=>`b${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;

  let editingId=null;
  let db={version:'counterfactual-tree-v1.0',sessions:{}};
  try{const x=JSON.parse(localStorage.getItem(STORE)||'null');if(x?.sessions)db=x}catch{}

  function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
  function sourceKey(){
    return window.__wbLethalV2?.sourceKey||window.__wbPublicInfoV2?.sourceKey||(()=>{
      const v=videoEl();let m=null;try{m=typeof videoFileMeta!=='undefined'?videoFileMeta:null}catch{}
      const name=String(m?.name||((typeof videoName!=='undefined'&&videoName)||'')||'').trim();
      if(!name&&!v?.src)return null;
      return `${name||'replay'}|${Number(m?.size)||'?'}|${Number(m?.lastModified)||'?'}`;
    })();
  }
  function session(create=true){
    const key=sourceKey();if(!key)return null;
    if(!db.sessions[key]&&create)db.sessions[key]={sourceKey:key,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),branches:[]};
    return db.sessions[key]||null;
  }
  function persist(){const s=session(false);if(s)s.updatedAt=new Date().toISOString();try{localStorage.setItem(STORE,JSON.stringify(db))}catch{}expose()}
  function expose(){const s=session(false);window.__wbCounterfactualV1={version:db.version,sourceKey:s?.sourceKey||null,branches:(s?.branches||[]).map(b=>structuredCloneSafe(b)),protocol:{independentState:true,rule:'各分岐は親から複製後も独立状態として保存し、実戦最終値からの単純差し引きで作らない。各枝でHP・盤面・手札・PP・Extra PP・EP・SEP・旗カウントを再計算する。',knowledgeRule:'分岐の評価にはknowledgeCutoffSeconds以前に利用可能な公開情報だけを使う。'}}}
  function structuredCloneSafe(x){try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}}
  function readNum(id,def=null){const e=$q(id);if(!e)return def;const raw=String(e.value??'').trim();if(raw==='')return def;const n=Number(raw);return Number.isFinite(n)?n:def}
  function readFlags(id='#cfFlags490'){return String($q(id)?.value||'').split(/[、,\s]+/).map(Number).filter(n=>Number.isFinite(n)&&n>=0)}
  function writeBool(id,v){const e=$q(id);if(e)e.checked=!!v}
  function writeVal(id,v){const e=$q(id);if(e)e.value=v==null?'':String(v)}
  function nowSeconds(){const v=videoEl();return Number.isFinite(v?.currentTime)?+v.currentTime.toFixed(2):null}
  function guessTurn(){const t=nowSeconds(),rows=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];let best=null;for(const r of rows){if(Number(r.time)<=t&&(!best||Number(r.time)>Number(best.time)))best=r}return best?Number(best.turn)||null:null}

  function stateFromLethalForm(){
    return {
      turn:readNum('#leTurn480',guessTurn()),
      opponentHP:readNum('#leOppHp480'),
      selfHP:readNum('#cfSelfHp490'),
      pp:readNum('#lePp480'),
      extraPPAvailable:!!$q('#leExtra480')?.checked,
      epAvailable:!!$q('#leEp480')?.checked,
      sepAvailable:!!$q('#leSep480')?.checked,
      opponentWard:!!$q('#leWard480')?.checked,
      pirateFlagCountdowns:String($q('#leFlags480')?.value||'').split(/[、,\s]+/).map(Number).filter(n=>Number.isFinite(n)&&n>=0),
      knownBoardLeaderDamage:Math.max(0,readNum('#leBoard480',0)||0),
      otherConfirmedLeaderDamage:Math.max(0,readNum('#leOther480',0)||0),
      hand:{
        barbaros:$q('#leBar480')?.value||'unknown',
        zetaBeatrix:$q('#leZeta480')?.value||'unknown',
        otherDamageRoutesChecked:!!$q('#leOthersChecked480')?.checked
      }
    };
  }
  function stateFromBranchForm(){
    return {
      turn:readNum('#cfTurn490',guessTurn()),opponentHP:readNum('#cfOppHp490'),selfHP:readNum('#cfSelfHp490'),pp:readNum('#cfPp490'),
      extraPPAvailable:!!$q('#cfExtra490')?.checked,epAvailable:!!$q('#cfEp490')?.checked,sepAvailable:!!$q('#cfSep490')?.checked,opponentWard:!!$q('#cfWard490')?.checked,
      pirateFlagCountdowns:readFlags(),knownBoardLeaderDamage:Math.max(0,readNum('#cfBoard490',0)||0),otherConfirmedLeaderDamage:Math.max(0,readNum('#cfOther490',0)||0),
      hand:{barbaros:$q('#cfBar490')?.value||'unknown',zetaBeatrix:$q('#cfZeta490')?.value||'unknown',otherDamageRoutesChecked:!!$q('#cfOthers490')?.checked}
    };
  }
  function writeBranchState(st={}){
    writeVal('#cfTurn490',st.turn);writeVal('#cfOppHp490',st.opponentHP);writeVal('#cfSelfHp490',st.selfHP);writeVal('#cfPp490',st.pp);writeVal('#cfFlags490',(st.pirateFlagCountdowns||[]).join(','));
    writeVal('#cfBoard490',st.knownBoardLeaderDamage??0);writeVal('#cfOther490',st.otherConfirmedLeaderDamage??0);
    writeBool('#cfExtra490',st.extraPPAvailable);writeBool('#cfEp490',st.epAvailable);writeBool('#cfSep490',st.sepAvailable);writeBool('#cfWard490',st.opponentWard);writeBool('#cfOthers490',st.hand?.otherDamageRoutesChecked);
    if($q('#cfBar490'))$q('#cfBar490').value=st.hand?.barbaros||'unknown';if($q('#cfZeta490'))$q('#cfZeta490').value=st.hand?.zetaBeatrix||'unknown';
  }
  function writeToLethal(st={}){
    writeVal('#leTurn480',st.turn);writeVal('#leOppHp480',st.opponentHP);writeVal('#lePp480',st.pp);writeVal('#leFlags480',(st.pirateFlagCountdowns||[]).join(','));
    writeVal('#leBoard480',st.knownBoardLeaderDamage??0);writeVal('#leOther480',st.otherConfirmedLeaderDamage??0);
    writeBool('#leExtra480',st.extraPPAvailable);writeBool('#leEp480',st.epAvailable);writeBool('#leSep480',st.sepAvailable);writeBool('#leWard480',st.opponentWard);writeBool('#leOthersChecked480',st.hand?.otherDamageRoutesChecked);
    if($q('#leBar480'))$q('#leBar480').value=st.hand?.barbaros||'unknown';if($q('#leZeta480'))$q('#leZeta480').value=st.hand?.zetaBeatrix||'unknown';
    $q('#leCalc480')?.click();
  }
  function diffState(parent,child){
    if(!parent)return [];
    const out=[];
    const pairs=[['turn','T'],['opponentHP','相手HP'],['selfHP','自分HP'],['pp','PP'],['extraPPAvailable','ExPP'],['epAvailable','EP'],['sepAvailable','SEP'],['opponentWard','守護'],['knownBoardLeaderDamage','場打点'],['otherConfirmedLeaderDamage','その他打点']];
    for(const [k,label] of pairs){if(JSON.stringify(parent[k])!==JSON.stringify(child[k]))out.push(`${label}:${parent[k]??'?'}→${child[k]??'?'}`)}
    if(JSON.stringify(parent.pirateFlagCountdowns||[])!==JSON.stringify(child.pirateFlagCountdowns||[]))out.push(`旗:${(parent.pirateFlagCountdowns||[]).join(',')||'-'}→${(child.pirateFlagCountdowns||[]).join(',')||'-'}`);
    for(const [k,label] of [['barbaros','バルバロス'],['zetaBeatrix','ゼタベア'],['otherDamageRoutesChecked','他打点確認']]){if(JSON.stringify(parent.hand?.[k])!==JSON.stringify(child.hand?.[k]))out.push(`${label}:${parent.hand?.[k]??'?'}→${child.hand?.[k]??'?'}`)}
    return out;
  }
  function descendantsOf(id,branches){const out=new Set(),stack=[id];while(stack.length){const x=stack.pop();for(const b of branches){if(b.parentId===x&&!out.has(b.id)){out.add(b.id);stack.push(b.id)}}}return out}
  function integrity(){
    const s=session(false),bs=s?.branches||[],ids=new Set(bs.map(b=>b.id)),issues=[];
    for(const b of bs){if(b.parentId&&!ids.has(b.parentId))issues.push(`「${b.name}」の親枝がありません`);if(b.parentId===b.id)issues.push(`「${b.name}」が自己参照しています`);if(!Number.isFinite(Number(b.knowledgeCutoffSeconds)))issues.push(`「${b.name}」の判断時刻がありません`);if(!Number.isInteger(Number(b.state?.turn)))issues.push(`「${b.name}」のターンがありません`)}
    return{ok:issues.length===0,branchCount:bs.length,issues};
  }

  function parentOptions(){
    const sel=$q('#cfParent490');if(!sel)return;const s=session(false),bs=s?.branches||[],current=sel.value;
    sel.innerHTML='<option value="">親なし（起点）</option>'+bs.filter(b=>b.id!==editingId).map(b=>`<option value="${b.id}">${escapeHtml(b.name)} / ${b.state?.turn??'?'}T</option>`).join('');
    if([...sel.options].some(o=>o.value===current))sel.value=current;
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function status(msg,color='#9aa8bf'){const e=$q('#cfStatus490');if(e){e.textContent=msg;e.style.color=color}}
  function clearForm(keepParent=false){editingId=null;writeVal('#cfName490','');writeVal('#cfNote490','');if(!keepParent&&$q('#cfParent490'))$q('#cfParent490').value='';if($q('#cfKind490'))$q('#cfKind490').value='counterfactual';writeBranchState({hand:{}});writeVal('#cfSelfHp490','');parentOptions();status('新しい分岐を入力できます。')}
  function loadFromLethal(){const st=stateFromLethalForm();writeBranchState(st);status('リーサル検証の現在値を取り込みました。自分HPなど不足分を補ってください。','#cbd5e1')}
  function loadBranch(id,asNew=false){
    const s=session(false),b=s?.branches.find(x=>x.id===id);if(!b)return;
    editingId=asNew?null:b.id;writeVal('#cfName490',asNew?`${b.name} - 分岐`:b.name);writeVal('#cfNote490',asNew?'':b.note||'');if($q('#cfKind490'))$q('#cfKind490').value=asNew?'counterfactual':b.kind||'counterfactual';parentOptions();if($q('#cfParent490'))$q('#cfParent490').value=asNew?b.id:(b.parentId||'');writeBranchState(b.state||{});status(asNew?'選択枝を親にして複製しました。変更後に保存してください。':'分岐を編集できます。','#cbd5e1')
  }
  function saveBranch(){
    const s=session();if(!s){status('先に動画を選んでください。','#fca5a5');return}
    const name=String($q('#cfName490')?.value||'').trim();if(!name){status('分岐名を入力してください。','#fca5a5');return}
    const parentId=$q('#cfParent490')?.value||null,state=stateFromBranchForm(),cutoff=nowSeconds();
    if(!state.turn){status('ターンを入力してください。','#fca5a5');return}if(!Number.isFinite(cutoff)){status('動画時刻を取得できません。','#fca5a5');return}
    if(editingId&&parentId){const bad=descendantsOf(editingId,s.branches);if(bad.has(parentId)){status('子孫の枝を親にはできません。','#fca5a5');return}}
    const branch={id:editingId||uid(),name,kind:$q('#cfKind490')?.value||'counterfactual',parentId,state,knowledgeCutoffSeconds:cutoff,note:String($q('#cfNote490')?.value||'').trim(),origin:'manual-v1',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(editingId){const i=s.branches.findIndex(x=>x.id===editingId);if(i>=0){branch.createdAt=s.branches[i].createdAt;s.branches[i]=branch}else s.branches.push(branch)}else s.branches.push(branch);
    persist();editingId=null;render();status(`「${name}」を独立状態として保存しました。`,'#86efac');safeLog('counterfactual-branch-saved-v490',{id:branch.id,parentId:branch.parentId,turn:state.turn})
  }
  function removeBranch(id){const s=session(false);if(!s)return;const kids=s.branches.filter(b=>b.parentId===id);if(kids.length){status('子分岐があるため削除できません。先に子分岐を削除してください。','#fca5a5');return}s.branches=s.branches.filter(b=>b.id!==id);if(editingId===id)editingId=null;persist();render()}

  function render(){
    parentOptions();const out=$q('#cfList490');if(!out)return;const s=session(false),bs=s?.branches||[],byId=new Map(bs.map(b=>[b.id,b]));
    if(!bs.length){out.innerHTML='<div class="help">まだ分岐はありません。まず分岐直前の状態を「実戦/起点」として保存してください。</div>';renderIntegrity();return}
    out.innerHTML=bs.map(b=>{const p=b.parentId?byId.get(b.parentId):null,diff=diffState(p?.state,b.state);return `<div style="border:1px solid #334155;border-radius:8px;padding:9px;margin:7px 0"><div><b>${escapeHtml(b.name)}</b> <span style="font-size:11px">[${escapeHtml(b.kind)}]</span></div><div class="help">${b.state?.turn??'?'}T / 判断時点 ${b.knowledgeCutoffSeconds??'?'}s / 親: ${escapeHtml(p?.name||'なし')}</div><div>相手HP ${b.state?.opponentHP??'?'} / 自分HP ${b.state?.selfHP??'?'} / PP ${b.state?.pp??'?'}${b.state?.extraPPAvailable?' +ExPP':''} / 旗 ${(b.state?.pirateFlagCountdowns||[]).join(',')||'-'}</div>${diff.length?`<div class="help">親からの変更: ${escapeHtml(diff.join(' / '))}</div>`:''}${b.note?`<div class="help">仮定: ${escapeHtml(b.note)}</div>`:''}<div class="buttons" style="margin-top:6px"><button type="button" data-edit-cf="${b.id}">編集</button><button type="button" data-clone-cf="${b.id}">この枝から分岐</button><button type="button" data-send-cf="${b.id}">リーサル検証へ送る</button><button type="button" data-del-cf="${b.id}">削除</button></div></div>`}).join('');
    out.querySelectorAll('[data-edit-cf]').forEach(x=>x.onclick=()=>loadBranch(x.dataset.editCf,false));out.querySelectorAll('[data-clone-cf]').forEach(x=>x.onclick=()=>loadBranch(x.dataset.cloneCf,true));out.querySelectorAll('[data-send-cf]').forEach(x=>x.onclick=()=>{const b=bs.find(y=>y.id===x.dataset.sendCf);if(b){writeToLethal(b.state);$q('#lethalPanel480')?.scrollIntoView?.({behavior:'smooth',block:'start'});status(`「${b.name}」をリーサル検証へ反映しました。`,'#86efac')}});out.querySelectorAll('[data-del-cf]').forEach(x=>x.onclick=()=>removeBranch(x.dataset.delCf));renderIntegrity();
  }
  function renderIntegrity(){const e=$q('#cfCheck490');if(!e)return;const a=integrity();e.textContent=(a.ok?'整合性OK：':'要確認：')+`分岐${a.branchCount}件`+(a.issues.length?' / '+a.issues.join(' / '):'');e.style.color=a.ok?'#86efac':'#fca5a5'}

  function mount(){
    if($q('#counterfactualPanel490'))return true;const anchor=$q('#lethalPanel480')||$q('#publicInfoPanel466');if(!anchor?.parentNode)return false;
    const p=document.createElement('section');p.id='counterfactualPanel490';p.className='panel';p.innerHTML=`<h2>反実仮想 分岐 v1</h2><p class="help">実戦と代替ルートを別々の局面状態として保存します。親から複製しても、保存後は独立して再計算します。</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>分岐名<input id="cfName490" placeholder="例：5Tイドメタ自壊後"></label><label>種類<select id="cfKind490"><option value="actual">実戦/起点</option><option value="counterfactual" selected>自分の代替</option><option value="opponent-response">相手の返し</option><option value="continuation">次ターン継続</option></select></label><label>親分岐<select id="cfParent490"><option value="">親なし（起点）</option></select></label><label>ターン<input id="cfTurn490" type="number" min="1"></label><label>相手HP<input id="cfOppHp490" type="number" min="0"></label><label>自分HP<input id="cfSelfHp490" type="number" min="0"></label><label>PP<input id="cfPp490" type="number" min="0" max="10"></label><label>旗カウント<input id="cfFlags490" placeholder="5,2"></label><label>バルバロス<select id="cfBar490"><option value="unknown">不明</option><option value="have">手札にある</option><option value="none">手札にない</option></select></label><label>ゼタ＆ベアトリクス<select id="cfZeta490"><option value="unknown">不明</option><option value="have">手札にある</option><option value="none">手札にない</option></select></label><label>場から確定の顔打点<input id="cfBoard490" type="number" min="0" value="0"></label><label>その他確定打点<input id="cfOther490" type="number" min="0" value="0"></label></div><div style="display:flex;gap:12px;flex-wrap:wrap;margin:10px 0"><label><input id="cfExtra490" type="checkbox"> ExPP使用可</label><label><input id="cfEp490" type="checkbox"> EP使用可</label><label><input id="cfSep490" type="checkbox"> SEP使用可</label><label><input id="cfWard490" type="checkbox"> 相手守護あり</label><label><input id="cfOthers490" type="checkbox"> 他の手札打点も確認済み</label></div><label>この分岐の仮定／行動<textarea id="cfNote490" placeholder="例：相手は強襲の特攻隊長を使わない"></textarea></label><div class="buttons"><button id="cfImport490" type="button">リーサル検証の現在値を取り込む</button><button id="cfSave490" type="button" class="good">この分岐を保存</button><button id="cfNew490" type="button">新規入力</button></div><p id="cfStatus490" class="help"></p><p id="cfCheck490" class="help"></p><div id="cfList490"></div><p class="help">各枝の判断時点を動画時刻として保存します。未来で判明した情報を過去の枝へ自動反映しません。</p>`;
    anchor.parentNode.insertBefore(p,anchor.nextSibling);$q('#cfImport490').onclick=loadFromLethal;$q('#cfSave490').onclick=saveBranch;$q('#cfNew490').onclick=()=>clearForm();render();return true;
  }

  function installZipHook(){
    const Z=window.JSZip;if(!Z?.prototype?.generateAsync)return false;if(Z.prototype.__wbCounterfactual490)return true;const original=Z.prototype.generateAsync;
    Z.prototype.generateAsync=async function(...args){try{const f=this.files?.['range-review.json'];if(f){const raw=await f.async('string'),m=JSON.parse(raw),tree=window.__wbCounterfactualV1||null;m.counterfactualTreeV1=tree;m.reviewProtocolV2=m.reviewProtocolV2||{};m.reviewProtocolV2.counterfactualRules=['各枝を独立した局面状態として評価する','実戦最終HPから単純差し引きして別枝を作らない','相手が別行動を選べる場合は兄弟枝として両方残す','各枝でリーサル探索を再実行する','knowledgeCutoffSecondsより後の公開情報を過去枝の既知情報にしない'];this.file('range-review.json',JSON.stringify(m,null,2));safeLog('counterfactual-tree-embedded-v490',{branches:tree?.branches?.length||0})}}catch(e){safeLog('counterfactual-zip-error-v490',{message:e?.message||String(e)})}return original.apply(this,args)};
    Object.defineProperty(Z.prototype,'__wbCounterfactual490',{value:true});return true;
  }
  function updater(){
    const old=$q('#wbForceLatest463')||$q('#wbForceLatest462');if(!old||old.dataset.wb490==='1')return false;const b=old.cloneNode(true);b.dataset.wb490='1';old.replaceWith(b);const st=$q('#wbUpdateStatus463')||$q('#wbUpdateStatus462');if(st)st.textContent='v4.9.0 / 反実仮想分岐';
    b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;if(st)st.textContent='最新版を確認中…';try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.9.0-20260915-10',{updateViaCache:'none'});await reg.update()}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-9-0-20260915-10').map(k=>caches.delete(k)))}if(st)st.textContent='更新完了。v4.9.0で再起動します…';setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','490-'+Date.now());u.hash='';location.replace(u.href)},180)}catch(err){if(st)st.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v490',{message:err?.message||String(err)})}});return true;
  }
  $q('#videoFile')?.addEventListener('change',()=>setTimeout(()=>{expose();render()},350));
  let n=0;const tm=setInterval(()=>{n++;mount();expose();if(window.JSZip)installZipHook();updater();const h=$q('header h1'),s=$q('header p');if(h)h.textContent='シャドバWB リプレイ診断 v4.9.0';if(s)s.textContent='Build 2026.09.15-10 / 反実仮想の独立分岐管理';if(n>420)clearInterval(tm)},120);
  expose();safeLog('patch-v490-active',{feature:'independent-counterfactual-branch-tree'});
})();

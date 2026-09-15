(()=>{
  const PATCH='4.8.0-20260915-08';
  const STORE='wb-lethal-v2';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const RULES={
    version:'lethal-review-engine-v2.0',
    protocol:{
      beforeGrade:[
        '現在ターンの主要リーサル候補を1本で止めず全列挙する',
        '相手HP・PP・Extra PP・EP・SEP・守護・場の打点・海賊旗カウント・主要手札を確認する',
        '不明情報が残る場合はリーサルなしと断定しない',
        '反実仮想は分岐直前から独立再計算し、実戦最終HPから単純加減しない'
      ],
      counterfactual:'相手が実戦と別行動を選べる場合は分岐を残し、各分岐でHP・盤面・手札・PP・Extra PP・EP・SEP・旗カウントを更新する。'
    },
    cards:{
      pirateFlag:{name:'戦慄の海賊旗',countdown:7,lastWordsLeaderDamage:2,onSpellCountdownDelta:-1},
      barbaros:{name:'逆行の咎人・バルバロス',cost:7,attack:4,storm:true,flagCountdownDelta:-5},
      zeta:{name:'真紅と群青・ゼタ＆ベアトリクス',enhanceCost:6,attack:3,stormOnEnhance:true}
    },
    sources:[
      'https://shadowverse-wb.com/ja/help?tab=tab0',
      'https://shadowverse-wb.com/ja/deck/cardslist/card/?card_id=10424110',
      'https://gamewith.jp/shadowverse-wb/573272',
      'https://gamewith.jp/shadowverse-wb/573273'
    ]
  };
  window.__wbCoachV2=RULES;

  function videoEl(){return typeof video!=='undefined'?video:$q('#video')}
  function videoMeta(){let m=null;try{m=typeof videoFileMeta!=='undefined'?videoFileMeta:null}catch{}const v=videoEl(),name=String(m?.name||((typeof videoName!=='undefined'&&videoName)||'')||'').trim();if(!name&&!v?.src)return null;return{name:name||'replay',size:Number(m?.size)||null,lastModified:Number(m?.lastModified)||null}}
  function sourceKey(){const m=videoMeta();return m?`${m.name}|${m.size??'?'}|${m.lastModified??'?'}`:null}
  let db={version:'lethal-state-v2.0',sessions:{}};try{const x=JSON.parse(localStorage.getItem(STORE)||'null');if(x?.sessions)db=x}catch{}
  function session(create=true){const k=sourceKey();if(!k)return null;if(!db.sessions[k]&&create)db.sessions[k]={sourceKey:k,video:videoMeta(),snapshots:[]};return db.sessions[k]||null}
  function persist(){try{localStorage.setItem(STORE,JSON.stringify(db))}catch{};expose()}
  function expose(){const s=session(false);window.__wbLethalV2={version:db.version,sourceKey:s?.sourceKey||null,snapshots:(s?.snapshots||[]).map(x=>({...x})),protocol:RULES.protocol,cards:RULES.cards}}
  const num=(id,def=null)=>{const n=Number($q(id)?.value);return Number.isFinite(n)?n:def};
  function currentTurn(){const manual=num('#leTurn480');if(manual)return manual;const t=Number(videoEl()?.currentTime),rows=Array.isArray(window.turnTimeline39)?window.turnTimeline39:[];let best=null;for(const r of rows){if(Number(r.time)<=t&&(!best||Number(r.time)>Number(best.time)))best=r}return best?Number(best.turn)||null:null}
  function flags(){return String($q('#leFlags480')?.value||'').split(/[、,\s]+/).map(Number).filter(n=>Number.isFinite(n)&&n>=0)}
  function handState(id){return $q(id)?.value||'unknown'}
  function superEligible(turn){const po=$q('#playOrder')?.value;return po==='後攻'?turn>=6:turn>=7}
  function calc(){
    const turn=currentTurn(),hp=num('#leOppHp480'),pp=num('#lePp480'),extra=!!$q('#leExtra480')?.checked,ep=!!$q('#leEp480')?.checked,sep=!!$q('#leSep480')?.checked,ward=!!$q('#leWard480')?.checked,board=Math.max(0,num('#leBoard480',0)||0),other=Math.max(0,num('#leOther480',0)||0),fs=flags(),bar=handState('#leBar480'),zeta=handState('#leZeta480'),othersChecked=!!$q('#leOthersChecked480')?.checked;
    const effectivePP=pp==null?null:pp+(extra?1:0),routes=[],unknown=[];
    if(hp==null)unknown.push('相手HP');if(pp==null)unknown.push('PP');if(bar==='unknown')unknown.push('バルバロス所持');if(zeta==='unknown')unknown.push('ゼタ＆ベアトリクス所持');if(!othersChecked)unknown.push('その他の手札打点');
    const add=(name,cost,damage,resources,detail)=>routes.push({name,cost,damage,resources,detail,blockedByWard:ward,lethal:hp!=null&&damage>=hp&&!ward});
    const fixed=board+other;
    if(hp!=null&&fixed>=hp)add('場＋その他確定打点',0,fixed,['盤面','その他確定打点'],'カードを追加せず成立する既知打点');
    if(bar==='have'&&effectivePP!=null&&effectivePP>=7){
      const breaks=fs.filter(c=>c<=5).length,flagDmg=breaks*2;base=4+flagDmg+fixed;
      add('バルバロス',7,base,['7PP','疾走',`既存旗${breaks}枚破壊`],`4 + 旗${flagDmg} + 場/他${fixed}`);
      if(ep)add('バルバロス＋進化',7,base+2,['7PP','EP','疾走',`既存旗${breaks}枚破壊`],`6 + 旗${flagDmg} + 場/他${fixed}`);
      if(sep&&turn&&superEligible(turn))add('バルバロス＋超進化',7,base+3,['7PP','SEP','疾走',`既存旗${breaks}枚破壊`],`7 + 旗${flagDmg} + 場/他${fixed}`);
    }
    if(zeta==='have'&&effectivePP!=null&&effectivePP>=6){
      const base=3+fixed;add('ゼタ＆ベアトリクス（エンハンス6）',6,base,['6PP','疾走'],`3 + 場/他${fixed}`);
      if(ep)add('ゼタ＆ベアトリクス＋進化',6,base+2,['6PP','EP','疾走'],`5 + 場/他${fixed}`);
      if(sep&&turn&&superEligible(turn))add('ゼタ＆ベアトリクス＋超進化',6,base+3,['6PP','SEP','疾走'],`6 + 場/他${fixed}`);
    }
    const lethal=routes.filter(r=>r.lethal),status=lethal.length?'confirmed-lethal':unknown.length?'incomplete-do-not-declare-no-lethal':'checked-no-lethal-in-covered-routes';
    return{turn,observedAtSeconds:Number.isFinite(videoEl()?.currentTime)?+videoEl().currentTime.toFixed(2):null,opponentHP:hp,pp,extraPPAvailable:extra,effectivePP,epAvailable:ep,sepAvailable:sep,opponentWard:ward,existingPirateFlagCountdowns:fs,knownBoardLeaderDamage:board,otherConfirmedLeaderDamage:other,hand:{barbaros:bar,zetaBeatrix:zeta,otherDamageRoutesChecked:othersChecked},routes,lethalRoutes:lethal.map(x=>x.name),unknown,status};
  }
  function renderResult(){const out=$q('#leResult480');if(!out)return;const x=calc();const rs=x.routes.length?x.routes.map(r=>`${r.lethal?'◎ ':''}${r.name}：${r.damage}点${r.blockedByWard?'（守護処理要確認）':''} — ${r.detail}`).join('\n'):'該当する既知ルートはまだ計算できません。';const tail=x.status==='confirmed-lethal'?`\nリーサル候補：${x.lethalRoutes.join(' / ')}`:x.unknown.length?`\n未確認：${x.unknown.join(' / ')}\n→「リーサルなし」と断定禁止`:'\n確認対象ルート内ではリーサルなし';out.textContent=`${x.turn??'?'}T / 有効PP ${x.effectivePP??'?'} / 相手HP ${x.opponentHP??'?'}\n${rs}${tail}`;out.style.whiteSpace='pre-wrap';return x}
  function saveSnapshot(){const s=session();if(!s)return;const x=calc();x.id=`l${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;x.createdAt=new Date().toISOString();s.snapshots.push(x);persist();renderSaved();const st=$q('#leStatus480');if(st){st.textContent=`${x.turn??'?'}Tのリーサル検証状態を保存しました（候補${x.routes.length}本）。`;st.style.color='#86efac'}safeLog('lethal-snapshot-saved-v480',{turn:x.turn,status:x.status,routes:x.routes.length})}
  function renderSaved(){const out=$q('#leSaved480');if(!out)return;const rows=(session(false)?.snapshots||[]).slice().sort((a,b)=>(a.observedAtSeconds??9999)-(b.observedAtSeconds??9999));out.innerHTML=rows.slice(-6).map(x=>`<div style="border:1px solid #334155;border-radius:8px;padding:8px;margin:6px 0"><b>${x.turn??'?'}T / ${x.status==='confirmed-lethal'?'リーサル候補あり':x.status==='incomplete-do-not-declare-no-lethal'?'未検証あり':'確認済み'}</b><div class="help">${x.observedAtSeconds??'?'}s / 相手HP ${x.opponentHP??'?'} / 有効PP ${x.effectivePP??'?'}</div><div>${x.lethalRoutes?.length?'候補：'+x.lethalRoutes.join(' / '):x.unknown?.length?'未確認：'+x.unknown.join(' / '):'主要候補内リーサルなし'}</div></div>`).join('')}
  function fillFromVideo(){const t=currentTurn();if(t)$q('#leTurn480').value=t;const pp=t;if(pp)$q('#lePp480').value=pp;renderResult()}
  function mount(){if($q('#lethalPanel480'))return true;const anchor=$q('#publicInfoPanel466')||$q('#fullMatchPanel465');if(!anchor?.parentNode)return false;const p=document.createElement('section');p.id='lethalPanel480';p.className='panel';p.innerHTML=`<h2>リーサル検証 v2</h2><p class="help">短評の前に主要打点ルートを全列挙します。不明情報が残る場合は「リーサルなし」と断定しません。</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>ターン<input id="leTurn480" type="number" min="1" value="6"></label><label>相手HP<input id="leOppHp480" type="number" min="0"></label><label>現在PP<input id="lePp480" type="number" min="0" max="10"></label><label>旗カウント（例 5,2）<input id="leFlags480" placeholder="5,2"></label><label>バルバロス<select id="leBar480"><option value="unknown">不明</option><option value="have">手札にある</option><option value="none">手札にない</option></select></label><label>ゼタ＆ベアトリクス<select id="leZeta480"><option value="unknown">不明</option><option value="have">手札にある</option><option value="none">手札にない</option></select></label><label>場から確定の顔打点<input id="leBoard480" type="number" min="0" value="0"></label><label>その他確定打点<input id="leOther480" type="number" min="0" value="0"></label></div><div style="display:flex;gap:12px;flex-wrap:wrap;margin:10px 0"><label><input id="leExtra480" type="checkbox"> ExPP使用可</label><label><input id="leEp480" type="checkbox"> EP使用可</label><label><input id="leSep480" type="checkbox"> SEP使用可</label><label><input id="leWard480" type="checkbox"> 相手守護あり</label><label><input id="leOthersChecked480" type="checkbox"> 他の手札打点も確認済み</label></div><div class="buttons"><button id="leFill480" type="button">動画位置からターン/PP入力</button><button id="leCalc480" type="button">全候補を計算</button><button id="leSave480" type="button" class="good">この状態を短評用に保存</button></div><p id="leStatus480" class="help"></p><div id="leResult480" class="ocrRead"></div><div id="leSaved480"></div><p class="help">反実仮想は実戦結果からの差し引きではなく、分岐直前の状態から再計算します。</p>`;anchor.parentNode.insertBefore(p,anchor.nextSibling);$q('#leFill480').onclick=fillFromVideo;$q('#leCalc480').onclick=renderResult;$q('#leSave480').onclick=saveSnapshot;p.querySelectorAll('input,select').forEach(el=>el.addEventListener('change',renderResult));renderResult();renderSaved();return true}
  function updateHeader(){const h=$q('header h1'),s=$q('header p');if(h)h.textContent='シャドバWB リプレイ診断 v4.8.0';if(s)s.textContent='Build 2026.09.15-08 / リーサル全探索 v2'}
  $q('#videoFile')?.addEventListener('change',()=>setTimeout(()=>{expose();renderSaved()},300));
  let n=0;const tm=setInterval(()=>{n++;mount();updateHeader();expose();if(n>240)clearInterval(tm)},120);
  expose();safeLog('patch-v480-active',{feature:'lethal-first-review-engine-v2'});
})();
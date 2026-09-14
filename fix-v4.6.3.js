(()=>{
  const PATCH='4.6.3-20260914-30';
  const STRATEGY_URL='./strategy/sea-pirate-royal-coaching-v1.json?v=20260914-1';
  const STRATEGY_FILE='strategy/sea-pirate-royal-coaching-v1.json';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  let strategyCache=null;

  const fallbackStrategy={
    version:'sea-pirate-royal-coaching-v1-fallback',updatedAt:'2026-09-14',
    purpose:'Shadowverse: Worlds Beyond 海賊ロイヤルの局面診断で勝率最大化に近い判断を行うための最低限の基準。',
    evidencePolicy:{A:['盤面・手札・PP・EP・Extra PP・体力から確定できる算術','公式カードテキスト','公式大会・競技データ'],B:['実績ある競技／高ランクプレイヤーの反復実戦','同一対面・近いターン帯の複数実戦例'],C:['攻略サイト・Tier表','単発の配信者コメント'],rule:'Cだけを根拠に◎/×を断定しない。Aを最優先し、Bで補強する。'},
    reviewOrder:['現在ターンにリーサルがあるか','相手の公開情報から次ターン負ける可能性','次T・2T後の必要打点','顔／盤面処理／ドロー／展開の候補','PP・EP・Extra PP','疾走・バーン・海賊旗・バルバロス等の打点資源','プレイ順','実戦ルートと最有力代替ルート'],
    outputRule:{grade:['◎','○','△','×'],required:['実戦の選択','評価','1〜2文の理由','意味のある代替案がある場合のみ最有力案','リーサル有無','判断の確信度'],confidence:{確定:'算術・カードテキストだけで決まる',高:'公開情報で優劣がかなり明確',中:'複数ルートに実戦的価値がある',低:'相手非公開情報や山札内容への依存が大きい'}},
    learningLoop:{tags:['lethal-miss','damage-spent-too-early','damage-hoard-too-long','board-over-face','face-over-board','draw-timing','evolution-timing','extra-pp-timing','sequencing','mulligan','deck-construction'],goal:'各レビューで最大の改善点を1つだけ残し、同じタグの再発回数を追う。'}
  };

  async function loadStrategy(){
    if(strategyCache)return strategyCache;
    try{
      const r=await fetch(STRATEGY_URL,{cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      if(!data||!Array.isArray(data.reviewOrder)||!data.learningLoop)throw new Error('strategy schema mismatch');
      strategyCache=data;safeLog('coaching-strategy-loaded-v463',{version:data.version||null});return data;
    }catch(e){
      strategyCache=fallbackStrategy;safeLog('coaching-strategy-fallback-v463',{message:e?.message||String(e)});return strategyCache;
    }
  }

  function coachingText(strategy){
    return [
      'Shadowverse: Worlds Beyond 実戦レビュー用コーチング指示',
      '',
      '最重要目的：勝率を上げること。カード説明ではなく、実戦の選択と最有力代替ルートを比較する。',
      '評価順：',
      ...(strategy.reviewOrder||[]).map((x,i)=>`${i+1}. ${x}`),
      '',
      '出力：各ターンを「6T バルバロス：◎ — 理由」のように短評する。',
      '必要に応じて「リーサル：あり／なし」「確信度：確定／高／中／低」を付ける。',
      '複数ターンは各ターン評価に加えて「総評」と「最大の改善点1つ」を示す。',
      '相手の非公開手札は断定しない。攻略サイトだけを理由に◎／×を断定しない。',
      '',
      `学習タグ：${(strategy.learningLoop?.tags||[]).join(', ')}`,
      '同じタグの再発を記録し、単発の正解より反復ミスの削減を優先する。'
    ].join('\n');
  }

  async function enrichRangeZip(zip){
    if(!zip?.files?.['range-review.json'])return false;
    const strategy=await loadStrategy();
    zip.file(STRATEGY_FILE,JSON.stringify(strategy,null,2));
    zip.file('COACHING-INSTRUCTIONS.txt',coachingText(strategy));
    try{
      const raw=await zip.files['range-review.json'].async('string');
      const manifest=JSON.parse(raw);
      manifest.coaching={
        objective:'win-rate-maximization',
        strategyFile:STRATEGY_FILE,
        strategyVersion:strategy.version||null,
        evidencePriority:['A','B','C'],
        reviewOrder:strategy.reviewOrder||[],
        learningTags:strategy.learningLoop?.tags||[],
        requiredSummary:['各ターン評価','リーサル有無','確信度','5〜7T総評','最大の改善点1つ']
      };
      zip.file('range-review.json',JSON.stringify(manifest,null,2));
    }catch(e){safeLog('coaching-manifest-enrich-error-v463',{message:e?.message||String(e)});}
    safeLog('coaching-context-added-v463',{strategyVersion:strategy.version||null});
    return true;
  }

  function installZipHook(){
    const Z=window.JSZip;
    if(!Z?.prototype?.generateAsync)return false;
    if(Z.prototype.__wbCoaching463)return true;
    const original=Z.prototype.generateAsync;
    Z.prototype.generateAsync=async function(...args){
      try{await enrichRangeZip(this)}catch(e){safeLog('coaching-zip-hook-error-v463',{message:e?.message||String(e)})}
      return original.apply(this,args);
    };
    Object.defineProperty(Z.prototype,'__wbCoaching463',{value:true,configurable:false});
    safeLog('coaching-zip-hook-installed-v463');
    return true;
  }

  function armZipHook(){
    if(installZipHook())return;
    let tries=0;const timer=setInterval(()=>{tries++;if(installZipHook()||tries>=240)clearInterval(timer)},100);
  }

  document.addEventListener('click',e=>{if(e.target?.closest?.('#exportRange462'))armZipHook()},true);
  armZipHook();

  const header=$q('header h1'),sub=$q('header p'),head=$q('header');
  if(header)header.textContent='シャドバWB リプレイ診断 v4.6.3';
  if(sub)sub.textContent='Build 2026.09.14-30 / 診断ZIPにコーチング基準を同梱';
  $q('#wbLatestBar462')?.remove();
  let updateBar=$q('#wbLatestBar463');
  if(head&&!updateBar){
    updateBar=document.createElement('div');updateBar.id='wbLatestBar463';updateBar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
    updateBar.innerHTML='<button id="wbForceLatest463" type="button" style="padding:7px 10px;background:#2563eb">最新版に更新</button><span id="wbUpdateStatus463" style="font-size:11px;color:#9ba8bf">v4.6.3 / 診断基準同梱</span>';
    head.appendChild(updateBar);
  }
  const updateBtn=$q('#wbForceLatest463'),updateSt=$q('#wbUpdateStatus463');
  updateBtn?.addEventListener('click',async()=>{
    if(updateBtn.disabled)return;updateBtn.disabled=true;if(updateSt)updateSt.textContent='最新版を確認中…';
    try{
      if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.6.3-20260914-30',{updateViaCache:'none'});await reg.update();}
      if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-6-3-20260914-30').map(k=>caches.delete(k)));}
      if(updateSt)updateSt.textContent='更新確認完了。最新版で再起動します…';
      setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','463-'+Date.now());u.hash='';location.replace(u.href)},180);
    }catch(e){if(updateSt)updateSt.textContent='更新確認に失敗しました。通信を確認してください。';updateBtn.disabled=false;safeLog('force-latest-error-v463',{message:e?.message||String(e)});}
  });

  safeLog('patch-v463-active',{feature:'coaching-context-in-range-zip'});
})();
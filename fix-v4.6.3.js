(()=>{
  const PATCH='4.6.3-20260915-01';
  const STRATEGY_URL='./strategy/sea-pirate-royal-coaching-v1.json?v=20260914-1';
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
    }catch(e){strategyCache=fallbackStrategy;safeLog('coaching-strategy-fallback-v463',{message:e?.message||String(e)});return strategyCache}
  }

  async function enrichRangeZip(zip){
    if(!zip?.files?.['range-review.json'])return false;
    const strategy=await loadStrategy();
    try{
      const raw=await zip.files['range-review.json'].async('string');
      const manifest=JSON.parse(raw);
      manifest.coaching={
        objective:'win-rate-maximization',strategyVersion:strategy.version||null,
        evidencePriority:['A','B','C'],reviewOrder:strategy.reviewOrder||[],learningTags:strategy.learningLoop?.tags||[],
        requiredSummary:['各ターン評価','リーサル有無','確信度','総評','最大の改善点1つ'],
        strategyEmbedded:{evidencePolicy:strategy.evidencePolicy||null,outputRule:strategy.outputRule||null,learningLoop:strategy.learningLoop||null}
      };
      zip.file('range-review.json',JSON.stringify(manifest,null,2));
      zip.remove('COACHING-INSTRUCTIONS.txt');
      zip.remove('strategy/sea-pirate-royal-coaching-v1.json');
    }catch(e){safeLog('coaching-manifest-enrich-error-v463',{message:e?.message||String(e)})}
    safeLog('coaching-context-added-v463',{strategyVersion:strategy.version||null,embeddedOnly:true});return true;
  }

  function installZipHook(){
    const Z=window.JSZip;if(!Z?.prototype?.generateAsync)return false;if(Z.prototype.__wbCoaching463)return true;
    const original=Z.prototype.generateAsync;
    Z.prototype.generateAsync=async function(...args){try{await enrichRangeZip(this)}catch(e){safeLog('coaching-zip-hook-error-v463',{message:e?.message||String(e)})}return original.apply(this,args)};
    Object.defineProperty(Z.prototype,'__wbCoaching463',{value:true,configurable:false});safeLog('coaching-zip-hook-installed-v463');return true;
  }
  function armZipHook(){if(installZipHook())return;let tries=0;const timer=setInterval(()=>{tries++;if(installZipHook()||tries>=240)clearInterval(timer)},100)}
  document.addEventListener('click',e=>{if(e.target?.closest?.('#exportRange462,#exportFullMatch465'))armZipHook()},true);armZipHook();
  safeLog('patch-v463-active',{feature:'coaching-context-embedded-in-manifest-only'});
})();
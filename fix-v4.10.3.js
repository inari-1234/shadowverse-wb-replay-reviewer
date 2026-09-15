(()=>{
  const PATCH='4.10.3-20260915-15f';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  window.__wbUiFinalVersion='4.10.3';
  document.documentElement.dataset.wbLatestUi='4103';

  function videoEl(){try{return typeof video!=='undefined'?video:$q('#video')}catch{return $q('#video')}}
  function waitPresentedFrame(target){
    const vid=videoEl();if(!vid)return Promise.resolve();
    if(typeof vid.requestVideoFrameCallback==='function'){
      return new Promise(resolve=>{
        let done=false,tries=0,timer=null;
        const finish=()=>{if(done)return;done=true;if(timer)clearTimeout(timer);resolve()};
        timer=setTimeout(finish,900);
        const cb=(_now,meta)=>{
          if(done)return;
          const mt=Number(meta?.mediaTime);
          if(!Number.isFinite(mt)||Math.abs(mt-Number(target))<.35||tries++>=4)finish();
          else{try{vid.requestVideoFrameCallback(cb)}catch{finish()}}
        };
        try{vid.requestVideoFrameCallback(cb)}catch{finish()}
      });
    }
    return new Promise(resolve=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)),120));
  }

  function installScopedSeek(){
    if(window.__wbScopedSeek4103?.installed)return true;
    const base=typeof window.seek==='function'?window.seek.bind(window):null;if(!base)return false;
    const wrapped=async(t,reason='seek')=>{
      await base(t,reason);
      if(reason==='full-match-v465')await waitPresentedFrame(t);
    };
    try{window.seek=wrapped}catch{return false}
    const installed=window.seek===wrapped;
    window.__wbScopedSeek4103={installed,policy:'描画待ちはfull-match-v465のみ。PP/OCRターン解析には追加待ちを入れない。'};
    safeLog('scoped-seek-v4103',{installed});
    return installed;
  }

  function updateHeaderStyle(){
    const style=$q('#wbUiQuarantine4102');if(!style)return false;
    style.textContent=`
      header h1{font-size:0!important}
      header h1::after{content:'シャドバWB リプレイ診断 v4.10.3';font-size:18px!important;font-weight:700}
      header>p:first-of-type{font-size:0!important}
      header>p:first-of-type::after{content:'Build 2026.09.15-15f / 解析速度を復元・画像抽出安全策は維持';font-size:12px!important;color:#9ba8bf}
    `;
    return true;
  }

  function mountLatestBar(){
    $q('#wbLatestBar4102')?.remove();
    const header=$q('header');if(!header)return false;
    if($q('#wbLatestBar4103'))return true;
    const bar=document.createElement('div');bar.id='wbLatestBar4103';bar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
    bar.innerHTML='<button id="wbForceLatest4103" type="button" style="padding:7px 10px;background:#2563eb">最新版に更新</button><button id="wbRecoverView4103" type="button" style="padding:7px 10px">表示を復旧</button><span id="wbUpdateStatus4103" style="font-size:11px;color:#9ba8bf">v4.10.3 / Build 15f</span>';
    header.appendChild(bar);
    $q('#wbRecoverView4103')?.addEventListener('click',()=>{try{window.__wbExportSafety4102?.recoverMain?.()}catch{}try{window.scrollTo(0,0)}catch{}});
    $q('#wbForceLatest4103')?.addEventListener('click',async()=>{
      const b=$q('#wbForceLatest4103'),st=$q('#wbUpdateStatus4103');if(!b||b.disabled)return;b.disabled=true;if(st)st.textContent='最新版を確認中…';
      try{
        if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.10.3-20260915-15f',{updateViaCache:'none'});await reg.update()}
        if('caches'in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-10-3-20260915-15f').map(k=>caches.delete(k)))}
        if(st)st.textContent='更新完了。v4.10.3で再起動します…';
        setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','4103-'+Date.now());u.hash='';location.replace(u.href)},180);
      }catch(err){if(st)st.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v4103',{message:err?.message||String(err)})}
    });
    return true;
  }

  installScopedSeek();updateHeaderStyle();mountLatestBar();
  [120,500,1500].forEach(ms=>setTimeout(()=>{installScopedSeek();updateHeaderStyle();mountLatestBar()},ms));
  safeLog('patch-v4103-active',{feature:'restore-turn-scan-speed-keep-full-match-frame-wait'});
})();

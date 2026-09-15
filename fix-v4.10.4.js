(()=>{
  const PATCH='4.10.4-20260915-16b';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  window.__wbUiFinalVersion='4.10.4';
  document.documentElement.dataset.wbLatestUi='4104';

  const oldBarIds=['wbLatestBar462','wbLatestBar463','wbLatestBar4102','wbLatestBar4103'];
  function purgeOldBars(){
    for(const id of oldBarIds)$q('#'+id)?.remove();
    const all=[...document.querySelectorAll('#wbLatestBar4104')];
    all.slice(1).forEach(x=>x.remove());
  }

  function installFinalHeader(){
    let st=$q('#wbUiFinal4104');
    if(!st){st=document.createElement('style');st.id='wbUiFinal4104';document.head.appendChild(st)}
    st.textContent=`
      header h1{font-size:0!important}
      header h1::after{content:'シャドバWB リプレイ診断 v4.10.4';font-size:18px!important;font-weight:700}
      header>p:first-of-type{font-size:0!important}
      header>p:first-of-type::after{content:'Build 2026.09.15-16b / UI重複防止・解析速度維持';font-size:12px!important;color:#9ba8bf}
      #wbLatestBar462,#wbLatestBar463,#wbLatestBar4102,#wbLatestBar4103{display:none!important}
    `;
  }

  function recoverMain(){
    const main=$q('main');if(!main)return false;
    main.style.display='block';main.style.visibility='visible';main.style.opacity='1';
    if(main.style.height==='0px')main.style.removeProperty('height');
    if(main.style.maxHeight==='0px')main.style.removeProperty('max-height');
    return true;
  }

  function mountLatestBar(){
    purgeOldBars();
    const header=$q('header');if(!header)return false;
    let bar=$q('#wbLatestBar4104');
    if(!bar){
      bar=document.createElement('div');bar.id='wbLatestBar4104';
      bar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
      bar.innerHTML='<button id="wbForceLatest4104" type="button" style="padding:7px 10px;background:#2563eb">最新版に更新</button><button id="wbRecoverView4104" type="button" style="padding:7px 10px">表示を復旧</button><span id="wbUpdateStatus4104" style="font-size:11px;color:#9ba8bf">v4.10.4 / Build 16b</span>';
      header.appendChild(bar);
      $q('#wbRecoverView4104')?.addEventListener('click',()=>{recoverMain();try{window.scrollTo(0,0)}catch{}});
      $q('#wbForceLatest4104')?.addEventListener('click',async()=>{
        const b=$q('#wbForceLatest4104'),st=$q('#wbUpdateStatus4104');if(!b||b.disabled)return;
        b.disabled=true;if(st)st.textContent='最新版を確認中…';
        try{
          if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.register('./sw.js?v=4.10.4-20260915-16b',{updateViaCache:'none'});await reg.update()}
          if('caches'in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!=='wb-review-v4-10-4-20260915-16b').map(k=>caches.delete(k)))}
          if(st)st.textContent='更新完了。v4.10.4で再起動します…';
          setTimeout(()=>{const u=new URL(location.href);u.searchParams.set('latest','4104-'+Date.now());u.hash='';location.replace(u.href)},180);
        }catch(err){if(st)st.textContent='更新確認に失敗しました。';b.disabled=false;safeLog('force-latest-error-v4104',{message:err?.message||String(err)})}
      });
    }
    return true;
  }

  function verifyUi(){
    purgeOldBars();installFinalHeader();mountLatestBar();recoverMain();
    const visibleOld=oldBarIds.filter(id=>{const e=$q('#'+id);return e&&getComputedStyle(e).display!=='none'}).length;
    const latestCount=document.querySelectorAll('#wbLatestBar4104').length;
    const ok=visibleOld===0&&latestCount===1;
    window.__wbUiInvariant4104={ok,visibleOld,latestCount,checkedAt:new Date().toISOString()};
    safeLog('ui-invariant-v4104',window.__wbUiInvariant4104);
    return ok;
  }

  function repairCutoffBeforeExport(){
    try{
      const repaired=!!window.__wbExportSafety4102?.repairZeroCutoffs?.();
      if(repaired)safeLog('cutoff-repaired-before-export-v4104');
      return repaired;
    }catch(err){
      safeLog('cutoff-repair-error-v4104',{message:err?.message||String(err)});
      return false;
    }
  }

  if(!document.documentElement.dataset.wb4104ExportGuard){
    document.documentElement.dataset.wb4104ExportGuard='1';
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#exportFullMatch465,#rangeSaveBtn462'))repairCutoffBeforeExport();
    },true);
  }

  installFinalHeader();mountLatestBar();recoverMain();
  [80,250,700,1800,4200].forEach(ms=>setTimeout(verifyUi,ms));
  window.__wbUiSafety4104={verifyUi,repairCutoffBeforeExport};
  safeLog('patch-v4104-active',{feature:'single-latest-bar-no-legacy-duplicates-cutoff-export-guard'});
})();
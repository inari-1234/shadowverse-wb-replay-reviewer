(()=>{
  const PATCH='4.10.4-20260916-updater-fix-17';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  window.__wbUiFinalVersion=window.__wbUiFinalVersion||'4.10.4';
  document.documentElement.dataset.wbLatestUi=document.documentElement.dataset.wbLatestUi||'4104';

  const oldBarIds=['wbLatestBar462','wbLatestBar463','wbLatestBar4102','wbLatestBar4103'];
  const FALLBACK={version:'4.10.8',build:'4.10.8-20260916-20a',cache:'wb-review-v4-10-8-20260916-33',sw:'./sw.js',revision:'4108-33'};
  const delay=ms=>new Promise(r=>setTimeout(r,ms));

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
      header>p:first-of-type::after{content:'Build 2026.09.16 / 共通最新版更新器';font-size:12px!important;color:#9ba8bf}
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

  async function latestManifest(){
    try{
      const u=new URL('./latest.json',location.href);u.searchParams.set('_',Date.now());
      const r=await fetch(u.href,{cache:'no-store'});if(!r.ok)throw new Error('latest.json '+r.status);
      const m=await r.json();
      if(!m?.version||!m?.cache||!m?.sw)throw new Error('latest.json invalid');
      return m;
    }catch(err){safeLog('latest-manifest-fallback-v4104',{message:err?.message||String(err)});return{...FALLBACK}}
  }

  async function waitForTargetWorker(reg,m,timeoutMs=15000){
    const until=Date.now()+timeoutMs,rev=encodeURIComponent(String(m.revision||m.build||m.version));
    while(Date.now()<until){
      const keys='caches'in window?await caches.keys():[];
      const active=reg?.active;
      if(active&&active.state==='activated'&&keys.includes(m.cache)){
        const src=String(active.scriptURL||'');
        if(src.includes('rev='+rev)||src.includes('rev='+String(m.revision||m.build||m.version)))return true;
      }
      await delay(120);
    }
    throw new Error('最新版Service Workerの有効化を確認できませんでした');
  }

  async function forceLatestUpdate(button=null,status=null){
    const b=button||$q('#wbForceLatest4104'),st=status||$q('#wbUpdateStatus4104');
    if(b?.disabled)return false;if(b)b.disabled=true;if(st)st.textContent='最新版情報を取得中…';
    try{
      const m=await latestManifest();
      if(st)st.textContent=`${m.version} を準備中…`;
      if(!('serviceWorker'in navigator))throw new Error('Service Worker非対応');
      const sw=new URL(m.sw,location.href);sw.searchParams.set('rev',String(m.revision||m.build||Date.now()));
      const reg=await navigator.serviceWorker.register(sw.href,{updateViaCache:'none'});
      await reg.update();
      await waitForTargetWorker(reg,m);
      if('caches'in window){
        const ks=await caches.keys();
        await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!==m.cache).map(k=>caches.delete(k)));
      }
      if(st)st.textContent=`更新完了。${m.version}で再起動します…`;
      safeLog('force-latest-success-v4104',{version:m.version,build:m.build,cache:m.cache,scriptURL:reg.active?.scriptURL||null});
      const u=new URL(location.href);u.searchParams.set('latest',String(m.version).replace(/\D/g,'')+'-'+Date.now());u.hash='';
      setTimeout(()=>location.replace(u.href),120);
      return true;
    }catch(err){
      if(st)st.textContent='自動更新に失敗しました。「更新ループを復旧」を使用してください。';
      if(b)b.disabled=false;
      safeLog('force-latest-error-v4104',{message:err?.message||String(err)});
      return false;
    }
  }

  function mountLatestBar(){
    purgeOldBars();
    const header=$q('header');if(!header)return false;
    let bar=$q('#wbLatestBar4104');
    if(!bar){
      bar=document.createElement('div');bar.id='wbLatestBar4104';
      bar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
      bar.innerHTML='<button id="wbForceLatest4104" type="button" style="padding:7px 10px;background:#2563eb">最新版に更新</button><button id="wbRecoverLoop4104" type="button" style="padding:7px 10px;background:#7c3aed">更新ループを復旧</button><button id="wbRecoverView4104" type="button" style="padding:7px 10px">表示を復旧</button><span id="wbUpdateStatus4104" style="font-size:11px;color:#9ba8bf">最新版を確認できます</span>';
      header.appendChild(bar);
      $q('#wbRecoverView4104')?.addEventListener('click',()=>{recoverMain();try{window.scrollTo(0,0)}catch{}});
      $q('#wbRecoverLoop4104')?.addEventListener('click',()=>{const u=new URL('./recovery.html',location.href);u.searchParams.set('_',Date.now());location.href=u.href});
    }
    return true;
  }

  if(!document.documentElement.dataset.wbCanonicalUpdateGuard){
    document.documentElement.dataset.wbCanonicalUpdateGuard='1';
    document.addEventListener('click',e=>{
      const b=e.target?.closest?.('#wbForceLatest4104');if(!b)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      forceLatestUpdate(b,$q('#wbUpdateStatus4104'));
    },true);
  }

  function verifyUi(){
    purgeOldBars();installFinalHeader();mountLatestBar();recoverMain();
    const visibleOld=oldBarIds.filter(id=>{const e=$q('#'+id);return e&&getComputedStyle(e).display!=='none'}).length;
    const latestCount=document.querySelectorAll('#wbLatestBar4104').length;
    const ok=visibleOld===0&&latestCount===1;
    window.__wbUiInvariant4104={ok,visibleOld,latestCount,canonicalUpdater:true,checkedAt:new Date().toISOString()};
    safeLog('ui-invariant-v4104',window.__wbUiInvariant4104);
    return ok;
  }

  function repairCutoffBeforeExport(){
    try{const repaired=!!window.__wbExportSafety4102?.repairZeroCutoffs?.();if(repaired)safeLog('cutoff-repaired-before-export-v4104');return repaired}
    catch(err){safeLog('cutoff-repair-error-v4104',{message:err?.message||String(err)});return false}
  }

  if(!document.documentElement.dataset.wb4104ExportGuard){
    document.documentElement.dataset.wb4104ExportGuard='1';
    document.addEventListener('click',e=>{if(e.target?.closest?.('#exportFullMatch465,#rangeSaveBtn462'))repairCutoffBeforeExport()},true);
  }

  installFinalHeader();mountLatestBar();recoverMain();
  [80,250,700,1800,4200,6200,9000].forEach(ms=>setTimeout(verifyUi,ms));
  window.__wbUiSafety4104={verifyUi,repairCutoffBeforeExport,forceLatestUpdate,latestManifest};
  safeLog('patch-v4104-active',{feature:'single-latest-bar-canonical-manifest-updater-loop-recovery'});
})();
(()=>{
  const PATCH='4.10.8.8-20260917-20r';
  const BUILD_LABEL='Build 2026.09.17-20r / 起動・更新基盤安定化';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const LEGACY_STYLE_IDS=['wbUiFinal4104','wbUiFinal4105','wbUiFinal4106','wbUiFinal4107','wbUiFinal4108','wbUiFinal41081','wbUiFinal41082','wbUiFinal41087'];
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  let repairs=0,updateBusy=false,legacyObserver=null;

  function ownHeader(){
    let s=$q('#wbCanonicalHeader41088');
    if(!s){s=document.createElement('style');s.id='wbCanonicalHeader41088';document.head.appendChild(s)}
    const css=`header h1{font-size:18px!important}header h1::after{content:none!important;display:none!important}header>p:first-of-type{font-size:12px!important;color:#9ba8bf!important}header>p:first-of-type::after{content:none!important;display:none!important}`;
    if(s.textContent!==css)s.textContent=css;
    const h=$q('header h1'),p=$q('header>p:first-of-type');
    if(h&&h.textContent!=='シャドバWB リプレイ診断 v4.10.8'){h.textContent='シャドバWB リプレイ診断 v4.10.8';repairs++}
    if(p&&p.textContent!==BUILD_LABEL){p.textContent=BUILD_LABEL;repairs++}
    window.__wbUiFinalVersion='4.10.8';
    document.documentElement.dataset.wbLatestUi='4108';
    document.documentElement.dataset.wbCanonicalUiOwner='4108';
    return !!h&&!!p;
  }
  function quietLegacyStyles(){for(const id of LEGACY_STYLE_IDS){const s=$q('#'+id);if(s&&!s.disabled){s.disabled=true;repairs++}}}
  function watchLegacyStyles(){
    if(legacyObserver||!document.head)return;
    legacyObserver=new MutationObserver(()=>quietLegacyStyles());
    legacyObserver.observe(document.head,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});
  }
  function stabilize(reason='manual'){
    try{window.__wbUiOwner41082?.disconnect?.();window.__wbUiOwner41087?.disconnect?.()}catch{}
    quietLegacyStyles();ownHeader();watchLegacyStyles();
    const st=$q('#wbUpdateStatus4104');
    if(st&&!/(準備中|更新中|確認中|再起動|復旧|失敗|取得中|反映中)/.test(String(st.textContent||''))&&st.textContent!=='v4.10.8 / Build 20r / 更新基盤安定'){st.textContent='v4.10.8 / Build 20r / 更新基盤安定'}
    safeLog('ui-startup-stabilized-v41088',{reason,repairs});return verify(reason,false);
  }
  async function latestManifest(){
    const u=new URL('./latest.json',location.href);u.searchParams.set('_',Date.now());
    const r=await fetch(u.href,{cache:'no-store'});if(!r.ok)throw Error('latest.json '+r.status);
    const m=await r.json();if(!m?.version||!m?.cache||!m?.sw||!m?.build)throw Error('latest.json invalid');return m;
  }
  function queryWorker(worker,timeout=900){
    return new Promise(resolve=>{if(!worker){resolve(null);return}const ch=new MessageChannel(),to=setTimeout(()=>resolve(null),timeout);ch.port1.onmessage=e=>{clearTimeout(to);resolve(e.data||null)};try{worker.postMessage({type:'wb-version-query'},[ch.port2])}catch{clearTimeout(to);resolve(null)}})
  }
  async function waitTarget(reg,m,timeout=15000){
    const until=Date.now()+timeout;
    while(Date.now()<until){
      const keys='caches'in window?await caches.keys():[];
      const active=reg?.active;
      if(active?.state==='activated'&&keys.includes(m.cache)){
        const q=await queryWorker(active);
        if(q?.build===m.build&&q?.cache===m.cache)return true;
      }
      await delay(120);
    }
    throw Error('最新版Service Workerの有効化を確認できませんでした');
  }
  function canonicalSwUrl(path='./sw.js'){const u=new URL(path,location.href);u.search='';u.hash='';return u.href}
  async function forceLatestStable(button=$q('#wbForceLatest4104'),status=$q('#wbUpdateStatus4104'),silent=false){
    if(updateBusy)return false;updateBusy=true;if(button)button.disabled=true;
    try{
      if(status&&!silent)status.textContent='最新版情報を取得中…';
      const m=await latestManifest();
      if(status&&!silent)status.textContent=`${m.version} を準備中…`;
      if(!('serviceWorker'in navigator))throw Error('Service Worker非対応');
      const reg=await navigator.serviceWorker.register(canonicalSwUrl(m.sw),{updateViaCache:'none'});
      await reg.update();await waitTarget(reg,m);
      if('caches'in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('wb-review-')&&k!==m.cache).map(k=>caches.delete(k)))}
      if(status&&!silent)status.textContent=`更新完了。${m.version}で再起動します…`;
      safeLog('force-latest-stable-v41088',{version:m.version,build:m.build,cache:m.cache,scriptURL:reg.active?.scriptURL||null,silent});
      if(!silent)setTimeout(()=>location.replace(new URL('./',location.href).href),120);
      return true;
    }catch(err){if(status&&!silent)status.textContent='最新版への更新に失敗しました。';safeLog('force-latest-stable-error-v41088',{message:err?.message||String(err),silent});return false}
    finally{updateBusy=false;if(button)button.disabled=false}
  }
  async function migrateCanonicalWorker(){
    if(!('serviceWorker'in navigator)||sessionStorage.getItem('wbCanonicalSw20r')==='1')return;
    try{
      const reg=await navigator.serviceWorker.getRegistration();const src=reg?.active?.scriptURL||'';
      if(!src)return;const u=new URL(src);
      if(!u.search)return;
      sessionStorage.setItem('wbCanonicalSw20r','1');
      safeLog('canonical-sw-migration-start-v41088',{from:src,to:canonicalSwUrl('./sw.js')});
      await forceLatestStable(null,null,true);
    }catch(err){safeLog('canonical-sw-migration-error-v41088',{message:err?.message||String(err)})}
  }
  function installCanonicalUpdateCapture(){
    if(window.__wbCanonicalUpdateCapture41088)return;window.__wbCanonicalUpdateCapture41088=true;
    window.addEventListener('click',e=>{const b=e.target?.closest?.('#wbForceLatest4104');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();forceLatestStable(b,$q('#wbUpdateStatus4104'),false)},true)
  }
  function verify(reason='verify',emit=true){
    const h=$q('header h1'),p=$q('header>p:first-of-type'),s=$q('#wbCanonicalHeader41088');
    const state={patch:PATCH,reason,header:h?.textContent||'',subheader:p?.textContent||'',canonicalStyle:!!s&&!s.disabled,legacyEnabled:LEGACY_STYLE_IDS.filter(id=>{const x=$q('#'+id);return x&&!x.disabled}),controllerScript:navigator.serviceWorker?.controller?.scriptURL||null,repairs,checkedAt:new Date().toISOString()};
    state.ok=state.header==='シャドバWB リプレイ診断 v4.10.8'&&state.subheader===BUILD_LABEL&&state.canonicalStyle&&state.legacyEnabled.length===0;
    window.__wbStartupSafety41088=state;if(emit)safeLog('startup-invariant-v41088',state);return state.ok;
  }
  function settlePasses(){[0,50,180,500,1200,3000,6500,9500,12000].forEach(ms=>setTimeout(()=>stabilize('settle-'+ms),ms))}
  quietLegacyStyles();ownHeader();watchLegacyStyles();installCanonicalUpdateCapture();settlePasses();
  window.addEventListener('pageshow',()=>stabilize('pageshow'));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')stabilize('visible')});
  window.__wbStartupGuard41088={stabilize,verify,forceLatestStable,migrateCanonicalWorker};
  setTimeout(migrateCanonicalWorker,1400);setTimeout(()=>verify('settled'),12200);
  safeLog('patch-v41088-active',{feature:'canonical-header-stable-sw-and-legacy-style-attribute-guard'});
})();

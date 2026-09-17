(()=>{
  const PATCH='4.10.8.7-20260917-20p';
  const $q=s=>document.querySelector(s);
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};
  const FINAL_STATUS='v4.10.8 / Build 20p / 直列処理安定版';
  const TRANSIENT=/(準備中|更新中|確認中|再起動|復旧|失敗|取得中|更新完了|読み込み|反映中)/;
  let legacyDisconnected=false,statusCorrections=0,statusObserver=null;

  function stopLegacyObserver(){
    try{window.__wbUiOwner41082?.disconnect?.();legacyDisconnected=true}catch{}
    return legacyDisconnected;
  }
  function ownStyle(){
    let s=$q('#wbUiFinal41087');
    if(!s){s=document.createElement('style');s.id='wbUiFinal41087';document.head.appendChild(s)}
    const css=`header h1{font-size:0!important}header h1::after{content:'シャドバWB リプレイ診断 v4.10.8';font-size:18px!important;font-weight:700}header>p:first-of-type{font-size:0!important}header>p:first-of-type::after{content:'Build 2026.09.17-20p / 軽量ターン補正 + 直列後処理 + UI監視安定化';font-size:12px!important;color:#9ba8bf}#wbLatestBar462,#wbLatestBar463,#wbLatestBar4102,#wbLatestBar4103{display:none!important}`;
    if(s.textContent!==css)s.textContent=css;
    if(s.disabled)s.disabled=false;
    return s;
  }
  function correctStatus(){
    const st=$q('#wbUpdateStatus4104');if(!st)return false;
    const txt=String(st.textContent||'');
    if(TRANSIENT.test(txt)||txt===FINAL_STATUS)return false;
    st.textContent=FINAL_STATUS;statusCorrections++;return true;
  }
  function stabilize(reason='manual'){
    stopLegacyObserver();
    const old=$q('#wbUiFinal41082');if(old&&!old.disabled)old.disabled=true;
    ownStyle();
    window.__wbUiFinalVersion='4.10.8';
    document.documentElement.dataset.wbLatestUi='4108';
    document.documentElement.dataset.wbCanonicalUiOwner='4108';
    correctStatus();
    return verify(reason,false);
  }
  function watchStatus(){
    statusObserver?.disconnect?.();
    const st=$q('#wbUpdateStatus4104');if(!st)return false;
    statusObserver=new MutationObserver(()=>queueMicrotask(correctStatus));
    statusObserver.observe(st,{subtree:true,childList:true,characterData:true});return true;
  }
  function lifecycle(reason){
    stopLegacyObserver();watchStatus();
    [0,70,320,1250,3250,10250].forEach(ms=>setTimeout(()=>stabilize(`${reason}-${ms}`),ms));
  }
  function verify(reason='verify',emit=true){
    const style=$q('#wbUiFinal41087'),old=$q('#wbUiFinal41082'),st=$q('#wbUpdateStatus4104');
    const state={patch:PATCH,reason,legacyObserverDisconnected:legacyDisconnected,finalStyle:!!style&&!style.disabled,legacyStyleDisabled:!old||old.disabled,status:String(st?.textContent||''),statusCorrections,canonicalUpdater:document.documentElement.dataset.wbCanonicalUpdateGuard==='1',checkedAt:new Date().toISOString()};
    state.ok=state.legacyObserverDisconnected&&state.finalStyle&&(TRANSIENT.test(state.status)||state.status===FINAL_STATUS);
    window.__wbUiOwnerSafety41087=state;if(emit)safeLog('ui-owner-final-invariant-v41087',state);return state.ok;
  }

  stopLegacyObserver();watchStatus();lifecycle('initial');
  window.addEventListener('pageshow',e=>lifecycle(e.persisted?'pageshow-bfcache':'pageshow'));
  window.addEventListener('focus',()=>lifecycle('focus'));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')lifecycle('visibility-visible')});
  window.__wbUiOwner41087={stabilize,verify,disconnect(){statusObserver?.disconnect?.()}};
  setTimeout(()=>verify('initial-settled'),11000);
  safeLog('patch-v41087-active',{feature:'disconnect-legacy-ui-mutation-observers-final-ui-owner'});
})();

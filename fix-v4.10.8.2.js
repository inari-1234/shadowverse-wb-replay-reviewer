(()=>{
  const PATCH='4.10.8.2-20260917-20c',$q=s=>document.querySelector(s);
  const OLD_STYLES=['wbUiFinal4104','wbUiFinal4105','wbUiFinal4106','wbUiFinal4107','wbUiFinal4108','wbUiFinal41081'];
  const TRANSIENT=/(準備中|更新中|確認中|再起動|復旧|失敗|取得中)/;
  let scheduled=false,repairs=0;
  const safeLog=(type,data={})=>{try{log(type,{patch:PATCH,...data})}catch{}};

  function ownStyle(){
    let s=$q('#wbUiFinal41082');
    if(!s){s=document.createElement('style');s.id='wbUiFinal41082';document.head.appendChild(s)}
    const css=`header h1{font-size:0!important}header h1::after{content:'シャドバWB リプレイ診断 v4.10.8';font-size:18px!important;font-weight:700}header>p:first-of-type{font-size:0!important}header>p:first-of-type::after{content:'Build 2026.09.17-20c / UI所有権恒久固定';font-size:12px!important;color:#9ba8bf}#wbLatestBar462,#wbLatestBar463,#wbLatestBar4102,#wbLatestBar4103{display:none!important}`;
    if(s.textContent!==css)s.textContent=css;
    if(s.disabled)s.disabled=false;
    return s;
  }
  function claimButton(){
    const b=$q('#wbForceLatest4104');if(!b)return false;
    for(const k of ['wb4104','wb4105','wb4106','wb4107','wb4108','wb41081','wb41082'])if(b.dataset[k]!=='1')b.dataset[k]='1';
    return true;
  }
  function stabilize(reason='manual'){
    let changed=false;
    for(const id of OLD_STYLES){const s=$q('#'+id);if(s&&!s.disabled){s.disabled=true;changed=true}}
    ownStyle();
    if(window.__wbUiFinalVersion!=='4.10.8'){window.__wbUiFinalVersion='4.10.8';changed=true}
    if(document.documentElement.dataset.wbLatestUi!=='4108'){document.documentElement.dataset.wbLatestUi='4108';changed=true}
    if(document.documentElement.dataset.wbCanonicalUiOwner!=='4108'){document.documentElement.dataset.wbCanonicalUiOwner='4108';changed=true}
    claimButton();
    const st=$q('#wbUpdateStatus4104');
    if(st&&!TRANSIENT.test(String(st.textContent||''))&&st.textContent!=='v4.10.8 / Build 20c / UI所有権固定'){st.textContent='v4.10.8 / Build 20c / UI所有権固定';changed=true}
    if(changed){repairs++;safeLog('ui-owner-repaired-v41082',{reason,repairs})}
    return changed;
  }
  function verify(reason='verify'){
    const own=$q('#wbUiFinal41082'),b=$q('#wbForceLatest4104');
    const oldEnabled=OLD_STYLES.filter(id=>{const s=$q('#'+id);return s&&!s.disabled});
    const state={patch:PATCH,reason,uiVersion:window.__wbUiFinalVersion||null,latestUi:document.documentElement.dataset.wbLatestUi||null,canonicalUiOwner:document.documentElement.dataset.wbCanonicalUiOwner||null,ownerStyle:!!own&&!own.disabled,oldEnabled,buttonClaims:b?{wb4107:b.dataset.wb4107||null,wb4108:b.dataset.wb4108||null,wb41082:b.dataset.wb41082||null}:null,canonicalUpdater:document.documentElement.dataset.wbCanonicalUpdateGuard==='1',repairs,checkedAt:new Date().toISOString()};
    state.ok=state.uiVersion==='4.10.8'&&state.latestUi==='4108'&&state.canonicalUiOwner==='4108'&&state.ownerStyle&&state.oldEnabled.length===0&&(!b||(b.dataset.wb4107==='1'&&b.dataset.wb4108==='1'&&b.dataset.wb41082==='1'));
    window.__wbUiOwnerSafety41082=state;safeLog('ui-owner-invariant-v41082',state);return state.ok;
  }
  function schedule(reason){
    if(scheduled)return;scheduled=true;
    queueMicrotask(()=>{scheduled=false;stabilize(reason)});
  }
  function lifecycle(reason){
    stabilize(reason);
    [0,50,250,1000,3000,10000].forEach(ms=>setTimeout(()=>{stabilize(reason+'-'+ms);if(ms===10000)verify(reason+'-settled')},ms));
  }

  const headObserver=new MutationObserver(()=>schedule('head-mutation'));
  if(document.head)headObserver.observe(document.head,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled']});
  const header=$q('header');
  const headerObserver=header?new MutationObserver(()=>schedule('header-mutation')):null;
  if(headerObserver)headerObserver.observe(header,{subtree:true,childList:true,characterData:true});

  window.addEventListener('pageshow',e=>lifecycle(e.persisted?'pageshow-bfcache':'pageshow'));
  window.addEventListener('focus',()=>lifecycle('focus'));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')lifecycle('visibility-visible')});
  document.addEventListener('click',e=>{if(e.target?.closest?.('#wbRecoverView4104'))setTimeout(()=>lifecycle('view-recover-click'),0)},true);

  lifecycle('initial');
  window.__wbUiOwner41082={stabilize,verify,lifecycle,disconnect(){headObserver.disconnect();headerObserver?.disconnect()}};
  safeLog('patch-v41082-active',{feature:'persistent-ui-owner-pageshow-visibility-mutation-guard'});
})();